import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { together, tune } from './tune';

/**
 * Arch and moon — the Eid wrapper, drawn as glazed ceramic tile mosaic
 * (zellige / girih) with inlaid brass. Everything is a hand-cut tile lying in
 * grout: star-and-kite fields on the walls, ten-fold rosettes in the
 * spandrels, hexagons on the dado, running courses for sky, doors and paving,
 * rings of tiles round the crescent. Flat glaze only; the lamp-light pools
 * are the only soft things, and they are layers of their own.
 *
 * Closed: a pointed horseshoe gateway in a tiled wall at nightfall, its two
 * doors shut, studded with brass and held by a bolt across a star plate; a
 * thin crescent above, an unlit pierced lantern beside, steps and pots below.
 * Opening: the bolt lifts, the doors swing in, and the courtyard shows: a
 * fountain between orange trees, strings of lamps, a floor in perspective and
 * a lit arcade. Light spills over the steps, the lantern lights and throws
 * its piercings on the wall, and stars are let into the sky one by one.
 *
 * The doors swing as a narrowing about their hinges (sx); the wall's arch is
 * a hole in the portal layer above them, so the leaves are plain rectangles.
 * The art is generated in canvas coordinates (scripts/art/archmoon.gen.mjs).
 */

const SWING = 0.2;

const open: Step[] = [
    // 1. The seal: the bolt rattles, then lifts on its pivot.
    { kind: 'shake', layer: 'latch', at: 0, dur: 360, amp: 1.4, times: 3 },
    { kind: 'move', layer: 'latch', at: 340, dur: 520, ease: 'back', to: { turn: -84 } },
    // 2. The doors swing inward; the bolt goes with its leaf.
    { kind: 'move', layer: 'latch', at: 900, dur: 700, ease: 'in', to: { x: -30, sx: 0.4, opacity: 0 } },
    { kind: 'move', layer: 'door-l', at: 900, dur: 1700, ease: 'inout', to: { sx: SWING } },
    { kind: 'move', layer: 'door-r', at: 980, dur: 1700, ease: 'inout', to: { sx: SWING } },
    { kind: 'move', layer: 'door-shade-l', at: 900, dur: 1700, ease: 'inout', to: { sx: SWING, opacity: 0.62 } },
    { kind: 'move', layer: 'door-shade-r', at: 980, dur: 1700, ease: 'inout', to: { sx: SWING, opacity: 0.62 } },
    // 3. The courtyard's lamps come up; light spills over the threshold and the steps.
    { kind: 'move', layer: 'court-glow', at: 1300, dur: 1500, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'spill', at: 1500, dur: 1500, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'foot-lit', at: 1500, dur: 1500, ease: 'out', to: { opacity: 1 } },
    // 4. The hanging lantern lights and throws its piercings on the wall.
    { kind: 'move', layer: 'lantern-lit', at: 2900, dur: 500, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'lantern-glow', at: 2900, dur: 800, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'lantern-cast', at: 3050, dur: 900, ease: 'out', to: { opacity: 1 } },
    // 5. Stars are let into the sky, one group after another.
    { kind: 'move', layer: 'stars-a', at: 3400, dur: 700, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'stars-b', at: 4100, dur: 700, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'stars-c', at: 4800, dur: 700, ease: 'out', to: { opacity: 1 } },
];

const idle: IdleStep[] = [
    { layer: 'lantern', field: 'turn', amp: 1.3, period: 5600 },
    { layer: 'lantern-lit', field: 'turn', amp: 1.3, period: 5600 },
];

const afterglow: IdleStep[] = [
    { layer: 'lantern', field: 'turn', amp: 1.1, period: 5600 },
    { layer: 'lantern-lit', field: 'turn', amp: 1.1, period: 5600 },
    { layer: 'lantern-glow', field: 'opacity', amp: 0.1, period: 2900 },
    { layer: 'lantern-cast', field: 'opacity', amp: 0.1, period: 2900 },
    { layer: 'court-glow', field: 'opacity', amp: 0.13, period: 3700 },
    { layer: 'court-lamps', field: 'x', amp: 0.7, period: 6400 },
    { layer: 'spill', field: 'opacity', amp: 0.08, period: 3700 },
    { layer: 'stars-a', field: 'opacity', amp: 0.22, period: 3100 },
    { layer: 'stars-b', field: 'opacity', amp: 0.22, period: 4300, phase: 0.4 },
    { layer: 'stars-c', field: 'opacity', amp: 0.22, period: 3700, phase: 0.7 },
];

const COURT = [94, 150, 172, 240] as const;
const WALL = [-6, 120, 372, 336] as const;
const LANTERN = [22, 196, 60, 110] as const;
/** The lantern hangs from the bracket's hook. */
const HOOK: readonly [number, number] = [29 / 60, 10 / 110];
const star = (id: string): LayerDef => ({ id, art: `${id}.svg`, box: [0, 0, 360, 170], start: { opacity: 0 } });

export const archmoon: WrapperDef = {
    id: 'archmoon',
    name: { vi: 'Vòm và trăng', en: 'Arch and moon' },
    ambient: ['#12224F', '#2A98A0', '#F0A23A'],
    blurb: {
        vi: 'Khảm gạch men và đồng: cổng vòm đóng then dưới trăng lưỡi liềm. Then nhấc, cửa mở vào sân có đài nước, cây cam và dây đèn.',
        en: 'Glazed tile mosaic inlaid with brass: a bolted gateway under a crescent. The doors swing in on a lamp-strung courtyard and a fountain.',
    },
    // Night-blue glaze, cream ink, brass for the one loud colour.
    theme: { ground: '#070E22', surface: '#10264C', ink: '#F8F0DC', accent: '#E2B44C', onAccent: '#1C1304', material: 'lacquer', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.495],
    size: [360, 500],
    backdrop: '#0F1D4A',
    layers: [
        { id: 'sky', art: 'sky.svg', box: [0, 0, 360, 200] },
        star('stars-a'),
        star('stars-b'),
        star('stars-c'),
        { id: 'court-far', art: 'court-far.svg', box: COURT, depth: 0.06 },
        { id: 'court-mid', art: 'court-mid.svg', box: COURT, depth: 0.12 },
        { id: 'court-lamps', art: 'court-lamps.svg', box: COURT, depth: 0.18 },
        { id: 'court-glow', art: 'court-glow.svg', box: COURT, blend: 'screen', start: { opacity: 0 }, depth: 0.18 },
        { id: 'door-l', art: 'door-l.svg', box: [104, 150, 76, 236], origin: [2 / 76, 0.5], depth: 0.26 },
        { id: 'door-shade-l', art: 'door-shade-l.svg', box: [104, 150, 76, 236], origin: [2 / 76, 0.5], blend: 'multiply', start: { opacity: 0 }, depth: 0.26 },
        { id: 'door-r', art: 'door-r.svg', box: [180, 150, 76, 236], origin: [74 / 76, 0.5], depth: 0.26 },
        { id: 'door-shade-r', art: 'door-shade-r.svg', box: [180, 150, 76, 236], origin: [74 / 76, 0.5], blend: 'multiply', start: { opacity: 0 }, depth: 0.26 },
        { id: 'latch', art: 'latch.svg', box: [138, 266, 84, 60], origin: [16 / 84, 30 / 60], depth: 0.26 },
        { id: 'wall', art: 'wall.svg', box: WALL, depth: 0.26 },
        { id: 'trim', art: 'trim.svg', box: WALL, depth: 0.26 },
        { id: 'portal', art: 'portal.svg', box: [80, 118, 200, 268], depth: 0.26 },
        { id: 'foot', art: 'foot.svg', box: [-6, 330, 372, 202], depth: 0.26 },
        { id: 'foot-lit', art: 'foot-lit.svg', box: [-6, 330, 372, 202], start: { opacity: 0 }, depth: 0.26 },
        { id: 'spill', art: 'spill.svg', box: [20, 250, 320, 206], blend: 'screen', start: { opacity: 0 }, depth: 0.26 },
        { id: 'lantern-cast', art: 'lantern-cast.svg', box: WALL, start: { opacity: 0 }, depth: 0.26 },
        { id: 'lantern-glow', art: 'lantern-glow.svg', box: [-6, 186, 124, 136], start: { opacity: 0 }, depth: 0.28 },
        { id: 'lantern', art: 'lantern.svg', box: LANTERN, origin: HOOK, depth: 0.3 },
        { id: 'lantern-lit', art: 'lantern-lit.svg', box: LANTERN, origin: HOOK, start: { opacity: 0 }, depth: 0.3 },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2700,
    // A plain, calm line on a soft pipe, over a held tone.
    sound: {
        v: 1,
        inst: 'reed',
        tonic: 74,
        score: together(
            tune(132, 'A4/4 D5/4 E5/8 F5/8 G5/4 | A5/4. G5/8 D5/2!'),
            tune(132, 'D3/1 | D3/1', { inst: 'pad', gain: 0.5 }),
        ),
    },
};
