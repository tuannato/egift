import { h } from './dom';
import type { Child } from './dom';
import { makeCapsule } from './capsule';

/**
 * The scene: the gift fills the screen, and one capsule floats over it with
 * everything else — a title if the screen has one, then its body. There is no
 * page under them and nothing to scroll but the capsule itself.
 */
export function layout(opts: { plate: HTMLElement; head?: Child[]; body: Child[]; kind?: string }): HTMLElement {
    const cls = 'layout' + (opts.kind ? ' layout--' + opts.kind : '');
    const parts: (Node | null)[] = [];
    if (opts.head && opts.head.length) parts.push(h('div', { class: 'layout-head' }, ...opts.head));
    for (const c of opts.body) {
        if (c === null || c === undefined || c === false) continue;
        parts.push(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    const cap = makeCapsule(parts, opts.kind);
    return h('div', { class: cls }, h('div', { class: 'layout-plate' }, opts.plate), cap.el);
}

/** A small uppercase label in the mono face. */
export function label(text: string, props: Record<string, unknown> = {}): HTMLElement {
    return h('p', { class: 'label', ...props }, text);
}

/** A numbered row of a real sequence: `01`, `02`. Nothing else is numbered. */
export function stepRow(n: number, title: string, ...body: Child[]): HTMLElement {
    return h(
        'section',
        { class: 'step' },
        h('div', { class: 'step-head' }, h('span', { class: 'step-num', 'aria-hidden': 'true' }, String(n).padStart(2, '0')), h('h2', { class: 'step-title' }, title)),
        h('div', { class: 'step-body stack' }, ...body),
    );
}

/** Mark an element to fade up once. The class leaves after the first run, so re-inserting it does not replay. */
export function enter(el: HTMLElement, delayMs = 0): HTMLElement {
    el.classList.add('enter');
    if (delayMs) el.style.setProperty('--enter-delay', `${delayMs}ms`);
    el.addEventListener('animationend', function done(e) {
        if (e.target !== el) return;
        el.classList.remove('enter');
        el.removeEventListener('animationend', done);
    });
    return el;
}

/** Which folds the person opened, by id. Memory only: a language change repaints the screen, and an opened fold must come back open. */
const foldOpen = new Map<string, boolean>();
/** Forget every fold's state (tests). */
export function resetFolds(): void {
    foldOpen.clear();
}

export interface FoldOpts {
    /** Names the fold across repaints: with it, the state the person left it in is kept (in memory, never in storage). */
    id?: string;
    /** Open from the start, unless the person closed it. */
    open?: boolean;
}

/**
 * A block behind one line: pressed, it opens. The browser's own `<details>`, so it works from the keyboard and
 * is read out as what it is. Never for a warning: what must be read is not put behind a press.
 */
export function fold(summary: Child | Child[], opts: FoldOpts | null, ...children: Child[]): HTMLDetailsElement {
    const id = opts?.id;
    let was = (id !== undefined ? foldOpen.get(id) : undefined) ?? opts?.open === true;
    const el = h(
        'details',
        { class: 'fold', open: was },
        h('summary', { class: 'fold-sum' }, ...(Array.isArray(summary) ? summary : [summary])),
        h('div', { class: 'stack fold-body' }, ...children),
    );
    // `toggle` does not bubble: it is heard on the fold itself.
    el.addEventListener('toggle', () => {
        const now = el.open;
        if (now === was) return;
        was = now;
        if (id !== undefined) foldOpen.set(id, now);
        const quiet = byPage.delete(el);
        // Opened by the person: there is more to read, so the capsule makes room and brings it into view.
        if (now && !quiet && el.isConnected) el.dispatchEvent(new CustomEvent('cap:show', { bubbles: true }));
    });
    return el;
}

/** Folds the page opened itself, whose `toggle` is still to come: those do not pull the capsule to them. */
const byPage = new WeakSet<HTMLDetailsElement>();
/**
 * Open a fold because the page has something to say in it (a status arrived), not because the person pressed:
 * it opens where it stands, and the view is not moved from what the person is doing.
 */
export function openFold(el: HTMLDetailsElement): void {
    if (el.open) return;
    byPage.add(el);
    el.open = true;
}
