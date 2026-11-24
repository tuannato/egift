// Generator for the "fanous" wrapper art: the Ramadan lantern. An old street at blue hour seen
// straight on, plastered walls with wooden window screens (squares and octagons), strings of
// small flags overhead, and in the middle a large hanging metal lantern: a flat faceted silhouette,
// brass and coloured glass. When it lights, its light throws eight-point rosettes and hexagon
// tiling onto the walls. Flat fills, no outline effects, no filter, no blend mode. The only
// gradients are alpha fades of one colour: the halo round the lantern and the pool on the street.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/fanous.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'fanous');
if (!OUT.endsWith('wrappers/fanous')) throw new Error('out dir must be public/wrappers/fanous');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two skies, three plasters, brass and gold, the lit cream, two glass colours. */
const C = {
    sky: '#3A4C8C',
    dusk: '#7C8FCB',
    wall: '#2C3A73',
    near: '#1E2752',
    deep: '#121736',
    brass: '#C98A2E',
    gold: '#F2C14E',
    cream: '#FBE9C0',
    red: '#C8453A',
    teal: '#2E9C8F',
};

const f = n => String(Math.round(n * 100) / 100);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const pathOf = pts => `M${pts.map(pt).join('L')}Z`;
const poly = (pts, fill, extra = '') => `<path d="${pathOf(pts)}" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const op = a => ` opacity="${f(a)}"`;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** A regular polygon's points: `n` corners on radius `r`, the first at angle `a0` (degrees). */
const ngon = (cx, cy, r, n, a0) => Array.from({ length: n }, (_, k) => {
    const a = ((a0 + (360 / n) * k) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});
/** An octagon with flat sides on the axes, by its apothem (half its width). */
const octagon = (cx, cy, a) => ngon(cx, cy, a / Math.cos(Math.PI / 8), 8, 22.5);
/** The outline of two squares laid over each other, one turned 45 degrees: an eight-point rosette. `s` = half a square's side. */
const rosette = (cx, cy, s) => {
    const out = [];
    for (let k = 0; k < 16; k += 1) {
        const r = k % 2 === 0 ? s * Math.SQRT2 : s / Math.cos(Math.PI / 8);
        const a = ((k * 22.5) * Math.PI) / 180;
        out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return out;
};
/** A quadratic curve's point and angle at t. */
const quad = (p0, p1, p2, t) => {
    const u = 1 - t;
    const p = [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
    const d = [2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])];
    return { p, a: Math.atan2(d[1], d[0]) };
};

/**
 * A wooden window screen: a frame with a lattice of octagons and the small squares between them
 * (the 4.8.8 tiling), lit from inside. The lattice is one dark shape with its holes cut out.
 */
function screen(x, y, w, h, cell, glow = C.gold) {
    const fr = 4;
    let s = rect(x - 3, y - 3, w + 6, h + 6, C.deep) + rect(x, y, w, h, glow) + rect(x, y + h * 0.55, w, h * 0.45, C.cream, op(0.35));
    const ix = x + fr, iy = y + fr, iw = w - 2 * fr, ih = h - 2 * fr;
    const nx = Math.max(1, Math.round(iw / cell)), ny = Math.max(1, Math.round(ih / cell));
    const cw = iw / nx, ch = ih / ny, c = Math.min(cw, ch);
    // Octagons that touch along their flat sides: the small squares between them come of themselves.
    let d = '';
    for (let i = 0; i < nx; i += 1) for (let j = 0; j < ny; j += 1) d += pathOf(octagon(ix + cw * (i + 0.5), iy + ch * (j + 0.5), c / 2));
    s += `<path d="${d}" fill="none" stroke="${C.deep}" stroke-width="${f(Math.max(1.6, c * 0.2))}"/>`;
    s += `<path d="M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}ZM${f(ix)} ${f(iy)}V${f(iy + ih)}H${f(ix + iw)}V${f(iy)}Z" fill="${C.deep}"/>`;
    return s;
}
/** A lit doorway: warm light, a cream floor of light low down, a step. */
function doorway(x, y, w, h, step = C.wall) {
    return rect(x - 3, y - 3, w + 6, h + 3, C.deep) + rect(x, y, w, h, C.gold) + rect(x, y + h * 0.45, w, h * 0.55, C.cream, op(0.55)) + rect(x - 5, y + h - 3, w + 10, 5, step);
}
/** Jars on a shelf, as dark silhouettes against a lit shop: different sizes, never a pair. */
function jars(list) {
    return list.map(([cx, base, r, neck]) => circle(cx, base - r, r, C.deep) + rect(cx - neck / 2, base - 2 * r - 4, neck, 6, C.deep)).join('');
}

/* ---- sky: blue hour, darker above and lighter low down, a few long thin clouds ---- */
{
    let s = rect(-6, -6, 372, 306, C.sky);
    s += rect(-6, 150, 372, 80, C.dusk, op(0.35)) + rect(-6, 196, 372, 104, C.dusk, op(0.5)) + rect(-6, 250, 372, 50, C.dusk, op(0.55));
    const bar = (x, y, w, h, a) => rect(x, y, w, h, C.dusk, ` rx="${f(h / 2)}"${op(a)}`);
    s += bar(70, 46, 96, 7, 0.4) + bar(120, 60, 54, 6, 0.3) + bar(190, 104, 120, 8, 0.35) + bar(232, 118, 60, 5, 0.3) + bar(60, 176, 84, 6, 0.4) + bar(214, 226, 70, 7, 0.4);
    svg('sky', [-6, -6, 372, 306], s);
}

/* ---- the end of the street: a low building with a lit shop, its awning red ---- */
{
    const B = [108, 280, 144, 120];
    let s = poly([[112, 304], [212, 304], [212, 290], [240, 290], [240, 304], [248, 304], [248, 398], [112, 398]], C.wall);
    s += rect(112, 304, 136, 94, C.dusk, op(0.16));
    s += rect(110, 302, 140, 4, C.dusk, op(0.5)) + rect(210, 288, 32, 3, C.dusk, op(0.5));
    // A small window upstairs, screened.
    s += screen(214, 312, 22, 16, 8);
    // The shop: a wide lit opening, a red awning, small lanterns and jars inside.
    s += rect(124, 336, 112, 62, C.deep) + rect(128, 340, 104, 58, C.gold) + rect(128, 368, 104, 30, C.cream, op(0.5));
    s += poly([[120, 326], [240, 326], [234, 342], [126, 342]], C.red) + rect(126, 340, 108, 2, C.deep, op(0.4));
    for (const [x, len] of [[146, 8], [180, 12], [212, 7]]) {
        s += rect(x - 0.5, 342, 1, len, C.deep) + poly([[x - 3, 342 + len], [x + 3, 342 + len], [x + 4, 349 + len], [x, 353 + len], [x - 4, 349 + len]], C.deep);
    }
    s += rect(128, 382, 104, 3, C.deep) + jars([[136, 382, 5, 4], [158, 382, 7, 5], [196, 382, 4, 3], [222, 382, 6, 4]]);
    svg('far', B, s);
}

/* ---- the middle houses, one each side, set back: lighter plaster, a parapet, small screens ---- */
{
    let s = rect(70, 96, 42, 304, C.wall) + rect(68, 94, 46, 6, C.dusk, op(0.55)) + rect(104, 100, 8, 300, C.deep, op(0.25));
    s += screen(76, 188, 28, 44, 9) + screen(76, 262, 28, 34, 9, C.brass) + doorway(80, 348, 22, 50, C.near);
    svg('mid-l', [66, 90, 50, 310], s);
}
{
    let s = rect(248, 104, 42, 296, C.wall) + rect(246, 102, 46, 6, C.dusk, op(0.55)) + rect(248, 108, 8, 292, C.deep, op(0.25));
    s += screen(256, 180, 28, 36, 9, C.brass) + screen(256, 240, 28, 50, 9) + doorway(260, 344, 22, 54, C.near);
    svg('mid-r', [244, 98, 50, 302], s);
}

/* ---- the near houses, left and right: dark plaster to the top of the frame, a projecting screened
   window high up, a smaller one lower, and at street level a lit doorway (left) and a shop (right) ---- */
const patches = (list) => list.map(([x, y, w, h]) => rect(x, y, w, h, C.wall, ` rx="3"${op(0.5)}`)).join('');
{
    let s = rect(-6, -6, 76, 406, C.near) + rect(62, -6, 8, 406, C.deep, op(0.45));
    s += patches([[2, 160, 30, 14], [30, 290, 22, 10], [-4, 272, 18, 26]]);
    // A wire bracket where the lantern's wire and the flags are tied.
    s += rect(56, 8, 14, 3, C.deep) + rect(56, 38, 14, 3, C.deep);
    // Projecting window box: a sill, a hood, the screen.
    s += rect(-6, 50, 70, 6, C.deep) + screen(2, 60, 54, 82, 11) + rect(-6, 144, 70, 8, C.deep) + rect(-2, 150, 62, 4, C.wall);
    s += screen(10, 200, 38, 52, 10, C.brass);
    s += doorway(14, 320, 42, 78, C.wall);
    svg('walls-l', [-6, -6, 76, 406], s);
}
{
    let s = rect(290, -6, 76, 406, C.near) + rect(290, -6, 8, 406, C.deep, op(0.45));
    s += patches([[326, 190, 34, 12], [300, 270, 20, 16], [340, 96, 22, 10]]);
    s += rect(290, 12, 14, 3, C.deep) + rect(290, 20, 14, 3, C.deep);
    s += rect(296, 62, 70, 6, C.deep) + screen(304, 72, 54, 78, 11) + rect(296, 152, 70, 8, C.deep) + rect(300, 158, 62, 4, C.wall);
    s += screen(312, 204, 40, 46, 10);
    // The shop: lit, a teal awning, jars on a shelf.
    s += rect(298, 316, 68, 82, C.deep) + rect(302, 320, 64, 78, C.gold) + rect(302, 356, 64, 42, C.cream, op(0.5));
    s += poly([[294, 304], [366, 304], [366, 322], [300, 322]], C.teal) + rect(300, 320, 66, 2, C.deep, op(0.4));
    s += rect(302, 366, 64, 3, C.deep) + jars([[312, 366, 6, 4], [334, 366, 9, 5], [356, 366, 5, 4]]);
    s += rect(302, 386, 64, 12, C.near);
    svg('walls-r', [290, -6, 76, 406], s);
}

/* ---- the street: worn paving, stones of different lengths, light spilling out of the doors ---- */
{
    let s = rect(-6, 396, 372, 60, C.deep);
    const LIT = [[14, 56, 3], [128, 232, 2], [80, 102, 1], [260, 282, 1], [302, 366, 3]];
    const rows = [[400, 8, 0], [410, 11, 9], [423, 14, 4], [439, 17, 13]];
    const lens = [26, 18, 34, 22, 30, 16, 28, 24, 20, 36, 18, 26];
    rows.forEach(([y, h, shift], r) => {
        let x = -6 - shift, k = r * 3;
        while (x < 366) {
            const w = lens[k % lens.length] * (1 + r * 0.2);
            // Stones in front of a lit door or shop catch its light.
            const mid = x + w / 2;
            const lit = LIT.some(([a, b, depth]) => mid > a - r * 6 && mid < b + r * 6 && r < depth);
            s += rect(x + 1.5, y + 1, w - 3, h - 2, lit ? C.brass : r % 2 ? C.near : C.wall, ` rx="3"${op(lit ? 0.62 - r * 0.14 : 0.55 + r * 0.1)}`);
            x += w;
            k += 1;
        }
    });
    svg('ground', [-6, 396, 372, 60], s);
}

/* ---- flags: two strings of small plain pennants, one high in front, one lower behind the lantern ---- */
function flags(p0, p1, p2, n, start, sizes) {
    const cols = [C.red, C.gold, C.teal, C.cream];
    let s = `<path d="M${pt(p0)}Q${pt(p1)} ${pt(p2)}" fill="none" stroke="${C.cream}" stroke-width="1.2" stroke-opacity="0.7"/>`;
    for (let i = 0; i < n; i += 1) {
        const { p, a } = quad(p0, p1, p2, (i + 0.5) / n);
        const [w, h] = sizes[i % sizes.length];
        const ca = Math.cos(a), sa = Math.sin(a);
        const at = (u, v) => [p[0] + u * ca - v * sa, p[1] + u * sa + v * ca];
        s += poly([at(-w / 2, 0), at(w / 2, 0), at(0, h)], cols[(i + start) % cols.length]);
    }
    return s;
}
{
    // The lantern's own wire, and the high string of flags in front of its chain.
    const wire = `<path d="M70 10Q180 30 290 14" fill="none" stroke="${C.deep}" stroke-width="2"/>`;
    svg('bunting-a', [66, 4, 228, 72], wire + flags([70, 40], [180, 72], [290, 22], 13, 0, [[11, 13], [9, 11], [12, 14], [10, 12]]));
    svg('bunting-b', [66, 132, 228, 64], flags([70, 154], [180, 196], [290, 142], 13, 2, [[10, 12], [12, 14], [9, 11]]));
}

/* ---- the lantern. Front view of a six-sided lantern: a ring, a dome cap, an upper tier of three
   panels widening downward, a waist, a lower tier tapering to the base, a ring under the base. ---- */
const LX = 180;
const UP = { top: 136, bot: 214, t0: 146, t1: 214, b0: 128, b1: 232 };
const LOW = { top: 224, bot: 258, t0: 130, t1: 230, b0: 156, b1: 204 };
const POSTS = [0, 0.24, 0.76, 1];
/** The glass panes of one tier: [corner points, colour] for each of its three faces. */
function panes(T, cols, inset = 3.2) {
    const xt = u => T.t0 + (T.t1 - T.t0) * u, xb = u => T.b0 + (T.b1 - T.b0) * u;
    return [0, 1, 2].map(i => {
        const a = POSTS[i], b = POSTS[i + 1];
        return [[[xt(a) + inset, T.top + inset], [xt(b) - inset, T.top + inset], [xb(b) - inset, T.bot - inset], [xb(a) + inset, T.bot - inset]], cols[i]];
    });
}
const UPPER = panes(UP, [C.teal, C.red, C.teal]);
const LOWER = panes(LOW, [C.red, C.gold, C.red]);
/** The metal inside the panes: an octagon in the middle face, one bar across each side face. */
function lattice() {
    let s = `<path d="${pathOf(octagon(LX, 175, 17))}${pathOf(octagon(LX, 175, 13.6))}" fill="${C.brass}" fill-rule="evenodd"/>`;
    s += rect(LX - 2, UP.top, 4, 175 - 17 - UP.top, C.brass) + rect(LX - 2, 192, 4, UP.bot - 192, C.brass);
    for (const [pts] of [UPPER[0], UPPER[2]]) {
        const yl = 175, xl = pts[0][0] + (pts[3][0] - pts[0][0]) * ((yl - pts[0][1]) / (pts[3][1] - pts[0][1]));
        const xr = pts[1][0] + (pts[2][0] - pts[1][0]) * ((yl - pts[1][1]) / (pts[2][1] - pts[1][1]));
        s += rect(xl, yl - 1.6, xr - xl, 3.2, C.brass);
    }
    // A small square turned on its corner in the middle of the lower face.
    s += `<path d="${pathOf([[LX, 232], [LX + 8, 240], [LX, 248], [LX - 8, 240]])}${pathOf([[LX, 235.5], [LX + 4.5, 240], [LX, 244.5], [LX - 4.5, 240]])}" fill="${C.brass}" fill-rule="evenodd"/>`;
    return s;
}
const BOX_L = [114, 16, 132, 288];
{
    let s = '';
    // Chain: a fine rod and links.
    for (let y = 21, k = 0; y < 68; y += 6, k += 1) {
        s += k % 2 ? rect(LX - 0.9, y, 1.8, 7.5, C.deep) : `<ellipse cx="${LX}" cy="${f(y + 3.6)}" rx="2.2" ry="3.9" fill="none" stroke="${C.deep}" stroke-width="1.3"/>`;
    }
    s += `<circle cx="${LX}" cy="76" r="6" fill="none" stroke="${C.brass}" stroke-width="2.6"/>` + circle(LX, 86, 4.2, C.brass);
    // Dome cap, its right half in shade.
    s += `<path d="M148 128C148 106 165 91 180 90C195 91 212 106 212 128Z" fill="${C.brass}"/>`;
    s += `<path d="M180 90C195 91 212 106 212 128L180 128Z" fill="${C.deep}" opacity="0.28"/>`;
    s += `<path d="M164 128C165 110 172 96 180 90C188 96 195 110 196 128" fill="none" stroke="${C.deep}" stroke-width="1.6" stroke-opacity="0.4"/>`;
    s += rect(142, 127, 76, 10, C.brass) + rect(142, 134, 76, 3, C.deep, op(0.3));
    // Upper tier: the frame, then the dark glass (the colour shows faintly while unlit).
    s += poly([[UP.t0, UP.top], [UP.t1, UP.top], [UP.b1, UP.bot], [UP.b0, UP.bot]], C.brass);
    for (const [p, c] of UPPER) s += poly(p, C.deep) + poly(p, c, op(0.42));
    // Waist with two small points out to the sides.
    s += poly([[122, 213], [238, 213], [233, 225], [127, 225]], C.brass) + poly([[124, 213], [112, 219], [127, 225]], C.brass) + poly([[236, 213], [248, 219], [233, 225]], C.brass);
    s += rect(127, 222, 106, 3, C.deep, op(0.3));
    // Lower tier.
    s += poly([[LOW.t0, LOW.top], [LOW.t1, LOW.top], [LOW.b1, LOW.bot], [LOW.b0, LOW.bot]], C.brass);
    for (const [p, c] of LOWER) s += poly(p, C.deep) + poly(p, c, op(0.42));
    // The shade side: the right-hand faces a little darker.
    s += poly(UPPER[2][0], C.deep, op(0.22)) + poly(LOWER[2][0], C.deep, op(0.22));
    s += lattice();
    // Base band, neck, ring and drop.
    s += rect(150, 257, 60, 10, C.brass) + rect(150, 264, 60, 3, C.deep, op(0.3)) + rect(LX - 4, 267, 8, 3, C.brass);
    s += `<circle cx="${LX}" cy="278" r="7.5" fill="none" stroke="${C.brass}" stroke-width="3"/>`;
    s += poly([[LX, 286], [LX + 4.5, 292], [LX, 300], [LX - 4.5, 292]], C.brass);
    svg('lantern', BOX_L, s);
}
{
    // The lit glass: full colour, a cream light low in each pane, the metal laid over it again.
    let s = '';
    const lit = (p, c) => {
        const [a, b, cc, d] = p;
        const mix = (u, v, t) => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
        const inner = [mix(a, d, 0.3), mix(b, cc, 0.3), mix(b, cc, 0.92), mix(a, d, 0.92)];
        const sh = 3;
        const ins = [[inner[0][0] + sh, inner[0][1]], [inner[1][0] - sh, inner[1][1]], [inner[2][0] - sh, inner[2][1]], [inner[3][0] + sh, inner[3][1]]];
        return poly(p, c) + poly([mix(a, d, 0.55), mix(b, cc, 0.55), cc, d], C.gold, op(0.3)) + poly(ins, C.cream, op(0.3));
    };
    for (const [p, c] of UPPER) s += lit(p, c);
    for (const [p, c] of LOWER) s += lit(p, c);
    s += lattice();
    // A thin bright line where the dome meets the band: light leaking from inside.
    s += rect(146, 126, 68, 2, C.cream, op(0.8));
    svg('glass-lit', BOX_L, s);
}

/* ---- the halo round the lantern, and the pool of its light on the street ---- */
{
    const R = 150;
    svg('halo', [LX - R, 180 - R, 2 * R, 2 * R], `<defs><radialGradient id="h"><stop offset="0" stop-color="${C.gold}" stop-opacity="0.75"/><stop offset="0.3" stop-color="${C.gold}" stop-opacity="0.36"/><stop offset="0.65" stop-color="${C.gold}" stop-opacity="0.12"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient></defs>${circle(LX, 180, R, 'url(#h)')}`);
    svg('pool', [60, 384, 240, 72], `<defs><radialGradient id="p"><stop offset="0" stop-color="${C.gold}" stop-opacity="0.5"/><stop offset="0.5" stop-color="${C.gold}" stop-opacity="0.2"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient></defs><ellipse cx="180" cy="420" rx="120" ry="36" fill="url(#p)"/>`);
}

/* ---- what the light throws on the walls: hexagon tiling and eight-point rosettes, in the colours of
   the glass, strongest near the lantern and fading away from it ---- */
const SRC = [LX, 180];
function cast(box, clip, roses, hexR, id) {
    const [bx, by, bw, bh] = box;
    const fall = (x, y) => Math.max(0, 1 - Math.hypot(x - SRC[0], y - SRC[1]) / 300);
    let g = '';
    // Hexagon tiling, pointy side up.
    const w = Math.sqrt(3) * hexR, v = 1.5 * hexR;
    for (let j = -1; j * v < bh + hexR * 2; j += 1) {
        for (let i = -1; i * w < bw + w; i += 1) {
            const cx = bx + i * w + (j % 2 ? w / 2 : 0), cy = by + j * v;
            const a = 0.08 + 0.4 * fall(cx, cy);
            g += `<path d="${pathOf(ngon(cx, cy, hexR - 2.5, 6, 30))}" fill="none" stroke="${C.gold}" stroke-width="1.5" stroke-opacity="${f(a)}"/>`;
        }
    }
    for (const [cx, cy, s, col] of roses) {
        const a = 0.55 + 0.4 * fall(cx, cy);
        // A rosette of coloured light, a ring of gold inside it, a bright rosette at its heart.
        g += poly(rosette(cx, cy, s), col, ` fill-opacity="${f(a)}"`);
        g += `<path d="${pathOf(octagon(cx, cy, s * 0.66))}${pathOf(octagon(cx, cy, s * 0.54))}" fill="${C.gold}" fill-rule="evenodd" fill-opacity="${f(a)}"/>`;
        g += poly(rosette(cx, cy, s * 0.36), C.cream, ` fill-opacity="${f(Math.min(1, a + 0.1))}"`);
    }
    svg(id, box, `<defs><clipPath id="c">${clip.map(([x, y, cw, ch]) => rect(x, y, cw, ch, C.deep)).join('')}</clipPath></defs><g clip-path="url(#c)">${g}</g>`);
}
cast([-6, 100, 118, 296], [[-6, 100, 76, 296], [70, 100, 42, 296]], [
    [34, 172, 26, C.gold],
    [92, 132, 13, C.cream],
    [86, 236, 17, C.teal],
    [26, 290, 22, C.red],
    [84, 334, 12, C.gold],
    [30, 380, 14, C.teal],
], 19, 'cast-l');
cast([248, 108, 118, 288], [[248, 108, 42, 288], [290, 108, 76, 288]], [
    [326, 176, 26, C.gold],
    [268, 140, 12, C.cream],
    [274, 244, 17, C.red],
    [334, 288, 22, C.teal],
    [272, 336, 12, C.gold],
    [342, 384, 13, C.red],
], 19, 'cast-r');

/* ---- fleck: gold dust when the lantern lights ---- */
svg('fleck', [176, 176, 8, 8], poly([[180, 176], [184, 180], [180, 184], [176, 180]], C.gold));
