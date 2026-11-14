import type { IdleStep, LayerDef, Pose, Step, WrapperDef } from '../stage/format';
import { together, tune } from './tune';

/**
 * Latte cup — "let me buy you a coffee", drawn as a page of a CAFE SKETCHBOOK:
 * a loose two-colour ink sketch (a sepia fountain pen and one teal ink) with
 * real coffee as the only wash. The pen line is thin, wobbles, thickens where
 * the hand pressed, is restated beside itself and leaves a blot where the nib
 * rested; shadow is hatching, never a blur; the coffee lies in flat stains
 * with a pale middle and a dark dried edge.
 *
 * Closed: an EMPTY porcelain cup on its teal-rimmed saucer, seen from above so
 * that the inside of the cup is the picture; a spoon on the saucer, a small
 * milk pitcher tilted and waiting at the upper left, the ring where a cup
 * stood before, beans, the corner of a napkin, the dark table under the
 * sketchbook. Opening: a small steel jug comes in at the top and espresso
 * leaves its lip as a thread; the cup fills with crema while the picture
 * pushes in on it; the pitcher comes over, milk runs, and a rosetta is poured
 * layer by layer from the base to the tip — each layer the bare paper left in
 * the coffee — then the pull-through runs down the stem and tugs every layer
 * into its chevron; the pitcher goes back and steam rises. No text: the frame
 * shows the gift.
 *
 * Canvas 360x450 (scripts/art/latte.gen.mjs: each SVG's viewBox is its box).
 */

type Box = readonly [number, number, number, number];
type Pt = readonly [number, number];

/* GEOM:BEGIN (printed by scripts/art/latte.gen.mjs) */
const GEOM = {
    surface: [84, 138, 216, 164],
    strokes: [0.811, 0.755, 0.699, 0.642, 0.586, 0.53, 0.474, 0.418, 0.362, 0.306, 0.245],
    stem: [186, 168.8, 12, 109.98],
    stream: [186, 88, 32, 176],
    jug: [201, 38, 96, 96],
    milk: [158, 140, 30, 70],
    pitcher: [28, 64, 108, 108],
    steamA: [147, 56, 26, 113],
    steamB: [197, 13, 68, 158],
} as const;
/* GEOM:END */

const FULL: Box = [0, 0, 360, 450];
const BLEED: Box = [-12, -12, 384, 474];
/** Everything that lies on the surface of the coffee shares one box. */
const SURFACE: Box = GEOM.surface;
/** The cup's plane. */
const D = 0.3;

/** The push-in: while the cup fills, the whole picture grows by Z about C (the middle of the cup). */
const Z = 1.18;
const C: Pt = [194, 232];
const r4 = (n: number): number => Math.round(n * 10000) / 10000;
type Own = { x?: number; y?: number; sx?: number; sy?: number };
/**
 * A layer's pose once the picture has pushed in: its own offset and scale
 * (`own`, in the units of the drawing), seen through the zoom. A zoom about C
 * of a layer that turns and scales about its own pivot is that layer scaled
 * by Z and shifted by (Z - 1) x (pivot - C).
 */
function zin(box: Box, origin: Pt = [0.5, 0.5], own: Own = {}): Pick<Pose, 'x' | 'y' | 'sx' | 'sy'> {
    const px = box[0] + box[2] * origin[0];
    const py = box[1] + box[3] * origin[1];
    return {
        x: r4(Z * (own.x ?? 0) + (Z - 1) * (px - C[0])),
        y: r4(Z * (own.y ?? 0) + (Z - 1) * (py - C[1])),
        sx: r4(Z * (own.sx ?? 1)),
        sy: r4(Z * (own.sy ?? 1)),
    };
}

const TOP: Pt = [0.5, 0];
const FOOT: Pt = [0.5, 1];
/** The layers of the rosetta, base to tip: [id, pivot]. The last is the small leaf at the tip. */
const STROKES: readonly (readonly [string, Pt])[] = GEOM.strokes.map((oy, i) => [`ros-${i + 1}`, [0.5, oy]] as const);

const PUSH_AT = 400;
const PUSH_DUR = 1300;
/** A layer that only rides the push-in. */
const push = (layer: string, box: Box, origin?: Pt): Step => ({ kind: 'move', layer, at: PUSH_AT, dur: PUSH_DUR, ease: 'inout', to: zin(box, origin) });

const POUR_AT = 2560;
const POUR_GAP = 165;
const PULL_AT = 4480;

const open: Step[] = [
    // 1. The espresso jug comes in at the top and tips; coffee leaves its lip as a thread.
    { kind: 'move', layer: 'jug', at: 0, dur: 300, ease: 'out', to: { opacity: 1, y: 0, turn: -55 } },
    { kind: 'move', layer: 'stream', at: 190, dur: 210, ease: 'in', to: { sy: 1 } },
    // 2. The cup fills from the bottom up, and the picture pushes in on it.
    { kind: 'move', layer: 'coffee', at: PUSH_AT, dur: 160, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'coffee', at: PUSH_AT, dur: PUSH_DUR, ease: 'inout', to: zin(SURFACE) },
    push('ground', BLEED),
    push('things', BLEED),
    push('saucer', FULL),
    push('cup', FULL),
    push('jug', GEOM.jug),
    push('stream', GEOM.stream, TOP),
    push('pitcher', GEOM.pitcher),
    // 3. The stream thins to nothing; the jug rights itself and is taken away.
    { kind: 'move', layer: 'stream', at: 1700, dur: 300, ease: 'in', to: { sx: r4(0.1 * Z) } },
    { kind: 'move', layer: 'stream', at: 1840, dur: 200, ease: 'linear', to: { opacity: 0 } },
    { kind: 'move', layer: 'jug', at: 1880, dur: 460, ease: 'in', to: { ...zin(GEOM.jug, undefined, { x: 14, y: -64 }), turn: -22, opacity: 0 } },
    // 4. The pitcher comes over the cup and tips; milk runs.
    { kind: 'move', layer: 'pitcher', at: 1760, dur: 600, ease: 'inout', to: { ...zin(GEOM.pitcher, undefined, { x: 30, y: 16 }), turn: 58 } },
    { kind: 'move', layer: 'milk', at: 2310, dur: 200, ease: 'in', to: { sy: Z } },
    // 5. The first white is pushed out to the wall of the cup; then the rosetta, layer after layer from the base
    //    to the tip, each spreading sideways from the stem, the pitcher rocking with each.
    { kind: 'move', layer: 'halo', at: 2400, dur: 650, ease: 'out', to: { opacity: 1, ...zin(SURFACE) } },
    ...STROKES.map(([layer, o], i): Step => ({ kind: 'move', layer, at: POUR_AT + i * POUR_GAP, dur: 340, ease: 'out', to: { opacity: 1, ...zin(SURFACE, o) } })),
    { kind: 'shake', layer: 'pitcher', at: 2520, dur: 1800, amp: 1.1, times: 9 },
    // 6. The milk thins to nothing; the pull-through runs down the stem from the tip and tugs each layer into its chevron.
    { kind: 'move', layer: 'milk', at: 4370, dur: 240, ease: 'in', to: { sx: r4(0.15 * Z), opacity: 0 } },
    { kind: 'move', layer: 'ros-stem', at: PULL_AT, dur: 520, ease: 'inout', to: { sy: Z } },
    ...STROKES.map(([layer, o], i): Step => ({ kind: 'move', layer, at: PULL_AT + 30 + (STROKES.length - 1 - i) * 44, dur: 220, ease: 'out', to: { y: r4(zin(SURFACE, o).y + 1.3) } })),
    // 7. The pitcher goes back, emptied, and stands straighter; steam rises.
    { kind: 'move', layer: 'pitcher', at: 4660, dur: 850, ease: 'inout', to: { ...zin(GEOM.pitcher, undefined, { x: 4, y: 22 }), turn: 9 } },
    { kind: 'move', layer: 'steam-b', at: 4800, dur: 1200, ease: 'out', to: { opacity: 1, ...zin(GEOM.steamB, FOOT) } },
    { kind: 'move', layer: 'steam-a', at: 5000, dur: 1000, ease: 'out', to: { opacity: 1, ...zin(GEOM.steamA, FOOT) } },
];

const idle: IdleStep[] = [
    // The pitcher is held, waiting to pour.
    { layer: 'pitcher', field: 'turn', amp: 1.6, period: 4600 },
    { layer: 'pitcher', field: 'y', amp: 0.8, period: 6100, phase: 0.3 },
];

const afterglow: IdleStep[] = [
    { layer: 'steam-a', field: 'x', amp: 1.6, period: 5200 },
    { layer: 'steam-a', field: 'opacity', amp: 0.2, period: 6400, phase: 0.2 },
    { layer: 'steam-b', field: 'x', amp: 2.2, period: 6100, phase: 0.4 },
    { layer: 'steam-b', field: 'sy', amp: 0.03, period: 7300 },
];

const layers: LayerDef[] = [
    { id: 'ground', art: 'ground.svg', box: BLEED, depth: 0.04 },
    { id: 'things', art: 'things.svg', box: BLEED, depth: 0.07 },
    { id: 'saucer', art: 'saucer.svg', box: FULL, depth: D - 0.1 },
    { id: 'cup', art: 'cup.svg', box: FULL, depth: D },
    // The crema waits as nothing at the bottom of the cup.
    { id: 'coffee', art: 'coffee.svg', box: SURFACE, start: { opacity: 0, y: 41.5, sx: 0.4, sy: 0.4 }, depth: D },
    // What the milk draws is placed where it will be once the picture has pushed in.
    { id: 'halo', art: 'halo.svg', box: SURFACE, start: { opacity: 0, ...zin(SURFACE, undefined, { sx: 0.82, sy: 0.82 }) }, depth: D },
    ...STROKES.map(([id, o]): LayerDef => ({ id, art: `${id}.svg`, box: SURFACE, origin: o, start: { opacity: 0, ...zin(SURFACE, o, { sx: 0.3, sy: 0.85 }) }, depth: D })),
    // The pull-through grows down from the tip.
    { id: 'ros-stem', art: 'ros-stem.svg', box: GEOM.stem, origin: TOP, start: { ...zin(GEOM.stem, TOP), sy: 0 }, depth: D },
    { id: 'stream', art: 'stream.svg', box: GEOM.stream, origin: TOP, start: { sy: 0 }, depth: D + 0.06 },
    { id: 'jug', art: 'jug.svg', box: GEOM.jug, start: { opacity: 0, x: 10, y: -44, turn: -26 }, depth: D + 0.2 },
    { id: 'milk', art: 'milk.svg', box: GEOM.milk, origin: TOP, start: { ...zin(GEOM.milk, TOP), sy: 0 }, depth: D + 0.1 },
    { id: 'pitcher', art: 'pitcher.svg', box: GEOM.pitcher, start: { turn: 26 }, depth: D + 0.22 },
    { id: 'steam-a', art: 'steam-a.svg', box: GEOM.steamA, origin: FOOT, start: { opacity: 0, ...zin(GEOM.steamA, FOOT, { y: 14, sy: 0.7 }) }, depth: D + 0.3 },
    { id: 'steam-b', art: 'steam-b.svg', box: GEOM.steamB, origin: FOOT, start: { opacity: 0, ...zin(GEOM.steamB, FOOT, { y: 14, sy: 0.7 }) }, depth: D + 0.3 },
];

export const latte: WrapperDef = {
    id: 'latte',
    name: { vi: 'Tách latte', en: 'Latte cup' },
    ambient: ['#EFE3CA', '#B07E4E', '#1E6A6C'],
    blurb: {
        vi: 'Trang sổ phác thảo ở quán: nét bút sắt, vệt cà phê thật. Tách đang trống; mở ra, espresso rót vào, sữa vẽ dần một chiếc lá, hơi nóng bay.',
        en: 'A café sketchbook page in pen and real coffee stains. The cup waits empty; open it and espresso pours, milk draws a leaf, steam curls up.',
    },
    // Cream paper, sepia for text, the one teal ink; an espresso-dark room around the sheet.
    theme: { ground: '#241710', surface: '#F6EEDE', ink: '#21140C', accent: '#1E6A6C', onAccent: '#FFFFFF', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'glass' },
    focus: [0.53, 0.47],
    size: [360, 450],
    backdrop: '#EFE3CA',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 4500,
    // An easy café line, plucked, over a walking bass; the pour is a breath of noise.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 65,
        score: together(
            tune(120, 'A4/8 C5/8 E5/4 D5/8 C5/8 A4/4 | G4/8 Bb4/8 D5/4 C5/8 A4/8 F4/4 | A4/8 C5/8 F5/2.!'),
            tune(120, 'F3/1 | Bb2/1 | F3/1', { gain: 0.4 }),
            [{ at: 0, pitch: 84, dur: 1200, inst: 'noise' as const, bend: -12, gain: 0.3 }],
        ),
    },
};
