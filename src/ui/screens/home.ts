import { shortId } from '../amount';
import { explorerRef } from '../explorer';
import { rich } from '../ecash';
import { downloadKeepsake, forgetSent, keptRef, keptTokenText, keptWhen, loadKept, loadSent, removeKept } from '../kept';
import type { Sent } from '../kept';
import { keepsakeLook } from '../keepsakeArt';
import type { KeepsakeLook } from '../keepsakeArt';
import { isHoliday, offerOf, inLang } from '../../wrappers/meta';
import { SHELF as WRAPPERS, shelfById as wrapperById, fullWrapper, loadWrappers, type ShelfDef } from '../../wrappers/shelf';
import { doorUrl, thumbUrl } from '../../wrappers/artUrl';
import { formatXec } from '../../core/money';
import type { PackageState } from '../../core';
import { h, svg } from '../dom';
import type { Dispose } from '../dom';
import type { Ctx } from '../ctx';
import { getLang, t } from '../../i18n';
import type { Key } from '../../i18n';
import { stageCard, type StageCard } from '../stageCard';
import { makeCapsule } from '../capsule';
import { applyTheme, themeTokens } from '../theme';
import { setAmbient } from '../ambient';
import { setUserText } from '../text';
import { fold } from '../layout';
import { isFav, loadFavs, toggleFav } from '../fav';
import { ribbon } from '../ribbon';
import { cue, score } from '../sound';
import { DEFAULT_CREDIT } from '../plate';
import { chooseWrapper, chosenWrapper } from '../draft';

type View = 'shelf' | 'how' | 'about' | 'workshop' | 'market' | 'kept' | 'sent';

/**
 * What the shop remembers for the visit, in memory only: the wrapper being
 * tried on (none at first: the whole shelf is in view) and the page of the
 * capsule that is open.
 */
/** Cards on one page of the lists of gifts received and sent. */
export const PAGE_ROWS = 6;
/** Out of sight for this long, what the list of gifts sent read from the chain is asked for again. */
const SENT_STALE_MS = 10_000;
/** How many of the sent list's questions to the chain are under way at once: a page of batches is up to fifty-four. */
const SENT_READS_AT_ONCE = 3;

let worn: string | null = null;
let view: View = 'shelf';
/** The page in view of each list: kept across a change of language, like the view itself. */
const listPage = { kept: 0, sent: 0 };

/** For tests. */
export function resetHome(): void {
    worn = null;
    view = 'shelf';
    listPage.kept = 0;
    listPage.sent = 0;
}

interface Door {
    /** What the shelf knows of the wrapper. Its scene is fetched (`fullWrapper`) only when the door is worn. */
    readonly def: ShelfDef;
    readonly el: HTMLElement;
    readonly art: HTMLElement;
    readonly btn: HTMLButtonElement;
    card: StageCard;
    /** The door's scene is mounted. A door far along the shelf has none: twenty-four scenes at once is more than a phone should run. */
    live: boolean;
    /** The door is meant to carry its scene (it is worn): set at once, the scene follows when its definition is here. */
    want: boolean;
    /** Counts the asks for a scene, so that only the last one mounts it. */
    asked: number;
}

/**
 * The shop window. Every wrapper is a door — a tall slice of its living
 * scene. Touch a door and it opens wide, the others step back to slivers,
 * and the whole page puts that wrapper on: the capsule, the islands, the
 * type, the sounds. The capsule under them is the counter: what the wrapper
 * is, what it costs, and the one button that wraps a gift in it — or, on its
 * other pages, how the thing works, what it is, the workshop, and how
 * wrappers will be bought.
 */
/** A wrapper's name in the page's language, or nothing when there is no such wrapper. */
const nameOf = (def: { readonly name: Readonly<Record<'vi' | 'en', string>> } | undefined): string => (def ? inLang(def.name, getLang()) : '');

export function mountHome(root: HTMLElement, ctx: Ctx): Dispose {
    const lang = getLang();
    if (worn !== null && !wrapperById(worn)) worn = null;
    // Development stills: `?demo&wear=<id>&view=how|about|workshop|market`.
    if (import.meta.env.DEV && ctx.demo) {
        const w = ctx.demo.params.get('wear');
        const v = ctx.demo.params.get('view');
        if (w && wrapperById(w)) worn = w;
        if (v === 'how' || v === 'about' || v === 'workshop' || v === 'market') view = v;
    }
    let previewing = false;
    /** The "watch it open" button on the counter, while it is in view: shown once the worn door's scene is mounted. */
    let playBtn: HTMLButtonElement | null = null;
    let disposed = false;
    /** The price on a door and on the counter: what the shelf says the wrapper costs to send with. */
    const price = (def: ShelfDef): string => {
        const offer = offerOf(def);
        return offer.kind === 'free' ? t('home.price.free') : `${formatXec(offer.sats, lang)} XEC`;
    };

    // ---- Favourites: a heart on the wrapper that is worn, and a filter that leaves only the hearts on the shelf ----
    const heart = (): SVGElement =>
        svg('svg', { viewBox: '0 0 24 24', width: 18, height: 18, class: 'heart', 'aria-hidden': 'true', focusable: 'false' }, svg('path', { d: 'M12 20.4s-7.6-4.7-7.6-10.1A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 7.6 2.8c0 5.4-7.6 10.1-7.6 10.1z' }));
    /**
     * What the shelf is narrowed to. Each part narrows on its own: hearts only, holiday wrappers only, and free
     * or paid. Not kept anywhere: a fresh visit shows everything.
     */
    type Price = 'all' | 'free' | 'paid';
    interface Narrow {
        readonly fav: boolean;
        readonly holiday: boolean;
        readonly price: Price;
    }
    let narrow: Narrow = { fav: false, holiday: false, price: 'all' };
    const narrowed = (f: Narrow = narrow): boolean => f.fav || f.holiday || f.price !== 'all';
    const fits = (def: ShelfDef, f: Narrow, favs: ReadonlySet<string>): boolean =>
        (!f.fav || favs.has(def.id)) && (!f.holiday || isHoliday(def)) && (f.price === 'all' || (offerOf(def).kind === 'free') === (f.price === 'free'));
    const countOf = (f: Narrow, favs: ReadonlySet<string> = new Set(loadFavs())): number => WRAPPERS.filter(def => fits(def, f, favs)).length;

    // ---- The doors ----
    // A door at rest is a small picture of its wrapper, closed (public/thumbs, drawn by scripts/og-cards.mjs): one
    // image, fetched when it nears the view. Only the door that is worn carries the live scene. A shelf of live
    // scenes is more than a phone's browser will hold.
    // A door is a narrow window onto the scene, so its picture is the middle of the still, cut out and sharper
    // (`doorUrl`). When few doors are on the shelf they grow wider than that cut: then the whole still is used.
    let roomy = false;
    const dressStill = (img: HTMLElement, def: ShelfDef): void => {
        img.className = roomy ? 'door-still' : 'door-still door-still--cut';
        img.setAttribute('src', roomy ? thumbUrl(def.id) : doorUrl(def.id));
    };
    const still = (def: ShelfDef): StageCard => {
        const img = h('img', { alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' });
        dressStill(img, def);
        return { el: h('div', { class: 'stage-card' }, img), handle: null, overlay: h('div', null), destroy() {} };
    };
    const doors: Door[] = WRAPPERS.map(def => {
        const card = still(def);
        const art = h('div', { class: 'door-art' }, card.el);
        art.style.setProperty('--ar', String(def.size[0] / def.size[1]));
        const name = h('span', { class: 'door-name' });
        setUserText(name, inLang(def.name, lang));
        const tag = h('div', { class: 'door-tag', 'aria-hidden': 'true' }, name, offerOf(def).kind === 'free' ? null : h('span', { class: 'door-price' }, price(def)), h('span', { class: 'door-heart' }, heart()));
        // Only a wrapper with a price carries a tag: "free" on every other door was noise.
        // A name with a very long word is set a little smaller, so that the word is not broken in two.
        if (inLang(def.name, lang).split(/[\s-]+/).some(word => [...word].length >= 11)) tag.dataset.long = 'yes';
        const btn = h('button', {
            type: 'button',
            class: 'door-btn',
            'aria-pressed': 'false',
            'aria-label': t('home.door.try', { name: inLang(def.name, lang) }),
            onclick: () => wear(def.id),
        });
        const el = h('div', { class: 'door', 'data-id': def.id }, art, tag, btn);
        // A door carries its own theme, so its tag is a small piece of that world whatever the page wears.
        applyTheme(def, el);
        el.style.setProperty('--door-bg', def.backdrop);
        return { def, el, art, btn, card, live: false, want: false, asked: 0 };
    });
    // The last door is not a wrapper: it stands for the ones that are not here yet.
    const soon = h(
        'button',
        {
            type: 'button',
            class: 'door door--soon',
            onclick: () => {
                view = 'workshop';
                renderBody();
            },
        },
        h('span', { class: 'door-plus', 'aria-hidden': 'true' }, '+'),
        h('span', { class: 'door-soon-name' }, t('home.soon.door')),
        h('span', { class: 'door-soon-tag' }, t('home.soon')),
    );
    const doorsEl = h('div', { class: 'doors', role: 'group', 'aria-label': t('home.shelf.label') }, ...doors.map(d => d.el), soon);

    // ---- Walking the shelf without a finger: two arrows at its ends (shown where there is a pointer that hovers),
    //      and the left and right keys while a door has the focus. ----
    const calmScroll = (): ScrollBehavior => (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
    const walk = (dir: -1 | 1): void => {
        if (typeof doorsEl.scrollBy === 'function') doorsEl.scrollBy({ left: dir * Math.max(240, doorsEl.clientWidth * 0.7), behavior: calmScroll() });
    };
    const arrow = (dir: -1 | 1): HTMLButtonElement =>
        h('button', { type: 'button', class: `shelf-arrow shelf-arrow--${dir < 0 ? 'prev' : 'next'}`, 'aria-label': t(dir < 0 ? 'home.shelf.prev' : 'home.shelf.next'), onclick: () => walk(dir) }, h('span', { class: 'shelf-chevron', 'aria-hidden': 'true' }));
    const prev = arrow(-1), next = arrow(1);
    /** An arrow is offered only when there is more shelf that way. */
    const ends = (): void => {
        const max = doorsEl.scrollWidth - doorsEl.clientWidth;
        prev.hidden = doorsEl.scrollLeft <= 4;
        next.hidden = max <= 4 || doorsEl.scrollLeft >= max - 4;
    };
    doorsEl.addEventListener('scroll', ends, { passive: true });
    doorsEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        // Only the doors that are on the shelf now: a filter takes some off.
        const inView = doors.filter(d => !d.el.hidden);
        const at = inView.findIndex(d => d.btn === document.activeElement);
        if (at < 0) return;
        const to = inView[at + (e.key === 'ArrowRight' ? 1 : -1)];
        if (!to) return;
        e.preventDefault();
        to.btn.focus({ preventScroll: true });
        if (typeof to.el.scrollIntoView === 'function') to.el.scrollIntoView({ behavior: calmScroll(), inline: 'center', block: 'nearest' });
    });

    /**
     * Give a door its live scene (again, when it already has one). The wrappers' scenes are fetched the first time
     * one is needed; until then the door keeps its picture. Asked again before they arrive, it is mounted once.
     */
    function remount(d: Door): void {
        d.want = true;
        const ask = ++d.asked;
        void fullWrapper(d.def.id).then(full => {
            if (disposed || !d.want || ask !== d.asked || full === undefined) return;
            d.card.destroy();
            d.card = stageCard(full);
            d.live = true;
            d.art.replaceChildren(d.card.el);
            // The scene is what "watch it open" plays, and the wrapper's own tune is part of the page it dresses.
            if (worn === d.def.id) {
                applyTheme(full);
                if (playBtn) playBtn.hidden = !d.card.handle;
            }
        });
    }
    /** Take a door's scene down: back to its picture. */
    function rest(d: Door): void {
        d.want = false;
        d.asked++;
        if (!d.live) return;
        d.card.destroy();
        d.card = still(d.def);
        d.live = false;
        d.art.replaceChildren(d.card.el);
    }

    /** Put a wrapper on (or take it off: `null` shows the whole shelf). */
    function wear(id: string | null): void {
        if (id === worn) return;
        const apply = (): void => {
            if (previewing) {
                const was = doors.find(d => d.def.id === worn);
                if (was) remount(was);
                previewing = false;
                score.stop();
            }
            worn = id;
            if (id) chooseWrapper(id);
            view = 'shelf';
            sync();
            cue.touch();
        };
        // The skin changes at once. A transition over the whole page costs a snapshot of all of it, twice.
        apply();
    }

    /** What the network said of each remembered gift, asked once while this page is up. */
    const sentStates = new Map<string, Promise<PackageState>>();
    // The sent list's questions to the chain wait their turn: a few at once, however many cards the page has.
    let reading = 0;
    const waiting: (() => void)[] = [];
    function inTurn<T>(ask: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const run = (): void => {
                reading++;
                ask().then(resolve, reject).finally(() => {
                    reading--;
                    waiting.shift()?.();
                });
            };
            if (reading < SENT_READS_AT_ONCE) run();
            else waiting.push(run);
        });
    }

    // ---- The counter ----
    const body = h('div', { class: 'home-body' });
    const cap = makeCapsule([body], 'home');

    /**
     * The counter's cards, under the way to wrap a gift: what is mine here, how it works, what to remember,
     * and what is not built yet. Each opens its page; nothing unfinished stands level with what works.
     */
    function cards(): HTMLElement {
        const open = (v: View, key: Key, cls = 'btn btn-quiet btn-small home-tab') =>
            h(
                'button',
                {
                    type: 'button',
                    class: cls,
                    onclick: () => {
                        view = v;
                        // A list is opened at its first page, where the newest gift is.
                        if (v === 'kept' || v === 'sent') listPage[v] = 0;
                        renderBody();
                    },
                },
                t(key),
            );
        const card = (title: string, ...content: (Node | null)[]) => h('section', { class: 'home-card' }, h('h2', { class: 'label home-card-title' }, title), ...content);
        const mine = loadKept().length > 0 || loadSent().length > 0;
        return h(
            'nav',
            { class: 'home-cards', 'aria-label': t('home.nav.label') },
            // Only for someone who kept something here: nobody else sees the card.
            mine
                ? card(
                      t('home.card.mine'),
                      h('div', { class: 'home-card-row' }, loadKept().length > 0 ? open('kept', 'kept.nav') : null, loadSent().length > 0 ? open('sent', 'sent.nav') : null),
                  )
                : null,
            card(
                t('home.how.title'),
                h('ol', { class: 'home-brief' }, h('li', null, t('home.how.1.t')), h('li', null, t('home.how.2.t')), h('li', null, t('home.how.3.t'))),
                // Buying a wrapper runs now: its page sits with how the thing works, not with what is to come.
                h('div', { class: 'home-card-row' }, open('how', 'home.nav.how'), open('market', 'home.nav.market')),
            ),
            card(
                t('home.card.safe'),
                h('ul', { class: 'home-points' }, h('li', null, t('create.truth.1')), h('li', null, t('create.truth.2')), h('li', null, t('home.about.4'))),
                h('div', { class: 'home-card-row' }, open('about', 'home.nav.about')),
            ),
            h('section', { class: 'home-card home-card--soon' }, h('h2', { class: 'label home-card-title' }, t('home.soon')), h('div', { class: 'home-card-row' }, open('workshop', 'home.nav.workshop'))),
        );
    }

    function go(): void {
        chooseWrapper(worn ?? chosenWrapper());
        ctx.nav.toCreate();
    }

    /** The heart of the wrapper that is worn. */
    function favButton(def: ShelfDef): HTMLElement {
        const on = isFav(def.id);
        const b = h('button', { type: 'button', class: 'home-fav', 'aria-pressed': String(on), 'aria-label': t(on ? 'home.fav.remove' : 'home.fav.add') }, heart());
        b.addEventListener('click', () => {
            toggleFav(def.id);
            cue.touch();
            // A heart taken off under the hearts-only filter may leave nothing: an empty shelf helps nobody.
            if (narrow.fav && countOf(narrow) === 0) narrow = { ...narrow, fav: false };
            sync();
        });
        return b;
    }
    /**
     * The filter: one closed line under the main button, for whoever wants it. Opened, it offers hearts only
     * (not offered until there is a heart), holiday wrappers only, and free or paid. A choice that would leave
     * the shelf empty cannot be pressed.
     */
    const filterMark = (): SVGElement =>
        svg(
            'svg',
            { viewBox: '0 0 24 24', width: 18, height: 18, class: 'home-filter-mark', 'aria-hidden': 'true', focusable: 'false' },
            svg('path', { d: 'M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' }),
            svg('circle', { cx: 15, cy: 7, r: 2, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }),
            svg('circle', { cx: 9, cy: 12, r: 2, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }),
            svg('circle', { cx: 17, cy: 17, r: 2, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }),
        );
    function shelfFilter(): HTMLElement {
        const favs: ReadonlySet<string> = new Set(loadFavs());
        // The panel is built again on every press: the switch that was pressed gets the focus back, by its name.
        const set = (next: Narrow, name: string): void => {
            narrow = next;
            cue.touch();
            sync();
            body.querySelector<HTMLElement>(`[data-switch="${name}"]`)?.focus({ preventScroll: true });
        };
        const chip = (name: string, label: Node | string, on: boolean, next: Narrow, cls = ''): HTMLButtonElement => {
            const b = h('button', { type: 'button', class: `chip home-filter-chip${cls}`, 'aria-pressed': String(on), 'data-switch': name }, label);
            // Pressing what is already on (for a switch) always works; anything else must leave a wrapper on the shelf.
            b.disabled = !on && countOf(next, favs) === 0;
            b.addEventListener('click', () => set(next, name));
            return b;
        };
        const hearts = loadFavs().filter(id => wrapperById(id) !== undefined).length;
        const favChip =
            hearts === 0
                ? null
                : chip('fav', h('span', { class: 'home-filter-fav' }, heart(), h('span', null, t('home.fav.only', { n: String(hearts) }))), narrow.fav, { ...narrow, fav: !narrow.fav }, ' home-fav-only');
        const price = (p: Price, key: Key): HTMLButtonElement => chip(p, t(key), narrow.price === p, { ...narrow, price: p });
        const on = narrowed();
        const names = [narrow.fav ? t('home.fav.only', { n: String(hearts) }) : '', narrow.holiday ? t('home.filter.holiday') : '', narrow.price === 'free' ? t('home.price.free') : narrow.price === 'paid' ? t('home.filter.paid') : ''].filter(x => x !== '');
        const clear = h('button', { type: 'button', class: 'chip home-filter-clear', onclick: () => set({ fav: false, holiday: false, price: 'all' }, 'all') }, t('home.filter.clear'));
        // What is on the shelf now: what fits, and the wrapper that is worn even when it does not.
        const inView = doors.filter(d => !d.el.hidden).length;
        const el = fold(
            // A small mark of three sliders before the words, so the line is seen for what it is.
            [filterMark(), h('span', { class: 'home-filter-word' }, t('home.filter')), ...(on ? [h('span', { class: 'home-filter-on' }, names.join(', '))] : [])],
            { id: 'home.filter', still: true },
            h('div', { class: 'chips home-filter-row' }, favChip, chip('holiday', t('home.filter.holiday'), narrow.holiday, { ...narrow, holiday: !narrow.holiday })),
            h('div', { class: 'chips home-filter-row', role: 'group', 'aria-label': t('home.filter.price') }, price('all', 'home.filter.any'), price('free', 'home.price.free'), price('paid', 'home.filter.paid')),
            h('div', { class: 'home-filter-foot', hidden: !on }, h('p', { class: 'note home-filter-shown', 'aria-live': 'polite' }, t('home.filter.shown', { n: String(inView), total: String(WRAPPERS.length) })), clear),
        );
        el.classList.add('home-filter');
        return el;
    }

    function shelf(): Node[] {
        const def = worn ? wrapperById(worn) : undefined;
        if (!def) {
            return [
                h('h1', { class: 'home-title' }, ...rich('home.title')),
                h('p', { class: 'lead' }, t('home.lead')),
                h('p', { class: 'guide home-hint' }, ribbon('bow'), h('span', null, t('home.hint'))),
                h('button', { type: 'button', class: 'btn btn-primary home-go', onclick: go }, t('home.go')),
                shelfFilter(),
                cards(),
            ];
        }
        const door = doors.find(d => d.def.id === def.id)!;
        const n = WRAPPERS.findIndex(w => w.id === def.id) + 1;
        const name = h('h1', { class: 'home-name' });
        setUserText(name, inLang(def.name, lang));
        const blurb = h('p', { class: 'home-blurb' });
        setUserText(blurb, (def.blurb ? inLang(def.blurb, lang) : ''));
        const by = h('span', { class: 'home-by' });
        setUserText(by, t('home.by', { credit: def.credit ?? DEFAULT_CREDIT }));
        // "Watch it open": a button in its own right, smaller than the one that wraps a gift. Its mark is a play
        // triangle, and a square while the opening is on show (a press then puts the wrapper back).
        const playText = h('span', null, previewing ? t('home.preview.reset') : t('home.preview.play'));
        const playMark = svg('svg', { viewBox: '0 0 24 24', width: 16, height: 16, class: 'home-play-mark', 'aria-hidden': 'true', focusable: 'false' }, svg('path', { class: 'home-play-go', d: 'M8 5.5v13l11-6.5z' }), svg('path', { class: 'home-play-back', d: 'M7 7h10v10H7z' }));
        const play = h('button', { type: 'button', class: 'home-play', 'data-on': previewing ? 'yes' : 'no' }, playMark, playText);
        play.hidden = !door.card.handle;
        playBtn = play;
        play.addEventListener('click', () => {
            if (previewing) {
                // Back to the closed wrapper, idle loop and all: a fresh stage. Its tune ends with it.
                score.stop();
                remount(door);
                previewing = false;
            } else {
                previewing = true;
                cue.open();
                void door.card.handle?.open().catch(() => {});
            }
            playText.textContent = previewing ? t('home.preview.reset') : t('home.preview.play');
            play.dataset.on = previewing ? 'yes' : 'no';
        });
        return [
            // The number is the wrapper's place on the whole shelf: it is left out while the shelf is narrowed.
            h('p', { class: 'label home-kicker' }, h('span', null, narrowed() ? '' : t('home.index', { n, total: WRAPPERS.length })), h('span', { class: 'home-kicker-end' }, favButton(def), h('span', { class: 'home-price' }, price(def)))),
            name,
            def.blurb ? blurb : null,
            h('button', { type: 'button', class: 'btn btn-primary home-go', onclick: go }, t('home.use')),
            h('div', { class: 'home-row' }, play, h(
                    'button',
                    {
                        type: 'button',
                        class: 'btn btn-quiet home-all',
                        // The whole shelf is the whole shelf: a filter that is on goes off with it.
                        onclick: () => {
                            narrow = { fav: false, holiday: false, price: 'all' };
                            wear(null);
                        },
                    },
                    t('home.all'),
                ), by),
            shelfFilter(),
            cards(),
        ].filter((x): x is HTMLElement => x !== null);
    }

    function page(title: string, ...content: (Node | null)[]): Node[] {
        const back = h(
            'button',
            {
                type: 'button',
                class: 'btn btn-quiet home-back',
                onclick: () => {
                    view = 'shelf';
                    renderBody();
                },
            },
            h('span', { 'aria-hidden': 'true' }, '← '),
            t('home.back'),
        );
        return [back, h('h1', { class: 'home-title' }, title), ...content.filter((x): x is Node => x !== null)];
    }

    function how(): Node[] {
        const step = (n: number, title: Key, text: Key) =>
            h('li', { class: 'home-step' }, h('span', { class: 'home-step-n', 'aria-hidden': 'true' }, String(n)), h('div', null, h('h2', null, t(title)), h('p', null, t(text))));
        return page(
            t('home.how.title'),
            h('ol', { class: 'home-steps' }, step(1, 'home.how.1.t', 'home.how.1.b'), step(2, 'home.how.2.t', 'home.how.2.b'), step(3, 'home.how.3.t', 'home.how.3.b')),
            h('ul', { class: 'truths' }, h('li', null, t('create.truth.1')), h('li', null, t('create.truth.2'))),
            h('button', { type: 'button', class: 'btn btn-primary home-go', onclick: go }, worn ? t('home.use') : t('home.go')),
        );
    }

    function about(): Node[] {
        return page(
            t('home.about.title'),
            h('ul', { class: 'home-points' }, h('li', null, t('home.about.1')), h('li', null, ...rich('home.about.2')), h('li', null, ...rich('home.about.3')), h('li', null, t('home.about.4'))),
            h('div', { class: 'home-small' }, h('span', null, t('app.footer.2')), h('span', null, ...rich('app.footer.3'))),
        );
    }

    /** The theme being worn, laid out as what it is: five colours and four choices. */
    function anatomy(): HTMLElement {
        const def = worn ? wrapperById(worn) : undefined;
        const tk = themeTokens(def);
        const sw = (hex: string) => {
            const el = h('span', { class: 'home-sw', title: hex });
            el.style.setProperty('--sw', hex);
            return el;
        };
        const row = (label: Key, value: string) => h('div', { class: 'home-spec' }, h('dt', null, t(label)), h('dd', null, value));
        return h(
            'div',
            { class: 'home-anatomy' },
            h('p', { class: 'label' }, t('home.workshop.theme')),
            def ? null : h('p', { class: 'note' }, t('home.workshop.none')),
            h(
                'dl',
                { class: 'home-specs' },
                h('div', { class: 'home-spec' }, h('dt', null, t('home.theme.colours')), h('dd', { class: 'home-sws' }, sw(tk.ground), sw(tk.surface), sw(tk.ink), sw(tk.accent), sw(tk.onAccent))),
                row('home.theme.material', t(`theme.material.${tk.material}` as Key)),
                row('home.theme.corner', t(`theme.corner.${tk.corner}` as Key)),
                row('home.theme.face', t(`theme.face.${tk.face}` as Key)),
                row('home.theme.voice', t(`theme.voice.${tk.voice}` as Key)),
            ),
        );
    }

    function workshop(): Node[] {
        return page(
            t('home.workshop.title'),
            h('p', null, t('home.workshop.1')),
            anatomy(),
            h('p', { class: 'home-status' }, h('span', { class: 'home-soon' }, t('home.soon')), h('span', null, t('home.workshop.2'))),
        );
    }

    function market(): Node[] {
        return page(
            t('home.market.title'),
            h('ul', { class: 'home-points' }, h('li', null, t('home.market.1')), h('li', null, t('home.market.2')), h('li', null, t('home.market.3'))),
            h('p', { class: 'note' }, t('home.market.status')),
        );
    }

    /** The page in view of each list, kept in range: removing the last card of the last page steps back one. */
    function pageAt(which: 'kept' | 'sent', count: number): number {
        listPage[which] = Math.max(0, Math.min(listPage[which], Math.ceil(count / PAGE_ROWS) - 1));
        return listPage[which];
    }
    /** "Previous · page 2 of 7 · Next", or nothing for a list that fits on one page. */
    function pager(which: 'kept' | 'sent', count: number): HTMLElement | null {
        const pages = Math.ceil(count / PAGE_ROWS);
        if (pages <= 1) return null;
        const at = listPage[which];
        const go = (to: number) => (): void => {
            listPage[which] = to;
            renderBody();
            // The new page starts at its top; the keyboard stays at the pager, which says the page out loud.
            (body.querySelector('.pager-at') as HTMLElement | null)?.focus({ preventScroll: true });
            // Only the capsule's own scroller moves: nothing around it is shifted.
            const scroller = body.closest('.cap-scroll') as HTMLElement | null;
            if (scroller) scroller.scrollTop = 0;
        };
        return h(
            'nav',
            { class: 'pager', 'aria-label': t('list.pager') },
            h('button', { type: 'button', class: 'btn btn-quiet btn-small pager-prev', disabled: at === 0, onclick: go(at - 1) }, t('list.prev')),
            // Figures only, so the row fits a narrow screen in every language; the words are there for a screen reader.
            h('span', { class: 'pager-at label', tabindex: '-1', role: 'status', 'aria-label': t('list.page', { p: at + 1, n: pages }) }, `${at + 1}/${pages}`),
            h('button', { type: 'button', class: 'btn btn-quiet btn-small', disabled: at >= pages - 1, onclick: go(at + 1) }, t('list.next')),
        );
    }

    /** The gifts kept in this browser. Every word in a record is a stranger's text. */
    function kept(): Node[] {
        const all = loadKept();
        const at = pageAt('kept', all.length);
        const list = all.slice(at * PAGE_ROWS, (at + 1) * PAGE_ROWS);
        const cards = list.map(k => {
            const plain = wrapperById(k.wrapper);
            const name = nameOf(plain);
            const card = h('li', { class: 'kept-card' });
            // The wrapper's still picture, made ready before any press: the download itself must not wait. The record
            // wears what the gift wore, so the full definition is fetched and dressed in the record's look first.
            let look: KeepsakeLook | null = null;
            const dressedDef = plain
                ? Promise.all([loadWrappers(), import('../../wrappers/looks')]).then(([m, looks]) => {
                      const full = m.wrapperById(k.wrapper);
                      return full ? looks.dressed(full, k.dress) : undefined;
                  })
                : Promise.resolve(undefined);
            void dressedDef.then(keepsakeLook).then(
                l => (look = l),
                () => {
                    /* no picture: the download carries the words alone */
                },
            );
            if (k.wish) {
                const wish = h('blockquote', { class: 'wish-text kept-wish' });
                setUserText(wish, k.wish);
                card.append(wish);
            }
            const line = h('p', { class: 'kept-line' }, h('span', { class: 'kept-amount' }, `${formatXec(BigInt(k.sats), lang)} XEC`));
            if (k.token) {
                const tk = h('span', { class: 'kept-token' });
                setUserText(tk, keptTokenText(k.token, lang));
                line.append(' · ', tk);
            }
            card.append(
                line,
                h('p', { class: 'note' }, [keptWhen(k, lang), name, `${t('gift.ref.label')} ${keptRef(k)}`, k.fee !== undefined ? `${t('kept.row.fee')}: ${formatXec(BigInt(k.fee), lang)} XEC` : ''].filter(x => x !== '').join(' · ')),
                h(
                    'div',
                    { class: 'btn-row' },
                    h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => void downloadKeepsake(k, lang, name, look) }, t('kept.download')),
                    h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn btn-quiet btn-small',
                            onclick: () => {
                                if (!window.confirm(t('kept.remove.confirm'))) return;
                                removeKept(k.ref);
                                if (loadKept().length === 0) view = 'shelf';
                                renderBody();
                            },
                        },
                        t('kept.remove'),
                    ),
                ),
            );
            return card;
        });
        return page(t('kept.page.title'), h('p', { class: 'note' }, t('kept.page.lead')), h('ul', { class: 'kept-list' }, ...cards), pager('kept', all.length), fold(t('kept.warn.sum'), { id: 'home.kept.warn' }, h('p', { class: 'note' }, t('kept.warn'))));
    }

    /**
     * The gifts this browser was asked to remember, each with what the network says of it now. A record holds
     * the package's address, never its link: nothing here can open a gift or take it back.
     */
    function sent(): Node[] {
        const list = loadSent();
        /** The batch a record belongs to, from its place ("3/9") and its time: gifts made by one press are a second apart at most. */
        const batchOf = (k: Sent): string | null => {
            const m = /^([1-9])\/([2-9])$/.exec(k.part ?? '');
            return m ? `${k.at - (Number(m[1]) - 1)}|${m[2]}|${k.wrapper}` : null;
        };
        const read = (address: string, fresh: boolean): Promise<PackageState> => {
            if (fresh) sentStates.delete(address);
            let p = sentStates.get(address);
            if (!p) {
                p = inTurn(() => ctx.chain.read(address));
                sentStates.set(address, p);
            }
            return p;
        };
        /** Gifts made together, as one card: how many are still there, and a line for each. */
        const group = (ks: readonly Sent[]): HTMLElement => {
            const sorted = [...ks].sort((a, b) => Number(a.part![0]) - Number(b.part![0]));
            const n = Number(sorted[0]!.part!.slice(2));
            const item = h('li', { class: 'kept-card sent-group' });
            if (sorted[0]!.wish) {
                const wish = h('blockquote', { class: 'wish-text kept-wish' });
                setUserText(wish, sorted[0]!.wish);
                item.append(wish);
            }
            const status = h('p', { class: 'status status--waiting' }, h('span', { class: 'status-dot', 'aria-hidden': 'true' }), h('span', null, ''));
            const readBtn = h('button', { type: 'button', class: 'btn btn-quiet btn-small', hidden: true, onclick: () => ask(true) }, t('sent.status.read'));
            const rows = sorted.map(k => {
                const who = h('span', { class: 'sent-row-who' });
                setUserText(who, k.name ?? t('people.nth', { n: Number(k.part![0]) }));
                const state = h('span', { class: 'sent-row-state' }, t('sent.row.unknown'));
                const el = h('li', { class: 'sent-row' }, h('span', { class: 'label sent-row-n' }, k.part!), who, h('span', { class: 'sent-row-amt mono' }, `${formatXec(BigInt(k.sats), lang)} XEC`), state, h('span', { class: 'sent-row-ref' }, explorerRef('address', k.address, shortId(k.address))));
                return { k, el, state };
            });
            const ask = (fresh: boolean): void => {
                status.lastElementChild!.textContent = t('sent.group.reading');
                status.className = 'status status--waiting';
                readBtn.hidden = true;
                // One after another: a batch is up to nine questions.
                void (async () => {
                    let there = 0;
                    let failed = false;
                    for (const r of rows) {
                        try {
                            const st = await read(r.k.address, fresh);
                            const kind = st.kind === 'taken' ? 'taken' : st.kind === 'funded' ? 'there' : 'empty';
                            if (kind === 'there') there++;
                            r.state.textContent = t(`sent.row.${kind}`);
                            r.el.dataset.state = kind;
                        } catch {
                            sentStates.delete(r.k.address);
                            failed = true;
                        }
                    }
                    if (failed) {
                        status.lastElementChild!.textContent = t('sent.status.error');
                        status.className = 'status status--bad';
                        readBtn.hidden = false;
                        return;
                    }
                    status.lastElementChild!.textContent = t('sent.group.left', { k: there, n: sorted.length });
                    status.className = 'status ' + (there > 0 ? 'status--ok' : 'status--waiting');
                })();
            };
            ask(false);
            item.append(
                h('p', { class: 'kept-line' }, t('sent.group.title', { n: sorted.length === n ? n : sorted.length })),
                status,
                readBtn,
                h('ul', { class: 'sent-rows' }, ...rows.map(r => r.el)),
                h('p', { class: 'note' }, [keptWhen(sorted[0]!, lang), nameOf(wrapperById(sorted[0]!.wrapper))].filter(x => x !== '').join(' · ')),
                h(
                    'div',
                    { class: 'btn-row' },
                    h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn btn-quiet btn-small',
                            onclick: () => {
                                if (!window.confirm(t('sent.group.forget.confirm', { n: sorted.length }))) return;
                                for (const k of sorted) {
                                    forgetSent(k.address);
                                    sentStates.delete(k.address);
                                }
                                if (loadSent().length === 0) view = 'shelf';
                                renderBody();
                            },
                        },
                        t('sent.group.forget'),
                    ),
                ),
            );
            return item;
        };
        const single = (k: Sent): HTMLElement => {
            const name = nameOf(wrapperById(k.wrapper));
            const item = h('li', { class: 'kept-card' });
            if (k.wish) {
                const wish = h('blockquote', { class: 'wish-text kept-wish' });
                setUserText(wish, k.wish);
                item.append(wish);
            }
            const status = h('p', { class: 'status' }, h('span', { class: 'status-dot', 'aria-hidden': 'true' }), h('span', null, ''));
            const say = (text: string, tone: 'ok' | 'unfinal' | 'bad' | 'waiting'): void => {
                status.lastElementChild!.textContent = text;
                for (const x of ['ok', 'unfinal', 'bad', 'waiting']) status.classList.toggle('status--' + x, x === tone);
            };
            const readBtn = h('button', { type: 'button', class: 'btn btn-quiet btn-small', hidden: true, onclick: () => ask(true) }, t('sent.status.read'));
            const show = (st: PackageState): void => {
                readBtn.hidden = true;
                const amount = formatXec(st.xecSats, lang);
                if (st.kind === 'taken') say(t('sent.status.taken') + (st.takenAt ? ' ' + t('pkg.taken.at', { time: keptWhen({ at: st.takenAt * 1000 }, lang) }) : ''), 'waiting');
                else if (st.kind !== 'funded') say(t('sent.status.empty'), 'waiting');
                else if (!st.allFinal) say(t('sent.status.unfinal', { amount }), 'unfinal');
                else if (k.tokenOnly) say(t(st.hasToken ? 'sent.status.token' : 'sent.status.notoken', { amount }), st.hasToken ? 'ok' : 'unfinal');
                else if (st.xecSats < BigInt(k.sats)) say(t('sent.status.short', { amount, want: formatXec(BigInt(k.sats), lang) }), 'unfinal');
                else say(t(st.hasToken ? 'sent.status.token' : 'sent.status.funded', { amount }), 'ok');
            };
            // One read per gift for as long as this page is up: coming back to the list, or dropping an item, asks nothing again.
            const ask = (fresh: boolean): void => {
                const p = read(k.address, fresh);
                say(t('sent.status.reading'), 'waiting');
                readBtn.hidden = true;
                p.then(show, () => {
                    sentStates.delete(k.address);
                    say(t('sent.status.error'), 'bad');
                    readBtn.hidden = false;
                });
            };
            ask(false);
            item.append(
                h('p', { class: 'kept-line' }, h('span', { class: 'kept-amount' }, k.tokenOnly ? t('create.tokenonly') : `${formatXec(BigInt(k.sats), lang)} XEC`)),
                status,
                readBtn,
                // The giver's own name for it and its place in a batch come first: they are what tells nine gifts apart.
                h('p', { class: 'note' }, [k.name ?? '', k.part ?? '', keptWhen(k, lang), name, `${t('gift.ref.label')} `].filter(x => x !== '').join(' · '), explorerRef('address', k.address, shortId(k.address))),
                h(
                    'div',
                    { class: 'btn-row' },
                    h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn btn-quiet btn-small',
                            onclick: () => {
                                if (!window.confirm(t('sent.forget.confirm'))) return;
                                forgetSent(k.address);
                                sentStates.delete(k.address);
                                if (loadSent().length === 0) view = 'shelf';
                                renderBody();
                            },
                        },
                        t('sent.forget'),
                    ),
                ),
            );
            return item;
        };
        // Gifts made together stand as one card, where the first of them was in the list; the others one by one.
        const groups = new Map<string, Sent[]>();
        const order: (Sent | string)[] = [];
        for (const k of list) {
            const key = batchOf(k);
            if (key === null) order.push(k);
            else {
                if (!groups.has(key)) {
                    groups.set(key, []);
                    order.push(key);
                }
                groups.get(key)!.push(k);
            }
        }
        // Only the cards of the page in view are built, and only they are asked about: a long list is not a flood of
        // requests. Gifts made together are one card, however many they are.
        const at = pageAt('sent', order.length);
        const items = order.slice(at * PAGE_ROWS, (at + 1) * PAGE_ROWS).map(x => {
            if (typeof x !== 'string') return single(x);
            const ks = groups.get(x)!;
            return ks.length > 1 ? group(ks) : single(ks[0]!);
        });
        return page(t('sent.page.title'), h('p', { class: 'note' }, t('sent.page.lead')), h('ul', { class: 'kept-list' }, ...items), pager('sent', order.length), fold(t('sent.warn.sum'), { id: 'home.sent.warn' }, h('p', { class: 'note' }, t('sent.warn'))));
    }

    function renderBody(): void {
        const nodes = view === 'kept' ? kept() : view === 'sent' ? sent() : view === 'how' ? how() : view === 'about' ? about() : view === 'workshop' ? workshop() : view === 'market' ? market() : shelf();
        body.replaceChildren(...nodes);
        body.dataset.view = view;
    }

    /**
     * Whole still or its cut? The cut is the middle 30% of the scene. A door wider than that (few doors on the
     * shelf, or a screen so short that the scene itself is small) shows the whole still instead.
     */
    function fitStills(): void {
        const shown = doors.filter(d => !d.el.hidden);
        const one = shown.find(d => d.el.dataset.state === 'even');
        const sceneW = one ? one.art.getBoundingClientRect().width : 0;
        const wide = one !== undefined && sceneW > 0 && one.el.getBoundingClientRect().width > sceneW * 0.3 - 1;
        const next = shown.length <= 5 || wide;
        if (next === roomy) return;
        roomy = next;
        for (const d of doors) {
            const img = d.live ? null : d.art.querySelector<HTMLElement>('img.door-still');
            if (img) dressStill(img, d.def);
        }
    }
    window.addEventListener('resize', fitStills);

    /** Doors, theme and counter, from `worn`. */
    function sync(): void {
        const def = worn ? wrapperById(worn) : undefined;
        doorsEl.dataset.worn = worn ? 'yes' : 'no';
        const favs = new Set(loadFavs());
        const some = narrowed();
        doorsEl.dataset.narrowed = some ? 'yes' : 'no';
        // The door that stands for wrappers to come is not one of any kind.
        soon.hidden = some;
        for (const d of doors) {
            const on = d.def.id === worn;
            d.el.dataset.state = worn === null ? 'even' : on ? 'open' : 'spine';
            const fav = favs.has(d.def.id);
            d.el.dataset.fav = fav ? 'yes' : 'no';
            // Under a filter only what fits stays on the shelf, and the wrapper that is worn whatever it is.
            d.el.hidden = some && !on && !fits(d.def, narrow, favs);
            d.btn.setAttribute('aria-pressed', String(on));
            // The door that is worn is always mounted: its scene is what "see it open" plays.
            if (on && !d.live) remount(d);
            else if (!on) rest(d);
        }
        fitStills();
        applyTheme(def);
        setAmbient(def);
        renderBody();
        // The shelf runs on sideways: the door just touched is put in the middle of it, at once. The doors
        // change width in one step and the shelf is moved in the same step, so nothing slides across the
        // view on the way (a door that slides through is mounted for nothing, and the page stutters).
        const open = doors.find(d => d.def.id === worn);
        if (open) {
            const left = open.el.offsetLeft - (doorsEl.clientWidth - open.el.offsetWidth) / 2;
            if (typeof doorsEl.scrollTo === 'function') doorsEl.scrollTo({ left: Math.max(0, left), behavior: 'instant' as ScrollBehavior });
            else doorsEl.scrollLeft = Math.max(0, left);
        }
        ends();
    }

    ends();
    requestAnimationFrame(ends);
    root.append(h('section', { class: 'screen screen-home' }, h('div', { class: 'layout layout--home' }, doorsEl, prev, next, cap.el)));
    sync();
    // The list of gifts sent says what the chain said when it was asked. Come back to after a while out of sight
    // (a phone that slept), it asks again: what was read before is forgotten and the list is drawn anew.
    let awayAt: number | undefined;
    const onSight = (): void => {
        if (document.visibilityState === 'hidden') {
            awayAt ??= Date.now();
            return;
        }
        const away = awayAt === undefined ? 0 : Date.now() - awayAt;
        awayAt = undefined;
        if (away < SENT_STALE_MS) return;
        // Forgotten whatever is on screen, so the list opened later asks afresh too.
        sentStates.clear();
        if (view === 'sent') renderBody();
    };
    document.addEventListener('visibilitychange', onSight);
    return () => {
        disposed = true;
        document.removeEventListener('visibilitychange', onSight);
        score.stop();
        window.removeEventListener('resize', fitStills);
        for (const d of doors) d.card.destroy();
    };
}
