// Generator for the "aurora" wrapper art: a polar night on snow. Three flat snow hills with hard-edged
// shade, a frozen lake, black spruce, a small A-frame cabin; over them a deep sky of small stars and,
// once open, three curtains of light. No outline, no filter, no blend mode. The only gradients are
// alpha fades of light: the sky near the horizon, the rays of the curtains, the lamp.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/aurora.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'aurora');
if (!OUT.endsWith('wrappers/aurora')) throw new Error('out dir must be public/wrappers/aurora');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two skies and a black, the two lights of the aurora, three snows, the lamp. */
const C = {
    night: '#07101F',
    dusk: '#12284A',
    ink: '#03070F',
    green: '#3DF0B0',
    violet: '#8A5CF6',
    snow: '#DCE8F5',
    snowShade: '#9DB4D6',
    snowDeep: '#5E7BA8',
    lamp: '#FFB454',
};

const f = n => String(Math.round(n * 100) / 100);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(pt).join('L')}Z" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const bar = (x, y, w, h, fill, extra = '') => rect(x, y, w, h, fill, ` rx="${f(h / 2)}"${extra}`);
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const stop = (o, c, a) => `<stop offset="${f(o)}" stop-color="${c}" stop-opacity="${f(a)}"/>`;
/** A four-pointed glint, `k` from centre to tip. */
const glint = (x, y, k, fill, extra = '') => poly([[x, y - k], [x + k * 0.2, y - k * 0.2], [x + k, y], [x + k * 0.2, y + k * 0.2], [x, y + k], [x - k * 0.2, y + k * 0.2], [x - k, y], [x - k * 0.2, y - k * 0.2]], fill, extra);
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
function along(fn, x0, x1, step = 6) {
    const out = [];
    for (let x = x0; x < x1; x += step) out.push([x, fn(x)]);
    out.push([x1, fn(x1)]);
    return out;
}
/** Smooth noise in 0..1 along x: random values at whole numbers, eased between. */
function noise(seed) {
    const rnd = seeded(seed), v = Array.from({ length: 96 }, () => rnd());
    return x => {
        const i = Math.floor(x), t = x - i, s = t * t * (3 - 2 * t);
        const a = v[((i % 96) + 96) % 96], b = v[(((i + 1) % 96) + 96) % 96];
        return a + (b - a) * s;
    };
}

/* ---- the land, as lines: where each ridge runs. Everything standing on a hill asks its ridge for the height. ---- */
const HORIZON = 262;
const shore = spline([[-6, 262], [60, 258], [130, 263], [200, 259], [280, 264], [366, 260]]);
const hillB = spline([[140, 346], [200, 327], [250, 313], [300, 303], [340, 297], [366, 294]]);
const hillA = spline([[-6, 297], [30, 289], [80, 293], [130, 306], [190, 326], [250, 346], [300, 362], [366, 380]]);
const hillC = spline([[-6, 376], [60, 383], [140, 374], [230, 353], [300, 340], [366, 333]]);
/** The body of a hill: under its ridge from x0 to x1, down to `bottom`. */
const under = (fn, x0, x1, bottom, fill, extra = '') => poly([...along(fn, x0, x1), [x1, bottom], [x0, bottom]], fill, extra);
/** A band lying on a hill: from `top(x)` under the ridge down to `low(x)` under it. */
const band = (fn, x0, x1, top, low, fill, extra = '') => poly([...along(x => fn(x) + top(x), x0, x1), ...along(x => fn(x) + low(x), x0, x1).reverse()], fill, extra);

/** The sky's green lying on a crest: a broad wash, strongest at the ridge, thinning downhill in soft steps. */
const glowOn = (fn, x0, x1) => [6, 14, 24, 36, 50].map(d => band(fn, x0, x1, () => 0, x => d * (0.75 + 0.35 * Math.sin(x / 47 + d)), C.green, ' opacity="0.026"')).join('');

/**
 * A black spruce in silhouette: a narrow spire of drooping boughs, never the same on both sides.
 * `x` is the trunk, `base` where it stands, `h` its height, `lean` how wide it is for its height.
 */
function spruce(x, base, h, seed, lean = 0.13) {
    const rnd = seeded(seed), tiers = Math.max(5, Math.min(15, Math.round(h / 8.5))), top = base - h, W = h * lean + 3.5;
    const side = dir => {
        const out = [];
        for (let i = 0; i < tiers; i += 1) {
            const k = (i + 1) / tiers, y = top + (h - 3) * k ** 0.92, step = (h - 3) / tiers;
            const w = W * (0.16 + 0.84 * k ** 0.85) * (0.78 + 0.4 * rnd());
            out.push([x + dir * w * 0.36, y - step * 0.62], [x + dir * w, y + step * 0.1 * rnd()]);
        }
        out.push([x + dir * 1.3, base - 3], [x + dir * 1.3, base + 3]);
        return out;
    };
    return poly([[x, top], ...side(-1), ...side(1).reverse()], C.ink);
}

/* ---- sky: night above, lighter toward the horizon, and low down a faint band of green with one quiet arc in it ---- */
{
    let s = `<defs><linearGradient id="n" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${HORIZON}">${stop(0, C.night, 1)}${stop(0.4, C.night, 1)}${stop(1, C.dusk, 1)}</linearGradient>`;
    s += `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="${HORIZON}">${stop(0, C.green, 0)}${stop(0.55, C.green, 0.2)}${stop(1, C.green, 0.58)}</linearGradient><linearGradient id="r" x1="0" y1="1" x2="0" y2="0">${stop(0, C.green, 0.8)}${stop(0.3, C.green, 0.4)}${stop(1, C.green, 0)}</linearGradient></defs>`;
    s += rect(-6, -6, 372, 276, 'url(#n)') + rect(-6, 150, 372, 120, 'url(#g)');
    // The arc: two flat bows, one inside the other.
    const bow = (rise, thick, a) => {
        const lo = spline([[-6, 250], [90, 250 - rise * 0.8], [180, 250 - rise], [270, 250 - rise * 0.8], [366, 250]]);
        return poly([...along(lo, -6, 366), ...along(x => lo(x) - thick, -6, 366).reverse()], C.green, ` opacity="${a}"`);
    };
    s += bow(34, 26, 0.16) + bow(30, 10, 0.2);
    // A first hint of a curtain, low and faint: a short run of rays standing on the arc, always there.
    {
        const rnd = seeded(83), fold = noise(84), hem = spline([[58, 232], [110, 214], [160, 220], [214, 204], [268, 212], [312, 228]]);
        for (let x = 58; x < 311;) {
            const w = Math.min(312 - x, rnd() < 0.55 ? 2.6 + 3 * rnd() : 6 + 9 * rnd()), mid = x + w / 2;
            const edge = Math.min(1, (mid - 58) / 60, (312 - mid) / 60), a = (0.08 + 0.34 * fold(mid / 22) ** 1.5) * (0.6 + 0.5 * rnd()) * edge;
            const h = 46 + 50 * fold(mid / 15 + 7) + 10 * rnd(), y = Math.max(hem(x), hem(x + w));
            if (a > 0.02) s += poly([[x, hem(x)], [x + w + 0.3, hem(x + w)], [x + w + 0.3, y - h], [x, y - h]], 'url(#r)', ` opacity="${f(a)}"`);
            x += w;
        }
    }
    svg('sky', [-6, -6, 372, 276], s);
}

/* ---- stars: two layers of small ones that twinkle against each other; many lie along one slanting band ---- */
{
    const field = (name, seed, n, glints) => {
        const rnd = seeded(seed);
        let s = '';
        for (let i = 0; i < n; i += 1) {
            let x, y;
            if (i % 2 === 0) {
                // On the band, from low left to high right.
                const t = rnd(), off = (rnd() + rnd() + rnd() - 1.5) * 44;
                x = 20 + 320 * t + off * 0.4;
                y = 150 - 135 * t + off;
            } else {
                x = 6 + 348 * rnd();
                y = 6 + 176 * rnd() ** 1.3;
            }
            if (x < 4 || x > 356 || y < 4 || y > 186) continue;
            const r = 0.45 + 0.95 * rnd() ** 2.2;
            s += circle(x, y, r, C.snow, ` opacity="${f(0.5 + 0.5 * rnd())}"`);
        }
        for (const [x, y, k] of glints) s += glint(x, y, k, C.snow);
        svg(name, [0, 0, 360, 190], s);
    };
    field('stars-a', 11, 78, [[84, 46, 5.5], [296, 118, 4]]);
    field('stars-b', 29, 70, [[236, 30, 4.5], [48, 128, 3.5]]);
}

/* ---- the curtains of light. Each is one ribbon standing on a curved hem: many rays side by side, of
   unequal width, height and strength, each brightest at the hem and thinning to nothing at its top.
   Slow noise along the ribbon gathers the rays into folds; quick noise sets one ray against the next. ---- */
function curtain(name, o) {
    const hem = spline(o.hem), [x0, x1] = [o.hem[0][0], o.hem[o.hem.length - 1][0]];
    const rnd = seeded(o.seed), fold = noise(o.seed + 1), tall = noise(o.seed + 2);
    // How strong the ribbon is along its length: it thins out toward an end that hangs in the open sky.
    const env = x => Math.min(1, o.fadeL ? (x - x0) / o.fadeL : 1, o.fadeR ? (x1 - x) / o.fadeR : 1);
    const top = o.box[1] + 2;
    let s = `<defs><linearGradient id="r" x1="0" y1="1" x2="0" y2="0">${o.stops.map(([at, c, a]) => stop(at, c, a)).join('')}</linearGradient></defs>`;
    // The body of the ribbon under the rays, faint, so that a dim ray is still part of the cloth.
    {
        const hi = x => Math.max(top, hem(x) - o.height(x) * 0.82);
        const cut = [];
        for (let x = x0; x < x1 - 1; x += 24) cut.push([x, Math.min(x + 24, x1)]);
        for (const [a, b] of cut) s += poly([[a, hem(a)], [b + 0.3, hem(b)], [b + 0.3, hi(b)], [a, hi(a)]], 'url(#r)', ` opacity="${f(0.16 * env((a + b) / 2))}"`);
    }
    let x = x0;
    while (x < x1 - 1) {
        const pick = rnd();
        const w = Math.min(x1 - x, pick < 0.5 ? 2.4 + 3 * rnd() : pick < 0.84 ? 5.4 + 5 * rnd() : 10.5 + 8 * rnd());
        const mid = x + w / 2;
        // A ribbon seen along its own length (where the hem runs steeply) is many rays deep: brighter there.
        const steep = Math.min(1, Math.abs(hem(mid + 2) - hem(mid - 2)) / 4);
        const g = fold(mid / 24), strength = Math.max(0.07, Math.min(1, (0.06 + 0.94 * g ** 1.4) * (0.55 + 0.6 * rnd()) * (0.8 + 0.8 * steep))) * env(mid);
        const h = o.height(mid) * (0.62 + 0.42 * tall(mid / 17) + 0.16 * (rnd() - 0.5));
        const ya = hem(x), yb = hem(x + w), hi = Math.max(top, Math.min(ya, yb) - h);
        if (strength > 0.03) {
            s += poly([[x, ya], [x + w + 0.3, yb], [x + w + 0.3, hi], [x, hi]], 'url(#r)', ` opacity="${f(strength)}"`);
            // The hem under a bright ray only: a hair of light, so the hem is broken and never one line.
            if (strength > 0.34) s += poly([[x, ya], [x + w + 0.3, yb], [x + w + 0.3, yb - 0.8], [x, ya - 0.8]], o.stops[0][1], ` opacity="${f(Math.min(0.8, (strength - 0.3) * 1.3))}"`);
        }
        x += w;
    }
    svg(name, o.box, s);
}
// Green, nearest and lowest: from the left horizon it climbs in folds to the middle of the sky.
curtain('curtain-1', {
    seed: 5, box: [-6, 20, 244, HORIZON - 20], fadeR: 72,
    hem: [[-6, 250], [28, 228], [58, 196], [92, 184], [124, 198], [154, 172], [186, 156], [214, 168], [236, 160]],
    height: x => 116 + 16 * Math.sin(x / 50),
    stops: [[0, C.green, 0.96], [0.05, C.green, 0.84], [0.26, C.green, 0.52], [0.62, C.green, 0.2], [1, C.green, 0]],
});
// Green turning violet, further off: from the right horizon up and over the first.
curtain('curtain-2', {
    seed: 17, box: [94, -4, 272, HORIZON + 4], fadeL: 72,
    hem: [[96, 96], [130, 108], [164, 96], [198, 106], [232, 134], [262, 148], [292, 136], [318, 168], [344, 212], [366, 246]],
    height: x => 108 + 14 * Math.sin(x / 38 + 1),
    stops: [[0, C.green, 0.94], [0.06, C.green, 0.8], [0.3, C.green, 0.46], [0.5, C.violet, 0.38], [0.78, C.violet, 0.17], [1, C.violet, 0]],
});
// Violet, furthest and highest: a waving band right across the top of the sky.
curtain('curtain-3', {
    seed: 41, box: [-6, -6, 372, HORIZON + 6],
    hem: [[-6, 98], [40, 72], [84, 82], [130, 54], [180, 46], [226, 62], [270, 48], [318, 62], [366, 42]],
    height: x => 58 + 8 * Math.sin(x / 44),
    stops: [[0, C.violet, 0.92], [0.07, C.violet, 0.76], [0.32, C.violet, 0.44], [0.7, C.violet, 0.16], [1, C.violet, 0]],
});

/* ---- far: a range of dark mountains on the horizon, the far shore with its small trees, the frozen
   lake, and the hill beyond it on the right ---- */
{
    const peaks = [[-6, 246], [16, 234], [38, 242], [64, 224], [90, 240], [116, 247], [148, 238], [176, 229], [204, 246], [232, 240], [262, 226], [290, 242], [318, 234], [344, 246], [366, 238]];
    let s = poly([...peaks, [366, 272], [-6, 272]], C.night);
    // One facet on the lee of each high peak.
    for (const i of [3, 7, 10, 12]) {
        const [px, py] = peaks[i], [nx, ny] = peaks[i + 1];
        s += poly([[px, py], [nx, ny], [nx - 8, ny + 10], [px + 3, py + 13]], C.snowDeep, ' opacity="0.3"');
    }
    s += under(shore, -6, 366, 276, C.snowDeep);
    // The lake: dark ice, a pale line along the far shore, and a few long cracks of lighter ice.
    s += rect(-6, 273, 372, 82, C.dusk) + rect(-6, 273, 372, 1.6, C.snowShade, ' opacity="0.5"');
    for (const [x, y, w] of [[96, 282, 58], [182, 279, 34], [236, 287, 76], [150, 296, 44], [214, 303, 30], [120, 309, 22], [286, 281, 40]]) s += bar(x, y, w, 1.4, C.snowDeep, ' opacity="0.45"');
    // Small trees on the far shore, in two stands.
    const rnd = seeded(73);
    for (const [a, b] of [[104, 176], [214, 262]]) for (let x = a; x < b; x += 4 + 5 * rnd()) s += spruce(x, shore(x) + 1, 6 + 9 * rnd(), Math.floor(rnd() * 1e6), 0.2);
    // The hill on the right, with its shade low down.
    s += under(hillB, 140, 366, 356, C.snowShade);
    s += band(hillB, 140, 366, x => 4 + (x - 140) * 0.1, () => 80, C.snowDeep, ' opacity="0.55"');
    svg('far', [-6, 220, 372, 136], s);
}

/* ---- reflect: the lights in the ice (each a few upright strokes fading downward, and fine level lines
   where the ice is ruffled), and the green lying along the right hill's crest ---- */
{
    let s = `<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1">${stop(0, C.green, 0.7)}${stop(1, C.green, 0)}</linearGradient><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">${stop(0, C.violet, 0.7)}${stop(1, C.violet, 0)}</linearGradient></defs>`;
    // Three strokes, no two alike: each a soft core inside a wider, fainter one.
    for (const [x, w, h, g, o] of [[100, 22, 44, 'a', 0.34], [190, 46, 62, 'a', 0.4], [254, 15, 40, 'b', 0.42]]) s += rect(x - w * 0.35, 274.6, w * 1.7, h, `url(#${g})`, ` opacity="${f(o * 0.45)}"`) + rect(x, 274.6, w, h * 0.86, `url(#${g})`, ` opacity="${o}"`);
    for (const [x, y, w, c] of [[176, 290, 70, C.green], [240, 283, 34, C.violet], [204, 301, 30, C.green], [96, 285, 30, C.green]]) s += bar(x, y, w, 1.3, c, ' opacity="0.4"');
    s += glowOn(hillB, 140, 366);
    svg('reflect', [-6, 272, 372, 84], s);
}

/* ---- near: the hill the cabin stands on, the near hill across the foot of the frame, and the ski
   tracks that climb to the door ---- */
const DOOR = [139, 336];
const NEAR = [-6, 284, 372, 172];
{
    let s = under(hillA, -6, 366, 456, C.snowShade) + under(hillA, -6, 366, 456, C.snow, ' opacity="0.5"');
    // Shade on its lee, under the crest, and in the hollow on the left.
    s += band(hillA, 96, 366, x => 5 + (x - 96) * 0.03, x => 5 + (x - 96) * 0.19, C.snowDeep, ' opacity="0.34"');
    s += `<path d="M-6 314C30 308 74 318 116 344C80 340 40 348 -6 356Z" fill="${C.snowDeep}" opacity="0.26"/>`;
    s += under(hillC, -6, 366, 456, C.snow);
    s += band(hillC, 120, 366, () => 7, x => 7 + (x - 120) * 0.13, C.snowShade, ' opacity="0.75"');
    // A long drift across the foot, and a smaller one over it.
    s += `<path d="M-6 404C40 398 96 410 150 428C190 441 214 450 236 456H-6Z" fill="${C.snowShade}"/>`;
    s += `<path d="M-6 426C30 424 70 436 104 456H-6Z" fill="${C.snowDeep}" opacity="0.55"/>`;
    s += `<path d="M286 456C304 432 332 414 366 406V456Z" fill="${C.snowShade}" opacity="0.8"/>`;
    // Ski tracks: two fine lines, drawing together as they go away.
    {
        const P = [[262, 456], [252, 404], [182, 384], DOOR];
        const at = t => {
            const u = 1 - t, b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
            const d = [-3 * u * u, 3 * u * u - 6 * u * t, 6 * u * t - 3 * t * t, 3 * t * t];
            const p = [0, 1].map(k => P.reduce((a, q, i) => a + q[k] * b[i], 0)), v = [0, 1].map(k => P.reduce((a, q, i) => a + q[k] * d[i], 0));
            const len = Math.hypot(v[0], v[1]);
            return { p, n: [-v[1] / len, v[0] / len] };
        };
        for (const side of [-1, 1]) {
            const l = [], r = [];
            for (let i = 0; i <= 28; i += 1) {
                const t = i / 28, { p, n } = at(t), gap = 8.5 - 6.6 * t, w = 1.5 - 1.05 * t, c = side * gap;
                l.push([p[0] + n[0] * (c - w), p[1] + n[1] * (c - w)]);
                r.push([p[0] + n[0] * (c + w), p[1] + n[1] * (c + w)]);
            }
            s += poly([...l, ...r.reverse()], C.snowDeep, ' opacity="0.8"');
        }
    }
    svg('near', NEAR, s);
}

/* ---- wash: the green of the sky lying on the snow, along each crest in two flat steps. The far hill's
   share is cut where the near hill stands in front of it. ---- */
{
    let s = `<defs><clipPath id="c"><path d="M${[[-6, 280], ...along(hillC, -6, 366), [366, 280]].map(pt).join('L')}Z"/></clipPath></defs>`;
    s += `<g clip-path="url(#c)">${glowOn(hillA, -6, 366)}</g>` + glowOn(hillC, -6, 366);
    svg('wash', [-6, 284, 372, 132], s);
}

/* ---- trees: the line of black spruce along the crests, left and right of the open middle, and the cabin ---- */
const CABIN = { x: 146, top: 268, base: 336, half: 36 };
const WINDOW = [152, 311, 11, 12];
{
    let s = '';
    const stand = (fn, list) => list.map(([x, h, seed]) => spruce(x, fn(x) + 3, h, seed)).join('');
    s += stand(hillA, [[8, 92, 3], [23, 136, 4], [37, 66, 5], [51, 108, 6], [66, 50, 7], [79, 82, 8], [94, 38, 9], [104, 24, 10]]);
    s += stand(hillB, [[254, 30, 21], [266, 46, 22], [281, 80, 23], [296, 54, 24], [313, 118, 25], [328, 84, 26], [345, 128, 27], [358, 70, 28]]);
    // The cabin: an A-frame. Two slabs of snow on the roof, a dark face, a door a little to the left, a window.
    const { x, top, base, half } = CABIN;
    s += poly([[x, top + 12], [x - half + 7, base], [x + half - 7, base]], C.dusk);
    s += poly([[x, top + 12], [x - half + 7, base], [x - half + 13, base], [x, top + 24]], C.ink, ' opacity="0.5"');
    s += poly([[x, top], [x - half, base], [x - half + 9, base], [x, top + 16]], C.snow);
    s += poly([[x, top], [x + half, base], [x + half - 9, base], [x, top + 16]], C.snowShade);
    // Chimney on the lee slope, with its cap of snow.
    s += rect(x + 12, top + 14, 7, 16, C.ink) + rect(x + 10.5, top + 11.5, 10, 3.5, C.snow);
    s += rect(DOOR[0] - 6.5, base - 22, 13, 22, C.ink) + rect(...WINDOW, C.ink);
    // The drift the cabin stands in.
    s += `<path d="M${x - half - 10} ${base + 1}C${x - half} ${base - 5} ${x - 14} ${base - 2} ${DOOR[0] - 8} ${base}L${DOOR[0] + 8} ${base}C${x + 18} ${base - 3} ${x + half} ${base - 5} ${x + half + 12} ${base + 3}Z" fill="${C.snow}"/>`;
    svg('trees', [-6, 152, 372, 192], s);
}

/* ---- lamp: the window lit, a line of light under the door, and the window's light lying on the snow ---- */
{
    const [wx, wy, ww, wh] = WINDOW, base = CABIN.base;
    let s = `<defs><radialGradient id="p">${stop(0, C.lamp, 0.6)}${stop(0.5, C.lamp, 0.3)}${stop(1, C.lamp, 0)}</radialGradient></defs>`;
    s += `<ellipse cx="${f(wx + 6)}" cy="${base + 10}" rx="34" ry="9" fill="url(#p)"/>`;
    s += rect(wx, wy, ww, wh, C.lamp) + rect(wx + ww / 2 - 0.6, wy, 1.2, wh, C.ink) + rect(wx, wy + wh / 2 - 0.6, ww, 1.2, C.ink);
    s += rect(DOOR[0] - 6.5, base - 1.4, 13, 1.4, C.lamp);
    svg('lamp', [122, 308, 72, 48], s);
}

/* ---- glow: the lamp's light in the cold air, one colour fading out ---- */
{
    const cx = WINDOW[0] + WINDOW[2] / 2, cy = WINDOW[1] + WINDOW[3] / 2, R = 52;
    svg('glow', [cx - R, cy - R, 2 * R, 2 * R], `<defs><radialGradient id="h">${stop(0, C.lamp, 0.62)}${stop(0.3, C.lamp, 0.26)}${stop(1, C.lamp, 0)}</radialGradient></defs>${circle(cx, cy, R, 'url(#h)')}`);
}

/* ---- fore: big spruce close by, in the two bottom corners ---- */
svg('fore-l', [-6, 318, 96, 138], spruce(20, 470, 148, 61, 0.2) + spruce(62, 474, 104, 62, 0.2));
svg('fore-r', [304, 350, 62, 106], spruce(342, 472, 118, 63, 0.2));

/* ---- fleck: a small glint, scattered high up when the sky is alight ---- */
svg('fleck', [176, 66, 8, 8], glint(180, 70, 4, C.snow));

const area = Object.values(BOXES).reduce((a, b) => a + b[2] * b[3], 0) / (360 * 450);
console.log(Object.entries(BOXES).map(([k, b]) => `${k}: [${b.join(', ')}]`).join('\n'));
console.log('area', area.toFixed(2), 'canvases');
