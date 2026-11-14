// Generator for the "dawn" wrapper art, in WET-ON-WET WATERCOLOUR: a window with linen curtains, and behind
// them a sunrise. Watercolour is known by its EDGES, so everything here is a wash with an edge:
//   - every wash is painted THROUGH a wet mask (its silhouette plus beads of water, blurred and thresholded),
//     so its edge is crisp but creeps the way water does in paper (the gate allows no feTurbulence /
//     feDisplacementMap). Blur is used only INSIDE a wash, where two colours mingle; never as its edge;
//   - the DRIED RIM is made by a filter, not drawn: the wash's own alpha is eroded, and what lies between
//     the eroded and the full shape is laid over again, darker - pigment carried to the rim and left there;
//   - pigment pooled along the low edge of a wash; backruns ("cauliflowers") where clear water was pushed
//     back into a damp wash: a paler inside and a crinkled tide line;
//   - the lights (sun, cloud, window frame, page edges, highlights) are the bare paper, left untouched.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/dawn.gen.mjs && node scripts/wrap-art.mjs --write
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'dawn');
if (!OUT.endsWith('wrappers/dawn')) throw new Error('out dir must be public/wrappers/dawn');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

const C = {
    paper: '#FFFDF5', warm: '#FFF5DC', sun: '#FFD457', sunDeep: '#F7B13C', sky: '#B5D7EF', skyDeep: '#7FB2DF',
    peach: '#F9BD9E', rose: '#EC9683', green: '#9DCB68', greenDeep: '#4F9655', lime: '#D9E78A', violet: '#A5B0D8',
    wall: '#EFE7D8', shade: '#AAB6C9', shadeDeep: '#75839E', linen: '#F6EFE1', wood: '#93806F', pencil: '#757A88',
};
const FULL = [-12, -12, 384, 474];
/** The window's panes in the wall, the sash rail between them, the sill's back and front edges. */
const WX0 = 34, WX1 = 326, WY0 = 56, WY1 = 286, RAIL0 = 132, RAIL1 = 140, SILL = 360;
/** The curtains' top and hem. */
const CT = 47, CH = 298;
const SUN = [238, 202];

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
function vnoise(seed) {
    const r = rng(seed);
    const t = Array.from({ length: 256 }, () => r() * 2 - 1);
    return x => {
        const i = Math.floor(x), fr = x - i, u = fr * fr * (3 - 2 * fr);
        return t[i & 255] + (t[(i + 1) & 255] - t[i & 255]) * u;
    };
}
function fbm(n, x, oct = 3) {
    let s = 0, a = 1, q = 1, tot = 0;
    for (let k = 0; k < oct; k++) { s += a * n(x * q + k * 17.3); tot += a; a *= 0.5; q *= 2; }
    return s / tot;
}
const hump = (x, c, h, w) => h * Math.exp(-Math.pow((x - c) / w, 2));

const BOXES = {};
function svg(name, box, D, inner) {
    BOXES[name] = box;
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}"><defs>${typeof D === 'string' ? D : D.defs}</defs>${inner}</svg>`;
    writeFileSync(join(OUT, `${name}.svg`), s);
    if (s.length > 56000) console.warn(`${name}.svg is ${s.length} bytes`);
}

/* ---------- The kit ---------- */
const region = ([x, y, w, h]) => `filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"`;
const blur = (id, box, sd) => `<filter id="${id}" ${region(box)}><feGaussianBlur stdDeviation="${sd}"/></filter>`;
/** The wet edge: blur, threshold the alpha (shape and beads run together), soften a hair. */
const wet = (id, box, sd = 1.5, soft = 0.38, gain = 12, cut = -5) =>
    `<filter id="${id}" ${region(box)}><feGaussianBlur stdDeviation="${sd}" result="b"/>` +
    `<feColorMatrix in="b" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${gain} ${cut}" result="g"/>` +
    `<feGaussianBlur in="g" stdDeviation="${soft}"/></filter>`;
/**
 * The dried rim. Whatever is drawn through it gets its rim laid over again, darker: a hard line `r` wide,
 * and inside it a broad, faint band `r2` wide where the pigment was on its way out.
 */
const edge = (id, box, { r = 0.9, sd = 0.4, k = 0.56, r2 = 3.6, sd2 = 2.4, k2 = 0.82, kb = 0.05, ka = 1 } = {}) =>
    `<filter id="${id}" ${region(box)}>` +
    `<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 40 -6" result="a"/>` +
    `<feMorphology in="a" operator="erode" radius="${r}" result="e1"/><feGaussianBlur in="e1" stdDeviation="${sd}" result="b1"/>` +
    `<feMorphology in="a" operator="erode" radius="${r2}" result="e2"/><feGaussianBlur in="e2" stdDeviation="${sd2}" result="b2"/>` +
    `<feColorMatrix in="SourceGraphic" type="matrix" values="${k} 0 0 0 0 0 ${k} 0 0 0 0 0 ${f2(k + kb)} 0 0 0 0 0 ${ka} 0" result="d1"/>` +
    `<feColorMatrix in="SourceGraphic" type="matrix" values="${k2} 0 0 0 0 0 ${k2} 0 0 0 0 0 ${f2(k2 + kb / 2)} 0 0 0 0 0 1 0" result="d2"/>` +
    `<feComposite in="d2" in2="b2" operator="out" result="rim2"/><feComposite in="rim2" in2="SourceGraphic" operator="over" result="s2"/>` +
    `<feComposite in="d1" in2="b1" operator="out" result="rim1"/><feComposite in="rim1" in2="s2" operator="over"/></filter>`;
const stops = s => s.map(([o, c, a = 1]) => `<stop offset="${f2(o)}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const lin = (id, x1, y1, x2, y2, s) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}">${stops(s)}</linearGradient>`;
const rad = (id, cx, cy, r, s, tr = '') => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"${tr ? ` gradientTransform="${tr}"` : ''}>${stops(s)}</radialGradient>`;

const line = pts => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('');
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
function puddle(seed, cx, cy, rx, ry, wobble = 0.24, n = 11) {
    const r = rng(seed);
    const pts = [];
    for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, m = 1 + (r() - 0.5) * 2 * wobble;
        pts.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
    }
    return curve(pts, true);
}
/** Colour dropped into a wet wash: [cx, cy, rx, ry, colour, opacity]. Drawn blurred by the caller, INSIDE a wash. */
const pools = (seed, list) => list.map(([cx, cy, rx, ry, c, o], k) => `<path d="${puddle(seed + k, cx, cy, rx, ry)}" fill="${c}" fill-opacity="${o}"/>`).join('');
/** A frilled outline: the shape clear water takes when it is pushed back into a damp wash. */
function frill(seed, cx, cy, R, sq = 0.8, n = 30) {
    const r = rng(seed), nz = vnoise(seed + 7);
    const lobes = 5 + Math.floor(r() * 4), ph = r() * 6;
    const pts = [];
    for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const m = 0.86 + 0.1 * Math.abs(Math.sin(a * lobes * 0.5 + ph)) + fbm(nz, k * 0.3, 2) * 0.42 + 0.05 * Math.sin(a * lobes * 2.3 + ph);
        pts.push([cx + Math.cos(a) * R * m, cy + Math.sin(a) * R * m * sq]);
    }
    return curve(pts, true);
}
/**
 * Backruns: [cx, cy, R, squash]. The inside is lifted paler; the pigment it pushed out lies in a crinkled
 * tide line, hard on the outside, feathering inward. Needs filters `h` and `s2` (the kit has them).
 */
function runs(seed, list, { light = C.paper, rim, op = 0.5 }) {
    return list.map(([cx, cy, R, sq = 0.8], k) => {
        const d = frill(seed + k * 3, cx, cy, R, sq);
        // a paler shape with a creeping, crisp edge and its own dried rim; clearer still toward its middle;
        // then the tide line of the pigment it pushed out
        return `<g opacity="${f2(op)}"><g filter="url(#ep)"><g filter="url(#w2)"><path d="${d}" fill="${light}"/></g></g>` +
            `<path d="${puddle(seed + k * 3 + 1, cx - R * 0.1, cy - R * sq * 0.1, R * 0.5, R * sq * 0.5, 0.3, 9)}" fill="${C.paper}" fill-opacity="0.7" filter="url(#s2)"/></g>` +
            `<path d="${d}" fill="none" stroke="${rim}" stroke-width="0.9" stroke-opacity="${f2(op * 0.8)}" stroke-linejoin="round" filter="url(#h)"/>`;
    }).join('');
}
/** Beads of water along a line of points: what makes an edge creep. */
function beads(seed, pts, { every = 2, rMin = 0.6, rMax = 2.2, off = 1.5 } = {}) {
    const r = rng(seed);
    let s = '';
    for (let i = 0; i < pts.length; i += every) {
        if (r() < 0.3) continue;
        const [x, y] = pts[i];
        s += `<circle cx="${f(x + (r() - 0.5) * 2 * off)}" cy="${f(y + (r() - 0.5) * 2 * off)}" r="${f(rMin + r() * r() * (rMax - rMin))}" fill="#fff"/>`;
    }
    return s;
}
/** A brush stroke that swells and tapers: an outline around a spine. */
function stroke(pts, w0, w1, wMid = Math.max(w0, w1)) {
    const n = pts.length, L = [], R = [];
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
/** One touch of the brush from a to b. */
function lens(a, b, w, bend = 0) {
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    const nx = -ty / l, ny = tx / l, mx = (a[0] + b[0]) / 2 + nx * bend, my = (a[1] + b[1]) / 2 + ny * bend;
    return `M${f(a[0])} ${f(a[1])}Q${f(mx + nx * w)} ${f(my + ny * w)} ${f(b[0])} ${f(b[1])}Q${f(mx - nx * w)} ${f(my - ny * w)} ${f(a[0])} ${f(a[1])}Z`;
}
/** Points along a quadratic. */
function quad(a, c, b, n = 8) {
    const pts = [];
    for (let k = 0; k <= n; k++) {
        const t = k / n, u = 1 - t;
        pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
    return pts;
}
/** A soft pencil mark: a hair of graphite, skipping on the paper's tooth. */
function pencil(seed, pts, op = 0.3, w = 0.45) {
    const r = rng(seed);
    const dash = [];
    for (let k = 0; k < 5; k++) dash.push(f(4 + r() * 18), f(0.4 + r() * r() * 3));
    return `<path d="${curve(pts)}" fill="none" stroke="${C.pencil}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-dasharray="${dash.join(' ')}"/>`;
}
const rect = ([x, y, w, h], fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const rectPath = (x0, y0, x1, y1) => `M${f(x0)} ${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`;
/** A rectangle's outline as points with a little wander, for beads and for hand-drawn straightness. */
function wobbly(seed, x0, y0, x1, y1, step = 9, amp = 0.7) {
    const r = rng(seed), pts = [];
    const side = (ax, ay, bx, by) => {
        const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / step));
        for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n + (r() - 0.5) * 2 * amp, ay + ((by - ay) * k) / n + (r() - 0.5) * 2 * amp]);
    };
    side(x0, y0, x1, y0); side(x1, y0, x1, y1); side(x1, y1, x0, y1); side(x0, y1, x0, y0);
    return pts;
}
/**
 * A wash: `inner` painted through a wet mask of `sil` (+ beads along `pts`), then through the dried-rim
 * filter (`edgeId`; '' for none). `holes` are paths left bare inside it (even-odd). `low` is a line of points
 * along its low edge where pigment pooled, in `lowCol`.
 */
function wash(D, { sil, holes = '', pts = [], seed = 1, box, bead = {}, extra = '', inner, edgeId = 'e', wetId = 'w', low, lowCol, lowOp = 0.5, lowW = 7 }) {
    const id = `m${D.n++}`;
    D.defs += `<mask id="${id}" maskUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"><g filter="url(#${wetId})"><path d="${sil}${holes}" fill="#fff"${holes ? ' fill-rule="evenodd"' : ''}/>${extra}${beads(seed, pts, bead)}</g></mask>`;
    const pool = low ? `<path d="${line(low)}" fill="none" stroke="${lowCol}" stroke-width="${lowW}" stroke-opacity="${lowOp}" stroke-linejoin="round" filter="url(#s2)"/>` : '';
    const g = `<g mask="url(#${id})">${inner}${pool}</g>`;
    return edgeId ? `<g filter="url(#${edgeId})">${g}</g>` : g;
}
const kit = box => ({ n: 0, defs: wet('w', box) + wet('w2', box, 0.8, 0.28, 12, -5.2) + edge('e', box) + edge('e2', box, { k: 0.8, k2: 0.93, r: 0.7 }) + edge('ep', box, { k: 0.62, k2: 0.9, r: 0.8, ka: 1.7 }) + blur('h', box, 0.32) + blur('s1', box, 1.2) + blur('s2', box, 2) + blur('s3', box, 3.2) + blur('s8', box, 7) + blur('s14', box, 13) });

/* ---------- The sky: two washes with the paper left between them ---------- */
{
    const box = FULL, D = kit(box);
    const nw = vnoise(11), nb = vnoise(12);
    // the warm wash, laid up from the horizon; it climbs around the sun
    const warm = [];
    for (let x = -14; x <= 374; x += 8) warm.push([x, 156 + fbm(nw, x * 0.02) * 11 - hump(x, 236, 30, 66) + hump(x, 40, 10, 60) - hump(x, 372, 16, 40)]);
    // the blue, laid down from the top; it stops high on the right and leaves a bank of white cloud
    const blue = [];
    for (let x = 374; x >= -14; x -= 8) blue.push([x, 126 + fbm(nb, x * 0.024) * 12 + hump(x, 30, 30, 80) - hump(x, 262, 44, 78) - hump(x, 372, 20, 50)]);
    const sunHole = puddle(21, SUN[0], SUN[1], 15.5, 15, 0.05, 14);
    const clouds = puddle(22, 104, 96, 36, 8, 0.3, 12) + puddle(23, 168, 112, 20, 5, 0.3, 10) + puddle(24, 52, 118, 16, 4, 0.3, 9);
    D.defs += lin('blue', 0, 40, 0, 170, [[0, C.skyDeep, 0.95], [0.5, C.sky, 0.9], [1, '#CFE3F2', 0.85]]) +
        lin('warm', 0, 120, 0, 290, [[0, '#FCD9B0'], [0.5, C.peach], [1, '#FBD08C']]);
    svg('sky', box, D,
        rect(box, C.paper) +
        wash(D, {
            sil: line(warm) + 'L374 300L-14 300Z', holes: sunHole, pts: warm, seed: 13, box, bead: { every: 1, rMax: 3, off: 2.2 },
            inner: rect([-12, 100, 384, 200], 'url(#warm)') +
                // yellow dropped in round the sun, rose and violet at the far side: they run together
                `<g filter="url(#s14)">${pools(30, [[SUN[0] + 4, SUN[1] + 2, 84, 56, C.sun, 0.95], [50, 196, 70, 34, C.rose, 0.6], [336, 180, 44, 40, '#FBC6A0', 0.7], [150, 250, 150, 30, C.sun, 0.5], [16, 160, 50, 16, '#C9B0D8', 0.6]])}</g>` +
                `<g filter="url(#s8)">${pools(36, [[SUN[0], SUN[1], 34, 30, '#FFF2B6', 0.95], [120, 176, 40, 10, '#F7A98C', 0.4]])}</g>` +
                runs(40, [[112, 196, 15, 0.6]], { light: '#FFE8CC', rim: '#E98F70' }),
            low: warm, lowCol: '#F29C7C', lowOp: 0.32, lowW: 5,
        }) +
        wash(D, {
            sil: line(blue) + 'L-14 -14L374 -14Z', holes: clouds, pts: blue, seed: 14, box, bead: { every: 1, rMin: 0.8, rMax: 4.4, off: 3 },
            inner: rect([-12, -12, 384, 220], 'url(#blue)') +
                `<g filter="url(#s14)">${pools(44, [[40, 50, 100, 30, C.skyDeep, 0.7], [320, 46, 70, 26, '#8FA9E0', 0.5], [200, 70, 70, 20, '#D8EAF6', 0.7]])}</g>` +
                // the blue meets the warm wash while both are wet: violet, then rose
                `<g filter="url(#s8)">${pools(48, [[40, 148, 70, 14, '#B9A6DA', 0.85], [124, 136, 40, 9, '#D9B6D4', 0.7], [20, 160, 40, 8, C.rose, 0.4]])}</g>` +
                runs(52, [[58, 70, 20, 0.7], [300, 64, 14, 0.75]], { light: '#F2F8FC', rim: '#5E8FCB' }),
            low: blue, lowCol: '#5E8FD0', lowOp: 0.5, lowW: 6,
        }));
}

/* ---------- The far hills: two washes, each with its dried ridge ---------- */
{
    const box = [-12, 180, 384, 120], D = kit(box);
    const na = vnoise(101), nb = vnoise(102);
    const A = [], B = [];
    for (let x = -14; x <= 374; x += 6) {
        A.push([x, 229 - hump(x, 36, 30, 62) - hump(x, 150, 14, 44) - hump(x, 312, 32, 60) + fbm(na, x * 0.05) * 3.5]);
        B.push([x, 246 - hump(x, 92, 15, 70) - hump(x, 344, 22, 60) - hump(x, 214, 5, 40) + fbm(nb, x * 0.06) * 2.6]);
    }
    D.defs += lin('ta', 0, 196, 0, 262, [[0, '#9AA6D6'], [0.6, '#BFC8E4'], [1, '#DCDFEE']]) +
        lin('tb', 0, 224, 0, 290, [[0, '#84B8AE'], [0.6, '#B4D4C0'], [1, '#D5E6CF']]);
    svg('far', box, D,
        wash(D, {
            sil: line(A) + 'L374 302L-14 302Z', pts: A, seed: 103, box, bead: { every: 1, rMax: 2.6, off: 1.8 },
            inner: rect(box, 'url(#ta)') +
                // the sun's colour runs into the ridge beside it
                `<g filter="url(#s8)">${pools(110, [[SUN[0] + 6, 228, 44, 12, C.sun, 0.85], [SUN[0] - 58, 232, 40, 10, C.peach, 0.75], [30, 222, 40, 14, '#7F8FCC', 0.6], [318, 216, 40, 12, '#7F8FCC', 0.55]])}</g>` +
                runs(116, [[84, 236, 20, 0.45]], { light: '#E6E9F5', rim: '#7786C2' }),
        }) +
        wash(D, {
            sil: line(B) + 'L374 302L-14 302Z', pts: B, seed: 105, box, bead: { every: 1, rMax: 2.2, off: 1.5 },
            inner: rect(box, 'url(#tb)') +
                `<g filter="url(#s8)">${pools(120, [[204, 248, 60, 8, C.sun, 0.7], [92, 242, 44, 9, '#5E9F9E', 0.55], [340, 238, 40, 10, '#5E9F9E', 0.6], [150, 262, 80, 8, C.paper, 0.6]])}</g>`,
        }));
}

/* ---------- The near land: a green wash, yellow where the sun reaches it, and a darker one in front ---------- */
{
    const box = [-12, 236, 384, 70], D = kit(box);
    const nn = vnoise(131), nm = vnoise(132);
    const N = [], M = [];
    for (let x = -14; x <= 374; x += 6) {
        N.push([x, 268 - hump(x, 70, 20, 96) - hump(x, 258, 6, 50) + Math.max(0, x - 300) * 0.04 + fbm(nn, x * 0.05) * 2.2]);
        M.push([x, 296 - hump(x, 340, 30, 100) - hump(x, -10, 12, 50) + fbm(nm, x * 0.06) * 2]);
    }
    D.defs += lin('tn', 0, 244, 0, 300, [[0, C.lime], [0.4, C.green], [1, '#6FAE5C']]) + lin('tm', 0, 262, 0, 300, [[0, '#7DB562'], [1, C.greenDeep]]);
    svg('near', box, D,
        wash(D, {
            sil: line(N) + 'L374 308L-14 308Z', pts: N, seed: 135, box, bead: { every: 1, rMax: 2.4, off: 1.6 },
            inner: rect(box, 'url(#tn)') +
                `<g filter="url(#s8)">${pools(140, [[230, 270, 70, 10, C.sun, 0.9], [50, 262, 50, 10, C.greenDeep, 0.5], [150, 284, 70, 8, '#3F8A5A', 0.4], [112, 258, 36, 6, C.lime, 0.8], [300, 272, 26, 5, C.peach, 0.5]])}</g>`,
        }) +
        wash(D, {
            sil: line(M) + 'L374 308L-14 308Z', pts: M, seed: 136, box, bead: { every: 1, rMax: 2, off: 1.3 },
            inner: rect(box, 'url(#tm)') + `<g filter="url(#s8)">${pools(150, [[300, 272, 40, 6, C.lime, 0.8], [350, 290, 30, 10, '#2F7458', 0.5]])}</g>`,
        }));
}

/* ---------- One tree: a loose mass of foliage laid in a single wet wash, a few branch strokes ---------- */
{
    const box = [50, 104, 130, 166], D = kit(box);
    const r = rng(151);
    const lumps = [[108, 156, 31, 22], [82, 184, 25, 18], [136, 186, 26, 17], [108, 210, 32, 15], [128, 136, 17, 11], [66, 210, 13, 9], [152, 164, 12, 9], [140, 216, 16, 9], [110, 184, 22, 16], [96, 166, 14, 12]];
    let sil = '', splash = '';
    lumps.forEach(([x, y, a, b], k) => { sil += puddle(160 + k, x, y, a, b, 0.3, 10); });
    for (let k = 0; k < 16; k++) {
        const a = r() * Math.PI * 2, d = 1.08 + r() * 0.3;
        splash += `<ellipse cx="${f(110 + Math.cos(a) * 46 * d)}" cy="${f(178 + Math.sin(a) * 48 * d)}" rx="${f(1 + r() * 2.2)}" ry="${f(0.8 + r() * 1.4)}" fill="#fff"/>`;
    }
    const trunk = [[119, 258], [117, 248], [115.4, 238], [113, 224]];
    const limbs = [[[115, 232], [102, 216], [90, 196]], [[115.4, 224], [128, 208], [138, 190]], [[114.6, 212], [112, 190], [116, 166]]];
    const twig = l => `<path d="${stroke(quad(l[0], l[1], l[2], 5), 0.9, 0.2, 0.6)}" fill="#6E5A50"`;
    svg('tree', box, D,
        `<g filter="url(#e)"><g filter="url(#w2)"><path d="${stroke(trunk, 2.4, 1, 1.6)}" fill="${C.wood}"/></g></g>` +
        wash(D, {
            sil, extra: splash, seed: 152, box, bead: { every: 1 },
            inner: rect(box, '#C3DE7C') +
                // lit yellow on the sun's side, deep and cool underneath: let run together
                `<g filter="url(#s8)">${pools(170, [[136, 150, 26, 18, C.sun, 0.95], [86, 198, 30, 18, '#3F8A5A', 0.8], [116, 216, 34, 10, '#2F7458', 0.6], [104, 150, 20, 14, C.green, 0.7], [148, 184, 14, 10, C.lime, 0.8], [124, 128, 12, 8, '#F2C89A', 0.6]])}</g>` +
                `<g filter="url(#s3)">${pools(180, [[96, 172, 9, 6, C.greenDeep, 0.5], [128, 186, 8, 5, C.greenDeep, 0.45], [112, 140, 7, 5, '#EAF2B8', 0.7]])}</g>`,
            low: quad([80, 216], [110, 229], [150, 220], 6), lowCol: '#2F7458', lowOp: 0.5, lowW: 7,
        }) +
        // branches showing through the wash
        `<g filter="url(#h)">${limbs.map((l, k) => `${twig(l)} fill-opacity="${f2(0.5 - k * 0.08)}"/>`).join('')}</g>`);
}

/* ---------- Far birds: three soft blots, no more ---------- */
{
    const box = [176, 92, 84, 40];
    const blot = (s, x, y, a, b, t) => `<path d="${puddle(s, x, y, a, b, 0.3, 8)}" transform="rotate(${t} ${x} ${y})" fill="#73809E" fill-opacity="0.62"/>`;
    svg('birds', box, wet('w', box, 0.7, 0.3, 12, -5),
        `<g filter="url(#w)">${blot(1, 196, 116, 3.6, 1.3, -14)}${blot(2, 218, 106, 2.8, 1.1, 10)}${blot(3, 240, 118, 2.2, 0.9, -6)}</g>`);
}

/* ---------- The room: wall, the painted window frame with its sash rail, the sill, the wall under it ---------- */
const sillPts = [[WX0 - 12, WY1], [WX1 + 12, WY1], [376, SILL], [376, SILL + 9], [-16, SILL + 9], [-16, SILL]];
{
    const box = FULL, D = kit(box);
    const FX0 = WX0 - 9, FX1 = WX1 + 9, FY0 = WY0 - 9;
    const frameOut = wobbly(301, FX0, FY0, FX1, WY1 + 3, 10, 0.5);
    const paneA = wobbly(302, WX0, WY0, WX1, RAIL0, 10, 0.6), paneB = wobbly(303, WX0, RAIL1, WX1, WY1 + 4, 10, 0.6);
    D.defs += lin('low', 0, SILL + 8, 0, 462, [[0, '#93A0B8'], [1, '#6F7D99']]) + lin('sl', 0, WY1, 0, SILL, [[0, '#E6E2DA'], [1, '#F7F2E7']]);
    svg('wall', box, D,
        // the wall: a broad wash, cool in the corners, with its tide line against the frame
        wash(D, {
            sil: rectPath(-14, -14, 374, SILL + 8), holes: line(frameOut) + 'Z', pts: frameOut, seed: 304, box, bead: { every: 2, rMax: 1.4, off: 0.8 },
            inner: rect([-12, -12, 384, SILL + 24], C.wall) +
                `<g filter="url(#s14)">${pools(310, [[0, 80, 34, 120, C.shade, 0.7], [360, 110, 34, 130, C.shade, 0.75], [180, 14, 200, 22, C.shade, 0.6], [8, 250, 30, 60, C.shadeDeep, 0.4], [354, 260, 30, 50, C.shadeDeep, 0.4], [320, 12, 50, 22, C.peach, 0.4]])}</g>` +
                runs(316, [[10, 170, 16, 1.6], [110, 22, 30, 0.42]], { light: C.paper, rim: C.shadeDeep }),
        }) +
        // the frame: bare paper, a little shadow let in under the rail and down the near jamb
        wash(D, {
            sil: line(frameOut) + 'Z', holes: line(paneA) + 'Z' + line(paneB) + 'Z', pts: [...paneA, ...paneB], seed: 305, box, bead: { every: 2, rMax: 0.9, off: 0.4 }, wetId: 'w2', edgeId: 'e2',
            inner: rect([FX0 - 2, FY0 - 2, FX1 - FX0 + 4, WY1 - FY0 + 8], C.paper) +
                `<g filter="url(#s2)">${pools(320, [[180, RAIL1 - 1, 150, 1.8, '#9FAAC6', 0.7], [FX0 + 3, 170, 2.2, 110, '#9FAAC6', 0.6], [FX1 - 3, 170, 2.2, 110, '#FFD9A0', 0.7], [180, FY0 + 3, 150, 2, '#B9C2D6', 0.6], [250, RAIL0 + 2, 60, 2, C.sun, 0.5]])}</g>` +
                pencil(306, [[FX0 + 4.4, FY0 + 8], [FX0 + 4.8, 170], [FX0 + 4.2, WY1 - 4]], 0.3) + pencil(307, [[WX0 + 20, RAIL0 + 4], [180, RAIL0 + 4.4], [WX1 - 30, RAIL0 + 3.8]], 0.26),
        }) +
        // the wall under the sill: the darkest wash in the room
        wash(D, {
            sil: rectPath(-14, SILL + 6, 374, 464), seed: 308, box,
            inner: rect([-12, SILL, 384, 110], 'url(#low)') +
                `<g filter="url(#s14)">${pools(330, [[80, 410, 90, 16, '#5F6E8E', 0.6], [300, 392, 80, 14, '#A9B2C8', 0.5], [200, 430, 140, 20, '#8E86A6', 0.45]])}</g>` +
                runs(336, [[292, 404, 30, 0.45]], { light: '#C9D0DE', rim: '#56647F' }) +
                `<rect x="-12" y="${SILL + 4}" width="384" height="10" fill="#56627E" fill-opacity="0.55" filter="url(#s2)"/>`,
        }) +
        // the sill: a pale board; pigment pooled along its front edge
        wash(D, {
            sil: line(sillPts) + 'Z', pts: wobbly(309, -16, WY1, 376, SILL + 9, 12, 0.5), seed: 310, box, bead: { every: 2, rMax: 1.1, off: 0.5 }, wetId: 'w2',
            inner: rect([-16, WY1 - 4, 392, 90], 'url(#sl)') +
                `<g filter="url(#s8)">${pools(340, [[30, 318, 60, 20, C.shade, 0.6], [336, 330, 50, 20, C.shade, 0.55], [180, 291, 160, 5, C.shadeDeep, 0.3], [210, 346, 90, 8, C.peach, 0.3]])}</g>` +
                runs(346, [[232, 318, 14, 0.4]], { light: C.paper, rim: '#8F9CB8' }) +
                `<rect x="-16" y="${SILL}" width="392" height="10" fill="${C.paper}" fill-opacity="0.85" filter="url(#h)"/>`,
            low: [[-16, SILL - 1], [376, SILL - 1]], lowCol: '#8F9CB8', lowOp: 0.5, lowW: 4,
        }));
}

/* ---------- The still life's places on the sill ---------- */
const GLASS = { cx: 286, top: 298, bot: 350 };
const BOWL = { cx: 196, rim: 326, foot: 353 };
const BOOKS = { x0: 40, x1: 116, bot: 352 };

/* ---------- Sunlight laid across the sill, and the shadows the things throw ---------- */
{
    const box = FULL, D = kit(box);
    const lit = [[104, WY1 + 1], [302, WY1 + 1], [250, SILL + 8], [26, SILL + 8]];
    const litPts = [...quad(lit[0], [70, 322], lit[3], 12), ...quad(lit[1], [280, 322], lit[2], 12)];
    const shadows = puddle(431, GLASS.cx - 12, GLASS.bot + 2, 20, 4.2, 0.12, 12) + puddle(432, BOWL.cx - 18, BOWL.foot + 1.5, 38, 5, 0.12, 14) + puddle(433, (BOOKS.x0 + BOOKS.x1) / 2 - 12, BOOKS.bot + 2, 46, 4.4, 0.1, 14);
    D.defs += `<clipPath id="sc"><path d="${line(sillPts)}Z"/></clipPath>`;
    svg('patch', box, D,
        `<g clip-path="url(#sc)">` +
        wash(D, {
            sil: line(lit) + 'Z', pts: litPts, seed: 401, box, bead: { every: 1, rMax: 1.8, off: 1.2 }, edgeId: 'e2',
            inner: rect([0, WY1 - 2, 360, 90], '#FFF3C4', ' fill-opacity="0.85"') +
                `<g filter="url(#s8)">${pools(410, [[70, 340, 30, 14, C.sun, 0.7], [276, 300, 24, 12, C.peach, 0.55], [176, 316, 60, 14, C.paper, 0.9], [150, 352, 60, 8, '#FFE08A', 0.6]])}</g>`,
        }) +
        wash(D, {
            sil: shadows, seed: 402, box, wetId: 'w2',
            inner: rect([0, WY1, 360, 90], '#9CA3CC', ' fill-opacity="0.5"') + `<g filter="url(#s3)">${pools(420, [[GLASS.cx - 20, GLASS.bot + 3, 10, 3, '#A6D2DC', 0.8], [BOWL.cx - 30, BOWL.foot + 2, 16, 3, '#C59AB8', 0.6], [BOOKS.x0 + 6, BOOKS.bot + 3, 16, 3, '#6E78B4', 0.5]])}</g>`,
        }) + `</g>`);
}

/* ---------- Pleats: wet strokes that taper, laid one beside the other ---------- */
function pleats(seed, n, xAt, wAt, y0, y1, darks, light) {
    const r = rng(seed), nz = vnoise(seed + 3);
    const cuts = [0];
    for (let k = 0; k < n; k++) cuts.push(cuts[k] + 0.5 + r() * 1.2);
    let dark = '', lit = '';
    for (let k = 0; k < n; k++) {
        const t = (cuts[k] + cuts[k + 1]) / 2 / cuts[n], tw = (cuts[k + 1] - cuts[k]) / cuts[n];
        const a = y0 - 6, b = y1 + 8;
        const w = Math.max(2.2, tw * wAt((a + b) / 2) * (0.3 + r() * 0.26)), side = r() < 0.5 ? -1 : 1;
        // the stroke's two sides wander on their own: a loaded brush pressed and lifted
        const L = [], R = [], mid = [];
        for (let j = 0; j <= 9; j++) {
            const u = j / 9, y = a + (b - a) * u, x = xAt(t, y);
            const press = 0.5 + 0.6 * u + 0.25 * Math.sin(u * 5 + k * 2.1);
            L.push([x - w * press * (0.8 + fbm(nz, y * 0.03 + k * 7, 2) * 0.7), y]);
            R.push([x + w * press * (0.8 + fbm(nz, y * 0.03 + k * 7 + 40, 2) * 0.7), y]);
            mid.push([x, y]);
        }
        dark += `<path d="${curve([...L, ...R.reverse()], true)}" fill="${darks[k % darks.length]}"/>`;
        lit += `<path d="${stroke(mid.slice(1, 9).map(([x, y]) => [x + side * (w + 1.6), y]), 0.4, 0.4, Math.max(1.2, w * 0.5))}" fill="${light}" fill-opacity="${f2(0.3 + r() * 0.3)}"/>`;
    }
    return { dark, lit };
}

/* ---------- The curtains, closed: linen before sunrise, the morning blooming through it ---------- */
function curtain(name, seed, lo, hi, nFolds, seamSide) {
    const box = [lo - 6, CT - 9, hi - lo + 12, CH - CT + 22], D = kit(box);
    const r = rng(seed), nz = vnoise(seed + 1);
    const mid = (lo + hi) / 2, seamX = seamSide > 0 ? hi : lo, len = CH - CT, far = seamSide > 0 ? lo : hi;
    const hemY = x => CH + 3 * Math.sin(((x - lo) * Math.PI * 2 * nFolds * 0.3) / (hi - lo) + seed) + fbm(nz, x * 0.06 + 40, 2) * 2.4 - 3 * Math.exp(-Math.pow((x - seamX) / 9, 2));
    const outline = [], hemPts = [];
    for (let x = lo; x <= hi; x += 6) outline.push([x, CT + Math.sin(x * 0.7 + seed) * 1.4]);
    for (let y = CT + 12; y < CH - 4; y += 14) outline.push([hi + fbm(nz, y * 0.03 + 3, 2) * 1.8, y]);
    for (let x = hi; x >= lo; x -= 4) { outline.push([x, hemY(x)]); hemPts.push([x, hemY(x) - 2]); }
    for (let y = CH - 10; y > CT; y -= 14) outline.push([lo + fbm(nz, y * 0.03 + 9, 2) * 1.8, y]);
    const Y = t => CT + len * t, X = d => seamX - seamSide * d;
    const sway = Array.from({ length: nFolds + 2 }, () => r() * 9);
    const p = pleats(seed + 30, nFolds, (t, y) => lo + 4 + t * (hi - lo - 8) + fbm(nz, y * 0.012 + sway[Math.floor(t * nFolds)], 2) * 4, () => hi - lo, CT - 2, CH + 4, ['#5A6894', '#6F74A2', '#7C7098'], '#EEF0F8');
    D.defs += lin('ln', far, 0, seamX, 0, [[0, '#7C8AB0'], [0.45, '#9CA6C6'], [0.72, '#D9C3BE'], [0.9, '#FBD9A6'], [1, '#FFEBB4']]);
    svg(name, box, D,
        wash(D, {
            sil: curve(outline, true), pts: outline, seed: seed + 2, box, bead: { every: 2, rMax: 1.9, off: 1.1 },
            inner: rect(box, 'url(#ln)') +
                // the morning let into the wet blue-grey: yellow by the seam, peach beyond it, rose along the hem
                `<g filter="url(#s14)">${pools(seed + 10, [[X(10), Y(0.5), 20, len * 0.56, '#FFE9A8', 0.95], [X(40), Y(0.42), 26, len * 0.4, C.peach, 0.8], [X(66), Y(0.7), 24, 60, '#E9A9A0', 0.55], [X(118), Y(0.3), 40, 80, '#6F7FAE', 0.6], [X(100), Y(0.94), 70, 14, C.peach, 0.75], [X(140), Y(0.8), 26, 50, '#8A82B6', 0.5], [mid, Y(0.03), 80, 12, '#66739C', 0.6]])}</g>` +
                // blooms: where the warm colour ran back into the drying blue, each with its tide line
                runs(seed + 20, [[X(60 + r() * 10), Y(0.26 + r() * 0.1), 27, 1.5], [X(92 + r() * 12), Y(0.62 + r() * 0.1), 21, 1.3], [X(124), Y(0.92), 12, 0.6]], { light: '#FFE4B4', rim: '#D08E92', op: 0.6 }) +
                `<g filter="url(#ep)"><g opacity="0.3"><g filter="url(#w2)">${p.dark}</g></g></g><g filter="url(#h)">${p.lit}</g>` +
                runs(seed + 26, [[X(134 + r() * 10), Y(0.36 + r() * 0.2), 15, 1.6]], { light: '#C9D2EA', rim: '#4F5C8C' }) +
                // the hem: a doubled edge, and the light under it glowing through
                `<path d="${line(hemPts)}" fill="none" stroke="#FFE3A0" stroke-width="7" stroke-opacity="0.7" filter="url(#s2)"/>` +
                `<path d="${line(hemPts)}" fill="none" stroke="#5F6592" stroke-width="1.1" stroke-opacity="0.55" filter="url(#h)" transform="translate(0 -4.6)"/>`,
            low: hemPts, lowCol: '#E58E6E', lowOp: 0.4, lowW: 3,
        }));
}
curtain('curt-l', 500, 20, 182, 7, 1);
curtain('curt-r', 540, 178, 340, 8, -1);

/* ---------- The curtains, drawn back in daylight: gathered and tied ---------- */
function drape(name, seed, wallX, dir, wTop, wTie, wHem, tieY) {
    const lo = Math.min(wallX, wallX + dir * (wTop + 8)), box = [lo - 6, CT - 9, wTop + 26, CH - CT + 22], D = kit(box);
    const r = rng(seed), nz = vnoise(seed + 1);
    const hem = CH + 1, len = hem - CT;
    const width = y => {
        if (y < tieY) { const t = Math.max(0, (y - CT) / (tieY - CT)); return wTop + (wTie - wTop) * (t * t * (3 - 2 * t)); }
        return wTie + (wHem - wTie) * Math.sqrt(Math.min(1, (y - tieY) / (hem - tieY)));
    };
    const at = (t, y) => wallX + dir * (t * width(y) + fbm(nz, y * 0.02 + t * 9, 2) * 1.6 * t);
    const hemY = t => hem - t * 10 + 2.6 * Math.sin(t * 15 + seed);
    const outline = [], hemPts = [];
    for (let t = 0; t <= 1.001; t += 0.14) outline.push([at(t, CT), CT + Math.sin(t * 14 + seed) * 1.2]);
    for (let y = CT + 10; y < hem - 12; y += 10) outline.push([at(1, y), y]);
    for (let t = 1; t >= -0.001; t -= 0.1) { outline.push([at(t, hemY(t)), hemY(t)]); hemPts.push([at(t, hemY(t)), hemY(t) - 2]); }
    for (let y = hem - 10; y > CT; y -= 14) outline.push([at(0, y) - dir * 1.2, y]);
    const p = pleats(seed + 30, 6, (t, y) => at(0.06 + t * 0.9, y), y => width(y), CT - 2, hem + 2, ['#8E9ABC', '#A99AA8', '#9C98B8'], C.paper);
    const tie = [];
    for (let t = -0.05; t <= 1.07; t += 0.16) tie.push([at(t, tieY), tieY + 4.5 * Math.sin(Math.max(0, t) * Math.PI * 0.9) - 2]);
    const Y = t => CT + len * t;
    D.defs += lin('ln', wallX, 0, wallX + dir * wTop, 0, [[0, '#DDD9DC'], [0.55, C.linen], [1, '#FFF1CC']]);
    svg(name, box, D,
        wash(D, {
            sil: curve(outline, true), pts: outline, seed: seed + 2, box, bead: { every: 2, rMax: 1.6, off: 0.9 },
            inner: rect(box, 'url(#ln)') +
                // sunlight through the free edge, the room's blue against the wall, peach below the tie
                `<g filter="url(#s8)">${pools(seed + 10, [[wallX + dir * wTop * 0.92, Y(0.26), 12, 60, C.sun, 0.8], [wallX + dir * wHem * 0.85, Y(0.86), 14, 34, '#FFDD9A', 0.85], [wallX + dir * 8, Y(0.36), 10, 80, C.sky, 0.7], [wallX + dir * wTop * 0.5, tieY + 24, 22, 14, C.peach, 0.6], [wallX + dir * 12, Y(0.9), 12, 26, '#B9AEDA', 0.6]])}</g>` +
                `<g filter="url(#ep)"><g opacity="0.3"><g filter="url(#w2)">${p.dark}</g></g></g><g filter="url(#h)">${p.lit}</g>` +
                // the pinch of shadow at the tie
                `<g filter="url(#s2)"><path d="${curve(tie)}" fill="none" stroke="#7C7890" stroke-width="10" stroke-opacity="0.4"/></g>`,
            low: hemPts, lowCol: '#9A8FA8', lowOp: 0.5, lowW: 4,
        }) +
        // the tie: a strip of peach cloth, its tail hanging at the wall
        `<g filter="url(#e)"><g filter="url(#w2)"><path d="${stroke(tie, 1.7, 1.5, 2.6)}" fill="#F0AE96"/>` +
        `<path d="${stroke([[tie[0][0] + dir * 3, tieY], [tie[0][0] + dir * (5 + r() * 3), tieY + 9], [tie[0][0] + dir * (3 + r() * 3), tieY + 17 + r() * 4]], 1.6, 0.6, 1.7)}" fill="#EDA48E"/></g></g>`);
}
drape('drape-l', 600, 19, 1, 58, 29, 50, CT + 150);
drape('drape-r', 640, 341, -1, 54, 26, 57, CT + 162);

/* ---------- The rod ---------- */
{
    const ry = CT - 4.5;
    const box = [2, ry - 12, 356, 24], D = kit(box);
    const pts = [[12, ry + 0.4], [90, ry - 0.4], [180, ry + 0.3], [270, ry - 0.3], [348, ry + 0.5]];
    svg('rod', box, D,
        `<g filter="url(#e)"><g filter="url(#w2)"><path d="${stroke(pts, 2.3, 2.3, 2.6)}" fill="${C.wood}"/><path d="${puddle(701, 10, ry + 0.4, 4.6, 4.2, 0.12)}" fill="${C.wood}"/><path d="${puddle(702, 350, ry + 0.5, 4.2, 4.5, 0.12)}" fill="${C.wood}"/></g></g>` +
        `<g filter="url(#h)"><path d="${stroke(pts, 0.4, 0.4, 0.7)}" fill="${C.warm}" fill-opacity="0.6" transform="translate(0 -1.1)"/></g>`);
}

/* ---------- The light at the seam and under the hem: bare paper, a little yellow run out of it ---------- */
{
    const box = FULL, hy = CH + 3.2;
    const hemPts = [[22, hy], [100, hy + 1.4], [180, hy + 0.2], [262, hy + 1.5], [338, hy - 0.2]];
    const D = kit(box);
    svg('seam', box, D,
        // yellow let out on the sill under the hem, and one long finger of it from the foot of the seam
        wash(D, {
            sil: `M24 ${hy}H336L346 ${hy + 13}H14Z` + `M176.5 ${hy}L184.5 ${hy}L200 ${SILL + 7}L164 ${SILL + 7}Z`, seed: 801, box, wetId: 'w2', edgeId: 'e2',
            pts: [...quad([176, hy + 14], [171, 330], [164, SILL + 7], 9), ...quad([185, hy + 14], [192, 330], [200, SILL + 7], 9)], bead: { every: 1, rMax: 1.5, off: 1 },
            inner: rect([0, hy - 2, 360, 80], '#FFE7A6', ' fill-opacity="0.7"') + `<g filter="url(#s3)">${pools(810, [[181, hy + 30, 10, 26, C.paper, 0.85], [180, hy + 4, 150, 3, C.paper, 0.7], [184, SILL - 2, 20, 8, C.peach, 0.5]])}</g>`,
        }) +
        `<g filter="url(#s1)"><path d="${lens([180, CT - 2], [180.5, hy], 5.5, 1)}" fill="${C.sun}" fill-opacity="0.9"/><path d="${stroke(hemPts, 1.4, 1.4, 2.6)}" fill="${C.sun}" fill-opacity="0.9"/></g>` +
        `<g filter="url(#h)"><path d="${lens([180.2, CT], [180.6, hy], 1.9, 0.7)}" fill="${C.paper}"/><path d="${stroke(hemPts, 0.6, 0.6, 1.5)}" fill="${C.paper}"/></g>`);
}

/* ---------- A glass of water ---------- */
{
    const { cx, top, bot } = GLASS;
    const box = [cx - 26, top - 12, 52, bot - top + 22], D = kit(box);
    const body = [[cx - 15, top], [cx - 14.2, top + 22], [cx - 12.4, bot - 8], [cx - 9, bot - 0.5], [cx, bot + 1.6], [cx + 9, bot - 0.5], [cx + 12.4, bot - 8], [cx + 14.2, top + 22], [cx + 15, top], [cx + 8, top + 3.4], [cx, top + 4.2], [cx - 8, top + 3.4]];
    const water = top + 19;
    D.defs += lin('gw', cx - 15, 0, cx + 15, 0, [[0, '#9CC6DA'], [0.4, '#CFE6EC'], [0.8, C.paper], [1, '#FFF0C4']]);
    svg('glass', box, D,
        // the far rim, seen through
        `<g filter="url(#h)"><path d="${lens([cx - 15, top], [cx + 15, top], 3.6, 0)}" fill="#DCE8F0" fill-opacity="0.85"/><path d="${lens([cx - 15, top], [cx + 15, top], 0.9, -3)}" fill="#8FA6C6" fill-opacity="0.6"/></g>` +
        wash(D, {
            sil: curve(body, true), pts: body, seed: 901, box, bead: { every: 1, rMax: 0.9, off: 0.4 }, wetId: 'w2',
            inner: rect(box, C.paper, ' fill-opacity="0.8"') + rect([cx - 16, water, 32, bot - water + 4], 'url(#gw)') +
                `<g filter="url(#s2)">${pools(910, [[cx - 9, bot - 14, 4, 14, C.skyDeep, 0.75], [cx + 2, bot - 5, 9, 4, '#8FCBB8', 0.6], [cx + 8, water + 8, 3, 8, C.sun, 0.6]])}</g>` +
                // the stem under water, the water's surface, a highlight left bare
                `<g filter="url(#h)"><path d="${lens([cx - 2, water + 1], [cx - 5, bot - 5], 1, 0.8)}" fill="${C.greenDeep}" fill-opacity="0.7"/>` +
                `<path d="${lens([cx - 14, water], [cx + 14, water], 1.6, 1.2)}" fill="${C.paper}" fill-opacity="0.9"/><path d="${lens([cx - 13, water + 1.6], [cx + 13, water + 1.6], 0.5, 1.6)}" fill="#6FA6C6" fill-opacity="0.7"/>` +
                `<path d="${lens([cx + 11.4, top + 7], [cx + 9.6, bot - 9], 1.1, -0.4)}" fill="#FFFFFF"/></g>`,
        }));
}

/* ---------- The sprig in the glass: it leans to the light ---------- */
{
    const base = [GLASS.cx + 1, GLASS.top + 6];
    const box = [218, 204, 112, 108], D = kit(box);
    const stem = quad(base, [284, 262], [262, 222], 14);
    let sil = '', fills = '', ribs = '';
    const edgePts = [];
    const leaves = [[3, -1, 17, 4], [5, 1, 20, 4.6], [7, -1, 21, 5], [9, 1, 19, 4.6], [11, -1, 16, 4], [12, 1, 15, 3.6], [14, 0, 15, 3.8]];
    leaves.forEach(([i, side, lenL, w], k) => {
        const p = stem[i], q = stem[Math.max(0, i - 1)];
        const dirA = Math.atan2(p[1] - q[1], p[0] - q[0]) + side * (0.85 - k * 0.05);
        const tip = [p[0] + Math.cos(dirA) * lenL, p[1] + Math.sin(dirA) * lenL];
        const blade = quad(p, [(p[0] + tip[0]) / 2 + side * 2, (p[1] + tip[1]) / 2 - 3], tip, 6);
        const d = stroke(blade, 0.5, 0.2, w);
        sil += d; edgePts.push(...blade.slice(2));
        fills += `<path d="${d}" fill="${k % 3 === 0 ? C.greenDeep : k % 2 ? C.green : C.lime}"/>`;
        ribs += `<path d="${stroke(blade.slice(0, 5), 0.2, 0.1, 0.5)}" fill="${C.warm}" fill-opacity="0.6"/>`;
    });
    // two buds near the tip
    const buds = puddle(951, 257, 219, 3, 3.6, 0.2, 8) + puddle(952, 266, 214, 2.4, 3, 0.2, 8);
    D.defs += lin('lf', 230, 0, 310, 0, [[0, C.lime], [0.5, C.green], [1, C.greenDeep]]);
    svg('sprig', box, D,
        `<g filter="url(#e)"><g filter="url(#w2)"><path d="${stroke(stem, 1, 0.4, 0.8)}" fill="#5E8E4E"/></g></g>` +
        wash(D, {
            sil, pts: edgePts, seed: 953, box, bead: { every: 2, rMax: 1.1, off: 1.6 }, wetId: 'w2',
            inner: rect(box, 'url(#lf)') + `<g filter="url(#s2)">${fills}${pools(960, [[258, 240, 12, 10, C.sun, 0.85], [296, 262, 10, 10, '#2F7A52', 0.6], [276, 232, 8, 7, C.lime, 0.9]])}</g><g filter="url(#h)">${ribs}</g>`,
        }) +
        wash(D, { sil: buds, seed: 954, box, wetId: 'w2', inner: rect(box, C.peach) + `<g filter="url(#s1)">${pools(970, [[256, 221, 2, 2, C.rose, 0.9], [267, 213, 1.6, 1.6, C.sun, 0.9]])}</g>` }));
}

/* ---------- A bowl of fruit ---------- */
{
    const { cx, rim, foot } = BOWL;
    const box = [cx - 54, rim - 40, 108, foot - rim + 50], D = kit(box);
    const fruit = (seed, x, y, a, b, base, drops, hx, hy) => wash(D, {
        sil: puddle(seed, x, y, a, b, 0.06, 12), holes: puddle(seed + 1, x + hx, y + hy, a * 0.2, b * 0.13, 0.2, 7), seed: seed + 2, box, wetId: 'w2',
        pts: Array.from({ length: 10 }, (_, k) => [x + Math.cos(k * 0.63) * a, y + Math.sin(k * 0.63) * b]), bead: { every: 2, rMax: 0.9, off: 0.5 },
        inner: rect(box, base) + `<g filter="url(#s3)">${pools(seed + 5, drops)}</g>`,
        low: quad([x - a * 0.8, y + b * 0.5], [x, y + b * 1.1], [x + a * 0.8, y + b * 0.5], 5), lowCol: '#C8644F', lowOp: 0.35, lowW: 3,
    });
    const body = [[cx - 44, rim - 1], [cx - 38, rim + 12], [cx - 25, rim + 22], [cx - 15, foot], [cx + 15, foot], [cx + 25, rim + 22], [cx + 38, rim + 12], [cx + 44, rim - 1], [cx + 23, rim + 5], [cx, rim + 7], [cx - 23, rim + 5]];
    D.defs += lin('bw', cx - 44, 0, cx + 44, 0, [[0, '#A3B0CC'], [0.35, '#DDE4EE'], [0.75, C.paper], [1, '#FFEFC8']]);
    svg('bowl', box, D,
        // the far rim
        `<g filter="url(#e2)"><g filter="url(#w2)"><path d="${lens([cx - 44, rim - 1], [cx + 44, rim - 1], 6.4, 0)}" fill="#E9EDF4"/></g></g>` +
        // a lemon behind, two peaches, an apricot on top, a leaf
        fruit(1010, cx + 27, rim - 8, 12.5, 9, '#FFE27A', [[cx + 33, rim - 6, 6, 5, '#E9D060', 0.9], [cx + 20, rim - 10, 5, 4, C.lime, 0.7]], 3, -4) +
        fruit(1020, cx - 20, rim - 11, 13.4, 12.8, '#FBCB9E', [[cx - 26, rim - 6, 8, 8, C.rose, 0.95], [cx - 14, rim - 18, 7, 5, C.sun, 0.85]], 4, -6) +
        fruit(1030, cx + 6, rim - 15, 14.4, 13.6, '#F9BE96', [[cx + 14, rim - 9, 8, 9, '#E88672', 0.9], [cx, rim - 23, 8, 5, '#FFDC8A', 0.9], [cx - 5, rim - 10, 5, 7, C.peach, 0.7]], -5, -7) +
        fruit(1040, cx - 7, rim - 29, 9.4, 8.8, '#F8B878', [[cx - 3, rim - 26, 5, 5, C.rose, 0.7], [cx - 11, rim - 33, 4, 3, C.sun, 0.9]], -3, -4) +
        `<g filter="url(#e)"><g filter="url(#w2)"><path d="${lens([cx + 12, rim - 27], [cx + 29, rim - 34], 3.4, -1.4)}" fill="#7DB562"/></g></g>` +
        // the bowl: white china, a band of blue let run, shade on the near side
        wash(D, {
            sil: curve(body, true), pts: body, seed: 1050, box, bead: { every: 1, rMax: 1, off: 0.5 }, wetId: 'w2',
            inner: rect(box, 'url(#bw)') +
                `<g filter="url(#s2)"><path d="${lens([cx - 42, rim + 9], [cx + 42, rim + 9], 3.4, -6)}" fill="${C.skyDeep}" fill-opacity="0.75"/>${pools(1060, [[cx - 26, rim + 16, 9, 8, '#7C89B4', 0.6], [cx + 10, rim + 20, 12, 5, C.peach, 0.5], [cx - 4, rim + 12, 8, 3, '#5F8FCB', 0.5]])}</g>` +
                `<g filter="url(#h)"><path d="${lens([cx + 30, rim + 8], [cx + 20, rim + 22], 1.3, -1)}" fill="#FFFFFF"/></g>`,
            low: [[cx - 16, foot - 1], [cx + 16, foot - 1]], lowCol: '#7C89B4', lowOp: 0.5, lowW: 3,
        }));
}

/* ---------- A few books, no lettering ---------- */
{
    const { x0, x1, bot } = BOOKS;
    const box = [x0 - 8, bot - 46, x1 - x0 + 18, 56], D = kit(box);
    // [left, right, top, bottom, cover, deep, tilt]
    const books = [[x0, x1, bot - 13, bot, '#8EA6CE', '#5F78B0', 0], [x0 + 7, x1 - 5, bot - 24.5, bot - 13, '#F3B79C', '#D98672', -1.2], [x0 + 3, x1 - 16, bot - 34, bot - 24.5, '#A8C99A', '#6FA36C', 1.6]];
    let body = '';
    books.forEach(([a, b, t, u, cover, deep, tilt], k) => {
        const pts = wobbly(1100 + k, a, t, b, u, 8, 0.45);
        const pages = wobbly(1110 + k, b - 9, t + 2.2, b - 1.2, u - 2.2, 5, 0.3);
        body += `<g transform="rotate(${tilt} ${(a + b) / 2} ${u})">` + wash(D, {
            sil: line(pts) + 'Z', holes: line(pages) + 'Z', pts, seed: 1120 + k, box, bead: { every: 2, rMax: 0.8, off: 0.4 }, wetId: 'w2',
            inner: rect([a - 2, t - 2, b - a + 4, u - t + 4], cover) +
                `<g filter="url(#s2)">${pools(1130 + k * 4, [[a + 12, (t + u) / 2, 14, 5, deep, 0.75], [b - 26, t + 2.6, 22, 2, C.paper, 0.6], [(a + b) / 2, u - 1.6, 26, 2, deep, 0.6]])}</g>` +
                `<g filter="url(#h)"><path d="${lens([a + 5, t + 1], [a + 5.4, u - 1], 0.7, 0.5)}" fill="${deep}" fill-opacity="0.7"/></g>`,
        }) +
            // the block of pages: bare paper, two hairs of pencil
            `<path d="${line(pages)}Z" fill="${C.paper}" filter="url(#h)"/>` + pencil(1140 + k, [[b - 8.4, (t + u) / 2 - 1.2], [b - 2, (t + u) / 2 - 1]], 0.34, 0.35) + pencil(1150 + k, [[b - 8.4, (t + u) / 2 + 1.6], [b - 2, (t + u) / 2 + 1.4]], 0.26, 0.35) + `</g>`;
    });
    // a ribbon marker let fall from the middle book
    svg('books', box, D, body + `<g filter="url(#e)"><g filter="url(#w2)"><path d="${stroke([[x0 + 8, bot - 18], [x0 + 3, bot - 13], [x0 + 1.5, bot - 5]], 0.9, 0.5, 1.2)}" fill="${C.rose}"/></g></g>`);
}

/* ---------- Before sunrise: the room's dusk, multiplied over everything; lighter where the linen glows ---------- */
{
    const box = FULL, t = y => (y + 12) / 474;
    svg('dim', box,
        lin('d', 0, -12, 0, 462, [[0, '#5A6889'], [t(CT - 8), '#6F7D9F'], [t(CT - 1), '#8D98B6'], [t(CT + 1), '#E4E0E8'], [t(CH - 2), '#E9E2E4'], [t(CH + 5), '#A9AEC6'], [t(SILL - 4), '#8C98B8'], [t(SILL + 10), '#636F90'], [1, '#55627F']]) +
        rad('g', 180, CH + 10, 150, [[0, '#FFF0CC', 0.95], [0.4, '#FFE2B4', 0.5], [1, '#FFE2B4', 0]], `translate(180 ${CH + 10}) scale(1 0.5) translate(-180 ${-(CH + 10)})`) +
        lin('m', 166, 0, 194, 0, [[0, '#FFFFFF', 0], [0.5, '#FFFBEA', 1], [1, '#FFFFFF', 0]]) +
        lin('s', 0, 0, 360, 0, [[0, '#56648A', 0.75], [0.14, '#56648A', 0], [0.86, '#56648A', 0], [1, '#56648A', 0.75]]),
        rect(box, 'url(#d)') + rect(box, 'url(#s)') + rect([166, CT, 28, CH - CT + 4], 'url(#m)') + rect([-12, CH + 2, 384, 90], 'url(#g)'));
}

/* ---------- The flood of light when the curtains part ---------- */
{
    const box = FULL;
    svg('flood', box,
        rad('f', SUN[0], SUN[1], 330, [[0, '#FFF6D8', 0.95], [0.3, '#FFE2A0', 0.6], [0.7, '#FFC9A0', 0.25], [1, '#FFC9A0', 0]], `translate(${SUN[0]} ${SUN[1]}) scale(1 0.8) translate(${-SUN[0]} ${-SUN[1]})`),
        rect(box, 'url(#f)'));
}

console.log(JSON.stringify(BOXES));
