import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Seeds — a packet of seeds, for a new shop, a new start, money "to begin
 * with". A two-ink stencil print: flat shapes, the second ink a little out of
 * place, a sun made of dots. A packet stands in a garden bed between two
 * stakes. Opening: its folded top comes away, the packet tips and pours,
 * seed falls to the bed, a stem climbs, leaves break out pair by pair and a
 * flower opens at the top; the packet stands back.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/seeds.gen.mjs): each SVG's viewBox is its box.
 */

/** A leaf grows from its joint on the stem: nothing, then full size with a little overshoot. */
const leafOut = (layer: string, at: number): Step => ({ kind: 'move', layer, at, dur: 420, ease: 'back', to: { sx: 1, sy: 1 } });

const open: Step[] = [
    // 1. The folded top comes away.
    { kind: 'shake', layer: 'packet', at: 0, dur: 240, amp: 1.2, times: 2 },
    { kind: 'move', layer: 'flap', at: 180, dur: 520, ease: 'in', to: { x: 54, y: -70, turn: 38, opacity: 0 } },
    // 2. The packet steps to the left and tips over to pour.
    { kind: 'move', layer: 'packet', at: 420, dur: 620, ease: 'inout', to: { x: -92, turn: 34 } },
    { kind: 'scatter', layer: 'seed', at: 900, dur: 900, count: 12, spread: 46, fall: 176 },
    { kind: 'scatter', layer: 'seed', at: 1080, dur: 800, count: 8, spread: 60, fall: 170 },
    // 3. A stem climbs out of the bed; the packet stands back up, out of the way.
    { kind: 'move', layer: 'stem', at: 1320, dur: 900, ease: 'out', to: { sy: 1 } },
    { kind: 'move', layer: 'packet', at: 1500, dur: 700, ease: 'inout', to: { x: -128, y: 14, turn: -7 } },
    // 4. Leaves, pair by pair, as the stem passes their joints.
    leafOut('leaf-l1', 1560),
    leafOut('leaf-r1', 1640),
    leafOut('leaf-l2', 1800),
    leafOut('leaf-r2', 1880),
    leafOut('leaf-l3', 2040),
    leafOut('leaf-r3', 2120),
    // 5. The flower opens at the top, and the sun swells once.
    { kind: 'move', layer: 'bloom', at: 2260, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'bloom', at: 2260, dur: 620, ease: 'back', to: { sx: 1, sy: 1, turn: 0 } },
    { kind: 'move', layer: 'sun', at: 2300, dur: 520, ease: 'back', to: { sx: 1.1, sy: 1.1 } },
];

const idle: IdleStep[] = [
    { layer: 'packet', field: 'y', amp: 2, period: 5600 },
    { layer: 'flap', field: 'y', amp: 2, period: 5600 },
    { layer: 'sun', field: 'sx', amp: 0.025, period: 6200 },
    { layer: 'sun', field: 'sy', amp: 0.025, period: 6200 },
];

const afterglow: IdleStep[] = [
    { layer: 'bloom', field: 'turn', amp: 5, period: 5200 },
    { layer: 'leaf-l1', field: 'turn', amp: 3, period: 4600 },
    { layer: 'leaf-r1', field: 'turn', amp: 3, period: 4600, phase: 0.5 },
    { layer: 'leaf-l2', field: 'turn', amp: 3.5, period: 4200, phase: 0.2 },
    { layer: 'leaf-r2', field: 'turn', amp: 3.5, period: 4200, phase: 0.7 },
    { layer: 'leaf-l3', field: 'turn', amp: 4, period: 3800, phase: 0.4 },
    { layer: 'leaf-r3', field: 'turn', amp: 4, period: 3800, phase: 0.9 },
    { layer: 'sun', field: 'sx', amp: 0.025, period: 6200 },
    { layer: 'sun', field: 'sy', amp: 0.025, period: 6200 },
];

const NONE = { sx: 0, sy: 0 } as const;

export const seeds: WrapperDef = {
    id: 'seeds',
    name: { vi: 'Gói hạt giống', en: 'Seeds' },
    ambient: ['#3F8A4F', '#D0607A', '#E0A93B'],
    blurb: {
        vi: 'Tranh in hai màu chồng. Gói hạt nghiêng, hạt rơi xuống luống, thân vươn lên, lá bật từng đôi và hoa nở.',
        en: 'A two-ink stencil print. The packet tips, seed falls to the bed, a stem climbs, leaves break out in pairs and a flower opens.',
    },
    // The print's paper, a near-black green for words, the flower's deeper pink for the one loud colour.
    theme: { ground: '#0D1710', surface: '#F5EEDB', ink: '#08110B', accent: '#A8405C', onAccent: '#FFFFFF', material: 'glass', corner: 'soft', face: 'slab', voice: 'chime' },
    focus: [0.5, 0.5],
    size: [360, 450],
    backdrop: '#F3ECD8',
    layers: [
        { id: 'field', art: 'field.svg', box: [-6, -6, 372, 462], depth: 0.05 },
        { id: 'sun', art: 'sun.svg', box: [202, 18, 148, 148], depth: 0.1 },
        { id: 'stem', art: 'stem.svg', box: [173, 146, 14, 216], origin: [0.5, 1], start: { sy: 0 }, depth: 0.35 },
        { id: 'leaf-l1', art: 'leaf-l1.svg', box: [98, 266, 84, 72], origin: [0.976, 0.778], start: NONE, depth: 0.35 },
        { id: 'leaf-r1', art: 'leaf-r1.svg', box: [178, 266, 84, 72], origin: [0.024, 0.778], start: NONE, depth: 0.35 },
        { id: 'leaf-l2', art: 'leaf-l2.svg', box: [112, 222, 70, 59], origin: [0.971, 0.78], start: NONE, depth: 0.35 },
        { id: 'leaf-r2', art: 'leaf-r2.svg', box: [178, 222, 70, 59], origin: [0.029, 0.78], start: NONE, depth: 0.35 },
        { id: 'leaf-l3', art: 'leaf-l3.svg', box: [126, 180, 56, 46], origin: [0.964, 0.783], start: NONE, depth: 0.35 },
        { id: 'leaf-r3', art: 'leaf-r3.svg', box: [178, 180, 56, 46], origin: [0.036, 0.783], start: NONE, depth: 0.35 },
        { id: 'bloom', art: 'bloom.svg', box: [132, 98, 96, 96], start: { opacity: 0, sx: 0.1, sy: 0.1, turn: -70 }, depth: 0.4 },
        { id: 'packet', art: 'packet.svg', box: [103, 118, 160, 246], origin: [0.47, 0.96], depth: 0.3 },
        { id: 'flap', art: 'flap.svg', box: [103, 90, 154, 36], origin: [0.5, 1], depth: 0.3 },
        { id: 'soil', art: 'soil.svg', box: [-6, 340, 372, 116], depth: 0.5 },
        { id: 'seed', art: 'seed.svg', box: [174, 178, 12, 12] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2400,
    // Up the scale a step at a time, plucked, wood under it: a small bell when the flower opens.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 67,
        score: scaled(0.7, together(
            tune(172, 'G4/4 A4/4 B4/4 D5/4 | E5/4 G5/4 A5/4 B5/4 | D6/1!', { start: 300 }),
            tune(172, 'G3/4 -/4 G3/4 -/4 | G3/4 -/4 G3/4 D3/4 | G2/1', { start: 300, inst: 'wood', gain: 0.4 }),
            tune(172, '-/1 | -/1 | [D6 G6]/1', { start: 300, inst: 'tine', gain: 0.35 }),
        )),
    },
};
