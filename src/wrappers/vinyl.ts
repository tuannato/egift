import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Vinyl — a record for a birthday or for someone who loves music, in the
 * spirit of 1960s sleeve graphics: circles and half rings in flat inks
 * (three blacks, two creams, a tomato and a mustard), no outline, no blur.
 * A sleeve lies on a turntable, the record a third of the way out of it.
 * Opening: the sleeve is drawn away, the record slides onto the spindle, the
 * tone arm swings in and comes down, the record turns and slows, and rings of
 * colour come out from behind it as the music plays.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/vinyl.gen.mjs): each SVG's viewBox is its box.
 */

/** How far to the right the record waits, a third out of its sleeve. */
const OUT = 62;

const open: Step[] = [
    // 1. The sleeve is drawn off to the left; the record stays where the hand left it.
    { kind: 'shake', layer: 'sleeve', at: 0, dur: 240, amp: 1.2, times: 2 },
    { kind: 'move', layer: 'sleeve', at: 200, dur: 760, ease: 'inout', to: { x: -300, y: 26, turn: -9 } },
    // 2. The record slides onto the spindle, its light with it.
    { kind: 'move', layer: 'disc', at: 620, dur: 620, ease: 'inout', to: { x: 0 } },
    { kind: 'move', layer: 'sheen', at: 620, dur: 620, ease: 'inout', to: { x: 0 } },
    // 3. The arm comes in from its rest, swings over the record and settles on it.
    { kind: 'move', layer: 'arm', at: 900, dur: 420, ease: 'out', to: { x: 0 } },
    { kind: 'move', layer: 'arm', at: 1240, dur: 560, ease: 'inout', to: { turn: 0 } },
    { kind: 'shake', layer: 'arm', at: 1800, dur: 160, amp: 0.8, times: 2 },
    // 4. The record turns, two and a half times round, and slows to a stop.
    { kind: 'move', layer: 'disc', at: 1820, dur: 2700, ease: 'out', to: { turn: 900 } },
    // 5. Rings of colour come out from behind it, one after another, each turning a little its own way.
    { kind: 'move', layer: 'ring-a', at: 1960, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'ring-a', at: 1960, dur: 700, ease: 'back', to: { sx: 1, sy: 1, turn: 40 } },
    { kind: 'move', layer: 'ring-b', at: 2200, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'ring-b', at: 2200, dur: 700, ease: 'back', to: { sx: 1, sy: 1, turn: -55 } },
    { kind: 'move', layer: 'ring-c', at: 2440, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'ring-c', at: 2440, dur: 760, ease: 'back', to: { sx: 1, sy: 1, turn: 70 } },
    // The sound, as shapes thrown off the record.
    { kind: 'scatter', layer: 'note-a', at: 2000, dur: 1500, count: 7, spread: 150, fall: -40 },
    { kind: 'scatter', layer: 'note-b', at: 2260, dur: 1400, count: 6, spread: 160, fall: -60 },
    { kind: 'scatter', layer: 'note-c', at: 2520, dur: 1300, count: 6, spread: 170, fall: -30 },
];

const idle: IdleStep[] = [
    // The record eases in and out of its sleeve by a hair; the sleeve breathes on the platter.
    { layer: 'disc', field: 'x', amp: 2.5, period: 5200 },
    { layer: 'sheen', field: 'x', amp: 2.5, period: 5200 },
    { layer: 'sleeve', field: 'turn', amp: 0.6, period: 7400 },
];

const afterglow: IdleStep[] = [
    { layer: 'ring-a', field: 'turn', amp: 9, period: 6400 },
    { layer: 'ring-b', field: 'turn', amp: 12, period: 8200, phase: 0.3 },
    { layer: 'ring-c', field: 'turn', amp: 7, period: 9800, phase: 0.6 },
    { layer: 'sheen', field: 'opacity', amp: 0.25, period: 4200 },
    { layer: 'arm', field: 'turn', amp: 0.5, period: 3600 },
];

export const vinyl: WrapperDef = {
    id: 'vinyl',
    name: { vi: 'Đĩa than', en: 'Vinyl' },
    ambient: ['#171513', '#D9432B', '#E8B33A'],
    blurb: {
        vi: 'Đồ hoạ bìa đĩa thập niên 60. Bìa được rút đi, kim hạ xuống, đĩa quay và những vòng màu toả ra.',
        en: 'Sixties sleeve graphics. The sleeve is drawn off, the arm comes down, the record turns and rings of colour spread.',
    },
    // The deck's black, the sleeve's cream for the words, the label's mustard for the one loud colour.
    theme: { ground: '#0E0D0C', surface: '#1F1C19', ink: '#F6EEDC', accent: '#E8B33A', onAccent: '#1A1204', material: 'lacquer', corner: 'round', face: 'poster', voice: 'glass' },
    focus: [0.5, 0.5],
    size: [360, 450],
    backdrop: '#171513',
    layers: [
        { id: 'deck', art: 'deck.svg', box: [-6, -6, 372, 462], depth: 0.06 },
        { id: 'ring-c', art: 'ring-c.svg', box: [4, 49, 352, 352], start: { opacity: 0, sx: 0.5, sy: 0.5 }, depth: 0.14 },
        { id: 'ring-b', art: 'ring-b.svg', box: [25, 70, 310, 310], start: { opacity: 0, sx: 0.55, sy: 0.55 }, depth: 0.18 },
        { id: 'ring-a', art: 'ring-a.svg', box: [41, 86, 278, 278], start: { opacity: 0, sx: 0.6, sy: 0.6 }, depth: 0.22 },
        { id: 'disc', art: 'disc.svg', box: [62, 107, 236, 236], start: { x: OUT }, depth: 0.3 },
        { id: 'sheen', art: 'sheen.svg', box: [62, 107, 236, 236], start: { x: OUT }, depth: 0.3 },
        { id: 'sleeve', art: 'sleeve.svg', box: [20, 98, 262, 262], depth: 0.4 },
        { id: 'arm', art: 'arm.svg', box: [222, 46, 136, 152], origin: [96 / 136, 46 / 152], start: { x: 64, turn: -34 }, depth: 0.55 },
        { id: 'note-a', art: 'note-a.svg', box: [174, 219, 12, 12] },
        { id: 'note-b', art: 'note-b.svg', box: [173, 218, 14, 14] },
        { id: 'note-c', art: 'note-c.svg', box: [174, 219, 12, 12] },
    ],
    idle,
    afterglow,
    open,
    revealAt: 2300,
    // An easy swing on a reed over a walking bass, wood on the off-beats; the needle lands as a breath of noise.
    sound: {
        v: 1,
        inst: 'reed',
        tonic: 65,
        score: scaled(0.7, together(
            [{ at: 0, pitch: 90, dur: 380, inst: 'noise' as const, bend: -5, gain: 0.16 }],
            tune(176, 'C5/8. D5/16 F5/4 A5/8. G5/16 F5/4 | D5/8. F5/16 G5/4 A5/8. G5/16 C5/4 | F5/2!', { start: 300 }),
            tune(176, 'F2/4 A2/4 C3/4 D3/4 | Bb2/4 D3/4 C3/4 E3/4 | F2/2', { start: 300, inst: 'pluck', gain: 0.45 }),
            tune(176, '-/4 G4/4 -/4 G4/4 | -/4 G4/4 -/4 G4/4 | -/2', { start: 300, inst: 'wood', gain: 0.3 }),
        )),
    },
};
