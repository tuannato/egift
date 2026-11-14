import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * "Pháo hoa" / Fireworks, the New Year wrapper. A harbour at night, seen as a
 * long exposure: a shell not yet lit — a fuse of light wound into a tight coil
 * inside one closed ring, a single spark on its loose end — hangs over the water. Opening: the shell climbs on a thin trail, breaks, and the
 * sky fills with blooms one after another; the water takes their colours and
 * the town lights up.
 *
 * Canvas 360x450, horizon at y = 318. Art in public/wrappers/fireworks/ is
 * authored in canvas units (each SVG's viewBox is its layer box) by
 * scripts/art/fireworks.gen.mjs; the boxes and centres below must match it.
 */

const SHELL = [180, 236] as const;
const MAIN = [180, 140] as const;
const CLIMB = MAIN[1] - SHELL[1];

/** Parallax planes. The shell, its trail, the flash and the main bloom share one so they stay registered. */
const D_SKY = 0.04;
const D_FAR = 0.1;
const D_SHOW = 0.2;
const D_TOWN = 0.32;

type Box = readonly [number, number, number, number];
/** Each bloom: id, box, centre, the moment it breaks, how long it takes to open, the scale it starts from. */
const BLOOMS: readonly (readonly [string, Box, readonly [number, number], number, number, number])[] = [
    // the main bloom starts part-open, hidden behind the round star that breaks first
    ['burst-a', [25, -15, 309, 386], MAIN, 1400, 1000, 0.36],
    ['burst-b', [18, 32, 163, 187], [100, 114], 1850, 900, 0.05],
    ['burst-c', [191, 31, 149, 152], [266, 106], 2250, 800, 0.05],
    ['burst-f', [136, -8, 139, 161], [206, 62], 2650, 850, 0.05],
    ['burst-d', [11, 171, 106, 121], [64, 224], 2950, 750, 0.05],
    ['burst-e', [240, 158, 116, 132], [298, 216], 3250, 750, 0.05],
];
const originOf = (b: Box, c: readonly [number, number]): [number, number] => [(c[0] - b[0]) / b[2], (c[1] - b[1]) / b[3]];
const SHELL_BOX: Box = [134, 190, 92, 108];

const layers: LayerDef[] = [
    { id: 'sky', art: 'sky.svg', box: [-8, -8, 376, 466], depth: D_SKY },
    { id: 'glow-a', art: 'glow-a.svg', box: [-8, -8, 376, 340], depth: D_SKY, blend: 'screen', start: { opacity: 0 } },
    { id: 'glow', art: 'glow.svg', box: [-8, -8, 376, 340], depth: D_SKY, blend: 'screen', start: { opacity: 0 } },
    { id: 'far', art: 'far.svg', box: [-8, 226, 376, 94], depth: D_FAR, blend: 'screen', start: { opacity: 0.45 } },
    // painted back to front: the high pale one, the small low ones, the two side blooms, the big gold one
    ...(['burst-f', 'burst-d', 'burst-e', 'burst-b', 'burst-c', 'burst-a'] as const).map((id): LayerDef => {
        const [, box, c, , , seed] = BLOOMS.find((b) => b[0] === id)!;
        return { id, art: `${id}.svg`, box, origin: originOf(box, c), depth: D_SHOW, blend: 'screen', start: { opacity: 0, sx: seed, sy: seed } };
    }),
    { id: 'burst-a0', art: 'burst-a0.svg', box: [113, 73, 134, 134], depth: D_SHOW, blend: 'screen', start: { opacity: 0, sx: 0.08, sy: 0.08 } },
    { id: 'tips', art: 'tips.svg', box: [-8, -8, 376, 330], depth: D_SHOW, blend: 'screen', start: { opacity: 0 } },
    { id: 'trail', art: 'trail.svg', box: [166, 140, 28, 96], origin: [0.5, 1], depth: D_SHOW, blend: 'screen', start: { opacity: 0, sy: 0.02 } },
    { id: 'city', art: 'city.svg', box: [-8, 226, 376, 96], depth: D_TOWN },
    { id: 'city-lit', art: 'city-lit.svg', box: [-8, 226, 376, 96], depth: D_TOWN, blend: 'screen', start: { opacity: 0 } },
    { id: 'water', art: 'water.svg', box: [-8, 318, 376, 140], depth: D_TOWN },
    { id: 'refl-a', art: 'refl-a.svg', box: [-8, 318, 376, 140], depth: D_TOWN, blend: 'screen', start: { opacity: 0 } },
    { id: 'refl-b', art: 'refl-b.svg', box: [-8, 318, 376, 140], depth: D_TOWN, blend: 'screen', start: { opacity: 0 } },
    { id: 'flash', art: 'flash.svg', box: [84, 44, 192, 192], depth: D_SHOW, blend: 'screen', start: { opacity: 0, sx: 0.1, sy: 0.1, y: -CLIMB } },
    { id: 'shell', art: 'shell.svg', box: SHELL_BOX, origin: originOf(SHELL_BOX, SHELL), depth: D_SHOW, blend: 'screen' },
    { id: 'seam', art: 'seam.svg', box: [110, 166, 140, 140], depth: D_SHOW, blend: 'screen', start: { opacity: 0.7 } },
    { id: 'ember', art: 'ember.svg', box: [MAIN[0] - 2, MAIN[1] - 2, 4, 4], blend: 'screen' },
    { id: 'bokeh', art: 'bokeh.svg', box: [-12, 150, 384, 312], depth: 0.9, blend: 'screen', start: { opacity: 0.6 } },
    { id: 'vignette', art: 'vignette.svg', box: [-8, -8, 376, 466] },
];

// Beat times (ms).
const LIFT = 550;
const BREAK = 1250;

const open: Step[] = [
    // 1. The coil brightens, winds tighter and trembles.
    { kind: 'move', layer: 'seam', at: 0, dur: 450, ease: 'out', to: { opacity: 1, sx: 1.1, sy: 1.1 } },
    { kind: 'move', layer: 'shell', at: 0, dur: LIFT, ease: 'in', to: { turn: -50 } },
    { kind: 'shake', layer: 'shell', at: 150, dur: 380, amp: 1.2, times: 5 },

    // 2. It unwinds upward, shrinking to a point of light, and leaves its trail behind.
    { kind: 'move', layer: 'shell', at: LIFT, dur: BREAK - LIFT, ease: 'out', to: { y: CLIMB, sx: 0.08, sy: 0.08, turn: 420 } },
    { kind: 'move', layer: 'shell', at: LIFT + 120, dur: 300, ease: 'in', to: { opacity: 0 } },
    { kind: 'move', layer: 'seam', at: LIFT, dur: 260, ease: 'out', to: { opacity: 0 } },
    // the head of the comet: the flash, small, riding up with it
    { kind: 'move', layer: 'flash', at: LIFT, dur: 200, ease: 'out', to: { opacity: 0.95 } },
    { kind: 'move', layer: 'flash', at: LIFT, dur: BREAK - LIFT, ease: 'out', to: { y: 0 } },
    { kind: 'move', layer: 'trail', at: LIFT, dur: 80, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'trail', at: LIFT, dur: BREAK - LIFT, ease: 'out', to: { sy: 1 } },
    { kind: 'move', layer: 'trail', at: BREAK + 100, dur: 1500, ease: 'inout', to: { opacity: 0 } },

    // 3. It breaks: a white instant and a round star, which the great gold bloom grows out of.
    { kind: 'move', layer: 'flash', at: BREAK - 40, dur: 110, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'flash', at: BREAK + 90, dur: 700, ease: 'out', to: { opacity: 0, sx: 1.5, sy: 1.5 } },
    { kind: 'move', layer: 'burst-a0', at: BREAK, dur: 90, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'burst-a0', at: BREAK, dur: 420, ease: 'out', to: { sx: 1, sy: 1 } },
    { kind: 'move', layer: 'burst-a0', at: BREAK + 420, dur: 700, ease: 'out', to: { sx: 1.45, sy: 1.45, y: 6 } },
    { kind: 'move', layer: 'burst-a0', at: BREAK + 300, dur: 650, ease: 'inout', to: { opacity: 0 } },

    // 4. Blooms, one after another, each opening fast and then sagging a little under its own weight.
    ...BLOOMS.flatMap(([id, , , at, dur], i): Step[] => [
        { kind: 'move', layer: id, at, dur: i === 0 ? 420 : 140, ease: 'out', to: { opacity: 1 } },
        { kind: 'move', layer: id, at, dur, ease: 'out', to: { sx: 1, sy: 1 } },
        { kind: 'move', layer: id, at: at + dur, dur: 1500, ease: 'inout', to: { y: i === 0 ? 4 : 2.5, opacity: i === 0 ? 1 : 0.94 } },
    ]),
    { kind: 'move', layer: 'far', at: BREAK, dur: 900, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'tips', at: 2300, dur: 1500, ease: 'inout', to: { opacity: 1 } },

    // The air takes the colour of each burst.
    { kind: 'move', layer: 'glow-a', at: BREAK, dur: 450, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'glow', at: 1800, dur: 1700, ease: 'inout', to: { opacity: 1 } },

    // 5. The water and the town answer.
    { kind: 'move', layer: 'refl-a', at: BREAK + 60, dur: 500, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'refl-b', at: 1850, dur: 900, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'city-lit', at: BREAK, dur: 400, ease: 'out', to: { opacity: 0.55 } },
    { kind: 'move', layer: 'city-lit', at: 1900, dur: 1600, ease: 'inout', to: { opacity: 1 } },
    { kind: 'move', layer: 'bokeh', at: BREAK, dur: 1600, ease: 'out', to: { opacity: 1 } },

    // Embers drift down out of the gold bloom.
    { kind: 'scatter', layer: 'ember', at: BREAK + 250, dur: 2300, count: 36, spread: 120, fall: 70 },
    { kind: 'scatter', layer: 'ember', at: 2700, dur: 2400, count: 30, spread: 150, fall: 90 },
];

const idle: IdleStep[] = [
    { layer: 'seam', field: 'opacity', amp: 0.25, period: 3800 },
    { layer: 'shell', field: 'turn', amp: 5, period: 9000 },
    { layer: 'shell', field: 'opacity', amp: 0.12, period: 3800 },
    { layer: 'far', field: 'opacity', amp: 0.25, period: 2700, phase: 0.4 },
    { layer: 'bokeh', field: 'opacity', amp: 0.12, period: 5200, phase: 0.3 },
];

const afterglow: IdleStep[] = [
    { layer: 'tips', field: 'opacity', amp: 0.3, period: 1900 },
    { layer: 'refl-a', field: 'x', amp: 1.6, period: 3200 },
    { layer: 'refl-b', field: 'x', amp: 1.6, period: 3900, phase: 0.5 },
    { layer: 'refl-a', field: 'opacity', amp: 0.14, period: 2600, phase: 0.2 },
    { layer: 'refl-b', field: 'opacity', amp: 0.14, period: 3100, phase: 0.7 },
    { layer: 'glow', field: 'opacity', amp: 0.1, period: 4400 },
    { layer: 'glow-a', field: 'opacity', amp: 0.1, period: 5100, phase: 0.5 },
    { layer: 'city-lit', field: 'opacity', amp: 0.08, period: 3700, phase: 0.4 },
    { layer: 'burst-a', field: 'y', amp: 1.2, period: 7000 },
    { layer: 'far', field: 'opacity', amp: 0.2, period: 2900, phase: 0.6 },
];

export const fireworks: WrapperDef = {
    id: 'fireworks',
    name: { vi: 'Pháo hoa', en: 'Fireworks' },
    ambient: ['#16245C', '#FFB648', '#E0268A'],
    blurb: {
        vi: 'Một cuộn ánh sáng còn quấn kín chờ trên bến cảng đêm. Nó vút lên, vỡ ra, và cả bầu trời nở hoa lửa soi xuống mặt nước.',
        en: 'A coil of light, still wound tight, waits over the harbour at night. It climbs, breaks, and the whole sky blooms over the water.',
    },
    // Night glass with one warm gold.
    theme: { ground: '#03050C', surface: '#0B1226', ink: '#F6F1E4', accent: '#FFC65C', onAccent: '#1C1203', material: 'glass', corner: 'round', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.42],
    size: [360, 450],
    backdrop: '#03050C',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 2600,
    // A rush upward, then bells breaking open.
    sound: {
        v: 1,
        inst: 'bell',
        tonic: 72,
        score: scaled(0.52, together(
            [{ at: 0, pitch: 60, dur: 700, inst: 'noise' as const, bend: 24, gain: 0.5 }],
            tune(200, 'C5/8 G5/8 E6/4 D5/8 A5/8 D6/4 | [C5 G5 C6]/1', { start: 800, gain: 0.5 }),
        )),
    },
};

export default fireworks;
