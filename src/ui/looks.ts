/**
 * Saved looks: a short list of recipes (an accent, a face, quiet — see
 * `core/recipe.ts`), kept in this browser by the person's own press on
 * "Save this look" and nowhere else. A look belongs to no wrapper and says
 * nothing about any gift.
 */
import { formatRecipe, parseRecipe } from '../core/recipe';

const LOOKS_KEY = 'gift.looks';
/** More than this is not a short list. */
const MAX = 24;

/** The one spelling of a look, or nothing when the text is not a look. */
function canon(text: unknown): string | undefined {
    return typeof text === 'string' ? formatRecipe(parseRecipe(text)) : undefined;
}

/** What is stored, less whatever is not a look in its one spelling. Reading never writes. */
function read(): string[] {
    try {
        const raw = localStorage.getItem(LOOKS_KEY);
        if (raw === null) return [];
        const list: unknown = JSON.parse(raw);
        if (!Array.isArray(list)) return [];
        return [...new Set(list.filter((x): x is string => canon(x) === x))].slice(0, MAX);
    } catch {
        return [];
    }
}

function write(list: readonly string[]): boolean {
    try {
        if (list.length === 0) localStorage.removeItem(LOOKS_KEY);
        else localStorage.setItem(LOOKS_KEY, JSON.stringify(list));
        return true;
    } catch {
        return false;
    }
}

/** The saved looks, oldest first. */
export function loadLooks(): string[] {
    return read();
}

/** Keep a look. Returns whether it is in the list now; a full list takes no more. */
export function saveLook(recipe: string): boolean {
    const look = canon(recipe);
    if (look === undefined || look !== recipe) return false;
    const list = read();
    if (list.includes(look)) return true;
    if (list.length >= MAX) return false;
    return write([...list, look]);
}

/** Take a look out of the list. */
export function removeLook(recipe: string): void {
    const list = read();
    const at = list.indexOf(recipe);
    if (at < 0) return;
    list.splice(at, 1);
    write(list);
}
