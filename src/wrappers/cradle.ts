import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Cradle — a hanging mobile over a cot, for a new baby. Flat kinetic
 * sculpture: thin rods and threads, plain shapes (half disc, drop, ring,
 * leaf, pebble) in soft inks, a brass disc in the middle, a room of upright
 * bands of colour. The mobile hangs spread across the frame, each piece
 * swinging a little out of step. Opening: a breath of air swings every piece
 * wide, the pieces part, and the brass disc is let down on its cord into a
 * pool of warm light.
 *
 * Each hanging piece is one layer (thread and shape) that turns about the
 * top of its thread.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/cradle.gen.mjs): each SVG's viewBox is its box.
 */

/** One piece caught by the air: out, back past where it hung, and to rest a little apart from the middle. */
const swing = (layer: string, at: number, out: number, rest: number, aside: number): Step[] => [
    { kind: 'move', layer, at, dur: 620, ease: 'out', to: { turn: out } },
    { kind: 'move', layer, at: at + 620, dur: 760, ease: 'inout', to: { turn: -out * 0.45, x: aside } },
    { kind: 'move', layer, at: at + 1380, dur: 700, ease: 'inout', to: { turn: rest } },
];

const open: Step[] = [
    // 1. A breath of air from the left: every piece swings, the nearest first; the frame gives a little.
    { kind: 'move', layer: 'frame', at: 0, dur: 700, ease: 'out', to: { turn: 2.4 } },
    { kind: 'move', layer: 'frame', at: 700, dur: 1100, ease: 'inout', to: { turn: 0 } },
    ...swing('hang-1', 0, 17, 3, -10),
    ...swing('hang-2', 90, 20, 4, -16),
    ...swing('hang-5', 160, 13, 2, -22),
    ...swing('hang-3', 240, 15, -3, 18),
    ...swing('hang-4', 320, 19, -4, 10),
    // 2. The brass disc is let down: the cord lets out, the disc comes nearer.
    { kind: 'move', layer: 'cord', at: 500, dur: 1500, ease: 'inout', to: { sy: 1.97 } },
    { kind: 'move', layer: 'brass', at: 500, dur: 1500, ease: 'inout', to: { y: 92, sx: 2, sy: 2 } },
    // 3. It comes to rest in a pool of warm light.
    { kind: 'move', layer: 'glow', at: 1700, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'glow', at: 1700, dur: 700, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'scatter', layer: 'mote', at: 1900, dur: 1300, count: 10, spread: 120, fall: -46 },
];

const sway: IdleStep[] = [
    { layer: 'hang-1', field: 'turn', amp: 2.6, period: 5200 },
    { layer: 'hang-2', field: 'turn', amp: 3.4, period: 4300, phase: 0.3 },
    { layer: 'hang-3', field: 'turn', amp: 2.2, period: 5800, phase: 0.6 },
    { layer: 'hang-4', field: 'turn', amp: 3.2, period: 4600, phase: 0.15 },
    { layer: 'hang-5', field: 'turn', amp: 1.8, period: 6400, phase: 0.8 },
    { layer: 'frame', field: 'turn', amp: 0.5, period: 7600 },
];

const idle: IdleStep[] = [...sway, { layer: 'brass', field: 'x', amp: 1.6, period: 5000, phase: 0.2 }, { layer: 'cord', field: 'turn', amp: 1.4, period: 5000, phase: 0.2 }];

const afterglow: IdleStep[] = [...sway, { layer: 'glow', field: 'sx', amp: 0.03, period: 4800 }, { layer: 'glow', field: 'sy', amp: 0.03, period: 4800 }, { layer: 'brass', field: 'turn', amp: 5, period: 6800 }];

export const cradle: WrapperDef = {
    id: 'cradle',
    name: { vi: 'Chùm treo nôi', en: 'Cradle' },
    ambient: ['#6AA88A', '#F3D78A', '#E2A27E'],
    blurb: {
        vi: 'Chùm treo hình học trên nôi. Một làn gió đưa cả chùm, các hình dạt ra và chiếc đĩa đồng hạ xuống vùng sáng ấm.',
        en: 'A mobile of plain shapes over a cot. A breath of air swings it, the pieces part, and the brass disc comes down into warm light.',
    },
    // Cream paper, slate-dark ink, the brass (its deeper tone, to carry words) for the one loud colour.
    theme: { ground: '#10181B', surface: '#FBF5E6', ink: '#0C1214', accent: '#8A5A1C', onAccent: '#FFFFFF', material: 'glass', corner: 'soft', face: 'serif', voice: 'glass' },
    focus: [0.5, 0.42],
    size: [360, 450],
    backdrop: '#CFE5D6',
    layers: [
        { id: 'room', art: 'room.svg', box: [-6, -6, 372, 462], depth: 0.04 },
        { id: 'glow', art: 'glow.svg', box: [80, 136, 200, 200], start: { opacity: 0, sx: 0.4, sy: 0.4 }, depth: 0.2 },
        { id: 'hang-5', art: 'hang-5.svg', box: [112, 62, 60, 286], origin: [0.5, 8 / 286], depth: 0.24 },
        { id: 'hang-3', art: 'hang-3.svg', box: [216, 96, 72, 216], origin: [0.5, 0], depth: 0.3 },
        { id: 'frame', art: 'frame.svg', box: [20, 16, 320, 96], origin: [0.5, 14 / 96], depth: 0.34 },
        { id: 'hang-1', art: 'hang-1.svg', box: [34, 100, 72, 190], origin: [0.5, 0], depth: 0.4 },
        { id: 'hang-2', art: 'hang-2.svg', box: [78, 96, 60, 150], origin: [0.5, 0], depth: 0.46 },
        { id: 'hang-4', art: 'hang-4.svg', box: [266, 98, 70, 150], origin: [38 / 70, 0], depth: 0.5 },
        { id: 'cord', art: 'cord.svg', box: [176, 64, 8, 64], origin: [0.5, 0], depth: 0.55 },
        { id: 'brass', art: 'brass.svg', box: [152, 122, 56, 56], depth: 0.6 },
        { id: 'mote', art: 'mote.svg', box: [176, 232, 8, 8] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2000,
    // A music box in three, very slow: down the scale first, and only then home.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 67,
        score: scaled(1.15, together(
            tune(168, 'E5/4 D5/4 B4/4 | A4/4 G4/4 B4/4 | D5/4 E5/4 D5/4 | G4/2.!', { beats: 3 }),
            tune(168, 'G3/2. | D3/2. | D3/2. | G3/2.', { beats: 3, inst: 'glassy', gain: 0.3 }),
        )),
    },
};
