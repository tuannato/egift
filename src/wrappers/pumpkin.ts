import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { together, tune } from './tune';

/**
 * "Đèn bí" / Pumpkin lantern, the Halloween wrapper: a shadow-puppet theatre.
 * A cloth screen glows dull amber between wooden stage edges. On it, in cut
 * black: a big pumpkin with its lid on, bare twisted trees, a crooked fence
 * and a wrought gate, latched and padlocked across the scene. Opening: the
 * latch drops, the gate folds back, the lid lifts on its rod, the fire behind
 * the cloth is fed and the whole screen goes hot; bats burst out on their
 * rods, the owl turns its head, the moon is carried up, the house lights its
 * windows, a cat comes along the fence and arches.
 *
 * Drawn as shadow puppetry: flat black cuts with pierced patterns, a soft
 * penumbra round whatever stands off the cloth, visible rods and pins. No
 * shading on any figure. The light is two layers under the puppets.
 *
 * Canvas 360x450. Art in public/wrappers/pumpkin/ is authored in canvas units
 * (each SVG's viewBox is its layer box) by scripts/art/pumpkin.gen.mjs; the
 * geometry below must match it.
 */

const FULL = [-8, -8, 376, 466] as const;
/** The pumpkin's centre and the line its lid is cut along. */
const PK = [108, 232] as const;
const CUTY = PK[1] - 34;
/** The gate: hinges at L and R, the leaves meet at M. */
const GATE = { l: 122, m: 205, r: 288 } as const;
/** How thin a leaf of the gate is once it stands open (seen edge on). */
const AJAR = 0.15;
/** The latch's pivot, on the left leaf. */
const LATCH = [183, 318] as const;

/** Parallax planes: the cloth is fixed; the further a puppet stands from it, the more it shifts. */
const D_MOON = 0.03;
const D_MID = 0.07;
const D_PUMPKIN = 0.13;
const D_BAT = 0.2;
const D_FENCE = 0.24;
const D_LEAF = 0.32;

/** The bats: where each ends up (its body), and its layer box. Same as the generator. */
const BATS = [
    { at: [196, 162], box: [153.2, 124, 85.6, 162], turn: -40 },
    { at: [177, 111], box: [143.7, 81.4, 66.6, 112.7], turn: 50 },
    { at: [237, 113], box: [211.2, 90, 51.6, 106.8], turn: 30 },
    { at: [305, 97], box: [274.4, 69.8, 61.1, 100.1], turn: 70 },
    { at: [226, 211], box: [204.3, 191.6, 43.4, 76.8], turn: 60 },
] as const;
/** Where the bats come out: the pumpkin's mouth. */
const MOUTH = [PK[0], CUTY - 2] as const;

const bats: LayerDef[] = BATS.map((b, i): LayerDef => ({
    id: `bat-${i + 1}`,
    art: `bat-${i + 1}.svg`,
    box: b.box,
    origin: [(b.at[0] - b.box[0]) / b.box[2], (b.at[1] - b.box[1]) / b.box[3]],
    depth: D_BAT,
    start: { x: MOUTH[0] - b.at[0], y: MOUTH[1] - b.at[1], sx: 0.12, sy: 0.12, turn: b.turn, opacity: 0 },
}));

const layers: LayerDef[] = [
    { id: 'screen', art: 'screen.svg', box: FULL },
    { id: 'blaze', art: 'blaze.svg', box: FULL, blend: 'screen', start: { opacity: 0 } },
    { id: 'moon', art: 'moon.svg', box: [180, 78, 92, 92], depth: D_MOON, start: { y: 190, opacity: 0 } },
    // light on the cloth, so under every puppet (a shadow cannot be lit)
    { id: 'flare', art: 'flare.svg', box: [PK[0] - 100, CUTY - 143, 200, 170], origin: [0.5, 0.85], depth: D_MID, blend: 'screen', start: { opacity: 0, sx: 0.5, sy: 0.25 } },
    { id: 'windows', art: 'windows.svg', box: [240, 177, 90, 116], depth: D_MID, start: { opacity: 0 } },
    { id: 'mid', art: 'mid.svg', box: FULL, depth: D_MID },
    { id: 'owl-head', art: 'owl-head.svg', box: [258, 123, 40, 34], origin: [0.5, 0.56], depth: D_MID, start: { turn: -9 } },
    { id: 'glow', art: 'glow.svg', box: [PK[0] - 82, PK[1] - 62, 164, 124], depth: D_PUMPKIN, start: { opacity: 0.72 } },
    { id: 'lid', art: 'lid.svg', box: [PK[0] - 70, PK[1] - 101, 140, 152], origin: [0.5, (CUTY - (PK[1] - 101)) / 152], depth: D_PUMPKIN },
    { id: 'pumpkin', art: 'pumpkin.svg', box: [PK[0] - 88, PK[1] - 69, 176, 448 - (PK[1] - 69)], depth: D_PUMPKIN },
    ...bats,
    { id: 'cat', art: 'cat.svg', box: [286, 281, 64, 132], origin: [0.5, 0.48], depth: D_FENCE, start: { x: 96 } },
    { id: 'fence', art: 'fence.svg', box: [-8, 280, 376, 178], depth: D_FENCE },
    { id: 'gate-l', art: 'gate-l.svg', box: [118, 254, 91, 160], origin: [(GATE.l - 118) / 91, 0.5], depth: D_FENCE },
    { id: 'gate-r', art: 'gate-r.svg', box: [201, 254, 91, 160], origin: [(GATE.r - 201) / 91, 0.5], depth: D_FENCE },
    { id: 'latch', art: 'latch.svg', box: [174, 306, 66, 60], origin: [(LATCH[0] - 174) / 66, (LATCH[1] - 306) / 60], depth: D_FENCE },
    { id: 'leaves', art: 'leaves.svg', box: FULL, depth: D_LEAF, start: { x: -396, y: -30, turn: -7 } },
    { id: 'leaf', art: 'leaf.svg', box: [34, 196, 15, 12], depth: D_LEAF },
    { id: 'leaf-b', art: 'leaf-b.svg', box: [150, 150, 14, 13], depth: D_LEAF },
    { id: 'frame', art: 'frame.svg', box: FULL },
];

// Beat times (ms).
const SWING = 620; // the gate
const LIFT = 1380; // the lid
const BURST = LIFT + 260; // the bats

const open: Step[] = [
    // 0. The seal: the padlocked bar is rattled, then drops and hangs from its pin.
    { kind: 'shake', layer: 'latch', at: 0, dur: 300, amp: 1.3, times: 4 },
    { kind: 'move', layer: 'latch', at: 260, dur: 520, ease: 'bounce', to: { turn: 86 } },

    // 1. The gate folds back, left leaf first; the bar goes with the leaf it is pinned to.
    { kind: 'move', layer: 'gate-l', at: SWING, dur: 760, ease: 'back', to: { sx: AJAR } },
    { kind: 'move', layer: 'latch', at: SWING, dur: 760, ease: 'back', to: { x: -(LATCH[0] - GATE.l) * (1 - AJAR), sy: 0.5 } },
    { kind: 'move', layer: 'gate-r', at: SWING + 140, dur: 760, ease: 'back', to: { sx: AJAR } },
    { kind: 'shake', layer: 'fence', at: SWING + 700, dur: 260, amp: 0.7, times: 2 },

    // 2. The lid stirs, then lifts on its rod. The fire is fed: the whole cloth goes hot.
    { kind: 'shake', layer: 'lid', at: LIFT - 320, dur: 320, amp: 1.1, times: 3 },
    { kind: 'move', layer: 'lid', at: LIFT, dur: 700, ease: 'back', to: { y: -27, x: -5, turn: -12 } },
    { kind: 'move', layer: 'glow', at: LIFT - 100, dur: 700, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'flare', at: LIFT + 60, dur: 760, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'blaze', at: LIFT, dur: 1500, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'flare', at: LIFT + 1500, dur: 1700, ease: 'inout', to: { opacity: 0.62 } },

    // 3. Bats burst out of the pumpkin's mouth and scatter, each to its own place.
    ...BATS.map((_, i): Step[] => {
        const at = BURST + i * 110;
        return [
            { kind: 'move', layer: `bat-${i + 1}`, at, dur: 120, ease: 'out', to: { opacity: 1 } },
            { kind: 'move', layer: `bat-${i + 1}`, at, dur: 1000 + i * 90, ease: 'out', to: { x: 0, y: 0, sx: 1, sy: 1, turn: 0 } },
        ];
    }).flat(),

    // 4. Leaves blow across.
    { kind: 'scatter', layer: 'leaf', at: BURST + 100, dur: 2300, count: 12, spread: 250, fall: 70 },
    { kind: 'scatter', layer: 'leaf-b', at: BURST + 500, dur: 2400, count: 9, spread: 230, fall: 90 },
    { kind: 'move', layer: 'leaves', at: BURST + 300, dur: 2300, ease: 'out', to: { x: 0, y: 0, turn: 0 } },

    // 5. The moon is carried up; the owl turns to look; the house lights up; the cat arrives.
    { kind: 'move', layer: 'moon', at: BURST + 500, dur: 500, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'moon', at: BURST + 500, dur: 2100, ease: 'out', to: { y: 0 } },
    { kind: 'move', layer: 'owl-head', at: BURST + 900, dur: 420, ease: 'inout', to: { sx: -1, turn: 8 } },
    { kind: 'move', layer: 'windows', at: BURST + 1500, dur: 500, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'cat', at: BURST + 1300, dur: 1300, ease: 'out', to: { x: 0 } },
    { kind: 'shake', layer: 'cat', at: BURST + 2600, dur: 300, amp: 0.8, times: 2 },
];

const idle: IdleStep[] = [
    // the lamp is low and breathes; the candle in the pumpkin answers
    { layer: 'glow', field: 'opacity', amp: 0.14, period: 3400 },
    // puppets are held by hands: nothing is quite still
    { layer: 'latch', field: 'turn', amp: 1.6, period: 4200 },
    { layer: 'lid', field: 'y', amp: 0.5, period: 5200, phase: 0.2 },
    { layer: 'owl-head', field: 'turn', amp: 2.5, period: 6100 },
];

const afterglow: IdleStep[] = [
    // the fire breathes, never flickers
    { layer: 'blaze', field: 'opacity', amp: 0.07, period: 2900 },
    { layer: 'flare', field: 'opacity', amp: 0.12, period: 2300, phase: 0.3 },
    { layer: 'flare', field: 'sy', amp: 0.04, period: 3100 },
    { layer: 'windows', field: 'opacity', amp: 0.12, period: 3700, phase: 0.6 },
    // the bats bob on their rods, each to its own time
    ...BATS.map((_, i): IdleStep[] => [
        { layer: `bat-${i + 1}`, field: 'y', amp: 2.2 + (i % 3) * 0.7, period: 2100 + i * 370, phase: i * 0.21 },
        { layer: `bat-${i + 1}`, field: 'turn', amp: 3 + (i % 2) * 1.5, period: 2700 + i * 290, phase: i * 0.13 },
    ]).flat(),
    { layer: 'lid', field: 'y', amp: 1.1, period: 4300 },
    { layer: 'lid', field: 'turn', amp: 1.2, period: 5100, phase: 0.4 },
    { layer: 'leaves', field: 'x', amp: 3, period: 6800 },
    { layer: 'leaves', field: 'y', amp: 1.6, period: 4900, phase: 0.3 },
    { layer: 'latch', field: 'turn', amp: 4, period: 3300 },
    { layer: 'owl-head', field: 'turn', amp: 3, period: 5700 },
];

export const pumpkin: WrapperDef = {
    id: 'pumpkin',
    name: { vi: 'Đèn bí', en: 'Pumpkin lantern' },
    ambient: ['#2A0E16', '#F07A1C', '#FFB850'],
    blurb: {
        vi: 'Sân khấu rối bóng: cổng cài then, bí còn đậy nắp. Then rơi, cổng mở, nắp nhấc lên, lửa bừng sau màn, dơi ùa ra, trăng lên, mèo cong lưng.',
        en: 'A shadow-puppet stage: gate latched, pumpkin lidded. The bar drops, the lid lifts, fire floods the screen, bats burst out, the moon rises.',
    },
    // Plain dark glass with soft corners, firelit type, one burnt orange: the frame stays out of the theatre's way.
    theme: { ground: '#0B0509', surface: '#22101A', ink: '#FFF1DC', accent: '#FF9A2E', onAccent: '#2A0F02', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.45, 0.56],
    size: [360, 450],
    backdrop: '#1A0B10',
    layers,
    idle,
    afterglow,
    open,
    revealAt: BURST + 700,
    // A sly minor tune on a music box, over a low horn.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 74,
        score: together(
            tune(150, 'D5/8 F5/8 A5/8 D6/8 C#6/4 A5/4 | D5/8 F5/8 A5/8 F5/8 D5/2!'),
            tune(150, 'D3/2 A2/2 | D3/1', { inst: 'brass', gain: 0.5 }),
        ),
    },
};

export default pumpkin;
