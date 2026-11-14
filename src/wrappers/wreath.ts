import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { together, tune } from './tune';

/**
 * Leaf wreath — the autumn-gratitude wrapper, drawn as a linocut (a reduction
 * print from one rubber block): solid masses of ink with the light carved OUT
 * of them. No outlines anywhere. A leaf is a mass; its veins are gouge cuts
 * showing the ink printed before (mustard under brick under deep brown) or the
 * bare paper; where one mass lies on another, a white line is cut round it.
 * Chatter marks stand in the cleared paper and the ink is a little starved.
 *
 * Closed: a tight wreath of dry leaves, wheat ears, seed heads and berries on
 * a sheet of warm off-white paper in a dark room, bound at the foot with
 * a collar of twine and a bow, cut as one brown-black mass with its strands
 * carved white; nine long pointed dry leaves (rust, ochre, brown-black by turns) lie as a
 * pinwheel over the middle, stems under the ring, and shut it like an iris. An olive band is printed
 * across the foot of the sheet.
 * Opening: the bow is pulled undone and the twine drops; the iris turns open,
 * each leaf swinging on its stem back under the ring; the ring loosens and
 * widens; inside, a block of deep brown holds a harvest table (a pumpkin, two
 * pears, a sheaf of wheat) and the candle is lit, its light cut out of the
 * dark in rays. Leaves come away and fall across the sheet with the wind.
 * No text and no figures: the frame shows the gift.
 *
 * Canvas 360x450; the wreath's centre is (180, 212). The art is generated in
 * canvas coordinates (scripts/art/wreath.gen.mjs): each SVG's viewBox is its
 * box, and the generator prints the boxes and the blades' pivots used here.
 */

/**
 * The iris: nine long pointed dry leaves laid as a pinwheel, stems under the ring, tips wound round the centre.
 * [layer, box, pivot (fractions of the box), angle of the pivot round the centre].
 */
const BLADES: readonly (readonly [string, readonly [number, number, number, number], readonly [number, number], number])[] = [
    ['blade-1', [91, 125, 89, 125], [0.234, 0.046], -130],
    ['blade-2', [132, 102, 78, 129], [0.615, 0.031], -90],
    ['blade-3', [138, 113, 120, 105], [0.918, 0.17], -50],
    ['blade-4', [152, 150, 137, 83], [0.966, 0.525], -10],
    ['blade-5', [168, 171, 116, 112], [0.895, 0.839], 30],
    ['blade-6', [171, 185, 80, 131], [0.566, 0.966], 70],
    ['blade-7', [128, 201, 97, 118], [0.162, 0.937], 110],
    ['blade-8', [84, 198, 136, 93], [0.031, 0.72], 150],
    ['blade-9', [70, 171, 127, 89], [0.044, 0.254], 190],
];
const r1 = (n: number): number => Math.round(n * 10) / 10;

const bladeLayers: LayerDef[] = BLADES.map(([id, box, origin]) => ({ id, art: `${id}.svg`, box, origin, depth: 0.34 }));
/**
 * The iris turns open: each leaf swings on its stem until it lies along the ring, draws back under it,
 * and is let go there (its cut lines would otherwise show in the dark block).
 */
const bladeSteps: Step[] = BLADES.flatMap(([id, , , deg], i): Step[] => {
    const a = (deg * Math.PI) / 180;
    const at = 1150 + (8 - i) * 70;
    return [
        { kind: 'move', layer: id, at, dur: 1050, ease: 'inout', to: { turn: 102, x: r1(8 * Math.cos(a)), y: r1(8 * Math.sin(a)), sx: 0.6, sy: 0.6 } },
        { kind: 'move', layer: id, at: at + 900, dur: 320, ease: 'in', to: { opacity: 0 } },
    ];
});

/** A leaf comes away and rides the wind down to the right: sideways first, then down, turning as it goes. */
const fall = (layer: string, at: number, dur: number, x: number, y: number, turn: number, lands: boolean): Step[] => [
    { kind: 'move', layer, at, dur, ease: 'out', to: { x } },
    { kind: 'move', layer, at, dur, ease: 'in', to: { y } },
    { kind: 'move', layer, at, dur, ease: 'inout', to: { turn } },
    ...(lands ? [] : [{ kind: 'move', layer, at: at + dur - 520, dur: 520, ease: 'in', to: { opacity: 0 } } as const]),
];

const open: Step[] = [
    // 1. The bow is pulled undone.
    { kind: 'shake', layer: 'knot', at: 0, dur: 300, amp: 1.2, times: 3 },
    { kind: 'move', layer: 'loop-l', at: 60, dur: 440, ease: 'inout', to: { sx: 0.18, sy: 0.35, turn: -14 } },
    { kind: 'move', layer: 'loop-r', at: 130, dur: 440, ease: 'inout', to: { sx: 0.18, sy: 0.35, turn: 14 } },
    { kind: 'move', layer: 'loop-l', at: 520, dur: 120, ease: 'in', to: { sx: 0, sy: 0 } },
    { kind: 'move', layer: 'loop-r', at: 570, dur: 120, ease: 'in', to: { sx: 0, sy: 0 } },
    // 2. The twine slackens and drops away, knot and tails first.
    { kind: 'move', layer: 'knot', at: 620, dur: 560, ease: 'in', to: { y: 120, turn: 16 } },
    { kind: 'move', layer: 'knot', at: 900, dur: 280, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'twine', at: 600, dur: 160, ease: 'out', to: { sx: 1.18, y: 3 } },
    { kind: 'move', layer: 'twine', at: 760, dur: 540, ease: 'in', to: { y: 130, turn: -9 } },
    { kind: 'move', layer: 'twine', at: 1010, dur: 290, ease: 'in', to: { opacity: 0 } },
    // 3. The iris turns open.
    ...bladeSteps,
    // 4. The ring loosens: the two courses of leaves ease apart and widen.
    { kind: 'move', layer: 'ring-a', at: 1750, dur: 1150, ease: 'out', to: { turn: -8, sx: 1.12, sy: 1.12 } },
    { kind: 'move', layer: 'ring-b', at: 1850, dur: 1300, ease: 'back', to: { turn: 10, sx: 1.15, sy: 1.15 } },
    { kind: 'move', layer: 'ring-c', at: 1950, dur: 1400, ease: 'out', to: { turn: 4, sx: 1.13, sy: 1.13 } },
    // 5. The candle is lit and its light is cut into the dark.
    { kind: 'move', layer: 'flame', at: 2520, dur: 120, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'flame', at: 2520, dur: 460, ease: 'back', to: { sx: 1.25, sy: 1.25 } },
    { kind: 'move', layer: 'glow', at: 2600, dur: 900, ease: 'out', to: { opacity: 0.94 } },
    // 6. Leaves come away and fall across the sheet.
    ...fall('fall-1', 2250, 2700, 222, 170, 205, true),
    ...fall('fall-3', 2550, 2300, 66, 140, 150, true),
    ...fall('fall-2', 3300, 2700, 150, 290, -190, false),
];

const idle: IdleStep[] = [
    { layer: 'loop-l', field: 'turn', amp: 2.2, period: 4400 },
    { layer: 'loop-r', field: 'turn', amp: 2.2, period: 4400, phase: 0.4 },
    { layer: 'knot', field: 'turn', amp: 1.4, period: 5200, phase: 0.2 },
    { layer: 'ring-b', field: 'turn', amp: 0.45, period: 9000 },
    { layer: 'fall-1', field: 'turn', amp: 2.4, period: 5200 },
    { layer: 'fall-2', field: 'turn', amp: 2, period: 6100, phase: 0.3 },
    { layer: 'fall-3', field: 'turn', amp: 2.6, period: 4700, phase: 0.6 },
];

const afterglow: IdleStep[] = [
    { layer: 'flame', field: 'sy', amp: 0.07, period: 1500 },
    { layer: 'flame', field: 'turn', amp: 3, period: 2300, phase: 0.3 },
    { layer: 'glow', field: 'opacity', amp: 0.08, period: 3100 },
    { layer: 'ring-c', field: 'turn', amp: 0.5, period: 9000 },
    { layer: 'fall-1', field: 'turn', amp: 2, period: 6400 },
];

export const wreath: WrapperDef = {
    id: 'wreath',
    name: { vi: 'Vòng lá', en: 'Leaf wreath' },
    ambient: ['#1A100B', '#6A6B2B', '#C2963B'],
    blurb: {
        vi: 'Vòng lá khô, bông lúa và quả mọng buộc dây gai, khắc kiểu tranh in cao su. Lá xoay mở, nến thắp lên trên mâm quả mùa gặt.',
        en: 'A wreath of dry leaves, wheat and berries tied with twine, cut as a linocut. The leaves turn open and a candle is lit over a harvest table.',
    },
    // Off-white paper for the face, deep brown for the type, brick for the one loud colour, in a dark warm room.
    theme: { ground: '#140C08', surface: '#F4EAD3', ink: '#1E130D', accent: '#8E4324', onAccent: '#FFF5E0', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 212 / 450],
    size: [360, 450],
    backdrop: '#1A100B',
    layers: [
        { id: 'ground', art: 'ground.svg', box: [-12, -12, 384, 474], depth: 0.04 },
        { id: 'paper', art: 'paper.svg', box: [14, 44, 334, 434], depth: 0.14 },
        { id: 'scene', art: 'scene.svg', box: [81, 113, 198, 198], depth: 0.26 },
        { id: 'glow', art: 'glow.svg', box: [81, 113, 198, 198], start: { opacity: 0 }, depth: 0.26 },
        { id: 'flame', art: 'flame.svg', box: [169, 162, 24, 34], origin: [0.5, 0.9], start: { opacity: 0, sx: 0.3, sy: 0 }, depth: 0.26 },
        ...bladeLayers,
        { id: 'ring-a', art: 'ring-a.svg', box: [20, 52, 320, 320], depth: 0.4 },
        { id: 'ring-b', art: 'ring-b.svg', box: [20, 52, 320, 320], depth: 0.45 },
        { id: 'ring-c', art: 'ring-c.svg', box: [20, 52, 320, 320], depth: 0.5 },
        { id: 'fall-1', art: 'fall-1.svg', box: [66, 114, 46, 62], depth: 0.6 },
        { id: 'fall-2', art: 'fall-2.svg', box: [133, 69, 59, 34], depth: 0.6 },
        { id: 'fall-3', art: 'fall-3.svg', box: [232, 96, 44, 30], depth: 0.6 },
        { id: 'twine', art: 'twine.svg', box: [156, 278, 48, 86], depth: 0.54 },
        { id: 'loop-l', art: 'loop-l.svg', box: [110, 288, 76, 56], origin: [0.921, 0.679], depth: 0.56 },
        { id: 'loop-r', art: 'loop-r.svg', box: [174, 288, 76, 56], origin: [0.079, 0.679], depth: 0.56 },
        { id: 'knot', art: 'knot.svg', box: [142, 312, 78, 92], origin: [0.487, 0.152], depth: 0.56 },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2700,
    // A warm tune on wood, over a held tone.
    sound: {
        v: 1,
        inst: 'wood',
        tonic: 67,
        score: together(
            tune(132, 'D5/8 G5/8 B5/8 G5/8 A5/4 D5/4 | G5/8 A5/8 B5/8 D6/8 G5/2!'),
            tune(132, 'G3/1 | G3/1', { inst: 'pad', gain: 0.5 }),
        ),
    },
};
