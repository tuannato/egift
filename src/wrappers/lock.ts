import type { IdleStep, Step, WrapperDef } from '../stage/format';

/**
 * Lock — the wrapper nobody picks: what the page wears while a gift waits
 * behind a riddle, before the right answer is given.
 * A precise instrument in eCash's colours: a round plate of brushed titanium
 * with a clean keyhole and a thin blue edge light sits in three thin dial
 * rings on a dark glass dial; behind it a faint hex lattice fades to the
 * edges and two thin light bands cross. Closed, the three rings stand at odds
 * (each has one index mark, none under the pointer) and drift slowly against
 * each other, the light on the plate breathes, and one bead of light travels
 * the upright band.
 * Opening (the answer was right), a second and a half: the rings snap home
 * one after another until the three marks stand in line under the pointer,
 * the keyhole fills with blue-white light, and the plate's two halves part on
 * a cool glow.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/lock.gen.mjs): each SVG's viewBox is its box.
 */

/** Where each ring stands while the lock is closed, in degrees from home. */
const AWAY = { c: -74, b: 128, a: -152 };

const open: Step[] = [
    // 1. The rings turn home, outer first; each runs a little past and settles: a click.
    { kind: 'move', layer: 'ring-c', at: 0, dur: 520, ease: 'back', to: { turn: 0 } },
    { kind: 'move', layer: 'ring-b', at: 130, dur: 520, ease: 'back', to: { turn: 0 } },
    { kind: 'move', layer: 'ring-a', at: 260, dur: 520, ease: 'back', to: { turn: 0 } },
    // 2. The keyhole fills with light.
    { kind: 'move', layer: 'keylight', at: 700, dur: 240, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'sheen', at: 900, dur: 220, to: { opacity: 0 } },
    { kind: 'move', layer: 'pulse', at: 0, dur: 300, to: { opacity: 0 } },
    // 3. The halves part; the light behind them opens and takes the keyhole's light into itself.
    { kind: 'move', layer: 'glow', at: 960, dur: 120, to: { opacity: 1 } },
    { kind: 'move', layer: 'glow', at: 960, dur: 500, ease: 'out', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'plate-l', at: 980, dur: 460, ease: 'inout', to: { x: -52 } },
    { kind: 'move', layer: 'plate-r', at: 980, dur: 460, ease: 'inout', to: { x: 52 } },
    { kind: 'move', layer: 'plate-l', at: 1260, dur: 220, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'plate-r', at: 1260, dur: 220, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'keylight', at: 1000, dur: 300, ease: 'in', to: { sx: 2.4, sy: 2.4, opacity: 0 } },
    { kind: 'scatter', layer: 'spark', at: 1040, dur: 460, count: 12, spread: 120, fall: 26 },
];

const idle: IdleStep[] = [
    { layer: 'ring-c', field: 'turn', amp: 7, period: 15000 },
    { layer: 'ring-b', field: 'turn', amp: 9, period: 12000, phase: 0.5 },
    { layer: 'ring-a', field: 'turn', amp: 6, period: 18000, phase: 0.25 },
    { layer: 'sheen', field: 'opacity', amp: 0.22, period: 4600 },
    { layer: 'pulse', field: 'y', amp: 196, period: 9000 },
];

export const lock: WrapperDef = {
    id: 'lock',
    name: { vi: 'Ổ khoá', en: 'Lock' },
    ambient: ['#070D1A', '#0074C2', '#7FD4FF'],
    blurb: {
        vi: 'Ổ khoá titan viền sáng xanh giữa ba vòng số trên nền xanh đêm: trả lời đúng, ba vòng về thẳng hàng, lỗ khoá bừng sáng, hai nửa tách ra.',
        en: 'A titanium lock edged in blue light, in three dial rings on deep navy: the rings line up, the keyhole lights, the halves part.',
    },
    // Cool near-white, navy ink, eCash's blue for the one loud colour.
    theme: { ground: '#060C18', surface: '#F1F6FB', ink: '#0B1626', accent: '#0074C2', onAccent: '#FFFFFF', material: 'glass', corner: 'round', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 212 / 450],
    size: [360, 450],
    backdrop: '#070D1A',
    layers: [
        { id: 'ground', art: 'ground.svg', box: [-6, -6, 372, 462], depth: 0.05 },
        { id: 'pulse', art: 'pulse.svg', box: [165, 180, 30, 64], depth: 0.05 },
        { id: 'bed', art: 'bed.svg', box: [20, 52, 320, 334], depth: 0.25 },
        { id: 'ring-c', art: 'ring-c.svg', box: [50, 82, 260, 260], start: { turn: AWAY.c }, depth: 0.25 },
        { id: 'ring-b', art: 'ring-b.svg', box: [68, 100, 224, 224], start: { turn: AWAY.b }, depth: 0.25 },
        { id: 'ring-a', art: 'ring-a.svg', box: [86, 118, 188, 188], start: { turn: AWAY.a }, depth: 0.25 },
        { id: 'glow', art: 'glow.svg', box: [50, 82, 260, 260], start: { opacity: 0, sx: 0.45, sy: 0.45 }, depth: 0.25 },
        { id: 'plate-l', art: 'plate-l.svg', box: [114, 146, 66, 132], depth: 0.32 },
        { id: 'plate-r', art: 'plate-r.svg', box: [180, 146, 66, 132], depth: 0.32 },
        { id: 'keylight', art: 'keylight.svg', box: [136, 170, 88, 88], start: { opacity: 0 }, depth: 0.32 },
        { id: 'sheen', art: 'sheen.svg', box: [114, 146, 132, 132], start: { opacity: 0.75 }, blend: 'screen', depth: 0.32 },
        { id: 'spark', art: 'spark.svg', box: [176, 208, 8, 8] },
    ],
    idle,
    open,
    revealAt: 1300,
    // A fine mechanism settling: three glass ticks as the rings come home, then one clear note, the home note and its octave, as the light opens.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 76,
        score: [
            { at: 500, pitch: 83, dur: 50, gain: 0.3, inst: 'glassy' },
            { at: 630, pitch: 83, dur: 50, gain: 0.3, inst: 'glassy' },
            { at: 760, pitch: 88, dur: 50, gain: 0.34, inst: 'glassy' },
            { at: 1020, pitch: 88, dur: 460, gain: 0.7 },
            { at: 1020, pitch: 76, dur: 460, gain: 0.6 },
        ],
    },
};
