import { describe, expect, it } from 'vitest';
import { Address } from 'ecash-lib';
import { bip21Amount, fundLinks } from './bip21';
import { deriveKey } from './keys';
import { CAP_SATS, FLOOR_SATS } from './limits';

const address = deriveKey(new Uint8Array(16)).address;

describe('bip21Amount', () => {
    it('bip21-amounts-are-xec-with-two-decimals-and-no-grouping', () => {
        expect(bip21Amount(1000n)).toBe('10.00');
        expect(bip21Amount(546n)).toBe('5.46');
        expect(bip21Amount(123456789n)).toBe('1234567.89');
        expect(bip21Amount(1n)).toBe('0.01');
        expect(bip21Amount(10n)).toBe('0.10');
        expect(bip21Amount(100n)).toBe('1.00');
        expect(bip21Amount(100_000_000n)).toBe('1000000.00');
        expect(bip21Amount(2_100_000_000_000_000n)).toBe('21000000000000.00');
        for (let s = 1n; s < 5000n; s += 7n) {
            const a = bip21Amount(s);
            expect(a).toMatch(/^(0|[1-9][0-9]*)\.[0-9]{2}$/);
            // Read back as XEC -> sats: the unit is XEC, not sats.
            const [w, f] = a.split('.');
            expect(BigInt(w!) * 100n + BigInt(f!)).toBe(s);
        }
    });

    it('refuses zero and negatives', () => {
        expect(() => bip21Amount(0n)).toThrow();
        expect(() => bip21Amount(-1n)).toThrow();
    });
});

describe('fundLinks', () => {
    it('every-fund-link-has-a-cashtab-web-road-without-b', () => {
        for (const sats of [FLOOR_SATS, 1234n * 100n + 56n, CAP_SATS]) {
            const l = fundLinks(address, sats);
            expect(l.bip21).toBe(`${address}?amount=${bip21Amount(sats)}`);
            expect(l.web).toBe(`https://cashtab.com/#/send?bip21=${l.bip21}`);
            expect(l.web).not.toMatch(/[?&]b=/);
            expect(l.web).not.toContain('%');
            expect(l.app).toBe(`https://pay.e.cash/?bip21=${l.bip21}&b=1`);
            // What the Cashtab app does with it (cashtab/src/deeplinks/index.ts):
            // split on "bip21=", parse with new URL(), drop b.
            const inner = new URL(new URL(l.app).search.split('bip21=', 2)[1]!);
            expect(inner.protocol + inner.pathname).toBe(address);
            expect(inner.searchParams.get('amount')).toBe(bip21Amount(sats));
            expect(inner.searchParams.get('b')).toBe('1');
            // What pay.e.cash/script.js does: URLSearchParams on the query.
            expect(new URL(l.app).searchParams.get('bip21')).toBe(l.bip21);
            // What Cashtab Web does: everything after "bip21=" in the hash.
            const hash = new URL(l.web).hash;
            expect(hash.slice(hash.indexOf('?') + 1).slice('bip21='.length)).toBe(l.bip21);
        }
    });

    it('adds the ecash: prefix to a prefixless address', () => {
        expect(fundLinks(address.slice(6), 5000n).bip21).toBe(`${address}?amount=50.00`);
    });

    it('a-link-over-the-cap-cannot-be-written', () => {
        expect(() => fundLinks(address, CAP_SATS)).not.toThrow();
        expect(() => fundLinks(address, CAP_SATS + 1n)).toThrow();
        expect(() => fundLinks(address, 10n ** 18n)).toThrow();
    });

    it('a-package-under-the-floor-cannot-be-created', () => {
        expect(() => fundLinks(address, FLOOR_SATS)).not.toThrow();
        expect(() => fundLinks(address, FLOOR_SATS - 1n)).toThrow();
        expect(() => fundLinks(address, 546n)).toThrow();
        expect(() => fundLinks(address, 0n)).toThrow();
        expect(() => fundLinks(address, -1000n)).toThrow();
    });

    it('refuses anything but a mainnet P2PKH ecash: address', () => {
        const pkh = deriveKey(new Uint8Array(16)).pkh;
        for (const bad of [
            '',
            Address.p2sh(pkh).toString(),
            Address.p2pkh(pkh, 'etoken').toString(),
            Address.p2pkh(pkh, 'ectest').toString(),
            Address.p2pkh(pkh).legacy().toString(),
            address + '?amount=1',
        ]) {
            expect(() => fundLinks(bad, 5000n), bad).toThrow();
        }
    });
});
