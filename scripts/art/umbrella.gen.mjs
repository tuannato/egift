// Generator for the "umbrella" wrapper art: a grey street corner in the rain, in flat shapes: low
// lobed clouds, a row of narrow house fronts, a lamp post, a bench, a paved sidewalk with two
// puddles, and one coral umbrella. No outline, no filter, no blend mode. The only gradients are the
// two skies and alpha fades of one colour (the lamp's halo, the sun's halo, the shaft of sun, the
// warm wash on the houses, the light left on the pavement).
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/umbrella.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'umbrella');
if (!OUT.endsWith('wrappers/umbrella')) throw new Error('out dir must be public/wrappers/umbrella');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: the rain sky's two slates and a deeper one for the heavy cloud and the dark fronts, the
   sun's two yellows, the umbrella's two corals, a near-black, the puddles' blue-grey, the wet pavement;
   and for after the rain a peach for the fronts and a green for the tree. */
const C = {
    slate: '#3B4A5C',
    slateLt: '#5B6B7C',
    deep: '#252E3A',
    sun: '#F9D98C',
    sunPale: '#FCEBC2',
    coral: '#E4572E',
    coralLo: '#C8431F',
    ink: '#2B2B2B',
    puddle: '#8FA6BA',
    pave: '#6E7C8B',
    peach: '#F6C9A8',
    leaf: '#7E9B74',
};

const f = n => String(Math.round(n * 100) / 100);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(pt).join('L')}Z" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra}/>`;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** A small seeded generator (mulberry32): the rain and the paving fall the same way every run. */
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let z = a;
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
}
/**
 * A lobed mass: a closed outline through `pts`, walked clockwise, each span an arc bulging outward.
 * A point is [x, y, k]: k >= 1 is how round the lobe ending there is (1 = a half circle); k = 0 is a
 * straight edge (for the sides that lie outside the frame).
 */
function lobes(start, pts, fill, extra = '') {
    let d = `M${pt(start)}`, [px, py] = start;
    for (const [x, y, k] of pts) {
        if (!k) d += `L${f(x)} ${f(y)}`;
        else {
            const r = (Math.hypot(x - px, y - py) / 2) * k;
            d += `A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y)}`;
        }
        px = x;
        py = y;
    }
    return `<path d="${d}Z" fill="${fill}"${extra}/>`;
}
/** A smooth closed outline through points (Catmull-Rom as cubics): puddles. */
function smooth(pts) {
    const n = pts.length;
    let d = `M${pt(pts[0])}`;
    for (let i = 0; i < n; i += 1) {
        const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        d += `C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
    }
    return `${d}Z`;
}
/** An irregular flat pool about (cx, cy): the radii are turned by a fixed run of factors. */
function pool(cx, cy, rx, ry, ks, grow = 1) {
    return smooth(ks.map((k, i) => {
        const a = (i / ks.length) * Math.PI * 2;
        return [cx + Math.cos(a) * rx * k * grow, cy + Math.sin(a) * ry * k * grow];
    }));
}
const POOLS = [
    { c: [86, 412], r: [58, 12], ks: [1, 0.86, 0.94, 0.7, 0.98, 1.04, 0.8, 0.92, 0.76, 0.9] },
    { c: [266, 387], r: [45, 9.5], ks: [0.96, 0.78, 1, 0.9, 0.72, 1, 0.84, 1.02, 0.8] },
];
const poolPath = (p, grow = 1, dx = 0, dy = 0) => pool(p.c[0] + dx, p.c[1] + dy, p.r[0], p.r[1], p.ks, grow);

const SKY = [-6, -6, 372, 186];

/* ---- sky: the rain sky, darker above ---- */
svg('sky', SKY, `<defs><linearGradient id="s" gradientUnits="userSpaceOnUse" x1="0" y1="-6" x2="0" y2="180"><stop offset="0" stop-color="${C.slate}"/><stop offset="1" stop-color="${C.slateLt}"/></linearGradient></defs>${rect(-6, -6, 372, 186, 'url(#s)')}`);

/* ---- sun-sky: the same sky once the cloud has parted: no disc, only a wide brightness high in the gap ---- */
{
    let s = `<defs><linearGradient id="s" gradientUnits="userSpaceOnUse" x1="0" y1="-6" x2="0" y2="180"><stop offset="0" stop-color="${C.sun}"/><stop offset="1" stop-color="${C.sunPale}"/></linearGradient>`;
    s += `<radialGradient id="h"><stop offset="0" stop-color="${C.sunPale}" stop-opacity="0.9"/><stop offset="0.5" stop-color="${C.sunPale}" stop-opacity="0.45"/><stop offset="1" stop-color="${C.sunPale}" stop-opacity="0"/></radialGradient></defs>`;
    s += rect(-6, -6, 372, 186, 'url(#s)') + ellipse(184, -6, 150, 120, 'url(#h)');
    svg('sun-sky', SKY, s);
}

/* ---- the street: house fronts, a lamp post, a tree, a bench, the sidewalk and its two puddles ---- */
const GROUND = 318;
/** The fronts, left to right: width, roofline, wall tone in the rain, roof kind. */
const HOUSES = [
    { w: 46, top: 178, tone: 'B', roof: 'flat' },
    { w: 54, top: 164, tone: 'A', roof: 'gable' },
    { w: 40, top: 190, tone: 'C', roof: 'cornice' },
    { w: 62, top: 170, tone: 'B', roof: 'mansard' },
    { w: 50, top: 184, tone: 'A', roof: 'chimney' },
    { w: 44, top: 168, tone: 'D', roof: 'gable' },
    { w: 76, top: 186, tone: 'C', roof: 'flat' },
];
{
    let x = -6;
    for (const h of HOUSES) {
        h.x = x;
        x += h.w;
    }
}
const WALL = { A: C.deep, B: C.slate, C: C.puddle, D: C.slateLt };
/** The same fronts in the sun: cream, peach and a soft yellow, no two neighbours alike. */
const SUNNY = [C.sunPale, C.peach, C.sun, C.sunPale, C.peach, C.sun, C.sunPale];
/** Lit windows in the rain, as "house:column:row". */
const LIT = new Set(['0:0:1', '1:1:0', '1:0:2', '3:2:1', '5:1:1', '6:2:0', '6:0:2']);
/** The windows, the door and the shop window of a front, painted by `paint`: the same places in rain and in sun. */
function openings(h, i, paint) {
    let s = '';
    const cols = h.w > 58 ? 3 : 2;
    const ww = [8, 9, 10, 8, 9, 8, 10][i], wh = [13, 12, 15, 11, 14, 12, 13][i];
    const gapY = [10, 12, 9, 11, 10, 13, 12][i];
    const y0 = h.top + [12, 14, 10, 12, 12, 16, 12][i];
    const step = (h.w - 8) / cols;
    const rows = Math.floor((GROUND - 44 - y0) / (wh + gapY)) + 1;
    for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
            const wx = h.x + 4 + step * c + (step - ww) / 2, wy = y0 + r * (wh + gapY);
            const [fill, extra] = paint.window(LIT.has(`${i}:${c}:${r}`));
            s += i % 3 === 1 ? `<path d="M${f(wx)} ${f(wy + wh)}V${f(wy + ww / 2)}A${f(ww / 2)} ${f(ww / 2)} 0 0 1 ${f(wx + ww)} ${f(wy + ww / 2)}V${f(wy + wh)}Z" fill="${fill}"${extra}/>` : rect(wx, wy, ww, wh, fill, extra);
            if (paint.sill) s += rect(wx - 1.5, wy + wh, ww + 3, 1.8, paint.sill[0], paint.sill[1]);
        }
    }
    const dw = 11, dh = 26, dx = h.x + [8, 30, 14, 10, 28, 8, 12][i];
    s += `<path d="M${f(dx)} ${GROUND}V${GROUND - dh + dw / 2}A${dw / 2} ${dw / 2} 0 0 1 ${f(dx + dw)} ${GROUND - dh + dw / 2}V${GROUND}Z" fill="${paint.door}"/>`;
    if (h.w > 58) s += rect(dx + dw + 8, GROUND - 24, h.w - dw - 30, 16, paint.shop[0], paint.shop[1]);
    return s;
}
/** The tree, right: an angular trunk with one fork, three flat crowns cut in facets, each with one shaded face. */
function tree(crown, shade) {
    let s = poly([[328, 330], [336, 330], [335, 268], [346, 246], [342, 244], [333, 258], [332, 236], [329, 236], [329, 262], [320, 250], [317, 252], [328, 272]], C.ink);
    const crowns = [
        [[[300, 256], [296, 242], [306, 232], [320, 236], [324, 250], [314, 260]], [[320, 236], [324, 250], [314, 260], [311, 246]]],
        [[[340, 258], [338, 244], [350, 236], [364, 242], [366, 256], [354, 264]], [[364, 242], [366, 256], [354, 264], [352, 248]]],
        [[[310, 236], [304, 214], [316, 194], [338, 186], [356, 198], [362, 220], [352, 240], [330, 246]], [[338, 186], [356, 198], [362, 220], [352, 240], [330, 246], [337, 216]]],
    ];
    for (const [out, face] of crowns) s += poly(out, crown) + poly(face, shade[0], shade[1]);
    return s;
}
/** The bench's back: two slats on two plain posts, and an armrest at the top of a short post at each end. */
function bench() {
    let s = rect(162, 280, 4, 50, C.ink) + rect(284, 280, 4, 50, C.ink);
    s += rect(150, 282, 150, 9, C.puddle) + rect(150, 297, 150, 9, C.puddle);
    s += rect(146, 312, 4.5, 54, C.ink) + rect(146, 310, 20, 3.5, C.ink) + rect(299.5, 312, 4.5, 54, C.ink) + rect(284, 310, 20, 3.5, C.ink);
    return s;
}
/** The lamp post, left. */
const LX = 62;
function lamp(lit) {
    let s = rect(LX - 2, 196, 4, 172, C.ink) + rect(LX - 5.5, 350, 11, 18, C.ink) + rect(LX - 9, 366, 18, 4, C.ink);
    s += poly([[LX - 9, 176], [LX + 9, 176], [LX + 5.5, 196], [LX - 5.5, 196]], lit ? C.sun : C.puddle) + poly([[LX - 3, 180], [LX + 3, 180], [LX + 2, 193], [LX - 2, 193]], C.sunPale, lit ? '' : ' opacity="0.6"');
    s += poly([[LX - 12, 176], [LX, 167], [LX + 12, 176]], C.ink) + rect(LX - 1.2, 162, 2.4, 6, C.ink) + rect(LX - 7, 195, 14, 3, C.ink);
    return s;
}
{
    let s = '';
    HOUSES.forEach((h, i) => {
        const dark = h.tone === 'A' || h.tone === 'B';
        const x1 = h.x + h.w;
        // Wall. The light fronts are the puddle's blue-grey thinned over the deep slate.
        if (h.tone === 'C') s += rect(h.x, h.top, h.w, GROUND - h.top, C.deep) + rect(h.x, h.top, h.w, GROUND - h.top, C.puddle, ' opacity="0.78"');
        else s += rect(h.x, h.top, h.w, GROUND - h.top, WALL[h.tone]);
        // Roof.
        const roofFill = h.tone === 'A' ? C.slate : C.deep;
        if (h.roof === 'gable') s += poly([[h.x - 2, h.top], [h.x + h.w / 2, h.top - 18], [x1 + 2, h.top]], roofFill);
        else if (h.roof === 'mansard') s += poly([[h.x, h.top], [h.x + 7, h.top - 16], [x1 - 7, h.top - 16], [x1, h.top]], roofFill) + rect(h.x + 24, h.top - 13, 9, 10, C.slateLt, ' opacity="0.7"');
        else if (h.roof === 'cornice') s += rect(h.x - 2, h.top - 4, h.w + 4, 6, roofFill);
        else if (h.roof === 'chimney') s += rect(h.x, h.top - 3, h.w, 4, roofFill) + rect(x1 - 17, h.top - 16, 9, 14, C.slate);
        else s += rect(h.x, h.top - 3, h.w, 4, roofFill);
        s += openings(h, i, {
            window: lit => (lit ? [C.sun, ''] : dark ? [C.slateLt, ' opacity="0.55"'] : [C.slate, ' opacity="0.8"']),
            sill: h.tone === 'A' ? null : [dark ? C.deep : C.slate, ' opacity="0.6"'],
            door: dark ? C.ink : C.deep,
            shop: [dark ? C.slateLt : C.slate, ' opacity="0.6"'],
        });
        // A fine dark seam where one front meets the next.
        s += rect(x1 - 0.8, h.top, 1.6, GROUND - h.top, C.deep, ' opacity="0.5"');
    });

    // The foot of the fronts, in shade.
    s += rect(-6, GROUND, 372, 8, C.deep);

    // The sidewalk: rows of slabs that grow toward the viewer, joints staggered, a few slabs a tone off.
    s += rect(-6, GROUND + 8, 372, 104, C.pave);
    const rnd = seeded(7);
    const ROWS = [326, 344, 366, 396, 430];
    let joints = '';
    for (let r = 0; r < ROWS.length - 1; r += 1) {
        const y0 = ROWS[r], y1 = ROWS[r + 1], base = (y1 - y0) * 2.3;
        let x = -6 - rnd() * base;
        while (x < 366) {
            const w = base * (0.72 + rnd() * 0.6);
            const tint = rnd();
            if (tint < 0.2) s += rect(x, y0, w, y1 - y0, C.deep, ' opacity="0.13"');
            else if (tint < 0.42) s += rect(x, y0, w, y1 - y0, C.puddle, ' opacity="0.2"');
            x += w;
            joints += `M${f(x)} ${y0}V${y1}`;
        }
        if (r > 0) joints += `M-6 ${y0}H366`;
    }
    s += `<path d="${joints}" stroke="${C.slate}" stroke-width="1.1" opacity="0.6" fill="none"/>`;
    // The kerb and the road.
    s += rect(-6, 430, 372, 7, C.puddle, ' opacity="0.6"') + rect(-6, 437, 372, 19, C.deep);
    s += rect(20, 443, 74, 2.4, C.puddle, ' opacity="0.4" rx="1.2"') + rect(150, 447, 36, 2.4, C.puddle, ' opacity="0.3" rx="1.2"') + rect(226, 442, 112, 2.4, C.puddle, ' opacity="0.4" rx="1.2"');

    s += tree(C.slate, [C.slateLt, ' opacity="0.55"']);
    // The bench: its back, then the seat.
    s += bench() + rect(146, 328, 158, 7, C.puddle) + rect(146, 335, 158, 3, C.deep, ' opacity="0.55"');

    // The lamp, lit. Its halo is one colour fading out; a pale streak lies under it on the wet slabs.
    s += `<defs><radialGradient id="h"><stop offset="0" stop-color="${C.sun}" stop-opacity="0.6"/><stop offset="0.35" stop-color="${C.sun}" stop-opacity="0.24"/><stop offset="1" stop-color="${C.sun}" stop-opacity="0"/></radialGradient></defs>`;
    s += circle(LX, 186, 44, 'url(#h)') + lamp(true);
    s += poly([[LX - 5, 372], [LX + 5, 372], [LX + 2.5, 424], [LX - 2.5, 424]], C.sun, ' opacity="0.3"');

    // The puddles: the sky's grey lying in them, a darker shape of the fronts inside.
    for (const p of POOLS) {
        s += `<path d="${poolPath(p)}" fill="${C.puddle}"/>`;
        s += `<path d="${poolPath(p, 0.6, -p.r[0] * 0.14, p.r[1] * 0.16)}" fill="${C.slate}" opacity="0.4"/>`;
    }
    // Where the umbrella stands: a small pool of shade.
    s += ellipse(190, 394, 20, 3.4, C.deep, ' opacity="0.3"');
    svg('street', [-6, 140, 372, 316], s);
}

/* ---- warm: the same fronts after the rain, painted over the wet ones: walls in cream, peach and soft
   yellow, the windows holding the sky, the tree in leaf, the lamp out. What stands in front of the fronts
   (tree, bench, lamp) is drawn again here, in the same places, so that it is not painted out. ---- */
{
    let s = '';
    HOUSES.forEach((h, i) => {
        const x1 = h.x + h.w;
        s += rect(h.x, h.top, h.w, GROUND - h.top, SUNNY[i], ' opacity="0.92"');
        // One flat shade across the lower part of each front, its edge slanting.
        const a = [70, 96, 60, 104, 66, 92, 78][i], b = a + [22, -16, 18, -20, 24, -14, 20][i];
        s += poly([[h.x, h.top + a], [x1, h.top + b], [x1, GROUND], [h.x, GROUND]], C.peach, ' opacity="0.4"');
        s += openings(h, i, {
            window: () => [C.puddle, ''],
            sill: [C.slateLt, ' opacity="0.6"'],
            door: C.slate,
            shop: [C.puddle, ' opacity="0.9"'],
        });
        s += rect(x1 - 0.8, h.top, 1.6, GROUND - h.top, C.slateLt, ' opacity="0.5"');
    });
    s += tree(C.leaf, [C.deep, ' opacity="0.22"']) + bench() + lamp(false);
    svg('warm', [-8, 144, 376, 174], s);
}

/* ---- puddle-hi: the light lying on the puddles, breathing ---- */
const rim = (p, o) => {
    const [cx, cy] = p.c, [rx, ry] = p.r;
    return `<path d="M${f(cx - rx * 0.66)} ${f(cy - ry * 0.3)}C${f(cx - rx * 0.3)} ${f(cy - ry * 0.92)} ${f(cx + rx * 0.3)} ${f(cy - ry * 0.9)} ${f(cx + rx * 0.7)} ${f(cy - ry * 0.34)}C${f(cx + rx * 0.3)} ${f(cy - ry * 0.56)} ${f(cx - rx * 0.3)} ${f(cy - ry * 0.56)} ${f(cx - rx * 0.66)} ${f(cy - ry * 0.3)}Z" fill="${C.sunPale}"${o}/>`;
};
{
    let s = '';
    // A long leaf of light along the far edge, and one small glint.
    for (const p of POOLS) s += rim(p, ' opacity="0.7"') + ellipse(p.c[0] + p.r[0] * 0.3, p.c[1] + p.r[1] * 0.36, p.r[0] * 0.16, p.r[1] * 0.14, C.sunPale, ' opacity="0.6"');
    svg('puddle-hi', [24, 374, 292, 54], s);
}

/* ---- ripples: rings where the drops land, on the puddles and on the wet slabs ---- */
{
    const ring = (cx, cy, rx, o) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(rx * 0.24)}" fill="none" stroke="${C.sunPale}" stroke-width="1.1" opacity="${o}"/>`;
    let s = '';
    for (const [cx, cy, rx] of [[62, 411, 15], [108, 415, 9], [252, 386, 8], [284, 389, 13], [150, 382, 7], [206, 412, 10], [322, 414, 8], [38, 386, 6]]) s += ring(cx, cy, rx, 0.85) + (rx > 8 ? ring(cx, cy, rx * 0.5, 0.6) : '');
    svg('ripples', [26, 376, 310, 46], s);
}

/* ---- glow: what the sun leaves on the sidewalk: a warm sheen over the wet slabs, a pool of light where
   the umbrella stood, and the two puddles holding the pale sky, a bright rim along their far edge. ---- */
{
    let s = `<defs><radialGradient id="g"><stop offset="0" stop-color="${C.sunPale}" stop-opacity="0.96"/><stop offset="0.42" stop-color="${C.sun}" stop-opacity="0.62"/><stop offset="1" stop-color="${C.sun}" stop-opacity="0"/></radialGradient>`;
    s += `<linearGradient id="w" gradientUnits="userSpaceOnUse" x1="0" y1="326" x2="0" y2="430"><stop offset="0" stop-color="${C.peach}" stop-opacity="0.32"/><stop offset="0.45" stop-color="${C.peach}" stop-opacity="0.5"/><stop offset="1" stop-color="${C.peach}" stop-opacity="0.26"/></linearGradient></defs>`;
    s += rect(-6, 326, 372, 104, 'url(#w)');
    s += ellipse(180, 396, 122, 32, 'url(#g)');
    for (const p of POOLS) {
        s += `<path d="${poolPath(p)}" fill="${C.sunPale}" opacity="0.72"/>`;
        s += `<path d="${poolPath(p, 0.6, -p.r[0] * 0.14, p.r[1] * 0.16)}" fill="${C.peach}" opacity="0.5"/>`;
        s += rim(p, '') + ellipse(p.c[0] + p.r[0] * 0.3, p.c[1] + p.r[1] * 0.36, p.r[0] * 0.16, p.r[1] * 0.14, C.sunPale);
    }
    svg('glow', [-6, 326, 372, 104], s);
}

/* ---- rain: slanted streaks of uneven length, weight and spacing, in three weights. The slant is the
   line the layers travel along while the gift opens. ---- */
const SLANT = [-0.371, 0.928];
function streaks(box, cell, seed, len, skip) {
    const rnd = seeded(seed);
    const [bx, by, bw, bh] = box;
    const runs = ['', '', ''];
    for (let gy = 0; gy * cell[1] < bh; gy += 1) {
        for (let gx = 0; gx * cell[0] < bw + 40; gx += 1) {
            const a = rnd(), b = rnd(), c = rnd(), d = rnd(), e = rnd();
            if (a < skip) continue;
            const L = len[0] + c * c * (len[1] - len[0]);
            const x = bx + (gx + b) * cell[0] + (gy % 2) * cell[0] * 0.5, y = by + (gy + d * 0.9) * cell[1];
            const x2 = x + SLANT[0] * L, y2 = y + SLANT[1] * L;
            // Keep the round ends inside the box.
            if (x2 < bx + 2 || x > bx + bw - 2 || y < by + 2 || y2 > by + bh - 2) continue;
            runs[Math.floor(e * 3)] += `M${f(x)} ${f(y)}L${f(x2)} ${f(y2)}`;
        }
    }
    return runs;
}
{
    const box = [-30, 60, 420, 280];
    const [a, b, c] = streaks(box, [27, 25], 11, [9, 38], 0.16);
    const line = (d, w, o) => `<path d="${d}" stroke="${C.puddle}" stroke-width="${w}" stroke-linecap="round" opacity="${o}" fill="none"/>`;
    svg('rain', box, line(a, 1.1, 0.6) + line(b, 1.5, 0.8) + line(c, 2, 0.95));
}
{
    // The first drops: few, short, nearer.
    const box = [40, 110, 280, 240];
    const [a, b, c] = streaks(box, [58, 52], 5, [9, 20], 0.22);
    const line = (d, w, o) => `<path d="${d}" stroke="${C.sunPale}" stroke-width="${w}" stroke-linecap="round" opacity="${o}" fill="none"/>`;
    svg('drops', box, line(a, 1.8, 0.6) + line(b, 2.2, 0.75) + line(c, 2.6, 0.85));
}

/* ---- shaft: the sun coming through the gap between the banks: a broad fan, wide at the top too, of one
   pale colour thinning to nothing well above the ground. Three fans one inside the other, so that its
   sides are soft; no disc, no edge. ---- */
{
    const top = -6, bottom = 294;
    let s = `<defs><linearGradient id="a" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bottom}"><stop offset="0" stop-color="${C.sunPale}" stop-opacity="0.3"/><stop offset="0.5" stop-color="${C.sunPale}" stop-opacity="0.17"/><stop offset="1" stop-color="${C.sunPale}" stop-opacity="0"/></linearGradient></defs>`;
    for (const [t0, t1, b0, b1] of [[112, 248, 80, 280], [132, 228, 108, 252], [152, 208, 136, 224]]) s += poly([[t0, top], [t1, top], [b1, bottom], [b0, bottom]], 'url(#a)');
    svg('shaft', [80, -6, 200, 300], s);
}

/* ---- the umbrella. It stands on its crook, tip up. Three layers about one axis (x = 180): the rod with
   its crook and ferrule, the furled cloth, the open canopy. ---- */
const AX = 180, FOOT = 392, HUB = 160;
{
    // Rod, ferrule, crook.
    let s = rect(AX - 1.3, HUB, 2.6, 224, C.sunPale);
    s += rect(AX - 1.1, 147, 2.2, 14, C.ink) + rect(AX - 2.2, 156, 4.4, 5, C.ink);
    s += `<path d="M${AX} 372V${FOOT - 10}A8 8 0 0 0 ${AX + 16} ${FOOT - 10}V${FOOT - 15}" stroke="${C.ink}" stroke-width="4.6" stroke-linecap="round" fill="none"/>`;
    svg('handle', [172, 146, 30, 250], s);
}
{
    // The furled cloth: slim at the tip, fullest low down where the strap goes round it, the points of the
    // panels hanging below the strap. Two tones: one hard-edged fold down the lee side, one in the middle.
    const top = 163, strap = 316, end = 348;
    const hw = y => 3 + 13 * Math.pow((y - top) / (strap - top), 0.8);
    let s = `<path d="M${AX - 3} ${top}L${f(AX - hw(strap))} ${strap}L${AX - 15} ${end - 4}L${AX - 9} ${end - 12}L${AX - 5} ${end}L${AX} ${end - 11}L${AX + 5} ${end + 1}L${AX + 9} ${end - 12}L${AX + 15} ${end - 5}L${f(AX + hw(strap))} ${strap}L${AX + 3} ${top}Z" fill="${C.coral}"/>`;
    s += poly([[AX + 1, top], [AX + 3, top], [AX + hw(strap), strap], [AX + 15, end - 5], [AX + 9, end - 12], [AX + 6, strap]], C.coralLo);
    s += poly([[AX - 1.5, top + 8], [AX - 6, strap], [AX - 9, end - 12], [AX - 10.5, strap]], C.coralLo);
    s += rect(AX - hw(strap) - 1, strap - 4, 2 * hw(strap) + 2, 7, C.ink) + circle(AX + 4, strap - 0.5, 2, C.sunPale);
    svg('furled', [162, 160, 36, 236], s);
}
{
    // The open canopy from the side: a dome of seven panels in two tones, a scalloped edge, a rib to each
    // point. The panels narrow toward the two sides, as a round thing does.
    const HALF = 120, EDGE = 250, N = 7;
    const ends = Array.from({ length: N + 1 }, (_, i) => {
        const t = -90 + (i * 180) / N, r = (t * Math.PI) / 180;
        return AX + HALF * (0.62 * Math.sin(r) + 0.38 * (t / 90));
    });
    // A rib from the hub to a point of the edge: it leaves level and comes down steep at the sides.
    const ctrl = x => [x + (AX - x) * 0.06, HUB + 6 + 26 * (1 - Math.abs(x - AX) / HALF)];
    let s = '';
    for (let i = 0; i < N; i += 1) {
        const a = ends[i], b = ends[i + 1], rise = 5 + 9 * ((b - a) / 50);
        s += `<path d="M${AX} ${HUB}Q${pt(ctrl(a))} ${f(a)} ${EDGE}Q${f((a + b) / 2)} ${f(EDGE - rise)} ${f(b)} ${EDGE}Q${pt(ctrl(b))} ${AX} ${HUB}Z" fill="${i % 2 ? C.coralLo : C.coral}"/>`;
    }
    // The points of the ribs, and the cap at the hub.
    for (const x of ends) s += circle(x, EDGE + 0.5, 1.9, C.ink);
    s += poly([[AX - 6, HUB + 5], [AX, HUB - 3], [AX + 6, HUB + 5]], C.ink);
    svg('canopy', [56, 154, 248, 100], s);
}

/* ---- splash: one drop thrown up off the canopy. Six of them: four along the top edge of the dome, one
   at each end of its rim. Each is scattered a short way, so the drops keep off the canopy's face. ---- */
for (const [name, x, y] of [['splash-a', 150, 146], ['splash-b', 210, 146], ['splash-c', 108, 160], ['splash-d', 252, 160], ['splash-e', 44, 250], ['splash-f', 316, 250]]) svg(name, [x - 3, y - 4, 6, 8], `<path d="M${x} ${y - 4}C${x + 3.4} ${y} ${x + 3} ${y + 4} ${x} ${y + 4}C${x - 3} ${y + 4} ${x - 3.4} ${y} ${x} ${y - 4}Z" fill="${C.sunPale}"/>`);

/* ---- cloud: two banks hanging from the top of the frame, meeting in the middle. Each is long flat bands
   laid one over the other, every band with a flat underside and a round end; where a lower band reaches
   out past the one above, its top carries a few large lobes of very different sizes. ---- */
{
    // Left bank; its inner end is on the right. Each outline runs clockwise: top, inner end, underside.
    // The pale band that hangs lowest.
    let a = lobes([-110, 112], [[-20, 108, 0], [22, 110, 2.2], [112, 104, 1.25], [150, 116, 1.7], [150, 138, 1], [-110, 138, 0]], C.puddle, ' opacity="0.55"');
    // The heavy bank: a deep slab to the top of the frame, a shorter band under it.
    a += lobes([-110, -12], [[150, -12, 0], [200, 30, 1.3], [196, 72, 1.05], [-110, 72, 0]], C.deep);
    a += lobes([-110, 60], [[30, 60, 0], [104, 76, 1.5], [104, 102, 1], [-110, 102, 0]], C.deep);
    // A lighter band lying in the slab.
    a += lobes([-110, -12], [[70, -12, 0], [128, 14, 1.35], [124, 38, 1.05], [-110, 38, 0]], C.slate);
    svg('cloud-l', [-110, -12, 340, 176], a);
    // Right bank: heavier and lower; its inner end is on the left. Clockwise: right side, underside, inner end, top.
    let b = lobes([470, 118], [[470, 146, 0], [186, 146, 0], [186, 124, 1], [214, 112, 1.6], [316, 108, 1.2], [352, 118, 2], [470, 118, 0]], C.puddle, ' opacity="0.55"');
    b += lobes([470, -12], [[470, 86, 0], [176, 86, 0], [170, 40, 1.05], [224, -12, 1.3]], C.deep);
    b += lobes([470, 70], [[470, 116, 0], [262, 116, 0], [262, 88, 1], [330, 70, 1.5]], C.deep);
    b += lobes([470, -12], [[470, 48, 0], [246, 48, 0], [242, 22, 1.05], [300, -12, 1.35]], C.slate);
    b += lobes([470, 48], [[470, 68, 0], [352, 68, 0], [352, 48, 1]], C.slate);
    svg('cloud-r', [140, -12, 330, 176], b);
}
