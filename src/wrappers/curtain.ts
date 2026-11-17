import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Stage curtain — for an opening, a launch, congratulations. A theatre seen
 * from the stalls, in flat shapes: two velvet wings drawn shut as vertical
 * folds, a valance of swags with gold fringe and tasselled cords, a wooden
 * stage with a row of footlights, and one thin blade of light through the gap.
 * Opening: the wings shiver and gather to the sides, the footlights come on
 * one after another, and the set stands behind: a night-blue wall with a gold
 * proscenium line, two columns, a pedestal under a cloth at centre stage; a
 * cone of light comes down on it from a lamp under the valance, a pool of
 * light grows on the boards, gold dust hangs in the beam, and at the last the
 * cloth is whisked away from a plain gold casket.
 *
 * The stage scales whole layers, so a wing "gathers" by narrowing toward its
 * outer edge: the folds bunch, they do not travel.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/curtain.gen.mjs): each SVG's viewBox is its box. The stage's
 * front edge is at y 356, the curtain's hem at y 333, the floor meets the set
 * at y 296.
 */

/** How narrow a wing gathers. */
const GATHER = 0.27;
/** The footlights, left to right. */
const FEET = [36, 84, 132, 180, 228, 276, 324] as const;
/** How bright a footlight is while the house waits. */
const LOW = 0.34;

const SET = 0.14;
/** The pedestal, the cloth over it and the cloth's shade share one box. */
const PBOX: readonly [number, number, number, number] = [120, 198, 120, 140];
const DRAPE = 0.3;

const layers: LayerDef[] = [
    { id: 'back', art: 'back.svg', box: [-6, -6, 372, 462], depth: 0.04 },
    { id: 'flats', art: 'flats.svg', box: [40, 56, 280, 250], depth: 0.09 },
    { id: 'pool', art: 'pool.svg', box: [84, 314, 192, 36], start: { opacity: 0, sx: 0.25, sy: 0.25 }, depth: SET },
    { id: 'beam', art: 'beam.svg', box: [86, 86, 188, 238], origin: [0.5, 0], start: { opacity: 0, sy: 0.12 }, depth: SET },
    { id: 'aura', art: 'aura.svg', box: [134, 168, 92, 116], start: { opacity: 0 }, depth: SET },
    { id: 'plinth', art: 'plinth.svg', box: PBOX, depth: SET },
    { id: 'cloth', art: 'cloth.svg', box: PBOX, origin: [0.5, 0.2], depth: SET },
    // The cloth waits in the dark: its own outline in the set's blue lies on it until the light lands.
    { id: 'shade', art: 'shade.svg', box: PBOX, depth: SET },
    { id: 'dust', art: 'dust.svg', box: [112, 60, 136, 240], start: { opacity: 0, y: -10 }, depth: 0.2 },
    { id: 'wing-l', art: 'wing-l.svg', box: [-8, 20, 190, 330], origin: [0, 0], depth: DRAPE },
    { id: 'wing-r', art: 'wing-r.svg', box: [178, 20, 190, 330], origin: [1, 0], depth: DRAPE },
    { id: 'blade', art: 'blade.svg', box: [164, 44, 32, 314], depth: DRAPE },
    ...FEET.map((x, i): LayerDef => ({ id: `glow-${i + 1}`, art: `glow-${i + 1}.svg`, box: [x - 34, 302, 68, 58], start: { opacity: LOW }, depth: 0.46 })),
    { id: 'valance', art: 'valance.svg', box: [-10, -10, 380, 84], depth: 0.4 },
    { id: 'cord-l', art: 'cord-l.svg', box: [17, 36, 30, 116], origin: [0.5, 0], depth: 0.44 },
    { id: 'cord-r', art: 'cord-r.svg', box: [313, 36, 30, 116], origin: [0.5, 0], depth: 0.44 },
    { id: 'front', art: 'front.svg', box: [-10, 340, 380, 116], depth: 0.46 },
    { id: 'fleck', art: 'fleck.svg', box: [177, 218, 6, 6] },
];

const open: Step[] = [
    // 1. A shiver runs through the wings; the blade of light swells.
    { kind: 'shake', layer: 'wing-l', at: 0, dur: 300, amp: 2.2, times: 3 },
    { kind: 'shake', layer: 'wing-r', at: 0, dur: 300, amp: -2.2, times: 3 },
    { kind: 'move', layer: 'blade', at: 0, dur: 280, ease: 'out', to: { sx: 2.2 } },
    // 2. The wings gather to the sides; the cords are pulled out and swing back.
    { kind: 'move', layer: 'wing-l', at: 240, dur: 1260, ease: 'inout', to: { sx: GATHER } },
    { kind: 'move', layer: 'wing-r', at: 290, dur: 1260, ease: 'inout', to: { sx: GATHER } },
    { kind: 'move', layer: 'blade', at: 280, dur: 300, ease: 'in', to: { sx: 3.2, opacity: 0 } },
    { kind: 'move', layer: 'cord-l', at: 300, dur: 520, ease: 'inout', to: { turn: 7 } },
    { kind: 'move', layer: 'cord-l', at: 820, dur: 900, ease: 'back', to: { turn: 0 } },
    { kind: 'move', layer: 'cord-r', at: 350, dur: 520, ease: 'inout', to: { turn: -7 } },
    { kind: 'move', layer: 'cord-r', at: 870, dur: 900, ease: 'back', to: { turn: 0 } },
    // 3. The footlights come up one after another, left to right.
    ...FEET.map((_, i): Step => ({ kind: 'move', layer: `glow-${i + 1}`, at: 320 + i * 110, dur: 260, ease: 'out', to: { opacity: 1 } })),
    // 4. The light comes down on the cloth, and the pool grows on the boards.
    { kind: 'move', layer: 'beam', at: 960, dur: 500, ease: 'out', to: { opacity: 1, sy: 1 } },
    { kind: 'move', layer: 'shade', at: 1060, dur: 440, ease: 'out', to: { opacity: 0 } },
    { kind: 'move', layer: 'pool', at: 1180, dur: 480, ease: 'out', to: { opacity: 0.6, sx: 0.86, sy: 0.86 } },
    { kind: 'move', layer: 'dust', at: 1300, dur: 800, ease: 'out', to: { opacity: 1, y: 0 } },
    // 5. The cloth is whisked up and away to the right; the casket stands in its own light, and the pool brightens.
    { kind: 'move', layer: 'cloth', at: 1460, dur: 110, ease: 'in', to: { sy: 0.94 } },
    { kind: 'move', layer: 'cloth', at: 1550, dur: 420, ease: 'inout', to: { x: 78, y: -96, turn: 22, sx: 0.8 } },
    { kind: 'move', layer: 'cloth', at: 1720, dur: 250, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'aura', at: 1660, dur: 540, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'pool', at: 1660, dur: 540, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'scatter', layer: 'fleck', at: 1640, dur: 560, count: 12, spread: 70, fall: 34 },
];

const sway: IdleStep[] = [
    { layer: 'cord-l', field: 'turn', amp: 0.9, period: 5600 },
    { layer: 'cord-r', field: 'turn', amp: 0.9, period: 6300, phase: 0.4 },
];

const idle: IdleStep[] = [
    ...sway,
    // The wings breathe sideways; the blade pulses.
    { layer: 'wing-l', field: 'sx', amp: 0.006, period: 6400 },
    { layer: 'wing-r', field: 'sx', amp: 0.006, period: 7000, phase: 0.5 },
    { layer: 'blade', field: 'opacity', amp: 0.2, period: 3800 },
    { layer: 'blade', field: 'sx', amp: 0.12, period: 3800 },
];

const afterglow: IdleStep[] = [
    ...sway,
    { layer: 'beam', field: 'opacity', amp: 0.14, period: 5200 },
    { layer: 'aura', field: 'opacity', amp: 0.14, period: 5200, phase: 0.15 },
    { layer: 'pool', field: 'sx', amp: 0.03, period: 5200 },
    { layer: 'dust', field: 'y', amp: 4, period: 7400 },
    { layer: 'dust', field: 'opacity', amp: 0.16, period: 4600, phase: 0.3 },
    { layer: 'wing-l', field: 'sx', amp: 0.008, period: 6400 },
    { layer: 'wing-r', field: 'sx', amp: 0.008, period: 7000, phase: 0.5 },
];

export const curtain: WrapperDef = {
    id: 'curtain',
    name: { vi: 'Rèm sân khấu', en: 'Stage curtain' },
    ambient: ['#A51C2D', '#E3B04B', '#18284E'],
    blurb: {
        vi: 'Rèm nhung khép, một vệt sáng lọt qua khe. Rèm dồn về hai bên, đèn chân sân khấu lần lượt sáng, tấm vải được kéo đi, lộ chiếc tráp vàng.',
        en: 'Velvet wings shut, a blade of light at the gap. They gather aside, footlights come up, and the cloth is whisked off a gold casket.',
    },
    // The house in the dark: wine lacquer, the stage light for words, the fringe's gold for the one loud colour.
    theme: { ground: '#12060A', surface: '#2E0D15', ink: '#FFF0CC', accent: '#E3B04B', onAccent: '#12060A', material: 'lacquer', corner: 'soft', face: 'serif', voice: 'chime' },
    focus: [0.5, 0.56],
    size: [360, 450],
    backdrop: '#12060A',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 1680,
    // A two-note brass call, a fourth up, over a held pad: the second note lands with the light and is held as the cloth leaves.
    sound: {
        v: 1,
        inst: 'brass',
        tonic: 60,
        score: scaled(1.05, together(
            tune(80, 'G4/4 [C5 G4]/2!', { start: 280 }),
            tune(80, '[C3 G3]/2.', { inst: 'pad', gain: 0.4 }),
        )),
    },
};
