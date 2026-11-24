// Generator for the "candybox" wrapper art: a Chinese New Year tray of togetherness, drawn as a flat
// New Year poster seen from straight above. An octagonal red-lacquer box with a gold inlaid lid (a peony
// with cloud scrolls) sits on a deep red cloth with a woven gold border, laid at an angle over a
// vermilion table; around it a plum branch, two blank red packets, a tea cup with chopsticks and a pair
// of mandarins. Open, the box shows eight compartments about a centre well that holds a gold ingot.
// Flat fills, at most one hard-edged shade shape per form, no outline, no filter, no blend mode; the only
// gradient is the gold glow of the well. No character, letter, digit or mark of any script anywhere.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas) and
// prints the boxes and pivots the definition (src/wrappers/candybox.ts) carries.
// Run: node scripts/art/candybox.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'candybox');
if (!OUT.endsWith('wrappers/candybox')) throw new Error('out dir must be public/wrappers/candybox');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two reds and the room's deepest red, two golds, ink, cream, leaf green, mandarin, two plum pinks. */
const C = {
    red: '#C8102E',
    lacq: '#8E0B21',
    deep: '#3A0710',
    gold: '#F2C14E',
    ochre: '#B9822A',
    ink: '#1A0F0F',
    cream: '#F7E8C8',
    green: '#2F7A4A',
    orange: '#F08A24',
    pink: '#F4A3B5',
    rose: '#D9577A',
};

const f = n => String(Math.round(n * 100) / 100);
const rad = d => (d * Math.PI) / 180;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const dot = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ell = (x, y, rx, ry, deg, fill, extra = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(deg)} ${f(x)} ${f(y)})" fill="${fill}"${extra}/>`;
const stroke = (pts, col, w, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"${extra}/>`;
const boxes = {};
function svg(name, box, inner, origin) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
    boxes[name] = origin ? { box, origin: [Math.round(((origin[0] - x) / w) * 1000) / 1000, Math.round(((origin[1] - y) / h) * 1000) / 1000] } : { box };
}
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
/** An octagon about (cx, cy) with circumradius r, flat sides at top, bottom and both flanks. */
const oct = (cx, cy, r, turn = 0) => Array.from({ length: 8 }, (_, k) => [cx + r * Math.cos(rad(22.5 + 45 * k + turn)), cy + r * Math.sin(rad(22.5 + 45 * k + turn))]);
/** A quadratic-curve path through points (smooth closed blob). */
function blob(pts, fill, extra = '') {
    const n = pts.length;
    const mid = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    let d = `M${f(mid(0)[0])} ${f(mid(0)[1])}`;
    for (let i = 1; i <= n; i += 1) d += `Q${f(pts[i % n][0])} ${f(pts[i % n][1])} ${f(mid(i)[0])} ${f(mid(i)[1])}`;
    return `<path d="${d}Z" fill="${fill}"${extra}/>`;
}

/* The box's centre: the focus of the wrapper. */
const TX = 180, TY = 226, R = 112;
const OCT_HALF = R * Math.cos(rad(22.5));

/* ---- the table and the cloth: vermilion table, a deep red cloth laid at an angle with a woven gold border ---- */
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.red}"/>`;
    // Faint lacquer-red cloud scrolls on the table where it shows, at the corners.
    const CL = { cx: 180, cy: 234, half: 206, turn: -9 };
    const sq = (h) => [[-h, -h], [h, -h], [h, h], [-h, h]].map(([x, y]) => rot([CL.cx + x, CL.cy + y], [CL.cx, CL.cy], CL.turn));
    s += poly(sq(CL.half), C.lacq);
    // The woven border: a gold band, a row of two-tone woven squares, a gold band.
    s += poly(sq(CL.half - 12), C.gold) + poly(sq(CL.half - 26), C.lacq);
    let weave = '';
    const a = CL.half - 22, b = CL.half - 16; // the woven row lies between these two insets
    const step = 6;
    for (let side = 0; side < 4; side += 1) {
        for (let t = -a + 3, k = 0; t < a - 3; t += step, k += 1) {
            for (let row = 0; row < 2; row += 1) {
                if ((k + row) % 2 === 0) continue;
                const off = row === 0 ? -b : -b + 3; // two staggered rows: over, under
                const x = t, y = off;
                const pts = [[x, y], [x + step - 1, y], [x + step - 1, y + 3], [x, y + 3]];
                const turned = pts.map(([px, py]) => {
                    const r0 = side * 90;
                    const c = Math.cos(rad(r0)), si = Math.sin(rad(r0));
                    return [CL.cx + px * c - py * si, CL.cy + px * si + py * c];
                });
                weave += poly(turned, C.ochre);
            }
        }
    }
    s += weave;
    // A second, fine gold line inside the border.
    s += poly(sq(CL.half - 32), C.gold) + poly(sq(CL.half - 34), C.lacq);
    svg('cloth', [-6, -6, 372, 462], s);
}

/* ---- the plum branch: dark wood from the top left corner, six open blossoms of five round petals, two buds ---- */
const BLOSSOMS = [];
{
    const box = [-6, -6, 250, 150];
    let s = '';
    // The main limb: a tapered band built from two edges.
    const limb = (pts, w0, w1) => {
        const L = [], Rr = [];
        for (let i = 0; i < pts.length; i += 1) {
            const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
            const dx = q[0] - o[0], dy = q[1] - o[1], len = Math.hypot(dx, dy) || 1;
            const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
            L.push([p[0] - (dy / len) * w, p[1] + (dx / len) * w]);
            Rr.push([p[0] + (dy / len) * w, p[1] - (dx / len) * w]);
        }
        return poly([...L, ...Rr.reverse()], C.ink);
    };
    s += limb([[-8, 98], [30, 82], [62, 76], [96, 58], [130, 52], [168, 34], [204, 26], [236, 14]], 13, 2.5);
    s += limb([[62, 76], [70, 104], [92, 122], [118, 128]], 6, 1.8);
    s += limb([[96, 58], [100, 34], [116, 14], [128, 2]], 5, 1.6);
    s += limb([[168, 34], [184, 46], [206, 52]], 3.5, 1.4);
    s += limb([[22, 86], [16, 60], [24, 38]], 5, 1.6);
    // Blossoms: five round petals, a rose middle with gold stamens.
    const flower = (cx, cy, r, turn) => {
        let o = '';
        for (let k = 0; k < 5; k += 1) {
            const a = turn + k * 72;
            o += dot(cx + Math.cos(rad(a)) * r * 0.62, cy + Math.sin(rad(a)) * r * 0.62, r * 0.52, C.pink);
        }
        o += dot(cx, cy, r * 0.36, C.rose);
        for (let k = 0; k < 6; k += 1) {
            const a = turn + 30 + k * 60;
            o += stroke([[cx, cy], [cx + Math.cos(rad(a)) * r * 0.5, cy + Math.sin(rad(a)) * r * 0.5]], C.gold, 0.9);
            o += dot(cx + Math.cos(rad(a)) * r * 0.52, cy + Math.sin(rad(a)) * r * 0.52, 1.1, C.gold);
        }
        BLOSSOMS.push([cx, cy, r]);
        return o;
    };
    const bud = (cx, cy, r) => dot(cx, cy, r, C.rose) + dot(cx - r * 0.3, cy - r * 0.3, r * 0.45, C.pink);
    s += flower(40, 82, 15, 10) + flower(98, 46, 13, 40) + flower(128, 62, 16, -8) + flower(80, 112, 12, 20) + flower(196, 30, 13, 55) + flower(22, 44, 11, -20);
    s += bud(118, 14, 5) + bud(218, 21, 4.5) + bud(118, 126, 4.5) + bud(160, 40, 4);
    svg('plum', box, s, [-6, 98]);
}

/* ---- two blank red packets, fanned, tucked under the right flank of the box ---- */
{
    const box = [254, 176, 112, 168];
    let s = '';
    const packet = (cx, cy, turn) => {
        const w = 52, h = 86;
        const P = pts => pts.map(p => rot([cx + p[0], cy + p[1]], [cx, cy], turn));
        let o = poly(P([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]), C.red);
        // The flap: one hard shade shape.
        o += poly(P([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, -h / 2 + 14], [0, -h / 2 + 24], [-w / 2, -h / 2 + 14]]), C.lacq, ' opacity="0.55"');
        // A plain gold band and a plain round knot.
        o += poly(P([[-w / 2, 4], [w / 2, 4], [w / 2, 12], [-w / 2, 12]]), C.gold);
        o += dot(...rot([cx, cy + 8], [cx, cy], turn), 7, C.gold) + dot(...rot([cx, cy + 8], [cx, cy], turn), 3, C.ochre);
        return o;
    };
    s += packet(318, 236, 18) + packet(300, 284, -8);
    svg('packets', box, s);
}

/* ---- a tea cup and a pair of chopsticks in the lower left ---- */
{
    const box = [-6, 316, 170, 140];
    let s = '';
    // Chopsticks: a pair lying across the corner, gold-banded at the top end, red-lacquered.
    const stick = (x0, y0, x1, y1, w0, w1) => {
        const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
        return poly([[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]], C.ink);
    };
    const band = (x0, y0, x1, y1, t0, t1, w) => {
        const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
        const a = [x0 + dx * t0, y0 + dy * t0], b = [x0 + dx * t1, y0 + dy * t1];
        return poly([[a[0] + nx * w, a[1] + ny * w], [b[0] + nx * w, b[1] + ny * w], [b[0] - nx * w, b[1] - ny * w], [a[0] - nx * w, a[1] - ny * w]], C.gold);
    };
    s += stick(-10, 446, 150, 340, 3.4, 1.6) + band(-10, 446, 150, 340, 0.12, 0.2, 3.3);
    s += stick(4, 458, 160, 354, 3.4, 1.6) + band(4, 458, 160, 354, 0.12, 0.2, 3.3);
    // The cup from above: a cream rim, a band of red, the tea.
    const cx = 62, cy = 378;
    s += dot(cx + 3, cy + 4, 31, C.lacq, ' opacity="0.6"');
    s += dot(cx, cy, 31, C.cream) + dot(cx, cy, 26.5, C.red) + dot(cx, cy, 24, C.cream) + dot(cx, cy, 20, C.ochre);
    s += ell(cx - 6, cy - 7, 7, 3, -35, C.gold, ' opacity="0.8"');
    svg('cup', box, s);
}

/* ---- the mandarins: a pair, lower right, with their leaves (the leaves are their own layer, to sway) ---- */
const MAND = [[286, 396, 32], [334, 364, 28]];
{
    const box = [248, 330, 118, 126];
    let s = '';
    for (const [x, y, r] of MAND) {
        s += dot(x + 3, y + 4, r, C.lacq, ' opacity="0.6"');
        s += dot(x, y, r, C.orange);
        // One hard-edged shade shape: the lower right crescent, the fruit less a circle shifted up and left.
        const pts = [];
        for (let a = -40; a <= 160; a += 8) pts.push([x + Math.cos(rad(a)) * r, y + Math.sin(rad(a)) * r]);
        for (let a = 150; a >= -30; a -= 8) pts.push([x - 7 + Math.cos(rad(a)) * r, y - 7 + Math.sin(rad(a)) * r]);
        s += poly(pts, C.red, ' opacity="0.3"');
        // Pores, a few, and the stem.
        const rnd = seeded(x * 7 + y);
        for (let k = 0; k < 7; k += 1) {
            const a = rnd() * 360, d = r * (0.2 + rnd() * 0.6);
            s += dot(x + Math.cos(rad(a)) * d, y + Math.sin(rad(a)) * d, 0.9, C.gold, ' opacity="0.7"');
        }
        s += dot(x - r * 0.18, y - r * 0.22, 3.2, C.green);
    }
    svg('mandarins', box, s);
}
{
    const box = [222, 318, 130, 90];
    const leaf = (bx, by, len, wid, turn) => {
        const P = pts => pts.map(p => rot([bx + p[0], by + p[1]], [bx, by], turn));
        const outline = [];
        for (let t = 0; t <= 1.0001; t += 0.1) outline.push([t * len, -Math.sin(Math.PI * t) * wid * (1 - 0.25 * t)]);
        for (let t = 1; t >= -0.0001; t -= 0.1) outline.push([t * len, Math.sin(Math.PI * t) * wid * (1 - 0.25 * t)]);
        let o = poly(P(outline), C.green);
        // One shade: the lower half.
        const half = [];
        for (let t = 0; t <= 1.0001; t += 0.1) half.push([t * len, Math.sin(Math.PI * t) * wid * (1 - 0.25 * t)]);
        o += poly(P(half), C.ink, ' opacity="0.22"');
        o += stroke(P([[2, 0], [len - 4, 0]]), C.ink, 0.9, ' opacity="0.35"');
        return o;
    };
    const s = leaf(279, 382, 50, 11, -150) + leaf(279, 382, 42, 9, -112) + leaf(328, 352, 40, 9, -70);
    svg('leaves', box, s, [290, 380]);
}

/* ---- the box's side: black lacquer showing below the lid, a hand's breadth deep ---- */
{
    const box = [TX - 106, TY - 104, 212, 218];
    let s = poly(oct(TX + 2, TY + 8, R), C.ink, '');
    s += poly(oct(TX, TY, R), C.ink);
    svg('side', box, s);
}

/* ---- the open tray: a red lacquer rim, eight compartments about a centre well ---- */
const KINDS = ['seeds', 'fruit', 'nuts', 'coins'];
{
    const box = [TX - 106, TY - 106, 212, 212];
    let s = '';
    s += poly(oct(TX, TY, R), C.gold) + poly(oct(TX, TY, R - 3), C.red) + poly(oct(TX, TY, R - 11), C.gold) + poly(oct(TX, TY, R - 13), C.deep);
    const inner = oct(TX, TY, R - 13);
    const WELL = 34;
    let defs = '';
    for (let k = 0; k < 8; k += 1) {
        const a = inner[k], b = inner[(k + 1) % 8];
        defs += `<clipPath id="c${k}">${poly([[TX, TY], a, b], C.ink)}</clipPath>`;
        const kind = KINDS[k % 4];
        const rnd = seeded(1000 + k * 37);
        // Candidate points inside the sector, outside the well, kept apart.
        const placed = [];
        const minD = { seeds: 7, fruit: 11, nuts: 10, coins: 12 }[kind];
        for (let tries = 0; tries < 900 && placed.length < 60; tries += 1) {
            let u = rnd(), v = rnd();
            if (u + v > 1) { u = 1 - u; v = 1 - v; }
            const p = [TX + (a[0] - TX) * u + (b[0] - TX) * v, TY + (a[1] - TY) * u + (b[1] - TY) * v];
            if (Math.hypot(p[0] - TX, p[1] - TY) < WELL + 2) continue;
            if (placed.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < minD)) continue;
            placed.push(p);
        }
        let c = '';
        // The floor of each compartment, its own colour for the kind.
        const floor = { seeds: C.lacq, fruit: C.deep, nuts: C.lacq, coins: C.deep }[kind];
        c += poly([[TX, TY], a, b], floor);
        for (const [x, y] of placed) {
            const t = rnd() * 360;
            if (kind === 'seeds') {
                // Melon seeds: pointed ovals, cream and ink, a split down the middle.
                const col = rnd() < 0.62 ? C.cream : C.ink;
                const P = pts => pts.map(p => rot([x + p[0], y + p[1]], [x, y], t));
                c += blob(P([[0, -6.5], [3.6, -2], [3.4, 3.5], [0, 6], [-3.4, 3.5], [-3.6, -2]]), col);
                c += stroke(P([[0, -4.5], [0, 3.5]]), col === C.cream ? C.ochre : C.lacq, 0.8);
            } else if (kind === 'fruit') {
                // Candied fruit: kumquats, pink cubes, green strips, with sugar.
                const pick = rnd();
                if (pick < 0.4) c += dot(x, y, 5.4, C.orange) + dot(x - 1.6, y - 1.8, 1.6, C.gold);
                else if (pick < 0.7) c += poly([[-4.5, -4.5], [4.5, -4.5], [4.5, 4.5], [-4.5, 4.5]].map(p => rot([x + p[0], y + p[1]], [x, y], t)), C.rose) + dot(x + 1.5, y - 1, 1, C.cream);
                else c += blob([[-7, -2], [0, -3.5], [7, -2], [7, 2], [0, 3.5], [-7, 2]].map(p => rot([x + p[0], y + p[1]], [x, y], t)), C.green) + dot(x, y, 1, C.cream);
            } else if (kind === 'nuts') {
                // Peanuts in the shell: two lobes and a waist.
                const P = pts => pts.map(p => rot([x + p[0], y + p[1]], [x, y], t));
                const [p1, p2] = P([[-3.6, 0], [3.6, 0]]);
                c += dot(p1[0], p1[1], 4.4, C.gold) + dot(p2[0], p2[1], 4.1, C.gold);
                c += dot(p2[0], p2[1], 2, C.ochre, ' opacity="0.8"');
            } else {
                // Blank gold coins with a plain square hole.
                c += dot(x, y, 7.2, C.ochre) + dot(x, y, 6.2, C.gold);
                c += poly([[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]].map(p => rot([x + p[0], y + p[1]], [x, y], t * 0.25)), floor);
            }
        }
        s += `<g clip-path="url(#c${k})">${c}</g>`;
    }
    // The walls: gold, from the well to each corner.
    for (let k = 0; k < 8; k += 1) {
        const v = inner[k];
        const d = Math.hypot(v[0] - TX, v[1] - TY);
        s += stroke([[TX + ((v[0] - TX) * (WELL + 1)) / d, TY + ((v[1] - TY) * (WELL + 1)) / d], v], C.gold, 3.2);
    }
    // The well: a gold ring and a deep floor.
    s += dot(TX, TY, WELL + 3, C.gold) + dot(TX, TY, WELL, C.red);
    svg('tray', box, `<defs>${defs}</defs>${s}`);
}

/* ---- the glow of the well: plain gold, fading out ---- */
{
    const r = 100;
    const box = [TX - r, TY - r, 2 * r, 2 * r];
    const g = `<defs><radialGradient id="g" cx="${TX}" cy="${TY}" r="${r}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.gold}" stop-opacity="0.92"/><stop offset="0.36" stop-color="${C.gold}" stop-opacity="0.34"/><stop offset="0.66" stop-color="${C.gold}" stop-opacity="0.08"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient></defs>`;
    svg('glow', box, `${g}${dot(TX, TY, r, 'url(#g)')}`);
}

/* ---- the gold ingot in the well: the boat with curled-up ends and a round crown, seen from the front ---- */
{
    const box = [TX - 31, TY - 22, 62, 42];
    const P = (x, y) => `${f(TX + x)} ${f(TY + y)}`;
    let s = '';
    // The hull: tips curled up at both ends, a round belly, the rim dipping in the middle.
    s += `<path d="M${P(-29, -11)}Q${P(-26, 1)} ${P(-17, 9)}Q${P(0, 17)} ${P(17, 9)}Q${P(26, 1)} ${P(29, -11)}Q${P(22, -7)} ${P(16, -3)}Q${P(0, 3)} ${P(-16, -3)}Q${P(-22, -7)} ${P(-29, -11)}Z" fill="${C.gold}"/>`;
    // One shade shape: the belly's lower band.
    s += `<path d="M${P(-21, 5)}Q${P(0, 12)} ${P(21, 5)}Q${P(18, 9)} ${P(13, 11.5)}Q${P(0, 16)} ${P(-13, 11.5)}Q${P(-18, 9)} ${P(-21, 5)}Z" fill="${C.ochre}"/>`;
    // The crown.
    s += ell(TX, TY - 6, 12.5, 11, 0, C.ochre) + ell(TX - 1, TY - 7.5, 11, 9.5, 0, C.gold) + ell(TX - 4.5, TY - 11, 4, 2.2, -20, C.cream, ' opacity="0.85"');
    svg('ingot', box, s);
}

/* ---- the lid's shadow on the cloth ---- */
svg('lid-shadow', [TX - 106, TY - 106, 212, 212], poly(oct(TX, TY, R), C.ink));

/* ---- the lid: vermilion lacquer, a gold rim, a gold inlay of a peony with cloud scrolls ---- */
{
    const box = [TX - 106, TY - 106, 212, 212];
    let s = poly(oct(TX, TY, R), C.gold) + poly(oct(TX, TY, R - 7), C.red);
    s += poly(oct(TX, TY, R - 12), C.gold) + poly(oct(TX, TY, R - 14), C.red);
    // A cloud scroll: three lobes, each curled in red, and a tail pointing in.
    const curl = (cx, cy, r, dir, from) => {
        const pts = [];
        for (let t = 0; t <= 1.25; t += 0.06) {
            const ang = from + dir * t * 360;
            const rr = r * (1 - t * 0.6);
            pts.push([cx + rr * Math.cos(rad(ang)), cy + rr * Math.sin(rad(ang))]);
        }
        return stroke(pts, C.red, 1.5);
    };
    const cloud = (ang, dist, size) => {
        const cx = TX + Math.cos(rad(ang)) * dist, cy = TY + Math.sin(rad(ang)) * dist;
        const P = (x, y) => rot([cx + x * size, cy + y * size], [cx, cy], ang + 90);
        let o = '';
        const lobes = [[0, -5, 8.6, 1], [-9.5, 2.5, 6.4, -1], [9.5, 2.5, 6.4, 1]];
        o += dot(...P(0, 5.5), 5 * size, C.gold);
        for (const [x, y, r] of lobes) o += dot(...P(x, y), r * size, C.gold);
        for (const [x, y, r, d] of lobes) o += curl(...P(x, y), r * size * 0.62, d, ang + 90 + (d > 0 ? 200 : -20));
        return o;
    };
    for (let k = 0; k < 8; k += 1) s += cloud(22.5 + 45 * k, 80, 1.0);
    // Small gold drops between the clouds, at the middle of each side.
    for (let k = 0; k < 8; k += 1) {
        const a = 45 * k;
        const P = (x, y) => rot([TX + Math.cos(rad(a)) * 84 + x, TY + Math.sin(rad(a)) * 84 + y], [TX + Math.cos(rad(a)) * 84, TY + Math.sin(rad(a)) * 84], a + 90);
        s += poly([P(0, -5), P(3.2, 0), P(0, 5), P(-3.2, 0)], C.gold);
    }
    // The peony: eight broad scalloped petals in gold, eight inner ones in ochre, a crown of gold.
    // A petal: a rounded fan with a wavy rim, cut out of the lacquer by a hairline of red.
    const petal = (ang, r0, r1, half, fill) => {
        const at = (r, a) => [TX + Math.cos(rad(ang + a)) * r, TY + Math.sin(rad(ang + a)) * r];
        return blob([at(r0, 0), at(r1 * 0.72, -half), at(r1 * 1.02, -half * 0.55), at(r1 * 0.9, 0), at(r1 * 1.02, half * 0.55), at(r1 * 0.72, half)], fill, ` stroke="${C.red}" stroke-width="1.6"`);
    };
    for (let k = 0; k < 8; k += 1) s += petal(45 * k + 8, 8, k % 2 ? 54 : 61, 30, C.gold);
    for (let k = 0; k < 6; k += 1) s += petal(60 * k + 30, 4, k % 2 ? 37 : 42, 38, C.ochre);
    for (let k = 0; k < 5; k += 1) s += petal(72 * k + 12, 2, 24, 44, C.gold);
    s += dot(TX, TY, 8.5, C.ochre, ` stroke="${C.red}" stroke-width="1.4"`);
    for (const [x, y] of [[-3, -3], [3, -3.5], [3.5, 2.5], [-2.5, 3], [0, 0]]) s += dot(TX + x, TY + y, 1.4, C.gold);
    svg('lid', box, s);
}

/* ---- fleck: a gold diamond for the scatter ---- */
svg('fleck', [TX - 6, TY - 6, 12, 12], poly([[TX, TY - 6], [TX + 4, TY], [TX, TY + 6], [TX - 4, TY]], C.gold) + poly([[TX, TY - 3], [TX + 1.8, TY], [TX, TY + 3], [TX - 1.8, TY]], C.cream));

console.log(JSON.stringify(boxes, null, 0).replace(/\},/g, '},\n'));
