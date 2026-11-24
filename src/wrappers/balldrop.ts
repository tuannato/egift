import type { IdleStep, LayerDef, NoteDef, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Ball drop — New Year's Eve in a big city, seen from the street looking
 * straight up. A flat night poster: the towers are fans of wedges that all
 * run to one point near the top centre of the frame, their floors rows of
 * window blocks of uneven widths; in the gap between them a mast climbs from
 * a roof, and a faceted ball (a disc of triangles in three flat tones) sits
 * at its head. Opening: the ball slides down the mast, gathering speed and
 * growing as it nears, and lands in its cradle at the focus; at that moment
 * the towers light up in one bloom, paper streamers unroll toward the viewer
 * and one handful of paper bits flies.
 *
 * The stage cannot parent one layer to another: the ball, its brighter twin
 * and its halo are given the same slide. A streamer is drawn hanging straight
 * down from its upper end; `turn` lays it along its line from the vanishing
 * point and `sy` unrolls it.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/balldrop.gen.mjs): each SVG's viewBox is its box. The boxes
 * and the streamers' turns below are the ones the generator prints.
 */

/** How far above its cradle the ball starts, and how small it is up there. */
const RISE = -134;
const SMALL = 0.76;

/** The streamers: box and turn as printed by the generator. */
const STREAMERS: readonly (readonly [string, LayerDef['box'], number])[] = [
    ['streamer-1', [110, 169, 28, 300], 22],
    ['streamer-2', [95, 124, 28, 190], 37],
    ['streamer-3', [85, 82, 28, 124], 57],
    ['streamer-4', [222, 184, 28, 170], -20],
    ['streamer-5', [236, 134, 28, 200], -34],
    ['streamer-6', [248, 87, 28, 128], -55],
];

const layers: LayerDef[] = [
    { id: 'far', art: 'far.svg', box: [-6, -6, 372, 462], depth: 0.06 },
    { id: 'far-lit', art: 'far-lit.svg', box: [-6, 27, 372, 415], start: { opacity: 0 }, depth: 0.06 },
    { id: 'halo', art: 'halo.svg', box: [68, 110, 224, 224], start: { y: RISE, sx: 0.56, sy: 0.56, opacity: 0.85 }, depth: 0.2 },
    { id: 'mast', art: 'mast.svg', box: [155, 29, 50, 288], depth: 0.2 },
    { id: 'ball', art: 'ball.svg', box: [134, 176, 92, 92], start: { y: RISE, sx: SMALL, sy: SMALL }, depth: 0.2 },
    { id: 'ball-lit', art: 'ball-lit.svg', box: [134, 176, 92, 92], start: { y: RISE, sx: SMALL, sy: SMALL, opacity: 0 }, depth: 0.2 },
    { id: 'near-l', art: 'near-l.svg', box: [-6, -6, 117, 462], depth: 0.4 },
    { id: 'near-r', art: 'near-r.svg', box: [241, -6, 125, 462], depth: 0.4 },
    { id: 'lit-l', art: 'lit-l.svg', box: [-6, -6, 82, 428], start: { opacity: 0 }, depth: 0.4 },
    { id: 'lit-r', art: 'lit-r.svg', box: [248, -6, 117, 455], start: { opacity: 0 }, depth: 0.4 },
    { id: 'twinkle-l', art: 'twinkle-l.svg', box: [-6, 156, 65, 152], start: { opacity: 0.6 }, depth: 0.4 },
    { id: 'twinkle-r', art: 'twinkle-r.svg', box: [320, 188, 46, 184], start: { opacity: 0.6 }, depth: 0.4 },
    { id: 'lamp-l', art: 'lamp-l.svg', box: [4, 250, 92, 92], start: { opacity: 0.8 }, depth: 0.4 },
    { id: 'lamp-r', art: 'lamp-r.svg', box: [258, 338, 120, 120], start: { opacity: 0.8 }, depth: 0.4 },
    ...STREAMERS.map(([id, box, turn]): LayerDef => ({ id, art: `${id}.svg`, box, origin: [0.5, 0], start: { turn, sy: 0, opacity: 0 }, depth: 0.7 })),
    { id: 'fleck', art: 'fleck.svg', box: [174, 216, 13, 11], depth: 0.7 },
];

// Beat times (ms).
const DROP = 260;
const LAND = 1500;
const BLOOM = LAND + 40;

/** What rides down the mast as one thing. */
const RIDERS = ['ball', 'ball-lit', 'halo'] as const;
const LIT = ['far-lit', 'lit-l', 'lit-r'] as const;

const open: Step[] = [
    // 1. The ball gathers itself: a small lift, its halo warming.
    ...RIDERS.map((layer): Step => ({ kind: 'move', layer, at: 0, dur: DROP, ease: 'out', to: { y: RISE - 7 } })),
    { kind: 'move', layer: 'halo', at: 0, dur: DROP, ease: 'out', to: { opacity: 1 } },
    // 2. The drop: down the mast, gathering speed, growing as it nears the viewer.
    ...RIDERS.map((layer): Step => ({ kind: 'move', layer, at: DROP, dur: LAND - DROP, ease: 'in', to: { y: 0 } })),
    { kind: 'move', layer: 'ball', at: DROP, dur: LAND - DROP, ease: 'in', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'ball-lit', at: DROP, dur: LAND - DROP, ease: 'in', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'halo', at: DROP, dur: LAND - DROP, ease: 'in', to: { sx: 0.66, sy: 0.66 } },
    // 3. It lands: the cradle gives a little, the mast trembles.
    ...RIDERS.map((layer): Step => ({ kind: 'move', layer, at: LAND, dur: 80, ease: 'out', to: { y: 4 } })),
    ...RIDERS.map((layer): Step => ({ kind: 'move', layer, at: LAND + 80, dur: 200, ease: 'inout', to: { y: 0 } })),
    { kind: 'shake', layer: 'mast', at: LAND, dur: 260, amp: 1.2, times: 3 },
    // 4. One bloom: every tower's windows come on together, the ball flares, its halo opens out.
    ...LIT.map((layer): Step => ({ kind: 'move', layer, at: BLOOM, dur: 420, ease: 'out', to: { opacity: 1 } })),
    { kind: 'move', layer: 'twinkle-l', at: BLOOM, dur: 420, ease: 'out', to: { opacity: 0.8 } },
    { kind: 'move', layer: 'twinkle-r', at: BLOOM, dur: 420, ease: 'out', to: { opacity: 0.8 } },
    { kind: 'move', layer: 'ball-lit', at: BLOOM, dur: 220, ease: 'out', to: { opacity: 0.9 } },
    { kind: 'move', layer: 'ball-lit', at: BLOOM + 420, dur: 700, ease: 'inout', to: { opacity: 0.45 } },
    { kind: 'move', layer: 'halo', at: BLOOM, dur: 460, ease: 'out', to: { sx: 1.08, sy: 1.08, opacity: 1 } },
    { kind: 'move', layer: 'halo', at: BLOOM + 460, dur: 900, ease: 'inout', to: { sx: 0.94, sy: 0.94, opacity: 0.85 } },
    { kind: 'move', layer: 'lamp-l', at: BLOOM, dur: 420, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'lamp-r', at: BLOOM, dur: 420, ease: 'out', to: { opacity: 1 } },
    // 5. Streamers unroll toward the viewer, one after another, and one handful of paper bits flies.
    ...STREAMERS.flatMap(([layer], i): Step[] => {
        const at = BLOOM + 80 + [0, 220, 420, 110, 320, 520][i]!;
        return [
            { kind: 'move', layer, at, dur: 60, to: { opacity: 1 } },
            { kind: 'move', layer, at, dur: 820, ease: 'out', to: { sy: 1 } },
        ];
    }),
    { kind: 'scatter', layer: 'fleck', at: BLOOM + 20, dur: 1900, count: 32, spread: 175, fall: 130 },
];

const lamps: IdleStep[] = [
    { layer: 'lamp-l', field: 'opacity', amp: 0.14, period: 4300 },
    { layer: 'lamp-r', field: 'opacity', amp: 0.14, period: 3700, phase: 0.4 },
    { layer: 'twinkle-l', field: 'opacity', amp: 0.3, period: 2900 },
    { layer: 'twinkle-r', field: 'opacity', amp: 0.3, period: 3500, phase: 0.55 },
];

const idle: IdleStep[] = [
    ...lamps,
    // The ball waits at the head of the mast, its halo breathing.
    { layer: 'halo', field: 'opacity', amp: 0.2, period: 3800 },
    { layer: 'halo', field: 'sx', amp: 0.03, period: 3800 },
    { layer: 'halo', field: 'sy', amp: 0.03, period: 3800 },
];

const afterglow: IdleStep[] = [
    ...lamps,
    // The ball breathes brighter and dimmer.
    { layer: 'ball-lit', field: 'opacity', amp: 0.35, period: 3600 },
    { layer: 'halo', field: 'opacity', amp: 0.15, period: 3600 },
    { layer: 'halo', field: 'sx', amp: 0.05, period: 3600 },
    { layer: 'halo', field: 'sy', amp: 0.05, period: 3600 },
    // The streamers hang and sway about their upper ends.
    ...STREAMERS.map(([layer], i): IdleStep => ({ layer, field: 'turn', amp: 1.1 + (i % 3) * 0.3, period: 5200 + i * 430, phase: (i * 0.23) % 1 })),
];

/** A low pad, a glassy line climbing while the ball comes down, a bell on landing and the home chord held. */
const score: NoteDef[] = scaled(0.45, together(
    tune(192, 'C3/1 | [C3 G3]/1 | ~/1', { inst: 'pad', gain: 0.4 }),
    tune(192, '-/8 C4/8 E4/8 G4/8 A4/8 C5/8 D5/8 E5/8 | G5/4', { start: DROP - 156, inst: 'glassy', gain: 0.5, hold: 0.8 }),
    tune(192, '[C5 G5]/1 ~/2', { start: LAND, inst: 'tine', gain: 0.45 }),
    tune(192, 'C6/1! ~/2', { start: LAND, gain: 0.6 }),
));

export const balldrop: WrapperDef = {
    id: 'balldrop',
    name: { vi: 'Quả cầu giao thừa', en: 'Ball drop' },
    ambient: ['#12102B', '#4A45A8', '#F5B83D', '#FF5A36'],
    blurb: {
        vi: 'Đêm giao thừa nhìn từ lòng phố. Quả cầu vàng trượt xuống cột, chạm đế là cả dãy nhà cao tầng bừng sáng, dây giấy bung ra.',
        en: 'New Year\'s Eve from the street, looking up. A gold ball slides down its mast; as it lands every tower lights and streamers unroll.',
    },
    // The towers' dark face for the card, white for the words, the ball's gold for the one loud colour.
    theme: { ground: '#12102B', surface: '#1A1740', ink: '#FFFFFF', accent: '#F5B83D', onAccent: '#12102B', material: 'lacquer', corner: 'soft', face: 'poster', voice: 'chime' },
    focus: [0.5, 0.49],
    size: [360, 450],
    backdrop: '#332E7A',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 1780,
    sound: { v: 1, inst: 'bell', tonic: 72, score },
};
