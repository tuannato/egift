import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Basket and blanket — for people who love their animals, drawn with a
 * BRUSH PEN: a few sumi lines of varying weight with dry tails, bare paper,
 * and a handful of flat cut-paper colours laid a little off the line
 * (persimmon for the blanket and its yarn, sage for the plant, caramel for
 * the rattan, a pale sun).
 *
 * Closed: a rattan basket under a knitted blanket, tucked in all round (the
 * tuck is the seal). The blanket slumps over something, and breathes; no
 * cat is to be seen. Around it a quiet corner of a room: a plant, a bowl, a
 * ball of yarn, window light folding from the wall onto the floor.
 * Opening: the blanket stirs, lifts at one side and is thrown back over the
 * rim; a long low back shows barely above the rim; a tail is let out over
 * the rim at the far left and down the front; then a grown white calico cat's head
 * comes forward from behind the back, nose first, in profile, and is laid
 * down ON the rim, nose tipped over it toward the light
 * beside it — a brush line round white paper, patches of tan and grey, no eyes. It does not sit up: it sleeps. The
 * yarn rolls into the sun, dust drifts in the light. No text: the frame
 * shows the gift.
 *
 * Canvas 360x450. The art is drawn where it is when OPEN
 * (scripts/art/basket.gen.mjs: each SVG's viewBox is its box). The rim's
 * front arc is at y 238..251, the basket's base at y 310..319.
 * The head is three layers on one box, pivoted where the throat rests on the
 * rim: `head-in` lies behind the basket's front and comes forward from
 * inside, level; once wholly above the rim it is cut for `head` and `ear`,
 * which lie over the rim and are turned down onto it. `neck` goes with the
 * head throughout, behind the basket's front.
 */

/** The head is drawn laid on the rim, nose-down by this many degrees (scripts/art/basket.gen.mjs: HEAD_TILT). */
const TILT = 9;
/** Where the head starts: level, deep inside the basket, back behind the shoulder. */
const DEEP = { x: -40, y: 50, turn: -TILT };
/** Where it comes forward to, still level: over its place, wholly clear of the rim. */
const OVER = -8;
/** How far below its place the back starts: under the rim. */
const SUNK = 40;
/** How far the yarn rolls. */
const ROLL = 34;

const open: Step[] = [
    // 1. Something stirs under the blanket.
    { kind: 'shake', layer: 'blanket', at: 0, dur: 560, amp: 1.6, times: 3 },
    // 2. The blanket lifts at the right: the tuck is out.
    { kind: 'move', layer: 'blanket', at: 600, dur: 700, ease: 'inout', to: { turn: -11, y: -5 } },
    // 3. It is thrown back over the left of the rim: it folds edge-on (a scale through nothing), and at
    //    that thinnest moment the folded blanket is cut for the draped one, which opens out from the same edge.
    { kind: 'move', layer: 'blanket', at: 1300, dur: 440, ease: 'in', to: { turn: -24, sx: 0.04, y: 8 } },
    { kind: 'move', layer: 'blanket', at: 1725, dur: 20, ease: 'linear', to: { opacity: 0 } },
    { kind: 'move', layer: 'blanket-open', at: 1725, dur: 20, ease: 'linear', to: { opacity: 1 } },
    { kind: 'move', layer: 'blanket-open', at: 1740, dur: 620, ease: 'out', to: { sx: 1, sy: 1 } },
    // 4. Something dark shifts in the basket: a long low back comes up, barely above the rim.
    { kind: 'move', layer: 'body', at: 1800, dur: 800, ease: 'inout', to: { y: 0 } },
    // 5. The tail is let out over the rim at the far left and down the front, and its tip stirs.
    { kind: 'move', layer: 'tail', at: 2380, dur: 20, ease: 'linear', to: { opacity: 1 } },
    { kind: 'move', layer: 'tail', at: 2400, dur: 800, ease: 'out', to: { sy: 1, turn: 0 } },
    { kind: 'move', layer: 'tail', at: 3250, dur: 320, ease: 'inout', to: { turn: -6 } },
    { kind: 'move', layer: 'tail', at: 3570, dur: 520, ease: 'inout', to: { turn: 0 } },
    // 6. The head comes forward, nose first, from behind the back: up over the shoulder in a low arc
    //    (the rise is quick, the reach is slow), level, until it is over the rim...
    ...['head-in', 'neck'].map((layer): Step => ({ kind: 'move', layer, at: 3150, dur: 520, ease: 'out', to: { y: OVER - 5 } })),
    ...['head-in', 'neck'].map((layer): Step => ({ kind: 'move', layer, at: 3150, dur: 850, ease: 'inout', to: { x: 0 } })),
    ...['head-in', 'neck'].map((layer): Step => ({ kind: 'move', layer, at: 3670, dur: 330, ease: 'inout', to: { y: OVER } })),
    //    ...where it is cut for the head that lies over the rim...
    { kind: 'move', layer: 'head-in', at: 4000, dur: 20, ease: 'linear', to: { opacity: 0 } },
    { kind: 'move', layer: 'head', at: 4000, dur: 20, ease: 'linear', to: { opacity: 1 } },
    { kind: 'move', layer: 'ear', at: 4000, dur: 20, ease: 'linear', to: { opacity: 1 } },
    //    ...a paw is hooked over the rim, and the head is laid down on it: the nose tips over, the throat settles.
    ...['head', 'ear'].map((layer): Step => ({ kind: 'move', layer, at: 4200, dur: 700, ease: 'back', to: { y: 0, turn: 0 } })),
    { kind: 'move', layer: 'neck', at: 4200, dur: 700, ease: 'back', to: { y: 0 } },
    //    A sigh, an ear flick: asleep.
    { kind: 'move', layer: 'body', at: 4900, dur: 500, ease: 'inout', to: { sy: 1.07 } },
    { kind: 'move', layer: 'body', at: 5400, dur: 550, ease: 'inout', to: { sy: 1 } },
    { kind: 'move', layer: 'ear', at: 5150, dur: 140, ease: 'inout', to: { turn: -6 } },
    { kind: 'move', layer: 'ear', at: 5290, dur: 240, ease: 'inout', to: { turn: 0 } },
    { kind: 'move', layer: 'sun', at: 2400, dur: 1600, ease: 'inout', to: { opacity: 1 } },
    // 7. The head coming down has set the yarn going: it rolls into the sun, paying out its thread.
    { kind: 'move', layer: 'yarn', at: 4500, dur: 1400, ease: 'out', to: { x: ROLL, turn: 250 } },
    { kind: 'move', layer: 'strand', at: 4500, dur: 1400, ease: 'out', to: { sx: 1 } },
    // 8. Dust drifts up in the light.
    { kind: 'move', layer: 'motes-a', at: 2600, dur: 1400, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'motes-b', at: 3000, dur: 1400, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'motes-a', at: 2600, dur: 3400, ease: 'out', to: { x: 0, y: 0 } },
    { kind: 'move', layer: 'motes-b', at: 3000, dur: 3000, ease: 'out', to: { x: 0, y: 0 } },
];

const idle: IdleStep[] = [
    // Whatever is under the blanket is asleep.
    { layer: 'blanket', field: 'sy', amp: 0.014, period: 4600 },
    { layer: 'sun', field: 'opacity', amp: 0.06, period: 9000 },
    { layer: 'motes-a', field: 'y', amp: 3, period: 8000 },
];

const afterglow: IdleStep[] = [
    // Slow breathing; the ear turns to a sound now and then; the tail tip curls.
    { layer: 'body', field: 'sy', amp: 0.04, period: 4600 },
    { layer: 'ear', field: 'turn', amp: 1.6, period: 7400, phase: 0.3 },
    { layer: 'tail', field: 'turn', amp: 3.2, period: 5200 },
    { layer: 'motes-a', field: 'y', amp: 5, period: 9000 },
    { layer: 'motes-a', field: 'x', amp: 3, period: 13000, phase: 0.2 },
    { layer: 'motes-b', field: 'y', amp: 4, period: 7600, phase: 0.5 },
    { layer: 'motes-b', field: 'x', amp: 4, period: 11000 },
    { layer: 'plant', field: 'turn', amp: 0.5, period: 10000 },
];

export const basket: WrapperDef = {
    id: 'basket',
    name: { vi: 'Giỏ và chăn', en: 'Basket and blanket' },
    ambient: ['#ECE4D2', '#C96F43', '#93A286'],
    blurb: {
        vi: 'Giỏ mây phủ chăn len, dém kín. Mở ra: chăn lật, chiếc đuôi vắt ra trước, rồi mái đầu mèo tam thể nghiêng gác lên vành giỏ, ngủ trong nắng.',
        en: 'A rattan basket tucked under a knitted blanket. It opens: a tail slips out, then a calico cat lays its head on the rim, dozing in the sun.',
    },
    // A warm dark room, paper for the capsule, sumi for text, the one persimmon.
    theme: { ground: '#2B241E', surface: '#F3ECDC', ink: '#1A1613', accent: '#A9512B', onAccent: '#FFFFFF', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.52],
    size: [360, 450],
    backdrop: '#ECE4D2',
    layers: [
        { id: 'paper', art: 'paper.svg', box: [-12, -12, 384, 474], depth: 0.04 },
        { id: 'sun', art: 'sun.svg', box: [200, 88, 172, 270], start: { opacity: 0.82 }, depth: 0.1 },
        { id: 'room', art: 'room.svg', box: [-12, 248, 384, 150], depth: 0.14 },
        { id: 'plant', art: 'plant.svg', box: [2, 88, 124, 186], origin: [0.48, 0.96], depth: 0.22 },
        { id: 'motes-a', art: 'motes-a.svg', box: [224, 116, 104, 150], start: { opacity: 0.4, x: -5, y: 14 }, depth: 0.3 },
        { id: 'basket-back', art: 'basket-back.svg', box: [88, 218, 184, 36], depth: 0.4 },
        { id: 'body', art: 'body.svg', box: [124, 222, 76, 52], origin: [0.5, 1], start: { y: SUNK }, depth: 0.4 },
        { id: 'neck', art: 'neck.svg', box: [194, 230, 54, 34], start: { x: DEEP.x, y: DEEP.y }, depth: 0.4 },
        { id: 'head-in', art: 'head-in.svg', box: [184, 178, 96, 88], origin: [53 / 96, 68 / 88], start: DEEP, depth: 0.4 },
        { id: 'basket-front', art: 'basket-front.svg', box: [80, 228, 200, 104], depth: 0.4 },
        { id: 'tail', art: 'tail.svg', box: [136, 230, 40, 86], origin: [25 / 40, 9 / 86], start: { opacity: 0, sy: 0.03, turn: 14 }, depth: 0.4 },
        { id: 'head', art: 'head.svg', box: [184, 178, 96, 88], origin: [53 / 96, 68 / 88], start: { opacity: 0, y: OVER, turn: -TILT }, depth: 0.4 },
        { id: 'ear', art: 'ear.svg', box: [184, 178, 96, 88], origin: [53 / 96, 68 / 88], start: { opacity: 0, y: OVER, turn: -TILT }, depth: 0.4 },
        { id: 'blanket-open', art: 'blanket-open.svg', box: [62, 220, 112, 134], origin: [0.3, 0.12], start: { opacity: 0, sx: 0.04, sy: 0.8 }, depth: 0.4 },
        { id: 'blanket', art: 'blanket.svg', box: [76, 168, 210, 132], origin: [0.06, 0.74], depth: 0.4 },
        { id: 'bowl', art: 'bowl.svg', box: [18, 326, 86, 46], depth: 0.7 },
        { id: 'strand', art: 'strand.svg', box: [234, 313, 70, 28], origin: [0, 0.5], start: { sx: 0.46 }, depth: 0.6 },
        { id: 'yarn', art: 'yarn.svg', box: [250, 314, 36, 36], depth: 0.6 },
        { id: 'motes-b', art: 'motes-b.svg', box: [238, 192, 96, 150], start: { opacity: 0, x: 6, y: 16 }, depth: 0.8 },
    ],
    idle,
    afterglow,
    open,
    revealAt: 4000,
    // Tiptoe on plucked strings, then home; a low purr after.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 72,
        score: scaled(1.4, together(
            tune(112, 'C5/8 -/8 E5/8 -/8 G5/8 -/8 E5/8 -/8 | C5/8 E5/8 G5/8 C6/8 G5/2 | -/2 C5/2!'),
            [{ at: 4300, pitch: 48, dur: 900, inst: 'noise' as const, gain: 0.3 }],
        )),
    },
};
