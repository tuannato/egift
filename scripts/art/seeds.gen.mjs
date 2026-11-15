// Generator for the "seeds" wrapper art: a packet of seeds and what grows from it, in the manner
// of a two-ink stencil print: flat shapes, a second ink printed a little out of place, a sun made
// of dots. No outline, no gradient, no filter. Every colour is in the palette `C`, so the art can
// be given in colourways (scripts/colourways.mjs): the flower's colour is also the packet's band.
// Writes SVGs in canvas coordinates (each file's viewBox = its layer box on the 360x450 canvas).
// Run: node scripts/art/seeds.gen.mjs
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'wrappers', 'seeds');
if (!OUT.endsWith('wrappers/seeds')) throw new Error('out dir must be public/wrappers/seeds');
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) if (old.endsWith('.svg')) rmSync(join(OUT, old), { force: true });

/* The palette: paper, a pale green and two leaf greens, two soils, the seed's yellow, the flower's two pinks. */
const C = {
    paper: '#F3ECD8',
    paperLo: '#E2D8BC',
    sage: '#B9D3B0',
    leaf: '#3F8A4F',
    leafDeep: '#1F5B3A',
    soil: '#5A3B28',
    soilLo: '#3E2819',
    seed: '#E0A93B',
    bloom: '#D0607A',
    bloomLo: '#A8405C',
};

const f = n => String(Math.round(n * 100) / 100);
function svg(name, box, inner) {
    const [x, y, w, h] = box;
    writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`);
}
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;

const GROUND = 352; // where the soil starts
const CX = 180; // the plant's stem

/* ---- field: paper, a far hill, garden stakes and their string ---- */
{
    let s = `<rect x="-6" y="-6" width="372" height="462" fill="${C.paper}"/>`;
    s += `<path d="M-6 330C70 276 150 300 214 286C280 272 320 300 366 282V456H-6Z" fill="${C.sage}"/>`;
    // The second ink, out of place: the hill's edge printed again, a little up and to the right.
    s += `<path d="M-2 324C74 270 154 294 218 280C284 266 324 294 370 276" fill="none" stroke="${C.leaf}" stroke-width="2"/>`;
    for (const x of [34, 326]) s += `<rect x="${x}" y="214" width="6" height="150" fill="${C.soil}"/><rect x="${x - 3}" y="210" width="12" height="7" fill="${C.seed}"/>`;
    s += `<path d="M37 232C120 250 240 250 329 232" fill="none" stroke="${C.soil}" stroke-width="1.6"/>`;
    [[66, 238], [104, 244], [142, 248], [218, 248], [256, 244], [294, 238]].forEach(([x, y], i) => (s += `<path d="M${x - 6} ${y}h12l-6 13Z" fill="${i % 2 ? C.seed : C.bloom}"/>`));
    svg('field', [-6, -6, 372, 462], s);
}

/* ---- sun: a disc made of dots, larger toward its middle ---- */
{
    const [sx, sy, R] = [276, 92, 70];
    let s = '';
    for (let j = -8; j <= 8; j++) {
        for (let i = -8; i <= 8; i++) {
            const x = i * 9 + (j % 2 ? 4.5 : 0), y = j * 8;
            const d = Math.hypot(x, y);
            if (d > R) continue;
            s += circle(sx + x, sy + y, 4.3 - 2.9 * (d / R), C.seed);
        }
    }
    svg('sun', [sx - R - 4, sy - R - 4, 2 * R + 8, 2 * R + 8], s);
}

/* ---- packet: a seed packet, standing. A band in the flower's colour, a round window of seeds. ---- */
const PK = [105, 120, 150, 236]; // x, y, w, h: its foot goes into the soil
{
    const [x, y, w, h] = PK;
    // Printed twice: the pale shape, then the darker ink a little out of place, seen as a rim down the right and along the foot.
    let s = `<rect x="${x + 5}" y="${y + 5}" width="${w}" height="${h}" fill="${C.leaf}"/>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.sage}"/>`;
    s += `<rect x="${x}" y="${y + 126}" width="${w}" height="40" fill="${C.bloom}"/>` + `<rect x="${x}" y="${y + 170}" width="${w}" height="5" fill="${C.bloomLo}"/>`;
    // The window: paper, seeds in it.
    s += circle(x + w / 2, y + 74, 40, C.paper) + `<circle cx="${x + w / 2}" cy="${y + 74}" r="40" fill="none" stroke="${C.leafDeep}" stroke-width="3"/>`;
    for (const [dx, dy, r] of [[-16, -12, 22], [12, -18, -30], [-2, 6, 60], [18, 10, 15], [-20, 14, -50], [4, -2, 0], [-6, 24, 80], [22, -4, 40]]) s += `<ellipse cx="${x + w / 2 + dx}" cy="${y + 74 + dy}" rx="6" ry="3.6" fill="${C.seed}" transform="rotate(${r} ${x + w / 2 + dx} ${y + 74 + dy})"/>`;
    // One plain stripe under the band.
    s += `<rect x="${x + 18}" y="${y + 196}" width="${w - 36}" height="7" fill="${C.leaf}"/>`;
    svg('packet', [x - 2, y - 2, w + 10, h + 10], s);
    // The folded top: a darker strip, crimped along its edge.
    let t = `<rect x="${x}" y="${y - 22}" width="${w}" height="26" fill="${C.leaf}"/>`;
    for (let i = 0; i < 15; i++) t += `<path d="M${x + i * 10} ${y - 22}l5 -6l5 6Z" fill="${C.leaf}"/>`;
    t += `<rect x="${x}" y="${y - 6}" width="${w}" height="3" fill="${C.leafDeep}"/>`;
    svg('flap', [x - 2, y - 30, w + 4, 36], t);
}

/* ---- the plant: a stem, three pairs of leaves, a flower. Each piece grows from where it is joined. ---- */
svg('stem', [173, 146, 14, 216], `<rect x="176" y="148" width="8" height="214" rx="4" fill="${C.leafDeep}"/><rect x="180" y="148" width="3" height="214" fill="${C.leaf}"/>`);
{
    /** A leaf of length L from the joint at (CX, y), lifted 26 degrees; `side` is 1 to the right, -1 to the left. */
    const leaf = (name, y, L, side) => {
        const H = L * 0.3;
        const shape = `M0 0C${f(L * 0.3)} ${f(-H)} ${f(L * 0.78)} ${f(-H * 0.85)} ${L} 0C${f(L * 0.78)} ${f(H * 0.85)} ${f(L * 0.3)} ${f(H)} 0 0Z`;
        const tf = `translate(${CX} ${y}) scale(${side} 1) rotate(-26)`;
        // The pale ink first, out of place, then the leaf, then its rib.
        const s = `<path d="${shape}" fill="${C.sage}" transform="translate(${CX + 3 * side} ${y - 3}) scale(${side} 1) rotate(-26)"/>` + `<path d="${shape}" fill="${C.leaf}" transform="${tf}"/>` + `<path d="M4 0H${f(L * 0.86)}" stroke="${C.leafDeep}" stroke-width="2" stroke-linecap="round" transform="${tf}"/>`;
        const box = side > 0 ? [CX - 2, y - L * 0.72, L + 6, L * 0.92] : [CX - L - 4, y - L * 0.72, L + 6, L * 0.92];
        svg(name, box.map(v => Math.round(v)), s);
        return box.map(v => Math.round(v));
    };
    const boxes = {};
    [[322, 78], [268, 64], [216, 50]].forEach(([y, L], i) => {
        boxes[`leaf-r${i + 1}`] = leaf(`leaf-r${i + 1}`, y, L, 1);
        boxes[`leaf-l${i + 1}`] = leaf(`leaf-l${i + 1}`, y, L, -1);
    });
    console.log(JSON.stringify(boxes));
}
{
    // The flower: eight pointed petals in the two pinks, a plain middle.
    const [bx, by] = [CX, 146];
    let s = '';
    for (let i = 0; i < 8; i++) s += `<path d="M0 -12C11 -22 10 -38 0 -47C-10 -38 -11 -22 0 -12Z" fill="${i % 2 ? C.bloomLo : C.bloom}" transform="translate(${bx} ${by}) rotate(${i * 45})"/>`;
    s += circle(bx, by, 15, C.seed) + circle(bx, by, 7, C.soil);
    svg('bloom', [bx - 48, by - 48, 96, 96], s);
}

/* ---- soil: the bed, in front of the foot of the packet and of the stem. Furrows, and seed already sown. ---- */
{
    let s = `<path d="M-6 ${GROUND + 6}C40 ${GROUND - 4} 90 ${GROUND + 8} 140 ${GROUND}C190 ${GROUND - 8} 250 ${GROUND + 8} 300 ${GROUND}C330 ${GROUND - 4} 350 ${GROUND + 2} 366 ${GROUND - 2}V456H-6Z" fill="${C.soil}"/>`;
    for (const [y, o] of [[378, 0], [402, 14], [428, 4]]) {
        s += `<path d="M-6 ${y}C60 ${y - 8} 120 ${y + 6} 180 ${y}C240 ${y - 6} 300 ${y + 8} 366 ${y}" fill="none" stroke="${C.soilLo}" stroke-width="5" stroke-linecap="round"/>`;
        for (let i = 0; i < 9; i++) s += `<ellipse cx="${14 + o + i * 42}" cy="${y - 9}" rx="4.4" ry="2.8" fill="${C.seed}" transform="rotate(${(i * 37) % 60 - 30} ${14 + o + i * 42} ${y - 9})"/>`;
    }
    svg('soil', [-6, 340, 372, 116], s);
}

/* ---- seed: what pours from the packet ---- */
svg('seed', [174, 178, 12, 12], `<ellipse cx="180" cy="184" rx="5.2" ry="3.2" fill="${C.seed}" transform="rotate(-24 180 184)"/>`);
