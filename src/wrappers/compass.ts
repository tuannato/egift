import type { IdleStep, NoteDef, Step, WrapperDef } from '../stage/format';

/**
 * Compass — for setting out: a graduation, a new job, a long road. A nautical
 * chart seen from above, in warm paper tones with fine contour lines: two
 * coasts, islands, soundings as dots, a parallel rule across one corner and
 * a pair of dividers across another. On it lies a brass pocket compass, its
 * lid shut and engraved with a rosette of rays, a leather strap buckled over
 * it. Opening: the catch pops and the strap slips off, the lid stands up on
 * its hinge, the needle spins two and a half turns, slows, runs a little past
 * and comes back; then a route is dotted across the chart the way the needle
 * points, to a port marked in red.
 *
 * No letter and no figure anywhere: ticks only, and one red triangle for north.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/compass.gen.mjs): each SVG's viewBox is its box.
 */

/** The closed lid and the light on it share one box and fold about the hinge at its top edge. */
const LID: readonly [number, number, number, number] = [92, 137, 176, 176];
/** Everything of the compass moves as one plane. */
const NEAR = 0.34;
/** The route lies on the chart. */
const FAR = 0.05;

const ROUTE = ['route-1', 'route-2', 'route-3', 'route-4'] as const;

const open: Step[] = [
    // 1. The catch pops; the strap slips off and comes to lie across the lower left corner.
    { kind: 'shake', layer: 'lid', at: 0, dur: 240, amp: 1.8, times: 3 },
    { kind: 'shake', layer: 'glint', at: 0, dur: 240, amp: 1.8, times: 3 },
    { kind: 'shake', layer: 'strap', at: 0, dur: 240, amp: 2.4, times: 3 },
    { kind: 'move', layer: 'strap', at: 140, dur: 560, ease: 'inout', to: { x: -208, y: 59, turn: 50 } },
    // 2. The lid flips up about its hinge: the outside folds away, the inside stands up above the hinge.
    { kind: 'move', layer: 'glint', at: 300, dur: 160, to: { opacity: 0 } },
    { kind: 'move', layer: 'glint', at: 380, dur: 240, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'lid', at: 380, dur: 240, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'lid-open', at: 620, dur: 320, ease: 'back', to: { sy: 1 } },
    // 3. The needle spins two and a half turns, slowing, runs twelve degrees past, and comes back.
    { kind: 'move', layer: 'needle', at: 640, dur: 1080, ease: 'out', to: { turn: 12 } },
    { kind: 'move', layer: 'needle', at: 1720, dur: 260, ease: 'inout', to: { turn: 0 } },
    { kind: 'scatter', layer: 'spark', at: 1760, dur: 800, count: 10, spread: 112, fall: 18 },
    // 4. The route, two dots at a time, the way the needle points; last the port, in red.
    ...ROUTE.map((layer, i): Step => ({ kind: 'move', layer, at: 1900 + i * 140, dur: 150, ease: 'out', to: { opacity: 1 } })),
    { kind: 'move', layer: 'mark', at: 2400, dur: 200, ease: 'back', to: { sx: 1, sy: 1 } },
];

const idle: IdleStep[] = [
    // A slow glint on the lid.
    { layer: 'glint', field: 'opacity', amp: 0.38, period: 5200 },
];

const afterglow: IdleStep[] = [
    // The needle never quite lies still.
    { layer: 'needle', field: 'turn', amp: 1.5, period: 1500 },
    { layer: 'mark', field: 'sx', amp: 0.06, period: 3200 },
    { layer: 'mark', field: 'sy', amp: 0.06, period: 3200 },
];

/** The needle's ticks: close together while it spins fast, further apart as it slows. */
const TICKS = [640, 705, 775, 855, 945, 1050, 1170, 1310, 1480, 1700];
const score: NoteDef[] = [
    { at: 0, pitch: 62, dur: 70, gain: 0.4, inst: 'wood' },
    ...TICKS.map((at, i): NoteDef => ({ at, pitch: i % 2 === 0 ? 86 : 81, dur: 60, gain: 0.34 - i * 0.012 })),
    { at: 2100, pitch: 74, dur: 1900, gain: 0.5, inst: 'bell' },
    { at: 2100, pitch: 62, dur: 1900, gain: 0.26, inst: 'bell' },
];

export const compass: WrapperDef = {
    id: 'compass',
    name: { vi: 'La bàn', en: 'Compass' },
    ambient: ['#1B2A47', '#CFA552', '#EFE3C8'],
    blurb: {
        vi: 'Hải đồ giấy ấm và chiếc la bàn đồng. Nắp bật, kim quay rồi dừng, và một lộ trình chấm dần tới bến đỏ.',
        en: 'A warm paper chart and a brass compass. The lid flips up, the needle spins and settles, and a route is dotted to a red port.',
    },
    // The needle's dark blue as lacquer, the dial's cream for the words, brass for the one loud colour.
    theme: { ground: '#0B1220', surface: '#1B2A47', ink: '#F8F1DE', accent: '#CFA552', onAccent: '#0B1220', material: 'lacquer', corner: 'soft', face: 'serif', voice: 'chime' },
    focus: [0.5, 0.5],
    size: [360, 450],
    backdrop: '#EFE3C8',
    layers: [
        { id: 'chart', art: 'chart.svg', box: [-6, -6, 372, 462], depth: FAR },
        ...ROUTE.map((id, i) => ({ id, art: `${id}.svg`, box: ([[245, 132, 14, 15], [255, 120, 14, 15], [265, 109, 14, 15], [275, 97, 14, 15]] as const)[i]!, start: { opacity: 0 }, depth: FAR })),
        { id: 'mark', art: 'mark.svg', box: [271, 53, 60, 60], start: { sx: 0, sy: 0 }, depth: FAR },
        { id: 'ruler', art: 'ruler.svg', box: [-6, -6, 156, 136], depth: 0.16 },
        { id: 'dividers', art: 'dividers.svg', box: [250, 342, 104, 106], depth: 0.2 },
        { id: 'case', art: 'case.svg', box: [79, 124, 208, 216], depth: NEAR },
        // Drawn at rest; it starts two and a half turns back, so the red half begins pointing the other way.
        { id: 'needle', art: 'needle.svg', box: [120, 165, 120, 120], start: { turn: -900 }, depth: NEAR },
        { id: 'lid-open', art: 'lid-open.svg', box: [92, 39, 176, 98], origin: [0.5, 1], start: { sy: 0 }, depth: NEAR },
        { id: 'lid', art: 'lid.svg', box: LID, origin: [0.5, 0], depth: NEAR },
        { id: 'glint', art: 'glint.svg', box: LID, origin: [0.5, 0], start: { opacity: 0.5 }, depth: NEAR },
        { id: 'hinge', art: 'hinge.svg', box: [158, 129, 44, 16], depth: NEAR },
        { id: 'strap', art: 'strap.svg', box: [-50, 258, 460, 34], start: { turn: -12 }, depth: 0.5 },
        { id: 'spark', art: 'spark.svg', box: [176, 221, 8, 8] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2100,
    // A wooden click for the catch, tine ticks that slow with the needle, one bell as it finds its bearing.
    sound: { v: 1, inst: 'tine', tonic: 74, score },
};
