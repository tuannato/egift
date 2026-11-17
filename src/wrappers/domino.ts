import type { IdleStep, LayerDef, NoteDef, Step, WrapperDef } from '../stage/format';
import { scaled } from './tune';

/**
 * Domino — one thing led to another, and it started with you. A chain
 * reaction of tall lacquered slabs down a flight of low steps, seen straight
 * from the side like a graphic poster: near-black slabs, two of them
 * vermilion, long flat shadows striping the ground, and a tall vermilion
 * box at the end of the run. Plain slabs: no marks of any kind on them.
 *
 * Opening: the first slab, already leaning, goes; each strikes the next and
 * comes to rest against it; the last strikes the box, whose lid jumps aside
 * and hangs; four paper streamers rise out of it in a warm light, and the
 * pale disc behind the run warms to gold.
 *
 * The stage turns whole layers, so every slab turns about its lower right
 * corner. The fall is not drawn by eye: the generator works out, from the
 * slabs' sizes and spacing, how far each can turn before it touches the next
 * (`node scripts/art/domino.gen.mjs --print`), and the constants below are
 * that print-out, copied by hand. A shadow cannot change shape, so each
 * slab's stripe on the ground is joined by a second one as the slab lies down.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/domino.gen.mjs): each SVG's viewBox is its box.
 */

const CABINET = [235.21, 146.34, 74, 186] as const;
const LID = [231.21, 135.34, 82, 11] as const;
const BEAM = [182.21, -3.66, 180, 152] as const;
const RIBBONS: readonly (readonly [readonly [number, number, number, number], readonly [number, number]])[] = [[[151, 53, 103, 104], [0.94, 0.96]], [[225, 7, 46, 148], [0.83, 0.98]], [[273, 26, 28, 128], [0.26, 0.99]], [[289, 55, 74, 101], [0.08, 0.96]]];
const SUN = [28, 48, 260, 260] as const;
const GLOW = [152.21, 16.34, 240, 240] as const;
const FLECK = [267.21, 116.34, 10, 7] as const;
const FALLEN = [[-6, 258, 74, 198], [45, 279, 96, 177], [126, 304, 96, 152]] as const;
const SLABS = [[10.5, 134, 11, 124], [31.31, 135.42, 11.5, 129.58], [53.05, 137.16, 11.99, 135.16], [75.71, 139.2, 12.49, 140.74], [99.3, 141.57, 12.98, 146.32], [123.8, 144.25, 13.48, 151.9], [149.23, 147.24, 13.97, 157.48], [175.57, 150.55, 14.47, 163.06], [202.85, 154.18, 14.96, 168.64]] as const;
/** When each slab is struck (the first: when it goes). */
const STARTS = [120, 270, 410, 550, 690, 830, 970, 1115, 1260] as const;
/** When the last slab strikes the cabinet. */
const STRIKE = 1435;
/** Each slab's fall as straight moves: [at, dur, turn]. */
const FALL: readonly (readonly (readonly [number, number, number])[])[] = [[[120, 165, 4.81], [285, 980, 37.88], [1265, 170, 43.26]], [[270, 670, 22.38], [940, 495, 39.05]], [[410, 675, 22.59], [1085, 350, 34.57]], [[550, 850, 28.48], [1400, 35, 29.88]], [[690, 720, 24.05], [1410, 25, 25.06]], [[830, 580, 19.15], [1410, 25, 20.16]], [[970, 445, 14.49], [1415, 20, 15.27]], [[1115, 320, 10.47]], [[1260, 175, 5.8]]];
/** The first slab stands leaning, about to go. */
const LEAN = 2.5;
/** Everything on the steps is one plane. */
const NEAR = 0.14;

/** The order the streamers come out in: the tall middle one first. */
const RIBBON_ORDER = [2, 0, 1, 3];

const slabId = (i: number) => `slab-${i + 1}`;

const open: Step[] = [
    // 1. The run: each slab turns about its lower right corner, strikes the next and follows it down.
    ...FALL.flatMap((keys, i) => keys.map(([at, dur, turn]): Step => ({ kind: 'move', layer: slabId(i), at, dur, to: { turn } }))),
    // The shadows of the slabs that lie down grow wider, three slabs at a time.
    { kind: 'move', layer: 'fallen-1', at: STARTS[1], dur: 420, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'fallen-2', at: STARTS[4], dur: 420, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'fallen-3', at: STARTS[7], dur: 380, ease: 'inout', to: { opacity: 1 } },
    // 2. The last slab strikes the cabinet: it shakes, and its lid jumps, turns and hangs.
    { kind: 'shake', layer: 'cabinet', at: STRIKE, dur: 300, amp: 3, times: 4 },
    { kind: 'shake', layer: 'lid', at: STRIKE, dur: 300, amp: 3, times: 4 },
    { kind: 'move', layer: 'lid', at: STRIKE + 20, dur: 300, ease: 'out', to: { x: 34, y: -42, turn: 24 } },
    { kind: 'move', layer: 'lid', at: STRIKE + 320, dur: 420, ease: 'inout', to: { y: -32 } },
    // 3. The light rises out of the mouth; paper flies.
    { kind: 'move', layer: 'glow', at: STRIKE + 50, dur: 620, ease: 'out', to: { sx: 1, sy: 1, opacity: 1 } },
    { kind: 'move', layer: 'beam', at: STRIKE + 50, dur: 100, to: { opacity: 1 } },
    { kind: 'move', layer: 'beam', at: STRIKE + 50, dur: 520, ease: 'out', to: { sx: 1, sy: 1 } },
    ...RIBBONS.map((_, i): Step => ({ kind: 'move', layer: `ribbon-${i + 1}`, at: STRIKE + 50 + RIBBON_ORDER[i]! * 60, dur: 380, ease: 'back', to: { sx: 1, sy: 1 } })),
    { kind: 'move', layer: 'sun', at: STRIKE + 80, dur: 520, ease: 'inout', to: { opacity: 0.9 } },
    { kind: 'scatter', layer: 'fleck-a', at: STRIKE + 60, dur: 960, count: 10, spread: 120, fall: 80 },
    { kind: 'scatter', layer: 'fleck-b', at: STRIKE + 90, dur: 930, count: 8, spread: 100, fall: 90 },
];

const idle: IdleStep[] = [
    // The first slab rocks on its corner.
    { layer: 'slab-1', field: 'turn', amp: 1.2, period: 2600 },
];

const afterglow: IdleStep[] = [
    { layer: 'lid', field: 'y', amp: 3, period: 3400 },
    { layer: 'lid', field: 'turn', amp: 2, period: 4600, phase: 0.2 },
    { layer: 'glow', field: 'opacity', amp: 0.14, period: 3800 },
    ...RIBBONS.map((_, i): IdleStep => ({ layer: `ribbon-${i + 1}`, field: 'turn', amp: 2.2, period: 3000 + i * 500, phase: i * 0.23 })),
    { layer: 'sun', field: 'opacity', amp: 0.08, period: 3800, phase: 0.1 },
    { layer: 'beam', field: 'sx', amp: 0.05, period: 3800, phase: 0.25 },
];

/** One knock of wood for each slab struck, rising; a deeper one for the cabinet; then the bell. */
const KNOCKS = [62, 64, 66, 69, 71, 74, 76, 78];
/** Levelled against the other tunes that ship. */
const score: NoteDef[] = scaled(0.7, [
    ...KNOCKS.map((pitch, i): NoteDef => ({ at: STARTS[i + 1]!, pitch, dur: 60, gain: 0.4 + i * 0.02, inst: 'wood' })),
    { at: STRIKE, pitch: 81, dur: 80, gain: 0.6, inst: 'wood' },
    { at: STRIKE, pitch: 50, dur: 120, gain: 0.5, inst: 'wood' },
    { at: STRIKE + 60, pitch: 74, dur: 300, gain: 0.34 },
    { at: 1750, pitch: 62, dur: 1900, gain: 0.26 },
    { at: 1750, pitch: 86, dur: 1900, gain: 0.5 },
]);

const layers: LayerDef[] = [
    { id: 'ground', art: 'ground.svg', box: [-6, -6, 372, 462], depth: NEAR },
    ...FALLEN.map((box, i): LayerDef => ({ id: `fallen-${i + 1}`, art: `fallen-${i + 1}.svg`, box, start: { opacity: 0 }, depth: NEAR })),
    // The disc behind the run, lit when the cabinet opens.
    { id: 'sun', art: 'sun.svg', box: SUN, start: { opacity: 0 }, depth: NEAR },
    // The light grows from the cabinet's mouth, behind everything that stands.
    { id: 'glow', art: 'glow.svg', box: GLOW, origin: [0.5, 130 / 240], start: { sx: 0.15, sy: 0.15, opacity: 0 }, depth: NEAR },
    { id: 'beam', art: 'beam.svg', box: BEAM, origin: [0.5, 1], start: { sx: 0.5, sy: 0, opacity: 0 }, depth: NEAR },
    // The streamers grow from the mouth, behind the box.
    ...RIBBONS.map(([box, origin], i): LayerDef => ({ id: `ribbon-${i + 1}`, art: `ribbon-${i + 1}.svg`, box, origin, start: { sx: 0, sy: 0 }, depth: NEAR })),
    ...SLABS.map((box, i): LayerDef => ({ id: slabId(i), art: `${slabId(i)}.svg`, box, origin: [1, 1], ...(i === 0 ? { start: { turn: LEAN } } : {}), depth: NEAR })),
    { id: 'cabinet', art: 'cabinet.svg', box: CABINET, depth: NEAR },
    { id: 'lid', art: 'lid.svg', box: LID, depth: NEAR },
    { id: 'fleck-a', art: 'fleck-a.svg', box: FLECK },
    { id: 'fleck-b', art: 'fleck-b.svg', box: FLECK },
];

export const domino: WrapperDef = {
    id: 'domino',
    name: { vi: 'Domino', en: 'Domino' },
    ambient: ['#1B1A1D', '#E8451E', '#FFC552'],
    blurb: {
        vi: 'Một việc dẫn tới việc khác, và bắt đầu từ bạn. Những phiến sơn mài đổ nối nhau xuống bậc, tới chiếc hộp son bật nắp, tung dải giấy.',
        en: 'One thing led to another, and it started with you. Lacquered slabs fall down the steps to a vermilion box; its lid pops, streamers fly.',
    },
    // The slabs' lacquer for the capsule, the ground's cream for the words, the cabinet's vermilion for the one loud colour.
    theme: { ground: '#0E0D0F', surface: '#1B1A1D', ink: '#F4EBD9', accent: '#E8451E', onAccent: '#0E0D0F', material: 'lacquer', corner: 'soft', face: 'poster', voice: 'chime' },
    focus: [0.74, 0.4],
    size: [360, 450],
    backdrop: '#F4EBD9',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 1750,
    sound: { v: 1, inst: 'bell', tonic: 74, score },
};
