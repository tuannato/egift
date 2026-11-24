// Generator for the "hanukkiah" wrapper art: a nine-branch candle holder on a window sill at night,
// seen from inside the room. Art-deco geometry: a fan transom over one big pane, a stepped skyline
// behind the glass, draped curtains at the sides, a sunburst panel under the sill. Flat shapes; the
// only gradients are the sky and alpha fades of light. No outline art, no filter, no blend mode.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/hanukkiah.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'hanukkiah');
if (!OUT.endsWith('wrappers/hanukkiah')) throw new Error('out dir must be public/wrappers/hanukkiah');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: four blues from the wall to the moonlit sill, two silvers and a white, two golds and the flame's heart. */
const C = {
    deep: '#070E22',
    night: '#0E1B3D',
    blue: '#1D3470',
    slate: '#3A5596',
    silver: '#C9D3E6',
    silverLo: '#8E9CBC',
    white: '#F5F7FC',
    gold: '#F2B84B',
    goldLo: '#C98A2B',
    flame: '#FFE9A8',
};

const f = n => String(Math.round(n * 100) / 100);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(pt).join('L')}Z" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra}/>`;
const stop = (o, c, a) => `<stop offset="${f(o)}" stop-color="${c}" stop-opacity="${f(a)}"/>`;
/** A four-pointed glint, `k` from centre to tip. */
const glint = (x, y, k, fill, extra = '') => poly([[x, y - k], [x + k * 0.2, y - k * 0.2], [x + k, y], [x + k * 0.2, y + k * 0.2], [x, y + k], [x - k * 0.2, y + k * 0.2], [x - k, y], [x - k * 0.2, y - k * 0.2]], fill, extra);
const BOXES = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    BOXES[name] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** A fixed run of numbers in 0..1 from a seed: the art is the same on every run. */
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let z = a;
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
}

/* ---- the plan of the picture ---- */
const WIN = { l: 44, r: 316, sill: 322, transom: 94 };
const MID = 180;
/** The eight candles of the row, left to right, and the helper in the middle, higher. */
const ROW = [68, 96, 124, 152, 208, 236, 264, 292];
const CUP = 218, CANDLE = 38, LIFT = 28;
/** Where each flame stands: the top of its wick. Index 0 is the helper, then the row left to right. */
const WICKS = [[MID, CUP - LIFT - CANDLE - 3], ...ROW.map(x => [x, CUP - CANDLE - 3])];
/** The point all the light comes from, once every candle burns. */
const SRC = [MID, 196];

/* ---- sky: the night through the pane, a full moon high on the left, a stepped skyline with a few lit windows ---- */
{
    let s = `<defs><linearGradient id="n" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${WIN.sill}">${stop(0, C.night, 1)}${stop(0.5, C.blue, 1)}${stop(1, C.slate, 1)}</linearGradient>`;
    s += `<radialGradient id="m">${stop(0, C.white, 0.34)}${stop(0.45, C.white, 0.12)}${stop(1, C.white, 0)}</radialGradient></defs>`;
    s += rect(40, -6, 280, 332, 'url(#n)');
    // Two long flat bars of thin cloud, far off.
    s += rect(150, 128, 170, 5, C.slate, ' rx="2.5" opacity="0.5"') + rect(214, 150, 80, 3, C.slate, ' rx="1.5" opacity="0.5"');
    // The moon, full, and the air round it.
    s += circle(94, 46, 40, 'url(#m)') + circle(94, 46, 15, C.white) + circle(99, 42, 3.6, C.silver) + circle(89, 52, 2.4, C.silver) + circle(96, 54, 1.4, C.silver);
    // The skyline: a far row in blue, a near row in the dark of the wall. Each tower steps in toward its top.
    const tower = (x, w, top, fill, steps = 2, mast = 0) => {
        let o = '';
        for (let i = 0; i <= steps; i += 1) {
            const ww = w * (1 - (0.56 * i) / (steps + 1)), y = top + (steps - i) * 10;
            o += rect(x - ww / 2, y, ww, WIN.sill + 4 - y, fill);
        }
        if (mast > 0) o += rect(x - 0.8, top - mast, 1.6, mast + 2, fill);
        return o;
    };
    const far = [[58, 30, 268, 1], [98, 26, 244, 2, 10], [140, 34, 276, 1], [186, 24, 262, 2], [226, 36, 280, 1], [262, 22, 250, 2, 8], [302, 30, 270, 1]];
    for (const [x, w, top, steps, mast] of far) s += tower(x, w, top, C.blue, steps, mast ?? 0);
    const near = [[48, 26, 290, 1], [78, 30, 262, 2, 14], [120, 30, 296, 1], [160, 26, 288, 1], [204, 30, 298, 1], [246, 28, 284, 2], [286, 32, 268, 2, 12], [318, 20, 294, 1]];
    for (const [x, w, top, steps, mast] of near) s += tower(x, w, top, C.night, steps, mast ?? 0);
    // A few lit windows, never in a row of equals.
    const rnd = seeded(9), lit = [];
    for (const [x, w, top, steps] of near) {
        const n = 1 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i += 1) {
            const wx = x - w * 0.3 + Math.floor(rnd() * 4) * (w * 0.2) - 1.2, wy = top + steps * 10 + 6 + Math.floor(rnd() * 4) * 7;
            if (wy < WIN.sill - 6 && !lit.some(([a, b]) => Math.abs(a - wx) < 4 && Math.abs(b - wy) < 5)) lit.push([wx, wy]);
        }
    }
    for (const [wx, wy] of lit) s += rect(wx, wy, 2.6, 3.6, C.gold, ' opacity="0.9"');
    s += rect(97, 262, 2.2, 3, C.gold, ' opacity="0.7"') + rect(264, 268, 2.2, 3, C.gold, ' opacity="0.7"');
    svg('sky', [40, -6, 280, 332], s);
}

/* ---- stars: small ones over the whole pane, a few glints; they twinkle as one layer ---- */
{
    const rnd = seeded(41);
    let s = '';
    for (let i = 0; i < 46; i += 1) {
        const x = 50 + rnd() * 260, y = 2 + rnd() * 226, r = 0.6 + rnd() * 0.9, a = 0.45 + rnd() * 0.5;
        if (Math.hypot(x - 94, y - 46) < 30) continue;
        s += circle(x, y, r, C.white, ` opacity="${f(a)}"`);
    }
    s += glint(232, 44, 6, C.white) + glint(288, 108, 4.5, C.white, ' opacity="0.9"') + glint(74, 132, 4, C.white, ' opacity="0.85"') + glint(196, 20, 3.5, C.silver);
    svg('stars', [44, -6, 272, 240], s);
}

/* ---- frame: the wall, the window's frame with its fan transom, the sill, and the sunburst panel under it ---- */
{
    let s = '';
    // The wall: either side of the window and below it.
    s += rect(-6, -6, 50, 462, C.deep) + rect(316, -6, 50, 462, C.deep) + rect(-6, WIN.sill, 372, 134, C.deep);
    // The frame: a blue strip outside, a slate strip inside, on each jamb.
    s += rect(WIN.l - 8, -6, 5, 330, C.blue) + rect(WIN.l - 3, -6, 6, 330, C.slate) + rect(WIN.r - 3, -6, 6, 330, C.slate) + rect(WIN.r + 3, -6, 5, 330, C.blue);
    // The fan transom: spokes from a half hub on the transom bar, and one arc across them.
    const hub = [MID, WIN.transom];
    for (const deg of [16, 41, 67, 113, 139, 164]) {
        const a = (deg * Math.PI) / 180;
        s += `<path d="M${pt(hub)}L${pt([hub[0] + Math.cos(a) * 190, hub[1] - Math.sin(a) * 190])}" stroke="${C.slate}" stroke-width="3" fill="none"/>`;
    }
    s += `<path d="M${f(hub[0] - 62)} ${hub[1]}A62 62 0 0 1 ${f(hub[0] + 62)} ${hub[1]}" stroke="${C.slate}" stroke-width="3" fill="none"/>`;
    s += `<path d="M${f(hub[0] - 22)} ${hub[1]}A22 22 0 0 1 ${f(hub[0] + 22)} ${hub[1]}Z" fill="${C.slate}"/>` + `<path d="M${f(hub[0] - 11)} ${hub[1]}A11 11 0 0 1 ${f(hub[0] + 11)} ${hub[1]}Z" fill="${C.silverLo}"/>`;
    s += rect(WIN.l, WIN.transom - 3, WIN.r - WIN.l, 6, C.slate);
    // The spokes run past the frame's edge: the wall takes them back.
    s += rect(-6, -6, 42, 110, C.deep) + rect(324, -6, 42, 110, C.deep);
    // The sill: its top lies in moonlight, its front edge is darker. One slanting patch of brighter light, left of the middle.
    s += poly([[34, WIN.sill], [326, WIN.sill], [336, 344], [24, 344]], C.slate);
    s += poly([[86, WIN.sill], [162, WIN.sill], [150, 344], [66, 344]], C.silverLo, ' opacity="0.55"');
    s += rect(24, 344, 312, 9, C.blue) + rect(30, 353, 300, 3, C.night);
    // Under the sill: a panel with a low sunburst, the fan of the transom again.
    const P = { x: 66, y: 372, w: 228, h: 66 };
    s += `<defs><clipPath id="c"><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}"/></clipPath></defs>`;
    let fan = rect(P.x, P.y, P.w, P.h, C.night);
    const o = [MID, P.y + P.h + 10], edges = [0, 13, 24, 39, 52, 68, 82, 98, 112, 128, 141, 156, 167, 180];
    for (let i = 0; i < edges.length - 1; i += 2) {
        const a = (edges[i] * Math.PI) / 180, b = (edges[i + 1] * Math.PI) / 180;
        fan += poly([o, [o[0] + Math.cos(a) * 200, o[1] - Math.sin(a) * 200], [o[0] + Math.cos(b) * 200, o[1] - Math.sin(b) * 200]], C.blue, i % 4 === 0 ? '' : ' opacity="0.6"');
    }
    fan += circle(o[0], o[1], 30, C.slate) + circle(o[0], o[1], 19, C.silverLo);
    s += `<g clip-path="url(#c)">${fan}</g>`;
    s += `<rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" fill="none" stroke="${C.slate}" stroke-width="2"/>`;
    // The skirting.
    s += rect(-6, 444, 372, 12, C.night) + rect(-6, 444, 372, 2, C.blue);
    svg('frame', [-6, -6, 372, 462], s);
}

/* ---- curtains: drawn back and tied, one each side; folds are hard-edged stripes that gather at the tie ---- */
function curtain(name, side, tieY, folds) {
    const X = x => (side > 0 ? x : 360 - x);
    const P0 = [72, -6], P1 = [62, 176], P2 = [34, tieY];
    const edge = [];
    for (let i = 0; i <= 18; i += 1) {
        const t = i / 18, u = 1 - t;
        edge.push([u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0], u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]]);
    }
    const at = (e, k) => [X(-6 + (e[0] + 6) * k), e[1]];
    const strip = (a, b, fill, extra = '') => poly([...edge.map(e => at(e, a)), ...edge.map(e => at(e, b)).reverse()], fill, extra);
    let s = strip(0, 1, C.blue);
    for (const [a, b, fill, op] of folds) s += strip(a, b, fill, op ? ` opacity="${op}"` : '');
    // Below the tie the cloth falls and spreads to the floor.
    const hem = 54, low = [[34, tieY + 8], [hem, 446]];
    const lowAt = k => [[X(-6 + (low[0][0] + 6) * k), low[0][1]], [X(-6 + (low[1][0] + 6) * k), low[1][1]]];
    const fall = (a, b, fill, extra = '') => poly([...lowAt(a), ...lowAt(b).reverse()], fill, extra);
    s += fall(0, 1, C.blue);
    for (const [a, b, fill, op] of folds) s += fall(a, b, fill, op ? ` opacity="${op}"` : '');
    // A band of gold near the hem, and the tie.
    s += poly([[X(-6), 428], [X(51.6), 428], [X(52.2), 433], [X(-6), 433]], C.gold, ' opacity="0.85"');
    s += poly([[X(-6), tieY - 1], [X(34.8), tieY - 1], [X(34.8), tieY + 9], [X(-6), tieY + 10]], C.goldLo) + poly([[X(-6), tieY - 1], [X(34.8), tieY - 1], [X(34.8), tieY + 2.5], [X(-6), tieY + 2.5]], C.gold);
    svg(name, side > 0 ? [-6, -6, 80, 462] : [286, -6, 80, 462], s);
}
curtain('curtain-l', 1, 258, [[0.1, 0.26, C.night], [0.4, 0.5, C.slate, 0.7], [0.58, 0.7, C.night], [0.82, 1, C.slate]]);
curtain('curtain-r', -1, 266, [[0.06, 0.2, C.night], [0.3, 0.42, C.slate, 0.7], [0.52, 0.66, C.night], [0.78, 1, C.slate]]);

/* ---- the holder: a stepped base, a stem, four arcs carrying eight cups in one level row, and the ninth cup
   on the stem, higher. The candles stand in it. `tint` draws the same metal as one flat warm colour: the light on it. ---- */
function holder(tint) {
    const metal = tint ?? C.silver, lo = tint ?? C.silverLo;
    let s = '';
    if (!tint) s += ellipse(MID, 335, 52, 5, C.night, ' opacity="0.55"');
    // The arcs: each joins two cups of the row, passing under the stem.
    [28, 56, 84, 112].forEach((r, i) => {
        const ry = r * 0.6, x1 = MID - r, x2 = MID + r, y = 238;
        s += `<path d="M${x1} ${CUP + 8}L${x1} ${y}A${r} ${f(ry)} 0 0 0 ${x2} ${y}L${x2} ${CUP + 8}" stroke="${i % 2 === 1 ? lo : metal}" stroke-width="5" fill="none"/>`;
    });
    // The stem, with one collar where the arcs gather, and the stepped base.
    s += rect(MID - 4, CUP - LIFT + 8, 8, 312 - (CUP - LIFT + 8), metal);
    s += poly([[MID, 222], [MID + 9, 232], [MID, 242], [MID - 9, 232]], lo);
    s += rect(MID - 13, 311, 26, 8, metal) + rect(MID - 24, 319, 48, 7, lo) + rect(MID - 38, 326, 76, 8, metal);
    // The cups: a dish and a tapering socket under it.
    const cup = (x, top, k = 1) => rect(x - 9 * k, top, 18 * k, 3, metal, ' rx="1.5"') + poly([[x - 6.5 * k, top + 3], [x + 6.5 * k, top + 3], [x + 3.5, top + 10], [x - 3.5, top + 10]], lo);
    for (const x of ROW) s += cup(x, CUP);
    s += cup(MID, CUP - LIFT, 1.25);
    if (tint) return s;
    // The candles, in three tones, mirrored about the helper; each has a short dark wick.
    const tones = [C.white, C.slate, C.white, C.gold, C.gold, C.white, C.slate, C.white];
    const candle = (x, top, fill, w = 8) => rect(x - w / 2, top - CANDLE, w, CANDLE, fill, ' rx="1.5"') + rect(x - 0.7, top - CANDLE - 4, 1.4, 4.5, C.deep);
    ROW.forEach((x, i) => {
        s += candle(x, CUP, tones[i]);
        // Slate candles carry a pale band so that they read against the night.
        if (tones[i] === C.slate) s += rect(x - 4, CUP - 26, 8, 5, C.silver) + rect(x - 4, CUP - 12, 8, 3, C.silver);
        if (tones[i] === C.gold) s += rect(x - 4, CUP - 9, 8, 3, C.goldLo);
    });
    s += candle(MID, CUP - LIFT, C.white, 9) + rect(MID - 4.5, CUP - LIFT - 8, 9, 3, C.silverLo);
    return s;
}
svg('holder', [58, 146, 244, 195], holder());
// The warm light on the metal once the candles burn: the same shapes in gold, thin.
svg('lit', [58, 186, 244, 150], `<g opacity="0.5">${holder(C.flame)}</g>`);

/* ---- coins: a few plain round coins lying on the sill, seen a little from above. Blank faces. ---- */
{
    const coin = (x, y, rx = 10.5) => ellipse(x, y + 2.6, rx, rx * 0.4, C.goldLo) + rect(x - rx, y, 2 * rx, 2.6, C.goldLo) + ellipse(x, y, rx, rx * 0.4, C.gold);
    let s = coin(98, 337) + coin(97, 333.5) + coin(99, 330) + coin(122, 339, 9.5);
    s += coin(258, 338, 9.5) + coin(281, 337) + coin(279.5, 333.5);
    svg('coins', [84, 322, 212, 24], s);
}

/* ---- flames: nine, each its own layer with the small glow of air round it. The helper's is a little larger. ---- */
function flame(name, [x, y], k) {
    // `y` is the wick's top; the flame stands on it.
    const drop = (h, w, lift) => {
        const b = y - lift;
        return `M${f(x)} ${f(b - h)}C${f(x + w * 0.2)} ${f(b - h * 0.66)} ${f(x + w / 2)} ${f(b - h * 0.48)} ${f(x + w / 2)} ${f(b - w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x - w / 2)} ${f(b - w / 2)}C${f(x - w / 2)} ${f(b - h * 0.48)} ${f(x - w * 0.2)} ${f(b - h * 0.66)} ${f(x)} ${f(b - h)}Z`;
    };
    const R = 22 * k, cy = y - 9 * k;
    let s = `<defs><radialGradient id="g">${stop(0, C.gold, 0.62)}${stop(0.45, C.gold, 0.22)}${stop(1, C.gold, 0)}</radialGradient></defs>`;
    s += circle(x, cy, R, 'url(#g)');
    s += `<path d="${drop(23 * k, 11.5 * k, -1)}" fill="${C.gold}"/><path d="${drop(13 * k, 6 * k, 0.5)}" fill="${C.flame}"/>`;
    svg(name, [x - R, cy - R, 2 * R, 2 * R], s);
}
WICKS.forEach((w, i) => flame(`flame-${i}`, w, i === 0 ? 1.25 : 1));

/* ---- glows: three soft pools of warm air, one over the helper and one over each half of the row ---- */
{
    const pool = (name, cx, cy, rx, ry, a) => svg(name, [cx - rx, cy - ry, 2 * rx, 2 * ry], `<defs><radialGradient id="g">${stop(0, C.gold, a)}${stop(0.5, C.gold, a * 0.42)}${stop(1, C.gold, 0)}</radialGradient></defs>${ellipse(cx, cy, rx, ry, 'url(#g)')}`);
    pool('glow-h', MID, 138, 56, 56, 0.4);
    pool('glow-l', 110, 168, 82, 50, 0.36);
    pool('glow-r', 250, 168, 82, 50, 0.36);
}

/* ---- halo: the round of light behind the holder once all nine burn ---- */
{
    const R = 150;
    svg('halo', [SRC[0] - R, SRC[1] - R, 2 * R, 2 * R], `<defs><radialGradient id="h">${stop(0, C.gold, 0.6)}${stop(0.25, C.gold, 0.36)}${stop(0.6, C.gold, 0.13)}${stop(1, C.gold, 0)}</radialGradient></defs>${circle(SRC[0], SRC[1], R, 'url(#h)')}`);
}

/* ---- rays: a fan of light from the same point, up and out; each ray fades to nothing along its length ---- */
{
    const L = 236;
    let s = `<defs><radialGradient id="r" gradientUnits="userSpaceOnUse" cx="${SRC[0]}" cy="${SRC[1]}" r="${L}">${stop(0, C.flame, 0.5)}${stop(0.3, C.gold, 0.3)}${stop(0.62, C.gold, 0.1)}${stop(0.84, C.gold, 0)}</radialGradient></defs>`;
    // [from, to] in degrees above the horizontal, unequal on purpose.
    const fan = [[-8, 2], [10, 23], [30, 37], [45, 60], [67, 74], [82, 98], [106, 113], [120, 136], [143, 150], [158, 171], [178, 188]];
    for (const [a, b] of fan) {
        const A = (a * Math.PI) / 180, B = (b * Math.PI) / 180;
        s += poly([SRC, [SRC[0] + Math.cos(A) * L, SRC[1] - Math.sin(A) * L], [SRC[0] + Math.cos(B) * L, SRC[1] - Math.sin(B) * L]], 'url(#r)');
    }
    svg('rays', [-6, -6, 372, 240], s);
}

/* ---- sill-light: warm light lying on the sill and running down the wall under it ---- */
{
    let s = `<defs><radialGradient id="a">${stop(0, C.flame, 0.7)}${stop(0.5, C.gold, 0.34)}${stop(1, C.gold, 0)}</radialGradient><radialGradient id="b">${stop(0, C.gold, 0.26)}${stop(0.5, C.gold, 0.1)}${stop(1, C.gold, 0)}</radialGradient></defs>`;
    s += ellipse(MID, 352, 146, 92, 'url(#b)');
    s += ellipse(MID, 334, 150, 13, 'url(#a)');
    svg('sill-light', [30, 321, 300, 125], s);
}

/* ---- fleck: a mote of gold, scattered when the last candle takes ---- */
svg('fleck', [SRC[0] - 4, SRC[1] - 4, 8, 8], poly([[SRC[0], SRC[1] - 4], [SRC[0] + 4, SRC[1]], [SRC[0], SRC[1] + 4], [SRC[0] - 4, SRC[1]]], C.gold));

const area = Object.values(BOXES).reduce((a, b) => a + b[2] * b[3], 0) / (360 * 450);
console.log(Object.entries(BOXES).map(([k, b]) => `${k}: [${b.map(f).join(', ')}]`).join('\n'));
console.log('layers', Object.keys(BOXES).length, 'area', area.toFixed(2), 'canvases');
