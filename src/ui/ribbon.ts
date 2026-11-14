import { svg, h } from './dom';

export type RibbonShape = 'bow' | 'arrow' | 'check';

const PATHS: Record<RibbonShape, string[]> = {
    bow: ['M12 12 C9 6 3.5 6.5 4 10.5 C4.5 14 10 13.5 12 12 C14 13.5 19.5 14 20 10.5 C20.5 6.5 15 6 12 12 Z', 'M12 12 L9 19 M12 12 L15 19'],
    arrow: ['M12 4 V19 M6.5 13.5 L12 19 L17.5 13.5'],
    check: ['M5 12.5 L10 17.5 L19 7'],
};

/** The guide glyph: a bow, an arrow down, or a check. Cross-fades and draws itself when the shape changes. */
export function ribbon(shape: RibbonShape = 'bow'): HTMLElement {
    const root = svg('svg', { viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': 'true', focusable: 'false', 'data-shape': shape });
    for (const s of Object.keys(PATHS) as RibbonShape[]) {
        root.append(svg('g', { 'data-for': s }, ...PATHS[s].map(d => svg('path', { d, pathLength: 1 }))));
    }
    return h('span', { class: 'ribbon', 'aria-hidden': 'true' }, root);
}

export function setRibbon(el: HTMLElement, shape: RibbonShape): void {
    el.querySelector('svg')?.setAttribute('data-shape', shape);
}
