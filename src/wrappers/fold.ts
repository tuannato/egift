import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Plain fold — the basic wrapper, for any occasion, in PAPER-CUT. The stage is
 * a shadow box of flat cut sheets: a graphite back, a paper moon (it sets as the letter opens), three ridges
 * cut from darker and darker paper. In front, a letter of ivory paper folded
 * in three, tied with two turns of terracotta cord and a flat knot.
 * Opening: the knot slackens, the cord slips off and falls; the top panel
 * folds up, the bottom panel folds down; then a pop-up landscape stands up
 * from the lower crease, sheet after sheet — three hills and a terracotta sun.
 * Every shape is one flat colour with a hard offset shadow; depth is stacking
 * and parallax. No text: the frame shows the gift.
 *
 * Canvas 360x450. The letter is 256 wide: top panel 132..192, middle 192..266,
 * bottom 266..340 when open. Folded, the bottom panel lies up over the middle
 * and the top panel (shorter) down over both, leaving one strip of overlap in
 * view. Closed, the letter sits LIFT units higher and settles as it opens.
 * Each fold is a scale through zero at its hinge: the panel's back closes to
 * the hinge line, then its inside opens from it. The art is generated in
 * canvas coordinates (scripts/art/fold.gen.mjs): each SVG's viewBox is its box.
 */

const LIFT = -32;
/** The letter: its panels and their shadows. They settle together as it opens. */
const LETTER = ['shade-mid', 'shade-top', 'shade-bot', 'mid', 'top-open', 'bot-open', 'bot-closed', 'top-closed'];
/** The knot and its tails: they fall as one, turning about the knot. */
const KNOT = ['end-a', 'end-b', 'knot'];

const open: Step[] = [
    // 1. The knot gives: the tails swing out, the knot loosens.
    { kind: 'move', layer: 'end-a', at: 0, dur: 520, ease: 'inout', to: { turn: -16 } },
    { kind: 'move', layer: 'end-b', at: 60, dur: 520, ease: 'inout', to: { turn: 18 } },
    { kind: 'move', layer: 'knot', at: 120, dur: 420, ease: 'inout', to: { sx: 1.16, sy: 1.1 } },
    // 2. The two turns slip down off the letter and are gone; the knot and its tails tumble after them.
    { kind: 'move', layer: 'thread', at: 480, dur: 560, ease: 'in', to: { y: 70 } },
    { kind: 'move', layer: 'thread', at: 700, dur: 300, ease: 'in', to: { opacity: 0 } },
    ...KNOT.map((layer): Step => ({ kind: 'move', layer, at: 520, dur: 820, ease: 'in', to: { y: 100 } })),
    { kind: 'move', layer: 'knot', at: 520, dur: 820, ease: 'in', to: { turn: 56 } },
    { kind: 'move', layer: 'end-a', at: 540, dur: 800, ease: 'inout', to: { turn: 30 } },
    { kind: 'move', layer: 'end-b', at: 540, dur: 800, ease: 'inout', to: { turn: 96 } },
    ...KNOT.map((layer): Step => ({ kind: 'move', layer, at: 1020, dur: 320, ease: 'in', to: { opacity: 0 } })),
    // The paper, let go, eases open a hair.
    { kind: 'move', layer: 'top-closed', at: 620, dur: 420, ease: 'out', to: { sy: 0.95 } },
    // The letter settles lower as it unfolds; the ridges sink behind it, sheet by sheet, and the moon sets.
    ...LETTER.map((layer): Step => ({ kind: 'move', layer, at: 1000, dur: 1500, ease: 'inout', to: { y: 0 } })),
    { kind: 'move', layer: 'disc', at: 1000, dur: 1700, ease: 'inout', to: { y: 72 } },
    { kind: 'move', layer: 'ridge-far', at: 1000, dur: 1700, ease: 'inout', to: { y: 24 } },
    { kind: 'move', layer: 'ridge-mid', at: 1080, dur: 1700, ease: 'inout', to: { y: 30 } },
    { kind: 'move', layer: 'ridge-near', at: 1160, dur: 1700, ease: 'inout', to: { y: 36 } },
    // 3. The top panel folds up: its back closes to the hinge, its inside opens from it.
    { kind: 'move', layer: 'top-closed', at: 1040, dur: 400, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'top-closed', at: 1440, dur: 0, to: { opacity: 0 } },
    { kind: 'move', layer: 'top-open', at: 1440, dur: 560, ease: 'out', to: { sy: 1 } },
    { kind: 'move', layer: 'shade-top', at: 1440, dur: 560, ease: 'out', to: { sy: 1 } },
    // 4. The bottom panel folds down, starting before the top has settled.
    { kind: 'move', layer: 'bot-closed', at: 1760, dur: 400, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'bot-closed', at: 2160, dur: 0, to: { opacity: 0 } },
    { kind: 'move', layer: 'bot-open', at: 2160, dur: 580, ease: 'out', to: { sy: 1 } },
    { kind: 'move', layer: 'shade-bot', at: 2160, dur: 580, ease: 'out', to: { sy: 1 } },
    { kind: 'move', layer: 'emboss', at: 2500, dur: 500, ease: 'out', to: { opacity: 1 } },
    // 5. The pop-up stands up from the lower crease, a beat apart, each with a soft spring; the sun rises behind.
    { kind: 'move', layer: 'hill-back', at: 2700, dur: 560, ease: 'back', to: { sy: 1 } },
    { kind: 'move', layer: 'hill-mid', at: 2880, dur: 560, ease: 'back', to: { sy: 1 } },
    { kind: 'move', layer: 'hill-front', at: 3060, dur: 560, ease: 'back', to: { sy: 1 } },
    { kind: 'move', layer: 'sun', at: 3200, dur: 160, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'sun', at: 3200, dur: 760, ease: 'out', to: { y: 0 } },
];

const idle: IdleStep[] = [
    { layer: 'end-a', field: 'turn', amp: 3.2, period: 4600 },
    { layer: 'end-b', field: 'turn', amp: 2.6, period: 5400, phase: 0.35 },
    { layer: 'disc', field: 'y', amp: 1.5, period: 9000 },
];

const afterglow: IdleStep[] = [
    { layer: 'sun', field: 'y', amp: 1.5, period: 8000 },
];

export const fold: WrapperDef = {
    id: 'fold',
    name: { vi: 'Nếp gấp', en: 'Plain fold' },
    ambient: ['#C4572A', '#B5AB98', '#2B2825'],
    blurb: {
        vi: 'Lá thư gấp ba trong hộp tranh cắt giấy, buộc dây màu đất nung. Dây tuột ra, giấy mở từng nếp, đồi giấy và mặt trời dựng lên.',
        en: 'A tri-fold letter in a cut-paper shadow box, tied with terracotta cord. The cord slips off, the folds open, paper hills and a sun pop up.',
    },
    // Graphite paper, ivory ink, one terracotta.
    theme: { ground: '#0D0C0B', surface: '#2B2825', ink: '#F4EEDF', accent: '#D9693A', onAccent: '#160B06', material: 'glass', corner: 'soft', face: 'mono', voice: 'glass' },
    focus: [0.5, 0.5],
    size: [360, 450],
    backdrop: '#2B2825',
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-20, -20, 400, 490], depth: 0.03 },
        { id: 'disc', art: 'disc.svg', box: [208, 70, 80, 81], depth: 0.1 },
        { id: 'ridge-far', art: 'ridge-far.svg', box: [-20, 104, 400, 376], depth: 0.2 },
        { id: 'ridge-mid', art: 'ridge-mid.svg', box: [-20, 256, 400, 224], depth: 0.34 },
        { id: 'ridge-near', art: 'ridge-near.svg', box: [-20, 354, 400, 126], depth: 0.5 },
        { id: 'shade-mid', art: 'shade-mid.svg', box: [57, 199, 256, 74], start: { y: LIFT }, depth: 0.62 },
        { id: 'shade-top', art: 'shade-top.svg', box: [57, 139, 256, 60], origin: [0.5, 1], start: { y: LIFT, sy: 0 }, depth: 0.62 },
        { id: 'shade-bot', art: 'shade-bot.svg', box: [57, 273, 256, 74], origin: [0.5, 0], start: { y: LIFT, sy: 0 }, depth: 0.62 },
        { id: 'mid', art: 'mid.svg', box: [52, 192, 256, 74], start: { y: LIFT }, depth: 0.7 },
        { id: 'top-open', art: 'top-open.svg', box: [52, 132, 256, 60], origin: [0.5, 1], start: { y: LIFT, sy: 0 }, depth: 0.7 },
        { id: 'bot-open', art: 'bot-open.svg', box: [52, 266, 256, 74], origin: [0.5, 0], start: { y: LIFT, sy: 0 }, depth: 0.7 },
        { id: 'emboss', art: 'emboss.svg', box: [52, 132, 256, 208], start: { opacity: 0 }, depth: 0.7 },
        { id: 'sun', art: 'sun.svg', box: [178, 196, 44, 44], start: { opacity: 0, y: 26 }, depth: 0.76 },
        { id: 'hill-back', art: 'hill-back.svg', box: [76, 210, 206, 70], origin: [0.5, 69 / 70], start: { sy: 0 }, depth: 0.82 },
        { id: 'hill-mid', art: 'hill-mid.svg', box: [98, 220, 192, 60], origin: [0.5, 59 / 60], start: { sy: 0 }, depth: 0.9 },
        { id: 'hill-front', art: 'hill-front.svg', box: [70, 245, 222, 35], origin: [0.5, 34 / 35], start: { sy: 0 }, depth: 1 },
        { id: 'bot-closed', art: 'bot-closed.svg', box: [52, 192, 256, 74], origin: [0.5, 1], start: { y: LIFT }, depth: 0.7 },
        { id: 'top-closed', art: 'top-closed.svg', box: [52, 192, 256, 64.5], origin: [0.5, 0], start: { y: LIFT }, depth: 0.7 },
        { id: 'thread', art: 'thread.svg', box: [170, 187, 20, 84], start: { y: LIFT }, depth: 0.78 },
        { id: 'end-a', art: 'end-a.svg', box: [176, 223, 30, 34], origin: [4 / 30, 6 / 34], start: { y: LIFT }, depth: 0.78 },
        { id: 'end-b', art: 'end-b.svg', box: [154, 213, 30, 22], origin: [26 / 30, 16 / 22], start: { y: LIFT }, depth: 0.78 },
        { id: 'knot', art: 'knot.svg', box: [164, 220, 32, 18], start: { y: LIFT }, depth: 0.78 },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2800,
    // Three notes for three folds, and home: a music box, with a tap of wood between.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 72,
        score: scaled(1.6, together(
            tune(120, 'G5/4 -/4 E5/4 -/4 | D5/4 -/4 C5/2!'),
            tune(120, '-/4 C4/4 -/4 C4/4 | -/4 C4/4 -/2', { inst: 'wood', gain: 0.35 }),
        )),
    },
};
