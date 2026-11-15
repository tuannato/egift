/**
 * The recipe: how a giver dressed the wrapper they chose (workshop, tier 1).
 *
 * It rides in the link, which nobody signs: anyone passing a link on can
 * rewrite it. So a recipe is never free text. It is a short string from a
 * closed grammar, each part an index into a list that ships with the page:
 *
 *   1  (c<a-z0-9>)?  (f<g|t|m|s|p|b>)?  (sq)?  (a<a-z>)?    fixed order, at least one part
 *
 *   c<x>     an accent from the one list every wrapper shares (`a` the first,
 *            `z` the 26th, then `0`..`9`): the colour of the main button and
 *            of the capsule's small accents, never of the art. A letter that
 *            names no accent yet means the wrapper's own.
 *   f<x>     the face of headings and figures: g grotesk, t tech, m mono,
 *            s serif, p poster (condensed), b slab
 *   sq       quiet: the hand's small sounds only, no opening tune
 *   a<x>     a colourway of the wrapper's own art, from that wrapper's list
 *            (`a` the first). A wrapper without that place is left as it is.
 *
 * Reading is total: a string that is not exactly of this grammar means "no
 * recipe" (the wrapper as its maker left it), never an error and never a
 * half-applied look. There is one spelling for each look, so a recipe read
 * and written again is the same string.
 *
 * Forever: a part that has gone out in links keeps its meaning. New parts are
 * added after the old ones; a new first digit starts a new grammar.
 */

export type RecipeFace = 'grotesk' | 'tech' | 'mono' | 'serif' | 'poster' | 'slab';

export interface Recipe {
    /** Which shared accent, counted from 0. Absent: the wrapper's own. */
    readonly accent?: number;
    /** Absent: the wrapper's own face. */
    readonly face?: RecipeFace;
    /** True: no opening tune. */
    readonly quiet?: true;
    /** Which colourway of the wrapper's art, counted from 0. Absent: the art as its maker drew it. */
    readonly art?: number;
}

const GRAMMAR = /^1(c[a-z0-9])?(f[gtmspb])?(sq)?(a[a-z])?$/;
/** The 36 places of the shared accent list, in order. */
const PLACES = 'abcdefghijklmnopqrstuvwxyz0123456789';
const FACES: Record<string, RecipeFace> = { g: 'grotesk', t: 'tech', m: 'mono', s: 'serif', p: 'poster', b: 'slab' };
const FACE_CODE: Record<RecipeFace, string> = { grotesk: 'g', tech: 't', mono: 'm', serif: 's', poster: 'p', slab: 'b' };

/** The look a recipe string asks for, or `null` when the string is not a recipe (or asks for nothing). Never throws. */
export function parseRecipe(text: string | undefined | null): Recipe | null {
    if (typeof text !== 'string') return null;
    const m = GRAMMAR.exec(text);
    if (!m || (m[1] === undefined && m[2] === undefined && m[3] === undefined && m[4] === undefined)) return null;
    return {
        ...(m[1] === undefined ? {} : { accent: PLACES.indexOf(m[1][1]!) }),
        ...(m[2] === undefined ? {} : { face: FACES[m[2][1]!]! }),
        ...(m[3] === undefined ? {} : { quiet: true as const }),
        ...(m[4] === undefined ? {} : { art: PLACES.indexOf(m[4][1]!) }),
    };
}

/** The one spelling of a look, or `undefined` for the wrapper as it is (nothing is written into the link then). */
export function formatRecipe(r: Recipe | null | undefined): string | undefined {
    if (!r) return undefined;
    const place = typeof r.accent === 'number' && Number.isInteger(r.accent) ? PLACES[r.accent] : undefined;
    const way = typeof r.art === 'number' && Number.isInteger(r.art) && r.art >= 0 && r.art < 26 ? PLACES[r.art] : undefined;
    const parts = (place !== undefined ? `c${place}` : '') + (r.face && FACE_CODE[r.face] ? `f${FACE_CODE[r.face]}` : '') + (r.quiet === true ? 'sq' : '') + (way !== undefined ? `a${way}` : '');
    return parts === '' ? undefined : `1${parts}`;
}
