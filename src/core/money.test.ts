import { describe, expect, it } from 'vitest';
import { formatXec, parseXec, whyNotXec } from './money';

describe('formatXec', () => {
    it('groups and marks decimals per language', () => {
        expect(formatXec(123456n, 'en')).toBe('1,234.56');
        expect(formatXec(123456n, 'vi')).toBe('1.234,56');
        expect(formatXec(100000n, 'en')).toBe('1,000');
        expect(formatXec(100000n, 'vi')).toBe('1.000');
        expect(formatXec(540n, 'en')).toBe('5.40');
        expect(formatXec(540n, 'vi')).toBe('5,40');
        expect(formatXec(546n, 'en')).toBe('5.46');
        expect(formatXec(1n, 'en')).toBe('0.01');
        expect(formatXec(0n, 'en')).toBe('0');
        expect(formatXec(100n, 'vi')).toBe('1');
        expect(formatXec(99999n, 'en')).toBe('999.99');
        expect(formatXec(123456789012n, 'en')).toBe('1,234,567,890.12');
        expect(formatXec(-123456n, 'en')).toBe('-1,234.56');
    });

    it('is exact far beyond float precision', () => {
        expect(formatXec(2_100_000_000_000_001n, 'en')).toBe('21,000,000,000,000.01');
        expect(formatXec(900719925474099399n, 'vi')).toBe('9.007.199.254.740.993,99');
    });

    it('round-trips through parseXec, except the one shape parseXec refuses', () => {
        for (const s of [1n, 5n, 50n, 546n, 1000n, 99999n, 100000n, 123456n, 100000000n, 123456789012n]) {
            for (const lang of ['en', 'vi'] as const) {
                const f = formatXec(s, lang);
                // "1,000" / "1.000": one separator + 3 digits is refused by design.
                const ambiguous = /^\d{1,3}[.,]\d{3}$/.test(f);
                expect(parseXec(f), f).toBe(ambiguous ? null : s);
            }
        }
    });
});

describe('parseXec', () => {
    it('accepts the documented shapes', () => {
        const ok: [string, bigint][] = [
            ['10', 1000n],
            ['0', 0n],
            ['10.5', 1050n],
            ['10,5', 1050n],
            ['10.25', 1025n],
            ['10,25', 1025n],
            ['  10.25 ', 1025n],
            ['1,234.56', 123456n],
            ['1.234,56', 123456n],
            ['1 234,56', 123456n],
            ['1 234.56', 123456n],
            ['1\u00a0234,56', 123456n],
            ['1\u202f234,5', 123450n],
            ['1 234', 123400n],
            ['1 234 567', 123456700n],
            ['1,234,567', 123456700n],
            ['1.234.567', 123456700n],
            ['1,234,567.8', 123456780n],
            ['1.234.567,89', 123456789n],
            ['1234567', 123456700n],
            ['007', 700n],
        ];
        for (const [s, v] of ok) expect(parseXec(s), s).toBe(v);
    });

    it('returns null rather than guessing', () => {
        const bad = [
            '',
            '   ',
            '1,234', // ambiguous: 1234 or 1.234
            '1.234',
            '12,345',
            '999.000',
            '10.123', // three decimals
            '10,123',
            '0.001',
            '-10',
            '+10',
            '1e5',
            '1E5',
            '.5',
            '10.',
            '10,',
            '1,2,3',
            '1,234,56', // decimal mark equal to the grouping mark
            '1.234.56',
            '1,234.567',
            '1,23,456',
            '12,34,567',
            '1234,567',
            '1  234',
            '1 23',
            '1 234 56',
            '1,234 567',
            '10 XEC',
            'ten',
            '١٢٣', // non-ASCII digits
            '１０',
            'Infinity',
            'NaN',
            '0x10',
            '21000000000001', // over the total supply
            '1'.repeat(41),
        ];
        for (const s of bad) expect(parseXec(s), s).toBeNull();
        expect(parseXec(undefined as unknown as string)).toBeNull();
        expect(parseXec('21000000000000')).toBe(2_100_000_000_000_000n);
    });
});

describe('whyNotXec', () => {
    it('explains every refusal, and is null exactly when parseXec accepts', () => {
        const cases: [string, ReturnType<typeof whyNotXec>][] = [
            ['', 'empty'],
            ['  \u00a0 ', 'empty'],
            ['100.000', 'ambiguous-separator'],
            ['1,234', 'ambiguous-separator'],
            ['12.345', 'ambiguous-separator'],
            ['10.123', 'ambiguous-separator'], // 10123 or 10.123: same shape as 100.000
            ['10.1234', 'too-many-decimals'],
            ['0,001', 'too-many-decimals'],
            ['1,234.567', 'too-many-decimals'],
            ['1.234,5678', 'too-many-decimals'],
            ['21000000000001', 'too-large'],
            ['-10', 'not-a-number'],
            ['1e5', 'not-a-number'],
            ['ten', 'not-a-number'],
            ['10 XEC', 'not-a-number'],
            ['.5', 'not-a-number'],
            ['1,2,3', 'not-a-number'],
            ['10', null],
            ['1.234,56', null],
            ['100 000', null],
            ['1.000.000', null],
        ];
        for (const [s, why] of cases) {
            expect(whyNotXec(s), s).toBe(why);
            expect(parseXec(s) === null, s).toBe(why !== null);
        }
        expect(whyNotXec(undefined as unknown as string)).toBe('not-a-number');
    });
});
