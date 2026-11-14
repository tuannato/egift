/**
 * A link that was sent must open for as long as the page exists.
 *
 * These are promises, not behaviours to improve: a wrapper id that has gone
 * out in links is never removed or renamed, a version-1 link is always read
 * the way it was written, and the same link always names the same address.
 * If one of these fails, the change that broke it is wrong — never "fix" the
 * expected values here.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_WRAPPER, decodeFragment, encodeLink, unlockKey } from '../core';
import { wrapperProblems as problems } from '../stage';
import { WRAPPERS, wrapperById } from './index';

/** Every wrapper id that has ever shipped. Add to it; never take from it. */
const SHIPPED = [
    'lixi', 'mecha', 'signal', 'fold', 'cake', 'letter', 'inkwash', 'snowbox', 'fireworks', 'dopaper', 'lantern', 'bouquet',
    'lace', 'cloudmoon', 'diploma', 'wreath', 'skyline', 'basket', 'latte', 'dawn', 'pumpkin', 'rangoli', 'paperbag', 'archmoon',
] as const;

describe('links are forever', () => {
    it('every wrapper that ever shipped is still here, under the same id, and still valid', () => {
        for (const id of SHIPPED) {
            const def = wrapperById(id);
            expect(def, id).toBeDefined();
            expect(def!.id).toBe(id);
            expect(problems(def!), id).toEqual([]);
        }
        expect(WRAPPERS.length).toBeGreaterThanOrEqual(SHIPPED.length);
    });

    // Set to `signal` on 2026-11-14, before the page went out.
    // From launch on this is a promise like the others.
    it('the wrapper a gift falls back to has not changed', () => {
        expect(DEFAULT_WRAPPER).toBe('signal');
        expect(wrapperById(DEFAULT_WRAPPER)).toBeDefined();
    });

    it('a link is written with its wrapper as the path, and a wrapper id never collides with a folder the site serves', () => {
        const url = encodeLink({ version: 1, secret: new Uint8Array(16), wrapper: 'snowbox' }, 'https://egift.cash');
        expect(url).toBe('https://egift.cash/snowbox/#1.0.AAAAAAAAAAAAAAAAAAAAAA.snowbox');
        // The page reads the fragment only: with the path or without it, the same gift.
        expect(decodeFragment(new URL(url).hash)).toEqual(decodeFragment('#1.0.AAAAAAAAAAAAAAAAAAAAAA.snowbox'));
        for (const taken of ['assets', 'wrappers', 'og', 'dev', 'src']) expect(wrapperById(taken), taken).toBeUndefined();
    });

    it('a plain link written in November 2026 still names the same address', async () => {
        const link = decodeFragment('#1.0.AwoRGB8mLTQ7QklQV15lbA.snowbox');
        expect(link).not.toBeNull();
        expect(link!.wrapper).toBe('snowbox');
        expect((await unlockKey(link!)).address).toBe('ecash:qrftx36cgunlvaggpvlcq727sul092l9eusnplqk07');
    });

    it('a link with a wish and a riddle still reads the same, and the same answer still opens it', async () => {
        const link = decodeFragment('#1.12.AwoRGB8mLTQ7QklQV15lbA.inkwash.Q2jDumMgbeG7q25nIQ.Q29uIGfDrCBrw6p1IG1lbyBtZW8_');
        expect(link).not.toBeNull();
        expect(link!.wrapper).toBe('inkwash');
        expect(link!.wish).toBe('Chúc mừng!');
        expect(link!.riddle).toBe('Con gì kêu meo meo?');
        // The answer is folded the way it always was: marks and case do not matter.
        expect((await unlockKey(link!, 'Mèo')).address).toBe('ecash:qqtfwlhe3eevf9xpzx9j4tfezzwkcx78dqvv853ujj');
        expect((await unlockKey(link!, ' MEO ')).address).toBe('ecash:qqtfwlhe3eevf9xpzx9j4tfezzwkcx78dqvv853ujj');
    }, 30000);
});
