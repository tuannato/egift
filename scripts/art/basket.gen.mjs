// Generator for the "basket" wrapper art, in JAPANESE BRUSH-PEN drawing: a few sumi lines of varying
// weight with dry-brush tails, bare paper, and a handful of flat colour shapes (cut colour paper)
// laid slightly OFF the line. No washes, no gradients, no blur: every mark is either a brush stroke
// (a ribbon whose width follows the pressure of the hand, splitting into bristle hairs where the brush
// runs dry) or a flat cut shape.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas) and
// prints the layer boxes for src/wrappers/basket.ts.
// Run: node scripts/art/basket.gen.mjs && node scripts/wrap-art.mjs --write
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'basket');
if (!OUT.endsWith('wrappers/basket')) throw new Error('out dir must be public/wrappers/basket');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

const INK = '#1E1A17';
const PAPER = '#ECE4D2';
const PERS = '#C96F43'; // muted persimmon: the blanket and its yarn
const PERS_LINE = '#A9512B';
const SAGE = '#93A286';
const CARAMEL = '#CFA676';
const DEEP = '#B08D66'; // the inside of the basket
const GREY = '#D2C9B6'; // warm grey: shadows
const SUN = '#FBF1C9';
const GOLD = '#D9A640';

/** The whole scene is drawn in planning coordinates and lifted by DY on the canvas. */
const DY = -8;

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let z = a;
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
}
const f = n => String(Math.round(n * 10) / 10);
const P = p => `${f(p[0])} ${f(p[1])}`;
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function svg(name, box, inner) {
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y + DY} ${w} ${h}" width="${w}" height="${h}"><g transform="translate(0 ${DY})">${inner}</g></svg>`;
    writeFileSync(join(OUT, `${name}.svg`), s);
    BOXES[name] = [x, y + DY, w, h];
}
const BOXES = {};

/* ---------- geometry ---------- */
/** A Catmull-Rom curve through `pts`, sampled about every `step` units. */
function curve(pts, step = 2.4) {
    const Q = [pts[0], ...pts, pts[pts.length - 1]];
    const out = [];
    for (let i = 1; i < Q.length - 2; i++) {
        const [p0, p1, p2, p3] = [Q[i - 1], Q[i], Q[i + 1], Q[i + 2]];
        const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
        for (let k = 0; k < n; k++) {
            const t = k / n, t2 = t * t, t3 = t2 * t;
            const c = j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
            out.push([c(0), c(1)]);
        }
    }
    out.push(pts[pts.length - 1]);
    return out;
}
/** Arc-length parameter 0..1 and unit normals of a dense polyline. */
function frame(c) {
    const len = [0];
    for (let i = 1; i < c.length; i++) len.push(len[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
    const L = len[len.length - 1] || 1;
    const nrm = c.map((_, i) => {
        const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        return [-dy / d, dx / d];
    });
    return { t: len.map(l => l / L), nrm, L };
}
/** A closed path through points; a point flagged `[x, y, 1]` is a sharp corner, the rest are rounded. */
function closed(pts) {
    const n = pts.length;
    let d = `M${P(mid(pts[n - 1], pts[0]))}`;
    for (let i = 0; i < n; i++) {
        const p = pts[i], m = mid(p, pts[(i + 1) % n]);
        d += p[2] ? `L${P(p)}L${P(m)}` : `Q${P(p)} ${P(m)}`;
    }
    return d + 'Z';
}
/** A ribbon: centre line `c`, with a half-width on each side at every sample. */
function ribbon(c, nrm, hl, hr) {
    const left = c.map((p, i) => [p[0] + nrm[i][0] * hl[i], p[1] + nrm[i][1] * hl[i]]);
    const right = c.map((p, i) => [p[0] - nrm[i][0] * hr[i], p[1] - nrm[i][1] * hr[i]]).reverse();
    return closed([...left, ...right]);
}
const arc = (cx, cy, rx, ry, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => {
    const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
});
const shift = (pts, dx, dy) => pts.map(p => [p[0] + dx, p[1] + dy, p[2]]);

/* ---------- the brush pen ---------- */
/**
 * One stroke of the brush pen along `pts`, as path data.
 *  w      the widest the stroke gets
 *  shape  how the pressure runs: 'press' (set down hard, lifted away), 'swell' (thin, full, thin),
 *         'flat' (held), 'grow' (light to hard)
 *  dry    where (0..1) the brush runs dry: from there the body thins out and the bristles go on
 *         alone as separate hairs. 1.1 = never.
 *  head   the width the stroke is set down with, as a fraction of w
 *  fall   the length of the lift at the end when the stroke does not run dry
 */
function brush(pts, { w = 3, shape = 'press', dry = 0.72, head = 0.55, fall = 0.14, hairs, seed = 1, step = 2.4, bare = false } = {}) {
    const r = rng(seed * 7919 + 13);
    const c = curve(pts, step);
    const { t, nrm } = frame(c);
    const ph = r() * 9, fq = 2.5 + r() * 3;
    const prof = u => {
        let s;
        if (shape === 'press') s = 1 - 0.5 * u;
        else if (shape === 'swell') s = 0.3 + 0.7 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04)), 0.8);
        else if (shape === 'grow') s = 0.35 + 0.65 * u;
        else s = 1;
        s *= 1 + 0.1 * Math.sin(u * fq * Math.PI + ph);
        const rise = 0.06;
        if (u < rise) s *= head + (1 - head) * Math.sin((u / rise) * Math.PI / 2);
        return s * w;
    };
    const mainEnd = dry + (1 - dry) * 0.6;
    const body = u => {
        if (dry <= 1) return u < dry ? 1 : Math.max(0, 1 - (u - dry) / (mainEnd - dry));
        return u > 1 - fall ? Math.sqrt(Math.max(0, (1 - u) / fall)) : 1;
    };
    const jl = c.map(() => 1 + (r() - 0.5) * 0.16), jr = c.map(() => 1 + (r() - 0.5) * 0.16);
    let d = '';
    // the body
    const last = dry <= 1 ? t.findIndex(u => u >= mainEnd) : c.length - 1;
    const idx = Array.from({ length: (last < 0 ? c.length - 1 : last) + 1 }, (_, i) => i);
    if (idx.length > 2 && !bare) {
        d += ribbon(idx.map(i => c[i]), idx.map(i => nrm[i]), idx.map(i => 0.5 * prof(t[i]) * body(t[i]) * jl[i]), idx.map(i => 0.5 * prof(t[i]) * body(t[i]) * jr[i]));
    }
    // the bristles
    if (dry <= 1) {
        const n = hairs ?? Math.max(3, Math.min(7, Math.round(2 + w * 0.9)));
        for (let k = 0; k < n; k++) {
            const off = (n === 1 ? 0 : (k / (n - 1) - 0.5) * 0.84) + (r() - 0.5) * 0.1;
            const ts = Math.max(0, dry - 0.1 - r() * 0.12), te = dry + (1 - dry) * (0.45 + 0.55 * r());
            const hw = 0.07 + r() * 0.07;
            const ii = c.map((_, i) => i).filter(i => t[i] >= ts && t[i] <= te);
            if (ii.length < 3) continue;
            const cc = ii.map(i => [c[i][0] + nrm[i][0] * off * prof(t[i]), c[i][1] + nrm[i][1] * off * prof(t[i])]);
            const hh = ii.map(i => {
                const q = (t[i] - ts) / (te - ts);
                return Math.max(0.12, prof(t[i]) * hw * Math.sin(Math.PI * Math.min(1, q * 0.8 + 0.2)) * (0.8 + 0.5 * r()));
            });
            d += ribbon(cc, ii.map(i => nrm[i]), hh, hh);
        }
    }
    return d;
}
/** Strokes drawn in one ink. */
const ink = (ds, fill = INK, extra = '') => `<path d="${Array.isArray(ds) ? ds.join('') : ds}" fill="${fill}"${extra}/>`;
/** A flat cut shape. */
const flat = (pts, fill, extra = '') => `<path d="${closed(pts)}" fill="${fill}"${extra}/>`;

/* ================= the room ================= */
const FLOOR = 267; // where the wall meets the floor

/* ---- paper: bare, with a few fibres ---- */
{
    const r = rng(4);
    let s = `<rect x="-12" y="${-12 - DY}" width="384" height="474" fill="${PAPER}"/>`;
    let dk = '', lt = '';
    for (let i = 0; i < 46; i++) {
        const x = -8 + r() * 376, y = -8 - DY + r() * 466, a = r() * Math.PI, l = 2 + r() * 5;
        const seg = `M${f(x)} ${f(y)}l${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}`;
        if (r() < 0.5) dk += seg; else lt += seg;
    }
    s += `<path d="${dk}" stroke="#8C7F66" stroke-width="0.3" stroke-opacity="0.2" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${lt}" stroke="#FFFDF4" stroke-width="0.45" stroke-opacity="0.6" fill="none" stroke-linecap="round"/>`;
    svg('paper', [-12, -12 - DY, 384, 474], s);
}

/* ---- the sun patch: window light, folding from the wall onto the floor ---- */
{
    const wall = (x, y) => [x + 0.16 * (FLOOR - y), y];
    const floor = (x, y) => [x + 0.66 * (y - FLOOR), y];
    const quad = (m, x0, x1, y0, y1) => `M${P(m(x0, y0))}L${P(m(x1, y0))}L${P(m(x1, y1))}L${P(m(x0, y1))}Z`;
    let d = '';
    const cols = [[232, 271], [276, 318]];
    for (const [x0, x1] of cols) {
        d += quad(wall, x0, x1, 106, 180) + quad(wall, x0, x1, 185, FLOOR - 1.5);
        d += quad(floor, x0, x1, FLOOR + 1.5, 352);
    }
    svg('sun', [200, 96, 172, 270], `<path d="${d}" fill="${SUN}"/>`);
}

/* ---- room lines and shadows ---- */
{
    let s = '';
    // shadows: flat warm grey, cut a little off what casts them
    s += flat([[84, 322], [56, 333], [92, 345], [170, 344], [236, 338], [262, 324], [180, 330]], GREY);
    s += flat([[30, 276], [52, 281], [86, 277], [70, 271], [40, 271]], GREY);
    const d = [];
    // the join of wall and floor: set down hard at the left, breaking behind the basket, dry at the right
    d.push(brush([[-12, 271], [30, 269.5], [70, 269], [98, 268]], { w: 4.2, shape: 'press', dry: 0.82, seed: 3 }));
    d.push(brush([[262, 266], [300, 265], [340, 264.5], [372, 264]], { w: 2.6, shape: 'grow', dry: 0.6, seed: 5 }));
    s += ink(d);
    svg('room', [-12, 256, 384, 150], s);
}

/* ---- the plant ---- */
{
    const r = rng(21);
    let leaves = `<path d="M42 231L84 230L77 271L49 271Z" fill="${PAPER}"/>`, lines = [];
    // the pot: three strokes and a foot
    lines.push(brush([[41, 231], [52, 233], [70, 233], [84, 230]], { w: 3.8, shape: 'press', dry: 0.8, seed: 31 }));
    lines.push(brush([[44, 235], [46, 252], [50, 270]], { w: 3, shape: 'press', dry: 1.1, fall: 0.3, seed: 32 }));
    lines.push(brush([[81, 234], [79, 250], [76, 266]], { w: 1.7, shape: 'swell', dry: 0.7, seed: 33 }));
    lines.push(brush([[49, 271], [60, 273.5], [72, 272]], { w: 2.4, shape: 'grow', dry: 0.7, seed: 34 }));
    // the stem
    const stem = [[62, 232], [60, 210], [64, 188], [60, 166], [62, 150]];
    lines.push(brush(stem, { w: 2.4, shape: 'press', dry: 0.85, seed: 35 }));
    const sc = curve(stem, 2), sf = frame(sc);
    const at = u => sc[sf.t.findIndex(x => x >= u)] ?? sc[sc.length - 1];
    // leaves: each a cut of sage paper and one stroke for the midrib, the paper laid off the stroke
    const L = [
        { u: 0.16, a: -152, len: 40, wd: 17 },
        { u: 0.3, a: -24, len: 46, wd: 20 },
        { u: 0.5, a: -146, len: 50, wd: 21 },
        { u: 0.66, a: -40, len: 42, wd: 17 },
        { u: 0.83, a: -128, len: 37, wd: 15 },
        { u: 1, a: -58, len: 27, wd: 11 },
    ];
    L.forEach((lf, i) => {
        const b = at(lf.u), a = lf.a * Math.PI / 180, bend = (r() - 0.5) * 0.5;
        const dir = [Math.cos(a), Math.sin(a)], nr = [-dir[1], dir[0]];
        const pt = (q, o) => [b[0] + dir[0] * lf.len * q + nr[0] * (o + bend * lf.len * q * q * 0.5), b[1] + dir[1] * lf.len * q + nr[1] * (o + bend * lf.len * q * q * 0.5)];
        const wl = lf.wd * (0.45 + 0.2 * r()), wr = lf.wd - wl;
        const shape = [[...pt(0.06, 0), 1], pt(0.3, wl), pt(0.62, wl * 0.92), [...pt(1, 0), 1], pt(0.66, -wr * 0.9), pt(0.3, -wr)];
        const ox = 2 + r() * 2.5, oy = 1 + r() * 2.5;
        leaves += flat(shift(shape, ox * (i % 2 ? 1 : -0.6), oy), SAGE);
        lines.push(brush([pt(0, 0), pt(0.35, 0.6), pt(0.7, 0.3), pt(0.94, 0)], { w: 1.5 + r() * 1.3, shape: 'press', dry: 0.6 + r() * 0.25, hairs: 2, seed: 40 + i }));
    });
    svg('plant', [2, 96, 124, 186], leaves + ink(lines));
}

/* ================= the basket ================= */
const RX = 86, RY = 13, RCX = 180, RCY = 246, BASE = 318;
/** The front of the basket: v = 0 on the rim's front arc, 1 on the base; s = -1..1 across. */
const body = (s, v) => {
    const hw = RX - 14 * v;
    return [RCX + s * hw, RCY + (BASE - RCY) * v + (13 - 4 * v) * (1 - s * s)];
};
const row = (v, s0, s1, n = 6, sag = 0) => Array.from({ length: n + 1 }, (_, i) => {
    const q = i / n, p = body(s0 + (s1 - s0) * q, v);
    return [p[0], p[1] + sag * Math.sin(Math.PI * q)];
});

/* ---- basket-back: the far rim and the inside ---- */
{
    let s = `<ellipse cx="${RCX}" cy="${RCY}" rx="${RX}" ry="${RY}" fill="${PAPER}"/>`;
    s += `<ellipse cx="${RCX + 2}" cy="${RCY + 1.5}" rx="${RX - 3}" ry="${RY - 2}" fill="${DEEP}"/>`;
    s += ink(brush(arc(RCX, RCY, RX, RY, 184, 356, 20), { w: 2.6, shape: 'swell', dry: 0.8, seed: 51 }));
    svg('basket-back', [88, 226, 184, 36], s);
}

/* ---- basket-front: paper body, one cut of caramel, rim, sides, base, and a shorthand of weave ---- */
{
    const r = rng(77);
    const outline = [...arc(RCX, RCY, RX, RY, 180, 0, 24), ...Array.from({ length: 13 }, (_, i) => body(1 - i / 6, 1))];
    let s = `<path d="M${outline.map(P).join('L')}Z" fill="${PAPER}"/>`;
    // the caramel: the shadow side, cut straight and laid low and to the left
    s += flat([[88, 256, 1], [104, 262], [150, 270], [206, 268, 1], [176, 334, 1], [140, 334], [103, 325, 1]], CARAMEL);
    const d = [];
    // the weave: short dabs in staggered rows, thick in the shade, letting go into bare paper toward the light
    const rows = [0.25, 0.42, 0.59, 0.76, 0.92];
    rows.forEach((v, ri) => {
        for (let k = 0; k < 12; k++) {
            const sc = -0.9 + k * 0.165 + (ri % 2) * 0.082 + (r() - 0.5) * 0.03;
            if (sc > 0.93) continue;
            const lit = (sc + 1) / 2;
            if (r() > 1.02 - 0.62 * Math.pow(lit, 1.3)) continue;
            const half = 0.06 + r() * 0.025;
            d.push(brush(row(v + (r() - 0.5) * 0.02, sc - half, sc + half, 3, 1.6), { w: (2.9 - 1.5 * lit) * (0.75 + 0.5 * r()), shape: r() < 0.5 ? 'swell' : 'press', dry: r() < 0.35 ? 0.6 : 1.1, hairs: 2, fall: 0.3, seed: 100 + ri * 20 + k, step: 2 }));
        }
    });
    // the rim: the heaviest line in the drawing, set down at the left and running dry at the right
    d.push(brush(arc(RCX, RCY, RX, RY, 181, 4, 26), { w: 6.2, shape: 'press', dry: 0.9, head: 0.7, seed: 61 }));
    d.push(brush(row(0.13, -0.93, 0.5, 14), { w: 1.7, shape: 'swell', dry: 0.7, seed: 62 }));
    // the sides and the base
    d.push(brush([[95, 252], [100, 284], [108, 318]], { w: 3.8, shape: 'press', dry: 1.1, fall: 0.25, seed: 63 }));
    d.push(brush([[265, 252], [261, 280], [255, 308]], { w: 2, shape: 'swell', dry: 0.62, seed: 64 }));
    d.push(brush([body(-0.99, 1), body(-0.5, 1.01), body(0, 1.01), body(0.5, 1), body(0.86, 1)], { w: 4.4, shape: 'press', dry: 0.7, head: 0.8, seed: 65 }));
    s += ink(d);
    svg('basket-front', [80, 236, 200, 104], s);
}

/* ================= the cat: one mass of sumi, seen from the side, no eyes ================= */
// A grown cat, asleep, in scale with its basket. It never sits up. What shows of it, in the end: a long low
// back barely above the rim; the tail let out over the rim at the far left, beside the blanket; and toward
// the light its head in true profile, laid nose-down ON the rim, the throat along it.
// The head is a quarter and a bit of the basket's width. It is drawn level, in its own frame (x toward the
// nose, y down, 50 long, 28 deep without the ear), and laid on the rim turned HEAD_TILT degrees nose-down
// about the point of its throat that rests there. The definition turns it back level while it travels.
// `head-in` lies behind the basket's front and comes forward from inside; once wholly above the rim it is
// cut for `head` (and `ear`), which lie over the rim and are laid down on it. All three share one box.
const HEAD_TILT = 9;
const HEAD_K = 1.32; // the head, as large as a grown cat's can be in this basket and still read on a phone
const THROAT = [237, 254]; // where the throat rests on the rim (canvas, before DY)
const HEADBOX = [184, 186, 96, 88];
{
    const TH = HEAD_TILT * Math.PI / 180, PL = [26, 27.5];
    /** From the head's own frame to the canvas. */
    const T = ([x, y, c]) => {
        const dx = (x - PL[0]) * HEAD_K, dy = (y - PL[1]) * HEAD_K;
        return [THROAT[0] + dx * Math.cos(TH) - dy * Math.sin(TH), THROAT[1] + dx * Math.sin(TH) + dy * Math.cos(TH), c];
    };
    /** Short dry hairs leaving the mass at a point toward an angle (degrees): fur, where the brush left the paper. */
    const fur = (list, seed, map = p => p, w = 1.6) => list.map(([x, y, a, l = 5], i) => {
        const q = a * Math.PI / 180;
        return brush([[x - Math.cos(q) * 2, y - Math.sin(q) * 2], [x + Math.cos(q) * l * 0.5, y + Math.sin(q) * l * 0.5], [x + Math.cos(q) * l, y + Math.sin(q) * l]].map(map), { w, shape: 'press', dry: 0.3, hairs: 3, seed: seed + i, step: 1.3 });
    });

    // The cat is drawn the way the room is: a brush line round bare, whiter paper, and a few flat patches of
    // colour laid a little off the line (a calico: tan on the crown and ear, grey on the back, tan at the tail's tip).
    const WHITE = '#FDFAF2', TAN = '#DFA76A', GREYC = '#6F665F', NOSEC = '#C98B77';
    const line = (pts, w, o = {}) => brush(pts, { w, shape: 'swell', dry: 1.1, fall: 0.25, step: 1.4, ...o });

    /* ---- the back: a long low arc, barely above the rim, ending in a dip before the head ---- */
    {
        const back = [[132, 255], [142, 248], [156, 243.4], [172, 242], [184, 244], [190, 249.4], [193, 256], [194, 280, 1], [130, 280, 1]];
        let s = flat(back, WHITE);
        s += flat([[151, 246.6], [162, 243.4], [175, 243], [185, 246], [188.5, 252.5], [180, 256.5], [166, 255], [154, 252.6]], GREYC, ' transform="translate(0.8 1)"');
        s += ink([line([[132, 255], [142, 248], [156, 243.4], [172, 242], [184, 244], [190, 249.4], [193, 256]], 2.5, { seed: 700 })]);
        svg('body', [124, 230, 76, 52], s);
    }

    /* ---- the head: a true profile, facing right ---- */
    const skull = [
        [0, 21], [0.2, 12], [3.5, 4.5], [11, 0.4], [22, -0.8],
        [23.6, -1.4], [26, -7, 1], [27.6, -0.8], // the far ear: a sliver behind the near one
        [30.5, 0.8], [35, 3.8], [38.4, 8], [40.6, 10.4], // the skull falls to a shallow stop
        [45, 11.7], [49.2, 13.4], [50.4, 15.4, 1], // a short straight nose
        [49.4, 18], [49.6, 21], [48.4, 24.2], [46.4, 27.2, 1], // a blunt muzzle over a small firm chin
        [40, 27.8], [27, 27.9], [14, 27.3], [5, 26.2], [0.6, 24.6],
    ].map(T);
    const nearEar = [[8.5, 3.5], [11, -4.5], [16.6, -14.5, 1], [21, -6.5], [25, 1.5], [17, 4.5]].map(T);
    let h = flat(skull, WHITE);
    // the tan patch: over the crown and down behind the cheek
    h += flat([[2.6, 12], [5.4, 5.6], [12, 2], [22, 1], [29.6, 2.6], [27, 8.4], [19, 11.4], [12.4, 17], [5, 19.6]].map(T), TAN);
    // the line: back of the skull, the crown, the stop, the nose; then the muzzle and chin; lighter under the jaw
    h += ink([
        line([[0.6, 23], [0.2, 12], [3.5, 4.5], [11, 0.4], [22, -0.8]].map(T), 2.4, { seed: 740 }),
        line([[23.4, -1], [26, -7], [27.8, -0.6]].map(T), 1.5, { seed: 741 }),
        line([[27.6, -0.4], [30.5, 0.8], [35, 3.8], [38.4, 8], [40.6, 10.4], [45, 11.7], [49.2, 13.4], [50.4, 15.4]].map(T), 2.3, { seed: 742 }),
        line([[50.2, 15.8], [49.4, 18], [49.6, 21], [48.4, 24.2], [46.2, 27.2]].map(T), 1.9, { seed: 743 }),
        line([[46.2, 27.4], [40, 27.9], [27, 28], [14, 27.4]].map(T), 1.5, { seed: 744, shape: 'press' }),
        // the mouth: one short line back from under the nose
        line([[49.4, 18.6], [46.6, 20], [44.4, 19.2]].map(T), 1.1, { seed: 745 }),
        // two whiskers
        line([[46, 21], [52, 20.4], [57.5, 21.6]].map(T), 0.9, { seed: 730, shape: 'press' }),
        line([[46, 23], [51.5, 24.6], [56, 27.6]].map(T), 0.9, { seed: 731, shape: 'press' }),
    ]);
    // the nose: a small warm tip
    h += flat([[48.2, 13.2], [50.6, 15.2], [48.6, 16.4]].map(T), NOSEC);
    const earArt = flat(nearEar, TAN) + ink([
        line([[8.5, 3.5], [11, -4.5], [16.6, -14.5]].map(T), 2.2, { seed: 720 }),
        line([[16.6, -14.5], [21, -6.5], [25, 1.5]].map(T), 2.2, { seed: 721 }),
        line([[14.6, -4.6], [16.4, -8.6]].map(p => p).concat([[17.4, -10.4]]).map(T), 1, { seed: 722 }),
    ]);
    svg('head', HEADBOX, h);
    svg('head-in', HEADBOX, h + earArt);
    // the near ear, on the head's box so that it travels with it; it flicks by a small turn of its own
    svg('ear', HEADBOX, earArt);
    // the neck: behind the basket's front, it goes with the head, so that a lifted head is not a floating one
    svg('neck', [194, 238, 54, 34], flat([[201, 248], [210, 243], [226, 245.5], [240, 252], [240, 262], [232, 270, 1], [196, 270, 1]], WHITE)
        + ink([line([[200, 249], [210, 243.4], [222, 244.6]], 2.2, { seed: 746 })]));
}

/* ---- the tail: rooted at the far left of the rim, draped over it, thick to thin, a tan tip ---- */
{
    const path = [[166, 249], [157, 246.6], [151, 252.6], [150, 266], [154, 279], [160, 290], [160, 301], [154, 309], [149, 316.5]];
    const o = { shape: 'press', dry: 1.1, fall: 0.1, head: 0.9, seed: 71 };
    svg('tail', [136, 238, 40, 86], ink(brush(path, { ...o, w: 12.5 })) + ink(brush(path, { ...o, w: 8.6 }), '#FDFAF2')
        + ink(brush(path.slice(5), { ...o, w: 5.4, head: 0.4 }), '#DFA76A'));
}

/* ================= the blanket ================= */
const at = (c, u) => c[Math.min(c.length - 1, Math.max(0, Math.round(u * (c.length - 1))))];
/** A blanket between two edges: persimmon bands (v ranges), cut and laid off the line. */
function bands(a, b, ranges, dx, dy) {
    const n = 30;
    let s = '';
    for (const [v0, v1] of ranges) {
        const up = [], dn = [];
        for (let i = 0; i <= n; i++) {
            const u = i / n;
            up.push(lerp(at(a, u), at(b, u), v0));
            dn.push(lerp(at(a, u), at(b, u), v1));
        }
        s += `<path d="M${[...up, ...dn.reverse()].map(p => P([p[0] + dx, p[1] + dy])).join('L')}Z" fill="${PERS}"/>`;
    }
    return s;
}
/** Knitting, tone on tone: staggered rows of short dashes in a darker persimmon, some dropped, none alike. */
function stitches(pt, us, vs, seed) {
    const r = rng(seed);
    const du = (us[1] - us[0]);
    let thin = '', thick = '';
    vs.forEach((v, j) => us.forEach(u => {
        if (r() < 0.26) return;
        const u0 = u + (j % 2) * du / 2 + (r() - 0.5) * du * 0.3, l = du * (0.34 + r() * 0.3);
        const a = pt(u0 - l / 2, v), b = pt(u0 + l / 2, v), m = mid(a, b);
        const seg = `M${P(a)}Q${f(m[0])} ${f(m[1] + 0.9 + r() * 0.6)} ${P(b)}`;
        if (r() < 0.5) thin += seg; else thick += seg;
    }));
    const st = w => `fill="none" stroke="${PERS_LINE}" stroke-width="${w}" stroke-linecap="round"`;
    return `<path d="${thin}" ${st(0.9)}/><path d="${thick}" ${st(1.5)}/>`;
}
const STRIPES = [[0, 0.6], [0.68, 0.78], [0.86, 1]];

/* ---- closed: pulled over the basket and tucked in all round ---- */
{
    const r = rng(33);
    // the lie of whatever sleeps under it: shoulders to the left, haunch to the right
    const top = [[87, 262], [85, 246], [90, 228], [100, 211], [114, 198], [132, 190], [150, 188], [166, 192], [180, 200], [198, 205], [218, 207], [235, 214], [246, 226], [250, 240], [246, 254]];
    const bot = [[87, 262], [108, 270], [140, 275.5], [180, 277], [210, 272.5], [232, 264.5], [246, 254]];
    const ct = curve(top, 3), cb = curve(bot, 3);
    let s = `<path d="M${[...ct, ...[...cb].reverse()].map(P).join('L')}Z" fill="${PAPER}"/>`;
    s += bands(ct, cb, STRIPES, 3.5, 3);
    const pt = (u, v) => { const p = lerp(at(ct, u), at(cb, u), v); return [p[0] + 3.5, p[1] + 3]; };
    s += stitches(pt, [0.4, 0.445, 0.49, 0.535, 0.58, 0.625, 0.67, 0.715], [0.16, 0.27, 0.38, 0.49], 44);
    const d = [];
    // one long stroke, set down at the left tuck, dry over the far side
    d.push(brush(top, { w: 5.4, shape: 'press', dry: 0.78, head: 0.6, seed: 81 }));
    // the tuck: a heavy scalloped edge, pulled in at each crease
    const cre = [0.07, 0.21, 0.37, 0.53, 0.69, 0.83, 0.94];
    const edge = [bot[0]];
    cre.forEach((u, i) => {
        const p = at(cb, u), pm = at(cb, u - (u - (cre[i - 1] ?? 0)) / 2);
        edge.push([pm[0], pm[1] + 2.4], [p[0], p[1] - 1.4]);
    });
    edge.push([240, 259.5], bot[bot.length - 1]);
    d.push(brush(edge, { w: 4.8, shape: 'swell', dry: 0.88, head: 0.8, seed: 82, step: 2 }));
    // the creases the tuck pulls: each of its own length and weight, fanning toward the sleeper
    const len = [0.14, 0.2, 0.15, 0.24, 0.14, 0.22, 0.12];
    cre.forEach((u, i) => {
        const p = at(cb, u), tt = at(ct, 0.5 + (u - 0.5) * 0.5);
        const e = lerp(p, tt, len[i]), m = lerp(p, e, 0.5), bow = (u < 0.5 ? -1 : 1) * (1 + r() * 2);
        d.push(brush([[p[0], p[1] - 1], [m[0] + bow, m[1]], e], { w: 1.4 + len[i] * 6 * (0.7 + 0.6 * r()), shape: 'press', dry: 0.5 + r() * 0.3, hairs: 3, seed: 90 + i }));
    });
    // the folds that fall from whatever holds the blanket up, down to the tuck
    d.push(brush([[126, 193], [119, 216], [115, 240], [114, 258]], { w: 2.8, shape: 'press', dry: 0.62, seed: 680 }));
    d.push(brush([[152, 190], [158, 212], [157, 236], [152, 256]], { w: 2.2, shape: 'press', dry: 0.55, hairs: 3, seed: 681 }));
    d.push(brush([[176, 200], [184, 221], [186, 242]], { w: 1.6, shape: 'press', dry: 0.5, hairs: 2, seed: 682 }));
    d.push(brush([[214, 208], [224, 228], [229, 250]], { w: 1.9, shape: 'press', dry: 0.55, hairs: 3, seed: 683 }));
    // a run of stitches along the pale stripe, and ribbing on a stretch of hem
    for (let i = 0; i < 8; i++) {
        const u = 0.34 + i * 0.047, p = lerp(at(ct, u), at(cb, u), 0.66), l = 2.4 + r();
        d.push(brush([[p[0] - 1.2, p[1] - l], [p[0], p[1]], [p[0] + 1.6, p[1] + l * 0.5]], { w: 1.2, shape: 'press', dry: 1.1, fall: 0.4, seed: 600 + i, step: 1.2 }));
    }
    // one corner got away from the tuck and hangs down the side, fringe and all
    const flap = [[89, 259, 1], [83, 276], [80, 296, 1], [100, 287], [121, 272, 1]];
    s = `<path d="${closed(flap)}" fill="${PAPER}"/>` + flat(shift(flap, 3, 2.5), PERS) + s;
    d.push(brush([[88, 262], [83, 278], [80, 296]], { w: 3.4, shape: 'press', dry: 0.75, seed: 660 }));
    d.push(brush([[80, 296], [99, 287.5], [119, 273.5]], { w: 2.2, shape: 'swell', dry: 0.7, seed: 661 }));
    for (let i = 0; i < 5; i++) {
        const p = lerp([82, 295.5], [112, 279], i / 4.4 + (r() - 0.5) * 0.04), l = 4.5 + r() * 3;
        d.push(brush([[p[0], p[1] + 0.5], [p[0] - 0.6, p[1] + l * 0.55], [p[0] - 1.8 + r() * 2, p[1] + l]], { w: 1.2 + r() * 0.8, shape: 'press', dry: 0.55, hairs: 2, seed: 670 + i, step: 1.3 }));
    }
    s += ink(d);
    svg('blanket', [76, 176, 210, 132], s);
}

/* ---- open: thrown back over the left of the rim, falling to the floor ---- */
{
    const r = rng(37);
    // the outer and the inner edge, both from the rim to the floor
    const outer = [[128, 245], [114, 238], [99, 238], [87, 250], [83, 274], [77, 298], [70, 320], [66, 338]];
    const inner = [[128, 245], [138, 258], [141, 274], [137, 294], [143, 314], [156, 330], [166, 341]];
    const hem = [[66, 338], [80, 346.5], [100, 345], [122, 349.5], [146, 346], [166, 341]];
    const co = curve(outer, 3), ci = curve(inner, 3), ch = curve(hem, 3);
    let s = `<path d="M${[...co, ...ch, ...[...ci].reverse()].map(P).join('L')}Z" fill="${PAPER}"/>`;
    s += `<path d="M${[...co.slice(2), ...ch, ...[...ci].reverse().slice(0, -2)].map(p => P([p[0] + 3.5, p[1] + 2.5])).join('L')}Z" fill="${PERS}"/>`;
    // the pale stripes run with the hem and break where the folds fall
    for (const [pts, hw] of [
        [[[68, 322], [82, 330], [97, 329.5], [103, 334], [122, 338], [143, 335.5], [157, 328.5]], 2.6],
        [[[72, 305], [85, 312], [98, 311.5], [103, 316], [122, 320], [138, 318], [146, 311]], 1.5],
    ]) {
        const c = curve(pts, 2.5), fr = frame(c);
        s += `<path d="${ribbon(c, fr.nrm, c.map(() => hw), c.map(() => hw))}" fill="${PAPER}" transform="translate(3.5 2.5)"/>`;
    }
    const pt = (u, v) => { const p = lerp(at(co, u), at(ci, u), v); return [p[0] + 3.5, p[1] + 2.5]; };
    s += stitches(pt, [0.24, 0.29, 0.34, 0.39, 0.44, 0.49], [0.3, 0.46, 0.62, 0.78], 45);
    const d = [];
    // the contour is said in pieces: over the rim, down the fall, along the hem; the gaps are the cloth's own
    d.push(brush(outer.slice(0, 4), { w: 4.2, shape: 'press', dry: 0.66, head: 0.6, seed: 201 }));
    d.push(brush([[83.5, 270], [78, 294], [71, 318], [67, 335]], { w: 2.8, shape: 'swell', dry: 0.62, seed: 206 }));
    d.push(brush(inner.slice(2, 6), { w: 1.9, shape: 'swell', dry: 0.7, hairs: 2, seed: 202 }));
    d.push(brush([[74, 343.5], [86, 346.5], [100, 345.5], [120, 349.5], [140, 347.5]], { w: 2.6, shape: 'swell', dry: 0.72, seed: 203 }));
    // two folds falling from the rim
    d.push(brush([[104, 241], [100, 266], [102, 298], [94, 328]], { w: 2.6, shape: 'press', dry: 0.6, seed: 204 }));
    d.push(brush([[124, 242], [121, 262], [125, 288]], { w: 1.6, shape: 'press', dry: 0.5, hairs: 2, seed: 205 }));
    // the fringe: in clumps, of no two lengths
    for (const [u, l, lean, wd] of [[0.06, 5, -2.5, 1.6], [0.13, 8.5, -1, 1.2], [0.17, 4, 0.5, 1], [0.31, 7, 1.5, 1.7], [0.42, 3.5, -0.5, 1.1], [0.47, 9, 0.8, 1.4], [0.63, 5.5, 2.2, 1.2], [0.78, 7.5, 0.4, 1.8], [0.83, 4, 2, 1], [0.95, 6, 3, 1.3]]) {
        const p = at(ch, u);
        d.push(brush([[p[0], p[1] + 0.5], [p[0] + lean * 0.3, p[1] + 0.5 + l * 0.5], [p[0] + lean, p[1] + 0.5 + l]], { w: wd, shape: 'press', dry: 0.5 + r() * 0.3, hairs: 2, seed: 640 + Math.round(u * 100), step: 1.3 }));
    }
    s += ink(d);
    svg('blanket-open', [62, 228, 112, 134], s);
}

/* ================= on the floor ================= */
/* ---- the bowl ---- */
{
    let s = flat([[30, 366], [22, 372], [50, 376], [92, 374], [98, 366]], GREY);
    s += `<path d="M${[...arc(64, 346, 27, 6.5, 180, 0, 16), [95, 364], ...arc(64, 364, 31, 4, 0, 180, 12), [33, 364]].map(P).join('L')}Z" fill="${PAPER}"/>`;
    s += `<ellipse cx="64" cy="346" rx="27" ry="6.5" fill="${PAPER}"/>`;
    // what is left of dinner: a cut of caramel, off the rim
    s += flat([[44, 347], [54, 343.5], [70, 343], [84, 346.5], [72, 351], [54, 350.5]], CARAMEL);
    const d = [];
    d.push(brush(arc(64, 346, 27, 6.5, 178, 8, 16), { w: 3.6, shape: 'press', dry: 0.82, seed: 211 }));
    d.push(brush(arc(64, 346, 27, 6.5, 200, 330, 12), { w: 1.4, shape: 'swell', dry: 0.7, hairs: 2, seed: 212 }));
    d.push(brush([[37, 349], [35, 356], [32.5, 364]], { w: 2.8, shape: 'press', dry: 1.1, fall: 0.3, seed: 213 }));
    d.push(brush([[91, 349], [93, 356], [95, 362]], { w: 1.5, shape: 'swell', dry: 0.7, hairs: 2, seed: 214 }));
    d.push(brush([[32, 365], [48, 368], [66, 368.6], [82, 367.5], [94, 365]], { w: 3, shape: 'grow', dry: 0.75, seed: 215 }));
    s += ink(d);
    svg('bowl', [18, 334, 86, 46], `<g transform="translate(-3 3)">${s}</g>`);
}

/* ---- the yarn: a ball, and the thread it leaves behind ---- */
const YARN = [268, 340];
{
    const [cx, cy] = YARN;
    let s = `<circle cx="${cx + 1.8}" cy="${cy + 1.6}" r="13.6" fill="${PERS}"/>`;
    const d = [];
    d.push(brush(arc(cx, cy, 14, 14, -150, 150, 26), { w: 3, shape: 'press', dry: 0.78, seed: 221 }));
    d.push(brush(arc(cx - 1, cy + 1, 13, 5.5, 200, 345, 10).map(([x, y]) => [cx + (x - cx) * 0.9 - (y - cy) * 0.42, cy + (x - cx) * 0.42 + (y - cy) * 0.9]), { w: 1.6, shape: 'swell', dry: 0.7, hairs: 2, seed: 222 }));
    d.push(brush(arc(cx + 1, cy, 12.5, 4, 190, 330, 10).map(([x, y]) => [cx + (x - cx) * 0.5 + (y - cy) * 0.86, cy - (x - cx) * 0.86 + (y - cy) * 0.5]), { w: 1.3, shape: 'press', dry: 0.6, hairs: 2, seed: 223 }));
    d.push(brush([[cx - 9, cy + 6], [cx - 2, cy + 3.5], [cx + 7, cy + 5.5]], { w: 1.1, shape: 'swell', dry: 1.1, seed: 224 }));
    s += ink(d);
    svg('yarn', [cx - 18, cy - 18, 36, 36], s);
    const th = brush([[236, 325], [240, 334], [252, 341], [266, 339], [280, 343.5], [292, 341], [301, 344]], { w: 1.5, shape: 'swell', dry: 0.9, hairs: 2, seed: 225, step: 1.6 });
    svg('strand', [234, 321, 70, 28], ink(th, PERS_LINE));
}

/* ---- dust in the light ---- */
function motes(name, seed, n, box) {
    const r = rng(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
        const x = box[0] + 6 + r() * (box[2] - 12), y = box[1] + 6 + r() * (box[3] - 12), q = 0.6 + r() * r() * 1.7;
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(q)}" fill="${r() < 0.7 ? GOLD : INK}" fill-opacity="${f(0.45 + r() * 0.5)}"/>`;
    }
    svg(name, box, s);
}
motes('motes-a', 5, 9, [224, 124, 104, 150]);
motes('motes-b', 12, 7, [238, 200, 96, 150]);

/* ---------- report ---------- */
for (const [k, b] of Object.entries(BOXES)) process.stdout.write(`${k}: [${b.join(', ')}]\n`);
