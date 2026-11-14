// Generator for the "snow box" winter wrapper art: Nordic folk pattern, in the spirit of
// Scandinavian paper-cut and knitted (selburose) work. Everything is a symmetric geometric
// motif: stars built from diamonds, zigzag bands, stacked-triangle pines, angular reindeer.
// Flat and crisp, no outline, no gradient: midnight blue (and its tints), snow white, one red, one gold.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/snowbox.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'snowbox');
if (!OUT.endsWith('wrappers/snowbox')) throw new Error('out dir must be public/wrappers/snowbox');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

const C = {
    night: '#0E2036',
    tone: '#1A3A5C', // night, one step up: far pines, quiet pattern
    tone2: '#34618F', // night, two steps up: the trace in the sky
    snow: '#F5F2EA',
    red: '#C6322B',
    redDeep: '#9E211D',
    gold: '#F2C24F',
    goldLt: '#FBE4A6',
};

const f = n => String(Math.round(n * 100) / 100);
const rad = d => (d * Math.PI) / 180;
const u = d => [Math.cos(rad(d)), Math.sin(rad(d))];
const poly = a => 'M' + a.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
/** A diamond, optionally turned by `rot` degrees about its centre. */
const dia = (cx, cy, rx, ry, rot = 0) => {
    const [c, s] = u(rot);
    return poly([[0, -ry], [rx, 0], [0, ry], [-rx, 0]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]));
};
/** A four-pointed star: two crossed diamonds. */
const star4 = (cx, cy, r) => dia(cx, cy, r * 0.3, r) + dia(cx, cy, r, r * 0.3);
/** The eight-petal rose: each petal a rhombus with 45 degrees at the centre, returned as its two halves. */
const rose = (cx, cy, s, rot = 0) => {
    let a = '', b = '';
    for (let k = 0; k < 8; k++) {
        const t = rot + k * 45, [ax, ay] = u(t - 22.5), [bx, by] = u(t + 22.5);
        const pa = [cx + s * ax, cy + s * ay], pb = [cx + s * bx, cy + s * by], tip = [cx + s * (ax + bx), cy + s * (ay + by)];
        a += poly([[cx, cy], pa, tip]);
        b += poly([[cx, cy], tip, pb]);
    }
    return [a, b];
};
/** A pine of stacked triangles; returns [body path, snow-cap path]. `dir` turns it (0 = upright) about its base centre. */
const pine = (cx, base, w, h, tiers, dir = 0, lap = 0, caps = tiers) => {
    const [c, s] = u(dir);
    const at = (x, y) => [cx + x * c - y * s, base + x * s + y * c];
    const tierH = lap > 0 ? (h / tiers) * lap : (h / (tiers + 1)) * 2;
    const step = tiers > 1 ? (h - tierH) / (tiers - 1) : 0;
    let body = '', cap = '';
    for (let i = 0; i < tiers; i++) {
        const top = -h + i * step, wi = w * (tiers > 1 ? 0.42 + 0.58 * (i / (tiers - 1)) : 1);
        body += poly([at(0, top), at(wi / 2, top + tierH), at(-wi / 2, top + tierH)]);
        const k = 0.36;
        if (i < caps) cap += poly([at(0, top), at((wi / 2) * k, top + tierH * k), at(0, top + tierH * k * 0.62), at((-wi / 2) * k, top + tierH * k)]);
    }
    return [body, cap];
};
const zig = (x0, x1, y, amp, half) => {
    const p = [];
    for (let x = x0, i = 0; x <= x1 + 0.01; x += half, i++) p.push(`${f(x)},${f(y + (i % 2 ? -amp : amp))}`);
    return p.join(' ');
};

function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}

/* Geometry (canvas units). The box is seen flat from the front, as in a paper-cut. */
const GROUND = 318;
const BX0 = 108, BX1 = 252, BY0 = 240, BY1 = 322; // body
const LX0 = 100, LX1 = 260, LY0 = 220, LY1 = 242; // lid
const RX0 = 169, RX1 = 191; // ribbon band
const KNOT = [180, 215];
const STAR = [180, 162]; // where the star comes to rest
const PETAL = 21; // side of the star's rhombi

/* Sky: the night, and a knitted border across the top. Bands run full-bleed. */
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.night}"/>`;
    s += `<rect x="-6" y="55" width="372" height="1.3" fill="${C.snow}"/>`;
    s += `<polyline points="${zig(-6, 366, 64, 3.6, 6)}" fill="none" stroke="${C.snow}" stroke-width="1.5" stroke-linejoin="miter"/>`;
    let g = '', r = '', w = '';
    for (let x = 0; x <= 360; x += 24) g += dia(x, 76, 2.8, 3.8);
    for (let x = 12; x <= 360; x += 24) r += dia(x, 76, 1.7, 2.3);
    s += P(g, C.gold) + P(r, C.red);
    s += `<rect x="-6" y="83" width="372" height="1.3" fill="${C.snow}"/>`;
    for (let x = 0; x <= 360; x += 12) w += poly([[x - 3, 84], [x + 3, 84], [x, 89.5]]);
    s += P(w, C.snow);
    svg('sky', [-6, -6, 372, 462], s);
}

/* Falling snow, as the knitter's "lice": small diamonds on a dense staggered lattice. Two planes. */
{
    let a = '';
    for (let row = 0; row < 14; row++) {
        const y = 100 + row * 16;
        for (let i = -1; i < 20; i++) a += dia(i * 20 + (row % 2) * 10, y, 1.1, 1.5);
    }
    svg('snow-a', [-6, 92, 372, 238], P(a, C.snow, ' opacity="0.55"'));
    let b = '';
    for (let row = 0; row < 6; row++) {
        const y = 108 + row * 38;
        for (let i = 0; i < 5; i++) {
            const x = 36 + i * 72 + (row % 2) * 36;
            if (x > 330) continue;
            b += dia(x, y, 2.1, 2.9);
        }
    }
    svg('snow-b', [-6, 86, 372, 260], P(b, C.snow));
}

/* Rosette: a small snow star alone in the closed sky, above the box. */
{
    const [cx, cy] = STAR;
    const [a, b] = rose(cx, cy, 7.5, -90);
    let s = P(a + b, C.snow, ` stroke="${C.night}" stroke-width="0.7"`);
    let w = '', t = '';
    for (let k = 0; k < 8; k++) {
        const [x, y] = u(k * 45 + 22.5);
        w += dia(cx + 19 * x, cy + 19 * y, 1.4, 2.4, k * 45 + 22.5 + 90);
    }
    for (let k = 0; k < 24; k++) {
        const [x, y] = u(k * 15);
        t += dia(cx + 27 * x, cy + 27 * y, 1.2, 1.2, k * 15);
    }
    s += P(w, C.snow) + P(t, C.tone2);
    svg('trace', [150, 132, 60, 60], s);
}

/* Disc: a flat lighter-navy round the star stands on, with one flat ring. */
svg('disc', [130, 112, 100, 100],
    `<circle cx="${STAR[0]}" cy="${STAR[1]}" r="47" fill="${C.tone}"/><circle cx="${STAR[0]}" cy="${STAR[1]}" r="43" fill="none" stroke="${C.tone2}" stroke-width="1.2"/>`);

/* Rays: light as a pattern. Rows of gold stitches fan from the mouth of the box. */
{
    const ox = 180, oy = 238;
    let a = '', b = '';
    for (let k = -4; k <= 4; k++) {
        const t = -90 + k * 17, long = k % 2 === 0;
        const [x, y] = u(t);
        let d = '';
        for (let r = long ? 20 : 28, i = 0; r < (long ? 150 : 112); r += 8.5 + i * 0.35, i++) d += dia(ox + r * x, oy + r * y, 0.8 + i * 0.05, 2.7 + i * 0.1, t + 90);
        if (long) a += d; else b += d;
    }
    svg('rays', [0, 0, 360, 250],
        `<defs><clipPath id="c"><rect x="0" y="94" width="360" height="156"/></clipPath></defs><g clip-path="url(#c)">${P(a, C.gold)}${P(b, C.goldLt)}</g>`);
}

/* Far pines: tone on tone, snow-capped, in mirrored pairs. The outermost pair bleeds off the sides. */
{
    let body = '', cap = '';
    // caps only where no reindeer stands in front: white on white would muddle the silhouettes
    for (const [x, w, h, n, caps] of [[2, 50, 118, 4, 4], [44, 58, 150, 5, 3], [99, 28, 60, 3, 0]]) {
        for (const cx of [x, 360 - x]) {
            const [b, c] = pine(cx, GROUND + 4, w, h, n, 0, 0, caps);
            body += b; cap += c;
        }
    }
    svg('pines', [-30, 160, 420, 166], P(body, C.tone) + P(cap, C.snow));
}

/* Ground: a strip of snow, then flat knitted bands that end on a hard red band over navy. */
{
    let s = `<rect x="-6" y="${GROUND}" width="372" height="36" fill="${C.snow}"/>`;
    let teeth = '';
    for (let x = -6; x < 366; x += 8) teeth += poly([[x, GROUND + 0.5], [x + 4, GROUND - 4], [x + 8, GROUND + 0.5]]);
    s += P(teeth, C.snow);
    s += `<polyline points="${zig(-6, 366, 331, 3.4, 6)}" fill="none" stroke="${C.red}" stroke-width="2.2"/>`;
    let d = '';
    for (let x = 0; x <= 360; x += 12) d += dia(x, 343.5, 2.4, 3.2);
    s += P(d, C.tone);
    s += `<rect x="-6" y="350" width="372" height="4" fill="${C.red}"/>`;
    s += `<rect x="-6" y="354" width="372" height="102" fill="${C.tone}"/>`;
    s += `<polyline points="${zig(-6, 366, 364, 3.4, 6)}" fill="none" stroke="${C.tone2}" stroke-width="1.8"/>`;
    let pb = '', d2 = '';
    for (let x = 12; x <= 360; x += 24) pb += pine(x, 392, 14, 18, 3)[0];
    for (let x = 0; x <= 360; x += 24) d2 += dia(x, 384, 2.4, 3.2);
    s += P(pb + d2, C.tone2);
    s += `<rect x="-6" y="398" width="372" height="1.6" fill="${C.tone2}"/>`;
    svg('ground', [-6, 312, 372, 144], s);
}

/* Reindeer: angular silhouettes of solid blocks, one each side, facing the box. */
{
    const one = () => {
        let w = '';
        w += poly([[9, 33], [41, 32], [43, 48], [9, 49]]); // body
        w += poly([[9, 33], [3.5, 28], [9, 41]]); // tail
        for (const x of [9, 16.8, 31.4, 39]) w += poly([[x, 46], [x + 4, 46], [x + 3.6, 70], [x + 0.2, 70]]); // legs
        w += poly([[32, 36], [43, 37], [50.5, 21], [43, 16]]); // neck
        w += poly([[42, 15], [50, 12.5], [58, 21.5], [48, 24.5]]); // head
        w += poly([[43, 15.5], [36.5, 9.5], [46.5, 13]]); // ear
        let s = P(w, C.snow);
        s += `<path d="M45.6 13L41.4 -2.5M43.6 6.2L50.6 0.4M42.2 1.4L35.2 -2.6" fill="none" stroke="${C.snow}" stroke-width="2.8" stroke-linecap="butt" stroke-linejoin="miter"/>`;
        s += P(poly([[19, 32.7], [31, 32.3], [31, 48.4], [19, 48.7]]), C.red);
        s += P(dia(25, 40.5, 2.8, 4.4), C.snow);
        return s;
    };
    svg('deer', [24, 238, 312, 84],
        `<g transform="translate(34 248)">${one()}</g><g transform="translate(326 248) scale(-1 1)">${one()}</g>`);
}

/* Twinkle: gold stars that come out when the box is open. */
{
    let g = '', w = '';
    for (const [x, y, r] of [[100, 156, 6], [58, 178, 4.5], [86, 206, 3.6], [42, 208, 3.4]]) g += star4(x, y, r) + star4(360 - x, y, r);
    for (const [x, y, r] of [[40, 166, 2.6], [76, 166, 2.2], [60, 228, 2.4]]) w += star4(x, y, r) + star4(360 - x, y, r);
    svg('twinkle', [30, 140, 300, 96], P(g, C.gold) + P(w, C.snow));
}

/* Ring: the wreath around the star. Little pines pointing outward, small stars, a beaded edge. */
{
    const [cx, cy] = STAR;
    let w = '', g = '', r = '';
    for (let k = 0; k < 8; k++) {
        const t = k * 45;
        const [x, y] = u(t - 90);
        const [b] = pine(cx + 47 * x, cy + 47 * y, 13, 17, 3, t, 1.12);
        w += b;
        const [x2, y2] = u(t - 90 + 22.5);
        g += star4(cx + 53 * x2, cy + 53 * y2, 5);
        r += dia(cx + 62 * x2, cy + 62 * y2, 1.5, 2.2, t + 22.5);
    }
    for (let k = 0; k < 56; k++) {
        const a = (k * 360) / 56 + 3.2, [x, y] = u(a);
        if (k % 2) g += dia(cx + 69 * x, cy + 69 * y, 1.1, 1.1, a);
        else w += dia(cx + 69 * x, cy + 69 * y, 1.5, 1.5, a);
    }
    svg('ring', [108, 90, 144, 144], P(w, C.snow) + P(g, C.gold) + P(r, C.red));
}

/* Star: the eight-petal rose, each petal a gold half and a pale half, a red heart. No outline. */
{
    const [cx, cy] = STAR;
    const [a, b] = rose(cx, cy, PETAL, -90);
    let s = P(a, C.gold) + P(b, C.goldLt);
    let red = '';
    for (let k = 0; k < 8; k++) {
        const t = k * 45 + 22.5, [x, y] = u(t);
        red += dia(cx + 31.5 * x, cy + 31.5 * y, 3, 6, t + 90);
    }
    s += P(red, C.red);
    const [c1, c2] = rose(cx, cy, 7.5, -67.5);
    s += P(c1 + c2, C.red, ` stroke="${C.goldLt}" stroke-width="0.8"`);
    s += P(dia(cx, cy, 2.8, 2.8), C.snow);
    svg('star', [138, 120, 84, 84], s);
}

/* The mouth of the open box: a lit rim behind the body. */
svg('box-in', [108, 232, 144, 12],
    P(poly([[BX0 + 3, 244], [BX0 + 9, 234], [BX1 - 9, 234], [BX1 - 3, 244]]), C.goldLt) +
    P(poly([[BX0 + 9, 234], [BX1 - 9, 234], [BX1 - 10, 236], [BX0 + 10, 236]]), C.gold));

/* Body: red, cut with white. A rose on each panel, zigzag above, diamonds below, snow at its foot. */
{
    let s = `<rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="${BY1 - BY0}" fill="${C.red}"/>`;
    s += `<rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="3" fill="${C.redDeep}"/>`;
    let w = '';
    for (const [x0, x1] of [[BX0, RX0], [RX1, BX1]]) {
        const mx = (x0 + x1) / 2;
        s += `<polyline points="${zig(x0 + 6.5, x1 - 6.5, 250.5, 2.6, 4)}" fill="none" stroke="${C.snow}" stroke-width="1.3"/>`;
        const [a, b] = rose(mx, 280, 12, -90);
        s += P(a + b, C.snow, ` stroke="${C.red}" stroke-width="0.9"`);
        s += P(dia(mx, 280, 2.6, 2.6), C.red);
        for (const dx of [-24, 24]) for (const dy of [-17, 17]) w += dia(mx + dx, 280 + dy, 1.8, 2.4);
        for (let x = x0 + 8.5; x <= x1 - 8; x += 11) w += dia(x, 308.5, 2.2, 2.8);
    }
    for (const y of [262, 280, 298]) w += dia(180, y, y === 280 ? 4.2 : 2.6, y === 280 ? 5.6 : 3.4);
    s += P(w, C.snow);
    let drift = '';
    for (let x = BX0 - 12; x < BX1 + 12; x += 8) drift += poly([[x, 324], [x + 4, 316.5], [x + 8, 324]]);
    s += P(drift, C.snow);
    svg('body', [94, 238, 172, 86], s);
}

/* Lid: a row of diamonds, snow lying along its top. Its twin is the lid turned over, which leans behind the box once open. */
{
    let s = `<rect x="${LX0}" y="${LY0}" width="${LX1 - LX0}" height="${LY1 - LY0}" fill="${C.red}"/>`;
    s += `<rect x="${LX0}" y="${LY1 - 2.5}" width="${LX1 - LX0}" height="2.5" fill="${C.redDeep}"/>`;
    let w = '';
    for (let i = 0; i < 6; i++) w += dia(LX0 + 9 + i * 11, 231.5, 3, 4.2) + dia(LX1 - 9 - i * 11, 231.5, 3, 4.2);
    w += dia(180, 231.5, 4.2, 5.4);
    let snow = poly([[LX0 - 2, 217], [LX1 + 2, 217], [LX1 + 2, 221], [LX0 - 2, 221]]);
    for (let x = LX0 - 2; x < LX1; x += 9) snow += poly([[x, 220.5], [x + 9, 220.5], [x + 4.5, 225.5]]);
    s += P(w, C.snow) + P(snow, C.snow);
    svg('lid', [96, 214, 168, 30], s);
    // the lid turned over: its plain inside, one pale edge
    svg('lid-back', [96, 214, 168, 30],
        `<rect x="${LX0}" y="${LY0 - 2}" width="${LX1 - LX0}" height="${LY1 - LY0 + 2}" fill="${C.redDeep}"/>` +
        `<rect x="${LX0}" y="${LY0 - 2}" width="${LX1 - LX0}" height="3" fill="${C.red}"/>` +
        `<rect x="${LX0}" y="${LY1 - 2.2}" width="${LX1 - LX0}" height="2.2" fill="${C.goldLt}"/>`);
}

/* Ribbon: a gold band stitched down the middle, and the two tails of the bow, each one long diamond. */
{
    let s = `<rect x="${RX0}" y="217" width="${RX1 - RX0}" height="${BY1 - 217 - 5}" fill="${C.gold}"/>`;
    s += `<rect x="${RX0}" y="217" width="1.6" height="${BY1 - 217 - 5}" fill="${C.goldLt}"/><rect x="${RX1 - 1.6}" y="217" width="1.6" height="${BY1 - 217 - 5}" fill="${C.goldLt}"/>`;
    let st = '';
    for (let y = 238; y < 314; y += 9) st += dia(180, y, 2.2, 3);
    s += P(st, C.redDeep);
    const [kx, ky] = KNOT;
    s += P(dia(kx - 12, ky + 14, 4.6, 15, 32) + dia(kx + 12, ky + 14, 4.6, 15, -32), C.gold);
    svg('ribbon', [150, 210, 60, 110], s);
}

/* Bow: built from the same diamonds as everything else. Each loop a long diamond with a diamond cut out of it. */
{
    const [kx, ky] = KNOT;
    const loop = m =>
        `<path fill-rule="evenodd" d="${dia(kx + m * 21, ky - 5, 19.5, 11.5, -m * 14)}${dia(kx + m * 22, ky - 5.2, 8.5, 5, -m * 14)}" fill="${C.gold}"/>`;
    svg('loop-l', [138, 196, 44, 30], loop(-1));
    svg('loop-r', [178, 196, 44, 30], loop(1));
    svg('knot', [171, 205, 18, 20], P(dia(kx, ky, 7.5, 9), C.goldLt) + P(dia(kx, ky, 3.2, 4), C.red));
}

/* Sprigs: three pine sprigs hang from the border each side, cut as herringbone, a red berry at each tip. */
{
    const sprig = (x, y0, len, n, nl) => {
        let d = `M${f(x)} ${f(y0)}L${f(x)} ${f(y0 + len)}`;
        for (let i = 0; i < n; i++) {
            const py = y0 + 3 + (i * (len - 8)) / (n - 1), l = nl * (1 - 0.5 * (i / (n - 1)));
            for (const side of [-1, 1]) d += `M${f(x)} ${f(py)}L${f(x + side * l * 0.62)} ${f(py + l * 0.78)}`;
        }
        return d;
    };
    const one = () => {
        const d = sprig(66, 89, 56, 9, 13) + sprig(44, 89, 32, 5, 10) + sprig(88, 89, 32, 5, 10);
        return `<path d="${d}" fill="none" stroke="${C.snow}" stroke-width="1.5" stroke-linecap="butt"/>` +
            P(dia(66, 150, 2.6, 3.6) + dia(44, 126, 2.2, 3) + dia(88, 126, 2.2, 3), C.red);
    };
    svg('boughs', [28, 86, 304, 72], `${one()}<g transform="translate(360 0) scale(-1 1)">${one()}</g>`);
}

/* Sparks thrown when the star arrives. */
svg('spark-a', [174, 156, 12, 12], P(star4(180, 162, 6), C.gold));
svg('spark-b', [176, 158, 8, 8], P(dia(180, 162, 2.6, 3.6), C.snow));

console.log('snowbox art written to', OUT);
