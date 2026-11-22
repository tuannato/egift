import type { IdleStep, NoteDef, Step, WrapperDef } from '../stage/format';

/**
 * Pop — for a celebration or an anniversary: a bottle of champagne seen
 * close, from the shoulders up, on a dressed table at night. It stands a
 * little off centre and leans a few degrees, its neck in gold foil under a
 * wire cage; an empty flute stands either side, one further off than the
 * other; behind them round out-of-focus lights in two tones, two curls of
 * ribbon hanging in from above, and a cloth folded over the table's edge.
 * Opening: the bottle shakes harder and harder, the cork flies out of the
 * frame, drops scatter, a crown of foam rises from the mouth and settles on
 * it, the cage falls to the table, the two flutes fill and the lights come up.
 *
 * The stage moves, turns, scales and fades whole layers: the wine rises by
 * scaling about the point the straight sides of its glass meet in, so it
 * never leaves the glass.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/pop.gen.mjs): each SVG's viewBox is its box. The boxes and
 * pivots below are the ones the generator prints.
 */

/** What stands on the bottle and shakes with it. */
const BOTTLE = ['bottle', 'glint', 'cage', 'cork'] as const;
/** The shaking grows: three bursts, each harder than the last. */
const SHAKES: readonly (readonly [number, number, number, number])[] = [[0, 170, 1.4, 2], [170, 170, 2.8, 2], [340, 170, 5, 2]];

const open: Step[] = [
    // 1. The bottle shakes with growing strength.
    ...SHAKES.flatMap(([at, dur, amp, times]) => BOTTLE.map((layer): Step => ({ kind: 'shake', layer, at, dur, amp, times }))),
    // 2. The cork flies: up and to the right, out of the frame, turning as it goes.
    { kind: 'move', layer: 'cork', at: 500, dur: 520, ease: 'linear', to: { x: 200, y: -400, turn: 200 } },
    { kind: 'shake', layer: 'bottle', at: 500, dur: 260, amp: 2.4, times: 2 },
    { kind: 'shake', layer: 'glint', at: 500, dur: 260, amp: 2.4, times: 2 },
    { kind: 'scatter', layer: 'drop', at: 520, dur: 1150, count: 24, spread: 150, fall: -84 },
    // 3. The cage is thrown aside and comes to lie on the table.
    { kind: 'move', layer: 'cage', at: 500, dur: 640, ease: 'out', to: { x: -130, turn: -104 } },
    { kind: 'move', layer: 'cage', at: 500, dur: 160, ease: 'out', to: { y: -30 } },
    { kind: 'move', layer: 'cage', at: 660, dur: 560, ease: 'bounce', to: { y: 236 } },
    // 4. Foam: the tall mass behind the bottle first, then the one on the mouth; both shoot up, then settle lower.
    { kind: 'move', layer: 'foam-b', at: 520, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'foam-b', at: 520, dur: 400, ease: 'out', to: { sx: 1.9, sy: 2.15, y: -8 } },
    { kind: 'move', layer: 'foam-b', at: 960, dur: 940, ease: 'inout', to: { sx: 1, sy: 1, y: 0 } },
    { kind: 'move', layer: 'foam-f', at: 600, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'foam-f', at: 600, dur: 400, ease: 'out', to: { sx: 1.5, sy: 1.6, y: -6 } },
    { kind: 'move', layer: 'foam-f', at: 1040, dur: 900, ease: 'inout', to: { sx: 1, sy: 1, y: 0 } },
    { kind: 'move', layer: 'glint', at: 560, dur: 200, to: { opacity: 0 } },
    // 5. The flutes fill from the bottom, the far one first; then the bubbles show.
    { kind: 'move', layer: 'wine-l', at: 900, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'wine-l', at: 900, dur: 700, ease: 'out', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'wine-r', at: 1020, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'wine-r', at: 1020, dur: 760, ease: 'out', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'bub-l', at: 1400, dur: 500, ease: 'out', to: { opacity: 0.85 } },
    { kind: 'move', layer: 'bub-r', at: 1520, dur: 500, ease: 'out', to: { opacity: 0.85 } },
    { kind: 'move', layer: 'shine-l', at: 1300, dur: 500, to: { opacity: 0.85 } },
    { kind: 'move', layer: 'shine-r', at: 1300, dur: 500, to: { opacity: 0.85 } },
    // The cork comes down on the cloth.
    { kind: 'move', layer: 'cork-rest', at: 1500, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'cork-rest', at: 1500, dur: 420, ease: 'bounce', to: { y: 0 } },
    // 6. The lights come up.
    { kind: 'move', layer: 'lights-a', at: 500, dur: 1100, ease: 'out', to: { opacity: 0.95 } },
    { kind: 'move', layer: 'lights-b', at: 600, dur: 1600, ease: 'out', to: { opacity: 0.9 } },
];

const sway: IdleStep[] = [
    { layer: 'ribbon-r', field: 'turn', amp: 1.6, period: 5400 },
    { layer: 'ribbon-l', field: 'turn', amp: 2.2, period: 4600, phase: 0.3 },
];

const idle: IdleStep[] = [
    ...sway,
    // The lights breathe slowly, one set against the other; the foil glints.
    { layer: 'lights-a', field: 'opacity', amp: 0.12, period: 5600 },
    { layer: 'lights-b', field: 'opacity', amp: 0.12, period: 7000, phase: 0.45 },
    { layer: 'glint', field: 'opacity', amp: 0.4, period: 3800 },
];

const afterglow: IdleStep[] = [
    ...sway,
    { layer: 'lights-a', field: 'opacity', amp: 0.05, period: 5600 },
    { layer: 'lights-b', field: 'opacity', amp: 0.1, period: 7000, phase: 0.45 },
    { layer: 'shine-l', field: 'opacity', amp: 0.15, period: 3600 },
    { layer: 'shine-r', field: 'opacity', amp: 0.15, period: 4200, phase: 0.5 },
    { layer: 'bub-l', field: 'opacity', amp: 0.15, period: 2800 },
    { layer: 'bub-r', field: 'opacity', amp: 0.15, period: 3200, phase: 0.4 },
    // The foam breathes a hair.
    { layer: 'foam-b', field: 'sy', amp: 0.012, period: 4400 },
    { layer: 'foam-f', field: 'sy', amp: 0.014, period: 3800, phase: 0.3 },
];

/** How hard the whole tune is played: levelled against the other wrappers' tunes. */
const LEVEL = 1;
const g = (gain: number): number => Math.round(gain * LEVEL * 100) / 100;
/** A fizz that grows with the shaking, the pop, a glassy run upward, and a bright chord held as the glasses fill. */
const score: NoteDef[] = [
    { at: 0, pitch: 79, dur: 60, gain: g(0.14), inst: 'noise' },
    { at: 170, pitch: 81, dur: 60, gain: g(0.2), inst: 'noise' },
    { at: 340, pitch: 83, dur: 70, gain: g(0.28), inst: 'noise' },
    { at: 500, pitch: 60, dur: 90, gain: g(0.62), inst: 'noise' },
    { at: 500, pitch: 43, dur: 110, gain: g(0.36), inst: 'wood', bend: -5 },
    ...[67, 71, 74, 79, 83, 86].map((pitch, i): NoteDef => ({ at: 640 + i * 90, pitch, dur: 110, gain: g(0.3 + i * 0.03) })),
    { at: 1300, pitch: 55, dur: 1700, gain: g(0.26), inst: 'pad' },
    { at: 1300, pitch: 74, dur: 1700, gain: g(0.34) },
    { at: 1300, pitch: 83, dur: 1700, gain: g(0.3) },
    { at: 1300, pitch: 79, dur: 1700, gain: g(0.4) },
];

export const pop: WrapperDef = {
    id: 'pop',
    name: { vi: 'Bật nút', en: 'Pop the cork' },
    ambient: ['#0F3B2E', '#E9C46A', '#FFF4D6'],
    blurb: {
        vi: 'Chai sâm panh trên bàn tiệc đêm. Chai rung, nút bay khỏi khung, bọt trào thành vương miện và hai ly đầy dần.',
        en: 'Champagne on a dressed table at night. The bottle shakes, the cork flies, foam crowns the mouth and two flutes fill.',
    },
    // The bottle's green as glass, foam for the words, the foil's gold for the one loud colour.
    theme: { ground: '#0A2A20', surface: '#0F3B2E', ink: '#FFF4D6', accent: '#E9C46A', onAccent: '#0A2A20', material: 'glass', corner: 'round', face: 'serif', voice: 'glass' },
    focus: [0.5, 0.42],
    size: [360, 450],
    backdrop: '#0F3B2E',
    layers: [
        { id: 'room', art: 'room.svg', box: [-6, -6, 372, 462], depth: 0.03 },
        { id: 'lights-b', art: 'lights-b.svg', box: [-6, -6, 372, 332], start: { opacity: 0.72 }, depth: 0.07 },
        { id: 'lights-a', art: 'lights-a.svg', box: [-6, 8, 372, 308], start: { opacity: 0.85 }, depth: 0.11 },
        { id: 'ribbon-l', art: 'ribbon-l.svg', box: [14, -8, 24, 99], origin: [0.5, 0], depth: 0.16 },
        { id: 'ribbon-r', art: 'ribbon-r.svg', box: [314, -8, 28, 153], origin: [0.5, 0], depth: 0.2 },
        { id: 'table', art: 'table.svg', box: [-6, 348, 372, 108], depth: 0.26 },
        // The far flute, then the near one: wine and bubbles under the glass that holds them.
        { id: 'wine-l', art: 'wine-l.svg', box: [44, 220, 36, 108], origin: [0.5, 1], start: { opacity: 0, sx: 0.06, sy: 0.06 }, depth: 0.3 },
        { id: 'bub-l', art: 'bub-l.svg', box: [52, 236, 19, 59], start: { opacity: 0 }, depth: 0.3 },
        { id: 'flute-l', art: 'flute-l.svg', box: [33, 205, 58, 180], depth: 0.3 },
        { id: 'shine-l', art: 'shine-l.svg', box: [47, 223, 16, 62], start: { opacity: 0.7 }, depth: 0.3 },
        { id: 'wine-r', art: 'wine-r.svg', box: [276, 188, 48, 151], origin: [0.5, 1], start: { opacity: 0, sx: 0.06, sy: 0.06 }, depth: 0.38 },
        { id: 'bub-r', art: 'bub-r.svg', box: [283, 208, 31, 77], start: { opacity: 0 }, depth: 0.38 },
        { id: 'flute-r', art: 'flute-r.svg', box: [264, 173, 72, 253], depth: 0.38 },
        { id: 'shine-r', art: 'shine-r.svg', box: [279, 191, 22, 98], start: { opacity: 0.7 }, depth: 0.38 },
        // The bottle: the tall foam and the cork's stem behind the glass, the cage and the low foam in front.
        { id: 'foam-b', art: 'foam-b.svg', box: [133, 149, 107, 62], origin: [0.465, 0.766], start: { opacity: 0, sx: 0.12, sy: 0.12 }, depth: 0.46 },
        { id: 'cork', art: 'cork.svg', box: [152, 147, 62, 83], depth: 0.46 },
        { id: 'bottle', art: 'bottle.svg', box: [85, 189, 178, 267], depth: 0.46 },
        { id: 'glint', art: 'glint.svg', box: [163, 208, 12, 33], start: { opacity: 0.55 }, depth: 0.46 },
        { id: 'cage', art: 'cage.svg', box: [150, 144, 68, 72], depth: 0.46 },
        { id: 'foam-f', art: 'foam-f.svg', box: [151, 166, 64, 87], origin: [0.496, 0.351], start: { opacity: 0, sx: 0.12, sy: 0.12 }, depth: 0.46 },
        { id: 'cork-rest', art: 'cork-rest.svg', box: [302, 411, 56, 40], start: { opacity: 0, y: -26 }, depth: 0.5 },
        { id: 'drop', art: 'drop.svg', box: [178, 162, 10, 10] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1300,
    sound: { v: 1, inst: 'glassy', tonic: 67, score },
};
