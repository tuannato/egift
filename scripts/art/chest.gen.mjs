// Generator for the "chest" wrapper art: a sea chest on the sand of a cave, seen straight on, the cave
// mouth framing a dusk sky, a calm sea and a small ship at anchor. Flat shapes, two or three tones a
// surface, no outline, no filter; light is a plain gradient with alpha stops. Every colour is in the
// palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/chest.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'chest');
if (!OUT.endsWith('wrappers/chest')) throw new Error('out dir must be public/wrappers/chest');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: three teal-navies for rock and sea (the darkest is also the iron), a wine for the dusk and
   the lid's lining, two sands, two tarred woods, brass, torch orange, and the gold of the light. */
const C = {
    night: '#0A1721',
    cave: '#143242',
    teal: '#2A6272',
    wine: '#8C2F3B',
    sand: '#E8CC98',
    sandLo: '#BD9862',
    woodDk: '#3E2517',
    wood: '#6A4126',
    brass: '#C9973E',
    orange: '#EE8030',
    gold: '#FFD884',
};

const f = n => String(Math.round(n * 100) / 100);
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
const op = a => (a < 1 ? ` opacity="${f(a)}"` : '');
const rect = (x, y, w, h, fill, a = 1, rx = 0) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${f(rx)}"` : ''} fill="${fill}"${op(a)}/>`;
const circle = (cx, cy, r, fill, a = 1) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${op(a)}/>`;
const ellipse = (cx, cy, rx, ry, fill, a = 1) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${op(a)}/>`;
const poly = (pts, fill, a = 1) => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${op(a)}/>`;
const path = (d, fill, a = 1) => `<path d="${d}" fill="${fill}"${op(a)}/>`;
const stroke = (d, col, w, a = 1, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(w)}"${extra}${op(a)}/>`;
const ROUND = ' stroke-linecap="round"';
const stops = list => list.map(([o, c, a]) => `<stop offset="${f(o)}" stop-color="${c}" stop-opacity="${f(a)}"/>`).join('');
const radial = (id, cx, cy, r, list) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">${stops(list)}</radialGradient>`;
const linear = (id, x1, y1, x2, y2, list) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}">${stops(list)}</linearGradient>`;
/** A four-pointed glint: two thin diamonds. */
const glint = (cx, cy, r, fill, a = 1) => poly([[cx, cy - r], [cx + r * 0.24, cy], [cx, cy + r], [cx - r * 0.24, cy]], fill, a) + poly([[cx - r, cy], [cx, cy - r * 0.24], [cx + r, cy], [cx, cy + r * 0.24]], fill, a);

/* The scene's measures. */
const HORIZON = 166;
const SHORE = 290; // where the sea meets the sand
const HINGE = 252; // the chest's back edge, as seen from a little above
const RIM = 290; // the chest's front edge: the lid closes on it

/* The cave mouth: an arch, clockwise from its left foot. */
const ARCH = [[52, 314], [56, 264], [42, 214], [52, 162], [66, 112], [92, 74], [126, 46], [164, 32], [200, 26], [238, 34], [270, 54], [298, 88], [314, 132], [320, 182], [310, 232], [322, 276], [316, 314]];
/** The rock faces round the mouth that are turned to the opening: one quad a side of the arch, of uneven depth. */
const FACES = (() => {
    const c = [181, 196];
    const depth = [34, 52, 30, 46, 58, 36, 50, 30, 44, 56, 34, 48, 60, 38, 52, 30, 40];
    const out = ARCH.map(([x, y], i) => {
        const d = Math.hypot(x - c[0], y - c[1]);
        return [x + ((x - c[0]) / d) * depth[i], y + ((y - c[1]) / d) * depth[i]];
    });
    return ARCH.slice(0, -1).map((a, i) => [a, ARCH[i + 1], out[i + 1], out[i]]);
})();

/** Three teeth of rock hanging from the roof: [left root, ridge, right root, tip]. */
const TEETH = [[[136, 42], [153, 30], [166, 32], [153, 86]], [[208, 28], [223, 26], [234, 33], [224, 64]], [[90, 74], [103, 56], [112, 58], [100, 104]]];

/* ---- vista: what the mouth frames. Dusk in broad rings about the point where the sun went down, long
   bars of cloud, a calm sea with the light lying on it, and a three-masted ship at anchor, sails furled. ---- */
{
    const B = [34, 22, 294, 294];
    let s = rect(B[0], B[1], B[2], B[3], C.teal) + rect(B[0], B[1], B[2], HORIZON - B[1], C.wine, 0.62);
    for (const [rx, ry, col, a] of [[262, 122, C.wine, 0.9], [204, 86, C.orange, 0.7], [156, 54, C.orange, 1], [118, 25, C.gold, 0.9]]) s += ellipse(196, HORIZON, rx, ry, col, a);
    // Cloud: long flat bars with one stepped end, none like another.
    for (const [x, y, w, h, col, a] of [[70, 66, 96, 7, C.wine, 0.8], [96, 73, 118, 5, C.wine, 0.8], [204, 96, 92, 6, C.gold, 0.5], [236, 102, 70, 4, C.gold, 0.5], [60, 122, 74, 5, C.gold, 0.45]]) s += rect(x, y, w, h, col, a, h / 2);
    // The sea, darker toward the shore, and the last light on it: bars that shorten and thin toward the viewer.
    s += rect(B[0], HORIZON, B[2], 152, C.teal) + rect(B[0], 212, B[2], 106, C.cave, 0.45) + rect(B[0], 262, B[2], 56, C.cave, 0.5);
    s += rect(B[0], HORIZON - 1, B[2], 2.4, C.gold, 0.85);
    for (const [x, y, w, h, a] of [[142, 172, 112, 4, 0.9], [164, 181, 86, 3.4, 0.8], [150, 190, 62, 3, 0.7], [186, 198, 70, 3, 0.6], [170, 207, 40, 2.6, 0.5], [60, 186, 40, 2.4, 0.35], [262, 178, 44, 2.4, 0.4], [280, 200, 30, 2.2, 0.3], [70, 226, 54, 2.4, 0.25], [258, 240, 46, 2.4, 0.22], [84, 262, 38, 2.4, 0.2]]) s += rect(x, y, w, h, C.gold, a, h / 2);
    // The ship: a low hull, three masts with their yards crossed, a bowsprit, the stays as thin lines.
    {
        const W = HORIZON + 1;
        let b = path(`M86 ${W - 9}L90 ${W}H132L140 ${W - 10}L130 ${W - 7}H98L90 ${W - 10}Z`, C.night);
        for (const [x, h, yards] of [[101, 31, [[9, 14], [19, 10]]], [113, 38, [[10, 16], [22, 12], [31, 7]]], [125, 29, [[9, 13], [18, 9]]]]) {
            b += rect(x - 0.8, W - 8 - h, 1.6, h, C.night);
            for (const [up, w] of yards) b += rect(x - w / 2, W - 8 - up, w, 1.8, C.night, 1, 0.9);
        }
        b += stroke(`M139 ${W - 10}L152 ${W - 15}`, C.night, 1.5, 1, ROUND);
        b += stroke(`M152 ${W - 15}L125 ${W - 37}M152 ${W - 15}L113 ${W - 46}M113 ${W - 46}L101 ${W - 39}L88 ${W - 9}M113 ${W - 46}L125 ${W - 37}`, C.night, 0.6, 0.9);
        b += poly([[113, W - 50], [121, W - 48.2], [113, W - 46.4]], C.night);
        // Its shadow on the water.
        for (const [x, y, w] of [[92, W + 3, 40], [98, W + 8, 26], [106, W + 13, 12]]) b += rect(x, y, w, 2, C.night, 0.4, 1);
        s += b;
    }
    svg('vista', B, s);
}

/* ---- fronds: palm leaves hanging into the mouth from outside, top right. Each is a rib with bold flat blades. ---- */
{
    const frond = (p0, p1, p2, n, len, droop, a, b) => {
        let s = '';
        const at = t => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
        for (let side = 0; side < 2; side += 1) {
            for (let i = 0; i < n; i += 1) {
                const t = 0.16 + (0.84 * i) / (n - 1);
                const [x, y] = at(t);
                const [x1, y1] = at(Math.min(1, t + 0.02));
                const d = Math.hypot(x1 - x, y1 - y) || 1;
                const tx = (x1 - x) / d, ty = (y1 - y) / d;
                const sgn = side === 0 ? 1 : -1;
                // Out from the rib and a little forward along it; every blade pulled down by its weight.
                let bx = -ty * sgn * 0.82 + tx * 0.58, by = tx * sgn * 0.82 + ty * 0.58 + droop;
                const bl = Math.hypot(bx, by);
                bx /= bl; by /= bl;
                const L = len * (0.5 + 0.5 * Math.sin(Math.PI * (0.12 + 0.8 * t))) * (i % 2 ? 1 : 0.86);
                const tip = [x + bx * L, y + by * L];
                const mid = [x + bx * L * 0.45, y + by * L * 0.45];
                const w = 4.6;
                s += path(`M${f(x)} ${f(y)}Q${f(mid[0] - by * w)} ${f(mid[1] + bx * w)} ${f(tip[0])} ${f(tip[1])}Q${f(mid[0] + by * w)} ${f(mid[1] - bx * w)} ${f(x)} ${f(y)}Z`, side === 0 ? a : b);
            }
        }
        return s + stroke(`M${p0[0]} ${p0[1]}Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`, a, 2.6, 1, ROUND);
    };
    const s = frond([336, 44], [300, 66], [284, 150], 9, 40, 0.5, C.night, C.cave) + frond([340, 24], [262, 18], [212, 92], 11, 46, 0.55, C.cave, C.night);
    svg('fronds', [176, 6, 172, 172], s);
}

/* ---- cave: the rock, with the mouth cut out of it. The faces turned to the opening are lighter, in
   facets; three teeth of rock hang from the roof. ---- */
{
    const hole = `M${ARCH.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
    let s = `<path d="M-6 -6H366V456H-6Z${hole}" fill="${C.night}" fill-rule="evenodd"/>`;
    const tone = [[C.cave, 1], [C.cave, 0.6], [C.teal, 0.42], [C.cave, 0.8], [C.cave, 0.45], [C.teal, 0.3], [C.cave, 1], [C.cave, 0.55]];
    FACES.forEach((q, i) => {
        const [col, a] = tone[i % tone.length];
        s += poly(q, col, a);
    });
    // Large quiet planes further out.
    s += poly([[-6, -6], [118, -6], [40, 60], [-6, 132]], C.cave, 0.35) + poly([[366, 190], [366, 330], [340, 250]], C.cave, 0.4) + poly([[-6, 200], [14, 250], [-6, 300]], C.cave, 0.4) + poly([[250, -6], [366, -6], [366, 60], [318, 30]], C.cave, 0.3);
    // Teeth of rock from the roof: one face lit, one not.
    for (const [a, m, b, tip] of TEETH) s += poly([a, m, tip], C.cave) + poly([m, b, tip], C.night);
    svg('cave', [-6, -6, 372, 462], s);
}

/* ---- sand: the floor of the cave. A lit pool of sand under the mouth, the walls' shadow at each side,
   a shovel left standing on the right, the chest's shadow. ---- */
{
    const shore = `M-6 ${SHORE + 2}C60 ${SHORE - 6} 120 ${SHORE + 6} 180 ${SHORE}C240 ${SHORE - 6} 300 ${SHORE + 4} 366 ${SHORE - 2}`;
    let s = path(`${shore}V456H-6Z`, C.sand);
    s += stroke(shore, C.gold, 2.4, 0.9);
    // The shadow of the walls, hard-edged, either side of the pool of light.
    s += poly([[-6, SHORE - 6], [58, SHORE - 4], [34, 372], [70, 456], [-6, 456]], C.night, 0.5) + poly([[366, SHORE - 6], [308, SHORE - 2], [334, 380], [300, 456], [366, 456]], C.night, 0.5);
    // Ripples in the sand: a few uneven strokes.
    for (const d of ['M96 398C120 392 150 400 176 396', 'M204 414C232 408 262 416 292 410', 'M150 432C176 426 206 434 232 430', 'M66 440C84 436 100 442 118 438', 'M250 438C266 434 280 440 296 436']) s += stroke(d, C.sandLo, 2, 0.8, ROUND);
    for (const [x, y, rx, ry] of [[196, 400, 4, 2.4], [222, 426, 3, 2], [136, 420, 2.6, 1.8], [270, 424, 4.4, 2.6], [182, 444, 3.4, 2]]) s += ellipse(x, y, rx, ry, C.sandLo);
    // The chest's shadow, thrown to the right of the torch.
    s += path('M70 382H294L318 392C290 398 120 398 76 392Z', C.night, 0.38);
    // The shovel: its blade half in the sand, the shaft leaning away, a short grip across the top.
    s += path('M309 360C309 353 314 351 322 352C330 353 335 355 335 362L334 388H308Z', C.cave) + path('M322 352C330 353 335 355 335 362L334 388H321Z', C.night, 0.5);
    s += stroke('M322 356L335 252', C.wood, 5, 1, ROUND) + stroke('M326 251L345 253.4', C.woodDk, 5.5, 1, ROUND);
    s += path('M296 392C304 380 334 378 346 390C340 396 304 398 296 392Z', C.sand) + stroke('M300 392C312 386 330 386 342 391', C.sandLo, 2, 0.9, ROUND);
    // A rock in the near right corner.
    s += poly([[366, 410], [338, 404], [318, 424], [312, 456], [366, 456]], C.night) + poly([[338, 404], [318, 424], [340, 436], [366, 420], [366, 410]], C.cave, 0.9);
    svg('sand', [-6, 244, 372, 212], s);
}

/* ---- wedge: the torch's light. A halo round the flame, and a flat wedge of it across the sand. ---- */
{
    const defs = `<defs>${radial('h', 38, 272, 62, [[0, C.orange, 0.55], [0.5, C.orange, 0.2], [1, C.orange, 0]])}${radial('w', 38, 290, 220, [[0, C.gold, 0.5], [0.45, C.orange, 0.28], [1, C.orange, 0]])}</defs>`;
    svg('wedge', [-6, 208, 226, 248], defs + `<circle cx="38" cy="272" r="62" fill="url(#h)"/>` + `<path d="M40 292L136 304L220 456H-6V318Z" fill="url(#w)"/>`);
}

/* ---- flame: two flat tongues, turning about the cup. ---- */
svg('flame', [22, 244, 32, 48], path('M38 246C45 260 52 268 50 278C49 286 44 290 38 290C32 290 26 286 26 277C26 268 35 261 38 246Z', C.orange) + path('M38 264C42 271 45 276 44 281C43 286 41 288 38 288C35 288 32 286 32 281C32 276 36 271 38 264Z', C.gold));

/* ---- tint: the gold's light on the cave. The rock faces round the mouth take it, most where they are
   nearest the chest; a pool of it lies on the sand. Comes on as the lid opens. ---- */
{
    let s = `<defs>${radial('p', 180, 392, 172, [[0, C.gold, 0.5], [0.55, C.orange, 0.2], [1, C.orange, 0]])}</defs>`;
    FACES.forEach((q, i) => {
        const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
        const a = Math.min(0.62, Math.max(0, 1 - Math.hypot(cx - 180, cy - 262) / 290));
        if (a > 0.03) s += poly(q, C.orange, i % 2 ? a : a * 0.72);
    });
    // The teeth of the roof take it too, on the face turned down to the chest.
    for (const [a, m, b, tip] of TEETH) s += poly([a, m, tip], C.orange, 0.34) + poly([m, b, tip], C.orange, 0.16);
    s += `<ellipse cx="180" cy="392" rx="172" ry="46" fill="url(#p)"/>`;
    svg('tint', [0, 20, 360, 420], s);
}

/* ---- the chest. Its front is 216 wide: the body from RIM down, the lid above it. ---- */
const STRAPS = [100, 238]; // left edges of the two iron straps, 22 wide
const LID = 'M68 290V250C68 228 98 218 180 216C262 218 292 228 292 250V290Z';
{
    // Lid, inside: what stands up behind the chest once it is open. A dark edge, a wine lining.
    let s = path('M76 252V204C76 184 104 176 180 174C256 176 284 184 284 204V252Z', C.woodDk);
    s += `<defs><clipPath id="c"><path d="M83 252V205C83 190 108 183 180 181C252 183 277 190 277 205V252Z"/></clipPath></defs><g clip-path="url(#c)">`;
    s += rect(76, 170, 208, 84, C.wine) + poly([[76, 170], [150, 170], [108, 254], [76, 254]], C.night, 0.26);
    for (const x of STRAPS) s += rect(x + 2, 170, 18, 84, C.night, 0.55);
    s += '</g>';
    svg('lid-in', [72, 170, 216, 82], s);
}
{
    // The well: the dark inside of the chest between its back and front edges.
    let s = poly([[78, HINGE], [282, HINGE], [288, RIM], [72, RIM]], C.night);
    s += poly([[78, HINGE], [72, RIM], [90, RIM]], C.woodDk) + poly([[282, HINGE], [288, RIM], [270, RIM]], C.woodDk) + rect(78, HINGE, 204, 7, C.woodDk, 0.8);
    svg('well', [72, 252, 216, 38], s);
}
{
    // The heap: only its top shows over the front edge. Abstract flat gold: a mound, coins as plain flat
    // ovals in two tones, and one goblet standing in it: bowl, stem and foot.
    const coin = (cx, cy, rx, turn, dark) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(rx * 0.34)}" fill="${dark ? C.orange : C.gold}"${dark ? ' opacity="0.6"' : ''} transform="rotate(${turn} ${f(cx)} ${f(cy)})"/>`;
    let s = path('M88 294C92 270 116 264 134 258C150 244 172 240 196 244C216 246 234 254 246 264C260 268 270 280 272 294Z', C.brass);
    s += path('M134 258C150 244 172 240 196 244C188 254 176 262 170 294H112C116 276 124 266 134 258Z', C.gold, 0.3);
    for (const [x, y, r, t, d] of [[118, 273, 13, -8, 0], [128, 283, 13, 4, 1], [104, 286, 10, -3, 0], [148, 263, 10, -14, 1], [236, 268, 12, 10, 0], [250, 281, 12, 2, 1], [222, 284, 11, -6, 0], [216, 257, 9, 16, 1], [154, 282, 11, 6, 0], [196, 276, 10, -4, 1]]) s += coin(x, y, r, t, d);
    // The goblet: its foot in the gold, a stem with a knop, a bowl with a dark mouth.
    s += ellipse(186, 256, 11, 3.2, C.gold) + rect(184, 242, 4, 14, C.gold) + ellipse(186, 248, 4.4, 2.4, C.gold);
    s += path('M172 230C173 240 179 244 186 244C193 244 199 240 200 230Z', C.gold) + path('M186 230H200C199 240 193 244 186 244Z', C.orange, 0.45) + rect(186, 244, 2, 12, C.orange, 0.45);
    s += ellipse(186, 230, 14, 3.4, C.gold) + ellipse(186, 230.3, 10.4, 2.1, C.woodDk, 0.85);
    svg('heap', [86, 224, 188, 68], s);
}
{
    // Glow: the light that comes up out of the chest.
    svg('glow', [36, 112, 288, 264], `<defs>${radial('g', 180, 258, 140, [[0, C.gold, 0.78], [0.38, C.gold, 0.36], [0.7, C.orange, 0.14], [1, C.orange, 0]])}</defs><circle cx="180" cy="258" r="140" fill="url(#g)"/>`);
}
{
    // Body: planks, a dark rim and plinth, two iron straps with brass rivets, brass corners, rope handles.
    let s = rect(72, RIM, 216, 92, C.wood);
    s += rect(72, 317, 216, 2, C.woodDk) + rect(72, 349, 216, 2, C.woodDk) + rect(72, RIM, 216, 8, C.woodDk);
    s += poly([[214, RIM], [288, RIM], [288, 374], [176, 374]], C.night, 0.24);
    s += rect(68, 372, 224, 12, C.woodDk);
    for (const x of STRAPS) {
        s += rect(x, RIM, 22, 94, C.night);
        for (const y of [304, 334, 365]) s += circle(x + 11, y, 2.6, C.brass);
    }
    for (const m of [1, -1]) {
        const X = x => 180 + m * (x - 180);
        s += poly([[X(68), 384], [X(68), 358], [X(77), 358], [X(77), 375], [X(94), 375], [X(94), 384]], C.brass);
        // A loop of rope through two iron eyes.
        const loop = `M${X(72)} 322C${X(46)} 324 ${X(46)} 356 ${X(72)} 358`;
        s += stroke(loop, C.brass, 5.5, 1, ROUND) + stroke(loop, C.woodDk, 5.5, 0.55, ' stroke-dasharray="1.4 4.2"');
        s += rect(Math.min(X(66), X(76)), 316, 10, 10, C.night, 1, 2) + rect(Math.min(X(66), X(76)), 353, 10, 10, C.night, 1, 2);
    }
    svg('body', [48, 290, 264, 96], s);
}
{
    // Lid, front: a low curved top, planks, a dark skirt, the straps going over, brass at the corners.
    let s = `<defs><clipPath id="c"><path d="${LID}"/></clipPath></defs><g clip-path="url(#c)">`;
    s += rect(64, 212, 232, 80, C.wood) + rect(64, 247, 232, 2, C.woodDk) + rect(64, 276, 232, 14, C.woodDk);
    s += poly([[226, 212], [296, 212], [296, 290], [196, 290]], C.night, 0.24);
    for (const x of STRAPS) {
        s += rect(x, 212, 22, 80, C.night);
        for (const y of [233, 261, 283]) s += circle(x + 11, y, 2.6, C.brass);
    }
    for (const m of [1, -1]) {
        const X = x => 180 + m * (x - 180);
        s += poly([[X(68), 290], [X(68), 268], [X(77), 268], [X(77), 281], [X(92), 281], [X(92), 290]], C.brass);
    }
    s += '</g>';
    svg('lid', [68, 216, 224, 74], s);
}
{
    // Seam: the line of light under the lid, and a little of it above and below.
    const s = `<defs>${linear('s', 0, 282, 0, 298, [[0, C.gold, 0], [0.5, C.gold, 0.55], [1, C.gold, 0]])}</defs><rect x="72" y="282" width="216" height="16" fill="url(#s)"/>` + rect(74, 288.8, 212, 2.4, C.gold, 1, 1.2);
    svg('seam', [72, 282, 216, 16], s);
}
{
    // Hasps: two brass tongues hinged on the body, reaching up over the lid's edge.
    const hasp = x => path(`M${x - 6.5} 309V277C${x - 6.5} 268 ${x + 6.5} 268 ${x + 6.5} 277V309C${x + 6.5} 314 ${x - 6.5} 314 ${x - 6.5} 309Z`, C.brass) + rect(x - 2.2, 275, 4.4, 10, C.woodDk, 1, 2.2) + circle(x, 306, 2.6, C.night);
    svg('hasp-l', [137, 268, 18, 46], hasp(146));
    svg('hasp-r', [205, 268, 18, 46], hasp(214));
}
{
    // Lock plate: a round of brass, a paler inner round, a keyhole, four studs. It turns.
    const [cx, cy] = [180, 316];
    let s = circle(cx, cy, 21, C.brass) + circle(cx, cy, 14.5, C.gold, 0.55);
    s += circle(cx, cy - 3.4, 4.2, C.night) + poly([[cx - 2.6, cy - 1.4], [cx + 2.6, cy - 1.4], [cx + 3.8, cy + 9], [cx - 3.8, cy + 9]], C.night);
    for (const a of [45, 135, 225, 315]) s += circle(cx + 17.6 * Math.cos((a * Math.PI) / 180), cy + 17.6 * Math.sin((a * Math.PI) / 180), 1.7, C.woodDk);
    svg('lock', [158, 294, 44, 44], s);
}

/* ---- props: what stands nearest. A rock in the left corner with the torch wedged in it (a stave, a brass
   cup at its head), and a coil of rope lying in front of the chest, its end run out across the sand. ---- */
{
    let s = poly([[-6, 372], [14, 356], [44, 362], [62, 388], [56, 428], [30, 456], [-6, 456]], C.night) + poly([[14, 356], [44, 362], [40, 392], [10, 384]], C.cave) + poly([[14, 356], [44, 362], [40, 372], [16, 367]], C.orange, 0.45);
    s += stroke('M27 366L37 300', C.wood, 5, 1, ROUND) + poly([[30, 289], [46, 289], [43, 304], [33, 304]], C.brass) + rect(28.5, 286, 19, 4, C.woodDk, 1, 2);
    const end = 'M132 416C150 420 160 428 150 438C144 443 134 440 130 436';
    s += stroke(end, C.brass, 5.5, 1, ROUND) + stroke(end, C.woodDk, 5.5, 0.55, ' stroke-dasharray="1.4 4.2"');
    for (const y of [421, 414, 407]) s += ellipse(108, y, 31, 10.5, C.woodDk) + ellipse(108, y - 1.6, 31, 9.6, C.brass);
    s += ellipse(108, 405.4, 17, 4.6, C.woodDk) + ellipse(108, 406.6, 13, 3, C.sandLo);
    svg('props', [-6, 284, 166, 172], s);
}

/* ---- four small glints inside the lid, in two sets that take turns; and a mote of light: a few rise when the lid goes up. ---- */
svg('glint-a', [104, 192, 138, 30], glint(112, 214, 5, C.gold) + glint(236, 198, 3.5, C.gold));
svg('glint-b', [140, 190, 120, 40], glint(252, 222, 4.5, C.gold) + glint(146, 196, 3.5, C.gold));
svg('spark', [177, 221, 6, 6], circle(180, 224, 1.6, C.gold));
