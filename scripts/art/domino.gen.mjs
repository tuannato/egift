// Generator for the "domino" wrapper art: a chain reaction of tall lacquered slabs down a flight of low
// steps, seen straight from the side like a graphic poster. Flat fills only: each slab is one tone, the
// ground carries long flat shadows, one vermilion is kept for two slabs and the tall box at the end of the run.
// No pips, no marks: plain slabs.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/domino.gen.mjs
// Run with --print to also print the layer boxes and the fall (computed from the same geometry) as the
// constants that src/wrappers/domino.ts carries; nothing else is written.
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'domino');
if (!OUT.endsWith('wrappers/domino')) throw new Error('out dir must be public/wrappers/domino');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: two creams and a warm grey for the ground, the lacquer's near-black, two vermilions, one warm light. */
const C = {
    cream: '#F4EBD9',
    sand: '#E9DCC3',
    shadow: '#CFC4B0',
    black: '#1B1A1D',
    red: '#E8451E',
    redLo: '#B4300F',
    light: '#FFC552',
};

const f = n => String(Math.round(n * 100) / 100);
const r2 = n => Math.round(n * 100) / 100;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x)} ${f(y)} ${f(w)} ${f(h)}" width="${f(w)}" height="${f(h)}">${inner}</svg>`);
}

/* ---- geometry: N slabs on N low steps going down to the right, each a little larger than the last ---- */
const N = 9;
const RED = [2, 6];
const K = i => 1 + 0.045 * i;
const F0 = 258;
const slabs = [];
/** Riser positions: tread i runs from riser[i] to riser[i + 1] at height floor[i]; the landing is tread N. */
const riser = [-10, 24];
const floor = [F0];
for (let i = 0; i < N; i++) {
    const k = K(i);
    if (i > 0) riser.push(riser[i] + 20.5 * k);
    floor.push(floor[i] + 7 * k);
    const w = r2(11 * k), h = r2(124 * k);
    const xr = r2(riser[i + 1] - 2.5 * k);
    slabs.push({ i, k, w, h, xr, fl: r2(floor[i]), box: [r2(xr - w), r2(floor[i] - h), w, h] });
}
const LAND = r2(floor[N]);
/** The box: taller than the last slab's reach, so the slab strikes its side under the lid. */
const BOX = { x: r2(riser[N] + 14), w: 74, h: 186 };
BOX.top = r2(LAND - BOX.h);
BOX.cx = BOX.x + BOX.w / 2;

/** Past the box the steps go on down, out of the picture. */
const AFTER = [[BOX.x + BOX.w + 16, LAND], [BOX.x + BOX.w + 16, LAND + 11], [BOX.x + BOX.w + 42, LAND + 11], [BOX.x + BOX.w + 42, LAND + 22]];

/* ---- ground: cream air, a pale disc, the flight of steps, and the long flat shadows across it ---- */
/** Shadows run down and to the left: the light is high on the right. */
const SLOPE = 0.24;
const BOTTOM = 458;
/** The pale disc behind the run; it is lit when the cabinet opens. */
const DISC = { cx: 158, cy: 178, r: 130 };
const down = (x, y) => [x - SLOPE * (BOTTOM - y), BOTTOM];
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.cream}"/>`;
    s += `<circle cx="${DISC.cx}" cy="${DISC.cy}" r="${DISC.r}" fill="${C.sand}"/>`;
    const profile = [[-10, floor[0]]];
    for (let i = 1; i <= N; i++) profile.push([riser[i], floor[i - 1]], [riser[i], floor[i]]);
    profile.push(...AFTER, [370, LAND + 22], [370, BOTTOM], [-10, BOTTOM]);
    s += poly(profile, C.sand);
    // One stripe from the foot of each slab, and a broad one from the cabinet.
    for (const b of slabs) {
        const sw = 12 * b.k;
        s += poly([[b.xr - sw, b.fl], [b.xr, b.fl], down(b.xr, b.fl), down(b.xr - sw, b.fl)], C.shadow);
    }
    s += poly([[BOX.x, LAND], [BOX.x + BOX.w, LAND], down(BOX.x + BOX.w, LAND), down(BOX.x, LAND)], C.shadow);
    // The lit edge of every tread: a hairline of cream.
    for (let i = 0; i <= N; i++) s += `<rect x="${f(riser[i])}" y="${f(floor[i])}" width="${f((riser[i + 1] ?? AFTER[0][0]) - riser[i])}" height="1.4" fill="${C.cream}" opacity="0.7"/>`;
    svg('ground', [-6, -6, 372, 462], s);
}

/* ---- the shadows of the slabs once they lie down: each stripe grows wider to the right. Three groups. ---- */
const GROUPS = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
const widenBoxes = GROUPS.map((g, n) => {
    let s = '';
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
    for (const i of g) {
        const b = slabs[i];
        const edge = riser[i + 1];
        const q = b.xr + 3.4 * b.k;
        // The right-hand line starts in the air past the step's edge and meets the riser a little way down.
        const yHit = b.fl + (q - edge) / SLOPE;
        const pts = [[b.xr - 0.3, b.fl], [edge, b.fl], [edge, yHit], down(q, b.fl), down(b.xr - 0.3, b.fl)];
        s += poly(pts, C.shadow);
        for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
    }
    x0 = Math.max(-6, Math.floor(x0)); x1 = Math.ceil(x1); y0 = Math.floor(y0);
    const box = [x0, y0, x1 - x0, 456 - y0];
    svg(`fallen-${n + 1}`, box, s);
    return box;
});

/* ---- the slabs: a plain tall slab in one flat tone ---- */
for (const b of slabs) {
    const [x, y, w, h] = b.box;
    svg(`slab-${b.i + 1}`, b.box, `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="1" fill="${RED.includes(b.i) ? C.red : C.black}"/>`);
}

/* ---- the box: tall, plain, square-shouldered, vermilion, a darker band at its foot; its lid is a flat slab ---- */
const CAB = [BOX.x, BOX.top, BOX.w, BOX.h];
{
    const { x, w, h, top } = BOX;
    let s = `<rect x="${f(x)}" y="${f(top)}" width="${w}" height="${h}" fill="${C.red}"/>`;
    // The mouth, dark, under the lid.
    s += `<rect x="${f(x)}" y="${f(top)}" width="${w}" height="4" fill="${C.black}"/>`;
    s += `<rect x="${f(x)}" y="${f(LAND - 16)}" width="${w}" height="16" fill="${C.redLo}"/>`;
    svg('cabinet', CAB, s);
}
const LID = [BOX.x - 4, BOX.top - 11, BOX.w + 8, 11];
svg('lid', LID, `<rect x="${f(LID[0])}" y="${f(LID[1])}" width="${LID[2]}" height="11" fill="${C.black}"/>`);

/* ---- what comes out of the box: four flat paper streamers, each its own layer growing from the mouth, its free end cut square ---- */
const MOUTH = [BOX.cx, BOX.top + 6];
const RIBBONS = [
    { off: -24, lean: -40, len: 132, w: 13, waves: 0.8, amp: 9, ph: 0, col: C.red },
    { off: -9, lean: -15, len: 144, w: 15, waves: 0.9, amp: 11, ph: Math.PI, col: C.black },
    { off: 8, lean: 7, len: 124, w: 13, waves: 0.8, amp: 9, ph: 0, col: C.redLo },
    { off: 23, lean: 30, len: 112, w: 12, waves: 0.7, amp: 8, ph: Math.PI, col: C.red },
].map((r, n) => {
    const a = r.lean * Math.PI / 180, M = 48;
    /** The streamer's middle line: straight up from the mouth, swaying more the further out, then leaned over. */
    const mid = t => { const u = t * r.len, v = r.amp * Math.sin(2 * Math.PI * r.waves * t + r.ph) * Math.min(1, t * 2.2); return [v, -u]; };
    const L = [], R = [];
    for (let j = 0; j <= M; j++) {
        const t = j / M, [x, y] = mid(t), [x2, y2] = mid(Math.min(1, t + 0.01)), [x1, y1] = mid(Math.max(0, t - 0.01));
        const d = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / d, ny = (x2 - x1) / d, hw = r.w / 2;
        L.push([x + nx * hw, y + ny * hw]); R.push([x - nx * hw, y - ny * hw]);
    }
    const pts = [...L, ...R.reverse()].map(([x, y]) => [MOUTH[0] + r.off + x * Math.cos(a) - y * Math.sin(a), MOUTH[1] + x * Math.sin(a) + y * Math.cos(a)]);
    const x0 = Math.floor(Math.min(...pts.map(q => q[0]))), x1 = Math.ceil(Math.max(...pts.map(q => q[0])));
    const y0 = Math.floor(Math.min(...pts.map(q => q[1]))), y1 = Math.ceil(Math.max(...pts.map(q => q[1])));
    const box = [x0, y0, x1 - x0, y1 - y0];
    svg(`ribbon-${n + 1}`, box, poly(pts, r.col));
    return [box, [r2(Math.min(1, Math.max(0, (MOUTH[0] + r.off - x0) / box[2]))), r2(Math.min(1, Math.max(0, (MOUTH[1] - y0) / box[3])))]];
});

/* ---- the light: a fan out of the mouth, fading to nothing as it rises, and a soft round glow about it ---- */
const BEAM = [BOX.cx - 90, BOX.top - 150, 180, 152];
{
    const [x, y, w, h] = BEAM;
    const base = y + h, half = BOX.w / 2 - 4;
    const s = `<defs><linearGradient id="b" x1="0" y1="${f(base)}" x2="0" y2="${f(y)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.light}" stop-opacity="0.95"/><stop offset="0.45" stop-color="${C.light}" stop-opacity="0.5"/><stop offset="1" stop-color="${C.light}" stop-opacity="0"/></linearGradient></defs>`
        + `<path d="M${f(BOX.cx - half)} ${f(base)}L${f(BOX.cx + half)} ${f(base)}L${f(x + w)} ${f(y)}L${f(x)} ${f(y)}Z" fill="url(#b)"/>`
        + `<path d="M${f(BOX.cx - half)} ${f(base)}L${f(BOX.cx + half)} ${f(base)}L${f(BOX.cx + 44)} ${f(y)}L${f(BOX.cx - 44)} ${f(y)}Z" fill="url(#b)"/>`;
    svg('beam', BEAM, s);
}
const GLOW = [BOX.cx - 120, BOX.top - 130, 240, 240];
{
    const [x, y, w, h] = GLOW;
    const s = `<defs><radialGradient id="g"><stop offset="0" stop-color="${C.light}" stop-opacity="0.9"/><stop offset="0.4" stop-color="${C.light}" stop-opacity="0.42"/><stop offset="1" stop-color="${C.light}" stop-opacity="0"/></radialGradient></defs>`
        + `<circle cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" r="${w / 2}" fill="url(#g)"/>`;
    svg('glow', GLOW, s);
}

/* ---- the disc, lit: the same disc in the warm light, cut off by the steps as the pale one is ---- */
const SUN = [DISC.cx - DISC.r, DISC.cy - DISC.r, 2 * DISC.r, 2 * DISC.r];
{
    const sky = [[-10, -10], [-10, floor[0]]];
    for (let i = 1; i <= N; i++) sky.push([riser[i], floor[i - 1]], [riser[i], floor[i]]);
    sky.push(...AFTER, [370, LAND + 22], [370, -10]);
    svg('sun', SUN, `<defs><clipPath id="c">${poly(sky, C.light)}</clipPath></defs><circle cx="${DISC.cx}" cy="${DISC.cy}" r="${DISC.r}" fill="${C.light}" clip-path="url(#c)"/>`);
}

/* ---- flecks of paper thrown out of the mouth: one cream, one vermilion ---- */
const FLECK = [BOX.cx - 5, BOX.top - 30, 10, 7];
svg('fleck-a', FLECK, `<rect x="${f(FLECK[0])}" y="${f(FLECK[1])}" width="10" height="7" fill="${C.red}"/>`);
svg('fleck-b', FLECK, `<rect x="${f(FLECK[0] + 1)}" y="${f(FLECK[1] + 1)}" width="8" height="5" fill="${C.black}"/>`);

/* ---- --print: the fall, worked out from the geometry above ---- */
if (process.argv.includes('--print')) {
    const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    /** The slab's outline when turned `deg` clockwise about its lower right corner. */
    const slabAt = (b, deg) => [[0, 0], [-b.w, 0], [-b.w, -b.h], [0, -b.h]].map(p => { const [x, y] = rot(p, deg * Math.PI / 180); return [b.xr + x, b.fl + y]; });
    const cabinet = [[BOX.x, BOX.top], [BOX.x + BOX.w, BOX.top], [BOX.x + BOX.w, LAND], [BOX.x, LAND]];
    /** How far apart two convex outlines are along their best separating axis (negative: they overlap). */
    const apart = (A, B) => {
        let best = -Infinity;
        for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
            const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length];
            const len = Math.hypot(x2 - x1, y2 - y1), nx = (y2 - y1) / len, ny = -(x2 - x1) / len;
            const pa = A.map(([x, y]) => x * nx + y * ny), pb = B.map(([x, y]) => x * nx + y * ny);
            best = Math.max(best, Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb));
        }
        return best;
    };
    const GAP = 0.35, CAP = 110;
    /** The furthest slab `b` can turn before it touches `other`. */
    const limit = (b, other, from) => {
        let a = from;
        if (apart(slabAt(b, a), other) < GAP) return a;
        while (a < CAP && apart(slabAt(b, Math.min(CAP, a + 0.5)), other) >= GAP) a += 0.5;
        if (a >= CAP) return CAP;
        let lo = a, hi = a + 0.5;
        for (let n = 0; n < 12; n++) { const m = (lo + hi) / 2; if (apart(slabAt(b, m), other) >= GAP) lo = m; else hi = m; }
        return lo;
    };
    const LEAN = 2.5;
    /** A slab left to itself: the first tips slowly from its lean, the others are struck and start at once. */
    const free = (i, u) => (i === 0 ? LEAN + (90 - LEAN) * (u / 985) ** 2 : 90 * (0.3 * (u / 1100) + 0.7 * (u / 1100) ** 2));
    const START = 120, DT = 5, END = 2600;
    const T = Array(N).fill(Infinity);
    T[0] = START;
    const th = slabs.map((_, i) => (i === 0 ? LEAN : 0));
    const track = slabs.map(() => []);
    let strike = Infinity;
    for (let t = 0; t <= END; t += DT) {
        for (let i = N - 1; i >= 0; i--) {
            if (t >= T[i]) {
                const other = i === N - 1 ? cabinet : slabAt(slabs[i + 1], th[i + 1]);
                const lim = limit(slabs[i], other, 0);
                const want = Math.min(CAP, free(i, t - T[i]));
                const next = Math.max(th[i], Math.min(want, lim));
                if (want >= lim) {
                    if (i === N - 1) strike = Math.min(strike, t);
                    else if (T[i + 1] === Infinity) T[i + 1] = t;
                }
                th[i] = next;
            }
            track[i].push(th[i]);
        }
    }
    /** The track as a few straight moves: as long as each can be without leaving the track by more than TOL degrees. */
    const TOL = 0.55;
    const keys = track.map((tr, i) => {
        const last = tr[tr.length - 1];
        let end = tr.findIndex(v => last - v < 0.08);
        let a = Math.round(T[i] / DT);
        const out = [];
        while (a < end) {
            let b = a + 1;
            for (let c = a + 2; c <= end; c++) {
                let ok = true;
                for (let j = a + 1; j < c; j++) if (Math.abs(tr[a] + (tr[c] - tr[a]) * (j - a) / (c - a) - tr[j]) > TOL) { ok = false; break; }
                if (!ok) break;
                b = c;
            }
            out.push([a * DT, (b - a) * DT, b === end ? r2(last) : r2(tr[b])]);
            a = b;
        }
        return out;
    });
    console.log(`const LAND = ${LAND};`);
    console.log(`const CABINET = ${JSON.stringify(CAB.map(r2))} as const;`);
    console.log(`const LID = ${JSON.stringify(LID.map(r2))} as const;`);
    console.log(`const BEAM = ${JSON.stringify(BEAM.map(r2))} as const;`);
    console.log(`const RIBBONS = ${JSON.stringify(RIBBONS)} as const;`);
    console.log(`const SUN = ${JSON.stringify(SUN.map(r2))} as const;`);
    console.log(`const GLOW = ${JSON.stringify(GLOW.map(r2))} as const;`);
    console.log(`const FLECK = ${JSON.stringify(FLECK.map(r2))} as const;`);
    console.log(`const FALLEN = ${JSON.stringify(widenBoxes)} as const;`);
    console.log(`const SLABS = ${JSON.stringify(slabs.map(b => b.box))} as const;`);
    console.log(`const STARTS = ${JSON.stringify(T)};`);
    console.log(`const STRIKE = ${strike};`);
    console.log(`const FALL = ${JSON.stringify(keys)} as const;`);
    console.log(`// steps: ${keys.reduce((s, k) => s + k.length, 0)}; rest: ${track.map(tr => r2(tr[tr.length - 1])).join(' ')}`);
}
