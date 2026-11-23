import { describe, expect, it } from 'vitest';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { RIDDLE_MAX_BYTES, RIDDLE_ROUNDS, decodeFragment, deriveKey, encodeLink, normaliseAnswer, riddleBytes, riddleRoot, unlockKey } from './index';
import type { PackageLink } from './index';

const SECRET = new Uint8Array(16).map((_, i) => i * 7 + 3);
const hex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('');

describe('the riddle lock', () => {
    it('answer-normalisation-vectors', () => {
        const same: [string, string][] = [
            ['Mèo', 'meo'],
            ['  MÈO  ', 'meo'],
            ['Hà   Nội', 'ha noi'],
            ['ĐÀ LẠT', 'da lat'],
            ['Cà phê sữa đá', 'ca phe sua da'],
            ['Phở', 'pho'],
            ['ƯƠNG', 'uong'],
            ['Trường\tSa\n', 'truong sa'],
            // The same word typed with composed and with combining marks.
            ['Huế', 'hue'],
            ['Huế', 'hue'],
            ['café', 'cafe'],
            ['2026', '2026'],
            // What a phone or a paste adds: curly quotes, a long dash, an ellipsis, a zero-width space, full-width digits.
            ['it\u2019s', "it's"],
            ['a\u2014b', 'a-b'],
            ['wait\u2026', 'wait...'],
            ['me\u200Bo', 'meo'],
            ['\uFF12\uFF10\uFF12\uFF16', '2026'],
        ];
        for (const [typed, want] of same) expect(normaliseAnswer(typed), typed).toBe(want);
        expect(normaliseAnswer('   ')).toBe('');
        expect(normaliseAnswer('́')).toBe('');
        // Different answers stay different.
        expect(normaliseAnswer('meo')).not.toBe(normaliseAnswer('mẹo vặt'));
    });

    it('the key root is PBKDF2-SHA256 of the normalised answer, salted with the link secret, 600,000 rounds', async () => {
        expect(RIDDLE_ROUNDS).toBe(600_000);
        const root = await riddleRoot(SECRET, '  Mèo ');
        const want = pbkdf2(sha256, new TextEncoder().encode('meo'), SECRET, { c: 600_000, dkLen: 16 });
        expect(hex(root)).toBe(hex(want));
        // Every spelling of one answer opens the same gift.
        expect(hex(await riddleRoot(SECRET, 'MEO'))).toBe(hex(root));
    });

    it('a-riddle-link-carries-no-address', async () => {
        const link: PackageLink = { version: 1, secret: SECRET, wrapper: 'lixi', riddle: 'Con gì kêu meo meo?' };
        const url = encodeLink(link, 'https://egift.cash');
        const back = decodeFragment(url.slice(url.indexOf('#')))!;
        expect(back.riddle).toBe('Con gì kêu meo meo?');
        const right = await unlockKey(back, 'mèo');
        const plain = deriveKey(back.secret);
        // The secret alone gives a different key: the link does not name the gift's address.
        expect(right.address).not.toBe(plain.address);
        expect(url).not.toContain(right.address);
        expect(url).not.toContain(right.address.replace('ecash:', ''));
        expect(url).not.toContain(hex(right.pkh));
        // Without an answer there is no key at all.
        await expect(unlockKey(back)).rejects.toThrow();
        // The answer is nowhere in the link.
        expect(decodeURIComponent(url)).not.toMatch(/meo$/i);
    });

    it('a wrong answer gives a valid key to another address', async () => {
        const link: PackageLink = { version: 1, secret: SECRET, wrapper: 'lixi', riddle: 'q' };
        const right = await unlockKey(link, 'mèo');
        const wrong = await unlockKey(link, 'chó');
        expect(wrong.address).toMatch(/^ecash:q/);
        expect(wrong.address).not.toBe(right.address);
        await expect(unlockKey(link, '   ')).rejects.toThrow();
    });

    it('a plain link needs no answer and is unchanged', async () => {
        const link: PackageLink = { version: 1, secret: SECRET, wrapper: 'lixi' };
        expect((await unlockKey(link)).address).toBe(deriveKey(SECRET).address);
        expect((await unlockKey(link, 'ignored')).address).toBe(deriveKey(SECRET).address);
    });

    it('the question round-trips beside a wish, and old flags still decode', () => {
        const link: PackageLink = { version: 1, secret: SECRET, wrapper: 'mecha', wish: 'Chúc mừng!', riddle: 'Quán cà phê mình hay ngồi?' };
        const url = encodeLink(link, 'https://egift.cash');
        const frag = url.slice(url.indexOf('#') + 1);
        expect(frag.split('.')[1]).toBe('12');
        expect(decodeFragment(frag)).toEqual(link);
        expect(encodeLink(decodeFragment(frag)!, 'https://egift.cash')).toBe(url);
        // A riddle alone.
        const only = encodeLink({ version: 1, secret: SECRET, wrapper: 'lixi', riddle: 'q?' }, 'https://egift.cash');
        expect(only.split('#')[1]!.split('.')[1]).toBe('8');
        expect(decodeFragment(only.split('#')[1]!)!.riddle).toBe('q?');
        // Flags have one spelling and stop at 15.
        const parts = frag.split('.');
        expect(decodeFragment(['1', '012', ...parts.slice(2)].join('.'))).toBeNull();
        expect(decodeFragment(['1', '16', ...parts.slice(2)].join('.'))).toBeNull();
        // The riddle bit without its field, and the field without its bit.
        expect(decodeFragment(['1', '8', parts[2], parts[3]].join('.'))).toBeNull();
        expect(decodeFragment(['1', '4', ...parts.slice(2)].join('.'))).toBeNull();
    });

    it('refuses an empty or over-long question', () => {
        const base = { version: 1 as const, secret: SECRET, wrapper: 'lixi' };
        expect(() => encodeLink({ ...base, riddle: '   ' }, 'https://x')).toThrow();
        expect(() => encodeLink({ ...base, riddle: 'a'.repeat(RIDDLE_MAX_BYTES + 1) }, 'https://x')).toThrow();
        expect(() => encodeLink({ ...base, riddle: 'a'.repeat(RIDDLE_MAX_BYTES) }, 'https://x')).not.toThrow();
        expect(riddleBytes('  ồ  ')).toBe(3);
    });
});

describe('the spelling of an answer is for ever', () => {
    it('gifts already sent were locked with these exact spellings: a change here locks them for good', () => {
        // Pinned on purpose, with the letters known not to be folded together (see `normaliseAnswer`).
        expect(normaliseAnswer(' MÈO  Con ')).toBe('meo con');
        expect(normaliseAnswer('Đà Nẵng')).toBe('da nang');
        expect(normaliseAnswer('Straße')).toBe('straße');
        expect(normaliseAnswer('STRASSE')).toBe('strasse');
        // Upper case lowers to the final sigma at a word's end; a sigma typed there by hand stays as typed.
        expect(normaliseAnswer('ΟΔΟΣ')).toBe('οδος');
        expect(normaliseAnswer('οδός')).toBe('οδος');
        expect(normaliseAnswer('οδοσ')).toBe('οδοσ');
        expect(normaliseAnswer('ISIK')).toBe('isik');
        expect(normaliseAnswer('ışık')).toBe('ısık');
    });
});
