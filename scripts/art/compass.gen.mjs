// Generator for the "compass" wrapper art: a nautical chart seen from above, in warm paper tones
// with fine contour lines, and on it a round brass pocket compass. Flat shapes, two or three tones
// to a surface, no gradient, no filter, no letter and no digit anywhere. Every colour is in the
// palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/compass.gen.mjs   (prints the boxes of the route layers)
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'compass');
if (!OUT.endsWith('wrappers/compass')) throw new Error('out dir must be public/wrappers/compass');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: chart paper, land, the sepia of its lines, a shallow-water tint, brass in two tones,
   the dial's cream, the needle's red and dark blue, leather. */
const C = {
    paper: '#EFE3C8',
    land: '#DDC99E',
    sepia: '#A28357',
    tint: '#C7D6CC',
    brass: '#CFA552',
    brassLo: '#96702E',
    cream: '#F8F1DE',
    red: '#C23B2A',
    navy: '#1B2A47',
    leather: '#4E3023',
};

const f = n => String(Math.round(n * 100) / 100);
const P = pts => pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');
const poly = (pts, fill, extra = '') => `<path d="M${P(pts)}Z" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ring = (cx, cy, r, stroke, w, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${stroke}" stroke-width="${w}"${extra}/>`;
const line = (a, b, stroke, w, extra = '') => `<path d="M${P([a, b])}" fill="none" stroke="${stroke}" stroke-width="${w}"${extra}/>`;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}

/* The compass sits in the middle of the chart. A bearing is degrees clockwise from the top of the frame. */
const CX = 180, CY = 225;
const at = (r, deg, cx = CX, cy = CY) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];

/* ---- coasts: chains of cubic curves, kept as numbers so that the port and the soundings can be placed from them ---- */
const cubic = ([p0, c1, c2, p1], t) => {
    const u = 1 - t;
    return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p1[k]);
};
const chainPath = segs => `M${f(segs[0][0][0])} ${f(segs[0][0][1])}` + segs.map(([, c1, c2, p1]) => `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p1[0])} ${f(p1[1])}`).join('');
const sample = segs => segs.flatMap(s => Array.from({ length: 16 }, (_, i) => cubic(s, i / 16))).concat([segs[segs.length - 1][3]]);
// The land the journey is bound for: the upper right corner.
const NE = [
    [[226, -8], [234, 26], [262, 30], [276, 58]],
    [[276, 58], [286, 82], [316, 82], [322, 110]],
    [[322, 110], [328, 140], [360, 140], [374, 170]],
];
// The land it leaves: the lower left corner.
const SW = [
    [[-8, 282], [30, 290], [38, 330], [70, 344]],
    [[70, 344], [104, 358], [96, 400], [128, 418]],
    [[128, 418], [152, 430], [150, 448], [160, 462]],
];
const LANDS = [
    { id: 'ne', coast: chainPath(NE), close: 'L374 -8Z', pts: [...sample(NE), [374, -8]] },
    { id: 'sw', coast: chainPath(SW), close: 'L-8 462Z', pts: [...sample(SW), [-8, 462]] },
];
// Two islands, as closed blobs.
const blob = (cx, cy, rx, ry, k) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + k;
        const w = 1 + 0.22 * Math.sin(i * 2.4 + k * 3);
        return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w];
    });
    // A closed smooth curve through the points (Catmull-Rom as cubics).
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < 6; i++) {
        const [p0, p1, p2, p3] = [pts[(i + 5) % 6], pts[i], pts[(i + 1) % 6], pts[(i + 2) % 6]];
        d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return { d: d + 'Z', pts, c: [cx, cy], r: Math.max(rx, ry) };
};
const ISLES = [blob(50, 170, 22, 15, 0.4), blob(322, 268, 17, 12, 1.9), blob(214, 392, 11, 8, 3.1)];

const inside = (pts, [x, y]) => {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
};
const near = (pts, [x, y], d) => pts.some(([px, py]) => Math.hypot(px - x, py - y) < d);

/* The port: a point on the far coast. The needle comes to rest pointing at it, and the route runs to it. */
const PORT = cubic(NE[1], 0.5);
const BEARING = (Math.atan2(PORT[0] - CX, CY - PORT[1]) * 180) / Math.PI;
/* The harbour the dashed route already drawn on the chart set out from. */
const HOME = cubic(SW[1], 0.5);

/* ---- chart: the whole sheet ---- */
{
    const stroke = (d, col, w) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(w)}" stroke-linejoin="round" stroke-linecap="round"/>`;
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.paper}"/>`;
    // Depth contours off every coast: a wide stroke in the line's colour, a slightly narrower one in the
    // water's colour over it, leaves a hairline at that distance. Outermost first; the innermost band is the shallows.
    const shapes = [...LANDS.map(l => l.coast), ...ISLES.map(i => i.d)];
    for (const [d, col] of [[52, C.land], [36, C.land], [22, C.sepia]]) {
        // The small lower island keeps only its nearest line: its wider rings broke up against the coast's.
        const set = d > 30 ? shapes.slice(0, -1) : shapes;
        for (const p of set) s += stroke(p, col, 2 * d + (col === C.sepia ? 1.1 : 1.8));
        for (const p of set) s += stroke(p, C.paper, 2 * d);
    }
    for (const p of shapes) s += stroke(p, C.tint, 22);
    // Meridians and parallels.
    for (const x of [40, 110, 180, 250, 320]) s += line([x, -6], [x, 456], C.navy, 0.7, ' opacity="0.2"');
    for (const y of [50, 120, 190, 260, 330, 400]) s += line([-6, y], [366, y], C.navy, 0.7, ' opacity="0.2"');
    // Soundings: dots, never figures. A jittered grid over the water only.
    let k = 7;
    const rnd = () => ((k = (k * 16807) % 2147483647) / 2147483647);
    for (let gy = 26; gy < 440; gy += 23) {
        for (let gx = 24; gx < 345; gx += 23) {
            const p = [gx + (rnd() - 0.5) * 14, gy + (rnd() - 0.5) * 14];
            if (LANDS.some(l => inside(l.pts, p) || near(l.pts, p, 9))) continue;
            if (ISLES.some(i => Math.hypot(p[0] - i.c[0], p[1] - i.c[1]) < i.r + 12)) continue;
            s += circle(p[0], p[1], rnd() < 0.3 ? 1.5 : 1, C.navy, ' opacity="0.5"');
        }
    }
    // The lands: contour lines inside them by the same trick, clipped to the land.
    s += '<defs>' + LANDS.map(l => `<clipPath id="${l.id}"><path d="${l.coast}${l.close}"/></clipPath>`).join('') + ISLES.map((i, n) => `<clipPath id="i${n}"><path d="${i.d}"/></clipPath>`).join('') + '</defs>';
    const relief = (id, d, shape, steps) => {
        let g = `<g clip-path="url(#${id})"><path d="${shape}" fill="${C.land}"/>`;
        for (const o of steps) g += stroke(d, C.sepia, 2 * o + 1.3) + stroke(d, C.land, 2 * o);
        return g + '</g>' + stroke(d, C.sepia, 1.6);
    };
    for (const l of LANDS) s += relief(l.id, l.coast, l.coast + l.close, [42, 30, 19, 9]);
    ISLES.forEach((i, n) => (s += relief(`i${n}`, i.d, i.d, n === 0 ? [11, 5] : [5])));
    // The route already sailed: dashes from the home harbour to where the compass lies.
    s += `<path d="M${P([HOME])}Q${f(HOME[0] + 62)} ${f(HOME[1] - 30)} ${CX} ${CY}" fill="none" stroke="${C.navy}" stroke-width="1.8" stroke-dasharray="7 5" stroke-linecap="round"/>`;
    s += circle(HOME[0], HOME[1], 4.2, C.navy) + ring(HOME[0], HOME[1], 8, C.navy, 1.2);
    // The port, marked quietly until the route reaches it.
    s += ring(PORT[0], PORT[1], 9.5, C.navy, 1.1, ' opacity="0.55"') + circle(PORT[0], PORT[1], 2, C.navy, ' opacity="0.55"');
    // The sheet's border: a margin of bare paper, two neat lines, and a scale of alternating blocks between them.
    s += `<rect x="1" y="1" width="358" height="448" fill="none" stroke="${C.paper}" stroke-width="16"/>`;
    for (let i = 0; i < 17; i += 2) s += `<rect x="${10 + i * 20}" y="9" width="20" height="4" fill="${C.navy}"/>` + `<rect x="${10 + i * 20}" y="437" width="20" height="4" fill="${C.navy}"/>`;
    for (let i = 0; i < 21; i += 2) s += `<rect x="9" y="${15 + i * 20}" width="4" height="20" fill="${C.navy}"/>` + `<rect x="347" y="${15 + i * 20}" width="4" height="20" fill="${C.navy}"/>`;
    s += `<rect x="9" y="9" width="342" height="432" fill="none" stroke="${C.navy}" stroke-width="0.9"/>` + `<rect x="13" y="13" width="334" height="424" fill="none" stroke="${C.navy}" stroke-width="0.9"/>`;
    svg('chart', [-6, -6, 372, 462], s);
}

/* ---- ruler: a parallel rule lying across the upper left corner. Ticks only. ---- */
{
    const L = 260, W = 34;
    let g = `<rect x="${-L / 2}" y="${-W / 2}" width="${L}" height="${W}" fill="${C.cream}"/>`;
    g += `<rect x="${-L / 2}" y="${W / 2 - 7}" width="${L}" height="7" fill="${C.brass}"/>` + `<rect x="${-L / 2}" y="${W / 2 - 8.2}" width="${L}" height="1.2" fill="${C.brassLo}"/>`;
    for (let i = 0; i <= 52; i++) {
        const x = -L / 2 + 4 + i * 5;
        const h = i % 10 === 0 ? 13 : i % 5 === 0 ? 9 : 5;
        g += `<rect x="${f(x - 0.45)}" y="${-W / 2}" width="0.9" height="${h}" fill="${C.navy}"/>`;
    }
    // Two brass pins.
    for (const x of [-34, 58]) g += circle(x, 3, 3.4, C.brass) + circle(x, 3, 1.3, C.brassLo);
    // A flat shadow on the chart, then the rule.
    const tf = (dx, dy) => `translate(${44 + dx} ${40 + dy}) rotate(-41)`;
    svg('ruler', [-6, -6, 156, 136], `<g transform="${tf(3, 4)}" opacity="0.16"><rect x="${-L / 2}" y="${-W / 2}" width="${L}" height="${W}" fill="${C.navy}"/></g><g transform="${tf(0, 0)}">${g}</g>`);
}

/* ---- dividers: open, one point planted, across the lower right corner ---- */
{
    const H = [338, 356], A = [258, 424], B = [306, 440];
    const leg = (tip, col, lo) => {
        const d = [tip[0] - H[0], tip[1] - H[1]];
        const n = Math.hypot(d[0], d[1]);
        const px = (-d[1] / n) * 4.2, py = (d[0] / n) * 4.2;
        const m = [H[0] + d[0] * 0.72, H[1] + d[1] * 0.72];
        return (
            poly([[H[0] + px, H[1] + py], [m[0] + px * 0.6, m[1] + py * 0.6], [m[0], m[1]], [H[0], H[1]]], col) +
            poly([[H[0] - px, H[1] - py], [m[0] - px * 0.6, m[1] - py * 0.6], [m[0], m[1]], [H[0], H[1]]], lo) +
            poly([[m[0] + px * 0.6, m[1] + py * 0.6], tip, [m[0] - px * 0.6, m[1] - py * 0.6]], C.navy)
        );
    };
    let s = `<g transform="translate(3 4)" opacity="0.16">${line(H, A, C.navy, 7)}${line(H, B, C.navy, 7)}</g>`;
    s += leg(A, C.brass, C.brassLo) + leg(B, C.brass, C.brassLo);
    s += circle(H[0], H[1], 9, C.brass) + ring(H[0], H[1], 9, C.brassLo, 1.4) + circle(H[0], H[1], 3, C.brassLo);
    // The arc they have stepped off on the chart.
    s += `<path d="M${P([A])}Q${f((A[0] + B[0]) / 2 - 4)} ${f((A[1] + B[1]) / 2 + 12)} ${P([B])}" fill="none" stroke="${C.navy}" stroke-width="1" stroke-dasharray="2 3" opacity="0.6"/>`;
    svg('dividers', [250, 342, 104, 106], s);
}

/* ---- the route found: dots from the compass to the port, in four groups, then the port in red ---- */
{
    const from = 108, to = Math.hypot(PORT[0] - CX, PORT[1] - CY) - 25;
    const N = 8;
    const dots = Array.from({ length: N }, (_, i) => at(from + ((to - from) * i) / (N - 1), BEARING));
    const boxes = {};
    for (let gi = 0; gi < 4; gi++) {
        const grp = dots.slice(gi * 2, gi * 2 + 2);
        const xs = grp.map(p => p[0]), ys = grp.map(p => p[1]);
        const box = [Math.floor(Math.min(...xs) - 4), Math.floor(Math.min(...ys) - 4), 0, 0];
        box[2] = Math.ceil(Math.max(...xs) + 4) - box[0];
        box[3] = Math.ceil(Math.max(...ys) + 4) - box[1];
        boxes[`route-${gi + 1}`] = box;
        svg(`route-${gi + 1}`, box, grp.map(p => circle(p[0], p[1], 2.5, C.navy)).join(''));
    }
    const mb = [Math.round(PORT[0]) - 30, Math.round(PORT[1]) - 30, 60, 60];
    boxes.mark = mb;
    // The port: a red disc, a ring, and eight short ticks radiating from it.
    let m = circle(PORT[0], PORT[1], 11, C.red) + ring(PORT[0], PORT[1], 17, C.red, 2);
    for (let i = 0; i < 8; i++) m += line(at(21.5, i * 45 + 22.5, ...PORT), at(27.5, i * 45 + 22.5, ...PORT), C.red, 2, ' stroke-linecap="round"');
    svg('mark', mb, m);
    console.log(JSON.stringify({ bearing: BEARING, port: PORT, boxes }));
}

/* ---- case: the brass body and the dial under the lid ---- */
{
    let s = circle(CX + 5, CY + 8, 99, C.navy, ' opacity="0.3"');
    // The bail at the foot, for the strap.
    s += ring(CX, CY + 104, 9, C.brassLo, 4.5) + ring(CX, CY + 104, 9, C.brass, 2);
    s += circle(CX, CY, 99, C.navy) + circle(CX, CY, 96, C.brass) + ring(CX, CY, 95, C.brassLo, 2) + ring(CX, CY, 84, C.brassLo, 1.2);
    s += circle(CX, CY, 80, C.cream) + ring(CX, CY, 79.2, C.brassLo, 1.6);
    // Two rings of ticks: the outer in fives, longer at fifteens and longest at the eight winds; the inner in tens.
    s += ring(CX, CY, 75, C.navy, 0.8) + ring(CX, CY, 66, C.navy, 0.5, ' opacity="0.5"');
    for (let a = 0; a < 360; a += 5) {
        const big = a % 45 === 0, mid = a % 15 === 0;
        s += line(at(75, a + BEARING), at(big ? 63 : mid ? 67 : 70.5, a + BEARING), C.navy, big ? 1.8 : mid ? 1.2 : 0.7);
    }
    s += ring(CX, CY, 50, C.sepia, 0.8);
    for (let a = 0; a < 360; a += 10) s += line(at(50, a + BEARING), at(a % 30 === 0 ? 44 : 47, a + BEARING), C.sepia, a % 30 === 0 ? 1.3 : 0.8);
    // The rose: sixteen points, each two faces. Short ones first, the four long ones on top.
    const point = (a, len, sideR, sideA, lite, dark) => poly([[CX, CY], at(len, a), at(sideR, a - sideA)], lite) + poly([[CX, CY], at(len, a), at(sideR, a + sideA)], dark);
    for (let i = 0; i < 8; i++) s += point(BEARING + 22.5 + i * 45, 33, 8, 22.5, C.land, C.sepia);
    for (let i = 0; i < 4; i++) s += point(BEARING + 45 + i * 90, 45, 10, 45, C.land, C.sepia);
    for (let i = 0; i < 4; i++) s += point(BEARING + i * 90, 61, 12, 45, C.brass, C.brassLo);
    s += ring(CX, CY, 16, C.brassLo, 1);
    // North: one small red triangle at the rim.
    s += poly([at(77, BEARING), at(64.5, BEARING - 5.6), at(64.5, BEARING + 5.6)], C.red);
    svg('case', [79, 124, 208, 216], s);
}

/* ---- needle: red toward the port, dark blue behind, a brass cap on the pivot. Drawn at rest. ---- */
{
    const tip = at(57, BEARING), tail = at(57, BEARING + 180), l = at(7.5, BEARING - 90), r = at(7.5, BEARING + 90), c = [CX, CY];
    let s = poly([tip, l, c], C.red) + poly([tip, r, c], C.red) + poly([tip, r, c], C.navy, ' opacity="0.22"');
    s += poly([tail, l, c], C.navy) + poly([tail, r, c], C.navy) + poly([tail, l, c], C.cream, ' opacity="0.16"');
    s += circle(CX, CY, 8, C.brass) + ring(CX, CY, 8, C.brassLo, 1.3) + circle(CX, CY, 2.6, C.brassLo);
    svg('needle', [120, 165, 120, 120], s);
}

/* ---- lid, closed: engraved with a rosette of rays ---- */
const LB = [92, 137, 176, 176];
{
    let s = circle(CX, CY, 88, C.brass) + ring(CX, CY, 86.6, C.brassLo, 2.8) + ring(CX, CY, 78, C.brassLo, 1) + ring(CX, CY, 74, C.brassLo, 0.6);
    // A ring of small beads between the two engraved circles' inside and the rays.
    for (let a = 0; a < 360; a += 7.5) s += circle(...at(69, a), 1.1, C.brassLo);
    // Rays: long and short by turns, each two faces (one engraved dark, one catching light).
    for (let i = 0; i < 32; i++) {
        const a = i * 11.25, len = i % 4 === 0 ? 64 : i % 2 === 0 ? 54 : 40, w = i % 2 === 0 ? 5 : 3.4, r0 = 17;
        const mid = at(r0 + 9, a);
        s += poly([at(r0, a), at(r0 + 9, a - w), at(len, a), mid], C.brassLo) + poly([at(r0, a), at(r0 + 9, a + w), at(len, a), mid], C.cream, ' opacity="0.45"');
    }
    s += circle(CX, CY, 14, C.brassLo) + circle(CX, CY, 11, C.brass) + ring(CX, CY, 6, C.brassLo, 1) + circle(CX, CY, 2, C.brassLo);
    // The catch, at the foot.
    s += `<rect x="${CX - 7}" y="${CY + 77}" width="14" height="9" rx="3" fill="${C.brassLo}"/>` + `<rect x="${CX - 4}" y="${CY + 79.5}" width="8" height="2" rx="1" fill="${C.brass}"/>`;
    svg('lid', LB, s);
}

/* ---- glint: light lying across the closed lid, two slanted bars cut to its round ---- */
{
    const bar = (o, w) => poly([[CX - 110 + o, CY + 100], [CX - 110 + o + w, CY + 100], [CX + 60 + o + w, CY - 100], [CX + 60 + o, CY - 100]], C.cream);
    svg('glint', LB, `<defs><clipPath id="c"><circle cx="${CX}" cy="${CY}" r="85"/></clipPath></defs><g clip-path="url(#c)" opacity="0.75">${bar(-6, 30)}${bar(38, 9)}</g>`);
}

/* ---- lid, open: standing on its hinge, seen from above, so a flat oval; a mirror set in its inside ---- */
{
    const [ex, ey] = [CX, 88];
    const el = (rx, ry, fill, extra = '') => `<ellipse cx="${ex}" cy="${ey}" rx="${rx}" ry="${ry}" fill="${fill}"${extra}/>`;
    let s = el(88, 49, C.brassLo) + el(84, 46, C.brass) + `<ellipse cx="${ex}" cy="${ey}" rx="72" ry="38" fill="none" stroke="${C.brassLo}" stroke-width="1.2"/>`;
    s += `<defs><clipPath id="m"><ellipse cx="${ex}" cy="${ey}" rx="66" ry="33.5"/></clipPath></defs>`;
    s += el(66, 33.5, C.tint) + `<g clip-path="url(#m)">` + poly([[ex - 70, ey + 40], [ex - 34, ey + 40], [ex + 6, ey - 40], [ex - 30, ey - 40]], C.cream, ' opacity="0.7"') + poly([[ex - 18, ey + 40], [ex - 8, ey + 40], [ex + 32, ey - 40], [ex + 22, ey - 40]], C.cream, ' opacity="0.7"') + poly([[ex + 20, ey + 40], [ex + 80, ey + 40], [ex + 80, ey - 10]], C.navy, ' opacity="0.12"') + '</g>';
    s += `<ellipse cx="${ex}" cy="${ey}" rx="66" ry="33.5" fill="none" stroke="${C.brassLo}" stroke-width="1.6"/>`;
    // The sighting line down the mirror.
    s += line([ex, ey - 33], [ex, ey + 33], C.navy, 0.8, ' opacity="0.6"');
    svg('lid-open', [92, 39, 176, 98], s);
}

/* ---- hinge: over both lids ---- */
svg('hinge', [158, 129, 44, 16], `<rect x="160" y="131" width="40" height="12" rx="4" fill="${C.brassLo}"/><rect x="162" y="133" width="36" height="5" rx="2.5" fill="${C.brass}"/><rect x="172.4" y="131" width="1.2" height="12" fill="${C.brass}"/><rect x="186.4" y="131" width="1.2" height="12" fill="${C.brass}"/>`);

/* ---- strap: dark leather across the lid, buckled. Drawn level; the definition lays it at a slant. ---- */
{
    const y = 265, h = 20, x0 = -50, w = 460;
    let s = `<rect x="${x0}" y="${y + 3}" width="${w}" height="${h}" fill="${C.navy}" opacity="0.18"/>`;
    s += `<rect x="${x0}" y="${y}" width="${w}" height="${h}" fill="${C.leather}"/>` + `<rect x="${x0}" y="${y + h - 6}" width="${w}" height="6" fill="${C.navy}" opacity="0.3"/>`;
    for (const yy of [y + 3.5, y + h - 3.5]) s += `<path d="M${x0} ${yy}H${x0 + w}" fill="none" stroke="${C.cream}" stroke-width="1.1" stroke-dasharray="4 3.2" opacity="0.6"/>`;
    // Holes, a keeper, and the buckle with its prong.
    for (const x of [326, 342, 358, 374]) s += circle(x, y + h / 2, 2.3, C.navy) + ring(x, y + h / 2, 3.4, C.brass, 0.9);
    s += `<rect x="268" y="${y - 2}" width="11" height="${h + 4}" rx="2" fill="${C.leather}"/>` + `<rect x="268" y="${y - 2}" width="11" height="${h + 4}" rx="2" fill="${C.cream}" opacity="0.14"/>`;
    s += `<rect x="289" y="${y - 5}" width="24" height="${h + 10}" rx="5" fill="none" stroke="${C.brass}" stroke-width="5"/>` + `<rect x="289" y="${y - 5}" width="24" height="${h + 10}" rx="5" fill="none" stroke="${C.brassLo}" stroke-width="1.2"/>`;
    s += `<rect x="288" y="${y + h / 2 - 2}" width="27" height="4" rx="2" fill="${C.brassLo}"/>`;
    svg('strap', [x0, 258, w, 34], s);
}

/* ---- spark: light thrown off the dial as the needle settles ---- */
svg('spark', [176, 221, 8, 8], poly([[180, 221], [184, 225], [180, 229], [176, 225]], C.brass) + poly([[180, 221], [184, 225], [180, 225]], C.brassLo));
