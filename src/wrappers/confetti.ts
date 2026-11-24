import type { IdleStep, NoteDef, Step, WrapperDef } from '../stage/format';

/**
 * Confetti drop — for the New Year, or any big celebration, on a LIGHT ground
 * (unlike `midnight` and `balldrop`, which are gold on night). The view is
 * straight up at an ivory ceiling, in bold cut paper: a wide, shallow plaster
 * medallion drawn as a few flat sand forms, a quiet cornice, and slung across
 * the middle a fine ink net holding a heap of large cut-paper pieces (fronds,
 * leaves, half-moons, arches, a few discs and blocks) in mustard, terracotta,
 * deep teal, sand and a little ink. One knot gathers the net at the middle, a
 * short cord hangs from it.
 * Opening: the cord is pulled and the knot lets go; each half of the net swings
 * down about its hook at the outer top corner; the heap comes down toward the
 * viewer in six planes, the near ones larger and faster, each turning a little,
 * and leaves through the edges of the frame; small leaves sparkle; in the
 * cleared middle a gold disc of light rises with soft rays. Open, the two
 * halves hang at the sides and three large pieces rest in the corners.
 *
 * The stage scales whole layers about a pivot inside their box, so a plane
 * "comes nearer" by scaling about its own centre while it slides by
 * (k - 1) x (its centre - the focus): the same as scaling about the focus.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/confetti.gen.mjs): each SVG's viewBox is its box. The boxes
 * below are copied by hand from what the generator prints.
 */

type Box = readonly [number, number, number, number];
/** The focus, in canvas units: the knot, and where the light rises. */
const FX = 180, FY = 218;
/** The moment the knot lets go. */
const LET_GO = 440;
/** How far each half of the net swings about its hook, in degrees. */
const SWING = 74;

const BOX: Readonly<Record<string, Box>> = {
    ceiling: [0, 0, 360, 450],
    glow: [48, 86, 264, 264],
    'rest-a': [-15, 292, 130, 200],
    'rest-b': [282, -23, 127, 121],
    'rest-c': [248, 351, 140, 118],
    'rest-d': [222, 420, 56, 56],
    'heap-a': [23, 97, 328, 264],
    'heap-b': [18, 99, 146, 253],
    'heap-c': [204, 119, 150, 251],
    'heap-d': [103, 80, 190, 65],
    'heap-e': [89, 278, 212, 79],
    'heap-f': [104, 164, 149, 143],
    'net-l': [3, 82, 180, 272],
    'net-r': [177, 82, 180, 272],
    knot: [163, 201, 34, 34],
    cord: [172, 222, 16, 94],
    bit: [174, 215, 12, 6],
};

/**
 * The planes of the heap, far to near: when each starts, how long it takes, how large it grows, an extra
 * drift on top of growing away from the focus, and how far it turns.
 */
const PLANES: readonly (readonly [string, number, number, number, number, number, number])[] = [
    ['heap-a', 680, 1000, 2.8, 0, 40, 6],
    ['heap-b', 660, 1200, 2.5, -120, 70, -14],
    ['heap-c', 680, 1200, 2.5, 120, 70, 13],
    ['heap-d', 640, 1100, 2.4, 0, -120, 9],
    ['heap-e', 600, 1000, 2.8, 0, 190, -10],
    ['heap-f', 580, 900, 3.4, 0, 130, 12],
];

/** A plane grown by `k` about the focus: the slide that goes with scaling about its own centre. */
function nearer(id: string, k: number, dx: number, dy: number): { x: number; y: number } {
    const [x, y, w, h] = BOX[id]!;
    return { x: Math.round((k - 1) * (x + w / 2 - FX) + dx), y: Math.round((k - 1) * (y + h / 2 - FY) + dy) };
}

const open: Step[] = [
    // 1. The cord is pulled: it draws down a little, the knot and the net shiver.
    { kind: 'move', layer: 'cord', at: 0, dur: 320, ease: 'in', to: { y: 8 } },
    { kind: 'shake', layer: 'knot', at: 120, dur: 300, amp: 1.6, times: 3 },
    { kind: 'shake', layer: 'cord', at: 120, dur: 300, amp: 1.6, times: 3 },
    { kind: 'shake', layer: 'net-l', at: 160, dur: 260, amp: 1, times: 2 },
    { kind: 'shake', layer: 'net-r', at: 160, dur: 260, amp: -1, times: 2 },
    // 2. The knot lets go and falls away with its cord.
    { kind: 'move', layer: 'knot', at: LET_GO, dur: 640, ease: 'in', to: { y: 300, turn: 40 } },
    { kind: 'move', layer: 'cord', at: LET_GO, dur: 640, ease: 'in', to: { y: 310, turn: -24 } },
    // 3. Each half of the net swings down about its hook, runs a little past, and hangs.
    { kind: 'move', layer: 'net-l', at: LET_GO, dur: 1100, ease: 'back', to: { turn: SWING } },
    { kind: 'move', layer: 'net-r', at: LET_GO + 40, dur: 1100, ease: 'back', to: { turn: -SWING } },
    // 4. The heap comes down toward the viewer, plane by plane, and leaves through the edges.
    ...PLANES.flatMap(([layer, at, dur, k, dx, dy, turn]): Step[] => [
        { kind: 'move', layer, at, dur, ease: 'in', to: { sx: k, sy: k, turn, ...nearer(layer, k, dx, dy) } },
        { kind: 'move', layer, at: at + dur * 0.6, dur: dur * 0.3, to: { opacity: 0 } },
    ]),
    { kind: 'scatter', layer: 'bit', at: 700, dur: 1800, count: 22, spread: 150, fall: 150 },
    // 5. In the cleared middle the light rises.
    { kind: 'move', layer: 'glow', at: 980, dur: 1100, ease: 'out', to: { opacity: 1, sx: 1, sy: 1, y: 0 } },
    // 6. The pieces in the corners settle into view.
    { kind: 'move', layer: 'rest-a', at: 1300, dur: 1200, ease: 'out', to: { x: 0, y: 0, turn: 0 } },
    { kind: 'move', layer: 'rest-b', at: 1380, dur: 1200, ease: 'out', to: { x: 0, y: 0, turn: 0 } },
    { kind: 'move', layer: 'rest-d', at: 1420, dur: 1200, ease: 'out', to: { y: 0 } },
    { kind: 'move', layer: 'rest-c', at: 1460, dur: 1200, ease: 'out', to: { x: 0, y: 0, turn: 0 } },
];

const idle: IdleStep[] = [
    // The cord swings a little from the knot; the net breathes.
    { layer: 'cord', field: 'turn', amp: 3, period: 3600 },
    { layer: 'net-l', field: 'sy', amp: 0.008, period: 5200 },
    { layer: 'net-r', field: 'sy', amp: 0.008, period: 5200, phase: 0.1 },
];

const afterglow: IdleStep[] = [
    { layer: 'net-l', field: 'turn', amp: 1.4, period: 5400 },
    { layer: 'net-r', field: 'turn', amp: 1.4, period: 6200, phase: 0.5 },
    { layer: 'rest-a', field: 'turn', amp: 1.6, period: 4800, phase: 0.2 },
    { layer: 'rest-b', field: 'turn', amp: 1.2, period: 5600, phase: 0.6 },
    { layer: 'rest-c', field: 'turn', amp: 1.4, period: 5000, phase: 0.85 },
    { layer: 'glow', field: 'opacity', amp: 0.1, period: 4600 },
    { layer: 'glow', field: 'sx', amp: 0.025, period: 4600, phase: 0.25 },
    { layer: 'glow', field: 'sy', amp: 0.025, period: 4600, phase: 0.25 },
];

/** How hard the whole tune is played: levelled against the other wrappers' tunes. */
const LEVEL = 1.84;
const g = (gain: number): number => Math.min(1, Math.round(gain * LEVEL * 100) / 100);
/** A soft rustle of paper as the cord draws, then a short bright brass figure that climbs and lands on home. */
const score: NoteDef[] = [
    { at: 0, pitch: 80, dur: 120, gain: g(0.12), inst: 'noise' },
    { at: 180, pitch: 84, dur: 120, gain: g(0.14), inst: 'noise' },
    { at: LET_GO, pitch: 78, dur: 360, gain: g(0.2), inst: 'noise', bend: -5 },
    { at: 700, pitch: 67, dur: 120, gain: g(0.48) },
    { at: 840, pitch: 72, dur: 120, gain: g(0.5) },
    { at: 980, pitch: 76, dur: 140, gain: g(0.52) },
    { at: 1140, pitch: 79, dur: 260, gain: g(0.56) },
    { at: 1420, pitch: 76, dur: 120, gain: g(0.46) },
    { at: 1560, pitch: 48, dur: 1500, gain: g(0.28), inst: 'pad' },
    { at: 1560, pitch: 72, dur: 1500, gain: g(0.58) },
];

export const confetti: WrapperDef = {
    id: 'confetti',
    name: { vi: 'Giấy màu thả trần', en: 'Confetti drop' },
    ambient: ['#F4EEE1', '#D9A230', '#1E5A57'],
    blurb: {
        vi: 'Giấy cắt màu trên trần sáng. Kéo dây, lưới bung đôi, những mảnh giấy lớn rơi về phía bạn và một vầng sáng vàng hiện ra.',
        en: 'Cut paper on a light ceiling. Pull the cord: the net swings open, large paper shapes fall toward you and a gold light rises.',
    },
    // Ivory paper as a light plate, ink for the words, the deep teal for the one loud colour.
    theme: { ground: '#1D1B19', surface: '#F4EEE1', ink: '#1D1B19', accent: '#1E5A57', onAccent: '#F4EEE1', material: 'plate', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [FX / 360, FY / 450],
    size: [360, 450],
    backdrop: '#F4EEE1',
    layers: [
        { id: 'ceiling', art: 'ceiling.svg', box: BOX.ceiling!, depth: 0.04 },
        { id: 'glow', art: 'glow.svg', box: BOX.glow!, start: { opacity: 0, sx: 0.3, sy: 0.3, y: 24 }, depth: 0.1 },
        { id: 'rest-a', art: 'rest-a.svg', box: BOX['rest-a']!, origin: [0.2, 0.9], start: { x: -26, y: 30, turn: -6 }, depth: 0.3 },
        { id: 'rest-b', art: 'rest-b.svg', box: BOX['rest-b']!, origin: [0.6, 0.3], start: { x: 22, y: -24, turn: 10 }, depth: 0.3 },
        { id: 'rest-c', art: 'rest-c.svg', box: BOX['rest-c']!, origin: [0.6, 0.8], start: { x: 24, y: 26, turn: 8 }, depth: 0.3 },
        { id: 'rest-d', art: 'rest-d.svg', box: BOX['rest-d']!, start: { y: 22 }, depth: 0.3 },
        { id: 'heap-a', art: 'heap-a.svg', box: BOX['heap-a']!, depth: 0.2 },
        { id: 'heap-b', art: 'heap-b.svg', box: BOX['heap-b']!, depth: 0.3 },
        { id: 'heap-c', art: 'heap-c.svg', box: BOX['heap-c']!, depth: 0.3 },
        { id: 'heap-d', art: 'heap-d.svg', box: BOX['heap-d']!, depth: 0.35 },
        { id: 'heap-e', art: 'heap-e.svg', box: BOX['heap-e']!, depth: 0.4 },
        { id: 'heap-f', art: 'heap-f.svg', box: BOX['heap-f']!, depth: 0.45 },
        { id: 'net-l', art: 'net-l.svg', box: BOX['net-l']!, origin: [0.022, 0.081], depth: 0.5 },
        { id: 'net-r', art: 'net-r.svg', box: BOX['net-r']!, origin: [0.978, 0.081], depth: 0.5 },
        { id: 'knot', art: 'knot.svg', box: BOX.knot!, depth: 0.55 },
        { id: 'cord', art: 'cord.svg', box: BOX.cord!, origin: [0.5, 0], depth: 0.55 },
        { id: 'bit', art: 'bit.svg', box: BOX.bit! },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1500,
    sound: { v: 1, inst: 'brass', tonic: 72, score },
};
