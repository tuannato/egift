// Generator for the "cloudmoon" wrapper art (welcome-baby: first month, first birthday), drawn as a
// RISOGRAPH PRINT. Three spot inks on warm paper — blue, yellow, coral — and nothing else:
//   - every tone is paper, a FLAT area of one ink, or one ink printed over another (the inks multiply:
//     blue over yellow is a green-grey, coral over yellow an orange);
//   - every gradient is a HALFTONE: dots on a slanted screen that swell until they close into the flat
//     (the gate allows no feTurbulence, so each dot is a zero-length round-capped stroke in a long path);
//   - the three plates are out of register (REG) by a unit or so, so a sliver of paper or of overprint
//     shows where two inks meet;
//   - unprinted paper is the white: clouds, the ring of light, the knock-outs under stars.
// No outlines, no smooth blends. Stars are cut by hand: no two alike.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas);
// clouds, the tie and its charm are drawn where they are when CLOSED, everything else where it is when OPEN.
// Run: node scripts/art/cloudmoon.gen.mjs && node scripts/wrap-art.mjs --write
import { writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'cloudmoon');
if (!OUT.endsWith('wrappers/cloudmoon')) throw new Error('out dir must be public/wrappers/cloudmoon');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* Paper and the three inks. The sky is the blue plate printed flat, so SKY is the blue itself. */
const PAPER = '#FBF6EA';
const BLUE = '#9CBDEA';
const SKY = BLUE;
const YELLOW = '#F8D768';
const CORAL = '#F08C78';
/* Plate registration: how far each ink sits from where it should (canvas units). */
const REG = { blue: [1.2, 0.9], yellow: [-1, 0.8], coral: [0.9, -1.1] };

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mul = (a, b) => {
    const A = hex(a), B = hex(b);
    return '#' + A.map((v, i) => Math.round((v * B[i]) / 255).toString(16).padStart(2, '0')).join('').toUpperCase();
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
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const MUL = 'style="mix-blend-mode:multiply"';

const BOX = {};
function svg(name, box, inner) {
    BOX[name] = box.map(v => Math.round(v * 100) / 100);
    const [x, y, w, h] = BOX[name];
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    writeFileSync(join(OUT, `${name}.svg`), s);
}

/**
 * Grain. A jittered grid over `box`, one candidate dot per cell of 2r; `density(x, y)` (0..1) is the
 * chance the dot is printed. Jitter keeps it a grain, the grid keeps it even (no clumps, no holes).
 */
function stipple(box, r, density, rand, cellK = 2) {
    const [x0, y0, w, h] = box;
    const cell = r * cellK;
    const out = [];
    for (let gy = 0; gy * cell < h; gy++) {
        for (let gx = 0; gx * cell < w; gx++) {
            const x = x0 + (gx + rand()) * cell, y = y0 + (gy + rand()) * cell;
            const d = density(x, y);
            if (d > 0 && rand() < d) out.push([x, y]);
        }
    }
    return out;
}
/** A number as short as a path allows. */
const num = v => {
    let s = String(v);
    if (s.startsWith('0.')) s = s.slice(1);
    else if (s.startsWith('-0.')) s = '-' + s.slice(2);
    return s;
};
/**
 * Dots as one path: zero-length subpaths, drawn by their round caps. Positions snap to half units and
 * are written as whole numbers under a scale of one half, in an order that keeps each step short.
 */
function dots(points, r, ink) {
    if (points.length === 0) return '';
    const q = points.map(([x, y]) => [Math.round(x * 2), Math.round(y * 2)]);
    const band = 5;
    q.sort((a, b) => {
        const ra = Math.floor(a[1] / band), rb = Math.floor(b[1] / band);
        if (ra !== rb) return ra - rb;
        return ra % 2 === 0 ? a[0] - b[0] : b[0] - a[0];
    });
    let d = '', px = 0, py = 0, first = true;
    for (const [x, y] of q) {
        const a = String(first ? x : x - px), b = String(first ? y : y - py);
        d += `${first ? 'M' : 'm'}${a}${b.startsWith('-') ? '' : ' '}${b}z`;
        px = x; py = y; first = false;
    }
    return `<path transform="scale(.5)" d="${d}" fill="none" stroke="${ink}" stroke-width="${f(r * 4)}" stroke-linecap="round"/>`;
}
/** One ink plate: its marks, multiplied onto what is under them, pushed off register. */
const plate = (ink, inner) => (inner ? `<g ${MUL} transform="translate(${REG[ink][0]} ${REG[ink][1]})">${inner}</g>` : '');

/**
 * Halftone. Dots on a screen of `pitch` turned by `angle` degrees; `tone(x, y)` (0..1) sets each dot's
 * size, from nothing to dots that touch and close. Written as a few paths, one per dot size.
 */
function halftone(box, pitch, angle, tone, ink, steps = 6) {
    const [x0, y0, w, h] = box;
    const a = (angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const cx = x0 + w / 2, cy = y0 + h / 2, n = Math.ceil(Math.hypot(w, h) / pitch / 2) + 1;
    const rmax = pitch * 0.6;
    const classes = Array.from({ length: steps }, () => []);
    for (let j = -n; j <= n; j++) {
        for (let i = -n; i <= n; i++) {
            const u = (i + (j % 2 ? 0.5 : 0)) * pitch, v = j * pitch * 0.866;
            const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
            if (x < x0 || x > x0 + w || y < y0 || y > y0 + h) continue;
            const t = tone(x, y);
            if (!(t > 0.03)) continue;
            const k = Math.min(steps, Math.max(1, Math.round(Math.sqrt(Math.min(1, t)) * steps)));
            classes[k - 1].push([x, y]);
        }
    }
    return classes.map((pts, k) => dots(pts, (rmax * (k + 1)) / steps, ink)).join('');
}

/* ---------- Geometry ---------- */
const W = 360, H = 450;
/** The moon's centre and radius. */
const M = [184, 172], MR = 52;
/** The dark side: the circle cut out of the disc to leave a crescent lying on its back, tilted. */
const CUT = { dx: 9.5, dy: -17.5, r: 46 };
const HALO = 88; // the ring of light: bare paper out to here, then breaking up into the sky
const SEAM = 184; // where the two banks of cloud meet
const dist = (x, y, c) => Math.hypot(x - c[0], y - c[1]);
const poly = (pp, fill, extra = '') => `<polygon points="${pp.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${fill}"${extra}/>`;

/** An inked shape in its knock-out: overprint sliver where the ink misses the hole, paper where the hole shows. */
function knocked(shape, ink, under, which) {
    const [dx, dy] = REG[which];
    return shape(dx, dy, mul(under, ink)) + shape(0, 0, PAPER) + shape(dx, dy, ink, ` ${MUL}`);
}
/** A star cut by hand with scissors: five points, none the same length, none quite where it should be. */
function cutStar(cx, cy, R, seed) {
    const rand = rng(seed), pts = [];
    const turn = rand() * 72;
    for (let k = 0; k < 10; k++) {
        const out = k % 2 === 0;
        const a = ((turn + k * 36 + (rand() - 0.5) * (out ? 13 : 9) - 90) * Math.PI) / 180;
        const r = R * (out ? 0.82 + rand() * 0.36 : 0.4 + rand() * 0.14);
        pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return (dx, dy, fill, extra = '') => poly(pts.map(([x, y]) => [cx + x + dx, cy + y + dy]), fill, extra);
}
const star = (cx, cy, R, seed, ink, which) => (ink === PAPER ? cutStar(cx, cy, R, seed)(0, 0, PAPER) : knocked(cutStar(cx, cy, R, seed), ink, SKY, which));

/* ---------- Sky: the blue plate, flat; specks of paper where the drum missed ---------- */
{
    const rand = rng(11);
    const box = [-14, -14, W + 28, H + 28];
    let s = `<rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="${BLUE}"/>`;
    s += dots(stipple(box, 0.45, () => 0.012, rand, 2.6), 0.45, PAPER);
    // the few stars that are out before the clouds part (kept clear of the frame's labels, top left)
    s += star(298, 88, 8, 1, YELLOW, 'yellow') + star(92, 98, 5, 2, PAPER) + star(230, 72, 3.6, 3, PAPER);
    for (const [x, y, r] of [[150, 84, 1.5], [252, 96, 1.2], [26, 104, 1.3], [336, 66, 1.6], [58, 78, 1.2], [268, 64, 1.3], [322, 106, 1.1], [182, 62, 1.1]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${PAPER}"/>`;
    // and the small ones the parted clouds uncover: specks of paper and of yellow, away from the ring
    const far = rng(13);
    for (let i = 0, n = 0; i < 400 && n < 34; i++) {
        const x = 14 + far() * 332, y = 112 + far() * 250;
        if (dist(x, y, M) < HALO + 34) continue;
        const r = 0.7 + far() * 0.8;
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${PAPER}"/>`;
        if (n % 4 === 3) s += `<circle cx="${f(x + REG.yellow[0] * 0.5)}" cy="${f(y + REG.yellow[1] * 0.5)}" r="${f(r)}" fill="${YELLOW}" ${MUL}/>`;
        n++;
    }
    svg('sky', box, s);
}

/* ---------- The ring of light: bare paper breaking into the sky as a halftone; a flat yellow ring ---------- */
{
    const R = HALO + 36;
    const box = [M[0] - R, M[1] - R, R * 2, R * 2];
    let s = `<circle cx="${M[0]}" cy="${M[1]}" r="${HALO}" fill="${PAPER}"/>`;
    s += halftone(box, 4.2, 22, (x, y) => { const d = dist(x, y, M); return d < HALO - 2 ? 0 : Math.pow(clamp(1 - (d - HALO) / 34), 1.15); }, PAPER);
    // the ring: a flat band of yellow, its inner edge thinning to dots
    let ring = `<circle cx="${M[0]}" cy="${M[1]}" r="${HALO - 12}" fill="none" stroke="${YELLOW}" stroke-width="5.5"/>`;
    ring += halftone(box, 3, 52, (x, y) => { const d = dist(x, y, M); return d > HALO - 14 || d < MR + 4 ? 0 : 0.9 * Math.pow((d - MR - 4) / (HALO - 18 - MR), 2.2); }, YELLOW);
    s += plate('yellow', ring);
    svg('halo', box, s);
}

/* ---------- The glow behind the closed clouds: a tall flat of yellow, the height of the seam ---------- */
{
    const c = [SEAM, 284], rx = 30, ry = 172;
    const box = [c[0] - rx - 16, c[1] - ry - 16, (rx + 16) * 2, (ry + 16) * 2];
    // how far outside the ellipse a point is, in canvas units (first-order)
    const out = (x, y) => { const dx = x - c[0], dy = y - c[1], q = (dx / rx) ** 2 + (dy / ry) ** 2; return (q - 1) / (2 * Math.hypot(dx / (rx * rx), dy / (ry * ry)) || 1); };
    let y = `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${rx}" ry="${ry}" fill="${YELLOW}"/>`;
    y += halftone(box, 3.2, 38, (x, yy) => { const d = out(x, yy); return d < -1 ? 0 : Math.pow(clamp(1 - d / 13), 1.2); }, YELLOW);
    svg('glow', box, plate('yellow', y));
}

/* ---------- The moon: a flat yellow crescent; a flat of coral over its outer limb makes orange ---------- */
const inMoon = (x, y, grow = 0) => dist(x, y, M) < MR + grow && dist(x, y, [M[0] + CUT.dx, M[1] + CUT.dy]) > CUT.r - grow;
{
    const box = [M[0] - MR - 5, M[1] - MR - 5, MR * 2 + 10, MR * 2 + 10];
    // the two points where the cutting circle crosses the disc
    const D = Math.hypot(CUT.dx, CUT.dy);
    const a = (MR * MR - CUT.r * CUT.r + D * D) / (2 * D);
    const hh = Math.sqrt(MR * MR - a * a);
    const ux = CUT.dx / D, uy = CUT.dy / D;
    const p1 = [M[0] + a * ux - hh * uy, M[1] + a * uy + hh * ux];
    const p2 = [M[0] + a * ux + hh * uy, M[1] + a * uy - hh * ux];
    const cres = `M${f(p1[0])} ${f(p1[1])}A${MR} ${MR} 0 1 1 ${f(p2[0])} ${f(p2[1])}A${CUT.r} ${CUT.r} 0 1 0 ${f(p1[0])} ${f(p1[1])}Z`;
    // the shade: what of the crescent lies outside a second disc, set up and to the right
    const SH = [M[0] + 5, M[1] - 7.5, MR + 1.5];
    const shade = `<g clip-path="url(#c)"><path fill-rule="evenodd" d="M${M[0] - 80} ${M[1] - 80}h160v160h-160ZM${f(SH[0] - SH[2])} ${f(SH[1])}a${SH[2]} ${SH[2]} 0 1 0 ${f(SH[2] * 2)} 0a${SH[2]} ${SH[2]} 0 1 0 ${f(-SH[2] * 2)} 0Z" fill="${CORAL}"/>`
        + halftone(box, 2.7, 68, (x, y) => { const d = SH[2] - dist(x, y, SH); return d < -0.5 || d > 8 ? 0 : Math.pow(1 - d / 8, 1.2); }, CORAL) + '</g>';
    svg('moon', box, `<defs><clipPath id="c"><path d="${cres}"/></clipPath></defs>` + plate('yellow', `<path d="${cres}" fill="${YELLOW}"/>`) + plate('coral', shade));
}

/* ---------- Stars that come out one by one: cut by hand ---------- */
const STARS = [
    { name: 'star-a', big: [62, 198, 10, YELLOW, 'yellow'], small: [[80, 218, 1.6], [45, 176, 1.2]] },
    { name: 'star-b', big: [306, 192, 8.4, YELLOW, 'yellow'], small: [[290, 214, 1.3], [324, 172, 1.5]] },
    { name: 'star-c', big: [46, 246, 6.4, PAPER, ''], small: [[66, 264, 1.5], [31, 224, 1.1]] },
    { name: 'star-d', big: [320, 244, 6.8, CORAL, 'coral'], small: [[302, 264, 1.4], [334, 222, 1.1]] },
    { name: 'star-e', big: [98, 270, 5.6, YELLOW, 'yellow'], small: [[84, 248, 1.2], [112, 292, 1.3]] },
    { name: 'star-f', big: [274, 272, 7.4, YELLOW, 'yellow'], small: [[257, 252, 1.2], [292, 296, 1.5]] },
];
STARS.forEach((st, k) => {
    const [cx, cy, R, ink, which] = st.big;
    let s = star(cx, cy, R, 20 + k, ink, which);
    for (const [x, y, r] of st.small) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${PAPER}"/>`;
    const xs = [cx - R * 1.2, cx + R * 1.2, ...st.small.flatMap(([x, , r]) => [x - r, x + r])];
    const ys = [cy - R * 1.2, cy + R * 1.2, ...st.small.flatMap(([, y, r]) => [y - r, y + r])];
    const x0 = Math.floor(Math.min(...xs)) - 2, y0 = Math.floor(Math.min(...ys)) - 2;
    svg(st.name, [x0, y0, Math.ceil(Math.max(...xs)) + 2 - x0, Math.ceil(Math.max(...ys)) + 2 - y0], s);
});

/* ---------- The mobile: five small things on coral threads, hung from the crescent's underside ---------- */
const HANG = [
    { name: 'hang-a', dx: -45, len: 36, kind: 'star' },
    { name: 'hang-b', dx: -24, len: 60, kind: 'cloud' },
    { name: 'hang-c', dx: -2, len: 78, kind: 'boat' },
    { name: 'hang-d', dx: 20, len: 50, kind: 'kite' },
    { name: 'hang-e', dx: 39, len: 32, kind: 'spark' },
];
const K = 1.35; // the size of the hung things
for (const hg of HANG) {
    const ax = M[0] + hg.dx;
    const ay = M[1] + Math.sqrt(MR * MR - hg.dx * hg.dx) - 2.5; // just inside the limb
    if (!inMoon(ax, ay, 0)) throw new Error(`${hg.name} does not hang from the crescent`);
    const ty = ay + hg.len; // where the thread ends and the thing begins
    const P = pp => pp.map(([x, y]) => [ax + x * K, ty + y * K]);
    const off = (pp, o) => pp.map(([x, y]) => [x + o[0], y + o[1]]);
    let s = `<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(ax)}" y2="${f(ty + 2)}" stroke="${CORAL}" stroke-width="0.8"/>`;
    let hgt = 20;
    if (hg.kind === 'star') {
        s += star(ax, ty + 9.5 * K, 9.4 * K, 51, YELLOW, 'yellow');
        hgt = 21;
    } else if (hg.kind === 'spark') {
        s += star(ax, ty + 6.5 * K, 6.6 * K, 52, CORAL, 'coral');
        hgt = 15;
    } else if (hg.kind === 'cloud') {
        // a small cloud: bare paper, a yellow halftone swelling toward its underside
        const lobes = [[-6.5, 8, 5.4, 4.8], [0.5, 5.6, 6.4, 5.6], [7, 8.6, 4.8, 4.2]];
        s += lobes.map(([x, y, rx, ry]) => `<ellipse cx="${f(ax + x * K)}" cy="${f(ty + y * K)}" rx="${f(rx * K)}" ry="${f(ry * K)}" fill="${PAPER}"/>`).join('');
        s += `<rect x="${f(ax - 12 * K)}" y="${f(ty + 8 * K)}" width="${f(24 * K)}" height="${f(5.6 * K)}" rx="${f(2.8 * K)}" fill="${PAPER}"/>`;
        s += plate('yellow', halftone([ax - 10.5 * K, ty + 8.4 * K, 21 * K, 4.6 * K], 2.1, 30, (x, y) => 0.12 + 0.8 * clamp((y - ty - 8.6 * K) / (4.2 * K)), YELLOW, 4));
        hgt = 14.5;
    } else if (hg.kind === 'kite') {
        // a kite: a yellow diamond, two of its four panes overprinted in coral; a tail with two bows
        const N = [0, 0], E = [6.6, 7.2], S = [0, 18], Wp = [-6.6, 7.2], C = [0, 7.2];
        const shape = (dx, dy, fill, extra = '') => poly(off(P([N, E, S, Wp]), [dx, dy]), fill, extra);
        s += knocked(shape, YELLOW, SKY, 'yellow');
        s += poly(off(P([N, E, C]), REG.coral), CORAL, ` ${MUL}`) + poly(off(P([C, S, Wp]), REG.coral), CORAL, ` ${MUL}`);
        const t0 = P([S])[0];
        s += `<path d="M${f(t0[0])} ${f(t0[1])}q${f(3 * K)} ${f(3 * K)} 0 ${f(6 * K)}t0 ${f(6 * K)}" fill="none" stroke="${CORAL}" stroke-width="0.8"/>`;
        s += poly(P([[-2.6, 22.2], [2.6, 25.2], [2.6, 22.2], [-2.6, 25.2]]), CORAL) + poly(P([[-2.2, 28.4], [2.2, 31], [2.2, 28.4], [-2.2, 31]]), CORAL);
        hgt = 32;
    } else {
        // a folded paper boat: bare paper, one face of the sail in blue (twice over the sky), the hull's fold in coral
        const D = 10.5; // deck line
        s += poly(P([[-6.4, D], [0, 0], [6.4, D]]), PAPER) + poly(P([[-12, D], [12, D], [7, D + 7.6], [-7, D + 7.6]]), PAPER);
        s += poly(off(P([[0, 0], [6.4, D], [0, D]]), REG.blue), BLUE, ` ${MUL}`);
        s += poly(off(P([[-12, D], [12, D], [9.6, D + 3.6], [-9.6, D + 3.6]]), REG.coral), CORAL, ` ${MUL}`);
        s += plate('blue', halftone([ax - 8 * K, ty + (D + 3.8) * K, 16 * K, 3.4 * K], 2, 30, (x) => 0.2 + 0.6 * clamp((x - ax + 4 * K) / (10 * K)), BLUE, 4));
        hgt = 19;
    }
    hg.attach = [ax, ay];
    svg(hg.name, [ax - 18, ay, 36, hg.len + hgt * K + 2], s);
}

/* ---------- Clouds: bare paper; a flat blue underside; a halftone between; yellow light at the seam ---------- */
/**
 * A cloud is a pile of ellipses [cx, cy, rx, ry], printed as bare paper. Under its crown the blue plate
 * prints a halftone that swells with depth and closes into a flat underside, whose upper edge echoes the
 * crown. Toward the seam the yellow plate prints the light that leaks through: a halftone that closes
 * at the cloud's inner edge and makes a green-grey where it crosses the blue. Both plates are cut to the
 * cloud's shape and then pushed off register, so each overhangs the paper on one side and falls short
 * on the other.
 */
function cloud(name, lobes, { seed, glow = 1, crown = 15, band = 26 }) {
    const rand = rng(seed);
    const x0 = Math.max(-16, Math.min(...lobes.map(l => l[0] - l[2])) - 3), x1 = Math.min(W + 16, Math.max(...lobes.map(l => l[0] + l[2])) + 3);
    const y0 = Math.max(-16, Math.min(...lobes.map(l => l[1] - l[3])) - 3), y1 = Math.min(H + 30, Math.max(...lobes.map(l => l[1] + l[3])) + 3);
    const box = [Math.floor(x0), Math.floor(y0), Math.ceil(x1 - x0), Math.ceil(y1 - y0)];
    const ell = lobes.map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`).join('');
    const inside = (x, y) => lobes.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1);
    const topAt = x => {
        let t = Infinity;
        for (const [cx, cy, rx, ry] of lobes) if (Math.abs(x - cx) < rx) t = Math.min(t, cy - ry * Math.sqrt(1 - ((x - cx) / rx) ** 2));
        return t;
    };
    // the crown line, softened, so the underside echoes it without copying it
    const soft = x => {
        let sum = 0, n = 0;
        for (let d = -12; d <= 12; d += 4) { const t = topAt(x + d); if (t < Infinity) { sum += t; n++; } }
        return n ? sum / n : Infinity;
    };
    const edge = [];
    // the light pushes the shade back: within NEAR of the seam there is no flat, only a halftone that thins to paper
    const NEAR = 40, fade = x => clamp((Math.abs(x - SEAM) - 9) / (NEAR - 13));
    for (let x = box[0] - 2; x <= box[0] + box[2] + 2; x += 2) { const t = soft(x); edge.push([x, t < Infinity && (glow === 0 || Math.abs(x - SEAM) > NEAR) ? t + crown + band : box[1] + box[3] + 4]); }
    const under = poly([...edge, [box[0] + box[2] + 2, box[1] + box[3] + 4], [box[0] - 2, box[1] + box[3] + 4]], BLUE);
    const screen = halftone(box, 3.3, 28, (x, y) => {
        const d = y - soft(x) - crown, near = glow > 0 && Math.abs(x - SEAM) <= NEAR + 7;
        if (d < 0 || (d > band + 9 && !near) || !inside(x, y)) return 0;
        return Math.pow(Math.min(1, d / band), 1.25) * (glow > 0 ? fade(x) : 1);
    }, BLUE);
    const light = glow > 0 ? halftone(box, 2.9, 62, (x, y) => (inside(x, y) ? glow * Math.pow(clamp(1 - (Math.abs(x - SEAM) - 3) / 24), 1.7) : 0), YELLOW) : '';
    // specks of bare paper in the flat, where the drum missed
    const miss = dots(stipple(box, 0.45, (x, y) => (inside(x, y) && y - soft(x) > crown + band + 2 && Math.abs(x - SEAM) > NEAR + 2 ? 0.035 : 0), rand, 2.4), 0.45, PAPER);
    const cut = inner => (inner ? `<g clip-path="url(#u)">${inner}</g>` : '');
    svg(name, box, `<defs><clipPath id="u">${ell}</clipPath></defs><g fill="${PAPER}">${ell}</g>` + plate('blue', cut(under + screen)) + plate('yellow', cut(light)) + cut(miss));
}

// Two banks that meet at the seam like drawn curtains, each in three overlapping tiers. Every tier ends
// at the seam in a tall soft column; the crowns are all different: some flattened, some small and high.
cloud('cloud-a', [[50, 225, 92, 76], [112, 215, 60, 60], [4, 168, 38, 26], [44, 146, 30, 30], [86, 158, 34, 19], [118, 136, 21, 24], [140, 152, 15, 13], [146, 182, 34, 58]], { seed: 101 });
cloud('cloud-b', [[310, 225, 92, 76], [250, 215, 60, 60], [356, 160, 40, 34], [318, 141, 25, 21], [282, 153, 36, 25], [245, 133, 19, 19], [228, 148, 13, 11], [222, 180, 34, 56]], { seed: 102 });
cloud('cloud-c', [[40, 320, 92, 70], [110, 310, 60, 56], [14, 258, 34, 30], [66, 238, 30, 22], [106, 252, 24, 20], [124, 244, 14, 12], [146, 270, 34, 62]], { seed: 103 });
cloud('cloud-d', [[320, 320, 92, 70], [252, 310, 60, 56], [352, 256, 42, 29], [296, 240, 22, 24], [262, 252, 26, 16], [240, 246, 14, 13], [222, 272, 34, 62]], { seed: 104 });
cloud('cloud-e', [[60, 402, 92, 60], [140, 396, 50, 50], [10, 348, 40, 21], [40, 334, 36, 24], [92, 332, 20, 22], [122, 346, 22, 14], [146, 358, 34, 62]], { seed: 105, glow: 0.8 });
cloud('cloud-f', [[300, 402, 92, 60], [224, 396, 50, 50], [350, 344, 40, 25], [318, 330, 32, 20], [276, 340, 22, 24], [246, 338, 16, 14], [222, 360, 34, 62]], { seed: 106, glow: 0.8 });
// The floor, across the foot of both.
cloud('cloud-g', [[60, 448, 72, 40], [300, 448, 72, 40], [180, 442, 72, 36], [118, 430, 34, 20], [246, 432, 32, 18]], { seed: 107, glow: 0, crown: 12, band: 18 });

/* ---------- What holds the banks shut: a coral thread pinned to each, tied in a bow; a star hangs from the knot ---------- */
const KNOT = [SEAM + 1, 236];
{
    const [kx, ky] = KNOT, L = [140, 226], Rr = [230, 229];
    let s = `<path d="M${L[0]} ${L[1]}Q${f((L[0] + kx) / 2)} ${f(ky + 5)} ${kx} ${ky}Q${f((Rr[0] + kx) / 2)} ${f(ky + 6)} ${Rr[0]} ${Rr[1]}" fill="none" stroke="${CORAL}" stroke-width="1.1" stroke-linecap="round"/>`;
    // the pins
    for (const [x, y] of [L, Rr]) s += `<circle cx="${x}" cy="${y}" r="2.6" fill="${PAPER}"/><circle cx="${f(x + REG.coral[0] * 0.6)}" cy="${f(y + REG.coral[1] * 0.6)}" r="2.6" fill="${CORAL}" ${MUL}/>`;
    // the bow: two loops and two ends
    s += `<path d="M${kx} ${ky}c-5 -7 -13 -7 -12.5 -1.5c.5 4 7 3.5 12.5 1.5c5 -7.5 13 -7 12.5 -1.5c-.5 4 -7 3.5 -12.5 1.5m0 0l-5.5 8m5.5 -8l6 7.5" fill="none" stroke="${CORAL}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<circle cx="${kx}" cy="${ky}" r="1.7" fill="${CORAL}"/>`;
    svg('tie', [L[0] - 6, ky - 14, Rr[0] - L[0] + 12, 30], s);
}
{
    const [kx, ky] = KNOT, len = 15, R = 8.6;
    let s = `<line x1="${kx}" y1="${ky}" x2="${kx}" y2="${ky + len + 2}" stroke="${CORAL}" stroke-width="0.9"/>`;
    const shape = cutStar(kx, ky + len + R * 0.9, R, 61);
    s += shape(0, 0, PAPER) + shape(REG.coral[0], REG.coral[1], CORAL, ` ${MUL}`);
    svg('charm', [kx - 14, ky, 28, len + R * 2.2 + 3], s);
}

/* ---------- Report: boxes for the definition, and sizes against the 60 kB cap ---------- */
let total = 0;
for (const [name, box] of Object.entries(BOX)) {
    const kb = statSync(join(OUT, `${name}.svg`)).size / 1000;
    total += kb;
    console.log(`${name.padEnd(9)} box [${box.join(', ')}]  ${kb.toFixed(1)} kB${kb > 58 ? '  <-- TOO BIG' : ''}`);
}
console.log(`hang attach points: ${HANG.map(h => `${h.name} [${f(h.attach[0])}, ${f(h.attach[1])}]`).join('  ')}`);
console.log(`${Object.keys(BOX).length} layers, ${total.toFixed(0)} kB`);
console.log('const BOX = ' + JSON.stringify(BOX).replace(/"/g, "'") + ';');
