// Generator for the "starship" wrapper art: a cargo starship held in an orbital dock in front of a very
// large planet, seen from the side and a little from above, in the manner of a painted animation cel:
// flat fills, one hard-edged shadow shape per form, a few white highlight slashes; large forms have no
// outline (fill against ground defines them), and only panel seams are drawn, as thin dark-slate lines. No filter, no blend mode; the only gradients are alpha fades for light (lamps, engines, the bay).
// Everything is drawn where it stands while the gift is closed; each SVG's viewBox is its layer box on the
// 360x450 canvas. Every colour is in the palette `C`.
// Run: node scripts/art/starship.gen.mjs   (prints the layer boxes the definition uses)
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'starship');
if (!OUT.endsWith('wrappers/starship')) throw new Error('out dir must be public/wrappers/starship');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: space, three teals for the planet, the hull and its cool shade, white for highlights and stars, one orange, two slates for the dock, the gold of the cargo light. */
const C = {
    space: '#0D1226',
    tealDeep: '#0F4C5C',
    teal: '#1F8A8A',
    tealHi: '#6FD3C0',
    hull: '#ECE8DF',
    shade: '#9CA6B8',
    white: '#FFFFFF',
    orange: '#F2762E',
    slate: '#2A3350',
    slateHi: '#55648C',
    gold: '#FFC857',
};

const f = n => String(Math.round(n * 100) / 100);
/** The thin dark-slate line of a seam or a small part's edge. Large forms carry none. */
const INK = ` stroke="${C.slate}" stroke-width="0.8" stroke-linejoin="round"`;
const R = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const RR = (x, y, w, h, r, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}"${extra}/>`;
const P = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const D = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const S = (pts, stroke, w, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="${stroke}" stroke-width="${f(w)}"${extra}/>`;
const O = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const E = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra}/>`;
const radial = (id, stops) => `<radialGradient id="${id}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
/** A fade along x, in canvas units, from x1 to x2. */
const linear = (id, x1, x2, stops) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="0" x2="${f(x2)}" y2="0">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;

/** Small seeded PRNG (mulberry32): the same sky every run. */
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

const BOXES = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    BOXES[name] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}

/* The planet: a very large disc whose centre is far below the lower left corner. */
const PX = -40, PY = 640, PR = 440;
const polar = (r, deg) => [PX + r * Math.cos((deg * Math.PI) / 180), PY + r * Math.sin((deg * Math.PI) / 180)];

/* ---- stars: a far layer that stands still (with one small moon) and a nearer one that twinkles ---- */
{
    const rnd = seeded(20261122);
    const outside = (x, y, pad) => Math.hypot(x - PX, y - PY) > PR + pad;
    let far = '', near = '';
    for (let i = 0; i < 150; i += 1) {
        const x = rnd() * 360, y = rnd() * 330, r = 0.35 + rnd() * 0.55, a = 0.35 + rnd() * 0.45;
        if (outside(x, y, 6)) far += O(x, y, r, i % 9 === 0 ? C.tealHi : C.white, ` fill-opacity="${f(a)}"`);
    }
    // A small far moon: a plain full disc with one shallow shade along its lower left.
    far += `<defs><clipPath id="m"><circle cx="326" cy="132" r="9"/></clipPath></defs>` + O(326, 132, 9, C.shade) + `<g clip-path="url(#m)">${O(308, 150, 22, C.slateHi)}</g>`;
    for (let i = 0; i < 34; i += 1) {
        const x = 6 + rnd() * 348, y = 44 + rnd() * 160, r = 0.8 + rnd() * 0.7;
        if (!outside(x, y, 10)) continue;
        near += O(x, y, r, i % 4 === 0 ? C.gold : C.white);
    }
    svg('stars-a', [0, 0, 360, 330], far);
    svg('stars-b', [0, 40, 360, 170], near);
}

/* ---- planet: three teals in bands, cloud masses with lobed edges that follow its curve, a night side, a thin bright line of air ---- */
{
    /**
     * A cloud mass along the planet's curve: from angle a0 to a1 (degrees), about radius r, up to `w` thick,
     * tapering to nothing at both ends; its two edges wander by sums of sines so that no lobe repeats.
     */
    const cloud = (a0, a1, r, w, seed, fill, extra = '') => {
        const n = Math.ceil((a1 - a0) * 2.2);
        const wob = (t, k) => Math.sin(t * 9.1 + seed * k) * 0.5 + Math.sin(t * 21.7 + seed * 2.3 * k) * 0.3 + Math.sin(t * 43 + seed * k * 0.7) * 0.2;
        const outer = [], inner = [];
        for (let i = 0; i <= n; i += 1) {
            const t = i / n, env = Math.sin(Math.PI * t) ** 0.6;
            outer.push(polar(r + env * w * (0.5 + 0.3 * wob(t, 1)), a0 + (a1 - a0) * t));
            inner.push(polar(r - env * w * (0.5 + 0.3 * wob(t, 1.9)), a0 + (a1 - a0) * t));
        }
        return P([...outer, ...inner.reverse()], fill, extra);
    };
    let s = `<defs><clipPath id="p"><circle cx="${PX}" cy="${PY}" r="${PR}"/></clipPath></defs>`;
    // The thin haze of air outside the limb.
    s += O(PX, PY, PR + 3.5, 'none', ` stroke="${C.tealHi}" stroke-width="7" stroke-opacity="0.16"`);
    let g = O(PX, PY, PR, C.teal);
    // Broad belts.
    g += O(PX, PY, 392, 'none', ` stroke="${C.tealDeep}" stroke-width="22" stroke-opacity="0.55"`);
    g += O(PX, PY, 318, 'none', ` stroke="${C.tealDeep}" stroke-width="40" stroke-opacity="0.5"`);
    g += O(PX, PY, 236, 'none', ` stroke="${C.tealDeep}" stroke-width="34" stroke-opacity="0.55"`);
    // Cloud masses, light on the day side.
    g += cloud(-80, -38, 421, 17, 1.3, C.tealHi, ' fill-opacity="0.9"');
    g += cloud(-58, -22, 366, 24, 4.1, C.tealHi, ' fill-opacity="0.75"');
    g += cloud(-88, -52, 352, 15, 2.6, C.hull, ' fill-opacity="0.8"');
    g += cloud(-70, -30, 282, 26, 6.2, C.tealHi, ' fill-opacity="0.7"');
    g += cloud(-52, -24, 262, 12, 8.4, C.hull, ' fill-opacity="0.7"');
    g += cloud(-86, -40, 206, 22, 3.3, C.tealHi, ' fill-opacity="0.6"');
    g += cloud(-74, -46, 398, 7, 5.5, C.hull, ' fill-opacity="0.85"');
    // The night side: one hard-edged shape over the lower left.
    g += O(PX - 150, PY + 40, 420, C.tealDeep, ' fill-opacity="0.62"');
    s += `<g clip-path="url(#p)">${g}</g>`;
    // The lit limb.
    s += O(PX, PY, PR, 'none', ` stroke="${C.tealHi}" stroke-width="2.2"`) + O(PX, PY, PR - 2.4, 'none', ` stroke="${C.white}" stroke-width="0.8" stroke-opacity="0.7"`);
    svg('planet', [-8, 188, 376, 270], s);
}

/* ---- the ship, drawn in its own frame and set on the canvas by one shift. Stern to the left: one large
   engine bell, an orange stern section; the hull thickens toward a rounded nose with a
   long window band in its line; under it a cargo keel that carries the bay. ---- */
const DX = -8, DY = -9;
const ship = inner => `<g transform="translate(${DX} ${DY})">${inner}</g>`;
const HULL = 'M58 193L150 181L236 180C276 180 312 192 312 209C312 226 282 238 240 238L88 238L58 222Z';
const KEEL = [[88, 238], [262, 238], [250, 268], [90, 268]];
/** The cargo bay on the lower flank and the keel, and its door (ship frame). */
const BAY = { x: 124, y: 224, w: 92, h: 34 };
const BAY_C = [BAY.x + BAY.w / 2 + DX, BAY.y + BAY.h / 2 + DY];
/** The mouth of the engine bell: [x, y, half-height] (ship frame). */
const MOUTH = [14, 207, 21];
{
    let s = `<defs><clipPath id="h"><path d="${HULL}"/></clipPath></defs>`;
    // The engine: a flared bell, darker below, an orange rim at its mouth.
    s += P([[60, 194], [36, 189], [MOUTH[0], MOUTH[1] - MOUTH[2]], [MOUTH[0], MOUTH[1] + MOUTH[2]], [36, 225], [60, 221]], C.slateHi);
    s += P([[60, 208], [MOUTH[0], 210], [MOUTH[0], MOUTH[1] + MOUTH[2]], [36, 225], [60, 221]], C.slate) + S([[36, 189], [36, 225]], C.slate, 0.8);
    s += R(MOUTH[0] - 2, MOUTH[1] - MOUTH[2] - 1.5, 4, 2 * MOUTH[2] + 3, C.orange);
    // The keel under the hull: flat, a shade along its foot, an orange block at its forward end and along its sole.
    s += P(KEEL, C.hull) + P([[88.8, 250], [257.2, 250], [250, 268], [90, 268]], C.shade) + P([[236, 238], [262, 238], [254.8, 256], [236, 256]], C.orange) + P([[89.6, 262], [252.4, 262], [250, 268], [90, 268]], C.orange);
    // The hull.
    let g = D(HULL, C.hull);
    // The orange stern section.
    g += R(50, 170, 42, 80, C.orange);
    // One hard shadow along the belly.
    g += D('M50 212L96 226L262 226L320 214L320 250L50 250Z', C.shade);
    // The lit top, as one long slash that thins toward the nose.
    g += D('M92 188.6L150 181L236 180C262 180 286 185 300 194C284 188 262 185.4 236 185.4L150 186.4L92 193.4Z', C.white);
    // The window band, in the hull's line toward the nose: one long dark band with a glint.
    g += D('M204 190L284 190C295 192 302 197 305 203L210 197Z', C.space) + S([[214, 192.6], [262, 192.8]], C.tealHi, 1);
    // Seams: two across the hull, the door's track, one short one aft.
    g += S([[150, 186.4], [150, 238]], C.slate, 0.8) + S([[262, 200], [262, 238]], C.slate, 0.8) + S([[98, 220], [246, 220]], C.slate, 0.8) + S([[92, 204], [128, 204]], C.slate, 0.8);
    g += R(100, 208, 14, 7, C.shade);
    s += `<g clip-path="url(#h)">${g}</g>`;
    // The bay, lit warm from inside: what the door covers. A hard shade along the top and one side, a dark
    // sill, and three crates of different sizes in flat tones.
    {
        const { x, y, w, h } = BAY, fl = y + h - 4;
        let b = R(x, y, w, h, C.gold);
        b += P([[x, y], [x + w, y], [x + w, y + 6], [x + 18, y + 6], [x + 12, y + h], [x, y + h]], C.orange);
        b += R(x, fl, w, 4, C.slate);
        b += R(x + 20, fl - 19, 27, 19, C.orange) + R(x + 20, fl - 19, 27, 4.5, C.hull);
        b += R(x + 33, fl - 28, 12, 9, C.white);
        b += R(x + 56, fl - 13, 20, 13, C.slateHi) + R(x + 56, fl - 13, 20, 3.5, C.shade);
        s += b;
    }
    svg('hull', [12 + DX - 2, 176 + DY, 306, 96], ship(s));

    // The door: two halves that meet in the middle. One long seam runs across both; the aft half carries one
    // large panel, the forward half one small one.
    const half = (x0, left) => {
        const { y, h } = BAY, w = BAY.w / 2;
        let d = R(x0, y, w, h, C.hull) + R(x0, y + h - 8, w, 8, C.shade);
        d += left ? R(x0 + 8, y + 5, 27, 12, C.shade) : R(x0 + 24, y + 7, 10, 6, C.shade);
        d += S([[x0, y + 21.5], [x0 + w, y + 21.5]], C.slate, 0.8);
        return d + `<rect x="${f(x0 + 0.4)}" y="${f(y + 0.4)}" width="${f(w - 0.8)}" height="${f(h - 0.8)}" fill="none"${INK}/>`;
    };
    svg('door-l', [BAY.x + DX, BAY.y + DY, BAY.w / 2, BAY.h], ship(half(BAY.x, true)));
    svg('door-r', [BAY.x + BAY.w / 2 + DX, BAY.y + DY, BAY.w / 2, BAY.h], ship(half(BAY.x + BAY.w / 2, false)));
}

/* ---- engine light: the plume, strong at the bell's mouth and gone at its far end, and its hot core ---- */
{
    const [nx, ny, hh] = MOUTH;
    const plume = (l, k) => `M${f(nx + 2)} ${f(ny - hh * k)}C${f(nx - l * 0.3)} ${f(ny - hh * k * 1.2)} ${f(nx - l * 0.62)} ${f(ny - hh * k * 0.5)} ${f(nx - l)} ${f(ny)}C${f(nx - l * 0.62)} ${f(ny + hh * k * 0.5)} ${f(nx - l * 0.3)} ${f(ny + hh * k * 1.2)} ${f(nx + 2)} ${f(ny + hh * k)}Z`;
    const box = (len, k) => {
        const pad = Math.ceil(hh * k * 1.1) + 1;
        return [nx - len - 2 + DX, ny - pad + DY, len + 6, 2 * pad];
    };
    svg('glow-a', box(112, 0.92), ship(`<defs>${linear('o', nx, nx - 112, [[0, C.orange, 0.95], [0.5, C.orange, 0.5], [1, C.orange, 0]])}</defs>` + D(plume(112, 0.92), 'url(#o)')));
    svg('glow-b', box(70, 0.56), ship(`<defs>${linear('g', nx, nx - 70, [[0, C.gold, 0.95], [1, C.gold, 0]])}${linear('w', nx, nx - 34, [[0, C.white, 0.95], [1, C.white, 0]])}</defs>` + D(plume(70, 0.56), 'url(#g)') + D(plume(34, 0.3), 'url(#w)')));
}

/* ---- streaks: the lines of speed along and behind the ship, each fading to nothing at its far end ---- */
const STREAK = [-8, 142, 300, 144];
{
    const lines = [
        [150, 20, 250, 1.6, C.white], [158, 110, 292, 1, C.tealHi], [166, -8, 60, 1.2, C.white],
        [176, -8, 40, 1, C.gold], [230, -8, 52, 1.6, C.white], [240, -8, 70, 1, C.orange],
        [270, 40, 280, 1.8, C.white], [276, -8, 190, 1, C.tealHi], [282, 120, 292, 1.2, C.gold], [268, -8, 78, 0.9, C.white],
    ];
    let defs = '', s = '';
    lines.forEach(([y, x0, x1, w, col], i) => {
        defs += linear(`s${i}`, x0, x1, [[0, col, 0], [0.7, col, 0.55], [1, col, 0.8]]);
        s += `<rect x="${f(x0)}" y="${f(y - w / 2)}" width="${f(x1 - x0)}" height="${f(w)}" rx="${f(w / 2)}" fill="url(#s${i})"/>`;
    });
    svg('streak', STREAK, `<defs>${defs}</defs>${s}`);
}

/* ---- gantry: the dock overhead. A station mass at the upper left, a long beam, two arms down to the
   clamp housings, a shorter boom further along. Drawn wider than the canvas: it slides off to the left. ---- */
const ARMS = [124, 214];
{
    const beamY = x => 26 - (x + 8) * 0.036; // the beam's upper edge leans up a little to the right
    let s = '';
    // The beam.
    s += P([[-8, beamY(-8)], [444, beamY(444)], [444, beamY(444) + 22], [-8, beamY(-8) + 22]], C.slate, INK);
    s += P([[-8, beamY(-8)], [444, beamY(444)], [444, beamY(444) + 5], [-8, beamY(-8) + 5]], C.slateHi);
    for (const [x, w] of [[128, 44], [214, 18], [246, 62], [336, 26], [376, 50]]) s += `<rect x="${x}" y="${f(beamY(x) + 10)}" width="${w}" height="6" rx="3" fill="${C.space}" transform="rotate(-2.06 ${x} ${f(beamY(x) + 13)})"/>`;
    // The station mass the beam grows from, with a few lamps.
    s += P([[-8, -8], [176, -8], [158, 26], [84, 46], [-8, 58]], C.slate, INK) + P([[-8, 50], [84, 38], [158, 18], [158, 26], [84, 46], [-8, 58]], C.slateHi) + P([[-8, -8], [176, -8], [158, 26], [84, 46], [-8, 58]], 'none', INK);
    s += S([[60, -8], [52, 41]], C.space, 1) + S([[-8, 16], [56, 12]], C.space, 1) + S([[116, -8], [110, 38]], C.space, 1);
    // Three lamps of different sizes, in no line.
    s += O(22, 30, 2.4, C.gold) + O(40, 21, 1.5, C.gold) + O(86, 9, 1.9, C.gold);
    s += R(4, 0, 30, 9, C.slateHi, INK) + R(132, 12, 16, 8, C.space);
    // The arms: a column with a lit face and slots of different lengths, a gusset to the beam, a housing at the foot.
    for (const x of ARMS) {
        const y0 = beamY(x) + 20;
        s += P([[x - 9, y0 + 2], [x - 30, y0 + 2], [x - 9, y0 + 30]], C.slate, INK) + P([[x + 9, y0 + 2], [x + 24, y0 + 2], [x + 9, y0 + 20]], C.slate, INK);
        s += R(x - 9, y0, 18, 126 - y0, C.slate, INK) + R(x - 9, y0, 6, 126 - y0, C.slateHi) + R(x - 9, y0, 18, 126 - y0, 'none', INK);
        for (const [a, h] of x === ARMS[0] ? [[52, 22], [84, 9], [100, 16]] : [[48, 10], [66, 28], [104, 8]]) s += RR(x - 0.5, a, 5, h, 2.5, C.space);
        s += P([[x - 26, 122], [x + 26, 122], [x + 26, 146], [x + 20, 152], [x - 20, 152], [x - 26, 146]], C.slateHi, INK);
        s += P([[x + 4, 122], [x + 26, 122], [x + 26, 146], [x + 20, 152], [x + 4, 152]], C.slate) + R(x - 26, 122, 52, 5, C.orange, INK);
        s += P([[x - 26, 122], [x + 26, 122], [x + 26, 146], [x + 20, 152], [x - 20, 152], [x - 26, 146]], 'none', INK);
    }
    // A hose from the station to the first arm, a short boom with a round head further along, a far brace.
    s += `<path d="M40 50C56 90 92 100 115 94" fill="none" stroke="${C.slateHi}" stroke-width="2.2"/>`;
    const bx = 318, by = beamY(bx) + 20;
    s += R(bx - 6, by, 12, 44, C.slate, INK) + R(bx - 6, by, 4, 44, C.slateHi) + R(bx - 6, by, 12, 44, 'none', INK) + O(bx, by + 52, 11, C.slateHi, INK) + D(`M${bx} ${f(by + 41)}A11 11 0 0 1 ${bx} ${f(by + 63)}Z`, C.slate) + O(bx, by + 52, 4.4, C.space) + O(bx, by + 52, 11, 'none', INK);
    s += P([[392, beamY(392) + 22], [412, beamY(412) + 22], [444, 78], [444, 104]], C.slate, INK);
    svg('gantry', [-8, -8, 452, 164], s);
}

/* ---- clamps: a saddle over the top of the hull with two fingers down the flank, a gold pad at the end of each ---- */
for (const [i, x] of ARMS.entries()) {
    const U = [[x - 22, 148], [x + 22, 148], [x + 22, 194], [x + 12, 194], [x + 12, 171], [x - 12, 171], [x - 12, 194], [x - 22, 194]];
    let s = P(U, C.slateHi);
    s += P([[x + 2, 148], [x + 22, 148], [x + 22, 194], [x + 12, 194], [x + 12, 171], [x + 2, 171]], C.slate);
    s += R(x - 22, 187, 10, 7, C.gold) + R(x + 12, 187, 10, 7, C.gold);
    svg(i === 0 ? 'clamp-l' : 'clamp-r', [x - 24, 146, 48, 50], s);
}

/* ---- truss: the dock under the ship. Two chords, bays of different widths braced in different ways,
   two cradle posts up to the belly, a buffer at its end. ---- */
const POSTS = [106, 222];
{
    const y0 = 290, y1 = 318, x0 = -8, x1 = 322;
    let s = '';
    const bays = [-8, 26, 78, 108, 162, 196, 250, 284, 316];
    bays.slice(0, -1).forEach((a, i) => {
        const b = bays[i + 1];
        if (i % 3 === 0) s += S([[a, y1], [b, y0 + 4]], C.slateHi, 3);
        else if (i % 3 === 1) s += S([[a, y0 + 4], [b, y1]], C.slateHi, 3) + S([[a, y1], [b, y0 + 4]], C.slate, 3);
        else s += P([[a + 3, y0 + 6], [b - 3, y0 + 6], [b - 3, y1 - 1], [a + 3, y1 - 1]], C.slate, INK) + RR(a + 8, y0 + 12, b - a - 16, 5, 2.5, C.space);
        s += R(a - 2, y0 + 4, 4, y1 - y0 - 2, C.slate);
    });
    s += R(x0, y0, x1 - x0, 7, C.slate, INK) + R(x0, y0, x1 - x0, 2.6, C.slateHi) + R(x0, y1, x1 - x0, 6, C.slate, INK) + R(x0, y1, x1 - x0, 2, C.slateHi);
    // The cradle posts: a column, a splayed head, an orange pad against the belly.
    for (const x of POSTS) {
        s += R(x - 5, 270, 10, 21, C.slate, INK) + R(x - 5, 270, 3.4, 21, C.slateHi) + P([[x - 16, 262], [x + 16, 262], [x + 9, 271], [x - 9, 271]], C.slateHi, INK) + R(x - 16, 258.6, 32, 4, C.orange, INK);
    }
    // The buffer at the end, and a walkway rail of uneven posts along part of the top.
    s += P([[x1 - 4, y0 - 8], [x1 + 8, y0 - 8], [x1 + 12, y0 - 2], [x1 + 12, y1 + 8], [x1 - 4, y1 + 8]], C.slateHi, INK) + R(x1 + 2, y0 - 8, 10, y1 - y0 + 16, C.slate) + R(x1 - 4, y0 + 8, 16, 5, C.orange, INK);
    s += S([[120, 283], [206, 283]], C.slateHi, 1.4) + S([[124, 283], [124, 290]], C.slateHi, 1.4) + S([[158, 283], [158, 290]], C.slateHi, 1.4) + S([[202, 283], [202, 290]], C.slateHi, 1.4);
    svg('truss', [-8, 256, 344, 72], s);
}

/* ---- fore: the pier nearest the eye, across the lower right corner: a deck seen from above with a lit
   edge, a lamp mast, a mooring drum ---- */
{
    let s = P([[150, 460], [204, 404], [368, 384], [368, 460]], C.slate, INK);
    s += P([[204, 404], [368, 384], [368, 390], [202, 411]], C.slateHi) + P([[202, 411], [368, 390], [368, 394], [199, 415]], C.orange);
    s += P([[150, 460], [204, 404], [212, 403], [166, 460]], C.space, ' fill-opacity="0.5"');
    // Deck seams running away, and plates of different sizes.
    s += S([[250, 460], [262, 404]], C.space, 1) + S([[318, 460], [322, 396]], C.space, 1);
    s += P([[214, 424], [246, 420], [242, 440], [204, 444]], C.slateHi, ' fill-opacity="0.5"') + P([[272, 418], [308, 414], [308, 422], [270, 426]], C.space, ' fill-opacity="0.6"') + P([[330, 426], [360, 424], [360, 448], [328, 450]], C.slateHi, ' fill-opacity="0.45"');
    // The mast, with a dish half way up and a lamp head.
    s += R(288, 346, 5, 56, C.slateHi, INK) + P([[281, 346], [300, 346], [297, 338], [284, 338]], C.slate, INK) + D('M296 364A9 9 0 0 0 296 382Z', C.hull, INK) + R(280, 398, 21, 6, C.slate, INK);
    // The mooring drum.
    s += E(344, 404, 13, 5, C.slateHi, INK) + R(331, 388, 26, 16, C.slateHi, INK) + R(344, 388, 13, 16, C.slate) + E(344, 388, 13, 5, C.hull, INK) + R(331, 394, 26, 3, C.orange);
    svg('fore', [148, 334, 222, 126], s);
}

/* ---- lights: the dock's lamps in four uneven groups; each lamp is a small disc in a soft halo ---- */
{
    const lamp = (x, y, col = C.gold, r = 2.1) => O(x, y, r * 3.6, 'url(#l)') .replace('url(#l)', col === C.gold ? 'url(#l)' : 'url(#m)') + O(x, y, r, col) + O(x - r * 0.3, y - r * 0.3, r * 0.4, C.white);
    const defs = `<defs>${radial('l', [[0, C.gold, 0.7], [1, C.gold, 0]])}${radial('m', [[0, C.orange, 0.7], [1, C.orange, 0]])}</defs>`;
    const group = (name, pts) => {
        const x0 = Math.floor(Math.min(...pts.map(p => p[0])) - 9), y0 = Math.floor(Math.min(...pts.map(p => p[1])) - 9);
        const x1 = Math.ceil(Math.max(...pts.map(p => p[0])) + 9), y1 = Math.ceil(Math.max(...pts.map(p => p[1])) + 9);
        svg(name, [x0, y0, x1 - x0, y1 - y0], defs + pts.map(([x, y, c]) => lamp(x, y, c === 'o' ? C.orange : C.gold)).join(''));
    };
    // One lamp on each clamp housing, off its centre, and one up each arm. No two lamps side by side anywhere.
    group('lights-1', [[110, 141], [124, 44]]);
    group('lights-2', [[231, 137, 'o'], [214, 40]]);
    // Along the truss, at uneven spacing.
    group('lights-3', [[14, 285], [60, 285], [146, 279, 'o'], [262, 285], [306, 285]]);
    // On the pier: the lamp head, the deck edge, the drum.
    group('lights-4', [[290.5, 342], [230, 406.5], [346, 381, 'o']]);
}

/* ---- the bay's light: a round fall-off, a flare along the hull, a bright heart ---- */
{
    const [cx, cy] = BAY_C;
    let s = `<defs>${radial('g', [[0, C.white, 0.6], [0.22, C.gold, 0.42], [0.55, C.gold, 0.14], [1, C.gold, 0]])}${radial('b', [[0, C.white, 0.9], [0.45, C.gold, 0.4], [1, C.gold, 0]])}</defs>`;
    s += O(cx, cy, 118, 'url(#g)') + E(cx, cy, 150, 9, 'url(#b)') + E(cx, cy, 30, 24, 'url(#b)');
    svg('bay-glow', [cx - 150, cy - 118, 300, 236], s);
    /* ---- fleck: one bright fleck ---- */
    svg('fleck', [cx - 3, cy - 3, 6, 6], P([[cx, cy - 3], [cx + 3, cy], [cx, cy + 3], [cx - 3, cy]], C.gold));
}

process.stdout.write(JSON.stringify({ boxes: BOXES, bay: BAY_C, mouth: [MOUTH[0] + DX, MOUTH[1] + DY] }) + '\n');
