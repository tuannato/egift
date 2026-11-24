import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * "Tràng pháo đỏ" / Firecrackers, the Spring Festival wrapper. Flat gouache in daylight: a whitewashed garden
 * wall under grey upturned tile eaves, a round moon gate shut by a plain red round door, two long strings of
 * red firecrackers hanging from the eave tips to near the ground, potted mandarin trees, plum branches
 * reaching in from the top corners, stone paving.
 *
 * Opening: the strings go off from the bottom up, both at once, a segment at a time (2.5 a second, never
 * faster): each segment trembles and pops away while red paper flies from it. Smoke climbs the strings, a
 * big cloud gathers over the gate; as it clears, the round door shrinks and fades away as one piece and a
 * bright courtyard with a lit pavilion shows through the gate. The red paper stays on the paving.
 *
 * No character or character-like mark anywhere: plain red tubes, a plain red door with one ring pull.
 *
 * Canvas 360x450. The art is generated in canvas coordinates (scripts/art/firecrackers.gen.mjs): each SVG's
 * viewBox is its box; the boxes below are copied from it by hand and must match.
 */

/** The strings: x, top, segment height, segment count (segment 1 is the lowest). */
const SL = 58;
const SR = 302;
const TOP = 104;
const SEG = 56;
const NSEG = 5;
const BOTTOM = TOP + NSEG * SEG;
/** When each segment goes off, lowest first: 400 ms apart, so never more than 2.5 bursts a second. */
const BURST = [250, 650, 1050, 1450, 1850] as const;
/** The paper bits for each burst come from one of two layers per side, moved up between uses. */
const BITS_DUR = 700;

const segY = (k: number) => TOP + (NSEG - k) * SEG;
const segBox = (x: number, k: number): LayerDef['box'] => [x - 20, segY(k) - 2, 40, k === 1 ? SEG + 30 : SEG + 16];
const segs: LayerDef[] = [];
for (const [side, x] of [['l', SL], ['r', SR]] as const) {
    for (let k = 1; k <= NSEG; k += 1) segs.push({ id: `seg-${side}${k}`, art: `seg-${side}${k}.svg`, box: segBox(x, k), origin: [0.5, (SEG / 2 + 2) / segBox(x, k)[3]], depth: 0.3 });
}
/** Bits layer `a` serves bursts 1, 3, 5 and `b` bursts 2, 4; each starts at the level of its first burst. */
const bitsBox = (x: number): LayerDef['box'] => [x - 7, BOTTOM - SEG / 2 - 5, 14, 10];
const bits: LayerDef[] = [];
for (const [side, x] of [['l', SL], ['r', SR]] as const) {
    bits.push({ id: `bits-${side}a`, art: `bits-${side}a.svg`, box: bitsBox(x), depth: 0.3 });
    bits.push({ id: `bits-${side}b`, art: `bits-${side}b.svg`, box: bitsBox(x), start: { y: -SEG }, depth: 0.3 });
}

const open: Step[] = [];
BURST.forEach((t, i) => {
    const k = i + 1;
    for (const side of ['l', 'r'] as const) {
        const seg = `seg-${side}${k}`;
        // The segment trembles and pops away; the one above it jolts.
        open.push({ kind: 'shake', layer: seg, at: t, dur: 160, amp: 2.4, times: 3 });
        open.push({ kind: 'move', layer: seg, at: t + 50, dur: 190, ease: 'out', to: { sx: 1.45, sy: 1.3, opacity: 0 } });
        if (k < NSEG) open.push({ kind: 'shake', layer: `seg-${side}${k + 1}`, at: t + 40, dur: 240, amp: 1.3, times: 2 });
        // Red paper flies from it.
        const layer = `bits-${side}${i % 2 === 0 ? 'a' : 'b'}`;
        if (k > 2) open.push({ kind: 'move', layer, at: t - 50, dur: 0, to: { y: -SEG * i } });
        open.push({ kind: 'scatter', layer, at: t + 40, dur: BITS_DUR, count: 9, spread: 46, fall: 64 });
    }
    open.push({ kind: 'shake', layer: 'door', at: t + 40, dur: 200, amp: 0.8, times: 2 });
});
open.push(
    // Smoke climbs the strings as they go off, then thins away.
    { kind: 'move', layer: 'smoke-side', at: 250, dur: 420, ease: 'out', to: { opacity: 0.95 } },
    { kind: 'move', layer: 'smoke-side', at: 250, dur: 1900, ease: 'out', to: { sx: 1, sy: 1, y: -30 } },
    { kind: 'move', layer: 'smoke-side', at: 2150, dur: 900, ease: 'in', to: { opacity: 0, y: -64 } },
    // The paper settles on the paving while the smoke is thick.
    { kind: 'move', layer: 'debris', at: 1300, dur: 1100, ease: 'inout', to: { opacity: 1 } },
    // A big cloud gathers over the gate, and clears.
    { kind: 'move', layer: 'smoke-c', at: 1650, dur: 500, ease: 'out', to: { opacity: 0.9 } },
    { kind: 'move', layer: 'smoke-c', at: 1650, dur: 650, ease: 'out', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'smoke-c', at: 2250, dur: 800, ease: 'in', to: { opacity: 0, sx: 1.14, sy: 1.1, y: -26 } },
    // As it clears, the round door shrinks and fades as one piece; the light comes up in the courtyard.
    { kind: 'move', layer: 'door', at: 2350, dur: 600, ease: 'in', to: { sx: 0.7, sy: 0.7, opacity: 0 } },
    { kind: 'move', layer: 'glow', at: 2500, dur: 900, ease: 'out', to: { opacity: 0.9 } },
);

/** The strings hang still but for a slow pendulum sway: each segment shifts by its distance from the top. */
const SWAY = 0.5;
const sway: IdleStep[] = [];
for (const [side, phase] of [['l', 0], ['r', 0.3]] as const) {
    for (let k = 1; k <= NSEG; k += 1) {
        const dist = (NSEG - k) * SEG + SEG / 2;
        sway.push({ layer: `seg-${side}${k}`, field: 'x', amp: Math.round(dist * Math.tan((SWAY * Math.PI) / 180) * 100) / 100, period: 4200, phase });
        sway.push({ layer: `seg-${side}${k}`, field: 'turn', amp: SWAY, period: 4200, phase });
    }
}
const blossoms: IdleStep[] = [
    { layer: 'plum-l', field: 'turn', amp: 1.2, period: 5200 },
    { layer: 'plum-r', field: 'turn', amp: 1.2, period: 4600, phase: 0.4 },
];

export const firecrackers: WrapperDef = {
    id: 'firecrackers',
    name: { vi: 'Tràng pháo đỏ', en: 'Firecrackers' },
    ambient: ['#D93A26', '#E8B33C', '#F5CF92'],
    blurb: {
        vi: 'Cổng trăng trên tường vườn. Pháo nổ từ dưới lên, khói tan, cánh cửa tròn biến đi và khoảng sân sáng hiện ra.',
        en: 'A moon gate in a garden wall. The firecrackers go off from the bottom up, the smoke clears, and a lit courtyard shows through.',
    },
    // The whitewash for the face, ink for the words, the strings' deep red for the one loud colour.
    theme: { ground: '#2B2C31', surface: '#F4EDE1', ink: '#2B2C31', accent: '#9E2418', onAccent: '#F4EDE1', material: 'plate', corner: 'round', face: 'serif', voice: 'chime' },
    focus: [0.5, 0.58],
    size: [360, 450],
    backdrop: '#F5CF92',
    layers: [
        { id: 'garden', art: 'garden.svg', box: [82, 164, 196, 196], depth: 0.06 },
        { id: 'door', art: 'door.svg', box: [82, 164, 196, 196], depth: 0.12 },
        { id: 'wall', art: 'wall.svg', box: [0, 0, 360, 450], depth: 0.12 },
        { id: 'glow', art: 'glow.svg', box: [30, 112, 300, 300], start: { opacity: 0 }, depth: 0.12 },
        { id: 'debris', art: 'debris.svg', box: [0, 366, 360, 84], start: { opacity: 0 }, depth: 0.3 },
        { id: 'trees', art: 'trees.svg', box: [0, 258, 360, 186], depth: 0.4 },
        ...segs,
        { id: 'smoke-side', art: 'smoke-side.svg', box: [0, 170, 360, 240], origin: [0.5, 1], start: { opacity: 0, sx: 0.85, sy: 0.35 }, depth: 0.34 },
        ...bits,
        { id: 'smoke-c', art: 'smoke-c.svg', box: [30, 126, 300, 272], origin: [0.5, 0.55], start: { opacity: 0, sx: 0.45, sy: 0.45 }, depth: 0.2 },
        { id: 'plum-l', art: 'plum-l.svg', box: [0, 0, 172, 116], origin: [0, 0.15], depth: 0.55 },
        { id: 'plum-r', art: 'plum-r.svg', box: [188, 0, 172, 116], origin: [1, 0.15], depth: 0.55 },
    ],
    idle: [...sway, ...blossoms],
    afterglow: [...blossoms, { layer: 'glow', field: 'opacity', amp: 0.14, period: 3600 }],
    open,
    revealAt: 2900,
    // Sparse crackles of noise with each burst, then a low bell that settles on home.
    sound: {
        v: 1,
        inst: 'bell',
        tonic: 62,
        score: scaled(1, together(
            ...BURST.map((t, i) => [
                { at: t + 40, pitch: 86 - (i % 2) * 3, dur: 50, gain: 0.5, inst: 'noise' as const },
                { at: t + 120, pitch: 81 + (i % 3), dur: 40, gain: 0.35, inst: 'noise' as const },
                ...(i % 2 === 0 ? [{ at: t + 230, pitch: 84, dur: 40, gain: 0.28, inst: 'noise' as const }] : []),
            ]),
            tune(90, 'A4/4 | D4/1!', { start: 2250, gain: 0.55 }),
            tune(90, '-/4 | D3/1', { start: 2250, inst: 'pad', gain: 0.3 }),
        )),
    },
};
