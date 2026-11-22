import type { IdleStep, LayerDef, NoteDef, Step, WrapperDef } from '../stage/format';

/**
 * Command line — a desk at night, for a developer, for a friend who lives in
 * a terminal. An old CRT monitor fills the frame, seen straight on; on its
 * glass a window of source code, drawn as rounded blocks of very different
 * lengths, indented, in four tones: never a letter, a digit or a glyph.
 * Below it the top of a keyboard, a mug, a lamp's warm pool. Opening: five
 * lines are typed (the page moving up a row at each), the picture jolts, the code scrolls up and away while an
 * amber bar fills, the window parts in two and a panel of light grows at the
 * middle of the glass; the screen's green falls on the keys and the mug.
 *
 * The room (wall, casing, desk) is one layer with a hole where the glass is,
 * and lies over everything on the screen: what scrolls or slides off the
 * glass goes behind the bezel. A line is typed by a layer scaling from zero
 * about its left end, the cursor sliding along with its growing end.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/terminal.gen.mjs): each SVG's viewBox is its box. The boxes
 * below, and the lines' ends, are copied from what the generator prints.
 */

/** Everything behind the glass, and the room round it, lie in one plane: nothing may show at the hole's edge. */
const SCREEN = 0.08;
/** The things on the desk stand nearer. */
const NEAR = 0.3;

/** The cursor's box, and each typed line as it is drawn: where it starts, where it ends, its top. */
const CUR = [154, 242] as const;
const TYPED: readonly (readonly [number, number, number])[] = [
    [79, 209, 254],
    [92, 176, 264],
    [92, 238, 274],
    [105, 207, 284],
    [79, 155, 294],
];
/** The pitch of the lines: the page moves up by this at every new line, so each is typed on the same row. */
const ROW = 10;
/** The cursor's drop from the last standing line to the row where lines are typed. */
const DROP = TYPED[0]![2] - 2 - CUR[1];
const typeId = (i: number): string => `type-${i + 1}`;
const PAGE = ['code-a', 'code-b'];
const CODE = [...PAGE, ...TYPED.map((_, i) => typeId(i))];
/** One line every 170 ms: the cursor drops to its start, then runs along with it. */
const BEAT = 170;
/** How far the page of code scrolls: the last line clears the top of the glass. */
const SCROLL = -250;
/** How far each half of the window slides: off the glass, behind the bezel. */
const PART = 142;
/** How bright the panel's air stands once open: below 1, so that it can breathe both ways. */
const GLOW = 0.84;

const open: Step[] = [
    // 1. Five lines are typed on the row under the last. A line scales out from its left end, the cursor
    //    keeping to its growing end; at each new line the page moves up one row.
    ...TYPED.flatMap(([x0, x1], i): Step[] => [
        { kind: 'move', layer: 'cursor', at: i * BEAT, dur: 20, to: { x: x0 - CUR[0], y: DROP } },
        { kind: 'move', layer: 'cursor', at: i * BEAT + 20, dur: 135, to: { x: x1 + 4 - CUR[0] } },
        { kind: 'move', layer: typeId(i), at: i * BEAT + 20, dur: 135, to: { sx: 1 } },
        ...(i === 0 ? [] : [...PAGE, ...TYPED.slice(0, i).map((_, k) => typeId(k))].map((layer): Step => ({ kind: 'move', layer, at: i * BEAT, dur: 20, to: { y: -ROW * i } }))),
    ]),
    // 2. The picture jolts sideways, twice: the screen's content only, never the room.
    ...[...CODE, 'cursor', 'win-l', 'win-r'].map((layer): Step => ({ kind: 'shake', layer, at: 900, dur: 200, amp: 5, times: 2 })),
    // 3. The page scrolls up and away under the title strip and behind the bezel, while the bar fills.
    ...[...CODE, 'cursor'].map((layer): Step => ({ kind: 'move', layer, at: 1100, dur: 600, ease: 'in', to: { y: (layer === 'cursor' ? DROP : -ROW * (TYPED.length - 1)) + SCROLL } })),
    { kind: 'move', layer: 'track', at: 1100, dur: 160, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'bar', at: 1180, dur: 540, ease: 'inout', to: { sx: 1 } },
    // 4. The window parts; the panel of light grows where the bar was, and its air with it.
    { kind: 'move', layer: 'win-l', at: 1700, dur: 520, ease: 'inout', to: { x: -PART } },
    { kind: 'move', layer: 'win-r', at: 1700, dur: 520, ease: 'inout', to: { x: PART } },
    { kind: 'move', layer: 'panel', at: 1740, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'panel', at: 1740, dur: 520, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'glow', at: 1740, dur: 660, ease: 'out', to: { opacity: GLOW, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'track', at: 1800, dur: 120, to: { opacity: 0 } },
    { kind: 'move', layer: 'bar', at: 1800, dur: 120, to: { opacity: 0 } },
    // Six pixels drift out along one diagonal.
    { kind: 'move', layer: 'bits', at: 1860, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'bits', at: 1860, dur: 740, ease: 'out', to: { sx: 1, sy: 1 } },
    // The glass throws its green on the keyboard and the mug.
    { kind: 'move', layer: 'wash', at: 1900, dur: 700, ease: 'inout', to: { opacity: 1 } },
    // The cursor comes back in a corner of the glass.
    { kind: 'move', layer: 'cursor', at: 1700, dur: 20, to: { opacity: 0 } },
    { kind: 'move', layer: 'cursor', at: 1740, dur: 20, to: { x: 62 - CUR[0], y: 258 - CUR[1] } },
    { kind: 'move', layer: 'cursor', at: 2200, dur: 300, ease: 'out', to: { opacity: 0.7 } },
];

const idle: IdleStep[] = [
    { layer: 'cursor', field: 'opacity', amp: 0.3, period: 1600 },
    { layer: 'reflect', field: 'opacity', amp: 0.2, period: 5600 },
    { layer: 'led', field: 'opacity', amp: 0.3, period: 3200 },
    { layer: 'lamp', field: 'opacity', amp: 0.06, period: 6400, phase: 0.3 },
];

const afterglow: IdleStep[] = [
    { layer: 'glow', field: 'opacity', amp: 0.14, period: 4200 },
    { layer: 'panel', field: 'sx', amp: 0.012, period: 4200 },
    { layer: 'panel', field: 'sy', amp: 0.018, period: 4200 },
    { layer: 'bits', field: 'sx', amp: 0.02, period: 5000, phase: 0.4 },
    { layer: 'bits', field: 'sy', amp: 0.02, period: 5000, phase: 0.4 },
    { layer: 'cursor', field: 'opacity', amp: 0.3, period: 1600 },
    { layer: 'lamp', field: 'opacity', amp: 0.1, period: 5200, phase: 0.3 },
    { layer: 'led', field: 'opacity', amp: 0.3, period: 3200 },
];

/** Soft ticks of noise for the keys, a low wooden thunk at the jolt, two rising notes, and a chord held. */
const K = 0.47;
const g = (v: number): number => Math.round(v * K * 100) / 100;
const score: NoteDef[] = [
    ...TYPED.flatMap((_, i): NoteDef[] => [
        { at: i * BEAT + 20, pitch: 86 + (i % 3) * 2, dur: 30, gain: g(0.34), inst: 'noise' },
        { at: i * BEAT + 95, pitch: 82 + (i % 2) * 3, dur: 30, gain: g(0.24), inst: 'noise' },
    ]),
    { at: 900, pitch: 45, dur: 140, gain: g(0.8), inst: 'wood' },
    { at: 1180, pitch: 76, dur: 240, gain: g(0.6) },
    { at: 1450, pitch: 81, dur: 240, gain: g(0.66) },
    { at: 1760, pitch: 57, dur: 1500, gain: g(0.4), inst: 'pad' },
    { at: 1760, pitch: 76, dur: 1500, gain: g(0.5) },
    { at: 1760, pitch: 85, dur: 1500, gain: g(0.5) },
    { at: 1760, pitch: 69, dur: 1500, gain: g(0.6) },
];

const layers: LayerDef[] = [
    { id: 'glass', art: 'glass.svg', box: [30, 40, 300, 256], depth: SCREEN },
    { id: 'code-a', art: 'code-a.svg', box: [66, 84, 187, 86.5], depth: SCREEN },
    { id: 'code-b', art: 'code-b.svg', box: [66, 174, 139, 76.5], depth: SCREEN },
    // Each typed line is drawn on its own row and starts moved up to the row where it will be typed.
    ...TYPED.map(([x0, x1, y], i): LayerDef => ({ id: typeId(i), art: `${typeId(i)}.svg`, box: [x0, y, x1 - x0, 6.5], origin: [0, 0.5], start: { sx: 0, y: -ROW * i }, depth: SCREEN })),
    { id: 'track', art: 'track.svg', box: [92, 190, 176, 14], start: { opacity: 0 }, depth: SCREEN },
    { id: 'bar', art: 'bar.svg', box: [96, 194, 168, 6], origin: [0, 0.5], start: { sx: 0 }, depth: SCREEN },
    { id: 'glow', art: 'glow.svg', box: [24, 40, 312, 256], start: { opacity: 0, sx: 0.4, sy: 0.4 }, depth: SCREEN },
    { id: 'bits', art: 'bits.svg', box: [48, 60, 264, 216], start: { opacity: 0, sx: 0.62, sy: 0.62 }, depth: SCREEN },
    { id: 'panel', art: 'panel.svg', box: [92, 112, 176, 112], start: { opacity: 0, sx: 0.12, sy: 0.08 }, depth: SCREEN },
    { id: 'cursor', art: 'cursor.svg', box: [154, 242, 7, 10], start: { opacity: 0.7 }, depth: SCREEN },
    { id: 'win-l', art: 'win-l.svg', box: [53, 53, 127, 224], depth: SCREEN },
    { id: 'win-r', art: 'win-r.svg', box: [180, 53, 127, 224], depth: SCREEN },
    { id: 'reflect', art: 'reflect.svg', box: [40, 50, 132, 132], start: { opacity: 0.8 }, depth: SCREEN },
    { id: 'room', art: 'room.svg', box: [-6, -6, 372, 462], depth: SCREEN },
    { id: 'led', art: 'led.svg', box: [276, 297, 40, 40], start: { opacity: 0.7 }, depth: SCREEN },
    { id: 'desk', art: 'desk.svg', box: [62, 366, 306, 92], depth: NEAR },
    { id: 'lamp', art: 'lamp.svg', box: [-8, 384, 190, 74], start: { opacity: 0.88 }, depth: NEAR },
    { id: 'wash', art: 'wash.svg', box: [0, 350, 360, 100], start: { opacity: 0 }, depth: NEAR },
];

export const terminal: WrapperDef = {
    id: 'terminal',
    name: { vi: 'Dòng lệnh', en: 'Command line' },
    ambient: ['#020804', '#19FF7A', '#FFB454'],
    blurb: {
        vi: 'Bàn làm việc ban đêm, màn hình CRT xanh. Năm dòng lệnh được gõ, mã cuộn đi, thanh tiến trình đầy, rồi cửa sổ tách ra.',
        en: 'A desk at night and a green CRT. Five lines are typed, the code scrolls away, a bar fills, and the window parts on a panel of light.',
    },
    // The glass for the surface, full light for the words, the phosphor for the one loud colour.
    theme: { ground: '#020804', surface: '#0A1A10', ink: '#D8FFE8', accent: '#19FF7A', onAccent: '#020804', material: 'wire', corner: 'cut', face: 'mono', voice: 'pulse' },
    focus: [0.5, 0.38],
    size: [360, 450],
    backdrop: '#020804',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 2000,
    sound: { v: 1, inst: 'tine', tonic: 69, score },
};
