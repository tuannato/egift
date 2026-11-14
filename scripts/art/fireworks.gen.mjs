// Generator for the "fireworks" wrapper art (New Year: a harbour at night, a sealed shell, then a sky of blooms).
// Technique: long-exposure light photography. Everything bright is a thin stroke that fades to black along
// its length, painted on screen-blended layers, with blurred copies under it for the glow. No flat shapes.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box).
// Run: node scripts/art/fireworks.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'fireworks');
if (!OUT.endsWith('wrappers/fireworks')) throw new Error('out dir must be public/wrappers/fireworks');
mkdirSync(OUT, { recursive: true });
for (const n of readdirSync(OUT)) if (n.endsWith('.svg')) unlinkSync(join(OUT, n));

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
const f = n => String(Math.round(n * 10) / 10);
const f2 = n => String(Math.round(n * 100) / 100);
const TAU = Math.PI * 2;

const BOX = {};
function svg(name, box, inner) {
    BOX[name] = box;
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    if (s.length > 60000) throw new Error(`${name}.svg is ${s.length} bytes`);
    writeFileSync(join(OUT, `${name}.svg`), s);
}
const blurDef = (id, sd, box) =>
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${f(box[0])}" y="${f(box[1])}" width="${f(box[2])}" height="${f(box[3])}"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const stops = list => list.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const radial = (id, list, extra = '') => `<radialGradient id="${id}"${extra}>${stops(list)}</radialGradient>`;
const linear = (id, [x1, y1, x2, y2], list, extra = '') => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra}>${stops(list)}</linearGradient>`;

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
/** A colour ramp: [[u, '#hex'], ...] -> colour at u. */
function ramp(list, u) {
    if (u <= list[0][0]) return rgb(list[0][1]);
    for (let i = 1; i < list.length; i++) {
        if (u <= list[i][0]) {
            const [u0, c0] = list[i - 1], [u1, c1] = list[i];
            const t = (u - u0) / (u1 - u0), a = rgb(c0), b = rgb(c1);
            return a.map((v, k) => v + (b[k] - v) * t);
        }
    }
    return rgb(list[list.length - 1][1]);
}

/** Many dots as a few paths: [x, y, r, alpha, colour] bucketed by colour, size and alpha (zero-length round-capped strokes). */
function dots(list) {
    const m = new Map();
    for (const [x, y, r, a, col] of list) {
        const w = Math.max(0.3, Math.round((r * 2) / 0.2) * 0.2), aq = Math.min(1, Math.max(0.1, Math.round(a * 6) / 6));
        const k = `${col}|${f2(w)}|${f2(aq)}`;
        m.set(k, (m.get(k) ?? '') + `M${f(x)} ${f(y)}h0.01`);
    }
    return [...m].map(([k, d]) => { const [c, w, a] = k.split('|'); return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity="${a}" stroke-linecap="round"/>`; }).join('');
}
/** Many small bars as a few paths: [x, y, w, h, alpha, colour] (horizontal strokes). */
function bars(list, cap = 'butt') {
    const m = new Map();
    for (const [x, y, w, h, a, col] of list) {
        const hq = Math.max(0.3, Math.round(h / 0.3) * 0.3), aq = Math.min(1, Math.max(0.08, Math.round(a * 8) / 8));
        const k = `${col}|${f2(hq)}|${f2(aq)}`;
        m.set(k, (m.get(k) ?? '') + `M${f(x)} ${f(y + h / 2)}h${f(w)}`);
    }
    return [...m].map(([k, d]) => { const [c, w, a] = k.split('|'); return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity="${a}" stroke-linecap="${cap}"/>`; }).join('');
}

/* Geometry (canvas units). Must match fireworks.ts. */
const HORIZON = 318;
const SHELL = [180, 236], SHELL_R = 38;
const MAIN = [180, 140];

/**
 * One shell burst, as a long exposure sees it: every star leaves a thin trail that leaves the centre
 * fast, slows, and droops under gravity. Stars are sampled on a sphere and projected, so the bloom has
 * the density of a real one (many short trails near the middle, long ones at the rim).
 * Trails are cut into bands along their length; each band is one path with one colour and one width,
 * dark bands first, so the bright parts always sit on top (the layer is screen-blended on the stage).
 */
function trails(o) {
    const rnd = rng(o.seed);
    const K = o.K ?? 10;
    const bands = Array.from({ length: K }, () => '');
    let centre = '';
    const tips = [];
    const glitter = [];
    const drag = s => (1 - Math.exp(-(o.drag ?? 2.4) * s)) / (1 - Math.exp(-(o.drag ?? 2.4)));
    for (let i = 0; i < o.n; i++) {
        const z = 1 - (2 * (i + 0.5)) / o.n;
        const rad = Math.sqrt(1 - z * z);
        const phi = i * 2.399963 + (rnd() - 0.5) * 0.5;
        if (rad < (o.minRad ?? 0.3)) { rnd(); rnd(); continue; }
        const len = o.R * rad * (0.9 + 0.2 * rnd());
        const g = o.G * (0.85 + 0.3 * rnd());
        const s0 = o.s0 ?? 0.06;
        const pt = s => [o.cx + Math.cos(phi) * len * drag(s), o.cy + Math.sin(phi) * len * drag(s) + g * s * s];
        let prev = pt(s0);
        let c = `M${f(prev[0])} ${f(prev[1])}`;
        for (let k = 1; k <= K; k++) {
            const p = pt(s0 + ((1 - s0) * k) / K);
            bands[k - 1] += `M${f(prev[0])} ${f(prev[1])}l${f(p[0] - prev[0])} ${f(p[1] - prev[1])}`;
            c += `l${f(p[0] - prev[0])} ${f(p[1] - prev[1])}`;
            prev = p;
        }
        centre += c;
        tips.push(prev);
        if (o.glitter) {
            for (let j = 0; j < o.glitter; j++) {
                const s = 0.45 + rnd() * 0.6;
                const p = pt(Math.min(1.08, s));
                glitter.push([p[0] + (rnd() - 0.5) * 3, p[1] + (rnd() - 0.2) * 5, 0.25 + rnd() * 0.45, 0.35 + rnd() * 0.65]);
            }
        }
    }
    return { bands, centre, tips, glitter, K };
}

/** Paint a set of trails: wide soft halo, tight halo, then the bands dark-to-bright, then tips. */
function paintTrails(t, o, ids) {
    const order = t.bands.map((d, k) => {
        const u = (k + 0.5) / t.K;
        const col = ramp(o.ramp, u);
        const lum = col[0] * 0.3 + col[1] * 0.6 + col[2] * 0.1;
        const w = o.w * (0.14 + 0.86 * Math.sin(Math.PI * Math.pow(u, 0.75)) + (o.wTip ?? 0) * u);
        return { d, col, lum, w };
    });
    order.sort((a, b) => a.lum - b.lum);
    let s = '';
    s += `<path d="${t.centre}" fill="none" stroke="${o.halo}" stroke-width="${f(o.w * 3.4)}" stroke-linecap="round" stroke-linejoin="round" opacity="${o.haloTight ?? 0.55}" filter="url(#${ids.tight})"/>`;
    for (const b of order) s += `<path d="${b.d}" fill="none" stroke="${hex(b.col)}" stroke-width="${f2(o.dash ? Math.max(b.w, o.w * 0.55) : b.w)}" stroke-linecap="round"${o.dash ? ` stroke-dasharray="0.01 ${o.dash}"` : ''} style="mix-blend-mode:screen"/>`;
    if (o.tip) {
        const glow = [], core = [];
        const rnd = rng(o.seed + 99);
        for (const [x, y] of t.tips) {
            const k = 0.6 + rnd() * 0.8;
            if (rnd() > (o.tipP ?? 0.33)) continue; // most trails just taper away
            glow.push([x, y, o.tipR * 2.6 * k, 1, o.tip]);
            core.push([x, y, o.tipR * k, 1, o.tipCore ?? '#FFFFFF']);
        }
        s += `<g opacity="0.55" filter="url(#${ids.tight})">${dots(glow)}</g>${dots(core)}`;
    }
    if (t.glitter.length) {
        s += dots(t.glitter.map(([x, y, r, a]) => [x, y, r, a, o.glitterCol ?? '#FFE9B8']));
    }
    return s;
}

/** A burst layer: box around the bloom, trails, and the hot knot at the centre. */
function burst(name, o, extra = []) {
    const reach = o.R * 1.18;
    const box = [Math.floor(o.cx - reach - 8), Math.floor(o.cy - reach - 8), Math.ceil(reach * 2 + 16), Math.ceil(reach * 2 + o.G * 1.2 + 16)];
    const ids = { tight: 'bt' };
    let defs = blurDef('bt', f2(Math.max(1.1, o.w * 2)), box);
    defs += radial('knot', [[0, o.knot ?? '#FFFFFF', 0.5], [0.3, o.halo, 0.22], [1, o.halo, 0]]);
    let s = `<circle cx="${o.cx}" cy="${o.cy}" r="${f(o.R * 0.42)}" fill="url(#knot)"/>`;
    s += paintTrails(trails(o), o, ids);
    for (const e of extra) s += paintTrails(trails(e), e, ids);
    svg(name, box, `<defs>${defs}</defs>${s}`);
}

const GOLD = [[0, '#000000'], [0.1, '#3A1602'], [0.3, '#B4520E'], [0.52, '#FFA63A'], [0.72, '#FFE3A0'], [0.86, '#FFF8E6'], [1, '#C78A2A']];
const SILVER = [[0, '#000000'], [0.12, '#081A44'], [0.35, '#2F6FD0'], [0.58, '#A9D4FF'], [0.8, '#FFFFFF'], [1, '#7FB6F0']];
const MAGENTA = [[0, '#000000'], [0.12, '#2E0420'], [0.35, '#A3125F'], [0.58, '#FF4FA3'], [0.8, '#FFE6F3'], [1, '#D8408F']];
const CYAN = [[0, '#000000'], [0.12, '#02202C'], [0.35, '#0B7FA6'], [0.6, '#46DBFF'], [0.82, '#F0FDFF'], [1, '#2BA9D0']];
const EMBER = [[0, '#000000'], [0.12, '#2A0A02'], [0.35, '#B43A12'], [0.6, '#FF8A3D'], [0.82, '#FFF0CC'], [1, '#D8702A']];
const PALE = [[0, '#000000'], [0.15, '#3A2A0A'], [0.4, '#C8A45A'], [0.62, '#FFF1C8'], [0.82, '#FFFFFF'], [1, '#E0C080']];

/* The six blooms. Centres must match fireworks.ts. */
const BURSTS = {
    a: { cx: MAIN[0], cy: MAIN[1], R: 124, G: 64, n: 134, K: 8, seed: 11, ramp: GOLD, halo: '#FF9A2E', w: 1.15, tip: '#FFB648', tipR: 0.75, glitter: 1, drag: 2.0, minRad: 0.34, haloWide: 0.2 },
    b: { cx: 100, cy: 114, R: 62, G: 20, n: 120, seed: 23, ramp: SILVER, halo: '#4F8FF0', w: 0.95, tip: '#9CC8FF', tipR: 0.8, minRad: 0.3 },
    // a peony: round, no droop, only the outer part of each trail burns
    c: { cx: 266, cy: 106, R: 56, G: 3, n: 170, K: 5, seed: 37, ramp: MAGENTA, halo: '#E0268A', w: 1.25, tip: '#FF7DC0', tipR: 0.9, tipP: 0.5, minRad: 0.3, s0: 0.42, drag: 3.2 },
    d: { cx: 64, cy: 224, R: 38, G: 12, n: 70, seed: 41, ramp: CYAN, halo: '#1FA8D8', w: 0.8, tip: '#7FE6FF', tipR: 0.7, minRad: 0.32 },
    e: { cx: 298, cy: 216, R: 42, G: 14, n: 80, seed: 53, ramp: EMBER, halo: '#E8601E', w: 0.85, tip: '#FFB070', tipR: 0.7, minRad: 0.32 },
    // crackle: the trails break into beads
    f: { cx: 206, cy: 62, R: 52, G: 18, n: 96, K: 8, seed: 67, ramp: PALE, halo: '#E8C070', w: 1.15, tip: '#FFE6A8', tipR: 0.8, tipP: 0, drag: 2.2, minRad: 0.3, dash: 2.6, haloTight: 0.3 },
};

/* Sky: near-black night blue, a little city haze at the horizon, a few faint stars. */
{
    const box = [-8, -8, 376, 466];
    const rnd = rng(5);
    const defs =
        linear('sky', [0, 0, 0, 1], [[0, '#03050C'], [0.2, '#070D26'], [0.42, '#0F1A4A'], [0.58, '#1D2466'], [0.67, '#3A2C70'], [0.72, '#5E3E72'], [0.745, '#1A1838'], [1, '#02040C']]) +
        radial('haze', [[0, '#FFB070', 0.42], [0.45, '#B0607A', 0.18], [1, '#3A2A5A', 0]]) +
        radial('deep', [[0, '#16245C', 0.5], [1, '#16245C', 0]]) + blurDef('cl', 5, box) + blurDef('mw', 22, box);
    let s = `<rect x="-8" y="-8" width="376" height="466" fill="url(#sky)"/>`;
    s += `<ellipse cx="180" cy="150" rx="260" ry="190" fill="url(#deep)"/>`;
    s += `<ellipse cx="180" cy="${HORIZON}" rx="280" ry="58" fill="url(#haze)"/>`;
    // thin high cloud, barely there, catching the town's light from below
    const wr = rng(6);
    let wisps = '';
    for (let i = 0; i < 22; i++) {
        const y = 90 + wr() * 200, x = wr() * 380 - 10;
        wisps += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(40 + wr() * 80)}" ry="${f(2 + wr() * 5)}" fill="${y > 240 ? '#8A6A8A' : '#4A5FA8'}" fill-opacity="${f2(0.08 + wr() * 0.12)}"/>`;
    }
    // old smoke hanging low over the town, lit warm from below
    for (let i = 0; i < 12; i++) {
        wisps += `<ellipse cx="${f(wr() * 380 - 10)}" cy="${f(262 + wr() * 44)}" rx="${f(30 + wr() * 60)}" ry="${f(5 + wr() * 9)}" fill="${wr() < 0.5 ? '#D88A6A' : '#8A6AB0'}" fill-opacity="${f2(0.08 + wr() * 0.1)}"/>`;
    }
    s += `<g filter="url(#cl)">${wisps}</g>`;
    const st = [];
    for (let i = 0; i < 150; i++) {
        const x = rnd() * 372 - 6, y = rnd() * 270 - 6, r = 0.18 + Math.pow(rnd(), 3) * 0.6;
        st.push([x, y, r, (0.15 + rnd() * 0.5) * (1 - y / 330), rnd() < 0.3 ? '#FFE9C8' : '#CFE0FF']);
    }
    // a faint river of stars across the upper sky, as a long exposure gathers it
    for (let i = 0; i < 260; i++) {
        const u = rnd(), v = (rnd() + rnd() + rnd() - 1.5) * 0.9;
        const x = -10 + u * 380 + v * 26, y = 150 - u * 120 + v * 62 + Math.sin(u * 5) * 10;
        st.push([x, y, 0.14 + Math.pow(rnd(), 4) * 0.5, 0.18 + rnd() * 0.45, rnd() < 0.25 ? '#FFE9C8' : '#CFE0FF']);
    }
    s += `<path d="M-10 150C80 110 240 96 370 30" fill="none" stroke="#3A4FA8" stroke-width="54" stroke-opacity="0.16" filter="url(#mw)"/>`;
    s += dots(st);
    svg('sky', box, `<defs>${defs}</defs>${s}`);
}

/* Glow: what the bursts do to the air — lit smoke and coloured bloom. Screen-blended, fades in with the show. */
{
    const box = [-8, -8, 376, 340];
    let defs = blurDef('sm', 9, box);
    let s = '';
    const blob = (id, cx, cy, rx, ry, col, a) => {
        defs += radial(id, [[0, col, a], [0.45, col, a * 0.38], [1, col, 0]]);
        s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`;
    };
    blob('gb', BURSTS.b.cx, BURSTS.b.cy, 105, 100, '#3F7FE8', 0.36);
    blob('gc', BURSTS.c.cx, BURSTS.c.cy, 100, 96, '#E0268A', 0.3);
    blob('gd', BURSTS.d.cx, BURSTS.d.cy, 64, 60, '#1FA8D8', 0.3);
    blob('ge', BURSTS.e.cx, BURSTS.e.cy, 70, 66, '#E8601E', 0.3);
    blob('gf', BURSTS.f.cx, BURSTS.f.cy, 80, 72, '#E8C070', 0.24);
    // drifting smoke, lit from inside
    const rnd = rng(77);
    let smoke = '';
    for (let i = 0; i < 25; i++) {
        const b = Object.values(BURSTS)[1 + (i % 5)];
        const x = b.cx + (rnd() - 0.4) * b.R * 1.5, y = b.cy + (rnd() - 0.5) * b.R * 1.1;
        smoke += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(10 + rnd() * 22)}" ry="${f(6 + rnd() * 12)}" fill="${b.halo}" fill-opacity="${f2(0.05 + rnd() * 0.08)}"/>`;
    }
    s += `<g filter="url(#sm)">${smoke}</g>`;
    svg('glow', box, `<defs>${defs}</defs>${s}`);
}

/* Glow of the main bloom alone, so the air turns gold first and takes the other colours later. */
{
    const box = [-8, -8, 376, 340];
    const defs = blurDef('sm', 9, box) + radial('ga', [[0, '#FF9A2E', 0.36], [0.45, '#FF9A2E', 0.14], [1, '#FF9A2E', 0]]);
    const rnd = rng(78);
    let smoke = '';
    for (let i = 0; i < 9; i++) {
        const x = MAIN[0] + (rnd() - 0.4) * 170, y = MAIN[1] + (rnd() - 0.4) * 130;
        smoke += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(14 + rnd() * 26)}" ry="${f(7 + rnd() * 12)}" fill="#FFB060" fill-opacity="${f2(0.05 + rnd() * 0.07)}"/>`;
    }
    svg('glow-a', box, `<defs>${defs}</defs><ellipse cx="${MAIN[0]}" cy="${MAIN[1] + 16}" rx="190" ry="170" fill="url(#ga)"/><g filter="url(#sm)">${smoke}</g>`);
}

/* The blooms. */
burst('burst-a', BURSTS.a, [
    // the pistil: a tighter, paler inner bloom
    { cx: MAIN[0], cy: MAIN[1], R: 52, G: 14, n: 52, K: 7, seed: 12, ramp: PALE, halo: '#FFE2A0', w: 0.8, tip: '#FFFFFF', tipR: 0.6, minRad: 0.36, haloWide: 0.1, haloTight: 0.35 },
]);
burst('burst-b', BURSTS.b);
burst('burst-c', BURSTS.c, [
    { cx: BURSTS.c.cx, cy: BURSTS.c.cy, R: 30, G: 1, n: 60, K: 4, seed: 38, ramp: PALE, halo: '#FFD0E8', w: 0.9, tip: '#FFFFFF', tipR: 0.6, tipP: 0.5, minRad: 0.35, s0: 0.5, drag: 3.2, haloTight: 0.3 },
]);
// the first instant of the main bloom: a round star, before gravity has had time to act
burst('burst-a0', { cx: MAIN[0], cy: MAIN[1], R: 50, G: 0, n: 110, K: 5, seed: 13, ramp: [[0, '#000000'], [0.15, '#6A3A08'], [0.45, '#FFC060'], [0.75, '#FFF8E6'], [1, '#FFE3A0']], halo: '#FFB648', w: 1.0, tip: '#FFE3A0', tipR: 0.7, tipP: 0.25, minRad: 0.25, drag: 3 });
burst('burst-d', BURSTS.d);
burst('burst-e', BURSTS.e);
burst('burst-f', BURSTS.f);

/* Far: another show, very small, low over the far shore — already there while the shell waits. One layer. */
{
    const box = [-8, 226, 376, 94];
    const ids = { tight: 'bt' };
    const defs = blurDef('bt', 0.8, box) + linear('tr', [0, 1, 0, 0], [[0, '#FF9A2E', 0], [0.5, '#FFB648', 0.5], [1, '#FFF0C8', 0.95]]);
    const far = [
        { cx: 104, cy: 264, R: 12, G: 3, n: 30, K: 4, seed: 81, ramp: MAGENTA, halo: '#E0268A', w: 0.5, tip: '#FF9FD0', tipR: 0.35, minRad: 0.35 },
        { cx: 254, cy: 270, R: 10, G: 3, n: 28, K: 4, seed: 82, ramp: SILVER, halo: '#4F8FF0', w: 0.45, tip: '#CFE6FF', tipR: 0.35, minRad: 0.35 },
        { cx: 150, cy: 280, R: 8, G: 2, n: 24, K: 4, seed: 85, ramp: GOLD, halo: '#FF9A2E', w: 0.45, tip: '#FFD890', tipR: 0.3, minRad: 0.35 },
        { cx: 218, cy: 262, R: 13, G: 4, n: 30, K: 4, seed: 86, ramp: GOLD, halo: '#FF9A2E', w: 0.5, tip: '#FFD890', tipR: 0.35, minRad: 0.35 },
        { cx: 62, cy: 258, R: 9, G: 2, n: 24, K: 4, seed: 87, ramp: CYAN, halo: '#1FA8D8', w: 0.45, tip: '#9FF0FF', tipR: 0.3, minRad: 0.35 },
        { cx: 304, cy: 256, R: 11, G: 3, n: 28, K: 4, seed: 88, ramp: EMBER, halo: '#E8601E', w: 0.45, tip: '#FFB070', tipR: 0.3, minRad: 0.35 },
    ];
    let s = '';
    // thin tracers climbing from the far shore
    for (const [x, y1, lean] of [[84, 276, 3], [132, 262, -2], [190, 284, 1.5], [238, 272, -3], [280, 280, 2]]) {
        s += `<path d="M${x} ${HORIZON - 2}Q${x + lean * 0.3} ${f((HORIZON + y1) / 2)} ${x + lean} ${y1}" fill="none" stroke="url(#tr)" stroke-width="0.5" stroke-linecap="round"/>`;
    }
    for (const o of far) s += paintTrails(trails(o), o, ids);
    svg('far', box, `<defs>${defs}</defs>${s}`);
}

/* Tips: the crackle that hangs in the air after the blooms — pin-points of light only, no shapes. */
{
    const box = [-8, -8, 376, 330];
    const rnd = rng(131);
    const defs = blurDef('tg', 1.6, box);
    const glow = [], core = [];
    for (const b of Object.values(BURSTS)) {
        const n = Math.round(b.R * 0.9);
        for (let i = 0; i < n; i++) {
            const a = rnd() * TAU, rr = b.R * (0.55 + rnd() * 0.62);
            const x = b.cx + Math.cos(a) * rr, y = b.cy + Math.sin(a) * rr + b.G * (0.5 + rnd() * 0.9);
            if (y > HORIZON - 14) continue;
            const r = 0.3 + rnd() * 0.55, al = 0.4 + rnd() * 0.6;
            const col = rnd() < 0.55 ? '#FFFFFF' : b.tip;
            core.push([x, y, r, al, col]);
            if (rnd() < 0.4) glow.push([x, y, r * 3.4, al * 0.6, b.tip]);
        }
    }
    svg('tips', box, `<defs>${defs}</defs><g filter="url(#tg)">${dots(glow)}</g>${dots(core)}`);
}

/* Trail: the shell's climb, bright at the head, dying to an ember below. Grows from its foot (origin 0.5, 1). */
{
    const x0 = SHELL[0], y0 = SHELL[1], y1 = MAIN[1];
    const box = [x0 - 14, y1, 28, y0 - y1];
    const defs = blurDef('tw', 3.2, [box[0] - 6, box[1] - 6, box[2] + 12, box[3] + 12]) + blurDef('tt', 0.9, [box[0] - 6, box[1] - 6, box[2] + 12, box[3] + 12]);
    const K = 26;
    const pt = u => [x0 + Math.sin(u * 7.5) * 1.5 * (1 - u) + Math.sin(u * 19) * 0.35, y0 + (y1 - y0) * u];
    const ramp1 = [[0, '#000000'], [0.2, '#2A0E02'], [0.5, '#A8500E'], [0.78, '#FFB648'], [0.93, '#FFF0C8'], [1, '#FFFFFF']];
    let centre = '', segs = [];
    let prev = pt(0.04);
    centre = `M${f(prev[0])} ${f(prev[1])}`;
    for (let k = 1; k <= K; k++) {
        const u = 0.04 + (0.96 * k) / K, p = pt(u);
        segs.push({ d: `M${f(prev[0])} ${f(prev[1])}L${f(p[0])} ${f(p[1])}`, u });
        centre += `L${f(p[0])} ${f(p[1])}`;
        prev = p;
    }
    let s = `<path d="${centre}" fill="none" stroke="#FF9A2E" stroke-width="6" stroke-linecap="round" opacity="0.2" filter="url(#tw)"/>`;
    s += `<path d="${centre}" fill="none" stroke="#FFB648" stroke-width="2.4" stroke-linecap="round" opacity="0.4" filter="url(#tt)"/>`;
    for (const g of segs) s += `<path d="${g.d}" fill="none" stroke="${hex(ramp(ramp1, g.u))}" stroke-width="${f2(0.45 + 1.1 * g.u * g.u)}" stroke-linecap="round"/>`;
    // sparks shed sideways on the way up
    const rnd = rng(17);
    for (let i = 0; i < 46; i++) {
        const u = 0.1 + rnd() * 0.85, p = pt(u), side = (rnd() - 0.5) * 2;
        s += `<circle cx="${f(p[0] + side * (1.5 + rnd() * 5) * (1.1 - u))}" cy="${f(p[1] + rnd() * 6)}" r="${f2(0.22 + rnd() * 0.3)}" fill="#FFD890" fill-opacity="${f2(0.25 + rnd() * 0.6 * u)}"/>`;
    }
    svg('trail', box, `<defs>${defs}</defs>${s}`);
}

/* Flash: the instant the shell breaks — a white core and a thin lens streak. */
{
    const R = 96;
    const box = [MAIN[0] - R, MAIN[1] - R, 2 * R, 2 * R];
    const defs =
        radial('fl', [[0, '#FFFFFF', 1], [0.1, '#FFF4D8', 0.8], [0.32, '#FFC060', 0.3], [1, '#FF9A2E', 0]]) +
        radial('st', [[0, '#FFFFFF', 0.9], [0.4, '#FFE2A0', 0.35], [1, '#FFE2A0', 0]]);
    let s = `<circle cx="${MAIN[0]}" cy="${MAIN[1]}" r="${R}" fill="url(#fl)"/>`;
    s += `<ellipse cx="${MAIN[0]}" cy="${MAIN[1]}" rx="${R}" ry="1.6" fill="url(#st)"/>`;
    s += `<ellipse cx="${MAIN[0]}" cy="${MAIN[1]}" rx="1.2" ry="${R * 0.55}" fill="url(#st)" opacity="0.6"/>`;
    svg('flash', box, `<defs>${defs}</defs>${s}`);
}

/* City: two rows of invented towers, only silhouettes, a few lit windows. `city-lit` is the same town awake. */
const TOWERS = [];
{
    const rnd = rng(301);
    // near row: tall at the sides, low in the middle so the shell and the main bloom have air
    let x = -10;
    while (x < 370) {
        const w = 13 + rnd() * 17;
        const mid = Math.abs(x + w / 2 - 180) / 180; // 0 centre .. 1 edge
        const h = 12 + Math.pow(mid, 1.5) * 86 * (0.5 + rnd() * 0.8) + rnd() * 9;
        const kind = rnd();
        TOWERS.push({ x, w, h, row: 1, kind, set: 0.2 + rnd() * 0.3, mast: rnd() < 0.3 && h > 34 });
        x += w + (rnd() < 0.25 ? 1 + rnd() * 3 : 0);
    }
    // far row: lower, paler, fills the gaps
    x = -12;
    while (x < 372) {
        const w = 9 + rnd() * 13;
        const mid = Math.abs(x + w / 2 - 180) / 180;
        const h = 16 + Math.pow(mid, 1.2) * 56 * (0.5 + rnd() * 0.8) + rnd() * 12;
        TOWERS.push({ x, w, h, row: 0, kind: rnd(), set: 0.25 + rnd() * 0.25, mast: rnd() < 0.2 && h > 30 });
        x += w + rnd() * 2;
    }
}
function towerPath(t) {
    const y0 = HORIZON + 1, top = HORIZON - t.h;
    const x0 = t.x, x1 = t.x + t.w;
    if (t.kind < 0.3 && t.h > 26) {
        // a setback crown
        const i = t.w * t.set * 0.5, ch = 5 + t.h * 0.12;
        return `M${f(x0)} ${y0}V${f(top + ch)}H${f(x0 + i)}V${f(top)}H${f(x1 - i)}V${f(top + ch)}H${f(x1)}V${y0}Z`;
    }
    if (t.kind < 0.45 && t.h > 30) {
        // a slanted roof
        return `M${f(x0)} ${y0}V${f(top + 6)}L${f(x1)} ${f(top)}V${y0}Z`;
    }
    if (t.kind < 0.58) {
        // a plant room on the roof
        const i = t.w * 0.3;
        return `M${f(x0)} ${y0}V${f(top + 2.5)}H${f(x0 + i)}V${f(top)}H${f(x1 - i * 0.6)}V${f(top + 2.5)}H${f(x1)}V${y0}Z`;
    }
    return `M${f(x0)} ${y0}V${f(top)}H${f(x1)}V${y0}Z`;
}
function windows(t, rnd, p, bright) {
    const s = [];
    const top = HORIZON - t.h + (t.kind < 0.3 && t.h > 26 ? 6 + t.h * 0.12 : t.kind < 0.45 && t.h > 30 ? 8 : 4.5);
    const pitchX = t.row ? 2.9 : 2.4, pitchY = t.row ? 3.5 : 3;
    const ww = t.row ? 1.0 : 0.8, wh = t.row ? 1.3 : 1.0;
    const floorOn = rnd() < 0.3; // some towers light whole floors
    const live = 0.25 + Math.pow(rnd(), 1.6) * 1.5; // some towers sleep, some are all awake
    p *= live;
    for (let y = top; y < HORIZON - 4; y += pitchY) {
        const rowLit = floorOn && rnd() < 0.1;
        for (let x = t.x + 1.6; x < t.x + t.w - 1.6 - ww; x += pitchX) {
            const r1 = rnd(), r2 = rnd(), r3 = rnd();
            if (!(r1 < p || rowLit)) continue;
            const col = r2 < 0.72 ? '#FFD58A' : r2 < 0.9 ? '#FFF1D0' : '#BFD9FF';
            s.push([x, y, ww, wh, bright * (0.35 + r3 * 0.65) * (t.row ? 1 : 0.6), col]);
        }
    }
    return s;
}
const CITY_BOX = [-8, 226, 376, 96];
{
    const rnd = rng(302);
    const defs =
        linear('near', [0, 0, 0, 1], [[0, '#02030A'], [0.7, '#04061A'], [1, '#0A0C26']], ` gradientUnits="userSpaceOnUse" x1="0" y1="240" x2="0" y2="${HORIZON}"`).replace(' x1="0" y1="0" x2="0" y2="1"', '') +
        linear('farr', [0, 0, 0, 1], [[0, '#141B42'], [1, '#2A2858']], ` gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2="${HORIZON}"`).replace(' x1="0" y1="0" x2="0" y2="1"', '') +
        blurDef('q', 1.4, CITY_BOX);
    let far = '', near = '', win = '', masts = '';
    const wl = [];
    for (const t of TOWERS) {
        if (t.row === 0) far += towerPath(t); else near += towerPath(t);
        if (t.mast) {
            const mx = t.x + t.w * 0.5, top = HORIZON - t.h;
            masts += `<line x1="${f(mx)}" y1="${f(top)}" x2="${f(mx)}" y2="${f(top - 6 - t.h * 0.1)}" stroke="${t.row ? '#03050D' : '#0A1026'}" stroke-width="0.6"/>`;
            if (t.row) win += `<circle cx="${f(mx)}" cy="${f(top - 6 - t.h * 0.1)}" r="0.55" fill="#FF4A3A" fill-opacity="0.85"/>`;
        }
    }
    for (const t of TOWERS) wl.push(...windows(t, rnd, t.row ? 0.17 : 0.12, 0.85));
    win += bars(wl);
    // the quay: a row of lamps along the waterline, slightly out of focus
    let quay = '';
    for (let x = -4; x < 366; x += 3.6 + rnd() * 3.6) {
        quay += `<circle cx="${f(x)}" cy="${HORIZON - 0.6}" r="${f2(0.5 + rnd() * 0.5)}" fill="${rnd() < 0.8 ? '#FFC878' : '#DCE8FF'}" fill-opacity="${f2(0.5 + rnd() * 0.5)}"/>`;
    }
    const s = `<path d="${far}" fill="url(#farr)"/>${masts}<path d="${near}" fill="url(#near)"/><rect x="-8" y="${HORIZON}" width="376" height="4" fill="#04060F"/>${win}<g filter="url(#q)" opacity="0.7">${quay}</g>${quay}`;
    svg('city', CITY_BOX, `<defs>${defs}</defs>${s}`);
}
{
    const rnd = rng(303);
    const defs = blurDef('rim', 1.1, CITY_BOX) + blurDef('wg', 1.8, CITY_BOX) + radial('spill', [[0, '#FFB45E', 0.34], [0.5, '#FF8A5E', 0.12], [1, '#FF8A5E', 0]]);
    let rim = '', win = '';
    for (const t of TOWERS) {
        if (t.row === 0) continue;
        const top = HORIZON - t.h, cx = t.x + t.w / 2;
        // the roof and the wall that faces the show catch its colour
        const col = cx < 110 ? '#8FC0FF' : cx > 250 ? '#FF8FC8' : '#FFC878';
        const a = 0.35 + rnd() * 0.4;
        rim += `<path d="M${f(t.x + 0.3)} ${f(top + 0.3)}H${f(t.x + t.w - 0.3)}" stroke="${col}" stroke-opacity="${f2(a)}" stroke-width="0.7" fill="none"/>`;
        const wx = cx < 180 ? t.x + t.w - 0.3 : t.x + 0.3;
        rim += `<path d="M${f(wx)} ${f(top + 0.5)}V${f(top + t.h * 0.55)}" stroke="${col}" stroke-opacity="${f2(a * 0.45)}" stroke-width="0.6" fill="none"/>`;
    }
    const wl = [];
    for (const t of TOWERS) wl.push(...windows(t, rnd, t.row ? 0.24 : 0.16, 0.95));
    win = bars(wl);
    const s = `<ellipse cx="180" cy="${HORIZON}" rx="210" ry="30" fill="url(#spill)"/><g filter="url(#rim)">${rim}</g>${rim}<g filter="url(#wg)" opacity="0.55">${win}</g>${win}`;
    svg('city-lit', CITY_BOX, `<defs>${defs}</defs>${s}`);
}

/* Water: dark, with the quay lamps drawn out into faint broken streaks. */
const WATER_BOX = [-8, HORIZON, 376, 140];
/** A reflection column: short horizontal dashes that widen and thin out toward the viewer. */
function streak(rnd, cx, col, spread, strength, depth = 132, hot = '#FFFFFF') {
    const s = [];
    for (let y = HORIZON + 2; y < HORIZON + depth; ) {
        const t = (y - HORIZON) / 132;
        const half = spread * (0.35 + 1.5 * t);
        const n = 1 + (rnd() < 0.5 ? 1 : 0) + (spread > 16 && rnd() < 0.6 ? 1 : 0);
        for (let i = 0; i < n; i++) {
            const off = (rnd() + rnd() - 1) * half + (rnd() - 0.5) * 1.6;
            const len = (2 + rnd() * 7) * (0.6 + 1.6 * t) * (spread > 16 ? 1.5 : 1);
            const h = 0.45 + t * 1.1 + rnd() * 0.3;
            const near = 1 - Math.abs(off) / (half + 0.01);
            const a = strength * Math.pow(1 - t * 0.85, 1.2) * (0.3 + 0.7 * rnd()) * (0.4 + 0.6 * near);
            s.push([cx + off - len / 2, y, len, h, a, near > 0.75 && rnd() < 0.3 ? hot : col]);
        }
        y += (1.2 + t * 3.2) * (0.5 + rnd() * 1.6) + (rnd() < 0.18 ? 3 + rnd() * 5 : 0);
    }
    return s;
}
{
    const rnd = rng(401);
    const defs =
        linear('wat', [0, 0, 0, 1], [[0, '#1C1C48'], [0.1, '#0C1232'], [0.55, '#050818'], [1, '#010208']]) +
        blurDef('wb', 1.2, WATER_BOX) + blurDef('cb', 3, WATER_BOX) +
        linear('cr', [0, 0, 0, 1], [[0, '#02040A', 0.85], [1, '#02040A', 0]]);
    let s = `<rect x="-8" y="${HORIZON}" width="376" height="140" fill="url(#wat)"/>`;
    // the town's own dark reflection
    let dark = '';
    for (const t of TOWERS) if (t.row) dark += `<rect x="${f(t.x)}" y="${HORIZON}" width="${f(t.w)}" height="${f(t.h * 0.8)}"/>`;
    s += `<g fill="#02040A" opacity="0.6" filter="url(#cb)">${dark}</g>`;
    // ripples
    for (let i = 0; i < 70; i++) {
        const y = HORIZON + 3 + Math.pow(rnd(), 0.8) * 130, t = (y - HORIZON) / 132;
        const len = (8 + rnd() * 30) * (0.5 + t * 1.5), x = rnd() * 380 - 10;
        s += `<rect x="${f(x)}" y="${f(y)}" width="${f(len)}" height="${f2(0.35 + t * 0.6)}" fill="#6F8FD8" fill-opacity="${f2(0.03 + rnd() * 0.06)}"/>`;
    }
    let lamps = [];
    for (let x = 2; x < 360; x += 6 + rnd() * 9) lamps.push(...streak(rnd, x, rnd() < 0.75 ? '#FFC878' : rnd() < 0.5 ? '#CFE0FF' : '#FF9FC0', 1.6 + rnd() * 2.6, 0.24 + rnd() * 0.34, 30 + rnd() * 80, '#FFE8C0'));
    // the sealed shell's seam, mirrored faintly
    lamps.push(...streak(rnd, SHELL[0], '#FFC060', 5, 0.34, 96, '#FFF0D0'));
    lamps = bars(lamps, 'round');
    s += `<g filter="url(#wb)">${lamps}</g><g opacity="0.7">${lamps}</g>`;
    svg('water', WATER_BOX, `<defs>${defs}</defs>${s}`);
}

/* Reflections of the show: two layers so they can shimmer against each other. */
{
    const rnd = rng(402);
    const defs = blurDef('rb', 2.2, WATER_BOX) + radial('pool', [[0, '#FFA63A', 0.3], [0.5, '#FF8A3D', 0.1], [1, '#FF8A3D', 0]]);
    let d = [...streak(rnd, MAIN[0], '#FFB648', 34, 0.95, 132, '#FFF4D8')];
    d.push(...streak(rnd, MAIN[0] - 30, '#FF9A2E', 16, 0.55, 110, '#FFE3A0'));
    d.push(...streak(rnd, MAIN[0] + 34, '#FF9A2E', 16, 0.55, 110, '#FFE3A0'));
    d.push(...streak(rnd, BURSTS.e.cx, '#FF8A3D', 13, 0.7, 100, '#FFF0CC'));
    d.push(...streak(rnd, BURSTS.f.cx + 20, '#FFE2A0', 8, 0.4, 80, '#FFFFFF'));
    d = bars(d, 'round');
    const s = `<ellipse cx="180" cy="${HORIZON + 6}" rx="150" ry="64" fill="url(#pool)"/><g filter="url(#rb)" opacity="0.75">${d}</g>${d}`;
    svg('refl-a', WATER_BOX, `<defs>${defs}</defs>${s}`);
}
{
    const rnd = rng(403);
    const defs = blurDef('rb', 2.2, WATER_BOX);
    let d = [...streak(rnd, BURSTS.b.cx, '#6FA8FF', 20, 0.85, 125, '#FFFFFF')];
    d.push(...streak(rnd, BURSTS.c.cx, '#FF4FA3', 19, 0.85, 125, '#FFE6F3'));
    d.push(...streak(rnd, BURSTS.d.cx - 6, '#46DBFF', 10, 0.7, 90, '#F0FDFF'));
    d.push(...streak(rnd, 104, '#FF4FA3', 6, 0.5, 60, '#FFE6F3'));
    d.push(...streak(rnd, 250, '#A9D4FF', 6, 0.5, 60, '#FFFFFF'));
    d = bars(d, 'round');
    const s = `<g filter="url(#rb)" opacity="0.75">${d}</g>${d}`;
    svg('refl-b', WATER_BOX, `<defs>${defs}</defs>${s}`);
}

/* The shell, unlit: not a solid thing but a drawing in light — a fuse wound into a tight coil inside one
   closed ring, its loose end hanging below with a single live spark. Screen-blended. */
const SHELL_BOX = [SHELL[0] - 46, SHELL[1] - 46, 92, 108];
const SPARK = [SHELL[0] + 21, SHELL[1] + 52];
{
    const [cx, cy] = SHELL, R = SHELL_R - 4;
    const rnd = rng(611);
    const defs = blurDef('c1', 1.2, SHELL_BOX) + blurDef('c2', 3.2, SHELL_BOX);
    // the coil: one spiral, its brightness coming and going as a hand-held light would
    const TURNS = 6.5, STEP = 0.11;
    const at = th => {
        const r = 2.2 + (R - 4.5) * (th / (TURNS * TAU)) + Math.sin(th * 2.3) * 0.5 + Math.sin(th * 0.71 + 2) * 0.7;
        return [cx + Math.cos(th) * r, cy + Math.sin(th) * r * 0.985];
    };
    let whole = '', bandsS = '';
    let prev = at(0), th = 0;
    whole = `M${f2(prev[0])} ${f2(prev[1])}`;
    const coilRamp = [[0, '#3A1A04'], [0.35, '#9A4E10'], [0.65, '#FFB648'], [0.88, '#FFE9B8'], [1, '#FFFFFF']];
    while (th < TURNS * TAU) {
        let d = `M${f2(prev[0])} ${f2(prev[1])}`;
        const th0 = th;
        for (let j = 0; j < 5 && th < TURNS * TAU; j++) {
            th += STEP * (1 + 6 / (2 + th)); // even steps along the arc, not the angle
            const p = at(th);
            d += `L${f2(p[0])} ${f2(p[1])}`;
            whole += `L${f2(p[0])} ${f2(p[1])}`;
            prev = p;
        }
        const u = th0 / (TURNS * TAU);
        const m = Math.min(1, Math.max(0, 0.3 + 0.42 * Math.sin(th0 * 0.83 + 1.1) + 0.3 * Math.sin(th0 * 2.9) + 0.3 * (1 - u)));
        if (m < 0.16 && u > 0.12) continue; // the light was off the lens for a moment
        bandsS += `<path d="${d}" fill="none" stroke="${hex(ramp(coilRamp, m))}" stroke-width="${f2(0.35 + 0.55 * m)}" stroke-linecap="round" style="mix-blend-mode:screen"/>`;
    }
    // the ring that seals it: drawn in one pass, the stroke overlapping itself where the hand closed the loop
    const ring = (r, a0, a1) => {
        let d = '';
        for (let i = 0; i <= 40; i++) {
            const a = a0 + ((a1 - a0) * i) / 40, rr = r + Math.sin(a * 3 + 0.7) * 0.3;
            d += `${i ? 'L' : 'M'}${f2(cx + Math.cos(a) * rr)} ${f2(cy + Math.sin(a) * rr)}`;
        }
        return d;
    };
    const ringD = ring(R, -1.2, -1.2 + TAU + 0.5);
    // the loose end: leaves the ring low on the right and hangs to the spark
    const a0 = 1.15, ex = cx + Math.cos(a0) * R, ey = cy + Math.sin(a0) * R;
    const tail = `M${f2(ex)} ${f2(ey)}C${f2(ex + 5)} ${f2(ey + 9)} ${f2(SPARK[0] - 9)} ${f2(SPARK[1] - 13)} ${SPARK[0]} ${SPARK[1]}`;
    let s = '';
    s += `<path d="${whole}" fill="none" stroke="#FF9A2E" stroke-width="2.2" opacity="0.4" filter="url(#c1)"/>`;
    s += `<path d="${ringD}${tail}" fill="none" stroke="#FF9A2E" stroke-width="3.4" opacity="0.5" filter="url(#c2)"/>`;
    s += `<path d="${ringD}" fill="none" stroke="#FFC878" stroke-width="1.6" opacity="0.6" filter="url(#c1)"/>`;
    s += bandsS;
    s += `<path d="${ringD}" fill="none" stroke="#FFE3A0" stroke-width="0.85" stroke-linecap="round"/>`;
    s += `<path d="${ring(R, -1.2, -0.2)}" fill="none" stroke="#FFFFFF" stroke-width="0.6" stroke-linecap="round" stroke-opacity="0.9"/>`;
    s += `<path d="${tail}" fill="none" stroke="#C8782A" stroke-width="0.7" stroke-linecap="round"/>`;
    // the spark: a hot point and the few short scratches it throws
    const sp = [];
    for (let i = 0; i < 9; i++) {
        const a = rnd() * TAU, l0 = 1.2 + rnd() * 1.5, l1 = l0 + 1.5 + rnd() * 3.5;
        s += `<path d="M${f2(SPARK[0] + Math.cos(a) * l0)} ${f2(SPARK[1] + Math.sin(a) * l0)}L${f2(SPARK[0] + Math.cos(a) * l1)} ${f2(SPARK[1] + Math.sin(a) * l1 + 0.8)}" fill="none" stroke="#FFD890" stroke-width="0.35" stroke-opacity="${f2(0.4 + rnd() * 0.5)}" stroke-linecap="round"/>`;
        sp.push([SPARK[0] + Math.cos(a) * (l1 + 0.6), SPARK[1] + Math.sin(a) * (l1 + 0.6) + 1, 0.22, 0.8, '#FFF0C8']);
    }
    s += dots(sp);
    s += `<circle cx="${SPARK[0]}" cy="${SPARK[1]}" r="1.1" fill="#FFFFFF"/>`;
    svg('shell', SHELL_BOX, `<defs>${defs}</defs>${s}`);
}
/* Seam: the glow the coil and its spark throw into the air. Screen-blended; breathes while the shell waits. */
const SEAM_BOX = [SHELL[0] - 70, SHELL[1] - 70, 140, 140];
{
    const [cx, cy] = SHELL;
    const defs =
        radial('aura', [[0, '#FFC060', 0.34], [0.3, '#FF9A2E', 0.2], [0.55, '#FF9A2E', 0.07], [1, '#FF9A2E', 0]]) +
        radial('hot', [[0, '#FFFFFF', 0.95], [0.25, '#FFE3A0', 0.6], [0.6, '#FF9A2E', 0.2], [1, '#FF9A2E', 0]]);
    const s = `<circle cx="${cx}" cy="${cy}" r="70" fill="url(#aura)"/><circle cx="${SPARK[0]}" cy="${SPARK[1]}" r="9" fill="url(#hot)"/>`;
    svg('seam', SEAM_BOX, `<defs>${defs}</defs>${s}`);
}

/* Ember: one falling spark (the stage scatters copies of it). */
svg('ember', [0, 0, 8, 8], `<defs>${radial('e', [[0, '#FFFFFF', 1], [0.22, '#FFE3A0', 0.95], [0.5, '#FFA63A', 0.4], [1, '#FF9A2E', 0]])}</defs><circle cx="4" cy="4" r="4" fill="url(#e)"/>`);

/* Bokeh: lights out of focus between the lens and the harbour. */
{
    const box = [-12, 150, 384, 312];
    const rnd = rng(501);
    let defs = blurDef('bk', 0.7, box);
    const cols = ['#FFC060', '#FFD890', '#6FA8FF', '#FF6FB0', '#FFE9C8'];
    cols.forEach((c, i) => { defs += radial(`k${i}`, [[0, c, 0.55], [0.72, c, 0.6], [0.9, c, 0.95], [1, c, 0]]); });
    let s = '';
    for (let i = 0; i < 30; i++) {
        const side = rnd() < 0.5 ? -1 : 1;
        const x = 180 + side * (60 + rnd() * 130), y = 300 + Math.pow(rnd(), 0.7) * 150;
        const r = 3 + rnd() * 10 * ((y - 280) / 170);
        const k = rnd() < 0.5 ? 0 : Math.floor(rnd() * cols.length);
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#k${k})" opacity="${f2(0.14 + rnd() * 0.22)}"/>`;
    }
    svg('bokeh', box, `<defs>${defs}</defs><g filter="url(#bk)">${s}</g>`);
}

/* Vignette: the lens darkens the corners and the near water. */
{
    const box = [-8, -8, 376, 466];
    const defs =
        radial('v', [[0.55, '#010208', 0], [0.85, '#010208', 0.42], [1, '#010208', 0.75]], ' cx="0.5" cy="0.44" r="0.78"') +
        linear('b', [0, 0, 0, 1], [[0, '#010208', 0], [1, '#010208', 0.6]]) +
        linear('sd', [0, 0, 1, 0], [[0, '#03050C', 1], [0.03, '#03050C', 0.85], [0.12, '#03050C', 0], [0.88, '#03050C', 0], [0.97, '#03050C', 0.85], [1, '#03050C', 1]]);
    svg('vignette', box, `<defs>${defs}</defs><rect x="-8" y="-8" width="376" height="466" fill="url(#v)"/><rect x="-8" y="380" width="376" height="78" fill="url(#b)"/><rect x="-8" y="-8" width="376" height="466" fill="url(#sd)"/>`);
}

for (const [n, b] of Object.entries(BOX)) console.log(n.padEnd(10), JSON.stringify(b));
