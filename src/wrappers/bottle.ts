import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Bottle — a message in a bottle, for someone far away or for luck, in the
 * manner of a woodblock print of the sea: flat bands of water with evenly
 * scalloped edges under a banded dusk sky. A bottle lies on the swell, a roll
 * of paper inside it. Opening: the water draws back and sets the bottle
 * upright on the sand, the cork flies, the roll rises out of the mouth and
 * opens into a sea chart without a word on it, and the stars come out.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/bottle.gen.mjs): each SVG's viewBox is its box.
 */

/** The bottle's three layers share one box and one pivot, low in the body, so that they turn as one thing. */
const BB: readonly [number, number, number, number] = [104, 184, 152, 232];
const PIVOT: readonly [number, number] = [0.5, 0.62];
/** Lying on the swell: tipped over to the right and carried higher. */
const AFLOAT = { x: -22, y: -74, turn: 64 } as const;

const upright = (layer: string): Step => ({ kind: 'move', layer, at: 180, dur: 1000, ease: 'inout', to: { x: 0, y: 0, turn: 0 } });

const open: Step[] = [
    // 1. The water draws back, each band its own way; the shore comes up; the sun goes under.
    { kind: 'move', layer: 'wave-a', at: 0, dur: 1300, ease: 'inout', to: { x: -70, y: 190 } },
    { kind: 'move', layer: 'wave-b', at: 0, dur: 1300, ease: 'inout', to: { x: 56, y: 26 } },
    { kind: 'move', layer: 'wave-c', at: 0, dur: 1300, ease: 'inout', to: { x: -34, y: 10 } },
    { kind: 'move', layer: 'sand', at: 300, dur: 900, ease: 'out', to: { y: 0 } },
    { kind: 'move', layer: 'sun', at: 0, dur: 1600, ease: 'inout', to: { y: 44 } },
    // 2. The bottle is set down upright on the sand.
    upright('glass'),
    upright('roll'),
    upright('cork'),
    { kind: 'shake', layer: 'glass', at: 1200, dur: 200, amp: 1.2, times: 2 },
    // 3. The cork flies: up and over, falling as it goes.
    { kind: 'move', layer: 'cork', at: 1380, dur: 620, ease: 'linear', to: { x: 96, turn: 250 } },
    { kind: 'move', layer: 'cork', at: 1380, dur: 280, ease: 'out', to: { y: -96 } },
    { kind: 'move', layer: 'cork', at: 1660, dur: 340, ease: 'in', to: { y: 40, opacity: 0 } },
    { kind: 'scatter', layer: 'spray', at: 1380, dur: 900, count: 9, spread: 70, fall: 60 },
    // 4. The roll leaves the bottle; the sheet rises from the mouth and opens, its curl riding the top edge.
    { kind: 'move', layer: 'roll', at: 1480, dur: 260, ease: 'in', to: { y: -70, opacity: 0 } },
    { kind: 'move', layer: 'chart', at: 1640, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'chart', at: 1640, dur: 900, ease: 'out', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'curl', at: 1640, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'curl', at: 1640, dur: 900, ease: 'out', to: { y: 0, sx: 1 } },
    // 5. Night comes on a step, and the stars with it.
    { kind: 'move', layer: 'night', at: 1500, dur: 1500, ease: 'inout', to: { opacity: 1 } },
];

const idle: IdleStep[] = [
    // The swell: the bands slide against each other, the bottle rides it.
    { layer: 'wave-a', field: 'x', amp: 9, period: 5200 },
    { layer: 'wave-b', field: 'x', amp: 7, period: 6400, phase: 0.4 },
    { layer: 'wave-c', field: 'x', amp: 5, period: 7800, phase: 0.7 },
    ...(['glass', 'roll', 'cork'] as const).flatMap((layer): IdleStep[] => [
        { layer, field: 'turn', amp: 3, period: 5200, phase: 0.15 },
        { layer, field: 'y', amp: 3, period: 5200, phase: 0.4 },
    ]),
];

const afterglow: IdleStep[] = [
    { layer: 'wave-b', field: 'x', amp: 7, period: 6400, phase: 0.4 },
    { layer: 'wave-c', field: 'x', amp: 5, period: 7800, phase: 0.7 },
    { layer: 'chart', field: 'turn', amp: 0.8, period: 5600 },
    { layer: 'curl', field: 'turn', amp: 0.8, period: 5600 },
    { layer: 'night', field: 'opacity', amp: 0.06, period: 4400 },
];

export const bottle: WrapperDef = {
    id: 'bottle',
    name: { vi: 'Chai thư', en: 'Bottle' },
    ambient: ['#12324A', '#F2B79A', '#D9604A'],
    blurb: {
        vi: 'Tranh mộc bản sóng xếp dải. Sóng đưa chai vào bờ, nút bật, cuộn giấy bung thành tấm hải đồ và sao lên.',
        en: 'A woodblock sea in flat bands. The swell sets the bottle on the sand, the cork flies, the roll opens into a sea chart.',
    },
    // Sand paper, night-sea ink, the band's coral (a shade deeper, to carry words) for the one loud colour.
    theme: { ground: '#0A1C2A', surface: '#F3E9D2', ink: '#06121C', accent: '#B8432F', onAccent: '#FFFFFF', material: 'glass', corner: 'round', face: 'serif', voice: 'glass' },
    focus: [0.5, 0.42],
    size: [360, 450],
    backdrop: '#12324A',
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-6, -6, 372, 314], depth: 0.04 },
        { id: 'night', art: 'night.svg', box: [-6, -6, 372, 314], start: { opacity: 0 }, depth: 0.04 },
        { id: 'sun', art: 'sun.svg', box: [198, 150, 124, 62], depth: 0.08 },
        { id: 'wave-c', art: 'wave-c.svg', box: [-80, 196, 520, 120], depth: 0.14 },
        { id: 'wave-b', art: 'wave-b.svg', box: [-80, 226, 520, 150], depth: 0.22 },
        { id: 'sand', art: 'sand.svg', box: [-10, 372, 380, 84], start: { y: 96 }, depth: 0.4 },
        { id: 'chart', art: 'chart.svg', box: [90, 22, 180, 180], origin: [0.5, 1], start: { opacity: 0, sx: 0.16, sy: 0 }, depth: 0.5 },
        { id: 'curl', art: 'curl.svg', box: [86, 12, 188, 22], start: { opacity: 0, y: 176, sx: 0.16 }, depth: 0.5 },
        { id: 'roll', art: 'roll.svg', box: BB, origin: PIVOT, start: AFLOAT, depth: 0.4 },
        { id: 'glass', art: 'glass.svg', box: BB, origin: PIVOT, start: AFLOAT, depth: 0.4 },
        { id: 'cork', art: 'cork.svg', box: BB, origin: PIVOT, start: AFLOAT, depth: 0.4 },
        { id: 'wave-a', art: 'wave-a.svg', box: [-80, 262, 520, 200], depth: 0.6 },
        { id: 'spray', art: 'spray.svg', box: [175, 191, 10, 10] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2100,
    // A slow rocking line in three, plucked, over a held tone: the last note rings as the sheet opens.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 62,
        score: scaled(0.9, together(
            tune(172, 'A4/4 D5/4 F#5/4 | E5/2 D5/4 | B4/4 D5/4 A5/4 | F#5/2.!', { beats: 3 }),
            tune(172, 'D3/2. | A2/2. | G2/2. | D3/2.', { beats: 3, inst: 'pad', gain: 0.32 }),
        )),
    },
};
