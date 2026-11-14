// Generator for the "rangoli" wrapper art (Diwali), drawn as COLOURED POWDER ON STONE, seen from above.
// The geometry is exact (symmetry by code); the material is loose powder:
//   - every powder shape is a fill whose edge is broken up by grains (a dotted stroke of the same colour),
//     bitten into by a mask (dotted strokes and a hatch of holes: the stone shows through), and dusted
//     around by stray grains that fall off with distance, over the stone and over the neighbouring colour;
//   - the body is grained by two hatches of dots (light and dark) clipped to the powder, and thinned in
//     patches; a soft haze of its own colour lies around it (dust in the stone);
//   - poured lines are ridges: a thin core, thicker blobs where the hand slowed, a shadow on one side;
//   - rice-flour outlines are drawn by finger: off the edge they follow, never one width, grains beside them.
// The gate allows no feTurbulence, <use> or <pattern>: a hatch is one long path whose dash pattern is a
// run of zero-length dashes with round caps; every petal is written out, each one a little different.
// Petal rings are drawn where they are when OPEN (the definition holds them at half size under the bud);
// the bud's shutters, the garland, lamps and bowl are drawn where they are when CLOSED.
// Run: node scripts/art/rangoli.gen.mjs && node scripts/wrap-art.mjs --write
import { writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'rangoli');
if (!OUT.endsWith('wrappers/rangoli')) throw new Error('out dir must be public/wrappers/rangoli');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* ---------- Colours ---------- */
const CRIMSON = '#C8203C';
const CRIMSON_D = '#A8184A';
const SAFFRON = '#F27C1C';
const ORANGE_D = '#E2601A';
const TEAL = '#0C9590';
const MARIGOLD = '#F8BC1E';
const MAGENTA = '#C9267F';
const FLOUR = '#F4ECDC';
const JOINT = '#1E1613';

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

/* ---------- Geometry ---------- */
const W = 360, H = 450;
/** The centre of the rangoli: a little left of and below the middle of the canvas. */
const C = [172, 264];
/** A point at radius r, `a` degrees clockwise from straight up, around the centre. */
const P = (r, a, c = C) => { const t = (a * Math.PI) / 180; return [c[0] + r * Math.sin(t), c[1] - r * Math.cos(t)]; };
const lerpTable = (tab, t) => {
    for (let i = 1; i < tab.length; i++) if (t <= tab[i][0]) { const [t0, v0] = tab[i - 1], [t1, v1] = tab[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0); }
    return tab[tab.length - 1][1];
};
/** Width profiles along a petal, base (0) to tip (1). */
const LOTUS = [[0, 0.5], [0.14, 0.84], [0.34, 1], [0.55, 0.9], [0.75, 0.58], [0.9, 0.26], [1, 0]];
const LEAF = [[0, 0], [0.12, 0.52], [0.3, 0.9], [0.45, 1], [0.65, 0.8], [0.85, 0.4], [1, 0]];
const BLADE = [[0, 0.86], [0.2, 1], [0.45, 0.84], [0.7, 0.5], [0.88, 0.22], [1, 0]];
const BUDR = [[0, 0.16], [0.05, 0.6], [0.13, 0.88], [0.3, 1], [0.6, 0.95], [0.82, 0.72], [0.94, 0.42], [1, 0]];
const BUDP = [[0, 0.5], [0.08, 0.86], [0.2, 1], [0.5, 0.8], [0.72, 0.52], [0.88, 0.25], [1, 0]];
const ROUND = [[0, 0.7], [0.25, 1], [0.6, 0.95], [0.85, 0.6], [1, 0]];

/**
 * A petal from radius r0 to r1 along the ray at `a` degrees (bending by `swirl` degrees toward the tip),
 * half-width hw, drawn by a hand: every measure is a little off and every point trembles.
 */
function petal(r0, r1, a, hw, prof, rand, o = {}) {
    const { swirl = 0, jit = 0.6, n = 7, loose = 1, c = C, sharp = true } = o;
    a += (rand() - 0.5) * 2.2 * loose;
    r1 += (r1 - r0) * (rand() - 0.5) * 0.07 * loose;
    hw *= 1 + (rand() - 0.5) * 0.14 * loose;
    const sw = swirl + (rand() - 0.5) * 4 * loose;
    const axis = t => P(r0 + (r1 - r0) * t, a + sw * Math.pow(Math.max(0, t), 1.4), c);
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
        const t = i / n, A = axis(t), B0 = axis(t - 0.02), B1 = axis(t + 0.02);
        const tx = B1[0] - B0[0], ty = B1[1] - B0[1], l = Math.hypot(tx, ty) || 1;
        const w = hw * lerpTable(prof, t);
        const j = () => (rand() - 0.5) * 2 * jit;
        L.push([A[0] - (ty / l) * w + j(), A[1] + (tx / l) * w + j()]);
        R.push([A[0] + (ty / l) * w + j(), A[1] - (tx / l) * w + j()]);
    }
    const tip = axis(1);
    const pts = sharp ? [...L, tip, tip, ...R.reverse()] : [...L, tip, ...R.reverse()];
    if (prof[0][1] === 0) pts.pop();
    pts.axis = axis;
    return pts;
}
/** A rough disc. */
function blob(cx, cy, r, rand, n = 9, jit = 0.14) {
    const pts = [], a0 = rand() * 6.28;
    for (let i = 0; i < n; i++) { const a = a0 + (i / n) * 6.283, q = r * (1 + (rand() - 0.5) * 2 * jit); pts.push([cx + q * Math.cos(a), cy + q * Math.sin(a)]); }
    return pts;
}
const tokens = arr => { let s = ''; for (const v of arr) { const t = String(v); s += (s && !t.startsWith('-') ? ' ' : '') + t; } return s; };
/** A smooth path through a polyline (its points are the controls), in whole numbers at scale k, relative. */
function smooth(pts, closed = true, k = 2) {
    const q = pts.map(([x, y]) => [Math.round(x * k), Math.round(y * k)]);
    const mid = (a, b) => [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)];
    const n = q.length;
    let cur, d;
    if (closed) {
        cur = mid(q[n - 1], q[0]);
        d = `M${tokens(cur)}`;
        for (let i = 0; i < n; i++) {
            const e = mid(q[i], q[(i + 1) % n]);
            d += 'q' + tokens([q[i][0] - cur[0], q[i][1] - cur[1], e[0] - cur[0], e[1] - cur[1]]);
            cur = e;
        }
        return d + 'z';
    }
    cur = q[0];
    d = `M${tokens(cur)}`;
    for (let i = 1; i < n - 1; i++) {
        const e = i === n - 2 ? q[n - 1] : mid(q[i], q[i + 1]);
        d += 'q' + tokens([q[i][0] - cur[0], q[i][1] - cur[1], e[0] - cur[0], e[1] - cur[1]]);
        cur = e;
    }
    if (n === 2) d += 'l' + tokens([q[1][0] - cur[0], q[1][1] - cur[1]]);
    return d;
}
const inside = (pts, x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
};
const distTo = (pts, x, y) => {
    let best = 1e9;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [ax, ay] = pts[j], [bx, by] = pts[i];
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
        const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
        if (d < best) best = d;
    }
    return best;
};

/** Dots as one path (zero-length subpaths with round caps), whole numbers at scale 2, ordered to keep steps short. */
function dotPath(points, r, ink, extra = '') {
    if (points.length === 0) return '';
    const q = points.map(([x, y]) => [Math.round(x * 2), Math.round(y * 2)]);
    const band = 6;
    q.sort((a, b) => {
        const ra = Math.floor(a[1] / band), rb = Math.floor(b[1] / band);
        if (ra !== rb) return ra - rb;
        return ra % 2 === 0 ? a[0] - b[0] : b[0] - a[0];
    });
    let d = '', px = 0, py = 0, first = true;
    for (const [x, y] of q) {
        const a = String(first ? x : x - px), b = String(first ? y : y - py);
        d += `${first ? 'M' : 'm'}${a}${b.startsWith('-') ? '' : ' '}${b}z`;
        px = x; py = y; first = false;
    }
    return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${f2(r * 4)}" stroke-linecap="round"${extra}/>`;
}
/** A dash pattern of dots: zero-length dashes, gaps around `gap` units (written at scale 2). */
const dotDash = (gap, rand, n = 9) => Array.from({ length: n }, () => `.01 ${f(gap * 2 * (0.25 + 1.75 * Math.pow(rand(), 1.6) * 1.35))}`).join(' ');
/** A dash pattern of blobs: dashes of uneven length with uneven gaps (units, written at scale 2). */
const blobDash = (on, off, rand, n = 7) => Array.from({ length: n }, () => `${f(on * 2 * (0.4 + 1.4 * rand()))} ${f(off * 2 * (0.5 + 1.2 * rand()))}`).join(' ');
/**
 * A hatch of grains over `box`: one zigzag path, dotted. `pitch` is the mean distance between rows,
 * `gap` between grains along a row, `r` the grain's radius (all in canvas units).
 */
function hatch(box, pitch, gap, r, ink, rand, extra = '', angle = 0) {
    const cx = Math.round((box[0] + box[2] / 2) * 2), cy = Math.round((box[1] + box[3] / 2) * 2);
    const half = Math.ceil(angle ? Math.hypot(box[2], box[3]) : Math.max(box[2], box[3])) + 6;
    const w = half * 2;
    const s = Math.max(1, Math.round(pitch * 2));
    let d = `M${cx - half} ${cy - half}`;
    for (let yy = 0; yy < w + s; yy += 2 * s) {
        // rows never parallel and never evenly spaced: a grain, not a weave
        const a = Math.round(s * (0.25 + 1.5 * rand())), b = 2 * s - a;
        d += `l${w} ${a}l${-w} ${b}`;
    }
    return `<path d="${d}"${angle ? ` transform="rotate(${angle} ${cx} ${cy})"` : ''} fill="none" stroke="${ink}" stroke-width="${f2(r * 4)}" stroke-linecap="round" stroke-dasharray="${dotDash(gap, rand, 13)}"${extra}/>`;
}

/**
 * Stipple with no rows in it: grains strung on many circles of every size thrown at random over `box`,
 * so that no two strings run the same way. `pitch` is the mean distance between strings, `gap` between
 * grains along one, `r` the grain's radius (canvas units). One group, one dash pattern, a circle per string.
 */
function stipple(box, pitch, gap, r, ink, op, rand, band) {
    const [x, y, w, h] = box, size = Math.max(w, h);
    let out = '', got = 0, guard = 0;
    // `band` = [r0, r1]: the powder lies in a ring round the centre, so the strings are thrown along it
    const inBand = (px, py) => { const d = Math.hypot(px - C[0], py - C[1]); return d > band[0] && d < band[1]; };
    let need = (w * h) / pitch;
    if (band) { let n = 0; for (let i = 0; i < 4000; i++) if (inBand(x + rand() * w, y + rand() * h)) n++; need *= n / 4000; }
    while (got < need && guard++ < 4000) {
        const R = band ? band[0] + rand() * (band[1] - band[0]) : size * (0.22 + 0.42 * rand());
        const cx = band ? C[0] + (rand() - 0.5) * 90 : x + rand() * w, cy = band ? C[1] + (rand() - 0.5) * 90 : y + rand() * h;
        let hit = 0;
        for (let i = 0; i < 48; i += band ? 1 : 2) { const a = (i / 48) * 6.283, px = cx + R * Math.cos(a), py = cy + R * Math.sin(a); if (px > x && px < x + w && py > y && py < y + h && (!band || inBand(px, py))) hit += band ? 0.5 : 1; }
        if (hit < (band ? 2 : 11)) continue;
        got += (6.283 * R * hit) / 24;
        out += `<circle cx="${Math.round(cx * 2)}" cy="${Math.round(cy * 2)}" r="${Math.round(R * 2)}"/>`;
    }
    return `<g fill="none" stroke="${ink}" stroke-opacity="${op}" stroke-width="${f2(r * 4)}" stroke-linecap="round" stroke-dasharray="${dotDash(gap, rand, 17)}">${out}</g>`;
}

const BOX = {};
const SIZES = {};
function write(name, box, body) {
    BOX[name] = box.map(v => Math.round(v * 100) / 100);
    const [x, y, w, h] = BOX[name];
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${body}</svg>`);
}

/**
 * A layer of powder. Shapes are poured in order; the layer writes them with their grain, bites, haze and strays.
 * `under` and `top` are plain drawings (canvas units) below and above the powder.
 */
class Powder {
    constructor(name, box, seed, o = {}) {
        this.name = name; this.box = box; this.rand = rng(seed);
        this.o = { grain: 1.5, holes: 5.2, haze: 1.5, cell: 1.15, ...o };
        this.fills = []; this.all = ''; this.bites = ''; this.pours = new Map(); this.flourD = ''; this.flourDots = []; this.strays = new Map();
        this.thin = []; this.under = ''; this.top = ''; this.defs = ''; this.polys = [];
    }
    /** A poured area of one colour. `stray` is how much of it lies scattered outside its edge. */
    fill(pts, col, o = {}) {
        const { stray = 0.3, reach = 2.3, crumb = 0.75, bite = true, heap = false, clip = true } = o;
        const d = smooth(pts);
        const last = this.fills[this.fills.length - 1];
        if (last && last.col === col && last.crumb === crumb) last.d += d;
        else this.fills.push({ col, d, crumb });
        if (clip) this.all += d;
        if (bite) this.bites += d;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, area = 0;
        pts.forEach(([x, y], i) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); const [u, v] = pts[(i + 1) % pts.length]; area += x * v - u * y; });
        this.polys.push({ pts, x0, y0, x1, y1, area: Math.abs(area) / 2, heap });
        if (heap && this.o.stack) this.raw(this.heapSvg(this.inset(pts)));
        if (stray > 0) {
            const rand = this.rand;
            const m = reach * 3, cell = this.o.cell;
            const list = this.strays.get(col) ?? [[], []];
            this.strays.set(col, list);
            for (let y = y0 - m; y < y1 + m; y += cell) for (let x = x0 - m; x < x1 + m; x += cell) {
                const px = x + rand() * cell, py = y + rand() * cell;
                if (inside(pts, px, py)) continue;
                const dd = distTo(pts, px, py);
                if (rand() < stray * Math.exp(-dd / reach)) list[rand() < 0.3 ? 1 : 0].push([px, py]);
            }
        }
        return this;
    }
    raw(svg) { this.fills.push({ raw: svg }); return this; }
    /** The line a heap follows: the shape's edge drawn in a little toward its middle. */
    inset(pts) {
        const rand = this.rand;
        const cx = pts.reduce((t, v) => t + v[0], 0) / pts.length, cy = pts.reduce((t, v) => t + v[1], 0) / pts.length;
        return smooth(pts.filter((_, k) => k % 2 === 0 || pts.length < 12).map(([x, y]) => { const l = Math.hypot(cx - x, cy - y) || 1, k = Math.min(l * 0.5, 1.7 + rand() * 1.5); return [x + ((cx - x) / l) * k, y + ((cy - y) / l) * k]; }));
    }
    heapSvg(d) {
        const rand = this.rand;
        if (!d) return '';
        return `<path d="${d}" fill="none" stroke="#FFF2D8" stroke-opacity=".15" stroke-width="7" stroke-linecap="round" stroke-dasharray="${blobDash(7, 1.2, rand)}"/>`
            + `<path d="${d}" fill="none" stroke="#FFF6E2" stroke-opacity=".5" stroke-width="1.7" stroke-linecap="round" stroke-dasharray="${dotDash(1.5, rand, 13)}"/>`;
    }
    /** A patch where the powder lies thin: more of the stone shows. */
    patch(x, y, r, k = 0.3) {
        const rand = this.rand;
        for (let i = 0, n = Math.round(r * r * k); i < n; i++) {
            const a = rand() * 6.283, q = r * Math.pow(rand(), 0.8);
            this.thin.push([x + q * Math.cos(a), y + q * Math.sin(a)]);
        }
        return this;
    }
    /** A poured line: a ridge of powder with a shadow on its lower right. */
    pour(pts, col, w, closed = false) {
        const key = `${col}|${w}`;
        this.pours.set(key, (this.pours.get(key) ?? '') + smooth(pts, closed));
        return this;
    }
    /** A line of rice flour drawn by finger: off the edge it follows, grains beside it. */
    flour(pts, closed = true, o = {}) {
        const { jit = 0.7, grains = 0.3 } = o;
        const rand = this.rand;
        const p = pts.map(([x, y]) => [x + (rand() - 0.5) * 2 * jit, y + (rand() - 0.5) * 2 * jit]);
        this.flourD += smooth(p, closed);
        for (let i = 0; i < p.length - (closed ? 0 : 1); i++) {
            const a = p[i], b = p[(i + 1) % p.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
            for (let s = 0; s < l; s += 1.1) if (rand() < grains) {
                const t = s / l, off = (rand() + rand() + rand() - 1.5) * 2.6;
                this.flourDots.push([a[0] + (b[0] - a[0]) * t - ((b[1] - a[1]) / l) * off, a[1] + (b[1] - a[1]) * t + ((b[0] - a[0]) / l) * off]);
            }
        }
        return this;
    }
    /** A dot of powder dropped from the fingers. */
    dot(x, y, r, col, o = {}) { return this.fill(blob(x, y, r, this.rand, 6, 0.2), col, { stray: 0.22, reach: 1.4, bite: false, ...o }); }
    render() {
        const { rand, box } = this;
        const [bx, by, bw, bh] = box.map(v => Math.round(v * 2));
        let fills = '';
        for (const s of this.fills) {
            if (s.raw !== undefined) fills += s.raw;
            else fills += `<path d="${s.d}" fill="${s.col}" stroke="${s.col}" stroke-width="${f2(s.crumb * 4)}" stroke-linecap="round" stroke-dasharray="${dotDash(1.25, rand)}"/>`;
        }
        let pours = '';
        for (const [key, d] of this.pours) {
            const [col, ws] = key.split('|'), w = Number(ws) * 2;
            pours += `<path d="${d}" transform="translate(1.3 1.7)" fill="none" stroke="#1A0608" stroke-opacity=".34" stroke-width="${f(w * 1.05)}" stroke-linecap="round"/>`;
            pours += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(w * 0.62)}" stroke-linecap="round" stroke-dasharray="${blobDash(9, 0.5, rand)}"/>`;
            pours += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(w * 1.08)}" stroke-linecap="round" stroke-dasharray="${blobDash(3.2, 2.6, rand)}"/>`;
        }
        // grain: stipple, light and dark, and (for shapes that do not lie on one another) a heap of
        // lighter powder along the inside of each edge, where it was poured
        const gk = this.o.grainK ?? 1;
        const gx0 = Math.min(...this.polys.map(q => q.x0)), gy0 = Math.min(...this.polys.map(q => q.y0)), gx1 = Math.max(...this.polys.map(q => q.x1)), gy1 = Math.max(...this.polys.map(q => q.y1));
        const gbox = this.o.gbox ?? [gx0, gy0, gx1 - gx0, gy1 - gy0], band = this.o.band;
        let heapD = '';
        if (!this.o.stack) for (const q of this.polys) if (q.heap) heapD += this.inset(q.pts);
        const grain = `<g clip-path="url(#c)">${this.heapSvg(heapD)}${stipple(gbox, 2 * gk, 2, 0.4, '#1E080C', '.42', rand, band)}${stipple(gbox, 2.3 * gk, 2.2, 0.38, '#FFF4DC', '.42', rand, band)}${stipple(gbox, 9 * gk, 6, 0.72, '#FFF0D0', '.26', rand, band)}</g>`;
        let flour = '';
        if (this.flourD) {
            flour += `<path d="${this.flourD}" fill="none" stroke="${FLOUR}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${blobDash(11, 0.5, rand)}"/>`;
            flour += `<path d="${this.flourD}" fill="none" stroke="${FLOUR}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${blobDash(3, 2.8, rand)}"/>`;
        }
        const mask = `<mask id="h" maskUnits="userSpaceOnUse" x="${bx}" y="${by}" width="${bw}" height="${bh}"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#fff"/>`
            + stipple(gbox, 6 * gk, 4.6, 0.5, '#000', '1', rand, band)
            + (this.bites ? `<path d="${this.bites}" fill="none" stroke="#000" stroke-width="2.7" stroke-linecap="round" stroke-dasharray="${dotDash(1.7, rand)}"/>` : '')
            + dotPath(this.thin, 0.48, '#000') + '</mask>';
        const haze = this.o.haze > 0
            ? `<filter id="z" x="-8%" y="-8%" width="116%" height="116%"><feGaussianBlur stdDeviation="${f(this.o.haze * 2)}" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .5 0" result="c"/><feComposite in="SourceGraphic" in2="c" operator="over"/></filter>`
            : '';
        let strays = '';
        for (const [col, [small, big]] of this.strays) strays += dotPath(small, 0.34, col) + dotPath(big, 0.5, col);
        strays += dotPath(this.flourDots, 0.36, FLOUR);
        const body = `<defs>${haze}<clipPath id="c"><path d="${this.all}"/></clipPath>${mask}${this.defs}</defs>${this.under}`
            + `<g transform="scale(.5)"><g${haze ? ' filter="url(#z)"' : ''}><g mask="url(#h)">${fills}${pours}${grain}${flour}</g></g>${strays}</g>${this.top}`;
        write(this.name, box, body);
    }
}
const ringBox = R => [C[0] - R, C[1] - R, R * 2, R * 2];

/* =====================================================================================================
 * The open pattern: four rings of petals around a bright centre. Each ring is its own layer.
 * ===================================================================================================== */

/* ---------- Ring A, the outermost: sixteen pointed petals, saffron and crimson, 130..200 ---------- */
{
    const L = new Powder('ring-a', ringBox(214), 101, { cell: 1.9, grainK: 1.2 });
    const rand = L.rand;
    for (let k = 0; k < 16; k++) L.fill(petal(134, 188, k * 22.5 + 11.25, 9.5, LEAF, rand, { n: 5 }), MAGENTA, { stray: 0.16 });
    const mains = [];
    for (let k = 0; k < 16; k++) {
        const a = k * 22.5, warm = k % 2 === 0;
        const p = petal(130, 201, a, 22, LOTUS, rand, { jit: 0.9, n: 6 });
        mains.push(p);
        L.fill(p, warm ? SAFFRON : CRIMSON, { stray: 0.18, heap: true });
        L.fill(petal(141, 183, a + (rand() - 0.5) * 2, 10, LEAF, rand, { n: 5 }), warm ? CRIMSON : MARIGOLD, { stray: 0.1, bite: false, clip: false });
        const q = P(150 + rand() * 30, a + (rand() - 0.5) * 12);
        L.patch(q[0], q[1], 7 + rand() * 6, 0.22);
    }
    for (let k = 0; k < 16; k++) {
        L.flour(mains[k].slice(1, -1), false, { grains: 0.2 });
        const t = P(207 + (rand() - 0.5) * 2, k * 22.5 + (rand() - 0.5) * 2);
        L.dot(t[0], t[1], 2.3 + rand() * 0.6, FLOUR);
        const u = P(196 + (rand() - 0.5) * 2, k * 22.5 + 11.25 + (rand() - 0.5) * 2);
        L.dot(u[0], u[1], 1.7 + rand() * 0.5, MARIGOLD);
    }
    L.render();
}

/* ---------- Ring B: twelve peacock-teal petals, each with an eye of colour, 86..140 ---------- */
{
    const L = new Powder('ring-b', ringBox(152), 202, { cell: 1.3 });
    const rand = L.rand;
    for (let k = 0; k < 12; k++) L.fill(petal(92, 136, k * 30 + 15, 9, LEAF, rand), MARIGOLD, { stray: 0.22 });
    const mains = [];
    for (let k = 0; k < 12; k++) {
        const a = k * 30;
        const p = petal(86, 141, a, 20, LOTUS, rand, { jit: 0.8 });
        mains.push(p);
        L.fill(p, TEAL, { stray: 0.34, heap: true });
        const e = petal(102, 130, a + (rand() - 0.5) * 2, 7.6, LEAF, rand);
        L.fill(e, SAFFRON, { stray: 0.14, clip: false });
        const m = P(114 + rand() * 2, a + (rand() - 0.5) * 2);
        L.dot(m[0], m[1], 3.3, MAGENTA, { stray: 0.1, clip: false });
        const q = P(96 + rand() * 30, a + (rand() - 0.5) * 16);
        L.patch(q[0], q[1], 6 + rand() * 5, 0.22);
    }
    for (let k = 0; k < 12; k++) {
        L.flour(mains[k].slice(1, -1), false);
        const t = P(146 + (rand() - 0.5) * 2, k * 30 + (rand() - 0.5) * 2);
        L.dot(t[0], t[1], 2 + rand() * 0.5, FLOUR);
    }
    L.render();
}

/* ---------- Ring C: eight crimson lotus petals, saffron hearts, teal leaves between, 44..92 ---------- */
{
    const L = new Powder('ring-c', ringBox(102), 303, { grain: 1.4, holes: 5 });
    const rand = L.rand;
    for (let k = 0; k < 8; k++) L.fill(petal(52, 90, k * 45 + 22.5, 8.5, LEAF, rand), TEAL, { stray: 0.22 });
    const mains = [];
    for (let k = 0; k < 8; k++) {
        const a = k * 45;
        const p = petal(44, 93, a, 18.5, LOTUS, rand, { jit: 0.8 });
        mains.push(p);
        L.fill(p, CRIMSON, { stray: 0.34, heap: true });
        L.fill(petal(53, 81, a + (rand() - 0.5) * 2, 8, LEAF, rand), SAFFRON, { stray: 0.14, clip: false });
        const q = P(56 + rand() * 26, a + (rand() - 0.5) * 20);
        L.patch(q[0], q[1], 5 + rand() * 4, 0.22);
    }
    for (let k = 0; k < 8; k++) {
        L.flour(mains[k].slice(1, -1), false);
        const t = P(97.5 + (rand() - 0.5) * 1.6, k * 45 + (rand() - 0.5) * 2);
        L.dot(t[0], t[1], 1.9 + rand() * 0.5, FLOUR);
        const u = P(66 + (rand() - 0.5), k * 45 + (rand() - 0.5) * 3);
        L.dot(u[0], u[1], 1.5, MARIGOLD, { stray: 0.08, clip: false });
    }
    L.render();
}

/* ---------- The centre: a marigold-yellow disc, eight magenta petals, a teal ring, flour dots ---------- */
{
    const L = new Powder('medal', ringBox(54), 404, { grain: 1.3, holes: 5.6, haze: 1.2 });
    const rand = L.rand;
    L.fill(blob(C[0], C[1], 37, rand, 22, 0.035), MARIGOLD, { stray: 0.4, heap: true });
    for (let k = 0; k < 8; k++) {
        const a = k * 45 + 22.5;
        L.fill(petal(7, 32, a, 7.4, LEAF, rand, { jit: 0.45 }), MAGENTA, { stray: 0.14, reach: 1.6 });
        const v = petal(11, 26, a + (rand() - 0.5) * 3, 1, LEAF, rand, { jit: 0.3 });
        L.flour([v.axis(0.05), v.axis(0.5), v.axis(0.95)], false, { jit: 0.35, grains: 0.2 });
        const s = P(27 + rand(), k * 45 + (rand() - 0.5) * 4);
        L.dot(s[0], s[1], 1.7, SAFFRON, { stray: 0.06 });
    }
    L.pour(blob(C[0], C[1], 41.5, rand, 20, 0.02), TEAL, 3.1, true);
    L.fill(blob(C[0], C[1], 6.2, rand, 9, 0.1), FLOUR, { stray: 0.3, reach: 1.6 });
    L.dot(C[0] + 0.4, C[1] - 0.3, 2.4, CRIMSON, { stray: 0.05 });
    for (let k = 0; k < 16; k++) { const t = P(47.5 + (rand() - 0.5) * 1.4, k * 22.5 + 11 + (rand() - 0.5) * 3); L.dot(t[0], t[1], 1.5 + rand() * 0.5, FLOUR); }
    L.patch(C[0] - 14, C[1] + 16, 7, 0.25).patch(C[0] + 18, C[1] - 12, 6, 0.25);
    L.render();
}

/* ---------- The border, poured first and left on the floor: a saffron line, scallops, flour dots ---------- */
{
    const L = new Powder('border', [0, 0, W, H], 505, { gbox: [0, 0, W, H], band: [198, 250] });
    const rand = L.rand;
    const seen = ([x, y], m = 16) => x > -m && x < W + m && y > -m && y < H + m;
    const N = 44;
    const line = [];
    for (let k = 0; k <= 180; k++) line.push(P(210.5 + (rand() - 0.5) * 1.2, k * 2));
    // the saffron line, in the runs that cross the canvas
    let run = [];
    for (const p of line) { if (seen(p, 6)) run.push(p); else { if (run.length > 2) L.pour(run, SAFFRON, 3.2); run = []; } }
    if (run.length > 2) L.pour(run, SAFFRON, 3.2);
    for (let k = 0; k < N; k++) {
        const a = (k * 360) / N;
        if (!seen(P(224, a))) continue;
        const p = petal(214, 236, a, 11.5, ROUND, rand, { jit: 0.7 });
        L.fill(p, k % 2 ? TEAL : MAGENTA, { stray: 0.34, heap: true });
        const m = P(223 + rand(), a + (rand() - 0.5) * 1.5);
        L.dot(m[0], m[1], 2.4, k % 2 ? MARIGOLD : FLOUR, { stray: 0.1 });
        L.flour(p.slice(1, -1), false);
        const t = P(243 + (rand() - 0.5) * 2, a + 180 / N + (rand() - 0.5) * 1.4);
        if (seen(t, 4)) L.dot(t[0], t[1], 2 + rand() * 0.5, FLOUR);
        const q = P(225, a + (rand() - 0.5) * 4);
        if (rand() < 0.5) L.patch(q[0], q[1], 6, 0.25);
    }
    L.render();
}

/* =====================================================================================================
 * The bud: two rings of round petals, crimson and saffron, lying on one another in a spiral, shut over a calm middle.
 * ===================================================================================================== */
function shutter(name, seed, R, n, rb, rt, swirl, hw, cols, o = {}) {
    const L = new Powder(name, ringBox(R), seed, { haze: 1.1, stack: true, ...o });
    const rand = L.rand, a0 = o.a0 ?? 0, N = 8, cw = swirl > 0, sg = cw ? 1 : -1;
    // laid so that each petal's round tip lies over the next petal: the tips show, spiralling in to the centre
    for (let i = 0; i < n; i++) {
        const k = cw ? n - 1 - i : i;
        const a = a0 + (k * 360) / n;
        const p = petal(rb, rt, a, hw, BUDR, rand, { swirl, jit: 0.5, n: N, sharp: false });
        const ar = (a * Math.PI) / 180, sh = o.shade ?? 3.4;
        // the fold: each petal throws a soft shadow on the one it lies on
        L.raw(`<path d="${smooth(p)}" transform="translate(${f(Math.cos(ar) * sh * 2 * sg + 1)} ${f(Math.sin(ar) * sh * 2 * sg + 1.6)})" fill="#16040A" fill-opacity=".36"/>`);
        L.fill(p, cols[k % cols.length], { stray: 0.14, reach: 1.6, heap: true });
        // rice flour along the edge that shows, round the tip
        L.flour(cw ? p.slice(N - 2) : p.slice(0, N + 3), false, { jit: 0.45, grains: 0.22 });
        const q = p.axis(0.25 + rand() * 0.4);
        L.patch(q[0] + (rand() - 0.5) * 8, q[1] + (rand() - 0.5) * 8, 4 + rand() * 3, 0.2);
    }
    return L;
}
shutter('shut-a', 606, 122, 8, 106, 38, 30, 41, [CRIMSON, SAFFRON]).render();
shutter('shut-b', 707, 72, 6, 64, 13, -34, 31, [SAFFRON, CRIMSON], { a0: 14, shade: 2.4 }).render();
{
    // the calm middle of the bud: a marigold-yellow disc, one ring of crimson, a touch of flour
    const L = new Powder('cap', ringBox(28), 808, { haze: 1.1 });
    const rand = L.rand;
    L.raw(`<path d="${smooth(blob(C[0] + 1, C[1] + 1.4, 18.6, rand, 14, 0.03))}" fill="#16040A" fill-opacity=".4"/>`);
    L.fill(blob(C[0], C[1], 17.5, rand, 16, 0.035), MARIGOLD, { stray: 0.3, reach: 1.6, heap: true });
    L.pour(blob(C[0], C[1], 10.5, rand, 14, 0.03), CRIMSON, 1.9, true);
    L.fill(blob(C[0], C[1], 3.6, rand, 8, 0.12), FLOUR, { stray: 0.2, reach: 1.2 });
    L.flour(blob(C[0], C[1], 17.6, rand, 16, 0.02), true, { jit: 0.4, grains: 0.2 });
    L.render();
}

/* =====================================================================================================
 * Things that are not powder: the marigold garland, the clay lamps, the brass bowl, loose petals.
 * Drawn by a rougher, opaque hand, each one different.
 * ===================================================================================================== */
const pathU = (pts, closed = true) => smooth(pts, closed, 10);
/** A plain drawing in canvas units, with paths written at scale 10. */
const U = (d, attrs) => `<path transform="scale(.1)" d="${d}" ${attrs}/>`;
const SOFT = (id, s) => `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${s}"/></filter>`;

/** A scalloped rosette: the ruffled edge of a marigold seen from above. */
function rosette(cx, cy, R, n, rand, depth = 0.8) {
    const pts = [], a0 = rand() * 6.283;
    for (let i = 0; i < n * 2; i++) {
        const a = a0 + (i * Math.PI) / n + (rand() - 0.5) * 0.12;
        const r = R * (i % 2 ? depth : 1) * (1 + (rand() - 0.5) * 0.14);
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
}
function marigold(cx, cy, R, rand, tone) {
    const [deep, mid, lite] = tone;
    let s = U(pathU(rosette(cx, cy, R, 10, rand, 0.82)), `fill="${deep}"`);
    s += U(pathU(rosette(cx + (rand() - 0.5), cy + (rand() - 0.5), R * 0.74, 8, rand, 0.78)), `fill="${mid}"`);
    s += U(pathU(rosette(cx + (rand() - 0.5), cy + (rand() - 0.5), R * 0.46, 6, rand, 0.72)), `fill="${lite}"`);
    s += U(pathU(rosette(cx, cy, R * 0.2, 4, rand, 0.6)), `fill="${deep}" fill-opacity=".8"`);
    return s;
}
const TONES = [
    ['#C9500F', '#F0841A', '#F9A72B'],
    ['#D9860B', '#F6B51C', '#FBD24A'],
    ['#B8430E', '#E46A17', '#F58F22'],
    ['#CE7A0A', '#F2A616', '#F9C63A'],
];

/* ---------- The garland: a ring of marigold heads tied shut around the bud, two short tails ---------- */
{
    const rand = rng(909);
    const R = 122, GR = 108.5;
    const heads = [];
    const n = 33;
    for (let k = 0; k < n; k++) {
        const a = (k * 360) / n + (rand() - 0.5) * 3;
        const [x, y] = P(GR + (rand() - 0.5) * 2.6, a);
        heads.push([x, y, 9.3 + (rand() - 0.5) * 2, Math.floor(rand() * 4)]);
    }
    // the knot and its two tails, at the lower right
    const KA = 141;
    const tails = [];
    for (const [da, len] of [[-7, 3], [8, 2]]) for (let i = 1; i <= len; i++) {
        const [x, y] = P(GR + 4 + i * 12.5, KA + da * (0.6 + i * 0.5));
        tails.push([x, y, 7.6 - i * 0.7 + rand(), Math.floor(rand() * 4)]);
    }
    let shadow = '', body = '';
    for (const [x, y, r] of [...tails, ...heads]) shadow += `<circle cx="${f(x + 1.6)}" cy="${f(y + 2.2)}" r="${f(r * 0.98)}"/>`;
    // the thread, showing between heads and running out along the tails
    body += `<circle cx="${C[0]}" cy="${C[1]}" r="${GR}" fill="none" stroke="#7A1420" stroke-width="1.6"/>`;
    for (const da of [-7, 8]) {
        const pts = [P(GR, KA), P(GR + 16, KA + da * 1.1), P(GR + 30, KA + da * 1.7), P(GR + (da < 0 ? 48 : 36), KA + da * 2.2)];
        body += U(pathU(pts, false), 'fill="none" stroke="#8E1826" stroke-width="12" stroke-linecap="round"');
    }
    for (const [x, y, r, t] of tails) body += marigold(x, y, r, rand, TONES[t]);
    // heads laid one on the next, the last tucked back under the first
    const order = heads.map((h, i) => [h, i]).sort((a, b) => (a[1] % 2) - (b[1] % 2));
    for (const [[x, y, r, t]] of order) body += marigold(x, y, r, rand, TONES[t]);
    // a small bound knot of thread where the ring is tied
    const [kx, ky] = P(GR + 9, KA);
    body += U(pathU(blob(kx, ky, 4.6, rand, 8, 0.2)), 'fill="#A51C2E"') + U(pathU(blob(kx - 0.6, ky - 0.8, 2.3, rand, 7, 0.2)), 'fill="#D2475A"');
    for (const [da, l] of [[-7, 48], [8, 36]]) {
        const [tx, ty] = P(GR + l + 3, KA + da * 2.3);
        for (let i = 0; i < 5; i++) { const [ex, ey] = [tx + (rand() - 0.3) * 7, ty + (rand() + 0.2) * 7]; body += `<line x1="${f(tx)}" y1="${f(ty)}" x2="${f(ex)}" y2="${f(ey)}" stroke="#B02236" stroke-width=".9" stroke-linecap="round"/>`; }
    }
    // specks of pollen and darker creases, so the heads are not flat
    const pts = [], dk = [];
    for (const [x, y, r] of [...heads, ...tails]) for (let i = 0; i < 16; i++) { const a = rand() * 6.283, q = r * Math.sqrt(rand()) * 0.95; (rand() < 0.5 ? pts : dk).push([x + q * Math.cos(a), y + q * Math.sin(a)]); }
    body += `<g transform="scale(.5)">${dotPath(pts, 0.36, '#FFE38A', ' stroke-opacity=".7"')}${dotPath(dk, 0.4, '#8A2E08', ' stroke-opacity=".6"')}</g>`;
    const box = [C[0] - R - 44, C[1] - R - 44, (R + 44) * 2, (R + 44) * 2];
    write('garland', box, `<defs>${SOFT('s', 2.2)}</defs><g filter="url(#s)" fill="#0A0304" fill-opacity=".55">${shadow}</g>${body}`);
}

/* ---------- Lamps, bowl, loose petals ---------- */
/** A clay lamp seen from above: a shallow round bowl pinched into a lip, oil, a wick lying in the lip. */
function lamp(x, y, R, rot, rand) {
    const dir = (rot * Math.PI) / 180;
    // a round bowl drawn out into a clear pointed lip on one side
    const shape = (k, lipK = 0.36, sharp = 18) => {
        const pts = [];
        for (let i = 0; i < 20; i++) {
            const a = dir + (i / 20) * 6.283;
            const lip = Math.pow(Math.max(0, Math.cos(a - dir)), sharp);
            const r = R * k * (1 + lipK * lip) * (1 + (i ? (rand() - 0.5) * 0.06 : 0));
            pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
        }
        return pts;
    };
    const tone = ['#B0603A', '#BA6A3E', '#A65834', '#C07044'][Math.floor(rand() * 4)];
    const at = k => [x + R * k * Math.cos(dir), y + R * k * Math.sin(dir)];
    const wick = at(1.24);
    let shadow = U(pathU(shape(1.08).map(([px, py]) => [px + 2, py + 2.8])), '');
    let s = U(pathU(shape(1)), `fill="${tone}"`);
    // the rim: a thick lip of clay, lighter where the thumb smoothed it
    s += U(pathU(shape(0.89, 0.36)), `fill="none" stroke="#E6A070" stroke-width="19" stroke-opacity=".8" stroke-linecap="round" stroke-dasharray="${Array.from({ length: 6 }, () => `${Math.round(40 + rand() * 110)} ${Math.round(6 + rand() * 30)}`).join(' ')}"`);
    s += U(pathU(shape(0.73, 0.4)), 'fill="#6A3420"');
    // the oil: a pool of amber running out into the lip, the dull sky lying on one side of it
    s += U(pathU(shape(0.6, 0.3, 14)), 'fill="#8E5A16"');
    const sky = [1.5, 2.1, 2.7, 3.3].map(t => [x + R * 0.38 * Math.cos(dir + t), y + R * 0.38 * Math.sin(dir + t)]);
    s += U(pathU(sky, false), 'fill="none" stroke="#C99A44" stroke-width="12" stroke-opacity=".5" stroke-linecap="round"');
    s += U(pathU(shape(0.6, 0.3, 14)), 'fill="none" stroke="#3E1E0C" stroke-width="7" stroke-opacity=".75"');
    // the wick: a short twist of cotton lying in the lip, its end charred
    const w0 = at(0.8);
    s += `<line x1="${f(w0[0])}" y1="${f(w0[1])}" x2="${f(wick[0])}" y2="${f(wick[1])}" stroke="#E6D8B4" stroke-width="1.9" stroke-linecap="round"/>`;
    s += `<circle cx="${f(wick[0])}" cy="${f(wick[1])}" r="1.1" fill="#2A1A10"/>`;
    const lite = [], dark = [];
    for (let i = 0; i < 30; i++) { const a = rand() * 6.283, q = R * (0.78 + rand() * 0.22); (rand() < 0.5 ? lite : dark).push([x + q * Math.cos(a), y + q * Math.sin(a)]); }
    s += `<g transform="scale(.5)">${dotPath(lite, 0.36, '#E8AC80', ' stroke-opacity=".7"')}${dotPath(dark, 0.4, '#5C2A16', ' stroke-opacity=".6"')}</g>`;
    return { s, shadow, wick };
}
/** The lamps: six close around the pattern, four further out. Order = the order they are lit. */
const LAMPS = [];
{
    const rand = rng(1212);
    const inner = [0, 60, 120, 180, 240, 300].map((a, i) => [a + [4, -5, 3, -4, 5, -3][i], 151 + [3, -4, 2, 5, -3, 0][i]]);
    const outer = [[36, 213], [217, 214], [322, 211], [147, 190]];
    for (const [a, r] of [...inner, ...outer]) {
        const [x, y] = P(r, a);
        const rot = a - 90 + 180 + (rand() - 0.5) * 70; // the lip points back toward the centre, roughly
        LAMPS.push({ x, y, R: 9.6 + rand() * 1.8, rot, a });
    }
}
{
    const L = new Powder('props', [0, 0, W, H], 1313, { haze: 1.4, gbox: [292, 363, 70, 70] });
    const rand = L.rand;
    // the brass bowl, lower right, heaped with magenta powder; a spill beside it
    const B = [327, 398], BR = 27;
    let under = `<g filter="url(#s)" fill="#070303" fill-opacity=".6">${U(pathU(blob(B[0] + 3, B[1] + 4, BR + 1.5, rand, 16, 0.02)), '')}</g>`;
    under += U(pathU(blob(B[0], B[1], BR, rand, 18, 0.018)), 'fill="#7C5C1E"');
    under += U(pathU(blob(B[0], B[1], BR - 1.8, rand, 18, 0.02)), `fill="none" stroke="#C9A24A" stroke-width="26" stroke-linecap="round" stroke-dasharray="${Array.from({ length: 7 }, () => `${Math.round(60 + rand() * 260)} ${Math.round(14 + rand() * 60)}`).join(' ')}"`);
    under += U(pathU(blob(B[0] - 0.5, B[1] - 0.6, BR - 4.6, rand, 18, 0.02)), 'fill="#4E3912"');
    under += U(pathU(blob(B[0], B[1], BR - 3.4, rand, 18, 0.02)), `fill="none" stroke="#E6C875" stroke-width="7" stroke-opacity=".8" stroke-linecap="round" stroke-dasharray="${Array.from({ length: 5 }, () => `${Math.round(20 + rand() * 90)} ${Math.round(60 + rand() * 200)}`).join(' ')}"`);
    const hammer = [];
    for (let i = 0; i < 60; i++) { const a = rand() * 6.283, q = BR - 0.6 - rand() * 3.2; hammer.push([B[0] + q * Math.cos(a), B[1] + q * Math.sin(a)]); }
    under += `<g transform="scale(.5)">${dotPath(hammer, 0.42, '#5A4012', ' stroke-opacity=".7"')}</g>`;
    L.under = under;
    L.fill(blob(B[0] + 0.5, B[1] + 0.5, BR - 6.4, rand, 14, 0.06), MAGENTA, { stray: 0.5, reach: 1.5 });
    L.pour(blob(B[0] - 2, B[1] - 2.5, 9, rand, 9, 0.2), '#E0509C', 3.4, true);
    L.pour(blob(B[0] - 3, B[1] - 3, 3.4, rand, 7, 0.2), '#EC78B4', 2.6, true);
    // spilt: a tongue of magenta toward the pattern, a pinch of saffron and of teal on the stone
    L.fill(blob(B[0] - 33, B[1] - 6, 5.2, rand, 9, 0.3), MAGENTA, { stray: 0.7, reach: 3.4 });
    L.fill(blob(B[0] - 41, B[1] - 13, 2.4, rand, 7, 0.3), MAGENTA, { stray: 0.6, reach: 2.6 });
    L.fill(blob(B[0] - 22, B[1] + 14, 4.4, rand, 8, 0.3), SAFFRON, { stray: 0.7, reach: 3 });
    L.fill(blob(40, 30, 5, rand, 8, 0.3), TEAL, { stray: 0.7, reach: 3.2 });
    L.fill(blob(318, 232, 3.2, rand, 8, 0.3), MARIGOLD, { stray: 0.7, reach: 3 });
    L.fill(blob(22, 296, 3.4, rand, 8, 0.3), CRIMSON, { stray: 0.7, reach: 3 });

    // loose petals on the stone: marigold florets and a few rose petals
    let top = '', shadows = '';
    const pr = rng(1414);
    const spots = [];
    for (let i = 0; i < 400 && spots.length < 30; i++) {
        const x = 8 + pr() * 344, y = 100 + pr() * 344, d = Math.hypot(x - C[0], y - C[1]);
        if (d < 126 || (d > 196 && d < 246) || Math.hypot(x - B[0], y - B[1]) < BR + 44) continue;
        if (LAMPS.some(l => Math.hypot(x - l.x, y - l.y) < 20)) continue;
        if (spots.some(s => Math.hypot(x - s[0], y - s[1]) < 18)) continue;
        spots.push([x, y]);
    }
    spots.forEach(([x, y], i) => {
        const rose = i % 4 === 3;
        const a = pr() * 360, c = [x, y];
        const p = rose ? petal(-3.4, 3.6, a, 3.3 + pr(), ROUND, pr, { c, jit: 0.3, n: 5 }) : petal(-3.6, 3.8, a, 1.5 + pr() * 0.7, LEAF, pr, { c, jit: 0.25, n: 5, swirl: (pr() - 0.5) * 60 });
        const col = rose ? ['#B81E44', '#D03660', '#A01838'][i % 3] : ['#F0841A', '#F6B51C', '#E46A17', '#F9A72B'][i % 4];
        shadows += U(pathU(p.map(([px, py]) => [px + 0.9, py + 1.3])), '');
        top += U(pathU(p), `fill="${col}"`);
        if (rose) top += U(pathU(blob(...p.axis(0.14), 1.5, pr, 6, 0.25)), 'fill="#7E1230" fill-opacity=".6"') + U(pathU([p[2], p[3], p[4]], false), 'fill="none" stroke="#E8708E" stroke-width="5" stroke-opacity=".6" stroke-linecap="round"');
        else top += U(pathU([p.axis(0.15), p.axis(0.5), p.axis(0.85)], false), 'fill="none" stroke="#B8500E" stroke-width="5" stroke-opacity=".7" stroke-linecap="round"');
    });
    // the lamps
    let lampShadow = '', lamps = '';
    for (const l of LAMPS) {
        const d = lamp(l.x, l.y, l.R, l.rot, rand);
        lampShadow += d.shadow; lamps += d.s; l.wick = d.wick;
    }
    L.defs = SOFT('s', 2.4) + SOFT('t', 0.8);
    L.top = `<g filter="url(#t)" fill="#070303" fill-opacity=".6">${shadows}</g>${top}<g filter="url(#s)" fill="#070303" fill-opacity=".62">${lampShadow}</g>${lamps}`;
    L.render();
}

/* ---------- Flames: a small teardrop over each wick, a warm pool of light on the powder around the lamp ---------- */
function flame(l, i, rand) {
    const [x, y] = l.wick, id = `g${i}`;
    const tilt = (rand() - 0.5) * 22, h = 15 + rand() * 3, w = 4.3 + rand() * 0.7;
    const tear = (k, col) => `<path d="M0 ${f(-h * k)}C${f(w * 0.5 * k)} ${f(-h * 0.55 * k)} ${f(w * k)} ${f(-h * 0.2 * k)} ${f(w * k)} ${f(h * 0.08 * k)}C${f(w * k)} ${f(h * 0.3 * k)} ${f(-w * k)} ${f(h * 0.3 * k)} ${f(-w * k)} ${f(h * 0.08 * k)}C${f(-w * k)} ${f(-h * 0.2 * k)} ${f(-w * 0.5 * k)} ${f(-h * 0.55 * k)} 0 ${f(-h * k)}z" fill="${col}"/>`;
    const defs = `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(l.x)}" cy="${f(l.y)}" r="50"><stop offset="0" stop-color="#FFC06A" stop-opacity=".5"/><stop offset=".25" stop-color="#FF9A40" stop-opacity=".4"/><stop offset=".58" stop-color="#E8641E" stop-opacity=".17"/><stop offset="1" stop-color="#C8401A" stop-opacity="0"/></radialGradient>`;
    // lit grains: the powder nearest the lamp catches the light grain by grain
    const lit = [];
    for (let k = 0; k < 170; k++) { const a = rand() * 6.283, q = 8 + 30 * Math.pow(rand(), 1.5); lit.push([l.x + q * Math.cos(a), l.y + q * Math.sin(a)]); }
    let s = `<circle cx="${f(l.x)}" cy="${f(l.y)}" r="50" fill="url(#${id})"/>`;
    s += `<g transform="scale(.5)">${dotPath(lit, 0.4, '#FFD48A', ' stroke-opacity=".5"')}</g>`;
    s += `<circle cx="${f(x)}" cy="${f(y - 3)}" r="9.5" fill="#FF9A2E" fill-opacity=".6" filter="url(#b)"/>`;
    s += `<g transform="translate(${f(x)} ${f(y - 2.5)}) rotate(${f(tilt)})">${tear(1, '#FF8A1C')}${tear(0.72, '#FFC640')}<g transform="translate(0 ${f(h * 0.06)})">${tear(0.4, '#FFF6D2')}</g></g>`;
    return { defs, s };
}
{
    const rand = rng(1515);
    const soft = `<filter id="b" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4"/></filter>`;
    for (let i = 0; i < 6; i++) {
        const l = LAMPS[i], d = flame(l, i, rand);
        write(`flame-${i + 1}`, [l.x - 52, l.y - 52, 104, 104], `<defs>${soft}${d.defs}</defs>${d.s}`);
    }
    for (const [n, a, b] of [[7, 6, 7], [8, 8, 9]]) {
        const d1 = flame(LAMPS[a], a, rand), d2 = flame(LAMPS[b], b, rand);
        write(`flame-${n}`, [0, 0, W, H], `<defs>${soft}${d1.defs}${d2.defs}</defs>${d1.s}${d2.s}`);
    }
}

/* ---------- Dusk and light ---------- */
write('dusk', [0, 0, W, H], `<rect width="${W}" height="${H}" fill="#C8BFD8"/>`);
write('glow', [0, 0, W, H], `<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${C[0]}" cy="${C[1]}" r="190"><stop offset="0" stop-color="#FFB85C" stop-opacity=".5"/><stop offset=".4" stop-color="#F0782A" stop-opacity=".24"/><stop offset="1" stop-color="#A0301A" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`);

/* ---------- A puff of powder: grains thrown up as the garland comes off ---------- */
{
    const rand = rng(1616);
    const R = 150, sets = [[SAFFRON, []], [MARIGOLD, []], [MAGENTA, []], [FLOUR, []]];
    for (let i = 0; i < 2600; i++) {
        const a = rand() * 6.283, clump = 0.6 + 0.4 * Math.sin(a * 5 + 1) * Math.sin(a * 3);
        const q = 84 + (rand() + rand() + rand() - 1.5) * 44 * clump + 12;
        if (q > R - 2 || q < 30) continue;
        sets[Math.floor(Math.pow(rand(), 1.4) * 4)][1].push([C[0] + q * Math.cos(a), C[1] + q * Math.sin(a)]);
    }
    let s = '';
    for (const [col, pts] of sets) s += dotPath(pts.filter((_, i) => i % 3), 0.42, col, ' stroke-opacity=".85"') + dotPath(pts.filter((_, i) => i % 3 === 0), 0.7, col, ' stroke-opacity=".6"');
    write('dust', ringBox(R), `<defs>${SOFT('s', 9)}</defs><circle cx="${C[0]}" cy="${C[1]}" r="96" fill="none" stroke="#F29A3C" stroke-opacity=".3" stroke-width="46" filter="url(#s)"/><g transform="scale(.5)">${s}</g>`);
}

/* ---------- The petals that fly: a marigold floret, a rose petal ---------- */
{
    const rand = rng(1717);
    const c = [0, 0];
    const a = petal(-5, 5.4, 90, 2.3, LEAF, rand, { c, jit: 0.2, n: 5, swirl: 24 });
    write('petal-a', [C[0] - 7, C[1] - 5, 14, 10], `<g transform="translate(${C[0]} ${C[1]})">${U(pathU(a), 'fill="#F6A21C"')}${U(pathU([a.axis(0.1), a.axis(0.5), a.axis(0.9)], false), 'fill="none" stroke="#C2560E" stroke-width="6" stroke-opacity=".7" stroke-linecap="round"')}</g>`);
    const b = petal(-4.4, 4.8, 80, 4.2, ROUND, rand, { c, jit: 0.3, n: 5 });
    write('petal-b', [C[0] - 7, C[1] - 6, 14, 12], `<g transform="translate(${C[0]} ${C[1]})">${U(pathU(b), 'fill="#C62A56"')}${U(pathU(blob(...b.axis(0.14), 1.7, rand, 6, 0.25)), 'fill="#7E1230" fill-opacity=".6"')}${U(pathU([b[2], b[3], b[4]], false), 'fill="none" stroke="#E8708E" stroke-width="6" stroke-opacity=".6" stroke-linecap="round"')}</g>`);
}

/* ---------- The floor: stone slabs laid a little askew, worn, with old powder in the grain ---------- */
{
    const rand = rng(1818);
    const box = [0, 0, W, H];
    const TILT = (-8.5 * Math.PI) / 180, ca = Math.cos(TILT), sa = Math.sin(TILT);
    const turn = ([x, y]) => [C[0] + x * ca - y * sa, C[1] + x * sa + y * ca];
    const tones = ['#5C4C42', '#53463D', '#655447', '#4E423A', '#6A584A', '#58493E', '#604F45'];
    let slabs = '', lips = '';
    for (let y = -330; y < 330;) {
        const h = 56 + rand() * 26;
        for (let x = -340 - rand() * 80; x < 340;) {
            const w = 66 + rand() * 62, g = 0.8 + rand() * 0.7;
            const j = () => (rand() - 0.5) * 1.3;
            const q = [[x + g + j(), y + g + j()], [x + w - g + j(), y + g + j()], [x + w - g + j(), y + h - g + j()], [x + g + j(), y + h - g + j()]].map(turn);
            if (q.some(([px, py]) => px > -70 && px < W + 70 && py > -70 && py < H + 70)) {
                slabs += `<polygon points="${q.map(p => `${f(p[0])},${f(p[1])}`).join(' ')}" fill="${tones[Math.floor(rand() * tones.length)]}"/>`;
                // the worn lip along the top and left edge catches what light is left
                lips += `<polyline points="${[q[3], q[0], q[1]].map(p => `${f(p[0] + 0.8)},${f(p[1] + 0.8)}`).join(' ')}"/>`;
            }
            x += w;
        }
        y += h;
    }
    let s = `<rect width="${W}" height="${H}" fill="${JOINT}"/>${slabs}`;
    s += `<g fill="none" stroke="#7A6656" stroke-opacity=".22" stroke-width="1.1" stroke-linejoin="round">${lips}</g>`;
    // stains and worn patches
    let stains = '';
    for (let i = 0; i < 34; i++) {
        const x = rand() * W, y = rand() * H, dark = rand() < 0.55;
        stains += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(14 + rand() * 34)}" ry="${f(10 + rand() * 24)}" fill="${dark ? '#120C0A' : '#8A7462'}" fill-opacity="${dark ? f2(0.16 + rand() * 0.16) : f2(0.06 + rand() * 0.08)}" transform="rotate(${Math.round(rand() * 180)} ${f(x)} ${f(y)})"/>`;
    }
    // old powder trodden into the stone around where the pattern is made
    for (const [col, a, r, op] of [[SAFFRON, 40, 150, 0.1], [MAGENTA, 200, 160, 0.1], [TEAL, 290, 150, 0.09], [MARIGOLD, 120, 140, 0.08], [CRIMSON, 340, 100, 0.08], [SAFFRON, 240, 60, 0.08]]) {
        const [x, y] = P(r, a);
        stains += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="60" ry="46" fill="${col}" fill-opacity="${op}"/>`;
    }
    s += `<g filter="url(#s)">${stains}</g>`;
    // grain of the stone: pits and pale specks, and a few larger pocks
    s += `<g transform="scale(.5)">${hatch(box, 2.1, 2.2, 0.42, '#150F0D', rand, ' stroke-opacity=".5"', 21)}${hatch(box, 2.5, 2.9, 0.4, '#9C8674', rand, ' stroke-opacity=".36"', -63)}${hatch(box, 9, 12, 0.95, '#120C0A', rand, ' stroke-opacity=".42"', 48)}${hatch(box, 12, 15, 0.7, '#A8927E', rand, ' stroke-opacity=".32"', -17)}</g>`;
    // cracks
    for (let i = 0; i < 4; i++) {
        let x = rand() * W, y = rand() * H, a = rand() * 6.283;
        const pts = [[x, y]];
        for (let k = 0; k < 9; k++) { a += (rand() - 0.5) * 1.1; x += Math.cos(a) * (5 + rand() * 8); y += Math.sin(a) * (5 + rand() * 8); pts.push([x, y]); }
        s += `<polyline points="${pts.map(p => `${f(p[0])},${f(p[1])}`).join(' ')}" fill="none" stroke="#0E0907" stroke-opacity=".7" stroke-width="${f2(0.5 + rand() * 0.5)}" stroke-linejoin="round"/>`;
    }
    // the guide: dots of rice flour set out on rings before any colour is poured, and two faint circles
    const guide = [], fine = [];
    for (const [r, n, off] of [[130, 24, 0], [150, 24, 7.5], [171, 32, 0], [192, 32, 5.6]]) for (let k = 0; k < n; k++) {
        const [x, y] = P(r + (rand() - 0.5) * 1.6, (k * 360) / n + off + (rand() - 0.5) * 1.4);
        guide.push([x, y]);
        for (let i = 0; i < 7; i++) fine.push([x + (rand() + rand() - 1) * 2.6, y + (rand() + rand() - 1) * 2.6]);
    }
    s += `<g transform="scale(.5)">${dotPath(guide, 1.25, FLOUR, ' stroke-opacity=".8"')}${dotPath(fine, 0.34, FLOUR, ' stroke-opacity=".6"')}`;
    s += `<circle cx="${C[0] * 2}" cy="${C[1] * 2}" r="${120 * 2}" fill="none" stroke="${FLOUR}" stroke-opacity=".42" stroke-width="2" stroke-linecap="round" stroke-dasharray="${blobDash(4, 2.5, rand)}"/>`;
    s += `<circle cx="${C[0] * 2}" cy="${C[1] * 2}" r="${203 * 2}" fill="none" stroke="${FLOUR}" stroke-opacity=".42" stroke-width="2" stroke-linecap="round" stroke-dasharray="${blobDash(4, 2.5, rand)}"/></g>`;
    // the light fails toward the corners
    s += `<rect width="${W}" height="${H}" fill="url(#v)"/>`;
    write('floor', box, `<defs>${SOFT('s', 8)}<radialGradient id="v" gradientUnits="userSpaceOnUse" cx="${C[0]}" cy="${C[1]}" r="330"><stop offset=".45" stop-color="#050203" stop-opacity="0"/><stop offset="1" stop-color="#050203" stop-opacity=".4"/></radialGradient></defs>${s}`);
}

/* ---------- Report ---------- */
for (const name of Object.keys(BOX)) SIZES[name] = statSync(join(OUT, `${name}.svg`)).size;
const big = Object.entries(SIZES).filter(([, v]) => v > 59.5 * 1024);
console.log(Object.entries(SIZES).map(([k, v]) => `${k} ${(v / 1024).toFixed(1)}k`).join('  '));
console.log(JSON.stringify(BOX));
console.log('lamps', JSON.stringify(LAMPS.map(l => [Math.round(l.x), Math.round(l.y)])));
if (big.length) { console.error('TOO BIG:', big); process.exit(1); }
