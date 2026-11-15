import { describe, expect, it } from 'vitest';
import { decodeFragment, encodeLink } from './link';
import { formatRecipe, parseRecipe } from './recipe';

describe('the recipe: a closed grammar, read totally, written one way', () => {
    it('reads every look the grammar allows, and writes it back the same', () => {
        const all: string[] = [];
        for (const c of ['', 'ca', 'cz', 'c0', 'c9']) for (const f of ['', 'fg', 'ft', 'fm', 'fs', 'fp', 'fb']) for (const s of ['', 'sq']) for (const a of ['', 'aa', 'az']) if (c + f + s + a !== '') all.push('1' + c + f + s + a);
        expect(all).toHaveLength(209);
        for (const text of all) {
            const r = parseRecipe(text);
            expect(r, text).not.toBeNull();
            expect(formatRecipe(r), text).toBe(text);
        }
        expect(parseRecipe('1cbftsq')).toEqual({ accent: 1, face: 'tech', quiet: true });
        expect(parseRecipe('1ca')).toEqual({ accent: 0 });
        // The faces, by their letters: these never change meaning.
        expect(['g', 't', 'm', 's', 'p', 'b'].map(x => parseRecipe('1f' + x)!.face)).toEqual(['grotesk', 'tech', 'mono', 'serif', 'poster', 'slab']);
        expect(parseRecipe('1c9')).toEqual({ accent: 35 });
        expect(parseRecipe('1sq')).toEqual({ quiet: true });
        // A colourway of the art comes last: `a` and its place in the wrapper's own list.
        expect(parseRecipe('1ab')).toEqual({ art: 1 });
        expect(parseRecipe('1cbftsqaa')).toEqual({ accent: 1, face: 'tech', quiet: true, art: 0 });
    });

    it('anything else is no recipe at all: never an error, never half a look', () => {
        for (const bad of ['', '1', '2ca', 'ca', '1c', '1cab', '1cacb', '1fgca', '1sqca', '1fx', '1ca ', ' 1ca', '1cA', '1Ca', '1c-', '1cafgsqx', '1sqsq', '1a', '1a0', '1aasq', '1aaca', '1aaab', '1aA', 'x'.repeat(64), '1ca\n', '１ca']) {
            expect(parseRecipe(bad), JSON.stringify(bad)).toBeNull();
        }
        expect(parseRecipe(undefined)).toBeNull();
        expect(parseRecipe(null)).toBeNull();
        expect(parseRecipe(42 as unknown as string)).toBeNull();
    });

    it('the wrapper as it is writes nothing', () => {
        expect(formatRecipe(null)).toBeUndefined();
        expect(formatRecipe({})).toBeUndefined();
        expect(formatRecipe({ accent: 36 })).toBeUndefined();
        expect(formatRecipe({ accent: -1 })).toBeUndefined();
        expect(formatRecipe({ accent: 1.5 })).toBeUndefined();
        expect(formatRecipe({ art: 26 })).toBeUndefined();
        expect(formatRecipe({ art: -1 })).toBeUndefined();
    });

    it('rides in the link, and a link whose recipe is not of the grammar still opens the same gift', () => {
        const secret = new Uint8Array(16).fill(7);
        const dressed = encodeLink({ version: 1, secret, wrapper: 'snowbox', recipe: formatRecipe({ accent: 2, quiet: true })! }, 'https://egift.cash');
        expect(dressed).toBe('https://egift.cash/snowbox/#1.2.BwcHBwcHBwcHBwcHBwcHBw.snowbox.1ccsq');
        expect(parseRecipe(decodeFragment(new URL(dressed).hash)!.recipe)).toEqual({ accent: 2, quiet: true });
        // A recipe someone rewrote into nonsense: the link is still a link, and the look is simply the wrapper's own.
        const odd = decodeFragment('#1.2.BwcHBwcHBwcHBwcHBwcHBw.snowbox.zzz');
        expect(odd).not.toBeNull();
        expect(odd!.secret).toEqual(secret);
        expect(parseRecipe(odd!.recipe)).toBeNull();
    });
});
