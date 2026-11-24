// Generator for the "firecrackers" wrapper art: a Spring Festival garden wall in flat gouache. A whitewashed
// wall under grey upturned tile eaves, a round moon gate shut by a plain red round door, two long strings of
// red firecrackers hanging from the eave tips, potted mandarin trees, plum branches from the corners, stone
// paving. Beyond the gate: a bright courtyard with a small pavilion. No outline, no filter, no blend mode;
// glows are plain radial gradients with alpha stops. Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas), passed
// through the art gate's own serialiser so what is written is canonical.
// Run: node scripts/art/firecrackers.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeSvg } from '../svg-allow.mjs';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'firecrackers');
if (!OUT.endsWith('wrappers/firecrackers')) throw new Error('out dir must be public/wrappers/firecrackers');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: vermilion in two tones, gold, whitewash, warm smoke grey, tile grey, ink, two greens, the
   apricot daylight sky, plum-blossom pink, mandarin orange. Twelve colours, theme included. */
const C = {
    red: '#D93A26',
    redLo: '#9E2418',
    gold: '#E8B33C',
    white: '#F4EDE1',
    smoke: '#C9BEB0',
    tile: '#6A6C73',
    ink: '#2B2C31',
    green: '#5C8A4E',
    greenLo: '#355E3B',
    sky: '#F5CF92',
    pink: '#F09A8C',
    orange: '#EE8526',
};

/* ---- helpers ---- */
const f = n => String(Math.round(n * 10) / 10);
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const line = (x1, y1, x2, y2, col, w, extra = '') => `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round" fill="none"${extra}/>`;
/** A circle as path data (for holes cut with evenodd). */
const ring = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

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

/**
 * A large irregular lobed mass (foliage, smoke, rock): points round an ellipse at uneven spacing, joined by
 * outward arcs of uneven size, so the rim is a run of bulges of different widths, never equal circles.
 */
function lobed(cx, cy, rx, ry, n, seed, bulge = 0.62, rough = 0.16) {
    const r = rng(seed);
    const steps = [];
    for (let i = 0; i < n; i += 1) steps.push(0.6 + r() * 0.9);
    const sum = steps.reduce((a, b) => a + b, 0);
    let a = r() * Math.PI * 2;
    const pts = [];
    for (let i = 0; i < n; i += 1) {
        const k = 1 - rough + r() * rough * 2;
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
        a += (steps[i] / sum) * Math.PI * 2;
    }
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < n; i += 1) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % n];
        const chord = Math.hypot(x2 - x1, y2 - y1);
        const rad = chord * bulge * (0.85 + r() * 0.3);
        d += `A${f(rad)} ${f(rad)} 0 0 1 ${f(x2)} ${f(y2)}`;
    }
    return `${d}Z`;
}

function svg(name, box, inner) {
    const [x, y, w, h] = box;
    const text = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    const { svg: clean, problems } = sanitizeSvg(text);
    if (clean === undefined) throw new Error(`${name}: ${problems.join('; ')}`);
    if (clean !== text) throw new Error(`${name}: not canonical`);
    writeFileSync(join(OUT, `${name}.svg`), clean);
}

/* ---- geometry shared with src/wrappers/firecrackers.ts ---- */
const GX = 180, GY = 262, GR = 98; // the moon gate
const GROUND = 372;
const SL = 58, SR = 302; // the two strings
const TOP = 104, SEG = 56, NSEG = 5; // segment k (1 = lowest) spans [TOP + (NSEG - k) * SEG, + SEG]
const BOTTOM = TOP + NSEG * SEG; // 384

/* ================================================================== garden beyond the gate */
{
    const box = [GX - GR, GY - GR, 2 * GR, 2 * GR];
    let s = rect(box[0], box[1], box[2], box[3], C.sky);
    // Far trees: big lobed masses behind everything, deep green with lighter fronts, a few plum blossoms.
    s += path(lobed(110, 214, 58, 40, 9, 11), C.greenLo) + path(lobed(252, 206, 60, 44, 9, 12), C.greenLo);
    s += path(lobed(122, 232, 40, 26, 8, 13), C.green) + path(lobed(240, 228, 42, 28, 8, 14), C.green);
    const pr = rng(77);
    for (let i = 0; i < 13; i += 1) {
        const left = i % 2 === 0;
        const x = left ? 86 + pr() * 56 : 214 + pr() * 60;
        const y = 186 + pr() * 58;
        s += circle(x, y, 1.8 + pr() * 1.6, i % 3 === 0 ? C.white : C.pink);
    }
    // The inner courtyard's far wall, low, with its own grey coping.
    s += rect(box[0], 262, box[2], 40, C.white) + rect(box[0], 256, box[2], 7, C.tile) + rect(box[0], 254, box[2], 3, C.ink) + rect(box[0], 263, box[2], 4, C.smoke);
    // Courtyard paving and a pale path leading to the pavilion.
    s += rect(box[0], 300, box[2], 62, C.smoke);
    s += poly([[146, 362], [214, 362], [194, 308], [166, 308]], C.white);
    s += line(152, 348, 208, 348, C.tile, 0.8, ' opacity="0.4"') + line(158, 330, 202, 330, C.tile, 0.8, ' opacity="0.4"') + line(162, 318, 198, 318, C.tile, 0.8, ' opacity="0.4"');
    // Pavilion: a lit interior, red columns, a painted beam, an upturned grey roof, a stone platform.
    s += rect(150, 246, 60, 54, C.sky) + rect(150, 246, 60, 8, C.gold, ' opacity="0.7"');
    s += rect(144, 246, 7, 56, C.red) + rect(209, 246, 7, 56, C.red) + rect(144, 246, 2.5, 56, C.redLo) + rect(209, 246, 2.5, 56, C.redLo);
    s += rect(138, 240, 84, 8, C.redLo) + rect(138, 247, 84, 2, C.gold);
    s += path('M158 212L202 212Q214 226 238 222Q230 238 220 241L140 241Q130 238 122 222Q146 226 158 212Z', C.tile);
    s += path('M140 236L220 236Q230 234 238 222Q230 238 220 241L140 241Q130 238 122 222Q130 234 140 236Z', C.ink);
    s += rect(154, 208, 52, 5, C.ink) + path('M154 208Q150 206 148 200Q154 204 156 208Z', C.ink) + path('M206 208Q210 206 212 200Q206 204 204 208Z', C.ink);
    s += rect(130, 300, 100, 9, C.tile) + rect(130, 300, 100, 2.5, C.ink, ' opacity="0.5"');
    // One red lantern under the eave, gold caps and a short tassel.
    s += rect(179.4, 249, 1.2, 8, C.ink) + rect(175, 256, 10, 3, C.gold) + `<ellipse cx="180" cy="268" rx="12" ry="11" fill="${C.red}"/>` + path('M180 257A12 11 0 0 0 180 279A5 11 0 0 1 180 257Z', C.redLo) + rect(175, 278, 10, 3, C.gold) + poly([[178, 281], [182, 281], [183.5, 290], [176.5, 290]], C.red);
    // A garden rock on the left, a clipped shrub on the right, in front of the far wall.
    s += poly([[88, 318], [92, 292], [100, 276], [96, 262], [108, 258], [118, 270], [116, 286], [126, 298], [124, 318]], C.smoke) + poly([[108, 258], [118, 270], [116, 286], [126, 298], [124, 318], [110, 318], [112, 296], [104, 280]], C.tile);
    s += path(lobed(258, 300, 30, 22, 8, 33), C.greenLo) + path(lobed(252, 296, 20, 14, 7, 34), C.green);
    svg('garden', box, s);
}

/* ================================================================== gold glow at the gate */
{
    const R = 150;
    const s = `<defs><radialGradient id="g"><stop offset="0" stop-color="${C.gold}" stop-opacity="0.72"/><stop offset="0.3" stop-color="${C.gold}" stop-opacity="0.42"/><stop offset="0.62" stop-color="${C.gold}" stop-opacity="0.14"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient></defs>` + circle(GX, GY, R, 'url(#g)');
    svg('glow', [GX - R, GY - R, 2 * R, 2 * R], s);
}

/* ================================================================== the round door */
{
    let s = circle(GX, GY, GR, C.redLo);
    // The face of the door, set back a little: the hard-edged shade at upper left is the rim's shadow.
    s += circle(GX + 4, GY + 6, GR - 2, C.red);
    s += `<circle cx="${GX}" cy="${GY}" r="${GR - 12}" fill="none" stroke="${C.gold}" stroke-width="2" opacity="0.75"/>`;
    svg('door', [GX - GR, GY - GR, 2 * GR, 2 * GR], s);
}

/* ================================================================== the wall, roofs, sky and paving */
{
    let s = rect(0, 0, 360, 140, C.sky);
    // Two slow clouds in the daylight sky.
    s += path(lobed(196, 30, 46, 11, 7, 41, 0.55, 0.1), C.white, ' opacity="0.75"') + path(lobed(122, 46, 34, 9, 6, 42, 0.55, 0.1), C.white, ' opacity="0.6"');
    // Treetops behind the wall at both ends.
    s += path(lobed(6, 120, 40, 30, 8, 43), C.greenLo) + path(lobed(22, 128, 26, 16, 7, 44), C.green);
    s += path(lobed(356, 116, 42, 34, 8, 45), C.greenLo) + path(lobed(338, 128, 26, 16, 7, 46), C.green);
    // The wall's long coping.
    s += rect(-2, 114, 364, 6, C.ink) + rect(-2, 120, 364, 11, C.tile) + rect(-2, 130, 364, 4, C.ink);
    // The whitewashed wall with the gate cut through it, the shade under the coping, a warm grey plinth.
    s += path(`M0 134H360V${GROUND}H0Z${ring(GX, GY, GR)}`, C.white, ' fill-rule="evenodd"');
    s += path(`M0 134H360V146H0Z`, C.smoke, ' opacity="0.7"');
    s += rect(0, GROUND - 16, 360, 16, C.smoke);
    // The gate's stone rim and its sill.
    s += path(`${ring(GX, GY, GR + 10)}${ring(GX, GY, GR)}`, C.tile, ' fill-rule="evenodd"');
    s += `<circle cx="${GX}" cy="${GY}" r="${GR + 0.8}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
    s += path(`M${GX - 52} ${GROUND - 10}H${GX + 52}L${GX + 60} ${GROUND + 2}H${GX - 60}Z`, C.tile) + rect(GX - 60, GROUND, 120, 2.5, C.ink, ' opacity="0.5"');
    // The gatehouse roof over the gate: ridge, slope, a dark fascia sweeping up into the tips, a painted beam.
    s += path('M92 62L268 62Q292 86 332 60Q318 98 296 106L64 106Q42 98 28 60Q68 86 92 62Z', C.tile);
    s += path('M74 94L286 94Q312 94 332 60Q318 98 296 106L64 106Q42 98 28 60Q48 94 74 94Z', C.ink);
    s += path('M96 62L264 62L272 70L88 70Z', C.white, ' opacity="0.22"');
    s += rect(90, 52, 180, 10, C.ink) + path('M90 52Q82 50 78 40Q86 46 92 54Z', C.ink) + path('M270 52Q278 50 282 40Q274 46 268 54Z', C.ink);
    s += rect(80, 106, 200, 8, C.redLo) + rect(80, 113, 200, 2.4, C.gold);
    // Where the strings hang: a short cord and a gold cap under each tip.
    for (const x of [SL, SR]) s += rect(x - 0.8, 98, 1.6, TOP - 96, C.ink) + circle(x, TOP - 1, 3.4, C.gold);
    // Stone paving: slabs in perspective, joints of uneven spacing, a shade line along the wall's foot.
    s += rect(0, GROUND, 360, 450 - GROUND, C.smoke);
    s += rect(0, GROUND, 360, 4, C.tile, ' opacity="0.45"');
    for (const y of [389, 411, 440]) s += rect(0, y, 360, 1.4, C.tile, ' opacity="0.5"');
    const rows = [[GROUND + 4, 389, -12], [389, 411, 18], [411, 440, -26], [440, 452, 8]];
    for (const [y1, y2, shift] of rows) {
        for (let x = -40 + shift; x < 420; x += 74) {
            // Joints lean away from the gate, as if seen from in front.
            const lean = (x - GX) * 0.16;
            s += line(x, y1, x + lean * ((y2 - y1) / 30), y2, C.tile, 1.2, ' opacity="0.45"');
        }
    }
    svg('wall', [0, 0, 360, 450], s);
}

/* ================================================================== mandarin trees in pots */
{
    let s = '';
    const tree = (cx, flip, seed) => {
        const r = rng(seed);
        let t = rect(cx - 3, 352, 6, 26, C.ink);
        t += path(lobed(cx, 316, 54, 50, 10, seed), C.greenLo);
        t += path(lobed(cx - 8 * flip, 306, 40, 36, 9, seed + 1), C.green);
        // Mandarins: odd numbers, two sizes, each with one leaf.
        const spots = [];
        for (let i = 0; i < 11; i += 1) {
            const a = r() * Math.PI * 2;
            const d = 10 + r() * 36;
            const x = cx + Math.cos(a) * d * 1.05;
            const y = 316 + Math.sin(a) * d * 0.95;
            if (spots.some(([px, py]) => Math.hypot(px - x, py - y) < 13)) continue;
            spots.push([x, y]);
        }
        for (const [x, y] of spots) t += circle(x, y, 5.2 + r() * 1.6, C.orange) + poly([[x, y - 5], [x + 5 * flip, y - 9], [x + 1 * flip, y - 4]], C.greenLo);
        // The pot: a dark glazed bowl with a gold band, on three short feet.
        t += path(`M${cx - 30} 376L${cx + 30} 376L${cx + 24} 428Q${cx} 436 ${cx - 24} 428Z`, C.ink);
        t += rect(cx - 33, 372, 66, 8, C.tile) + rect(cx - 28, 390, 56, 5, C.gold) + path(`M${cx - 30 * flip} 376L${cx - 22 * flip} 376L${cx - 18 * flip} 430L${cx - 24 * flip} 428Z`, C.tile, ' opacity="0.5"');
        t += rect(cx - 22, 430, 8, 7, C.ink) + rect(cx + 14, 430, 8, 7, C.ink);
        return t;
    };
    s += tree(20, 1, 51) + tree(340, -1, 61);
    svg('trees', [0, 258, 360, 186], s);
}

/* ================================================================== red paper on the ground, after */
{
    const r = rng(91);
    let s = '';
    const bit = (x, y, sz, col) => {
        const a = r() * Math.PI;
        const w = sz, h = sz * (0.45 + r() * 0.35);
        const c = Math.cos(a), sn = Math.sin(a);
        const P = [[-w, -h], [w, -h * (0.7 + r() * 0.5)], [w * (0.8 + r() * 0.3), h], [-w, h]].map(([px, py]) => [x + px * c - py * sn, y + px * sn + py * c]);
        return poly(P, col);
    };
    const pick = () => {
        const v = r();
        return v < 0.6 ? C.red : v < 0.88 ? C.redLo : C.gold;
    };
    // Heaps under each string, thinning out towards the gate and the front.
    for (const sx of [SL, SR]) {
        for (let i = 0; i < 46; i += 1) {
            const d = Math.pow(r(), 1.6);
            const x = sx + (r() * 2 - 1) * (14 + d * 70);
            const y = 380 + r() * 56 * (0.4 + d);
            s += bit(x, y, 2.2 + r() * 2.8, pick());
        }
    }
    for (let i = 0; i < 40; i += 1) s += bit(20 + r() * 320, 376 + r() * 70, 1.8 + r() * 2.4, pick());
    svg('debris', [0, 366, 360, 84], s);
}

/* ================================================================== the firecracker strings, five segments each */
for (const [side, x] of [['l', SL], ['r', SR]]) {
    for (let k = 1; k <= NSEG; k += 1) {
        const y0 = TOP + (NSEG - k) * SEG;
        const r = rng(k * 13 + (side === 'l' ? 0 : 7));
        let back = '', front = '';
        // A cracker: a narrow tube hanging out and down from the cord, a gold paper end on its outer tip.
        const cracker = (y, dir, col) => {
            const ang = ((52 + r() * 14) * Math.PI) / 180;
            const len = 13 + r() * 4;
            const ax = x + dir * 1.5, ay = y;
            const bx = ax + dir * Math.sin(ang) * len, by = ay + Math.cos(ang) * len;
            const nx = -Math.cos(ang) * 2.8 * dir, ny = Math.sin(ang) * 2.8;
            const tx = (bx - ax) / len, ty = (by - ay) / len;
            const cx = bx - tx * 3, cy = by - ty * 3;
            return poly([[ax + nx, ay + ny], [cx + nx, cy + ny], [cx - nx, cy - ny], [ax - nx, ay - ny]], col) + poly([[cx + nx, cy + ny], [bx + nx, by + ny], [bx - nx, by - ny], [cx - nx, cy - ny]], C.gold);
        };
        for (let i = 0; i < 8; i += 1) {
            const y = y0 + 1 + i * 7;
            const frontDir = i % 2 === 0 ? -1 : 1;
            back += cracker(y + 3.5, -frontDir, C.redLo);
            front += cracker(y, frontDir, C.red);
        }
        let s = back + rect(x - 1.6, y0, 3.2, SEG + 1, C.redLo) + front;
        let h = SEG + 16;
        if (k === 1) {
            // The tail of the string: a gold knot and a short red tassel.
            const b = BOTTOM + 4;
            s += circle(x, b, 4, C.gold) + poly([[x - 4.5, b + 3], [x + 4.5, b + 3], [x + 7, b + 20], [x - 7, b + 20]], C.red) + poly([[x, b + 3], [x + 4.5, b + 3], [x + 7, b + 20], [x + 1.5, b + 20]], C.redLo);
            h = SEG + 30;
        }
        svg(`seg-${side}${k}`, [x - 20, y0 - 2, 40, h], s);
    }
}

/* ================================================================== red paper bits, for the scatters */
for (const [side, x] of [['l', SL], ['r', SR]]) {
    const y = BOTTOM - SEG / 2;
    svg(`bits-${side}a`, [x - 7, y - 5, 14, 10], poly([[x - 6, y - 3], [x + 1, y - 4], [x + 2, y + 2], [x - 5, y + 3]], C.red) + poly([[x + 3, y - 1], [x + 6, y], [x + 5, y + 4], [x + 3, y + 3]], C.gold));
    svg(`bits-${side}b`, [x - 7, y - 5, 14, 10], poly([[x - 5, y - 2], [x + 4, y - 4], [x + 5, y + 1], [x - 4, y + 3]], C.redLo) + poly([[x - 6, y + 2], [x - 2, y + 2], [x - 3, y + 4.5], [x - 6, y + 4]], C.red));
}

/* ================================================================== smoke */
{
    // Smoke along both strings: tall columns of lobed masses, grey with a pale side.
    let s = '';
    for (const [x, seed, dir] of [[SL, 101, 1], [SR, 111, -1]]) {
        s += path(lobed(x, 318, 52, 92, 11, seed, 0.6, 0.2), C.smoke);
        s += path(lobed(x + 14 * dir, 238, 40, 46, 8, seed + 1, 0.6, 0.2), C.smoke);
        s += path(lobed(x - 10 * dir, 300, 34, 62, 9, seed + 2, 0.6, 0.2), C.white);
        s += path(lobed(x + 6 * dir, 230, 24, 26, 7, seed + 3, 0.6, 0.2), C.white);
    }
    svg('smoke-side', [0, 170, 360, 240], s);
    // The big cloud over the gate that covers the door's going.
    let c = path(lobed(GX, GY, 126, 112, 13, 121, 0.6, 0.14), C.smoke);
    c += path(lobed(GX - 22, GY - 18, 86, 72, 10, 122, 0.6, 0.18), C.white);
    c += path(lobed(GX + 40, GY + 40, 58, 44, 8, 123, 0.6, 0.2), C.tile, ' opacity="0.25"');
    svg('smoke-c', [GX - 150, GY - 136, 300, 272], c);
}

/* ================================================================== plum branches from the top corners */
{
    const branch = (pts, w0) => {
        let s = '';
        for (let i = 0; i < pts.length - 1; i += 1) s += line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], C.ink, w0 * (1 - i / pts.length) + 1.2);
        return s;
    };
    const flower = (x, y, rr, r, white) => {
        const a0 = r() * Math.PI;
        let s = '';
        for (let i = 0; i < 5; i += 1) {
            const a = a0 + (i * 2 * Math.PI) / 5;
            s += circle(x + Math.cos(a) * rr, y + Math.sin(a) * rr, rr * 0.95, white ? C.white : C.pink);
        }
        return s + circle(x, y, rr * 0.55, white ? C.pink : C.redLo) + circle(x, y, rr * 0.22, C.gold);
    };
    const make = (name, box, mirror, seed) => {
        const r = rng(seed);
        const M = ([x, y]) => [mirror ? 360 - x : x, y];
        const L = mirror
            ? { main: [[-6, 6], [26, 22], [58, 20], [88, 30], [118, 26], [150, 38]], a: [[26, 22], [34, 40], [28, 52]], b: [[88, 30], [102, 12], [126, 6]], c: [[118, 26], [132, 44]], spots: [[16, 12], [40, 24], [56, 14], [74, 26], [96, 34], [110, 20], [130, 30], [148, 36], [34, 44], [28, 54], [104, 12], [124, 6], [134, 46]] }
            : { main: [[-6, 18], [30, 30], [62, 26], [96, 44], [132, 48], [160, 62]], a: [[30, 30], [42, 52], [38, 66]], b: [[96, 44], [110, 22], [136, 14]], c: [[62, 26], [74, 8], [70, -4]], spots: [[18, 24], [48, 30], [60, 18], [84, 38], [100, 50], [122, 42], [146, 56], [160, 60], [42, 54], [38, 66], [118, 18], [138, 14], [76, 8]] };
        const main = L.main.map(M);
        let s = branch(main, 7) + branch(L.a.map(M), 4) + branch(L.b.map(M), 3) + branch(L.c.map(M), 3);
        const spots = L.spots.map(M);
        spots.forEach(([x, y], i) => {
            if (i % 5 === 3) s += circle(x, y, 2.6, C.redLo) + circle(x - 0.8, y - 0.8, 1.6, C.pink);
            else s += flower(x, y, 2.6 + r() * 1.8, r, i % 4 === 1);
        });
        svg(name, box, s);
    };
    make('plum-l', [0, 0, 172, 116], false, 131);
    make('plum-r', [188, 0, 172, 116], true, 141);
}
