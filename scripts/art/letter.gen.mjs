// Generator for the "letter" wrapper art (a cream envelope sealed with a wax heart).
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box).
// Run: node scripts/art/letter.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'letter');
if (!OUT.endsWith('wrappers/letter')) throw new Error('out dir must be public/wrappers/letter');
mkdirSync(OUT, { recursive: true });
for (const n of readdirSync(OUT)) if (n.endsWith('.svg')) unlinkSync(join(OUT, n));

const C = {
    night: '#0D0709', wine: '#2A0F18', plum: '#4A1624',
    cream: '#EFE3CC', creamHi: '#F8F0E0', creamLo: '#D9C8AB', card: '#FBF6EC',
    shade: '#5A3A36', rose: '#C58E8E', roseDeep: '#9A5C63',
    wax: '#9E1629', waxHi: '#C7293B', waxLo: '#5E0A17', waxDark: '#3D050E',
    gold: '#C9A25E', goldHi: '#E8CB8E', amber: '#FFB877', candle: '#FFD9A6',
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
    if (s.length > 60000) throw new Error(`${name}.svg is ${s.length} bytes`);
    writeFileSync(join(OUT, `${name}.svg`), s);
}
const blurDef = (id, sd, box) =>
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const radial = (id, stops, extra = '') =>
    `<radialGradient id="${id}"${extra}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
const linear = (id, [x1, y1, x2, y2], stops, extra = '') =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;

/** A closed paper outline: corners rounded by `rad[i]`, edges given a slight deckle. */
function paper(poly, rad, rnd, jitter = 0.35, stepLen = 9) {
    const n = poly.length;
    let d = '';
    for (let i = 0; i < n; i++) {
        const p0 = poly[(i + n - 1) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
        const r1 = typeof rad === 'number' ? rad : rad[i];
        const r2 = typeof rad === 'number' ? rad : rad[(i + 1) % n];
        const l01 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        const l12 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const a = [p1[0] + ((p0[0] - p1[0]) / l01) * r1, p1[1] + ((p0[1] - p1[1]) / l01) * r1];
        const b = [p1[0] + ((p2[0] - p1[0]) / l12) * r1, p1[1] + ((p2[1] - p1[1]) / l12) * r1];
        d += i === 0 ? `M${f(a[0])} ${f(a[1])}` : `L${f(a[0])} ${f(a[1])}`;
        d += `Q${f(p1[0])} ${f(p1[1])} ${f(b[0])} ${f(b[1])}`;
        // deckle along the edge p1 -> p2
        const ux = (p2[0] - p1[0]) / l12, uy = (p2[1] - p1[1]) / l12;
        const len = l12 - r1 - r2;
        const k = Math.max(1, Math.floor(len / stepLen));
        for (let j = 1; j < k; j++) {
            const t = r1 + (len * j) / k;
            const o = (rnd() - 0.5) * 2 * jitter;
            d += `L${f(p1[0] + ux * t - uy * o)} ${f(p1[1] + uy * t + ux * o)}`;
        }
    }
    return d + 'Z';
}

/** Paper grain: short pale-brown fibres and a few light flecks inside a rectangle. */
function grain(rnd, [x, y, w, h], count, k = 1) {
    let s = '';
    for (let i = 0; i < count; i++) {
        const px = x + rnd() * w, py = y + rnd() * h;
        const a = rnd() * Math.PI, len = 0.8 + rnd() * 2.4;
        const light = rnd() < 0.3;
        s += `<line x1="${f(px)}" y1="${f(py)}" x2="${f(px + Math.cos(a) * len)}" y2="${f(py + Math.sin(a) * len)}" stroke="${light ? '#FFFFFF' : '#7A5A44'}" stroke-width="${f(0.3 + rnd() * 0.25)}" stroke-opacity="${f((light ? 0.3 : 0.05 + rnd() * 0.07) * k)}" stroke-linecap="round"/>`;
    }
    return s;
}

/* Geometry (canvas units). The envelope is seen from the back: hinge at the top. */
const EX0 = 42, EX1 = 318, EY0 = 176, EY1 = 348;
const DEPTH = 100;              // flap depth
const TIP = EY0 + DEPTH;        // closed flap tip
const VY = TIP - 18;            // bottom of the front's V notch
const SEAL = [180, 263];
const CX0 = 66, CX1 = 294, CY0 = 188, CY1 = 338; // card, at rest inside
const SETTLE = 20, RISE = -50;  // must match letter.ts

const FRONT = [[EX0, EY0], [180, VY], [EX1, EY0], [EX1, EY1], [EX0, EY1]];
const FLAP = [[EX0, EY0], [EX1, EY0], [180, TIP]];
const FLAPB = [[EX0, EY0], [180, EY0 - DEPTH], [EX1, EY0]];

/* Room: wine-black wall, a candle's warmth from the upper left, an aura behind the letter */
{
    const box = [-6, -6, 372, 462];
    const defs =
        linear('wall', [0, 0, 0, 1], [[0, '#0A0507'], [0.4, '#1B0B11'], [0.78, '#2B0F19'], [1, '#160910']]) +
        radial('candle', [[0, C.amber, 0.27], [0.45, '#C4553E', 0.08], [1, '#C4553E', 0]]) +
        radial('aura', [[0, '#8E2A3E', 0.42], [0.55, '#5E1A2A', 0.16], [1, '#5E1A2A', 0]]) +
        linear('panel', [0, 0, 1, 0], [[0, '#FFFFFF', 0], [0.5, '#FFD9C0', 0.05], [1, '#FFFFFF', 0]]);
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="url(#wall)"/>`;
    s += `<ellipse cx="40" cy="70" rx="230" ry="210" fill="url(#candle)"/>`;
    s += `<ellipse cx="180" cy="262" rx="215" ry="190" fill="url(#aura)"/>`;
    // the faintest wall moulding: two tall soft bands and a rail
    s += `<rect x="60" y="-6" width="1" height="400" fill="#000000" opacity="0.22"/><rect x="61" y="-6" width="0.8" height="400" fill="#FFD9C0" opacity="0.04"/>`;
    s += `<rect x="299" y="-6" width="1" height="400" fill="#000000" opacity="0.22"/><rect x="300" y="-6" width="0.8" height="400" fill="#FFD9C0" opacity="0.04"/>`;
    s += `<rect x="62" y="-6" width="236" height="400" fill="url(#panel)" opacity="0.5"/>`;
    svg('room', box, `<defs>${defs}</defs>${s}`);
}

/* Bokeh, far: small out-of-focus candle points (screen) */
function bokehDefs() {
    return [['A', C.amber], ['C', C.candle], ['R', '#E8848A'], ['G', C.goldHi]]
        .map(([k, c]) => radial(`b${k}`, [[0, c, 0.5], [0.7, c, 0.56], [0.86, c, 0.7], [1, c, 0]])).join('');
}
{
    const r = rng(1402);
    const spots = [
        [34, 58, 9, 'A', 0.5], [78, 118, 5, 'C', 0.55], [22, 168, 6.5, 'R', 0.4], [112, 40, 4, 'G', 0.5],
        [318, 74, 8, 'A', 0.42], [276, 34, 4.5, 'C', 0.5], [338, 150, 5.5, 'G', 0.4], [232, 92, 3.5, 'R', 0.42],
        [150, 96, 3, 'C', 0.4], [20, 300, 5, 'A', 0.3], [344, 286, 6, 'R', 0.3], [196, 30, 5.5, 'A', 0.36],
        [58, 228, 3.5, 'G', 0.34], [304, 216, 3.5, 'C', 0.34],
        [96, 76, 13, 'R', 0.22], [262, 128, 12, 'A', 0.24], [40, 122, 15, 'G', 0.16], [330, 30, 12, 'C', 0.2],
        [170, 132, 7, 'A', 0.3], [214, 60, 8.5, 'G', 0.26], [132, 150, 4.5, 'R', 0.34], [286, 168, 6, 'A', 0.3],
        [14, 236, 10, 'A', 0.3], [346, 232, 9, 'C', 0.28], [28, 356, 7, 'G', 0.3], [336, 352, 8.5, 'A', 0.3],
        [70, 20, 6, 'C', 0.4], [244, 16, 5, 'A', 0.42], [352, 110, 11, 'R', 0.2], [6, 96, 6, 'C', 0.36],
        [120, 108, 9, 'A', 0.24], [300, 120, 4, 'G', 0.44], [20, 376, 4, 'C', 0.4], [344, 380, 3.5, 'A', 0.42],
    ];
    let s = '';
    for (const [x, y, rr, k, op] of spots) s += `<circle cx="${x}" cy="${y}" r="${f(rr * (0.9 + r() * 0.3))}" fill="url(#b${k})" opacity="${op}"/>`;
    svg('bokeh-far', [-10, -10, 380, 400], `<defs>${bokehDefs()}</defs>${s}`);
}

/* Table: the faint edge of a dark table, catching a little candlelight */
{
    const box = [-6, 384, 372, 72];
    const defs =
        linear('top', [0, 0, 0, 1], [[0, '#3A141C'], [0.3, '#1E0C11'], [1, '#0A0506']]) +
        linear('edge', [0, 0, 1, 0], [[0, C.amber, 0.1], [0.2, C.amber, 0.75], [0.5, C.candle, 0.45], [0.8, '#E8848A', 0.55], [1, '#E8848A', 0.1]]) +
        radial('refl', [[0, '#E9D9BE', 0.2], [1, '#E9D9BE', 0]]) +
        radial('reflA', [[0, C.amber, 0.42], [1, C.amber, 0]]);
    let s = `<rect x="-6" y="392" width="372" height="64" fill="url(#top)"/>`;
    s += `<rect x="-6" y="392" width="372" height="1" fill="url(#edge)"/>`;
    s += `<rect x="-6" y="393" width="372" height="5" fill="url(#edge)" opacity="0.12"/>`;
    s += `<ellipse cx="180" cy="398" rx="130" ry="9" fill="url(#refl)"/>`;
    s += `<ellipse cx="36" cy="400" rx="46" ry="6" fill="url(#reflA)"/>`;
    s += `<ellipse cx="320" cy="402" rx="40" ry="5" fill="url(#reflA)" opacity="0.6"/>`;
    svg('table', box, `<defs>${defs}</defs>${s}`);
}

/* Vignette */
svg('vignette', [-6, -6, 372, 462],
    `<defs>${radial('v', [[0, '#000000', 0], [0.55, '#000000', 0], [0.82, '#050203', 0.5], [1, '#050203', 0.86]], ' cx="0.5" cy="0.56" r="0.72"')}</defs>` +
    `<rect x="-6" y="-6" width="372" height="462" fill="url(#v)"/>`);

/* Shadow: a soft pool on the table and a darker halo behind the paper */
{
    const box = [10, 150, 340, 290];
    const defs = blurDef('sb', 12, box) + blurDef('sp', 5, box);
    svg('shadow', box, `<defs>${defs}</defs>` +
        `<rect x="${EX0 + 4}" y="${EY0 + 14}" width="${EX1 - EX0 - 8}" height="${EY1 - EY0}" rx="6" fill="#080305" opacity="0.6" filter="url(#sb)"/>` +
        `<ellipse cx="180" cy="408" rx="112" ry="6" fill="#030102" opacity="0.75" filter="url(#sp)"/>`);
}

/* Liner pattern: plain antique-gold pinstripes on wine */
function linerStripes(x0, y0, x1, y1, gap = 7) {
    let s = '';
    for (let c = x0 - (y1 - y0); c < x1 + (y1 - y0); c += gap) {
        s += `<line x1="${f(c)}" y1="${y0}" x2="${f(c + (y1 - y0))}" y2="${y1}" stroke="${C.gold}" stroke-width="0.7" stroke-opacity="0.5"/>`;
        s += `<line x1="${f(c + gap / 2)}" y1="${y1}" x2="${f(c + gap / 2 + (y1 - y0))}" y2="${y0}" stroke="${C.goldHi}" stroke-width="0.4" stroke-opacity="0.28"/>`;
    }
    return s;
}

/* Envelope back: the lined inside, seen through the open mouth */
{
    const box = [EX0, EY0, EX1 - EX0, EY1 - EY0];
    const defs =
        linear('in', [0, 0, 0, 1], [[0, '#5B1828'], [0.5, '#3E0F1B'], [1, '#2A0A12']]) +
        linear('dark', [0, 0, 0, 1], [[0, '#000000', 0.1], [0.3, '#000000', 0.38], [1, '#000000', 0.6]]) +
        `<clipPath id="bc"><rect x="${EX0 + 1.5}" y="${EY0 + 1}" width="${EX1 - EX0 - 3}" height="${EY1 - EY0 - 3}" rx="3"/></clipPath>`;
    let s = `<g clip-path="url(#bc)"><rect x="${EX0}" y="${EY0}" width="${EX1 - EX0}" height="${EY1 - EY0}" fill="url(#in)"/>`;
    s += linerStripes(EX0, EY0, EX1, EY0 + 110);
    s += `<rect x="${EX0}" y="${EY0}" width="${EX1 - EX0}" height="${EY1 - EY0}" fill="url(#dark)"/></g>`;
    svg('env-back', box, `<defs>${defs}</defs>${s}`);
}

/* Flap, opened: its lined inside face, standing above the hinge */
{
    const box = [EX0 - 4, EY0 - DEPTH - 6, EX1 - EX0 + 8, DEPTH + 8];
    const r = rng(311);
    const outer = paper(FLAPB, [3, 11, 3], r, 0.3);
    const m = 9; // cream margin around the liner
    const LIN = [[EX0 + m * 2.4, EY0 - 1], [180, EY0 - DEPTH + m * 1.55], [EX1 - m * 2.4, EY0 - 1]];
    const lin = paper(LIN, [1, 7, 1], r, 0);
    const defs =
        linear('fb', [0, 1, 0, 0], [[0, '#E2D2B6'], [0.5, C.cream], [1, C.creamHi]]) +
        linear('lin', [0, 1, 0, 0], [[0, '#4A1320'], [1, '#6A1C2E']]) +
        linear('fold', [0, 1, 0, 0], [[0, '#1A0508', 0.5], [0.22, '#1A0508', 0]]) +
        `<clipPath id="fc"><path d="${lin}"/></clipPath><clipPath id="oc"><path d="${outer}"/></clipPath>`;
    let s = `<path d="${outer}" fill="url(#fb)"/>`;
    s += `<g clip-path="url(#oc)">${grain(r, [EX0, EY0 - DEPTH, EX1 - EX0, DEPTH], 70)}</g>`;
    s += `<path d="${lin}" fill="url(#lin)"/>`;
    s += `<g clip-path="url(#fc)">${linerStripes(EX0, EY0 - DEPTH, EX1, EY0)}<rect x="${EX0}" y="${EY0 - DEPTH}" width="${EX1 - EX0}" height="${DEPTH}" fill="url(#fold)"/></g>`;
    s += `<path d="${lin}" fill="none" stroke="${C.goldHi}" stroke-width="0.9" stroke-opacity="0.85"/>`;
    s += `<path d="${outer}" fill="none" stroke="#FFFFFF" stroke-width="0.6" stroke-opacity="0.5"/>`;
    svg('flap-back', box, `<defs>${defs}</defs>${s}`);
}

/* The letter card: blank cream paper, deckle-edged, folded once */
{
    const box = [CX0 - 8, CY0 - 8, CX1 - CX0 + 16, CY1 - CY0 + 16];
    const r = rng(52);
    const shape = paper([[CX0, CY0], [CX1, CY0], [CX1, CY1], [CX0, CY1]], 3, r, 0.75, 4.5);
    const FOLD = CY0 + 46; // one fold across the sheet
    const defs = blurDef('cs', 3, box) + blurDef('fd', 1.4, box) +
        linear('cp', [0, 0, 0.25, 1], [[0, '#FCF6EA'], [0.5, '#F5EBD8'], [1, '#E9DCC3']]) +
        linear('up', [0, 0, 0, 1], [[0, '#FFFFFF', 0.22], [1, '#FFFFFF', 0.04]]) +
        linear('dn', [0, 0, 0, 1], [[0, '#6B4A3C', 0.13], [0.35, '#6B4A3C', 0]]) +
        linear('fx', [0, 0, 1, 0], [[0, '#FFFFFF', 0], [0.08, '#FFFFFF', 1], [0.92, '#FFFFFF', 1], [1, '#FFFFFF', 0]]) +
        `<clipPath id="cc"><path d="${shape}"/></clipPath>`;
    let s = `<path d="${shape}" fill="#1A0609" opacity="0.5" filter="url(#cs)"/>`;
    s += `<path d="${shape}" fill="url(#cp)"/>`;
    s += `<g clip-path="url(#cc)">`;
    // the panel above the fold leans to the light, the one below falls away a little
    s += `<rect x="${CX0}" y="${CY0}" width="${CX1 - CX0}" height="${FOLD - CY0}" fill="url(#up)"/>`;
    s += `<rect x="${CX0}" y="${FOLD}" width="${CX1 - CX0}" height="${CY1 - FOLD}" fill="url(#dn)"/>`;
    s += `<rect x="${CX0}" y="${FOLD - 0.2}" width="${CX1 - CX0}" height="2.4" fill="#6B4A3C" opacity="0.16" filter="url(#fd)"/>`;
    s += `<rect x="${CX0}" y="${FOLD - 0.9}" width="${CX1 - CX0}" height="0.8" fill="url(#fx)" opacity="0.8"/>`;
    s += `<rect x="${CX0}" y="${FOLD - 0.1}" width="${CX1 - CX0}" height="0.5" fill="#8A6A58" opacity="0.28"/>`;
    s += grain(r, [CX0, CY0, CX1 - CX0, CY1 - CY0], 130, 0.8);
    s += `</g>`;
    s += `<path d="${shape}" fill="none" stroke="#FFFFFF" stroke-width="0.7" stroke-opacity="0.75"/>`;
    s += `<path d="${shape}" fill="none" stroke="#8A6A58" stroke-width="0.35" stroke-opacity="0.3"/>`;
    svg('card', box, `<defs>${defs}</defs>${s}`);
}

/* Pop-up hearts: two paper hearts on short tabs that fold up from the card's fold line */
function heartOutline(n, scale) {
    const a = [];
    for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        a.push([16 * Math.sin(t) ** 3 * scale, (-(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 2.5) * scale]);
    }
    return a;
}
function popHeart(name, box, hx, hy, k, tilt, seed, c0, c1, edge) {
    const r = rng(seed);
    const baseY = CY0 + 46 + RISE; // the fold line once the card has settled
    const d = 'M' + heartOutline(84, k).map(([x, y]) => `${f(hx + x)} ${f(hy + y)}`).join('L') + 'Z';
    const tipY = hy + 14.5 * k;
    const tab = [[hx - 3.2, tipY - 5], [hx + 3.2, tipY - 5], [hx + 4.2, baseY], [hx - 4.2, baseY]];
    const defs = blurDef('hs', 2.6, box) +
        linear('hp', [0.1, 0, 0.8, 1], [[0, c0], [1, c1]]) +
        linear('hl', [0, 0, 1, 0], [[0, '#FFFFFF', 0.1], [0.5, '#FFFFFF', 0.02], [0.5, '#000000', 0.07], [1, '#000000', 0]]) +
        linear('tb', [0, 0, 0, 1], [[0, '#E6D7BC'], [1, '#F6ECDA']]) +
        `<clipPath id="hc"><path d="${d}"/></clipPath>`;
    let s = `<g transform="rotate(${tilt} ${f(hx)} ${f(baseY)})">`;
    // soft shadows on the card
    s += `<g filter="url(#hs)" opacity="0.34"><path d="${d}" transform="translate(3 4)" fill="#3A1418"/><polygon points="${pts(tab.map(([x, y]) => [x + 2.5, y + 1.5]))}" fill="#3A1418"/></g>`;
    // the tab: a strip of the card's own paper
    s += `<polygon points="${pts(tab)}" fill="url(#tb)"/>`;
    s += `<polygon points="${pts(tab)}" fill="none" stroke="#8A6A58" stroke-width="0.35" stroke-opacity="0.45"/>`;
    // the heart: flat paper, a soft grain, a centre crease, a thin lighter edge
    s += `<path d="${d}" fill="url(#hp)"/>`;
    s += `<g clip-path="url(#hc)">${grain(r, [hx - 17 * k, hy - 15 * k, 34 * k, 30 * k], Math.round(26 * k), 0.7)}<rect x="${f(hx - 17 * k)}" y="${f(hy - 15 * k)}" width="${f(34 * k)}" height="${f(30 * k)}" fill="url(#hl)"/></g>`;
    s += `<path d="${d}" fill="none" stroke="${edge}" stroke-width="0.8" stroke-opacity="0.8" stroke-linejoin="round"/>`;
    s += `</g>`;
    svg(name, box, `<defs>${defs}</defs>${s}`);
}
popHeart('heart-b', [172, 126, 62, 66], 199, 152.6, 1.2, 8, 91, '#D2A6A6', '#B58489', '#F0D6D3');
popHeart('heart-a', [120, 106, 90, 86], 166, 147, 2, -6, 92, '#7E1C2E', '#5C1120', '#B4586A');

/* Card glow: the soft light on the card's face once it is out (screen) */
{
    const box = [20, 60, 320, 250];
    svg('card-glow', box,
        `<defs>${radial('cg', [[0, '#FFE9C8', 0.5], [0.4, '#FFC9A0', 0.2], [1, '#E88A8A', 0]])}</defs>` +
        `<ellipse cx="180" cy="${CY0 + RISE + 50}" rx="160" ry="118" fill="url(#cg)"/>`);
}

/* Envelope front: side and bottom flaps meeting in an X, with the V mouth */
{
    const box = [EX0 - 6, EY0 - 12, EX1 - EX0 + 12, EY1 - EY0 + 20];
    const r = rng(77);
    const shape = paper(FRONT, [2, 9, 2, 5, 5], r, 0.35);
    const defs = blurDef('ms', 4, box) + blurDef('ss', 1.6, box) +
        linear('fp', [0, 0, 0.35, 1], [[0, C.creamHi], [0.45, C.cream], [1, C.creamLo]]) +
        linear('bot', [0, 0, 0, 1], [[0, '#FFFFFF', 0.16], [1, '#FFFFFF', 0]]) +
        radial('warm', [[0, '#C98A7A', 0], [0.7, '#C98A7A', 0], [1, '#A8645C', 0.22]], ' cx="0.5" cy="0.5" r="0.75"') +
        `<clipPath id="fc"><path d="${shape}"/></clipPath>`;
    let s = '';
    // the mouth's shadow on whatever is inside
    s += `<polyline points="${pts([[EX0 + 4, EY0 + 2], [180, VY + 2], [EX1 - 4, EY0 + 2]])}" fill="none" stroke="#12040A" stroke-width="7" stroke-opacity="0.5" stroke-linejoin="round" filter="url(#ms)"/>`;
    s += `<path d="${shape}" fill="url(#fp)"/>`;
    s += `<g clip-path="url(#fc)">`;
    // bottom flap: a slightly lighter triangle whose seams run from the lower corners to the centre
    const apex = [180, VY + 7];
    s += `<polygon points="${pts([[EX0, EY1], apex, [EX1, EY1]])}" fill="url(#bot)"/>`;
    for (const cx of [EX0, EX1]) {
        s += `<line x1="${cx}" y1="${EY1}" x2="${apex[0]}" y2="${apex[1]}" stroke="${C.shade}" stroke-width="3" stroke-opacity="0.2" filter="url(#ss)"/>`;
        s += `<line x1="${cx}" y1="${EY1}" x2="${apex[0]}" y2="${apex[1]}" stroke="${C.shade}" stroke-width="0.6" stroke-opacity="0.4"/>`;
        s += `<line x1="${cx}" y1="${EY1 - 1.1}" x2="${apex[0]}" y2="${apex[1] - 1.1}" stroke="#FFFFFF" stroke-width="0.6" stroke-opacity="0.55"/>`;
    }
    s += grain(r, [EX0, EY0, EX1 - EX0, EY1 - EY0], 230);
    s += `<rect x="${EX0}" y="${EY0}" width="${EX1 - EX0}" height="${EY1 - EY0}" fill="url(#warm)"/>`;
    s += `</g>`;
    // lit edge along the mouth, soft shade at the foot
    s += `<polyline points="${pts([[EX0 + 2, EY0 + 1.2], [176, VY - 1.6], [180, VY + 0.6], [184, VY - 1.6], [EX1 - 2, EY0 + 1.2]])}" fill="none" stroke="#FFFFFF" stroke-width="0.9" stroke-opacity="0.75" stroke-linejoin="round"/>`;
    s += `<path d="${shape}" fill="none" stroke="#8A6A58" stroke-width="0.5" stroke-opacity="0.35"/>`;
    svg('env-front', box, `<defs>${defs}</defs>${s}`);
}

/* Flap, closed: the top face, with the shadow it lays on the front */
{
    const box = [EX0 - 8, EY0 - 6, EX1 - EX0 + 16, DEPTH + 26];
    const r = rng(19);
    const shape = paper(FLAP, [3, 3, 12], r, 0.3);
    const defs = blurDef('fs', 4.5, box) +
        linear('fl', [0, 0, 0, 1], [[0, '#FBF4E6'], [0.55, '#F1E6D1'], [1, '#E6D7BC']]) +
        linear('crease', [0, 0, 0, 1], [[0, '#FFFFFF', 0.5], [0.05, '#FFFFFF', 0]]) +
        `<clipPath id="pc"><path d="${shape}"/></clipPath>`;
    let s = `<path d="${shape}" transform="translate(0 4.5)" fill="#3A1A1C" opacity="0.5" filter="url(#fs)"/>`;
    s += `<path d="${shape}" fill="url(#fl)"/>`;
    s += `<g clip-path="url(#pc)">${grain(r, [EX0, EY0, EX1 - EX0, DEPTH], 110)}<rect x="${EX0}" y="${EY0}" width="${EX1 - EX0}" height="${DEPTH}" fill="url(#crease)"/></g>`;
    // a hairline of antique gold just inside the flap's edge
    const g = 7;
    s += `<polyline points="${pts([[EX0 + g * 2.6, EY0 + g * 0.55], [180, TIP - g * 1.6], [EX1 - g * 2.6, EY0 + g * 0.55]])}" fill="none" stroke="${C.gold}" stroke-width="0.7" stroke-opacity="0.6" stroke-linejoin="round"/>`;
    s += `<path d="${shape}" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.7"/>`;
    s += `<path d="${shape}" fill="none" stroke="#8A6A58" stroke-width="0.4" stroke-opacity="0.3"/>`;
    svg('flap', box, `<defs>${defs}</defs>${s}`);
}

/* Sheen: one soft band of candlelight across the paper (screen) */
{
    const box = [EX0, EY0, EX1 - EX0, EY1 - EY0];
    svg('sheen', box,
        `<defs>${linear('sh', [0, 0, 1, 0.75], [[0, C.candle, 0.3], [0.22, C.candle, 0.08], [0.4, '#FFFFFF', 0.16], [0.52, '#FFFFFF', 0], [1, '#FFFFFF', 0]])}</defs>` +
        `<rect x="${EX0 + 2}" y="${EY0 + 2}" width="${EX1 - EX0 - 4}" height="${EY1 - EY0 - 4}" rx="4" fill="url(#sh)"/>`);
}

/* The wax seal: a heart */
const K = 1.74; // heart scale: about 56 units wide
function heartPts(n, scale) {
    const a = [];
    for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 2.5;
        a.push([x * scale, y * scale]);
    }
    return a;
}
function smooth(a, passes) {
    let p = a;
    for (let k = 0; k < passes; k++) {
        p = p.map((_, i) => {
            const q = p[(i + p.length - 1) % p.length], c = p[i], n = p[(i + 1) % p.length];
            return [(q[0] + 2 * c[0] + n[0]) / 4, (q[1] + 2 * c[1] + n[1]) / 4];
        });
    }
    return p;
}
const closed = (a, cx, cy) => 'M' + a.map(([x, y]) => `${f(cx + x)} ${f(cy + y)}`).join('L') + 'Z';
{
    const [cx, cy] = SEAL;
    const box = [cx - 42, cy - 40, 84, 84];
    // the stamp's impression: one heart, pressed shallow
    const inner = smooth(heartPts(96, K * 0.74), 2);
    // the pool: wax poured by hand, run a few units past the heart, uneven all the way round
    const pool = smooth(heartPts(140, K * 0.98).map(([x, y]) => {
        const a = Math.atan2(y, x), l = Math.hypot(x, y) || 1;
        const w = 4.4 + 1.9 * Math.sin(2 * a + 0.4) + 1.4 * Math.sin(3 * a + 1.1) + 1.0 * Math.sin(5 * a + 2.3) + 0.6 * Math.sin(7 * a + 0.7);
        return [x + (x / l) * w, y + (y / l) * w];
    }), 10);
    const poolD = closed(pool, cx, cy);
    const innerD = closed(inner, cx, cy + 0.8);
    const defs =
        blurDef('ws', 2.6, box) + blurDef('we', 2.2, box) + blurDef('wi', 1.3, box) + blurDef('wsh', 5, box) +
        linear('wp', [0.1, 0, 0.9, 1], [[0, '#8C1B29'], [0.5, '#76131F'], [1, '#5A0C17']]) +
        linear('rim', [0, 0, 1, 1], [[0, '#E39AA0', 0.3], [0.4, '#E39AA0', 0], [1, '#E39AA0', 0]]) +
        linear('press', [0, 0, 1, 1], [[0, '#560B15'], [0.6, '#6A101C'], [1, '#7A1522']]) +
        linear('lip', [0, 0, 1, 1], [[0, '#C8626C', 0], [0.5, '#C8626C', 0], [1, '#C8626C', 0.42]]) +
        `<clipPath id="pc"><path d="${poolD}"/></clipPath><clipPath id="ic"><path d="${innerD}"/></clipPath>`;
    let s = '';
    s += `<path d="${poolD}" transform="translate(1 3)" fill="#2A0A0C" opacity="0.55" filter="url(#ws)"/>`;
    s += `<path d="${poolD}" fill="url(#wp)"/>`;
    s += `<g clip-path="url(#pc)">`;
    // matte: one broad soft sheen, and the wax darkening as it thins toward its edge
    s += `<ellipse cx="${cx - 13}" cy="${cy - 15}" rx="20" ry="11" transform="rotate(-28 ${cx - 13} ${cy - 15})" fill="#C8626C" opacity="0.26" filter="url(#wsh)"/>`;
    s += `<path d="${poolD}" fill="none" stroke="#33060C" stroke-width="5" stroke-opacity="0.6" filter="url(#we)"/>`;
    s += `</g>`;
    s += `<path d="${poolD}" fill="none" stroke="url(#rim)" stroke-width="1"/>`;
    // the impression: darker floor, a soft shadow under its upper-left wall, a faint lit lip opposite
    s += `<path d="${innerD}" fill="url(#press)"/>`;
    s += `<g clip-path="url(#ic)"><path d="${innerD}" transform="translate(1.3 1.7)" fill="none" stroke="#2A050A" stroke-width="3.4" stroke-opacity="0.55" filter="url(#wi)"/></g>`;
    s += `<path d="${innerD}" fill="none" stroke="url(#lip)" stroke-width="0.9" stroke-linejoin="round"/>`;
    s += `<path d="${innerD}" fill="none" stroke="#2A050A" stroke-width="0.5" stroke-opacity="0.35" stroke-linejoin="round"/>`;
    svg('seal', box, `<defs>${defs}</defs>${s}`);
    // the breath of candlelight on the wax (screen): broad, soft, never a white glint
    svg('seal-shine', box,
        `<defs>${blurDef('gb', 4.5, box)}</defs>` +
        `<ellipse cx="${cx - 14}" cy="${cy - 16}" rx="13" ry="6" transform="rotate(-30 ${cx - 14} ${cy - 16})" fill="#D98088" opacity="0.5" filter="url(#gb)"/>`);
}

/* Rose petals (scatter shapes): petals, not hearts */
function petal(name, box, turn, c0, c1) {
    const [x, y, w, h] = box;
    const cx = x + w / 2, cy = y + h / 2;
    // an asymmetric cupped petal: broad shoulder, narrow base, no cleft
    const d = `M${f(cx - 1)} ${f(cy + 9)}C${f(cx - 8.5)} ${f(cy + 4)} ${f(cx - 9)} ${f(cy - 5)} ${f(cx - 3.5)} ${f(cy - 8.6)}C${f(cx + 0.5)} ${f(cy - 10.4)} ${f(cx + 6.5)} ${f(cy - 8)} ${f(cx + 7.6)} ${f(cy - 2.6)}C${f(cx + 8.4)} ${f(cy + 2.4)} ${f(cx + 4)} ${f(cy + 7)} ${f(cx - 1)} ${f(cy + 9)}Z`;
    svg(name, box,
        `<defs>${linear('pg', [0.1, 0, 0.8, 1], [[0, c0], [0.6, c1], [1, '#7A2F3C']])}${linear('pl', [0, 0, 1, 0.4], [[0, '#FFFFFF', 0.35], [0.5, '#FFFFFF', 0]])}</defs>` +
        `<g transform="rotate(${turn} ${f(cx)} ${f(cy)})"><path d="${d}" fill="url(#pg)"/><path d="${d}" fill="url(#pl)"/>` +
        `<path d="M${f(cx - 0.8)} ${f(cy + 8)}C${f(cx - 2)} ${f(cy + 2)} ${f(cx - 1.4)} ${f(cy - 3)} ${f(cx + 1)} ${f(cy - 6.6)}" fill="none" stroke="#6A2430" stroke-width="0.5" stroke-opacity="0.4" stroke-linecap="round"/></g>`);
}
petal('petal-a', [169, 178, 22, 22], 24, '#D9A2A3', '#B46B76');
petal('petal-b', [170, 170, 20, 20], -52, '#C98990', '#9A4A5A');

/* Bokeh, near: large soft discs at the frame's edges (screen) */
{
    const spots = [[-14, 130, 40, 'A', 0.34], [378, 96, 34, 'R', 0.3], [372, 372, 44, 'A', 0.26], [-4, 420, 30, 'G', 0.26], [120, -22, 26, 'C', 0.2]];
    let s = '';
    for (const [x, y, rr, k, op] of spots) s += `<circle cx="${x}" cy="${y}" r="${rr}" fill="url(#b${k})" opacity="${op}"/>`;
    const defs = [['A', C.amber], ['C', C.candle], ['R', '#E8848A'], ['G', C.goldHi]]
        .map(([k, c]) => radial(`b${k}`, [[0, c, 0.22], [0.78, c, 0.3], [0.92, c, 0.4], [1, c, 0]])).join('');
    svg('bokeh-near', [-60, -50, 480, 540], `<defs>${defs}</defs>${s}`);
}

void SETTLE;
console.log(JSON.stringify(BOX));
