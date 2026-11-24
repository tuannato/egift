// Generator for the "bauble" wrapper art: the inside of a fir tree, close up, in flat gouache cut
// shapes. Saw-edged boughs in four greens fill the frame, hung with flat ornaments of different
// silhouettes; at the centre one large red disc with a gold band across its middle hangs on a thread.
// Behind it waits a round diorama, also a flat disc: a small snowy village at night.
// No outline, no filter, no blend mode, no shading of round forms: a form is one flat fill plus flat
// pattern. The only gradients are alpha fades of the gold (the lights' halos, the windows' halos, the
// glow behind the diorama).
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/bauble.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'bauble');
if (!OUT.endsWith('wrappers/bauble')) throw new Error('out dir must be public/wrappers/bauble');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: four fir greens, two reds, two golds, two creams (snow and its shade), two night blues. */
const C = {
    fir: '#0F2A22',
    firMid: '#1C4A38',
    firLt: '#2F6B4F',
    firHi: '#4E8F68',
    red: '#B3242B',
    redLo: '#7F151C',
    gold: '#E3B04B',
    goldLo: '#B07F2A',
    cream: '#F4EAD5',
    creamLo: '#D9C9A8',
    night: '#16304A',
    nightLt: '#2B4E6E',
};

const f = n => String(Math.round(n * 10) / 10);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const polyD = pts => `M${pts.map(pt).join('L')}Z`;
const poly = (pts, fill, extra = '') => `<path d="${polyD(pts)}" fill="${fill}"${extra}/>`;
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const line = (x1, y1, x2, y2, stroke, w, extra = '') => `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" fill="none" stroke="${stroke}" stroke-width="${w}"${extra}/>`;
const stop = (at, colour, a) => `<stop offset="${at}" stop-color="${colour}" stop-opacity="${a}"/>`;
const rad = d => (d * Math.PI) / 180;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
/** A small seeded generator (mulberry32): the boughs fall the same way every run. */
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

/**
 * The outline of a saw-edged blade from (x, y), `len` long toward `ang` (degrees, clockwise from
 * +x), `W` its half width. `sweep` > 0 throws each tooth forward, toward the tip (a fir bough's
 * needles); `sweep` < 0 lets it droop back toward the base (a small fir tree's tiers). `taper` is the
 * power of the narrowing toward the tip.
 */
function blade(x, y, ang, len, W, n, sweep = 1, taper = 0.75) {
    const c = Math.cos(rad(ang)), s = Math.sin(rad(ang));
    const at = (t, off) => [x + c * t * len - s * off, y + s * t * len + c * off];
    const w = t => W * Math.pow(Math.max(0, 1 - t), taper) * (sweep > 0 ? 0.4 + 0.6 * Math.min(1, t / 0.16) : 1);
    const side = sign => {
        const out = [];
        for (let i = 0; i < n; i++) {
            const t = i / n;
            out.push(at(t, sign * 0.3 * w(t)), at(t + (sweep * 1.15) / n, sign * w(t)));
        }
        return out;
    };
    return [at(0, 0), ...side(-1), at(1.06, 0), ...side(1).reverse()];
}
const bough = (x, y, ang, len, W, fill, extra = '') => poly(blade(x, y, ang, len, W, Math.max(5, Math.round(len / 10))), fill, extra);
/** The same, on whole units and with fewer teeth: for the many boughs of the far layer. */
const farBough = (x, y, ang, len, W, fill) => `<path d="M${blade(x, y, ang, len, W, Math.max(5, Math.round(len / 12))).map(([px, py]) => `${Math.round(px)} ${Math.round(py)}`).join('L')}Z" fill="${fill}"/>`;
/** A frond: a bough with smaller boughs leaving it to both sides, and a narrow second tone along its middle. */
function frond(x, y, ang, len, W, a, b, sides = 3) {
    const c = Math.cos(rad(ang)), s = Math.sin(rad(ang));
    let out = '';
    for (let i = 0; i < sides; i++) {
        const t = 0.12 + (0.5 * i) / Math.max(1, sides - 1);
        const l = len * (0.62 - 0.3 * t);
        for (const sign of [-1, 1]) out += bough(x + c * t * len, y + s * t * len, ang + sign * 34, l, W * 0.7, a);
    }
    out += bough(x, y, ang, len, W, a);
    if (b) {
        out += bough(x + c * len * 0.1, y + s * len * 0.1, ang, len * 0.86, W * 0.4, b);
        for (let i = 0; i < sides; i++) {
            const t = 0.12 + (0.5 * i) / Math.max(1, sides - 1);
            const l = len * (0.62 - 0.3 * t) * 0.8;
            for (const sign of [-1, 1]) out += bough(x + c * t * len, y + s * t * len, ang + sign * 34, l, W * 0.26, b);
        }
    }
    return out;
}

/* ---- back: the tree seen from inside its boughs. Tiers sweep out and down from the trunk's line (the
   middle of the frame), upper tiers lying over lower ones: a far pass in the mid green, a nearer pass in
   the light green, a few tips in the lightest. ---- */
{
    const rnd = seeded(11);
    let s = rect(-6, -6, 372, 462, C.fir);
    const tier = (y0, ds, len, W, fill, jitter, shift = 0) => {
        let out = '';
        for (const sign of [-1, 1]) {
            for (const d of ds) {
                const j = () => (rnd() * 2 - 1) * jitter;
                const x = 180 + sign * (d + shift + j() * 8);
                const y = y0 + d * 0.16 + j() * 6;
                const droop = 24 + d * 0.1 + j() * 9;
                out += farBough(x, y, sign > 0 ? droop : 180 - droop, len * (0.9 + rnd() * 0.25), W * (0.9 + rnd() * 0.2), fill);
            }
        }
        return out;
    };
    // Lower tiers first: each tier lies over the one below it.
    for (let y = 452; y >= -40; y -= 54) s += tier(y, [4, 56, 112, 168], 104, 27, C.firMid, 1);
    for (let y = 440; y >= -30; y -= 78) s += tier(y, [30, 104, 170], 84, 20, C.firLt, 1, 6);
    // Tips in the lightest green, small, where the frame would otherwise go quiet.
    for (const [x, y, a, l] of [[66, 214, 152, 46], [296, 126, 30, 44], [120, 332, 148, 42], [250, 318, 34, 46], [150, 58, 160, 40], [214, 396, 28, 40], [22, 60, 150, 38], [330, 384, 36, 40], [314, 250, 30, 38], [40, 318, 152, 40]]) s += bough(x, y, a, l, 11, C.firHi);
    svg('back', [-6, -6, 372, 462], s);
}

/* ---- lights: small warm lights in the boughs, each a gold dot in a soft halo. Two layers, so that
   they twinkle out of step. ---- */
{
    const light = (x, y, k = 1) => circle(x, y, 11 * k, 'url(#h)') + circle(x, y, 3 * k, C.gold) + circle(x, y, 1.4 * k, C.cream);
    const defs = `<defs><radialGradient id="h">${stop(0, C.gold, 0.6)}${stop(0.4, C.gold, 0.22)}${stop(1, C.gold, 0)}</radialGradient></defs>`;
    const A = [[112, 60], [248, 40, 0.8], [16, 142, 0.9], [344, 152], [76, 180, 0.8], [292, 196, 0.9], [152, 104, 0.8], [226, 116]];
    const B = [[58, 302], [306, 290, 0.9], [22, 356, 0.8], [340, 338], [132, 366, 0.8], [228, 372, 0.9], [14, 262, 0.8], [346, 268, 0.8]];
    svg('lights-a', [-6, -6, 372, 232], defs + A.map(l => light(...l)).join(''));
    svg('lights-b', [-6, 226, 372, 230], defs + B.map(l => light(...l)).join(''));
}

/* ---- the small ornaments: each its own layer with its thread, turning about where the thread is tied.
   All flat: a silhouette in one fill, a pattern in one or two more. ---- */
const thread = (x, y0, y1) => line(x, y0, x, y1, C.cream, 1, ' opacity="0.8"');
const cap = (x, y) => circle(x, y - 6.5, 2.6, 'none', ` stroke="${C.gold}" stroke-width="1.4"`) + rect(x - 5, y - 4, 10, 5.5, C.gold) + rect(x - 5, y - 0.5, 10, 2, C.goldLo);
const clip = (id, d) => `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>`;
const clipped = (id, inner) => `<g clip-path="url(#${id})">${inner}</g>`;
const circD = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 0 1 ${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 0 1 ${f(cx - r)} ${f(cy)}Z`;
const diamond = (cx, cy, rx, ry, fill) => poly([[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]], fill);
{
    // 1. A red drop, upper left.
    {
        const x = 50, d = 'M50 70C61 84 72 97 72 112A22 22 0 0 1 28 112C28 97 39 84 50 70Z';
        let s = thread(x, 14, 62) + clip('c', d) + path(d, C.red);
        s += clipped('c', rect(20, 122, 60, 20, C.redLo) + rect(20, 103, 60, 5, C.gold) + [38, 50, 62].map(cx => circle(cx, 114.5, 2.4, C.cream)).join(''));
        svg('drop', [26, 14, 48, 122], s + cap(x, 70));
    }
    // 2. A gold disc in bands, upper right.
    {
        const x = 306, y = 94, r = 22, d = circD(x, y, r);
        let s = thread(x, 8, 66) + clip('c', d) + path(d, C.gold);
        s += clipped('c', rect(280, 87, 52, 14, C.cream) + rect(280, 82.5, 52, 2.6, C.red) + rect(280, 103, 52, 2.6, C.red) + [290, 300.7, 311.3, 322].map(cx => diamond(cx, 94, 3.4, 4.6, C.red)).join('') + rect(280, 109, 52, 10, C.goldLo));
        svg('disc', [282, 8, 48, 110], s + cap(x, 73));
    }
    // 3. A bell, left.
    {
        const x = 34, d = 'M34 212C44 212 46 224 47 236C48 247 52 252 57 257L11 257C16 252 20 247 21 236C22 224 24 212 34 212Z';
        let s = thread(x, 168, 204) + circle(x, 260, 4.6, C.cream) + clip('c', d) + path(d, C.gold);
        s += clipped('c', rect(8, 249, 52, 9, C.goldLo) + rect(8, 231, 52, 4.4, C.red));
        svg('bell', [8, 168, 52, 98], s + cap(x, 212));
    }
    // 4. A pinecone, right: an egg of scale rows, upper rows lying over lower ones.
    {
        const x = 324, d = 'M324 206C336 206 342 220 342 232C342 248 334 262 324 264C314 262 306 248 306 232C306 220 312 206 324 206Z';
        let rows = '';
        for (let k = 5; k >= 0; k--) {
            const y = 212 + k * 9.4;
            for (let j = -2; j <= 2; j++) rows += circle(x + j * 10.4 + (k % 2 ? 5.2 : 0), y, 6.6, k % 2 ? C.gold : C.goldLo);
        }
        const s = thread(x, 158, 198) + clip('c', d) + path(d, C.redLo) + clipped('c', rows);
        svg('cone', [304, 158, 40, 108], s + cap(x, 207));
    }
    // 5. A cream spindle, lower left: two faces about its middle line.
    {
        const x = 84;
        const half = sign => `M84 356C${84 + sign * 9} 371 ${84 + sign * 13} 380 ${84 + sign * 13} 387C${84 + sign * 13} 395 ${84 + sign * 7} 405 84 422Z`;
        const d = half(-1) + half(1);
        let s = thread(x, 326, 348) + clip('c', d) + path(half(-1), C.cream) + path(half(1), C.creamLo);
        s += clipped('c', rect(66, 383, 36, 6, C.red) + rect(66, 392, 36, 2.2, C.gold));
        svg('spindle', [68, 326, 32, 98], s + cap(x, 357));
    }
    // 6. A small red disc, lower right: its lower part in the deep red, a gold line, three cream dots.
    {
        const x = 268, y = 398, r = 20, d = circD(x, y, r);
        let s = thread(x, 338, 372) + clip('c', d) + path(d, C.red);
        s += clipped('c', rect(244, 404, 48, 16, C.redLo) + rect(244, 401.5, 48, 2.6, C.gold)) + [258, 268, 278].map(cx => circle(cx, 391.5, 2.5, C.cream)).join('');
        svg('berry', [246, 338, 44, 82], s + cap(x, 379));
    }
    // 7. A gold onion, low in the middle.
    {
        const x = 180, d = 'M180 388C191 391 196 399 196 406C196 414 188 419 180 430C172 419 164 414 164 406C164 399 169 391 180 388Z';
        let s = thread(x, 360, 380) + clip('c', d) + path(d, C.gold);
        s += clipped('c', rect(160, 401, 40, 5, C.cream) + rect(160, 408.5, 40, 2.4, C.red) + rect(160, 414, 40, 18, C.goldLo));
        svg('onion', [162, 360, 36, 72], s + cap(x, 389));
    }
}

/* ---- the big disc: red, a gold band across its middle, split along the band's middle line into two
   layers. Cream diamonds sit on the seam, half on each layer. Both layers turn about the point the thread
   hangs from, so their boxes start at the top of the frame. ---- */
const BX = 180, BY = 232, BR = 88, BAND = 14;
{
    const halfD = up => `M${BX - BR} ${BY}A${BR} ${BR} 0 0 ${up ? 1 : 0} ${BX + BR} ${BY}Z`;
    const pattern = up => {
        const k = up ? -1 : 1;
        const Y = dy => BY + k * dy;
        const band = (dy, h, fill) => rect(BX - BR, Math.min(Y(dy), Y(dy + h)), 2 * BR, h, fill);
        let s = band(BAND, 24, C.redLo);
        // The deep red's far edge is scalloped, a cream dot in every scallop.
        for (let x = BX - 88; x <= BX + 88; x += 22) s += circle(x, Y(BAND + 24), 11, C.redLo);
        for (let x = BX - 88; x <= BX + 88; x += 22) s += circle(x, Y(BAND + 24), 2.6, C.cream);
        s += band(BAND + 3, 2.4, C.cream) + band(BAND + 50, 3.4, C.gold);
        // The gold band, and what lies on it: half diamonds on the seam, small red dots between them.
        s += band(0, BAND, C.gold) + band(BAND - 2.2, 2.2, C.goldLo);
        for (let x = BX - 77; x <= BX + 78; x += 22) s += poly([[x - 8, BY], [x + 8, BY], [x, Y(10)]], C.cream);
        for (let x = BX - 66; x <= BX + 67; x += 22) s += circle(x, Y(6), 2, C.red);
        return s;
    };
    const top = thread(BX, -6, 125) + clip('c', halfD(true)) + path(halfD(true), C.red) + clipped('c', pattern(true))
        + circle(BX, 129, 5.4, 'none', ` stroke="${C.gold}" stroke-width="2"`) + rect(BX - 15, 134, 30, 13, C.gold) + rect(BX - 15, 144, 30, 3.4, C.goldLo);
    svg('top', [BX - BR - 4, -6, 2 * BR + 8, BY + 6], top);
    const low = clip('c', halfD(false)) + path(halfD(false), C.red) + clipped('c', pattern(false));
    svg('low', [BX - BR - 4, -6, 2 * BR + 8, BY + BR + 8], low);
}

/* ---- the diorama: a flat disc, a small snowy village at night. Hills in two creams, houses with snow
   roofs, firs as saw-edged blades standing up. The windows are drawn here in the dull gold; the lit
   ones are a layer of their own, so that they can breathe. ---- */
const DX = 180, DY = 238, DR = 104;
/** [x, y, w, h] of every window. */
const WINDOWS = [];
{
    const tree = (x, base, h, w, a, b) => rect(x - 1.5, base - 3, 3, 6, C.fir) + poly(blade(x, base, -90, h, w, Math.max(4, Math.round(h / 8)), -1, 1), a) + (b ? poly(blade(x + w * 0.12, base - h * 0.08, -90, h * 0.8, w * 0.42, Math.max(4, Math.round(h / 9)), -1, 1), b) : '');
    /** A house seen from its gable end: a wall, a snow roof with eaves, a chimney, windows. */
    const gable = (x, base, w, h, rise, wall, wins, door = true) => {
        const top = base - h;
        let s = rect(x + w * 0.2, top - rise * 0.9, 5, rise * 0.7, C.redLo) + rect(x + w * 0.2 - 1, top - rise * 0.9 - 2.4, 7, 3, C.cream);
        s += poly([[x - w / 2, base], [x - w / 2, top], [x, top - rise], [x + w / 2, top], [x + w / 2, base]], wall);
        s += poly([[x, top - rise - 4], [x + w / 2 + 5, top + 1], [x + w / 2 + 2, top + 5], [x, top - rise + 3], [x - w / 2 - 2, top + 5], [x - w / 2 - 5, top + 1]], C.cream);
        if (door) s += rect(x - 3, base - 10, 6, 10, C.fir);
        for (const [dx, dy, ww, wh] of wins) {
            WINDOWS.push([x + dx - ww / 2, base - dy - wh, ww, wh]);
            s += rect(x + dx - ww / 2, base - dy - wh, ww, wh, C.goldLo);
        }
        return s;
    };
    /** A long house seen from its side: a wall under a slab of snow. */
    const long = (x, base, w, h, roof, wall, wins) => {
        const top = base - h;
        let s = rect(x - w * 0.28, top - roof - 6, 5, 9, C.redLo) + rect(x - w * 0.28 - 1, top - roof - 8, 7, 3, C.cream);
        s += rect(x - w / 2, top, w, h, wall);
        s += poly([[x - w / 2 - 4, top + 2], [x - w / 2 + 5, top - roof], [x + w / 2 - 5, top - roof], [x + w / 2 + 4, top + 2]], C.cream);
        for (const [dx, dy, ww, wh] of wins) {
            WINDOWS.push([x + dx - ww / 2, base - dy - wh, ww, wh]);
            s += rect(x + dx - ww / 2, base - dy - wh, ww, wh, C.goldLo);
        }
        return s;
    };
    const disc = circD(DX, DY, DR);
    let s = clip('c', disc) + path(disc, C.night);
    let v = '';
    // The far ridge and the moon.
    v += circle(232, 176, 13, C.cream);
    for (const [x, y, r] of [[118, 170, 1.3], [150, 152, 1], [186, 166, 1.2], [204, 146, 1], [262, 206, 1.1], [100, 204, 1], [168, 186, 0.9], [134, 196, 1]]) v += circle(x, y, r, C.cream, ' opacity="0.85"');
    v += path('M70 232C104 204 140 206 172 220C206 234 244 214 290 206L290 350L70 350Z', C.nightLt);
    // Firs on the ridge.
    for (const [x, b, h, w, lt] of [[92, 240, 34, 11], [108, 236, 44, 14, 1], [128, 238, 30, 10], [226, 232, 40, 13], [244, 230, 52, 15, 1], [264, 232, 34, 11], [278, 236, 26, 10]]) v += tree(x, b, h, w, lt ? C.firLt : C.firMid, lt ? C.firHi : C.firLt);
    // The middle hill, and the houses on it.
    v += path('M70 264C110 238 150 240 186 252C220 262 250 250 290 244L290 350L70 350Z', C.creamLo);
    v += gable(118, 262, 26, 18, 13, C.red, [[-6, 6, 5, 6], [6, 6, 5, 6]], false);
    v += long(160, 258, 40, 17, 9, C.nightLt, [[-11, 5, 5, 7], [0, 5, 5, 7], [11, 5, 5, 7]]);
    v += gable(204, 262, 24, 22, 13, C.redLo, [[0, 11, 6, 7]]);
    v += gable(246, 258, 28, 17, 14, C.red, [[-7, 5, 5, 6], [7, 5, 5, 6]], false);
    // The near hill, the path down it, the near house and the near firs.
    v += path('M70 296C112 270 150 276 190 288C226 298 256 286 290 280L290 350L70 350Z', C.cream);
    v += path('M172 300C168 312 184 318 180 330C178 337 172 342 170 350L196 350C196 340 202 334 200 324C198 314 186 310 188 300Z', C.creamLo);
    v += gable(180, 300, 38, 22, 18, C.red, [[-10, 7, 6, 8], [10, 7, 6, 8], [0, 24, 5, 6]]);
    v += tree(104, 306, 56, 14, C.firMid, C.firLt) + tree(126, 312, 34, 10, C.firLt, C.firHi) + tree(252, 306, 62, 15, C.firMid, C.firLt) + tree(232, 310, 30, 9, C.firLt, C.firHi) + tree(272, 300, 30, 9, C.firLt, null);
    s += clipped('c', v) + circle(DX, DY, DR - 2.5, 'none', ` stroke="${C.gold}" stroke-width="5"`);
    svg('diorama', [DX - DR - 2, DY - DR - 2, 2 * DR + 4, 2 * DR + 4], s);

    // The lit windows: the bright gold over the dull one, each in a small halo.
    let w = `<defs><radialGradient id="h">${stop(0, C.gold, 0.55)}${stop(0.45, C.gold, 0.2)}${stop(1, C.gold, 0)}</radialGradient></defs>`;
    for (const [x, y, ww, wh] of WINDOWS) w += circle(x + ww / 2, y + wh / 2, 10, 'url(#h)');
    for (const [x, y, ww, wh] of WINDOWS) w += rect(x, y, ww, wh, C.gold) + rect(x + ww / 2 - 0.4, y, 0.8, wh, C.goldLo);
    svg('windows', [DX - DR - 2, DY - DR - 2, 2 * DR + 4, 2 * DR + 4], w);

    // The glow the diorama throws on the boughs around it.
    const R = 150;
    svg('halo', [DX - R, DY - R, 2 * R, 2 * R], `<defs><radialGradient id="h">${stop(0, C.gold, 0.5)}${stop(0.66, C.gold, 0.4)}${stop(0.8, C.gold, 0.16)}${stop(1, C.gold, 0)}</radialGradient></defs>${circle(DX, DY, R, 'url(#h)')}`);
}

/* ---- flake: one flake of the snow that is shaken out when the disc parts ---- */
svg('flake', [DX - 4, DY - 4, 8, 8], circle(DX, DY, 3, C.cream));

/* ---- the near boughs: fronds hanging in from the top of the frame and standing up from its foot, in
   the light green with the lightest along their middles. ---- */
{
    let t = '';
    t += frond(-14, -4, 30, 92, 22, C.firLt, C.firHi) + frond(374, -8, 151, 88, 22, C.firLt, C.firHi);
    t += frond(118, -22, 76, 84, 18, C.firMid, C.firLt, 2) + frond(246, -24, 108, 80, 18, C.firMid, C.firLt, 2);
    t += frond(182, -30, 96, 62, 15, C.firLt, C.firHi, 2);
    svg('near-top', [-6, -6, 372, 112], t);
    let b = '';
    b += frond(-16, 470, -52, 104, 22, C.firLt, C.firHi) + frond(376, 472, -128, 104, 22, C.firLt, C.firHi);
    b += frond(92, 486, -72, 74, 18, C.firMid, C.firLt, 2) + frond(270, 488, -106, 76, 18, C.firMid, C.firLt, 2);
    b += frond(180, 492, -88, 66, 16, C.firLt, C.firHi, 2) + frond(134, 480, -98, 46, 13, C.firLt, C.firHi, 2) + frond(228, 480, -80, 46, 13, C.firLt, C.firHi, 2);
    svg('near-low', [-6, 372, 372, 84], b);
}
