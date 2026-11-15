import type { IdleStep, Step, WrapperDef } from '../stage/format';
import { scaled, together, tune } from './tune';

/**
 * Orbit — bodies coming into line, for someone who looks up. A flat star
 * chart: the limb of a very large planet cut by the corner of the frame, a
 * bright disc, a dark body, two small ones, fine orbit lines, stars as dots.
 * Nothing stands in the middle. Opening: the bodies drift onto one line, the
 * dark one passes in front of the bright one, and at the moment they stand in
 * line a fine ring and its streamers show round the dark disc and the stars
 * come up a step.
 *
 * Canvas 360x450. The art is generated in canvas coordinates
 * (scripts/art/orbit.gen.mjs): each SVG's viewBox is its box.
 */

const open: Step[] = [
    // 1. Everything drifts toward the line; the big planet turns a little under it all.
    { kind: 'move', layer: 'giant', at: 0, dur: 2000, ease: 'inout', to: { x: 0, y: 0 } },
    { kind: 'move', layer: 'small', at: 0, dur: 1700, ease: 'inout', to: { x: 0, y: 0 } },
    { kind: 'move', layer: 'ember', at: 0, dur: 1700, ease: 'inout', to: { x: 0, y: 0 } },
    { kind: 'move', layer: 'sky', at: 0, dur: 2000, ease: 'inout', to: { x: -5, y: 4 } },
    // 2. The dark body crosses in front of the bright one.
    { kind: 'move', layer: 'moon', at: 0, dur: 1800, ease: 'inout', to: { x: 0, y: 0 } },
    { kind: 'move', layer: 'bead', at: 1500, dur: 200, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'bead', at: 1760, dur: 240, ease: 'in', to: { opacity: 0, sx: 0.3, sy: 0.3 } },
    // 3. In line: the ring and its streamers, the line itself, and the stars a step brighter.
    { kind: 'move', layer: 'line', at: 1500, dur: 500, ease: 'out', to: { opacity: 1 } },
    { kind: 'move', layer: 'corona', at: 1820, dur: 80, to: { opacity: 1 } },
    { kind: 'move', layer: 'corona', at: 1820, dur: 760, ease: 'back', to: { sx: 1, sy: 1, turn: 0 } },
    { kind: 'move', layer: 'stars', at: 1820, dur: 600, ease: 'out', to: { opacity: 1 } },
];

const drift: IdleStep[] = [
    { layer: 'stars', field: 'x', amp: 2, period: 9000 },
    { layer: 'giant', field: 'turn', amp: 0.5, period: 11000 },
];

const idle: IdleStep[] = [
    ...drift,
    { layer: 'moon', field: 'x', amp: 2.5, period: 6400 },
    { layer: 'moon', field: 'y', amp: 2.5, period: 6400, phase: 0.25 },
    { layer: 'small', field: 'y', amp: 3, period: 5200, phase: 0.4 },
    { layer: 'ember', field: 'x', amp: 2, period: 4600, phase: 0.6 },
];

const afterglow: IdleStep[] = [
    ...drift,
    { layer: 'corona', field: 'turn', amp: 6, period: 9000 },
    { layer: 'corona', field: 'sx', amp: 0.03, period: 4200 },
    { layer: 'corona', field: 'sy', amp: 0.03, period: 4200 },
    { layer: 'line', field: 'opacity', amp: 0.25, period: 5200 },
];

export const orbit: WrapperDef = {
    id: 'orbit',
    name: { vi: 'Thẳng hàng', en: 'Orbit' },
    ambient: ['#141E4A', '#3D4F8F', '#FFF1D6'],
    blurb: {
        vi: 'Bản đồ sao phẳng. Các thiên thể trượt vào một đường, đĩa tối che đĩa sáng, và một vành sáng mảnh hiện ra.',
        en: 'A flat star chart. The bodies drift onto one line, the dark disc covers the bright one, and a fine ring of light shows.',
    },
    // Night for the card, warm white for the words, the pale blue of the small body for the one light colour.
    theme: { ground: '#060914', surface: '#101736', ink: '#F4EEE0', accent: '#A9C6F5', onAccent: '#081220', material: 'glass', corner: 'round', face: 'grotesk', voice: 'glass' },
    focus: [0.6, 0.38],
    size: [360, 450],
    backdrop: '#0B1230',
    layers: [
        { id: 'sky', art: 'sky.svg', box: [-6, -6, 372, 462], depth: 0.04 },
        { id: 'stars', art: 'stars.svg', box: [0, 0, 360, 450], start: { opacity: 0.55 }, depth: 0.1 },
        { id: 'line', art: 'line.svg', box: [40, 30, 290, 370], start: { opacity: 0 }, depth: 0.16 },
        { id: 'giant', art: 'giant.svg', box: [-6, 226, 320, 230], origin: [0, 1], start: { x: -22, y: 26 }, depth: 0.24 },
        { id: 'small', art: 'small.svg', box: [134, 246, 32, 32], start: { x: -74, y: -96 }, depth: 0.4 },
        { id: 'ember', art: 'ember.svg', box: [271, 86, 16, 16], start: { x: 48, y: -44 }, depth: 0.3 },
        { id: 'corona', art: 'corona.svg', box: [108, 50, 232, 232], start: { opacity: 0, sx: 0.7, sy: 0.7, turn: -30 }, depth: 0.5 },
        { id: 'sun', art: 'sun.svg', box: [174, 116, 100, 100], depth: 0.5 },
        { id: 'moon', art: 'moon.svg', box: [174, 116, 100, 100], start: { x: 74, y: 112 }, depth: 0.56 },
        { id: 'bead', art: 'bead.svg', box: [248, 124, 18, 18], start: { opacity: 0 }, depth: 0.56 },
    ],
    idle,
    afterglow,
    open,
    revealAt: 1900,
    // A held tone, two notes of glass far apart, and the octave at the moment they stand in line.
    sound: {
        v: 1,
        inst: 'glassy',
        tonic: 62,
        score: scaled(1.05, together(
            tune(132, 'D5/2 A5/2 | D6/1!'),
            tune(132, 'D3/1 | [D3 A3]/1', { inst: 'pad', gain: 0.35 }),
        )),
    },
};
