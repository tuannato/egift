// Generator for the "bouquet" wrapper art, drawn as a BOTANICAL SKETCHBOOK PLATE:
//   - the pen: a sepia hairline that breaks and leaves gaps, with firm, tapering pressure strokes laid on the
//     shadow side (filled lens shapes, so the weight really swells and thins); some petals have no line at all;
//   - the wash: laid loosely AFTER the line and not by its shapes — one wet puddle per bloom that runs past the
//     line on one side and falls short on the other, darker colour dropped into it wet (the colours run
//     together inside one filter group), a few dry dabs on top, a leaf's green running into a petal's pink.
//     The filter (blur + alpha threshold, then erode + blur + "out") gives the wet edge and the darker rim
//     where pigment pooled. The gate allows no turbulence;
//   - blooms from several sides: three-quarter cup, side profile, a drooping one, closed buds, tight spirals;
//   - ONE sheet of kraft: rolled into a cone with an overlapping front edge, then lying open like a collar;
//   - paper tooth over line and wash alike. No construction lines, no cast shadows.
// Every SVG's viewBox is its layer box on the 360x450 canvas.
// Run: node scripts/art/bouquet.gen.mjs && node scripts/wrap-art.mjs --write
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'bouquet');
if (!OUT.endsWith('wrappers/bouquet')) throw new Error('out dir must be public/wrappers/bouquet');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* ---------- Palette ---------- */
const INK = '#4A3324';
const PAPER = '#FAF4E7';
const C = {
    pinkDeep: '#B96F7A', pink: '#D4979B', pinkPale: '#EBC6C2', blush: '#F5E2D9',
    roseDeep: '#9E5666', rose: '#C27E88',
    sageDeep: '#6C8269', sage: '#93A78A', sagePale: '#C2CEB6', blueSage: '#8AA198',
    cream: '#F3E4C2', butter: '#E4C688', peach: '#E5B292',
    kraftDeep: '#8E6A43', kraft: '#B58E62', kraftPale: '#D2B48B', kraftBare: '#EADBBE',
    jute: '#C6A977', juteDeep: '#A88A58', wood: '#D3B48A',
};
const PINK = { under: '#F7E6E0', w: [C.pinkPale, C.pink, C.pinkDeep] };
const ROSE = { under: '#F3DAD8', w: [C.pink, C.rose, C.roseDeep] };
const CREAM = { under: '#FAF0D8', w: [C.cream, C.butter, C.peach] };
const BLUSH = { under: '#FAEFE8', w: [C.blush, C.pinkPale, C.pink] };

/* ---------- Numbers ---------- */
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
const f2 = n => String(Math.round(n * 100) / 100);
const RAD = Math.PI / 180;
const T = [180, 300];
/** A point at `a` degrees from straight up (clockwise), `r` away from the tie. */
const P = (a, r) => [T[0] + r * Math.sin(a * RAD), T[1] - r * Math.cos(a * RAD)];

const BOXES = {};
function svg(name, box, defs, inner) {
    BOXES[name] = box;
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${inner}</svg>`);
}

/* ---------- The kit ---------- */
const line = (pts, close = false) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('') + (close ? 'Z' : '');
function curve(pts, closed = false) {
    const n = pts.length;
    const Q = i => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
        const p0 = Q(i - 1), p1 = Q(i), p2 = Q(i + 1), p3 = Q(i + 2);
        d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + (closed ? 'Z' : '');
}
function puddlePts(r, cx, cy, rx, ry, wobble = 0.2, n = 9, rot = 0) {
    const pts = [];
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const m = 1 + (r() - 0.5) * 2 * wobble;
        const x = Math.cos(a) * rx * m, y = Math.sin(a) * ry * m;
        pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return pts;
}
const puddle = (r, cx, cy, rx, ry, wobble, n, rot) => curve(puddlePts(r, cx, cy, rx, ry, wobble, n, rot), true);
/** A straight run drawn by hand: cut into short runs that wander a hair. */
function sketch(r, pts, { jit = 0.5, step = 17, close = false } = {}) {
    const out = [];
    const n = pts.length;
    for (let i = 0; i < (close ? n : n - 1); i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        const k = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
        for (let j = 0; j < k; j++) {
            const t = j / k, w = j ? jit : 0;
            out.push([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 2 * w, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 2 * w]);
        }
    }
    if (!close) out.push(pts[n - 1]);
    return out;
}
/** Where the pen lifted: long runs, real gaps. */
function gaps(r, scale = 1) {
    const d = [];
    for (let k = 0; k < 3; k++) d.push(f((6 + r() * 22) * scale), f((1.2 + r() * r() * 7) * scale));
    return ` stroke-dasharray="${d.join(' ')}" stroke-dashoffset="${f(r() * 30)}"`;
}
/** A hairline. */
const hair = (d, w = 0.4, op = 1, extra = '') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f2(w)}" stroke-linecap="round" stroke-linejoin="round"${op < 1 ? ` stroke-opacity="${f2(op)}"` : ''}${extra}/>`;
/** A pressure stroke: the nib pressed and released along `pts`. `w` is the half-width at its fullest. */
function taper(pts, w, lean = 0.5) {
    const n = pts.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
        const u = t < lean ? t / lean / 2 : 0.5 + (t - lean) / (1 - lean) / 2;
        const ww = w * Math.pow(Math.sin(Math.PI * u), 0.8);
        L.push([pts[i][0] - (ty / l) * ww, pts[i][1] + (tx / l) * ww]);
        R.push([pts[i][0] + (ty / l) * ww, pts[i][1] - (tx / l) * ww]);
    }
    return `<path d="${curve([...L, ...R.reverse().slice(1, -1)], true)}" fill="${INK}"/>`;
}
/** Pressure on the shadow side (lower right) of an outline. */
function press(r, pts, w = 0.4 + r() * 0.55, len = 5) {
    const n = pts.length;
    if (n < len + 1) return '';
    let best = 0, score = -1e9;
    for (let t = 0; t < 4; t++) {
        const i0 = Math.floor(r() * (n - len));
        const m = pts[i0 + (len >> 1)];
        const sc = m[0] * 0.45 + m[1] * 0.9 + r() * 5;
        if (sc > score) { score = sc; best = i0; }
    }
    return taper(pts.slice(best, best + len), w, 0.35 + r() * 0.3);
}
/** The watercolour filter: wet edge, and a darker rim where the pigment pooled. */
const wc = (id, { sd = 1.0, gain = 9, cut = -3.6, er = 0.9, pool = 1.2, dark = 0.72, rim = 0.9 } = {}) =>
    `<filter id="${id}" x="-0.25" y="-0.25" width="1.5" height="1.5" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur stdDeviation="${sd}" result="b"/>` +
    `<feColorMatrix in="b" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${gain} ${cut}" result="g"/>` +
    `<feMorphology in="g" operator="erode" radius="${er}" result="e"/>` +
    `<feGaussianBlur in="e" stdDeviation="${pool}" result="eb"/>` +
    `<feComposite in="g" in2="eb" operator="out" result="rim"/>` +
    `<feColorMatrix in="rim" type="matrix" values="${dark} 0 0 0 0 0 ${dark} 0 0 0 0 0 ${dark} 0 0 0 0 0 ${rim} 0" result="rd"/>` +
    `<feComposite in="rd" in2="g" operator="over"/></filter>`;
const blur = (id, sd) => `<filter id="${id}" x="-0.4" y="-0.4" width="1.8" height="1.8"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const wash = (inner, op = 0.72, id = 'w', blend = 'multiply') => (inner ? `<g filter="url(#${id})" opacity="${f2(op)}"${blend ? ` style="mix-blend-mode:${blend}"` : ''}>${inner}</g>` : '');
const rad = (id, cx, cy, r, stops) =>
    `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">` +
    stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</radialGradient>';
const centroid = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
const fillP = (pts, c) => `<path d="${curve(pts, true)}" fill="${c}"/>`;
const qb = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]];
const qang = (a, c, b, t) => Math.atan2((1 - t) * (c[1] - a[1]) + t * (b[1] - c[1]), (1 - t) * (c[0] - a[0]) + t * (b[0] - c[0]));
const qd = (a, c, b) => `M${f(a[0])} ${f(a[1])}Q${f(c[0])} ${f(c[1])} ${f(b[0])} ${f(b[1])}`;
const qpts = (a, c, b, n = 6, t0 = 0, t1 = 1) => Array.from({ length: n }, (_, i) => qb(a, c, b, t0 + ((t1 - t0) * i) / (n - 1)));
/** A stem: a strip of green laid loosely, a broken hairline down it, the nib pressed near one end. */
function stem(r, a, c, b, { w = 1.5, colour = C.sage, op = 0.6, pressAt = 0.75 } = {}) {
    const d = qd(a, c, b);
    return `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f2(w)}" stroke-linecap="round" stroke-opacity="${f2(op)}"/>` +
        hair(d, 0.36, 0.95, gaps(r, 1.3)) + taper(qpts(a, c, b, 5, Math.max(0, pressAt - 0.25), Math.min(1, pressAt + 0.25)), 0.42 + r() * 0.25);
}
/** A cord of jute: colour, a broken line under it, the twist as ticks. */
const cord = (r, d, w, colour) =>
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f2(w + 0.6)}" stroke-linecap="round" stroke-linejoin="round"${gaps(r, 1.2)}/>` +
    `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f2(w)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f2(w * 0.85)}" stroke-opacity="0.3" stroke-dasharray="0.4 2.2"/>`;

/* ---------- Petals, leaves ---------- */
function petalPts(r, bx, by, ang, len, wid, { n = 10, ruffle = 0.08, notch = 0.07, p = 0.6, base = 0.22 } = {}, tf = null) {
    const pts = [];
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const where = 0.5 + (r() - 0.5) * 0.3;
    for (let i = 0; i <= n; i++) {
        const t = i / n, th = Math.PI * t, s = Math.sin(th);
        let u = len * Math.pow(s, p);
        let v = -Math.cos(th) * (wid / 2) * (base + (1 - base) * Math.pow(s, 0.55));
        u *= 1 + ruffle * s * s * (r() * 2 - 1) - notch * Math.exp(-(((t - where) / 0.08) ** 2));
        v *= 1 + ruffle * 0.6 * (r() * 2 - 1);
        const q = [bx + u * ca - v * sa, by + u * sa + v * ca];
        pts.push(tf ? tf(q) : q);
    }
    return pts;
}
/** A petal in pen: its ground tint, a broken hairline (or none), sometimes a pressure stroke, rarely a vein. */
function inkPetal(r, pts, base, { under = PAPER, bare = 0.15, w = 0.4, vein = 0.25 } = {}) {
    const lined = r() >= bare;
    let s = `<path d="${curve(pts, true)}" fill="${under}"${lined ? ` stroke="${INK}" stroke-width="${f2(w * (0.8 + r() * 0.5))}" stroke-linejoin="round"${gaps(r)}` : ''}/>`;
    if (lined && r() < 0.7) s += press(r, pts);
    if (r() < vein) {
        const tip = pts[Math.round(pts.length / 2 + (r() - 0.5) * 2)];
        const a = [base[0] + (tip[0] - base[0]) * 0.35, base[1] + (tip[1] - base[1]) * 0.35], b = [base[0] + (tip[0] - base[0]) * (0.62 + r() * 0.2), base[1] + (tip[1] - base[1]) * (0.62 + r() * 0.2)];
        s += hair(`M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`, 0.26, 0.6);
    }
    return s;
}
/** The darker colour dropped into the lower part of a petal: not its shape, a looser one nearer its base. */
function drop(r, pts, base, size) {
    const out = [];
    for (let i = 0; i < pts.length; i += 2) {
        const k = 0.66 + r() * 0.26;
        out.push([base[0] + (pts[i][0] - base[0]) * k + (r() - 0.5) * size * 0.12, base[1] + (pts[i][1] - base[1]) * k + (r() - 0.5) * size * 0.12]);
    }
    return out;
}
/** A pointed leaf. Returns its pen and the shape its wash takes (which runs past the tip or stops short). */
function leaf(r, bx, by, ang, len, wid, { bend = 0.08, colour = C.sage, veins = 2, under = '#E4E9D9' } = {}) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const prof = s => Math.pow(Math.sin(Math.PI * Math.pow(s, 0.8)), 0.9);
    const mk = (s, side) => {
        const u = len * s, v = side * (wid / 2) * prof(Math.min(1, s)) + bend * len * s * s;
        return [bx + u * ca - v * sa, by + u * sa + v * ca];
    };
    const pts = [];
    for (let i = 0; i <= 5; i++) pts.push(mk(i / 5, -1));
    for (let i = 4; i >= 1; i--) pts.push(mk(i / 5, 1));
    let ink = `<path d="${curve(pts, true)}" fill="${under}" stroke="${INK}" stroke-width="0.38" stroke-linejoin="round"${gaps(r)}/>`;
    ink += taper([mk(0.02, 0), mk(0.3, 0), mk(0.6, 0), mk(0.94, 0)], 0.45, 0.25);
    ink += press(r, pts, 0.4 + r() * 0.4, 4);
    for (let v = 1; v <= veins; v++) {
        const t = v / (veins + 1.3), m = mk(t, 0), side = v % 2 ? -0.7 : 0.7, e = mk(t + 0.17, side);
        ink += hair(`M${f(m[0])} ${f(m[1])}L${f(e[0])} ${f(e[1])}`, 0.26, 0.6);
    }
    let w = '';
    if (colour) {
        const k0 = 0.25 + r() * 0.15, over = 0.9 + r() * 0.25, fat = 0.75 + r() * 0.5, dv = (r() - 0.5) * wid * 0.3;
        const q = [];
        for (const s of [k0, 0.5, 0.78]) q.push(mk(s * over, -fat));
        q.push(mk(over, 0));
        for (const s of [0.78, 0.5, k0]) q.push(mk(s * over, fat));
        w = fillP(q.map(([x, y]) => [x - dv * sa, y + dv * ca]), colour);
    }
    return { ink, w };
}
/** A round eucalyptus leaf held by its edge. */
function coin(r, bx, by, ang, size, colour) {
    const rad0 = size / 2, cx = bx + Math.cos(ang) * rad0 * 0.96, cy = by + Math.sin(ang) * rad0 * 0.96;
    const pts = [];
    for (let k = 0; k < 9; k++) {
        const th = ang + (k / 9) * 6.283;
        const m = (k === 0 ? 1.16 : 1) * (1 + (r() - 0.5) * 0.12);
        pts.push([cx + Math.cos(th) * rad0 * m, cy + Math.sin(th) * rad0 * m]);
    }
    const lined = r() > 0.12;
    let ink = `<path d="${curve(pts, true)}" fill="#E9EDE0"${lined ? ` stroke="${INK}" stroke-width="0.36"${gaps(r, 0.7)}` : ''}/>`;
    if (r() < 0.6) ink += press(r, pts, 0.36 + r() * 0.4, 4);
    if (r() < 0.6) ink += hair(`M${f(bx)} ${f(by)}L${f(bx + Math.cos(ang) * size * 0.62)} ${f(by + Math.sin(ang) * size * 0.62)}`, 0.26, 0.6);
    let w = '';
    if (colour) w = `<path d="${puddle(r, cx + (r() - 0.5) * size * 0.34, cy + (r() - 0.5) * size * 0.34, rad0 * (0.8 + r() * 0.3), rad0 * (0.8 + r() * 0.3), 0.2, 7)}" fill="${colour}"/>`;
    return { ink, w };
}
/** A eucalyptus sprig. Its leaves' washes are laid in one go, so they run together where they touch. */
function sprig(r, a, c, b, { pairs = 8, s0 = 11, s1 = 5, colour = C.sage, bare = 0.2, from = 0.14, op = 0.62 } = {}) {
    let back = '', front = '', w = '';
    for (let k = 0; k < pairs; k++) {
        const t = from + (1 - from) * (k / (pairs - 0.4));
        const p = qb(a, c, b, t), th = qang(a, c, b, t), size = (s0 + (s1 - s0) * (k / (pairs - 1))) * (0.85 + r() * 0.3);
        for (const side of [-1, 1]) {
            if (r() < 0.1) continue;
            const one = coin(r, p[0], p[1], th + side * (1.15 + (r() - 0.5) * 0.6), size, r() < bare ? null : (r() < 0.3 ? C.blueSage : colour));
            if (side < 0) back += one.ink; else front += one.ink;
            w += one.w;
        }
    }
    const tip = qb(a, c, b, 1), last = coin(r, tip[0], tip[1], qang(a, c, b, 1), s1 * 0.9, colour);
    return back + stem(r, a, c, b, { w: 1.1, colour: C.sagePale, op: 0.8, pressAt: 0.3 }) + front + last.ink + wash(w + last.w, op);
}
/** A spray of small filler flowers: wiry hairlines, heads that are mostly just dabs of colour. */
function spray(r, a, c, b, { twigs = 7, colour = C.pinkPale, size = 2.6, len = 13 } = {}) {
    let s = hair(qd(a, c, b), 0.3, 0.9, gaps(r, 2)), dabs = '';
    const head = (x, y, sz) => {
        dabs += `<circle cx="${f(x + (r() - 0.5) * 1.2)}" cy="${f(y + (r() - 0.5) * 1.2)}" r="${f(sz * (0.8 + r() * 0.5))}" fill="${r() < 0.25 ? C.cream : colour}"/>`;
        const k = r();
        if (k < 0.4) s += `<path d="${puddle(r, x, y, sz * 0.8, sz * 0.8, 0.14, 6, r() * 3)}" fill="none" stroke="${INK}" stroke-width="0.28" stroke-dasharray="${f(sz * 2.4)} ${f(sz * 1.3)}"/>`;
        else if (k < 0.7) s += `<circle cx="${f(x)}" cy="${f(y)}" r="0.42" fill="${INK}" fill-opacity="0.75"/>`;
    };
    for (let k = 0; k < twigs; k++) {
        const t = 0.3 + 0.7 * (k / (twigs - 1));
        const p = qb(a, c, b, t), th = qang(a, c, b, t), side = k % 2 ? 1 : -1;
        const ang = th + side * (0.55 + r() * 0.5), l = len * (0.6 + r() * 0.7) * (1 - t * 0.35);
        const e = [p[0] + Math.cos(ang) * l, p[1] + Math.sin(ang) * l];
        const m = [p[0] + Math.cos(ang - side * 0.3) * l * 0.55, p[1] + Math.sin(ang - side * 0.3) * l * 0.55];
        s += hair(qd(p, m, e), 0.26, 0.85);
        head(e[0], e[1], size * (0.8 + r() * 0.4));
        if (r() < 0.55) {
            const a2 = ang + side * (0.5 + r() * 0.4), q = qb(p, m, e, 0.55), e2 = [q[0] + Math.cos(a2) * l * 0.5, q[1] + Math.sin(a2) * l * 0.5];
            s += hair(`M${f(q[0])} ${f(q[1])}L${f(e2[0])} ${f(e2[1])}`, 0.24, 0.8);
            head(e2[0], e2[1], size * (0.65 + r() * 0.3));
        }
    }
    const tip = qb(a, c, b, 1);
    head(tip[0], tip[1], size);
    return s + wash(dabs, 0.7);
}

/* ---------- Blooms ---------- */
/**
 * Paint a bloom the way a brush does: one wet puddle (pushed `off` the middle, so it runs past the line on one
 * side and falls short on the other), darker colour dropped into the lower parts of some petals while wet (same
 * group: they run together), then a few dry dabs with their own pooled rims. `extra` joins the first wash (a
 * leaf's green, running into the pink).
 */
function paint(r, cx, cy, R, petals, col, { off = [0, 0], cover = 0.88, sq = 1, part = 0.6, extra = '', painted = () => true, op = 0.8, heart = [cx, cy], fan = null } = {}) {
    let g = `<path d="${puddle(r, cx + off[0], cy + off[1], R * cover, R * cover * sq, 0.22, 11, r())}" fill="${col.w[0]}"/>` + extra;
    for (const p of petals) if (painted(p) && r() < part) g += fillP(drop(r, p.pts, p.base, R), col.w[1]);
    // dry strokes of the deepest colour, laid along the petals from the heart
    let d = '';
    for (let k = 0; k < 3; k++) {
        const a = fan === null ? r() * 6.283 : fan + (r() - 0.5) * 1.5, q = R * (0.2 + r() * 0.22);
        d += `<path d="${puddle(r, heart[0] + Math.cos(a) * q, heart[1] + Math.sin(a) * q * sq, R * (0.15 + r() * 0.12), R * (0.045 + r() * 0.04), 0.3, 8, a)}" fill="${col.w[2]}"/>`;
    }
    // backruns: water that crept back into the drying wash and pushed its pigment out into a crinkled rim
    let back = '';
    for (let k = 0; k < 2; k++) {
        const a = r() * 6.283, q = R * (0.45 + r() * 0.3);
        back += `<path d="${puddle(r, cx + off[0] + Math.cos(a) * q, cy + off[1] + Math.sin(a) * q * sq, R * (0.16 + r() * 0.1), R * (0.12 + r() * 0.08), 0.2, 9, r() * 3)}" fill="${col.w[0]}"/>`;
    }
    return wash(g, op) + wash(d, 0.6) + wash(back, 0.55, 'wb');
}
/** Leaves showing from behind a bloom: [angle, length in R, colour, bend]. */
function leavesOf(r, cx, cy, R, list) {
    let ink = '', w = '';
    for (const [ang, len = 1, colour = C.sage, bend = 0.08] of list) {
        const one = leaf(r, cx + Math.cos(ang) * R * 0.45, cy + Math.sin(ang) * R * 0.45, ang + (r() - 0.5) * 0.1, R * len, R * len * 0.36, { bend, colour });
        ink += one.ink;
        w += one.w;
    }
    return { ink, w };
}
/** A peony from the front or three-quarters (`sq` < 1 tips it back; the near petals then come forward as a bowl). */
function peony(seed, cx, cy, R, col, { sq = 1, leaves = [], off = [0.14, 0.1], painted, cover } = {}) {
    const r = rng(seed);
    const L = leavesOf(r, cx, cy, R, leaves);
    const rings = [[6, 1.0, 0.98, 0.11, 0.1], [5, 0.76, 0.78, 0.1, 0.08], [5, 0.54, 0.6, 0.09, 0.05], [4, 0.33, 0.42, 0.07, 0]];
    let ink = L.ink;
    const petals = [];
    rings.forEach(([n, len, wid, ruffle, notch], k) => {
        const lift = sq < 1 ? -k * R * 0.07 : 0;
        const tf = ([x, y]) => [x, cy + (y - cy) * sq + lift];
        const a0 = r() * 6.283;
        for (let i = 0; i < n; i++) {
            const ang = a0 + (i / n) * 6.283 + (r() - 0.5) * 0.3;
            const near = sq < 1 ? 1 + 0.22 * Math.sin(ang) : 1;
            const pts = petalPts(r, cx, cy, ang, R * len * (0.92 + r() * 0.16) * near, R * wid * (0.9 + r() * 0.2), { ruffle, notch, n: k < 2 ? 10 : 8, p: 0.56 }, tf);
            const base = tf([cx, cy]);
            petals.push({ pts, base, ang, k });
            ink += inkPetal(r, pts, base, { under: col.under, bare: k === 0 ? 0.3 : 0.12, vein: k < 2 ? 0.3 : 0 });
        }
    });
    const heart = [cx, cy - (sq < 1 ? 3 * R * 0.07 : 0)];
    let dots = '';
    for (let k = 0; k < 8; k++) {
        const a = r() * 6.283, d = R * 0.1 * Math.sqrt(r());
        dots += `<circle cx="${f(heart[0] + Math.cos(a) * d)}" cy="${f(heart[1] + Math.sin(a) * d * sq)}" r="${f2(0.3 + r() * 0.3)}" fill="${INK}"/>`;
    }
    return ink + paint(r, cx, cy, R, petals, col, { off: [off[0] * R, off[1] * R], sq, extra: L.w, painted, cover, heart }) +
        wash(`<path d="${puddle(r, heart[0], heart[1], R * 0.11, R * 0.09, 0.2, 7)}" fill="${C.butter}"/>`, 0.9) + dots;
}
/** A ranunculus: thin petals wound in a tightening spiral round a green eye. */
function ranunculus(seed, cx, cy, R, col, { sq = 1, leaves = [], off = [-0.12, 0.12], painted, cover } = {}) {
    const r = rng(seed);
    const L = leavesOf(r, cx, cy, R, leaves);
    const tf = ([x, y]) => [x, cy + (y - cy) * sq];
    const rings = [[8, 1], [7, 0.84], [7, 0.68], [6, 0.53], [5, 0.38], [4, 0.24]];
    let ink = L.ink, a0 = r() * 6.283;
    const petals = [];
    rings.forEach(([n, k], idx) => {
        a0 += 0.5 + r() * 0.3;
        for (let i = 0; i < n; i++) {
            const ang = a0 + (i / n) * 6.283 + (r() - 0.5) * 0.22, len = R * k * (0.94 + r() * 0.12);
            const pts = petalPts(r, cx, cy, ang, len, 2 * len * Math.tan(Math.PI / n) * 1.14, { n: 7, ruffle: 0.04, notch: 0.03, p: 0.42, base: 0.3 }, tf);
            petals.push({ pts, base: [cx, cy], ang, k: idx });
            ink += inkPetal(r, pts, [cx, cy], { under: col.under, bare: idx === 0 ? 0.3 : 0.1, w: 0.34, vein: 0 });
        }
    });
    return ink + paint(r, cx, cy, R, petals, col, { off: [off[0] * R, off[1] * R], sq, extra: L.w, part: 0.45, painted, cover }) +
        wash(`<path d="${puddle(r, cx, cy, R * 0.1, R * 0.1 * sq, 0.15, 7)}" fill="${C.sage}"/>`, 0.9);
}
/**
 * A bloom seen from the side: a fan of petals from the calyx at (bx, by), pointing `dir`. `open` 0.12 is a closed
 * bud, 0.5 a cup, 1 a full flower with its outer petals falling back. The stem runs to `to`.
 */
function profile(seed, bx, by, R, dir, col, { open = 0.6, to = null, leaves = [], painted, off = [0.1, 0.12], stemBend = 0.18 } = {}) {
    const r = rng(seed);
    let ink = '';
    const petals = [];
    const add = (da, len, wid, shape, bare = 0.12) => {
        const ang = dir + da + (r() - 0.5) * 0.08;
        const pts = petalPts(r, bx, by, ang, R * len, R * wid, shape);
        petals.push({ pts, base: [bx, by], ang });
        ink += inkPetal(r, pts, [bx, by], { under: col.under, bare: bare * 0.4, vein: 0.9 });
        ink += press(r, pts, 0.45 + r() * 0.4);
        if (r() < 0.6) {
            const i0 = 2 + Math.floor(r() * 2), seg = pts.slice(i0, i0 + 4).map(([x, y]) => [bx + (x - bx) * 0.8, by + (y - by) * 0.8]);
            ink += hair(curve(seg), 0.3, 0.7);
        }
    };
    const cup = { ruffle: 0.09, notch: 0.07, p: 0.5, base: 0.3 };
    if (open > 0.8) for (const s of [-1, 1]) add(s * 1.75 * open, 0.72, 0.6, { ruffle: 0.1, notch: 0.05, p: 0.7 }, 0.3); // fallen back
    for (const da of [-0.5, 0.05, 0.55]) add(da * open, 1.28, 0.62 + open * 0.2, cup, 0.25); // the far side
    if (open > 0.3) for (const s of [-1, 1]) add(s * 1.05 * open, 1.02, 0.78, cup); // the flanks
    for (const da of open > 0.3 ? [-0.36, 0.3] : [-0.12, 0.16]) add(da * (open > 0.3 ? open : 1), 1.08, 0.7 + open * 0.3, { ruffle: 0.07, notch: 0.05, p: 0.46, base: 0.36 }); // the near side
    // calyx and stem
    const L = leavesOf(r, bx, by, R, leaves);
    let green = L.w, stemInk = '';
    if (to) {
        const mx = (bx + to[0]) / 2 - Math.sin(dir) * R * stemBend, my = (by + to[1]) / 2 + Math.cos(dir) * R * stemBend;
        stemInk = stem(r, to, [mx, my], [bx, by], { w: Math.max(1.2, R * 0.07), pressAt: 0.8 });
    }
    let sep = '';
    for (const sd of [-1, 1]) {
        const one = leaf(r, bx - Math.cos(dir) * R * 0.05, by - Math.sin(dir) * R * 0.05, dir + sd * (1.25 + r() * 0.3), R * (0.3 + (1 - open) * 0.25), R * 0.13, { bend: sd * 0.25, colour: C.sageDeep, veins: 0, under: '#DDE4D2' });
        sep += one.ink;
        green += one.w;
    }
    green += `<path d="${puddle(r, bx, by, R * 0.13, R * 0.1, 0.2, 6)}" fill="${C.sageDeep}"/>`;
    const mid = [bx + Math.cos(dir) * R * 0.6, by + Math.sin(dir) * R * 0.6];
    return L.ink + stemInk + sep + ink +
        paint(r, mid[0], mid[1], R * 0.74, petals, col, { off: [off[0] * R, off[1] * R], extra: green, painted, part: 0.75, fan: dir, heart: [bx + Math.cos(dir) * R * 0.22, by + Math.sin(dir) * R * 0.22] });
}

const W = wc('w') + wc('wb', { sd: 0.7, er: 0.6, pool: 0.8, dark: 0.5, rim: 1 });
const boxAt = (cx, cy, h) => [Math.round(cx - h), Math.round(cy - h), 2 * h, 2 * h];

/* ====================== The layers ====================== */

/* ---------- ground: a warm sheet, warmer towards its edges; on it a eucalyptus sprig and a spool of jute ---------- */
{
    const box = [-12, -12, 384, 474];
    const r = rng(11);
    let splat = '';
    for (let k = 0; k < 22; k++) {
        const corner = k % 4;
        const x = (corner % 2 ? 250 : 20) + r() * 90, y = (corner < 2 ? 50 : 250) + r() * 140;
        splat += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + r() * r() * 2.2)}" fill="${[C.pink, C.sage, C.kraftPale, C.pinkPale][k % 4]}"/>`;
    }
    let s = '';
    s += sprig(r, [22, 372], [26, 300], [80, 244], { pairs: 8, s0: 12, s1: 6 });
    s += sprig(r, [66, 392], [84, 356], [120, 346], { pairs: 5, s0: 8, s1: 5, colour: C.blueSage });
    // the spool, lower right: a strand runs off it across the paper
    s += cord(r, curve([[288, 338], [264, 354], [238, 350], [224, 364], [206, 376]]), 1.4, C.jute);
    let sp = '';
    const fl = (y, rx, ry) => `<ellipse cx="0" cy="${y}" rx="${rx}" ry="${ry}" fill="${PAPER}" stroke="${INK}" stroke-width="0.34"${gaps(r, 1.4)}/>`;
    sp += fl(13, 19, 6.5) + taper([[-12, 17.6], [0, 19.6], [12, 17.6], [18, 14.4]], 0.5);
    sp += `<path d="M-13.5 -12C-15 -4 -15 5 -13.5 13C-6 17.5 6 17.5 13.5 13C15 5 15 -4 13.5 -12Z" fill="${PAPER}"/>`;
    sp += wash(`<path d="M-13 -10C-15 -3 -13 6 -11.5 12C-5 16.5 6 17 12.5 14C14.5 5 13.5 -3 12 -10Z" fill="${C.jute}"/>`, 0.85);
    for (let k = 0; k < 8; k++) {
        const y = -9 + k * 3.1;
        sp += hair(`M-13.8 ${f(y)}C-6 ${f(y + 4.2)} 6 ${f(y + 4.2)} 13.8 ${f(y)}`, 0.28, 0.8, gaps(r, 0.8));
    }
    sp += taper([[13.6, -9], [14.8, -2], [14.8, 6], [13.6, 12]], 0.45) + hair('M-13.6 -11C-15 -3 -15 5 -13.6 12', 0.3);
    sp += fl(-12.5, 19, 6.5) + wash(`<ellipse cx="1.5" cy="-11.6" rx="16" ry="4.6" fill="${C.wood}"/><ellipse cx="-1" cy="15" rx="15" ry="3" fill="${C.wood}"/>`, 0.7);
    sp += taper([[2, -6.2], [10, -7.4], [16, -9.6], [18.6, -12]], 0.5);
    sp += `<ellipse cx="0" cy="-12.5" rx="5" ry="1.8" fill="${PAPER}" stroke="${INK}" stroke-width="0.3"/>`;
    s += `<g transform="translate(302 320) rotate(18)">${sp}</g>`;
    for (const [x, y, a] of [[128, 376, -18], [146, 390, 12], [236, 390, -30]]) {
        const e = [x + Math.cos(a * RAD) * 13, y + Math.sin(a * RAD) * 13];
        s += stem(r, [x, y], [(x + e[0]) / 2, (y + e[1]) / 2 + 0.6], e, { w: 1.5, pressAt: 0.5 });
    }
    svg('ground', box,
        rad('g', 180, 205, 300, [[0, '#FCF6E9'], [0.5, '#F8EEDB'], [0.8, '#F0DFC2'], [1, '#E2C9A2']]) + blur('b', 18) + wc('w') + wc('ws', { sd: 0.6, er: 0.5, pool: 0.7 }),
        `<rect x="-12" y="-12" width="384" height="474" fill="url(#g)"/>` +
        `<g filter="url(#b)">` +
        `<path d="${puddle(r, 180, 180, 150, 120, 0.25, 11)}" fill="${C.blush}" fill-opacity="0.45"/>` +
        `<path d="${puddle(r, 44, 90, 70, 60, 0.3, 9)}" fill="${C.pinkPale}" fill-opacity="0.22"/>` +
        `<path d="${puddle(r, 320, 330, 80, 70, 0.3, 9)}" fill="${C.cream}" fill-opacity="0.5"/>` +
        `</g>` + wash(splat, 0.5, 'ws') + s);
}

/* ---------- desk-top: what lies about while the bouquet is still wrapped: paint dabs, a loose stem, petals ---------- */
{
    const box = [0, 40, 360, 300];
    const r = rng(31);
    let s = '';
    let dabs = '';
    [[40, 118, C.pink], [57, 112, C.roseDeep], [75, 116, C.sage], [92, 110, C.kraft], [109, 114, C.butter]].forEach(([x, y, c]) => {
        dabs += `<path d="${puddle(r, x, y, 7.5, 5.4, 0.24, 8, -0.3)}" fill="${c}"/>`;
    });
    s += wash(dabs, 0.72, 'w2');
    // a loose ranunculus bud on its stem, right
    s += profile(33, 290, 150, 20, -1.75, CREAM, { open: 0.5, to: [330, 288], leaves: [], stemBend: 1.6 });
    const lf = [leaf(r, 312, 232, -2.6, 30, 11, { bend: 0.1 }), leaf(r, 300, 196, -0.5, 24, 9, { bend: -0.12, colour: null }), leaf(r, 303, 204, -2.9, 20, 8, { bend: 0.1, colour: C.blueSage })];
    s += lf.map(l => l.ink).join('') + wash(lf.map(l => l.w).join(''), 0.66);
    s += sprig(r, [22, 232], [34, 190], [66, 158], { pairs: 5, s0: 9, s1: 5, bare: 0.4 });
    let pw = '';
    for (const [x, y, ang, len] of [[118, 84, 0.6, 11], [236, 76, 2.4, 12], [64, 62, 4.0, 9], [322, 92, 1.2, 10], [258, 250, 5.2, 10], [78, 262, 2.0, 9], [246, 196, 3.4, 8]]) {
        const pts = petalPts(r, x, y, ang, len, len * 0.8, { n: 8, ruffle: 0.05, notch: 0.05 });
        s += inkPetal(r, pts, [x, y], { bare: 0.1, vein: 0.5 });
        if (r() < 0.8) pw += fillP(drop(r, pts, [x + (r() - 0.5) * 4, y + (r() - 0.5) * 4], len * 1.6), C.pink);
    }
    s += wash(pw, 0.66);
    svg('desk-top', box, W + wc('w2', { sd: 1.1, er: 1.2, pool: 1.3, dark: 0.7 }), s);
}

/* ---------- stems: from the blooms down through the tie to their cut ends ---------- */
{
    const box = [100, 150, 160, 240];
    const r = rng(51);
    let s = '';
    const ends = [[150, 366], [160, 378], [169, 372], [177, 383], [186, 374], [194, 381], [203, 370], [212, 362]];
    const tops = [[160, 226], [165, 208], [172, 216], [178, 240], [184, 238], [189, 212], [195, 206], [200, 226]];
    ends.forEach(([x, y], k) => {
        const neck = [173 + k * 2, 298];
        s += stem(r, tops[k], [(tops[k][0] + neck[0]) / 2, 262], neck, { w: 1.5 + r() * 0.6, colour: k % 3 === 1 ? C.sageDeep : C.sage, op: 0.55, pressAt: 0.7 });
        s += stem(r, neck, [(neck[0] + x) / 2 + (r() - 0.5) * 5, 332], [x, y], { w: 1.6 + r() * 0.7, colour: k % 3 === 1 ? C.sageDeep : C.sage, op: 0.6, pressAt: 0.82 });
        s += `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="0.8" fill="${PAPER}" stroke="${INK}" stroke-width="0.3"/>`;
    });
    svg('stems', box, '', s);
}

/* ---------- The kraft paper: ONE sheet ---------- */
const KRAFT_FILTERS = wc('wk', { sd: 1.2, gain: 10, cut: -4, er: 0.9, pool: 1.6, dark: 0.8, rim: 0.85 }) + blur('bl', 3) + blur('bs', 0.9);
const kraftGrad = (id, stops) => rad(id, T[0], T[1], 215, stops);
/**
 * One piece of the sheet. `outline` is its edge; the wash follows it loosely: `inset[i]` is how far inside the
 * line the brush stopped at point i (negative: it ran over). `folds` are [angle, radius, width, tone] valleys from
 * the tie; `firm` are runs of the edge where the nib pressed; `creases` are hairlines [[a0, r0], [a1, r1]].
 */
function kraft(name, box, seed, outline, { inset, folds = [], firm = [], creases = [], stops, lightFolds = [], op = 0.9, extraInk = '', bareUnder = C.kraftBare }) {
    const r = rng(seed);
    const edge = sketch(r, outline, { jit: 0.6, close: true });
    let s = `<path d="${curve(edge, true)}" fill="${bareUnder}"/>`;
    const c = centroid(outline);
    const body = outline.map(([x, y], i) => {
        const d = Math.hypot(x - c[0], y - c[1]) || 1, k = inset[i % inset.length] + (r() - 0.5) * 1.2;
        return [x - ((x - c[0]) / d) * k, y - ((y - c[1]) / d) * k];
    });
    s += wash(`<path d="${curve(sketch(r, body, { jit: 1.3, step: 24, close: true }), true)}" fill="url(#k)"/>`, op, 'wk', '');
    // soft folds: darker pigment settled in the valleys while the wash was wet, the ridge beside each left lighter
    let dark = '', light = '';
    for (const [a, rr, w = 3.5, r0 = 16] of folds) dark += `<path d="${line([P(a - 0.4, r0), P(a - w, rr * 0.62), P(a - 0.3, rr), P(a + w * 0.6, rr * 0.55)], true)}" fill="${C.kraftDeep}"/>`;
    for (const [a, rr, w = 2.4, r0 = 30] of lightFolds) light += `<path d="${line([P(a, r0), P(a - w, rr * 0.6), P(a, rr), P(a + w, rr * 0.6)], true)}" fill="#E6D2B0"/>`;
    s += `<g filter="url(#bl)" opacity="0.72" style="mix-blend-mode:multiply">${dark}</g><g filter="url(#bl)" opacity="0.7">${light}</g>`;
    // where the brush ran dry
    let dry = '';
    for (let k = 0; k < 9; k++) {
        const p = outline[Math.floor(r() * outline.length)], t0 = 0.25 + r() * 0.3, t1 = t0 + 0.2 + r() * 0.3;
        const a = [T[0] + (p[0] - T[0]) * t0, T[1] + (p[1] - T[1]) * t0], b = [T[0] + (p[0] - T[0]) * t1, T[1] + (p[1] - T[1]) * t1];
        const nx = -(b[1] - a[1]), ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1, w = 0.5 + r() * 0.8;
        dry += `<path d="${line([a, [(a[0] + b[0]) / 2 + (nx / l) * w, (a[1] + b[1]) / 2 + (ny / l) * w], b, [(a[0] + b[0]) / 2 - (nx / l) * w, (a[1] + b[1]) / 2 - (ny / l) * w]], true)}" fill="${C.kraftBare}"/>`;
    }
    s += `<g filter="url(#bs)" opacity="0.6">${dry}</g>`;
    // the pen
    s += hair(curve(edge, true), 0.4, 1, gaps(r, 2.2));
    for (const [i0, i1, w = 0.6] of firm) s += taper(sketch(r, outline.slice(i0, i1 + 1), { jit: 0.4, step: 22 }), w, 0.4);
    for (const [[a0, r0], [a1, r1]] of creases) s += hair(curve(sketch(r, [P(a0, r0), P((a0 + a1) / 2 + (r() - 0.5) * 2, (r0 + r1) / 2), P(a1, r1)], { jit: 0.6, step: 30 })), 0.34, 0.8, gaps(r, 1.5));
    svg(name, box, kraftGrad('k', stops) + KRAFT_FILTERS, s + extraInk);
}
{
    // The sheet lying open behind the flowers: a square of paper on the diagonal, the tie near its lower corner,
    // its left wing lower than its right, one corner turned over.
    const outline = [
        [178, 366], [150, 338], [112, 296], [70, 252], [42, 224],          // lower left edge up to the left corner
        P(-58, 172), P(-50, 196), P(-41, 214),                               // left wing rising
        P(-30, 204), P(-18, 188), P(-6, 180),                                // the dip behind the flowers
        P(6, 190), P(17, 210), P(26, 226),                                   // right wing, higher
        P(36, 218), P(47, 196), P(57, 170),                                  // falling to the right corner
        [322, 232], [286, 270], [246, 310], [206, 348],                      // lower right edge back down
    ];
    const r = rng(60);
    // the turned-over corner at the upper right: the paler back of the paper
    const ear = [P(22, 219), P(30, 224), P(33, 205), P(25, 199)];
    const earInk = `<path d="${curve(ear, true)}" fill="#EFE2C8"/>` + hair(curve(ear, true), 0.3, 1, gaps(r)) + taper([ear[3], [(ear[3][0] + ear[2][0]) / 2, (ear[3][1] + ear[2][1]) / 2 + 0.8], ear[2]], 0.55);
    kraft('sheet', [28, 70, 308, 306], 61, outline, {
        inset: [1, 2, -1.5, 3, 5, 6, 3, 1, -1, 2, 4, 2, -2, 1, 3, 0, -2, -1.5, 2, 4, 1],
        folds: [[-46, 190, 4], [-24, 170, 3.2], [-4, 160, 3], [14, 196, 3.6], [38, 196, 4.2], [-70, 96, 5, 10], [70, 100, 5, 10], [-150, 46, 9, 6], [150, 44, 9, 6]],
        lightFolds: [[-36, 196], [4, 180], [27, 210], [50, 176], [-58, 150]],
        firm: [[17, 20, 0.7], [0, 2, 0.6], [13, 15, 0.55], [8, 10, 0.4]],
        creases: [[[-40, 30], [-44, 150]], [[-12, 40], [-14, 150]], [[20, 36], [16, 170]], [[44, 30], [47, 150]], [[-80, 20], [-74, 110]]],
        stops: [[0, '#93704A'], [0.22, '#AE895F'], [0.6, '#C4A37A'], [1, '#D6BB94']],
        extraInk: earInk,
    });
}
{
    // The rolled cone, closed: the under-lapping left of the front, then the front edge that laps over it.
    const stops = [[0, '#9A774F'], [0.25, '#B9966B'], [0.7, '#D0B28A'], [1, '#DCC5A1']];
    const left = [
        [169, 302], P(-19, 40), P(-20, 100), P(-20.5, 150),                 // outer edge up
        P(-15, 158), P(-9, 166), P(-2, 171), P(5, 168),                      // the mouth, rising to the middle
        P(8, 120), P(11, 60), [186, 302],                                    // (hidden under the front edge) back down
    ];
    kraft('front-l', [108, 104, 144, 216], 62, left, {
        inset: [0, -1, 1.5, 3, 5, 4, 5, 3, 0, 0, 0],
        folds: [[-13, 150, 2.6], [-4, 150, 5, 20]],
        lightFolds: [[-16, 140, 1.6]],
        firm: [[1, 3, 0.5]],
        creases: [[[-12, 30], [-14, 120]]],
        stops,
    });
    const right = [
        [176, 304], P(-10, 26), P(-9.5, 70), P(-8.5, 120), P(-7, 178),      // the front edge, the long diagonal lap
        P(0, 176), P(8, 170), P(15, 161), P(20.5, 151),                      // the mouth falling to the right
        P(20, 100), P(19, 40), [191, 302],                                   // outer edge down
        [188, 312], [181, 322], [174, 312],                                  // the point of the cone under the tie
    ];
    kraft('front-r', [108, 104, 144, 226], 63, right, {
        inset: [0, 0.5, 2, 3, 5, 5, 4, 5, 3, 1.5, -1, 0, 1, 1, 1],
        folds: [[14, 150, 2.8], [3, 140, 2.4]],
        lightFolds: [[-4, 168, 2], [10, 150, 1.6]],
        firm: [[1, 4, 0.75], [9, 11, 0.55], [12, 14, 0.5]],
        creases: [[[8, 30], [9, 130]], [[15, 60], [16, 140]]],
        stops,
    });
}

/* ---------- Foliage ---------- */
{
    const r = rng(71);
    let s = '';
    s += sprig(r, [166, 262], [100, 200], [44, 106], { pairs: 7, s0: 16, s1: 9, from: 0.48 });
    s += sprig(r, [174, 250], [126, 140], [88, 54], { pairs: 7, s0: 15, s1: 8, from: 0.48, colour: C.blueSage, bare: 0.3 });
    s += sprig(r, [170, 256], [112, 176], [58, 62], { pairs: 5, s0: 12, s1: 7, from: 0.6, bare: 0.4 });
    svg('euc-l', [24, 30, 164, 274], wc('w'), s);
}
{
    const r = rng(72);
    let s = '';
    s += sprig(r, [194, 262], [262, 200], [316, 102], { pairs: 7, s0: 16, s1: 9, from: 0.48, bare: 0.3 });
    s += sprig(r, [186, 250], [236, 140], [270, 52], { pairs: 7, s0: 15, s1: 8, from: 0.48, colour: C.blueSage });
    s += sprig(r, [190, 256], [250, 176], [304, 60], { pairs: 5, s0: 12, s1: 7, from: 0.6 });
    svg('euc-r', [172, 30, 164, 274], wc('w'), s);
}
{
    const r = rng(73);
    let s = '';
    s += spray(r, [172, 240], [150, 150], [142, 58], { twigs: 9 });
    s += spray(r, [168, 250], [110, 196], [42, 158], { twigs: 8, colour: C.cream });
    s += spray(r, [176, 240], [168, 130], [178, 48], { twigs: 8 });
    s += spray(r, [188, 240], [212, 150], [220, 54], { twigs: 9, colour: C.cream });
    s += spray(r, [192, 250], [250, 196], [318, 156], { twigs: 8 });
    s += spray(r, [190, 246], [236, 170], [292, 80], { twigs: 7 });
    svg('fill', [26, 30, 308, 274], wc('w', { sd: 0.6, er: 0.6, pool: 0.8 }), s);
}
{
    // small sprays that come forward between the front blooms
    const r = rng(75);
    let s = '';
    s += spray(r, [176, 262], [150, 240], [112, 246], { twigs: 6, colour: C.cream, len: 10 });
    s += spray(r, [184, 262], [214, 244], [254, 238], { twigs: 6, len: 10 });
    s += spray(r, [180, 250], [176, 206], [166, 160], { twigs: 5, len: 9 });
    svg('fill-front', [96, 140, 176, 136], wc('w', { sd: 0.6, er: 0.6, pool: 0.8 }), s);
}

/* ---------- Blooms: each from its own side ---------- */
// a: the big peony, three-quarters: a bowl tipped back
svg('bloom-a', boxAt(181, 110, 80), W, peony(81, 181, 112, 50, PINK, { sq: 0.8, off: [0.14, 0.1], cover: 0.82 }));
// b: a peony from the side, leaning out to the upper left; only its near half has had its colour
svg('bloom-b', boxAt(106, 130, 66), W, profile(82, 122, 152, 40, -2.05, BLUSH, { open: 1, to: [150, 196], leaves: [[2.9, 1.2, C.sage], [-0.6, 0.9, null, -0.1]], painted: p => Math.cos(p.ang + 0.9) > -0.2, off: [0.3, 0.2] }));
// c: a cream ranunculus, full face
svg('bloom-c', boxAt(252, 126, 64), W, ranunculus(83, 252, 126, 38, CREAM, { leaves: [[0.12, 1.25, C.sage, -0.08], [-0.72, 1.1, null]], off: [0.14, -0.1] }));
// d: a rose ranunculus, tipped a little
svg('bloom-d', boxAt(134, 196, 60), W, ranunculus(84, 134, 196, 36, ROSE, { sq: 0.86, leaves: [[2.5, 1.3, C.sage], [3.6, 1.05, C.sageDeep, -0.1]] }));
// e: a pale peony that droops over the edge of the paper, lower right
svg('bloom-e', boxAt(232, 198, 62), W, profile(85, 214, 176, 38, 0.95, PINK, { open: 0.95, to: [196, 150], leaves: [[-0.5, 1.2, C.sage, -0.08], [2.4, 0.9, C.sageDeep]], off: [-0.1, 0.24], stemBend: -0.5 }));
// f: a small ranunculus, three-quarters
svg('bloom-f', boxAt(182, 236, 46), W, ranunculus(86, 182, 236, 26, PINK, { sq: 0.76, leaves: [[2.3, 1.4, C.sage], [0.9, 1.4, C.sage, -0.08]], off: [0.2, 0.1] }));
// g: closed buds on their stems, left
{
    const r = rng(87);
    let s = '';
    s += profile(871, 66, 176, 13, -2.3, ROSE, { open: 0.12, to: [112, 214], stemBend: 0.8 });
    s += profile(872, 86, 158, 10, -1.9, PINK, { open: 0.12, to: [112, 214], stemBend: -0.6 });
    s += profile(873, 62, 200, 15, -2.75, CREAM, { open: 0.5, to: [112, 214], stemBend: 0.5 });
    const lf = leaf(r, 96, 204, 2.7, 26, 9, { bend: -0.1 });
    s += lf.ink + wash(lf.w, 0.66);
    svg('bloom-g', boxAt(80, 184, 44), W, s);
}
// h: a half-open ranunculus from the side, right
svg('bloom-h', boxAt(292, 170, 40), W, profile(88, 284, 182, 24, -0.75, ROSE, { open: 0.55, to: [258, 208], leaves: [[0.5, 1.5, C.sage, -0.08]] }));

/* ---------- The jute twine ---------- */
{
    const r = rng(91);
    let s = '';
    for (let k = 0; k < 5; k++) {
        const y = 291 + k * 3.4;
        s += cord(r, `M${f(165.5 - k * 0.3)} ${f(y - 1)}Q180 ${f(y + 3.2 + r())} ${f(194.5 + k * 0.3)} ${f(y - 1.2)}`, 2.0, k % 2 ? C.juteDeep : C.jute);
    }
    s += taper([[166, 307], [174, 309.6], [186, 309.6], [194, 307]], 0.5);
    svg('twine', [158, 284, 44, 30], '', s);
}
{
    const r = rng(92);
    let s = cord(r, curve([[178, 303], [172, 316], [165, 332], [169, 348], [163, 362]]), 1.7, C.jute) + cord(r, curve([[183, 303], [190, 318], [199, 334], [194, 350], [201, 366]]), 1.7, C.jute);
    for (const [x, y] of [[163, 362], [201, 366]]) for (const dx of [-2, 0, 2]) s += hair(`M${x} ${y}l${dx} 4`, 0.28, 0.8);
    svg('tails', [154, 296, 56, 78], '', s);
}
{
    const r = rng(93);
    const l = [[179, 300], [164, 289], [148, 286], [142, 296], [150, 306], [166, 305], [179, 301]];
    const rr = [[181, 300], [196, 288], [213, 287], [218, 297], [209, 307], [194, 305], [181, 301]];
    const knot = `<path d="M175.5 296.5C178 295 182.5 295 184.6 296.8C185.8 299.5 185.6 303 184.2 305.2C181.5 306.6 178 306.4 175.8 305C174.6 302 174.6 299 175.5 296.5Z" fill="${C.jute}" stroke="${INK}" stroke-width="0.34"/>` +
        taper([[184.4, 297], [185.6, 301], [184.2, 305], [180, 306.4]], 0.5) + hair('M177.5 297.5L177 304.5M180.2 297L180.2 305M183 297.8L183.2 304.4', 0.28, 0.6);
    svg('bow', [136, 280, 88, 32], '', cord(r, curve(l), 1.8, C.jute) + cord(r, curve(rr), 1.8, C.jute) + taper(l.slice(3, 7), 0.45) + taper(rr.slice(3, 7), 0.45) + knot);
}

/* ---------- Petals: one that drifts (the stage scatters copies of it), and those that have come to rest ---------- */
{
    const r = rng(101);
    const pts = petalPts(r, 174.5, 158, -0.15, 13, 10.5, { n: 8, ruffle: 0.05, notch: 0.06 });
    svg('petal', [172, 150, 18, 16], wc('w', { sd: 0.5, er: 0.5, pool: 0.7 }), inkPetal(r, pts, [174.5, 158], { bare: 0, vein: 1 }) + wash(fillP(drop(r, pts, [175.5, 158.6], 14), C.pink), 0.7));
}
{
    const r = rng(102);
    let s = '', w = '';
    for (const [x, y, ang, len, c] of [[52, 286, 0.4, 12, C.pink], [86, 322, 2.2, 11, C.pinkPale], [118, 356, 5.4, 10, C.pink], [248, 346, 1.1, 12, C.rose], [330, 262, 3.6, 11, C.pink], [268, 376, 4.4, 10, null], [30, 240, 5.9, 9, C.pinkPale], [150, 348, 0.9, 8, C.cream]]) {
        const pts = petalPts(r, x, y, ang, len, len * 0.82, { n: 8, ruffle: 0.05, notch: 0.05 });
        s += inkPetal(r, pts, [x, y], { bare: 0.1, vein: 0.5 });
        if (c) w += fillP(drop(r, pts, [x + (r() - 0.5) * 5, y + (r() - 0.5) * 5], len * 1.6), c);
    }
    svg('fallen', [20, 190, 324, 196], wc('w', { sd: 0.5, er: 0.5, pool: 0.7 }), s + wash(w, 0.68));
}

/* ---------- tooth: the grain of cold-pressed paper, over line and wash alike ---------- */
{
    const r = rng(111);
    const specks = (n, x0, y0, x1, y1) => {
        const cols = Math.round(Math.sqrt((n * (x1 - x0)) / (y1 - y0))), rows = Math.round(n / cols);
        const dx = (x1 - x0) / cols, dy = (y1 - y0) / rows;
        let d = '', px = 0, py = 0;
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
            const x = Math.round(x0 + (i + r()) * dx), y = Math.round(y0 + (j + r()) * dy);
            d += `${d ? 'm' : 'M'}${d ? x - px : x} ${d ? y - py : y}h0`;
            px = x; py = y;
        }
        return d;
    };
    svg('tooth', [-12, -12, 384, 474], '',
        `<path d="${specks(3000, -12, -12, 372, 462)}" fill="none" stroke="#FFFDF7" stroke-width="0.75" stroke-linecap="round" stroke-opacity="0.5"/>` +
        `<path d="${specks(2200, -12, -12, 372, 462)}" fill="none" stroke="#6B5646" stroke-width="0.6" stroke-linecap="round" stroke-opacity="0.14"/>`);
}

process.stdout.write(Object.entries(BOXES).map(([k, b]) => `${k}: [${b.join(', ')}]`).join('\n') + '\n');
