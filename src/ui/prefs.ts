/**
 * One choice of the giver's, kept so the next gift starts the same way:
 * whether the giver pays the recipient's network fee. On unless the giver
 * switched it off; only the word "off" is ever stored, and nothing about any
 * gift.
 */

const COVER_KEY = 'gift.cover';

/** True unless the giver switched it off. A browser that refuses storage answers "on": that is the default. */
export function coversFee(): boolean {
    try {
        return localStorage.getItem(COVER_KEY) !== 'off';
    } catch {
        return true;
    }
}

export function setCoversFee(on: boolean): void {
    try {
        if (on) localStorage.removeItem(COVER_KEY);
        else localStorage.setItem(COVER_KEY, 'off');
    } catch {
        /* nothing to store it in: the choice lasts as long as the page */
    }
}
