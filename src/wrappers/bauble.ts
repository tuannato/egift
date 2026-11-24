import type { IdleStep, NoteDef, Step, WrapperDef } from '../stage/format';
import { scaled } from './tune';

/**
 * Bauble — for Christmas and the winter holidays. The inside of a fir tree,
 * close up, in flat gouache cut shapes: saw-edged boughs in four greens fill
 * the frame, small warm lights among them, hung with flat ornaments of
 * different silhouettes (a drop, a banded disc, a bell, a pinecone, a spindle,
 * a small disc, an onion). At the centre one large red disc with a gold band
 * across its middle hangs on a thread. Opening: the disc trembles and parts
 * along its band; the upper half rides up the thread, the lower half drops
 * away, and behind it a round diorama grows: a small snowy village at night,
 * its windows lit; snow is shaken out once. After: the ornaments sway out of
 * step and the windows breathe.
 *
 * The stage moves whole layers, so the disc is two layers split along the
 * band's middle line, both turning about the point the thread hangs from; the
 * diorama, its lit windows and its glow are three layers growing about one
 * centre.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/bauble.gen.mjs): each SVG's viewBox is its box.
 */

/** How far the upper half rides up its thread. */
const RISE = -118;
/** How far the lower half falls: out of the frame. */
const DROP = 330;
/** The small ornaments, and how each hangs: sway in degrees, period in ms, phase. */
const HUNG: readonly (readonly [string, number, number, number])[] = [
    ['drop', 2.6, 4600, 0],
    ['disc', 2.2, 5400, 0.35],
    ['bell', 3, 3900, 0.6],
    ['cone', 2, 5000, 0.15],
    ['spindle', 3.2, 4200, 0.8],
    ['berry', 2.6, 4800, 0.5],
    ['onion', 3.4, 3600, 0.25],
];
/** The three layers of the diorama, which grow as one. */
const WORLD = ['halo', 'diorama', 'windows'] as const;

const open: Step[] = [
    // 1. The disc trembles on its thread; the ornaments nearest it are set swinging.
    { kind: 'shake', layer: 'top', at: 0, dur: 360, amp: 2.4, times: 3 },
    { kind: 'shake', layer: 'low', at: 0, dur: 360, amp: 2.4, times: 3 },
    ...HUNG.flatMap(([layer, sway], i): Step[] => [
        { kind: 'move', layer, at: 200 + i * 40, dur: 380, ease: 'out', to: { turn: (i % 2 ? -2.2 : 2.2) * sway } },
        { kind: 'move', layer, at: 580 + i * 40, dur: 1500, ease: 'inout', to: { turn: 0 } },
    ]),
    // 2. It parts along the band: a crack first, with something lit inside it.
    { kind: 'move', layer: 'top', at: 340, dur: 200, ease: 'out', to: { y: -7 } },
    { kind: 'move', layer: 'low', at: 340, dur: 200, ease: 'out', to: { y: 6 } },
    { kind: 'move', layer: 'diorama', at: 360, dur: 140, to: { opacity: 1 } },
    { kind: 'move', layer: 'windows', at: 360, dur: 140, to: { opacity: 1 } },
    // 3. The upper half rides up the thread, the lower half drops away, and the diorama grows where the
    //    disc was; its glow spreads on the boughs.
    { kind: 'move', layer: 'top', at: 560, dur: 900, ease: 'inout', to: { y: RISE } },
    { kind: 'move', layer: 'low', at: 560, dur: 760, ease: 'in', to: { y: DROP, turn: 5 } },
    { kind: 'move', layer: 'halo', at: 760, dur: 200, to: { opacity: 1 } },
    ...WORLD.map((layer): Step => ({ kind: 'move', layer, at: 760, dur: 760, ease: 'back', to: { sx: 1, sy: 1 } })),
    { kind: 'move', layer: 'lights-a', at: 700, dur: 800, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'lights-b', at: 800, dur: 800, ease: 'inout', to: { opacity: 1 } },
    // 4. Snow is shaken out, once; the glow and the windows settle to where they breathe from.
    { kind: 'scatter', layer: 'flake', at: 1340, dur: 1700, count: 26, spread: 132, fall: 96 },
    { kind: 'move', layer: 'halo', at: 1600, dur: 900, ease: 'inout', to: { opacity: 0.72 } },
    { kind: 'move', layer: 'windows', at: 1600, dur: 900, ease: 'inout', to: { opacity: 0.72 } },
    { kind: 'move', layer: 'lights-a', at: 1700, dur: 900, ease: 'inout', to: { opacity: 0.76 } },
    { kind: 'move', layer: 'lights-b', at: 1800, dur: 900, ease: 'inout', to: { opacity: 0.76 } },
];

const sway = (k: number): IdleStep[] => HUNG.map(([layer, amp, period, phase]): IdleStep => ({ layer, field: 'turn', amp: amp * k, period, phase }));
const twinkle: IdleStep[] = [
    { layer: 'lights-a', field: 'opacity', amp: 0.24, period: 2900 },
    { layer: 'lights-b', field: 'opacity', amp: 0.24, period: 3700, phase: 0.4 },
];

const idle: IdleStep[] = [
    ...sway(0.7),
    ...twinkle,
    // The two halves hang as one disc: the same swing about the same point.
    { layer: 'top', field: 'turn', amp: 0.9, period: 5800 },
    { layer: 'low', field: 'turn', amp: 0.9, period: 5800 },
];

const afterglow: IdleStep[] = [
    ...sway(1),
    ...twinkle,
    { layer: 'top', field: 'turn', amp: 1.1, period: 5200, phase: 0.2 },
    { layer: 'windows', field: 'opacity', amp: 0.28, period: 4400 },
    { layer: 'halo', field: 'opacity', amp: 0.14, period: 4400, phase: 0.08 },
];

/** Glass touched as the disc trembles and as the snow falls: a few high, soft notes. */
const glass: NoteDef[] = [
    { at: 0, pitch: 91, dur: 120, gain: 0.3, inst: 'glassy' },
    { at: 130, pitch: 88, dur: 120, gain: 0.3, inst: 'glassy' },
    { at: 260, pitch: 91, dur: 140, gain: 0.34, inst: 'glassy' },
    { at: 2000, pitch: 91, dur: 260, gain: 0.26, inst: 'glassy' },
    { at: 2300, pitch: 88, dur: 260, gain: 0.24, inst: 'glassy' },
    { at: 2600, pitch: 84, dur: 700, gain: 0.24, inst: 'glassy' },
];
/** Bells climbing as the halves part, then home, held, as the village stands. */
const bells: NoteDef[] = [
    { at: 400, pitch: 67, dur: 200, gain: 0.5 },
    { at: 640, pitch: 72, dur: 200, gain: 0.52 },
    { at: 880, pitch: 76, dur: 200, gain: 0.54 },
    { at: 1120, pitch: 79, dur: 220, gain: 0.58 },
    { at: 1500, pitch: 76, dur: 1800, gain: 0.46 },
    { at: 1500, pitch: 84, dur: 1800, gain: 0.6 },
    { at: 1500, pitch: 72, dur: 1800, gain: 0.44 },
    { at: 1500, pitch: 48, dur: 1700, gain: 0.3, inst: 'pad' },
];

export const bauble: WrapperDef = {
    id: 'bauble',
    name: { vi: 'Quả châu', en: 'Bauble' },
    ambient: ['#0F2A22', '#B3242B', '#E3B04B'],
    blurb: {
        vi: 'Giữa tán thông treo đầy đồ trang trí, quả châu đỏ tách đôi theo đai vàng: bên trong là một ngôi làng tuyết sáng đèn.',
        en: 'Among fir boughs hung with ornaments, a red bauble parts along its gold band; inside, a small snowy village with its windows lit.',
    },
    // The fir's greens for the room and the surface, snow for the words, the band's gold for the one loud colour.
    theme: { ground: '#0F2A22', surface: '#1C4A38', ink: '#F4EAD5', accent: '#E3B04B', onAccent: '#0F2A22', material: 'lacquer', corner: 'round', face: 'serif', voice: 'chime' },
    focus: [0.5, 0.52],
    size: [360, 450],
    backdrop: '#0F2A22',
    // The boxes are those the generator writes (copied by hand; a mismatch shows as stretched art).
    layers: [
        { id: 'back', art: 'back.svg', box: [-6, -6, 372, 462], depth: 0.05 },
        { id: 'lights-a', art: 'lights-a.svg', box: [-6, -6, 372, 232], start: { opacity: 0.76 }, depth: 0.08 },
        { id: 'lights-b', art: 'lights-b.svg', box: [-6, 226, 372, 230], start: { opacity: 0.76 }, depth: 0.08 },
        // Each small ornament turns about where its thread is tied: the top middle of its box.
        { id: 'drop', art: 'drop.svg', box: [26, 14, 48, 122], origin: [0.5, 0], depth: 0.22 },
        { id: 'disc', art: 'disc.svg', box: [282, 8, 48, 110], origin: [0.5, 0], depth: 0.2 },
        { id: 'bell', art: 'bell.svg', box: [8, 168, 52, 98], origin: [0.5, 0], depth: 0.26 },
        { id: 'cone', art: 'cone.svg', box: [304, 158, 40, 108], origin: [0.5, 0], depth: 0.24 },
        { id: 'spindle', art: 'spindle.svg', box: [68, 326, 32, 98], origin: [0.5, 0], depth: 0.28 },
        { id: 'berry', art: 'berry.svg', box: [246, 338, 44, 82], origin: [0.5, 0], depth: 0.26 },
        { id: 'onion', art: 'onion.svg', box: [162, 360, 36, 72], origin: [0.5, 0], depth: 0.3 },
        // The diorama, its lit windows and its glow grow about one centre (180, 238).
        { id: 'halo', art: 'halo.svg', box: [30, 88, 300, 300], start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.14 },
        { id: 'diorama', art: 'diorama.svg', box: [74, 132, 212, 212], start: { opacity: 0, sx: 0.24, sy: 0.24 }, depth: 0.16 },
        { id: 'windows', art: 'windows.svg', box: [74, 132, 212, 212], start: { opacity: 0, sx: 0.24, sy: 0.24 }, depth: 0.16 },
        { id: 'flake', art: 'flake.svg', box: [176, 234, 8, 8], depth: 0.2 },
        // The two halves of the big disc: both boxes start where the thread is tied, at the top of the frame.
        // The lower half falls behind the near boughs; the upper half hangs in front of them.
        { id: 'low', art: 'low.svg', box: [88, -6, 184, 328], origin: [0.5, 0], depth: 0.34 },
        { id: 'near-low', art: 'near-low.svg', box: [-6, 372, 372, 84], depth: 0.5 },
        { id: 'near-top', art: 'near-top.svg', box: [-6, -6, 372, 112], depth: 0.3 },
        { id: 'top', art: 'top.svg', box: [88, -6, 184, 238], origin: [0.5, 0], depth: 0.34 },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1500,
    // Glass touched as the disc trembles; bells climbing as it parts, then a chord held on home.
    sound: {
        v: 1,
        inst: 'bell',
        tonic: 72,
        score: scaled(0.41, [...glass, ...bells].sort((a, b) => a.at - b.at || b.pitch - a.pitch)),
    },
};
