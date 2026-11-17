import type { IdleStep, NoteDef, Step, WrapperDef } from '../stage/format';

/**
 * Neon — a sign on a dark brick wall, for love, for friends, for a night out.
 * A heart drawn as a double tube over two words in tube lettering: "forever"
 * and "love". (The owner allows lettering on this wrapper, and on this one
 * only; the letters are paths drawn by the generator, never a font.) Closed,
 * the heart glows low and the letters are cold grey glass over a shelf of
 * bottles. Opening: the heart comes up, dips once and holds; its pink fills
 * the air; "forever" lights in cyan, then "love" in pink; the colour runs
 * over the bricks and along the edges of the glasses below.
 *
 * The stage fades whole layers, so a tube lights by its lit picture fading in
 * over its cold one.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/neon.gen.mjs): each SVG's viewBox is its box.
 */

/** How bright the halos and the spill stand once open: below 1, so that they can breathe both ways. */
const GLOW = 0.84;
/** The heart while the gift is closed: about a third of its light. */
const LOW = 0.35;

const open: Step[] = [
    // 1. The switch: sparks at the transformer, and the heart comes up from its low glow, dips once (never
    //    more than 30% below full) and holds. Three changes in a second, no more.
    { kind: 'scatter', layer: 'spark', at: 40, dur: 700, count: 9, spread: 30, fall: 30 },
    { kind: 'move', layer: 'heart-lit', at: 120, dur: 260, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'halo-h', at: 120, dur: 260, ease: 'out', to: { opacity: 0.45 } },
    { kind: 'move', layer: 'heart-lit', at: 500, dur: 240, ease: 'inout', to: { opacity: 0.72 } },
    { kind: 'move', layer: 'halo-h', at: 500, dur: 240, ease: 'inout', to: { opacity: 0.3 } },
    { kind: 'move', layer: 'heart-lit', at: 800, dur: 320, ease: 'inout', to: { opacity: 1 } },
    // 2. It holds, and its halo grows. A lit tube throws no shadow: the shadows on the wall go.
    { kind: 'move', layer: 'shade', at: 120, dur: 1700, ease: 'inout', to: { opacity: 0 } },
    { kind: 'move', layer: 'halo-h', at: 800, dur: 900, ease: 'out', to: { opacity: GLOW, sx: 1, sy: 1 } },
    // 3. "forever" lights in cyan, then "love" in pink.
    { kind: 'scatter', layer: 'spark', at: 1120, dur: 600, count: 6, spread: 24, fall: 26 },
    { kind: 'move', layer: 'forever-lit', at: 1150, dur: 360, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'halo-f', at: 1180, dur: 620, ease: 'out', to: { opacity: GLOW, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'love-lit', at: 1520, dur: 360, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'halo-l', at: 1550, dur: 620, ease: 'out', to: { opacity: GLOW, sx: 1, sy: 1 } },
    // 4. The rays either side of the heart; the colour spreads on the bricks and reaches the glasses on the shelf.
    { kind: 'move', layer: 'rays-l', at: 1860, dur: 300, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'rays-r', at: 1940, dur: 300, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'spill', at: 1200, dur: 1100, ease: 'inout', to: { opacity: GLOW } },
    { kind: 'move', layer: 'bar-lit', at: 1500, dur: 800, ease: 'inout', to: { opacity: 1 } },
];

const idle: IdleStep[] = [
    // The heart is barely alive, and breathes; so does its air.
    { layer: 'heart-lit', field: 'opacity', amp: 0.07, period: 3800 },
    { layer: 'halo-h', field: 'opacity', amp: 0.06, period: 3800 },
];

const afterglow: IdleStep[] = [
    { layer: 'halo-h', field: 'opacity', amp: 0.14, period: 4600 },
    { layer: 'halo-f', field: 'opacity', amp: 0.14, period: 5400, phase: 0.5 },
    { layer: 'halo-l', field: 'opacity', amp: 0.14, period: 6200, phase: 0.25 },
    { layer: 'spill', field: 'opacity', amp: 0.1, period: 7000, phase: 0.75 },
];

/** A soft click of the switch, then three notes: the heart, the first word, the second. */
const score: NoteDef[] = [
    { at: 0, pitch: 80, dur: 70, inst: 'noise', bend: -6, gain: 0.3 },
    { at: 120, pitch: 69, dur: 700, gain: 0.9 },
    { at: 1150, pitch: 76, dur: 500, gain: 0.9 },
    { at: 1520, pitch: 81, dur: 1500, gain: 1 },
    { at: 1520, pitch: 57, dur: 1500, gain: 0.5, inst: 'pad' },
];

/** The sign's layers stand a little off the wall, all by the same amount. */
const SIGN = 0.26;

export const neon: WrapperDef = {
    id: 'neon',
    name: { vi: 'Neon', en: 'Neon' },
    ambient: ['#150A1C', '#FF2E88', '#22E3FF'],
    blurb: {
        vi: 'Biển neon trên tường gạch tối. Trái tim sáng lên, rồi chữ forever, rồi love; màu loang lên gạch và những chiếc ly.',
        en: 'A neon sign on dark brick. The heart comes up and holds, then "forever" and "love" light, and colour runs over the wall.',
    },
    // The wall for the surface, the lit core for the words, the heart's pink for the one loud colour.
    theme: { ground: '#0B0510', surface: '#22122B', ink: '#FFF3FA', accent: '#FF2E88', onAccent: '#0B0510', material: 'wire', corner: 'round', face: 'poster', voice: 'pulse' },
    focus: [0.5, 0.46],
    size: [360, 450],
    backdrop: '#150A1C',
    layers: [
        { id: 'wall', art: 'wall.svg', box: [-6, -6, 372, 462], depth: 0.04 },
        { id: 'spill', art: 'spill.svg', box: [0, 10, 360, 390], start: { opacity: 0 }, depth: 0.04 },
        { id: 'halo-h', art: 'halo-h.svg', box: [58, 14, 244, 220], start: { opacity: 0.22, sx: 0.62, sy: 0.62 }, depth: 0.14 },
        { id: 'halo-f', art: 'halo-f.svg', box: [34, 190, 292, 96], start: { opacity: 0, sx: 0.7, sy: 0.7 }, depth: 0.14 },
        { id: 'halo-l', art: 'halo-l.svg', box: [68, 258, 224, 116], start: { opacity: 0, sx: 0.7, sy: 0.7 }, depth: 0.14 },
        { id: 'shade', art: 'shade.svg', box: [62, 46, 240, 312], depth: SIGN },
        { id: 'tubes', art: 'tubes.svg', box: [18, 30, 324, 366], depth: SIGN },
        { id: 'rays-l', art: 'rays-l.svg', box: [29, 29, 72, 156], start: { opacity: 0 }, depth: SIGN },
        { id: 'rays-r', art: 'rays-r.svg', box: [259, 29, 72, 156], start: { opacity: 0 }, depth: SIGN },
        { id: 'heart-lit', art: 'heart-lit.svg', box: [80, 33, 200, 184], start: { opacity: LOW }, depth: SIGN },
        { id: 'forever-lit', art: 'forever-lit.svg', box: [56, 196, 248, 77], start: { opacity: 0 }, depth: SIGN },
        { id: 'love-lit', art: 'love-lit.svg', box: [88, 264, 184, 96], start: { opacity: 0 }, depth: SIGN },
        { id: 'bar', art: 'bar.svg', box: [-6, 356, 372, 100], depth: 0.6 },
        { id: 'bar-lit', art: 'bar-lit.svg', box: [-6, 356, 372, 86], start: { opacity: 0 }, depth: 0.6 },
        { id: 'spark', art: 'spark.svg', box: [298, 347, 7, 7] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1600,
    sound: { v: 1, inst: 'tine', tonic: 69, score },
};
