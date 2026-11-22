import type { IdleStep, Step, WrapperDef } from '../stage/format';

/**
 * Aurora — a polar night on snow, for a big congratulation or a birthday.
 * Flat shapes: three snow hills with hard-edged shade, a frozen lake between
 * them, black spruce along the crests, a small A-frame cabin with ski tracks
 * climbing to its door; over all of it a deep sky of small stars and one
 * faint band of green low on the horizon. Opening: the cabin's lamp comes
 * on; three curtains of light stand up from the horizon one after another,
 * green, green turning violet, violet; the green lies down along the crests
 * of the snow, the lake takes the lights, and a few glints leave the sky.
 *
 * The stage scales whole layers, so a curtain rising is one picture of the
 * whole ribbon growing upward from the horizon: its rays are drawn, not moved.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/aurora.gen.mjs): each SVG's viewBox is its box.
 */

/** The three curtains, in the order they rise: when, and from how far to the side each drifts in. */
const CURTAINS = [
    { layer: 'curtain-1', at: 300, from: -14 },
    { layer: 'curtain-2', at: 650, from: 14 },
    { layer: 'curtain-3', at: 1000, from: -10 },
] as const;

const open: Step[] = [
    // 1. The lamp comes on: the window, its light on the snow, and the glow in the air round it.
    { kind: 'move', layer: 'lamp', at: 0, dur: 260, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'glow', at: 40, dur: 620, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    // 2. The curtains stand up from the horizon, 350 ms apart, each drifting a little sideways as it rises.
    ...CURTAINS.flatMap(({ layer, at }): Step[] => [
        { kind: 'move', layer, at, dur: 160, to: { opacity: 1 } },
        { kind: 'move', layer, at, dur: 950, ease: 'out', to: { sy: 1, x: 0 } },
    ]),
    // 3. The green lies down on the snow, and the lake takes the lights.
    { kind: 'move', layer: 'wash', at: 1450, dur: 800, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'reflect', at: 1600, dur: 800, ease: 'inout', to: { opacity: 1, sy: 1 } },
    // 4. A few glints leave the sky, high up.
    { kind: 'scatter', layer: 'fleck', at: 1700, dur: 900, count: 9, spread: 150, fall: 16 },
];

/** The stars never stop: two layers, out of step. */
const twinkle: IdleStep[] = [
    { layer: 'stars-a', field: 'opacity', amp: 0.24, period: 5200 },
    { layer: 'stars-b', field: 'opacity', amp: 0.24, period: 6800, phase: 0.45 },
];

const afterglow: IdleStep[] = [
    ...twinkle,
    // The curtains drift sideways and breathe upward, none in step with another.
    { layer: 'curtain-1', field: 'x', amp: 5, period: 9000 },
    { layer: 'curtain-1', field: 'sy', amp: 0.05, period: 6200 },
    { layer: 'curtain-2', field: 'x', amp: 4, period: 11000, phase: 0.3 },
    { layer: 'curtain-2', field: 'sy', amp: 0.04, period: 7400, phase: 0.4 },
    { layer: 'curtain-3', field: 'x', amp: 6, period: 13000, phase: 0.6 },
    { layer: 'curtain-3', field: 'sy', amp: 0.05, period: 8200, phase: 0.7 },
    { layer: 'reflect', field: 'opacity', amp: 0.12, period: 6200, phase: 0.2 },
    // The lamp breathes.
    { layer: 'glow', field: 'opacity', amp: 0.14, period: 4200 },
    { layer: 'glow', field: 'sx', amp: 0.04, period: 4200 },
    { layer: 'glow', field: 'sy', amp: 0.04, period: 4200 },
];

export const aurora: WrapperDef = {
    id: 'aurora',
    name: { vi: 'Cực quang', en: 'Aurora' },
    ambient: ['#07101F', '#3DF0B0', '#8A5CF6'],
    blurb: {
        vi: 'Đêm vùng cực trên tuyết. Đèn trong lều bật sáng, rồi ba dải cực quang lần lượt dựng lên từ chân trời, soi xuống mặt hồ băng.',
        en: 'A polar night on snow. The cabin lamp comes on, then three curtains of light stand up from the horizon and lie on the frozen lake.',
    },
    // The night for the room and the surface, the snow for the words, the aurora's green for the one loud colour.
    theme: { ground: '#07101F', surface: '#12284A', ink: '#DCE8F5', accent: '#3DF0B0', onAccent: '#07101F', material: 'glass', corner: 'round', face: 'grotesk', voice: 'glass' },
    focus: [0.5, 0.4],
    size: [360, 450],
    backdrop: '#07101F',
    // The boxes are those the generator writes (copied by hand; a mismatch shows as stretched art).
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-6, -6, 372, 276], depth: 0.03 },
        { id: 'stars-a', art: 'stars-a.svg', box: [0, 0, 360, 190], start: { opacity: 0.76 }, depth: 0.04 },
        { id: 'stars-b', art: 'stars-b.svg', box: [0, 0, 360, 190], start: { opacity: 0.76 }, depth: 0.06 },
        // Each curtain grows upward from the horizon, the bottom edge of its box.
        { id: 'curtain-3', art: 'curtain-3.svg', box: [-6, -6, 372, 268], origin: [0.5, 1], start: { opacity: 0, sy: 0, x: -10 }, depth: 0.07 },
        { id: 'curtain-2', art: 'curtain-2.svg', box: [94, -4, 272, 266], origin: [0.5, 1], start: { opacity: 0, sy: 0, x: 14 }, depth: 0.09 },
        { id: 'curtain-1', art: 'curtain-1.svg', box: [-6, 20, 244, 242], origin: [0.5, 1], start: { opacity: 0, sy: 0, x: -14 }, depth: 0.11 },
        { id: 'far', art: 'far.svg', box: [-6, 220, 372, 136], depth: 0.14 },
        { id: 'reflect', art: 'reflect.svg', box: [-6, 272, 372, 84], origin: [0.5, 0], start: { opacity: 0, sy: 0.6 }, depth: 0.14 },
        { id: 'near', art: 'near.svg', box: [-6, 284, 372, 172], depth: 0.26 },
        { id: 'wash', art: 'wash.svg', box: [-6, 284, 372, 132], start: { opacity: 0 }, depth: 0.26 },
        { id: 'trees', art: 'trees.svg', box: [-6, 152, 372, 192], depth: 0.26 },
        { id: 'lamp', art: 'lamp.svg', box: [122, 308, 72, 48], start: { opacity: 0 }, depth: 0.26 },
        { id: 'glow', art: 'glow.svg', box: [105.5, 265, 104, 104], start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.26 },
        { id: 'fore-l', art: 'fore-l.svg', box: [-6, 318, 96, 138], depth: 0.5 },
        { id: 'fore-r', art: 'fore-r.svg', box: [304, 350, 62, 106], depth: 0.42 },
        { id: 'fleck', art: 'fleck.svg', box: [176, 66, 8, 8] },
    ],
    idle: twinkle,
    afterglow,
    open,
    revealAt: 2100,
    // A soft fifth held underneath; one glassy note for each curtain as it rises, climbing; then the
    // whole chord, held, as the sky stands alight.
    sound: {
        v: 1,
        inst: 'glassy',
        tonic: 62,
        score: [
            { at: 0, pitch: 50, dur: 3900, gain: 0.37, inst: 'pad' },
            { at: 0, pitch: 57, dur: 3900, gain: 0.32, inst: 'pad' },
            { at: 300, pitch: 69, dur: 420, gain: 0.62 },
            { at: 650, pitch: 74, dur: 420, gain: 0.64 },
            { at: 1000, pitch: 78, dur: 620, gain: 0.68 },
            { at: 1700, pitch: 81, dur: 2000, gain: 0.37 },
            { at: 1700, pitch: 78, dur: 2000, gain: 0.37 },
            { at: 1700, pitch: 74, dur: 2000, gain: 0.42 },
        ],
    },
};
