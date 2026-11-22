import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';

/**
 * Constellation — a private wish for a birthday, seen from inside an
 * observatory. Flat shapes: two dark curved dome shutters with brass along
 * their edges frame a tall slit of indigo sky; a long brass telescope rises
 * from the lower left; a parapet, a handrail and a small lit lamp close the
 * bottom. In the slit a band of haze, two layers of small stars, and eight
 * brighter ones that are not yet joined. Opening: the shutters slide further
 * apart; nine links are drawn from star to star, one after another, until the
 * eight stand as one leaning faceted figure; its faces fill with faint light,
 * a soft light comes up at its heart, and one shooting star passes under it.
 *
 * The stage cannot draw a line, so each link is one thin picture, turned to
 * its bearing and scaled from nothing along its own length.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/stars.gen.mjs): each SVG's viewBox is its box.
 */

/** The eight stars and the nine links between them, in the order they are drawn: the same tables as the generator's. */
const V: Readonly<Record<string, readonly [number, number]>> = { A: [148, 78], B: [222, 62], C: [256, 124], D: [206, 246], E: [138, 200], F: [110, 132], G: [162, 142], H: [214, 114] };
const LINKS = ['DE', 'EF', 'FG', 'GH', 'HC', 'CD', 'FA', 'AB', 'BC'] as const;

/** When the first link starts, how long one takes, and how far apart they start. */
const FIRST = 300;
const DRAW = 160;
const APART = 150;
/** The figure is closed. */
const CLOSED = FIRST + APART * (LINKS.length - 1) + DRAW;
/** How far each shutter slides. */
const SLIDE = 38;

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** A link lies level in its picture, from its first star; the stage turns it to its bearing about that star. */
const linkLayers: LayerDef[] = LINKS.map((name, i) => {
    const [a, b] = [V[name[0]!]!, V[name[1]!]!];
    const len = r2(Math.hypot(b[0] - a[0], b[1] - a[1]));
    const turn = r2((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI);
    return { id: `link-${i + 1}`, art: `link-${i + 1}.svg`, box: [a[0] - 3, a[1] - 3, len + 6, 6], origin: [3 / (len + 6), 0.5], start: { turn, sx: 0 }, depth: 0.08 };
});

const open: Step[] = [
    // 1. The shutters slide further apart: the slit widens by a fifth on each side.
    { kind: 'move', layer: 'shutter-l', at: 0, dur: 900, ease: 'inout', to: { x: -SLIDE } },
    { kind: 'move', layer: 'shutter-r', at: 0, dur: 900, ease: 'inout', to: { x: SLIDE } },
    // 2. The links, one after another, each from the star the last one reached.
    ...LINKS.map((_, i): Step => ({ kind: 'move', layer: `link-${i + 1}`, at: FIRST + APART * i, dur: DRAW, ease: 'out', to: { sx: 1 } })),
    //    The stars swell a little as the links pass through them: the first four, then the other four.
    { kind: 'move', layer: 'bright-a', at: FIRST, dur: 380, ease: 'out', to: { opacity: 1, sx: 1.025, sy: 1.025 } },
    { kind: 'move', layer: 'bright-a', at: FIRST + 380, dur: 420, ease: 'inout', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'bright-b', at: FIRST + 4 * APART, dur: 380, ease: 'out', to: { opacity: 1, sx: 1.025, sy: 1.025 } },
    { kind: 'move', layer: 'bright-b', at: FIRST + 4 * APART + 380, dur: 420, ease: 'inout', to: { sx: 1, sy: 1 } },
    // 3. The figure is closed: three faces take a faint tint, a soft light comes up at its heart, a few motes drift up.
    { kind: 'move', layer: 'fill', at: CLOSED - 60, dur: 620, ease: 'out', to: { opacity: 0.85 } },
    { kind: 'move', layer: 'glow', at: CLOSED - 20, dur: 760, ease: 'out', to: { opacity: 0.9, sx: 1, sy: 1 } },
    { kind: 'scatter', layer: 'fleck', at: CLOSED, dur: 1300, count: 4, spread: 54, fall: -22 },
    // 4. One shooting star passes under the figure and is gone.
    { kind: 'move', layer: 'streak', at: 1500, dur: 560, ease: 'linear', to: { x: 0, y: 0 } },
    { kind: 'move', layer: 'streak', at: 1500, dur: 90, to: { opacity: 1 } },
    { kind: 'move', layer: 'streak', at: 1840, dur: 220, ease: 'in', to: { opacity: 0 } },
];

/** The small stars never stop: two layers, out of step. */
const twinkle: IdleStep[] = [
    { layer: 'small-a', field: 'opacity', amp: 0.22, period: 5200 },
    { layer: 'small-b', field: 'opacity', amp: 0.22, period: 6800, phase: 0.45 },
];

const idle: IdleStep[] = [
    ...twinkle,
    { layer: 'bright-a', field: 'opacity', amp: 0.1, period: 4400 },
    { layer: 'bright-b', field: 'opacity', amp: 0.1, period: 5600, phase: 0.5 },
];

const afterglow: IdleStep[] = [
    ...twinkle,
    // The figure breathes in brightness: its faces, its heart, and its links a little. The telescope does not move.
    { layer: 'fill', field: 'opacity', amp: 0.15, period: 4800 },
    { layer: 'glow', field: 'opacity', amp: 0.1, period: 4800, phase: 0.08 },
    { layer: 'glow', field: 'sx', amp: 0.04, period: 4800, phase: 0.08 },
    { layer: 'glow', field: 'sy', amp: 0.04, period: 4800, phase: 0.08 },
    ...LINKS.map((_, i): IdleStep => ({ layer: `link-${i + 1}`, field: 'opacity', amp: 0.16, period: 4800, phase: 0.5 })),
];

export const stars: WrapperDef = {
    id: 'stars',
    name: { vi: 'Chòm sao', en: 'Constellation' },
    ambient: ['#0B1030', '#9DB4FF', '#FFD98A'],
    blurb: {
        vi: 'Bầu trời qua khe mái vòm đài thiên văn. Chín nét nối tám vì sao thành một hình đa diện, rồi một quầng sáng dịu lên ở giữa.',
        en: 'The sky through an observatory dome. Nine lines join eight stars into one faceted figure, and a soft light rises at its heart.',
    },
    // The dome's near-black for the room, the sky's indigo for the surface, star white for the words, the lamp's gold for the one loud colour.
    theme: { ground: '#060818', surface: '#1B1446', ink: '#F4F1FF', accent: '#FFD98A', onAccent: '#060818', material: 'wire', corner: 'round', face: 'tech', voice: 'glass' },
    focus: [0.54, 0.37],
    size: [360, 450],
    backdrop: '#0B1030',
    // The boxes are those the generator prints (copied by hand, except the links', which are computed from the same table).
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-6, -6, 372, 462], depth: 0.03 },
        { id: 'small-a', art: 'small-a.svg', box: [24, -2, 312, 396], start: { opacity: 0.78 }, depth: 0.05 },
        { id: 'small-b', art: 'small-b.svg', box: [24, -2, 312, 396], start: { opacity: 0.78 }, depth: 0.07 },
        { id: 'streak', art: 'streak.svg', box: [108, 278.25, 74.25, 43.75], start: { opacity: 0, x: 192, y: -106 }, depth: 0.07 },
        { id: 'fill', art: 'fill.svg', box: [108, 60, 150, 188], start: { opacity: 0 }, depth: 0.08 },
        { id: 'glow', art: 'glow.svg', box: [102, 76, 184, 184], start: { opacity: 0, sx: 0.25, sy: 0.25 }, depth: 0.08 },
        ...linkLayers,
        { id: 'bright-a', art: 'bright-a.svg', box: [91, 113, 134, 152], start: { opacity: 0.8 }, depth: 0.08 },
        { id: 'bright-b', art: 'bright-b.svg', box: [129, 43, 146, 100], start: { opacity: 0.8 }, depth: 0.08 },
        { id: 'shutter-l', art: 'shutter-l.svg', box: [-6, -6, 128, 462], depth: 0.2 },
        { id: 'shutter-r', art: 'shutter-r.svg', box: [238, -6, 128, 462], depth: 0.2 },
        { id: 'rail', art: 'rail.svg', box: [-6, 322, 372, 134], depth: 0.3 },
        { id: 'telescope', art: 'telescope.svg', box: [-6, 238, 262, 218], depth: 0.45 },
        { id: 'fleck', art: 'fleck.svg', box: [191, 165, 6, 6] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1700,
    // A low fifth held underneath; one glassy note for each link, climbing a pentatonic scale; then the
    // home chord, held, as the figure stands closed.
    sound: {
        v: 1,
        inst: 'glassy',
        tonic: 64,
        score: [
            { at: 0, pitch: 40, dur: 3700, gain: 0.39, inst: 'pad' },
            { at: 0, pitch: 47, dur: 3700, gain: 0.35, inst: 'pad' },
            ...[64, 66, 68, 71, 73, 76, 78, 80, 83].map((pitch, i) => ({ at: FIRST + APART * i, pitch, dur: 180, gain: r2(0.46 + 0.023 * i) })),
            { at: CLOSED + 40, pitch: 80, dur: 1900, gain: 0.35 },
            { at: CLOSED + 40, pitch: 71, dur: 1900, gain: 0.35 },
            { at: CLOSED + 40, pitch: 76, dur: 1900, gain: 0.39 },
        ],
    },
};
