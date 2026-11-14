// Generator for the `signal` wrapper art. Writes public/wrappers/signal/*.svg.
// Everything is authored in canvas units: each SVG's viewBox equals its layer box.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'signal');
mkdirSync(OUT, { recursive: true });

const C = [180, 196];
const f = n => +(+n).toFixed(2);
const P = (r, a, c = C) => [f(c[0] + r * Math.sin((a * Math.PI) / 180)), f(c[1] - r * Math.cos((a * Math.PI) / 180))];
const pts = arr => arr.map(p => `${f(p[0])},${f(p[1])}`).join(' ');

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

const svg = (box, body, defs = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" width="${box[2]}" height="${box[3]}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;

// --- primitives -----------------------------------------------------------------------------
const arcD = (r, a0, a1) => {
    const [x0, y0] = P(r, a0);
    const [x1, y1] = P(r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return `M${x0} ${y0}A${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
};
const bandD = (r1, r2, a0, a1) => {
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    const [ax, ay] = P(r2, a0);
    const [bx, by] = P(r2, a1);
    const [cx, cy] = P(r1, a1);
    const [dx, dy] = P(r1, a0);
    return `M${ax} ${ay}A${r2} ${r2} 0 ${large} 1 ${bx} ${by}L${cx} ${cy}A${r1} ${r1} 0 ${large} 0 ${dx} ${dy}Z`;
};
const lineD = (a, b) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;

/** A luminous stroke: wide faint halo strokes under a crisp core (and an optional white-hot centre). */
function glow(d, color, w, k = 1, hot = false, extra = '') {
    let s = '';
    s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 7)}" stroke-opacity="${f(0.05 * k)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
    s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 3.6)}" stroke-opacity="${f(0.11 * k)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
    s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 1.9)}" stroke-opacity="${f(0.28 * k)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
    s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
    if (hot) s += `<path d="${d}" fill="none" stroke="#F2FBFF" stroke-width="${f(w * 0.45)}" stroke-opacity="0.9" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
    return s;
}
const stroke = (d, color, w, op = 1, extra = '') =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w)}"${op !== 1 ? ` stroke-opacity="${f(op)}"` : ''} stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const dot = (p, r, color, op = 1) => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(r)}" fill="${color}"${op !== 1 ? ` opacity="${f(op)}"` : ''}/>`;
/** A soft round light made of a radial gradient (no blur filter). */
const softDot = (id, p, r, color, op) =>
    `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(r)}" fill="url(#${id})" opacity="${f(op)}"/>`;
const radial = (id, stops, extra = '') =>
    `<radialGradient id="${id}"${extra}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
const linear = (id, x1, y1, x2, y2, stops, extra = '') =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;

const files = {};
const W = 360;
const H = 450;
const HORIZON = 378;

// --- space: void, deep navy well, nebula, stars ---------------------------------------------
{
    const box = [0, 0, W, H];
    const rnd = rng(7);
    let stars = '';
    for (let i = 0; i < 90; i++) {
        const x = rnd() * W;
        const y = rnd() * (HORIZON - 6);
        const d = Math.hypot(x - C[0], y - C[1]);
        const r = 0.45 + rnd() ** 3 * 1.1;
        const op = 0.25 + rnd() * 0.6;
        if (d < 160 && rnd() < 0.7) continue;
        const col = rnd() < 0.2 ? '#B9A6FF' : rnd() < 0.5 ? '#9FD8FF' : '#F2FBFF';
        stars += dot([x, y], r, col, op);
    }
    // A few brighter star nodes with a tiny cross glint.
    for (const [x, y, s] of [
        [52, 64, 1],
        [318, 128, 0.8],
        [34, 262, 0.7],
        [300, 30, 0.6],
        [118, 22, 0.55],
    ]) {
        stars += softDot('sg', [x, y], 7 * s, '', 0.8);
        stars += stroke(`M${x - 6 * s} ${y}L${x + 6 * s} ${y}`, '#CFEFFF', 0.5, 0.7);
        stars += stroke(`M${x} ${y - 6 * s}L${x} ${y + 6 * s}`, '#CFEFFF', 0.5, 0.7);
        stars += dot([x, y], 1.1 * s + 0.2, '#F2FBFF');
    }
    const defs =
        radial('well', [
            [0, '#14284A', 1],
            [0.45, '#0C1830', 0.9],
            [1, '#0C1830', 0],
        ]) +
        radial('neb1', [
            [0, '#8B5CFF', 0.22],
            [0.5, '#8B5CFF', 0.07],
            [1, '#8B5CFF', 0],
        ]) +
        radial('neb2', [
            [0, '#0074C2', 0.25],
            [0.55, '#0074C2', 0.07],
            [1, '#0074C2', 0],
        ]) +
        radial('sg', [
            [0, '#9FE6FF', 0.6],
            [0.4, '#2D7BFF', 0.15],
            [1, '#2D7BFF', 0],
        ]) +
        radial('vig', [
            [0.55, '#060A12', 0],
            [1, '#060A12', 0.85],
        ]);
    files['space.svg'] = svg(
        box,
        `<rect x="0" y="0" width="${W}" height="${H}" fill="#060A12"/>` +
            `<ellipse cx="300" cy="70" rx="190" ry="130" fill="url(#neb1)"/>` +
            `<ellipse cx="40" cy="330" rx="200" ry="150" fill="url(#neb2)"/>` +
            `<circle cx="${C[0]}" cy="${C[1]}" r="230" fill="url(#well)"/>` +
            stars +
            `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#vig)"/>`,
        defs,
    );
}

// --- grid: horizon floor as flat receding bands ---------------------------------------------
{
    const box = [-12, HORIZON - 14, W + 24, H - HORIZON + 26];
    const vp = [C[0], HORIZON];
    let g = '';
    // horizontal bands, closer together near the horizon
    for (let k = 1; k <= 9; k++) {
        const y = HORIZON + 1.6 * k * k;
        if (y > H + 12) break;
        g += stroke(`M0 ${f(y)}L${W} ${f(y)}`, 'url(#fadeH)', 0.6 + k * 0.1, 0.18 + k * 0.05);
    }
    // converging lines
    for (let i = -12; i <= 12; i++) {
        const xb = C[0] + i * 46;
        g += stroke(lineD(vp, [C[0] + (xb - C[0]) * (H + 12 - HORIZON) / (H - HORIZON), H + 12]), 'url(#fadeV)', 0.8, 0.7);
    }
    const defs =
        linear('fadeV', 0, HORIZON, 0, H, [
            [0, '#2D7BFF', 0],
            [0.35, '#2D7BFF', 0.35],
            [1, '#0074C2', 0.55],
        ], ' gradientUnits="userSpaceOnUse"') +
        linear('fadeH', 0, 0, W, 0, [
            [0, '#2D7BFF', 0],
            [0.5, '#2D7BFF', 0.8],
            [1, '#2D7BFF', 0],
        ], ' gradientUnits="userSpaceOnUse"') +
        linear('hglow', 0, HORIZON - 14, 0, HORIZON + 30, [
            [0, '#2D7BFF', 0],
            [0.32, '#2D7BFF', 0.12],
            [0.42, '#2D7BFF', 0.2],
            [1, '#0C1830', 0],
        ], ' gradientUnits="userSpaceOnUse"') +
        linear('hline', 0, 0, W, 0, [
            [0, '#32F0FF', 0],
            [0.5, '#9FEFFF', 0.75],
            [1, '#32F0FF', 0],
        ], ' gradientUnits="userSpaceOnUse"') +
        linear('floor', 0, HORIZON, 0, H, [
            [0, '#0C1830', 0.9],
            [1, '#060A12', 1],
        ], ' gradientUnits="userSpaceOnUse"');
    files['grid.svg'] = svg(
        box,
        `<rect x="-12" y="${HORIZON}" width="${W + 24}" height="${H - HORIZON + 12}" fill="url(#floor)"/>` +
            `<rect x="-12" y="${HORIZON - 14}" width="${W + 24}" height="44" fill="url(#hglow)"/>` +
            g +
            `<rect x="0" y="${HORIZON - 0.6}" width="${W}" height="1.2" fill="url(#hline)"/>`,
        defs,
    );
}

// --- network: routes from the edges converging on the outer gate ----------------------------
const PORT_R = 166;
const routes = [];
{
    const dirs = a => {
        const s = Math.round(a / 45) * 45;
        return [Math.sin((s * Math.PI) / 180), -Math.cos((s * Math.PI) / 180)];
    };
    const clipToFrame = (p, d) => {
        // walk from p along d until leaving the frame (or hitting the horizon going down)
        let t = 400;
        const bounds = [
            d[0] > 0 ? (W + 14 - p[0]) / d[0] : d[0] < 0 ? (-14 - p[0]) / d[0] : Infinity,
            d[1] > 0 ? (HORIZON - p[1]) / d[1] : d[1] < 0 ? (-14 - p[1]) / d[1] : Infinity,
        ];
        t = Math.min(t, ...bounds);
        return [p[0] + d[0] * t, p[1] + d[1] * t];
    };
    const spec = [
        // angle at the port, first radial length, bend, second length
        [28, 22, -1, 26],
        [58, 16, 1, 30],
        [76, 30, -1, 18],
        [104, 18, 1, 24],
        [128, 26, -1, 22],
        [152, 12, 1, 14],
        [208, 12, -1, 14],
        [232, 24, 1, 22],
        [256, 16, -1, 28],
        [284, 30, 1, 18],
        [304, 18, -1, 30],
        [332, 22, 1, 24],
        [14, 34, 1, 40],
        [346, 34, -1, 40],
    ];
    for (const [a, l1, bend, l2] of spec) {
        const p0 = P(PORT_R - 8, a);
        const p1 = P(PORT_R + l1, a);
        const d2 = dirs(a + bend * 45);
        const p2 = [p1[0] + d2[0] * l2, p1[1] + d2[1] * l2];
        const d3 = dirs(a + bend * 12);
        const p3 = clipToFrame(p2, d3);
        routes.push({ a, p0, p1, p2, p3 });
    }
}
const routeD = r => `M${f(r.p0[0])} ${f(r.p0[1])}L${f(r.p1[0])} ${f(r.p1[1])}L${f(r.p2[0])} ${f(r.p2[1])}L${f(r.p3[0])} ${f(r.p3[1])}`;
/**
 * No line is cut dead by the stage's edge: the network layers wear a mask that takes the last stretch
 * of anything reaching the top or the sides to transparent. It is fully clear EDGE_CLEAR units inside
 * the canvas (so parallax and the open-state zoom never show a cut end) and solid EDGE_FADE further in
 * (about 15% of a line's length).
 */
const NET_BOX = [-12, -12, W + 24, H + 24];
const EDGE_CLEAR = 10;
const EDGE_FADE = 26;
const edgeMask = (() => {
    const far = 12 + EDGE_CLEAR + EDGE_FADE;
    const k = f((12 + EDGE_CLEAR) / far);
    const stops = [[0, '#000', 1], [k, '#000', 1], [1, '#000', 0]];
    const u = ' gradientUnits="userSpaceOnUse"';
    const defs =
        linear('emT', 0, -12, 0, far - 12, stops, u) + linear('emL', -12, 0, far - 12, 0, stops, u) + linear('emR', W + 12, 0, W + 12 - far, 0, stops, u) +
        `<mask id="em" maskUnits="userSpaceOnUse" x="${NET_BOX[0]}" y="${NET_BOX[1]}" width="${NET_BOX[2]}" height="${NET_BOX[3]}">` +
        `<rect x="-12" y="-12" width="${W + 24}" height="${H + 24}" fill="#fff"/>` +
        `<rect x="-12" y="-12" width="${W + 24}" height="${far}" fill="url(#emT)"/>` +
        `<rect x="-12" y="-12" width="${far}" height="${H + 24}" fill="url(#emL)"/>` +
        `<rect x="${W + 12 - far}" y="-12" width="${far}" height="${H + 24}" fill="url(#emR)"/>` +
        `</mask>`;
    return { defs, wrap: body => `<g mask="url(#em)">${body}</g>` };
})();
// mesh between neighbour bend nodes
const mesh = [];
{
    const sorted = [...routes].sort((a, b) => a.a - b.a);
    for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i];
        const b = sorted[(i + 1) % sorted.length];
        const d = Math.hypot(a.p2[0] - b.p2[0], a.p2[1] - b.p2[1]);
        if (d < 120 && a.p2[1] < C[1] + 90 && b.p2[1] < C[1] + 90) mesh.push([a.p2, b.p2]);
    }
}
{
    const box = [-12, -12, W + 24, H + 24];
    let s = '';
    for (const [a, b] of mesh) s += stroke(lineD(a, b), '#1E4F8F', 0.7, 0.55);
    for (const r of routes) s += stroke(routeD(r), '#1D4C8A', 1, 0.8);
    for (const r of routes) {
        s += `<rect x="${f(r.p2[0] - 1.6)}" y="${f(r.p2[1] - 1.6)}" width="3.2" height="3.2" fill="#0C1830" stroke="#2D7BFF" stroke-width="0.8" stroke-opacity="0.8"/>`;
        s += dot(r.p1, 1.4, '#2D7BFF', 0.7);
    }
    files['net.svg'] = svg(box, edgeMask.wrap(s), edgeMask.defs);
}
// lit layers: outer (edge -> bend node), mid (bend -> elbow), inner (elbow -> port)
function litLayer(which) {
    const box = [-12, -12, W + 24, H + 24];
    let s = '';
    const defs = edgeMask.defs + radial('nd', [
        [0, '#BFF8FF', 0.9],
        [0.3, '#32F0FF', 0.35],
        [1, '#2D7BFF', 0],
    ]);
    for (const r of routes) {
        if (which === 'a') {
            s += glow(lineD(r.p2, r.p3), '#2D7BFF', 1, 1);
            // a data packet riding the line
            const t = 0.35 + ((r.a * 7) % 40) / 100;
            const q0 = [r.p2[0] + (r.p3[0] - r.p2[0]) * t, r.p2[1] + (r.p3[1] - r.p2[1]) * t];
            const q1 = [r.p2[0] + (r.p3[0] - r.p2[0]) * (t + 0.09), r.p2[1] + (r.p3[1] - r.p2[1]) * (t + 0.09)];
            s += glow(lineD(q0, q1), '#32F0FF', 1.5, 1.4, true);
        } else if (which === 'b') {
            s += glow(lineD(r.p1, r.p2), '#32F0FF', 1, 1.1);
            s += softDot('nd', r.p2, 8, '', 0.9);
            s += `<rect x="${f(r.p2[0] - 1.8)}" y="${f(r.p2[1] - 1.8)}" width="3.6" height="3.6" fill="#F2FBFF"/>`;
        } else {
            s += glow(lineD(r.p0, r.p1), '#32F0FF', 1.2, 1.3, true);
            s += softDot('nd', r.p1, 6, '', 1);
            s += dot(r.p1, 1.6, '#F2FBFF');
        }
    }
    if (which === 'b') for (const [a, b] of mesh) s += glow(lineD(a, b), '#8B5CFF', 0.7, 0.8);
    return svg(box, edgeMask.wrap(s), defs);
}
files['links-a.svg'] = litLayer('a');
files['links-b.svg'] = litLayer('b');
files['links-c.svg'] = litLayer('c');

// --- rings ----------------------------------------------------------------------------------
/** Two arcs of a band with gaps centred at 0 and 180 degrees. */
const spans = gap => [
    [gap, 180 - gap],
    [180 + gap, 360 - gap],
];
function ringBase(r1, r2, gap, id) {
    // dark metal body, lit from inside (radial gradient fixed to the centre)
    let s = '';
    for (const [a0, a1] of spans(gap)) s += `<path d="${bandD(r1, r2, a0, a1)}" fill="url(#${id})"/>`;
    return s;
}
const ringGrad = (id, r1, r2) =>
    radial(
        id,
        [
            [0, '#0A1A33', 1],
            [r1 / r2 - 0.001, '#0A1A33', 1],
            [r1 / r2, '#1B4F92', 1],
            [r1 / r2 + (1 - r1 / r2) * 0.3, '#0C1C38', 1],
            [1, '#08111F', 1],
        ],
        ` cx="${C[0]}" cy="${C[1]}" r="${r2}" gradientUnits="userSpaceOnUse"`,
    );

// outer gate
{
    const R = 160;
    const box = [C[0] - R, C[1] - R, 2 * R, 2 * R];
    const r1 = 138;
    const r2 = 150;
    const gap = 8;
    let s = ringBase(r1, r2, gap, 'og');
    // edges
    for (const [a0, a1] of spans(gap)) {
        s += glow(arcD(r2, a0, a1), '#2D7BFF', 0.9, 0.5);
        s += stroke(arcD(r2, a0, a1), '#2D7BFF', 0.9, 0.7);
        s += glow(arcD(r1, a0, a1), '#32F0FF', 0.8, 0.45);
        s += stroke(arcD((r1 + r2) / 2, a0 + 3, a1 - 3), '#2D7BFF', 0.7, 0.5, ' stroke-dasharray="1 3"');
    }
    // ticks outside the band
    for (let a = 0; a < 360; a += 5) {
        const inGap = a % 180 < gap + 4 || a % 180 > 180 - gap - 4;
        if (inGap) continue;
        const long = a % 15 === 0;
        s += stroke(lineD(P(r2 + 2.5, a), P(r2 + (long ? 8 : 5), a)), long ? '#5FB8FF' : '#2D7BFF', long ? 1.1 : 0.8, long ? 0.55 : 0.32);
    }
    // lit indicator segments
    for (const [a0, a1] of [
        [40, 62],
        [220, 242],
    ]) {
        s += `<path d="${bandD(r1 + 3, r2 - 3, a0, a1)}" fill="#2D7BFF" opacity="0.35"/>`;
        s += glow(arcD((r1 + r2) / 2, a0 + 1, a1 - 1), '#2D7BFF', 1.4, 0.8);
    }
    // gap ends: one plain radial tick each, across the band and a little beyond
    for (const a of [gap, 180 - gap, 180 + gap, 360 - gap]) {
        s += glow(lineD(P(r1 - 1, a), P(r2 + 7, a)), '#7FD8FF', 1.4, 0.8);
    }
    files['ring-outer.svg'] = svg(box, s, ringGrad('og', r1, r2));
}
// middle gate: segmented
{
    const R = 128;
    const box = [C[0] - R, C[1] - R, 2 * R, 2 * R];
    const r1 = 104;
    const r2 = 121;
    const gap = 11;
    let s = '';
    for (const [a0, a1] of spans(gap)) {
        // blocks of ~16 degrees with slits
        const n = Math.round((a1 - a0) / 16);
        const step = (a1 - a0) / n;
        for (let i = 0; i < n; i++) {
            const b0 = a0 + i * step + (i === 0 ? 0 : 1.2);
            const b1 = a0 + (i + 1) * step - (i === n - 1 ? 0 : 1.2);
            s += `<path d="${bandD(r1, r2, b0, b1)}" fill="url(#mg)"/>`;
            s += stroke(arcD(r2 - 0.5, b0 + 0.6, b1 - 0.6), '#2D7BFF', 1, 0.6);
            s += stroke(arcD(r1 + 0.6, b0 + 0.6, b1 - 0.6), '#32F0FF', 1.1, 0.7);
            // tooth on the inner edge in the middle of every second block
            if (i % 2 === 0) {
                const m = (b0 + b1) / 2;
                s += `<path d="${bandD(r1 + 3, r1 + 7, m - 2.5, m + 2.5)}" fill="#32F0FF" opacity="0.5"/>`;
            }
        }
        s += stroke(arcD((r1 + r2) / 2 + 2, a0 + 2, a1 - 2), '#2D7BFF', 0.6, 0.45, ' stroke-dasharray="6 2 1 2"');
        s += glow(arcD(r1, a0, a1), '#2D9BFF', 0.8, 0.45);
    }
    // violet accent blocks
    for (const [a0, a1] of [
        [70, 84],
        [250, 264],
    ]) {
        s += glow(arcD(r2 - 4, a0, a1), '#8B5CFF', 1.8, 1.1);
        s += stroke(arcD(r2 - 4, a0, a1), '#E2D6FF', 0.6, 0.9);
    }
    for (const a of [gap, 180 - gap, 180 + gap, 360 - gap]) {
        s += glow(lineD(P(r1 - 1, a), P(r2 + 1, a)), '#9FEFFF', 1.6, 0.9);
    }
    files['ring-mid.svg'] = svg(box, s, ringGrad('mg', r1, r2));
}
// ring halo: blurred light on the gates' inner edges (rotation-invariant, so it never rotates)
{
    const R = 112;
    const box = [C[0] - R, C[1] - R, 2 * R, 2 * R];
    let s = '';
    s += `<g filter="url(#hb)">`;
    for (const [r, w, c, gap] of [[104, 2.6, '#2D9BFF', 11]]) {
        for (const [a0, a1] of spans(gap)) s += stroke(arcD(r, a0, a1), c, w, 0.9);
    }
    s += `</g>`;
    const defs = `<filter id="hb" filterUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"><feGaussianBlur stdDeviation="4"/></filter>`;
    files['ring-halo.svg'] = svg(box, s, defs);
}

// --- light: bloom, beam, core, flare -----------------------------------------------------
{
    const R = 168;
    const box = [C[0] - R, C[1] - R, 2 * R, 2 * R];
    const defs = radial('bl', [
        [0, '#5FB8FF', 0.55],
        [0.18, '#2D7BFF', 0.35],
        [0.45, '#0074C2', 0.14],
        [0.75, '#3B2A8F', 0.05],
        [1, '#0C1830', 0],
    ]);
    files['bloom.svg'] = svg(box, `<circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="url(#bl)"/>`, defs);
}
{
    const box = [C[0] - 34, 0, 68, H];
    const defs =
        radial('bw', [
            [0, '#9FEFFF', 0.55],
            [0.35, '#2D7BFF', 0.25],
            [1, '#2D7BFF', 0],
        ]) +
        radial('bc', [
            [0, '#F2FBFF', 1],
            [0.5, '#9FEFFF', 0.6],
            [1, '#32F0FF', 0],
        ]);
    files['beam.svg'] = svg(
        box,
        `<ellipse cx="${C[0]}" cy="${C[1]}" rx="34" ry="225" fill="url(#bw)"/>` + `<ellipse cx="${C[0]}" cy="${C[1]}" rx="4" ry="205" fill="url(#bc)"/>` + `<ellipse cx="${C[0]}" cy="${HORIZON + 4}" rx="34" ry="10" fill="url(#bw)"/>`,
        defs,
    );
}
{
    // a tight halo behind the gem: cyan, never a white fog
    const R = 64;
    const box = [C[0] - R, C[1] - R, 2 * R, 2 * R];
    const defs = radial('cr', [
        [0, '#BFF8FF', 0.8],
        [0.22, '#5FE3FF', 0.5],
        [0.5, '#2D9BFF', 0.2],
        [0.8, '#2D7BFF', 0.05],
        [1, '#2D7BFF', 0],
    ]);
    files['core.svg'] = svg(box, `<circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="url(#cr)"/>`, defs);
}
{
    const box = [0, C[1] - 60, W, 120];
    const defs =
        radial('fs', [
            [0, '#F2FBFF', 0.95],
            [0.25, '#9FEFFF', 0.45],
            [1, '#2D7BFF', 0],
        ]) +
        radial('fw', [
            [0, '#32F0FF', 0.3],
            [1, '#2D7BFF', 0],
        ]) +
        radial('fg', [
            [0, '#FFFFFF', 1],
            [0.3, '#BFF8FF', 0.5],
            [1, '#32F0FF', 0],
        ]);
    files['flare.svg'] = svg(
        box,
        `<ellipse cx="${C[0]}" cy="${C[1]}" rx="180" ry="14" fill="url(#fw)"/>` +
            `<ellipse cx="${C[0]}" cy="${C[1]}" rx="176" ry="2.4" fill="url(#fs)"/>` +
            `<ellipse cx="${C[0]}" cy="${C[1]}" rx="1.6" ry="56" fill="url(#fg)"/>`,
        defs,
    );
}

// --- prism: a quartz capsule that breaks into four shards around the gem it holds ---------------
const T = [180, 103];
const B = [180, 289];
const SLt = [135, 156], CLt = [160, 161], Mt = [180, 161], CRt = [200, 161], SRt = [225, 156];
const SLb = [135, 236], CLb = [160, 231], Mb = [180, 231], CRb = [200, 231], SRb = [225, 236];
// The gem's seat (its closed size) and the slanted fracture that runs through it.
const GW = 30, GH = 42, G0 = 0.36;
const gT = [180, C[1] - GH * G0], gB = [180, C[1] + GH * G0], gL = [180 - GW * G0, C[1]], gR = [180 + GW * G0, C[1]];
const FL = [135, 204], FLc = [160, f(C[1] + ((gL[0] - 160) / (gL[0] - 135)) * 8)];
const FR = [225, 188], FRc = [200, f(C[1] - ((200 - gR[0]) / (225 - gR[0])) * 8)];
const TIP = 0, COL = 1;
const PIECES = [
    ['p-tl', [[TIP, [T, SLt, CLt], '#5FE3FF', 0.62, '#0E4A86', 0.88], [TIP, [T, CLt, Mt], '#3A8DFF', 0.55, '#0B2A5A', 0.9], [COL, [SLt, CLt, FLc, FL], '#1F76DA', 0.72, '#0C2D63', 0.9], [COL, [CLt, Mt, gT, gL, FLc], '#0F3B80', 0.72, '#0A2552', 0.8]]],
    ['p-tr', [[TIP, [T, Mt, CRt], '#2763C8', 0.6, '#0A2048', 0.9], [TIP, [T, CRt, SRt], '#143B7A', 0.82, '#07122A', 0.93], [COL, [Mt, CRt, FRc, gR, gT], '#0C3070', 0.76, '#081D42', 0.84], [COL, [CRt, SRt, FR, FRc], '#081A3A', 0.92, '#050E20', 0.95]]],
    ['p-bl', [[TIP, [B, CLb, SLb], '#5A3FC4', 0.62, '#0D2A57', 0.9], [TIP, [B, Mb, CLb], '#1E62D0', 0.62, '#0B2B5E', 0.9], [COL, [FL, FLc, CLb, SLb], '#1F76DA', 0.72, '#0C2D63', 0.9], [COL, [FLc, gL, gB, Mb, CLb], '#0F3B80', 0.72, '#0A2552', 0.8]]],
    ['p-br', [[TIP, [B, CRb, Mb], '#1A4FB0', 0.7, '#0A2550', 0.92], [TIP, [B, SRb, CRb], '#173F80', 0.85, '#071328', 0.94], [COL, [gB, gR, FRc, CRb, Mb], '#0C3070', 0.76, '#081D42', 0.84], [COL, [FRc, FR, SRb, CRb], '#081A3A', 0.92, '#050E20', 0.95]]],
];
const PBOX = [126, 96, 108, 200];
for (const [id, polys] of PIECES) {
    let defs = '';
    let s = '';
    const upper = id[2] === 't';
    const left = id[3] === 'l';
    polys.forEach(([kind, poly, c0, o0, c1, o1], i) => {
        // tips: light falls from the apex; column: one gradient down the whole column, so the shards match when closed
        const ys = poly.map(p => p[1]);
        const y0 = kind === COL ? Mt[1] : upper ? Math.min(...ys) : Math.max(...ys);
        const y1 = kind === COL ? Mb[1] : upper ? Math.max(...ys) : Math.min(...ys);
        defs += linear(`g${i}`, 0, y0, 0, y1, [[0, c0, o0], [1, c1, o1]], ' gradientUnits="userSpaceOnUse"');
        s += `<polygon points="${pts(poly)}" fill="url(#g${i})"/>`;
        const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
        const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
        const inset = poly.map(p => [cx + (p[0] - cx) * 0.7, cy + (p[1] - cy) * 0.7]);
        if (kind === TIP) s += stroke(`M${pts(inset)}Z`, '#9FEFFF', 0.5, 0.22);
    });
    for (const [, poly] of polys) s += glow(`M${pts(poly)}Z`, '#32F0FF', 0.9, 0.6);
    // silhouette and apex edges catch the light
    const apex = upper ? T : B;
    const sh = upper ? (left ? SLt : SRt) : left ? SLb : SRb;
    const fr = left ? FL : FR;
    if (upper) s += glow(lineD(T, sh), left ? '#F2FBFF' : '#7FD8FF', 1, 1, left);
    if (upper) s += stroke(lineD(T, left ? CLt : CRt), '#BFF8FF', 0.8, 0.8);
    if (!upper) s += glow(lineD(apex, sh), left ? '#B9A6FF' : '#2D7BFF', 1, 0.9);
    s += glow(lineD(sh, fr), left ? '#BFF8FF' : '#2D7BFF', 1, 1, left);
    // glass reflections across the outer face
    if (id === 'p-tl') s += stroke(lineD([139, 198], [154, 166]), '#BFF8FF', 1.2, 0.28);
    if (id === 'p-bl') s += stroke(lineD([140, 228], [152, 206]), '#BFF8FF', 0.6, 0.2);
    if (id === 'p-br') s += stroke(lineD([205, 226], [219, 196]), '#7FD8FF', 0.8, 0.15);
    files[`${id}.svg`] = svg(PBOX, s, defs);
}
{
    // blurred outline of the sealed prism
    const box = [120, 88, 120, 216];
    const outline = `M${pts([T, SLt, SLb, B, SRb, SRt])}Z`;
    const s = `<g filter="url(#pb)">${stroke(outline, '#32F0FF', 3, 0.9)}${stroke(`M${pts([SLt, CLt, CRt, SRt])}`, '#2D7BFF', 2, 0.8)}${stroke(`M${pts([SLb, CLb, CRb, SRb])}`, '#2D7BFF', 2, 0.8)}</g>`;
    const defs = `<filter id="pb" filterUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"><feGaussianBlur stdDeviation="5"/></filter>`;
    files['prism-halo.svg'] = svg(box, s, defs);
}
{
    // the gem: drawn at its open size (the stage shrinks it into its seat while the prism is closed, so it is always crisp)
    const box = [C[0] - 40, C[1] - 52, 80, 104];
    const t = [180, C[1] - GH], b = [180, C[1] + GH], l = [180 - GW, C[1] - 4], r = [180 + GW, C[1] - 4], m = [180, C[1] - 4];
    const face = (id, poly, x1, y1, x2, y2, c0, c1) => [linear(id, x1, y1, x2, y2, [[0, c0, 1], [1, c1, 1]], ' gradientUnits="userSpaceOnUse"'), `<polygon points="${pts(poly)}" fill="url(#${id})"/>`];
    const faces = [
        face('ga', [t, l, m], t[0], t[1], l[0], l[1], '#FFFFFF', '#9FEFFF'),
        face('gb', [t, m, r], t[0], t[1], r[0], r[1], '#BFF8FF', '#3A9DFF'),
        face('gc', [l, b, m], l[0], l[1], b[0], b[1], '#6FD8FF', '#3F4FD0'),
        face('gd', [m, b, r], m[0], m[1], b[0], b[1], '#2D7BFF', '#12306E'),
    ];
    const out = `M${pts([t, r, b, l])}Z`;
    let s = '';
    s += stroke(out, '#32F0FF', 7, 0.1) + stroke(out, '#32F0FF', 3.4, 0.25);
    s += faces.map(x => x[1]).join('');
    // a table facet inside, and the crisp edges
    const k = 0.42;
    const inner = [t, r, b, l].map(p => [m[0] + (p[0] - m[0]) * k, m[1] + (p[1] - m[1]) * k]);
    s += `<polygon points="${pts(inner)}" fill="#F2FBFF" fill-opacity="0.2"/>`;
    s += stroke(`M${pts(inner)}Z`, '#F2FBFF', 0.7, 0.75);
    [t, r, b, l].forEach((p, i) => (s += stroke(lineD(p, inner[i]), '#F2FBFF', 0.6, 0.55)));
    s += stroke(out, '#F2FBFF', 1.3, 1);
    files['gem.svg'] = svg(box, s, faces.map(x => x[0]).join(''));
}
const facetInfo = {};

// --- particles + foreground bokeh ------------------------------------------------------------
{
    const box = [C[0] - 5, C[1] - 5, 10, 10];
    const defs = radial('bg', [
        [0, '#BFF8FF', 0.9],
        [0.4, '#32F0FF', 0.3],
        [1, '#32F0FF', 0],
    ]);
    files['bit.svg'] = svg(box, `<circle cx="${C[0]}" cy="${C[1]}" r="5" fill="url(#bg)"/><rect x="${C[0] - 1.1}" y="${C[1] - 1.1}" width="2.2" height="2.2" fill="#F2FBFF"/>`, defs);
}
{
    // shockwave: a thin ring of light that leaves the core when the prism breaks
    const R = 150;
    const box = [C[0] - R, C[1] - R, 2 * R, 2 * R];
    let w = glow(`M${C[0] - 140} ${C[1]}A140 140 0 1 1 ${C[0] + 140} ${C[1]}A140 140 0 1 1 ${C[0] - 140} ${C[1]}Z`, '#32F0FF', 1.4, 1.1, true);
    w += `<circle cx="${C[0]}" cy="${C[1]}" r="140" fill="url(#wv)"/>`;
    const defs = radial('wv', [
        [0, '#2D7BFF', 0],
        [0.8, '#2D7BFF', 0],
        [0.97, '#32F0FF', 0.22],
        [1, '#32F0FF', 0],
    ]);
    files['wave.svg'] = svg(box, w, defs);
}
{
    const box = [0, 0, W, H];
    const defs =
        radial('bk1', [
            [0, '#32F0FF', 0.35],
            [0.3, '#2D7BFF', 0.12],
            [1, '#2D7BFF', 0],
        ]) +
        radial('bk2', [
            [0, '#8B5CFF', 0.4],
            [0.3, '#8B5CFF', 0.12],
            [1, '#8B5CFF', 0],
        ]);
    let d = '';
    for (const [x, y, r, c] of [
        [22, 404, 4.5, 'bk1'],
        [58, 432, 2.6, 'bk1'],
        [338, 52, 3.8, 'bk2'],
        [344, 300, 2.4, 'bk1'],
        [16, 112, 2.2, 'bk2'],
        [300, 424, 3, 'bk1'],
    ]) {
        d += `<circle cx="${x}" cy="${y}" r="${r * 4}" fill="url(#${c})"/>`;
        d += `<rect x="${x - r / 2}" y="${y - r / 2}" width="${r}" height="${r}" fill="${c === 'bk1' ? '#BFF8FF' : '#D6CCFF'}" opacity="0.55" transform="rotate(45 ${x} ${y})"/>`;
    }
    files['bokeh.svg'] = svg(box, d, defs);
}

for (const [name, text] of Object.entries(files)) writeFileSync(join(OUT, name), text);
console.log(Object.entries(files).map(([n, t]) => `${n} ${t.length}`).join('\n'));
console.log('facets', JSON.stringify(facetInfo));
