import type { IdleStep, Step, WrapperDef } from '../stage/format';

/**
 * Beacon — a lighthouse, for someone in a hard stretch: a light to steer by.
 * Bold flat shapes: a tall white tower with vermilion bands on a black
 * headland, its lantern room dark; heavy bars of cloud over a thin moon;
 * three rows of curling waves, the nearest breaking on the rock; far to the
 * right a small boat on the swell. Opening: the lamp lights and its halo
 * grows; the beam, lying level at lantern height and pointing out of the
 * frame to the left, turns round the tower toward us, flares as it faces us,
 * and comes out to the right, dipping to rest on the boat; the boat answers
 * with its own lamp, a road of light lies on the water, the cloud parts and
 * the stars come out.
 *
 * The stage is flat, so the lamp turning is two wedges about the lantern: the
 * left one shortens to nothing, the right one grows from nothing. Their light
 * thins to nothing along their length, so a far end never shows an edge.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/beacon.gen.mjs): each SVG's viewBox is its box.
 */

/** How far the right-hand beam dips, in degrees clockwise from level, to lie on the boat's mast. */
const DIP = 25;
/** The moment the turning lamp faces the viewer. */
const FACING = 1040;
/** The swell under the boat: the boat and its lamp ride the middle row of waves. */
const SWELL = { amp: 7, period: 6400, phase: 0.4 } as const;

const open: Step[] = [
    // 1. The lamp lights: the lit glass fades in, the halo grows, three or four small sparks leave the lantern.
    { kind: 'move', layer: 'lamp', at: 0, dur: 420, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'halo', at: 80, dur: 900, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'scatter', layer: 'spark', at: 240, dur: 900, count: 4, spread: 44, fall: 26 },
    // 2. The beam shows, level and to the left, then turns toward us: it shortens to nothing about the lamp.
    { kind: 'move', layer: 'beam-l', at: 240, dur: 300, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'beam-l', at: 520, dur: FACING - 520, ease: 'in', to: { sx: 0 } },
    { kind: 'move', layer: 'beam-l', at: FACING, dur: 20, to: { opacity: 0 } },
    //    Facing us, the lamp flares once: a small round light at the lantern, one smooth rise and one smooth fall
    //    (both ease in and out, so it neither snaps on nor turns sharply at its peak).
    { kind: 'move', layer: 'flare', at: FACING - 340, dur: 340, ease: 'inout', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'flare', at: FACING, dur: 460, ease: 'inout', to: { opacity: 0, sx: 0.5, sy: 0.5 } },
    //    It turns on: the beam grows out to the right and dips to the boat.
    { kind: 'move', layer: 'beam-r', at: FACING, dur: 20, to: { opacity: 1 } },
    { kind: 'move', layer: 'beam-r', at: FACING, dur: 660, ease: 'out', to: { sx: 1 } },
    { kind: 'move', layer: 'beam-r', at: FACING + 160, dur: 560, ease: 'inout', to: { turn: DIP } },
    // 3. The cloud parts and the stars come out.
    { kind: 'move', layer: 'cloud-a', at: 500, dur: 1900, ease: 'inout', to: { x: -58 } },
    { kind: 'move', layer: 'cloud-b', at: 500, dur: 1900, ease: 'inout', to: { x: 54 } },
    { kind: 'move', layer: 'stars', at: 1300, dur: 1300, ease: 'inout', to: { opacity: 1 } },
    // 4. The beam finds the boat: its own lamp comes on, and the road of light lies down on the water.
    { kind: 'move', layer: 'boat-lamp', at: 1700, dur: 260, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'glitter', at: 1760, dur: 700, ease: 'out', to: { opacity: 0.86, sx: 1, sy: 1 } },
];

/** The sea never stops: three rows sliding against each other, the surf rising and falling on the rock. */
const sea: IdleStep[] = [
    { layer: 'wave-a', field: 'x', amp: 10, period: 5200 },
    { layer: 'wave-b', field: 'x', ...SWELL },
    { layer: 'wave-c', field: 'x', amp: 5, period: 7800, phase: 0.7 },
    { layer: 'surf', field: 'sy', amp: 0.07, period: 5200, phase: 0.2 },
    { layer: 'surf', field: 'sx', amp: 0.03, period: 5200, phase: 0.45 },
    ...(['boat', 'boat-lamp'] as const).flatMap((layer): IdleStep[] => [
        { layer, field: 'x', ...SWELL },
        { layer, field: 'y', amp: 2.6, period: 3200, phase: 0.1 },
        { layer, field: 'turn', amp: 3.5, period: 3200, phase: 0.35 },
    ]),
];

const afterglow: IdleStep[] = [
    ...sea,
    { layer: 'beam-r', field: 'turn', amp: 3, period: 9000 },
    { layer: 'beam-r', field: 'sx', amp: 0.05, period: 5600, phase: 0.3 },
    { layer: 'glitter', field: 'opacity', amp: 0.14, period: 3600 },
    { layer: 'halo', field: 'sx', amp: 0.04, period: 4600 },
    { layer: 'halo', field: 'sy', amp: 0.04, period: 4600 },
];

export const beacon: WrapperDef = {
    id: 'beacon',
    name: { vi: 'Hải đăng', en: 'Lighthouse' },
    ambient: ['#0B1630', '#245189', '#FFD05C'],
    blurb: {
        vi: 'Biển động lúc chập tối, hình phẳng đậm. Đèn bật, luồng sáng xoay quanh tháp rồi dừng ở con thuyền; thuyền thắp đèn đáp lại.',
        en: 'A stormy sea at nightfall in bold flat shapes. The lamp lights, the beam turns round the tower and rests on the boat, which lights its own.',
    },
    // The night sky for the surface, the tower's white for the words, the lamp for the one loud colour.
    theme: { ground: '#070A11', surface: '#0B1630', ink: '#F4EDDE', accent: '#FFD05C', onAccent: '#070A11', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.44, 0.4],
    size: [360, 450],
    backdrop: '#0B1630',
    // The boxes are those the generator writes (copied by hand; a mismatch shows as stretched art).
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-6, -6, 372, 250], depth: 0.04 },
        { id: 'stars', art: 'stars.svg', box: [20, 4, 330, 164], start: { opacity: 0 }, depth: 0.04 },
        { id: 'cloud-b', art: 'cloud-b.svg', box: [146, 0, 290, 144], depth: 0.08 },
        { id: 'cloud-a', art: 'cloud-a.svg', box: [-70, 10, 334, 116], depth: 0.1 },
        { id: 'wave-c', art: 'wave-c.svg', box: [-70, 214, 500, 92], depth: 0.14 },
        { id: 'boat', art: 'boat.svg', box: [278, 208, 68, 60], origin: [0.5, 0.8], depth: 0.22 },
        { id: 'wave-b', art: 'wave-b.svg', box: [-70, 240, 500, 122], depth: 0.22 },
        { id: 'halo', art: 'halo.svg', box: [20, 24, 216, 216], start: { opacity: 0, sx: 0.2, sy: 0.2 }, depth: 0.3 },
        // Both beams pivot on the lamp: the right edge of the left one, the left edge of the right one.
        { id: 'beam-l', art: 'beam-l.svg', box: [-172, 96, 300, 72], origin: [1, 0.5], start: { opacity: 0 }, depth: 0.3 },
        { id: 'beam-r', art: 'beam-r.svg', box: [128, 96, 300, 72], origin: [0, 0.5], start: { opacity: 0, sx: 0 }, depth: 0.3 },
        { id: 'rock', art: 'rock.svg', box: [-6, 244, 270, 140], depth: 0.3 },
        { id: 'tower', art: 'tower.svg', box: [90, 86, 76, 222], depth: 0.3 },
        { id: 'lamp', art: 'lamp.svg', box: [112, 116, 32, 32], start: { opacity: 0 }, depth: 0.3 },
        { id: 'flare', art: 'flare.svg', box: [86, 90, 84, 84], start: { opacity: 0, sx: 0.4, sy: 0.4 }, depth: 0.3 },
        { id: 'boat-lamp', art: 'boat-lamp.svg', box: [296, 188, 44, 60], origin: [14 / 44, 1], start: { opacity: 0 }, depth: 0.22 },
        { id: 'surf', art: 'surf.svg', box: [154, 246, 126, 134], origin: [0.5, 1], depth: 0.4 },
        { id: 'wave-a', art: 'wave-a.svg', box: [-70, 296, 500, 160], depth: 0.55 },
        // The road of light lies over the near water too; it grows from the boat's end toward the viewer.
        { id: 'glitter', art: 'glitter.svg', box: [230, 270, 88, 98], origin: [0.85, 0], start: { opacity: 0, sx: 0.6, sy: 0.25 }, depth: 0.4 },
        { id: 'spark', art: 'spark.svg', box: [126, 130, 4, 4] },
    ],
    idle: sea,
    afterglow,
    open,
    revealAt: 1900,
    // A low held fifth, like the sea under everything, and two bell notes a long way off: one as the lamp
    // lights, one, lower and longer, as the beam finds the boat.
    sound: {
        v: 1,
        inst: 'bell',
        tonic: 62,
        score: [
            { at: 0, pitch: 50, dur: 3800, gain: 0.32, inst: 'pad' },
            { at: 0, pitch: 45, dur: 3800, gain: 0.28, inst: 'pad' },
            { at: 300, pitch: 81, dur: 700, gain: 0.53 },
            { at: 1780, pitch: 74, dur: 1600, gain: 0.64 },
        ],
    },
};
