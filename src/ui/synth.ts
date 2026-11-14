/**
 * The instruments: a handful of fixed recipes, and the one way a note is put
 * on the audio clock.
 *
 * Everything here is synthesized — oscillators, a filter, a little generated
 * noise. There are no audio files. A recipe is plain data (partials and an
 * envelope), so that how loud a tune can get is arithmetic, not a matter of
 * listening: whoever writes the tunes may not be able to hear them.
 *
 * A note cannot be loud, low enough to be inaudible on a phone, or high
 * enough to hurt: the frequency it ends on is held between 60 Hz and 4.5 kHz,
 * and every envelope rises over at least 5 ms and falls over at least 20 ms,
 * so nothing clicks.
 */

import type { Instrument, NoteDef } from '../stage';
import { INSTRUMENT_NAMES } from '../stage';

export type { Instrument };
export { INSTRUMENT_NAMES };
export type Note = NoteDef;

interface Partial {
    /** Frequency as a multiple of the note's. */
    readonly r: number;
    /** Its share of the note's peak. */
    readonly g: number;
    readonly type?: OscillatorType;
    /** How long this partial lasts, as a share of the note's ring. Default 1. */
    readonly fall?: number;
}

export interface Recipe {
    /** `ring`: struck, and dying away on its own. `hold`: sounding for as long as the note is held. */
    readonly kind: 'ring' | 'hold';
    /** Milliseconds to full strength (never under 5). */
    readonly attack: number;
    /** `ring`: milliseconds it takes to die away. `hold`: milliseconds of release (never under 20). */
    readonly tail: number;
    readonly partials: readonly Partial[];
    /** Low-pass cutoff in Hz, for the buzzy waves. */
    readonly lp?: number;
    /** The gain of a note played at full strength. Nothing here is loud. */
    readonly peak: number;
}

export const PITCH_MIN = 36;
export const PITCH_MAX = 96;
const HZ_MIN = 60;
const HZ_MAX = 4500;
const PARTIAL_MAX = 9000;
const ATTACK_MIN = 0.005;
const TAIL_MIN = 0.02;

export const INSTRUMENTS: Record<Instrument, Recipe> = {
    // A small bell: the hum, an octave, and two inharmonic partials that go first.
    bell: { kind: 'ring', attack: 5, tail: 1500, peak: 0.034, partials: [{ r: 1, g: 1 }, { r: 2, g: 0.42, fall: 0.7 }, { r: 2.76, g: 0.26, fall: 0.45 }, { r: 5.4, g: 0.1, fall: 0.2 }] },
    // A music box: a comb's tooth. Clear, short, a glint on top.
    tine: { kind: 'ring', attack: 5, tail: 900, peak: 0.036, partials: [{ r: 1, g: 1 }, { r: 4, g: 0.22, fall: 0.35 }, { r: 6.3, g: 0.07, fall: 0.15 }] },
    // A plucked string.
    pluck: { kind: 'ring', attack: 5, tail: 700, peak: 0.04, lp: 3200, partials: [{ r: 1, g: 1, type: 'triangle' }, { r: 2, g: 0.32, fall: 0.6 }, { r: 3, g: 0.14, fall: 0.35 }] },
    // Wood struck with a soft mallet.
    wood: { kind: 'ring', attack: 5, tail: 300, peak: 0.044, partials: [{ r: 1, g: 1 }, { r: 4, g: 0.28, fall: 0.25 }] },
    // A wet finger on a glass rim: it speaks slowly and sings.
    glassy: { kind: 'hold', attack: 30, tail: 220, peak: 0.03, partials: [{ r: 1, g: 1 }, { r: 2.01, g: 0.28 }, { r: 3.02, g: 0.1 }] },
    // A soft pipe.
    reed: { kind: 'hold', attack: 45, tail: 130, peak: 0.034, lp: 2600, partials: [{ r: 1, g: 1, type: 'triangle' }, { r: 2, g: 0.18 }] },
    // A muted horn.
    brass: { kind: 'hold', attack: 55, tail: 150, peak: 0.022, lp: 1700, partials: [{ r: 1, g: 1, type: 'sawtooth' }, { r: 1, g: 0.5 }] },
    // Something soft held underneath.
    pad: { kind: 'hold', attack: 240, tail: 520, peak: 0.02, partials: [{ r: 1, g: 1 }, { r: 1.006, g: 0.8 }, { r: 0.5, g: 0.3, type: 'triangle' }] },
    // A breath of noise through a narrow band: paper, a brush, something poured.
    noise: { kind: 'ring', attack: 8, tail: 200, peak: 0.05, partials: [] },
};

/** Hz of a MIDI pitch. */
export function hz(pitch: number): number {
    return 440 * 2 ** ((pitch - 69) / 12);
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** The gain a note reaches at its loudest, all partials in step: the worst case, used to hold tunes to a ceiling. */
export function notePeak(n: Note, fallback: Instrument): number {
    const r = INSTRUMENTS[n.inst ?? fallback] ?? INSTRUMENTS[fallback];
    const sum = r.partials.length ? r.partials.reduce((a, p) => a + p.g, 0) : 1;
    return r.peak * clamp(n.gain ?? 0.6, 0, 1) * sum;
}

/** Milliseconds from a note's start until it has died away. */
export function noteLength(n: Note, fallback: Instrument): number {
    const r = INSTRUMENTS[n.inst ?? fallback] ?? INSTRUMENTS[fallback];
    return r.kind === 'ring' ? Math.max(n.dur, r.tail) : n.dur + Math.max(20, r.tail);
}

/** A second of white noise, made once per context. */
const noiseOf = new WeakMap<object, AudioBuffer>();
function noiseBuffer(ctx: AudioContext): AudioBuffer | null {
    const have = noiseOf.get(ctx);
    if (have) return have;
    if (typeof ctx.createBuffer !== 'function') return null;
    const rate = ctx.sampleRate || 44100;
    const buf = ctx.createBuffer(1, Math.floor(rate), rate);
    const data = buf.getChannelData(0);
    // A fixed, seeded sequence: the same breath every time.
    let a = 0x2f6e2b1;
    for (let i = 0; i < data.length; i++) {
        a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
        data[i] = (a / 4294967296) * 2 - 1;
    }
    noiseOf.set(ctx, buf);
    return buf;
}

/** What can be stopped. */
export interface Sounding {
    stop(when?: number): void;
    disconnect?(): void;
    onended?: (() => void) | null;
}

/**
 * Put one note on the clock, `t0` seconds on the context's time, sounding into `out`.
 * Returns the sources it started, so that a tune can be cut short. Never throws.
 */
export function schedule(ctx: AudioContext, out: AudioNode, n: Note, t0: number, fallback: Instrument): Sounding[] {
    const made: Sounding[] = [];
    try {
        const name = n.inst ?? fallback;
        const r = INSTRUMENTS[name] ?? INSTRUMENTS[fallback];
        const t = t0 + Math.max(0, n.at) / 1000;
        const held = clamp(n.dur, 30, 4000) / 1000;
        const strength = clamp(n.gain ?? 0.6, 0, 1);
        if (strength <= 0) return made;
        const f0 = clamp(hz(clamp(n.pitch, PITCH_MIN, PITCH_MAX)), HZ_MIN, HZ_MAX);
        const f1 = n.bend ? clamp(f0 * 2 ** (clamp(n.bend, -24, 24) / 12), HZ_MIN, HZ_MAX) : f0;
        const attack = Math.max(ATTACK_MIN, r.attack / 1000);
        const tail = Math.max(TAIL_MIN, r.tail / 1000);
        const peak = r.peak * strength;

        /** One source through its own envelope. */
        const voice = (src: AudioScheduledSourceNode, level: number, fall: number, pre?: AudioNode): void => {
            const g = ctx.createGain();
            const top = Math.max(0.0002, level);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(top, t + attack);
            let end: number;
            if (r.kind === 'ring') {
                end = t + Math.max(attack + TAIL_MIN, Math.max(held, tail) * fall);
                g.gain.exponentialRampToValueAtTime(0.0001, end);
            } else {
                g.gain.setTargetAtTime(top * 0.8, t + attack, 0.09);
                g.gain.setTargetAtTime(0.0001, t + Math.max(attack, held), tail / 4);
                end = t + Math.max(attack, held) + tail;
            }
            (pre ?? src).connect(g);
            g.connect(out);
            src.start(t);
            src.stop(end + 0.05);
            const s = src as unknown as Sounding;
            s.onended = () => {
                try {
                    g.disconnect();
                } catch {
                    /* already gone */
                }
            };
            made.push(s);
        };

        if (name === 'noise') {
            const buf = noiseBuffer(ctx);
            if (!buf || typeof ctx.createBufferSource !== 'function' || typeof ctx.createBiquadFilter !== 'function') return made;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(f0, t);
            if (f1 !== f0) bp.frequency.exponentialRampToValueAtTime(f1, t + held);
            bp.Q.setValueAtTime(1.4, t);
            src.connect(bp);
            voice(src, peak, 1, bp);
            return made;
        }

        for (const p of r.partials) {
            const pf0 = f0 * p.r, pf1 = f1 * p.r;
            if (pf0 > PARTIAL_MAX || pf1 > PARTIAL_MAX) continue;
            const osc = ctx.createOscillator();
            osc.type = p.type ?? 'sine';
            osc.frequency.setValueAtTime(pf0, t);
            if (pf1 !== pf0) osc.frequency.exponentialRampToValueAtTime(pf1, t + held);
            let pre: AudioNode | undefined;
            if (r.lp !== undefined && typeof ctx.createBiquadFilter === 'function') {
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(r.lp, t);
                osc.connect(lp);
                pre = lp;
            }
            voice(osc, peak * p.g, p.fall ?? 1, pre);
        }
    } catch {
        /* sound is a nicety */
    }
    return made;
}
