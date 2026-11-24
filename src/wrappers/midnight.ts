import type { IdleStep, LayerDef, NoteDef, Step, WrapperDef } from '../stage/format';
import { scaled } from './tune';

/**
 * Midnight — the New Year's Eve wrapper. Art deco, gold and ivory on black:
 * a great clock dial fills the frame, with ticks only (no figure of any kind),
 * a ring of ticks around a gold band around a dark engraved face, two hands a
 * few minutes short of the top, a fan in every corner and stepped crests at
 * the top and the bottom. Opening: the bell strikes three times, and on each
 * stroke the hands step toward the top; on the third they meet, a gold
 * sunburst grows from behind the dial, the pieces of its rings slide outward
 * and a handful of tinsel is thrown once. No fireworks and no skyline: that
 * is the `fireworks` wrapper.
 *
 * The stage moves, turns and scales whole layers: the hands turn about the
 * hub, the sunburst is scaled from the centre, each piece of a ring is moved
 * along its own bearing.
 *
 * Canvas 360x450, the dial's centre at (180, 222). The art is generated in
 * canvas coordinates (scripts/art/midnight.gen.mjs): each SVG's viewBox is
 * its box.
 */

/** The three strokes of the bell. */
const STROKES = [0, 650, 1300] as const;
/** Where the hands stand before the first stroke, in degrees short of the top, and how far one stroke takes them. */
const MINUTE_BACK = 36;
const HOUR_BACK = 12;
/** The hands have met. */
const MEET = STROKES[2] + 240;
/** How far the pieces of the outer and of the middle ring slide out. */
const OUTER_OUT = 22;
const MID_OUT = 12;

const r2 = (n: number): number => Math.round(n * 100) / 100;
/** The offset of a slide of `d` units along a bearing (degrees clockwise from the top). */
const slide = (deg: number, d: number): { x: number; y: number } => ({ x: r2(d * Math.sin((deg * Math.PI) / 180)), y: r2(-d * Math.cos((deg * Math.PI) / 180)) });

type Box = readonly [number, number, number, number];
/** The boxes the generator prints (copied by hand). */
const OUTER: readonly Box[] = [[190, 61, 151, 151], [190, 232, 151, 151], [19, 232, 151, 151], [19, 61, 151, 151]];
const MID: readonly Box[] = [[101, 69, 158, 79], [254, 143, 79, 158], [101, 296, 158, 79], [27, 143, 79, 158]];
const GLINT: readonly Box[] = [[250, 74, 32, 32], [69, 93, 26, 26], [286, 308, 28, 28], [59, 307, 22, 22]];

/** Everything of the dial is one plane; the sunburst lies behind it, the frame's ornaments in front. */
const D_DIAL = 0.2;
const D_BURST = 0.1;

const outerLayers: LayerDef[] = OUTER.map((box, i) => ({ id: `outer-${i + 1}`, art: `outer-${i + 1}.svg`, box, depth: D_DIAL }));
const midLayers: LayerDef[] = MID.map((box, i) => ({ id: `mid-${i + 1}`, art: `mid-${i + 1}.svg`, box, depth: D_DIAL }));
const glintLayers: LayerDef[] = GLINT.map((box, i) => ({ id: `glint-${i + 1}`, art: `glint-${i + 1}.svg`, box, start: i === 0 ? { opacity: 0.75 } : { opacity: 0, sx: 0.2, sy: 0.2 }, depth: 0.3 }));

const open: Step[] = [
    // 1. Three strokes: on each the hands step toward the top, and the light behind the dial comes up a little.
    ...STROKES.flatMap((at, i): Step[] => [
        { kind: 'move', layer: 'hand-minute', at, dur: 300, ease: 'back', to: { turn: r2(-MINUTE_BACK * (2 - i) / 3) } },
        { kind: 'move', layer: 'hand-hour', at, dur: 300, ease: 'back', to: { turn: r2(-HOUR_BACK * (2 - i) / 3) } },
        { kind: 'move', layer: 'halo', at, dur: 320, ease: 'out', to: { opacity: [0.62, 0.8, 1][i]!, sx: [0.9, 0.96, 1.06][i]!, sy: [0.9, 0.96, 1.06][i]! } },
    ]),
    //    On the second stroke the pieces of the middle ring let go by a hair.
    ...MID.map((_, i): Step => ({ kind: 'move', layer: `mid-${i + 1}`, at: STROKES[1], dur: 280, ease: 'back', to: slide(i * 90, 3) })),
    // 2. The hands have met: the sunburst grows from behind the dial, long rays first, and settles.
    { kind: 'move', layer: 'burst-a', at: MEET - 60, dur: 900, ease: 'back', to: { sx: 1, sy: 1, turn: 0 } },
    { kind: 'move', layer: 'burst-b', at: MEET + 60, dur: 900, ease: 'back', to: { sx: 1, sy: 1, turn: 0 } },
    { kind: 'move', layer: 'halo', at: MEET + 700, dur: 900, ease: 'inout', to: { opacity: 0.6, sx: 1, sy: 1 } },
    //    The pieces of the rings slide outward, each along its own bearing: the outer ones to the corners.
    ...OUTER.map((_, i): Step => ({ kind: 'move', layer: `outer-${i + 1}`, at: MEET - 20 + i * 40, dur: 760, ease: 'out', to: slide(45 + i * 90, OUTER_OUT) })),
    ...MID.map((_, i): Step => ({ kind: 'move', layer: `mid-${i + 1}`, at: MEET + 40 + i * 40, dur: 700, ease: 'out', to: slide(i * 90, MID_OUT) })),
    //    The sun's own disc rises at the hub, under the hands.
    { kind: 'move', layer: 'core', at: MEET, dur: 480, ease: 'back', to: { sx: 1, sy: 1 } },
    //    One throw of tinsel.
    { kind: 'scatter', layer: 'tinsel', at: MEET + 40, dur: 1900, count: 30, spread: 200, fall: 150 },
    // 3. The glints come out, one after another.
    ...[1, 2, 3].map((i): Step => ({ kind: 'move', layer: `glint-${i + 1}`, at: MEET + 500 + i * 180, dur: 420, ease: 'back', to: { opacity: 0.9, sx: 1, sy: 1 } })),
];

const idle: IdleStep[] = [
    // The light behind the dial breathes; one glint on the rim comes and goes.
    { layer: 'halo', field: 'opacity', amp: 0.14, period: 4600 },
    { layer: 'glint-1', field: 'opacity', amp: 0.25, period: 3200 },
    { layer: 'glint-1', field: 'sx', amp: 0.14, period: 3200 },
    { layer: 'glint-1', field: 'sy', amp: 0.14, period: 3200 },
];

const afterglow: IdleStep[] = [
    // The sunburst breathes, its two layers out of step, and the light with it.
    { layer: 'burst-a', field: 'sx', amp: 0.022, period: 5200 },
    { layer: 'burst-a', field: 'sy', amp: 0.022, period: 5200 },
    { layer: 'burst-b', field: 'sx', amp: 0.04, period: 5200, phase: 0.5 },
    { layer: 'burst-b', field: 'sy', amp: 0.04, period: 5200, phase: 0.5 },
    { layer: 'halo', field: 'opacity', amp: 0.12, period: 5200 },
    { layer: 'core', field: 'sx', amp: 0.03, period: 5200, phase: 0.25 },
    { layer: 'core', field: 'sy', amp: 0.03, period: 5200, phase: 0.25 },
    // A few glints twinkle, each in its own time.
    ...[2600, 3400, 4100, 2900].flatMap((period, i): IdleStep[] => [
        { layer: `glint-${i + 1}`, field: 'opacity', amp: 0.3, period, phase: i * 0.27 },
        { layer: `glint-${i + 1}`, field: 'sx', amp: 0.16, period, phase: i * 0.27 },
        { layer: `glint-${i + 1}`, field: 'sy', amp: 0.16, period, phase: i * 0.27 },
    ]),
];

/** Three strokes of the bell, the fifth twice and then home, a low bell under each; a brass note swells as the hands meet. */
const score: NoteDef[] = [
    { at: STROKES[0], pitch: 67, dur: 560, gain: 0.5 },
    { at: STROKES[0], pitch: 43, dur: 560, gain: 0.3 },
    { at: STROKES[1], pitch: 67, dur: 560, gain: 0.54 },
    { at: STROKES[1], pitch: 43, dur: 560, gain: 0.3 },
    { at: STROKES[2], pitch: 72, dur: 2300, gain: 0.6 },
    { at: STROKES[2], pitch: 48, dur: 2300, gain: 0.34 },
    { at: MEET, pitch: 60, dur: 1900, gain: 0.4, inst: 'brass' },
    { at: MEET, pitch: 67, dur: 1900, gain: 0.3, inst: 'brass' },
];

export const midnight: WrapperDef = {
    id: 'midnight',
    name: { vi: 'Giao thừa', en: 'Midnight' },
    ambient: ['#0B0B10', '#D9B25F', '#F3EBD8'],
    blurb: {
        vi: 'Mặt đồng hồ art deco, vàng trên nền đen. Ba tiếng chuông, hai kim gặp nhau trên đỉnh, và một vầng hào quang vàng bung ra sau mặt số.',
        en: 'An art deco dial, gold on black. Three strokes of the bell, the hands meet at the top, and a gold sunburst grows from behind it.',
    },
    // The dial's black as lacquer, ivory for the words, the dial's gold for the one loud colour.
    theme: { ground: '#0B0B10', surface: '#15151D', ink: '#F3EBD8', accent: '#D9B25F', onAccent: '#0B0B10', material: 'lacquer', corner: 'cut', face: 'poster', voice: 'chime' },
    focus: [0.5, 0.49],
    size: [360, 450],
    backdrop: '#0B0B10',
    layers: [
        { id: 'ground', art: 'ground.svg', box: [-6, -6, 372, 462], depth: 0.04 },
        { id: 'halo', art: 'halo.svg', box: [8, 50, 344, 344], start: { opacity: 0.45, sx: 0.86, sy: 0.86 }, depth: D_BURST },
        { id: 'burst-b', art: 'burst-b.svg', box: [29, 71, 302, 302], start: { sx: 0, sy: 0, turn: -22.5 }, depth: D_BURST },
        { id: 'burst-a', art: 'burst-a.svg', box: [-35, 7, 430, 430], start: { sx: 0, sy: 0, turn: -22.5 }, depth: D_BURST },
        ...outerLayers,
        ...midLayers,
        { id: 'face', art: 'face.svg', box: [83, 125, 194, 194], depth: D_DIAL },
        { id: 'core', art: 'core.svg', box: [141, 183, 78, 78], start: { sx: 0, sy: 0 }, depth: D_DIAL },
        // The hands are drawn pointing up; each turns about the hub, at (180, 222).
        { id: 'hand-hour', art: 'hand-hour.svg', box: [168, 148, 24, 94], origin: [0.5, r2(74 / 94)], start: { turn: -HOUR_BACK }, depth: D_DIAL },
        { id: 'hand-minute', art: 'hand-minute.svg', box: [171, 110, 18, 138], origin: [0.5, r2(112 / 138)], start: { turn: -MINUTE_BACK }, depth: D_DIAL },
        { id: 'cap', art: 'cap.svg', box: [172, 214, 16, 16], depth: D_DIAL },
        { id: 'crest-top', art: 'crest-top.svg', box: [102, 6, 156, 56], depth: 0.08 },
        { id: 'crest-bottom', art: 'crest-bottom.svg', box: [102, 388, 156, 56], depth: 0.08 },
        ...glintLayers,
        { id: 'tinsel', art: 'tinsel.svg', box: [173, 219, 14, 6] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1900,
    sound: { v: 1, inst: 'bell', tonic: 72, score: scaled(0.72, score) },
};
