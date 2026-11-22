// Generator for the "terminal" wrapper art: a desk at night, seen straight on. An old CRT monitor fills
// the frame; on its glass a window of source code, drawn as rounded blocks of very different lengths,
// indented, in four tones: never a letter, a digit or a glyph. Below it the top of a keyboard, a mug, a
// lamp's warm pool. Flat shapes; glows are gradients with alpha stops: no filter, no blend mode. Every
// colour is in the palette `C`.
// The room (wall, casing, desk) is one layer with a hole where the glass is, and lies OVER everything
// on the screen: whatever slides or scrolls off the glass goes behind the bezel.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/terminal.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'terminal');
if (!OUT.endsWith('wrappers/terminal')) throw new Error('out dir must be public/wrappers/terminal');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: the night, the phosphor in two strengths, the glass, the casing and its edge, two greys of
   plastic and ceramic, the desk, the white-green of full light, and one amber. */
const C = {
    night: '#020804',
    phos: '#19FF7A',
    dim: '#0B7A3B',
    glass: '#0A1A10',
    casing: '#1A1D1B',
    edge: '#343A36',
    cap: '#525C56',
    desk: '#0B110D',
    light: '#D8FFE8',
    amber: '#FFB454',
};

const f = n => String(Math.round(n * 100) / 100);
const boxes = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    boxes[name] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
const rr = (x, y, w, h, r, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}"${extra}/>`;
/* ---------- geometry ---------- */
const GX = 40, GY = 50, GW = 280, GH = 236; // the glass
const CX = GX + GW / 2, CY = GY + GH / 2; // (180, 168)
/** The glass: a rounded rectangle whose sides bulge a little. */
const glassPath = (() => {
    const x0 = GX, y0 = GY, x1 = GX + GW, y1 = GY + GH, r = 24, b = 4;
    return `M${x0 + r} ${y0}Q${CX} ${y0 - b} ${x1 - r} ${y0}Q${x1} ${y0} ${x1} ${y0 + r}Q${x1 + b} ${CY} ${x1} ${y1 - r}Q${x1} ${y1} ${x1 - r} ${y1}Q${CX} ${y1 + b} ${x0 + r} ${y1}Q${x0} ${y1} ${x0} ${y1 - r}Q${x0 - b} ${CY} ${x0} ${y0 + r}Q${x0} ${y0} ${x0 + r} ${y0}Z`;
})();

/* ---- glass: what the hole in the room shows. Lit from within: brighter in the middle, darker to the corners. ---- */
{
    const B = [GX - 10, GY - 10, GW + 20, GH + 20];
    let s = `<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="190"><stop offset="0" stop-color="${C.dim}" stop-opacity="0.28"/><stop offset="0.6" stop-color="${C.dim}" stop-opacity="0.1"/><stop offset="1" stop-color="${C.night}" stop-opacity="0.7"/></radialGradient></defs>`;
    s += `<rect x="${B[0]}" y="${B[1]}" width="${B[2]}" height="${B[3]}" fill="${C.glass}"/><rect x="${B[0]}" y="${B[1]}" width="${B[2]}" height="${B[3]}" fill="url(#g)"/>`;
    svg('glass', B, s);
}

/* ---- the code: lines of rounded blocks, filling the window to one row short of its foot. A line is an indent and its blocks: [length, tone]. ---- */
const X0 = 66, INDENT = 13, PITCH = 10, BH = 6.5, GAP = 4, Y0 = 84;
const TONE = { p: [C.phos, 1], m: [C.phos, 0.62], d: [C.dim, 1], w: [C.light, 1], a: [C.amber, 1] };
const PRE = [
    [0, [[22, 'a'], [52, 'w'], [10, 'd']]],
    [1, [[34, 'p'], [72, 'm']]],
    [1, [[16, 'a'], [58, 'p'], [26, 'd'], [18, 'm']]],
    [2, [[94, 'p'], [12, 'd']]],
    [2, [[24, 'm'], [40, 'w'], [66, 'p']]],
    [3, [[28, 'a'], [40, 'p']]],
    [3, [[124, 'p'], [20, 'm']]],
    [2, [[16, 'd']]],
    [1, [[20, 'a'], [46, 'm'], [14, 'p'], [52, 'd']]],
    [1, [[78, 'p'], [22, 'w']]],
    [1, [[18, 'a'], [36, 'p'], [64, 'm']]],
    [2, [[52, 'w'], [14, 'd'], [30, 'p']]],
    [2, [[104, 'p']]],
    [3, [[26, 'a'], [44, 'm'], [20, 'w']]],
    [1, [[10, 'd']]],
    [0, [[12, 'd']]],
    [0, [[30, 'a'], [50, 'p']]],
];
const TYPED = [
    [1, [[20, 'm'], [86, 'p'], [16, 'd']]],
    [2, [[18, 'a'], [62, 'w']]],
    [2, [[112, 'p'], [30, 'm']]],
    [3, [[40, 'm'], [24, 'a'], [30, 'p']]],
    [1, [[14, 'd'], [58, 'p']]],
];
/** One line at row `row`: its picture, and where it starts and ends. */
function line(row, [indent, blocks]) {
    const y = Y0 + PITCH * row;
    let x = X0 + INDENT * indent, s = '';
    const start = x;
    for (const [len, tone] of blocks) {
        const [col, o] = TONE[tone];
        s += rr(x, y, len, BH, BH / 2, col, o < 1 ? ` opacity="${o}"` : '');
        x += len + GAP;
    }
    return { s, y, start, end: x - GAP };
}
const pre = PRE.map((l, i) => line(i, l));
const typed = TYPED.map((l, i) => line(PRE.length + i, l));
{
    const layer = (name, lines) => {
        const x1 = Math.max(...lines.map(l => l.end));
        svg(name, [X0, lines[0].y, x1 - X0, lines[lines.length - 1].y + BH - lines[0].y], lines.map(l => l.s).join(''));
    };
    layer('code-a', pre.slice(0, 9));
    layer('code-b', pre.slice(9));
    typed.forEach((l, i) => svg(`type-${i + 1}`, [l.start, l.y, l.end - l.start, BH], l.s));
}
/* ---- cursor: a block, drawn after the end of the last line that stands when the gift is closed ---- */
const CUR = [pre[pre.length - 1].end + GAP, pre[pre.length - 1].y - 2, 7, 10];
svg('cursor', CUR, rr(CUR[0], CUR[1], CUR[2], CUR[3], 1.5, C.phos));

/* ---- the window: a frame and a title strip with two marks (a dot and a short pill), in two halves that part.
   Its body is left open, so the code under it shows and can scroll away beneath the strip. ---- */
const WX = 54, WY = 54, WW = 252, WH = 222, TH = 18;
{
    const half = left => {
        const x = left ? WX : CX, w = WW / 2, r = 8;
        const xo = left ? x : x + w; // the outer side
        const xi = left ? x + w : x; // the side at the seam
        const k = left ? 1 : -1;
        // The frame: the outer side with its two round corners, open at the seam.
        const frame = `M${xi} ${WY}L${xo + k * r} ${WY}Q${xo} ${WY} ${xo} ${WY + r}L${xo} ${WY + WH - r}Q${xo} ${WY + WH} ${xo + k * r} ${WY + WH}L${xi} ${WY + WH}`;
        // The strip: filled, round at the outer top corner only.
        const strip = `M${xi} ${WY}L${xo + k * r} ${WY}Q${xo} ${WY} ${xo} ${WY + r}L${xo} ${WY + TH}L${xi} ${WY + TH}Z`;
        let s = `<path d="${strip}" fill="${C.dim}"/><path d="${frame}" fill="none" stroke="${C.phos}" stroke-width="1.6" opacity="0.85"/>`;
        if (left) s += `<circle cx="${WX + 14}" cy="${WY + TH / 2}" r="3.4" fill="${C.amber}"/>` + rr(WX + 23, WY + TH / 2 - 2.5, 18, 5, 2.5, C.phos);
        
        svg(left ? 'win-l' : 'win-r', [x - (left ? 1 : 0), WY - 1, w + 1, WH + 2], s);
    };
    half(true);
    half(false);
}

/* ---- progress: a track, and the bar that fills it ---- */
const TR = [92, 190, 176, 14];
svg('track', TR, rr(TR[0] + 1, TR[1] + 1, TR[2] - 2, TR[3] - 2, 6, C.night, ' opacity="0.85"') + `<rect x="${TR[0] + 1}" y="${TR[1] + 1}" width="${TR[2] - 2}" height="${TR[3] - 2}" rx="6" fill="none" stroke="${C.dim}" stroke-width="1.5"/>`);
const BAR = [TR[0] + 4, TR[1] + 4, TR[2] - 8, TR[3] - 8];
svg('bar', BAR, rr(BAR[0], BAR[1], BAR[2], BAR[3], 3, C.amber));

/* ---- the payoff: a panel of light at the middle of the glass, and the air it lights ---- */
const PW = 176, PH = 112;
{
    const B = [CX - 156, CY - 128, 312, 256];
    svg('glow', B, `<defs><radialGradient id="h"><stop offset="0" stop-color="${C.phos}" stop-opacity="0.62"/><stop offset="0.5" stop-color="${C.phos}" stop-opacity="0.26"/><stop offset="1" stop-color="${C.phos}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${CX}" cy="${CY}" rx="156" ry="128" fill="url(#h)"/>`);
    const P = [CX - PW / 2, CY - PH / 2, PW, PH];
    let s = `<defs><radialGradient id="p" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${PW / 2}"><stop offset="0" stop-color="${C.light}" stop-opacity="1"/><stop offset="0.65" stop-color="${C.light}" stop-opacity="0.9"/><stop offset="1" stop-color="${C.light}" stop-opacity="0.45"/></radialGradient></defs>`;
    s += rr(P[0], P[1], PW, PH, 16, C.phos) + rr(P[0] + 3, P[1] + 3, PW - 6, PH - 6, 13, 'url(#p)');
    // Quiet flat structure, not words: a ribbon across the panel and one down it, and a flat knot where they cross.
    // The upright ribbon stands left of the middle, as on a wrapped box.
    const RB = 15, KX = CX - 36;
    s += `<rect x="${P[0] + 3}" y="${CY - RB / 2}" width="${PW - 6}" height="${RB}" fill="${C.phos}" opacity="0.4"/><rect x="${KX - RB / 2}" y="${P[1] + 3}" width="${RB}" height="${PH - 6}" fill="${C.phos}" opacity="0.4"/>`;
    const dia = (r, fill, extra = '') => `<path d="M${KX} ${CY - r}L${KX + r} ${CY}L${KX} ${CY + r}L${KX - r} ${CY}Z" fill="${fill}" stroke="${fill}" stroke-width="4" stroke-linejoin="round"${extra}/>`;
    s += dia(13, C.dim, ' opacity="0.85"') + dia(5.5, C.light);
    svg('panel', P, s);
}

/* ---- bits: six small pixels on one diagonal through the panel, three beyond each of two opposite corners.
   The layer grows about the panel's middle, so they drift outward along that line. ---- */
{
    const B = [CX - 132, CY - 108, 264, 216];
    const px = (dx, dy, size, col, o) => `<rect x="${f(CX + dx - size / 2)}" y="${f(CY + dy - size / 2)}" width="${size}" height="${size}" fill="${col}"${o < 1 ? ` opacity="${o}"` : ''}/>`;
    const s = px(-100, -70, 6, C.phos, 1) + px(-112, -86, 5, C.light, 1) + px(-126, -100, 4, C.phos, 0.6) + px(102, 72, 6, C.amber, 1) + px(113, 88, 5, C.phos, 1) + px(126, 101, 4, C.phos, 0.6);
    svg('bits', B, s);
}

/* ---- reflection: a soft slash of the room on the glass, upper left ---- */
{
    const B = [GX, GY, 132, 132];
    const slash = (a, b) => `<path d="M${GX + a} ${GY}L${GX + b} ${GY}L${GX} ${GY + b}L${GX} ${GY + a}Z" fill="url(#s)"/>`;
    svg('reflect', B, `<defs><linearGradient id="s" gradientUnits="userSpaceOnUse" x1="${GX + 110}" y1="${GY}" x2="${GX}" y2="${GY + 110}"><stop offset="0" stop-color="${C.light}" stop-opacity="0.2"/><stop offset="1" stop-color="${C.light}" stop-opacity="0.03"/></linearGradient></defs>${slash(64, 112)}${slash(122, 132)}`);
}

/* ---- room: the wall, the monitor's casing, the desk. One layer, with a hole for the glass. ---- */
const CASE = [18, 30, 324, 308];
const DESK_Y = 360;
{
    const B = [-6, -6, 372, 462];
    const holed = (d, attrs) => `<path d="${d}${glassPath}" fill-rule="evenodd" ${attrs}/>`;
    const rectPath = (x, y, w, h, r) => `M${x + r} ${y}L${x + w - r} ${y}Q${x + w} ${y} ${x + w} ${y + r}L${x + w} ${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}L${x + r} ${y + h}Q${x} ${y + h} ${x} ${y + h - r}L${x} ${y + r}Q${x} ${y} ${x + r} ${y}Z`;
    let s = `<defs><radialGradient id="w" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="270"><stop offset="0.5" stop-color="${C.dim}" stop-opacity="0.75"/><stop offset="1" stop-color="${C.dim}" stop-opacity="0"/></radialGradient>` +
        `<radialGradient id="d" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${CX} ${DESK_Y + 6}) scale(200 62)"><stop offset="0" stop-color="${C.phos}" stop-opacity="0.2"/><stop offset="1" stop-color="${C.phos}" stop-opacity="0"/></radialGradient></defs>`;
    const all = rectPath(B[0], B[1], B[2], B[3], 0.01);
    // Wall: the night, and the green the screen throws on it round the casing.
    s += holed(all, `fill="${C.night}"`) + holed(all, 'fill="url(#w)"');
    // Desk, and the light the screen lays on it.
    s += `<rect x="-6" y="${DESK_Y}" width="372" height="${456 - DESK_Y}" fill="${C.desk}"/><rect x="-6" y="${DESK_Y}" width="372" height="96" fill="url(#d)"/><rect x="-6" y="${DESK_Y}" width="372" height="2" fill="${C.edge}" opacity="0.7"/>`;
    // Cable: from behind the foot, across the desk and off to the right.
    s += `<path d="M236 ${DESK_Y + 6}C272 ${DESK_Y + 22} 292 ${DESK_Y - 2} 326 ${DESK_Y + 8}S352 ${DESK_Y + 20} 368 ${DESK_Y + 12}" fill="none" stroke="${C.edge}" stroke-width="3.5" stroke-linecap="round"/>`;
    // Stand: a neck and a foot.
    s += rr(146, CASE[1] + CASE[3] - 6, 68, 24, 3, C.night) + rr(102, DESK_Y - 8, 156, 14, 7, C.casing) + rr(108, DESK_Y - 8, 144, 2.5, 1.2, C.edge);
    // Casing: one dark warm grey with a lighter edge all round.
    s += holed(rectPath(CASE[0], CASE[1], CASE[2], CASE[3], 22), `fill="${C.edge}"`) + holed(rectPath(CASE[0] + 3, CASE[1] + 3, CASE[2] - 6, CASE[3] - 6, 19), `fill="${C.casing}"`);
    // The recess round the glass, and the light on its lip.
    s += `<path d="${glassPath}" fill="none" stroke="${C.night}" stroke-width="9"/><path d="${glassPath}" fill="none" stroke="${C.phos}" stroke-width="2" opacity="0.7"/>`;
    // Vents in the chin: slots of unequal length.
    const VY = GY + GH + 20;
    s += [[58, 0, 84], [72, 10, 56], [65, 20, 70]].map(([x, dy, w]) => rr(x, VY + dy, w, 4.5, 2.25, C.night)).join('');
    // A square button, and the seat of the power light.
    s += rr(254, VY + 3, 16, 16, 4, C.edge) + `<circle cx="296" cy="${VY + 11}" r="6.5" fill="${C.night}"/><circle cx="296" cy="${VY + 11}" r="3.6" fill="${C.amber}"/>`;
    svg('room', B, s);
}
/* ---- led: the power light's air ---- */
{
    const cx = 296, cy = GY + GH + 31, r = 20;
    svg('led', [cx - r, cy - r, 2 * r, 2 * r], `<defs><radialGradient id="l"><stop offset="0" stop-color="${C.amber}" stop-opacity="0.8"/><stop offset="0.35" stop-color="${C.amber}" stop-opacity="0.3"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#l)"/>`);
}

/* ---- desk things: the top of a keyboard, a mug to the right ---- */
const KB = [66, 386, 228, 76];
const keys = [];
let mugPath = '';
{
    // Each row: key widths, a negative number being a gap. The last key runs to the edge.
    const rows = [
        [16, -9, 16, 16, 16, 16, -9, 16, 16, 16, 16, -9, 16, 16],
        [25, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
        [33, 16, 16, 16, 62, 16, 16, 16],
    ];
    const x0 = KB[0] + 8, x1 = KB[0] + KB[2] - 8;
    rows.forEach((row, ri) => {
        let x = x0;
        const y = KB[1] + 8 + ri * 20;
        row.forEach((w, i) => {
            if (w < 0) { x += -w - 3; return; }
            const last = i === row.length - 1;
            const width = last ? x1 - x : w;
            keys.push({ x, y, w: width, row: ri, i, last });
            x += width + 3;
        });
    });
    let s = rr(KB[0], KB[1], KB[2], KB[3], 9, C.casing) + `<rect x="${KB[0] + 1}" y="${KB[1] + 1}" width="${KB[2] - 2}" height="${KB[3] - 2}" rx="8" fill="none" stroke="${C.edge}" stroke-width="2"/>`;
    for (const k of keys) {
        const col = k.row === 0 && k.i === 0 ? C.amber : k.last || (k.i === 0 && k.row > 0) ? C.edge : C.cap;
        s += rr(k.x, k.y, k.w, 17, 3.5, col);
    }
    // Mug: a plain cylinder seen from the side, a darker side away from the lamp, a band, a handle.
    const MX = 306, MY = 372, MW = 38, MH = 58;
    s += `<path d="M${MX + MW - 2} ${MY + 14}C${MX + MW + 20} ${MY + 12} ${MX + MW + 20} ${MY + 44} ${MX + MW - 2} ${MY + 42}" fill="none" stroke="${C.cap}" stroke-width="6" stroke-linecap="round"/>`;
    mugPath = `M${MX} ${MY}L${MX + MW} ${MY}L${MX + MW} ${MY + MH - 9}Q${MX + MW} ${MY + MH} ${MX + MW - 9} ${MY + MH}L${MX + 9} ${MY + MH}Q${MX} ${MY + MH} ${MX} ${MY + MH - 9}Z`;
    s += `<path d="${mugPath}" fill="${C.cap}"/>`;
    s += `<path d="M${MX + MW - 12} ${MY}L${MX + MW} ${MY}L${MX + MW} ${MY + MH - 9}Q${MX + MW} ${MY + MH} ${MX + MW - 9} ${MY + MH}L${MX + MW - 12} ${MY + MH}Z" fill="${C.edge}"/>`;
    s += `<rect x="${MX}" y="${MY + 12}" width="${MW}" height="7" fill="${C.amber}"/>` + rr(MX - 1, MY - 2, MW + 2, 5, 2.5, C.light, ' opacity="0.85"');
    svg('desk', [62, 366, 306, 92], s);
}
/* ---- lamp: only its light, the lamp itself being out of the picture to the left: a warm pool on the desk ---- */
{
    const B = [-8, 384, 190, 74];
    svg('lamp', B, `<defs><radialGradient id="o" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(34 430) scale(140 44)"><stop offset="0" stop-color="${C.amber}" stop-opacity="0.7"/><stop offset="0.45" stop-color="${C.amber}" stop-opacity="0.3"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient></defs><ellipse cx="34" cy="430" rx="140" ry="44" fill="url(#o)"/>`);
}
/* ---- wash: the green the open screen throws down on the keyboard and the mug ---- */
{
    const B = [0, DESK_Y - 10, 360, 100];
    let s = `<defs><linearGradient id="v" gradientUnits="userSpaceOnUse" x1="0" y1="${DESK_Y}" x2="0" y2="${DESK_Y + 90}"><stop offset="0" stop-color="${C.phos}" stop-opacity="0.24"/><stop offset="0.6" stop-color="${C.phos}" stop-opacity="0.08"/><stop offset="1" stop-color="${C.phos}" stop-opacity="0"/></linearGradient></defs>`;
    s += `<rect x="0" y="${DESK_Y}" width="360" height="90" fill="url(#v)"/>`;
    // Whole shapes take the tint, nearest the screen the most: the foot, every key, the mug.
    s += rr(102, DESK_Y - 8, 156, 14, 7, C.phos, ' opacity="0.22"');
    for (const k of keys) s += rr(k.x, k.y, k.w, 17, 3.5, C.phos, ` opacity="${f(0.26 - k.row * 0.07)}"`);
    s += `<path d="${mugPath}" fill="${C.phos}" opacity="0.2"/>`;
    svg('wash', B, s);
}

/* What the definition needs to know. */
console.log(JSON.stringify({ boxes, cursor: CUR, typed: typed.map(l => [l.start, l.end, l.y]) }));
