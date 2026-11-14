import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { together, tune } from './tune';

/**
 * Dó paper — the traditional Tết wrapper, drawn as a Vietnamese folk woodblock
 * print (Đông Hồ spirit): flat blocks of colour printed a little off register
 * from a bold black key block, the grain of the wood and starved ink inside
 * the colours, paper fibres and the "điệp" shell sheen of the sheet. Six inks:
 * dó ivory, soot black, brick red, pine-leaf green, indigo, turmeric yellow.
 *
 * Closed: a parcel of dó paper on a deep soot-brown ground printed with a peach
 * limb and a kumquat limb, tied both ways with a twisted cord and a bow.
 * Opening: the bow is pulled undone and the cord drops; the two small flaps
 * turn out, the two doors swing open like petals and the sheet lies flat,
 * three panels wide. Then the print is pulled, block after block as a printer
 * would: turmeric, brick red, green and indigo, and last the black key block,
 * at which the picture snaps into being — a pair of carp circling a pearl
 * over the water, a peach limb in flower, a kumquat sprig, a tray of five
 * fruits. Peach petals fall; the shell flecks go on catching the light.
 * No text and no figures: the frame shows the gift.
 *
 * Canvas 360x450. The open sheet is 30..330 x 98..298 (inside the
 * frame's side fades); the parcel is its centre panel, 105..255. Each fold is a scale through zero at its hinge: the
 * outside closes to the hinge line, then the inside opens from it. The art is
 * generated in canvas coordinates (scripts/art/dopaper.gen.mjs): each SVG's
 * viewBox is its box.
 */

/** One pull of a block: the ink lands at once, the sheet gives a little under the baren. */
const pull = (layer: string, at: number): Step[] => [
    { kind: 'move', layer, at, dur: 90, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer, at, dur: 260, ease: 'out', to: { sx: 1, sy: 1 } },
];

const open: Step[] = [
    // 1. The bow is pulled undone: the loops draw into the knot, the knot gives.
    { kind: 'shake', layer: 'knot', at: 0, dur: 300, amp: 1, times: 3 },
    { kind: 'move', layer: 'glint', at: 0, dur: 600, ease: 'out', to: { opacity: 0 } },
    { kind: 'move', layer: 'loop-l', at: 60, dur: 440, ease: 'inout', to: { sx: 0.2, sy: 0.4, turn: -12 } },
    { kind: 'move', layer: 'loop-r', at: 120, dur: 440, ease: 'inout', to: { sx: 0.2, sy: 0.4, turn: 12 } },
    { kind: 'move', layer: 'loop-l', at: 520, dur: 120, ease: 'in', to: { sx: 0, sy: 0 } },
    { kind: 'move', layer: 'loop-r', at: 560, dur: 120, ease: 'in', to: { sx: 0, sy: 0 } },
    { kind: 'move', layer: 'knot', at: 560, dur: 160, ease: 'in', to: { sx: 0, sy: 0 } },
    // 2. The cord slackens and drops off the parcel.
    { kind: 'move', layer: 'cord', at: 640, dur: 160, ease: 'out', to: { y: -4, sx: 1.03 } },
    { kind: 'move', layer: 'cord', at: 800, dur: 520, ease: 'in', to: { y: 240, turn: -6 } },
    { kind: 'move', layer: 'cord', at: 1040, dur: 280, ease: 'in', to: { opacity: 0 } },
    // 3. The two small flaps turn out, top then bottom.
    { kind: 'move', layer: 'flap-t-out', at: 1000, dur: 260, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'flap-t-out', at: 1260, dur: 0, to: { opacity: 0 } },
    { kind: 'move', layer: 'flap-t-in', at: 1260, dur: 340, ease: 'out', to: { sy: 1 } },
    { kind: 'move', layer: 'flap-b-out', at: 1140, dur: 260, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'flap-b-out', at: 1400, dur: 0, to: { opacity: 0 } },
    { kind: 'move', layer: 'flap-b-in', at: 1400, dur: 340, ease: 'out', to: { sy: 1 } },
    // 4. The doors swing open, left then right, and the sheet lies flat.
    { kind: 'move', layer: 'door-l-out', at: 1560, dur: 400, ease: 'in', to: { sx: 0 } },
    { kind: 'move', layer: 'door-l-out', at: 1960, dur: 0, to: { opacity: 0 } },
    { kind: 'move', layer: 'door-l-in', at: 1960, dur: 520, ease: 'out', to: { sx: 1 } },
    { kind: 'move', layer: 'door-r-out', at: 1740, dur: 400, ease: 'in', to: { sx: 0 } },
    { kind: 'move', layer: 'door-r-out', at: 2140, dur: 0, to: { opacity: 0 } },
    { kind: 'move', layer: 'door-r-in', at: 2140, dur: 520, ease: 'out', to: { sx: 1 } },
    { kind: 'move', layer: 'spark-a', at: 2300, dur: 500, ease: 'out', to: { opacity: 0.9 } },
    { kind: 'move', layer: 'spark-b', at: 2300, dur: 500, ease: 'out', to: { opacity: 0.35 } },
    // 5. The print is pulled, block after block; the black key block comes last.
    ...pull('pass-y', 2760),
    ...pull('pass-r', 3080),
    ...pull('pass-c', 3400),
    ...pull('pass-k', 3780),
    // 6. Peach petals fall across the sheet.
    { kind: 'scatter', layer: 'petal', at: 3900, dur: 1700, count: 9, spread: 150, fall: 120 },
];

const idle: IdleStep[] = [
    { layer: 'loop-l', field: 'turn', amp: 2.2, period: 4400 },
    { layer: 'loop-r', field: 'turn', amp: 2.2, period: 4400, phase: 0.4 },
    { layer: 'glint', field: 'opacity', amp: 0.4, period: 3600 },
    { layer: 'peach', field: 'turn', amp: 0.35, period: 7600 },
    { layer: 'kumquat', field: 'turn', amp: 0.4, period: 6400, phase: 0.3 },
];

const afterglow: IdleStep[] = [
    { layer: 'spark-a', field: 'opacity', amp: 0.45, period: 3200 },
    { layer: 'spark-b', field: 'opacity', amp: 0.45, period: 3200, phase: 0.5 },
    { layer: 'peach', field: 'turn', amp: 0.35, period: 7600 },
    { layer: 'kumquat', field: 'turn', amp: 0.4, period: 6400, phase: 0.3 },
];

const SHEET = [30, 98, 300, 200] as const;
const BLOCK = { opacity: 0, sx: 1.025, sy: 1.025 } as const;

export const dopaper: WrapperDef = {
    id: 'dopaper',
    name: { vi: 'Giấy dó', en: 'Dó paper' },
    ambient: ['#261911', '#B4412A', '#D9A22E'],
    blurb: {
        vi: 'Gói quà giấy dó buộc dây xoắn, in mộc bản kiểu tranh dân gian. Giấy mở ra, từng bản màu in xuống: đôi cá chép, cành đào, mâm ngũ quả.',
        en: 'A dó-paper parcel tied with twisted cord, drawn as a folk woodblock print. It unfolds and prints block by block: carp, peach, five fruits.',
    },
    // Dó ivory for the face, soot for the type, brick red for the one loud colour, in a soot-brown room.
    theme: { ground: '#120C08', surface: '#F7EDD5', ink: '#0D0A08', accent: '#A8371F', onAccent: '#FFF6E2', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 198 / 450],
    size: [360, 450],
    backdrop: '#261911',
    layers: [
        { id: 'ground', art: 'ground.svg', box: [-10, -10, 380, 470], depth: 0.04 },
        { id: 'peach', art: 'peach.svg', box: [-10, 30, 290, 430], origin: [0.1, 1], depth: 0.16 },
        { id: 'kumquat', art: 'kumquat.svg', box: [200, 30, 170, 430], origin: [1, 0], depth: 0.22 },
        { id: 'mid', art: 'mid.svg', box: [105, 98, 150, 200], depth: 0.5 },
        { id: 'door-l-in', art: 'door-l-in.svg', box: [30, 98, 75, 200], origin: [1, 0.5], start: { sx: 0 }, depth: 0.5 },
        { id: 'door-r-in', art: 'door-r-in.svg', box: [255, 98, 75, 200], origin: [0, 0.5], start: { sx: 0 }, depth: 0.5 },
        { id: 'flap-t-in', art: 'flap-t-in.svg', box: [105, 72, 150, 26], origin: [0.5, 1], start: { sy: 0 }, depth: 0.5 },
        { id: 'flap-b-in', art: 'flap-b-in.svg', box: [105, 298, 150, 26], origin: [0.5, 0], start: { sy: 0 }, depth: 0.5 },
        { id: 'pass-y', art: 'pass-y.svg', box: SHEET, start: BLOCK, depth: 0.5 },
        { id: 'pass-r', art: 'pass-r.svg', box: SHEET, start: BLOCK, depth: 0.5 },
        { id: 'pass-c', art: 'pass-c.svg', box: SHEET, start: BLOCK, depth: 0.5 },
        { id: 'pass-k', art: 'pass-k.svg', box: SHEET, start: BLOCK, depth: 0.5 },
        { id: 'spark-a', art: 'spark-a.svg', box: SHEET, start: { opacity: 0 }, depth: 0.5 },
        { id: 'spark-b', art: 'spark-b.svg', box: SHEET, start: { opacity: 0 }, depth: 0.5 },
        { id: 'door-l-out', art: 'door-l-out.svg', box: [105, 98, 75, 200], origin: [0, 0.5], depth: 0.5 },
        { id: 'door-r-out', art: 'door-r-out.svg', box: [180, 98, 75, 200], origin: [1, 0.5], depth: 0.5 },
        { id: 'flap-t-out', art: 'flap-t-out.svg', box: [105, 98, 150, 26], origin: [0.5, 0], depth: 0.5 },
        { id: 'flap-b-out', art: 'flap-b-out.svg', box: [105, 272, 150, 26], origin: [0.5, 1], depth: 0.5 },
        { id: 'glint', art: 'glint.svg', box: [105, 98, 150, 200], start: { opacity: 0.55 }, depth: 0.5 },
        { id: 'cord', art: 'cord.svg', box: [99, 94, 162, 208], depth: 0.56 },
        { id: 'loop-l', art: 'loop-l.svg', box: [132, 168, 52, 38], origin: [0.94, 0.79], depth: 0.56 },
        { id: 'loop-r', art: 'loop-r.svg', box: [176, 168, 52, 38], origin: [0.06, 0.79], depth: 0.56 },
        { id: 'knot', art: 'knot.svg', box: [170, 188, 20, 20], depth: 0.56 },
        { id: 'petal', art: 'petal.svg', box: [172, 150, 16, 18] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 3900,
    // A bamboo-flute line on five notes (D E F# A B), over a wooden beat.
    sound: {
        v: 1,
        inst: 'reed',
        tonic: 74,
        score: together(
            tune(126, 'A4/8 B4/8 D5/4 F#5/8 E5/8 D5/4 | B4/8 D5/8 E5/8 F#5/8 A5/4 F#5/4 | D5/1!'),
            tune(126, 'D3/4 -/4 D3/4 -/4 | D3/4 -/4 D3/4 D3/4 | D3/2 -/2', { inst: 'wood', gain: 0.45 }),
        ),
    },
};
