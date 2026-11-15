import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Crane — a paper crane, for good health and a safe road. Flat origami:
 * every face of a fold is one triangle, in one of two tones. A square of
 * paper stands on its corner, its creases showing, strings of small cranes
 * hanging down the sides of an indigo room. Opening: the sheet folds in half,
 * gathers to a single spine, and from the spine the body, the wings, the neck
 * and the tail swing out; the crane lifts, and three more go by further off.
 *
 * The stage moves, turns and scales whole layers, so a fold is a scale
 * through zero and the crane is assembled from parts that turn about their
 * joints: it is not a real folding sequence, and does not pretend to be one.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/crane.gen.mjs): each SVG's viewBox is its box.
 */

const PARTS = ['body', 'wing-l', 'wing-r', 'neck', 'tail'] as const;
/** How far the finished crane lifts. */
const LIFT = -12;

const open: Step[] = [
    // 1. The sheet folds in half: the upper half comes down (a scale through zero), showing its white side.
    { kind: 'move', layer: 'sheet-up', at: 0, dur: 300, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'sheet-in', at: 300, dur: 300, ease: 'out', to: { sy: 1 } },
    // 2. The folded sheet gathers to a spine down its middle.
    { kind: 'move', layer: 'sheet-in', at: 700, dur: 340, ease: 'inout', to: { sx: 0.05 } },
    { kind: 'move', layer: 'sheet-low', at: 700, dur: 340, ease: 'inout', to: { sx: 0.05 } },
    { kind: 'move', layer: 'sheet-in', at: 1000, dur: 120, to: { opacity: 0 } },
    { kind: 'move', layer: 'sheet-low', at: 1000, dur: 120, to: { opacity: 0 } },
    // 3. From the spine: the body, then the wings, then neck and tail, each about its joint.
    { kind: 'move', layer: 'body', at: 960, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'body', at: 960, dur: 380, ease: 'back', to: { sx: 1 } },
    { kind: 'move', layer: 'wing-l', at: 1160, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'wing-l', at: 1160, dur: 560, ease: 'back', to: { sx: 1, sy: 1, turn: 0 } },
    { kind: 'move', layer: 'wing-r', at: 1240, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'wing-r', at: 1240, dur: 560, ease: 'back', to: { sx: 1, sy: 1, turn: 0 } },
    { kind: 'move', layer: 'neck', at: 1420, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'neck', at: 1420, dur: 460, ease: 'back', to: { sx: 1, turn: 0 } },
    { kind: 'move', layer: 'tail', at: 1500, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'tail', at: 1500, dur: 460, ease: 'back', to: { sx: 1, turn: 0 } },
    { kind: 'scatter', layer: 'fleck', at: 1300, dur: 1100, count: 12, spread: 130, fall: 70 },
    // 4. The crane lifts; three more pass further off.
    ...PARTS.map((layer): Step => ({ kind: 'move', layer, at: 2000, dur: 900, ease: 'inout', to: { y: LIFT } })),
    { kind: 'move', layer: 'flock', at: 2100, dur: 900, ease: 'out', to: { opacity: 1, x: 0, y: 0 } },
];

const hang: IdleStep[] = [
    { layer: 'strings-a', field: 'turn', amp: 1.1, period: 6200 },
    { layer: 'strings-b', field: 'turn', amp: 1.6, period: 5000, phase: 0.35 },
];

const idle: IdleStep[] = [
    ...hang,
    // The sheet breathes a little along its crease.
    { layer: 'sheet-up', field: 'sy', amp: 0.02, period: 4800 },
];

const afterglow: IdleStep[] = [
    ...hang,
    ...PARTS.map((layer): IdleStep => ({ layer, field: 'y', amp: 4, period: 5200 })),
    { layer: 'wing-l', field: 'turn', amp: 5, period: 2600 },
    { layer: 'wing-r', field: 'turn', amp: 5, period: 2600, phase: 0.5 },
    { layer: 'flock', field: 'y', amp: 3, period: 4400, phase: 0.3 },
];

export const crane: WrapperDef = {
    id: 'crane',
    name: { vi: 'Hạc giấy', en: 'Paper crane' },
    ambient: ['#1F2E5C', '#D8432F', '#F6F1E6'],
    blurb: {
        vi: 'Origami phẳng. Tờ giấy gấp đôi, thu về một sống, rồi thân, cánh, cổ và đuôi bật ra; hạc nhấc lên.',
        en: 'Flat origami. The sheet folds in half and gathers to a spine; body, wings, neck and tail swing out, and the crane lifts.',
    },
    // The paper's white side, indigo ink, the crane's red (a shade deeper, to carry words) for the one loud colour.
    theme: { ground: '#0A0F22', surface: '#F6F1E6', ink: '#080C1A', accent: '#B5321F', onAccent: '#FFFFFF', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.48],
    size: [360, 450],
    backdrop: '#1F2E5C',
    layers: [
        { id: 'room', art: 'room.svg', box: [-6, -6, 372, 462], depth: 0.04 },
        { id: 'strings-b', art: 'strings-b.svg', box: [0, -10, 360, 290], origin: [0.5, 0], depth: 0.12 },
        { id: 'strings-a', art: 'strings-a.svg', box: [0, -10, 360, 410], origin: [0.5, 0], depth: 0.2 },
        { id: 'flock', art: 'flock.svg', box: [196, 40, 150, 120], start: { opacity: 0, x: -46, y: 34 }, depth: 0.16 },
        { id: 'sheet-low', art: 'sheet-low.svg', box: [60, 215, 240, 120], depth: 0.4 },
        { id: 'sheet-in', art: 'sheet-in.svg', box: [60, 215, 240, 120], origin: [0.5, 0], start: { sy: 0 }, depth: 0.4 },
        { id: 'sheet-up', art: 'sheet-up.svg', box: [60, 95, 240, 120], origin: [0.5, 1], depth: 0.4 },
        { id: 'tail', art: 'tail.svg', box: [184, 190, 116, 92], origin: [8 / 116, 76 / 92], start: { opacity: 0, sx: 0.2, turn: 78 }, depth: 0.45 },
        { id: 'neck', art: 'neck.svg', box: [44, 196, 132, 86], origin: [124 / 132, 70 / 86], start: { opacity: 0, sx: 0.2, turn: -78 }, depth: 0.45 },
        { id: 'wing-r', art: 'wing-r.svg', box: [176, 86, 104, 184], origin: [6 / 104, 164 / 184], start: { opacity: 0, sx: 0.25, sy: 0.1, turn: 40 }, depth: 0.5 },
        { id: 'wing-l', art: 'wing-l.svg', box: [80, 86, 104, 184], origin: [98 / 104, 164 / 184], start: { opacity: 0, sx: 0.25, sy: 0.1, turn: -40 }, depth: 0.5 },
        { id: 'body', art: 'body.svg', box: [150, 226, 60, 84], start: { opacity: 0, sx: 0.1 }, depth: 0.5 },
        { id: 'fleck', art: 'fleck.svg', box: [176, 246, 8, 8] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1900,
    // One plucked note for each fold, climbing; the last rings as the wings open.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 64,
        score: scaled(0.7, together(
            tune(150, 'E5/4 G5/4 A5/4 B5/4 | E6/1!'),
            tune(150, 'E3/1 | [E3 B3]/1', { inst: 'pad', gain: 0.3 }),
        )),
    },
};
