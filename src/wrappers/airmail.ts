import type { IdleStep, LayerDef, NoteDef, Pose, Step, WrapperDef } from '../stage/format';

/**
 * Airmail — money sent home, to or from someone far away. A brown-paper
 * parcel seen from straight above, lying a little askew on a cream desk mat
 * printed with dotted flight arcs: tied with string in a cross and a bow,
 * edged with red and blue airmail bars, blank stamps and their wavy
 * cancellations in one corner, a customs slip in another, scuffed corners.
 * Opening: the bow comes undone and the string draws back to the four sides;
 * the four flaps of paper open outward one after another, showing their
 * lighter inside; in the tissue lies a folded map, which unfolds, and a route
 * is dotted across it to a red point: home.
 *
 * The stage moves, turns and scales whole layers, so a flap opening is a
 * scale through zero about its outer edge with the inside face taking over.
 *
 * Canvas 360x450. The art is generated upright in canvas coordinates
 * (scripts/art/airmail.gen.mjs): each SVG's viewBox is its box. The boxes
 * below are copied by hand from what the generator prints.
 */

/** The parcel's tilt (degrees, clockwise) and the point it is tilted about: as in the generator. */
const TILT = -4;
const CX = 180, CY = 225;
/** The parcel and all that is in it move as one plane. */
const NEAR = 0.3;

type Box = readonly [number, number, number, number];
/**
 * A layer of the parcel: drawn upright, turned by `TILT` about its own pivot and shifted so that the
 * whole parcel reads as one thing turned about its centre.
 */
function part(id: string, box: Box, origin: readonly [number, number] = [0.5, 0.5], start: Partial<Pose> = {}): LayerDef {
    const ox = box[0] + origin[0] * box[2] - CX;
    const oy = box[1] + origin[1] * box[3] - CY;
    const a = (TILT * Math.PI) / 180;
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
        id,
        art: `${id}.svg`,
        box,
        origin,
        start: { turn: TILT, x: round(ox * Math.cos(a) - oy * Math.sin(a) - ox), y: round(ox * Math.sin(a) + oy * Math.cos(a) - oy), ...start },
        depth: NEAR,
    };
}

const STRINGS = ['str-t', 'str-b', 'str-l', 'str-r'] as const;
const ROUTE = ['route-1', 'route-2', 'route-3'] as const;

/** One flap opens: the outside folds away to its outer edge, the inside swings out from the same edge. */
const flap = (out: string, inn: string, axis: 'sx' | 'sy', at: number): Step[] => [
    { kind: 'move', layer: out, at, dur: 170, ease: 'in', to: { [axis]: 0 } },
    { kind: 'move', layer: inn, at: at + 170, dur: 260, ease: 'back', to: { [axis]: 1 } },
];

const open: Step[] = [
    // 1. The bow comes undone: the loops pull through, the two ends turn outward.
    { kind: 'move', layer: 'bow', at: 0, dur: 300, ease: 'in', to: { sx: 0.12, sy: 0.5 } },
    { kind: 'move', layer: 'bow', at: 240, dur: 100, to: { opacity: 0 } },
    { kind: 'move', layer: 'end-l', at: 0, dur: 340, ease: 'back', to: { turn: TILT + 78 } },
    { kind: 'move', layer: 'end-r', at: 0, dur: 340, ease: 'back', to: { turn: TILT - 78 } },
    { kind: 'move', layer: 'end-l', at: 320, dur: 200, to: { opacity: 0 } },
    { kind: 'move', layer: 'end-r', at: 320, dur: 200, to: { opacity: 0 } },
    // 2. The four runs of string draw back to the four sides.
    { kind: 'move', layer: 'str-t', at: 260, dur: 320, ease: 'inout', to: { sy: 0 } },
    { kind: 'move', layer: 'str-b', at: 260, dur: 320, ease: 'inout', to: { sy: 0 } },
    { kind: 'move', layer: 'str-l', at: 260, dur: 320, ease: 'inout', to: { sx: 0 } },
    { kind: 'move', layer: 'str-r', at: 260, dur: 320, ease: 'inout', to: { sx: 0 } },
    ...STRINGS.map((layer): Step => ({ kind: 'move', layer, at: 480, dur: 100, to: { opacity: 0 } })),
    // 3. The flaps, one after another and overlapping: top, bottom, then the two under them, left and right.
    ...flap('flap-t', 'flap-t-in', 'sy', 560),
    ...flap('flap-b', 'flap-b-in', 'sy', 700),
    ...flap('flap-l', 'flap-l-in', 'sx', 840),
    ...flap('flap-r', 'flap-r-in', 'sx', 980),
    { kind: 'scatter', layer: 'scrap', at: 620, dur: 900, count: 9, spread: 150, fall: 40 },
    { kind: 'scatter', layer: 'scrap', at: 1000, dur: 900, count: 9, spread: 170, fall: 50 },
    // 4. The map unfolds: a panel to the left, a panel to the right.
    { kind: 'move', layer: 'panel-l', at: 1300, dur: 300, ease: 'back', to: { sx: 1 } },
    { kind: 'move', layer: 'panel-r', at: 1420, dur: 300, ease: 'back', to: { sx: 1 } },
    // 5. The route, four dots at a time from the map's edge, and home.
    ...ROUTE.map((layer, i): Step => ({ kind: 'move', layer, at: 1720 + i * 130, dur: 140, ease: 'out', to: { opacity: 1 } })),
    { kind: 'move', layer: 'home', at: 2120, dur: 240, ease: 'back', to: { sx: 1, sy: 1 } },
];

const idle: IdleStep[] = [
    // The loose ends of the string sway.
    { layer: 'end-l', field: 'turn', amp: 4, period: 4200 },
    { layer: 'end-r', field: 'turn', amp: 3.2, period: 3600, phase: 0.4 },
];

const afterglow: IdleStep[] = [
    // The open flaps breathe; the map's panels sway a hair; home beats slowly.
    { layer: 'flap-t-in', field: 'sy', amp: 0.018, period: 5200 },
    { layer: 'flap-b-in', field: 'sy', amp: 0.018, period: 5200, phase: 0.5 },
    { layer: 'flap-l-in', field: 'sx', amp: 0.022, period: 4600, phase: 0.25 },
    { layer: 'flap-r-in', field: 'sx', amp: 0.022, period: 4600, phase: 0.75 },
    { layer: 'panel-l', field: 'sx', amp: 0.014, period: 3800 },
    { layer: 'panel-r', field: 'sx', amp: 0.014, period: 3800, phase: 0.5 },
    { layer: 'home', field: 'sx', amp: 0.07, period: 2800 },
    { layer: 'home', field: 'sy', amp: 0.07, period: 2800 },
];

/** When each flap starts to open: a wooden tap and a plucked note for each. */
const FLAPS = [560, 700, 840, 980];
/** The tune's level, set so its loudest moment sits between the quietest and the loudest of the house tunes. */
const LEVEL = 0.73;
const g = (n: number) => Math.round(n * LEVEL * 100) / 100;
const score: NoteDef[] = [
    // The bow: two notes.
    { at: 0, pitch: 71, dur: 200, gain: g(0.5) },
    { at: 260, pitch: 74, dur: 200, gain: g(0.5) },
    // The flaps: a tap each, and the phrase climbing.
    ...FLAPS.map((at): NoteDef => ({ at, pitch: 50, dur: 70, gain: g(0.36), inst: 'wood' })),
    ...FLAPS.map((at, i): NoteDef => ({ at, pitch: [67, 69, 71, 74][i]!, dur: 130, gain: g(0.5) })),
    // The map: two notes; then home, held.
    { at: 1300, pitch: 76, dur: 110, gain: g(0.5) },
    { at: 1420, pitch: 74, dur: 240, gain: g(0.5) },
    { at: 2120, pitch: 79, dur: 1500, gain: g(0.62) },
    { at: 2120, pitch: 67, dur: 1500, gain: g(0.34) },
];

export const airmail: WrapperDef = {
    id: 'airmail',
    name: { vi: 'Bưu kiện đường xa', en: 'Parcel from afar' },
    ambient: ['#18284E', '#B77F4A', '#FAF4E4'],
    blurb: {
        vi: 'Bưu kiện giấy nâu viền sọc đỏ xanh, dán tem, buộc dây. Tháo nơ, bốn mép giấy mở ra, tấm bản đồ trải rộng và đường chấm dẫn về nhà.',
        en: 'A string-tied brown parcel with airmail edges and stamps. The bow slips, four flaps open, a map unfolds and a dotted route runs home.',
    },
    // Ink blue as lacquer, the paper's white for the words, the paper's lighter kraft for the one loud colour.
    theme: { ground: '#0A1124', surface: '#18284E', ink: '#FAF4E4', accent: '#D9B080', onAccent: '#0A1124', material: 'lacquer', corner: 'soft', face: 'mono', voice: 'chime' },
    focus: [0.5, 0.5],
    size: [360, 450],
    backdrop: '#E9DAB8',
    layers: [
        { id: 'mat', art: 'mat.svg', box: [-6, -6, 372, 462], depth: 0.04 },
        part('base', [62, 77, 236, 296]),
        part('panel-l', [84, 157, 64, 136], [1, 0.5], { sx: 0 }),
        part('panel-r', [212, 157, 64, 136], [0, 0.5], { sx: 0 }),
        part('route-1', [91, 214, 40, 51], [0.5, 0.5], { opacity: 0 }),
        part('route-2', [132, 188, 44, 25], [0.5, 0.5], { opacity: 0 }),
        part('route-3', [179, 187, 47, 18], [0.5, 0.5], { opacity: 0 }),
        part('home', [225, 195, 34, 34], [0.5, 0.5], { sx: 0, sy: 0 }),
        part('flap-l-in', [-14, 77, 78, 296], [1, 0.5], { sx: 0 }),
        part('flap-r-in', [296, 77, 78, 296], [0, 0.5], { sx: 0 }),
        part('flap-l', [62, 77, 118, 296], [0, 0.5]),
        part('flap-r', [180, 77, 118, 296], [1, 0.5]),
        part('flap-t-in', [62, -14, 236, 93], [0.5, 1], { sy: 0 }),
        part('flap-b-in', [62, 371, 236, 93], [0.5, 0], { sy: 0 }),
        part('flap-t', [62, 77, 236, 148], [0.5, 0]),
        part('flap-b', [62, 225, 236, 148], [0.5, 1]),
        part('str-t', [175, 77, 10, 148], [0.5, 0]),
        part('str-b', [175, 225, 10, 148], [0.5, 1]),
        part('str-l', [62, 220, 118, 10], [0, 0.5]),
        part('str-r', [180, 220, 118, 10], [1, 0.5]),
        // The loose ends turn about the knot.
        part('end-l', [142, 221, 44, 72], [38 / 44, 4 / 72]),
        part('end-r', [174, 221, 44, 72], [6 / 44, 4 / 72]),
        part('bow', [124, 193, 112, 42], [0.5, 32 / 42]),
        { id: 'scrap', art: 'scrap.svg', box: [175, 220, 10, 10] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1560,
    // Soft wooden taps as the flaps fall open, a plucked phrase climbing over them, and home held last.
    sound: { v: 1, inst: 'pluck', tonic: 67, score },
};
