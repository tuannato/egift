// Generator for the "curtain" wrapper art: a theatre stage seen from the stalls. Two velvet wings
// drawn as flat vertical folds, a valance of swags with gold fringe, a wooden stage with a row of
// footlights; behind the wings a night-blue set, a gold casket on a pedestal under a cloth, and a cone of light. Flat shapes,
// two or three tones a surface, no outline, no filter; light is a plain gradient with alpha stops.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/curtain.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'curtain');
if (!OUT.endsWith('wrappers/curtain')) throw new Error('out dir must be public/wrappers/curtain');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two wines for the house, three velvets, two golds, the stage light, two night blues, two woods. */
const C = {
    ground: '#12060A',
    wine: '#2E0D15',
    velvet: '#A51C2D',
    velvetLo: '#6B1020',
    velvetHi: '#C8374A',
    gold: '#E3B04B',
    goldLo: '#A47428',
    cream: '#FFF0CC',
    night: '#18284E',
    nightLo: '#0E1733',
    wood: '#3B2019',
    woodHi: '#5E3626',
};

const f = n => String(Math.round(n * 100) / 100);
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
const op = a => (a < 1 ? ` opacity="${f(a)}"` : '');
const rect = (x, y, w, h, fill, a = 1, rx = 0) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${f(rx)}"` : ''} fill="${fill}"${op(a)}/>`;
const circle = (cx, cy, r, fill, a = 1) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${op(a)}/>`;
const poly = (pts, fill, a = 1) => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${op(a)}/>`;
const path = (d, fill, a = 1) => `<path d="${d}" fill="${fill}"${op(a)}/>`;
const stroke = (d, col, w, a = 1, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(w)}"${extra}${op(a)}/>`;
const diamond = (cx, cy, rx, ry, fill, a = 1) => poly([[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]], fill, a);
const stops = list => list.map(([o, c, a]) => `<stop offset="${f(o)}" stop-color="${c}" stop-opacity="${f(a)}"/>`).join('');

/* The stage's measures. */
const FLOOR_TOP = 296; // where the floor meets the set
const LIP = 356; // the stage's front edge
const HEM = 333; // the curtain's hem
const FEET = [36, 84, 132, 180, 228, 276, 324]; // the footlights

/* ---- back: the set. A night-blue wall, an arched panel with a gold proscenium line, far hills painted
   low in the arch, a few stars; and the stage floor, its boards running to one point. ---- */
{
    let s = rect(-6, -6, 372, 462, C.nightLo);
    const arch = (x0, r, y) => `M${x0} ${FLOOR_TOP}V${y}A${r} ${r} 0 0 1 ${x0 + 2 * r} ${y}V${FLOOR_TOP}`;
    s += path(arch(76, 104, 150) + 'Z', C.night);
    // Painted scenery: two long hills, and a low band of haze on them.
    s += path(`M76 ${FLOOR_TOP}V268C104 246 140 246 172 262C204 278 236 280 284 256V${FLOOR_TOP}Z`, C.nightLo, 0.75);
    s += path(`M76 ${FLOOR_TOP}V284C120 270 150 272 190 282C230 292 256 286 284 276V${FLOOR_TOP}Z`, C.nightLo);
    s += stroke(arch(76, 104, 150), C.gold, 1.6, 0.6);
    s += stroke(arch(86, 94, 150), C.gold, 1, 0.28);
    // A niche in the middle of the wall, the first thing seen through the gap; a keystone over it.
    s += path('M132 ' + FLOOR_TOP + 'V168A48 48 0 0 1 228 168V' + FLOOR_TOP + 'Z', C.nightLo, 0.35);
    s += stroke('M132 ' + FLOOR_TOP + 'V168A48 48 0 0 1 228 168V' + FLOOR_TOP, C.gold, 1.3, 0.5);
    s += diamond(180, 120, 4, 6.5, C.gold, 0.75);
    for (const [x, y, r, a] of [[168, 140, 1, 0.6], [192, 152, 1.3, 0.7], [174, 182, 0.9, 0.5], [198, 198, 1, 0.55], [160, 214, 1.2, 0.65], [188, 232, 0.9, 0.5], [170, 252, 1, 0.5], [202, 262, 0.9, 0.45]]) s += circle(x, y, r, C.cream, a);
    s += diamond(196, 176, 1.3, 5.5, C.cream, 0.75) + diamond(196, 176, 5.5, 1.3, C.cream, 0.75);
    for (const [x, y, r, a] of [[100, 132, 1.4, 0.7], [118, 196, 1, 0.5], [132, 92, 1.2, 0.6], [150, 160, 0.9, 0.5], [214, 104, 1.1, 0.55], [232, 176, 1.3, 0.7], [250, 128, 0.9, 0.5], [266, 214, 1.1, 0.55], [104, 236, 0.9, 0.45], [244, 232, 1, 0.5], [162, 76, 1, 0.5], [206, 216, 0.9, 0.45]]) s += circle(x, y, r, C.cream, a);
    // One four-pointed star, off to the side of where the light will fall.
    s += diamond(116, 110, 1.6, 7, C.cream, 0.8) + diamond(116, 110, 7, 1.6, C.cream, 0.8);
    // The floor.
    s += rect(-6, FLOOR_TOP, 372, 462 - FLOOR_TOP, C.wood);
    const VY = 150;
    for (let xf = -252; xf <= 612; xf += 36) {
        const xt = 180 + ((xf - 180) * (FLOOR_TOP - VY)) / (LIP - VY);
        s += stroke(`M${f(xt)} ${FLOOR_TOP}L${xf} ${LIP}`, C.ground, 1.2, 0.5);
    }
    s += rect(-6, FLOOR_TOP, 372, 2, C.woodHi);
    svg('back', [-6, -6, 372, 462], s);
}

/* ---- flats: two flat columns standing either side of the arch, a plane nearer than the wall. ---- */
{
    const column = (cx, lit) => {
        let s = rect(cx - 11, 98, 22, 194, C.night);
        s += rect(cx - 11 + (lit > 0 ? 0 : 18), 98, 4, 194, C.cream, 0.12);
        s += rect(cx - 3.5, 104, 1.6, 182, C.nightLo) + rect(cx + 2, 104, 1.6, 182, C.nightLo);
        s += rect(cx - 15, 90, 30, 8, C.goldLo, 0.85) + rect(cx - 13, 84, 26, 6, C.goldLo, 0.55);
        s += rect(cx - 15, 290, 30, 12, C.night) + rect(cx - 15, 290, 30, 2, C.goldLo, 0.7);
        return s;
    };
    // The lamp the beam comes from: a small hood hung under the valance, its lens down.
    let lamp = rect(178.5, 56, 3, 16, C.goldLo) + poly([[171, 70], [189, 70], [195, 84], [165, 84]], C.wood) + poly([[183, 70], [189, 70], [195, 84], [187, 84]], C.woodHi);
    lamp += rect(163, 83, 34, 2.6, C.gold, 1, 1.3) + rect(167, 85.6, 26, 2.4, C.cream);
    svg('flats', [40, 56, 280, 250], column(60, 1) + column(300, -1) + lamp);
}

/* ---- pool: the light on the floor. It grows from its middle. ---- */
{
    const defs = `<defs><radialGradient id="p" gradientUnits="userSpaceOnUse" cx="180" cy="332" r="94" gradientTransform="translate(0 276.67) scale(1 0.1667)">${stops([[0, C.cream, 0.85], [0.6, C.cream, 0.45], [1, C.gold, 0.2]])}</radialGradient></defs>`;
    svg('pool', [84, 314, 192, 36], defs + `<ellipse cx="180" cy="332" rx="94" ry="15.6" fill="url(#p)"/>`);
}

/* ---- beam: light from the lamp toward the pedestal: three cones, one in the other, each thin and each fading
   to nothing along its length, before it reaches the floor. The pool is where the light lands. ---- */
{
    const Y0 = 88, Y1 = 322;
    const lin = (id, list) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${Y0}" x2="0" y2="${Y1}">${stops(list)}</linearGradient>`;
    const defs = `<defs>${lin('a', [[0, C.cream, 0.1], [0.65, C.cream, 0.06], [1, C.cream, 0]])}${lin('b', [[0, C.cream, 0.12], [0.7, C.cream, 0.07], [1, C.cream, 0]])}${lin('c', [[0, C.cream, 0.2], [0.75, C.gold, 0.1], [1, C.gold, 0]])}</defs>`;
    const cone = (top, bottom) => `M${180 - top} ${Y0}H${180 + top}L${180 + bottom} ${Y1}H${180 - bottom}Z`;
    svg('beam', [86, 86, 188, 238], defs + `<path d="${cone(13, 92)}" fill="url(#a)"/><path d="${cone(10, 64)}" fill="url(#b)"/><path d="${cone(6, 38)}" fill="url(#c)"/>`);
}

/** The cloth's outline: a small peak over the casket's knob, the casket's corners, the pedestal's shoulders, a hem in points. */
const CLOTH = 'M180 203C184 212 198 213 207 221C210 232 211 242 219 250L232 325L220 332L208 324L194 333L180 325L166 333L152 324L140 332L128 325L141 250C149 242 150 232 153 221C162 213 176 212 180 203Z';
const PBOX = [120, 198, 120, 140];

/* ---- aura: a soft warm light standing behind the casket once the cloth has gone. ---- */
{
    const defs = `<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="180" cy="226" r="46" gradientTransform="translate(0 -56.5) scale(1 1.25)">${stops([[0, C.cream, 0.6], [0.45, C.gold, 0.26], [1, C.gold, 0]])}</radialGradient></defs>`;
    svg('aura', [134, 168, 92, 116], defs + `<ellipse cx="180" cy="226" rx="46" ry="57.5" fill="url(#g)"/>`);
}

/* ---- plinth: a low fluted pedestal in pale stone, and on it a plain gold casket with an arched lid and a knob. ---- */
{
    let s = `<ellipse cx="180" cy="327" rx="54" ry="6" fill="${C.ground}" opacity="0.5"/>`;
    // Pedestal: base, fluted shaft, cap.
    s += rect(142, 313, 76, 11, C.cream, 1, 1.5) + rect(142, 313, 76, 2.2, C.gold) + rect(196, 315.2, 22, 8.8, C.goldLo, 0.3);
    s += rect(150, 257, 60, 56, C.cream);
    for (const x of [156.5, 165.5, 174.5, 183.5, 192.5, 201.5]) s += rect(x, 261, 2.4, 48, C.goldLo, 0.34, 1.2);
    s += rect(194, 257, 16, 56, C.goldLo, 0.24);
    s += rect(144, 248, 72, 9, C.cream, 1, 1.5) + rect(144, 254.8, 72, 2.2, C.goldLo, 0.55) + rect(196, 248, 20, 6.8, C.goldLo, 0.24);
    // Casket: feet, body, a band, the lid, the knob.
    s += poly([[158, 248], [164, 248], [162, 244], [158, 244]], C.goldLo) + poly([[196, 248], [202, 248], [202, 244], [198, 244]], C.goldLo);
    s += rect(156, 226, 48, 18.5, C.gold) + rect(188, 226, 16, 18.5, C.goldLo, 0.55);
    s += rect(156, 233.5, 48, 2.2, C.goldLo) + diamond(180, 234.6, 4.2, 4.2, C.cream) + diamond(180, 234.6, 2.2, 2.2, C.goldLo);
    s += path('M153.5 226.5C158 217 170 213.5 180 213.5C190 213.5 202 217 206.5 226.5Z', C.gold);
    s += path('M180 213.5C190 213.5 202 217 206.5 226.5H190C189 221 186 216 180 213.5Z', C.goldLo, 0.5);
    s += stroke('M158 224C162 218.6 170 216.2 177 216', C.cream, 1.3, 0.8, ' stroke-linecap="round"');
    s += rect(153.5, 225.2, 53, 2.4, C.goldLo, 1, 1.2);
    s += rect(178.6, 208, 2.8, 6, C.goldLo) + circle(180, 206.8, 3, C.gold);
    svg('plinth', PBOX, s);
}

/* ---- cloth: the cloth over the casket and the pedestal, whisked away at the end. ---- */
{
    let s = path(CLOTH, C.cream);
    // The side away from the light.
    s += path('M186 207C190 212 200 214 207 221C210 232 211 242 219 250L232 325L220 332L208 324L203 327L196 250C196 236 192 220 186 207Z', C.goldLo, 0.28);
    // Folds: thin wedges from the shoulder down to the hem's valleys, and two from the peak.
    for (const [x, hem] of [[152, 324], [180, 325], [208, 324]]) s += poly([[x - 4.5, 254], [x + 4.5, 254], [x + 1, hem], [x - 1, hem]], C.goldLo, 0.32);
    for (const [x, hem] of [[166, 333], [194, 333]]) s += poly([[x - 1.2, 258], [x + 1.2, 258], [x, hem - 8]], C.goldLo, 0.28);
    s += poly([[180, 205], [171, 250], [166, 250]], C.goldLo, 0.2) + poly([[181, 206], [186, 250], [189, 250]], C.goldLo, 0.2);
    // A gold cord where the cloth breaks over the pedestal's edge.
    s += rect(142, 249, 76, 2.6, C.gold) + rect(142, 251.6, 76, 1.3, C.goldLo, 0.6);
    svg('cloth', PBOX, s);
}

/* ---- shade: the cloth's outline in the dark of the set. It lies on the cloth until the light lands. ---- */
svg('shade', PBOX, path(CLOTH, C.nightLo, 0.8));

/* ---- dust: gold dust hanging in the beam. ---- */
{
    let s = '';
    const motes = [[176, 78, 1.2, 0.8], [186, 104, 0.9, 0.6], [170, 128, 1.5, 0.9], [194, 146, 1, 0.7], [160, 164, 1.1, 0.6], [182, 172, 1.7, 0.9], [204, 186, 1.2, 0.7], [150, 200, 1.4, 0.8], [172, 204, 0.9, 0.55], [216, 214, 1, 0.6], [142, 232, 1.1, 0.6], [224, 244, 1.5, 0.8], [132, 262, 1.3, 0.7], [236, 274, 1, 0.55], [150, 282, 0.9, 0.5], [214, 292, 1.2, 0.6], [198, 122, 0.8, 0.5], [164, 100, 0.8, 0.5]];
    for (const [x, y, r, a] of motes) s += circle(x, y, r, C.gold, a);
    for (const [x, y, k] of [[190, 88, 1], [156, 144, 1.3], [210, 164, 1], [138, 214, 1.2], [228, 226, 1.1], [166, 186, 0.9]]) s += diamond(x, y, 1.3 * k, 4.2 * k, C.cream, 0.9) + diamond(x, y, 4.2 * k, 1.3 * k, C.cream, 0.9);
    svg('dust', [112, 60, 136, 240], s);
}

/* ---- the wings: velvet, drawn as flat vertical folds: a ridge in the mid red with a light edge and a
   turned edge, a valley in the deep red with a line of shadow. Each ridge ends in a round hem; a gold
   band rides the hem. `X` mirrors the left wing into the right one. ---- */
function wing(X) {
    const ridges = [20, 23, 18, 25, 20, 22, 16];
    const valleys = [8, 7, 9, 7, 8, 7];
    const TOP = 20;
    const band = (x, y, w, h, fill, a) => {
        const [a0, a1] = [X(x), X(x + w)];
        return rect(Math.min(a0, a1), y, w, h, fill, a);
    };
    let s = '', x = -8;
    ridges.forEach((w, i) => {
        const x1 = x + w, mid = x + w / 2;
        s += path(`M${f(X(x))} ${TOP}V${HEM}Q${f(X(mid))} ${HEM + 15} ${f(X(x1))} ${HEM}V${TOP}Z`, C.velvet);
        // The lit edge (toward the middle of the stage, where the light leaks) and the edge that turns away.
        s += band(x1 - 5.5, TOP, 3, HEM - TOP - 24, C.velvetHi, 0.75);
        s += band(x, TOP, 4.5, HEM - TOP + 1, C.velvetLo, 0.55);
        // The gold band, following the hem, and a thin line over it.
        s += stroke(`M${f(X(x))} ${HEM - 15}Q${f(X(mid))} ${HEM} ${f(X(x1))} ${HEM - 15}`, C.gold, 4);
        s += stroke(`M${f(X(x))} ${HEM - 23}Q${f(X(mid))} ${HEM - 8} ${f(X(x1))} ${HEM - 23}`, C.gold, 1.2, 0.8);
        x = x1;
        if (i < valleys.length) {
            const v = valleys[i];
            s += band(x, TOP, v, HEM - TOP - 3, C.velvetLo);
            s += band(x + v / 2 - 1, TOP, 2, HEM - TOP - 3, C.ground, 0.45);
            s += band(x, HEM - 17, v, 4, C.goldLo);
            x += v;
        }
    });
    // The valance's shadow across the top of the folds.
    s += rect(Math.min(X(-8), X(182)), TOP, 190, 52, C.ground, 0.32);
    return s;
}
svg('wing-l', [-8, 20, 190, 330], wing(x => x));
svg('wing-r', [178, 20, 190, 330], wing(x => 360 - x));

/* ---- blade: the light that leaks through the gap, and what it throws on the floor. ---- */
{
    const defs =
        `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="164" y1="0" x2="196" y2="0">${stops([[0, C.cream, 0], [0.5, C.cream, 0.5], [1, C.cream, 0]])}</linearGradient>` +
        `<linearGradient id="s" gradientUnits="userSpaceOnUse" x1="0" y1="${HEM}" x2="0" y2="${LIP}">${stops([[0, C.cream, 0.6], [1, C.cream, 0.1]])}</linearGradient></defs>`;
    let s = `<rect x="164" y="44" width="32" height="${HEM - 44 + 6}" fill="url(#g)"/>`;
    s += rect(179, 44, 2, HEM - 44 + 8, C.cream);
    s += `<path d="M179 ${HEM + 4}H181L196 ${LIP}H164Z" fill="url(#s)"/>`;
    svg('blade', [164, 44, 32, 314], defs + s);
}

/* ---- valance: a pelmet, swags with gold fringe, and pleated tails where the swags meet. ---- */
const JOINS = [-42, 32, 106, 180, 254, 328, 402];
{
    let s = '';
    const Y0 = 18;
    const arc = (xa, xb, d, dy = 0) => `M${xa} ${Y0 + dy}Q${(xa + xb) / 2} ${Y0 + dy + 2 * d} ${xb} ${Y0 + dy}`;
    for (let i = 0; i < JOINS.length - 1; i++) {
        const xa = JOINS[i], xb = JOINS[i + 1];
        // The fringe first, so that the swag's own edge covers its roots.
        s += stroke(arc(xa, xb, 44, 5), C.gold, 8, 1, ' stroke-dasharray="1.5 1.7"');
        s += path(arc(xa, xb, 44) + 'Z', C.velvet);
        s += stroke(arc(xa + 5, xb - 5, 33), C.velvetLo, 3.4);
        s += stroke(arc(xa + 10, xb - 10, 21), C.velvetLo, 3);
        s += stroke(arc(xa + 16, xb - 16, 10), C.velvetLo, 2.4);
        s += stroke(arc(xa + 3, xb - 3, 39.5), C.velvetHi, 1.6, 0.8);
        s += stroke(arc(xa, xb, 44), C.goldLo, 2.2);
    }
    // The pelmet above the swags.
    s += rect(-10, -10, 380, 30, C.velvetLo) + rect(-10, 18, 380, 2.6, C.gold) + rect(-10, 6, 380, 1.2, C.goldLo, 0.8);
    for (let x = 6; x < 360; x += 24) s += diamond(x, 12.4, 2.4, 2.4, C.gold, 0.9);
    // Tails: a pleated drop at each join, tipped in gold.
    for (const x of JOINS) {
        s += poly([[x - 11, 20], [x + 11, 20], [x + 8, 58], [x, 68], [x - 8, 58]], C.velvetLo);
        s += poly([[x - 4, 20], [x + 4, 20], [x + 3, 60], [x, 64], [x - 3, 60]], C.velvet);
        s += poly([[x - 8, 58], [x, 68], [x + 8, 58], [x + 8, 54], [x, 64], [x - 8, 54]], C.gold);
        s += circle(x, 24, 3.4, C.gold);
    }
    svg('valance', [-10, -10, 380, 84], s);
}

/* ---- cords: a tie cord with a tassel, hanging from the valance. Two layers, to sway apart. ---- */
function cord(x) {
    let s = stroke(`M${x} 38V112`, C.gold, 2.6, 1, ' stroke-dasharray="4 1.6"');
    s += circle(x, 115, 5, C.gold) + rect(x - 5.5, 119, 11, 4.5, C.goldLo, 1, 1.5);
    s += poly([[x - 5, 123.5], [x + 5, 123.5], [x + 8.5, 149], [x - 8.5, 149]], C.gold);
    for (const dx of [-3.4, 0, 3.4]) s += stroke(`M${f(x + dx * 0.7)} 125L${f(x + dx * 1.5)} 148`, C.goldLo, 1.1);
    return s;
}
svg('cord-l', [17, 36, 30, 116], cord(32));
svg('cord-r', [313, 36, 30, 116], cord(328));

/* ---- glow: one footlight's light, thrown up the curtain. One layer for each lamp. ---- */
FEET.forEach((x, i) => {
    const defs = `<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${x}" cy="${LIP - 2}" r="34" gradientTransform="translate(0 ${f(-(LIP - 2) * 0.5)}) scale(1 1.5)">${stops([[0, C.cream, 0.75], [0.4, C.gold, 0.32], [1, C.gold, 0]])}</radialGradient></defs>`;
    svg(`glow-${i + 1}`, [x - 34, LIP - 54, 68, 58], defs + `<ellipse cx="${x}" cy="${LIP - 2}" rx="34" ry="51" fill="url(#g)"/>` + circle(x, LIP, 15.5, C.cream, 0.95));
});

/* ---- front: the stage's lip, the footlights' shells (their backs are to the house), and the apron below:
   flutes washed by the lamps, a faint row of lozenges, and the ornamental band along the foot of the frame. ---- */
{
    const BAND = LIP + 62; // the band's top
    const defs = `<defs><linearGradient id="w" gradientUnits="userSpaceOnUse" x1="0" y1="${LIP + 8}" x2="0" y2="${BAND}">${stops([[0, C.gold, 0.3], [0.5, C.gold, 0.12], [1, C.gold, 0]])}</linearGradient></defs>`;
    let s = rect(-10, LIP, 380, 7, C.woodHi) + rect(-10, LIP + 7, 380, 100, C.wine);
    for (let x = -6; x < 370; x += 12) s += rect(x, LIP + 16, 2, BAND - LIP - 16, C.ground, 0.55);
    s += `<rect x="-10" y="${LIP + 8}" width="380" height="${BAND - LIP - 8}" fill="url(#w)"/>`;
    s += rect(-10, LIP + 7, 380, 1.6, C.gold) + rect(-10, LIP + 14, 380, 1.2, C.goldLo, 0.8);
    // The faint row: small lozenges between the lamps, a thin rule through them.
    s += rect(-10, LIP + 37.4, 380, 1, C.goldLo, 0.4);
    for (let x = 12; x < 360; x += 24) s += diamond(x, LIP + 38, x % 48 === 12 ? 5 : 2.4, x % 48 === 12 ? 3.4 : 2.4, C.goldLo, 0.75);
    // The band along the foot.
    s += rect(-10, BAND, 380, 40, C.wine) + rect(-10, BAND, 380, 1.4, C.gold, 0.9) + rect(-10, BAND + 26, 380, 1.2, C.goldLo, 0.8);
    for (const x of FEET) s += diamond(x, BAND + 13.6, x === 180 ? 14 : 8.5, x === 180 ? 8 : 5.4, x === 180 ? C.gold : C.goldLo);
    for (let i = 0; i < FEET.length - 1; i++) s += diamond(FEET[i] + 24, BAND + 13.6, 2.4, 2.4, C.gold, 0.85);
    for (let x = -6; x < 370; x += 12) s += rect(x, BAND + 28, 2, 12, C.ground, 0.55);
    for (const x of FEET) {
        s += path(`M${x - 13} ${LIP + 1}A13 13 0 0 1 ${x + 13} ${LIP + 1}Z`, C.goldLo);
        s += path(`M${x - 13} ${LIP + 1}A13 13 0 0 1 ${x} ${LIP - 12}V${LIP + 1}Z`, C.ground, 0.25);
        for (const a of [-52, -18, 18, 52]) {
            const r = (a * Math.PI) / 180;
            s += stroke(`M${x} ${LIP + 1}L${f(x + 12.4 * Math.sin(r))} ${f(LIP + 1 - 12.4 * Math.cos(r))}`, C.ground, 1, 0.45);
        }
        s += rect(x - 15, LIP - 1, 30, 3, C.gold, 1, 1.5);
    }
    svg('front', [-10, 340, 380, 116], defs + s);
}

/* ---- fleck: gold dust thrown off as the light lands. ---- */
svg('fleck', [177, 218, 6, 6], diamond(180, 221, 3, 3, C.gold));
