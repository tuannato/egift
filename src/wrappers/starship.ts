import type { IdleStep, LayerDef, NoteDef, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Starship — a cargo ship leaving its dock, for a big send-off. A painted
 * cel: flat fills, one hard shadow per form, a few white slashes, no outline
 * on large forms. An off-white hull that thickens toward a rounded nose, with
 * one engine bell, an orange stern and a cargo keel, lies in an
 * orbital dock, held by two clamps from the gantry overhead and resting on a
 * truss, in front of the limb of a very large teal planet. Opening: the
 * dock's lamps come on, the clamps let go, the engine lights, the ship glides
 * forward while the dock falls behind, and the cargo door on its keel slides
 * apart on a bay full of warm light.
 *
 * The stage cannot parent one layer to another: everything that rides on the
 * ship (door halves, engine light, streaks, the bay's light) is given the
 * ship's own glide, and the door halves add their slide to it. The glide is
 * written as two halves (ease in, ease out) so that a door half can follow
 * the first half exactly and begin its own move in the second.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/starship.gen.mjs): each SVG's viewBox is its box. The boxes
 * below are the ones the generator prints.
 */

/** Depths: the ship and what holds it, the truss a little nearer, the pier nearest. */
const SHIP = 0.4;
const TRUSS = 0.46;
const PIER = 0.62;

const layers: LayerDef[] = [
    { id: 'stars-a', art: 'stars-a.svg', box: [0, 0, 360, 330], depth: 0.03 },
    { id: 'stars-b', art: 'stars-b.svg', box: [0, 40, 360, 170], start: { opacity: 0.7 }, depth: 0.07 },
    { id: 'planet', art: 'planet.svg', box: [-8, 188, 376, 270], depth: 0.14 },
    // The lines of speed: drawn at full length, grown from their forward end.
    { id: 'streak', art: 'streak.svg', box: [-8, 142, 300, 144], origin: [1, 0.5], start: { opacity: 0, sx: 0.12 }, depth: SHIP },
    // The plume and its hot core each grow from the mouth of the engine bell.
    { id: 'glow-a', art: 'glow-a.svg', box: [-108, 175, 118, 46], origin: [114 / 118, 0.5], start: { opacity: 0, sx: 0.05, sy: 0.5 }, depth: SHIP },
    { id: 'glow-b', art: 'glow-b.svg', box: [-66, 184, 76, 28], origin: [72 / 76, 0.5], start: { opacity: 0, sx: 0.05, sy: 0.5 }, depth: SHIP },
    { id: 'hull', art: 'hull.svg', box: [2, 167, 306, 96], depth: SHIP },
    { id: 'door-l', art: 'door-l.svg', box: [116, 215, 46, 34], depth: SHIP },
    { id: 'door-r', art: 'door-r.svg', box: [162, 215, 46, 34], depth: SHIP },
    { id: 'clamp-l', art: 'clamp-l.svg', box: [100, 146, 48, 50], origin: [0.5, 0], depth: SHIP },
    { id: 'clamp-r', art: 'clamp-r.svg', box: [190, 146, 48, 50], origin: [0.5, 0], depth: SHIP },
    // Over the clamps: they draw back up behind their housings.
    { id: 'gantry', art: 'gantry.svg', box: [-8, -8, 452, 164], depth: SHIP },
    { id: 'lights-1', art: 'lights-1.svg', box: [101, 35, 32, 115], start: { opacity: 0.65 }, depth: SHIP },
    { id: 'lights-2', art: 'lights-2.svg', box: [205, 31, 35, 115], start: { opacity: 0.3 }, depth: SHIP },
    { id: 'truss', art: 'truss.svg', box: [-8, 256, 344, 72], depth: TRUSS },
    { id: 'lights-3', art: 'lights-3.svg', box: [5, 270, 310, 24], start: { opacity: 0.4 }, depth: TRUSS },
    { id: 'fore', art: 'fore.svg', box: [148, 334, 222, 126], depth: PIER },
    { id: 'lights-4', art: 'lights-4.svg', box: [221, 333, 134, 83], start: { opacity: 0.7 }, depth: PIER },
    { id: 'bay-glow', art: 'bay-glow.svg', box: [12, 114, 300, 236], start: { opacity: 0, sx: 0.15, sy: 0.15 }, depth: SHIP },
    { id: 'fleck', art: 'fleck.svg', box: [159, 229, 6, 6], depth: SHIP },
];

// Beat times (ms).
const LAMPS = 0;
const CLAMPS = 300;
const ENGINES = 700;
const GLIDE = 1300;
const GLIDE_MID = 1680;
const GLIDE_END = 2060;
const DOOR_END = 2600;

/** How far the ship glides, and how far each part of the dock falls behind (the nearer, the further). */
const AHEAD = 40;
const GANTRY_BACK = -78;
const TRUSS_BACK = -112;
const PIER_BACK = -150;
/** A door half first unseals by this much, then slides to its full travel. */
const CRACK = 8;
const TRAVEL = 36;

/** What rides on the ship without a move of its own. */
const RIDERS = ['hull', 'glow-a', 'glow-b', 'streak', 'bay-glow', 'fleck'] as const;
/** What the engines' start shakes. */
const SHAKEN = ['hull', 'door-l', 'door-r'] as const;

/** The ship's glide: half the way easing in, the rest easing out. */
const glide = (layer: string, extraMid = 0): Step[] => [
    { kind: 'move', layer, at: GLIDE, dur: GLIDE_MID - GLIDE, ease: 'in', to: { x: AHEAD / 2 } },
    { kind: 'move', layer, at: GLIDE_MID, dur: GLIDE_END - GLIDE_MID, ease: 'out', to: { x: AHEAD + extraMid } },
];
/** A part of the dock falling behind. */
const behind = (ids: readonly string[], x: number, y = 0): Step[] => ids.map((layer): Step => ({ kind: 'move', layer, at: GLIDE - 40, dur: 900, ease: 'inout', to: { x, y } }));

const open: Step[] = [
    // 1. The dock's lamps step on, group after group.
    ...(['lights-3', 'lights-1', 'lights-2', 'lights-4'] as const).map((layer, i): Step => ({ kind: 'move', layer, at: LAMPS + i * 90, dur: 150, ease: 'out', to: { opacity: 1 } })),
    // 2. The clamps let go: a short jolt, then each telescopes up behind its housing.
    { kind: 'shake', layer: 'clamp-l', at: CLAMPS, dur: 150, amp: 1.3, times: 2 },
    { kind: 'shake', layer: 'clamp-r', at: CLAMPS + 80, dur: 150, amp: 1.3, times: 2 },
    { kind: 'move', layer: 'clamp-l', at: CLAMPS + 120, dur: 380, ease: 'inout', to: { x: -2, y: -22, sy: 0.5 } },
    { kind: 'move', layer: 'clamp-r', at: CLAMPS + 200, dur: 380, ease: 'inout', to: { x: 2, y: -22, sy: 0.5 } },
    // 3. The engine lights, the plume and then its core; the hull trembles.
    { kind: 'move', layer: 'glow-a', at: ENGINES, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'glow-a', at: ENGINES, dur: 520, ease: 'out', to: { sx: 0.8, sy: 1 } },
    { kind: 'move', layer: 'glow-b', at: ENGINES + 140, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'glow-b', at: ENGINES + 140, dur: 520, ease: 'out', to: { sx: 0.8, sy: 1 } },
    ...SHAKEN.map((layer): Step => ({ kind: 'shake', layer, at: ENGINES + 80, dur: 460, amp: 1.5, times: 4 })),
    // 4. The ship glides forward a short way and stays in the frame; the plumes lengthen, the lines of
    //    speed grow behind it, and the dock falls away the other way.
    ...RIDERS.flatMap(layer => glide(layer)),
    { kind: 'move', layer: 'glow-a', at: GLIDE, dur: 500, ease: 'inout', to: { sx: 1 } },
    { kind: 'move', layer: 'glow-b', at: GLIDE, dur: 500, ease: 'inout', to: { sx: 1 } },
    { kind: 'move', layer: 'streak', at: GLIDE, dur: 200, to: { opacity: 0.9 } },
    { kind: 'move', layer: 'streak', at: GLIDE, dur: 800, ease: 'inout', to: { sx: 1 } },
    { kind: 'move', layer: 'streak', at: 2200, dur: 600, ease: 'inout', to: { opacity: 0.55 } },
    ...behind(['gantry', 'lights-1', 'lights-2'], GANTRY_BACK),
    { kind: 'move', layer: 'clamp-l', at: GLIDE - 40, dur: 900, ease: 'inout', to: { x: GANTRY_BACK - 2 } },
    { kind: 'move', layer: 'clamp-r', at: GLIDE - 40, dur: 900, ease: 'inout', to: { x: GANTRY_BACK + 2 } },
    ...behind(['truss', 'lights-3'], TRUSS_BACK, 10),
    ...behind(['fore', 'lights-4'], PIER_BACK, 16),
    // 5. The cargo door: its halves ride with the hull, unseal, then slide apart along it on the lit bay.
    ...glide('door-l', -CRACK),
    ...glide('door-r', CRACK),
    { kind: 'move', layer: 'door-l', at: GLIDE_END, dur: DOOR_END - GLIDE_END, ease: 'inout', to: { x: AHEAD - TRAVEL } },
    { kind: 'move', layer: 'door-r', at: GLIDE_END, dur: DOOR_END - GLIDE_END, ease: 'inout', to: { x: AHEAD + TRAVEL } },
    { kind: 'move', layer: 'bay-glow', at: GLIDE_MID + 60, dur: 1000, ease: 'out', to: { opacity: 0.9, sx: 1, sy: 1 } },
    { kind: 'scatter', layer: 'fleck', at: GLIDE_END + 60, dur: 740, count: 14, spread: 110, fall: 26 },
];

const sky: IdleStep[] = [
    { layer: 'stars-b', field: 'opacity', amp: 0.28, period: 5200 },
    { layer: 'stars-a', field: 'x', amp: 1.2, period: 12000 },
];

const idle: IdleStep[] = [
    ...sky,
    // The ship drifts in its clamps.
    ...SHAKEN.flatMap((layer): IdleStep[] => [
        { layer, field: 'x', amp: 1.2, period: 6800 },
        { layer, field: 'y', amp: 0.8, period: 5000, phase: 0.2 },
    ]),
    // The dock's lamps breathe, each group in its own time.
    { layer: 'lights-1', field: 'opacity', amp: 0.3, period: 3200 },
    { layer: 'lights-2', field: 'opacity', amp: 0.25, period: 4100, phase: 0.4 },
    { layer: 'lights-3', field: 'opacity', amp: 0.3, period: 3700, phase: 0.7 },
    { layer: 'lights-4', field: 'opacity', amp: 0.3, period: 2900, phase: 0.25 },
];

const afterglow: IdleStep[] = [
    ...sky,
    // The ship bobs, and everything on it with it.
    ...([...RIDERS, 'door-l', 'door-r'] as const).map((layer): IdleStep => ({ layer, field: 'y', amp: 1, period: 5400 })),
    // The bay's light breathes; the plume and its core breathe against each other.
    { layer: 'bay-glow', field: 'opacity', amp: 0.1, period: 3800 },
    { layer: 'bay-glow', field: 'sx', amp: 0.035, period: 3800 },
    { layer: 'bay-glow', field: 'sy', amp: 0.035, period: 3800 },
    { layer: 'glow-a', field: 'sx', amp: 0.09, period: 2600 },
    { layer: 'glow-b', field: 'sx', amp: 0.09, period: 2600, phase: 0.5 },
    { layer: 'streak', field: 'opacity', amp: 0.15, period: 4400 },
    { layer: 'lights-3', field: 'opacity', amp: 0.2, period: 3700 },
    { layer: 'lights-4', field: 'opacity', amp: 0.2, period: 2900, phase: 0.4 },
];

/** A low swell, a servo glide under a rising phrase, a bell as the bay opens, and a chord held to the end. */
const score: NoteDef[] = scaled(0.36, together(
    tune(160, 'G2/1 | [G2 D3]/1 | ~/2', { inst: 'pad', gain: 0.42 }),
    [
        { at: CLAMPS + 120, pitch: 43, dur: 80, gain: 0.5, inst: 'wood' },
        { at: CLAMPS + 200, pitch: 41, dur: 80, gain: 0.45, inst: 'wood' },
        { at: ENGINES, pitch: 48, dur: 1250, gain: 0.24, inst: 'glassy', bend: 7 },
    ],
    tune(200, 'G4/8 B4/8 D5/8 G5/8 A5/8 B5/8 | [D6 B5 G5]/1', { start: 1150, inst: 'tine', gain: 0.5 }),
    tune(200, 'G6/2', { start: GLIDE_END, inst: 'bell', gain: 0.6 }),
));

export const starship: WrapperDef = {
    id: 'starship',
    name: { vi: 'Phi thuyền', en: 'Starship' },
    ambient: ['#0D1226', '#1F8A8A', '#F2762E', '#FFC857'],
    blurb: {
        vi: 'Tàu chở hàng rời bến quỹ đạo. Đèn bật, kẹp nhả, động cơ sáng; tàu lướt đi và cửa khoang trượt mở, ánh vàng ấm tràn ra.',
        en: 'A cargo ship leaves its orbital dock. Lamps on, clamps off, engine lit; it glides out and the bay door slides open on warm light.',
    },
    // The dock's slate for the card, the hull's off-white for the words, the stripe's orange for the one loud colour.
    theme: { ground: '#0D1226', surface: '#2A3350', ink: '#ECE8DF', accent: '#F2762E', onAccent: '#0D1226', material: 'lacquer', corner: 'soft', face: 'tech', voice: 'servo' },
    focus: [0.56, 0.51],
    size: [360, 450],
    backdrop: '#0D1226',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 2100,
    sound: { v: 1, inst: 'tine', tonic: 67, score },
};
