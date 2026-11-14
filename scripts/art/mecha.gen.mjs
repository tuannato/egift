// Generates the `mecha` wrapper art (public/wrappers/mecha/*.svg); the layer data lives in src/wrappers/mecha.ts.
// Run: node scripts/art/mecha.gen.mjs && node scripts/wrap-art.mjs --write   (no dependencies, no network)
//
// An armoured blast-door cask held in a docking ring: light drawn on graphite. Four leaves meet at an
// octagonal lock; behind them an eight-blade iris closes a core chamber. Everything is authored in canvas
// units (360x450); each file's viewBox is its layer box. Geometry here must match src/wrappers/mecha.ts.
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../../public/wrappers/mecha/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const W = 360;
const H = 450;
const CX = 180;
const CY = 200;
const HORIZON = 378;
/** How far each leaf travels on each axis when open (must match LEAF_D in mecha.ts). */
const D = 28;

// Palette: armour white, graphite, one orange; cyan-white only for the core.
const WHITE = '#E6EBF2';
const G0 = '#07090C';
const G1 = '#0D1015';
const G2 = '#12161C';
const G3 = '#1B2028';
const G4 = '#232932';
const G5 = '#2A313C';
const ORANGE = '#E8470A';
const ORANGE_HOT = '#FF8A52';
const CYAN = '#7FE3FF';
const CYAN_HOT = '#EAFBFF';

const f = n => +(+n).toFixed(2);
const pts = a => a.map(p => `${f(p[0])},${f(p[1])}`).join(' ');
const pathOf = (a, close = true) => `M${a.map(p => `${f(p[0])} ${f(p[1])}`).join('L')}${close ? 'Z' : ''}`;
const lineD = (a, b) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
const svg = (box, body, defs = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" width="${box[2]}" height="${box[3]}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
const stops = s => s.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const linear = (id, x1, y1, x2, y2, s) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}">${stops(s)}</linearGradient>`;
const radial = (id, cx, cy, r, s) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">${stops(s)}</radialGradient>`;
const poly = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}"${extra}/>`;
const stroke = (d, color, w, op = 1, extra = '') =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w)}"${op !== 1 ? ` stroke-opacity="${f(op)}"` : ''} stroke-linejoin="miter"${extra}/>`;
/** A luminous line: faint wide halos under a crisp core. */
function glow(d, color, w, k = 1, hot = '') {
    let s = '';
    s += stroke(d, color, w * 8, 0.05 * k, ' stroke-linecap="round"');
    s += stroke(d, color, w * 4, 0.1 * k, ' stroke-linecap="round"');
    s += stroke(d, color, w * 2, 0.26 * k, ' stroke-linecap="round"');
    s += stroke(d, color, w, Math.min(1, k));
    if (hot) s += stroke(d, hot, w * 0.45, 0.9);
    return s;
}

/** A box with its four corners cut at 45 degrees, clockwise from the top-left cut. */
const oct = (x0, y0, x1, y1, c) => [
    [x0 + c, y0],
    [x1 - c, y0],
    [x1, y0 + c],
    [x1, y1 - c],
    [x1 - c, y1],
    [x0 + c, y1],
    [x0, y1 - c],
    [x0, y0 + c],
];
/** A regular octagon with flat top, by its inradius. */
const roct = (r, cx = CX, cy = CY) => {
    const h = r * Math.tan(Math.PI / 8);
    return oct(cx - r, cy - r, cx + r, cy + r, r - h);
};
function area(a) {
    let s = 0;
    for (let i = 0; i < a.length; i++) {
        const p = a[i], q = a[(i + 1) % a.length];
        s += p[0] * q[1] - q[0] * p[1];
    }
    return s / 2;
}
/** Move every edge of a simple polygon inward by d. */
function inset(a, d) {
    const n = a.length;
    const sg = area(a) > 0 ? 1 : -1;
    const lines = a.map((p, i) => {
        const q = a[(i + 1) % n];
        const dx = q[0] - p[0], dy = q[1] - p[1];
        const l = Math.hypot(dx, dy);
        const nx = (-dy / l) * sg, ny = (dx / l) * sg;
        return [p[0] + nx * d, p[1] + ny * d, dx, dy];
    });
    return lines.map((l1, i) => {
        const l0 = lines[(i + n - 1) % n];
        const den = l0[2] * l1[3] - l0[3] * l1[2];
        if (Math.abs(den) < 1e-9) return [l1[0], l1[1]];
        const t = ((l1[0] - l0[0]) * l1[3] - (l1[1] - l0[1]) * l1[2]) / den;
        return [l0[0] + l0[2] * t, l0[1] + l0[3] * t];
    });
}
const shift = (a, dx, dy) => a.map(p => [p[0] + dx, p[1] + dy]);

// --- geometry -----------------------------------------------------------------------------------
const HULL = oct(80, 46, 280, 354, 38);
const COLLAR = roct(38);
const APERTURE = roct(23);
const HOLE = roct(42);
const BEZEL = roct(52);
const ap = 23 * Math.tan(Math.PI / 8); // half side of the aperture
const SEAM_L = 206;
const SEAM_R = 194;
const LEAVES = {
    tl: { dir: [-1, -1], p: [[118, 46], [180, 46], [180, 177], [CX - ap, 177], [157, CY - ap], [157, SEAM_L], [130, SEAM_L], [104, 232], [80, 232], [80, 84]] },
    tr: { dir: [1, -1], p: [[180, 46], [242, 46], [280, 84], [280, 168], [256, 168], [230, SEAM_R], [203, SEAM_R], [203, CY - ap], [CX + ap, 177], [180, 177]] },
    br: { dir: [1, 1], p: [[203, SEAM_R], [230, SEAM_R], [256, 168], [280, 168], [280, 316], [242, 354], [180, 354], [180, 223], [CX + ap, 223], [203, CY + ap]] },
    bl: { dir: [-1, 1], p: [[80, 232], [104, 232], [130, SEAM_L], [157, SEAM_L], [157, CY + ap], [CX - ap, 223], [180, 223], [180, 354], [118, 354], [80, 316]] },
};
for (const l of Object.values(LEAVES)) l.q = inset(l.p, 1.25);
const onHull = (x, y) => x <= 82 || x >= 278 || y <= 48 || y >= 352 || Math.abs(x - CX) / 100 + 0 > 1 || Math.abs(x - CX) + Math.abs(y - CY) >= 214;

const files = {};

// --- hangar: far wall in haze, hard light strips, glossy floor -----------------------------------
{
    const box = [-8, -8, W + 16, H + 16];
    let s = `<rect x="-8" y="-8" width="${W + 16}" height="${H + 16}" fill="url(#wall)"/>`;
    s += `<ellipse cx="${CX}" cy="190" rx="230" ry="210" fill="url(#haze)"/>`;
    // wall bays: tall dark ribs with a lit edge
    for (const x of [-4, 38, 86, 262, 310, 352]) {
        s += `<rect x="${x}" y="-8" width="12" height="${HORIZON + 8}" fill="${G1}" opacity="0.75"/>`;
        s += stroke(lineD([x + 12, -8], [x + 12, HORIZON]), WHITE, 0.7, 0.1);
    }
    for (const y of [58, 142, 300]) s += stroke(lineD([-8, y], [W + 8, y]), WHITE, 0.7, 0.06);
    // ceiling beam with a hard strip under it
    s += `<rect x="-8" y="-8" width="${W + 16}" height="22" fill="${G0}"/>`;
    s += stroke(lineD([-8, 14], [W + 8, 14]), WHITE, 0.8, 0.22);
    // two far strip lights, softened by haze
    for (const x of [22, 338]) {
        s += `<rect x="${x - 14}" y="30" width="28" height="310" fill="url(#stripH)" opacity="0.5"/>`;
        s += glow(lineD([x, 44], [x, 326]), WHITE, 1.3, 0.5);
    }
    // floor
    s += `<rect x="-8" y="${HORIZON}" width="${W + 16}" height="${H - HORIZON + 8}" fill="url(#floor)"/>`;
    for (let k = 1; k <= 7; k++) {
        const y = HORIZON + 1.5 * k * k;
        s += stroke(lineD([-8, y], [W + 8, y]), WHITE, 0.6 + k * 0.06, 0.05 + k * 0.012);
    }
    for (const i of [-5, -4, -3, -2, 2, 3, 4, 5]) {
        const xb = CX + i * 62;
        s += stroke(lineD([CX + i * 14, HORIZON], [xb, H + 8]), WHITE, 0.7, 0.07);
    }
    // two floor light strips running toward the viewer, and the far strips mirrored in the gloss
    for (const sg of [-1, 1]) {
        const a = [CX + sg * 38, HORIZON + 3], b = [CX + sg * 112, H + 8];
        s += glow(lineD(a, b), WHITE, 1.5, 0.55);
        s += `<rect x="${f(CX + sg * 158 - 5)}" y="${HORIZON + 2}" width="10" height="60" fill="url(#mirror)" opacity="0.5"/>`;
    }
    // the cask mirrored: a dark column with the seam as a faint line
    s += `<polygon points="${pts([[92, HORIZON + 1], [268, HORIZON + 1], [296, H + 8], [64, H + 8]])}" fill="url(#shadow)"/>`;
    s += `<rect x="${CX - 0.9}" y="${HORIZON + 2}" width="1.8" height="64" fill="url(#mirror)" opacity="0.8"/>`;
    s += stroke(lineD([-8, HORIZON], [W + 8, HORIZON]), WHITE, 1, 0.3);
    s += `<rect x="-8" y="-8" width="${W + 16}" height="${H + 16}" fill="url(#vig)"/>`;
    const defs =
        linear('wall', 0, 0, 0, HORIZON, [[0, '#0B0E13'], [0.5, '#151B24'], [1, '#10151C']]) +
        radial('haze', CX, 190, 220, [[0, '#2A3442', 0.75], [0.55, '#1C2430', 0.35], [1, '#1C2430', 0]]) +
        linear('stripH', 8, 0, 36, 0, [[0, WHITE, 0], [0.5, WHITE, 0.16], [1, WHITE, 0]]) +
        linear('floor', 0, HORIZON, 0, H, [[0, '#141A22'], [0.25, '#0D1116'], [1, G0]]) +
        linear('mirror', 0, HORIZON, 0, HORIZON + 64, [[0, WHITE, 0.5], [1, WHITE, 0]]) +
        linear('shadow', 0, HORIZON, 0, H, [[0, G0, 0.85], [1, G0, 0.2]]) +
        radial('vig', CX, 215, 300, [[0.6, G0, 0], [1, G0, 0.8]]);
    // the strip haze is drawn once per strip: mirror the gradient with a transform
    files['hangar.svg'] = svg(box, s.replace(`<rect x="${338 - 14}" y="30" width="28" height="310" fill="url(#stripH)" opacity="0.5"/>`, `<rect x="${338 - 14}" y="30" width="28" height="310" fill="url(#stripH2)" opacity="0.5"/>`), defs + linear('stripH2', 324, 0, 352, 0, [[0, WHITE, 0], [0.5, WHITE, 0.16], [1, WHITE, 0]]));
}

// --- ring: the docking ring, a chamfered gantry frame behind the cask ----------------------------
{
    const box = [0, 0, W, 410];
    const outer = oct(30, 12, 330, 394, 62);
    const inner = oct(52, 30, 308, 376, 54);
    let s = '';
    // struts out to the bays
    for (const [a, b] of [[[60, 44], [-4, -20]], [[300, 44], [364, -20]], [[30, 150], [0, 150]], [[330, 150], [360, 150]], [[30, 256], [0, 256]], [[330, 256], [360, 256]]]) {
        s += stroke(lineD(a, b), G1, 9);
        s += stroke(lineD([a[0], a[1] - 4.5], [b[0], b[1] - 4.5]), WHITE, 0.7, 0.18);
    }
    s += `<path d="${pathOf(outer)}${pathOf(inner)}" fill="url(#rg)" fill-rule="evenodd"/>`;
    s += stroke(pathOf(outer), WHITE, 1.1, 0.12);
    s += stroke(pathOf(inset(outer, 5)), WHITE, 0.7, 0.08);
    s += stroke(pathOf(inner), WHITE, 1.1, 0.16);
    // top edge catches the ceiling strip
    s += stroke(lineD(outer[0], outer[1]), WHITE, 1.4, 0.35);
    // segment breaks
    for (const [a, b] of [[[41, 120], [41, 286]], [[319, 120], [319, 286]]]) s += stroke(lineD(a, b), G0, 2.4, 0.9, ' stroke-dasharray="52 3"');
    // hard strips on the ring's inner faces: they light the cask's flanks
    for (const sg of [-1, 1]) {
        const x = CX + sg * 128;
        s += glow(lineD([x - sg * 3.5, 96], [x - sg * 3.5, 148]), WHITE, 1.3, 0.45);
        s += glow(lineD([x - sg * 3.5, 252], [x - sg * 3.5, 312]), WHITE, 1.3, 0.45);
    }
    // corner receivers the leaves dock into
    for (const [x, y, dx, dy] of [[76, 54, -1, -1], [284, 54, 1, -1], [76, 352, -1, 1], [284, 352, 1, 1]]) {
        const a = [x - dy * 14, y + dx * 14], b = [x + dy * 14, y - dx * 14];
        s += stroke(lineD(a, b), G0, 5);
        s += stroke(lineD([a[0] - dx * 2, a[1] - dy * 2], [b[0] - dx * 2, b[1] - dy * 2]), WHITE, 0.8, 0.3);
    }
    const defs = linear('rg', 0, 12, 0, 394, [[0, '#171C23'], [0.4, '#10141A'], [1, '#0A0D11']]);
    files['ring.svg'] = svg(box, s, defs);
}

// --- cavity: the core chamber behind the iris ----------------------------------------------------
{
    const box = [CX - 56, CY - 56, 112, 112];
    let s = poly(roct(54), 'url(#cv)');
    for (const [r, o] of [[44, 0.5], [36, 0.3], [29, 0.18]]) s += stroke(pathOf(roct(r)), CYAN, 0.9, o);
    const a = roct(44), b = roct(29);
    for (let i = 0; i < 8; i++) s += stroke(lineD(a[i], b[i]), CYAN, 0.7, 0.22);
    // the cradle that holds the core: two short rails above and below
    for (const sg of [-1, 1]) {
        s += stroke(lineD([CX - 9, CY + sg * 36], [CX + 9, CY + sg * 36]), CYAN_HOT, 1.6, 0.8);
        s += stroke(lineD([CX, CY + sg * 36], [CX, CY + sg * 43]), CYAN_HOT, 1.2, 0.5);
    }
    const defs = radial('cv', CX, CY, 54, [[0, '#123142'], [0.45, '#0B1C28'], [1, '#05090D']]);
    files['cavity.svg'] = svg(box, s, defs);
}

// --- core: a crisp ingot of light ------------------------------------------------------------
{
    const box = [CX - 44, CY - 44, 88, 88];
    const o = oct(CX - 13, CY - 30, CX + 13, CY + 30, 9);
    const i = oct(CX - 6.5, CY - 21, CX + 6.5, CY + 21, 5);
    let s = `<circle cx="${CX}" cy="${CY}" r="44" fill="url(#cb)"/>`;
    s += poly(o, 'url(#cf)');
    s += poly([o[0], [CX, CY - 30], [CX, CY + 30], o[5], o[6], o[7]], '#FFFFFF', ' opacity="0.16"');
    s += glow(pathOf(o), CYAN, 1.3, 1, CYAN_HOT);
    s += poly(i, '#FFFFFF');
    s += stroke(lineD(o[7], i[7]), CYAN_HOT, 0.8, 0.8) + stroke(lineD(o[2], i[2]), CYAN_HOT, 0.8, 0.8) + stroke(lineD(o[3], i[3]), CYAN_HOT, 0.8, 0.8) + stroke(lineD(o[6], i[6]), CYAN_HOT, 0.8, 0.8);
    const defs =
        radial('cb', CX, CY, 44, [[0, CYAN_HOT, 0.85], [0.3, CYAN, 0.5], [0.65, '#32C8F0', 0.16], [1, '#32C8F0', 0]]) +
        linear('cf', 0, CY - 30, 0, CY + 30, [[0, '#BFF3FF'], [0.5, '#7FE3FF'], [1, '#46C6EE']]);
    files['core.svg'] = svg(box, s, defs);
}

// --- iris: eight wedge blades tiling the plane round a small octagonal peephole -------------------
const RHO = 6;
const RC = RHO / Math.cos(Math.PI / 8);
const V = k => {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    return [CX + RC * Math.cos(a), CY + RC * Math.sin(a)];
};
const unit = (a, b) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};
const IBOX = [CX - 60, CY - 60, 120, 120];
for (let k = 0; k < 8; k++) {
    const v = V(k);
    const u1 = unit(v, V(k + 1)); // along this blade's own edge
    const u2 = unit(V(k - 1), v); // along the neighbour's edge, continued
    const far = t => [v[0] + t[0] * 70, v[1] + t[1] * 70];
    const mid = [v[0] + (u1[0] + u2[0]) * 60, v[1] + (u1[1] + u2[1]) * 60];
    const wedge = [v, far(u1), mid, far(u2)];
    const n = [-u1[1], u1[0]]; // into the blade from its edge
    let s = `<g clip-path="url(#c)">`;
    s += poly(wedge, 'url(#g)');
    // a machined step across the blade, and the lit leading edge
    const a = [v[0] + u1[0] * 22 + n[0] * 0.01, v[1] + u1[1] * 22], b = [a[0] + u2[0] * 40, a[1] + u2[1] * 40];
    s += stroke(lineD(a, b), WHITE, 0.7, 0.16);
    s += stroke(lineD([v[0] + n[0] * 0.6, v[1] + n[1] * 0.6], [far(u1)[0] + n[0] * 0.6, far(u1)[1] + n[1] * 0.6]), WHITE, 1.2, 0.75);
    s += stroke(lineD(v, far(u2)), G0, 1.6, 0.9);
    s += `</g>`;
    const defs =
        `<clipPath id="c"><circle cx="${CX}" cy="${CY}" r="50"/></clipPath>` +
        linear('g', v[0], v[1], v[0] + n[0] * 34, v[1] + n[1] * 34, [[0, '#262D37'], [0.35, '#171C23'], [1, '#0D1116']]);
    files[`blade-${k}.svg`] = svg(IBOX, s, defs);
}
const seamRays = (len, k0 = 0) => Array.from({ length: 8 }, (_, k) => {
    const v = V(k + k0), u = unit(V(k + k0 - 1), v);
    return [v, [v[0] + u[0] * len, v[1] + u[1] * len]];
});

// --- lock-white: the iris seams and peephole lit white (under the leaves; turns with the blades) --
{
    let s = `<g clip-path="url(#c)">`;
    for (const [a, b] of seamRays(60)) s += glow(lineD(a, b), WHITE, 1.1, 0.6);
    s += `</g>`;
    s += `<circle cx="${CX}" cy="${CY}" r="20" fill="url(#p)"/>`;
    s += poly(roct(RHO), '#FFFFFF');
    const defs = `<clipPath id="c"><polygon points="${pts(roct(41.5))}"/></clipPath>` + radial('p', CX, CY, 14, [[0, '#FFFFFF', 0.6], [0.4, WHITE, 0.18], [1, WHITE, 0]]);
    files['lock-white.svg'] = svg(IBOX, s, defs);
}

// --- front: the cask's inner frame, with the iris hole ------------------------------------------
const FBOX = [74, 40, 212, 320];
{
    const body = inset(HULL, 2.6);
    let s = `<path d="${pathOf(body)}${pathOf(HOLE)}" fill="url(#fb)" fill-rule="evenodd"/>`;
    s += stroke(pathOf(inset(HULL, 11)), WHITE, 0.7, 0.14);
    // guide tracks the leaves ride on: one pair per seam arm
    for (const sg of [-1, 1]) {
        for (const off of [-17, 17]) {
            s += stroke(lineD([CX + off, CY + sg * 60], [CX + off, CY + sg * 146]), WHITE, 0.8, 0.2);
        }
        for (let y = 72; y <= 138; y += 22) {
            s += `<rect x="${CX - 12}" y="${f(CY + sg * y - 2.5)}" width="9" height="5" fill="${G0}"/>` + `<rect x="${CX + 3}" y="${f(CY + sg * y - 2.5)}" width="9" height="5" fill="${G0}"/>`;
            s += stroke(lineD([CX - 12, CY + sg * y + 2.9], [CX - 3, CY + sg * y + 2.9]), WHITE, 0.7, 0.3) + stroke(lineD([CX + 3, CY + sg * y + 2.9], [CX + 12, CY + sg * y + 2.9]), WHITE, 0.7, 0.3);
        }
    }
    for (const [x0, x1, y] of [[86, 124, 226], [236, 274, 174]]) {
        s += stroke(lineD([x0, y - 14], [x1, y - 14]), WHITE, 0.8, 0.2) + stroke(lineD([x0, y + 14], [x1, y + 14]), WHITE, 0.8, 0.2);
        s += `<rect x="${(x0 + x1) / 2 - 10}" y="${y - 2.5}" width="20" height="5" fill="${G0}"/>`;
    }
    // bezel round the iris
    s += `<path d="${pathOf(BEZEL)}${pathOf(HOLE)}" fill="url(#bz)" fill-rule="evenodd"/>`;
    s += stroke(pathOf(BEZEL), WHITE, 1, 0.4);
    s += stroke(pathOf(roct(47)), G0, 1.6, 0.8);
    s += stroke(pathOf(roct(42.6)), WHITE, 1.3, 0.8);
    const bz = roct(49.5);
    for (let i = 0; i < 8; i++) s += `<rect x="${f(bz[i][0] - 1.6)}" y="${f(bz[i][1] - 1.6)}" width="3.2" height="3.2" fill="${G0}"/>`;
    const defs =
        radial('fb', CX, CY, 170, [[0, '#1C222B'], [0.4, '#12161C'], [1, '#090B0F']]) +
        linear('bz', 0, CY - 52, 0, CY + 52, [[0, '#343C48'], [1, '#1A1F27']]);
    files['front.svg'] = svg(FBOX, s, defs);
}

// --- leaves: the four armour plates -------------------------------------------------------------
const flip = a => a.map(([x, y]) => [2 * CX - x, 2 * CY - y]);
const H_TL = [[157, 62], [173, 62], [173, 146], [165, 154], [149, 154], [149, 70]];
const H_TR = [[187, 62], [203, 62], [211, 70], [211, 104], [203, 112], [187, 112]];
const HEROES = { tl: [H_TL], tr: [H_TR], br: [flip(H_TL)], bl: [flip(H_TR)] };
function fastener(x, y) {
    const o = oct(x - 2.6, y - 2.6, x + 2.6, y + 2.6, 1.5);
    return poly(o, G0) + stroke(lineD(o[5], o[4]), WHITE, 0.7, 0.55) + stroke(lineD(o[4], o[3]), WHITE, 0.7, 0.3);
}
function edgeLines(q, k = 1) {
    let s = '';
    for (let i = 0; i < q.length; i++) {
        const a = q[i], b = q[(i + 1) % q.length];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (l < 0.5) continue;
        const nx = (b[1] - a[1]) / l, ny = -(b[0] - a[0]) / l; // outward for a clockwise polygon
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const hull = onHull(mx, my);
        const seamV = Math.abs(nx) > 0.99 && Math.abs(mx - CX) < 2;
        let op = ny < -0.9 ? 0.95 : ny < -0.3 ? 0.85 : ny < 0.3 ? 0.55 : ny < 0.9 ? 0.3 : 0.22;
        if (seamV) op = 1;
        const w = hull ? 2.1 : seamV ? 1.5 : 1.1;
        const ia = [a[0] - nx * w * 0.5, a[1] - ny * w * 0.5], ib = [b[0] - nx * w * 0.5, b[1] - ny * w * 0.5];
        if (hull && ny < 0.3) s += stroke(lineD(ia, ib), WHITE, w * 3.4, 0.07 * k, ' stroke-linecap="round"');
        if (seamV) s += stroke(lineD(ia, ib), WHITE, 5, 0.1 * k);
        s += stroke(lineD(ia, ib), WHITE, w, op * k, ' stroke-linecap="square"');
    }
    return s;
}
for (const [id, leaf] of Object.entries(LEAVES)) {
    const q = leaf.q;
    let s = `<g clip-path="url(#c)">`;
    s += poly(q, 'url(#lf)');
    // a darker inner field: the plate has a raised rim and a recessed face
    s += poly(inset(q, 8), G0, ' opacity="0.28"');
    s += stroke(pathOf(inset(q, 8)), WHITE, 0.7, 0.16);
    // asymmetric panel breaks
    if (id === 'tl') s += stroke('M88 126L120 126L132 138L132 196', WHITE, 0.8, 0.26) + stroke('M96 104L112 104', WHITE, 1.6, 0.5);
    if (id === 'br') s += stroke('M272 284L240 284L228 272L228 236', WHITE, 0.8, 0.26) + stroke('M248 306L264 306', WHITE, 1.6, 0.5);
    if (id === 'tr') s += stroke('M228 70L228 132L240 144L272 144', WHITE, 0.8, 0.26);
    if (id === 'bl') s += stroke('M132 330L132 268L120 256L88 256', WHITE, 0.8, 0.26);
    // one vent group, on the big right leaf
    if (id === 'br') {
        for (let i = 0; i < 5; i++) {
            const y = 190 + i * 6.4;
            s += poly([[242, y], [270, y], [270, y + 3.4], [242, y + 3.4]], G0);
            s += stroke(lineD([242, y + 3.9], [270, y + 3.9]), WHITE, 0.7, 0.34);
        }
    }
    // hero plates: armour white, set in a dark recess
    HEROES[id].forEach((o, i) => {
        const xs0 = o.map(p => p[0]), ys0 = o.map(p => p[1]);
        const x0 = Math.min(...xs0), x1 = Math.max(...xs0), y0 = Math.min(...ys0), y1 = Math.max(...ys0);
        s += poly(inset(o, -1.5), G1);
        s += poly(o, `url(#h${i})`);
        const top = o.filter(p => p[1] === y0).sort((a, b) => a[0] - b[0]);
        s += stroke(lineD([top[0][0], y0 + 0.5], [top[1][0], y0 + 0.5]), '#FFFFFF', 1, 0.95);
        // the half toward the seam is a shade darker: two facets, not a pill
        const xm = id[1] === 'l' ? x1 - 6 : x0 + 6;
        s += `<g clip-path="url(#hc${i})"><rect x="${id[1] === 'l' ? xm : x0}" y="${y0}" width="8" height="${y1 - y0}" fill="#56606F" opacity="0.45"/>` + stroke(lineD([xm, y0], [xm, y1]), '#FFFFFF', 0.7, 0.7) + `</g>`;
        // one break across the plate, off-centre, and a short dark slot
        const yb = id[0] === 't' ? y1 - 22 : y0 + 22;
        s += stroke(lineD([x0, yb], [x1, yb]), G1, 1.6, 0.85);
        const ys = id[0] === 't' ? y0 + 12 : y1 - 12;
        const xs = id[1] === 'l' ? x0 + 4 : x1 - 4 - 6;
        s += `<rect x="${xs}" y="${ys - 1.3}" width="6" height="2.4" fill="${G2}" opacity="0.85"/>`;
    });
    // the collar round the lock
    s += stroke(pathOf(roct(39.6)), G0, 3.2);
    s += `<path d="${pathOf(COLLAR)}${pathOf(APERTURE)}" fill="url(#cl)" fill-rule="evenodd"/>`;
    s += stroke(pathOf(roct(37.4)), WHITE, 1.2, 0.85);
    s += stroke(pathOf(roct(31)), G0, 1.4, 0.7);
    s += stroke(pathOf(roct(23.6)), WHITE, 1.1, 0.5);
    if (id === 'br') {
        // the one hazard stripe: on the collar's lower face
        let h = '';
        for (let x = 176; x < 200; x += 5) h += poly([[x, 235.5], [x + 2.5, 235.5], [x + 9.5, 227.5], [x + 7, 227.5]], ORANGE);
        s += `<g clip-path="url(#hz)">${poly([[183, 227.5], [195, 227.5], [195, 235.5], [183, 235.5]], G0)}${h}</g>`;
    }
    s += `</g>`;
    s += edgeLines(q);
    // fasteners: one on the collar and one at the outer corner of every leaf
    const [dx, dy] = leaf.dir;
    s += fastener(CX + dx * 24.4, CY + dy * 24.4);
    s += fastener(CX + dx * 76, CY + dy * 130);
    const defs =
        `<clipPath id="c"><polygon points="${pts(q)}"/></clipPath>` +
        (id === 'br' ? `<clipPath id="hz"><polygon points="${pts([[183, 227.5], [195, 227.5], [195, 235.5], [183, 235.5]])}"/></clipPath>` : '') +
        linear('lf', 0, 46, 0, 354, [[0, '#38414E'], [0.3, '#272E38'], [1, '#161B22']]) +
        linear('cl', 0, CY - 38, 0, CY + 38, [[0, '#3B4452'], [0.5, '#272E38'], [1, '#191E26']]) +
        HEROES[id].map((o, i) => `<clipPath id="hc${i}"><polygon points="${pts(o)}"/></clipPath>` + linear(`h${i}`, 0, Math.min(...o.map(p => p[1])), 0, Math.max(...o.map(p => p[1])), [[0, '#E6EBF2'], [0.4, '#B4BDCA'], [1, '#6C7686']])).join('');
    files[`leaf-${id}.svg`] = svg(FBOX, s, defs);
}

// --- lock-orange: the standby light in the lock (the only accent while closed) --------------------
{
    const box = [120, 140, 120, 310];
    let s = `<circle cx="${CX}" cy="${CY}" r="58" fill="url(#ob)"/>`;
    s += `<g clip-path="url(#c)">`;
    s += `<polygon points="${pts(APERTURE)}" fill="url(#of)"/>`;
    for (const [a, b] of seamRays(30)) s += glow(lineD(a, b), '#FF5A14', 1.7, 1.5, '#FFC2A0');
    s += `</g>`;
    s += glow(pathOf(roct(23.4)), '#FF5A14', 1.5, 1.3, ORANGE_HOT);
    s += `<circle cx="${CX}" cy="${CY}" r="15" fill="url(#oh)"/>` + poly(roct(RHO + 0.4), '#FF9A66');
    s += stroke(pathOf(roct(RHO + 0.4)), '#FFD0B4', 0.9, 0.9);
    // its smear in the glossy floor
    s += `<ellipse cx="${CX}" cy="${HORIZON + 30}" rx="30" ry="34" fill="url(#or)"/>`;
    s += `<rect x="${CX - 20}" y="${HORIZON + 5.2}" width="40" height="1.6" fill="url(#ol)"/>`;
    const defs =
        `<clipPath id="c"><polygon points="${pts(roct(22.6))}"/></clipPath>` +
        radial('ob', CX, CY, 58, [[0, ORANGE_HOT, 0.75], [0.3, '#FF5A14', 0.45], [0.65, ORANGE, 0.14], [1, ORANGE, 0]]) + radial('oh', CX, CY, 15, [[0, '#FF8A52', 0.9], [0.5, '#FF5A14', 0.5], [1, '#FF5A14', 0]]) +
        radial('of', CX, CY, 24, [[0, '#FF5A14', 0.85], [0.5, ORANGE, 0.55], [1, '#B8360A', 0.4]]) +
        radial('or', CX, HORIZON + 30, 34, [[0, ORANGE, 0.3], [1, ORANGE, 0]]) +
        linear('ol', CX - 20, 0, CX + 20, 0, [[0, ORANGE, 0], [0.5, ORANGE_HOT, 0.8], [1, ORANGE, 0]]);
    files['lock-orange.svg'] = svg(box, s, defs);
}

// --- clamps: the ring's grips over the four seam ends ---------------------------------------------
function clamp(cx, cy, ax, ay) {
    // (ax, ay) points from the ring toward the cask; local frame u = along, v = across
    const P = (u, v) => [cx + ax * u - ay * v, cy + ay * u + ax * v];
    const body = [P(-22, -15), P(-2, -15), P(4, -21), P(12, -21), P(12, -7), P(4, -7), P(4, 7), P(12, 7), P(12, 21), P(4, 21), P(-2, 15), P(-22, 15)];
    let s = poly(inset(body, -1.6), G0);
    s += poly(body, 'url(#cg)');
    s += stroke(pathOf(inset(body, 0.6)), WHITE, 1.1, 0.5);
    s += stroke(lineD(P(-22, -15), P(-2, -15)), WHITE, 1.2, 0.5);
    // piston rod back into the ring, and a slot
    s += poly([P(-40, -5), P(-22, -5), P(-22, 5), P(-40, 5)], G3) + stroke(lineD(P(-40, -5), P(-22, -5)), WHITE, 0.8, 0.45) + stroke(lineD(P(-40, 5), P(-22, 5)), WHITE, 0.8, 0.2);
    s += poly([P(-16, -2), P(-6, -2), P(-6, 2), P(-16, 2)], G0) + stroke(lineD(P(-16, 2.5), P(-6, 2.5)), WHITE, 0.7, 0.4);
    return s;
}
const CBOX = [0, 0, 360, 400];
const cdefs = linear('cg', 0, 0, 0, 400, [[0, '#3A4350'], [0.5, '#262D37'], [1, '#1A1F27']]);
files['clamps-ns.svg'] = svg(CBOX, clamp(CX, 42, 0, 1) + clamp(CX, 358, 0, -1), cdefs);
files['clamps-we.svg'] = svg(CBOX, clamp(76, 232, 1, 0) + clamp(284, 168, -1, 0), cdefs);

// --- spill: the core's light on the open leaves, the bezel and the floor (screen) ----------------
{
    const box = [0, 0, W, H];
    let s = `<circle cx="${CX}" cy="${CY}" r="150" fill="url(#sb)"/>`;
    let lines = '';
    for (const leaf of Object.values(LEAVES)) {
        const q = shift(leaf.q, leaf.dir[0] * D, leaf.dir[1] * D);
        const p0 = shift(leaf.p, leaf.dir[0] * D, leaf.dir[1] * D);
        // a wash of light on the face, strongest at the edge that looks at the core
        s += `<polygon points="${pts(q)}" fill="url(#sw)"/>`;
        for (let i = 0; i < q.length; i++) {
            const a = q[i], b = q[(i + 1) % q.length];
            const m = [(p0[i][0] + p0[(i + 1) % q.length][0]) / 2 - leaf.dir[0] * D, (p0[i][1] + p0[(i + 1) % q.length][1]) / 2 - leaf.dir[1] * D];
            if (onHull(m[0], m[1])) continue;
            const dist = Math.hypot((a[0] + b[0]) / 2 - CX, (a[1] + b[1]) / 2 - CY);
            lines += glow(lineD(a, b), CYAN, 1.4, Math.max(0.25, 1.15 - dist / 150), dist < 95 ? CYAN_HOT : '');
        }
    }
    s += lines;
    s += glow(pathOf(roct(42.6)), CYAN, 1.5, 1, CYAN_HOT);
    s += stroke(pathOf(BEZEL), CYAN, 1, 0.5);
    // one hard anamorphic streak through the core
    s += `<rect x="6" y="${CY - 9}" width="348" height="18" fill="url(#st)"/>`;
    s += `<rect x="20" y="${CY - 0.9}" width="320" height="1.8" fill="url(#sl)"/>`;
    // floor: a pool and hard strips
    s += `<ellipse cx="${CX}" cy="${HORIZON + 34}" rx="120" ry="44" fill="url(#sf)"/>`;
    s += `<rect x="${CX - 70}" y="${HORIZON + 4.4}" width="140" height="2" fill="url(#sl2)"/>`;
    s += `<rect x="${CX - 2}" y="${HORIZON + 4}" width="4" height="70" fill="url(#sm)"/>`;
    for (const sg of [-1, 1]) s += glow(lineD([CX + sg * 38, HORIZON + 3], [CX + sg * 112, H + 8]), CYAN, 1.4, 0.6);
    const defs =
        radial('sb', CX, CY, 150, [[0, CYAN, 0.42], [0.3, '#32C8F0', 0.2], [0.65, '#1D6E8C', 0.07], [1, '#1D6E8C', 0]]) +
        radial('sw', CX, CY, 170, [[0, CYAN, 0.3], [0.45, CYAN, 0.1], [1, CYAN, 0]]) +
        radial('st', CX, CY, 174, [[0, CYAN, 0.3], [1, CYAN, 0]]).replace('<radialGradient', `<radialGradient gradientTransform="translate(0 ${f(CY * (1 - 0.052))}) scale(1 0.052)"`) +
        linear('sl', 20, 0, 340, 0, [[0, CYAN, 0], [0.5, '#FFFFFF', 0.95], [1, CYAN, 0]]) +
        linear('sl2', CX - 70, 0, CX + 70, 0, [[0, CYAN, 0], [0.5, CYAN_HOT, 0.9], [1, CYAN, 0]]) +
        radial('sf', CX, HORIZON + 34, 120, [[0, CYAN, 0.32], [1, CYAN, 0]]).replace('<radialGradient', `<radialGradient gradientTransform="translate(0 ${f((HORIZON + 34) * (1 - 0.37))}) scale(1 0.37)"`) +
        linear('sm', 0, HORIZON + 4, 0, HORIZON + 74, [[0, CYAN_HOT, 0.7], [1, CYAN, 0]]);
    files['spill.svg'] = svg(box, s, defs);
}

// --- fore: out-of-focus gantry in front of the lens ------------------------------------------------
{
    const box = [-20, -20, W + 40, H + 40];
    const s = `<rect x="-20" y="-20" width="${W + 40}" height="${H + 40}" fill="url(#v)"/>` + `<g filter="url(#b)">${stroke(lineD([-20, 452], [380, 452]), '#030405', 26)}</g>`;
    const defs = `<filter id="b" filterUnits="userSpaceOnUse" x="-20" y="380" width="${W + 40}" height="90"><feGaussianBlur stdDeviation="6"/></filter>` + radial('v', CX, 210, 330, [[0.72, '#030405', 0], [1, '#030405', 0.75]]);
    files['fore.svg'] = svg(box, s, defs);
}

// --- dust -------------------------------------------------------------------------------------
{
    const box = [CX - 4, CY - 4, 8, 8];
    const defs = radial('d', CX, CY, 4, [[0, CYAN_HOT, 0.9], [0.35, CYAN, 0.3], [1, CYAN, 0]]);
    files['dust.svg'] = svg(box, `<circle cx="${CX}" cy="${CY}" r="4" fill="url(#d)"/><circle cx="${CX}" cy="${CY}" r="0.9" fill="#FFFFFF"/>`, defs);
}

for (const name of readdirSync(OUT)) if (name.endsWith('.svg') && !(name in files)) unlinkSync(OUT + name);
for (const [name, text] of Object.entries(files)) writeFileSync(OUT + name, text);
console.log(Object.entries(files).map(([n, t]) => `${n} ${t.length}`).join('  '));
