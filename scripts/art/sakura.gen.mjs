// Generator for the "sakura" wrapper art: a canal between two rows of cherry trees, in flat
// perspective (everything converges on one point). Bare ink branches with buds while closed; the
// canopies are separate layers of flat round blobs in three pinks that bloom over them. No outline,
// no filter; the only gradients are the sky and the plain glow of a lit lantern.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas) and
// prints the layer boxes and pivots the definition (src/wrappers/sakura.ts) carries.
// Run: node scripts/art/sakura.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeSvg } from '../svg-allow.mjs';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'sakura');
if (!OUT.endsWith('wrappers/sakura')) throw new Error('out dir must be public/wrappers/sakura');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two skies, three blossom pinks, trunk ink, two waters, stone, paper, one vermilion, one lamp light. */
const C = {
    skyHi: '#C9B1D6',
    skyLo: '#F7DDE2',
    pinkLight: '#FFD3DE',
    pink: '#F49AB6',
    pinkDeep: '#D95F8C',
    ink: '#1E1420',
    water: '#B7C8D8',
    waterLo: '#8AA2B8',
    stone: '#6F6679',
    paper: '#FFF8EE',
    red: '#C8371F',
    lamp: '#FFD27A',
};

const f = n => String(Math.round(n * 10) / 10);
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"${extra}/>`;
/** Round dots as one stroked path per size: each dot is a very short line with round caps. `dots` are [x, y, r]. */
function dotArt(dots, fill, steps = 5) {
    if (dots.length === 0) return '';
    const lo = Math.min(...dots.map(d => d[2])), hi = Math.max(...dots.map(d => d[2]));
    const out = [];
    for (let i = 0; i < steps; i += 1) {
        const a = lo + ((hi - lo) * i) / steps, b = lo + ((hi - lo) * (i + 1)) / steps;
        const list = dots.filter(d => d[2] >= a && (i === steps - 1 ? d[2] <= b : d[2] < b));
        if (list.length > 0) out.push(`<path d="${list.map(d => `M${f(d[0])} ${f(d[1])}h.1`).join('')}" stroke-width="${f(a + b)}"/>`);
    }
    return `<g fill="none" stroke="${fill}" stroke-linecap="round">${out.join('')}</g>`;
}
const LAYOUT = {};
function svg(name, box, inner, origin) {
    const [x, y, w, h] = box;
    const { svg: clean, problems } = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
    if (clean === undefined) throw new Error(`${name}: ${problems.join('; ')}`);
    writeFileSync(join(OUT, `${name}.svg`), clean);
    const part = v => Math.round(Math.max(0, Math.min(1, v)) * 1000) / 1000;
    LAYOUT[name] = origin ? { box, origin: [part((origin[0] - x) / w), part((origin[1] - y) / h)] } : { box };
}
/** Small seeded PRNG (mulberry32): the picture is the same on every run. */
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
/** A whole-number box around [x0, y0, x1, y1], kept inside the canvas and its bleed. */
function boxOf(x0, y0, x1, y1, pad = 2) {
    const a = Math.max(-6, Math.floor(x0 - pad)), b = Math.max(-6, Math.floor(y0 - pad));
    const c = Math.min(366, Math.ceil(x1 + pad)), d = Math.min(456, Math.ceil(y1 + pad));
    return [a, b, c - a, d - b];
}

/* ---- the perspective: one vanishing point; a thing at depth `s` (0 far, 1 at the bottom edge) sits on a ray ---- */
/** The height of the horizon, and how far the water and the ground run below it at depth 1. */
const VY = 226, WS = 456 - VY, GS = 184;
/** How far the horizon lies below the height the far things were first drawn at. */
const DY = VY - 196;
const VP = [180, VY];
/** Left bank, at depth s: the water's edge, the top of the embankment, the row of trees. `side` -1 left, +1 right. */
const waterEdge = (s, side) => [180 + side * 166 * s, VY + WS * s];
const wallTop = (s, side) => [180 + side * 196 * s, VY + GS * s];
const treeFoot = (s, side) => [180 + side * 250 * s, VY + GS * s];
/** Tree height at depth 1. */
const TREE_H = 540;

/* ---- a cherry tree: a short trunk, then limbs that fork and fork again, spreading wide. `dir` +1 leans right. ---- */
function makeTree(s, side, seed, levels, limbs) {
    const R = rng(seed);
    const [bx, by] = treeFoot(s, side);
    const H = TREE_H * s;
    const dir = -side; // toward the canal
    const top = [bx + dir * 0.045 * H, by - 0.3 * H];
    const segs = Array.from({ length: levels + 1 }, () => []);
    const nodes = [];
    const widths = Array.from({ length: levels + 1 }, (_, l) => 0.03 * H * 0.62 ** (l - 1));
    function grow(x, y, ang, len, lvl, limb) {
        const a = (ang * Math.PI) / 180;
        const x1 = x + dir * Math.sin(a) * len, y1 = y - Math.cos(a) * len;
        const k = (R() - 0.5) * 0.36 * len;
        const cx = (x + x1) / 2 + dir * Math.cos(a) * k, cy = (y + y1) / 2 + Math.sin(a) * k;
        segs[lvl].push(`M${f(x)} ${f(y)}Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}`);
        const last = lvl === levels || widths[lvl + 1] < 0.55;
        nodes.push({ x: x1, y: y1, lvl, tip: last, limb });
        if (last) return;
        const n = R() < 0.28 ? 3 : 2;
        const spread = 30 + R() * 22;
        for (let i = 0; i < n; i += 1) {
            let child = ang + spread * (i - (n - 1) / 2) + (R() - 0.5) * 14;
            // Toward the canal a branch never drops below a slant: the middle of the picture stays open.
            child = Math.max(-104, Math.min(58, child));
            grow(x1, y1, child, len * (0.62 + R() * 0.2), lvl + 1, limb);
        }
    }
    limbs.forEach(([ang, len], limb) => grow(top[0], top[1], ang + (R() - 0.5) * 8, len * H, 1, limb));
    return { bx, by, H, dir, top, segs, widths, nodes };
}
/** The bare tree: trunk, limbs by thickness, bark marks, and a bud at every tip. */
function treeArt(t, bark = false) {
    const { bx, by, H, dir, top } = t;
    const P = (dx, dy) => [bx + dir * dx * H, by - dy * H];
    let s = poly([P(-0.06, -0.004), P(-0.03, 0.05), [top[0] - 0.023 * H, top[1]], [top[0] + 0.023 * H, top[1]], P(0.034, 0.05), P(0.062, -0.004)], C.ink);
    s += circle(top[0], top[1], 0.023 * H, ` fill="${C.ink}"`);
    if (bark) {
        // Cherry bark: short level marks across the trunk.
        for (const [h, a, b] of [[0.07, -0.02, 0.012], [0.12, -0.004, 0.026], [0.17, -0.014, 0.008], [0.215, 0.006, 0.03], [0.26, 0.012, 0.03]]) {
            const lean = (0.045 * h) / 0.3;
            s += `<path d="M${f(bx + dir * (lean + a) * H)} ${f(by - h * H)}h${f(dir * (b - a) * H)}" stroke="${C.stone}" stroke-width="${f(0.007 * H)}" stroke-linecap="round"/>`;
        }
    }
    s += `<g fill="none" stroke="${C.ink}" stroke-linecap="round">`;
    t.segs.forEach((list, lvl) => {
        if (list.length > 0) s += `<path d="${list.join('')}" stroke-width="${f(Math.max(0.6, t.widths[lvl]))}"/>`;
    });
    s += '</g>';
    const r = Math.max(0.8, 0.0062 * H);
    s += dotArt(t.nodes.filter(n => n.tip || n.lvl >= 4).map(n => [n.x, n.y, n.tip ? r : r * 0.8]), C.pinkDeep, 2);
    return s;
}
function treeBounds(t) {
    const xs = [t.bx - 0.07 * t.H, t.bx + 0.07 * t.H, ...t.nodes.map(n => n.x)], ys = [t.by + 2, ...t.nodes.map(n => n.y)];
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
/**
 * The canopy of a tree, in the manner of a woodblock print: one lobed mass of blossom on each limb, a
 * silhouette of overlapping level ovals of different sizes in the middle pink; paler lobes lying on its
 * upper side, a few small dark ones tucked under it, and a scatter of single small blossoms at the tips
 * around it. Between the masses the bare branches show.
 */
function canopy(t, seed) {
    const R = rng(seed);
    const H = t.H;
    const out = { pinkDeep: [], pink: [], pinkLight: [], dots: [], dotsLight: [] };
    const limbs = new Map();
    for (const n of t.nodes) if (n.lvl >= 2) limbs.set(n.limb, [...(limbs.get(n.limb) ?? []), n]);
    for (const list of limbs.values()) {
        const outer = list.filter(n => n.lvl >= 3);
        const pool = outer.length >= 3 ? outer : list;
        const cx = pool.reduce((a, n) => a + n.x, 0) / pool.length, cy = pool.reduce((a, n) => a + n.y, 0) / pool.length;
        const k = Math.min(pool.length, 6 + Math.floor(R() * 3));
        for (let i = 0; i < k; i += 1) {
            const n = pool[Math.floor(((i + R() * 0.9) * pool.length) / k) % pool.length];
            // Each oval is drawn in toward the middle of its limb, so the mass holds together and the tips stay bare.
            const x = n.x + (cx - n.x) * 0.38, y = n.y + (cy - n.y) * 0.38;
            const rx = (0.046 + R() * 0.046) * H, ry = rx * (0.56 + R() * 0.2);
            out.pink.push([x, y, rx, ry]);
            if (R() < 0.62) out.pinkLight.push([x - 0.2 * rx, y - 0.34 * ry, rx * 0.66, ry * 0.56]);
            if (R() < 0.34) out.pinkDeep.push([x + 0.24 * rx, y + 0.7 * ry, rx * 0.4, ry * 0.34]);
        }
        for (const n of list) {
            if (!n.tip || R() > 0.4) continue;
            (R() < 0.5 ? out.dots : out.dotsLight).push([n.x, n.y, (0.011 + R() * 0.009) * H]);
        }
    }
    return out;
}
const canopyArt = c => {
    const ovals = (list, fill) => `<g fill="${fill}">` + list.map(([x, y, rx, ry]) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}"/>`).join('') + '</g>';
    return ovals(c.pink, C.pink) + ovals(c.pinkDeep, C.pinkDeep) + ovals(c.pinkLight, C.pinkLight) + dotArt(c.dots, C.pink, 3) + dotArt(c.dotsLight, C.pinkLight, 3);
};
function canopyBounds(...cs) {
    const all = cs.flatMap(c => [...c.pink, ...c.pinkDeep, ...c.pinkLight, ...[...c.dots, ...c.dotsLight].map(([x, y, r]) => [x, y, r, r])]);
    return [Math.min(...all.map(e => e[0] - e[2])), Math.min(...all.map(e => e[1] - e[3])), Math.max(...all.map(e => e[0] + e[2])), Math.max(...all.map(e => e[1] + e[3]))];
}
const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];

/* Limbs: [angle from upright in degrees, toward the canal positive; length as a part of the tree's height]. */
const LIMBS = [[-74, 0.2], [-40, 0.215], [-8, 0.21], [24, 0.18], [50, 0.14]];
const TREES = {};
for (const [side, tag, seeds] of [[-1, 'l', [11, 23, 37, 41]], [1, 'r', [58, 61, 79, 83]]]) {
    TREES[`near-${tag}`] = makeTree(0.66, side, seeds[0], 5, LIMBS);
    TREES[`mid-${tag}`] = makeTree(0.36, side, seeds[1], 5, LIMBS);
    TREES[`far-${tag}`] = makeTree(0.225, side, seeds[2], 4, LIMBS);
    TREES[`end-${tag}`] = makeTree(0.14, side, seeds[3], 3, LIMBS);
}

/** A point on the water at depth s; `u` runs from -1 (left edge) to 1 (right edge). */
const onWater = (s, u) => [180 + u * 166 * s, VY + WS * s];
/** The lanterns' reflections: at a few depths under each lantern line, a short column of dashes that narrow downward. */
const GLINTS = [0.32, 0.44, 0.6, 0.8, 1];
const glints = (tone, o) => [-1, 1].flatMap(side => GLINTS.flatMap(d => {
    const [x, y] = onWater(d, side * 0.74), w = 26 * d, h = 1 + 3.2 * d;
    return [1, 0.72, 0.46, 0.26].map((k, i) => `<rect x="${f(x - (w * k) / 2)}" y="${f(y + i * 2.1 * h)}" width="${f(w * k)}" height="${f(h)}" rx="${f(h / 2)}" fill="${tone}" opacity="${f(o * (1 - i * 0.17))}"/>`);
})).join('');

/* ---- what is on the water and the banks from the start: the lanterns' pale reflections and a few early petals ---- */
let EXTRAS = glints(C.paper, 0.7);
{
    const R = rng(909);
    let light = '', mid = '';
    for (let i = 0; i < 26; i += 1) {
        const d = 0.3 + 0.7 * R(), u = (R() - 0.5) * 1.5;
        const [x, y] = onWater(d, u), rx = (1 + R()) * (0.5 + d * 1.2);
        const e = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.5)}"/>`;
        if (R() < 0.65) light += e; else mid += e;
    }
    for (let i = 0; i < 22; i += 1) {
        const side = i % 2 === 0 ? -1 : 1, d = 0.2 + 0.8 * R(), v = 0.1 + R() * 1.3;
        const x = 180 + side * (196 + 36 * v) * d, y = VY + GS * d, rx = (0.8 + R()) * (0.5 + d * 1.2);
        const e = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.5)}"/>`;
        if (R() < 0.65) light += e; else mid += e;
    }
    EXTRAS += `<g fill="${C.pinkLight}">${light}</g><g fill="${C.pink}">${mid}</g>`;
}

/* ---- reeds: a clump of long flat blades standing in the water under the left embankment ---- */
{
    const [bx, by] = onWater(0.93, -0.84);
    /** One blade from (x, 0) at the waterline: `h` tall, leaning `lean` at the tip, `w` wide at the foot. */
    const blade = (x, h, lean, w, fill) => `<path d="M${f(bx + x - w / 2)} ${f(by)}Q${f(bx + x - w / 2 + lean * 0.25)} ${f(by - h * 0.6)} ${f(bx + x + lean)} ${f(by - h)}Q${f(bx + x + w / 2 + lean * 0.45)} ${f(by - h * 0.5)} ${f(bx + x + w / 2)} ${f(by)}Z" fill="${fill}"/>`;
    let s = `<ellipse cx="${f(bx + 6)}" cy="${f(by)}" rx="30" ry="3.4" fill="${C.waterLo}"/>`;
    for (const [x, h, lean, w] of [[-16, 50, -15, 4.4], [-4, 78, -9, 5], [10, 60, 12, 4.6], [24, 40, 19, 4]]) s += blade(x, h, lean, w, C.stone);
    for (const [x, h, lean, w] of [[-22, 34, -20, 3.6], [-10, 66, -18, 4.6], [2, 92, 3, 5.4], [8, 74, 15, 4.8], [18, 54, 22, 4.2], [30, 30, 16, 3.4]]) s += blade(x, h, lean, w, C.ink);
    svg('reeds', boxOf(bx - 46, by - 94, bx + 44, by + 4, 1), s, [bx + 4, by]);
}

/* ---- scene: sky, hills, both banks with their stone embankments, the canal, the bridge, the farthest bare trees ---- */
{
    let s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.skyHi}"/><stop offset="1" stop-color="${C.skyLo}"/></linearGradient></defs>`;
    s += `<rect x="-6" y="-6" width="372" height="${206 + DY}" fill="url(#sky)"/>`;
    // Flat bars of cloud.
    for (const [x, y, w] of [[120, 62, 86], [150, 72, 110], [176, 148, 96], [128, 158, 70], [60, 104, 60], [236, 104, 70], [150, 118, 54]]) s += `<rect x="${x}" y="${y}" width="${w}" height="5" rx="2.5" fill="${C.paper}" opacity="0.6"/>`;
    // Low rolling hills, two planes.
    s += `<g transform="translate(0 ${DY})">`;
    s += `<path d="M-6 180Q40 150 96 172Q140 186 190 170Q250 152 300 170Q340 182 366 168V200H-6Z" fill="${C.stone}" opacity="0.28"/>`;
    s += `<path d="M-6 190Q30 176 70 186Q110 196 150 184Q176 178 200 186Q250 198 290 184Q330 174 366 188V200H-6Z" fill="${C.stone}" opacity="0.4"/></g>`;
    // The ground of both banks, with a paler walk along the embankment.
    s += `<rect x="-6" y="${VY}" width="372" height="${WS}" fill="${C.skyLo}"/><rect x="-6" y="${VY}" width="372" height="${WS}" fill="${C.stone}" opacity="0.5"/>`;
    for (const side of [-1, 1]) {
        const far = 0.02, near = 1.2;
        s += poly([wallTop(far, side), wallTop(near, side), [180 + side * 232 * near, VY + GS * near], [180 + side * 232 * far, VY + GS * far]], C.paper, ' opacity="0.3"');
        // A shadow at the foot of each tree.
        for (const k of ['near', 'mid', 'far', 'end']) {
            const t = TREES[`${k}-${side < 0 ? 'l' : 'r'}`];
            s += `<ellipse cx="${f(t.bx + t.dir * 0.03 * t.H)}" cy="${f(t.by)}" rx="${f(0.15 * t.H)}" ry="${f(0.016 * t.H)}" fill="${C.ink}" opacity="0.22"/>`;
        }
    }
    // The canal.
    s += poly([waterEdge(0.02, -1), waterEdge(1.2, -1), waterEdge(1.2, 1), waterEdge(0.02, 1)], C.water);
    s += poly([VP, [180 - 60, 456], [180 + 60, 456]], C.paper, ' opacity="0.22"');
    for (const side of [-1, 1]) {
        // The embankment's reflection lying along each edge of the water.
        s += poly([waterEdge(0.02, side), waterEdge(1.2, side), [180 + side * 132 * 1.2, VY + WS * 1.2], [180 + side * 132 * 0.02, VY + WS * 0.02]], C.waterLo);
        // The embankment: a sloping stone face, a pale kerb, courses and joints that close up with distance.
        s += poly([wallTop(0.02, side), wallTop(1.3, side), waterEdge(1.3, side), waterEdge(0.02, side)], C.stone);
        const course = (k, t) => [wallTop(t, side)[0] + (waterEdge(t, side)[0] - wallTop(t, side)[0]) * k, wallTop(t, side)[1] + (waterEdge(t, side)[1] - wallTop(t, side)[1]) * k];
        s += poly([course(0.62, 0.02), course(0.62, 1.3), waterEdge(1.3, side), waterEdge(0.02, side)], C.ink, ' opacity="0.2"');
        s += poly([wallTop(0.02, side), wallTop(1.3, side), course(0.14, 1.3), course(0.14, 0.02)], C.paper, ' opacity="0.55"');
        let lines = '';
        for (const k of [0.38, 0.62, 0.82]) lines += `M${f(course(k, 0.05)[0])} ${f(course(k, 0.05)[1])}L${f(course(k, 1.3)[0])} ${f(course(k, 1.3)[1])}`;
        const rows = [0.14, 0.38, 0.62, 0.82, 1];
        for (let i = 0, t = 0.1; t < 1.3; i += 1, t *= 1.2) {
            for (let r = 0; r < 4; r += 1) {
                const tt = t * (r % 2 === 0 ? 1 : 1.095);
                const a = course(rows[r], tt), b = course(rows[r + 1], tt);
                lines += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
            }
        }
        s += `<path d="${lines}" fill="none" stroke="${C.ink}" stroke-width="0.9" opacity="0.3"/>`;
    }
    // A dark mass of far trees where the canal ends.
    s += `<path transform="translate(0 ${DY})" d="M150 204Q152 190 162 192Q166 184 176 188Q184 182 192 189Q202 186 204 194Q212 194 210 204Z" fill="${C.stone}"/>`;
    // The farthest trees of each row, bare.
    for (const k of ['end-l', 'end-r', 'far-l', 'far-r']) s += treeArt(TREES[k]);
    // The bridge: one low arch in vermilion, posts and a rail, its reflection broken into bars.
    s += `<g transform="translate(0 ${f(GS * 0.2 - 41.6 + DY)})">`;
    {
        const y0 = 238, rise = 12, x0 = 136, x1 = 224;
        const deck = (x, lift = 0) => y0 - lift - rise * (1 - ((x - 180) / 44) ** 2);
        s += `<path d="M146 249Q180 ${f(249 - 2 * 15)} 214 249Z" fill="${C.waterLo}"/>`;
        for (const [y, w, o] of [[254, 50, 0.5], [259, 38, 0.38], [264, 52, 0.26], [270, 30, 0.18]]) s += `<rect x="${f(180 - w / 2)}" y="${y}" width="${w}" height="2.4" rx="1.2" fill="${C.red}" opacity="${o}"/>`;
        s += `<path d="M${x0} ${y0}Q180 ${y0 - 2 * rise} ${x1} ${y0}V${y0 + 5}Q180 ${y0 + 5 - 2 * rise + 2} ${x0} ${y0 + 5}Z" fill="${C.red}"/>`;
        s += `<path d="M${x0} ${y0 + 5}Q180 ${y0 + 5 - 2 * rise + 2} ${x1} ${y0 + 5}" fill="none" stroke="${C.ink}" stroke-width="1.2" opacity="0.55"/>`;
        s += `<path d="M${x0} ${y0 - 8}Q180 ${y0 - 8 - 2 * rise} ${x1} ${y0 - 8}" fill="none" stroke="${C.red}" stroke-width="1.8" stroke-linecap="round"/>`;
        let posts = '';
        for (let x = x0; x <= x1; x += 8) posts += `M${x} ${f(deck(x, 9))}V${f(deck(x) + 1)}`;
        s += `<path d="${posts}" fill="none" stroke="${C.red}" stroke-width="1.4"/>`;
        for (const x of [x0, x1]) s += `<rect x="${x - 2}" y="${y0 - 12}" width="4" height="17" fill="${C.red}"/><rect x="${x - 2.6}" y="${y0 - 14}" width="5.2" height="2.6" fill="${C.ink}"/>`;
    }
    s += '</g>';
    s += EXTRAS;
    svg('scene', [-6, -6, 372, 462], s);
}

/* ---- water: flat ripple bands in two layers that slide against each other, and (once open) petals afloat ---- */
{
    const bar = (s, at, len, tone, o) => {
        const w = 332 * s, y = VY + WS * s, h = 1 + 4.6 * s;
        return `<rect x="${f(180 + at * w - (len * w) / 2)}" y="${f(y)}" width="${f(len * w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${tone}"${o < 1 ? ` opacity="${o}"` : ''}/>`;
    };
    let far = '', near = '';
    for (const [s, at, len, light] of [[0.3, -0.12, 0.3, 1], [0.345, 0.14, 0.26, 0], [0.39, -0.02, 0.4, 1], [0.44, -0.2, 0.22, 0], [0.47, 0.17, 0.3, 1], [0.52, -0.06, 0.34, 0], [0.555, 0.1, 0.2, 1]]) far += bar(s, at, len, light ? C.paper : C.waterLo, light ? 0.75 : 1);
    for (const [s, at, len, light] of [[0.62, -0.14, 0.34, 1], [0.66, 0.16, 0.24, 0], [0.71, 0.04, 0.4, 1], [0.76, -0.2, 0.26, 0], [0.8, 0.18, 0.3, 1], [0.85, -0.04, 0.36, 0], [0.9, -0.2, 0.22, 1], [0.94, 0.14, 0.34, 0], [0.985, -0.06, 0.3, 1]]) near += bar(s, at, len, light ? C.paper : C.waterLo, light ? 0.75 : 1);
    svg('ripple-far', [108, 293, 144, 66], far);
    svg('ripple-near', [26, 366, 308, 90], near);

    // Petals afloat: rafts of them drifting along both edges, thinner in the middle, and the bloom's
    // reflection as a few long flat bars.
    const R = rng(301);
    let s = '';
    for (const [d, at, len] of [[0.36, -0.2, 0.2], [0.5, 0.22, 0.22], [0.68, -0.24, 0.24], [0.84, 0.2, 0.3], [0.95, -0.2, 0.26]]) s += bar(d, at, len, C.pink, 0.5);
    const groups = { pinkLight: '', pink: '', paper: '' };
    for (let i = 0; i < 120; i += 1) {
        const d = 0.3 + 0.72 * Math.sqrt(R());
        const edge = R() < 0.72;
        const at = edge ? (R() < 0.5 ? -1 : 1) * (0.2 + R() * 0.2) : (R() - 0.5) * 0.4;
        const x = 180 + at * 332 * d, y = VY + WS * d + (R() - 0.5) * 8 * d;
        const rx = (1.2 + R() * 1.4) * (0.4 + d * 1.3), ry = rx * 0.5;
        const kind = R() < 0.5 ? 'pinkLight' : R() < 0.7 ? 'pink' : 'paper';
        groups[kind] += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}"/>`;
    }
    for (const k of Object.keys(groups)) s += `<g fill="${C[k]}">${groups[k]}</g>`;
    // And the lanterns' reflections turn warm.
    s += glints(C.lamp, 0.9);
    svg('afloat', [26, 290, 308, 166], s);
}

/* ---- the nearer trees: bare, each its own layer so that a farther canopy blooms behind its branches ---- */
for (const k of ['mid-l', 'mid-r', 'near-l', 'near-r']) {
    const t = TREES[k];
    svg(`tree-${k}`, boxOf(...treeBounds(t), 4), treeArt(t, k.startsWith('near')), t.top);
}

/* ---- canopies: six layers, far to near on each bank. The far one holds the two farthest trees of its row. ---- */
for (const tag of ['l', 'r']) {
    const side = tag === 'l' ? 0 : 1;
    const far = canopy(TREES[`far-${tag}`], 500 + side), end = canopy(TREES[`end-${tag}`], 510 + side);
    svg(`bloom-far-${tag}`, boxOf(...canopyBounds(far, end), 1), canopyArt(end) + canopyArt(far), TREES[`far-${tag}`].top);
    for (const k of ['mid', 'near']) {
        const c = canopy(TREES[`${k}-${tag}`], (k === 'mid' ? 520 : 530) + side);
        svg(`bloom-${k}-${tag}`, boxOf(...canopyBounds(c), 1), canopyArt(c), TREES[`${k}-${tag}`].top);
    }
}

/* ---- lanterns: blank paper lanterns on a line strung from tree to tree along each bank; and the same
   lanterns lit, in four groups from far to near ---- */
{
    /** Where the line is tied at depth s: a third of the way up a tree. */
    const tie = (s, side) => [treeFoot(s, side)[0] - side * 0.02 * TREE_H * s, treeFoot(s, side)[1] - 0.29 * TREE_H * s];
    const spans = [[0.9, 0.66, [0.45], 3], [0.66, 0.36, [0.16, 0.39, 0.62, 0.84], 2], [0.36, 0.225, [0.22, 0.5, 0.78], 1], [0.225, 0.14, [0.3, 0.7], 0]];
    let line = '';
    const paper = [], lit = [[], [], [], []];
    for (const side of [-1, 1]) {
        for (const [a, b, ts, group] of spans) {
            const A = tie(a, side), B = tie(b, side);
            const sag = 0.12 * Math.hypot(B[0] - A[0], B[1] - A[1]);
            line += `M${f(A[0])} ${f(A[1])}Q${f((A[0] + B[0]) / 2)} ${f((A[1] + B[1]) / 2 + 2 * sag)} ${f(B[0])} ${f(B[1])}`;
            ts.forEach((t, i) => {
                const s = a + (b - a) * t;
                const x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t + sag * 4 * t * (1 - t);
                const item = { x, y, w: 25 * s, h: 33 * s };
                paper.push(item);
                // The second span is long: its nearer half lights last.
                lit[group === 2 && i < 2 ? 3 : group].push(item);
            });
        }
    }
    /** One lantern hanging from (x, y): a thread, a round-shouldered paper body, a dark ring above and below. */
    const lantern = (L, body, ribs) => {
        const { x, y, w, h } = L, top = y + 0.16 * h;
        let s = `<rect x="${f(x - w / 2)}" y="${f(top)}" width="${f(w)}" height="${f(h)}" rx="${f(w * 0.42)}" fill="${body}"/>`;
        if (ribs && w > 7) for (const k of [0.3, 0.5, 0.7]) s += `<rect x="${f(x - w / 2)}" y="${f(top + k * h - 0.3)}" width="${f(w)}" height="0.7" fill="${C.stone}" opacity="0.35"/>`;
        s += `<rect x="${f(x - w * 0.27)}" y="${f(top - 0.05 * h)}" width="${f(w * 0.54)}" height="${f(0.1 * h)}" fill="${C.ink}"/><rect x="${f(x - w * 0.27)}" y="${f(top + 0.95 * h)}" width="${f(w * 0.54)}" height="${f(0.1 * h)}" fill="${C.ink}"/>`;
        return s;
    };
    let s = `<path d="${line}" fill="none" stroke="${C.ink}" stroke-width="0.8"/>`;
    for (const L of paper) s += `<rect x="${f(L.x - 0.3)}" y="${f(L.y - 1)}" width="0.6" height="${f(0.16 * L.h + 1)}" fill="${C.ink}"/>` + lantern(L, C.paper, true);
    const all = [Math.min(...paper.map(L => L.x - L.w / 2)), Math.min(...paper.map(L => L.y)) - 6, Math.max(...paper.map(L => L.x + L.w / 2)), Math.max(...paper.map(L => L.y + 1.3 * L.h))];
    svg('lanterns', boxOf(...all, 3), s);
    lit.forEach((list, g) => {
        let t = `<defs><radialGradient id="glow"><stop offset="0" stop-color="${C.lamp}" stop-opacity="0.7"/><stop offset="0.45" stop-color="${C.lamp}" stop-opacity="0.3"/><stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/></radialGradient></defs>`;
        for (const L of list) t += `<circle cx="${f(L.x)}" cy="${f(L.y + 0.66 * L.h)}" r="${f(L.h * 1.15)}" fill="url(#glow)"/>`;
        for (const L of list) t += lantern(L, C.lamp, false) + `<ellipse cx="${f(L.x)}" cy="${f(L.y + 0.7 * L.h)}" rx="${f(L.w * 0.24)}" ry="${f(L.h * 0.3)}" fill="${C.paper}" opacity="0.8"/>`;
        const b = [Math.min(...list.map(L => L.x - L.h * 1.15)), Math.min(...list.map(L => L.y - 0.5 * L.h)), Math.max(...list.map(L => L.x + L.h * 1.15)), Math.max(...list.map(L => L.y + 1.85 * L.h))];
        svg(`lit-${g + 1}`, boxOf(...b, 1), t);
    });
}

/* ---- petals in the air: two fields that cross the frame on a slant, and one petal for the small burst ---- */
/** A petal at (x, y): a pointed oval `len` long, turned by `a` radians. */
const petal = (x, y, len, a, wide = 0.42) => {
    const c = Math.cos(a), n = Math.sin(a), h = len / 2, w = len * wide;
    const p = (u, v) => `${f(x + u * c - v * n)} ${f(y + u * n + v * c)}`;
    return `M${p(-h, 0)}Q${p(0, -w)} ${p(h, 0)}Q${p(h * 0.2, w)} ${p(-h, 0)}Z`;
};
for (const [name, box, seed] of [['drift-a', [60, 60, 230, 190], 701], ['drift-b', [66, 140, 230, 190], 702]]) {
    const R = rng(seed);
    const d = { pinkLight: '', pink: '', pinkDeep: '', paper: '' };
    const cols = 6, rows = 5;
    for (let i = 0; i < cols * rows; i += 1) {
        if (R() < 0.12) continue;
        const x = box[0] + 8 + ((i % cols) + 0.15 + R() * 0.7) * ((box[2] - 16) / cols);
        const y = box[1] + 8 + (Math.floor(i / cols) + 0.15 + R() * 0.7) * ((box[3] - 16) / rows);
        const tone = R();
        const kind = tone < 0.42 ? 'pink' : tone < 0.62 ? 'pinkLight' : tone < 0.88 ? 'pinkDeep' : 'paper';
        d[kind] += petal(x, y, 8 + R() * 8, R() * Math.PI * 2);
    }
    svg(name, box, Object.keys(d).map(k => `<path d="${d[k]}" fill="${C[k]}"/>`).join(''));
}
svg('petal', [175, 176, 10, 8], `<path d="${petal(180, 180, 9, 0.3)}" fill="${C.pink}"/>`);

process.stdout.write(Object.entries(LAYOUT).map(([k, v]) => `${k}: box ${JSON.stringify(v.box)}${v.origin ? ` origin ${JSON.stringify(v.origin)}` : ''}`).join('\n') + '\n');
