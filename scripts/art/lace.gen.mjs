// Generator for the "lace" wrapper art, in WHITE ON WHITE: laser-cut paper and blind embossing.
// A gate-fold wedding invitation whose two doors are cut as lace (a net of small hexagons, rosettes,
// corner fans, a scalloped meeting edge), held by a silk band and bow with a paper sprig tucked under it.
// Inside: an embossed card, two foil rings, and a pop-up arch of paper flowers.
// Form comes only from: a tiny crisp shadow under every cut edge (the same cut, offset), the darker
// inside seen through the holes, pressed/raised line pairs, and hairlines of rose-gold foil.
// The sanitiser allows no <use>/<pattern>, so each cut is ONE mask (outline white, holes black) used
// twice: once for the paper, once, offset, for its shadow.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box).
// Run: node scripts/art/lace.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'lace');
if (!OUT.endsWith('wrappers/lace')) throw new Error('out dir must be public/wrappers/lace');
mkdirSync(OUT, { recursive: true });
for (const name of readdirSync(OUT)) if (name.endsWith('.svg')) rmSync(join(OUT, name));

/* Palette: pearl and warm whites, pale blush-grey ground, one grey-brown for every shadow, rose-gold foil. */
const C = {
    ground: '#C2B7B3', groundHi: '#D6CCC8',
    env: '#EEE8E3',
    card: '#F5F1EB', paper: '#FAF7F2', paperBack: '#EEE9E3', white: '#FFFFFF', leaf: '#F6F2EC',
    dusk: '#B2A7A5',
    line: '#C6BBB5', sh: '#5C4A49',
    foil: '#C08A78', foilHi: '#EBCBBE', foilLo: '#9A6557',
    silk: '#E8D5CA', silkHi: '#F4E7DF', silkLo: '#D2B9AC',
};

/* Geometry (canvas 360 x 500). The card, its two doors, the band. */
const CX = 180, X0 = 64, X1 = 296, Y0 = 84, Y1 = 392;
const DW = 116, DH = 308;
const BAND = 238; // the band's centre line (door-local v = 154)

const n1 = v => {
    let s = String(Math.round(v * 10) / 10);
    if (s.startsWith('0.')) s = s.slice(1);
    else if (s.startsWith('-0.')) s = '-' + s.slice(2);
    return s === '-0' ? '0' : s;
};
const P = (x, y) => `${n1(x)} ${n1(y)}`;
const rad = a => (a * Math.PI) / 180;
const pol = (c, r, a) => [c[0] + r * Math.cos(rad(a)), c[1] + r * Math.sin(rad(a))];
const PP = p => P(p[0], p[1]);

/** Foil: a narrow run from dark to light with one bright break, repeated along every line it is laid on. */
const FOIL = `<linearGradient id="f" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="34" y2="52" spreadMethod="reflect">` +
    `<stop offset="0" stop-color="#8A5648"/><stop offset=".3" stop-color="#BD8674"/><stop offset=".46" stop-color="#EBC9BB"/><stop offset=".5" stop-color="#FFF6F0"/>` +
    `<stop offset=".55" stop-color="#DBAA97"/><stop offset=".8" stop-color="#B07A68"/><stop offset="1" stop-color="#8A5648"/></linearGradient>`;
const BOX = {};
/** Everything but the ground was drawn 6 units higher than it lies: one shift carries it down (see the definition's LIFT). */
const DY = 6;
function svg(name, box0, inner0, shift = true) {
    const box = shift ? [box0[0], box0[1] + DY, box0[2], box0[3]] : box0;
    const foil = inner0.includes('url(#f)') ? `<defs>${FOIL}</defs>` : '';
    const inner = shift ? `<g transform="translate(0 ${DY})">${foil}${inner0}</g>` : foil + inner0;
    BOX[name] = box;
    const [x, y, w, h] = box;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    writeFileSync(join(OUT, `${name}.svg`), s);
    return s.length;
}

/* ---------- The lace: one door, in its own units (u from the hinge to the meeting edge, v down) ---------- */
const SC = 14; // one scallop of the meeting edge
const ROS = [84, 224]; // the two rosettes, centred on the meeting edge
const straight = k => ROS.some(vc => k * SC >= vc - 56 && (k + 1) * SC <= vc + 56);

function doorOutline() {
    let d = 'M0 0';
    let u = straight(0) ? 116 : 111;
    d += `H${u}`;
    for (let k = 0; k < DH / SC; k++) {
        if (straight(k)) {
            if (u !== 116) d += 'h5';
            u = 116;
            d += `v${SC}`;
        } else {
            if (u !== 111) d += 'h-5';
            u = 111;
            d += `a7.4 7.4 0 0 1 0 ${SC}`;
        }
    }
    return d + 'H0Z';
}

/** When set, tear() and eye() pass their points through it (the open doors are drawn foreshortened). */
let WARP = null;
const W = (x, y) => (WARP ? P(...WARP(x, y)) : P(x, y));
/** A teardrop cut: pointed toward the centre `c`, round at the far end. */
function tear(c, a, r0, r1, hw) {
    const dx = Math.cos(rad(a)), dy = Math.sin(rad(a)), L = r1 - r0, k = hw * 1.33;
    const p = (t, s) => W(c[0] + dx * t - dy * s, c[1] + dy * t + dx * s);
    return `M${p(r0, 0)}C${p(r0 + L * 0.45, -k)} ${p(r1, -k)} ${p(r1, 0)}C${p(r1, k)} ${p(r0 + L * 0.45, k)} ${p(r0, 0)}Z`;
}
/** A small arched window between two radii. */
function win(c, a, r0, r1, da) {
    return `M${PP(pol(c, r0, a - da))}L${PP(pol(c, r1 - 2.4, a - da))}Q${PP(pol(c, r1 + 2, a))} ${PP(pol(c, r1 - 2.4, a + da))}L${PP(pol(c, r0, a + da))}Z`;
}
/** A pin-prick: a tiny diamond. */
const dot = (u, v, s = 1.3) => `M${P(u, v - s)}l${n1(s)} ${n1(s)}-${n1(s)} ${n1(s)}-${n1(s)}-${n1(s)}z`;
/** One cell of the net: a pointy hexagon. */
const HEX_R = 2.1, HEX_W = 1.8, PITCH = 5.2, ROW = PITCH * 0.866;
const hex = (u, v) => `M${P(u, v - HEX_R)}l1.8 1v2.2l-1.8 1-1.8-1v-2.2z`;
/** A cut pointed at both ends (a leaf). */
function eye(c, a, r0, r1, hw) {
    const dx = Math.cos(rad(a)), dy = Math.sin(rad(a)), m = r0 + (r1 - r0) * 0.56, k = hw * 2;
    const p = (t, s) => W(c[0] + dx * t - dy * s, c[1] + dy * t + dx * s);
    return `M${p(r0, 0)}Q${p(m, -k)} ${p(r1, 0)}Q${p(m, k)} ${p(r0, 0)}Z`;
}
const FLORETS = [[33, 84], [33, 224], [66, 24], [66, DH - 24]];

const FANS = [[11, 11, 1], [11, DH - 11, -1]]; // corner fans at the hinge side: [u, v, which way they open]
const MID = [11, 154]; // a half fan on the hinge, behind the band

function doorHoles() {
    const h = [];
    // The pricked border: one row of pin-pricks along the top, the hinge and the bottom; one in every scallop.
    for (let u = 14; u <= 104; u += 6) h.push(dot(u, 7.8), dot(u, DH - 7.8));
    for (let v = 13.8; v <= DH - 13; v += 6) h.push(dot(7.8, v));
    for (let k = 0; k < DH / SC; k++) if (!straight(k)) h.push(dot(110.6, k * SC + 7, 1.5));
    // The rosettes: half of each on this door.
    for (const vc of ROS) {
        const c = [116, vc];
        for (const a of [135, 180, 225]) h.push(dot(...pol(c, 5, a), 1.1));
        for (let k = 0; k < 9; k++) h.push(tear(c, 100 + 20 * k, 9.5, 23, 2.2));
        for (let k = 1; k < 9; k++) h.push(eye(c, 90 + 20 * k, 27.5, 43.4, 4.3));
        for (let k = 0; k < 9; k++) h.push(dot(...pol(c, 40.4, 100 + 20 * k), 1.3));
        for (let k = 0; k < 18; k++) h.push(win(c, 95 + 10 * k, 45.6, 50.6, 3.3));
        for (let k = 1; k < 18; k++) h.push(dot(...pol(c, 53.4, 90 + 10 * k), 0.95));
    }
    // Small florets in the net.
    for (const c of FLORETS) {
        h.push(dot(c[0], c[1], 1.1));
        for (let k = 0; k < 6; k++) h.push(tear(c, 30 + 60 * k, 2.4, 7.8, 1.6));
    }
    // The corner fans.
    for (const [fu, fv, s] of FANS) {
        const c = [fu, fv];
        for (const a of [15, 45, 75]) h.push(tear(c, s * a, 8, 25, 3.3));
        for (let k = 0; k < 5; k++) h.push(win(c, s * (9 + 18 * k), 28.6, 37, 6));
        for (let k = 1; k < 5; k++) h.push(dot(...pol(c, 40.6, s * 18 * k), 1.25));
    }
    // The half fan at the middle of the hinge.
    for (const a of [-60, -30, 0, 30, 60]) h.push(tear(MID, a, 7, 22, 2.9));
    for (const a of [-63, -45, -27, -9, 9, 27, 45, 63]) h.push(win(MID, a, 25.6, 33.4, 6));
    for (const a of [-72, -54, -36, -18, 0, 18, 36, 54, 72]) h.push(dot(...pol(MID, 36.8, a), 1.2));
    // The net: small hexagons wherever the paper is not a border, a rosette or a fan; here and there a cell is
    // left whole (a point d'esprit).
    const dist = (u, v, c) => Math.hypot(u - c[0], v - c[1]);
    const solid = (u, v) =>
        u - HEX_W < 11.6 || u + HEX_W > 105 || v - HEX_R < 11.6 || v + HEX_R > DH - 11.6 ||
        ROS.some(vc => dist(u, v, [116, vc]) < 55.6 + HEX_R) ||
        FLORETS.some(c => dist(u, v, c) < 9.4 + HEX_R) ||
        FANS.some(([fu, fv]) => dist(u, v, [fu, fv]) < 44 + HEX_R) ||
        dist(u, v, MID) < 40 + HEX_R;
    let cells = 0;
    for (let j = -34; j <= 34; j++) {
        const v = 154 + j * ROW;
        const odd = ((j % 2) + 2) % 2;
        for (let i = 0; i < 20; i++) {
            const u = 14.6 + i * PITCH + odd * (PITCH / 2);
            if (solid(u, v)) continue;
            if (((j % 4) + 4) % 4 === 0 && i % 4 === ((Math.abs(j) / 4) % 2) * 2) continue;
            h.push(hex(u, v));
            cells++;
        }
    }
    return { d: h.join(''), cells };
}
const OUTLINE = doorOutline();
const HOLES = doorHoles();
const doorMask = id => `<mask id="${id}" maskUnits="userSpaceOnUse" x="-1" y="-1" width="${DW + 2}" height="${DH + 2}"><path d="${OUTLINE}" fill="#fff"/><path d="${HOLES.d}" fill="#000"/></mask>`;

/** Raised line: a grey line with a white one beside it. */
const pressed = (d, w = 0.5, o = 0.55) =>
    `<path d="${d}" fill="none" stroke="${C.line}" stroke-opacity="${o}" stroke-width="${w}"/><path d="${d}" transform="translate(.6 .7)" fill="none" stroke="#fff" stroke-width="${w + 0.1}"/>`;
const foilLine = (d, w = 0.7) => `<path d="${d}" fill="none" stroke="url(#f)" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** What is drawn on the paper of a door (cut by the same mask): pressed rings and foil hairlines. */
function doorMarks(foil) {
    let s = pressed('M105 11.6H11.6V296.4H105');
    const arcs = [];
    for (const vc of ROS) arcs.push(`M116 ${vc + 25.2}A25.2 25.2 0 0 1 116 ${vc - 25.2}`);
    arcs.push(`M${11 + 26.8} 11A26.8 26.8 0 0 1 11 ${11 + 26.8}`);
    arcs.push(`M${11 + 26.8} ${DH - 11}A26.8 26.8 0 0 0 11 ${DH - 11 - 26.8}`);
    arcs.push(`M11 ${154 - 23.8}A23.8 23.8 0 0 1 11 ${154 + 23.8}`);
    if (foil) {
        s += foilLine('M106 4.4H4.4V303.6H106', 0.8);
        s += foilLine(arcs.join(''), 0.8);
        for (const vc of ROS) s += pressed(`M116 ${vc + 7.6}A7.6 7.6 0 0 1 116 ${vc - 7.6}M116 ${vc + 44.6}A44.6 44.6 0 0 1 116 ${vc - 44.6}`);
        for (const c of FLORETS) s += pressed(`M${c[0] - 8.6} ${c[1]}a8.6 8.6 0 1 0 17.2 0a8.6 8.6 0 1 0 -17.2 0`, 0.4, 0.5);
    } else {
        s += pressed(arcs.join(''));
    }
    return s;
}

/**
 * One door, drawn in canvas coordinates. `place` is the transform that carries door units to the canvas
 * (mirrored for the right door); `sh` is its shadow's offset in door units and `so` the shadow's strength.
 */
function door(name, box, place, { paper, foil, sh, so }) {
    return svg(name, box,
        `<defs>${doorMask('m')}</defs><g transform="${place}">` +
        `<g transform="translate(${sh[0]} ${sh[1]})"><rect width="${DW}" height="${DH}" fill="${C.sh}" fill-opacity="${so}" mask="url(#m)"/></g>` +
        `<g mask="url(#m)"><rect width="${DW}" height="${DH}" fill="${paper}"/>${doorMarks(foil)}</g></g>`);
}

const sizes = {};
// Closed faces: the left door hinges on the card's left edge, the right door is its mirror image.
sizes['door-l'] = door('door-l', [X0, Y0, DW + 2, DH + 2], `translate(${X0} ${Y0})`, { paper: C.paper, foil: true, sh: [0.8, 1.15], so: 0.5 });
sizes['door-r'] = door('door-r', [CX, Y0, DW + 2, DH + 2], `translate(${X1} ${Y0}) scale(-1 1)`, { paper: C.paper, foil: true, sh: [-0.8, 1.15], so: 0.5 });
// Open: the inside faces, standing out from the card's edges and seen at an angle. Not the flat lace squeezed:
// a door drawn foreshortened, its free edge nearer and so taller, with fewer and larger cuts and the paper's
// thickness showing along that edge.
{
    const K = 44 / DW, RISE = 5;
    const openDoor = (name, side) => {
        const hx = side < 0 ? X0 : X1;
        WARP = (u, v) => [hx + side * u * K, Y0 + 154 + (v - 154) * (1 + (RISE / 154) * (u / DW))];
        const q = (u, v) => W(u, v);
        const outline = `M${q(0, 0)}L${q(DW, 0)}L${q(DW, DH)}L${q(0, DH)}Z`;
        const h = [];
        const dist = (u, v, c) => Math.hypot(u - c[0], v - c[1]);
        for (const vc of ROS) for (const a of [108, 144, 180, 216, 252]) h.push(eye([DW, vc], a, 15, 50, 8.4));
        for (const [fu, fv, sg] of FANS) for (const a of [22, 68]) h.push(tear([fu, fv], sg * a, 10, 40, 7.6));
        for (const a of [-48, 0, 48]) h.push(tear(MID, a, 10, 38, 7.2));
        for (let j = -7; j <= 7; j++) {
            for (let i = 0; i < 4; i++) {
                const u = 22 + i * 23 + (((j % 2) + 2) % 2) * 11.5, v = 154 + j * 21;
                if (u > 100 || v < 20 || v > DH - 20) continue;
                if (ROS.some(vc => dist(u, v, [DW, vc]) < 62) || FANS.some(([fu, fv]) => dist(u, v, [fu, fv]) < 50) || dist(u, v, MID) < 50) continue;
                h.push(eye([u, v - 8.5], 90, 0, 17, 7.5));
            }
        }
        const edge = `M${q(DW, 0)}L${q(DW + 6.4, -0.4)}L${q(DW + 6.4, DH + 0.4)}L${q(DW, DH)}Z`;
        const border = `M${q(9, 9)}L${q(DW - 9, 9)}M${q(9, DH - 9)}L${q(DW - 9, DH - 9)}M${q(9, 9)}L${q(9, DH - 9)}`;
        const x0 = side < 0 ? hx - 48 : hx, box = [x0 - (side < 0 ? 2 : 0), Y0 - 7, 54, 324];
        WARP = null;
        return svg(name, box,
            `<defs><mask id="m" maskUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="54" height="324"><path d="${outline}" fill="#fff"/><path d="${h.join('')}" fill="#000"/></mask></defs>` +
            `<g transform="translate(2.4 3)"><rect x="${box[0]}" y="${box[1]}" width="54" height="324" fill="${C.sh}" fill-opacity="0.32" mask="url(#m)"/></g>` +
            `<g mask="url(#m)"><rect x="${box[0]}" y="${box[1]}" width="54" height="324" fill="${C.paperBack}"/>${pressed(border, 0.5, 0.8)}</g>` +
            `<path d="${edge}" fill="#D3C9C3"/><path d="${edge}" fill="none" stroke="#fff" stroke-width="0.4"/>`);
    };
    sizes['door-l-back'] = openDoor('door-l-back', -1);
    sizes['door-r-back'] = openDoor('door-r-back', 1);
}

// The light through the open left door: its lace, as a shadow lying across the inner card.
svg('shade-l', [X0, Y0, 84, DH],
    `<defs>${doorMask('m')}<filter id="b" x="-10%" y="-5%" width="120%" height="110%"><feGaussianBlur stdDeviation="0.5"/></filter></defs>` +
    `<g transform="translate(${X0 + 1} ${Y0 + 5}) scale(0.7 1)" filter="url(#b)"><rect width="${DW}" height="${DH}" fill="${C.sh}" fill-opacity="0.2" mask="url(#m)"/></g>`);

/* ---------- The ground: pale paper, a pool of light, a pressed lattice ---------- */
{
    let a = '', b = '';
    for (let k = -560; k <= 400; k += 18) {
        a += `M${k} -20l570 570`;
        b += `M${k + 570} -20l-570 570`;
    }
    svg('ground', [-20, -20, 400, 570],
        `<defs><radialGradient id="g" cx="180" cy="230" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.groundHi}"/><stop offset="1" stop-color="${C.ground}"/></radialGradient></defs>` +
        `<linearGradient id="t" x1="0" y1="80" x2="0" y2="114" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#554A4D"/><stop offset="1" stop-color="#554A4D" stop-opacity="0"/></linearGradient>` +
        `<rect x="-20" y="-20" width="400" height="570" fill="url(#g)"/>` +
        `<path d="${a}${b}" fill="none" stroke="${C.sh}" stroke-opacity="0.07" stroke-width="0.5"/>` +
        `<path d="${a}${b}" transform="translate(.7 .7)" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="0.5"/>` +
        // Under the page's own labels the ground falls into the room's shade, so they stay readable.
        `<rect x="-20" y="-20" width="400" height="140" fill="url(#t)"/>`, false);
}

/* ---------- The envelope under the card: a second sheet, a few degrees off ---------- */
{
    const x = 46, y = 70, w = 268, h = 348;
    const r = `x="${x}" y="${y}" width="${w}" height="${h}" rx="2"`;
    const flap = `M${x} ${y}L${CX} ${y + 168}L${x + w} ${y}`;
    svg('envelope', [10, 30, 340, 440],
        `<defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter></defs>` +
        `<g transform="rotate(-6 180 240)">` +
        `<rect ${r} transform="translate(4 7)" fill="${C.sh}" fill-opacity="0.22" filter="url(#b)"/>` +
        `<rect ${r} transform="translate(1.2 1.8)" fill="${C.sh}" fill-opacity="0.3"/>` +
        `<rect ${r} fill="${C.env}"/>` +
        pressed(flap, 0.6, 0.8) +
        `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="none" stroke="url(#f)" stroke-width="0.7"/>` +
        `</g>`);
}

/* ---------- Paper flowers, leaves, petals ---------- */
/** One petal of a flower centred on (cx, cy), reaching r along the angle a. */
function petalD(cx, cy, r, a, wide = 1) {
    const dx = Math.cos(rad(a)), dy = Math.sin(rad(a));
    const p = (t, s) => P(cx + (dx * t - dy * s * wide) * r, cy + (dy * t + dx * s * wide) * r);
    return `M${p(0.1, 0)}C${p(0.25, -0.55)} ${p(0.88, -0.62)} ${p(1, -0.14)}Q${p(0.92, 0)} ${p(1, 0.14)}C${p(0.88, 0.62)} ${p(0.25, 0.55)} ${p(0.1, 0)}Z`;
}
/** A flower of stacked whorls; each whorl its own sheet, the upper ones smaller. `rose` has three whorls. */
function flower(cx, cy, r, rot, rose = false) {
    const n = rose ? 6 : 5;
    const whorl = (rr, r0, m) => Array.from({ length: m }, (_, k) => petalD(cx, cy, rr, r0 + (k * 360) / m));
    const outer = whorl(r, rot, n);
    let s = `<path d="${outer.join('')}" transform="translate(1.3 1.9)" fill="${C.sh}" fill-opacity="0.34" stroke="none"/>`;
    s += outer.map(d => `<path d="${d}"/>`).join('');
    const inner = whorl(r * 0.62, rot + 180 / n, n);
    s += `<path d="${inner.join('')}" transform="translate(.7 1)" fill="${C.sh}" fill-opacity="0.22" stroke="none"/>`;
    s += inner.map(d => `<path d="${d}"/>`).join('');
    if (rose) {
        const core = whorl(r * 0.36, rot + 20, 4);
        s += `<path d="${core.join('')}" transform="translate(.5 .7)" fill="${C.sh}" fill-opacity="0.2" stroke="none"/>`;
        s += core.map(d => `<path d="${d}"/>`).join('');
    }
    const cr = Math.max(1.1, r * 0.11);
    s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(cr)}" fill="${C.foilHi}" stroke="url(#f)" stroke-width="0.6"/>`;
    return `<g fill="#fff" stroke="${C.line}" stroke-width="0.4">${s}</g>`;
}
/** A small single blossom. */
function blossom(cx, cy, r, rot) {
    const ds = Array.from({ length: 5 }, (_, k) => petalD(cx, cy, r, rot + k * 72));
    return `<path d="${ds.join('')}" transform="translate(.9 1.3)" fill="${C.sh}" fill-opacity="0.32"/>` +
        `<g fill="#fff" stroke="${C.line}" stroke-width="0.35">${ds.map(d => `<path d="${d}"/>`).join('')}</g>` +
        `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(Math.max(0.8, r * 0.16))}" fill="url(#f)"/>`;
}
/** A pointed leaf from (x, y), `len` long along angle a, with a foil vein. */
function leaf(x, y, len, a, w = 0.42, { fill = C.leaf, off = [1, 1.5], so = 0.32, vein = true } = {}) {
    const dx = Math.cos(rad(a)), dy = Math.sin(rad(a));
    const p = (t, s) => P(x + (dx * t - dy * s) * len, y + (dy * t + dx * s) * len);
    const d = `M${p(0, 0)}Q${p(0.42, -w)} ${p(1, 0)}Q${p(0.42, w)} ${p(0, 0)}Z`;
    return `<path d="${d}" transform="translate(${off[0]} ${off[1]})" fill="${C.sh}" fill-opacity="${so}"/>` +
        `<path d="${d}" fill="${fill}" stroke="${C.line}" stroke-width="0.35"/>` +
        (vein ? `<path d="M${p(0.06, 0)}L${p(0.88, 0)}" fill="none" stroke="url(#f)" stroke-width="0.45" stroke-linecap="round"/>` : '');
}
/** A loose petal lying flat: a curved white scrap with one crease. */
function loosePetal(x, y, len, a, { off = [1.2, 1.8], so = 0.34 } = {}) {
    const dx = Math.cos(rad(a)), dy = Math.sin(rad(a));
    const p = (t, s) => P(x + (dx * t - dy * s) * len, y + (dy * t + dx * s) * len);
    const d = `M${p(0, 0)}C${p(0.2, -0.5)} ${p(0.85, -0.52)} ${p(1, -0.08)}Q${p(0.94, 0.04)} ${p(1, 0.16)}C${p(0.8, 0.5)} ${p(0.25, 0.42)} ${p(0, 0)}Z`;
    return `<path d="${d}" transform="translate(${off[0]} ${off[1]})" fill="${C.sh}" fill-opacity="${so}"/>` +
        `<path d="${d}" fill="#fff" stroke="${C.line}" stroke-width="0.35"/>` +
        `<path d="M${p(0.1, 0)}Q${p(0.5, -0.08)} ${p(0.8, 0.02)}" fill="none" stroke="${C.line}" stroke-width="0.4"/>`;
}
/** A sprig: a stem from a to b with paired leaves that get smaller toward the tip. */
function sprig(ax, ay, bx, by, pairs, len, { bend = 6, lift = [1.2, 1.8], so = 0.36 } = {}) {
    const ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    const nx = -(by - ay) / Math.hypot(bx - ax, by - ay), ny = (bx - ax) / Math.hypot(bx - ax, by - ay);
    const mx = (ax + bx) / 2 + nx * bend, my = (ay + by) / 2 + ny * bend;
    const at = t => [(1 - t) * (1 - t) * ax + 2 * t * (1 - t) * mx + t * t * bx, (1 - t) * (1 - t) * ay + 2 * t * (1 - t) * my + t * t * by];
    const stem = `M${P(ax, ay)}Q${P(mx, my)} ${P(bx, by)}`;
    let s = `<path d="${stem}" transform="translate(${lift[0]} ${lift[1]})" fill="none" stroke="${C.sh}" stroke-opacity="${so}" stroke-width="1.5" stroke-linecap="round"/>`;
    s += `<path d="${stem}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
    s += `<path d="${stem}" fill="none" stroke="url(#f)" stroke-width="0.5" stroke-linecap="round"/>`;
    const o = { fill: '#fff', off: lift, so };
    for (let k = 0; k < pairs; k++) {
        const t = 0.1 + (k / pairs) * 0.84;
        const [x, y] = at(t);
        const l = len * (1 - 0.42 * (k / pairs));
        s += leaf(x, y, l, ang - 44 + k * 2, 0.46, o) + leaf(x, y, l * 0.94, ang + 46 - k * 2, 0.46, o);
    }
    s += leaf(bx, by, len * 0.6, ang + 4, 0.46, o);
    return s;
}

/* ---------- Loose petals and a small sprig on the ground ---------- */
svg('petals', [0, 40, 360, 460],
    [
        [38, 416, 13, 20], [88, 438, 12, -150], [146, 424, 14, -18], [204, 446, 12, 160], [246, 418, 11, 35],
        [322, 440, 13, -160], [28, 300, 11, 70], [338, 176, 11, -110], [24, 150, 10, 120], [336, 330, 12, 200],
        [118, 462, 11, 10], [282, 470, 12, -30], [170, 478, 10, 190],
    ].map(([x, y, l, a]) => loosePetal(x, y, l, a)).join('') +
    sprig(340, 408, 262, 432, 5, 15, { bend: -5 }));

/* ---------- The card: its shadow, the inner sheet, the dusk inside while it is closed ---------- */
svg('card-shadow', [X0 - 22, Y0 - 16, X1 - X0 + 52, Y1 - Y0 + 52],
    `<defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter></defs>` +
    `<rect x="${X0 + 5}" y="${Y0 + 9}" width="${X1 - X0}" height="${Y1 - Y0}" fill="${C.sh}" fill-opacity="0.34" filter="url(#b)"/>` +
    `<rect x="${X0 + 1.4}" y="${Y0 + 2.2}" width="${X1 - X0}" height="${Y1 - Y0}" fill="${C.sh}" fill-opacity="0.34"/>`);

const RING = { y: 300, dx: 12, r: 18 };
const FLOOR = 354; // the crease the pop-up stands on
{
    const I = 8, x = X0 + I, y = Y0 + I, w = X1 - X0 - 2 * I, h = Y1 - Y0 - 2 * I;
    let s = `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="${C.card}"/>`;
    // A pressed double border with quarter-round corners.
    s += pressed(`M${x} ${y}h${w}v${h}h${-w}Z`, 0.6, 0.8);
    s += pressed(`M${x + 4} ${y + 4}h${w - 8}v${h - 8}h${-(w - 8)}Z`, 0.4, 0.6);
    let corners = '';
    for (const [cx, cy, a0] of [[x + 4, y + 4, 0], [x + w - 4, y + 4, 90], [x + w - 4, y + h - 4, 180], [x + 4, y + h - 4, 270]]) {
        for (const r of [9, 15, 21]) corners += `M${PP(pol([cx, cy], r, a0))}A${r} ${r} 0 0 1 ${PP(pol([cx, cy], r, a0 + 90))}`;
    }
    s += pressed(corners, 0.45, 0.7);
    // A pressed burst around the rings: few rays, embossed only.
    let rays = '';
    const c = [CX, RING.y];
    for (let k = 0; k < 24; k++) rays += `M${PP(pol(c, 31, k * 15 + 7.5))}L${PP(pol(c, k % 2 ? 38 : 43, k * 15 + 7.5))}`;
    s += pressed(rays, 0.45, 0.5);
    // Blind-embossed botanicals inside the arch: two branches rising along its sides, a few open blossoms.
    {
        let bot = '';
        const leafO = (x0, y0, len, a, w = 0.34) => {
            const dx = Math.cos(rad(a)), dy = Math.sin(rad(a));
            const p = (t, q) => P(x0 + (dx * t - dy * q) * len, y0 + (dy * t + dx * q) * len);
            return `M${p(0, 0)}Q${p(0.45, -w)} ${p(1, 0)}Q${p(0.45, w)} ${p(0, 0)}M${p(0.1, 0)}L${p(0.8, 0)}`;
        };
        for (const m of [1, -1]) {
            const X = v => CX + m * (v - CX);
            const A = [128, 262], B = [124, 205], E = [156, 166];
            bot += `M${P(X(A[0]), A[1])}Q${P(X(B[0]), B[1])} ${P(X(E[0]), E[1])}`;
            for (let k = 0; k < 8; k++) {
                const t = 0.08 + k * 0.118, u = 1 - t;
                const x = u * u * A[0] + 2 * t * u * B[0] + t * t * E[0], y = u * u * A[1] + 2 * t * u * B[1] + t * t * E[1];
                const tx = 2 * u * (B[0] - A[0]) + 2 * t * (E[0] - B[0]), ty = 2 * u * (B[1] - A[1]) + 2 * t * (E[1] - B[1]);
                const dir = (Math.atan2(ty, tx) * 180) / Math.PI, len = 15 - k * 0.7;
                for (const sd of [-1, 1]) {
                    const a = dir + sd * 46;
                    const ax = Math.cos(rad(a)), ay = Math.sin(rad(a));
                    // mirrored by hand: reflect the start point and the direction
                    bot += leafO(X(x), y, len, m > 0 ? a : 180 - a, 0.34);
                    void ax; void ay;
                }
            }
            for (const [bx, by, br, rot] of [[150, 214, 8, 10], [143, 243, 6.4, 40], [163, 188, 6, 0]]) {
                for (let k = 0; k < 5; k++) bot += petalD(X(bx), by, br, rot + k * 72);
                bot += `M${P(X(bx) - 1.4, by)}a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0`;
            }
        }
        s += pressed(bot, 0.5, 0.85);
    }
    // The crease the pop-up stands on.
    s += pressed(`M${x + 8} ${FLOOR}H${x + w - 8}`, 0.5, 0.7);
    svg('inner', [X0, Y0, X1 - X0, Y1 - Y0], s);
}

// Two interlocked rings in foil: each a hairline pair, the left one passing over the right at the top.
{
    const c1 = [CX - RING.dx, RING.y], c2 = [CX + RING.dx, RING.y], r = RING.r;
    const ring = c => `<circle cx="${c[0]}" cy="${c[1]}" r="${r}"/>`;
    const over = (rr) => `M${PP(pol(c1, rr, -70))}A${rr} ${rr} 0 0 1 ${PP(pol(c1, rr, -24))}`;
    svg('rings', [CX - 38, RING.y - 24, 76, 50],
        `<g fill="none"><g transform="translate(.7 1)" stroke="${C.sh}" stroke-opacity="0.3" stroke-width="1.5">${ring(c1)}${ring(c2)}</g>` +
        `<g stroke="url(#f)" stroke-width="1.5">${ring(c1)}${ring(c2)}</g>` +
        `<path d="${over(r)}" stroke="${C.card}" stroke-width="2.6"/><path d="${over(r)}" stroke="url(#f)" stroke-width="1.5"/></g>`);
}

svg('dusk', [X0, Y0, X1 - X0, Y1 - Y0], `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="${C.dusk}"/>`);

/* ---------- The pop-up: a laser-cut arch standing on the crease, and paper flowers on it ---------- */
const AC = [CX, 212], RO = 90, RI = 72, RM = 81; // the arch: centre of its round head, outer, inner and middle radii
const arch = (t, r = RM) => [AC[0] + r * Math.sin(rad(t)), AC[1] - r * Math.cos(rad(t))]; // t = 0 at the crown
{
    const band = `M${CX - RO} ${FLOOR}V${AC[1]}A${RO} ${RO} 0 0 1 ${CX + RO} ${AC[1]}V${FLOOR}H${CX + RI}V${AC[1]}A${RI} ${RI} 0 0 0 ${CX - RI} ${AC[1]}V${FLOOR}Z`;
    let holes = '';
    // A trellis: diamonds along the band, pin-pricks between them.
    for (let t = -84; t <= 84.1; t += 10.5) {
        const a = arch(t - 3.6), b = arch(t, RM + 5.4), c = arch(t + 3.6), d = arch(t, RM - 5.4);
        holes += `M${PP(a)}L${PP(b)}L${PP(c)}L${PP(d)}Z`;
        if (t < 80) {
            const m = arch(t + 5.25, RM + 5.6), n = arch(t + 5.25, RM - 5.6);
            holes += dot(m[0], m[1], 1.1) + dot(n[0], n[1], 1.1);
        }
    }
    for (const sx of [-1, 1]) {
        for (let y = AC[1] + 12; y < FLOOR - 8; y += 13.6) {
            const x = CX + sx * RM;
            holes += `M${P(x, y - 4.6)}l5.4 4.6-5.4 4.6-5.4-4.6z`;
            if (y + 6.8 < FLOOR - 6) holes += dot(x - 5.6, y + 6.8, 1.1) + dot(x + 5.6, y + 6.8, 1.1);
        }
    }
    // A second, thinner arch behind: depth.
    const R2 = 64, R3 = 59.5;
    const back = `M${CX - R2} ${FLOOR}V${AC[1]}A${R2} ${R2} 0 0 1 ${CX + R2} ${AC[1]}V${FLOOR}H${CX + R3}V${AC[1]}A${R3} ${R3} 0 0 0 ${CX - R3} ${AC[1]}V${FLOOR}Z`;
    const edge = r => `M${CX - r} ${FLOOR}V${AC[1]}A${r} ${r} 0 0 1 ${CX + r} ${AC[1]}V${FLOOR}`;
    svg('arch', [CX - RO - 2, AC[1] - RO - 2, 2 * RO + 10, FLOOR - AC[1] + RO + 8],
        `<defs><mask id="m" maskUnits="userSpaceOnUse" x="${CX - RO - 2}" y="${AC[1] - RO - 2}" width="${2 * RO + 4}" height="${FLOOR - AC[1] + RO + 4}"><path d="${band}" fill="#fff"/><path d="${holes}" fill="#000"/></mask></defs>` +
        `<path d="${back}" transform="translate(1.6 2.2)" fill="${C.sh}" fill-opacity="0.26"/><path d="${back}" fill="${C.paperBack}" stroke="${C.line}" stroke-width="0.3"/>` +
        `<g transform="translate(1.8 2.5)"><rect x="${CX - RO}" y="${AC[1] - RO}" width="${2 * RO}" height="${FLOOR - AC[1] + RO}" fill="${C.sh}" fill-opacity="0.3" mask="url(#m)"/></g>` +
        `<g mask="url(#m)"><rect x="${CX - RO}" y="${AC[1] - RO}" width="${2 * RO}" height="${FLOOR - AC[1] + RO}" fill="${C.white}"/>` +
        foilLine(edge(RO - 1.7), 0.7) + pressed(edge(RI + 1.7), 0.45, 0.8) + `</g>`);
}

/** A flower cluster as one layer. Items: ['f'|'r'|'b', t, radius, size, rot] on the arch, or with x,y given directly ('F','R','B'), leaves ['l', x, y, len, angle]. */
const G = 1.08; // how much the flowers grew with the arch
function cluster(name, box, items, extra = '') {
    let s = extra;
    for (const it of items) {
        const [k] = it;
        if (k === 'l') { s += leaf(it[1] + (it[1] < CX ? 75 - RM : RM - 75), it[2] + 4, it[3] * G, it[4]); continue; }
        if (k === 'L') { const [x, y] = arch(it[1], it[2] + RM - 75); s += leaf(x, y, it[3] * G, it[1] - 90 + it[4]); continue; }
        const onArch = k === k.toLowerCase();
        // Pillar pieces are given for the first drawing's pillars (105 and 255): carried out to where the pillars stand now.
        const [x, y] = onArch ? arch(it[1], it[2] + RM - 75) : [it[1] + (it[1] < CX ? 75 - RM : RM - 75), it[2] + 4];
        const kind = k.toLowerCase();
        s += kind === 'b' ? blossom(x, y, it[3] * G, it[4]) : flower(x, y, it[3] * G, it[4], kind === 'r');
    }
    return svg(name, box, s);
}

// The crown: hanging strands inside the arch, leaves fanning out, a rose at the top.
{
    let strands = '';
    for (const [x, y0, len] of [[152, 149, 26], [166, 143, 48], [181, 141, 72], [195, 144, 52], [209, 150, 30]]) {
        strands += foilLine(`M${x} ${y0}q1.4 ${len / 2} 0 ${len}`, 0.5);
        strands += blossom(x + 0.6, y0 + len * 0.36, 2.9, x) + blossom(x + 0.6, y0 + len * 0.68, 3.2, x * 2) + blossom(x, y0 + len, 3.8, x * 3);
    }
    sizes['blooms-top'] = cluster('blooms-top', [100, 94, 160, 128], [
        ['L', -33, 82, 17, -18], ['L', -22, 84, 16, 14], ['L', -8, 85, 17, -16], ['L', 9, 85, 17, 18], ['L', 23, 84, 16, -12], ['L', 34, 82, 17, 20],
        ['L', -27, 68, 12, 196], ['L', 28, 68, 12, 166],
        ['b', -10, 90, 4.8, 10], ['b', 27, 89, 4.6, 40], ['b', -29, 62, 5, 22], ['b', 11, 61, 5, 60],
        ['r', -37, 76, 10.4, 12], ['f', 36, 75, 10.8, 50],
        ['f', -19, 74, 11.8, -20], ['f', 19, 76, 12.2, 8],
        ['r', 0, 77, 15, -90],
    ], strands);
}
// The two shoulders and the pillars: flowers thinning out toward the foot, the trellis showing below.
sizes['blooms-l'] = cluster('blooms-l', [62, 126, 84, 200], [
    ['L', -47, 82, 16, -14], ['L', -60, 83, 16, 16], ['L', -74, 82, 16, -14], ['L', -87, 82, 15, 12],
    ['l', 98, 236, 15, 168], ['l', 97, 268, 14, 150], ['l', 112, 280, 12, 52], ['l', 104, 296, 14, 96],
    ['b', -60, 90, 4.8, 15], ['b', -77, 61, 5, 44], ['B', 118, 247, 4.4, 5], ['B', 95, 258, 4.2, 30], ['B', 107, 291, 4.2, 12],
    ['f', -52, 75, 12.4, 30], ['r', -68, 77, 10.2, -8], ['f', -84, 74, 12, 62],
    ['R', 104, 239, 10.6, 20], ['F', 107, 260, 8.2, 44], ['F', 102, 277, 6.6, 10],
]);
sizes['blooms-r'] = cluster('blooms-r', [214, 126, 84, 200], [
    ['L', 46, 82, 16, 14], ['L', 59, 83, 16, -16], ['L', 73, 82, 16, 14], ['L', 86, 82, 15, -12],
    ['l', 262, 238, 15, 12], ['l', 263, 266, 14, 30], ['l', 248, 282, 12, 128], ['l', 257, 294, 14, 84],
    ['b', 62, 90, 4.6, 50], ['b', 75, 61, 5, 8], ['B', 243, 250, 4.4, 40], ['B', 265, 254, 4.2, 0], ['B', 254, 290, 4.2, 26],
    ['r', 51, 76, 11.4, 4], ['f', 66, 74, 12.6, 80], ['f', 83, 77, 10.2, 22],
    ['F', 256, 237, 11.4, -14], ['R', 252, 258, 8.6, 30], ['F', 258, 276, 6.8, 58],
]);

// Flecks of foil among the flowers: they catch the light once the card is open.
{
    const fleck = (x, y, s) => `<path d="M${P(x, y - s)}L${P(x + s * 0.7, y)}L${P(x, y + s)}L${P(x - s * 0.7, y)}Z"/>`;
    svg('flecks', [100, 120, 160, 220],
        `<g fill="url(#f)">` +
        [[150, 176, 1.9], [212, 184, 1.6], [180, 206, 2.2], [136, 214, 1.5], [226, 226, 1.8], [158, 236, 1.4], [203, 244, 1.6], [130, 318, 1.5], [231, 322, 1.7], [180, 332, 1.9], [146, 262, 1.3], [215, 268, 1.4]]
            .map(([x, y, s]) => fleck(x, y, s)).join('') + `</g>`);
}

// One petal: the stage scatters copies of it when the arch stands up.
svg('petal', [174, 170, 14, 12], loosePetal(176, 176, 9, 14, { off: [0.8, 1.2], so: 0.3 }));

/* ---------- The silk band, the bow, and the sprig tucked under it ---------- */
svg('sprig', [96, 154, 174, 172], sprig(120, 298, 244, 180, 8, 23, { bend: 8, so: 0.44 }));

const silkEdge = d => `<path d="${d}" fill="none" stroke="url(#f)" stroke-width="0.5"/>`;
{
    const x = X0 - 1.5, w = X1 - X0 + 3, y = BAND - 7.5, h = 15;
    svg('band', [x, y - 1, w + 2, h + 5],
        `<rect x="${x + 0.6}" y="${y + 1.9}" width="${w}" height="${h}" fill="${C.sh}" fill-opacity="0.4"/>` +
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.silk}"/>` +
        `<rect x="${x}" y="${y + 1.8}" width="${w}" height="4" fill="${C.silkHi}"/>` +
        `<rect x="${x}" y="${y + 11}" width="${w}" height="4" fill="#DBC5B9"/>` +
        silkEdge(`M${x} ${y + 0.9}h${w}M${x} ${y + h - 0.9}h${w}`));
}
/** A piece of the bow: a hard shadow, the flat silk, then its facets. */
const silk = (d, fill, extra = '', off = [1, 1.9], so = 0.36) =>
    `<path d="${d}" transform="translate(${off[0]} ${off[1]})" fill="${C.sh}" fill-opacity="${so}"/><path d="${d}" fill="${fill}"/>${extra}`;
// The tails: two strips hanging from the knot, each cut to a swallow tail.
{
    const tail = (ax, ay, bx, by, w) => {
        const L = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L, dy = (by - ay) / L, nx = -dy, ny = dx, hw = w / 2;
        const q = (t, s) => P(ax + dx * t + nx * s, ay + dy * t + ny * s);
        const d = `M${q(0, -hw * 0.7)}L${q(L, -hw)}L${q(L - 5, 0)}L${q(L + 1.5, hw)}L${q(0, hw * 0.7)}Z`;
        return silk(d, C.silk,
            `<path d="M${q(2, -hw * 0.7)}L${q(L - 1, -hw)}L${q(L - 4, -hw + 3)}L${q(2, -hw * 0.7 + 2.4)}Z" fill="${C.silkHi}"/>` +
            silkEdge(`M${q(0, -hw * 0.7 + 0.5)}L${q(L - 0.6, -hw + 0.6)}M${q(0, hw * 0.7 - 0.5)}L${q(L + 0.6, hw - 0.6)}`));
    };
    svg('tails', [146, 238, 60, 60], tail(177, 243.5, 158, 271, 10) + tail(182, 244, 191, 289, 10));
}
// The loops: folded ribbon, flat planes and crisp folds. The upper plane is the lit face, the lower one the plain
// face, the turn at the far end a darker facet, and the inside of the loop is the ribbon's back.
{
    const loop = m => {
        const X = x => (m ? 360 - x : x);
        const pts = a => a.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x)} ${y}`).join('') + 'Z';
        // Two planes: the band going out (lit) and the band coming back under it (plain), meeting in a crisp fold.
        const outer = pts([[175.5, 233.6], [141, 222.4], [135.6, 232], [141.6, 245.4], [175.5, 242.8]]);
        const upper = pts([[175.5, 233.6], [141, 222.4], [135.6, 232], [175.5, 238.4]]);
        const under = pts([[168, 238.2], [146, 234.2], [148.6, 239.8], [168, 240.6]]);
        return silk(outer, C.silk,
            `<path d="${upper}" fill="${C.silkHi}"/><path d="${under}" fill="${C.silkLo}"/>` +
            `<path d="M${X(175.5)} 238.4L${X(135.6)} 232" fill="none" stroke="#BFA497" stroke-width="0.45"/>` +
            silkEdge(`M${X(141.9)} 244.9L${X(175.5)} 242.3M${X(141.2)} 223L${X(175.5)} 234.1`));
    };
    svg('loop-l', [128, 212, 52, 36], loop(false));
    svg('loop-r', [180, 212, 52, 36], loop(true));
}
// The knot: one flat turn of ribbon over the crossing, a fold down its right third.
svg('knot', [170, 226, 22, 26],
    silk('M175.4 229.8L184.6 229L186 246.2L174.4 247Z', C.silkHi,
        `<path d="M181.6 229.3L184.6 229L186 246.2L182.6 246.4Z" fill="${C.silk}"/>` +
        `<path d="M181.6 229.3L182.6 246.4" fill="none" stroke="#BFA497" stroke-width="0.4"/>`));

console.log(JSON.stringify(BOX));
console.log('cells', HOLES.cells, 'door holes bytes', HOLES.d.length);
