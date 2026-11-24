// Generator for the "shutters" wrapper art: the snowy front of a house at night, seen a little from the
// side (an oblique view: the front is square to us, the gable end and the roof run back to the right).
// Layered paper-cut: every plane is one flat colour with at most one hard-edged shade. No outline,
// no filter, no blend mode. The only gradients are alpha fades of light: the lamp, the window's
// light in the air and on the snow.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/shutters.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'shutters');
if (!OUT.endsWith('wrappers/shutters')) throw new Error('out dir must be public/wrappers/shutters');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: the night and its black, two blues of the wall, two snows, two warm lights, the shutters' red in two tones, the fir. */
const C = {
    night: '#101B33',
    ink: '#0A1122',
    wall: '#2A3F6E',
    wallLo: '#1B2A4E',
    snow: '#F4F7FB',
    snowLo: '#B9CBE6',
    warm: '#FFD27A',
    amber: '#E9953C',
    red: '#C9432F',
    redLo: '#8E2C22',
    fir: '#1E5B49',
};

const f = n => String(Math.round(n * 100) / 100);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(pt).join('L')}Z" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra}/>`;
const stroke = (pts, col, w, extra = '') => `<path d="M${pts.map(pt).join('L')}" fill="none" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round"${extra}/>`;
const stop = (o, c, a) => `<stop offset="${f(o)}" stop-color="${c}" stop-opacity="${f(a)}"/>`;
const radial = (id, stops) => `<radialGradient id="${id}">${stops.map(s => stop(...s)).join('')}</radialGradient>`;
const BOXES = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    BOXES[name] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** A fixed run of numbers in 0..1 from a seed: the art is the same on every run. */
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
/** A smooth line y(x) through points with rising x (a cubic Hermite spline). */
function spline(pts) {
    const n = pts.length;
    const m = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        return (b[1] - a[1]) / (b[0] - a[0]);
    });
    return x => {
        if (x <= pts[0][0]) return pts[0][1];
        if (x >= pts[n - 1][0]) return pts[n - 1][1];
        let i = 0;
        while (pts[i + 1][0] < x) i += 1;
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], h = x1 - x0, t = (x - x0) / h;
        const t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m[i + 1];
    };
}
/** The points of y(x) from x0 to x1, close enough together to read as a curve. */
function along(fn, x0, x1, step = 4) {
    const out = [];
    for (let x = x0; x < x1; x += step) out.push([x, fn(x)]);
    out.push([x1, fn(x1)]);
    return out;
}
/** Snow lying on a ledge from x0 to x1 at height y: a low uneven heap, `h` at its highest, round at both ends. */
function heap(x0, x1, y, h, seed, fill = C.snow, extra = '') {
    const rnd = seeded(seed), a = rnd() * 6, b = rnd() * 6, w = x1 - x0;
    const top = x => {
        const t = (x - x0) / w;
        return y - h * Math.sin(Math.PI * t) ** 0.45 * (0.78 + 0.14 * Math.sin(t * 7 + a) + 0.08 * Math.sin(t * 17 + b));
    };
    return poly([...along(top, x0, x1, 2), [x1, y], [x0, y]], fill, extra);
}
/** An eight-ray glint: four long rays of `k`, four short ones between them. Not a star: no five points, no emblem. */
function glint(x, y, k, fill, extra = '') {
    const pts = [];
    for (let i = 0; i < 16; i += 1) {
        const a = (i * Math.PI) / 8, r = i % 2 === 1 ? k * 0.15 : i % 4 === 0 ? k : k * 0.5;
        pts.push([x + Math.sin(a) * r, y - Math.cos(a) * r]);
    }
    return poly(pts, fill, extra);
}

/* ---- the house, as numbers. The front wall runs from off the left edge to its corner at CX; the eave is at
   EAVE, the ridge at RIDGE; everything that runs back into the picture goes right by 74 and up by 60. ---- */
const CX = 292, EAVE = 100, RIDGE = 40, EDGE = 366;
/** The gable end rises along this line. */
const rake = x => EAVE - ((x - CX) * (EAVE - RIDGE)) / (EDGE - CX);
/** A level line on the gable end falls back at this slope. */
const BACK = -0.42;
/** The big window's opening: what the shutters cover and the room shows through. */
const WIN = [114, 180, 104, 126];
const [WX, WY, WW, WH] = WIN, WMID = WX + WW / 2, LEAF = WW / 2;

/* ---- sky: the night over the ridge, a far bank of cloud, a few small stars ---- */
{
    let s = rect(-6, -6, 372, 60, C.night);
    const bank = spline([[-6, 30], [40, 22], [90, 28], [150, 18], [200, 27], [260, 12], [310, 20], [366, 8]]);
    s += poly([...along(bank, -6, 366), [366, 54], [-6, 54]], C.wallLo, ' opacity="0.7"');
    const rnd = seeded(11);
    for (let i = 0; i < 16; i += 1) s += circle(rnd() * 360, rnd() * 24 - 2, 0.6 + rnd() * 0.7, C.snow, ` opacity="${f(0.4 + rnd() * 0.5)}"`);
    svg('sky', [-6, -6, 372, 60], s);
}

/* ---- house: roof, chimney, gable end, front wall, the small lit windows, the big window's frame ---- */
{
    let s = '';
    // The roof's front slope under snow, in the blue of snow at night; its far (right) part in shade.
    s += poly([[-6, RIDGE], [EDGE, RIDGE], [CX, EAVE], [-6, EAVE]], C.snowLo);
    s += poly([[236, RIDGE], [EDGE, RIDGE], [CX, EAVE], [150, EAVE]], C.wall, ' opacity="0.3"');
    // Two long ledges where the snow has slipped.
    s += heap(8, 132, 71, 5, 3) + heap(92, 214, 86, 4, 4);
    // The ridge: a thick white roll.
    const ridge = x => RIDGE + 4 + 1.6 * Math.sin(x / 19) + 1.1 * Math.sin(x / 7 + 2);
    s += poly([...along(x => ridge(x) - 9 - 1.2 * Math.sin(x / 31 + 1), -6, EDGE), ...along(ridge, -6, EDGE).reverse()], C.snow);
    // The chimney: brick front, its side in the dark, snow on its top and round its foot.
    s += rect(190, 10, 30, 70, C.redLo) + poly([[220, 10], [234, -1], [234, 69], [220, 80]], C.ink);
    s += rect(186, 8, 38, 6, C.red) + poly([[224, 8], [238, -3], [238, 3], [224, 14]], C.ink);
    s += heap(184, 240, 9, 9, 5) + heap(178, 238, 82, 8, 6);
    // The gable end, in shade, with its boards running back.
    s += poly([[CX, EAVE], [EDGE, RIDGE], [EDGE, 380], [CX, 380]], C.wallLo);
    for (let y = 132; y < 380; y += 24) s += stroke([[CX, y], [EDGE, y + (EDGE - CX) * BACK]], C.ink, 1, ' opacity="0.3"');
    // Its two windows, softly lit, seen at a slant.
    const slant = (x0, x1, y, h, fill, extra = '') => poly([[x0, y], [x1, y + (x1 - x0) * BACK], [x1, y + (x1 - x0) * BACK + h], [x0, y + h]], fill, extra);
    s += slant(311, 345, 142, 44, C.snowLo) + slant(314, 342, 144.5, 38, C.amber) + slant(314, 342, 164, 18.5, C.warm, ' opacity="0.55"') + slant(326.8, 329.2, 139.5, 38, C.snowLo);
    s += slant(309, 347, 246, 62, C.snowLo) + slant(312, 344, 248.5, 56, C.amber) + slant(312, 344, 280, 24.5, C.warm, ' opacity="0.55"') + slant(326.8, 329.2, 243, 56, C.snowLo) + slant(312, 344, 268, 2.4, C.snowLo);
    s += slant(307, 349, 189, 4, C.snowLo) + slant(305, 351, 311, 4, C.snowLo);
    // Snow along the rake of the gable.
    s += poly([[CX - 8, EAVE + 8], [CX - 3, EAVE - 6], [EDGE, RIDGE - 7], [EDGE, RIDGE + 8], [CX + 4, EAVE + 9]], C.snow);
    // The front wall and its boards: a broken line here and there, never a ruled sheet.
    s += rect(-6, EAVE, CX + 6, 280, C.wall);
    {
        const rnd = seeded(7);
        for (let y = 134; y < 350; y += 18) {
            let x = -6 + rnd() * 30;
            while (x < CX - 12) {
                const len = 26 + rnd() * 70, x1 = Math.min(CX - 4, x + len);
                s += rect(x, y, x1 - x, 1.2, C.wallLo, ' opacity="0.8"');
                x = x1 + 14 + rnd() * 46;
            }
        }
    }
    // The shade under the eave, and the corner.
    s += rect(-6, EAVE, CX + 6, 17, C.wallLo) + rect(CX - 1.2, EAVE, 1.2, 280, C.ink, ' opacity="0.45"');
    // The eave: a lip of snow hanging over the wall, and a few icicles of no two lengths.
    const lip = x => 108 + 2.6 * Math.sin(x / 23) + 1.8 * Math.sin(x / 9 + 1);
    s += poly([[-6, 93], [CX + 6, 93], ...along(lip, -6, CX + 6).reverse()], C.snow);
    for (const [x, len, w] of [[20, 13, 3.4], [29, 7, 2.6], [128, 9, 3], [146, 15, 3.6], [153, 6, 2.4], [244, 11, 3.2], [270, 6, 2.6]]) s += poly([[x - w / 2, lip(x) - 1], [x + w / 2, lip(x) - 1], [x, lip(x) + len]], C.snow);
    // The upper window, softly lit: two panes, a drawn blind's edge of brighter light, snow on its sill.
    s += rect(40, 122, 54, 44, C.snowLo) + rect(44, 126, 46, 36, C.amber) + rect(44, 146, 46, 16, C.warm, ' opacity="0.55"') + rect(65.7, 126, 2.6, 36, C.snowLo);
    s += rect(36, 166, 62, 4.5, C.snowLo) + heap(37, 97, 166.5, 6, 8);
    // The big window: its frame, the dark glass behind the shutters, its lintel under snow, its sill.
    s += rect(WX - 7, WY - 7, WW + 14, WH + 14, C.snowLo) + rect(WX, WY, WW, WH, C.ink);
    s += rect(WX - 12, WY - 13, WW + 24, 7, C.snowLo) + heap(WX - 13, WX + WW + 13, WY - 12.5, 9, 9);
    s += rect(WX - 14, WY + WH + 5, WW + 28, 7, C.snowLo) + rect(WX - 10, WY + WH + 12, WW + 20, 5, C.wallLo);
    // Snow banked against the foot of the wall.
    const bank = spline([[-6, 350], [60, 344], [120, 349], [190, 352], [250, 345], [CX, 340], [330, 334], [EDGE, 330]]);
    s += poly([...along(bank, -6, EDGE), [EDGE, 380], [-6, 380]], C.snowLo) + poly([...along(bank, -6, EDGE), [EDGE, 380], [-6, 380]], C.wall, ' opacity="0.28"');
    svg('house', [-6, -4, 372, 384], s);
}

/* ---- spill: the window's light in the air round it, once the room is lit ---- */
{
    const R = 112, cx = WMID, cy = WY + WH / 2;
    svg('spill', [cx - R, cy - R, 2 * R, 2 * R], `<defs>${radial('h', [[0, C.warm, 0.5], [0.55, C.warm, 0.24], [1, C.warm, 0]])}</defs>${circle(cx, cy, R, 'url(#h)')}`);
}

/* ---- room: what the window shows. A warm wall, a fir with its baubles, a garland along the top, a lamp, a laid table. ---- */
const TREE = [152, 208];
{
    const [tx, ty] = TREE;
    let s = rect(WX, WY, WW, WH, C.amber) + circle(tx + 6, 238, 54, C.warm, ' opacity="0.6"');
    // The floor.
    s += rect(WX, 290, WW, WH - 110, C.redLo);
    // The hanging lamp, right.
    s += rect(199.3, WY, 1.4, 26, C.ink) + poly([[190, 216], [210, 216], [205, 205], [195, 205]], C.red) + ellipse(200, 216, 10, 2.6, C.snow);
    // The table, right: a white cloth, a candle, a small plant in a pot.
    s += rect(187, 272, 3.5, 22, C.redLo) + rect(210, 272, 3.5, 22, C.redLo) + rect(182, 257, 36, 16, C.snow) + rect(182, 268, 36, 5, C.snowLo);
    s += rect(190.5, 240, 4, 17, C.snow) + rect(188, 255, 9, 2.5, C.ink) + `<path d="M192.5 231C195 235 195.2 237.4 192.5 239.6C189.8 237.4 190 235 192.5 231Z" fill="${C.snow}"/>`;
    s += poly([[202, 248], [214, 248], [212.4, 257], [203.6, 257]], C.redLo) + poly([[208, 232], [210.4, 240], [217, 238], [212, 244.5], [216, 248], [200, 248], [204, 244.5], [199, 239], [205.6, 240.4]], C.fir);
    // The fir: three tiers, the right side in shade.
    const right = [[tx + 15, ty + 28], [tx + 8, ty + 26], [tx + 24, ty + 54], [tx + 14, ty + 52], [tx + 33, ty + 82]];
    const left = [[tx - 14, ty + 27], [tx - 7, ty + 25], [tx - 23, ty + 55], [tx - 13, ty + 52], [tx - 32, ty + 82]];
    s += rect(tx - 3, ty + 80, 6, 10, C.redLo) + poly([[tx, ty], ...right, ...left.reverse()], C.fir) + poly([[tx, ty], ...right, [tx + 4, ty + 82], [tx - 3, ty + 50], [tx + 3, ty + 24]], C.ink, ' opacity="0.24"');
    // Its ribbons: two bands slung across, and the baubles that do not twinkle.
    s += stroke([[tx - 9, ty + 30], [tx - 1, ty + 35], [tx + 10, ty + 34]], C.warm, 1.6) + stroke([[tx - 19, ty + 60], [tx - 4, ty + 67], [tx + 12, ty + 67], [tx + 23, ty + 62]], C.warm, 1.6);
    for (const [dx, dy, col] of [[-4, 20, C.red], [8, 44, C.snow], [-14, 46, C.red], [18, 74, C.red], [-22, 74, C.snow], [-2, 76, C.warm]]) s += circle(tx + dx, ty + dy, 2.5, col);
    // Two parcels at its foot.
    s += rect(122, 282, 17, 13, C.snow) + rect(128.5, 282, 3.5, 13, C.red) + rect(166, 277, 16, 18, C.red) + rect(166, 283.5, 16, 3.5, C.warm);
    // The garland along the top of the window: fir with a rough edge, pinned at three points, with berries.
    const sag = spline([[WX, 181], [140, 191], [166, 183], [192, 193], [WX + WW, 184]]);
    const rnd = seeded(21), up = [], down = [];
    for (let x = WX; x <= WX + WW; x += 3.25) {
        up.push([x, sag(x) - 2.5 - rnd() * 3.5]);
        down.push([x + 1.6, sag(x + 1.6) + 2.5 + rnd() * 4]);
    }
    s += poly([[WX, WY], ...up, [WX + WW, WY], [WX + WW, sag(WX + WW) + 3], ...down.reverse()], C.fir);
    for (const [x, col] of [[128, C.red], [143, C.warm], [166, C.red], [184, C.warm], [198, C.red]]) s += circle(x, sag(x) + 1, 2.2, col);
    svg('room', WIN, s);
}

/* ---- glow: the room's light itself, over the room; it is what blooms and what breathes ---- */
svg('glow', WIN, `<defs>${radial('h', [[0, C.snow, 0.42], [0.4, C.warm, 0.3], [1, C.warm, 0]])}</defs>${circle(WMID, WY + WH / 2 - 4, 84, 'url(#h)')}`);

/* ---- lights: three sets of small lamps on the fir, to twinkle out of step; each lamp a dot in its own faint halo ---- */
{
    const [tx, ty] = TREE;
    const set = (name, col, dots) => {
        const xs = dots.map(d => tx + d[0]), ys = dots.map(d => ty + d[1]), m = 7;
        const box = [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) - Math.min(...xs) + 2 * m, Math.max(...ys) - Math.min(...ys) + 2 * m];
        svg(name, box, `<defs>${radial('h', [[0, C.warm, 0.45], [1, C.warm, 0]])}</defs>` + dots.map(([dx, dy]) => circle(tx + dx, ty + dy, 5.5, 'url(#h)') + circle(tx + dx, ty + dy, 2.1, col)).join(''));
    };
    set('lights-a', C.snow, [[5, 22], [-10, 40], [12, 58], [-18, 66]]);
    set('lights-b', C.warm, [[-3, 12], [14, 46], [-6, 56], [24, 72]]);
    set('lights-c', C.snow, [[-5, 30], [3, 46], [-12, 74], [10, 76]]);
}

/* ---- glint: the light on the tip of the fir, eight rays ---- */
{
    const [tx, ty] = TREE, R = 14;
    svg('glint', [tx - R, ty - R, 2 * R, 2 * R], `<defs>${radial('h', [[0, C.warm, 0.8], [1, C.warm, 0]])}</defs>${circle(tx, ty, R, 'url(#h)')}${glint(tx, ty, 11, C.snow)}`);
}

/* ---- the shutters. Closed: two panelled leaves over the glass, their outer face. Open: the same leaves
   swung right round against the wall, showing their plain inner face of planks and two battens. ---- */
for (const [side, dir] of [['l', -1], ['r', 1]]) {
    // Closed: the leaf between its hinge (the window's outer edge) and the middle.
    const x0 = dir < 0 ? WX : WMID, hinge = dir < 0 ? WX : WX + WW - 13;
    let s = rect(x0, WY, LEAF, WH, C.red);
    s += rect(x0 + 7, WY + 8, LEAF - 14, 34, C.redLo) + rect(x0 + 7, WY + 52, LEAF - 14, WH - 60, C.redLo);
    s += rect(hinge, WY + 20, 13, 4, C.ink, ' rx="2"') + rect(hinge, WY + 100, 13, 4, C.ink, ' rx="2"');
    // The meeting edge.
    s += rect(dir < 0 ? WMID - 1 : WMID, WY, 1, WH, C.ink, ' opacity="0.55"');
    svg(`closed-${side}`, [x0, WY, LEAF, WH], s);
    // Open: the leaf on the wall, outside its hinge.
    const o0 = dir < 0 ? WX - LEAF : WX + WW, edge = dir < 0 ? WX - 13 : WX + WW;
    let o = rect(o0, WY, LEAF, WH, C.redLo);
    for (const k of [1, 2]) o += rect(o0 + (LEAF * k) / 3 - 0.6, WY, 1.2, WH, C.ink, ' opacity="0.4"');
    o += rect(o0, WY + 17, LEAF, 10, C.red) + rect(o0, WY + 97, LEAF, 10, C.red);
    o += rect(edge, WY + 20, 13, 4, C.ink, ' rx="2"') + rect(edge, WY + 100, 13, 4, C.ink, ' rx="2"');
    svg(`open-${side}`, [o0, WY, LEAF, WH], o);
}

/* ---- seam: the light of the room in the crack between the closed leaves, and the latch across it ---- */
{
    const grad = `<linearGradient id="h" gradientUnits="userSpaceOnUse" x1="${WMID - 9}" y1="0" x2="${WMID + 9}" y2="0">${stop(0, C.warm, 0)}${stop(0.5, C.warm, 0.6)}${stop(1, C.warm, 0)}</linearGradient>`;
    let s = `<defs>${grad}</defs>` + rect(WMID - 9, WY, 18, WH, 'url(#h)') + rect(WMID - 1, WY, 2, WH, C.warm);
    s += rect(WMID - 9, WY + 44.5, 18, 3.4, C.ink, ' rx="1.7"');
    svg('seam', [WMID - 9, WY, 18, WH], s);
}

/* ---- sill: the snow lying on the window's sill, in front of the leaves ---- */
svg('sill', [WX - 14, WY + WH - 6, WW + 28, 12], heap(WX - 13, WX + WW + 13, WY + WH + 5.5, 10, 12));

/* ---- the snow on the ground: a far drift and a near one, each with its lit crest and one shade ---- */
{
    const top = spline([[-6, 372], [50, 362], [110, 368], [170, 376], [240, 366], [300, 357], [366, 362]]);
    let s = poly([...along(top, -6, 366), [366, 456], [-6, 456]], C.snowLo);
    s += poly([...along(top, -6, 366), ...along(x => top(x) + 3 + 3 * Math.sin(x / 37 + 1) ** 2, -6, 366).reverse()], C.snow);
    svg('drift-back', [-6, 354, 372, 102], s);
}
{
    const top = spline([[-6, 412], [56, 400], [120, 409], [190, 420], [262, 409], [320, 399], [366, 403]]);
    const low = spline([[-6, 436], [70, 426], [150, 438], [230, 444], [300, 430], [366, 426]]);
    let s = `<defs>${radial('h', [[0, C.warm, 0.5], [1, C.warm, 0]])}</defs>`;
    s += poly([...along(top, -6, 366), [366, 456], [-6, 456]], C.snow);
    s += poly([...along(low, -6, 366), [366, 456], [-6, 456]], C.snowLo);
    // The lamp's light lying on the snow at its foot.
    s += `<ellipse cx="44" cy="424" rx="62" ry="15" fill="url(#h)"/>`;
    // Dry grass standing through the snow, in three unlike tufts.
    const tuft = (x, y, blades) => blades.map(([dx, h]) => `<path d="M${f(x - 0.9)} ${f(y)}Q${f(x + dx * 0.3)} ${f(y - h * 0.6)} ${f(x + dx)} ${f(y - h)}Q${f(x + dx * 0.45)} ${f(y - h * 0.5)} ${f(x + 0.9)} ${f(y)}Z" fill="${C.ink}"/>`).join('');
    s += tuft(108, 440, [[-9, 20], [-2, 27], [6, 17]]) + tuft(206, 446, [[-5, 15], [4, 22], [11, 13], [-12, 10]]) + tuft(283, 436, [[3, 18], [-6, 12]]);
    s += heap(98, 120, 441.5, 3.4, 30) + heap(195, 220, 447.5, 3.4, 31) + heap(274, 292, 437.5, 3, 32);
    svg('drift-front', [-6, 392, 372, 64], s);
}

/* ---- wedge: the window's light fallen on the snow, widest and faintest toward us ---- */
{
    const y0 = 352, y1 = 456;
    const grad = (id, a) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">${stop(0, C.warm, a)}${stop(0.6, C.warm, a * 0.45)}${stop(1, C.warm, 0)}</linearGradient>`;
    let s = `<defs>${grad('a', 0.5)}${grad('b', 0.4)}</defs>`;
    s += poly([[WX - 4, y0], [WX + WW + 4, y0], [300, y1], [4, y1]], 'url(#a)');
    s += poly([[WX + 18, y0], [WX + WW - 18, y0], [240, y1], [52, y1]], 'url(#b)');
    svg('wedge', [4, y0, 296, y1 - y0], s);
}

/* ---- the lamp on its post, left, and its light in the air ---- */
const LAMP = [41, 246];
{
    const [x, y] = LAMP, R = 66;
    svg('lamp-halo', [x - R, y - R, 2 * R, 2 * R], `<defs>${radial('h', [[0, C.warm, 0.62], [0.35, C.warm, 0.28], [1, C.warm, 0]])}</defs>${circle(x, y, R, 'url(#h)')}`);
    let s = rect(x - 2, 262, 4, 172, C.ink) + rect(x - 4.5, 298, 9, 4, C.ink) + poly([[x - 7, 436], [x + 7, 436], [x + 3.5, 416], [x - 3.5, 416]], C.ink);
    // The lantern: lit glass in a dark frame under a small roof with snow on it.
    s += poly([[x - 12, 232], [x + 12, 232], [x + 7, 260], [x - 7, 260]], C.warm) + ellipse(x, 246, 3.6, 8, C.snow);
    s += poly([[x - 13.5, 232], [x - 11, 232], [x - 6, 260], [x - 8.5, 260]], C.ink) + poly([[x + 13.5, 232], [x + 11, 232], [x + 6, 260], [x + 8.5, 260]], C.ink);
    s += rect(x - 9, 259, 18, 4.5, C.ink, ' rx="1.5"') + poly([[x - 17, 233], [x + 17, 233], [x + 8, 222], [x - 8, 222]], C.ink) + rect(x - 1.6, 215, 3.2, 8, C.ink);
    s += heap(x - 15, x + 15, 228.5, 8.5, 14) + heap(x - 15, x + 17, 437.5, 6, 15);
    svg('lamp', [x - 18, 212, 37, 226], s);
}

/* ---- branches: a bare tree at the right edge, nearer than the house, snow lying along its boughs ---- */
{
    const rnd = seeded(41), wood = [], white = [], xs = [], ys = [];
    const grow = (x, y, ang, len, w, depth) => {
        const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len, w1 = w * 0.7;
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        wood.push(poly([[x + (nx * w) / 2, y + (ny * w) / 2], [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2], [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2], [x - (nx * w) / 2, y - (ny * w) / 2]], C.ink) + circle(x1, y1, w1 / 2, C.ink));
        xs.push(x, x1);
        ys.push(y, y1);
        // Snow lies on a bough that runs more level than upright.
        if (Math.abs(Math.sin(ang)) < 0.72 && w > 1.6) white.push(stroke([[x + Math.cos(ang) * len * 0.12, y + Math.sin(ang) * len * 0.12 - w * 0.5], [x1 - Math.cos(ang) * len * 0.1, y1 - Math.sin(ang) * len * 0.1 - w1 * 0.55]], C.snow, Math.max(1.3, w * 0.5)));
        if (depth === 0) return;
        // Every fork leans away from the edge: the tree reaches left, over the roof. No bough crosses the
        // big window or its open leaves: one that would is turned upward until it clears them.
        const lean = (-2.3 - ang) * 0.22;
        const child = (a, l, cw) => {
            const hits = t => {
                const hx = x1 + Math.cos(a) * l * t, hy = y1 + Math.sin(a) * l * t;
                return hx < 290 && hy > 150;
            };
            for (let i = 0; i < 14 && (hits(1) || hits(0.6)); i += 1) {
                a += a < -Math.PI / 2 ? 0.16 : -0.16;
                l *= 0.96;
            }
            grow(x1, y1, a, l, cw, depth - 1);
        };
        child(ang + lean - 0.34 - rnd() * 0.3, len * (0.66 + rnd() * 0.16), w1);
        child(ang + lean + 0.3 + rnd() * 0.3, len * (0.6 + rnd() * 0.16), w1 * 0.9);
    };
    grow(354, 452, -1.6, 150, 15, 5);
    const pad = 6, x0 = Math.max(-6, Math.min(...xs) - pad), y0 = Math.max(-6, Math.min(...ys) - pad);
    const box = [Math.floor(x0), Math.floor(y0), Math.ceil(366 - Math.floor(x0)), Math.ceil(456 - Math.floor(y0))];
    svg('branches', box, wood.join('') + white.join('') + heap(326, 366, 451, 12, 44));
}

/* ---- snow in the air: two layers of flakes of unlike size, to shimmer against each other ---- */
for (const [name, seed, box, n] of [['snow-a', 61, [0, 0, 360, 250], 34], ['snow-b', 62, [0, 70, 360, 300], 30]]) {
    const rnd = seeded(seed);
    let s = '';
    for (let i = 0; i < n; i += 1) {
        const x = box[0] + 4 + rnd() * (box[2] - 8), y = box[1] + 4 + rnd() * (box[3] - 8), r = 0.9 + rnd() ** 2 * 1.9;
        // Keep the glass clear: the room is what is looked at.
        if (x > WX - 4 && x < WX + WW + 4 && y > WY - 4 && y < WY + WH + 4) continue;
        s += circle(x, y, r, C.snow, ` opacity="${f(0.55 + rnd() * 0.45)}"`);
    }
    svg(name, box, s);
}

/* ---- fleck: a clot of snow, knocked off the sill when the leaves strike the wall ---- */
svg('fleck', [WMID - 4, WY + WH, 8, 8], circle(WMID, WY + WH + 4, 3.2, C.snow));

console.log(JSON.stringify(BOXES));
