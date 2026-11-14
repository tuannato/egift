import { describe, expect, it } from 'vitest';
import { SOUND_LIMITS, wrapperProblems, type NoteDef, type WrapperDef } from '../stage';
import { INSTRUMENTS, noteLength, notePeak } from '../ui/synth';
import { WRAPPERS } from './index';
import { pitchOf, together, tune } from './tune';

const withSound = WRAPPERS.filter(w => w.sound);

describe('writing a tune', () => {
    it('names are pitches: middle C is C4', () => {
        expect(pitchOf('C4')).toBe(60);
        expect(pitchOf('A4')).toBe(69);
        expect(pitchOf('C#5')).toBe(73);
        expect(pitchOf('Bb3')).toBe(58);
        expect(() => pitchOf('H2')).toThrow();
        expect(() => pitchOf('C')).toThrow();
    });

    it('lengths, dots, rests, ties and chords fall where they are written', () => {
        const n = tune(120, 'C4/4 -/4 E4/8. G4/16 ~/4 [C4 E4]/2');
        expect(n.map(x => x.at)).toEqual([0, 1000, 1375, 2000, 2000]);
        expect(n[2]!.dur).toBe(Math.round((125 * 0.92) + 500));
        expect(n.slice(3).map(x => x.pitch)).toEqual([60, 64]);
    });

    it('a bar that does not add up is an error, so a slip cannot shift the rest', () => {
        expect(() => tune(120, 'C4/4 C4/4 C4/4 C4/4 | C4/4 C4/4 C4/4 | C4/1')).toThrow(/bar 2/);
        expect(() => tune(120, 'C4/4 | C4/2. C4/4 | C4/1')).not.toThrow();
        expect(() => tune(120, 'C4/4 C4/4 C4/4 | C4/2.', { beats: 3 })).not.toThrow();
        expect(() => tune(120, 'C4/x')).toThrow();
    });

    it('lines sounding together come out in order of time', () => {
        const t = together(tune(120, 'C5/4 D5/4'), tune(120, 'C3/2', { gain: 0.4 }));
        expect(t.map(x => x.at)).toEqual([0, 0, 500]);
    });
});

describe('the validator holds a sound to what is short, quiet and playable', () => {
    const base = WRAPPERS[0]!;
    const make = (sound: unknown): WrapperDef => ({ ...base, sound } as unknown as WrapperDef);
    const note = (o: Partial<NoteDef> = {}): NoteDef => ({ at: 0, pitch: 72, dur: 200, ...o });
    const bad = (sound: unknown, re: RegExp) => expect(wrapperProblems(make(sound)).join('\n')).toMatch(re);

    it('a plain, small sound is fine', () => {
        expect(wrapperProblems(make({ v: 1, inst: 'tine', tonic: 72, score: [note(), note({ at: 300, pitch: 76 })] }))).toEqual([]);
        expect(wrapperProblems(make({ v: 1, inst: 'bell', tonic: 60 }))).toEqual([]);
    });

    it('refuses what it does not know', () => {
        bad({ v: 2, inst: 'tine', tonic: 72 }, /sound\.v/);
        bad({ v: 1, inst: 'kazoo', tonic: 72 }, /sound\.inst/);
        bad({ v: 1, inst: 'tine', tonic: 72, url: 'x' }, /sound/i);
        bad({ v: 1, inst: 'tine', tonic: 20 }, /sound\.tonic/);
        bad({ v: 1, inst: 'tine', tonic: 72, score: [{ ...note(), src: 'a.mp3' }] }, /score\[0\]/);
        bad({ v: 1, inst: 'tine', tonic: 72, score: [note({ inst: 'kazoo' as never })] }, /inst/);
    });

    it('refuses notes out of range, or not numbers', () => {
        bad({ v: 1, inst: 'tine', tonic: 72, score: [note({ pitch: 120 })] }, /pitch/);
        bad({ v: 1, inst: 'tine', tonic: 72, score: [note({ pitch: Number.NaN })] }, /pitch/);
        bad({ v: 1, inst: 'tine', tonic: 72, score: [note({ dur: 5 })] }, /dur/);
        bad({ v: 1, inst: 'tine', tonic: 72, score: [note({ gain: 3 })] }, /gain/);
        bad({ v: 1, inst: 'tine', tonic: 72, score: [note({ bend: 40 })] }, /bend/);
        bad({ v: 1, inst: 'tine', tonic: 72, score: [note({ at: -1 })] }, /at/);
    });

    it('refuses a tune that is too long, too crowded or too strong', () => {
        bad({ v: 1, inst: 'tine', tonic: 72, score: Array.from({ length: SOUND_LIMITS.notes + 1 }, (_, i) => note({ at: i * 50, dur: 40 })) }, /at most/);
        bad({ v: 1, inst: 'tine', tonic: 72, score: [note({ at: base.revealAt + SOUND_LIMITS.afterReveal, dur: 500 })] }, /must be over/);
        bad({ v: 1, inst: 'tine', tonic: 72, score: Array.from({ length: 7 }, (_, i) => note({ pitch: 60 + i, gain: 0.2 })) }, /at once/);
        bad({ v: 1, inst: 'tine', tonic: 72, score: Array.from({ length: 5 }, (_, i) => note({ pitch: 60 + i, gain: 0.9 })) }, /too strong/);
    });
});

describe('the tunes that ship', () => {
    it('some wrappers have their own sound, and each is valid', () => {
        expect(withSound.length).toBeGreaterThanOrEqual(3);
        for (const w of withSound) expect(wrapperProblems(w), w.id).toEqual([]);
    });

    it('the small sounds made from the home note stay in range', () => {
        for (const w of withSound) {
            const t = w.sound!.tonic;
            expect(t - 12, w.id).toBeGreaterThanOrEqual(SOUND_LIMITS.pitch[0]);
            expect(t + 19, w.id).toBeLessThanOrEqual(SOUND_LIMITS.pitch[1]);
        }
    });

    it('no tune needs more sources than a phone should be asked for', () => {
        for (const w of withSound) {
            const s = w.sound!;
            const sources = (s.score ?? []).reduce((a, n) => a + Math.max(1, INSTRUMENTS[n.inst ?? s.inst].partials.length), 0);
            expect(sources, w.id).toBeLessThanOrEqual(200);
        }
    });

    /** The loudest moment of a tune, every note at its own peak and in step: the worst case, by arithmetic. */
    const loudest = (w: WrapperDef): number => {
        const s = w.sound!;
        const notes = s.score ?? [];
        return Math.max(0, ...notes.map(n => notes.filter(o => o.at <= n.at && o.at + noteLength(o, s.inst) * 0.35 > n.at).reduce((a, o) => a + notePeak(o, s.inst), 0)));
    };

    it('every tune is quiet, and no tune is much louder than another', () => {
        const peaks = withSound.filter(w => w.sound!.score?.length).map(w => ({ id: w.id, peak: loudest(w) }));
        for (const p of peaks) expect(p.peak, p.id).toBeLessThanOrEqual(0.14);
        const db = peaks.map(p => 20 * Math.log10(p.peak));
        const mid = db.reduce((a, b) => a + b, 0) / db.length;
        peaks.forEach((p, i) => expect(Math.abs(db[i]! - mid), `${p.id} is ${(db[i]! - mid).toFixed(1)} dB from the others`).toBeLessThanOrEqual(3));
    });

    it('the melody sings in the middle, and anything under it is well under it', () => {
        for (const w of withSound) {
            const s = w.sound!;
            const lead = (s.score ?? []).filter(n => (n.inst ?? s.inst) === s.inst && n.pitch >= 60);
            const under = (s.score ?? []).filter(n => n.pitch < 60);
            if (lead.length === 0) continue;
            for (const n of lead) expect(n.pitch, w.id).toBeLessThanOrEqual(88);
            const lowLead = Math.min(...lead.map(n => n.pitch));
            for (const n of under) expect(lowLead - n.pitch, w.id).toBeGreaterThanOrEqual(7);
        }
    });

    it('a tune ends on its home note or the fifth above it, held longer than most', () => {
        for (const w of withSound) {
            const s = w.sound!;
            const lead = (s.score ?? []).filter(n => (n.inst ?? s.inst) === s.inst && n.pitch >= 60);
            if (lead.length === 0) continue;
            const last = lead.reduce((a, n) => (n.at >= a.at ? n : a));
            const fromHome = (((last.pitch - s.tonic) % 12) + 12) % 12;
            expect([0, 4, 7], `${w.id} ends ${fromHome} semitones from home`).toContain(fromHome);
            const sorted = lead.map(n => n.dur).sort((a, b) => a - b);
            expect(last.dur, w.id).toBeGreaterThanOrEqual(sorted[Math.floor(sorted.length / 2)]!);
        }
    });
});
