import type { IdleStep, NoteDef, Step, WrapperDef } from '../stage/format';
import { scaled } from './tune';

/**
 * Paper-cut — for the Spring Festival, in Chinese folk paper-cutting
 * (jianzhi): one red paper on a cream craft table seen from above, touches
 * of gold leaf, black-handled scissors. Closed: on an indigo work mat lies a
 * red sheet folded in half, its first notches cut along the edges and a
 * chalk line where the cut will run; the scissors lie beside it pointing at
 * it; round about, curls of red offcuts, a paste pot with its brush, a stack
 * of red paper under a sheet of gold leaf.
 * Opening: the scissors are put aside; the folded half flips open across its
 * crease (a scale through zero, the cut left half taking over from the
 * hinge) and a scatter of tiny red bits flies; the crease, still standing as
 * a thin tent, is pressed flat (a second, lighter flip). What lies open is a
 * symmetrical rosette at the focus: a peony at the centre, a pair of carp
 * mirrored about the fold with a pearl between their heads, waves under
 * their tails, plum blossoms and cloud curls cut into the scalloped border.
 * Gold leaf comes up on the fins, the peony's heart and the blossoms.
 * After: the rosette sways by a hair; the gold twinkles. No characters, no
 * seal, no text: the frame shows the gift.
 *
 * The rosette is two layers, one each side of the crease, cut from one
 * drawing; the "holes" are painted in the mat's colour.
 *
 * Canvas 360x450. The rosette is 117 in radius about (180, 220). The art is
 * generated in canvas coordinates (scripts/art/papercut.gen.mjs): each
 * SVG's viewBox is its box.
 */

/** Everything that is the opened sheet: it sways together about the rosette's centre. */
const SHEET = ['rosette-l', 'rosette-r', 'gold', 'glint'];

const open: Step[] = [
    // 1. The scissors are lifted off the mat and put down at its lower left corner.
    { kind: 'move', layer: 'scissors', at: 0, dur: 720, ease: 'inout', to: { x: -36, y: 104, turn: 34 } },
    // 2. The folded half flips over its crease: its back closes to the hinge, then the cut left half opens from it,
    //    and the right half is seen cut beneath. Bits of red paper fly from the fold.
    { kind: 'move', layer: 'folded', at: 420, dur: 380, ease: 'in', to: { sx: 0 } },
    { kind: 'move', layer: 'ridge', at: 780, dur: 60, to: { opacity: 1 } },
    { kind: 'move', layer: 'rosette-l', at: 800, dur: 520, ease: 'out', to: { sx: 1 } },
    { kind: 'scatter', layer: 'bit', at: 800, dur: 1300, count: 22, spread: 150, fall: 90 },
    // 3. The crease is pressed flat: the tent closes to nothing and the sheet gives a little under the hand.
    { kind: 'move', layer: 'ridge', at: 1440, dur: 220, ease: 'in', to: { sx: 0 } },
    { kind: 'move', layer: 'ridge', at: 1620, dur: 60, to: { opacity: 0 } },
    ...['rosette-l', 'rosette-r'].map((layer): Step => ({ kind: 'move', layer, at: 1440, dur: 200, ease: 'in', to: { sy: 0.975 } })),
    ...['rosette-l', 'rosette-r'].map((layer): Step => ({ kind: 'move', layer, at: 1640, dur: 380, ease: 'back', to: { sy: 1 } })),
    // 4. Gold leaf comes up on the fins, the peony's heart and the blossoms; the light catches it.
    { kind: 'move', layer: 'gold', at: 1800, dur: 700, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'glint', at: 2200, dur: 500, ease: 'out', to: { opacity: 0.6 } },
];

const idle: IdleStep[] = [
    // The folded half does not quite lie flat: its free edge lifts and settles.
    { layer: 'folded', field: 'sx', amp: 0.012, period: 4600 },
    // The gold leaf stirs in the air of the room.
    { layer: 'leaf', field: 'turn', amp: 1.4, period: 5400 },
];

const afterglow: IdleStep[] = [
    ...SHEET.map((layer): IdleStep => ({ layer, field: 'turn', amp: 0.35, period: 7000 })),
    ...SHEET.map((layer): IdleStep => ({ layer, field: 'y', amp: 0.8, period: 5200, phase: 0.25 })),
    { layer: 'glint', field: 'opacity', amp: 0.4, period: 2200 },
    { layer: 'gold', field: 'opacity', amp: 0.1, period: 3800, phase: 0.4 },
    { layer: 'leaf', field: 'turn', amp: 1.4, period: 5400 },
];

/** The paper: soft rustles of noise as the sheet is lifted, unfolds and is pressed. */
const rustle: NoteDef[] = [420, 520, 610, 760, 880, 1010, 1150, 1460, 1540].map((at, i) => ({ at, pitch: [88, 84, 90, 86, 82, 89, 85, 80, 78][i]!, dur: i > 6 ? 90 : 60, gain: i > 6 ? 0.22 : 0.16, inst: 'noise' as const }));
/** The bell: five notes climbing as the sheet opens, a soft one at the press, then home held over a low pad. */
const bell: NoteDef[] = [
    { at: 800, pitch: 74, dur: 260, gain: 0.46 },
    { at: 1000, pitch: 76, dur: 260, gain: 0.48 },
    { at: 1200, pitch: 79, dur: 300, gain: 0.5 },
    { at: 1460, pitch: 81, dur: 300, gain: 0.4 },
    { at: 1900, pitch: 86, dur: 1600, gain: 0.48 },
    { at: 1900, pitch: 83, dur: 1600, gain: 0.4 },
    { at: 1900, pitch: 79, dur: 1800, gain: 0.44 },
    { at: 1900, pitch: 55, dur: 2000, gain: 0.26, inst: 'pad' },
];

export const papercut: WrapperDef = {
    id: 'papercut',
    name: { vi: 'Giấy cắt hoa', en: 'Paper-cut' },
    ambient: ['#C8102E', '#D4A23C', '#24304A'],
    blurb: {
        vi: 'Cắt giấy dân gian Trung Hoa đón Xuân. Tờ giấy đỏ gấp đôi mở ra thành hoa mẫu đơn, đôi cá chép soi bóng, điểm vàng lá.',
        en: 'Chinese folk paper-cutting for the Spring Festival. A folded red sheet opens into a peony and a mirrored pair of carp, touched with gold.',
    },
    // The table's cream for the surface, ink for the words, the paper's red for the one loud colour.
    theme: { ground: '#231A17', surface: '#F4EBD9', ink: '#231A17', accent: '#C8102E', onAccent: '#F4EBD9', material: 'plate', corner: 'cut', face: 'serif', voice: 'chime' },
    focus: [0.5, 0.49],
    size: [360, 450],
    backdrop: '#F4EBD9',
    // The boxes are those the generator writes (copied by hand; a mismatch shows as stretched art).
    layers: [
        { id: 'table', art: 'table.svg', box: [-6, -6, 372, 462], depth: 0.05 },
        { id: 'leaf', art: 'leaf.svg', box: [270, 8, 72, 72], origin: [0.2, 0.2], depth: 0.12 },
        // Both halves turn about the rosette's centre (180, 220): the crease.
        { id: 'rosette-r', art: 'rosette-r.svg', box: [180, 98, 124, 244], origin: [0, 0.5], depth: 0.3 },
        { id: 'rosette-l', art: 'rosette-l.svg', box: [56, 98, 124, 244], origin: [1, 0.5], start: { sx: 0 }, depth: 0.3 },
        { id: 'gold', art: 'gold.svg', box: [56, 98, 248, 244], start: { opacity: 0 }, depth: 0.3 },
        { id: 'glint', art: 'glint.svg', box: [56, 98, 248, 244], start: { opacity: 0 }, depth: 0.3 },
        { id: 'ridge', art: 'ridge.svg', box: [174, 102, 12, 236], start: { opacity: 0 }, depth: 0.3 },
        { id: 'folded', art: 'folded.svg', box: [180, 98, 124, 244], origin: [0, 0.5], depth: 0.3 },
        // The scissors turn about their rivet (118, 300).
        { id: 'scissors', art: 'scissors.svg', box: [36, 210, 156, 176], origin: [82 / 156, 90 / 176], depth: 0.45 },
        { id: 'bit', art: 'bit.svg', box: [176, 216, 8, 8], depth: 0.4 },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1900,
    // Paper and a bell, on a pentatonic climb that comes home to G.
    sound: { v: 1, inst: 'bell', tonic: 67, score: scaled(0.5, [...rustle, ...bell].sort((a, b) => a.at - b.at)) },
};
