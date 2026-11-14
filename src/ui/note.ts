/**
 * Every gift is a unique note. The guilloche behind the amount — the fine
 * interlaced line work of a banknote — is drawn from the package's ADDRESS,
 * which is public. Never from the secret or the key: this module takes one
 * string and imports nothing that could hand it anything else.
 *
 * Same address, same note; two gifts never look the same.
 */
import { svg } from './dom';

export interface NoteParams {
    /** Lobes of the main rosette wave and of the counter-wave that interlaces with it. */
    readonly lobes: number;
    readonly lobes2: number;
    /** Base radius and the two wave depths, as fractions of the rosette's outer radius. */
    readonly inner: number;
    readonly depth: number;
    readonly depth2: number;
    /** How many interlaced copies of the curve, and the twist between neighbours (radians). */
    readonly lines: number;
    readonly twist: number;
    /** Starting phase of the rosette (radians). */
    readonly phase: number;
    /** The engraved ring around the rosette: how many waves, how many per turn, how deep. */
    readonly waves: number;
    readonly waveFreq: number;
    readonly waveAmp: number;
    /** Every `foilEvery`-th line picks up the foil; `hue` shifts where along the foil it starts, 0..1. */
    readonly foilEvery: number;
    readonly hue: number;
}

/** FNV-1a, 32-bit. */
function hash(s: string): number {
    let x = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        x ^= s.charCodeAt(i);
        x = Math.imul(x, 0x01000193) >>> 0;
    }
    return x >>> 0;
}

/** mulberry32: small, fast and the same on every engine. */
function prng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** The note's parameters. Pure: the address in, numbers out. */
export function noteParams(address: string): NoteParams {
    const r = prng(hash(String(address)));
    const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
    const num = (lo: number, hi: number) => lo + r() * (hi - lo);
    const lobes = int(5, 13);
    let lobes2 = int(3, 17);
    if (lobes2 === lobes) lobes2 += 2;
    return {
        lobes,
        lobes2,
        inner: num(0.42, 0.62),
        depth: num(0.12, 0.22),
        depth2: num(0.04, 0.1),
        lines: int(14, 26),
        twist: num(0.05, 0.16),
        phase: num(0, Math.PI * 2),
        waves: int(6, 11),
        waveFreq: num(1.6, 3.4),
        waveAmp: num(0.1, 0.2),
        foilEvery: int(4, 7),
        hue: num(0, 1),
    };
}

const FOIL = ['#D9E7F1', '#7CF3FF', '#EADBFF', '#D9E7F1'];
/** A square drawing, centred in the block and never cropped: a full rosette inside an engraved ring. */
const S = 200;
const f = (n: number) => n.toFixed(1);

let uid = 0;

/** Draw the note as an inline SVG (createElementNS only). Decoration: hidden from assistive tech. */
export function noteSvg(address: string): SVGElement {
    const p = noteParams(address);
    const id = 'note-foil-' + ++uid;
    // The foil, shifted along its own family by `hue`.
    const shift = Math.round(p.hue * FOIL.length) % FOIL.length;
    const stops = [...FOIL.slice(shift), ...FOIL.slice(0, shift)];
    const grad = svg(
        'linearGradient',
        { id, x1: '0', y1: '0', x2: String(S), y2: '0', gradientUnits: 'userSpaceOnUse' },
        ...stops.map((c, i) => svg('stop', { offset: String(i / (stops.length - 1)), 'stop-color': c })),
    );
    const root = svg('svg', {
        class: 'note-svg',
        viewBox: `0 0 ${S} ${S}`,
        preserveAspectRatio: 'xMidYMid meet',
        'aria-hidden': 'true',
        focusable: 'false',
    });
    root.append(svg('defs', null, grad));

    const line = (d: string, foil: boolean) =>
        svg('path', { d, class: foil ? 'note-line note-line--foil' : 'note-line', stroke: foil ? `url(#${id})` : undefined });

    const c = S / 2;
    const N = 240;
    // The rosette: interlaced copies of a doubly-waved circle, all inside the ring.
    const R = 80 / (p.inner + p.depth + p.depth2);
    for (let k = 0; k < p.lines; k++) {
        const ph = p.phase + k * p.twist;
        const scale = 1 - (k / p.lines) * 0.4;
        let d = '';
        for (let i = 0; i <= N; i++) {
            const a = (i / N) * Math.PI * 2;
            const rr = R * scale * (p.inner + p.depth * Math.sin(p.lobes * a + ph) + p.depth2 * Math.cos(p.lobes2 * a - ph * 1.7));
            d += (i ? 'L' : 'M') + f(c + rr * Math.cos(a)) + ' ' + f(c + rr * Math.sin(a));
        }
        root.append(line(d + 'Z', k % p.foilEvery === 0));
    }

    // The engraved ring: fine waves that cross and re-cross around it.
    const freq = Math.round(p.waveFreq * 8) + p.lobes; // whole number of waves, so each closes on itself
    const amp = 2 + p.waveAmp * 14;
    for (let k = 0; k < p.waves; k++) {
        const ph = p.phase + (k / p.waves) * Math.PI * 2;
        let d = '';
        for (let i = 0; i <= N * 2; i++) {
            const a = (i / (N * 2)) * Math.PI * 2;
            const rr = 91 + amp * Math.sin(freq * a + ph);
            d += (i ? 'L' : 'M') + f(c + rr * Math.cos(a)) + ' ' + f(c + rr * Math.sin(a));
        }
        root.append(line(d + 'Z', k === 0));
    }
    return root;
}
