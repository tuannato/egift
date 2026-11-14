// Generator for the "cake box" birthday wrapper art: a flat graphic poster, in the spirit of
// mid-century print. Six inks, flat shapes, clean offset shadows, a speckle of print grain.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/cake.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'cake');
if (!OUT.endsWith('wrappers/cake')) throw new Error('out dir must be public/wrappers/cake');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The inks. Everything else is one ink printed over another (the *Dim tints). */
const INK = {
    field: '#12343F', // deep teal-navy
    deep: '#0A222B', // darker teal
    butter: '#F2C95C',
    coral: '#E5502F',
    cream: '#FBF1DC',
    brown: '#8A4B2A',
};
const TINT = {
    creamDim: '#E7E0CD', creamDim2: '#D6D0BE', creamShade: '#B4B4A8', creamLine: '#A3A69C',
    butterDim: '#CDA642', coralDim: '#B53A20', brownDim: '#6C3820', fieldLift: '#1B4854',
};

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
const f = n => String(Math.round(n * 100) / 100);
const pts = a => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

const BOX = {};
function svg(name, box, inner) {
    BOX[name] = box;
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    writeFileSync(join(OUT, `${name}.svg`), s);
}
const tri = (cx, cy, r, rot, fill) => {
    const p = [0, 1, 2].map(k => {
        const t = ((rot + 120 * k - 90) * Math.PI) / 180;
        return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
    });
    return `<polygon points="${pts(p)}" fill="${fill}"/>`;
};

/* Geometry (canvas units). A low, wide bakery box seen from the front, slightly from above. */
const BX0 = 72, BX1 = 288, BY0 = 264, BY1 = 340; // body front
const LX0 = 67, LX1 = 293, LY0 = 242, LY1 = 270; // lid front band
const TX0 = 86, TX1 = 274, TY = 210; // back edge of the lid top
const TABLE = 326; // far edge of the table plane
const TABS = [118, 242]; // tuck tabs of the lid
const KNOT = [180, 226];
const SUN = [180, 126, 40];
const FLAME = [180, 118];

/* Field: the poster's ground. An arch behind the box, the table as a flat butter plane, a band below. */
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${INK.field}"/>`;
    // arch
    s += `<path d="M54 ${TABLE} L54 188 A126 126 0 0 1 306 188 L306 ${TABLE} Z" fill="${INK.deep}"/>`;
    s += `<path d="M66 ${TABLE} L66 188 A114 114 0 0 1 294 188 L294 ${TABLE}" fill="none" stroke="${TINT.fieldLift}" stroke-width="1.4"/>`;
    // halftone: dots swelling toward the table, either side of the arch
    for (let row = 0; row < 11; row++) {
        const y = 250 + row * 7, r = 0.5 + row * 0.21;
        for (let i = 0; i < 9; i++) {
            const off = (row % 2) * 3.5;
            for (const x of [-4 + i * 7 + off, 364 - i * 7 - off]) if (x < 52 || x > 308) s += `<circle cx="${f(x)}" cy="${y}" r="${f(r)}" fill="${INK.deep}"/>`;
        }
    }
    // table plane and the band under it
    s += `<rect x="-6" y="${TABLE}" width="372" height="${400 - TABLE}" fill="${INK.butter}"/>`;
    s += `<rect x="-6" y="${TABLE}" width="372" height="3" fill="${INK.cream}"/>`;
    s += `<rect x="-6" y="400" width="372" height="56" fill="${INK.deep}"/>`;
    s += `<rect x="-6" y="400" width="372" height="5" fill="${INK.coral}"/>`;
    s += `<rect x="-6" y="409" width="372" height="2" fill="${INK.cream}"/>`;
    svg('field', [-6, -6, 372, 462], s);
}

/* Loose paper shapes on the field: large, flat, few */
{
    let s = '';
    s += `<circle cx="44" cy="134" r="10" fill="${INK.butter}"/>`;
    s += tri(28, 222, 12, 18, INK.cream);
    s += `<path d="M48 306 A20 20 0 0 1 68 286 L68 306 Z" fill="${INK.coral}"/>`;
    s += `<rect x="18" y="176" width="20" height="5.5" fill="${INK.coral}" transform="rotate(-32 28 179)"/>`;
    s += `<circle cx="96" cy="118" r="3.4" fill="${INK.cream}"/><circle cx="20" cy="268" r="4" fill="${INK.butter}"/>`;
    s += `<rect x="318" y="296" width="24" height="6" fill="${INK.cream}" transform="rotate(28 330 299)"/>`;
    s += tri(334, 262, 10, -14, INK.butter);
    s += `<path d="M346 334 A16 16 0 0 0 330 318 L330 334 Z" fill="${INK.coral}"/>`;
    s += `<circle cx="252" cy="108" r="4" fill="${INK.butter}"/><circle cx="318" cy="330" r="2.6" fill="${INK.cream}"/>`;
    svg('deco', [0, 80, 360, 250], `<g transform="translate(0 -20)">${s}</g>`);
}

/* Sun: a coral disc behind the box, with a ring printed slightly off register */
{
    const [cx, cy, r] = SUN;
    svg('sun', [cx - r - 6, cy - r - 6, r * 2 + 12, r * 2 + 12],
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK.coral}"/>` +
        `<circle cx="${cx + 2.2}" cy="${cy - 2.2}" r="${r}" fill="none" stroke="${INK.cream}" stroke-width="1.1"/>`);
    // rays: short butter strokes that pop out when the candle is lit
    let s = '';
    for (let k = 0; k < 16; k++) {
        const t = (k * 22.5 * Math.PI) / 180, long = k % 2 === 0;
        const r0 = r + 7, r1 = r + (long ? 18 : 13);
        s += `<line x1="${f(cx + r0 * Math.cos(t))}" y1="${f(cy + r0 * Math.sin(t))}" x2="${f(cx + r1 * Math.cos(t))}" y2="${f(cy + r1 * Math.sin(t))}" stroke="${long ? INK.butter : INK.cream}" stroke-width="${long ? 3.4 : 2.2}"/>`;
    }
    svg('rays', [cx - 62, cy - 62, 124, 124], s);
}

/* Garland: plain paper triangles on a sagging string across the top */
{
    const x0 = -14, x1 = 374, y0 = 22, sag = 24, n = 13;
    const at = t => [x0 + (x1 - x0) * t, y0 + sag * 4 * t * (1 - t)];
    let s = `<polyline points="${pts(Array.from({ length: 41 }, (_, i) => at(i / 40)))}" fill="none" stroke="${INK.cream}" stroke-width="1.2"/>`;
    const cols = [INK.coral, INK.butter, INK.cream];
    for (let i = 0; i < n; i++) {
        const a = at((i + 0.14) / n), b = at((i + 0.86) / n);
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        const tip = [mx - (dy / len) * 17, my + (dx / len) * 17];
        s += `<polygon points="${pts([a, b, tip])}" fill="${cols[i % 3]}"/>`;
        s += `<polygon points="${pts([[mx, my], b, tip])}" fill="${INK.deep}" opacity="0.16"/>`;
    }
    svg('garland', [-20, 14, 400, 60], s);
}

/* The box's shadow on the table: one flat offset shape */
svg('shadow', [70, 334, 250, 24],
    `<polygon points="${pts([[BX0 + 6, BY1 - 2], [BX1, BY1 - 2], [BX1 + 24, BY1 + 12], [BX0 + 30, BY1 + 12]])}" fill="${TINT.butterDim}"/>`);

/* Inside of the box: far wall and the two side walls, seen once the lid is off */
{
    const bx0 = BX0 + 16, bx1 = BX1 - 16, by = 236;
    svg('box-in', [68, 232, 224, 36],
        `<rect x="${bx0}" y="${by}" width="${bx1 - bx0}" height="${BY0 + 1 - by}" fill="${TINT.creamShade}"/>` +
        `<polygon points="${pts([[BX0, BY0 + 1], [bx0, by], [bx0, BY0 + 1]])}" fill="${TINT.creamDim2}"/>` +
        `<polygon points="${pts([[BX1, BY0 + 1], [bx1, by], [bx1, BY0 + 1]])}" fill="${TINT.creamLine}"/>` +
        `<polyline points="${pts([[BX0 + 0.7, BY0], [bx0, by], [bx1, by], [BX1 - 0.7, BY0]])}" fill="none" stroke="${INK.cream}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>`);
}

/* Cake on its plate, with the candle (they rise together): flat bands, a scalloped icing edge */
{
    const cx = 180, ry = 13, RX = 72;
    const band = (y0, y1, rx, fill) => `<path d="M${cx - rx} ${y0} L${cx - rx} ${y1} A${rx} ${ry} 0 0 0 ${cx + rx} ${y1} L${cx + rx} ${y0} Z" fill="${fill}"/>`;
    const shade = (y0, y1, rx, fill, k = 0.44) => {
        const xs = cx + rx * k, dy = ry * Math.sqrt(1 - k * k);
        return `<path d="M${f(xs)} ${y0} L${f(xs)} ${f(y1 + dy)} A${rx} ${ry} 0 0 0 ${cx + rx} ${y1} L${cx + rx} ${y0} Z" fill="${fill}"/>`;
    };
    let s = '';
    // plate: cream, a thin butter rim, the cake's flat shadow on it
    s += `<ellipse cx="${cx}" cy="267" rx="88" ry="13" fill="${INK.cream}"/>`;
    s += `<ellipse cx="${cx}" cy="267" rx="85" ry="11.4" fill="none" stroke="${INK.butter}" stroke-width="1.8"/>`;
    s += `<ellipse cx="${cx + 5}" cy="265.5" rx="${RX + 3}" ry="${ry}" fill="${TINT.creamDim2}"/>`;
    // lower layer, cream between, upper layer
    s += band(243, 262, RX, INK.brown) + shade(243, 262, RX, TINT.brownDim);
    s += band(235, 243, RX + 1.5, INK.cream) + shade(235, 243, RX + 1.5, TINT.creamDim2);
    s += band(214, 235, RX, INK.brown) + shade(214, 235, RX, TINT.brownDim);
    // icing: a cap that turns over the edge in scallops
    {
        const rx = RX + 3, y0 = 204, n = 9;
        const p = t => [cx + rx * Math.cos(t), y0 + 8 + ry * Math.sin(t)];
        let d = `M${cx - rx} ${y0} L${cx - rx} ${y0 + 8}`;
        for (let i = 0; i < n; i++) {
            const t1 = Math.PI - (Math.PI * (i + 1)) / n, tm = Math.PI - (Math.PI * (i + 0.5)) / n;
            const [mx, my] = p(tm), [ex, ey] = p(t1);
            d += ` Q${f(mx)} ${f(my + 13)} ${f(ex)} ${f(ey)}`;
        }
        d += ` L${cx + rx} ${y0} Z`;
        s += `<path d="${d}" fill="${TINT.creamDim}"/>`;
        s += `<ellipse cx="${cx}" cy="${y0}" rx="${rx}" ry="${ry + 1}" fill="${INK.cream}"/>`;
        s += `<ellipse cx="${cx}" cy="${y0}" rx="${rx - 11}" ry="${ry - 3}" fill="none" stroke="${INK.butter}" stroke-width="1.2"/>`;
    }
    // a few berries
    for (const [x, y, r] of [[141, 203, 4.8], [151, 207.5, 4.2], [132.5, 207, 3.8], [214, 207, 4.4], [223, 203.5, 3.6]]) {
        s += `<circle cx="${x + 1.4}" cy="${y + 1.6}" r="${r}" fill="${TINT.creamDim2}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${INK.coral}"/>`;
    }
    // candle: a cream taper, its shaded side, a butter collar
    const cw = 2.8, ct = 160, cb = 203;
    s += `<rect x="${cx - cw}" y="${ct}" width="${cw * 2}" height="${cb - ct}" fill="${INK.cream}"/>`;
    s += `<rect x="${cx + 0.8}" y="${ct}" width="${cw - 0.8}" height="${cb - ct}" fill="${TINT.creamDim2}"/>`;
    s += `<ellipse cx="${cx}" cy="${cb}" rx="6" ry="2.4" fill="${INK.butter}"/>`;
    s += `<rect x="${cx - 0.6}" y="${ct - 4}" width="1.2" height="4" fill="${INK.deep}"/>`;
    svg('cake', [88, 124, 184, 134], `<g transform="translate(0 -26)">${s}</g>`);
}

/* Flame: two flat teardrops, cream in butter */
{
    const [fx, fy] = FLAME;
    const outer = `M${fx} ${fy - 17} C${fx + 6.5} ${fy - 7} ${fx + 7.5} ${fy + 1} ${fx + 6.4} ${fy + 5.6} C${fx + 5.2} ${fy + 10.4} ${fx + 2.6} ${fy + 12.4} ${fx} ${fy + 12.4} C${fx - 2.6} ${fy + 12.4} ${fx - 5.2} ${fy + 10.4} ${fx - 6.4} ${fy + 5.6} C${fx - 7.5} ${fy + 1} ${fx - 6.5} ${fy - 7} ${fx} ${fy - 17} Z`;
    const inner = `M${fx} ${fy - 6} C${fx + 3.4} ${fy} ${fx + 3.8} ${fy + 4} ${fx + 3} ${fy + 7} C${fx + 2.2} ${fy + 10} ${fx + 1} ${fy + 11} ${fx} ${fy + 11} C${fx - 1} ${fy + 11} ${fx - 2.2} ${fy + 10} ${fx - 3} ${fy + 7} C${fx - 3.8} ${fy + 4} ${fx - 3.4} ${fy} ${fx} ${fy - 6} Z`;
    svg('flame', [fx - 16, fy - 22, 32, 40], `<path d="${outer}" fill="${INK.butter}"/><path d="${inner}" fill="${INK.cream}"/>`);
}

/* Box body: the low front wall of a bakery box */
{
    const w = BX1 - BX0, h = BY1 - BY0;
    let s = `<rect x="${BX0}" y="${BY0}" width="${w}" height="${h}" fill="${TINT.creamDim}"/>`;
    s += `<rect x="${BX1 - 14}" y="${BY0}" width="14" height="${h}" fill="${TINT.creamDim2}"/>`;
    s += `<rect x="${BX0 + 13.4}" y="${BY0}" width="1" height="${h}" fill="${TINT.creamLine}"/>`;
    s += `<rect x="${BX0}" y="${BY1 - 8}" width="${w}" height="1" fill="${TINT.creamLine}"/>`;
    for (const x of TABS) s += `<rect x="${x - 15}" y="${LY1 + 9}" width="30" height="1.4" fill="${TINT.creamLine}"/>`;
    s += `<rect x="${BX0}" y="${BY0}" width="${w}" height="1.4" fill="${INK.cream}"/>`;
    svg('body', [68, 260, 224, 84], s);
}

/* The flat shade the lid lays on the body */
svg('lid-shade', [68, 268, 224, 10], `<rect x="${BX0}" y="${LY1}" width="${BX1 - BX0}" height="5" fill="${TINT.creamShade}"/>`);

/* Lid: top seen from slightly above, front band with its seam, two tuck tabs */
{
    const topP = [[TX0, TY], [TX1, TY], [LX1, LY0], [LX0, LY0]];
    let s = '';
    for (const x of TABS) s += `<path d="M${x - 13} ${LY1 - 1} L${x - 13} ${LY1 + 5} Q${x - 13} ${LY1 + 9} ${x - 9} ${LY1 + 9} L${x + 9} ${LY1 + 9} Q${x + 13} ${LY1 + 9} ${x + 13} ${LY1 + 5} L${x + 13} ${LY1 - 1} Z" fill="${TINT.creamDim}" stroke="${TINT.creamLine}" stroke-width="1"/>`;
    s += `<polygon points="${pts(topP)}" fill="${INK.cream}"/>`;
    const ins = [[TX0 + 13, TY + 6], [TX1 - 13, TY + 6], [LX1 - 17, LY0 - 6], [LX0 + 17, LY0 - 6]];
    s += `<polygon points="${pts(ins)}" fill="none" stroke="${TINT.creamDim2}" stroke-width="1" stroke-linejoin="round"/>`;
    s += `<polyline points="${pts([ins[3], [LX0, LY0]])}" fill="none" stroke="${TINT.creamDim2}" stroke-width="1"/><polyline points="${pts([ins[2], [LX1, LY0]])}" fill="none" stroke="${TINT.creamDim2}" stroke-width="1"/>`;
    s += `<rect x="${LX0}" y="${LY0}" width="${LX1 - LX0}" height="${LY1 - LY0}" fill="${TINT.creamDim}"/>`;
    s += `<rect x="${LX1 - 15}" y="${LY0}" width="15" height="${LY1 - LY0}" fill="${TINT.creamDim2}"/>`;
    s += `<rect x="${LX0 + 14.5}" y="${LY0}" width="1" height="${LY1 - LY0}" fill="${TINT.creamLine}"/>`;
    s += `<rect x="${LX0}" y="${LY1 - 1.6}" width="${LX1 - LX0}" height="1.6" fill="${TINT.creamLine}"/>`;
    svg('lid', [60, 204, 240, 80], s);
}

/* Baker's twine: coral with a cream twist; its shadow is one offset line */
const twine = (d, w = 3.4) =>
    `<path d="${d}" fill="none" stroke="${INK.coral}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${INK.cream}" stroke-width="${w}" stroke-dasharray="1.8 4.8" stroke-dashoffset="1"/>`;
const twineShade = (d, w = 3.4) => `<path d="${d}" fill="none" stroke="${TINT.creamDim2}" stroke-width="${w}" stroke-linecap="round" transform="translate(1.6 2)"/>`;
{
    const [kx, ky] = KNOT;
    const hx0 = LX0 + ((LY0 - ky) / (LY0 - TY)) * (TX0 - LX0), hx1 = 360 - hx0;
    const across = `M${f(hx0)} ${ky} L${f(hx1)} ${ky}`;
    const down = `M${kx} ${TY} L${kx} ${BY1 - 1.7}`;
    const tl = `M${kx - 2} ${ky + 2} C${kx - 6} ${ky + 10} ${kx - 11} ${ky + 19} ${kx - 15} ${ky + 30}`;
    const tr = `M${kx + 2} ${ky + 2} C${kx + 7} ${ky + 11} ${kx + 12} ${ky + 21} ${kx + 17} ${ky + 33}`;
    svg('twine', [60, 202, 240, 146], twineShade(across) + twine(across) + twine(down) + twineShade(tl) + twineShade(tr) + twine(tl) + twine(tr));
    for (const side of [-1, 1]) {
        const X = x => (side < 0 ? x : 360 - x);
        const d = `M${X(178)} ${ky - 1} C${X(168)} ${ky - 18} ${X(144)} ${ky - 23} ${X(140)} ${ky - 12} C${X(137)} ${ky - 3} ${X(160)} ${ky + 2} ${X(178)} ${ky + 1}`;
        svg(side < 0 ? 'loop-l' : 'loop-r', side < 0 ? [130, 198, 54, 36] : [176, 198, 54, 36], twineShade(d) + twine(d));
    }
    svg('knot', [kx - 8, ky - 8, 16, 16],
        `<ellipse cx="${kx + 1.4}" cy="${ky + 1.8}" rx="4.8" ry="4" fill="${TINT.creamDim2}"/>` +
        `<ellipse cx="${kx}" cy="${ky}" rx="4.8" ry="4" fill="${INK.coral}"/>` +
        `<path d="M${kx - 2.6} ${ky + 1.6} L${kx + 2.6} ${ky - 1.6}" fill="none" stroke="${INK.cream}" stroke-width="1.5"/>`);
}

/* Paper streamers: flat curled strips that drop from above (each grows down from its top edge) */
for (const [name, x, y0, len, light, dark, amp, wave, ph] of [
    ['str-a', 274, 10, 206, INK.cream, TINT.creamShade, 6.5, 46, 0],
    ['str-b', 302, 10, 250, INK.coral, TINT.coralDim, 7.5, 54, 1.9],
    ['str-c', 330, 10, 170, INK.butter, TINT.butterDim, 6, 42, 3.6],
]) {
    const ang = y => (2 * Math.PI * (y - y0)) / wave + ph;
    const at = y => [x + amp * Math.sin(ang(y)), y];
    const all = [], backs = [];
    let cur = null;
    for (let y = y0; y <= y0 + len - 4; y += 1.5) {
        all.push(at(y));
        if (Math.cos(ang(y)) < 0) (cur ??= []).push(at(y));
        else if (cur) { backs.push(cur); cur = null; }
    }
    if (cur) backs.push(cur);
    const line = (p, col) => `<polyline points="${pts(p)}" fill="none" stroke="${col}" stroke-width="5.8" stroke-linejoin="round"/>`;
    svg(name, [x - 14, y0, 28, len], line(all, light) + backs.filter(b => b.length > 1).map(b => line(b, dark)).join(''));
}

/* Confetti: flat geometric pieces */
svg('conf-a', [172, 181, 16, 16], `<rect x="174" y="211.6" width="12" height="6.8" fill="${INK.coral}" transform="translate(0 -26) rotate(-18 180 215)"/>`);
svg('conf-b', [174, 183, 12, 12], `<circle cx="180" cy="189" r="4.6" fill="${INK.butter}"/>`);
svg('conf-c', [172, 181, 16, 16], tri(180, 189.5, 6.6, 12, INK.cream));

/* Print grain: a speckle of tiny dots over the whole sheet, light and dark */
{
    const r = rng(404);
    const dots = n => {
        let s = '';
        for (let i = 0; i < n; i++) s += `<circle cx="${Math.round(r() * 3600) / 10}" cy="${Math.round(r() * 4500) / 10}" r="${(0.3 + r() * r() * 0.8).toFixed(1)}"/>`;
        return s;
    };
    svg('grain', [0, 0, 360, 450],
        `<g fill="${INK.cream}" opacity="0.16">${dots(520)}</g><g fill="${INK.deep}" opacity="0.2">${dots(520)}</g>`);
}

console.log(JSON.stringify(BOX));
