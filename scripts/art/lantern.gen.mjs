// Generator for the "lantern" wrapper art (Mid-Autumn: a pleated paper lantern under the full moon).
// Technique: translucent backlit paper. Nothing is shaded as a solid: every sheet of paper is a flat
// translucent shape, and tone comes only from how many sheets the light crosses — one sheet glows,
// two are darker, three darker still. The lantern's pleats are separate translucent bands that really
// overlap at the folds; ribs and bamboo leaves show as soft shadows cast on the paper from behind;
// the flame is a warm falloff seen through it; paper fibres fleck everything.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/lantern.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'lantern');
if (!OUT.endsWith('wrappers/lantern')) throw new Error('out dir must be public/wrappers/lantern');
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
const f = n => String(Math.round(n * 10) / 10);
const rad = d => (d * Math.PI) / 180;
const pts = a => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

const SIZES = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    if (s.length > 58000) throw new Error(`${name}.svg is ${s.length} bytes`);
    SIZES[name] = s.length;
    writeFileSync(join(OUT, `${name}.svg`), s);
}
const blurDef = (id, sd, box) =>
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${f(box[0])}" y="${f(box[1])}" width="${f(box[2])}" height="${f(box[3])}"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const stops = list => list.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const radialU = (id, cx, cy, r, list) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`;
const radialB = (id, list) => `<radialGradient id="${id}">${stops(list)}</radialGradient>`;
const linearU = (id, x1, y1, x2, y2, list) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;

/* ---------- geometry (canvas units). Must match src/wrappers/lantern.ts ---------- */
const W = 360, HH = 450;
const FULL = [-8, -8, 376, 466];
const MOON = [240, 104], MOON_R = 43;
const CX = 180, TOP = 182, N = 6, BH = 24, OV = 3.5; // lantern body: six pleats, each BH tall, overlapping OV at the folds
const BOT = TOP + N * BH; // 326
const FLAME = [CX, 266];
const yOf = k => TOP + k * BH;
/** Half-width of the body at a valley fold (k = 0..N) and at a mountain fold (middle of band k). */
const valley = k => 40 + 24 * Math.pow(Math.sin(Math.PI * (0.09 + 0.82 * (k / N))), 0.9);
const mountain = k => (valley(k) + valley(k + 1)) / 2 + 4.5;
/** Folded, every pleat is pressed to one width (PACK) and FOLDED of its height: the flat pack between the boards. */
const PACK = 66, FOLDED = 0.2;
/** Half-width anywhere on the open body. */
function halfAt(y) {
    const u = (y - TOP) / BH, k = Math.max(0, Math.min(N - 1, Math.floor(u))), t = u - k;
    return t < 0.5 ? valley(k) + (mountain(k) - valley(k)) * (t / 0.5) : mountain(k) + (valley(k + 1) - mountain(k)) * ((t - 0.5) / 0.5);
}
function silhouette(inset = 0) {
    const r = [], l = [];
    for (let k = 0; k < N; k++) {
        r.push([CX + valley(k) - inset, yOf(k)], [CX + mountain(k) - inset, yOf(k) + BH / 2]);
        l.push([CX - valley(k) + inset, yOf(k)], [CX - mountain(k) + inset, yOf(k) + BH / 2]);
    }
    r.push([CX + valley(N) - inset, BOT]);
    l.push([CX - valley(N) + inset, BOT]);
    return [...r, ...l.reverse()];
}

/* ---------- palette: amber and moon yellow on a wine-brown night ---------- */
const C = {
    night0: '#12060A', night1: '#210B11', night2: '#39151D', night3: '#63302E', night4: '#180809',
    sheet: '#8E4A4E', star: '#F4E3C8',
    moon: '#EBDDA8', moonEdge: '#D6C283', mare: '#B79C5E',
    leaf: '#0D0406', leafFar: '#2C1217', leafLit: '#FFB255',
    paperUp: '#C2662F', paperDn: '#A54E20', paperEdge: '#863816', shadow: '#431407', crease: '#F2D2A0',
    cap: '#1B0A0C', capLine: '#6A3430', tassel: '#A8361F',
    amber: '#FFA63D', small: '#FF9A3A', smallDark: '#633038', line: '#7E474C',
};

/** A bamboo leaf from its base, pointing at `ang` degrees (0 = right, 90 = down). */
function leaf(x, y, ang, len, wid) {
    const c = Math.cos(rad(ang)), s = Math.sin(rad(ang));
    const P = (u, v) => `${f(x + u * c - v * s)} ${f(y + u * s + v * c)}`;
    return `M${P(0, 0)}C${P(len * 0.22, -wid)} ${P(len * 0.62, -wid * 0.85)} ${P(len, 0)}C${P(len * 0.66, wid * 0.6)} ${P(len * 0.25, wid * 0.9)} ${P(0, 0)}Z`;
}
/** A twig with leaf clusters: returns { twig: path d, leaves: path d }. */
function spray(rnd, x0, y0, x1, y1, bend, opt = {}) {
    const mx = (x0 + x1) / 2 + bend[0], my = (y0 + y1) / 2 + bend[1];
    const at = t => [(1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * mx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * my + t * t * y1];
    const twig = `M${f(x0)} ${f(y0)}Q${f(mx)} ${f(my)} ${f(x1)} ${f(y1)}`;
    let leaves = '';
    const n = opt.n ?? 5, droop = opt.droop ?? 78, len = opt.len ?? 30, from = opt.from ?? 0.3;
    for (let i = 0; i < n; i++) {
        const t = from + ((1 - from) * i) / (n - 1);
        const [x, y] = at(t);
        const k = i === n - 1 ? 4 : 2 + Math.floor(rnd() * 2);
        for (let j = 0; j < k; j++) {
            const a = droop + (j - (k - 1) / 2) * (24 + rnd() * 8) + (rnd() - 0.5) * 14;
            const L = len * (0.7 + rnd() * 0.55);
            leaves += leaf(x, y, a, L, L * (0.115 + rnd() * 0.04));
        }
    }
    return { twig, leaves };
}

/* ---------- the bamboo: one description, drawn dark, drawn lit ---------- */
const bam = (() => {
    const rnd = rng(4107);
    const near = { twigs: '', leaves: '', culms: '' }, far = { twigs: '', leaves: '', culms: '' };
    const add = (o, s) => { o.twigs += s.twig; o.leaves += s.leaves; };
    // the branch the lantern hangs from: in from the left, across the foot of the moon
    add(near, spray(rnd, -12, 118, 190, 170, [10, -22], { n: 6, droop: 62, len: 30, from: 0.2 }));
    add(near, spray(rnd, 190, 170, 226, 186, [4, -3], { n: 2, droop: 40, len: 24, from: 0.6 }));
    // upper corners
    add(near, spray(rnd, 372, 22, 292, 96, [-6, -16], { n: 5, droop: 112, len: 34 }));
    add(near, spray(rnd, -12, 30, 62, 84, [8, -14], { n: 4, droop: 70, len: 32 }));
    add(near, spray(rnd, 372, 150, 312, 214, [-4, -14], { n: 4, droop: 118, len: 30 }));
    // lower sides
    add(near, spray(rnd, 14, 262, 78, 312, [8, -14], { n: 4, droop: 64, len: 30 }));
    add(near, spray(rnd, 348, 296, 290, 344, [-6, -14], { n: 4, droop: 116, len: 28 }));
    add(far, spray(rnd, -12, 66, 96, 128, [6, -18], { n: 5, droop: 74, len: 26 }));
    add(far, spray(rnd, 372, 84, 268, 150, [-8, -20], { n: 5, droop: 108, len: 26 }));
    add(far, spray(rnd, 40, 200, 104, 250, [8, -12], { n: 4, droop: 70, len: 24 }));
    add(far, spray(rnd, 322, 236, 262, 284, [-8, -12], { n: 4, droop: 112, len: 24 }));
    add(far, spray(rnd, 50, 330, 120, 372, [8, -12], { n: 4, droop: 68, len: 24 }));
    add(far, spray(rnd, 318, 356, 250, 392, [-8, -10], { n: 4, droop: 110, len: 22 }));
    // culms: jointed canes leaning out of the frame
    const culm = (o, xb, xt, w, seg, seed) => {
        const r = rng(seed);
        let y = 470;
        while (y > -20) {
            const h = seg * (0.85 + r() * 0.3), y2 = y - h;
            const xa = xb + ((xt - xb) * (470 - y)) / 490, xc = xb + ((xt - xb) * (470 - y2)) / 490;
            o.culms += `M${f(xa - w / 2)} ${f(y)}L${f(xc - w / 2 + 0.3)} ${f(y2 + 1.6)}L${f(xc + w / 2 - 0.3)} ${f(y2 + 1.6)}L${f(xa + w / 2)} ${f(y)}Z`;
            y = y2;
        }
    };
    culm(near, 20, 4, 10, 58, 11);
    culm(near, 344, 356, 9, 62, 12);
    culm(far, 50, 38, 5.5, 46, 13);
    culm(far, 318, 328, 5, 50, 14);
    culm(far, 78, 70, 3.4, 40, 15);
    return { near, far };
})();

/* ---------- small lanterns in the distance ---------- */
/** [x, y, r, group] — group a = nearest/largest, c = farthest. Strings carry hung ones; the rest float. */
const KINDS = ['round', 'long', 'drum'];
const TALL = { round: 1.02, long: 1.75, drum: 0.86 };
const strings = [];
const smalls = [];
const threads = [];
(() => {
    const rnd = rng(907);
    const hang = (g, x0, y0, x1, y1, sag, ts, r) => {
        strings.push([g, x0, y0, x1, y1, sag]);
        for (const t of ts) {
            const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + sag * 4 * t * (1 - t);
            const kind = KINDS[Math.floor(rnd() * 3)], rr = r * (0.74 + rnd() * 0.56);
            smalls.push([x, y + rr * TALL[kind] * 1.5 + 1, rr, g, true, kind]);
        }
    };
    hang('a', -24, 196, 118, 250, 20, [0.3, 0.56, 0.82], 7.2);
    hang('a', 246, 246, 384, 190, 20, [0.2, 0.46, 0.72], 7.2);
    hang('b', -12, 262, 150, 292, 16, [0.16, 0.34, 0.52, 0.7, 0.88], 4.6);
    hang('b', 212, 296, 372, 256, 16, [0.12, 0.3, 0.48, 0.66, 0.84], 4.6);
    hang('b', 36, 318, 330, 322, 20, [0.07, 0.19, 0.31, 0.69, 0.81, 0.93], 3.9);
    hang('c', -10, 346, 190, 352, 9, [0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92], 2.5);
    hang('c', 170, 356, 372, 340, 9, [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94], 2.5);
    hang('c', 20, 372, 340, 376, 8, [0.05, 0.14, 0.23, 0.32, 0.41, 0.5, 0.59, 0.68, 0.77, 0.86, 0.95], 2);
    // two nearer ones on threads from the bamboo
    for (const [x, y, r, y0] of [[92, 304, 10.5, 244], [284, 296, 9.5, 266]]) {
        for (let i = smalls.length - 1; i >= 0; i--) if (Math.abs(smalls[i][0] - x) < r + smalls[i][2] + 5 && Math.abs(smalls[i][1] - y) < (r + smalls[i][2]) * 1.9 + 6) smalls.splice(i, 1);
        threads.push([x, y0, y - r * 1.3]);
        smalls.push([x, y, r, 'a', true, x < 180 ? 'round' : 'long']);
    }
    // floating ones, up in the sky around the moon
    for (const [x, y, r, g] of [
        [52, 176, 6.4, 'a'], [308, 158, 6.8, 'a'],  [270, 214, 4.2, 'b'], [94, 222, 3.8, 'b'], [36, 232, 3.2, 'b'], [330, 226, 3.4, 'b'],
        [112, 150, 3, 'b'], [262, 126, 3.2, 'b'], [292, 92, 2.4, 'c'], [76, 112, 2.2, 'c'], [322, 128, 2, 'c'], [40, 140, 1.9, 'c'],
        [248, 180, 2.2, 'c'], [126, 196, 2, 'c'], [240, 76, 1.7, 'c'], [130, 82, 1.6, 'c'], [20, 190, 2.1, 'c'], [346, 186, 2, 'c'],
    ]) if (Math.hypot(x - MOON[0], y - MOON[1]) > MOON_R + 12) smalls.push([x, y, r * (0.85 + rnd() * 0.4), g, false, KINDS[Math.floor(rnd() * 3)]]);
})();
/** Half-width of a small lantern of a kind at height u (0 top .. 1 bottom), as a fraction of r. */
const prof = (kind, u) => {
    const s = Math.pow(Math.sin(Math.PI * (0.08 + 0.84 * u)), 0.85);
    return kind === 'round' ? 0.4 + 0.6 * s : kind === 'long' ? 0.42 + 0.26 * s : 0.84 + 0.16 * s;
};
const barrel = (x, y, r, kind) => {
    const t = TALL[kind], a = prof(kind, 0), b = prof(kind, 0.25), c = prof(kind, 0.5);
    return pts([[x - r * a, y - r * t], [x + r * a, y - r * t], [x + r * b, y - r * t * 0.5], [x + r * c, y], [x + r * b, y + r * t * 0.5], [x + r * a, y + r * t], [x - r * a, y + r * t], [x - r * b, y + r * t * 0.5], [x - r * c, y], [x - r * b, y - r * t * 0.5]]);
};
/** A small pleated lantern as stacked sheets: [upper facets, lower facets, lap strips] as polygon point lists. */
function pleats(x, y, r, kind) {
    const tall = TALL[kind], n = (kind === 'long' ? 6 : kind === 'round' ? 4 : 3) + (r > 6 ? 1 : 0), h = (2 * tall * r) / n;
    const v = k => r * prof(kind, k / n);
    const up = [], dn = [], lap = [];
    for (let k = 0; k < n; k++) {
        const y0 = y - tall * r + k * h, m = (v(k) + v(k + 1)) / 2 + r * 0.08;
        up.push(pts([[x - v(k), y0], [x + v(k), y0], [x + m, y0 + h / 2], [x - m, y0 + h / 2]]));
        dn.push(pts([[x - m, y0 + h / 2], [x + m, y0 + h / 2], [x + v(k + 1), y0 + h], [x - v(k + 1), y0 + h]]));
        if (k > 0) lap.push(pts([[x - v(k) - r * 0.04, y0 - h * 0.13], [x + v(k) + r * 0.04, y0 - h * 0.13], [x + v(k) + r * 0.04, y0 + h * 0.13], [x - v(k) - r * 0.04, y0 + h * 0.13]]));
    }
    return { up, dn, lap, top: y - tall * r, bot: y + tall * r, w0: v(0), w1: v(n) };
}
const poly = (list, attrs) => `<path d="${list.map(p => 'M' + p.replace(/,/g, ' ').split(' ').reduce((a, v, i) => a + (i && i % 2 === 0 ? 'L' : i ? ' ' : '') + v, '') + 'Z').join('')}" ${attrs}/>`;
function smallLit([x, y, r, , , kind]) {
    if (r <= 2.8) return `<polygon points="${barrel(x, y, r, kind)}" fill="url(#lg)"/>`;
    const p = pleats(x, y, r, kind);
    // the light, then the paper over it: one sheet, a denser lower facet, two sheets at each lap
    let s = poly([...p.up, ...p.dn], 'fill="url(#lg)"');
    s += poly(p.dn, `fill="${C.paperDn}" fill-opacity="0.3"`) + poly(p.lap, `fill="${C.paperEdge}" fill-opacity="0.42"`);
    s += `<path d="M${f(x - p.w0 - r * 0.1)} ${f(p.top)}h${f(p.w0 * 2 + r * 0.2)}M${f(x - p.w1 - r * 0.1)} ${f(p.bot)}h${f(p.w1 * 2 + r * 0.2)}" stroke="${C.cap}" stroke-width="${f(Math.max(0.7, r * 0.2))}"/>`;
    s += `<path d="M${f(x)} ${f(p.bot + r * 0.1)}v${f(r * 1.5)}" stroke="${C.tassel}" stroke-width="${f(Math.max(0.6, r * 0.22))}" stroke-opacity="0.85"/>`;
    return s;
}
function smallDark([x, y, r, , , kind]) {
    if (r <= 2.8) return `<polygon points="${barrel(x, y, r, kind)}" fill="${C.smallDark}" fill-opacity="0.9"/>`;
    const p = pleats(x, y, r, kind);
    let s = poly([...p.up, ...p.dn], `fill="${C.smallDark}" fill-opacity="0.8"`) + poly(p.dn, `fill="${C.night0}" fill-opacity="0.14"`) + poly(p.lap, `fill="${C.night0}" fill-opacity="0.3"`);
    s += `<path d="M${f(x)} ${f(p.bot)}v${f(r * 1.5)}" stroke="${C.smallDark}" stroke-width="${f(Math.max(0.6, r * 0.22))}"/>`;
    return s;
}
const stringPath = ([, x0, y0, x1, y1, sag]) => `M${f(x0)} ${f(y0)}Q${f((x0 + x1) / 2)} ${f((y0 + y1) / 2 + sag * 2)} ${f(x1)} ${f(y1)}`;

/** Paper fibres: short pale hairs and dark specks inside a box. */
function fibres(rnd, [x, y, w, h], n, pale, dark, a = 0.22, scale = 1) {
    let p = '', d = '';
    for (let i = 0; i < n; i++) {
        const px = x + rnd() * w, py = y + rnd() * h, ang = rnd() * Math.PI, L = (1.5 + rnd() * 5.5) * scale;
        const s = `M${f(px)} ${f(py)}q${f(Math.cos(ang) * L * 0.5 + (rnd() - 0.5) * 2)} ${f(Math.sin(ang) * L * 0.5 + (rnd() - 0.5) * 2)} ${f(Math.cos(ang) * L)} ${f(Math.sin(ang) * L)}`;
        if (rnd() < 0.7) p += s; else d += s;
    }
    return `<path d="${p}" fill="none" stroke="${pale}" stroke-width="0.4" stroke-opacity="${a}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${dark}" stroke-width="0.5" stroke-opacity="${a * 1.2}" stroke-linecap="round"/>`;
}

/* ================= sky: night as layered sheets of dark paper, with the moon behind them ================= */
{
    const rnd = rng(31);
    let s = `<defs>${linearU('sk', 0, -8, 0, 458, [[0, C.night0], [0.28, C.night1], [0.55, C.night2], [0.78, C.night3], [0.9, '#3E171B'], [1, C.night4]])}`;
    s += radialU('mh', MOON[0], MOON[1], 130, [[0, '#E8C98A', 0.2], [0.4, '#B8704E', 0.1], [1, '#8E4A4E', 0]]);
    s += radialU('mo', MOON[0] + 6, MOON[1] - 6, MOON_R * 1.25, [[0, C.moon], [0.7, '#E2D197'], [1, C.moonEdge]]);
    s += `<clipPath id="mc"><circle cx="${MOON[0]}" cy="${MOON[1]}" r="${MOON_R}"/></clipPath>`;
    s += blurDef('b1', 1.1, FULL) + blurDef('b2', 2.2, FULL) + blurDef('b9', 8, FULL) + `</defs>`;
    s += `<rect x="-8" y="-8" width="376" height="466" fill="url(#sk)"/>`;
    // sheets of night paper: each a faint veil, darker bands where they do not reach
    for (let i = 0; i < 9; i++) {
        const y = -30 + i * 52 + rnd() * 20, tilt = (rnd() - 0.5) * 26;
        s += `<polygon points="${pts([[-20, y], [380, y + tilt], [380, y + tilt + 90 + rnd() * 60], [-20, y + 90 + rnd() * 60]])}" fill="${C.sheet}" fill-opacity="${f(0.035 + rnd() * 0.03)}"/>`;
    }
    s += `<rect x="-8" y="-8" width="376" height="466" fill="url(#mh)"/>`;
    // stars: a few, pale
    let st = '';
    for (let i = 0; i < 70; i++) {
        const x = rnd() * 376 - 8, y = rnd() * 300 - 8;
        if (Math.hypot(x - MOON[0], y - MOON[1]) < MOON_R + 22) continue;
        st += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.3 + rnd() * 0.55)}" fill="${C.star}" fill-opacity="${f(0.2 + rnd() * 0.5)}"/>`;
    }
    s += st;
    // the moon: a disc of paper with light behind it (the moonglow layer adds the brightness)
    s += `<circle cx="${MOON[0]}" cy="${MOON[1]}" r="${MOON_R + 4}" fill="#D9BE7A" fill-opacity="0.32" filter="url(#b9)"/>`;
    s += `<circle cx="${MOON[0]}" cy="${MOON[1]}" r="${MOON_R}" fill="url(#mo)"/>`;
    s += `<g clip-path="url(#mc)">`;
    // one lopsided mottling: a single thicker place in the paper
    s += `<g filter="url(#b2)" fill="${C.mare}" opacity="0.26">`;
    for (const [dx, dy, rx, ry, rot] of [[-13, -15, 18, 10, -22], [1, -5, 12, 8, 34], [-23, -3, 8, 11, 8], [9, 6, 6, 9, 50]]) {
        s += `<ellipse cx="${MOON[0] + dx}" cy="${MOON[1] + dy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${MOON[0] + dx} ${MOON[1] + dy})"/>`;
    }
    s += `</g>`;
    s += fibres(rnd, [MOON[0] - MOON_R, MOON[1] - MOON_R, MOON_R * 2, MOON_R * 2], 44, '#FFFFFF', '#B79C5E', 0.2, 0.4);
    s += `</g>`;
    // torn strips of thin cloud paper across the sky, clear of the moon
    const strip = (x, y, w, h, col, a) => {
        const r = rng(Math.round(x * 7 + y * 13));
        const top = [], bot = [];
        for (let i = 0; i <= 10; i++) {
            const u = i / 10, e = Math.sin(Math.PI * u);
            top.push([x + w * u, y - h * 0.5 * e * (0.7 + r() * 0.5)]);
            bot.push([x + w * u, y + h * 0.5 * e * (0.7 + r() * 0.5)]);
        }
        return `<polygon points="${pts([...top, ...bot.reverse()])}" fill="${col}" fill-opacity="${a}"/>`;
    };
    s += `<g filter="url(#b1)">`;
    s += strip(26, 92, 150, 8, '#A8665E', 0.16) + strip(-10, 70, 120, 6, '#A8665E', 0.12) + strip(60, 100, 90, 5, '#A8665E', 0.12);
    s += strip(-20, 196, 180, 12, '#A8665E', 0.1) + strip(214, 222, 190, 13, '#A8665E', 0.1) + strip(40, 286, 300, 16, '#B8705E', 0.1) + strip(-30, 330, 250, 14, '#C27A5E', 0.09);
    s += `</g>`;
    s += fibres(rnd, FULL, 220, '#F0D2C4', '#000000', 0.07, 0.6);
    svg('sky', FULL, s);
}

/* ================= moonglow (screen): the moon's own light; it eases back when the lantern takes over ================= */
const MGLOW = [MOON[0] - 140, MOON[1] - 140, 280, 280];
svg('moonglow', MGLOW, `<defs>${radialU('g', MOON[0], MOON[1], 140, [[0, '#FFE9A8', 0.36], [0.34, '#F3C97A', 0.15], [1, '#F3C97A', 0]])}${radialU('d', MOON[0] + 6, MOON[1] - 6, MOON_R * 1.2, [[0, '#8A7440'], [1, '#6A5226']])}</defs><rect x="${MGLOW[0]}" y="${MGLOW[1]}" width="280" height="280" fill="url(#g)"/><circle cx="${MOON[0]}" cy="${MOON[1]}" r="${MOON_R - 0.3}" fill="url(#d)"/>`);

/* ================= far: ridges of dark paper, the strings, the small lanterns still unlit ================= */
{
    const rnd = rng(77);
    let s = `<defs>${blurDef('b', 1, FULL)}</defs>`;
    const ridge = (y0, amp, col, a, seed) => {
        const r = rng(seed);
        const p = [[-10, 460]];
        let y = y0;
        for (let x = -10; x <= 372; x += 14) { y += (r() - 0.5) * amp; y = Math.max(y0 - amp * 1.6, Math.min(y0 + amp * 1.6, y)); p.push([x, y]); }
        p.push([372, 460]);
        return `<polygon points="${pts(p)}" fill="${col}" fill-opacity="${a}"/>`;
    };
    s += ridge(352, 9, '#3F1A20', 0.72, 1) + ridge(372, 8, '#2D1016', 0.8, 2) + ridge(396, 7, '#1B090D', 0.9, 3) + ridge(424, 6, '#0F0507', 0.95, 4);
    s += `<path d="${strings.map(stringPath).join('')}" fill="none" stroke="${C.line}" stroke-width="0.6" stroke-opacity="0.8"/>`;
    s += `<path d="${threads.map(([x, a, b]) => `M${f(x)} ${f(a)}V${f(b)}`).join('')}" fill="none" stroke="${C.line}" stroke-width="0.6" stroke-opacity="0.8"/>`;
    s += smalls.filter(q => q[4]).map(smallDark).join('');
    s += fibres(rnd, [-8, 340, 376, 118], 80, '#D9A89C', '#000000', 0.12);
    svg('far', FULL, s);
}

/* ================= far-a/b/c: the same small lanterns, lit ================= */
for (const g of ['a', 'b', 'c']) {
    const list = smalls.filter(q => q[3] === g);
    let s = `<defs>${radialB('h', [[0, C.amber, 0.7], [0.3, '#FF8A2E', 0.34], [1, '#FF7A22', 0]])}${radialB('lg', [[0, '#FFE39C'], [0.5, '#FFB850'], [1, '#F0822A']])}</defs>`;
    s += list.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * (g === 'c' ? 4.6 : 3.6))}" fill="url(#h)"/>`).join('');
    // the farther, the softer and dimmer
    const far = g === 'c' ? [0.9, 0.72] : g === 'b' ? [0.4, 0.88] : null;
    s += far ? `${blurDef('f', far[0], FULL)}<g filter="url(#f)" opacity="${far[1]}">${list.map(smallLit).join('')}</g>` : list.map(smallLit).join('');
    svg(`far-${g}`, FULL, s);
}

/* ================= bamboo: dark sheets in front of the sky ================= */
{
    let s = `<defs>${blurDef('b', 0.5, FULL)}</defs>`;
    s += `<g fill="${C.leafFar}" fill-opacity="0.86" filter="url(#b)"><path d="${bam.far.culms}"/><path d="${bam.far.leaves}"/><path d="${bam.far.twigs}" fill="none" stroke="${C.leafFar}" stroke-width="1"/></g>`;
    s += `<path d="${bam.near.culms}" fill="${C.leaf}"/><path d="${bam.near.twigs}" fill="none" stroke="${C.leaf}" stroke-width="1.7" stroke-linecap="round"/>`;
    // near leaves are slightly see-through, so where two cross the tone deepens
    s += `<path d="${bam.near.leaves}" fill="${C.leaf}" fill-opacity="0.86"/>`;
    svg('bamboo', FULL, s);
}
/* ================= bamboo-lit: the lantern's light caught in the leaves, falling off with distance ================= */
{
    let s = `<defs>${radialU('m', FLAME[0], FLAME[1] - 10, 215, [[0, '#FFFFFF', 1], [0.42, '#FFFFFF', 0.62], [0.78, '#FFFFFF', 0.2], [1, '#FFFFFF', 0]])}<mask id="k" maskUnits="userSpaceOnUse" x="-8" y="-8" width="376" height="466"><rect x="-8" y="-8" width="376" height="466" fill="url(#m)"/></mask></defs>`;
    s += `<g mask="url(#k)"><path d="${bam.far.leaves}${bam.far.culms}" fill="#B8552A" fill-opacity="0.34"/><path d="${bam.near.leaves}" fill="${C.leafLit}" fill-opacity="0.5"/><path d="${bam.near.culms}" fill="#D9772E" fill-opacity="0.42"/><path d="${bam.near.twigs}" fill="none" stroke="${C.leafLit}" stroke-width="0.8" stroke-opacity="0.6"/></g>`;
    svg('bamboo-lit', FULL, s);
}

/* ================= halo + wash (screen): the glow spreading into the air ================= */
const HALO = [CX - 175, FLAME[1] - 185, 350, 350];
svg('halo', HALO, `<defs>${radialB('g', [[0, '#FFB64F', 0.62], [0.3, '#FF9532', 0.36], [0.62, '#E0621E', 0.14], [1, '#C04A1A', 0]])}</defs><circle cx="${CX}" cy="${FLAME[1] - 10}" r="175" fill="url(#g)"/>`);
svg('wash', FULL, `<defs>${radialU('g', CX, 280, 330, [[0, '#B4562A', 0.4], [0.5, '#7E3322', 0.22], [1, '#4A1C18', 0]])}</defs><rect x="-8" y="-8" width="376" height="466" fill="url(#g)"/>`);

/* ================= the lantern ================= */
const BODY = [CX - 82, TOP - 8, 164, N * BH + 16];
const sil = pts(silhouette(0.4));

// hang: the thread and the top board
const board = (y, w) => `<rect x="${f(CX - w)}" y="${f(y)}" width="${f(w * 2)}" height="6.5" rx="1.1" fill="${C.cap}"/><path d="M${f(CX - w + 2)} ${f(y + 1.5)}h${f(w * 2 - 4)}" stroke="${C.capLine}" stroke-width="0.7" stroke-opacity="0.9"/>`;
{
    let s = `<path d="M${CX} 166V${TOP - 5}" stroke="#4A2226" stroke-width="0.9"/>`;
    s += `<path d="M${CX} ${TOP - 13}l-9 8M${CX} ${TOP - 13}l9 8" stroke="#4A2226" stroke-width="0.8" fill="none"/>`;
    s += board(TOP - 5.5, valley(0) + 3);
    svg('hang', [CX - 60, 160, 120, 28], s);
}
// tail: the bottom board and a tassel of paper strips (translucent, lapping)
const TAIL = [CX - 60, BOT - 3, 120, 62];
{
    let s = '';
    const rnd = rng(5);
    for (let i = 0; i < 7; i++) {
        const u = (i - 3) / 3, x = CX + u * 3.6, L = 34 + rnd() * 12, sp = u * 3.2 + (rnd() - 0.5) * 1.6;
        s += `<polygon points="${pts([[x - 1.1, BOT + 12], [x + 1.1, BOT + 12], [x + sp + 1.4, BOT + 12 + L], [x + sp - 1.4, BOT + 12 + L]])}" fill="${C.tassel}" fill-opacity="0.56"/>`;
    }
    s += `<path d="M${CX} ${BOT + 4}v6" stroke="#4A2226" stroke-width="0.9"/><rect x="${CX - 3.8}" y="${BOT + 9}" width="7.6" height="5" rx="1.4" fill="#742216"/>`;
    s += board(BOT - 1, valley(N) + 3);
    svg('tail', TAIL, s);
}
// tie: the paper sleeve and cord that keep the pack shut (drawn where the folded pack sits)
const PACK_BOT = TOP + N * BH * FOLDED;
const TIE = [CX - 70, TOP - 12, 140, 64];
{
    const rnd = rng(71);
    const x0 = CX - 37, x1 = CX + 37, y0 = TOP - 0.5, y1 = PACK_BOT + 0.5;
    let s = `<defs><clipPath id="c"><rect x="${x0}" y="${f(y0)}" width="${x1 - x0}" height="${f(y1 - y0)}"/></clipPath></defs>`;
    // the sleeve: a sheet of pale paper round the pack, see-through enough to show the pleats, doubled where it laps
    s += `<rect x="${x0}" y="${f(y0)}" width="${x1 - x0}" height="${f(y1 - y0)}" fill="#C9AD88" fill-opacity="0.82"/>`;
    s += `<g clip-path="url(#c)"><polygon points="${pts([[CX + 14, y0], [x1, y0], [x1, y1], [CX + 20, y1]])}" fill="#B89872" fill-opacity="0.42"/><rect x="${x0}" y="${f(y0)}" width="${x1 - x0}" height="2.2" fill="#FFF3DC" fill-opacity="0.3"/><rect x="${x0}" y="${f(y1 - 2.6)}" width="${x1 - x0}" height="2.6" fill="#7A5236" fill-opacity="0.3"/>${fibres(rnd, [x0, y0, x1 - x0, y1 - y0], 12, '#FFF6E4', '#7A5236', 0.2, 0.45)}</g>`;
    // the cord: twice round, top to bottom, with a flat knot and two ends
    const cy = (y0 + y1) / 2;
    s += `<path d="M${CX - 1.6} ${TOP - 6.5}V${f(PACK_BOT + 6.5)}M${CX + 1.6} ${TOP - 6.5}V${f(PACK_BOT + 6.5)}" stroke="#8E2A1C" stroke-width="1.3" fill="none"/>`;
    s += `<path d="M${CX + 2} ${f(cy + 2)}q5 8 5 19M${CX + 3} ${f(cy + 1)}q8 6 10 14" stroke="#8E2A1C" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    s += `<rect x="${CX - 4.5}" y="${f(cy - 3)}" width="9" height="6" rx="1.6" fill="#A8361F"/>`;
    svg('tie', TIE, s);
}
// fill: the light itself, behind the paper
svg('fill', BODY, `<defs>${radialU('g', FLAME[0], FLAME[1], 104, [[0, '#FFE29A'], [0.24, '#FFCB6A'], [0.54, '#FFAE46'], [0.82, '#F58A2E'], [1, '#DF6E22']])}</defs><polygon points="${sil}" fill="url(#g)"/>`);
// core (screen): the flame as a broad warm bloom diffused through the paper — no shape of its own
svg('core', BODY, `<defs>${blurDef('a', 15, [BODY[0] - 30, BODY[1] - 30, BODY[2] + 60, BODY[3] + 60])}<clipPath id="c"><polygon points="${sil}"/></clipPath></defs><g clip-path="url(#c)"><ellipse cx="${FLAME[0]}" cy="${FLAME[1]}" rx="44" ry="40" fill="#FFB850" fill-opacity="0.6" filter="url(#a)"/></g>`);
// warm (screen): the warm falloff of the flame laid over the paper
svg('warm', BODY, `<defs>${radialU('g', FLAME[0], FLAME[1], 100, [[0, '#FFB84A', 0.4], [0.5, '#FF9430', 0.28], [1, '#F0641A', 0.12]])}</defs><polygon points="${sil}" fill="url(#g)"/>`);

// the six pleats
const RIBS = [-0.9, -0.5, 0.12, 0.66, 0.97];
const SEAMS = [-0.7, 0.36];
// shadows of bamboo leaves falling on the paper (open-lantern coordinates)
const castLeaves = (() => {
    const r = rng(222);
    let d = '';
    for (const [x, y, n, a0] of [[122, 186, 4, 48], [152, 176, 3, 80], [226, 196, 3, 124], [112, 250, 3, 24], [236, 262, 2, 150]]) {
        for (let j = 0; j < n; j++) { const L = 38 + r() * 20; d += leaf(x, y, a0 + (j - (n - 1) / 2) * 26 + (r() - 0.5) * 10, L, L * 0.13); }
    }
    return d;
})();
for (let k = 0; k < N; k++) {
    const rnd = rng(600 + k);
    const y0 = yOf(k), ym = y0 + BH / 2, y1 = y0 + BH;
    const v0 = valley(k), m = mountain(k), v1 = valley(k + 1);
    // the band's sheet runs OV past each fold, where it laps its neighbour
    const e0 = v0 - (m - v0) * (OV / (BH / 2)), e1 = v1 - (m - v1) * (OV / (BH / 2));
    const box = [CX - 82, y0 - OV, 164, BH + 2 * OV];
    const up = [[CX - e0, y0 - OV], [CX + e0, y0 - OV], [CX + m, ym], [CX - m, ym]];
    const dn = [[CX - m, ym], [CX + m, ym], [CX + e1, y1 + OV], [CX - e1, y1 + OV]];
    const outline = [[CX - e0, y0 - OV], [CX + e0, y0 - OV], [CX + m, ym], [CX + e1, y1 + OV], [CX - e1, y1 + OV], [CX - m, ym]];
    const at = (sx, y) => { const t = (y - (y0 - OV)) / (ym - (y0 - OV)); const hw = y <= ym ? e0 + (m - e0) * t : m + (e1 - m) * ((y - ym) / (y1 + OV - ym)); return [CX + hw * sx, y]; };
    const col = (sx, w) => [at(sx, y0 - OV), at(sx + w, y0 - OV), at(sx + w, ym), at(sx + w, y1 + OV), at(sx, y1 + OV), at(sx, ym)];
    let s = `<defs><clipPath id="c"><polygon points="${pts(outline)}"/></clipPath>${blurDef('r', 1, box)}${blurDef('l', 1.7, box)}</defs><g clip-path="url(#c)">`;
    // two facets of one sheet: the lower facet a touch denser
    s += `<polygon points="${pts(up)}" fill="${C.paperUp}" fill-opacity="0.52"/><polygon points="${pts(dn)}" fill="${C.paperDn}" fill-opacity="0.62"/>`;
    // the glue flap along the lower fold: one more thickness
    s += `<polygon points="${pts([at(-1.05, y1 - OV), at(1.05, y1 - OV), at(1.05, y1 + OV), at(-1.05, y1 + OV)])}" fill="${C.paperEdge}" fill-opacity="0.3"/>`;
    // glued seams: a second thickness of paper
    for (const sx of SEAMS) s += `<polygon points="${pts(col(sx, 0.07))}" fill="${C.paperDn}" fill-opacity="0.34"/>`;
    // the paper thickens toward the turning edge
    s += `<polygon points="${pts(col(-1.02, 0.11))}" fill="${C.paperEdge}" fill-opacity="0.36"/><polygon points="${pts(col(0.91, 0.11))}" fill="${C.paperEdge}" fill-opacity="0.36"/>`;
    s += `<polygon points="${pts(col(-1.02, 0.05))}" fill="${C.paperEdge}" fill-opacity="0.3"/><polygon points="${pts(col(0.97, 0.05))}" fill="${C.paperEdge}" fill-opacity="0.3"/>`;
    // shadows cast from inside and behind: ribs, and bamboo leaves
    s += `<g filter="url(#r)" fill="none" stroke="${C.shadow}" stroke-opacity="0.38" stroke-width="2.3">${RIBS.map(sx => `<polyline points="${pts([at(sx, y0 - OV), at(sx, ym), at(sx, y1 + OV)])}"/>`).join('')}</g>`;
    s += `<path d="${castLeaves}" fill="${C.shadow}" fill-opacity="0.42" filter="url(#l)"/>`;
    // folds: the mountain fold catches light, the valley is a dark seam
    s += `<path d="M${f(CX - m)} ${f(ym)}H${f(CX + m)}" stroke="${C.crease}" stroke-width="0.7" stroke-opacity="0.5"/>`;
    s += `<path d="M${f(CX - v0)} ${f(y0)}H${f(CX + v0)}M${f(CX - v1)} ${f(y1)}H${f(CX + v1)}" stroke="${C.shadow}" stroke-width="0.6" stroke-opacity="0.34"/>`;
    s += fibres(rnd, box, 30, '#FFE9C4', '#4A1808', 0.2, 0.75);
    s += `</g>`;
    svg(`band-${k + 1}`, box, s);
}

/* ================= mote: one fleck of lit paper, scattered by the stage ================= */
svg('mote', [0, 0, 5, 5], `<defs>${radialB('g', [[0, '#FFF3C4', 1], [0.4, '#FFB64F', 0.8], [1, '#FF8A2E', 0]])}</defs><circle cx="2.5" cy="2.5" r="2.5" fill="url(#g)"/>`);

/* ================= fore: big soft leaves close to the eye ================= */
{
    const rnd = rng(88);
    let d = '';
    for (const [x, y, a0, n, L] of [[374, 196, 150, 4, 78], [-14, 318, 20, 4, 84], [372, 372, 196, 3, 70]]) {
        for (let j = 0; j < n; j++) { const len = L * (0.8 + rnd() * 0.4); d += leaf(x, y, a0 + (j - (n - 1) / 2) * 20 + (rnd() - 0.5) * 8, len, len * 0.13); }
    }
    svg('fore', [-20, -8, 400, 466], `<defs>${blurDef('b', 2.6, [-20, -8, 400, 466])}</defs><path d="${d}" fill="#090304" fill-opacity="0.9" filter="url(#b)"/>`);
}

console.log(Object.entries(SIZES).map(([k, v]) => `${k} ${(v / 1024).toFixed(1)}k`).join(' | '));
console.log(JSON.stringify({ TOP, BH, N, OV, BOT, BODY, TAIL, HALO, TIE, MGLOW, sx: Array.from({ length: N }, (_, k) => +(PACK / mountain(k)).toFixed(3)), capTop: +((PACK + 4) / (valley(0) + 3)).toFixed(3), capBot: +((PACK + 4) / (valley(N) + 3)).toFixed(3) }));
