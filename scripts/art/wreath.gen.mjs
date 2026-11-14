// Generator for the "leaf wreath" autumn-gratitude wrapper art, drawn as a LINOCUT (reduction print):
// solid masses of ink with the light carved OUT of them. There are no outlines anywhere: a leaf is a
// mass, its veins are gouge cuts that show the ink printed before (mustard under brick under deep
// brown) or the bare paper, and where one mass lies on another a white line is cut round it. Stray
// "chatter" ridges are left in the cleared paper, and the ink is a little starved (flecks).
// Inks: mustard, brick, deep brown, a little olive, on warm off-white paper, in a dark warm room.
// No gradients, no filters.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas) and
// prints the boxes and pivots the definition needs.
// Run: node scripts/art/wreath.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'wreath');
if (!OUT.endsWith('wrappers/wreath')) throw new Error('out dir must be public/wrappers/wreath');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

const INK = {
    paper: '#EFE4CB',
    paperLt: '#F8F0DD',
    paperDk: '#D9CAA8',
    mustard: '#C2963B', // ochre
    brick: '#9C4C2C', // rust
    brown: '#231915', // brown-black
    olive: '#6A6B2B',
    twine: '#E7D6AA',
    ground: '#1A100B',
    groundLt: '#2B1B13',
    groundDk: '#0D0705',
};
const C = [180, 212]; // centre of the wreath
const SC = [180, 222]; // the still life and the twine are drawn round this point and set down round C
const TAU = Math.PI * 2;
const rad = d => (d * Math.PI) / 180;

/* ---------- small tools ---------- */
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
const P1 = n => String(Math.round(n * 10) / 10);
const pl = a => a.map(([x, y]) => `${P1(x)},${P1(y)}`).join(' ');
const area = p => p.reduce((s, a, i) => s + a[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * a[1], 0);
const wind = (p, hole = false) => ((area(p) > 0) !== hole ? p : [...p].reverse());
const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const polar = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
const pick = (R, a) => a[Math.floor(R() * a.length) % a.length];
const BOX = {};
function svg(name, box, inner, shift = false) {
    BOX[name] = box.map(v => Math.round(v));
    const [x, y, w, h] = BOX[name];
    if (shift) BOX[name] = [x + C[0] - SC[0], y + C[1] - SC[1], w, h];
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
function bbox(polys, pad = 3) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of polys) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad);
    return [x0, y0, Math.ceil(x1 + pad) - x0, Math.ceil(y1 + pad) - y0];
}
function inside(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i], b = poly[j];
        if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
}
/** Catmull-Rom through the control points. */
function cr(c, per = 5, closed = false) {
    const n = c.length, out = [];
    const g = i => (closed ? c[((i % n) + n) % n] : c[Math.max(0, Math.min(n - 1, i))]);
    const spans = closed ? n : n - 1;
    for (let i = 0; i < spans; i++) {
        const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
        for (let k = 0; k < per; k++) {
            const t = k / per, t2 = t * t, t3 = t2 * t;
            out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
        }
    }
    if (!closed) out.push(c[n - 1]);
    return out;
}
/** A band along the points, `w0` wide at the start and `w1` at the end. */
function ribbon(p, w0, w1 = w0) {
    const n = p.length, A = [], B = [];
    for (let i = 0; i < n; i++) {
        const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const l = Math.hypot(tx, ty) || 1;
        tx /= l; ty /= l;
        const hw = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
        A.push([p[i][0] - ty * hw, p[i][1] + tx * hw]);
        B.push([p[i][0] + ty * hw, p[i][1] - tx * hw]);
    }
    return [...A, ...B.reverse()];
}
/** One stroke of the V-gouge: enters sharp at `a`, swells, and stops blunt at `b`. */
function gouge(a, b, w, bow = 0) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const pt = (u, s) => { const o = (s * w) / 2 + bow * l * 4 * u * (1 - u); return [a[0] + dx * u + nx * o, a[1] + dy * u + ny * o]; };
    return [pt(0, 0), pt(0.72, 1), pt(1, 0.45), pt(1, -0.45), pt(0.72, -1)];
}
/** A grain or bud: pointed at both ends. */
function lens(a, b, w) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const pt = (u, s) => [a[0] + dx * u + nx * s * w / 2, a[1] + dy * u + ny * s * w / 2];
    return [pt(0, 0), pt(0.28, 0.82), pt(0.6, 1), pt(1, 0), pt(0.6, -1), pt(0.28, -0.82)];
}
const blob = (c, r, n, R, wob = 0.12, sy = 1) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU, k = 1 + (R ? (R() - 0.5) * 2 * wob : 0);
    return [c[0] + r * k * Math.cos(a), c[1] + r * k * sy * Math.sin(a)];
});
function resample(p, step) {
    const out = [p[0]];
    let carry = 0;
    for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], b = p[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        let s = step - carry;
        while (s <= l) { out.push([a[0] + ((b[0] - a[0]) * s) / l, a[1] + ((b[1] - a[1]) * s) / l]); s += step; }
        carry = l - (s - step);
    }
    return out;
}

/** One sheet of cuts: runs of one ink are gathered into a single path. */
class Art {
    constructor() { this.el = []; this.cur = null; }
    flush() { if (this.cur) { this.el.push(`<path d="${this.cur.d}" fill="${this.cur.col}"/>`); this.cur = null; } }
    fill(col, p) {
        const d = `M${pl(wind(p))}Z`;
        if (this.cur && this.cur.col === col) this.cur.d += d; else { this.flush(); this.cur = { col, d }; }
        return this;
    }
    fills(col, ps) { for (const p of ps) this.fill(col, p); return this; }
    /** A mass with a white line cut round it (the line is cut, not drawn: it takes the colour of what lies under). */
    mass(col, polys, line, w = 2) {
        this.flush();
        this.el.push(`<path d="${polys.map(p => `M${pl(wind(p))}Z`).join('')}" fill="${col}" stroke="${line}" stroke-width="${P1(w)}" stroke-linejoin="round"/>`);
        return this;
    }
    line(col, lines, w) {
        this.flush();
        this.el.push(`<path d="${lines.map(l => `M${pl(l)}`).join('')}" fill="none" stroke="${col}" stroke-width="${P1(w)}" stroke-linecap="round" stroke-linejoin="round"/>`);
        return this;
    }
    raw(s) { this.flush(); this.el.push(s); return this; }
    toString() { this.flush(); return this.el.join(''); }
}

/* ---------- leaves ---------- */
const KINDS = {
    beech: { a: 0.55, b: 0.85, n: 16, teeth: 0.07, wl: 0.54 },
    linden: { a: 0.3, b: 0.78, n: 16, teeth: 0.05, wl: 0.84, heart: 0.1 },
    aspen: { a: 0.36, b: 0.6, n: 16, teeth: 0.06, wl: 0.8, heart: 0.05 },
    lance: { a: 0.7, b: 0.9, n: 14, teeth: 0.08, wl: 0.27 },
    birch: { a: 0.3, b: 1.0, n: 14, teeth: 0.12, wl: 0.62 },
    oak: { a: 0.5, b: 0.55, n: 24, lobes: 4, wl: 0.56 },
    chestnut: { a: 0.5, b: 0.82, n: 22, teeth: 0.1, wl: 0.46 },
    mat: { a: 0.26, b: 0.66, n: 16, teeth: 0.05, wl: 1.0, heart: 0.12 },
    elm: { a: 0.5, b: 0.7, n: 18, teeth: 0.1, wl: 0.5 },
};
/** A leaf in its own space: stem end at the origin, tip at (L, 0). */
function geom(kind, L, R, bend) {
    if (kind === 'maple') return mapleGeom(L, R);
    const k = KINDS[kind];
    const W = L * k.wl * (0.9 + R() * 0.2);
    const tm = k.a / (k.a + k.b), fmax = tm ** k.a * (1 - tm) ** k.b;
    const asym = 0.86 + R() * 0.28;
    const ph = R() * 0.06;
    const hw = (t, s) => ((W / 2) * (t ** k.a * (1 - t) ** k.b)) / fmax * (k.lobes ? 0.5 + 0.5 * Math.sin(Math.PI * k.lobes * Math.min(1, t + (s > 0 ? ph : 0))) ** 2 : 1) * (s > 0 ? 1 : asym);
    const mid = t => [L * t, bend * L * 4 * t * (1 - t) + (geom.curl ?? 0) * L * t ** 4];
    const edge = (t, s, f = 1) => {
        const m = mid(t);
        let x = m[0];
        if (k.heart && t < 0.3) x -= k.heart * L * Math.sin(Math.PI * (t / 0.3)) * f;
        return [x, m[1] + s * hw(t, s) * f];
    };
    const side = s => {
        const out = [];
        for (let i = 1; i < k.n; i++) {
            const t = i / k.n;
            let f = 1 + (R() - 0.5) * 0.05;
            if (k.teeth && i % 2 === 1) f *= 1 - k.teeth * (0.6 + R());
            out.push(edge(t, s, f));
        }
        return out;
    };
    const up = side(1), dn = side(-1);
    const out = [mid(0), ...up, mid(1), ...dn.reverse()];
    const rib = [0.01, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 0.96].map(mid);
    const nv = L > 90 ? 9 : 4 + Math.floor(R() * 2.4);
    const ts = k.lobes ? [0.125, 0.375, 0.625, 0.86].map(t => t - 0.05) : Array.from({ length: nv }, (_, i) => 0.13 + (i / nv) * 0.66 + (R() - 0.5) * 0.04);
    const veins = [];
    for (const s of [1, -1]) for (const t of ts) {
        const t2 = Math.min(0.95, k.lobes ? t + 0.06 : t + 0.15 * (1 - t) + 0.05);
        veins.push([edge(t2, s, 0.8), mid(t + (s < 0 ? 0.03 : 0))]);
    }
    const lower = [];
    for (let i = 1; i <= 18; i++) lower.push(edge(0.04 + (i / 19) * 0.92, -1, 0.82));
    for (let i = 18; i >= 1; i--) lower.push(mid(0.04 + (i / 19) * 0.92));
    const hatch = [];
    for (let i = 0; i < ts.length - 1; i++) {
        const t = (ts[i] + ts[i + 1]) / 2 + 0.06;
        hatch.push([edge(t + 0.07, 1, 0.74), edge(t - 0.01, 1, 0.34)]);
    }
    const fleck = () => { const t = 0.15 + R() * 0.7, s = R() < 0.5 ? 1 : -1; return edge(t, s, 0.15 + R() * 0.6); };
    return { out, rib, veins, lower, hatch, fleck };
}
function mapleGeom(L, R) {
    const c = [0.4 * L, 0];
    const lobes = [[-104, 0.33], [-52, 0.5], [0, 0.6], [52, 0.5], [104, 0.33]].map(([a, l]) => [rad(a + (R() - 0.5) * 8), l * L * (0.92 + R() * 0.16)]);
    const out = [[0.3 * L, -0.03 * L], polar(c, 0.2 * L, rad(-150))];
    const veins = [];
    lobes.forEach(([a, l], i) => {
        const w = rad(15);
        out.push(polar(c, l * 0.66, a - w * 1.25), polar(c, l * 0.58, a - w * 0.72), polar(c, l * 0.84, a - w * 0.5), polar(c, l * 0.78, a - w * 0.22), polar(c, l, a), polar(c, l * 0.78, a + w * 0.22), polar(c, l * 0.84, a + w * 0.5), polar(c, l * 0.58, a + w * 0.72), polar(c, l * 0.66, a + w * 1.25));
        if (i < lobes.length - 1) out.push(polar(c, 0.2 * L * (0.9 + R() * 0.3), (a + lobes[i + 1][0]) / 2));
        if (i !== 2) veins.push([polar(c, l * 0.86, a), polar(c, 0.03 * L, a)]);
    });
    out.push(polar(c, 0.2 * L, rad(150)), [0.3 * L, 0.03 * L]);
    const rib = [[0.02 * L, 0], [0.2 * L, 0], c, polar(c, 0.3 * L, 0), polar(c, 0.5 * L, 0)];
    const lower = out.filter(p => p[1] < -0.01 * L).map(p => [c[0] + (p[0] - c[0]) * 0.8, p[1] * 0.8]);
    lower.push([c[0] + 0.5 * L * 0.8, 0], [0.32 * L, 0]);
    const hatch = [1, 3].map(i => [polar(c, lobes[i][1] * 0.6, lobes[i][0] + 0.2), polar(c, lobes[i][1] * 0.25, lobes[i][0] + 0.25)]);
    const fleck = () => polar(c, (0.05 + R() * 0.2) * L, R() * TAU);
    return { out, rib, veins, lower, hatch, fleck };
}
/**
 * Cut one leaf. o: kind, L, pos (stem end), ang, col (the mass), shade (a later ink over one half),
 * cut (what the veins show: the ink underneath, or paper), line (the white line round it; null = none).
 */
function leaf(A, o) {
    const R = rng(o.seed);
    const g = geom(o.kind, o.L, R, o.bend ?? (R() - 0.5) * 0.2);
    const T = p => { const q = rot(p, o.ang); return [q[0] + o.pos[0], q[1] + o.pos[1]]; };
    const s = o.L / 60;
    if (o.stem !== false) A.fill(o.stemCol ?? INK.brown, ribbon([[-0.2 * o.L, (R() - 0.5) * 5 * s], [-0.08 * o.L, 0], [0.04 * o.L, 0]].map(T), 0.8 * s + 0.4, 1.3 * s + 0.5));
    const out = g.out.map(T);
    if (o.under) A.fill(o.under, out.map(([x, y]) => [x + 1.4, y - 1.1])); // the ink before, a little off register
    if (o.line && (o.lw ?? 2) > 0) A.mass(o.col, [out], o.line, o.lw ?? 2); else A.fill(o.col, out);
    if (o.shade) A.fill(o.shade, g.lower.map(T));
    A.fill(o.cut, ribbon(g.rib.map(T), 1.5 * s + 0.5, 0.4 * s + 0.3));
    for (const [E, S] of g.veins) A.fill(o.cut, gouge(T(E), T(S), 1.0 * s + 0.45, (R() - 0.5) * 0.12));
    if (o.hatch !== false) for (const [E, S] of g.hatch) if (R() < 0.75) A.fill(o.cut2 ?? o.cut, gouge(T(E), T(S), 0.7 * s + 0.35, 0.03));
    for (let i = 0; i < (o.streaks ?? 3); i++) { // starved ink: the roller missed a streak
        const a = g.fleck(), l = o.L * (0.06 + R() * 0.1);
        A.fill(o.cut, gouge(T(a), T([a[0] + l, a[1] + (R() - 0.5) * l * 0.5]), 0.3 * s + 0.3, 0));
    }
    const nf = o.flecks ?? Math.round(3 + s * 4);
    for (let i = 0; i < nf; i++) { const p = T(g.fleck()); A.fill(o.cut, blob(p, 0.3 + R() * 0.45 * Math.sqrt(s), 3, R, 0.4)); }
    return out;
}
// The inks a leaf may be printed in: [mass, overprint on one half, what the cuts show].
const SCHEMES = [
    [INK.brick, INK.brown, INK.mustard],
    [INK.brick, null, INK.paper],
    [INK.olive, INK.brown, INK.paper],
    [INK.mustard, INK.brick, INK.paper],
    [INK.mustard, INK.olive, INK.paper],
    [INK.brown, null, INK.brick],
    [INK.brown, null, INK.mustard],
    [INK.olive, null, INK.paper],
    [INK.brown, null, INK.paper],
    [INK.olive, INK.brown, INK.mustard],
    [INK.mustard, null, INK.paper],
    [INK.brick, INK.brown, INK.paper],
];
const BEFORE = { [INK.brick]: INK.mustard, [INK.brown]: INK.brick, [INK.olive]: INK.mustard }; // the ink printed before each
const scheme = (i, extra = {}) => { const [col, shade, cut] = SCHEMES[i % SCHEMES.length]; return { col, shade, cut, ...extra }; };

/* ---------- wheat, berries, seed heads ---------- */
function wheat(A, base, ang, len, o) {
    const R = rng(o.seed), s = o.s ?? 1;
    const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]], bow = o.bow ?? 0;
    const P = u => { const q = u * len, off = bow * len * u * u; return [base[0] + d[0] * q + n[0] * off, base[1] + d[1] * q + n[1] * off]; };
    const earL = o.ear ?? len * 0.5, u0 = 1 - earL / len, m = o.grains ?? 6;
    const a2 = ang + Math.atan(2 * bow); // the ear follows the bent stalk
    A.fill(o.stalk ?? o.col, ribbon([0, 0.25, 0.5, 0.75, 1].map(k => P(k * (u0 + 0.05))), 1.5 * s, 1.1 * s));
    const grains = [], awns = [], shades = [];
    const gl = (earL / m) * 1.95, gw = gl * 0.52;
    for (let i = 0; i < m; i++) for (const sd of [-1, 1]) {
        const u = u0 + (1 - u0) * ((i + (sd > 0 ? 0.5 : 0)) / (m + 0.9));
        const p = P(u), ga = a2 + sd * (0.4 + R() * 0.12);
        const g0 = [p[0] + n[0] * sd * gw * 0.2, p[1] + n[1] * sd * gw * 0.2];
        const g1 = [g0[0] + Math.cos(ga) * gl, g0[1] + Math.sin(ga) * gl];
        grains.push(lens(g0, g1, gw));
        const al = gl * (1.2 + R() * 0.9), aa = ga - sd * 0.2;
        awns.push([g1, [g1[0] + Math.cos(aa) * al, g1[1] + Math.sin(aa) * al]]);
        const m0 = [g0[0] + (g1[0] - g0[0]) * 0.25 - Math.sin(ga) * sd * gw * 0.16, g0[1] + (g1[1] - g0[1]) * 0.25 + Math.cos(ga) * sd * gw * 0.16];
        const m1 = [g0[0] + (g1[0] - g0[0]) * 0.85 - Math.sin(ga) * sd * gw * 0.1, g0[1] + (g1[1] - g0[1]) * 0.85 + Math.cos(ga) * sd * gw * 0.1];
        shades.push(gouge(m1, m0, gw * 0.42, sd * 0.1));
    }
    const top = P(1 - 0.9 * gl / len), tip = [top[0] + Math.cos(a2) * gl, top[1] + Math.sin(a2) * gl];
    grains.push(lens(top, tip, gw));
    awns.push([tip, [tip[0] + Math.cos(a2) * gl * 1.6, tip[1] + Math.sin(a2) * gl * 1.6]]);
    A.line(o.col, awns, 0.6 * s);
    A.mass(o.col, grains, o.line, 1.0 * s);
    A.fills(o.shade, shades);
}
function berries(A, base, ang, len, o) {
    const R = rng(o.seed), s = o.s ?? 1;
    const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
    const P = (u, v) => [base[0] + d[0] * u * len + n[0] * v, base[1] + d[1] * u * len + n[1] * v];
    A.fill(INK.brown, ribbon([P(0, 0), P(0.5, 1.2 * s), P(1, 0)], 1.4 * s, 0.8 * s));
    const cs = [], hl = [], stalks = [];
    const m = o.n ?? 5;
    for (let i = 0; i < m; i++) {
        const u = 0.3 + (i / (m - 1)) * 0.72, v = (i % 2 ? 1 : -1) * (3.2 + R() * 2.6) * s * (i === m - 1 ? 0.2 : 1), r = (2.9 + R() * 1.5) * s;
        const c = P(u, v);
        stalks.push([P(u - 0.12, 0), c]);
        cs.push(blob(c, r, 10, R, 0.05));
        hl.push(gouge([c[0] - r * 0.62, c[1] + r * 0.05], [c[0] - r * 0.1, c[1] - r * 0.58], r * 0.42, -0.22));
    }
    A.line(INK.brown, stalks, 0.8 * s);
    A.mass(o.col ?? INK.brick, cs, o.line, 1.2 * s);
    A.fills(o.cut ?? INK.paper, hl);
}
function umbel(A, base, ang, len, o) {
    const R = rng(o.seed), s = o.s ?? 1, col = o.col ?? INK.brown;
    const tip = polar(base, len, ang);
    A.fill(col, ribbon([base, polar(base, len * 0.5, ang + 0.05), tip], 1.5 * s, 0.9 * s));
    const m = 7 + Math.floor(R() * 3), spokes = [], dots = [];
    for (let i = 0; i < m; i++) {
        const a = ang + (i / (m - 1) - 0.5) * 2.3 + (R() - 0.5) * 0.12, l = (9 + R() * 5) * s;
        const e = polar(tip, l, a);
        spokes.push([tip, e]);
        dots.push(blob(e, (1.5 + R() * 0.9) * s, 5, R, 0.25));
        if (R() < 0.6) { const e2 = polar(e, 3.4 * s, a + (R() - 0.5) * 1.6); spokes.push([e, e2]); dots.push(blob(e2, 1.1 * s, 4, R, 0.3)); }
    }
    A.line(col, spokes, 0.75 * s);
    A.fills(o.dot ?? col, dots);
}

/* ---------- the room: tone on tone, cut leaves in the dark ---------- */
const PAPER = [20, 50, 320, 424];
const BAND_Y = 322;
{
    const R = rng(11), A = new Art();
    A.raw(`<rect x="-12" y="-12" width="384" height="474" fill="${INK.ground}"/>`);
    const spots = [[40, 20, 0.5], [118, 34, -0.3], [205, 14, 0.4], [300, 30, 2.6], [338, 96, 1.2], [8, 120, 1.9], [4, 250, 1.3], [352, 230, 1.8], [10, 372, 0.6], [80, 428, -0.2], [170, 418, 0.3], [262, 436, -0.5], [340, 400, 2.4], [352, 318, 1.5]];
    spots.forEach(([x, y, a], i) => leaf(A, { kind: pick(R, ['oak', 'maple', 'beech', 'elm', 'linden', 'birch']), L: 40 + R() * 26, pos: [x, y], ang: a + (R() - 0.5) * 0.6, col: INK.groundLt, cut: INK.ground, stemCol: INK.groundLt, seed: 500 + i, flecks: 3 }));
    // stray gouge runs in the dark
    for (let i = 0; i < 46; i++) {
        const x = -6 + R() * 372, y = -6 + R() * 462;
        if (x > PAPER[0] - 4 && x < PAPER[0] + PAPER[2] + 4 && y > PAPER[1] - 4 && y < PAPER[1] + PAPER[3] + 4) continue;
        const a = 0.25 + (R() - 0.5) * 0.5, l = 6 + R() * 16;
        A.fill(i % 3 ? INK.groundLt : INK.groundDk, gouge([x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l], 0.9 + R() * 1.1, 0.02));
    }
    svg('ground', [-12, -12, 384, 474], A);
}

/* ---------- the sheet of paper, with the chatter the gouge left in the cleared ground ---------- */
{
    const R = rng(23), A = new Art();
    const [x, y, w, h] = PAPER;
    const edge = (dx, dy) => {
        const p = [];
        const run = (ax, ay, bx, by, n) => { for (let i = 0; i < n; i++) p.push([ax + ((bx - ax) * i) / n + (R() - 0.5) * 1.1 + dx, ay + ((by - ay) * i) / n + (R() - 0.5) * 1.1 + dy]); };
        run(x, y, x + w, y, 16); run(x + w, y, x + w, y + h, 18); run(x + w, y + h, x, y + h, 4); run(x, y + h, x, y, 18);
        return p;
    };
    A.fill(INK.groundDk, edge(3, 4.5));
    A.fill(INK.paper, edge(0, 0));
    // paper tooth
    for (let i = 0; i < 70; i++) {
        const px = x + 6 + R() * (w - 12), py = y + 6 + R() * (BAND_Y - y - 14), a = R() * TAU, l = 2 + R() * 5;
        A.fill(i % 2 ? INK.paperDk : INK.paperLt, gouge([px, py], [px + Math.cos(a) * l, py + Math.sin(a) * l], 0.5 + R() * 0.4, 0.1));
    }
    // chatter: short ridges of ink left standing where the ground was cleared round the wreath
    for (let i = 0; i < 170; i++) {
        const a = R() * TAU, r = 140 + R() ** 1.8 * 62;
        const p = polar(C, r, a);
        if (p[0] < x + 7 || p[0] > x + w - 7 || p[1] < y + 7 || p[1] > BAND_Y - 6) continue;
        const l = 2.2 + R() * 5.5, ta = a + Math.PI / 2 + (R() - 0.5) * 0.5;
        const q = [p[0] + Math.cos(ta) * l, p[1] + Math.sin(ta) * l];
        A.fill(pick(R, [INK.brown, INK.brown, INK.brick, INK.mustard]), gouge(p, q, 0.5 + R() * 0.8, (R() - 0.5) * 0.1));
    }
    // a printed band across the foot of the sheet: olive, with the brown-black dragged over it
    const band = [];
    for (let i = 0; i <= 26; i++) band.push([x + 1 + ((w - 2) * i) / 26, BAND_Y + (R() - 0.5) * 2.2 + Math.sin(i * 0.9) * 1.2]);
    band.push([x + w - 1, y + h - 1], [x + 1, y + h - 1]);
    A.fill(INK.olive, band);
    for (let i = 0; i < 60; i++) {
        const px = x + 6 + R() * (w - 50), py = BAND_Y + 5 + R() ** 1.4 * 110, l = 8 + R() * 34;
        A.fill(i % 3 === 0 ? INK.paper : INK.brown, gouge([px + l, py + (R() - 0.5) * 1.5], [px, py], i % 3 === 0 ? 0.5 + R() * 0.7 : 0.8 + R() * 1.6, (R() - 0.5) * 0.03));
    }
    for (let i = 0; i < 22; i++) { // the band's upper edge is chewed: ridges left above it
        const px = x + 8 + R() * (w - 20), l = 3 + R() * 8;
        A.fill(INK.olive, gouge([px, BAND_Y - 2.5 - R() * 5], [px + l, BAND_Y - 2.5 - R() * 5], 0.6 + R() * 0.8, 0));
    }
    svg('paper', [14, 44, 334, 434], A);
}

/* ---------- the still life inside: a block of deep brown with the harvest cut out of it ---------- */
const FLAME = [180, 187];
const TABLE_Y = 264;
{
    const R = rng(77), A = new Art(), G = new Art();
    const RD = 96;
    A.fill(INK.brown, blob(SC, RD, 84, R, 0.006));
    // starved ink in the block
    for (let i = 0; i < 70; i++) {
        const p = polar(SC, Math.sqrt(R()) * (RD - 4), R() * TAU);
        if (p[1] > TABLE_Y - 2) continue;
        A.fill(i % 4 ? INK.brick : INK.mustard, blob(p, 0.3 + R() * 0.4, 3, R, 0.4));
    }
    // table: the brick left under the brown
    const a0 = Math.asin((TABLE_Y - SC[1]) / (RD - 2));
    const table = [];
    for (let i = 0; i <= 30; i++) table.push(polar(SC, RD - 2 + (R() - 0.5) * 0.8, a0 + ((Math.PI - 2 * a0) * i) / 30));
    for (let i = 0; i <= 12; i++) table.push([SC[0] - 85 + (170 * i) / 12, TABLE_Y + (R() - 0.5) * 1]);
    A.fill(INK.brick, table);
    for (let i = 0; i < 26; i++) {
        const y = TABLE_Y + 4 + R() * 44, half = Math.sqrt(Math.max(0, (RD - 6) ** 2 - (y - SC[1]) ** 2));
        const l = 10 + R() * 34, x = SC[0] - half + R() * Math.max(0, 2 * half - l);
        if (2 * half < l + 4) continue;
        A.fill(INK.brown, gouge([x + l, y + (R() - 0.5)], [x, y], 0.9 + R() * 1.5, (R() - 0.5) * 0.03));
    }
    // cast shadows on the table, away from the candle
    A.fill(INK.brown, blob([126, 271], 34, 16, R, 0.06, 0.2));
    A.fill(INK.brown, blob([236, 270], 30, 16, R, 0.06, 0.2));

    // wheat sheaf standing behind the pumpkin
    const SH = [137, 262];
    [[-116, 86, -0.1, 1], [-104, 92, -0.06, 2], [-92, 88, 0.05, 3], [-80, 80, 0.1, 4], [-126, 70, -0.14, 5]].forEach(([deg, len, bow, sd]) =>
        wheat(A, SH, rad(deg), len, { col: INK.mustard, shade: INK.brick, line: INK.brown, seed: 60 + sd, bow, ear: 34, grains: 6, s: 1.05 }));
    A.fill(INK.twine, ribbon([[127, 237], [133, 234.5], [140, 235.5]], 3.2));
    A.line(INK.brown, [[[129.5, 235], [130.5, 238]], [[133, 233.5], [134, 236.5]], [[136.5, 234], [137.5, 237]]], 0.7);

    // candle and its saucer
    const CX = FLAME[0];
    A.mass(INK.brick, [blob([CX, 265], 19, 14, R, 0.03, 0.26)], INK.brown, 1.4);
    A.fill(INK.mustard, gouge([CX - 15, 263.5], [CX + 13, 262.6], 1.3, -0.04));
    const candle = [[CX - 8, 263], [CX - 8.3, 240], [CX - 7.8, 212], [CX - 6.5, 208.5], [CX - 3, 209.6], [CX + 1, 208.2], [CX + 5, 209.8], [CX + 7.6, 208.6], [CX + 8.2, 236], [CX + 8, 263]];
    A.mass(INK.paperDk, [candle], INK.brown, 1.2);
    A.fill(INK.mustard, [[CX + 2.5, 262], [CX + 2.8, 213], [CX + 7.4, 212], [CX + 7.6, 262]]);
    for (let i = 0; i < 7; i++) A.fill(INK.brick, gouge([CX + 7.4, 218 + i * 6.4], [CX + 3.4, 221 + i * 6.4], 1.1, 0.05));
    A.fill(INK.paperDk, [[CX - 7.8, 213], [CX - 8.6, 222], [CX - 6.6, 226], [CX - 5.4, 219], [CX - 5.6, 212]]); // a run of wax
    A.fill(INK.brown, ribbon([[CX, 209], [CX + 0.4, 204], [CX + 1.4, 201.5]], 1.3, 0.9));

    // pumpkin: mustard, brick printed over its shadow side, deep brown in the clefts
    const PK = [140, 246];
    const ribs = [[-28, 14, 21, 3.5, 2, 0.24], [28, 14, 21, 3.5, 0.1, 0.06], [-15, 15.5, 25.5, 1.2, 1.45, 0.2], [15, 15.5, 25.5, 1.2, 0.2, 0.08], [0, 14.5, 27.5, 0, 0.56, 0.13]];
    const ell = (cx, cy, rx, ry, n = 18) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * TAU) * (1 + (R() - 0.5) * 0.03), cy + ry * Math.sin((i / n) * TAU)]);
    const cres = (cx, cy, rx, ry, sh, n = 12) => {
        const o = [], inn = [];
        for (let i = 0; i <= n; i++) {
            const a = (0.5 + i / n) * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
            o.push([cx + rx * ca, cy + ry * sa]);
            inn.push([cx + Math.min(sh + rx * ca, rx * Math.abs(ca) * 0.96), cy + ry * sa * 0.985]);
        }
        return [...o, ...inn.reverse()];
    };
    // each rib is cut whole, the outer ones first: the middle rib stands in front
    for (const [dx, rx, ry, dy, kb, kd] of ribs) {
        const cx = PK[0] + dx, cy = PK[1] + dy;
        A.mass(INK.mustard, [ell(cx, cy, rx, ry)], INK.brick, 1.4);
        A.fill(INK.brick, cres(cx, cy, rx - 0.8, ry - 0.8, rx * kb));
        A.fill(INK.brown, cres(cx, cy, rx - 0.8, ry - 0.8, rx * kd));
        const low = []; // the underside, turned from the light
        for (let i = 0; i <= 8; i++) { const a = rad(22 + (136 * i) / 8); low.push([cx + (rx - 0.8) * Math.cos(a), cy + (ry - 0.8) * Math.sin(a)]); }
        for (let i = 8; i >= 0; i--) { const a = rad(22 + (136 * i) / 8); low.push([cx + (rx - 0.8) * Math.cos(a), cy + (ry - 0.8) * Math.sin(a) - 5 * Math.sin(rad((180 * i) / 8))]); }
        A.fill(INK.brown, low);
    }
    A.fill(INK.brown, blob([PK[0], PK[1] - 25.5], 7, 10, R, 0.08, 0.4));
    const stem = ribbon(cr([[PK[0] - 0.5, PK[1] - 24], [PK[0] + 0.5, PK[1] - 31], [PK[0] + 4.5, PK[1] - 36.5], [PK[0] + 9, PK[1] - 38]], 3), 6.2, 4.2);
    A.mass(INK.olive, [stem], INK.brown, 1.2);
    A.fill(INK.brown, ribbon(cr([[PK[0] - 2.4, PK[1] - 25], [PK[0] - 1.4, PK[1] - 31.5], [PK[0] + 3.4, PK[1] - 37.6]], 3), 1.8, 1.2));
    A.fill(INK.mustard, gouge([PK[0] + 7, PK[1] - 35.4], [PK[0] + 2.2, PK[1] - 27], 1.1, 0.12));

    // pears
    const pearCtl = [[0, 0], [8.5, -0.8], [14, -7], [14.6, -16], [11, -25.5], [7.2, -33], [6, -39.5], [3.4, -44.5], [0, -45.6], [-3.4, -44.4], [-5.8, -39.5], [-7.4, -33], [-11.6, -25.5], [-15, -16], [-14, -7], [-8.5, -0.8]];
    function pear(base, a, k, lit, sd) {
        const RR = rng(sd);
        const T = p => { const q = rot([p[0] * k, p[1] * k], a); return [q[0] + base[0], q[1] + base[1]]; };
        const out = cr(pearCtl, 3, true);
        A.mass(INK.mustard, [out.map(T)], INK.brown, 1.3);
        // lit = -1: the light is on its left, the olive lies on the right
        const sideP = (f, lo, hi) => { const o = out.filter(p => p[0] * lit < -0.5 && p[1] < lo && p[1] > hi); o.sort((p, q) => p[1] - q[1]); return [...o, ...[...o].reverse().map(p => [p[0] * f, p[1]])].map(T); };
        A.fill(INK.olive, sideP(0.2, -1.5, -42));
        A.fill(INK.brown, sideP(0.68, -1.5, -26));
        for (let i = 0; i < 9; i++) A.fill(INK.brown, blob(T([lit * (2 + RR() * 9), -5 - RR() * 26]), 0.42, 3, RR, 0.3));
        A.fill(INK.brown, ribbon([T([0, -44.5]), T([1.2, -49]), T([3.4, -52.5])], 1.7 * k, 1.1 * k));
        // lit edge, cut when the candle is lit
        for (let j = 0; j < 6; j++) { // lit side: a run of short parallel cuts
            const yy = -36 + j * 5.2, xx = [5.2, 6.6, 9.6, 11.6, 12, 10.6][j];
            G.fill(INK.paperLt, gouge(T([lit * (xx - 4.2), yy - 2.2]), T([lit * xx, yy]), 0.9, 0));
        }
    }
    pear([234, 268.5], rad(60), 0.82, 1, 7);
    pear([211, 269.5], rad(-4), 1, 1, 8);

    // on the table in front: an oak leaf, a sprig of berries
    leaf(A, { kind: 'oak', L: 36, pos: [128, 291], ang: rad(-12), col: INK.mustard, cut: INK.brick, line: INK.brown, lw: 1.2, seed: 91, stemCol: INK.mustard, flecks: 2 });
    berries(A, [184, 294], rad(-12), 30, { col: INK.mustard, cut: INK.paperLt, line: INK.brown, seed: 93, n: 5, s: 0.95 });
    svg('scene', [SC[0] - RD - 3, SC[1] - RD - 3, 2 * RD + 6, 2 * RD + 6], A, true);

    // the light: rays cut out of the brown round the flame; near it they reach the paper, further out
    // only the mustard, then only the brick (a reduction print's way of fading)
    const blocked = p => {
        const [x, y] = p;
        if (Math.hypot(x - SC[0], y - SC[1]) > RD - 9) return true;
        if (y > TABLE_Y - 3) return true;
        if (((x - PK[0]) / 45) ** 2 + ((y - PK[1]) / 31) ** 2 < 1) return true;
        if (Math.abs(x - PK[0] - 4) < 8 && y > PK[1] - 42 && y < PK[1]) return true;
        if (Math.abs(x - CX) < 11.5 && y > 202) return true;
        if (((x - 213) / 19) ** 2 + ((y - 245) / 29) ** 2 < 1) return true;
        if (((x - 244) / 23) ** 2 + ((y - 256) / 16) ** 2 < 1) return true;
        // the sheaf: a fan from its foot
        const dx = x - SH[0], dy = y - SH[1], d = Math.hypot(dx, dy), a = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (d < 100 && a > -140 && a < -66) return true;
        return false;
    };
    const RG = rng(31);
    for (let k = 0; k < 9; k++) {
        const r0 = 13 + k * 10.5, n = 9 + k * 5;
        const col = k < 2 ? INK.paperLt : k < 5 ? INK.mustard : INK.brick;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU + k * 0.37 + (RG() - 0.5) * 0.12, r = r0 + (RG() - 0.5) * 4, l = 5 + RG() * 5 + k * 0.4;
            const p = polar(FLAME, r, a), q = polar(FLAME, r + l, a + (RG() - 0.5) * 0.05);
            if (blocked(p) || blocked(q) || blocked(polar(FLAME, r + l + 2.5, a))) continue;
            G.fill(col, gouge(p, q, 1.2 + k * 0.16 + RG() * 0.7, (RG() - 0.5) * 0.06));
        }
    }
    // what the light picks out
    G.fill(INK.paperLt, [[CX - 7.4, 213], [CX - 6.2, 209.4], [CX - 3, 210.4], [CX + 1, 209], [CX + 2, 213.5], [CX + 1.6, 232], [CX - 7.4, 232]]);
    G.fill(INK.paperLt, gouge([CX - 6.2, 258], [CX - 6.4, 235], 1.6, 0));
    for (const [dx, rx, ry, dy, n] of [[0, 14.5, 27.5, 0, 6], [15, 15.5, 25.5, 1.2, 7], [28, 14, 21, 3.5, 5]]) for (let i = 0; i < n; i++) {
        // hatching across the lit ribs: short straight cuts, all at one slant
        const a = rad(-72 + i * 15), q = [PK[0] + dx + rx * 0.6 * Math.cos(a), PK[1] + dy + ry * 0.62 * Math.sin(a)], l = 4.4 + (i % 2) * 1.4;
        G.fill(INK.paperLt, gouge([q[0] - l * 0.42, q[1] + l * 0.9], q, 0.95, 0));
    }
    G.fill(INK.mustard, gouge([SC[0] - 80, TABLE_Y + 0.4], [SC[0] - 36, TABLE_Y + 0.2], 1.3, 0));
    G.fill(INK.mustard, gouge([SC[0] + 81, TABLE_Y + 0.5], [SC[0] + 64, TABLE_Y + 0.3], 1.3, 0));
    svg('glow', [SC[0] - RD - 3, SC[1] - RD - 3, 2 * RD + 6, 2 * RD + 6], G, true);

    // the flame
    const F = new Art();
    const fl = cr([[CX + 1.2, 202.5], [CX - 4.4, 196], [CX - 3.6, 188], [CX + 0.6, 177.5], [CX + 4.6, 188.5], [CX + 5.4, 196.5]], 4, true);
    F.mass(INK.mustard, [fl], INK.brown, 1.1);
    F.fill(INK.brick, gouge([CX - 1.6, 182.5], [CX - 3.3, 195.5], 1.5, -0.1));
    F.fill(INK.paperLt, cr([[CX + 1.2, 201], [CX - 1.6, 196], [CX + 0.8, 187], [CX + 3.2, 196]], 3, true));
    svg('flame', [CX - 11, 172, 24, 34], F, true);
}

/* ---------- the ring ---------- */
const KIND_CYCLE = ['oak', 'beech', 'maple', 'elm', 'linden', 'lance', 'birch', 'oak', 'aspen', 'beech', 'maple', 'elm'];
function ringLeaf(A, R, i, th, r, L, tiltOut, kindI, schemeI) {
    const dir = th + Math.PI / 2 - tiltOut;
    const c = polar(C, r, th);
    const pos = [c[0] - Math.cos(dir) * L * 0.5, c[1] - Math.sin(dir) * L * 0.5];
    const sc = scheme(schemeI);
    // the cut round a leaf is never the same twice: wide, narrow, or none at all (the masses touch and overprint)
    const lw = [0, 2.6, 1.1, 0, 1.7, 0.8, 2.2, 0, 1.3][Math.floor(R() * 9)];
    return leaf(A, { kind: KIND_CYCLE[kindI % KIND_CYCLE.length], L, pos, ang: dir, ...sc, line: INK.paper, lw, under: R() < 0.5 ? BEFORE[sc.col] : undefined, seed: 1000 + i * 7, flecks: 3, streaks: 2, hatch: L > 46 });
}
{
    // A: the bound twigs and the big leaves
    const R = rng(5), A = new Art();
    const outer = blob(C, 122, 60, R, 0.025), inner = blob(C, 79, 48, R, 0.02);
    A.raw(`<path d="M${pl(wind(outer))}ZM${pl(wind(inner, true))}Z" fill="${INK.brown}"/>`);
    for (let i = 0; i < 40; i++) {
        const r = 82 + R() * 38, a = R() * TAU, span = 0.25 + R() * 0.5, pts = [];
        for (let k = 0; k <= 4; k++) pts.push(polar(C, r + Math.sin(k * 1.9 + i) * 1.6, a + (span * k) / 4));
        A.fill(pick(R, [INK.brick, INK.mustard, INK.brick, INK.paper]), ribbon(pts, 0.3, 0.9 + R() * 0.9));
    }
    const N = 23, idx = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    for (const i of idx) {
        const outerRow = i % 2 === 0;
        const th = ((i + (R() - 0.5) * 0.5) / N) * TAU;
        const r = outerRow ? 116 + R() * 8 : 97 + R() * 8;
        const L = outerRow ? 46 + R() * 14 : 44 + R() * 12;
        const tilt = outerRow ? rad(18 + R() * 30) : rad(-8 + R() * 22 - 12);
        ringLeaf(A, R, i, th, r, L, tilt, i * 5 + Math.floor(R() * 3), i * 3 + Math.floor(R() * 2));
    }
    svg('ring-a', [C[0] - 160, C[1] - 160, 320, 320], A);
}
{
    // B: the smaller leaves over them, wheat ears, seed heads, berries; an inner fringe that shuts the rim
    const R = rng(9), A = new Art(), X = new Art(); // X: the things tucked in last (wheat, seed heads, berries)
    const N = 9;
    for (let i = 0; i < N; i++) { // inner fringe
        const th = ((i + 0.3 + (R() - 0.5) * 0.4) / N) * TAU;
        ringLeaf(A, R, 100 + i, th, 91 + R() * 4, 27 + R() * 7, rad(-8 - R() * 16), i * 7 + 3, i * 4 + 1);
    }
    const M = 15;
    for (let i = 0; i < M; i++) {
        const th = ((i + 0.6 + (R() - 0.5) * 0.5) / M) * TAU;
        if (i % 5 === 2) {
            const b = polar(C, 96 + R() * 6, th);
            wheat(X, b, th + Math.PI / 2 - rad(32 + R() * 22), 52 + R() * 8, { col: INK.mustard, shade: INK.brick, line: INK.paper, seed: 300 + i, bow: (R() - 0.5) * 0.25, ear: 31 + R() * 4, grains: 6, s: 1.3 });
            wheat(X, polar(C, 102 + R() * 6, th + 0.12), th + Math.PI / 2 - rad(8 + R() * 14), 48 + R() * 8, { col: INK.mustard, shade: INK.brown, line: INK.paper, seed: 320 + i, bow: (R() - 0.5) * 0.2, ear: 29 + R() * 4, grains: 6, s: 1.3 });
        } else if (i % 5 === 4) {
            umbel(X, polar(C, 112, th), th + Math.PI / 2 - rad(50 + R() * 20), 24 + R() * 8, { seed: 340 + i, col: INK.brown, dot: i % 2 ? INK.brick : INK.brown, s: 1 });
            ringLeaf(A, R, 200 + i, th + 0.1, 108 + R() * 8, 36 + R() * 10, rad(R() * 24), i * 5 + 1, i * 3 + 2);
        } else {
            ringLeaf(A, R, 200 + i, th, 104 + R() * 14, 34 + R() * 14, rad(-10 + R() * 40), i * 5 + 2, i * 3 + 5);
        }
    }
    [0.35, 1.5, 2.75, 3.9, 5.2].forEach((th, i) => berries(X, polar(C, 100 + R() * 16, th), th + Math.PI / 2 - rad(-10 + R() * 50), 22 + R() * 6, { col: i % 2 ? INK.brick : INK.brick, cut: i % 2 ? INK.paper : INK.mustard, line: INK.paper, seed: 360 + i, n: 4 + (i % 3), s: 1.05 }));
    svg('ring-b', [C[0] - 160, C[1] - 160, 320, 320], A);
    svg('ring-c', [C[0] - 160, C[1] - 160, 320, 320], X);
}

/* ---------- the iris: long pointed dry leaves laid as a pinwheel, stems under the ring, tips wound round the centre ---------- */
const RP = +(process.env.WREATH_RP ?? 106);
const blades = [];
{
    const NB = +(process.env.WREATH_N ?? 9), PHI = rad(+(process.env.WREATH_PHI ?? 12)), LB = +(process.env.WREATH_L ?? 130);
    KINDS.chestnut.wl = +(process.env.WREATH_W ?? 0.54);
    // rust, ochre and brown-black by turns, each leaf one flat ink (the olive stays out in the ring)
    const inks = [
        { col: INK.brick, shade: null, cut: INK.paper }, { col: INK.mustard, shade: null, cut: INK.paper }, { col: INK.brown, shade: null, cut: INK.mustard },
        { col: INK.brick, shade: null, cut: INK.mustard }, { col: INK.mustard, shade: null, cut: INK.paperLt }, { col: INK.brown, shade: null, cut: INK.brick },
        { col: INK.brick, shade: null, cut: INK.paper }, { col: INK.mustard, shade: null, cut: INK.paper }, { col: INK.brown, shade: null, cut: INK.mustard },
    ];
    for (let i = 0; i < NB; i++) {
        const th = rad(-130) + (i / NB) * TAU, P = polar(C, RP, th), A = new Art();
        geom.curl = [0, 0.05, 0, -0.04, 0, 0, 0.06, 0, 0][i % 9]; // a tip or two curled dry
        const L = LB * [1, 0.96, 1.03, 0.98, 1.02, 0.95, 1, 1.03, 0.97][i % 9];
        const out = leaf(A, { kind: 'chestnut', L, pos: P, ang: th + Math.PI + PHI, ...inks[(i + 1) % 9], line: INK.paper, lw: [2.4, 1.6, 2.6, 1.8, 2.2, 2.6, 1.6, 2.2, 2][i % 9], seed: 700 + i * 13, stem: false, bend: [0.03, -0.02, 0.04, 0.02, -0.03, 0.03, 0.02, -0.02, 0.04][i % 9], flecks: 10, streaks: 5 });
        geom.curl = 0;
        const box = bbox([out], 4), name = `blade-${i + 1}`;
        svg(name, box, A);
        blades.push({ name, th, out, origin: [(P[0] - box[0]) / box[2], (P[1] - box[1]) / box[3]] });
    }
    let miss = 0, tot = 0, rmin = 99;
    for (let x = -80; x <= 80; x += 2) for (let y = -80; y <= 80; y += 2) {
        if (Math.hypot(x, y) > 79) continue;
        tot++;
        if (!blades.some(b => inside([C[0] + x, C[1] + y], b.out))) { miss++; rmin = Math.min(rmin, Math.hypot(x, y)); }
    }
    console.log(`iris: ${((100 * miss) / tot).toFixed(1)}% of the middle (r<79) is left open${miss ? ` (nearest gap at r=${rmin.toFixed(0)})` : ''}`);
}

/* ---------- leaves that come away and fall ---------- */
const falls = [];
{
    const spec = [
        ['maple', 46, -142, 118, 0.4, 3], ['oak', 42, -96, 124, -0.3, 1], ['birch', 32, -52, 126, 0.2, 10]
    ];
    spec.forEach(([kind, L, deg, r, tw, sc], i) => {
        const c = polar(C, r, rad(deg)), ang = rad(deg) + Math.PI / 2 - tw, A = new Art();
        const pos = [c[0] - Math.cos(ang) * L * 0.5, c[1] - Math.sin(ang) * L * 0.5];
        const out = leaf(A, { kind, L, pos, ang, ...scheme(sc), line: INK.paper, lw: [2.2, 1.2, 1.8, 2.4, 1][i], under: BEFORE[scheme(sc).col], seed: 900 + i * 17 });
        const stemEnd = [pos[0] - Math.cos(ang) * L * 0.22, pos[1] - Math.sin(ang) * L * 0.22];
        const box = bbox([out, [stemEnd]], 4);
        svg(`fall-${i + 1}`, box, A);
        falls.push({ i, c: c.map(Math.round) });
    });
}

/* ---------- the twine: a solid mass of brown-black, its strands carved out of it ---------- */
/** A length of twine: one mass, a white line cut round it, the twist cut across it. */
function twine(A, ctl, w0, w1 = w0, per = 6) {
    const p = resample(cr(ctl, per), 2.4), n = p.length;
    A.mass(INK.brown, [ribbon(p, w0, w1)], INK.paper, 2);
    for (let i = 2; i < n - 1; i++) {
        const a = p[i - 1], b = p[i + 1];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const l = Math.hypot(tx, ty) || 1;
        tx /= l; ty /= l;
        const h = (w0 + ((w1 - w0) * i) / (n - 1)) * 0.36;
        A.fill(INK.paper, gouge([p[i][0] - ty * h - tx * 1.5, p[i][1] + tx * h - ty * 1.5], [p[i][0] + ty * h + tx * 1.5, p[i][1] - tx * h + ty * 1.5], 0.95, 0.06));
    }
    return p;
}
const KNOT = [180, 336];
{
    // the binding: one collar of wound twine round the ring, not separate strands
    const A = new Art(), R = rng(4);
    const collar = cr([[166, 297], [180, 294.5], [194, 297], [197.5, 315], [198, 348], [194.5, 366], [180, 368.5], [165.5, 366], [162, 348], [162.5, 315]], 3, true);
    A.mass(INK.brown, [collar], INK.paper, 2.2);
    for (let i = 0; i < 12; i++) { // the turns of the twine, cut slantwise
        const yy = 301 + i * 5.6, half = 15.5 - Math.abs(i - 5.5) * 0.25;
        A.fill(INK.paper, gouge([180 - half, yy + 2.6 + (R() - 0.5)], [180 + half, yy - 2.2 + (R() - 0.5)], 1.15, 0.05));
    }
    svg('twine', [156, 288, 48, 86], A, true);
}
{
    const A = new Art();
    twine(A, [KNOT, [160, 319], [136, 308], [120, 321], [129, 340], [157, 345], KNOT], 8.5);
    svg('loop-l', [110, 298, 76, 56], A, true);
    const B = new Art();
    twine(B, [KNOT, [201, 320], [226, 310], [241, 324], [231, 341], [204, 346], KNOT], 8.5);
    svg('loop-r', [174, 298, 76, 56], B, true);
    const K = new Art(), R = rng(3);
    for (const ctl of [[KNOT, [173, 356], [166, 378], [157, 400]], [KNOT, [188, 357], [196, 378], [206, 397]]]) {
        const t = twine(K, ctl, 8, 6.5);
        const e = t[t.length - 1], b = t[t.length - 3], a = Math.atan2(e[1] - b[1], e[0] - b[0]);
        for (const d of [-0.45, 0, 0.45]) K.fill(INK.brown, gouge(polar(e, 7, a + d), polar(e, -1, a + d), 2, 0)); // frayed end
    }
    K.mass(INK.brown, [blob(KNOT, 9, 12, R, 0.08, 0.84)], INK.paper, 2);
    for (const dx of [-4.6, -0.6, 3.6]) K.fill(INK.paper, gouge([KNOT[0] + dx - 1.2, KNOT[1] + 5], [KNOT[0] + dx + 1.6, KNOT[1] - 5], 1.1, 0.06));
    svg('knot', [142, 322, 78, 92], K, true);
}

/* ---------- report ---------- */
let worst = 0;
for (const f of readdirSync(OUT)) if (f.endsWith('.svg')) { const s = statSync(join(OUT, f)).size; worst = Math.max(worst, s); if (s > 50000) console.log(`LARGE ${f} ${s}`); }
console.log(`largest svg ${worst} bytes; ${Object.keys(BOX).length} layers`);
console.log('boxes', JSON.stringify(BOX));
console.log(blades.map(b => `    ['${b.name}', [${BOX[b.name].join(', ')}], [${b.origin.map(v => Math.round(v * 1000) / 1000).join(', ')}], ${Math.round((b.th * 180) / Math.PI)}],`).join('\n'));
console.log(falls.map(f => `        { id: 'fall-${f.i + 1}', art: 'fall-${f.i + 1}.svg', box: [${BOX['fall-' + (f.i + 1)].join(', ')}], depth: 0.6 }, // centre ${f.c}`).join('\n'));
console.log('falls', JSON.stringify(falls));
