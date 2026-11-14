import type { IdleStep, LayerDef, Pose, Step, WrapperDef } from '../stage/format';
import { together, tune } from './tune';

/**
 * Paper bag — the thank-you wrapper, made the way a small maker makes one:
 * RUBBER STAMPS ON KRAFT. Every decorative mark is a stamp impression set
 * down by hand: uneven ink (a starved middle, a heavier rim, missed specks),
 * now and then the ghost of a second touch or the line of the block's edge,
 * the same die repeated with imperfect spacing and turn. The bag, the stamps
 * and the ink pad are flat cuts of paper with hard offset shadows; creases
 * are hard slivers of tone. No blur, no gradients.
 *
 * Closed: a packing table seen from above, turned a little. A kraft bag, its
 * top folded over twice and held by a round pinked sticker; its two twisted
 * paper handles lying flat on its front; round it a brick ink pad with the
 * stamp resting on it, two stamps on their sides, a roll of printed tape, a
 * dried sprig, sheets with trial impressions, on a dark green cutting mat.
 * Opening: the seal peels back and comes off, lying curled on the mat; the
 * fold turns up twice and the handles stand up behind the mouth; the picture
 * follows as a large stamped card rises out of the bag, tags and a strip of
 * printed ribbon paper fanning to its left, more tags to its right, three printed
 * dried stems behind, a paper garland let out over the lip and down the front; stamped offcuts fly out and
 * settle; the stamp leaves the pad, comes down once on the bag and leaves a
 * fresh brick sunburst across the creases. No text: the frame shows the gift.
 *
 * Canvas 360x450. The scene is taller than the canvas (scripts/art/
 * paperbag.gen.mjs): the opening pans it down by PAN. The bag and what is in
 * it are drawn upright round the bag's centre G and turned here by A.
 */

type Box = readonly [number, number, number, number];
type Pt = readonly [number, number];

/* GEOM (printed by scripts/art/paperbag.gen.mjs) */
const G: Pt = [150, 235];
const A = 13;
const T = -100;
const H = 26;
const PAN = 132;
const GB: Box = [-12, -176, 384, 640];
const LOCAL = {
    bag: [-94, -104, 196, 214],
    neck: [-89, -127, 178, 28],
    foldA: [-90, -100, 180, 28],
    handles: [-60, -126, 120, 104],
    mouth: [-89, -228, 178, 90],
    card: [-64, -84, 120, 142],
    tagsL: [-84, -92, 80, 180],
    tagsR: [0, -92, 80, 180],
    stems: [-44, -94, 100, 188],
    garland: [14, -156, 84, 108],
    seal: [-33, -108, 72, 72],
    imprint: [-71, -143, 60, 60],
} as const;
const STAMP: Pt = [309, 104];
const IMP: Pt = [-41, -113];
const CONF: readonly Pt[] = [[60, 132], [196, 70], [312, 138], [110, 296], [34, 244]];
const BITS: Pt = [178, 180];

const r2 = (n: number): number => Math.round(n * 100) / 100;
const COS = Math.cos((A * Math.PI) / 180);
const SIN = Math.sin((A * Math.PI) / 180);
/** A point of the bag's own frame, turned with the bag (still relative to G). */
const turned = (p: Pt): Pt => [p[0] * COS - p[1] * SIN, p[0] * SIN + p[1] * COS];

const TOP: Pt = [0.5, 0];
const FOOT: Pt = [0.5, 1];
const MID: Pt = [0.5, 0.5];
const boxOf = (l: Box): Box => [G[0] + l[0], G[1] + l[1], l[2], l[3]];
/**
 * Where a layer of the bag stands: drawn upright in `l` (the bag's frame), it
 * is turned by A about the bag's centre, moved by `d` in the bag's frame, and
 * carried down by the pan when `pan` is set.
 */
function at(l: Box, origin: Pt, d: Pt = [0, 0], pan = false, extra = 0): Pick<Pose, 'x' | 'y' | 'turn'> {
    const p: Pt = [l[0] + l[2] * origin[0], l[1] + l[3] * origin[1]];
    const q = turned([p[0] + d[0], p[1] + d[1]]);
    return { x: r2(q[0] - p[0]), y: r2(q[1] - p[1] + (pan ? PAN : 0)), turn: A + extra };
}
/** The same for a point given on the canvas: the offset that puts the layer's pivot there. */
const toWorld = (l: Box, origin: Pt, w: Pt): Pick<Pose, 'x' | 'y'> => ({ x: r2(w[0] - (G[0] + l[0] + l[2] * origin[0])), y: r2(w[1] - (G[1] + l[1] + l[3] * origin[1])) });

/** The tags, the stems and the garland each stand on a pivot near the foot of their box. */
const TAG_PIVOT: Pt = [0.5, 176 / 180];
const STEM_PIVOT: Pt = [0.5, 184 / 188];
/** The garland is let out from its top end, at the lip of the bag. */
const GARLAND_TOP: Pt = [0.24, 0.03];
/**
 * What rises out of the bag: [layer, box, pivot, how far up the bag (in its frame), turn when out, size when out].
 * The card is the hero, upright in the middle; the rest fan behind it.
 */
const THINGS: readonly (readonly [string, Box, Pt, Pt, number, number])[] = [
    ['stems', LOCAL.stems, STEM_PIVOT, [0, -226], 7, 1.1],
    ['tags-l', LOCAL.tagsL, TAG_PIVOT, [0, -194], -20, 1.1],
    ['tags-r', LOCAL.tagsR, TAG_PIVOT, [0, -196], 19, 1.1],
    ['card', LOCAL.card, MID, [0, -189], -4, 1.12],
];

const PAN_AT = 1900;
const PAN_DUR = 1400;
const pan = (layer: string, to: Partial<Pose>): Step => ({ kind: 'move', layer, at: PAN_AT, dur: PAN_DUR, ease: 'inout', to });

/** The mouth of the opened bag and the fresh impression, on the canvas once the picture has panned. */
const MOUTH: Pt = [G[0] + turned([0, T - 2 * H - 4])[0], G[1] + turned([0, T - 2 * H - 4])[1] + PAN];
const PRESS: Pt = [G[0] + turned(IMP)[0], G[1] + turned(IMP)[1] + PAN];
/** Where the peeled seal comes to rest on the mat. */
const SEAL_REST: Pt = [262, 224];

const confBox = (c: Pt): Box => [c[0] - 30, c[1] - 26, 60, 52];
const confStart = (c: Pt): Partial<Pose> => ({ x: r2(MOUTH[0] - c[0]), y: r2(MOUTH[1] - c[1]), sx: 0.3, sy: 0.3, opacity: 0 });
const CONF_AT = [3050, 3180, 3120, 3330, 3260];
const CONF_TURN = [-150, 120, 200, -90, 170];

const open: Step[] = [
    // 1. The seal: it is worried at, a third of it peels back, then most of it, and it comes away curled.
    { kind: 'shake', layer: 'seal', at: 0, dur: 250, amp: 0.9, times: 3 },
    { kind: 'move', layer: 'seal', at: 250, dur: 60, ease: 'linear', to: { opacity: 0 } },
    { kind: 'move', layer: 'seal-p1', at: 230, dur: 40, ease: 'linear', to: { opacity: 1 } },
    { kind: 'move', layer: 'seal-p1', at: 270, dur: 250, ease: 'out', to: { ...at(LOCAL.seal, MID, [1.5, 1.5]) } },
    { kind: 'move', layer: 'seal-p1', at: 520, dur: 60, ease: 'linear', to: { opacity: 0 } },
    { kind: 'move', layer: 'seal-p2', at: 500, dur: 40, ease: 'linear', to: { opacity: 1 } },
    { kind: 'move', layer: 'seal-p2', at: 560, dur: 760, ease: 'out', to: { ...toWorld(LOCAL.seal, MID, SEAL_REST), turn: A + 52 } },
    // 2. The fold turns up once, and once more; the handles go up with the second turn; the mouth opens.
    { kind: 'move', layer: 'fold-a', at: 760, dur: 500, ease: 'inout', to: { sy: -1 } },
    { kind: 'move', layer: 'neck', at: 1150, dur: 60, ease: 'linear', to: { opacity: 1 } },
    { kind: 'move', layer: 'fold-a', at: 1300, dur: 520, ease: 'inout', to: { ...at(LOCAL.foldA, TOP, [0, -2 * H]), sy: 1 } },
    { kind: 'move', layer: 'handles', at: 1300, dur: 260, ease: 'in', to: { sy: 0 } },
    { kind: 'move', layer: 'handles', at: 1560, dur: 20, ease: 'linear', to: { opacity: 0 } },
    { kind: 'move', layer: 'mouth', at: 1560, dur: 40, ease: 'linear', to: { opacity: 1 } },
    { kind: 'move', layer: 'mouth', at: 1560, dur: 380, ease: 'out', to: { sy: 1 } },
    // 3. The picture follows the things up (everything on the table is carried down together)...
    pan('ground', { y: PAN }),
    pan('scraps', { y: PAN }),
    pan('objects', { y: PAN }),
    pan('stamp', { y: PAN }),
    pan('bag', at(LOCAL.bag, MID, [0, 0], true)),
    pan('neck', at(LOCAL.neck, MID, [0, 0], true)),
    pan('fold-a', at(LOCAL.foldA, TOP, [0, -2 * H], true)),
    pan('mouth', at(LOCAL.mouth, FOOT, [0, 0], true)),
    pan('seal-p2', { y: r2(toWorld(LOCAL.seal, MID, SEAL_REST).y + PAN) }),
    // ...while the card rises out of the bag, the tags, the stems and the garland with it; then they fan.
    ...THINGS.map(([layer, l, o, up, turn, grow]): Step => pan(layer, { ...at(l, o, up, true), turn: A + turn * 0.5, sx: grow, sy: grow })),
    ...THINGS.map(([layer, , , , turn], i): Step => ({ kind: 'move', layer, at: 3300 + i * 40, dur: 700, ease: 'back', to: { turn: A + turn } })),
    // The garland comes over the lip and is let out down the front of the bag.
    { kind: 'move', layer: 'garland', at: 3250, dur: 40, ease: 'linear', to: { opacity: 1 } },
    { kind: 'move', layer: 'garland', at: 3250, dur: 700, ease: 'out', to: { sx: 1, sy: 1 } },
    // 4. Stamped punchings fly out of the mouth and settle; small bits flutter and are gone.
    ...CONF.flatMap((_, i): Step[] => [
        { kind: 'move', layer: `conf-${i + 1}`, at: CONF_AT[i]!, dur: 90, ease: 'linear', to: { opacity: 1 } },
        { kind: 'move', layer: `conf-${i + 1}`, at: CONF_AT[i]!, dur: 1250 + i * 90, ease: 'out', to: { x: 0, y: 0, sx: 1, sy: 1, turn: 0 } },
    ]),
    { kind: 'scatter', layer: 'bits', at: 3000, dur: 2900, count: 18, spread: 150, fall: 34 },
    // 5. The stamp leaves the pad, comes down once on the front of the bag, and goes back.
    { kind: 'move', layer: 'stamp', at: 3500, dur: 520, ease: 'inout', to: { x: r2(PRESS[0] - STAMP[0]), y: r2(PRESS[1] - STAMP[1] - 5), turn: A, sx: 1.14, sy: 1.14 } },
    { kind: 'move', layer: 'stamp', at: 4020, dur: 110, ease: 'in', to: { y: r2(PRESS[1] - STAMP[1]), sx: 1, sy: 1 } },
    { kind: 'move', layer: 'imprint', at: 4100, dur: 40, ease: 'linear', to: { opacity: 1 } },
    { kind: 'shake', layer: 'stamp', at: 4130, dur: 200, amp: 0.7, times: 2 },
    { kind: 'move', layer: 'stamp', at: 4380, dur: 620, ease: 'inout', to: { x: -5, y: PAN + 5, turn: -4, sx: 1.12, sy: 1.12 } },
    { kind: 'move', layer: 'stamp', at: 5000, dur: 240, ease: 'in', to: { sx: 1, sy: 1 } },
];

const idle: IdleStep[] = [
    // The stamp is being rocked on the pad to take ink.
    { layer: 'stamp', field: 'turn', amp: 1.3, period: 4800 },
    { layer: 'stamp', field: 'y', amp: 0.6, period: 3700, phase: 0.3 },
];

const afterglow: IdleStep[] = [
    { layer: 'stems', field: 'turn', amp: 0.8, period: 5600 },
    { layer: 'tags-r', field: 'turn', amp: 0.5, period: 6700, phase: 0.3 },
    { layer: 'tags-l', field: 'turn', amp: 0.5, period: 6100, phase: 0.6 },
    { layer: 'conf-2', field: 'turn', amp: 1.6, period: 5200 },
    { layer: 'conf-3', field: 'turn', amp: 1.4, period: 6400, phase: 0.4 },
];

/** Everything of the bag lies in one plane. */
const D = 0.3;

const layers: LayerDef[] = [
    { id: 'ground', art: 'ground.svg', box: GB, depth: 0.04 },
    { id: 'scraps', art: 'scraps.svg', box: GB, depth: 0.1 },
    { id: 'objects', art: 'objects.svg', box: GB, depth: 0.16 },
    // The inside of the bag's back: nothing until the mouth opens.
    { id: 'mouth', art: 'mouth.svg', box: boxOf(LOCAL.mouth), origin: FOOT, start: { ...at(LOCAL.mouth, FOOT), sy: 0, opacity: 0 }, depth: D },
    // What waits in the bag, under its front.
    ...THINGS.map(([id, l, o]): LayerDef => ({ id, art: `${id}.svg`, box: boxOf(l), origin: o, start: at(l, o), depth: D })),
    { id: 'bag', art: 'bag.svg', box: boxOf(LOCAL.bag), start: at(LOCAL.bag, MID), depth: D },
    // The part of the front the fold kept covered: shown once the fold has turned up over it.
    { id: 'neck', art: 'neck.svg', box: boxOf(LOCAL.neck), start: { ...at(LOCAL.neck, MID), opacity: 0 }, depth: D },
    // Shut, both handles lie on the front. They hinge where the second turn of the fold does, one fold-height
    // above the bag's top: they turn up to edge-on and are let go there, and stand up again with the mouth
    // (they are drawn in that layer, behind what comes out).
    { id: 'handles', art: 'handles.svg', box: boxOf(LOCAL.handles), origin: TOP, start: at(LOCAL.handles, TOP), depth: D },
    { id: 'fold-a', art: 'fold-a.svg', box: boxOf(LOCAL.foldA), origin: TOP, start: at(LOCAL.foldA, TOP), depth: D },
    { id: 'garland', art: 'garland.svg', box: boxOf(LOCAL.garland), origin: GARLAND_TOP, start: { ...at(LOCAL.garland, GARLAND_TOP, [0, 0], true), sx: 0.7, sy: 0, opacity: 0 }, depth: D },
    { id: 'imprint', art: 'imprint.svg', box: boxOf(LOCAL.imprint), start: { ...at(LOCAL.imprint, MID, [0, 0], true), opacity: 0 }, depth: D },
    { id: 'seal', art: 'seal.svg', box: boxOf(LOCAL.seal), start: at(LOCAL.seal, MID), depth: D },
    { id: 'seal-p1', art: 'seal-p1.svg', box: boxOf(LOCAL.seal), start: { ...at(LOCAL.seal, MID), opacity: 0 }, depth: D },
    { id: 'seal-p2', art: 'seal-p2.svg', box: boxOf(LOCAL.seal), start: { ...at(LOCAL.seal, MID, [1.5, 1.5]), opacity: 0 }, depth: D },
    ...CONF.map((c, i): LayerDef => ({ id: `conf-${i + 1}`, art: `conf-${i + 1}.svg`, box: confBox(c), start: { ...confStart(c), turn: CONF_TURN[i]! }, depth: 0.4 })),
    { id: 'bits', art: 'bits.svg', box: [BITS[0] - 8, BITS[1] - 8, 16, 16], depth: 0.4 },
    { id: 'stamp', art: 'stamp.svg', box: [STAMP[0] - 34, STAMP[1] - 34, 68, 68], start: { turn: 8 }, depth: 0.5 },
];

export const paperbag: WrapperDef = {
    id: 'paperbag',
    name: { vi: 'Túi giấy', en: 'Paper bag' },
    ambient: ['#16241E', '#C59B6B', '#A5452D'],
    blurb: {
        vi: 'Túi kraft dán tem tròn, in bằng con dấu cao su trên bàn gói hàng. Bóc tem, mở nếp gấp: thiệp in dấu, thẻ treo và dây cờ giấy trào ra.',
        en: 'A kraft bag sealed with a round sticker, rubber-stamped on a packing table. Peel, unfold: a stamped card, tags and a garland spill out.',
    },
    // Cream paper for the face, forest green for the one loud colour, the dark of the cutting mat for the room.
    theme: { ground: '#14201A', surface: '#F7EFDD', ink: '#17130C', accent: '#1F4A38', onAccent: '#FFF6E4', material: 'glass', corner: 'soft', face: 'grotesk', voice: 'chime' },
    focus: [0.5, 0.41],
    size: [360, 450],
    backdrop: '#16241E',
    layers,
    idle,
    afterglow,
    open,
    revealAt: 3300,
    // A cheerful whistle of a tune, with the thump of a stamp under it.
    sound: {
        v: 1,
        inst: 'reed',
        tonic: 67,
        score: together(
            tune(132, 'G4/8 B4/8 D5/4 B4/8 D5/8 G5/4 | E5/8 D5/8 B4/8 D5/8 G5/2!'),
            tune(132, 'G3/4 -/4 G3/4 -/4 | G3/4 -/4 G3/2', { inst: 'wood', gain: 0.5 }),
        ),
    },
};
