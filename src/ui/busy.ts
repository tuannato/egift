/**
 * Operations in flight (a take-home or a re-key whose answer has not come
 * back yet). While any runs, the page must not remount: the language switch
 * is disabled. Held in memory only.
 */
let count = 0;
const listeners = new Set<() => void>();

export function isBusy(): boolean {
    return count > 0;
}

/** Count `p` as in flight until it settles. Returns `p`. */
export function track<T>(p: Promise<T>): Promise<T> {
    count++;
    notify();
    const end = () => {
        count = Math.max(0, count - 1);
        notify();
    };
    p.then(end, end);
    return p;
}

export function onBusyChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function notify(): void {
    for (const fn of [...listeners]) fn();
}

/** For tests: forget everything in flight. */
export function resetBusy(): void {
    count = 0;
    notify();
}
