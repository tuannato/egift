import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Harvest table — for a harvest meal, for giving thanks. A laden table seen
 * from straight above, drawn like a plate from a mid-century cookbook: flat
 * shapes in squash orange, brown, olive and cream, a hard offset shadow under
 * each thing. Bread on a board, a squash, two ears of corn, pears, a bowl of
 * cranberries, a place laid, two unlit candles on an olive runner; in the
 * middle a striped linen cloth covers the centre dish.
 * Opening: the cloth's right half folds over onto its left (a scale through
 * zero, its paler back taking over), and the folded cloth is carried off to
 * the plate in the corner; the dish is a lattice-top pie. The candles take
 * flame, three wisps of steam rise once, a few leaves scatter, and a warm
 * light settles on the table.
 *
 * Canvas 360x450; the dish's centre is (180, 215). The art is generated in
 * canvas coordinates (scripts/art/harvest.gen.mjs): each SVG's viewBox is its box.
 */

/** Where the folded cloth ends, relative to where it lies folded: on the plate in the bottom-left corner. */
const AWAY = { x: -100, y: 153, turn: -18, sx: 0.68, sy: 0.68 } as const;
const WISPS = [
    ['steam-1', 1500],
    ['steam-2', 1640],
    ['steam-3', 1800],
] as const;

const open: Step[] = [
    // 1. The cloth's right half lifts and folds over to the left: it narrows to its crease, and its other
    //    side grows from the crease across the left half.
    { kind: 'move', layer: 'cloth-r', at: 0, dur: 360, ease: 'in', to: { sx: 0 } },
    { kind: 'move', layer: 'cloth-back', at: 360, dur: 40, to: { opacity: 1 } },
    { kind: 'move', layer: 'cloth-back', at: 360, dur: 360, ease: 'out', to: { sx: 1 } },
    // 2. The folded cloth is carried off to the plate in the corner. The left half is under the folded
    //    half exactly, so it is let go the moment the fold is down.
    { kind: 'move', layer: 'cloth-l', at: 720, dur: 30, to: { opacity: 0 } },
    { kind: 'move', layer: 'cloth-back', at: 800, dur: 760, ease: 'inout', to: { ...AWAY } },
    // 3. The pie is shown: it settles, and the warm light comes up on it.
    { kind: 'move', layer: 'pie', at: 1100, dur: 460, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'warm', at: 1150, dur: 900, ease: 'out', to: { opacity: 1 } },
    { kind: 'scatter', layer: 'leaf-fall', at: 1120, dur: 1600, count: 11, spread: 150, fall: 70 },
    // 4. Steam: three wisps rise and thin away, once.
    ...WISPS.flatMap(([layer, at]): Step[] => [
        { kind: 'move', layer, at, dur: 320, ease: 'out', to: { opacity: 0.8 } },
        { kind: 'move', layer, at, dur: 1400, ease: 'out', to: { sy: 1, y: -30 } },
        { kind: 'move', layer, at: at + 800, dur: 700, ease: 'inout', to: { opacity: 0 } },
    ]),
    // 5. The candles take flame, the far one first.
    { kind: 'move', layer: 'flame-a', at: 1700, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'flame-a', at: 1700, dur: 420, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'glow-a', at: 1700, dur: 600, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'flame-b', at: 2050, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'flame-b', at: 2050, dur: 420, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'glow-b', at: 2050, dur: 600, ease: 'out', to: { opacity: 1 } },
];

/** The leaves on the runner stir. */
const stir: IdleStep[] = [
    { layer: 'leaf-a', field: 'turn', amp: 5, period: 5200 },
    { layer: 'leaf-b', field: 'turn', amp: 4, period: 6100, phase: 0.4 },
];

const idle: IdleStep[] = [
    ...stir,
    // The cloth's free half breathes a little along its crease.
    { layer: 'cloth-r', field: 'sx', amp: 0.012, period: 4600 },
];

const afterglow: IdleStep[] = [
    ...stir,
    { layer: 'flame-a', field: 'turn', amp: 7, period: 2300 },
    { layer: 'flame-a', field: 'sy', amp: 0.07, period: 1700, phase: 0.2 },
    { layer: 'flame-b', field: 'turn', amp: 6, period: 2700, phase: 0.5 },
    { layer: 'flame-b', field: 'sy', amp: 0.07, period: 1900, phase: 0.6 },
    { layer: 'glow-a', field: 'opacity', amp: 0.14, period: 3400 },
    { layer: 'glow-b', field: 'opacity', amp: 0.14, period: 3900, phase: 0.3 },
    { layer: 'warm', field: 'opacity', amp: 0.16, period: 5600 },
];

export const harvest: WrapperDef = {
    id: 'harvest',
    name: { vi: 'Bàn tiệc mùa gặt', en: 'Harvest table' },
    ambient: ['#74462A', '#E5822A', '#EDB850'],
    blurb: {
        vi: 'Bàn tiệc đầy nhìn từ trên xuống, vẽ phẳng kiểu sách nấu ăn xưa. Tấm khăn lanh gấp lại, rời khỏi đĩa giữa bàn; nến được thắp lên.',
        en: 'A full table seen from above, flat like an old cookbook plate. The linen cloth folds off the dish in the middle and the candles are lit.',
    },
    // The linen for the surface, the darkest wood for the words and the room, cranberry for the one loud colour.
    theme: { ground: '#3A2114', surface: '#F6ECD6', ink: '#3A2114', accent: '#A62E2B', onAccent: '#F6ECD6', material: 'plate', corner: 'soft', face: 'slab', voice: 'chime' },
    focus: [0.5, 0.48],
    size: [360, 450],
    backdrop: '#74462A',
    // The boxes are those the generator writes (copied by hand; a mismatch shows as stretched art).
    layers: [
        { id: 'table', art: 'table.svg', box: [-6, -6, 372, 462], depth: 0.03 },
        { id: 'spread', art: 'spread.svg', box: [-6, -6, 372, 462], depth: 0.1 },
        { id: 'leaf-a', art: 'leaf-a.svg', box: [206, 8, 46, 40], depth: 0.12 },
        { id: 'leaf-b', art: 'leaf-b.svg', box: [198, 402, 54, 40], depth: 0.12 },
        { id: 'dish', art: 'dish.svg', box: [92, 127, 186, 188], depth: 0.16 },
        { id: 'pie', art: 'pie.svg', box: [104, 139, 152, 152], start: { sx: 0.95, sy: 0.95 }, depth: 0.16 },
        // The cloth: its left half, its right half (folds about the crease at x = 180), and the right
        // half's other side, which grows from the crease over the left half and is then carried away.
        { id: 'cloth-l', art: 'cloth-l.svg', box: [88, 123, 92, 184], depth: 0.2 },
        { id: 'cloth-r', art: 'cloth-r.svg', box: [180, 123, 92, 184], origin: [0, 0.5], depth: 0.2 },
        { id: 'cloth-back', art: 'cloth-back.svg', box: [88, 123, 92, 184], origin: [1, 0.5], start: { opacity: 0, sx: 0 }, depth: 0.2 },
        { id: 'warm', art: 'warm.svg', box: [10, 45, 340, 340], start: { opacity: 0 }, depth: 0.1 },
        { id: 'glow-a', art: 'glow-a.svg', box: [118, 8, 124, 124], start: { opacity: 0 }, depth: 0.1 },
        { id: 'glow-b', art: 'glow-b.svg', box: [118, 290, 124, 124], start: { opacity: 0 }, depth: 0.1 },
        // Each flame turns and grows about its wick.
        { id: 'flame-a', art: 'flame-a.svg', box: [167, 39, 26, 42], origin: [0.5, 37 / 42], start: { opacity: 0, sx: 0.2, sy: 0.2 }, depth: 0.1 },
        { id: 'flame-b', art: 'flame-b.svg', box: [167, 321, 26, 42], origin: [0.5, 37 / 42], start: { opacity: 0, sx: 0.2, sy: 0.2 }, depth: 0.1 },
        { id: 'steam-1', art: 'steam-1.svg', box: [138, 150, 32, 74], origin: [0.5, 1], start: { opacity: 0, sy: 0.3 }, depth: 0.24 },
        { id: 'steam-2', art: 'steam-2.svg', box: [166, 136, 32, 88], origin: [0.5, 1], start: { opacity: 0, sy: 0.3 }, depth: 0.24 },
        { id: 'steam-3', art: 'steam-3.svg', box: [192, 154, 32, 70], origin: [0.5, 1], start: { opacity: 0, sy: 0.3 }, depth: 0.24 },
        { id: 'leaf-fall', art: 'leaf-fall.svg', box: [166, 207, 28, 16], depth: 0.24 },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1300,
    // Wood taps as the cloth is folded and carried off, a warm pad under them, home as the candles are lit.
    sound: {
        v: 1,
        inst: 'wood',
        tonic: 67,
        score: scaled(0.9, together(
            tune(200, 'D5/8 G4/8 B4/4 D5/8 B4/8 G5/4 | D5/4 B4/4 G4/2!'),
            tune(200, 'G3/1 | [G3 B3 D4]/1', { inst: 'pad', gain: 0.3 }),
        )),
    },
};
