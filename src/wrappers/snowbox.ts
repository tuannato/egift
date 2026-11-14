import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Snow box — the winter-holiday wrapper, drawn as Nordic folk pattern in the
 * spirit of Scandinavian paper-cut and knitted (selburose) work: every shape
 * is a symmetric geometric motif. Midnight blue and its tints, snow white, one
 * red, one gold; flat throughout, no outline, no gradient.
 * A red box cut with white roses stands in the snow between two reindeer and
 * mirrored pines under a knitted border hung with pine sprigs, snow falling as
 * a knitter's lattice, one small snow rosette in the sky above it.
 * Opening: the bow comes undone, the ribbon slips off, the lid lifts, turns
 * over and leans behind the box; rows of gold stitches fan out and an
 * eight-petal star rises, turning, onto a flat round in the sky; a ring of
 * small pines and stars opens around it and the sky lights.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/snowbox.gen.mjs): each SVG's viewBox is its box.
 */

/** How far down the star waits, small, inside the closed box. */
const SUNK = 120;

/** Where the lid hangs, clear of the box, at the moment it turns over. */
const LIFT = { x: 62, y: -52, turn: 18 };

const open: Step[] = [
    // 1. The bow comes undone: the loops draw into the knot, the knot gives.
    { kind: 'shake', layer: 'knot', at: 0, dur: 300, amp: 1, times: 3 },
    { kind: 'move', layer: 'loop-l', at: 60, dur: 460, ease: 'inout', to: { sx: 0.18, sy: 0.4, turn: -12 } },
    { kind: 'move', layer: 'loop-r', at: 120, dur: 460, ease: 'inout', to: { sx: 0.18, sy: 0.4, turn: 12 } },
    { kind: 'move', layer: 'loop-l', at: 540, dur: 120, ease: 'in', to: { sx: 0, sy: 0 } },
    { kind: 'move', layer: 'loop-r', at: 580, dur: 120, ease: 'in', to: { sx: 0, sy: 0 } },
    { kind: 'move', layer: 'knot', at: 560, dur: 160, ease: 'in', to: { sx: 0, sy: 0 } },
    // 2. The ribbon slips down off the box.
    { kind: 'move', layer: 'ribbon', at: 660, dur: 520, ease: 'in', to: { y: 46, opacity: 0 } },
    // 3. The lid unseats, lifts clear and turns over (a flat flip: the face closes to a line, the
    //    plain inside opens from it, behind the body), then tips down to lean behind the box.
    { kind: 'move', layer: 'lid', at: 1160, dur: 240, ease: 'out', to: { y: -10, turn: -3 } },
    { kind: 'move', layer: 'lid', at: 1400, dur: 380, ease: 'inout', to: { x: LIFT.x, y: LIFT.y, turn: LIFT.turn } },
    { kind: 'move', layer: 'lid', at: 1780, dur: 130, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'lid-back', at: 1910, dur: 130, ease: 'out', to: { sy: 1 } },
    { kind: 'move', layer: 'lid-back', at: 2040, dur: 560, ease: 'inout', to: { x: 104, y: 19, turn: 66 } },
    // 4. Light out of the box; a flat round opens in the sky for the star.
    { kind: 'move', layer: 'disc', at: 2000, dur: 700, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'rays', at: 1460, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'rays', at: 1460, dur: 820, ease: 'out', to: { sx: 1, sy: 1 } },
    // 5. The star rises out of the box, turning; the small rosette gives way to it.
    { kind: 'move', layer: 'star', at: 1860, dur: 1040, ease: 'back', to: { y: 0, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'star', at: 1860, dur: 1040, ease: 'out', to: { turn: 0 } },
    { kind: 'move', layer: 'trace', at: 2100, dur: 400, ease: 'out', to: { opacity: 0 } },
    // 6. The ring opens around it; the reindeer start; the sky lights; sparks.
    { kind: 'move', layer: 'ring', at: 2700, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'ring', at: 2700, dur: 700, ease: 'back', to: { sx: 1, sy: 1, turn: 0 } },
    { kind: 'move', layer: 'deer', at: 2760, dur: 160, ease: 'out', to: { y: -5 } },
    { kind: 'move', layer: 'deer', at: 2920, dur: 260, ease: 'bounce', to: { y: 0 } },
    { kind: 'move', layer: 'twinkle', at: 2900, dur: 700, ease: 'out', to: { opacity: 1 } },
    { kind: 'scatter', layer: 'spark-a', at: 2780, dur: 1500, count: 12, spread: 120, fall: 96 },
    { kind: 'scatter', layer: 'spark-b', at: 2840, dur: 1400, count: 10, spread: 104, fall: 120 },
];

const weather: IdleStep[] = [
    { layer: 'snow-a', field: 'y', amp: 5, period: 6400 },
    { layer: 'snow-b', field: 'y', amp: 8, period: 5200, phase: 0.3 },
    { layer: 'snow-b', field: 'x', amp: 2.5, period: 8200 },
];

const idle: IdleStep[] = [
    ...weather,
    { layer: 'trace', field: 'turn', amp: 8, period: 9000 },
    { layer: 'loop-l', field: 'turn', amp: 2.2, period: 4400 },
    { layer: 'loop-r', field: 'turn', amp: 2.2, period: 4400, phase: 0.4 },
];

const afterglow: IdleStep[] = [
    ...weather,
    { layer: 'ring', field: 'turn', amp: 7, period: 9000 },
    { layer: 'star', field: 'sx', amp: 0.025, period: 3600 },
    { layer: 'star', field: 'sy', amp: 0.025, period: 3600 },
    { layer: 'rays', field: 'turn', amp: 3, period: 7400 },
    { layer: 'twinkle', field: 'opacity', amp: 0.3, period: 2800 },
];

export const snowbox: WrapperDef = {
    id: 'snowbox',
    name: { vi: 'Hộp dưới tuyết', en: 'Snow box' },
    ambient: ['#0E2036', '#C6322B', '#F2C24F'],
    blurb: {
        vi: 'Hoa văn Bắc Âu cắt giấy: hộp đỏ giữa tuyết, hai chú tuần lộc và hàng thông. Nơ tuột, nắp bay, ngôi sao tám cánh vàng bay lên trời đêm.',
        en: 'A Nordic paper-cut pattern: a red box in the snow between two reindeer. The bow unties, the lid lifts, an eight-petal gold star rises.',
    },
    // Snow paper, midnight ink, the box's red for the one loud colour.
    theme: { ground: '#091626', surface: '#F5F2EA', ink: '#0A1626', accent: '#B5261F', onAccent: '#FFFFFF', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 184 / 450],
    size: [360, 450],
    backdrop: '#0E2036',
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-6, -6, 372, 462], depth: 0.05 },
        { id: 'snow-a', art: 'snow-a.svg', box: [-6, 92, 372, 238], depth: 0.12 },
        { id: 'trace', art: 'trace.svg', box: [150, 132, 60, 60], depth: 0.15 },
        { id: 'disc', art: 'disc.svg', box: [130, 112, 100, 100], start: { sx: 0, sy: 0 }, depth: 0.2 },
        { id: 'rays', art: 'rays.svg', box: [0, 0, 360, 250], origin: [0.5, 238 / 250], start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.2 },
        { id: 'pines', art: 'pines.svg', box: [-30, 160, 420, 166], depth: 0.25 },
        { id: 'twinkle', art: 'twinkle.svg', box: [30, 140, 300, 96], start: { opacity: 0 }, depth: 0.15 },
        { id: 'ground', art: 'ground.svg', box: [-6, 312, 372, 144], depth: 0.4 },
        { id: 'lid-back', art: 'lid-back.svg', box: [96, 214, 168, 30], start: { x: LIFT.x, y: LIFT.y, turn: LIFT.turn, sy: 0 }, depth: 0.4 },
        { id: 'deer', art: 'deer.svg', box: [24, 238, 312, 84], depth: 0.4 },
        { id: 'ring', art: 'ring.svg', box: [108, 90, 144, 144], start: { opacity: 0, sx: 0.5, sy: 0.5, turn: -45 }, depth: 0.3 },
        { id: 'box-in', art: 'box-in.svg', box: [108, 232, 144, 12], depth: 0.4 },
        { id: 'star', art: 'star.svg', box: [138, 120, 84, 84], start: { y: SUNK, sx: 0.3, sy: 0.3, turn: -90 }, depth: 0.4 },
        { id: 'body', art: 'body.svg', box: [94, 238, 172, 86], depth: 0.4 },
        { id: 'lid', art: 'lid.svg', box: [96, 214, 168, 30], depth: 0.4 },
        { id: 'ribbon', art: 'ribbon.svg', box: [150, 210, 60, 110], depth: 0.4 },
        { id: 'loop-l', art: 'loop-l.svg', box: [138, 196, 44, 30], origin: [0.95, 0.63], depth: 0.4 },
        { id: 'loop-r', art: 'loop-r.svg', box: [178, 196, 44, 30], origin: [0.05, 0.63], depth: 0.4 },
        { id: 'knot', art: 'knot.svg', box: [171, 205, 18, 20], depth: 0.4 },
        { id: 'boughs', art: 'boughs.svg', box: [28, 86, 304, 72], depth: 0.5 },
        { id: 'snow-b', art: 'snow-b.svg', box: [-6, 86, 372, 260], depth: 0.85 },
        { id: 'spark-a', art: 'spark-a.svg', box: [174, 156, 12, 12] },
        { id: 'spark-b', art: 'spark-b.svg', box: [176, 158, 8, 8] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 3000,
    // The first four bars of the chorus of "Jingle Bells" (1857): the long last note lands as the star arrives.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 72,
        score: scaled(0.62, together(
            tune(240, 'E5/4 E5/4 E5/2 | E5/4 E5/4 E5/2 | E5/4 G5/4 C5/4. D5/8 | E5/1!'),
            tune(240, 'C3/2 G3/2 | C3/2 G3/2 | C3/2 G3/2 | C3/1', { inst: 'pluck', gain: 0.42 }),
            tune(240, '-/1 | -/1 | -/1 | E6/1', { inst: 'bell', gain: 0.38 }),
        )),
    },
};
