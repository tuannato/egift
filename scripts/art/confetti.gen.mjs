// Generator for the "confetti" wrapper art: a ceiling seen from below, in bold cut paper on a light
// ground. Every piece is one flat colour: large organic fronds and leaves, half-moons, arches, a few
// discs and blocks, in the spirit of mid-century paper cut-outs (genre only). A fine ink net holds a
// heap of them under the ceiling. No outline on the paper, no stripes, no filter; the only gradients
// are the light's alpha stops.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas) and
// prints every layer's box (and, for the planes, the pivot at the focus) for src/wrappers/confetti.ts.
// Run: node scripts/art/confetti.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'confetti');
if (!OUT.endsWith('wrappers/confetti')) throw new Error('out dir must be public/wrappers/confetti');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: ivory ceiling, two sands, ink, and the four paper colours; one light gold for the light. */
const C = {
    ivory: '#F4EEE1',
    sandLo: '#EADFCA',
    sand: '#D9C4A1',
    ink: '#1D1B19',
    mustard: '#D9A230',
    terra: '#C2553A',
    teal: '#1E5A57',
    gold: '#F6CB5C',
};

/** The focus: where the net is knotted and where the light rises. */
const FX = 180, FY = 218;

const f = n => String(Math.round(n * 100) / 100);
const rot = (pts, cx, cy, deg) => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};
/** A closed smooth path through the points (Catmull-Rom as cubic Beziers). */
const smooth = pts => {
    const n = pts.length;
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + 'Z';
};
/** An open smooth path through the points. */
const smoothOpen = pts => {
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < P.length - 2; i++) {
        const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
        d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d;
};
const straight = pts => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;

/** A piece of paper: its outline as points (for the box), and its markup. */
const piece = (pts, fill, round = true) => ({ pts, svg: `<path d="${round ? smooth(pts) : straight(pts)}" fill="${fill}"/>` });

/** A leaf: pointed at both ends, a little bent. */
function leaf(cx, cy, len, w, deg, fill, bend = 0) {
    const L = [], R = [];
    const N = 14;
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const x = cx - len / 2 + len * t;
        const b = bend * Math.sin(Math.PI * t);
        const hw = (w / 2) * Math.pow(Math.sin(Math.PI * t), 0.85);
        L.push([x, cy + b - hw]);
        R.push([x, cy + b + hw]);
    }
    const pts = [...L, ...R.slice(1, -1).reverse()];
    return piece(rot(pts, cx, cy, deg), fill);
}

/** A frond: a long organic form whose sides swell in lobes, out of step on each side, along a bent spine. */
function frond(x1, y1, x2, y2, w, lobes, fill, bend = 0.12, phase = 0) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const N = 44;
    const A = [], B = [];
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        // Wide and round at the root, tapering to a soft point; the lobes swell smoothly (no cusps).
        const env = Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * t)), 0.5) * (1 - 0.45 * t);
        const s = len * bend * Math.sin(Math.PI * t);
        const px = x1 + dx * t + nx * s, py = y1 + dy * t + ny * s;
        // Each side carries round fingers on a narrow stem; the fingers of one side sit between the other's.
        const lobe = v => 0.58 + 0.42 * Math.pow(Math.max(0, Math.sin(v)), 1.2);
        const wa = (w / 2) * env * lobe(lobes * 2 * Math.PI * t + phase + 0.6);
        const wb = (w / 2) * env * lobe(lobes * 2 * Math.PI * t + phase + 0.6 + Math.PI);
        A.push([px + nx * wa, py + ny * wa]);
        B.push([px - nx * wb, py - ny * wb]);
    }
    return piece([...A, ...B.slice(1, -1).reverse()], fill);
}

/** A half-moon: a half disc, its straight edge turned by `deg`. */
function halfmoon(cx, cy, r, deg, fill) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
        const a = Math.PI + (Math.PI * i) / 24;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return piece(rot(pts, cx, cy, deg), fill, false);
}

/** An arch: a broad band bent through half a turn. */
function arch(cx, cy, r, band, deg, fill) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
        const a = Math.PI + (Math.PI * i) / 24;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    for (let i = 24; i >= 0; i--) {
        const a = Math.PI + (Math.PI * i) / 24;
        pts.push([cx + (r - band) * Math.cos(a), cy + (r - band) * Math.sin(a)]);
    }
    return piece(rot(pts, cx, cy, deg), fill, false);
}

function disc(cx, cy, r, fill) {
    const pts = [[cx - r, cy - r], [cx + r, cy + r]];
    return { pts, svg: `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"/>` };
}

/** A block: a slab with softly rounded corners, turned. */
function block(cx, cy, w, h, deg, fill) {
    const r = Math.min(w, h) * 0.12;
    const corners = rot([[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]], cx, cy, deg);
    return { pts: corners, svg: `<rect x="${f(cx - w / 2)}" y="${f(cy - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}" transform="rotate(${f(deg)} ${f(cx)} ${f(cy)})"/>` };
}

/** The tight box round some pieces, with a margin, in whole units. */
function boxOf(pieces, pad = 2) {
    const all = pieces.flatMap(p => p.pts);
    const x0 = Math.floor(Math.min(...all.map(p => p[0])) - pad), y0 = Math.floor(Math.min(...all.map(p => p[1])) - pad);
    const x1 = Math.ceil(Math.max(...all.map(p => p[0])) + pad), y1 = Math.ceil(Math.max(...all.map(p => p[1])) + pad);
    return [x0, y0, x1 - x0, y1 - y0];
}

const printed = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
    printed[name] = { box };
}
function layer(name, pieces, pad = 2) {
    const box = boxOf(pieces, pad);
    svg(name, box, pieces.map(p => p.svg).join(''));
    // The pivot that puts the focus at the middle of a scale: the planes come toward the viewer from there.
    printed[name].origin = [Math.round(((FX - box[0]) / box[2]) * 1000) / 1000, Math.round(((FY - box[1]) / box[3]) * 1000) / 1000];
    return box;
}

/* ---- the ceiling: ivory, a wide shallow plaster medallion as a few flat sand forms, a quiet cornice, and
   a couple of pieces tucked behind the cornice in the corners ---- */
{
    let s = `<rect x="0" y="0" width="360" height="450" fill="${C.ivory}"/>`;
    // The medallion: one broad, flattened form, and a smaller one laid over it off centre and a little turned (layered, never concentric).
    const plate = [];
    for (let i = 0; i < 80; i++) {
        const a = (2 * Math.PI * i) / 80, c = Math.cos(a), si = Math.sin(a);
        const k = 1;
        plate.push([FX + 152 * k * Math.sign(c) * Math.pow(Math.abs(c), 0.8), FY + 112 * k * Math.sign(si) * Math.pow(Math.abs(si), 0.8)]);
    }
    s += `<path d="${smooth(plate)}" fill="${C.sandLo}"/>`;
    const inner = [];
    for (let i = 0; i < 64; i++) {
        const a = (2 * Math.PI * i) / 64, c = Math.cos(a), si = Math.sin(a);
        inner.push([FX - 22 + 104 * Math.sign(c) * Math.pow(Math.abs(c), 0.75), FY - 20 + 62 * Math.sign(si) * Math.pow(Math.abs(si), 0.75)]);
    }
    s += `<path d="${smooth(rot(inner, FX - 22, FY - 20, -9))}" fill="${C.sand}"/>`;
    // Tucked behind the cornice: a sand slab top left, a sand leaf low on the right, one along the foot.
    s += block(20, 40, 92, 54, -24, C.sand).svg + leaf(350, 334, 150, 56, -64, C.sand).svg + leaf(140, 446, 150, 46, -6, C.sand, 4).svg;
    // The cornice: a quiet band round the ceiling, its inner edge drawn in ink.
    s += `<path d="M0 0H360V450H0ZM10 10V440H350V10Z" fill="${C.sandLo}" fill-rule="evenodd"/>`;
    s += `<path d="M10 10H350V440H10Z" fill="none" stroke="${C.ink}" stroke-width="1" stroke-opacity="0.5"/>`;
    // The two hooks the net hangs from.
    s += `<circle cx="7" cy="104" r="4" fill="${C.ink}"/><circle cx="353" cy="104" r="4" fill="${C.ink}"/>`;
    svg('ceiling', [0, 0, 360, 450], s);
}

/* ---- the light that rises at the focus: a gold disc, a soft halo, soft rays (alpha gradients only) ---- */
{
    const R = 132;
    let s = `<defs><radialGradient id="h" cx="${FX}" cy="${FY}" r="${R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.gold}" stop-opacity="1"/><stop offset="0.3" stop-color="${C.gold}" stop-opacity="0.6"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>`;
    s += `<radialGradient id="r" cx="${FX}" cy="${FY}" r="${R}" gradientUnits="userSpaceOnUse"><stop offset="0.22" stop-color="${C.mustard}" stop-opacity="0.32"/><stop offset="1" stop-color="${C.mustard}" stop-opacity="0"/></radialGradient></defs>`;
    s += `<circle cx="${FX}" cy="${FY}" r="${R}" fill="url(#h)"/>`;
    // Sixteen fine soft rays, long and short in turn, set off the vertical so they never read as a cross.
    for (let i = 0; i < 16; i++) {
        const a = (2 * Math.PI * (i + 0.5)) / 16, w = 0.045, r = i % 2 ? R * 0.7 : R;
        const p = [[FX + 32 * Math.cos(a - 0.08), FY + 32 * Math.sin(a - 0.08)], [FX + r * Math.cos(a - w), FY + r * Math.sin(a - w)], [FX + r * Math.cos(a + w), FY + r * Math.sin(a + w)], [FX + 32 * Math.cos(a + 0.08), FY + 32 * Math.sin(a + 0.08)]];
        s += `<path d="${straight(p)}" fill="url(#r)"/>`;
    }
    s += `<circle cx="${FX}" cy="${FY}" r="34" fill="${C.gold}"/>`;
    svg('glow', [FX - R, FY - R, 2 * R, 2 * R], s);
}

/* ---- pieces that rest at the corners and stay: tucked in when closed, settled when open ---- */
layer('rest-a', [leaf(48, 392, 230, 78, -58, C.teal, 14)]);
layer('rest-b', [halfmoon(354, 26, 70, 222, C.terra)]);
layer('rest-c', [leaf(318, 410, 176, 58, -40, C.mustard, 8)]);
layer('rest-d', [disc(250, 448, 26, C.ink)]);

/* ---- the heap, in planes far to near. Each plane is one layer; they all scale about the focus, so a
   piece's way out of the frame runs straight away from the middle. ---- */
const planes = {
    // Far: the sand and the soft background masses that make the heap dense.
    'heap-a': [
        frond(30, 270, 150, 104, 66, 2.5, C.sand, 0.1),
        frond(336, 282, 214, 100, 62, 2.5, C.sand, -0.1, 1),
        block(180, 330, 110, 46, 6, C.sand),
        halfmoon(250, 150, 52, 160, C.sand),
        leaf(112, 330, 120, 46, 20, C.sand),
    ],
    // Left: a big teal frond and its companions.
    'heap-b': [
        halfmoon(70, 300, 50, 200, C.terra),
        leaf(92, 236, 150, 62, 22, C.teal, -10),
        leaf(100, 142, 130, 44, -38, C.mustard, 4),
        disc(54, 166, 18, C.ink),
    ],
    // Right: terracotta frond, teal half-moon, mustard disc.
    'heap-c': [
        halfmoon(300, 316, 52, 170, C.teal),
        frond(344, 200, 206, 128, 66, 2.2, C.terra, 0.12, 0.6),
        disc(286, 250, 30, C.mustard),
        leaf(316, 150, 70, 26, 40, C.mustard),
    ],
    // Top: a long teal leaf across, a terracotta arch.
    'heap-d': [
        arch(150, 128, 46, 18, 12, C.terra),
        leaf(206, 112, 170, 46, 6, C.teal, -6),
        disc(272, 128, 15, C.mustard),
    ],
    // Low: a mustard frond along the bottom of the net, a terracotta leaf.
    'heap-e': [
        frond(90, 340, 268, 322, 58, 2.4, C.mustard, -0.08, 0.3),
        leaf(250, 300, 100, 36, -14, C.teal),
        disc(122, 300, 20, C.teal),
    ],
    // Near: the largest pieces, round the middle.
    'heap-f': [
        frond(110, 256, 250, 166, 74, 2, C.mustard, 0.1, 1.2),
        leaf(204, 252, 120, 50, 62, C.terra, 5),
        arch(150, 214, 44, 20, -30, C.teal),
        disc(236, 184, 12, C.terra),
    ],
};
for (const [name, pieces] of Object.entries(planes)) layer(name, pieces);

/* ---- the net: a fine ink mesh over the heap, in two halves gathered at the middle, each hung from its
   outer top corner ---- */
{
    // The net's outline: a wide soft rectangle, pinched in at the middle where it is gathered.
    const outline = [];
    for (let i = 0; i < 96; i++) {
        const a = (2 * Math.PI * i) / 96, c = Math.cos(a), si = Math.sin(a);
        let x = FX + 166 * Math.sign(c) * Math.pow(Math.abs(c), 0.55);
        let y = FY + 136 * Math.sign(si) * Math.pow(Math.abs(si), 0.55);
        y -= Math.sign(si) * 7 * Math.exp(-(((x - FX) / 46) ** 2));
        outline.push([x, y]);
    }
    const half = (side, name) => {
        const pts = outline.filter(([x]) => (side < 0 ? x <= FX + 0.01 : x >= FX - 0.01));
        const box = boxOf([{ pts }], 2);
        const [bx, by, bw, bh] = box;
        // Points of this half, in order round the outline, starting at the top of the middle.
        const idx = outline.map((p, i) => i).filter(i => (side < 0 ? outline[i][0] <= FX + 0.01 : outline[i][0] >= FX - 0.01));
        const ordered = [];
        const start = idx.findIndex((i, k) => !idx.includes((i - 1 + 96) % 96));
        for (let k = 0; k < idx.length; k++) ordered.push(outline[idx[(start + k) % idx.length]]);
        const a0 = ordered[ordered.length - 1], b0 = ordered[0];
        const mids = [0.2, 0.4, 0.5, 0.6, 0.8].map(t => [FX, a0[1] + (b0[1] - a0[1]) * t]);
        const shape = [...ordered, ...mids];
        const d = smooth(shape);
        let s = `<defs><clipPath id="c"><path d="${d}"/></clipPath></defs><g clip-path="url(#c)" stroke="${C.ink}" stroke-width="0.8" stroke-opacity="0.6">`;
        const step = 25;
        for (let k = -40; k <= 40; k++) {
            const c0 = k * step;
            // Only the threads that cross the half's box.
            if (c0 > -bh * 0.8 && c0 < bw) s += `<line x1="${f(bx + c0)}" y1="${f(by)}" x2="${f(bx + c0 + bh * 0.8)}" y2="${f(by + bh)}"/>`;
            if (c0 > 0 && c0 < bw + bh * 0.8) s += `<line x1="${f(bx + c0)}" y1="${f(by)}" x2="${f(bx + c0 - bh * 0.8)}" y2="${f(by + bh)}"/>`;
        }
        // The cord round the net's rim, on its outer edge only: the halves meet in the mesh, not in a seam.
        const rim = smoothOpen(ordered);
        s += `</g><path d="${rim}" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`;
        // The short cord from the hook to the net's outer top corner.
        const hx = side < 0 ? 7 : 353, hy = 104;
        const cx0 = side < 0 ? 30 : 330, cy0 = 100;
        const corner = ordered.reduce((a, p) => (Math.hypot(p[0] - cx0, p[1] - cy0) < Math.hypot(a[0] - cx0, a[1] - cy0) ? p : a));
        s += `<path d="M${hx} ${hy}L${f(corner[0])} ${f(corner[1])}" stroke="${C.ink}" stroke-width="1.6"/>`;
        const full = [Math.min(bx, hx - 4), Math.min(by, 82), 0, 0];
        full[2] = Math.max(bx + bw, hx + 4) - full[0];
        full[3] = by + bh - full[1];
        svg(name, full, s);
        // The net swings about its hook.
        printed[name].origin = [Math.round(((hx - full[0]) / full[2]) * 1000) / 1000, Math.round(((hy - full[1]) / full[3]) * 1000) / 1000];
    };
    half(-1, 'net-l');
    half(1, 'net-r');
}

/* ---- the knot that gathers the net, and its short cord ---- */
{
    const k = `<rect x="${FX - 10}" y="${FY - 8}" width="20" height="16" rx="7" fill="${C.ink}"/>`;
    svg('knot', [FX - 17, FY - 17, 34, 34], k);
    const cord = `<path d="M${FX} ${FY + 6}C${FX + 6} ${FY + 30} ${FX - 6} ${FY + 52} ${FX + 2} ${FY + 78}" fill="none" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>` + leaf(FX + 2, FY + 86, 20, 9, 86, C.ink).svg;
    svg('cord', [FX - 8, FY + 4, 16, 94], cord);
    printed.cord.origin = [0.5, 0];
}

/* ---- the sparkle: one small mustard leaf, scattered ---- */
svg('bit', [FX - 6, FY - 3, 12, 6], leaf(FX, FY, 12, 5.6, 0, C.mustard).svg);

for (const [name, v] of Object.entries(printed)) console.log(name.padEnd(8), JSON.stringify(v.box), v.origin ? JSON.stringify(v.origin) : '');
