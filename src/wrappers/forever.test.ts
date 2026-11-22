/**
 * A link that was sent must open for as long as the page exists.
 *
 * These are promises, not behaviours to improve: a wrapper id that has gone
 * out in links is never removed or renamed, a version-1 link is always read
 * the way it was written, the same link always names the same address, and
 * a look a giver chose (a recipe) always dresses the gift the same way.
 * If one of these fails, the change that broke it is wrong — never "fix" the
 * expected values here.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_WRAPPER, decodeFragment, encodeLink, unlockKey } from '../core';
import { wrapperProblems as problems } from '../stage';
import { WRAPPERS, wrapperById } from './index';
import { ACCENTS, dressed } from './looks';
import { formatRecipe, parseRecipe } from '../core/recipe';

/** Every wrapper id that has ever shipped. Add to it; never take from it. */
const SHIPPED = [
    'lixi', 'mecha', 'signal', 'fold', 'cake', 'letter', 'inkwash', 'snowbox', 'fireworks', 'dopaper', 'lantern', 'bouquet',
    'lace', 'cloudmoon', 'diploma', 'wreath', 'skyline', 'basket', 'latte', 'dawn', 'pumpkin', 'rangoli', 'paperbag', 'archmoon',
    'vinyl', 'bottle', 'seeds', 'crane', 'cradle', 'orbit',
    'curtain', 'medal', 'neon', 'sakura', 'compass', 'cylinder',
    'airmail', 'beacon', 'lotus', 'keys', 'domino', 'chest',
    'aurora', 'pop', 'flap', 'drone', 'stars', 'umbrella', 'starship', 'terminal',
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
        for (const taken of ['assets', 'wrappers', 'og', 'thumbs', 'door', 'dev', 'src', 'lock']) expect(wrapperById(taken), taken).toBeUndefined();
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

    // The shared accents, as they went out on 15 November 2026. A recipe names an accent by its place here
    // (`ca` the first): add new ones after the last line, never move one, never change a shade.
    it('the shared accents keep their places and their shades', () => {
        expect(ACCENTS.slice(0, 14)).toEqual([
            ['#17181C', '#FFFFFF', '#F3F1EC', '#15161A'],
            ['#435B70', '#FFFFFF', '#AFC7DD', '#081520'],
            ['#25397E', '#FFFFFF', '#9FB6F2', '#0E1321'],
            ['#0074C2', '#FFFFFF', '#76B6F7', '#091521'],
            ['#006580', '#FFFFFF', '#7ACAE9', '#03171E'],
            ['#006566', '#FFFFFF', '#72D0D0', '#021818'],
            ['#4C6340', '#FFFFFF', '#B4CDA7', '#0E1709'],
            ['#686722', '#FFFFFF', '#C9C984', '#151505'],
            ['#9A4825', '#FFFFFF', '#EEA285', '#1F0F09'],
            ['#7E1E35', '#FFFFFF', '#F09DA6', '#1F0E10'],
            ['#984260', '#FFFFFF', '#F3A3BB', '#1F0E13'],
            ['#852E6D', '#FFFFFF', '#E79BCE', '#1D0E18'],
            ['#5E4065', '#FFFFFF', '#CFB2D6', '#1A0F1C'],
            ['#5E3D9E', '#FFFFFF', '#BCA9F7', '#151120'],
        ]);
    });

    it('a dressed link written in November 2026 still reads the same and dresses the gift the same way', () => {
        // The fourth accent, the tech face, no opening tune.
        const recipe = formatRecipe({ accent: 3, face: 'tech', quiet: true });
        expect(recipe).toBe('1cdftsq');
        const url = encodeLink({ version: 1, secret: new Uint8Array(16), wrapper: 'snowbox', recipe }, 'https://egift.cash');
        expect(url).toBe('https://egift.cash/snowbox/#1.2.AAAAAAAAAAAAAAAAAAAAAA.snowbox.1cdftsq');
        const link = decodeFragment(new URL(url).hash);
        expect(link!.wrapper).toBe('snowbox');
        expect(link!.recipe).toBe('1cdftsq');
        expect(parseRecipe(link!.recipe)).toEqual({ accent: 3, face: 'tech', quiet: true });
        const plain = wrapperById('snowbox')!;
        const look = dressed(plain, link!.recipe);
        // Snowbox is a light capsule: the light shade of the fourth accent, white written on it.
        expect(look.theme).toEqual({ ...plain.theme, accent: '#0074C2', onAccent: '#FFFFFF', face: 'tech' });
        expect(look.sound).toEqual({ v: 1, inst: plain.sound!.inst, tonic: plain.sound!.tonic });
        expect(look.id).toBe('snowbox');
        expect(look.layers).toBe(plain.layers);
        expect(problems(look)).toEqual([]);
        // A recipe is not signed. One that asks for what the page does not have changes nothing, and never fails.
        for (const odd of ['1cz', '1c9', 'zzz', '1']) {
            const l = decodeFragment(`#1.2.AAAAAAAAAAAAAAAAAAAAAA.snowbox.${odd}`);
            expect(l, odd).not.toBeNull();
            expect(dressed(plain, l!.recipe), odd).toBe(plain);
        }
    });
});
