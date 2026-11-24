// Generator for the "midnight" wrapper art: an art deco clock dial a few minutes short of twelve,
// gold and ivory on black, and the sunburst that grows from behind it when the hands meet.
// Flat shapes, two or three tones to a surface, no filter, no letter and no figure anywhere: the
// dial carries radial ticks only. Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/midnight.gen.mjs   (prints the boxes of the ring segments)
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'midnight');
if (!OUT.endsWith('wrappers/midnight')) throw new Error('out dir must be public/wrappers/midnight');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: black, two near-blacks for the face and its engraving, gold in three tones, ivory in two, one teal. */
const C = {
    black: '#0B0B10',
    night: '#15151D',
    slate: '#2A2A38',
    gold: '#D9B25F',
    goldLo: '#9C7A34',
    goldHi: '#F3D992',
    ivory: '#F3EBD8',
    ivoryLo: '#C9BEA2',
    teal: '#2F9088',
};

const f = n => String(Math.round(n * 100) / 100);
const P = pts => pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');
const poly = (pts, fill, extra = '') => `<path d="M${P(pts)}Z" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ring = (cx, cy, r, stroke, w, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${stroke}" stroke-width="${w}"${extra}/>`;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}

/* The dial's centre. A bearing is degrees clockwise from the top of the frame. */
const CX = 180, CY = 222;
const at = (r, deg, cx = CX, cy = CY) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
/** A piece of a ring between two radii and two bearings. */
const sector = (r1, r2, a0, a1, fill, extra = '') => {
    const big = a1 - a0 > 180 ? 1 : 0;
    const [p0, p1, p2, p3] = [at(r2, a0), at(r2, a1), at(r1, a1), at(r1, a0)];
    return `<path d="M${f(p0[0])} ${f(p0[1])}A${r2} ${r2} 0 ${big} 1 ${f(p1[0])} ${f(p1[1])}L${f(p2[0])} ${f(p2[1])}A${r1} ${r1} 0 ${big} 0 ${f(p3[0])} ${f(p3[1])}Z" fill="${fill}"${extra}/>`;
};
/** A stroked arc. */
const arc = (r, a0, a1, stroke, w, extra = '') => {
    const [p0, p1] = [at(r, a0), at(r, a1)];
    return `<path d="M${f(p0[0])} ${f(p0[1])}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(p1[0])} ${f(p1[1])}" fill="none" stroke="${stroke}" stroke-width="${w}"${extra}/>`;
};
/** A shape that lies along a bearing: `profile` is a list of [radius, half-width] going outward. */
const along = (deg, profile, fill, extra = '', cx = CX, cy = CY) => {
    const side = s => profile.map(([r, hw]) => {
        const [x, y] = at(r, deg, cx, cy);
        const [nx, ny] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
        return [x + s * hw * nx, y + s * hw * ny];
    });
    return poly([...side(1), ...side(-1).reverse()], fill, extra);
};
/** The box of everything between two radii and two bearings, padded and rounded outward. */
const boxOf = (r1, r2, a0, a1, pad = 2) => {
    const pts = [];
    for (let a = a0; a <= a1 + 1e-9; a += 1) pts.push(at(r1, a), at(r2, a));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.floor(Math.min(...xs) - pad), y0 = Math.floor(Math.min(...ys) - pad);
    return [x0, y0, Math.ceil(Math.max(...xs) + pad) - x0, Math.ceil(Math.max(...ys) + pad) - y0];
};
const boxes = {};

/* ---- ground: black, a faint fan of rays from the dial's centre, a double frame, a deco fan in every
   corner and steps down the sides ---- */
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.black}"/>`;
    for (let k = 0; k < 36; k += 1) s += along(k * 10 + 5, [[150, 5], [330, 15]], C.night);
    s += `<rect x="8" y="8" width="344" height="434" fill="none" stroke="${C.gold}" stroke-width="2"/>` + `<rect x="13.5" y="13.5" width="333" height="423" fill="none" stroke="${C.goldLo}" stroke-width="1"/>`;
    // One corner, drawn at the top left; the other three are its mirror images.
    let corner = '';
    const [fx, fy] = [14, 14];
    // The fan: seven blades, each a kite, alternately gold and ivory; a teal heart with a gold rim.
    for (let k = 0; k < 7; k += 1) {
        const deg = 90 + 7.5 + k * 12.5;
        const long = k % 2 === 0;
        corner += along(deg, [[20, 0.8], [long ? 58 : 48, long ? 7.4 : 6], [long ? 81 : 66, 0]], long ? C.gold : C.ivory, '', fx, fy);
        if (long) corner += along(deg, [[38, 0.4], [58, 2.6], [72, 0]], C.black, '', fx, fy);
    }
    corner += `<path d="M${fx} ${fy}L${fx + 24} ${fy}A24 24 0 0 1 ${fx} ${fy + 24}Z" fill="${C.teal}"/>`;
    corner += `<path d="M${fx + 24} ${fy}A24 24 0 0 1 ${fx} ${fy + 24}" fill="none" stroke="${C.goldHi}" stroke-width="2.4"/>`;
    corner += `<path d="M${fx + 13} ${fy}A13 13 0 0 1 ${fx} ${fy + 13}" fill="none" stroke="${C.black}" stroke-width="2"/>`;
    // Steps down the side, narrowing toward the dial.
    corner += `<rect x="14" y="108" width="20" height="16" fill="${C.gold}"/>` + `<rect x="14" y="124" width="13" height="14" fill="${C.goldLo}"/>` + `<rect x="14" y="138" width="7" height="12" fill="${C.gold}"/>`;
    corner += `<rect x="14" y="121" width="20" height="3" fill="${C.black}"/>`;
    s += corner;
    s += `<g transform="translate(360 0) scale(-1 1)">${corner}</g>`;
    s += `<g transform="translate(0 450) scale(1 -1)">${corner}</g>`;
    s += `<g transform="translate(360 450) scale(-1 -1)">${corner}</g>`;
    svg('ground', [-6, -6, 372, 462], s);
}

/* ---- halo: the light behind the dial, a plain gradient that fades to nothing ---- */
{
    const R = 172;
    const s = `<defs><radialGradient id="h" cx="${CX}" cy="${CY}" r="${R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.goldHi}" stop-opacity="0.75"/><stop offset="0.62" stop-color="${C.gold}" stop-opacity="0.42"/><stop offset="0.86" stop-color="${C.gold}" stop-opacity="0.14"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient></defs>` + `<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#h)"/>`;
    svg('halo', [CX - R, CY - R, 2 * R, 2 * R], s);
}

/* ---- the sunburst, two layers. Each ray widens outward and ends in a point; its two halves are two tones. ---- */
const ray = (deg, r0, r1, half, a, b) => {
    const hw = r => r * Math.tan((half * Math.PI) / 180);
    return along(deg, [[r0, hw(r0)], [r1 - 12, hw(r1 - 12)], [r1, 0]], a) + poly([at(r0, deg), [at(r0, deg)[0] + hw(r0) * Math.cos((deg * Math.PI) / 180), at(r0, deg)[1] + hw(r0) * Math.sin((deg * Math.PI) / 180)], [at(r1 - 12, deg)[0] + hw(r1 - 12) * Math.cos((deg * Math.PI) / 180), at(r1 - 12, deg)[1] + hw(r1 - 12) * Math.sin((deg * Math.PI) / 180)], at(r1, deg)], b);
};
{
    // The long rays: the four that pass through the gaps the rings leave are the longest.
    let a = '';
    for (let k = 0; k < 16; k += 1) {
        const deg = k * 22.5;
        const len = k % 4 === 0 ? 214 : k % 2 === 0 ? 170 : 198;
        a += ray(deg, 40, len, k % 4 === 0 ? 4.6 : 4, C.gold, C.goldHi);
    }
    svg('burst-a', [CX - 215, CY - 215, 430, 430], a);
    // The short rays between them, in the deeper gold.
    let b = '';
    for (let k = 0; k < 16; k += 1) b += ray(k * 22.5 + 11.25, 40, k % 2 === 0 ? 150 : 138, 2.5, C.goldLo, C.gold);
    svg('burst-b', [CX - 151, CY - 151, 302, 302], b);
}

/* ---- the outer ring: the track of ticks, in four pieces centred on the diagonals. Between the pieces, at
   the top, the bottom and the sides, a gap is left for the spears of the middle ring. ---- */
const OUT_R = [122, 160], OUT_SPAN = 39.5;
for (let q = 0; q < 4; q += 1) {
    const mid = 45 + q * 90, a0 = mid - OUT_SPAN, a1 = mid + OUT_SPAN;
    let s = sector(OUT_R[0], OUT_R[1], a0, a1, C.black);
    s += sector(155, 159, a0, a1, C.gold) + sector(123, 125.4, a0, a1, C.gold) + arc(151, a0 + 0.6, a1 - 0.6, C.goldLo, 1);
    for (let deg = Math.ceil(a0 / 6) * 6; deg <= a1; deg += 6) {
        const m = ((deg % 30) + 30) % 30;
        if (m === 0) {
            // An hour: a gold wedge pointing at the centre, with a lighter half.
            s += along(deg, [[127.5, 0], [149, 5.2]], C.gold) + poly([at(127.5, deg), at(149, deg), [at(149, deg)[0] + 5.2 * Math.cos((deg * Math.PI) / 180), at(149, deg)[1] + 5.2 * Math.sin((deg * Math.PI) / 180)]], C.goldHi);
        } else {
            // A minute: a thin ivory tick, longer in the middle of the hour than beside its wedge.
            const len = m === 6 || m === 24 ? 6.5 : 11.5;
            s += along(deg, [[149 - len, 0.5], [149, 1]], m === 6 || m === 24 ? C.ivoryLo : C.ivory);
        }
    }
    const box = boxOf(OUT_R[0], OUT_R[1], a0, a1, 1);
    boxes[`outer-${q + 1}`] = box;
    svg(`outer-${q + 1}`, box, s);
}

/* ---- the middle ring: a gold band in four pieces centred on the top, the sides and the bottom, its ends
   stepped; each carries the ivory spear of its quarter, which reaches out across the track of ticks. ---- */
const MID_SPAN = 40;
for (let q = 0; q < 4; q += 1) {
    const mid = q * 90, a0 = mid - MID_SPAN, a1 = mid + MID_SPAN;
    // A black backing, so that the band holds over the sunburst.
    let s = sector(97.5, 121.5, a0, a1, C.black) + sector(102, 110, a0, a1, C.gold) + sector(110, 117, a0 + 4, a1 - 4, C.goldLo);
    s += arc(120, a0 + 4, a1 - 4, C.ivoryLo, 1.2) + arc(99, a0, a1, C.goldLo, 1);
    // Two black lozenges cut in the band, at the hours on either side of the spear.
    for (const d of [-30, 30]) s += along(mid + d, [[104, 0], [109.5, 2.6], [115, 0]], C.black);
    // The spear: ivory, a teal inlay, a black keyline so that it holds on gold.
    s += along(mid, [[95, 0], [108, 3.2], [130, 6.4], [151, 0]], C.ivory, ` stroke="${C.black}" stroke-width="1.4" stroke-linejoin="round"`);
    s += along(mid, [[118, 0], [130, 2.8], [142, 0]], C.teal);
    const b1 = boxOf(98, 121, a0, a1, 1), b2 = boxOf(94, 152, mid - 3, mid + 3, 1);
    const x0 = Math.min(b1[0], b2[0]), y0 = Math.min(b1[1], b2[1]);
    const box = [x0, y0, Math.max(b1[0] + b1[2], b2[0] + b2[2]) - x0, Math.max(b1[1] + b1[3], b2[1] + b2[3]) - y0];
    boxes[`mid-${q + 1}`] = box;
    svg(`mid-${q + 1}`, box, s);
}

/* ---- the face: a near-black disc with engraved rays, a teal ring, a gold rim and a pip at every hour ---- */
{
    let s = circle(CX, CY, 96, C.night);
    for (let k = 0; k < 24; k += 1) s += along(k * 15 + 7.5, [[30, 0.6], [k % 2 === 0 ? 66 : 54, 3.4], [k % 2 === 0 ? 74 : 60, 0]], C.slate);
    s += ring(CX, CY, 94, C.gold, 2.4) + ring(CX, CY, 78, C.teal, 2.2) + ring(CX, CY, 24, C.goldLo, 1.2);
    for (let k = 0; k < 12; k += 1) s += along(k * 30, [[82, 0], [86, k % 3 === 0 ? 3 : 2], [90, 0]], k % 3 === 0 ? C.ivory : C.gold);
    svg('face', [CX - 97, CY - 97, 194, 194], s);
}

/* ---- the core: the sun's own disc, which rises at the hub when the hands meet ---- */
{
    const teeth = [];
    for (let k = 0; k < 48; k += 1) teeth.push(at(k % 2 === 0 ? 38 : 32, k * 7.5));
    let s = poly(teeth, C.gold) + circle(CX, CY, 29, C.goldHi) + ring(CX, CY, 24.5, C.black, 1.6) + circle(CX, CY, 19, C.gold);
    for (let k = 0; k < 12; k += 1) s += along(k * 30 + 15, [[9, 0.4], [16, 1.8], [19, 0]], C.goldLo);
    svg('core', [CX - 39, CY - 39, 78, 78], s);
}

/* ---- the hands, drawn pointing straight up; the definition turns them back about the hub ---- */
{
    const key = ` stroke="${C.black}" stroke-width="1.3" stroke-linejoin="round"`;
    // Hour hand: gold, short and broad, an open lozenge.
    let h = along(0, [[-18, 0], [-12, 5], [-6, 2.6], [0, 3.6], [34, 3], [50, 9.5], [72, 0]], C.gold, key);
    h += along(0, [[40, 0], [50, 4.6], [62, 0]], C.black);
    svg('hand-hour', [168, 148, 24, 94], h);
    // Minute hand: ivory, long and slim, a gold spine in its blade.
    let m = along(0, [[-24, 0], [-17, 4.2], [-10, 1.8], [0, 2.6], [66, 2.2], [84, 6.6], [110, 0]], C.ivory, key);
    m += along(0, [[72, 0], [84, 2.4], [100, 0]], C.gold);
    svg('hand-minute', [171, 110, 18, 138], m);
    // The cap over the hub.
    svg('cap', [172, 214, 16, 16], circle(CX, CY, 7, C.black) + ring(CX, CY, 5.4, C.gold, 1.8) + circle(CX, CY, 2, C.goldHi));
}

/* ---- crests: stepped keystones hanging from the top of the frame and standing on its bottom. They lie
   over the sunburst, so its longest rays come out from behind them. ---- */
{
    const crest = flip => {
        const y = v => (flip ? 450 - v : v);
        const rect = (w, y0, h, fill) => `<rect x="${f(CX - w / 2)}" y="${f(Math.min(y(y0), y(y0 + h)))}" width="${w}" height="${h}" fill="${fill}"/>`;
        let s = rect(154, 7, 11, C.gold) + rect(116, 18, 10, C.goldLo) + rect(80, 28, 10, C.gold) + rect(44, 38, 9, C.goldHi);
        s += rect(154, 16, 2, C.black) + rect(80, 36, 2, C.black);
        s += poly([[CX - 8, y(47)], [CX, y(55)], [CX + 8, y(47)]], C.teal);
        return s;
    };
    svg('crest-top', [102, 6, 156, 56], crest(false));
    svg('crest-bottom', [102, 388, 156, 56], crest(true));
}

/* ---- glints: eight thin rays each, ivory ---- */
const GLINTS = [[266, 90, 15], [82, 106, 12], [300, 322, 13], [70, 318, 10]];
GLINTS.forEach(([x, y, r], i) => {
    let s = '';
    for (let k = 0; k < 8; k += 1) s += along(k * 45, [[0, k % 2 === 0 ? 2 : 1.2], [k % 2 === 0 ? r : r * 0.45, 0]], C.ivory, '', x, y);
    s += circle(x, y, 1.6, C.goldHi);
    boxes[`glint-${i + 1}`] = [x - r - 1, y - r - 1, 2 * r + 2, 2 * r + 2];
    svg(`glint-${i + 1}`, boxes[`glint-${i + 1}`], s);
});

/* ---- tinsel: one short gold strip, thrown once ---- */
svg('tinsel', [173, 219, 14, 6], poly([[175, 219], [187, 219], [185, 225], [173, 225]], C.gold) + poly([[181, 219], [187, 219], [185, 225], [179, 225]], C.goldHi));

for (const [k, b] of Object.entries(boxes)) console.log(k, JSON.stringify(b));
