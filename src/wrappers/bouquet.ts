import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Kraft bouquet — flowers for her, drawn as a BOTANICAL SKETCHBOOK PLATE: a
 * sepia pen that goes from a broken hairline to a firm, tapering pressure
 * stroke; watercolour laid loosely after the line, running past it on one
 * side and stopping short on the other, colours run together wet, pigment
 * pooled at the edges; bare paper left in some blooms; the tooth of the paper
 * over all of it. A light, warm sheet.
 *
 * Closed: ONE sheet of kraft rolled into a cone round the bouquet, its front
 * edge lapping over, tied with jute; buds and eucalyptus tips just show at
 * the mouth. Beside it lie the painter's trial dabs, a loose stem, a sprig, a
 * spool of jute. Opening: the bow is pulled undone and the twine slips off;
 * the front of the cone swings round to both sides and is gone edge-on, and
 * the sheet falls open and lies flat behind the flowers like a collar, one
 * wing higher than the other; meanwhile the blooms are already opening — a
 * peony three-quarters on, one in profile, one drooping over the paper,
 * ranunculus spirals, closed buds — and the green spreads; petals drift and a
 * few come to rest. No text: the frame shows the gift.
 *
 * Canvas 360x450. The art is drawn where it is when OPEN, except the front of
 * the cone, which is drawn closed (scripts/art/bouquet.gen.mjs: each SVG's
 * viewBox is its box). Everything of the bouquet turns and grows about TIE.
 */

const TIE: readonly [number, number] = [180, 300];
type Box = readonly [number, number, number, number];
/** The tie as a pivot of a layer's box. */
const atTie = (b: Box): [number, number] => [(TIE[0] - b[0]) / b[2], (TIE[1] - b[1]) / b[3]];

const BOX = {
    sheet: [28, 70, 308, 306],
    frontL: [108, 104, 144, 216],
    frontR: [108, 104, 144, 226],
    eucL: [24, 30, 164, 274],
    eucR: [172, 30, 164, 274],
    fill: [26, 30, 308, 274],
} as const satisfies Record<string, Box>;

/** The bouquet's own plane. */
const D = 0.42;

/** A bloom opens: from where it waited (offset and small) to its place. */
const bloom = (layer: string, at: number, dur = 1200): Step => ({ kind: 'move', layer, at, dur, ease: 'back', to: { x: 0, y: 0, sx: 1, sy: 1 } });
const show = (layer: string, at: number): Step => ({ kind: 'move', layer, at, dur: 260, ease: 'out', to: { opacity: 1 } });

const open: Step[] = [
    // 1. The bow is pulled undone: the loops run out through the knot, the ends lengthen and swing.
    { kind: 'move', layer: 'bow', at: 0, dur: 520, ease: 'in', to: { sx: 0.16, sy: 0.5 } },
    { kind: 'move', layer: 'bow', at: 340, dur: 240, ease: 'linear', to: { opacity: 0 } },
    { kind: 'move', layer: 'tails', at: 0, dur: 580, ease: 'inout', to: { sy: 1.22, turn: -5 } },
    // 2. The twine slackens and slips off down the stems.
    { kind: 'move', layer: 'twine', at: 380, dur: 340, ease: 'inout', to: { sx: 1.18, sy: 1.25, y: 4 } },
    { kind: 'move', layer: 'twine', at: 720, dur: 700, ease: 'in', to: { y: 86, turn: 14, opacity: 0 } },
    { kind: 'move', layer: 'tails', at: 680, dur: 720, ease: 'in', to: { y: 92, turn: 9, opacity: 0 } },
    // 3. The sheet falls open: the front of the cone swings round to each side, thins as it turns edge-on and
    //    is gone, while the sheet spreads flat behind.
    { kind: 'move', layer: 'front-l', at: 800, dur: 1500, ease: 'inout', to: { turn: -42, sx: 0.1, y: 6 } },
    { kind: 'move', layer: 'front-r', at: 880, dur: 1500, ease: 'inout', to: { turn: 44, sx: 0.1, y: 6 } },
    { kind: 'move', layer: 'front-l', at: 1650, dur: 650, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'front-r', at: 1730, dur: 650, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'sheet', at: 800, dur: 1700, ease: 'inout', to: { sx: 1, sy: 1 } },
    // What lay about is moved off the sheet.
    { kind: 'move', layer: 'desk-top', at: 600, dur: 1000, ease: 'inout', to: { opacity: 0 } },
    // 4. The green spreads.
    { kind: 'move', layer: 'euc-l', at: 850, dur: 1800, ease: 'inout', to: { turn: 0, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'euc-r', at: 930, dur: 1800, ease: 'inout', to: { turn: 0, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'fill', at: 1000, dur: 1900, ease: 'inout', to: { sx: 1, sy: 1 } },
    // 5. The blooms are already opening as the paper falls, one after another.
    bloom('bloom-a', 850, 1500),
    bloom('bloom-b', 1050, 1400),
    bloom('bloom-c', 1250, 1400),
    show('bloom-d', 1450),
    bloom('bloom-d', 1450),
    show('bloom-e', 1750),
    bloom('bloom-e', 1750),
    show('bloom-f', 2100),
    bloom('bloom-f', 2100, 1100),
    show('bloom-g', 2500),
    bloom('bloom-g', 2500, 1000),
    show('bloom-h', 2850),
    bloom('bloom-h', 2850, 1000),
    show('fill-front', 3100),
    { kind: 'move', layer: 'fill-front', at: 3100, dur: 1100, ease: 'out', to: { sx: 1, sy: 1, y: 0 } },
    // 6. Petals drift; a few come to rest on the sheet.
    { kind: 'scatter', layer: 'petal', at: 2400, dur: 2700, count: 9, spread: 150, fall: 150 },
    { kind: 'scatter', layer: 'petal', at: 3300, dur: 2700, count: 8, spread: 130, fall: 170 },
    { kind: 'move', layer: 'fallen', at: 4300, dur: 1400, ease: 'inout', to: { opacity: 1 } },
];

const idle: IdleStep[] = [
    { layer: 'tails', field: 'turn', amp: 1.3, period: 5200 },
    { layer: 'euc-l', field: 'turn', amp: 0.7, period: 6400 },
    { layer: 'euc-r', field: 'turn', amp: 0.7, period: 7100, phase: 0.4 },
    { layer: 'bloom-a', field: 'y', amp: 0.5, period: 5600, phase: 0.2 },
];

const afterglow: IdleStep[] = [
    { layer: 'euc-l', field: 'turn', amp: 0.9, period: 7000 },
    { layer: 'euc-r', field: 'turn', amp: 0.9, period: 8200, phase: 0.5 },
    { layer: 'fill', field: 'sx', amp: 0.008, period: 6100, phase: 0.3 },
    { layer: 'bloom-a', field: 'turn', amp: 0.8, period: 9000 },
    { layer: 'bloom-b', field: 'turn', amp: 1.1, period: 7700, phase: 0.3 },
    { layer: 'bloom-c', field: 'turn', amp: 1.0, period: 8300, phase: 0.6 },
    { layer: 'bloom-e', field: 'turn', amp: 1.2, period: 6800, phase: 0.2 },
    { layer: 'bloom-g', field: 'turn', amp: 1.4, period: 6200, phase: 0.8 },
];

const layers: LayerDef[] = [
    { id: 'ground', art: 'ground.svg', box: [-12, -12, 384, 474], depth: 0.05 },
    { id: 'desk-top', art: 'desk-top.svg', box: [0, 40, 360, 300], depth: 0.14 },
    // The one sheet of kraft: rolled narrow while wrapped, flat and wide when open.
    { id: 'sheet', art: 'sheet.svg', box: BOX.sheet, origin: atTie(BOX.sheet), start: { sx: 0.2, sy: 0.9 }, depth: D - 0.06 },
    { id: 'stems', art: 'stems.svg', box: [100, 150, 160, 240], depth: D },
    { id: 'euc-l', art: 'euc-l.svg', box: BOX.eucL, origin: atTie(BOX.eucL), start: { turn: 24, sx: 0.8, sy: 0.8 }, depth: D },
    { id: 'euc-r', art: 'euc-r.svg', box: BOX.eucR, origin: atTie(BOX.eucR), start: { turn: -24, sx: 0.8, sy: 0.8 }, depth: D },
    { id: 'fill', art: 'fill.svg', box: BOX.fill, origin: atTie(BOX.fill), start: { sx: 0.2, sy: 0.7 }, depth: D },
    // The blooms that wait as buds at the mouth of the cone.
    { id: 'bloom-b', art: 'bloom-b.svg', box: [40, 64, 132, 132], start: { x: 50, y: -12, sx: 0.42, sy: 0.42 }, depth: D + 0.06 },
    { id: 'bloom-c', art: 'bloom-c.svg', box: [188, 62, 128, 128], start: { x: -47, y: -10, sx: 0.44, sy: 0.44 }, depth: D + 0.06 },
    { id: 'bloom-a', art: 'bloom-a.svg', box: [101, 30, 160, 160], start: { x: -1, y: 2, sx: 0.38, sy: 0.38 }, depth: D + 0.1 },
    // The front of the rolled cone: the under-lap, and the edge that laps over it.
    { id: 'front-l', art: 'front-l.svg', box: BOX.frontL, origin: atTie(BOX.frontL), depth: D + 0.12 },
    { id: 'front-r', art: 'front-r.svg', box: BOX.frontR, origin: atTie(BOX.frontR), depth: D + 0.12 },
    // The blooms that come up once the paper has fallen.
    { id: 'bloom-g', art: 'bloom-g.svg', box: [36, 140, 88, 88], start: { opacity: 0, x: 60, y: -20, sx: 0.3, sy: 0.3 }, depth: D + 0.16 },
    { id: 'bloom-h', art: 'bloom-h.svg', box: [252, 130, 80, 80], start: { opacity: 0, x: -60, y: -12, sx: 0.3, sy: 0.3 }, depth: D + 0.16 },
    { id: 'bloom-d', art: 'bloom-d.svg', box: [74, 136, 120, 120], start: { opacity: 0, x: 30, y: -20, sx: 0.3, sy: 0.3 }, depth: D + 0.2 },
    { id: 'bloom-e', art: 'bloom-e.svg', box: [170, 136, 124, 124], start: { opacity: 0, x: -36, y: -22, sx: 0.3, sy: 0.3 }, depth: D + 0.2 },
    { id: 'bloom-f', art: 'bloom-f.svg', box: [136, 190, 92, 92], start: { opacity: 0, y: -40, sx: 0.3, sy: 0.3 }, depth: D + 0.26 },
    { id: 'fill-front', art: 'fill-front.svg', box: [96, 140, 176, 136], origin: [84 / 176, 122 / 136], start: { opacity: 0, sx: 0.5, sy: 0.5, y: -10 }, depth: D + 0.28 },
    { id: 'twine', art: 'twine.svg', box: [158, 284, 44, 30], depth: D + 0.14 },
    { id: 'tails', art: 'tails.svg', box: [154, 296, 56, 78], origin: [26 / 56, 6 / 78], depth: D + 0.16 },
    { id: 'bow', art: 'bow.svg', box: [136, 280, 88, 32], origin: [44 / 88, 20.5 / 32], depth: D + 0.16 },
    { id: 'petal', art: 'petal.svg', box: [172, 150, 18, 16], depth: 0.5 },
    { id: 'fallen', art: 'fallen.svg', box: [20, 190, 324, 196], start: { opacity: 0 }, depth: 0.12 },
    { id: 'tooth', art: 'tooth.svg', box: [-12, -12, 384, 474], depth: 0.05 },
];

export const bouquet: WrapperDef = {
    id: 'bouquet',
    name: { vi: 'Bó giấy kraft', en: 'Kraft bouquet' },
    ambient: ['#F1E2C6', '#D9A3A0', '#B58E62'],
    blurb: {
        vi: 'Bó hoa gói giấy kraft, buộc dây đay, vẽ bút sắt và màu nước. Tháo dây: giấy mở ra, mẫu đơn và mao lương nở lần lượt, cánh hoa rơi.',
        en: 'A kraft-wrapped bouquet in pen and watercolour. Untie the jute: the paper opens, peonies and ranunculus bloom one by one, petals drift.',
    },
    // Cream paper, sepia for text, one dusty rose; a warm dark room around the sheet.
    theme: { ground: '#35271A', surface: '#F7EFE0', ink: '#17100B', accent: '#A54E62', onAccent: '#FFFFFF', material: 'glass', corner: 'round', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.46],
    size: [360, 450],
    backdrop: '#F3E6CE',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 3300,
    // Broken chords in three, plucked like a small harp.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 69,
        score: scaled(0.75, together(
            tune(138, 'E5/8 A5/8 C#6/4 A5/4 | F#5/8 A5/8 D6/4 A5/4 | E5/8 A5/8 C#6/4 E6/4 | A5/2.!', { beats: 3 }),
            tune(138, 'A3/2. | D3/2. | A3/2. | A3/2.', { beats: 3, gain: 0.4 }),
        )),
    },
};
