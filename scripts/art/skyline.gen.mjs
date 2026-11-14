// Generator for the "skyline" wrapper art ("Khung trời" / Evening sky): a small-town level crossing at dusk.
// Technique: a painted animation background in poster colour. Everything is a flat, hard-edged brush shape;
// clouds are stacks of billows, each painted in stepped tones (shadow, core shadow, mid, light, highlight)
// with a crisp rim on the side that faces the sun. Only a handful of soft passages (horizon haze, sun glow).
// Every scene piece is painted twice from the same geometry: a hushed late-afternoon palette (closed) and
// the burning-dusk palette (open); the stage cross-fades them.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box).
// Run: node scripts/art/skyline.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'skyline');
if (!OUT.endsWith('wrappers/skyline')) throw new Error('out dir must be public/wrappers/skyline');
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
const f2 = n => String(Math.round(n * 100) / 100);
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const BOX = {};
function svg(name, box, inner) {
    BOX[name] = box;
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    if (s.length > 59000) throw new Error(`${name}.svg is ${s.length} bytes`);
    writeFileSync(join(OUT, `${name}.svg`), s);
}
const blurDef = (id, sd, box) =>
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${f(box[0])}" y="${f(box[1])}" width="${f(box[2])}" height="${f(box[3])}"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const stops = list => list.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const radial = (id, list, extra = '') => `<radialGradient id="${id}"${extra}>${stops(list)}</radialGradient>`;
const linear = (id, [x1, y1, x2, y2], list, extra = '') => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra}>${stops(list)}</linearGradient>`;

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, k) => v + (B[k] - v) * t)); };

/* ---------- brush shapes ---------- */

/** A closed, smoothed path through points (quadratic through midpoints), written in relative coordinates. */
function closed(pts, q = 0.1) {
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const r1 = v => Math.round(v / q) * q;
    const s0 = mid(pts[n - 1], pts[0]);
    let cx = r1(s0[0]), cy = r1(s0[1]);
    let d = `M${f(cx)} ${f(cy)}q`;
    for (let i = 0; i < n; i++) {
        const p = pts[i], m = mid(p, pts[(i + 1) % n]);
        const ex = r1(m[0]), ey = r1(m[1]);
        d += `${i ? ' ' : ''}${f(p[0] - cx)} ${f(p[1] - cy)} ${f(ex - cx)} ${f(ey - cy)}`;
        cx = ex; cy = ey;
    }
    return d + 'z';
}
/** An open smoothed path through points. */
function open(pts) {
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        const e = i === pts.length - 2 ? q : [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        d += `Q${f(p[0])} ${f(p[1])} ${f(e[0])} ${f(e[1])}`;
    }
    return d;
}
/** A billow: an uneven round brush shape with a flatter underside. */
function blob(rnd, cx, cy, rx, ry, n = 8, jit = 0.16, flat = 0.72) {
    const pts = [];
    const a0 = rnd() * TAU;
    for (let i = 0; i < n; i++) {
        const a = a0 + ((i + (rnd() - 0.5) * 0.55) / n) * TAU;
        const k = 1 + (rnd() - 0.5) * 2 * jit;
        const s = Math.sin(a);
        pts.push([cx + Math.cos(a) * rx * k, cy + s * ry * k * (s > 0 ? flat : 1)]);
    }
    return pts;
}
const fill = (d, c, o) => `<path d="${d}" fill="${c}"${o !== undefined && o < 1 ? ` opacity="${f2(o)}"` : ''}/>`;
const poly = (pts, c, o) => `<polygon points="${pts.map(p => `${f(p[0])},${f(p[1])}`).join(' ')}" fill="${c}"${o !== undefined && o < 1 ? ` opacity="${f2(o)}"` : ''}/>`;
const rect = (x, y, w, h, c, o) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${c}"${o !== undefined && o < 1 ? ` opacity="${f2(o)}"` : ''}/>`;
const line = (x1, y1, x2, y2, c, w, o) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${c}" stroke-width="${f2(w)}"${o !== undefined && o < 1 ? ` opacity="${f2(o)}"` : ''}/>`;
const circ = (x, y, r, c, o) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f2(r)}" fill="${c}"${o !== undefined && o < 1 ? ` opacity="${f2(o)}"` : ''}/>`;
/** A flat brush dab: a lens, thicker above than below. */
const dab = (x, y, len, th, c, o) => fill(`M${f(x)} ${f(y)}q${f(len * 0.45)} ${f(-th)} ${f(len)} ${f(-th * 0.15)}q${f(-len * 0.5)} ${f(th * 0.7)} ${f(-len)} ${f(th * 0.15)}z`, c, o);

const HORIZON = 322;

/* ---------- palettes ---------- */

const SKY = {
    day: {
        bands: [[-10, '#4F6498'], [62, '#6578A8'], [118, '#8289B6'], [168, '#A398BE'], [214, '#C7A8BC'], [256, '#E2B7B0'], [288, '#F1CBA6'], [308, '#F8DDB4']],
        sea: [[HORIZON, '#D9B9B6'], [332, '#B9A3B8'], [346, '#9A90B0'], [372, '#8480A6']],
        seaDab: '#F3D9BC', glow: [[0, '#FFF4D8', 0.75], [0.35, '#FBD9B0', 0.4], [1, '#F6CBA6', 0]],
        high: ['#B9AFCB', '#DCC6D0', '#F4E2D6'],
    },
    lit: {
        bands: [[-10, '#283668'], [48, '#31407A'], [98, '#434986'], [142, '#5D5190'], [180, '#7C5A90'], [214, '#A4658E'], [246, '#CB7388'], [272, '#EA8E80'], [294, '#F8AE84'], [310, '#FFD0A0']],
        sea: [[HORIZON, '#F9B088'], [330, '#CF7C8A'], [342, '#84608E'], [366, '#454A82']],
        seaDab: '#FFE0B4', glow: [[0, '#FFF2D2', 0.9], [0.3, '#FFD2A4', 0.55], [0.65, '#F7A884', 0.2], [1, '#F09C88', 0]],
        high: ['#5E4E88', '#CC7088', '#F7A882'],
    },
};

/** Cloud tones, low part of the cloud -> high part. shadow, core shadow, mid, light, highlight, rim. */
const CLOUD = {
    day: { sh: ['#6C6B96', '#8182AC'], core: ['#5D5E8A', '#7273A0'], mid: ['#9189AE', '#A49CBE'], lt: ['#C6A9BA', '#CDB8CA'], hi: ['#EDCDBC', '#F0DAD2'], rim: '#FFF3DE', haze: '#EBC4AE', bloom: '#FFE8D0' },
    lit: { sh: ['#453C70', '#454678'], core: ['#322E5A', '#343862'], mid: ['#845488', '#70548C'], lt: ['#DC747E', '#C8728A'], hi: ['#F79E72', '#F29C82'], rim: '#FFE4B6', haze: '#F2A082', bloom: '#FFC098' },
};

/* ---------- sky ---------- */

function sky(name, P, seed) {
    const box = [-8, -8, 376, 466];
    const rnd = rng(seed);
    let defs = linear('s', [0, -8, 0, HORIZON], P.bands.map(([y, c]) => [f2(clamp((y + 8) / (HORIZON + 8))), c]), ' gradientUnits="userSpaceOnUse"') +
        radial('g', P.glow, ' gradientUnits="userSpaceOnUse" cx="352" cy="318" r="210"') +
        linear('w', [0, HORIZON, 0, 380], P.sea.map(([y, c]) => [f2((y - HORIZON) / (380 - HORIZON)), c]), ' gradientUnits="userSpaceOnUse"');
    // the one soft passage: a graded ground under the hard bands
    let s = rect(-8, -8, 376, HORIZON + 8, 'url(#s)');
    // stepped washes: each tone laid over the last with an uneven brushed edge, only part-way across
    for (let i = 1; i < P.bands.length; i++) {
        const [y, c] = P.bands[i];
        const pts = [];
        const tilt = (rnd() - 0.5) * 10;
        for (let x = -12; x <= 372; x += 24 + rnd() * 22) pts.push([x, y + tilt * (x / 360 - 0.5) + (rnd() - 0.5) * 13]);
        const top = open(pts);
        // the wash has a brushed upper edge and thins away to nothing below it, so no step is left standing
        defs += linear(`b${i}`, [0, y - 8, 0, y + 44], [[0, c, 0.5], [0.3, c, 0.42], [1, c, 0]], ' gradientUnits="userSpaceOnUse"');
        s += `<path d="${top}L372 ${f(y + 44)}L-12 ${f(y + 44)}z" fill="url(#b${i})"/>`;
        // dry-brush streaks of the neighbouring tone riding across the edge
        for (let k = 0; k < 7; k++) {
            const up = rnd() < 0.5;
            s += dab(-20 + rnd() * 350, y + (up ? -2 - rnd() * 16 : 5 + rnd() * 16), 24 + rnd() * 110, 1 + rnd() * 2.6, up ? c : P.bands[i - 1][1], 0.35 + rnd() * 0.35);
        }
    }
    s += `<circle cx="352" cy="318" r="210" fill="url(#g)"/>`;
    // high cloud: small flat dabs in ranks, upper right, lit from the right
    const hr = rng(77);
    for (let row = 0; row < 4; row++) {
        const y0 = 150 + row * 15 + hr() * 4, x0 = 196 + row * 9;
        for (let x = x0; x < 372; x += 15 + hr() * 20) {
            const len = 10 + hr() * 20, th = 2 + hr() * 2.6, y = y0 - (x - x0) * 0.1 + (hr() - 0.5) * 5;
            s += dab(x, y, len, th, P.high[0]);
            s += dab(x + len * 0.3, y + 0.3, len * 0.7, th * 0.62, P.high[1]);
            if (hr() < 0.6) s += dab(x + len * 0.62, y + 0.2, len * 0.36, th * 0.36, P.high[2]);
        }
    }
    // sea
    s += rect(-8, HORIZON, 376, 144, 'url(#w)');
    const sr = rng(91);
    for (let i = 0; i < 22; i++) {
        const y = HORIZON + 1.5 + Math.pow(sr(), 1.6) * 30;
        s += dab(60 + sr() * 240, y, 8 + sr() * 30, 0.6 + sr() * 0.8, P.seaDab, 0.5 + sr() * 0.4);
    }
    s += rect(-8, HORIZON - 0.4, 376, 0.9, P.seaDab, 0.7);
    svg(name, box, `<defs>${defs}</defs>${s}`);
}
sky('sky', SKY.day, 11);
sky('sky-lit', SKY.lit, 11);

/* ---------- clouds ---------- */

/**
 * A cumulus mass: `masses` are ellipses [cx, cy, rx, ry] that block in the form; billows are thrown over them,
 * top ones first so the lower ones stand in front, each painted in stepped tones toward the light `L`.
 */
function cloud(name, box, masses, P, { seed, L = [0.86, -0.5], haze = 0, top, base = HORIZON, size = 1, hazeBand = 44, bumps = 1, maxBumps = 10, core = true }) {
    const rnd = rng(seed);
    let s = '', defs = '';
    const tone = (pair, h) => mix(mix(pair[0], pair[1], h), P.haze, haze);
    const hOf = y => clamp((base - y) / (base - top));
    // Masses are listed back (high) to front (low). Each is one silhouette of billows, painted as a cel:
    // the whole shape in highlight, then the same shape slid away from the sun in each darker tone and
    // clipped to itself, so the tones step back from the sunward edge in scallops that echo the outline.
    masses.forEach(([cx, cy, rx, ry], i) => {
        const m = Math.min(rx, ry);
        let d = closed(blob(rnd, cx, cy + ry * 0.1, rx * 0.86, ry * 0.86, 9, 0.07, 0.62), 0.5);
        const n = Math.min(maxBumps, Math.max(5, Math.round((6 + (rx / m) * 3.2) * bumps)));
        for (let k = 0; k < n; k++) {
            const a = Math.PI * (0.94 + (1.12 * (k + 0.5 + (rnd() - 0.5) * 0.5)) / n);
            const u = 0.74 + rnd() * 0.2;
            const r = m * (0.13 + Math.pow(rnd(), 1.7) * 0.44) * size * (1 + 0.25 * Math.sin(a) * -1);
            d += closed(blob(rnd, cx + Math.cos(a) * rx * u, cy + Math.sin(a) * ry * u, r * (1.05 + rnd() * 0.3), r * (0.85 + rnd() * 0.2), r > 8 ? 7 : 6, 0.14, 0.85), 0.5);
        }
        for (let k = 0; k < 2; k++) {
            const r = m * (0.34 + rnd() * 0.16);
            d += closed(blob(rnd, cx + (rnd() - 0.5) * rx * 0.9, cy - ry * (0.1 + rnd() * 0.35), r * 1.3, r, 7, 0.12, 0.8), 0.5);
        }
        const h = hOf(cy);
        const slide = (k, c, wob) => `<path transform="translate(${f(-L[0] * m * k + wob)} ${f(-L[1] * m * k * 0.9)})" d="${d}" fill="${c}"/>`;
        defs += `<clipPath id="c${i}"><path d="${d}"/></clipPath>`;
        // the rim is not the same everywhere: thick on some masses, a hair on others, missing on a few
        const rimK = rnd() < 0.22 ? 0 : 0.025 + rnd() * 0.085;
        const rimC = rimK ? mix(tone(P.hi, h), mix(P.rim, P.haze, haze * 0.5), 0.2 + rnd() * 0.4) : tone(P.lt, h);
        const a0 = Math.atan2(L[1], L[0]);
        let g = rect(cx - rx * 1.5, cy - ry * 1.9, rx * 3, ry * 3.4, rimC) + slide(rimK, tone(P.lt, h), 0);
        // ... and broken where the light tone is dragged out over it
        for (let k = 0; k < 3; k++) {
            const a = a0 + (rnd() - 0.5) * 2.4, q = m * (0.16 + rnd() * 0.2);
            g += fill(closed(blob(rnd, cx + Math.cos(a) * rx * 0.98, cy + Math.sin(a) * ry * 0.98, q * 1.5, q, 6, 0.2), 0.5), tone(P.lt, h));
        }
        g += slide(0.3 + rnd() * 0.1, tone(P.mid, h), (rnd() - 0.5) * 3);
        // soft passages inside the form: light melting into the mid tone, shadow pooling away from the sun
        g += `<ellipse cx="${f(cx + L[0] * rx * 0.3)}" cy="${f(cy + L[1] * ry * 0.3)}" rx="${f(rx * 0.26)}" ry="${f(ry * 0.24)}" fill="${tone(P.lt, h)}" opacity="0.4" filter="url(#sf)"/>`;
        g += slide(0.56 + rnd() * 0.14, tone(P.sh, h), (rnd() - 0.5) * 4);
        g += `<ellipse cx="${f(cx - L[0] * rx * 0.5)}" cy="${f(cy + ry * 0.3)}" rx="${f(rx * 0.36)}" ry="${f(ry * 0.3)}" fill="${tone(P.core, h)}" opacity="0.38" filter="url(#sf)"/>`;
        if (core && rnd() < 0.7) g += slide(1.0 + rnd() * 0.25, tone(P.core, h), (rnd() - 0.5) * 4);
        // dry brush: thin dragged strokes of mid tone across the shadow
        for (let k = 0; k < 3; k++) g += dab(cx - rx * (0.9 - rnd() * 0.9), cy + ry * (rnd() - 0.45) * 0.9, rx * (0.2 + rnd() * 0.3), 0.7 + rnd() * 1.1, tone(P.mid, h), 0.55);
        s += `<g clip-path="url(#c${i})">${g}</g>`;
        // ... and wisps pulled off the edge of the mass
        for (let k = 0; k < 2; k++) {
            const left = rnd() < 0.5, y = cy - ry * (0.1 + rnd() * 0.7);
            s += dab(left ? cx - rx * (1.02 + rnd() * 0.12) : cx + rx * (0.7 + rnd() * 0.2), y, rx * (0.16 + rnd() * 0.22), 0.8 + rnd() * 1.2, left ? tone(P.sh, h) : tone(P.lt, h), 0.7);
        }
    });
    defs += linear('h', [0, base - hazeBand - 1, 0, base], [[0, P.haze, 0], [0.7, P.haze, 0.7], [1, P.haze, 0.95]], ' gradientUnits="userSpaceOnUse"') + blurDef('b', 9, box) + blurDef('sf', Math.max(2, Math.min(box[2], box[3]) * 0.03), box);
    // soft passages: a bloom where the light piles up, and the haze that swallows the foot of the cloud
    const [bx, by, br] = [box[0] + box[2] * 0.66, top + (base - top) * 0.34, box[2] * 0.2];
    s += `<ellipse cx="${f(bx)}" cy="${f(by)}" rx="${f(br)}" ry="${f(br * 0.8)}" fill="${P.bloom}" opacity="0.12" filter="url(#b)"/>`;
    if (hazeBand) s += rect(box[0], base - hazeBand, box[2], hazeBand, 'url(#h)');
    svg(name, box, `<defs>${defs}</defs>${s}`);
}

const CLOUD_A = [
    [158, 138, 31, 23], [126, 164, 40, 30], [162, 192, 52, 36], [116, 226, 62, 40],
    [172, 262, 72, 36], [92, 270, 76, 36], [222, 296, 42, 20], [54, 290, 52, 24], [125, 304, 122, 28],
];
const CLOUD_B = [[306, 219, 22, 17], [326, 240, 30, 21], [292, 258, 34, 22], [318, 280, 48, 24], [302, 306, 84, 20]];
const CLOUD_FAR = [[26, 311, 52, 9], [22, 298, 26, 13], [112, 313, 46, 7], [192, 310, 58, 9], [182, 301, 22, 9], [262, 314, 40, 6], [338, 311, 44, 8]];
for (const [suffix, P] of [['', CLOUD.day], ['-lit', CLOUD.lit]]) {
    cloud(`cloud-far${suffix}`, [-8, 270, 376, 52], CLOUD_FAR, P, { seed: 31, haze: 0.42, top: 284, L: [0.94, -0.34], hazeBand: 16, maxBumps: 8, core: false });
    cloud(`cloud-b${suffix}`, [196, 180, 176, 142], CLOUD_B, P, { seed: 52, haze: 0.2, top: 200, L: [0.62, -0.78], hazeBand: 34 });
    cloud(`cloud-a${suffix}`, [-8, 96, 280, 226], CLOUD_A.slice(0, 4), P, { seed: 73, top: 112, hazeBand: 0 });
    cloud(`cloud-a2${suffix}`, [-8, 96, 280, 226], CLOUD_A.slice(4), P, { seed: 74, top: 112, hazeBand: 50 });
}

/* Scud: low dark strips that slide in front of the tower once the sky burns; lit from underneath. */
{
    const box = [-8, 120, 376, 150];
    const rnd = rng(140);
    let s = '';
    // each strip is a run of flat dabs of uneven size, ragged at both ends, with the sun caught underneath
    for (const [x, y, len, th] of [[70, 242, 118, 7], [-6, 192, 76, 5.5], [244, 178, 90, 5.5], [172, 258, 58, 4]]) {
        const n = Math.round(len / 8);
        let sh = '', mid = '', lt = '', hi = '';
        for (let i = 0; i <= n; i++) {
            const u = i / n, w = Math.sin(u * Math.PI) ** 0.7, cx = x + u * len + (rnd() - 0.5) * 5;
            const rx = 7 + rnd() * 12, ry = th * w * (0.25 + rnd() * 0.55) + 0.6, cy = y - ry * 0.5 + (rnd() - 0.5) * 2;
            sh += fill(closed(blob(rnd, cx, cy, rx, ry, 7, 0.26, 0.4), 0.5), '#454070');
            if (rnd() < 0.7) mid += dab(cx - rx * 0.6, cy + ry * 0.5, rx * (1 + rnd()), 1 + rnd() * 1.6, '#7A5A8A', 0.9);
            if (rnd() < 0.55) lt += dab(cx - rx * 0.3, cy + ry * 0.62 + 0.6, rx * (0.7 + rnd()), 0.7 + rnd() * 1.1, '#DE8280', 0.9);
            if (rnd() < 0.3) hi += dab(cx, cy + ry * 0.7 + 1, rx * (0.5 + rnd() * 0.6), 0.5 + rnd() * 0.5, '#FBC79C');
        }
        // dragged ends
        for (let k = 0; k < 7; k++) {
            const end = rnd() < 0.5, l = 10 + rnd() * 26;
            sh += dab(end ? x - l * (0.4 + rnd() * 0.7) : x + len - l * 0.3 + rnd() * 10, y - rnd() * th * 0.7 + (rnd() - 0.3) * 3, l, 0.6 + rnd() * 1.2, '#454070', 0.45 + rnd() * 0.4);
        }
        s += sh + mid + lt + hi;
    }
    svg('scud', box, s);
}

/* ---------- stars and the shooting star ---------- */
{
    const box = [-8, -8, 376, 240];
    const rnd = rng(205);
    let s = '', n = 0;
    const defs = radial('h', [[0, '#FFFFFF', 0.55], [0.4, '#BFD0FF', 0.2], [1, '#BFD0FF', 0]]);
    while (n < 9) {
        const x = rnd() * 360, y = Math.pow(rnd(), 1.25) * 205;
        if (x > 190 && y > 140) continue;
        const k = rnd();
        const r = k > 0.93 ? 1.25 : k > 0.7 ? 0.8 : 0.45 + rnd() * 0.2;
        const fade = 1 - clamp((y - 110) / 110) * 0.7;
        if (k > 0.93) s += `<circle cx="${f(x)}" cy="${f(y)}" r="5" fill="url(#h)"/>`;
        s += circ(x, y, r, rnd() < 0.3 ? '#FFE9C8' : rnd() < 0.5 ? '#CFE0FF' : '#FFFFFF', (0.55 + rnd() * 0.45) * fade);
        n++;
    }
    // the evening star, low and steady
    s += `<circle cx="236" cy="122" r="7" fill="url(#h)"/>` + circ(236, 122, 1.6, '#FFFFFF');
    svg('stars', box, `<defs>${defs}</defs>${s}`);
}
{
    // head at lower left (travelling down-left), tail fading up-right
    const box = [0, 0, 80, 36];
    const defs = linear('t', [8, 31, 78, 3], [[0, '#FFFFFF', 1], [0.12, '#FFF2D0', 0.85], [0.5, '#BFD0FF', 0.3], [1, '#BFD0FF', 0]], ' gradientUnits="userSpaceOnUse"') +
        radial('h', [[0, '#FFFFFF', 0.9], [0.35, '#FFF2D0', 0.4], [1, '#FFF2D0', 0]]);
    svg('meteor', box, `<defs>${defs}</defs><polygon points="7.4,30.2 78,2.4 78,3.4 8.6,32" fill="url(#t)"/><circle cx="8" cy="31" r="4.5" fill="url(#h)"/><circle cx="8" cy="31" r="1.2" fill="#FFFFFF"/>`);
}

/* ---------- the town beyond the tracks ---------- */

const GROUND = {
    day: {
        headFar: '#A99DBD', headNear: '#8A84A8', headLit: '#C3AFC2',
        roof: '#5C5E86', roofLit: '#8B86AA', roofDk: '#474A70', ridge: '#C9BCD2', wall: '#C2B2BE', wallLit: '#E6D3CC', wallSh: '#8F86A4', win: '#4C4D74', winWarm: '#4C4D74',
        tree: ['#3E5560', '#52706A', '#7C9A7C'], fence: '#6C5F76', pole: '#4A4566', poleLit: '#9A90B2', wire: '#3D3958',
        ballast: '#7F7A94', dab1: '#948EA8', dab2: '#666080', rail: '#E6DCE6', railSh: '#49445F', sleeper: '#5A546E', deck: '#5E5A78',
        road: '#6C6886', patch: '#7A7592', crack: '#585470', paint: '#D2C9D8', verge: '#5E706C', verge2: '#4D6062',
        weed: ['#3C5856', '#58786A', '#8CA684'], flower: '#EBA6B8', flowerC: '#FFF0D0',
        metal: '#5C5878', metalLit: '#A69EBA', yellow: '#DDB548', yellowLit: '#F2D67A', black: '#2F2B46', lens: '#74344A', lensHi: '#A8607A',
        mirror: '#DC8A48', mirrorFace: '#DCC9D4', mirrorLow: '#9A90B0', plate: '#D8D0DA', cone: '#C8623E',
    },
    lit: {
        headFar: '#76548A', headNear: '#443A72', headLit: '#C87088',
        roof: '#2C2960', roofLit: '#604A7A', roofDk: '#1C1946', ridge: '#F7A27C', wall: '#4A3A74', wallLit: '#B46C80', wallSh: '#2B2658', win: '#19163E', winWarm: '#5C3550',
        tree: ['#1A1C3E', '#282B50', '#5C4872'], fence: '#241E46', pole: '#1D1940', poleLit: '#EC8E6E', wire: '#17143A',
        ballast: '#372F60', dab1: '#473A70', dab2: '#28224C', rail: '#F9AC82', railSh: '#19153A', sleeper: '#211C46', deck: '#292352',
        road: '#322A5C', patch: '#3D326A', crack: '#221D48', paint: '#927498', verge: '#272A50', verge2: '#1E2146',
        weed: ['#191C3E', '#292E52', '#70527E'], flower: '#D0668E', flowerC: '#FFC890',
        metal: '#28234E', metalLit: '#E48A70', yellow: '#A9803C', yellowLit: '#FFB868', black: '#120F2C', lens: '#4A1C36', lensHi: '#8A3A50',
        mirror: '#B8602E', mirrorFace: '#F6966C', mirrorLow: '#5A4A82', plate: '#7A5E94', cone: '#8A3A3E',
    },
};

/** Window lights and lamps the night version switches on: [x, y, w, h] in canvas units. */
const LIT_WINDOWS = [];
const FAR_LIGHTS = [];

function town(name, P, collect) {
    const box = [-8, 180, 376, 220];
    const rnd = rng(301);
    let s = '';
    // far shore: two headlands, flat tones with a lit top edge
    const ridgeLine = (x0, x1, y0, amp, step, sd) => {
        const r = rng(sd), pts = [];
        for (let x = x0; x <= x1 + step; x += step) pts.push([x, y0 - amp * (0.3 + 0.7 * Math.abs(Math.sin(x * 0.021 + sd))) * (0.6 + r() * 0.5)]);
        return pts;
    };
    const head = (pts, c, yb) => `<path d="${open(pts)}L${f(pts[pts.length - 1][0])} ${yb}L${f(pts[0][0])} ${yb}z" fill="${c}"/>`;
    const far = ridgeLine(-12, 372, 320, 9, 22, 3);
    s += head(far, P.headFar, 324);
    s += `<path d="${open(far.map(p => [p[0], p[1] + 0.5]))}" fill="none" stroke="${P.headLit}" stroke-width="0.7" opacity="0.7"/>`;
    const near = ridgeLine(196, 372, 321, 15, 16, 8).map((p, i) => [p[0], p[1] + Math.max(0, 5 - i) * 2.8]);
    s += head(near, P.headNear, 326);
    if (collect) for (let i = 0; i < 16; i++) FAR_LIGHTS.push([20 + rnd() * 330, 319.5 + rnd() * 3, 0.5 + rnd() * 0.4]);
    else for (let i = 0; i < 16; i++) { rnd(); rnd(); rnd(); }

    const windows = (x, y, w, h, cols, rows, lit, uneven = 0) => {
        let o = '';
        const gw = w / cols, gh = h / rows;
        for (let r = 0; r < rows; r++) {
            const rowLit = uneven ? lit * (0.2 + rnd() * 1.7) : lit;
            for (let c = 0; c < cols; c++) {
                const blank = rnd() < uneven * 0.22, wide = rnd() < uneven * 0.3 && c < cols - 1, ww = uneven ? 0.42 + rnd() * 0.3 : 0.6, hh = uneven ? 0.4 + rnd() * 0.28 : 0.58;
                const on = rnd() < rowLit;
                if (blank) continue;
                const q = [x + c * gw + gw * 0.2, y + r * gh + gh * 0.2, wide ? gw * (1 + ww) : gw * ww, gh * hh];
                if (wide) c++;
                o += rect(q[0], q[1], q[2], q[3], on ? P.winWarm : P.win);
                o += rect(q[0], q[1] + q[3], q[2], 0.7, P.wallLit, 0.6);
                if (on && collect) LIT_WINDOWS.push(q);
            }
        }
        return o;
    };
    /** A hipped tile roof seen from above the eaves, over a strip of wall. */
    const hip = (x, ye, w, rh, wallH, cols, lit = 0.6) => {
        const inset = rh * 0.85;
        let o = rect(x + 3, ye, w - 6, wallH, P.wall) + rect(x + 3, ye, w - 6, 2.6, P.wallSh) + rect(x + w - 7, ye, 4, wallH, P.wallLit);
        if (cols) o += windows(x + 6, ye + 3.5, w - 16, wallH - 4, cols, 1, lit);
        o += poly([[x - 3, ye], [x + w + 3, ye], [x + w - inset, ye - rh], [x + inset, ye - rh]], P.roof);
        o += poly([[x + w + 3, ye], [x + w - inset, ye - rh], [x + w - inset - 3.5, ye - rh], [x + w - 4.5, ye]], P.roofLit);
        o += poly([[x - 3, ye], [x + inset, ye - rh], [x + inset + 2.5, ye - rh], [x + 2.5, ye]], P.roofDk);
        for (let k = 1; k < 4; k++) {
            const y = ye - (rh * k) / 4, dx = (inset * k) / 4;
            o += line(x + dx + 1, y, x + w - dx - 3, y, P.roofDk, 0.55, 0.7);
        }
        o += line(x + inset - 1, ye - rh, x + w - inset + 1, ye - rh, P.ridge, 1.4) + line(x - 3, ye + 0.3, x + w + 3, ye + 0.3, P.roofDk, 1.3);
        return o;
    };
    /** A house seen three-quarter: a roof plane toward us and its gable wall catching the sun. */
    const gable = (x, ye, w, rh, wallH, cols, lit = 0.6) => {
        const F = [x + w * 0.7, ye], B = [x + w, ye - rh * 0.22], A = [(F[0] + B[0]) / 2 - rh * 0.2, ye - rh];
        let o = rect(x + 2, ye, F[0] - x - 2, wallH, P.wall) + rect(x + 2, ye, F[0] - x - 2, 2.4, P.wallSh);
        if (cols) o += windows(x + 5, ye + 3, F[0] - x - 8, wallH - 3.5, cols, 1, lit);
        o += poly([F, A, B, [B[0], ye + wallH - rh * 0.22], [F[0], ye + wallH]], P.wallLit);
        o += rect((F[0] + B[0]) / 2 - 1.8, ye - rh * 0.34, 3.6, 3.2, P.win);
        o += poly([[x - 2.5, ye], [F[0] + 1.6, ye + 0.9], A, [x + rh * 0.4, ye - rh]], P.roof);
        for (let k = 1; k < 3; k++) { const t = k / 3; o += line(lerp(x - 1, x + rh * 0.4 + 1, t), ye - rh * t, lerp(F[0], A[0], t) - 1, ye - rh * t, P.roofDk, 0.55, 0.7); }
        o += line(x + rh * 0.4 - 0.6, ye - rh, A[0] + 0.4, A[1], P.ridge, 1.3) + line(A[0], A[1], F[0] + 1.6, ye + 0.9, P.roofDk, 1.5) + line(A[0], A[1] + 0.2, B[0] + 1.4, B[1] + 0.6, P.roofLit, 1.3);
        return o;
    };
    /** A flat-roofed concrete block. */
    const block = (x, yt, w, h, cols, rows, lit = 0.55) => {
        let o = rect(x, yt, w, h, P.wall) + rect(x + w - 5, yt, 5, h, P.wallLit) + rect(x, yt, w, 2.2, P.wallSh) + rect(x - 1, yt - 2, w + 2, 2.4, P.roofLit) + rect(x - 1, yt - 2, w + 2, 0.8, P.ridge);
        o += windows(x + 3, yt + 6, w - 10, h - 8, cols, rows, lit, 1);
        return o;
    };
    const tree = (cx, cy, r, sd) => {
        const t = rng(sd);
        let o = fill(closed(blob(t, cx, cy, r * 1.25, r, 9, 0.2, 0.9)), P.tree[0]);
        for (let i = 0; i < 5; i++) {
            const a = Math.PI + t() * Math.PI, x = cx + Math.cos(a) * r * 0.75, y = cy + Math.sin(a) * r * 0.6, q = r * (0.34 + t() * 0.2);
            o += fill(closed(blob(t, x, y, q * 1.2, q, 7, 0.2)), P.tree[0]);
            o += fill(closed(blob(t, x + q * 0.3, y - q * 0.18, q * 0.8, q * 0.66, 6, 0.2)), P.tree[1]);
            if (t() < 0.35) o += fill(closed(blob(t, x + q * 0.6, y - q * 0.34, q * 0.5, q * 0.24, 5, 0.2)), P.tree[2]);
        }
        return o;
    };

    // the lane drops away in the middle; far roofs, small, down by the water
    s += hip(150, 340, 26, 7, 5, 0) + gable(176, 344, 15, 6, 5, 0) + hip(189, 338, 22, 6, 5, 0) + block(164, 330, 15, 11, 3, 1, 0.5);
    s += tree(158, 349, 7, 5) + tree(203, 350, 8, 6);
    // guard rail where the lane starts down
    s += rect(142, 371, 78, 1.3, P.plate, 0.75);
    for (let x = 146; x < 220; x += 11 + rnd() * 3) s += rect(x, 371, 1.2, 9, P.metal);
    // far poles stepping down the lane
    s += rect(196.4, 300, 1.5, 62, P.pole) + rect(193.4, 304, 11, 1.1, P.pole) + rect(194.6, 309, 6.4, 0.9, P.pole) + rect(198.2, 314, 3, 4.4, P.metal) + rect(177.6, 318, 1.1, 36, P.pole) + rect(175.2, 321, 7, 0.9, P.pole) + rect(176, 324.6, 4.4, 0.8, P.pole);

    // left side, back to front
    s += block(-10, 296, 44, 100, 3, 4, 0.4);
    s += rect(4, 286, 12, 8.5, P.wallSh) + rect(13, 286, 3, 8.5, P.wallLit) + rect(3, 285, 14, 1.4, P.roofLit) + rect(22, 290, 1, 6, P.metal) + rect(26, 290, 1, 6, P.metal) + rect(20, 289.4, 12, 0.9, P.metal);
    s += tree(118, 352, 15, 11);
    s += hip(28, 345, 74, 19, 30, 4);
    s += rect(60, 352, 1.4, 16, P.metal) + rect(52, 361, 17, 1, P.metal);
    s += gable(88, 364, 50, 15, 24, 3);
    s += tree(134, 374, 9, 12);
    // right side
    s += block(292, 292, 80, 104, 4, 4, 0.42);
    // a shop awning and a blank board on its side: plain shapes, no writing
    s += rect(296, 282, 22, 8, P.wallSh) + rect(296, 282, 22, 1.2, P.roofLit) + rect(315, 282, 3, 8, P.wallLit);
    s += rect(340, 277, 1.1, 14, P.metal) + rect(346, 280, 1, 11, P.metal);
    s += tree(232, 356, 13, 13);
    s += hip(222, 351, 76, 21, 30, 4, 0.7);
    s += gable(204, 370, 44, 13, 18, 2);
    s += tree(286, 376, 10, 14);

    // pole on the far side of the line, right of the lane
    s += poly([[260.4, 398], [264.6, 398], [263.7, 190], [261.3, 190]], P.pole) + rect(263.1, 190, 0.9, 208, P.poleLit, 0.9);
    s += rect(249, 197, 27, 2, P.pole) + rect(253, 207.5, 19, 1.7, P.pole) + rect(249, 196.6, 27, 0.6, P.poleLit, 0.8);
    for (const x of [251, 257, 268, 273]) s += rect(x, 193.6, 1.5, 3.2, P.metalLit);
    s += rect(265, 222, 7.5, 12, P.metal) + rect(270.6, 222, 1.9, 12, P.metalLit) + rect(264.4, 220.6, 8.7, 1.6, P.pole);
    // its wires running on down the lane
    const sag = (x1, y1, x2, y2, d, w = 0.6) => `<path d="M${f(x1)} ${f(y1)}Q${f((x1 + x2) / 2)} ${f((y1 + y2) / 2 + d * 2)} ${f(x2)} ${f(y2)}" fill="none" stroke="${P.wire}" stroke-width="${w}"/>`;
    s += sag(252, 197, 194, 304, 5) + sag(272, 197, 204, 304, 6) + sag(262, 208, 197, 308, 5, 0.5) + sag(197, 305, 178, 321, 2, 0.45) + sag(262, 226, 300, 284, 4, 0.5);

    // fence along the far side of the line: leaning posts, two slack wires
    let fx = -8;
    const posts = [];
    while (fx < 372) {
        if (fx < 136 || fx > 226) {
            const hgt = 11 + rnd() * 5, lean = (rnd() - 0.5) * 2.4;
            s += poly([[fx, 390], [fx + 1.8, 390], [fx + 1.6 + lean, 390 - hgt], [fx + 0.3 + lean, 390 - hgt]], P.fence);
            posts.push([fx + 0.9 + lean * 0.6, 390 - hgt * 0.72]);
        } else posts.push(null);
        fx += 11 + rnd() * 7;
    }
    for (let i = 1; i < posts.length; i++) if (posts[i] && posts[i - 1]) {
        const [a, b] = [posts[i - 1], posts[i]];
        s += sag(a[0], a[1], b[0], b[1], 0.7, 0.45) + sag(a[0], a[1] + 4.5, b[0], b[1] + 4.5, 0.9, 0.45);
    }
    svg(name, box, s);
}
town('town', GROUND.day, true);
town('town-lit', GROUND.lit, false);

/* ---------- the near side: line, road, crossing furniture, pole, weeds ---------- */

const PIVOT_L = [58, 350], PIVOT_R = [297, 351];
const LAMP_A = [316, 275], LAMP_B = [316, 292.5];
const STREET_LAMP = [61, 185];

function ground(name, P) {
    const box = [-8, -8, 376, 466];
    const rnd = rng(407);
    let s = '';
    // ballast and rails
    const bed = [];
    for (let x = -12; x <= 374; x += 16) bed.push([x, 384 + (rnd() - 0.5) * 1.6]);
    s += `<path d="${open(bed)}L374 402L-12 402z" fill="${P.ballast}"/>`;
    for (let i = 0; i < 70; i++) s += dab(-8 + rnd() * 370, 386 + rnd() * 13, 2 + rnd() * 5, 0.7 + rnd() * 0.9, rnd() < 0.5 ? P.dab1 : P.dab2);
    for (let x = -6; x < 370; x += 8.5 + rnd() * 1.5) s += poly([[x, 387.4], [x + 3.4, 387.4], [x + 3.9 + (x - 180) * 0.012, 394.6], [x - 0.3 + (x - 180) * 0.012, 394.6]], P.sleeper);
    // verges
    s += poly([[-12, 399], [100, 399], [14, 462], [-12, 462]], P.verge) + poly([[260, 399], [372, 399], [372, 462], [346, 462]], P.verge);
    for (let i = 0; i < 16; i++) {
        const left = i % 2 === 0, y = 402 + rnd() * 54, x = left ? -8 + rnd() * Math.max(6, 96 - (y - 399) * 1.38) : 372 - rnd() * Math.max(6, 100 - (y - 399) * 1.38);
        s += dab(x, y, 8 + rnd() * 16, 1.4 + rnd() * 1.8, P.verge2);
    }
    // road: worn asphalt, patched, with plain painted edge lines and a stop band
    s += poly([[100, 399], [260, 399], [346, 462], [14, 462]], P.road);
    s += poly([[104, 383.4], [256, 383.4], [261, 399.4], [99, 399.4]], P.deck);
    s += poly([[150, 412], [214, 410], [236, 436], [182, 441], [140, 432]], P.patch) + poly([[226, 448], [300, 446], [312, 462], [220, 462]], P.patch, 0.8) + poly([[60, 440], [112, 436], [108, 452], [44, 456]], P.patch, 0.7);
    s += `<path d="M168 399L164 414L171 426L166 444M214 420L221 431L217 447" fill="none" stroke="${P.crack}" stroke-width="0.7"/>`;
    s += poly([[97, 404], [263, 404], [270.5, 409.5], [89.5, 409.5]], P.paint, 0.82);
    const edge = (x0, x1) => { let o = ''; for (let y = 412; y < 460; y += 13) { const u0 = (y - 399) / 63, u1 = (y + 8.5 - 399) / 63; o += poly([[lerp(x0, x1, u0), y], [lerp(x0, x1, u0) + 2.6, y], [lerp(x0, x1, u1) + 3, y + 8.5], [lerp(x0, x1, u1), y + 8.5]], P.paint, 0.7); } return o; };
    s += edge(106, 22) + edge(251.5, 335);
    // rails over everything on the bed
    s += rect(-8, 386, 376, 1.5, P.railSh) + rect(-8, 385.4, 376, 0.9, P.rail) + rect(-8, 394.2, 376, 2, P.railSh) + rect(-8, 393.4, 376, 1.2, P.rail);

    // --- the corner mirror
    s += rect(88.2, 318, 1.8, 84, P.mirror) + circ(89, 314, 10, P.mirror) + circ(89, 314, 8.2, P.mirrorFace);
    s += `<path d="M81.2 316.5A8.2 8.2 0 0 0 96.8 316.5Q89 313 81.2 316.5z" fill="${P.mirrorLow}"/>` + rect(85.6, 302.4, 6.8, 2.6, P.mirror);

    // --- barrier machines
    for (const [[px, py], w] of [[PIVOT_L, 14], [PIVOT_R, 13]]) {
        const x = px - w / 2;
        s += rect(x, py - 6, w, 60, P.metal) + rect(x + w - 3, py - 6, 3, 60, P.metalLit) + rect(x - 1.5, py + 50, w + 3, 5, P.black);
        for (let k = 0; k < 4; k++) s += poly([[x, py + 22 + k * 7], [x + w, py + 18 + k * 7], [x + w, py + 21.5 + k * 7], [x, py + 25.5 + k * 7]], k % 2 ? P.black : P.yellow);
        s += circ(px, py, 5.2, P.black) + circ(px, py, 2, P.metalLit);
    }

    // --- signal post: striped plate, two lamps one above the other, a blank plate
    s += rect(314.4, 240, 3.4, 164, P.metal) + rect(316.8, 240, 1, 164, P.metalLit) + rect(311, 400, 10, 5, P.black) + rect(313.6, 236, 5, 5, P.black);
    for (let k = 0; k < 12; k++) s += rect(314.4, 332 + k * 6, 3.4, 3, k % 2 ? P.black : P.yellow);
    s += rect(304, 245, 24, 9.6, P.black);
    for (let k = 0; k < 5; k++) s += poly([[305 + k * 5, 253.8], [308.2 + k * 5, 245.8], [310.6 + k * 5, 245.8], [307.4 + k * 5, 253.8]], P.yellow);
    s += `<rect x="306" y="262" width="20" height="42" rx="4" fill="${P.black}"/>`;
    [LAMP_A, LAMP_B].forEach(([lx, ly], i) => {
        // plain straight visors; the upper lamp is the darker of the two
        s += circ(lx, ly, 6, i ? mix(P.lens, P.lensHi, 0.5) : mix(P.lens, P.black, 0.4)) + circ(lx - 2, ly - 2.2, i ? 1.3 : 0.8, P.lensHi, i ? 1 : 0.6);
        s += rect(lx - 8.2, ly - 8.3, 16.4, 1.7, P.metal);
    });
    s += rect(311.4, 309, 9.4, 17, P.plate) + rect(318.6, 309, 2.2, 17, P.metalLit, 0.5);

    // --- the near pole: tall, off the top of the frame, with everything a pole carries
    s += poly([[26.6, 436], [34.2, 436], [32.6, -12], [28.6, -12]], P.pole) + poly([[32.6, 436], [34.2, 436], [32.6, -12], [31.6, -12]], P.poleLit);
    for (const y of [404, 372, 262, 214, 136, 78]) s += rect(27, y, 7.2, 1.3, P.black, 0.7);
    for (let k = 0; k < 9; k++) { const y = 392 - k * 17; s += rect(k % 2 ? 33.6 : 23.4, y, 4, 1, P.metal); }
    s += rect(8, 50, 46, 2.8, P.pole) + rect(8, 49.6, 46, 0.8, P.poleLit) + rect(13, 66, 36, 2.4, P.pole) + rect(13, 65.6, 36, 0.7, P.poleLit) + rect(18, 96, 26, 2, P.pole);
    for (const x of [10, 17.5, 42, 49.6]) s += rect(x, 45.4, 2, 4.4, P.metalLit) + rect(x - 0.6, 46.6, 3.2, 1, P.metal);
    for (const x of [15, 44.6]) s += rect(x, 62, 1.8, 4, P.metalLit);
    // transformer can
    s += `<rect x="35.6" y="112" width="14" height="25" rx="2.4" fill="${P.metal}"/>` + rect(46.2, 113.4, 2.6, 22, P.metalLit) + rect(34.6, 110, 16, 2.6, P.black) + rect(33, 120, 4, 1.6, P.black) + rect(33, 130, 4, 1.6, P.black) + rect(39, 105.6, 1.6, 5, P.metalLit) + rect(44.6, 105.6, 1.6, 5, P.metalLit);
    // street lamp arm and head
    s += `<path d="M32.6 196Q44 186 ${STREET_LAMP[0] - 5} ${STREET_LAMP[1] - 1.6}" fill="none" stroke="${P.metal}" stroke-width="1.5"/>` + `<path d="M${STREET_LAMP[0] - 7} ${STREET_LAMP[1] - 2.6}h12.5q1.6 0.4 1.2 2.6h-13.4z" fill="${P.metal}"/>` + rect(STREET_LAMP[0] - 5.6, STREET_LAMP[1], 9.4, 1.4, P.plate);
    // a meter box strapped to the pole
    s += rect(21.4, 152, 6, 11, P.metal) + rect(21.4, 152, 6, 1.6, P.black) + rect(26, 153.6, 1.4, 9.4, P.metalLit, 0.7);

    // --- wires
    const sag = (x1, y1, x2, y2, d, w = 0.7) => `<path d="M${f(x1)} ${f(y1)}Q${f((x1 + x2) / 2)} ${f((y1 + y2) / 2 + d * 2)} ${f(x2)} ${f(y2)}" fill="none" stroke="${P.wire}" stroke-width="${w}"/>`;
    // along the line, off both sides
    s += sag(10.8, 47, -12, 52, 1.5) + sag(18.4, 47, -12, 58, 2) + sag(43, 47, 372, 30, 26) + sag(50.6, 47, 372, 38, 27) + sag(45.4, 63, 372, 58, 26, 0.6);
    // across the tracks to the far pole, down the lane
    s += sag(50.6, 47, 250.6, 195, 13) + sag(43, 47, 258, 195, 15) + sag(45.4, 63, 262, 208, 17, 0.6) + sag(43, 97, 261, 223, 22, 1.1);
    // service drops
    s += sag(31, 98, -12, 262, 9, 0.6) + sag(36, 137, 62, 328, 8, 0.5) + sag(33, 97, 314, 238, 30, 0.5);
    // a splice box hanging on the thick cable
    s += rect(128, 173.5, 9, 4.4, P.black) + rect(135, 173.5, 2, 4.4, P.metalLit, 0.8);

    // --- weeds: flat blades in three tones, tallest in the corners
    const blade = (x, y, h, lean, w, c) => `<path d="M${f(x)} ${f(y)}Q${f(x + lean * 0.25)} ${f(y - h * 0.6)} ${f(x + lean)} ${f(y - h)}Q${f(x + lean * 0.45 + w)} ${f(y - h * 0.5)} ${f(x + w)} ${f(y)}z" fill="${c}"/>`;
    const tuft = (x0, x1, yb, hMax, nBlades, sd) => {
        const t = rng(sd);
        let o = '';
        for (let pass = 0; pass < 3; pass++) for (let i = 0; i < nBlades; i++) {
            const u = t(), x = lerp(x0, x1, u), edge = Math.min(Math.abs(x - x0), Math.abs(x - x1)) / Math.abs(x1 - x0);
            const h = hMax * (0.35 + t() * 0.65) * (pass === 0 ? 1 : pass === 1 ? 0.8 : 0.55) * (0.6 + edge * 1.2);
            o += blade(x, yb + t() * 6, h, (t() - 0.5) * h * 0.7, 2 + t() * 2.2, P.weed[pass]);
            if (pass === 1 && t() < 0.2) o += `<ellipse cx="${f(x + 1)}" cy="${f(yb - h * 0.86)}" rx="1.3" ry="4" fill="${P.weed[2]}" transform="rotate(${f((t() - 0.5) * 40)} ${f(x + 1)} ${f(yb - h * 0.86)})"/>`;
        }
        return o;
    };
    s += tuft(-10, 74, 458, 62, 26, 21) + tuft(286, 372, 458, 56, 26, 22) + tuft(70, 104, 404, 15, 7, 23) + tuft(262, 290, 404, 13, 7, 24) + tuft(322, 372, 406, 26, 10, 25) + tuft(-10, 24, 408, 30, 8, 26);
    const fr = rng(55);
    for (let i = 0; i < 13; i++) {
        const left = fr() < 0.5, x = left ? 2 + fr() * 62 : 298 + fr() * 62, y = 414 + fr() * 30, r = 1.5 + fr() * 0.9;
        s += line(x, y, x + (fr() - 0.5) * 3, y + 9 + fr() * 6, P.weed[1], 0.6) + circ(x, y, r, P.flower) + circ(x + 0.2, y - 0.1, r * 0.36, P.flowerC);
    }
    svg(name, box, s);
}
ground('ground', GROUND.day);
ground('ground-lit', GROUND.lit);

/* ---------- barrier arms ---------- */
function bar(name, box, [px, py], len, dir) {
    // dir +1: arm points right from its pivot; -1: points left
    const x = u => px + dir * u;
    let s = '';
    const t0 = 4.3, t1 = 3.1;
    const th = u => lerp(t0, t1, u / len);
    s += poly([[x(-15), py - 3.6], [x(0), py - 3.6], [x(0), py + 3.6], [x(-15), py + 3.6]], '#4A4668') + rect(Math.min(x(-15), x(-9)), py - 5, 6, 10, '#2C2842');
    const seg = 15.5;
    let k = 0;
    for (let u = 0; u < len; u += seg, k++) {
        const v = Math.min(len, u + seg), sl = 3.2;
        s += poly([[x(u + sl), py - th(u)], [x(Math.min(len, v + sl)), py - th(v)], [x(v - sl), py + th(v)], [x(Math.max(0, u - sl)), py + th(u)]], k % 2 ? '#2A2640' : '#E6B93E');
    }
    // painted volume: a light top edge, a shaded underside
    s += poly([[x(0), py - t0], [x(len), py - t1], [x(len), py - t1 + 0.9], [x(0), py - t0 + 1.1]], '#FFE9A6', 0.75);
    s += poly([[x(0), py + t0 - 1.4], [x(len), py + t1 - 1], [x(len), py + t1], [x(0), py + t0]], '#1E1A36', 0.45);
    s += poly([[x(len - 2.6), py - th(len - 2.6)], [x(len), py - t1], [x(len), py + t1], [x(len - 2.6), py + th(len - 2.6)]], '#2A2640');
    // two short hangers under the arm
    for (const u of [len * 0.42, len * 0.76]) s += rect(x(u) - 0.5, py + th(u) - 0.4, 1, 6.5, '#3A3654');
    s += circ(px, py, 4.2, '#2C2842') + circ(px, py, 1.6, '#A69EBA');
    svg(name, box, s);
}
bar('bar-l', [36, 336, 176, 28], PIVOT_L, 147, 1);
bar('bar-r', [200, 337, 116, 28], PIVOT_R, 90, -1);

/* ---------- warning lamps (lit state) ---------- */
for (const [name, [lx, ly]] of [['warn-a', LAMP_A], ['warn-b', LAMP_B]]) {
    const box = [lx - 22, ly - 22, 44, 44];
    const defs = radial('g', [[0, '#FF5A3C', 0.75], [0.3, '#FF3A3A', 0.38], [1, '#FF2A4A', 0]]);
    svg(name, box, `<defs>${defs}</defs><circle cx="${lx}" cy="${ly}" r="22" fill="url(#g)"/>${circ(lx, ly, 5.6, '#FF4632')}${circ(lx - 0.6, ly - 0.8, 3.5, '#FF8A5A')}${circ(lx - 1.4, ly - 1.8, 1.5, '#FFE0B0')}`);
}

/* ---------- the train: a streak of lit windows ---------- */
{
    const box = [0, 204, 900, 196];
    const rnd = rng(611);
    let body = '', lights = '';
    const top = 226, bot = 392;
    let x = 40;
    for (let car = 0; car < 3; car++) {
        const len = 262;
        body += `<rect x="${x}" y="${top}" width="${len}" height="${bot - top}" rx="7" fill="#3D3A66"/>` + rect(x, top, len, 9, '#2A2850') + rect(x, 318, len, 7, '#C86A48') + rect(x, 325, len, 3, '#E6D2C0') + rect(x, 350, len, 42, '#252248');
        body += rect(x + 30, top - 7, 60, 8, '#2A2850') + rect(x + 160, top - 7, 66, 8, '#2A2850');
        // windows: a long lit band broken by doors and pillars
        let wx = x + 12;
        while (wx < x + len - 22) {
            const door = rnd() < 0.26, w = door ? 11 : 20 + rnd() * 14;
            lights += rect(wx, door ? 262 : 258, w, door ? 44 : 40, rnd() < 0.5 ? '#FFE6A8' : '#FFD88A') + rect(wx, 258 + 26, w, 14, '#F2B870', 0.55);
            wx += w + (door ? 5 : 3.5) + rnd() * 3;
        }
        if (car < 2) body += rect(x + len - 4, top + 10, 15, bot - top - 10, '#2A2850');
        x += len + 7;
    }
    const defs = `<filter id="m" filterUnits="userSpaceOnUse" x="-60" y="190" width="1020" height="220"><feGaussianBlur stdDeviation="16 0.5"/></filter>` +
        `<filter id="l" filterUnits="userSpaceOnUse" x="-60" y="190" width="1020" height="220"><feGaussianBlur stdDeviation="9 0.4"/></filter>` +
        linear('spill', [0, 240, 0, 330], [[0, '#FFD88A', 0], [0.5, '#FFD88A', 0.3], [1, '#FFD88A', 0]], ' gradientUnits="userSpaceOnUse"');
    svg('train', box, `<defs>${defs}</defs><g filter="url(#m)">${body}</g><g filter="url(#l)">${lights}</g><rect x="40" y="240" width="800" height="90" fill="url(#spill)"/>`);
}

/* ---------- lights that come on ---------- */
{
    const box = [-8, 180, 376, 220];
    const rnd = rng(702);
    let glow = '', core = '';
    for (const [x, y, w, h] of LIT_WINDOWS) {
        // every room has its own lamp: amber, pale, a cool tube, or a dim one behind a curtain
        const k = rnd();
        const [c, o] = k < 0.34 ? ['#FFC878', 1] : k < 0.56 ? ['#FFE9B8', 1] : k < 0.72 ? ['#DCE8D8', 0.9] : k < 0.88 ? ['#E89C80', 0.75] : ['#F2B070', 0.5];
        if (k < 0.6) glow += `<ellipse cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" rx="${f(w * 0.7 + 1)}" ry="${f(h * 0.7 + 1)}" fill="#FFB470" opacity="0.26"/>`;
        core += rect(x, y, w, h, c, o) + (rnd() < 0.5 ? rect(x, y + h * 0.6, w, h * 0.4, '#D88A5C', 0.45) : rect(x, y, w, h * (0.25 + rnd() * 0.3), '#6A4860', 0.55));
    }
    for (const [x, y, r] of FAR_LIGHTS) core += circ(x, y, r, rnd() < 0.3 ? '#FFF0C8' : '#FFC878', 0.9);
    // the lamp on the far pole and two down the lane
    for (const [x, y, r] of [[263, 240, 1.5], [197, 311, 0.9], [178, 324, 0.7]]) { glow += circ(x, y, r * 4.5, '#FFE2A0', 0.5); core += circ(x, y, r, '#FFF6D8'); }
    svg('lights', box, `<defs>${blurDef('g', 2.2, box)}</defs><g filter="url(#g)">${glow}</g>${core}`);
}
{
    // the street lamp on the near pole: its head, the air around it and a pool on the road
    const box = [-8, 150, 190, 310];
    const [lx, ly] = STREET_LAMP;
    const defs = radial('a', [[0, '#FFF4D0', 0.85], [0.18, '#FFE2A0', 0.42], [0.55, '#FFC878', 0.12], [1, '#FFC878', 0]]) +
        linear('c', [0, ly, 0, 420], [[0, '#FFE2A0', 0.16], [1, '#FFE2A0', 0.01]], ' gradientUnits="userSpaceOnUse"') +
        radial('p', [[0, '#FFD890', 0.42], [0.6, '#FFC070', 0.16], [1, '#FFC070', 0]]);
    svg('lamp-st', box, `<defs>${defs}</defs><polygon points="${lx - 5},${ly + 1} ${lx + 4},${ly + 1} 122,418 22,418" fill="url(#c)"/><ellipse cx="72" cy="418" rx="62" ry="13" fill="url(#p)"/><circle cx="${lx}" cy="${ly + 1}" r="34" fill="url(#a)"/><rect x="${lx - 5.4}" y="${ly}" width="9" height="1.8" rx="0.9" fill="#FFFBEA"/>`);
}

for (const [n, b] of Object.entries(BOX)) console.log(n.padEnd(14), JSON.stringify(b));
