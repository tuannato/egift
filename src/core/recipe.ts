/**
 * The recipe: how a giver dressed the wrapper they chose (workshop, tier 1).
 *
 * It rides in the link, which nobody signs: anyone passing a link on can
 * rewrite it. So a recipe is never free text. It is a short string from a
 * closed grammar, each part an index into a list that ships with the page:
 *
 *   1  (c1|c2)?  (fg|ft|fm)?  (sq)?        fixed order, at least one part
 *
 *   c1, c2   the wrapper's own first or second alternative colourway for the
 *            capsule (never for the art)
 *   fg ft fm the face of headings and figures: grotesk, tech, mono
 *   sq       quiet: the hand's small sounds only, no opening tune
 *
 * Reading is total: a string that is not exactly of this grammar means "no
 * recipe" (the wrapper as its maker left it), never an error and never a
 * half-applied look. There is one spelling for each look, so a recipe read
 * and written again is the same string.
 *
 * Forever: a part that has gone out in links keeps its meaning. New parts are
 * added after the old ones; a new first digit starts a new grammar.
 */

export type RecipeFace = 'grotesk' | 'tech' | 'mono';

export interface Recipe {
    /** 1 or 2: the wrapper's alternative capsule colourway. Absent: the wrapper's own. */
    readonly colour?: 1 | 2;
    /** Absent: the wrapper's own face. */
    readonly face?: RecipeFace;
    /** True: no opening tune. */
    readonly quiet?: true;
}

const GRAMMAR = /^1(c[12])?(f[gtm])?(sq)?$/;
const FACES: Record<string, RecipeFace> = { g: 'grotesk', t: 'tech', m: 'mono' };
const FACE_CODE: Record<RecipeFace, string> = { grotesk: 'g', tech: 't', mono: 'm' };

/** The look a recipe string asks for, or `null` when the string is not a recipe (or asks for nothing). Never throws. */
export function parseRecipe(text: string | undefined | null): Recipe | null {
    if (typeof text !== 'string') return null;
    const m = GRAMMAR.exec(text);
    if (!m || (m[1] === undefined && m[2] === undefined && m[3] === undefined)) return null;
    return {
        ...(m[1] === undefined ? {} : { colour: m[1] === 'c1' ? (1 as const) : (2 as const) }),
        ...(m[2] === undefined ? {} : { face: FACES[m[2][1]!]! }),
        ...(m[3] === undefined ? {} : { quiet: true as const }),
    };
}

/** The one spelling of a look, or `undefined` for the wrapper as it is (nothing is written into the link then). */
export function formatRecipe(r: Recipe | null | undefined): string | undefined {
    if (!r) return undefined;
    const parts = (r.colour === 1 || r.colour === 2 ? `c${r.colour}` : '') + (r.face && FACE_CODE[r.face] ? `f${FACE_CODE[r.face]}` : '') + (r.quiet === true ? 'sq' : '');
    return parts === '' ? undefined : `1${parts}`;
}
