import type { IdleStep, LayerDef, NoteDef, Step, WrapperDef } from '../stage/format';

/**
 * Flap board — for a trip, a welcome, a surprise announced. A split-flap
 * departure board, the mechanical kind of old stations, as a flat graphic:
 * six columns by seven rows of dark flaps in a slim metal housing, hung by
 * two arms in a dim hall, a loose diagonal of flaps already showing colour.
 * Opening: the rows turn over one after another from the top while a light
 * runs down the board on the diagonal, and the new faces together make one
 * picture across the whole board, a wrapped parcel. The middle row turns
 * last; its four middle flaps part along their hinge, the leaves slide in
 * under the rows above and below, and a bright window is bared at the focus.
 *
 * No letter, digit or glyph anywhere: the flaps carry colour and plain fields.
 *
 * How the turn is made. The stage scales whole layers, and a flap turns about
 * its own hinge line, so flaps that share a layer must share a hinge: a layer
 * is a ROW. Each row has a closed face that scales to nothing about the hinge
 * and an open face that scales up from it a beat later. The diagonal is in the
 * timing (top to bottom) and in the light that travels from the top left to
 * the bottom right; it is not a per-flap diagonal, which 24 layers cannot hold.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/flap.gen.mjs): each SVG's viewBox is its box. The boxes below
 * are computed here by the same grid arithmetic as the generator's.
 */

const COLS = 6, FW = 46, FH = 46, GX = 4, GY = 3, X0 = 32, Y0 = 50;
const BW = COLS * FW + (COLS - 1) * GX;
const rowY = (r: number): number => Y0 + r * (FH + GY);
const rowBox = (r: number): readonly [number, number, number, number] => [X0, rowY(r), BW, FH];
const MID = 3;
/** The parcel's columns: the four in the middle. */
const PX = X0 + FW + GX, PW = 4 * FW + 3 * GX;
/** Everything of the board is one plane. */
const NEAR = 0.22;
/** How far a parted leaf slides: its own height and the gap, so that it lies wholly under the next row. */
const PART = FH / 2 + GY;

/** The rows in the order they turn: top to bottom, the middle one last. */
const ORDER = [0, 1, 2, 4, 5, 6] as const;
const FIRST = 180, EVERY = 200;
const MID_AT = FIRST + ORDER.length * EVERY + 120;
const PART_AT = MID_AT + 400;

/** One row turning over at `at`: the closed face folds to its hinge, the open face unfolds from it and lands with a small shake. */
const turn = (closed: readonly string[], opened: readonly string[], at: number): Step[] => [
    ...closed.map((layer): Step => ({ kind: 'move', layer, at, dur: 130, ease: 'in', to: { sy: 0 } })),
    ...opened.map((layer): Step => ({ kind: 'move', layer, at: at + 120, dur: 170, ease: 'back', to: { sy: 1 } })),
    { kind: 'shake', layer: opened[0]!, at: at + 290, dur: 170, amp: 1.2, times: 2 },
];

const open: Step[] = [
    // 1. A light sets off down the board from the top left as the first row turns.
    { kind: 'move', layer: 'glint', at: 100, dur: 200, to: { opacity: 1 } },
    { kind: 'move', layer: 'glint', at: 100, dur: MID_AT + 200, ease: 'linear', to: { x: 86, y: 132 } },
    { kind: 'move', layer: 'glint', at: MID_AT, dur: 300, to: { opacity: 0 } },
    // 2. The rows turn over, top to bottom. The flap that trembled turns with its row.
    ...ORDER.flatMap((r, i) => turn(r === 4 ? [`a${r}`, 'flick'] : [`a${r}`], [`b${r}`], FIRST + i * EVERY)),
    // 3. The middle row turns last.
    ...turn(['a3'], ['mid-side', 'mid-up', 'mid-low'], MID_AT),
    // 4. Its four middle flaps part along the hinge; the window behind them is lit.
    { kind: 'move', layer: 'window', at: PART_AT - 30, dur: 30, to: { opacity: 1 } },
    { kind: 'move', layer: 'mid-up', at: PART_AT, dur: 380, ease: 'inout', to: { y: -PART } },
    { kind: 'move', layer: 'mid-low', at: PART_AT, dur: 380, ease: 'inout', to: { y: PART } },
    { kind: 'move', layer: 'glow', at: PART_AT + 60, dur: 420, ease: 'out', to: { opacity: 0.7 } },
    { kind: 'scatter', layer: 'spark', at: PART_AT + 100, dur: 700, count: 14, spread: 120, fall: 26 },
];

const lamp: IdleStep = { layer: 'lamp', field: 'opacity', amp: 0.35, period: 3400 };

const idle: IdleStep[] = [
    lamp,
    // One flap is not quite seated: it quivers a hair about its hinge.
    { layer: 'flick', field: 'sy', amp: 0.05, period: 1400 },
];

const afterglow: IdleStep[] = [
    lamp,
    { layer: 'glow', field: 'opacity', amp: 0.18, period: 3800 },
];

/** A clack for each row as it lands, rising; then a bell as the window opens. */
const CLACKS = [60, 62, 64, 67, 69, 72];
const score: NoteDef[] = [
    ...ORDER.map((_, i): NoteDef => ({ at: FIRST + i * EVERY + 120, pitch: CLACKS[i]!, dur: 60, gain: 0.34 + i * 0.02, inst: 'wood' })),
    { at: MID_AT + 120, pitch: 76, dur: 60, gain: 0.5, inst: 'wood' },
    { at: PART_AT + 100, pitch: 72, dur: 1800, gain: 0.5 },
    { at: PART_AT + 100, pitch: 79, dur: 1800, gain: 0.24 },
    { at: PART_AT + 100, pitch: 60, dur: 1800, gain: 0.22 },
];

const layers: LayerDef[] = [
    { id: 'hall', art: 'hall.svg', box: [-6, -6, 372, 462], depth: 0.04 },
    { id: 'housing', art: 'housing.svg', box: [8, -6, 344, 442], depth: NEAR },
    { id: 'lamp', art: 'lamp.svg', box: [281, 400, 30, 30], start: { opacity: 0.6 }, depth: NEAR },
    // The window lies under the leaves that part, and they under the rows above and below.
    { id: 'window', art: 'window.svg', box: [PX, rowY(MID), PW, FH], start: { opacity: 0 }, depth: NEAR },
    { id: 'mid-up', art: 'mid-up.svg', box: [PX, rowY(MID), PW, FH / 2], origin: [0.5, 1], start: { sy: 0 }, depth: NEAR },
    { id: 'mid-low', art: 'mid-low.svg', box: [PX, rowY(MID) + FH / 2, PW, FH / 2], origin: [0.5, 0], start: { sy: 0 }, depth: NEAR },
    { id: 'mid-side', art: 'mid-side.svg', box: rowBox(MID), start: { sy: 0 }, depth: NEAR },
    { id: 'a3', art: 'a3.svg', box: rowBox(MID), depth: NEAR },
    ...ORDER.flatMap((r): LayerDef[] => [
        { id: `a${r}`, art: `a${r}.svg`, box: rowBox(r), depth: NEAR },
        ...(r === 4 ? [{ id: 'flick', art: 'flick.svg', box: [X0 + 4 * (FW + GX), rowY(4), FW, FH], depth: NEAR } satisfies LayerDef] : []),
        { id: `b${r}`, art: `b${r}.svg`, box: rowBox(r), start: { sy: 0 }, depth: NEAR },
    ]),
    { id: 'glint', art: 'glint.svg', box: [88, 170, 184, 100], start: { opacity: 0, x: -86, y: -132 }, depth: NEAR },
    { id: 'glow', art: 'glow.svg', box: [24, 124, 312, 192], start: { opacity: 0 }, depth: NEAR },
    { id: 'spark', art: 'spark.svg', box: [176, 216, 8, 8] },
];

export const flap: WrapperDef = {
    id: 'flap',
    name: { vi: 'Bảng lật', en: 'Flap board' },
    ambient: ['#14161A', '#F5B82E', '#1E9E8F'],
    blurb: {
        vi: 'Bảng giờ tàu kiểu lá lật. Từng hàng lật xuống, ghép thành một gói quà, rồi hàng giữa tách đôi để lộ ô sáng.',
        en: 'A split-flap station board. Row by row the flaps turn into one wrapped parcel, then the middle row parts on a bright window.',
    },
    // The board's own black as wire, warm white for the words, the signal yellow for the one loud colour.
    theme: { ground: '#14161A', surface: '#22262D', ink: '#F3EFE6', accent: '#F5B82E', onAccent: '#14161A', material: 'wire', corner: 'cut', face: 'mono', voice: 'servo' },
    focus: [0.5, 0.49],
    size: [360, 450],
    backdrop: '#14161A',
    layers,
    idle,
    afterglow,
    open,
    revealAt: PART_AT + 100,
    sound: { v: 1, inst: 'bell', tonic: 72, score },
};
