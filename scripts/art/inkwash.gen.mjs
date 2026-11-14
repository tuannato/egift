// Generator for the "inkwash" wrapper art, in INK WASH (thuỷ mặc): a silk scroll on xuan paper, and inside
// it a landscape built the way a wash is built. Nothing here is a flat cut shape:
//   - every wash is painted THROUGH a wet mask: its silhouette plus beads of water along the edge, blurred
//     and thresholded, so the edge creeps and beads like ink in wet paper (the gate allows no feTurbulence
//     or feDisplacementMap, so the bleeding is made from noise in this script and blur + feColorMatrix);
//   - inside the mask, several translucent washes lie over each other, graded from ink to bare paper,
//     with pooled pigment along the edge (a blurred darker rim) and backruns;
//   - dry-brush: bundles of broken hair strokes; paper: fibres.
// Five inks (scorched, dense, heavy, light, clear), ivory paper, one vermilion.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/inkwash.gen.mjs && node scripts/wrap-art.mjs --write
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'inkwash');
if (!OUT.endsWith('wrappers/inkwash')) throw new Error('out dir must be public/wrappers/inkwash');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The five inks, the papers, the one vermilion. */
const INK = { scorched: '#15120F', dense: '#302C28', heavy: '#5E5A53', light: '#9A958A', clear: '#C6C1B4' };
const PAPER = { xuan: '#E7E0CF', xuanHi: '#F0EADB', sheet: '#F6F1E4', sheetLo: '#EBE4D2', silk: '#C5BFB0', silkLo: '#A9A394', fibreDark: '#6F6654', fibreLight: '#FFFDF5' };
const RED = { mid: '#C7391F', deep: '#9E2A16', hi: '#DE5B3A' };

/* Geometry (open state). */
const SX0 = 40, SX1 = 320, STOP = 137, SBOT = 330; // the sheet
const PX0 = 54, PX1 = 306, PY0 = 150, PY1 = 318; // the painting
const ROLL_Y = 222, ROLL_R = 19; // the rolled scroll, closed

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

/** Smooth value noise in -1..1, and its fractal sum. */
function vnoise(seed) {
    const r = rng(seed);
    const t = Array.from({ length: 256 }, () => r() * 2 - 1);
    return x => {
        const i = Math.floor(x), fr = x - i, u = fr * fr * (3 - 2 * fr);
        const a = t[i & 255], b = t[(i + 1) & 255];
        return a + (b - a) * u;
    };
}
function fbm(n, x, oct = 4) {
    let s = 0, a = 1, q = 1, tot = 0;
    for (let k = 0; k < oct; k++) {
        s += a * n(x * q + k * 17.3);
        tot += a;
        a *= 0.5;
        q *= 2;
    }
    return s / tot;
}

const BOX = {};
function svg(name, box, defs, inner) {
    BOX[name] = box;
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${inner}</svg>`;
    writeFileSync(join(OUT, `${name}.svg`), s);
}

/* ---------- The brush kit ---------- */
const region = ([x, y, w, h]) => `filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"`;
/** A plain blur. */
const blur = (id, box, sd) => `<filter id="${id}" ${region(box)}><feGaussianBlur stdDeviation="${sd}"/></filter>`;
/** The wet edge: blur, threshold the alpha (shapes and beads run together), then soften a hair. */
const wet = (id, box, sd = 1.3, soft = 0.45, gain = 12, cut = -5) =>
    `<filter id="${id}" ${region(box)}><feGaussianBlur stdDeviation="${sd}" result="b"/>` +
    `<feColorMatrix in="b" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${gain} ${cut}" result="g"/>` +
    `<feGaussianBlur in="g" stdDeviation="${soft}"/></filter>`;
const lin = (id, x1, y1, x2, y2, stops) =>
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}">` +
    stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('') + '</linearGradient>';
const rad = (id, cx, cy, r, stops) =>
    `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">` +
    stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('') + '</radialGradient>';

const line = pts => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('');
/** A smooth curve through points (Catmull-Rom as cubics). */
function curve(pts, closed = false) {
    const n = pts.length;
    const P = i => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
        const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
        d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + (closed ? 'Z' : '');
}
/** A puddle: a closed curve whose radius wanders. */
function puddle(seed, cx, cy, rx, ry, wobble = 0.22, n = 13) {
    const r = rng(seed);
    const pts = [];
    for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const m = 1 + (r() - 0.5) * 2 * wobble;
        pts.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
    }
    return curve(pts, true);
}
/** Beads of water along a line of points: what makes an edge creep. */
function beads(seed, pts, { every = 2, rMin = 0.6, rMax = 2.1, off = 1.4 } = {}) {
    const r = rng(seed);
    let s = '';
    for (let i = 0; i < pts.length; i += every) {
        if (r() < 0.25) continue;
        const [x, y] = pts[i];
        s += `<circle cx="${f(x + (r() - 0.5) * 2 * off)}" cy="${f(y + (r() - 0.5) * 2 * off)}" r="${f(rMin + r() * r() * (rMax - rMin))}" fill="#fff"/>`;
    }
    return s;
}
/** Paper fibres in a rectangle. */
function fibres(seed, [x0, y0, x1, y1], n, { light = 0.5, dark = 0.1 } = {}) {
    const r = rng(seed);
    let s = '';
    for (let k = 0; k < n; k++) {
        const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
        const len = 1.2 + r() * r() * 7;
        const ang = r() * Math.PI;
        const bend = (r() - 0.5) * len * 0.5;
        const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
        const isLight = r() < 0.45;
        s += `<path d="M${f(x)} ${f(y)}q${f(dx / 2 - (dy / len) * bend)} ${f(dy / 2 + (dx / len) * bend)} ${f(dx)} ${f(dy)}" fill="none" stroke="${isLight ? PAPER.fibreLight : PAPER.fibreDark}" stroke-width="${f2(0.22 + r() * 0.22)}" stroke-opacity="${f2((isLight ? light : dark) * (0.5 + r() * 0.7))}"/>`;
    }
    return s;
}
/**
 * Dry brush: a bundle of hairs running along `pts`, each breaking where the brush ran out of ink.
 * `w` is the bundle's width; the hairs lie side by side across it.
 */
function dry(seed, pts, { w = 3, hairs = 6, colour = INK.dense, op = 0.5, hair = 0.5, gap = 1 } = {}) {
    const r = rng(seed);
    let s = '';
    for (let h = 0; h < hairs; h++) {
        const o = (h / Math.max(1, hairs - 1) - 0.5) * w + (r() - 0.5) * 0.4;
        const moved = pts.map(([x, y], i) => {
            const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
            const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
            return [x - (ty / l) * o, y + (tx / l) * o];
        });
        const dash = [];
        for (let k = 0; k < 6; k++) dash.push(f(1.5 + r() * 9), f((0.4 + r() * r() * 5) * gap));
        s += `<path d="${curve(moved)}" fill="none" stroke="${colour}" stroke-width="${f2(hair * (0.6 + r() * 0.8))}" stroke-opacity="${f2(op * (0.45 + r() * 0.75))}" stroke-dasharray="${dash.join(' ')}" stroke-dashoffset="${f(r() * 20)}" stroke-linecap="round"/>`;
    }
    return s;
}
/** A brush stroke that swells and tapers: an outline around a spine, `w(t)` half-widths. */
function stroke(pts, w0, w1, wMid = Math.max(w0, w1)) {
    const n = pts.length;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
        const w = (1 - t) * (1 - t) * w0 + 2 * t * (1 - t) * wMid + t * t * w1;
        L.push([pts[i][0] - (ty / l) * w, pts[i][1] + (tx / l) * w]);
        R.push([pts[i][0] + (ty / l) * w, pts[i][1] - (tx / l) * w]);
    }
    return curve([...L, ...R.reverse()], true);
}

/** One long tapered pass of the brush (used before `lens` is defined further down). */
function sweepStroke(a, b, w, bend) {
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    const nx = -ty / l, ny = tx / l, mx = (a[0] + b[0]) / 2 + nx * bend, my = (a[1] + b[1]) / 2 + ny * bend;
    return `M${f(a[0])} ${f(a[1])}Q${f(mx + nx * w)} ${f(my + ny * w)} ${f(b[0])} ${f(b[1])}Q${f(mx - nx * w)} ${f(my - ny * w)} ${f(a[0])} ${f(a[1])}Z`;
}

/* ---------- The xuan paper under everything ---------- */
{
    const box = [-12, -12, 384, 474];
    svg('paper', box,
        rad('g', 180, 215, 300, [[0, PAPER.xuanHi], [0.6, PAPER.xuan], [1, '#D9D1BD']]) +
        blur('b', box, 14) + blur('b2', box, 0.9),
        `<rect x="-12" y="-12" width="384" height="474" fill="url(#g)"/>` +
        // the damp: broad, barely-there tides in the paper
        `<g filter="url(#b)" opacity="0.5">` +
        `<path d="${puddle(3, 60, 120, 90, 60, 0.3)}" fill="${INK.clear}" fill-opacity="0.35"/>` +
        `<path d="${puddle(4, 310, 330, 100, 70, 0.3)}" fill="${INK.clear}" fill-opacity="0.4"/>` +
        `<path d="${puddle(5, 190, 420, 150, 40, 0.3)}" fill="${INK.light}" fill-opacity="0.22"/>` +
        `</g>` +
        // one broad, nearly dry sweep of pale ink across the middle, behind where the scroll lies
        `<path d="${puddle(6, 180, 226, 190, 30, 0.2, 15)}" fill="${INK.clear}" fill-opacity="0.5" filter="url(#b)"/>` +
        `<g filter="url(#b2)">` + (() => {
            const q = rng(8);
            let t = '';
            for (let k = 0; k < 16; k++) {
                const x = -10 + q() * 250, y = 262 - x * 0.2 + (q() - 0.5) * 44, l = 90 + q() * 130;
                t += `<path d="${sweepStroke([x, y], [x + l, y - l * (0.18 + q() * 0.06)], 1.2 + q() * 3.2, (q() - 0.5) * 6)}" fill="${q() < 0.3 ? INK.heavy : INK.light}" fill-opacity="${f2(0.1 + q() * 0.16)}"/>`;
            }
            return t;
        })() + `</g>` +
        fibres(1, [-12, -12, 372, 462], 320, { light: 0.75, dark: 0.13 }));
}

/* ---------- Ink blooms: drops let fall on wet paper. Almost bare inside, pigment carried out to a dark, crinkled rim ---------- */
{
    const box = [-12, -12, 384, 474];
    let defs = wet('w', box, 1.5, 0.9, 10, -4) + blur('s', box, 1.1) + blur('s2', box, 7) + blur('s3', box, 3);
    let body = '';
    const blooms = [
        // cx, cy, r, strength
        [58, 104, 44, 0.5], [318, 318, 54, 0.52], [300, 96, 26, 0.42], [44, 352, 34, 0.46], [214, 398, 30, 0.42], [132, 300, 17, 0.4], [262, 268, 12, 0.4],
    ];
    blooms.forEach(([cx, cy, R, k], i) => {
        const r = rng(40 + i);
        const n = 28;
        const edge = [], inner = [];
        const nz = vnoise(60 + i);
        for (let j = 0; j < n; j++) {
            const a = (j / n) * Math.PI * 2;
            const m = 1 + fbm(nz, j * 0.5, 2) * 0.3 + fbm(nz, j * 1.9 + 30, 2) * 0.1;
            edge.push([cx + Math.cos(a) * R * m, cy + Math.sin(a) * R * m * 0.86]);
            inner.push([cx + Math.cos(a) * R * m * 0.6 + R * 0.06, cy + Math.sin(a) * R * m * 0.5 + R * 0.05]);
        }
        const sil = curve(edge, true), sil2 = curve(inner, true);
        let sat = '';
        for (let j = 0; j < 6; j++) {
            const a = r() * Math.PI * 2, d = R * (1.08 + r() * 0.4);
            sat += `<circle cx="${f(cx + Math.cos(a) * d)}" cy="${f(cy + Math.sin(a) * d * 0.86)}" r="${f(0.6 + r() * r() * 2.6)}" fill="#fff"/>`;
        }
        defs += `<mask id="m${i}" maskUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"><g filter="url(#w)"><path d="${sil}" fill="#fff"/>${beads(80 + i, edge, { every: 2, rMax: 2.6, off: 2 })}${sat}</g></mask>` +
            rad(`g${i}`, cx, cy, R * 1.3, [[0, INK.clear, 0], [0.5, INK.clear, 0.1], [0.8, INK.light, 0.3], [1, INK.heavy, 0.5]]);
        body += `<g opacity="${k}">` +
            // the damp spreading past the edge
            `<ellipse cx="${cx}" cy="${cy}" rx="${f(R * 1.05)}" ry="${f(R * 0.9)}" fill="${INK.light}" fill-opacity="0.3" filter="url(#s2)"/>` +
            `<g mask="url(#m${i})">` +
            `<rect x="${f(cx - R * 1.7)}" y="${f(cy - R * 1.6)}" width="${f(R * 3.4)}" height="${f(R * 3.2)}" fill="url(#g${i})"/>` +
            // the tide line: pigment carried to the edge and left there, feathering inward
            `<path d="${sil}" fill="none" stroke="${INK.heavy}" stroke-opacity="0.5" stroke-width="${f(5 + R * 0.08)}" filter="url(#s3)"/>` +
            `<path d="${sil}" fill="none" stroke="${INK.dense}" stroke-opacity="0.85" stroke-width="1.5" filter="url(#s)"/>` +
            // a backrun: a second, fainter tide inside the first
            `<path d="${sil2}" fill="none" stroke="${INK.heavy}" stroke-opacity="0.26" stroke-width="1" filter="url(#s3)"/>` +
            `</g></g>`;
    });
    // spatter
    const r = rng(7);
    let spat = '';
    for (let k = 0; k < 40; k++) {
        const x = 10 + r() * 340, y = 40 + r() * 390;
        spat += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.3 + r() * r() * 1.4)}" fill="${INK.dense}" fill-opacity="${f2(0.12 + r() * 0.28)}"/>`;
    }
    svg('bloom', box, defs, body + `<g filter="url(#s)">${spat}</g>`);
}
/* ---------- Bamboo painted on the under-paper, pale: a spray from the top right, a sprig from the bottom left ---------- */
{
    const box = [-12, -12, 384, 474];
    const r = rng(11);
    let leaves = '', stalks = '';
    // stalks: jointed strokes, each joint one press of the brush
    const stalk = (x0, y0, x1, y1, w, n, col, op) => {
        let s = '';
        for (let k = 0; k < n; k++) {
            const a = k / n + 0.012, b = (k + 1) / n - 0.012;
            const bow = Math.sin(((a + b) / 2) * Math.PI) * 9;
            const P = t => [x0 + (x1 - x0) * t + bow * 0.5 * t, y0 + (y1 - y0) * t - bow * 0.2];
            const A = P(a), B = P(b), M = P((a + b) / 2);
            s += `<path d="${stroke([A, M, B], w * 1.12, w * 1.12, w * 0.82)}" fill="${col}" fill-opacity="${f2(op * (0.8 + r() * 0.3))}"/>`;
            s += `<path d="M${f(B[0] - w * 1.5)} ${f(B[1] + 0.4)}q${f(w * 1.5)} ${f(-1.4)} ${f(w * 3)} 0" fill="none" stroke="${INK.dense}" stroke-opacity="${f2(op * 0.9)}" stroke-width="0.7" stroke-linecap="round"/>`;
        }
        return s;
    };
    stalks += stalk(352, 204, 322, 22, 3.1, 5, INK.light, 0.62);
    stalks += stalk(336, 206, 290, 26, 1.7, 6, INK.clear, 0.7);
    stalks += stalk(14, 452, 40, 268, 2.6, 5, INK.light, 0.55);
    // leaves: one press and a flick each, in hands of three to five
    const leaf = (x, y, ang, len, w, col, op) => {
        const pts = [];
        for (let k = 0; k <= 4; k++) {
            const t = k / 4;
            const sag = Math.sin(t * Math.PI) * len * 0.06;
            pts.push([x + Math.cos(ang) * len * t - Math.sin(ang) * sag, y + Math.sin(ang) * len * t + Math.cos(ang) * sag]);
        }
        return `<path d="${stroke(pts, 0.25, 0.05, w)}" fill="${col}" fill-opacity="${f2(op)}"/>`;
    };
    const hands = [
        // x, y, heading (deg, 90 = straight down), leaves, size, ink, which way the twig goes back
        [318, 66, 150, 5, 40, 'heavy', 1], [300, 108, 128, 4, 34, 'light', 1], [338, 122, 108, 4, 30, 'heavy', 1],
        [286, 52, 168, 3, 30, 'light', 1], [322, 156, 136, 4, 30, 'light', 1], [270, 88, 150, 3, 24, 'clear', 1], [344, 60, 80, 3, 28, 'light', 1],
        [262, 60, 170, 4, 34, 'light', 1], [240, 104, 152, 3, 26, 'clear', 1], [52, 300, 20, 4, 34, 'light', -1], [40, 348, 42, 5, 38, 'heavy', -1], [62, 372, 28, 3, 28, 'light', -1], [34, 402, 50, 4, 30, 'clear', -1],
    ];
    for (const [x, y, head, n, size, ink, back] of hands) {
        for (let k = 0; k < n; k++) {
            const ang = ((head + (k - (n - 1) / 2) * 21 + (r() - 0.5) * 8) * Math.PI) / 180;
            const len = size * (0.72 + r() * 0.4);
            leaves += leaf(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3, ang, len, len * 0.085 + 0.9, INK[ink], ink === 'heavy' ? 0.6 : 0.58);
        }
        // the twig the hand grows from
        stalks += `<path d="M${f(x)} ${f(y)}q${f(8 * back)} ${f(-5 * back)} ${f(18 * back)} ${f(-4 * back)}" fill="none" stroke="${INK.light}" stroke-opacity="0.5" stroke-width="0.8" stroke-linecap="round"/>`;
    }
    svg('bamboo', box, blur('a', box, 0.55) + blur('b', box, 2.6),
        // a soft flood under the marks, then the marks themselves, a little wet
        `<g filter="url(#b)" opacity="0.45">${leaves}</g><g filter="url(#a)">${stalks}${leaves}</g>`);
}
/* ---------- The sheet: silk mount and the painting's paper ---------- */
{
    const box = [34, STOP, 296, 200];
    const r = rng(21);
    // faint cloud-tides in the silk
    let tides = '';
    for (let k = 0; k < 16; k++) {
        const x = SX0 + r() * (SX1 - SX0), y = STOP + r() * (SBOT - STOP);
        tides += `<path d="${puddle(200 + k, x, y, 10 + r() * 16, 5 + r() * 7, 0.3, 9)}" fill="${r() < 0.5 ? PAPER.fibreLight : INK.heavy}" fill-opacity="${f2(0.1 + r() * 0.12)}"/>`;
    }
    // the weave of the silk: fine broken threads
    let weave = '';
    for (let y = STOP + 1.2; y < SBOT; y += 2.3) weave += `<path d="M${SX0} ${f(y)}H${SX1}" stroke="${INK.heavy}" stroke-opacity="${f2(0.07 + r() * 0.07)}" stroke-width="0.35" stroke-dasharray="${f(3 + r() * 8)} ${f(1 + r() * 3)} ${f(6 + r() * 14)} ${f(0.6 + r() * 2)}" stroke-dashoffset="${f(r() * 30)}"/>`;
    svg('sheet', box,
        blur('sh', box, 3.4) + blur('t', box, 3) + blur('e', box, 0.7) +
        lin('silk', 0, STOP, 0, SBOT, [[0, '#BDB7A8'], [0.5, PAPER.silk], [1, '#B6B0A1']]) +
        rad('age', 180, 234, 190, [[0, PAPER.sheet, 0], [0.7, PAPER.sheetLo, 0.25], [1, '#D8CFB8', 0.75]]) +
        `<clipPath id="c"><rect x="${SX0}" y="${STOP}" width="${SX1 - SX0}" height="${SBOT - STOP}"/></clipPath>` +
        `<clipPath id="p"><rect x="${PX0}" y="${PY0}" width="${PX1 - PX0}" height="${PY1 - PY0}"/></clipPath>`,
        // the sheet's soft shadow on the paper under it
        `<rect x="${SX0 + 2}" y="${STOP + 3}" width="${SX1 - SX0}" height="${SBOT - STOP}" fill="${INK.scorched}" fill-opacity="0.34" filter="url(#sh)"/>` +
        `<rect x="${SX0}" y="${STOP}" width="${SX1 - SX0}" height="${SBOT - STOP}" fill="url(#silk)"/>` +
        `<g clip-path="url(#c)"><g filter="url(#t)">${tides}</g>${weave}` +
        // a soft dark edge left and right, where the silk turns under
        `<rect x="${SX0 - 2}" y="${STOP}" width="4" height="${SBOT - STOP}" fill="${INK.dense}" fill-opacity="0.3" filter="url(#e)"/>` +
        `<rect x="${SX1 - 2}" y="${STOP}" width="4" height="${SBOT - STOP}" fill="${INK.dense}" fill-opacity="0.3" filter="url(#e)"/></g>` +
        // two dark strips of silk above and below the painting
        `<rect x="${PX0 - 3}" y="${PY0 - 5.4}" width="${PX1 - PX0 + 6}" height="2.6" fill="${INK.dense}" fill-opacity="0.7" filter="url(#e)"/>` +
        `<rect x="${PX0 - 3}" y="${PY1 + 2.8}" width="${PX1 - PX0 + 6}" height="2.6" fill="${INK.dense}" fill-opacity="0.7" filter="url(#e)"/>` +
        // the painting's paper, pressed a hair into the silk
        `<rect x="${PX0 - 0.8}" y="${PY0 - 0.8}" width="${PX1 - PX0 + 1.6}" height="${PY1 - PY0 + 1.6}" fill="${INK.dense}" fill-opacity="0.4" filter="url(#e)"/>` +
        `<rect x="${PX0}" y="${PY0}" width="${PX1 - PX0}" height="${PY1 - PY0}" fill="${PAPER.sheet}"/>` +
        `<rect x="${PX0}" y="${PY0}" width="${PX1 - PX0}" height="${PY1 - PY0}" fill="url(#age)"/>` +
        `<g clip-path="url(#p)">${fibres(22, [PX0, PY0, PX1, PY1], 150, { light: 0.9, dark: 0.1 })}</g>`);
}

/* ---------- The painting ---------- */
const PBOX = [PX0, PY0, PX1 - PX0, PY1 - PY0];
const clipP = `<clipPath id="p"><rect x="${PX0}" y="${PY0}" width="${PX1 - PX0}" height="${PY1 - PY0}"/></clipPath>`;
const maskAttr = `maskUnits="userSpaceOnUse" x="${PX0}" y="${PY0}" width="${PX1 - PX0}" height="${PY1 - PY0}"`;
/**
 * Peaks: the ridge's height at x is the tallest of a set of bumps, roughened. A bump is
 * [centre, height, left width, right width, p, q]: its profile is (1 - d^p)^q, a spire for small p, a dome for large.
 */
function ridge(seed, base, peaks, rough, x0 = PX0 - 6, x1 = PX1 + 6, step = 2) {
    const n = vnoise(seed);
    const pts = [];
    for (let x = x0; x <= x1 + 0.01; x += step) {
        let h = 0;
        for (const [cx, ht, wl, wr, p = 1.5, q = 1.25] of peaks) {
            const d = Math.abs(x - cx) / (x < cx ? wl : wr);
            if (d < 1) h = Math.max(h, ht * Math.pow(1 - Math.pow(d, p), q));
        }
        pts.push([x, base - h + fbm(n, x * 0.09, 3) * rough + fbm(n, x * 0.33 + 50, 2) * rough * 0.4]);
    }
    return pts;
}
/** One touch of the brush from a to b: a lens `w` wide at its middle, bowed sideways by `bend`. */
function lens(a, b, w, bend = 0) {
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    const nx = -ty / l, ny = tx / l, mx = (a[0] + b[0]) / 2 + nx * bend, my = (a[1] + b[1]) / 2 + ny * bend;
    return `M${f(a[0])} ${f(a[1])}Q${f(mx + nx * w)} ${f(my + ny * w)} ${f(b[0])} ${f(b[1])}Q${f(mx - nx * w)} ${f(my - ny * w)} ${f(a[0])} ${f(a[1])}Z`;
}
/** Texture strokes (cun): short tapered touches dragged down a face, following its fall. */
function cun(seed, x, y, len, lean, n, { colour = INK.scorched, op = 0.5, spread = 5, w = 0.5 } = {}) {
    const r = rng(seed);
    let s = '';
    for (let k = 0; k < n; k++) {
        const ox = (r() - 0.5) * spread * 2, t0 = r() * 0.62;
        const l = len * (0.22 + r() * 0.42);
        const xa = x + ox + lean * len * t0, ya = y + len * t0 + Math.abs(ox) * 0.7;
        const ln = lean + (r() - 0.5) * 0.3;
        s += `<path d="${lens([xa, ya], [xa + ln * l, ya + l], w * (0.6 + r() * 0.8), (r() - 0.5) * 0.9)}" fill="${colour}" fill-opacity="${f2(op * (0.35 + r() * 0.85))}"/>`;
    }
    return s;
}
/** Moss dots (dian): small flat dabs scattered along a line of points. */
function dabs(seed, pts, n, { colour = INK.scorched, op = 0.8, size = 1, dy = 0, spread = 2 } = {}) {
    const r = rng(seed);
    let s = '';
    for (let k = 0; k < n; k++) {
        const [x, y] = pts[Math.floor(r() * pts.length)];
        s += `<ellipse cx="${f(x + (r() - 0.5) * 3)}" cy="${f(y + dy + (r() - 0.3) * spread)}" rx="${f(size * (0.5 + r() * 0.8))}" ry="${f(size * (0.28 + r() * 0.3))}" fill="${colour}" fill-opacity="${f2(op * (0.5 + r() * 0.5))}"/>`;
    }
    return s;
}
const below = (pts, y) => line(pts) + `L${f(pts[pts.length - 1][0])} ${y}L${f(pts[0][0])} ${y}Z`;
const yAt = (pts, x) => {
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
    return best[1];
};

// The far range: the clearest ink, and the sky's first pale wash. Opaque paper under it, so the sun can rise behind.
const FAR = ridge(101, 240, [[84, 22, 40, 52, 1.6], [128, 30, 34, 44, 1.5], [176, 15, 44, 40, 1.8], [234, 33, 50, 36, 1.4], [284, 24, 34, 44, 1.7], [314, 14, 30, 30]], 3.2);
{
    const sil = below(FAR, PY1 + 4);
    // The layer's box starts at the sheet's top edge: it unrolls with the sheet, so the paper is never bare.
    svg('far', [PX0, STOP, PX1 - PX0, PY1 - STOP],
        clipP + wet('w', PBOX, 1.5, 0.6) + blur('s', PBOX, 1.4) + blur('s2', PBOX, 7) + blur('s3', PBOX, 0.5) +
        lin('fade', 0, 222, 0, 276, [[0, '#000', 0], [1, '#000', 1]]) +
        lin('tone', 0, 204, 0, 270, [[0, INK.light, 0.95], [0.5, INK.clear, 0.8], [1, INK.clear, 0.1]]) +
        lin('under', 0, 204, 0, 262, [[0, PAPER.sheet, 0.97], [0.7, PAPER.sheet, 0.9], [1, PAPER.sheet, 0]]) +
        lin('sky', 0, PY0, 0, 214, [[0, INK.light, 0.3], [0.6, INK.clear, 0.14], [1, INK.clear, 0]]) +
        `<mask id="m" ${maskAttr}><g filter="url(#w)"><path d="${sil}" fill="#fff"/>${beads(102, FAR, { every: 1, rMax: 2.3, off: 1.6 })}</g>` +
        `<rect x="${PX0}" y="220" width="${PX1 - PX0}" height="100" fill="url(#fade)"/></mask>`,
        `<g clip-path="url(#p)">` +
        // the sky: a wash laid from the top, uneven, with one long cloud left bare
        `<rect x="${PX0}" y="${PY0}" width="${PX1 - PX0}" height="70" fill="url(#sky)"/>` +
        `<g filter="url(#s2)"><path d="${puddle(103, 110, 160, 70, 9, 0.35)}" fill="${INK.light}" fill-opacity="0.22"/><path d="${puddle(104, 262, 156, 48, 7, 0.35)}" fill="${INK.light}" fill-opacity="0.2"/>` +
        `<path d="${puddle(105, 170, 186, 86, 6, 0.3)}" fill="${PAPER.sheet}" fill-opacity="0.8"/></g>` +
        `<path d="${line(FAR)}" fill="none" stroke="${PAPER.sheet}" stroke-width="3" stroke-opacity="0.9" filter="url(#s)" transform="translate(0 -1)"/>` +
        `<g mask="url(#m)">` +
        `<rect x="${PX0}" y="196" width="${PX1 - PX0}" height="124" fill="url(#under)"/>` +
        `<rect x="${PX0}" y="196" width="${PX1 - PX0}" height="124" fill="url(#tone)"/>` +
        // a second, bluer-grey flood on the shaded flanks
        `<g filter="url(#s)">` + [[92, 0], [136, 1], [240, 2], [288, 3]].map(([x, k]) => `<path d="${puddle(110 + k, x + 6, yAt(FAR, x) + 16, 10, 15, 0.3, 9)}" fill="${INK.light}" fill-opacity="0.34"/>`).join('') + `</g>` +
        // pigment pooled along the ridge
        `<path d="${line(FAR)}" fill="none" stroke="${INK.heavy}" stroke-opacity="0.5" stroke-width="1.5" filter="url(#s3)" transform="translate(0 1)"/>` +
        `</g></g>`);
}

// The middle range: steep pillars in heavy ink, standing in mist. No two alike: a leaning spire, domes, shoulders.
const MID_PEAKS = [
    [197, 103, 13, 17, 1.1, 1.5], [209, 70, 8, 13, 2, 0.8],
    [157, 68, 13, 10, 2.2, 0.8], [145, 44, 12, 8, 1.6, 1],
    [229, 74, 8, 12, 1.6, 1.1],
    [262, 58, 13, 9, 2.2, 0.75], [274, 40, 7, 11, 1.4, 1.2],
    [298, 46, 9, 14, 1.9, 0.9], [118, 30, 14, 11, 1.6],
];
const MID = ridge(131, 268, MID_PEAKS, 3);
{
    const sil = below(MID, PY1 + 4);
    let marks = '';
    MID_PEAKS.slice(0, 8).forEach(([x, h, wl, wr], k) => {
        // the shaded right face, and a few touches on the left
        marks += cun(140 + k, x + wr * 0.3, yAt(MID, x + wr * 0.3) + 2, h * 0.5, 0.34, 9, { spread: wr * 0.3, w: 0.55, op: 0.55 });
        marks += cun(150 + k, x - wl * 0.3, yAt(MID, x - wl * 0.3) + 3, h * 0.4, -0.3, 4, { spread: wl * 0.25, w: 0.4, op: 0.35 });
    });
    svg('mid', PBOX,
        clipP + wet('w', PBOX, 1.25, 0.45) + blur('s', PBOX, 1.8) + blur('s3', PBOX, 0.55) + blur('s4', PBOX, 0.3) +
        lin('fade', 0, 232, 0, 276, [[0, '#000', 0], [1, '#000', 1]]) +
        lin('tone', 0, 164, 0, 272, [[0, INK.dense, 0.92], [0.35, INK.heavy, 0.85], [0.75, INK.light, 0.6], [1, INK.clear, 0.1]]) +
        lin('under', 0, 164, 0, 268, [[0, PAPER.sheet, 0.95], [0.6, PAPER.sheet, 0.85], [1, PAPER.sheet, 0]]) +
        `<mask id="m" ${maskAttr}><g filter="url(#w)"><path d="${sil}" fill="#fff"/>${beads(132, MID, { every: 1, rMax: 1.9, off: 1.2 })}</g>` +
        `<rect x="${PX0}" y="230" width="${PX1 - PX0}" height="90" fill="url(#fade)"/></mask>`,
        `<g clip-path="url(#p)"><g mask="url(#m)">` +
        `<rect x="${PX0}" y="156" width="${PX1 - PX0}" height="164" fill="url(#under)"/>` +
        `<rect x="${PX0}" y="156" width="${PX1 - PX0}" height="164" fill="url(#tone)"/>` +
        // lit flanks left bare, shaded flanks flooded again
        `<g filter="url(#s)">` +
        MID_PEAKS.slice(0, 8).map(([x, h, wl, wr], k) =>
            `<path d="${puddle(160 + k, x - wl * 0.4, 268 - h * 0.48, wl * 0.24, h * 0.4, 0.3, 9)}" fill="${PAPER.sheet}" fill-opacity="0.5"/>` +
            `<path d="${puddle(170 + k, x + wr * 0.36, 268 - h * 0.52, wr * 0.3, h * 0.44, 0.3, 9)}" fill="${INK.scorched}" fill-opacity="0.42"/>`).join('') +
        `</g>` +
        `<g filter="url(#s4)">${marks}${dabs(134, MID.filter((_, i) => (i >> 2) % 2 === 0), 30, { op: 0.7, size: 0.9, dy: 1, spread: 4 })}</g>` +
        `<path d="${line(MID)}" fill="none" stroke="${INK.scorched}" stroke-opacity="0.6" stroke-width="1.5" filter="url(#s3)" transform="translate(0 0.9)"/>` +
        `</g></g>`);
}
// Mist: bare paper drifting between the ranges. It thins to nothing before the painting's edges, so it may drift.
function mist(name, seed, bands, sd, top = 196) {
    const box = [PX0 - 30, top, PX1 - PX0 + 60, 322 - top];
    let s = '';
    bands.forEach(([cx, cy, rx, ry, op], k) => {
        s += `<path d="${puddle(seed + k, cx, cy, rx, ry, 0.28, 11)}" fill="${PAPER.sheet}" fill-opacity="${op}"/>`;
    });
    svg(name, box,
        blur('b', box, sd) +
        lin('side', PX0, 0, PX1, 0, [[0, '#000'], [0.14, '#fff'], [0.86, '#fff'], [1, '#000']]) +
        `<mask id="m" maskUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"><rect x="${PX0}" y="${box[1]}" width="${PX1 - PX0}" height="${box[3]}" fill="url(#side)"/></mask>`,
        `<g mask="url(#m)"><g filter="url(#b)">${s}</g></g>`);
}
// mist-a unrolls with the sheet (its box starts at the sheet's top edge), so it is there while the scroll opens.
mist('mist-a', 300, [[120, 252, 76, 8, 0.95], [226, 258, 80, 9, 0.95], [176, 244, 44, 5, 0.8], [280, 246, 34, 5, 0.8], [96, 236, 34, 4, 0.7], [250, 234, 30, 3.5, 0.6]], 4.2, STOP);
mist('mist-b', 320, [[210, 282, 90, 9, 0.95], [130, 290, 62, 6, 0.8], [262, 272, 50, 6, 0.9], [176, 266, 44, 5, 0.75], [214, 236, 34, 3.6, 0.8], [276, 226, 24, 3, 0.7], [160, 222, 22, 2.8, 0.65]], 4.4);
// The near bank: a crag in the densest ink, with pines; the water, a boat, a low spit of land on the right.
{
    const r = rng(171);
    const n = vnoise(172);
    // the crag's outline: up from the left edge to a leaning head, then stepping down in ledges to the water
    const top = [];
    const prof = [[48, 252], [57, 246], [63, 233], [70, 226], [76, 216], [86, 211], [95, 213], [99, 222], [101, 236], [110, 240], [121, 243], [125, 254], [128, 266], [138, 270], [148, 274], [153, 284], [160, 291], [172, 294], [184, 297]];
    for (let i = 0; i < prof.length - 1; i++) {
        const [xa, ya] = prof[i], [xb, yb] = prof[i + 1];
        const steps = Math.max(2, Math.round(Math.hypot(xb - xa, yb - ya) / 2));
        for (let k = 0; k < steps; k++) {
            const t = k / steps;
            const x = xa + (xb - xa) * t, y = ya + (yb - ya) * t;
            top.push([x, y + fbm(n, x * 0.16, 3) * 2]);
        }
    }
    const sil = line(top) + `L184 ${PY1 + 4}L48 ${PY1 + 4}Z`;
    // the far spit on the right
    const spit = [];
    for (let x = 236; x <= 312; x += 2) spit.push([x, 304 - 5 * Math.exp(-Math.pow((x - 286) / 22, 2)) - 2.4 * Math.exp(-Math.pow((x - 258) / 9, 2)) + fbm(n, x * 0.2 + 40, 3) * 0.9 + Math.max(0, 244 - x) * 0.5]);
    const spitSil = line(spit) + `L312 309L236 308Z`;
    // texture: tapered touches down each face; long dark seams where the rock breaks
    let marks = '';
    const faces = [[72, 232, 46, -0.22, 12], [86, 218, 60, 0.05, 14], [97, 226, 56, 0.2, 12], [108, 246, 50, 0.22, 12], [124, 258, 44, 0.3, 10], [140, 276, 34, 0.4, 9], [62, 262, 50, -0.1, 10], [156, 292, 22, 0.5, 6]];
    faces.forEach(([x, y, len, lean, m], k) => {
        marks += cun(180 + k, x, y, len, lean, Math.round(m * 0.7), { spread: 5.5, w: 0.7, op: 0.7 });
    });
    const seams = [[[86, 213], [84, 236], [78, 262], [76, 290]], [[99, 224], [103, 250], [100, 280], [104, 306]], [[125, 256], [122, 276], [128, 300]], [[70, 228], [64, 250], [62, 276]], [[148, 276], [146, 292], [150, 310]]];
    for (const p of seams) marks += `<path d="${stroke(p, 0.2, 0.1, 0.8)}" fill="${INK.scorched}" fill-opacity="0.85"/>`;
    // pines: a trunk, a few arms, flat fans of needles
    let pines = '', pineWash = '';
    const fan = (x, y, size, tilt) => {
        let d = '';
        const m = 9;
        for (let k = 0; k < m; k++) {
            const a = ((-170 + (k / (m - 1)) * 160 + tilt + (r() - 0.5) * 8) * Math.PI) / 180;
            const l = size * (0.7 + r() * 0.45);
            d += `M${f(x)} ${f(y)}l${f(Math.cos(a) * l)} ${f(Math.sin(a) * l * 0.62)}`;
        }
        pineWash += `<ellipse cx="${f(x)}" cy="${f(y - size * 0.22)}" rx="${f(size * 0.95)}" ry="${f(size * 0.46)}" fill="${INK.heavy}" fill-opacity="0.42"/>`;
        return `<path d="${d}" stroke="${INK.scorched}" stroke-width="${f2(0.4 + r() * 0.12)}" stroke-opacity="${f2(0.8 + r() * 0.2)}" stroke-linecap="round" stroke-dasharray="${f(1.6 + r() * 1.4)} ${f(0.3 + r() * 0.5)} ${f(0.8 + r())} ${f(0.3 + r() * 0.4)}" fill="none"/>`;
    };
    const pine = (x, y, h, lean, seed) => {
        const q = rng(seed);
        const spine = [];
        for (let k = 0; k <= 7; k++) {
            const t = k / 7;
            spine.push([x + lean * t * h + Math.sin(t * 5 + seed) * 1.3, y - t * h]);
        }
        let s = `<path d="${stroke(spine, 1.25, 0.3, 0.85)}" fill="${INK.scorched}"/>`;
        const arms = [[0.5, -1, 0.5], [0.66, 1, 0.56], [0.8, -1, 0.42], [0.92, 1, 0.36], [1, 0, 0.3]];
        for (const [t, side, len] of arms) {
            const bx = x + lean * t * h + Math.sin(t * 5 + seed) * 1.3, by = y - t * h;
            const ex = bx + side * h * len * (0.8 + q() * 0.4), ey = by - h * 0.05 - q() * 2 + Math.abs(side) * 1.5;
            if (side !== 0) s += `<path d="${stroke([[bx, by], [(bx + ex) / 2, (by + ey) / 2 - 1.2], [ex, ey]], 0.5, 0.15, 0.36)}" fill="${INK.scorched}"/>`;
            s += fan(ex, ey + 0.4, h * 0.2 + 1.6, side * 8);
            if (side !== 0) s += fan((bx + ex) / 2 + side * 1.5, (by + ey) / 2 - 1.4, h * 0.15 + 1.3, side * 6);
        }
        return s;
    };
    pines += pine(87, 213, 28, 0.22, 1) + pine(100, 224, 21, 0.44, 2) + pine(73, 222, 18, -0.24, 3) + pine(123, 246, 15, 0.32, 4);
    // the boat and its boatman, in a few touches
    const bx = 216, by = 298;
    const boat =
        `<path d="M${bx - 10} ${by - 0.6}C${bx - 5} ${by + 2.6} ${bx + 5} ${by + 2.6} ${bx + 11} ${by - 1.4}C${bx + 6} ${by + 0.5} ${bx - 4} ${by + 0.7} ${bx - 10} ${by - 0.6}Z" fill="${INK.scorched}"/>` +
        `<path d="M${bx - 4.5} ${by + 0.2}C${bx - 4.4} ${by - 3.6} ${bx + 1.6} ${by - 3.6} ${bx + 1.8} ${by + 0.1}Z" fill="${INK.heavy}" fill-opacity="0.85"/>` +
        `<path d="M${bx + 5.6} ${by - 0.4}C${bx + 5.2} ${by - 2.6} ${bx + 6} ${by - 3.8} ${bx + 6.6} ${by - 4}C${bx + 7.4} ${by - 3.4} ${bx + 7.4} ${by - 1.6} ${bx + 7.2} ${by - 0.6}Z" fill="${INK.scorched}"/>` +
        `<path d="M${bx + 4.2} ${by - 4.2}L${bx + 6.6} ${by - 5.6}L${bx + 9} ${by - 4.2}Z" fill="${INK.dense}"/>` +
        `<path d="M${bx + 7.4} ${by - 3}L${bx + 13.4} ${by + 3.4}" stroke="${INK.scorched}" stroke-width="0.4" stroke-linecap="round"/>`;
    // the water: long, pale touches of a nearly dry brush
    let water = '';
    const rw = rng(240);
    const lines = [[196, 303, 64], [150, 311, 80], [240, 312, 56], [190, 296, 26], [262, 294, 34], [182, 315, 44], [226, 306, 30], [280, 314, 30]];
    for (const [x, y, l] of lines) {
        for (let k = 0; k < 3; k++) {
            const a = x - l / 2 + rw() * l * 0.6, len = l * (0.2 + rw() * 0.4), yy = y + (rw() - 0.5) * 1.6;
            water += `<path d="${lens([a, yy], [a + len, yy + (rw() - 0.5) * 0.6], 0.5 + rw() * 0.5)}" fill="${INK.heavy}" fill-opacity="${f2(0.3 + rw() * 0.4)}"/>`;
        }
    }
    svg('near', PBOX,
        clipP + wet('w', PBOX, 1.2, 0.4) + blur('s', PBOX, 2) + blur('s3', PBOX, 0.5) + blur('s4', PBOX, 0.28) + blur('s5', PBOX, 1.3) +
        lin('tone', 0, 212, 0, 318, [[0, INK.dense, 0.9], [0.3, INK.heavy, 0.85], [0.7, INK.light, 0.8], [1, INK.clear, 0.7]]) +
        lin('fade', 0, 290, 0, 322, [[0, '#000', 0], [1, '#000', 0.6]]) +
        lin('spitTone', 0, 296, 0, 309, [[0, INK.dense, 0.85], [1, INK.light, 0.15]]) +
        `<mask id="m" ${maskAttr}><g filter="url(#w)"><path d="${sil}" fill="#fff"/>${beads(173, top, { every: 1, rMax: 2, off: 1.3 })}</g>` +
        `<rect x="${PX0}" y="286" width="${PX1 - PX0}" height="40" fill="url(#fade)"/></mask>` +
        `<mask id="m2" ${maskAttr}><g filter="url(#w)"><path d="${spitSil}" fill="#fff"/>${beads(174, spit, { every: 1, rMax: 1.2, off: 0.7 })}</g></mask>`,
        `<g clip-path="url(#p)">` +
        `<g filter="url(#s4)">${water}</g>` +
        // the boat's reflection, and the spit
        `<ellipse cx="${bx}" cy="${by + 3.6}" rx="12" ry="1.6" fill="${INK.heavy}" fill-opacity="0.4" filter="url(#s5)"/>` +
        `<g mask="url(#m2)"><rect x="232" y="290" width="84" height="22" fill="url(#spitTone)"/></g>` +
        `<g filter="url(#s4)">${boat}</g>` +
        `<g mask="url(#m)">` +
        `<rect x="${PX0}" y="204" width="140" height="118" fill="${PAPER.sheet}"/>` +
        `<rect x="${PX0}" y="204" width="140" height="118" fill="url(#tone)"/>` +
        // lit faces left pale, hollows and overhangs flooded with the darkest ink
        `<g filter="url(#s)">` +
        `<path d="${puddle(175, 79, 240, 7, 20, 0.3, 9)}" fill="${PAPER.sheet}" fill-opacity="0.75"/><path d="${puddle(176, 114, 264, 7, 15, 0.3, 9)}" fill="${PAPER.sheet}" fill-opacity="0.7"/><path d="${puddle(181, 66, 274, 7, 18, 0.3, 9)}" fill="${PAPER.sheet}" fill-opacity="0.65"/><path d="${puddle(182, 140, 290, 10, 9, 0.3, 9)}" fill="${PAPER.sheet}" fill-opacity="0.65"/><path d="${puddle(186, 96, 296, 16, 10, 0.3, 9)}" fill="${PAPER.sheet}" fill-opacity="0.55"/>` +
        `<path d="${puddle(177, 95, 248, 5, 24, 0.3, 9)}" fill="${INK.scorched}" fill-opacity="0.6"/><path d="${puddle(178, 58, 300, 8, 13, 0.3, 9)}" fill="${INK.scorched}" fill-opacity="0.35"/><path d="${puddle(179, 127, 282, 5, 16, 0.3, 9)}" fill="${INK.scorched}" fill-opacity="0.5"/><path d="${puddle(184, 104, 232, 4, 8, 0.3, 9)}" fill="${INK.scorched}" fill-opacity="0.6"/>` +
        `</g>` +
        `<g filter="url(#s4)">${marks}${dabs(185, top.filter((_, i) => (i >> 2) % 3 !== 1), 34, { op: 0.9, size: 1.1, dy: 1.6, spread: 5 })}</g>` +
        `<path d="${line(top)}" fill="none" stroke="${INK.scorched}" stroke-opacity="0.85" stroke-width="1.7" filter="url(#s3)" transform="translate(0 1)"/>` +
        `</g>` +
        `<g filter="url(#s5)">${pineWash}</g><g filter="url(#s3)">${pines}</g>` +
        `</g>`);
}
/* ---------- The sun: the one vermilion, a small drop let fall wet, its rim washed pale ---------- */
{
    const cx = 262, cy = 171, R = 9;
    const box = [cx - 24, cy - 24, 48, 48];
    const edge = [];
    const n = vnoise(401);
    for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2;
        const m = 1 + fbm(n, k * 0.5, 2) * 0.03;
        edge.push([cx + Math.cos(a) * R * m, cy + Math.sin(a) * R * m]);
    }
    svg('sun', box,
        wet('w', box, 0.5, 0.5) + blur('h', box, 4.5) + blur('s', box, 0.8) + blur('s2', box, 2) +
        rad('g', cx - 1, cy - 1, R * 1.08, [[0, RED.mid], [0.55, RED.mid], [0.85, RED.hi], [1, '#EC9A7C']]) +
        `<mask id="m" maskUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="48" height="48"><g filter="url(#w)"><path d="${curve(edge, true)}" fill="#fff"/>${beads(402, edge, { every: 2, rMax: 0.6, rMin: 0.25, off: 0.3 })}</g></mask>`,
        // the bleed into the damp paper round it
        `<circle cx="${cx}" cy="${cy}" r="${R + 5}" fill="${RED.hi}" fill-opacity="0.24" filter="url(#h)"/>` +
        `<g mask="url(#m)"><rect x="${box[0]}" y="${box[1]}" width="48" height="48" fill="url(#g)"/>` +
        `<path d="${puddle(403, cx - 1, cy + 1, 4, 3.4, 0.3)}" fill="${RED.deep}" fill-opacity="0.35" filter="url(#s2)"/></g>`);
}
/* ---------- Two cranes, in a few strokes each ---------- */
{
    const box = [94, 146, 80, 36];
    // a crane heading left; (x, y) its body's middle, k its size, up: how high the wings are held
    const crane = (x, y, k, up) => {
        const T = ([a, b]) => [x + a * k, y + b * k];
        const P = pts => pts.map(T);
        const body = stroke(P([[-9, -1.2], [-3, -0.4], [4, 0.4], [10, 1.6]]), 0.7 * k, 0.5 * k, 3.1 * k);
        const neck = stroke(P([[-7.5, -1.2], [-13, -3.2], [-18, -4.6], [-21.5, -5]]), 1.15 * k, 0.5 * k, 0.75 * k);
        const head = `<ellipse cx="${f(x - 22 * k)}" cy="${f(y - 5.1 * k)}" rx="${f(1.5 * k)}" ry="${f(1.05 * k)}" fill="${PAPER.sheet}"/>`;
        const beak = `<path d="${stroke(P([[-23, -5.2], [-27.5, -5.5]]), 0.42 * k, 0.05 * k)}" fill="${INK.dense}"/>`;
        const legs = `<path d="${stroke(P([[9, 1.4], [15, 2.6], [22, 3.2]]), 0.5 * k, 0.12 * k, 0.3 * k)}" fill="${INK.scorched}"/>`;
        // a wing: a long blade from the shoulder, its outer edge and tip in black flight feathers
        const wing = (dx, lift, sweep, tone) => {
            const root = [-3 + dx, -1.6], tip = [3 + dx + sweep, -lift];
            const midL = [-4 + dx + sweep * 0.3, -lift * 0.55], midR = [5 + dx + sweep * 0.55, -lift * 0.42];
            const blade = `M${T([root[0] - 2.2, root[1]]).map(f).join(' ')}C${T(midL).map(f).join(' ')} ${T([tip[0] - 3, tip[1] + 2]).map(f).join(' ')} ${T(tip).map(f).join(' ')}C${T([tip[0] + 1.5, tip[1] + 5]).map(f).join(' ')} ${T(midR).map(f).join(' ')} ${T([root[0] + 6.5, root[1] + 1]).map(f).join(' ')}Z`;
            let s = `<path d="${blade}" fill="${tone}"/>`;
            // the black: trailing edge to the tip, as separate feather strokes
            for (let q = 0; q < 6; q++) {
                const t = 0.38 + q * 0.115;
                const a = [root[0] + 5.6 + (tip[0] - root[0] - 4.6) * t, root[1] + 0.8 + (tip[1] - root[1]) * t * 0.98];
                const b = [a[0] + 2.4 - t * 1.2, a[1] + 3.6 - t * 1.4];
                s += `<path d="${stroke(P([[a[0] - 1.6, a[1] - 1.2], a, b]), 0.5 * k, 0.1 * k, 0.75 * k)}" fill="${INK.scorched}" fill-opacity="${f2(0.6 + ((q * 37) % 10) / 25)}"/>`;
            }
            return s;
        };
        return `<g>${wing(1.5, up * 0.82, 4.5, '#DDD8CA')}</g>${legs}<path d="${body}" fill="${PAPER.sheet}"/><path d="${neck}" fill="${INK.scorched}"/>${head}${beak}${wing(0, up, 2, PAPER.sheet)}`;
    };
    const two = crane(126, 172, 1, 15) + crane(153, 162, 0.72, 11);
    svg('cranes', box, blur('a', box, 0.3) + blur('b', box, 1.5) + blur('c', box, 1),
        // a faint grey flood under each bird sets the white off the sky; the strokes bleed a little into it
        `<g filter="url(#b)" opacity="0.5"><ellipse cx="126" cy="167" rx="20" ry="9" fill="${INK.light}" fill-opacity="0.6"/><ellipse cx="153" cy="158" rx="14" ry="6.5" fill="${INK.light}" fill-opacity="0.6"/></g>` +
        `<g filter="url(#c)" opacity="0.3">${two}</g><g filter="url(#a)">${two}</g>`);
}

/* ---------- The seal: a plain, slightly chipped vermilion square with three abstract voids. Not a picture, not a character. ---------- */
{
    const x = 289, y = 297, s = 10;
    const box = [x - 3, y - 3, s + 6, s + 6];
    const r = rng(501);
    const j = () => (r() - 0.5) * 0.8;
    const sq = curve([[x + j(), y + j()], [x + s / 2, y + j() * 0.6], [x + s + j(), y + j()], [x + s + j() * 0.6, y + s / 2], [x + s + j(), y + s + j()], [x + s / 2, y + s + j() * 0.6], [x + j(), y + s + j()], [x + j() * 0.6, y + s / 2]], true);
    // chips out of the edge, and specks where the paste did not take
    let wear = '';
    const chips = [[x + 0.2, y + 2.6, 0.9], [x + s - 0.1, y + 7.2, 1], [x + 6.4, y + s, 0.8], [x + 3, y - 0.1, 0.6]];
    for (const [a, b, c] of chips) wear += `<path d="${puddle(510 + Math.round(a), a, b, c, c * 0.8, 0.3, 7)}" fill="${PAPER.sheet}"/>`;
    for (let k = 0; k < 8; k++) wear += `<circle cx="${f(x + r() * s)}" cy="${f(y + r() * s)}" r="${f(0.15 + r() * 0.3)}" fill="${PAPER.sheet}" fill-opacity="0.8"/>`;
    const voids =
        `<path d="${puddle(521, x + 3.3, y + 3.6, 1.5, 1.9, 0.3, 8)}" fill="${PAPER.sheet}"/>` +
        `<path d="${puddle(522, x + 6.9, y + 6.3, 1.9, 1.2, 0.3, 8)}" fill="${PAPER.sheet}"/>` +
        `<path d="${puddle(523, x + 7, y + 2.9, 0.9, 0.8, 0.25, 7)}" fill="${PAPER.sheet}"/>`;
    svg('seal', box, blur('a', box, 0.25) + blur('b', box, 1.2),
        `<path d="${sq}" fill="${RED.mid}" fill-opacity="0.3" filter="url(#b)"/>` +
        `<g filter="url(#a)"><path d="${sq}" fill="${RED.mid}"/>${voids}${wear}</g>`);
}
/* ---------- The scroll's wood and silk: flat ink, no modelling ---------- */
// The top stave: one stroke of dark ink the sheet hangs from.
{
    const box = [30, 128, 300, 14];
    const up = [], dn = [];
    const n = vnoise(600);
    for (let x = 36; x <= 324; x += 8) {
        up.push([x, 130.6 + fbm(n, x * 0.07, 2) * 0.5]);
        dn.push([x, 138.4 + fbm(n, x * 0.07 + 5, 2) * 0.5]);
    }
    const body = line(up) + line(dn.slice().reverse()).replace('M', 'L') + 'Z';
    svg('rod', box,
        blur('sh', box, 1.8) + wet('w', box, 0.6, 0.35),
        `<path d="${body}" fill="${INK.dense}" fill-opacity="0.3" filter="url(#sh)" transform="translate(1 2.6)"/>` +
        `<g filter="url(#w)"><path d="${body}" fill="${INK.scorched}"/></g>` +
        `<path d="${lens([60, 132.6], [170, 132.4], 0.5)}" fill="${INK.light}" fill-opacity="0.5"/><path d="${lens([206, 133], [300, 132.6], 0.45)}" fill="${INK.light}" fill-opacity="0.4"/>`);
}
// The roll, as it lies closed: a pale wash for the silk, drawn round with dry-brush contours; the roller's ends two dabs of dark ink.
{
    const R = ROLL_R;
    const box = [14, ROLL_Y - R - 5, 332, 2 * R + 30];
    const y0 = ROLL_Y - R, y1 = ROLL_Y + R, x0 = 36, x1 = 324;
    const r = rng(611);
    const n = vnoise(612);
    const up = [], dn = [];
    for (let x = x0; x <= x1; x += 4) {
        up.push([x, y0 + fbm(n, x * 0.05, 3) * 1.1]);
        dn.push([x, y1 + fbm(n, x * 0.05 + 9, 3) * 1.1]);
    }
    const body = line(up) + line(dn.slice().reverse()).replace('M', 'L') + 'Z';
    // uneven floods in the wash: placed by chance, not as light and shade
    let floods = '';
    for (let k = 0; k < 9; k++) {
        const light = k % 3 === 0;
        floods += `<path d="${puddle(630 + k, x0 + 20 + r() * (x1 - x0 - 40), y0 + 6 + r() * (2 * R - 12), 18 + r() * 30, 4 + r() * 7, 0.35, 9)}" fill="${light ? PAPER.fibreLight : INK.light}" fill-opacity="${f2(light ? 0.28 : 0.16 + r() * 0.12)}"/>`;
    }
    // contours: the upper edge a light broken line, the lower a heavier one; that is all the form it gets
    const topLine = dry(640, up.filter((_, i) => i % 6 === 0).map(([x, y]) => [x, y + 0.8]), { w: 1.3, hairs: 3, colour: INK.dense, op: 0.75, hair: 0.5, gap: 0.7 });
    const botLine = dry(641, dn.filter((_, i) => i % 6 === 0).map(([x, y]) => [x, y - 1.4]), { w: 3, hairs: 6, colour: INK.scorched, op: 0.8, hair: 0.6, gap: 0.45 });
    // the sheet's free edge, and two or three dragged strokes along the silk
    const edgeLine = dry(642, [[x0 + 8, ROLL_Y + 8], [180, ROLL_Y + 7.4], [x1 - 8, ROLL_Y + 8]], { w: 0.9, hairs: 2, colour: INK.dense, op: 0.7, hair: 0.5, gap: 0.6 });
    let drags = '';
    for (let k = 0; k < 5; k++) {
        const y = y0 + 5 + r() * (2 * R - 16);
        const a = x0 + 14 + r() * 150, b = a + 50 + r() * 100;
        drags += dry(650 + k, [[a, y], [(a + b) / 2, y + (r() - 0.5)], [Math.min(b, x1 - 14), y]], { w: 1.6, hairs: 3, colour: INK.heavy, op: 0.28, hair: 0.45, gap: 1.6 });
    }
    // the turns of paper at each end: short strokes
    let turns = '';
    for (const d of [2.2, 4.6, 7]) {
        turns += `<path d="${lens([x0 + d, y0 + 1.5], [x0 + d + 0.3, y1 - 1.5], 0.35, 0.4)}" fill="${INK.dense}" fill-opacity="0.6"/>` +
            `<path d="${lens([x1 - d, y0 + 1.5], [x1 - d - 0.3, y1 - 1.5], 0.35, -0.4)}" fill="${INK.dense}" fill-opacity="0.6"/>`;
    }
    // the roller's ends: one dab each
    const dab = (cx, seed) =>
        `<path d="${puddle(seed, cx, ROLL_Y, 7.6, 10.2, 0.08, 10)}" fill="${INK.scorched}"/>`;
    svg('roll', box,
        blur('sh', box, 3.2) + wet('w', box, 0.9, 0.4) + blur('t', box, 2.4) + blur('a', box, 0.3) +
        `<clipPath id="c"><path d="${body}"/></clipPath>` +
        `<mask id="m" maskUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"><g filter="url(#w)"><path d="${body}" fill="#fff"/>${beads(613, [...up, ...dn], { every: 2, rMax: 1.3, off: 0.7 })}</g></mask>`,
        // a wash of shadow on the paper under it: painted, flat
        `<path d="${puddle(614, 181, y1 + 3, 156, 6.5, 0.12, 16)}" fill="${INK.heavy}" fill-opacity="0.38" filter="url(#sh)"/>` +
        `<g filter="url(#w)">${dab(30.5, 615)}${dab(329.5, 616)}</g>` +
        `<g mask="url(#m)"><rect x="${x0 - 4}" y="${y0 - 4}" width="${x1 - x0 + 8}" height="${2 * R + 8}" fill="#DDD7C8"/>` +
        `<g filter="url(#t)">${floods}</g></g>` +
        `<g clip-path="url(#c)" filter="url(#a)">${drags}${edgeLine}${turns}${botLine}${topLine}</g>` +
        // the two ends closed with a stroke each
        `<g filter="url(#a)"><path d="${lens([x0 + 0.4, y0], [x0 + 0.2, y1], 0.7, 0.5)}" fill="${INK.scorched}" fill-opacity="0.8"/><path d="${lens([x1 - 0.4, y0], [x1 - 0.2, y1], 0.7, -0.5)}" fill="${INK.scorched}" fill-opacity="0.8"/></g>`);
}
/* ---------- The silk cord: the closed scroll's vermilion ---------- */
// A length of cord: the silk itself, a darker side where it turns away, a few lit flecks.
const cordStroke = (pts, w = 1.45) =>
    `<path d="${stroke(pts, w * 0.9, w * 0.9, w * 1.12)}" fill="${RED.mid}"/>` +
    `<path d="${curve(pts.map(([x, y]) => [x + 0.4, y + 0.5]))}" fill="none" stroke="${RED.deep}" stroke-opacity="0.6" stroke-width="${f2(w * 0.6)}" stroke-linecap="round"/>` +
    `<path d="${curve(pts.map(([x, y]) => [x - 0.35, y - 0.4]))}" fill="none" stroke="${RED.hi}" stroke-opacity="0.75" stroke-width="${f2(w * 0.4)}" stroke-linecap="round" stroke-dasharray="3.5 4.5 1.5 3"/>`;
const cordShadow = (pts, w = 1.45) => `<path d="${curve(pts.map(([x, y]) => [x + 1, y + 1.8]))}" fill="none" stroke="${INK.scorched}" stroke-opacity="0.42" stroke-width="${f2(w * 2.2)}" stroke-linecap="round"/>`;
// Four turns round the roll.
{
    const box = [160, 198, 40, 48];
    const y0 = ROLL_Y - ROLL_R - 0.8, y1 = ROLL_Y + ROLL_R + 0.8;
    let s = '', sh = '';
    [-7.8, -2.6, 2.6, 7.8].forEach((dx, k) => {
        const lean = k % 2 ? 0.5 : -0.3;
        const pts = [[180 + dx - 1.8 + lean, y0], [180 + dx - 0.5, y0 + 8], [180 + dx + 0.6, ROLL_Y], [180 + dx + 1, y1 - 8], [180 + dx + 0.2 - lean, y1]];
        s += cordStroke(pts, 1.5);
        sh += `<path d="${curve(pts.map(([x, y]) => [x + 1.7, y]))}" fill="none" stroke="${INK.scorched}" stroke-opacity="0.42" stroke-width="2.6"/>`;
    });
    svg('cord', box, blur('sh', box, 1) + blur('a', box, 0.28), `<g filter="url(#sh)">${sh}</g><g filter="url(#a)">${s}</g>`);
}
// The tails, each ending in a dark bead and a full tassel, lying in easy curves on the paper.
{
    const tail = (name, box, pts, seed) => {
        const r = rng(seed);
        const [ex, ey] = pts[pts.length - 1], [px, py] = pts[pts.length - 2];
        const ang = Math.atan2(ey - py, ex - px);
        const ux = Math.cos(ang), uy = Math.sin(ang);
        const hx = ex + ux * 5.2, hy = ey + uy * 5.2; // the tassel's head, past the bead
        let fringe = '';
        for (let k = 0; k < 19; k++) {
            const a = ang + (k / 18 - 0.5) * 0.56 + (r() - 0.5) * 0.07;
            const l = 17 + r() * 6;
            fringe += `<path d="M${f(hx)} ${f(hy)}q${f(Math.cos(a) * l * 0.5 + (r() - 0.5) * 1.6)} ${f(Math.sin(a) * l * 0.5 + (r() - 0.5) * 1.6)} ${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}" fill="none" stroke="${k % 3 === 0 ? RED.deep : k % 3 === 1 ? RED.mid : RED.hi}" stroke-width="${f2(0.8 + r() * 0.45)}" stroke-linecap="round"/>`;
        }
        const tasselShadow = `<ellipse cx="${f(ex + ux * 15 + 1.4)}" cy="${f(ey + uy * 15 + 2.6)}" rx="10" ry="7" fill="${INK.scorched}" fill-opacity="0.34"/>`;
        // the wet red under it all: the cord painted, not laid
        const bleed = `<path d="${curve(pts)}" fill="none" stroke="${RED.hi}" stroke-opacity="0.22" stroke-width="5" stroke-linecap="round"/>`;
        svg(name, box, blur('sh', box, 1.6) + blur('a', box, 0.28) + blur('w', box, 2),
            `<g filter="url(#sh)">${cordShadow(pts)}${tasselShadow}</g><g filter="url(#w)">${bleed}</g><g filter="url(#a)">${cordStroke(pts)}${fringe}` +
            // the tassel's bound neck, and the bead
            `<path d="${lens([ex + ux * 3.4, ey + uy * 3.4], [ex + ux * 7.2, ey + uy * 7.2], 1.9)}" fill="${RED.deep}"/>` +
            `<ellipse cx="${f(ex + ux * 1.6)}" cy="${f(ey + uy * 1.6)}" rx="2.7" ry="2.4" fill="${INK.scorched}"/>` +
            `<circle cx="${f(ex + ux * 1.6 - 0.8)}" cy="${f(ey + uy * 1.6 - 0.8)}" r="0.7" fill="#8A8377" fill-opacity="0.7"/></g>`);
    };
    tail('tail-a', [172, 216, 84, 108], [[181, 224], [190, 240], [207, 252], [222, 262], [227, 275], [222, 286]], 701);
    tail('tail-b', [92, 216, 94, 96], [[179, 224], [170, 242], [152, 250], [136, 255], [128, 264], [126, 274]], 702);
}
// The knot: a flat knot of two loops.
{
    const box = [164, 209, 32, 26];
    const cx = 180, cy = 222;
    const loop = (sgn, w, h) => [[cx + sgn * 1.5, cy - h * 0.45], [cx + sgn * w * 0.6, cy - h], [cx + sgn * w, cy - 0.4], [cx + sgn * w * 0.6, cy + h], [cx + sgn * 1.5, cy + h * 0.45]];
    const a = loop(-1, 12, 5.6), b = loop(1, 11, 5);
    svg('knot', box, blur('sh', box, 1.1) + blur('a', box, 0.28),
        `<g filter="url(#sh)">${cordShadow(a)}${cordShadow(b)}</g><g filter="url(#a)">${cordStroke(a)}${cordStroke(b)}` +
        `<path d="${puddle(711, cx, cy, 3.9, 3.6, 0.1, 9)}" fill="${RED.mid}"/><path d="${puddle(712, cx + 0.7, cy + 0.9, 2.7, 2.3, 0.12, 9)}" fill="${RED.deep}" fill-opacity="0.65"/>` +
        `<path d="M${cx - 2.4} ${cy - 1.4}q2.4 -1.6 4.8 0" fill="none" stroke="${RED.hi}" stroke-width="0.8" stroke-linecap="round"/></g>`);
}
console.log(JSON.stringify(BOX));
