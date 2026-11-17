import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Sakura — a row of cherry trees along a canal, for early spring and good
 * wishes. Flat perspective: two stone embankments run to one point, a small
 * vermilion bridge far off, blank paper lanterns strung from tree to tree, a
 * clump of reeds in the water under the left bank.
 * Closed, the branches are bare ink with buds. Opening: the canopies bloom
 * from the far end of the canal to the near one, the lanterns light one group
 * after another, petals cross the frame in two drifts and settle on the water.
 *
 * The stage scales and fades whole layers, so a canopy is one layer of flat
 * blobs growing out of its tree's fork; the bare trees in front of it are
 * their own layers, so that a farther canopy blooms behind nearer branches.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/sakura.gen.mjs): each SVG's viewBox is its box. The boxes and
 * pivots below are the ones the generator prints.
 */

/** The canopies, far to near, left then right at each depth. */
const BLOOMS = ['bloom-far-l', 'bloom-far-r', 'bloom-mid-l', 'bloom-mid-r', 'bloom-near-l', 'bloom-near-r'] as const;
const LIT = ['lit-1', 'lit-2', 'lit-3', 'lit-4'] as const;
/** Everything that hangs on the lantern lines moves as one. */
const HUNG = ['lanterns', ...LIT] as const;

/** A canopy before it blooms: small, about its tree's fork, and not there. */
const BUD = { opacity: 0, sx: 0.3, sy: 0.3 } as const;

const open: Step[] = [
    // 1. The canopies bloom from far to near: each grows out of its fork past full size and settles.
    ...BLOOMS.flatMap((layer, i): Step[] => [
        { kind: 'move', layer, at: 80 + i * 220, dur: 260, ease: 'out', to: { opacity: 1 } },
        { kind: 'move', layer, at: 80 + i * 220, dur: 640, ease: 'back', to: { sx: 1, sy: 1 } },
    ]),
    // 2. The lanterns light, far to near.
    ...LIT.map((layer, i): Step => ({ kind: 'move', layer, at: 420 + i * 300, dur: 380, ease: 'out', to: { opacity: 1 } })),
    // 3. Two drifts of petals cross the frame on a slant and are gone; a few more burst from the middle.
    { kind: 'move', layer: 'drift-a', at: 900, dur: 1300, ease: 'linear', to: { x: 80, y: 90 } },
    { kind: 'move', layer: 'drift-a', at: 900, dur: 300, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'drift-a', at: 1650, dur: 550, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'drift-b', at: 1300, dur: 1300, ease: 'linear', to: { x: 70, y: 76 } },
    { kind: 'move', layer: 'drift-b', at: 1300, dur: 300, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'drift-b', at: 2050, dur: 550, ease: 'in', to: { opacity: 0 } },
    { kind: 'scatter', layer: 'petal', at: 1500, dur: 1000, count: 16, spread: 150, fall: 120 },
    // 4. Petals lie on the water.
    { kind: 'move', layer: 'afloat', at: 1500, dur: 900, ease: 'inout', to: { opacity: 1 } },
];

/** The water's bands slide against each other; the lantern lines swing a little. */
const always: IdleStep[] = [
    { layer: 'ripple-near', field: 'x', amp: 6, period: 5600 },
    { layer: 'ripple-far', field: 'x', amp: 3, period: 6800, phase: 0.4 },
    { layer: 'reeds', field: 'turn', amp: 1.6, period: 4400, phase: 0.1 },
    ...HUNG.map((layer): IdleStep => ({ layer, field: 'x', amp: 1.4, period: 4800, phase: 0.2 })),
];

const afterglow: IdleStep[] = [
    ...always,
    // The canopies stir, each out of step with the next.
    ...BLOOMS.map((layer, i): IdleStep => ({ layer, field: 'turn', amp: 1, period: 5200 + i * 380, phase: (i * 0.37) % 1 })),
    { layer: 'afloat', field: 'x', amp: 4, period: 6200, phase: 0.6 },
];

export const sakura: WrapperDef = {
    id: 'sakura',
    name: { vi: 'Hàng anh đào', en: 'Cherry row' },
    ambient: ['#C9B1D6', '#F49AB6', '#C8371F'],
    blurb: {
        vi: 'Hai hàng anh đào dọc con kênh. Cành trơ nụ; hoa nở từ xa đến gần, đèn lồng sáng dần, cánh hoa bay rồi nằm trên mặt nước.',
        en: 'Cherry trees along a canal. Bare branches in bud bloom from far to near, the lanterns light, petals drift and settle on the water.',
    },
    // Lantern paper, trunk ink, the bridge's vermilion for the one loud colour.
    theme: { ground: '#1E1420', surface: '#FFF8EE', ink: '#1E1420', accent: '#C8371F', onAccent: '#FFF8EE', material: 'glass', corner: 'soft', face: 'serif', voice: 'chime' },
    focus: [0.5, 0.5],
    size: [360, 450],
    backdrop: '#C9B1D6',
    layers: [
        { id: 'scene', art: 'scene.svg', box: [-6, -6, 372, 462], depth: 0.04 },
        { id: 'ripple-far', art: 'ripple-far.svg', box: [108, 293, 144, 66], depth: 0.06 },
        { id: 'ripple-near', art: 'ripple-near.svg', box: [26, 366, 308, 90], depth: 0.08 },
        { id: 'afloat', art: 'afloat.svg', box: [26, 290, 308, 166], start: { opacity: 0 }, depth: 0.08 },
        { id: 'reeds', art: 'reeds.svg', box: [3, 344, 93, 101], origin: [0.552, 0.95], depth: 0.12 },
        { id: 'bloom-far-l', art: 'bloom-far-l.svg', box: [56, 157, 117, 81], origin: [0.626, 0.913], start: BUD, depth: 0.1 },
        { id: 'bloom-far-r', art: 'bloom-far-r.svg', box: [184, 160, 117, 73], origin: [0.4, 0.972], start: BUD, depth: 0.1 },
        { id: 'tree-mid-l', art: 'tree-mid-l.svg', box: [-6, 108, 184, 191], depth: 0.2 },
        { id: 'tree-mid-r', art: 'tree-mid-r.svg', box: [195, 106, 171, 193], depth: 0.2 },
        { id: 'bloom-mid-l', art: 'bloom-mid-l.svg', box: [-6, 109, 182, 135], origin: [0.576, 0.925], start: BUD, depth: 0.2 },
        { id: 'bloom-mid-r', art: 'bloom-mid-r.svg', box: [190, 109, 176, 130], origin: [0.405, 0.961], start: BUD, depth: 0.2 },
        { id: 'lanterns', art: 'lanterns.svg', box: [-6, 223, 372, 69], depth: 0.26 },
        { id: 'lit-1', art: 'lit-1.svg', box: [123, 228, 114, 19], start: { opacity: 0 }, depth: 0.26 },
        { id: 'lit-2', art: 'lit-2.svg', box: [87, 230, 186, 29], start: { opacity: 0 }, depth: 0.26 },
        { id: 'lit-3', art: 'lit-3.svg', box: [47, 234, 266, 44], start: { opacity: 0 }, depth: 0.26 },
        { id: 'lit-4', art: 'lit-4.svg', box: [-6, 236, 372, 68], start: { opacity: 0 }, depth: 0.26 },
        { id: 'tree-near-l', art: 'tree-near-l.svg', box: [-6, 20, 169, 334], depth: 0.4 },
        { id: 'tree-near-r', art: 'tree-near-r.svg', box: [198, 11, 168, 343], depth: 0.4 },
        { id: 'bloom-near-l', art: 'bloom-near-l.svg', box: [-6, 19, 173, 227], origin: [0.214, 0.976], start: BUD, depth: 0.4 },
        { id: 'bloom-near-r', art: 'bloom-near-r.svg', box: [198, 9, 168, 236], origin: [0.78, 0.981], start: BUD, depth: 0.4 },
        { id: 'drift-a', art: 'drift-a.svg', box: [60, 60, 230, 190], start: { opacity: 0, x: -80, y: -70 }, depth: 0.6 },
        { id: 'drift-b', art: 'drift-b.svg', box: [66, 140, 230, 190], start: { opacity: 0, x: -90, y: -60 }, depth: 0.7 },
        { id: 'petal', art: 'petal.svg', box: [175, 176, 10, 8] },
    ],
    idle: always,
    afterglow,
    open,
    revealAt: 1800,
    // Five plucked notes of a pentatonic scale climbing in a koto's register, over a held tone.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 62,
        score: scaled(0.75, together(
            tune(150, 'A4/4 D5/4 Eb5/4 G5/4 | A5/1!'),
            tune(150, 'D3/1 | [D3 A3]/1', { inst: 'pad', gain: 0.3 }),
        )),
    },
};
