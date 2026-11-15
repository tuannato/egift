// Generator for the "crane" wrapper art: a square of paper that becomes a crane, drawn as flat
// origami: every face of a fold is one triangle in one of two tones of the same colour. No
// outline, no gradient, no filter. Every colour is in the palette `C`, so the art can be given in
// colourways (scripts/colourways.mjs): the crane's colour turns, the room stays.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/crane.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'crane');
if (!OUT.endsWith('wrappers/crane')) throw new Error('out dir must be public/wrappers/crane');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: the paper's coloured side in two tones, its white side in two, three indigos for the room, one gold. */
const C = {
    red: '#D8432F',
    redLo: '#A9301F',
    paper: '#F6F1E6',
    paperLo: '#D9D2C2',
    indigo: '#1F2E5C',
    indigoLo: '#2C3F78',
    indigoDeep: '#141E40',
    gold: '#E3B552',
};

const f = n => String(Math.round(n * 100) / 100);
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** A very small crane, seen flat: two wings, a neck, a tail. `s` is half its span. */
const mini = (cx, cy, s, a, b) =>
    poly([[cx, cy + s * 0.25], [cx - s * 0.75, cy - s], [cx - s * 0.25, cy + s * 0.05]], a) +
    poly([[cx, cy + s * 0.25], [cx + s * 0.75, cy - s], [cx + s * 0.25, cy + s * 0.05]], b) +
    poly([[cx - s * 0.2, cy + s * 0.1], [cx - s * 1.15, cy - s * 0.1], [cx - s * 0.1, cy + s * 0.5]], b) +
    poly([[cx + s * 0.2, cy + s * 0.1], [cx + s * 1.1, cy - s * 0.2], [cx + s * 0.1, cy + s * 0.5]], a) +
    poly([[cx - s * 0.22, cy + s * 0.12], [cx + s * 0.22, cy + s * 0.12], [cx, cy + s * 0.62]], a);

/* ---- room: indigo, a lighter band low down like a table's far edge ---- */
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.indigo}"/>`;
    s += `<rect x="-6" y="404" width="372" height="52" fill="${C.indigoDeep}"/>` + `<rect x="-6" y="404" width="372" height="3" fill="${C.indigoLo}"/>`;
    // Big quiet triangles in the wall: the folds of a larger sheet.
    s += poly([[-6, -6], [150, -6], [-6, 170]], C.indigoLo, ' opacity="0.45"') + poly([[366, 90], [366, 330], [250, 210]], C.indigoLo, ' opacity="0.35"') + poly([[366, -6], [366, 90], [280, -6]], C.indigoDeep, ' opacity="0.6"');
    svg('room', [-6, -6, 372, 462], s);
}

/* ---- strings of small cranes hanging down the sides: two layers, to sway against each other ---- */
{
    const string = (x, top, ys, tones) => `<rect x="${x - 0.6}" y="${top}" width="1.2" height="${ys[ys.length - 1] - top}" fill="${C.paperLo}" opacity="0.55"/>` + ys.map((y, i) => mini(x, y, 19, ...tones[i % tones.length])).join('');
    const T = [[C.paper, C.paperLo], [C.gold, C.paperLo], [C.red, C.redLo], [C.indigoLo, C.paperLo]];
    svg('strings-a', [0, -10, 360, 410], string(32, -10, [52, 132, 212, 292, 372], T) + string(328, -10, [84, 164, 244, 324], [T[1], T[0], T[2], T[3]]));
    svg('strings-b', [0, -10, 360, 290], string(84, -10, [30, 104], [T[2], T[0]]) + string(280, -10, [22, 96], [T[0], T[1]]));
}

/* ---- the sheet: a square on its corner, 240 across. Its coloured side is out; the creases show as faces. ---- */
const SX = 180, SY = 215, H = 120;
{
    // Upper half (apex up): four faces. It folds down over the lower half.
    let up = poly([[SX, SY - H], [SX - H, SY], [SX, SY]], C.red) + poly([[SX, SY - H], [SX + H, SY], [SX, SY]], C.redLo);
    // Two creases of the folds to come, in the other tone of the paper.
    const crease = (x, y, col) => `<path d="M${SX} ${SY}L${f(x)} ${f(y)}" stroke="${col}" stroke-width="1.6"/>`;
    up += crease(SX - H / 2, SY - H / 2, C.redLo) + crease(SX + H / 2, SY - H / 2, C.red);
    svg('sheet-up', [SX - H, SY - H, 2 * H, H], up);
    // Lower half (apex down).
    let low = poly([[SX - H, SY], [SX, SY + H], [SX, SY]], C.redLo) + poly([[SX + H, SY], [SX, SY + H], [SX, SY]], C.red);
    low += crease(SX - H / 2, SY + H / 2, C.red) + crease(SX + H / 2, SY + H / 2, C.redLo);
    svg('sheet-low', [SX - H, SY, 2 * H, H], low);
    // The upper half once folded down: its white side, lying on the lower half.
    const inn = poly([[SX - H, SY], [SX, SY + H], [SX, SY]], C.paper) + poly([[SX + H, SY], [SX, SY + H], [SX, SY]], C.paperLo) + `<rect x="${SX - H}" y="${SY}" width="${2 * H}" height="2.5" fill="${C.paperLo}"/>`;
    svg('sheet-in', [SX - H, SY, 2 * H, H], inn);
}

/* ---- the crane, drawn where it ends. Each part is its own layer, turning about where it joins the body. ---- */
const BX = 180, BY = 262; // the middle of the body
{
    // Body: a small kite, two faces.
    svg('body', [150, 226, 60, 84], poly([[BX, 230], [BX - 26, BY], [BX, 306]], C.red) + poly([[BX, 230], [BX + 26, BY], [BX, 306]], C.redLo));
    // Wings: long triangles up and out from the body's top. Outer face coloured, the face nearer the body white (the paper's other side).
    svg('wing-l', [80, 86, 104, 184], poly([[BX - 2, 250], [88, 92], [124, 222]], C.red) + poly([[BX - 2, 250], [124, 222], [150, 266]], C.paper) + poly([[BX - 2, 250], [88, 92], [150, 180]], C.redLo, ' opacity="0.55"'));
    svg('wing-r', [176, 86, 104, 184], poly([[BX + 2, 250], [272, 92], [236, 222]], C.redLo) + poly([[BX + 2, 250], [236, 222], [210, 266]], C.paperLo) + poly([[BX + 2, 250], [272, 92], [210, 180]], C.red, ' opacity="0.55"'));
    // Neck and head (left), tail (right).
    svg('neck', [44, 196, 132, 86], poly([[170, 258], [70, 208], [164, 278]], C.red) + poly([[170, 258], [70, 208], [150, 240]], C.redLo, ' opacity="0.6"') + poly([[70, 208], [50, 236], [86, 220]], C.redLo));
    svg('tail', [184, 190, 116, 92], poly([[190, 258], [266, 216], [196, 278]], C.redLo) + poly([[190, 258], [266, 216], [210, 240]], C.red, ' opacity="0.6"'));
}

/* ---- flock: three small cranes further off, on a rising line ---- */
svg('flock', [196, 40, 150, 120], mini(232, 132, 15, C.paper, C.paperLo) + mini(280, 96, 11, C.gold, C.paperLo) + mini(318, 64, 8, C.paper, C.paperLo));

/* ---- fleck: gold dust when the wings open ---- */
svg('fleck', [176, 246, 8, 8], poly([[180, 246], [184, 250], [180, 254], [176, 250]], C.gold));
