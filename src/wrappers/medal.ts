import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Medal — for an exam passed, an achievement, a promotion. Flat shapes: dark
 * ink-green cloth in broad diagonal folds, a gold medal in two tones on a
 * plain emerald ribbon. The medal carries no emblem at all: each side is a
 * rosette of flat facets, like a cut stone seen from above, inside a plain rim.
 * Closed: the two ribbon bands come down from the top corners to a bar; the
 * medal hangs from it with its plainer side out, swinging a little.
 * Opening: it trembles, turns over to its finer-cut face, a narrow light
 * crosses it once, rings open round it and paper confetti comes down and stays.
 *
 * The stage moves, turns and scales whole layers, so the turn is a scale
 * through zero with the face taking over from the reverse, and the light is a
 * narrow bar that slides across the middle of the face and fades before it
 * could reach the edge.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/medal.gen.mjs): each SVG's viewBox is its box.
 */

/** The medal's two sides share one box and one pivot: the ring they hang from. */
const MB: readonly [number, number, number, number] = [80, 150, 200, 218];
const HANG: readonly [number, number] = [0.5, 8 / 218];

const open: Step[] = [
    // 1. A short tremble on the ring.
    { kind: 'shake', layer: 'back', at: 0, dur: 300, amp: 2.2, times: 3 },
    // 2. The medal turns over: the reverse closes to its edge, the face opens from it.
    { kind: 'move', layer: 'back', at: 280, dur: 300, ease: 'in', to: { sx: 0 } },
    { kind: 'move', layer: 'back', at: 580, dur: 40, to: { opacity: 0 } },
    { kind: 'move', layer: 'front', at: 560, dur: 40, to: { opacity: 1 } },
    { kind: 'move', layer: 'front', at: 580, dur: 420, ease: 'out', to: { sx: 1 } },
    { kind: 'scatter', layer: 'bit-a', at: 600, dur: 1200, count: 12, spread: 140, fall: 90 },
    { kind: 'scatter', layer: 'bit-b', at: 680, dur: 1300, count: 9, spread: 160, fall: 110 },
    // 3. The room answers: a pool of light and thin rings open round the medal.
    { kind: 'move', layer: 'halo', at: 620, dur: 200, to: { opacity: 1 } },
    { kind: 'move', layer: 'halo', at: 620, dur: 900, ease: 'out', to: { sx: 1, sy: 1, turn: 0 } },
    // 4. A narrow light crosses the face, once.
    { kind: 'move', layer: 'sheen', at: 960, dur: 560, ease: 'inout', to: { x: 42, y: 24 } },
    { kind: 'move', layer: 'sheen', at: 960, dur: 160, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'sheen', at: 1340, dur: 180, ease: 'in', to: { opacity: 0 } },
    // 5. Confetti comes down from above the frame and stays in the air.
    { kind: 'move', layer: 'confetti-a', at: 700, dur: 1300, ease: 'out', to: { y: 0 } },
    { kind: 'move', layer: 'confetti-b', at: 860, dur: 1340, ease: 'out', to: { y: 0 } },
];

const idle: IdleStep[] = [
    // A pendulum on its ring.
    { layer: 'back', field: 'turn', amp: 4, period: 3400 },
];

const afterglow: IdleStep[] = [
    { layer: 'front', field: 'turn', amp: 2, period: 4200 },
    { layer: 'confetti-a', field: 'y', amp: 4, period: 6200 },
    { layer: 'confetti-b', field: 'y', amp: 6, period: 7600, phase: 0.3 },
    { layer: 'confetti-b', field: 'x', amp: 3, period: 9400, phase: 0.6 },
    { layer: 'halo', field: 'turn', amp: 5, period: 11000 },
    { layer: 'halo', field: 'opacity', amp: 0.08, period: 5200 },
];

export const medal: WrapperDef = {
    id: 'medal',
    name: { vi: 'Huy chương', en: 'Medal' },
    ambient: ['#071F1C', '#159A63', '#E0B04A'],
    blurb: {
        vi: 'Tấm huy chương vàng cắt giác như đá quý, treo trên dải lụa xanh ngọc. Nó rung nhẹ, lật mặt, một vệt sáng lướt qua và hoa giấy rơi.',
        en: 'A gold medal cut in flat facets like a gem, on an emerald ribbon. It trembles, turns over, a light crosses it and confetti falls.',
    },
    // Cream for the plate, the cloth's deepest green for the words, the ribbon's deeper emerald for the one loud colour.
    theme: { ground: '#071F1C', surface: '#F4EEDC', ink: '#071F1C', accent: '#0E7048', onAccent: '#F4EEDC', material: 'plate', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.59],
    size: [360, 450],
    backdrop: '#0F3A36',
    layers: [
        { id: 'ground', art: 'ground.svg', box: [-6, -6, 372, 462], depth: 0.05 },
        { id: 'halo', art: 'halo.svg', box: [10, 97, 340, 340], start: { opacity: 0, sx: 0.55, sy: 0.55, turn: -40 }, depth: 0.12 },
        { id: 'confetti-a', art: 'confetti-a.svg', box: [0, 0, 360, 350], start: { y: -370 }, depth: 0.2 },
        { id: 'back', art: 'back.svg', box: MB, origin: HANG, depth: 0.3 },
        { id: 'front', art: 'front.svg', box: MB, origin: HANG, start: { sx: 0, opacity: 0 }, depth: 0.3 },
        { id: 'sheen', art: 'sheen.svg', box: [142, 219, 76, 96], start: { opacity: 0, x: -42, y: -24 }, depth: 0.3 },
        { id: 'ribbon', art: 'ribbon.svg', box: [0, -12, 360, 182], depth: 0.3 },
        { id: 'folds', art: 'folds.svg', box: [-6, 290, 372, 166], depth: 0.5 },
        { id: 'confetti-b', art: 'confetti-b.svg', box: [0, 0, 360, 300], start: { y: -330 }, depth: 0.6 },
        { id: 'bit-a', art: 'bit-a.svg', box: [176, 262, 8, 10] },
        { id: 'bit-b', art: 'bit-b.svg', box: [176, 262, 8, 10] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1600,
    // Brass: the three notes of a major chord going up, then the chord held over a low pad.
    sound: {
        v: 1,
        inst: 'brass',
        tonic: 60,
        score: scaled(0.8, together(
            tune(132, 'C4/8 E4/8 G4/8 [G4 C5 E5]/1!', { start: 120 }),
            tune(132, '-/8 -/8 -/8 C3/1', { start: 120, inst: 'pad', gain: 0.34 }),
        )),
    },
};
