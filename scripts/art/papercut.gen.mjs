// Generator for the "papercut" wrapper art: Chinese folk paper-cutting (jianzhi) for the Spring
// Festival. A craft table seen from above: one red sheet folded in half with its first notches cut,
// a pair of paper-cut scissors, curls of red offcuts, a paste pot and brush, a stack of red paper
// under a sheet of gold leaf, all on a deep indigo work mat over a cream table. Opened, the sheet is
// a symmetrical rosette: a peony at the centre, a pair of carp mirrored about the fold, a pearl
// between their heads, waves under their tails, plum blossoms and cloud scrolls in the border.
// Flat fills only: no gradient, no filter, no outline. The "holes" of the cut paper are painted in
// the mat's colour, so the rosette reads as lace lying on the mat.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/papercut.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'papercut');
if (!OUT.endsWith('wrappers/papercut')) throw new Error('out dir must be public/wrappers/papercut');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: one red paper in two tones, cream table in two, gold leaf in two, ink, steel, the mat in two indigos. */
const C = {
    red: '#C8102E',
    redLo: '#8E0B22',
    cream: '#F4EBD9',
    creamLo: '#E3D3B4',
    gold: '#D4A23C',
    goldHi: '#F3D37C',
    ink: '#231A17',
    steel: '#B9BFC4',
    mat: '#24304A',
    matLo: '#33425F',
};

const f = n => String(Math.round(n * 100) / 100);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(pt).join('L')}Z" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ell = (cx, cy, rx, ry, rot, fill) => `<ellipse cx="0" cy="0" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)})"/>`;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
const rad = d => (d * Math.PI) / 180;
const at = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
/** A point in a local frame: origin `o`, unit axis `u` (along) and `v` (across). */
const local = (o, u, v) => ([a, b]) => [o[0] + u[0] * a + v[0] * b, o[1] + u[1] * a + v[1] * b];

/** A scalloped disc: `n` round lobes bulging out between points on radius `r`. */
function scallop(cx, cy, r, n, rot, fill, bulge = 1) {
    const pts = Array.from({ length: n }, (_, i) => at(cx, cy, r, rot + (i * 360) / n));
    const chord = 2 * r * Math.sin(Math.PI / n);
    const rr = (chord / 2) * bulge;
    return `<path d="M${pt(pts[0])}${pts.map((_, i) => `A${f(rr)} ${f(rr)} 0 0 1 ${pt(pts[(i + 1) % n])}`).join('')}Z" fill="${fill}"/>`;
}
/** A crescent: the outer arc of a circle (centre, radius) spanning `span` degrees about `dir`, closed by a flatter arc. */
function crescent(cx, cy, r, dir, span, fill, flat = 1.35) {
    const p1 = at(cx, cy, r, dir - span / 2);
    const p2 = at(cx, cy, r, dir + span / 2);
    const chord = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const r2 = Math.max(r * flat, chord / 2 + 0.01);
    return `<path d="M${pt(p1)}A${f(r)} ${f(r)} 0 0 1 ${pt(p2)}A${f(r2)} ${f(r2)} 0 0 0 ${pt(p1)}Z" fill="${fill}"/>`;
}
/** A five-petal plum blossom cut as holes: five oval petals round a centre that stays paper. */
const blossomCut = (cx, cy, s, rot, fill) => Array.from({ length: 5 }, (_, i) => { const a = rot + i * 72; const [x, y] = at(cx, cy, s * 0.62, a); return ell(x, y, s * 0.5, s * 0.33, a, fill); }).join('');
/** A five-petal plum blossom in paper: round petals, a cut ring of small crescents at its heart. */
const blossom = (cx, cy, s, rot, fill, cut) => scallop(cx, cy, s * 0.62, 5, rot, fill, 1.25) + Array.from({ length: 5 }, (_, i) => crescent(...at(cx, cy, s * 0.55, rot + 36 + i * 72), s * 0.28, rot + 36 + i * 72, 150, cut)).join('');
/** A leaf: a pointed lens from `a` to `b`, `w` wide, with a slit down its middle. */
function leaf(a, b, w, fill, cut) {
    const u = [(b[0] - a[0]), (b[1] - a[1])];
    const L = Math.hypot(...u);
    const uu = [u[0] / L, u[1] / L], vv = [-uu[1], uu[0]];
    const P = local(a, uu, vv);
    const d = `M${pt(P([0, 0]))}Q${pt(P([L * 0.45, w]))} ${pt(P([L, 0]))}Q${pt(P([L * 0.55, -w]))} ${pt(P([0, 0]))}Z`;
    const s = `M${pt(P([L * 0.2, 0]))}Q${pt(P([L * 0.5, w * 0.22]))} ${pt(P([L * 0.82, 0]))}Q${pt(P([L * 0.5, -w * 0.12]))} ${pt(P([L * 0.2, 0]))}Z`;
    return `<path d="${d}" fill="${fill}"/><path d="${s}" fill="${cut}"/>`;
}

/* ====================================================================== */
/* The rosette: 117 in radius about the fold's middle (180, 220).          */
/* ====================================================================== */
const CX = 180, CY = 220;
const RB = 106; // the border's scallop base
const RI = 88; // the inner edge of the border
const mirror = s => `<g transform="matrix(-1 0 0 1 360 0)">${s}</g>`;
/** Both sides of a motif drawn for the right: the fold makes them mirror images. */
const both = s => s + mirror(s);

/* -- the carp (right one; the left is its mirror). It curls round the peony: head at the top facing the
   pearl, back to the outside, tail flicking out at the bottom. Built along an arc about (180, 216). -- */
const FC = [180, 216], FR = 66, TH0 = -82, TH1 = 52;
const fishAt = t => {
    const th = TH0 + (TH1 - TH0) * t;
    const p = at(FC[0], FC[1], FR, th);
    const n = [Math.cos(rad(th)), Math.sin(rad(th))]; // outward: the back
    const T = [-Math.sin(rad(th)), Math.cos(rad(th))]; // toward the tail
    return { p, n, T };
};
const halfW = t => (t < 0.3 ? 7.5 + 8 * Math.sin((t / 0.3) * Math.PI / 2) : 4 + 11.5 * Math.cos(((t - 0.3) / 0.7) * Math.PI / 2));
function carp(red, cut) {
    const N = 40;
    const back = [], belly = [];
    for (let i = 0; i <= N; i++) {
        const t = i / N; const { p, n } = fishAt(t); const h = halfW(t);
        back.push([p[0] + n[0] * h, p[1] + n[1] * h]);
        belly.push([p[0] - n[0] * h, p[1] - n[1] * h]);
    }
    // The snout: a round cap ahead of t = 0.
    const s0 = fishAt(0), h0 = halfW(0);
    const cap = [];
    for (let k = 1; k < 12; k++) {
        const a = Math.PI * (k / 12);
        cap.push([s0.p[0] + s0.n[0] * h0 * Math.cos(a) - s0.T[0] * h0 * 1.25 * Math.sin(a), s0.p[1] + s0.n[1] * h0 * Math.cos(a) - s0.T[1] * h0 * 1.25 * Math.sin(a)]);
    }
    let s = poly([...back, ...belly.reverse(), ...cap], red);
    // The dorsal fin along the back: a broad sail with a lobed edge.
    const fin = [];
    const t0 = 0.26, t1 = 0.64;
    for (let i = 0; i <= 30; i++) {
        const t = t0 + (t1 - t0) * (i / 30); const { p, n } = fishAt(t);
        const sw = Math.sin(Math.PI * (i / 30));
        const lift = halfW(t) - 1 + 9 * Math.pow(sw, 0.6) * (0.82 + 0.18 * Math.cos(i * Math.PI / 5));
        fin.push([p[0] + n[0] * lift, p[1] + n[1] * lift]);
    }
    for (let i = 30; i >= 0; i--) { const t = t0 + (t1 - t0) * (i / 30); const { p, n } = fishAt(t); const l = halfW(t) - 2; fin.push([p[0] + n[0] * l, p[1] + n[1] * l]); }
    s += poly(fin, red);
    // The belly fins: two small sweeping leaves.
    for (const [t, len] of [[0.24, 15], [0.6, 12]]) {
        const { p, n, T } = fishAt(t); const h = halfW(t);
        const a = [p[0] - n[0] * (h - 3), p[1] - n[1] * (h - 3)];
        const b = [a[0] - n[0] * len * 0.55 + T[0] * len, a[1] - n[1] * len * 0.55 + T[1] * len];
        s += leaf(a, b, 5, red, cut);
    }
    // The tail: a two-lobed fan, flicked outward.
    const e = fishAt(1);
    const tw = 0.42; // flick, radians, toward the outside
    const u = [e.T[0] * Math.cos(tw) + e.n[0] * Math.sin(tw), e.T[1] * Math.cos(tw) + e.n[1] * Math.sin(tw)];
    const v = [-u[1], u[0]];
    const P = local([e.p[0] - u[0] * 3, e.p[1] - u[1] * 3], u, v);
    const tail = `M${pt(P([0, 5]))}Q${pt(P([12, 10]))} ${pt(P([32, 25]))}Q${pt(P([22, 9]))} ${pt(P([24, 0]))}Q${pt(P([22, -9]))} ${pt(P([32, -25]))}Q${pt(P([12, -10]))} ${pt(P([0, -5]))}Z`;
    s += `<path d="${tail}" fill="${red}"/>`;
    // Cuts: the tail's rays, the eye, the gill, the scales.
    s += leaf(P([7, 3]), P([27, 18]), 2.4, cut, cut) + leaf(P([7, -3]), P([27, -18]), 2.4, cut, cut);
    const eye = fishAt(0.03);
    s += circle(eye.p[0] + eye.n[0] * 2.5, eye.p[1] + eye.n[1] * 2.5, 3, cut);
    const g = fishAt(0.15);
    const gdir = (Math.atan2(-g.T[1], -g.T[0]) * 180) / Math.PI + 180; // facing the tail
    s += crescent(g.p[0] - g.T[0] * 2, g.p[1] - g.T[1] * 2, halfW(0.15) * 0.85, gdir, 120, cut, 1.6);
    let row = 0;
    for (let t = 0.27; t <= 0.9; t += 0.075, row++) {
        const { p, n, T } = fishAt(t); const h = halfW(t);
        const dir = (Math.atan2(T[1], T[0]) * 180) / Math.PI;
        const offs = row % 2 ? [-0.42, 0.42] : [0];
        for (const o of offs) s += crescent(p[0] + n[0] * h * o - T[0] * 1, p[1] + n[1] * h * o - T[1] * 1, Math.max(2.2, h * 0.36), dir, 150, cut, 1.5);
    }
    // Lines on the dorsal fin.
    for (const t of [0.34, 0.45, 0.56]) {
        const { p, n } = fishAt(t); const h = halfW(t);
        s += leaf([p[0] + n[0] * (h + 1), p[1] + n[1] * (h + 1)], [p[0] + n[0] * (h + 7), p[1] + n[1] * (h + 7)], 1.3, cut, cut);
    }
    return s;
}
/** The gold leaf on the carp: the tail fan and the dorsal fin's crest. */
function carpGold(gold) {
    const e = fishAt(1);
    const tw = 0.42;
    const u = [e.T[0] * Math.cos(tw) + e.n[0] * Math.sin(tw), e.T[1] * Math.cos(tw) + e.n[1] * Math.sin(tw)];
    const v = [-u[1], u[0]];
    const P = local([e.p[0] - u[0] * 3, e.p[1] - u[1] * 3], u, v);
    let s = `<path d="M${pt(P([14, 9]))}Q${pt(P([22, 15]))} ${pt(P([30, 23]))}Q${pt(P([22, 10]))} ${pt(P([22, 3]))}Z" fill="${gold}"/>`;
    s += `<path d="M${pt(P([14, -9]))}Q${pt(P([22, -15]))} ${pt(P([30, -23]))}Q${pt(P([22, -10]))} ${pt(P([22, -3]))}Z" fill="${gold}"/>`;
    const crest = [];
    for (let i = 4; i <= 26; i++) { const t = 0.26 + 0.38 * (i / 30); const { p, n } = fishAt(t); const sw = Math.sin(Math.PI * (i / 30)); const l = halfW(t) - 1 + 9 * Math.pow(sw, 0.6) * (0.82 + 0.18 * Math.cos(i * Math.PI / 5)) - 0.8; crest.push([p[0] + n[0] * l, p[1] + n[1] * l]); }
    for (let i = 26; i >= 4; i--) { const t = 0.26 + 0.38 * (i / 30); const { p, n } = fishAt(t); const sw = Math.sin(Math.PI * (i / 30)); const l = halfW(t) + 2.5 + 4.2 * Math.pow(sw, 0.6); crest.push([p[0] + n[0] * l, p[1] + n[1] * l]); }
    s += poly(crest, gold);
    return s;
}

/* -- the peony at the heart, 28 in radius, nine outer petals; its leaves reach out to the carp. -- */
const PC = [180, 214], PR = 28;
function peony(red, cut) {
    let s = '';
    // Leaves first, under the flower: two each side.
    s += both(leaf(at(...PC, 30, 32), at(...PC, 58, 44), 9, red, cut) + leaf(at(...PC, 30, -8), at(...PC, 56, -22), 8, red, cut) + leaf(at(...PC, 30, 70), at(...PC, 64, 84), 8, red, cut));
    s += scallop(...PC, PR, 9, -70, red);
    for (let i = 0; i < 9; i++) { const a = -90 + i * 40; s += crescent(...at(...PC, PR + 1, a), 6.5, a, 150, cut); }
    for (let i = 0; i < 7; i++) { const a = -90 + i * (360 / 7); s += crescent(...at(...PC, 9, a), 9.5, a, 128, cut, 1.5); }
    for (let i = 0; i < 5; i++) { const a = -54 + i * 72; s += crescent(...at(...PC, 3, a), 5, a, 120, cut, 1.6); }
    return s;
}

/* -- the border: a scalloped edge with a crescent in each scallop, ten plum blossoms cut as holes
   and between them pairs of cloud curls. -- */
function border(red, cut) {
    const n = 30;
    let s = scallop(CX, CY, RB, n, -90, red);
    for (let i = 0; i < n; i++) { const a = -90 + (i + 0.5) * (360 / n); s += crescent(...at(CX, CY, RB + 1.5, a), 6.2, a, 150, cut, 1.4); }
    s += circle(CX, CY, RI, cut);
    for (let i = 0; i < 10; i++) {
        const a = -90 + i * 36;
        s += blossomCut(...at(CX, CY, 97, a), 8.6, a, cut);
        const b = a + 18;
        const [x, y] = at(CX, CY, 96.5, b);
        // A cloud curl: two crescents back to back along the band.
        s += crescent(...at(x, y, 4.2, b + 90), 4.6, b - 90, 200, cut, 1.15) + crescent(...at(x, y, 4.2, b - 90), 4.6, b + 90, 200, cut, 1.15);
    }
    return s;
}

/* -- the field inside the border: the pearl between the heads, waves under the tails, side blossoms and clouds. -- */
function field(red, cut) {
    let s = '';
    // The pearl, touching the border and both snouts, with a swirl cut in it.
    s += circle(180, 141, 10.5, red) + crescent(180, 141, 6.6, 200, 170, cut, 1.3) + crescent(180, 141, 6.6, 20, 170, cut, 1.3) + circle(180, 141, 1.8, red);
    // Waves: a low mound of three swells over the bottom of the border, each with a curl cut.
    s += scallop(180, 300, 13, 7, -90, red, 1.05) + circle(180, 304, 12, red);
    s += both(scallop(206, 296, 9.5, 6, -90, red, 1.05) + circle(206, 300, 9, red) + crescent(206, 296, 5, -60, 170, cut, 1.3));
    s += crescent(180, 299, 6.5, -120, 170, cut, 1.3) + crescent(180, 299, 6.5, -60, 170, cut, 1.3);
    // A small plum blossom over each head, a cloud curl off each tail.
    s += both(blossom(...at(CX, CY, 78, -58), 13, -58, red, cut));
    s += both(scallop(...at(CX, CY, 79, 22), 7, 5, 0, red, 1.1) + crescent(...at(CX, CY, 79, 22), 3.6, 202, 170, cut, 1.3));
    s += both(scallop(...at(CX, CY, 77, 38), 5, 5, 20, red, 1.1));
    return s;
}

/** The whole cut sheet, as it lies open. */
const rosette = (red, cut) => border(red, cut) + field(red, cut) + both(carp(red, cut)) + peony(red, cut) + `<rect x="179.4" y="${CY - RB - 10}" width="1.2" height="${2 * RB + 20}" fill="${C.redLo}" opacity="0.5"/>`;
const SHADOW = `<g transform="translate(2.5 3.5)">${scallop(CX, CY, RB, 30, -90, C.ink)}</g>`;

{
    const art = rosette(C.red, C.mat);
    const half = (name, box, clipX) => svg(name, box, `<defs><clipPath id="h"><rect x="${clipX}" y="90" width="${f(box[2] + 0.4)}" height="260"/></clipPath></defs><g clip-path="url(#h)"><g opacity="0.32">${SHADOW}</g>${art}</g>`);
    half('rosette-r', [180, 98, 124, 244], 179.8);
    half('rosette-l', [56, 98, 124, 244], 56);
}

/* -- the gold leaf laid on parts of it once it lies flat, and the glints that catch on the leaf -- */
{
    let g = both(carpGold(C.gold));
    g += scallop(...PC, 6.5, 5, -54, C.gold, 1.2) + circle(180, 141, 4.2, C.gold);
    for (let i = 0; i < 10; i++) g += circle(...at(CX, CY, 97, -90 + i * 36), 2.4, C.gold);
    g += both(circle(...at(CX, CY, 78, -58), 2.6, C.gold));
    svg('gold', [56, 98, 248, 244], g);
    // Glints: small lozenges, long and thin, on the gold.
    const glint = (x, y, s) => poly([[x, y - s], [x + s * 0.28, y], [x, y + s], [x - s * 0.28, y]], C.goldHi) + poly([[x - s * 0.7, y], [x, y + s * 0.2], [x + s * 0.7, y], [x, y - s * 0.2]], C.goldHi);
    const crest = fishAt(0.45), ch = halfW(0.45) + 4;
    const cx = crest.p[0] + crest.n[0] * ch, cy = crest.p[1] + crest.n[1] * ch;
    svg('glint', [56, 98, 248, 244], glint(...PC, 7) + glint(180, 141, 5) + glint(cx, cy, 5) + glint(360 - cx, cy, 4) + glint(...at(CX, CY, 97, -18), 4.5) + glint(...at(CX, CY, 97, 162), 4.5) + glint(...at(CX, CY, 78, -122), 4));
}

/* -- the crease standing up as the sheet opens: a thin tent of paper, lit side and shade side -- */
svg('ridge', [174, 102, 12, 236], `<path d="M174 114L180 102L186 114L186 326L180 338L174 326Z" fill="${C.red}"/><path d="M180 102L186 114L186 326L180 338Z" fill="${C.redLo}"/>`);

/* -- the sheet folded in half, lying to the right of its crease: the first notches cut along its open edges -- */
{
    const X0 = 180, X1 = 298, Y0 = 102, Y1 = 338;
    // Walk the outline clockwise; each notch is a bite into the paper.
    const pts = [[X0, Y0]];
    const vBite = (x, y, w, d, dir) => { // dir: inward unit vector, edge runs perpendicular
        const ex = [-dir[1], dir[0]];
        return [[x - ex[0] * w, y - ex[1] * w], [x + dir[0] * d, y + dir[1] * d], [x + ex[0] * w, y + ex[1] * w]];
    };
    const roundBite = (x, y, r, dir, steps = 8) => {
        const ex = [-dir[1], dir[0]];
        const out = [];
        for (let k = 0; k <= steps; k++) { const a = Math.PI * (k / steps); out.push([x - ex[0] * r * Math.cos(a) + dir[0] * r * Math.sin(a), y - ex[1] * r * Math.cos(a) + dir[1] * r * Math.sin(a)]); }
        return out;
    };
    // Top edge, left to right (inward = down); the edge runs +x, so `ex` must point back along it.
    pts.push(...roundBite(206, Y0, 7, [0, 1]).reverse(), ...vBite(232, Y0, 5, 10, [0, 1]).reverse(), ...roundBite(258, Y0, 6, [0, 1]).reverse());
    pts.push([X1 - 14, Y0], [X1, Y0 + 14]); // a corner snipped off
    // Right edge, top to bottom (inward = left).
    pts.push(...vBite(X1, 150, 5, 9, [-1, 0]).reverse(), ...roundBite(X1, 190, 8, [-1, 0]).reverse(), ...vBite(X1, 236, 5, 11, [-1, 0]).reverse(), ...roundBite(X1, 282, 6, [-1, 0]).reverse());
    pts.push([X1, Y1]);
    // Bottom edge, right to left (inward = up).
    pts.push(...roundBite(262, Y1, 7, [0, -1]).reverse(), ...vBite(226, Y1, 6, 12, [0, -1]).reverse(), ...roundBite(200, Y1, 5, [0, -1]).reverse());
    pts.push([X0, Y1]);
    // The fold edge, bottom to top: half blossoms and a half cloud cut through the crease.
    pts.push(...roundBite(X0, 296, 9, [1, 0]).reverse(), ...roundBite(X0, 220, 12, [1, 0]).reverse(), ...vBite(X0, 170, 6, 12, [1, 0]).reverse(), ...roundBite(X0, 132, 7, [1, 0]).reverse());
    let s = `<g transform="translate(2.5 3.5)">${poly(pts, C.ink, ' opacity="0.32"')}</g>` + poly(pts, C.red);
    // The fold's edge in shade, and a pale chalk ring where the first cut will run.
    s += `<rect x="180" y="102" width="3" height="236" fill="${C.redLo}"/>`;
    s += `<path d="M180 128A92 92 0 0 1 180 312" fill="none" stroke="${C.redLo}" stroke-width="1.4" stroke-dasharray="5 5"/>`;
    s += `<path d="M180 168A52 52 0 0 1 180 272" fill="none" stroke="${C.redLo}" stroke-width="1.2" stroke-dasharray="4 5"/>`;
    svg('folded', [180, 98, 124, 244], s);
}

/* -- the scissors: steel blades, black loop handles, a brass rivet. Drawn where they lie at first,
   across the left of the mat, pointing at the sheet. Pivot (118, 300). -- */
const SP = [118, 300], SA = -50;
{
    const k = 1.35;
    const u = [k * Math.cos(rad(SA)), k * Math.sin(rad(SA))], v = [-u[1], u[0]];
    const P = local(SP, u, v);
    let s = '';
    // Shadow, then the lower blade and its handle, then the upper ones.
    const blade = sgn => `M${pt(P([-4, sgn * 3]))}L${pt(P([16, sgn * 5.5]))}Q${pt(P([52, sgn * 6]))} ${pt(P([74, sgn * 1.5]))}L${pt(P([72, sgn * -1.2]))}Q${pt(P([40, sgn * -0.2]))} ${pt(P([6, sgn * -2.5]))}Z`;
    const shank = sgn => `M${pt(P([0, sgn * -3]))}L${pt(P([-26, sgn * 7]))}L${pt(P([-28, sgn * 13]))}L${pt(P([-2, sgn * 3]))}Z`;
    const loop = (sgn, rx, ry) => { const [x, y] = P([-38, sgn * 15]); return `<ellipse cx="0" cy="0" rx="${f(rx * k)}" ry="${f(ry * k)}" fill="none" stroke="${C.ink}" stroke-width="6.5" transform="translate(${f(x)} ${f(y)}) rotate(${f(SA + sgn * 18)})"/>`; };
    const all = `<path d="${blade(1)}"/><path d="${blade(-1)}"/><path d="${shank(1)}"/><path d="${shank(-1)}"/>`;
    s += `<g transform="translate(2 3)" fill="${C.ink}" opacity="0.3">${all}</g>`;
    {
        const [x, y] = P([-38, 15]); s += `<g transform="translate(2 3)"><ellipse cx="0" cy="0" rx="${f(13 * k)}" ry="${f(9 * k)}" fill="none" stroke="${C.ink}" stroke-opacity="0.3" stroke-width="6.5" transform="translate(${f(x)} ${f(y)}) rotate(${f(SA + 18)})"/></g>`;
        const [x2, y2] = P([-38, -15]); s += `<g transform="translate(2 3)"><ellipse cx="0" cy="0" rx="${f(15 * k)}" ry="${f(10 * k)}" fill="none" stroke="${C.ink}" stroke-opacity="0.3" stroke-width="6.5" transform="translate(${f(x2)} ${f(y2)}) rotate(${f(SA - 18)})"/></g>`;
    }
    s += `<path d="${blade(1)}" fill="${C.steel}"/><path d="${shank(1)}" fill="${C.ink}"/>` + loop(1, 13, 9);
    s += `<path d="${blade(-1)}" fill="${C.steel}"/><path d="${blade(-1)}" fill="none" stroke="${C.ink}" stroke-width="0.8" stroke-opacity="0.5"/><path d="${shank(-1)}" fill="${C.ink}"/>` + loop(-1, 15, 10);
    s += circle(...SP, 4.4, C.gold) + circle(...SP, 1.6, C.ink);
    svg('scissors', [36, 210, 156, 176], s);
}

/* -- gold leaf: a square sheet lying on a red stack at the top right, its crinkles catching the light -- */
{
    const c = [306, 44];
    const P = local(c, [Math.cos(rad(14)), Math.sin(rad(14))], [-Math.sin(rad(14)), Math.cos(rad(14))]);
    let s = `<g transform="translate(2 3)">${poly([P([-28, -28]), P([28, -28]), P([28, 28]), P([-28, 28])], C.ink, ' opacity="0.22"')}</g>`;
    s += poly([P([-28, -28]), P([28, -28]), P([28, 26]), P([24, 29]), P([-28, 28])], C.gold);
    s += poly([P([-28, -28]), P([6, -28]), P([-10, -6]), P([-28, -12])], C.goldHi);
    s += poly([P([10, -6]), P([28, -14]), P([28, 8]), P([16, 12])], C.goldHi);
    s += poly([P([-18, 10]), P([-4, 4]), P([4, 28]), P([-18, 28])], C.goldHi);
    svg('leaf', [270, 8, 72, 72], s);
}

/* -- the table: cream, the indigo mat with a gold line and a band of cloud curls, the paste pot and brush,
   a stack of red paper, curls and snips of red offcuts. -- */
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.cream}"/>`;
    // A second sheet of cream card under everything, a little askew: the table is not empty.
    s += poly([[-6, 380], [120, 366], [150, 456], [-6, 456]], C.creamLo);
    s += poly([[250, -6], [366, -6], [366, 70], [262, 62]], C.creamLo);
    // The mat.
    const M = [22, 70, 316, 322];
    s += `<g transform="translate(2 3)"><rect x="${M[0]}" y="${M[1]}" width="${M[2]}" height="${M[3]}" rx="8" fill="${C.ink}" opacity="0.18"/></g>`;
    s += `<rect x="${M[0]}" y="${M[1]}" width="${M[2]}" height="${M[3]}" rx="8" fill="${C.mat}"/>`;
    s += `<rect x="${M[0] + 7}" y="${M[1] + 7}" width="${M[2] - 14}" height="${M[3] - 14}" rx="4" fill="none" stroke="${C.gold}" stroke-width="1.2" opacity="0.8"/>`;
    // A band of cloud curls inside the gold line: one curl in each corner, a running wave along the sides.
    const wave = (x0, y0, x1, y1) => {
        const L = Math.hypot(x1 - x0, y1 - y0), n = Math.round(L / 16), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
        let d = `M${f(x0)} ${f(y0)}`;
        for (let i = 0; i < n; i++) { const a = i * (L / n), b = (i + 1) * (L / n); d += `A${f(L / n / 2)} ${f(L / n / 2)} 0 0 ${i % 2} ${f(x0 + ux * b)} ${f(y0 + uy * b)}`; void a; }
        return `<path d="${d}" fill="none" stroke="${C.matLo}" stroke-width="2.2"/>`;
    };
    s += wave(52, 84, 308, 84) + wave(52, 378, 308, 378) + wave(36, 108, 36, 354) + wave(324, 108, 324, 354);
    for (const [x, y, r] of [[38, 86, 0], [322, 86, 90], [322, 376, 180], [38, 376, 270]]) s += `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 6A6 6 0 1 1 6 0A3.4 3.4 0 1 0 2.6 3.4" fill="none" stroke="${C.matLo}" stroke-width="2.2"/></g>`;
    // The stack of red paper, top right, under the gold leaf: four sheets fanned a little.
    const sheet = (cx, cy, rot, fill) => { const P = local([cx, cy], [Math.cos(rad(rot)), Math.sin(rad(rot))], [-Math.sin(rad(rot)), Math.cos(rad(rot))]); return poly([P([-48, -40]), P([48, -40]), P([48, 40]), P([-48, 40])], fill); };
    s += sheet(318, 30, -8, C.redLo) + sheet(314, 32, 4, C.red) + sheet(316, 34, -2, C.redLo) + sheet(312, 36, 9, C.red);
    // The paste pot, top left, seen from above: a glazed bowl of paste; the brush rests across it.
    s += `<g transform="translate(2 3)">${circle(48, 34, 30, C.ink, ' opacity="0.2"')}</g>` + circle(48, 34, 30, C.mat) + circle(48, 34, 26, C.creamLo) + crescent(48, 34, 26, 135, 120, C.matLo, 1.4) + `<path d="M34 30Q44 20 58 26Q50 32 40 36Z" fill="${C.cream}"/>`;
    {
        const a = [26, 70], b = [186, 14];
        const u = [(b[0] - a[0]), (b[1] - a[1])]; const L = Math.hypot(...u); const uu = [u[0] / L, u[1] / L], vv = [-uu[1], uu[0]];
        const P = local(a, uu, vv);
        s += `<g transform="translate(2 3)" opacity="0.22">${poly([P([20, -3.2]), P([L, -2.4]), P([L, 2.4]), P([20, 3.2])], C.ink)}</g>`;
        s += poly([P([40, -3]), P([L, -2.3]), P([L + 2, 0]), P([L, 2.3]), P([40, 3])], C.redLo);
        s += poly([P([34, -3.6]), P([44, -3.6]), P([44, 3.6]), P([34, 3.6])], C.gold);
        s += `<path d="M${pt(P([34, -3.4]))}Q${pt(P([18, -6]))} ${pt(P([2, 0]))}Q${pt(P([18, 6]))} ${pt(P([34, 3.4]))}Z" fill="${C.ink}"/>`;
    }
    // Offcuts: curls of red paper and snipped corners, on the table and the mat's edges.
    // A curl: a paper ribbon wound one and three-quarter turns, tighter toward its middle.
    const curl = (cx, cy, r, rot, w, fill) => { const q = []; for (let i = 0; i <= 42; i++) { const a = rad(rot) + (i / 42) * Math.PI * 3.5; const rr = r * (1 - 0.72 * (i / 42)); q.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return `<path d="M${q.map(pt).join('L')}" fill="none" stroke="${fill}" stroke-width="${f(w * 0.6)}" stroke-linecap="round" stroke-linejoin="round"/>`; };
    const strip = (pts, w, fill) => `<path d="M${pt(pts[0])}Q${pt(pts[1])} ${pt(pts[2])}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round"/>`;
    s += curl(196, 418, 10 * 1.35, 30, 4, C.red) + curl(318, 424, 8 * 1.35, 200, 3.5, C.redLo) + curl(262, 438, 6 * 1.35, 120, 3, C.red) + curl(10, 196, 7 * 1.35, 300, 3, C.red);
    s += strip([[212, 404], [246, 396], [268, 416]], 4, C.red) + strip([[290, 402], [310, 440], [350, 430]], 3.5, C.red) + strip([[150, 434], [170, 452], [196, 442]], 3, C.redLo);
    s += poly([[226, 432], [242, 426], [236, 446]], C.red) + poly([[340, 404], [356, 398], [352, 414]], C.redLo) + poly([[168, 410], [178, 404], [178, 418]], C.red);
    s += poly([[4, 252], [16, 246], [14, 262]], C.red) + poly([[344, 214], [356, 208], [354, 226]], C.red) + curl(348, 280, 6 * 1.35, 60, 3, C.redLo);
    s += curl(50, 112, 8 * 1.35, 140, 3.5, C.red) + poly([[52, 168], [66, 160], [72, 174], [60, 180]], C.red) + poly([[62, 120], [74, 116], [70, 130]], C.red) + curl(300, 362, 7 * 1.35, 250, 3, C.red);
    // A few flakes of gold leaf.
    s += poly([[284, 410], [292, 406], [290, 414]], C.gold) + poly([[132, 54], [140, 50], [138, 58]], C.gold) + poly([[8, 330], [15, 327], [13, 335]], C.gold);
    svg('table', [-6, -6, 372, 462], s);
}

/* -- one tiny bit of red paper, scattered as the sheet unfolds -- */
svg('bit', [176, 216, 8, 8], poly([[177, 217], [184, 219], [179, 224]], C.red));
