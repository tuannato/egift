import type { WrapperDef } from '../stage';
import { h } from './dom';

/** The light when no wrapper is on stage: cool and quiet. */
const NEUTRAL = ['#2a3b5c', '#1d4a55', '#3a2f5e'] as const;
const HEX = /^#[0-9a-fA-F]{6}$/;

/** The three colours the page is lit with, for a wrapper. Pure. */
export function ambientColours(def: Pick<WrapperDef, 'ambient'> | undefined): [string, string, string] {
    const list = (def?.ambient ?? []).filter(c => typeof c === 'string' && HEX.test(c));
    if (list.length < 2) return [NEUTRAL[0], NEUTRAL[1], NEUTRAL[2]];
    return [list[0]!, list[1]!, list[2] ?? list[0]!];
}

/**
 * Light the page with the wrapper's colours. The wrapper only names colours;
 * the frame paints the light (three large pools behind everything).
 */
export function setAmbient(def: Pick<WrapperDef, 'ambient'> | undefined): void {
    const [a, b, c] = ambientColours(def);
    const root = document.documentElement;
    root.style.setProperty('--amb-1', a);
    root.style.setProperty('--amb-2', b);
    root.style.setProperty('--amb-3', c);
}

/** The fixed layer the light is painted on. One per page. */
export function ambientLayer(): HTMLElement {
    return h('div', { class: 'ambient', 'aria-hidden': 'true' }, h('i', { class: 'amb amb-1' }), h('i', { class: 'amb amb-2' }), h('i', { class: 'amb amb-3' }));
}
