import { describe, expect, it } from 'vitest';
import { Address } from 'ecash-lib';
import { batchTokenFundLinks, bip21Amount, fundLinks } from './bip21';
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
            // Without `b`: where the app is not installed, pay.e.cash hands every trailing parameter on to Cashtab Web,
            // and Cashtab Web refuses `b`.
            expect(l.app).toBe(`https://pay.e.cash/?bip21=${l.bip21}`);
            expect(l.app).not.toMatch(/[?&]b=/);
            // With it, for a device that has the app: it comes back to the browser afterwards.
            expect(l.appBack).toBe(`https://pay.e.cash/?bip21=${l.bip21}&b=1`);
            // What the Cashtab app does with it (cashtab/src/deeplinks/index.ts):
            // split on "bip21=", parse with new URL(), drop b.
            const inner = new URL(new URL(l.appBack).search.split('bip21=', 2)[1]!);
            expect(inner.protocol + inner.pathname).toBe(address);
            expect(inner.searchParams.get('amount')).toBe(bip21Amount(sats));
            expect(inner.searchParams.get('b')).toBe('1');
            // What pay.e.cash/script.js does: the `bip21` value, with every other parameter of the query put back
            // after it. Without `b` that is the payment itself.
            const q = new URL(l.app).searchParams;
            const rest = [...q.entries()].filter(([k]) => k !== 'bip21').map(([k, v]) => `${k}=${v}`);
            expect(q.get('bip21') + (rest.length ? '&' + rest.join('&') : '')).toBe(l.bip21);
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

describe('batchTokenFundLinks', () => {
    const ID = 'e56c4d69b81ebeceadfef40ca9617cb6772ee2e22e0ead00922d5c418e86053c';
    const a = (n: number) => deriveKey(new Uint8Array(16).fill(n)).address;

    it('one token to several gifts: the first with its quantity, then each address followed at once by its own', () => {
        // The request a real Cashtab wallet sent on 24 November 2026: two addresses, 1 and 2 of the token.
        const real = ['ecash:qrsuvctwx7jp8n2sm52p0trc7x9779phlsx82ut6uy', 'ecash:qq4g4taxf8ghm36450m05ejk04fyjm9z9q4dnau4px'];
        expect(batchTokenFundLinks({ gifts: [{ address: real[0]!, qty: '1' }, { address: real[1]!, qty: '2' }], tokenId: ID }).bip21).toBe(
            `${real[0]}?token_id=${ID}&token_decimalized_qty=1&addr=${real[1]}&token_decimalized_qty=2`,
        );
        const l = batchTokenFundLinks({ gifts: [1, 2, 3].map(n => ({ address: a(n), qty: '12.5' })), tokenId: ID });
        expect(l.bip21).toBe(`${a(1)}?token_id=${ID}&token_decimalized_qty=12.5&addr=${a(2)}&token_decimalized_qty=12.5&addr=${a(3)}&token_decimalized_qty=12.5`);
        expect(l.web).toBe(`https://cashtab.com/#/send?bip21=${l.bip21}`);
        expect(l.app).toBe(`https://pay.e.cash/?bip21=${l.bip21}`);
        expect(l.appBack).toBe(`${l.app}&b=1`);
        // No XEC amount and no data of ours: a wallet sends tokens by a request of their own.
        expect(l.bip21).not.toMatch(/[?&]amount=|op_return_raw/);
        expect(l.bip21).toMatch(/^[a-z0-9:?=.&_]+$/);
    });

    it('nothing but a token id, addresses and plain numbers reaches the link', () => {
        const two = [1, 2].map(n => ({ address: a(n), qty: '1' }));
        const bad = (p: Parameters<typeof batchTokenFundLinks>[0]) => expect(() => batchTokenFundLinks(p)).toThrow();
        bad({ gifts: two.slice(0, 1), tokenId: ID });
        bad({ gifts: Array.from({ length: 10 }, (_, i) => ({ address: a(i + 1), qty: '1' })), tokenId: ID });
        bad({ gifts: [two[0]!, two[0]!], tokenId: ID });
        bad({ gifts: [two[0]!, { address: a(1).slice(6), qty: '1' }], tokenId: ID });
        bad({ gifts: two, tokenId: ID.slice(1) });
        bad({ gifts: two, tokenId: ID.toUpperCase() });
        bad({ gifts: two, tokenId: ID + '&addr=' + a(3) });
        for (const qty of ['', '0', '0.00', '1e3', '-1', '1,5', '1.', '.5', ' 1', '1&addr=' + a(3), '9'.repeat(31)]) bad({ gifts: [two[0]!, { address: a(2), qty }], tokenId: ID });
        bad({ gifts: [two[0]!, { address: 'ecash:nope', qty: '1' }], tokenId: ID });
        bad({ gifts: [two[0]!, { address: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07', qty: '1' }], tokenId: ID });
    });
});
