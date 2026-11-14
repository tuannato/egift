// Generator for the "archmoon" wrapper art (Eid: a tiled gateway at nightfall).
// Technique: GLAZED CERAMIC TILE MOSAIC (zellige / girih) with inlaid brass lines.
// Everything in the picture is a hand-cut glazed tile lying in grout:
//   - star-and-polygon fields written out by code (8-fold stars with kites and diamonds on the walls,
//     10-fold rosettes in the spandrels, hexagons on the dado), coarser running courses for sky, doors
//     and paving, rings of tiles round the moon and in the trees;
//   - every tile is cut a little wrong: its corners wander, its grout joint is never one width, its glaze
//     is lighter or darker than its neighbour's, about half carry one sliver of highlight, a few are
//     crazed, a few have a corner chipped off, a very few have fallen out and show the mortar bed;
//   - brass is inlay: interlaced strapwork (two angular strands, over and under) and thin lines;
//   - flat glaze only. The only soft things are the lamp-light pools (separate glow layers).
// The gate allows no <use>/<pattern>: every tile is written out (whole numbers at scale 4, relative).
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/archmoon.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeSvg } from '../svg-allow.mjs';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'archmoon');
if (!OUT.endsWith('wrappers/archmoon')) throw new Error('out dir must be public/wrappers/archmoon');
mkdirSync(OUT, { recursive: true });
for (const n of readdirSync(OUT)) if (n.endsWith('.svg')) unlinkSync(join(OUT, n));

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
const PI = Math.PI, TAU = PI * 2;
const K = 4; // tiles are written in whole numbers at this scale
const q = v => Math.round(v * K);
const f1 = v => String(Math.round(v * 10) / 10);
const pack = arr => { let s = ''; for (const v of arr) { const t = String(v); s += (s && !t.startsWith('-') ? ' ' : '') + t; } return s; };
const P2 = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const cen = pts => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
const area = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], n = pts[(i + 1) % pts.length]; a += p[0] * n[1] - n[0] * p[1]; } return a / 2; };

/** A closed polygon as a relative path at scale K. */
function dPoly(pts) {
    let px = q(pts[0][0]), py = q(pts[0][1]);
    const tok = [];
    for (let i = 1; i < pts.length; i++) { const x = q(pts[i][0]), y = q(pts[i][1]); if (x === px && y === py) continue; tok.push(x - px, y - py); px = x; py = y; }
    if (tok.length < 4) return '';
    return `M${q(pts[0][0])} ${q(pts[0][1])}l${pack(tok)}z`;
}
/** An open polyline at scale K. */
function dLine(pts) {
    let px = q(pts[0][0]), py = q(pts[0][1]);
    const tok = [];
    for (let i = 1; i < pts.length; i++) { const x = q(pts[i][0]), y = q(pts[i][1]); if (x === px && y === py) continue; tok.push(x - px, y - py); px = x; py = y; }
    return tok.length ? `M${q(pts[0][0])} ${q(pts[0][1])}l${pack(tok)}` : '';
}
/** The polygon with every edge moved inward by g (outward when g < 0). */
function inset(pts, g) {
    const n = pts.length, s = area(pts) > 0 ? 1 : -1, out = [];
    for (let i = 0; i < n; i++) {
        const a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
        let e1x = b[0] - a[0], e1y = b[1] - a[1], e2x = c[0] - b[0], e2y = c[1] - b[1];
        const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
        e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
        const n1x = -e1y * s, n1y = e1x * s, n2x = -e2y * s, n2y = e2x * s;
        const den = 1 + n1x * n2x + n1y * n2y;
        if (den < 0.12) { out.push([b[0] + (n1x + n2x) * g * 0.5, b[1] + (n1y + n2y) * g * 0.5]); continue; }
        out.push([b[0] + ((n1x + n2x) * g) / den, b[1] + ((n1y + n2y) * g) / den]);
    }
    if (g > 0) { const a0 = area(pts), a1 = area(out); if (a0 * a1 <= 0 || Math.abs(a1) < 0.6) return null; }
    return out;
}
const hex2 = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** A glaze lighter (t > 0) or darker (t < 0) than `h`. */
const shade = (h, t) => { const c = rgb(h); return '#' + c.map(v => hex2(t >= 0 ? v + (255 - v) * t : v * (1 + t))).join('').toUpperCase(); };
/** A firing's worth of one glaze: five shades. */
const glaze = (h, spread = 0.1) => [-1, -0.45, 0, 0, 0.5, 1].map(t => shade(h, t * spread));

const BED = '#7C7466';

/** A mosaic: tiles collected by glaze, written as one path per glaze. */
class Mo {
    constructor(seed, box, o = {}) { this.r = rng(seed); this.box = box; this.u = new Map(); this.f = new Map(); this.v = new Map(); this.hi = ''; this.cr = ''; this.o = { hiOp: 0.36, bed: BED, ...o }; this.count = 0; }
    /** Under every tile of this mosaic: beds, shadows. */
    raw(color, pts) { const d = dPoly(pts); if (d) this.u.set(color, (this.u.get(color) ?? '') + d); }
    put(color, pts) { const d = dPoly(pts); if (d) this.f.set(color, (this.f.get(color) ?? '') + d); }
    /** Over every tile: openings cut through. */
    over(color, pts) { const d = dPoly(pts); if (d) this.v.set(color, (this.v.get(color) ?? '') + d); }
    seen(pts) { const [x, y, w, h] = this.box; return pts.some(p => p[0] > x - 1 && p[0] < x + w + 1 && p[1] > y - 1 && p[1] < y + h + 1); }
    /** One tile cut for the cell `cell` from the glazes `pal`. */
    tile(cell, pal, o = {}) {
        if (!this.seen(cell)) return;
        const r = this.r, { gap = 0.42, jit = 0.28, miss = 0.008, chip = 0.05, hl = 0.5, craze = 0.05 } = o;
        if (r() < miss) { const b = inset(cell, 0.12); if (b) this.raw(this.o.bed, b); return; }
        let p = inset(cell, gap * (0.6 + r() * 0.8));
        if (!p) return;
        p = p.map(v => [v[0] + (r() - 0.5) * 2 * jit, v[1] + (r() - 0.5) * 2 * jit]);
        if (r() < chip && p.length >= 4) {
            const i = Math.floor(r() * p.length), a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length];
            p.splice(i, 1, lerp(b, a, 0.22 + r() * 0.2), lerp(b, c, 0.22 + r() * 0.2));
        }
        this.put(pal[Math.floor(r() * pal.length)], p);
        this.count++;
        if (r() < hl) {
            // one sliver of light along the edge that faces up and left
            const s = area(p) > 0 ? 1 : -1; let best = -9, bi = 0;
            for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const d = (((b[1] - a[1]) * s) / l) * -0.55 + ((-(b[0] - a[0]) * s) / l) * -0.83 + (l > 2.4 ? 0 : -3); if (d > best) { best = d; bi = i; } }
            if (best > 0.3) {
                const a = p[bi], b = p[(bi + 1) % p.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
                const nx = (-(b[1] - a[1]) * s) / l, ny = ((b[0] - a[0]) * s) / l, t0 = 0.16 + r() * 0.14, t1 = 0.55 + r() * 0.28;
                const A = lerp(a, b, t0), B = lerp(a, b, t1);
                this.hi += dLine([[A[0] + nx * 0.62, A[1] + ny * 0.62], [B[0] + nx * 0.62, B[1] + ny * 0.62]]);
            }
        }
        if (r() < craze) {
            const c = cen(p), a = r() * PI, rad = Math.sqrt(Math.abs(area(p))) * 0.42;
            this.cr += dLine([P2(c, rad, a), [c[0] + (r() - 0.5) * rad * 0.7, c[1] + (r() - 0.5) * rad * 0.7], P2(c, rad, a + PI + (r() - 0.5))]);
        }
    }
    /** A tile set into another surface: its bed of grout first. */
    inlay(pts, pal, bed, o = {}) { if (!this.seen(pts)) return; const b = inset(pts, -(o.grow ?? 0.55)); if (b) this.raw(bed, b); this.tile(pts, pal, { gap: 0.05, miss: 0, chip: 0.02, ...o }); }
    out() {
        let s = '';
        for (const [c, d] of this.u) s += `<path fill="${c}" d="${d}"/>`;
        for (const [c, d] of this.f) s += `<path fill="${c}" d="${d}"/>`;
        if (this.hi) s += `<path d="${this.hi}" fill="none" stroke="#FFFFFF" stroke-opacity="${this.o.hiOp}" stroke-width="2.2" stroke-linecap="round"/>`;
        if (this.cr) s += `<path d="${this.cr}" fill="none" stroke="#000000" stroke-opacity=".3" stroke-width="1" stroke-linejoin="round"/>`;
        for (const [c, d] of this.v) s += `<path fill="${c}" d="${d}"/>`;
        return s;
    }
}
const fill = (color, pts) => `<path fill="${color}" d="${pts.map ? dPoly(pts) : pts}"/>`;
const line = (pts, color, w, extra = '') => `<path d="${typeof pts === 'string' ? pts : dLine(pts)}" fill="none" stroke="${color}" stroke-width="${f1(w * K)}" stroke-linejoin="round"${extra}/>`;
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const ngon = (c, r, n, rot = 0) => Array.from({ length: n }, (_, i) => P2(c, r, rot + (i * TAU) / n));
const star = (c, r1, r0, n, rot = 0) => Array.from({ length: n * 2 }, (_, i) => P2(c, i % 2 ? r0 : r1, rot + (i * PI) / n));

/** Running courses of four-sided tiles (opus tessellatum): wavering joints, staggered ends. */
function courses(mo, x0, y0, x1, y1, h, pal, o = {}) {
    const { lmin = 0.8, lmax = 1.6, wob = 0.12, keep, vert = false, tile = {} } = o, r = mo.r;
    const U0 = vert ? y0 : x0, U1 = vert ? y1 : x1, V0 = vert ? x0 : y0, V1 = vert ? x1 : y1;
    const nv = Math.max(1, Math.round((V1 - V0) / h)), hh = (V1 - V0) / nv;
    const bnd = [];
    for (let j = 0; j <= nv; j++) { const a = j === 0 || j === nv ? 0 : wob * hh, p1 = r() * TAU, p2 = r() * TAU, v = V0 + j * hh; bnd.push(u => v + a * (Math.sin(u * 0.23 + p1) + 0.6 * Math.sin(u * 0.61 + p2))); }
    const map = (u, v) => (vert ? [v, u] : [u, v]);
    for (let j = 0; j < nv; j++) {
        let u = U0 - r() * hh * lmin;
        while (u < U1 - 0.01) {
            const w = hh * (lmin + r() * (lmax - lmin)), ua = Math.max(u, U0);
            let ub = Math.min(u + w, U1);
            if (U1 - ub < hh * 0.45) ub = U1;
            u = ub;
            if (ub - ua < hh * 0.3) continue;
            const cell = [map(ua, bnd[j](ua)), map(ub, bnd[j](ub)), map(ub, bnd[j + 1](ub)), map(ua, bnd[j + 1](ua))];
            const c = cen(cell);
            if (keep && !keep(c[0], c[1])) continue;
            mo.tile(cell, typeof pal === 'function' ? pal(c[0], c[1]) : pal, tile);
        }
    }
}
/** Rings of tiles round a centre (opus vermiculatum). */
function rings(mo, c, r0, r1, step, arc, pal, o = {}) {
    const r = mo.r, { keep, tile = {} } = o;
    let ra = r0;
    while (ra < r1 - 0.01) {
        let h = step * (0.86 + r() * 0.28); if (r1 - (ra + h) < step * 0.5) h = r1 - ra;
        const rm = ra + h / 2, n = Math.max(5, Math.round((TAU * rm) / (arc * (0.9 + r() * 0.2)))), a0 = r() * TAU, cuts = [];
        for (let i = 0; i < n; i++) cuts.push(a0 + ((i + (r() - 0.5) * 0.4) * TAU) / n);
        for (let i = 0; i < n; i++) {
            const a = cuts[i], b = i === n - 1 ? cuts[0] + TAU : cuts[i + 1], m = (a + b) / 2;
            const cc = P2(c, rm, m);
            if (keep && !keep(cc[0], cc[1])) continue;
            const wide = (b - a) * rm > 7;
            const cell = wide ? [P2(c, ra, a), P2(c, ra, m), P2(c, ra, b), P2(c, ra + h, b), P2(c, ra + h, m), P2(c, ra + h, a)] : [P2(c, ra, a), P2(c, ra, b), P2(c, ra + h, b), P2(c, ra + h, a)];
            mo.tile(cell, typeof pal === 'function' ? pal(cc[0], cc[1]) : pal, tile);
        }
        ra += h;
    }
}
/** An n-fold rosette: a star, a ring of kites, a ring of petals, wedges between them. */
function rosette(mo, c, n, R, pals, rot = -PI / 2, o = {}) {
    const T = { gap: 0.3, ...(o.tile ?? {}) };
    const st = TAU / n, r1 = R * (o.r1 ?? 0.4), r0 = R * (o.r0 ?? 0.2), r2 = R * (o.r2 ?? 0.62);
    const tip = k => P2(c, r1, rot + k * st), inn = k => P2(c, r0, rot + (k + 0.5) * st), outp = k => P2(c, r2, rot + (k + 0.5) * st);
    const Em = k => P2(c, R, rot + (k - 0.27) * st), Ep = k => P2(c, R, rot + (k + 0.27) * st);
    const s = []; for (let k = 0; k < n; k++) s.push(tip(k), inn(k));
    mo.tile(s, pals.star, { ...T, miss: 0 });
    for (let k = 0; k < n; k++) {
        mo.tile([tip(k), outp(k), tip(k + 1), inn(k)], pals.kite[k % pals.kite.length], T);
        mo.tile([tip(k), outp(k - 1), Em(k), Ep(k), outp(k)], pals.petal[k % pals.petal.length], T);
        mo.tile([outp(k), Ep(k), Em(k + 1)], pals.wedge, T);
    }
}
/** Rows of tiles following a turned profile (a pot, a bowl): hw(y) is the half-width at y. */
function profile(mo, x, ys, hw, cols, pal, tile = {}) {
    for (let rw = 0; rw < ys.length - 1; rw++) {
        const y0 = ys[rw], y1 = ys[rw + 1], n = typeof cols === 'function' ? cols(rw) : cols, cuts = [0];
        for (let i = 1; i < n; i++) cuts.push((i + (mo.r() - 0.5) * 0.36) / n);
        cuts.push(1);
        for (let i = 0; i < n; i++) { const a = cuts[i] * 2 - 1, b = cuts[i + 1] * 2 - 1; mo.tile([[x + hw(y0) * a, y0], [x + hw(y0) * b, y0], [x + hw(y1) * b, y1], [x + hw(y1) * a, y1]], pal(rw, i), tile); }
    }
}
const profileBed = (x, y0, y1, hw, n = 10) => { const L = [], R = []; for (let i = 0; i <= n; i++) { const y = y0 + ((y1 - y0) * i) / n; L.push([x - hw(y), y]); R.push([x + hw(y), y]); } return [...L, ...R.reverse()]; };
/** Interlaced strapwork: two angular strands along pos(s, offset), crossing over and under. */
function strap(acc, pos, S, A, L, rand) {
    const N = Math.max(2, Math.round(S / (L / 2))), h = S / N;
    const pk = (k, sg) => { const p = pos((k + 0.5) * h, sg * A * (k % 2 ? -1 : 1)); return [p[0] + (rand() - 0.5) * 0.35, p[1] + (rand() - 0.5) * 0.35]; };
    const a = [pos(0, 0)], b = [pos(0, 0)];
    for (let k = 0; k < N; k++) { a.push(pk(k, 1)); b.push(pk(k, -1)); }
    a.push(pos(S, 0)); b.push(pos(S, 0));
    acc.a += dLine(a); acc.b += dLine(b);
    for (let k = 1; k < N; k += 2) acc.p += dLine([lerp(b[k], b[k + 1], 0.24), lerp(b[k], b[k + 1], 0.76)]);
}
const BRASS = '#D0A341', BRASS_D = '#4A3518', BRASS_L = '#F1D98A';
const newStrap = () => ({ a: '', b: '', p: '' });
function strapOut(acc, w = 1.25) {
    const o = w + 1.1;
    return line(acc.b, BRASS_D, o) + line(acc.b, BRASS, w) + line(acc.a, BRASS_D, o) + line(acc.a, BRASS, w) + line(acc.p, BRASS_D, o) + line(acc.p, BRASS, w)
        + line(acc.a, BRASS_L, 0.3, ' stroke-dasharray="9 17" stroke-opacity=".8"');
}
/** A thin brass line let into the tiles. */
const inlayLine = (pts, w = 0.7) => line(pts, BRASS_D, w + 0.7) + line(pts, BRASS, w);

const SIZES = {};
function svg(name, box, inner, plain = '') {
    const [x, y, w, h] = box;
    const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${plain}${inner ? `<g transform="scale(${1 / K})">${inner}</g>` : ''}</svg>`;
    const { svg: s, problems } = sanitizeSvg(raw);
    if (s === undefined) throw new Error(`${name}.svg refused: ${problems.join('; ')}`);
    if (s.length > 59000) throw new Error(`${name}.svg is ${s.length} bytes`);
    SIZES[name] = s.length;
    writeFileSync(join(OUT, `${name}.svg`), s);
}

/* ---------- Glazes ---------- */
// Outside, at dusk: cool.
const TURQ = glaze('#218A98', 0.13), TURQ_L = glaze('#3EA6AC', 0.12), WHITE = glaze('#AEBBC9', 0.08), NAVY = glaze('#1A3B78', 0.14), DEEP = glaze('#122656', 0.14);
const OCHRE = glaze('#B88A36', 0.12), GROUT = '#8591A4', SLATE = glaze('#2E3C5E', 0.12), STONE = glaze('#7C8A9E', 0.1);
// The same glazes where the courtyard's light falls on them.
const L_TURQ = glaze('#4CC6B4', 0.1), L_TURQ_L = glaze('#7ADCC6', 0.1), L_WHITE = glaze('#FFEFC8', 0.06), L_NAVY = glaze('#3F6DB4', 0.12), L_OCHRE = glaze('#F6C254', 0.1), L_STONE = glaze('#F3D9A2', 0.08), L_GROUT = '#C9A66C';
const BRASS_T = glaze('#CDA040', 0.14), BRONZE = glaze('#8A6424', 0.14);
const WOOD = [...glaze('#6C4025', 0.1), ...glaze('#5F381F', 0.08)], WOOD_G = '#24150B';
const TERRA = glaze('#B9562F', 0.14), LEAF = [...glaze('#2E7A4E', 0.16), ...glaze('#3F8F58', 0.12)], LEAF_D = glaze('#1E5A3C', 0.14);
// Inside, under the lamps: warm.
const W_WHITE = glaze('#F5E6C2', 0.07), W_TURQ = glaze('#3FB9AC', 0.12), W_AMBER = glaze('#F0A23A', 0.12), W_GOLD = glaze('#FFCB62', 0.1), W_GROUT = '#B79F74';

/* ---------- The gateway's geometry ---------- */
const CX = 180, YS = 258, RC = 26, RR = 100, JB = 378; // the arch: two arcs of radius RR about (CX±RC, YS), jambs to JB
const PH0 = (160 * PI) / 180, LJ = JB - (YS + RR * Math.sin(PH0)), LA = RR * (TAU - Math.acos(-RC / RR) - PH0), LT = LJ + LA;
/** A point of the opening's outline, u from the foot of a jamb (0) to the apex (1), pushed out by d; side -1 left, +1 right. */
function archPt(u, d, side = -1) {
    const R = RR + d, s = u * LT;
    let p;
    if (s < LJ) p = [CX + RC + R * Math.cos(PH0), JB - s];
    else { const pa = TAU - Math.acos(-RC / R), ph = PH0 + ((s - LJ) / LA) * (pa - PH0); p = [CX + RC + R * Math.cos(ph), YS + R * Math.sin(ph)]; }
    return side < 0 ? p : [2 * CX - p[0], p[1]];
}
function archPoly(d, n = 44) { const L = [], Rr = []; for (let i = 0; i <= n; i++) { L.push(archPt(i / n, d, -1)); Rr.push(archPt(i / n, d, 1)); } return [...L, ...Rr.reverse().slice(1)]; }
const inArch = (x, y, d) => {
    if (y > JB) return false;
    const R = RR + d, ax = Math.abs(x - CX);
    if (y >= YS + R * Math.sin(PH0)) return ax < -(RC + R * Math.cos(PH0));
    return Math.hypot(ax + RC, y - YS) < R; // mirrored: the right half's arc is centred at CX-RC
};
function bandCells(mo, d0, d1, len, pal, tile = {}) {
    for (const side of [-1, 1]) {
        const N = Math.round(LT / len), us = [0];
        for (let i = 1; i < N; i++) us.push((i + (mo.r() - 0.5) * 0.4) / N);
        us.push(1);
        for (let i = 0; i < N; i++) mo.tile([archPt(us[i], d0, side), archPt(us[i + 1], d0, side), archPt(us[i + 1], d1, side), archPt(us[i], d1, side)], typeof pal === 'function' ? pal(i) : pal, tile);
    }
}

const PX0 = 84, PX1 = 276, PY0 = 126; // the portal block
const WTOP = 146; // top of the side walls
const MOON = [232, 90], MR = 25, MCUT = [240.6, 84.4], MCR = 20.5;

/* ================= SKY ================= */
{
    const box = [0, 0, 360, 200], mo = new Mo(11, box, { hiOp: 0.16, bed: '#0A1230' });
    const NIGHT = glaze('#0F1D4A', 0.16), MID = glaze('#182F6C', 0.14), LOW = glaze('#25468A', 0.13), VIO = glaze('#35358A', 0.12), TEALN = glaze('#1D5584', 0.12);
    const pal = (x, y) => {
        const dm = Math.hypot(x - MOON[0], y - MOON[1]);
        const v = (y / 190) * 1.05 + (dm < 46 ? 0.34 : dm < 70 ? 0.14 : 0) + (mo.r() - 0.5) * 0.42;
        if (v < 0.36) return NIGHT;
        if (v < 0.7) return mo.r() < 0.06 ? VIO : MID;
        return mo.r() < 0.14 ? TEALN : mo.r() < 0.07 ? VIO : LOW;
    };
    rings(mo, MOON, MR + 1.2, 330, 8.4, 11.5, pal, { keep: (x, y) => x > -8 && x < 368 && y > -8 && y < 204, tile: { gap: 0.5, jit: 0.4, hl: 0.3, miss: 0.004 } });
    // The moon: earthshine tiles, then the crescent in cream.
    const disc = new Mo(12, box, { hiOp: 0.14 });
    // the dark of the moon: plain arcs of tesserae, struck from a point that lies under the crescent (no centre shows)
    rings(disc, [MOON[0] - 11.5, MOON[1] + 7.6], 3, MR * 2 + 6, 4.8, 6.4, glaze('#172C68', 0.1), { keep: (x, y) => Math.hypot(x - MOON[0], y - MOON[1]) < MR + 2 && Math.hypot(x - MCUT[0], y - MCUT[1]) < MCR + 3, tile: { gap: 0.4, hl: 0.2, miss: 0 } });
    const cres = new Mo(13, box, { hiOp: 0.6 });
    const CREAM = [...glaze('#F4ECD2', 0.08), '#F1DFA8', '#E9E2CC'];
    rings(cres, [MOON[0] - 3, MOON[1] + 2], 0, MR + 6, 3.9, 5.2, CREAM, { keep: (x, y) => Math.hypot(x - MOON[0], y - MOON[1]) < MR + 1.5 && Math.hypot(x - MCUT[0], y - MCUT[1]) > MCR - 1.5, tile: { gap: 0.3, jit: 0.22, hl: 0.55, miss: 0, craze: 0.1 } });
    const circ = (c, r) => `M${q(c[0] - r)} ${q(c[1])}a${q(r)} ${q(r)} 0 1 0 ${q(2 * r)} 0a${q(r)} ${q(r)} 0 1 0 ${q(-2 * r)} 0z`;
    // the crescent's outline: the long way round the disc, then back along the cut
    const dd = Math.hypot(MCUT[0] - MOON[0], MCUT[1] - MOON[1]), al = Math.atan2(MCUT[1] - MOON[1], MCUT[0] - MOON[0]), aa = (MR * MR - MCR * MCR + dd * dd) / (2 * dd);
    const p0 = Math.acos(aa / MR), p1 = Math.acos((aa - dd) / MCR), cp = [];
    for (let i = 0; i <= 40; i++) cp.push(P2(MOON, MR, al + p0 + ((TAU - 2 * p0) * i) / 40));
    for (let i = 1; i < 30; i++) cp.push(P2(MCUT, MCR, al + TAU - p1 - ((TAU - 2 * p1) * i) / 30));
    const cresD = dPoly(cp);
    const inner =
        `<defs><clipPath id="cr"><path d="${cresD}"/></clipPath><clipPath id="dk"><path d="${circ(MOON, MR)}"/></clipPath></defs>`
        + `<rect x="0" y="0" width="${360 * K}" height="${200 * K}" fill="#4A5887"/>` + mo.out()
        + `<g clip-path="url(#dk)"><path d="${circ(MOON, MR)}" fill="#4A5887"/>${disc.out()}</g>`
        + `<g clip-path="url(#cr)"><path d="${cresD}" fill="#B9B096"/>${cres.out()}</g>`
        + `<path d="${cresD}" fill="none" stroke="${BRASS_D}" stroke-width="5.4" stroke-linejoin="round"/><path d="${cresD}" fill="none" stroke="${BRASS}" stroke-width="2.6" stroke-linejoin="round"/>`;
    svg('sky', box, inner);
}

/* ================= STARS (four groups, let in one after another) ================= */
{
    // scattered; none inside the moon's circle, and nothing large in the mouth of the horns
    const spots = [
        [[186, 58, 3.4, 0], [334, 122, 2.4, 2], [70, 112, 2.4, 1], [322, 84, 2.4, 1]],
        [[166, 102, 2.6, 2], [24, 84, 2.6, 2], [118, 70, 3.0, 0], [346, 52, 2.2, 1]],
        [[206, 32, 2.4, 2], [300, 134, 2.0, 2], [150, 42, 2.4, 1], [140, 114, 2.2, 2], [56, 52, 2.8, 0]],
    ];
    const GOLD = ['#FFE7A0', '#F7D67C', '#FFF2C8'], WH = ['#FFFFFF', '#F3F0E2', '#E8F0F4'];
    spots.forEach((grp, gi) => {
        const box = [0, 0, 360, 170], mo = new Mo(40 + gi, box, { hiOp: 0.7 });
        for (const [x, y, r, kind] of grp) {
            const rot = mo.r() * PI;
            const pts = kind === 0 ? star([x, y], r * 1.25, r * 0.86, 8, rot) : kind === 1 ? ngon([x, y], r, 6, rot) : ngon([x, y], r * 0.95, 4, rot);
            mo.inlay(pts.map(p => [p[0] + (mo.r() - 0.5) * 0.5, p[1] + (mo.r() - 0.5) * 0.5]), kind === 1 ? WH : GOLD, '#6A78A6', { grow: 0.6, jit: 0.1, hl: 0.9, craze: 0 });
        }
        svg(`stars-${'abc'[gi]}`, box, mo.out());
    });
}

/* ================= THE COURTYARD ================= */
const CB = [94, 150, 172, 240];
const HZ = 272, FF = 112; // horizon and the floor's projection: y = HZ + FF / z, x = CX + X * FF / z
const proj = (X, z) => [CX + (X * FF) / z, HZ + FF / z];
const FAR_BASE = 298, FAR_TOP = 230;
const ARCHES = [[146, 22], [180, 26], [214, 22]];
const inFarArch = (x, y) => { for (const [ax, w] of ARCHES) { const hw = w / 2, sp = 270 - (w - 22); if (Math.abs(x - ax) < hw && y > sp) return true; if (y <= sp && Math.hypot(Math.abs(x - ax) + hw * 0.45, y - sp) < hw * 1.45) return true; } return false; };
{
    const mo = new Mo(21, CB, { hiOp: 0.22, bed: '#0A1230' });
    // far sky
    const N1 = glaze('#101E50', 0.14), N2 = glaze('#1B2C6C', 0.12), N3 = glaze('#34317A', 0.12), N4 = glaze('#4A3A7C', 0.1);
    courses(mo, 94, 150, 266, FAR_TOP + 2, 5, (x, y) => { const v = (y - 150) / 80 + (mo.r() - 0.5) * 0.5; return v < 0.45 ? N1 : v < 0.78 ? N2 : v < 1.0 ? N3 : N4; }, { tile: { gap: 0.4, hl: 0.25 } });
    // cypresses behind the far wall
    const cyp = new Mo(22, CB, { hiOp: 0.18 });
    let cypBed = '';
    for (const [x, top, w] of [[158, 192, 6.5], [205, 184, 7.5], [118, 204, 6], [246, 200, 6]]) {
        const sil = []; for (let i = 0; i <= 8; i++) { const t = i / 8; sil.push([x - w * Math.sin(Math.pow(t, 0.7) * PI * 0.5) * (1 - 0.15 * t), top + (FAR_TOP + 4 - top) * t]); }
        const silR = sil.map(p => [2 * x - p[0] + 0.6, p[1]]).reverse();
        cypBed += fill('#0B2018', [...sil, ...silR]);
        const hw = y => w * Math.sin(Math.pow((y - top) / (FAR_TOP + 4 - top), 0.7) * PI * 0.5);
        courses(cyp, x - w, top, x + w, FAR_TOP + 4, 3.6, (cx, cy) => (cx > x ? LEAF_D : glaze('#2A6A44', 0.12)), { keep: (cx, cy) => Math.abs(cx - x) < hw(cy) - 0.8, tile: { gap: 0.3, hl: 0.2 }, lmin: 0.7, lmax: 1.2 });
    }
    // far wall with its lit arcade
    const wall = new Mo(23, CB, { hiOp: 0.3 });
    const AMB_HI = ['#FFD777', '#FFC85A', '#FFE08E', '#F9B94A'], AMB_LO = ['#F29A32', '#E8862A', '#F4A940', '#D97524'];
    courses(wall, 94, FAR_TOP, 266, FAR_BASE, 4.3, (x, y) => {
        if (inFarArch(x, y)) return y > 284 ? AMB_HI : y > 268 ? (wall.r() < 0.5 ? AMB_HI : AMB_LO) : AMB_LO;
        if (y < FAR_TOP + 4.5) return W_TURQ;
        if (y > 243 && y < 248) return wall.r() < 0.5 ? glaze('#256FA8', 0.12) : W_TURQ;
        return wall.r() < 0.07 ? W_TURQ : W_WHITE;
    }, { tile: { gap: 0.36, hl: 0.35 } });
    let merl = '';
    for (let x = 96; x < 266; x += 9.4) { const m = [[x, FAR_TOP], [x, FAR_TOP - 3], [x + 1.6, FAR_TOP - 3], [x + 1.6, FAR_TOP - 5.6], [x + 4.6, FAR_TOP - 5.6], [x + 4.6, FAR_TOP - 3], [x + 6.2, FAR_TOP - 3], [x + 6.2, FAR_TOP]]; merl += fill(W_GROUT, m); wall.tile(rect(x, FAR_TOP - 3, x + 6.2, FAR_TOP), W_WHITE, { gap: 0.3 }); wall.tile(rect(x + 1.6, FAR_TOP - 5.6, x + 4.6, FAR_TOP - 3), W_TURQ, { gap: 0.3 }); }
    let archLines = '';
    for (const [ax, w] of ARCHES) { const hw = w / 2, sp = 270 - (w - 22), pts = [[ax - hw, FAR_BASE]]; for (let i = 0; i <= 8; i++) { const a = PI - (i / 8) * Math.acos((hw * 0.45) / (hw * 1.45)); pts.push([ax + hw * 0.45 + hw * 1.45 * Math.cos(a), sp - hw * 1.45 * Math.sin(a)]); } const r = pts.slice(1).map(p => [2 * ax - p[0], p[1]]).reverse(); archLines += inlayLine([...pts, ...r.slice(1), [ax + hw, FAR_BASE]], 0.6); }
    // tiny stars in the far sky
    const st = new Mo(25, CB, { hiOp: 0.6 });
    for (const [x, y, r] of [[150, 178, 1.3], [196, 170, 1.1], [172, 190, 1], [214, 196, 1.2], [134, 204, 1], [230, 214, 0.9], [186, 208, 0.9]]) st.inlay(ngon([x, y], r, 4, st.r()), ['#FFF6D8', '#FFFFFF'], '#56628E', { grow: 0.4, jit: 0.1, hl: 0 });
    svg('court-far', CB, `<rect x="${94 * K}" y="${150 * K}" width="${172 * K}" height="${82 * K}" fill="#46527E"/>` + mo.out() + cypBed + cyp.out() + st.out()
        + `<rect x="${94 * K}" y="${FAR_TOP * K}" width="${172 * K}" height="${(FAR_BASE - FAR_TOP) * K}" fill="${W_GROUT}"/>` + merl + wall.out() + archLines);
}
/* fountain and orange trees */
{
    const mo = new Mo(31, CB, { hiOp: 0.4 }), fruit = new Mo(32, CB, { hiOp: 0.8 }), wt = new Mo(33, CB, { hiOp: 0.5 });
    let beds = '';
    const G = '#8F7A55';
    // floor in perspective
    const fl = new Mo(24, CB, { hiOp: 0.34 });
    const F_T = glaze('#35AFA6', 0.12), F_W = glaze('#F3E2BC', 0.07), F_Td = glaze('#1F7A82', 0.12), F_Wd = glaze('#C9B994', 0.08), F_A = glaze('#F6C777', 0.08), F_N = glaze('#1E4C8C', 0.12);
    const dz = 0.15; const zs = []; for (let z = 0.98; z < 4.4; z += dz) zs.push(z); zs.push(4.42);
    for (let j = 0; j < zs.length - 1; j++) for (let i = -32; i < 32; i++) {
        const X0 = i * dz, X1 = (i + 1) * dz, z0 = zs[j], z1 = zs[j + 1];
        const cell = [proj(X0, z0), proj(X1, z0), proj(X1, z1), proj(X0, z1)], c = cen(cell);
        if (c[0] < 92 || c[0] > 268) continue;
        const lit = Math.abs((X0 + X1) / 2) < 0.2 + z0 * 0.42, even = (((i + j) % 2) + 2) % 2 === 0;
        fl.tile(cell, even ? (lit ? F_T : F_Td) : lit ? (fl.r() < 0.3 ? F_A : F_W) : F_Wd, { gap: Math.max(0.12, 0.34 - j * 0.011), jit: Math.max(0.08, 0.3 - j * 0.011), hl: 0.4 });
    }

    // orange trees
    for (const [x, cy, R, seed] of [[128, 286, 17, 1], [233, 284, 18.5, 2]]) {
        const potT = cy + 42, potB = cy + 56;
        beds += fill('#3A2414', rect(x - 2.2, cy + R - 4, x + 2.2, potT + 1));
        courses(mo, x - 1.7, cy + R - 4, x + 1.7, potT, 3.4, glaze('#6B4526', 0.14), { vert: true, lmin: 1, lmax: 1.8, tile: { gap: 0.2 } });
        const phw = y => 8.6 - ((y - potT) / (potB - potT)) * 2.6;
        beds += fill(G, inset(profileBed(x, potT, potB, phw, 2), -0.5));
        profile(mo, x, [potT, potT + 3.4, potT + 7, potT + 10.6, potB], phw, 4, (rw, i) => (rw === 0 ? W_WHITE : rw === 2 ? (i % 2 ? W_WHITE : glaze('#2A72A8', 0.12)) : W_TURQ), { gap: 0.28, hl: 0.5 });
        // the crown: not a ball, three or four uneven lobes
        const ph = seed * 1.9, crown = a => R * (1 + 0.1 * Math.sin(3 * a + ph) + 0.07 * Math.sin(5 * a + ph * 2.3) - 0.06 * Math.sin(a));
        const inCrown = (px, py, m) => Math.hypot(px - x, py - cy) < crown(Math.atan2(py - cy, px - x)) + m;
        beds += fill('#0F2C1E', Array.from({ length: 40 }, (_, i) => P2([x, cy], crown((i * TAU) / 40) + 0.9, (i * TAU) / 40)));
        const lit = glaze('#4E9A52', 0.12), mid = glaze('#2F7A48', 0.14), dk = glaze('#1C5236', 0.14);
        rings(mo, [x + (seed === 1 ? 2 : -2), cy - 1], 0, R + 6, 4.2, 5.2, (px, py) => { const v = ((px - x) * (seed === 1 ? 1 : -1)) / R + (cy - py) / R * 0.3 + (mo.r() - 0.5) * 0.7; return v > 0.25 ? lit : v > -0.35 ? mid : dk; }, { keep: (px, py) => inCrown(px, py, -0.6), tile: { gap: 0.3, jit: 0.4, hl: 0.3 } });
        const fr = rng(300 + seed);
        for (let i = 0; i < 9; i++) { const a = fr() * TAU, d = Math.sqrt(fr()) * (R - 4.5), p = P2([x, cy], d, a); fruit.inlay(ngon(p, 2.0 + fr() * 0.5, 7, fr()), ['#FF9B2E', '#FFB13F', '#F5861F'], '#123222', { grow: 0.45, jit: 0.12, hl: 1 }); }
    }
    // fountain: basin, stem, bowl, water
    const FX = 180, BT = 327, BB = 343, BW = 34;
    const basin = [[FX - BW, BT], [FX + BW, BT], [FX + BW - 3, BB], [FX - BW + 3, BB]];
    beds += fill(G, inset(basin, -0.6));
    const n = 16;
    for (let i = 0; i < n; i++) { // a zigzag of triangles round the basin wall
        const sh = t => FX + (t - FX) * 0.93, x0 = FX - BW + 1 + (i * (BW * 2 - 2)) / n, x1 = FX - BW + 1 + ((i + 1) * (BW * 2 - 2)) / n, xm = (x0 + x1) / 2;
        mo.tile([[x0, BT + 3.4], [x1, BT + 3.4], [sh(xm), BB - 0.6]], i % 2 ? W_TURQ : glaze('#256FA8', 0.12), { gap: 0.25 });
        if (i < n - 1) mo.tile([[sh(xm), BB - 0.6], [x1, BT + 3.4], [sh(xm + (BW * 2 - 2) / n), BB - 0.6]], W_WHITE, { gap: 0.25 });
    }
    courses(mo, FX - BW - 1.5, BT - 0.8, FX + BW + 1.5, BT + 3, 3.6, W_WHITE, { lmin: 1.2, lmax: 2.2, tile: { gap: 0.25, hl: 0.8 } });
    // water in the basin (seen a little from above)
    beds += fill('#2C6F86', [[FX - BW + 2, BT - 0.8], [FX - BW + 7, BT - 5.4], [FX + BW - 7, BT - 5.4], [FX + BW - 2, BT - 0.8]]);
    courses(mo, FX - BW + 3, BT - 5.2, FX + BW - 3, BT - 1, 2.1, () => (mo.r() < 0.3 ? ['#E9FBF4', '#CDEFE6'] : mo.r() < 0.5 ? glaze('#7FD6CC', 0.1) : glaze('#3FA7B4', 0.12)), { keep: (x, y) => Math.abs(x - FX) < BW - 3 - (BT - 1 - y) * 1.05, lmin: 1.2, lmax: 2.6, tile: { gap: 0.22, hl: 0.5 } });
    // stem and bowl
    beds += fill(G, rect(FX - 3, 303, FX + 3, BT - 4));
    courses(mo, FX - 2.6, 304, FX + 2.6, BT - 4.4, 2.6, BRASS_T, { vert: true, lmin: 1, lmax: 1.8, tile: { gap: 0.2, hl: 0.7 } });
    const bowl = [[FX - 14, 298], [FX + 14, 298], [FX + 8, 304.5], [FX - 8, 304.5]];
    beds += fill(G, inset(bowl, -0.5));
    courses(mo, FX - 14, 298, FX + 14, 304.5, 3.2, (x, y) => (y < 301 ? W_WHITE : W_TURQ), { keep: (x, y) => Math.abs(x - FX) < 14 - (y - 298) * 0.92, tile: { gap: 0.25, hl: 0.6 } });
    // jets: small pale tiles along the water's paths
    const WATER = ['#FFFFFF', '#E6FAF4', '#C9F0E8', '#A9E4E0'];
    const drop = (p, a, len, w) => { const d = [Math.cos(a), Math.sin(a)], nn = [-d[1], d[0]]; wt.inlay([[p[0] - d[0] * len - nn[0] * w, p[1] - d[1] * len - nn[1] * w], [p[0] + d[0] * len - nn[0] * w, p[1] + d[1] * len - nn[1] * w], [p[0] + d[0] * len + nn[0] * w, p[1] + d[1] * len + nn[1] * w], [p[0] - d[0] * len + nn[0] * w, p[1] - d[1] * len + nn[1] * w]], WATER, '#2B5F7C', { grow: 0.3, jit: 0.15, hl: 0.3 }); };
    for (let y = 296.6; y > 279; y -= 2.7) drop([FX, y], PI / 2, 1.22, 1.0);
    for (const sg of [-1, 1]) for (const [vx, top] of [[10, 15], [19, 24]]) {
        let prev = null;
        for (let i = 0; i <= 12; i++) { const t = i / 12, x = FX + sg * vx * t * 1.3, y = 281 - top * 4 * t * (1 - t) * 0.5 + (BT - 4 - 281) * t * t; if (prev && y < BT - 2.5) drop([(x + prev[0]) / 2, (y + prev[1]) / 2], Math.atan2(y - prev[1], x - prev[0]), Math.hypot(x - prev[0], y - prev[1]) * 0.46, 0.85); prev = [x, y]; }
    }
    svg('court-mid', CB, `<rect x="${94 * K}" y="${FAR_BASE * K}" width="${172 * K}" height="${(390 - FAR_BASE) * K}" fill="#A8946C"/>` + fl.out() + beds + mo.out() + fruit.out() + wt.out());
}
/* strings of lamps, and their light */
{
    const mo = new Mo(35, CB, { hiOp: 0.75 });
    const COL = { amber: ['#FFB23E', '#FFC65C', '#FFA22E'], gold: ['#FFE08A', '#FFD466', '#FFECAE'], ruby: ['#F0563C', '#E2452F', '#FA6E50'], aqua: ['#5FE0D0', '#43CDBE', '#86EBDD'], cream: ['#FFF4D2', '#FFEDBB', '#FFFAE8'] };
    const order = ['amber', 'ruby', 'gold', 'aqua', 'cream', 'amber', 'gold', 'ruby', 'aqua'];
    const strings = [
        { a: [96, 232], b: [264, 226], sag: 9, n: 9, s: 3.7, o: 3 },
        { a: [96, 214], b: [264, 236], sag: 14, n: 7, s: 5.2, o: 1 },
        { a: [98, 200], b: [262, 186], sag: 27, n: 5, s: 7.6, o: 0 },
    ];
    let wires = '', glows = '';
    const pos = (S, t) => [S.a[0] + (S.b[0] - S.a[0]) * t, S.a[1] + (S.b[1] - S.a[1]) * t + S.sag * 4 * t * (1 - t)];
    strings.forEach((S, si) => {
        const pts = []; for (let i = 0; i <= 24; i++) pts.push(pos(S, i / 24));
        wires += line(pts, '#1A1430', 0.9) + line(pts, '#B58C3A', 0.4);
        for (let i = 0; i < S.n; i++) {
            const t = (i + 0.5 + (mo.r() - 0.5) * 0.3) / S.n, [x, y0] = pos(S, t), s = S.s * (0.9 + mo.r() * 0.2), y = y0 + 0.4, name = order[(i + S.o) % order.length], pal = COL[name];
            const sw = (mo.r() - 0.5) * 0.14 * s, X = v => x + sw * ((v - y) / s);
            mo.inlay([[X(y) - 0.28 * s, y], [X(y) + 0.28 * s, y], [X(y + 0.34 * s) + 0.42 * s, y + 0.34 * s], [X(y + 0.34 * s) - 0.42 * s, y + 0.34 * s]], BRASS_T, '#1A1430', { grow: 0.3, jit: 0.08, hl: 0.4 });
            const yt = y + 0.42 * s, ym = y + 0.72 * s, yb = y + 1.42 * s, yv = y + 1.7 * s, hw = 0.56 * s;
            const body = [[X(yt) - hw * 0.62, yt], [X(yt) + hw * 0.62, yt], [X(ym) + hw, ym], [X(yb) + hw * 0.72, yb], [X(yv), yv], [X(yb) - hw * 0.72, yb], [X(ym) - hw, ym]];
            mo.raw('#1A1430', inset(body, -0.34));
            if (s > 4) { // three facets
                const a = 0.36;
                mo.tile([body[0], [X(yt) - hw * 0.62 * a, yt], [X(ym) - hw * a, ym], [X(yb) - hw * 0.72 * a, yb], body[4], body[5], body[6]], [pal[1], pal[2]], { gap: 0.1, miss: 0, chip: 0, hl: 0.5 });
                mo.tile([[X(yt) - hw * 0.62 * a, yt], [X(yt) + hw * 0.62 * a, yt], [X(ym) + hw * a, ym], [X(yb) + hw * 0.72 * a, yb], body[4], [X(yb) - hw * 0.72 * a, yb], [X(ym) - hw * a, ym]], ['#FFF8DE', shade(pal[0], 0.5)], { gap: 0.1, miss: 0, chip: 0, hl: 0 });
                mo.tile([[X(yt) + hw * 0.62 * a, yt], body[1], body[2], body[3], body[4], [X(yb) + hw * 0.72 * a, yb], [X(ym) + hw * a, ym]], [pal[0], pal[1]], { gap: 0.1, miss: 0, chip: 0, hl: 0 });
            } else {
                mo.tile([body[0], [X(yt), yt], [X(yv), yv], body[5], body[6]], [pal[1], shade(pal[0], 0.4)], { gap: 0.08, miss: 0, chip: 0, hl: 0.4 });
                mo.tile([[X(yt), yt], body[1], body[2], body[3], [X(yv), yv]], [pal[0], pal[2]], { gap: 0.08, miss: 0, chip: 0, hl: 0 });
            }
            const g = name === 'ruby' ? 'gr' : name === 'aqua' ? 'gq' : 'ga';
            glows += `<circle cx="${f1(x)}" cy="${f1(y + s)}" r="${f1(s * 2.7)}" fill="url(#${g})"/>`;
        }
    });
    svg('court-lamps', CB, wires + mo.out());
    const grad = (id, c0, c1) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c0}" stop-opacity=".85"/><stop offset=".35" stop-color="${c1}" stop-opacity=".4"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient>`;
    svg('court-glow', CB, '',
        `<defs>${grad('ga', '#FFE2A0', '#FF9C2E')}${grad('gr', '#FFC09A', '#F0502E')}${grad('gq', '#D8FFF4', '#3CCDB8')}`
        + `<radialGradient id="hz"><stop offset="0" stop-color="#FFB95A" stop-opacity=".5"/><stop offset=".6" stop-color="#F08A30" stop-opacity=".18"/><stop offset="1" stop-color="#F08A30" stop-opacity="0"/></radialGradient>`
        + `<filter id="bl" filterUnits="userSpaceOnUse" x="80" y="140" width="200" height="260"><feGaussianBlur stdDeviation="1.6"/></filter></defs>`
        + `<ellipse cx="180" cy="282" rx="92" ry="62" fill="url(#hz)"/><ellipse cx="180" cy="336" rx="70" ry="30" fill="url(#hz)"/><g filter="url(#bl)">${glows}</g>`);
}

/* ================= DOORS ================= */
const ESC = [180, 296];
for (const side of [-1, 1]) {
    const x0 = side < 0 ? 104 : 180, x1 = x0 + 76, box = [x0, 150, 76, 236];
    const mo = new Mo(side < 0 ? 51 : 52, box, { hiOp: 0.2, bed: '#3A2414' });
    // planks: six courses of long tiles
    courses(mo, x0, 150, x1, 386, 12.7, WOOD, { vert: true, lmin: 1.4, lmax: 3.3, wob: 0.03, tile: { gap: 0.34, jit: 0.22, hl: 0.35, craze: 0.16, miss: 0.004 } });
    const top = new Mo(side < 0 ? 53 : 54, box, { hiOp: 0.62 }), st = new Mo(side < 0 ? 63 : 64, box, { hiOp: 0.7 });
    const hinge = side < 0 ? 108 : 252, free = side < 0 ? 176.4 : 183.6, dir = side < 0 ? 1 : -1;
    // strap hinges: brass bands ending in a spear point
    for (const y of [206, 251, 341, 372]) {
        const len = y === 372 ? 62 : 56, e = hinge + dir * len, pts = [[hinge, y - 3.6], [e, y - 3.6], [e + dir * 5.5, y], [e, y + 3.6], [hinge, y + 3.6]];
        top.raw(BRASS_D, inset(pts, -0.7));
        const nseg = 6;
        for (let i = 0; i < nseg; i++) { const a = hinge + (dir * len * i) / nseg, b = hinge + (dir * len * (i + 1)) / nseg; top.tile(rect(Math.min(a, b), y - 3.6, Math.max(a, b), y + 3.6), BRASS_T, { gap: 0.3, miss: 0, hl: 0.8 }); }
        top.tile([[e, y - 3.6], [e + dir * 5.5, y], [e, y + 3.6]], BRASS_T, { gap: 0.3, miss: 0 });
        for (let i = 0; i < 4; i++) st.inlay(ngon([hinge + dir * (7 + i * 14), y], 1.9, 6, top.r()), BRONZE, BRASS_D, { grow: 0.35, jit: 0.08, hl: 0.9 });
    }
    // studs: a few large ones, in rows between the straps
    for (const y of [182, 228.5, 273, 319, 356.5]) for (const off of [10, 28, 46, 64]) {
        const x = side < 0 ? x0 + off : x1 - off;
        if (Math.hypot(x - ESC[0], y - ESC[1]) < 33) continue;
        const p = [x + (top.r() - 0.5) * 0.8, y + (top.r() - 0.5) * 0.8];
        st.raw('#2A1A0C', ngon([p[0] + 0.5, p[1] + 1], 3.9, 8, 0.39));
        st.inlay(ngon(p, 3.4, 8, 0.39 + (top.r() - 0.5) * 0.3), BRASS_T, BRASS_D, { grow: 0.3, jit: 0.1, hl: 1 });
    }
    // the meeting stile
    const sx0 = side < 0 ? 176.6 : 180, sx1 = side < 0 ? 180 : 183.4;
    top.raw(BRASS_D, rect(sx0 - (side < 0 ? 0.6 : 0), 150, sx1 + (side < 0 ? 0 : 0.6), 386));
    courses(top, sx0, 150, sx1, 386, 3.4, BRASS_T, { vert: true, lmin: 2.4, lmax: 5, wob: 0, tile: { gap: 0.25, hl: 0.7, miss: 0 } });
    // half of the star plate (the other half is on the other leaf; the viewBox cuts it at the meeting line)
    const plate = new Mo(55 + side, box, { hiOp: 0.7 });
    plate.raw('#2A1A0C', star([ESC[0] + 0.6, ESC[1] + 1.3], 28.6, 21.6, 8, PI / 8));
    plate.raw(BRASS_D, star(ESC, 27.8, 20.9, 8, PI / 8));
    // rim: sixteen pieces between the star's outline and an inner star; then eight kites round a boss
    const So = star(ESC, 27, 20.2, 8, PI / 8), Si = star(ESC, 18.4, 14.6, 8, PI / 8), PT = { gap: 0.3, jit: 0.12, miss: 0, hl: 0.75, chip: 0 };
    for (let i = 0; i < 16; i++) plate.tile([So[i], So[(i + 1) % 16], Si[(i + 1) % 16], Si[i]], i % 2 ? BRASS_T : glaze('#DDB455', 0.1), PT);
    for (let i = 0; i < 8; i++) plate.tile([Si[2 * i], Si[2 * i + 1], Si[(2 * i + 2) % 16], P2(ESC, 5, PI / 8 + ((i + 0.5) * PI) / 4)], i % 2 ? BRONZE : glaze('#A67A2E', 0.12), PT);
    plate.tile(ngon(ESC, 4.6, 8, PI / 8), BRASS_T, PT);
    // the keeper on the right leaf, the pivot plate on the left
    const kp = new Mo(58 + side, box, { hiOp: 0.7 });
    if (side > 0) for (const x of [203.5, 211]) { kp.raw(BRASS_D, rect(x - 1.9, 288.2, x + 1.9, 303.8)); kp.tile(rect(x - 1.4, 288.7, x + 1.4, 292), BRASS_T, { gap: 0.1, miss: 0, hl: 1 }); kp.tile(rect(x - 1.4, 300, x + 1.4, 303.3), BRASS_T, { gap: 0.1, miss: 0, hl: 1 }); }
    svg(side < 0 ? 'door-l' : 'door-r', box, `<rect x="${x0 * K}" y="${150 * K}" width="${76 * K}" height="${236 * K}" fill="${WOOD_G}"/>` + mo.out() + top.out() + st.out() + plate.out() + kp.out());
}

// a leaf turned away from the light is darker: one flat shade over each, brought up as it swings
for (const side of [-1, 1]) { const x0 = side < 0 ? 104 : 180; svg(side < 0 ? 'door-shade-l' : 'door-shade-r', [x0, 150, 76, 236], '', `<rect x="${x0}" y="150" width="76" height="236" fill="#2A1C2E"/>`); }

/* ================= THE LATCH ================= */
{
    const box = [138, 266, 84, 60], mo = new Mo(61, box, { hiOp: 0.75 });
    const PV = [154, 296];
    // the bolt
    const bar = [[PV[0] - 4, 292.2], [213.5, 292.2], [216, 296], [213.5, 299.8], [PV[0] - 4, 299.8]];
    mo.raw('#2A1A0C', bar.map(p => [p[0] + 0.5, p[1] + 1.2]));
    mo.raw(BRASS_D, inset(bar, -0.8));
    const cuts = [150, 162, 173.5, 186, 197, 207, 213.5];
    for (let i = 0; i < cuts.length - 1; i++) mo.tile(rect(cuts[i], 292.2, cuts[i + 1], 299.8), i % 2 ? BRASS_T : glaze('#E2BC5E', 0.1), { gap: 0.3, miss: 0, chip: 0, hl: 0.9 });
    mo.tile([[213.5, 292.2], [216, 296], [213.5, 299.8]], BRASS_T, { gap: 0.25, miss: 0, chip: 0 });
    // the pivot: one plain boss
    const boss = new Mo(66, box, { hiOp: 0.75 });
    boss.raw(BRASS_D, ngon(PV, 6.6, 8, PI / 8));
    boss.tile(ngon(PV, 6, 8, PI / 8), BRASS_T, { gap: 0.1, miss: 0, chip: 0, hl: 1, jit: 0.1 });
    svg('latch', box, mo.out() + boss.out());
}

const LX = 51, LT0 = 219, LB0 = 262; // the lantern's body, top and bottom
const LS = 1.3, HOOKY = 206; // drawn at its first size, then enlarged about the hook
const LC = [LX, HOOKY + (241 - HOOKY) * LS];

/* ================= SIDE WALLS ================= */
const WB = [-6, 120, 372, 336];
{
    const a = 10.5, p = 2 * a, Ro = a / Math.cos(PI / 8), ri = a * 0.5;
    const DADO = 344;
    /** The star-and-kite field in the glazes G (the same cut whatever the glazes: the seed is the same). */
    function field(G, strips) {
        const mo = new Mo(71, WB, { hiOp: G.hi });
        for (const [sx0, sx1] of strips) {
            const i0 = Math.floor((sx0 - 37) / p) - 1, i1 = Math.ceil((sx1 - 37) / p) + 1;
            for (let i = i0; i <= i1; i++) for (let j = 0; j <= 10; j++) {
                const c = [37 + i * p, 150 + j * p];
                if (c[0] < sx0 - a || c[0] > sx1 + a) continue;
                const odd = (((i + j) % 2) + 2) % 2;
                const T = k => P2(c, a, (k * PI) / 4), V = k => P2(c, Ro, PI / 8 + (k * PI) / 4), I = k => P2(c, ri, PI / 8 + (k * PI) / 4);
                const s = []; for (let k = 0; k < 8; k++) s.push(T(k), I(k));
                mo.tile(s, G.white, { gap: 0.38, jit: 0.3, hl: 0.7, craze: 0.12 });
                for (let k = 0; k < 8; k++) mo.tile([T(k), V(k), T(k + 1), I(k)], odd ? (k % 2 ? G.turq : G.turqL) : k % 2 ? G.turq : G.navy, { gap: 0.38 });
                const d = [c[0] + a, c[1] + a], hd = a * 0.586;
                mo.tile([[d[0] - hd, d[1]], [d[0], d[1] - hd], [d[0] + hd, d[1]], [d[0], d[1] + hd]], mo.r() < 0.22 ? G.ochre : G.deep, { gap: 0.38 });
            }
        }
        return mo.out();
    }
    const fieldDusk = field({ hi: 0.34, white: WHITE, turq: TURQ, turqL: TURQ_L, navy: NAVY, ochre: OCHRE, deep: DEEP }, [[-6, 90], [270, 366]]);
    // the lantern's lattice, thrown on the wall: openings that widen with distance
    let lattice = '';
    [[27, 8, 3.6], [40, 12, 4.8], [55, 14, 6.2], [72, 16, 7.8], [92, 20, 9.6]].forEach(([R, n, sz], ri) => {
        for (let i = 0; i < n; i++) {
            const an = (i / n) * TAU + (ri % 2) * (PI / n), c = P2(LC, R, an);
            lattice += dPoly(ri % 2 ? star(c, sz * 0.95, sz * 0.7, 8, an) : [P2(c, sz * 1.5, an), P2(c, sz * 0.72, an + PI / 2), P2(c, sz * 1.5, an + PI), P2(c, sz * 0.72, an - PI / 2)]);
        }
    });
    svg('lantern-cast', WB, `<defs><clipPath id="lw"><rect x="${-6 * K}" y="${(WTOP + 10.5) * K}" width="${90 * K}" height="${(DADO - WTOP - 10.5) * K}"/></clipPath><clipPath id="lt"><path d="${lattice}"/></clipPath></defs>`
        + `<g clip-path="url(#lw)"><g clip-path="url(#lt)"><rect x="${-6 * K}" y="${WTOP * K}" width="${96 * K}" height="${(DADO - WTOP) * K}" fill="${L_GROUT}"/>`
        + field({ hi: 0.5, white: L_WHITE, turq: L_TURQ, turqL: L_TURQ_L, navy: L_NAVY, ochre: L_OCHRE, deep: glaze('#3A5FA6', 0.12) }, [[-6, 90]]) + `</g></g>`);
    // dado: hexagons in three glazes, under a band
    const dado = new Mo(72, WB, { hiOp: 0.34 });
    const hr = 5.6, hw = hr * Math.sqrt(3);
    for (let j = 0; j < 12; j++) for (let i = -2; i < 44; i++) {
        const c = [-8 + (i + (j % 2) / 2) * hw, DADO + 12 + j * 1.5 * hr];
        if (c[0] > 96 && c[0] < 264) continue;
        const k = (((i - Math.floor(j / 2) + 2 * (j % 2)) % 3) + 3) % 3;
        dado.tile(ngon(c, hr, 6, PI / 2), k === 0 ? NAVY : k === 1 ? TURQ : WHITE, { gap: 0.4 });
    }
    const band = new Mo(73, WB, { hiOp: 0.34 });
    for (const [bx0, bx1] of [[-6, PX0], [PX1, 366]]) {
        courses(band, bx0, DADO, bx1, DADO + 7.4, 3.7, (x, y) => (y < DADO + 3.7 ? DEEP : WHITE), { lmin: 1.1, lmax: 2, wob: 0.03, tile: { gap: 0.35 } });
        courses(band, bx0, WTOP, bx1, WTOP + 10.5, 3.5, DEEP, { lmin: 1.1, lmax: 2.4, wob: 0.03, tile: { gap: 0.35, hl: 0.3 } });
        courses(band, bx0, 422, bx1, 458, 7, SLATE, { lmin: 1.2, lmax: 2.4, tile: { gap: 0.45, hl: 0.3 } });
    }
    const sa = newStrap(), sr = rng(74);
    strap(sa, (s, o) => [-6 + s, WTOP + 5.25 + o], 90, 3, 10.4, sr);
    strap(sa, (s, o) => [PX1 + s, WTOP + 5.25 + o], 90, 3, 10.4, sr);
    // merlons: stepped, three courses
    const me = new Mo(75, WB, { hiOp: 0.34 });
    let merl = '';
    for (const [mx0, mx1] of [[-6, PX0 - 2], [PX1 + 2, 366]]) for (let x = mx0 + 1.5; x < mx1 - 14; x += 21.5) {
        const w = 17, t = 5.6;
        merl += fill(GROUT, [[x, WTOP + 1], [x, WTOP - t], [x + w / 6, WTOP - t], [x + w / 6, WTOP - 2 * t], [x + w / 3, WTOP - 2 * t], [x + w / 3, WTOP - 3 * t], [x + (2 * w) / 3, WTOP - 3 * t], [x + (2 * w) / 3, WTOP - 2 * t], [x + (5 * w) / 6, WTOP - 2 * t], [x + (5 * w) / 6, WTOP - t], [x + w, WTOP - t], [x + w, WTOP + 1]]);
        for (let k = 0; k < 6; k++) me.tile(rect(x + (k * w) / 6, WTOP - t, x + ((k + 1) * w) / 6, WTOP), k % 2 ? TURQ : WHITE, { gap: 0.3 });
        for (let k = 1; k < 5; k++) me.tile(rect(x + (k * w) / 6, WTOP - 2 * t, x + ((k + 1) * w) / 6, WTOP - t), k % 2 ? WHITE : TURQ, { gap: 0.3 });
        for (let k = 2; k < 4; k++) me.tile(rect(x + (k * w) / 6, WTOP - 3 * t, x + ((k + 1) * w) / 6, WTOP - 2 * t), k % 2 ? NAVY : WHITE, { gap: 0.3 });
    }
    // the lantern's bracket
    const br = new Mo(76, WB, { hiOp: 0.7 });
    const arm = [[24, 202.4], [56, 202.4], [56, 205.6], [24, 205.6]], plate = rect(20.5, 196, 25.5, 226), brace = [[25.5, 221], [44, 205.6], [47.4, 205.6], [25.5, 224.6]];
    let brBed = fill(GROUT, inset(arm, -0.6)) + fill(GROUT, inset(plate, -0.6)) + fill(GROUT, inset(brace, -0.6));
    courses(br, 25.5, 202.4, 56, 205.6, 3.2, BRASS_T, { lmin: 1.6, lmax: 2.8, wob: 0, tile: { gap: 0.2, miss: 0, hl: 0.8 } });
    courses(br, 20.5, 196, 25.5, 226, 5, BRASS_T, { vert: true, lmin: 1, lmax: 1.6, wob: 0, tile: { gap: 0.25, miss: 0, hl: 0.8 } });
    br.tile(brace, BRONZE, { gap: 0.25, miss: 0 });
    const clip = `<defs><clipPath id="wc"><rect x="${-6 * K}" y="${WTOP * K}" width="${96 * K}" height="${(DADO - WTOP) * K}"/><rect x="${270 * K}" y="${WTOP * K}" width="${96 * K}" height="${(DADO - WTOP) * K}"/></clipPath></defs>`;
    svg('wall', WB, clip
        + `<rect x="${-6 * K}" y="${WTOP * K}" width="${96 * K}" height="${(458 - WTOP) * K}" fill="${GROUT}"/><rect x="${270 * K}" y="${WTOP * K}" width="${96 * K}" height="${(458 - WTOP) * K}" fill="${GROUT}"/>`
        + `<g clip-path="url(#wc)">${fieldDusk}</g>`);
    svg('trim', WB, `<rect x="${-6 * K}" y="${DADO * K}" width="${96 * K}" height="${(458 - DADO) * K}" fill="${GROUT}"/><rect x="${270 * K}" y="${DADO * K}" width="${96 * K}" height="${(458 - DADO) * K}" fill="${GROUT}"/>`
        + `<rect x="${-6 * K}" y="${WTOP * K}" width="${96 * K}" height="${10.5 * K}" fill="${GROUT}"/><rect x="${270 * K}" y="${WTOP * K}" width="${96 * K}" height="${10.5 * K}" fill="${GROUT}"/>`
        + dado.out() + band.out() + strapOut(sa) + merl + me.out() + brBed + br.out());
}

/* ================= THE PORTAL ================= */
{
    const box = [80, 118, 200, 268], mo = new Mo(81, box, { hiOp: 0.4 });
    const ROS = [[113, 160, 18], [247, 160, 18]];
    const P_WHITE = [...glaze('#CED6DC', 0.07), ...glaze('#C0CAD4', 0.06)];
    // spandrels: a pale field of small tiles
    courses(mo, PX0 + 8, PY0 + 8, PX1 - 8, JB, 4.3, (x, y) => (mo.r() < 0.045 ? TURQ_L : mo.r() < 0.02 ? OCHRE : P_WHITE), {
        keep: (x, y) => !inArch(x, y, 9.5) && !ROS.some(([rx, ry, rr]) => Math.hypot(x - rx, y - ry) < rr - 1.5), lmin: 0.8, lmax: 1.7, tile: { gap: 0.36, hl: 0.55, craze: 0.08, miss: 0.012 },
    });
    // the frame: a navy band with strapwork, up one side, across, down the other
    const fr = new Mo(82, box, { hiOp: 0.3 });
    courses(fr, PX0, PY0, PX0 + 8, JB, 4, DEEP, { vert: true, lmin: 1.2, lmax: 2.6, wob: 0.03, tile: { gap: 0.35, hl: 0.3 } });
    courses(fr, PX1 - 8, PY0, PX1, JB, 4, DEEP, { vert: true, lmin: 1.2, lmax: 2.6, wob: 0.03, tile: { gap: 0.35, hl: 0.3 } });
    courses(fr, PX0 + 8, PY0, PX1 - 8, PY0 + 8, 4, DEEP, { lmin: 1.2, lmax: 2.6, wob: 0.03, tile: { gap: 0.35, hl: 0.3 } });
    // a cap course above the frame
    courses(fr, PX0 - 2, PY0 - 5, PX1 + 2, PY0, 5, (x, y) => (Math.floor(x / 6.5) % 2 ? TURQ : WHITE), { lmin: 1.2, lmax: 1.4, wob: 0, tile: { gap: 0.35 } });
    const sa = newStrap(), sr = rng(83);
    strap(sa, (s, o) => [PX0 + 4 + o, JB - s], JB - PY0 - 8, 2.5, 10.2, sr);
    strap(sa, (s, o) => [PX1 - 4 - o, JB - s], JB - PY0 - 8, 2.5, 10.2, sr);
    strap(sa, (s, o) => [PX0 + 8 + s, PY0 + 4 + o], PX1 - PX0 - 16, 2.5, 10.2, sr);
    // corner pieces
    const cn = new Mo(84, box, { hiOp: 0.7 });
    for (const x of [PX0 + 4, PX1 - 4]) cn.inlay(star([x, PY0 + 4], 3.6, 2.5, 8, PI / 8), BRASS_T, BRASS_D, { grow: 0.5, hl: 1, jit: 0.1 });
    // the arch's band: reveal, navy band with strapwork, a white bead outside
    const ar = new Mo(85, box, { hiOp: 0.34 });
    bandCells(ar, -4, -0.2, 6.4, glaze('#0F2A52', 0.14), { gap: 0.3, hl: 0.25 });
    bandCells(ar, 0.2, 7, 7.2, DEEP, { gap: 0.34, hl: 0.3 });
    bandCells(ar, 7.2, 9.6, 4.6, i => (i % 5 === 2 ? TURQ : WHITE), { gap: 0.3, hl: 0.6 });
    strap(sa, (s, o) => archPt(s / LT, 3.6 + o, -1), LT, 2.2, 10.6, sr);
    strap(sa, (s, o) => archPt(s / LT, 3.6 - o, 1), LT, 2.2, 10.6, sr);
    // rosettes in the spandrels: ten-fold
    const ro = new Mo(86, box, { hiOp: 0.42 });
    let roBed = '', roLine = '';
    ROS.forEach(([x, y, R], i) => {
        roBed += fill(GROUT, ngon([x, y], R + 0.9, 20, PI / 20 - PI / 2 + 0.27 * (TAU / 10)));
        rosette(ro, [x, y], 10, R, { star: OCHRE, kite: [TURQ, TURQ_L], petal: [NAVY, DEEP], wedge: WHITE }, -PI / 2 + i * 0.05);
        roLine += inlayLine([...ngon([x, y], R + 1.2, 20, 0.1), P2([x, y], R + 1.2, 0.1)], 0.6);
    });
    // a small eight-fold boss over the apex
    const apex = archPt(1, 9.6)[1];
    const bo = new Mo(87, box, { hiOp: 0.5 });
    const BC = [CX, (PY0 + 8 + apex) / 2 + 0.6], BR = (apex - PY0 - 8) / 2 - 1.2;
    roBed += fill(GROUT, ngon(BC, BR + 0.8, 16));
    rosette(bo, BC, 8, BR, { star: WHITE, kite: [TURQ], petal: [NAVY], wedge: OCHRE }, PI / 8, { r1: 0.46, r0: 0.24, r2: 0.68 });
    const hole = archPoly(-4), outer = archPoly(9.6);
    const grout = `<path fill="${GROUT}" fill-rule="evenodd" d="${dPoly(rect(PX0 - 2, PY0 - 5, PX1 + 2, PY0))}${dPoly([[PX0, PY0], [PX1, PY0], [PX1, JB], [PX0, JB]])}${dPoly(hole)}"/>`;
    const archGrout = `<path fill="#8F9AA4" fill-rule="evenodd" d="${dPoly(outer)}${dPoly(hole)}"/>`;
    svg('portal', box, grout + mo.out() + fr.out() + cn.out() + archGrout + ar.out() + strapOut(sa, 1.15) + roBed + ro.out() + roLine + bo.out()
        + line(hole, '#0A1A36', 0.9));
}

/* ================= THE FOOT: threshold, steps, paving, pots ================= */
{
    const box = [-6, 330, 372, 202];
    const STEPS = [[76, 284, 384, 398, 403], [56, 304, 403, 419, 425], [34, 326, 425, 444, 451]];
    /** The threshold and the three steps, in the glazes G (the same cut whatever the glazes: the seed is the same). */
    function drawSteps(G) {
        const mo = new Mo(91, box, { hiOp: G.hi });
        let beds = fill(G.grout, rect(PX0, JB - 0.5, PX1, 384));
        courses(mo, PX0, JB, PX1, 384, 6, G.stone, { lmin: 1.6, lmax: 3, wob: 0, tile: { gap: 0.35, hl: 0.7 } });
        STEPS.forEach(([x0, x1, y0, y1, y2], si) => {
            beds += fill(G.grout, rect(x0, y0, x1, y2));
            const n = Math.round((x1 - x0) / (si === 1 ? 13 : 9)), w = (x1 - x0) / n, top = y0 + 0.2, bot = y1;
            for (let i = 0; i < n; i++) {
                const a = x0 + i * w, b = a + w, m = (a + b) / 2, ym = (top + bot) / 2;
                if (si === 1) { // diamonds on white
                    mo.tile([[m, top + 1], [b - 1.2, ym], [m, bot - 1], [a + 1.2, ym]], i % 3 === 1 ? G.ochre : G.navy, { gap: 0.3 });
                    mo.tile([[a, top], [m, top], [a, ym]], G.white, { gap: 0.3 }); mo.tile([[m, top], [b, top], [b, ym]], G.white, { gap: 0.3 });
                    mo.tile([[a, ym], [m, bot], [a, bot]], G.turq, { gap: 0.3 }); mo.tile([[b, ym], [b, bot], [m, bot]], G.turq, { gap: 0.3 });
                } else { // zigzag
                    const A = si === 0 ? G.turq : G.navy, B = si === 0 ? G.white : G.turqL;
                    mo.tile([[a, bot], [m, top], [b, bot]], A, { gap: 0.32 });
                    mo.tile([[a, top], [m, top], [a, bot]], B, { gap: 0.32 }); mo.tile([[m, top], [b, top], [b, bot]], B, { gap: 0.32 });
                }
            }
            courses(mo, x0 - 2, y1, x1 + 2, y2, y2 - y1, G.stone, { lmin: 1.8, lmax: 3.6, wob: 0, tile: { gap: 0.35, hl: 0.8 } });
        });
        // the forecourt: hexagons, down to the foot of the picture
        beds += fill(G.grout, rect(-6, 451, 366, 532));
        const hr = 8.2, hw = hr * Math.sqrt(3);
        for (let j = 0; j < 8; j++) for (let i = -1; i < 28; i++) {
            const c = [-8 + (i + (j % 2) / 2) * hw, 458 + j * 1.5 * hr], k = (((i - Math.floor(j / 2) + 2 * (j % 2)) % 3) + 3) % 3;
            mo.tile(ngon(c, hr, 6, PI / 2).map(v => [v[0], Math.max(451.2, v[1])]), k === 0 ? G.navy : k === 1 ? G.turq : G.stone, { gap: 0.45, hl: 0.5 });
        }
        return beds + mo.out();
    }
    const stepsDusk = drawSteps({ hi: 0.3, grout: GROUT, stone: STONE, turq: TURQ, turqL: TURQ_L, white: WHITE, navy: NAVY, ochre: OCHRE });
    // paving beside the steps
    const pv = new Mo(92, box, { hiOp: 0.2 });
    for (const [x0, x1] of [[-6, 34], [326, 366]]) courses(pv, x0, 425, x1, 451, 8.6, SLATE, { lmin: 1.2, lmax: 2.2, tile: { gap: 0.45, hl: 0.3 } });
    // pots and plants
    const pl = new Mo(93, box, { hiOp: 0.4 });
    let stems = '', beds = '';
    const pr = rng(94);
    for (const [x, base, kind] of [[58, 425, 0], [303, 425, 1]]) {
        const pt = base - 31;
        const hw = y => { const t = (y - pt) / 31; return t < 0.13 ? 13.4 : t < 0.2 ? 11.6 : 10.2 + 3.4 * Math.sin(PI * (t * 0.95 + 0.02)) - 3.4 * t; };
        beds += fill(GROUT, inset(profileBed(x, pt, base, hw, 16), -0.6));
        profile(pl, x, [pt, pt + 4, pt + 6.2, pt + 11, pt + 15.6, pt + 20.4, pt + 25.6, base], hw, rw => (rw === 1 ? 3 : rw === 3 ? 7 : 5),
            (rw, i) => (rw === 0 ? glaze('#C96B44', 0.1) : rw === 3 ? (i % 2 ? W_TURQ : WHITE) : rw === 1 ? glaze('#8E3F22', 0.12) : TERRA), { gap: 0.32, hl: 0.55, craze: 0.14 });
        // a few stems, each with large leaves of two tiles (one either side of the midrib), set in grout
        const nst = kind ? 4 : 3;
        for (let sI = 0; sI < nst; sI++) {
            const t = (sI + 0.5) / nst - 0.5, lean = t * (kind ? 44 : 38) + (pr() - 0.5) * 5, hgt = (kind ? 72 : 56) * (1 - Math.abs(t) * 0.6) * (0.92 + pr() * 0.16);
            const p0 = [x + t * 13, pt + 1], p1 = [x + t * 13 + lean * 0.2, pt - hgt * 0.6], p2 = [x + t * 13 + lean, pt - hgt];
            const at = u => [(1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * p1[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * p1[1] + u * u * p2[1]];
            const sp = []; for (let i = 0; i <= 10; i++) sp.push(at(i / 10));
            stems += line(sp, GROUT, 1.7) + line(sp, kind ? '#B58C3A' : '#6F9A4E', 0.8);
            const nl = Math.max(2, Math.round(hgt / 15));
            for (let i = 0; i <= nl; i++) {
                const u = 0.3 + (0.7 * i) / nl, c = at(u), dir = Math.atan2(at(Math.min(1, u + 0.05))[1] - at(u - 0.05)[1], at(Math.min(1, u + 0.05))[0] - at(u - 0.05)[0]);
                const sg = i === nl ? 0 : (i + sI) % 2 ? 1 : -1, an = dir + sg * (0.8 + pr() * 0.3), L = (i === nl ? 14 : 12.5) * (0.88 + pr() * 0.24), wd = 3.9 + pr() * 0.9;
                const b0 = [c[0] + Math.cos(an) * 1.4, c[1] + Math.sin(an) * 1.4], tip = P2(b0, L, an), md = P2(b0, L * 0.42, an), nn = [-Math.sin(an), Math.cos(an)];
                const A = [md[0] + nn[0] * wd, md[1] + nn[1] * wd], B = [md[0] - nn[0] * wd, md[1] - nn[1] * wd];
                pl.raw(GROUT, inset([b0, A, tip, B], -0.6));
                pl.tile([b0, A, tip], LEAF, { gap: 0.22, miss: 0, chip: 0.03, hl: 0.6, jit: 0.2 });
                pl.tile([b0, tip, B], LEAF_D, { gap: 0.22, miss: 0, chip: 0.03, hl: 0, jit: 0.2 });
                if (kind && i > 0 && i < nl) { const bp = P2(c, 4.6, an + PI + (pr() - 0.5) * 0.6); pl.inlay(ngon(bp, 2.5, 6, pr()), ['#FFF7E4', '#F7EBD0', '#FFE9C2'], GROUT, { grow: 0.5, jit: 0.12, hl: 0.6 }); }
            }
        }
    }
    svg('foot', box, stepsDusk + pv.out() + stems + beds + pl.out());
    // the same steps where the courtyard's light lies on them: a hard-edged pool, as through a doorway
    const pool = dPoly([[116, JB - 1], [244, JB - 1], [338, 532], [22, 532]]);
    svg('foot-lit', box, `<defs><clipPath id="lp"><path d="${pool}"/></clipPath></defs><g clip-path="url(#lp)">${drawSteps({ hi: 0.45, grout: L_GROUT, stone: L_STONE, turq: L_TURQ, turqL: L_TURQ_L, white: L_WHITE, navy: L_NAVY, ochre: L_OCHRE })}</g>`);
}

/* ================= LIGHT ================= */
{
    // warm light out of the gateway, over the threshold and the steps
    svg('spill', [20, 250, 320, 206], '',
        `<defs><linearGradient id="sp" x1="0" y1="376" x2="0" y2="456" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFC56A" stop-opacity=".34"/><stop offset=".5" stop-color="#FFA540" stop-opacity=".2"/><stop offset="1" stop-color="#F58A2C" stop-opacity=".06"/></linearGradient>`
        + `<linearGradient id="jl" x1="100" y1="0" x2="126" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFB050" stop-opacity="0"/><stop offset="1" stop-color="#FFC56A" stop-opacity=".5"/></linearGradient>`
        + `<linearGradient id="jr" x1="260" y1="0" x2="234" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFB050" stop-opacity="0"/><stop offset="1" stop-color="#FFC56A" stop-opacity=".5"/></linearGradient>`
        + `<filter id="sb" filterUnits="userSpaceOnUse" x="20" y="250" width="320" height="206"><feGaussianBlur stdDeviation="5"/></filter>`
        + `<filter id="sc" filterUnits="userSpaceOnUse" x="20" y="250" width="320" height="206"><feGaussianBlur stdDeviation="1.6"/></filter></defs>`
        + `<path d="M118 378L242 378L318 456L42 456Z" fill="url(#sp)" filter="url(#sb)"/>`
        + `<g filter="url(#sc)"><path d="M108 290L114 290L114 378L108 378Z" fill="#FFC56A" fill-opacity=".5"/><path d="M252 290L246 290L246 378L252 378Z" fill="#FFC56A" fill-opacity=".5"/></g>`);
}

/* ================= THE HANGING LANTERN ================= */
{
    const box = [22, 196, 60, 110], grow = g => `<g transform="translate(${f1(LX * K * (1 - LS))} ${f1(HOOKY * K * (1 - LS))}) scale(${LS})">${g}</g>`;
    const mo = new Mo(101, box, { hiOp: 0.7 }), lit = new Mo(102, box, { hiOp: 0.8 });
    let beds = '';
    // chain
    for (let i = 0; i < 3; i++) mo.inlay(ngon([LX + (i % 2 ? 0.3 : -0.3), 207.6 + i * 3.3], 1.5, 6, i * 0.4), BRASS_T, GROUT, { grow: 0.4, hl: 0.8, jit: 0.08 });
    // cap: a small pointed roof
    const cap = [[LX, 213.6], [LX + 4, 216.4], [LX + 12.5, LT0], [LX - 12.5, LT0], [LX - 4, 216.4]];
    beds += fill(GROUT, inset(cap, -0.6));
    mo.tile([cap[0], [LX, LT0], cap[3], cap[4]], BRASS_T, { gap: 0.22, miss: 0, hl: 1 });
    mo.tile([cap[0], cap[1], cap[2], [LX, LT0]], BRONZE, { gap: 0.22, miss: 0 });
    // body: three faces between brass ribs, tapering
    const hwAt = y => 12 - ((y - LT0) / (LB0 - LT0)) * 3.2;
    const bodyP = [[LX - hwAt(LT0), LT0], [LX + hwAt(LT0), LT0], [LX + hwAt(LB0), LB0], [LX - hwAt(LB0), LB0]];
    beds += fill(GROUT, inset(bodyP, -0.6));
    const ribs = [-1, -0.42, 0.42, 1];
    const fx = (k, y) => LX + ribs[k] * hwAt(y);
    const rows = 7, rh = (LB0 - LT0) / rows;
    for (let f = 0; f < 3; f++) for (let rw = 0; rw < rows; rw++) {
        const y0 = LT0 + rw * rh, y1 = y0 + rh, ym = (y0 + y1) / 2;
        const a0 = fx(f, y0) + 0.5, b0 = fx(f + 1, y0) - 0.5, a1 = fx(f, y1) + 0.5, b1 = fx(f + 1, y1) - 0.5;
        const frame = rw === 0 || rw === rows - 1;
        if (frame) { mo.tile([[a0, y0], [b0, y0], [b1, y1], [a1, y1]], f === 1 ? BRASS_T : BRONZE, { gap: 0.22, miss: 0, hl: 0.9 }); continue; }
        // a pierced panel: brass with an opening cut through it
        mo.tile([[a0, y0], [b0, y0], [b1, y1], [a1, y1]], f === 1 ? BRASS_T : BRONZE, { gap: 0.2, miss: 0, hl: 0.5, chip: 0 });
        const cols = f === 1 ? 2 : 1;
        for (let c = 0; c < cols; c++) {
            const cx = (fx(f, ym) + fx(f + 1, ym)) / 2 + (cols === 2 ? (c - 0.5) * 4.6 : 0), wv = f === 1 ? 1.75 : 1.2;
            const hole = [[cx, ym - rh * 0.42], [cx + wv, ym], [cx, ym + rh * 0.42], [cx - wv, ym]]; // one opening, repeated: a lattice
            mo.over('#18203F', hole);
            lit.raw('#C86A14', inset(hole, -0.25));
            lit.tile(hole, f === 1 ? ['#FFF1B8', '#FFE694', '#FFF8D6'] : ['#FFC85A', '#FFB640', '#FFD777'], { gap: 0.08, miss: 0, chip: 0, hl: 0.3, jit: 0.1 });
        }
    }
    // ribs
    for (let k = 0; k < 4; k++) mo.over('#7A5A22', [[fx(k, LT0) - 0.6, LT0], [fx(k, LT0) + 0.6, LT0], [fx(k, LB0) + 0.6, LB0], [fx(k, LB0) - 0.6, LB0]]);
    // foot: an inverted cone and a drop
    const ft = [[LX - 8.8, LB0], [LX + 8.8, LB0], [LX + 3, LB0 + 6.4], [LX - 3, LB0 + 6.4]];
    beds += fill(GROUT, inset(ft, -0.6));
    mo.tile([ft[0], [LX, LB0], [LX, LB0 + 6.4], ft[3]], BRASS_T, { gap: 0.22, miss: 0, hl: 1 });
    mo.tile([[LX, LB0], ft[1], ft[2], [LX, LB0 + 6.4]], BRONZE, { gap: 0.22, miss: 0 });
    mo.inlay([[LX, LB0 + 7], [LX + 2.2, LB0 + 10.4], [LX, LB0 + 14.6], [LX - 2.2, LB0 + 10.4]], BRASS_T, GROUT, { grow: 0.5, hl: 1, jit: 0.1 });
    svg('lantern', box, grow(beds + mo.out()));
    svg('lantern-lit', box, grow(lit.out()));

    // its glow
    svg('lantern-glow', [-6, 186, 124, 136], '',
        `<defs><radialGradient id="lg"><stop offset="0" stop-color="#FFD27A" stop-opacity=".42"/><stop offset=".35" stop-color="#FFB04A" stop-opacity=".18"/><stop offset="1" stop-color="#F28A2A" stop-opacity="0"/></radialGradient></defs><ellipse cx="${LC[0]}" cy="${f1(LC[1])}" rx="56" ry="64" fill="url(#lg)"/>`);

}

const total = Object.values(SIZES).reduce((a, b) => a + b, 0);
for (const [k, v] of Object.entries(SIZES)) console.log(k.padEnd(14), String(v).padStart(6));
console.log('total'.padEnd(14), String(total).padStart(6), `(${Object.keys(SIZES).length} files)`);
