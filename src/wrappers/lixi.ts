import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Red envelope — cyberpunk Tết. Lunar New Year in a neon city: a black-lacquer
 * lì xì edged with vermilion light, its ornament a circuit that blooms into
 * apricot blossoms, sealed by a holographic hex lock. Opening: the lock's rings
 * counter-rotate and ping, the lock releases with a tremor and flies apart,
 * the flap folds up over a hard line of light, a holographic card rises,
 * glitches, stabilises and locks with a lens streak, and neon blossoms and
 * pixel sparks fall.
 *
 * Canvas 360x450. Every glow is a crisp layer plus a soft screen-blended one.
 * The art is generated in canvas coordinates: each SVG's viewBox is its box.
 */

/** Layers that make up the envelope body (they hover together). */
const BODY = ['env-back', 'flap-back', 'env-front', 'front-glow', 'pulse-a', 'pulse-b', 'flap', 'mouth', 'seal-outer', 'seal-inner', 'seal-core', 'scan'];
/** Body layers still in view once open (the envelope settles lower as the card rises). */
const SETTLE = ['env-back', 'flap-back', 'env-front', 'front-glow', 'pulse-a', 'pulse-b', 'mouth'];
/** Body layers that tremble when the lock releases. */
const TREMOR = ['env-back', 'env-front', 'front-glow', 'pulse-a', 'pulse-b', 'flap', 'seal-outer', 'seal-inner', 'seal-core'];

const open: Step[] = [
    // 1. Wake: the seal's rings counter-rotate, the circuit lights up, two scan pings.
    { kind: 'move', layer: 'seal-outer', at: 0, dur: 1100, ease: 'inout', to: { turn: 120 } },
    { kind: 'move', layer: 'seal-inner', at: 0, dur: 1100, ease: 'inout', to: { turn: -180 } },
    { kind: 'move', layer: 'seal-core', at: 0, dur: 500, ease: 'out', to: { sx: 1.18, sy: 1.18 } },
    { kind: 'move', layer: 'pulse-a', at: 0, dur: 700, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'pulse-b', at: 200, dur: 700, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'front-glow', at: 0, dur: 900, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'scan', at: 100, dur: 100, ease: 'out', to: { opacity: 0.8 } },
    { kind: 'move', layer: 'scan', at: 100, dur: 650, ease: 'out', to: { sx: 1.7, sy: 1.7 } },
    { kind: 'move', layer: 'scan', at: 300, dur: 450, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'scan', at: 760, dur: 0, to: { sx: 0.3, sy: 0.3 } },
    { kind: 'move', layer: 'scan', at: 780, dur: 100, ease: 'out', to: { opacity: 0.5 } },
    { kind: 'move', layer: 'scan', at: 780, dur: 380, ease: 'out', to: { sx: 2, sy: 2 } },
    { kind: 'move', layer: 'scan', at: 860, dur: 300, ease: 'in', to: { opacity: 0 } },
    // 2. Release: a tremor, then the lock shatters outward as one burst.
    ...TREMOR.map((layer): Step => ({ kind: 'shake', layer, at: 880, dur: 380, amp: 2.4, times: 8 })),
    { kind: 'move', layer: 'seal-outer', at: 1200, dur: 320, ease: 'out', to: { sx: 1.9, sy: 1.9, turn: 180, opacity: 0 } },
    { kind: 'move', layer: 'seal-inner', at: 1200, dur: 320, ease: 'out', to: { sx: 2.5, sy: 2.5, turn: -270, opacity: 0 } },
    { kind: 'move', layer: 'seal-core', at: 1200, dur: 260, ease: 'out', to: { sx: 2.2, sy: 2.2, opacity: 0 } },
    { kind: 'scatter', layer: 'pixel', at: 1200, dur: 800, count: 14, spread: 80, fall: 40 },
    // 3. The flap unlatches and folds up; a hard line of light in the mouth.
    { kind: 'move', layer: 'flap', at: 1350, dur: 330, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'flap', at: 1680, dur: 0, to: { opacity: 0 } },
    { kind: 'move', layer: 'flap-back', at: 1680, dur: 380, ease: 'out', to: { sy: 1 } },
    { kind: 'move', layer: 'mouth', at: 1620, dur: 300, ease: 'out', to: { opacity: 1, sx: 1 } },
    // 4. The holographic card rises, glitches, stabilises; light floods the scene.
    { kind: 'move', layer: 'flap-back', at: 1950, dur: 650, ease: 'inout', to: { opacity: 0.1 } },
    { kind: 'move', layer: 'card', at: 1900, dur: 450, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'card', at: 1950, dur: 1050, ease: 'inout', to: { y: -114 } },
    { kind: 'move', layer: 'card', at: 2420, dur: 60, ease: 'linear', to: { opacity: 0.55 } },
    { kind: 'move', layer: 'card', at: 2480, dur: 90, ease: 'linear', to: { opacity: 1 } },
    { kind: 'shake', layer: 'card', at: 2400, dur: 220, amp: 4, times: 5 },
    { kind: 'shake', layer: 'card', at: 2720, dur: 160, amp: 2.5, times: 3 },
    ...SETTLE.map((layer): Step => ({ kind: 'move', layer, at: 2000, dur: 1100, ease: 'inout', to: { y: 12 } })),
    { kind: 'move', layer: 'haze', at: 2000, dur: 1100, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'spill', at: 1700, dur: 900, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'bokeh', at: 1950, dur: 1400, ease: 'inout', to: { y: 16, opacity: 1 } },
    { kind: 'move', layer: 'city', at: 1950, dur: 1400, ease: 'inout', to: { y: 4 } },
    // The lock: the card snaps to full size under a lens streak.
    { kind: 'move', layer: 'card', at: 2960, dur: 340, ease: 'back', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'flare', at: 2920, dur: 200, ease: 'out', to: { opacity: 1, sx: 1 } },
    { kind: 'move', layer: 'flare', at: 3200, dur: 800, ease: 'inout', to: { opacity: 0.16 } },
    { kind: 'move', layer: 'mouth', at: 3000, dur: 700, ease: 'inout', to: { opacity: 0.5 } },
    { kind: 'move', layer: 'pulse-a', at: 3100, dur: 900, ease: 'inout', to: { opacity: 0.45 } },
    { kind: 'move', layer: 'pulse-b', at: 3100, dur: 900, ease: 'inout', to: { opacity: 0.45 } },
    { kind: 'move', layer: 'front-glow', at: 3100, dur: 900, ease: 'inout', to: { opacity: 0.65 } },
    // 5. Neon blossoms and pixel sparks scatter and fall.
    { kind: 'move', layer: 'pixel', at: 2850, dur: 0, to: { y: -94 } },
    { kind: 'scatter', layer: 'blossom', at: 2890, dur: 1800, count: 14, spread: 160, fall: 170 },
    { kind: 'scatter', layer: 'pixel', at: 2890, dur: 1300, count: 24, spread: 175, fall: 110 },
];

const idle: IdleStep[] = [
    ...BODY.map((layer): IdleStep => ({ layer, field: 'y', amp: 1.6, period: 4200 })),
    { layer: 'seal-outer', field: 'turn', amp: 8, period: 9000 },
    { layer: 'seal-inner', field: 'turn', amp: -10, period: 7000 },
    { layer: 'seal-core', field: 'opacity', amp: 0.2, period: 2400 },
    { layer: 'seal-core', field: 'sx', amp: 0.04, period: 2400 },
    { layer: 'seal-core', field: 'sy', amp: 0.04, period: 2400 },
    { layer: 'front-glow', field: 'opacity', amp: 0.18, period: 3600 },
    { layer: 'pulse-a', field: 'opacity', amp: 0.45, period: 2200 },
    { layer: 'pulse-b', field: 'opacity', amp: 0.45, period: 2700, phase: 0.5 },
    { layer: 'spill', field: 'opacity', amp: 0.12, period: 4200 },
    { layer: 'haze', field: 'opacity', amp: 0.12, period: 5200, phase: 0.3 },
    { layer: 'bokeh', field: 'x', amp: 3, period: 9000 },
    { layer: 'drone', field: 'y', amp: 3, period: 3400 },
    { layer: 'rain', field: 'y', amp: 3, period: 1800 },
];

const afterglow: IdleStep[] = [
    ...SETTLE.map((layer): IdleStep => ({ layer, field: 'y', amp: 1.2, period: 4200 })),
    { layer: 'card', field: 'y', amp: 2.5, period: 4600 },
    { layer: 'card', field: 'opacity', amp: 0.07, period: 2600 },
    { layer: 'flare', field: 'opacity', amp: 0.08, period: 3200 },
    { layer: 'front-glow', field: 'opacity', amp: 0.15, period: 4000 },
    { layer: 'pulse-a', field: 'opacity', amp: 0.35, period: 2400 },
    { layer: 'pulse-b', field: 'opacity', amp: 0.35, period: 3000, phase: 0.5 },
    { layer: 'mouth', field: 'opacity', amp: 0.15, period: 2800 },
    { layer: 'haze', field: 'opacity', amp: 0.1, period: 5200 },
    { layer: 'bokeh', field: 'x', amp: 3, period: 9000 },
    { layer: 'drone', field: 'y', amp: 3, period: 3400 },
    { layer: 'rain', field: 'y', amp: 3, period: 1800 },
];

export const lixi: WrapperDef = {
    id: 'lixi',
    name: { vi: 'Bao lì xì', en: 'Red envelope' },
    ambient: ['#FF3B2F', '#FF2E88', '#19E3FF'],
    blurb: {
        vi: 'Bao lì xì sơn đen viền neon giữa thành phố Tết. Khoá lục giác bung ra, tấm thiệp sáng trồi lên, hoa mai rơi.',
        en: 'A black-lacquer envelope edged in neon, in a city at Tết. The hex lock bursts, a card of light rises, apricot blossoms fall.',
    },
    // Vermilion lacquer and gold leaf: the frame becomes the envelope.
    theme: { ground: '#0A0406', surface: '#9A0F1B', ink: '#FFF4E0', accent: '#FFCF5A', onAccent: '#2A0508', material: 'lacquer', corner: 'round', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 240 / 450],
    size: [360, 450],
    backdrop: '#0A0A0F',
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-4, -4, 368, 458], depth: 0.05 },
        { id: 'haze', art: 'haze.svg', box: [-12, 150, 384, 260], blend: 'screen', start: { opacity: 0.6 }, depth: 0.12 },
        { id: 'city', art: 'city.svg', box: [-6, 0, 372, 395], depth: 0.18 },
        { id: 'rain', art: 'rain.svg', box: [-14, -12, 388, 474], depth: 0.3 },
        { id: 'drone', art: 'drone.svg', box: [30, 52, 64, 64], depth: 0.32 },
        { id: 'ground', art: 'ground.svg', box: [-6, 386, 372, 70], depth: 0.25 },
        { id: 'spill', art: 'spill.svg', box: [30, 80, 300, 370], blend: 'screen', start: { opacity: 0.8 }, depth: 0.25 },
        { id: 'env-back', art: 'env-back.svg', box: [105, 150, 150, 230], depth: 0.45 },
        { id: 'flap-back', art: 'flap-back.svg', box: [100, 46, 160, 108], origin: [0.5, 104 / 108], start: { sy: 0 }, depth: 0.45 },
        { id: 'card', art: 'card.svg', box: [99, 157, 162, 206], start: { opacity: 0, sx: 0.92, sy: 0.92 }, depth: 0.55 },
        { id: 'env-front', art: 'env-front.svg', box: [100, 159, 160, 222], depth: 0.45 },
        { id: 'front-glow', art: 'front-glow.svg', box: [89, 144, 182, 252], blend: 'screen', start: { opacity: 0.7 }, depth: 0.45 },
        { id: 'pulse-a', art: 'pulse-a.svg', box: [106, 186, 148, 200], blend: 'screen', start: { opacity: 0.5 }, depth: 0.45 },
        { id: 'pulse-b', art: 'pulse-b.svg', box: [100, 268, 160, 116], blend: 'screen', start: { opacity: 0.5 }, depth: 0.45 },
        { id: 'flap', art: 'flap.svg', box: [97, 142, 166, 114], origin: [0.5, 8 / 114], depth: 0.45 },
        { id: 'mouth', art: 'mouth.svg', box: [96, 146, 168, 22], blend: 'screen', start: { opacity: 0, sx: 0.1 }, depth: 0.45 },
        { id: 'seal-outer', art: 'seal-outer.svg', box: [142, 202, 76, 76], depth: 0.45 },
        { id: 'seal-inner', art: 'seal-inner.svg', box: [154, 214, 52, 52], depth: 0.45 },
        { id: 'seal-core', art: 'seal-core.svg', box: [163, 223, 34, 34], depth: 0.45 },
        { id: 'scan', art: 'scan.svg', box: [118, 178, 124, 124], blend: 'screen', start: { opacity: 0, sx: 0.3, sy: 0.3 }, depth: 0.45 },
        { id: 'bokeh', art: 'bokeh.svg', box: [-40, -30, 440, 502], blend: 'screen', start: { opacity: 0.8 }, depth: 0.9 },
        { id: 'flare', art: 'flare.svg', box: [-20, 80, 400, 40], blend: 'screen', start: { opacity: 0, sx: 0.2 }, depth: 0.6 },
        { id: 'blossom', art: 'blossom.svg', box: [170, 136, 20, 20], blend: 'screen' },
        { id: 'pixel', art: 'pixel.svg', box: [172, 232, 16, 16], blend: 'screen' },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2900,
    // A bright line on five notes (G A B D E), plucked, a small bell on the last.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 67,
        score: scaled(0.58, together(
            tune(132, 'D5/8 E5/8 G5/4 E5/8 D5/8 B4/4 | D5/8 E5/8 G5/8 A5/8 B5/2!'),
            tune(132, 'G3/1 | D3/2 G3/2', { gain: 0.42 }),
            tune(132, '-/1 | -/2 G6/2', { inst: 'bell', gain: 0.3 }),
        )),
    },
};
