// Generator for the "bottle" wrapper art: a message in a bottle, in the manner of a woodblock
// print of the sea: flat bands of water with evenly scalloped edges, a banded dusk sky, no
// outline, no gradient, no filter. Every colour is in the palette `C`, so the art can be given
// in colourways (scripts/colourways.mjs).
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/bottle.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'bottle');
if (!OUT.endsWith('wrappers/bottle')) throw new Error('out dir must be public/wrappers/bottle');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: three sea blues, foam, two sky bands, two sands, amber, coral, a glass tint, night. */
const C = {
    seaDeep: '#12324A',
    seaMid: '#1E5C6E',
    seaLight: '#3F8F92',
    foam: '#F4EFE2',
    skyHi: '#C9A2B8',
    skyLo: '#F2B79A',
    sand: '#E6D2A8',
    sandLo: '#CDB486',
    amber: '#E0963A',
    coral: '#D9604A',
    glass: '#BFE0D8',
    night: '#0D2233',
};

const f = n => String(Math.round(n * 100) / 100);
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
/** The scalloped top edge of a band: `n` round crests of radius `r` from x0, at height y. */
const crests = (x0, y, r, n) => `M${f(x0)} ${f(y)}` + Array.from({ length: n }, () => `a${r} ${r} 0 0 1 ${2 * r} 0`).join('');
/** A band of water: scalloped top, flat fill down to `bottom`, a line of foam riding the crests, a second thinner line under it. */
function band(x0, y, r, n, bottom, fill, line) {
    const top = crests(x0, y, r, n);
    const x1 = x0 + 2 * r * n;
    return (
        `<path d="${top}L${f(x1)} ${bottom}L${f(x0)} ${bottom}Z" fill="${fill}"/>` +
        `<path d="${top}" fill="none" stroke="${C.foam}" stroke-width="3.2" stroke-linecap="round"/>` +
        `<path d="${crests(x0 + r * 0.5, y + r * 0.9, r, n - 1)}" fill="none" stroke="${line}" stroke-width="2" stroke-linecap="round"/>`
    );
}

/* ---- sky: two bands of dusk and two flat bars of cloud ---- */
{
    let s = `<rect x="-6" y="-6" width="372" height="130" fill="${C.skyHi}"/>` + `<rect x="-6" y="118" width="372" height="190" fill="${C.skyLo}"/>`;
    s += `<rect x="-6" y="112" width="372" height="6" fill="${C.foam}" opacity="0.5"/>`;
    for (const [x, y, w] of [[36, 64, 92], [58, 76, 120], [232, 138, 96], [214, 150, 70]]) s += `<rect x="${x}" y="${y}" width="${w}" height="7" rx="3.5" fill="${C.foam}" opacity="0.75"/>`;
    svg('sky', [-6, -6, 372, 314], s);
}

/* ---- night: the sky a step darker, and stars. Comes on as the message opens. ---- */
{
    let s = `<rect x="-6" y="-6" width="372" height="314" fill="${C.night}" opacity="0.62"/>`;
    const stars = [[30, 30, 2], [72, 96, 1.4], [112, 44, 1.8], [150, 18, 1.3], [206, 70, 1.6], [252, 28, 2.2], [300, 88, 1.4], [334, 40, 1.8], [318, 150, 1.3], [44, 150, 1.6], [176, 120, 1.2], [270, 124, 1.5]];
    for (const [x, y, r] of stars) s += circle(x, y, r, C.foam);
    // One four-pointed star, made of two thin diamonds.
    s += `<path d="M252 14L255 28L252 42L249 28Z" fill="${C.foam}"/><path d="M238 28L252 25.4L266 28L252 30.6Z" fill="${C.foam}"/>`;
    svg('night', [-6, -6, 372, 314], s);
}

/* ---- sun: half down on the horizon, three bars of its light on the water side ---- */
svg('sun', [198, 150, 124, 62], circle(260, 212, 56, C.amber) + circle(260, 212, 40, C.coral, ' opacity="0.55"'));

/* ---- three bands of water, far to near. Each is wider than the frame so that it can slide. ---- */
svg('wave-c', [-80, 196, 520, 120], band(-80, 214, 13, 20, 316, C.seaLight, C.seaMid));
svg('wave-b', [-80, 226, 520, 150], band(-71, 248, 17, 15, 376, C.seaMid, C.seaDeep));
{
    // The near band is deep: three more lines of crests go down it, so that the foot of the frame is water, not a blank.
    let s = band(-80, 290, 22, 12, 462, C.seaDeep, C.seaMid);
    for (const [y, col] of [[348, C.seaLight], [392, C.seaMid], [434, C.seaLight]]) s += `<path d="${crests(y % 4 ? -80 : -58, y, 22, 12)}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`;
    for (const [x, y, r] of [[18, 330, 2.4], [96, 372, 1.8], [150, 322, 2], [236, 366, 2.6], [300, 330, 1.8], [330, 414, 2.2], [60, 416, 2], [196, 412, 1.8]]) s += circle(x, y, r, C.foam, ' opacity="0.8"');
    svg('wave-a', [-80, 262, 520, 200], s);
}

/* ---- sand: the shore the bottle is set down on. A scalloped tide line, pebbles. ---- */
{
    let s = `<path d="${crests(-10, 396, 19, 10)}L370 456L-10 456Z" fill="${C.sand}"/>`;
    s += `<path d="${crests(-10, 396, 19, 10)}" fill="none" stroke="${C.foam}" stroke-width="3.2" stroke-linecap="round"/>`;
    s += `<path d="${crests(0, 414, 19, 9)}" fill="none" stroke="${C.sandLo}" stroke-width="2" stroke-linecap="round"/>`;
    for (const [x, y, r] of [[40, 432, 4], [58, 440, 2.5], [296, 428, 5], [318, 438, 3], [250, 442, 2.5], [104, 444, 3]]) s += circle(x, y, r, C.sandLo);
    svg('sand', [-10, 372, 380, 84], s);
}

/* ---- the bottle, drawn standing: its base on y=404, its mouth at y=196. Three layers on one box. ---- */
const BB = [104, 184, 152, 232];
{
    // Glass: a body with round shoulders, a neck and a lip. A tint, so that the roll shows through.
    const body = 'M138 404V288C138 262 164 252 166 226V206H194V226C196 252 222 262 222 288V404Z';
    let g = `<path d="${body}" fill="${C.glass}" opacity="0.68"/>`;
    g += `<path d="${body}" fill="none" stroke="${C.foam}" stroke-width="5" stroke-linejoin="round"/>`;
    g += `<rect x="161" y="198" width="38" height="10" rx="4" fill="${C.foam}"/>`;
    // Two flat lights down the left side, one short on the right.
    g += `<rect x="147" y="292" width="7" height="92" rx="3.5" fill="${C.foam}" opacity="0.8"/>` + `<rect x="158" y="304" width="4" height="50" rx="2" fill="${C.foam}" opacity="0.55"/>` + `<rect x="207" y="296" width="5" height="28" rx="2.5" fill="${C.foam}" opacity="0.5"/>`;
    // The base, a thicker line.
    g += `<rect x="138" y="398" width="84" height="6" fill="${C.foam}" opacity="0.7"/>`;
    svg('glass', BB, g);
    // The message inside: a roll of paper tied with a coral band.
    let r = `<rect x="160" y="286" width="40" height="104" rx="6" fill="${C.foam}"/>`;
    r += `<rect x="160" y="286" width="9" height="104" rx="4.5" fill="${C.sand}"/>` + `<rect x="160" y="330" width="40" height="11" fill="${C.coral}"/>`;
    r += `<ellipse cx="180" cy="287" rx="20" ry="5" fill="${C.sandLo}"/>` + `<ellipse cx="180" cy="287" rx="9" ry="2.2" fill="${C.sand}"/>`;
    svg('roll', BB, r);
    // The cork.
    svg('cork', BB, `<path d="M168 204L170 188H190L192 204Z" fill="${C.amber}"/><rect x="170" y="191" width="20" height="3" fill="${C.sandLo}"/>`);
}

/* ---- chart: the message, unrolled. A sea chart without a word on it. ---- */
{
    const [x, y, w, h] = [92, 24, 176, 176];
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.foam}"/>`;
    // A coast down the right side, its edge scalloped like the water's; depth rings round a bay.
    s += `<path d="M268 24V200H214C232 190 222 172 236 160C252 146 226 128 240 112C254 96 232 82 244 64C254 50 240 36 250 24Z" fill="${C.sand}"/>`;
    s += `<path d="M214 200C232 190 222 172 236 160C252 146 226 128 240 112C254 96 232 82 244 64C254 50 240 36 250 24" fill="none" stroke="${C.sandLo}" stroke-width="2"/>`;
    // An island off the coast, its shallows round it as one paler shape.
    s += `<path d="M118 126C120 104 150 96 172 106C192 116 190 146 168 156C146 164 116 152 118 126Z" fill="${C.glass}"/>` + `<path d="M134 128C136 116 152 112 162 120C172 128 166 142 154 144C142 146 132 140 134 128Z" fill="${C.sand}"/>`;
    // The way there, in dashes, to one mark.
    s += `<path d="M108 54C132 60 124 92 150 100C170 106 176 118 150 128" fill="none" stroke="${C.seaMid}" stroke-width="2.4" stroke-dasharray="5 6" stroke-linecap="round"/>`;
    s += circle(150, 128, 5.5, C.coral);
    // Two more small islands, and the fold lines of the roll.
    s += `<ellipse cx="116" cy="178" rx="10" ry="6" fill="${C.sand}"/>` + `<ellipse cx="196" cy="62" rx="8" ry="5" fill="${C.sand}"/>`;
    for (const yy of [68, 112, 156]) s += `<rect x="${x}" y="${yy}" width="${w}" height="1.4" fill="${C.sandLo}" opacity="0.6"/>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${C.sandLo}" stroke-width="2"/>`;
    svg('chart', [x - 2, y - 2, w + 4, h + 4], s);
    // The curl at the head of the sheet: what is left of the roll.
    svg('curl', [86, 12, 188, 22], `<rect x="88" y="14" width="184" height="18" rx="9" fill="${C.sand}"/><rect x="88" y="14" width="184" height="6" rx="3" fill="${C.foam}"/><rect x="164" y="14" width="14" height="18" fill="${C.coral}"/>`);
}

/* ---- spray: what leaves the mouth with the cork ---- */
svg('spray', [175, 191, 10, 10], circle(180, 196, 3.6, C.foam));
