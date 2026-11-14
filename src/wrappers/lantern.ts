import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * "Đèn giấy" / Paper lantern, the Mid-Autumn wrapper. A pleated paper lantern
 * hangs from a bamboo branch under the full moon, unlit and still a flat pack:
 * its pleats pressed between the two end boards, shut with a paper sleeve and
 * a cord. Opening: the sleeve slips off, it stretches open pleat by pleat, the flame takes, the light comes through
 * the paper, spreads into the bamboo and the air, and small lanterns light up
 * across the night, near ones first.
 *
 * Drawn as translucent backlit paper: every pleat is its own translucent
 * layer, and they really overlap at the folds; the light is a layer BEHIND
 * them, so what the eye sees is light through one, two or three sheets.
 *
 * Canvas 360x450. Art in public/wrappers/lantern/ is authored in canvas units
 * (each SVG's viewBox is its layer box) by scripts/art/lantern.gen.mjs; the
 * geometry below must match it.
 */

const CX = 180;
const TOP = 182;
const N = 6;
const BH = 24;
const OV = 3.5;
const BOT = TOP + N * BH;
/** How flat a folded pleat is. */
const FOLDED = 0.2;
/** How far one pleat lowers everything under it when it opens. */
const DROP = BH * (1 - FOLDED);

/** Half-widths of the open body at the folds; folded, every pleat is pressed out to one width (PACK). Same as the generator. */
const valley = (k: number): number => 40 + 24 * Math.sin(Math.PI * (0.09 + 0.82 * (k / N))) ** 0.9;
const mountain = (k: number): number => (valley(k) + valley(k + 1)) / 2 + 4.5;
const PACK = 66;
/** The end boards are as wide as the pack while it is shut, and draw in to the lantern's ends as it opens. */
const BOARD = (PACK + 4) / (valley(0) + 3);

const FULL = [-8, -8, 376, 466] as const;
const BODY = [CX - 82, TOP - 8, 164, N * BH + 16] as const;

/** Parallax planes. Everything of the lantern shares one, so the paper and the light behind it stay registered. */
const D_SKY = 0.04;
const D_FAR = 0.1;
const D_BAMBOO = 0.18;
const D_LANTERN = 0.3;

const bands: LayerDef[] = Array.from({ length: N }, (_, k): LayerDef => ({
    id: `band-${k + 1}`,
    art: `band-${k + 1}.svg`,
    box: [CX - 82, TOP + k * BH - OV, 164, BH + 2 * OV],
    origin: [0.5, OV / (BH + 2 * OV)],
    depth: D_LANTERN,
    start: { sy: FOLDED, sx: PACK / mountain(k), y: -k * DROP },
}));

const layers: LayerDef[] = [
    { id: 'sky', art: 'sky.svg', box: FULL, depth: D_SKY },
    { id: 'moonglow', art: 'moonglow.svg', box: [100, -36, 280, 280], depth: D_SKY, blend: 'screen' },
    { id: 'far', art: 'far.svg', box: FULL, depth: D_FAR },
    { id: 'wash', art: 'wash.svg', box: FULL, depth: D_SKY, blend: 'screen', start: { opacity: 0 } },
    { id: 'far-c', art: 'far-c.svg', box: FULL, depth: D_FAR, start: { opacity: 0 } },
    { id: 'far-b', art: 'far-b.svg', box: FULL, depth: D_FAR, start: { opacity: 0 } },
    { id: 'far-a', art: 'far-a.svg', box: FULL, depth: D_FAR, start: { opacity: 0 } },
    { id: 'bamboo', art: 'bamboo.svg', box: FULL, depth: D_BAMBOO },
    { id: 'bamboo-lit', art: 'bamboo-lit.svg', box: FULL, depth: D_BAMBOO, start: { opacity: 0 } },
    { id: 'halo', art: 'halo.svg', box: [CX - 175, 81, 350, 350], origin: [0.5, 0.5], depth: D_LANTERN, blend: 'screen', start: { opacity: 0, sx: 0.3, sy: 0.3 } },
    { id: 'hang', art: 'hang.svg', box: [CX - 60, 160, 120, 28], depth: D_LANTERN, start: { sx: BOARD } },
    { id: 'fill', art: 'fill.svg', box: BODY, depth: D_LANTERN, start: { opacity: 0 } },
    ...bands,
    { id: 'tail', art: 'tail.svg', box: [CX - 60, BOT - 3, 120, 62], origin: [0.5, 0.05], depth: D_LANTERN, start: { y: -N * DROP, sx: BOARD } },
    { id: 'tie', art: 'tie.svg', box: [CX - 70, TOP - 12, 140, 64], origin: [0.5, 0.35], depth: D_LANTERN },
    { id: 'warm', art: 'warm.svg', box: BODY, depth: D_LANTERN, blend: 'screen', start: { opacity: 0 } },
    { id: 'core', art: 'core.svg', box: BODY, origin: [0.5, (266 - (TOP - 8)) / (N * BH + 16)], depth: D_LANTERN, blend: 'screen', start: { opacity: 0, sx: 0.4, sy: 0.4 } },
    { id: 'mote', art: 'mote.svg', box: [CX - 2.5, 250, 5, 5], blend: 'screen' },
    { id: 'fore', art: 'fore.svg', box: [-20, -8, 400, 466], depth: 0.9 },
];

// Beat times (ms).
const FIRST = 500;
const EVERY = 230;
const PLEAT = 290;
const LIT = FIRST + (N - 1) * EVERY + PLEAT - 60; // the flame takes as the last pleat settles

const open: Step[] = [
    // 0. The seal comes off: the sleeve and its cord loosen, slip down and are gone.
    { kind: 'shake', layer: 'tie', at: 0, dur: 280, amp: 1.2, times: 3 },
    { kind: 'move', layer: 'tie', at: 200, dur: 460, ease: 'in', to: { y: 58, turn: 13, sy: 0.9 } },
    { kind: 'move', layer: 'tie', at: 380, dur: 300, ease: 'inout', to: { opacity: 0 } },

    // 1. Pleat by pleat: pleat j springs open, and everything under it drops by exactly what it gained.
    ...Array.from({ length: N }, (_, j): Step[] => {
        const at = FIRST + j * EVERY;
        const below = (k: number): number => -(k - j - 1) * DROP;
        return [
            { kind: 'move', layer: `band-${j + 1}`, at, dur: PLEAT, ease: 'back', to: { sy: 1, sx: 1 } },
            ...Array.from({ length: N - 1 - j }, (_, i): Step => ({ kind: 'move', layer: `band-${j + 2 + i}`, at, dur: PLEAT, ease: 'back', to: { y: below(j + 1 + i) } })),
            { kind: 'move', layer: 'tail', at, dur: PLEAT, ease: 'back', to: j === N - 1 ? { y: below(N), sx: 1 } : { y: below(N) } },
        ];
    }).flat(),
    { kind: 'move', layer: 'hang', at: FIRST, dur: PLEAT, ease: 'out', to: { sx: 1 } },

    // 2. The flame takes; the light comes through the paper.
    { kind: 'move', layer: 'core', at: LIT, dur: 520, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'fill', at: LIT + 80, dur: 800, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'warm', at: LIT + 200, dur: 900, ease: 'inout', to: { opacity: 1 } },
    // the moon gives way to it
    { kind: 'move', layer: 'moonglow', at: LIT + 200, dur: 1600, ease: 'inout', to: { opacity: 0.22 } },

    // 3. The glow spreads: into the air, into the bamboo, across the night.
    { kind: 'move', layer: 'halo', at: LIT + 120, dur: 1500, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'bamboo-lit', at: LIT + 400, dur: 1300, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'wash', at: LIT + 600, dur: 1800, ease: 'inout', to: { opacity: 1 } },
    { kind: 'scatter', layer: 'mote', at: LIT + 700, dur: 2600, count: 24, spread: 150, fall: -46 },

    // 4. Small lanterns answer, the near ones first.
    { kind: 'move', layer: 'far-a', at: LIT + 900, dur: 600, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'far-b', at: LIT + 1350, dur: 700, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'far-c', at: LIT + 1850, dur: 900, ease: 'out', to: { opacity: 1 } },
    { kind: 'scatter', layer: 'mote', at: LIT + 1500, dur: 2300, count: 20, spread: 160, fall: -60 },
];

/** The whole lantern swings as one: every piece gets the same small sideways loop. */
const SWAY = { amp: 1.1, period: 5200 } as const;
const sway = (ids: readonly string[]): IdleStep[] => ids.map((layer): IdleStep => ({ layer, field: 'x', ...SWAY }));
const PAPER = [...bands.map((b) => b.id), 'tail'];

const idle: IdleStep[] = [
    ...sway([...PAPER, 'tie', 'hang']),
    { layer: 'moonglow', field: 'opacity', amp: 0.12, period: 6400 },
];

const afterglow: IdleStep[] = [
    ...sway([...PAPER, 'hang', 'fill', 'warm', 'core']),
    // the flame breathes, never flickers
    { layer: 'core', field: 'opacity', amp: 0.14, period: 2300 },
    { layer: 'warm', field: 'opacity', amp: 0.12, period: 3100, phase: 0.3 },
    { layer: 'halo', field: 'opacity', amp: 0.08, period: 3900, phase: 0.5 },
    { layer: 'far-a', field: 'opacity', amp: 0.1, period: 3300 },
    { layer: 'far-b', field: 'opacity', amp: 0.12, period: 2900, phase: 0.4 },
    { layer: 'far-c', field: 'opacity', amp: 0.16, period: 2500, phase: 0.7 },
    { layer: 'moonglow', field: 'opacity', amp: 0.08, period: 6400 },
];

export const lantern: WrapperDef = {
    id: 'lantern',
    name: { vi: 'Đèn giấy', en: 'Paper lantern' },
    ambient: ['#3A161C', '#FFA63D', '#F2DC9C'],
    blurb: {
        vi: 'Chiếc đèn xếp còn ép phẳng, buộc dây, treo dưới trăng rằm. Dây tuột, đèn bung từng nếp, sáng lên từ bên trong, rồi cả trời đèn thắp theo.',
        en: 'A paper lantern hangs tied flat under the full moon. The tie slips, it opens pleat by pleat, lights from within, and the night answers.',
    },
    // Wine-brown night glass, moon-pale type, one amber.
    theme: { ground: '#0C0506', surface: '#221012', ink: '#FFF3DC', accent: '#FFB648', onAccent: '#2A1003', material: 'glass', corner: 'round', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.44],
    size: [360, 450],
    backdrop: '#12060A',
    layers,
    idle,
    afterglow,
    open,
    revealAt: LIT + 900,
    // Slow bells on five notes (G A B D E), over a held tone.
    sound: {
        v: 1,
        inst: 'bell',
        tonic: 67,
        score: scaled(0.75, together(
            tune(132, 'D5/4 E5/4 G5/2 | E5/4 D5/4 G5/2!'),
            tune(132, 'G3/1 | G3/1', { inst: 'pad', gain: 0.5 }),
        )),
    },
};

export default lantern;
