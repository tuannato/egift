/** A tiny element builder. Strings become text nodes; nothing here parses markup. */
export type Child = Node | string | null | undefined | false;
export type Props = Record<string, unknown>;

function applyProps(el: Element, props: Props | null | undefined): void {
    if (!props) return;
    for (const [k, v] of Object.entries(props)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.setAttribute('class', String(v));
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
        else if (v === true) el.setAttribute(k, '');
        else if (k === 'value' && 'value' in el) (el as HTMLInputElement).value = String(v);
        else el.setAttribute(k, String(v));
    }
}

function append(el: Element, children: Child[]): void {
    for (const c of children) {
        if (c === null || c === undefined || c === false) continue;
        el.append(typeof c === 'string' ? document.createTextNode(c) : c);
    }
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    applyProps(el, props);
    append(el, children);
    return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(tag: string, props?: Props | null, ...children: Child[]): SVGElement {
    const el = document.createElementNS(SVG_NS, tag);
    applyProps(el, props);
    append(el, children);
    return el as SVGElement;
}

export function clear(el: Element): void {
    while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Open another site, in a new tab that is told nothing of this page. Must be called synchronously from a click handler.
 * Only an `https://` address is opened: whatever else is handed in (a script, a data URL, a plain http page) is dropped.
 */
export function openOut(url: string): void {
    if (!/^https:\/\/[a-z0-9.-]+(?:[/?#]|$)/i.test(url)) return;
    window.open(url, '_blank', 'noopener,noreferrer');
}

export type Dispose = () => void;
