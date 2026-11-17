import type { IdleStep, NoteDef, Step, WrapperDef } from '../stage/format';

/**
 * Chest — a sea chest on the sand of a cave, for a windfall or a wish of
 * plenty. Seen straight on from inside the cave: the mouth is an arch that
 * frames a dusk sky, a calm sea and a small ship at anchor; palm fronds hang
 * in at one corner; a torch burns on a rock. A thin line of light leaks under
 * the lid. Opening: the lock plate trembles, the two hasps drop
 * to hang, the lid goes up and back, and a gold light comes up out of the chest
 * and onto the rock.
 *
 * The stage moves and fades whole layers, so the lid is two pictures: its
 * front, which lifts a little and fades, and its lined inside, which comes up
 * behind it. The heap is in the chest all along, hidden by the lid's front.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/chest.gen.mjs): each SVG's viewBox is its box. The boxes below
 * are copied by hand from the generator.
 */

/** Parallax planes: the view through the mouth, the rock, the floor, the chest. */
const ROCK = 0.1;
const FLOOR = 0.26;
const NEAR = 0.3;

const open: Step[] = [
    // 1. The lock gives: the plate trembles. It does not turn, so the keyhole stands upright closed and open.
    { kind: 'shake', layer: 'lock', at: 0, dur: 380, amp: 2.2, times: 3 },
    // 2. The hasps drop, one after the other, to hang straight down, and knock on the wood.
    { kind: 'move', layer: 'hasp-l', at: 380, dur: 420, ease: 'bounce', to: { turn: -180 } },
    { kind: 'move', layer: 'hasp-r', at: 500, dur: 420, ease: 'bounce', to: { turn: 180 } },
    // 3. The line of light under the lid widens, then the lid goes up: its front lifts a little
    //    and fades as its inside comes up behind it, a little past its place and back.
    { kind: 'move', layer: 'seam', at: 700, dur: 200, ease: 'out', to: { sy: 2.4, opacity: 1 } },
    { kind: 'move', layer: 'seam', at: 900, dur: 220, to: { opacity: 0 } },
    { kind: 'move', layer: 'lid', at: 860, dur: 220, ease: 'in', to: { y: -10, opacity: 0 } },
    { kind: 'move', layer: 'lid-in', at: 920, dur: 220, to: { opacity: 1 } },
    { kind: 'move', layer: 'lid-in', at: 920, dur: 460, ease: 'back', to: { y: 0 } },
    // 4. The light comes up out of the chest and onto the rock and the sand.
    { kind: 'move', layer: 'glow', at: 1000, dur: 900, ease: 'out', to: { opacity: 0.95, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'glow', at: 1900, dur: 500, ease: 'inout', to: { opacity: 0.85 } },
    { kind: 'move', layer: 'tint', at: 1150, dur: 900, ease: 'inout', to: { opacity: 1 } },
    // A few motes of light rise inside the lid; four small glints stay.
    { kind: 'scatter', layer: 'spark', at: 1200, dur: 1200, count: 9, spread: 52, fall: -30 },
    { kind: 'move', layer: 'glint-a', at: 1500, dur: 500, ease: 'out', to: { opacity: 0.8 } },
    { kind: 'move', layer: 'glint-b', at: 1700, dur: 500, ease: 'out', to: { opacity: 0.5 } },
];

/** The torch and the palm, closed or open. */
const air: IdleStep[] = [
    { layer: 'flame', field: 'turn', amp: 5, period: 1900 },
    { layer: 'flame', field: 'sy', amp: 0.07, period: 1400, phase: 0.3 },
    { layer: 'wedge', field: 'opacity', amp: 0.08, period: 2800 },
    { layer: 'fronds', field: 'turn', amp: 1.2, period: 6400 },
];

const idle: IdleStep[] = [
    ...air,
    // The line of light under the lid breathes.
    { layer: 'seam', field: 'opacity', amp: 0.2, period: 3400 },
];

const afterglow: IdleStep[] = [
    ...air,
    { layer: 'glow', field: 'opacity', amp: 0.1, period: 4200 },
    { layer: 'glow', field: 'sy', amp: 0.03, period: 4200 },
    { layer: 'glint-a', field: 'opacity', amp: 0.3, period: 2600 },
    { layer: 'glint-b', field: 'opacity', amp: 0.3, period: 3300, phase: 0.5 },
];

/** A dry tick for the lock, two knocks of wood as the hasps land, then four bells going up to the home note.
 * The bells ring on over each other, so they are written soft: the tune's peak sits between crane's and compass's. */
const score: NoteDef[] = [
    { at: 0, pitch: 67, dur: 60, gain: 0.3, inst: 'wood' },
    { at: 535, pitch: 50, dur: 80, gain: 0.6, inst: 'wood' },
    { at: 655, pitch: 47, dur: 80, gain: 0.6, inst: 'wood' },
    { at: 1160, pitch: 74, dur: 180, gain: 0.19 },
    { at: 1330, pitch: 78, dur: 180, gain: 0.19 },
    { at: 1500, pitch: 81, dur: 180, gain: 0.2 },
    { at: 1680, pitch: 86, dur: 1500, gain: 0.24 },
    { at: 1680, pitch: 62, dur: 1500, gain: 0.12 },
];

export const chest: WrapperDef = {
    id: 'chest',
    name: { vi: 'Rương kho báu', en: 'Treasure chest' },
    ambient: ['#143242', '#EE8030', '#FFD884'],
    blurb: {
        vi: 'Rương gỗ trên cát trong hang biển lúc chạng vạng. Khóa bật, hai móc bật ra, nắp mở và ánh vàng hắt lên vách đá.',
        en: 'A sea chest on the sand of a cave at dusk. The lock gives, the hasps drop, the lid lifts and gold light climbs the rock.',
    },
    // The cave's rock as lacquer, the gold light for the words, brass for the one loud colour.
    theme: { ground: '#0A1721', surface: '#143242', ink: '#FFD884', accent: '#C9973E', onAccent: '#0A1721', material: 'lacquer', corner: 'soft', face: 'serif', voice: 'chime' },
    focus: [0.5, 0.58],
    size: [360, 450],
    backdrop: '#0A1721',
    layers: [
        { id: 'vista', art: 'vista.svg', box: [34, 22, 294, 294], depth: 0.03 },
        { id: 'fronds', art: 'fronds.svg', box: [176, 6, 172, 172], origin: [1, 0], depth: 0.07 },
        { id: 'cave', art: 'cave.svg', box: [-6, -6, 372, 462], depth: ROCK },
        { id: 'tint', art: 'tint.svg', box: [0, 20, 360, 420], start: { opacity: 0 }, depth: ROCK },
        { id: 'sand', art: 'sand.svg', box: [-6, 244, 372, 212], depth: FLOOR },
        { id: 'wedge', art: 'wedge.svg', box: [-6, 208, 226, 248], start: { opacity: 0.9 }, depth: FLOOR },
        { id: 'flame', art: 'flame.svg', box: [22, 244, 32, 48], origin: [0.5, 0.94], depth: FLOOR },
        // The lid's inside waits unseen behind its front, a little low.
        { id: 'lid-in', art: 'lid-in.svg', box: [72, 170, 216, 82], start: { opacity: 0, y: 12 }, depth: NEAR },
        { id: 'well', art: 'well.svg', box: [72, 252, 216, 38], depth: NEAR },
        { id: 'glow', art: 'glow.svg', box: [36, 112, 288, 264], origin: [0.5, 146 / 264], start: { opacity: 0, sx: 0.5, sy: 0.3 }, depth: NEAR },
        { id: 'heap', art: 'heap.svg', box: [86, 224, 188, 68], depth: NEAR },
        { id: 'body', art: 'body.svg', box: [48, 290, 264, 96], depth: NEAR },
        { id: 'lid', art: 'lid.svg', box: [68, 216, 224, 74], depth: NEAR },
        { id: 'seam', art: 'seam.svg', box: [72, 282, 216, 16], start: { opacity: 0.8 }, depth: NEAR },
        { id: 'hasp-l', art: 'hasp-l.svg', box: [137, 268, 18, 46], origin: [0.5, 38 / 46], depth: NEAR },
        { id: 'hasp-r', art: 'hasp-r.svg', box: [205, 268, 18, 46], origin: [0.5, 38 / 46], depth: NEAR },
        { id: 'lock', art: 'lock.svg', box: [158, 294, 44, 44], depth: NEAR },
        { id: 'glint-a', art: 'glint-a.svg', box: [104, 192, 138, 30], start: { opacity: 0 }, depth: NEAR },
        { id: 'glint-b', art: 'glint-b.svg', box: [140, 190, 120, 40], start: { opacity: 0 }, depth: NEAR },
        { id: 'props', art: 'props.svg', box: [-6, 284, 166, 172], depth: 0.42 },
        { id: 'spark', art: 'spark.svg', box: [177, 221, 6, 6] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1600,
    sound: { v: 1, inst: 'bell', tonic: 74, score },
};
