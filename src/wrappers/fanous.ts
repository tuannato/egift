import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Fanous — the Ramadan lantern. An old street at blue hour seen straight on:
 * plain plastered walls, wooden window screens of squares and octagons, lit
 * doorways and shops at street level, strings of small flags overhead, and in
 * the middle a large hanging lantern of brass and coloured glass, unlit,
 * against the lighter evening sky. Opening: the lantern stirs on its chain,
 * its glass catches and lights; a halo grows round it, a little gold dust
 * falls, and its light throws eight-point rosettes and hexagon tiling, in the
 * colours of the glass, across the walls on both sides.
 *
 * The stage moves whole layers, so the lit glass is a second picture of the
 * panes over the unlit lantern, in the same box and about the same pivot (the
 * top of the chain), so the two sway as one. The patterns on the walls grow
 * out from the lantern's side of each wall.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/fanous.gen.mjs): each SVG's viewBox is its box.
 */

/** The lantern's box and its pivot, the top of the chain: shared by the unlit lantern and its lit glass. */
const LANTERN = [114, 16, 132, 288] as const;
const PIVOT = [0.5, 4 / 288] as const;
const SWAYING = ['lantern', 'glass-lit'] as const;

const open: Step[] = [
    // 1. The lantern stirs on its chain.
    ...SWAYING.flatMap((layer): Step[] => [
        { kind: 'move', layer, at: 0, dur: 380, ease: 'inout', to: { turn: 3 } },
        { kind: 'move', layer, at: 380, dur: 460, ease: 'inout', to: { turn: -2 } },
        { kind: 'move', layer, at: 840, dur: 520, ease: 'inout', to: { turn: 0 } },
    ]),
    // 2. The glass catches once, dips, and lights.
    { kind: 'move', layer: 'glass-lit', at: 300, dur: 220, ease: 'out', to: { opacity: 0.55 } },
    { kind: 'move', layer: 'glass-lit', at: 520, dur: 220, ease: 'inout', to: { opacity: 0.25 } },
    { kind: 'move', layer: 'glass-lit', at: 740, dur: 620, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'halo', at: 700, dur: 1400, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'scatter', layer: 'fleck', at: 1000, dur: 1700, count: 16, spread: 120, fall: 90 },
    // 3. Its light lands on the street, then the patterns spread across both walls.
    { kind: 'move', layer: 'pool', at: 1100, dur: 1200, ease: 'out', to: { opacity: 1, sx: 1 } },
    { kind: 'move', layer: 'cast-l', at: 1250, dur: 1500, ease: 'out', to: { opacity: 1, sx: 1, sy: 1, turn: 0 } },
    { kind: 'move', layer: 'cast-r', at: 1350, dur: 1500, ease: 'out', to: { opacity: 1, sx: 1, sy: 1, turn: 0 } },
];

/** The flags never stop: the strings sag and lift a little in the evening air. */
const breeze: IdleStep[] = [
    { layer: 'bunting-a', field: 'sy', amp: 0.04, period: 4600 },
    { layer: 'bunting-a', field: 'turn', amp: 0.5, period: 6200, phase: 0.3 },
    { layer: 'bunting-b', field: 'sy', amp: 0.05, period: 5400, phase: 0.5 },
    { layer: 'bunting-b', field: 'turn', amp: 0.6, period: 7000, phase: 0.1 },
    ...SWAYING.map((layer): IdleStep => ({ layer, field: 'turn', amp: 0.8, period: 5800, phase: 0.2 })),
];

const afterglow: IdleStep[] = [
    ...breeze,
    { layer: 'glass-lit', field: 'opacity', amp: 0.06, period: 2800 },
    { layer: 'halo', field: 'sx', amp: 0.05, period: 4400 },
    { layer: 'halo', field: 'sy', amp: 0.05, period: 4400 },
    { layer: 'halo', field: 'opacity', amp: 0.1, period: 4400, phase: 0.25 },
    { layer: 'cast-l', field: 'opacity', amp: 0.14, period: 5200 },
    { layer: 'cast-r', field: 'opacity', amp: 0.14, period: 5200, phase: 0.5 },
    { layer: 'cast-l', field: 'sx', amp: 0.02, period: 5800, phase: 0.2 },
    { layer: 'cast-r', field: 'sx', amp: 0.02, period: 5800, phase: 0.7 },
    { layer: 'pool', field: 'opacity', amp: 0.1, period: 4400, phase: 0.25 },
];

export const fanous: WrapperDef = {
    id: 'fanous',
    name: { vi: 'Đèn Ramadan', en: 'Ramadan lantern' },
    ambient: ['#1E2752', '#F2C14E', '#2E9C8F'],
    blurb: {
        vi: 'Phố cổ lúc chạng vạng mùa Ramadan. Chiếc đèn đồng sáng lên, kính màu hắt hoa văn hình học lên hai bên tường.',
        en: 'An old street at dusk in Ramadan. The brass lantern lights, and its coloured glass throws geometric patterns on the walls.',
    },
    // The near walls for the surface, the lit cream for the words, the lantern's gold for the one loud colour.
    theme: { ground: '#121736', surface: '#1E2752', ink: '#FBE9C0', accent: '#F2C14E', onAccent: '#121736', material: 'lacquer', corner: 'cut', face: 'serif', voice: 'chime' },
    focus: [0.5, 0.4],
    size: [360, 450],
    backdrop: '#121736',
    // The boxes are those the generator writes (copied by hand; a mismatch shows as stretched art).
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-6, -6, 372, 306], depth: 0.04 },
        { id: 'far', art: 'far.svg', box: [108, 280, 144, 120], depth: 0.08 },
        { id: 'mid-l', art: 'mid-l.svg', box: [66, 90, 50, 310], depth: 0.14 },
        { id: 'mid-r', art: 'mid-r.svg', box: [244, 98, 50, 302], depth: 0.14 },
        { id: 'walls-l', art: 'walls-l.svg', box: [-6, -6, 76, 406], depth: 0.22 },
        { id: 'walls-r', art: 'walls-r.svg', box: [290, -6, 76, 406], depth: 0.22 },
        { id: 'ground', art: 'ground.svg', box: [-6, 396, 372, 60], depth: 0.26 },
        // The patterns grow out from the lantern's side of each wall, at the lantern's height.
        { id: 'cast-l', art: 'cast-l.svg', box: [-6, 100, 118, 296], origin: [1, 80 / 296], start: { opacity: 0, sx: 0.3, sy: 0.55, turn: -8 }, depth: 0.22 },
        { id: 'cast-r', art: 'cast-r.svg', box: [248, 108, 118, 288], origin: [0, 72 / 288], start: { opacity: 0, sx: 0.3, sy: 0.55, turn: 8 }, depth: 0.22 },
        { id: 'pool', art: 'pool.svg', box: [60, 384, 240, 72], origin: [0.5, 0.5], start: { opacity: 0, sx: 0.4 }, depth: 0.26 },
        { id: 'halo', art: 'halo.svg', box: [30, 30, 300, 300], start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.3 },
        { id: 'bunting-b', art: 'bunting-b.svg', box: [66, 132, 228, 64], origin: [0.5, 0], depth: 0.28 },
        { id: 'lantern', art: 'lantern.svg', box: [...LANTERN], origin: [...PIVOT], depth: 0.34 },
        { id: 'glass-lit', art: 'glass-lit.svg', box: [...LANTERN], origin: [...PIVOT], start: { opacity: 0 }, depth: 0.34 },
        { id: 'bunting-a', art: 'bunting-a.svg', box: [66, 4, 228, 72], origin: [0.5, 0], depth: 0.4 },
        { id: 'fleck', art: 'fleck.svg', box: [176, 176, 8, 8] },
    ],
    idle: breeze,
    afterglow,
    open,
    revealAt: 2000,
    // Levelled (scaled) to sit between the other tunes. A plucked figure in a hijaz colour over a held pad; a small bell as the glass lights; home on D.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 62,
        score: scaled(0.58, together(
            tune(160, 'D5/8 Eb5/8 F#5/8 G5/8 A5/4 G5/8 F#5/8 | Eb5/8 F#5/8 G5/8 Bb5/8 A5/4. G5/8 | F#5/8 Eb5/8 D5/2!'),
            tune(160, '[D3 A3]/1 | [G2 D3]/1 | [D3 A3]/2.', { inst: 'pad', gain: 0.3 }),
            [{ at: 760, pitch: 93, dur: 600, gain: 0.25, inst: 'bell' }],
        )),
    },
};
