import { describe, expect, it } from 'vitest';
import { SHELF } from './shelf';
import { WRAPPERS } from './index';

describe('the shelf', () => {
    it('is what the definitions say: run `node scripts/shelf.mjs` after a wrapper is added or its words, colours or size change', () => {
        const fields = ['id', 'name', 'blurb', 'credit', 'ambient', 'theme', 'size', 'backdrop'] as const;
        const want = WRAPPERS.map(def => Object.fromEntries(fields.filter(k => def[k] !== undefined).map(k => [k, def[k]])));
        expect(JSON.parse(JSON.stringify(SHELF))).toEqual(JSON.parse(JSON.stringify(want)));
    });
});
