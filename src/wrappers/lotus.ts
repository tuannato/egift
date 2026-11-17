import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Lotus — a lotus pond at night, for one's mother: a wish for peace and
 * health. Flat, saturated colour. Seen at an angle from above: round leaves
 * lie on dark teal water and stand over it on tall stems, the moon lies
 * broken on the water, and one big pink bud stands right of centre.
 * Opening: the bud trembles, then three rings of petals open one after
 * another from the outside in; the short petals nearest the viewer stay
 * cupped about the middle, where the stamens show warm. Rings spread on the
 * water from the stem, and fireflies come up over the pond.
 *
 * The stage turns and scales whole layers, so each ring of petals is a left
 * and a right layer drawn open, which start turned in about the flower's
 * base: closed, the petals lie over one another as a bud.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/lotus.gen.mjs): each SVG's viewBox is its box. The boxes and
 * pivots below are copied by hand from what the generator prints.
 */

/** The rings of petals, outside in: [left layer, right layer, degrees it turns outward]. */
const RINGS = [['outer-l', 'outer-r', 46], ['mid-l', 'mid-r', 25], ['inner-l', 'inner-r', 9]] as const;
/** Everything that is the flower, and moves with it. */
const FLOWER = ['outer-l', 'outer-r', 'mid-l', 'mid-r', 'inner-l', 'inner-r', 'stamen', 'cup'] as const;
const RIPPLES = ['rip-1', 'rip-2', 'rip-3'] as const;
/** How small a ring of petals is held while the bud is closed. */
const TIGHT = 0.86;

const open: Step[] = [
    // 1. The bud trembles.
    ...FLOWER.map((layer): Step => ({ kind: 'shake', layer, at: 0, dur: 520, amp: 2, times: 4 })),
    // 2. The rings open from the outside in, each past its place and back.
    ...RINGS.flatMap(([l, r], i): Step[] => [
        { kind: 'move', layer: l, at: 380 + i * 350, dur: 760, ease: 'back', to: { turn: 0, sx: 1, sy: 1 } },
        { kind: 'move', layer: r, at: 430 + i * 350, dur: 760, ease: 'back', to: { turn: 0, sx: 1, sy: 1 } },
    ]),
    // 3. The middle shows, warm.
    { kind: 'move', layer: 'stamen', at: 1250, dur: 650, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    // 4. Rings spread on the water from the stem and are gone.
    ...RIPPLES.flatMap((layer, i): Step[] => [
        { kind: 'move', layer, at: 450 + i * 420, dur: 1300, ease: 'out', to: { sx: 1, sy: 1 } },
        { kind: 'move', layer, at: 450 + i * 420, dur: 260, ease: 'out', to: { opacity: 0.75 } },
        { kind: 'move', layer, at: 450 + i * 420 + 600, dur: 700, ease: 'in', to: { opacity: 0 } },
    ]),
    // 5. Fireflies come up over the pond; a few more scatter from the flower.
    { kind: 'move', layer: 'fire-a', at: 1300, dur: 800, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'fire-a', at: 1300, dur: 1300, ease: 'out', to: { y: 0 } },
    { kind: 'move', layer: 'fire-b', at: 1600, dur: 800, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'fire-b', at: 1600, dur: 1000, ease: 'out', to: { y: 0 } },
    { kind: 'scatter', layer: 'fleck', at: 1450, dur: 1100, count: 10, spread: 120, fall: -46 },
];

/** The pond is never quite still: leaves bob, the far stems lean, the moon's bars slide. */
const pond: IdleStep[] = [
    { layer: 'front-l', field: 'y', amp: 1.2, period: 5600 },
    { layer: 'front-r', field: 'turn', amp: 0.7, period: 6400, phase: 0.3 },
    { layer: 'leaf-l', field: 'turn', amp: 0.9, period: 5200, phase: 0.6 },
    { layer: 'leaf-r', field: 'turn', amp: 1.1, period: 4700, phase: 0.15 },
    { layer: 'far', field: 'turn', amp: 0.35, period: 7000, phase: 0.45 },
    { layer: 'moon', field: 'x', amp: 2, period: 6000 },
];

const idle: IdleStep[] = [
    ...pond,
    // The bud sways about the top of its stem.
    ...FLOWER.map((layer): IdleStep => ({ layer, field: 'turn', amp: 1.6, period: 5200 })),
];

const afterglow: IdleStep[] = [
    ...pond,
    // The flower breathes.
    ...FLOWER.flatMap((layer): IdleStep[] => [
        { layer, field: 'sx', amp: 0.015, period: 4800 },
        { layer, field: 'sy', amp: 0.015, period: 4800 },
    ]),
    // The fireflies sway, the two fields against each other.
    { layer: 'fire-a', field: 'x', amp: 5, period: 5400 },
    { layer: 'fire-a', field: 'y', amp: 3, period: 4100, phase: 0.2 },
    { layer: 'fire-b', field: 'x', amp: 4, period: 6100, phase: 0.5 },
    { layer: 'fire-b', field: 'y', amp: 3.5, period: 4600, phase: 0.7 },
];

const DEPTH = { far: 0.06, mid: 0.18, flower: 0.3, near: 0.5 } as const;
/** A ring layer's start: turned in about the base by `deg`, a little small. */
const shut = (deg: number) => ({ turn: deg, sx: TIGHT, sy: 0.96 });

export const lotus: WrapperDef = {
    id: 'lotus',
    name: { vi: 'Sen nở', en: 'Lotus' },
    ambient: ['#0D3F45', '#F27BA5', '#F6C34C'],
    blurb: {
        vi: 'Đầm sen đêm trăng. Nụ sen rung nhẹ, ba lớp cánh hồng mở dần từ ngoài vào trong, nhị vàng hé sáng, đom đóm bay lên.',
        en: 'A lotus pond by moonlight. The bud trembles, three rings of pink petals open from the outside in, and fireflies rise.',
    },
    // The lighter water as glass, the moon on the water for the words, the petals' pink for the one loud colour.
    theme: { ground: '#06262B', surface: '#0D3F45', ink: '#E4F1E2', accent: '#F27BA5', onAccent: '#06262B', material: 'glass', corner: 'round', face: 'serif', voice: 'chime' },
    focus: [0.57, 0.45],
    size: [360, 450],
    backdrop: '#06262B',
    layers: [
        { id: 'pond', art: 'pond.svg', box: [-6, -6, 372, 462], depth: 0.03 },
        { id: 'moon', art: 'moon.svg', box: [58, 54, 94, 106], depth: 0.03 },
        ...RIPPLES.map((id, i) => ({ id, art: `${id}.svg`, box: ([[128, 373, 144, 42], [104, 367, 192, 54], [82, 362, 236, 64]] as const)[i]!, start: { opacity: 0, sx: 0.1, sy: 0.1 }, depth: DEPTH.far })),
        { id: 'far', art: 'far.svg', box: [14, 54, 330, 190], origin: [0.503, 1], depth: DEPTH.far },
        { id: 'leaf-l', art: 'leaf-l.svg', box: [-6, 196, 160, 190], origin: [0.4, 0.989], depth: DEPTH.mid },
        { id: 'leaf-r', art: 'leaf-r.svg', box: [226, 186, 140, 160], origin: [0.5, 0.988], depth: DEPTH.mid },
        { id: 'stem', art: 'stem.svg', box: [186, 258, 34, 146], depth: DEPTH.flower },
        { id: 'outer-l', art: 'outer-l.svg', box: [114, 164, 93, 117], origin: [0.978, 0.872], start: shut(RINGS[0][2]), depth: DEPTH.flower },
        { id: 'outer-r', art: 'outer-r.svg', box: [203, 182, 102, 97], origin: [0.02, 0.866], start: shut(-RINGS[0][2]), depth: DEPTH.flower },
        { id: 'mid-l', art: 'mid-l.svg', box: [146, 130, 63, 138], origin: [0.937, 0.986], start: shut(RINGS[1][2]), depth: DEPTH.flower },
        { id: 'mid-r', art: 'mid-r.svg', box: [203, 141, 79, 129], origin: [0.025, 0.969], start: shut(-RINGS[1][2]), depth: DEPTH.flower },
        { id: 'inner-l', art: 'inner-l.svg', box: [168, 115, 55, 153], origin: [0.673, 0.987], start: shut(RINGS[2][2]), depth: DEPTH.flower },
        { id: 'inner-r', art: 'inner-r.svg', box: [197, 121, 62, 147], origin: [0.129, 0.986], start: shut(-RINGS[2][2]), depth: DEPTH.flower },
        { id: 'stamen', art: 'stamen.svg', box: [158, 172, 116, 66], origin: [0.499, 0.921], start: { opacity: 0, sx: 0.6, sy: 0.6 }, depth: DEPTH.flower },
        { id: 'cup', art: 'cup.svg', box: [176, 188, 66, 81], origin: [0.439, 0.963], depth: DEPTH.flower },
        { id: 'front-l', art: 'front-l.svg', box: [-6, 352, 206, 104], depth: DEPTH.near },
        { id: 'front-r', art: 'front-r.svg', box: [222, 322, 144, 134], origin: [0.764, 1], depth: DEPTH.near },
        { id: 'fire-a', art: 'fire-a.svg', box: [8, 40, 344, 300], start: { opacity: 0, y: 18 }, depth: 0.4 },
        { id: 'fire-b', art: 'fire-b.svg', box: [8, 70, 344, 320], start: { opacity: 0, y: 14 }, depth: 0.6 },
        { id: 'fleck', art: 'fleck.svg', box: [201, 226, 8, 8] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1900,
    // A small bell, four slow notes rising to home, over a held pad.
    sound: {
        v: 1,
        inst: 'bell',
        tonic: 67,
        score: scaled(0.87, together(
            tune(100, 'G4/4 D5/4 B4/4 | G5/1!'),
            tune(100, 'G3/2. -/4 | [G3 D4]/2.', { inst: 'pad', gain: 0.3 }),
        )),
    },
};
