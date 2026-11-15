import { describe, expect, it } from 'vitest';
import { SOUND_LIMITS, openLength, wrapperProblems } from '../stage';
import { noteLength, notePeak } from '../ui/synth';
import { WRAPPERS } from './index';
import { lock } from './lock';

describe('the lock: the hidden wrapper a riddle-locked gift wears', () => {
    it('is a valid wrapper', () => {
        expect(wrapperProblems(lock)).toEqual([]);
    });

    it('opens in at most a second and a half, and reveals within it', () => {
        expect(openLength(lock)).toBeLessThanOrEqual(1500);
        expect(lock.revealAt).toBeLessThanOrEqual(openLength(lock));
    });

    it('is hidden: nobody can pick it', () => {
        expect(WRAPPERS.some(w => w.id === 'lock')).toBe(false);
    });

    it('has a short, quiet sound of its own, in line with the others', () => {
        const s = lock.sound!;
        const notes = s.score ?? [];
        expect(notes.length).toBeGreaterThanOrEqual(3);
        expect(notes.length).toBeLessThanOrEqual(6);
        expect(Math.max(...notes.map(n => n.at + n.dur))).toBeLessThanOrEqual(1500);
        expect(s.tonic - 12).toBeGreaterThanOrEqual(SOUND_LIMITS.pitch[0]);
        expect(s.tonic + 19).toBeLessThanOrEqual(SOUND_LIMITS.pitch[1]);
        // The loudest moment, by the same arithmetic the shipped tunes are held to.
        const peak = Math.max(0, ...notes.map(n => notes.filter(o => o.at <= n.at && o.at + noteLength(o, s.inst) * 0.35 > n.at).reduce((a, o) => a + notePeak(o, s.inst), 0)));
        expect(peak).toBeLessThanOrEqual(0.14);
        expect(peak).toBeGreaterThanOrEqual(0.05);
        // It ends on its home note.
        const lead = notes.filter(n => (n.inst ?? s.inst) === s.inst);
        expect((lead[lead.length - 1]!.pitch - s.tonic) % 12).toBe(0);
    });
});
