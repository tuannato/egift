// Generator for the "latte" wrapper art, drawn as a CAFE SKETCHBOOK page: a loose two-colour ink sketch
// (sepia fountain pen and one teal ink) with real coffee as the only wash.
//   - Pen: every contour is a thin ribbon whose width follows the pressure of the hand, wobbles, tapers
//     into a flick, is sometimes restated beside itself, and leaves a blot where the nib rested.
//   - Shadow: quick hatching, never a gradient.
//   - Coffee: stains with a pale middle and a dark, uneven dried edge (ring stains, drips, splashes); the
//     crema in the cup is the same coffee, laid thicker. The latte art is the bare paper left in it.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/latte.gen.mjs && node scripts/wrap-art.mjs --write
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'latte');
if (!OUT.endsWith('wrappers/latte')) throw new Error('out dir must be public/wrappers/latte');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

const PAPER = '#EFE3CA';
const WHITE = '#FBF6EA'; // porcelain, milk: the paper left bare (a shade lighter so the cup reads white)
const INK = '#3E2616'; // sepia
const INK2 = '#28170C'; // where the pen pressed
const COFFEE = '#8E5E34'; // the wash
const DARK = '#55331A'; // dried edge
const CREMA = '#B07E4E';
const ESPRESSO = '#3A2113';
const TEAL = '#1E6A6C';
const TABLE = '#382215';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const f1 = (n) => String(Math.round(n * 10) / 10);
const f2 = (n) => String(Math.round(n * 100) / 100);
const P = (p) => `${f2(p[0])} ${f2(p[1])}`;
const P1 = (p) => `${f1(p[0])} ${f1(p[1])}`;

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

let DEFS = '';
let uid = 0;
const FILTERS =
    `<filter id="sf" x="-0.3" y="-0.3" width="1.6" height="1.6"><feGaussianBlur stdDeviation="0.5"/></filter>`;

const sizes = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    const text = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}"><defs>${FILTERS}${DEFS}</defs>${inner}</svg>`;
    writeFileSync(join(OUT, `${name}.svg`), text);
    sizes[name] = text.length;
    DEFS = '';
}

// ---------------------------------------------------------------- geometry
function ell(cx, cy, rx, ry, a0, a1, n = 48) {
    const o = [];
    for (let i = 0; i <= n; i += 1) {
        const a = lerp(a0, a1, i / n);
        o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return o;
}
function at(poly, t) {
    const f = Math.min(Math.max(t, 0), 1) * (poly.length - 1);
    const i = Math.min(Math.floor(f), poly.length - 2);
    return [lerp(poly[i][0], poly[i + 1][0], f - i), lerp(poly[i][1], poly[i + 1][1], f - i)];
}
function rot(p, a, c = [0, 0]) {
    const x = p[0] - c[0];
    const y = p[1] - c[1];
    return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)];
}
/** Catmull-Rom through the points, as cubic beziers. */
function crPath(pts, closed = false, fmt = P1) {
    const n = pts.length;
    const g = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.min(Math.max(i, 0), n - 1)]);
    let d = `M${fmt(pts[0])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i += 1) {
        const p0 = g(i - 1);
        const p1 = g(i);
        const p2 = g(i + 1);
        const p3 = g(i + 2);
        d += `C${fmt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${fmt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${fmt(p2)}`;
    }
    return d + (closed ? 'Z' : '');
}
/** A dense polyline along the Catmull-Rom spline through a few points. */
function spline(pts, per = 8) {
    const n = pts.length;
    const g = (i) => pts[Math.min(Math.max(i, 0), n - 1)];
    const out = [];
    for (let i = 0; i < n - 1; i += 1) {
        const p0 = g(i - 1);
        const p1 = g(i);
        const p2 = g(i + 1);
        const p3 = g(i + 2);
        for (let k = 0; k < per; k += 1) {
            const t = k / per;
            const t2 = t * t;
            const t3 = t2 * t;
            out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
        }
    }
    out.push(pts[n - 1]);
    return out;
}
function resample(pts, step) {
    const L = [0];
    for (let i = 1; i < pts.length; i += 1) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = L[L.length - 1];
    const n = Math.max(3, Math.round(total / step));
    const out = [];
    let j = 0;
    for (let k = 0; k <= n; k += 1) {
        const s = (total * k) / n;
        while (j < pts.length - 2 && L[j + 1] < s) j += 1;
        const t = (s - L[j]) / (L[j + 1] - L[j] || 1);
        out.push([lerp(pts[j][0], pts[j + 1][0], t), lerp(pts[j][1], pts[j + 1][1], t)]);
    }
    return { pts: out, total };
}
function blobPts(r, cx, cy, rx, ry, wob = 0.15, n = 9, ra = 0) {
    const o = [];
    const ph = r() * TAU;
    for (let i = 0; i < n; i += 1) {
        const a = ph + ((i + (r() - 0.5) * 0.5) / n) * TAU;
        const k = 1 + wob * (r() - 0.5) * 2;
        o.push(rot([rx * k * Math.cos(a), ry * k * Math.sin(a)], ra));
    }
    return o.map((p) => [p[0] + cx, p[1] + cy]);
}

// ---------------------------------------------------------------- the pen
function qClosed(p, P = P1) {
    const n = p.length;
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let d = `M${P(m(p[n - 1], p[0]))}`;
    for (let i = 0; i < n; i += 1) d += `Q${P(p[i])} ${P(m(p[i], p[(i + 1) % n]))}`;
    return d + 'Z';
}
/** One stroke of the fountain pen: a ribbon with pressure, wobble and a flick at the end. */
function pen(r, raw, o = {}) {
    const { w = 1, wob = 0.5, t0 = 0.55, t1 = 0.12, col = INK, op = 1, step = 6, l0 = 6, l1 = 11 } = o;
    const { pts, total } = resample(raw, step);
    const p1 = r() * TAU;
    const p2 = r() * TAU;
    const p3 = r() * TAU;
    const p4 = r() * TAU;
    const n = pts.length;
    const L = [];
    const R = [];
    for (let i = 0; i < n; i += 1) {
        const s = (total * i) / (n - 1);
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(n - 1, i + 1)];
        const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const nx = -(b[1] - a[1]) / d;
        const ny = (b[0] - a[0]) / d;
        const off = wob * (0.65 * Math.sin(s / 19 + p1) + 0.35 * Math.sin(s / 7.3 + p2));
        let ww = w * (0.74 + 0.3 * Math.sin(s / 27 + p3)) * (1 + 0.16 * Math.sin(s / 5.1 + p4));
        ww *= Math.min(1, t0 + ((1 - t0) * s) / l0) * Math.min(1, t1 + ((1 - t1) * (total - s)) / l1);
        const x = pts[i][0] + nx * off;
        const y = pts[i][1] + ny * off;
        L.push([x + (nx * ww) / 2, y + (ny * ww) / 2]);
        R.push([x - (nx * ww) / 2, y - (ny * ww) / 2]);
    }
    return `<path d="${qClosed(L.concat(R.reverse()), w < 0.8 ? P : P1)}" fill="${col}"${op < 1 ? ` fill-opacity="${f2(op)}"` : ''}/>`;
}
function blotAt(r, x, y, s, col = INK) {
    return `<path d="${crPath(blobPts(r, x, y, s, s * (0.65 + r() * 0.5), 0.3, 6, r() * 3), true, P)}" fill="${col}"/>`;
}
/** A drawn line: the stroke, sometimes restated beside itself, sometimes with a blot where the nib rested. */
function ink(r, raw, o = {}) {
    const { re = 0.4, blot = 0.35, w = 1, col = INK } = o;
    let s = pen(r, raw, o);
    if (r() < re && raw.length > 8) {
        const a = Math.floor(raw.length * r() * 0.4);
        const b = Math.min(raw.length, a + Math.floor(raw.length * (0.3 + r() * 0.35)));
        const dx = (r() - 0.5) * 2.4;
        const dy = (r() - 0.5) * 2.4;
        s += pen(r, raw.slice(a, b).map((p) => [p[0] + dx, p[1] + dy]), { ...o, w: w * 0.6, op: (o.op ?? 1) * 0.55, t0: 0.2, t1: 0.1 });
    }
    if (r() < blot) {
        const p = raw[r() < 0.5 ? 0 : raw.length - 1];
        s += blotAt(r, p[0], p[1], w * (0.7 + r() * 0.7), col);
    }
    return s;
}
/** Quick hatching from one edge towards another. */
function hatchBetween(r, A, B, o = {}) {
    const { n = 20, skew = 0.06, w = 0.65, op = 0.6, col = INK, from = 0, to = 1, len = [0.7, 1.05], env = null } = o;
    const g = ['', '', ''];
    for (let i = 0; i < n; i += 1) {
        const t = lerp(from, to, (i + r() * 0.75) / n);
        const a = at(A, t);
        const b = at(B, t + skew);
        const s0 = -0.05 + r() * 0.12;
        const s1 = (len[0] + r() * (len[1] - len[0])) * (env ? env((t - from) / (to - from || 1)) : 1);
        const p = [lerp(a[0], b[0], s0), lerp(a[1], b[1], s0)];
        const q = [lerp(a[0], b[0], s1), lerp(a[1], b[1], s1)];
        const k = (r() - 0.5) * 0.12;
        const m = [(p[0] + q[0]) / 2 - (q[1] - p[1]) * k, (p[1] + q[1]) / 2 + (q[0] - p[0]) * k];
        g[Math.floor(r() * 3)] += `M${P1(p)}Q${P1(m)} ${P1(q)}`;
    }
    return g.map((d, i) => (d ? `<path d="${d}" fill="none" stroke="${col}" stroke-linecap="round" stroke-width="${f2(w * (0.7 + i * 0.3))}" stroke-opacity="${f2(op * (1 - i * 0.14))}"/>` : '')).join('');
}
/** Hatching across a shape (clipped to it): for cast shadows. */
function hatchClip(r, d, box, ang, gap, o = {}) {
    const { w = 0.65, op = 0.55, col = INK } = o;
    const id = `h${(uid += 1)}`;
    DEFS += `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
    const [x0, y0, x1, y1] = box;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const R = Math.hypot(x1 - x0, y1 - y0) / 2;
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const g = ['', '', ''];
    for (let q = -R; q <= R; q += gap * (0.65 + r() * 0.7)) {
        const a = ang + (r() - 0.5) * 0.09;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        const px = cx + nx * q;
        const py = cy + ny * q;
        const a0 = -R * (0.55 + r() * 0.45);
        const a1 = R * (0.55 + r() * 0.45);
        g[Math.floor(r() * 3)] += `M${P1([px + dx * a0, py + dy * a0])}L${P1([px + dx * a1, py + dy * a1])}`;
    }
    return `<g clip-path="url(#${id})" fill="none" stroke="${col}" stroke-linecap="round">${g.map((dd, i) => (dd ? `<path d="${dd}" stroke-width="${f2(w * (0.7 + i * 0.3))}" stroke-opacity="${f2(op * (1 - i * 0.14))}"/>` : '')).join('')}</g>`;
}

// ---------------------------------------------------------------- coffee
/** A coffee stain: pale middle, dark dried edge that is heavier in some stretches than in others. */
function stainD(r, d, o = {}) {
    const { op = 0.15, rim = 0.5, rw = 1.2, col = COFFEE, rimCol = DARK, evenodd = false, soft = 'sf' } = o;
    const id = `k${(uid += 1)}`;
    const eo = evenodd ? ' fill-rule="evenodd"' : '';
    DEFS += `<clipPath id="${id}"><path d="${d}"${evenodd ? ' clip-rule="evenodd"' : ''}/></clipPath>`;
    let dash = '';
    for (let i = 0; i < 8; i += 1) dash += `${f1(6 + r() * 34)} ${f1(3 + r() * 22)} `;
    return (
        `<path d="${d}" fill="${col}" fill-opacity="${f2(op)}"${eo}/>` +
        `<g clip-path="url(#${id})" fill="none" stroke="${rimCol}">` +
        `<path d="${d}" stroke-width="${f2(rw * 2)}" stroke-opacity="${f2(rim * 0.75)}" filter="url(#sf)"/>` +
        `<path d="${d}" stroke-width="${f2(rw * 1.5)}" stroke-opacity="${f2(rim)}" stroke-dasharray="${dash.trim()}" filter="url(#sf)"/>` +
        `</g>`
    );
}
const stain = (r, pts, o) => stainD(r, crPath(pts, true), o);
/** The ring a wet cup leaves: an uneven band, darkest at its two edges. */
function ring(r, cx, cy, R, th, o = {}) {
    const n = 14;
    const outer = blobPts(r, cx, cy, R, R * (0.94 + r() * 0.08), 0.035, n, r());
    const inner = blobPts(r, cx + (r() - 0.5) * th * 0.5, cy + (r() - 0.5) * th * 0.5, R - th, (R - th) * (0.94 + r() * 0.08), 0.05, n, r()).reverse();
    return stainD(r, crPath(outer, true) + crPath(inner, true), { ...o, evenodd: true });
}
/** A splash: one drop and its satellites. */
function splash(r, x, y, s, o = {}) {
    let out = stain(r, blobPts(r, x, y, s, s * (0.7 + r() * 0.4), 0.22, 7, r() * 3), { op: 0.32, rim: 0.75, rw: Math.max(0.5, s * 0.22), ...o });
    const k = 1 + Math.floor(r() * 3);
    for (let i = 0; i < k; i += 1) {
        const a = r() * TAU;
        const d = s * (1.6 + r() * 2.2);
        out += `<circle cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d)}" r="${f2(0.35 + r() * s * 0.22)}" fill="${DARK}" fill-opacity="${f2(0.4 + r() * 0.3)}"/>`;
    }
    return out;
}

// ---------------------------------------------------------------- the scene
const CUP = { cx: 192, cy: 214, rx: 116, ry: 88, drop: 64 };
const LIP = { cx: 192, cy: 216, rx: 109.5, ry: 82 };
const BOT = { cx: 192, cy: 261, rx: 45, ry: 33 };
const SURF = { cx: 192, cy: 219.5, rx: 104, ry: 78 };
const SAUCER = { cx: 192, cy: 280, rx: 156, ry: 116 };
const FULL = [0, 0, 360, 450];
const SB = [84, 138, 216, 164]; // the box of everything on the surface of the coffee

/** The outline of the bowl below the rim, as the eye sees it: the lowest point of every ring of the cup. */
function silhouette() {
    const Rh = (h) => CUP.rx * (1 - 0.52 * Math.pow(h, 1.7));
    const pts = [];
    for (let x = CUP.cx - CUP.rx + 0.5; x <= CUP.cx + CUP.rx - 0.4; x += 3) {
        let best = -1e9;
        for (let h = 0; h <= 1.0001; h += 0.02) {
            const R = Rh(h);
            const u = (x - CUP.cx) / R;
            if (Math.abs(u) < 1) best = Math.max(best, CUP.cy + CUP.drop * h + (CUP.ry / CUP.rx) * R * Math.sqrt(1 - u * u));
        }
        pts.push([x, best]);
    }
    return pts;
}
const SIL = silhouette();
const thin = (pts, k) => pts.filter((_, i) => i % k === 0);
/** A crescent between an arc and a second arc, closing to nothing at both ends. */
const crescent = (A, B) => A.map((p, i) => { const e = Math.pow(Math.sin((Math.PI * i) / (A.length - 1)), 1.5); return [lerp(p[0], B[i][0], e), lerp(p[1], B[i][1], e)]; });
const bell = (t) => 0.2 + 0.8 * Math.pow(Math.sin(Math.PI * Math.min(Math.max(t, 0), 1)), 0.7);

// ---- ground: the sheet and what was spilled on it
{
    const r = rng(11);
    let s = `<rect x="-12" y="-12" width="384" height="474" fill="${PAPER}"/>`;
    // the paper is not one tone: where a wet hand and a damp cloth have been
    // old, thin washes of coffee, each dried to a hard edge
    for (const [x, y, rx, ry, ra, op] of [[150, 74, 168, 40, -0.1, 0.1], [50, 380, 92, 60, 0.2, 0.11], [338, 318, 48, 96, 0.1, 0.09]]) {
        s += stain(r, blobPts(r, x, y, rx, ry, 0.16, 11, ra), { op, rim: 0.22, rw: 0.9 });
    }
    // fibres
    for (let i = 0; i < 60; i += 1) {
        s += `<circle cx="${f1(-10 + r() * 380)}" cy="${f1(-10 + r() * 440)}" r="${f2(0.25 + r() * 0.45)}" fill="${r() < 0.75 ? DARK : WHITE}" fill-opacity="${f2(0.1 + r() * 0.2)}"/>`;
    }
    // the first, light setting-out lines of the drawing, still showing past the saucer
    s += pen(r, [[8, 219], [120, 216], [372, 209]], { w: 0.5, op: 0.24, wob: 0.8, t0: 0.3 });
    s += pen(r, [[186, 108], [190, 250], [193, 420]], { w: 0.5, op: 0.2, wob: 0.8, t0: 0.3 });
    s += pen(r, ell(192, 278, 166, 124, 2.3, 3.9, 30), { w: 0.5, op: 0.22, wob: 0.7 });
    s += pen(r, ell(192, 278, 168, 126, -0.75, 0.35, 24), { w: 0.5, op: 0.2, wob: 0.7 });
    s += pen(r, ell(192, 212, 124, 95, 3.6, 5.3, 30), { w: 0.5, op: 0.22, wob: 0.7 });

    // the ring where the cup stood before, top right; set down twice
    s += ring(r, 298, 84, 41, 6.5, { op: 0.22, rim: 0.66, rw: 1.3 });
    s += ring(r, 288, 92, 39, 2.6, { op: 0.08, rim: 0.3, rw: 0.8 });
    s += stain(r, blobPts(r, 304, 78, 19, 12, 0.3, 8, 0.4), { op: 0.07, rim: 0.2, rw: 0.8 });
    s += splash(r, 238, 76, 2.6) + splash(r, 226, 96, 1.2) + splash(r, 334, 146, 2.1) + splash(r, 204, 58, 1.5) + splash(r, 60, 62, 1.3);
    // a smaller ring, lower left, running off the sheet, and what dripped beside it
    s += ring(r, 44, 396, 31, 5, { op: 0.19, rim: 0.6, rw: 1.2 });
    s += stain(r, blobPts(r, 100, 404, 8, 5.5, 0.12, 11, 0.3), { op: 0.2, rim: 0.6, rw: 1 });
    s += splash(r, 122, 414, 2.2) + splash(r, 84, 388, 1.1) + splash(r, 28, 338, 1.6) + splash(r, 226, 414, 1.4);

    // the shadow of the saucer: a little wash, and hatching that leaves it on the side away from the light
    s += stain(r, blobPts(r, SAUCER.cx + 20, SAUCER.cy + 24, SAUCER.rx + 3, SAUCER.ry + 1, 0.025, 12, 0), { op: 0.2, rim: 0.5, rw: 1.1 });
    const shA = ell(SAUCER.cx, SAUCER.cy, SAUCER.rx + 1, SAUCER.ry + 1, -0.4, 1.95, 50);
    const shB = ell(SAUCER.cx + 24, SAUCER.cy + 28, SAUCER.rx + 5, SAUCER.ry + 3, -0.4, 1.95, 50);
    s += hatchBetween(r, shA, shB, { n: 84, skew: 0.03, w: 0.7, op: 0.58, len: [0.45, 1.0], env: bell });
    s += hatchBetween(r, shA, shB, { n: 34, skew: -0.07, w: 0.5, op: 0.42, len: [0.3, 0.8], env: bell, from: 0.15, to: 0.85 });
    svg('ground', [-12, -12, 384, 474], s);
}

// ---- things lying on the sheet: beans, the corner of a napkin
{
    const r = rng(12);
    let s = '';
    const bean = (x, y, a, k, seed) => {
        const q = rng(seed);
        const body = blobPts(q, 0, 0, 7.6 * k, 5 * k, 0.07, 9, 0).map((p) => rot(p, a)).map((p) => [p[0] + x, p[1] + y]);
        const T = (p) => { const z = rot([p[0] * k, p[1] * k], a); return [z[0] + x, z[1] + y]; };
        let o = hatchClip(q, crPath(blobPts(q, x + 3.5 * k, y + 4.4 * k, 8.5 * k, 3.8 * k, 0.15, 8, 0.2), true), [x - 8 * k, y - 2, x + 13 * k, y + 9 * k], 0.5, 1.7, { op: 0.5, w: 0.55 });
        o += `<path d="${crPath(body, true)}" fill="${PAPER}"/>` + stain(q, body, { op: 0.6, rim: 0.8, rw: 1.3, col: COFFEE, rimCol: ESPRESSO });
        o += ink(q, spline(body.concat([body[0], body[1]]), 4), { w: 0.9, re: 0.3, blot: 0.5 });
        const crease = spline([T([-6.4, 0.5]), T([-3, -1.4]), T([0, 0.2]), T([3, 1.6]), T([6.3, 0.2])], 5);
        o += pen(q, crease, { w: 1.5, col: INK2, wob: 0.2, t0: 0.3, t1: 0.2, step: 3 });
        o += pen(q, crease.map((p) => T([0, -1.1]).map((v, j) => p[j] + v - [x, y][j])), { w: 0.55, col: WHITE, op: 0.5, wob: 0.2, step: 3 });
        return o;
    };
    s += bean(281, 127, 0.5, 1.0, 5) + bean(313, 112, -0.9, 0.92, 6) + bean(325, 166, 1.9, 1.05, 7) + bean(246, 58, 2.6, 0.86, 8) + bean(152, 416, 0.25, 0.98, 9) + bean(66, 356, -0.5, 0.8, 10);

    // the corner of a paper napkin, bottom right, with its woven stripe
    const C = [262, 399];
    const U = [0.914, -0.405]; // along its upper edge
    const V = [0.75, 0.66]; // along its other edge
    const at2 = (u, v) => [C[0] + U[0] * u + V[0] * v, C[1] + U[1] * u + V[1] * v];
    s += hatchClip(r, `M${P1(at2(-2, 6))}L${P1(at2(-10, 70))}L${P1(at2(0, 70))}Z`, [250, 396, 320, 450], 0.2, 2.2, { op: 0.5 });
    s += hatchClip(r, `M${P1(at2(4, -1))}L${P1(at2(130, -1))}L${P1(at2(130, -7))}Z`, [262, 340, 372, 404], -0.9, 2.4, { op: 0.4 });
    s += `<path d="M${[at2(0, 0), at2(140, 0), at2(140, 80), at2(0, 80)].map(P1).join('L')}Z" fill="#F7F0E0"/>`;
    s += ink(r, spline([at2(125, 0.5), at2(60, 0), at2(0, 0.5)], 8), { w: 1.0, re: 1 });
    s += ink(r, spline([at2(0, 0), at2(0.6, 30), at2(0, 62)], 8), { w: 1.25, re: 0.3, blot: 1 });
    s += pen(r, spline([at2(125, 9), at2(60, 9.5), at2(1.5, 9)], 8), { w: 1.4, col: TEAL, wob: 0.4 });
    s += pen(r, spline([at2(125, 13.5), at2(60, 13), at2(2, 13.5)], 8), { w: 0.7, col: TEAL, wob: 0.5, op: 0.85 });
    s += hatchBetween(r, [at2(3, 17), at2(125, 17)], [at2(3, 27), at2(125, 27)], { n: 40, w: 0.45, op: 0.4, col: TEAL, skew: 0.01 });
    s += pen(r, spline([at2(125, 31), at2(60, 31.5), at2(2, 31)], 8), { w: 0.7, col: TEAL, wob: 0.5, op: 0.85 });
    s += pen(r, spline([at2(30, 2), at2(34, 30), at2(31, 60)], 6), { w: 0.5, op: 0.4, wob: 0.6 }); // a crease
    s += pen(r, spline([at2(78, 2), at2(80, 30), at2(79, 50)], 6), { w: 0.5, op: 0.3, wob: 0.6 });
    // the foot of the sheet: the edge of the sketchbook and the dark table it lies on
    const edge = (dy) => { const o = []; for (let x = -12; x <= 372; x += 16) o.push([x, 432 - (x + 12) * 0.022 + dy + Math.sin(x / 31) * 0.5]); return o; };
    const top = edge(0);
    s += `<path d="M${top.map(P1).join('L')}L372 462L-12 462Z" fill="${TABLE}"/>`;
    s += hatchBetween(r, edge(-1), edge(-11), { n: 100, skew: 0.012, w: 0.5, op: 0.4, len: [0.25, 1.0] });
    s += pen(r, edge(-2.6), { w: 0.6, op: 0.55, wob: 0.3 }) + pen(r, edge(-5.0), { w: 0.5, op: 0.3, wob: 0.3 });
    s += pen(r, edge(0.3), { w: 1.7, col: INK2, wob: 0.3, t0: 1, t1: 1 });
    for (let i = 0; i < 26; i += 1) {
        const x = -12 + r() * 384;
        const y = 436 + r() * 22;
        const l = 14 + r() * 50;
        s += `<path d="M${f1(x)} ${f1(y)}Q${f1(x + l / 2)} ${f1(y - 0.6 - r())} ${f1(x + l)} ${f1(y - l * 0.022)}" fill="none" stroke="${r() < 0.6 ? '#1F1209' : '#6A452A'}" stroke-width="${f2(0.5 + r() * 0.7)}" stroke-opacity="${f2(0.35 + r() * 0.4)}" stroke-linecap="round"/>`;
    }
    svg('things', [-12, -12, 384, 474], s);
}

let SAUCER_ART = '';
// ---- saucer: porcelain, a teal rim
{
    const r = rng(21);
    const { cx, cy, rx, ry } = SAUCER;
    const outer = blobPts(r, cx, cy, rx, ry, 0.006, 26, 0);
    let s = `<path d="${crPath(outer, true)}" fill="${WHITE}"/>`;
    // the thickness of the rim on the near side
    s += pen(r, ell(cx, cy + 3.4, rx - 1, ry, 0.12, 3.0, 60), { step: 9, w: 0.9, wob: 0.5, op: 0.8 });
    s += hatchBetween(r, ell(cx, cy, rx, ry, 0.2, 1.5, 40), ell(cx, cy + 4, rx, ry, 0.2, 1.5, 40), { n: 42, w: 0.55, op: 0.6, skew: 0.004, len: [0.6, 1.1] });
    // the teal band: the accent ink, hatched across the rim, never quite filled
    const b0 = 0.97;
    const b1 = 0.892;
    s += `<path d="${crPath(ell(cx, cy, rx * b0, ry * b0, 0, TAU, 40).slice(0, -1), true)}${crPath(ell(cx, cy - 1, rx * b1, ry * b1, 0, TAU, 40).slice(0, -1).reverse(), true)}" fill="${TEAL}" fill-opacity="0.2" fill-rule="evenodd"/>`;
    const g = ['', '', ''];
    for (let a = 0; a < TAU; a += 0.016 + r() * 0.014) {
        if (Math.sin(a * 3.1 + 1) > 0.93 && r() < 0.8) continue; // where the nib ran dry
        const k0 = b0 + (r() - 0.5) * 0.012;
        const k1 = b1 + (r() - 0.5) * 0.018;
        const a2 = a + 0.04;
        g[Math.floor(r() * 3)] += `M${P1([cx + rx * k0 * Math.cos(a), cy + ry * k0 * Math.sin(a)])}L${P1([cx + rx * k1 * Math.cos(a2), cy - 1 + ry * k1 * Math.sin(a2)])}`;
    }
    s += g.map((d, i) => `<path d="${d}" fill="none" stroke="${TEAL}" stroke-linecap="round" stroke-width="${f2(0.55 + i * 0.3)}" stroke-opacity="${f2(0.9 - i * 0.12)}"/>`).join('');
    s += pen(r, ell(cx, cy, rx * b0, ry * b0, 0.4, TAU + 0.7, 110), { step: 9, w: 1.0, col: TEAL, wob: 0.5 });
    s += pen(r, ell(cx, cy - 1, rx * b1, ry * b1, 2.0, TAU + 2.2, 100), { step: 9, w: 0.8, col: TEAL, wob: 0.6 });
    // the contour: heavier near, lighter and broken far
    s += ink(r, ell(cx, cy, rx, ry, -0.1, 3.3, 80), { step: 9, w: 1.6, wob: 0.6, re: 1, blot: 1 });
    s += pen(r, ell(cx, cy, rx, ry, 3.22, 4.5, 40), { step: 9, w: 0.9, wob: 0.6 });
    s += pen(r, ell(cx, cy, rx, ry, 4.62, TAU - 0.02, 40), { step: 9, w: 1.0, wob: 0.6 });
    // the well the cup stands in: only where it shows on the lit side
    s += pen(r, ell(cx, cy + 2, 84, 60, 1.75, 3.05, 30), { step: 9, w: 0.6, op: 0.6, wob: 0.6 });
    // the shadow of the cup on it: a little coffee wash, soft, and hatching
    const under = SIL.filter((p) => p[0] > cx - 40).map((p) => [p[0], p[1] - 3]);
    const cast = under.map((p) => [p[0] + 24, p[1] + 20]);
    s += stain(r, thin(under, 3).concat(thin(crescent(under, cast), 3).reverse().slice(1, -1)), { op: 0.2, rim: 0.5, rw: 1.0 });
    s += hatchBetween(r, under, cast, { n: 64, skew: 0.02, w: 0.7, op: 0.62, len: [0.5, 1.0], env: bell });
    s += hatchBetween(r, under, cast, { n: 32, skew: -0.08, w: 0.5, op: 0.45, len: [0.3, 0.8], env: bell, from: 0.12, to: 0.9 });
    // the dish of the saucer turning down towards the well, on the side away from the light
    s += hatchBetween(r, ell(cx, cy - 1, rx * 0.885, ry * 0.885, 0.25, 1.35, 30), ell(cx, cy, rx * 0.8, ry * 0.8, 0.25, 1.35, 30), { n: 38, skew: 0.02, w: 0.5, op: 0.42, len: [0.3, 0.9], env: bell });
    s += hatchBetween(r, ell(cx, cy - 1, rx * 0.885, ry * 0.885, 2.1, 3.6, 30), ell(cx, cy, rx * 0.84, ry * 0.84, 2.1, 3.6, 30), { n: 28, skew: 0.02, w: 0.45, op: 0.3, len: [0.3, 0.8], env: bell });
    SAUCER_ART = s;
}

// ---- spoon: on the saucer, lower left
{
    const r = rng(31);
    const A = 52 * DEG;
    const O = [66, 296];
    const K = 1.08;
    const T = (p) => { const z = rot([p[0] * K, p[1] * K], A); return [z[0] + O[0], z[1] + O[1]]; };
    const bowl = [];
    for (let i = 0; i < 28; i += 1) {
        const a = (i / 28) * TAU;
        const egg = 1 - 0.14 * Math.cos(a); // wider towards the tip
        bowl.push(T([15 * Math.cos(a) - 1, 10 * egg * Math.sin(a)]));
    }
    const hU = spline([[12.5, -2.8], [22, -1.7], [50, -2.1], [78, -3.6], [90, -4.6], [95, -1.5]].map(T), 8);
    const hL = spline([[12.5, 2.8], [22, 1.7], [50, 2.1], [78, 3.6], [90, 4.6], [95, 1.5]].map(T), 8);
    let s = '';
    // its shadow
    const sh = (p) => [p[0] + 4.5, p[1] + 5.5];
    s += hatchClip(r, crPath(bowl.map(sh), true) + `M${hU.map(sh).map(P1).join('L')}L${hL.map(sh).reverse().map(P1).join('L')}Z`, [50, 280, 150, 400], -0.5, 1.9, { op: 0.6, w: 0.6 });
    s += `<path d="${crPath(bowl, true)}" fill="${WHITE}"/><path d="M${hU.map(P1).join('L')}L${hL.slice().reverse().map(P1).join('L')}Z" fill="${WHITE}"/>`;
    s += ink(r, spline(bowl.concat([bowl[0], bowl[1], bowl[2]]), 3), { w: 1.3, wob: 0.35, re: 0.9, blot: 1 });
    s += ink(r, hU, { w: 1.0, wob: 0.4, re: 0.6 }) + ink(r, hL, { w: 1.4, wob: 0.4, re: 0.2, col: INK2 });
    // the hollow: an inner line and hatching on the side away from the light
    const inner = [];
    for (let i = 0; i <= 16; i += 1) { const a = lerp(0.2, 3.5, i / 16); inner.push(T([11 * Math.cos(a) - 1.5, 6.8 * Math.sin(a) + 0.4])); }
    s += pen(r, inner, { w: 0.7, wob: 0.3, op: 0.85, step: 3 });
    const hA = [];
    const hB = [];
    for (let i = 0; i <= 12; i += 1) { const a = lerp(0.1, 2.6, i / 12); hA.push(T([13.5 * Math.cos(a) - 1, 8.8 * Math.sin(a)])); hB.push(T([5 * Math.cos(a) - 2, 2.4 * Math.sin(a) + 1])); }
    s += hatchBetween(r, hA, hB, { n: 16, w: 0.5, op: 0.7, len: [0.4, 0.85] });
    s += hatchBetween(r, hL.slice(8, 40), hU.slice(8, 40), { n: 16, w: 0.45, op: 0.5, len: [0.3, 0.6], skew: 0.03 });
    svg('saucer', FULL, SAUCER_ART + s);
}

// ---- cup: empty
{
    const r = rng(41);
    const { cx, cy, rx, ry } = CUP;
    let s = '';
    // the handle, behind the bowl, lower right
    const hOut = spline([[278, 250], [301, 255], [317, 274], [314, 297], [295, 310], [267, 306]], 8);
    const hIn = spline([[283, 265], [298, 268.5], [305, 281], [302, 292.5], [291, 298.5], [276, 295]], 8);
    s += `<path d="M${hOut.map(P1).join('L')}Z" fill="${WHITE}"/>`;
    s += `<path d="M${hIn.map(P1).join('L')}Z" fill="${WHITE}"/>`;
    s += hatchClip(r, `M${hIn.map(P1).join('L')}Z`, [272, 262, 308, 302], 0.8, 1.7, { op: 0.6 });
    s += ink(r, hOut, { w: 1.7, wob: 0.5, re: 0.8, blot: 1, col: INK2 }) + ink(r, hIn, { w: 1.0, wob: 0.4, re: 0.3 });
    s += hatchBetween(r, hOut.slice(22, 40), hIn.slice(22, 40), { n: 12, w: 0.5, op: 0.6, len: [0.25, 0.6] });
    // the bowl
    const rim = ell(cx, cy, rx, ry, 0, TAU, 64).slice(0, -1);
    s += `<path d="M${SIL.map(P1).join('L')}Z" fill="${WHITE}"/><path d="${crPath(rim, true)}" fill="${WHITE}"/>`;
    // outside, the side away from the light: a coffee wash that runs past the line, and hatching over it
    const right = SIL.filter((p) => p[0] > cx + 6);
    const inset = right.map((p, i) => { const t = i / (right.length - 1); const d = 4 + 26 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.7); const v = [cx - p[0], cy + 16 - p[1]]; const l = Math.hypot(v[0], v[1]); return [p[0] + (v[0] / l) * d, p[1] + (v[1] / l) * d]; });
    s += stain(r, thin(right, 3).map((p) => [p[0] + 1.5, p[1] + 2]).concat(thin(inset, 3).reverse()), { op: 0.16, rim: 0.28, rw: 1.2 });
    s += hatchBetween(r, right, inset, { n: 50, skew: -0.05, w: 0.6, op: 0.62, len: [0.45, 1.0] });
    s += hatchBetween(r, right, inset, { n: 18, skew: 0.09, w: 0.5, op: 0.42, from: 0.2, to: 0.75, len: [0.3, 0.7] });
    // the outline of the bowl: firm under, where the weight is
    const n3 = Math.floor(SIL.length / 3);
    s += ink(r, SIL.slice(2, n3 + 4), { w: 1.2, wob: 0.5, re: 0.5 });
    s += ink(r, SIL.slice(n3, 2 * n3 + 4), { w: 1.9, wob: 0.5, re: 0.7, col: INK2 });
    s += ink(r, SIL.slice(2 * n3, SIL.length - 1), { w: 1.4, wob: 0.5, re: 0.4, blot: 1 });

    // inside: the far wall in its own shadow, deepest at the upper left, closing to nothing at both ends
    const a0 = 138 * DEG;
    const a1 = 318 * DEG;
    const lipA = ell(LIP.cx, LIP.cy, LIP.rx * 0.985, LIP.ry * 0.985, a0, a1, 48);
    const midA = ell(cx, cy + 26, 70, 50, a0, a1, 48);
    const deepA = ell(cx, cy + 20, 86, 63, a0, a1, 48);
    s += stain(r, thin(lipA, 3).concat(thin(crescent(lipA, midA), 3).reverse().slice(1, -1)), { op: 0.15, rim: 0.36, rw: 0.9 });
    s += stain(r, thin(lipA, 3).concat(thin(crescent(lipA, deepA), 3).reverse().slice(1, -1)), { op: 0.07, rim: 0.2, rw: 0.8 });
    s += hatchBetween(r, lipA, midA, { n: 84, skew: 0.03, w: 0.6, op: 0.58, len: [0.4, 0.95], env: bell });
    s += hatchBetween(r, lipA, deepA, { n: 60, skew: 0.11, w: 0.5, op: 0.42, len: [0.5, 1.0], env: bell, from: 0.1, to: 0.8 });
    s += hatchBetween(r, ell(LIP.cx, LIP.cy, LIP.rx * 0.97, LIP.ry * 0.97, 172 * DEG, 262 * DEG, 30), ell(cx, cy + 20, 84, 62, 172 * DEG, 262 * DEG, 30), { n: 34, skew: -0.1, w: 0.5, op: 0.45, len: [0.4, 0.9], env: bell });
    // the lit side of the wall: a few light strokes only
    s += hatchBetween(r, ell(LIP.cx, LIP.cy, LIP.rx * 0.98, LIP.ry * 0.98, 330 * DEG, 388 * DEG, 20), ell(cx, cy + 24, 82, 60, 330 * DEG, 388 * DEG, 20), { n: 12, w: 0.45, op: 0.32, len: [0.12, 0.34] });
    // the bottom of the cup: bare, with the shadow of the wall across it and one dry ring of an older coffee
    s += hatchBetween(r, ell(BOT.cx, BOT.cy, BOT.rx, BOT.ry, 150 * DEG, 300 * DEG, 30), ell(BOT.cx + 8, BOT.cy + 6, BOT.rx * 0.5, BOT.ry * 0.5, 150 * DEG, 300 * DEG, 30), { n: 28, skew: 0.03, w: 0.55, op: 0.55, len: [0.3, 0.85], env: bell });
    s += ink(r, ell(BOT.cx, BOT.cy, BOT.rx, BOT.ry, 2.6, 2.6 + TAU + 0.35, 60), { w: 0.85, wob: 0.6, re: 1, blot: 0 });
    s += ring(r, BOT.cx + 4, BOT.cy + 3, 27, 2.2, { op: 0.1, rim: 0.28, rw: 0.7 });
    // the rim: two lines for the thickness of the porcelain, the near one firm
    s += pen(r, ell(LIP.cx, LIP.cy, LIP.rx, LIP.ry, 0.5, 0.5 + TAU + 0.2, 110), { step: 8, w: 0.85, wob: 0.6 });
    s += ink(r, ell(cx, cy, rx, ry, 3.5, 3.5 + TAU * 0.52, 70), { step: 8, w: 1.0, wob: 0.6, re: 0.8, blot: 1 });
    s += ink(r, ell(cx, cy, rx, ry, 0.12, 3.25, 70), { step: 8, w: 1.7, wob: 0.6, re: 1, blot: 1, col: INK2 });
    // blots where the pen was put down
    s += blotAt(r, cx - rx - 0.5, cy + 2, 1.7) + blotAt(r, cx + rx + 0.5, cy + 4, 1.3) + blotAt(r, cx + 4, SIL[Math.floor(SIL.length / 2)][1] + 0.5, 1.2);
    svg('cup', FULL, s);
}

// ---- coffee: the crema — a flat wash of coffee ink, dried darker and blotchy at its edge, paler where it pooled
{
    const r = rng(51);
    const { cx, cy, rx, ry } = SURF;
    const edge = blobPts(r, cx, cy, rx, ry, 0.008, 28, 0);
    const d = crPath(edge, true);
    DEFS += `<clipPath id="surf"><path d="${d}"/></clipPath>`;
    const dashes = (n, a, b) => { let o = ''; for (let i = 0; i < n; i += 1) o += `${f1(a + r() * b)} ${f1(3 + r() * b * 0.45)} `; return o.trim(); };
    /** A tide line: the crisp, broken line a wash leaves where it stopped. */
    const tide = (dd, col, w, op) => `<path d="${dd}" fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-dasharray="${dashes(9, 8, 46)}"/>`;
    let s = `<path d="${d}" fill="${CREMA}"/><g clip-path="url(#surf)">`;
    // dried darker towards the edge, in two uneven bands with hard inner edges
    const in1 = crPath(blobPts(r, cx + 1, cy + 1, rx * 0.89, ry * 0.89, 0.04, 22, r()), true);
    const in2 = crPath(blobPts(r, cx - 1, cy, rx * 0.955, ry * 0.955, 0.022, 26, r()), true);
    s += `<path d="${d}${in1}" fill="${DARK}" fill-opacity="0.3" fill-rule="evenodd"/>`;
    s += `<path d="${d}${in2}" fill="${ESPRESSO}" fill-opacity="0.36" fill-rule="evenodd"/>`;
    s += tide(in1, ESPRESSO, 0.9, 0.55) + tide(in2, ESPRESSO, 0.7, 0.5);
    // paler where the wash pooled and was lifted
    const pool = crPath(blobPts(r, cx + 3, cy + 4, rx * 0.66, ry * 0.64, 0.1, 14, r()), true);
    s += `<path d="${pool}" fill="#CFA874" fill-opacity="0.5"/>` + tide(pool, COFFEE, 0.7, 0.6);
    // blotches where it dried unevenly
    for (let i = 0; i < 7; i += 1) {
        const a = r() * TAU;
        const k = 0.7 + r() * 0.2;
        const b = crPath(blobPts(r, cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, 5 + r() * 9, 3 + r() * 6, 0.25, 8, r() * 3), true);
        s += `<path d="${b}" fill="${DARK}" fill-opacity="0.17"/>` + tide(b, DARK, 0.6, 0.5);
    }
    // marbling in the crema near the rim
    for (let i = 0; i < 8; i += 1) {
        const a0 = r() * TAU;
        const q = 0.84 + r() * 0.12;
        s += pen(r, ell(cx, cy, rx * q, ry * q, a0, a0 + 0.35 + r() * 0.8, 16), { w: 0.7, col: i % 2 ? '#E0BE8E' : ESPRESSO, op: 0.7, wob: 0.8, step: 4, t0: 0.2 });
    }
    // the shadow of the rim on the coffee: hatched, twice
    s += hatchBetween(r, ell(cx, cy, rx, ry, 158 * DEG, 298 * DEG, 40), ell(cx + 6, cy + 6, rx * 0.84, ry * 0.84, 158 * DEG, 298 * DEG, 40), { n: 70, skew: 0.03, w: 0.6, op: 0.62, col: INK2, len: [0.4, 1.0], env: bell });
    s += hatchBetween(r, ell(cx, cy, rx, ry, 176 * DEG, 276 * DEG, 30), ell(cx + 4, cy + 4, rx * 0.9, ry * 0.9, 176 * DEG, 276 * DEG, 30), { n: 44, skew: -0.14, w: 0.5, op: 0.5, col: INK2, len: [0.5, 1.0], env: bell });
    // a few strokes on the lit side
    s += hatchBetween(r, ell(cx, cy, rx, ry, 20 * DEG, 80 * DEG, 20), ell(cx, cy, rx * 0.92, ry * 0.92, 20 * DEG, 80 * DEG, 20), { n: 16, skew: 0.05, w: 0.5, op: 0.4, col: INK2, len: [0.4, 0.9], env: bell });
    // bubbles in the crema, near the edge
    for (const [a, k, q] of [[0.5, 0.9, 1.8], [0.62, 0.84, 1.1], [0.35, 0.93, 0.9], [2.5, 0.91, 1.5], [2.64, 0.85, 0.9], [1.35, 0.93, 1.1], [5.6, 0.88, 1.2]]) {
        const x = cx + rx * k * Math.cos(a);
        const y = cy + ry * k * Math.sin(a);
        s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${q}" fill="#D9B383" fill-opacity="0.8"/>` + pen(r, ell(x, y, q, q * 0.9, 1, 1 + TAU * 0.8, 10), { w: 0.5, wob: 0.1, step: 1.5, col: INK2, op: 0.8 });
    }
    s += `</g>`;
    s += pen(r, ell(cx, cy, rx, ry, 0.3, 3.1, 60), { w: 0.6, wob: 0.4, op: 0.6, col: INK2 });
    svg('coffee', SB, s);
}

// ---- the rosetta: milk as the paper left bare in the coffee.
// One family of curves: every layer is the same shallow U (G), set one step further up the stem and cut off where
// the outline of the leaf is, so the white lines run parallel and the brown between them is even. Each is pulled
// down into a small V at the stem (dip) by the pull-through.
const ROS = { N: 10, a0: -0.64, da: 0.118, th: 0.082, ac: 0.02 };
const G = (b) => 0.2 * Math.pow(Math.abs(b) / 0.64, 2);
/** How far the two ends of a layer hook up round the layers above it: most at the base, which wraps the whole leaf. */
const curlOf = (t) => 0.05 + 0.13 * (1 - t) * (1 - t);
const dip = (b) => 0.03 * Math.exp(-((b / 0.04) ** 2));
/** Leaf coordinates (a up the stem from base to tip, b across), in radii of the surface, to the canvas. */
const leafPt = (a, b) => [SURF.cx + SURF.rx * b, SURF.cy - SURF.ry * (a - ROS.ac)];
const widthOf = (t) => 0.64 * Math.sqrt(1 - 0.9 * t * t);
const MILKEDGE = '#E2C79A';
const milk = (pts) => `<path d="${crPath(pts, true, P)}" fill="${WHITE}" stroke="${MILKEDGE}" stroke-width="0.55" stroke-linejoin="round"/>`;
const rosOrigins = [];
const fracY = (y) => Math.round(((y - SB[1]) / SB[3]) * 1000) / 1000;
for (let i = 0; i < ROS.N; i += 1) {
    const r = rng(61 + i * 7);
    const t = i / (ROS.N - 1);
    const ai = ROS.a0 + ROS.da * i;
    const w = widthOf(t) * (i === 0 ? 0.86 : i === 1 ? 0.96 : 1);
    const wl = w * (0.985 + r() * 0.03);
    const wr = w * (0.985 + r() * 0.03);
    const ph = r() * TAU;
    const ph2 = r() * TAU;
    const M = 40;
    const up = [];
    const lo = [];
    for (let k = 0; k <= M; k += 1) {
        const sg = (k / M) * 2 - 1;
        const b = (sg < 0 ? wl : wr) * sg;
        const taper = Math.pow(Math.min(1, (1 - Math.abs(sg)) / 0.1), 0.5);
        const a = ai + G(b) + curlOf(t) * Math.pow(Math.abs(sg), 4) - dip(b) * (i === 0 ? 0.25 : 1) + 0.004 * Math.sin(b * 11 + ph);
        const th = ROS.th * taper * (1 + 0.05 * Math.sin(b * 8 + ph2));
        up.push(leafPt(a + th / 2, b));
        lo.push(leafPt(a - th / 2, b));
    }
    let s = milk(up.concat(lo.slice(1, -1).reverse()));
    // now and then the pen follows the milk on its under side
    if (i % 3 === 0) {
        const under = lo.slice(Math.floor(M * (0.12 + r() * 0.1)), Math.floor(M * (0.4 + r() * 0.1))).map((p) => [p[0], p[1] + 0.5]);
        s += pen(r, under, { w: 0.5, wob: 0.15, op: 0.45, col: INK2, step: 3 });
    }
    rosOrigins.push(fracY(leafPt(ai, 0)[1]));
    svg(`ros-${i + 1}`, SB, s);
}
{
    // the last, smallest layer: a small rounded leaf at the tip
    const r = rng(131);
    const a0 = ROS.a0 + ROS.da * ROS.N - 0.04;
    const pts = [];
    const n = 30;
    for (let k = 0; k < n; k += 1) {
        const q = k / n; // round the outline, from the bottom, up the right side, over the top, down the left
        const ang = q * TAU;
        const up = (1 - Math.cos(ang)) / 2; // 0 at the bottom, 1 at the top
        const side = Math.sin(ang);
        const half = 0.1 * Math.pow(Math.sin(Math.PI * Math.pow(up, 0.74)), 0.5) * (side > 0 ? 1.07 : 0.95);
        pts.push(leafPt(a0 + 0.2 * up + (up < 0.2 ? -dip(half) * 0.6 : 0), Math.sign(side) * half));
    }
    const s = milk(pts);
    rosOrigins.push(fracY(leafPt(a0 + 0.05, 0)[1]));
    svg(`ros-${ROS.N + 1}`, SB, s);
}
{
    // the white of the first milk, pushed out to the wall of the cup: a fine ring that follows the round edge,
    // open at the far side, with a second, broken line inside it
    const r = rng(135);
    const ringOf = (q, t0, t1, thick, seed) => {
        const rr = rng(seed);
        const ph = rr() * TAU;
        const out = [];
        const inn = [];
        const n = 60;
        for (let k = 0; k <= n; k += 1) {
            const f = k / n;
            const ang = lerp(t0, t1, f);
            const th = thick * Math.pow(Math.sin(Math.PI * f), 0.55) * (1 + 0.3 * Math.sin(f * 9 + ph));
            const qq = q + 0.008 * Math.sin(f * 13 + ph);
            out.push([SURF.cx + SURF.rx * (qq + th / 2) * Math.cos(ang), SURF.cy + SURF.ry * (qq + th / 2) * Math.sin(ang)]);
            inn.push([SURF.cx + SURF.rx * (qq - th / 2) * Math.cos(ang), SURF.cy + SURF.ry * (qq - th / 2) * Math.sin(ang)]);
        }
        return milk(out.concat(inn.slice(1, -1).reverse()));
    };
    let s = ringOf(0.875, -52 * DEG, 232 * DEG, 0.04, 1);
    s += ringOf(0.81, 18 * DEG, 96 * DEG, 0.016, 2) + ringOf(0.815, 118 * DEG, 172 * DEG, 0.014, 3);
    s += pen(r, ell(SURF.cx, SURF.cy, SURF.rx * 0.905, SURF.ry * 0.905, 0.5, 2.2, 30), { w: 0.5, wob: 0.3, op: 0.4, col: INK2, step: 4 });
    svg('halo', SB, s);
}
let STEM;
{
    // the pull-through: one fine line of milk from the tip down through every layer to the base
    const r = rng(141);
    const H = leafPt(ROS.a0 + ROS.da * ROS.N + 0.13, 0);
    const Bs = leafPt(ROS.a0 - 0.1, 0);
    const len = Bs[1] - H[1];
    const box = [H[0] - 6, H[1], 12, len];
    const line = [];
    for (let k = 0; k <= 18; k += 1) line.push([H[0] + Math.sin(k * 0.6) * 0.25, H[1] + (len * k) / 18]);
    let s = pen(r, line, { w: 2.3, wob: 0.25, col: WHITE, t0: 0.5, t1: 0.1, l1: 26, step: 4 });
    s += pen(r, line.slice(2, 16).map((p) => [p[0] + 1.25, p[1]]), { w: 0.45, wob: 0.2, col: COFFEE, op: 0.6, step: 4 });
    svg('ros-stem', box, s);
    STEM = box.map((n) => Math.round(n * 100) / 100);
}

// ---- the espresso: it leaves the lip of the jug as a thread, swells, and falls in a slight arc
const STREAM = [186, 88, 32, 176];
{
    const r = rng(151);
    const line = [];
    for (let y = 90; y <= 261; y += 6) line.push([198 + 14.5 * Math.exp(-(y - 90) / 13) + Math.sin(y / 23) * 0.8, y]);
    let s = pen(r, line, { w: 4.6, wob: 0.9, col: ESPRESSO, t0: 0.22, l0: 34, t1: 0.3, l1: 30, step: 6 });
    s += pen(r, line.slice(3, 24).map((p) => [p[0] - 0.9, p[1]]), { w: 1.0, wob: 0.7, col: CREMA, op: 0.85, t0: 0.2, t1: 0.2, step: 6 });
    s += pen(r, line.slice(5, 14).map((p) => [p[0] + 3.1, p[1]]), { w: 0.5, wob: 0.5, col: INK2, op: 0.6, step: 6 });
    s += pen(r, line.slice(17, 26).map((p) => [p[0] + 2.9, p[1]]), { w: 0.45, wob: 0.5, col: INK2, op: 0.5, step: 6 });
    // drops shaken off beside it
    s += `<path d="${crPath(blobPts(r, 193.5, 196, 0.9, 1.7, 0.15, 6, 0), true, P)}" fill="${ESPRESSO}"/><path d="${crPath(blobPts(r, 204, 232, 0.7, 1.3, 0.15, 6, 0), true, P)}" fill="${ESPRESSO}"/>`;
    svg('stream', STREAM, s);
}

// ---- the milk pitcher (drawn upright about its own middle; the definition tilts it)
const PITCH = { c: [82, 118], box: [28, 64, 108, 108] };
const JUG = { c: [249, 86], box: [201, 38, 96, 96] };
/** A small jug with a lip and a handle. The milk pitcher is porcelain with a teal foot; the espresso jug is the same shape, smaller, mirrored, hatched as metal. */
function jugArt(seed, [ox, oy], { f = 1, k = 1, metal = false } = {}) {
    const r = rng(seed);
    const T = (p) => [ox + f * k * p[0], oy + k * p[1]];
    const M = (pts) => pts.map(T);
    let s = '';
    // handle
    const hOut = spline(M([[-23, -21], [-38, -24], [-49, -10], [-47, 12], [-30, 20]]), 8);
    const hIn = spline(M([[-25, -12], [-36, -14], [-41, -5], [-39, 7], [-29, 11]]), 8);
    s += `<path d="M${hOut.map(P1).join('L')}Z" fill="${WHITE}"/><path d="M${hIn.map(P1).join('L')}Z" fill="${PAPER}"/>`;
    s += ink(r, hOut, { w: 1.4, wob: 0.4, re: 0.7, blot: 1 }) + ink(r, hIn, { w: 0.9, wob: 0.3, re: 0.2 });
    // body
    const left = spline(M([[-24, -28], [-26.5, -6], [-29, 14], [-30, 30]]), 8);
    const rightS = spline(M([[23, -24], [26.5, -4], [29, 14], [30, 30]]), 8);
    const base = M(ell(0, 30, 30, 11.5, 0, Math.PI, 24));
    const mouth = M(ell(0, -28, 24, 10.5, 0, TAU, 40).slice(0, -1));
    const beak = spline(M([[14, -37], [26, -40.5], [38.5, -43], [31, -31], [23, -22]]), 8);
    s += `<path d="M${left.map(P1).join('L')}L${base.slice().reverse().map(P1).join('L')}L${rightS.slice().reverse().map(P1).join('L')}Z" fill="${WHITE}"/>`;
    s += `<path d="${crPath(mouth, true)}" fill="${WHITE}"/><path d="M${beak.map(P1).join('L')}Z" fill="${WHITE}"/>`;
    // the shade on the side away from the light
    const shadeB = rightS.map((p, i) => [p[0] - 9 - 7 * Math.sin((i / rightS.length) * Math.PI), p[1] + 2]);
    s += stain(r, thin(rightS, 4).concat(thin(shadeB, 4).reverse()), { op: 0.15, rim: 0.25, rw: 1 });
    s += hatchBetween(r, rightS, shadeB, { n: 24, w: 0.55, op: 0.62, skew: -0.08, len: [0.5, 1.05] });
    s += hatchBetween(r, base.slice(0, 14), base.slice(0, 14).map((p) => [p[0] - 5, p[1] - 9]), { n: 10, w: 0.5, op: 0.5, len: [0.4, 0.9] });
    // inside the mouth: the far wall in shade, and the milk
    s += hatchBetween(r, M(ell(0, -28, 23, 9.8, 185 * DEG, 330 * DEG, 20)), M(ell(1, -25, 17, 5.5, 185 * DEG, 330 * DEG, 20)), { n: 22, w: 0.5, op: 0.6, len: [0.4, 1.0] });
    s += `<path d="${crPath(M(ell(1, -24.5, 18, 5.8, 0, TAU, 20).slice(0, -1)), true)}" fill="${metal ? ESPRESSO : WHITE}"/>`;
    s += pen(r, M(ell(1, -24.5, 18, 5.8, 2.9, 2.9 + TAU * 0.62, 24)), { w: 0.6, wob: 0.25, op: 0.8, step: 3 });
    // contours
    s += ink(r, left, { w: 1.2, wob: 0.4, re: 0.6 }) + ink(r, rightS, { w: 1.6, wob: 0.4, re: 0.5, col: INK2 });
    s += ink(r, base, { w: 1.7, wob: 0.4, re: 0.8, blot: 1, col: INK2 });
    s += pen(r, M(ell(0, -28, 24, 10.5, 2.2, 2.2 + TAU * 0.83, 50)), { w: 1.0, wob: 0.4 });
    s += ink(r, beak, { w: 1.2, wob: 0.3, re: 0.5, blot: 1 });
    // a band of the teal ink round the foot
    s += pen(r, M(ell(0, 24, 29.6, 11.4, 0.12, Math.PI - 0.12, 24)), { w: metal ? 0.8 : 1.5, col: metal ? INK : TEAL, wob: 0.3 });
    if (!metal) s += pen(r, M(ell(0, 21, 29.2, 11.2, 0.2, Math.PI - 0.3, 24)), { w: 0.6, col: TEAL, wob: 0.3, op: 0.8 });
    if (metal) {
        // steel: hatched all over, a bare strip left for the light
        s += hatchBetween(r, left, rightS, { n: 46, w: 0.5, op: 0.6, len: [0.2, 0.42], skew: 0.02 });
        s += hatchBetween(r, rightS, left, { n: 44, w: 0.5, op: 0.6, len: [0.36, 0.62], skew: 0.05 });
    }
    // a drop of milk gathering at the lip
    const drop = M([[38.5, -43.5], [41.2, -41.5], [41.4, -38.2], [39.2, -37], [37.4, -39.2], [37.4, -42]]);
    s += `<path d="${crPath(drop, true, P)}" fill="${metal ? ESPRESSO : WHITE}"/>` + pen(r, spline(drop.concat([drop[0]]), 4), { w: 0.6, wob: 0.1, step: 2 });
    return s;
}
svg('pitcher', PITCH.box, jugArt(171, PITCH.c));
svg('jug', JUG.box, jugArt(175, JUG.c, { f: -1, k: 0.8, metal: true }));

// ---- milk: a thread from the lip of the pitcher, swelling and thinning as it falls in a small arc
const MILK = [158, 140, 30, 70];
{
    const r = rng(181);
    const line = [];
    for (let y = 144; y <= 202; y += 4) line.push([169 + 4.2 * (1 - Math.exp(-(y - 144) / 9)) + Math.sin(y / 9) * 0.5, y]);
    let s = pen(r, line, { w: 3.7, wob: 0.6, col: WHITE, t0: 0.28, l0: 16, t1: 0.3, l1: 18, step: 4 });
    s += pen(r, line.slice(0, 8).map((p, i) => [p[0] - 1.2 - i * 0.12, p[1]]), { w: 0.5, wob: 0.3, col: INK2, op: 0.8, step: 4 });
    s += pen(r, line.slice(5, 13).map((p) => [p[0] + 2.1, p[1]]), { w: 0.5, wob: 0.3, col: INK2, op: 0.7, step: 4 });
    // where it enters the coffee: two rings of the ripple, drawn, not filled
    s += pen(r, ell(173.4, 202.5, 5.2, 1.9, 0.3, 3.0, 12), { w: 0.5, wob: 0.15, col: INK2, op: 0.7, step: 3 });
    s += pen(r, ell(173.4, 203, 9.5, 3.4, 3.5, 5.9, 12), { w: 0.45, wob: 0.2, col: INK2, op: 0.5, step: 3 });
    s += pen(r, ell(173.4, 203, 9.8, 3.6, 0.5, 1.9, 10), { w: 0.45, wob: 0.2, col: WHITE, op: 0.9, step: 3 });
    svg('milk', MILK, s);
}

// ---- steam: thin pen lines only, each broken where the nib skipped
const STEAMS = {};
function plume(r, x0, y0, h, sway, lean, all) {
    const breath = (dx, t0, t1, amp, ph, waves) => {
        const pts = [];
        for (let i = 0; i <= 40; i += 1) {
            const t = lerp(t0, t1, i / 40);
            pts.push([x0 + dx + amp * Math.sin(t * waves * TAU + ph) * (0.2 + 0.8 * t) + lean * t * t * 16, y0 - h * t]);
        }
        all.push(...pts);
        return pts;
    };
    const broken = (pts, o) => {
        let out = '';
        let i = 0;
        while (i < pts.length - 4) {
            const n = 10 + Math.floor(r() * 14);
            const seg = pts.slice(i, Math.min(pts.length, i + n));
            if (seg.length > 3) out += pen(r, seg, { ...o, t0: 0.15, t1: 0.1, l0: 5, l1: 8, step: 3 });
            i += n + 1 + Math.floor(r() * 3);
        }
        return out;
    };
    const ph = r() * TAU;
    const sg = Math.sign(lean) || 1;
    let s = broken(breath(0, 0, 1, sway, ph, 1.15), { w: 1.25, wob: 0.5, op: 0.72 });
    s += broken(breath(6 * sg, 0.14, 0.82, sway * 0.8, ph + 0.5, 1.2), { w: 0.95, wob: 0.6, op: 0.56 });
    s += broken(breath(-5 * sg, 0.46, 1.08, sway * 0.6, ph - 0.6, 1.0), { w: 0.7, wob: 0.6, op: 0.44 });
    return s;
}
function steam(name, seed, plumes) {
    const r = rng(seed);
    const all = [];
    const s = plumes.map((p) => plume(r, ...p, all)).join('');
    const xs = all.map((q) => q[0]);
    const ys = all.map((q) => q[1]);
    const box = [Math.floor(Math.min(...xs) - 4), Math.floor(Math.min(...ys) - 4), 0, 0];
    box[2] = Math.ceil(Math.max(...xs) + 4) - box[0];
    box[3] = Math.ceil(Math.max(...ys) + 3) - box[1];
    svg(name, box, s);
    STEAMS[name] = box;
}
steam('steam-a', 191, [[164, 166, 98, 7, -0.6]]);
steam('steam-b', 192, [[206, 154, 126, 9, 0.5], [246, 168, 84, 6, 0.9]]);

// ---------------------------------------------------------------- report
process.stdout.write(JSON.stringify({ sizes, geom: { surface: SB, strokes: rosOrigins, stem: STEM, stream: STREAM, jug: JUG.box, milk: MILK, pitcher: PITCH.box, steamA: STEAMS['steam-a'], steamB: STEAMS['steam-b'] } }) + '\n');
