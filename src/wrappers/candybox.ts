import type { IdleStep, NoteDef, Step, WrapperDef } from '../stage/format';
import { scaled } from './tune';

/**
 * Candy box — the tray of togetherness for Chinese New Year, drawn as a flat
 * New Year poster seen from straight above. An octagonal red-lacquer box,
 * its lid inlaid in gold with a peony among cloud scrolls, sits on a deep red
 * cloth with a woven gold border, the cloth laid at an angle over a
 * vermilion table. Around it: a plum branch in pink flower, two blank red
 * packets tucked under the box, a tea cup with a pair of chopsticks, a pair
 * of mandarins with their leaves. Opening: the lid trembles, turns an eighth
 * of a turn as it lifts, and slides off to the top right corner; eight
 * compartments show about a centre well (melon seeds, candied fruit, peanuts,
 * blank gold coins, each twice), the well glows gold and a gold ingot comes
 * up in it; one scatter of gold flecks. No character or mark of any script
 * anywhere: the frame shows the gift.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/candybox.gen.mjs): each SVG's viewBox is its box. The boxes
 * and pivots below are copied by hand from what the generator prints.
 */

/** The box's centre on the canvas, as in the generator. */
const BOX = [74, 120, 212, 212] as const;
/** Where the lid ends: off to the top right corner. */
const AWAY = { x: 196, y: -214 } as const;

const open: Step[] = [
    // 1. The lid trembles on the box: two taps of wood.
    { kind: 'shake', layer: 'lid', at: 0, dur: 420, amp: 1.6, times: 3 },
    // 2. It turns an eighth of a turn and lifts; its shadow falls away from it.
    { kind: 'move', layer: 'lid', at: 420, dur: 900, ease: 'inout', to: { turn: 45, sx: 1.1, sy: 1.1 } },
    { kind: 'move', layer: 'lid-shadow', at: 420, dur: 900, ease: 'inout', to: { turn: 45, sx: 1.04, sy: 1.04, x: 8, y: 14, opacity: 0.34 } },
    // 3. It slides off to the corner, still turning a little.
    { kind: 'move', layer: 'lid', at: 1250, dur: 1000, ease: 'inout', to: { x: AWAY.x, y: AWAY.y, turn: 60 } },
    { kind: 'move', layer: 'lid-shadow', at: 1250, dur: 1000, ease: 'inout', to: { x: AWAY.x + 10, y: AWAY.y + 16, turn: 60 } },
    // 4. The well glows and the ingot comes up in it; gold flecks.
    { kind: 'move', layer: 'glow', at: 1600, dur: 900, ease: 'out', to: { opacity: 1, sx: 1, sy: 1 } },
    { kind: 'move', layer: 'ingot', at: 1900, dur: 160, to: { opacity: 1 } },
    { kind: 'move', layer: 'ingot', at: 1900, dur: 600, ease: 'back', to: { sx: 1.15, sy: 1.15 } },
    { kind: 'scatter', layer: 'fleck', at: 2050, dur: 1500, count: 22, spread: 150, fall: 60 },
    // 5. The glow settles.
    { kind: 'move', layer: 'glow', at: 2600, dur: 900, ease: 'inout', to: { opacity: 0.75 } },
];

/** The branch and the leaves are never quite still. */
const sway: IdleStep[] = [
    { layer: 'plum', field: 'turn', amp: 0.7, period: 5600 },
    { layer: 'leaves', field: 'turn', amp: 2.2, period: 4300, phase: 0.3 },
];

const idle: IdleStep[] = [...sway];

const afterglow: IdleStep[] = [
    ...sway,
    // The well breathes.
    { layer: 'glow', field: 'opacity', amp: 0.18, period: 3400 },
    { layer: 'glow', field: 'sx', amp: 0.04, period: 3400 },
    { layer: 'glow', field: 'sy', amp: 0.04, period: 3400 },
    { layer: 'ingot', field: 'sx', amp: 0.02, period: 3400, phase: 0.1 },
    { layer: 'ingot', field: 'sy', amp: 0.02, period: 3400, phase: 0.1 },
];

/** A low gong and wood taps under a small bell climbing the pentatonic, home on D. */
const score: NoteDef[] = [
    { at: 0, pitch: 79, dur: 80, inst: 'wood', gain: 0.5 },
    { at: 150, pitch: 79, dur: 80, inst: 'wood', gain: 0.4 },
    { at: 300, pitch: 74, dur: 80, inst: 'wood', gain: 0.45 },
    { at: 420, pitch: 50, dur: 2600, gain: 0.55 },
    { at: 700, pitch: 69, dur: 240, gain: 0.5 },
    { at: 950, pitch: 71, dur: 240, gain: 0.5 },
    { at: 1200, pitch: 74, dur: 380, gain: 0.55 },
    { at: 1600, pitch: 76, dur: 300, gain: 0.5 },
    { at: 1900, pitch: 81, dur: 380, gain: 0.55 },
    { at: 2150, pitch: 79, dur: 80, inst: 'wood', gain: 0.35 },
    { at: 2300, pitch: 50, dur: 2200, gain: 0.4 },
    { at: 2300, pitch: 74, dur: 1600, gain: 0.7 },
];

export const candybox: WrapperDef = {
    id: 'candybox',
    name: { vi: 'Khay bánh mứt', en: 'Tray of togetherness' },
    ambient: ['#C8102E', '#F2C14E', '#8E0B21'],
    blurb: {
        vi: 'Hộp mứt sơn mài bát giác ngày Tết. Nắp dát vàng xoay, nhấc lên, trượt đi; tám ngăn mứt bày quanh lòng hộp sáng vàng.',
        en: 'A red lacquer New Year candy box. The gold-inlaid lid turns, lifts and slides away; eight compartments ring a well glowing gold.',
    },
    // The cloth's deep red as lacquer, cream for the words, the inlay's gold for the one loud colour.
    theme: { ground: '#3A0710', surface: '#8E0B21', ink: '#F7E8C8', accent: '#F2C14E', onAccent: '#1A0F0F', material: 'lacquer', corner: 'cut', face: 'poster', voice: 'chime' },
    focus: [0.5, 0.502],
    size: [360, 450],
    backdrop: '#C8102E',
    layers: [
        { id: 'cloth', art: 'cloth.svg', box: [-6, -6, 372, 462], depth: 0.04 },
        { id: 'plum', art: 'plum.svg', box: [-6, -6, 250, 150], origin: [0, 0.693], depth: 0.16 },
        { id: 'packets', art: 'packets.svg', box: [254, 176, 112, 168], depth: 0.1 },
        { id: 'cup', art: 'cup.svg', box: [-6, 316, 170, 140], depth: 0.12 },
        { id: 'mandarins', art: 'mandarins.svg', box: [248, 330, 118, 126], depth: 0.14 },
        { id: 'leaves', art: 'leaves.svg', box: [222, 318, 130, 90], origin: [0.523, 0.689], depth: 0.15 },
        { id: 'side', art: 'side.svg', box: [74, 122, 212, 218], depth: 0.2 },
        { id: 'tray', art: 'tray.svg', box: [...BOX], depth: 0.2 },
        { id: 'glow', art: 'glow.svg', box: [80, 126, 200, 200], start: { opacity: 0, sx: 0.5, sy: 0.5 }, depth: 0.2 },
        { id: 'ingot', art: 'ingot.svg', box: [149, 204, 62, 42], start: { opacity: 0, sx: 0.4, sy: 0.4 }, depth: 0.24 },
        { id: 'lid-shadow', art: 'lid-shadow.svg', box: [...BOX], start: { opacity: 0 }, depth: 0.22 },
        { id: 'lid', art: 'lid.svg', box: [...BOX], depth: 0.3 },
        { id: 'fleck', art: 'fleck.svg', box: [174, 220, 12, 12] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2300,
    sound: { v: 1, inst: 'bell', tonic: 62, score: scaled(0.45, score) },
};
