import { h } from './dom';

export interface OdoColumn {
    /** A digit column rolls from 0 to `digit`; anything else (a separator) just stands. */
    readonly ch: string;
    readonly digit: number | null;
    /** Milliseconds this column waits before it starts: the last digit first. */
    readonly delay: number;
}

/** How the figure rolls: every digit spins up from 0, right to left. Pure. */
export function odometerPlan(text: string, stepMs = 70): OdoColumn[] {
    const chars = [...text];
    let seen = 0;
    const out: OdoColumn[] = new Array<OdoColumn>(chars.length);
    for (let i = chars.length - 1; i >= 0; i -= 1) {
        const ch = chars[i]!;
        const isDigit = ch >= '0' && ch <= '9';
        out[i] = { ch, digit: isDigit ? Number(ch) : null, delay: isDigit ? seen * stepMs : 0 };
        if (isDigit) seen += 1;
    }
    return out;
}

/** How long the whole roll takes, for the plan above. Pure. */
export function odometerLength(text: string, rollMs = 900, stepMs = 70): number {
    const digits = [...text].filter(c => c >= '0' && c <= '9').length;
    return rollMs + Math.max(0, digits - 1) * stepMs;
}

/**
 * The rolling figure, for show only (`aria-hidden`): the real text lives in a
 * sibling the caller keeps. Each digit is a strip of 0–9 that slides to its value.
 */
export function odometer(text: string): HTMLElement {
    const el = h('span', { class: 'odo', 'aria-hidden': 'true' });
    for (const col of odometerPlan(text)) {
        if (col.digit === null) {
            el.append(h('span', { class: 'odo-sep', 'data-ch': col.ch }));
            continue;
        }
        const strip = h('span', { class: 'odo-strip' });
        // The digits are painted from an attribute, so the show adds no text to the page.
        for (let d = 0; d <= 9; d += 1) strip.append(h('span', { class: 'odo-d', 'data-d': String(d) }));
        strip.style.setProperty('--d', String(col.digit));
        strip.style.setProperty('--delay', `${col.delay}ms`);
        el.append(h('span', { class: 'odo-col' }, strip));
    }
    return el;
}
