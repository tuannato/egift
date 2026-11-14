/**
 * Writing a tune as notes with names, for the wrappers that ship with the page.
 *
 *   tune(120, 'E5/4 E5/4 E5/2 | E5/4 G5/4 C5/4. D5/8 | E5/1', { inst: 'tine' })
 *
 * - A note is a name, an octave (always written) and a length: `C#5/4`, `Bb3/8`.
 *   Lengths are parts of a whole note: /1 /2 /4 /8 /16, and /12 for an eighth
 *   of a triplet. A dot after it adds half: `/4.`
 * - A rest is `-/4`.
 * - `~/4` holds the note before it on for that much longer (a tie).
 * - `[C4 E4 G4]/2` is a chord.
 * - `!` after a length plays the note stronger, `?` softer: `E5/4!`
 * - `|` is a bar line, and it is checked: a bar that does not add up to the
 *   metre (4 quarters unless `beats` says otherwise) is an error, so a slip of
 *   the hand cannot shift the rest of the tune. The first and last bars may be
 *   short (an upbeat, a last note let ring).
 *
 * What comes out is plain data (`NoteDef[]`), the same thing a wrapper from
 * anywhere else would carry.
 */
import type { Instrument, NoteDef } from '../stage/format';

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** `C#5` → 73. Middle C is C4 = 60. */
export function pitchOf(name: string): number {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) throw new Error(`tune: "${name}" is not a note (write a letter, an optional # or b, and an octave: C#5).`);
    return 12 * (Number(m[3]) + 1) + STEP[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export interface TuneOptions {
    /** Milliseconds before the first note. */
    readonly start?: number;
    readonly inst?: Instrument;
    /** How hard the notes are played, 0..1. Default 0.6. */
    readonly gain?: number;
    /** How much of its length a note is held, 0..1. Default 0.92. */
    readonly hold?: number;
    /** Quarter notes in a bar. Default 4. */
    readonly beats?: number;
}

/** A tune written out, at `bpm` quarter notes a minute. */
export function tune(bpm: number, text: string, o: TuneOptions = {}): NoteDef[] {
    const quarter = 60000 / bpm;
    const gain = o.gain ?? 0.6;
    const hold = o.hold ?? 0.92;
    const barLen = o.beats ?? 4;
    const out: { at: number; pitch: number; dur: number; gain: number; inst?: Instrument }[] = [];
    /** Quarter notes since the start, and since the last bar line. */
    let pos = 0, inBar = 0, bars = 0;
    /** The notes sounded last, for a tie. */
    let last: typeof out = [];
    // Chords are one token: take the spaces out of them first.
    const tokens = text.replace(/\[([^\]]*)\]/g, (_, inner: string) => `[${inner.trim().split(/\s+/).join(',')}]`).trim().split(/\s+/);
    const count = tokens.filter(t => t === '|').length;
    for (const tok of tokens) {
        if (tok === '|') {
            const first = bars === 0;
            if (Math.abs(inBar - barLen) > 1e-6 && !(first && inBar < barLen)) throw new Error(`tune: bar ${bars + 1} holds ${inBar} quarter notes, not ${barLen}.`);
            bars++;
            inBar = 0;
            continue;
        }
        const m = /^(\[[^\]]+\]|-|~|[A-G][#b]?-?\d)\/(\d+)(\.?)([!?]?)$/.exec(tok);
        if (!m) throw new Error(`tune: "${tok}" is not understood.`);
        const len = (4 / Number(m[2])) * (m[3] ? 1.5 : 1);
        const ms = len * quarter;
        const head = m[1]!;
        if (head === '~') {
            if (last.length === 0) throw new Error('tune: a tie (~) with no note before it.');
            for (const n of last) n.dur += ms;
        } else if (head !== '-') {
            const names = head.startsWith('[') ? head.slice(1, -1).split(',') : [head];
            const g = Math.min(1, Math.max(0.05, gain + (m[4] === '!' ? 0.15 : m[4] === '?' ? -0.15 : 0)));
            last = names.map(name => ({ at: (o.start ?? 0) + pos * quarter, pitch: pitchOf(name), dur: ms * hold, gain: names.length > 1 ? g * 0.8 : g, ...(o.inst ? { inst: o.inst } : {}) }));
            out.push(...last);
        } else last = [];
        pos += len;
        inBar += len;
    }
    // The last bar may be short, but never long.
    if (count > 0 && inBar > barLen + 1e-6) throw new Error(`tune: the last bar holds ${inBar} quarter notes, more than ${barLen}.`);
    return out.map(n => ({ ...n, at: Math.round(n.at), dur: Math.round(n.dur), gain: Math.round(n.gain * 100) / 100 }));
}

/** Several lines sounding together, as one tune in order of time. */
export function together(...parts: readonly NoteDef[][]): NoteDef[] {
    return parts.flat().sort((a, b) => a.at - b.at || b.pitch - a.pitch);
}

/** The same tune played harder or softer throughout: how the tunes are levelled against each other. */
export function scaled(k: number, notes: readonly NoteDef[]): NoteDef[] {
    return notes.map(n => ({ ...n, gain: Math.round(Math.min(1, Math.max(0.05, (n.gain ?? 0.6) * k)) * 100) / 100 }));
}
