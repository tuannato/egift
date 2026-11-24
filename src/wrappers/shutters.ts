import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, tune } from './tune';

/**
 * Winter window — the secular winter-holiday wrapper, in layered paper-cut.
 * The snowy front of a house at night, seen a little from the side: the front
 * wall square to us, the gable end and the roof running back to the right. A
 * lamp on a post, a bare tree nearer than the house, drifts in front. Small
 * windows are lit; the large one has its two red shutters closed, a line of
 * light in the crack between them. Opening: the latch goes, the two leaves
 * swing right round on their outer hinges and strike the wall; as they part
 * the room lights in one bloom: a fir, a garland, a laid table; the light
 * falls out in a wedge across the snow, and the snow on the sill is knocked
 * loose. After: the room's light breathes and the lamps on the fir twinkle.
 *
 * The stage scales whole layers, so a leaf swinging is its outer face
 * narrowing to nothing at the hinge and its inner face growing out on the
 * other side of the same hinge.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/shutters.gen.mjs): each SVG's viewBox is its box.
 */

/** The leaves are edge-on at this moment: the outer face has gone, the inner face starts. */
const EDGE_ON = 720;
/** The leaves strike the wall. */
const STRUCK = 1080;

const LIGHTS = [
    { layer: 'lights-a', period: 2300, phase: 0 },
    { layer: 'lights-b', period: 3100, phase: 0.4 },
    { layer: 'lights-c', period: 2700, phase: 0.75 },
] as const;

const open: Step[] = [
    // 1. The leaves rattle; the latch and the line of light between them go.
    { kind: 'shake', layer: 'closed-l', at: 0, dur: 260, amp: 1.4, times: 3 },
    { kind: 'shake', layer: 'closed-r', at: 0, dur: 260, amp: 1.4, times: 3 },
    { kind: 'move', layer: 'seam', at: 160, dur: 200, ease: 'out', to: { opacity: 0, sx: 2.2 } },
    // 2. The two leaves swing out on their outer hinges: the outer face narrows to nothing...
    { kind: 'move', layer: 'closed-l', at: 260, dur: EDGE_ON - 260, ease: 'in', to: { sx: 0 } },
    { kind: 'move', layer: 'closed-r', at: 260, dur: EDGE_ON - 260, ease: 'in', to: { sx: 0 } },
    // ...and the inner face comes round onto the wall, with a small knock.
    { kind: 'move', layer: 'open-l', at: EDGE_ON, dur: STRUCK - EDGE_ON, ease: 'back', to: { sx: 1 } },
    { kind: 'move', layer: 'open-r', at: EDGE_ON, dur: STRUCK - EDGE_ON, ease: 'back', to: { sx: 1 } },
    // 3. As they part the room lights, in one bloom: the room, then its light swelling past what it will settle at.
    { kind: 'move', layer: 'room', at: 300, dur: 560, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'glow', at: 560, dur: 620, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'glow', at: 1180, dur: 900, ease: 'inout', to: { opacity: 0.55 } },
    { kind: 'move', layer: 'spill', at: 640, dur: 700, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    // 4. The light falls out across the snow, from the wall toward us.
    { kind: 'move', layer: 'wedge', at: 820, dur: 760, ease: 'out', to: { opacity: 1, sy: 1 } },
    // 5. The leaves strike the wall: the snow on the sill jumps, and a little of it is knocked loose.
    { kind: 'shake', layer: 'sill', at: STRUCK - 40, dur: 240, amp: 1.2, times: 2 },
    { kind: 'scatter', layer: 'fleck', at: STRUCK - 40, dur: 1300, count: 18, spread: 105, fall: 120 },
    // 6. The lamps on the fir come up together, and the light on its tip opens.
    ...LIGHTS.map(({ layer }): Step => ({ kind: 'move', layer, at: 1260, dur: 420, ease: 'out', to: { opacity: 0.7 } })),
    { kind: 'move', layer: 'glint', at: 1420, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'glint', at: 1420, dur: 520, ease: 'back', to: { sx: 1, sy: 1, turn: 0 } },
];

/** The night outside never stops: the lamp breathes, the snow in the air shimmers and sways a little. */
const outside: IdleStep[] = [
    { layer: 'lamp-halo', field: 'opacity', amp: 0.1, period: 5200 },
    { layer: 'snow-a', field: 'opacity', amp: 0.2, period: 4600 },
    { layer: 'snow-a', field: 'x', amp: 3, period: 7400 },
    { layer: 'snow-b', field: 'opacity', amp: 0.2, period: 5800, phase: 0.45 },
    { layer: 'snow-b', field: 'x', amp: 4, period: 9000, phase: 0.3 },
    { layer: 'branches', field: 'turn', amp: 0.35, period: 6800 },
];

const idle: IdleStep[] = [
    ...outside,
    // The line of light between the closed leaves breathes: someone is home.
    { layer: 'seam', field: 'opacity', amp: 0.2, period: 3600 },
];

const afterglow: IdleStep[] = [
    ...outside,
    // The room's light breathes, and what it throws outside breathes with it.
    { layer: 'glow', field: 'opacity', amp: 0.2, period: 4600 },
    { layer: 'spill', field: 'opacity', amp: 0.12, period: 4600 },
    { layer: 'wedge', field: 'opacity', amp: 0.1, period: 4600 },
    // The lamps on the fir twinkle, none in step with another.
    ...LIGHTS.map(({ layer, period, phase }): IdleStep => ({ layer, field: 'opacity', amp: 0.3, period, phase })),
    { layer: 'glint', field: 'sx', amp: 0.12, period: 3400 },
    { layer: 'glint', field: 'sy', amp: 0.12, period: 3400 },
    { layer: 'glint', field: 'turn', amp: 5, period: 6800 },
];

export const shutters: WrapperDef = {
    id: 'shutters',
    name: { vi: 'Cửa sổ đêm đông', en: 'Winter window' },
    ambient: ['#101B33', '#FFD27A', '#C9432F'],
    blurb: {
        vi: 'Căn nhà phủ tuyết trong đêm. Hai cánh cửa chớp đỏ bật mở, căn phòng bừng sáng: cây thông, vòng lá, bàn tiệc; ánh đèn đổ dài trên tuyết.',
        en: 'A snowy house at night. Two red shutters swing open and the room lights in one bloom: a fir, a garland, a table; light falls on the snow.',
    },
    // The night for the room and the surface, the snow for the words, the window's warm light for the one loud colour.
    theme: { ground: '#0A1122', surface: '#101B33', ink: '#F4F7FB', accent: '#FFD27A', onAccent: '#0A1122', material: 'glass', corner: 'soft', face: 'serif', voice: 'chime' },
    focus: [0.46, 0.54],
    size: [360, 450],
    backdrop: '#101B33',
    // The boxes are those the generator writes (copied by hand from what it prints; a mismatch shows as stretched art).
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-6, -6, 372, 60], depth: 0.03 },
        { id: 'house', art: 'house.svg', box: [-6, -4, 372, 384], depth: 0.12 },
        { id: 'spill', art: 'spill.svg', box: [54, 131, 224, 224], start: { opacity: 0, sx: 0.6, sy: 0.6 }, depth: 0.12 },
        { id: 'room', art: 'room.svg', box: [114, 180, 104, 126], start: { opacity: 0 }, depth: 0.12 },
        { id: 'glow', art: 'glow.svg', box: [114, 180, 104, 126], start: { opacity: 0, sx: 0.5, sy: 0.5 }, depth: 0.12 },
        { id: 'lights-a', art: 'lights-a.svg', box: [127, 223, 44, 58], start: { opacity: 0 }, depth: 0.12 },
        { id: 'lights-b', art: 'lights-b.svg', box: [139, 213, 44, 74], start: { opacity: 0 }, depth: 0.12 },
        { id: 'lights-c', art: 'lights-c.svg', box: [133, 231, 36, 60], start: { opacity: 0 }, depth: 0.12 },
        { id: 'glint', art: 'glint.svg', box: [138, 194, 28, 28], start: { opacity: 0, sx: 0, sy: 0, turn: 45 }, depth: 0.12 },
        // Each leaf turns about its outer hinge: the closed face about the window's outer edge, the open face about the same line.
        { id: 'open-l', art: 'open-l.svg', box: [62, 180, 52, 126], origin: [1, 0.5], start: { sx: 0 }, depth: 0.12 },
        { id: 'open-r', art: 'open-r.svg', box: [218, 180, 52, 126], origin: [0, 0.5], start: { sx: 0 }, depth: 0.12 },
        { id: 'closed-l', art: 'closed-l.svg', box: [114, 180, 52, 126], origin: [0, 0.5], depth: 0.12 },
        { id: 'closed-r', art: 'closed-r.svg', box: [166, 180, 52, 126], origin: [1, 0.5], depth: 0.12 },
        { id: 'seam', art: 'seam.svg', box: [157, 180, 18, 126], start: { opacity: 0.8 }, depth: 0.12 },
        { id: 'sill', art: 'sill.svg', box: [100, 300, 132, 12], depth: 0.12 },
        { id: 'drift-back', art: 'drift-back.svg', box: [-6, 354, 372, 102], depth: 0.2 },
        { id: 'drift-front', art: 'drift-front.svg', box: [-6, 392, 372, 64], depth: 0.34 },
        // The light on the snow grows from the foot of the wall toward us.
        { id: 'wedge', art: 'wedge.svg', box: [4, 352, 296, 104], origin: [0.55, 0], start: { opacity: 0, sy: 0.1 }, depth: 0.2 },
        { id: 'lamp-halo', art: 'lamp-halo.svg', box: [-25, 180, 132, 132], depth: 0.34 },
        { id: 'lamp', art: 'lamp.svg', box: [23, 212, 37, 226], depth: 0.34 },
        { id: 'branches', art: 'branches.svg', box: [185, -6, 181, 462], origin: [1, 1], depth: 0.5 },
        { id: 'snow-a', art: 'snow-a.svg', box: [0, 0, 360, 250], start: { opacity: 0.78 }, depth: 0.42 },
        { id: 'snow-b', art: 'snow-b.svg', box: [0, 70, 360, 300], start: { opacity: 0.78 }, depth: 0.6 },
        { id: 'fleck', art: 'fleck.svg', box: [162, 306, 8, 8] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1700,
    // A music box: four bell notes, one for the latch, one as the leaves part, one for the bloom, and home, held.
    sound: {
        v: 1,
        inst: 'bell',
        tonic: 72,
        score: scaled(0.79, tune(150, 'G5/4 E5/4 A5/4 | C6/1')),
    },
};
