import type { IdleStep, LayerDef, Step, WrapperDef } from '../stage/format';
import { scaled, tune } from './tune';

/**
 * Piano keys — for someone who loves music, for a teacher. The keyboard end
 * of a piano seen from above and a little askew, under a brass lamp: ten
 * ivory keys across the lower part, the fallboard above them, and through
 * the open top the inside of the instrument: a fan of brass strings on the
 * iron plate, tuning pins, a red felt strip, a row of hammers. A lid with a
 * brass inlay covers the far part of the strings.
 *
 * Opening: six keys go down one after another, and they are exactly the six
 * notes that sound (C E G B D, then C). Each key's hammer flicks and its
 * string shivers. On the held chord its four keys go down together and the strings
 * light; the lid has been sliding away under the last notes.
 *
 * The stage cannot recolour a layer, so a key that is played only moves:
 * towards the player, which opens a dark gap under the fallboard.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/keys.gen.mjs): each SVG's viewBox is its box. The boxes and
 * pivots below are the ones that generator prints.
 */

/** The six notes in the order they are played: the layer names, and what the generator printed for each. */
const NOTES = [
    { id: 'c4', string: [32, 42, 56, 222], hammer: [38, 174, 22, 61], pivot: [0.197, 0.935], key: [31, 320, 49, 176] },
    { id: 'e4', string: [107, 34, 28, 223], hammer: [109, 167, 17, 62], pivot: [0.271, 0.932], key: [103, 313, 40, 177] },
    { id: 'g4', string: [164, 29, 8, 232], hammer: [160, 162, 15, 62], pivot: [0.52, 0.936], key: [167, 309, 40, 176] },
    { id: 'b4', string: [212, 22, 35, 233], hammer: [225, 156, 18, 62], pivot: [0.741, 0.933], key: [231, 302, 40, 177] },
    { id: 'd5', string: [247, 16, 55, 225], hammer: [275, 152, 22, 61], pivot: [0.787, 0.937], key: [294, 298, 41, 176] },
    { id: 'c5', string: [224, 20, 41, 224], hammer: [242, 155, 19, 61], pivot: [0.764, 0.939], key: [254, 300, 49, 177] },
] as const;

/** An eighth note, in milliseconds: the tune and the keys keep the same time. */
const EIGHTH = 270;
/** When the held chord sounds: after five eighths and a quarter. */
const CHORD = 7 * EIGHTH;
/** The keys of the chord. */
const CHORD_KEYS = ['c4', 'e4', 'g4', 'c5'] as const;
/** The piano is drawn turned by five degrees: "towards the player" and "away" on the canvas, per unit. */
const DOWN = [0.087, 0.996] as const;
const along = (d: number) => ({ x: Math.round(DOWN[0] * d * 100) / 100, y: Math.round(DOWN[1] * d * 100) / 100 });

/** One note struck at `at`: the key goes down and stays for `held`, its hammer flicks, its string shivers. */
const strike = (id: string, at: number, held: number, ring: number): Step[] => [
    { kind: 'move', layer: `key-${id}`, at, dur: 70, ease: 'out', to: along(9) },
    { kind: 'move', layer: `key-${id}`, at: at + 70 + held, dur: 170, ease: 'inout', to: along(0) },
    { kind: 'move', layer: `hammer-${id}`, at, dur: 60, ease: 'out', to: { turn: -17 } },
    { kind: 'move', layer: `hammer-${id}`, at: at + 60, dur: 190, ease: 'inout', to: { turn: 0 } },
    { kind: 'shake', layer: `string-${id}`, at: at + 30, dur: ring, amp: 3, times: ring > 400 ? 5 : 3 },
];

const open: Step[] = [
    // 1. The tune: six keys, each on its note.
    ...NOTES.flatMap((n, i) => strike(n.id, i * EIGHTH, i === 5 ? 200 : 60, 250)),
    // 2. The held chord: its four keys together, and they stay down a while.
    ...CHORD_KEYS.flatMap(id => strike(id, CHORD, 380, 540)),
    // 3. While the last notes play the lid slides away along the strings, and is gone on the chord; the strings light.
    { kind: 'move', layer: 'lid', at: 1080, dur: 860, ease: 'inout', to: along(-150) },
    { kind: 'move', layer: 'lid', at: 1740, dur: 260, to: { opacity: 0 } },
    { kind: 'move', layer: 'glow', at: 1860, dur: 640, ease: 'out', to: { opacity: 0.85 } },
    { kind: 'scatter', layer: 'mote', at: 1900, dur: 720, count: 18, spread: 125, fall: -64 },
];

/** The lamp's band of light sways a little on the wood. */
const lamp: IdleStep[] = [{ layer: 'light', field: 'turn', amp: 2.4, period: 7200 }];

const layers: LayerDef[] = [
    { id: 'back', art: 'back.svg', box: [-6, -6, 372, 462], depth: 0.08 },
    ...NOTES.map((n): LayerDef => ({ id: `hammer-${n.id}`, art: `hammer-${n.id}.svg`, box: n.hammer, origin: n.pivot, depth: 0.08 })),
    ...NOTES.map((n): LayerDef => ({ id: `string-${n.id}`, art: `string-${n.id}.svg`, box: n.string, depth: 0.08 })),
    ...NOTES.map((n): LayerDef => ({ id: `key-${n.id}`, art: `key-${n.id}.svg`, box: n.key, depth: 0.08 })),
    { id: 'glow', art: 'glow.svg', box: [-8, 7, 380, 241], start: { opacity: 0 }, depth: 0.08 },
    { id: 'lid', art: 'lid.svg', box: [-8, -8, 392, 166], depth: 0.14 },
    { id: 'light', art: 'light.svg', box: [17, -23, 368, 385], origin: [0.813, 0.164], depth: 0.26 },
    { id: 'mote', art: 'mote.svg', box: [175, 146, 8, 8], depth: 0.2 },
];

export const keys: WrapperDef = {
    id: 'keys',
    name: { vi: 'Phím đàn', en: 'Piano keys' },
    ambient: ['#4A1A12', '#DDA947', '#C42F2B'],
    blurb: {
        vi: 'Đầu đàn piano nhìn từ trên xuống. Sáu phím lún đúng sáu nốt bạn nghe, búa gõ, dây rung; nắp trượt đi và dây đàn sáng lên.',
        en: 'A piano from above. Six keys go down on the six notes you hear, hammers flick, strings shiver; the lid slides away and the strings light.',
    },
    // Mahogany lacquer, ivory words, brass for the one loud colour.
    theme: { ground: '#16100C', surface: '#4A1A12', ink: '#F3E9D2', accent: '#DDA947', onAccent: '#16100C', material: 'lacquer', corner: 'soft', face: 'serif', voice: 'chime' },
    focus: [0.5, 0.4],
    size: [360, 450],
    backdrop: '#16100C',
    layers,
    idle: lamp,
    afterglow: [...lamp, { layer: 'glow', field: 'opacity', amp: 0.15, period: 3800 }],
    open,
    revealAt: 1900,
    // The six notes of the six keys, C major rising through its ninth and settling on C; then C, E and G held.
    sound: {
        v: 1,
        inst: 'tine',
        tonic: 72,
        score: scaled(0.64, tune(60000 / (2 * EIGHTH), 'C4/8 E4/8 G4/8 B4/8 D5/8 C5/4 | [C4 E4 G4 C5]/2.')),
    },
};
