import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { RIDDLE_ROUNDS } from './limits';
import { deriveKey } from './keys';
import type { PackageKey, PackageLink } from './types';

/*
 * The riddle lock.
 *
 * A gift may be locked with a question. Then the link's secret alone opens
 * nothing: the key's root is
 *
 *   PBKDF2-SHA256(password = normalised answer, salt = the link's secret,
 *                 600,000 rounds, 16 bytes)
 *
 * and the package key is derived from that root exactly as a plain link's key
 * is derived from its secret. The question travels in the link; the answer is
 * nowhere. So a riddle link names no address: someone who only has the link
 * cannot even see whether there is money, let alone take it.
 *
 * The honest limit: a short or guessable answer can be found by trying. The
 * slow hash makes each try cost tens of milliseconds (see `RIDDLE_ROUNDS`),
 * which stops the person who merely saw the link, not a machine that tries a
 * dictionary.
 */

/**
 * The one spelling an answer is hashed in, so "Mèo", "meo" and " MÈO " open
 * the same gift: Vietnamese marks and every other accent are dropped, đ
 * becomes d, case is folded, runs of blanks become one space, and the ends
 * are trimmed. Returns '' when nothing is left.
 *
 * Known and left as it is: a few letters have two spellings that this does not bring together. Greek final sigma
 * ("ς") and sigma ("σ") stay apart, as do German "ß" and "ss", and Turkish dotless "ı" and "i" (an upper-case "I"
 * typed on a Turkish keyboard is lowered to "i", not "ı"). An answer typed with one and answered with the other is
 * told it is wrong; no money is lost, and the answer typed the way the giver typed it opens the gift. This cannot
 * be folded here now: the spelling made here is what every gift already sent was locked with, and a change would
 * lock those gifts for good. A fix has to keep this function as it is and try the old spelling as well.
 */
export function normaliseAnswer(answer: string): string {
    if (typeof answer !== 'string') return '';
    return answer
        .normalize('NFKD')
        // Invisible characters a paste can carry (zero-width, soft hyphen, direction marks) are not part of an answer.
        .replace(/\p{Cf}+/gu, '')
        // A phone types curly quotes and long dashes where a keyboard types straight ones.
        .replace(/[\u2018\u2019\u201A\u2032`\u00B4]/g, "'")
        .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
        .replace(/[\u2010-\u2015\u2212]/g, '-')
        .replace(/\u2026/g, '...')
        .replace(/\p{M}+/gu, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/\s+/gu, ' ')
        .trim()
        .normalize('NFC');
}

type Subtle = {
    importKey(format: 'raw', data: Uint8Array, alg: string, extractable: boolean, usages: string[]): Promise<unknown>;
    deriveBits(alg: { name: string; hash: string; salt: Uint8Array; iterations: number }, key: unknown, bits: number): Promise<ArrayBuffer>;
};

function subtle(): Subtle | null {
    try {
        const c = (globalThis as unknown as { crypto?: { subtle?: Subtle } }).crypto;
        return c?.subtle && typeof c.subtle.deriveBits === 'function' ? c.subtle : null;
    } catch {
        return null;
    }
}

/**
 * The 16-byte key root of a riddle gift. Uses the browser's own PBKDF2 where
 * there is one (fast, off the main thread); otherwise the same function in
 * plain JavaScript, which is slow but gives the same bytes. Throws on an
 * empty answer.
 */
export async function riddleRoot(secret: Uint8Array, answer: string): Promise<Uint8Array> {
    if (!(secret instanceof Uint8Array) || secret.length !== 16) throw new Error('The secret must be 16 bytes');
    const norm = normaliseAnswer(answer);
    if (norm === '') throw new Error('The answer is empty');
    const password = new TextEncoder().encode(norm);
    const s = subtle();
    if (s) {
        try {
            const key = await s.importKey('raw', password, 'PBKDF2', false, ['deriveBits']);
            const bits = await s.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: secret, iterations: RIDDLE_ROUNDS }, key, 128);
            return new Uint8Array(bits);
        } catch {
            /* fall through to the plain implementation */
        }
    }
    return pbkdf2Async(sha256, password, secret, { c: RIDDLE_ROUNDS, dkLen: 16, asyncTick: 12 });
}

/**
 * The package key of a link. A plain link needs nothing more; a riddle link
 * needs the answer, and a wrong answer gives a perfectly valid key to an
 * address that has never held anything.
 */
export async function unlockKey(link: PackageLink, answer?: string): Promise<PackageKey> {
    if (link.riddle === undefined) return deriveKey(link.secret);
    if (answer === undefined) throw new Error('This gift is locked with a riddle');
    return deriveKey(await riddleRoot(link.secret, answer));
}
