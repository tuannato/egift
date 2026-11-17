/**
 * The wallet address a gift was last taken home to, kept so the next gift
 * does not ask for it again.
 *
 * It is written only after a gift has arrived at that address, on its own
 * unless the person switched that off (`keepsDest`). It is never put into the
 * address box by the page: the take-home screen shows it in full, and the
 * person presses to use it or to forget it. One key, one address (or the word
 * "off"), and nothing about any gift: this file knows no package, no amount
 * and no record.
 */

const DEST_KEY = 'gift.dest';
const OFF = 'off';
/** The one spelling that is kept: prefix, type, 41 characters. Anything else is not stored and not offered. */
const SHAPE = /^ecash:[qp][a-z0-9]{41}$/;

function read(): string | null {
    try {
        return localStorage.getItem(DEST_KEY);
    } catch {
        return null;
    }
}

/** True unless the person switched it off. A browser that refuses storage keeps nothing either way. */
export function keepsDest(): boolean {
    try {
        return localStorage.getItem(DEST_KEY) !== OFF;
    } catch {
        return false;
    }
}

/** The kept address, or null. Only ever a string of the one shape; whether it is a real address is the caller's check. */
export function savedDest(): string | null {
    const v = read();
    return v !== null && SHAPE.test(v) ? v : null;
}

/** Keep the address a gift just arrived at. Nothing is written when the switch is off or the spelling is not the one kept. */
export function rememberDest(to: string): boolean {
    const v = to.trim();
    if (!SHAPE.test(v) || !keepsDest()) return false;
    try {
        localStorage.setItem(DEST_KEY, v);
        return true;
    } catch {
        return false;
    }
}

/** Forget the kept address; the switch stays as it is. */
export function forgetDest(): void {
    try {
        if (localStorage.getItem(DEST_KEY) !== OFF) localStorage.removeItem(DEST_KEY);
    } catch {
        /* nothing was kept */
    }
}

/** Off: the kept address goes and none is kept again. On: the next gift that arrives is remembered. */
export function setKeepsDest(on: boolean): void {
    try {
        if (!on) localStorage.setItem(DEST_KEY, OFF);
        else if (localStorage.getItem(DEST_KEY) === OFF) localStorage.removeItem(DEST_KEY);
    } catch {
        /* nothing to store it in: the choice lasts as long as the page */
    }
}
