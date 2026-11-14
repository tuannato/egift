import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { together, tune } from './tune';

/**
 * "Khung trời" / Evening sky. A level crossing in a small town, late in the
 * day, painted like an animation background in poster colour: the striped
 * barrier is down across the road and the sky behind it is still hushed.
 * Opening: the warning lamps blink in turn, a local train goes through as a
 * streak of lit windows, the barrier arms lift, and the sky burns — the
 * cumulus rolls and takes fire, low scud slides in, the town and the street
 * lamp come on, the first stars show and one falls.
 *
 * Canvas 360x450, sea horizon at y = 322, rails at y = 386..396. Art in
 * public/wrappers/skyline/ is authored in canvas units (each SVG's viewBox is
 * its layer box) by scripts/art/skyline.gen.mjs; the boxes and pivots below
 * must match it. Every scene piece exists twice from one geometry (hushed and
 * burning); the opening cross-fades them.
 */

type Box = readonly [number, number, number, number];
const at = (b: Box, p: readonly [number, number]): [number, number] => [(p[0] - b[0]) / b[2], (p[1] - b[1]) / b[3]];

const FULL: Box = [-8, -8, 376, 466];
const CLOUD_FAR: Box = [-8, 270, 376, 52];
const CLOUD_B: Box = [196, 180, 176, 142];
const CLOUD_A: Box = [-8, 96, 280, 226];
const TOWN: Box = [-8, 180, 376, 220];
const BAR_L: Box = [36, 336, 176, 28];
const BAR_R: Box = [200, 337, 116, 28];
const PIVOT_L = [58, 350] as const;
const PIVOT_R = [297, 351] as const;

/** Parallax planes, far to near. */
const D_SKY = 0.03;
const D_FAR = 0.06;
const D_B = 0.09;
const D_A = 0.12;
const D_SCUD = 0.17;
const D_TOWN = 0.24;
const D_TRAIN = 0.32;
const D_NEAR = 0.4;

const layers: LayerDef[] = [
    { id: 'sky', art: 'sky.svg', box: FULL, depth: D_SKY },
    { id: 'sky-lit', art: 'sky-lit.svg', box: FULL, depth: D_SKY, start: { opacity: 0 } },
    { id: 'stars', art: 'stars.svg', box: [-8, -8, 376, 240], depth: D_SKY, start: { opacity: 0 } },
    { id: 'meteor', art: 'meteor.svg', box: [262, 104, 80, 36], depth: D_SKY, start: { opacity: 0 } },
    { id: 'cloud-far', art: 'cloud-far.svg', box: CLOUD_FAR, origin: [0.5, 1], depth: D_FAR, start: { x: 6 } },
    { id: 'cloud-far-lit', art: 'cloud-far-lit.svg', box: CLOUD_FAR, origin: [0.5, 1], depth: D_FAR, start: { x: 6, opacity: 0 } },
    { id: 'cloud-b', art: 'cloud-b.svg', box: CLOUD_B, origin: [0.6, 1], depth: D_B, start: { x: 9, sx: 0.95, sy: 0.95 } },
    { id: 'cloud-b-lit', art: 'cloud-b-lit.svg', box: CLOUD_B, origin: [0.6, 1], depth: D_B, start: { x: 9, sx: 0.95, sy: 0.95, opacity: 0 } },
    { id: 'cloud-a', art: 'cloud-a.svg', box: CLOUD_A, origin: [0.45, 1], depth: D_A, start: { x: -9, sx: 0.94, sy: 0.94 } },
    { id: 'cloud-a-lit', art: 'cloud-a-lit.svg', box: CLOUD_A, origin: [0.45, 1], depth: D_A, start: { x: -9, sx: 0.94, sy: 0.94, opacity: 0 } },
    { id: 'cloud-a2', art: 'cloud-a2.svg', box: CLOUD_A, origin: [0.45, 1], depth: D_A, start: { x: -9, sx: 0.94, sy: 0.94 } },
    { id: 'cloud-a2-lit', art: 'cloud-a2-lit.svg', box: CLOUD_A, origin: [0.45, 1], depth: D_A, start: { x: -9, sx: 0.94, sy: 0.94, opacity: 0 } },
    { id: 'scud', art: 'scud.svg', box: [-8, 120, 376, 150], depth: D_SCUD, start: { x: -80, opacity: 0 } },
    { id: 'town', art: 'town.svg', box: TOWN, depth: D_TOWN },
    { id: 'town-lit', art: 'town-lit.svg', box: TOWN, depth: D_TOWN, start: { opacity: 0 } },
    { id: 'lights', art: 'lights.svg', box: TOWN, depth: D_TOWN, start: { opacity: 0 } },
    { id: 'train', art: 'train.svg', box: [380, 204, 900, 196], depth: D_TRAIN, start: { opacity: 0 } },
    { id: 'ground', art: 'ground.svg', box: FULL, depth: D_NEAR },
    { id: 'ground-lit', art: 'ground-lit.svg', box: FULL, depth: D_NEAR, start: { opacity: 0 } },
    { id: 'lamp-st', art: 'lamp-st.svg', box: [-8, 150, 190, 310], depth: D_NEAR, blend: 'screen', start: { opacity: 0 } },
    { id: 'warn-a', art: 'warn-a.svg', box: [294, 253, 44, 44], depth: D_NEAR, start: { opacity: 0.05 } },
    { id: 'warn-b', art: 'warn-b.svg', box: [294, 270.5, 44, 44], depth: D_NEAR, start: { opacity: 0.24 } },
    { id: 'bar-l', art: 'bar-l.svg', box: BAR_L, origin: at(BAR_L, PIVOT_L), depth: D_NEAR },
    { id: 'bar-r', art: 'bar-r.svg', box: BAR_R, origin: at(BAR_R, PIVOT_R), depth: D_NEAR },
];

// Beat times (ms).
const BLINK = 560;
const TRAIN_IN = 420;
const TRAIN_DUR = 1250;
const LIFT = 1950;
const BURN = 1750;
const LAMPS_ON = 3700;

/** The two warning lamps take turns; four rounds, then they rest. */
const blink: Step[] = [0, 1, 2, 3].flatMap((i): Step[] => [
    { kind: 'move', layer: 'warn-a', at: i * BLINK, dur: 90, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'warn-a', at: i * BLINK + BLINK / 2 - 40, dur: 110, ease: 'in', to: { opacity: 0.1 } },
    { kind: 'move', layer: 'warn-b', at: i * BLINK + BLINK / 2, dur: 90, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'warn-b', at: (i + 1) * BLINK - 40, dur: 110, ease: 'in', to: { opacity: 0.1 } },
]);

const open: Step[] = [
    // 1. The lamps blink and the train goes through.
    ...blink,
    { kind: 'move', layer: 'train', at: TRAIN_IN - 60, dur: 60, ease: 'linear', to: { opacity: 1 } },
    { kind: 'move', layer: 'train', at: TRAIN_IN, dur: TRAIN_DUR, ease: 'linear', to: { x: -1300 } },
    { kind: 'move', layer: 'train', at: TRAIN_IN + TRAIN_DUR, dur: 60, ease: 'linear', to: { opacity: 0 } },
    { kind: 'shake', layer: 'bar-l', at: TRAIN_IN + 150, dur: 950, amp: 0.7, times: 10 },
    { kind: 'shake', layer: 'bar-r', at: TRAIN_IN + 200, dur: 900, amp: 0.6, times: 9 },

    // 2. The arms lift, the long one first.
    { kind: 'move', layer: 'bar-l', at: LIFT, dur: 950, ease: 'back', to: { turn: -79 } },
    { kind: 'move', layer: 'bar-r', at: LIFT + 170, dur: 850, ease: 'back', to: { turn: 81 } },
    { kind: 'move', layer: 'warn-a', at: 4 * BLINK + 200, dur: 500, ease: 'out', to: { opacity: 0 } },
    { kind: 'move', layer: 'warn-b', at: 4 * BLINK + 200, dur: 500, ease: 'out', to: { opacity: 0 } },

    // 3. The sky burns: from the horizon up, the far bank first, the tower last.
    { kind: 'move', layer: 'sky-lit', at: BURN, dur: 2200, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'cloud-far-lit', at: BURN, dur: 1500, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'cloud-b-lit', at: BURN + 300, dur: 1800, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'cloud-a-lit', at: BURN + 550, dur: 2000, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'cloud-a2-lit', at: BURN + 400, dur: 2000, ease: 'inout', to: { opacity: 1 } },
    // ... and the clouds roll: each mass swells from its foot and drifts (both paintings of it together).
    ...(['cloud-a', 'cloud-a-lit', 'cloud-a2', 'cloud-a2-lit', 'cloud-b', 'cloud-b-lit'] as const).map((layer): Step => ({ kind: 'move', layer, at: 250, dur: 5400, ease: 'out', to: { x: 0, sx: 1, sy: 1 } })),
    ...(['cloud-far', 'cloud-far-lit'] as const).map((layer): Step => ({ kind: 'move', layer, at: 250, dur: 5400, ease: 'out', to: { x: 0 } })),
    { kind: 'move', layer: 'scud', at: 2300, dur: 3500, ease: 'out', to: { x: 0 } },
    { kind: 'move', layer: 'scud', at: 2300, dur: 1300, ease: 'inout', to: { opacity: 1 } },

    // 4. The land goes to dusk under it; windows and the street lamp come on with a flicker.
    { kind: 'move', layer: 'town-lit', at: BURN + 500, dur: 1700, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'ground-lit', at: BURN + 500, dur: 1700, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'lights', at: LAMPS_ON, dur: 120, ease: 'out', to: { opacity: 0.8 } },
    { kind: 'move', layer: 'lights', at: LAMPS_ON + 130, dur: 110, ease: 'in', to: { opacity: 0.3 } },
    { kind: 'move', layer: 'lights', at: LAMPS_ON + 260, dur: 500, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'lamp-st', at: LAMPS_ON + 350, dur: 100, ease: 'out', to: { opacity: 0.75 } },
    { kind: 'move', layer: 'lamp-st', at: LAMPS_ON + 470, dur: 110, ease: 'in', to: { opacity: 0.25 } },
    { kind: 'move', layer: 'lamp-st', at: LAMPS_ON + 620, dur: 550, ease: 'out', to: { opacity: 1 } },

    // 5. First stars, and one falls.
    { kind: 'move', layer: 'stars', at: 3500, dur: 1700, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'meteor', at: 4750, dur: 130, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'meteor', at: 4750, dur: 650, ease: 'out', to: { x: -92, y: 36.5 } },
    { kind: 'move', layer: 'meteor', at: 5130, dur: 300, ease: 'in', to: { opacity: 0 } },
];

const idle: IdleStep[] = [
    { layer: 'warn-a', field: 'opacity', amp: 0.04, period: 3400 },
    { layer: 'warn-b', field: 'opacity', amp: 0.07, period: 3400, phase: 0.5 },
    { layer: 'cloud-a', field: 'x', amp: 1.4, period: 17000 },
    { layer: 'cloud-a2', field: 'x', amp: 1.4, period: 17000 },
    { layer: 'cloud-b', field: 'x', amp: 1, period: 21000, phase: 0.3 },
];

const afterglow: IdleStep[] = [
    { layer: 'stars', field: 'opacity', amp: 0.22, period: 2900 },
    { layer: 'cloud-a', field: 'x', amp: 1.4, period: 17000 },
    { layer: 'cloud-a-lit', field: 'x', amp: 1.4, period: 17000 },
    { layer: 'cloud-a2', field: 'x', amp: 1.4, period: 17000 },
    { layer: 'cloud-a2-lit', field: 'x', amp: 1.4, period: 17000 },
    { layer: 'cloud-b', field: 'x', amp: 1, period: 21000, phase: 0.3 },
    { layer: 'cloud-b-lit', field: 'x', amp: 1, period: 21000, phase: 0.3 },
    { layer: 'scud', field: 'x', amp: 5, period: 19000, phase: 0.2 },
    { layer: 'lights', field: 'opacity', amp: 0.07, period: 4300 },
    { layer: 'lamp-st', field: 'opacity', amp: 0.06, period: 5100, phase: 0.4 },
];

export const skyline: WrapperDef = {
    id: 'skyline',
    name: { vi: 'Khung trời', en: 'Evening sky' },
    ambient: ['#31407A', '#EA8E80', '#FFD0A0'],
    blurb: {
        vi: 'Thanh chắn tàu còn hạ ở thị trấn nhỏ. Tàu lướt qua, chắn nâng lên, và cả bầu trời chiều bừng cháy sau những cột điện.',
        en: 'The crossing barrier is down in a small town. A train sweeps by, the arms lift, and the whole evening sky takes fire.',
    },
    // Deep dusk glass with one sunset orange.
    theme: { ground: '#080A20', surface: '#161A44', ink: '#FFF3E4', accent: '#FF9E6A', onAccent: '#2A1024', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'glass' },
    focus: [0.5, 0.52],
    size: [360, 450],
    backdrop: '#283668',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 2750,
    // A small evening tune on a music box; the train passes as a breath of noise.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 77,
        score: together(
            tune(132, 'A5/8 C6/8 A5/8 F5/8 G5/4 C5/4 | F5/8 G5/8 A5/8 C6/8 A5/2!'),
            tune(132, 'F3/1 | F3/1', { inst: 'pad', gain: 0.5 }),
            [{ at: 900, pitch: 72, dur: 700, inst: 'noise' as const, bend: -7, gain: 0.35 }],
        ),
    },
};

export default skyline;
