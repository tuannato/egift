// Generator for the cyberpunk lixi wrapper art. Writes SVGs in canvas coordinates
// (each file's viewBox = its layer box). Run: node gen.mjs <outdir>
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'lixi');
if (!OUT.endsWith('wrappers/lixi')) throw new Error('out dir must be public/wrappers/lixi');
mkdirSync(OUT, { recursive: true });

const C = {
    black: '#0A0A0F', maroon: '#2A0A0E', red: '#FF3B2F', mag: '#FF2E88', cyan: '#19E3FF', gold: '#FFC857', hot: '#FFF4EC',
};

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
const f = n => String(Math.round(n * 100) / 100);
const pts = a => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

const BOX = {};
function svg(name, box, inner) {
    BOX[name] = box;
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    writeFileSync(join(OUT, `${name}.svg`), s);
}
const blurDef = (id, sd, box) =>
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const radial = (id, stops, extra = '') =>
    `<radialGradient id="${id}"${extra}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
const linear = (id, [x1, y1, x2, y2], stops, extra = '') =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;

function hex(cx, cy, r, rot = -90) {
    const a = [];
    for (let k = 0; k < 6; k++) {
        const t = ((rot + 60 * k) * Math.PI) / 180;
        a.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
    return a;
}
// Hoa mai: five round petals.
function blossom(cx, cy, r, { stroke = C.gold, fill = C.gold, fillOp = 0.22, sw = 1, core = C.hot, rot = -90, line = false, dots = true } = {}) {
    let s = '';
    for (let k = 0; k < 5; k++) {
        const t = ((rot + 72 * k) * Math.PI) / 180;
        const px = cx + Math.cos(t) * r * 0.52;
        const py = cy + Math.sin(t) * r * 0.52;
        s += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(r * 0.4)}" ry="${f(r * 0.5)}" transform="rotate(${f(rot + 72 * k + 90)} ${f(px)} ${f(py)})" ${line ? 'fill="none"' : `fill="${fill}" fill-opacity="${fillOp}"`} stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    if (line) return s + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.13)}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`;
    for (let k = 0; k < 5 && dots; k++) {
        const t = ((rot + 36 + 72 * k) * Math.PI) / 180;
        s += `<circle cx="${f(cx + Math.cos(t) * r * 0.42)}" cy="${f(cy + Math.sin(t) * r * 0.42)}" r="${f(Math.max(0.7, r * 0.07))}" fill="${core}"/>`;
    }
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.2)}" fill="${core}"/>`;
    return s;
}

/* Envelope geometry (canvas units) */
const EX0 = 105, EX1 = 255, EY0 = 150, EY1 = 380, MOUTH = 160;
const FRONT = [[EX0, MOUTH], [EX1, MOUTH], [EX1, EY1 - 12], [EX1 - 12, EY1], [EX0 + 12, EY1], [EX0, EY1 - 12]];
const TIP = 246;
const FLAP = [[EX0, EY0], [EX1, EY0], [EX1, 172], [192, TIP], [168, TIP], [EX0, 172]];
const FLAPB = [[EX0, EY0], [EX1, EY0], [EX1, 128], [192, 54], [168, 54], [EX0, 128]];
const SEAL = [180, 240];

const mir = p => p.map(([x, y]) => [360 - x, y]);
const TL = [
    [[167, 318], [152, 318], [141, 307], [141, 252], [136, 247]],
    [[180, 370], [148, 370], [131, 353], [131, 339]],
    [[131, 321], [131, 300], [118, 287], [118, 198]],
    [[112, 372], [112, 300]],
];
const SPINE = [
    [[180, 374], [180, 332]],
    [[180, 304], [180, 280]],
];
const TRACES = [...TL, ...TL.map(mir), ...SPINE];
const NODES = [[118, 198], [112, 300], [112, 372], [136, 247]].flatMap(p => [p, [360 - p[0], p[1]]]).concat([[180, 280], [180, 374]]);
const BLOSSOMS = [
    [180, 318, 14],
    [131, 330, 8], [229, 330, 8],
];
const PULSE_A = [0, 2, 4, 6, 8];
const PULSE_B = [1, 3, 5, 7, 9];

const pl = (p, attrs) => `<polyline points="${pts(p)}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${attrs}/>`;

/* Sky: gradient, far city, banded moon, far bokeh, distant windows */
{
    const r = rng(7);
    let far = '';
    let x = -4;
    const skyline = [];
    while (x < 364) {
        const w = 10 + r() * 22;
        const mid = Math.abs(x + w / 2 - 180) < 95;
        const h = mid ? 40 + r() * 70 : 120 + r() * 170;
        skyline.push([x, w, h]);
        x += w - 1;
    }
    for (const [x0, w, h] of skyline) {
        const top = 390 - h;
        far += `<rect x="${f(x0)}" y="${f(top)}" width="${f(w)}" height="${f(h)}" fill="url(#farT)"/>`;
        if (r() < 0.5) far += `<rect x="${f(x0 + w / 2 - 0.6)}" y="${f(top - 8 - r() * 14)}" width="1.2" height="${f(22)}" fill="#1E1024"/>`;
        const cols = Math.floor(w / 5);
        for (let i = 0; i < cols; i++) {
            for (let yy = top + 6; yy < 380; yy += 7) {
                if (r() < 0.06) {
                    const col = r() < 0.5 ? C.mag : r() < 0.5 ? C.cyan : C.gold;
                    far += `<rect x="${f(x0 + 2 + i * 5)}" y="${f(yy)}" width="1.6" height="2.4" fill="${col}" opacity="${f(0.18 + r() * 0.25)}"/>`;
                }
            }
        }
    }
    let bok = '';
    const cols = ['bkM', 'bkC', 'bkR', 'bkG'];
    for (let i = 0; i < 22; i++) {
        const cx = r() * 360, cy = 150 + r() * 230, rr = 3 + r() * 7;
        bok += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}" fill="url(#${cols[i % 4]})" opacity="${f(0.35 + r() * 0.4)}"/>`;
    }
    const defs =
        linear('sky', [0, 0, 0, 1], [[0, '#050508'], [0.45, '#0B0710'], [0.72, '#1F0A1E'], [0.86, '#2A0B1A'], [1, '#0A0A0F']]) +
        linear('farT', [0, 0, 0, 1], [[0, '#1A0D20'], [1, '#22101F']]) +
        linear('moon', [0, 0, 0, 1], [[0, C.red], [0.6, C.mag], [1, '#7A1450']]) +
        radial('moonGlow', [[0, C.red, 0.18], [0.5, C.mag, 0.08], [1, C.mag, 0]]) +
        radial('bkM', [[0, C.mag, 0.5], [0.8, C.mag, 0.6], [1, C.mag, 0]]) +
        radial('bkC', [[0, C.cyan, 0.45], [0.8, C.cyan, 0.55], [1, C.cyan, 0]]) +
        radial('bkR', [[0, C.red, 0.5], [0.8, C.red, 0.6], [1, C.red, 0]]) +
        radial('bkG', [[0, C.gold, 0.4], [0.8, C.gold, 0.5], [1, C.gold, 0]]);
    svg('sky', [-4, -4, 368, 458],
        `<defs>${defs}</defs><rect x="-4" y="-4" width="368" height="458" fill="url(#sky)"/>` +
        `<circle cx="180" cy="150" r="150" fill="url(#moonGlow)"/>` +
        `<circle cx="180" cy="146" r="100" fill="url(#moon)" opacity="0.5"/>` +
        `<circle cx="180" cy="146" r="108" fill="none" stroke="${C.mag}" stroke-width="0.7" opacity="0.32"/>` +
        `<circle cx="180" cy="146" r="119" fill="none" stroke="${C.mag}" stroke-width="0.5" opacity="0.16"/>` +
        far + bok);
}

/* Haze (screen) */
svg('haze', [-12, 150, 384, 260],
    `<defs>${radial('hM', [[0, C.mag, 0.55], [1, C.mag, 0]])}${radial('hC', [[0, C.cyan, 0.4], [1, C.cyan, 0]])}${radial('hR', [[0, C.red, 0.5], [1, C.red, 0]])}</defs>` +
    `<ellipse cx="40" cy="330" rx="150" ry="90" fill="url(#hM)"/>` +
    `<ellipse cx="330" cy="300" rx="130" ry="100" fill="url(#hC)"/>` +
    `<ellipse cx="180" cy="370" rx="170" ry="50" fill="url(#hR)"/>`);

/* City: near towers framing the envelope */
{
    const r = rng(21);
    let s = '';
    const defs =
        linear('tw', [0, 0, 0, 1], [[0, '#0D0B13'], [1, '#08080C']]) +
        linear('stripC', [0, 0, 1, 0], [[0, C.cyan, 0], [0.5, C.cyan, 0.35], [1, C.cyan, 0]]) +
        linear('stripM', [0, 0, 1, 0], [[0, C.mag, 0], [0.5, C.mag, 0.35], [1, C.mag, 0]]) +
        linear('rimR', [0, 0, 1, 0], [[0, C.red, 0], [1, C.red, 0.28]]) +
        linear('rimL', [0, 0, 1, 0], [[0, C.red, 0.28], [1, C.red, 0]]) +
        radial('mg', [[0, C.gold, 0.3], [1, C.gold, 0]]);
    const L = [[-6, 40, 52], [30, 30, 120], [56, 26, 176], [78, 20, 238]];
    const R = L.map(([x, w, t]) => [360 - x - w, w, t + (r() * 20 - 10)]);
    R[0][2] = 20; R[1][2] = 98; R[2][2] = 160;
    const towers = [...L, ...R];
    for (const [x, w, top] of towers) {
        s += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(392 - top)}" fill="url(#tw)"/>`;
        s += `<rect x="${f(x + 3)}" y="${f(top - 4)}" width="${f(w * 0.4)}" height="4" fill="#0D0B13"/>`;
        for (let yy = top + 8; yy < 384; yy += 6) {
            for (let xx = x + 3; xx < x + w - 3; xx += 4) {
                const v = r();
                if (v < 0.03) s += `<rect x="${f(xx)}" y="${f(yy)}" width="1.8" height="2.6" fill="${v < 0.012 ? C.gold : v < 0.022 ? C.cyan : C.mag}" opacity="${f(0.3 + r() * 0.35)}"/>`;
            }
        }
        for (let yy = top + 30 + r() * 20; yy < 380; yy += 40 + r() * 30) s += `<rect x="${f(x)}" y="${f(yy)}" width="${f(w)}" height="1" fill="#16121C"/>`;
    }
    s += `<rect x="${f(78 + 20 - 6)}" y="238" width="6" height="154" fill="url(#rimR)"/>`;
    s += `<rect x="${f(78 + 20 - 1.2)}" y="238" width="1.2" height="154" fill="${C.red}" opacity="0.55"/>`;
    s += `<rect x="${f(360 - 98)}" y="${f(R[3][2])}" width="6" height="${f(392 - R[3][2])}" fill="url(#rimL)"/>`;
    s += `<rect x="${f(360 - 98)}" y="${f(R[3][2])}" width="1.2" height="${f(392 - R[3][2])}" fill="${C.red}" opacity="0.55"/>`;
    const strip = (x, y, h, grad, col) =>
        `<rect x="${f(x - 7)}" y="${f(y)}" width="14" height="${f(h)}" fill="url(#${grad})" opacity="0.5"/>` +
        `<rect x="${f(x - 1.1)}" y="${f(y)}" width="2.2" height="${f(h)}" fill="${col}" opacity="0.5"/>` +
        `<rect x="${f(x - 0.4)}" y="${f(y + 2)}" width="0.8" height="${f(h - 4)}" fill="${C.hot}" opacity="0.4"/>`;
    s += strip(28, 70, 150, 'stripC', C.cyan);
    s += strip(54, 140, 60, 'stripM', C.mag);
    s += strip(332, 40, 110, 'stripM', C.mag);
    s += strip(304, 120, 46, 'stripC', C.cyan);
    const bar = (x, y, w, col) =>
        `<rect x="${f(x)}" y="${f(y - 3)}" width="${f(w)}" height="6" fill="${col}" opacity="0.07"/>` +
        `<rect x="${f(x)}" y="${f(y - 0.7)}" width="${f(w)}" height="1.4" fill="${col}" opacity="0.5"/>`;
    s += bar(30, 250, 26, C.red);
    s += bar(306, 222, 24, C.cyan);
    s += bar(-2, 300, 34, C.mag);
    s += `<rect x="12" y="20" width="1.2" height="32" fill="#14111A"/><circle cx="12.6" cy="20" r="1.6" fill="${C.red}"/><circle cx="12.6" cy="20" r="4" fill="${C.red}" opacity="0.25"/>`;
    s += `<rect x="347" y="-2" width="1.2" height="24" fill="#14111A"/><circle cx="347.6" cy="2" r="1.6" fill="${C.red}"/><circle cx="347.6" cy="2" r="4" fill="${C.red}" opacity="0.25"/>`;
    s += `<path d="M24 150 Q 44 164 60 160" fill="none" stroke="#1A1520" stroke-width="1.2"/>`;
    s += `<path d="M300 120 Q 318 134 336 124" fill="none" stroke="#1A1520" stroke-width="1"/>`;
    // neon apricot branch (canh mai), hologram sign hung off the right towers
    {
        const main = 'M366 182 C 340 170 318 150 300 128 S 272 96 258 90';
        const twigs = ['M326 160 C 322 146 326 134 334 124', 'M300 128 C 292 132 282 134 272 132', 'M286 108 C 290 98 298 90 308 86'];
        const line = (d, w) => `<path d="${d}" fill="none" stroke="${C.gold}" stroke-width="${w * 4}" stroke-opacity="0.08" stroke-linecap="round"/>` +
            `<path d="${d}" fill="none" stroke="${C.gold}" stroke-width="${w * 2}" stroke-opacity="0.2" stroke-linecap="round"/>` +
            `<path d="${d}" fill="none" stroke="#FFE2A0" stroke-width="${w}" stroke-linecap="round"/>`;
        s += line(main, 1.4);
        for (const d of twigs) s += line(d, 1);
        const fl = [[258, 90, 6.5], [272, 132, 5.5], [308, 86, 6], [334, 124, 6.5], [300, 128, 4.5], [318, 150, 4], [286, 108, 4], [348, 174, 4.5]];
        for (const [x, y, rr] of fl) {
            s += `<circle cx="${x}" cy="${y}" r="${f(rr * 2)}" fill="url(#mg)"/>`;
            s += blossom(x, y, rr, { stroke: C.gold, fill: C.gold, fillOp: 0.4, sw: 0.9, core: C.hot });
        }
        for (const [x, y] of [[266, 104], [294, 142], [322, 106], [346, 150]]) s += `<circle cx="${x}" cy="${y}" r="1.6" fill="${C.gold}"/>`;
    }
    svg('city', [-6, 0, 372, 395], `<defs>${defs}</defs>${s}`);
}

/* Bokeh: foreground out-of-focus neon discs at the edges (screen) */
{
    const r = rng(33);
    const defs = [['M', C.mag], ['C', C.cyan], ['R', C.red], ['G', C.gold]]
        .map(([k, c]) => radial(`b${k}`, [[0, c, 0.12], [0.75, c, 0.2], [0.9, c, 0.26], [1, c, 0]])).join('');
    const spots = [
        [-6, 118, 34, 'M'], [374, 206, 40, 'C'], [10, 392, 30, 'R'], [358, 430, 26, 'M'],
    ];
    let s = '';
    for (const [x, y, rr, k] of spots) s += `<circle cx="${x}" cy="${y}" r="${rr}" fill="url(#b${k})" opacity="${f(0.6 + r() * 0.4)}"/>`;
    svg('bokeh', [-40, -30, 440, 502], `<defs>${defs}</defs>${s}`);
}

/* Rain (screen) */
{
    const r = rng(55);
    let s = '';
    for (let i = 0; i < 52; i++) {
        const x = r() * 380 - 10, y = r() * 440 - 10, len = 10 + r() * 18;
        const op = 0.12 + r() * 0.26;
        s += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - len * 0.16)}" y2="${f(y + len)}" stroke="#A8E8FF" stroke-width="${f(0.7 + r() * 0.5)}" stroke-opacity="${f(op)}" stroke-linecap="round"/>`;
    }
    svg('rain', [-14, -12, 388, 474], s);
}

/* Lantern drones */
{
    const drone = (cx, cy, k) => {
        const w = 15 * k, h = 20 * k;
        const body = [[cx - w * 0.3, cy - h / 2], [cx + w * 0.3, cy - h / 2], [cx + w / 2, cy - h * 0.2], [cx + w / 2, cy + h * 0.2], [cx + w * 0.3, cy + h / 2], [cx - w * 0.3, cy + h / 2], [cx - w / 2, cy + h * 0.2], [cx - w / 2, cy - h * 0.2]];
        return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(26 * k)}" fill="url(#dg)"/>` +
            `<line x1="${f(cx - 15 * k)}" y1="${f(cy - h / 2 - 3 * k)}" x2="${f(cx + 15 * k)}" y2="${f(cy - h / 2 - 3 * k)}" stroke="#2A2230" stroke-width="${f(1.6 * k)}"/>` +
            `<ellipse cx="${f(cx - 15 * k)}" cy="${f(cy - h / 2 - 4 * k)}" rx="${f(7 * k)}" ry="${f(1.3 * k)}" fill="${C.cyan}" opacity="0.35"/>` +
            `<ellipse cx="${f(cx + 15 * k)}" cy="${f(cy - h / 2 - 4 * k)}" rx="${f(7 * k)}" ry="${f(1.3 * k)}" fill="${C.cyan}" opacity="0.35"/>` +
            `<line x1="${f(cx)}" y1="${f(cy - h / 2 - 3 * k)}" x2="${f(cx)}" y2="${f(cy - h / 2)}" stroke="#2A2230" stroke-width="${f(1.4 * k)}"/>` +
            `<polygon points="${pts(body)}" fill="url(#lb)" stroke="${C.red}" stroke-width="${f(0.9 * k)}"/>` +
            `<line x1="${f(cx)}" y1="${f(cy - h / 2 + 2 * k)}" x2="${f(cx)}" y2="${f(cy + h / 2 - 2 * k)}" stroke="${C.gold}" stroke-width="${f(0.7 * k)}" opacity="0.6"/>` +
            `<rect x="${f(cx - w * 0.34)}" y="${f(cy - h / 2 - 1.6 * k)}" width="${f(w * 0.68)}" height="${f(2.2 * k)}" fill="${C.gold}"/>` +
            `<rect x="${f(cx - w * 0.34)}" y="${f(cy + h / 2 - 0.6 * k)}" width="${f(w * 0.68)}" height="${f(2.2 * k)}" fill="${C.gold}"/>` +
            `<line x1="${f(cx)}" y1="${f(cy + h / 2 + 1.6 * k)}" x2="${f(cx)}" y2="${f(cy + h / 2 + 9 * k)}" stroke="${C.gold}" stroke-width="${f(0.8 * k)}"/>` +
            `<circle cx="${f(cx)}" cy="${f(cy + h / 2 + 10 * k)}" r="${f(1.4 * k)}" fill="${C.cyan}"/>`;
    };
    const defs = radial('dg', [[0, C.red, 0.38], [0.4, C.red, 0.12], [1, C.red, 0]]) +
        radial('lb', [[0, '#FFD2B0', 1], [0.35, C.red, 1], [1, '#5A0A14', 1]]);
    svg('drone', [30, 52, 64, 64], `<defs>${defs}</defs>${drone(62, 84, 1)}`);
}

/* Ground: wet plane with reflections */
{
    const r = rng(77);
    let s = '';
    const defs = linear('gnd', [0, 0, 0, 1], [[0, '#120A14'], [0.3, '#0B0A10'], [1, '#060609']]) +
        linear('hz', [0, 0, 1, 0], [[0, C.mag, 0], [0.3, C.mag, 0.5], [0.5, C.red, 0.5], [0.7, C.cyan, 0.4], [1, C.cyan, 0]]);
    s += `<rect x="-6" y="388" width="372" height="68" fill="url(#gnd)"/>`;
    s += `<rect x="-6" y="388" width="372" height="0.8" fill="url(#hz)"/>`;
    for (let i = -8; i <= 8; i++) {
        const x2 = 180 + i * 60;
        s += `<line x1="${f(180 + i * 9)}" y1="389" x2="${f(x2)}" y2="452" stroke="#2A1A30" stroke-width="0.7" opacity="0.3"/>`;
    }
    for (const y of [394, 402, 414, 432]) s += `<line x1="-6" y1="${y}" x2="366" y2="${y}" stroke="#241628" stroke-width="0.6" opacity="0.5"/>`;
    const refl = (x, col, len) => {
        let o = '';
        for (let y = 391; y < 391 + len; y += 3 + r() * 3) {
            const w = 1.5 + r() * 4;
            o += `<rect x="${f(x - w / 2 + (r() - 0.5) * 2)}" y="${f(y)}" width="${f(w)}" height="1" fill="${col}" opacity="${f(0.5 * (1 - (y - 391) / len))}"/>`;
        }
        return o;
    };
    s += refl(28, C.cyan, 50) + refl(54, C.mag, 34) + refl(332, C.mag, 50) + refl(304, C.cyan, 30) + refl(97, C.red, 30) + refl(263, C.red, 30);
    svg('ground', [-6, 386, 372, 70], `<defs>${defs}</defs>${s}`);
}

/* Spill: aura + reflected pool (screen) */
{
    const r = rng(88);
    let s = '';
    const defs = radial('au', [[0, C.red, 0.34], [0.45, C.red, 0.14], [0.75, C.mag, 0.05], [1, C.mag, 0]]) +
        radial('pool', [[0, C.red, 0.55], [0.5, C.red, 0.2], [1, C.red, 0]]);
    s += `<ellipse cx="180" cy="262" rx="140" ry="172" fill="url(#au)"/>`;
    s += `<ellipse cx="180" cy="404" rx="118" ry="22" fill="url(#pool)"/>`;
    for (const x of [106, 254]) {
        for (let y = 392; y < 440; y += 3 + r() * 2.5) {
            const w = 2 + r() * 5;
            s += `<rect x="${f(x - w / 2)}" y="${f(y)}" width="${f(w)}" height="1" fill="${C.red}" opacity="${f(0.75 * (1 - (y - 392) / 50))}"/>`;
        }
    }
    for (let y = 394; y < 430; y += 4 + r() * 3) {
        const w = 8 + r() * 14;
        s += `<rect x="${f(180 - w / 2)}" y="${f(y)}" width="${f(w)}" height="1" fill="${C.gold}" opacity="${f(0.35 * (1 - (y - 394) / 40))}"/>`;
    }
    svg('spill', [30, 80, 300, 370], `<defs>${defs}</defs>${s}`);
}

/* Envelope back */
svg('env-back', [EX0, EY0, EX1 - EX0, EY1 - EY0],
    `<defs>${linear('eb', [0, 0, 0, 1], [[0, '#3A0C12'], [0.08, '#1A070B'], [1, '#0E0609']])}</defs>` +
    `<rect x="${EX0}" y="${EY0}" width="${EX1 - EX0}" height="${EY1 - EY0}" fill="url(#eb)"/>` +
    `<line x1="${EX0}" y1="${EY0 + 0.6}" x2="${EX1}" y2="${EY0 + 0.6}" stroke="${C.red}" stroke-width="1.2" opacity="0.8"/>`);

/* Flap, opened (inside face, behind the card) */
svg('flap-back', [100, 46, 160, 108],
    `<defs>${linear('fbg', [0, 1, 0, 0], [[0, '#240910'], [1, '#0C070A']])}</defs>` +
    `<polygon points="${pts(FLAPB)}" fill="url(#fbg)" stroke="${C.red}" stroke-width="1.4" stroke-linejoin="round" opacity="0.95"/>` +
    `<polygon points="${pts([[116, 146], [244, 146], [244, 131], [188, 66], [172, 66], [116, 131]])}" fill="none" stroke="${C.gold}" stroke-width="0.7" opacity="0.4"/>` +
    pl([[180, 146], [180, 92]], `stroke="${C.gold}" stroke-width="1" opacity="0.55"`) +
    pl([[150, 146], [150, 118], [162, 106]], `stroke="${C.gold}" stroke-width="0.9" opacity="0.45"`) +
    pl([[210, 146], [210, 118], [198, 106]], `stroke="${C.gold}" stroke-width="0.9" opacity="0.45"`) +
    `<polygon points="${pts(hex(180, 86, 7))}" fill="#0A0A0F" stroke="${C.red}" stroke-width="1" opacity="0.8"/>` +
    blossom(180, 86, 4.5, { stroke: C.gold, fill: C.gold, fillOp: 0.3, sw: 0.8, core: C.hot }));

/* Holographic card */
{
    const X0 = 117, Y0 = 175, W = 126, H = 170, X1 = X0 + W, Y1 = Y0 + H, ch = 10;
    const shape = [[X0 + ch, Y0], [X1 - ch, Y0], [X1, Y0 + ch], [X1, Y1 - ch], [X1 - ch, Y1], [X0 + ch, Y1], [X0, Y1 - ch], [X0, Y0 + ch]];
    const box = [X0 - 18, Y0 - 18, W + 36, H + 36];
    let s = '';
    const defs =
        blurDef('cb', 5, box) + blurDef('cb2', 2.2, box) +
        linear('cf', [0, 0, 0.3, 1], [[0, '#07323F', 0.9], [0.55, '#0B1A33', 0.86], [1, '#33082A', 0.86]]) +
        linear('sheen', [0, 0, 1, 1], [[0, '#fff', 0], [0.42, '#fff', 0], [0.5, '#fff', 0.16], [0.58, '#fff', 0], [1, '#fff', 0]]) +
        radial('cc', [[0, C.cyan, 0.32], [0.6, C.mag, 0.1], [1, C.mag, 0]]) +
        `<clipPath id="cclip"><polygon points="${pts(shape)}"/></clipPath>`;
    s += `<polygon points="${pts(shape)}" fill="none" stroke="${C.cyan}" stroke-width="4" filter="url(#cb)" opacity="0.9"/>`;
    s += `<polygon points="${pts(shape)}" fill="url(#cf)"/>`;
    s += `<g clip-path="url(#cclip)">`;
    s += `<ellipse cx="180" cy="232" rx="60" ry="50" fill="url(#cc)"/>`;
    for (let row = 0; row < 9; row++) for (let col = -1; col < 7; col++) {
        const hx = X0 + 4 + col * 20 + (row % 2) * 10, hy = Y0 + 6 + row * 17.3;
        s += `<polygon points="${pts(hex(hx, hy, 10.5))}" fill="none" stroke="${C.cyan}" stroke-width="0.6" opacity="0.09"/>`;
    }
    for (let y = Y0 + 2; y < Y1; y += 3.2) s += `<rect x="${X0}" y="${f(y)}" width="${W}" height="1" fill="${C.cyan}" opacity="0.11"/>`;
    s += `<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="url(#sheen)"/>`;
    s += `</g>`;
    s += `<polygon points="${pts(shape)}" fill="none" stroke="${C.cyan}" stroke-width="1.6"/>`;
    s += `<polygon points="${pts(shape)}" fill="none" stroke="#E8FDFF" stroke-width="0.6"/>`;
    // chamfer notches: short light cuts parallel to each cut corner
    for (const [ax, ay, bx, by] of [[X0 + ch, Y0, X0, Y0 + ch], [X1 - ch, Y0, X1, Y0 + ch], [X1, Y1 - ch, X1 - ch, Y1], [X0, Y1 - ch, X0 + ch, Y1]]) {
        const mx = (ax + bx) / 2, my = (ay + by) / 2, cx0 = 180, cy0 = (Y0 + Y1) / 2;
        const k = 5 / Math.hypot(cx0 - mx, cy0 - my);
        const ox = (cx0 - mx) * k, oy = (cy0 - my) * k;
        s += `<line x1="${f(ax + ox + (bx - ax) * 0.2)}" y1="${f(ay + oy + (by - ay) * 0.2)}" x2="${f(bx + ox - (bx - ax) * 0.2)}" y2="${f(by + oy - (by - ay) * 0.2)}" stroke="${C.mag}" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>`;
    }
    s += `<polygon points="${pts(hex(180, 232, 34))}" fill="none" stroke="${C.cyan}" stroke-width="1" opacity="0.7"/>`;
    s += `<polygon points="${pts(hex(180, 232, 39, -60))}" fill="none" stroke="${C.mag}" stroke-width="0.8" opacity="0.6" stroke-dasharray="3 4"/>`;
    s += `<g filter="url(#cb2)" opacity="0.9">${blossom(180, 232, 24, { stroke: C.gold, sw: 3, line: true })}</g>`;
    s += blossom(180, 232, 24, { stroke: C.gold, sw: 1.5, line: true });
    s += blossom(180, 232, 24, { stroke: '#FFF1CC', sw: 0.6, line: true });
    s += `<rect x="${X0 - 4}" y="204" width="34" height="1.4" fill="${C.mag}" opacity="0.7"/>`;
    s += `<rect x="${X1 - 26}" y="262" width="30" height="1.2" fill="${C.cyan}" opacity="0.8"/>`;
    svg('card', box, `<defs>${defs}</defs>${s}`);
}

/* Envelope front */
{
    const defs =
        linear('lq', [0, 0, 1, 0], [[0, '#1B0A10'], [0.25, '#0E090D'], [0.7, '#0B080C'], [1, '#1A0A10']]) +
        linear('lqv', [0, 0, 0, 1], [[0, '#000', 0], [0.7, C.maroon, 0], [1, C.maroon, 0.9]]) +
        linear('sh', [0, 0, 1, 1], [[0, '#fff', 0], [0.3, '#fff', 0], [0.36, '#fff', 0.07], [0.42, '#fff', 0], [1, '#fff', 0]]);
    let s = '';
    s += `<polygon points="${pts(FRONT)}" fill="url(#lq)"/>`;
    s += `<polygon points="${pts(FRONT)}" fill="url(#lqv)"/>`;
    s += `<polygon points="${pts(FRONT)}" fill="url(#sh)"/>`;
    s += `<line x1="${EX0 + 2}" y1="262" x2="${EX0 + 22}" y2="262" stroke="#000" stroke-width="1"/><line x1="${EX0 + 2}" y1="263" x2="${EX0 + 22}" y2="263" stroke="#3A1A22" stroke-width="0.6"/>`;
    s += `<line x1="${EX1 - 22}" y1="262" x2="${EX1 - 2}" y2="262" stroke="#000" stroke-width="1"/><line x1="${EX1 - 22}" y1="263" x2="${EX1 - 2}" y2="263" stroke="#3A1A22" stroke-width="0.6"/>`;
    const ins = [[EX0 + 7, MOUTH + 6], [EX1 - 7, MOUTH + 6], [EX1 - 7, EY1 - 16], [EX1 - 16, EY1 - 7], [EX0 + 16, EY1 - 7], [EX0 + 7, EY1 - 16]];
    s += `<polygon points="${pts(ins)}" fill="none" stroke="${C.gold}" stroke-width="0.7" opacity="0.35"/>`;
    for (const t of TRACES.slice(0, 8)) s += pl(t.map(([x, y]) => [x + (x < 180 ? -4 : 4), y + 4]), `stroke="${C.red}" stroke-width="0.8" opacity="0.45"`);
    for (const t of TRACES) s += pl(t, `stroke="${C.gold}" stroke-width="1.1" opacity="0.62"`);
    for (const [x, y] of NODES) s += `<circle cx="${x}" cy="${y}" r="2.4" fill="#0A0A0F" stroke="${C.gold}" stroke-width="1.1"/>`;
    // dock under the flap: revealed when it opens
    s += `<polygon points="${pts(hex(180, 228, 26))}" fill="#07070A" stroke="${C.red}" stroke-width="0.9" opacity="0.8"/>`;
    s += `<polygon points="${pts(hex(180, 228, 18, -60))}" fill="none" stroke="${C.cyan}" stroke-width="0.8" stroke-dasharray="4 3" opacity="0.55"/>`;
    s += `<circle cx="180" cy="228" r="4" fill="none" stroke="${C.gold}" stroke-width="1" opacity="0.7"/>`;
    s += pl([[180, 254], [180, 280]], `stroke="${C.gold}" stroke-width="1.1" opacity="0.62"`);
    s += pl([[180, 202], [180, 172]], `stroke="${C.gold}" stroke-width="1.1" opacity="0.5"`);
    s += pl([[160, 214], [150, 204], [150, 174]], `stroke="${C.red}" stroke-width="0.9" opacity="0.5"`);
    s += pl([[200, 214], [210, 204], [210, 174]], `stroke="${C.red}" stroke-width="0.9" opacity="0.5"`);
    for (const [x, y] of [[150, 174], [210, 174], [180, 172]]) s += `<circle cx="${x}" cy="${y}" r="2" fill="#0A0A0F" stroke="${C.gold}" stroke-width="0.9" opacity="0.8"/>`;
    for (const [x, y, rr] of BLOSSOMS) {
        s += `<polygon points="${pts(hex(x, y, rr * 1.35))}" fill="#0A0A0F" stroke="${C.red}" stroke-width="0.9" opacity="0.9"/>`;
        s += blossom(x, y, rr, { stroke: C.gold, fill: C.gold, fillOp: 0.25, sw: rr > 10 ? 1.4 : 1.1, core: C.hot });
    }
    // one small lit notch on each edge
    s += `<rect x="${EX0 + 2.5}" y="277" width="5" height="1.8" fill="${C.cyan}" opacity="0.75"/>`;
    s += `<rect x="${EX1 - 7.5}" y="277" width="5" height="1.8" fill="${C.cyan}" opacity="0.75"/>`;
    // mecha clamps on the sides
    for (const [y0, h] of [[196, 30], [326, 22]]) {
        for (const side of [-1, 1]) {
            const xe = side < 0 ? EX0 : EX1;
            const o = side * 4;
            const q = [[xe, y0], [xe + o, y0 + 4], [xe + o, y0 + h - 4], [xe, y0 + h]];
            s += `<polygon points="${pts(q)}" fill="#1A0B10" stroke="${C.red}" stroke-width="1" stroke-linejoin="round"/>`;
            s += `<line x1="${f(xe + o * 0.5)}" y1="${y0 + 7}" x2="${f(xe + o * 0.5)}" y2="${y0 + h - 7}" stroke="${C.cyan}" stroke-width="1.1" opacity="0.85"/>`;
        }
    }
    s += `<polygon points="${pts(FRONT)}" fill="none" stroke="${C.red}" stroke-width="1.8" stroke-linejoin="round"/>`;
    s += `<polygon points="${pts(FRONT)}" fill="none" stroke="#FFD6CC" stroke-width="0.55" stroke-linejoin="round" opacity="0.85"/>`;
    s += `<line x1="${EX0}" y1="${MOUTH}" x2="${EX1}" y2="${MOUTH}" stroke="${C.red}" stroke-width="1.8"/>`;
    svg('env-front', [EX0 - 5, MOUTH - 1, EX1 - EX0 + 10, EY1 - MOUTH + 2], `<defs>${defs}</defs>${s}`);
}

/* Front glow (screen, blurred) */
{
    const box = [EX0 - 16, MOUTH - 16, EX1 - EX0 + 32, EY1 - MOUTH + 32];
    let s = `<defs>${blurDef('g1', 5, box)}${blurDef('g2', 2, box)}</defs>`;
    s += `<polygon points="${pts(FRONT)}" fill="none" stroke="${C.red}" stroke-width="5" filter="url(#g1)"/>`;
    s += `<g filter="url(#g2)" opacity="0.45">`;
    for (const t of TRACES) s += pl(t, `stroke="${C.gold}" stroke-width="2.2"`);
    for (const [x, y, rr] of BLOSSOMS) s += `<circle cx="${x}" cy="${y}" r="${rr * 0.9}" fill="${C.gold}" opacity="0.6"/>`;
    s += `</g>`;
    svg('front-glow', box, s);
}

/* Trace pulses (screen) */
for (const [name, set, col] of [['pulse-a', PULSE_A, C.gold], ['pulse-b', PULSE_B, C.red]]) {
    const ts = set.map(i => TRACES[i]);
    let minX = 999, minY = 999, maxX = 0, maxY = 0;
    for (const t of ts) for (const [x, y] of t) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    const box = [Math.floor(minX - 12), Math.floor(minY - 12), Math.ceil(maxX - minX + 24), Math.ceil(maxY - minY + 24)];
    let s = `<defs>${blurDef('p', 3.2, box)}</defs><g filter="url(#p)">`;
    for (const t of ts) s += pl(t, `stroke="${col}" stroke-width="4"`);
    s += `</g>`;
    for (const t of ts) s += pl(t, `stroke="${C.hot}" stroke-width="1" opacity="0.9"`);
    svg(name, box, s);
}

/* Flap (closed) */
{
    const box = [97, 142, 166, 114];
    const defs = blurDef('fh', 3.5, box) +
        linear('fl', [0, 0, 0, 1], [[0, '#1E0B12'], [1, '#120810']]) +
        linear('fsh', [0, 0, 1, 0.6], [[0, '#fff', 0], [0.55, '#fff', 0], [0.62, '#fff', 0.08], [0.7, '#fff', 0], [1, '#fff', 0]]);
    let s = '';
    s += `<polygon points="${pts(FLAP)}" fill="none" stroke="${C.red}" stroke-width="4" stroke-linejoin="round" filter="url(#fh)" opacity="0.9"/>`;
    s += `<polygon points="${pts(FLAP)}" fill="url(#fl)"/>`;
    s += `<polygon points="${pts(FLAP)}" fill="url(#fsh)"/>`;
    s += `<polyline points="${pts([[114, 158], [114, 170], [170, 234]])}" fill="none" stroke="${C.gold}" stroke-width="0.8" opacity="0.5"/>`;
    s += `<polyline points="${pts([[246, 158], [246, 170], [190, 234]])}" fill="none" stroke="${C.gold}" stroke-width="0.8" opacity="0.5"/>`;
    s += pl([[128, 156], [150, 156], [160, 166], [160, 200]], `stroke="${C.gold}" stroke-width="1.2" opacity="0.9"`);
    s += pl([[232, 156], [210, 156], [200, 166], [200, 200]], `stroke="${C.gold}" stroke-width="1.2" opacity="0.9"`);
    s += pl([[180, 154], [180, 198]], `stroke="${C.gold}" stroke-width="1.2" opacity="0.9"`);
    s += pl([[140, 162], [140, 176], [152, 188]], `stroke="${C.red}" stroke-width="0.8" opacity="0.6"`);
    s += pl([[220, 162], [220, 176], [208, 188]], `stroke="${C.red}" stroke-width="0.8" opacity="0.6"`);
    for (const [x, y] of [[128, 156], [232, 156], [180, 154]]) s += `<circle cx="${x}" cy="${y}" r="2.2" fill="#0A0A0F" stroke="${C.gold}" stroke-width="1"/>`;
    s += `<polygon points="${pts(hex(180, 240, 30))}" fill="#08080C" stroke="${C.red}" stroke-width="1" opacity="0.95"/>`;
    s += `<polygon points="${pts(FLAP)}" fill="none" stroke="${C.red}" stroke-width="1.8" stroke-linejoin="round"/>`;
    s += `<polygon points="${pts(FLAP)}" fill="none" stroke="#FFD6CC" stroke-width="0.55" stroke-linejoin="round" opacity="0.85"/>`;
    svg('flap', box, `<defs>${defs}</defs>${s}`);
}

/* Mouth light (screen) */
{
    const box = [96, 146, 168, 22];
    const defs = blurDef('mb', 3, box) + linear('ml', [0, 0, 1, 0], [[0, C.red, 0], [0.12, C.red, 1], [0.5, C.gold, 1], [0.88, C.red, 1], [1, C.red, 0]]) +
        linear('mc', [0, 0, 1, 0], [[0, C.hot, 0], [0.15, C.hot, 1], [0.85, C.hot, 1], [1, C.hot, 0]]);
    svg('mouth', box, `<defs>${defs}</defs>` +
        `<rect x="104" y="153" width="152" height="8" fill="url(#ml)" filter="url(#mb)"/>` +
        `<rect x="106" y="155.6" width="148" height="2.6" fill="url(#ml)"/>` +
        `<rect x="110" y="156.3" width="140" height="1.2" fill="url(#mc)"/>`);
}

/* Hex seal */
{
    const [cx, cy] = SEAL;
    const glowStroke = (p, col, w) =>
        `<polygon points="${pts(p)}" fill="none" stroke="${col}" stroke-width="${w * 4}" stroke-opacity="0.1" stroke-linejoin="round"/>` +
        `<polygon points="${pts(p)}" fill="none" stroke="${col}" stroke-width="${w * 2.2}" stroke-opacity="0.25" stroke-linejoin="round"/>` +
        `<polygon points="${pts(p)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round"/>`;
    let s = `<defs>${linear('ho', [0, 0, 1, 1], [[0, C.cyan, 0.22], [0.5, C.mag, 0.1], [1, C.cyan, 0.22]])}</defs>`;
    s += `<polygon points="${pts(hex(cx, cy, 30))}" fill="url(#ho)"/>`;
    s += glowStroke(hex(cx, cy, 30), C.cyan, 1.3);
    s += `<circle cx="${cx}" cy="${cy}" r="35" fill="none" stroke="${C.cyan}" stroke-width="1.2" stroke-dasharray="10 5 2 5" opacity="0.75"/>`;
    for (const [x, y] of hex(cx, cy, 30)) s += `<rect x="${f(x - 2)}" y="${f(y - 2)}" width="4" height="4" fill="${C.gold}" transform="rotate(45 ${f(x)} ${f(y)})"/>`;
    svg('seal-outer', [cx - 38, cy - 38, 76, 76], s);
    s = '';
    s += `<polygon points="${pts(hex(cx, cy, 21, -60))}" fill="#0A0A0F" fill-opacity="0.85"/>`;
    s += glowStroke(hex(cx, cy, 21, -60), C.gold, 1.3);
    s += `<circle cx="${cx}" cy="${cy}" r="16" fill="none" stroke="${C.gold}" stroke-width="1" stroke-dasharray="6 3" opacity="0.8"/>`;
    for (let k = 0; k < 6; k++) {
        const t = ((-60 + 60 * k + 30) * Math.PI) / 180;
        s += `<line x1="${f(cx + Math.cos(t) * 17)}" y1="${f(cy + Math.sin(t) * 17)}" x2="${f(cx + Math.cos(t) * 21)}" y2="${f(cy + Math.sin(t) * 21)}" stroke="${C.mag}" stroke-width="1.4"/>`;
    }
    svg('seal-inner', [cx - 26, cy - 26, 52, 52], s);
    s = `<defs>${radial('co', [[0, '#FF8A5C', 1], [0.6, C.red, 1], [1, '#9A0F3A', 1]])}${radial('cg', [[0, C.red, 0.5], [1, C.red, 0]])}</defs>`;
    s += `<circle cx="${cx}" cy="${cy}" r="16" fill="url(#cg)"/>`;
    s += `<polygon points="${pts(hex(cx, cy, 11.5))}" fill="url(#co)" stroke="${C.hot}" stroke-width="0.8"/>`;
    s += blossom(cx, cy, 8.5, { stroke: C.hot, fill: C.hot, fillOp: 0.35, sw: 0.9, core: C.hot });
    svg('seal-core', [cx - 17, cy - 17, 34, 34], s);
}

/* Scan ring (screen) */
{
    const [cx, cy] = SEAL;
    svg('scan', [cx - 62, cy - 62, 124, 124],
        `<circle cx="${cx}" cy="${cy}" r="55" fill="none" stroke="${C.cyan}" stroke-width="7" stroke-opacity="0.12"/>` +
        `<circle cx="${cx}" cy="${cy}" r="55" fill="none" stroke="${C.cyan}" stroke-width="3" stroke-opacity="0.3"/>` +
        `<circle cx="${cx}" cy="${cy}" r="55" fill="none" stroke="#DFFBFF" stroke-width="1.1"/>` +
        `<circle cx="${cx}" cy="${cy}" r="59" fill="none" stroke="${C.cyan}" stroke-width="0.9" stroke-dasharray="2 6" opacity="0.7"/>`);
}

/* Flare: anamorphic streak (screen) */
{
    const box = [-20, 80, 400, 40];
    const defs = linear('fs', [0, 0, 1, 0], [[0, C.cyan, 0], [0.3, C.cyan, 0.5], [0.5, C.hot, 1], [0.7, C.cyan, 0.5], [1, C.cyan, 0]]) +
        radial('fr', [[0, C.cyan, 0.45], [1, C.cyan, 0]]) + radial('fc', [[0, C.hot, 0.9], [0.3, C.cyan, 0.4], [1, C.cyan, 0]]);
    svg('flare', box, `<defs>${defs}</defs>` +
        `<ellipse cx="180" cy="100" rx="200" ry="9" fill="url(#fr)"/>` +
        `<rect x="-20" y="99.2" width="400" height="1.6" fill="url(#fs)"/>` +
        `<ellipse cx="180" cy="100" rx="22" ry="14" fill="url(#fc)"/>`);
}

/* Particles */
svg('blossom', [170, 136, 20, 20],
    `<defs>${radial('bg', [[0, C.gold, 0.45], [1, C.gold, 0]])}</defs><circle cx="180" cy="146" r="10" fill="url(#bg)"/>` +
    blossom(180, 146, 7.5, { stroke: '#FFE2A0', fill: C.gold, fillOp: 0.55, sw: 0.9, core: C.hot, dots: false }));
svg('pixel', [172, 232, 16, 16],
    `<rect x="174" y="234" width="12" height="12" fill="${C.cyan}" opacity="0.18"/>` +
    `<rect x="176.5" y="236.5" width="7" height="7" fill="${C.cyan}" opacity="0.4"/>` +
    `<rect x="178" y="238" width="4" height="4" fill="#E8FDFF"/>`);

console.log(JSON.stringify(BOX));
