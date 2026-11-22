// Generator for the "stars" wrapper art: the night sky seen through the open slit of an observatory
// dome. Two dark curved shutters frame a tall opening; a brass telescope rises from the lower left;
// a parapet, a handrail and a small lamp close the bottom. In the slit: two layers of small stars, a
// band of haze, and eight brighter stars that the opening joins into an abstract faceted figure.
// Flat shapes, two or three tones to a surface, no filter, no blend mode, no letter and no digit.
// Light (halos, the haze, the lamp) is a plain gradient with alpha stops. Every colour is in `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/stars.gen.mjs   (prints every layer box, for the definition)
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'stars');
if (!OUT.endsWith('wrappers/stars')) throw new Error('out dir must be public/wrappers/stars');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two indigos for the sky, a violet for its haze, star white, the blue of the links,
   gold and two brasses, and two near-blacks for the dome. */
const C = {
    night: '#0B1030',
    dusk: '#1B1446',
    violet: '#7E6BE8',
    white: '#F4F1FF',
    link: '#9DB4FF',
    gold: '#FFD98A',
    brass: '#C08A3E',
    brassLo: '#7A5524',
    deep: '#060818',
    dome: '#121A40',
};

const f = n => String(Math.round(n * 100) / 100);
const P = pts => pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');
const poly = (pts, fill, extra = '') => `<path d="M${P(pts)}Z" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const stroke = (pts, col, w, extra = '') => `<path d="M${P(pts)}" fill="none" stroke="${col}" stroke-width="${w}"${extra}/>`;
const stop = (o, c, a) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`;
const boxes = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box.map(v => Math.round(v * 100) / 100);
    boxes[name] = [x, y, w, h];
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** A closed smooth curve through the points (Catmull-Rom as cubics). */
const smooth = pts => {
    const n = pts.length;
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
        const [p0, p1, p2, p3] = [pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
        d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + 'Z';
};
/** A seeded generator (mulberry32): the same stars every run. */
const seeded = seed => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let z = a;
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
};

/* ---- the figure: eight stars, nine links. A leaning cut stone seen from the side: a broad crown, a
   three-link girdle, a long point below. Asymmetric on purpose; it is no known constellation. The definition
   (src/wrappers/stars.ts) holds the same two tables. ---- */
const V = { A: [148, 78], B: [222, 62], C: [256, 124], D: [206, 246], E: [138, 200], F: [110, 132], G: [162, 142], H: [214, 114] };
const LINKS = ['DE', 'EF', 'FG', 'GH', 'HC', 'CD', 'FA', 'AB', 'BC'];
/** Where the glow sits: the heart of the figure. */
const HEART = [194, 168];

/* ---- the slit: the inner edge of the left shutter, closed. The right one is its mirror. ---- */
const edge = y => 62 + 58 * ((460 - y) / 470) ** 2;

/* ---- sky: the gradient, and the haze as large lobed masses along a diagonal ---- */
{
    let s = `<defs><linearGradient id="n" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="420">${stop(0, C.night, 1)}${stop(1, C.dusk, 1)}</linearGradient>`;
    s += `<linearGradient id="h" gradientUnits="userSpaceOnUse" x1="60" y1="340" x2="310" y2="10">${stop(0, C.violet, 0.22)}${stop(0.5, C.link, 0.2)}${stop(1, C.violet, 0.1)}</linearGradient></defs>`;
    s += `<rect x="-6" y="-6" width="372" height="462" fill="url(#n)"/>`;
    // The band runs from the lower left to the upper right, behind the figure. Points: along its axis, then back.
    const axis = t => [40 + 290 * t, 372 - 400 * t];
    const nrm = [0.81, 0.587];
    const band = (widths, k) => {
        const n = widths.length;
        const up = widths.map(([a], i) => { const [x, y] = axis(-0.12 + (1.3 * i) / (n - 1)); return [x - nrm[0] * a * k, y - nrm[1] * a * k]; });
        const down = widths.map(([, b], i) => { const [x, y] = axis(-0.12 + (1.3 * i) / (n - 1)); return [x + nrm[0] * b * k, y + nrm[1] * b * k]; }).reverse();
        return smooth([...up, ...down]);
    };
    const W = [[40, 30], [66, 44], [38, 62], [58, 36], [84, 50], [46, 74], [62, 40], [36, 56], [52, 30]];
    s += `<path d="${band(W, 1)}" fill="url(#h)"/>`;
    s += `<path d="${band(W.map(([a, b], i) => [a * (i % 2 ? 0.7 : 0.4), b * (i % 2 ? 0.35 : 0.75)]), 1)}" fill="${C.link}" opacity="0.1"/>`;
    s += `<path d="${band(W.map(([a, b], i) => [a * (i % 3 ? 0.12 : 0.34), b * (i % 3 ? 0.3 : 0.1)]), 1)}" fill="${C.white}" opacity="0.07"/>`;
    // A dark rift along the band, as the real thing has.
    s += `<path d="${band([[-6, 12], [-10, 20], [2, 6], [-14, 22], [-4, 12], [-12, 18], [0, 6]], 1)}" fill="${C.night}" opacity="0.3"/>`;
    svg('sky', [-6, -6, 372, 462], s);
}

/* ---- small stars: two layers, so that they can twinkle out of step. Denser along the haze. ---- */
{
    const near = ([x, y], d) => Object.values(V).some(([vx, vy]) => Math.hypot(vx - x, vy - y) < d);
    const layer = (name, seed, count) => {
        const rnd = seeded(seed);
        let s = '';
        let made = 0;
        while (made < count) {
            let x, y;
            if (rnd() < 0.45) {
                // In the band.
                const t = rnd();
                const off = (rnd() + rnd() - 1) * 60;
                x = 40 + 290 * t + 0.81 * off;
                y = 372 - 400 * t + 0.587 * off;
            } else {
                x = 26 + rnd() * 308;
                y = rnd() * 392;
            }
            const size = rnd();
            const tone = rnd();
            const a = 0.45 + rnd() * 0.5;
            if (x < 26 || x > 334 || y < 0 || y > 392 || near([x, y], 12)) continue;
            const r = size < 0.7 ? 0.55 + size * 0.5 : size < 0.95 ? 1 + (size - 0.7) * 1.6 : 1.6;
            s += circle(x, y, r, tone < 0.72 ? C.white : tone < 0.9 ? C.link : C.gold, ` opacity="${f(a)}"`);
            made += 1;
        }
        svg(name, [24, -2, 312, 396], s);
    };
    layer('small-a', 11, 96);
    layer('small-b', 29, 84);
}

/* ---- the facets: three faces of the figure carry a faint tint, the rest stay sky ---- */
{
    const xs = Object.values(V).map(p => p[0]), ys = Object.values(V).map(p => p[1]);
    const box = [Math.min(...xs) - 2, Math.min(...ys) - 2, Math.max(...xs) - Math.min(...xs) + 4, Math.max(...ys) - Math.min(...ys) + 4];
    let s = `<defs><linearGradient id="f" gradientUnits="userSpaceOnUse" x1="${V.F[0]}" y1="${V.A[1]}" x2="${V.C[0]}" y2="${V.D[1]}">${stop(0, C.link, 1)}${stop(0.55, C.violet, 1)}${stop(1, C.gold, 1)}</linearGradient></defs>`;
    const face = (names, a) => poly([...names].map(k => V[k]), 'url(#f)', ` opacity="${a}"`);
    s += face('ABH', 0.15) + face('GDE', 0.11) + face('HCD', 0.14);
    svg('fill', box, s);
}

/* ---- the glow at the heart: one plain soft round light ---- */
{
    const [x, y] = HEART;
    const R = 92;
    let s = `<defs><radialGradient id="g">${stop(0, C.white, 0.85)}${stop(0.08, C.white, 0.6)}${stop(0.22, C.gold, 0.4)}${stop(0.5, C.link, 0.2)}${stop(1, C.link, 0)}</radialGradient></defs>`;
    s += circle(x, y, R, 'url(#g)');
    svg('glow', [x - R, y - R, 2 * R, 2 * R], s);
}

/* ---- the links: each drawn level from its first star, to be turned into place by the stage and
   scaled from nothing along its length. A small bright dot rides its far end. ---- */
LINKS.forEach((name, i) => {
    const [a, b] = [V[name[0]], V[name[1]]];
    const len = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 100) / 100;
    const [x, y] = a;
    const s = stroke([[x, y], [x + len, y]], C.link, 3.6, ' opacity="0.22" stroke-linecap="round"') + stroke([[x, y], [x + len, y]], C.link, 1.3, ' stroke-linecap="round"') + circle(x + len, y, 1.9, C.white);
    svg(`link-${i + 1}`, [x - 3, y - 3, len + 6, 6], s);
});

/* ---- the eight bright stars, in two layers: the four the links reach first, and the other four ---- */
{
    const SIZE = { A: 3.3, B: 3.8, C: 3.2, D: 4, E: 3, F: 3.6, G: 2.8, H: 3.1 };
    const WARM = { B: true, D: true };
    const layer = (name, keys) => {
        const pts = [...keys].map(k => V[k]);
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const pad = 19;
        const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];
        let s = `<defs><radialGradient id="c">${stop(0, C.white, 0.75)}${stop(0.3, C.link, 0.38)}${stop(1, C.link, 0)}</radialGradient><radialGradient id="w">${stop(0, C.white, 0.75)}${stop(0.3, C.gold, 0.38)}${stop(1, C.gold, 0)}</radialGradient></defs>`;
        for (const k of keys) {
            const [x, y] = V[k];
            const r = SIZE[k];
            s += circle(x, y, r * 4.6, WARM[k] ? 'url(#w)' : 'url(#c)');
            // Two fine spikes, the long one level.
            s += poly([[x - r * 3.4, y], [x, y - 0.7], [x + r * 3.4, y], [x, y + 0.7]], C.white, ' opacity="0.7"') + poly([[x, y - r * 2.4], [x + 0.7, y], [x, y + r * 2.4], [x - 0.7, y]], C.white, ' opacity="0.7"');
            s += circle(x, y, r, WARM[k] ? C.gold : C.white) + (WARM[k] ? circle(x, y, r * 0.55, C.white) : '');
        }
        svg(name, box, s);
    };
    layer('bright-a', 'DEFG');
    layer('bright-b', 'HCAB');
}

/* ---- the shooting star: a streak thinning to nothing behind its head, drawn where it ends ---- */
{
    const head = [112, 318];
    const d = [-0.875, 0.484];
    const L = 78;
    const tail = [head[0] - d[0] * L, head[1] - d[1] * L];
    const n = [-d[1], d[0]];
    let s = `<defs><linearGradient id="s" gradientUnits="userSpaceOnUse" x1="${f(tail[0])}" y1="${f(tail[1])}" x2="${f(head[0])}" y2="${f(head[1])}">${stop(0, C.link, 0)}${stop(0.7, C.white, 0.55)}${stop(1, C.white, 1)}</linearGradient></defs>`;
    s += poly([[head[0] + n[0] * 1.5, head[1] + n[1] * 1.5], [head[0] - n[0] * 1.5, head[1] - n[1] * 1.5], tail], 'url(#s)') + circle(head[0], head[1], 2.1, C.white);
    svg('streak', [head[0] - 4, tail[1] - 2, tail[0] - head[0] + 6, head[1] - tail[1] + 6], s);
}

/* ---- the shutters: two leaves each, the nearer one dark, brass along the inner edge, a rib, and
   rivets in uneven groups. `m` mirrors x for the right one. ---- */
{
    const shutter = (name, m, seams, rivets, ribRivets, lit) => {
        const X = x => (m ? 360 - x : x);
        const ys = Array.from({ length: 48 }, (_, i) => -6 + (462 * i) / 47);
        const curve = off => ys.map(y => [X(edge(y) - off), y]);
        const out = [[X(-8), 456], [X(-8), -6]];
        // The far leaf (lighter), the near leaf over it (darker), stepping back from the slit.
        let s = poly([...curve(0), ...out], C.dome);
        if (!lit) s += poly([...curve(0), ...curve(34).reverse()], C.deep);
        // The lit shutter: its middle leaf carries two lighter panels between seams, and its trim a bright inner edge.
        const panel = (y0, y1) => { const yy = Array.from({ length: 13 }, (_, i) => y0 + ((y1 - y0) * i) / 12); return poly([...yy.map(y => [X(edge(y) - 34), y]), ...yy.map(y => [X(edge(y) - 74), y + 4]).reverse()], C.dusk); };
        if (lit) s += panel(seams[0], seams[1]) + panel(seams[2], seams[3]);
        s += poly([...curve(74), ...out], C.deep);
        // Brass: the edge trim, one rib where the leaves meet, a finer one further out.
        s += poly([...curve(0), ...curve(4.5).reverse()], C.brass);
        if (lit) s += poly([...curve(0), ...curve(1.6).reverse()], C.gold);
        s += stroke(curve(34), C.brassLo, 1.8) + stroke(curve(74), C.brassLo, 1.2, ' opacity="0.8"');
        // Seams across the far leaf: short, a little bowed, at uneven heights.
        for (const y of seams) s += stroke([[X(edge(y) - 35), y], [X(edge(y + 3) - 54), y + 3], [X(edge(y + 4) - 73), y + 4]], C.brassLo, 1, ' opacity="0.7"');
        for (const y of rivets) s += circle(X(edge(y) - 11), y, 1.3, C.gold, ' opacity="0.85"');
        for (const y of ribRivets) s += circle(X(edge(y) - 41), y, 1.1, C.brass);
        const w = 128;
        svg(name, [m ? 366 - w : -6, -6, w, 462], s);
    };
    shutter('shutter-l', false, [86, 204, 262, 371], [26, 35, 44, 132, 141, 226, 235, 244, 253, 338, 347], [110, 119, 128, 300, 309], true);
    shutter('shutter-r', true, [58, 148, 290, 334], [62, 71, 160, 169, 178, 187, 280, 289, 298, 364], [40, 49, 214, 223, 232, 386], false);
}

/* ---- the gallery: a parapet with a brass top, a handrail on a few posts, a small lamp and the
   light it throws, the floor with the track the dome turns on ---- */
{
    const top = x => 400 - 5 * ((x - 180) / 186) ** 2;
    const xs = Array.from({ length: 25 }, (_, i) => -6 + (372 * i) / 24);
    const LAMP = [284, 0];
    LAMP[1] = top(LAMP[0]);
    let s = `<defs><radialGradient id="l">${stop(0, C.gold, 0.55)}${stop(0.35, C.gold, 0.2)}${stop(1, C.gold, 0)}</radialGradient></defs>`;
    // Handrail and posts, behind the parapet's top.
    s += stroke(xs.map(x => [x, top(x) - 25]), C.brass, 2.6);
    for (const x of [34, 112, 226, 338]) s += stroke([[x, top(x) - 25], [x, top(x)]], C.brassLo, 2.4) + circle(x, top(x) - 25, 2.6, C.gold);
    // The parapet, its top and its seams.
    s += poly([...xs.map(x => [x, top(x)]), [366, 456], [-6, 456]], C.dome);
    for (const x of [62, 139, 248, 311]) s += stroke([[x, top(x)], [x, 430]], C.deep, 1.4);
    s += poly([...xs.map(x => [x, top(x)]), ...xs.map(x => [x, top(x) + 3.4]).reverse()], C.brass);
    for (const [x, dy] of [[76, 9], [84, 9], [92, 9], [198, 12], [206, 12], [262, 9], [270, 9], [278, 9], [286, 9], [326, 12]]) s += circle(x, top(x) + dy, 1.2, C.brass);
    // The floor and the dome's track.
    const floor = x => 431 - 4 * ((x - 180) / 186) ** 2;
    s += poly([...xs.map(x => [x, floor(x)]), [366, 456], [-6, 456]], C.deep);
    s += stroke(xs.map(x => [x, floor(x)]), C.brassLo, 1.6);
    s += stroke(xs.map(x => [x, floor(x) + 12 - 3 * ((x - 180) / 186) ** 2]), C.brass, 2, ' opacity="0.9"');
    for (const x of [196, 204, 252, 318, 326, 334]) s += circle(x, floor(x) + 18, 1.3, C.gold, ' opacity="0.8"');
    for (const [x, x2] of [[214, 208], [290, 296], [352, 364]]) s += stroke([[x, floor(x) + 13], [x2, 456]], C.dome, 1.6);
    // The lamp: a foot, a stem, a hood, the lit slot under the hood; its light in the air and on the brass.
    const [lx, ly] = LAMP;
    s += circle(lx, ly - 22, 52, 'url(#l)');
    s += `<ellipse cx="${f(lx)}" cy="${f(ly + 1.7)}" rx="40" ry="2.8" fill="${C.gold}" opacity="0.8"/>`;
    s += poly([[lx - 10, ly], [lx + 10, ly], [lx + 7, ly - 4.6], [lx - 7, ly - 4.6]], C.brassLo) + stroke([[lx, ly - 4], [lx, ly - 30]], C.brassLo, 2.8);
    s += `<path d="M${f(lx - 15)} ${f(ly - 29)}A15 13 0 0 1 ${f(lx + 15)} ${f(ly - 29)}Z" fill="${C.brass}"/>`;
    s += `<rect x="${f(lx - 12.5)}" y="${f(ly - 29)}" width="25" height="3.6" fill="${C.gold}"/>`;
    svg('rail', [-6, 322, 372, 134], s);
}

/* ---- the telescope: a long brass refractor on a pier, rising from the lower left toward the figure.
   Built along its axis: `s` runs along the tube from the pivot, `w` across it. ---- */
{
    const O = [148, 362];
    const u = [0.695, -0.719], n = [0.719, 0.695];
    const at = (s, w) => [O[0] + u[0] * s + n[0] * w, O[1] + u[1] * s + n[1] * w];
    const bar = (s0, s1, w0, w1, fill, extra = '') => poly([at(s0, w0), at(s1, w0), at(s1, w1), at(s0, w1)], fill, extra);
    let s = '';
    // The pier: a tapered column with a wide foot and one collar.
    s += poly([[139, 376], [163, 376], [170, 440], [132, 440]], C.brassLo) + poly([[151, 376], [163, 376], [170, 440], [151, 440]], C.deep, ' opacity="0.35"');
    s += poly([[122, 440], [180, 440], [186, 456], [116, 456]], C.brassLo) + poly([[134, 392], [168, 392], [169, 399], [133, 399]], C.brass);
    // The setting circle behind the tube, and the finder riding above it on two feet.
    s += `<circle cx="${O[0]}" cy="${O[1]}" r="27" fill="none" stroke="${C.brassLo}" stroke-width="3.4"/>`;
    s += bar(-34, -29, -26, -14, C.brassLo) + bar(8, 13, -26, -14, C.brassLo);
    s += bar(-52, 30, -30.5, -22.5, C.brass) + bar(-52, 30, -25.5, -22.5, C.brassLo) + bar(30, 38, -32, -21, C.gold) + bar(-60, -52, -29, -24, C.deep);
    // The tube: one brass, one hard-edged shade along its underside.
    s += bar(-128, 74, -15, 15, C.brass) + bar(-128, 74, 6, 15, C.brassLo);
    // The dew shield at the front, a step wider; its rim.
    s += bar(70, 120, -19.5, 19.5, C.brass) + bar(70, 120, 8, 19.5, C.brassLo) + bar(115, 121, -21, 21, C.gold);
    // Two bands, unevenly placed, and the cradle the tube sits in.
    s += bar(-84, -77, -16.5, 16.5, C.gold) + bar(38, 44, -16.5, 16.5, C.gold);
    s += bar(-17, 17, -17.5, 17.5, C.brassLo) + bar(-17, 17, -17.5, -11, C.brass);
    s += circle(O[0], O[1], 9, C.brass) + bar(-5.5, 5.5, -1.3, 1.3, C.gold);
    // The focuser and the eyepiece at the near end.
    s += bar(-150, -128, -10, 10, C.brassLo) + bar(-134, -128, -17, 17, C.gold) + bar(-166, -150, -6.5, 6.5, C.deep) + bar(-153, -149, -8.5, 8.5, C.brass);
    // The focus wheel under the tube.
    s += circle(...at(-108, 21), 7, C.brassLo);
    svg('telescope', [-6, 238, 262, 218], s);
}

/* ---- fleck: one small round mote of light ---- */
svg('fleck', [HEART[0] - 3, HEART[1] - 3, 6, 6], circle(HEART[0], HEART[1], 2.2, C.gold, ' opacity="0.9"'));

for (const [name, box] of Object.entries(boxes)) console.log(name.padEnd(10), JSON.stringify(box));
