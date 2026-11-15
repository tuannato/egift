// Generator for the "lock" wrapper art: what the page wears while a gift waits behind a riddle.
// A precise instrument in eCash's colours: a round plate of brushed titanium with a clean keyhole and
// a thin blue edge light, set in three thin dial rings on a dark glass dial; behind it a faint hex
// lattice fading to the edges, two thin light bands crossing, a few hairline traces to the frame.
// Blues, cyan, white and cool silver on deep navy. Flat and graphic: gradients and hairlines only,
// no filter, no mask, no clip.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/lock.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'lock');
if (!OUT.endsWith('wrappers/lock')) throw new Error('out dir must be public/wrappers/lock');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

const C = {
    night: '#070D1A',
    nightUp: '#0E1D38',
    edge: '#03060D',
    bed: '#081122',
    bedUp: '#112445',
    blue: '#0074C2', // the brand blue
    blueLt: '#2AA5F2',
    cyan: '#7FD4FF',
    ice: '#DDF2FF',
    white: '#FFFFFF',
    silver: '#9DB2CC',
    tiHi: '#F6FAFE',
    tiLt: '#DCE5EF',
    ti: '#B4C2D3',
    tiDp: '#7E8EA5',
    tiSh: '#3D4A60',
    hole: '#050B18',
};

/** The centre of the lock on the canvas. */
const CX = 180, CY = 212;

const f = n => String(Math.round(n * 100) / 100);
const f1 = n => String(Math.round(n * 10) / 10);
const rad = d => (d * Math.PI) / 180;
/** A point at `r` from the centre, `deg` clockwise from the top. */
const at = (r, deg, cx = CX, cy = CY) => [cx + r * Math.sin(rad(deg)), cy - r * Math.cos(rad(deg))];
const poly = a => 'M' + a.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
const seg = (r0, r1, deg) => {
    const [a, b] = at(r0, deg), [c, d] = at(r1, deg);
    return `M${f(a)} ${f(b)}L${f(c)} ${f(d)}`;
};
/** An arc at radius r from a0 to a1 degrees (clockwise from top). */
const arc = (r, a0, a1) => {
    const [x0, y0] = at(r, a0), [x1, y1] = at(r, a1);
    return `M${f(x0)} ${f(y0)}A${f(r)} ${f(r)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
};

let bytes = 0, count = 0;
function svg(name, [x, y, w, h], body, defs = '') {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
    writeFileSync(join(OUT, `${name}.svg`), s);
    bytes += s.length;
    count++;
}

/** Half the width of the two light bands that cross behind the dial. */
const BW = 15;

/* Ground: deep navy, a hex lattice that fades to the edges, two thin light bands crossing, hairline traces, a frame. */
{
    const defs =
        `<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="300"><stop offset="0" stop-color="${C.nightUp}"/><stop offset="0.6" stop-color="${C.night}"/><stop offset="1" stop-color="${C.edge}"/></radialGradient>` +
        // the fade: the ground's own colour laid back over the lattice towards the edges
        `<radialGradient id="v" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="310"><stop offset="0.42" stop-color="${C.night}" stop-opacity="0"/><stop offset="0.8" stop-color="${C.night}" stop-opacity="0.82"/><stop offset="1" stop-color="${C.edge}" stop-opacity="0.96"/></radialGradient>` +
        `<radialGradient id="w" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="215"><stop offset="0" stop-color="${C.blue}" stop-opacity="0.34"/><stop offset="0.65" stop-color="${C.blue}" stop-opacity="0.1"/><stop offset="1" stop-color="${C.blue}" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="a" gradientUnits="userSpaceOnUse" x1="0" y1="-6" x2="0" y2="456"><stop offset="0" stop-color="${C.blueLt}" stop-opacity="0.05"/><stop offset="0.47" stop-color="${C.blueLt}" stop-opacity="0.34"/><stop offset="1" stop-color="${C.blueLt}" stop-opacity="0.05"/></linearGradient>` +
        `<linearGradient id="b" gradientUnits="userSpaceOnUse" x1="-6" y1="0" x2="366" y2="0"><stop offset="0" stop-color="${C.blueLt}" stop-opacity="0.05"/><stop offset="0.5" stop-color="${C.blueLt}" stop-opacity="0.34"/><stop offset="1" stop-color="${C.blueLt}" stop-opacity="0.05"/></linearGradient>`;
    // Hex lattice (pointy-top), each cell drawing three of its edges so no edge is drawn twice.
    const S = 13, HW = (S * Math.sqrt(3)) / 2;
    let hex = '';
    for (let row = -1; row * 1.5 * S < 470; row++) {
        for (let col = -1; col * 2 * HW < 380; col++) {
            const x = -6 + col * 2 * HW + (row % 2 ? HW : 0), y = -6 + row * 1.5 * S;
            hex += `M${f1(x - HW)} ${f1(y + S / 2)}L${f1(x - HW)} ${f1(y - S / 2)}L${f1(x)} ${f1(y - S)}L${f1(x + HW)} ${f1(y - S / 2)}`;
        }
    }
    // A few lit cells, scattered: small solid hexagons, symmetric left and right.
    const cell = (col, row) => {
        const x = -6 + col * 2 * HW + (row % 2 ? HW : 0), y = -6 + row * 1.5 * S, k = 0.78;
        return poly([0, 60, 120, 180, 240, 300].map(a => at(S * k, a, x, y)));
    };
    const lit = [[3, 5], [5, 3], [2, 10], [4, 18], [2, 16], [6, 20], [3, 8], [5, 19]];
    let cells = '';
    for (const [c, r] of lit) cells += cell(c, r) + cell((r % 2 ? 15 : 16) - c, r);
    // Traces: hairlines leaving the dial for the frame, each with one 45-degree turn and a small node.
    const tr = (pts, node) =>
        `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="${C.cyan}" stroke-width="0.7" stroke-opacity="0.36"/>` +
        `<circle cx="${f(node[0])}" cy="${f(node[1])}" r="2" fill="${C.night}" stroke="${C.cyan}" stroke-width="0.8" stroke-opacity="0.6"/>`;
    const side = m => {
        const X = x => CX + m * x;
        return (
            tr([[X(98), CY - 98], [X(128), CY - 128], [X(128), CY - 176]], [X(128), CY - 178.4]) +
            tr([[X(108), CY - 86], [X(146), CY - 124], [X(163), CY - 124]], [X(165.4), CY - 124]) +
            tr([[X(98), CY + 98], [X(128), CY + 128], [X(128), CY + 196]], [X(128), CY + 198.4]) +
            tr([[X(108), CY + 86], [X(146), CY + 124], [X(163), CY + 124]], [X(165.4), CY + 124])
        );
    };
    const hair = d => `<path d="${d}" fill="none" stroke="${C.cyan}" stroke-width="0.7" stroke-opacity="0.55"/>`;
    const body =
        `<rect x="-6" y="-6" width="372" height="462" fill="url(#g)"/>` +
        `<path d="${hex}" fill="none" stroke="${C.blueLt}" stroke-width="0.6" stroke-opacity="0.36"/>` +
        `<path d="${cells}" fill="${C.blueLt}" fill-opacity="0.2"/>` +
        `<rect x="-6" y="-6" width="372" height="462" fill="url(#w)"/>` +
        `<rect x="-6" y="-6" width="372" height="462" fill="url(#v)"/>` +
        // the two bands
        `<rect x="-6" y="${CY - BW}" width="372" height="${2 * BW}" fill="url(#b)"/>` +
        `<rect x="${CX - BW}" y="-6" width="${2 * BW}" height="462" fill="url(#a)"/>` +
        hair(`M-6 ${CY - BW}H366M-6 ${CY + BW}H366M${CX - BW} -6V456M${CX + BW} -6V456`) +
        `<path d="M-6 ${CY}H366M${CX} -6V456" fill="none" stroke="${C.ice}" stroke-width="0.5" stroke-opacity="0.3" stroke-dasharray="1.5 5"/>` +
        side(-1) + side(1) +
        `<g fill="none" stroke="${C.silver}" stroke-width="0.6" stroke-opacity="0.28"><circle cx="${CX}" cy="${CY}" r="152"/></g>` +
        `<rect x="13" y="13" width="334" height="424" rx="14" fill="none" stroke="${C.blueLt}" stroke-opacity="0.5" stroke-width="1"/>` +
        `<rect x="17" y="17" width="326" height="416" rx="10.5" fill="none" stroke="${C.blueLt}" stroke-opacity="0.2" stroke-width="0.6"/>`;
    svg('ground', [-6, -6, 372, 462], body, defs);
}

/* Pulse: one soft bead of light that travels the upright band (idle slides it up and down behind the dial). */
{
    const defs = `<radialGradient id="p" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.ice}" stop-opacity="0.95"/><stop offset="0.35" stop-color="${C.cyan}" stop-opacity="0.5"/><stop offset="1" stop-color="${C.blueLt}" stop-opacity="0"/></radialGradient>`;
    svg('pulse', [CX - BW, CY - 32, 2 * BW, 64], `<ellipse cx="${CX}" cy="${CY}" rx="5" ry="32" fill="url(#p)"/>`, defs);
}

/* Bed: the dark glass dial the rings turn on, its lit rim, the fixed pointer at the top, the light under the plate. */
{
    const R = 136;
    const defs =
        `<radialGradient id="h" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY + 6}" r="${R + 20}"><stop offset="0.82" stop-color="#01030A" stop-opacity="0.7"/><stop offset="1" stop-color="#01030A" stop-opacity="0"/></radialGradient>` +
        `<radialGradient id="d" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY - 30}" r="${R + 40}"><stop offset="0" stop-color="${C.bedUp}"/><stop offset="0.7" stop-color="${C.bed}"/><stop offset="1" stop-color="#050A16"/></radialGradient>` +
        `<linearGradient id="r" gradientUnits="userSpaceOnUse" x1="${CX - R}" y1="${CY - R}" x2="${CX + R}" y2="${CY + R}"><stop offset="0" stop-color="${C.ice}"/><stop offset="0.3" stop-color="${C.blueLt}"/><stop offset="0.62" stop-color="${C.blue}"/><stop offset="0.86" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.blue}"/></linearGradient>` +
        `<radialGradient id="q" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="84"><stop offset="0.74" stop-color="${C.blueLt}" stop-opacity="0.32"/><stop offset="0.86" stop-color="${C.blue}" stop-opacity="0.12"/><stop offset="1" stop-color="${C.blue}" stop-opacity="0"/></radialGradient>`;
    // Four short lugs on the rim, at the diagonals.
    let lugs = '';
    for (const a of [45, 135, 225, 315]) lugs += seg(R - 3.5, R + 5, a);
    const body =
        `<circle cx="${CX}" cy="${CY + 6}" r="${R + 20}" fill="url(#h)"/>` +
        `<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#d)"/>` +
        `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="url(#r)" stroke-width="2"/>` +
        `<circle cx="${CX}" cy="${CY}" r="${R - 4}" fill="none" stroke="${C.silver}" stroke-opacity="0.3" stroke-width="0.6"/>` +
        `<circle cx="${CX}" cy="${CY}" r="${R + 3}" fill="none" stroke="#01030A" stroke-opacity="0.7" stroke-width="1"/>` +
        `<path d="${lugs}" fill="none" stroke="${C.ice}" stroke-width="2.4" stroke-linecap="round"/>` +
        // the pointer: a slim white wedge standing on the rim, pointing in
        `<path d="${poly([at(R + 14, -3.2), at(R + 14, 3.2), at(R - 2.5, 0)])}" fill="${C.white}"/>` +
        `<path d="${seg(R + 17, R + 22, 0)}" fill="none" stroke="${C.cyan}" stroke-width="1.2" stroke-linecap="round"/>` +
        `<circle cx="${CX}" cy="${CY}" r="84" fill="url(#q)"/>`;
    svg('bed', [20, 52, 320, 334], body, defs);
}

/* The three dial rings. Each carries one index mark at its top; closed, they stand at different angles. */
{
    // Outer: fine silver ticks, every fifth longer and white.
    let fine = '', long = '';
    for (let i = 0; i < 120; i++) {
        const a = i * 3;
        if (a < 9 || a > 351) continue;
        if (i % 5 === 0) long += seg(114, 125, a);
        else fine += seg(120, 125, a);
    }
    svg(
        'ring-c',
        [50, 82, 260, 260],
        `<circle cx="${CX}" cy="${CY}" r="127.5" fill="none" stroke="${C.silver}" stroke-width="0.7" stroke-opacity="0.7"/>` +
            `<path d="${fine}" fill="none" stroke="${C.silver}" stroke-width="0.8" stroke-opacity="0.8"/>` +
            `<path d="${long}" fill="none" stroke="${C.tiHi}" stroke-width="1.1"/>` +
            `<path d="${poly([at(126, 0), at(113, -3.4), at(113, 3.4)])}" fill="${C.white}"/>`,
    );

    // Middle: six heavy arcs in the brand blue with gaps, a row of short ticks inside them, a round index.
    let arcs = '', thin = '', ticks = '';
    for (let i = 0; i < 6; i++) {
        arcs += arc(108, i * 60 + 9, i * 60 + 51);
        thin += arc(108, i * 60 + 12, i * 60 + 30);
    }
    for (let i = 0; i < 72; i++) {
        const a = i * 5;
        if (a < 10 || a > 350) continue;
        ticks += seg(98.5, 102.5, a);
    }
    const [mx, my] = at(104, 0);
    svg(
        'ring-b',
        [68, 100, 224, 224],
        `<path d="${arcs}" fill="none" stroke="${C.blue}" stroke-width="3.2" stroke-linecap="round"/>` +
            `<path d="${arcs}" fill="none" stroke="${C.blueLt}" stroke-width="1.6" stroke-linecap="round"/>` +
            `<path d="${thin}" fill="none" stroke="${C.ice}" stroke-width="0.8" stroke-linecap="round"/>` +
            `<path d="${ticks}" fill="none" stroke="${C.silver}" stroke-width="0.8" stroke-opacity="0.75"/>` +
            `<circle cx="${f(mx)}" cy="${f(my)}" r="4.8" fill="${C.bed}"/><circle cx="${f(mx)}" cy="${f(my)}" r="3.2" fill="${C.white}"/>`,
    );

    // Inner: a band of very fine ticks between two hairlines, three short cyan arcs, a wedge index pointing out.
    let micro = '', short = '';
    for (let i = 0; i < 180; i++) {
        const a = i * 2;
        if (a < 8 || a > 352) continue;
        micro += seg(83, i % 5 === 0 ? 88.5 : 86.5, a);
    }
    for (let i = 0; i < 3; i++) short += arc(90.5, i * 120 + 38, i * 120 + 82);
    svg(
        'ring-a',
        [86, 118, 188, 188],
        `<circle cx="${CX}" cy="${CY}" r="85.5" fill="none" stroke="${C.blue}" stroke-width="7.5" stroke-opacity="0.2"/>` +
            `<path d="${micro}" fill="none" stroke="${C.cyan}" stroke-width="0.6" stroke-opacity="0.85"/>` +
            `<circle cx="${CX}" cy="${CY}" r="90.5" fill="none" stroke="${C.silver}" stroke-width="0.7" stroke-opacity="0.8"/>` +
            `<path d="${short}" fill="none" stroke="${C.cyan}" stroke-width="1.8" stroke-linecap="round"/>` +
            `<circle cx="${CX}" cy="${CY}" r="80.5" fill="none" stroke="${C.silver}" stroke-width="0.7" stroke-opacity="0.8"/>` +
            `<path d="${poly([at(93, 0), at(79, -5.4), at(79, 5.4)])}" fill="${C.bed}"/>` +
            `<path d="${poly([at(91.5, 0), at(80, -3.8), at(80, 3.8)])}" fill="${C.white}"/>`,
    );
}

/* Glow: what is behind the plate, a cool round of light with a soft edge and a few fine rays. */
{
    const defs =
        `<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="130"><stop offset="0" stop-color="${C.white}"/><stop offset="0.3" stop-color="${C.ice}"/><stop offset="0.48" stop-color="${C.cyan}" stop-opacity="0.92"/><stop offset="0.6" stop-color="${C.blueLt}" stop-opacity="0.45"/><stop offset="0.8" stop-color="${C.blue}" stop-opacity="0.14"/><stop offset="1" stop-color="${C.blue}" stop-opacity="0"/></radialGradient>`;
    let rays = '';
    for (let i = 0; i < 24; i++) rays += seg(71, i % 2 ? 80 : 94, i * 15);
    svg(
        'glow',
        [50, 82, 260, 260],
        `<circle cx="${CX}" cy="${CY}" r="130" fill="url(#g)"/>` +
            `<path d="${rays}" fill="none" stroke="${C.white}" stroke-width="0.9" stroke-opacity="0.6" stroke-linecap="round"/>` +
            `<circle cx="${CX}" cy="${CY}" r="66" fill="none" stroke="${C.white}" stroke-width="1.2" stroke-opacity="0.9"/>`,
        defs,
    );
}

/* The plate: a round of brushed titanium in two halves, a blue edge light, a collar round the keyhole. */
const PR = 66;
const keyhole = (grow = 0) => {
    // A round head and a body widening downwards, as one outline.
    const r = 10.4 + grow, hy = CY - 9.5, w0 = 5 + grow, w1 = 9.6 + grow, by = CY + 23 + grow;
    const y0 = hy + Math.sqrt(r * r - w0 * w0);
    return `M${f(CX - w0)} ${f(y0)}A${f(r)} ${f(r)} 0 1 1 ${f(CX + w0)} ${f(y0)}L${f(CX + w1)} ${f(by)}H${f(CX - w1)}Z`;
};
{
    const half = side => {
        // side: -1 left, 1 right. Everything is drawn whole, then cut by the half's own box.
        const sweep = side < 0 ? 0 : 1;
        const D = r => `M${CX} ${f(CY - r)}A${f(r)} ${f(r)} 0 0 ${sweep} ${CX} ${f(CY + r)}`;
        const defs =
            `<linearGradient id="m" gradientUnits="userSpaceOnUse" x1="${CX - 50}" y1="${CY - 60}" x2="${CX + 46}" y2="${CY + 62}"><stop offset="0" stop-color="${C.tiHi}"/><stop offset="0.4" stop-color="${C.tiLt}"/><stop offset="0.74" stop-color="${C.ti}"/><stop offset="1" stop-color="${C.tiDp}"/></linearGradient>` +
            `<linearGradient id="e" gradientUnits="userSpaceOnUse" x1="${CX - 46}" y1="${CY - 50}" x2="${CX + 46}" y2="${CY + 50}"><stop offset="0" stop-color="${C.ice}"/><stop offset="0.45" stop-color="${C.blueLt}"/><stop offset="1" stop-color="${C.blue}"/></linearGradient>` +
            `<linearGradient id="c" gradientUnits="userSpaceOnUse" x1="${CX - 28}" y1="${CY - 30}" x2="${CX + 28}" y2="${CY + 32}"><stop offset="0" stop-color="${C.tiDp}"/><stop offset="0.5" stop-color="${C.tiLt}"/><stop offset="1" stop-color="${C.white}"/></linearGradient>`;
        // Brushed: fine half-circles, alternately light and dark.
        let lt = '', dk = '';
        for (let r = 36; r < PR - 7; r += 2.2) {
            if (Math.round(r / 2.2) % 2) lt += D(r);
            else dk += D(r);
        }
        const nx = CX + side * 47;
        const body =
            `<path d="${D(PR)}Z" fill="url(#m)"/>` +
            `<path d="${lt}" fill="none" stroke="${C.white}" stroke-width="0.6" stroke-opacity="0.5"/>` +
            `<path d="${dk}" fill="none" stroke="${C.tiSh}" stroke-width="0.6" stroke-opacity="0.2"/>` +
            // the edge light: a thin blue line just inside the rim
            `<path d="${D(PR - 1)}" fill="none" stroke="url(#e)" stroke-width="2"/>` +
            `<path d="${D(PR - 4.6)}" fill="none" stroke="${C.tiSh}" stroke-width="0.6" stroke-opacity="0.45"/>` +
            // the collar round the keyhole
            `<path d="${D(32.5)}Z" fill="${C.tiSh}" fill-opacity="0.35"/>` +
            `<path d="${D(31)}Z" fill="url(#c)"/>` +
            `<path d="${D(26)}Z" fill="url(#m)"/>` +
            `<path d="${D(26)}" fill="none" stroke="${C.blue}" stroke-width="0.8" stroke-opacity="0.75"/>` +
            // a short blue notch each side
            `<path d="M${nx - 4} ${CY}H${nx + 4}" fill="none" stroke="${C.blue}" stroke-width="1.6" stroke-linecap="round"/>` +
            // the seam, and this half of the keyhole
            `<path d="M${CX} ${CY - PR}V${CY + PR}" fill="none" stroke="${C.tiSh}" stroke-width="1" stroke-opacity="0.75"/>` +
            `<path d="${keyhole(1)}" fill="${C.white}" fill-opacity="0.7" transform="translate(0.8 1)"/>` +
            `<path d="${keyhole()}" fill="${C.hole}"/>`;
        return [body, defs];
    };
    // Each half's box ends at the seam, so the other half's drawing is cut off by the box itself.
    svg('plate-l', [CX - PR, CY - PR, PR, 2 * PR], ...half(-1));
    svg('plate-r', [CX, CY - PR, PR, 2 * PR], ...half(1));
}

/* Keylight: the keyhole filled with blue-white light, and the bloom round it. */
{
    const defs =
        `<radialGradient id="b" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY + 2}" r="44"><stop offset="0" stop-color="${C.blueLt}" stop-opacity="0.8"/><stop offset="0.5" stop-color="${C.blueLt}" stop-opacity="0.28"/><stop offset="1" stop-color="${C.blueLt}" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="k" gradientUnits="userSpaceOnUse" x1="0" y1="${CY - 20}" x2="0" y2="${CY + 24}"><stop offset="0" stop-color="${C.white}"/><stop offset="1" stop-color="${C.cyan}"/></linearGradient>`;
    svg('keylight', [CX - 44, CY - 42, 88, 88], `<circle cx="${CX}" cy="${CY + 2}" r="44" fill="url(#b)"/><path d="${keyhole(0.6)}" fill="url(#k)"/>`, defs);
}

/* Sheen: the soft pool of light lying on the plate (screened on). */
{
    const defs =
        `<radialGradient id="s" gradientUnits="userSpaceOnUse" cx="${CX - 16}" cy="${CY - 20}" r="46"><stop offset="0" stop-color="${C.white}" stop-opacity="0.6"/><stop offset="0.55" stop-color="${C.ice}" stop-opacity="0.2"/><stop offset="1" stop-color="${C.ice}" stop-opacity="0"/></radialGradient>`;
    svg('sheen', [CX - PR, CY - PR, 2 * PR, 2 * PR], `<circle cx="${CX - 16}" cy="${CY - 20}" r="46" fill="url(#s)"/>`, defs);
}

/* A fleck of light, thrown when the plate parts. */
svg('spark', [CX - 4, CY - 4, 8, 8], `<path d="${poly([[CX, CY - 4], [CX + 2.4, CY], [CX, CY + 4], [CX - 2.4, CY]])}" fill="${C.ice}"/>`);

console.log(`lock art written to ${OUT}: ${count} layers, ${bytes} bytes`);
