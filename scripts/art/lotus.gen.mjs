// Generator for the "lotus" wrapper art: a lotus pond at night, seen at an angle from above, in flat
// saturated colour. Round leaves lie on dark teal water and stand over it on tall stems; one big pink
// bud right of centre opens in three rings of petals. Flat fills, one hard-edged shade shape per form,
// no outline, no filter, no blend mode; the only gradients are the small glows of the fireflies.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas) and
// prints the boxes and pivots the definition (src/wrappers/lotus.ts) carries.
// Run: node scripts/art/lotus.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'lotus');
if (!OUT.endsWith('wrappers/lotus')) throw new Error('out dir must be public/wrappers/lotus');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two waters, two leaf greens, three petal pinks, the stamens' yellow, the moon on the water. */
const C = {
    water: '#06262B',
    waterLo: '#0D3F45',
    leaf: '#17755C',
    leafHi: '#52B67C',
    rose: '#C2306A',
    pink: '#F27BA5',
    pale: '#FDDCE5',
    gold: '#F6C34C',
    moon: '#E4F1E2',
};

const f = n => String(Math.round(n * 100) / 100);
const rad = d => (d * Math.PI) / 180;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const line = (a, b, col, w, extra = '') => `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" fill="none"${extra}/>`;
const bar = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${fill}"${extra}/>`;
const dot = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const boxes = {};
function svg(name, box, inner, origin) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
    boxes[name] = origin ? { box, origin: [Math.round(((origin[0] - x) / w) * 1000) / 1000, Math.round(((origin[1] - y) / h) * 1000) / 1000] } : { box };
}
/** A small seeded generator, so the scattered things fall the same way on every run. */
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
const rot = ([x, y], [cx, cy], deg) => {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
    return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
};

/**
 * A leaf lying on the water: a round leaf seen at an angle is an ellipse. A notch runs from the rim to
 * the middle, veins radiate from the middle, and one half is a tone darker along a straight fold.
 */
function pad(cx, cy, rx, tilt, notch, o = {}) {
    const ry = rx * (o.flat ?? 0.36), hw = o.notchWidth ?? 9, wave = o.wave ?? 0.03, ph = o.phase ?? 0;
    const at = (a, k = 1) => rot([cx + Math.cos(rad(a)) * rx * k, cy + Math.sin(rad(a)) * ry * k], [cx, cy], tilt);
    const rim = a => at(a, 1 + wave * Math.sin(rad(a * 5) + ph));
    const pts = [[cx, cy]];
    for (let a = notch + hw; a <= notch + 360 - hw + 0.01; a += 6) pts.push(rim(a));
    let s = poly(pts, o.fill ?? C.leaf, o.opacity ? ` opacity="${o.opacity}"` : '');
    // The shade: the half of the leaf away from the notch's side, cut straight through the middle.
    const sa = o.shadeFrom ?? notch + 40;
    const sh = [[cx, cy]];
    for (let a = sa; a <= sa + 150 + 0.01; a += 6) sh.push(rim(a));
    s += poly(sh, o.shade ?? C.water, ` opacity="${o.shadeOpacity ?? 0.24}"`);
    const n = o.veins ?? 11;
    for (let k = 0; k < n; k += 1) {
        const a = notch + hw + 8 + ((k + 0.5) / n) * (360 - 2 * hw - 16);
        s += line(at(a, 0.08), at(a, 0.9), o.vein ?? C.leafHi, o.veinWidth ?? 0.8, ` opacity="${o.veinOpacity ?? 0.6}"`);
    }
    // A stretch of the rim curled over, showing the paler underside.
    if (o.roll) {
        const [a1, a2] = o.roll, curl = [];
        for (let a = a1; a <= a2; a += 4) curl.push(rim(a));
        for (let a = a2; a >= a1; a -= 4) curl.push(at(a, 1 - 0.3 * Math.sin(Math.PI * ((a - a1) / (a2 - a1)))));
        s += poly(curl, o.fill ?? C.leaf) + poly(curl, C.moon, ' opacity="0.5"');
    }
    // Drops of water standing on the leaf.
    for (const [a, k, r] of o.drops ?? []) {
        const [x, y] = at(a, k);
        s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.6)}" fill="${C.moon}" opacity="0.9"/>`;
    }
    return s;
}

/**
 * A leaf standing over the water on its stem, seen from the side: a shallow funnel. The underside is
 * the darker green, the face the lighter, and the near rim rolls over to show the underside again.
 */
function funnel(cx, cy, rx, ry, depth, tilt, stemTo, o = {}) {
    const c = [cx, cy];
    const R = p => rot(p, c, tilt);
    const wave = o.wave ?? 0.035, ph = o.phase ?? 0;
    const rim = (a, k = 1) => {
        const w = k * (1 + wave * Math.sin(rad(a * 4) + ph));
        return R([cx + Math.cos(rad(a)) * rx * w, cy + Math.sin(rad(a)) * ry * w]);
    };
    const foot = R([cx + (o.lean ?? 0), cy + depth]);
    // Stem first, so the leaf sits on it.
    let s = `<path d="M${f(foot[0])} ${f(foot[1])}Q${f((foot[0] + stemTo[0]) / 2 + (o.bow ?? 4))} ${f((foot[1] + stemTo[1]) / 2)} ${f(stemTo[0])} ${f(stemTo[1])}" stroke="${C.leaf}" stroke-width="${o.stem ?? 3.2}" stroke-linecap="round" fill="none"/>`;
    // Underside: from rim to rim through the foot.
    const under = [];
    for (let a = 180; a >= 0; a -= 10) under.push(rim(a));
    const l = rim(180), r = rim(0);
    s += `<path d="M${f(l[0])} ${f(l[1])}Q${f(R([cx - rx * 0.5, cy + depth * 0.92])[0])} ${f(R([cx - rx * 0.5, cy + depth * 0.92])[1])} ${f(foot[0])} ${f(foot[1])}Q${f(R([cx + rx * 0.5, cy + depth * 0.92])[0])} ${f(R([cx + rx * 0.5, cy + depth * 0.92])[1])} ${f(r[0])} ${f(r[1])}Z" fill="${C.leaf}"/>`;
    // The underside's own shade: its right half, a tone down.
    s += `<path d="M${f(foot[0])} ${f(foot[1])}Q${f(R([cx + rx * 0.5, cy + depth * 0.92])[0])} ${f(R([cx + rx * 0.5, cy + depth * 0.92])[1])} ${f(r[0])} ${f(r[1])}L${f(R([cx + rx * 0.1, cy])[0])} ${f(R([cx + rx * 0.1, cy])[1])}Z" fill="${C.water}" opacity="0.3"/>`;
    // Face.
    const face = [];
    for (let a = 0; a < 360; a += 6) face.push(rim(a));
    s += poly(face, C.leafHi);
    // The far half of the face lies in the funnel's own shade.
    const far = [];
    for (let a = 188; a <= 352; a += 6) far.push(rim(a));
    for (let a = 352; a >= 188; a -= 6) far.push(rim(a, 0.34 + 0.2 * Math.sin(rad(a - 188) * (180 / 164))));
    s += poly(far, C.leaf, ' opacity="0.55"');
    // Veins from the middle.
    const n = o.veins ?? 13;
    const mid = [cx + (o.lean ?? 0) * 0.3, cy + ry * 0.12];
    for (let k = 0; k < n; k += 1) {
        const a = (k / n) * 360 + 12;
        const tip = rim(a, 0.9);
        s += line(R(mid), tip, C.leaf, 0.8, ' opacity="0.7"');
    }
    // The near rim rolled over.
    const [a1, a2] = o.roll ?? [24, 122];
    const roll = [];
    for (let a = a1; a <= a2; a += 4) roll.push(rim(a, 1.02));
    for (let a = a2; a >= a1; a -= 4) roll.push(rim(a, 1 - (o.rollDepth ?? 0.34) * Math.sin(Math.PI * ((a - a1) / (a2 - a1)))));
    s += poly(roll, C.leaf);
    return s;
}

/* ---- the flower: every petal grows from one point, the top of the stem ---- */
const B = [205, 266];
/** The whole flower leans this many degrees to the right: it grows, it is not set up straight. */
const TILT = 7;
/**
 * One petal: a pointed oval along a centreline that leaves the base at `phi0` degrees from upright
 * (clockwise) and turns by `curl` degrees over its length, so petals cup upward. One half of it,
 * along the centreline, is the shade.
 */
function petal(phi0, curl, L, W, fill, shade, side, shadeOpacity = 1) {
    const N = 26, ds = L / N;
    let x = B[0], y = B[1];
    const mid = [], left = [], right = [];
    for (let i = 0; i <= N; i += 1) {
        const t = i / N, phi = rad(TILT + phi0 + curl * t);
        const w = (W / 2) * Math.sin(Math.PI * t ** 0.78);
        mid.push([x, y]);
        left.push([x - Math.cos(phi) * w, y - Math.sin(phi) * w]);
        right.push([x + Math.cos(phi) * w, y + Math.sin(phi) * w]);
        const pm = rad(TILT + phi0 + curl * (t + 0.5 / N));
        x += Math.sin(pm) * ds;
        y -= Math.cos(pm) * ds;
    }
    const all = [...left, ...right.reverse()];
    const half = side < 0 ? [...left, ...mid.slice().reverse()] : [...mid, ...right];
    return { s: poly(all, fill) + poly(half, shade, shadeOpacity < 1 ? ` opacity="${shadeOpacity}"` : ''), pts: all };
}
/** A layer of petals about the flower's base: its box holds every petal and the base. */
function ring(name, list) {
    const ps = list.map(a => petal(...a));
    const xs = [B[0], ...ps.flatMap(p => p.pts.map(q => q[0]))], ys = [B[1], ...ps.flatMap(p => p.pts.map(q => q[1]))];
    const x0 = Math.floor(Math.min(...xs)) - 2, y0 = Math.floor(Math.min(...ys)) - 2;
    const x1 = Math.ceil(Math.max(...xs)) + 2, y1 = Math.ceil(Math.max(...ys)) + 2;
    svg(name, [x0, y0, x1 - x0, y1 - y0], ps.map(p => p.s).join(''), B);
}

/* ---- pond: the water, its bands, the far leaves and the leaves lying in the middle distance, duckweed ---- */
{
    const rnd = seeded(11);
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.water}"/>`;
    // Bands of lighter water: short and thin far off, long and thick near.
    for (let i = 0; i < 46; i += 1) {
        const d = rnd() ** 0.8;
        const y = -2 + d * 452;
        const w = (14 + rnd() * 34) * (0.5 + d * 1.5);
        const h = 1.6 + d * 2.6;
        const x = -20 + rnd() * 390 - w / 2;
        s += bar(x, y, w, h, C.waterLo, ` opacity="${f(0.55 + rnd() * 0.45)}"`);
    }
    // Far leaves: small, flat, quiet.
    const far = [
        [250, 26, 26, -4, 200], [318, 50, 34, 3, 310], [176, 40, 18, 0, 20], [22, 58, 30, 5, 250], [206, 96, 30, -3, 140],
        [150, 128, 22, 4, 300], [336, 150, 24, -6, 60], [118, 186, 36, 2, 215],
    ];
    for (const [cx, cy, rx, tilt, notch] of far) s += pad(cx, cy, rx, tilt, notch, { flat: 0.3, veins: 9, veinOpacity: 0.4, veinWidth: 0.6, opacity: 0.9, phase: cx });
    // Leaves on the water in the middle distance.
    s += pad(136, 312, 60, -3, 235, { veins: 13, veinOpacity: 0.55, phase: 1 });
    s += pad(268, 304, 42, 4, 330, { veins: 11, veinOpacity: 0.55, phase: 2 });
    s += pad(176, 436, 44, -2, 300, { veins: 11, veinOpacity: 0.55, phase: 4 });
    // Duckweed: small bright dots in loose drifts.
    for (const [cx, cy, n, sx, sy] of [[214, 352, 13, 30, 9], [92, 356, 9, 22, 6], [300, 258, 8, 20, 5], [60, 168, 7, 18, 4], [236, 150, 6, 16, 4], [228, 420, 9, 20, 7]]) {
        for (let i = 0; i < n; i += 1) {
            const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
            s += dot(cx + Math.cos(a) * r * sx, cy + Math.sin(a) * r * sy, 0.9 + rnd() * 1.5, C.leafHi, ` opacity="${f(0.6 + rnd() * 0.4)}"`);
        }
    }
    svg('pond', [-6, -6, 372, 462], s);
}

/* ---- moon: its reflection, broken by the water into flat bars of unequal length, and the glitter under it ---- */
{
    const cx = 92, cy = 82;
    let s = '';
    // A disc cut into six bars: short, long, longest, long, short; two of them parted by the water.
    for (const [dy, w, h, gap, off] of [[-25, 26, 4, 0, 1], [-15, 48, 5, 0, -2], [-4.5, 58, 6, 0.62, 1], [6.5, 58, 5.5, 0, -1], [16.5, 46, 5, 0.3, 2], [26, 24, 3.6, 0, -1]]) {
        const x = cx - w / 2 + off;
        if (gap > 0) s += bar(x, cy + dy, w * gap - 3, h, C.moon) + bar(x + w * gap + 3, cy + dy, w * (1 - gap) - 3, h, C.moon);
        else s += bar(x, cy + dy, w, h, C.moon);
    }
    // Two long thin strokes of light trailing toward the viewer.
    s += bar(cx - 30, cy + 50, 44, 1.8, C.moon, ' opacity="0.5"') + bar(cx - 2, cy + 72, 58, 1.6, C.moon, ' opacity="0.32"');
    svg('moon', [58, 54, 94, 106], s);
}

/* ---- ripples: three thin rings on the water where the stem stands, each its own layer ---- */
const RIP = [200, 394];
[[70, 19], [94, 25], [116, 30]].forEach(([rx, ry], i) => {
    const s = `<ellipse cx="${RIP[0]}" cy="${RIP[1]}" rx="${rx}" ry="${ry}" fill="none" stroke="${C.moon}" stroke-width="${f(1.5 - i * 0.2)}" stroke-dasharray="${[`${f(rx * 1.7)} ${f(rx * 0.22)}`, `${f(rx * 0.9)} ${f(rx * 0.16)} ${f(rx * 1.4)} ${f(rx * 0.3)}`, `${f(rx * 1.2)} ${f(rx * 0.25)}`][i]}"/>`;
    svg(`rip-${i + 1}`, [RIP[0] - rx - 2, RIP[1] - ry - 2, 2 * rx + 4, 2 * ry + 4], s);
});

/* ---- far things on stems: two small closed buds and a seed pod ---- */
{
    const smallBud = (x, y, h, lean, stemTo) => {
        const w = h * 0.46;
        const P = pts => pts.map(([px, py]) => rot([x + px * w, y - py * h], [x, y], lean));
        const shape = k => {
            const out = [];
            for (let i = 0; i <= 12; i += 1) { const t = i / 12; out.push([-0.5 * k * Math.sin(Math.PI * t ** 0.8), t]); }
            for (let i = 12; i >= 0; i -= 1) { const t = i / 12; out.push([0.5 * Math.sin(Math.PI * t ** 0.8), t]); }
            return out;
        };
        const halfShape = [];
        for (let i = 0; i <= 12; i += 1) { const t = i / 12; halfShape.push([0.12 * Math.sin(Math.PI * t ** 0.8), t]); }
        for (let i = 12; i >= 0; i -= 1) { const t = i / 12; halfShape.push([0.5 * Math.sin(Math.PI * t ** 0.8), t]); }
        return `<path d="M${f(x)} ${f(y)}Q${f((x + stemTo[0]) / 2 + 3)} ${f((y + stemTo[1]) / 2)} ${f(stemTo[0])} ${f(stemTo[1])}" stroke="${C.leaf}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
            poly(P(shape(1)), C.pink) + poly(P(halfShape), C.rose) + bar(stemTo[0] - 7, stemTo[1] - 1, 14, 1.6, C.moon, ' opacity="0.5"');
    };
    let s = smallBud(282, 86, 27, 8, [278, 132]);
    s += smallBud(36, 150, 40, -8, [44, 240]);
    // Seed pod: a flat-topped cone on a bent stem, its seeds dark in the top.
    const pc = [318, 118], tilt = 16;
    const R = p => rot(p, pc, tilt);
    const ell = (rx, ry, dy = 0) => { const o = []; for (let a = 0; a < 360; a += 12) o.push(R([pc[0] + Math.cos(rad(a)) * rx, pc[1] + dy + Math.sin(rad(a)) * ry])); return o; };
    const foot = R([pc[0], pc[1] + 26]);
    s += `<path d="M${f(foot[0])} ${f(foot[1])}Q${f(foot[0] - 2)} ${f(foot[1] + 40)} 316 216" stroke="${C.leaf}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
    s += poly([R([pc[0] - 18, pc[1]]), R([pc[0] - 5, pc[1] + 27]), R([pc[0] + 5, pc[1] + 27]), R([pc[0] + 18, pc[1]])], C.leaf);
    s += poly(ell(18, 6.5), C.leafHi);
    for (const [dx, dy] of [[-10, -1], [-3, -3], [5, -2], [11, 1], [1, 2.4], [-6, 2.6]]) { const p = R([pc[0] + dx, pc[1] + dy]); s += `<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="2" ry="1.2" fill="${C.water}" opacity="0.75"/>`; }
    svg('far', [14, 54, 330, 190], s, [180, 244]);
}

/* ---- two leaves standing over the water behind the flower ---- */
svg('leaf-l', [-6, 196, 160, 190], funnel(66, 238, 74, 24, 38, 7, [58, 384], { phase: 1, bow: -5 }), [58, 384]);
svg('leaf-r', [226, 186, 140, 160], funnel(300, 226, 64, 10, 30, -11, [296, 344], { phase: 2.5, roll: [10, 150], rollDepth: 0.8, veins: 9, bow: 5 }), [296, 344]);

/* ---- the big bud's stem, and the small ring where it stands in the water ---- */
svg('stem', [186, 258, 34, 146],
    `<path d="M${B[0]} ${B[1] - 2}Q${B[0] - 9} ${B[1] + 60} ${RIP[0]} ${RIP[1]}" stroke="${C.leafHi}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
    `<ellipse cx="${RIP[0]}" cy="${RIP[1]}" rx="11" ry="3.2" fill="none" stroke="${C.moon}" stroke-width="1.1" opacity="0.8"/>`);

/* ---- the petals, drawn open. Three rings, each in a left and a right layer that turn about the base;
   the outer ring is at the back and the deepest pink, the inner the palest. ---- */
const K = 1.33;
const P = (phi0, curl, L, W, ...rest) => [phi0, curl, L * K, W * K, ...rest];
// The lowest petal on the left has let go a little further than its partner on the right.
ring('outer-l', [P(-96, 62, 82, 29, C.pink, C.rose, -1), P(-64, 40, 96, 31, C.pink, C.rose, -1)]);
ring('outer-r', [P(78, -58, 88, 30, C.pink, C.rose, 1), P(62, -38, 97, 31, C.pink, C.rose, 1)]);
ring('mid-l', [P(-50, 44, 100, 31, C.pale, C.pink, -1), P(-38, 28, 106, 30, C.pale, C.pink, -1)]);
ring('mid-r', [P(48, -42, 101, 31, C.pale, C.pink, 1), P(36, -26, 107, 30, C.pale, C.pink, 1)]);
ring('inner-l', [P(-27, 30, 108, 29, C.pale, C.pink, -1, 0.6), P(-12, 8, 112, 28, C.pale, C.pink, -1, 0.6)]);
ring('inner-r', [P(25, -28, 109, 29, C.pale, C.pink, 1, 0.6), P(11, -7, 111, 28, C.pale, C.pink, 1, 0.6)]);
/* The cup: three short petals nearest the viewer, which stay closed about the middle. */
ring('cup', [P(-27, 36, 58, 30, C.pale, C.pink, -1, 0.75), P(26, -36, 58, 30, C.pale, C.pink, 1, 0.75), P(-3, 6, 47, 30, C.pale, C.pink, 1, 0.45)]);

/* ---- the middle of the flower: a fan of stamens and the flat seed head among them ---- */
{
    const base = rot([B[0] + 5, B[1] - 26 * K], B, TILT + 3);
    let s = '';
    const n = 23;
    for (let k = 0; k < n; k += 1) {
        const a = -60 + (k / (n - 1)) * 132;
        const len = (30 + 7 * Math.cos(rad(a * 1.2)) + (k % 3) * 2.2) * K;
        const tip = [base[0] + Math.sin(rad(a)) * len, base[1] - Math.cos(rad(a)) * len * 0.92];
        s += line(base, tip, C.gold, 0.9) + dot(tip[0], tip[1], 1.7, C.gold);
    }
    const top = base[1] - 27 * K;
    s += `<ellipse cx="${base[0]}" cy="${f(top)}" rx="${f(11.5 * K)}" ry="${f(4.8 * K)}" fill="${C.gold}"/>` + poly([[base[0] - 11.5 * K, top], [base[0] - 5, top + 16 * K], [base[0] + 5, top + 16 * K], [base[0] + 11.5 * K, top]], C.gold);
    for (const [dx, dy] of [[-6, -0.4], [-1, -1.8], [4.5, -1], [1.5, 1.6], [-3.4, 1.4], [7.4, 0.9]]) s += `<ellipse cx="${f(base[0] + dx * K)}" cy="${f(top + dy * K)}" rx="1.4" ry="0.9" fill="${C.leaf}"/>`;
    svg('stamen', [158, 172, 116, 66], s, base);
}

/* ---- the two leaves nearest the viewer, over the frame's lower corners ---- */
svg('front-l', [-6, 352, 206, 104], pad(54, 414, 142, -3, 318, { fill: C.leafHi, shade: C.leaf, shadeOpacity: 0.7, shadeFrom: 20, vein: C.leaf, veinOpacity: 0.75, veinWidth: 1, veins: 15, notchWidth: 7, phase: 0.6, roll: [228, 306], drops: [[250, 0.5, 5], [205, 0.62, 3], [350, 0.55, 3.6]] }));
svg('front-r', [222, 322, 144, 134], funnel(318, 366, 92, 27, 44, -7, [332, 462], { phase: 0.4, stem: 4, veins: 15, roll: [36, 138], bow: -3 }), [332, 456]);

/* ---- fireflies: two fields of small warm lights, each a core in a soft glow ---- */
{
    const glow = `<defs><radialGradient id="g"><stop offset="0" stop-color="${C.gold}" stop-opacity="0.55"/><stop offset="0.45" stop-color="${C.gold}" stop-opacity="0.16"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient></defs>`;
    const field = (seed, n, box) => {
        const rnd = seeded(seed);
        const got = [];
        let s = glow, guard = 0;
        while (got.length < n && guard < 4000) {
            guard += 1;
            const x = box[0] + 12 + rnd() * (box[2] - 24), y = box[1] + 12 + rnd() * (box[3] - 24);
            // Not over the flower's middle, and never two close together.
            if (((x - 205) / 46) ** 2 + ((y - 214) / 52) ** 2 < 1) continue;
            if (got.some(([gx, gy]) => Math.hypot(gx - x, gy - y) < 44)) continue;
            got.push([x, y]);
            const r = 1.2 + rnd() * 1.1;
            s += dot(x, y, r * 5.2, 'url(#g)') + dot(x, y, r, C.gold) + dot(x, y, r * 0.45, C.pale);
        }
        return s;
    };
    const fa = [8, 40, 344, 300], fb = [8, 70, 344, 320];
    svg('fire-a', fa, field(21, 15, fa));
    svg('fire-b', fb, field(47, 13, fb));
}

/* ---- fleck: one small light, scattered when the flower opens ---- */
svg('fleck', [201, 226, 8, 8], dot(205, 230, 1.8, C.gold));

console.log(JSON.stringify(boxes, null, 1).replace(/\n\s+(?=[\d\-\]])/g, ' '));
