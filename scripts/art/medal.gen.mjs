// Generator for the "medal" wrapper art: a gold medal on a plain emerald ribbon, hung in front of
// dark green cloth. Everything is flat: broad diagonal folds of ink green for the room, two golds
// for the metal, no outline, no bevel, no filter. The medal carries no emblem: both sides are a
// rosette of flat facets, like a cut stone seen from above, inside a plain rim. No star, no wreath,
// no rays.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/medal.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'medal');
if (!OUT.endsWith('wrappers/medal')) throw new Error('out dir must be public/wrappers/medal');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: three ink greens for the cloth, the ribbon's emerald in two tones, cream, two golds, one coral. */
const C = {
    inkDeep: '#071F1C',
    ink: '#0F3A36',
    teal: '#18544D',
    emerald: '#159A63',
    emeraldLo: '#0E7048',
    cream: '#F4EEDC',
    gold: '#E0B04A',
    goldLo: '#A87A24',
    coral: '#E8765A',
};

const f = n => String(Math.round(n * 100) / 100);
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ring = (cx, cy, r, stroke, w, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${stroke}" stroke-width="${f(w)}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** A small seeded generator, so that the confetti is the same on every run. */
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let z = a;
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
}

/* The medal hangs from a ring at (MX, RY); its disc is centred at (MX, MY). */
const MX = 180, MY = 267, R = 97, RY = 158;

/* ---- ground: the cloth behind, as broad flat folds lying on one diagonal ---- */
{
    const K = 0.62; // a fold is the strip c0 <= x + K*y <= c1
    const band = (c0, c1, fill, extra = '') => poly([[c0 + 6 * K, -6], [c1 + 6 * K, -6], [c1 - 456 * K, 456], [c0 - 456 * K, 456]], fill, extra);
    let s = rect(-6, -6, 372, 462, C.ink);
    s += band(-40, 70, C.inkDeep, ' opacity="0.75"');
    s += band(70, 120, C.inkDeep, ' opacity="0.3"');
    s += band(190, 300, C.teal, ' opacity="0.6"');
    s += band(300, 340, C.teal, ' opacity="0.28"');
    s += band(452, 560, C.inkDeep, ' opacity="0.6"');
    s += band(560, 650, C.teal, ' opacity="0.5"');
    // A hairline of gold along two fold edges.
    s += band(188, 190, C.gold, ' opacity="0.45"') + band(558.6, 560, C.gold, ' opacity="0.35"');
    svg('ground', [-6, -6, 372, 462], s);
}

/* ---- halo: what the room does when the medal turns its face. A soft pool of green light and thin rings round it. ---- */
{
    let s = `<defs><radialGradient id="pool" gradientUnits="userSpaceOnUse" cx="${MX}" cy="${MY}" r="170"><stop offset="0" stop-color="${C.emerald}" stop-opacity="0.8"/><stop offset="0.66" stop-color="${C.emerald}" stop-opacity="0.34"/><stop offset="1" stop-color="${C.emerald}" stop-opacity="0"/></radialGradient></defs>`;
    s += circle(MX, MY, 170, 'url(#pool)');
    s += ring(MX, MY, 110, C.gold, 1.6, ' opacity="0.9"');
    s += ring(MX, MY, 122, C.cream, 3, ' stroke-dasharray="0.1 7.56" stroke-linecap="round" opacity="0.85"');
    s += ring(MX, MY, 137, C.gold, 1, ' opacity="0.55"');
    s += ring(MX, MY, 152, C.cream, 1, ' stroke-dasharray="16 10.53" opacity="0.32"');
    s += ring(MX, MY, 166, C.gold, 0.8, ' opacity="0.3"');
    svg('halo', [10, 97, 340, 340], s);
}

/* ---- the medal: reverse and face on one box, turning about the ring it hangs from ---- */
const MB = [80, 150, 200, 218];
const P = (r, deg) => [MX + r * Math.cos((deg * Math.PI) / 180), MY + r * Math.sin((deg * Math.PI) / 180)];
/**
 * A facet's tone. Neighbours always differ: a facet standing on its outer edge is a step lighter
 * than the one beside it standing on its inner edge, and both are a step lighter on the upper left
 * half of the stone. Three flat tones from two golds and cream; no shading within a facet.
 */
function facet(pts, deg, outer) {
    const lit = Math.cos(((deg + 135) * Math.PI) / 180) > 0;
    const seam = col => ` stroke="${col}" stroke-width="0.5" stroke-linejoin="round"`;
    let s = poly(pts, C.gold, seam(C.gold));
    if (outer && lit) s += poly(pts, C.cream, ' opacity="0.5"');
    if (!outer && !lit) s += poly(pts, C.goldLo, ' opacity="0.55"');
    return s;
}
/** What both sides share: the lug and the plain rim, flat. */
function blank() {
    let s = rect(MX - 8, RY - 4, 16, MY - R - RY + 10, C.goldLo);
    s += circle(MX, MY, R, C.goldLo) + circle(MX, MY, R - 2, C.gold) + circle(MX, MY, 86, C.goldLo);
    return s;
}
/**
 * The rosette: a stone cut in steps, seen from above. Twelve-sided rings, each turned half a side
 * against the one outside it, so that every band between two rings is twenty-four flat triangles;
 * a twelve-sided table in the middle. No facet comes to a point outside the outline.
 */
function rosette(radii) {
    let s = '';
    for (let k = 0; k + 1 < radii.length; k++) {
        const r0 = radii[k], r1 = radii[k + 1], t0 = k * 15, t1 = t0 + 15;
        for (let i = 0; i < 12; i++) {
            const a = t0 + i * 30;
            // The facet standing on the outer ring, then the one standing on the inner ring.
            s += facet([P(r0, a), P(r0, a + 30), P(r1, a + 15)], a + 15, true);
            s += facet([P(r1, a - 15), P(r1, a + 15), P(r0, a)], a, false);
        }
    }
    const last = radii.length - 1;
    s += poly(Array.from({ length: 12 }, (_, i) => P(radii[last], last * 15 + i * 30)), C.gold) + poly(Array.from({ length: 12 }, (_, i) => P(radii[last], last * 15 + i * 30)), C.cream, ' opacity="0.5"');
    return s;
}
{
    // Reverse: two broad bands of facets round a wide table.
    svg('back', MB, blank() + rosette([83.5, 60, 37]));
}
{
    // Face: the same stone cut finer, a ring of dots on the rim, a plain round boss ringed with dots.
    let s = blank();
    for (let i = 0; i < 36; i++) s += circle(...P(91.2, i * 10 + 5), 1.9, C.goldLo);
    s += rosette([83.5, 67, 50, 33]);
    s += circle(MX, MY, 21, C.goldLo) + circle(MX, MY, 18.5, C.gold) + circle(MX, MY, 18.5, C.cream, ' opacity="0.45"');
    for (let i = 0; i < 12; i++) s += circle(...P(27, i * 30), 1.3, C.goldLo);
    svg('front', MB, s);
}

/* ---- sheen: the light that crosses the face once. One narrow bar and a thinner one beside it, lying on a diagonal. ---- */
{
    const u = [0.5, -0.866], n = [0.866, 0.5];
    const bar = (o0, o1, half, extra) => poly([[-half, o0], [half, o0], [half, o1], [-half, o1]].map(([t, o]) => [MX + u[0] * t + n[0] * o, MY + u[1] * t + n[1] * o]), C.cream, extra);
    svg('sheen', [MX - 38, MY - 48, 76, 96], bar(-7, 7, 46, ' opacity="0.5"') + bar(12, 15.5, 40, ' opacity="0.36"'));
}

/* ---- ribbon: two plain emerald bands down from the top corners, crossing behind a bar; the ring the medal hangs from ---- */
{
    const YT = -12, YB = 142;
    /** One band: its centre line runs from (xt, YT) to (xb, YB); each stripe is cut level at both ends. */
    const band = (xt, xb, fill) => {
        const dx = xb - xt, dy = YB - YT, len = Math.hypot(dx, dy);
        const hx = len / dy; // how far along x one unit across the band reaches at a level cut
        const stripe = (o0, o1, col, extra = '') => poly([[xt + o0 * hx, YT], [xt + o1 * hx, YT], [xb + o1 * hx, YB], [xb + o0 * hx, YB]], col, extra);
        return stripe(-30, 30, fill) + stripe(-25.5, -23.6, C.cream) + stripe(23.6, 25.5, C.cream);
    };
    let s = band(-14, 158, C.emeraldLo) + band(374, 202, C.emerald);
    // The bar: plain gold over a lower edge.
    s += rect(104, 132, 152, 17, C.goldLo) + rect(104, 132, 152, 13, C.gold);
    // The ring, through the bar's eye and the medal's lug.
    s += rect(MX - 5, 145, 10, 6, C.goldLo);
    s += ring(MX, RY, 8.5, C.gold, 3.4);
    svg('ribbon', [0, -12, 360, 182], s);
}

/* ---- folds: the near cloth, two broad folds coming down from each side to cross under the medal ---- */
{
    const fold = (m, top, reach, fill, extra = '') => {
        const x = m === 1 ? -6 : 366;
        return poly([[x, top], [x, 456], [x + m * reach, 456]], fill, extra);
    };
    // A stripe lying along a fold's long edge, `w` wide, set `inset` below it.
    const edge = (m, top, reach, inset, w, fill, extra = '') => {
        const x = m === 1 ? -6 : 366;
        return poly([[x, top + inset], [x + m * (reach * (1 - inset / (456 - top))), 456], [x + m * (reach * (1 - (inset + w) / (456 - top))), 456], [x, top + inset + w]], fill, extra);
    };
    let s = fold(-1, 292, 236, C.teal) + edge(-1, 292, 236, 0, 2, C.gold, ' opacity="0.7"');
    s += fold(1, 292, 236, C.ink) + fold(1, 292, 236, C.teal, ' opacity="0.72"') + edge(1, 292, 236, 0, 2, C.gold, ' opacity="0.7"');
    for (const m of [1, -1]) {
        s += fold(m, 340, 150, C.emeraldLo) + edge(m, 340, 150, 7, 1.8, C.cream, ' opacity="0.8"');
        s += fold(m, 392, 84, C.inkDeep) + edge(m, 392, 84, 0, 1.6, C.gold, ' opacity="0.8"');
    }
    svg('folds', [-6, 290, 372, 166], s);
}

/* ---- confetti: two fields of small flat paper pieces, drawn where they come to rest ---- */
{
    const TONES = [C.gold, C.cream, C.emerald, C.coral, C.gold, C.cream, C.cream];
    /** `n` pieces in a field `h` high, thicker towards the top, none nearer the medal's centre than `clear`. */
    const field = (seed, n, h, clear, scale) => {
        const rnd = seeded(seed);
        const placed = [];
        let s = '';
        let guard = 0;
        while (placed.length < n && guard++ < 4000) {
            const x = 8 + rnd() * 344;
            const y = 6 + rnd() ** 1.45 * (h - 14);
            const turn = Math.round(rnd() * 180);
            const kind = rnd();
            const tone = TONES[Math.floor(rnd() * TONES.length)];
            if (Math.hypot(x - MX, y - MY) < clear) continue;
            if (y > 122 && y < 172 && Math.abs(x - MX) < 86) continue; // the bar and the ring stay clear
            if (placed.some(([px, py]) => Math.hypot(px - x, py - y) < 21)) continue;
            placed.push([x, y]);
            const t = ` transform="rotate(${turn} ${f(x)} ${f(y)})"`;
            if (kind < 0.5) s += rect(x - 3.2 * scale, y - 5 * scale, 6.4 * scale, 10 * scale, tone, t);
            else if (kind < 0.82) s += rect(x - 1.5 * scale, y - 7.5 * scale, 3 * scale, 15 * scale, tone, t);
            else s += circle(x, y, 2.6 * scale, tone);
        }
        return s;
    };
    svg('confetti-a', [0, 0, 360, 350], field(11, 44, 350, 106, 0.9));
    svg('confetti-b', [0, 0, 360, 300], field(29, 24, 300, 120, 1.25));
}

/* ---- bits: the two pieces thrown off the medal as it turns ---- */
svg('bit-a', [MX - 4, MY - 5, 8, 10], rect(MX - 3, MY - 4.5, 6, 9, C.gold));
svg('bit-b', [MX - 4, MY - 5, 8, 10], rect(MX - 1.6, MY - 5, 3.2, 10, C.cream));
