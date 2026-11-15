// Generator for the "orbit" wrapper art: bodies coming into line, as a flat star chart. Discs in
// two tones, the limb of a very large planet cut by the frame, fine orbit lines, stars as dots of
// several sizes. No halo of blur: light is a flat ring and flat streamers. No outline, no gradient,
// no filter. Every colour is in the palette `C`, so the art can be given in colourways
// (scripts/colourways.mjs).
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/orbit.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'orbit');
if (!OUT.endsWith('wrappers/orbit')) throw new Error('out dir must be public/wrappers/orbit');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: three night blues and the planet's lit blue, one line blue, a pale blue, warm white, one ember, the dark of a body in shadow. */
const C = {
    night: '#0B1230',
    nightLo: '#141E4A',
    dusk: '#25336B',
    planet: '#3D4F8F',
    line: '#0074C2',
    mist: '#9FB2D9',
    warm: '#FFF1D6',
    ember: '#F08A3C',
    dark: '#060914',
};

const f = n => String(Math.round(n * 100) / 100);
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
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

/* Where things end: on one line, from the big planet up to the top right. */
const SUN = [224, 166];

/* ---- sky: night, a band of denser small stars across it, two orbit lines far too large for the frame ---- */
{
    const r = rng(30);
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.night}"/>`;
    s += `<path d="M-6 250L366 -6V96L-6 352Z" fill="${C.nightLo}" opacity="0.7"/>`;
    for (let i = 0; i < 90; i++) {
        const t = r(), across = (r() - 0.5) * 90;
        const x = -6 + t * 372 + across * 0.55, y = 300 - t * 256 + across * 0.8;
        s += circle(x, y, 0.5 + r() * 0.8, C.mist, ` opacity="${f(0.35 + r() * 0.4)}"`);
    }
    s += `<ellipse cx="60" cy="430" rx="330" ry="250" fill="none" stroke="${C.line}" stroke-width="1.2" opacity="0.8"/>`;
    s += `<ellipse cx="60" cy="430" rx="240" ry="176" fill="none" stroke="${C.line}" stroke-width="1" opacity="0.55" stroke-dasharray="2 7" stroke-linecap="round"/>`;
    // A far body, top left, half in shadow; a knot of stars low on the right.
    s += circle(62, 122, 20, C.planet) + `<path d="M62 102a20 20 0 0 0 0 40Z" fill="${C.dusk}"/>` + `<circle cx="62" cy="122" r="30" fill="none" stroke="${C.line}" stroke-width="1" opacity="0.6"/>` + circle(92, 122, 2.6, C.mist);
    for (let i = 0; i < 26; i++) s += circle(250 + r() * 100, 330 + r() * 96, 0.6 + r() * 1.5, r() > 0.7 ? C.warm : C.mist, ` opacity="${f(0.5 + r() * 0.5)}"`);
    svg('sky', [-6, -6, 372, 462], s);
}

/* ---- stars: the brighter ones, on their own layer; they come up a step at the moment of alignment ---- */
{
    const r = rng(7);
    let s = '';
    for (let i = 0; i < 46; i++) {
        const x = r() * 360, y = r() * 450, big = r() > 0.82;
        s += circle(x, y, big ? 2 + r() : 0.9 + r() * 0.7, big ? C.warm : C.mist);
    }
    // Three four-pointed stars, as crossed thin diamonds.
    for (const [x, y, k] of [[52, 70, 9], [322, 310, 7], [150, 30, 6]]) s += `<path d="M${x} ${y - k}L${x + k * 0.22} ${y}L${x} ${y + k}L${x - k * 0.22} ${y}Z" fill="${C.warm}"/><path d="M${x - k} ${y}L${x} ${y - k * 0.22}L${x + k} ${y}L${x} ${y + k * 0.22}Z" fill="${C.warm}"/>`;
    svg('stars', [0, 0, 360, 450], s);
}

/* ---- giant: the limb of a very large planet, bottom left. Lit along its edge, banded, in shadow further in. ---- */
{
    const [gx, gy, R] = [-30, 560, 330];
    let s = circle(gx, gy, R, C.planet);
    s += circle(gx - 14, gy + 16, R - 6, C.dusk);
    for (const [d, w, o] of [[40, 10, 0.5], [74, 5, 0.4], [104, 16, 0.35], [150, 7, 0.3]]) s += `<circle cx="${gx - 14}" cy="${gy + 16}" r="${R - 6 - d}" fill="none" stroke="${C.nightLo}" stroke-width="${w}" opacity="${o}"/>`;
    s += circle(gx - 60, gy + 70, R - 60, C.night, ' opacity="0.55"');
    svg('giant', [-6, 226, 320, 230], s);
}

/* ---- line: the line they all come to stand on ---- */
svg('line', [40, 30, 290, 370], `<path d="M56 384L314 48" fill="none" stroke="${C.mist}" stroke-width="1.2" stroke-dasharray="1 8" stroke-linecap="round"/>`);

/* ---- sun: the bright disc. Warm white, never blue. ---- */
svg('sun', [SUN[0] - 50, SUN[1] - 50, 100, 100], circle(SUN[0], SUN[1], 44, C.warm) + circle(SUN[0] + 7, SUN[1] - 6, 30, C.mist, ' opacity="0.25"'));

/* ---- corona: what is seen round the dark body at the moment of the eclipse: one fine ring and flat streamers ---- */
{
    const [cx, cy] = SUN;
    let s = '';
    const lens = [44, 26, 58, 30, 40, 22, 62, 28, 46, 24, 52, 32];
    lens.forEach((len, i) => {
        const a = ((i * 30 + 8) * Math.PI) / 180, w = 0.11;
        const p = (ang, rr) => `${f(cx + rr * Math.cos(ang))} ${f(cy + rr * Math.sin(ang))}`;
        s += `<path d="M${p(a - w, 49)}L${p(a, 49 + len)}L${p(a + w, 49)}Z" fill="${C.warm}" opacity="${i % 2 ? 0.55 : 0.85}"/>`;
    });
    s += `<circle cx="${cx}" cy="${cy}" r="49.5" fill="none" stroke="${C.warm}" stroke-width="3"/>`;
    svg('corona', [cx - 116, cy - 116, 232, 232], s);
}

/* ---- moon: the body that passes in front. Dark, a thin lit edge on the side away from the sun's place. ---- */
svg('moon', [SUN[0] - 50, SUN[1] - 50, 100, 100], circle(SUN[0], SUN[1], 46, C.planet) + circle(SUN[0] - 4, SUN[1] + 4, 43, C.dark));

/* ---- bead: the last point of light at the dark body's edge ---- */
svg('bead', [SUN[0] + 24, SUN[1] - 42, 18, 18], circle(SUN[0] + 33, SUN[1] - 33, 5, C.warm) + circle(SUN[0] + 33, SUN[1] - 33, 8, C.warm, ' opacity="0.35"'));

/* ---- two small bodies that come onto the line: a pale one below, an ember far up ---- */
svg('small', [134, 246, 32, 32], circle(150, 262, 13, C.mist) + `<path d="M150 249a13 13 0 0 0 0 26Z" fill="${C.planet}"/>`);
svg('ember', [271, 86, 16, 16], circle(279, 94, 5.5, C.ember));
