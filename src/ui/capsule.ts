/**
 * The capsule: the one object that carries the whole interface, floating over
 * the gift. It takes the height of what it holds and morphs when that changes
 * (a pill when there is one thing to do, a card when there is something to
 * read, a sheet when there is a job to finish). Past a limit it scrolls inside
 * itself; the grabber lifts that limit. The page behind it never scrolls.
 *
 * It also tells the page how tall it is (`--cap-h`), so the gift can stand in
 * the room that is left, and it stays above an on-screen keyboard.
 */
import { h } from './dom';
import { isBusy, onBusyChange } from './busy';
import { cue, wake } from './sound';

/** What counts as a control under the finger: it answers with a small sound once sound is awake. */
const CONTROL = 'button, summary, [role="radio"], input[type="checkbox"], .slide';

export interface Capsule {
    readonly el: HTMLElement;
    readonly inner: HTMLElement;
    destroy(): void;
}

/** The height the capsule takes: its content plus chrome, up to the limit. Pure. */
export function capsuleHeight(content: number, chrome: number, limit: number): number {
    const want = Math.max(0, Math.ceil(content)) + Math.max(0, chrome);
    return Math.max(0, Math.min(want, Math.floor(limit)));
}

const live = new Set<Capsule>();
/** Tear down every capsule on the page (the app calls this before it paints a new screen). */
export function destroyCapsules(): void {
    for (const c of [...live]) c.destroy();
    live.clear();
}

export function makeCapsule(children: (Node | null | undefined | false)[], kind?: string): Capsule {
    const inner = h('div', { class: 'cap-inner' });
    for (const c of children) if (c) inner.append(c);
    // The grabber exists only while there is more than fits: a screen with nothing to do has no control at all.
    const grab = h('button', { type: 'button', class: 'cap-grab', 'aria-label': '⇕' }, h('span', { 'aria-hidden': 'true' }));
    const scroller = h('div', { class: 'cap-scroll' }, inner);
    // The clasp: the theme's own lock on the capsule's rim (drawn by the stylesheet, per material). Decoration only.
    const clasp = h('span', { class: 'cap-clasp', 'aria-hidden': 'true' });
    const el = h('div', { class: 'capsule layout-body' + (kind ? ' capsule--' + kind : '') }, scroller, clasp);
    const root = document.documentElement;
    let tall = false;
    let first = true;
    let raf = 0;

    const limit = (): number => {
        const vv = window.visualViewport;
        const vh = vv ? vv.height : window.innerHeight || 800;
        const wide = typeof matchMedia === 'function' && matchMedia('(min-width: 960px)').matches;
        return vh * (wide ? 0.86 : tall ? 0.9 : 0.6);
    };

    function measure(): void {
        raf = 0;
        const content = inner.offsetHeight;
        if (content === 0 && !inner.isConnected) return;
        const lim = limit();
        const chrome = grab.isConnected ? grab.offsetHeight : 0;
        const hgt = capsuleHeight(content, chrome, lim);
        // Something to scroll, or lifted: the grabber shows so the limit can be changed.
        // On a wide screen the capsule has one limit only, so there is nothing for a grabber to change.
        const wide = typeof matchMedia === 'function' && matchMedia('(min-width: 960px)').matches;
        const overflow = !wide && content + chrome > vhLimit(false) + 1;
        if (grab.isConnected !== overflow) {
            if (overflow) el.insertBefore(grab, scroller);
            else grab.remove();
            return schedule();
        }
        el.classList.toggle('is-scroll', content + chrome > lim + 1);
        if (first) {
            // No morph on the first paint: the capsule appears at its size.
            el.classList.add('no-morph');
            el.style.setProperty('height', `${hgt}px`);
            void el.offsetHeight;
            el.classList.remove('no-morph');
            first = false;
        } else el.style.setProperty('height', `${hgt}px`);
        root.style.setProperty('--cap-h', `${hgt}px`);
    }
    function vhLimit(isTall: boolean): number {
        const keep = tall;
        tall = isTall;
        const v = limit();
        tall = keep;
        return v;
    }
    function schedule(): void {
        if (raf !== 0) return;
        raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(measure) : (setTimeout(measure, 0) as unknown as number);
    }

    grab.addEventListener('click', () => {
        tall = !tall;
        el.classList.toggle('is-tall', tall);
        schedule();
    });
    // A job to finish (a panel opened inside): lift the limit and bring the job into view.
    el.addEventListener('cap:show', e => {
        const target = e.target instanceof HTMLElement ? e.target : null;
        if (!tall) {
            tall = true;
            el.classList.add('is-tall');
            schedule();
        }
        if (!target || target === el) return;
        setTimeout(() => {
            const top = target.offsetTop - 14;
            if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ top: Math.max(0, top), behavior: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
            else scroller.scrollTop = Math.max(0, top);
        }, 380);
    });

    // Sound begins here and nowhere else: the first touch on the capsule wakes it, inside that press.
    const onTouch = (e: Event): void => {
        const wasOn = wake();
        const target = e.target instanceof Element ? e.target : null;
        // The touch that wakes sound is itself heard; after that, only presses on controls are.
        if (!wasOn || target?.closest(CONTROL)) cue.touch();
    };
    const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') onTouch(e);
    };
    el.addEventListener('pointerdown', onTouch, true);
    // A touch only counts as the person's gesture when the finger lifts: wake (or resume) again there.
    const onLift = (): void => void wake();
    el.addEventListener('pointerup', onLift, true);
    el.addEventListener('click', onLift, true);
    el.addEventListener('keydown', onKey, true);

    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    ro?.observe(inner);
    const onViewport = (): void => {
        // Stay above an on-screen keyboard: the visual viewport is what is really visible.
        const vv = window.visualViewport;
        if (vv) root.style.setProperty('--kb', `${Math.max(0, (window.innerHeight || vv.height) - vv.height - vv.offsetTop)}px`);
        schedule();
    };
    window.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('scroll', onViewport);
    const offBusy = onBusyChange(() => el.classList.toggle('is-busy', isBusy()));
    el.classList.toggle('is-busy', isBusy());
    schedule();

    const cap: Capsule = {
        el,
        inner,
        destroy() {
            live.delete(cap);
            ro?.disconnect();
            offBusy();
            window.removeEventListener('resize', onViewport);
            window.visualViewport?.removeEventListener('resize', onViewport);
            window.visualViewport?.removeEventListener('scroll', onViewport);
            if (raf !== 0 && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
        },
    };
    live.add(cap);
    return cap;
}
