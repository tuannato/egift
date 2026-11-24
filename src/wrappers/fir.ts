import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled } from './tune';

/**
 * Fir — the winter-holiday tree, seen from straight above, as a modern screen
 * print: moss green, brick red, cream and gold on a herringbone floor. Four
 * rings of boughs make one big rosette that fills the frame, every bough two
 * flat faces, one towards the light. A cord of unlit bulbs winds over them
 * from the rim to the top, where a small brass glint waits. Round the edges:
 * corners of parcels in plain paper, a rug, a chair.
 * Opening: the rings of boughs turn against each other and settle; the bulbs
 * come up ring by ring from the rim inwards and their light falls on the
 * floor; a gold eight-ray glint opens at the top with one scatter of flecks.
 * After: the bulbs twinkle out of step and the glint breathes.
 *
 * The stage turns whole layers, so each ring is one picture carrying its own
 * length of the cord: the cord parts while the rings turn and joins again
 * when they settle.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/fir.gen.mjs): each SVG's viewBox is its box.
 */

/** The rings, lowest first: how far each turns before it settles, and when it starts. */
const RINGS = [
    { layer: 'ring-1', turn: -18, at: 0 },
    { layer: 'ring-2', turn: 17, at: 90 },
    { layer: 'ring-3', turn: -16, at: 180 },
    { layer: 'ring-4', turn: 15, at: 270 },
] as const;

/** The three sets of bulbs, from the rim inwards: when each comes up. */
const LIT = [
    { layer: 'lit-1', at: 1500 },
    { layer: 'lit-2', at: 1900 },
    { layer: 'lit-3', at: 2300 },
] as const;

/** How bright a set of bulbs rests, so that a twinkle has room above it and below. */
const REST = 0.8;

const open: Step[] = [
    // 1. The rings of boughs turn against each other, swelling a little, and settle back past their place.
    ...RINGS.flatMap((r): Step[] => [
        { kind: 'move', layer: r.layer, at: r.at, dur: 700, ease: 'inout', to: { turn: r.turn, sx: 1.05, sy: 1.05 } },
        { kind: 'move', layer: r.layer, at: r.at + 700, dur: 900, ease: 'back', to: { turn: 0, sx: 1, sy: 1 } },
    ]),
    // 2. The bulbs come up in three fades from the rim inwards; their light spreads on the floor.
    ...LIT.map((l): Step => ({ kind: 'move', layer: l.layer, at: l.at, dur: 620, ease: 'out', to: { opacity: REST } })),
    { kind: 'move', layer: 'warm', at: 1500, dur: 1500, ease: 'inout', to: { opacity: 1 } },
    // 3. The glint opens at the top: the halo first, then the eight rays, turning into place; one scatter of gold.
    { kind: 'move', layer: 'halo', at: 2800, dur: 500, ease: 'out', to: { opacity: 0.8, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'glint', at: 2860, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'glint', at: 2860, dur: 640, ease: 'back', to: { sx: 1, sy: 1, turn: 0 } },
    { kind: 'scatter', layer: 'fleck', at: 3000, dur: 1300, count: 16, spread: 128, fall: 36 },
    // 4. A second, paler light on some of the bulbs.
    { kind: 'move', layer: 'sparkle', at: 3200, dur: 800, ease: 'inout', to: { opacity: 0.55 } },
];

/** Closed: the tree barely stirs, ring against ring. */
const idle: IdleStep[] = [
    { layer: 'ring-1', field: 'turn', amp: 0.5, period: 7000 },
    { layer: 'ring-2', field: 'turn', amp: 0.6, period: 7000, phase: 0.5 },
    { layer: 'ring-3', field: 'turn', amp: 0.7, period: 5600, phase: 0.2 },
    { layer: 'ring-4', field: 'turn', amp: 0.9, period: 5600, phase: 0.7 },
];

/** Open: the sets of bulbs twinkle out of step, the paler light on its own time, and the glint breathes. */
const afterglow: IdleStep[] = [
    { layer: 'lit-1', field: 'opacity', amp: 0.2, period: 2900 },
    { layer: 'lit-2', field: 'opacity', amp: 0.2, period: 2300, phase: 0.4 },
    { layer: 'lit-3', field: 'opacity', amp: 0.2, period: 3500, phase: 0.75 },
    { layer: 'sparkle', field: 'opacity', amp: 0.4, period: 1900, phase: 0.2 },
    { layer: 'glint', field: 'sx', amp: 0.05, period: 4200 },
    { layer: 'glint', field: 'sy', amp: 0.05, period: 4200 },
    { layer: 'halo', field: 'opacity', amp: 0.18, period: 4200 },
    { layer: 'warm', field: 'opacity', amp: 0.08, period: 2900 },
];

export const fir: WrapperDef = {
    id: 'fir',
    name: { vi: 'Cây thông nhìn từ trên', en: 'Tree from above' },
    ambient: ['#1F4D3A', '#B23A26', '#E6B34A'],
    blurb: {
        vi: 'Cây thông nhìn thẳng từ trên xuống. Các tầng lá xoay rồi yên, đèn sáng dần từ ngoài vào trong, và một tia sáng vàng mở ra ở ngọn.',
        en: 'A fir tree from straight above. Its rings of boughs turn and settle, the bulbs come up from the rim in, and a gold glint opens at the top.',
    },
    // Cream paper, the tree's darkest green for the room and the words, brick red for the one loud colour.
    theme: { ground: '#143326', surface: '#F3E9D2', ink: '#143326', accent: '#B23A26', onAccent: '#F3E9D2', material: 'plate', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.48],
    size: [360, 450],
    backdrop: '#CF9A62',
    // The boxes are those the generator writes (copied by hand from what it prints; a mismatch shows as stretched art).
    layers: [
        { id: 'floor', art: 'floor.svg', box: [-6, -6, 372, 462], depth: 0.04 },
        // Drawn small and shown large: a soft round of light needs no more picture than this.
        { id: 'warm', art: 'warm.svg', box: [80, 115, 200, 200], start: { opacity: 0, sx: 2.3, sy: 2.3 }, depth: 0.04 },
        { id: 'ring-1', art: 'ring-1.svg', box: [15, 50, 330, 330], depth: 0.1 },
        { id: 'ring-2', art: 'ring-2.svg', box: [53, 88, 254, 254], depth: 0.17 },
        { id: 'ring-3', art: 'ring-3.svg', box: [89, 124, 182, 182], depth: 0.24 },
        { id: 'ring-4', art: 'ring-4.svg', box: [123, 158, 114, 114], depth: 0.3 },
        { id: 'lit-1', art: 'lit-1.svg', box: [23, 58, 314, 314], start: { opacity: 0 }, depth: 0.1 },
        { id: 'lit-2', art: 'lit-2.svg', box: [61, 96, 238, 238], start: { opacity: 0 }, depth: 0.17 },
        { id: 'lit-3', art: 'lit-3.svg', box: [97, 132, 166, 166], start: { opacity: 0 }, depth: 0.26 },
        { id: 'sparkle', art: 'sparkle.svg', box: [23, 58, 314, 314], start: { opacity: 0 }, depth: 0.17 },
        { id: 'halo', art: 'halo.svg', box: [104, 139, 152, 152], start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.32 },
        { id: 'glint', art: 'glint.svg', box: [130, 165, 100, 100], start: { opacity: 0, sx: 0.1, sy: 0.1, turn: -45 }, depth: 0.32 },
        { id: 'fleck', art: 'fleck.svg', box: [176, 211, 8, 8] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 3000,
    // A soft pad under four bells, one for the stir and one for each ring of lights, climbing; the last is home, as the glint opens.
    sound: {
        v: 1,
        inst: 'bell',
        tonic: 67,
        score: scaled(0.8, [
            { at: 0, pitch: 55, dur: 3900, gain: 0.3, inst: 'pad' },
            { at: 0, pitch: 62, dur: 3900, gain: 0.26, inst: 'pad' },
            { at: 700, pitch: 74, dur: 500, gain: 0.45 },
            { at: 1500, pitch: 79, dur: 400, gain: 0.55 },
            { at: 1900, pitch: 83, dur: 400, gain: 0.58 },
            { at: 2300, pitch: 86, dur: 500, gain: 0.6 },
            { at: 2860, pitch: 79, dur: 1500, gain: 0.7 },
            { at: 2860, pitch: 67, dur: 1500, gain: 0.4 },
        ]),
    },
};
