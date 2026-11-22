import type { Ease, IdleStep, LayerDef, Pose, Step, WrapperDef } from '../stage/format';

/**
 * Drone drop — a surprise delivered from far away. A balcony at dusk seen
 * straight on: a glass rail, a small round table, a planter and a tall plant,
 * a string of bulbs across the corner, and past the rail a skyline under long
 * flat clouds. A delivery drone hovers over the table, a little way off, a parcel
 * hanging under it on two short lines. Opening: the drone comes down on a
 * curve, growing a little as it nears, the parcel swinging; the parcel lands on the
 * table; the lines draw back; the drone banks and climbs away out of the
 * frame; the bow falls open, the lid lifts off and comes to rest leaning on
 * the side of the box, a low warm glow sits over the open rim and the bulbs
 * come on.
 *
 * The stage moves whole layers, each about its own pivot. The drone is seven
 * layers (body, four rotor discs, the lines, the parcel) that must move as
 * one thing about one point, G, the middle of the rotor plane. The body, the
 * lines and the hanging parcel have G as their pivot; each rotor disc pivots
 * on its own centre (so that it can breathe in width), and `flight` gives it
 * the offset that keeps it on its motor.
 *
 * The parcel that hangs is one picture; the parcel on the table is four (box,
 * lid, two loops of the bow) drawn in exactly the same place, and they change
 * over at the moment of landing.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/drone.gen.mjs): each SVG's viewBox is its box.
 */

/** The drone's pivot where it is drawn: over the table, at full size. */
const G = [168, 146] as const;
/** Each rotor disc: its layer and how far its centre is from G along the rotor plane. */
const ROTORS = [['rotor-1', -84], ['rotor-2', -45], ['rotor-3', 45], ['rotor-4', 84]] as const;
/** The layers whose pivot is G itself. */
const RIGID = ['drone', 'lines', 'hang'] as const;

/** Where the drone is: its pivot on the canvas, its size, its bank in degrees. */
interface Flight {
    readonly gx: number;
    readonly gy: number;
    readonly s: number;
    readonly bank: number;
}
const rad = (deg: number): number => (deg * Math.PI) / 180;
const r2 = (n: number): number => Math.round(n * 100) / 100;
/** The pose that puts a layer `dx` along the rotor plane from G where the flight has it. */
function flight(f: Flight, dx = 0): Pose {
    return { x: r2(f.gx - G[0] + dx * (f.s * Math.cos(rad(f.bank)) - 1)), y: r2(f.gy - G[1] + dx * f.s * Math.sin(rad(f.bank))), turn: f.bank, sx: f.s, sy: f.s, opacity: 1 };
}

/** Hovering, a little way off: over the table, high in the frame. */
const HOVER: Flight = { gx: 196, gy: 80, s: 0.8, bank: 0 };
/** Over the table, the parcel just touching it. */
const DOWN: Flight = { gx: G[0], gy: G[1], s: 1, bank: 0 };
/** Free of the parcel: banked, a little higher. */
const BANKED: Flight = { gx: 172, gy: 134, s: 1, bank: 11 };
/** Gone: up and out to the right. */
const AWAY: Flight = { gx: 452, gy: -96, s: 0.62, bank: 11 };

/** The moment the parcel touches the table. */
const LAND = 1150;

/** The whole drone goes from where it is to `to`. Sideways and in size with one ease, down with another: a curve. */
function fly(at: number, dur: number, to: Flight, across: Ease, down: Ease, layers: readonly string[] = RIGID): Step[] {
    const out: Step[] = [];
    const one = (layer: string, p: Pose): void => {
        out.push({ kind: 'move', layer, at, dur, ease: across, to: { x: p.x, sx: p.sx, sy: p.sy, turn: p.turn } });
        out.push({ kind: 'move', layer, at, dur, ease: down, to: { y: p.y } });
    };
    for (const layer of layers) one(layer, flight(to));
    for (const [layer, dx] of ROTORS) one(layer, flight(to, dx));
    return out;
}

/**
 * The lid comes off in three moves and ends leaning against the left side of the box, one edge on the table.
 * The bow lies on it: each loop pivots on the knot, 13 units above the lid's own pivot, so it is given where
 * the lid's turn carries the knot.
 */
const LID_PATH = [
    { at: 1960, dur: 300, ease: 'out', x: -14, y: -42, turn: -14 },
    { at: 2260, dur: 200, ease: 'in', x: -42, y: -20, turn: -48 },
    { at: 2460, dur: 240, ease: 'out', x: -59.4, y: 17.3, turn: -78 },
] as const;
const knot = (l: { x: number; y: number; turn: number }): { x: number; y: number } => ({ x: r2(l.x + 13 * Math.sin(rad(l.turn))), y: r2(l.y + 13 - 13 * Math.cos(rad(l.turn))) });
/** How far each loop of the bow falls outward, in degrees. */
const FALL = 52;

const TABLE_SET = ['table', 'box', 'lid', 'bow-l', 'bow-r', 'lines'] as const;

const open: Step[] = [
    // 1. The drone comes down on a curve toward the table, growing a little as it nears; the parcel swings under it.
    ...fly(0, LAND, DOWN, 'out', 'inout'),
    ...(['lines', 'hang'] as const).flatMap((layer): Step[] => [
        { kind: 'move', layer, at: 0, dur: 330, ease: 'inout', to: { turn: 5 } },
        { kind: 'move', layer, at: 330, dur: 380, ease: 'inout', to: { turn: -4 } },
        { kind: 'move', layer, at: 710, dur: 280, ease: 'inout', to: { turn: 2 } },
        { kind: 'move', layer, at: 990, dur: 160, ease: 'inout', to: { turn: 0 } },
    ]),
    // 2. The parcel lands: the pieces on the table take over from the one that hung; the table shakes, two low puffs of dust spread along its top.
    ...(['box', 'lid', 'bow-l', 'bow-r'] as const).map((layer): Step => ({ kind: 'move', layer, at: LAND - 20, dur: 20, to: { opacity: 1 } })),
    { kind: 'move', layer: 'hang', at: LAND, dur: 20, to: { opacity: 0 } },
    ...TABLE_SET.map((layer): Step => ({ kind: 'shake', layer, at: LAND, dur: 340, amp: 2.2, times: 3 })),
    { kind: 'move', layer: 'dust', at: LAND, dur: 160, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'dust', at: LAND + 160, dur: 420, ease: 'out', to: { opacity: 0, sx: 1.22, sy: 1.5 } },
    // 3. The lines draw back into the drone.
    { kind: 'move', layer: 'lines', at: 1300, dur: 240, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'lines', at: 1530, dur: 20, to: { opacity: 0 } },
    // 4. The drone banks, then climbs away up and out to the right, small again.
    ...fly(1500, 230, BANKED, 'inout', 'inout', ['drone']),
    ...fly(1730, 520, AWAY, 'in', 'in', ['drone']),
    // 5. The bow falls open: its two loops turn outward and lie on the lid.
    { kind: 'move', layer: 'bow-l', at: 1700, dur: 380, ease: 'bounce', to: { turn: -FALL } },
    { kind: 'move', layer: 'bow-r', at: 1760, dur: 380, ease: 'bounce', to: { turn: FALL } },
    // 6. The lid lifts, tips over and comes to rest leaning on the side of the box, the bow with it; a low
    //    glow rises over the open rim.
    ...LID_PATH.flatMap(({ at, dur, ease, ...l }): Step[] => [
        { kind: 'move', layer: 'lid', at, dur, ease, to: l },
        { kind: 'move', layer: 'bow-l', at, dur, ease, to: { ...knot(l), turn: -FALL + l.turn } },
        { kind: 'move', layer: 'bow-r', at, dur, ease, to: { ...knot(l), turn: FALL + l.turn } },
    ]),
    { kind: 'move', layer: 'glow', at: 2000, dur: 700, ease: 'out', to: { opacity: 0.86, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'motes', at: 2250, dur: 550, ease: 'out', to: { opacity: 0.9, y: 0 } },
    // 7. The string of bulbs comes on, one set after the other.
    { kind: 'move', layer: 'lights-a', at: 2200, dur: 360, ease: 'out', to: { opacity: 0.86 } },
    { kind: 'move', layer: 'lights-b', at: 2400, dur: 400, ease: 'out', to: { opacity: 0.86 } },
];

/** The evening goes on: the clouds drift against each other. */
const air: IdleStep[] = [
    { layer: 'clouds-far', field: 'x', amp: 7, period: 11000 },
    { layer: 'clouds-near', field: 'x', amp: 11, period: 9000, phase: 0.4 },
];

/** How far the hovering drone banks to and fro, in degrees. */
const TILT = 1.4;
const idle: IdleStep[] = [
    ...air,
    { layer: 'window', field: 'opacity', amp: 0.3, period: 3800 },
    // The drone bobs, all of it together.
    ...[...RIGID, ...ROTORS.map(r => r[0])].map((layer): IdleStep => ({ layer, field: 'y', amp: 4, period: 4200 })),
    // It banks a hair: the body about G, each disc about itself and carried up or down by its arm.
    { layer: 'drone', field: 'turn', amp: TILT, period: 6400, phase: 0.2 },
    ...ROTORS.flatMap(([layer, dx], i): IdleStep[] => [
        { layer, field: 'turn', amp: TILT, period: 6400, phase: 0.2 },
        { layer, field: 'y', amp: r2(dx * HOVER.s * Math.sin(rad(TILT))), period: 6400, phase: 0.2 },
        // The discs breathe in width, each in its own time.
        { layer, field: 'sx', amp: 0.07, period: 1400 + i * 130, phase: i * 0.27 },
    ]),
    // The parcel swings a little on its lines.
    { layer: 'hang', field: 'turn', amp: 2.2, period: 3400 },
    { layer: 'lines', field: 'turn', amp: 2.2, period: 3400 },
];

const afterglow: IdleStep[] = [
    ...air,
    { layer: 'window', field: 'opacity', amp: 0.3, period: 3800 },
    // The glow over the box breathes; the motes ride it. The lid lies still.
    { layer: 'glow', field: 'opacity', amp: 0.12, period: 3600 },
    { layer: 'glow', field: 'sy', amp: 0.05, period: 3600, phase: 0.1 },
    { layer: 'motes', field: 'y', amp: 3, period: 5000, phase: 0.2 },
    { layer: 'motes', field: 'opacity', amp: 0.1, period: 3000, phase: 0.6 },
    // The two sets of bulbs breathe against each other.
    { layer: 'lights-a', field: 'opacity', amp: 0.14, period: 3200 },
    { layer: 'lights-b', field: 'opacity', amp: 0.14, period: 3200, phase: 0.5 },
];

/** A part of the drone as it hovers before the opening. */
const hover = (dx = 0): Partial<Pose> => {
    const p = flight(HOVER, dx);
    return { x: p.x, y: p.y, sx: p.sx, sy: p.sy };
};
/** Everything on the balcony that the parcel touches is one plane; so is everything of the drone. */
const NEAR = 0.4;
const rotor = (id: string, dx: number, box: LayerDef['box']): LayerDef => ({ id, art: `${id}.svg`, box, start: hover(dx), depth: NEAR });

export const drone: WrapperDef = {
    id: 'drone',
    name: { vi: 'Drone giao quà', en: 'Drone drop' },
    ambient: ['#5B4B8A', '#F6B08A', '#E4572E'],
    blurb: {
        vi: 'Ban công lúc chạng vạng. Drone hạ xuống, đặt gói quà lên bàn rồi bay đi; nơ bung ra, nắp hộp mở và ánh sáng ấm tỏa lên.',
        en: 'A balcony at dusk. The drone glides down, sets the parcel on the table and climbs away; the bow falls open and the box lights up.',
    },
    // The near towers' violet for the surface, the drone's off-white for the words, the window light for the one loud colour.
    theme: { ground: '#2A2038', surface: '#4A3F6B', ink: '#F2F0EA', accent: '#FFD98A', onAccent: '#2A2038', material: 'lacquer', corner: 'soft', face: 'grotesk', voice: 'servo' },
    focus: [0.47, 0.56],
    size: [360, 450],
    backdrop: '#5B4B8A',
    // The boxes are those the generator prints (copied by hand; a mismatch shows as stretched art).
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-6, -6, 372, 316], depth: 0.03 },
        { id: 'clouds-far', art: 'clouds-far.svg', box: [-40, 138, 440, 66], depth: 0.05 },
        { id: 'clouds-near', art: 'clouds-near.svg', box: [-40, 74, 440, 56], depth: 0.08 },
        { id: 'city', art: 'city.svg', box: [-6, 112, 372, 284], depth: 0.12 },
        { id: 'window', art: 'window.svg', box: [279, 220, 18, 25], start: { opacity: 0.7 }, depth: 0.12 },
        { id: 'balcony', art: 'balcony.svg', box: [-6, 212, 372, 244], depth: 0.3 },
        { id: 'string', art: 'string.svg', box: [-6, -6, 184, 136], depth: 0.3 },
        { id: 'lights-a', art: 'lights-a.svg', box: [-6, -6, 184, 136], start: { opacity: 0 }, depth: 0.3 },
        { id: 'lights-b', art: 'lights-b.svg', box: [-6, -6, 184, 136], start: { opacity: 0 }, depth: 0.3 },
        // The dust of the landing: two low puffs along the table top, growing outward from under the box.
        { id: 'dust', art: 'dust.svg', box: [86, 288, 164, 12], origin: [0.5, 1], start: { opacity: 0, sx: 0.7, sy: 0.5 }, depth: NEAR },
        { id: 'table', art: 'table.svg', box: [80, 298, 176, 122], depth: NEAR },
        // The glow pivots on the mouth of the box and grows out of it.
        { id: 'glow', art: 'glow.svg', box: [84, 164, 168, 140], origin: [0.5, 72 / 140], start: { opacity: 0, sx: 0.5, sy: 0.3 }, depth: NEAR },
        { id: 'lines', art: 'lines.svg', box: [128, 140, 80, 82], origin: [0.5, 6 / 82], start: hover(), depth: NEAR },
        { id: 'hang', art: 'hang.svg', box: [110, 140, 116, 162], origin: [0.5, 6 / 162], start: hover(), depth: NEAR },
        { id: 'box', art: 'box.svg', box: [118, 232, 100, 70], start: { opacity: 0 }, depth: NEAR },
        { id: 'lid', art: 'lid.svg', box: [110, 206, 116, 32], origin: [0.5, 21 / 32], start: { opacity: 0 }, depth: NEAR },
        // Each loop of the bow turns about the knot.
        { id: 'bow-l', art: 'bow-l.svg', box: [130, 176, 42, 44], origin: [38 / 42, 38 / 44], start: { opacity: 0 }, depth: NEAR },
        { id: 'bow-r', art: 'bow-r.svg', box: [164, 176, 42, 44], origin: [4 / 42, 38 / 44], start: { opacity: 0 }, depth: NEAR },
        { id: 'drone', art: 'drone.svg', box: [50, 134, 236, 66], origin: [0.5, 12 / 66], start: hover(), depth: NEAR },
        rotor('rotor-1', -84, [55, 140, 58, 12]),
        rotor('rotor-2', -45, [102, 140, 42, 12]),
        rotor('rotor-3', 45, [192, 140, 42, 12]),
        rotor('rotor-4', 84, [223, 140, 58, 12]),
        { id: 'motes', art: 'motes.svg', box: [136, 176, 66, 46], start: { opacity: 0, y: 16 }, depth: NEAR },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2100,
    // A soft servo glides down with the drone; a tap of wood as the parcel lands; a second glide as the drone
    // leaves; then four tines climbing to the reveal and one bell on the home note.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 69,
        score: [
            { at: 0, pitch: 81, dur: 1050, gain: 0.22, inst: 'glassy', bend: -9 },
            { at: 1150, pitch: 52, dur: 90, gain: 0.45, inst: 'wood' },
            { at: 1560, pitch: 72, dur: 520, gain: 0.15, inst: 'glassy', bend: 10 },
            { at: 1740, pitch: 76, dur: 120, gain: 0.38 },
            { at: 1860, pitch: 81, dur: 120, gain: 0.38 },
            { at: 1980, pitch: 85, dur: 120, gain: 0.41 },
            { at: 2100, pitch: 88, dur: 520, gain: 0.45 },
            { at: 2300, pitch: 81, dur: 1500, gain: 0.38, inst: 'bell' },
        ],
    },
};
