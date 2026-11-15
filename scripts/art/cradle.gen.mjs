// Generator for the "cradle" wrapper art: a hanging mobile over a cot, as flat kinetic sculpture:
// thin rods and threads, plain shapes (disc, half disc, drop, ring, leaf, pebble) in soft inks, a
// room of upright bands of colour. No star, no cloud, no moon; no outline, no gradient, no filter.
// Every colour is in the palette `C`, so the art can be given in colourways (scripts/colourways.mjs).
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/cradle.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'cradle');
if (!OUT.endsWith('wrappers/cradle')) throw new Error('out dir must be public/wrappers/cradle');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two mints, cream, butter, a pale terracotta, brass in two tones, slate for rods and thread. */
const C = {
    mint: '#CFE5D6',
    mintDeep: '#6AA88A',
    cream: '#FBF5E6',
    butter: '#F3D78A',
    terra: '#E2A27E',
    brass: '#C08A3E',
    brassLo: '#96682A',
    slate: '#46525A',
};

const f = n => String(Math.round(n * 100) / 100);
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const thread = (x, y0, y1) => `<rect x="${f(x - 0.7)}" y="${y0}" width="1.4" height="${f(y1 - y0)}" fill="${C.slate}"/>`;

/* ---- room: upright bands like a curtain, a scalloped canopy edge at the top, the cot's bedding low down ---- */
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.mint}"/>`;
    const bands = [[-6, 50, C.cream, 0.7], [84, 34, C.butter, 0.35], [150, 60, C.cream, 0.55], [248, 28, C.mintDeep, 0.22], [304, 62, C.cream, 0.7]];
    for (const [x, w, col, o] of bands) s += `<rect x="${x}" y="-6" width="${w}" height="462" fill="${col}" opacity="${o}"/>`;
    // The canopy: a band and a row of half discs under it.
    s += `<rect x="-6" y="-6" width="372" height="30" fill="${C.mintDeep}"/>`;
    for (let i = 0; i < 9; i++) s += `<path d="M${-6 + i * 42} 24a21 21 0 0 0 42 0Z" fill="${i % 2 ? C.mintDeep : C.terra}"/>`;
    // The bedding: two soft rises and a blanket's folded edge.
    s += `<path d="M-6 404C60 372 120 380 180 396C240 412 300 388 366 396V456H-6Z" fill="${C.cream}"/>`;
    s += `<path d="M-6 426C70 404 150 420 220 424C280 428 330 414 366 418V456H-6Z" fill="${C.terra}" opacity="0.7"/>`;
    for (let i = 0; i < 12; i++) s += circle(12 + i * 31, 440 + (i % 2) * 5, 2.2, C.cream);
    svg('room', [-6, -6, 372, 462], s);
}

/* ---- glow: one flat pool of warm light behind the brass, when it has come down ---- */
svg('glow', [80, 136, 200, 200], circle(180, 236, 98, C.butter, ' opacity="0.5"') + circle(180, 236, 70, C.cream, ' opacity="0.55"'));

/* ---- frame: the hook, and the rods the threads hang from ---- */
{
    let s = thread(180, 20, 62);
    s += circle(180, 30, 5, C.brass);
    // The long rod, bowed; two short rods under its ends.
    s += `<path d="M36 100C110 54 250 54 324 100" fill="none" stroke="${C.slate}" stroke-width="3" stroke-linecap="round"/>`;
    s += `<path d="M36 100C56 84 86 84 108 98" fill="none" stroke="${C.slate}" stroke-width="2.4" stroke-linecap="round"/>`;
    s += `<path d="M252 98C274 84 304 84 324 100" fill="none" stroke="${C.slate}" stroke-width="2.4" stroke-linecap="round"/>`;
    for (const [x, y] of [[36, 100], [324, 100], [108, 98], [252, 98], [180, 65]]) s += circle(x, y, 3.4, C.brass);
    svg('frame', [20, 16, 320, 96], s);
}

/* ---- five things on threads. Each layer is thread and shape, and swings about the thread's top. ---- */
{
    // 1. half disc, flat side up
    svg('hang-1', [34, 100, 72, 190], thread(70, 100, 232) + `<path d="M40 232a30 30 0 0 0 60 0Z" fill="${C.butter}"/>` + `<path d="M52 232a18 18 0 0 0 36 0Z" fill="${C.cream}" opacity="0.7"/>`);
    // 2. drop
    svg('hang-2', [78, 96, 60, 150], thread(108, 96, 176) + `<path d="M108 174C122 196 130 208 130 220a22 22 0 0 1 -44 0C86 208 94 196 108 174Z" fill="${C.terra}"/>` + circle(101, 222, 5, C.cream, ' opacity="0.6"'));
    // 3. a square on its corner, a bead at its middle
    svg('hang-3', [216, 96, 72, 216], thread(252, 96, 246) + `<rect x="230" y="254" width="44" height="44" rx="7" fill="${C.mintDeep}" transform="rotate(45 252 276)"/>` + circle(252, 276, 6, C.butter));
    // 4. leaf
    svg('hang-4', [266, 98, 70, 150], thread(304, 98, 176) + `<path d="M304 174C330 190 330 222 304 240C278 222 278 190 304 174Z" fill="${C.mintDeep}"/>` + `<rect x="303" y="182" width="2" height="50" fill="${C.mint}"/>`);
    // 5. pebble, lower, between the first two
    svg('hang-5', [112, 62, 60, 286], thread(142, 70, 296) + `<ellipse cx="142" cy="316" rx="24" ry="19" fill="${C.slate}"/>` + `<ellipse cx="136" cy="310" rx="8" ry="5" fill="${C.mint}" opacity="0.55"/>`);
}

/* ---- the brass disc in the middle, on its own cord: the cord lets out and the disc comes down ---- */
svg('cord', [176, 64, 8, 64], thread(180, 64, 128));
{
    let s = circle(180, 150, 26, C.brass) + `<path d="M180 124a26 26 0 0 1 0 52Z" fill="${C.brassLo}"/>`;
    s += `<circle cx="180" cy="150" r="17" fill="none" stroke="${C.butter}" stroke-width="2"/>` + circle(180, 150, 4.5, C.cream);
    svg('brass', [152, 122, 56, 56], s);
}

/* ---- mote: what the light catches ---- */
svg('mote', [176, 232, 8, 8], circle(180, 236, 3, C.butter));
