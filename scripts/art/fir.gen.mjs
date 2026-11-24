// Generator for the "fir" wrapper art: a decorated fir tree seen from straight above, as a modern
// screen print. Four rings of boughs make one big rosette on a herringbone floor; every bough is two
// flat faces, one towards the light and one away from it. A cord of bulbs winds over the boughs from
// the rim to the top. Around the frame's edges: corners of parcels, a rug, a chair.
// No outline, no filter, no blend mode. The only gradients are alpha fades of light: the halo of a
// lit bulb, the light on the floor, the glow of the glint at the top.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/fir.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'fir');
if (!OUT.endsWith('wrappers/fir')) throw new Error('out dir must be public/wrappers/fir');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: five greens of the tree, brick red in two tones, cream, gold, three woods. */
const C = {
    deep: '#143326',
    moss: '#1F4D3A',
    mid: '#2E6B4A',
    light: '#4E9263',
    pale: '#86BC7E',
    brick: '#B23A26',
    brickLo: '#8A2A1B',
    cream: '#F3E9D2',
    gold: '#E6B34A',
    wood: '#CF9A62',
    woodLo: '#BF8850',
    woodDeep: '#6B4226',
};

const TAU = Math.PI * 2;
const f = n => String(Math.round(n * 100) / 100);
/** Points of paths are kept to a tenth of a unit: the art is small on a phone, and every figure is a byte. */
const f1 = n => String(Math.round(n * 10) / 10);
const pt = ([x, y]) => `${f1(x)} ${f1(y)}`;
const dOf = pts => `M${pts.map(pt).join('L')}Z`;
const poly = (pts, fill, extra = '') => `<path d="${dOf(pts)}" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const stop = (o, c, a) => `<stop offset="${f(o)}" stop-color="${c}" stop-opacity="${f(a)}"/>`;
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

/* ---- the tree: its centre (the top), and four rings of boughs, lowest and widest first ---- */
const CX = 180, CY = 215;
/** Where the light comes from (a unit vector pointing at it): above and to the left. */
const LIGHT = [-0.55, -0.83];
const RINGS = [
    { name: 'ring-1', R: 157, rin: 92, n: 19, shade: C.deep, lit: C.moss, seed: 11 },
    { name: 'ring-2', R: 119, rin: 62, n: 15, shade: C.moss, lit: C.mid, seed: 23 },
    { name: 'ring-3', R: 83, rin: 34, n: 11, shade: C.mid, lit: C.light, seed: 37 },
    { name: 'ring-4', R: 49, rin: 6, n: 7, shade: C.light, lit: C.pale, seed: 53 },
];
/** How far a ring's art may reach past its radius (its cast shade). */
const PAD = 8;
const ringBox = R => [CX - R - PAD, CY - R - PAD, 2 * (R + PAD), 2 * (R + PAD)];

/**
 * One bough seen from above: a tapering frond with five needles' worth of teeth down each side.
 * It starts at radius `r0`, points along `th` and ends at radius `r1`; `w` is half its width at the root.
 * Returns its two faces (left and right of the spine) and its whole outline.
 */
function bough(th, r0, r1, w) {
    const len = r1 - r0;
    const e = [Math.cos(th), Math.sin(th)], t = [-Math.sin(th), Math.cos(th)];
    const at = (u, v) => [CX + e[0] * (r0 + u) + t[0] * v, CY + e[1] * (r0 + u) + t[1] * v];
    const h = u => w * Math.max(0, 1 - u / len) ** 0.72;
    const side = [[0, w]];
    for (let k = 1; k <= 5; k += 1) {
        const u = (len * (k - 0.4)) / 5.6;
        side.push([u - len * 0.02, h(u) * 0.8], [u + len * 0.07, h(u) * 0.8 + w * 0.16 + 2], [u + len * 0.078, h(u + len * 0.078) * 0.8]);
    }
    const left = side.map(([u, v]) => at(u, -v)), right = side.map(([u, v]) => at(u, v));
    const root = at(0, 0), tip = at(len, 0);
    // The outline is the plain frond without its teeth: enough for a shade.
    return { left: [root, ...left, tip], right: [root, ...right, tip], outline: [at(0, -w), at(len * 0.45, -h(len * 0.45) - 2), tip, at(len * 0.45, h(len * 0.45) + 2), at(0, w)], t };
}
/** The boughs of one ring: a long row, and a shorter row on top of it, half a step round. */
function ringBoughs(ring) {
    const rnd = seeded(ring.seed);
    const out = [];
    for (const row of [0, 1]) {
        for (let i = 0; i < ring.n; i += 1) {
            const th = TAU * ((i + row * 0.5 + (rnd() - 0.5) * 0.2) / ring.n) + ring.seed;
            const reach = ring.rin + (ring.R - ring.rin) * (row === 0 ? 0.92 + 0.08 * rnd() : 0.66 + 0.08 * rnd());
            const w = ((Math.PI / ring.n) * (ring.rin + (ring.R - ring.rin) * 0.3) + 4) * (row === 0 ? 1.16 : 0.98);
            out.push(bough(th, ring.rin * 0.72, reach, w));
        }
    }
    return out;
}
const BOUGHS = RINGS.map(ringBoughs);
/** The two faces of each bough, the one that looks at the light in the lighter tone. */
function ringFaces(ring, boughs) {
    let s = '';
    for (const b of boughs) {
        const leftLit = -b.t[0] * LIGHT[0] - b.t[1] * LIGHT[1] > 0;
        s += poly(b.left, leftLit ? ring.lit : ring.shade) + poly(b.right, leftLit ? ring.shade : ring.lit);
    }
    return s;
}
/** The flat shape of a ring (every bough and the round they grow from), moved by (dx, dy): the shade it casts. */
function ringShade(ring, boughs, dx, dy, fill, opacity) {
    const moved = boughs.map(b => `<path d="${dOf(b.outline.map(([x, y]) => [x + dx, y + dy]))}"/>`).join('');
    return `<g fill="${fill}" opacity="${f(opacity)}">${moved}<circle cx="${f(CX + dx)}" cy="${f(CY + dy)}" r="${f(ring.rin + 2)}"/></g>`;
}

/* ---- the cord of bulbs: one spiral from the rim to the top, a little uneven, as hung by hand ---- */
const TURNS = 3.35;
const spiral = p => {
    // p runs 0 (rim) to 1 (top).
    const a = 2.2 + TAU * TURNS * p;
    const r = 134 - (134 - 17) * p + 3.2 * Math.sin(a * 5.3);
    return [CX + r * Math.cos(a), CY + r * Math.sin(a), r];
};
/** The ring a point at radius `r` lies on: the highest ring that reaches it. */
const ringAt = r => {
    let k = 0;
    for (let i = 0; i < RINGS.length; i += 1) if (RINGS[i].R * 0.93 >= r) k = i;
    return k;
};

/* ---- baubles: round ornaments on the boughs, spread unevenly (never two over one) ---- */
const BAUBLES = [];
{
    const rnd = seeded(71);
    const tones = [C.brick, C.gold, C.cream];
    const counts = [8, 6, 4, 1];
    let n = 0;
    RINGS.forEach((ring, k) => {
        const inner = k + 1 < RINGS.length ? RINGS[k + 1].R + 9 : 26;
        const outer = ring.R - 20;
        for (let i = 0; i < counts[k]; i += 1) {
            const a = TAU * ((i + 0.2 + rnd() * 0.6) / counts[k]) + k * 1.3 + 0.5;
            const r = inner + (outer - inner) * (0.15 + 0.7 * rnd());
            BAUBLES.push({ k, x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), r: 7.2 - k * 0.6, fill: tones[n % 3] });
            n += 1;
        }
    });
}
/** A bauble from above: a flat round, one hard-edged shade on the side away from the light, its cap a dot. */
function bauble(b) {
    const a0 = -0.35, a1 = 2.15;
    const p0 = [b.x + b.r * Math.cos(a0), b.y + b.r * Math.sin(a0)], p1 = [b.x + b.r * Math.cos(a1), b.y + b.r * Math.sin(a1)];
    const lune = `<path d="M${pt(p0)}A${f(b.r)} ${f(b.r)} 0 0 1 ${pt(p1)}A${f(b.r * 1.5)} ${f(b.r * 1.5)} 0 0 0 ${pt(p0)}Z" fill="${C.deep}" opacity="0.3"/>`;
    return circle(b.x + 1.6, b.y + 2.4, b.r, C.deep, ' opacity="0.45"') + circle(b.x, b.y, b.r, b.fill) + lune + circle(b.x, b.y, 1.5, b.fill === C.gold ? C.cream : C.gold);
}

/** The bulbs along the cord, at even steps of its length, clear of the baubles. */
const BULBS = [];
{
    const STEP = 21.5;
    const tones = [C.gold, C.cream, C.gold, C.brick];
    let run = STEP * 0.5, prev = spiral(0), n = 0;
    for (let i = 1; i <= 4000; i += 1) {
        const q = spiral(i / 4000);
        run += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
        prev = q;
        if (run < STEP) continue;
        run = 0;
        if (BAUBLES.some(b => Math.hypot(b.x - q[0], b.y - q[1]) < b.r + 6)) continue;
        BULBS.push({ x: q[0], y: q[1], k: ringAt(q[2]), fill: tones[n % 4], n });
        n += 1;
    }
}
/** The cord itself, cut where it passes from one ring to the next: each ring carries its own lengths. */
function cord(k) {
    const runs = [];
    let cur = null;
    for (let i = 0; i <= 280; i += 1) {
        const q = spiral(i / 280);
        if (ringAt(q[2]) === k) {
            if (!cur) runs.push((cur = []));
            cur.push([q[0], q[1]]);
        } else cur = null;
    }
    return runs.filter(r => r.length > 1).map(r => `<path d="M${r.map(pt).join('L')}" fill="none" stroke="${C.deep}" stroke-width="1.3" stroke-opacity="0.85"/>`).join('');
}

/** An eight-ray glint: four long rays up, down and to the sides, four short ones between, a narrow waist. */
function glint(x, y, long, short, waist, fill, extra = '') {
    const pts = [];
    for (let i = 0; i < 16; i += 1) {
        const a = (TAU * i) / 16 - Math.PI / 2;
        const r = i % 2 === 1 ? waist : i % 4 === 0 ? long : short;
        pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
    }
    return poly(pts, fill, extra);
}

/* ---- the rings: each casts a hard shade on what is under it, then its boughs, its cord, bulbs and baubles ---- */
RINGS.forEach((ring, k) => {
    let s = ringShade(ring, BOUGHS[k], 3, 5, C.deep, 0.5);
    s += circle(CX, CY, ring.rin + 2, ring.shade) + ringFaces(ring, BOUGHS[k]);
    s += cord(k);
    for (const b of BULBS) if (b.k === k) s += circle(b.x, b.y, 2.7, C.deep) + circle(b.x, b.y, 2, C.cream, ' opacity="0.62"');
    for (const b of BAUBLES) if (b.k === k) s += bauble(b);
    // The top of the tree: a small brass glint, not yet lit.
    if (k === RINGS.length - 1) s += glint(CX, CY, 13, 7.5, 3.4, C.deep) + glint(CX, CY, 10.5, 6, 2.6, C.woodLo);
    svg(ring.name, ringBox(ring.R), s);
});

/* ---- the lit bulbs, in three sets from the rim inwards: a halo of the bulb's colour, the bulb, a bright heart ---- */
{
    const defs = `<defs>${[['g', C.gold], ['c', C.cream], ['b', C.brick]].map(([id, col]) => `<radialGradient id="${id}">${stop(0, col, 0.75)}${stop(0.4, col, 0.34)}${stop(1, col, 0)}</radialGradient>`).join('')}</defs>`;
    const idOf = fill => (fill === C.gold ? 'g' : fill === C.cream ? 'c' : 'b');
    const lit = b => circle(b.x, b.y, 10.5, `url(#${idOf(b.fill)})`) + circle(b.x, b.y, 3.2, b.fill) + circle(b.x, b.y, 1.4, C.cream);
    const sets = [[0], [1], [2, 3]];
    sets.forEach((ks, i) => {
        const R = RINGS[ks[0]].R;
        svg(`lit-${i + 1}`, [CX - R, CY - R, 2 * R, 2 * R], defs + BULBS.filter(b => ks.includes(b.k)).map(lit).join(''));
    });
    // A second light on every third bulb, wider and paler: it comes and goes on its own time.
    const R = RINGS[0].R;
    const wide = BULBS.filter(b => b.n % 3 === 1).map(b => circle(b.x, b.y, 16, 'url(#w)') + glint(b.x, b.y, 6.5, 2.6, 1.1, C.cream)).join('');
    svg('sparkle', [CX - R, CY - R, 2 * R, 2 * R], `<defs><radialGradient id="w">${stop(0, C.cream, 0.6)}${stop(0.45, C.cream, 0.2)}${stop(1, C.cream, 0)}</radialGradient></defs>${wide}`);
}

/* ---- the floor: herringbone boards, the tree's shade, a rug, parcels, a chair ---- */
{
    const rnd = seeded(5);
    const W = 15, N = 4, L = W * N;
    let s = rect(-6, -6, 372, 462, C.wood);
    // Herringbone: boards lie across and along in steps; the whole floor is then turned by 45 degrees.
    const cos = Math.SQRT1_2, sin = Math.SQRT1_2;
    const seen = (x, y, w, h) => {
        // The board's middle, turned as the group is turned, must be near the canvas and not deep under the tree.
        const mx = x + w / 2 - CX, my = y + h / 2 - 225;
        const X = CX + mx * cos - my * sin, Y = 225 + mx * sin + my * cos;
        if (X < -40 || X > 400 || Y < -40 || Y > 490) return false;
        return Math.hypot(X - CX, Y - CY) > 96;
    };
    let across = '', along = '', dark = '';
    for (let k = -40; k <= 40; k += 1) {
        for (let m = -12; m <= 12; m += 1) {
            const hx = CX + (k + m * N) * W, hy = 225 + (k - m * N) * W;
            if (seen(hx, hy, L, W)) {
                across += `<rect x="${f(hx)}" y="${f(hy)}" width="${L}" height="${W}"/>`;
                if (rnd() < 0.22) dark += `<rect x="${f(hx)}" y="${f(hy)}" width="${L}" height="${W}"/>`;
            }
            const vx = hx + L, vy = hy + W - L;
            if (seen(vx, vy, W, L)) {
                along += `<rect x="${f(vx)}" y="${f(vy)}" width="${W}" height="${L}"/>`;
                if (rnd() < 0.22) dark += `<rect x="${f(vx)}" y="${f(vy)}" width="${W}" height="${L}"/>`;
            }
        }
    }
    s += `<g transform="rotate(45 ${CX} 225)" stroke="${C.woodDeep}" stroke-width="0.9" stroke-opacity="0.42"><g fill="${C.wood}">${across}</g><g fill="${C.woodLo}">${along}</g><g fill="${C.woodDeep}" fill-opacity="0.16">${dark}</g></g>`;

    // The rug: its corner comes in from the top right and runs under the tree.
    s += `<g transform="rotate(7 250 140)">${rect(118, -80, 330, 404, C.woodDeep, ' opacity="0.3"')}${rect(112, -86, 330, 404, C.brick)}${rect(126, -72, 302, 376, C.brickLo)}<rect x="133" y="-65" width="288" height="362" fill="none" stroke="${C.cream}" stroke-width="2.4"/><rect x="143.5" y="-54.5" width="267" height="341" fill="none" stroke="${C.gold}" stroke-width="5"/>${rect(151, -47, 252, 326, C.brick)}</g>`;

    // The chair: a corner of its seat in the top left, one splayed leg showing past it.
    s += `<g transform="rotate(-24 12 20)">${rect(-50, -44, 104, 104, C.woodDeep, ' rx="16" opacity="0.3" transform="translate(7 9)"')}${poly([[30, 40], [70, 58], [66, 68], [38, 62]], C.woodDeep, ' opacity="0.3" transform="translate(6 8)"')}${poly([[30, 40], [70, 58], [66, 68], [38, 62]], C.woodDeep)}${rect(-56, -50, 104, 104, C.woodDeep, ' rx="16"')}${rect(-44, -38, 80, 80, C.moss, ' rx="10"')}${rect(-36, -30, 64, 64, C.mid, ' rx="7"')}</g>`;

    // Parcels: plain paper, plain ribbon. Each is a flat rectangle with a hard shade beside it.
    const parcel = (cx, cy, w, h, turn, paper, ribbon, o = {}) => {
        let p = rect(cx - w / 2 + 6, cy - h / 2 + 8, w, h, C.woodDeep, ' opacity="0.38"') + rect(cx - w / 2, cy - h / 2, w, h, paper);
        if (o.stripes) for (let x = cx - w / 2 + o.stripes; x < cx + w / 2 - 2; x += o.stripes * 2) p += rect(x, cy - h / 2, Math.min(o.stripes, cx + w / 2 - x), h, o.stripe, ' opacity="0.5"');
        const bx = cx + (o.along ?? 0), by = cy + (o.across ?? 0), rw = o.rw ?? 9;
        p += rect(bx - rw / 2, cy - h / 2, rw, h, ribbon);
        if (o.two) p += rect(cx - w / 2, by - rw / 2, w, rw, ribbon);
        if (o.bow) {
            const loop = sgn => `<g transform="rotate(${sgn * 28} ${f(bx)} ${f(by)})"><ellipse cx="${f(bx + sgn * 17)}" cy="${f(by)}" rx="16" ry="8.5" fill="${ribbon}"/><ellipse cx="${f(bx + sgn * 18.5)}" cy="${f(by)}" rx="9" ry="3.6" fill="${paper}"/></g>`;
            p += loop(1) + loop(-1) + circle(bx, by, 6, ribbon) + circle(bx, by, 6, C.deep, ' opacity="0.3"');
        }
        return `<g transform="rotate(${turn} ${f(cx)} ${f(cy)})">${p}</g>`;
    };
    s += parcel(322, 26, 74, 58, 24, C.cream, C.moss, { along: 8, rw: 8, stripes: 5, stripe: C.gold });
    s += parcel(6, 252, 62, 96, -8, C.gold, C.brick, { along: 6, rw: 10 });
    s += parcel(338, 352, 58, 104, 17, C.moss, C.gold, { along: -9, rw: 8, stripes: 7, stripe: C.mid });
    s += parcel(62, 404, 132, 98, -13, C.cream, C.moss, { two: true, bow: true, along: 18, across: -12, rw: 11 });
    s += parcel(292, 428, 104, 78, 9, C.brick, C.cream, { along: -14, rw: 9, stripes: 6, stripe: C.brickLo });
    s += parcel(186, 444, 62, 48, -5, C.moss, C.gold, { along: -12, rw: 7 });

    // The tree's shade on the floor: its lowest ring, moved away from the light.
    s += ringShade(RINGS[0], BOUGHS[0], 9, 14, C.woodDeep, 0.42);
    svg('floor', [-6, -6, 372, 462], s);
}

/* ---- the light the lit tree throws on the floor: a soft round, drawn small and shown large ---- */
{
    const R = 100;
    svg('warm', [CX - R, CY - R, 2 * R, 2 * R], `<defs><radialGradient id="f">${stop(0, C.gold, 0.4)}${stop(0.6, C.cream, 0.28)}${stop(0.82, C.gold, 0.18)}${stop(1, C.gold, 0)}</radialGradient></defs>${circle(CX, CY, R, 'url(#f)')}`);
}

/* ---- the glint at the top: a halo, then eight gold rays with a cream heart ---- */
{
    const R = 76;
    svg('halo', [CX - R, CY - R, 2 * R, 2 * R], `<defs><radialGradient id="h">${stop(0, C.gold, 0.8)}${stop(0.32, C.gold, 0.36)}${stop(1, C.gold, 0)}</radialGradient></defs>${circle(CX, CY, R, 'url(#h)')}`);
    const K = 50;
    svg('glint', [CX - K, CY - K, 2 * K, 2 * K], glint(CX, CY, 48, 26, 6.4, C.gold) + glint(CX, CY, 24, 12, 3.2, C.cream));
    svg('fleck', [CX - 4, CY - 4, 8, 8], poly([[CX, CY - 4], [CX + 4, CY], [CX, CY + 4], [CX - 4, CY]], C.gold));
}

process.stdout.write(Object.entries(BOXES).map(([k, b]) => `${k}: [${b.join(', ')}]`).join('\n') + '\n');
