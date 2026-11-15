// Generator for the "lock" wrapper art: what the page wears while a gift waits behind a riddle.
// A round brass lock plate with a keyhole, set in three thin dial rings on a dark dial, where the
// two bands of a wine ribbon cross over an ink-blue ground engraved with guilloche. Flat and
// graphic: gradients and hairlines only, no filter, no mask, no clip.
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
    ink: '#0D121E',
    inkUp: '#1A2337',
    bed: '#111727',
    bedUp: '#1D2740',
    line: '#C9A862', // engraving on the ground
    brassHi: '#F6E7BC',
    brassLt: '#E6CB8C',
    brass: '#C89F52',
    brassDp: '#93702F',
    brassSh: '#5C441D',
    wine: '#5E1B28',
    wineLt: '#7C2A38',
    wineDp: '#3C0F18',
    hole: '#120F14',
    light: '#FFF4D6',
    amber: '#FFC661',
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

/* Ground: ink blue, a warm pool behind the lock, guilloche engraved out to the corners, a hairline frame. */
{
    const defs =
        `<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="300"><stop offset="0" stop-color="${C.inkUp}"/><stop offset="0.62" stop-color="${C.ink}"/><stop offset="1" stop-color="#080B13"/></radialGradient>` +
        `<radialGradient id="w" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="235"><stop offset="0" stop-color="${C.amber}" stop-opacity="0.2"/><stop offset="0.6" stop-color="${C.amber}" stop-opacity="0.06"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient>` +
        `<radialGradient id="v" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="320"><stop offset="0.55" stop-color="#05070C" stop-opacity="0"/><stop offset="1" stop-color="#05070C" stop-opacity="0.5"/></radialGradient>`;
    /** One guilloche band: `n` waves of `k` lobes woven around radius R. */
    const band = (R, a, k, n, pts) => {
        let d = '';
        for (let j = 0; j < n; j++) {
            const ph = (j / n) * 2 * Math.PI;
            const p = [];
            for (let i = 0; i < pts; i++) {
                const t = (i / pts) * 2 * Math.PI, r = R + a * Math.sin(k * t + ph);
                p.push(`${f1(CX + r * Math.cos(t))} ${f1(CY + r * Math.sin(t))}`);
            }
            d += 'M' + p.join('L') + 'Z';
        }
        return d;
    };
    let rosette = '';
    for (let i = 0; i < 18; i++) rosette += `<ellipse cx="${CX}" cy="${CY}" rx="318" ry="150" transform="rotate(${i * 10} ${CX} ${CY})"/>`;
    const body =
        `<rect x="-6" y="-6" width="372" height="462" fill="url(#g)"/>` +
        `<g fill="none" stroke="${C.line}" stroke-width="0.5" stroke-opacity="0.17">${rosette}</g>` +
        `<path d="${band(170, 15, 16, 4, 224)}" fill="none" stroke="${C.line}" stroke-width="0.6" stroke-opacity="0.4"/>` +
        `<path d="${band(222, 20, 20, 4, 280)}" fill="none" stroke="${C.line}" stroke-width="0.6" stroke-opacity="0.32"/>` +
        `<g fill="none" stroke="${C.line}" stroke-opacity="0.34" stroke-width="0.7"><circle cx="${CX}" cy="${CY}" r="150"/><circle cx="${CX}" cy="${CY}" r="190"/><circle cx="${CX}" cy="${CY}" r="198"/><circle cx="${CX}" cy="${CY}" r="246"/></g>` +
        `<rect x="-6" y="-6" width="372" height="462" fill="url(#w)"/>` +
        `<rect x="-6" y="-6" width="372" height="462" fill="url(#v)"/>` +
        `<rect x="13" y="13" width="334" height="424" rx="10" fill="none" stroke="${C.brass}" stroke-opacity="0.5" stroke-width="1"/>` +
        `<rect x="17" y="17" width="326" height="416" rx="7" fill="none" stroke="${C.brass}" stroke-opacity="0.22" stroke-width="0.6"/>`;
    svg('ground', [-6, -6, 372, 462], body, defs);
}

/* Ribbon: two satin bands in wine crossing behind the lock, a gold hairline near each edge. */
{
    const W = 44;
    const defs =
        `<linearGradient id="a" gradientUnits="userSpaceOnUse" x1="${CX - W / 2}" y1="0" x2="${CX + W / 2}" y2="0"><stop offset="0" stop-color="${C.wineDp}"/><stop offset="0.22" stop-color="${C.wine}"/><stop offset="0.5" stop-color="${C.wineLt}"/><stop offset="0.8" stop-color="${C.wine}"/><stop offset="1" stop-color="${C.wineDp}"/></linearGradient>` +
        `<linearGradient id="b" gradientUnits="userSpaceOnUse" x1="0" y1="${CY - W / 2}" x2="0" y2="${CY + W / 2}"><stop offset="0" stop-color="${C.wineDp}"/><stop offset="0.2" stop-color="${C.wine}"/><stop offset="0.45" stop-color="${C.wineLt}"/><stop offset="0.8" stop-color="${C.wine}"/><stop offset="1" stop-color="${C.wineDp}"/></linearGradient>` +
        `<linearGradient id="s" gradientUnits="userSpaceOnUse" x1="${CX - W / 2 - 7}" y1="0" x2="${CX + W / 2 + 7}" y2="0"><stop offset="0" stop-color="#04060A" stop-opacity="0"/><stop offset="0.14" stop-color="#04060A" stop-opacity="0.5"/><stop offset="0.86" stop-color="#04060A" stop-opacity="0.5"/><stop offset="1" stop-color="#04060A" stop-opacity="0"/></linearGradient>`;
    const hair = (d, o = 0.75) => `<path d="${d}" fill="none" stroke="${C.brassLt}" stroke-width="0.7" stroke-opacity="${o}"/>`;
    const body =
        // the horizontal band, lying under
        `<rect x="-6" y="${CY - W / 2}" width="372" height="${W}" fill="url(#b)"/>` +
        hair(`M-6 ${CY - W / 2 + 4}H366M-6 ${CY + W / 2 - 4}H366`, 0.6) +
        // the vertical band over it, with its shadow on the one below
        `<rect x="${CX - W / 2 - 7}" y="${CY - W / 2}" width="${W + 14}" height="${W}" fill="url(#s)"/>` +
        `<rect x="${CX - W / 2}" y="-6" width="${W}" height="462" fill="url(#a)"/>` +
        hair(`M${CX - W / 2 + 4} -6V456M${CX + W / 2 - 4} -6V456`);
    svg('ribbon', [-6, -6, 372, 462], body, defs);
}

/* Bed: the dark dial the rings turn on, its brass rim, the fixed pointer at the top, the plate's shadow. */
{
    const R = 136;
    const defs =
        `<radialGradient id="h" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY + 8}" r="${R + 22}"><stop offset="0.8" stop-color="#03050A" stop-opacity="0.62"/><stop offset="1" stop-color="#03050A" stop-opacity="0"/></radialGradient>` +
        `<radialGradient id="d" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY - 30}" r="${R + 40}"><stop offset="0" stop-color="${C.bedUp}"/><stop offset="0.75" stop-color="${C.bed}"/><stop offset="1" stop-color="#0A0E18"/></radialGradient>` +
        `<linearGradient id="r" gradientUnits="userSpaceOnUse" x1="${CX - R}" y1="${CY - R}" x2="${CX + R}" y2="${CY + R}"><stop offset="0" stop-color="${C.brassHi}"/><stop offset="0.35" stop-color="${C.brass}"/><stop offset="0.6" stop-color="${C.brassDp}"/><stop offset="0.85" stop-color="${C.brassLt}"/><stop offset="1" stop-color="${C.brassDp}"/></linearGradient>` +
        `<radialGradient id="p" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY - 4}" r="100"><stop offset="0" stop-color="${C.amber}" stop-opacity="0.34"/><stop offset="0.7" stop-color="${C.amber}" stop-opacity="0.1"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient>` +
        `<radialGradient id="q" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY + 5}" r="80"><stop offset="0.72" stop-color="#03050A" stop-opacity="0.75"/><stop offset="1" stop-color="#03050A" stop-opacity="0"/></radialGradient>`;
    // Four small studs on the rim, at the diagonals.
    let studs = '';
    for (const a of [45, 135, 225, 315]) {
        const [x, y] = at(R, a);
        studs += `<circle cx="${f(x)}" cy="${f(y)}" r="3.4" fill="${C.brassDp}"/><circle cx="${f(x - 0.6)}" cy="${f(y - 0.7)}" r="2.2" fill="${C.brassHi}"/>`;
    }
    const body =
        `<circle cx="${CX}" cy="${CY + 8}" r="${R + 22}" fill="url(#h)"/>` +
        `<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#d)"/>` +
        `<circle cx="${CX}" cy="${CY - 4}" r="100" fill="url(#p)"/>` +
        `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="url(#r)" stroke-width="3"/>` +
        `<circle cx="${CX}" cy="${CY}" r="${R - 4.5}" fill="none" stroke="${C.brass}" stroke-opacity="0.45" stroke-width="0.6"/>` +
        `<circle cx="${CX}" cy="${CY}" r="${R + 3.5}" fill="none" stroke="#05070C" stroke-opacity="0.6" stroke-width="1"/>` +
        studs +
        // the pointer: a small brass wedge standing on the rim, pointing in
        `<path d="${poly([at(R + 13, -4.2), at(R + 13, 4.2), at(R - 3, 0)])}" fill="${C.brassDp}"/>` +
        `<path d="${poly([at(R + 13, -4.2), at(R + 13, 0), at(R - 3, 0)])}" fill="${C.brassHi}"/>` +
        `<circle cx="${CX}" cy="${CY + 5}" r="80" fill="url(#q)"/>`;
    svg('bed', [20, 52, 320, 334], body, defs);
}

/* The three dial rings. Each carries one index mark at its top; closed, they stand at different angles. */
{
    // Outer: fine ticks, every fifth longer.
    let fine = '', long = '';
    for (let i = 0; i < 120; i++) {
        const a = i * 3;
        if (a < 9 || a > 351) continue;
        if (i % 5 === 0) long += seg(113.5, 125, a);
        else fine += seg(119, 125, a);
    }
    svg(
        'ring-c',
        [50, 82, 260, 260],
        `<circle cx="${CX}" cy="${CY}" r="127.5" fill="none" stroke="${C.brass}" stroke-width="0.8" stroke-opacity="0.8"/>` +
            `<path d="${fine}" fill="none" stroke="${C.brass}" stroke-width="0.8" stroke-opacity="0.8"/>` +
            `<path d="${long}" fill="none" stroke="${C.brassLt}" stroke-width="1.2"/>` +
            `<path d="${poly([at(126, 0), at(113, -3.6), at(113, 3.6)])}" fill="${C.brassHi}"/>`,
    );

    // Middle: six heavy arcs with gaps, a row of short ticks inside them, a round index.
    let arcs = '', ticks = '';
    for (let i = 0; i < 6; i++) arcs += arc(108, i * 60 + 9, i * 60 + 51);
    for (let i = 0; i < 72; i++) {
        const a = i * 5;
        if (a < 10 || a > 350) continue;
        ticks += seg(98, 102.5, a);
    }
    const [mx, my] = at(104, 0);
    svg(
        'ring-b',
        [68, 100, 224, 224],
        `<path d="${arcs}" fill="none" stroke="${C.brassLt}" stroke-width="2.6" stroke-linecap="round"/>` +
            `<path d="${ticks}" fill="none" stroke="${C.brass}" stroke-width="0.8" stroke-opacity="0.85"/>` +
            `<circle cx="${CX}" cy="${CY}" r="96" fill="none" stroke="${C.brass}" stroke-width="0.6" stroke-opacity="0.6"/>` +
            `<circle cx="${f(mx)}" cy="${f(my)}" r="4.6" fill="${C.brassDp}"/><circle cx="${f(mx)}" cy="${f(my)}" r="3.3" fill="${C.brassHi}"/>`,
    );

    // Inner: a knurled band between two hairlines, a wedge index pointing out.
    const saw = [];
    for (let i = 0; i < 144; i++) {
        const [x, y] = at(i % 2 ? 88 : 82.5, i * 2.5);
        saw.push(`${f(x)} ${f(y)}`);
    }
    svg(
        'ring-a',
        [86, 118, 188, 188],
        `<circle cx="${CX}" cy="${CY}" r="85.2" fill="none" stroke="${C.brassDp}" stroke-width="7" stroke-opacity="0.32"/>` +
            `<path d="M${saw.join('L')}Z" fill="none" stroke="${C.brassLt}" stroke-width="0.8" stroke-linejoin="round"/>` +
            `<circle cx="${CX}" cy="${CY}" r="90.5" fill="none" stroke="${C.brassHi}" stroke-width="1.1"/>` +
            `<circle cx="${CX}" cy="${CY}" r="80" fill="none" stroke="${C.brassLt}" stroke-width="0.9"/>` +
            `<path d="${poly([at(92, 0), at(79, -5.2), at(79, 5.2)])}" fill="${C.bed}"/>` +
            `<path d="${poly([at(91, 0), at(80, -3.8), at(80, 3.8)])}" fill="${C.brassHi}"/>`,
    );
}

/* Glow: what is behind the plate, a warm round of light with a soft edge and fine rays. */
{
    const defs =
        `<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="130"><stop offset="0" stop-color="#FFFBEC"/><stop offset="0.3" stop-color="${C.light}"/><stop offset="0.5" stop-color="${C.amber}" stop-opacity="0.9"/><stop offset="0.62" stop-color="#F0A23A" stop-opacity="0.42"/><stop offset="1" stop-color="#F0A23A" stop-opacity="0"/></radialGradient>`;
    let rays = '';
    for (let i = 0; i < 48; i++) rays += seg(70, i % 2 ? 96 : 112, i * 7.5);
    svg(
        'glow',
        [50, 82, 260, 260],
        `<circle cx="${CX}" cy="${CY}" r="130" fill="url(#g)"/>` +
            `<path d="${rays}" fill="none" stroke="${C.light}" stroke-width="0.9" stroke-opacity="0.5" stroke-linecap="round"/>` +
            `<circle cx="${CX}" cy="${CY}" r="66" fill="none" stroke="${C.brassHi}" stroke-width="1.2" stroke-opacity="0.9"/>`,
        defs,
    );
}

/* The plate: a round of brushed brass in two halves, a raised collar round the keyhole, a rivet each side. */
const PR = 66;
const keyhole = (grow = 0) => {
    // A round head and a body widening downwards, as one outline.
    const r = 10.4 + grow, hy = CY - 9.5, w0 = 5 + grow, w1 = 9.6 + grow, by = CY + 23 + grow;
    const y0 = hy + Math.sqrt(r * r - w0 * w0);
    return `M${f(CX - w0)} ${f(y0)}A${f(r)} ${f(r)} 0 1 1 ${f(CX + w0)} ${f(y0)}L${f(CX + w1)} ${f(by)}H${f(CX - w1)}Z`;
};
{
    const half = side => {
        // side: -1 left, 1 right. Everything is drawn whole, then cut by the half's own outline.
        const sweep = side < 0 ? 0 : 1;
        const D = r => `M${CX} ${f(CY - r)}A${f(r)} ${f(r)} 0 0 ${sweep} ${CX} ${f(CY + r)}`;
        const defs =
            `<linearGradient id="m" gradientUnits="userSpaceOnUse" x1="${CX - 50}" y1="${CY - 60}" x2="${CX + 46}" y2="${CY + 62}"><stop offset="0" stop-color="${C.brassHi}"/><stop offset="0.38" stop-color="${C.brassLt}"/><stop offset="0.7" stop-color="${C.brass}"/><stop offset="1" stop-color="${C.brassDp}"/></linearGradient>` +
            `<linearGradient id="e" gradientUnits="userSpaceOnUse" x1="${CX - 46}" y1="${CY - 50}" x2="${CX + 46}" y2="${CY + 50}"><stop offset="0" stop-color="#FFFCEB"/><stop offset="0.5" stop-color="${C.brassLt}"/><stop offset="1" stop-color="${C.brassSh}"/></linearGradient>` +
            `<linearGradient id="c" gradientUnits="userSpaceOnUse" x1="${CX - 28}" y1="${CY - 30}" x2="${CX + 28}" y2="${CY + 32}"><stop offset="0" stop-color="${C.brassDp}"/><stop offset="0.5" stop-color="${C.brassLt}"/><stop offset="1" stop-color="${C.brassHi}"/></linearGradient>`;
        // Brushed: fine half-circles, alternately light and dark.
        let lt = '', dk = '';
        for (let r = 36; r < PR - 6; r += 2.2) {
            if (Math.round(r / 2.2) % 2) lt += D(r);
            else dk += D(r);
        }
        const rx = CX + side * 47;
        const body =
            `<path d="${D(PR)}Z" fill="url(#m)"/>` +
            `<path d="${lt}" fill="none" stroke="#FFF8E0" stroke-width="0.6" stroke-opacity="0.34"/>` +
            `<path d="${dk}" fill="none" stroke="${C.brassSh}" stroke-width="0.6" stroke-opacity="0.26"/>` +
            // the bevelled edge
            `<path d="${D(PR - 1.6)}" fill="none" stroke="url(#e)" stroke-width="3.2"/>` +
            `<path d="${D(PR - 5.4)}" fill="none" stroke="${C.brassSh}" stroke-width="0.7" stroke-opacity="0.55"/>` +
            // the collar round the keyhole
            `<path d="${D(32.5)}Z" fill="${C.brassSh}" fill-opacity="0.45"/>` +
            `<path d="${D(31)}Z" fill="url(#c)"/>` +
            `<path d="${D(26)}Z" fill="url(#m)"/>` +
            `<path d="${D(26)}" fill="none" stroke="${C.brassSh}" stroke-width="0.6" stroke-opacity="0.5"/>` +
            // the rivet
            `<circle cx="${rx}" cy="${CY + 0.8}" r="4" fill="${C.brassSh}" fill-opacity="0.55"/><circle cx="${rx}" cy="${CY}" r="3.4" fill="${C.brassDp}"/><circle cx="${f(rx - 0.8)}" cy="${f(CY - 0.9)}" r="2.2" fill="${C.brassHi}"/>` +
            // the seam, and this half of the keyhole
            `<path d="M${CX} ${CY - PR}V${CY + PR}" fill="none" stroke="${C.brassSh}" stroke-width="1" stroke-opacity="0.7"/>` +
            `<path d="${keyhole(1)}" fill="${C.brassHi}" fill-opacity="0.55" transform="translate(0.8 1)"/>` +
            `<path d="${keyhole()}" fill="${C.hole}"/>`;
        return [body, defs];
    };
    // Each half's box ends at the seam, so the other half's drawing is cut off by the box itself.
    svg('plate-l', [CX - PR, CY - PR, PR, 2 * PR], ...half(-1));
    svg('plate-r', [CX, CY - PR, PR, 2 * PR], ...half(1));
}

/* Keylight: the keyhole filled with light, and the bloom round it. */
{
    const defs =
        `<radialGradient id="b" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY + 2}" r="44"><stop offset="0" stop-color="${C.amber}" stop-opacity="0.85"/><stop offset="0.5" stop-color="${C.amber}" stop-opacity="0.3"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="k" gradientUnits="userSpaceOnUse" x1="0" y1="${CY - 20}" x2="0" y2="${CY + 24}"><stop offset="0" stop-color="#FFFDF2"/><stop offset="1" stop-color="${C.amber}"/></linearGradient>`;
    svg('keylight', [CX - 44, CY - 42, 88, 88], `<circle cx="${CX}" cy="${CY + 2}" r="44" fill="url(#b)"/><path d="${keyhole(0.6)}" fill="url(#k)"/>`, defs);
}

/* Sheen: the soft pool of light lying on the plate (screened on). */
{
    const defs =
        `<radialGradient id="s" gradientUnits="userSpaceOnUse" cx="${CX - 16}" cy="${CY - 20}" r="46"><stop offset="0" stop-color="#FFF6DA" stop-opacity="0.6"/><stop offset="0.55" stop-color="#FFE9B0" stop-opacity="0.2"/><stop offset="1" stop-color="#FFE9B0" stop-opacity="0"/></radialGradient>`;
    svg('sheen', [CX - PR, CY - PR, 2 * PR, 2 * PR], `<circle cx="${CX - 16}" cy="${CY - 20}" r="46" fill="url(#s)"/>`, defs);
}

/* A fleck of gold, thrown when the plate parts. */
svg('spark', [CX - 4, CY - 4, 8, 8], `<path d="${poly([[CX, CY - 4], [CX + 2.4, CY], [CX, CY + 4], [CX - 2.4, CY]])}" fill="${C.brassHi}"/>`);

console.log(`lock art written to ${OUT}: ${count} layers, ${bytes} bytes`);
