// Generator for the "fold" wrapper art, in PAPER-CUT: a shadow box of flat cut
// sheets (graphite sky, a paper moon, three ridges), a tri-fold letter tied with
// a two-strand cord, and a pop-up landscape that stands up from its creases.
// Every shape is one flat colour with a hard, offset shadow; depth is stacking.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box).
// Run: node scripts/art/fold.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'fold');
if (!OUT.endsWith('wrappers/fold')) throw new Error('out dir must be public/wrappers/fold');
mkdirSync(OUT, { recursive: true });
for (const name of readdirSync(OUT)) if (name.endsWith('.svg')) rmSync(join(OUT, name));

/* The palette: ivory, bone, two warm greys, graphite, one terracotta (and its darker cut). */
const C = {
    ivoryHi: '#FAF6EC', ivory: '#F3EDDF', bone: '#E6DDCB', boneLo: '#D9CFBA',
    grey1: '#B5AB98', grey2: '#8A8171', graphite: '#2B2825', graphiteLo: '#1D1B19',
    terra: '#C4572A', terraLo: '#9A4420',
    shadow: '#0F0C0A', fibreDark: '#6E6250', fibreLight: '#FFFDF6',
};

/* Geometry. The letter is 256 wide. Everything is drawn where it is when OPEN; closed, the letter sits 32 units
   higher (the definition's start poses), so it rides high in the page and the open sheet clears the header. */
const X = 52, W = 256, XR = X + W, CX = 180;
const TOP = 132, H1 = 192, H2 = 266, BOT = 340; // open sheet: top edge, two hinges, bottom edge
const LIP = 252; // where the folded-down top panel ends when closed: a 14-unit strip of the panel under it shows
const KY = 229; // the knot

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

const BOX = {};
function svg(name, box, inner) {
    BOX[name] = box;
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    writeFileSync(join(OUT, `${name}.svg`), s);
}

/** Fine paper grain inside a rectangle: short fibres a little darker and a little lighter than the sheet. */
function grain(seed, [x0, y0, x1, y1], n, { light = 0.3, dark = 0.09 } = {}) {
    const r = rng(seed);
    let s = '';
    for (let k = 0; k < n; k++) {
        const x = x0 + r() * (x1 - x0);
        const y = y0 + r() * (y1 - y0);
        const len = 0.8 + r() * 2.6;
        const ang = (r() - 0.5) * 0.9 + (r() < 0.25 ? Math.PI / 2 : 0);
        const isLight = r() < 0.4;
        s += `<path d="M${f(x)} ${f(y)}l${f(Math.cos(ang) * len)} ${f(Math.sin(ang) * len)}" stroke="${isLight ? C.fibreLight : C.fibreDark}" stroke-width="${f(0.25 + r() * 0.2)}" stroke-opacity="${f((isLight ? light : dark) * (0.6 + r() * 0.6))}" stroke-linecap="round"/>`;
    }
    return s;
}

/**
 * One cut sheet: a hard shadow (the same cut, offset), the flat paper, grain clipped to the cut.
 * `off` is the shadow's offset, `sh` its strength.
 */
function cut(name, box, d, fill, { off = [2, -3], sh = 0.26, seed = 1, n = 90, area = null, grainOpt = {}, extra = '' } = {}) {
    const a = area ?? [box[0], box[1], box[0] + box[2], box[1] + box[3]];
    svg(name, box,
        `<defs><clipPath id="c"><path d="${d}"/></clipPath></defs>` +
        `<path d="${d}" transform="translate(${off[0]} ${off[1]})" fill="${C.shadow}" fill-opacity="${sh}"/>` +
        `<path d="${d}" fill="${fill}"/>` +
        `<g clip-path="url(#c)">${grain(seed, a, n, grainOpt)}${extra}</g>`);
}

/* ---------- The shadow box ---------- */
// The back of the box: one graphite sheet.
svg('sky', [-20, -20, 400, 490],
    `<rect x="-20" y="-20" width="400" height="490" fill="${C.graphite}"/>` + grain(1, [-20, -20, 380, 300], 150, { light: 0.1, dark: 0.3 }));

// A paper moon.
{
    const cx = 246, cy = 108, r = 36;
    svg('disc', [cx - r - 2, cy - r - 2, 2 * r + 8, 2 * r + 9],
        `<circle cx="${cx + 2.5}" cy="${cy + 3.5}" r="${r}" fill="${C.shadow}" fill-opacity="0.5"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.ivory}"/>` +
        grain(2, [cx - 24, cy - 24, cx + 24, cy + 24], 30));
}

// Three ridges, each cut with scissors from a darker sheet as it comes nearer.
{
    const ridge = (name, top, y0, fill, o) =>
        cut(name, [-20, y0, 400, 480 - y0], `${top}L380 480L-20 480Z`, fill, { ...o, area: [-20, y0, 380, y0 + 150] });
    ridge('ridge-far', 'M-20 168C30 150 70 112 120 112C170 112 215 150 262 160C300 168 340 150 380 138', 104, C.grey1, { seed: 3, n: 130, sh: 0.34 });
    ridge('ridge-mid', 'M-20 286C30 272 84 266 130 274C180 283 226 298 280 292C320 287 352 272 380 264', 256, C.grey2, { seed: 4, n: 110, sh: 0.3 });
    ridge('ridge-near', 'M-20 384C40 366 96 362 150 372C210 383 262 396 310 388C340 383 362 372 380 366', 354, C.graphiteLo, { seed: 5, n: 90, sh: 0.42, grainOpt: { light: 0.08, dark: 0.3 } });
}

/* ---------- The letter ---------- */
// Hard shadows of the three panels on the box behind. The top and bottom ones fold with their panels.
const shade = (name, y0, y1) =>
    svg(name, [X + 5, y0 + 7, W, y1 - y0], `<rect x="${X + 5}" y="${y0 + 7}" width="${W}" height="${y1 - y0}" fill="${C.shadow}" fill-opacity="0.46"/>`);
shade('shade-mid', H1, H2);
shade('shade-top', TOP, H1);
shade('shade-bot', H2, BOT);

/** One panel: a flat facet, grain, and a crisp crease line on its hinge edges. */
function panel(name, y0, y1, fill, { seed, hinges = '', extra = '', tail = 0 }) {
    let s = `<rect x="${X}" y="${y0}" width="${W}" height="${y1 - y0}" fill="${fill}"/>` + grain(seed, [X + 2, y0 + 1, XR - 2, y1 - 1], 110);
    if (hinges.includes('t')) s += `<rect x="${X}" y="${y0}" width="${W}" height="0.6" fill="${C.fibreDark}" fill-opacity="0.4"/>`;
    if (hinges.includes('b')) s += `<rect x="${X}" y="${f(y1 - 0.6)}" width="${W}" height="0.6" fill="${C.fibreLight}" fill-opacity="0.8"/>`;
    svg(name, [X, y0, W, y1 - y0 + tail], s + extra);
}
// Inside faces: three facets, a tone apart, lightest at the head.
panel('top-open', TOP, H1, C.ivoryHi, { seed: 12, hinges: 'b' });
panel('mid', H1, H2, C.ivory, { seed: 11, hinges: 't' });
panel('bot-open', H2, BOT, '#ECE5D4', { seed: 13, hinges: 't' });

// A blind-embossed border: a pressed line a few units inside the edge, its shade and its lit lip.
{
    const I = 9, x = X + I, y = TOP + I, w = W - 2 * I, h = BOT - TOP - 2 * I;
    svg('emboss', [X, TOP, W, BOT - TOP],
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${C.fibreDark}" stroke-opacity="0.38" stroke-width="0.6"/>` +
        `<rect x="${x + 0.7}" y="${y + 0.7}" width="${w}" height="${h}" fill="none" stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="0.6"/>`);
}

// Backs, as seen when folded. The bottom panel lies up over the middle; its lowest strip shows under the top panel.
panel('bot-closed', H1, H2, C.boneLo, {
    seed: 14,
});
// The top panel folded down: the face of the closed letter, with a lighter facet where the paper turns over the fold.
// Under its lower edge, its hard shadow on the panel below: the one visible overlap. It folds away with it.
panel('top-closed', H1, LIP, C.ivory, {
    seed: 15, tail: 4.5,
    extra: `<rect x="${X}" y="${LIP}" width="${W}" height="4.5" fill="${C.shadow}" fill-opacity="0.34"/><rect x="${X}" y="${H1}" width="${W}" height="3" fill="${C.ivoryHi}"/><rect x="${X}" y="${H1 + 3}" width="${W}" height="0.5" fill="${C.fibreDark}" fill-opacity="0.16"/>`,
});

/* ---------- The cord: strips of terracotta paper ---------- */
const strip = (d, colour, w = 2) => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const stripShadow = (d, w = 2) =>
    `<path d="${d}" transform="translate(1.3 1.7)" fill="none" stroke="${C.shadow}" stroke-opacity="0.34" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// Two turns around the folded letter.
{
    const y0 = H1 - 1, y1 = H2 + 1;
    const a = `M${CX - 2.2} ${y0}L${CX - 2.2} ${y1}`, b = `M${CX + 2.2} ${y0}L${CX + 2.2} ${y1}`;
    svg('thread', [170, H1 - 5, 20, H2 - H1 + 10], stripShadow(a) + stripShadow(b) + strip(a, C.terra) + strip(b, C.terraLo));
}
// Two short tails leave the knot sideways: one droops, the cut one stands up. Each turns about the knot.
{
    const tail = (name, box, d, colour) => svg(name, box, stripShadow(d) + strip(d, colour));
    tail('end-a', [176, 223, 30, 34], 'M192.6 230.6C196.4 231.6 199.6 235 200.4 240.4C201 244.6 199.4 248.2 200.2 252.6', C.terraLo);
    tail('end-b', [154, 213, 30, 22], 'M169.6 225.6C165.8 224.2 162.6 221.6 161 218.2', C.terra);
}
// The knot: a flat (reef) knot, two bights locked through each other, one a tone darker.
{
    // sgn: which side the bight's open end points to; h: half its height; far: how far its closed end reaches.
    const bight = (sgn, h, far) => `M${CX + sgn * 4} ${KY - h * 0.72}C${CX - sgn * 3} ${KY - h * 1.06} ${CX - sgn * far} ${KY - h} ${CX - sgn * far} ${KY}C${CX - sgn * far} ${KY + h} ${CX - sgn * 3} ${KY + h * 1.06} ${CX + sgn * 4} ${KY + h * 0.72}`;
    // The wide bight on the left, the narrow one on the right passing through it.
    const left = bight(1, 5.4, 11), right = bight(-1, 2.5, 13.4);
    // The right bight's upper arm lies over the left one's end, its lower arm under: one short piece drawn again on top.
    const under = `M${CX + 4} ${KY + 5.4 * 0.72}C${CX + 2} ${KY + 4.6} ${CX} ${KY + 5.1} ${CX - 2} ${KY + 5.3}`;
    svg('knot', [164, 220, 32, 18], stripShadow(left) + stripShadow(right) + strip(left, C.terra) + strip(right, C.terraLo) + strip(under, C.terra));
}

/* ---------- The pop-up: a cut-paper landscape that stands up from the lower crease ---------- */
{
    const BASE = 279; // the paper feet sit a little below the lower crease
    const hill = (name, box, top, fill, o) => cut(name, box, `${top}Z`, fill, { off: [2, -2], n: 40, ...o });
    hill('hill-back', [76, 210, 206, 70], `M82 ${BASE}C96 256 126 216 166 219C204 222 240 250 276 ${BASE}`, C.grey2, { seed: 21, sh: 0.3 });
    hill('hill-mid', [98, 220, 192, 60], `M104 ${BASE}C140 270 164 250 190 238C212 228 236 225 252 233C268 241 278 260 284 ${BASE}`, C.bone, { seed: 22, sh: 0.3 });
    hill('hill-front', [70, 245, 222, 35], `M76 ${BASE}C92 260 124 250 150 258C176 267.5 200 270 226 262C248 255.5 270 260 286 ${BASE}`, C.graphite, { seed: 23, sh: 0.32, grainOpt: { light: 0.1, dark: 0.3 } });
    // The sun: a plain disc of terracotta paper.
    svg('sun', [178, 196, 44, 44],
        `<circle cx="200" cy="218" r="18" fill="${C.shadow}" fill-opacity="0.3"/>` +
        `<circle cx="198" cy="216" r="18" fill="${C.terra}"/>` +
        grain(24, [184, 202, 212, 230], 14, { light: 0.25, dark: 0.2 }));
}

console.log(JSON.stringify(BOX));
