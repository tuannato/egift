// Generator for the "pumpkin" wrapper art (Halloween: a shadow-puppet theatre).
// Technique: shadow puppetry. A stretched cloth screen lit from behind by one lamp; in front of the
// lamp, flat black puppets cut with a knife: no shading, no outlines, no gradients on the figures.
// Tone comes only from (1) the cloth and the lamp's uneven falloff, (2) pierced patterns in the
// puppets through which the light shows, (3) the penumbra of anything standing away from the cloth
// (a blurred, larger, greyer shadow round the sharp one), and gauze cut-outs for the far ground.
// Edges are polylines with a little jitter (a knife, not a plotter). Rods, pins and lacing are shown.
// Every SVG is written already passed through the allow-list (scripts/svg-allow.mjs).
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/pumpkin.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeSvg } from '../svg-allow.mjs';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'pumpkin');
if (!OUT.endsWith('wrappers/pumpkin')) throw new Error('out dir must be public/wrappers/pumpkin');
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

const SIZES = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    const { svg: s, problems } = sanitizeSvg(raw);
    if (s === undefined) throw new Error(`${name}.svg refused: ${problems.join('; ')}`);
    if (s.length > 58000) throw new Error(`${name}.svg is ${s.length} bytes`);
    SIZES[name] = s.length;
    writeFileSync(join(OUT, `${name}.svg`), s);
}
const FB = b => `filterUnits="userSpaceOnUse" x="${f(b[0])}" y="${f(b[1])}" width="${f(b[2])}" height="${f(b[3])}" color-interpolation-filters="sRGB"`;
const blurDef = (id, sd, box) => `<filter id="${id}" ${FB(box)}><feGaussianBlur stdDeviation="${sd}"/></filter>`;
/** The penumbra: the sharp shadow over a swollen, blurred, greyer one. */
const penDef = (id, box, grow = 1, sd = 3, a = 0.42) =>
    `<filter id="${id}" ${FB(box)}><feMorphology in="SourceAlpha" operator="dilate" radius="${grow}" result="d"/><feGaussianBlur in="d" stdDeviation="${sd}" result="b"/><feColorMatrix in="b" type="matrix" values="0 0 0 0 0.2 0 0 0 0 0.07 0 0 0 0 0.14 0 0 0 ${a} 0" result="p"/><feComposite in="SourceGraphic" in2="p" operator="over"/></filter>`;
const maskDef = (id, box, holes) =>
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="${f(box[0])}" y="${f(box[1])}" width="${f(box[2])}" height="${f(box[3])}"><rect x="${f(box[0])}" y="${f(box[1])}" width="${f(box[2])}" height="${f(box[3])}" fill="#fff"/><path d="${holes}" fill="#000"/></mask>`;
const stops = list => list.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const radialU = (id, cx, cy, r, list, tr = '') => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}"${tr ? ` gradientTransform="${tr}"` : ''}>${stops(list)}</radialGradient>`;
const linearU = (id, x1, y1, x2, y2, list) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;

/* ---------- the knife: every outline is traced into short straight cuts with a little wander ---------- */
function crPoint(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    const c = k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
    return [c(0), c(1)];
}
/** Points along a spline through P ([x, y] smooth, [x, y, 'c'] corner). */
function trace(P, rnd, { closed = true, step = 2.6, jit = 0.3 } = {}) {
    const n = P.length, out = [];
    const isC = p => p[2] === 'c';
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
        const p1 = P[i], p2 = P[(i + 1) % n];
        let p0 = P[(i - 1 + n) % n], p3 = P[(i + 2) % n];
        if (isC(p1) || (!closed && i === 0)) p0 = p1;
        if (isC(p2) || (!closed && i === n - 2)) p3 = p2;
        const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const k = Math.max(1, Math.round(len / step));
        for (let j = 0; j < k; j++) {
            const q = crPoint(p0, p1, p2, p3, j / k);
            const jj = j === 0 && isC(p1) ? jit * 0.3 : jit;
            out.push([q[0] + (rnd() - 0.5) * 2 * jj, q[1] + (rnd() - 0.5) * 2 * jj]);
        }
    }
    if (!closed) out.push([P[n - 1][0], P[n - 1][1]]);
    return out;
}
const dPoly = raw => {
    let a = 0;
    for (let i = 0; i < raw.length; i++) { const p = raw[i], q = raw[(i + 1) % raw.length]; a += p[0] * q[1] - q[0] * p[1]; }
    const pts = a < 0 ? [...raw].reverse() : raw;
    return 'M' + pts.map(([x, y], i) => `${i === 1 ? 'L' : ''}${f(x)} ${f(y)}`).join(' ') + 'Z';
};
const dLine = pts => 'M' + pts.map(([x, y], i) => `${i === 1 ? 'L' : ''}${f(x)} ${f(y)}`).join(' ');
/** A cut shape through points. */
const cut = (P, rnd, o) => dPoly(trace(P, rnd, o));
/** A straight-edged shape (every point a corner), its edges a little unsure. */
const hew = (P, rnd, jit = 0.25, step = 7) => dPoly(trace(P.map(p => [p[0], p[1], 'c']), rnd, { step, jit }));
/** A tapering band along a centre line: trunks, boughs, tails, legs. */
function band(line, w0, w1, rnd, jit = 0.22) {
    const n = line.length, L = [], Rr = [];
    for (let i = 0; i < n; i++) {
        const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
        const j = () => (rnd() - 0.5) * 2 * jit;
        L.push([line[i][0] - (dy / l) * w + j(), line[i][1] + (dx / l) * w + j()]);
        Rr.push([line[i][0] + (dy / l) * w + j(), line[i][1] - (dx / l) * w + j()]);
    }
    return dPoly([...L, ...Rr.reverse()]);
}
const limb = (way, w0, w1, rnd, step = 6) => band(trace(way, rnd, { closed: false, step, jit: 0.45 }), w0, w1, rnd);
/** Twigs that grow from a point: twisting, forking, tapering. */
function grow(x, y, ang, len, w, depth, rnd, out) {
    const n = Math.max(2, Math.round(len / 7));
    const line = [[x, y]];
    let a = ang, cx = x, cy = y, curl = (rnd() - 0.5) * 22;
    const kids = [];
    for (let i = 1; i <= n; i++) {
        a += curl + (rnd() - 0.5) * 30;
        if (rnd() < 0.34) curl = -curl * (0.6 + rnd() * 0.9);
        cx += (Math.cos(rad(a)) * len) / n;
        cy += (Math.sin(rad(a)) * len) / n;
        line.push([cx, cy]);
        if (depth > 0 && i >= Math.ceil(n * 0.3) && i < n && rnd() < 0.6) kids.push([cx, cy, a, i / n]);
    }
    out.push(band(line, w, Math.max(0.5, w * 0.2), rnd, 0.18));
    kids.forEach(([kx, ky, ka, t], i) => {
        const side = (i % 2 ? 1 : -1) * (rnd() < 0.85 ? 1 : -1);
        grow(kx, ky, ka + side * (30 + rnd() * 36), len * (1 - t * 0.45) * (0.42 + rnd() * 0.3), Math.max(0.7, w * (1 - t * 0.7) * 0.8), depth - 1, rnd, out);
    });
}
const ellipse = (cx, cy, rx, ry, rnd, jit = 0.3, step = 3) => {
    const n = Math.max(8, Math.round((Math.PI * (rx + ry)) / step)), pts = [];
    const ph = rnd() * 6.28;
    for (let i = 0; i < n; i++) {
        const t = ph + (i / n) * Math.PI * 2;
        pts.push([cx + Math.cos(t) * rx + (rnd() - 0.5) * 2 * jit, cy + Math.sin(t) * ry + (rnd() - 0.5) * 2 * jit]);
    }
    return dPoly(pts);
};
/** A slit between two points: the simplest pierced mark. */
function slit(a, b, w, rnd, bow = 0) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    return cut([[a[0], a[1], 'c'], [mx + nx * (w / 2 + bow), my + ny * (w / 2 + bow)], [b[0], b[1], 'c'], [mx - nx * (w / 2 - bow), my - ny * (w / 2 - bow)]], rnd, { step: 2, jit: 0.12 });
}
/** A hand-cut star: five uneven points. */
function star(cx, cy, r, rnd, rot = rnd() * 72) {
    const P = [];
    for (let k = 0; k < 10; k++) {
        const rr = (k % 2 ? r * (0.4 + rnd() * 0.08) : r * (0.86 + rnd() * 0.28));
        const t = rad(rot + k * 36 + (rnd() - 0.5) * 7);
        P.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
    }
    return hew(P, rnd, 0.1, 9);
}
/** A crescent: bulging toward `dir` degrees, horns `half` degrees either side. */
function crescent(cx, cy, r, thick, dir, half, rnd) {
    const P = [];
    const at = (a, rr = r) => [cx + Math.cos(rad(a)) * rr, cy + Math.sin(rad(a)) * rr];
    const h1 = at(dir - half), h2 = at(dir + half);
    P.push([h1[0], h1[1], 'c']);
    for (let i = 1; i < 8; i++) P.push(at(dir - half + (2 * half * i) / 8));
    P.push([h2[0], h2[1], 'c']);
    const mid = at(dir, r - thick), cxn = 2 * mid[0] - (h1[0] + h2[0]) / 2, cyn = 2 * mid[1] - (h1[1] + h2[1]) / 2;
    for (let i = 1; i < 6; i++) {
        const t = i / 6;
        P.push([(1 - t) * (1 - t) * h2[0] + 2 * t * (1 - t) * cxn + t * t * h1[0], (1 - t) * (1 - t) * h2[1] + 2 * t * (1 - t) * cyn + t * t * h1[1]]);
    }
    return cut(P, rnd, { step: 2.4, jit: 0.2 });
}
const lozenge = (cx, cy, w, h, rot, rnd) => {
    const c = Math.cos(rad(rot)), s = Math.sin(rad(rot));
    return hew([[0, -h / 2], [w / 2, 0], [0, h / 2], [-w / 2, 0]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]), rnd, 0.12, 9);
};
const dot = (cx, cy, r, rnd) => ellipse(cx, cy, r, r, rnd, 0.1, 1.4);

/* ---------- geometry (canvas units). Must match src/wrappers/pumpkin.ts ---------- */
const FULL = [-8, -8, 376, 466];
const PK = [108, 232]; // the pumpkin's centre
const CUTY = PK[1] - 34; // where the lid is cut from the body
const MOON = [226, 124], MOON_R = 30;
const GATE = { l: 122, m: 205, r: 288, ground: 408 };
/** The gauze hill's ridge. */
const RIDGE = [[-8, 328], [30, 314], [66, 294], [108, 284], [150, 291], [176, 316], [194, 350], [216, 354], [233, 320], [254, 284], [326, 282], [348, 279], [368, 284]];
const ridgeY = x => {
    for (let i = 1; i < RIDGE.length; i++) if (x <= RIDGE[i][0]) { const a = RIDGE[i - 1], b = RIDGE[i]; return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]); }
    return RIDGE[RIDGE.length - 1][1];
};

/* ---------- palette: burnt orange, amber, violet-black ---------- */
const C = {
    black: '#0B0509',
    pen: '#32121F',
    gauze: '#4E1F1A', far: '#5A2A26',
    cloth0: '#D69642', cloth1: '#A8661F', cloth2: '#7A4216', cloth3: '#46200F', corner: '#190915',
    thread: '#3A1808', slub: '#F0BE78',
    wood: '#2C1611', woodHi: '#5E3320', woodLo: '#130808', rim: '#D0762C', cord: '#C8A476',
    candle0: '#FFF3C0', candle1: '#FFC858', candle2: '#FF9A2E',
    moon: '#FFE9B4', pane: '#FFEAA8',
};

/* ================= screen: the cloth, dull, lit by a lamp turned low ================= */
{
    const rnd = rng(7001);
    let s = `<defs>${radialU('lamp', 205, 340, 380, [[0, C.cloth0], [0.3, C.cloth1], [0.7, C.cloth2], [1, C.cloth3]], 'translate(205 340) scale(1 1.1) translate(-205 -340)')}`;
    s += radialU('hot', 205, 334, 112, [[0, '#FFE2A8', 0.95], [0.28, '#F8C070', 0.62], [0.62, '#E8A24C', 0.24], [1, '#E09A46', 0]]);
    s += blurDef('b9', 9, FULL) + blurDef('b3', 2.6, FULL) + blurDef('b20', 22, FULL);
    s += `</defs><rect x="-8" y="-8" width="376" height="466" fill="url(#lamp)"/>`;
    // the falloff is not even: the lamp leans, the cloth is thicker in places
    s += `<g filter="url(#b20)"><ellipse cx="286" cy="150" rx="70" ry="90" fill="#C07A2C" fill-opacity="0.2"/><ellipse cx="20" cy="452" rx="90" ry="40" fill="${C.corner}" fill-opacity="0.2"/><ellipse cx="356" cy="452" rx="80" ry="40" fill="${C.corner}" fill-opacity="0.16"/><ellipse cx="10" cy="10" rx="110" ry="70" fill="${C.corner}" fill-opacity="0.42"/><ellipse cx="360" cy="0" rx="80" ry="50" fill="${C.corner}" fill-opacity="0.3"/><ellipse cx="96" cy="150" rx="46" ry="60" fill="#5A2C10" fill-opacity="0.2"/></g>`;
    s += `<circle cx="205" cy="334" r="112" fill="url(#hot)"/>`;
    // the weave: warp and weft, never quite evenly spaced, a slub thread here and there
    let h = '', v = '', sl = '';
    for (let y = -8; y < 458; y += 2.1 + rnd() * 1.3) h += `M-8 ${f(y)}L${f(120 + rnd() * 120)} ${f(y + (rnd() - 0.5) * 0.9)} 368 ${f(y + (rnd() - 0.5) * 0.9)}`;
    for (let x = -8; x < 368; x += 2.2 + rnd() * 1.4) v += `M${f(x)} -8L${f(x + (rnd() - 0.5) * 0.9)} ${f(150 + rnd() * 150)} ${f(x + (rnd() - 0.5) * 0.9)} 458`;
    for (let i = 0; i < 46; i++) {
        const x = rnd() * 360, y = rnd() * 450, l = 8 + rnd() * 30;
        sl += rnd() < 0.6 ? `M${f(x)} ${f(y)}h${f(l)}` : `M${f(x)} ${f(y)}v${f(l)}`;
    }
    s += `<path d="${h}" fill="none" stroke="${C.thread}" stroke-width="0.55" stroke-opacity="0.2"/><path d="${v}" fill="none" stroke="${C.thread}" stroke-width="0.5" stroke-opacity="0.15"/>`;
    s += `<path d="${sl}" fill="none" stroke="${C.slub}" stroke-width="0.7" stroke-opacity="0.13" stroke-linecap="round"/>`;
    // wrinkles: the cloth is pulled from its lacing, so soft folds run in from the corners; one sags
    const wr = [[[14, 14], [70, 60], [150, 96]], [[346, 16], [300, 70], [236, 104]], [[12, 436], [60, 396], [120, 380]], [[350, 432], [310, 392], [262, 372]], [[178, 12], [184, 80], [176, 150]], [[14, 220], [50, 226], [96, 222]], [[348, 250], [318, 262], [280, 258]]];
    let dk = '', lt = '';
    for (const w of wr) {
        const p = trace(w, rnd, { closed: false, step: 14, jit: 1.2 });
        dk += dLine(p);
        lt += dLine(p.map(([x, y]) => [x + 3.4, y + 2.6]));
    }
    s += `<g filter="url(#b3)" fill="none" stroke-linecap="round"><path d="${dk}" stroke="#3A1606" stroke-width="3.2" stroke-opacity="0.26"/><path d="${lt}" stroke="#F4C078" stroke-width="2.6" stroke-opacity="0.2"/></g>`;
    // a few stains and a mend
    s += `<g filter="url(#b3)"><ellipse cx="302" cy="330" rx="16" ry="9" fill="#4A2208" fill-opacity="0.16"/><ellipse cx="64" cy="250" rx="9" ry="14" fill="#4A2208" fill-opacity="0.12"/></g>`;
    svg('screen', FULL, s);
}

/* ================= blaze: the fire is fed; the whole cloth goes hot (added light) ================= */
{
    let s = `<defs>${radialU('g', 182, 286, 350, [[0, '#FFA850'], [0.22, '#EE7E22'], [0.58, '#B8520F'], [1, '#4A1C06']], 'translate(182 286) scale(1 1.12) translate(-182 -286)')}${radialU('h', 198, 262, 90, [[0, '#FFE6A0', 0.85], [0.4, '#FFC060', 0.4], [1, '#FFB050', 0]])}</defs>`;
    s += `<rect x="-8" y="-8" width="376" height="466" fill="url(#g)"/><circle cx="198" cy="262" r="90" fill="url(#h)"/>`;
    svg('blaze', FULL, s);
}

/* ================= moon: a paper disc carried up behind the cloth ================= */
const MOONBOX = [MOON[0] - 46, MOON[1] - 46, 92, 92];
{
    const rnd = rng(31);
    let s = `<defs>${radialU('h', MOON[0], MOON[1], 46, [[0, C.moon, 0.5], [0.66, C.moon, 0.32], [1, C.moon, 0]])}${blurDef('b', 0.7, MOONBOX)}${blurDef('m', 2.4, MOONBOX)}</defs>`;
    s += `<circle cx="${MOON[0]}" cy="${MOON[1]}" r="46" fill="url(#h)"/>`;
    s += `<path d="${ellipse(MOON[0], MOON[1], MOON_R, MOON_R, rnd, 0.35, 3)}" fill="${C.moon}" filter="url(#b)"/>`;
    s += `<g filter="url(#m)" fill="#D99A48" fill-opacity="0.26"><ellipse cx="${MOON[0] - 9}" cy="${MOON[1] - 6}" rx="9" ry="6"/><ellipse cx="${MOON[0] + 8}" cy="${MOON[1] + 9}" rx="7" ry="9"/><ellipse cx="${MOON[0] + 12}" cy="${MOON[1] - 13}" rx="4" ry="3"/></g>`;
    svg('moon', MOONBOX, s);
}

/* ================= the house: one description for its cut and for its lit panes ================= */
const HOUSE = (() => {
    const rnd = rng(501);
    const piv = [290, 296], lean = rad(-2), SH = [-4, -12];
    const R = ([x, y]) => [SH[0] + piv[0] + (x - piv[0]) * Math.cos(lean) - (y - piv[1]) * Math.sin(lean), SH[1] + piv[1] + (x - piv[0]) * Math.sin(lean) + (y - piv[1]) * Math.cos(lean)];
    const base = x => ridgeY(x + SH[0]) + 2.4;
    const B = x => [x + SH[0], base(x)];
    let d = '';
    // main block, steep roof
    d += hew([B(269), ...[[270, 250], [263, 251], [288, 205], [292, 204], [316, 250], [310, 250]].map(R), B(312)], rnd, 0.3, 6);
    // chimney, a little off true, with its pot
    d += hew([[300, 232], [299, 208], [297.6, 208], [297.8, 205], [306.6, 204.6], [306.6, 207.6], [305.4, 207.8], [306.4, 240]].map(R), rnd, 0.2, 6);
    // turret with a witch-hat roof and a vane
    d += hew([B(256), ...[[257.4, 238], [253, 238.6], [262.6, 208], [272.6, 238], [268.6, 238]].map(R), B(270)], rnd, 0.25, 6);
    d += hew([[262.2, 209], [262.2, 197], [263.2, 197], [263.2, 209]].map(R), rnd, 0.1, 9);
    d += crescent(...R([262.8, 195]), 3.4, 1.6, 200, 118, rnd);
    // lean-to porch
    d += hew([B(309), ...[[310, 276], [308, 275], [322, 268], [326, 277], [323, 277]].map(R), B(323)], rnd, 0.2, 6);
    // panes: each window is a few small holes; the bars between them stay
    const panes = [];
    const win = (cx, cy, w, hh, cols, rows) => {
        const pw = (w - (cols - 1) * 1.1) / cols, ph = (hh - (rows - 1) * 1.1) / rows;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
            const x0 = cx - w / 2 + i * (pw + 1.1), y0 = cy - hh / 2 + j * (ph + 1.1);
            panes.push([[x0, y0], [x0 + pw, y0], [x0 + pw, y0 + ph], [x0, y0 + ph]].map(R));
        }
    };
    win(279.6, 266, 7.4, 11, 2, 2);
    win(300.4, 264, 7.4, 11, 2, 2);
    win(290, 236, 6, 7, 2, 1);
    win(263, 252, 3.2, 8, 1, 2);
    win(316.4, 284, 4, 5, 1, 1);
    // the door stands a little open: a slit of light
    panes.push([[288.6, 296], [288.4, 284], [290.6, 283.4], [290.4, 296.4]].map(R));
    let holes = '';
    for (const p of panes) holes += hew(p, rnd, 0.1, 9);
    return { d, holes, panes, R };
})();

/* ================= windows: lamps lit inside the house (shown through its panes) ================= */
const WINBOX = [240, 177, 90, 116];
{
    let s = `<defs>${blurDef('b', 1.6, WINBOX)}</defs>`;
    const rects = HOUSE.panes.map(p => `M${p.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`).join('');
    s += `<path d="${rects}" fill="${C.pane}" stroke="${C.pane}" stroke-width="3" stroke-linejoin="round" filter="url(#b)"/><path d="${rects}" fill="#FFF6D0" stroke="#FFF6D0" stroke-width="1.2"/>`;
    svg('windows', WINBOX, s);
}

/* ================= mid: gauze hills, mist, the bare trees, the crooked house, the owl ================= */
const OWL = [278, 147];
{
    const rnd = rng(9102);
    let s = `<defs>${blurDef('bf', 2.6, FULL)}${blurDef('bh', 0.8, FULL)}${blurDef('bm', 6, FULL)}${penDef('pen', FULL, 0.8, 2.6, 0.4)}`;
    // the path up to the house: cut out of the gauze, so the cloth shows
    const pathLine = trace([[286, 286], [268, 296], [238, 310], [214, 330], [206, 360], [205, 440]], rnd, { closed: false, step: 8, jit: 0.6 });
    const road = band(pathLine, 3.4, 40, rnd, 0.5);
    s += maskDef('road', FULL, road);
    // owl's chest: rows of small feather cuts
    let owlHoles = '';
    [3, 4, 3, 2].forEach((n, r) => {
        for (let i = 0; i < n; i++) owlHoles += dot(OWL[0] + (i - (n - 1) / 2) * 3.7, OWL[1] + 3.4 + r * 3.5, 1.25 - r * 0.12, rnd);
    });
    for (const sd of [-1, 1]) owlHoles += slit([OWL[0] + sd * 7.4, OWL[1] + 1.6], [OWL[0] + sd * 6.2, OWL[1] + 11.6], 1.3, rnd, 0.5 * sd);
    s += maskDef('cuts', FULL, HOUSE.holes + owlHoles);
    s += `</defs>`;
    // far ridge: furthest from the cloth, so palest and softest
    const farR = [[-8, 284], [24, 268], [60, 276], [96, 258], [140, 270], [178, 282], [214, 268], [250, 262], [300, 252], [340, 262], [368, 256]];
    let farD = dPoly([...trace(farR, rnd, { closed: false, step: 9, jit: 0.8 }), [368, 458], [-8, 458]]);
    const farTwigs = [];
    for (const [x, len] of [[52, 30], [100, 38], [112, 24], [196, 26], [214, 34], [332, 30]]) grow(x, 276, -90 + (rnd() - 0.5) * 16, len, 2.6, 2, rnd, farTwigs);
    s += `<g filter="url(#bf)" fill="${C.far}" fill-opacity="0.24"><path d="${farD}"/><path d="${farTwigs.join('')}"/></g>`;
    // the hill: a gauze cut-out standing off the cloth
    const hill = dPoly([...trace(RIDGE, rnd, { closed: false, step: 6, jit: 0.7 }), [368, 458], [-8, 458]]);
    // grass along the ridge
    let grass = '';
    for (let x = -4; x < 366; x += 2.6 + rnd() * 5) {
        if (x > 254 && x < 326) continue;
        const y = ridgeY(x), hgt = 2.5 + rnd() * 5.5, ln = (rnd() - 0.5) * 5;
        grass += `M${f(x - 1)} ${f(y + 1)}L${f(x + ln)} ${f(y - hgt)} ${f(x + 1.1)} ${f(y + 1)}Z`;
    }
    s += `<g filter="url(#bh)" mask="url(#road)" fill="${C.gauze}" fill-opacity="0.27"><path d="${hill}${grass}"/></g>`;
    // mist behind the trees
    s += `<g filter="url(#bm)" fill="#FFD9A0"><ellipse cx="250" cy="316" rx="120" ry="5" fill-opacity="0.2"/><ellipse cx="70" cy="334" rx="90" ry="5" fill-opacity="0.16"/></g>`;
    // the black cut: trees, house, owl
    const tw = [];
    // left tree: a leaning, twisted trunk and long boughs across the top
    let trees = limb([[20, 446], [27, 372], [21, 312], [33, 250], [25, 196], [38, 142], [33, 96], [47, 54], [42, 0]], 21, 5, rnd);
    trees += limb([[29, 206], [50, 186], [57, 160], [52, 140], [66, 122]], 6.4, 1.6, rnd);
    trees += limb([[36, 136], [58, 116], [84, 104], [108, 108], [134, 94], [158, 98]], 6, 1.1, rnd);
    trees += limb([[35, 96], [56, 72], [80, 62], [104, 66], [128, 50], [148, 52]], 5, 1, rnd);
    trees += limb([[26, 250], [10, 236], [2, 214], [-8, 206]], 5, 2, rnd);
    trees += limb([[30, 160], [14, 142], [8, 118], [-8, 108]], 4.4, 1.8, rnd);
    for (const [x, y, a, l, w] of [[57, 160, -20, 26, 2], [84, 104, -80, 30, 2.2], [108, 108, 60, 22, 1.8], [134, 94, -70, 26, 1.8], [80, 62, -95, 30, 2], [104, 66, 50, 20, 1.6], [128, 50, -60, 26, 1.6], [45, 60, -130, 34, 2.4], [56, 72, 40, 18, 1.5], [66, 122, -40, 22, 1.4], [158, 98, 30, 16, 1], [36, 20, -60, 34, 2.4]]) grow(x, y, a, l, w, 2, rnd, tw);
    // right tree: the owl's bough reaches in
    trees += limb([[354, 446], [350, 366], [344, 296], [348, 236], [340, 186], [345, 134], [337, 92], [342, 50], [334, 0]], 16, 4, rnd);
    trees += limb([[342, 196], [322, 180], [300, 173], [282, 163], [262, 162], [244, 151]], 6.6, 1.2, rnd);
    trees += limb([[342, 134], [324, 114], [312, 90], [294, 76], [286, 54]], 4.8, 1, rnd);
    trees += limb([[346, 250], [332, 240], [318, 245]], 3, 0.8, rnd);
    trees += limb([[340, 60], [356, 40], [368, 36]], 3.4, 1.6, rnd);
    for (const [x, y, a, l, w] of [[300, 173, -100, 24, 1.8], [262, 162, 100, 16, 1.2], [244, 151, -150, 14, 1], [324, 114, -150, 26, 1.8], [294, 76, -160, 28, 1.6], [312, 90, -60, 22, 1.5], [286, 54, -50, 20, 1.2], [322, 180, 60, 18, 1.4], [338, 30, -120, 30, 2]]) grow(x, y, a, l, w, 2, rnd, tw);
    // a spider let down from the bough on its thread
    {
        const sx = 85, sy = 139;
        trees += band([[84.6, 104], [sx, sy - 3]], 0.55, 0.5, rnd, 0.05) + ellipse(sx, sy, 2.6, 3.1, rnd, 0.12, 1.4) + ellipse(sx, sy - 3.4, 1.5, 1.5, rnd, 0.1, 1.2);
        for (const sd of [-1, 1]) for (const [a1, a2] of [[-52, -8], [-22, 22], [8, 50], [34, 76]]) {
            const k = [sx + sd * Math.cos(rad(a1)) * 4.6, sy - 1 + Math.sin(rad(a1)) * 4.6], e = [k[0] + sd * Math.cos(rad(a2)) * 3.6, k[1] + Math.sin(rad(a2)) * 3.6 + 1.6];
            trees += band([[sx + sd * 1.6, sy - 1], k, e], 0.6, 0.45, rnd, 0.05);
        }
    }
    // owl: body, tail, feet on the bough (its head is its own puppet)
    let owl = cut([[OWL[0], OWL[1] - 6], [OWL[0] + 9.6, OWL[1] + 2], [OWL[0] + 8.6, OWL[1] + 12], [OWL[0] + 4, OWL[1] + 17], [OWL[0] - 4, OWL[1] + 17], [OWL[0] - 8.6, OWL[1] + 12], [OWL[0] - 9.6, OWL[1] + 2]], rnd, { step: 2.4, jit: 0.25 });
    owl += hew([[OWL[0] + 2, OWL[1] + 14], [OWL[0] + 9, OWL[1] + 15], [OWL[0] + 12.5, OWL[1] + 27], [OWL[0] + 8, OWL[1] + 25.4], [OWL[0] + 5.6, OWL[1] + 28]], rnd, 0.2, 6);
    for (const dx of [-4.4, -2.6, 1.4, 3.2]) owl += hew([[OWL[0] + dx - 0.7, OWL[1] + 15], [OWL[0] + dx + 0.7, OWL[1] + 15], [OWL[0] + dx + 0.5, OWL[1] + 20.4], [OWL[0] + dx - 0.5, OWL[1] + 20.4]], rnd, 0.1, 9);
    s += `<g filter="url(#pen)" mask="url(#cuts)" fill="${C.black}"><path d="${trees}${tw.join('')}"/><path d="${HOUSE.d}"/><path d="${owl}"/></g>`;
    // mist in front: gauze strips, lighter than anything behind them
    s += `<g filter="url(#bm)" fill="#FFD9A0"><ellipse cx="96" cy="354" rx="150" ry="6" fill-opacity="0.26"/><ellipse cx="290" cy="376" rx="120" ry="7" fill-opacity="0.26"/><ellipse cx="180" cy="401" rx="210" ry="4.4" fill-opacity="0.4"/><ellipse cx="180" cy="296" rx="70" ry="3" fill-opacity="0.1"/></g>`;
    svg('mid', FULL, s);
}

/* ================= owl-head: turns on its pin ================= */
const OWLHEAD = [OWL[0] - 20, OWL[1] - 24, 40, 34];
{
    const rnd = rng(77);
    const [x, y] = [OWL[0], OWL[1] - 6];
    let holes = '';
    // two plain pierced rounds, and a brow of pricks
    for (const sx of [-1, 1]) holes += ellipse(x + sx * 5.2, y - 0.4, 3.5, 3.5, rnd, 0.12, 1.6);
    for (let i = -3; i <= 3; i++) holes += dot(x + i * 2.9, y - 6.4 + Math.abs(i) * 0.5, i === 0 ? 1.1 : 0.8, rnd);
    holes += lozenge(x, y + 4.6, 1.8, 3.2, 0, rnd);
    let s = `<defs>${penDef('pen', OWLHEAD, 0.5, 1.8, 0.4)}${maskDef('cuts', OWLHEAD, holes)}</defs>`;
    let d = cut([[x - 12.6, y - 1], [x - 12.4, y - 9.6, 'c'], [x - 6.4, y - 8.2], [x, y - 9], [x + 6.4, y - 8.2], [x + 12.4, y - 9.6, 'c'], [x + 12.6, y - 1], [x + 9.4, y + 6], [x + 2.4, y + 9], [x, y + 11.4, 'c'], [x - 2.4, y + 9], [x - 9.4, y + 6]], rnd, { step: 2.2, jit: 0.22 });
    s += `<g filter="url(#pen)" mask="url(#cuts)" fill="${C.black}"><path d="${d}"/></g>`;
    svg('owl-head', OWLHEAD, s);
}

/* ================= glow: the candle inside the pumpkin (seen only through its cuts) ================= */
const GLOWBOX = [PK[0] - 82, PK[1] - 62, 164, 124];
{
    let s = `<defs>${radialU('g', PK[0], PK[1] + 6, 70, [[0, C.candle0], [0.45, C.candle1], [1, C.candle2]])}${blurDef('b', 2.4, GLOWBOX)}</defs>`;
    s = s.replace('</defs>', `<clipPath id="c"><rect x="${GLOWBOX[0]}" y="${CUTY - 4}" width="164" height="124"/></clipPath></defs>`);
    s += `<g filter="url(#b)"><ellipse cx="${PK[0]}" cy="${PK[1]}" rx="66" ry="42" fill="url(#g)" clip-path="url(#c)"/></g>`;
    svg('glow', GLOWBOX, s);
}

/* ================= flare: the light that jumps out when the lid lifts (added light) ================= */
const FLAREBOX = [PK[0] - 100, CUTY - 143, 200, 170];
{
    const rnd = rng(61);
    const o = [PK[0], CUTY + 2];
    let s = `<defs>${radialU('g', o[0], o[1], 96, [[0, '#FFF6D2', 1], [0.28, '#FFDD8E', 0.6], [0.62, '#FFC25A', 0.22], [1, '#FF9A2E', 0]], `translate(${o[0]} ${o[1]}) scale(0.9 1.25) translate(${-o[0]} ${-o[1]})`)}${blurDef('b', 3.4, FLAREBOX)}${linearU('r', 0, o[1], 0, CUTY - 133, [[0, '#FFF0BE', 0.75], [1, '#FFE0A0', 0]])}</defs>`;
    s += `<ellipse cx="${o[0]}" cy="${o[1] - 10}" rx="92" ry="118" fill="url(#g)"/>`;
    // the light is thrown in uneven shafts, as through the teeth of the cut
    let rays = '';
    for (const [a, w, l] of [[-64, 5, 96], [-40, 9, 128], [-22, 4, 110], [-6, 11, 138], [13, 5, 118], [31, 8, 126], [52, 4, 92], [70, 6, 80]]) {
        const t = rad(a - 90 + (rnd() - 0.5) * 5);
        const tip = [o[0] + Math.cos(t) * l, o[1] + Math.sin(t) * l], nx = -Math.sin(t), ny = Math.cos(t);
        rays += `M${f(o[0] + nx * 2 + Math.cos(t) * 8)} ${f(o[1] + ny * 2 + Math.sin(t) * 8)}L${f(tip[0] + nx * w)} ${f(tip[1] + ny * w)} ${f(tip[0] - nx * w)} ${f(tip[1] - ny * w)} ${f(o[0] - nx * 2 + Math.cos(t) * 8)} ${f(o[1] - ny * 2 + Math.sin(t) * 8)}Z`;
    }
    s += `<path d="${rays}" fill="url(#r)" filter="url(#b)"/>`;
    svg('flare', FLAREBOX, s);
}

/* ================= the pumpkin: one squat cut with a flat base; ribs and carving pierced ================= */
const PKW = 70, PKH = 48;
const ZIG = (() => {
    const rnd = rng(404), z = [];
    let up = false;
    for (let x = PK[0] - 36; x <= PK[0] + 36.5; x += 5.6 + rnd() * 1.6) { z.push([x, CUTY + (up ? -2.6 : 2.4) + (rnd() - 0.5) * 1.2]); up = !up; }
    z[0][0] = PK[0] - 37; z[z.length - 1][0] = PK[0] + 37;
    return z;
})();
const LIDTOP = [[PK[0] + 53, PK[1] - 66], [PK[0] - 53, PK[1] - 66]];
const PKBOX = [PK[0] - 88, PK[1] - 69, 176, 448 - (PK[1] - 69)];
const LIDBOX = [PK[0] - 70, PK[1] - 101, 140, 152];
function pkOutline(rnd) {
    const P = [], n = 124;
    for (let i = 0; i < n; i++) {
        const t = (i / n) * 2 * Math.PI, c = Math.cos(t), sn = Math.sin(t);
        const xn = Math.sign(c) * Math.pow(Math.abs(c), 0.7);
        // shoulders swell between the ribs; the base is cut flat
        const y = sn < 0 ? -PKH * Math.pow(-sn, 0.85) - 2.6 * Math.abs(Math.cos(xn * Math.PI * 2.5)) * Math.pow(-sn, 0.6) : (PKH - 1) * Math.pow(sn, 0.36);
        P.push([PK[0] + PKW * xn + (rnd() - 0.5) * 0.66, PK[1] + y + (rnd() - 0.5) * 0.66]);
    }
    return dPoly(P);
}
{
    const rnd = rng(2025);
    const [cx, cy] = PK;
    const body = pkOutline(rnd);
    let holes = '';
    // ribs: long slits that bow outward, top to base
    const ribSlit = (X, u0, u1, w) => {
        const A = [], B = [];
        for (let k = 0; k <= 8; k++) {
            const u = u0 + ((u1 - u0) * k) / 8, hw = (w / 2) * Math.sin((Math.PI * k) / 8) + 0.1, j = (rnd() - 0.5) * 0.3;
            A.push([X(u) - hw + j, cy + u * PKH * 0.93]); B.push([X(u) + hw + j, cy + u * PKH * 0.93]);
        }
        return dPoly([...A, ...B.reverse()]);
    };
    for (const sd of [-1, 1]) {
        const X1 = u => cx + sd * (14 + 6 * (1 - u * u)), X2 = u => cx + sd * (42 + 10 * (1 - u * u));
        for (const [u0, u1] of [[-0.6, -0.2], [-0.12, 0.3], [0.38, 0.82]]) holes += ribSlit(X1, u0 + (rnd() - 0.5) * 0.04, u1, 2.5);
        for (const [u0, u1] of [[-0.74, -0.36], [-0.27, 0.2], [0.29, 0.76]]) holes += ribSlit(X2, u0 + (rnd() - 0.5) * 0.04, u1, 2.4);
    }
    const Y = u => cy + u * PKH * 0.93;
    // the middle gore: a crescent, then a chain of lozenges and pricks
    holes += crescent(cx - 0.6, Y(-0.3), 8.6, 4.6, 160, 116, rnd);
    holes += dot(cx + 4.6, Y(-0.52), 1, rnd) + dot(cx + 6.4, Y(-0.36), 0.8, rnd);
    holes += lozenge(cx, Y(0.1), 5.6, 9.6, 4, rnd) + dot(cx - 6.4, Y(0.1), 1, rnd) + dot(cx + 6.4, Y(0.1), 1, rnd);
    holes += dot(cx, Y(0.33), 1.5, rnd) + lozenge(cx + 0.4, Y(0.53), 4.2, 7, -5, rnd) + dot(cx, Y(0.71), 1.1, rnd);
    // the gores beside it: knife slashes in pairs, never two alike; a small crescent where the hand felt like it
    for (const sd of [-1, 1]) {
        const X = u => cx + sd * (31 + 5 * (1 - u * u));
        [-0.56, -0.3, -0.02, 0.26, 0.52].forEach((u, i) => {
            const x = X(u), y = Y(u);
            if ((sd === 1 && i === 1) || (sd === -1 && i === 3)) { holes += crescent(x, y, 5, 2.7, sd === 1 ? 20 : 200, 108, rnd); return; }
            const sp = 5.6 + rnd() * 2, dr = 3.4 + rnd() * 2.4, tip = (rnd() - 0.5) * 2;
            holes += slit([x - sp, y - dr + (rnd() - 0.5) * 1.6], [x - 0.7 + tip, y + 2.2], 1.7 + rnd() * 0.7, rnd, 0.5) + slit([x + sp, y - dr + (rnd() - 0.5) * 1.6], [x + 0.7 + tip, y + 2.2], 1.7 + rnd() * 0.7, rnd, -0.5);
            if (i < 4) holes += dot(x + tip, y + 6.6, 0.9 + rnd() * 0.4, rnd);
        });
        // the outer gores: small crescents facing out, pricks between
        const XO = u => cx + sd * (57.6 + 3.4 * (1 - u * u));
        [-0.34, 0, 0.34].forEach((u, i) => { holes += crescent(XO(u), Y(u), 3.6, 2, sd === 1 ? 0 : 180, 100, rnd); if (i < 2) holes += dot(XO(u + 0.17) + sd * 0.6, Y(u + 0.17), 0.9, rnd); });
    }
    // a hem of short upright cuts above the flat base
    for (let x = -52; x <= 52; x += 6.5) {
        if ([14, 42].some(v => Math.abs(Math.abs(x) - v - 2) < 3.4)) continue;
        holes += slit([cx + x + (rnd() - 0.5), cy + PKH - 10.6 - rnd() * 1.4], [cx + x + (rnd() - 0.5) * 1.4, cy + PKH - 5.4], 1.5, rnd);
    }
    const lidCut = [...ZIG, ...LIDTOP];
    let s = `<defs>${penDef('pen', PKBOX, 1.2, 3.4, 0.46)}${blurDef('far', 5, PKBOX)}${maskDef('cuts', PKBOX, holes)}<clipPath id="body"><path d="M${PKBOX[0]} ${PKBOX[1]}H${PKBOX[0] + PKBOX[2]}V448H${PKBOX[0]}Z${dPoly(lidCut)}" clip-rule="evenodd"/></clipPath></defs>`;
    // a second, fainter shadow: the lamp is not a point
    s += `<ellipse cx="${cx + 6}" cy="${cy + 4}" rx="74" ry="50" fill="${C.pen}" fill-opacity="0.2" filter="url(#far)"/>`;
    // its two rods, to the hands below
    const rods = `M${f(cx - 26)} ${cy + 40}L${f(cx - 33)} 448M${f(cx + 24)} ${cy + 40}L${f(cx + 33)} 448`;
    s += `<path d="${rods}" fill="none" stroke="${C.black}" stroke-width="1.5" stroke-opacity="0.9"/>`;
    s += `<g filter="url(#pen)" mask="url(#cuts)" fill="${C.black}"><g clip-path="url(#body)"><path d="${body}"/></g></g>`;
    svg('pumpkin', PKBOX, s);

    // the lid: the crown of the same cut, a twisted stem, a leaf, a tendril; and its rod
    const r2 = rng(88);
    const lid = pkOutline(rng(2025));
    const stem = limb([[cx - 1, cy - 45], [cx - 3, cy - 59], [cx + 2, cy - 69], [cx + 11, cy - 76], [cx + 13, cy - 83]], 11, 5.6, r2, 4);
    // leaf with its veins cut through
    const lf = [[cx - 8, cy - 51, 'c'], [cx - 20, cy - 62], [cx - 34, cy - 61], [cx - 46, cy - 68, 'c'], [cx - 40, cy - 56], [cx - 30, cy - 50], [cx - 18, cy - 48]];
    const leafHoles = slit([cx - 13, cy - 54], [cx - 40, cy - 64.6], 1.3, r2, 0.4) + slit([cx - 22, cy - 59.6], [cx - 27, cy - 62.4], 1, r2) + slit([cx - 25, cy - 55], [cx - 31, cy - 53], 1, r2) + slit([cx - 32, cy - 61], [cx - 37, cy - 63.6], 1, r2);
    // tendril: a cut spiral
    const sp = [];
    for (let t = 0; t <= 1; t += 0.04) { const a = rad(200 - t * 560), rr = 2 + (1 - t) * 9; sp.push([cx + 26 + Math.cos(a) * rr + t * 4, cy - 59 - t * 6 + Math.sin(a) * rr]); }
    const clip = [...ZIG.map(([x, y]) => [x, y - 2.2]), ...LIDTOP];
    let l = `<defs>${penDef('pen', LIDBOX, 1, 3, 0.44)}<clipPath id="c"><path d="${dPoly(clip)}"/></clipPath>${maskDef('cuts', LIDBOX, leafHoles)}</defs>`;
    // rod and pin (the rod hides behind the body until the lid lifts)
    l += `<path d="M${cx + 0.6} ${CUTY - 6}L${cx - 1} ${CUTY + 84}" fill="none" stroke="${C.black}" stroke-width="1.7"/>`;
    l += `<g filter="url(#pen)" mask="url(#cuts)" fill="${C.black}"><g clip-path="url(#c)"><path d="${lid}"/></g><path d="${stem}"/><path d="${cut(lf, r2, { step: 2.4, jit: 0.3 })}"/><path d="${band(sp, 1.7, 0.8, r2, 0.1)}"/><path d="${limb([[cx + 9, cy - 53], [cx + 16, cy - 51], [cx + 17, cy - 57]], 1.6, 1.4, r2, 3)}"/></g>`;
    svg('lid', LIDBOX, l);
}

/* ================= bats: five puppets, each cut differently, each on its rod ================= */
const BATS = [
    { at: [196, 162], s: 1.2, aL: 34, aR: 22, roll: -14, kink: 0.2, rod: 96, seed: 11 },
    { at: [177, 111], s: 0.92, aL: -10, aR: 16, roll: 12, kink: 0.26, rod: 82, seed: 12 },
    { at: [237, 113], s: 0.7, aL: 40, aR: 46, roll: 6, kink: 0.14, rod: 110, seed: 13 },
    { at: [305, 97], s: 0.84, aL: 6, aR: -22, roll: -22, kink: 0.3, rod: 78, seed: 14 },
    { at: [226, 211], s: 0.58, aL: -26, aR: -18, roll: 8, kink: 0.34, rod: 88, seed: 15 },
];
const r1 = n => Math.round(n * 10) / 10;
const batBox = b => [r1(b.at[0] - 34 * b.s - 2), r1(b.at[1] - 30 * b.s - 2), r1(68 * b.s + 4), r1((34 + b.rod) * b.s + 6)];
BATS.forEach((b, i) => {
    const rnd = rng(b.seed * 97);
    const box = batBox(b), [ox, oy] = b.at, cr = Math.cos(rad(b.roll)), sr = Math.sin(rad(b.roll));
    const T = ([x, y, c]) => { const p = [ox + (x * cr - y * sr) * b.s, oy + (x * sr + y * cr) * b.s]; if (c) p.push(c); return p; };
    let d = '', holes = '';
    for (const [sd, ang] of [[-1, b.aL], [1, b.aR]]) {
        const L = 27 + rnd() * 4, a = rad(ang);
        const sh = [sd * 2.4, -1.5];
        const tip = [sh[0] + sd * L * Math.cos(a), sh[1] - L * Math.sin(a)];
        // the wrist: a kink above the straight line to the tip
        const wr = [sh[0] + (tip[0] - sh[0]) * 0.44 + sd * Math.sin(a) * L * -b.kink * 0.3, sh[1] + (tip[1] - sh[1]) * 0.44 - L * b.kink];
        const hip = [sd * 1.8, 6.5];
        // finger ends along the trailing edge, hanging below the line from tip to hip
        const fin = t => [tip[0] + (hip[0] - tip[0]) * t + sd * 1.5, tip[1] + (hip[1] - tip[1]) * t + (7.5 + rnd() * 3) * Math.sin(Math.PI * Math.min(1, t + 0.2))];
        const f1 = fin(0.36), f2 = fin(0.7);
        const sc = (p, q, lift) => [(p[0] + q[0]) / 2 + (wr[0] - (p[0] + q[0]) / 2) * lift, (p[1] + q[1]) / 2 + (wr[1] - (p[1] + q[1]) / 2) * lift];
        const P = [[...sh, 'c'], [wr[0] - sd * 3, wr[1] + 1.2], [...wr, 'c'], [(wr[0] + tip[0]) / 2, (wr[1] + tip[1]) / 2 - 0.8], [...tip, 'c'], sc(tip, f1, 0.34), [...f1, 'c'], sc(f1, f2, 0.3), [...f2, 'c'], sc(f2, hip, 0.3), [...hip, 'c']];
        d += cut(P.map(T), rnd, { step: 2.2, jit: 0.2 });
        // pierced: slits along the finger bones, a prick or two in the membrane
        const along = (p, q, t0, t1) => [[p[0] + (q[0] - p[0]) * t0, p[1] + (q[1] - p[1]) * t0], [p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1]];
        if (b.s > 0.6) {
            const [a1, b1] = along(wr, f1, 0.2, 0.74), [a2, b2] = along(wr, f2, 0.22, 0.7);
            holes += slit(T(a1), T(b1), 1.5 * b.s, rnd, 0.3) + slit(T(a2), T(b2), 1.4 * b.s, rnd, -0.3);
            if (b.s > 0.8) { const m = [(wr[0] + f1[0] + tip[0]) / 3, (wr[1] + f1[1] + tip[1]) / 3 + 0.6]; holes += dot(...T(m), 1 * b.s, rnd); }
        }
        holes += dot(...T([sh[0] + sd * 0.4, sh[1] + 0.4]), 0.85, rnd); // the wing's pin
    }
    // body, head, ears
    d += cut([[0, -6.4], [2.9, -3.4], [3.1, 2], [1.5, 8.4], [0, 10.4, 'c'], [-1.5, 8.4], [-3.1, 2], [-2.9, -3.4]].map(T), rnd, { step: 2, jit: 0.15 });
    d += hew([[-3, -4.4], [-4.2, -10.4], [-0.6, -6.6]].map(T), rnd, 0.1, 9) + hew([[3, -4.4], [4.2, -10.4], [0.6, -6.6]].map(T), rnd, 0.1, 9);
    let s = `<defs>${penDef('pen', box, 1.1 * b.s, 2.4 + 1.2 * b.s, 0.46)}${maskDef('cuts', box, holes)}${blurDef('soft', 0.9, box)}${blurDef('two', 3.2, box)}</defs>`;
    // the second shadow, thrown aside by the lamp's other edge
    s += `<path d="${d}" transform="translate(${f(4.4 * b.s)} ${f(3 * b.s)})" fill="${C.pen}" fill-opacity="0.24" filter="url(#two)"/>`;
    // rod: sharp at the puppet, softer as it leaves the cloth
    const ra = rad(96 + (i % 2 ? -9 : 7) + i * 3), rl = (b.rod * b.s) / 3;
    const rp = k => [ox + Math.cos(ra) * rl * k, oy + 4 * b.s + Math.sin(ra) * rl * k];
    s += `<path d="${dLine([rp(1.9), rp(3)])}" fill="none" stroke="${C.black}" stroke-width="${f(1.3)}" stroke-opacity="0.34" filter="url(#soft)"/><path d="${dLine([rp(1), rp(2)])}" fill="none" stroke="${C.black}" stroke-width="1.2" stroke-opacity="0.66"/><path d="${dLine([rp(0), rp(1.05)])}" fill="none" stroke="${C.black}" stroke-width="1.2"/>`;
    s += `<g filter="url(#pen)" mask="url(#cuts)" fill="${C.black}"><path d="${d}"/></g>`;
    svg(`bat-${i + 1}`, box, s);
});

/* ================= cat: arching on the fence ================= */
const CAT = [318, 345]; // where its paws stand
const CATBOX = [CAT[0] - 32, CAT[1] - 64, 64, 132];
{
    const rnd = rng(313);
    const k = 0.92, T = ([x, y, c]) => { const p = [CAT[0] + x * k, CAT[1] + y * k]; if (c) p.push(c); return p; };
    let d = '';
    // body: one high arch
    d += cut([[-18, -16], [-13, -26], [-6, -33], [2, -36.4], [9.6, -33.4], [14.6, -26], [16, -17], [12.6, -12.4], [5, -15.4], [-3, -14.6], [-10, -11.4], [-15.4, -10.4]].map(T), rnd, { step: 2.4, jit: 0.25 });
    // bristling fur along the spine
    for (let i = 0; i < 9; i++) {
        const t = i / 8, a = rad(215 + t * 110), x = 1.6 + Math.cos(a) * 16.4, y = -18 + Math.sin(a) * 17;
        const n = [Math.cos(a), Math.sin(a)], h = 3 + rnd() * 2.4;
        d += hew([[x - n[1] * 1.6, y + n[0] * 1.6], [x + n[0] * h + (rnd() - 0.5), y + n[1] * h], [x + n[1] * 1.6, y - n[0] * 1.6]].map(T), rnd, 0.1, 9);
    }
    // legs, stiff and close together; paws
    for (const [x0, y0, x1, w] of [[-14.4, -13, -15.4, 3.6], [-10.4, -12.4, -10.2, 3.4], [10.4, -14, 11.4, 4], [14.4, -16, 16.4, 4.2]]) {
        d += band([[x0, y0], [(x0 + x1) / 2 + 0.4, y0 / 2], [x1, -1]].map(T), w * k, 2.3 * k, rnd, 0.15);
        d += ellipse(...T([x1 - 0.8, -0.6]), 2.5, 1.5, rnd, 0.1, 1.6);
    }
    // head, low and forward; ears
    d += ellipse(...T([-20, -22.6]), 6.6 * k, 5.8 * k, rnd, 0.2, 2);
    d += hew([[-25.4, -25], [-25.6, -33], [-20.6, -27.6]].map(T), rnd, 0.12, 9) + hew([[-19.4, -27.6], [-15.4, -33.6], [-14.6, -25.4]].map(T), rnd, 0.12, 9);
    // tail: straight up, with a crook
    d += limb([[14, -24], [19.6, -32], [22.6, -42], [20.6, -51], [15, -54.6], [11.6, -51]].map(T), 4.6, 2, rnd, 3);
    // whiskers
    let wh = '';
    for (const [a, l] of [[168, 8], [184, 8.6], [200, 7]]) wh += dLine([T([-25, -20.6]), T([-25 + Math.cos(rad(a)) * l, -20.6 + Math.sin(rad(a)) * l])]);
    // pierced: the eye, and fur cuts along the flank
    let holes = cut([[-25, -23.4, 'c'], [-22.6, -25.2], [-20, -23.8, 'c'], [-22.6, -22.6]].map(T), rnd, { step: 1.6, jit: 0.08 });
    for (let i = 0; i < 7; i++) { const a = rad(222 + i * 16), x = 1.6 + Math.cos(a) * 12.2, y = -18 + Math.sin(a) * 12.6; holes += dot(...T([x, y]), 0.8 + 0.5 * Math.sin((Math.PI * (i + 0.5)) / 7), rnd); }
    holes += slit(T([9, -22]), T([12.4, -17]), 1.2, rnd, 0.4) + slit(T([6.4, -21]), T([9, -16.6]), 1.1, rnd, 0.4);
    let s = `<defs>${penDef('pen', CATBOX, 0.8, 2.6, 0.42)}${maskDef('cuts', CATBOX, holes)}</defs>`;
    s += `<path d="M${f(CAT[0] + 2)} ${f(CAT[1] - 14)}L${f(CAT[0] + 7)} ${f(CAT[1] + 66)}" fill="none" stroke="${C.black}" stroke-width="1.4"/>`;
    s += `<g filter="url(#pen)" mask="url(#cuts)" fill="${C.black}"><path d="${d}"/><path d="${wh}" fill="none" stroke="${C.black}" stroke-width="0.5"/></g>`;
    svg('cat', CATBOX, s);
}

/* ================= fence: crooked pickets, the gate posts with their hinge pins, the ground ================= */
const FENCEBOX = [-8, 280, 376, 178];
{
    const rnd = rng(1213);
    const G = GATE.ground;
    let d = '';
    // ground with ragged grass
    const gl = [];
    for (let x = -8; x <= 368; x += 3 + rnd() * 5) gl.push([x, G + 2 + (rnd() - 0.5) * 2.4 - (rnd() < 0.3 ? 3 + rnd() * 5 : 0)]);
    d += dPoly([...gl, [368, 458], [-8, 458]]);
    const section = (x0, x1, tilt) => {
        const yAt = (x, y) => y + (x - x0) * tilt;
        for (let x = x0 + 3; x < x1 - 3; x += 9.6 + rnd() * 3.4) {
            if (rnd() < 0.09) continue; // a picket gone
            const w = 5.4 + rnd() * 1.8, top = yAt(x, 338 + rnd() * 13), lean = (rnd() - 0.5) * 5.4, broken = rnd() < 0.16;
            const P = broken
                ? [[x - w / 2, G + 4], [x - w / 2 + lean, top + 12], [x - w / 4 + lean, top + 8.4], [x + lean, top + 13], [x + w / 2 + lean, top + 9.6], [x + w / 2, G + 4]]
                : [[x - w / 2, G + 4], [x - w / 2 + lean, top + 6], [x + lean + (rnd() - 0.5), top], [x + w / 2 + lean, top + 6], [x + w / 2, G + 4]];
            d += hew(P, rnd, 0.24, 9);
        }
        // rails: two planks, sagging
        for (const y of [361, 393]) d += band(trace([[x0 - 2, yAt(x0, y) + (rnd() - 0.5) * 3], [(x0 + x1) / 2, yAt((x0 + x1) / 2, y) + 1.6 + (rnd() - 0.5) * 2], [x1 + 2, yAt(x1, y) + (rnd() - 0.5) * 3]], rnd, { closed: false, step: 12, jit: 0.4 }), 4.4, 4, rnd, 0.2);
    };
    section(-10, GATE.l - 8, 0.03);
    section(GATE.r + 8, 372, -0.04);
    // one picket fallen against the rest
    d += hew([[78, G + 3], [96, 352], [99, 350.4], [102, 354], [84.4, G + 4]], rnd, 0.2, 9);
    // gate posts: stout, capped, with a ball; hinge pins stand out on the gate side
    let pins = '';
    for (const [x, sd, lean] of [[GATE.l - 4.4, 1, -1.2], [GATE.r + 4.4, -1, 1.6]]) {
        const top = 298;
        d += hew([[x - 4.6, G + 4], [x - 4.2 + lean, top + 6], [x - 6.4 + lean, top + 5.4], [x - 6 + lean, top + 1.6], [x + 6 + lean, top + 1.2], [x + 6.4 + lean, top + 5], [x + 4.2 + lean, top + 5.6], [x + 4.6, G + 4]], rnd, 0.25, 9);
        d += ellipse(x + lean, top - 3.6, 4.6, 4.8, rnd, 0.2, 2);
        for (const y of [330, 394]) {
            d += hew([[x + sd * 3.6, y - 1.6], [x + sd * 8, y - 1.8], [x + sd * 8, y + 1.8], [x + sd * 3.6, y + 1.6]], rnd, 0.1, 9);
            d += ellipse(x + sd * 8.4, y, 2.5, 2.9, rnd, 0.1, 1.6);
            pins += dot(x + sd * 8.4, y, 0.95, rnd);
        }
    }
    let s = `<defs>${penDef('pen', FENCEBOX, 1, 3, 0.44)}${maskDef('cuts', FENCEBOX, pins)}</defs><g filter="url(#pen)" mask="url(#cuts)" fill="${C.black}"><path d="${d}"/></g>`;
    svg('fence', FENCEBOX, s);
}

/* ================= the gate: two wrought leaves, pierced panels; drawn left, mirrored right ================= */
const GW = GATE.m - GATE.l;
const GATEBOX_L = [GATE.l - 4, 254, GW + 8, 160];
const GATEBOX_R = [GATE.m - 4, 254, GW + 8, 160];
function gateLeaf(name, box, mirror, seed, sag) {
    const rnd = rng(seed);
    const G = GATE.ground - 1, W = GW;
    // local: u from the hinge (0) to the meeting stile (W), v up from the ground
    const piv = mirror ? [GATE.r, G] : [GATE.l, G], cs = Math.cos(rad(sag)), sn = Math.sin(rad(sag));
    const T = ([u, v, c]) => {
        const x0 = mirror ? GATE.r - u : GATE.l + u, y0 = G - v;
        const p = [piv[0] + (x0 - piv[0]) * cs - (y0 - piv[1]) * sn, piv[1] + (x0 - piv[0]) * sn + (y0 - piv[1]) * cs];
        if (c) p.push(c);
        return p;
    };
    const topV = u => 104 + 28 * Math.pow(u / W, 1.6); // the arch rises to the middle
    let d = '', holes = '';
    const bar = (line, w0, w1 = w0) => { d += band(trace(line.map(T), rnd, { closed: false, step: 9, jit: 0.3 }), w0, w1, rnd, 0.16); };
    bar([[2.4, 0], [2.4, topV(2) + 5]], 5.2);
    bar([[W - 2.3, 0], [W - 2.3, topV(W) + 4]], 4.6);
    bar([[0, 5], [W, 5]], 5.6);
    bar([[0, 56], [W, 56]], 4.2);
    // top rail follows the arch
    const tr = [];
    for (let u = 0; u <= W; u += W / 10) tr.push([u, topV(u) - 6.5]);
    bar(tr, 4.2);
    // uprights with spear heads, alternately tall and short; none by the meeting stile, where the lock hangs clear
    const ups = [12, 23.5, 35, 46.5, 58];
    ups.forEach((u, i) => {
        const hgt = topV(u) + (i % 2 ? 3 : 12) + rnd() * 3;
        bar([[u, 56], [u + (rnd() - 0.5), hgt]], 3, 2.6);
        d += hew([[u - 3.4, hgt + 1.2], [u, hgt + 12 + rnd() * 2.6], [u + 3.4, hgt + 1.2], [u, hgt - 2]].map(T), rnd, 0.14, 9);
    });
    // scrolls under the top rail
    for (const [cu, flip, rr0] of [[17.75, 1, 4.8], [40.75, -1, 4.8], [70, 1, 5.6]]) {
        const cv = topV(cu) - 21, sp = [];
        for (let t = 0; t <= 1; t += 0.06) { const a = rad(90 + flip * t * 500), rr = rr0 * (1 - t * 0.78); sp.push([cu + Math.cos(a) * rr, cv + Math.sin(a) * rr - (1 - t) * 4 + 4]); }
        d += band(sp.map(T), 1.9, 1.2, rnd, 0.08);
    }
    // lower panel: a plate, pierced like lace
    d += hew([[1, 6], [1, 55], [W - 1, 55], [W - 1, 6]].map(T), rnd, 0.2, 9);
    const pc = [W / 2, 30.5];
    const petals = mirror ? 7 : 6, rot = rnd() * 60;
    for (let i = 0; i < petals; i++) {
        const a = rad(rot + (i * 360) / petals);
        holes += slit(T([pc[0] + Math.cos(a) * 4, pc[1] + Math.sin(a) * 4]), T([pc[0] + Math.cos(a) * 15, pc[1] + Math.sin(a) * 15]), 4.8, rnd);
    }
    holes += dot(...T(pc), 2, rnd);
    for (const [u, v, dir] of [[13, 43, 225], [W - 13, 43, 315], [13, 18, 135], [W - 13, 18, 45]]) holes += crescent(...T([u, v]), 6, 3.3, mirror ? 180 - dir : dir, 104, rnd);
    for (let u = 8; u <= W - 7; u += 6.8) { holes += dot(...T([u, 50.6]), 1.2, rnd); holes += dot(...T([u, 10.6]), 1.2, rnd); }
    for (const u of [5.6, W - 5.6]) for (let v = 17; v <= 45; v += 6.8) holes += dot(...T([u, v]), 1.2, rnd);
    for (const sd of [-1, 1]) holes += lozenge(...T([pc[0] + sd * 23, pc[1]]), 4, 8.6, 0, rnd);
    // hinge knuckles on the hinge stile (they sit on the post's pins)
    for (const y of [330, 394]) d += hew([[-1.6, G - y - 3], [3.6, G - y - 3], [3.6, G - y + 3], [-1.6, G - y + 3]].map(T), rnd, 0.1, 9);
    const s = `<defs>${penDef('pen', box, 0.8, 2.6, 0.42)}${maskDef('cuts', box, holes)}</defs><g filter="url(#pen)" mask="url(#cuts)" fill="${C.black}"><path d="${d}"/></g>`;
    svg(name, box, s);
}
gateLeaf('gate-l', GATEBOX_L, false, 5101, 0);
gateLeaf('gate-r', GATEBOX_R, true, 5202, -1.1);

/* ================= latch: a drop bar across the meeting stiles, and its padlock (the seal) ================= */
const LATCH = { pivot: [GATE.m - 22, 318], len: 44 };
const LATCHBOX = [LATCH.pivot[0] - 9, LATCH.pivot[1] - 12, 66, 60];
{
    const rnd = rng(66);
    const [px, py] = LATCH.pivot, L = LATCH.len;
    let d = hew([[px - 3, py - 3.8], [px + L, py - 3.6], [px + L + 3.6, py - 0.6], [px + L, py + 3.8], [px - 3, py + 3.6]], rnd, 0.2, 9);
    d += ellipse(px, py, 5.8, 5.8, rnd, 0.15, 2);
    // the catch it rests in
    d += hew([[px + L - 7, py + 2], [px + L - 7, py + 8.4], [px + L + 3.4, py + 8.4], [px + L + 3.4, py + 1], [px + L + 0.8, py + 1], [px + L + 0.8, py + 5.6], [px + L - 4.2, py + 5.6], [px + L - 4.2, py + 2]], rnd, 0.1, 9);
    // the padlock: a broad plate hung on the bar where the leaves meet, cut through so the lamp shows
    const lx = GATE.m, ly = py + 22;
    d += cut([[lx - 17, ly - 7, 'c'], [lx + 17, ly - 7, 'c'], [lx + 17.6, ly + 6], [lx + 11, ly + 15], [lx - 11, ly + 15], [lx - 17.6, ly + 6]], rnd, { step: 2.4, jit: 0.22 });
    let holes = dot(px, py, 1.6, rnd) + dot(px + 11, py, 1.1, rnd) + dot(px + 34, py, 1.1, rnd);
    for (const sd of [-1, 1]) {
        holes += crescent(lx + sd * 11.4, ly + 3, 5, 2.9, sd === 1 ? 0 : 180, 108, rnd);
        holes += dot(lx + sd * 13, ly - 3.6, 1.1, rnd) + dot(lx + sd * 8.4, ly - 4, 0.95, rnd) + dot(lx + sd * 8.6, ly + 10.6, 1.1, rnd) + dot(lx + sd * 6.6, ly + 5.4, 0.8, rnd);
    }
    let s = `<defs>${penDef('pen', LATCHBOX, 0.7, 2.2, 0.42)}${maskDef('cuts', LATCHBOX, holes)}</defs><g filter="url(#pen)" mask="url(#cuts)" fill="${C.black}"><path d="${d}"/><path d="M${f(lx - 8.6)} ${f(ly - 6)}L${f(lx - 8.6)} ${f(ly - 14)} ${f(lx - 5)} ${f(ly - 18.6)} ${f(lx + 5)} ${f(ly - 18.6)} ${f(lx + 8.6)} ${f(ly - 14)} ${f(lx + 8.6)} ${f(ly - 6)}" fill="none" stroke="${C.black}" stroke-width="3.2"/></g>`;
    svg('latch', LATCHBOX, s);
}

/* ================= leaves: cut leaves, veins pierced ================= */
/** A leaf from its stalk at (x, y), pointing `ang`, `len` long. kind: 0 almond, 1 serrated, 2 lobed (oak), 3 pointed lobes. */
function leafCut(x, y, ang, len, kind, rnd, curl = 0) {
    const c = Math.cos(rad(ang)), s = Math.sin(rad(ang));
    const T = (u, v) => [x + u * c - (v + curl * u * (1 - u / len) * 0.6) * s, y + u * s + (v + curl * u * (1 - u / len) * 0.6) * c];
    const half = t => {
        const base = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.8) * len * 0.3;
        if (kind === 1) return base * (0.86 + 0.2 * ((t * 7) % 1));
        if (kind === 2) return base * (0.6 + 0.46 * Math.abs(Math.sin(t * Math.PI * 4)));
        if (kind === 3) return base * (0.42 + 0.9 * Math.pow(Math.abs(Math.sin(t * Math.PI * 2.5 + 0.5)), 1.6));
        return base * 0.8;
    };
    const up = [], dn = [], n = 15;
    for (let i = 1; i < n; i++) { const t = i / n; up.push(T(t * len, -half(t) * (0.9 + rnd() * 0.2))); dn.push(T(t * len, half(t) * (0.9 + rnd() * 0.2))); }
    let d = dPoly([T(0, 0), ...up, T(len, 0), ...dn.reverse()]);
    d += band([T(-len * 0.28, 0.6), T(0, 0)], 1, 0.8, rnd, 0.05); // stalk
    let holes = slit(T(len * 0.08, 0), T(len * 0.86, 0), Math.max(0.9, len * 0.05), rnd);
    if (len > 13) for (const t of [0.34, 0.58]) for (const sd of [-1, 1]) holes += slit(T(len * t, sd * len * 0.045), T(len * (t + 0.14), sd * half(t + 0.1) * 0.66), 0.85, rnd);
    return { d, holes };
}
{
    const rnd = rng(4242);
    let d = '', holes = '';
    for (const [x, y, a, l, k, cu] of [[56, 232, 24, 19, 2, 2], [176, 150, -32, 15, 1, -1.6], [258, 250, 50, 13, 0, 1], [320, 196, -12, 17, 3, 0], [134, 330, 12, 12, 1, 1.4], [222, 96, 70, 11, 0, -1]]) {
        const L = leafCut(x, y, a, l, k, rnd, cu);
        d += L.d; holes += L.holes;
    }
    svg('leaves', FULL, `<defs>${penDef('pen', FULL, 0.6, 2.4, 0.4)}${maskDef('cuts', FULL, holes)}</defs><g filter="url(#pen)" mask="url(#cuts)" fill="${C.black}"><path d="${d}"/></g>`);
    // two small ones the stage throws about
    const a = leafCut(2.5, 6, -8, 11, 1, rnd, 1);
    svg('leaf', [0, 0, 15, 12], `<defs>${maskDef('cuts', [0, 0, 15, 12], a.holes)}</defs><g mask="url(#cuts)" fill="${C.black}"><path d="${a.d}"/></g>`);
    const b = leafCut(2.6, 7, -12, 10, 2, rnd, -1);
    svg('leaf-b', [0, 0, 14, 13], `<defs>${maskDef('cuts', [0, 0, 14, 13], b.holes)}</defs><g mask="url(#cuts)" fill="${C.black}"><path d="${b.d}"/></g>`);
}

/* ================= frame: the wooden edges of the stage, the cloth laced to them ================= */
{
    const rnd = rng(909);
    const IN = { l: 12, r: 348, t: 13, b: 431 };
    let s = `<defs>${blurDef('b', 5, FULL)}</defs>`;
    // the cloth darkens toward its hem (doubled cloth), unevenly
    s += `<g filter="url(#b)" fill="none" stroke="#1A0810" stroke-opacity="0.5"><path d="M${IN.l} -8V458" stroke-width="13"/><path d="M${IN.r} -8V458" stroke-width="11"/><path d="M-8 ${IN.t}H368" stroke-width="12"/><path d="M-8 ${IN.b + 3}H368" stroke-width="5"/></g>`;
    // hem and the gaps between lacing points, where the cloth bows away from the wood
    let gaps = '', cords = '', hem = '';
    const edge = (horizontal, at, from, to, sign) => {
        let p = from + 6 + rnd() * 4;
        while (p < to - 8) {
            const q = Math.min(to - 4, p + 19 + rnd() * 9), bow = 1.5 + rnd() * 1.5;
            const pt = (u, v) => (horizontal ? `${f(u)} ${f(at + sign * v)}` : `${f(at + sign * v)} ${f(u)}`);
            gaps += `M${pt(p, -0.6)}Q${pt((p + q) / 2, bow * 2)} ${pt(q, -0.6)}Z`;
            hem += `M${pt(p, 0.4)}Q${pt((p + q) / 2, bow * 2 + 1)} ${pt(q, 0.4)}`;
            cords += `M${pt(p - 0.8, -3.4)}L${pt(p + 0.4, 2.2)}M${pt(p + 1, -3.4)}L${pt(p - 0.6, 2)}`;
            p = q;
        }
    };
    edge(false, IN.l, 14, 430, 1);
    edge(false, IN.r, 14, 430, -1);
    edge(true, IN.t, 14, 346, 1);
    edge(true, IN.b, 14, 346, -1);
    // wood: four hewn timbers, the top beam and the sill running over the posts
    const post = (x0, x1) => hew([[x0, -8], [x1, -8], [x1, 458], [x0, 458]], rnd, 0.35, 16);
    s += `<path d="${post(-8, IN.l)}${post(IN.r, 368)}" fill="${C.wood}"/>`;
    s += `<path d="${hew([[-8, -8], [368, -8], [368, IN.t], [-8, IN.t]], rnd, 0.35, 16)}${hew([[-8, IN.b], [368, IN.b], [368, 458], [-8, 458]], rnd, 0.35, 16)}" fill="${C.wood}"/>`;
    // grain
    let gHi = '', gLo = '';
    const grain = (horizontal, a0, a1, b0, b1, n) => {
        for (let i = 0; i < n; i++) {
            const a = a0 + rnd() * (a1 - a0), b = b0 + rnd() * (b1 - b0), l = 14 + rnd() * 60, w = (rnd() - 0.5) * 1.6;
            const seg = horizontal ? `M${f(b)} ${f(a)}q${f(l / 2)} ${f(w)} ${f(l)} 0` : `M${f(a)} ${f(b)}q${f(w)} ${f(l / 2)} 0 ${f(l)}`;
            if (rnd() < 0.5) gHi += seg; else gLo += seg;
        }
    };
    grain(false, -6, IN.l - 2, 0, 400, 26);
    grain(false, IN.r + 2, 366, 0, 400, 26);
    grain(true, -6, IN.t - 2, 0, 300, 22);
    grain(true, IN.b + 3, 456, 0, 300, 30);
    s += `<path d="${gHi}" fill="none" stroke="${C.woodHi}" stroke-width="0.7" stroke-opacity="0.8"/><path d="${gLo}" fill="none" stroke="${C.woodLo}" stroke-width="0.8" stroke-opacity="0.9"/>`;
    // the inner edges catch the light of the cloth
    s += `<path d="M${IN.l - 0.4} ${IN.t}V${IN.b}M${IN.r + 0.4} ${IN.t}V${IN.b}M${IN.l} ${IN.t - 0.4}H${IN.r}M${IN.l} ${IN.b + 0.4}H${IN.r}" fill="none" stroke="${C.rim}" stroke-width="1.2" stroke-opacity="0.75"/>`;
    s += `<path d="${gaps}" fill="#070305"/><path d="${hem}" fill="none" stroke="#2A0E08" stroke-width="1.1" stroke-opacity="0.6"/><path d="${cords}" fill="none" stroke="${C.cord}" stroke-width="0.75" stroke-opacity="0.8" stroke-linecap="round"/>`;
    // pegs at the joints
    for (const [x, y] of [[2, 3], [358, 3], [2, 443], [358, 443]]) s += `<path d="${ellipse(x, y, 2.3, 2.3, rnd, 0.2, 2)}" fill="${C.woodLo}"/><path d="${ellipse(x - 0.5, y - 0.5, 1, 1, rnd, 0.1, 1.5)}" fill="${C.woodHi}"/>`;
    svg('frame', FULL, s);
}

console.log(Object.entries(SIZES).map(([k, v]) => `${k} ${(v / 1024).toFixed(1)}k`).join(' | '));
console.log(JSON.stringify({ GATE, PK, CUTY, MOON, MOONBOX, WINBOX, OWLHEAD, GLOWBOX, FLAREBOX, PKBOX, LIDBOX, CATBOX, FENCEBOX, GATEBOX_L, GATEBOX_R, LATCHBOX, LATCH, bats: BATS.map(b => ({ at: b.at, box: batBox(b).map(n => Math.round(n * 10) / 10) })) }));
