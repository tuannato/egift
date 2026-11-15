import { describe, expect, it } from 'vitest';
import { decodeFragment, encodeLink } from './link';
import { formatRecipe, parseRecipe } from './recipe';

describe('the recipe: a closed grammar, read totally, written one way', () => {
    it('reads every look the grammar allows, and writes it back the same', () => {
        const all: string[] = [];
        for (const c of ['', 'c1', 'c2']) for (const f of ['', 'fg', 'ft', 'fm']) for (const s of ['', 'sq']) if (c + f + s !== '') all.push('1' + c + f + s);
        expect(all).toHaveLength(23);
        for (const text of all) {
            const r = parseRecipe(text);
            expect(r, text).not.toBeNull();
            expect(formatRecipe(r), text).toBe(text);
        }
        expect(parseRecipe('1c2ftsq')).toEqual({ colour: 2, face: 'tech', quiet: true });
        expect(parseRecipe('1sq')).toEqual({ quiet: true });
    });

    it('anything else is no recipe at all: never an error, never half a look', () => {
        for (const bad of ['', '1', '2c1', 'c1', '1c3', '1c1c2', '1fgc1', '1sqc1', '1fx', '1c1 ', ' 1c1', '1C1', '1c1fgsqx', '1sqsq', 'x'.repeat(64), '1c1\n', '１c1']) {
            expect(parseRecipe(bad), JSON.stringify(bad)).toBeNull();
        }
        expect(parseRecipe(undefined)).toBeNull();
        expect(parseRecipe(null)).toBeNull();
        expect(parseRecipe(42 as unknown as string)).toBeNull();
    });

    it('the wrapper as it is writes nothing', () => {
        expect(formatRecipe(null)).toBeUndefined();
        expect(formatRecipe({})).toBeUndefined();
        expect(formatRecipe({ colour: 3 as unknown as 1 })).toBeUndefined();
    });

    it('rides in the link, and a link whose recipe is not of the grammar still opens the same gift', () => {
        const secret = new Uint8Array(16).fill(7);
        const dressed = encodeLink({ version: 1, secret, wrapper: 'snowbox', recipe: formatRecipe({ colour: 1, quiet: true })! }, 'https://egift.cash');
        expect(dressed).toBe('https://egift.cash/snowbox/#1.2.BwcHBwcHBwcHBwcHBwcHBw.snowbox.1c1sq');
        expect(parseRecipe(decodeFragment(new URL(dressed).hash)!.recipe)).toEqual({ colour: 1, quiet: true });
        // A recipe someone rewrote into nonsense: the link is still a link, and the look is simply the wrapper's own.
        const odd = decodeFragment('#1.2.BwcHBwcHBwcHBwcHBwcHBw.snowbox.zzz');
        expect(odd).not.toBeNull();
        expect(odd!.secret).toEqual(secret);
        expect(parseRecipe(odd!.recipe)).toBeNull();
    });
});
