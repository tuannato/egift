// Generator for the "paper bag" thank-you wrapper art.
// Technique: RUBBER-STAMP PRINTING ON KRAFT. Every decorative mark is a stamp impression made by
// hand: a solid shape whose ink is uneven (a starved middle, a heavier rim where the ink squeezed
// out, missed specks and chips, sometimes the faint line of the block's edge, sometimes a second
// ghost beside it), set down with imperfect spacing and turn, never the same twice. Objects (the bag,
// the stamps, the ink pad) are flat cut-paper shapes with a few printed lines and hard offset
// shadows: no gradients, no filters, no blur anywhere. Creases are hard-edged slivers of tone.
// Inks: forest green and brick red, a little cream, on kraft brown, over a dark green cutting mat.
//
// The scene is taller than the canvas: the opening pans up by PAN as the things rise out of the bag,
// so "world" y runs from -152 (seen only when open) to 462 (seen only when closed).
// The bag and everything in it are drawn upright round the bag's centre G and turned by the stage.
// Every SVG is written already passed through the allow-list (scripts/svg-allow.mjs).
// Run: node scripts/art/paperbag.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeSvg } from '../svg-allow.mjs';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'paperbag');
if (!OUT.endsWith('wrappers/paperbag')) throw new Error('out dir must be public/wrappers/paperbag');
mkdirSync(OUT, { recursive: true });
for (const n of readdirSync(OUT)) if (n.endsWith('.svg')) unlinkSync(join(OUT, n));

const C = {
    wood: '#2B1D15', woodLo: '#1E130D', woodHi: '#3C2A1D',
    mat: '#1D3A2F', matLo: '#152C24', matHi: '#28493C', matLine: '#5C8A75',
    kraft: '#C59B6B', kraftLo: '#AD8454', kraftHi: '#D6B183', kraftDk: '#96693E', kraftIn: '#8B6641', kraftDeep: '#5B4027',
    band: '#BB905F',
    cream: '#F0E5CB', creamLo: '#DCCDAA', creamHi: '#FAF3E0',
    green: '#1F4A38', greenD: '#12301F', greenL: '#3B6B53',
    brick: '#A5452D', brickD: '#74281A', brickL: '#C4694D',
    brown: '#4A321F', straw: '#DCC088', strawLo: '#B8965A',
    woodT: '#CDA571', woodTLo: '#A97C4A', woodTHi: '#E2C394',
    tin: '#1A2420', tinHi: '#33423B',
    shadow: '#07100C',
};
const INK = { green: [C.green, C.greenD], brick: [C.brick, C.brickD], cream: [C.cream, C.creamHi], brown: [C.brown, '#2A1A0F'] };

/** The bag: centre, turn (degrees clockwise), half width, top and bottom of the closed body, height of one fold. */
const G = [150, 235];
const A = 13;
const HW = 88, T = -100, B = 100, H = 26;
/** How far the picture pans down (the camera goes up) while the things rise. */
const PAN = 132;

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
const f = n => {
    const v = Math.round(n * 10) / 10;
    return String(v === 0 ? 0 : v);
};
const f2 = n => String(Math.round(n * 100) / 100);
const rad = d => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const jit = (rnd, a) => (rnd() * 2 - 1) * a;
const rotP = ([x, y], deg) => {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
    return [x * c - y * s, x * s + y * c];
};
const xf = (pts, { x = 0, y = 0, rot = 0, s = 1 }) => pts.map(p => { const [a, b] = rotP([p[0] * s, p[1] * s], rot); return [a + x, b + y]; });
const pt = p => `${f(p[0])} ${f(p[1])}`;
/** A cut: straight edges. */
const pth = (pts, close = true) => 'M' + pts.map(pt).join('L') + (close ? 'Z' : '');
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/** A rounded run through the midpoints of `pts`. */
function smooth(pts, close = true) {
    const n = pts.length;
    if (close) {
        let d = 'M' + pt(mid(pts[n - 1], pts[0]));
        for (let i = 0; i < n; i++) d += `Q${pt(pts[i])} ${pt(mid(pts[i], pts[(i + 1) % n]))}`;
        return d + 'Z';
    }
    let d = 'M' + pt(pts[0]);
    for (let i = 1; i < n - 1; i++) d += `Q${pt(pts[i])} ${pt(i === n - 2 ? pts[n - 1] : mid(pts[i], pts[i + 1]))}`;
    if (n === 2) d += 'L' + pt(pts[1]);
    return d;
}
const ring = (cx, cy, r, rnd, n = 12, j = 0.05, ry = r) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU + jit(rnd, 0.5 / n); const k = 1 + jit(rnd, j); return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * ry * k]; });
const rectP = (cx, cy, w, h, rot, rnd, j = 0.4) => xf([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(p => [p[0] + jit(rnd, j), p[1] + jit(rnd, j)]), { x: cx, y: cy, rot });
/** A strip along `cs` (centre points) with half width hw(t). */
function strip(cs, hw) {
    const L = [], Rr = [];
    for (let i = 0; i < cs.length; i++) {
        const a = cs[Math.max(0, i - 1)], b = cs[Math.min(cs.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const w = hw(i / (cs.length - 1));
        L.push([cs[i][0] - (dy / l) * w, cs[i][1] + (dx / l) * w]);
        Rr.push([cs[i][0] + (dy / l) * w, cs[i][1] - (dx / l) * w]);
    }
    return [...L, ...Rr.reverse()];
}
const quad = (p0, p1, p2, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; });
/** A pointed leaf between two tips: [tip, control, tip, control]. */
function leafQ(base, ang, len, wid, rnd = null) {
    const d = [Math.cos(rad(ang)), Math.sin(rad(ang))], n = [-d[1], d[0]];
    const tip = [base[0] + d[0] * len, base[1] + d[1] * len];
    const m = [base[0] + d[0] * len * (0.45 + (rnd ? jit(rnd, 0.08) : 0)), base[1] + d[1] * len * 0.45];
    const w1 = wid * (1 + (rnd ? jit(rnd, 0.2) : 0)), w2 = wid * (1 + (rnd ? jit(rnd, 0.2) : 0));
    return [base, [m[0] + n[0] * w1, m[1] + n[1] * w1], tip, [m[0] - n[0] * w2, m[1] - n[1] * w2]];
}
const leafD = q => `M${pt(q[0])}Q${pt(q[1])} ${pt(q[2])}Q${pt(q[3])} ${pt(q[0])}Z`;
const polyD = q => (q.k === 's' ? smooth(q.pts) : q.k === 'q' ? leafD(q.pts) : pth(q.pts));

const SIZES = {};
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    const { svg: s, problems } = sanitizeSvg(raw);
    if (s === undefined) throw new Error(`${name}.svg refused: ${problems.join('; ')}`);
    if (s.length > 58000) throw new Error(`${name}.svg is ${s.length} bytes`);
    SIZES[name] = s.length;
    writeFileSync(join(OUT, `${name}.svg`), s);
}
/** A layer of the bag: drawn round (0, 0) = the bag's centre, upright. */
const LBOX = {};
function svgL(name, lbox, inner) {
    LBOX[name] = lbox;
    svg(name, [G[0] + lbox[0], G[1] + lbox[1], lbox[2], lbox[3]], `<g transform="translate(${G[0]} ${G[1]})">${inner}</g>`);
}
/** A hard offset shadow: the same cut, moved, dark. Never blurred. */
const sh = (d, dx = 2.5, dy = 3.2, op = 0.4) => `<path d="${d}" transform="translate(${dx} ${dy})" fill="${C.shadow}" fill-opacity="${op}"/>`;
const clipDef = (id, d) => `<clipPath id="${id}"><path d="${d}"/></clipPath>`;

/* ---------- the stamps' dies: what is carved on each. Abstract and botanical only. ---------- */
const M = {
    /** A leaf cut as two half-blades with the midrib and the veins left out. */
    leaf(rnd, sz) {
        const L = sz * 2, w = sz * 0.62, g = sz * 0.06 + 0.22, polys = [];
        for (const sd of [-1, 1]) {
            const bulge = w * 2 * (0.9 + rnd() * 0.25);
            polys.push({ k: 'q', pts: [[sd * g, L / 2], [sd * (g + bulge), sz * 0.15 + jit(rnd, sz * 0.15)], [sd * g * 0.8, -L / 2], [sd * g, 0]] });
            if (sz < 4.5) continue;
            for (const t of [-0.2, 0.05, 0.28]) {
                const y0 = t * L + jit(rnd, sz * 0.05), y1 = y0 - sz * 0.3;
                const wy = w * (1 - ((2 * y1) / L) ** 2), x0 = sd * (g + 0.5), x1 = sd * (g + wy * 0.66), hw = 0.24 + sz * 0.014;
                polys.push({ k: 'p', pts: [[x0, y0 - hw], [x1, y1 - hw * 0.5], [x1, y1 + hw * 0.5], [x0, y0 + hw]] });
            }
        }
        return { polys, r: sz * 1.05 };
    },
    /** A sprig: a stem and loose leaflets, none touching. */
    sprig(rnd, sz) {
        const bend = jit(rnd, sz * 0.35);
        const cs = quad([0, sz], [bend, 0], [bend * 0.5, -sz * 0.62], 6);
        const hw0 = sz * 0.04 + 0.2;
        const polys = [{ k: 'p', pts: strip(cs, t => hw0 * (1 - 0.6 * t)) }];
        const ts = [0.2, 0.38, 0.56, 0.73, 0.89];
        ts.forEach((t, i) => {
            const k = Math.round(t * 6), c = cs[k], p = cs[Math.max(0, k - 1)];
            const ta = (Math.atan2(c[1] - p[1], c[0] - p[0]) * 180) / Math.PI;
            const sd = i % 2 ? 1 : -1, len = sz * (0.62 - 0.25 * t) * (0.9 + rnd() * 0.25);
            const nrm = rotP([0, sd * (hw0 + 0.55)], ta);
            polys.push({ k: 'q', pts: leafQ([c[0] + nrm[0], c[1] + nrm[1]], ta + sd * (50 + jit(rnd, 9)), len, len * 0.27, rnd) });
        });
        const e = cs[6], p = cs[5], ta = (Math.atan2(e[1] - p[1], e[0] - p[0]) * 180) / Math.PI;
        polys.push({ k: 'q', pts: leafQ([e[0] + Math.cos(rad(ta)) * 0.7, e[1] + Math.sin(rad(ta)) * 0.7], ta + jit(rnd, 8), sz * 0.42, sz * 0.12, rnd) });
        return { polys, r: sz * 1.08 };
    },
    /** A sunburst: a middle and blunt rays, long and short by turns. */
    sun(rnd, sz) {
        const polys = [{ k: 's', pts: ring(0, 0, sz * 0.2, rnd, 8, 0.07) }];
        const n = 11 + Math.floor(rnd() * 4), a0 = rnd() * 360;
        for (let i = 0; i < n; i++) {
            const a = a0 + (i / n) * 360 + jit(rnd, 3.5), r1 = sz * (0.36 + jit(rnd, 0.03)), r2 = sz * (i % 2 ? 0.76 : 1) * (0.93 + rnd() * 0.1);
            const w1 = sz * 0.04 + 0.16, w2 = sz * 0.085 + 0.22;
            polys.push({ k: 'p', pts: xf([[r1, -w1], [r2, -w2 * (0.8 + rnd() * 0.4)], [r2 + jit(rnd, 0.3), w2 * (0.8 + rnd() * 0.4)], [r1, w1]], { rot: a }) });
        }
        return { polys, r: sz * 1.04 };
    },
    /** Concentric rings and a middle. */
    rings(rnd, sz) {
        return { polys: [
            { k: 's', pts: ring(0, 0, sz, rnd, 16, 0.014) }, { k: 's', pts: ring(0, 0, sz * 0.86, rnd, 16, 0.016) },
            { k: 's', pts: ring(0, 0, sz * 0.6, rnd, 12, 0.02) }, { k: 's', pts: ring(0, 0, sz * 0.49, rnd, 12, 0.025) },
        ], r: sz * 1.03 };
    },
    dot(rnd, sz) {
        return { polys: [{ k: 's', pts: ring(0, 0, sz, rnd, 8, 0.1) }], r: sz * 1.1 };
    },
    daisy(rnd, sz) {
        const polys = [{ k: 's', pts: ring(0, 0, sz * 0.17, rnd, 7, 0.08) }];
        const n = 8, a0 = rnd() * 360;
        for (let i = 0; i < n; i++) {
            const a = a0 + (i / n) * 360 + jit(rnd, 4);
            polys.push({ k: 'q', pts: leafQ(rotP([sz * 0.3, 0], a), a, sz * 0.7 * (0.9 + rnd() * 0.15), sz * 0.19, rnd) });
        }
        return { polys, r: sz * 1.05 };
    },
    fern(rnd, sz) {
        const bend = jit(rnd, sz * 0.3) + sz * 0.15;
        const cs = quad([0, sz], [bend, 0], [bend * 0.2, -sz], 10);
        const hw0 = sz * 0.022 + 0.2;
        const polys = [{ k: 'p', pts: strip(cs, t => hw0 * (1 - 0.7 * t)) }];
        for (let k = 2; k <= 9; k++) {
            const c = cs[k], p = cs[k - 1], ta = (Math.atan2(c[1] - p[1], c[0] - p[0]) * 180) / Math.PI, t = k / 10;
            for (const sd of [-1, 1]) {
                const len = sz * (0.5 - 0.36 * t) * (0.88 + rnd() * 0.24), nrm = rotP([0, sd * (hw0 + 0.45)], ta);
                polys.push({ k: 'q', pts: leafQ([c[0] + nrm[0], c[1] + nrm[1]], ta + sd * (58 + jit(rnd, 7)), len, len * 0.2 + 0.2, rnd) });
            }
        }
        return { polys, r: sz * 1.05 };
    },
    tri(rnd, sz) {
        return { polys: [{ k: 'p', pts: [[-sz + jit(rnd, sz * 0.1), sz * 0.8], [jit(rnd, sz * 0.12), -sz * 0.9], [sz + jit(rnd, sz * 0.1), sz * 0.8 + jit(rnd, sz * 0.1)]] }], r: sz * 1.1 };
    },
    dia(rnd, sz) {
        return { polys: [{ k: 'p', pts: [[-sz * 0.7, jit(rnd, sz * 0.08)], [jit(rnd, sz * 0.08), -sz], [sz * 0.7, jit(rnd, sz * 0.08)], [jit(rnd, sz * 0.08), sz]] }], r: sz * 1.05 };
    },
    /** A bar: the long thin block used to print a rule in segments. */
    bar(rnd, sz) {
        const w = 0.55 + sz * 0.02;
        return { polys: [{ k: 'p', pts: [[-sz, -w + jit(rnd, 0.12)], [0, -w + jit(rnd, 0.12)], [sz, -w + jit(rnd, 0.12)], [sz + 0.2, w], [0, w + jit(rnd, 0.12)], [-sz - 0.2, w]] }], r: sz };
    },
};

/**
 * One impression of a die: `o` = { x, y, rot, sz, ink: [colour, darker], sub: the colour under it, k: how much
 * ink (0..1), starve: 0..1, dbl: a ghost beside it, halo: 'r' | 'c' the block's edge, part: one side of the
 * die never touched the paper, rnd }.
 */
function imp(motif, o) {
    const rnd = o.rnd, m = motif(rnd, o.sz), R = m.r, k = o.k ?? 0.86, st = o.starve ?? 0.5;
    const [ink, inkD] = o.ink, sub = o.sub;
    const at = { x: o.x, y: o.y, rot: o.rot ?? 0 };
    const dOf = tr => m.polys.map(q => polyD({ k: q.k, pts: xf(q.pts, tr) })).join('');
    let s = '';
    if (o.halo) {
        // the edge of the block touched the paper on one side
        const r = R * 1.16 + 0.8, a0 = rnd() * 360;
        let pts;
        if (o.halo === 'c') pts = Array.from({ length: 7 }, (_, i) => rotP([r + jit(rnd, 0.25), 0], a0 + i * (14 + rnd() * 6)));
        else pts = [[-r * (0.2 + rnd() * 0.7), -r + jit(rnd, 0.2)], [r * 0.1, -r + jit(rnd, 0.25)], [r * (0.5 + rnd() * 0.4), -r + jit(rnd, 0.2)]].map(p => rotP(p, Math.floor(rnd() * 4) * 90 + jit(rnd, 3)));
        s += `<path d="${pth(xf(pts, at), false)}" fill="none" stroke="${ink}" stroke-width="${f2(0.4 + rnd() * 0.3)}" stroke-opacity="${f2(0.2 + rnd() * 0.16)}" stroke-dasharray="${f(r * (0.4 + rnd() * 0.5))} ${f(0.8 + rnd() * 1.6)} ${f(r)} ${f(0.5 + rnd() * 2)}"/>`;
    }
    if (o.shadow) s += sh(dOf(at), 1.3, 1.7, 0.34);
    if (o.dbl) s += `<path d="${dOf({ x: o.x + 0.7 + jit(rnd, 0.9), y: o.y + jit(rnd, 1.1), rot: at.rot + jit(rnd, 3) })}" fill="${ink}" fill-opacity="${f2(k * 0.28)}" fill-rule="evenodd"/>`;
    const dash = Array.from({ length: 6 }, (_, i) => f(i % 2 ? 0.4 + rnd() * R * 0.5 : 1 + rnd() * R * 1.1)).join(' ');
    s += `<path d="${dOf(at)}" fill="${ink}" fill-opacity="${f2(k)}" fill-rule="evenodd" stroke="${inkD}" stroke-width="${f2(o.ew ?? 0.34 + R * 0.012)}" stroke-opacity="${f2(Math.min(1, k * 0.8))}" stroke-dasharray="${dash}" stroke-linejoin="round"/>`;
    // the starved middle and the side that got less pressure: the paper showing through, in hard-edged patches
    const u = rotP([1, 0], rnd() * 360);
    const nb = Math.round(st * 2.6 + rnd() * 0.8);
    for (let i = 0; i < nb; i++) {
        const c = i === 0 ? [jit(rnd, R * 0.15), jit(rnd, R * 0.15)] : [u[0] * R * (0.2 + rnd() * 0.5) + jit(rnd, R * 0.2), u[1] * R * (0.2 + rnd() * 0.5) + jit(rnd, R * 0.2)];
        s += `<path d="${smooth(xf(ring(c[0], c[1], R * (0.22 + rnd() * 0.3), rnd, 7, 0.28, R * (0.16 + rnd() * 0.26)), at))}" fill="${sub}" fill-opacity="${f2(0.1 + st * 0.3 * rnd())}"/>`;
    }
    if (o.part) {
        const c = rotP([R * (0.85 + rnd() * 0.2), 0], rnd() * 360);
        s += `<path d="${smooth(xf(ring(c[0], c[1], R * 0.78, rnd, 9, 0.16, R * 0.62), at))}" fill="${sub}" fill-opacity="0.93"/>`;
    }
    // chips the ink missed
    let chips = '';
    const nc = Math.round(st * 5 * rnd() + (R > 6 ? 1 : 0));
    for (let i = 0; i < nc; i++) {
        const c = rotP([R * (0.3 + rnd() * 0.7), 0], rnd() * 360), r = 0.35 + R * (0.03 + rnd() * 0.07);
        chips += pth(xf(ring(c[0], c[1], r, rnd, 4 + Math.floor(rnd() * 2), 0.4, r * (0.4 + rnd() * 0.6)), at));
    }
    if (chips) s += `<path d="${chips}" fill="${sub}" fill-opacity="0.9"/>`;
    // specks: the paper's grain refusing the ink, thicker on the weak side
    const ns = Math.min(64, Math.round(R * R * 0.13 * (0.35 + st)));
    const dots = ['', '', ''];
    for (let i = 0; i < ns; i++) {
        let p;
        for (let tries = 0; tries < 4; tries++) {
            const a = rnd() * TAU, r = R * Math.sqrt(rnd());
            p = [Math.cos(a) * r, Math.sin(a) * r];
            if (rnd() < 0.3 + 0.7 * ((p[0] * u[0] + p[1] * u[1]) / R + 1) * 0.5) break;
        }
        const q = xf([p], at)[0], w = rnd();
        dots[w < 0.6 ? 0 : w < 0.9 ? 1 : 2] += `M${pt(q)}h0`;
    }
    [0.42, 0.75, 1.2].forEach((w, i) => { if (dots[i]) s += `<path d="${dots[i]}" fill="none" stroke="${sub}" stroke-width="${w}" stroke-linecap="round" stroke-opacity="0.92"/>`; });
    return s;
}

/** Short fibres and flecks lying in a sheet of paper. */
function flecks(rnd, n, x0, y0, x1, y1, col, op, w = 0.35, ang = 0, spread = 40, len = 4) {
    let d = '';
    for (let i = 0; i < n; i++) {
        const v = rotP([0.8 + rnd() * len, 0], ang + jit(rnd, spread));
        d += `M${f(x0 + rnd() * (x1 - x0))} ${f(y0 + rnd() * (y1 - y0))}l${f(v[0])} ${f(v[1])}`;
    }
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round"/>`;
}
/** A crease: a hard dark sliver with a hard light one beside it. */
function crease(a, b, rnd, { dark = C.kraftDk, light = C.kraftHi, w = 0.55, od = 0.75, ol = 0.7, side = 1 } = {}) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), n = [(-dy / l) * 0.75 * side, (dx / l) * 0.75 * side];
    const wob = () => { const t = 0.3 + rnd() * 0.4; return [a[0] + dx * t + jit(rnd, 0.5), a[1] + dy * t + jit(rnd, 0.5)]; };
    const m1 = wob(), m2 = wob();
    return `<path d="M${pt(a)}L${pt(m1)}L${pt(b)}" fill="none" stroke="${dark}" stroke-width="${w}" stroke-opacity="${od}" stroke-dasharray="${f(l * (0.2 + rnd() * 0.3))} ${f(0.5 + rnd())} ${f(l * 0.5)} ${f(0.4 + rnd())}"/>` +
        `<path d="M${pt([a[0] + n[0], a[1] + n[1]])}L${pt([m2[0] + n[0], m2[1] + n[1]])}L${pt([b[0] + n[0], b[1] + n[1]])}" fill="none" stroke="${light}" stroke-width="${w + 0.15}" stroke-opacity="${ol}" stroke-dasharray="${f(l * (0.3 + rnd() * 0.3))} ${f(1 + rnd() * 2)} ${f(l * 0.3)} ${f(0.6 + rnd())}"/>`;
}
/** Long thin slivers of tone: a wrinkle in paper, a grain in wood. */
function slivers(rnd, n, x0, y0, x1, y1, ang, spread, len, th, col, op) {
    let d = '';
    for (let i = 0; i < n; i++) {
        const l = len * (0.4 + rnd()), t = th * (0.4 + rnd());
        d += pth(xf([[0, 0], [l * (0.3 + rnd() * 0.4), -t], [l, jit(rnd, t)], [l * (0.3 + rnd() * 0.4), t * 0.3]], { x: x0 + rnd() * (x1 - x0), y: y0 + rnd() * (y1 - y0), rot: ang + jit(rnd, spread) }));
    }
    return `<path d="${d}" fill="${col}" fill-opacity="${op}"/>`;
}
const zig = (x0, x1, y, amp, step, rnd) => {
    const n = Math.round((x1 - x0) / step), out = [];
    for (let i = 0; i <= n; i++) out.push([x0 + ((x1 - x0) * i) / n, y + (i % 2 ? amp : 0) + jit(rnd, 0.25)]);
    return out;
};

const GB = [-12, -176, 384, 640];

/* ---------- ground: the stained table and the cutting mat ---------- */
{
    const rnd = rng(101);
    let s = `<rect x="-12" y="-176" width="384" height="640" fill="${C.wood}"/>`;
    s += slivers(rnd, 46, 250, -176, 372, 460, 86, 5, 90, 1.6, C.woodLo, 0.9);
    s += slivers(rnd, 30, 250, -176, 372, 460, 86, 5, 70, 1.1, C.woodHi, 0.7);
    s += `<path d="M352 -176l-8 320l-5 320M372 40l-6 420" fill="none" stroke="${C.woodLo}" stroke-width="1.3"/>`;
    // the mat, turned a little: everything on it is drawn in its own frame
    const MA = 4.6;
    let m = '';
    const edge = [[352, -230], [352.6, 20], [351.6, 300], [352.3, 560]];
    const matD = pth([[-140, -230], ...edge, [-140, 560]]);
    m += `<path d="${matD}" transform="translate(3.5 2)" fill="${C.shadow}" fill-opacity="0.55"/>`;
    m += `<path d="${matD}" fill="${C.mat}"/>`;
    m += `<defs>${clipDef('cm', matD)}</defs><g clip-path="url(#cm)">`;
    // wear: where the work is done the mat is scuffed pale; old stains are darker
    m += slivers(rnd, 26, 0, -150, 300, 440, 90, 9, 110, 5, C.matHi, 0.22) + slivers(rnd, 18, 0, -150, 300, 440, 0, 9, 120, 4, C.matLo, 0.3);
    // the printed grid, worn
    let thin = '', bold = '';
    for (let i = 0; i < 24; i++) {
        const x = 344 - i * 22, seg = `M${f(x)} -230V560`;
        if (i % 5 === 0) bold += seg; else thin += seg;
    }
    for (let i = 0; i < 36; i++) {
        const y = -214 + i * 22, seg = `M-140 ${f(y)}H344`;
        if (i % 5 === 2) bold += seg; else thin += seg;
    }
    m += `<path d="${thin}" fill="none" stroke="${C.matLine}" stroke-width="0.4" stroke-opacity="0.34" stroke-dasharray="46 1.5 90 3 20 0.8 130 2"/>`;
    m += `<path d="${bold}" fill="none" stroke="${C.matLine}" stroke-width="0.7" stroke-opacity="0.42" stroke-dasharray="70 2 33 1 150 4"/>`;
    // ticks along the edge (no figures)
    let ticks = '';
    for (let i = 0; i < 140; i++) { const y = -214 + i * 5.5; ticks += `M344 ${f(y)}h${i % 4 === 0 ? 5 : 2.6}`; }
    m += `<path d="${ticks}" fill="none" stroke="${C.matLine}" stroke-width="0.45" stroke-opacity="0.5"/>`;
    // knife scars: hard pale hairlines, mostly along the rule
    let scars = '';
    for (let i = 0; i < 46; i++) {
        const v = rotP([14 + rnd() * 70, 0], (rnd() < 0.6 ? 90 : 0) + jit(rnd, 14));
        scars += `M${f(rnd() * 340)} ${f(-140 + rnd() * 600)}l${f(v[0])} ${f(v[1])}`;
    }
    m += `<path d="${scars}" fill="none" stroke="#86B09B" stroke-width="0.35" stroke-opacity="0.3"/>`;
    m += flecks(rnd, 120, -10, -150, 345, 470, '#86B09B', 0.25, 0.4, 0, 180, 1.2);
    // ink that missed the paper: impressions that ran off a sheet which is no longer there
    m += `<defs>${clipDef('g1', pth([[196, -80], [268, -70], [262, -20], [190, -26]]))}${clipDef('g2', pth([[10, 210], [70, 204], [76, 300], [14, 300]]))}</defs>`;
    m += `<g clip-path="url(#g1)" opacity="0.5">${imp(M.sun, { x: 262, y: -44, sz: 15, ink: INK.brick, sub: C.mat, k: 0.7, starve: 0.9, rnd })}</g>`;
    m += `<g clip-path="url(#g2)" opacity="0.4">${imp(M.fern, { x: 14, y: 250, sz: 20, rot: 70, ink: INK.cream, sub: C.mat, k: 0.6, starve: 0.9, rnd })}</g>`;
    // a few dabs where a stamp was tried or set down
    m += `<g opacity="0.42">${imp(M.dot, { x: 288, y: 52, sz: 3, ink: INK.brick, sub: C.mat, k: 0.8, starve: 0.6, rnd })}${imp(M.tri, { x: 226, y: 420, sz: 5, rot: 20, ink: INK.cream, sub: C.mat, k: 0.6, starve: 0.8, rnd })}${imp(M.leaf, { x: 120, y: -112, sz: 7, rot: 40, ink: INK.cream, sub: C.mat, k: 0.5, starve: 0.9, rnd })}</g>`;
    m += '</g>';
    // the mat's cut edge catches a little light
    m += `<path d="${pth(edge, false)}" fill="none" stroke="${C.matHi}" stroke-width="1" stroke-opacity="0.9"/>`;
    s += `<g transform="rotate(${MA} 352 -170)">${m}</g>`;
    svg('ground', GB, s);
}

/** A sheet of paper: a cut with a hard shadow; `inner` is clipped to it. */
function sheet(id, pts, fill, inner, rnd, { shadow = [2, 2.6], tone = C.creamLo, hi = C.creamHi } = {}) {
    const d = pth(pts);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    let s = `<defs>${clipDef(id, d)}</defs>${sh(d, shadow[0], shadow[1], 0.42)}<path d="${d}" fill="${fill}"/><g clip-path="url(#${id})">`;
    // a soft fold or two across it, and a handled corner
    s += slivers(rnd, 3, x0, y0, x1, y1, rnd() * 180, 40, (x1 - x0) * 0.8, 1.6, tone, 0.5);
    s += slivers(rnd, 2, x0, y0, x1, y1, rnd() * 180, 40, (x1 - x0) * 0.7, 1.1, hi, 0.8);
    s += `<path d="${pth([pts[0], mid(pts[0], pts[1]), mid(pts[0], pts[3])])}" fill="${tone}" fill-opacity="0.35"/>`;
    s += flecks(rnd, Math.round(((x1 - x0) * (y1 - y0)) / 90), x0, y0, x1, y1, tone, 0.7, 0.35, 0, 180, 1.6);
    return s + inner + '</g>';
}

/* ---------- scraps: trial sheets and offcuts lying on the mat ---------- */
{
    const rnd = rng(202);
    let s = '';
    // sheet A, lower left, mostly under the bag
    {
        const P = rectP(58, 372, 124, 84, 9, rnd, 0.8);
        let t = imp(M.fern, { x: 38, y: 366, sz: 22, rot: -30, ink: INK.cream, sub: C.kraftLo, k: 0.8, starve: 0.6, halo: 'r', rnd });
        t += imp(M.dot, { x: 74, y: 398, sz: 3, ink: INK.green, sub: C.kraftLo, k: 0.9, starve: 0.3, rnd });
        t += imp(M.dot, { x: 86, y: 399, sz: 3, ink: INK.green, sub: C.kraftLo, k: 0.7, starve: 0.6, rnd });
        t += imp(M.dot, { x: 97, y: 401.5, sz: 3, ink: INK.green, sub: C.kraftLo, k: 0.5, starve: 0.9, rnd });
        s += sheet('sa', P, C.kraftLo, t, rnd, { tone: C.kraftDk, hi: C.kraftHi });
    }
    // a pinked offcut of kraft under the bag's foot, with a border tried on it
    {
        const top = zig(-52, 52, -11, 2.6, 4.3, rnd), P = xf([...top, [52, 12], [-52, 11]], { x: 168, y: 398, rot: -7 });
        let t = '';
        for (let i = 0; i < 8; i++) t += imp(M.tri, { ...xf([[-40 + i * 11.4 + jit(rnd, 1.2), 2 + jit(rnd, 1)]], { x: 168, y: 398, rot: -7 })[0].reduce((o, v, j) => ({ ...o, [j ? 'y' : 'x']: v }), {}), sz: 3.6, rot: -7 + jit(rnd, 9), ink: i % 3 === 2 ? INK.brick : INK.green, sub: C.kraftLo, k: 0.9 - i * 0.07, starve: 0.3 + i * 0.08, rnd });
        s += sheet('sc', P, C.kraftLo, t, rnd, { tone: C.kraftDk, hi: C.kraftHi });
    }
    // sheet B, upper left: the trial sheet. Sunbursts tried twice in green, once in brick running off the edge,
    // and the same leaf three times without re-inking, each weaker than the last.
    {
        const P = rectP(70, 80, 118, 88, -11, rnd, 0.9);
        let t = imp(M.sun, { x: 48, y: 74, sz: 15, rot: 10, ink: INK.green, sub: '#E1D4B4', k: 0.5, starve: 1, rnd });
        t += imp(M.sun, { x: 66, y: 84, sz: 15, rot: 40, ink: INK.green, sub: '#E1D4B4', k: 0.84, starve: 0.45, dbl: true, rnd });
        t += imp(M.sun, { x: 22, y: 112, sz: 15, rot: 5, ink: INK.brick, sub: '#E1D4B4', k: 0.88, starve: 0.4, rnd });
        t += imp(M.leaf, { x: 92, y: 60, sz: 8, rot: 24, ink: INK.green, sub: '#E1D4B4', k: 0.92, starve: 0.2, rnd });
        t += imp(M.leaf, { x: 106, y: 66, sz: 8, rot: 38, ink: INK.green, sub: '#E1D4B4', k: 0.66, starve: 0.6, rnd });
        t += imp(M.leaf, { x: 118, y: 76, sz: 8, rot: 15, ink: INK.green, sub: '#E1D4B4', k: 0.4, starve: 1, rnd });
        t += imp(M.rings, { x: 100, y: 104, sz: 9, ink: INK.brick, sub: '#E1D4B4', k: 0.8, starve: 0.6, rnd });
        t += imp(M.dot, { x: 40, y: 48, sz: 2.6, ink: INK.brick, sub: '#E1D4B4', k: 0.85, starve: 0.4, rnd });
        t += imp(M.dot, { x: 50, y: 45, sz: 2.6, ink: INK.brick, sub: '#E1D4B4', k: 0.6, starve: 0.7, rnd });
        s += sheet('sb', P, '#E1D4B4', t, rnd, { tone: '#C9B992' });
    }
    // a narrow offcut at the top, seen only when open: a rule printed in segments, and leaves beside it
    {
        const P = rectP(58, -34, 92, 24, 31, rnd, 0.7);
        let t = '';
        for (let i = 0; i < 5; i++) {
            const [x, y] = xf([[-36 + i * 17 + jit(rnd, 1.5), 5 + jit(rnd, 0.7)]], { x: 58, y: -34, rot: 31 })[0];
            t += imp(M.bar, { x, y, sz: 9.2, rot: 31 + jit(rnd, 2.5), ink: INK.green, sub: C.creamLo, k: 0.86 - i * 0.09, starve: 0.3 + i * 0.12, rnd });
            const [x2, y2] = xf([[-34 + i * 16 + jit(rnd, 2), -4 + jit(rnd, 1)]], { x: 58, y: -34, rot: 31 })[0];
            if (i !== 3) t += imp(M.leaf, { x: x2, y: y2, sz: 4, rot: 31 + (i % 2 ? 62 : -58) + jit(rnd, 10), ink: INK.brick, sub: C.creamLo, k: 0.85, starve: 0.4, rnd });
        }
        s += sheet('sd', P, C.creamLo, t, rnd, { tone: '#C9B88F' });
    }
    // punchings from the handle holes
    for (const [x, y, r, c] of [[232, 28, 3.2, C.kraft], [246, 37, 3, C.kraftLo], [18, 190, 3.1, C.kraft], [286, 386, 3.2, C.kraft]]) {
        const d = smooth(ring(x, y, r, rnd, 8, 0.05));
        s += sh(d, 1, 1.3, 0.4) + `<path d="${d}" fill="${c}"/>`;
    }
    svg('scraps', GB, s);
}

/* ---------- objects: the ink pad, stamps on their sides, the tape, a dried sprig ---------- */
/** A stamp lying on its side, drawn along +x from the knob to the die; `ink` stains the die. */
function lyingStamp(rnd, { x, y, rot, s = 1, ink, round = false }) {
    const tr = { x, y, rot, s };
    const knob = round ? ring(-24, 0, 8.5, rnd, 10, 0.03) : [[-31, -5], [-28, -8.6], [-20, -9], [-15, -6], [-15, 6], [-20, 9], [-28, 8.6], [-31, 5]];
    const neck = [[-17, -4.6], [-9, -3.6], [-6, -9], [-4, -12.6], [-4, 12.6], [-6, 9], [-9, 3.6], [-17, 4.6]];
    const block = [[-4.4, -13.4], [10, -13.6], [10.2, 13.5], [-4.2, 13.4]];
    const dK = round ? smooth(xf(knob, tr)) : smooth(xf(knob, tr)), dN = pth(xf(neck, tr)), dB = pth(xf(block, tr));
    const cush = pth(xf([[10, -13], [12.6, -13], [12.8, 13], [10.2, 13]], tr)), die = pth(xf([[12.6, -12.2], [14.6, -12.4], [14.8, 12.2], [12.8, 12.4]], tr));
    let o = sh(dK + dN + dB + cush + die, 2.6, 3.4, 0.45);
    o += `<path d="${dN}" fill="${C.woodTLo}"/><path d="${dK}" fill="${C.woodT}"/><path d="${dB}" fill="${C.woodT}"/>`;
    // the turned wood as flat tone: a darker under-side, a pale facet, two printed grooves
    o += `<path d="${pth(xf([[-4.2, 5], [10.1, 4.4], [10.2, 13.5], [-4.2, 13.4]], tr))}" fill="${C.woodTLo}" fill-opacity="0.8"/>`;
    o += `<path d="${pth(xf([[-3.4, -12], [9.4, -12.2], [9.4, -9.6], [-3.4, -9.2]], tr))}" fill="${C.woodTHi}" fill-opacity="0.85"/>`;
    o += `<path d="${smooth(xf(round ? [[-31, -3], [-28, -7], [-20, -7], [-17, -3]] : [[-29, -4], [-26, -7], [-19, -7.2], [-17, -5], [-21, -4], [-27, -3]], tr))}" fill="${C.woodTHi}" fill-opacity="0.7"/>`;
    o += `<path d="${smooth(xf(round ? ring(-23, 4.6, 5.5, rnd, 7, 0.1, 2.6) : [[-30, 3], [-24, 4.4], [-16, 3.6], [-16, 6], [-21, 8.6], [-28, 8]], tr))}" fill="${C.woodTLo}" fill-opacity="0.7"/>`;
    o += `<path d="${pth(xf([[-12.5, -4], [-12.2, 4]], tr), false)}${pth(xf([[-7, -7.4], [-6.8, 7.4]], tr), false)}" fill="none" stroke="${C.brown}" stroke-width="0.5" stroke-opacity="0.7"/>`;
    o += slivers(rnd, 4, x - 4 * s, y - 4 * s, x + 4 * s, y + 4 * s, rot + jit(rnd, 6), 4, 9 * s, 0.5, C.woodTLo, 0.7);
    o += `<path d="${cush}" fill="${C.tin}"/><path d="${die}" fill="${ink[0]}"/>`;
    // inky thumb marks on the block
    o += `<path d="${smooth(xf(ring(6.5, -4 + jit(rnd, 5), 2.6, rnd, 7, 0.3, 4), tr))}" fill="${ink[0]}" fill-opacity="0.5"/>`;
    o += `<path d="${smooth(xf(ring(8.6, 7, 1.5, rnd, 6, 0.3, 2.2), tr))}" fill="${ink[1]}" fill-opacity="0.45"/>`;
    return o;
}
{
    const rnd = rng(303);
    let s = '';
    // the dried sprig along the left: a cut of brown paper, seed heads printed on
    {
        const cs = quad([33, 322], [30, 240], [60, 150], 12);
        let d = pth(strip(cs, t => 1.3 * (1 - 0.7 * t)));
        const heads = [];
        for (let k = 3; k <= 12; k++) {
            const c = cs[k], p = cs[k - 1], ta = (Math.atan2(c[1] - p[1], c[0] - p[0]) * 180) / Math.PI;
            const sd = k % 2 ? 1 : -1, len = 13 + rnd() * 12, a = ta + sd * (34 + jit(rnd, 10));
            const e = [c[0] + Math.cos(rad(a)) * len, c[1] + Math.sin(rad(a)) * len];
            d += pth(strip(quad(c, [c[0] + Math.cos(rad(ta)) * len * 0.5, c[1] + Math.sin(rad(ta)) * len * 0.5], e, 3), t => 0.6 * (1 - 0.5 * t)));
            heads.push([e, a]);
        }
        s += sh(d, 1.6, 2, 0.4) + `<path d="${d}" fill="#6B4A2C"/>`;
        heads.forEach(([e, a], i) => {
            const q = leafQ(e, a + jit(rnd, 12), 7 + rnd() * 3, 2.6 + rnd(), rnd), dd = leafD(q);
            s += sh(dd, 1.2, 1.6, 0.35) + `<path d="${dd}" fill="${i % 3 === 0 ? C.brick : i % 3 === 1 ? C.straw : C.brickL}"/>`;
            s += `<path d="${pth([q[0], q[2]], false)}" fill="none" stroke="${i % 3 === 1 ? C.strawLo : C.brickD}" stroke-width="0.5" stroke-dasharray="1.6 0.8"/>`;
        });
    }
    // the tape: a roll seen from above and its tail, torn, printed with the small leaf
    {
        const cx = 302, cy = 322;
        const tail = xf([[-2, -8], [72, -9], [75, -5], [73, -1], [76, 3], [73, 7.6], [-2, 8]], { x: cx - 4, y: cy + 15, rot: 148 });
        const dT = pth(tail);
        s += sh(dT, 1.4, 1.8, 0.4) + `<defs>${clipDef('wt', dT)}</defs><path d="${dT}" fill="${C.cream}" fill-opacity="0.94"/><g clip-path="url(#wt)">`;
        for (let i = 0; i < 6; i++) {
            const [x, y] = xf([[8 + i * 11.6 + jit(rnd, 1.3), jit(rnd, 1.2)]], { x: cx - 4, y: cy + 15, rot: 148 })[0];
            s += imp(M.leaf, { x, y, sz: 4.3, rot: 148 + (i % 2 ? 58 : -52) + jit(rnd, 9), ink: i === 4 ? INK.brick : INK.green, sub: C.cream, k: 0.9 - (i % 3) * 0.16, starve: 0.25 + (i % 3) * 0.25, rnd });
            const [x2, y2] = xf([[13.6 + i * 11.6 + jit(rnd, 1.2), (i % 2 ? -4.6 : 4.6) + jit(rnd, 0.6)]], { x: cx - 4, y: cy + 15, rot: 148 })[0];
            if (i !== 2) s += imp(M.dot, { x: x2, y: y2, sz: 1.1, ink: INK.brick, sub: C.cream, k: 0.85, starve: 0.2, rnd });
        }
        s += '</g>';
        const outer = smooth(ring(cx, cy, 24, rnd, 18, 0.012)), core = smooth(ring(cx + 0.6, cy - 0.4, 12.4, rnd, 14, 0.015)), hole = smooth(ring(cx + 0.8, cy - 0.3, 9.6, rnd, 12, 0.02));
        s += sh(outer + hole, 2.6, 3.4, 0.45);
        s += `<path d="${outer}${hole}" fill="${C.cream}" fill-rule="evenodd"/><path d="${core}${hole}" fill="${C.kraftLo}" fill-rule="evenodd"/>`;
        // the wound tape seen edge-on: broken rings of its inks
        [[22.4, C.green, 0.8, 0.7], [20, C.creamLo, 1.2, 0.9], [17.6, C.brick, 0.6, 0.6], [15.6, C.green, 0.5, 0.5], [13.6, C.creamLo, 0.8, 0.9]].forEach(([r, col, w, op]) => {
            s += `<path d="${smooth(ring(cx + jit(rnd, 0.4), cy + jit(rnd, 0.4), r, rnd, 14, 0.012))}" fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity="${op}" stroke-dasharray="${f(9 + rnd() * 20)} ${f(1 + rnd() * 3)} ${f(20 + rnd() * 30)} ${f(2 + rnd() * 5)}"/>`;
        });
        s += `<path d="${smooth(ring(cx + 0.7, cy - 0.3, 11, rnd, 12, 0.02))}" fill="none" stroke="${C.kraftDk}" stroke-width="0.7" stroke-dasharray="14 3 7 2"/>`;
    }
    // two stamps on their sides
    s += lyingStamp(rnd, { x: 302, y: 216, rot: 104, s: 1.32, ink: INK.green });
    s += lyingStamp(rnd, { x: 270, y: 270, rot: -38, s: 1.05, ink: INK.brick, round: true });
    // the ink pad: a flat tin, its lid off, the brick pad worn pale where the stamps go
    {
        const tr = { x: 300, y: 107, rot: 8 };
        const tin = smooth(xf([[-41, -25], [-34, -28.4], [34, -28.4], [41, -25], [41.4, 25], [34, 28.4], [-34, 28.4], [-41.4, 25]], tr));
        const pad = pth(xf([[-35.6, -22.6], [35.4, -23], [35.8, 22.6], [-35.4, 23]], tr));
        s += sh(tin, 3, 3.8, 0.5) + `<path d="${tin}" fill="${C.tin}"/>`;
        s += `<path d="${smooth(xf([[-40, -23], [-34, -27.4], [34, -27.4], [39, -24], [38, -23], [-34, -25.4]], tr))}" fill="${C.tinHi}"/>`;
        s += `<defs>${clipDef('pd', pad)}</defs><path d="${pad}" fill="${C.brick}"/><g clip-path="url(#pd)">`;
        // worn flat where the blocks go: hard-edged, matte
        s += `<path d="${pth(xf([[-31, -17], [-8, -19], [12, -17.4], [13, 8], [10, 16], [-29, 15], [-32, 2]], tr))}" fill="${C.brickL}" fill-opacity="0.5"/>`;
        s += `<path d="${pth(xf([[-15, -21], [22, -20], [23, 13], [-14, 14.6]], tr))}" fill="${C.brickL}" fill-opacity="0.4"/>`;
        s += `<path d="${pth(xf([[-36, 16], [36, 14], [36, 23], [-36, 23]], tr))}" fill="${C.brickD}" fill-opacity="0.55"/>`;
        // the square dents the block leaves in the felt
        s += `<path d="${pth(xf([[-33, -19], [9, -20.4], [10, 17], [-32, 18]], tr))}${pth(xf([[-18, -21], [23, -20], [22.4, 15], [-19, 16]], tr))}" fill="none" stroke="${C.brickD}" stroke-width="0.6" stroke-opacity="0.6" stroke-dasharray="20 3 9 2 30 5"/>`;
        s += flecks(rnd, 80, 262, 80, 338, 134, C.brickD, 0.6, 0.45, 0, 180, 0.9);
        s += '</g>';
        // ink walked onto the rim
        s += `<path d="${smooth(xf(ring(-38.6, 6, 1.8, rnd, 6, 0.3, 4), tr))}${smooth(xf(ring(12, 26, 3.4, rnd, 6, 0.3, 1.4), tr))}" fill="${C.brick}" fill-opacity="0.8"/>`;
    }
    // along the foot of the table: a wooden rule (ticks, no figures), a hank of twine, offcuts
    {
        const tr = { x: 232, y: 428, rot: -6 };
        const R = pth(xf([[-150, -9], [150, -9.4], [150.4, 9], [-150, 9.4]], tr));
        s += sh(R, 2.4, 3, 0.45) + `<defs>${clipDef('rl', R)}</defs><path d="${R}" fill="${C.woodT}"/><g clip-path="url(#rl)">`;
        s += `<path d="${pth(xf([[-151, 3.6], [151, 2.8], [151, 10], [-151, 10]], tr))}" fill="${C.woodTLo}" fill-opacity="0.75"/>`;
        s += slivers(rnd, 14, 90, 408, 370, 446, -6, 3, 60, 0.7, C.woodTLo, 0.6) + slivers(rnd, 8, 90, 408, 370, 446, -6, 3, 50, 0.6, C.woodTHi, 0.7);
        let tk = '';
        for (let i = 0; i < 75; i++) { const a = xf([[-148 + i * 4, -9.4]], tr)[0], b = xf([[-148 + i * 4 + jit(rnd, 0.15), -9.4 + (i % 10 === 0 ? 7.4 : i % 5 === 0 ? 5.4 : 3.2)]], tr)[0]; tk += `M${pt(a)}L${pt(b)}`; }
        s += `<path d="${tk}" fill="none" stroke="${C.brown}" stroke-width="0.5" stroke-opacity="0.8" stroke-dasharray="2.6 0.5 3 0.4"/>`;
        s += `<path d="${smooth(xf(ring(-60, 2, 5, rnd, 7, 0.3, 3), tr))}" fill="${C.green}" fill-opacity="0.5"/><path d="${smooth(xf(ring(38, -3, 3, rnd, 6, 0.3, 4.4), tr))}" fill="${C.brick}" fill-opacity="0.5"/>`;
        s += '</g>';
        // twine: a loose hank, each turn a separate broken line
        let tw = '', tw2 = '';
        for (let i = 0; i < 7; i++) {
            const d = smooth(xf(ring(jit(rnd, 2.4), jit(rnd, 2), 13 + jit(rnd, 3.4), rnd, 9, 0.07, 8 + jit(rnd, 2.4)), { x: 122, y: 414, rot: 20 + jit(rnd, 30) }));
            if (i % 2) tw += d; else tw2 += d;
        }
        const tail = smooth([[132, 420], [148, 430], [156, 418], [172, 422], [182, 414]], false);
        s += `<path d="${tw}${tw2}${tail}" transform="translate(1.6 2)" fill="none" stroke="${C.shadow}" stroke-opacity="0.4" stroke-width="1.5"/>`;
        s += `<path d="${tw}${tail}" fill="none" stroke="${C.straw}" stroke-width="1.3" stroke-dasharray="7 0.7 4 0.6 11 0.8"/><path d="${tw2}" fill="none" stroke="${C.strawLo}" stroke-width="1.3" stroke-dasharray="5 0.6 9 0.8"/>`;
        // two offcuts of printed paper
        for (const [x, y, w, h, r, col] of [[36, 428, 40, 15, 14, C.creamLo], [322, 392, 26, 18, -24, C.kraft]]) {
            const P = rectP(x, y, w, h, r, rnd, 1.2), d = pth(P);
            s += sh(d, 1.6, 2, 0.4) + `<path d="${d}" fill="${col}"/>` + imp(M.leaf, { x: x - 6, y, sz: 4.4, rot: r + 70, ink: INK.green, sub: col, k: 0.85, starve: 0.5, rnd }) + imp(M.leaf, { x: x + 5, y: y + 1, sz: 4.4, rot: r + 118, ink: INK.green, sub: col, k: 0.6, starve: 0.8, rnd });
        }
    }
    svg('objects', GB, s);
}

/* ---------- the bag ---------- */
const bodyPts = [[-HW, T], [HW, T], [HW + 0.7, B - 0.4], [-HW + 0.6, B + 0.4]];
/** The hand-stamped all-over: one sprig stamp, set down in staggered rows, never the same twice. */
function sprigAt(rnd, x, y, i, sub) {
    const k = [0.9, 0.78, 0.86, 0.6, 0.92, 0.7, 0.82, 0.5][i % 8];
    return imp(M.sprig, { x: x + jit(rnd, 3), y: y + jit(rnd, 2.6), sz: 9.4, rot: jit(rnd, 16) + (i % 2 ? 6 : -8), ink: INK.green, sub, k, starve: 1.15 - k, dbl: i % 6 === 2, halo: i % 5 === 1 ? 'r' : undefined, part: i % 7 === 4, rnd });
}
{
    const rnd = rng(404);
    const dB = pth(bodyPts);
    let s = `<defs>${clipDef('cb', dB)}</defs>${sh(dB, 4, 5, 0.5)}<path d="${dB}" fill="${C.kraft}"/><g clip-path="url(#cb)">`;
    // gussets pressed flat: one side takes the light, the other loses it
    s += `<path d="${pth([[70.6, T], [90, T], [90, 101], [71.6, 101]])}" fill="${C.kraftLo}" fill-opacity="0.5"/>`;
    s += `<path d="${pth([[-90, T], [-70.2, T], [-71.2, 101], [-90, 101]])}" fill="${C.kraftHi}" fill-opacity="0.45"/>`;
    // the folded-up foot of the bag
    s += `<path d="${pth([[-90, 73], [90, 72], [90, 101], [-90, 101]])}" fill="${C.kraftLo}" fill-opacity="0.32"/>`;
    s += `<path d="${pth([[-90, 101], [-61, 73], [-90, 73]])}" fill="${C.kraftHi}" fill-opacity="0.5"/><path d="${pth([[90, 101], [62, 72], [90, 72]])}" fill="${C.kraftDk}" fill-opacity="0.3"/>`;
    // handling: long hard slivers of tone, and the paper's fibres
    s += slivers(rnd, 7, -80, -90, 60, 80, 20, 50, 70, 1.5, C.kraftHi, 0.5);
    s += slivers(rnd, 6, -80, -90, 60, 80, -30, 50, 60, 1.3, C.kraftLo, 0.6);
    s += flecks(rnd, 150, -88, T, 88, B, C.kraftDk, 0.5, 0.32, 0, 30, 4);
    s += flecks(rnd, 90, -88, T, 88, B, C.kraftHi, 0.7, 0.36, 0, 40, 3.4);
    s += crease([70.6, T], [71.6, B], rnd) + crease([-70.2, T], [-71.2, B], rnd, { side: -1 });
    s += crease([-88, 73], [88, 72], rnd) + crease([-88, 100], [-61, 73], rnd, { od: 0.5 }) + crease([88, 100], [62, 72], rnd, { od: 0.5 });
    // where the seal sat: a rim of cleaner paper and two places where it took the surface with it
    s += `<path d="${smooth(ring(3, -72, 27.4, rnd, 16, 0.02))}${smooth(ring(3, -72, 25.6, rnd, 16, 0.02))}" fill="${C.kraftHi}" fill-opacity="0.55" fill-rule="evenodd"/>`;
    s += `<path d="${smooth(ring(-6, -62, 5, rnd, 7, 0.35, 3))}${smooth(ring(13, -56, 3.4, rnd, 6, 0.35, 2))}" fill="${C.kraftHi}" fill-opacity="0.75"/>`;
    // the all-over
    let i = 0;
    for (const [x, y] of [[-68, -47], [70, -50], [-64, -9], [-22, -13], [21, -10], [63, -14], [-43, 27], [0, 24], [43, 28], [86, 25]]) s += sprigAt(rnd, x, y, i++, C.kraft);
    for (const [x, y] of [[-43, -30], [42, -31], [-1, -34], [-22, 8], [22, 9], [64, 7], [-66, 9], [-64, 44]]) s += imp(M.dot, { x: x + jit(rnd, 2.4), y: y + jit(rnd, 2.4), sz: 1.9, ink: INK.brick, sub: C.kraft, k: 0.7 + rnd() * 0.25, starve: 0.3 + rnd() * 0.5, rnd });
    // the border above the foot: a rule printed in segments that do not quite meet, and a row of triangles
    for (let j = 0; j < 9; j++) s += imp(M.bar, { x: -76 + j * 19.4 + jit(rnd, 1.3), y: 63 + jit(rnd, 0.9), sz: 10.4, rot: jit(rnd, 2.6), ink: INK.green, sub: C.kraft, k: 0.9 - (j % 4) * 0.1, starve: 0.3 + (j % 4) * 0.15, rnd });
    for (let j = 0; j < 14; j++) s += imp(M.tri, { x: -78 + j * 12.1 + jit(rnd, 1.6), y: 54.4 + jit(rnd, 1.1), sz: 3.5, rot: jit(rnd, 11), ink: j % 4 === 3 ? INK.brick : INK.green, sub: C.kraft, k: 0.92 - (j % 5) * 0.09, starve: 0.25 + (j % 5) * 0.14, dbl: j === 5, part: j === 9, rnd });
    // one big pale sunburst that ran off the side of the bag
    s += imp(M.sun, { x: 80, y: 86, sz: 19, ink: INK.cream, sub: C.kraft, k: 0.62, starve: 0.8, rnd });
    s += '</g>';
    svgL('bag', [-94, T - 4, 196, B - T + 14], s);
}
/* the neck: the part of the front that the fold kept covered */
{
    const rnd = rng(405);
    const P = [[-HW, T - H - 0.6], [HW, T - H - 0.6], [HW, T + 0.8], [-HW, T + 0.8]], d = pth(P);
    let s = `<defs>${clipDef('cn', d)}</defs><path d="${d}" fill="${C.kraft}"/><g clip-path="url(#cn)">`;
    s += `<path d="${pth([[70.6, T - H - 1], [90, T - H - 1], [90, T + 1], [70.6, T + 1]])}" fill="${C.kraftLo}" fill-opacity="0.5"/><path d="${pth([[-90, T - H - 1], [-70.2, T - H - 1], [-70.2, T + 1], [-90, T + 1]])}" fill="${C.kraftHi}" fill-opacity="0.45"/>`;
    s += `<path d="${d}" fill="${C.kraftHi}" fill-opacity="0.22"/>`;
    s += flecks(rnd, 26, -88, T - H, 88, T, C.kraftDk, 0.5, 0.32, 0, 30, 4) + flecks(rnd, 16, -88, T - H, 88, T, C.kraftHi, 0.7, 0.36, 0, 40, 3.4);
    let i = 3;
    for (const [x, y] of [[-85, -116], [-28, -112], [16, -115], [60, -111]]) s += sprigAt(rnd, x, y, i++, C.kraft);
    s += crease([70.6, T - H], [70.6, T], rnd) + crease([-70.2, T - H], [-70.2, T], rnd, { side: -1 });
    // the crease the fold left
    s += `<path d="M-88 ${T + 0.2}H88" fill="none" stroke="${C.kraftDk}" stroke-width="0.9" stroke-opacity="0.8" stroke-dasharray="50 1.2 80 2"/><path d="M-88 ${T - 0.9}H88" fill="none" stroke="${C.kraftHi}" stroke-width="0.8" stroke-opacity="0.9" stroke-dasharray="30 2 90 1"/>`;
    s += '</g>';
    svgL('neck', [-HW - 1, T - H - 1, HW * 2 + 2, H + 2], s);
}
/* the fold: what shows when the bag is shut, and, turned over twice, the front of the bag at its mouth */
{
    const rnd = rng(406);
    const top = zig(-HW, HW, T, 2.4, 4, rnd);
    const P = [...top, [HW + 0.4, T + H], [-HW - 0.3, T + H + 0.2]], d = pth(P);
    let s = `<defs>${clipDef('cf', d)}</defs>`;
    // the fold stands a little proud of the bag: a hard dark sliver under its lower edge
    s += `<path d="${pth([[-HW + 1, T + H - 0.5], [HW + 1.6, T + H - 0.5], [HW + 1.6, T + H + 2.8], [-HW + 2.8, T + H + 2.4]])}" fill="${C.shadow}" fill-opacity="0.5"/>`;
    s += `<path d="${d}" fill="${C.band}"/><g clip-path="url(#cf)">`;
    s += `<path d="${pth([[70.6, T - 1], [90, T - 1], [90, T + H + 1], [70.6, T + H + 1]])}" fill="${C.kraftDk}" fill-opacity="0.32"/><path d="${pth([[-90, T - 1], [-70.2, T - 1], [-70.2, T + H + 1], [-90, T + H + 1]])}" fill="${C.kraftHi}" fill-opacity="0.4"/>`;
    // doubled paper: the lower edge is a rounded fold and takes the light; the layers show at the ends
    s += `<path d="${pth([[-90, T + H - 2.4], [90, T + H - 2.8], [90, T + H + 1], [-90, T + H + 1]])}" fill="${C.kraftHi}" fill-opacity="0.6"/>`;
    s += `<path d="M-88 ${T + H - 4.6}L-20 ${T + H - 4.2}L88 ${T + H - 4.8}" fill="none" stroke="${C.kraftDk}" stroke-width="0.45" stroke-opacity="0.5" stroke-dasharray="40 3 18 1.4 70 2"/>`;
    s += flecks(rnd, 34, -88, T, 88, T + H, C.kraftDk, 0.5, 0.32, 0, 30, 4) + flecks(rnd, 20, -88, T, 88, T + H, C.kraftHi, 0.7, 0.36, 0, 40, 3.4);
    s += slivers(rnd, 3, -80, T + 4, 40, T + H - 6, 0, 8, 60, 1, C.kraftLo, 0.6);
    // a vine border, leaf by leaf, with dots between: stamped along the fold by hand
    for (let j = 0; j < 14; j++) {
        const x = -79 + j * 12.2 + jit(rnd, 1.4), up = j % 2 === 0;
        s += imp(M.leaf, { x, y: T + 11.6 + (up ? -1.4 : 1.6) + jit(rnd, 0.9), sz: 4.6, rot: (up ? 58 : 122) + jit(rnd, 10), ink: INK.green, sub: C.band, k: 0.93 - (j % 4) * 0.1, starve: 0.2 + (j % 4) * 0.17, dbl: j === 9, part: j === 3, rnd });
        if (j % 3 !== 1) s += imp(M.dot, { x: x + 6 + jit(rnd, 0.8), y: T + 11.6 + (up ? 5.4 : -5) + jit(rnd, 0.7), sz: 1.25, ink: INK.brick, sub: C.band, k: 0.9, starve: 0.3, rnd });
    }
    s += '</g>';
    // the pinked edge catches light on one side of each tooth
    s += `<path d="${pth(top, false)}" fill="none" stroke="${C.kraftHi}" stroke-width="0.5" stroke-opacity="0.8" stroke-dasharray="2.4 2.3"/>`;
    svgL('fold-a', [-HW - 2, T, HW * 2 + 4, H + 3], s);
}
/* the handles: two cords of twisted paper. Shut, both lie flat on the front, held under the fold; open, the
   back one stands behind what comes out (it is drawn with the mouth) and the front one before it. */
function sampleSmooth(pts, per = 7) {
    const n = pts.length, out = [pts[0]];
    let cur = pts[0];
    for (let i = 1; i < n - 1; i++) {
        const end = i === n - 2 ? pts[n - 1] : mid(pts[i], pts[i + 1]);
        out.push(...quad(cur, pts[i], end, per).slice(1));
        cur = end;
    }
    return out;
}
/** A cord through `pts`: a hard shadow, the cord, the slanted marks of its twist, a pale edge. */
function cordArt(pts, col, lo, rnd) {
    const d = smooth(pts, false), line = sampleSmooth(pts);
    let ticks = '', acc = 0, next = 1;
    for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        while (acc + l >= next) {
            const t = (next - acc) / l, c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], nn = [-u[1], u[0]];
            const k = 1.9 + jit(rnd, 0.25), sl = 1.25 + jit(rnd, 0.3);
            ticks += `M${f(c[0] - nn[0] * k - u[0] * sl)} ${f(c[1] - nn[1] * k - u[1] * sl)}L${f(c[0] + nn[0] * k + u[0] * sl)} ${f(c[1] + nn[1] * k + u[1] * sl)}`;
            next += 2.5 + jit(rnd, 0.35);
        }
        acc += l;
    }
    return `<path d="${d}" transform="translate(2 2.6)" fill="none" stroke="${C.shadow}" stroke-opacity="0.42" stroke-width="4.8"/>` +
        `<path d="${d}" fill="none" stroke="${col}" stroke-width="4.8"/>` +
        `<path d="${ticks}" fill="none" stroke="${lo}" stroke-width="0.75" stroke-opacity="0.85"/>` +
        `<path d="${d}" transform="translate(-1.2 -0.9)" fill="none" stroke="${C.kraftHi}" stroke-width="0.7" stroke-opacity="0.8" stroke-dasharray="6 2 3 3 11 2"/>`;
}
/** The shape of a handle hanging down from y0; `up` mirrors it to stand above y0. */
const cordPts = (rnd, xl, xr, y0, depth, sk, up = false) => {
    const yb = y0 + depth;
    const pts = [[xl, y0], [xl + jit(rnd, 1), y0 + depth * 0.36], [xl + sk, yb - 14], [xl + sk + 4, yb - 2], [(xl + xr) / 2 + sk, yb + 1.4], [xr + sk - 4, yb - 2], [xr + sk * 0.5, yb - 14], [xr + jit(rnd, 1), y0 + depth * 0.36], [xr, y0]];
    return up ? pts.map(p => [p[0], 2 * y0 - p[1]]) : pts;
};
{
    const rnd = rng(407);
    svgL('handles', [-60, T - H, 120, 104], cordArt(cordPts(rnd, -45, 31, T + 4, 64.6, -3), '#A67C4C', '#7C5833', rnd) + cordArt(cordPts(rnd, -35, 39, T + 4, 58, 1.5), '#B58A58', '#86603A', rnd));
}
/* the mouth: the inside of the back of the bag, seen over the front's edge, and the back handle standing up */
{
    const rnd = rng(408);
    const top = zig(-HW + 1, HW - 1, T - 2 * H - 11, 2.4, 4, rnd);
    const P = [...top, [HW - 0.6, T - 2 * H + 13], [-HW + 0.6, T - 2 * H + 13]], d = pth(P);
    let s = `<defs>${clipDef('cmo', d)}</defs><path d="${d}" fill="${C.kraftIn}"/><g clip-path="url(#cmo)">`;
    s += `<path d="${pth([[-90, T - 2 * H - 5], [-30, T - 2 * H - 6.4], [40, T - 2 * H - 5.6], [90, T - 2 * H - 7], [90, T - 2 * H + 14], [-90, T - 2 * H + 14]])}" fill="${C.kraftDeep}"/>`;
    s += `<path d="${pth([[70, T - 2 * H - 14], [90, T - 2 * H - 14], [90, T - 2 * H + 14], [72, T - 2 * H + 14]])}" fill="${C.shadow}" fill-opacity="0.25"/>`;
    s += flecks(rnd, 30, -88, T - 2 * H - 12, 88, T - 2 * H - 4, '#6E4E30', 0.7, 0.35, 0, 30, 4);
    s += '</g>';
    s += cordArt(cordPts(rnd, -45, 31, T - 2 * H - 4, 62, -3, true), '#9C7344', '#6F4E2C', rnd) + cordArt(cordPts(rnd, -35, 39, T - 2 * H - 3, 56, 1.5, true), '#B58A58', '#86603A', rnd);
    svgL('mouth', [-HW - 1, T - 2 * H - 76, HW * 2 + 2, 90], s);
}

/* ---------- what is in the bag: stamped things. One large card is the hero; tags, a strip of printed ribbon
   paper and a paper garland fan round it; three dried stems, printed like everything else. ---------- */
/** A tag: a cut of paper with clipped corners, a reinforced hole and a loop of twine; `marks(P, rot)` prints it. */
function tagArt(id, rnd, { x, y, rot, w, h, fill, tone, marks }) {
    const tr = { x, y, rot }, P = (lx, ly) => xf([[lx, ly]], tr)[0];
    const out = xf([[-w / 2, -h / 2 + 7], [-w / 2 + 6, -h / 2], [w / 2 - 6, -h / 2], [w / 2, -h / 2 + 7], [w / 2 + 0.4, h / 2], [-w / 2 - 0.3, h / 2 + 0.3]].map(p => [p[0] + jit(rnd, 0.35), p[1] + jit(rnd, 0.35)]), tr), d = pth(out);
    const hole = smooth(xf(ring(0, -h / 2 + 7.4, 1.5, rnd, 8, 0.08), tr));
    const loop = smooth(xf(ring(jit(rnd, 1.2), -h / 2 + 1, 2.6 + rnd(), rnd, 8, 0.12, 7.4), { x, y, rot: rot + jit(rnd, 14) }));
    let s = `<path d="${loop}" fill="none" stroke="${C.strawLo}" stroke-width="0.9" stroke-dasharray="5 0.6 3 0.5"/>`;
    s += `<defs>${clipDef(id, d)}</defs>${sh(d, 1.5, 1.9, 0.36)}<path d="${d}${hole}" fill="${fill}" fill-rule="evenodd"/>`;
    s += `<path d="${smooth(xf(ring(0, -h / 2 + 7.4, 4.3, rnd, 10, 0.05), tr))}${hole}" fill="${tone}" fill-opacity="0.8" fill-rule="evenodd"/>`;
    s += `<g clip-path="url(#${id})">${slivers(rnd, 2, x - w / 2, y - h / 2, x + w / 2, y + h / 2, rot + 60, 40, h * 0.6, 1, tone, 0.5)}${flecks(rnd, Math.round((w * h) / 80), x - h / 2, y - h / 2, x + h / 2, y + h / 2, tone, 0.7, 0.35, 0, 180, 1.6)}${marks(P, rot)}</g>`;
    return s;
}
const CARD = { cx: -4, cy: -14, w: 104, h: 124 };
{
    const rnd = rng(501);
    const { cx, cy, w, h } = CARD;
    const back = pth(rectP(cx + 2, cy + 2.2, w, h, 0.9, rnd, 0.4));
    const P = rectP(cx, cy, w, h, 0, rnd, 0.5), d = pth(P);
    let s = sh(back, 2, 2.6, 0.4) + `<path d="${back}" fill="${C.creamLo}"/><defs>${clipDef('cc', d)}</defs><path d="${d}" fill="${C.cream}"/><g clip-path="url(#cc)">`;
    s += slivers(rnd, 4, cx - 50, cy - 60, cx + 30, cy + 50, 30, 60, 70, 1.2, C.creamLo, 0.5) + flecks(rnd, 80, cx - 52, cy - 62, cx + 52, cy + 62, C.creamLo, 0.8, 0.35, 0, 180, 1.6);
    s += `<path d="M${f(cx - w / 2 + 2.6)} ${f(cy - h / 2)}V${f(cy + h / 2)}" fill="none" stroke="${C.creamLo}" stroke-width="0.8" stroke-dasharray="30 1.5 50 2"/>`;
    // top: a rule printed in three segments that do not meet, triangles standing on it
    for (let j = 0; j < 4; j++) s += imp(M.bar, { x: cx - 36 + j * 23.6 + jit(rnd, 1.4), y: cy - 46.5 + jit(rnd, 0.8), sz: 12.4, rot: jit(rnd, 2.4), ink: INK.green, sub: C.cream, k: 0.92 - j * 0.1, starve: 0.3 + j * 0.16, rnd });
    for (let j = 0; j < 9; j++) s += imp(M.tri, { x: cx - 43 + j * 10.9 + jit(rnd, 1.3), y: cy - 53 + jit(rnd, 0.9), sz: 3.4, rot: jit(rnd, 10), ink: j % 3 === 1 ? INK.brick : INK.green, sub: C.cream, k: 0.92 - (j % 4) * 0.1, starve: 0.25 + (j % 4) * 0.15, part: j === 6, rnd });
    // the big fern, set down twice (a pale first try under the good one), and a brick sunburst overlapping its tip
    s += imp(M.fern, { x: cx - 19, y: cy + 6, sz: 39, rot: -15, ink: INK.green, sub: C.cream, k: 0.34, starve: 1, rnd });
    s += imp(M.fern, { x: cx - 13, y: cy + 4, sz: 39, rot: -8, ink: INK.green, sub: C.cream, k: 0.92, starve: 0.5, halo: 'r', rnd });
    s += imp(M.sun, { x: cx + 22, y: cy - 16, sz: 19, rot: 12, ink: INK.brick, sub: C.cream, k: 0.88, starve: 0.55, dbl: true, rnd });
    // sprigs down the right, the same stamp three times without re-inking
    for (let j = 0; j < 3; j++) s += imp(M.sprig, { x: cx + 33 + jit(rnd, 2.4), y: cy + 16 + j * 15 + jit(rnd, 1.6), sz: 7.6, rot: 18 + jit(rnd, 14), ink: INK.green, sub: C.cream, k: 0.9 - j * 0.24, starve: 0.3 + j * 0.34, rnd });
    for (let j = 0; j < 7; j++) s += imp(M.dot, { x: cx - 40 + j * 12.6 + jit(rnd, 1.4), y: cy + 53 + jit(rnd, 1), sz: 2.2, ink: INK.brick, sub: C.cream, k: 0.92 - j * 0.09, starve: 0.2 + j * 0.13, rnd });
    s += '</g>';
    svgL('card', [cx - 60, cy - 70, 120, 142], s);
}
/* the tags to the left, with a strip of printed ribbon paper between them: drawn standing on their pivot */
const TL = { x: -44, y: 84 }, TR = { x: 40, y: 84 }, ST = { x: 6, y: 90 };
{
    const rnd = rng(611), { x, y } = TL;
    // the ribbon paper: a long cream strip, a leaf-and-dot repeat stamped along it, its end cut on the slant
    const tr = { x: x + 2, y: y - 84, rot: 3 }, P = (lx, ly) => xf([[lx, ly]], tr)[0];
    const strip = pth(xf([[-8, -84], [8.4, -78], [8, 86], [-8.2, 86]], tr));
    let s = `<defs>${clipDef('rb', strip)}</defs>${sh(strip, 1.5, 1.9, 0.36)}<path d="${strip}" fill="${C.creamLo}"/><g clip-path="url(#rb)">`;
    for (let j = 0; j < 11; j++) {
        const [px, py] = P(jit(rnd, 1.2), -70 + j * 13.4 + jit(rnd, 1.4));
        s += imp(M.leaf, { x: px, y: py, sz: 4.8, rot: 3 + (j % 2 ? 34 : -32) + jit(rnd, 8), ink: j % 4 === 3 ? INK.brick : INK.green, sub: C.creamLo, k: 0.92 - (j % 3) * 0.16, starve: 0.25 + (j % 3) * 0.25, part: j === 5, rnd });
        const [qx, qy] = P((j % 2 ? -5 : 5) + jit(rnd, 0.6), -63.4 + j * 13.4 + jit(rnd, 1));
        if (j % 5 !== 2) s += imp(M.dot, { x: qx, y: qy, sz: 1.2, ink: INK.brick, sub: C.creamLo, k: 0.88, starve: 0.2, rnd });
    }
    s += '</g>';
    s += tagArt('t1', rnd, { x: x - 20, y: y - 126, rot: -9, w: 28, h: 62, fill: C.kraftLo, tone: C.kraftDk, marks: (Q, r) => {
        const [a, b] = Q(0, 6), [c, e] = Q(0, 25);
        return imp(M.fern, { x: a, y: b, sz: 15, rot: r + 4, ink: INK.cream, sub: C.kraftLo, k: 0.8, starve: 0.6, rnd }) + imp(M.bar, { x: c, y: e, sz: 9, rot: r + 2, ink: INK.green, sub: C.kraftLo, k: 0.86, starve: 0.4, rnd });
    } });
    s += tagArt('t2', rnd, { x: x + 21, y: y - 118, rot: 10, w: 26, h: 54, fill: C.cream, tone: C.creamLo, marks: (Q, r) => {
        const [a, b] = Q(0.6, 4), [c, e] = Q(-5, 21), [g, h2] = Q(5, 21.6);
        return imp(M.sun, { x: a, y: b, sz: 10, rot: r, ink: INK.brick, sub: C.cream, k: 0.9, starve: 0.5, rnd }) + imp(M.tri, { x: c, y: e, sz: 3, rot: r, ink: INK.green, sub: C.cream, k: 0.9, starve: 0.3, rnd }) + imp(M.tri, { x: g, y: h2, sz: 3, rot: r + 8, ink: INK.green, sub: C.cream, k: 0.6, starve: 0.7, rnd });
    } });
    svgL('tags-l', [x - 40, y - 176, 80, 180], s);
}
/* the tags to the right */
{
    const rnd = rng(612), { x, y } = TR;
    let s = tagArt('t3', rnd, { x: x - 14, y: y - 132, rot: -5, w: 30, h: 66, fill: C.cream, tone: C.creamLo, marks: (Q, r) => {
        const [a, b] = Q(0, 2), [c, e] = Q(0.8, 1.2);
        let o = imp(M.rings, { x: a, y: b, sz: 11, ink: INK.green, sub: C.cream, k: 0.88, starve: 0.6, rnd }) + imp(M.dot, { x: c, y: e, sz: 2.3, ink: INK.brick, sub: C.cream, k: 0.9, starve: 0.3, rnd });
        for (let j = 0; j < 3; j++) { const [u, v] = Q(-8 + j * 8 + jit(rnd, 0.8), 24 + jit(rnd, 0.8)); o += imp(M.dia, { x: u, y: v, sz: 2.8, rot: r + jit(rnd, 12), ink: INK.brick, sub: C.cream, k: 0.9 - j * 0.2, starve: 0.3 + j * 0.3, rnd }); }
        return o;
    } });
    s += tagArt('t4', rnd, { x: x + 17, y: y - 112, rot: 12, w: 26, h: 56, fill: C.kraft, tone: C.kraftDk, marks: (Q, r) => {
        const [a, b] = Q(-1, -2), [c, e] = Q(1, 15), [g, h2] = Q(0, 4);
        return imp(M.leaf, { x: a, y: b, sz: 8.4, rot: r - 20, ink: INK.green, sub: C.kraft, k: 0.9, starve: 0.4, rnd }) + imp(M.leaf, { x: c, y: e, sz: 8.4, rot: r + 28, ink: INK.green, sub: C.kraft, k: 0.56, starve: 0.9, part: true, rnd }) + imp(M.dot, { x: g + 8, y: h2, sz: 1.7, ink: INK.brick, sub: C.kraft, k: 0.9, starve: 0.3, rnd });
    } });
    svgL('tags-r', [x - 40, y - 176, 80, 180], s);
}
/* three dried stems: cut paper printed all over, the ink broken like every other impression */
{
    const rnd = rng(613), { x, y } = ST;
    let s = '';
    const stem = (dx, len, bend, motif, sz, ink, col) => {
        const cs = quad([x + dx * 0.1, y], [x + dx * 0.4 + bend, y - len * 0.55], [x + dx, y - len], 8), d = pth(strip(cs, t => 0.8 * (1 - 0.4 * t)));
        const ang = (Math.atan2(cs[8][1] - cs[6][1], cs[8][0] - cs[6][0]) * 180) / Math.PI + 90;
        s += sh(d, 1.3, 1.7, 0.34) + `<path d="${d}" fill="${col}"/><path d="${pth(cs, false)}" fill="none" stroke="${C.mat}" stroke-width="0.5" stroke-opacity="0.8" stroke-dasharray="0.6 ${f(7 + rnd() * 9)} 1.4 ${f(12 + rnd() * 10)}"/>`;
        s += imp(motif, { x: cs[8][0] + Math.sin(rad(ang)) * sz * 0.8, y: cs[8][1] - Math.cos(rad(ang)) * sz * 0.8, sz, rot: ang, ink, sub: C.mat, k: 0.94, starve: 0.75, shadow: true, rnd });
    };
    stem(-26, 122, -8, M.fern, 27, [C.strawLo, '#8A6C3A'], C.strawLo);
    stem(4, 132, 4, M.sprig, 24, [C.brick, C.brickD], '#6B4A2C');
    stem(30, 112, 9, M.fern, 22, ['#7C5A36', C.brown], '#6B4A2C');
    svgL('stems', [x - 50, y - 184, 100, 188], s);
}
/* the garland: a length of twine with small paper pennants, each stamped once. It comes over the lip of the
   bag and lies down its front, so it is drawn where it ends up and let out from its top end. */
{
    const rnd = rng(614);
    const line = quad([34, T - 2 * H - 1], [36, T - H - 4], [80, T + 30], 26);
    const d = pth(line, false);
    let s = `<path d="${d}" transform="translate(1.4 1.8)" fill="none" stroke="${C.shadow}" stroke-opacity="0.38" stroke-width="1.2"/>`;
    const papers = [C.cream, C.kraftHi, C.creamLo, C.kraftLo];
    for (let k = 0; k < 7; k++) {
        const i = 2 + k * 3 + (k > 3 ? 1 : 0), c = line[i], n = line[i + 1], ang = (Math.atan2(n[1] - c[1], n[0] - c[0]) * 180) / Math.PI;
        const tr = { x: c[0], y: c[1], rot: ang + jit(rnd, 10) }, fill = papers[k % 4];
        const pts = xf([[-5.8 + jit(rnd, 0.6), -0.6], [6 + jit(rnd, 0.6), -0.4], [jit(rnd, 1.6), 15.4 + jit(rnd, 1.8)]], tr), dd = pth(pts);
        const [mx, my] = xf([[0, 5]], tr)[0];
        const ink = fill === C.kraftLo ? INK.cream : k % 3 === 1 ? INK.brick : INK.green;
        s += sh(dd, 1.2, 1.6, 0.4) + `<path d="${dd}" fill="${fill}"/>` + imp([M.leaf, M.dot, M.dia, M.sun][k % 4], { x: mx, y: my, sz: [3.6, 2, 2.6, 3.6][k % 4], rot: tr.rot + jit(rnd, 20), ink, sub: fill, k: 0.9 - (k % 3) * 0.12, starve: 0.3 + (k % 3) * 0.2, rnd });
    }
    s += `<path d="${d}" fill="none" stroke="${C.straw}" stroke-width="1.1" stroke-dasharray="6 0.6 4 0.5 9 0.7"/>`;
    svgL('garland', [14, T - 2 * H - 4, 84, 108], s);
}

/* ---------- the seal: a pinked round sticker, printed with rings and a sprig, a little off register ---------- */
const SEAL = [3, T + H + 2], SR = 28;
const sealOutline = (() => {
    const rnd = rng(700), out = [];
    for (let i = 0; i < 132; i++) {
        const a = (i / 132) * TAU;
        const r = SR - 1.1 + 1.1 * Math.cos(a * 22) + jit(rnd, 0.12);
        out.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return out;
})();
function sealPrint() {
    const rnd = rng(701);
    let s = flecks(rnd, 26, -26, -26, 26, 26, C.creamLo, 0.8, 0.35, 0, 180, 1.4);
    s += imp(M.rings, { x: 1.3, y: -0.9, sz: 22.6, ink: INK.green, sub: C.cream, k: 0.9, starve: 0.55, ew: 0.5, rnd });
    // a ring of dots between the rings, one by one; two were missed
    for (let i = 0; i < 18; i++) {
        if (i === 7 || i === 12) continue;
        const [x, y] = rotP([16.4 + jit(rnd, 0.5), 0], i * 20 + jit(rnd, 3));
        s += imp(M.dot, { x: x + 1.3, y: y - 0.9, sz: 1.15, ink: INK.green, sub: C.cream, k: 0.9 - (i % 4) * 0.1, starve: 0.3, rnd });
    }
    s += imp(M.sprig, { x: 0.6, y: 0.4, sz: 9, rot: -24, ink: INK.brick, sub: C.cream, k: 0.92, starve: 0.35, dbl: true, rnd });
    return s;
}
/** The seal with the part beyond the chord (normal `n` degrees, at distance `dist`) peeled and folded back over itself. */
function sealArt(n, dist, fore = 0.5) {
    const d = pth(sealOutline);
    let s = `<g transform="translate(${SEAL[0]} ${SEAL[1]})">`;
    if (n === null) {
        s += `<defs>${clipDef('cs', d)}</defs>${sh(d, 1.6, 2.1, 0.45)}<path d="${d}" fill="${C.cream}"/><g clip-path="url(#cs)">${sealPrint()}</g>`;
        // the sticker's edge: a hard pale sliver on the lit side
        s += `<path d="${pth(sealOutline.slice(70, 118), false)}" fill="none" stroke="${C.creamHi}" stroke-width="0.6"/>`;
        return s + '</g>';
    }
    const u = rotP([1, 0], n), side = p => p[0] * u[0] + p[1] * u[1] - dist;
    const keep = [], flap = [];
    const N = sealOutline.length;
    for (let i = 0; i < N; i++) {
        const a = sealOutline[i], b = sealOutline[(i + 1) % N], sa = side(a), sb = side(b);
        (sa <= 0 ? keep : flap).push(a);
        if (sa <= 0 !== sb <= 0) { const t = sa / (sa - sb), c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; keep.push(c); flap.push(c); }
    }
    const refl = p => { const k = side(p); return [p[0] - 2 * k * u[0], p[1] - 2 * k * u[1]]; };
    // the flap stands up off the bag as it curls back, so it is seen foreshortened, and throws a hard shadow
    const fl = flap.map(refl).map(p => { const k = side(p); return [p[0] - k * (1 - fore) * u[0], p[1] - k * (1 - fore) * u[1]]; });
    const dK = pth(keep), dF = pth(fl);
    s += `<defs>${clipDef('cs', dK)}${clipDef('cfl', dF)}</defs>${sh(dK, 1.6, 2.1, 0.45)}<path d="${dK}" fill="${C.cream}"/><g clip-path="url(#cs)">${sealPrint()}</g>`;
    s += sh(dF, -u[0] * 4 + 1.2, -u[1] * 4 + 2.4, 0.45);
    s += `<path d="${dF}" fill="#C6A377"/><g clip-path="url(#cfl)">`;
    // the back of the sticker: bare, with the roll of the curl as two hard slivers along the fold
    const t = [-u[1], u[0]], o = [u[0] * dist, u[1] * dist];
    const band = (a, b) => pth([[o[0] + t[0] * 40 + u[0] * a, o[1] + t[1] * 40 + u[1] * a], [o[0] - t[0] * 40 + u[0] * a, o[1] - t[1] * 40 + u[1] * a], [o[0] - t[0] * 40 + u[0] * b, o[1] - t[1] * 40 + u[1] * b], [o[0] + t[0] * 40 + u[0] * b, o[1] + t[1] * 40 + u[1] * b]]);
    s += `<path d="${band(0.5, -1.6)}" fill="${C.kraftHi}"/><path d="${band(-1.6, -3.4)}" fill="${C.kraftDk}" fill-opacity="0.55"/>`;
    // a little of the kraft came away with the glue
    const rnd = rng(702 + Math.round(dist));
    s += `<path d="${smooth(xf(ring(0, 0, 4, rnd, 7, 0.35, 2.4), { x: o[0] - u[0] * 12 + t[0] * 5, y: o[1] - u[1] * 12 + t[1] * 5, rot: n }))}" fill="${C.kraftHi}" fill-opacity="0.8"/>`;
    s += flecks(rnd, 22, -26, -26, 26, 26, C.kraftDk, 0.7, 0.35, n + 90, 30, 3) + flecks(rnd, 12, -26, -26, 26, 26, C.kraftHi, 0.8, 0.35, n + 90, 30, 3);
    s += '</g>';
    return s + '</g>';
}
const sealBox = [SEAL[0] - 36, SEAL[1] - 36, 72, 72];
svgL('seal', sealBox, sealArt(null));
svgL('seal-p1', sealBox, sealArt(-128, 6, 0.6));
svgL('seal-p2', sealBox, sealArt(-128, 15, 0.8));

/* ---------- the fresh impression on the front of the bag, across the two creases the fold left ---------- */
const IMP = [-41, T - 13], IMPR = 23;
{
    const rnd = rng(801);
    let s = imp(M.sun, { x: IMP[0], y: IMP[1], sz: IMPR, rot: 8, ink: INK.brick, sub: C.kraft, k: 0.95, starve: 0.3, halo: 'r', dbl: true, ew: 0.7, rnd });
    // the creases did not take the ink
    s += `<path d="M${IMP[0] - 26} ${T}h52" fill="none" stroke="${C.kraft}" stroke-width="1" stroke-dasharray="7 1.4 12 2 5 0.8"/><path d="M${IMP[0] - 26} ${T - H}h52" fill="none" stroke="${C.band}" stroke-width="0.9" stroke-dasharray="4 2 10 1.6 9 3"/>`;
    svgL('imprint', [IMP[0] - 30, IMP[1] - 30, 60, 60], s);
}

/* ---------- the stamp, seen from above: a block of wood, a turned knob, its index printed on top ---------- */
const STAMP = [309, 104];
{
    const rnd = rng(802);
    const [x, y] = STAMP, tr = { x, y };
    const block = smooth(xf([[-24, -20.6], [-21, -24], [21, -24.2], [24, -21], [24.4, 21], [21, 24], [-21, 24.2], [-24.2, 21]], tr).map(p => [p[0] + jit(rnd, 0.3), p[1] + jit(rnd, 0.3)]));
    let s = sh(block, 4.4, 5.6, 0.5) + `<defs>${clipDef('ck', block)}</defs><path d="${block}" fill="${C.woodT}"/><g clip-path="url(#ck)">`;
    s += slivers(rnd, 9, x - 24, y - 22, x + 4, y + 22, 2, 5, 34, 0.7, C.woodTLo, 0.7) + slivers(rnd, 5, x - 24, y - 22, x + 4, y + 22, 2, 5, 30, 0.6, C.woodTHi, 0.8);
    // the thickness of the block, as a hard darker edge on two sides
    s += `<path d="${pth(xf([[19.6, -26], [26, -26], [26, 26], [-26, 26], [-26, 19.8], [19.4, 19.6]], tr))}" fill="${C.woodTLo}" fill-opacity="0.85"/>`;
    s += imp(M.sun, { x, y, sz: 19, rot: 8, ink: INK.brick, sub: C.woodT, k: 0.5, starve: 1, rnd });
    // an inky thumb on the edge
    s += `<path d="${smooth(ring(x - 20, y + 9, 4, rnd, 7, 0.3, 6))}" fill="${C.brick}" fill-opacity="0.55"/><path d="${smooth(ring(x + 13, y - 22, 4.4, rnd, 7, 0.3, 2.2))}" fill="${C.brickD}" fill-opacity="0.4"/>`;
    s += '</g>';
    const knob = smooth(ring(x, y, 11.6, rnd, 14, 0.012));
    s += sh(knob, 3, 3.8, 0.45) + `<path d="${knob}" fill="${C.woodTHi}"/>`;
    // a flat disc of paler wood: one hard darker segment, the end grain printed as two broken rings
    s += `<defs>${clipDef('ckn', knob)}</defs><g clip-path="url(#ckn)"><path d="${pth(xf([[-14, 6.4], [14, 1.6], [14, 14], [-14, 14]], tr))}" fill="${C.woodT}"/></g>`;
    s += `<path d="${smooth(ring(x, y, 8.2, rnd, 12, 0.02))}" fill="none" stroke="${C.woodTLo}" stroke-width="0.5" stroke-dasharray="9 2 14 3"/><path d="${smooth(ring(x + 0.4, y - 0.3, 4.6, rnd, 9, 0.03))}" fill="none" stroke="${C.woodTLo}" stroke-width="0.45" stroke-dasharray="5 3 8 2"/>`;
    svg('stamp', [x - 34, y - 34, 68, 68], s);
}

/* ---------- confetti: paper punchings, each stamped; drawn where they come to rest once the picture has panned ---------- */
const CONF = [
    { c: [60, 132], seed: 901 },
    { c: [196, 70], seed: 902 },
    { c: [312, 138], seed: 903 },
    { c: [110, 296], seed: 904 },
    { c: [34, 244], seed: 905 },
];
let offN = 0;
/** An offcut: a scrap cut from a stamped sheet, so the impression on it runs off its edges. */
function punching(rnd, x, y, kind) {
    const rot = rnd() * 360, [fill, ink] = [[C.cream, INK.green], [C.kraftHi, INK.brick], [C.creamLo, INK.brick], [C.kraftLo, INK.cream], [C.cream, INK.brick], [C.kraft, INK.green]][kind % 6];
    const shapes = [
        [[-7, -5], [8, -6.4], [6.4, 6], [-8.4, 4]],
        [[-9, 4], [-5, -6], [7, -7.4], [9.4, 5.4]],
        [[-11, -3.4], [11, -4.4], [12, 3], [-10, 4.4]],
        [[-6, -7], [5, -6], [8, 1], [3, 7.4], [-7, 5]],
    ];
    const pts = xf(shapes[kind % 4].map(p => [p[0] * (0.9 + rnd() * 0.3) + jit(rnd, 0.8), p[1] * (0.9 + rnd() * 0.3) + jit(rnd, 0.8)]), { x, y, rot }), d = pth(pts);
    const id = `of${offN++}`;
    const m = [M.sun, M.leaf, M.fern, M.rings][kind % 4];
    return `<defs>${clipDef(id, d)}</defs>` + sh(d, 1.3, 1.7, 0.4) + `<path d="${d}" fill="${fill}"/><g clip-path="url(#${id})">` + imp(m, { x: x + jit(rnd, 5), y: y + jit(rnd, 5), sz: 8 + rnd() * 3, rot, ink, sub: fill, k: 0.9, starve: 0.5, rnd }) + '</g>';
}
CONF.forEach((cf, i) => {
    const rnd = rng(cf.seed);
    let s = '';
    const spots = [[-12, -8], [10, -11], [2, 9], [-16, 12], [17, 7]].slice(0, 3 + (i % 2));
    offN = 0;
    spots.forEach(([dx, dy], j) => { s += punching(rnd, cf.c[0] + dx + jit(rnd, 3), cf.c[1] + dy + jit(rnd, 3), i * 2 + j); });
    svg(`conf-${i + 1}`, [cf.c[0] - 30, cf.c[1] - 26, 60, 52], s);
});
/* the small bits that flutter and are gone */
const BITS = [178, 180];
{
    const rnd = rng(950);
    const d = pth(rectP(BITS[0], BITS[1], 9, 6.4, 12, rnd, 0.9));
    svg('bits', [BITS[0] - 8, BITS[1] - 8, 16, 16], `<path d="${d}" fill="${C.creamLo}"/>` + imp(M.bar, { x: BITS[0], y: BITS[1] + 0.6, sz: 5.4, rot: 12, ink: INK.green, sub: C.creamLo, k: 0.85, starve: 0.4, rnd }));
}

console.log(Object.entries(SIZES).map(([k, v]) => `${k} ${(v / 1024).toFixed(1)}k`).join(' | '));
const round1 = b => b.map(n => Math.round(n * 10) / 10);
console.log(JSON.stringify({ G, A, T, H, PAN, GB, local: Object.fromEntries(Object.entries(LBOX).map(([k, b]) => [k, round1(b)])), seal: SEAL, imp: IMP, stamp: STAMP, conf: CONF.map(c => c.c), bits: BITS, card: CARD, TL, TR, ST }));
