import { describe, expect, it } from 'vitest';
import { Address, Ecc, shaRmd160, toHex } from 'ecash-lib';
import { deriveKey } from './keys';

const seq = Uint8Array.from({ length: 16 }, (_, i) => i);

describe('deriveKey', () => {
    it('key-derivation-vectors', () => {
        // Pinned once from this implementation. A change here means every
        // existing link points at a different address: never "fix" these.
        const vectors = [
            {
                secret: new Uint8Array(16),
                index: 0,
                sk: '96473711bf706599da1279efbb83d127fd3dff1f812f8944c0f959c37cf4aa0a',
                pk: '022e7cdf1f2d92403d7f05fe9782f17b84fcad8c19b8eaff9032ba91cdc9d1a431',
                pkh: '6cc2569a8288b01b5101c9bb8f05474be1096408',
                address: 'ecash:qpkvy456s2ytqx63q8ymhrc9ga97zztypqj959ktan',
            },
            {
                secret: seq,
                index: 0,
                sk: '8f3199a9d1f1103d59d1c4ba7e8f91c4d7fc0298ef2b0659e7109e7abf76f0bf',
                pk: '02dbee19bce4d087a38c108cb8565cfc392795cf3c8b06ecfa08e85dde2995b5a5',
                pkh: '1c725e84a8a04f9ddf4a3dce920001cf888b0a66',
                address: 'ecash:qqw8yh5y4zsyl8wlfg7uaysqq88c3zc2vcdtn9ym4e',
            },
            {
                secret: seq,
                index: 1,
                sk: 'b22098ea3c16197f50f11672a31ff29294ba1ee8bc0a0ced31d14679c442cf69',
                pk: '03b298d7703f7429f510422357ae5cd9884fe3b487f551366ef41157d0ff7e8593',
                pkh: '921164a7eff2542ac4e0df4f5a8470e6341c7927',
                address: 'ecash:qzfpze98ale9g2kyur057k5ywrnrg8reyul9dcplq4',
            },
            {
                secret: new Uint8Array(16).fill(0xff),
                index: 65535,
                sk: 'ce52300dfcd9769f752132f59d373f4492c38970794e83955175568ed7306d14',
                pk: '0296604266c1a31e21a568bb3af6520bd858693e7de7de2edc876acd1cec6f6da0',
                pkh: 'db0c99aea18704d213afd6e316ca2260b517771e',
                address: 'ecash:qrdsexdw5xrsf5sn4ltwx9k2yfst29mhrcl6evdtg3',
            },
        ];
        for (const v of vectors) {
            const k = deriveKey(v.secret, v.index);
            expect(toHex(k.sk)).toBe(v.sk);
            expect(toHex(k.pk)).toBe(v.pk);
            expect(toHex(k.pkh)).toBe(v.pkh);
            expect(k.address).toBe(v.address);
        }
    });

    it('matches an independent HMAC-SHA256 (WebCrypto) and ecash-lib derivation', async () => {
        const key = await crypto.subtle.importKey('raw', seq, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const sk = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('gift/v1/0/0')));
        const k = deriveKey(seq);
        expect(toHex(k.sk)).toBe(toHex(sk));
        const pk = new Ecc().derivePubkey(sk);
        expect(toHex(k.pk)).toBe(toHex(pk));
        expect(k.pk.length).toBe(33);
        expect(Address.p2pkh(shaRmd160(pk)).toString()).toBe(k.address);
    });

    it('is deterministic, defaults to index 0, and separates indexes', () => {
        expect(toHex(deriveKey(seq).sk)).toBe(toHex(deriveKey(seq, 0).sk));
        expect(deriveKey(seq, 0).address).not.toBe(deriveKey(seq, 1).address);
    });

    it('refuses a secret that is not 16 bytes and a bad index', () => {
        expect(() => deriveKey(new Uint8Array(15))).toThrow();
        expect(() => deriveKey(new Uint8Array(17))).toThrow();
        expect(() => deriveKey(new Uint8Array(32))).toThrow();
        expect(() => deriveKey('x'.repeat(16) as unknown as Uint8Array)).toThrow();
        for (const i of [-1, 65536, 1.5, Number.NaN, Infinity]) expect(() => deriveKey(seq, i)).toThrow();
    });

    it('never puts the secret in an error message', () => {
        const secret = new Uint8Array(15).fill(0xab);
        try {
            deriveKey(secret);
        } catch (e) {
            expect(String((e as Error).message)).not.toMatch(/ab|171/);
        }
    });
});
