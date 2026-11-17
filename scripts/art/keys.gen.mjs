// Generator for the "keys" wrapper art: the keyboard end of a piano seen from above and a little
// askew. Ten ivory keys run across the lower part; above the fallboard the inside of the instrument
// shows through the open top: a fan of brass strings, tuning pins, a red felt strip, a row of hammers.
// A lid covers the far part of the strings until the tune has been played.
// Flat fills only: two or three tones per surface, no outline, no filter. The two glows are plain
// gradients with alpha stops.
// The piano is laid out upright in its own coordinates (u across, v down) and every point is turned
// by TILT about the middle of the canvas, so each SVG is still in canvas coordinates (viewBox = box).
// Run: node scripts/art/keys.gen.mjs   (prints the layer boxes and pivots the definition uses)
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'keys');
if (!OUT.endsWith('wrappers/keys')) throw new Error('out dir must be public/wrappers/keys');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: a warm near-black, mahogany in two tones, ivory in two, the black keys' top face,
   brass in two, felt red, and the lamp's warm light. */
const C = {
    room: '#16100C',
    mahogany: '#7A2E1D',
    mahoganyLo: '#4A1A12',
    ivory: '#F3E9D2',
    ivoryLo: '#CDBD9C',
    ebony: '#3B2D27',
    brass: '#DDA947',
    brassLo: '#8F6425',
    felt: '#C42F2B',
    light: '#FFD98A',
};

/* ---- geometry ---- */
const TILT = -5;
const CX = 180, CY = 225;
const COS = Math.cos((TILT * Math.PI) / 180), SIN = Math.sin((TILT * Math.PI) / 180);
/** A point of the piano on the canvas. */
const T = ([u, v]) => [CX + (u - CX) * COS - (v - CY) * SIN, CY + (u - CX) * SIN + (v - CY) * COS];
const f = n => String(Math.round(n * 100) / 100);

/** One layer being drawn: it gathers markup and the box of everything in it. */
function layer() {
    let s = '', defs = '';
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const see = ([x, y], pad = 0) => {
        x0 = Math.min(x0, x - pad); y0 = Math.min(y0, y - pad); x1 = Math.max(x1, x + pad); y1 = Math.max(y1, y + pad);
    };
    const L = {
        /** A filled shape given in piano coordinates. */
        poly(pts, fill, extra = '') {
            const q = pts.map(T);
            q.forEach(p => see(p));
            s += `<path d="M${q.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
            return L;
        },
        /** A filled shape given in canvas coordinates. */
        raw(q, fill, extra = '') {
            q.forEach(p => see(p));
            s += `<path d="M${q.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
            return L;
        },
        rect(u0, v0, u1, v1, fill, extra = '') {
            return L.poly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], fill, extra);
        },
        dot(u, v, r, fill, extra = '') {
            const p = T([u, v]);
            see(p, r);
            s += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(r)}" fill="${fill}"${extra}/>`;
            return L;
        },
        rawDot(x, y, r, fill, extra = '') {
            see([x, y], r);
            s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${extra}/>`;
            return L;
        },
        line(a, b, stroke, w, extra = '') {
            const p = T(a), q = T(b);
            see(p, w); see(q, w);
            s += `<path d="M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}" fill="none" stroke="${stroke}" stroke-width="${f(w)}"${extra}/>`;
            return L;
        },
        defs(d) { defs += d; return L; },
        /** Write the file; the box is what was drawn, rounded out and held within `clip` [x0, y0, x1, y1], or the one given. */
        save(name, fixed, clip = [-Infinity, -Infinity, Infinity, Infinity]) {
            const bx = Math.max(Math.floor(x0 - 1), clip[0]), by = Math.max(Math.floor(y0 - 1), clip[1]);
            const box = fixed ?? [bx, by, Math.min(Math.ceil(x1 + 1), clip[2]) - bx, Math.min(Math.ceil(y1 + 1), clip[3]) - by];
            const [x, y, w, h] = box;
            writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}${s}</svg>`);
            BOXES[name] = box;
            return box;
        },
    };
    return L;
}
const BOXES = {};
const FULL = [-6, -6, 372, 462];

/* ---- the layout, in piano coordinates ---- */
const KEY0 = 24, KEYW = 32;                 // the first white key's left edge, and a white key's width
const V = {
    lid: 135,                               // the lid's near edge
    plate: 64,                              // the iron plate's near edge at the left (it slants)
    rail: 214, felt: 228, block: 240,       // the hammer rail, the felt strip, the pin block
    board: 262, keys: 310, end: 482,        // the fallboard, the keys, where the keys are cut
    black: 402,
};
/** White keys, left to right from C: which have a black key on their right. */
const sharpAfter = k => [0, 1, 3, 4, 5].includes(k % 7);
/** The tune: six notes, as (white key index, semitones above the first key). */
const PLAYED = [
    { name: 'c4', key: 0, semi: 0 },
    { name: 'e4', key: 2, semi: 4 },
    { name: 'g4', key: 4, semi: 7 },
    { name: 'b4', key: 6, semi: 11 },
    { name: 'd5', key: 8, semi: 14 },
    { name: 'c5', key: 7, semi: 12 },
];
const STRINGS = 23;                         // seventeen for the keys in view, six more running off to the right
const SEMI = (10 * KEYW) / 17;
/** A string: from its tuning pin, up and inward to its hitch pin on the plate. */
const string = s => {
    const foot = [KEY0 + (s + 0.5) * SEMI, s % 2 ? 256 : 247];
    const tx = 100 + s * 12;
    const top = [tx, plateEdge(tx) - 15];
    return { foot, top, w: s < 6 ? 2.3 : 1.5 };
};
const plateEdge = u => V.plate - (u + 60) * 0.07;
/** Where string `s` is at height `v`. */
const at = (s, v) => {
    const { foot, top } = string(s);
    const k = (v - foot[1]) / (top[1] - foot[1]);
    return [foot[0] + (top[0] - foot[0]) * k, v];
};
const oval = (c, ax, n, ra, rn, steps = 20) => Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return [c[0] + ax[0] * Math.cos(a) * ra + n[0] * Math.sin(a) * rn, c[1] + ax[1] * Math.cos(a) * ra + n[1] * Math.sin(a) * rn];
});

/** A hammer under string `s`: a shank from its pivot on the rail, a felt head with a wooden core. */
function hammer(L, s) {
    const p = at(s, V.rail + 5), q = at(s, 160);
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ax = [(q[0] - p[0]) / len, (q[1] - p[1]) / len], n = [-ax[1], ax[0]];
    const P = (a, b) => [p[0] + ax[0] * a + n[0] * b, p[1] + ax[1] * a + n[1] * b];
    L.poly([P(0, -1.7), P(40, -1.7), P(40, 1.7), P(0, 1.7)], C.brassLo);
    L.poly(oval(P(45, 0), ax, n, 11.5, 6.2), C.ivory);
    L.poly([P(33, -3.4), P(46, -2.4), P(46, 2.4), P(33, 3.4)], C.mahogany);
    L.dot(p[0], p[1], 2.7, C.brass);
    return T(p);
}
function drawString(L, s) {
    const { foot, top, w } = string(s);
    L.line(foot, top, C.brass, w);
}
/** A white key: a strip with the black keys' notches cut from its far end, and the fallboard's shade on it. */
function whiteKey(L, k) {
    const l = KEY0 + k * KEYW + 0.7, r = KEY0 + (k + 1) * KEYW - 0.7;
    const nl = k > 0 && sharpAfter(k - 1) ? 10.4 : 0, nr = sharpAfter(k) ? 10.4 : 0;
    const nv = V.black + 2.5;
    const pts = [[l + nl, V.keys]];
    pts.push([r - nr, V.keys]);
    if (nr) pts.push([r - nr, nv], [r, nv]);
    pts.push([r, V.end], [l, V.end]);
    if (nl) pts.push([l, nv], [l + nl, nv]);
    L.poly(pts, C.ivory);
    L.rect(l + nl, V.keys, r - nr, V.keys + 13, C.ivoryLo);
}

/* ---- back: everything that never moves ---- */
{
    const L = layer();
    L.raw([[-6, -6], [366, -6], [366, 456], [-6, 456]], C.room);
    // The iron plate: brass across the far end, slanting, with an arm down the left; round holes in it.
    L.poly([[-60, -90], [460, -90], [460, plateEdge(460)], [string(0).top[0] - 14, plateEdge(string(0).top[0] - 14)], [at(0, 206)[0] - 13, 206], [-60, 206]], C.brassLo);
    // The cast frame's bracing: darker diagonal struts across the plate, and one down its arm.
    const strut = pts => L.poly(pts, C.room, ' opacity="0.38"');
    strut([[26, -90], [50, -90], [112, 51.5], [88, 53]]);
    strut([[196, -90], [220, -90], [264, 41], [240, 42.5]]);
    strut([[16, 98], [16, 122], [50, 151], [58, 129]]);
    // Three small holes in a falling line between the struts, two bolts at the far right, one on the arm.
    for (const [u, v, r] of [[126, -4, 6], [148, 8, 8.5], [174, 22, 6]]) L.dot(u, v, r, C.room);
    for (const [u, v] of [[296, 24], [324, 22], [34, 188]]) L.dot(u, v, 3, C.brass);
    // Hitch pins, one for each string.
    for (let s = 0; s < STRINGS; s++) L.dot(...string(s).top, 2.6, C.brass);
    // The hammer rail, the felt strip, the pin block.
    L.rect(-60, V.rail, 460, V.rail + 9, C.mahoganyLo);
    L.rect(-60, V.felt, 460, V.felt + 9, C.felt);
    L.rect(-60, V.block, 460, V.board, C.mahoganyLo);
    // Hammers and strings that are not played.
    const played = new Set(PLAYED.map(n => n.semi));
    for (let s = 0; s < STRINGS; s++) if (!played.has(s)) hammer(L, s);
    for (let s = 0; s < STRINGS; s++) if (!played.has(s)) drawString(L, s);
    for (let s = 0; s < STRINGS; s++) L.dot(...string(s).foot, 2.5, C.brass);
    // The case: its left wall beside the strings, the fallboard, the cheek block beside the keys.
    L.rect(-60, -90, 16, V.board, C.mahogany).rect(10, -90, 16, V.board, C.mahoganyLo);
    L.rect(-60, V.board, 460, V.keys, C.mahogany);
    L.rect(-60, V.board, 460, V.board + 5, C.mahoganyLo);
    L.rect(KEY0, 283, 460, 285.4, C.brass);
    L.rect(KEY0, V.keys - 4, 460, V.keys, C.felt);
    L.rect(-60, V.board, KEY0, 500, C.mahogany).rect(KEY0 - 6, V.keys - 4, KEY0, 500, C.mahoganyLo);
    L.dot(-2, 330, 4, C.brass);
    // The keys that are not played, then every black key.
    const keysPlayed = new Set(PLAYED.map(n => n.key));
    for (let k = 0; k < 12; k++) if (!keysPlayed.has(k)) whiteKey(L, k);
    for (let k = 0; k < 12; k++) if (sharpAfter(k)) {
        const c = KEY0 + (k + 1) * KEYW;
        L.rect(c - 9.4, V.keys, c + 9.4, V.black, C.room);
        L.rect(c - 6.6, V.keys, c + 6.6, V.black - 11, C.ebony);
    }
    L.save('back', FULL);
}

/* ---- the six strings, hammers and keys of the tune ---- */
const PIVOT = {};
for (const n of PLAYED) {
    const S = layer();
    drawString(S, n.semi);
    S.dot(...string(n.semi).foot, 2.5, C.brass);
    S.save(`string-${n.name}`);
    const H = layer();
    const p = hammer(H, n.semi);
    const b = H.save(`hammer-${n.name}`);
    PIVOT[`hammer-${n.name}`] = [(p[0] - b[0]) / b[2], (p[1] - b[1]) / b[3]];
    const K = layer();
    whiteKey(K, n.key);
    K.save(`key-${n.name}`);
}

/* ---- lid: mahogany over the far part of the strings, a brass inlay on it ---- */
{
    const L = layer();
    L.rect(-60, -100, 460, V.lid, C.mahogany);
    // One broad facet of reflection, and the near edge's thickness.
    L.poly([[-60, -100], [150, -100], [40, V.lid - 7], [-60, V.lid - 7]], C.mahoganyLo, ' opacity="0.55"');
    L.rect(-60, V.lid - 7, 460, V.lid, C.mahoganyLo);
    // The hinge of the front flap.
    L.rect(-60, 40, 460, 42.4, C.brass);
    // A brass inlay: two thin lines and a lozenge between them.
    for (const v of [89, 99]) L.rect(78, v - 0.9, 160, v + 0.9, C.brass).rect(206, v - 0.9, 288, v + 0.9, C.brass);
    L.poly([[183, 80], [202, 94], [183, 108], [164, 94]], C.brass);
    L.poly([[183, 86], [194, 94], [183, 102], [172, 94]], C.mahoganyLo);
    // Keep the box near the canvas: what lies further out is never seen, even as the lid slides away to the upper left.
    L.save('lid', undefined, [-8, -8, 384, Infinity]);
}

/* ---- glow: the strings lit, a warm pool over them ---- */
{
    const L = layer();
    L.defs(`<radialGradient id="g"><stop offset="0" stop-color="${C.light}" stop-opacity="0.62"/><stop offset="0.55" stop-color="${C.light}" stop-opacity="0.26"/><stop offset="1" stop-color="${C.light}" stop-opacity="0"/></radialGradient>`);
    L.poly(oval([186, 142], [1, 0], [0, 1], 196, 104, 40), 'url(#g)');
    for (let s = 0; s < STRINGS; s++) L.line(at(s, V.felt - 2), at(s, string(s).top[1] + 6), C.light, s < 6 ? 1.5 : 1.1, ' opacity="0.85"');
    L.save('glow', undefined, [-8, -8, 372, Infinity]);
}

/* ---- light: the lamp at the far right corner and the band it lays across the wood (canvas coordinates) ---- */
const LAMP = [316, 40];
{
    const L = layer();
    const end = [66, 318];
    const d = [end[0] - LAMP[0], end[1] - LAMP[1]], len = Math.hypot(...d);
    const ax = [d[0] / len, d[1] / len], n = [-ax[1], ax[0]];
    const P = (a, b) => [LAMP[0] + ax[0] * a + n[0] * b, LAMP[1] + ax[1] * a + n[1] * b];
    L.defs(`<linearGradient id="b" x1="${f(LAMP[0])}" y1="${f(LAMP[1])}" x2="${f(end[0])}" y2="${f(end[1])}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.light}" stop-opacity="0.34"/><stop offset="0.6" stop-color="${C.light}" stop-opacity="0.14"/><stop offset="1" stop-color="${C.light}" stop-opacity="0"/></linearGradient>`);
    L.raw([P(8, -17), P(len, -64), P(len, 64), P(8, 17)], 'url(#b)');
    // The lamp from above: an arm in from the corner, a brass shade, the light under its rim.
    L.raw([[LAMP[0] + 4, LAMP[1] - 9], [372, -22], [384, -10], [LAMP[0] + 9, LAMP[1] - 3]], C.brassLo);
    L.rawDot(LAMP[0], LAMP[1], 27, C.light, ' opacity="0.3"');
    L.rawDot(LAMP[0], LAMP[1], 21, C.brass);
    L.rawDot(LAMP[0], LAMP[1], 13.5, C.brassLo);
    L.rawDot(LAMP[0], LAMP[1], 4, C.brass);
    const b = L.save('light');
    PIVOT.light = [(LAMP[0] - b[0]) / b[2], (LAMP[1] - b[1]) / b[3]];
}

/* ---- mote: one warm speck, scattered when the strings light ---- */
{
    const L = layer();
    const [x, y] = T([186, 150]).map(Math.round);
    L.raw([[x, y - 3.4], [x + 3.4, y], [x, y + 3.4], [x - 3.4, y]], C.light);
    L.save('mote', [x - 4, y - 4, 8, 8]);
}

/* ---- what the definition needs ---- */
const r4 = n => Math.round(n * 1000) / 1000;
for (const [name, box] of Object.entries(BOXES)) console.log(name.padEnd(12), JSON.stringify(box), PIVOT[name] ? `origin ${JSON.stringify(PIVOT[name].map(r4))}` : '');
const down = [-SIN, COS];
console.log('down (per unit):', down.map(r4), ' area (canvases):', r4(Object.values(BOXES).reduce((a, b) => a + b[2] * b[3], 0) / (360 * 450)));
