// Generator for the "diploma" wrapper art, drawn as BANKNOTE / STEEL ENGRAVING.
// Everything is built from fine lines: guilloche rosettes (families of phase-shifted polar
// waves, as a rose engine cuts them), lathe-work borders (woven sine lines), parallel ruling
// whose thickness makes the tone, radial tick rings, laurel leaves shaded by nested contour lines.
// Flat fills are used only for the local colour of a thing (paper, ribbon, the navy plate);
// there is no gradient and no blur anywhere. Navy and gold inks on cream paper, one deep red.
// The sanitiser allows no <use>/<pattern>, so repeats are written out (sine lines as chained
// cubic "s" segments, rosettes as relative polylines, tick rings as dashed circles).
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/diploma.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'diploma');
if (!OUT.endsWith('wrappers/diploma')) throw new Error('out dir must be public/wrappers/diploma');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

const C = {
    navy: '#0E1A38', // the plate
    rule: '#2C427C', // ruling on the plate
    blue: '#6F88C4', // pale blue ink on the plate
    gold: '#CDA954', // gold ink on the plate
    goldLt: '#E8D08E',
    cream: '#F2E8CF', // paper
    creamDk: '#E2D4B0',
    tint: '#DCCB9C', // the underprint on the paper
    ink: '#17254B', // navy ink on paper
    goldInk: '#9A7222', // gold ink on paper
    red: '#8C1C26',
    redDk: '#530B13',
    redLt: '#CF777B',
};

const r1 = v => Math.round(v * 10) / 10;
const n = v => {
    let s = String(r1(v));
    if (s.startsWith('0.')) s = s.slice(1);
    else if (s.startsWith('-0.')) s = '-' + s.slice(2);
    return s === '-0' ? '0' : s;
};
const pt = (x, y) => `${n(x)} ${n(y)}`;
const rad = d => (d * Math.PI) / 180;
const TAU = Math.PI * 2;

/** A polyline as a relative path; deltas are taken between rounded points, so nothing drifts. */
function rel(points, close = false) {
    let px = r1(points[0][0]), py = r1(points[0][1]);
    let d = `M${n(px)} ${n(py)}l`;
    for (let i = 1; i < points.length; i++) {
        const x = r1(points[i][0]), y = r1(points[i][1]);
        if (x === px && y === py) continue;
        d += `${n(x - px)} ${n(y - py)} `;
        px = x; py = y;
    }
    return d.trimEnd() + (close ? 'z' : '');
}
/** One polar curve rho(theta) about a centre. */
function polar(cx, cy, rho, a0 = 0, a1 = TAU, steps = 240) {
    const p = [];
    for (let i = 0; i <= steps; i++) {
        const t = a0 + ((a1 - a0) * i) / steps, r = rho(t);
        p.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
    if (a1 - a0 >= TAU - 1e-9) p.pop();
    return rel(p, a1 - a0 >= TAU - 1e-9);
}
/** A guilloche band: `m` copies of R + A sin(k theta), each a step of phase on. */
function guilloche(cx, cy, R, A, k, m, per = 10, a0 = 0, a1 = TAU, mod = null) {
    let d = '';
    const steps = Math.round((k * per * (a1 - a0)) / TAU);
    for (let j = 0; j < m; j++) {
        const ph = (TAU * j) / m;
        d += polar(cx, cy, t => R + (mod ? mod(t) : 1) * A * Math.sin(k * t + ph), a0, a1, steps);
    }
    return d;
}
/** A sine line as chained cubics: `count` half-waves of length `h`, amplitude `A` (or a function of the half-wave's index). */
function wave(x0, y0, h, A, count, vertical = false) {
    const amp = typeof A === 'function' ? A : () => A;
    const a = 0.4244 * h;
    const q = (u, v) => (vertical ? pt(v, u) : pt(u, v));
    let d = `M${pt(x0, y0)}`;
    let pos = r1(vertical ? y0 : x0);
    const start = vertical ? y0 : x0;
    for (let i = 0; i < count; i++) {
        const b = 1.3333 * amp(i) * (i % 2 ? -1 : 1);
        const next = r1(start + (i + 1) * h), du = next - pos;
        d += `c${q(a, b)} ${q(du - a, b)} ${q(du, 0)}`;
        pos = next;
    }
    return d;
}
const S = (d, stroke, w, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}"${extra}/>`;
const ring = (cx, cy, r, stroke, w, extra = '') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${stroke}" stroke-width="${w}"${extra}/>`;
/** A ring of radial ticks: a dashed circle whose stroke is as wide as the ticks are long. */
const ticks = (cx, cy, r, len, count, thick, stroke, off = 0) => {
    const period = (TAU * r) / count;
    return ring(cx, cy, r, stroke, len, ` stroke-dasharray="${thick} ${Math.round((period - thick) * 1000) / 1000}"${off ? ` stroke-dashoffset="${Math.round(off * period * 1000) / 1000}"` : ''}`);
};

const sizes = {};
/** Everything is drawn 30 units higher than it lies: the canvas runs from -30 to 432 in drawing units (360x462) so the closed plate fills
    the room under the page's labels. One shift carries every layer down; the definition's boxes include it. */
const DY = 30;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y + DY} ${w} ${h}" width="${w}" height="${h}"><g transform="translate(0 ${DY})">${inner}</g></svg>`;
    writeFileSync(join(OUT, `${name}.svg`), s);
    sizes[name] = s.length;
}

/* Geometry (canvas units). */
const PX0 = 30, PX1 = 330, PY0 = 72, PY1 = 352, PH = PY1 - PY0; // the sheet
const FX0 = 40, FX1 = 320, FY0 = PY0 + 10, FY1 = PY1 - 10, FB = 14; // its frame, and the frame's breadth
const E = [180, 190]; // the emblem
const Z = [180, 311]; // the seal
const M = [180, 212]; // where the closed roll lies; the medallion under it
const TILT = 66; // the closed roll, turned clockwise from upright

/** The plate's ruling: horizontal lines whose thickness swells and thins down the plate. Used by the ground and by the cover. */
function ruling(x0, x1, y0, y1) {
    let s = '';
    for (let y = -34.5; y < 440; y += 4.5) {
        if (y < y0 || y > y1) continue;
        const w = 0.42 + 0.85 * Math.pow(0.5 + 0.5 * Math.cos((TAU * (y - 212)) / 108), 1.5);
        s += `<path d="M${n(x0)} ${n(y)}H${n(x1)}" stroke="${C.rule}" stroke-width="${Math.round(w * 100) / 100}"/>`;
    }
    return s;
}

/* Ground: the navy plate, ruled. Above and below where the sheet will lie, the same two bands, mirrored:
   a narrow woven band next to the sheet, then a broad weave of long waves with one continuous gold wave through it. */
{
    let s = `<rect x="-6" y="-36" width="372" height="474" fill="${C.navy}"/>`;
    s += ruling(-6, 366, -36, 438);
    for (const [yc, flip] of [[10, 1], [414, -1]]) {
        let d = '';
        for (let j = 0; j < 4; j++) d += wave(-46 + j * 10, yc, 20, 15 * flip, 22);
        s += `<rect x="-6" y="${yc - 19}" width="372" height="38" fill="${C.navy}"/>`;
        s += S(d, C.blue, 0.5) + S(wave(-16, yc, 15, 6 * flip, 27), C.gold, 0.7) + S(`M-6 ${yc}H366`, C.gold, 0.3);
    }
    for (const [yc, flip] of [[50, 1], [374, -1]]) {
        s += `<rect x="-6" y="${yc - 11}" width="372" height="22" fill="${C.navy}"/>`;
        let d = '';
        for (let j = 0; j < 3; j++) d += wave(-12 + j * 6, yc, 9, 7 * flip, 44);
        s += S(d, C.gold, 0.6);
        s += S(wave(-12, yc, 4.5, 2.2, 88), C.blue, 0.45);
        s += S(`M-6 ${yc - 10}H366M-6 ${yc + 10}H366`, C.gold, 0.9);
        s += S(`M-6 ${yc - 12.4}H366M-6 ${yc + 12.4}H366`, C.gold, 0.35);
    }
    svg('ground', [-6, -36, 372, 474], s);
}

/* Cover: the same ruled plate, cut to the sheet. It lies over the sheet and is drawn aside as the roll passes
   (it holds horizontal lines only, so narrowing it sideways changes nothing but its width). */
svg('cover', [PX0 - 1, PY0 - 1, 302, PH + 2],
    `<rect x="${PX0 - 1}" y="${PY0 - 1}" width="302" height="${PH + 2}" fill="${C.navy}"/>` + ruling(PX0 - 1, PX1 + 1, PY0 - 1, PY1 + 1));

/* Fans: quarter rosettes in the four corners of the closed plate. */
{
    let g = '', b = '', s = '';
    for (const [cx, cy, a0] of [[PX0, PY0, 0], [PX1, PY0, 90], [PX1, PY1, 180], [PX0, PY1, 270]]) {
        const t0 = rad(a0), t1 = rad(a0 + 90);
        g += guilloche(cx, cy, 44, 7, 24, 3, 9, t0, t1);
        b += guilloche(cx, cy, 25, 5, 16, 2, 9, t0, t1);
        const arc = r => `M${pt(cx + r * Math.cos(t0), cy + r * Math.sin(t0))}A${r} ${r} 0 0 1 ${pt(cx + r * Math.cos(t1), cy + r * Math.sin(t1))}`;
        g += arc(54) + arc(34);
        b += arc(57) + arc(16);
        s += `<path d="${arc(11)}" fill="none" stroke="${C.gold}" stroke-width="6" stroke-dasharray=".5 1.23"/>`;
    }
    svg('fans', [PX0 - 1, PY0 - 1, 302, PH + 2],
        `<defs><clipPath id="c"><rect x="${PX0}" y="${PY0}" width="300" height="${PH}"/></clipPath></defs><g clip-path="url(#c)">${S(g, C.gold, 0.55)}${S(b, C.blue, 0.5)}${s}</g>`);
}

/* Medallion: the big rose-engine rosette the closed roll lies across. */
{
    const [cx, cy] = M;
    let s = '';
    s += ring(cx, cy, 139.4, C.gold, 0.5) + ring(cx, cy, 137, C.gold, 1.1);
    s += ticks(cx, cy, 132.5, 5, 180, 0.6, C.blue);
    s += S(guilloche(cx, cy, 117, 11, 36, 4, 8), C.gold, 0.55);
    s += ring(cx, cy, 103, C.gold, 0.9) + ring(cx, cy, 100.6, C.blue, 0.4);
    s += S(guilloche(cx, cy, 78, 20, 14, 9, 14), C.gold, 0.5);
    s += ring(cx, cy, 78, C.blue, 0.4);
    s += ring(cx, cy, 54, C.gold, 0.9);
    s += ticks(cx, cy, 49.6, 5, 96, 0.6, C.gold);
    s += S(guilloche(cx, cy, 28, 16, 9, 6, 14), C.blue, 0.5);
    svg('medal', [cx - 141, cy - 141, 282, 282], s);
}

/* Sheet: cream paper; a wavy underprint; a lathe-work frame with a small rosette in each corner; the printed
   ring the seal will sit in, and a lens of lathe-work on each side of it. */
{
    let s = `<rect x="${PX0}" y="${PY0}" width="300" height="${PH}" fill="${C.cream}"/>`;
    // underprint: fine wavy lines across the field
    let u = '';
    for (let y = FY0 + FB + 5, i = 0; y < FY1 - FB - 2; y += 7.5, i++) u += wave(FX0 + FB + (i % 2 ? 0 : -7), y, 14, 1.5, i % 2 ? 18 : 19);
    s += `<defs><clipPath id="f"><rect x="${FX0 + FB}" y="${FY0 + FB}" width="${FX1 - FX0 - 2 * FB}" height="${FY1 - FY0 - 2 * FB}"/></clipPath></defs>`;
    // fine rays from the emblem across the whole field, long and short by turns
    let far = '';
    for (let i = 0; i < 96; i++) {
        const t = (TAU * (i + 0.5)) / 96, c = Math.cos(t), sn = Math.sin(t), r0 = i % 2 ? 104 : 96;
        far += `M${pt(E[0] + r0 * c, E[1] + r0 * sn)}L${pt(E[0] + 240 * c, E[1] + 240 * sn)}`;
    }
    s += `<g clip-path="url(#f)">${S(u, '#E4D7B2', 0.5)}${S(far, '#CDB677', 0.45)}</g>`;
    // frame: four woven bands
    const xa = FX0 + FB, xb = FX1 - FB, ya = FY0 + FB, yb = FY1 - FB;
    let gold = '', fine = '';
    const hN = 36, hh = (xb - xa) / hN, vN = 33, vh = (yb - ya) / vN;
    for (const yc of [FY0 + FB / 2, FY1 - FB / 2]) {
        gold += wave(xa, yc, hh, 5.2, hN) + wave(xa, yc, hh, -5.2, hN);
        fine += wave(xa, yc, hh / 2, 2.4, hN * 2);
        s += `<path d="M${xa} ${yc}H${xb}" stroke="${C.tint}" stroke-width="${FB - 2}" stroke-dasharray=".45 1.3"/>`;
    }
    for (const xc of [FX0 + FB / 2, FX1 - FB / 2]) {
        gold += wave(xc, ya, vh, 5.2, vN, true) + wave(xc, ya, vh, -5.2, vN, true);
        fine += wave(xc, ya, vh / 2, 2.4, vN * 2, true);
        s += `<path d="M${xc} ${ya}V${yb}" stroke="${C.tint}" stroke-width="${FB - 2}" stroke-dasharray=".45 1.3"/>`;
    }
    s += S(gold, C.goldInk, 0.7) + S(fine, C.ink, 0.45);
    s += `<rect x="${FX0}" y="${FY0}" width="${FX1 - FX0}" height="${FY1 - FY0}" fill="none" stroke="${C.ink}" stroke-width="1.1"/>`;
    s += `<rect x="${FX0 - 3}" y="${FY0 - 3}" width="${FX1 - FX0 + 6}" height="${FY1 - FY0 + 6}" fill="none" stroke="${C.ink}" stroke-width=".4"/>`;
    s += `<rect x="${xa}" y="${ya}" width="${xb - xa}" height="${yb - ya}" fill="none" stroke="${C.ink}" stroke-width=".8"/>`;
    s += `<rect x="${xa + 2.6}" y="${ya + 2.6}" width="${xb - xa - 5.2}" height="${yb - ya - 5.2}" fill="none" stroke="${C.goldInk}" stroke-width=".4"/>`;
    // corners
    let cr = '';
    for (const cx of [FX0 + FB / 2, FX1 - FB / 2]) for (const cy of [FY0 + FB / 2, FY1 - FB / 2]) {
        s += `<rect x="${cx - FB / 2}" y="${cy - FB / 2}" width="${FB}" height="${FB}" fill="${C.cream}" stroke="${C.ink}" stroke-width=".8"/>`;
        cr += guilloche(cx, cy, 3.9, 1.7, 8, 2, 7);
        s += ring(cx, cy, 1.3, C.goldInk, 0.8);
    }
    s += S(cr, C.ink, 0.45);
    // spandrels: quarter fans in the corners of the field, large above, small below
    let fg = '', fi = '';
    for (const [fx, fy, a0, big] of [[xa, ya, 0, 1], [xb, ya, 90, 1]]) {
        const t0 = rad(a0), t1 = rad(a0 + 90), q = big ? 1 : 0.5;
        const arc = r => `M${pt(fx + r * Math.cos(t0), fy + r * Math.sin(t0))}A${r} ${r} 0 0 1 ${pt(fx + r * Math.cos(t1), fy + r * Math.sin(t1))}`;
        s += `<path d="M${fx} ${fy}L${pt(fx + 40 * q * Math.cos(t0), fy + 40 * q * Math.sin(t0))}A${40 * q} ${40 * q} 0 0 1 ${pt(fx + 40 * q * Math.cos(t1), fy + 40 * q * Math.sin(t1))}Z" fill="${C.cream}"/>`;
        fg += guilloche(fx, fy, 30 * q, 5 * q + 1, big ? 24 : 16, 3, 8, t0, t1) + arc(39 * q);
        fi += arc(22 * q) + arc(37 * q);
        if (big) { fi += guilloche(fx, fy, 15, 4, 16, 2, 8, t0, t1); s += `<path d="${arc(6)}" fill="none" stroke="${C.goldInk}" stroke-width="5" stroke-dasharray=".4 .92"/>`; }
    }
    s += `<g clip-path="url(#f)">${S(fg, C.goldInk, 0.5)}${S(fi, C.ink, 0.4)}</g>`;
    // the seal's printed ring
    const [zx, zy] = Z;
    s += `<circle cx="${zx}" cy="${zy}" r="33" fill="${C.cream}"/>`;
    s += ticks(zx, zy, 31.5, 2.4, 96, 0.5, C.goldInk);
    s += S(guilloche(zx, zy, 26.5, 2.6, 30, 3, 7), C.goldInk, 0.5);
    s += ring(zx, zy, 22.6, C.goldInk, 0.6);
    // lenses of lathe-work either side of the seal
    let lens = '';
    for (const x0 of [66, 222]) {
        const N = 18, h = 72 / N, env = i => 8.5 * Math.sin((Math.PI * (i + 0.5)) / N);
        s += `<path d="M${x0 - 4} ${zy}L${x0 + 36} ${zy - 12.5}L${x0 + 76} ${zy}L${x0 + 36} ${zy + 12.5}Z" fill="${C.cream}"/>`;
        lens += wave(x0, zy, h, env, N) + wave(x0, zy, h, i => -env(i), N) + wave(x0, zy, h, i => 0.5 * env(i), N) + wave(x0, zy, h, i => -0.5 * env(i), N);
        lens += `M${x0 - 5} ${zy}h82`;
    }
    s += S(lens, C.ink, 0.5);
    s += `<rect x="${PX0 + 0.3}" y="${PY0 + 0.3}" width="299.4" height="${PH - 0.6}" fill="none" stroke="${C.creamDk}" stroke-width=".6"/>`;
    svg('sheet', [PX0, PY0, 300, PH], s);
}

/* Glory: a gold rosette ring printed round the emblem; it turns as the sheet opens and sways slowly afterwards. */
{
    const [cx, cy] = E;
    let s = S(guilloche(cx, cy, 86.6, 4.6, 24, 4, 8), C.goldInk, 0.45, ' opacity=".75"');
    s += ring(cx, cy, 92.4, C.goldInk, 0.45) + ring(cx, cy, 80.8, C.goldInk, 0.4);
    svg('glory', [cx - 93, cy - 93, 186, 186], `<circle cx="${cx}" cy="${cy}" r="92.6" fill="${C.cream}"/>` + s);
}

/* Rays: the emblem's gold rays, a layer of their own so they can burst out and breathe. Swelling lines (thin wedges). */
{
    const [cx, cy] = E;
    let rays = '';
    for (let i = 0; i < 64; i++) {
        const t = (TAU * i) / 64, c = Math.cos(t), sn = Math.sin(t);
        const r0 = 34, r2 = i % 4 === 0 ? 60 : i % 2 === 0 ? 51 : 43.5, hw = i % 4 === 0 ? 1.35 : i % 2 === 0 ? 0.95 : 0.6;
        rays += `M${pt(cx + r0 * c + hw * sn, cy + r0 * sn - hw * c)}L${pt(cx + r2 * c, cy + r2 * sn)}L${pt(cx + r0 * c - hw * sn, cy + r0 * sn + hw * c)}Z`;
    }
    svg('rays', [cx - 62, cy - 62, 124, 124], `<path d="${rays}" fill="${C.goldInk}"/>`);
}

/* Shine: a band of slanted light lines, swelling to its middle; it is drawn once across the open sheet. */
{
    let s = '';
    const wd = [0.5, 0.9, 1.5, 2.2, 2.9, 2.2, 1.5, 0.9, 0.5];
    for (let i = 0; i < 9; i++) { const x = -32 + i * 5.5; s += `<path d="M${n(x + 14)} ${PY0}L${n(x - 14)} ${PY1}" stroke="#FFF6D2" stroke-width="${wd[i]}"/>`; }
    svg('shine', [-50, PY0, 80, PH], s);
}

/** A laurel leaf from base to tip: [outline, veins, shade]. The shade is one swelling line along the dark edge
    (a crescent); the veins are a midrib and nested contours. */
function leaf(bx, by, dx, dy, L, w, side) {
    const tx = bx + dx * L, ty = by + dy * L, mx = bx + dx * L * 0.48, my = by + dy * L * 0.48;
    const nx = -dy, ny = dx;
    const out = `M${pt(bx, by)}Q${pt(mx + nx * w, my + ny * w)} ${pt(tx, ty)}Q${pt(mx - nx * w, my - ny * w)} ${pt(bx, by)}Z`;
    let v = `M${pt(bx, by)}L${pt(bx + dx * L * 0.86, by + dy * L * 0.86)}`;
    for (const k of [0.26, -0.4, -0.74]) v += `M${pt(bx + dx * L * 0.1, by + dy * L * 0.1)}Q${pt(mx + side * nx * w * k, my + side * ny * w * k)} ${pt(bx + dx * L * 0.93, by + dy * L * 0.93)}`;
    const sh = `M${pt(bx, by)}Q${pt(mx + side * nx * w, my + side * ny * w)} ${pt(tx, ty)}Q${pt(mx + side * nx * w * 0.46, my + side * ny * w * 0.46)} ${pt(bx, by)}Z`;
    return [out, v, sh];
}

/* Emblem: an honour medallion inside two laurel branches: a rose-engine rosette (its rays are the layer below),
   a small star-rosette where the laurel tips meet, a ribbon knot where the stems cross. */
{
    const [cx, cy] = E;
    let s = '';
    // the medallion: rings of lathe-work closing on a small star
    s += `<circle cx="${cx}" cy="${cy}" r="33" fill="${C.cream}" stroke="${C.ink}" stroke-width="1.2"/>`;
    s += ring(cx, cy, 30.8, C.goldInk, 0.55);
    s += S(guilloche(cx, cy, 25, 4.3, 20, 4, 8), C.ink, 0.45);
    s += ring(cx, cy, 19.3, C.ink, 0.75);
    s += ticks(cx, cy, 16.6, 3.4, 72, 0.4, C.goldInk);
    s += ring(cx, cy, 14.1, C.goldInk, 0.45);
    s += S(guilloche(cx, cy, 8.8, 4.6, 8, 4, 12), C.goldInk, 0.5);
    s += `<circle cx="${cx}" cy="${cy}" r="1.7" fill="${C.ink}"/>`;
    // laurel: two branches on a circle, leaves in pairs, smaller toward the tips
    const R = 69;
    let outl = '', veins = '', shade = '', stems = '';
    for (const m of [-1, 1]) {
        const at = a => [cx + m * R * Math.cos(rad(a)), cy + R * Math.sin(rad(a))];
        const p0 = at(99), p1 = at(-74);
        stems += `M${pt(...p0)}A${R} ${R} 0 0 ${m === 1 ? 0 : 1} ${pt(...p1)}`;
        const N = 15;
        for (let i = 0; i < N; i++) {
            const a = 81 - (i * 151) / (N - 1), k = i / (N - 1);
            const L = 17.5 - 7 * k, w = L * 0.3;
            for (const sd of [1, -1]) {
                const aa = a - (sd === 1 ? 0 : 4.5);
                const [bx, byy] = at(aa);
                const T = [m * Math.sin(rad(aa)), -Math.cos(rad(aa))], Nn = [m * Math.cos(rad(aa)), Math.sin(rad(aa))];
                const sp = rad(sd === 1 ? 34 : 38);
                const d = [Math.cos(sp) * T[0] + sd * Math.sin(sp) * Nn[0], Math.cos(sp) * T[1] + sd * Math.sin(sp) * Nn[1]];
                // the shaded edge is the lower one, on every leaf
                const side = -d[0] >= 0 ? 1 : -1;
                const [o, v, sh] = leaf(bx, byy, d[0], d[1], sd === 1 ? L : L * 0.88, w, side);
                outl += o; veins += v; shade += sh;
            }
        }
        const [tx, ty] = at(-74);
        const [o, v, sh] = leaf(tx, ty, m * Math.sin(rad(-77)), -Math.cos(rad(-77)), 10, 3, 1);
        outl += o; veins += v; shade += sh;
    }
    s += S(stems, C.ink, 1.1, ' stroke-linecap="round"');
    s += `<path d="${outl}" fill="${C.cream}" stroke="${C.ink}" stroke-width=".6" stroke-linejoin="round"/>`;
    s += `<path d="${shade}" fill="${C.ink}"/>` + S(veins, C.ink, 0.3);
    // the star-rosette between the tips
    s += `<circle cx="${cx}" cy="${cy - R - 1}" r="6.6" fill="${C.cream}"/>`;
    s += S(guilloche(cx, cy - R - 1, 4, 2.2, 8, 2, 10), C.goldInk, 0.5) + `<circle cx="${cx}" cy="${cy - R - 1}" r="1" fill="${C.ink}"/>`;
    // the ribbon knot where the stems cross: two small loops, two tails
    {
        const ky = cy + R + 0.5;
        let k = '', h = '';
        for (const m of [-1, 1]) {
            const X = x => cx + m * x;
            k += `M${pt(X(1), ky + 1.5)}L${pt(X(7.4), ky + 11)}L${pt(X(4.4), ky + 9.8)}L${pt(X(3), ky + 12.6)}L${pt(X(-0.6), ky + 2)}Z`;
            k += `M${pt(X(1.4), ky)}C${pt(X(8), ky - 7)} ${pt(X(13.5), ky - 2)} ${pt(X(10.5), ky + 2.6)}C${pt(X(8), ky + 5.4)} ${pt(X(4), ky + 2.4)} ${pt(X(1.4), ky)}Z`;
            h += `M${pt(X(3.4), ky - 0.6)}Q${pt(X(7.6), ky - 3.4)} ${pt(X(9.8), ky - 0.4)}M${pt(X(2), ky + 4.4)}L${pt(X(4.6), ky + 9)}`;
        }
        s += `<path d="${k}" fill="${C.red}" stroke="${C.redDk}" stroke-width=".5" stroke-linejoin="round"/>` + S(h, C.redDk, 0.4);
        s += `<rect x="${cx - 2.3}" y="${ky - 2.5}" width="4.6" height="5.2" rx="1.2" fill="${C.red}" stroke="${C.redDk}" stroke-width=".5"/>`;
    }
    svg('emblem', [cx - 90, cy - 88, 180, 176], s);
}

/* Roll: the diploma rolled up, drawn upright (the definition lays it over at first). Its roundness is only
   ruling: lines along the roll that crowd toward the edges, heavier on the shaded side. */
{
    const W = 46, x0 = PX0 - W / 2, y0 = PY0 - 3, H = PH + 6, cx = x0 + W / 2;
    const top = y0 + 6, bot = y0 + H - 2;
    // its cast shadow on the plate: parallel lines of one length, each thinner than the last, cut on one slant
    let s = '';
    for (let i = 0; i < 7; i++) s += `<path d="M${n(x0 + W - 0.4 + i * 1.75)} ${n(top + 7 + i * 1.5)}V${n(bot - 3 - i * 1.5)}" stroke="#050A1B" stroke-width="${Math.round((1.5 - i * 0.2) * 100) / 100}"/>`;
    s += `<path d="M${x0} ${top}V${bot - 5}A${W / 2} 5 0 0 0 ${x0 + W} ${bot - 5}V${top}Z" fill="${C.cream}"/>`;
    for (let a = -78; a <= 78; a += 6.5) {
        const x = cx + (W / 2) * Math.sin(rad(a));
        const k = Math.abs(a) / 78, wd = (a > 0 ? 0.28 + 0.75 * k * k : 0.22 + 0.4 * k * k);
        const dy = 5 * Math.cos(rad(a));
        s += `<path d="M${n(x)} ${n(top + dy * 0.9)}V${n(bot - 5 + dy)}" stroke="${C.ink}" stroke-width="${Math.round(wd * 100) / 100}"/>`;
    }
    // the lap of the paper's outer edge
    s += S(`M${cx + 7.2} ${top + 4.6}V${bot - 0.4}`, C.ink, 1) + S(`M${cx + 8.6} ${top + 4.4}V${bot - 0.6}`, C.cream, 0.9);
    s += `<path d="M${x0} ${top}V${bot - 5}A${W / 2} 5 0 0 0 ${x0 + W} ${bot - 5}V${top}" fill="none" stroke="${C.ink}" stroke-width=".9"/>`;
    // the open end: the rolled sheet seen end-on, a spiral
    s += `<ellipse cx="${cx}" cy="${top}" rx="${W / 2}" ry="5" fill="${C.cream}" stroke="${C.ink}" stroke-width=".9"/>`;
    const sp = [];
    for (let i = 0; i <= 150; i++) {
        const t = (i / 150) * TAU * 3.6, r = 1 - (i / 150) * 0.86;
        sp.push([cx + 7.2 + (W / 2) * r * Math.cos(t) - 7.2 * r, top + 5 * r * Math.sin(t)]);
    }
    s += S(rel(sp), C.ink, 0.45);
    svg('roll', [x0 - 1, y0, W + 14, H + 1], s);
}

/* Curl: what is left of the roll when the sheet lies open: its right edge still curled, the spiral of the end seen from above. */
{
    const cx = 326, hw = 8, top = PY0 - 1, bot = PY1 + 3;
    let s = '';
    for (let i = 0; i < 4; i++) s += `<path d="M${n(cx + hw + 0.4 + i * 1.5)} ${n(top + 5 + i * 1.5)}V${n(bot - 3 - i * 1.5)}" stroke="#050A1B" stroke-width="${1.1 - i * 0.25}"/>`;
    // the paper rising into the curl: lines that swell toward it
    for (const [dx, wd] of [[-12.5, 0.2], [-10.8, 0.3], [-9.4, 0.45]]) s += `<path d="M${cx + dx} ${PY0 + 1}V${PY1 - 1}" stroke="${C.ink}" stroke-width="${wd}" opacity=".7"/>`;
    s += `<path d="M${cx - hw} ${top}V${bot - 3.2}A${hw} 3.2 0 0 0 ${cx + hw} ${bot - 3.2}V${top}Z" fill="${C.cream}" stroke="${C.ink}" stroke-width=".8"/>`;
    for (let a = -66; a <= 72; a += 23) {
        const x = cx + hw * Math.sin(rad(a)), k = (a + 66) / 138;
        s += `<path d="M${n(x)} ${n(top + 3.4 * Math.cos(rad(a)))}V${n(bot - 3.2 + 3.2 * Math.cos(rad(a)))}" stroke="${C.ink}" stroke-width="${Math.round((0.2 + 0.75 * k * k) * 100) / 100}"/>`;
    }
    // the end: an open spiral, its outer turn running out into the sheet
    s += `<ellipse cx="${cx}" cy="${top}" rx="${hw}" ry="4.4" fill="${C.cream}" stroke="${C.ink}" stroke-width=".9"/>`;
    const sp = [];
    for (let i = 0; i <= 90; i++) {
        const u = i / 90, t = Math.PI + u * TAU * 2.3, r = 1 - u * 0.8;
        sp.push([cx + hw * r * Math.cos(t), top + 4.4 * r * Math.sin(t)]);
    }
    s += S(rel(sp), C.ink, 0.7, ' stroke-linecap="round"');
    svg('curl', [cx - 22, top - 6, 38, bot - top + 8], s);
}

/* Band: the red ribbon round the roll, a gold line near each edge. Drawn as it lies on the closed roll. */
{
    const [cx, cy] = M, hw = 23.5, hb = 8.5, sag = 4.4;
    const edge = (y, in0 = 0) => `M${n(cx - hw + in0)} ${n(y)}Q${cx} ${n(y + sag * 2)} ${n(cx + hw - in0)} ${n(y)}`;
    let s = `<path d="M${cx - hw} ${cy - hb}Q${cx} ${cy - hb + sag * 2} ${cx + hw} ${cy - hb}V${cy + hb}Q${cx} ${cy + hb + sag * 2} ${cx - hw} ${cy + hb}Z" fill="${C.red}" stroke="${C.redDk}" stroke-width=".7" stroke-linejoin="round"/>`;
    let hatch = '';
    for (let a = -76; a <= 76; a += 8) {
        const x = cx + hw * Math.sin(rad(a)), dy = sag * Math.cos(rad(a)) * 0.98;
        hatch += `M${n(x)} ${n(cy - hb + dy + 3.4)}V${n(cy + hb + dy - 3.4)}`;
    }
    s += S(hatch, C.redDk, 0.5);
    s += S(edge(cy - hb + 2.1, 0.5) + edge(cy + hb - 2.1, 0.5), C.gold, 0.8);
    svg('band', [cx - 32, cy - 32, 64, 64], `<g transform="rotate(${TILT} ${cx} ${cy})">${s}</g>`);
}

/* Rosette: a pleated ribbon cockade with two tails. It ties the roll, and comes back as the seal. */
{
    const [cx, cy] = Z;
    let s = '';
    // tails
    for (const m of [-1, 1]) {
        const X = x => cx + m * x;
        s += `<path d="M${pt(X(1), cy + 4)}L${pt(X(13), cy + 6)}L${pt(X(26.5), cy + 51)}L${pt(X(18.8), cy + 46.4)}L${pt(X(13.8), cy + 53.5)}Z" fill="${C.red}" stroke="${C.redDk}" stroke-width=".6" stroke-linejoin="round"/>`;
        let h = '';
        for (const [u, e] of [[0.24, 0.9], [0.5, 0.82], [0.76, 0.9]]) h += `M${pt(X(1 + 12 * u), cy + 12)}L${pt(X(13.8 + 12.7 * u), cy + 4 + 47 * e)}`;
        s += S(h, C.redDk, 0.45);
        s += S(`M${pt(X(12.2), cy + 12)}L${pt(X(24.6), cy + 48.2)}`, C.gold, 0.6);
    }
    // the cockade: a scalloped round, pleated by two rings of radial lines
    s += `<path d="${polar(cx, cy, t => 24 + 1.3 * Math.cos(22 * t), 0, TAU, 176)}" fill="${C.red}" stroke="${C.redDk}" stroke-width=".7"/>`;
    s += ticks(cx, cy, 17.5, 11, 22, 0.7, C.redDk, 0.5);
    s += ticks(cx, cy, 19.5, 6, 22, 0.5, C.redLt, 0);
    s += ticks(cx, cy, 16, 9, 66, 0.28, C.redDk, 0.25);
    s += `<path d="${polar(cx, cy, t => 11.4 + 0.8 * Math.cos(14 * t), 0, TAU, 112)}" fill="${C.red}" stroke="${C.redDk}" stroke-width=".6"/>`;
    s += ticks(cx, cy, 8.4, 4.6, 28, 0.4, C.redDk);
    s += ring(cx, cy, 11.6, C.gold, 0.5);
    // the button: engraved gold
    s += `<circle cx="${cx}" cy="${cy}" r="5.6" fill="${C.cream}" stroke="${C.goldInk}" stroke-width=".8"/>`;
    s += S(guilloche(cx, cy, 3.3, 1.1, 6, 2, 8), C.goldInk, 0.4) + `<circle cx="${cx}" cy="${cy}" r=".9" fill="${C.goldInk}"/>`;
    svg('rosette', [cx - 34, cy - 28, 68, 84], s);
}

/* Leaves: two engraved gold laurel leaves, thrown and falling when the seal lands. */
{
    const mk = (name, box, bx, by, a, L) => {
        const [o, v] = leaf(bx, by, Math.cos(rad(a)), Math.sin(rad(a)), L, L * 0.3, 1);
        svg(name, box, `<path d="${o}" fill="${C.goldLt}" stroke="${C.goldInk}" stroke-width=".7" stroke-linejoin="round"/>` + S(v, C.goldInk, 0.4));
    };
    mk('leaf-a', [170, 136, 20, 12], 171.5, 145.5, -22, 18);
    mk('leaf-b', [172, 130, 16, 18], 175, 146, -62, 15.5);
}

let total = 0;
for (const [k, v] of Object.entries(sizes)) { total += v; console.log(k.padEnd(10), (v / 1024).toFixed(1) + ' kB'); }
console.log('diploma art written to', OUT, (total / 1024).toFixed(1) + ' kB');
