// Generator for the "confetti" wrapper art: a party ceiling seen from straight below, in flat cut
// paper. Twisted crepe streamers and two strings of plain pennants cross a coffered charcoal ceiling
// with a warm lamp in each corner; across the middle hangs a banded drop-bag, roped at its upper
// corners and packed with paper, shut by one cord with a pull ring. Behind the bag is the ceiling rose.
// Flat fills, one hard-edged shade per form, no outline drawing, no filter, no blend mode; the only
// gradients are the lamps' glows (alpha stops). Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas) and
// prints the boxes and pivots the definition (src/wrappers/confetti.ts) carries.
// Run: node scripts/art/confetti.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'confetti');
if (!OUT.endsWith('wrappers/confetti')) throw new Error('out dir must be public/wrappers/confetti');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: three charcoals for the ceiling, two golds, two ivories, the one hot colour in two tones, lamp light. */
const C = {
    char: '#221E27',
    charLo: '#141117',
    charHi: '#342E3B',
    gold: '#E8B84A',
    goldLo: '#B8862F',
    ivory: '#F6EEDD',
    ivoryLo: '#D6C8AC',
    hot: '#F0356B',
    hotLo: '#B81F4C',
    lamp: '#FFD98A',
};

const f = n => String(Math.round(n * 100) / 100);
const rad = d => (d * Math.PI) / 180;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
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

/**
 * A crepe streamer along the curve `at(t)`, twisted `twists` half-turns: each half-turn is one lens of
 * paper, its two sides in the two tones of the colour.
 */
function ribbon(at, width, a, b, twists, first = 0) {
    let s = '';
    const STEPS = 10;
    for (let k = 0; k < twists; k++) {
        const left = [], right = [];
        for (let i = 0; i <= STEPS; i++) {
            const u = i / STEPS, t = (k + u) / twists;
            const [x, y] = at(t), [x2, y2] = at(Math.min(1, t + 0.002)), [x1, y1] = at(Math.max(0, t - 0.002));
            const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
            const w = (width / 2) * Math.max(0.1, Math.sin(Math.PI * u) ** 0.55);
            left.push([x - (dy / len) * w, y + (dx / len) * w]);
            right.push([x + (dy / len) * w, y - (dx / len) * w]);
        }
        s += poly([...left, ...right.reverse()], (k + first) % 2 ? b : a);
    }
    return s;
}
/** A line from one point to another that sags by `sag` in the middle. */
const sagging = ([x0, y0], [x1, y1], sag) => t => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];

/* ---- ceiling: charcoal coffers, a lamp and its light in each corner ---- */
const LAMPS = [[42, 44], [318, 44], [42, 408], [318, 408]];
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.char}"/>`;
    // Coffers: square panels, each a lighter frame round a recessed field. The middle one is under the rose.
    for (let i = -2; i <= 2; i++)
        for (let j = -3; j <= 3; j++) {
            const x = 180 + i * 96 - 42, y = 225 + j * 96 - 42;
            s += `<rect x="${x}" y="${y}" width="84" height="84" fill="${C.charHi}"/><rect x="${x + 7}" y="${y + 7}" width="70" height="70" fill="${(i + j) % 2 ? C.char : C.charLo}"/>`;
        }
    let defs = '';
    LAMPS.forEach(([x, y], i) => {
        defs += `<radialGradient id="l${i}" gradientUnits="userSpaceOnUse" cx="${x}" cy="${y}" r="118"><stop offset="0" stop-color="${C.lamp}" stop-opacity="0.62"/><stop offset="0.35" stop-color="${C.lamp}" stop-opacity="0.3"/><stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/></radialGradient>`;
        s += circle(x, y, 118, `url(#l${i})`);
    });
    for (const [x, y] of LAMPS) s += circle(x, y, 24, C.goldLo) + circle(x, y, 20, C.gold) + circle(x, y, 14.5, C.ivory) + circle(x, y, 6, C.lamp);
    svg('ceiling', [-6, -6, 372, 462], `<defs>${defs}</defs>${s}`);
}

/* ---- the ceiling rose behind the bag, and the light that comes on round it ---- */
const MID = [180, 225];
{
    const [cx, cy] = MID;
    let s = '';
    // A scalloped rim: sixteen petals, alternately in the two golds.
    const N = 16;
    for (let i = 0; i < N; i++) {
        const a0 = rad((i * 360) / N), a1 = rad(((i + 1) * 360) / N), am = (a0 + a1) / 2;
        const pts = [[cx, cy]];
        for (let k = 0; k <= 8; k++) {
            const a = a0 + ((a1 - a0) * k) / 8, r = 50 + 9 * Math.sin((Math.PI * k) / 8);
            pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
        s += poly(pts, i % 2 ? C.gold : C.goldLo);
        void am;
    }
    s += circle(cx, cy, 41, C.charLo) + circle(cx, cy, 37, C.ivory) + circle(cx, cy, 30, C.hot) + circle(cx, cy, 27, C.ivory) + circle(cx, cy, 15, C.lamp) + circle(cx, cy, 8, C.ivory);
    svg('rose', [cx - 62, cy - 62, 124, 124], s);
    const R = 132;
    svg('halo', [cx - R, cy - R, 2 * R, 2 * R], `<defs><radialGradient id="h" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${R}"><stop offset="0" stop-color="${C.lamp}" stop-opacity="0.7"/><stop offset="0.45" stop-color="${C.lamp}" stop-opacity="0.3"/><stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/></radialGradient></defs>${circle(cx, cy, R, 'url(#h)')}`);
}

/* ---- the net of streamers: crepe ribbons from wall to wall, crossing, none through the middle ---- */
const TIE_L = [30, 225], TIE_R = [330, 225];
/** The strapped upper outer corner of each half of the bag: where its rope holds it, and what it swings about. */
const HOLD_L = [44, 186], HOLD_R = [316, 186];
{
    let s = '';
    const run = (p0, p1, sag, a, b, twists, w = 11) => (s += ribbon(sagging(p0, p1, sag), w, a, b, twists));
    run([-14, 22], [374, 168], 14, C.gold, C.goldLo, 15);
    run([-14, 156], [374, 14], 18, C.hot, C.hotLo, 16);
    run([236, -14], [374, 214], 10, C.ivory, C.ivoryLo, 9, 9);
    run([128, -14], [-14, 212], 10, C.ivory, C.ivoryLo, 9, 9);
    run([-14, 296], [374, 446], 16, C.ivory, C.ivoryLo, 16);
    run([-14, 442], [374, 290], 14, C.hot, C.hotLo, 16);
    run([-14, 372], [140, 464], 8, C.gold, C.goldLo, 7, 9);
    run([374, 368], [222, 464], 8, C.gold, C.goldLo, 7, 9);
    // The ropes the bag is tied to the walls with.
    for (const [gx, gy, wx] of [[HOLD_L[0], HOLD_L[1], -8], [HOLD_R[0], HOLD_R[1], 368]]) s += `<path d="M${gx} ${gy}L${wx} ${gy - 22}" fill="none" stroke="${C.goldLo}" stroke-width="3.2"/>`;
    svg('net', [-6, -6, 372, 462], s);
}

/* ---- two strings of plain pennants, one above the bag and one below ---- */
function garland(name, p0, p1, sag, n, len, tones, box) {
    const at = sagging(p0, p1, sag);
    let s = '';
    let line = '';
    for (let i = 0; i <= 40; i++) {
        const [x, y] = at(i / 40);
        line += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
    }
    for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, half = 0.36 / n;
        const [xa, ya] = at(t - half), [xb, yb] = at(t + half), [xm, ym] = at(t);
        // Each pennant hangs square to its string; the pennants are not all one length.
        const dx = xb - xa, dy = yb - ya, d = Math.hypot(dx, dy), L = len * (0.86 + 0.28 * ((i * 7) % 5) / 4);
        const tip = [xm - (dy / d) * L, ym + (dx / d) * L];
        const [a, b] = tones[i % tones.length];
        s += poly([[xa, ya], [xm, ym], tip], a) + poly([[xm, ym], [xb, yb], tip], b);
    }
    s = `<path d="${line}" fill="none" stroke="${C.ivoryLo}" stroke-width="1.6"/>` + s;
    svg(name, box, s, [box[0] + box[2] / 2, box[1]]);
}
const TONES = [[C.gold, C.goldLo], [C.ivory, C.ivoryLo], [C.hot, C.hotLo]];
garland('garland-a', [-22, 70], [382, 84], 24, 11, 27, TONES, [-22, 64, 404, 76]);
garland('garland-b', [-22, 330], [382, 318], 22, 11, 27, [TONES[2], TONES[0], TONES[1]], [-22, 312, 404, 76]);

/* ---- the drop-bag: a banded sack held by a rope at each upper outer corner, bulging with paper, split
   down its seam. Each half is its own layer and swings about its strapped corner. The upper part of every band is in
   the light tone, the lower part in the shade. ---- */
const SEAM = 180, BULGE = 66;
{
    /** Half the bag's height at `u` (0 at its outer end, 1 at the seam): a full sack with rounded corners, lumpy with what is in it. */
    const corner = u => (u < 0.13 ? 0.5 + 0.5 * Math.sqrt(1 - (1 - u / 0.13) ** 2) : 1);
    const halfHeight = (u, side) => corner(u) * (BULGE * (0.84 + 0.16 * Math.sin((Math.PI / 2) * u)) + 2.8 * Math.sin(u * Math.PI * (side > 0 ? 3.5 : 4.5)) * Math.sin(u * Math.PI) ** 0.5);
    /** Bands across the sack, from the tie to the seam: mostly ivory, two hot and one gold. */
    const CUTS = [0, 0.17, 0.31, 0.47, 0.6, 0.76, 0.9, 1];
    const FILL = [[C.ivory, C.ivoryLo], [C.hot, C.hotLo], [C.ivory, C.ivoryLo], [C.gold, C.goldLo], [C.ivory, C.ivoryLo], [C.hot, C.hotLo], [C.ivory, C.ivoryLo]];
    /** Where the shade begins, as a part of the half height below the middle. */
    const SHADE = 0.34;
    const half = (name, tie, hold, dir) => {
        const span = Math.abs(SEAM - tie[0]);
        const X = u => tie[0] + dir * span * u;
        let s = '';
        for (let k = 0; k < 7; k++) {
            const us = [];
            for (let i = 0; i <= 8; i++) us.push(CUTS[k] + ((CUTS[k + 1] - CUTS[k]) * i) / 8);
            const up = us.map(u => [X(u), tie[1] - halfHeight(u, -1)]);
            const mid = us.map(u => [X(u), tie[1] + SHADE * halfHeight(u, 1) + 5 * Math.sin(u * Math.PI)]);
            const low = us.map(u => [X(u), tie[1] + halfHeight(u, 1)]);
            s += poly([...up, ...mid.slice().reverse()], FILL[k][0]) + poly([...mid, ...low.reverse()], FILL[k][1]);
        }
        // A gold hem down the seam.
        const top = tie[1] - halfHeight(1, -1), bottom = tie[1] + halfHeight(1, 1);
        s += `<rect x="${f(dir > 0 ? SEAM - 7 : SEAM)}" y="${f(top)}" width="7" height="${f(bottom - top)}" fill="${dir > 0 ? C.gold : C.goldLo}"/>`;
        // Paper pushing out through the seam.
        const peek = dir > 0 ? [[-3, -40, 20, C.hot], [-2, 34, -28, C.gold]] : [[2, -18, 30, C.gold], [3, 48, -16, C.hot]];
        for (const [ox, oy, turn, col] of peek) s += `<rect x="${f(SEAM + ox - 6)}" y="${f(tie[1] + oy - 4)}" width="12" height="8" fill="${col}" transform="rotate(${turn} ${f(SEAM + ox)} ${f(tie[1] + oy)})"/>`;
        // The strap round the corner that the rope holds it by.
        s += `<path d="M${hold[0] + dir * 14} ${hold[1] - 25}L${hold[0] - dir * 13} ${hold[1] + 12}" fill="none" stroke="${C.goldLo}" stroke-width="6.5"/>`;
        const x0 = Math.min(tie[0] - dir * 4, SEAM + dir * 9), x1 = Math.max(tie[0] - dir * 4, SEAM + dir * 9);
        svg(name, [x0, tie[1] - BULGE - 6, x1 - x0, 2 * BULGE + 12], s, hold);
    };
    half('bag-l', TIE_L, HOLD_L, 1);
    half('bag-r', TIE_R, HOLD_R, -1);
}

/* ---- the cord down the seam, and its pull ring ---- */
{
    const [cx, cy] = MID;
    let s = `<rect x="${cx - 1.6}" y="${cy - BULGE - 2}" width="3.2" height="${2 * BULGE + 4}" fill="${C.charLo}"/>`;
    // Two knots, unevenly placed, and the ring: a dark band under the gold so it reads on ivory.
    s += circle(cx, cy - 44, 4, C.charLo) + circle(cx, cy + 52, 4, C.charLo);
    s += `<circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="${C.charLo}" stroke-width="9"/><circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="${C.gold}" stroke-width="5.5"/>`;
    s += `<path d="M${cx - 10.6} ${cy + 10.6}A15 15 0 0 0 ${cx + 10.6} ${cy + 10.6}" fill="none" stroke="${C.goldLo}" stroke-width="5.5"/>`;
    svg('ring', [cx - 21, cy - BULGE - 3, 42, 2 * BULGE + 6], s, [cx, cy - BULGE - 3]);
}

/* ---- three streamer rolls that drop and uncoil: thin ribbons hanging from above, a last turn of the roll
   at the end of each ---- */
{
    const roll = (name, x, y1, sway, a, b, twists) => {
        const at = t => [x + sway * Math.sin(t * Math.PI * 2.2), -8 + (y1 + 8) * t];
        const [ex, ey] = at(1);
        const s = ribbon(at, 15, a, b, twists) + `<circle cx="${f(ex)}" cy="${f(ey + 6)}" r="6.5" fill="none" stroke="${a}" stroke-width="4"/>`;
        svg(name, [x - 14, -8, 28, y1 + 24], s, [x, -8]);
    };
    roll('roll-a', 108, 296, 5, C.hot, C.hotLo, 8);
    roll('roll-b', 262, 346, -5, C.gold, C.goldLo, 9);
    roll('roll-c', 312, 232, 4, C.ivory, C.ivoryLo, 6);
}

/* ---- confetti: sheets of cut paper. Every layer is drawn in one small box round the middle of the canvas
   and is scaled up by the stage as it comes down; the nearer the layer, the larger its sheets. ---- */
const CBOX = [105, 130, 150, 190];
{
    const sheet = (rnd, x, y, size, col, lo) => {
        const turn = Math.round(rnd() * 180), kind = Math.floor(rnd() * 5);
        const tr = ` transform="rotate(${turn} ${f(x)} ${f(y)})"`;
        const w = size, h = size * (0.5 + rnd() * 0.25);
        if (kind === 0) return `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" fill="${col}"${tr}/>`;
        // A sheet seen at a slant.
        if (kind === 1) return poly([[x - w / 2, y - h / 2], [x + w / 2 - h * 0.5, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2 + h * 0.5, y + h / 2]], col, tr);
        if (kind === 2) return circle(x, y, size * 0.36, col);
        // A curl of paper.
        if (kind === 3) return `<path d="M${f(x - w / 2)} ${f(y)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x + w / 2)} ${f(y)}" fill="none" stroke="${col}" stroke-width="${f(size * 0.26)}"${tr}/>`;
        // A sheet with one corner folded over.
        return `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" fill="${col}"${tr}/>` + poly([[x + w / 2, y - h / 2], [x + w / 2 - h * 0.7, y - h / 2], [x + w / 2, y + h * 0.2]], lo, tr);
    };
    const COLS = [[C.gold, C.goldLo], [C.ivory, C.ivoryLo], [C.hot, C.hotLo]];
    /** `n` sheets of about `size`, kept inside the box and (when `hole` is given) out of its middle. */
    const field = (name, seed, n, size, cols, hole = 0) => {
        const rnd = seeded(seed);
        const [bx, by, bw, bh] = CBOX, pad = size * 0.75;
        const placed = [];
        let s = '';
        for (let tries = 0; placed.length < n && tries < 4000; tries++) {
            const x = bx + pad + rnd() * (bw - 2 * pad), y = by + pad + rnd() * (bh - 2 * pad);
            if (Math.hypot(x - MID[0], y - MID[1]) < hole) continue;
            if (placed.some(([px, py]) => Math.hypot(px - x, py - y) < size * 1.35)) continue;
            placed.push([x, y]);
            const [col, lo] = cols[placed.length % cols.length];
            s += sheet(rnd, x, y, size * (0.75 + rnd() * 0.5), col, lo);
        }
        svg(name, CBOX, s, MID);
    };
    // The far sheets stay in the air once the rest has gone by; the gold ones among them are their own layer, to twinkle.
    field('far', 11, 34, 5.2, [COLS[1], COLS[2], COLS[1], COLS[2]], 34);
    field('far-g', 29, 9, 6, [COLS[0]], 38);
    field('fall-a', 3, 16, 9, COLS, 18);
    field('fall-b', 47, 11, 13, [COLS[2], COLS[0], COLS[1]], 22);
    field('fall-c', 71, 8, 17, [COLS[0], COLS[1], COLS[2]], 26);
    field('fall-d', 5, 6, 22, [COLS[1], COLS[2], COLS[0]], 30);
}

/* ---- bit: one small gold sheet, for the burst when the bag splits ---- */
svg('bit', [175, 222, 10, 6], `<rect x="175" y="222" width="10" height="6" fill="${C.gold}"/>`);

for (const [name, b] of Object.entries(boxes)) console.log(name.padEnd(10), JSON.stringify(b.box), b.origin ? `origin ${JSON.stringify(b.origin)}` : '');
