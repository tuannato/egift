import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Morning light (Bình minh) — the get-well wrapper, in WET-ON-WET WATERCOLOUR.
 * Closed: a window before sunrise. Linen curtains are drawn shut and are the
 * seal; the morning already blooms through the cloth in peach and yellow, a
 * line of bare paper stands at the seam and under the hem, and on the sill a
 * glass of water with a sprig, a bowl of fruit and a few books wait in the
 * blue-grey. Opening: the seam swells, the curtains gather to both sides and
 * settle into their ties, the dusk lifts off the room, the view stands in the
 * sash window — a low sun over layered hills, one tree in new leaf — light
 * lies across the sill, the sprig leans to it, far birds drift. No text: the
 * frame shows the gift.
 *
 * Canvas 360x450. The window's panes are x 34..326, y 56..286 with a sash rail
 * at y 132..140; the sill's front edge is at y 360; the sun is bare paper at
 * (238, 202), off-centre. The page fades the canvas out below y 333, so what
 * matters sits above. The art is drawn where it is when OPEN
 * (scripts/art/dawn.gen.mjs: each SVG's viewBox is its box). `dim` is the
 * dusk, multiplied over the room; `flood` adds light.
 */

/** How narrow a closed curtain gathers; the tied drape has taken its place well before. */
const GATHER = 0.36;

const VIEW = 0.08;
const ROOM = 0.3;
const SILL = 0.4;

const layers: LayerDef[] = [
    { id: 'sky', art: 'sky.svg', box: [-12, -12, 384, 474], depth: 0.04 },
    { id: 'far', art: 'far.svg', box: [-12, 180, 384, 120], start: { y: 5 }, depth: VIEW },
    { id: 'near', art: 'near.svg', box: [-12, 236, 384, 70], start: { y: 9 }, depth: 0.12 },
    { id: 'tree', art: 'tree.svg', box: [50, 104, 130, 166], origin: [0.5, 0.95], start: { y: 9 }, depth: 0.12 },
    { id: 'birds', art: 'birds.svg', box: [176, 92, 84, 40], start: { opacity: 0, x: 60, y: 12 }, depth: 0.1 },
    { id: 'wall', art: 'wall.svg', box: [-12, -12, 384, 474], depth: ROOM },
    { id: 'patch', art: 'patch.svg', box: [-12, -12, 384, 474], start: { opacity: 0 }, depth: ROOM },
    { id: 'drape-l', art: 'drape-l.svg', box: [13, 38, 84, 273], origin: [0.07, 0], start: { opacity: 0 }, depth: ROOM },
    { id: 'drape-r', art: 'drape-r.svg', box: [273, 38, 80, 273], origin: [0.85, 0], start: { opacity: 0 }, depth: ROOM },
    { id: 'curt-l', art: 'curt-l.svg', box: [14, 38, 174, 273], origin: [6 / 174, 0], depth: ROOM },
    { id: 'curt-r', art: 'curt-r.svg', box: [172, 38, 174, 273], origin: [168 / 174, 0], depth: ROOM },
    { id: 'seam', art: 'seam.svg', box: [-12, -12, 384, 474], origin: [0.5, 0.5], depth: ROOM },
    { id: 'rod', art: 'rod.svg', box: [2, 30.5, 356, 24], depth: ROOM },
    { id: 'books', art: 'books.svg', box: [32, 306, 94, 56], depth: SILL },
    { id: 'bowl', art: 'bowl.svg', box: [142, 286, 108, 77], depth: SILL },
    { id: 'glass', art: 'glass.svg', box: [260, 286, 52, 74], depth: SILL },
    { id: 'sprig', art: 'sprig.svg', box: [218, 204, 112, 108], origin: [69 / 112, 100 / 108], start: { turn: 10, sy: 0.9 }, depth: SILL },
    { id: 'dim', art: 'dim.svg', box: [-12, -12, 384, 474], blend: 'multiply', depth: ROOM },
    { id: 'flood', art: 'flood.svg', box: [-12, -12, 384, 474], blend: 'screen', start: { opacity: 0 } },
];

const open: Step[] = [
    // 1. The light at the seam swells.
    { kind: 'move', layer: 'seam', at: 0, dur: 450, ease: 'inout', to: { sx: 1.6 } },
    // 2. The curtains gather to both sides, and are the tied drapes before they have gone far.
    { kind: 'move', layer: 'curt-l', at: 350, dur: 1150, ease: 'inout', to: { sx: GATHER } },
    { kind: 'move', layer: 'curt-r', at: 420, dur: 1150, ease: 'inout', to: { sx: GATHER } },
    { kind: 'move', layer: 'seam', at: 450, dur: 700, ease: 'in', to: { sx: 4, opacity: 0 } },
    { kind: 'move', layer: 'drape-l', at: 800, dur: 550, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'drape-r', at: 870, dur: 550, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'curt-l', at: 900, dur: 550, ease: 'inout', to: { opacity: 0 } },
    { kind: 'move', layer: 'curt-r', at: 970, dur: 550, ease: 'inout', to: { opacity: 0 } },
    { kind: 'move', layer: 'dim', at: 400, dur: 1400, ease: 'inout', to: { opacity: 0 } },
    { kind: 'move', layer: 'flood', at: 500, dur: 1100, ease: 'out', to: { opacity: 0.42 } },
    { kind: 'move', layer: 'flood', at: 1600, dur: 2000, ease: 'inout', to: { opacity: 0.12 } },
    // 3. The land rises a little to meet the eye.
    { kind: 'move', layer: 'far', at: 600, dur: 2200, ease: 'out', to: { y: 0 } },
    { kind: 'move', layer: 'near', at: 600, dur: 2200, ease: 'out', to: { y: 0 } },
    { kind: 'move', layer: 'tree', at: 600, dur: 2200, ease: 'out', to: { y: 0 } },
    // 4. Light lies across the sill.
    { kind: 'move', layer: 'patch', at: 1200, dur: 1300, ease: 'inout', to: { opacity: 1 } },
    // 5. The sprig leans to the light.
    { kind: 'move', layer: 'sprig', at: 2000, dur: 1800, ease: 'inout', to: { turn: -5, sy: 1 } },
    // 6. Far birds drift across.
    { kind: 'move', layer: 'birds', at: 2600, dur: 800, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'birds', at: 2600, dur: 2800, ease: 'out', to: { x: 0, y: 0 } },
];

const idle: IdleStep[] = [
    { layer: 'seam', field: 'opacity', amp: 0.14, period: 4200 },
    { layer: 'curt-l', field: 'sx', amp: 0.005, period: 6800 },
    { layer: 'curt-r', field: 'sx', amp: 0.005, period: 7400, phase: 0.5 },
];

const afterglow: IdleStep[] = [
    { layer: 'sprig', field: 'turn', amp: 0.9, period: 6400 },
    { layer: 'tree', field: 'turn', amp: 0.5, period: 8200, phase: 0.3 },
    { layer: 'birds', field: 'y', amp: 1.2, period: 5000 },
    { layer: 'birds', field: 'x', amp: 3, period: 9400, phase: 0.2 },
    { layer: 'flood', field: 'opacity', amp: 0.04, period: 7000 },
    { layer: 'drape-l', field: 'sx', amp: 0.012, period: 7600 },
    { layer: 'drape-r', field: 'sx', amp: 0.012, period: 8400, phase: 0.6 },
];

export const dawn: WrapperDef = {
    id: 'dawn',
    name: { vi: 'Bình minh', en: 'Morning light' },
    ambient: ['#FFE3A3', '#BFDDF2', '#F9BD9E'],
    blurb: {
        vi: 'Màu nước loang ướt: rèm lanh khép, nắng sớm loang qua vải. Rèm mở, nắng tràn bậu cửa, mặt trời trên đồi, nhành lá nghiêng về phía sáng.',
        en: 'Wet watercolour: linen curtains drawn, morning blooming through. They part, sun fills the sill, hills glow, a sprig leans to the light.',
    },
    // Warm white paper, slate ink, one amber; a blue-grey room before sunrise.
    theme: { ground: '#3B475B', surface: '#FFF8EA', ink: '#0E141B', accent: '#B4530F', onAccent: '#FFFFFF', material: 'glass', corner: 'round', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.47],
    size: [360, 450],
    backdrop: '#8D99B0',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 2300,
    // A rising line on glass, over a soft held tone: the light coming in.
    sound: {
        v: 1,
        inst: 'glassy',
        tonic: 72,
        score: scaled(1.35, together(
            tune(120, 'G4/4 C5/4 D5/4 E5/4 | G5/2 E5/2!'),
            tune(120, 'C4/1 | C4/1', { inst: 'pad', gain: 0.5 }),
        )),
    },
};
