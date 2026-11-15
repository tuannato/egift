// Generator for the "vinyl" wrapper art: a record and its sleeve on a turntable, in the spirit of
// 1960s record-sleeve graphics. Circles, half rings and flat inks only: no outline, no gradient,
// no filter. Every colour is in the palette `C`, so the art can be given in colourways
// (scripts/colourways.mjs).
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/vinyl.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'vinyl');
if (!OUT.endsWith('wrappers/vinyl')) throw new Error('out dir must be public/wrappers/vinyl');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: three blacks, two creams, and one hot pair (tomato, mustard) with a darker cut of each. */
const C = {
    deck: '#171513', // the turntable's top
    mat: '#221F1C', // the platter
    groove: '#35312C', // grooves, fine lines
    wax: '#0B0A09', // the record
    cream: '#F3EAD6',
    creamLo: '#D5C9AE',
    tomato: '#D9432B',
    tomatoLo: '#A8301D',
    mustard: '#E8B33A',
    mustardLo: '#B88720',
};

const f = n => String(Math.round(n * 100) / 100);
const rad = d => (d * Math.PI) / 180;
/** A point on a circle; 0 degrees is up, clockwise. */
const at = (cx, cy, r, deg) => [cx + r * Math.sin(rad(deg)), cy - r * Math.cos(rad(deg))];
/** A piece of a ring: between two radii, from one angle to another (clockwise). */
const sector = (cx, cy, r0, r1, a0, a1, fill, extra = '') => {
    const big = (((a1 - a0) % 360) + 360) % 360 > 180 ? 1 : 0;
    const [x0, y0] = at(cx, cy, r1, a0);
    const [x1, y1] = at(cx, cy, r1, a1);
    const [x2, y2] = at(cx, cy, r0, a1);
    const [x3, y3] = at(cx, cy, r0, a0);
    return `<path d="M${f(x0)} ${f(y0)}A${f(r1)} ${f(r1)} 0 ${big} 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${f(r0)} ${f(r0)} 0 ${big} 0 ${f(x3)} ${f(y3)}Z" fill="${fill}"${extra}/>`;
};
/** Half a disc, its flat side turned to `deg`. */
const half = (cx, cy, r, deg, fill) => {
    const [x0, y0] = at(cx, cy, r, deg - 90);
    const [x1, y1] = at(cx, cy, r, deg + 90);
    return `<path d="M${f(x0)} ${f(y0)}A${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(y1)}Z" fill="${fill}"/>`;
};
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;

function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}

/* Geometry (canvas units). The record plays at the middle of the platter. */
const CX = 180, CY = 225; // the spindle
const R = 118; // the record
const SL = [22, 100, 250, 250]; // the sleeve, closed: its square
const PIVOT = [318, 92]; // the tone arm's pivot

/* ---- deck: the turntable from above. Fills the frame; the far layer. ---- */
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.deck}"/>`;
    // The platter, its strobe dots round the rim, the mat.
    s += circle(CX, CY, 152, C.mat);
    for (let i = 0; i < 60; i++) {
        const [x, y] = at(CX, CY, 145, i * 6);
        s += circle(x, y, i % 5 === 0 ? 2.2 : 1.3, i % 5 === 0 ? C.creamLo : C.groove);
    }
    s += circle(CX, CY, 137, C.deck) + circle(CX, CY, 132, C.mat);
    for (const r of [112, 90, 68, 46]) s += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${C.deck}" stroke-width="2"/>`;
    s += circle(CX, CY, 5, C.creamLo);
    // Bottom left: a stack of quarter rings, as on a sleeve's corner. Top left: the speed knobs.
    for (const [r0, r1, col] of [[112, 96, C.tomato], [88, 72, C.mustard], [64, 48, C.cream], [40, 0, C.tomatoLo]]) s += sector(-6, 456, r1, r0, 0, 90, col);
    s += circle(34, 36, 13, C.mat) + circle(34, 36, 5, C.mustard) + circle(70, 36, 13, C.mat) + circle(70, 36, 5, C.groove);
    // Bottom right: the pitch slider, a row of ticks and its cap.
    for (let i = 0; i < 9; i++) s += `<rect x="${300 + i * 6}" y="${i % 4 === 0 ? 404 : 409}" width="2" height="${i % 4 === 0 ? 20 : 10}" fill="${C.groove}"/>`;
    s += `<rect x="316" y="398" width="10" height="32" rx="3" fill="${C.creamLo}"/>`;
    svg('deck', [-6, -6, 372, 462], s);
}

/* ---- rings: three sets of ring pieces that come out from behind the record as it plays ---- */
{
    const set = (name, r0, r1, parts) => svg(name, [CX - r1 - 2, CY - r1 - 2, 2 * r1 + 4, 2 * r1 + 4], parts.map(([a0, a1, col]) => sector(CX, CY, r0, r1, a0, a1, col)).join(''));
    set('ring-a', 124, 137, [[18, 132, C.tomato], [198, 312, C.mustard]]);
    set('ring-b', 144, 153, [[70, 168, C.cream], [250, 348, C.tomatoLo]]);
    set('ring-c', 160, 174, [[118, 214, C.mustard], [298, 34, C.cream]]);
}

/* ---- disc: the record. A label that is not the same all the way round, so that a turn is seen. ---- */
{
    let s = circle(CX, CY, R, C.wax);
    for (let r = 110; r >= 52; r -= 6) s += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${C.groove}" stroke-width="${r % 12 === 2 ? 1.6 : 0.8}"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="${R - 1.5}" fill="none" stroke="${C.groove}" stroke-width="3"/>`;
    // The label: cream, a tomato half, a smaller mustard half set off-centre the other way, one dot.
    s += circle(CX, CY, 42, C.cream);
    s += half(CX, CY, 42, 235, C.tomato);
    // A straight mustard band across the cream half: with the tomato half, the label is not the same all the way round.
    s += `<rect x="${CX - 30}" y="${CY - 17}" width="60" height="9" fill="${C.mustard}" transform="rotate(55 ${CX} ${CY})"/>`;
    s += circle(CX, CY, 4, C.wax);
    svg('disc', [CX - R, CY - R, 2 * R, 2 * R], s);
}

/* ---- sheen: the light on the record. It does not turn with it. ---- */
{
    const s = sector(CX, CY, 48, R - 5, 28, 52, C.cream, ' opacity="0.11"') + sector(CX, CY, 48, R - 5, 208, 232, C.cream, ' opacity="0.11"') + sector(CX, CY, 48, R - 5, 36, 42, C.cream, ' opacity="0.1"');
    svg('sheen', [CX - R, CY - R, 2 * R, 2 * R], s);
}

/* ---- sleeve: a square of card, a round design cut in two and slipped, a hard shadow under it ---- */
{
    const [x, y, w, h] = SL;
    const mx = x + w / 2 - 6, my = y + h / 2;
    let s = `<rect x="${x + 7}" y="${y + 8}" width="${w}" height="${h}" fill="${C.wax}" opacity="0.55"/>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.cream}"/>`;
    // Left half of the design, then the right half slipped down: half rings, so each half is drawn with half discs.
    const rings = [[96, C.tomato], [78, C.cream], [70, C.mustard], [50, C.wax], [42, C.cream]];
    for (const [r, col] of rings) s += half(mx, my - 12, r, 270, col);
    const slipped = [[96, C.mustard], [80, C.cream], [72, C.wax], [54, C.tomato], [34, C.cream]];
    for (const [r, col] of slipped) s += half(mx, my + 14, r, 90, col);
    // The mouth of the sleeve (right), a thumb notch, the spine (left), a band along the bottom.
    s += `<rect x="${x + w - 6}" y="${y}" width="6" height="${h}" fill="${C.creamLo}"/>`;
    s += half(x + w, y + h / 2, 17, 270, C.wax);
    s += `<rect x="${x}" y="${y}" width="5" height="${h}" fill="${C.creamLo}"/>`;
    s += `<rect x="${x + 5}" y="${y + h - 20}" width="${w - 11}" height="6" fill="${C.wax}"/>` + `<rect x="${x + 5}" y="${y + h - 11}" width="${w - 11}" height="3" fill="${C.tomato}"/>`;
    svg('sleeve', [x - 2, y - 2, w + 12, h + 12], s);
}

/* ---- arm: the tone arm. Drawn where it plays; its box turns about the pivot. ---- */
{
    const [px, py] = PIVOT;
    const tip = [258, 172]; // the stylus, on the outer grooves
    const dx = tip[0] - px, dy = tip[1] - py, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    let s = '';
    // Counterweight behind the pivot, the tube, the head shell and its finger lift.
    s += `<line x1="${f(px - ux * 34)}" y1="${f(py - uy * 34)}" x2="${f(px - ux * 12)}" y2="${f(py - uy * 12)}" stroke="${C.creamLo}" stroke-width="17" stroke-linecap="round"/>`;
    s += `<line x1="${f(px)}" y1="${f(py)}" x2="${f(tip[0])}" y2="${f(tip[1])}" stroke="${C.cream}" stroke-width="5.5" stroke-linecap="round"/>`;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    s += `<rect x="${f(tip[0] - 15)}" y="${f(tip[1] - 8)}" width="30" height="16" rx="3" fill="${C.tomato}" transform="rotate(${f(ang)} ${f(tip[0])} ${f(tip[1])})"/>`;
    s += `<rect x="${f(tip[0] + 6)}" y="${f(tip[1] - 14)}" width="5" height="12" rx="2" fill="${C.cream}" transform="rotate(${f(ang)} ${f(tip[0])} ${f(tip[1])})"/>`;
    s += circle(px, py, 17, C.creamLo) + circle(px, py, 9, C.deck) + circle(px, py, 3.5, C.mustard);
    svg('arm', [222, 46, 136, 152], s);
}

/* ---- the sound, as shapes thrown off the record: a dot, a half disc, a small ring ---- */
svg('note-a', [174, 219, 12, 12], circle(180, 225, 5, C.tomato));
svg('note-b', [173, 218, 14, 14], half(180, 225, 6.5, 0, C.mustard));
svg('note-c', [174, 219, 12, 12], `<circle cx="180" cy="225" r="4" fill="none" stroke="${C.cream}" stroke-width="2.4"/>`);
