import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Cake box — a birthday, as a flat graphic poster in the spirit of mid-century
 * print: six inks (deep teal-navy, a darker teal, butter, coral, cream, one
 * warm brown), flat shapes, one clean offset shadow per object, a speckle of
 * print grain. A low white bakery box tied with baker's twine stands on a
 * butter table under a coral sun, a paper garland across the top.
 * Opening: the bow is pulled undone, the twine drops off as one piece, the lid
 * slides off to the right, a two-layer cake with one candle rises, the flame
 * pops on and the sun throws its rays, paper streamers drop and confetti falls.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/cake.gen.mjs): each SVG's viewBox is its box.
 */

/** How far down the cake waits inside the closed box. */
const SUNK = 84;

const open: Step[] = [
    // 1. The bow is pulled undone: the loops draw into the knot, the knot gives.
    { kind: 'shake', layer: 'knot', at: 0, dur: 300, amp: 1, times: 3 },
    { kind: 'move', layer: 'loop-l', at: 60, dur: 460, ease: 'inout', to: { sx: 0.16, sy: 0.4, turn: -10 } },
    { kind: 'move', layer: 'loop-r', at: 120, dur: 460, ease: 'inout', to: { sx: 0.16, sy: 0.4, turn: 10 } },
    { kind: 'move', layer: 'loop-l', at: 540, dur: 120, ease: 'in', to: { sx: 0, sy: 0 } },
    { kind: 'move', layer: 'loop-r', at: 580, dur: 120, ease: 'in', to: { sx: 0, sy: 0 } },
    { kind: 'move', layer: 'knot', at: 560, dur: 160, ease: 'in', to: { sx: 0, sy: 0 } },
    // 2. The twine drops off the box as one piece.
    { kind: 'move', layer: 'twine', at: 660, dur: 160, ease: 'out', to: { y: -5 } },
    { kind: 'move', layer: 'twine', at: 820, dur: 520, ease: 'in', to: { y: 250, turn: 5 } },
    // 3. The lid unseats and slides off to the right.
    { kind: 'move', layer: 'lid', at: 1240, dur: 260, ease: 'out', to: { y: -10, turn: -2 } },
    { kind: 'move', layer: 'lid-shade', at: 1240, dur: 200, ease: 'out', to: { opacity: 0 } },
    { kind: 'move', layer: 'lid', at: 1500, dur: 760, ease: 'inout', to: { x: 320, y: -34, turn: 14 } },
    // 4. The cake and its candle rise out of the box.
    { kind: 'move', layer: 'cake', at: 1760, dur: 900, ease: 'back', to: { y: 0 } },
    { kind: 'move', layer: 'flame', at: 1760, dur: 900, ease: 'back', to: { y: 0 } },
    // 5. The flame pops on; the sun swells and throws its rays.
    { kind: 'move', layer: 'flame', at: 2740, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'flame', at: 2740, dur: 380, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'sun', at: 2760, dur: 420, ease: 'back', to: { sx: 1.08, sy: 1.08 } },
    { kind: 'move', layer: 'rays', at: 2780, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'rays', at: 2780, dur: 520, ease: 'back', to: { sx: 1, sy: 1, turn: 11.25 } },
    // 6. Streamers drop, one after another; confetti falls.
    { kind: 'move', layer: 'str-b', at: 2960, dur: 760, ease: 'out', to: { sy: 1 } },
    { kind: 'move', layer: 'str-a', at: 3100, dur: 700, ease: 'out', to: { sy: 1 } },
    { kind: 'move', layer: 'str-c', at: 3240, dur: 640, ease: 'out', to: { sy: 1 } },
    { kind: 'scatter', layer: 'conf-a', at: 2980, dur: 1420, count: 8, spread: 80, fall: 124 },
    { kind: 'scatter', layer: 'conf-b', at: 3040, dur: 1340, count: 6, spread: 72, fall: 138 },
    { kind: 'scatter', layer: 'conf-c', at: 3010, dur: 1390, count: 6, spread: 84, fall: 114 },
];

const poster: IdleStep[] = [
    { layer: 'garland', field: 'turn', amp: 0.7, period: 6200 },
    { layer: 'deco', field: 'y', amp: 2.5, period: 7000 },
    { layer: 'deco', field: 'x', amp: 1.5, period: 9400, phase: 0.3 },
];

const idle: IdleStep[] = [
    ...poster,
    { layer: 'sun', field: 'sx', amp: 0.02, period: 5200 },
    { layer: 'sun', field: 'sy', amp: 0.02, period: 5200 },
    { layer: 'loop-l', field: 'turn', amp: 2.4, period: 4200 },
    { layer: 'loop-r', field: 'turn', amp: 2.4, period: 4200, phase: 0.4 },
];

const afterglow: IdleStep[] = [
    ...poster,
    { layer: 'flame', field: 'sy', amp: 0.08, period: 1400 },
    { layer: 'flame', field: 'sx', amp: 0.05, period: 1900, phase: 0.3 },
    { layer: 'flame', field: 'turn', amp: 4, period: 2600 },
    { layer: 'rays', field: 'turn', amp: 5, period: 7200 },
    { layer: 'rays', field: 'sx', amp: 0.03, period: 3400 },
    { layer: 'rays', field: 'sy', amp: 0.03, period: 3400 },
    { layer: 'str-a', field: 'turn', amp: 1.6, period: 4600 },
    { layer: 'str-b', field: 'turn', amp: 1.3, period: 5400, phase: 0.3 },
    { layer: 'str-c', field: 'turn', amp: 1.8, period: 4000, phase: 0.6 },
];

export const cake: WrapperDef = {
    id: 'cake',
    name: { vi: 'Hộp bánh', en: 'Cake box' },
    ambient: ['#12343F', '#E5502F', '#F2C95C'],
    blurb: {
        vi: 'Tấm áp phích in phẳng: hộp bánh trắng buộc dây đỏ san hô. Nơ tuột, nắp trượt sang bên, bánh hai tầng và ngọn nến trồi lên, hoa giấy rơi.',
        en: 'A flat printed poster: a white bakery box tied with coral twine. The bow unties, the lid slides off, a two-layer cake and a candle rise.',
    },
    // Butter-cream paper, deep teal ink, the twine's coral for the one loud colour.
    theme: { ground: '#0A222B', surface: '#FBF0D4', ink: '#050D11', accent: '#C23A22', onAccent: '#FFFFFF', material: 'glass', corner: 'round', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 168 / 450],
    size: [360, 450],
    backdrop: '#12343F',
    layers: [
        { id: 'field', art: 'field.svg', box: [-6, -6, 372, 462], depth: 0.05 },
        { id: 'sun', art: 'sun.svg', box: [134, 80, 92, 92], depth: 0.14 },
        { id: 'rays', art: 'rays.svg', box: [118, 64, 124, 124], start: { opacity: 0, sx: 0.55, sy: 0.55 }, depth: 0.14 },
        { id: 'deco', art: 'deco.svg', box: [0, 80, 360, 250], depth: 0.6 },
        { id: 'garland', art: 'garland.svg', box: [-20, 14, 400, 60], origin: [0.5, 0], depth: 0.3 },
        { id: 'shadow', art: 'shadow.svg', box: [70, 334, 250, 24], depth: 0.4 },
        { id: 'box-in', art: 'box-in.svg', box: [68, 232, 224, 36], depth: 0.4 },
        { id: 'cake', art: 'cake.svg', box: [88, 124, 184, 134], start: { y: SUNK }, depth: 0.4 },
        { id: 'flame', art: 'flame.svg', box: [164, 96, 32, 40], origin: [0.5, 0.86], start: { y: SUNK, opacity: 0, sx: 0.3, sy: 0.1 }, depth: 0.4 },
        { id: 'body', art: 'body.svg', box: [68, 260, 224, 84], depth: 0.4 },
        { id: 'lid-shade', art: 'lid-shade.svg', box: [68, 268, 224, 10], depth: 0.4 },
        { id: 'lid', art: 'lid.svg', box: [60, 204, 240, 80], depth: 0.4 },
        { id: 'twine', art: 'twine.svg', box: [60, 202, 240, 146], depth: 0.4 },
        { id: 'loop-l', art: 'loop-l.svg', box: [130, 198, 54, 36], origin: [0.89, 0.78], depth: 0.4 },
        { id: 'loop-r', art: 'loop-r.svg', box: [176, 198, 54, 36], origin: [0.11, 0.78], depth: 0.4 },
        { id: 'knot', art: 'knot.svg', box: [172, 218, 16, 16], depth: 0.4 },
        { id: 'str-a', art: 'str-a.svg', box: [260, 10, 28, 206], origin: [0.5, 0], start: { sy: 0 }, depth: 0.7 },
        { id: 'str-b', art: 'str-b.svg', box: [288, 10, 28, 250], origin: [0.5, 0], start: { sy: 0 }, depth: 0.8 },
        { id: 'str-c', art: 'str-c.svg', box: [316, 10, 28, 170], origin: [0.5, 0], start: { sy: 0 }, depth: 0.75 },
        { id: 'conf-a', art: 'conf-a.svg', box: [172, 181, 16, 16] },
        { id: 'conf-b', art: 'conf-b.svg', box: [174, 183, 12, 12] },
        { id: 'conf-c', art: 'conf-c.svg', box: [172, 181, 16, 16] },
        { id: 'grain', art: 'grain.svg', box: [0, 0, 360, 450] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2800,
    // The first two phrases of the birthday song (the melody is from 1893), in three: the candle is lit under the second.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 65,
        score: scaled(0.75, together(
            tune(158, 'C5/8. C5/16 | D5/4 C5/4 F5/4 | E5/2 C5/8. C5/16 | D5/4 C5/4 G5/4 | F5/2.!', { beats: 3 }),
            tune(158, '-/4 | F3/2. | C3/2. | C3/2. | F3/2.', { beats: 3, gain: 0.4 }),
            tune(158, '-/4 | -/2. | -/2. | -/2. | F6/2.', { beats: 3, inst: 'tine', gain: 0.35 }),
        )),
    },
};
