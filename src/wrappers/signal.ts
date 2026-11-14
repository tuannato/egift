import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * "Tín hiệu" / Transmission. Value travelling across the network and arriving:
 * a sealed crystal prism locked inside two ring gates, the network dim
 * around it. Opening: the links light from the frame's edges inward, the
 * gates spin and click into alignment (their gaps form one vertical channel),
 * light shoots through the channel, the prism breaks into four shards and the
 * gem it held grows, whole and crisp, at the centre, with a burst of bits.
 *
 * Canvas 360x450, centre of everything at (180, 196). Art in
 * public/wrappers/signal/ is authored in canvas units (each SVG's viewBox is
 * its layer box).
 */

const C = [180, 196] as const;
/** The prism's box: every facet shares it, so a facet turns and breathes around the prism's centre. */
const PBOX = [126, 96, 108, 200] as const;
const pOrigin: [number, number] = [(C[0] - PBOX[0]) / PBOX[2], (C[1] - PBOX[1]) / PBOX[3]];
/** Parallax planes (depth). The gates share one value so they stay concentric; the prism and its light share another, slightly nearer. */
const D_NET = 0.18;
const D_GATES = 0.4;
const D_PRISM = 0.55;
const sq = (r: number): [number, number, number, number] => [C[0] - r, C[1] - r, 2 * r, 2 * r];

/**
 * The prism's four shards (a vertical seam and a slanted fracture through the
 * gem's seat): id, the offset it parts to, its turn. Nothing leaves along the
 * vertical axis, so the channel through the aligned gates stays clear.
 */
const FACETS: readonly (readonly [string, number, number, number])[] = [
    ['p-tl', -36, -17, -13],
    ['p-bl', -34, 21, 11],
    ['p-tr', 35, -21, 12],
    ['p-br', 37, 17, -10],
];
/** The gem is drawn at its open size and sits in its seat at this scale while the prism is closed. */
const GEM_SEAT = 0.36;

const layers: LayerDef[] = [
    { id: 'space', art: 'space.svg', box: [0, 0, 360, 450], depth: 0.04 },
    { id: 'grid', art: 'grid.svg', box: [-12, 364, 384, 98], depth: 0.1 },
    { id: 'net', art: 'net.svg', box: [-12, -12, 384, 474], depth: D_NET },
    { id: 'links-a', art: 'links-a.svg', box: [-12, -12, 384, 474], depth: D_NET, blend: 'screen', start: { opacity: 0.14 } },
    { id: 'links-b', art: 'links-b.svg', box: [-12, -12, 384, 474], depth: D_NET, blend: 'screen', start: { opacity: 0 } },
    { id: 'links-c', art: 'links-c.svg', box: [-12, -12, 384, 474], depth: D_NET, blend: 'screen', start: { opacity: 0.1 } },
    { id: 'bloom', art: 'bloom.svg', box: sq(168), depth: 0.25, blend: 'screen', start: { opacity: 0.4, sx: 0.8, sy: 0.8 } },
    { id: 'beam', art: 'beam.svg', box: [C[0] - 34, 0, 68, 450], depth: 0.25, blend: 'screen', start: { opacity: 0, sx: 0.4 } },
    { id: 'ring-outer', art: 'ring-outer.svg', depth: D_GATES, box: sq(160), start: { turn: 38 } },
    { id: 'ring-mid', art: 'ring-mid.svg', depth: D_GATES, box: sq(128), start: { turn: -57 } },
    { id: 'ring-halo', art: 'ring-halo.svg', depth: D_GATES, box: sq(112), blend: 'screen', start: { opacity: 0.3 } },
    { id: 'core', art: 'core.svg', depth: D_PRISM, box: sq(64), blend: 'screen', start: { opacity: 0.7, sx: 0.6, sy: 0.6 } },
    ...FACETS.map(([id]): LayerDef => ({ id, art: `${id}.svg`, box: PBOX, origin: pOrigin, depth: D_PRISM })),
    { id: 'prism-halo', art: 'prism-halo.svg', depth: D_PRISM, box: [120, 88, 120, 216], blend: 'screen', start: { opacity: 0.6 } },
    { id: 'wave', art: 'wave.svg', depth: D_PRISM, box: sq(150), blend: 'screen', start: { opacity: 0, sx: 0.12, sy: 0.12 } },
    { id: 'flare', art: 'flare.svg', depth: D_PRISM, box: [0, C[1] - 60, 360, 120], blend: 'screen', start: { opacity: 0, sx: 0.2 } },
    { id: 'gem', art: 'gem.svg', depth: D_PRISM, box: [C[0] - 40, C[1] - 52, 80, 104], start: { sx: GEM_SEAT, sy: GEM_SEAT } },
    { id: 'bokeh', art: 'bokeh.svg', box: [0, 0, 360, 450], depth: 0.9, blend: 'screen' },
    { id: 'bits', art: 'bit.svg', box: [C[0] - 5, C[1] - 5, 10, 10], depth: 0, blend: 'screen' },
];

// Beat times (ms).
const LOCK_OUTER = 1850;
const LOCK_MID = 2150;
const BREAK = 2300;

const open: Step[] = [
    // 1. The transmission arrives: links light from the frame's edges toward the centre.
    { kind: 'move', layer: 'links-a', at: 0, dur: 450, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'links-b', at: 260, dur: 450, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'links-c', at: 520, dur: 450, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'links-a', at: 1100, dur: 700, ease: 'inout', to: { opacity: 0.5 } },
    { kind: 'move', layer: 'links-b', at: 1300, dur: 700, ease: 'inout', to: { opacity: 0.55 } },
    { kind: 'move', layer: 'prism-halo', at: 700, dur: 600, ease: 'inout', to: { opacity: 1 } },

    // 2. The gates spin, each its own way, and click into alignment.
    { kind: 'move', layer: 'ring-outer', at: 300, dur: LOCK_OUTER - 300, ease: 'back', to: { turn: -180 } },
    { kind: 'move', layer: 'ring-mid', at: 420, dur: LOCK_MID - 420, ease: 'back', to: { turn: 180 } },
    { kind: 'shake', layer: 'ring-outer', at: LOCK_OUTER, dur: 220, amp: 1.8, times: 3 },
    { kind: 'shake', layer: 'ring-mid', at: LOCK_MID, dur: 240, amp: 2.2, times: 3 },
    { kind: 'move', layer: 'ring-halo', at: LOCK_OUTER, dur: 400, ease: 'out', to: { opacity: 0.6 } },

    // Light shoots through the aligned channel.
    { kind: 'move', layer: 'beam', at: LOCK_MID, dur: 260, ease: 'out', to: { opacity: 1, sx: 1 } },
    { kind: 'move', layer: 'beam', at: LOCK_MID + 550, dur: 1200, ease: 'inout', to: { opacity: 0.4, sx: 0.6 } },

    // 3. The prism breaks into four shards; the gem it held grows at the centre.
    ...FACETS.map(([id, x, y, turn]): Step => ({ kind: 'move', layer: id, at: BREAK, dur: 1000, ease: 'back', to: { x, y, turn, sx: 0.66, sy: 0.66 } })),
    ...FACETS.map(([id]): Step => ({ kind: 'move', layer: id, at: BREAK + 400, dur: 1200, ease: 'inout', to: { opacity: 0.8 } })),
    { kind: 'move', layer: 'gem', at: BREAK + 80, dur: 900, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'prism-halo', at: BREAK, dur: 450, ease: 'out', to: { opacity: 0, sx: 1.2, sy: 1.2 } },

    // 4. The core is exposed; the rings catch the light; the network flares, then settles.
    { kind: 'move', layer: 'core', at: BREAK, dur: 900, ease: 'out', to: { opacity: 1, sx: 1.3, sy: 1.3 } },
    { kind: 'move', layer: 'core', at: BREAK + 1100, dur: 900, ease: 'inout', to: { opacity: 0.85, sx: 1.05, sy: 1.05 } },
    { kind: 'move', layer: 'bloom', at: BREAK, dur: 800, ease: 'out', to: { opacity: 0.9, sx: 1.1, sy: 1.1 } },
    { kind: 'move', layer: 'bloom', at: BREAK + 1000, dur: 1000, ease: 'inout', to: { opacity: 0.5, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'ring-halo', at: BREAK, dur: 600, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'flare', at: BREAK + 120, dur: 380, ease: 'out', to: { opacity: 1, sx: 1 } },
    { kind: 'move', layer: 'flare', at: BREAK + 500, dur: 1200, ease: 'inout', to: { opacity: 0.3, sx: 0.7 } },
    { kind: 'move', layer: 'links-a', at: BREAK + 100, dur: 250, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'links-b', at: BREAK + 100, dur: 250, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'links-a', at: BREAK + 500, dur: 1300, ease: 'inout', to: { opacity: 0.45 } },
    { kind: 'move', layer: 'links-b', at: BREAK + 500, dur: 1300, ease: 'inout', to: { opacity: 0.5 } },
    { kind: 'move', layer: 'links-c', at: BREAK + 500, dur: 1300, ease: 'inout', to: { opacity: 0.7 } },
    // parallax: the far planes drift a little, the near ones more
    { kind: 'move', layer: 'space', at: BREAK, dur: 2000, ease: 'out', to: { sx: 1.02, sy: 1.02 } },
    { kind: 'move', layer: 'grid', at: BREAK, dur: 2000, ease: 'out', to: { y: 6 } },
    { kind: 'move', layer: 'net', at: BREAK, dur: 2000, ease: 'out', to: { sx: 1.04, sy: 1.04 } },
    { kind: 'move', layer: 'links-a', at: BREAK, dur: 2000, ease: 'out', to: { sx: 1.04, sy: 1.04 } },
    { kind: 'move', layer: 'links-b', at: BREAK, dur: 2000, ease: 'out', to: { sx: 1.04, sy: 1.04 } },
    { kind: 'move', layer: 'links-c', at: BREAK, dur: 2000, ease: 'out', to: { sx: 1.04, sy: 1.04 } },
    { kind: 'move', layer: 'bokeh', at: BREAK, dur: 2000, ease: 'out', to: { x: 8, y: -14, sx: 1.08, sy: 1.08 } },

    // The break sends a shockwave out through the gates.
    { kind: 'move', layer: 'wave', at: BREAK + 40, dur: 90, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'wave', at: BREAK + 40, dur: 1000, ease: 'out', to: { sx: 1.25, sy: 1.25 } },
    { kind: 'move', layer: 'wave', at: BREAK + 330, dur: 710, ease: 'in', to: { opacity: 0 } },

    // 5. A burst of bits streams outward and fades.
    { kind: 'scatter', layer: 'bits', at: BREAK + 150, dur: 1700, count: 34, spread: 175, fall: -10 },
    { kind: 'scatter', layer: 'bits', at: BREAK + 300, dur: 1500, count: 24, spread: 120, fall: 24 },
];

const idle: IdleStep[] = [
    { layer: 'ring-outer', field: 'turn', amp: 3, period: 13000 },
    { layer: 'ring-mid', field: 'turn', amp: 5, period: 9500, phase: 0.5 },
    ...FACETS.flatMap(([id]): IdleStep[] => [
        { layer: id, field: 'sx', amp: 0.015, period: 4200 },
        { layer: id, field: 'sy', amp: 0.015, period: 4200 },
    ]),
    { layer: 'prism-halo', field: 'opacity', amp: 0.25, period: 4200 },
    { layer: 'core', field: 'opacity', amp: 0.15, period: 4200 },
    { layer: 'links-a', field: 'opacity', amp: 0.1, period: 3100, phase: 0.3 },
    { layer: 'links-c', field: 'opacity', amp: 0.1, period: 2600, phase: 0.7 },
];

const afterglow: IdleStep[] = [
    { layer: 'ring-outer', field: 'turn', amp: 2.5, period: 12000 },
    { layer: 'ring-mid', field: 'turn', amp: 3.5, period: 9000, phase: 0.5 },
    { layer: 'core', field: 'sx', amp: 0.04, period: 3600 },
    { layer: 'core', field: 'sy', amp: 0.04, period: 3600 },
    { layer: 'gem', field: 'y', amp: 1.5, period: 5200 },
    { layer: 'bloom', field: 'opacity', amp: 0.1, period: 3600 },
    { layer: 'beam', field: 'opacity', amp: 0.15, period: 4800, phase: 0.4 },
    { layer: 'flare', field: 'opacity', amp: 0.1, period: 3600, phase: 0.3 },
    { layer: 'links-a', field: 'opacity', amp: 0.2, period: 2800 },
    { layer: 'links-b', field: 'opacity', amp: 0.2, period: 3400, phase: 0.5 },
    ...FACETS.map(([id], i): IdleStep => ({ layer: id, field: 'y', amp: 1.5, period: 5000 + i * 300, phase: i / 4 })),
];

export const signal: WrapperDef = {
    id: 'signal',
    name: { vi: 'Tín hiệu', en: 'Transmission' },
    ambient: ['#0074C2', '#32F0FF', '#8B5CFF'],
    blurb: {
        vi: 'Một lăng kính pha lê khoá trong hai vòng cổng. Các vòng xoay vào khớp, tia sáng xuyên qua, lăng kính tách ra quanh viên tinh thể sáng.',
        en: 'A crystal prism locked inside two ring gates. The gates turn into line, light shoots through, and the prism parts around a bright gem.',
    },
    // A drawing in light: no fill, hairlines and brackets, one cyan.
    theme: { ground: '#02060C', surface: '#06131F', ink: '#DDF6FF', accent: '#32F0FF', onAccent: '#00161C', material: 'wire', corner: 'soft', face: 'mono', voice: 'pulse' },
    focus: [0.5, 196 / 450],
    size: [360, 450],
    backdrop: '#060A12',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 2900,
    // A signal finding its note: broken chords on glass over a held tone.
    sound: {
        v: 1,
        inst: 'glassy',
        tonic: 64,
        score: scaled(1.35, together(
            tune(160, 'E4/8 B4/8 E5/8 B4/8 G#4/8 B4/8 E5/4 | B4/8 E5/8 G#5/8 B5/8 E5/2!'),
            tune(160, 'E3/1 | E3/1', { inst: 'pad', gain: 0.5 }),
        )),
    },
};

export default signal;
