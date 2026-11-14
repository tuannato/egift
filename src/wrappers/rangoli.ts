import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Rangoli — the Diwali wrapper, drawn as COLOURED POWDER ON STONE, seen from
 * above: a courtyard floor at dusk.
 *
 * Closed: the pattern is shut like a lotus bud — two rings of round petals,
 * crimson and saffron, lying on one another in a spiral over a calm marigold
 * middle, tied round with a garland of marigold heads, its two tails lying
 * lower right. The border was poured first and lies on the floor already, with
 * the dots of rice flour that guide the rest; clay lamps wait, one of them
 * already burning beside the knot; loose petals lie about, a brass bowl of
 * powder stands at the edge. Opening: the garland shivers, loosens and comes
 * off in a puff of powder and petals; the bud's petals turn open, each ring
 * the other way, and blow away as dust while the rings of the pattern turn out
 * from under them, each against the next, to their places; the bud's middle
 * holds until they have cleared, then gives way to the bright centre; the dusk
 * lifts and the other lamps are lit one by one. No text: the frame shows the gift.
 *
 * Canvas 360x450; the rangoli's centre is [172, 264]. The art is made by
 * scripts/art/rangoli.gen.mjs (each SVG's viewBox is its box). The four rings
 * and the centre are drawn where they are when OPEN and held at half size
 * under the bud; everything else is drawn where it is when CLOSED.
 */

/** Each layer's box on the canvas, as scripts/art/rangoli.gen.mjs prints it. */
const BOX: Readonly<Record<string, LayerDef['box']>> = {
    floor: [0, 0, 360, 450],
    border: [0, 0, 360, 450],
    'ring-a': [-42, 50, 428, 428],
    'ring-b': [20, 112, 304, 304],
    'ring-c': [70, 162, 204, 204],
    medal: [118, 210, 108, 108],
    cap: [144, 236, 56, 56],
    'shut-b': [100, 192, 144, 144],
    'shut-a': [50, 142, 244, 244],
    garland: [6, 98, 332, 332],
    props: [0, 0, 360, 450],
    dusk: [0, 0, 360, 450],
    glow: [0, 0, 360, 450],
    dust: [22, 114, 300, 300],
    'flame-1': [130.74, 58.38, 104, 104],
    'flame-2': [240.42, 127.68, 104, 104],
    'flame-3': [248.32, 295.33, 104, 104],
    'flame-4': [130.88, 367.62, 104, 104],
    'flame-5': [-14.13, 274.55, 104, 104],
    'flame-6': [-14.54, 143.45, 104, 104],
    'flame-7': [0, 0, 360, 450],
    'flame-8': [0, 0, 360, 450],
    'petal-a': [165, 259, 14, 10],
    'petal-b': [165, 258, 14, 12],
};

const at = (id: string, rest: Partial<LayerDef> = {}): LayerDef => ({ id, art: `${id}.svg`, box: BOX[id]!, ...rest });

/** The rings of the pattern: how far each is turned while it waits under the bud, and when it turns out. */
const RINGS: readonly (readonly [string, number, number, number])[] = [
    ['ring-a', -56, 900, 2300],
    ['ring-b', 75, 1150, 2250],
    ['ring-c', -100, 1400, 2200],
    ['medal', 70, 2450, 1300],
];
/** The single lamps, in the order they are lit; then the two pairs further out. */
const FLAMES = ['flame-1', 'flame-2', 'flame-4', 'flame-5', 'flame-6'];
/** The one lamp that is burning before the gift is opened. */
const LIT_FIRST = 'flame-3';
const LIT = 2900;

const open: Step[] = [
    // 1. The garland shivers, loosens, and comes off in a puff of powder and petals.
    { kind: 'shake', layer: 'garland', at: 0, dur: 420, amp: 1.6, times: 3 },
    { kind: 'move', layer: 'garland', at: 300, dur: 700, ease: 'inout', to: { sx: 1.1, sy: 1.1, turn: 16 } },
    { kind: 'move', layer: 'garland', at: 1000, dur: 900, ease: 'in', to: { sx: 1.62, sy: 1.62, turn: 44, opacity: 0 } },
    { kind: 'move', layer: 'dust', at: 700, dur: 350, ease: 'out', to: { opacity: 0.95 } },
    { kind: 'move', layer: 'dust', at: 700, dur: 1900, ease: 'out', to: { sx: 1.55, sy: 1.55, turn: 30 } },
    { kind: 'move', layer: 'dust', at: 1300, dur: 1300, ease: 'inout', to: { opacity: 0 } },
    { kind: 'scatter', layer: 'petal-a', at: 950, dur: 2300, count: 16, spread: 175, fall: 12 },
    { kind: 'scatter', layer: 'petal-b', at: 1250, dur: 2500, count: 12, spread: 160, fall: 16 },
    // 2. The blades turn open, each ring the other way, and blow away.
    { kind: 'move', layer: 'shut-a', at: 600, dur: 1900, ease: 'inout', to: { turn: -86, sx: 1.95, sy: 1.95 } },
    { kind: 'move', layer: 'shut-a', at: 1300, dur: 850, ease: 'inout', to: { opacity: 0 } },
    { kind: 'move', layer: 'shut-b', at: 850, dur: 1500, ease: 'inout', to: { turn: 96, sx: 1.6, sy: 1.6 } },
    { kind: 'move', layer: 'shut-b', at: 1500, dur: 800, ease: 'inout', to: { opacity: 0 } },
    // the calm middle of the bud stays until the petals have cleared, then gives way to the centre
    { kind: 'move', layer: 'cap', at: 1300, dur: 1500, ease: 'inout', to: { turn: -90, sx: 1.3, sy: 1.3 } },
    { kind: 'move', layer: 'cap', at: 2500, dur: 600, ease: 'inout', to: { opacity: 0 } },
    { kind: 'move', layer: 'medal', at: 2450, dur: 600, ease: 'inout', to: { opacity: 1 } },
    // 3. The rings of the pattern turn out from under them, each against the next; the centre last.
    ...RINGS.map(([layer, , t, dur]): Step => ({ kind: 'move', layer, at: t, dur, ease: 'out', to: { sx: 1, sy: 1, turn: 0 } })),
    // 4. The dusk lifts; light gathers in the middle; the lamps are lit one by one, outward.
    { kind: 'move', layer: 'dusk', at: 1700, dur: 2600, ease: 'inout', to: { opacity: 0.16 } },
    { kind: 'move', layer: 'glow', at: 2200, dur: 1800, ease: 'out', to: { opacity: 1 } },
    ...FLAMES.flatMap((layer, i): Step[] => [
        { kind: 'move', layer, at: LIT + i * 300, dur: 260, ease: 'out', to: { opacity: 1 } },
        { kind: 'move', layer, at: LIT + i * 300, dur: 620, ease: 'back', to: { sx: 1, sy: 1 } },
    ]),
    { kind: 'move', layer: 'flame-7', at: LIT + 6 * 300 + 100, dur: 520, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'flame-8', at: LIT + 7 * 300 + 200, dur: 520, ease: 'out', to: { opacity: 1 } },
];

const idle: IdleStep[] = [
    { layer: 'garland', field: 'sx', amp: 0.008, period: 5200 },
    { layer: 'garland', field: 'sy', amp: 0.008, period: 5200 },
    { layer: 'garland', field: 'turn', amp: 0.9, period: 9000 },
    { layer: LIT_FIRST, field: 'opacity', amp: 0.1, period: 1900 },
    { layer: LIT_FIRST, field: 'sy', amp: 0.03, period: 1500, phase: 0.3 },
];

const afterglow: IdleStep[] = [
    ...FLAMES.flatMap((layer, i): IdleStep[] => [
        { layer, field: 'opacity', amp: 0.1, period: 1500 + i * 230, phase: (i * 0.37) % 1 },
        { layer, field: 'sy', amp: 0.035, period: 1300 + i * 190, phase: (i * 0.61) % 1 },
    ]),
    { layer: LIT_FIRST, field: 'opacity', amp: 0.1, period: 1900 },
    { layer: 'flame-7', field: 'opacity', amp: 0.1, period: 2100, phase: 0.2 },
    { layer: 'flame-8', field: 'opacity', amp: 0.1, period: 1800, phase: 0.7 },
    { layer: 'glow', field: 'opacity', amp: 0.08, period: 5200 },
    { layer: 'ring-a', field: 'turn', amp: 0.5, period: 16000 },
    { layer: 'ring-b', field: 'turn', amp: 0.6, period: 16000, phase: 0.5 },
    { layer: 'ring-c', field: 'turn', amp: 0.7, period: 16000 },
];

const ring = (id: string): LayerDef => at(id, { start: { sx: 0.5, sy: 0.5, turn: RINGS.find(r => r[0] === id)![1] } });
const flame = (id: string): LayerDef => at(id, { blend: 'screen', start: { opacity: 0, sx: 0.5, sy: 0.5 } });

export const rangoli: WrapperDef = {
    id: 'rangoli',
    name: { vi: 'Rangoli', en: 'Rangoli' },
    ambient: ['#F27C1C', '#F8BC1E', '#0C9590'],
    blurb: {
        vi: 'Bột màu rắc trên sân đá. Vòng hoa vạn thọ lỏng ra, các vòng cánh xoay mở, những ngọn đèn đất lần lượt sáng lên.',
        en: 'Coloured powder on courtyard stone. The marigold garland loosens, the petal rings turn open, and the clay lamps light one by one.',
    },
    // Peacock teal lacquer under the saffron and crimson of the floor; cream ink; marigold for the one loud colour.
    theme: { ground: '#120C0A', surface: '#0B3F42', ink: '#FFF3DC', accent: '#F8BC1E', onAccent: '#2A1204', material: 'lacquer', corner: 'round', face: 'grotesk', voice: 'chime' },
    focus: [0.48, 0.58],
    size: [360, 450],
    backdrop: '#15100E',
    layers: [
        at('floor'),
        at('border'),
        ring('ring-a'),
        ring('ring-b'),
        ring('ring-c'),
        at('medal', { start: { opacity: 0, sx: 0.6, sy: 0.6, turn: 70 } }),
        at('shut-b'),
        at('shut-a'),
        at('cap'),
        at('garland'),
        at('props'),
        at('dusk', { blend: 'multiply' }),
        at('glow', { blend: 'screen', start: { opacity: 0 } }),
        at('dust', { start: { opacity: 0, sx: 0.8, sy: 0.8 } }),
        ...['flame-1', 'flame-2'].map(flame),
        at(LIT_FIRST, { blend: 'screen' }),
        ...['flame-4', 'flame-5', 'flame-6'].map(flame),
        at('flame-7', { blend: 'screen', start: { opacity: 0 } }),
        at('flame-8', { blend: 'screen', start: { opacity: 0 } }),
        at('petal-a'),
        at('petal-b'),
    ],
    idle,
    afterglow,
    open,
    revealAt: 2700,
    // A rising line with a raised fourth, plucked, over a held fifth.
    sound: {
        v: 1,
        inst: 'pluck',
        tonic: 72,
        score: scaled(0.72, together(
            tune(138, 'C5/8 D5/8 E5/8 F#5/8 G5/4 E5/4 | F#5/8 G5/8 A5/8 B5/8 C6/2!'),
            tune(138, '[C3 G3]/1 | [C3 G3]/1', { inst: 'pad', gain: 0.4 }),
        )),
    },
};
