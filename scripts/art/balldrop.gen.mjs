// Generator for the "balldrop" wrapper art: New Year's Eve in a big city, seen from the street looking
// straight up. A flat night poster: every tower is a fan of wedges that converge on one vanishing point
// near the top centre of the frame, each face one flat tone with rows of window blocks of uneven widths;
// a mast runs up the middle of the gap between them, and a faceted ball (a disc built from triangles in
// three flat tones) rides on it. No filter, no blend mode; the only gradients are alpha fades for light
// (the ball's halo, the street lamps). Every colour is in the palette `C`.
// Each SVG's viewBox is its layer box on the 360x450 canvas; a streamer is drawn hanging straight down
// from its upper end and is turned into place by the definition.
// Run: node scripts/art/balldrop.gen.mjs   (prints the layer boxes and streamer angles the definition uses)
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeSvg } from '../svg-allow.mjs';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'balldrop');
if (!OUT.endsWith('wrappers/balldrop')) throw new Error('out dir must be public/wrappers/balldrop');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: four indigos for the towers, the sky and its haze, a lilac for steel and rims, two golds, white, one hot vermilion. */
const C = {
    ink: '#12102B',
    deep: '#1A1740',
    mid: '#24205A',
    sky: '#332E7A',
    haze: '#4A45A8',
    lilac: '#8F8AE0',
    gold: '#F5B83D',
    goldLo: '#C98A1E',
    white: '#FFFFFF',
    hot: '#FF5A36',
};

const f = n => String(Math.round(n * 10) / 10);
const CANVAS = [-6, -6, 372, 462];

/** Small seeded PRNG (mulberry32): the same city every run. */
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
 * A picture being collected: polygons grouped by paint (one path per paint keeps the files small), free
 * markup on top, and the bounds of what was drawn.
 */
function sheet() {
    const groups = new Map();
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    let top = '';
    const grow = pts => {
        for (const [x, y] of pts) {
            b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y);
        }
    };
    return {
        /** `z` orders the paints: walls (0) under panes (1) under lit panes (2). */
        poly(pts, fill, opacity = 1, z = 0) {
            const key = `${z}|${fill}|${opacity}`;
            groups.set(key, (groups.get(key) ?? '') + `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`);
            grow(pts);
        },
        raw(markup, pts) {
            top += markup;
            grow(pts);
        },
        get empty() { return groups.size === 0 && top === ''; },
        inner() {
            let s = '';
            for (const [key, d] of [...groups].sort(([a], [b]) => Number(a[0]) - Number(b[0]))) {
                const [, fill, opacity] = key.split('|');
                s += `<path d="${d}" fill="${fill}"${opacity === '1' ? '' : ` fill-opacity="${opacity}"`}/>`;
            }
            return s + top;
        },
        /** The bounds, padded, held to whole units and to the canvas. */
        box(pad = 2) {
            const x0 = Math.max(CANVAS[0], Math.floor(b.x0 - pad)), y0 = Math.max(CANVAS[1], Math.floor(b.y0 - pad));
            const x1 = Math.min(CANVAS[0] + CANVAS[2], Math.ceil(b.x1 + pad)), y1 = Math.min(CANVAS[1] + CANVAS[3], Math.ceil(b.y1 + pad));
            return [x0, y0, x1 - x0, y1 - y0];
        },
    };
}

const BOXES = {};
/** Write one layer, through the art gate's own serialiser so that the file is already canonical. */
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    BOXES[name] = box;
    const { svg: clean, problems } = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
    if (clean === undefined) throw new Error(`${name}: ${problems.join('; ')}`);
    writeFileSync(join(OUT, `${name}.svg`), clean);
}

/* ---- the view: everything upright runs to one point, V ---- */
const V = [180, 30];
const RAD = Math.PI / 180;
/** A point `r` away from V in direction `phi` (degrees; 0 = straight down the frame, positive = to the left). */
const polar = (phi, r) => [V[0] - r * Math.sin(phi * RAD), V[1] + r * Math.cos(phi * RAD)];
/** A point of a face: `u` across its roof line from A to B, pushed `m` times as far from V (1 = on the roof line). */
const on = (A, B, u, m) => [V[0] + m * (A[0] + (B[0] - A[0]) * u - V[0]), V[1] + m * (A[1] + (B[1] - A[1]) * u - V[1])];
const inCanvas = pts => pts.some(([x, y]) => x > 0 && x < 360 && y > 0 && y < 450);

/** The street lamps' heads, and how far around each the walls stay dark. */
const LAMPS = [[50, 296, 30], [318, 398, 44]];
const LIT = [C.gold, C.gold, C.gold, C.gold, C.gold, C.gold, C.gold, C.white, C.white, C.hot];

/**
 * One face of a tower: its wall from the roof line A-B outward (toward the viewer), then its floors.
 * Floors grow as they near the viewer; each floor is cut into blocks of uneven widths, a few floors are one
 * long band, a few are blank. Every block is drawn dark on `base`; some are also drawn lit on `lit` (they
 * come on in the bloom), a few lit on `base` (on while the gift is closed), a few on `twinkle`.
 */
function face(o) {
    const { A, B, wall, pane, paneOpacity = 1, base, lit, twinkle, rnd, k = 1.13, maxR = 900, pBloom = 0.4, pTwinkle = 0, litOpacity = 1, pStreet = 0.17 } = o;
    const far = 1000 / Math.min(Math.hypot(A[0] - V[0], A[1] - V[1]), Math.hypot(B[0] - V[0], B[1] - V[1]));
    base.poly([A, B, on(A, B, 1, far), on(A, B, 0, far)], wall);
    const roofR = (Math.hypot(A[0] - V[0], A[1] - V[1]) + Math.hypot(B[0] - V[0], B[1] - V[1])) / 2;
    for (let j = 0, m = 1.06 + rnd() * 0.03; roofR * m < maxR; j += 1, m *= k) {
        const m2 = m * (1 + (k - 1) * 0.6);
        const width = Math.hypot(on(A, B, 0, m)[0] - on(A, B, 1, m)[0], on(A, B, 0, m)[1] - on(A, B, 1, m)[1]);
        const kind = rnd();
        if (kind < 0.07) continue;
        const cuts = [];
        if (kind < 0.17 || width < 12) cuts.push([0.07, 0.93]);
        else {
            const sizes = width < 34 ? [0.26, 0.4, 0.56] : width < 70 ? [0.14, 0.22, 0.34, 0.5] : [0.07, 0.1, 0.15, 0.22, 0.3];
            for (let u = 0.07; u < 0.9;) {
                const w = sizes[Math.floor(rnd() * sizes.length)];
                const end = Math.min(0.93, u + w);
                if (end - u > 0.05 && rnd() > 0.1) cuts.push([u, end]);
                u = end + 0.035 + rnd() * 0.035;
            }
        }
        // Street level is the brightest part of a closed city.
        const pOn = roofR * m > 330 ? pStreet : 0.05;
        for (const [u1, u2] of cuts) {
            const q = [on(A, B, u1, m), on(A, B, u2, m), on(A, B, u2, m2), on(A, B, u1, m2)];
            if (!inCanvas(q)) continue;
            base.poly(q, pane, paneOpacity, 1);
            // No lit pane over a street lamp: the lamp stands in front of the wall.
            if (LAMPS.some(([x, y, r]) => Math.hypot((q[0][0] + q[2][0]) / 2 - x, (q[0][1] + q[2][1]) / 2 - y) < r)) continue;
            const role = rnd(), tone = LIT[Math.floor(rnd() * LIT.length)];
            if (role < pOn) base.poly(q, tone === C.hot ? C.gold : tone, litOpacity, 2);
            else if (role < pOn + pTwinkle) twinkle.poly(q, tone === C.white && rnd() < 0.6 ? C.gold : tone);
            else if (role < pOn + pTwinkle + pBloom * (roofR * m > 400 ? 0.4 : 1)) lit.poly(q, tone, litOpacity);
        }
    }
}

/** A tower: faces side by side, each `[phi1, r1, phi2, r2, 'front' | 'side']`, sharing their upright edges. */
function tower(faces, tones, o) {
    for (const [p1, r1, p2, r2, kind] of faces) {
        face({ A: polar(p1, r1), B: polar(p2, r2), wall: tones[kind].wall, pane: tones[kind].pane, paneOpacity: tones[kind].paneOpacity, ...o });
    }
}
/** The roof line of a tower, as a thin rim of light. */
const rim = (faces, colour, opacity, width = 1.1) => {
    const pts = [polar(faces[0][0], faces[0][1]), ...faces.map(([, , p2, r2]) => polar(p2, r2))];
    return [`<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-opacity="${opacity}" stroke-linejoin="round"/>`, pts];
};

const FAR = { front: { wall: C.mid, pane: C.sky, paneOpacity: 0.75 }, side: { wall: C.deep, pane: C.mid } };
const NEAR = { front: { wall: C.deep, pane: C.mid }, side: { wall: C.ink, pane: C.deep } };

/* ---- the far ring: the sky and its haze, the towers nearest the vanishing point, the mast's own building ---- */
const farLit = sheet();
{
    const s = sheet();
    const rnd = seeded(20261231);
    // The glow of the city in the sky: two hard-edged, uneven rings about V, the inner one brighter.
    const ring = (radii, opacity) => s.poly(radii.map((r, i) => polar((i / radii.length) * 360, r)), C.haze, opacity);
    ring([250, 232, 205, 176, 150, 138, 150, 170, 160, 142, 150, 172, 200, 226], 0.38);
    ring([150, 132, 112, 96, 84, 92, 104, 96, 84, 90, 108, 130], 0.5);
    // A few far lights: plain dots of uneven size, none near the mast.
    for (let i = 0; i < 46; i += 1) {
        const phi = rnd() * 360, r = 20 + rnd() * 210, [x, y] = polar(phi, r);
        if (Math.abs(x - 180) < 9) continue;
        s.raw(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + rnd() * 0.7)}" fill="${C.white}" fill-opacity="${f(0.45 + rnd() * 0.5)}"/>`, [[x, y]]);
    }
    const left = [
        [[9, 214, 20, 203, 'front'], [20, 203, 27, 224, 'side']],
        [[27, 152, 44, 140, 'front'], [44, 140, 54, 162, 'side']],
        [[54, 120, 75, 108, 'front'], [75, 108, 90, 124, 'side']],
        [[90, 102, 125, 96, 'front'], [125, 96, 152, 112, 'side']],
    ];
    const right = [
        [[-8, 242, -17, 227, 'front'], [-17, 227, -24, 248, 'side']],
        [[-24, 178, -39, 163, 'front'], [-39, 163, -50, 184, 'side']],
        [[-50, 134, -68, 119, 'front'], [-68, 119, -86, 136, 'side']],
        [[-86, 108, -118, 99, 'front'], [-118, 99, -152, 118, 'side']],
    ];
    const reach = [360, 232, 190, 230];
    [...left, ...right].forEach((t, i) => tower(t, FAR, { base: s, lit: farLit, twinkle: farLit, rnd, k: 1.1 + (i % 3) * 0.012, maxR: reach[i % 4] + (i > 3 ? 22 : 0), pBloom: 0.36 }));
    for (const t of [...left, ...right]) s.raw(...rim(t, C.haze, 0.9));
    // The building the mast stands on: straight ahead, so one face under a level roof line.
    const A = [134, 318], B = [221, 318];
    face({ A, B, wall: C.deep, pane: C.mid, base: s, lit: farLit, twinkle: farLit, rnd, k: 1.065, pBloom: 0.44, pStreet: 0.3 });
    s.poly([[130, 314], [225, 314], [226, 320], [129, 320]], C.lilac, 0.75);
    // Two stays from the head of the mast to the roofs on either side.
    const stay = (to) => s.raw(`<path d="M180 50L${f(to[0])} ${f(to[1])}" fill="none" stroke="${C.lilac}" stroke-width="0.7" stroke-opacity="0.55"/>`, [[180, 50], to]);
    stay(polar(44, 140));
    stay(polar(-39, 163));
    svg('far', CANVAS, s.inner());
    svg('far-lit', farLit.box(), farLit.inner());
}

/* ---- the near ring: darker towers that run out of the frame on both sides, and a street lamp on each ---- */
const lampAt = { l: LAMPS[0], r: LAMPS[1] };
for (const side of ['l', 'r']) {
    const s = sheet(), lit = sheet(), tw = sheet();
    const rnd = seeded(side === 'l' ? 777 : 4242);
    const towers = side === 'l'
        ? [
            [[12, 336, 24, 320, 'front'], [24, 320, 31, 352, 'side']],
            [[31, 202, 52, 186, 'front'], [52, 186, 60, 208, 'side']],
            [[66, 136, 88, 122, 'front'], [88, 122, 104, 142, 'side']],
        ]
        : [
            [[-10, 352, -21, 335, 'front'], [-21, 335, -28, 364, 'side']],
            [[-28, 236, -33, 216, 'side'], [-33, 216, -50, 197, 'front']],
            [[-62, 142, -84, 127, 'front'], [-84, 127, -103, 150, 'side']],
        ];
    towers.forEach((t, i) => tower(t, NEAR, { base: s, lit, twinkle: tw, rnd, k: 1.085 + i * 0.012, pBloom: 0.42, pTwinkle: i === 1 ? 0.3 : 0 }));
    for (const t of towers) s.raw(...rim(t, C.lilac, 0.6, 1.2));
    // The lamp: a post running to V like every upright, a dark round head seen from under, its lit glass.
    const [hx, hy] = lampAt[side];
    const scale = side === 'l' ? 1 : 1.3;
    const away = [(hx - V[0]) / Math.hypot(hx - V[0], hy - V[1]), (hy - V[1]) / Math.hypot(hx - V[0], hy - V[1])];
    const foot = [hx + away[0] * 260, hy + away[1] * 260], n = [-away[1], away[0]];
    s.poly([[hx + n[0] * 1.6 * scale, hy + n[1] * 1.6 * scale], [hx - n[0] * 1.6 * scale, hy - n[1] * 1.6 * scale], [foot[0] - n[0] * 5 * scale, foot[1] - n[1] * 5 * scale], [foot[0] + n[0] * 5 * scale, foot[1] + n[1] * 5 * scale]], C.lilac);
    s.raw(`<circle cx="${hx}" cy="${hy}" r="${f(13 * scale)}" fill="${C.ink}" stroke="${C.lilac}" stroke-width="${f(1.6 * scale)}"/><circle cx="${hx}" cy="${hy}" r="${f(8 * scale)}" fill="${C.white}"/><circle cx="${hx}" cy="${hy}" r="${f(8 * scale)}" fill="${C.gold}" fill-opacity="0.35"/>`, [[hx - 15 * scale, hy - 15 * scale], [hx + 15 * scale, hy + 15 * scale]]);
    svg(`near-${side}`, s.box(0), s.inner());
    svg(`lit-${side}`, lit.box(), lit.inner());
    svg(`twinkle-${side}`, tw.box(), tw.inner());
    // The lamp's light: a plain fade of gold.
    const R = 46 * scale;
    svg(`lamp-${side}`, [Math.round(hx - R), Math.round(hy - R), Math.round(2 * R), Math.round(2 * R)],
        `<defs><radialGradient id="g"><stop offset="0" stop-color="${C.gold}" stop-opacity="0.6"/><stop offset="0.4" stop-color="${C.gold}" stop-opacity="0.2"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient></defs><circle cx="${hx}" cy="${hy}" r="${f(R)}" fill="url(#g)"/>`);
}

/* ---- the mast: a tapering pole from the roof to its head, a cradle where the ball comes to rest ---- */
const LAND = [180, 222], BALL_R = 46;
{
    const s = sheet();
    s.poly([[178.3, 40], [181.7, 40], [184.6, 316], [175.4, 316]], C.lilac);
    s.poly([[180, 40], [181.7, 40], [184.6, 316], [180, 316]], C.white, 0.35);
    // Its foot on the roof, and its head: a small gold lozenge.
    s.poly([[170, 316], [190, 316], [194, 306], [166, 306]], C.haze);
    s.poly([[180, 30], [184, 37], [180, 44], [176, 37]], C.gold);
    // The cradle: a shallow cup under where the ball lands.
    const y = LAND[1] + BALL_R + 3;
    s.poly([[156, y - 9], [161, y - 9], [164, y], [196, y], [199, y - 9], [204, y - 9], [199, y + 5], [161, y + 5]], C.lilac);
    s.poly([[164, y], [196, y], [199, y + 5], [161, y + 5]], C.haze);
    svg('mast', s.box(1), s.inner());
}

/* ---- the ball: a disc of triangles between rings of points, three flat tones, no shading ---- */
{
    const rnd = seeded(60);
    // A half globe of points seen straight on: rings at four heights, so the facets narrow toward the rim.
    const RINGS = [[0, 1, 0], [24, 6, 0], [47, 11, 12], [68, 15, 4], [90, 18, 10]];
    const at = ([lat, n, turn], i) => {
        const a = (turn + (i * 360) / n) * RAD, r = Math.sin(lat * RAD) * BALL_R;
        return [LAND[0] + Math.cos(a) * r, LAND[1] + Math.sin(a) * r];
    };
    // Zip each ring to the next: walk both by angle, always closing the triangle whose new point comes first.
    const tris = [];
    for (let k = 0; k < RINGS.length - 1; k += 1) {
        const inner = RINGS[k], outer = RINGS[k + 1];
        if (inner[1] === 1) {
            for (let j = 0; j < outer[1]; j += 1) tris.push([at(inner, 0), at(outer, j), at(outer, j + 1)]);
            continue;
        }
        const ai = i => inner[2] + (i * 360) / inner[1], aj = j => outer[2] + (j * 360) / outer[1];
        for (let i = 0, j = 0; i < inner[1] || j < outer[1];) {
            if (j < outer[1] && (i >= inner[1] || aj(j + 1) <= ai(i + 1))) { tris.push([at(inner, i), at(outer, j), at(outer, j + 1)]); j += 1; }
            else { tris.push([at(inner, i), at(outer, j), at(inner, i + 1)]); i += 1; }
        }
    }
    const tones = [C.gold, C.goldLo, C.white, C.gold, C.goldLo, C.gold];
    const brighter = { [C.gold]: C.white, [C.goldLo]: C.gold, [C.white]: C.white };
    const ball = sheet(), glint = sheet();
    let last = '';
    for (const t of tris) {
        let tone = tones[Math.floor(rnd() * tones.length)];
        if (tone === last) tone = tones[(tones.indexOf(tone) + 1) % tones.length];
        last = tone;
        ball.poly(t, tone);
        glint.poly(t, brighter[tone]);
    }
    const box = [LAND[0] - BALL_R, LAND[1] - BALL_R, 2 * BALL_R, 2 * BALL_R];
    svg('ball', box, ball.inner());
    svg('ball-lit', box, glint.inner());
    // Its light: one fade of gold, wide enough to reach the towers on both sides.
    const R = 112;
    svg('halo', [LAND[0] - R, LAND[1] - R, 2 * R, 2 * R],
        `<defs><radialGradient id="g"><stop offset="0" stop-color="${C.gold}" stop-opacity="0.62"/><stop offset="0.42" stop-color="${C.gold}" stop-opacity="0.26"/><stop offset="0.75" stop-color="${C.gold}" stop-opacity="0.07"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient></defs><circle cx="${LAND[0]}" cy="${LAND[1]}" r="${R}" fill="url(#g)"/>`);
}

/* ---- streamers: paper ribbons falling toward the viewer, so each runs away from V. Drawn hanging straight
   down from its upper end; the definition turns each to its angle and unrolls it along its length. ---- */
const STREAMERS = [
    [22, 150, 300, C.hot, 0.2],
    [37, 118, 190, C.white, 1.4],
    [57, 96, 124, C.gold, 2.6],
    [-20, 164, 170, C.gold, 3.3],
    [-34, 126, 200, C.hot, 4.4],
    [-55, 100, 128, C.white, 5.2],
];
const TURNS = {};
STREAMERS.forEach(([phi, r0, len, colour, phase], i) => {
    const [ax, ay] = polar(phi, r0);
    const mid = s => ax + (2.5 + 7.5 * (s / len)) * Math.sin(phase + (s / len) * (len / 15));
    const leftSide = [], rightSide = [];
    for (let s = 0; s <= len; s += 4) {
        const hw = 0.9 + 2.3 * (s / len);
        const slope = (mid(s + 0.5) - mid(s - 0.5));
        const norm = Math.hypot(1, slope);
        leftSide.push([mid(s) - hw / norm, ay + s - (hw * slope) / norm]);
        rightSide.push([mid(s) + hw / norm, ay + s + (hw * slope) / norm]);
    }
    const pts = [...leftSide, ...rightSide.reverse()];
    const name = `streamer-${i + 1}`;
    svg(name, [Math.round(ax) - 14, Math.round(ay), 28, len], `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${colour}"/>`);
    TURNS[name] = phi;
});

/* ---- paper bits: two small slips, one white and one hot, thrown as one ---- */
svg('fleck', [174, 216, 13, 11], `<path d="M175 217L181 218.2L180.2 222L174.2 220.8Z" fill="${C.white}"/><path d="M181.5 222L186.6 221L187 225.4L182 226.4Z" fill="${C.hot}"/>`);

for (const [name, box] of Object.entries(BOXES)) console.log(`${name}: [${box.join(', ')}]${TURNS[name] === undefined ? '' : `  turn ${TURNS[name]}`}`);
console.log('area in canvases:', (Object.values(BOXES).reduce((a, [, , w, h]) => a + w * h, 0) / (360 * 450)).toFixed(2), ' layers:', Object.keys(BOXES).length);
