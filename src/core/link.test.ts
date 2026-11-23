import { describe, expect, it } from 'vitest';
import { decodeFragment, encodeLink, newSecret, wishBytes } from './link';
import { WISH_MAX_BYTES } from './limits';
import type { PackageLink } from './types';

const secret = Uint8Array.from({ length: 16 }, (_, i) => i * 7);
const tokenId = 'ab'.repeat(32);
const origin = 'https://egift.cash';

function frag(link: PackageLink): string {
    const url = encodeLink(link, origin);
    return url.slice(url.indexOf('#') + 1);
}

/** Tiny deterministic PRNG so a failing fuzz case can be replayed. */
function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
}

describe('newSecret', () => {
    it('gives 16 fresh bytes', () => {
        const a = newSecret();
        const b = newSecret();
        expect(a).toBeInstanceOf(Uint8Array);
        expect(a.length).toBe(16);
        expect(a).not.toEqual(b);
    });
});

describe('encodeLink / decodeFragment', () => {
    it('writes the documented grammar', () => {
        const url = encodeLink({ version: 1, secret: new Uint8Array(16), wrapper: 'lixi' }, origin + '/');
        expect(url).toBe('https://egift.cash/lixi/#1.0.AAAAAAAAAAAAAAAAAAAAAA.lixi');
    });

    it('round-trips every combination of optional fields', () => {
        for (let flags = 0; flags < 8; flags++) {
            const link: PackageLink = {
                version: 1,
                secret,
                wrapper: 'red-envelope-2',
                ...(flags & 1 ? { item: { tokenId, maxSats: 2_100_000_000_000_000n } } : {}),
                ...(flags & 2 ? { recipe: 'Ab_9-z' } : {}),
                ...(flags & 4 ? { wish: 'Chúc mừng năm mới 🧧' } : {}),
            };
            const f = frag(link);
            expect(f.split('.')[1]).toBe(String(flags));
            const back = decodeFragment('#' + f);
            expect(back).toEqual(link);
            expect(decodeFragment(f)).toEqual(link);
            expect(frag(back!)).toBe(f);
        }
    });

    it('stores the wish trimmed and NFC-normalised', () => {
        const nfd = '  Chu\u0301c  \n';
        const back = decodeFragment(frag({ version: 1, secret, wrapper: 'lixi', wish: nfd }));
        expect(back?.wish).toBe('Chúc');
        expect(back?.wish).toBe('Chu\u0301c'.normalize('NFC'));
    });

    it('the-wish-is-capped-by-encoded-bytes', () => {
        // 60 three-byte characters = 180 bytes: fits; one more ASCII byte does not.
        const atLimit = 'ệ'.repeat(WISH_MAX_BYTES / 3);
        expect(atLimit.length).toBe(60);
        expect(wishBytes(atLimit)).toBe(WISH_MAX_BYTES);
        expect(() => encodeLink({ version: 1, secret, wrapper: 'lixi', wish: atLimit }, origin)).not.toThrow();
        expect(() => encodeLink({ version: 1, secret, wrapper: 'lixi', wish: atLimit + 'a' }, origin)).toThrow();
        // 61 characters only, but 183 bytes: the bytes decide, not the characters.
        expect(() => encodeLink({ version: 1, secret, wrapper: 'lixi', wish: 'ệ'.repeat(61) }, origin)).toThrow();
        // Emoji: 4 bytes each.
        expect(wishBytes('🧧'.repeat(45))).toBe(180);
        expect(() => encodeLink({ version: 1, secret, wrapper: 'lixi', wish: '🧧'.repeat(46) }, origin)).toThrow();
        // Counting happens after trim, so surrounding blanks do not count.
        expect(wishBytes('  ' + atLimit + '  ')).toBe(WISH_MAX_BYTES);
        // NFD input that is over the limit raw but under it after NFC is accepted.
        const nfd = 'e\u0323\u0302'.repeat(60); // 5 bytes each raw, 3 bytes after NFC
        expect(new TextEncoder().encode(nfd).length).toBe(300);
        expect(wishBytes(nfd)).toBe(180);
        // A hand-made fragment over the limit is refused on read too.
        const over = btoa('a'.repeat(WISH_MAX_BYTES + 1)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
        const base = frag({ version: 1, secret, wrapper: 'lixi' }).replace(/^1\.0\./, '1.4.');
        expect(decodeFragment(`${base}.${over}`)).toBeNull();
    });

    it('refuses invalid fields with an error that does not carry the secret', () => {
        const bad: PackageLink[] = [
            { version: 1, secret: new Uint8Array(15), wrapper: 'lixi' },
            { version: 1, secret: new Uint8Array(17), wrapper: 'lixi' },
            { version: 1, secret, wrapper: 'Lixi' },
            { version: 1, secret, wrapper: '' },
            { version: 1, secret, wrapper: 'a'.repeat(25) },
            { version: 1, secret, wrapper: 'li.xi' },
            { version: 1, secret, wrapper: 'lixi', wish: '' },
            { version: 1, secret, wrapper: 'lixi', wish: '   \n ' },
            { version: 1, secret, wrapper: 'lixi', recipe: '' },
            { version: 1, secret, wrapper: 'lixi', recipe: 'a.b' },
            { version: 1, secret, wrapper: 'lixi', recipe: 'a'.repeat(65) },
            { version: 1, secret, wrapper: 'lixi', item: { tokenId: 'AB'.repeat(32), maxSats: 1n } },
            { version: 1, secret, wrapper: 'lixi', item: { tokenId, maxSats: 0n } },
            { version: 1, secret, wrapper: 'lixi', item: { tokenId, maxSats: 2_100_000_000_000_001n } },
            { version: 2 as 1, secret, wrapper: 'lixi' },
        ];
        const secretB64 = frag({ version: 1, secret, wrapper: 'lixi' }).split('.')[2]!;
        for (const link of bad) {
            let msg = '';
            expect(() => {
                try {
                    encodeLink(link, origin);
                } catch (e) {
                    msg = (e as Error).message;
                    throw e;
                }
            }).toThrow();
            expect(msg).not.toContain(secretB64);
        }
    });

    it('decodes known-good fragments', () => {
        const f = '1.0.AAAAAAAAAAAAAAAAAAAAAA.lixi';
        expect(decodeFragment(f)).toEqual({ version: 1, secret: new Uint8Array(16), wrapper: 'lixi' });
        expect(decodeFragment('#' + f)?.wrapper).toBe('lixi');
    });

    it('rejects specific deviations', () => {
        const ok = frag({ version: 1, secret, wrapper: 'lixi', item: { tokenId, maxSats: 5000n }, recipe: 'r', wish: 'hi' });
        expect(decodeFragment(ok)).not.toBeNull();
        const p = ok.split('.');
        expect(p[2]!.endsWith('Q')).toBe(true); // byte 15 = 105: low bits 01 -> 'Q'
        const with_ = (i: number, v: string): string => p.map((x, j) => (j === i ? v : x)).join('.');
        const cases = [
            '',
            '#',
            '2' + ok.slice(1), // version
            with_(1, '07'), // non-canonical flags
            with_(1, '8'),
            with_(1, '6'), // flag count mismatch
            ok + '.extra',
            p.slice(0, -1).join('.'),
            with_(2, p[2]!.slice(0, 21)), // short secret
            with_(2, p[2]! + 'A'),
            with_(2, p[2]!.slice(0, 21) + (p[2]!.endsWith('Q') ? 'R' : 'B')), // non-zero padding bits: non-canonical
            with_(2, p[2]! + '=='), // padding
            with_(2, p[2]!.replace(/./, '+')), // standard base64 alphabet
            with_(3, 'LIXI'),
            with_(3, ''),
            with_(4, `${tokenId}-05000`), // leading zero
            with_(4, `${tokenId}-0`),
            with_(4, `${tokenId}-2100000000000001`), // cap + 1
            with_(4, `${tokenId}-99999999999999999`),
            with_(4, `${tokenId.toUpperCase()}-5000`),
            with_(4, `${tokenId}5000`),
            with_(4, `${tokenId}--5000`),
            with_(5, 'a b'),
            with_(6, '_w'), // invalid utf-8 (0xff...)
            with_(6, 'IGhp'), // " hi": leading blank is not the stored form
            with_(6, ''),
            ok + ' ',
            ' ' + ok,
            ok.replace(/\./g, '..'),
            '1.0.' + 'A'.repeat(600),
        ];
        cases.forEach((c, i) => expect(decodeFragment(c), `case ${i}: ${c}`).toBeNull());
        expect(decodeFragment(with_(4, `${tokenId}-2100000000000000`))).not.toBeNull();
    });

    it('a-malformed-fragment-decodes-to-null-and-never-throws', () => {
        const r = rng(20261112);
        const valid = [
            frag({ version: 1, secret, wrapper: 'lixi' }),
            frag({ version: 1, secret, wrapper: 'lixi', item: { tokenId, maxSats: 1000n }, recipe: 'abc', wish: 'Chúc 🧧' }),
            frag({ version: 1, secret, wrapper: 'x', wish: 'a' }),
        ];
        const alphabet = 'Aa0-_.#%=+/ \u0000\uffff\ud800é🧧';
        const pick = (s: string): string => {
            const chars = [...s];
            return chars[Math.floor(r() * chars.length)]!;
        };
        let decodedOk = 0;
        for (let n = 0; n < 5000; n++) {
            let s: string;
            const mode = n % 4;
            const base = valid[n % valid.length]!;
            if (mode === 0) {
                // fully random
                s = Array.from({ length: Math.floor(r() * 80) }, () => pick(alphabet)).join('');
            } else {
                const chars = [...base];
                const edits = 1 + Math.floor(r() * 4);
                for (let e = 0; e < edits; e++) {
                    const at = Math.floor(r() * (chars.length + 1));
                    const op = Math.floor(r() * 3);
                    if (op === 0) chars.splice(at, 1);
                    else if (op === 1) chars.splice(at, 0, pick(alphabet));
                    else chars[at] = pick(alphabet);
                }
                s = chars.join('');
                if (mode === 3) s = s.repeat(1 + Math.floor(r() * 12));
            }
            let out: PackageLink | null = null;
            expect(() => {
                out = decodeFragment(s);
            }).not.toThrow();
            if (out !== null) {
                decodedOk++;
                // Anything accepted must be canonical: re-encoding gives the same text.
                expect(frag(out)).toBe(s.startsWith('#') ? s.slice(1) : s);
            }
        }
        // Non-string garbage from a caller is also null, not an exception.
        for (const g of [undefined, null, 42, {}, [], Symbol('x')]) {
            expect(decodeFragment(g as unknown as string)).toBeNull();
        }
        expect(decodedOk).toBeLessThan(5000);
    });
});

describe('the spot of a riddle link', () => {
    const origin = 'https://egift.cash';
    const spot = Uint8Array.from({ length: 20 }, (_, i) => 200 - i * 3);
    const base = { version: 1 as const, secret: Uint8Array.from({ length: 16 }, (_, i) => i * 7), wrapper: 'lixi' };

    it('rides last, only with a riddle, and comes back byte for byte', () => {
        const url = encodeLink({ ...base, wish: 'hi', riddle: 'Which cafe?', spot }, origin);
        const f = url.slice(url.indexOf('#') + 1).split('.');
        expect(f[1]).toBe('28');
        expect(f).toHaveLength(7);
        expect(f[6]).toHaveLength(27);
        const back = decodeFragment(url.slice(url.indexOf('#')))!;
        expect(back.spot).toEqual(spot);
        expect(back.riddle).toBe('Which cafe?');
        expect(encodeLink(back, origin)).toBe(url);
        // With everything: flags 31.
        const all = encodeLink({ ...base, item: { tokenId: 'ab'.repeat(32), maxSats: 5000n }, recipe: '1cd', wish: 'hi', riddle: 'q', spot }, origin);
        expect(all.split('#')[1]!.split('.')[1]).toBe('31');
        expect(decodeFragment('#' + all.split('#')[1]!)!.spot).toEqual(spot);
    });

    it('one link shared by several: a mark and nothing more, only on a riddle link that names no address', () => {
        const url = encodeLink({ ...base, wish: 'hi', riddle: 'Your word?', many: true }, origin);
        const f = url.slice(url.indexOf('#') + 1).split('.');
        // Wish 4 + riddle 8 + shared 32; the mark adds no field.
        expect(f[1]).toBe('44');
        expect(f).toHaveLength(6);
        const back = decodeFragment(url.slice(url.indexOf('#')))!;
        expect(back.many).toBe(true);
        expect(back.spot).toBeUndefined();
        expect(encodeLink(back, origin)).toBe(url);
        // The same link without the mark is another link, and reads as one that is not shared.
        const plain = encodeLink({ ...base, wish: 'hi', riddle: 'Your word?' }, origin);
        expect(decodeFragment(plain.slice(plain.indexOf('#')))!.many).toBeUndefined();
        // Never without a riddle, never with a spot: written or read.
        expect(() => encodeLink({ ...base, many: true }, origin)).toThrow();
        expect(() => encodeLink({ ...base, riddle: 'q', spot: new Uint8Array(20).fill(7), many: true }, origin)).toThrow();
        expect(() => encodeLink({ ...base, riddle: 'q', many: false as unknown as true }, origin)).toThrow();
        expect(decodeFragment('#1.32.AAAAAAAAAAAAAAAAAAAAAA.lixi')).toBeNull();
        expect(decodeFragment('#1.36.AAAAAAAAAAAAAAAAAAAAAA.lixi.aGk')).toBeNull();
        expect(decodeFragment('#1.40.AAAAAAAAAAAAAAAAAAAAAA.lixi.cQ')!.many).toBe(true);
        expect(decodeFragment('#1.56.AAAAAAAAAAAAAAAAAAAAAA.lixi.cQ.' + 'A'.repeat(27))).toBeNull();
        // Every flags value from 32 up: only 40..47 (a riddle, no spot) can be a link at all.
        const tail = ['ab'.repeat(32) + '-5000', '1cd', 'aGk', 'cQ', 'A'.repeat(27)];
        for (let f = 32; f < 64; f++) {
            const fields = tail.filter((_, bit) => (f >> bit) & 1);
            const got = decodeFragment(['#1', String(f), 'AAAAAAAAAAAAAAAAAAAAAA', 'lixi', ...fields].join('.'));
            if (f >= 40 && f <= 47) {
                expect(got?.many, String(f)).toBe(true);
                expect(encodeLink(got!, origin).split('#')[1], String(f)).toBe(['1', String(f), 'AAAAAAAAAAAAAAAAAAAAAA', 'lixi', ...fields].join('.'));
            } else expect(got, String(f)).toBeNull();
        }
        // Flags stop at 63.
        expect(decodeFragment('#1.64.AAAAAAAAAAAAAAAAAAAAAA.lixi')).toBeNull();
        expect(decodeFragment('#1.072.AAAAAAAAAAAAAAAAAAAAAA.lixi.cQ')).toBeNull();
    });

    it('a shared link may name where all its gifts are: two to nine, none twice, in one field', () => {
        const pk = (n: number) => new Uint8Array(20).fill(n);
        const url = encodeLink({ ...base, riddle: 'Your word?', many: true, spots: [pk(1), pk(2), pk(3)] }, origin);
        const f = url.slice(url.indexOf('#') + 1).split('.');
        // Riddle 8 + spot 16 + shared 32.
        expect(f[1]).toBe('56');
        expect(f).toHaveLength(6);
        expect(f[5]).toHaveLength(80);
        const back = decodeFragment(url.slice(url.indexOf('#')))!;
        expect(back.many).toBe(true);
        expect(back.spot).toBeUndefined();
        expect(back.spots).toEqual([pk(1), pk(2), pk(3)]);
        expect(encodeLink(back, origin)).toBe(url);
        // Nine at the most, with the longest wish and question: still one link that reads back.
        const nine = Array.from({ length: 9 }, (_, i) => pk(i + 1));
        const long = encodeLink({ ...base, wish: 'w'.repeat(180), riddle: 'q'.repeat(120), many: true, spots: nine }, origin);
        expect(decodeFragment(long.slice(long.indexOf('#')))!.spots).toEqual(nine);
        // What is refused, written or read.
        expect(() => encodeLink({ ...base, riddle: 'q', many: true, spots: [pk(1)] }, origin)).toThrow();
        expect(() => encodeLink({ ...base, riddle: 'q', many: true, spots: [...nine, pk(10)] }, origin)).toThrow();
        expect(() => encodeLink({ ...base, riddle: 'q', many: true, spots: [pk(1), pk(1)] }, origin)).toThrow();
        expect(() => encodeLink({ ...base, riddle: 'q', many: true, spots: [pk(1), new Uint8Array(19)] }, origin)).toThrow();
        expect(() => encodeLink({ ...base, riddle: 'q', spots: [pk(1), pk(2)] }, origin)).toThrow();
        const frag = (bytes: number[]) => '#1.56.AAAAAAAAAAAAAAAAAAAAAA.lixi.cQ.' + Buffer.from(bytes).toString('base64url');
        expect(decodeFragment(frag([...pk(1), ...pk(2)]))!.spots).toHaveLength(2);
        expect(decodeFragment(frag([...pk(1)]))).toBeNull();
        expect(decodeFragment(frag([...pk(1), ...pk(1)]))).toBeNull();
        expect(decodeFragment(frag([...pk(1), ...pk(2), 7]))).toBeNull();
        expect(decodeFragment(frag(Array.from({ length: 200 }, (_, i) => i)))).toBeNull();
        // A link that is not shared still has one spot of twenty bytes, as ever.
        expect(decodeFragment('#1.24.AAAAAAAAAAAAAAAAAAAAAA.lixi.cQ.' + Buffer.from([...pk(1), ...pk(2)]).toString('base64url'))).toBeNull();
    });

    it('a riddle link written before there was a spot still reads the same, and has none', () => {
        const old = decodeFragment('#1.8.AAAAAAAAAAAAAAAAAAAAAA.lixi.cQ');
        expect(old).not.toBeNull();
        expect(old!.riddle).toBe('q');
        expect(old!.spot).toBeUndefined();
    });

    it('is refused without a riddle, at the wrong length, or in a spelling that is not the one', () => {
        expect(() => encodeLink({ ...base, spot }, origin)).toThrow();
        expect(() => encodeLink({ ...base, riddle: 'q', spot: new Uint8Array(19) }, origin)).toThrow();
        const url = encodeLink({ ...base, riddle: 'q', spot }, origin);
        const p = url.slice(url.indexOf('#') + 1).split('.');
        const with_ = (i: number, v: string): string => '#' + p.map((x, j) => (j === i ? v : x)).join('.');
        for (const bad of [
            with_(1, '16'), // a spot and no riddle: the count of fields is off
            '#' + [p[0], '16', p[2], p[3], p[5]].join('.'), // a spot, no riddle, the right count
            with_(1, '32'),
            with_(1, '024'),
            with_(5, p[5]!.slice(0, 26)),
            with_(5, p[5]! + 'A'),
            with_(5, p[5]!.replace(/.$/, '=')),
            '#' + p.slice(0, 5).join('.'), // the flag says spot, the field is missing
        ]) {
            expect(decodeFragment(bad), bad).toBeNull();
        }
    });
});
