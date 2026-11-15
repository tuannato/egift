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
/**
 * A very small crane in the same view as the big one: two broad wings spread to the sides, a steep
 * neck with the head folded down on the left, a plain steep tail on the right, a kite body below.
 * `s` is half its span.
 */
const mini = (cx, cy, s, a, b) => {
    const P = pts => pts.map(([x, y]) => [cx + x * s, cy + y * s]);
    return (
        poly(P([[0.06, 0.1], [0.3, 0.16], [0.56, -0.98]]), b) +
        poly(P([[-0.06, 0.1], [-0.3, 0.16], [-0.6, -0.86], [-0.5, -0.92]]), a) +
        poly(P([[-0.5, -0.92], [-0.88, -0.56], [-0.62, -0.8]]), b) +
        poly(P([[0, -0.12], [-1, -0.36], [-0.3, 0.3]]), a) +
        poly(P([[0, -0.12], [1, -0.44], [0.3, 0.3]]), b) +
        poly(P([[0, -0.06], [-0.24, 0.16], [0, 0.62]]), a) +
        poly(P([[0, -0.06], [0.24, 0.16], [0, 0.62]]), b)
    );
};

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

/* ---- the crane, drawn where it ends: the classic orizuru seen a little from the front. Two broad wings
   spread to the sides, a thin neck rising steeply on the left with its head folded sharply down, a plain
   steep spike of a tail on the right, a compact kite of a body low in the middle. Each part is its own
   layer, turning about where it joins the body. ---- */
const BX = 180;
{
    // Body: a compact kite, two faces. It lies over the roots of everything else.
    svg('body', [150, 254, 60, 82], poly([[BX, 256], [BX - 28, 284], [BX, 334]], C.red) + poly([[BX, 256], [BX + 28, 284], [BX, 334]], C.redLo));
    // Wings: broad triangles out to the sides from the body's top, two coloured faces about a crease;
    // the wedge nearest the body shows the paper's white side. The far (right) wing sits a little higher.
    const wing = (top, tip, mid, rootLo, lead, trail, white) => poly([top, tip, mid], lead) + poly([tip, rootLo, mid], trail) + poly([top, mid, rootLo], white);
    svg('wing-l', [42, 204, 144, 100], wing([182, 248], [54, 206], [136, 264], [144, 300], C.red, C.redLo, C.paper));
    svg('wing-r', [174, 190, 144, 112], wing([178, 248], [308, 194], [224, 262], [216, 300], C.redLo, C.red, C.paperLo));
    // Neck (left): long and thin, one face and a sliver. Its root is hidden behind the wings and the body.
    svg('neck', [94, 124, 86, 170], poly([[148, 290], [170, 281], [108, 128], [99, 132]], C.redLo) + poly([[170, 281], [176, 278], [108, 128]], C.red));
    // Head: the tip of the neck folded sharply down, one small face.
    svg('head', [64, 122, 50, 50], poly([[108, 128], [68, 160], [98, 152]], C.red));
    // Tail (right): a plain sharp spike, one face and a sliver.
    svg('tail', [180, 120, 86, 174], poly([[184, 278], [206, 288], [262, 124]], C.red) + poly([[206, 288], [212, 290], [262, 124]], C.redLo));
}

/* ---- flock: three small cranes further off, on a rising line ---- */
svg('flock', [196, 40, 150, 120], mini(232, 134, 17, C.paper, C.paperLo) + mini(282, 98, 12, C.gold, C.paperLo) + mini(320, 66, 9, C.paper, C.paperLo));

/* ---- fleck: gold dust when the wings open ---- */
svg('fleck', [176, 246, 8, 8], poly([[180, 246], [184, 250], [180, 254], [176, 250]], C.gold));
