// Generator for the "cylinder" wrapper art: an armoured cylinder of four tiers lying back in a tilted
// launch cradle, seen from an oblique angle a little above, in the manner of a painted animation cel:
// flat fills, one hard-edged shadow shape per form, sharp white highlight slashes, ink lines of even
// weight. No filter, no blend mode; the only gradients are alpha fades for light (lamps, core).
// The cylinder and its cradle are drawn upright in a local frame (x across, `a` up the axis from the
// foot) and turned as a whole about the foot, so each SVG's viewBox is still its layer box on the
// 360x450 canvas. Every colour is in the palette `C`.
// Run: node scripts/art/cylinder.gen.mjs   (prints the layer boxes the definition uses)
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'cylinder');
if (!OUT.endsWith('wrappers/cylinder')) throw new Error('out dir must be public/wrappers/cylinder');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: armour, its cool shadow and a white for highlights; ink; three blues for the hangar; one strong blue, hazard yellow, lamp amber, core cyan. */
const C = {
    armour: '#E3E7EE',
    cool: '#9AA9C6',
    white: '#FFFFFF',
    ink: '#0B1020',
    navy: '#151D3A',
    steel: '#26335C',
    steelHi: '#5568A0',
    blue: '#2456C8',
    hazard: '#F5B81C',
    amber: '#FF8A1F',
    cyan: '#3CC8EE',
};

/* The local frame: the foot of the cylinder on the canvas, and how far its axis leans (clockwise, top to the right). */
const BX = 120, BY = 376, LEAN = 24;
const CO = Math.cos((LEAN * Math.PI) / 180), SI = Math.sin((LEAN * Math.PI) / 180);
/** A local point (x across, y down) on the canvas. */
const toC = (x, y) => [BX + x * CO - y * SI, BY + x * SI + y * CO];
const local = inner => `<g transform="translate(${BX} ${BY}) rotate(${LEAN})">${inner}</g>`;
const flip = inner => `<g transform="scale(-1 1)">${inner}</g>`;

const f = n => String(Math.round(n * 100) / 100);
const INK = ` stroke="${C.ink}" stroke-width="1.3" stroke-linejoin="round"`;
const SHADE = ' fill-opacity="0.42"';
const R = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const P = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const S = (pts, stroke, w, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="${stroke}" stroke-width="${f(w)}"${extra}/>`;
const O = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const E = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra}/>`;
const fade = (id, stops) => `<radialGradient id="${id}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;

/* The cylinder: radius RX; seen from above, a ring across it is an ellipse RX by RY. */
const RX = 58, RY = 16, H = 54;
const A4 = 0, A3 = H, A2 = 2 * H, A1 = 3 * H, ACAP = 4 * H;
/** Where the point at `x` across and `a` up the axis sits on the near side of a cylinder (local, y down). */
const on = (x, a, rx = RX, ry = RY) => [x, -a + ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2))];
const edge = (x0, x1, a, rx, ry) => {
    const n = Math.max(2, Math.ceil(Math.abs(x1 - x0) / 5));
    return Array.from({ length: n + 1 }, (_, i) => on(x0 + ((x1 - x0) * i) / n, a, rx, ry));
};
/** A patch of the near side, from x0 to x1 and from a0 up to a1: its upper and lower edges follow the ring. */
const patch = (x0, x1, a0, a1, fill, extra = '', rx = RX, ry = RY) => P([...edge(x0, x1, a1, rx, ry), ...edge(x1, x0, a0, rx, ry)], fill, extra);
const ring = (x0, x1, a, stroke = C.ink, w = 1.1, rx = RX, ry = RY) => S(edge(x0, x1, a, rx, ry), stroke, w);
/** A slanted hazard band on the near side: yellow, with a few wide ink bars. */
function hazard(x0, x1, a0, a1, rx = RX, ry = RY, step = 16) {
    let s = patch(x0, x1, a0, a1, C.hazard, '', rx, ry);
    for (let x = x0 + 4; x + 12 <= x1; x += step) s += P([on(x, a0, rx, ry), on(x + 7, a0, rx, ry), on(x + 12, a1, rx, ry), on(x + 5, a1, rx, ry)], C.ink);
    return s + ring(x0, x1, a0, C.ink, 1.1, rx, ry) + ring(x0, x1, a1, C.ink, 1.1, rx, ry);
}
const rivets = (a, from = -50, to = 50, step = 12.5) => {
    let s = '';
    for (let x = from; x <= to; x += step) s += O(...on(x, a), 0.95, C.ink);
    return s;
};

const BOXES = {};
/** The canvas box of a local region (x0..x1 across, a0..a1 up the axis), with a small margin. */
function boxOf(x0, a0, x1, a1, pad = 3) {
    const pts = [toC(x0, -a0), toC(x1, -a0), toC(x0, -a1), toC(x1, -a1)];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x = Math.floor(Math.min(...xs) - pad), y = Math.floor(Math.min(...ys) - pad);
    return [x, y, Math.ceil(Math.max(...xs) + pad) - x, Math.ceil(Math.max(...ys) + pad) - y];
}
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    BOXES[name] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}

/* ---- back: the hangar wall with two big leaning girders and a shaft of light, and the floor running away under a hazard band ---- */
{
    const VP = [205, 262], WALL = 332;
    /** x at height y on the floor line that reaches x = xb at the bottom of the canvas. */
    const rx = (xb, y) => VP[0] + ((xb - VP[0]) * (y - VP[1])) / (450 - VP[1]);
    const lane = (a, b, fill, y0 = WALL, y1 = 462) => P([[rx(a, y0), y0], [rx(b, y0), y0], [rx(b, y1), y1], [rx(a, y1), y1]], fill);
    let s = R(-8, -8, 376, 466, C.navy);
    // A shaft of light from the upper left, and two girders leaning the other way from the cylinder.
    s += P([[-8, -8], [150, -8], [-8, 300]], C.steel, ' fill-opacity="0.55"');
    s += P([[262, -8], [300, -8], [186, WALL], [148, WALL]], C.steel) + S([[300, -8], [186, WALL]], C.ink, 1.3) + P([[262, -8], [270, -8], [156, WALL], [148, WALL]], C.steelHi, ' fill-opacity="0.5"');
    s += P([[350, 60], [368, 20], [368, 120], [296, WALL], [262, WALL]], C.steel) + S([[368, 120], [296, WALL]], C.ink, 1.3);
    // The foot of the wall.
    s += R(-8, WALL - 12, 376, 12, C.ink) + R(-8, WALL - 14, 376, 2, C.steelHi);
    // The floor.
    s += R(-8, WALL, 376, 130, C.steel);
    s += lane(-420, -250, C.navy) + lane(700, 860, C.navy);
    s += lane(-40, -22, C.hazard) + lane(440, 458, C.hazard);
    for (const xb of [80, 205, 330]) s += lane(xb - 1.5, xb + 1.5, C.navy);
    // One hazard band across the floor, its bars leaning with the floor.
    s += P([[-8, 388], [368, 388], [368, 410], [-8, 410]], C.hazard);
    for (let xb = -330; xb < 760; xb += 62) s += P([[rx(xb, 410), 410], [rx(xb + 31, 410), 410], [rx(xb + 61, 388), 388], [rx(xb + 30, 388), 388]], C.ink);
    s += R(-8, 386.5, 376, 1.5, C.ink) + R(-8, 410, 376, 1.5, C.ink);
    svg('back', [-8, -8, 376, 466], s);
}

/* ---- cradle: what lies behind the cylinder: the spine rail it slides on, the ties between the two side beams, the back of the collar ---- */
{
    let s = '';
    for (const a of [44, 196, 300, 392]) s += R(-104, -a - 7, 208, 14, C.steel, INK) + R(-104, -a - 7, 208, 4, C.steelHi) + R(-104, -a - 7, 208, 14, 'none', INK);
    s += R(-17, -470, 34, 500, C.steel, INK) + R(-17, -470, 8, 500, C.steelHi) + R(-3, -470, 6, 500, C.ink) + R(-17, -470, 34, 500, 'none', INK);
    for (let a = 252; a < 470; a += 34) s += R(-12, -a, 24, 5, C.hazard, INK);
    s += E(0, 8, 72, 20, C.ink, INK);
    svg('cradle', [-6, -6, 372, 462], local(s));
}

/* ---- the tiers ---- */
/** The open top of a tier, seen once the one above has left: a steel deck with a ring of core light. */
const deck = a => E(0, -a, RX, RY, C.steel, INK) + E(0, -a, RX - 8, (RY * (RX - 8)) / RX, 'none', ` stroke="${C.cyan}" stroke-width="3"`) + E(0, -a, RX - 17, (RY * (RX - 17)) / RX, C.ink);
/** The armour of a tier from a0: body, a line near each rim with rivets. */
const armour = a0 => patch(-RX, RX, a0, a0 + H, C.armour) + ring(-RX, RX, a0 + 6) + ring(-RX, RX, a0 + H - 6) + rivets(a0 + 3);
/** Cel shading of a tier: one shadow shape down its far side, two highlight slashes on the near one, then the outline. */
const cel = (a0, h = H) =>
    patch(17, RX, a0, a0 + h, C.navy, SHADE) +
    patch(-48, -43, a0 + 9, a0 + h - 9, C.white) + patch(-40, -38, a0 + 18, a0 + h - 15, C.white) +
    patch(-RX, RX, a0, a0 + h, 'none', INK);
/** The vent recess a flap covers: ink, with three slits of core light of different lengths. */
const FLAP = [RX - 21, RX - 1];
const recess = (a0, side) => {
    const [x0, x1] = side < 0 ? [-FLAP[1], -FLAP[0]] : FLAP;
    let s = patch(x0, x1, a0 + 9, a0 + 45, C.ink);
    [[15, 0], [24, 4], [33, 9]].forEach(([a, cut]) => (s += patch(x0 + 3 + (side < 0 ? 0 : cut), x1 - 3 - (side < 0 ? cut : 0), a0 + a, a0 + a + 4, C.cyan)));
    return s;
};
const tierBox = (a0, extra = 0) => boxOf(-RX, a0 - RY, RX, a0 + H + RY + extra);

// Tier 4, the foot: one hazard band and a wide blue block; the collar hides its lower part.
{
    let s = deck(A4 + H) + armour(A4);
    s += hazard(-RX, RX, A4 + 14, A4 + 24) + patch(-30, 12, A4 + 30, A4 + 43, C.blue, INK) + patch(20, 44, A4 + 30, A4 + 43, C.ink);
    svg('tier-4', tierBox(A4), local(s + cel(A4)));
}
// Tier 3: carries the core. A frame of two struts and the core itself stand on its deck, hidden by the tiers above until they leave.
{
    let s = deck(A3 + H);
    for (const x of [-36, 30]) s += R(x, -(A3 + H + 84), 6, 84, C.steelHi, INK);
    s += `<rect x="-23" y="${-(A3 + H + 70)}" width="46" height="72" rx="23" fill="${C.cyan}"${INK}/>` + `<rect x="-14" y="${-(A3 + H + 62)}" width="28" height="58" rx="14" fill="${C.white}"/>`;
    s += R(-27, -(A3 + H + 12), 54, 6, C.steel, INK);
    s += armour(A3) + recess(A3, -1) + recess(A3, 1);
    // A hatch with two latches.
    s += patch(-24, 22, A3 + 12, A3 + 42, C.armour, INK) + patch(-30, -22, A3 + 22, A3 + 32, C.hazard, INK) + patch(20, 28, A3 + 22, A3 + 32, C.hazard, INK) + patch(-16, 2, A3 + 18, A3 + 36, C.blue) + O(...on(12, A3 + 27), 3.2, C.ink);
    svg('tier-3', tierBox(A3, 72), local(s + cel(A3)));
}
// Tier 2: a flap at each side over a vent recess; a blue service panel under a hazard band.
{
    let s = deck(A2 + H) + armour(A2) + recess(A2, -1) + recess(A2, 1);
    s += patch(-24, 22, A2 + 12, A2 + 42, C.blue, INK) + hazard(-24, 22, A2 + 34, A2 + 42, RX, RY, 14) + patch(-16, -4, A2 + 17, A2 + 29, C.armour) + patch(2, 16, A2 + 21, A2 + 25, C.ink);
    svg('tier-2', tierBox(A2), local(s + cel(A2)));
}
// Tier 1: one broad blue band, a white block set in it, two vents of different widths. The cap's piston stands on its deck.
{
    let s = deck(A1 + H) + R(-8, -(A1 + H + 24), 16, 24, C.steelHi, INK) + R(-8, -(A1 + H + 24), 5, 24, C.armour);
    s += armour(A1);
    s += patch(-RX, RX, A1 + 16, A1 + 40, C.blue) + ring(-RX, RX, A1 + 16) + ring(-RX, RX, A1 + 40) + patch(-34, -10, A1 + 23, A1 + 33, C.armour, INK);
    s += patch(2, 44, A1 + 25, A1 + 31, C.ink) + patch(-30, 6, A1 + 44, A1 + 47, C.ink);
    svg('tier-1', tierBox(A1, 10), local(s + cel(A1)));
}

/* ---- flaps: one armour plate each on the near side, hinged at an outer corner ---- */
const FLAPS = {};
{
    const flap = (name, a0, side, hingeTop) => {
        const [x0, x1] = side < 0 ? [-FLAP[1] - 1, -FLAP[0] + 1] : [FLAP[0] - 1, FLAP[1] + 1];
        const lo = a0 + 8, hi = a0 + 46;
        let s = patch(x0, x1, lo, hi, C.armour);
        s += hingeTop ? patch(x0, x1, lo, lo + 7, C.hazard) : patch(x0, x1, hi - 7, hi, C.hazard);
        s += patch(x0 + 6, x1 - 6, lo + 14, lo + 24, side < 0 ? C.cool : C.steel);
        if (side > 0) s += patch(x0, x1, lo, hi, C.navy, SHADE);
        s += patch(x0, x1, lo, hi, 'none', INK);
        const hinge = on(side < 0 ? x0 + 4 : x1 - 4, hingeTop ? hi - 4 : lo + 4);
        s += O(...hinge, 3, C.ink) + O(...hinge, 1.2, C.steelHi);
        const box = boxOf(x0, lo - RY, x1, hi + 2, 2);
        const [hx, hy] = toC(...hinge);
        FLAPS[name] = [(hx - box[0]) / box[2], (hy - box[1]) / box[3]].map(v => Math.round(v * 1000) / 1000);
        svg(name, box, local(s));
    };
    flap('flap-2l', A2, -1, true);
    flap('flap-2r', A2, 1, true);
    flap('flap-3l', A3, -1, false);
    flap('flap-3r', A3, 1, false);
}

/* ---- cap: a low drum with a hazard band, a blue boss on its lid ---- */
const BOSS = 34, BOSS_RY = (RY * BOSS) / RX, ALID = ACAP + 16, ATOP = ALID + 11;
{
    let s = patch(-RX, RX, ACAP, ALID, C.armour) + hazard(-RX, RX, ACAP + 4, ACAP + 11);
    s += patch(17, RX, ACAP, ALID, C.navy, SHADE) + patch(-48, -43, ACAP + 2, ALID - 2, C.white);
    s += E(0, -ALID, RX, RY, C.armour, INK) + patch(-RX, RX, ACAP, ALID, 'none', INK);
    s += P([on(-RX + 3, ALID), ...edge(-RX + 3, RX - 3, ALID).slice(1)].concat([[RX - 3, -ALID], [20, -ALID - 14], [44, -ALID - 6]]), C.navy, ' fill-opacity="0.16"');
    s += patch(-BOSS, BOSS, ALID, ATOP, C.blue, '', BOSS, BOSS_RY) + patch(10, BOSS, ALID, ATOP, C.navy, SHADE, BOSS, BOSS_RY) + patch(-BOSS, BOSS, ALID, ATOP, 'none', INK, BOSS, BOSS_RY);
    s += E(0, -ATOP, BOSS, BOSS_RY, C.armour, INK) + E(0, -ATOP, 15, (BOSS_RY * 15) / BOSS, C.ink);
    svg('cap', boxOf(-RX, ACAP - RY, RX, ATOP + BOSS_RY), local(s));
    // The handle ring, drawn upright: the layer leans it with the cylinder, and widens it from edge-on to face-on.
    svg('handle', [0, 0, 36, 16], `<path d="M5 16V8Q5 3 10 3H26Q31 3 31 8V16" fill="none" stroke="${C.ink}" stroke-width="6.5"/><path d="M5 16V8Q5 3 10 3H26Q31 3 31 8V16" fill="none" stroke="${C.hazard}" stroke-width="3.6"/>`);
}

/* ---- seam: the light that leaks between the closed tiers ---- */
{
    let s = '';
    for (const a of [A3, A2, A1]) s += ring(-RX + 1, RX - 1, a, C.cyan, 4.5).replace('/>', ' stroke-opacity="0.45"/>') + ring(-RX + 1, RX - 1, a, C.cyan, 2.2) + ring(-RX + 8, RX - 8, a, C.white, 0.9);
    svg('seam', boxOf(-RX, A3 - RY, RX, A1), local(s));
}

/* ---- clamps: a beam out of the side housing and a blue jaw with two yellow pads, gripping tiers two and three across their joint ---- */
{
    const yj = -A2;
    const clamp =
        R(-108, yj - 8, 36, 16, C.steelHi, INK) + R(-108, yj + 2, 36, 6, C.steel) + R(-108, yj - 8, 36, 16, 'none', INK) +
        P([[-78, yj - 26], [-60, yj - 26], [-56, yj - 22], [-56, yj + 30], [-60, yj + 34], [-78, yj + 34], [-82, yj + 30], [-82, yj - 22]], C.blue, INK) +
        R(-64, yj - 20, 9, 16, C.hazard, INK) + R(-64, yj + 12, 9, 16, C.hazard, INK) + R(-77, yj - 18, 4, 44, C.white);
    svg('clamp-l', boxOf(-108, A2 - 34, -55, A2 + 26, 2), local(clamp));
    svg('clamp-r', boxOf(55, A2 - 34, 108, A2 + 26, 2), local(flip(clamp) + P([[56, yj - 22], [60, yj - 26], [78, yj - 26], [82, yj - 22], [82, yj + 30], [78, yj + 34], [60, yj + 34], [56, yj + 30]], C.navy, SHADE)));
}

/* ---- gantry: the two side beams of the cradle with their clamp housings, the ram that holds the cradle up, the trunnion and the collar the foot stands in ---- */
const LAMPS = [-34, -17, 0, 17, 34].map(x => on(x, -13, 72, 20));
{
    const yj = -A2;
    /** A side beam, drawn for the left: lit face, one shadow strip, three lightening slots of different lengths, the clamp housing. */
    const beam = lit => {
        let s = R(-134, -480, 30, 560, lit ? C.steelHi : C.steel, INK) + R(-114, -480, 10, 560, lit ? C.steel : C.navy) + R(-134, -480, 30, 560, 'none', INK);
        for (const [a, h] of [[30, 36], [190, 50], [262, 28], [330, 60]]) s += `<rect x="-129" y="${-a - h}" width="10" height="${h}" rx="5" fill="${C.ink}"/>`;
        s += P([[-140, yj - 32], [-98, yj - 32], [-92, yj - 26], [-92, yj + 30], [-98, yj + 36], [-140, yj + 36]], lit ? C.armour : C.cool, INK);
        s += R(-140, yj + 22, 46, 9, C.hazard, INK) + R(-134, yj - 24, 22, 14, C.blue, INK) + R(-100, yj - 10, 8, 20, C.ink);
        if (lit) s += R(-108, yj - 30, 14, 62, C.navy, ' fill-opacity="0.22"');
        return s;
    };
    // The ram: from the floor up to the far beam.
    const [tx, ty] = toC(118, -150);
    let s = S([[330, 452], [tx, ty]], C.ink, 9) + S([[330, 452], [tx, ty]], C.cool, 6.4);
    s += S([[330, 452], [(330 + tx) / 2 + 2, (452 + ty) / 2]], C.ink, 17) + S([[330, 452], [(330 + tx) / 2 + 2, (452 + ty) / 2]], C.steelHi, 14.4) + S([[334, 452], [(334 + tx) / 2 + 6, (452 + ty) / 2 + 1]], C.steel, 5);
    s += local(flip(beam(false)) + O(118, -150, 7, C.hazard, INK) + O(118, -150, 2.4, C.ink));
    s += local(beam(true));
    // A girder close to the eye, across the upper left corner.
    s += P([[-6, -6], [112, -6], [-6, 96]], C.ink) + P([[112, -6], [126, -6], [-6, 108], [-6, 96]], C.steelHi) + P([[20, -6], [58, -6], [-6, 50], [-6, 16]], C.steel);
    // The trunnion the cradle turns on.
    s += P([[34, 456], [70, 402], [156, 402], [196, 456]], C.steelHi, INK) + P([[116, 402], [156, 402], [196, 456], [140, 456]], C.steel) + P([[34, 456], [70, 402], [156, 402], [196, 456]], 'none', INK);
    // The collar: the near wall of a cup; the foot of the cylinder stands in it. A row of lamp sockets along it.
    let c = patch(-72, 72, -30, 8, C.steelHi, '', 72, 20) + hazard(-72, 72, -4, 4, 72, 20, 18) + patch(22, 72, -30, 8, C.navy, SHADE, 72, 20) + patch(-60, -54, -26, -8, C.white, '', 72, 20) + patch(-72, 72, -30, 8, 'none', INK, 72, 20);
    for (const [x, y] of LAMPS) c += O(x, y, 5.2, C.ink) + O(x, y, 3.2, C.navy);
    s += local(c);
    svg('gantry', [-6, -6, 372, 462], s);
}

/* ---- fore: a dark gangway rail across the lower right corner, nearest the viewer ---- */
svg('fore', [226, 362, 152, 104], P([[232, 466], [378, 366], [378, 466]], C.ink) + P([[232, 466], [378, 366], [378, 380], [254, 466]], C.hazard) + P([[262, 466], [378, 386], [378, 390], [268, 466]], C.steelHi));

/* ---- lamps: one amber status lamp with a small halo, five times along the collar ---- */
LAMPS.forEach(([lx, ly], i) => {
    const [x, y] = toC(lx, ly);
    svg(`lamp-${i + 1}`, [Math.round(x) - 10, Math.round(y) - 10, 20, 20], `<defs>${fade('l', [[0, C.amber, 0.65], [1, C.amber, 0]])}</defs>` + `<circle cx="${f(x)}" cy="${f(y)}" r="10" fill="url(#l)"/>` + O(x, y, 3.4, C.amber) + O(x - 0.9, y - 0.9, 1.1, C.hazard));
});

/* ---- light: the core's light once the tiers have parted: a round fall-off, a flare across the gap, a bright heart ---- */
const CORE = toC(0, -(A3 + H + 30));
{
    const [cx, cy] = CORE.map(Math.round);
    let s = `<defs>${fade('g', [[0, C.white, 0.5], [0.3, C.cyan, 0.26], [0.65, C.cyan, 0.1], [1, C.cyan, 0]])}${fade('b', [[0, C.white, 0.95], [0.4, C.white, 0.4], [1, C.cyan, 0]])}${fade('h', [[0, C.white, 0.9], [0.55, C.white, 0.35], [1, C.cyan, 0]])}</defs>`;
    s += `<circle cx="${cx}" cy="${cy}" r="138" fill="url(#g)"/>`;
    s += `<g transform="rotate(${LEAN} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="136" ry="10" fill="url(#b)"/><ellipse cx="${cx}" cy="${cy}" rx="34" ry="50" fill="url(#h)"/></g>`;
    svg('light', [cx - 140, cy - 140, 280, 280], s);
    /* ---- spark: one fleck of hot metal ---- */
    svg('spark', [cx - 3, cy - 3, 6, 6], P([[cx, cy - 3], [cx + 3, cy], [cx, cy + 3], [cx - 3, cy]], C.hazard));
}

const [hx, hy] = toC(0, -ATOP);
process.stdout.write(JSON.stringify({ boxes: BOXES, flapOrigins: FLAPS, handleFoot: [Math.round(hx * 10) / 10, Math.round(hy * 10) / 10] }, null, 0) + '\n');
