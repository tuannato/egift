// Generator for the "beacon" wrapper art: a striped lighthouse on a black headland over a stormy
// sea at nightfall, in bold flat shapes. Curling crests in three depths, flat bars of cloud, no
// outline, no filter, no blend mode. The only gradients are alpha fades of one colour: the halo
// round the lamp and the beam, which thins to nothing along its length.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/beacon.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'beacon');
if (!OUT.endsWith('wrappers/beacon')) throw new Error('out dir must be public/wrappers/beacon');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two skies and a cloud, three sea blues, the tower's white and vermilion, the lamp, the rock. */
const C = {
    night: '#0B1630',
    dusk: '#1C2E5E',
    cloud: '#2E4274',
    seaFar: '#3C73A8',
    seaMid: '#245189',
    seaNear: '#15335F',
    foam: '#F4EDDE',
    red: '#DA432C',
    lamp: '#FFD05C',
    rock: '#070A11',
};

const f = n => String(Math.round(n * 100) / 100);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const curve = (a, b, c) => `C${pt(a)} ${pt(b)} ${pt(c)}`;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(pt).join('L')}Z" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const bar = (x, y, w, h, fill, extra = '') => rect(x, y, w, h, fill, ` rx="${f(h / 2)}"${extra}`);
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** The second part of a cubic cut at `t` (de Casteljau): the same curve from there on. */
function tail(p, t) {
    const mix = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const a = mix(p[0], p[1]), b = mix(p[1], p[2]), c = mix(p[2], p[3]);
    const d = mix(a, b), e = mix(b, c);
    return [mix(d, e), e, c, p[3]];
}

/**
 * A row of curling waves from x0 along the line y. Each wave climbs slowly from its trough to a
 * peak, throws a lip forward, hollows under it and drops to the next trough. `units` gives each
 * wave's [width, height]. The row is filled down to `bottom`; each crest carries a cap of foam
 * that follows the outline exactly, and each back one sliver of light.
 */
function waves(x0, y, units, bottom, fill, light, o = {}) {
    let d = `M${f(x0)} ${f(y)}`, caps = '', slivers = '', x = x0;
    for (const [W, H] of units) {
        const P = (u, v) => [x + u * W, y - v * H];
        const rise = [P(0, 0), P(0.3, 0), P(0.5, 0.55), P(0.7, 1)];
        const lip = [P(0.8, 1.03), P(0.91, 0.86), P(0.92, 0.6)];
        const under = [P(0.87, 0.74), P(0.8, 0.76), P(0.76, 0.58)];
        const face = [P(0.74, 0.28), P(0.86, 0.04), P(1, 0)];
        d += curve(rise[1], rise[2], rise[3]) + curve(...lip) + curve(...under) + curve(...face);
        const r = tail(rise, 0.5);
        caps += `<path d="M${pt(r[0])}${curve(r[1], r[2], r[3])}${curve(...lip)}${curve(...under)}${curve(P(0.71, 0.72), P(0.62, 0.62), r[0])}Z" fill="${C.foam}"${o.capExtra ?? ''}/>`;
        // The sliver: a long thin leaf lying along the back of the wave.
        slivers += `<path d="M${pt(P(0.1, -0.34))}C${pt(P(0.3, -0.3))} ${pt(P(0.46, -0.02))} ${pt(P(0.6, 0.36))}C${pt(P(0.5, -0.1))} ${pt(P(0.34, -0.5))} ${pt(P(0.1, -0.34))}Z" fill="${light}"${o.lightExtra ?? ''}/>`;
        x += W;
    }
    return `<path d="${d}L${f(x)} ${bottom}L${f(x0)} ${bottom}Z" fill="${fill}"${o.fillExtra ?? ''}/>` + slivers + caps;
}
/** Wave sizes for a row: a base size turned by a fixed run of factors, so no two neighbours match. */
const run = (W, H, n, shift = 0) => Array.from({ length: n }, (_, i) => {
    const k = [1, 0.82, 1.16, 0.9, 1.08, 0.78, 1.22][(i + shift) % 7];
    return [W * k, H * (0.72 + 0.4 * k)];
});

/* ---- sky: night above, dusk below in two steps, the last of the day along the horizon, a far shore, a thin moon ---- */
{
    let s = rect(-6, -6, 372, 250, C.night);
    s += rect(-6, 150, 372, 94, C.dusk, ' opacity="0.5"') + rect(-6, 176, 372, 68, C.dusk);
    s += rect(-6, 204, 372, 40, C.seaFar, ' opacity="0.3"') + rect(-6, 218, 372, 26, C.red, ' opacity="0.34"');
    // The far shore, right: two flat hills.
    s += poly([[228, 244], [250, 228], [276, 221], [300, 225], [322, 214], [346, 210], [366, 216], [366, 244]], C.cloud);
    s += poly([[300, 244], [322, 214], [346, 210], [366, 216], [366, 244]], C.dusk, ' opacity="0.6"');
    // The moon: a thin crescent, faint.
    s += `<path d="M300 44A19 19 0 1 0 312 78A15.5 15.5 0 1 1 300 44Z" fill="${C.foam}" opacity="0.62"/>`;
    svg('sky', [-6, -6, 372, 250], s);
}

/* ---- stars: come out where the cloud parts ---- */
{
    const stars = [[150, 22, 1.6], [176, 58, 1.1], [196, 30, 1.9], [214, 84, 1.2], [232, 46, 1.4], [246, 14, 1.1], [262, 70, 1.7], [282, 104, 1.1], [330, 30, 1.5], [340, 96, 1.2], [226, 122, 1.3], [188, 104, 1], [60, 18, 1.2], [36, 60, 1.5], [318, 134, 1], [270, 146, 1.3], [206, 152, 1], [84, 44, 1]];
    let s = '';
    for (const [x, y, r] of stars) s += circle(x, y, r, C.foam);
    // Two bright ones: a fine four-pointed glint each.
    for (const [x, y, k] of [[236, 92, 7], [170, 40, 5]]) s += poly([[x, y - k], [x + k * 0.22, y - k * 0.22], [x + k, y], [x + k * 0.22, y + k * 0.22], [x, y + k], [x - k * 0.22, y + k * 0.22], [x - k, y], [x - k * 0.22, y - k * 0.22]], C.foam);
    svg('stars', [20, 4, 330, 164], s);
}

/* ---- cloud: heavy flat bars, in two layers that part. Each bank is a lit top over a darker belly. ---- */
{
    const bank = (bars, fill, extra = '') => bars.map(([x, y, w, h]) => bar(x, y, w, h, fill, extra)).join('');
    // Left bank: reaches past the middle while the sky is shut.
    let a = bank([[-50, 62, 290, 26], [-10, 92, 190, 20], [96, 108, 130, 14]], C.dusk);
    a += bank([[-66, 14, 190, 30], [-30, 36, 262, 32], [-66, 60, 214, 22], [150, 22, 70, 20]], C.cloud);
    a += bank([[-20, 44, 150, 5], [60, 26, 60, 4]], C.foam, ' opacity="0.14"');
    svg('cloud-a', [-70, 10, 334, 116], a);
    // Right bank: lower, heavier to the right.
    let b = bank([[168, 96, 250, 24], [236, 122, 190, 18], [150, 124, 70, 12]], C.dusk);
    b += bank([[214, 4, 216, 24], [196, 78, 230, 28], [262, 100, 170, 22], [150, 66, 120, 20]], C.cloud);
    b += bank([[230, 86, 130, 5]], C.foam, ' opacity="0.14"');
    svg('cloud-b', [146, 0, 290, 144], b);
}

/* ---- the sea: three rows of curling waves, far to near, each wider than the frame so that it can sway ---- */
svg('wave-c', [-70, 214, 500, 92], waves(-70, 248, run(64, 20, 9, 2), 306, C.seaFar, C.foam, { lightExtra: ' opacity="0.3"' }));
svg('wave-b', [-70, 240, 500, 122], waves(-84, 290, run(92, 32, 7, 4), 362, C.seaMid, C.seaFar, { lightExtra: ' opacity="0.75"' }));
{
    // The near row, and in front of it a darker one, so that the foot of the frame is water with a shape to it.
    let s = waves(-152, 352, run(132, 44, 6, 0), 456, C.seaNear, C.seaMid);
    s += waves(-140, 428, run(168, 40, 4, 3), 456, C.rock, C.seaMid, { fillExtra: ' fill-opacity="0.42"', lightExtra: ' opacity="0.6"' });
    svg('wave-a', [-70, 296, 500, 160], s);
}

/* ---- the headland: black rock in flat facets, climbing to a shoulder on the left ---- */
{
    let s = poly([[-6, 256], [16, 246], [40, 262], [58, 282], [84, 296], [172, 298], [198, 310], [220, 330], [244, 350], [262, 384], [-6, 384]], C.rock);
    // Facets that catch a little of the sky.
    s += poly([[16, 246], [40, 262], [58, 282], [30, 290], [8, 270]], C.dusk, ' opacity="0.55"');
    s += poly([[172, 298], [198, 310], [220, 330], [196, 334], [176, 316]], C.dusk, ' opacity="0.55"');
    s += poly([[84, 296], [110, 320], [70, 336], [44, 312]], C.dusk, ' opacity="0.28"');
    svg('rock', [-6, 244, 270, 140], s);
}

/* ---- the tower: a tall taper in white with three vermilion bands, a gallery, a dark lantern room, a red cap ---- */
const TX = 128, BASE = 300, TOP = 152, LAMP = [128, 132];
{
    // Half-width of the taper at height y.
    const hw = y => 19 + (11 * (y - TOP)) / (BASE - TOP);
    const slice = (y0, y1, fill, extra = '') => poly([[TX - hw(y0), y0], [TX + hw(y0), y0], [TX + hw(y1), y1], [TX - hw(y1), y1]], fill, extra);
    let s = slice(TOP, BASE, C.foam);
    for (const [y0, y1] of [[168, 194], [220, 246], [272, 300]]) s += slice(y0, y1, C.red);
    // One flat shade down the lee side.
    s += poly([[TX + 5, TOP], [TX + hw(TOP), TOP], [TX + hw(BASE), BASE], [TX + 8, BASE]], C.rock, ' opacity="0.24"');
    // Two windows and a door.
    s += bar(TX - 9, 202, 6, 12, C.rock) + bar(TX + 1, 254, 6, 12, C.rock);
    s += `<path d="M${TX - 7} ${BASE}V287A7 7 0 0 1 ${TX + 7} 287V${BASE}Z" fill="${C.rock}"/>`;
    // The foot.
    s += rect(TX - 35, BASE - 2, 70, 7, C.rock);
    // The gallery: a slab on two brackets, a rail above it.
    s += poly([[TX - 19, TOP + 10], [TX - 27, TOP], [TX + 27, TOP], [TX + 19, TOP + 10]], C.rock);
    s += rect(TX - 29, TOP - 5, 58, 6, C.rock) + rect(TX - 29, TOP - 15, 58, 2, C.rock) + rect(TX - 29, TOP - 15, 2, 12, C.rock) + rect(TX + 27, TOP - 15, 2, 12, C.rock);
    // The lantern room, unlit: dark glass in a black frame.
    s += rect(TX - 15, 116, 30, 32, C.rock) + rect(TX - 12, 119, 11, 27, C.seaNear) + rect(TX + 1, 119, 11, 27, C.seaNear);
    // The cap and its ball.
    s += `<path d="M${TX - 20} 116C${TX - 16} 104 ${TX - 6} 100 ${TX} 98C${TX + 6} 100 ${TX + 16} 104 ${TX + 20} 116Z" fill="${C.red}"/>`;
    s += `<path d="M${TX + 4} 100C${TX + 12} 103 ${TX + 17} 108 ${TX + 20} 116H${TX + 6}Z" fill="${C.rock}" opacity="0.24"/>`;
    s += rect(TX - 1.2, 90, 2.4, 9, C.rock) + circle(TX, 91, 3, C.rock);
    svg('tower', [90, 86, 76, 222], s);
}

/* ---- lamp: the lantern room lit ---- */
svg('lamp', [112, 116, 32, 32], rect(TX - 12, 119, 11, 27, C.lamp) + rect(TX + 1, 119, 11, 27, C.lamp) + circle(LAMP[0], LAMP[1], 6.5, C.foam));

/* ---- halo: the lamp's light in the air, one colour fading out ---- */
{
    const R = 108;
    svg('halo', [LAMP[0] - R, LAMP[1] - R, 2 * R, 2 * R], `<defs><radialGradient id="h"><stop offset="0" stop-color="${C.lamp}" stop-opacity="0.6"/><stop offset="0.3" stop-color="${C.lamp}" stop-opacity="0.26"/><stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/></radialGradient></defs>${circle(LAMP[0], LAMP[1], R, 'url(#h)')}`);
}

/* ---- beam: a long narrow wedge from the lamp at lantern height; its light thins to nothing along its
   length. Two of them, one to the left and its mirror to the right: the lamp turning is the left one
   shortening to nothing and the right one growing out. Plus the flare of the lamp as it faces us. ---- */
{
    const [x, y] = LAMP, L = 300, half = 36;
    for (const [name, dir] of [['beam-l', -1], ['beam-r', 1]]) {
        const grad = (id, a) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x}" y1="0" x2="${x + dir * L}" y2="0"><stop offset="0" stop-color="${C.lamp}" stop-opacity="${a}"/><stop offset="0.7" stop-color="${C.lamp}" stop-opacity="${f(a * 0.42)}"/><stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/></linearGradient>`;
        let s = `<defs>${grad('a', 0.42)}${grad('b', 0.4)}</defs>`;
        s += poly([[x, y - 4], [x + dir * L, y - half], [x + dir * L, y + half], [x, y + 4]], 'url(#a)');
        s += poly([[x, y - 2], [x + dir * L, y - half * 0.4], [x + dir * L, y + half * 0.4], [x, y + 2]], 'url(#b)');
        svg(name, [dir < 0 ? x - L : x, y - half, L, 2 * half], s);
    }
    const R = 42;
    svg('flare', [x - R, y - R, 2 * R, 2 * R], `<defs><radialGradient id="h"><stop offset="0" stop-color="${C.foam}" stop-opacity="0.95"/><stop offset="0.28" stop-color="${C.lamp}" stop-opacity="0.8"/><stop offset="0.6" stop-color="${C.lamp}" stop-opacity="0.28"/><stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/></radialGradient></defs>${circle(x, y, R, 'url(#h)')}`);
}

/* ---- the boat: a small working boat in silhouette, far right ---- */
const BOAT = [310, 254];
{
    const [x, y] = BOAT, k = 1.25;
    const B = (u, v) => [x + u * k, y + v * k];
    let s = `<path d="M${pt(B(-23, -2))}L${pt(B(25, -6))}C${pt(B(22, 3))} ${pt(B(17, 8))} ${pt(B(12, 9))}H${f(x - 15 * k)}C${pt(B(-19, 6))} ${pt(B(-22, 2))} ${pt(B(-23, -2))}Z" fill="${C.rock}"/>`;
    s += poly([B(-22, -1.4), B(24.4, -5.2), B(23.4, -2.4), B(-21, 1.4)], C.red);
    // Wheelhouse, mast, a stay to the bow.
    s += rect(x - 12 * k, y - 14 * k, 15 * k, 13 * k, C.rock) + rect(x - 14 * k, y - 16 * k, 19 * k, 3 * k, C.rock);
    s += rect(x + 5 * k, y - 34 * k, 2 * k, 31 * k, C.rock) + poly([B(6.4, -31), B(23, -6), B(21.6, -5.6), B(5.6, -30)], C.rock);
    svg('boat', [x - 32, y - 46, 68, 60], s);
    // Its own lamp, at the masthead, and the wheelhouse window lit.
    const [lx, ly] = B(6, -35);
    let l = `<defs><radialGradient id="h"><stop offset="0" stop-color="${C.lamp}" stop-opacity="0.7"/><stop offset="0.35" stop-color="${C.lamp}" stop-opacity="0.3"/><stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/></radialGradient></defs>`;
    l += circle(lx, ly, 20, 'url(#h)') + circle(lx, ly, 3.6, C.lamp) + circle(lx, ly, 1.7, C.foam) + rect(x - 9 * k, y - 11 * k, 6 * k, 5 * k, C.lamp);
    svg('boat-lamp', [x - 14, y - 66, 44, 60], l);
}

/* ---- glitter: the lit road on the water under the boat: a few long strokes of the lamp's colour, one
   above the other, each longer and heavier than the last as the road comes toward the viewer. ---- */
{
    let s = '';
    [[274, 16, 2.6], [289, 28, 3], [308, 40, 3.4], [331, 54, 3.9], [359, 68, 4.4]].forEach(([y, w, h], i) => {
        const mid = 305 - 9 * i;
        s += bar(mid - w / 2, y, w, h, C.lamp);
    });
    svg('glitter', [230, 270, 88, 98], s);
}

/* ---- surf: the near sea breaking on the rock: one tall wave of the same kind as the rest, stood up
   against the headland, its lip thrown over to the right, and the drops that leave it. ---- */
{
    let s = waves(158, 356, [[108, 98]], 380, C.seaNear, C.seaMid);
    s += circle(250, 262, 2.6, C.foam) + circle(264, 274, 1.6, C.foam) + circle(270, 292, 2.2, C.foam) + circle(232, 252, 1.5, C.foam) + circle(276, 312, 1.4, C.foam);
    svg('surf', [154, 246, 126, 134], s);
}

/* ---- spark: what flies from the lantern as it lights ---- */
svg('spark', [LAMP[0] - 2, LAMP[1] - 2, 4, 4], poly([[LAMP[0], LAMP[1] - 2], [LAMP[0] + 2, LAMP[1]], [LAMP[0], LAMP[1] + 2], [LAMP[0] - 2, LAMP[1]]], C.lamp));
