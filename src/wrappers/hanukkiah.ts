import type { IdleStep, Step, WrapperDef } from '../stage/format';

/**
 * Nine lights — a nine-branch candle holder on a window sill at night, for
 * Hanukkah. Art-deco geometry, seen from inside the room: one big pane under
 * a fan transom, the moon and a stepped skyline behind the glass, curtains
 * tied back at the sides, a few plain coins on the sill. Eight cups stand in
 * one level row; the ninth, the helper, stands on the stem, higher.
 * Opening: the helper's flame takes first; then the eight, one after another
 * from left to right; as the last one lights, a round of warm light and a fan
 * of rays open behind the holder, the silver turns warm and light lies on
 * the sill.
 *
 * The stage fades and scales whole layers, so each flame is its own small
 * layer (with the glow of air round it) and the wider glows are three pools:
 * one over the helper, one over each half of the row, brought up a step at a
 * time as the candles under them light.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/hanukkiah.gen.mjs): each SVG's viewBox is its box. The boxes
 * and pivots below are copied by hand from what the generator prints.
 */

/** The eight candles of the row, left to right: where each flame's box starts. */
const ROW_X = [46, 74, 102, 130, 186, 214, 242, 270] as const;
/** When the helper lights, when the first of the row lights, and the beat between candles (under 3 a second). */
const HELPER_AT = 250, FIRST_AT = 800, BEAT = 350;
const rowAt = (i: number) => FIRST_AT + i * BEAT;
/** When the last candle has taken and the light opens. */
const PAYOFF = rowAt(7) + 150;
const FLAMES = ['flame-0', ...ROW_X.map((_, i) => `flame-${i + 1}`)];

/** A flame takes: it shows, and stands up from its wick. */
const light = (layer: string, at: number): Step[] => [
    { kind: 'move', layer, at, dur: 130, to: { opacity: 1 } },
    { kind: 'move', layer, at, dur: 360, ease: 'back', to: { sx: 1, sy: 1 } },
];

const open: Step[] = [
    // 1. The helper.
    ...light('flame-0', HELPER_AT),
    { kind: 'move', layer: 'glow-h', at: HELPER_AT, dur: 500, ease: 'out', to: { opacity: 0.9 } },
    // 2. The eight, left to right. The pool of glow over each half comes up a quarter with each candle.
    ...ROW_X.flatMap((_, i): Step[] => [
        ...light(`flame-${i + 1}`, rowAt(i)),
        { kind: 'move', layer: i < 4 ? 'glow-l' : 'glow-r', at: rowAt(i), dur: 300, ease: 'out', to: { opacity: 0.225 * ((i % 4) + 1) } },
    ]),
    // The round of light behind the holder gathers quietly while they light...
    { kind: 'move', layer: 'halo', at: HELPER_AT, dur: PAYOFF - HELPER_AT, ease: 'linear', to: { opacity: 0.4, sx: 0.5, sy: 0.5 } },
    // 3. ...and opens as the last one takes: the halo, the fan of rays, the warm silver, the light on the sill.
    { kind: 'move', layer: 'halo', at: PAYOFF, dur: 1000, ease: 'out', to: { opacity: 0.86, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'rays', at: PAYOFF, dur: 300, to: { opacity: 0.88 } },
    { kind: 'move', layer: 'rays', at: PAYOFF, dur: 1100, ease: 'out', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'lit', at: PAYOFF - 100, dur: 600, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'sill-light', at: PAYOFF, dur: 800, ease: 'out', to: { opacity: 0.9, sx: 1 } },
    { kind: 'scatter', layer: 'fleck', at: PAYOFF + 50, dur: 1200, count: 12, spread: 135, fall: 36 },
];

/** The night outside never stops, and the curtains move a little in the draught. */
const room: IdleStep[] = [
    { layer: 'stars', field: 'opacity', amp: 0.2, period: 5600 },
    { layer: 'curtain-l', field: 'turn', amp: 0.45, period: 7000 },
    { layer: 'curtain-r', field: 'turn', amp: 0.45, period: 7800, phase: 0.4 },
];

const afterglow: IdleStep[] = [
    ...room,
    // The flames sway, no two in step.
    ...FLAMES.flatMap((layer, i): IdleStep[] => [
        { layer, field: 'turn', amp: 5 + (i % 3), period: 1700 + ((i * 370) % 900), phase: (i * 0.37) % 1 },
        { layer, field: 'sy', amp: 0.06, period: 1500 + ((i * 290) % 800), phase: (i * 0.61) % 1 },
    ]),
    // The halo breathes; the rays lean a little one way, then the other.
    { layer: 'halo', field: 'opacity', amp: 0.1, period: 4600 },
    { layer: 'halo', field: 'sx', amp: 0.03, period: 4600 },
    { layer: 'halo', field: 'sy', amp: 0.03, period: 4600 },
    { layer: 'rays', field: 'turn', amp: 1.6, period: 8200 },
    { layer: 'rays', field: 'opacity', amp: 0.1, period: 5200, phase: 0.3 },
    { layer: 'sill-light', field: 'opacity', amp: 0.08, period: 4600 },
];

/** A flame before it takes: hidden, small, at the top of its wick. */
const UNLIT = { opacity: 0, sx: 0.4, sy: 0.15 } as const;

export const hanukkiah: WrapperDef = {
    id: 'hanukkiah',
    name: { vi: 'Chín ngọn đèn', en: 'Nine lights' },
    ambient: ['#0E1B3D', '#F2B84B', '#C9D3E6'],
    blurb: {
        vi: 'Bậu cửa sổ trong đêm. Ngọn nến phụ ở giữa sáng trước, rồi tám ngọn còn lại lần lượt sáng lên, từng ngọn một.',
        en: 'A window sill at night. The helper flame is lit first, then eight more, one after another.',
    },
    // The night for the room and the surface, white for the words, the flame's gold for the one loud colour.
    theme: { ground: '#070E22', surface: '#0E1B3D', ink: '#F5F7FC', accent: '#F2B84B', onAccent: '#070E22', material: 'glass', corner: 'cut', face: 'poster', voice: 'glass' },
    focus: [0.5, 0.42],
    size: [360, 450],
    backdrop: '#070E22',
    layers: [
        { id: 'sky', art: 'sky.svg', box: [40, -6, 280, 332], depth: 0.03 },
        { id: 'stars', art: 'stars.svg', box: [44, -6, 272, 240], start: { opacity: 0.8 }, depth: 0.05 },
        { id: 'frame', art: 'frame.svg', box: [-6, -6, 372, 462], depth: 0.16 },
        // Both lights open from the point behind the holder where the arcs gather.
        { id: 'halo', art: 'halo.svg', box: [30, 46, 300, 300], start: { opacity: 0, sx: 0.2, sy: 0.2 }, depth: 0.2 },
        { id: 'rays', art: 'rays.svg', box: [-6, -6, 372, 240], origin: [0.5, 202 / 240], start: { opacity: 0, sx: 0.25, sy: 0.25 }, depth: 0.2 },
        { id: 'sill-light', art: 'sill-light.svg', box: [30, 321, 300, 125], origin: [0.5, 0], start: { opacity: 0, sx: 0.5 }, depth: 0.2 },
        { id: 'coins', art: 'coins.svg', box: [84, 322, 212, 24], depth: 0.26 },
        { id: 'holder', art: 'holder.svg', box: [58, 146, 244, 195], depth: 0.26 },
        { id: 'lit', art: 'lit.svg', box: [58, 186, 244, 150], start: { opacity: 0 }, depth: 0.26 },
        { id: 'glow-l', art: 'glow-l.svg', box: [28, 118, 164, 100], start: { opacity: 0 }, depth: 0.26 },
        { id: 'glow-r', art: 'glow-r.svg', box: [168, 118, 164, 100], start: { opacity: 0 }, depth: 0.26 },
        { id: 'glow-h', art: 'glow-h.svg', box: [124, 82, 112, 112], start: { opacity: 0 }, depth: 0.26 },
        // Each flame turns and grows about the top of its wick.
        { id: 'flame-0', art: 'flame-0.svg', box: [152.5, 110.25, 55, 55], origin: [0.5, 31 / 44], start: UNLIT, depth: 0.26 },
        ...ROW_X.map((x, i) => ({ id: `flame-${i + 1}`, art: `flame-${i + 1}.svg`, box: [x, 146, 44, 44] as const, origin: [0.5, 31 / 44] as const, start: UNLIT, depth: 0.26 })),
        { id: 'curtain-l', art: 'curtain-l.svg', box: [-6, -6, 80, 462], origin: [0.5, 0], depth: 0.5 },
        { id: 'curtain-r', art: 'curtain-r.svg', box: [286, -6, 80, 462], origin: [0.5, 0], depth: 0.5 },
        { id: 'fleck', art: 'fleck.svg', box: [176, 192, 8, 8] },
    ],
    idle: room,
    afterglow,
    open,
    revealAt: 3700,
    // Nine soft glassy notes, one for each flame as it takes, climbing two octaves to home; the last rings on.
    sound: {
        v: 1,
        inst: 'glassy',
        tonic: 62,
        score: [
            { at: 0, pitch: 50, dur: 3900, gain: 0.42, inst: 'pad' },
            { at: HELPER_AT, pitch: 62, dur: 420, gain: 0.8 },
            ...[66, 69, 71, 74, 76, 78, 81].map((pitch, i) => ({ at: rowAt(i), pitch, dur: 300, gain: (76 + i * 2) / 100 })),
            { at: rowAt(7), pitch: 86, dur: 1900, gain: 0.95 },
        ],
    },
};
