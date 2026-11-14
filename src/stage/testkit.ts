// Test helper: a manual clock for the stage's `clock` seam. Not imported by app code.
import type { StageClock } from './format';

export interface FakeClock extends StageClock {
    /** Advance time by `ms` and run the one pending frame callback, if any. */
    step(ms: number): void;
    pending(): boolean;
}

export function fakeClock(): FakeClock {
    let t = 1000;
    let next = 1;
    const queue = new Map<number, () => void>();
    return {
        now: () => t,
        raf(cb) {
            const id = next++;
            queue.set(id, cb);
            return id;
        },
        caf(id) {
            queue.delete(id);
        },
        step(ms) {
            t += ms;
            const [first] = queue.entries();
            if (first) {
                queue.delete(first[0]);
                first[1]();
            }
        },
        pending: () => queue.size > 0,
    };
}
