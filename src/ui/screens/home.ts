import { rich } from '../ecash';
import { downloadKeepsake, forgetSent, keptRef, keptTokenText, keptWhen, loadKept, loadSent, removeKept } from '../kept';
import { dressed } from '../../wrappers/looks';
import { keepsakeLook } from '../keepsakeArt';
import type { KeepsakeLook } from '../keepsakeArt';
import { WRAPPERS, isHoliday, offerOf, wrapperById, inLang } from '../../wrappers';
import { doorUrl, thumbUrl } from '../../wrappers/artUrl';
import { formatXec } from '../../core/money';
import type { PackageState } from '../../core';
import type { WrapperDef } from '../../stage';
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
/** How many remembered gifts the "sent" page asks the network about at once. */
const SENT_READ_MAX = 6;

let worn: string | null = null;
let view: View = 'shelf';

/** For tests. */
export function resetHome(): void {
    worn = null;
    view = 'shelf';
}

interface Door {
    readonly def: WrapperDef;
    readonly el: HTMLElement;
    readonly art: HTMLElement;
    readonly btn: HTMLButtonElement;
    card: StageCard;
    /** The door's scene is mounted. A door far along the shelf has none: twenty-four scenes at once is more than a phone should run. */
    live: boolean;
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
    /** The price on a door and on the counter: what the shelf says the wrapper costs to send with. */
    const price = (def: WrapperDef): string => {
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
    const fits = (def: WrapperDef, f: Narrow, favs: ReadonlySet<string>): boolean =>
        (!f.fav || favs.has(def.id)) && (!f.holiday || isHoliday(def)) && (f.price === 'all' || (offerOf(def).kind === 'free') === (f.price === 'free'));
    const countOf = (f: Narrow, favs: ReadonlySet<string> = new Set(loadFavs())): number => WRAPPERS.filter(def => fits(def, f, favs)).length;

    // ---- The doors ----
    // A door at rest is a small picture of its wrapper, closed (public/thumbs, drawn by scripts/og-cards.mjs): one
    // image, fetched when it nears the view. Only the door that is worn carries the live scene. A shelf of live
    // scenes is more than a phone's browser will hold.
    // A door is a narrow window onto the scene, so its picture is the middle of the still, cut out and sharper
    // (`doorUrl`). When few doors are on the shelf they grow wider than that cut: then the whole still is used.
    let roomy = false;
    const dressStill = (img: HTMLElement, def: WrapperDef): void => {
        img.className = roomy ? 'door-still' : 'door-still door-still--cut';
        img.setAttribute('src', roomy ? thumbUrl(def.id) : doorUrl(def.id));
    };
    const still = (def: WrapperDef): StageCard => {
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
        const tag = h('div', { class: 'door-tag', 'aria-hidden': 'true' }, name, h('span', { class: 'door-price' }, price(def)), h('span', { class: 'door-heart' }, heart()));
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
        return { def, el, art, btn, card, live: false };
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

    function remount(d: Door): void {
        d.card.destroy();
        d.card = stageCard(d.def);
        d.live = true;
        d.art.replaceChildren(d.card.el);
    }
    /** Take a door's scene down: back to its picture. */
    function rest(d: Door): void {
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
    function favButton(def: WrapperDef): HTMLElement {
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
            on ? [t('home.filter'), h('span', { class: 'home-filter-on' }, names.join(', '))] : t('home.filter'),
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
        const play = h('button', { type: 'button', class: 'btn btn-quiet home-play' }, previewing ? t('home.preview.reset') : t('home.preview.play'));
        play.hidden = !door.card.handle;
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
            play.textContent = previewing ? t('home.preview.reset') : t('home.preview.play');
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

    /** The gifts kept in this browser. Every word in a record is a stranger's text. */
    function kept(): Node[] {
        const list = loadKept();
        const cards = list.map(k => {
            const plain = wrapperById(k.wrapper);
            // The record wears what the gift wore.
            const def = plain ? dressed(plain, k.dress) : undefined;
            const name = nameOf(def);
            const card = h('li', { class: 'kept-card' });
            // The wrapper's still picture, made ready before any press: the download itself must not wait.
            let look: KeepsakeLook | null = null;
            void keepsakeLook(def).then(l => (look = l));
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
        return page(t('kept.page.title'), h('p', { class: 'note' }, t('kept.page.lead')), h('ul', { class: 'kept-list' }, ...cards), fold(t('kept.warn.sum'), { id: 'home.kept.warn' }, h('p', { class: 'note' }, t('kept.warn'))));
    }

    /**
     * The gifts this browser was asked to remember, each with what the network says of it now. A record holds
     * the package's address, never its link: nothing here can open a gift or take it back.
     */
    function sent(): Node[] {
        const list = loadSent();
        const items = list.map((k, i) => {
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
                if (fresh) sentStates.delete(k.address);
                let p = sentStates.get(k.address);
                if (!p) {
                    p = ctx.chain.read(k.address);
                    sentStates.set(k.address, p);
                }
                say(t('sent.status.reading'), 'waiting');
                readBtn.hidden = true;
                p.then(show, () => {
                    sentStates.delete(k.address);
                    say(t('sent.status.error'), 'bad');
                    readBtn.hidden = false;
                });
            };
            // The first few are asked about at once; the rest on a press, so a long list is not a flood of requests.
            if (i < SENT_READ_MAX || sentStates.has(k.address)) ask(false);
            else {
                say(t('sent.status.later'), 'waiting');
                readBtn.hidden = false;
            }
            item.append(
                h('p', { class: 'kept-line' }, h('span', { class: 'kept-amount' }, k.tokenOnly ? t('create.tokenonly') : `${formatXec(BigInt(k.sats), lang)} XEC`)),
                status,
                readBtn,
                // The giver's own name for it and its place in a batch come first: they are what tells nine gifts apart.
                h('p', { class: 'note' }, [k.name ?? '', k.part ?? '', keptWhen(k, lang), name, `${t('gift.ref.label')} ${k.address.slice(6, 10)}…${k.address.slice(-4)}`].filter(x => x !== '').join(' · ')),
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
        });
        return page(t('sent.page.title'), h('p', { class: 'note' }, t('sent.page.lead')), h('ul', { class: 'kept-list' }, ...items), fold(t('sent.warn.sum'), { id: 'home.sent.warn' }, h('p', { class: 'note' }, t('sent.warn'))));
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
    return () => {
        score.stop();
        window.removeEventListener('resize', fitStills);
        for (const d of doors) d.card.destroy();
    };
}
