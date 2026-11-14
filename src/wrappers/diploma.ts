import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Diploma scroll — the graduation wrapper, drawn as banknote / steel
 * engraving: everything is fine line work (rose-engine rosettes, lathe-work
 * borders, ruling whose thickness makes the tone, laurel shaded by nested
 * contour lines). Navy and gold inks on cream paper, one deep red; flat fills
 * only for a thing's own colour, no gradient, no blur.
 * Closed: a rolled diploma, tied with a deep-red ribbon and a pleated ribbon
 * rosette, lies across a gold rosette cut into a ruled navy plate.
 * Opening: the rosette drops away, the ribbon slips off the end of the roll,
 * the roll stands up at the left and unrolls to the right over an engraved
 * certificate (lathe-work frame, a radiant engraved medallion inside two
 * laurel branches); the rosette comes back down as its seal and laurel leaves
 * fall.
 *
 * The unrolling is a wipe, not a squash: the certificate lies still under a
 * `cover` cut from the same ruled plate. The cover holds horizontal lines
 * only, so narrowing it sideways (sx) changes nothing but its width; the roll
 * rides its edge.
 *
 * Canvas 360x462 (the plate runs 30 units higher than the usual 450, to fill the room under the page's labels). The art is generated in canvas coordinates
 * (scripts/art/diploma.gen.mjs): each SVG's viewBox is its box.
 */

/** The closed roll: carried from the sheet's left edge to the middle, and laid over. */
const LAID = { x: 150, y: 0, turn: 66 };
/** From the seal's place up to the knot: on the ribbon, at the roll's lower edge. */
const TIED = { x: 5, y: -87.5, turn: -9, sx: 0.88, sy: 0.88 };
/** How far the roll travels as it unrolls (the sheet is 300 wide; the last of the roll stays on its edge). */
const RUN = 296;

const open: Step[] = [
    // 1. The fastener: the rosette works loose and drops away, then the ribbon slips off the low end of the roll.
    { kind: 'shake', layer: 'rosette', at: 0, dur: 340, amp: 1.3, times: 3 },
    { kind: 'move', layer: 'rosette', at: 320, dur: 520, ease: 'in', to: { x: -10, y: TIED.y + 60, turn: -38, opacity: 0 } },
    { kind: 'move', layer: 'band', at: 520, dur: 560, ease: 'in', to: { x: -112, y: 50, opacity: 0 } },
    // 2. The plate's rosette winds down to a faint trace; it goes only once the sheet lies over it.
    { kind: 'move', layer: 'medal', at: 760, dur: 760, ease: 'inout', to: { opacity: 0.42, turn: 60 } },
    { kind: 'move', layer: 'fans', at: 860, dur: 620, ease: 'out', to: { opacity: 0.42 } },
    { kind: 'move', layer: 'medal', at: 2700, dur: 520, ease: 'out', to: { opacity: 0 } },
    { kind: 'move', layer: 'fans', at: 2700, dur: 520, ease: 'out', to: { opacity: 0 } },
    // 3. The roll stands up at the sheet's left edge.
    { kind: 'move', layer: 'roll', at: 1040, dur: 620, ease: 'inout', to: { x: 0, y: 0, turn: 0 } },
    // 4. It unrolls to the right; the cover is drawn aside with it.
    { kind: 'move', layer: 'roll', at: 1700, dur: 1500, ease: 'inout', to: { x: RUN, sx: 0.36 } },
    // What is left of it settles into the curled edge of the sheet.
    { kind: 'move', layer: 'curl', at: 3120, dur: 200, to: { opacity: 1 } },
    { kind: 'move', layer: 'roll', at: 3200, dur: 220, ease: 'in', to: { opacity: 0, sx: 0.3 } },
    { kind: 'move', layer: 'cover', at: 1700, dur: 1500, ease: 'inout', to: { sx: 0 } },
    { kind: 'move', layer: 'glory', at: 2500, dur: 1300, ease: 'out', to: { sx: 1, sy: 1, turn: 0 } },
    // The rays burst out of the medallion.
    { kind: 'move', layer: 'rays', at: 2750, dur: 800, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'rays', at: 2750, dur: 1100, ease: 'out', to: { turn: 0 } },
    // 5. The rosette comes down as the seal; laurel falls.
    { kind: 'move', layer: 'rosette', at: 2900, dur: 40, to: { x: 0, y: 0, turn: 0, sx: 1.7, sy: 1.7 } },
    { kind: 'move', layer: 'rosette', at: 3260, dur: 140, to: { opacity: 1 } },
    { kind: 'move', layer: 'rosette', at: 3260, dur: 460, ease: 'back', to: { sx: 1, sy: 1 } },
    // One band of light is drawn across the sheet: the gold ink catches it.
    { kind: 'move', layer: 'shine', at: 3500, dur: 160, to: { opacity: 1 } },
    { kind: 'move', layer: 'shine', at: 3500, dur: 1100, ease: 'inout', to: { x: 400 } },
    { kind: 'move', layer: 'shine', at: 4420, dur: 180, to: { opacity: 0 } },
    { kind: 'scatter', layer: 'leaf-a', at: 3500, dur: 1900, count: 9, spread: 190, fall: 150 },
    { kind: 'scatter', layer: 'leaf-b', at: 3640, dur: 2000, count: 8, spread: 230, fall: 175 },
];

const idle: IdleStep[] = [
    { layer: 'medal', field: 'turn', amp: 3.5, period: 11000 },
    { layer: 'rosette', field: 'turn', amp: 2.2, period: 4600 },
];

const afterglow: IdleStep[] = [
    { layer: 'glory', field: 'turn', amp: 11, period: 12000 },
    { layer: 'rays', field: 'turn', amp: 5.6, period: 7000 },
    { layer: 'rays', field: 'sx', amp: 0.04, period: 3800 },
    { layer: 'rays', field: 'sy', amp: 0.04, period: 3800 },
    { layer: 'rosette', field: 'turn', amp: 1.4, period: 5200 },
];

export const diploma: WrapperDef = {
    id: 'diploma',
    name: { vi: 'Ống bằng', en: 'Diploma scroll' },
    ambient: ['#0E1A38', '#CDA954', '#8C1C26'],
    blurb: {
        vi: 'Khắc nét như tờ giấy bạc: ống bằng buộc nơ đỏ trên nền hoa văn tiện. Ruy băng tuột, bằng trải ra: vòng nguyệt quế ôm huy chương tỏa tia.',
        en: 'Engraved like a banknote: a rolled diploma tied in deep red. The ribbon slips off and it unrolls to laurel round a radiant medallion.',
    },
    // Cream paper, navy ink, the ribbon's red for the one loud colour.
    theme: { ground: '#0A1226', surface: '#F8F2E1', ink: '#070C1D', accent: '#8C1C26', onAccent: '#FFF6E0', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 229 / 462],
    size: [360, 462],
    backdrop: '#0E1A38',
    layers: [
        { id: 'ground', art: 'ground.svg', box: [-6, -6, 372, 474], depth: 0.2 },
        { id: 'sheet', art: 'sheet.svg', box: [30, 102, 300, 280], depth: 0.2 },
        { id: 'glory', art: 'glory.svg', box: [87, 127, 186, 186], start: { sx: 0.9, sy: 0.9, turn: -30 }, depth: 0.2 },
        { id: 'rays', art: 'rays.svg', box: [118, 158, 124, 124], start: { sx: 0.58, sy: 0.58, turn: -22.5 }, depth: 0.2 },
        { id: 'emblem', art: 'emblem.svg', box: [90, 132, 180, 176], depth: 0.2 },
        { id: 'cover', art: 'cover.svg', box: [29, 101, 302, 282], origin: [1, 0.5], depth: 0.2 },
        // Screened: gold on the navy plate, next to nothing on cream paper, so the plate's ornament can stay,
        // faint, behind the sheet while it unrolls.
        { id: 'fans', art: 'fans.svg', box: [29, 101, 302, 282], blend: 'screen', depth: 0.2 },
        { id: 'medal', art: 'medal.svg', box: [39, 101, 282, 282], blend: 'screen', depth: 0.26 },
        { id: 'shine', art: 'shine.svg', box: [-50, 102, 80, 280], blend: 'overlay', start: { opacity: 0 }, depth: 0.2 },
        { id: 'curl', art: 'curl.svg', box: [304, 95, 38, 292], start: { opacity: 0 }, depth: 0.3 },
        { id: 'roll', art: 'roll.svg', box: [6, 99, 60, 287], origin: [24 / 60, 0.5], start: LAID, depth: 0.4 },
        { id: 'band', art: 'band.svg', box: [148, 210, 64, 64], depth: 0.4 },
        { id: 'rosette', art: 'rosette.svg', box: [146, 313, 68, 84], origin: [0.5, 28 / 84], start: TIED, depth: 0.46 },
        { id: 'leaf-a', art: 'leaf-a.svg', box: [170, 166, 20, 12] },
        { id: 'leaf-b', art: 'leaf-b.svg', box: [172, 160, 16, 18] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 3300,
    // A quiet fanfare on a muted horn, over a plucked bass.
    sound: {
        v: 1,
        inst: 'brass',
        tonic: 72,
        score: scaled(1.3, together(
            tune(126, 'G4/8. G4/16 C5/4 E5/4 G5/4 | E5/8. G5/16 C6/2.!'),
            tune(126, 'C3/2 G3/2 | C3/1', { inst: 'pluck', gain: 0.4 }),
        )),
    },
};
