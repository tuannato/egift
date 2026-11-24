// Generator for the "harvest" wrapper art: a laden table seen from straight above, drawn like a
// mid-century cookbook plate: flat shapes, two or three tones a surface, a hard offset shadow under
// each thing, no outline, no filter, no blend mode. The only gradients are alpha fades of one colour
// (the warm light on the table and the two candle halos).
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/harvest.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'harvest');
if (!OUT.endsWith('wrappers/harvest')) throw new Error('out dir must be public/wrappers/harvest');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: linen in two creams, squash in two oranges, a crust gold, the table's three browns,
   two olives, one cranberry. */
const C = {
    cream: '#F6ECD6',
    creamLo: '#E0CDA8',
    squash: '#E5822A',
    squashLo: '#BC5C1A',
    gold: '#EDB850',
    wood: '#74462A',
    woodLt: '#8B5632',
    deep: '#3A2114',
    olive: '#747A35',
    oliveLo: '#4E5423',
    cran: '#A62E2B',
};

const f = n => String(Math.round(n * 100) / 100);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(pt).join('L')}Z" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const rrect = (x, y, w, h, r, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ring = (cx, cy, r, w, stroke, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${stroke}" stroke-width="${f(w)}"${extra}/>`;
const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra}/>`;
const turned = (deg, cx, cy, inner) => `<g transform="rotate(${f(deg)} ${f(cx)} ${f(cy)})">${inner}</g>`;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** A small seeded generator (mulberry32): the grain and the berries fall the same way every run. */
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
/** The hard offset shadow every thing on the table throws: the same shape, moved down and right. */
const SH = ' opacity="0.42"';
const DX = 5, DY = 6;

/**
 * A leaf: a pointed lens along its own axis, one half a tone darker, with a short stem.
 * (cx, cy) is its middle, `len` its length, `deg` its turn.
 */
function leaf(cx, cy, len, deg, a, b, stem = C.deep) {
    const h = len / 2, w = len * 0.26;
    const whole = `<path d="M${f(cx - h)} ${f(cy)}Q${f(cx)} ${f(cy - w * 2)} ${f(cx + h)} ${f(cy)}Q${f(cx)} ${f(cy + w * 2)} ${f(cx - h)} ${f(cy)}Z" fill="${a}"/>`;
    const half = `<path d="M${f(cx - h)} ${f(cy)}Q${f(cx)} ${f(cy + w * 2)} ${f(cx + h)} ${f(cy)}Z" fill="${b}"/>`;
    const st = `<path d="M${f(cx - h - len * 0.2)} ${f(cy)}L${f(cx - h + 2)} ${f(cy)}" stroke="${stem}" stroke-width="1.6" stroke-linecap="round"/>`;
    return turned(deg, cx, cy, st + whole + half);
}

/* ================= the table: boards, and a patterned runner down its length ================= */
const RUN = { x: 104, w: 152 };
{
    let s = rect(-6, -6, 372, 462, C.wood);
    // Boards run the length of the table: every other one a tone lighter, a dark seam between.
    const seams = [-6, 34, 78, 282, 326, 366];
    for (let i = 0; i < seams.length - 1; i += 1) {
        if (i % 2 === 1) s += rect(seams[i], -6, seams[i + 1] - seams[i], 462, C.woodLt, ' opacity="0.55"');
    }
    for (const x of seams.slice(1, -1)) s += rect(x - 0.8, -6, 1.6, 462, C.deep, ' opacity="0.5"');
    // Grain: a few short dashes, and three knots.
    const rnd = seeded(7);
    for (let i = 0; i < 26; i += 1) {
        const left = rnd() < 0.5;
        const x = left ? 4 + rnd() * 92 : 262 + rnd() * 92;
        const y = rnd() * 440;
        s += rrect(x, y, 1.4, 14 + rnd() * 26, 0.7, C.deep, ' opacity="0.28"');
    }
    for (const [x, y] of [[18, 300], [344, 128], [300, 302]]) s += ellipse(x, y, 3, 5, C.deep, ' opacity="0.4"');

    // The runner: olive cloth, its shadow, a border of two lines and a row of diamonds and dots, and a
    // tone-on-tone argyle down the middle.
    s += rect(RUN.x + DX, -6, RUN.w, 462, C.deep, SH);
    s += rect(RUN.x, -6, RUN.w, 462, C.olive);
    let arg = '';
    for (let k = -8; k <= 20; k += 1) {
        const y = k * 40;
        arg += `<path d="M${RUN.x} ${y}L${RUN.x + RUN.w} ${y + RUN.w}M${RUN.x + RUN.w} ${y}L${RUN.x} ${y + RUN.w}" stroke="${C.oliveLo}" stroke-width="1.4" fill="none"/>`;
    }
    s += `<clipPath id="run"><rect x="${RUN.x + 22}" y="-6" width="${RUN.w - 44}" height="462"/></clipPath><g clip-path="url(#run)" opacity="0.7">${arg}</g>`;
    for (const side of [0, 1]) {
        const edge = side === 0 ? RUN.x : RUN.x + RUN.w;
        const dir = side === 0 ? 1 : -1;
        s += rect(Math.min(edge, edge + dir * 4), -6, 4, 462, C.oliveLo);
        s += rect(edge + dir * 20 - 0.8, -6, 1.6, 462, C.cream, ' opacity="0.8"');
        const cx = edge + dir * 12;
        for (let y = 8; y < 456; y += 30) {
            s += poly([[cx, y - 5], [cx + 4, y], [cx, y + 5], [cx - 4, y]], C.gold);
            s += circle(cx, y + 15, 1.6, C.cream);
        }
    }
    svg('table', [-6, -6, 372, 462], s);
}

/* ================= the spread: everything laid on the table but the centre dish ================= */
/** A candle from above: a brass saucer, the cream candle, its dark wick. */
const CANDLES = [[180, 76], [180, 358]];
{
    let s = '';

    /* ---- bread on a board, top left ---- */
    {
        const cx = 60, cy = 66;
        const board = (dx, dy, fill, extra = '') => rrect(cx - 54 + dx, cy - 36 + dy, 96, 72, 10, fill, extra) + rrect(cx + 36 + dx, cy - 9 + dy, 34, 18, 7, fill, extra);
        let b = board(DX, DY, C.deep, SH) + board(0, 0, C.creamLo);
        b += circle(cx + 60, cy, 3.4, C.wood);
        // Two plank joins in the board.
        b += rect(cx - 54, cy - 12.6, 96, 1.2, C.woodLt, ' opacity="0.5"') + rect(cx - 54, cy + 11.4, 96, 1.2, C.woodLt, ' opacity="0.5"');
        // The loaf: a dark crust, a golden top, three leaf-shaped cuts of different lengths.
        b += ellipse(cx - 6 + 3, cy + 4, 40, 25, C.deep, SH);
        b += ellipse(cx - 6, cy, 40, 25, C.squashLo) + ellipse(cx - 8, cy - 2, 35, 20, C.gold);
        const cut = (x, y, l) => turned(-58, x, y, `<path d="M${f(x - l)} ${f(y)}Q${f(x)} ${f(y - 5)} ${f(x + l)} ${f(y)}Q${f(x)} ${f(y + 5)} ${f(x - l)} ${f(y)}Z" fill="${C.cream}"/>`);
        b += cut(cx - 26, cy - 2, 8) + cut(cx - 8, cy - 2, 13) + cut(cx + 10, cy - 2, 9);
        // Crumbs.
        b += circle(cx + 30, cy + 24, 1.6, C.gold) + circle(cx + 36, cy + 18, 1.1, C.gold) + circle(cx + 24, cy + 28, 1.1, C.squashLo);
        s += turned(-14, cx, cy, b);
    }

    /* ---- a squash from above, top right: eight lobes round a stem ---- */
    {
        const cx = 302, cy = 64, R = 46;
        s += circle(cx + DX, cy + DY, R, C.deep, SH) + circle(cx, cy, R, C.squashLo);
        for (let i = 0; i < 8; i += 1) {
            const a = (i * 45 + 10) * Math.PI / 180;
            const lx = cx + Math.cos(a) * R * 0.52, ly = cy + Math.sin(a) * R * 0.52;
            s += turned(i * 45 + 10, lx, ly, ellipse(lx, ly, R * 0.47, R * 0.3, C.squash));
        }
        // The lit side: a second, lighter set of slivers on the upper-left lobes only.
        for (const i of [4, 5, 6]) {
            const a = (i * 45 + 10) * Math.PI / 180;
            const lx = cx + Math.cos(a) * R * 0.6, ly = cy + Math.sin(a) * R * 0.6;
            s += turned(i * 45 + 10, lx, ly, ellipse(lx, ly, R * 0.28, R * 0.1, C.gold));
        }
        s += circle(cx, cy, 9, C.oliveLo) + poly([[cx - 5, cy - 4], [cx + 3, cy - 6], [cx + 6, cy + 2], [cx - 1, cy + 6], [cx - 6, cy + 2]], C.olive);
    }

    /* ---- a small dish of herbs between the bread and the corn ---- */
    {
        const cx = 66, cy = 138, R = 15;
        s += circle(cx + 3, cy + 4, R, C.deep, SH) + circle(cx, cy, R, C.cream) + circle(cx, cy, R - 4, C.oliveLo);
        s += leaf(cx - 2, cy - 2, 12, 30, C.olive, C.olive, C.olive) + leaf(cx + 3, cy + 3, 10, -50, C.olive, C.olive, C.olive);
    }

    /* ---- two ears of corn, left: gold cobs with rows of kernels, olive husks peeled back ---- */
    {
        const cob = (cx, cy, deg) => {
            const w = 26, h = 84;
            let c = rrect(cx - w / 2 + DX, cy - h / 2 + DY, w, h, 13, C.deep, SH);
            // Husks, flaring from the foot of the cob.
            const foot = cy + h / 2 - 8;
            const husk = (dir, fill) => `<path d="M${f(cx)} ${f(foot + 10)}Q${f(cx + dir * 30)} ${f(foot + 6)} ${f(cx + dir * 24)} ${f(foot - 42)}Q${f(cx + dir * 8)} ${f(foot - 18)} ${f(cx)} ${f(foot + 10)}Z" fill="${fill}"/>`;
            c += husk(-1, C.oliveLo) + husk(1, C.olive);
            c += rrect(cx - w / 2, cy - h / 2, w, h, 13, C.gold);
            let k = '';
            for (let row = 0; row < 11; row += 1) {
                for (let col = 0; col < 4; col += 1) {
                    const x = cx - 9.6 + col * 6.4 + (row % 2 ? 0 : 0), y = cy - h / 2 + 8 + row * 6.8;
                    k += rrect(x - 2.3, y - 2.3, 4.6, 4.6, 1.6, (row + col) % 3 === 0 ? C.squash : C.cream, (row + col) % 3 === 0 ? ' opacity="0.85"' : ' opacity="0.5"');
                }
            }
            c += `<clipPath id="cob${Math.round(cx)}"><rect x="${f(cx - w / 2)}" y="${f(cy - h / 2)}" width="${w}" height="${h}" rx="13"/></clipPath><g clip-path="url(#cob${Math.round(cx)})">${k}</g>`;
            // The husk's front leaf, over the foot of the cob.
            c += `<path d="M${f(cx - 13)} ${f(foot - 6)}Q${f(cx)} ${f(foot + 4)} ${f(cx + 13)} ${f(foot - 6)}L${f(cx + 9)} ${f(foot + 12)}Q${f(cx)} ${f(foot + 20)} ${f(cx - 9)} ${f(foot + 12)}Z" fill="${C.olive}"/>`;
            c += rrect(cx - 3, foot + 14, 6, 9, 2, C.oliveLo);
            return turned(deg, cx, cy, c);
        };
        s += cob(30, 228, -10) + cob(66, 216, 8);
    }

    /* ---- gravy boat, right: a small bowl of gravy with a ladle's handle ---- */
    {
        const cx = 312, cy = 158, R = 24;
        s += circle(cx + DX, cy + DY, R, C.deep, SH) + circle(cx, cy, R, C.cream) + circle(cx, cy, R - 5, C.squashLo);
        s += ellipse(cx - 4, cy - 4, 9, 6, C.squash);
        s += turned(38, cx, cy, rrect(cx + 6, cy - 2.5, 30, 5, 2.5, C.creamLo));
    }

    /* ---- two pears, right ---- */
    {
        const pear = (cx, cy, deg, a, b) => {
            const body = (dx, dy, fill, extra = '') => `<path d="M${f(cx + dx)} ${f(cy - 22 + dy)}C${f(cx + 8 + dx)} ${f(cy - 22 + dy)} ${f(cx + 8 + dx)} ${f(cy - 6 + dy)} ${f(cx + 15 + dx)} ${f(cy + 4 + dy)}C${f(cx + 22 + dx)} ${f(cy + 16 + dy)} ${f(cx + 12 + dx)} ${f(cy + 24 + dy)} ${f(cx + dx)} ${f(cy + 24 + dy)}C${f(cx - 12 + dx)} ${f(cy + 24 + dy)} ${f(cx - 22 + dx)} ${f(cy + 16 + dy)} ${f(cx - 15 + dx)} ${f(cy + 4 + dy)}C${f(cx - 8 + dx)} ${f(cy - 6 + dy)} ${f(cx - 8 + dx)} ${f(cy - 22 + dy)} ${f(cx + dx)} ${f(cy - 22 + dy)}Z" fill="${fill}"${extra}/>`;
            let p = body(4, 5, C.deep, SH) + body(0, 0, a);
            // One hard shade down the right side.
            p += `<path d="M${f(cx + 2)} ${f(cy - 22)}C${f(cx + 8)} ${f(cy - 22)} ${f(cx + 8)} ${f(cy - 6)} ${f(cx + 15)} ${f(cy + 4)}C${f(cx + 22)} ${f(cy + 16)} ${f(cx + 12)} ${f(cy + 24)} ${f(cx + 2)} ${f(cy + 24)}C${f(cx + 10)} ${f(cy + 14)} ${f(cx + 2)} ${f(cy - 4)} ${f(cx + 2)} ${f(cy - 22)}Z" fill="${b}"/>`;
            p += `<path d="M${f(cx)} ${f(cy - 21)}L${f(cx + 3)} ${f(cy - 31)}" stroke="${C.deep}" stroke-width="2.4" stroke-linecap="round"/>`;
            return turned(deg, cx, cy, p);
        };
        s += pear(296, 236, -28, C.olive, C.oliveLo) + pear(324, 270, 22, C.gold, C.squash);
    }

    /* ---- a place laid, bottom left: a plate with an olive band, a knife and a fork on the runner ---- */
    {
        const cx = 50, cy = 378, R = 58;
        s += circle(cx + DX, cy + DY, R, C.deep, SH) + circle(cx, cy, R, C.cream) + ring(cx, cy, R - 6, 3, C.olive) + circle(cx, cy, R - 18, C.creamLo, ' opacity="0.55"');
        // Knife: a rounded blade, a wooden handle.
        const kx = 122;
        s += `<path d="M${kx - 4} 388L${kx - 4} 336Q${kx - 4} 326 ${kx + 5} 324L${kx + 5} 388Z" fill="${C.cream}"/>` + rrect(kx - 4, 386, 9, 42, 4, C.squashLo);
        // Fork: three tines, a neck, a wooden handle.
        const fx = 140;
        s += `<path d="M${fx - 7} 326L${fx - 7} 352Q${fx - 7} 360 ${fx - 2} 362L${fx - 2} 390L${fx + 2} 390L${fx + 2} 362Q${fx + 7} 360 ${fx + 7} 352L${fx + 7} 326L${fx + 4} 326L${fx + 4} 348L${fx + 1.5} 348L${fx + 1.5} 326L${fx - 1.5} 326L${fx - 1.5} 348L${fx - 4} 348L${fx - 4} 326Z" fill="${C.cream}"/>` + rrect(fx - 4, 386, 8, 42, 4, C.squashLo);
    }

    /* ---- a bowl of cranberries, bottom right, and a few that rolled away ---- */
    {
        const cx = 304, cy = 384, R = 46;
        s += circle(cx + DX, cy + DY, R, C.deep, SH) + circle(cx, cy, R, C.cream) + ring(cx, cy, R - 5, 2, C.creamLo) + circle(cx, cy, R - 10, C.deep);
        const rnd = seeded(31);
        let b = '';
        // Berries of three sizes on an uneven lattice.
        for (let row = -3; row <= 3; row += 1) {
            for (let col = -3; col <= 3; col += 1) {
                const x = cx + col * 12.5 + (row % 2 ? 6 : 0) + (rnd() - 0.5) * 5;
                const y = cy + row * 11 + (rnd() - 0.5) * 5;
                const r = 5.2 + rnd() * 2.6;
                b += circle(x, y, r, C.cran) + (rnd() < 0.45 ? circle(x - r * 0.3, y - r * 0.35, 1.1, C.cream, ' opacity="0.8"') : '');
            }
        }
        s += `<clipPath id="bowl"><circle cx="${cx}" cy="${cy}" r="${R - 10}"/></clipPath><g clip-path="url(#bowl)">${b}</g>`;
        for (const [x, y, r] of [[246, 330, 5.5], [262, 318, 4.4], [240, 436, 5], [338, 318, 4.6], [94, 302, 5], [276, 20, 4.4]]) {
            s += circle(x + 2, y + 2.5, r, C.deep, SH) + circle(x, y, r, C.cran) + circle(x - r * 0.3, y - r * 0.35, 1, C.cream, ' opacity="0.8"');
        }
    }

    /* ---- the two candles, unlit ---- */
    for (const [cx, cy] of CANDLES) {
        s += circle(cx + 4, cy + 5, 19, C.deep, SH) + circle(cx, cy, 19, C.gold) + ring(cx, cy, 14.5, 1.6, C.squashLo) + circle(cx, cy, 9.5, C.cream) + `<path d="M${cx} ${cy}A9.5 9.5 0 0 1 ${cx} ${cy + 9.5}A9.5 9.5 0 0 0 ${f(cx + 9.5)} ${cy}Z" fill="${C.creamLo}"/>` + circle(cx, cy, 2, C.deep);
    }

    /* ---- leaves that fell on the table ---- */
    s += leaf(18, 150, 26, 40, C.squash, C.squashLo) + leaf(342, 330, 24, -30, C.gold, C.squash) + leaf(104, 438, 26, 12, C.cran, C.deep) + leaf(150, 20, 22, -24, C.squash, C.squashLo);
    s += leaf(20, 14, 22, 150, C.gold, C.squash) + leaf(350, 212, 22, 80, C.squash, C.squashLo);

    svg('spread', [-6, -6, 372, 462], s);
}

/* ---- two pairs of leaves on the runner, each its own layer: they stir ---- */
svg('leaf-a', [206, 8, 46, 40], leaf(224, 30, 28, -38, C.gold, C.squash) + leaf(238, 22, 22, 18, C.cran, C.deep));
svg('leaf-b', [198, 402, 54, 40], leaf(216, 424, 28, 28, C.squash, C.squashLo) + leaf(236, 416, 22, -40, C.gold, C.squash));

/* ================= the centre dish: a lattice-top pie in a cream dish ================= */
const PX = 180, PY = 215;
{
    // The dish, with its shadow.
    svg('dish', [92, 127, 186, 188], circle(PX + DX, PY + DY, 84, C.deep, SH) + circle(PX, PY, 84, C.cream) + ring(PX, PY, 79, 2, C.creamLo));

    // The pie: a crimped crust, cranberry filling, a woven lattice.
    let p = '';
    const N = 22, RC = 67;
    for (let i = 0; i < N; i += 1) {
        const a = (i / N) * Math.PI * 2;
        p += circle(PX + Math.cos(a) * RC, PY + Math.sin(a) * RC, 8.6, i % 2 ? C.gold : C.squash);
    }
    p += circle(PX, PY, RC, C.gold) + circle(PX, PY, 58, C.cran);
    // The lattice, woven: strips along u and along v (the axes turned 45 degrees), 9 wide, 21 apart.
    const W = 9, GAP = 21, K = [-3, -2, -1, 0, 1, 2, 3];
    let lat = '';
    for (const k of K) lat += rect(PX - 70, PY + k * GAP - W / 2, 140, W, C.gold) + rect(PX + k * GAP - W / 2, PY - 70, W, 140, C.gold);
    for (const i of K) {
        for (const j of K) {
            const x = PX + i * GAP, y = PY + j * GAP;
            // Which strip lies on top here: its edges throw one thin hard shade on the strip under it.
            if ((i + j) % 2 === 0) lat += rect(x - W / 2 - 2, y - W / 2, W + 4, W, C.squashLo) + rect(x - W / 2, y - W / 2 - 3, W, W + 6, C.gold);
            else lat += rect(x - W / 2, y - W / 2 - 2, W, W + 4, C.squashLo) + rect(x - W / 2 - 3, y - W / 2, W + 6, W, C.gold);
        }
    }
    p += `<clipPath id="pie"><circle cx="${PX}" cy="${PY}" r="59"/></clipPath><g clip-path="url(#pie)"><g transform="rotate(45 ${PX} ${PY})">${lat}</g></g>`;
    p += ring(PX, PY, 59.5, 3, C.gold);
    svg('pie', [104, 139, 152, 152], p);
}

/* ================= the linen cloth over the dish: two halves, and the folded half's other side ================= */
const CL = { x: 88, y: 123, w: 184, h: 184 };
{
    const mid = CL.x + CL.w / 2;
    // The cloth's pattern across its whole width: two cranberry bands and a gold line near the top and
    // the bottom hems, a soft ring where the dish stands under it, and the creases of its folding.
    const face = (x0, x1, base, lo) => {
        let s = rect(x0, CL.y, x1 - x0, CL.h, base);
        for (const y of [CL.y + 14, CL.y + CL.h - 14 - 9]) s += rect(x0, y, x1 - x0, 9, C.cran);
        for (const y of [CL.y + 28, CL.y + CL.h - 28 - 2.4]) s += rect(x0, y, x1 - x0, 2.4, C.gold);
        for (const y of [CL.y + 34.5, CL.y + CL.h - 34.5 - 1.6]) s += rect(x0, y, x1 - x0, 1.6, C.cran);
        // Hems.
        s += rect(x0, CL.y, x1 - x0, 3, lo) + rect(x0, CL.y + CL.h - 3, x1 - x0, 3, lo);
        return s;
    };
    const clip = (id, x0, x1, inner) => `<clipPath id="${id}"><rect x="${x0}" y="${CL.y}" width="${x1 - x0}" height="${CL.h}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
    const dishRing = ring(PX, PY, 72, 2.2, C.creamLo);
    const crease = '';

    // Left half: lies still until the folded cloth is carried off.
    svg('cloth-l', [CL.x, CL.y, CL.w / 2, CL.h], clip('cl', CL.x, mid, face(CL.x, mid, C.cream, C.creamLo) + dishRing + crease + rect(CL.x, CL.y, 3, CL.h, C.creamLo)));
    // Right half: a line of shade down the crease. It folds over to the left.
    let r = face(mid, CL.x + CL.w, C.cream, C.creamLo) + dishRing + crease + rect(CL.x + CL.w - 3, CL.y, 3, CL.h, C.creamLo);
    r += rect(mid, CL.y, 1.8, CL.h, C.creamLo);
    svg('cloth-r', [mid, CL.y, CL.w / 2, CL.h], clip('cr', mid, CL.x + CL.w, r));
    // The other side of the right half, lying on the left half: the plain back of the weave, the bands
    // showing through paler, one crease across.
    let b = rect(CL.x, CL.y, CL.w / 2, CL.h, C.cream);
    for (const y of [CL.y + 14, CL.y + CL.h - 14 - 9]) b += rect(CL.x, y, CL.w / 2, 9, C.cran, ' opacity="0.7"');
    for (const y of [CL.y + 28, CL.y + CL.h - 28 - 2.4]) b += rect(CL.x, y, CL.w / 2, 2.4, C.gold, ' opacity="0.8"');
    b += rect(CL.x, CL.y, CL.w / 2, 3, C.creamLo) + rect(CL.x, CL.y + CL.h - 3, CL.w / 2, 3, C.creamLo) + rect(CL.x, CL.y, 3, CL.h, C.creamLo);
    b += rect(CL.x, PY - 0.8, CL.w / 2, 1.6, C.creamLo) + rect(mid - 5, CL.y, 5, CL.h, C.creamLo);
    svg('cloth-back', [CL.x, CL.y, CL.w / 2, CL.h], b);
}

/* ================= light: the warm glow on the table, the candle halos, the flames ================= */
{
    const glow = (id, cx, cy, r, a) => `<defs><radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.gold}" stop-opacity="${a}"/><stop offset="0.55" stop-color="${C.gold}" stop-opacity="${f(a * 0.35)}"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>`;
    svg('warm', [10, 45, 340, 340], glow('w', PX, PY, 170, 0.34));
    CANDLES.forEach(([cx, cy], i) => {
        const n = 'ab'[i];
        svg(`glow-${n}`, [cx - 62, cy - 68, 124, 124], glow(`g${n}`, cx, cy - 6, 62, 0.6));
        // The flame, drawn leaning up the page from the wick: gold with a cream heart.
        const tear = (w, h, base, fill) => `<path d="M${cx} ${cy + base}C${f(cx - w * 1.3)} ${f(cy - h * 0.12)} ${f(cx - w * 0.8)} ${f(cy - h * 0.55)} ${cx} ${cy - h}C${f(cx + w * 0.8)} ${f(cy - h * 0.55)} ${f(cx + w * 1.3)} ${f(cy - h * 0.12)} ${cx} ${cy + base}Z" fill="${fill}"/>`;
        const fl = tear(9.5, 36, 3, C.squash) + tear(6.2, 26, 2, C.gold) + tear(3.2, 14, 1, C.cream);
        svg(`flame-${n}`, [cx - 13, cy - 37, 26, 42], fl);
    });
}

/* ================= steam: three wisps over the pie, each an S of cream ================= */
{
    const wisp = (name, x, top, h, bend) => {
        const d = `M${x} ${top + h}C${x - bend} ${f(top + h * 0.72)} ${x + bend} ${f(top + h * 0.56)} ${x} ${f(top + h * 0.36)}C${x - bend * 0.8} ${f(top + h * 0.2)} ${x + bend * 0.5} ${f(top + h * 0.1)} ${x + 1} ${top + 4}`;
        svg(name, [x - 16, top, 32, h + 4], `<path d="${d}" fill="none" stroke="${C.cream}" stroke-width="6" stroke-linecap="round" opacity="0.9"/>`);
    };
    wisp('steam-1', 154, 150, 70, 12);
    wisp('steam-2', 182, 136, 84, -13);
    wisp('steam-3', 208, 154, 66, 11);
}

/* ---- the leaf that scatters when the pie is shown ---- */
svg('leaf-fall', [166, 207, 28, 16], leaf(182, 215, 20, 0, C.squash, C.squashLo));
