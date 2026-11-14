import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { together, tune } from './tune';

/**
 * Cloud and moon — the welcome-baby wrapper (first month, first birthday),
 * drawn as a RISOGRAPH PRINT: three spot inks (blue, yellow, coral) on warm
 * paper, printed as flats and halftones, the plates a unit out of register,
 * so blue over yellow shows green-grey and coral over yellow orange.
 *
 * Closed: two banks of paper-white cloud drawn shut like curtains, in three
 * tiers; an even yellow light runs the length of the seam and catches the
 * cloud edges beside it; a coral thread pinned to each bank is tied across
 * the seam in a bow, a small star hanging from the knot; a few hand-cut
 * stars are out above. Opening: the bow comes undone and the thread slips
 * off; the clouds part in layers — the floor sinks, the flanks slide down and
 * aside, the upper bank draws apart; the light gathers into a ring and a
 * crescent moon rocks into place, lying on its back; stars come out one by
 * one; a mobile of five small things (a star, a small cloud, a folded paper
 * boat, a kite, a smaller star) is let down on threads from the crescent's
 * underside and sways. No text: the frame shows the gift.
 *
 * Canvas 360x450. The moon's centre is [184, 172], radius 52; the seam is at
 * x 184. The art is made by scripts/art/cloudmoon.gen.mjs (each SVG's viewBox
 * is its box): the clouds, the tie and its charm are drawn where they are
 * when CLOSED (the clouds move by PART); everything else where it is when OPEN.
 */

/** How far each cloud travels as the bank parts. */
const PART: Readonly<Record<string, readonly [number, number]>> = {
    'cloud-a': [-204, -30],
    'cloud-b': [206, -34],
    'cloud-c': [-100, 44],
    'cloud-d': [102, 40],
    'cloud-e': [-40, 10],
    'cloud-f': [36, 8],
    'cloud-g': [0, 14],
};
/** When each cloud starts to move, and for how long: the nearest first. */
const PART_AT: Readonly<Record<string, readonly [number, number]>> = {
    'cloud-g': [650, 1600],
    'cloud-e': [700, 1900],
    'cloud-f': [780, 1900],
    'cloud-c': [900, 2000],
    'cloud-d': [980, 2000],
    'cloud-a': [1150, 2100],
    'cloud-b': [1230, 2100],
};
const CLOUDS = Object.keys(PART);
const STARS = ['star-a', 'star-b', 'star-e', 'star-f', 'star-c', 'star-d'];
/** The mobile, in the order it is let down: the boat (the longest thread) first, then outward. */
const HANG = ['hang-c', 'hang-b', 'hang-d', 'hang-a', 'hang-e'];
/** The small swing each thing arrives with, in degrees. */
const SWING: Readonly<Record<string, number>> = { 'hang-a': 7, 'hang-b': -6, 'hang-c': 5, 'hang-d': -6, 'hang-e': 7 };

const open: Step[] = [
    // 1. The bow comes undone: the thread slackens and slips off, its star falling with it. The glow swells.
    { kind: 'move', layer: 'tie', at: 0, dur: 420, ease: 'inout', to: { sx: 1.08, y: 3 } },
    { kind: 'move', layer: 'tie', at: 380, dur: 760, ease: 'in', to: { y: 96, turn: 11, opacity: 0 } },
    { kind: 'move', layer: 'charm', at: 120, dur: 900, ease: 'in', to: { y: 130, turn: -38 } },
    { kind: 'move', layer: 'charm', at: 560, dur: 460, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'glow', at: 0, dur: 900, ease: 'inout', to: { sx: 1.3, opacity: 1 } },
    // 2. The clouds part in layers.
    ...CLOUDS.map((layer): Step => ({ kind: 'move', layer, at: PART_AT[layer]![0], dur: PART_AT[layer]![1], ease: 'inout', to: { x: PART[layer]![0], y: PART[layer]![1] } })),
    // 3. The glow thins into the ring of light; the crescent rocks into place.
    { kind: 'move', layer: 'halo', at: 1100, dur: 1700, ease: 'out', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'glow', at: 1300, dur: 800, ease: 'inout', to: { sx: 2.2, opacity: 0 } },
    { kind: 'move', layer: 'moon', at: 1600, dur: 800, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'moon', at: 1600, dur: 1700, ease: 'out', to: { sx: 1, sy: 1, turn: 0 } },
    // 4. Stars come out one by one.
    ...STARS.map((layer, i): Step => ({ kind: 'move', layer, at: 2900 + i * 300, dur: 520, ease: 'back', to: { opacity: 1, sx: 1, sy: 1 } })),
    // 5. The mobile is let down on its threads, each thing arriving with a small swing that dies away.
    ...HANG.flatMap((layer, i): Step[] => [
        { kind: 'move', layer, at: 3300 + i * 280, dur: 260, ease: 'out', to: { opacity: 1 } },
        { kind: 'move', layer, at: 3300 + i * 280, dur: 760, ease: 'out', to: { sy: 1 } },
        { kind: 'move', layer, at: 3300 + i * 280, dur: 1500, ease: 'inout', to: { turn: 0 } },
    ]),
];

const idle: IdleStep[] = [
    { layer: 'glow', field: 'opacity', amp: 0.08, period: 4600 },
    { layer: 'charm', field: 'turn', amp: 5, period: 3800 },
    { layer: 'cloud-a', field: 'x', amp: 1.6, period: 9000 },
    { layer: 'cloud-b', field: 'x', amp: 1.6, period: 9000, phase: 0.5 },
    { layer: 'cloud-c', field: 'x', amp: 2, period: 11000, phase: 0.5 },
    { layer: 'cloud-d', field: 'x', amp: 2, period: 11000 },
    { layer: 'cloud-e', field: 'y', amp: 1.2, period: 7600 },
    { layer: 'cloud-f', field: 'y', amp: 1.2, period: 7600, phase: 0.4 },
];

const afterglow: IdleStep[] = [
    { layer: 'hang-a', field: 'turn', amp: 3.2, period: 4300 },
    { layer: 'hang-b', field: 'turn', amp: 2.6, period: 5100, phase: 0.3 },
    { layer: 'hang-c', field: 'turn', amp: 2.1, period: 6200, phase: 0.55 },
    { layer: 'hang-d', field: 'turn', amp: 2.6, period: 5300, phase: 0.8 },
    { layer: 'hang-e', field: 'turn', amp: 3.4, period: 4100, phase: 0.15 },
    { layer: 'halo', field: 'sx', amp: 0.012, period: 6400 },
    { layer: 'halo', field: 'sy', amp: 0.012, period: 6400 },
    { layer: 'star-a', field: 'opacity', amp: 0.22, period: 3900 },
    { layer: 'star-b', field: 'opacity', amp: 0.22, period: 4700, phase: 0.4 },
    { layer: 'star-f', field: 'opacity', amp: 0.2, period: 5300, phase: 0.7 },
    { layer: 'cloud-c', field: 'x', amp: 3, period: 12000 },
    { layer: 'cloud-d', field: 'x', amp: 3, period: 12000, phase: 0.5 },
    { layer: 'cloud-e', field: 'x', amp: 2.4, period: 10000, phase: 0.25 },
    { layer: 'cloud-f', field: 'x', amp: 2.4, period: 10000, phase: 0.75 },
];

/** Each layer's box on the canvas, as scripts/art/cloudmoon.gen.mjs prints it. */
const BOX: Readonly<Record<string, LayerDef['box']>> = {
    sky: [-14, -14, 388, 478],
    halo: [60, 48, 248, 248],
    glow: [138, 96, 92, 376],
    moon: [127, 115, 114, 114],
    'star-a': [41, 172, 43, 50],
    'star-b': [286, 168, 42, 50],
    'star-c': [27, 220, 43, 48],
    'star-d': [298, 218, 40, 50],
    'star-e': [80, 244, 36, 52],
    'star-f': [253, 248, 43, 52],
    'hang-a': [121, 195.56, 36, 66.35],
    'hang-b': [142, 215.63, 36, 81.58],
    'hang-c': [164, 221.46, 36, 105.65],
    'hang-d': [186, 217.5, 36, 95.2],
    'hang-e': [205, 203.89, 36, 54.25],
    'cloud-a': [-16, 109, 199, 195],
    'cloud-b': [185, 111, 191, 193],
    'cloud-c': [-16, 205, 199, 188],
    'cloud-d': [185, 207, 191, 186],
    'cloud-e': [-16, 293, 209, 172],
    'cloud-f': [171, 295, 205, 170],
    'cloud-g': [-15, 403, 390, 77],
    tie: [134, 222, 102, 30],
    charm: [171, 236, 28, 36.92],
};

const at = (id: string, rest: Partial<LayerDef> = {}): LayerDef => ({ id, art: `${id}.svg`, box: BOX[id]!, ...rest });
const star = (id: string): LayerDef => at(id, { start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.1 });
/** A thing on its thread: it turns and is let down from where the thread is tied, the top of its box. */
const hang = (id: string): LayerDef => at(id, { origin: [0.5, 0], start: { opacity: 0, sy: 0.3, turn: SWING[id]! }, depth: 0.22 });

export const cloudmoon: WrapperDef = {
    id: 'cloudmoon',
    name: { vi: 'Mây và trăng', en: 'Cloud and moon' },
    ambient: ['#9CBDEA', '#F8D768', '#F08C78'],
    blurb: {
        vi: 'Bản in riso ba màu mực. Hai rèm mây buộc sợi chỉ san hô; tháo nơ, mây rẽ ra, trăng lưỡi liềm hiện giữa vòng sáng, chùm treo đung đưa.',
        en: 'A three-ink riso print. Two curtains of cloud tied with a coral thread; the bow slips, a crescent moon shows in its ring, a mobile sways.',
    },
    // Night-blue room, paper for the capsule, ink-blue text, a deepened coral for the one loud colour.
    theme: { ground: '#17263F', surface: '#FBF6EA', ink: '#060E1A', accent: '#B94A36', onAccent: '#FFFFFF', material: 'glass', corner: 'round', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.5],
    size: [360, 450],
    backdrop: '#9CBDEA',
    layers: [
        at('sky', { depth: 0.04 }),
        at('halo', { start: { sx: 0.55, sy: 0.55 }, depth: 0.1 }),
        at('glow', { start: { opacity: 0.9 }, depth: 0.1 }),
        at('moon', { start: { opacity: 0, sx: 0.78, sy: 0.78, turn: -24 }, depth: 0.14 }),
        ...['star-a', 'star-b', 'star-c', 'star-d', 'star-e', 'star-f'].map(star),
        ...['hang-a', 'hang-b', 'hang-c', 'hang-d', 'hang-e'].map(hang),
        at('cloud-a', { depth: 0.3 }),
        at('cloud-b', { depth: 0.3 }),
        at('cloud-c', { depth: 0.45 }),
        at('cloud-d', { depth: 0.45 }),
        at('cloud-e', { depth: 0.62 }),
        at('cloud-f', { depth: 0.62 }),
        at('cloud-g', { depth: 0.8 }),
        at('tie', { depth: 0.66 }),
        at('charm', { origin: [0.5, 0], depth: 0.66 }),
    ],
    idle,
    afterglow,
    open,
    revealAt: 2700,
    // A lullaby in three for a music box.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 67,
        score: together(
            tune(120, 'B5/4 D6/4 B5/4 | G5/2 A5/4 | B5/2.!', { beats: 3 }),
            tune(120, 'G3/2. | G3/2. | G3/2.', { beats: 3, inst: 'pad', gain: 0.45 }),
        ),
    },
};
