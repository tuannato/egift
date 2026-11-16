import { describe, expect, it } from 'vitest';
import { sparesData } from './thrifty';

describe('sparing a visit what it has not asked for', () => {
    it('a browser that says nothing is treated as before', () => {
        expect(sparesData(undefined)).toBe(false);
        expect(sparesData({})).toBe(false);
        expect(sparesData({ connection: {} })).toBe(false);
        expect(sparesData({ connection: { effectiveType: '4g', saveData: false } })).toBe(false);
    });

    it('data saving, or a slow connection, is spared the heavy piece ahead of time', () => {
        expect(sparesData({ connection: { saveData: true, effectiveType: '4g' } })).toBe(true);
        for (const effectiveType of ['slow-2g', '2g', '3g']) expect(sparesData({ connection: { effectiveType } })).toBe(true);
    });
});
