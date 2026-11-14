import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { together, tune } from './tune';

/**
 * Lace card — the wedding wrapper, drawn WHITE ON WHITE: laser-cut paper and
 * blind embossing. A gate-fold invitation lies on its envelope on a pale
 * ground; its two doors are cut as lace (a net of small hexagons, rosettes,
 * corner fans, a scalloped meeting edge) and held by a silk band and bow with
 * a paper sprig tucked under the knot. Form comes only from the tiny shadow
 * under every cut edge, the dusk seen through the holes, pressed line pairs
 * and hairlines of rose-gold foil.
 * Opening: the bow comes undone, the band and the sprig slip off; the two
 * doors swing open like gates and stand at the card's sides, light falls in
 * through the left one and lays its lace as a shadow across the inner card;
 * a cut-paper arch stands up from the crease, paper flowers open along it,
 * over two interlocked foil rings in a pressed sunburst; a few petals fall.
 * No text: the frame shows the gift.
 *
 * Canvas 360x500. The card is 232 wide (64..296) and 308 tall (90..398); each
 * door is 116 wide. A door's swing is a scale through zero at its hinge: the
 * outside face closes to the hinge line, then the inside face opens outward
 * from it: a separate drawing of the door seen at an angle (foreshortened, fewer and larger cuts, its edge showing). The art is generated in canvas
 * coordinates (scripts/art/lace.gen.mjs): each SVG's viewBox is its box.
 */

/** Closed, the whole still life lies this much higher in the frame; it settles as the card opens, clear of the page's labels. */
const LIFT = -30;
/** Everything that stays: it settles together. */
const SCENE = ['ground', 'envelope', 'petals', 'card-shadow', 'inner', 'rings', 'shade-l', 'arch', 'blooms-l', 'blooms-r', 'blooms-top', 'flecks', 'dusk', 'door-l-back', 'door-r-back', 'door-l', 'door-r'];
/** Everything that holds the card shut and leaves together. */
const BOW = ['loop-l', 'loop-r', 'knot', 'tails'];

const open: Step[] = [
    // 1. The bow comes undone: the loops draw into the knot, the tails swing out.
    { kind: 'move', layer: 'loop-l', at: 0, dur: 520, ease: 'inout', to: { sx: 0.2, sy: 0.5, turn: -10 } },
    { kind: 'move', layer: 'loop-r', at: 70, dur: 520, ease: 'inout', to: { sx: 0.2, sy: 0.5, turn: 10 } },
    { kind: 'move', layer: 'tails', at: 0, dur: 600, ease: 'inout', to: { sy: 1.16 } },
    { kind: 'move', layer: 'loop-l', at: 520, dur: 140, ease: 'in', to: { sx: 0, sy: 0 } },
    { kind: 'move', layer: 'loop-r', at: 590, dur: 140, ease: 'in', to: { sx: 0, sy: 0 } },
    // 2. The silk slips down off the card, the sprig with it, turning as it goes.
    ...BOW.map((layer): Step => ({ kind: 'move', layer, at: 640, dur: 700, ease: 'in', to: { y: 96 } })),
    { kind: 'move', layer: 'knot', at: 900, dur: 400, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'tails', at: 900, dur: 400, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'band', at: 700, dur: 640, ease: 'in', to: { y: 72, opacity: 0 } },
    { kind: 'move', layer: 'sprig', at: 660, dur: 780, ease: 'in', to: { x: -26, y: 86, turn: -28 } },
    { kind: 'move', layer: 'sprig', at: 1040, dur: 400, ease: 'in', to: { opacity: 0 } },
    // The still life settles lower in the frame while the doors swing.
    ...SCENE.map((layer): Step => ({ kind: 'move', layer, at: 1100, dur: 1300, ease: 'inout', to: { y: 0 } })),
    // The pale ground dims toward the room, so the open card stands in it with clean edges and no glow around it.
    { kind: 'move', layer: 'ground', at: 1100, dur: 1300, ease: 'inout', to: { opacity: 0.15 } },
    // 3. The doors: a first breath of air, then they swing to the hinge line; the dusk inside lifts.
    { kind: 'move', layer: 'door-l', at: 1200, dur: 300, ease: 'out', to: { sx: 0.95 } },
    { kind: 'move', layer: 'door-r', at: 1260, dur: 300, ease: 'out', to: { sx: 0.95 } },
    { kind: 'move', layer: 'door-l', at: 1500, dur: 520, ease: 'in', to: { sx: 0 } },
    { kind: 'move', layer: 'door-r', at: 1560, dur: 520, ease: 'in', to: { sx: 0 } },
    { kind: 'move', layer: 'door-l', at: 2020, dur: 0, to: { opacity: 0 } },
    { kind: 'move', layer: 'door-r', at: 2080, dur: 0, to: { opacity: 0 } },
    { kind: 'move', layer: 'dusk', at: 1300, dur: 800, ease: 'inout', to: { opacity: 0 } },
    // ...and their inside faces open outward from it, standing at the card's sides.
    { kind: 'move', layer: 'door-l-back', at: 2020, dur: 620, ease: 'out', to: { sx: 1 } },
    { kind: 'move', layer: 'door-r-back', at: 2080, dur: 620, ease: 'out', to: { sx: 1 } },
    // Light through the left door: its lace lies down across the card as a shadow.
    { kind: 'move', layer: 'shade-l', at: 2020, dur: 700, ease: 'out', to: { sx: 1, opacity: 1 } },
    // 4. The arch stands up from the crease; the flowers open along it, the crown last.
    { kind: 'move', layer: 'arch', at: 1720, dur: 820, ease: 'back', to: { sy: 1 } },
    { kind: 'move', layer: 'blooms-l', at: 2260, dur: 120, to: { opacity: 1 } },
    { kind: 'move', layer: 'blooms-l', at: 2260, dur: 620, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'blooms-r', at: 2400, dur: 120, to: { opacity: 1 } },
    { kind: 'move', layer: 'blooms-r', at: 2400, dur: 620, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'blooms-top', at: 2560, dur: 120, to: { opacity: 1 } },
    { kind: 'move', layer: 'blooms-top', at: 2560, dur: 680, ease: 'back', to: { sx: 1, sy: 1 } },
    // 5. The foil takes the light; petals come down.
    { kind: 'move', layer: 'rings', at: 2500, dur: 800, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'flecks', at: 2900, dur: 700, ease: 'out', to: { opacity: 0.85 } },
    { kind: 'scatter', layer: 'petal', at: 2800, dur: 1900, count: 12, spread: 120, fall: 170 },
];

const idle: IdleStep[] = [
    { layer: 'loop-l', field: 'turn', amp: 1.6, period: 5200 },
    { layer: 'loop-r', field: 'turn', amp: 1.6, period: 5200, phase: 0.45 },
    { layer: 'tails', field: 'turn', amp: 1.2, period: 6400, phase: 0.2 },
    { layer: 'sprig', field: 'turn', amp: 0.8, period: 7800 },
];

const afterglow: IdleStep[] = [
    { layer: 'flecks', field: 'opacity', amp: 0.15, period: 3400 },
    { layer: 'blooms-top', field: 'turn', amp: 0.7, period: 7200 },
    { layer: 'shade-l', field: 'x', amp: 1.2, period: 8600 },
];

export const lace: WrapperDef = {
    id: 'lace',
    name: { vi: 'Thiệp ren', en: 'Lace card' },
    ambient: ['#F3E9E2', '#D9B8AA', '#B9AEB0'],
    blurb: {
        vi: 'Thiệp cưới trắng trên trắng, hai cánh ren cắt laser buộc nơ lụa. Nơ tuột, cửa ren mở, vòm hoa giấy dựng lên trên đôi nhẫn dập nhũ.',
        en: 'A white-on-white wedding card: laser-cut lace doors, a silk bow. The doors open on a pop-up arch of paper flowers over two foil rings.',
    },
    // Pearl paper, plum-brown ink, the foil's rose gold (deepened until white reads on it).
    theme: { ground: '#554A4D', surface: '#F7F2EC', ink: '#170F11', accent: '#9C5D52', onAccent: '#FFFFFF', material: 'glass', corner: 'round', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.455],
    size: [360, 500],
    backdrop: '#554A4D',
    layers: [
        { id: 'ground', art: 'ground.svg', box: [-20, -20, 400, 570], start: { y: LIFT }, depth: 0.04 },
        { id: 'envelope', art: 'envelope.svg', box: [10, 36, 340, 440], start: { y: LIFT }, depth: 0.12 },
        { id: 'petals', art: 'petals.svg', box: [0, 46, 360, 460], start: { y: LIFT }, depth: 0.2 },
        { id: 'card-shadow', art: 'card-shadow.svg', box: [42, 74, 284, 360], start: { y: LIFT }, depth: 0.26 },
        { id: 'inner', art: 'inner.svg', box: [64, 90, 232, 308], start: { y: LIFT }, depth: 0.3 },
        { id: 'rings', art: 'rings.svg', box: [142, 279, 76, 50], start: { y: LIFT, opacity: 0.55 }, depth: 0.3 },
        { id: 'shade-l', art: 'shade-l.svg', box: [64, 90, 84, 308], origin: [0, 0.5], start: { y: LIFT, sx: 0.2, opacity: 0 }, depth: 0.3 },
        { id: 'arch', art: 'arch.svg', box: [88, 126, 190, 240], origin: [0.5, 234 / 240], start: { y: LIFT, sy: 0 }, depth: 0.42 },
        { id: 'blooms-l', art: 'blooms-l.svg', box: [62, 132, 84, 200], origin: [0.5, 0.6], start: { y: LIFT, sx: 0.3, sy: 0.3, opacity: 0 }, depth: 0.5 },
        { id: 'blooms-r', art: 'blooms-r.svg', box: [214, 132, 84, 200], origin: [0.5, 0.6], start: { y: LIFT, sx: 0.3, sy: 0.3, opacity: 0 }, depth: 0.5 },
        { id: 'blooms-top', art: 'blooms-top.svg', box: [100, 100, 160, 128], origin: [0.5, 0.31], start: { y: LIFT, sx: 0.3, sy: 0.3, opacity: 0 }, depth: 0.56 },
        { id: 'flecks', art: 'flecks.svg', box: [100, 126, 160, 220], start: { y: LIFT, opacity: 0 }, depth: 0.36 },
        { id: 'petal', art: 'petal.svg', box: [174, 176, 14, 12] },
        { id: 'dusk', art: 'dusk.svg', box: [64, 90, 232, 308], start: { y: LIFT }, depth: 0.3 },
        { id: 'door-l-back', art: 'door-l-back.svg', box: [14, 83, 54, 324], origin: [50 / 54, 0.5], start: { y: LIFT, sx: 0 }, depth: 0.34 },
        { id: 'door-r-back', art: 'door-r-back.svg', box: [296, 83, 54, 324], origin: [0, 0.5], start: { y: LIFT, sx: 0 }, depth: 0.34 },
        { id: 'door-l', art: 'door-l.svg', box: [64, 90, 118, 310], origin: [0, 0.5], start: { y: LIFT }, depth: 0.34 },
        { id: 'door-r', art: 'door-r.svg', box: [180, 90, 118, 310], origin: [116 / 118, 0.5], start: { y: LIFT }, depth: 0.34 },
        { id: 'sprig', art: 'sprig.svg', box: [96, 160, 174, 172], origin: [0.5, 0.5], start: { y: LIFT }, depth: 0.4 },
        { id: 'band', art: 'band.svg', box: [62.5, 235.5, 237, 20], start: { y: LIFT }, depth: 0.42 },
        { id: 'tails', art: 'tails.svg', box: [146, 244, 60, 60], origin: [34 / 60, 6 / 60], start: { y: LIFT }, depth: 0.46 },
        { id: 'loop-l', art: 'loop-l.svg', box: [128, 218, 52, 36], origin: [0.94, 0.7], start: { y: LIFT }, depth: 0.46 },
        { id: 'loop-r', art: 'loop-r.svg', box: [180, 218, 52, 36], origin: [0.06, 0.7], start: { y: LIFT }, depth: 0.46 },
        { id: 'knot', art: 'knot.svg', box: [170, 232, 22, 26], start: { y: LIFT }, depth: 0.46 },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2700,
    // A music box, and glass under it: two bars that open like the doors.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 74,
        score: together(
            tune(108, 'A5/4. F#5/8 D5/4 F#5/4 | A5/2 D6/2!'),
            tune(108, 'D4/1 | [D4 A4]/1', { inst: 'glassy', gain: 0.4 }),
        ),
    },
};
