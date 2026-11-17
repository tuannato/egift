// Generator for the "airmail" wrapper art: a string-tied brown-paper parcel that has travelled, seen
// from straight above on a cream desk mat printed with dotted flight arcs. Flat shapes, two or three
// tones a surface, no outline, no gradient, no filter. Every colour is in the palette `C`.
// The parcel is drawn upright; the definition tilts every parcel layer by the same small angle
// about the parcel's centre. Only the parcel's shadow, which lies in the mat, is tilted here.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/airmail.gen.mjs   (prints the layer boxes the definition copies)
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'airmail');
if (!OUT.endsWith('wrappers/airmail')) throw new Error('out dir must be public/wrappers/airmail');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: the mat, white paper, kraft in three tones (outside, shade, inside), airmail red and blue,
   ink blue, night (the frame's room), tissue in two tones, one mustard. */
const C = {
    mat: '#E9DAB8',
    paper: '#FAF4E4',
    kraft: '#B77F4A',
    kraftLo: '#8F5E33',
    kraftHi: '#D9B080',
    red: '#C9382C',
    blue: '#2F56A0',
    ink: '#18284E',
    tissue: '#BCD8CF',
    tissueLo: '#93BFB3',
    mustard: '#E3B04B',
};

/** The tilt of the parcel (degrees, clockwise) and its centre: the same numbers as in the definition. */
const TILT = -4, CX = 180, CY = 225;
/** The parcel's footprint. */
const PX = 62, PY = 77, PW = 236, PH = 296;
const PR = PX + PW, PB = PY + PH;

const f = n => String(Math.round(n * 100) / 100);
const boxes = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    boxes[name] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const line = (pts, stroke, w, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const turned = (deg, cx, cy, inner) => `<g transform="rotate(${f(deg)} ${f(cx)} ${f(cy)})">${inner}</g>`;
/** A seeded stream of numbers 0..1, so that every run draws the same picture. */
function stream(seed) {
    let a = seed >>> 0;
    return () => {
        a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
        return a / 4294967296;
    };
}
/** A closed smooth outline through the points (Catmull-Rom, written as cubics). */
function blob(pts, fill, extra = '') {
    const n = pts.length;
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return `<path d="${d}Z" fill="${fill}"${extra}/>`;
}
/**
 * An airmail edge: slanted bars, red and blue by turns, on white, along the named sides of a rectangle.
 * `t` is the band's width. The bars are long slanted strips over the whole rectangle, clipped to the band.
 */
function airmail(id, x, y, w, h, t, sides = 'trbl', bar = 8, gap = 6) {
    const bands = [];
    if (sides.includes('t')) bands.push([x, y, w, t]);
    if (sides.includes('b')) bands.push([x, y + h - t, w, t]);
    if (sides.includes('l')) bands.push([x, y, t, h]);
    if (sides.includes('r')) bands.push([x + w - t, y, t, h]);
    let s = `<clipPath id="${id}">${bands.map(b => `<rect x="${f(b[0])}" y="${f(b[1])}" width="${f(b[2])}" height="${f(b[3])}"/>`).join('')}</clipPath>`;
    s += bands.map(b => rect(b[0], b[1], b[2], b[3], C.paper)).join('');
    let bars = '';
    for (let k = 0, at = gap / 2; at < w + h; k++, at += bar + gap) {
        bars += poly([[x + at, y], [x + at + bar, y], [x + at + bar - h, y + h], [x + at - h, y + h]], k % 2 ? C.blue : C.red);
    }
    return s + `<g clip-path="url(#${id})">${bars}</g>`;
}
/** A wavy line of `n` waves from (x, y) to the right. */
const wavy = (x, y, n, len, amp, stroke, w, extra = '') => `<path d="M${f(x)} ${f(y)}q${f(len / 4)} ${f(-amp)} ${f(len / 2)} 0${`t${f(len / 2)} 0`.repeat(2 * n - 1)}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"${extra}/>`;
/** A cancellation: two rings and a few wavy lines running off to one side. Rings and waves only. */
function postmark(cx, cy, r, dir, lines = 4, waves = 4) {
    let s = circle(cx, cy, r, 'none', ` stroke="${C.ink}" stroke-width="1.7"`) + circle(cx, cy, r * 0.62, 'none', ` stroke="${C.ink}" stroke-width="1.2"`);
    s += circle(cx, cy, r * 0.2, C.ink);
    const len = 13;
    for (let i = 0; i < lines; i++) {
        const y = cy + (i - (lines - 1) / 2) * 6.4;
        const x0 = dir > 0 ? cx + r + 4 : cx - r - 4 - waves * len;
        s += wavy(x0, y, waves, len, 3.4, C.ink, 1.5);
    }
    return `<g opacity="0.82">${s}</g>`;
}
/** A blank stamp: white paper with a perforated edge (a dotted white stroke) and a flat block of colour with one plain shape. */
function stamp(x, y, w, h, fill, kind, deg) {
    const edge = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="${C.paper}" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="0 4.4"/>`;
    let s = edge + rect(x, y, w, h, C.paper) + rect(x + 3.5, y + 3.5, w - 7, h - 7, fill);
    const ix = x + 3.5, iy = y + 3.5, iw = w - 7, ih = h - 7;
    if (kind === 'sun') s += circle(ix + iw * 0.7, iy + ih * 0.26, iw * 0.17, C.paper) + poly([[ix, iy + ih], [ix, iy + ih * 0.7], [ix + iw * 0.3, iy + ih * 0.52], [ix + iw * 0.58, iy + ih * 0.76], [ix + iw * 0.78, iy + ih * 0.64], [ix + iw, iy + ih * 0.8], [ix + iw, iy + ih]], C.paper, ' opacity="0.4"');
    if (kind === 'hill') s += poly([[ix, iy + ih], [ix, iy + ih * 0.62], [ix + iw * 0.36, iy + ih * 0.34], [ix + iw * 0.62, iy + ih * 0.58], [ix + iw * 0.8, iy + ih * 0.44], [ix + iw, iy + ih * 0.6], [ix + iw, iy + ih]], C.paper, ' opacity="0.85"');
    if (kind === 'band') s += rect(ix, iy + ih * 0.36, iw, ih * 0.28, C.paper, ' opacity="0.8"');
    return turned(deg, x + w / 2, y + h / 2, s);
}
/** A quadratic arc as a row of round dots. */
const arc = (a, c, b, extra = '') => `<path d="M${f(a[0])} ${f(a[1])}Q${f(c[0])} ${f(c[1])} ${f(b[0])} ${f(b[1])}" fill="none" stroke="${C.ink}" stroke-width="2.3" stroke-linecap="round" stroke-dasharray="0 7.5"${extra}/>`;

/* ---- mat: a cream desk mat printed like a map of flights: pale land, a few meridians, dotted arcs between
   ringed points; two airmail envelopes lie under the parcel's corners; the parcel's flat shadow. ---- */
{
    let s = rect(-6, -6, 372, 462, C.mat);
    // Land: large pale masses, cut by the canvas edge.
    s += blob([[-10, 118], [22, 96], [50, 112], [58, 150], [40, 176], [52, 214], [30, 246], [-10, 240]], C.paper, ' opacity="0.6"');
    s += blob([[196, -10], [214, 22], [252, 36], [300, 26], [318, 44], [350, 34], [372, -10]], C.paper, ' opacity="0.6"');
    s += blob([[372, 232], [340, 246], [322, 290], [334, 330], [314, 356], [330, 380], [372, 372]], C.paper, ' opacity="0.6"');
    s += blob([[40, 460], [56, 420], [96, 398], [150, 404], [196, 426], [214, 460]], C.paper, ' opacity="0.6"');
    s += blob([[16, 318], [34, 306], [46, 326], [32, 346], [14, 338]], C.paper, ' opacity="0.6"');
    // Meridians and parallels: a few thin curves.
    const grid = d => `<path d="${d}" fill="none" stroke="${C.kraftHi}" stroke-width="1" opacity="0.55"/>`;
    s += grid('M-6 58Q180 22 366 62') + grid('M-6 200Q180 176 366 204') + grid('M-6 398Q180 428 366 392');
    s += grid('M34 -6Q10 225 40 456') + grid('M326 -6Q352 225 322 456') + grid('M120 -6Q110 60 118 90') + grid('M246 366Q252 410 244 456');
    // Flight arcs.
    const N = { a: [24, 100], b: [118, 34], c: [302, 44], d: [338, 184], e: [328, 388], f: [150, 424], g: [36, 330], h: [250, 418], i: [28, 414] };
    const dim = ' opacity="0.5"';
    s += arc(N.a, [52, 34], N.b, dim) + arc(N.b, [210, -8], N.c, dim) + arc(N.c, [362, 104], N.d, dim) + arc(N.d, [368, 290], N.e, dim);
    s += arc(N.g, [56, 408], N.f, dim) + arc(N.f, [200, 452], N.h, dim) + arc(N.a, [-8, 214], N.g, dim) + arc(N.h, [300, 436], N.e, dim);
    s += arc(N.f, [84, 452], N.i, dim) + arc(N.g, [110, 120], N.c, dim) + arc(N.a, [230, 190], N.e, dim) + arc(N.b, [20, 190], N.g, dim);
    for (const p of Object.values(N)) s += circle(p[0], p[1], 5.2, C.mat) + circle(p[0], p[1], 5.2, 'none', ` stroke="${C.ink}" stroke-width="1.5" opacity="0.7"`) + circle(p[0], p[1], 2, C.ink, ' opacity="0.7"');
    // Two envelopes with airmail edges, under the parcel's corners.
    const envelope = (id, cx, cy, w, h, deg) =>
        turned(deg, cx, cy,
            rect(cx - w / 2 + 3, cy - h / 2 + 4, w, h, C.ink, ' opacity="0.16"') + rect(cx - w / 2, cy - h / 2, w, h, C.paper) + airmail(id, cx - w / 2, cy - h / 2, w, h, 7) +
            line([[cx - w / 2 + 7, cy - h / 2 + 7], [cx, cy + 4], [cx + w / 2 - 7, cy - h / 2 + 7]], C.kraftHi, 1.4, ' opacity="0.9"'));
    s += envelope('ea', 40, 30, 132, 88, -13) + envelope('eb', 330, 420, 132, 88, 172);
    // The parcel's shadow: flat, a little down and to the right.
    s += turned(TILT, CX, CY, rect(PX + 5, PY + 8, PW + 3, PH + 3, C.ink, ' rx="3" opacity="0.24"'));
    svg('mat', [-6, -6, 372, 462], s);
}

/* ---- the map: three panels, 56 wide. The middle one lies in the parcel; the outer two fold out from it. ---- */
const K = 8 / 7, MW = 64, MH = 136;
/** The map is drawn at 7/8 of its size and scaled up about the parcel's centre: these are its drawn corner and sizes. */
const DW = 56, DH = 119, MX = CX - DW * 1.5, MY = CY - DH / 2;
const up = ([x, y]) => [CX + (x - CX) * K, CY + (y - CY) * K];
/** The whole map, drawn once; each panel shows its third of it. */
function mapArt(id) {
    let s = rect(MX, MY, DW * 3, DH, C.paper);
    // Land in sand, a lake in tissue.
    s += blob([[MX - 6, MY + 30], [MX + 20, MY + 22], [MX + 44, MY + 34], [MX + 52, MY + 58], [MX + 36, MY + 78], [MX + 40, MY + 100], [MX + 14, MY + 112], [MX - 6, MY + 104]], C.kraftHi, ' opacity="0.6"');
    s += blob([[MX + 84, MY + 6], [MX + 112, MY + 14], [MX + 140, MY + 8], [MX + 176, MY + 26], [MX + 172, MY + 58], [MX + 150, MY + 76], [MX + 122, MY + 66], [MX + 104, MY + 44], [MX + 80, MY + 36]], C.kraftHi, ' opacity="0.6"');
    s += blob([[MX + 74, MY + 92], [MX + 98, MY + 84], [MX + 122, MY + 96], [MX + 118, MY + 122], [MX + 78, MY + 122]], C.kraftHi, ' opacity="0.6"');
    s += blob([[MX + 96, MY + 24], [MX + 110, MY + 20], [MX + 116, MY + 30], [MX + 104, MY + 36]], C.tissue);
    // A graticule.
    for (let i = 1; i < 6; i++) s += rect(MX + i * 28 - 0.4, MY, 0.8, DH, C.ink, ' opacity="0.13"');
    for (let i = 1; i < 4; i++) s += rect(MX, MY + i * 29 - 0.4, DW * 3, 0.8, C.ink, ' opacity="0.13"');
    // An airmail edge along the top and the bottom.
    s += airmail(id, MX, MY, DW * 3, DH, 6, 'tb', 6, 5);
    // The folds: the outer panels a shade darker, and a crease at each fold.
    s += rect(MX, MY, DW, DH, C.ink, ' opacity="0.07"') + rect(MX + 2 * DW, MY, DW, DH, C.ink, ' opacity="0.04"');
    s += rect(MX + DW - 0.6, MY, 1.2, DH, C.ink, ' opacity="0.22"') + rect(MX + 2 * DW - 0.6, MY, 1.2, DH, C.ink, ' opacity="0.22"');
    return `<g transform="translate(${f(CX * (1 - K))} ${f(CY * (1 - K))}) scale(${f(K)})">${s}</g>`;
}

/* ---- base: what the paper held. Tissue in two sheets, crumpled into flat facets, and the folded map. ---- */
{
    const rnd = stream(11);
    let s = rect(PX, PY, PW, PH, C.kraftLo) + rect(PX + 3, PY + 3, PW - 6, PH - 6, C.kraft);
    // The under sheet, a little askew, then the top sheet with a torn (many-cornered) edge.
    s += turned(3, CX, CY, rect(PX + 12, PY + 10, PW - 24, PH - 20, C.tissueLo));
    const edge = [];
    const ring = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) edge.push([x0 + ((x1 - x0) * i) / n + (rnd() - 0.5) * 5, y0 + ((y1 - y0) * i) / n + (rnd() - 0.5) * 5]); };
    const a = PX + 9, b = PY + 9, c = PR - 9, d = PB - 9;
    ring(a, b, c, b, 9); ring(c, b, c, d, 11); ring(c, d, a, d, 9); ring(a, d, a, b, 11);
    s += poly(edge, C.tissue);
    // Crumples: flat facets running from around the map out to the edge, in the darker tone and in white.
    const spokes = 15;
    const at = (k, r) => {
        const t = ((k + (rnd() - 0.5) * 0.5) / spokes) * Math.PI * 2;
        return [CX + Math.cos(t) * r * 0.92, CY + Math.sin(t) * r * 1.16];
    };
    for (let k = 0; k < spokes; k++) {
        const kind = k % 3;
        if (kind === 2) continue;
        const p = [at(k, 92), at(k + 0.35, 128), at(k + 1.1, 96 + rnd() * 22)];
        const clip = p.map(([x, y]) => [Math.min(c - 3, Math.max(a + 3, x)), Math.min(d - 3, Math.max(b + 3, y))]);
        s += poly(clip, kind === 0 ? C.tissueLo : C.paper, ` opacity="${kind === 0 ? 0.42 : 0.4}"`);
    }
    // The folded map: its flat shadow, then the middle panel.
    s += rect(CX - MW / 2 + 4, CY - MH / 2, MW, MH, C.ink, ' opacity="0.2"');
    s += `<clipPath id="mc"><rect x="${f(CX - MW / 2)}" y="${f(CY - MH / 2)}" width="${MW}" height="${MH}"/></clipPath><g clip-path="url(#mc)">${mapArt('mb')}</g>`;
    svg('base', [PX, PY, PW, PH], s);
}
svg('panel-l', [CX - MW * 1.5, CY - MH / 2, MW, MH], mapArt('ml'));
svg('panel-r', [CX + MW / 2, CY - MH / 2, MW, MH], mapArt('mr'));

/* ---- the route: an arc of dots from the map's left edge to home, in three groups, and home itself. ---- */
{
    const A = up([MX + 8, MY + 94]), Q = up([MX + 62, MY - 4]), B = up([MX + 138, MY + 48]);
    const q = t => [(1 - t) ** 2 * A[0] + 2 * t * (1 - t) * Q[0] + t * t * B[0], (1 - t) ** 2 * A[1] + 2 * t * (1 - t) * Q[1] + t * t * B[1]];
    const dots = Array.from({ length: 12 }, (_, i) => q(0.02 + (i * 0.86) / 11));
    for (let g = 0; g < 3; g++) {
        const mine = dots.slice(g * 4, g * 4 + 4);
        const x0 = Math.floor(Math.min(...mine.map(p => p[0])) - 4), y0 = Math.floor(Math.min(...mine.map(p => p[1])) - 4);
        const x1 = Math.ceil(Math.max(...mine.map(p => p[0])) + 4), y1 = Math.ceil(Math.max(...mine.map(p => p[1])) + 4);
        svg(`route-${g + 1}`, [x0, y0, x1 - x0, y1 - y0], mine.map(p => circle(p[0], p[1], 2.8, C.red)).join(''));
    }
    // Home: a filled circle in a ring.
    const hx = Math.round(B[0]), hy = Math.round(B[1]);
    svg('home', [hx - 17, hy - 17, 34, 34], circle(hx, hy, 14.5, C.paper, ' opacity="0.85"') + circle(hx, hy, 13.2, 'none', ` stroke="${C.red}" stroke-width="2"`) + circle(hx, hy, 7.2, C.red));
}

/* ---- the paper, outside: four flaps. Left and right meet down the middle, under a strip of tape; top and
   bottom lie over them and meet across the middle, under the string. ---- */
const crease = (pts, o = 0.5) => line(pts, C.kraftLo, 1.2, ` opacity="${o}"`);
const scuff = pts => poly(pts, C.kraftHi, ' opacity="0.75"');
{
    for (const [name, x] of [['flap-l', PX], ['flap-r', CX]]) {
        let s = rect(PX, PY, PW, PH, C.kraft);
        s += rect(CX - 1, PY, 2, PH, C.kraftLo, ' opacity="0.8"');
        // Paper tape over the seam, twice.
        for (const y of [PY + 62, PY + 206]) s += rect(CX - 34, y, 68, 20, C.paper, ' opacity="0.62"') + rect(CX - 34, y + 16, 68, 4, C.kraftLo, ' opacity="0.25"');
        s += crease([[PX + 14, PY + 120], [PX + 60, PY + 132], [PX + 96, PY + 126]]) + crease([[PR - 20, PY + 180], [PR - 70, PY + 170]]) + crease([[PX + 30, PB - 40], [PX + 84, PB - 52]], 0.4) + crease([[PR - 90, PY + 40], [PR - 30, PY + 52]], 0.4);
        s += postmark(PX + 78, PY + 150, 17, -1, 3, 3) + postmark(PX + 44, PY + 246, 11, 0, 0);
        s += turned(6, PR - 52, PY + 122, rect(PR - 80, PY + 108, 56, 28, C.mustard) + circle(PR - 66, PY + 122, 5, C.paper));
        s += turned(-5, PR - 60, PB - 62, poly([[PR - 92, PB - 71], [PR - 26, PB - 71], [PR - 32, PB - 53], [PR - 98, PB - 53]], C.red));
        svg(name, [x, PY, PW / 2, PH], s);
    }
}
{
    // Top flap: the airmail edge along the top and down both sides, stamps and their cancellation top right.
    let s = rect(PX, PY, PW, PH / 2, C.kraft);
    s += crease([[PX + 24, PY + 108], [PX + 74, PY + 96], [PX + 108, PY + 104]]) + crease([[PX + 30, PY + 46], [PX + 66, PY + 40]], 0.4) + crease([[PR - 96, PY + 120], [PR - 40, PY + 128]], 0.4);
    s += airmail('ft', PX, PY, PW, PH, 10, 'tlr');
    s += rect(PX, PY + PH / 2 - 2.5, PW, 2.5, C.kraftLo, ' opacity="0.7"');
    // Scuffs at the top left corner: the paper's lighter under-tone showing, and a scratch.
    s += scuff([[PX + 10, PY + 10], [PX + 30, PY + 10], [PX + 22, PY + 15], [PX + 15, PY + 26], [PX + 10, PY + 30]]) + scuff([[PX + 34, PY + 16], [PX + 44, PY + 14], [PX + 40, PY + 20]]);
    s += crease([[PX + 18, PY + 40], [PX + 40, PY + 26], [PX + 52, PY + 28]], 0.6);
    // Stamps.
    s += stamp(PR - 62, PY + 18, 40, 48, C.blue, 'sun', 3) + stamp(PR - 104, PY + 22, 34, 40, C.red, 'hill', -4) + stamp(PR - 52, PY + 76, 30, 26, C.mustard, 'band', -2);
    s += postmark(PR - 100, PY + 64, 19, -1, 4, 3) + postmark(PR - 30, PY + 102, 12, -1, 0);
    svg('flap-t', [PX, PY, PW, PH / 2], s);
}
{
    // Bottom flap: the airmail edge along the bottom and up both sides, a customs label bottom left, a blank blue sticker.
    let s = rect(PX, CY, PW, PH / 2, C.kraft);
    s += crease([[PR - 30, CY + 44], [PR - 84, CY + 56], [PR - 110, CY + 50]]) + crease([[PX + 120, CY + 112], [PX + 170, CY + 104]], 0.4) + crease([[PX + 22, CY + 30], [PX + 60, CY + 38]], 0.4);
    s += airmail('fb', PX, PY, PW, PH, 10, 'blr');
    s += scuff([[PR - 10, PB - 10], [PR - 34, PB - 10], [PR - 24, PB - 16], [PR - 16, PB - 28], [PR - 10, PB - 34]]) + scuff([[PR - 38, PB - 18], [PR - 48, PB - 14], [PR - 44, PB - 22]]);
    s += crease([[PR - 20, PB - 46], [PR - 42, PB - 30], [PR - 58, PB - 30]], 0.6);
    // The customs label: a white slip with a blue head, one solid mustard block, one box filled red. No lines.
    const lx = PX + 24, ly = CY + 62, lw = 96, lh = 62;
    let label = rect(lx + 2, ly + 3, lw, lh, C.kraftLo, ' opacity="0.45"') + rect(lx, ly, lw, lh, C.paper);
    label += rect(lx, ly, lw, 12, C.blue) + rect(lx + lw - 28, ly + 20, 18, 18, 'none', ` stroke="${C.ink}" stroke-width="1.6"`) + rect(lx + lw - 24, ly + 24, 10, 10, C.red);
    label += rect(lx + 8, ly + 20, 50, 34, C.mustard);
    s += turned(-3, lx + lw / 2, ly + lh / 2, label);
    // A blank blue sticker, slanted, and a second faint cancellation.
    s += turned(-7, PR - 64, CY + 32, poly([[PR - 96, CY + 23], [PR - 28, CY + 23], [PR - 34, CY + 41], [PR - 102, CY + 41]], C.blue) + circle(PR - 84, CY + 32, 4, C.paper));
    s += postmark(PR - 60, CY + 96, 16, 0, 0);
    svg('flap-b', [PX, CY, PW, PH / 2], s);
}

/* ---- the paper, inside: the same four flaps lying open, in the lighter tone, each with a hard shade at its fold. ---- */
{
    const OUTER = 14;
    /** Each open flap laps a little over the parcel's edge, so that no hairline of the mat shows at the fold. */
    const LAP = 2;
    const shade = (x, y, w, h) => rect(x, y, w, h, C.kraft, ' opacity="0.7"');
    const fold = pts => line(pts, C.kraft, 1.3, ' opacity="0.7"');
    // Top: from the parcel's top edge up and off the canvas.
    let t = poly([[PX, PY + LAP], [PR, PY + LAP], [PR - 5, -OUTER], [PX + 5, -OUTER]], C.kraftHi) + shade(PX, PY - 9, PW, 9 + LAP);
    t += fold([[PX + 6, PY - 44], [PR - 6, PY - 44]]) + fold([[PX + 40, PY - 44], [PX + 62, PY - 12]]) + fold([[PR - 70, PY - 70], [PR - 30, PY - 46]]);
    t += airmail('ti', PX, -OUTER, PW, PY + OUTER - 9, 6, 'lr', 6, 5);
    svg('flap-t-in', [PX, -OUTER, PW, PY + OUTER + LAP], t);
    let b = poly([[PX, PB - LAP], [PR, PB - LAP], [PR - 5, 450 + OUTER], [PX + 5, 450 + OUTER]], C.kraftHi) + shade(PX, PB - LAP, PW, 9 + LAP);
    b += fold([[PX + 6, PB + 44], [PR - 6, PB + 44]]) + fold([[PR - 40, PB + 44], [PR - 66, PB + 12]]) + fold([[PX + 70, PB + 72], [PX + 30, PB + 46]]);
    b += airmail('bi', PX, PB + 9, PW, 450 + OUTER - PB - 9, 6, 'lr', 6, 5);
    // The string, let go, lies where it fell.
    const loose = `M${PX + 34} ${PB + 30}C${PX + 70} ${PB + 6} ${PX + 104} ${PB + 58} ${PX + 136} ${PB + 34}C${PX + 160} ${PB + 16} ${PX + 176} ${PB + 30} ${PX + 168} ${PB + 46}C${PX + 160} ${PB + 62} ${PX + 136} ${PB + 50} ${PX + 150} ${PB + 34}C${PX + 164} ${PB + 18} ${PX + 196} ${PB + 26} ${PX + 208} ${PB + 56}`;
    b += `<path d="${loose}" fill="none" stroke="${C.kraftLo}" stroke-width="4" stroke-linecap="round" opacity="0.4" transform="translate(1.6 2)"/><path d="${loose}" fill="none" stroke="${C.paper}" stroke-width="4" stroke-linecap="round"/>`;
    svg('flap-b-in', [PX, PB - LAP, PW, 450 + OUTER - PB + LAP], b);
    let l = poly([[PX + LAP, PY], [PX + LAP, PB], [-OUTER, PB - 5], [-OUTER, PY + 5]], C.kraftHi) + shade(PX - 9, PY, 9 + LAP, PH);
    l += fold([[PX - 36, PY + 6], [PX - 36, PB - 6]]) + fold([[PX - 36, PY + 90], [PX - 10, PY + 120]]) + fold([[PX - 60, PB - 110], [PX - 38, PB - 70]]);
    svg('flap-l-in', [-OUTER, PY, PX + OUTER + LAP, PH], l);
    let r = poly([[PR - LAP, PY], [PR - LAP, PB], [360 + OUTER, PB - 5], [360 + OUTER, PY + 5]], C.kraftHi) + shade(PR - LAP, PY, 9 + LAP, PH);
    r += fold([[PR + 36, PY + 6], [PR + 36, PB - 6]]) + fold([[PR + 36, PB - 90], [PR + 10, PB - 120]]) + fold([[PR + 60, PY + 110], [PR + 38, PY + 70]]);
    svg('flap-r-in', [PR - LAP, PY, 360 + OUTER - PR + LAP, PH], r);
}

/* ---- the string: four runs from the knot to the four edges, cream, twisted (short slanted ticks), a hard shade beside it. ---- */
{
    const SW = 4.4;
    const run = (name, box, vertical) => {
        const [x, y, w, h] = box;
        let s = '';
        if (vertical) {
            s += rect(CX + SW / 2, y, 1.6, h, C.kraftLo, ' opacity="0.6"') + rect(CX - SW / 2, y, SW, h, C.paper);
            for (let yy = y + 3; yy < y + h - 3; yy += 5.5) s += line([[CX - SW / 2 + 0.6, yy + 2.4], [CX + SW / 2 - 0.6, yy]], C.kraftHi, 0.9);
        } else {
            s += rect(x, CY + SW / 2, w, 1.6, C.kraftLo, ' opacity="0.6"') + rect(x, CY - SW / 2, w, SW, C.paper);
            for (let xx = x + 3; xx < x + w - 3; xx += 5.5) s += line([[xx, CY + SW / 2 - 0.6], [xx + 2.4, CY - SW / 2 + 0.6]], C.kraftHi, 0.9);
        }
        svg(name, box, s);
    };
    run('str-t', [CX - 5, PY, 10, PH / 2], true);
    run('str-b', [CX - 5, CY, 10, PH / 2], true);
    run('str-l', [PX, CY - 5, PW / 2, 10], false);
    run('str-r', [CX, CY - 5, PW / 2, 10], false);
    // The bow: two loops and the knot. The two loose ends are their own layers, turning about the knot.
    const cord = (d, w = SW) => `<path d="${d}" fill="none" stroke="${C.kraftLo}" stroke-width="${w}" stroke-linecap="round" opacity="0.5" transform="translate(1.6 2)"/><path d="${d}" fill="none" stroke="${C.paper}" stroke-width="${w}" stroke-linecap="round"/>`;
    let bow = cord(`M${CX} ${CY}C${CX - 14} ${CY - 30} ${CX - 50} ${CY - 30} ${CX - 48} ${CY - 12}C${CX - 46} ${CY + 4} ${CX - 18} ${CY + 4} ${CX} ${CY}`);
    bow += cord(`M${CX} ${CY}C${CX + 14} ${CY - 30} ${CX + 50} ${CY - 30} ${CX + 48} ${CY - 12}C${CX + 46} ${CY + 4} ${CX + 18} ${CY + 4} ${CX} ${CY}`);
    bow += rect(CX - 6.5, CY - 6, 13, 12, C.paper, ' rx="3.5"') + line([[CX - 2.5, CY - 5], [CX - 2.5, CY + 5]], C.kraftHi, 1) + line([[CX + 2.5, CY - 5], [CX + 2.5, CY + 5]], C.kraftHi, 1);
    svg('bow', [CX - 56, CY - 32, 112, 42], bow);
    const tip = (x, y) => line([[x - 2.5, y + 3], [x, y]], C.paper, 1.6) + line([[x + 2.5, y + 3.5], [x, y]], C.paper, 1.6);
    svg('end-l', [CX - 38, CY - 4, 44, 72], cord(`M${CX} ${CY}C${CX - 6} ${CY + 22} ${CX - 28} ${CY + 34} ${CX - 30} ${CY + 60}`) + tip(CX - 30, CY + 60));
    svg('end-r', [CX - 6, CY - 4, 44, 72], cord(`M${CX} ${CY}C${CX + 8} ${CY + 20} ${CX + 22} ${CY + 38} ${CX + 28} ${CY + 58}`) + tip(CX + 28, CY + 58));
}

/* ---- scrap: one small torn piece of the paper ---- */
svg('scrap', [CX - 5, CY - 5, 10, 10], poly([[CX - 4, CY - 3], [CX + 2, CY - 4.5], [CX + 4.5, CY + 1], [CX - 1, CY + 4.5], [CX - 4.5, CY + 2]], C.kraftHi) + poly([[CX - 4, CY - 3], [CX + 2, CY - 4.5], [CX - 1, CY]], C.paper, ' opacity="0.7"'));

process.stdout.write(Object.entries(boxes).map(([k, v]) => `${k}: [${v.map(f).join(', ')}]`).join('\n') + '\n');
