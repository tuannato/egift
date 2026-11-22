import type { IdleStep, NoteDef, Step, WrapperDef } from '../stage/format';
import { scaled } from './tune';

/**
 * Umbrella — for checking in on someone: "I am here for you". A grey street
 * corner in flat shapes: low lobed clouds, a row of narrow house fronts, a lit
 * lamp post, a bench, a paved sidewalk with two puddles, the first drops. One
 * furled coral umbrella leans on the bench. Opening: the rain thickens; the
 * umbrella stands up and springs open over the middle of the frame; drops
 * burst on it and rings spread on the wet slabs; then the clouds part, a shaft
 * of sun fans down through the gap, the rain thins away, the fronts turn
 * cream and peach, the lamp goes out and the tree is in leaf; the
 * umbrella closes and leans back on the bench, and where it sheltered the
 * pavement the light stays.
 *
 * The stage moves whole layers, so the umbrella is three layers about one
 * axis: the rod with its crook (always there), the furled cloth (narrows to
 * nothing) and the open canopy (grows from the hub). The canopy never turns:
 * the umbrella is upright whenever it is open.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/umbrella.gen.mjs): each SVG's viewBox is its box.
 */

/** How far the furled umbrella leans on the bench, in degrees clockwise about its foot. */
const LEAN = 12;
/** How far below its place the canopy starts, so that it lifts as it opens. */
const SAG = 26;
/** How far each bank of cloud slides to its side. */
const PART = 138;
/** The rain's travel along its own slant: far layer, near layer. */
const RAIN = { x: -24, y: 60 } as const;
const DROPS = { x: -40, y: 100 } as const;

const open: Step[] = [
    // 1. The rain thickens: the streaks fade in and travel down their slant, once; the first drops go with them.
    { kind: 'move', layer: 'rain', at: 0, dur: 600, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'rain', at: 0, dur: 2600, to: { x: 0, y: 0 } },
    { kind: 'move', layer: 'drops', at: 0, dur: 2600, to: { ...DROPS } },
    // 2. The umbrella stands up off the bench and springs open: the furled cloth narrows to nothing as the
    //    canopy grows from the hub and lifts. The rod stays.
    { kind: 'move', layer: 'handle', at: 280, dur: 260, ease: 'inout', to: { turn: 0 } },
    { kind: 'move', layer: 'furled', at: 280, dur: 260, ease: 'inout', to: { turn: 0 } },
    { kind: 'move', layer: 'furled', at: 400, dur: 200, ease: 'inout', to: { sx: 0 } },
    { kind: 'move', layer: 'canopy', at: 500, dur: 70, to: { opacity: 1 } },
    { kind: 'move', layer: 'canopy', at: 500, dur: 600, ease: 'back', to: { sx: 1, sy: 1, y: 0 } },
    // 3. Drops burst on the canopy, from both shoulders of the dome; rings spread on the puddles.
    //    They are thrown a short way up from the dome's top edge and drip off the two ends of its rim, so none
    //    crosses the canopy's face.
    { kind: 'scatter', layer: 'splash-a', at: 1100, dur: 700, count: 4, spread: 14, fall: -12 },
    { kind: 'scatter', layer: 'splash-b', at: 1220, dur: 700, count: 4, spread: 14, fall: -12 },
    { kind: 'scatter', layer: 'splash-c', at: 1160, dur: 700, count: 4, spread: 13, fall: -10 },
    { kind: 'scatter', layer: 'splash-d', at: 1300, dur: 700, count: 4, spread: 13, fall: -10 },
    { kind: 'scatter', layer: 'splash-e', at: 1200, dur: 700, count: 2, spread: 11, fall: 40 },
    { kind: 'scatter', layer: 'splash-f', at: 1120, dur: 700, count: 2, spread: 11, fall: 40 },
    { kind: 'move', layer: 'ripples', at: 1150, dur: 500, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    // 4. The clouds slide apart, the sunny sky comes up behind them, the shaft of sun comes down through
    //    the gap onto the umbrella, the rain thins away, the fronts warm.
    { kind: 'move', layer: 'cloud-l', at: 1900, dur: 900, ease: 'inout', to: { x: -PART } },
    { kind: 'move', layer: 'cloud-r', at: 1900, dur: 900, ease: 'inout', to: { x: PART } },
    { kind: 'move', layer: 'sun-sky', at: 1950, dur: 800, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'rain', at: 1900, dur: 700, ease: 'inout', to: { opacity: 0 } },
    { kind: 'move', layer: 'drops', at: 1900, dur: 600, ease: 'inout', to: { opacity: 0 } },
    { kind: 'move', layer: 'ripples', at: 2100, dur: 600, ease: 'inout', to: { opacity: 0 } },
    { kind: 'move', layer: 'warm', at: 2000, dur: 800, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'shaft', at: 2100, dur: 700, ease: 'out', to: { opacity: 1, sy: 1 } },
    //    The sidewalk takes the light too, half of it for now.
    { kind: 'move', layer: 'glow', at: 2150, dur: 550, ease: 'inout', to: { opacity: 0.5 } },
    // 5. The umbrella closes and leans back on the bench; where it sheltered the slabs, the light stays,
    //    and the puddles turn bright.
    { kind: 'move', layer: 'canopy', at: 2700, dur: 360, ease: 'in', to: { sx: 0.2, sy: 0.2, y: SAG } },
    { kind: 'move', layer: 'canopy', at: 3000, dur: 70, to: { opacity: 0 } },
    { kind: 'move', layer: 'furled', at: 2990, dur: 200, ease: 'out', to: { sx: 1 } },
    { kind: 'move', layer: 'handle', at: 3120, dur: 280, ease: 'inout', to: { turn: LEAN } },
    { kind: 'move', layer: 'furled', at: 3120, dur: 280, ease: 'inout', to: { turn: LEAN } },
    { kind: 'move', layer: 'glow', at: 2760, dur: 620, ease: 'inout', to: { opacity: 1 } },
];

/** The clouds never hold still. */
const drift: IdleStep[] = [
    { layer: 'cloud-l', field: 'x', amp: 5, period: 9000 },
    { layer: 'cloud-r', field: 'x', amp: 4, period: 11000, phase: 0.4 },
];

const idle: IdleStep[] = [
    ...drift,
    { layer: 'puddle-hi', field: 'opacity', amp: 0.22, period: 4200 },
    { layer: 'drops', field: 'x', amp: 3, period: 5200 },
    { layer: 'drops', field: 'y', amp: 4, period: 3800, phase: 0.2 },
];

const afterglow: IdleStep[] = [
    ...drift,
    { layer: 'glow', field: 'opacity', amp: 0.1, period: 4600 },
    { layer: 'puddle-hi', field: 'opacity', amp: 0.22, period: 4200 },
    { layer: 'shaft', field: 'opacity', amp: 0.16, period: 5600, phase: 0.3 },
    { layer: 'handle', field: 'turn', amp: 0.5, period: 6400 },
    { layer: 'furled', field: 'turn', amp: 0.5, period: 6400 },
];

/** Rain on the slabs: a few very soft ticks of noise, unevenly spaced, thinning as the sun arrives. */
const ticks: NoteDef[] = [0, 170, 300, 520, 640, 900, 1110, 1190, 1420, 1700, 1960].map((at, i) => ({ at, pitch: [86, 82, 89, 84, 80, 88, 83, 90, 85, 81, 87][i]!, dur: 40, gain: i > 8 ? 0.1 : 0.16, inst: 'noise' as const }));
/** The sun: four notes climbing as the clouds part, then a chord held on home. */
const sunTune: NoteDef[] = [
    { at: 1900, pitch: 69, dur: 220, gain: 0.5 },
    { at: 2130, pitch: 74, dur: 220, gain: 0.52 },
    { at: 2360, pitch: 76, dur: 220, gain: 0.54 },
    { at: 2590, pitch: 81, dur: 280, gain: 0.58 },
    { at: 2900, pitch: 78, dur: 1700, gain: 0.5 },
    { at: 2900, pitch: 74, dur: 1700, gain: 0.44 },
    { at: 2900, pitch: 69, dur: 1700, gain: 0.4 },
    { at: 2900, pitch: 62, dur: 1700, gain: 0.4 },
    { at: 1900, pitch: 50, dur: 2700, gain: 0.3, inst: 'pad' },
];

export const umbrella: WrapperDef = {
    id: 'umbrella',
    name: { vi: 'Ô trong mưa', en: 'Umbrella in the rain' },
    ambient: ['#3B4A5C', '#E4572E', '#F9D98C'],
    blurb: {
        vi: 'Góc phố xám, hình phẳng. Mưa dày lên, chiếc ô san hô bật mở che giữa khung; mây rẽ, nắng rọi xuống, ô khép lại và ánh sáng ở lại.',
        en: 'A grey street corner in flat shapes. The rain thickens and a coral umbrella springs open; the clouds part, it closes, and the light stays.',
    },
    // The rain sky for the surface, the sunny sky's pale end for the words, the sun for the one loud colour.
    theme: { ground: '#252E3A', surface: '#3B4A5C', ink: '#FCEBC2', accent: '#F9D98C', onAccent: '#2B2B2B', material: 'glass', corner: 'round', face: 'grotesk', voice: 'glass' },
    focus: [0.5, 0.5],
    size: [360, 450],
    backdrop: '#3B4A5C',
    // The boxes are those the generator writes (copied by hand; a mismatch shows as stretched art).
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-6, -6, 372, 186], depth: 0.03 },
        { id: 'sun-sky', art: 'sun-sky.svg', box: [-6, -6, 372, 186], start: { opacity: 0 }, depth: 0.03 },
        { id: 'street', art: 'street.svg', box: [-6, 140, 372, 316], depth: 0.2 },
        { id: 'warm', art: 'warm.svg', box: [-8, 144, 376, 174], start: { opacity: 0 }, depth: 0.2 },
        { id: 'puddle-hi', art: 'puddle-hi.svg', box: [24, 374, 292, 54], start: { opacity: 0.7 }, depth: 0.2 },
        { id: 'ripples', art: 'ripples.svg', box: [26, 376, 310, 46], start: { opacity: 0, sx: 0.8, sy: 0.8 }, depth: 0.2 },
        { id: 'glow', art: 'glow.svg', box: [-6, 326, 372, 104], start: { opacity: 0 }, depth: 0.2 },
        { id: 'rain', art: 'rain.svg', box: [-30, 60, 420, 280], start: { opacity: 0, x: -RAIN.x, y: -RAIN.y }, depth: 0.3 },
        { id: 'drops', art: 'drops.svg', box: [40, 110, 280, 240], depth: 0.4 },
        // The fan of light reaches down from the top of the frame.
        { id: 'shaft', art: 'shaft.svg', box: [80, -6, 200, 300], origin: [0.5, 0], start: { opacity: 0, sy: 0.6 }, depth: 0.2 },
        // Rod and furled cloth turn about the umbrella's foot (180, 392); the canopy grows from its hub (180, 160).
        { id: 'handle', art: 'handle.svg', box: [172, 146, 30, 250], origin: [8 / 30, 246 / 250], start: { turn: LEAN }, depth: 0.3 },
        { id: 'furled', art: 'furled.svg', box: [162, 160, 36, 236], origin: [0.5, 232 / 236], start: { turn: LEAN }, depth: 0.3 },
        { id: 'canopy', art: 'canopy.svg', box: [56, 154, 248, 100], origin: [0.5, 0.06], start: { opacity: 0, sx: 0.2, sy: 0.2, y: SAG }, depth: 0.3 },
        { id: 'splash-a', art: 'splash-a.svg', box: [147, 142, 6, 8], depth: 0.3 },
        { id: 'splash-b', art: 'splash-b.svg', box: [207, 142, 6, 8], depth: 0.3 },
        { id: 'splash-c', art: 'splash-c.svg', box: [105, 156, 6, 8], depth: 0.3 },
        { id: 'splash-d', art: 'splash-d.svg', box: [249, 156, 6, 8], depth: 0.3 },
        { id: 'splash-e', art: 'splash-e.svg', box: [41, 246, 6, 8], depth: 0.3 },
        { id: 'splash-f', art: 'splash-f.svg', box: [313, 246, 6, 8], depth: 0.3 },
        { id: 'cloud-l', art: 'cloud-l.svg', box: [-110, -12, 340, 176], depth: 0.1 },
        { id: 'cloud-r', art: 'cloud-r.svg', box: [140, -12, 330, 176], depth: 0.07 },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2500,
    // Rain first, in soft ticks; then four notes as the sun arrives and a chord held on home.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 74,
        score: scaled(0.48, [...ticks, ...sunTune].sort((a, b) => a.at - b.at || b.pitch - a.pitch)),
    },
};
