// Generator for the "dó paper" Tết wrapper art, drawn as a Vietnamese folk woodblock print
// (Đông Hồ spirit): flat colour blocks printed a little off register from a bold black key
// block, wood grain and ink starvation inside the colours, paper fibres and the "điệp" shell
// sheen of the paper. Six inks: dó ivory, soot black, brick red, pine-leaf green, indigo,
// turmeric yellow. No gradients, no filters, no shadows.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/dopaper.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'dopaper');
if (!OUT.endsWith('wrappers/dopaper')) throw new Error('out dir must be public/wrappers/dopaper');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

const INK = {
    paper: '#EBDFC2', // dó ivory
    paperLt: '#F6EEDA',
    paperDk: '#D3C29B',
    fibre: '#BFAA7C',
    soot: '#1C1815',
    red: '#B4412A', // brick
    green: '#3D6A48', // pine leaf
    indigo: '#2A3A6B',
    yellow: '#D9A22E', // turmeric
    ground: '#261911', // soot-brown, like old lacquer
    groundLt: '#38261A',
    groundDk: '#0F0906',
    shell: '#FFFEF6', // điệp flecks
};

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
const rad = d => (d * Math.PI) / 180;
const BOX = {};
function svg(name, box, inner) {
    BOX[name] = box;
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}

/** Catmull-Rom through the control points, `per` samples a span. */
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
const area = p => p.reduce((s, a, i) => s + a[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * a[1], 0);
/** A closed shape, always wound the same way (so shapes in one path add up); `hole` winds it the other way. */
const wind = (p, hole = false) => ((area(p) > 0) !== hole ? p : [...p].reverse());
const circle = (cx, cy, r, n = 10, wob = 0, R = null) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI, k = 1 + (R ? (R() - 0.5) * 2 * wob : 0);
    return [cx + r * k * Math.cos(a), cy + r * k * Math.sin(a)];
});
const move = (p, dx, dy) => p.map(([x, y]) => [x + dx, y + dy]);

/** Point and frame along a polyline at arclength fraction u. */
function along(p) {
    const L = [0];
    for (let i = 1; i < p.length; i++) L.push(L[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const total = L[L.length - 1];
    return u => {
        const s = Math.max(0, Math.min(1, u)) * total;
        let i = 1;
        while (i < p.length - 1 && L[i] < s) i++;
        const k = (s - L[i - 1]) / (L[i] - L[i - 1] || 1);
        const a = p[i - 1], b = p[i];
        const a0 = p[Math.max(0, i - 2)], b1 = p[Math.min(p.length - 1, i + 1)];
        let tx = (b[0] - a[0]) * 0.6 + (b1[0] - a0[0]) * 0.2, ty = (b[1] - a[1]) * 0.6 + (b1[1] - a0[1]) * 0.2;
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl; ty /= tl;
        return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], t: [tx, ty], n: [-ty, tx], total };
    };
}

/**
 * A carved line: a ribbon along the points, `w` wide in the middle, thinning to `w*t0` / `w*t1`
 * at its ends, its edges a little unsteady like a knife cut.
 */
function ribbon(p, w, { t0 = 0.4, t1 = 0.4, wob = 0.14, R = null, w0 = null } = {}) {
    const at = along(p), n = p.length, A = [], B = [];
    for (let i = 0; i < n; i++) {
        const u = i / (n - 1), f = at(u);
        const k = Math.min(u < 0.3 ? t0 + (1 - t0) * (u / 0.3) : 1, u > 0.7 ? t1 + (1 - t1) * ((1 - u) / 0.3) : 1);
        const base = w0 === null ? w : w0 + (w - w0) * u; // w0: a taper from w0 to w along the whole line
        const hw = (base / 2) * k * (1 + (R ? (R() - 0.5) * 2 * wob : 0));
        A.push([f.p[0] + f.n[0] * hw, f.p[1] + f.n[1] * hw]);
        B.push([f.p[0] - f.n[0] * hw, f.p[1] - f.n[1] * hw]);
    }
    return [...A, ...B.reverse()];
}

/** One printing block: flat shapes of one ink, gathered into a single path. */
class Block {
    constructor() { this.shapes = []; this.lines = {}; }
    fill(p) { this.shapes.push(wind(p)); return this; }
    hole(p) { this.shapes.push(wind(p, true)); return this; }
    /** A plain stroked line, for the smallest cuts. */
    line(p, w = 1) { (this.lines[w] ??= []).push(p); return this; }
    path() { return this.shapes.map(s => `M${pl(s)}Z`).join(''); }
    draw(col) {
        let s = this.shapes.length ? `<path d="${this.path()}" fill="${col}"/>` : '';
        for (const [w, ls] of Object.entries(this.lines)) s += `<path d="${ls.map(l => `M${pl(l)}`).join('')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
        return s;
    }
}
// K2 is key work that lies over the fruit; X gathers the fruit shapes that the first key block is cut away under;
// H is a light cut on the dark ground.
const plate = () => ({ Y: new Block(), R: new Block(), G: new Block(), I: new Block(), W: new Block(), K: new Block(), K2: new Block(), X: new Block(), H: new Block() });
/** Move one plate's cuts into another through a point map (line weights scale with `k`). */
function merge(into, from, fn, k = 1) {
    for (const key of Object.keys(from)) {
        for (const sh of from[key].shapes) into[key].shapes.push(sh.map(fn));
        for (const [w, ls] of Object.entries(from[key].lines)) for (const l of ls) into[key].line(l.map(fn), Math.round(w * k * 100) / 100);
    }
}

/** Wood grain: runs of nearly parallel wavering lines, broken where the ink took. One path `d`. */
function grain(box, seed, { gap = [2.4, 6.5], tilt = 0, amp = 3, lam = 80, step = 13, run = [14, 110], rest = [10, 70] } = {}) {
    const r = rng(seed), [x, y, w, h] = box, ph = r() * 6.28, ph2 = r() * 6.28;
    let d = '';
    for (let yy = y - 12; yy < y + h + 12; yy += gap[0] + r() * (gap[1] - gap[0])) {
        let xx = x - r() * 40;
        while (xx < x + w) {
            const len = run[0] + r() * r() * (run[1] - run[0]);
            const q = [];
            for (let s = xx; s <= xx + len; s += step) q.push([s, yy + tilt * (s - x) + amp * Math.sin(s / lam + ph + yy * 0.012) + amp * 0.35 * Math.sin(s / 21 + ph2 + yy * 0.08)]);
            if (q.length > 1) d += `M${pl(q)}`;
            xx += len + rest[0] + r() * (rest[1] - rest[0]);
        }
    }
    return d;
}
/** Starved specks: tiny angular nicks. One path `d`. */
function specks(box, seed, n, max = 1.3) {
    const r = rng(seed), [x, y, w, h] = box;
    let d = '';
    for (let i = 0; i < n; i++) {
        const a = 0.25 + r() * r() * max, b = 0.2 + r() * 0.5;
        d += `M${P1(x + r() * w)},${P1(y + r() * h)}l${P1(a)},${P1((r() - 0.5) * 0.8)}l${P1(-a * 0.4)},${P1(b)}z`;
    }
    return d;
}
/** A mask that starves a block of ink: the grain of its wood, and specks. */
function starve(id, box, seed, o = {}) {
    const [x, y, w, h] = box;
    return `<mask id="${id}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFFFFF"/>` +
        `<path d="${grain(box, seed, o)}" fill="none" stroke="#000000" stroke-width="${o.sw ?? 0.55}" stroke-linecap="round"/>` +
        (o.coarse === false ? '' : `<path d="${grain(box, seed + 7, { ...o, gap: [7, 16], run: [8, 46], rest: [30, 140] })}" fill="none" stroke="#000000" stroke-width="${(o.sw ?? 0.55) * 1.9}" stroke-linecap="round"/>`) +
        `<path d="${specks(box, seed + 3, o.specks ?? 320)}" fill="#000000"/>${o.extra ?? ''}</mask>`;
}
/** Paper fibres: short curved hairs, dark and light. */
function fibres(box, seed, n) {
    const r = rng(seed), [x, y, w, h] = box;
    const hairs = k => {
        let d = '';
        for (let i = 0; i < k; i++) {
            const a = r() * 6.28, len = 4 + r() * r() * 22, bend = (r() - 0.5) * len * 0.7;
            const dx = Math.cos(a) * len, dy = Math.sin(a) * len;
            d += `M${P1(x + r() * w)},${P1(y + r() * h)}q${P1(dx / 2 - Math.sin(a) * bend)},${P1(dy / 2 + Math.cos(a) * bend)} ${P1(dx)},${P1(dy)}`;
        }
        return d;
    };
    return `<path d="${hairs(n)}" fill="none" stroke="${INK.fibre}" stroke-width="0.45" stroke-linecap="round" opacity="0.7"/>` +
        `<path d="${hairs(Math.round(n * 0.7))}" fill="none" stroke="${INK.paperLt}" stroke-width="0.6" stroke-linecap="round"/>` +
        `<path d="${hairs(Math.round(n * 0.12))}" fill="none" stroke="${INK.fibre}" stroke-width="0.9" stroke-linecap="round" opacity="0.55"/>`;
}
/** Điệp: flecks of ground shell caught in the paper. */
function flecks(box, seed, n, max = 1.25) {
    const r = rng(seed), [x, y, w, h] = box;
    let d = '';
    for (let i = 0; i < n; i++) {
        const s = 0.35 + r() * r() * max, cx = x + r() * w, cy = y + r() * h, k = 0.5 + r() * 0.5;
        d += `M${P1(cx - s)},${P1(cy)}L${P1(cx)},${P1(cy - s * k)} ${P1(cx + s)},${P1(cy)} ${P1(cx)},${P1(cy + s * k)}Z`;
    }
    return d;
}

/* ---------- motifs (each cuts into a plate: colour blocks + key block) ---------- */
const R0 = rng(77);

/** A five-petalled blossom. `ink` names the petal block, `eye` the centre block. */
function blossom(pt, cx, cy, r, rot, { ink = 'R', eye = 'Y', kw = 1.45, per = 3, carve = true } = {}) {
    for (let k = 0; k < 5; k++) {
        const a = rad(rot + k * 72), c = Math.cos(a), s = Math.sin(a);
        const L = (f, q) => [cx + r * (f * c - q * s), cy + r * (f * s + q * c)];
        const petal = cr([L(0.16, 0), L(0.5, -0.4), L(0.92, -0.3), L(0.9, 0), L(0.95, 0.3), L(0.5, 0.42)], per, true);
        pt[ink].fill(petal);
        const edge = [...petal.slice(1), petal[0], petal[1]].slice(0, petal.length - 1);
        if (carve && k % 2 === 0) pt.K.fill(ribbon(edge.filter((_, i) => i % 2 === 0 || i === edge.length - 1), kw * 1.7, { t0: 0.22, t1: 0.3, wob: 0.22, R: R0 }));
        else if (carve) pt.K.line(edge.filter((_, i) => i % 2 === 0 || i === edge.length - 1), kw * 0.85);
        else pt.K.line(edge, k % 2 ? kw * 1.3 : kw * 0.8);
    }
    pt[eye].fill(circle(cx, cy, r * 0.24, 8));
    pt.K.fill(circle(cx, cy, r * 0.09, 6));
    for (let k = 0; k < 5; k++) {
        const a = rad(rot + 36 + k * 72);
        pt.K.line([[cx + r * 0.16 * Math.cos(a), cy + r * 0.16 * Math.sin(a)], [cx + r * 0.42 * Math.cos(a), cy + r * 0.42 * Math.sin(a)]], k % 2 ? kw * 0.5 : kw * 0.8);
        pt.K.fill(circle(cx + r * 0.46 * Math.cos(a), cy + r * 0.46 * Math.sin(a), r * 0.065, 5));
    }
}
/** A closed bud on a short stalk. */
function bud(pt, cx, cy, r, rot, { ink = 'R', cup = 'G', kw = 1.1 } = {}) {
    const a = rad(rot), c = Math.cos(a), s = Math.sin(a);
    const L = (f, q) => [cx + r * (f * c - q * s), cy + r * (f * s + q * c)];
    const b = cr([L(-0.7, 0), L(0, -0.75), L(0.9, -0.3), L(1.15, 0), L(0.9, 0.3), L(0, 0.75)], 3, true);
    pt[ink].fill(b);
    pt.K.line([...b, b[0]], kw);
    pt[cup].fill(cr([L(-1.0, 0), L(-0.5, -0.7), L(0.1, -0.5), L(-0.25, 0), L(0.1, 0.5), L(-0.5, 0.7)], 2, true));
    pt.K.line([L(-0.2, -0.3), L(0.75, -0.05)], kw * 0.7);
}
/** A leaf with a midrib. */
function leaf(pt, x, y, len, rot, wid = 0.36, { ink = 'G', kw = 1.1 } = {}) {
    const a = rad(rot), c = Math.cos(a), s = Math.sin(a);
    const L = (f, q) => [x + len * (f * c - q * s), y + len * (f * s + q * c)];
    const b = cr([L(0, 0), L(0.35, -wid), L(0.75, -wid * 0.7), L(1, 0), L(0.7, wid * 0.8), L(0.3, wid)], 3, true);
    pt[ink].fill(b);
    pt.K.line([...b, b[0]], kw);
    pt.K.fill(ribbon([L(0.04, 0), L(0.3, wid * 0.06), L(0.6, wid * 0.07), L(0.9, 0)], kw * 1.1, { t0: 0.9, t1: 0.15 }));
}
/** A branch: a thick carved limb that thins to its tip. */
function limb(pt, ctrl, w0, w1, { ink = 'K', per = 5, edge = false } = {}) {
    const p = cr(ctrl, per);
    pt[ink].fill(ribbon(p, w1, { w0, t0: 1, t1: 0.55, wob: 0.16, R: R0 }));
    if (edge) { // on a colour limb, the key block cuts one edge and a few knots
        const at = along(p);
        const side = [];
        for (let i = 0; i <= 14; i++) { const f = at(i / 14), hw = (w0 + (w1 - w0) * (i / 14)) / 2; side.push([f.p[0] + f.n[0] * hw, f.p[1] + f.n[1] * hw]); }
        pt.K.fill(ribbon(side, 1.5, { R: R0, t0: 0.8, t1: 0.3 }));
        for (const u of [0.22, 0.47, 0.71]) { const f = at(u), hw = (w0 + (w1 - w0) * u) / 2; pt.K.line([[f.p[0] - f.n[0] * hw * 0.9, f.p[1] - f.n[1] * hw * 0.9], [f.p[0] + f.t[0] * 2 - f.n[0] * hw * 0.1, f.p[1] + f.t[1] * 2 - f.n[1] * hw * 0.1]], 0.9); }
    }
    return p;
}
/** A kumquat: a small fruit, one short curved highlight cut, nothing crossing it. `dark` = printed on the dark ground. */
function kumquat(pt, cx, cy, r, rot = 0, { ink = 'Y', kw = 1.2, dark = false, front = true } = {}) {
    const a = rad(rot);
    const b = circle(0, 0, r, 12).map(([x, y]) => [cx + x * 1.0 * Math.cos(a) - y * 0.86 * Math.sin(a), cy + x * 1.0 * Math.sin(a) + y * 0.86 * Math.cos(a)]);
    pt[ink].fill(b);
    if (front) pt.X.fill(b);
    pt[front ? 'K2' : 'K'].fill(ribbon([...b, b[0], b[1]], kw * 1.5, { t0: 0.55, t1: 0.55, wob: 0.25, R: R0 }));
    const cutp = ribbon(cr([[cx - r * 0.56, cy + r * 0.02], [cx - r * 0.42, cy - r * 0.4], [cx - r * 0.04, cy - r * 0.56]], 3), r * 0.2, { t0: 0.2, t1: 0.2 });
    if (dark) pt.H.fill(cutp);
    else pt[ink].hole(cutp);
}

/** A carp along a spine (head first). `body` and `fin` name the colour blocks. */
function carp(pt, spineCtrl, { w = 15, body = 'R', fin = 'Y', back = 1 } = {}) {
    const sp = cr(spineCtrl, 8), at = along(sp);
    const prof = u => (u < 0.3 ? 0.42 + 0.58 * Math.sqrt(1 - ((0.3 - u) / 0.3) ** 2) : 1 - 0.7 * ((u - 0.3) / 0.7) ** 1.35);
    const B = (u, s) => { const f = at(u), k = w * prof(Math.max(0, Math.min(1, u))) * s * back; return [f.p[0] + f.n[0] * k, f.p[1] + f.n[1] * k]; };
    const f0 = at(0), f1 = at(1);
    const H = (fw, sd) => [f0.p[0] - f0.t[0] * fw + f0.n[0] * sd * back, f0.p[1] - f0.t[1] * fw + f0.n[1] * sd * back];
    const T = (a, b) => [f1.p[0] + f1.t[0] * a * (w / 15) + f1.n[0] * b * back * (w / 15), f1.p[1] + f1.t[1] * a * (w / 15) + f1.n[1] * b * back * (w / 15)];
    const N = 14;
    const up = Array.from({ length: N + 1 }, (_, i) => B(i / N, 1)), dn = Array.from({ length: N + 1 }, (_, i) => B(i / N, -1));
    // tail and fins first (the body prints over their roots)
    const tail = cr([T(-3, 3.6), T(8, 8), T(21, 20), T(31, 19), T(25, 8), T(17, 0), T(25, -8), T(31, -19), T(21, -20), T(8, -8), T(-3, -3.6)], 3);
    pt[fin].fill(tail);
    pt.K.fill(ribbon(tail, 2.3, { R: R0, t0: 0.6, t1: 0.6 }));
    for (const [a, b] of [[24, 15], [26, 11], [22, 4.5], [22, -4.5], [26, -11], [24, -15]]) pt.K.line([T(3, b * 0.12), T(a * 0.6, b * 0.55), T(a, b)], 0.9);
    const dorsal = [];
    const fu = [];
    for (let i = 0; i <= 12; i++) { const u = 0.27 + (0.42 * i) / 12; fu.push(u); dorsal.push(B(u, 1 + (0.25 + 0.75 * Math.sin((Math.PI * i) / 12) ** 0.7) * (i % 2 ? 0.74 : 0.92) * (1.1 - 0.35 * (i / 12)))); }
    pt[fin].fill([...fu.map(u => B(u, 0.8)), ...[...dorsal].reverse()]);
    pt.K.line([B(0.25, 0.98), ...dorsal, B(0.71, 0.98)], 1.3);
    for (let i = 1; i < 12; i += 2) pt.K.line([B(fu[i] - 0.02, 1), dorsal[i]], 0.85);
    for (const [u0, len, dep] of [[0.27, 0.2, 1.05], [0.56, 0.15, 0.85]]) {
        const finp = cr([B(u0, -0.82), B(u0 + len * 0.45, -1 - dep), B(u0 + len, -1 - dep * 0.8), B(u0 + len * 0.8, -0.86)], 4);
        pt[fin].fill(finp);
        pt.K.line(finp, 1.25);
        pt.K.line([B(u0 + len * 0.15, -0.95), B(u0 + len * 0.62, -1 - dep * 0.72)], 0.85);
        pt.K.line([B(u0 + len * 0.4, -0.95), B(u0 + len * 0.82, -1 - dep * 0.6)], 0.85);
    }
    // body
    const outline = [H(w * 0.3, 0), ...up, ...[...dn].reverse()];
    pt[body].fill(outline);
    // carved belly: the paper shows
    const belly = [];
    for (let i = 0; i <= 10; i++) belly.push(B(0.2 + 0.6 * (i / 10), -0.86));
    for (let i = 10; i >= 0; i--) belly.push(B(0.2 + 0.6 * (i / 10), -0.86 + 0.38 * Math.sin((Math.PI * i) / 10)));
    pt[body].hole(belly);
    pt.K.fill(ribbon([...dn.slice(0, N).reverse(), H(w * 0.3, 0), ...up.slice(0, N)], 2.9, { R: R0, t0: 0.5, t1: 0.5, wob: 0.18 }));
    // head
    const gill = [];
    for (let i = 0; i <= 8; i++) { const s = -0.92 + (1.84 * i) / 8; gill.push(B(0.2 + 0.075 * (1 - s * s), s)); }
    pt.K.fill(ribbon(gill, 2.2, { R: R0 }));
    const eye = B(0.12, 0.3), ring = circle(eye[0], eye[1], w * 0.19, 10);
    pt[body].hole(ring);
    pt.K.fill(ribbon([...ring, ring[0], ring[1]], 1.25, { t0: 1, t1: 1 }));
    pt.K.fill(circle(eye[0], eye[1], w * 0.085, 7));
    // the mouth, and two barbels that hang from its corner
    pt.K.fill(ribbon(cr([H(w * 0.3, -w * 0.02), H(w * 0.12, -w * 0.2), H(-w * 0.02, -w * 0.2)], 3), 1.4, { t0: 0.6, t1: 0.3 }));
    pt.K.fill(ribbon(cr([H(w * 0.2, -w * 0.2), H(w * 0.52, -w * 0.4), H(w * 0.66, -w * 0.72), H(w * 0.5, -w * 0.92)], 4), 1.5, { t0: 0.9, t1: 0.2 }));
    pt.K.fill(ribbon(cr([H(w * 0.1, -w * 0.24), H(w * 0.26, -w * 0.56), H(w * 0.16, -w * 0.84)], 4), 1.3, { t0: 0.9, t1: 0.2 }));
    // scales: rows of small arcs opening to the head
    let row = 0;
    for (let u = 0.325; u < 0.93; u += 0.058, row++) {
        const hw = w * prof(u), m = Math.max(2, Math.round((hw * 2) / (w * 0.42)));
        for (let j = 0; j < m + (row % 2); j++) {
            const s = -0.86 + (1.72 * (j + (row % 2 ? 0 : 0.5))) / m;
            if (s > 0.8 || s < -0.42 - (u > 0.8 ? 0.4 : 0)) continue;
            const f = at(u), c = B(u, s), r = (hw / m) * 1.02;
            pt.K.fill(ribbon([-76, -27, 27, 76].map(d => [c[0] + f.t[0] * r * 0.95 * Math.cos(rad(d)) + f.n[0] * r * Math.sin(rad(d)), c[1] + f.t[1] * r * 0.95 * Math.cos(rad(d)) + f.n[1] * r * Math.sin(rad(d))]), (row + j) % 3 ? 1.5 : 2, { t0: 0.18, t1: 0.3, wob: 0.2, R: R0 }));
        }
    }
}

/** Twisted cord: two strands, brick and turmeric, wound round each other under a black edge. */
function cord(p, w = 6, seg = 3.6) {
    const at = along(p), total = at(0).total, n = Math.max(2, Math.round(total / seg));
    const edge = (u, s) => { const f = at(u); return [f.p[0] + f.n[0] * s, f.p[1] + f.n[1] * s]; };
    let s = `<path d="M${pl(ribbon(cr(p, 1), w + 2.6, { t0: 1, t1: 1 }))}Z" fill="${INK.soot}"/>`;
    const k = 0.9 / n; // the lean of the twist
    const q = { [INK.red]: '', [INK.yellow]: '' };
    for (let i = 0; i < n; i++) {
        const u0 = i / n, u1 = (i + 1) / n;
        q[i % 2 ? INK.yellow : INK.red] += `M${pl([edge(u0 - k, w / 2), edge(u1 - k, w / 2), edge(u1 + k, -w / 2), edge(u0 + k, -w / 2)])}Z`;
    }
    for (const [col, d] of Object.entries(q)) s += `<path d="${d}" fill="${col}"/>`;
    let d = '';
    for (let i = 1; i < n; i++) d += `M${pl([edge(i / n - k, w / 2), edge(i / n + k, -w / 2)])}`;
    return s + `<path d="${d}" fill="none" stroke="${INK.soot}" stroke-width="0.8"/>`;
}

/* ---------- geometry (canvas units) ---------- */
const SX0 = 30, SX1 = 330, SY0 = 98, SY1 = 298; // the open sheet (inside the frame's side fades)
const PX0 = 105, PX1 = 255, SEAM = 180; // the centre panel = the closed parcel
const FLAP = 26, INSET = 24;
const KNOT = [180, 198];

/* ---------- the ground: a deep soot-brown block, its grain showing ---------- */
{
    const box = [-10, -10, 380, 470];
    let s = `<rect x="-10" y="-10" width="380" height="470" fill="${INK.ground}"/>`;
    s += `<path d="${grain(box, 11, { gap: [3, 8], amp: 5, lam: 120, tilt: -0.03 })}" fill="none" stroke="${INK.groundLt}" stroke-width="0.7" stroke-linecap="round"/>`;
    s += `<path d="${grain(box, 12, { gap: [9, 22], amp: 5, lam: 120, tilt: -0.03, run: [20, 90], rest: [40, 160] })}" fill="none" stroke="${INK.groundDk}" stroke-width="1.1" stroke-linecap="round"/>`;
    s += `<path d="${specks(box, 13, 420, 1.6)}" fill="${INK.groundLt}"/><path d="${specks(box, 14, 260, 1.4)}" fill="${INK.groundDk}"/>`;
    svg('ground', box, s);
}

/** Print a plate on the dark ground: colours a little off the key block, each block starved by its own wood. */
function printOnGround(name, box, pt, seed) {
    const defs = `<defs>${starve('a', box, seed, { tilt: 0.05, specks: 150, gap: [5, 12], step: 18 })}</defs>`;
    const s = defs +
        `<g mask="url(#a)"><g transform="translate(1.3 -0.9)">${pt.G.draw(INK.green)}</g>` +
        `<g transform="translate(-1 1.1)">${pt.R.draw(INK.red)}${pt.W.draw(INK.paper)}</g>` +
        `${pt.K.draw(INK.groundDk)}</g>` +
        // the fruit is printed whole: a grain line through a small fruit reads as a slash
        `<g transform="translate(1.3 -0.9)">${pt.Y.draw(INK.yellow)}${pt.H.draw(INK.paperLt)}</g>${pt.K2.draw(INK.groundDk)}`;
    svg(name, box, s);
}

/* Peach on the ground: a brick-red limb up the left side that arches over the parcel, ivory blossoms. */
{
    const pt = plate();
    const o = { ink: 'W', eye: 'R', kw: 1.5, per: 2, carve: false };
    limb(pt, [[4, 452], [30, 404], [50, 350], [46, 292], [34, 236], [38, 178], [56, 124], [96, 82], [150, 62], [206, 58], [254, 70]], 13, 3, { ink: 'R', edge: true, per: 6 });
    limb(pt, [[48, 330], [76, 338], [108, 356], [140, 352], [164, 362]], 6, 2, { ink: 'R', edge: true });
    limb(pt, [[35, 232], [22, 214], [20, 192]], 5, 2.4, { ink: 'R' });
    limb(pt, [[40, 168], [62, 174], [76, 192]], 4.5, 2, { ink: 'R' });
    limb(pt, [[150, 62], [172, 44], [198, 38]], 4, 2, { ink: 'R' });
    limb(pt, [[46, 300], [68, 284], [78, 264]], 4.5, 2, { ink: 'R' });
    limb(pt, [[28, 408], [56, 414], [82, 402]], 5, 2, { ink: 'R' });
    limb(pt, [[108, 356], [116, 384], [138, 400]], 4, 2, { ink: 'R' });
    blossom(pt, 80, 254, 15, 10, o);
    blossom(pt, 80, 202, 12, 40, o);
    blossom(pt, 62, 142, 14, -12, o);
    blossom(pt, 24, 184, 11, 24, o);
    blossom(pt, 68, 316, 13, 52, o);
    blossom(pt, 172, 368, 14, -6, o);
    blossom(pt, 122, 336, 12, 30, o);
    blossom(pt, 90, 398, 14, 18, o);
    blossom(pt, 34, 372, 12, -28, o);
    blossom(pt, 144, 410, 13, 44, o);
    blossom(pt, 204, 34, 12, 8, o);
    blossom(pt, 236, 62, 11, -20, o);
    blossom(pt, 170, 74, 10, 30, o);
    blossom(pt, 268, 78, 9, 12, o);
    blossom(pt, 222, 344, 11, 20, o);
    bud(pt, 24, 262, 5.5, 200, { ink: 'W', cup: 'R' });
    bud(pt, 26, 318, 5.5, 170, { ink: 'W', cup: 'R' });
    bud(pt, 200, 392, 5.5, 20, { ink: 'W', cup: 'R' });
    bud(pt, 92, 298, 5, -30, { ink: 'W', cup: 'R' });
    bud(pt, 226, 38, 4.5, 30, { ink: 'W', cup: 'R' });
    leaf(pt, 66, 232, 15, -150, 0.34);
    leaf(pt, 30, 160, 14, -160, 0.34);
    leaf(pt, 98, 368, 15, 70, 0.34);
    leaf(pt, 56, 386, 13, -120, 0.34);
    leaf(pt, 186, 52, 12, -160, 0.36);
    leaf(pt, 84, 112, 13, -60, 0.34);
    limb(pt, [[60, 118], [78, 126], [88, 142]], 4, 2, { ink: 'R' });
    blossom(pt, 88, 150, 11, 20, o);
    blossom(pt, 86, 290, 10, -10, o);
    blossom(pt, 124, 76, 9, -30, o);
    // loose petals on the ground
    for (const [x, y, a] of [[96, 100, 30], [276, 104, 100], [262, 318, -40], [150, 322, 60], [238, 396, 10], [300, 60, -70], [58, 352, 140]]) {
        const c = Math.cos(rad(a)), sn = Math.sin(rad(a));
        const L = (f, q) => [x + 4.6 * (f * c - q * sn), y + 4.6 * (f * sn + q * c)];
        const b = cr([L(-1, 0), L(0, -0.75), L(1, -0.3), L(0.8, 0.1), L(1, 0.5), L(0, 0.75)], 2, true);
        pt.W.fill(b);
        pt.K.line([...b, b[0]], 1.2);
    }
    printOnGround('peach', [-10, 30, 290, 430], pt, 31);
}

/* Kumquat on the ground: a green limb down the right side, heavy with turmeric fruit. */
{
    const pt = plate();
    limb(pt, [[372, 40], [344, 84], [322, 132], [326, 186], [338, 240], [324, 296], [296, 340], [262, 372], [226, 384]], 9, 2.6, { ink: 'G', edge: true, per: 6 });
    limb(pt, [[324, 150], [300, 140], [286, 118]], 4, 2, { ink: 'G' });
    limb(pt, [[334, 232], [306, 228], [290, 244]], 4, 2, { ink: 'G' });
    limb(pt, [[300, 336], [308, 372], [296, 406]], 5, 2, { ink: 'G' });
    limb(pt, [[330, 270], [352, 290], [362, 322]], 4, 2, { ink: 'G' });
    limb(pt, [[262, 372], [250, 404], [226, 420]], 4, 2, { ink: 'G' });
    limb(pt, [[323, 140], [300, 158], [282, 180]], 4, 2, { ink: 'G' });
    limb(pt, [[326, 280], [300, 284], [280, 290]], 3.6, 2, { ink: 'G' });
    for (const [x, y, r, a] of [
        [296, 112, 9, 20], [282, 132, 8, -10], [312, 152, 8.5, 40], [300, 216, 9, 0], [286, 258, 9.5, 24], [310, 250, 8, -30],
        [338, 204, 8.5, 12], [318, 314, 9, 30], [282, 350, 9.5, -14], [318, 372, 9, 8], [292, 414, 9.5, 30], [244, 366, 8.5, 40],
        [234, 426, 9, -20], [348, 322, 9, 16], [340, 108, 8, -20], [262, 404, 8, 10], [330, 400, 8, -8],
        [274, 178, 8.5, 10], [286, 196, 8, -24], [272, 292, 8.5, 30],
    ]) kumquat(pt, x, y, r, a, { kw: 1.5, dark: true });
    for (const [x, y, len, a] of [
        [330, 92, 19, 160], [318, 128, 18, -150], [304, 162, 17, 150], [322, 182, 18, 20], [316, 222, 17, -160], [338, 258, 17, 170], [300, 276, 18, 130],
        [312, 290, 17, -30], [276, 318, 18, -150], [300, 356, 16, 170], [256, 388, 17, 140], [276, 384, 16, 30], [338, 348, 17, 110], [308, 394, 16, 50],
        [214, 396, 15, 170], [346, 150, 16, -20], [350, 232, 15, 30], [270, 152, 14, 120], [296, 172, 14, 40], [268, 202, 13, 150],
    ]) leaf(pt, x, y, len, a, 0.3, { kw: 1.3 });
    printOnGround('kumquat', [200, 30, 170, 430], pt, 47);
}

/* ---------- paper ---------- */
/** A panel of dó: flat ivory a hair off its black edge, blotches, fibres. `edges` = which sides get the key line. */
function paperPanel(box, seed, { edges = 'trbl', tone = INK.paper, hairs = null } = {}) {
    const [x, y, w, h] = box, r = rng(seed);
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${tone}"/>`;
    let d = '';
    for (let i = 0; i < Math.round((w * h) / 2600); i++) d += `M${pl(cr(circle(x + r() * w, y + r() * h, 8 + r() * 20, 6, 0.4, r), 2, true))}Z`;
    s += `<path d="${d}" fill="${INK.paperDk}" opacity="0.22"/>`;
    s += fibres(box, seed + 1, hairs ?? Math.round((w * h) / 95));
    s += `<path d="${flecks(box, seed + 2, Math.round((w * h) / 140))}" fill="${INK.shell}"/>`;
    const e = { t: [[x, y + 0.7], [x + w, y + 0.7]], b: [[x, y + h - 0.7], [x + w, y + h - 0.7]], l: [[x + 0.7, y], [x + 0.7, y + h]], r: [[x + w - 0.7, y], [x + w - 0.7, y + h]] };
    for (const k of edges) s += `<path d="M${pl(ribbon(cr(e[k], 9), 1.9, { t0: 1, t1: 1, wob: 0.3, R: r }))}Z" fill="${INK.soot}"/>`;
    return s;
}
const crease = (x, y0, y1) => `<path d="M${x},${y0}L${x},${y1}" stroke="${INK.paperDk}" stroke-width="1.1"/><path d="M${x + 0.9},${y0}L${x + 0.9},${y1}" stroke="${INK.paperLt}" stroke-width="0.7"/>`;

// the open sheet: centre panel and the insides of the two doors
svg('mid', [PX0, SY0, PX1 - PX0, SY1 - SY0], paperPanel([PX0, SY0, PX1 - PX0, SY1 - SY0], 201, { edges: 'tb' }) + crease(PX0 + 0.6, SY0 + 2, SY1 - 2) + crease(PX1 - 1.5, SY0 + 2, SY1 - 2));
svg('door-l-in', [SX0, SY0, PX0 - SX0, SY1 - SY0], paperPanel([SX0, SY0, PX0 - SX0, SY1 - SY0], 211, { edges: 'tbl' }));
svg('door-r-in', [PX1, SY0, SX1 - PX1, SY1 - SY0], paperPanel([PX1, SY0, SX1 - PX1, SY1 - SY0], 221, { edges: 'tbr' }));

/* The insides of the two small flaps: the same dó, a brick band of carved rings between two rules. */
for (const [name, y0, y1] of [['flap-t-in', SY0, SY0 - FLAP], ['flap-b-in', SY1, SY1 + FLAP]]) {
    const top = Math.min(y0, y1), box = [PX0, top, PX1 - PX0, FLAP], dir = y1 > y0 ? 1 : -1;
    const shape = [[PX0 + 1, y0], [PX1 - 1, y0], [PX1 - INSET, y1], [PX0 + INSET, y1]];
    const at = (x, f) => [x, y0 + dir * FLAP * f];
    const xin = f => PX0 + 1 + (INSET - 1) * f + 7; // left limit of the band at depth f
    const b = new Block().fill([at(xin(0.3), 0.3), at(360 - xin(0.3), 0.3), at(360 - xin(0.7), 0.7), at(xin(0.7), 0.7)]);
    for (let x = xin(0.5) + 8; x <= 360 - xin(0.5) - 7; x += 10.6) b.hole(circle(x, y0 + dir * FLAP * 0.5, 2.5, 7));
    b.fill([at(xin(0.16), 0.14), at(360 - xin(0.16), 0.14), at(360 - xin(0.2), 0.2), at(xin(0.2), 0.2)]);
    b.fill([at(xin(0.8), 0.8), at(360 - xin(0.8), 0.8), at(360 - xin(0.86), 0.86), at(xin(0.86), 0.86)]);
    const k = new Block();
    k.fill(ribbon(cr([shape[0], shape[3]], 4), 1.9, { t0: 1, t1: 1 })).fill(ribbon(cr([shape[3], shape[2]], 8), 1.9, { t0: 1, t1: 1, wob: 0.25, R: R0 })).fill(ribbon(cr([shape[2], shape[1]], 4), 1.9, { t0: 1, t1: 1 }));
    svg(name, box,
        `<defs>${starve('m', box, 300 + y0, { specks: 70, gap: [2.2, 5] })}<clipPath id="c"><path d="M${pl(shape)}Z"/></clipPath></defs>` +
        `<g clip-path="url(#c)"><rect x="${PX0}" y="${top}" width="${PX1 - PX0}" height="${FLAP}" fill="${INK.paper}"/>${fibres(box, 310 + y0, 40)}<path d="${flecks(box, 320 + y0, 26)}" fill="${INK.shell}"/></g>` +
        `<g mask="url(#m)" transform="translate(0.8 ${dir * 0.7})">${b.draw(INK.red)}</g>${k.draw(INK.soot)}`);
}

/* ---------- the print inside: carp, peach, kumquat, a tray of five fruits ---------- */
{
    const pt = plate();
    const W = SX1 - SX0, H = SY1 - SY0; // 340 x 194, local coordinates

    // a pair of carp circling a pearl
    const C = [135, 112];
    const spineA = [[41.5, -15], [31, -31], [10, -43.5], [-15, -43.5], [-37, -31], [-46, -15]];
    carp(pt, spineA.map(([x, y]) => [C[0] + x, C[1] + y]), { w: 13.4, body: 'R', fin: 'Y', back: -1 });
    carp(pt, spineA.map(([x, y]) => [C[0] - x, C[1] - y]), { w: 13.4, body: 'Y', fin: 'R', back: -1 });
    // the pearl: a plain brick disc in a turmeric ring, a halo of short cuts round it
    {
        const ring = circle(C[0], C[1], 11.5, 16);
        pt.Y.fill(ring);
        pt.R.fill(circle(C[0], C[1], 7.2, 12));
        pt.R.hole(ribbon(cr([[C[0] - 4.2, C[1] - 0.4], [C[0] - 2.8, C[1] - 3.4], [C[0] + 0.6, C[1] - 4.4]], 3), 1.5, { t0: 0.2, t1: 0.2 }));
        pt.K.fill(ribbon([...ring, ring[0], ring[1]], 2.2, { t0: 1, t1: 1, wob: 0.2, R: R0 }));
        const inner = circle(C[0], C[1], 7.2, 12);
        pt.K.fill(ribbon([...inner, inner[0], inner[1]], 1.4, { t0: 1, t1: 1, wob: 0.2, R: R0 }));
        for (let k = 0; k < 12; k++) {
            const a = rad(k * 30 + 15), r0 = 15, r1 = k % 2 ? 18.5 : 21;
            pt.K.fill(ribbon([[C[0] + r0 * Math.cos(a), C[1] + r0 * Math.sin(a)], [C[0] + (r0 + r1) / 2 * Math.cos(a), C[1] + (r0 + r1) / 2 * Math.sin(a)], [C[0] + r1 * Math.cos(a), C[1] + r1 * Math.sin(a)]], k % 2 ? 1.5 : 2, { t0: 1, t1: 0.2 }));
        }
    }

    // water: an indigo swell along the foot of the sheet, crests curling
    {
        const x0 = -4, x1 = 214, base = 181;
        const top = [];
        const crests = [];
        for (let x = x0; x <= x1; x += 3) {
            const ph = ((x - x0) % 36) / 36;
            top.push([x, base + 7 - 9 * Math.sin(Math.PI * ph) ** 0.8 - 2.5 * Math.sin((x - x0) / 60)]);
            if (Math.abs(ph - 0.5) < 0.05) crests.push(top[top.length - 1]);
        }
        pt.I.fill([...top, [x1, H + 4], [x0, H + 4]]);
        pt.K.fill(ribbon(top, 2.5, { t0: 1, t1: 0.4, wob: 0.2, R: R0 }));
        // carved swell lines: the paper shows
        for (const dy of [7.5, 13]) {
            const q = top.filter((_, i) => i % 2 === 0).map(([x, y]) => [x, base + 7 + dy - (base + 7 - y) * 0.55]);
            pt.I.hole(ribbon(q, 1.5, { t0: 1, t1: 1, wob: 0.3, R: R0 }));
        }
        for (const [cx, cy] of crests) {
            const curl = cr([[cx - 8, cy + 5], [cx - 2, cy - 4], [cx + 6, cy - 5], [cx + 9, cy + 1], [cx + 5, cy + 4.5], [cx + 2, cy + 1.5]], 4);
            pt.K.fill(ribbon(curl, 2.1, { t0: 0.5, t1: 0.3, R: R0 }));
            pt.I.fill(circle(cx + 12, cy - 6, 1.5, 6)).fill(circle(cx + 16, cy - 1.5, 1.1, 6));
        }
    }

    // peach: a black limb from the lower left corner, over the top of the sheet
    limb(pt, [[11, 204], [20, 164], [15, 122], [23, 80], [44, 46], [80, 26], [122, 24], [162, 18], [198, 26]], 9.5, 2.4, { per: 6 });
    limb(pt, [[16, 126], [36, 126], [50, 112]], 4, 1.8);
    limb(pt, [[19, 166], [38, 162], [52, 170]], 4, 1.8);
    limb(pt, [[44, 46], [48, 26], [62, 13]], 3.6, 1.8);
    limb(pt, [[122, 24], [138, 36], [156, 40]], 3.4, 1.6);
    limb(pt, [[23, 82], [44, 82], [58, 70]], 3.6, 1.6);
    blossom(pt, 56, 104, 11.5, 12);
    blossom(pt, 59, 172, 11, -20);
    blossom(pt, 34, 56, 12.5, 30);
    blossom(pt, 68, 14, 9, 6);
    blossom(pt, 93, 29, 12, -14);
    blossom(pt, 162, 42, 9.5, 20);
    blossom(pt, 182, 17, 10.5, 40);
    blossom(pt, 64, 66, 9, 50);
    blossom(pt, 31, 142, 9.5, -6);
    blossom(pt, 134, 13, 8.5, 24);
    bud(pt, 38, 186, 4.6, 40);
    bud(pt, 11, 96, 4.4, -100);
    bud(pt, 204, 28, 4.4, 14);
    bud(pt, 114, 40, 4.2, 70);
    bud(pt, 42, 122, 4, -20);
    leaf(pt, 40, 90, 13, -30, 0.36);
    leaf(pt, 110, 18, 12, -160, 0.36);
    leaf(pt, 26, 110, 12, -170, 0.36);
    leaf(pt, 146, 28, 11, -40, 0.36);
    leaf(pt, 26, 154, 11, 150, 0.36);

    // the tray of five fruits, cut on its own plate (centre x = 0, foot at y = 190) and set in a little smaller
    {
        const tp = plate();
        // pomelo (behind), with its stalk and two leaves
        const pom = circle(0, 104, 20, 16, 0.03, R0);
        tp.Y.fill(pom);
        tp.Y.hole(ribbon(cr([[-13, 100], [-9.5, 91], [-1, 87]], 4), 2.8, { t0: 0.2, t1: 0.2 }));
        tp.K.fill(ribbon([...pom, pom[0], pom[1]], 2.7, { t0: 1, t1: 1, wob: 0.2, R: R0 }));
        for (const [x, y] of [[5, 97], [11, 105], [3, 110], [-5, 102], [8, 114], [-9, 111]]) tp.K.fill(circle(x, y, 0.75, 5));
        limb(tp, [[0, 85], [1, 79], [5, 75]], 2.6, 1.6);
        leaf(tp, 3, 79, 15, -24, 0.34);
        leaf(tp, -1, 80, 13, -150, 0.34);
        // persimmons on its shoulders
        for (const [x, y, r] of [[-26, 101, 10.5], [26, 100, 10.5]]) {
            const p = circle(x, y, r, 12).map(([a, b]) => [a, y + (b - y) * 0.9]);
            tp.R.fill(p);
            tp.R.hole(ribbon(cr([[x - r * 0.6, y + 1], [x - r * 0.5, y - r * 0.4], [x - r * 0.1, y - r * 0.6]], 3), 1.9, { t0: 0.2, t1: 0.2 }));
            tp.K.fill(ribbon([...p, p[0], p[1]], 2.4, { t0: 1, t1: 1, wob: 0.2, R: R0 }));
            for (let k = 0; k < 4; k++) leaf(tp, x, y - r * 0.72, 5.5, -90 + (k - 1.5) * 52, 0.42, { ink: 'G', kw: 0.9 });
        }
        // kumquats and plums higher up
        kumquat(tp, 22, 80, 6.2, 20, { front: false });
        kumquat(tp, 33, 86, 5.6, -10, { front: false });
        for (const [x, y] of [[-23, 80], [-34, 87], [-13, 74]]) {
            const p = circle(x, y, 5.6, 10);
            tp.I.fill(p);
            tp.I.hole(circle(x - 1.8, y - 1.8, 1.3, 6));
            tp.K.fill(ribbon([...p, p[0], p[1]], 1.7, { t0: 0.6, t1: 0.6, wob: 0.2, R: R0 }));
        }
        // the hand of bananas, in front: five fat curved fingers joined at one stem, turmeric with green tips
        for (const a of [-76, 76, -39, 39, 0]) {
            const sg = Math.sign(a), m = Math.abs(a), L = m > 60 ? 35 : m > 20 ? 31 : 27;
            const tip = [L * Math.sin(rad(a)), 145 - L * Math.cos(rad(a)) - (m > 60 ? 4 : 0)];
            const bow = m > 60 ? 4.5 : m > 20 ? 3 : 0; // each finger sags a little, then lifts to its tip
            const p = cr([[sg * 1.5, 144], [tip[0] * 0.45 + sg * bow * 0.5, 144 + (tip[1] - 144) * 0.36 + bow * 0.8], [tip[0] * 0.82 + sg * bow * 0.3, 144 + (tip[1] - 144) * 0.76 + bow * 0.4], tip], 4);
            const rb = ribbon(p, 11, { t0: 0.6, t1: 0.5 });
            tp.Y.fill(rb);
            tp.X.fill(rb);
            tp.G.fill(ribbon(p.slice(-3), 5.4, { t0: 1, t1: 0.9 }));
            tp.K2.fill(ribbon([...rb, rb[0], rb[1]], 1.9, { t0: 0.7, t1: 0.7, wob: 0.2, R: R0 }));
        }
        const stem = [[-4.5, 141], [4.5, 141], [3.4, 147.4], [-3.4, 147.4]];
        tp.G.fill(stem);
        tp.X.fill(stem);
        tp.K2.fill(ribbon([...stem, stem[0], stem[1]], 1.5, { t0: 1, t1: 1 }));
        // the footed tray: a turmeric rim, a brick bowl on a waisted foot
        const side = cr([[38, 154], [31, 160], [15, 166], [8.5, 172], [11, 180], [21, 186.5]], 4);
        const bowl = [[-39, 154], ...side, [23, 190], [-23, 190], ...side.map(([x, y]) => [-x, y]).reverse()];
        tp.R.fill(bowl);
        tp.R.hole([[-16, 186], [16, 186], [16, 187.4], [-16, 187.4]]);
        tp.R.hole(ribbon(cr([[-24, 159], [0, 162.5], [24, 159]], 4), 1.3, { t0: 0.2, t1: 0.2 }));
        const rim = [[-42, 147.4], [42, 147.4], [40, 154.6], [-40, 154.6]];
        tp.Y.fill(rim);
        tp.K.fill(ribbon([...bowl, bowl[0], bowl[1]], 2.5, { t0: 1, t1: 1, wob: 0.15, R: R0 }));
        tp.K.fill(ribbon([...rim, rim[0], rim[1]], 2, { t0: 1, t1: 1, wob: 0.15, R: R0 }));
        tp.K.fill(ribbon([[-8.5, 172], [0, 172.6], [8.5, 172]], 1.4, { t0: 0.4, t1: 0.4 }));
        const k = 0.9, TX = 258, FOOT = 196;
        merge(pt, tp, ([x, y]) => [TX + x * k, FOOT + (y - 190) * k], k);
    }

    // kumquat sprig hanging in from the top right corner
    limb(pt, [[306, 2], [280, 20], [256, 28], [234, 42], [222, 58]], 5.5, 1.8);
    limb(pt, [[280, 20], [284, 40], [278, 54]], 3, 1.6);
    kumquat(pt, 264, 44, 7, 20);
    kumquat(pt, 281, 62, 6.6, -14);
    kumquat(pt, 240, 56, 6.6, 34);
    kumquat(pt, 222, 68, 6, 0);
    kumquat(pt, 291, 37, 6, 10);
    for (const [x, y, len, a] of [[270, 20, 15, -150], [250, 28, 14, -36], [240, 36, 14, 160], [290, 14, 13, 30], [288, 48, 12, 40], [228, 44, 13, -140], [266, 58, 11, 140]]) leaf(pt, x, y, len, a, 0.32);

    // a thin brick rule all the way round the sheet; the picture is printed over it
    {
        const m = 4.4, t = 1.4;
        pt.R.fill([[m, m], [W - m, m], [W - m, H - m], [m, H - m]]);
        pt.R.hole([[m + t, m + t], [W - m - t, m + t], [W - m - t, H - m - t], [m + t, H - m - t]]);
    }

    const box = [SX0, SY0, W, H], lb = [0, 0, W, H];
    const pass = (name, seed, o, dx, dy, inner) => svg(name, box, `<defs>${starve('m', lb, seed, o)}</defs><g transform="translate(${SX0} ${SY0})"><g mask="url(#m)" transform="translate(${dx} ${dy})">${inner}</g></g>`);
    pass('pass-y', 501, { tilt: 0.04, lam: 70, sw: 0.75 }, 1.5, -1, pt.Y.draw(INK.yellow));
    pass('pass-r', 502, { tilt: -0.06, lam: 95, sw: 0.65 }, -1.2, 1, pt.R.draw(INK.red));
    pass('pass-c', 503, { tilt: 0.1, lam: 60, sw: 0.75 }, 1, 1.3, pt.G.draw(INK.green) + pt.I.draw(INK.indigo));
    // the key block: cut away under the fruit that lies in front, whose own outlines are cut last
    svg('pass-k', box,
        `<defs>${starve('m', lb, 504, { tilt: -0.02, lam: 110, specks: 60, sw: 0.4, gap: [8, 16], coarse: false, extra: `<path d="${pt.X.path()}" fill="#000000"/>` })}` +
        `</defs><g transform="translate(${SX0} ${SY0})"><g mask="url(#m)">${pt.K.draw(INK.soot)}</g>${pt.K2.draw(INK.soot)}</g>`);
}

/* Điệp: two sets of shell flecks over the open sheet; they catch the light in turn. */
svg('spark-a', [SX0, SY0, SX1 - SX0, SY1 - SY0], `<path d="${flecks([SX0 + 2, SY0 + 2, SX1 - SX0 - 4, SY1 - SY0 - 4], 601, 300, 1.5)}" fill="${INK.shell}"/>`);
svg('spark-b', [SX0, SY0, SX1 - SX0, SY1 - SY0], `<path d="${flecks([SX0 + 2, SY0 + 2, SX1 - SX0 - 4, SY1 - SY0 - 4], 602, 300, 1.5)}" fill="${INK.shell}"/>`);

/* ---------- the closed parcel ---------- */
/** The outside of a door: dó printed with one block of small brick blossoms. */
for (const [name, x0, x1, seed] of [['door-l-out', PX0, SEAM, 701], ['door-r-out', SEAM, PX1, 702]]) {
    const box = [x0, SY0, x1 - x0, SY1 - SY0];
    const b = new Block();
    for (let row = 0; row < 9; row++) for (let col = 0; col < 7; col++) {
        const x = PX0 + 13 + col * 25 + (row % 2) * 12.5, y = SY0 + 12 + row * 22;
        if (x < x0 + 6 || x > x1 - 6) continue;
        for (let k = 0; k < 5; k++) { const a = rad(row * 37 + col * 19 + k * 72); b.fill(circle(x + 4 * Math.cos(a), y + 4 * Math.sin(a), 2.7, 7)); }
        b.hole(circle(x, y, 1.5, 6));
    }
    svg(name, box,
        `<defs>${starve('m', box, seed + 5, { specks: 60, gap: [5, 11], sw: 0.4, coarse: false })}</defs>` +
        paperPanel(box, seed, { edges: name === 'door-l-out' ? 'tbl' : 'tbr' }) +
        `<g mask="url(#m)" transform="translate(0.6 0.5)">${b.draw(INK.red)}</g>` +
        (name === 'door-l-out' ? `<path d="M${pl(ribbon(cr([[SEAM - 0.5, SY0], [SEAM - 0.5, SY1]], 10), 1.5, { t0: 1, t1: 1, wob: 0.3, R: R0 }))}Z" fill="${INK.soot}"/>` : ''));
}
/* The outsides of the two small flaps, folded over the doors: plain dó, a brick rule. */
for (const [name, y0, y1] of [['flap-t-out', SY0, SY0 + FLAP], ['flap-b-out', SY1, SY1 - FLAP]]) {
    const top = Math.min(y0, y1), box = [PX0, top, PX1 - PX0, FLAP];
    const shape = [[PX0, y0], [PX1, y0], [PX1 - INSET, y1], [PX0 + INSET, y1]];
    const dir = y1 > y0 ? 1 : -1;
    const k = new Block();
    k.fill(ribbon(cr([shape[0], shape[3]], 4), 1.8, { t0: 1, t1: 1 })).fill(ribbon(cr([shape[3], shape[2]], 8), 1.9, { t0: 1, t1: 1, wob: 0.25, R: R0 })).fill(ribbon(cr([shape[2], shape[1]], 4), 1.8, { t0: 1, t1: 1 })).fill(ribbon(cr([[PX0, y0 + dir * 0.7], [PX1, y0 + dir * 0.7]], 8), 1.9, { t0: 1, t1: 1, wob: 0.25, R: R0 }));
    const r = [[PX0 + 27, y1 - dir * 6], [PX1 - 27, y1 - dir * 6], [PX1 - 27, y1 - dir * 7.5], [PX0 + 27, y1 - dir * 7.5]];
    svg(name, box,
        `<clipPath id="c"><path d="M${pl(shape)}Z"/></clipPath><g clip-path="url(#c)"><rect x="${PX0}" y="${top}" width="${PX1 - PX0}" height="${FLAP}" fill="${INK.paperLt}"/>` +
        fibres(box, 720 + y0, 46) + `<path d="${flecks(box, 730 + y0, 30)}" fill="${INK.shell}"/><path d="M${pl(r)}Z" fill="${INK.red}"/></g>${k.draw(INK.soot)}`);
}
/* The shell sheen of the closed parcel: flecks that brighten and fade. */
svg('glint', [PX0, SY0, PX1 - PX0, SY1 - SY0], `<path d="${flecks([PX0 + 3, SY0 + 3, PX1 - PX0 - 6, SY1 - SY0 - 6], 741, 170, 1.7)}" fill="${INK.shell}"/>`);

/* The cord: round the parcel both ways, a bow of two loops, two tails. */
{
    const [kx, ky] = KNOT;
    const tailA = cr([[kx - 2, ky + 2], [kx - 12, ky + 13], [kx - 17, ky + 28], [kx - 29, ky + 40]], 6);
    const tailB = cr([[kx + 2, ky + 2], [kx + 13, ky + 14], [kx + 15, ky + 31], [kx + 26, ky + 46]], 6);
    // a frayed tassel: a bound collar, then loose strands of both colours
    const tuft = ([x, y], a) => {
        let s = '', top = '';
        const at = (d, len) => [x + len * Math.cos(rad(a + d)), y + len * Math.sin(rad(a + d))];
        [-34, -20, -7, 6, 19, 33].forEach((d, i) => {
            const len = 9 + ((i * 7) % 5) * 0.9, bend = (i % 2 ? 1 : -1) * 5;
            const q = cr([at(d * 0.3, 1), at(d * 0.8 + bend * 0.4, len * 0.55), at(d + bend, len)], 3);
            s += `<path d="M${pl(ribbon(q, 2.6, { t0: 1, t1: 0.5 }))}Z" fill="${INK.soot}"/>`;
            top += `<path d="M${pl(ribbon(q.slice(0, -1), 1.2, { t0: 1, t1: 0.5 }))}Z" fill="${i % 2 ? INK.yellow : INK.red}"/>`;
        });
        return s + top + `<path d="M${pl([at(-90, 3.6), at(-38, 4.4), at(38, 4.4), at(90, 3.6), at(142, 4.4), at(-142, 4.4)])}Z" fill="${INK.soot}"/>`;
    };
    svg('cord', [PX0 - 6, SY0 - 4, PX1 - PX0 + 12, SY1 - SY0 + 8],
        cord([[PX0 - 2, ky], [PX1 + 2, ky]]) + cord([[kx, SY0 - 1], [kx, SY1 + 1]]) +
        tuft(tailA[tailA.length - 1], 135) + tuft(tailB[tailB.length - 1], 58) + cord(tailA, 5) + cord(tailB, 5));
    for (const side of [-1, 1]) {
        const X = x => kx + side * x;
        const loop = cr([[X(1), ky - 1], [X(14), ky - 15], [X(31), ky - 22], [X(41), ky - 14], [X(35), ky - 3], [X(16), ky + 1], [X(1), ky + 1]], 6);
        svg(side < 0 ? 'loop-l' : 'loop-r', side < 0 ? [kx - 48, ky - 30, 52, 38] : [kx - 4, ky - 30, 52, 38], cord(loop, 5));
    }
    const knot = cr(circle(kx, ky, 6.4, 8, 0.12, R0), 2, true);
    svg('knot', [kx - 10, ky - 10, 20, 20],
        `<path d="M${pl(knot)}Z" fill="${INK.soot}"/><path d="M${pl(cr(circle(kx - 0.5, ky - 0.4, 4.6, 8, 0.1, R0), 2, true))}Z" fill="${INK.red}"/>` +
        `<path d="M${pl(ribbon(cr([[kx - 4, ky + 2.6], [kx, ky - 0.4], [kx + 4, ky - 2.8]], 3), 2.2, { t0: 0.5, t1: 0.5 }))}Z" fill="${INK.yellow}"/>` +
        `<path d="M${pl([[kx - 4.4, ky + 0.2], [kx + 2.2, ky - 4.4]])}M${pl([[kx - 2, ky + 4.4], [kx + 4.6, ky - 0.2]])}" fill="none" stroke="${INK.soot}" stroke-width="0.8"/>`);
}

/* One loose peach petal, for the fall at the end. */
{
    const p = cr([[179, 209.4], [175.4, 204], [175.2, 199], [178.6, 196.2], [183, 197.4], [185, 201.6], [183.4, 206]], 3, true);
    svg('petal', [172, 194, 16, 18], `<path d="M${pl(move(p, 0.9, -0.7))}Z" fill="${INK.red}"/><path d="M${pl([...p, p[0]])}" fill="none" stroke="${INK.soot}" stroke-width="1.1" stroke-linejoin="round"/>`);
}

console.log(JSON.stringify(BOX));
