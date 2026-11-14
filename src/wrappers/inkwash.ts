import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { together, tune } from './tune';

/**
 * Ink wash (thuỷ mặc) — a silk scroll and a landscape, in INK WASH. On a sheet
 * of xuan paper with ink blooms and a pale spray of bamboo lies a scroll,
 * rolled and tied with a vermilion cord. Opening: the knot slackens, the cord
 * slips off along the roll; the stave rises and the roll runs down, letting
 * out the silk-mounted sheet; then the painting comes up the way a wash is
 * laid — the far range in the clearest ink, the pillars in heavy ink, the near
 * crag and its pines in the darkest — mist drifts between the ranges, a
 * small vermilion sun rises from behind the pillars, two cranes cross the sky, and a small
 * seal is pressed in the corner. No text: the frame shows the gift.
 *
 * Canvas 360x450. Open, the sheet is x 40..320, y 137..330; the painting is
 * x 54..306, y 150..318. The art is drawn where it is when OPEN
 * (scripts/art/inkwash.gen.mjs: each SVG's viewBox is its box); closed, the
 * stave and the sheet start LIFT units lower, behind the roll (centre y 222).
 * The sheet unrolls as a scale from its top edge: its bottom edge is at
 * 137 + y + 193 * sy, linear in the eased time, and the roll rides on it.
 */

/** How far below their open place the stave and the sheet's top edge start. */
const LIFT = 87.5;
/** How far the roll runs down, and how thin it ends. */
const RUN = 110;
const THIN = 0.47;
/** The cord and what hangs from it. */
const CORD = ['cord', 'tail-a', 'tail-b', 'knot'];
/** What is let out as the scroll unrolls: the sheet, and the first pale washes already on it. Their boxes share the sheet's top edge. */
const UNROLLED = ['sheet', 'far', 'mist-a'];

/** The scroll's own plane, and the painting on it. */
const D = 0.5;

const open: Step[] = [
    // 1. The knot gives: the tails ease out, the knot loosens.
    { kind: 'move', layer: 'tail-a', at: 0, dur: 520, ease: 'inout', to: { turn: -9 } },
    { kind: 'move', layer: 'tail-b', at: 60, dur: 520, ease: 'inout', to: { turn: 10 } },
    { kind: 'move', layer: 'knot', at: 100, dur: 420, ease: 'inout', to: { sx: 1.2, sy: 1.12 } },
    // 2. The cord slips off along the roll and is gone.
    ...CORD.map((layer): Step => ({ kind: 'move', layer, at: 420, dur: 700, ease: 'in', to: { x: 96, y: 14 } })),
    ...CORD.map((layer): Step => ({ kind: 'move', layer, at: 680, dur: 440, ease: 'in', to: { opacity: 0 } })),
    { kind: 'move', layer: 'tail-a', at: 420, dur: 700, ease: 'inout', to: { turn: -30 } },
    { kind: 'move', layer: 'tail-b', at: 420, dur: 700, ease: 'inout', to: { turn: -22 } },
    // 3. The scroll unrolls: the stave rises, the roll runs down and thins, the sheet is let out between them.
    //    The far range and its mist are already on the sheet and unroll with it, so the paper is never bare.
    { kind: 'move', layer: 'rod', at: 1000, dur: 1500, ease: 'inout', to: { y: 0 } },
    ...UNROLLED.map((layer): Step => ({ kind: 'move', layer, at: 1000, dur: 1500, ease: 'inout', to: { y: 0, sy: 1 } })),
    { kind: 'move', layer: 'roll', at: 1000, dur: 1500, ease: 'inout', to: { y: RUN, sy: THIN } },
    { kind: 'move', layer: 'far', at: 1150, dur: 800, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'mist-a', at: 1350, dur: 900, ease: 'inout', to: { opacity: 1 } },
    // The paper under it goes quiet.
    { kind: 'move', layer: 'bamboo', at: 1000, dur: 1500, ease: 'inout', to: { opacity: 0.55 } },
    // 4. The painting, from pale to dark.
    { kind: 'move', layer: 'mid', at: 2250, dur: 950, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'mist-b', at: 2600, dur: 900, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'near', at: 2800, dur: 1000, ease: 'inout', to: { opacity: 1 } },
    // Mist drifts between the ranges.
    { kind: 'move', layer: 'mist-a', at: 1350, dur: 4400, ease: 'out', to: { x: 0 } },
    { kind: 'move', layer: 'mist-b', at: 2600, dur: 3200, ease: 'out', to: { x: 0 } },
    // 5. The sun rises from behind the pillars into the open sky.
    { kind: 'move', layer: 'sun', at: 3300, dur: 400, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'sun', at: 3300, dur: 1900, ease: 'out', to: { y: 0 } },
    // 6. Two cranes cross the sky.
    { kind: 'move', layer: 'cranes', at: 3600, dur: 500, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'cranes', at: 3600, dur: 1900, ease: 'out', to: { x: 0, y: 0 } },
    // 7. The seal is pressed.
    { kind: 'move', layer: 'seal', at: 5350, dur: 260, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
];

const idle: IdleStep[] = [
    { layer: 'bloom', field: 'opacity', amp: 0.1, period: 7000 },
    { layer: 'tail-a', field: 'turn', amp: 1.1, period: 5200 },
    { layer: 'tail-b', field: 'turn', amp: 0.9, period: 6100, phase: 0.4 },
];

const afterglow: IdleStep[] = [
    { layer: 'mist-a', field: 'x', amp: 7, period: 11000 },
    { layer: 'mist-b', field: 'x', amp: 9, period: 9000, phase: 0.5 },
    { layer: 'cranes', field: 'y', amp: 1.4, period: 5000 },
    { layer: 'sun', field: 'y', amp: 0.8, period: 9000 },
];

export const inkwash: WrapperDef = {
    id: 'inkwash',
    name: { vi: 'Thuỷ mặc', en: 'Ink wash' },
    ambient: ['#E7E0CF', '#8F8A80', '#C7391F'],
    blurb: {
        vi: 'Cuộn tranh lụa buộc dây son trên giấy xuyến loang mực. Tranh mở: núi hiện từ nhạt đến đậm, sương trôi, mặt trời son lên, hạc bay qua.',
        en: 'A silk scroll tied with vermilion cord. It unrolls: mountains rise from pale to dark, mist drifts, a red sun climbs, cranes cross.',
    },
    // Ivory paper, ink for text, the one vermilion.
    theme: { ground: '#3A3631', surface: '#F3EDDF', ink: '#14110E', accent: '#B8321B', onAccent: '#FFFFFF', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.5],
    size: [360, 450],
    backdrop: '#E7E0CF',
    layers: [
        { id: 'paper', art: 'paper.svg', box: [-12, -12, 384, 474], depth: 0.04 },
        { id: 'bloom', art: 'bloom.svg', box: [-12, -12, 384, 474], start: { opacity: 0.85 }, depth: 0.08 },
        { id: 'bamboo', art: 'bamboo.svg', box: [-12, -12, 384, 474], depth: 0.12 },
        { id: 'sheet', art: 'sheet.svg', box: [34, 137, 296, 200], origin: [0.5, 0], start: { y: LIFT, sy: 0.02 }, depth: D },
        { id: 'far', art: 'far.svg', box: [54, 137, 252, 181], origin: [0.5, 0], start: { opacity: 0, y: LIFT, sy: 0.02 }, depth: D },
        { id: 'sun', art: 'sun.svg', box: [238, 147, 48, 48], start: { opacity: 0, y: 56 }, depth: D },
        { id: 'mist-a', art: 'mist-a.svg', box: [24, 137, 312, 185], origin: [0.5, 0], start: { opacity: 0, x: -22, y: LIFT, sy: 0.02 }, depth: D },
        { id: 'mid', art: 'mid.svg', box: [54, 150, 252, 168], start: { opacity: 0 }, depth: D },
        { id: 'mist-b', art: 'mist-b.svg', box: [24, 196, 312, 126], start: { opacity: 0, x: 24 }, depth: D },
        { id: 'near', art: 'near.svg', box: [54, 150, 252, 168], start: { opacity: 0 }, depth: D },
        { id: 'cranes', art: 'cranes.svg', box: [94, 146, 80, 36], start: { opacity: 0, x: 118, y: 14 }, depth: D },
        { id: 'seal', art: 'seal.svg', box: [286, 294, 16, 16], start: { opacity: 0, sx: 1.5, sy: 1.5 }, depth: D },
        { id: 'rod', art: 'rod.svg', box: [30, 128, 300, 14], start: { y: LIFT }, depth: D },
        { id: 'roll', art: 'roll.svg', box: [14, 198, 332, 68], origin: [0.5, 24 / 68], depth: D },
        { id: 'cord', art: 'cord.svg', box: [160, 198, 40, 48], depth: D },
        { id: 'tail-a', art: 'tail-a.svg', box: [172, 216, 84, 108], origin: [9 / 84, 8 / 108], depth: D },
        { id: 'tail-b', art: 'tail-b.svg', box: [92, 216, 94, 96], origin: [87 / 94, 8 / 96], depth: D },
        { id: 'knot', art: 'knot.svg', box: [164, 209, 32, 26], depth: D },
    ],
    idle,
    afterglow,
    open,
    revealAt: 3300,
    // An original line on a five-note scale (A C D E G), plucked: it climbs as the scroll unrolls and settles once the sun is up.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 69,
        score: together(
            tune(96, 'A4/8 C5/8 D5/8 E5/8 G5/4 E5/4 | D5/8 E5/8 G5/8 A5/8! E5/2'),
            tune(96, 'A3/1 | -/2 A3/2', { gain: 0.45 }),
        ),
    },
};
