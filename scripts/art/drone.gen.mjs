// Generator for the "drone" wrapper art: a balcony at dusk seen straight on, a delivery drone
// over a skyline, a parcel that ends on a small round table. Flat shapes, no outline, no filter,
// no blend mode. The only gradients are the sky (one colour into another) and alpha fades of the
// one warm light: the lit bulbs and the glow over the open box.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/drone.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeSvg } from '../svg-allow.mjs';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'drone');
if (!OUT.endsWith('wrappers/drone')) throw new Error('out dir must be public/wrappers/drone');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two ends of the dusk sky, two violet-greys for the city, the balcony's plum, the drone's
   off-white and dark grey, the parcel's coral and its cream ribbon, the one warm light, one leaf green. */
const C = {
    peach: '#F6B08A',
    violet: '#5B4B8A',
    cityFar: '#8572A6',
    cityNear: '#4A3F6B',
    plum: '#2A2038',
    white: '#F2F0EA',
    grey: '#3A3A44',
    coral: '#E4572E',
    cream: '#FBE9CF',
    light: '#FFD98A',
    leaf: '#4F8068',
};

const f = n => String(Math.round(n * 100) / 100);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(pt).join('L')}Z" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const rrect = (x, y, w, h, r, fill, extra = '') => rect(x, y, w, h, fill, ` rx="${f(r)}"${extra}`);
const bar = (x, y, w, h, fill, extra = '') => rrect(x, y, w, h, h / 2, fill, extra);
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra}/>`;
const line = (a, b, stroke, w, extra = '') => `<path d="M${pt(a)}L${pt(b)}" fill="none" stroke="${stroke}" stroke-width="${f(w)}" stroke-linecap="round"${extra}/>`;
const op = a => ` opacity="${a}"`;

const boxes = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    const { svg: clean, problems } = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
    if (clean === undefined) throw new Error(`${name}: ${problems.join('; ')}`);
    writeFileSync(join(OUT, `${name}.svg`), clean);
    boxes[name] = box;
}

/* ---- sky: violet into peach, the low sun and its band of light along the horizon ---- */
{
    let s = `<defs><linearGradient id="s" gradientUnits="userSpaceOnUse" x1="0" y1="-6" x2="0" y2="262"><stop offset="0" stop-color="${C.violet}"/><stop offset="0.5" stop-color="${C.cityFar}"/><stop offset="1" stop-color="${C.peach}"/></linearGradient></defs>`;
    s += rect(-6, -6, 372, 316, 'url(#s)');
    // The band of the last light, in two flat steps, and the sun low in it.
    s += rect(-6, 196, 372, 114, C.light, op(0.22)) + rect(-6, 226, 372, 84, C.light, op(0.3));
    s += circle(118, 222, 34, C.cream) + circle(118, 222, 46, C.cream, op(0.25));
    svg('sky', [-6, -6, 372, 316], s);
}

/* ---- clouds: long flat bars, stacked a little out of step. Two layers, to drift against each other ---- */
/** One cloud: `rows` of [dx, y-offset, length, thickness] from its left end. */
const cloud = (x, y, rows, fill, extra = '') => rows.map(([dx, dy, len, h]) => bar(x + dx, y + dy, len, h, fill, extra)).join('');
{
    // Far and low: lit from below, cream.
    let far = cloud(-24, 168, [[0, 0, 150, 9], [34, -7, 84, 9], [58, 7, 132, 7]], C.cream, op(0.6));
    far += cloud(204, 150, [[0, 0, 190, 10], [46, -8, 96, 10], [-28, 8, 120, 7], [120, 8, 90, 6]], C.cream, op(0.6));
    far += bar(120, 196, 70, 5, C.cream, op(0.5));
    svg('clouds-far', [-40, 138, 440, 66], far);
    // Nearer and higher: in the shade already, violet-grey with a lit underside.
    const shade = (x, y, rows, lit) => cloud(x, y, rows, C.violet, op(0.78)) + lit.map(([dx, dy, len]) => bar(x + dx, y + dy, len, 3.5, C.peach, op(0.8))).join('');
    let near = shade(-30, 106, [[0, 0, 176, 13], [30, -10, 96, 13], [70, 10, 150, 10]], [[78, 17, 132], [6, 10, 60]]);
    near += shade(236, 92, [[0, 0, 160, 12], [38, -9, 80, 12], [-34, 9, 110, 9]], [[-26, 15, 96], [84, 9, 70]]);
    near += bar(150, 78, 58, 6, C.violet, op(0.6));
    svg('clouds-near', [-40, 74, 440, 56], near);
}

/* ---- the city: a far row and a near row of towers, no two alike; a few windows lit ---- */
const FLOOR = 392;
/** One tower from `top` down to the floor, with a roof of its own. */
function tower([x, w, top, roof], fill) {
    let s = rect(x, top, w, FLOOR + 4 - top, fill);
    if (roof === 'step') s += rect(x + w * 0.2, top - 16, w * 0.5, 17, fill) + rect(x + w * 0.36, top - 26, w * 0.18, 11, fill);
    if (roof === 'slant') s += poly([[x, top + 1], [x, top - 6], [x + w, top - 22], [x + w, top + 1]], fill);
    if (roof === 'mast') s += rect(x + w * 0.3, top - 9, w * 0.4, 10, fill) + rect(x + w / 2 - 0.9, top - 44, 1.8, 36, fill);
    if (roof === 'tank') s += rrect(x + w * 0.5, top - 15, w * 0.34, 11, 2, fill) + rect(x + w * 0.55, top - 5, 1.6, 6, fill) + rect(x + w * 0.78, top - 5, 1.6, 6, fill);
    if (roof === 'crown') s += rect(x - 2, top - 4, w + 4, 5, fill) + rect(x + w * 0.62, top - 14, w * 0.2, 11, fill);
    return s;
}
/** The windows of the one tower that breathes: its own layer. */
const BREATH = [[281, 222, 5, 7], [290, 222, 5, 7], [281, 236, 5, 7]];
{
    const far = [[-6, 30, 204, 'flat'], [30, 34, 178, 'tank'], [70, 26, 216, 'flat'], [100, 40, 164, 'step'], [146, 30, 206, 'slant'], [182, 44, 186, 'crown'], [232, 26, 212, 'flat'], [262, 36, 158, 'mast'], [304, 30, 196, 'flat'], [338, 30, 174, 'step']];
    const near = [[-6, 38, 222, 'tank'], [36, 30, 190, 'step'], [70, 44, 238, 'flat'], [118, 28, 214, 'mast'], [150, 54, 244, 'slant'], [208, 30, 226, 'flat'], [240, 34, 168, 'mast'], [272, 46, 210, 'crown'], [322, 46, 232, 'step']];
    let s = far.map(t => tower(t, C.cityFar)).join('') + near.map(t => tower(t, C.cityNear)).join('');
    // Lit windows, set by hand so that nothing lines up into a grid.
    const lit = [[2, 232, 5, 7], [18, 246, 5, 7], [42, 200, 4, 6], [54, 214, 4, 6], [42, 228, 4, 6], [88, 244, 12, 4], [124, 226, 4, 6], [132, 240, 4, 6], [246, 182, 4, 6], [258, 196, 4, 6], [246, 218, 4, 6], [264, 232, 4, 6], [300, 236, 5, 7], [330, 240, 4, 6], [352, 246, 4, 6], [342, 196, 3, 5], [108, 180, 3, 5], [196, 200, 3, 5], [36, 190, 3, 5]];
    s += lit.map(([x, y, w, h]) => rect(x, y, w, h, C.light)).join('');
    // A few dark panes, for the towers' scale.
    const dark = [[10, 232, 5, 7], [78, 244, 6, 4], [246, 196, 4, 6], [258, 182, 4, 6], [258, 218, 4, 6], [299, 222, 5, 7], [338, 240, 4, 6], [215, 236, 4, 6], [223, 236, 4, 6]];
    s += dark.map(([x, y, w, h]) => rect(x, y, w, h, C.plum, op(0.4))).join('');
    svg('city', [-6, 112, 372, 284], s);
    svg('window', [279, 220, 18, 25], BREATH.map(([x, y, w, h]) => rect(x, y, w, h, C.light)).join(''));
}

/* ---- the balcony: a glass rail with slim posts, a planter hung on it, the floor, a tall plant ---- */
/** A leaf: an almond from `a` to `b`, `w` wide at its middle, with a rib in the other tone. */
function leaf(a, b, w, fill, rib) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const n = [-dy / L, dx / L];
    const at = (t, k) => [a[0] + dx * t + n[0] * w * k, a[1] + dy * t + n[1] * w * k];
    return `<path d="M${pt(a)}C${pt(at(0.3, 0.62))} ${pt(at(0.72, 0.56))} ${pt(b)}C${pt(at(0.66, -0.44))} ${pt(at(0.24, -0.5))} ${pt(a)}Z" fill="${fill}"/>` + line(at(0.08, 0), at(0.9, 0.02), rib, 1.2, op(0.55));
}
/** A lobed mass along a base line: bumps of the given [width, height], each its own size. */
function lobes(x0, base, bumps, fill) {
    let d = `M${f(x0)} ${f(base)}`, x = x0;
    for (const [w, h] of bumps) {
        d += `C${f(x - w * 0.08)} ${f(base - h * 1.25)} ${f(x + w * 1.08)} ${f(base - h * 1.25)} ${f(x + w)} ${f(base)}`;
        x += w;
    }
    return `<path d="${d}Z" fill="${fill}"/>`;
}
{
    let s = '';
    // The glass of the rail: a thin tint over the city, then the handrail, the foot rail and the posts.
    s += rect(-6, 258, 372, 134, C.plum, op(0.3));
    s += rect(-6, 251, 372, 7, C.plum) + rect(-6, 377, 372, 3, C.plum);
    for (const x of [18, 78, 138, 198, 258, 318]) s += rect(x - 1.5, 256, 3, 138, C.plum);
    // The planter hung on the rail to the left: a long box, foliage in big lobes, two strands trailing.
    s += lobes(2, 266, [[26, 24], [34, 38], [22, 20], [26, 30]], C.leaf);
    s += lobes(16, 266, [[30, 18], [24, 12], [30, 20]], C.plum).replace('/>', `${op(0.3)}/>`);
    s += rrect(4, 262, 104, 24, 3, C.grey) + rect(4, 262, 104, 5, C.plum, op(0.45));
    s += leaf([22, 268], [14, 300], 9, C.leaf, C.plum) + leaf([30, 270], [34, 292], 7, C.leaf, C.plum) + leaf([92, 268], [100, 296], 8, C.leaf, C.plum);
    // The floor: lighter than the rail, boards running away from us, a darker strip under the rail.
    s += rect(-6, FLOOR, 372, 64, C.plum) + rect(-6, FLOOR, 372, 64, C.cityNear, op(0.5));
    s += rect(-6, FLOOR, 372, 5, C.plum, op(0.7));
    for (const [x, k] of [[-40, 1], [18, 0.7], [92, 1], [146, 0.6], [214, 1], [262, 0.7], [338, 1], [396, 0.7]]) {
        const top = 180 + (x - 180) * 0.62;
        s += `<path d="M${f(top)} ${FLOOR + 5}L${f(x)} 456" fill="none" stroke="${C.plum}" stroke-width="${f(1.6 * k + 0.4)}" opacity="0.55"/>`;
    }
    s += rect(-6, 424, 372, 1.6, C.plum, op(0.35));
    // The tall plant to the right: broad leaves on a pot, drawn back to front.
    s += ellipse(314, 414, 40, 6, C.plum, op(0.6));
    const root = [312, 352];
    s += line(root, [312, 300], C.leaf, 2.4);
    s += leaf([310, 322], [262, 286], 30, C.leaf, C.plum) + leaf([314, 318], [364, 268], 30, C.leaf, C.plum);
    s += leaf([311, 304], [286, 228], 30, C.leaf, C.plum).replace('/>', '/>' + '') + leaf([313, 300], [340, 216], 32, C.leaf, C.plum);
    s += leaf([312, 350], [266, 332], 22, C.leaf, C.plum) + leaf([314, 348], [362, 318], 24, C.leaf, C.plum);
    // The shaded halves: one darker leaf laid over each second one.
    s += `<g opacity="0.3">${leaf([314, 318], [364, 268], 30, C.plum, C.plum)}${leaf([311, 304], [286, 228], 30, C.plum, C.plum)}${leaf([312, 350], [266, 332], 22, C.plum, C.plum)}</g>`;
    s += poly([[288, 356], [336, 356], [328, 412], [296, 412]], C.cityFar) + rrect(283, 348, 58, 10, 2.5, C.cityFar) + rect(289, 358, 46, 4, C.plum, op(0.35));
    svg('balcony', [-6, 212, 372, 244], s);
}

/* ---- the string of lights across the top left corner: the wire and the bulbs unlit, then the lit bulbs in
   two sets, so that they can breathe against each other ---- */
{
    const A = [-6, 112], K = [58, 96], B = [172, -6];
    const on = t => [(1 - t) ** 2 * A[0] + 2 * t * (1 - t) * K[0] + t * t * B[0], (1 - t) ** 2 * A[1] + 2 * t * (1 - t) * K[1] + t * t * B[1]];
    const bulbs = [0.07, 0.22, 0.37, 0.51, 0.64, 0.77, 0.9].map(on);
    let wire = `<path d="M${pt(A)}Q${pt(K)} ${pt(B)}" fill="none" stroke="${C.plum}" stroke-width="1.4"/>`;
    for (const [x, y] of bulbs) wire += rect(x - 1.6, y, 3.2, 4.5, C.plum) + circle(x, y + 9, 5, C.cream, op(0.5));
    svg('string', [-6, -6, 184, 136], wire);
    const glow = `<defs><radialGradient id="b"><stop offset="0" stop-color="${C.light}" stop-opacity="0.7"/><stop offset="0.4" stop-color="${C.light}" stop-opacity="0.26"/><stop offset="1" stop-color="${C.light}" stop-opacity="0"/></radialGradient></defs>`;
    const lit = set => glow + bulbs.filter((_, i) => i % 2 === set).map(([x, y]) => circle(x, y + 9, 22, 'url(#b)') + circle(x, y + 9, 5, C.light) + circle(x, y + 9, 2.4, C.cream)).join('');
    svg('lights-a', [-6, -6, 184, 136], lit(0));
    svg('lights-b', [-6, -6, 184, 136], lit(1));
}

/* ---- the table: a small round bistro table seen straight on, cream: a top, a stem, a foot ---- */
const TX = 168, TOP = 300;
{
    let s = ellipse(TX, 411, 50, 6.5, C.plum, op(0.6));
    s += rrect(TX - 36, 404, 72, 7, 3.5, C.cream) + rect(TX - 4, 308, 8, 98, C.cream);
    s += rect(TX - 4, 311, 8, 9, C.plum, op(0.28));
    s += rrect(TX - 74, 306, 148, 6, 3, C.cream) + rrect(TX - 74, 306, 148, 6, 3, C.plum, op(0.28));
    s += rrect(TX - 86, TOP, 172, 9, 4.5, C.cream);
    svg('table', [80, 298, 176, 122], s);
}

/* ---- the parcel, drawn where it lands: a coral box 96 wide, a lid, a cream ribbon and its bow ---- */
const KNOT = [TX, 214];
/** One loop of the bow, `deg` clockwise from straight up, as a teardrop ring. */
function loop(deg, fill) {
    const a = (deg * Math.PI) / 180, u = [Math.sin(a), -Math.cos(a)], n = [u[1], -u[0]];
    const L = 38, W = 10;
    const ring = (k, shift) => {
        const P = (t, w) => [KNOT[0] + u[0] * (shift + t * L * k) + n[0] * w * W * k, KNOT[1] + u[1] * (shift + t * L * k) + n[1] * w * W * k];
        return `M${pt(P(0, 0))}C${pt(P(0.4, 1))} ${pt(P(1, 1))} ${pt(P(1, 0))}C${pt(P(1, -1))} ${pt(P(0.4, -1))} ${pt(P(0, 0))}Z`;
    };
    return `<path d="${ring(1, 0)}${ring(0.5, L * 0.36)}" fill="${fill}" fill-rule="evenodd"/>`;
}
const BODY = rrect(TX - 48, 234, 96, 67, 2, C.coral) + rect(TX - 8, 234, 16, 67, C.cream) + rect(TX - 48, 236, 96, 7, C.plum, op(0.26));
const LID = rrect(TX - 55, 218, 110, 18, 3, C.coral) + rect(TX - 8, 218, 16, 18, C.cream) + rrect(TX - 9, 208, 18, 12, 3.5, C.cream) + rect(TX - 9, 216, 18, 2.5, C.plum, op(0.22));
const BOW_L = loop(-42, C.cream), BOW_R = loop(42, C.cream);
svg('box', [118, 232, 100, 70], BODY);
svg('lid', [110, 206, 116, 32], LID);
svg('bow-l', [130, 176, 42, 44], BOW_L);
svg('bow-r', [164, 176, 42, 44], BOW_R);

/* ---- the drone, drawn where it stops over the table. Everything of it turns and grows about one point,
   G, the middle of the rotor plane: the body, the four rotor discs, the two lines and the parcel under it ---- */
const G = [TX, 146];
{
    // The parcel as it hangs: the same pictures as the pieces on the table, in one layer.
    svg('hang', [110, 140, 116, 162], BODY + LID + BOW_L + BOW_R);
    // Two short lines from the belly to the lid.
    svg('lines', [128, 140, 80, 82], line([TX - 13, 176], [TX - 36, 219], C.grey, 1.5) + line([TX + 13, 176], [TX + 36, 219], C.grey, 1.5));
    const ROTORS = [[-84, 28, 4.6], [-45, 20, 3.4], [45, 20, 3.4], [84, 28, 4.6]];
    let s = '';
    // The two far arms, thin and dark; then the two near ones.
    for (const d of [-1, 1]) s += line([TX + d * 16, 160], [TX + d * 45, 153], C.grey, 3) + rrect(TX + d * 45 - 3.5, 146, 7, 8, 1.5, C.grey);
    for (const d of [-1, 1]) s += line([TX + d * 24, 166], [TX + d * 84, 156], C.white, 5.5) + rrect(TX + d * 84 - 5, 146, 10, 12, 2, C.grey);
    // Two legs.
    for (const d of [-1, 1]) s += line([TX + d * 22, 178], [TX + d * 34, 194], C.grey, 3) + line([TX + d * 28, 194.5], [TX + d * 42, 194.5], C.grey, 3);
    // The body: compact, off-white, a dark mount under it with one small lamp.
    s += rrect(TX - 21, 176, 42, 10, 4, C.grey) + circle(TX, 186.5, 2.6, C.light);
    s += rrect(TX - 30, 152, 60, 28, 11, C.white);
    s += `<path d="M${TX - 30} 169L${TX + 30} 169L${TX + 30} 169C${TX + 30} 175 ${TX + 25} 180 ${TX + 19} 180L${TX - 19} 180C${TX - 25} 180 ${TX - 30} 175 ${TX - 30} 169Z" fill="${C.grey}" opacity="0.2"/>`;
    svg('drone', [50, 134, 236, 66], s);
    ROTORS.forEach(([dx, rx, ry], i) => {
        const cx = G[0] + dx;
        svg(`rotor-${i + 1}`, [cx - rx - 1, G[1] - 6, 2 * rx + 2, 12], ellipse(cx, G[1], rx, ry, C.white, op(0.55)) + bar(cx - rx * 0.62, G[1] - 0.8, rx * 1.24, 1.6, C.white, op(0.7)));
    });
}

/* ---- the light out of the open box: a low warm glow just over its rim, about as tall as the box, fading
   to nothing; drawn behind the box, so the box stands dark against it ---- */
{
    const M = [TX, 236];
    let s = `<defs><radialGradient id="h"><stop offset="0" stop-color="${C.light}" stop-opacity="0.95"/><stop offset="0.3" stop-color="${C.light}" stop-opacity="0.62"/><stop offset="0.66" stop-color="${C.light}" stop-opacity="0.22"/><stop offset="1" stop-color="${C.light}" stop-opacity="0"/></radialGradient></defs>`;
    s += ellipse(M[0], M[1] - 2, 84, 70, 'url(#h)');
    s += ellipse(M[0], M[1], 47, 5.5, C.light) + ellipse(M[0], M[1], 36, 3, C.cream);
    svg('glow', [84, 164, 168, 140], s);
}

/* ---- small things: a few round motes in the glow, and the dust of the landing: two low puffs along the
   table top, one to each side of the box ---- */
{
    svg('motes', [136, 176, 66, 46], circle(146, 212, 2.2, C.light, op(0.9)) + circle(192, 198, 2.6, C.cream, op(0.9)) + circle(170, 184, 1.8, C.light, op(0.8)) + circle(158, 204, 1.5, C.cream, op(0.8)));
    const puff = d => ellipse(TX + d * 62, 296, 13, 4, C.cream, op(0.7)) + ellipse(TX + d * 55, 293.5, 7, 3.4, C.cream, op(0.7)) + ellipse(TX + d * 74, 297.5, 6, 2.4, C.cream, op(0.6));
    svg('dust', [86, 288, 164, 12], puff(-1) + puff(1));
}

for (const [name, box] of Object.entries(boxes)) process.stdout.write(`${name}: [${box.join(', ')}]\n`);
