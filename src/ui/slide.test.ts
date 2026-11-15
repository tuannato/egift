import { describe, expect, it } from 'vitest';

import { FOLLOW_BACK, FOLLOW_RATE, followStep } from './slide';

describe('the scene follows the thumb, it is not dragged by it', () => {
    /** Play `frames` of 16 ms with the thumb where `targetAt(ms)` says; returns where the scene stands. */
    const run = (frames: number, targetAt: (ms: number) => number, from = 0): number => {
        let shown = from;
        for (let i = 1; i <= frames; i++) shown = followStep(shown, targetAt(i * 16), 16);
        return shown;
    };

    it('a slow hand is followed exactly: the scene is where the thumb is', () => {
        // The thumb asks for half a millisecond of opening per millisecond: well under the limit.
        expect(run(60, ms => ms * 0.5)).toBeCloseTo(60 * 16 * 0.5, 5);
    });

    it('a flick to the end does not skip the opening: after 200 ms the scene has played 300 ms of it, not 2460', () => {
        const shown = run(Math.round(200 / 16), () => 2460);
        expect(shown).toBeCloseTo(Math.round(200 / 16) * 16 * FOLLOW_RATE, 5);
        expect(shown).toBeLessThan(400);
    });

    it('let go early, the scene goes back to closed, quickly, and stops there', () => {
        expect(run(5, () => 0, 1000)).toBeCloseTo(1000 - 5 * 16 * FOLLOW_BACK, 5);
        expect(run(40, () => 0, 1000)).toBe(0);
    });

    it('never passes the thumb, in either direction, and stands still on a frame of no time', () => {
        expect(followStep(100, 110, 1000)).toBe(110);
        expect(followStep(100, 90, 1000)).toBe(90);
        expect(followStep(100, 500, 0)).toBe(100);
        expect(followStep(100, 500, -5)).toBe(100);
    });
});
