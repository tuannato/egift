// Generator for the "neon" wrapper art: a neon sign on a dark brick wall, a heart drawn as a double
// tube over the words "forever love" in single-line tube lettering (paths, no font). A lit tube is a near-white core line, a coloured line round
// it and wide strokes of low alpha for the glow; an unlit tube is the same path in grey glass. Glows
// and light on the wall are gradients with alpha stops: no filter, no blend mode. Every colour is in
// the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/neon.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'neon');
if (!OUT.endsWith('wrappers/neon')) throw new Error('out dir must be public/wrappers/neon');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: three plums for the wall, a near-black for metal and shadow, two greys for cold glass,
   the two gases, the white of a lit core, and the amber of the street outside. */
const C = {
    wall: '#150A1C', // mortar, the wall in shadow
    brick: '#22122B',
    brickHi: '#2E1A38',
    ink: '#0B0510', // metal, cable, silhouettes
    glass: '#6B6276', // an unlit tube
    glassHi: '#A79FB2', // the light along it
    pink: '#FF2E88',
    cyan: '#22E3FF',
    core: '#FFF3FA',
    amber: '#FFC978',
};

const f = n => String(Math.round(n * 10) / 10);
const boxes = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    boxes[name] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** Deterministic noise (mulberry32). */
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

/* ---------- curve helpers ---------- */
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const P = p => `${f(p[0])} ${f(p[1])}`;
/** A closed smooth curve through the middles of a polygon's sides: every corner becomes a bend, as glass does. */
function smoothClosed(pts) {
    const n = pts.length;
    let d = `M${P(mid(pts[n - 1], pts[0]))}`;
    for (let i = 0; i < n; i++) d += `Q${P(pts[i])} ${P(mid(pts[i], pts[(i + 1) % n]))}`;
    return d + 'Z';
}
function smoothOpen(pts) {
    const n = pts.length;
    let d = `M${P(pts[0])}L${P(mid(pts[0], pts[1]))}`;
    for (let i = 1; i < n - 1; i++) d += `Q${P(pts[i])} ${P(mid(pts[i], pts[i + 1]))}`;
    return d + `L${P(pts[n - 1])}`;
}
/** `m` points evenly spaced along a polyline, starting at its first point. */
function resample(pts, m, closed) {
    const src = closed ? [...pts, pts[0]] : pts;
    const len = [0];
    for (let i = 1; i < src.length; i++) len.push(len[i - 1] + Math.hypot(src[i][0] - src[i - 1][0], src[i][1] - src[i - 1][1]));
    const total = len[len.length - 1];
    const out = [];
    let k = 1;
    for (let j = 0; j < m; j++) {
        const s = (total * j) / (closed ? m : m - 1);
        while (k < src.length - 1 && len[k] < s) k++;
        const u = (s - len[k - 1]) / (len[k] - len[k - 1] || 1);
        out.push([src[k - 1][0] + (src[k][0] - src[k - 1][0]) * u, src[k - 1][1] + (src[k][1] - src[k - 1][1]) * u]);
    }
    return out;
}
function inside(poly, [x, y]) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
}
const minDist = (pts, q) => pts.reduce((m, p) => Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1])), Infinity);

/* ---------- the sign's geometry ---------- */
const HX = 180, HY = 112, HS = 5.2; // the heart: where its curve has its origin, and its scale
const GAP = 12; // between the two tubes of the heart
const TUBE = 6;

/** The heart's outer tube, dense. Index 0 is the dip between the lobes; it runs clockwise. */
const heartDense = Array.from({ length: 720 }, (_, i) => {
    const t = (2 * Math.PI * i) / 720;
    return [HX + HS * 16 * Math.sin(t) ** 3, HY - HS * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
});
/** The same curve drawn `d` inside itself: a second tube that keeps its distance all the way round. */
function inset(pts, d) {
    const n = pts.length, right = [], left = [];
    for (let i = 1; i < n; i++) {
        const a = pts[i - 1], b = pts[(i + 1) % n];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        let nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
        if (!inside(pts, [pts[i][0] + nx * 0.5, pts[i][1] + ny * 0.5])) { nx = -nx; ny = -ny; }
        const q = [pts[i][0] + nx * d, pts[i][1] + ny * d];
        if (minDist(pts, q) >= d - 0.35) (i < n / 2 ? right : left).push(q);
    }
    // Round the dip: half a circle about its point, from the left side down and round to the right.
    const arc = [];
    for (let k = 1; k < 16; k++) {
        const a = Math.PI - (Math.PI * k) / 16;
        arc.push([pts[0][0] + d * Math.cos(a), pts[0][1] + d * Math.sin(a)]);
    }
    // Start at the bottom of that arc, so that the curve is the same on both sides.
    return [...arc.slice(7), ...right, ...left, ...arc.slice(0, 7)];
}
const heartIn = inset(heartDense, GAP);
// The inner tube stops short of the point, so that the heart comes down to a single tube there.
const TIP = HY + HS * 17;
const cutAt = heartIn.findIndex(p => p[1] > TIP - 36), cutEnd = heartIn.length - 1 - [...heartIn].reverse().findIndex(p => p[1] > TIP - 36);
const heartInOpen = [...heartIn.slice(cutEnd + 1), ...heartIn.slice(0, cutAt)];
const HEART = smoothClosed(resample(heartDense, 84, true)) + smoothOpen(resample(heartInOpen, 60, false));

/* ---------- the lettering: a rounded single-line alphabet of the six letters the sign needs, each letter
   its own piece of bent tube. Units: the x-height is 1, the baseline 0, y upward; an ascender reaches 1.7. ---------- */
/** Points along an arc, angles in degrees, anticlockwise from the right. */
const arc = (cx, cy, rx, ry, a0, a1) => {
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 12));
    return Array.from({ length: n + 1 }, (_, i) => {
        const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
        return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });
};
const ASC = 1.7;
/** Each letter: its width, and its strokes (a closed one is marked). */
const LETTERS = {
    f: { w: 0.86, strokes: [[[0.2, 0], [0.2, 1.2], ...arc(0.55, 1.35, 0.35, 0.35, 180, 30)], [[0, 1], [0.62, 1]]] },
    o: { w: 0.96, strokes: [Object.assign(arc(0.48, 0.5, 0.48, 0.5, 0, 348), { closed: true })] },
    r: { w: 0.62, strokes: [[[0, 1], [0, 0]], arc(0.4, 0.6, 0.4, 0.4, 180, 50)] },
    e: { w: 0.96, strokes: [[[0.03, 0.5], [0.8, 0.5], ...arc(0.48, 0.5, 0.48, 0.5, 0, 318)]] },
    v: { w: 0.86, strokes: [[[0, 1], [0.36, 0.16], [0.43, 0], [0.5, 0.16], [0.86, 1]]] },
    l: { w: 0.24, strokes: [[[0, ASC], [0, 0.4], ...arc(0.3, 0.3, 0.3, 0.3, 180, 250)]] },
};
/** The space between two letters, by the shapes that face each other. */
const KERN = { fo: 0.16, or: 0.34, re: 0.22, ev: 0.24, ve: 0.24, er: 0.34, lo: 0.36, ov: 0.24 };
/** A word set on a baseline, centred on `cx`: its path, where it starts and ends, and its width. */
function word(text, cx, base, X) {
    let width = 0;
    [...text].forEach((ch, i) => { width += LETTERS[ch].w + (i > 0 ? KERN[text[i - 1] + ch] : 0); });
    let x = cx - (width * X) / 2, d = '';
    const x0 = x;
    [...text].forEach((ch, i) => {
        if (i > 0) x += KERN[text[i - 1] + ch] * X;
        for (const st of LETTERS[ch].strokes) {
            const pts = st.map(([u, v]) => [x + u * X, base - v * X]);
            d += st.closed ? smoothClosed(pts) : smoothOpen(pts);
        }
        x += LETTERS[ch].w * X;
    });
    return { d, x0, x1: x, base, X };
}
const FOREVER = word('forever', 180, 260, 30);
const LOVE = word('love', 180, 346, 40);

/** The small tubes: three short rays on each side of the heart, as light is drawn coming off a thing. */
const RC = [HX, 120];
const ray = (sign, deg) => {
    const a = (deg * Math.PI) / 180, at = r => [RC[0] + sign * r * Math.sin(a), RC[1] - r * Math.cos(a)];
    return [at(112), at(138)];
};
const raySet = sign => [56, 84, 112].map(deg => ray(sign, deg));
const rayPath = sign => raySet(sign).map(([a, b]) => `M${P(a)}L${P(b)}`).join('');
const rayBox = sign => {
    const pts = raySet(sign).flat(), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.floor(Math.min(...xs)) - 13, y0 = Math.floor(Math.min(...ys)) - 13;
    return [x0, y0, Math.ceil(Math.max(...xs)) + 13 - x0, Math.ceil(Math.max(...ys)) + 13 - y0];
};
const RAYS = rayPath(-1) + rayPath(1);
/** Where each ray ends, and which way it points: for its electrode sleeve. */
const ends = [-1, 1].flatMap(s => raySet(s).map(([a, b]) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [b[0], b[1], (b[0] - a[0]) / l, (b[1] - a[1]) / l]; }));

/* ---------- how a tube is drawn ---------- */
const G = (inner, cap = 'round') => `<g fill="none" stroke-linecap="${cap}" stroke-linejoin="round">${inner}</g>`;
/** Lit: three wide faint strokes for the glow, the gas, the core. `k` scales the glow, `w` is the tube. */
const lit = (d, col, k = 1, w = TUBE) =>
    `<path d="${d}" stroke="${col}" stroke-width="${f(30 * k)}" stroke-opacity="0.06"/>` +
    `<path d="${d}" stroke="${col}" stroke-width="${f(19 * k)}" stroke-opacity="0.1"/>` +
    `<path d="${d}" stroke="${col}" stroke-width="${f(11.5 * k)}" stroke-opacity="0.2"/>` +
    `<path d="${d}" stroke="${col}" stroke-width="${f(w + 0.6)}"/>` +
    `<path d="${d}" stroke="${C.core}" stroke-width="${f(w * 0.4)}"/>`;
/** Unlit: grey glass with a line of light along it. */
const cold = (d, w = TUBE) => `<path d="${d}" stroke="${C.glass}" stroke-width="${w}"/><path d="${d}" stroke="${C.glassHi}" stroke-width="${f(w * 0.25)}" stroke-opacity="0.85"/>`;
/** The shadow a tube throws on the wall, standing off it. */
const shadow = (d, w = TUBE) => `<path d="${d}" stroke="${C.ink}" stroke-width="${w + 1}" stroke-opacity="0.5" transform="translate(4 6)"/>`;
const WF = 5, WL = 6; // the tubes of the two words

/* ---- wall: bricks in running bond, the light of a window across the top left corner, darker edges ---- */
{
    const B = [-6, -6, 372, 462];
    const rnd = rng(77);
    let base = '', hi = '', lo = '';
    for (let row = 0; row < 24; row++) {
        const y = -8 + row * 20;
        for (let col = -1; col < 9; col++) {
            const x = -8 + col * 46 + (row % 2) * 23;
            const one = `M${x} ${y}h43v17h-43z`;
            base += one;
            const r = rnd();
            if (r < 0.16) hi += one;
            else if (r > 0.86) lo += one;
        }
    }
    let s = `<defs><linearGradient id="w" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="150" y2="170"><stop offset="0" stop-color="${C.glassHi}" stop-opacity="0.26"/><stop offset="1" stop-color="${C.glassHi}" stop-opacity="0"/></linearGradient>` +
        `<radialGradient id="v" gradientUnits="userSpaceOnUse" cx="180" cy="200" r="330"><stop offset="0.45" stop-color="${C.ink}" stop-opacity="0"/><stop offset="1" stop-color="${C.ink}" stop-opacity="0.75"/></radialGradient></defs>`;
    s += `<rect x="-6" y="-6" width="372" height="462" fill="${C.wall}"/>`;
    s += `<path d="${base}" fill="${C.brick}"/><path d="${hi}" fill="${C.brickHi}"/><path d="${lo}" fill="${C.wall}" fill-opacity="0.55"/>`;
    // The window's light: a slanted patch in four panes.
    const pane = (pts) => `<path d="M${pts.map(P).join('L')}Z" fill="url(#w)"/>`;
    const q = (u, v) => [-30 + u * 150 + v * 62, -34 + u * -22 + v * 150]; // the patch's own axes
    for (const [u0, u1, v0, v1] of [[0, 0.47, 0, 0.47], [0.53, 1, 0, 0.47], [0, 0.47, 0.53, 1], [0.53, 1, 0.53, 1]]) s += pane([q(u0, v0), q(u1, v0), q(u1, v1), q(u0, v1)]);
    s += `<rect x="-6" y="-6" width="372" height="462" fill="url(#v)"/>`;
    svg('wall', B, s);
}

/* ---- spill: the sign's colour on the bricks ---- */
{
    const B = [0, 10, 360, 390];
    const g = (id, col, o) => `<radialGradient id="${id}"><stop offset="0" stop-color="${col}" stop-opacity="${o}"/><stop offset="0.55" stop-color="${col}" stop-opacity="${f(o * 0.45)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
    const s = `<defs>${g('p', C.pink, 0.36)}${g('c', C.cyan, 0.26)}${g('q', C.pink, 0.3)}</defs>` +
        `<ellipse cx="180" cy="126" rx="180" ry="116" fill="url(#p)"/><ellipse cx="180" cy="240" rx="180" ry="80" fill="url(#c)"/><ellipse cx="180" cy="322" rx="176" ry="78" fill="url(#q)"/>`;
    svg('spill', B, s);
}

/* ---- halos: the air round the lit tubes ---- */
const halo = (name, col, cx, cy, rx, ry, o) => svg(name, [cx - rx, cy - ry, 2 * rx, 2 * ry], `<defs><radialGradient id="h"><stop offset="0" stop-color="${col}" stop-opacity="${o}"/><stop offset="0.55" stop-color="${col}" stop-opacity="${f(o * 0.5)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#h)"/>`);
halo('halo-h', C.pink, 180, 124, 122, 110, 0.5);
halo('halo-f', C.cyan, 180, 238, 146, 48, 0.4);
halo('halo-l', C.pink, 180, 316, 112, 58, 0.42);

/* ---- shade: the shadows the cold heart and letters throw on the wall; they go when the tubes light ---- */
svg('shade', [62, 46, 240, 312], G(shadow(HEART) + shadow(FOREVER.d, WF) + shadow(LOVE.d, WL)));

/* ---- tubes: the whole sign cold, with its mounts, its cables and the transformer ---- */
{
    const B = [18, 30, 324, 366];
    const TX = 272, TY = 356; // the transformer's corner
    let s = '';
    // Cables, behind everything: from the heart, the end of each word, down to the box; one off to the left.
    const cable = d => `<path d="${d}" stroke="${C.ink}" stroke-width="2.2"/>`;
    const hr = heartDense[170];
    s += G(cable(`M${P(hr)}C320 ${f(hr[1] + 40)} 336 270 ${TX + 46} ${TY}`) + cable(`M${f(FOREVER.x1 - 2)} ${FOREVER.base - 24}C318 ${FOREVER.base - 12} 306 310 ${TX + 30} ${TY}`) + cable(`M${f(LOVE.x1 - 4)} ${LOVE.base - 10}C${f(LOVE.x1 + 6)} ${LOVE.base + 2} ${TX + 6} ${TY - 14} ${TX + 12} ${TY}`) + cable(`M${f(FOREVER.x0 + 6)} ${FOREVER.base}C48 ${FOREVER.base + 12} 46 340 36 392`));
    // Mounts: a dark foot under the glass wherever it is held.
    const foot = ([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="5.2" fill="${C.ink}"/><circle cx="${f(x)}" cy="${f(y)}" r="5.2" fill="none" stroke="${C.brickHi}" stroke-width="1"/>`;
    const feet = [60, 170, 300, 420, 550, 660].map(i => heartDense[i]);
    s += feet.map(foot).join('');
    // Electrode sleeves at the outer ends of the rays.
    s += G(ends.map(([x, y, ux, uy]) => `<path d="M${f(x + ux * 1)} ${f(y + uy * 1)}L${f(x + ux * 8)} ${f(y + uy * 8)}" stroke="${C.ink}" stroke-width="${TUBE + 1.5}"/>`).join(''), 'butt');
    // The glass.
    s += G(cold(HEART) + cold(RAYS) + cold(FOREVER.d, WF) + cold(LOVE.d, WL));
    // The transformer: a flat metal box, three terminals, cooling slots, a standby lamp.
    s += `<rect x="${TX + 8}" y="${TY - 6}" width="8" height="8" fill="${C.glass}"/><rect x="${TX + 42}" y="${TY - 6}" width="8" height="8" fill="${C.glass}"/><rect x="${TX + 26}" y="${TY - 4}" width="8" height="6" fill="${C.glass}"/>`;
    s += `<rect x="${TX - 5}" y="${TY + 12}" width="70" height="10" rx="2" fill="${C.ink}"/>`;
    s += `<rect x="${TX}" y="${TY}" width="60" height="36" rx="3" fill="${C.ink}"/><rect x="${TX}" y="${TY}" width="60" height="3" rx="1.5" fill="${C.brickHi}"/>`;
    s += `<rect x="${TX + 8}" y="${TY + 12}" width="26" height="3.5" rx="1.75" fill="${C.brick}"/><rect x="${TX + 8}" y="${TY + 21}" width="26" height="3.5" rx="1.75" fill="${C.brick}"/>`;
    s += `<circle cx="${TX + 48}" cy="${TY + 14}" r="5" fill="${C.brick}"/><circle cx="${TX + 48}" cy="${TY + 14}" r="2" fill="${C.amber}"/>`;
    s += `<rect x="${TX + 43}" y="${TY + 24}" width="10" height="3" rx="1.5" fill="${C.brickHi}"/>`;
    svg('tubes', B, s);
}

/* ---- the lit tubes, each over its cold self ---- */
{
    const xs = heartDense.map(p => p[0]), ys = heartDense.map(p => p[1]);
    const x0 = Math.floor(Math.min(...xs)) - 16, y0 = Math.floor(Math.min(...ys)) - 16;
    svg('heart-lit', [x0, y0, Math.ceil(Math.max(...xs)) + 16 - x0, Math.ceil(Math.max(...ys)) + 16 - y0], G(lit(HEART, C.pink)));
    const wordBox = (w, pad) => { const l = Math.floor(w.x0 - pad), t = Math.floor(w.base - ASC * w.X - pad); return [l, t, Math.ceil(w.x1 + pad) - l, Math.ceil(w.base + pad) - t]; };
    svg('forever-lit', wordBox(FOREVER, 13), G(lit(FOREVER.d, C.cyan, 0.8, WF)));
    svg('love-lit', wordBox(LOVE, 14), G(lit(LOVE.d, C.pink, 0.86, WL)));
    svg('rays-l', rayBox(-1), G(lit(rayPath(-1), C.cyan, 0.8)));
    svg('rays-r', rayBox(1), G(lit(rayPath(1), C.cyan, 0.8)));
}

/* ---- bar: a shelf of bottles and glasses along the bottom, in silhouette; and the sign's light on their edges ---- */
{
    const Y = 438; // the shelf's top, near the frame's edge
    const bottle = (x, w, h, nw, nh) => {
        const t = Y - h, sh = Math.min(16, w * 0.7);
        return `M${f(x - w / 2)} ${Y}L${f(x - w / 2)} ${f(t + nh + sh)}Q${f(x - w / 2)} ${f(t + nh)} ${f(x - nw / 2)} ${f(t + nh)}L${f(x - nw / 2)} ${f(t)}L${f(x + nw / 2)} ${f(t)}L${f(x + nw / 2)} ${f(t + nh)}Q${f(x + w / 2)} ${f(t + nh)} ${f(x + w / 2)} ${f(t + nh + sh)}L${f(x + w / 2)} ${Y}`;
    };
    const tumbler = (x, w, h) => `M${f(x - w / 2 + 2)} ${Y}L${f(x - w / 2)} ${Y - h}L${f(x + w / 2)} ${Y - h}L${f(x + w / 2 - 2)} ${Y}`;
    const coupe = (x, w, h) => `M${f(x - 8)} ${Y}L${f(x - 1)} ${Y - 2}L${f(x - 1)} ${f(Y - h + w * 0.42)}Q${f(x - w / 2)} ${f(Y - h + w * 0.4)} ${f(x - w / 2)} ${Y - h}L${f(x + w / 2)} ${Y - h}Q${f(x + w / 2)} ${f(Y - h + w * 0.4)} ${f(x + 1)} ${f(Y - h + w * 0.42)}L${f(x + 1)} ${Y - 2}L${f(x + 8)} ${Y}`;
    // [path, x, which gas lights it]
    const items = [
        [bottle(20, 26, 78, 9, 26), 20, C.cyan],
        [bottle(52, 32, 52, 11, 12), 52, C.cyan],
        [tumbler(86, 22, 26), 86, C.cyan],
        [bottle(112, 17, 54, 7, 18), 112, C.pink],
        [coupe(148, 30, 38), 148, C.pink],
        [tumbler(186, 24, 22), 186, C.pink],
        [bottle(220, 24, 46, 9, 12), 220, C.pink],
        [coupe(256, 28, 32), 256, C.pink],
        [tumbler(298, 22, 24), 298, C.cyan],
        [bottle(346, 26, 62, 10, 20), 346, C.cyan],
    ];
    // Each silhouette has a thin cold rim, so that the shelf is seen before the sign is lit.
    let s = items.map(([d]) => `<path d="${d}Z" fill="${C.ink}" stroke="${C.glass}" stroke-width="1" stroke-opacity="0.55" stroke-linejoin="round"/>`).join('');
    s += `<rect x="-6" y="${Y}" width="372" height="18" fill="${C.ink}"/><rect x="-6" y="${Y}" width="372" height="2" fill="${C.glass}" fill-opacity="0.7"/>`;
    // A line of light down each piece of glass, so that it reads as glass in the dark.
    s += items.map(([, x], i) => `<rect x="${f(x - 5 + (i % 3))}" y="${Y - 20}" width="1.6" height="15" rx="0.8" fill="${C.glassHi}" fill-opacity="0.3"/>`).join('');
    svg('bar', [-6, 356, 372, 100], s);
    const grad = (id, col) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${Y - 80}" x2="0" y2="${Y}"><stop offset="0" stop-color="${col}" stop-opacity="0.95"/><stop offset="0.6" stop-color="${col}" stop-opacity="0.3"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>`;
    const wash = (id, col) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${Y - 76}" x2="0" y2="${Y}"><stop offset="0" stop-color="${col}" stop-opacity="0.34"/><stop offset="0.75" stop-color="${col}" stop-opacity="0.05"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>`;
    let l = `<defs>${grad('a', C.pink)}${grad('b', C.cyan)}${wash('c', C.pink)}${wash('d', C.cyan)}<linearGradient id="e" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="360" y2="0"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0.7"/><stop offset="0.5" stop-color="${C.pink}" stop-opacity="0.9"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0.7"/></linearGradient></defs>`;
    // The glass takes the colour from above: a wash that dies half way down, and a thin bright edge.
    l += items.map(([d, , col]) => `<path d="${d}Z" fill="url(#${col === C.pink ? 'c' : 'd'})"/>`).join('');
    l += G(items.map(([d, , col]) => `<path d="${d}" stroke="url(#${col === C.pink ? 'a' : 'b'})" stroke-width="1.1"/>`).join(''));
    l += `<rect x="-6" y="${Y}" width="372" height="2" fill="url(#e)"/>`;
    svg('bar-lit', [-6, 356, 372, 86], l);
}

/* ---- spark: one small amber splinter, thrown from the transformer's terminals ---- */
svg('spark', [298, 347, 7, 7], `<path d="M301.5 347L302.9 350.5L301.5 354L300.1 350.5Z" fill="${C.amber}"/><path d="M298 350.5L301.5 349.6L305 350.5L301.5 351.4Z" fill="${C.core}"/>`);

const area = Object.values(boxes).reduce((a, b) => a + b[2] * b[3], 0) / (360 * 450);
console.log(Object.entries(boxes).map(([k, b]) => `${k}: [${b.join(', ')}]`).join('\n'));
console.log('area', area.toFixed(2));
