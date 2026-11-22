// Generator for the "flap" wrapper art: a split-flap departure board, the mechanical kind of old
// stations, as a flat graphic. Six columns by seven rows of flaps in a slim metal housing. No
// letter, digit or glyph anywhere: a flap carries plain colour and simple geometric fields only.
// Closed, most flaps are dark and a loose diagonal of them shows colour. Open, the flaps together
// show ONE picture across the whole board: a wrapped parcel in large flat fields.
// Flat fills, no filter, no blend; glows are gradients with alpha stops. Every colour is in `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/flap.gen.mjs   (prints every layer box)
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'flap');
if (!OUT.endsWith('wrappers/flap')) throw new Error('out dir must be public/wrappers/flap');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: the board, a dark flap, the tone of its hinge, warm white, signal yellow, coral, teal, metal in two tones. */
const C = {
    board: '#14161A',
    flap: '#22262D',
    hinge: '#3A414C',
    white: '#F3EFE6',
    yellow: '#F5B82E',
    coral: '#E4572E',
    teal: '#1E9E8F',
    metal: '#6B7480',
    metalLo: '#454C57',
};

const f = n => String(Math.round(n * 100) / 100);
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const rrect = (x, y, w, h, r, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra}/>`;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const boxes = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    boxes[name] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}

/* ---- the grid: 6 columns x 7 rows of flaps, each FW x FH, turning about the line across its middle ---- */
const COLS = 6, ROWS = 7, FW = 46, FH = 46, GX = 4, GY = 3, R = 3;
const X0 = 32, Y0 = 50;
const BW = COLS * FW + (COLS - 1) * GX; // 296
const BH = ROWS * FH + (ROWS - 1) * GY; // 340
const fx = c => X0 + c * (FW + GX);
const fy = r => Y0 + r * (FH + GY);
const MID = 3;
const HINGE_Y = fy(MID) + FH / 2; // 220: the focus
const rowBox = r => [X0, fy(r), BW, FH];

/** The furniture of one flap, over whatever it shows: the lower leaf a shade darker, the hinge gap, a pin each side. */
const furniture = (x, y, shade, gap, pin) =>
    rect(x, y + FH / 2, FW, FH / 2, C.board, ` opacity="${shade}"`) +
    rect(x, y + FH / 2 - 0.9, FW, 1.8, gap) +
    rect(x, y + FH / 2 - 3, 2.6, 6, pin) +
    rect(x + FW - 2.6, y + FH / 2 - 3, 2.6, 6, pin);

/** A dark flap: nothing on it. */
const dark = (x, y) => rrect(x, y, FW, FH, R, C.flap) + furniture(x, y, 0.3, C.board, C.hinge);

/**
 * A flap that shows a colour while the board is closed: plain, or with one field that no flag has: a
 * quarter circle in one corner (`q` and the corner) or a single diagonal split (`diag`).
 */
function lit(x, y, col, field, col2) {
    let s = rrect(x, y, FW, FH, R, col);
    const Q = 27, l = x, r = x + FW, t = y, b = y + FH;
    const quarter = {
        qbr: `M${f(r - Q)} ${b}A${Q} ${Q} 0 0 1 ${r} ${f(b - Q)}V${b - R}L${r - R} ${b}Z`,
        qbl: `M${l} ${f(b - Q)}A${Q} ${Q} 0 0 1 ${f(l + Q)} ${b}H${l + R}L${l} ${b - R}Z`,
        qtl: `M${f(l + Q)} ${t}A${Q} ${Q} 0 0 1 ${l} ${f(t + Q)}V${t + R}L${l + R} ${t}Z`,
        qtr: `M${r} ${f(t + Q)}A${Q} ${Q} 0 0 1 ${f(r - Q)} ${t}H${r - R}L${r} ${t + R}Z`,
    }[field];
    if (quarter) s += `<path d="${quarter}" fill="${col2}"/>`;
    if (field === 'diag') s += poly([[r, t + 6], [r, b - R], [r - R, b], [l + 6, b]], col2);
    return s + furniture(x, y, 0.16, C.board, C.board);
}

/* The closed board: a loose drift of colour from the top left to the bottom right, the two other corners
   left dark. [col, row, colour, field, the field's colour] */
const LIT = [
    [0, 0, C.yellow, 'diag', C.coral],
    [1, 0, C.white],
    [0, 1, C.coral],
    [2, 1, C.yellow],
    [3, 1, C.white, 'qbl', C.yellow],
    [1, 2, C.white, 'diag', C.coral],
    [2, 2, C.coral, 'qtr', C.yellow],
    [3, 2, C.yellow],
    [1, 3, C.yellow],
    [3, 3, C.coral],
    [4, 3, C.white, 'qtl', C.coral],
    [2, 4, C.coral, 'diag', C.white],
    [3, 4, C.yellow, 'qbr', C.coral],
    [4, 4, C.white, 'qtr', C.yellow], // the one that trembles: its own layer
    [2, 5, C.white],
    [3, 5, C.coral],
    [5, 5, C.yellow, 'diag', C.coral],
    [3, 6, C.yellow],
    [4, 6, C.coral, 'qbl', C.white],
    [5, 6, C.white],
];
const FLICK = [4, 4];

/* ---- hall: a dark band of gradient behind the board, two soft ceiling lights, a floor line low down ---- */
{
    let s = `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="-6" x2="0" y2="456"><stop offset="0" stop-color="${C.hinge}"/><stop offset="0.3" stop-color="${C.flap}"/><stop offset="0.8" stop-color="${C.board}"/><stop offset="1" stop-color="${C.flap}"/></linearGradient>`;
    s += `<radialGradient id="l"><stop offset="0" stop-color="${C.white}" stop-opacity="0.85"/><stop offset="0.35" stop-color="${C.yellow}" stop-opacity="0.3"/><stop offset="1" stop-color="${C.yellow}" stop-opacity="0"/></radialGradient>`;
    s += `<radialGradient id="t"><stop offset="0" stop-color="${C.teal}" stop-opacity="0.55"/><stop offset="1" stop-color="${C.teal}" stop-opacity="0"/></radialGradient></defs>`;
    s += rect(-6, -6, 372, 462, 'url(#g)');
    // Ceiling lights: two long soft shapes, unequal, behind the mounting arms.
    s += ellipse(52, 6, 96, 30, 'url(#l)') + ellipse(318, 14, 74, 24, 'url(#l)');
    // The floor of the hall, far below the board: a teal sheen and a hard line.
    s += ellipse(180, 458, 230, 30, 'url(#t)') + rect(-6, 440, 372, 1.5, C.hinge);
    svg('hall', [-6, -6, 372, 462], s);
}

/* ---- housing: two mounting arms to the top edge, a slim metal frame with rounded corners, the dark board
   inside it, and a bottom rail with small status lamps in unequal groups ---- */
const HX = 20, HY = 38, HW = 320, HH = 394; // outer frame
const RAIL_Y = 398; // the rail runs from here to the frame's bottom edge
const LAMP_Y = 415;
const LAMP_A = [296, LAMP_Y]; // the lamp that breathes
{
    let s = '';
    // Arms: flat bars with a foot plate each.
    for (const x of [84, 262]) s += rect(x, -6, 14, 50, C.metalLo) + rect(x + 9, -6, 5, 50, C.board, ' opacity="0.35"') + rrect(x - 9, 30, 32, 12, 3, C.metal);
    s += rrect(HX, HY, HW, HH, 12, C.metal);
    // The rail: the lower part of the frame, one tone down.
    s += `<path d="M${HX} ${RAIL_Y}H${HX + HW}V${HY + HH - 12}a12 12 0 0 1 -12 12H${HX + 12}a12 12 0 0 1 -12 -12Z" fill="${C.metalLo}"/>`;
    // The board.
    s += rrect(26, 44, 308, 352, 7, C.board);
    // Lamps: three groups, unequal, and one long quiet slot between them.
    const lamp = (x, col, r = 3.2) => circle(x, LAMP_Y, r + 1.8, C.board) + circle(x, LAMP_Y, r, col);
    s += lamp(42, C.teal) + lamp(54, C.hinge) + lamp(66, C.hinge);
    s += rrect(92, LAMP_Y - 2.5, 104, 5, 2.5, C.board);
    s += lamp(222, C.coral) + lamp(234, C.hinge);
    s += circle(LAMP_A[0], LAMP_Y, 7, C.board) + circle(LAMP_A[0], LAMP_Y, 5, C.hinge);
    s += lamp(320, C.hinge, 2.6);
    svg('housing', [HX - 12, -6, HW + 24, HY + HH + 6 + 4], s);
}

/* ---- the lamp that breathes: its lit face and a small halo ---- */
{
    const [x, y] = LAMP_A, r = 15;
    svg('lamp', [x - r, y - r, 2 * r, 2 * r], `<defs><radialGradient id="h"><stop offset="0" stop-color="${C.yellow}" stop-opacity="0.7"/><stop offset="0.45" stop-color="${C.yellow}" stop-opacity="0.22"/><stop offset="1" stop-color="${C.yellow}" stop-opacity="0"/></radialGradient></defs>${circle(x, y, r, 'url(#h)')}${circle(x, y, 5, C.yellow)}${circle(x, y, 2, C.white)}`);
}

/* ---- the closed rows: one layer a row, turning about the row's hinge line ---- */
for (let r = 0; r < ROWS; r++) {
    let s = '';
    for (let c = 0; c < COLS; c++) {
        if (c === FLICK[0] && r === FLICK[1]) continue;
        const hit = LIT.find(([lc, lr]) => lc === c && lr === r);
        s += hit ? lit(fx(c), fy(r), hit[2], hit[3], hit[4]) : dark(fx(c), fy(r));
    }
    svg(`a${r}`, rowBox(r), s);
}
{
    const hit = LIT.find(([lc, lr]) => lc === FLICK[0] && lr === FLICK[1]);
    svg('flick', [fx(FLICK[0]), fy(FLICK[1]), FW, FH], lit(fx(FLICK[0]), fy(FLICK[1]), hit[2], hit[3], hit[4]));
}

/* ---- the picture the open board shows, in canvas coordinates: a wrapped parcel on teal. A bow, a lid,
   a ribbon band across (the middle row: it is what parts), the plain body, a white
   field in each corner. Large flat fields only. ---- */
const PX0 = fx(1), PX1 = fx(4) + FW; // the parcel is the four middle columns wide: 82..278
function picture() {
    const L = X0 - 2, T = Y0 - 2, Rr = X0 + BW + 2, B = Y0 + BH + 2;
    let s = rect(L, T, Rr - L, B - T, C.teal);
    // The floor the parcel stands on: the lowest row, a shade down.
    s += rect(L, fy(6) - GY / 2, Rr - L, B - fy(6), C.board, ' opacity="0.3"');
    // Corner fields.
    for (const [cx, cy] of [[X0, Y0], [X0 + BW, Y0], [X0, Y0 + BH], [X0 + BW, Y0 + BH]]) s += circle(cx, cy, 66, C.white);
    // Body, then the lid a little wider with a shade line under it.
    s += rect(PX0, fy(3), PX1 - PX0, fy(5) + FH - fy(3), C.coral);
    s += rect(PX0 - 14, fy(2), PX1 - PX0 + 28, FH, C.coral);
    s += rect(PX0, fy(4), PX1 - PX0, 9, C.board, ' opacity="0.22"');
    // Ribbon: one band across the middle row, and nothing down the parcel, so that no cross is made.
    s += rect(PX0, fy(3) - 2, PX1 - PX0, FH + 4, C.yellow);
    // Bow: two loops meeting in a round knot, on the row above the lid.
    const by = fy(1);
    s += poly([[180, by + 28], [102, by + 3], [102, by + FH - 2]], C.yellow) + poly([[180, by + 28], [258, by + 3], [258, by + FH - 2]], C.yellow);
    s += circle(180, by + 26, 15, C.white);
    return s;
}
const PICTURE = picture();
/** The open face of some flaps of one row: the picture cut to the flaps, with their furniture over it. */
function face(r, cols, clip) {
    const y = fy(r);
    let s = `<defs><clipPath id="c">${cols.map(c => clip(fx(c), y)).join('')}</clipPath></defs>`;
    s += `<g clip-path="url(#c)">${PICTURE}${cols.map(c => furniture(fx(c), y, 0.14, C.board, C.board)).join('')}</g>`;
    return s;
}
const whole = (x, y) => `<rect x="${f(x)}" y="${f(y)}" width="${FW}" height="${FH}" rx="${R}"/>`;
const upper = (x, y) => `<path d="M${f(x)} ${f(y + FH / 2)}V${f(y + R)}a${R} ${R} 0 0 1 ${R} -${R}H${f(x + FW - R)}a${R} ${R} 0 0 1 ${R} ${R}V${f(y + FH / 2)}Z"/>`;
const lower = (x, y) => `<path d="M${f(x)} ${f(y + FH / 2)}V${f(y + FH - R)}a${R} ${R} 0 0 0 ${R} ${R}H${f(x + FW - R)}a${R} ${R} 0 0 0 ${R} -${R}V${f(y + FH / 2)}Z"/>`;
const ALL = [0, 1, 2, 3, 4, 5];
for (let r = 0; r < ROWS; r++) {
    if (r === MID) continue;
    // The rows next to the middle one carry the board behind their flaps: the parted leaves slide in under them.
    const back = r === MID - 1 || r === MID + 1 ? rect(...rowBox(r), C.board) : '';
    svg(`b${r}`, rowBox(r), back + face(r, ALL, whole));
}
// The middle row: its two outer flaps stay; the four over the parcel are cut along the hinge into an
// upper and a lower leaf, which part.
svg('mid-side', rowBox(MID), face(MID, [0, 5], whole));
svg('mid-up', [PX0, fy(MID), PX1 - PX0, FH / 2], face(MID, [1, 2, 3, 4], upper));
svg('mid-low', [PX0, HINGE_Y, PX1 - PX0, FH / 2], face(MID, [1, 2, 3, 4], lower));

/* ---- the window the leaves bare: warm white light, a little gold only at its two ends ---- */
{
    const b = [PX0, fy(MID), PX1 - PX0, FH];
    let s = `<defs><radialGradient id="w" gradientUnits="userSpaceOnUse" cx="180" cy="${HINGE_Y}" r="104"><stop offset="0" stop-color="${C.yellow}" stop-opacity="0"/><stop offset="0.62" stop-color="${C.yellow}" stop-opacity="0"/><stop offset="1" stop-color="${C.yellow}" stop-opacity="0.6"/></radialGradient></defs>`;
    s += rrect(b[0], b[1], b[2], b[3], 4, C.white) + rrect(b[0], b[1], b[2], b[3], 4, 'url(#w)');
    svg('window', b, s);
}

/* ---- glow: the window's light on the flaps around it ---- */
{
    const rx = 156, ry = 96;
    svg('glow', [180 - rx, HINGE_Y - ry, 2 * rx, 2 * ry], `<defs><radialGradient id="h"><stop offset="0" stop-color="${C.white}" stop-opacity="0.55"/><stop offset="0.35" stop-color="${C.white}" stop-opacity="0.3"/><stop offset="0.7" stop-color="${C.white}" stop-opacity="0.1"/><stop offset="1" stop-color="${C.white}" stop-opacity="0"/></radialGradient></defs>${ellipse(180, HINGE_Y, rx, ry, 'url(#h)')}`);
}

/* ---- glint: a soft light that runs down the board on the diagonal while the flaps turn ---- */
{
    const rx = 92, ry = 50;
    svg('glint', [180 - rx, HINGE_Y - ry, 2 * rx, 2 * ry], `<defs><radialGradient id="h"><stop offset="0" stop-color="${C.white}" stop-opacity="0.22"/><stop offset="0.5" stop-color="${C.white}" stop-opacity="0.08"/><stop offset="1" stop-color="${C.white}" stop-opacity="0"/></radialGradient></defs>${ellipse(180, HINGE_Y, rx, ry, 'url(#h)')}`);
}

/* ---- spark: a small bright lozenge, scattered when the window opens ---- */
svg('spark', [176, HINGE_Y - 4, 8, 8], poly([[180, HINGE_Y - 4], [184, HINGE_Y], [180, HINGE_Y + 4], [176, HINGE_Y]], C.white));

for (const [name, b] of Object.entries(boxes)) console.log(name.padEnd(9), JSON.stringify(b));
