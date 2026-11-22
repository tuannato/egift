// Generator for the "pop" wrapper art: a champagne bottle seen close, from the shoulders up, on a
// dressed table at night, a flute either side, round out-of-focus lights behind. Flat fills, one
// hard-edged shade shape per form, no outline drawing, no gradient, no filter, no blend mode.
// Every colour is in the palette `C`.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas) and
// prints the boxes and pivots the definition (src/wrappers/pop.ts) carries.
// Run: node scripts/art/pop.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'pop');
if (!OUT.endsWith('wrappers/pop')) throw new Error('out dir must be public/wrappers/pop');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: three bottle greens and the light on glass, two golds, cork, foam and its shade. */
const C = {
    ground: '#0F3B2E',
    mid: '#16503E',
    glass: '#0A2A20',
    rim: '#3E8E6E',
    gold: '#E9C46A',
    goldLo: '#B8862F',
    cork: '#C99B66',
    foam: '#FFF4D6',
    foamLo: '#E8D3A0',
};

const f = n => String(Math.round(n * 100) / 100);
const rad = d => (d * Math.PI) / 180;
const poly = (pts, fill, extra = '') => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}"${extra}/>`;
const boxes = {};
function svg(name, box, inner, origin) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
    boxes[name] = origin ? { box, origin: [Math.round(((origin[0] - x) / w) * 1000) / 1000, Math.round(((origin[1] - y) / h) * 1000) / 1000] } : { box };
}
/** A small seeded generator, so the scattered things fall the same way on every run. */
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
/** The whole-number box round a set of points, with a margin, kept inside the painted area. */
function boxOf(pts, pad = 2) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.max(-6, Math.floor(Math.min(...xs) - pad)), y0 = Math.max(-6, Math.floor(Math.min(...ys) - pad));
    const x1 = Math.min(366, Math.ceil(Math.max(...xs) + pad)), y1 = Math.min(456, Math.ceil(Math.max(...ys) + pad));
    return [x0, y0, x1 - x0, y1 - y0];
}

/* ---- room: the wall at night, two very large soft rounds far off ---- */
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.ground}"/>`;
    s += `<circle cx="318" cy="300" r="190" fill="${C.mid}" opacity="0.42"/>` + `<circle cx="20" cy="150" r="130" fill="${C.mid}" opacity="0.3"/>`;
    s += `<circle cx="150" cy="-40" r="120" fill="${C.glass}" opacity="0.35"/>`;
    svg('room', [-6, -6, 372, 462], s);
}

/* ---- lights: round, out of focus, in three sizes and two tones; two layers that breathe against each other ---- */
{
    const R = [40, 25, 13];
    const disc = ([x, y, k, a0], col, gain, a = Math.min(0.9, a0 * gain)) => `<circle cx="${x}" cy="${y}" r="${R[k]}" fill="${col}" opacity="${a}"/>` + `<circle cx="${x}" cy="${y}" r="${R[k] - 1}" fill="none" stroke="${col}" stroke-width="2" opacity="${f(a * 0.9)}"/>`;
    const layer = (name, list, col, gain) => {
        const pts = list.flatMap(([x, y, k]) => [[x - R[k], y - R[k]], [x + R[k], y + R[k]]]);
        svg(name, boxOf(pts, 1), list.map(d => disc(d, col, gain)).join(''));
    };
    // Gold: the near lamps.
    layer('lights-a', [[58, 52, 0, 0.5], [262, 84, 0, 0.46], [130, 126, 1, 0.42], [332, 168, 1, 0.5], [12, 214, 1, 0.4], [196, 22, 2, 0.6], [100, 196, 2, 0.5], [318, 28, 2, 0.55], [240, 236, 2, 0.5], [146, 286, 2, 0.4], [30, 300, 2, 0.5], [344, 290, 1, 0.34]], C.gold, 1.7);
    // Green: the far ones.
    layer('lights-b', [[160, 62, 0, 0.5], [344, 100, 0, 0.42], [8, 96, 1, 0.5], [226, 150, 1, 0.5], [84, 132, 2, 0.6], [290, 196, 2, 0.55], [60, 256, 0, 0.4], [112, 10, 1, 0.45], [280, 4, 2, 0.5], [202, 300, 1, 0.36], [300, 262, 2, 0.5]], C.rim, 1.1);
}

/* ---- ribbons: two curls of gift ribbon hanging in from above, each a corkscrew of gold faces and darker backs ---- */
function curl(name, cx, len, amp, pitch, band) {
    const T = (2 * Math.PI * len) / pitch;
    const at = t => [cx + amp * (1 - 0.3 * (t / T)) * Math.sin(t), -8 + 14 + (pitch * t) / (2 * Math.PI)];
    let back = '', front = '';
    for (let k = 0; Math.PI * (k - 0.5) < T; k += 1) {
        const t0 = Math.max(0, Math.PI * (k - 0.5)), t1 = Math.min(T, Math.PI * (k + 0.5));
        const top = [], low = [];
        for (let i = 0; i <= 10; i += 1) {
            const p = at(t0 + ((t1 - t0) * i) / 10);
            top.push(p);
            low.unshift([p[0], p[1] + band]);
        }
        if (k % 2 === 0) front += poly([...top, ...low], C.gold);
        else back += poly([...top, ...low], C.goldLo);
    }
    // The straight run it hangs by.
    const hang = `<rect x="${f(cx - 1.5)}" y="-8" width="3" height="${f(14 + band * 0.6)}" fill="${C.goldLo}"/>`;
    svg(name, [cx - amp - 3, -8, 2 * amp + 6, len + band + 18], hang + back + front, [cx, -8]);
}
curl('ribbon-r', 328, 122, 11, 30, 13);
curl('ribbon-l', 26, 70, 9, 26, 11);

/* ---- table: its far edge, the lit top, and a cloth folded over the near edge ---- */
{
    let s = `<rect x="-6" y="348" width="372" height="108" fill="${C.mid}"/>` + `<rect x="-6" y="348" width="372" height="2.5" fill="${C.rim}"/>`;
    // The cloth: a runner across the table, its far hem a little askew, falling over the near edge.
    s += poly([[-6, 399], [366, 407], [366, 456], [-6, 456]], C.foam);
    s += poly([[-6, 440], [366, 442], [366, 456], [-6, 456]], C.foamLo);
    // Two folds pressed into it, and a corner turned back.
    s += poly([[40, 400], [58, 400.4], [34, 440.2], [22, 440.1]], C.foamLo) + poly([[300, 405.6], [366, 407], [366, 430]], C.foamLo);
    s += poly([[266, 404.9], [272, 405], [262, 441.4], [258, 441.4]], C.foamLo);
    svg('table', [-6, 348, 372, 108], s);
}

/* ---- flutes: straight-sided, so that the wine can rise in them by scaling about the point the sides meet in ---- */
function flute(tag, cx, rimY, hwTop, botY, hwBot, stemBot, footRx, footRy, seed) {
    const k = (hwTop - hwBot) / (botY - rimY);
    const hw = y => hwTop - k * (y - rimY);
    // Glass: a pale film, a line round it, a stem and a foot.
    let g = `<ellipse cx="${cx}" cy="${f(stemBot + footRy * 0.7)}" rx="${f(footRx * 1.15)}" ry="${f(footRy * 0.9)}" fill="${C.glass}" opacity="0.3"/>`;
    g += `<ellipse cx="${cx}" cy="${stemBot}" rx="${footRx}" ry="${footRy}" fill="${C.rim}"/>` + `<ellipse cx="${cx}" cy="${f(stemBot - 1.2)}" rx="${f(footRx * 0.55)}" ry="${f(footRy * 0.45)}" fill="${C.foam}" opacity="0.45"/>`;
    g += `<rect x="${f(cx - 1.7)}" y="${botY + 3}" width="3.4" height="${stemBot - botY - 3}" fill="${C.rim}"/>`;
    const bowl = `M${f(cx - hwTop)} ${rimY}L${f(cx - hwBot)} ${botY}Q${cx} ${botY + 9} ${f(cx + hwBot)} ${botY}L${f(cx + hwTop)} ${rimY}Z`;
    g += `<path d="${bowl}" fill="${C.foam}" opacity="0.14"/>` + `<path d="${bowl}" fill="none" stroke="${C.rim}" stroke-width="2.2" stroke-linejoin="round"/>`;
    g += `<rect x="${f(cx - hwTop - 1)}" y="${f(rimY - 1.4)}" width="${f(2 * hwTop + 2)}" height="2.8" rx="1.4" fill="${C.foam}" opacity="0.8"/>`;
    svg(`flute-${tag}`, boxOf([[cx - hwTop, rimY], [cx + hwTop, rimY], [cx - footRx * 1.15, stemBot + footRy * 1.6], [cx + footRx * 1.15, stemBot + footRy * 1.6]], 3), g);
    // The one hard light on it: a slash down the left wall.
    const a = rimY + 16, b = botY - 34, w = hwTop > 24 ? 5.5 : 4.5, inset = 5;
    svg(`shine-${tag}`, boxOf([[cx - hw(a) + inset, a], [cx - hw(b) + inset + w, b]], 1), poly([[cx - hw(a) + inset, a], [cx - hw(a) + inset + w, a], [cx - hw(b) + inset + w * 0.7, b], [cx - hw(b) + inset, b]], C.foam));
    // Wine: inside the walls by 3, drawn full. The point its sides meet in is its pivot.
    const hi = y => hw(y) - 3, fill = rimY + 13, apex = rimY + (hwTop - 3) / k;
    const body = `M${f(cx - hi(fill))} ${fill}L${f(cx - hi(botY))} ${botY}Q${cx} ${botY + 6} ${f(cx + hi(botY))} ${botY}L${f(cx + hi(fill))} ${fill}Z`;
    let w2 = `<path d="${body}" fill="${C.gold}"/>`;
    w2 += poly([[cx + hi(fill) * 0.42, fill], [cx + hi(fill), fill], [cx + hi(botY), botY], [cx + hi(botY) * 0.42, botY + 2]], C.goldLo, ' opacity="0.5"');
    w2 += poly([[cx - hi(fill), fill], [cx + hi(fill), fill], [cx + hi(fill + 7), fill + 7], [cx - hi(fill + 7), fill + 7]], C.foam);
    const wb = [Math.floor(cx - hi(fill) - 1), fill - 1, 0, 0];
    wb[2] = 2 * (cx - wb[0]);
    wb[3] = Math.ceil(apex) - wb[1];
    svg(`wine-${tag}`, wb, w2, [cx, apex]);
    // Bubbles: standing in the wine, of uneven sizes, more of them near the top.
    const rnd = seeded(seed);
    let bb = '';
    const pts = [];
    for (let i = 0; i < 17; i += 1) {
        const y = fill + 12 + (botY - fill - 22) * rnd() ** 1.5, x = cx + (rnd() * 2 - 1) * (hi(y) - 3.5), r = 0.9 + rnd() * 1.7;
        pts.push([x - r, y - r], [x + r, y + r]);
        bb += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${C.foam}" opacity="${f(0.6 + rnd() * 0.4)}"/>`;
    }
    svg(`bub-${tag}`, boxOf(pts, 1), bb);
}
flute('l', 62, 208, 21, 318, 4.5, 374, 22, 5, 11);
flute('r', 300, 176, 27, 322, 5.5, 412, 28, 6.5, 29);

/* ---- the bottle: drawn upright about x = 166 and leaned a few degrees about its foot, below the frame ---- */
const BX = 166, LEAN = 3.5, PIV = [BX, 470];
const lean = ([x, y]) => {
    const c = Math.cos(rad(LEAN)), s = Math.sin(rad(LEAN));
    return [PIV[0] + (x - PIV[0]) * c - (y - PIV[1]) * s, PIV[1] + (x - PIV[0]) * s + (y - PIV[1]) * c];
};
const leaned = inner => `<g transform="rotate(${LEAN} ${PIV[0]} ${PIV[1]})">${inner}</g>`;
/** The box round an upright rectangle once it is leaned. */
const leanBox = (x0, y0, x1, y1, pad = 2) => boxOf([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(lean), pad);
/** The mouth of the bottle on the canvas: where the foam comes from. */
const MOUTH = lean([BX, 196]);
{
    const x = d => f(BX + d);
    // Glass: long sloping shoulders into a straight neck.
    const body = `M${x(-78)} 480L${x(-78)} 428C${x(-78)} 376 ${x(-25)} 348 ${x(-23)} 286L${x(-20)} 196L${x(20)} 196L${x(23)} 286C${x(25)} 348 ${x(78)} 376 ${x(78)} 428L${x(78)} 480Z`;
    let s = `<path d="${body}" fill="${C.glass}"/>`;
    // The one light on the glass, down the left shoulder.
    s += `<path d="M${x(-65)} 456L${x(-65)} 430C${x(-65)} 398 ${x(-42)} 374 ${x(-30)} 346" fill="none" stroke="${C.rim}" stroke-width="7" stroke-linecap="round"/>`;
    // The label: a plain round-topped shape with one plain band.
    s += `<clipPath id="lab"><ellipse cx="${BX}" cy="470" rx="52" ry="46"/></clipPath>`;
    s += `<ellipse cx="${BX}" cy="470" rx="52" ry="46" fill="${C.foam}"/>` + `<g clip-path="url(#lab)"><rect x="${x(-60)}" y="440" width="120" height="7" fill="${C.gold}"/></g>`;
    // Foil: down the neck to a point, a darker side, a ring pressed in under the lip.
    const foil = [[-20, 196], [20, 196], [23, 286], [25.5, 304], [0, 332], [-25.5, 304], [-23, 286]].map(([dx, y]) => [BX + dx, y]);
    s += poly(foil, C.gold);
    s += poly([[9, 196], [20, 196], [23, 286], [25.5, 304], [10, 321]].map(([dx, y]) => [BX + dx, y]), C.goldLo);
    s += `<rect x="${x(-23)}" y="196" width="46" height="11" rx="4" fill="${C.gold}"/>` + `<rect x="${x(9)}" y="196" width="14" height="11" rx="4" fill="${C.goldLo}"/>`;
    s += poly([[-21.6, 244], [21.6, 244], [21.9, 252], [-21.9, 252]].map(([dx, y]) => [BX + dx, y]), C.goldLo);
    svg('bottle', leanBox(BX - 78, 196, BX + 78, 480), leaned(s));
    // The glint on the foil: a slash down its lit side.
    svg('glint', leanBox(BX - 16, 210, BX - 8, 240, 1), leaned(poly([[-15, 210], [-9.5, 210], [-11, 240], [-15.5, 240]].map(([dx, y]) => [BX + dx, y]), C.foam)));
    // The cork: a mushroom head on a stem. The stem stands in the neck, behind the glass, until it flies.
    let c = poly([[-16, 178], [16, 178], [19, 226], [-19, 226]].map(([dx, y]) => [BX + dx, y]), C.cork);
    c += poly([[6, 178], [16, 178], [19, 226], [8, 226]].map(([dx, y]) => [BX + dx, y]), C.goldLo, ' opacity="0.5"');
    c += `<path d="M${x(-25)} 181C${x(-28)} 160 ${x(-15)} 150 ${BX} 150C${x(15)} 150 ${x(28)} 160 ${x(25)} 181Q${BX} 186 ${x(-25)} 181Z" fill="${C.cork}"/>`;
    c += `<path d="M${x(7)} 150.6C${x(19)} 152.6 ${x(28)} 161 ${x(25)} 181Q${x(17)} 183.4 ${x(9)} 184C${x(13)} 172 ${x(12)} 160 ${x(7)} 150.6Z" fill="${C.goldLo}" opacity="0.5"/>`;
    const cb = leanBox(BX - 27, 150, BX + 27, 226, 1);
    svg('cork', cb, leaned(c), [cb[0] + cb[2] / 2, cb[1] + cb[3] / 2]);
    // The cage: a cap on the cork, wires down over its head to a ring twisted shut under the lip.
    const wire = d => `<path d="${d}" fill="none" stroke="${C.goldLo}" stroke-width="1.9" stroke-linecap="round"/>`;
    let w = wire(`M${x(-13)} 153C${x(-31)} 160 ${x(-29)} 178 ${x(-23)} 208`) + wire(`M${x(13)} 153C${x(31)} 160 ${x(29)} 178 ${x(23)} 208`);
    w += wire(`M${x(-4)} 154C${x(-10)} 168 ${x(-10)} 190 ${x(-9)} 209`) + wire(`M${x(6)} 154C${x(13)} 168 ${x(12)} 190 ${x(11)} 209`);
    w += `<path d="M${x(-23.5)} 207.5Q${BX} 212.5 ${x(23.5)} 207.5" fill="none" stroke="${C.goldLo}" stroke-width="2.6" stroke-linecap="round"/>`;
    w += `<circle cx="${x(27)}" cy="208" r="3" fill="none" stroke="${C.goldLo}" stroke-width="1.9"/>`;
    w += `<ellipse cx="${BX}" cy="152.5" rx="15" ry="4.6" fill="${C.gold}"/>` + `<ellipse cx="${x(5)}" cy="153.4" rx="9" ry="3" fill="${C.goldLo}"/>`;
    const gb = leanBox(BX - 30, 147, BX + 31, 212, 1);
    svg('cage', gb, leaned(w), [gb[0] + gb[2] / 2, gb[1] + gb[3] / 2]);
}

/* ---- foam: two low, wide, lopsided masses, drawn where they come to rest: a collar on the lip. Each is the
   outline of a handful of rounds of very different sizes, seen from a point inside; only its lower right rim is
   a tone darker (the light part is the same rounds grown and moved up and left, so no gap opens inside). ---- */
function mass(name, centre, rounds, drips, shift, grow) {
    const [mx, my] = MOUTH, c = [mx + centre[0], my + centre[1]];
    const pts = [];
    for (let i = 0; i < 200; i += 1) {
        const a = (2 * Math.PI * i) / 200, d = [Math.cos(a), Math.sin(a)];
        let far = 4;
        for (const [px, py, r] of rounds) {
            const p = [px - centre[0], py - centre[1]], dp = d[0] * p[0] + d[1] * p[1], disc = dp * dp - (p[0] * p[0] + p[1] * p[1]) + r * r;
            if (disc >= 0) far = Math.max(far, dp + Math.sqrt(disc));
        }
        pts.push([c[0] + d[0] * far, c[1] + d[1] * far]);
    }
    const d = `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
    const bars = drips.map(([dx, dy, w, h]) => [mx + dx, my + dy, w, h]);
    const shape = fill => `<path d="${d}" fill="${fill}"/>` + bars.map(([x, y, w, h]) => `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx="${f(w / 2)}" fill="${fill}"/>`).join('');
    const light = rounds.map(([px, py, r]) => `<circle cx="${f(mx + px + shift[0])}" cy="${f(my + py + shift[1])}" r="${f(r + grow)}" fill="${C.foam}"/>`).join('') + bars.map(([x, y, w, h]) => `<rect x="${f(x - 3)}" y="${f(y - 4)}" width="${w}" height="${h}" rx="${f(w / 2)}" fill="${C.foam}"/>`).join('');
    const s = `<clipPath id="in-${name}">${shape(C.foam)}</clipPath>` + shape(C.foamLo) + `<g clip-path="url(#in-${name})">${light}</g>`;
    svg(name, boxOf([...pts, ...bars.flatMap(([x, y, w, h]) => [[x, y], [x + w, y + h]])], 2), s, MOUTH);
}
// Behind the bottle: the wide spray, heavier on the left, trailing off low on the right.
mass('foam-b', [0, -14], [[-12, -24, 21], [15, -19, 13], [-34, -8, 13], [33, -7, 15], [47, 4, 8], [-2, -8, 20]], [], [-5, -8], 5);
// In front of it: the collar on the lip, and what runs down the foil, most of it on the right.
mass('foam-f', [0, -8], [[-3, -9, 16], [-19, -1, 10], [17, -4, 13], [8, -19, 9]], [[5, -6, 13, 60], [-7, -6, 9, 33], [-21, -4, 10, 19]], [-3, -5], 3);

/* ---- cork-rest: the cork, come down on the cloth on its side ---- */
{
    const cx = 330, cy = 431, k = 0.58, turn = -72;
    const P = ([dx, dy]) => [cx + dx * k, cy + dy * k];
    let c = `<ellipse cx="${cx - 2}" cy="${cy + 14}" rx="23" ry="4" fill="${C.goldLo}" opacity="0.35"/>`;
    let g = poly([[-16, -10], [16, -10], [19, 38], [-19, 38]].map(P), C.cork) + poly([[6, -10], [16, -10], [19, 38], [8, 38]].map(P), C.goldLo, ' opacity="0.5"');
    const q = (dx, dy) => P([dx, dy]).map(f).join(' ');
    g += `<path d="M${q(-25, -7)}C${q(-28, -28)} ${q(-15, -38)} ${q(0, -38)}C${q(15, -38)} ${q(28, -28)} ${q(25, -7)}Q${q(0, -2)} ${q(-25, -7)}Z" fill="${C.cork}"/>`;
    g += `<path d="M${q(7, -37.4)}C${q(19, -35.4)} ${q(28, -27)} ${q(25, -7)}Q${q(17, -4.6)} ${q(9, -4)}C${q(13, -16)} ${q(12, -28)} ${q(7, -37.4)}Z" fill="${C.goldLo}" opacity="0.5"/>`;
    c += `<g transform="rotate(${turn} ${cx} ${cy})">${g}</g>`;
    svg('cork-rest', [cx - 28, cy - 20, 56, 40], c);
}

/* ---- drop: what leaves the mouth with the cork ---- */
svg('drop', [Math.round(MOUTH[0]) - 5, Math.round(MOUTH[1]) - 35, 10, 10], `<circle cx="${Math.round(MOUTH[0])}" cy="${Math.round(MOUTH[1]) - 30}" r="4" fill="${C.foam}"/>`);

for (const [name, v] of Object.entries(boxes)) console.log(`${name}: box [${v.box.join(', ')}]${v.origin ? `, origin [${v.origin.join(', ')}]` : ''}`);
console.log('area', (Object.values(boxes).reduce((s, v) => s + v.box[2] * v.box[3], 0) / (360 * 450)).toFixed(2));
