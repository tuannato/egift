/**
 * Favourite wrappers: a short list of wrapper ids, kept in this browser by
 * the person's own press on a heart and nowhere else. It says nothing about
 * any gift: no link, no address, no amount.
 */
const FAV_KEY = 'gift.fav';
const ID_RE = /^[a-z0-9-]{1,24}$/;
/** More than this is not a list of favourites. */
const MAX = 200;

function read(): string[] {
    try {
        const raw = localStorage.getItem(FAV_KEY);
        if (raw === null) return [];
        const list: unknown = JSON.parse(raw);
        if (!Array.isArray(list)) return [];
        return [...new Set(list.filter((x): x is string => typeof x === 'string' && ID_RE.test(x)))].slice(0, MAX);
    } catch {
        return [];
    }
}

function write(list: readonly string[]): boolean {
    try {
        if (list.length === 0) localStorage.removeItem(FAV_KEY);
        else localStorage.setItem(FAV_KEY, JSON.stringify(list));
        return true;
    } catch {
        return false;
    }
}

/** The favourite wrapper ids, oldest first. */
export function loadFavs(): string[] {
    return read();
}

export function isFav(id: string): boolean {
    return read().includes(id);
}

/** Put a wrapper among the favourites or take it out. Returns whether it is one now. */
export function toggleFav(id: string): boolean {
    if (!ID_RE.test(id)) return false;
    const list = read();
    const at = list.indexOf(id);
    if (at >= 0) {
        list.splice(at, 1);
        write(list);
        return false;
    }
    list.push(id);
    return write(list.slice(-MAX));
}
