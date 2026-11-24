import type { IdleStep, NoteDef, Step, WrapperDef } from '../stage/format';

/**
 * Confetti drop — for the New Year, or any big celebration. The view is
 * straight up at a party ceiling, in flat cut paper: charcoal coffers with a
 * warm lamp in each corner, crepe streamers crossing from wall to wall, two
 * strings of plain pennants, and across the middle a banded drop-bag, roped
 * at its upper corners and packed with paper, held shut by one cord with a
 * pull ring.
 * Opening: the ring is pulled and the cord shivers, then drops away; the bag
 * splits down its seam and each half swings down about its outer corner to
 * hang by the wall; sheets of paper come down toward the viewer in five planes, the
 * near ones larger and faster, and go by; three streamer rolls drop from
 * above and uncoil; in the gap the bag leaves, the ceiling rose stands in its
 * own light. Afterwards the streamers sway out of step and a few gold sheets,
 * still in the air, twinkle.
 *
 * The stage moves, turns, scales and fades whole layers: a sheet "comes
 * nearer" by its layer growing about the middle of the canvas while it sinks,
 * and a roll "uncoils" by its ribbon growing from the top.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/confetti.gen.mjs): each SVG's viewBox is its box. The boxes
 * and pivots below are copied by hand from what the generator prints.
 */

/** How far each half of the bag swings about its strapped upper outer corner, in degrees. */
const SWING = 58;
/** The moment the cord lets go and the bag splits. */
const SPLIT = 460;
/** The box every plane of confetti is drawn in, round the middle of the canvas. */
const CBOX: readonly [number, number, number, number] = [105, 130, 150, 190];
/** The planes that go by, far to near: when each starts, how long it takes, how large it gets, how far it sinks. */
const FALLS: readonly (readonly [string, number, number, number, number])[] = [
    ['fall-a', SPLIT + 150, 2300, 2.5, 250],
    ['fall-b', SPLIT + 110, 1900, 3.1, 330],
    ['fall-c', SPLIT + 70, 1550, 3.7, 420],
    ['fall-d', SPLIT + 30, 1250, 4, 520],
];
/** The rolls: when each drops, and how long it takes to run out. */
const ROLLS: readonly (readonly [string, number, number])[] = [['roll-b', 900, 900], ['roll-a', 1080, 820], ['roll-c', 1280, 700]];

const open: Step[] = [
    // 1. The ring is pulled: the cord tightens and the bag shivers on its ropes.
    { kind: 'move', layer: 'ring', at: 0, dur: 380, ease: 'in', to: { y: 14 } },
    { kind: 'shake', layer: 'ring', at: 120, dur: 340, amp: 2.2, times: 3 },
    { kind: 'shake', layer: 'bag-l', at: 160, dur: 300, amp: 2.6, times: 2 },
    { kind: 'shake', layer: 'bag-r', at: 160, dur: 300, amp: -2.6, times: 2 },
    // 2. The cord lets go and drops out of the frame.
    { kind: 'move', layer: 'ring', at: SPLIT, dur: 620, ease: 'in', to: { y: 420, turn: 38 } },
    // 3. The bag splits: each half swings down about its outer corner, runs a little past and hangs.
    { kind: 'move', layer: 'bag-l', at: SPLIT, dur: 1000, ease: 'back', to: { turn: SWING } },
    { kind: 'move', layer: 'bag-r', at: SPLIT + 50, dur: 1000, ease: 'back', to: { turn: -SWING } },
    // 4. The paper: a burst of small sheets, the far plane that spreads and stays, and four planes that go by.
    { kind: 'scatter', layer: 'bit', at: SPLIT + 20, dur: 1900, count: 34, spread: 170, fall: 250 },
    ...(['far', 'far-g'] as const).flatMap((layer): Step[] => [
        { kind: 'move', layer, at: SPLIT + 40, dur: 120, to: { opacity: 1 } },
        { kind: 'move', layer, at: SPLIT + 40, dur: 2700, ease: 'out', to: { sx: 2.36, sy: 2.36 } },
    ]),
    ...FALLS.flatMap(([layer, at, dur, scale, sink]): Step[] => [
        { kind: 'move', layer, at, dur: 100, to: { opacity: 1 } },
        { kind: 'move', layer, at, dur, ease: 'linear', to: { sx: scale, sy: scale, y: sink } },
        { kind: 'move', layer, at: at + dur * 0.7, dur: dur * 0.3, to: { opacity: 0 } },
    ]),
    // 5. The rose's light comes on in the gap.
    { kind: 'move', layer: 'halo', at: SPLIT + 240, dur: 900, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'rose', at: SPLIT + 300, dur: 620, ease: 'back', to: { sx: 1, sy: 1 } },
    // 6. Three rolls drop from above and run out.
    ...ROLLS.map(([layer, at, dur]): Step => ({ kind: 'move', layer, at, dur, ease: 'bounce', to: { sy: 1 } })),
];

const idle: IdleStep[] = [
    { layer: 'garland-a', field: 'turn', amp: 0.7, period: 6200 },
    { layer: 'garland-b', field: 'turn', amp: 0.9, period: 5200, phase: 0.4 },
    // The packed bag breathes on its ropes; the ring swings from the seam.
    { layer: 'bag-l', field: 'sy', amp: 0.016, period: 4400 },
    { layer: 'bag-r', field: 'sy', amp: 0.016, period: 4400, phase: 0.08 },
    { layer: 'ring', field: 'turn', amp: 2.2, period: 3400 },
];

const afterglow: IdleStep[] = [
    { layer: 'garland-a', field: 'turn', amp: 0.7, period: 6200 },
    { layer: 'garland-b', field: 'turn', amp: 0.9, period: 5200, phase: 0.4 },
    // The hanging streamers and the emptied halves sway out of step.
    { layer: 'roll-a', field: 'turn', amp: 2.4, period: 4200 },
    { layer: 'roll-b', field: 'turn', amp: 1.8, period: 5100, phase: 0.35 },
    { layer: 'roll-c', field: 'turn', amp: 2.8, period: 3600, phase: 0.7 },
    { layer: 'bag-l', field: 'turn', amp: 1.6, period: 4800, phase: 0.2 },
    { layer: 'bag-r', field: 'turn', amp: 1.6, period: 5600, phase: 0.6 },
    // The sheets still in the air drift a hair; the gold ones twinkle.
    { layer: 'far', field: 'y', amp: 3, period: 6400 },
    { layer: 'far-g', field: 'y', amp: 4, period: 5200, phase: 0.3 },
    { layer: 'far-g', field: 'opacity', amp: 0.32, period: 2600 },
    { layer: 'halo', field: 'opacity', amp: 0.1, period: 5000 },
];

/** How hard the whole tune is played: levelled against the other wrappers' tunes. */
const LEVEL = 1;
const g = (gain: number): number => Math.round(gain * LEVEL * 100) / 100;
/** Paper rustling as the cord tightens, the rip, then a short brass call that climbs the home chord and holds its top. */
const score: NoteDef[] = [
    { at: 0, pitch: 84, dur: 90, gain: g(0.16), inst: 'noise' },
    { at: 150, pitch: 88, dur: 80, gain: g(0.2), inst: 'noise' },
    { at: 300, pitch: 86, dur: 90, gain: g(0.24), inst: 'noise' },
    { at: SPLIT, pitch: 72, dur: 220, gain: g(0.5), inst: 'noise', bend: -7 },
    { at: 560, pitch: 67, dur: 120, gain: g(0.5) },
    { at: 700, pitch: 72, dur: 120, gain: g(0.52) },
    { at: 840, pitch: 76, dur: 120, gain: g(0.54) },
    { at: 980, pitch: 79, dur: 240, gain: g(0.58) },
    { at: 1260, pitch: 76, dur: 110, gain: g(0.5) },
    { at: 1380, pitch: 79, dur: 110, gain: g(0.54) },
    { at: 1500, pitch: 48, dur: 1500, gain: g(0.3), inst: 'pad' },
    { at: 1500, pitch: 76, dur: 1400, gain: g(0.36) },
    { at: 1500, pitch: 79, dur: 1400, gain: g(0.4) },
    { at: 1500, pitch: 84, dur: 1500, gain: g(0.56) },
];

export const confetti: WrapperDef = {
    id: 'confetti',
    name: { vi: 'Giấy màu thả trần', en: 'Confetti drop' },
    ambient: ['#221E27', '#E8B84A', '#F0356B'],
    blurb: {
        vi: 'Nhìn thẳng lên trần tiệc. Kéo vòng, túi giấy tách đôi, giấy màu rơi về phía bạn và ba cuộn dây giấy bung xuống.',
        en: 'Straight up at a party ceiling. Pull the ring: the bag splits, paper comes down toward you and three streamer rolls uncoil.',
    },
    // The ceiling's charcoal as lacquer, ivory paper for the words, the lamps' gold for the one loud colour.
    theme: { ground: '#141117', surface: '#221E27', ink: '#F6EEDD', accent: '#E8B84A', onAccent: '#141117', material: 'lacquer', corner: 'soft', face: 'poster', voice: 'chime' },
    focus: [0.5, 0.5],
    size: [360, 450],
    backdrop: '#221E27',
    layers: [
        { id: 'ceiling', art: 'ceiling.svg', box: [-6, -6, 372, 462], depth: 0.03 },
        { id: 'halo', art: 'halo.svg', box: [48, 93, 264, 264], start: { opacity: 0, sx: 0.6, sy: 0.6 }, depth: 0.03 },
        { id: 'rose', art: 'rose.svg', box: [118, 163, 124, 124], start: { sx: 0.86, sy: 0.86 }, depth: 0.03 },
        { id: 'net', art: 'net.svg', box: [-6, -6, 372, 462], depth: 0.1 },
        { id: 'garland-a', art: 'garland-a.svg', box: [-22, 64, 404, 76], origin: [0.5, 0], depth: 0.16 },
        { id: 'garland-b', art: 'garland-b.svg', box: [-22, 312, 404, 76], origin: [0.5, 0], depth: 0.16 },
        // The sheets that stay in the air, under everything that hangs.
        { id: 'far', art: 'far.svg', box: CBOX, start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.2 },
        { id: 'far-g', art: 'far-g.svg', box: CBOX, start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.2 },
        { id: 'bag-l', art: 'bag-l.svg', box: [26, 153, 163, 144], origin: [0.11, 0.229], depth: 0.26 },
        { id: 'bag-r', art: 'bag-r.svg', box: [171, 153, 163, 144], origin: [0.89, 0.229], depth: 0.26 },
        { id: 'ring', art: 'ring.svg', box: [159, 156, 42, 138], origin: [0.5, 0], depth: 0.26 },
        { id: 'roll-a', art: 'roll-a.svg', box: [94, -8, 28, 320], origin: [0.5, 0], start: { sy: 0 }, depth: 0.34 },
        { id: 'roll-b', art: 'roll-b.svg', box: [248, -8, 28, 370], origin: [0.5, 0], start: { sy: 0 }, depth: 0.4 },
        { id: 'roll-c', art: 'roll-c.svg', box: [298, -8, 28, 256], origin: [0.5, 0], start: { sy: 0 }, depth: 0.3 },
        // The planes that go by, far to near.
        { id: 'fall-a', art: 'fall-a.svg', box: CBOX, start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.45 },
        { id: 'fall-b', art: 'fall-b.svg', box: CBOX, start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.6 },
        { id: 'fall-c', art: 'fall-c.svg', box: CBOX, start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.8 },
        { id: 'fall-d', art: 'fall-d.svg', box: CBOX, start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 1 },
        { id: 'bit', art: 'bit.svg', box: [175, 222, 10, 6] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1500,
    sound: { v: 1, inst: 'brass', tonic: 72, score },
};
