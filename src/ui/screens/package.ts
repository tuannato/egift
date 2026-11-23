import { DEFAULT_WRAPPER, FLOOR_SATS, MAX_SWEEP_INPUTS, numberMarks, addressOfPkh, deriveKey, encodeLink, entitlement, isStamp, formatXec, giftTokens, holdings, normaliseAnswer, unlockKey, riddleRoot, BATCH_MAX } from '../../core';
import type { GiftToken, PackageKey, PackageLink, PackageState, TokenMeta } from '../../core';
import { otherTokens, tokenCard } from '../tokens';
import { offerOf, wrapperById, inLang, LOCK_WRAPPER } from '../../wrappers';
import { dressed } from '../../wrappers/looks';
import { artUrl } from '../../wrappers/artUrl';
import type { WrapperDef } from '../../stage';
import { stageCard, prefersReducedMotion } from '../stageCard';
import { clear, h, svg } from '../dom';
import type { Dispose } from '../dom';
import type { Ctx } from '../ctx';
import { getLang, localeOf, t } from '../../i18n';
import { setUserText } from '../text';
import { ribbon } from '../ribbon';
import type { RibbonShape } from '../ribbon';
import { qrPanel } from './qr';
import { plate } from '../plate';
import { layout, enter, fold } from '../layout';
import { amountBlock, sealedBlock, shortId } from '../amount';
import { tick } from '../stopwatch';
import { cue, score } from '../sound';
import { track } from '../busy';
import { destroyCapsules } from '../capsule';
import { followStep, slideToOpen } from '../slide';
import { autoKeep, downloadKeepsake, dressOf, isKept, keep, keepableWish, keptId, removeKept, setAutoKeep } from '../kept';
import type { Kept, KeptToken } from '../kept';
import { keepsakeLook } from '../keepsakeArt';
import type { KeepsakeLook } from '../keepsakeArt';
import { previewSweep, resetTakeChoice, takeHolds, takeHomePanel } from './takeHome';

type PanelKind = 'take' | 'qr';

/** Where the never-sent preview sweep is addressed: the all-zero P2PKH address. Only its size matters. */
const PREVIEW_TO = 'ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratqfx';

/** The package whose gift was already opened in this tab, so a language switch does not close it again. Not the secret: the address. */
let openedFor: string | null = null;

/**
 * What the screen showed for a package, kept in memory by its address so a
 * remount (a language switch) comes back exactly where it was: the open panel,
 * a finished take-home, and the last funded state while an operation holds
 * the screen. Never in storage; no secret.
 */
interface PkgMemory {
    panel: PanelKind | null;
    finished: boolean;
    lastFunded: PackageState | null;
    /** What arrived, once the gift is home: the record a person may choose to keep. Never the link or the wallet. */
    receipt?: Kept;
    /** Nothing is left at the package: the receipt is the whole gift. */
    whole?: boolean;
    /** The record was written once without a press: not again, so that taking it back out holds. */
    autoKept?: boolean;
}
const memory = new Map<string, PkgMemory>();

/**
 * Riddle gifts answered in this tab, by their link secret, so a language
 * switch does not ask again. Memory only; gone with the tab.
 */
const unlocked = new Map<string, PackageKey>();
const secretId = (secret: Uint8Array): string => [...secret].map(b => b.toString(16).padStart(2, '0')).join('');

/** For tests. */
export function forgetPackages(): void {
    memory.clear();
    unlocked.clear();
    openedFor = null;
}

function fmtTime(sec: number): string {
    try {
        return new Intl.DateTimeFormat(localeOf(getLang()), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(sec * 1000));
    } catch {
        return '';
    }
}

/** Parse a fragment the way the router does. Exposed for the router. */
function invalidPage(root: HTMLElement, ctx: Ctx): Dispose {
    // An empty plate: no wrapper, nothing to open.
    const card = stageCard(undefined);
    root.append(
        h(
            'section',
            { class: 'screen screen-invalid' },
            layout({
                kind: 'invalid',
                plate: plate(card, undefined, { caption: false }),
                body: [
                    h('h1', null, t('pkg.invalid.title')),
                    h('p', { class: 'lead' }, t('pkg.invalid.body')),
                    h('button', { type: 'button', class: 'btn btn-primary', onclick: () => ctx.nav.toCreate() }, t('pkg.invalid.cta')),
                ],
            }),
        ),
    );
    return () => card.destroy();
}

/**
 * A locked gift, before the answer: a lock, closed, and the giver's question.
 *
 * A link that names the gift's address (its spot; the default) lets the page
 * look before anyone answers. A gift already taken, or not funded yet, says so
 * at once and asks for no answer. For a gift that is there, the page learns
 * whether its wrapper was paid for and fetches that wrapper's pictures, so the
 * right answer leads straight to the gift as it was wrapped. An answer is then
 * right exactly when its key is the key of that address: nothing is asked of
 * the network to tell a wrong one.
 *
 * A link without a spot (the giver chose to hide the gift's status, or the
 * link is an older one) names no address. An answer becomes a key; the key
 * names an address; what the network holds there says the rest:
 *
 * - money: the answer was right — on to the gift;
 * - a history and no money: right too, but the gift was already taken home;
 * - nothing at all: "not this one" (a wrong answer, or a gift not funded yet —
 *   the two cannot be told apart, and the screen says so).
 */
function lockedPage(root: HTMLElement, ctx: Ctx, link: PackageLink, onUnlocked: (key: PackageKey) => void): Dispose {
    // Every locked gift wears the same wrapper before the answer, a lock: the giver's own comes after it.
    const def = LOCK_WRAPPER;
    const card = stageCard(def);
    let disposed = false;
    let working = false;
    // Where the gift is, when the link says. Nobody signs a link: this is only ever used to look, and an answer's
    // own key is held against it.
    let spotAddress: string | undefined;
    try {
        spotAddress = link.spot ? addressOfPkh(link.spot) : undefined;
    } catch {
        spotAddress = undefined;
    }
    const spot = spotAddress !== undefined ? link.spot : undefined;
    const atSpot = (pkh: Uint8Array): boolean => spot !== undefined && pkh.length === spot.length && pkh.every((b, i) => b === spot[i]);

    const q = h('blockquote', { class: 'riddle-q' });
    setUserText(q, link.riddle ?? '');
    const answer = h('input', { id: 'rd-answer', class: 'input', type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'go', 'aria-describedby': 'rd-msg' });
    const msg = h('div', { id: 'rd-msg', class: 'riddle-msg', role: 'alert' });
    const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, t('pkg.riddle.submit'));

    const say = (...nodes: HTMLElement[]): void => {
        msg.replaceChildren(...nodes);
        if (nodes.length) setTimeout(() => msg.isConnected && msg.dispatchEvent(new CustomEvent('cap:show', { bubbles: true })), 0);
    };

    async function attempt(): Promise<void> {
        if (working) return;
        if (normaliseAnswer(answer.value) === '') {
            say(h('p', { class: 'field-msg field-msg--bad' }, t('pkg.riddle.need')));
            return;
        }
        working = true;
        submit.disabled = true;
        submit.textContent = t('pkg.riddle.working');
        say();
        let outcome: 'right' | 'wrong' | 'taken' | 'gone' | 'offline' = 'offline';
        let key: PackageKey | null = null;
        try {
            if (link.many === true) {
                // One link with several gifts: an answer may have several gifts behind it, one in each slot. The
                // slow hash runs once; each slot is another key from its result. Nothing ever in the first two slots:
                // not an answer of this link, and the network is asked no more (two questions, so that a gift whose
                // first slot a wallet left out is still found). Otherwise the first slot that holds a gift is opened;
                // a slot with only crumbs in it (less than the least gift) is passed over, so it cannot block the rest.
                const root = await track(riddleRoot(link.secret, answer.value));
                let taken: PackageKey | null = null;
                /** Some slot so far was funded at some time: this is an answer of the link, and every slot is looked at. */
                let used = false;
                outcome = 'wrong';
                for (let slot = 0; slot < BATCH_MAX; slot++) {
                    const k = deriveKey(root, slot);
                    const state = await track(ctx.chain.read(k.address));
                    if (state.kind === 'funded' && state.xecSats >= FLOOR_SATS) {
                        key = k;
                        outcome = 'right';
                        break;
                    }
                    if (state.kind !== 'empty') {
                        used = true;
                        if (state.kind === 'taken') taken = taken ?? k;
                    } else if (slot >= 1 && !used) break;
                }
                if (outcome !== 'right' && taken !== null) {
                    key = taken;
                    outcome = 'taken';
                }
            } else if (((key = await track(unlockKey(link, answer.value))), spot && !atSpot(key.pkh))) {
                // Not the key of the address the link names: a wrong answer, and the network is not asked.
                outcome = 'wrong';
            } else {
                const state = await track(ctx.chain.read(key.address));
                // With a spot the answer is right whatever the address holds now; without one, an empty address is "not this one".
                if (spot) outcome = state.kind === 'funded' ? 'right' : 'gone';
                else outcome = state.kind === 'empty' ? 'wrong' : state.kind === 'taken' ? 'taken' : 'right';
            }
        } catch {
            outcome = 'offline';
        }
        if (disposed) return;
        working = false;
        submit.disabled = false;
        submit.textContent = t('pkg.riddle.submit');
        if (deferred !== undefined) {
            const kind = deferred;
            deferred = undefined;
            showGone(kind);
            // The gift is not there to be opened and the form is gone: a wrong answer has nothing to be told on.
            if (kind !== null && outcome !== 'right' && outcome !== 'gone') return;
        }
        if (outcome === 'gone' && key) {
            // The right answer to a gift that is no longer (or not yet) there: on to its own screen, which says so.
            unlocked.set(secretId(link.secret), key);
            onUnlocked(key);
            return;
        }
        if (outcome === 'right' && key) {
            // Not for a link with several gifts: the answer was this person's, the next one must be asked again.
            if (link.many !== true) unlocked.set(secretId(link.secret), key);
            // The lock turns and opens (a second and a half at most), then the gift's own wrapper takes the stage.
            cue.open();
            try {
                // While the lock plays, the look ahead (was the wrapper paid for?) is given the same time to finish.
                await Promise.all([
                    Promise.race([card.handle?.open() ?? Promise.resolve(), new Promise(res => setTimeout(res, 2200))]),
                    Promise.race([looking ?? Promise.resolve(), new Promise(res => setTimeout(res, 2200))]),
                ]);
            } catch {
                /* the gift is shown whether or not the lock could be played */
            }
            if (disposed) return;
            onUnlocked(key);
            return;
        }
        if (outcome === 'taken' && key) {
            // A gift in a paid wrapper that was really funded here carries its payment in the address's history:
            // nobody sets that up to mislead (it costs the wrapper's price). Such a gift is shown as what it is,
            // taken home, in its own wrapper.
            const wanted = wrapperById(link.wrapper);
            const offer = wanted ? offerOf(wanted) : ({ kind: 'free' } as const);
            // (Not for a link with several gifts: "taken" there is said of the answer, not shown as one gift.)
            if (link.many !== true && wanted && offer.kind === 'paid' && ctx.chain.past) {
                try {
                    const txs = await ctx.chain.past(key.address);
                    if (disposed) return;
                    if (txs.some(tx => isStamp(tx, wanted.id, key!.pkh, offer))) {
                        unlocked.set(secretId(link.secret), key);
                        onUnlocked(key);
                        return;
                    }
                } catch {
                    /* the history could not be read: the plain "taken" below stands */
                }
            }
        }
        if (outcome === 'taken') {
            // An address with a history and no money: this answer's gift is gone. It is not remembered as "the" answer:
            // someone who has the link but not the answer could have set this up, so another answer may still be tried.
            say(h('p', { class: 'state-title' }, t('pkg.taken')), h('p', { class: 'state-next' }, t(link.many === true ? 'pkg.riddle.taken.many' : 'pkg.riddle.taken.next')));
            answer.select?.();
            return;
        }
        if (outcome === 'offline') {
            say(h('p', { class: 'warning' }, t('pkg.neterr')));
            return;
        }
        cue.deny();
        answer.classList.add('input--bad');
        // Nothing at that address: no payment control, and the same warning an empty package carries.
        say(h('p', { class: 'state-title' }, t('pkg.riddle.wrong')), h('p', { class: 'state-next' }, t(link.many === true ? 'pkg.riddle.wrong.many' : spot ? 'pkg.riddle.again' : 'pkg.riddle.wrong.next')));
        answer.select?.();
    }
    answer.addEventListener('input', () => answer.classList.remove('input--bad'));

    const form = h(
        'form',
        {
            class: 'riddle-form',
            novalidate: true,
            onsubmit: (e: Event) => {
                e.preventDefault();
                void attempt();
            },
        },
        h('div', { class: 'field' }, h('p', { class: 'label' }, t('pkg.riddle.q.label')), q),
        // The question is a stranger's words on this page: the two things nobody may ask for are said before any answer.
        h('p', { class: 'warning danger scam' }, t('pkg.empty.scam')),
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'rd-answer' }, t('pkg.riddle.a.label')), answer),
        submit,
        msg,
    );
    const title = h('h1', null, t('pkg.riddle.title'));
    // One link given to several people: said before anything is typed, so nobody compares answers and thinks theirs is wrong.
    const lead = h('p', { class: 'lead' }, t(link.many === true ? 'pkg.riddle.lead.many' : 'pkg.riddle.lead'));
    /** The lock is shown as it is after its opening. */
    let standsOpen = false;
    // What stands in place of the question when the gift is not there to be opened: no field, no button, and the
    // warning an empty package always carries.
    const slot = h('div', { class: 'riddle-slot' }, form);
    /** A look that came back while an answer was being tried: shown once the try is over. */
    let deferred: 'taken' | 'empty' | null | undefined;
    /** The screen says "nothing here yet": worth another look when the page comes back or the network does. */
    let waiting = false;
    const showGone = (kind: 'taken' | 'empty' | null): void => {
        if (working) {
            deferred = kind;
            return;
        }
        waiting = kind === 'empty';
        lead.hidden = kind !== null;
        // The heading says what is true now: a gift that is gone is not "locked".
        title.textContent = t(kind === 'taken' ? 'pkg.taken' : kind === 'empty' ? 'pkg.empty' : 'pkg.riddle.title');
        // A gift taken home was opened: the lock stands open. Any other state has it closed.
        if ((kind === 'taken') !== standsOpen) {
            standsOpen = kind === 'taken';
            try {
                if (standsOpen) card.handle?.skip();
                else card.handle?.seek(0);
            } catch {
                /* the stage is optional */
            }
        }
        if (kind === null) {
            if (!slot.contains(form)) slot.replaceChildren(form);
            return;
        }
        // The form is taken off the page, not hidden: there is nothing here to press.
        slot.replaceChildren(
            h('p', { class: 'riddle-gone', role: 'status' }, t(kind === 'taken' ? 'pkg.taken.next' : 'pkg.empty.next')),
            h('p', { class: 'warning danger scam' }, t('pkg.empty.scam')),
        );
    };
    /** The wrapper's pictures, asked for ahead of the answer and held so that the browser keeps them. */
    const warmed: HTMLImageElement[] = [];
    let again: ReturnType<typeof setTimeout> | undefined;
    /** Look at the address the link names: is the gift there, was its wrapper paid for. */
    async function lookAhead(n = 0): Promise<void> {
        if (!spotAddress || !spot) return;
        if (again !== undefined) clearTimeout(again);
        again = undefined;
        let state: Awaited<ReturnType<typeof ctx.chain.read>>;
        try {
            state = await ctx.chain.read(spotAddress);
        } catch {
            // The network could not say. What is shown stands; a screen that is waiting for the gift keeps looking.
            if (!disposed && waiting && n < 20) again = setTimeout(() => void lookAhead(n + 1), 15000);
            return;
        }
        if (disposed) return;
        if (state.kind !== 'funded') {
            showGone(state.kind === 'taken' ? 'taken' : 'empty');
            // "Not funded yet" can change: the page looks again now and then, quietly, for five minutes.
            if (state.kind === 'empty' && n < 20) again = setTimeout(() => void lookAhead(n + 1), 15000);
            return;
        }
        showGone(null);
        const wanted = wrapperById(link.wrapper);
        if (!wanted || warmed.length) return;
        const offer = offerOf(wanted);
        if (offer.kind === 'paid') {
            let paid = false;
            try {
                const e = await entitlement({ chain: ctx.chain, coins: state.coins, wrapper: wanted.id, pkh: spot, offer, budgetMs: 8000 });
                paid = e === 'paid' || e === 'owned';
            } catch {
                paid = false;
            }
            // Not paid for, or not known in time: nothing is fetched, and the gift's own screen asks again after the answer.
            if (disposed || !paid) return;
            ENTITLED.add(paidFor(spotAddress, wanted.id));
        }
        if (typeof Image !== 'function') return;
        for (const l of dressed(wanted, link.recipe).layers) {
            const img = new Image();
            img.decoding = 'async';
            img.src = artUrl(wanted.id, l.art);
            warmed.push(img);
        }
    }
    root.append(
        h(
            'section',
            { class: 'screen screen-package screen-locked' },
            layout({
                kind: 'locked',
                plate: plate(card, def),
                head: [title, lead],
                body: [slot, h('p', { class: 'warning danger recovery' }, t('pkg.recovery'))],
            }),
        ),
    );
    let looking: Promise<void> | null = lookAhead();
    // A page that says "nothing here yet" looks again when it is come back to, or when the network returns.
    const relook = (): void => {
        if (!disposed && waiting && !working && document.visibilityState !== 'hidden') looking = lookAhead();
    };
    document.addEventListener('visibilitychange', relook);
    window.addEventListener('online', relook);
    return () => {
        disposed = true;
        if (again !== undefined) clearTimeout(again);
        document.removeEventListener('visibilitychange', relook);
        window.removeEventListener('online', relook);
        card.destroy();
    };
}

/**
 * Open the gift in the wrapper it is entitled to. A free wrapper is shown at
 * once. A paid one is shown only after the transactions behind the gift's
 * coins have been read and one of them is its stamp; until then, and whenever
 * there is no stamp or the chain cannot be asked, the default wrapper stands
 * in. Either way the gift opens: the money never waits on a wrapper, and this
 * screen never offers to pay for one. The wrapper the link names wears the
 * look the giver chose for it (`wrappers/looks.ts`); a stand-in never does.
 */
/** Gifts this page has already seen paid for (by address): a language change, or the gift being taken, does not undress them. Memory only. */
const ENTITLED = new Set<string>();
/** The name a paid gift is remembered under: its address and the wrapper that was paid for. */
const paidFor = (address: string, wrapper: string): string => `${address} ${wrapper}`;
/** After the first answer, how long to wait before each further look when the chain could not say. */
const ENTITLE_RETRIES_MS = [2000, 6000, 15000];

function entitledPackage(root: HTMLElement, ctx: Ctx, link: PackageLink, key: PackageKey): Dispose {
    const wanted = wrapperById(link.wrapper);
    const offer = wanted ? offerOf(wanted) : ({ kind: 'free' } as const);
    // The look the giver chose (the link's recipe) dresses the wrapper the link names, and only that one: the
    // default wrapper standing in for it, below, is shown as it is. The recipe is not signed; what it cannot
    // mean changes nothing.
    const worn = wanted ? dressed(wanted, link.recipe) : undefined;
    if (!wanted || offer.kind === 'free') return openPackage(root, ctx, link, key, worn ?? wrapperById(DEFAULT_WRAPPER));
    if (ENTITLED.has(paidFor(key.address, wanted.id))) return openPackage(root, ctx, link, key, worn);
    const fallback = wrapperById(DEFAULT_WRAPPER);
    const card = stageCard(fallback);
    root.append(
        h(
            'section',
            { class: 'screen screen-package' },
            layout({ kind: 'package', plate: plate(card, fallback), body: [h('p', { class: 'loading' }, h('span', { class: 'status-dot', 'aria-hidden': 'true' }), h('span', null, t('pkg.loading')))] }),
        ),
    );
    let gone = false;
    let inner: Dispose = () => card.destroy();
    let timer: ReturnType<typeof setTimeout> | undefined;
    /** `paid`, `unpaid` (a verdict: stop asking), or `unknown` (the chain could not say in time). */
    const ask = async (budgetMs: number): Promise<'paid' | 'unpaid' | 'unknown'> => {
        try {
            const s = await ctx.chain.read(key.address);
            // A gift already taken home has no coins to read a payment from, but its history still holds the
            // funding: a wrapper that was paid for stays on the gift after it is gone.
            if (s.kind === 'taken' && ctx.chain.past) {
                const txs = await Promise.race([ctx.chain.past(key.address), new Promise<null>(res => setTimeout(() => res(null), budgetMs))]);
                if (txs === null) return 'unknown';
                return txs.some(tx => isStamp(tx, wanted.id, key.pkh, offer)) ? 'paid' : 'unpaid';
            }
            // An empty package has nothing to learn from.
            if (s.kind !== 'funded') return 'unpaid';
            const e = await entitlement({ chain: ctx.chain, coins: s.coins, wrapper: wanted.id, pkh: key.pkh, offer, budgetMs });
            return e === 'paid' || e === 'owned' ? 'paid' : e === 'unpaid' ? 'unpaid' : 'unknown';
        } catch {
            return 'unknown';
        }
    };
    const show = (def: WrapperDef | undefined): void => {
        inner();
        destroyCapsules();
        clear(root);
        inner = openPackage(root, ctx, link, key, def);
    };
    /** The gift is still closed and nothing has been pressed: changing its wrapper now interrupts nobody. */
    const untouched = (): boolean => root.querySelector('.slide:not(.is-done)') !== null;
    const again = (n: number): void => {
        const wait = ENTITLE_RETRIES_MS[n];
        if (gone || wait === undefined) return;
        timer = setTimeout(() => {
            void ask(12000).then(v => {
                if (gone) return;
                if (v === 'paid') {
                    ENTITLED.add(paidFor(key.address, wanted.id));
                    // Shown at once while the gift is still closed; otherwise from the next time this screen is drawn.
                    if (untouched()) show(worn);
                } else if (v === 'unknown') again(n + 1);
            });
        }, wait);
    };
    void (async () => {
        // Four seconds at most before something is shown: the gift never waits long on a wrapper.
        const v = await ask(4000);
        if (gone) return;
        if (v === 'paid') ENTITLED.add(paidFor(key.address, wanted.id));
        show(v === 'paid' ? worn : fallback);
        // A slow network is not a verdict: the page looks again a few times, quietly.
        if (v === 'unknown') again(0);
    })();
    return () => {
        gone = true;
        if (timer !== undefined) clearTimeout(timer);
        inner();
    };
}

/** Screen C: the same screen for everyone who has the link. It never assumes who is reading. */
/** A wrapper's name in the page's language, or nothing when there is no such wrapper. */
const nameOf = (def: { readonly name: Readonly<Record<'vi' | 'en', string>> } | undefined): string => (def ? inLang(def.name, getLang()) : '');

export function mountPackage(root: HTMLElement, ctx: Ctx, link: PackageLink | null): Dispose {
    if (!link) return invalidPage(root, ctx);
    if (link.riddle !== undefined) {
        // One link shared by several: the secret names no one gift, so an answer given here is not remembered for it.
        // (The next person to open the same link in this tab must not land in the first person's gift.)
        const known = link.many === true ? undefined : unlocked.get(secretId(link.secret));
        if (known) return entitledPackage(root, ctx, link, known);
        // The locked screen hands over to the gift's own screen in place, once the answer has opened it.
        let inner: Dispose = lockedPage(root, ctx, link, key => {
            inner();
            destroyCapsules();
            clear(root);
            inner = entitledPackage(root, ctx, link, key);
        });
        return () => inner();
    }
    let key: PackageKey;
    try {
        key = deriveKey(link.secret);
    } catch {
        return invalidPage(root, ctx);
    }
    return entitledPackage(root, ctx, link, key);
}

function openPackage(root: HTMLElement, ctx: Ctx, link: PackageLink, key: PackageKey, def: WrapperDef | undefined): Dispose {
    const lang = getLang();

    /** The fragment this screen was opened with: the only one it may ever remove from the address bar. */
    const mountedHash = location.hash;
    /** The sweeps already counted into the receipt. */
    const counted = new Set<string>();
    const mem: PkgMemory = memory.get(key.address) ?? { panel: null, finished: false, lastFunded: null };
    memory.set(key.address, mem);
    const holds = takeHolds(key.address);
    let opened = openedFor === key.address;
    let revealed = opened;
    let locked = holds; // a send is in flight or unsettled
    let frozen = holds; // ignore chain updates
    let finished = mem.finished; // the gift arrived in the person's wallet
    // While an operation holds the screen, the chain shows the package moving: keep showing what was there.
    let state: PackageState | null = holds && opened ? mem.lastFunded : null;
    let loading = state === null;
    let panel: PanelKind | null = opened ? mem.panel : null;
    let cache: Partial<Record<PanelKind, HTMLElement>> = {};
    const setPanel = (p: PanelKind | null) => {
        // Closing the take panel ends a "XEC only" choice made in it: opened again, it carries the token again.
        if (panel === 'take' && p !== 'take' && !locked) {
            resetTakeChoice(key.address);
            delete cache.take;
        }
        panel = p;
        mem.panel = p;
    };
    let lastSig = '';
    /** The last preview of a take, kept so that a repaint does not sign every coin again. */
    let net: ReturnType<typeof previewSweep> | null = null;
    let netFor: string | null = null;
    let firstApply = true;
    let revealPlayed = opened; // the reveal moment plays once, and not again after a language switch
    let disposed = false;
    let seq = 0;

    // The tokens at the package, read after the package itself: whose they are, and what the giver's calls itself.
    let tokens: GiftToken[] = [];
    const metas = new Map<string, TokenMeta | null>();
    let tokenSig = '';
    let tokensReady = true;
    /** undefined: the default (the giver's token). A token id or null: the reader's own choice. */
    let pick: string | null | undefined;
    const chosen = (): string | null => {
        if (pick !== undefined && (pick === null || tokens.some(tk => tk.tokenId === pick))) return pick;
        return tokens.find(tk => tk.origin === 'giver')?.tokenId ?? null;
    };
    /** The tokens could not be read (or not in time): none is named, and the screen says so. */
    let tokensUnread = false;
    async function loadTokens(s: PackageState, sig: string): Promise<void> {
        let found: GiftToken[] | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            // Four seconds at most: a token never keeps the XEC waiting.
            const late = new Promise<null>(res => {
                timer = setTimeout(() => res(null), 4000);
            });
            const look = (async (): Promise<GiftToken[]> => {
                const list = await giftTokens({ chain: ctx.chain, coins: s.coins, pkh: key.pkh, address: key.address });
                // Only the giver's token is ever named, so only its name is asked for.
                for (const tk of list.filter(x => x.origin === 'giver').slice(0, 3)) {
                    if (metas.has(tk.tokenId)) continue;
                    try {
                        metas.set(tk.tokenId, (await ctx.chain.tokenMeta?.(tk.tokenId)) ?? null);
                    } catch {
                        metas.set(tk.tokenId, null);
                    }
                }
                return list;
            })();
            look.catch(() => {});
            found = await Promise.race([look, late]);
        } catch {
            found = null;
        } finally {
            clearTimeout(timer);
        }
        if (disposed || sig !== tokenSig) return;
        tokensUnread = found === null;
        // Unread: every token is of unknown origin. It can still be picked; the XEC can still go.
        tokens = found ?? holdings(s.coins).map(x => ({ tokenId: x.tokenId, kind: x.kind, atoms: x.atoms, coins: x.coins, final: x.final, origin: 'other' as const }));
        tokensReady = true;
        if (!locked) cache = {};
        renderBelow();
    }

    const card = stageCard(def, {
        onReveal: () => {
            revealed = true;
            if (state) renderBelow();
        },
    });
    const below = h('div', { class: 'below', 'aria-live': 'polite' });
    // The button that lets the wrapper be looked at large (see where the screen is put together, below).
    const lookBtn = h(
        'button',
        { type: 'button', class: 'look-btn', 'aria-pressed': 'false', 'aria-label': t('pkg.look') },
        svg('svg', { viewBox: '0 0 24 24', width: 20, height: 20, 'aria-hidden': 'true', focusable: 'false' }, svg('path', { d: 'M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6' })),
    );
    let lookHost: HTMLElement | null = null;
    const capOf = (host: HTMLElement | null): Element | null => host?.querySelector('.capsule') ?? null;
    const plateEl = plate(card, def);

    function syncOverlay(): void {
        clear(card.overlay);
        if (state?.kind === 'funded' && !opened) {
            card.overlay.append(h('button', { type: 'button', class: 'tap', 'aria-label': t('pkg.tap'), onclick: tapToOpen }));
        }
    }

    // ---- The scene follows the thumb on the slide, at no more than its own pace and a half (`followStep`) ----
    /** Where the thumb asks the opening to be, and where it is, in ms. */
    let followTo = 0;
    let followAt = 0;
    let followLast = 0;
    let followRaf = 0;
    const calm = prefersReducedMotion();
    const seekScene = (ms: number): void => {
        try {
            card.handle?.seek(ms <= 0 ? 0 : Math.max(1, ms));
        } catch {
            /* the stage is optional */
        }
    };
    const stopFollow = (): void => {
        if (followRaf !== 0 && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(followRaf);
        followRaf = 0;
    };
    const followFrame = (now: number): void => {
        followRaf = 0;
        if (disposed || opened) return;
        // A frame that came late (a busy page, a tab in the background) counts for no more than a slow one.
        const dt = Math.min(64, Math.max(0, now - followLast));
        followLast = now;
        followAt = followStep(followAt, followTo, dt);
        seekScene(followAt);
        if (Math.abs(followTo - followAt) > 0.5) followRaf = requestAnimationFrame(followFrame);
    };
    const follow = (to: number): void => {
        followTo = to;
        if (calm || typeof requestAnimationFrame !== 'function') {
            // No motion wanted, or no frames to be had: the scene is simply put where the thumb is.
            followAt = to;
            seekScene(to);
            return;
        }
        if (followRaf !== 0) return;
        followLast = typeof performance !== 'undefined' ? performance.now() : 0;
        followRaf = requestAnimationFrame(followFrame);
    };

    function tapToOpen(): void {
        if (opened) return;
        // The opening plays on from where the scene stands, not from where the thumb got to.
        stopFollow();
        opened = true;
        openedFor = key.address;
        // Heard only if a touch on the capsule has woken sound: the slide is one.
        cue.scrubEnd();
        cue.open();
        syncOverlay();
        const hd = card.handle;
        const done = () => {
            if (revealed) return;
            revealed = true;
            renderBelow();
        };
        renderBelow();
        if (!hd) return done();
        hd.open().then(done, done);
    }

    function guide(shape: RibbonShape, text: string): HTMLElement {
        return h('p', { class: 'guide' }, ribbon(shape), h('span', null, text));
    }

    /**
     * Slide to open: the gift's own opening follows the thumb, up to just
     * before the reveal — as fast as a slow hand, never faster than its own
     * pace and a half, so a flick does not skip it. Let go early and it closes.
     * The knob is a button: pressed (a keyboard, a screen reader), it opens.
     */
    function openBtn(): HTMLElement {
        const scrubMs = Math.max(0, (def?.revealAt ?? 0) * 0.82);
        return slideToOpen({
            hint: t('pkg.slide'),
            label: t('pkg.open'),
            onScrub: p => {
                cue.scrub(p);
                follow(Math.max(1, p * scrubMs));
            },
            onCancel: () => {
                cue.scrubEnd();
                follow(0);
            },
            onCommit: tapToOpen,
        });
    }

    function panelEl(kind: PanelKind): HTMLElement {
        const s = state!;
        const made = cache[kind];
        if (made) return made;
        const busy = (b: boolean) => {
            locked = b;
            frozen = b;
            renderBelow();
            if (!b) void load(true);
        };
        let el: HTMLElement;
        if (kind === 'take') {
            el = takeHomePanel({
                chain: ctx.chain,
                key,
                state: s,
                tokenId: chosen(),
                onBusy: busy,
                onDone: (sats, left, tokenLeft, more) => {
                    finished = true;
                    mem.finished = true;
                    // Several rounds ("take the rest") add up to one gift; the same round is never counted twice.
                    const ref = keptId(key.address);
                    if (ref !== null && !(more.txid !== undefined && counted.has(more.txid))) {
                        if (more.txid !== undefined) counted.add(more.txid);
                        const before = mem.receipt;
                        const tk = more.token;
                        const meta = tk ? metas.get(tk.tokenId) : undefined;
                        const named = tk !== undefined && tokens.some(x => x.tokenId === tk.tokenId && x.origin === 'giver') && meta != null;
                        // The fee is kept only when every round's fee is known: a part of it is not "the fee".
                        const fee = more.fee !== undefined && (before === undefined || before.fee !== undefined) ? String(BigInt(before?.fee ?? '0') + more.fee) : undefined;
                        const wish = keepableWish(link.wish);
                        // One token per record: more of the same adds up, a different one does not replace it.
                        const sameToken = tk !== undefined && before?.token !== undefined && (before.token.tokenId === undefined || before.token.tokenId === tk.tokenId);
                        const token: KeptToken | undefined =
                            tk === undefined || (before?.token !== undefined && !sameToken)
                                ? before?.token
                                : {
                                      nft: tokens.find(x => x.tokenId === tk.tokenId)?.kind === 'nft',
                                      atoms: String(BigInt(sameToken ? before!.token!.atoms : '0') + tk.atoms),
                                      // A token's id and name are kept only where the screen itself showed them: the giver's own token.
                                      ...(named ? { tokenId: tk.tokenId, decimals: meta.decimals, ticker: meta.ticker, name: meta.name } : {}),
                                  };
                        mem.receipt = {
                            ref,
                            at: before?.at ?? Date.now(),
                            wrapper: link.wrapper ?? '',
                            // The look is kept only when it was worn: the wrapper shown was the one the link names.
                            ...(def?.id === link.wrapper && dressOf(link.recipe) !== undefined ? { dress: dressOf(link.recipe)! } : {}),
                            ...(wish !== undefined ? { wish } : {}),
                            sats: String(BigInt(before?.sats ?? '0') + sats),
                            ...(fee !== undefined ? { fee } : {}),
                            ...(token !== undefined ? { token } : {}),
                        };
                    }
                    // Offered once nothing is left at the package: a record of half a gift would be a wrong record.
                    mem.whole = left === 0 && !tokenLeft;
                    locked = true;
                    frozen = true;
                    // The fragment (the secret) leaves the address bar once the gift is home, and nothing is left behind.
                    // While a token is still at the package the link is still its only key: it stays.
                    // Only this gift's own link, and only while this screen is the one on the page.
                    if (left === 0 && !tokenLeft && !disposed && location.hash === mountedHash) history.replaceState(null, '', location.pathname + location.search);
                    renderBelow();
                },
            });
        } else {
            el = qrPanel({ text: encodeLink(link, location.origin), title: t('qr.title.link'), warning: t('link.qr.warn') });
        }
        cache[kind] = enter(el);
        // The capsule lifts and brings this panel into view once it is on the page.
        setTimeout(() => {
            if (el.isConnected) el.dispatchEvent(new CustomEvent('cap:show', { bubbles: true }));
        }, 0);
        return el;
    }

    function actions(): HTMLElement {
        const btn = (kind: PanelKind, label: string, cls: string, off: boolean) =>
            h(
                'button',
                {
                    type: 'button',
                    class: 'btn ' + cls,
                    disabled: off,
                    'aria-expanded': String(panel === kind),
                    onclick: () => {
                        setPanel(panel === kind ? null : kind);
                        renderBelow();
                    },
                },
                label,
            );
        // One clear way forward. While its panel is open, the trigger steps aside: the panel's own button says the same.
        return h(
            'div',
            { class: 'btn-col actions' },
            panel === 'take' ? null : btn('take', t('pkg.take'), 'btn-primary', !tokensReady),
            btn('qr', t('pkg.qr'), 'btn-quiet', false),
        );
    }

    /** The sender's words. A stranger's text: `setUserText`. */
    function wishBlock(): HTMLElement | null {
        if (!link.wish) return null;
        const text = h('blockquote', { class: 'wish-text' });
        setUserText(text, link.wish);
        // Words that name money, an address or a site get the scam line right under them.
        const asks = /ecash:|etoken:|https?:|www\.|\bxec\b|usdt|usdc|\bbtc\b|[qp][a-z0-9]{41}|\.(com|net|org|io|cash|xyz|app|vn)\b|chuyển\s*khoản|số\s*tài\s*khoản|\bstk\b|bank|@\w{3,}|\d{9,}/i.test(link.wish);
        return h('div', { class: 'wish' }, h('h2', { class: 'label wish-title' }, t('pkg.note.title')), text, asks ? h('p', { class: 'warning danger scam' }, t('pkg.empty.scam')) : null);
    }
    /** What stays readable once the gift is gone: the words, and the package's reference. */
    function keepsake(): HTMLElement[] {
        const w = wishBlock();
        const ref = h('p', { class: 'note keepsake-ref' }, `${t('gift.ref.label')} `, h('span', { class: 'mono' }, shortId(key.address)));
        return w ? [w, ref] : [ref];
    }

    /** Two ways to keep what came with the gift: a file, and this browser (on its own, unless the person switched that off). */
    function keepBox(): HTMLElement | null {
        const rec = mem.receipt;
        if (!rec || mem.whole !== true) return null;
        const said = h('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
        const kplain = wrapperById(rec.wrapper);
        const kdef = kplain ? dressed(kplain, rec.dress) : undefined;
        const name = nameOf(kdef);
        // The wrapper's still picture, made ready before any press: the download itself must not wait.
        let look: KeepsakeLook | null = null;
        void keepsakeLook(kdef).then(l => (look = l));
        const file = h(
            'button',
            {
                type: 'button',
                class: 'btn btn-secondary',
                onclick: () => {
                    said.textContent = t(downloadKeepsake(rec, lang, name, look) ? 'kept.downloaded' : 'kept.download.fail');
                },
            },
            t('kept.download'),
        );
        const here = h(
            'button',
            {
                type: 'button',
                class: 'btn btn-secondary',
                onclick: () => {
                    said.textContent = t(keep(rec) ? 'kept.saved' : 'kept.save.fail');
                    paintKept();
                    if (!undo.hidden) undo.focus();
                },
            },
            t('kept.save'),
        );
        // The way back out of a record, whether it was written by a press or on its own.
        const undo = h(
            'button',
            {
                type: 'button',
                class: 'btn btn-secondary',
                onclick: () => {
                    removeKept(rec.ref);
                    paintKept();
                    if (!isKept(rec)) said.textContent = t('keep.undone');
                    if (!here.hidden) here.focus();
                },
            },
            t('keep.undo'),
        );
        const paintKept = (): void => {
            const kept = isKept(rec);
            here.hidden = kept;
            undo.hidden = !kept;
        };
        // One chance for a gift, spent whatever the switch says: a record the person took back out stays out, and
        // a switch turned on later writes nothing behind their back.
        if (mem.autoKept !== true) {
            mem.autoKept = true;
            if (autoKeep()) keep(rec);
        }
        if (isKept(rec)) said.textContent = t('kept.saved');
        paintKept();
        const auto = h('input', { type: 'checkbox', class: 'check-box', checked: autoKeep(), onchange: () => setAutoKeep(auto.checked) }) as HTMLInputElement;
        return h('div', { class: 'stack keep-box' }, h('p', { class: 'label' }, t('kept.title')), h('p', null, t('kept.body')),
            // Said plainly when the words are left out of the record.
            link.wish && rec.wish === undefined ? h('p', { class: 'note' }, t('kept.wish.left')) : null,
            h('div', { class: 'btn-col' }, file, here, undo), said, h('label', { class: 'check' }, auto, h('span', null, t('keep.auto'))),
            fold(t('kept.warn.sum'), { id: 'pkg.kept.warn' }, h('p', { class: 'note' }, t('kept.warn'))));
    }

    function renderFunded(s: PackageState): void {
        if (!revealed) {
            below.append(sealedBlock({ label: t('gift.amount.label'), address: key.address, refLabel: t('gift.ref.label'), mark: numberMarks(lang)[1] }));
            if (!opened) below.append(h('div', { class: 'invite' }, guide('bow', t('pkg.invite')), openBtn()));
            else if (card.handle) below.append(h('div', { class: 'invite' }, h('button', { type: 'button', class: 'btn btn-quiet', onclick: () => {
                // Skipped: the tune is cut, and the reveal's own sound takes over.
                score.stop();
                card.handle?.skip();
            } }, t('common.skip'))));
            return;
        }
        const animate = !revealPlayed;
        if (animate) {
            revealPlayed = true;
            if (opened) {
                tick();
                cue.reveal();
            }
        }
        if (finished) {
            below.append(guide('check', t('pkg.guide.done')));
            if (panel === 'take') below.append(panelEl('take'));
            // The gift is home, but what came with it is still here to read: the sender's words and which package it was.
            below.append(...keepsake());
            const kb = keepBox();
            if (kb) below.append(kb);
            return;
        }
        const gift = h('div', { class: 'gift' });
        // A gift that is a token: the package holds only the least XEC, there to pay the way home. Then the
        // token leads and the XEC is the small print. Read from the chain alone; the link says nothing of it.
        const lead = s.hasToken && s.xecSats <= FLOOR_SATS ? (tokensReady ? tokens.find(tk => tk.tokenId === chosen() && tk.origin === 'giver') : null) : undefined;
        const amt =
            lead === undefined
                ? amountBlock({ text: formatXec(s.xecSats, lang), label: t('gift.amount.label'), address: key.address, refLabel: t('gift.ref.label'), reveal: animate })
                : amountBlock({ text: formatXec(s.xecSats, lang), label: t('gift.amount.fee'), address: key.address, refLabel: t('gift.ref.label'), size: 'small' });
        gift.append(amt);
        if (!s.allFinal) gift.append(h('p', { class: 'note unfinal' }, h('span', { class: 'status-dot', 'aria-hidden': 'true' }), h('span', null, t('pkg.unfinal'))));
        if (s.hasToken && !tokensReady) gift.append(h('p', { class: 'note token' }, t('pkg.tok.loading')));
        else if (s.hasToken) {
            const id = chosen();
            const mine = tokens.find(tk => tk.tokenId === id);
            if (mine) {
                const card = tokenCard(mine, metas.get(mine.tokenId), lead != null);
                if (lead) gift.insertBefore(card, amt);
                else gift.append(card);
            }
            const others = otherTokens({
                tokens,
                metas,
                picked: id,
                locked,
                onPick: next => {
                    if (locked) return;
                    pick = next;
                    resetTakeChoice(key.address);
                    cache = {};
                    renderBelow();
                },
            });
            if (others) gift.append(others);
            if (tokensUnread) {
                gift.append(
                    h('p', { class: 'warning' }, t('pkg.tok.unread')),
                    h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn btn-secondary btn-small',
                            disabled: locked,
                            onclick: () => {
                                if (locked || !state) return;
                                tokensReady = false;
                                renderBelow();
                                void loadTokens(state, tokenSig);
                            },
                        },
                        t('common.retry'),
                    ),
                );
            }
            // A token of a kind this page does not move (or a right to mint more): it stays where it is.
            if (holdings(s.coins).reduce((n, x) => n + x.coins, 0) < s.coins.filter(c => c.token).length) gift.append(h('p', { class: 'note token' }, t('pkg.token')));
        }
        // Said before any button: what will arrive, and what the network takes. Read from a sweep that is never sent.
        // Only where it is the whole story: not while a take is under way, not when the token changes what
        // the figure means, not when one round cannot carry everything.
        if (!locked && (!s.hasToken || tokensReady) && s.coins.length <= MAX_SWEEP_INPUTS) {
            const want = chosen();
            const sig = `${lastSig}|${want}`;
            if (netFor !== sig) {
                netFor = sig;
                net = previewSweep(key, s, PREVIEW_TO, want);
            }
            if (net && !('code' in net) && net.fused !== true && net.tokenLeft !== true)
                gift.append(h('p', { class: 'note net' }, t('pkg.net', { net: formatXec(net.sentSats, lang), fee: formatXec(net.feeSats, lang) })));
        }
        const w = wishBlock();
        if (w) gift.append(w);
        gift.append(h('p', { class: 'warning danger recovery' }, t('pkg.recovery')));
        below.append(gift);
        // Until the tokens are read, nothing that moves the gift is on screen: a panel built now would
        // carry no token and leave the giver's behind.
        if (s.hasToken && !tokensReady) return;
        const rest: HTMLElement[] = [];
        // A new re-key link, once it exists, stays on screen until the person leaves.
        const shown: PanelKind[] = [];
        if (panel) shown.push(panel);
        if (locked) {
            if (takeHolds(key.address) && !shown.includes('take')) shown.unshift('take');
            for (const k of shown) if (k !== 'qr') below.append(panelEl(k));
            return;
        }
        // One clear way forward needs no caption.
        rest.push(h('div', { class: 'next' }, actions()));
        for (const k of shown) rest.push(panelEl(k));
        rest.push(h('div', { class: 'fine' }, h('p', { class: 'note' }, t('pkg.temp')), h('p', { class: 'note' }, t('pkg.notpaid'))));
        if (animate) {
            rest.forEach((el, i) => enter(el, 120 + i * 60));
            // The amount block plays its own moment; what follows it fades up.
            [...gift.children].slice(1).forEach((el, i) => enter(el as HTMLElement, 80 + i * 50));
        }
        below.append(...rest);
    }

    function syncLook(): void {
        // Only beside a gift that is open: an empty or taken package carries no control at all.
        const look = !loading && !!state && state.kind === 'funded' && revealed;
        if (look && lookHost && !lookBtn.isConnected) lookHost.append(lookBtn);
        else if (!look && lookBtn.isConnected) {
            capOf(lookHost)?.dispatchEvent(new CustomEvent('cap:low', { detail: { on: false } }));
            lookBtn.remove();
        }
    }

    function renderBelow(): void {
        // A slide torn down mid-drag never hears the thumb leave: stop its note here.
        cue.scrubEnd();
        clear(below);
        syncLook();
        // An empty or taken package: the wrapper steps back, dimmed by the frame around the stage.
        plateEl.classList.toggle('plate--dim', !loading && !!state && state.kind !== 'funded' && !locked && !finished);
        if (disposed) return;
        if (loading) {
            below.append(h('p', { class: 'loading' }, h('span', { class: 'status-dot', 'aria-hidden': 'true' }), h('span', null, t('pkg.loading'))));
            return;
        }
        if (!state) {
            below.append(
                h('p', { class: 'warning' }, t('pkg.neterr')),
                h('div', null, h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => { loading = true; renderBelow(); void load(true); } }, t('common.retry'))),
            );
            return;
        }
        if (state.kind === 'empty') {
            below.append(
                h('p', { class: 'state-title' }, t('pkg.empty')),
                h('p', { class: 'state-next' }, t('pkg.empty.next')),
                h('p', { class: 'warning danger scam' }, t('pkg.empty.scam')),
            );
            if (state.hasToken) below.append(h('p', { class: 'note token' }, t('pkg.token')));
        } else if (state.kind === 'taken') {
            below.append(h('p', { class: 'state-title' }, t('pkg.taken')), h('p', { class: 'state-next' }, t('pkg.taken.next')));
            // One link with several gifts: this one went to someone quicker, another may be left for the same answer.
            if (link !== null && link.many === true)
                below.append(h('p', { class: 'strong' }, t('pkg.many.again')), h('div', null, h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => location.reload() }, t('pkg.many.retry'))));
            if (state.takenAt) below.append(h('p', { class: 'note' }, t('pkg.taken.at', { time: fmtTime(state.takenAt) })));
            // The words came in the link, not in the package: they can still be read after the gift has gone.
            below.append(...keepsake());
            // A token with no XEC beside it cannot move. No payment control here, ever: "pay a little to
            // unlock your prize" is exactly what a scam looks like.
            if (state.hasToken) below.append(h('p', { class: 'note token' }, t('pkg.token.stuck')), h('p', { class: 'warning danger scam' }, t('pkg.token.stuck.scam')));
            // Always: a link to an emptied package, with words asking for money, is a known trick.
            below.append(h('p', { class: 'warning danger scam' }, t('pkg.empty.scam')));
        } else renderFunded(state);
    }

    function apply(s: PackageState): void {
        const tsig = s.kind === 'funded' ? s.coins.filter(c => c.token).map(c => `${c.txid}:${c.outIdx}:${c.final}`).sort().join(',') : '';
        const sig = `${s.kind}|${s.xecSats}|${s.allFinal}|${s.hasToken}|${tsig}`;
        const changed = sig !== lastSig;
        lastSig = sig;
        state = s;
        loading = false;
        if (tsig !== tokenSig) {
            tokenSig = tsig;
            if (tsig === '') {
                tokens = [];
                tokensReady = true;
            } else {
                tokensReady = false;
                void loadTokens(s, tsig);
            }
        }
        if (s.kind === 'funded') mem.lastFunded = s;
        if (changed) cache = {};
        if (s.kind === 'taken') {
            try {
                card.handle?.seek(Infinity);
            } catch {
                /* the stage is optional */
            }
        }
        syncOverlay();
        if (firstApply) {
            firstApply = false;
            if (import.meta.env.DEV && ctx.demo) demoStart(ctx.demo.params);
            else if (opened && s.kind === 'funded') card.handle?.seek(Infinity);
        }
        if (changed) renderBelow();
    }

    /** Development stills: `&still=<ms>` and `&panel=take|qr`. */
    function demoStart(params: URLSearchParams): void {
        const still = params.get('still');
        const p = params.get('panel');
        if (state?.kind !== 'funded') return;
        if (p === 'take' || p === 'qr') {
            opened = true;
            openedFor = key.address;
            revealed = true;
            setPanel(p);
            card.handle?.seek(Infinity);
            syncOverlay();
        } else if (still !== null && still !== '') {
            const ms = Number(still);
            if (!Number.isNaN(ms)) {
                if (ms > 0) {
                    opened = true;
                    syncOverlay();
                }
                try {
                    card.handle?.seek(ms);
                } catch {
                    /* the stage is optional */
                }
                if (ms >= (def?.revealAt ?? 1)) revealed = true;
            }
        }
    }

    async function load(silent: boolean): Promise<void> {
        const mine = ++seq;
        if (!silent) {
            loading = true;
            renderBelow();
        }
        try {
            let s = await ctx.chain.read(key.address);
            // "Empty" or "taken" on one node's word is not shown: someone might throw away a link that is still
            // good. When the answer is that, and it is news, the nodes are asked together.
            if (s.kind !== 'funded' && state?.kind !== s.kind && ctx.chain.readChecked) {
                try {
                    s = await ctx.chain.readChecked(key.address);
                } catch {
                    /* no agreement to be had: the one answer there is */
                }
            }
            if (disposed || mine !== seq || (frozen && state)) return;
            apply(s);
        } catch {
            if (disposed || mine !== seq || (frozen && state)) return;
            if (!state) {
                loading = false;
                renderBelow();
            }
        }
    }

    let unwatch: () => void = () => {};
    try {
        unwatch = ctx.chain.watch(key.address, () => {
            if (!frozen) void load(true);
        });
    } catch {
        /* no live updates: the first read still shows the state */
    }

    // ---- Look at the wrapper: on a phone the card takes most of the screen once the gift is open, and the wrapper
    //      stands small above it. One press steps the card down to a strip, and the wrapper grows; another brings it back.
    const section = h('section', { class: 'screen screen-package' }, layout({ kind: 'package', plate: plateEl, body: [below] }));
    lookHost = section;
    syncLook();
    const capEl = section.querySelector('.capsule');
    lookBtn.addEventListener('click', () => {
        if (!capEl) return;
        const on = lookBtn.getAttribute('aria-pressed') !== 'true';
        const funded = state?.kind === 'funded';
        const take = funded ? [...below.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === t('pkg.take') && !b.disabled) : undefined;
        capEl.dispatchEvent(
            new CustomEvent('cap:low', {
                detail: {
                    on,
                    text: funded && state ? `${formatXec(state.xecSats, getLang())} XEC` : '',
                    ...(take ? { label: t('pkg.take'), run: () => [...below.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === t('pkg.take'))?.click() } : {}),
                },
            }),
        );
    });
    section.addEventListener('cap:lowchange', e => {
        const on = (e as CustomEvent<{ on: boolean }>).detail?.on === true;
        lookBtn.setAttribute('aria-pressed', String(on));
        lookBtn.setAttribute('aria-label', t(on ? 'pkg.look.back' : 'pkg.look'));
    });
    root.append(section);
    if (state && opened) {
        // Back from a remount while an operation holds the screen: the wrapper stays open.
        firstApply = false;
        try {
            card.handle?.seek(Infinity);
        } catch {
            /* the stage is optional */
        }
    }
    renderBelow();
    void load(true);
    return () => {
        disposed = true;
        cue.scrubEnd();
        score.stop();
        unwatch();
        card.destroy();
    };
}
