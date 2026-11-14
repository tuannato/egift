import { describe, expect, it } from 'vitest';
import { toHex } from 'ecash-lib';
import { deriveKey } from './keys';
import { MAX_STAMP_LOOKUPS, entitlement, isOwnedFunding, isStamp, licenceOf, isValidOffer, stampOpReturnRaw, stampScript } from './stamp';
import type { WrapperOffer } from './stamp';
import { stampedFundLinks } from './bip21';
import { createDemoChain } from './chain/demo';
import type { Coin, TxDetail } from './types';

const pkg = deriveKey(new Uint8Array(16).fill(1));
const other = deriveKey(new Uint8Array(16).fill(2));
const maker = deriveKey(new Uint8Array(16).fill(3));
const giver = deriveKey(new Uint8Array(16).fill(4));
const p2pkh = (pkh: Uint8Array) => `76a914${toHex(pkh)}88ac`;
const offer: WrapperOffer = { sats: 50_000n, payTo: maker.address };
const marker = (wrapper: string, pkh: Uint8Array) => toHex(stampScript(wrapper, pkh).bytecode);

/** A funding transaction as Cashtab sends it from the stamped link: marker first, then the gift, the maker, the change. */
const funding = (o: { wrapper?: string; pkh?: Uint8Array; price?: bigint; payTo?: Uint8Array; from?: Uint8Array } = {}): TxDetail => ({
    inputs: [p2pkh(o.from ?? giver.pkh)],
    outputs: [
        { sats: 0n, script: marker(o.wrapper ?? 'mecha', o.pkh ?? pkg.pkh) },
        { sats: 8_888n, script: p2pkh(pkg.pkh) },
        { sats: o.price ?? 50_000n, script: p2pkh(o.payTo ?? maker.pkh) },
        { sats: 1_234_567n, script: p2pkh(giver.pkh) },
    ],
});
const without = (tx: TxDetail, i: number): TxDetail => ({ ...tx, outputs: tx.outputs.filter((_, k) => k !== i) });

describe('the stamp', () => {
    it('the-stamp-marker-is-exactly-egif-0010-wrapper-package', () => {
        const hex = marker('mecha', pkg.pkh);
        expect(hex).toBe('6a' + '04' + '45474946' + '02' + '0010' + '05' + '6d65636861' + '14' + toHex(pkg.pkh));
        const raw = stampOpReturnRaw('mecha', pkg.pkh);
        expect(raw).toBe(hex.slice(2));
        // Cashtab's own rules for op_return_raw: lowercase hex, even length, not starting with 6a, at most 222 bytes.
        expect(raw).toMatch(/^[a-f0-9]+$/);
        expect(raw.length % 2).toBe(0);
        expect(raw.startsWith('6a')).toBe(false);
        expect(stampOpReturnRaw('a'.repeat(24), pkg.pkh).length / 2).toBeLessThanOrEqual(222);
        expect(() => stampScript('Mecha', pkg.pkh)).toThrow();
        expect(() => stampScript('mecha', new Uint8Array(19))).toThrow();
    });

    it('the stamped fund link has the shape Cashtab reads: amount, marker, then the maker and the price', () => {
        const links = stampedFundLinks({ address: pkg.address, sats: 8_888n, wrapper: 'mecha', offer });
        expect(links.bip21).toBe(`${pkg.address}?amount=88.88&op_return_raw=${stampOpReturnRaw('mecha', pkg.pkh)}&addr=${maker.address}&amount=500.00`);
        expect(links.web).toBe(`https://cashtab.com/#/send?bip21=${links.bip21}`);
        expect(links.app).toBe(`https://pay.e.cash/?bip21=${links.bip21}&b=1`);
        // "Pay for the wrapper later": the least a node relays goes to the gift, so the stamp has a coin to be found by.
        expect(stampedFundLinks({ address: pkg.address, sats: 546n, wrapper: 'mecha', offer }).bip21).toContain('?amount=5.46&op_return_raw=');
        expect(() => stampedFundLinks({ address: pkg.address, sats: 545n, wrapper: 'mecha', offer })).toThrow();
        expect(() => stampedFundLinks({ address: pkg.address, sats: 8_888n, wrapper: 'mecha', offer: { sats: 100n, payTo: maker.address } })).toThrow();
        expect(() => stampedFundLinks({ address: pkg.address, sats: 8_888n, wrapper: 'mecha', offer: { sats: 50_000n, payTo: 'etoken:qq' } })).toThrow();
    });

    it('a funding transaction with the marker and the price is a stamp', () => {
        expect(isStamp(funding(), 'mecha', pkg.pkh, offer)).toBe(true);
        expect(isStamp(funding({ price: 60_000n }), 'mecha', pkg.pkh, offer)).toBe(true);
    });

    it('a-stamp-pays-for-exactly-one-package', () => {
        // The same transaction is no stamp for any other package, nor for any other wrapper.
        expect(isStamp(funding(), 'mecha', other.pkh, offer)).toBe(false);
        expect(isStamp(funding(), 'signal', pkg.pkh, offer)).toBe(false);
        // A transaction that also pays a second gift address stamps only the one its marker names.
        const two = funding();
        const both: TxDetail = { ...two, outputs: [...two.outputs, { sats: 8_888n, script: p2pkh(other.pkh) }] };
        expect(isStamp(both, 'mecha', pkg.pkh, offer)).toBe(true);
        expect(isStamp(both, 'mecha', other.pkh, offer)).toBe(false);
        // A marker naming another package does not stamp this one, even when the money is right.
        expect(isStamp(funding({ pkh: other.pkh }), 'mecha', pkg.pkh, offer)).toBe(false);
    });

    it('no payment, a short payment, or a payment to someone else is no stamp', () => {
        expect(isStamp(funding({ price: 49_999n }), 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp(funding({ payTo: other.pkh }), 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp(without(funding(), 2), 'mecha', pkg.pkh, offer)).toBe(false);
        // The payment without the marker.
        expect(isStamp(without(funding(), 0), 'mecha', pkg.pkh, offer)).toBe(false);
        // Two short payments do not add up to one.
        const half = funding({ price: 25_000n });
        expect(isStamp({ ...half, outputs: [...half.outputs, { sats: 25_000n, script: p2pkh(maker.pkh) }] }, 'mecha', pkg.pkh, offer)).toBe(false);
        // A maker address that is the package itself: the "payment" would come back to whoever opens the gift.
        expect(isStamp(funding({ payTo: pkg.pkh }), 'mecha', pkg.pkh, { sats: 5_000n, payTo: pkg.address })).toBe(false);
    });

    it('the-makers-own-spend-never-stamps-a-gift', () => {
        // The maker pays someone from a link that carries an attacker's marker; the change comes back to the maker's
        // own address and would look like "the price, paid to the maker". A transaction spending FROM that address is refused.
        expect(isStamp(funding({ from: maker.pkh }), 'mecha', pkg.pkh, offer)).toBe(false);
        // Inputs whose origin the chain did not report are refused for the same reason.
        expect(isStamp({ ...funding(), inputs: [''] }, 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp({ ...funding(), inputs: [] }, 'mecha', pkg.pkh, offer)).toBe(false);
    });

    it('an offer must name a real address and a price a wallet sends; junk is never a stamp and never throws', () => {
        expect(isValidOffer(offer)).toBe(true);
        expect(isValidOffer({ sats: 545n, payTo: maker.address })).toBe(false);
        expect(isValidOffer({ sats: 50_000n, payTo: 'etoken:qq' })).toBe(false);
        expect(isStamp(funding(), 'mecha', pkg.pkh, { sats: 50_000n, payTo: 'nope' })).toBe(false);
        expect(isStamp(null, 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp({ inputs: [p2pkh(giver.pkh)], outputs: [{ sats: 1n, script: 5 as unknown as string }] }, 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp(funding(), 'BAD ID', pkg.pkh, offer)).toBe(false);
        // Uppercase hex from a node is the same script.
        const up = funding();
        expect(isStamp({ inputs: up.inputs, outputs: up.outputs.map(o => ({ ...o, script: o.script.toUpperCase() })) }, 'mecha', pkg.pkh, offer)).toBe(true);
    });
});

describe('entitlement', () => {
    const ask = (chain: ReturnType<typeof createDemoChain>, coins: readonly Coin[]) => entitlement({ chain, coins, wrapper: 'mecha', pkh: pkg.pkh, offer });

    it('a package funded by a stamp is entitled; a plain funding is not', async () => {
        const chain = createDemoChain();
        chain.fund(pkg.address, 8_888n, { tx: funding() });
        expect(await ask(chain, (await chain.read(pkg.address)).coins)).toBe('paid');
        const plain = createDemoChain();
        plain.fund(pkg.address, 8_888n);
        expect(await ask(plain, (await plain.read(pkg.address)).coins)).toBe('unpaid');
        expect(await ask(plain, [])).toBe('unpaid');
    });

    it('a-stamp-is-found-among-many-later-coins', async () => {
        // Someone buries the stamped coin under more dust than the page will look through. The stamp was made
        // when the gift was funded and nobody can make an older coin afterwards: it is looked at first.
        const chain = createDemoChain();
        chain.fund(pkg.address, 8_888n, { tx: funding(), height: 900_000 });
        for (let i = 0; i < MAX_STAMP_LOOKUPS + 20; i++) chain.fund(pkg.address, 100_000n, { height: 900_001 + i });
        const coins = (await chain.read(pkg.address)).coins;
        expect(coins.length).toBeGreaterThan(MAX_STAMP_LOOKUPS);
        expect(await ask(chain, [...coins].reverse())).toBe('paid');
        // A "pay later" stamp is still in the mempool while older plain coins are confirmed: it is found too.
        const later = createDemoChain();
        later.fund(pkg.address, 8_888n, { height: 900_000 });
        later.fund(pkg.address, 546n, { tx: funding() });
        expect(await ask(later, (await later.read(pkg.address)).coins)).toBe('paid');
    });

    it('when the chain cannot be asked the answer is unknown, never paid', async () => {
        const chain = createDemoChain();
        chain.fund(pkg.address, 8_888n, { tx: funding() });
        const coins = (await chain.read(pkg.address)).coins;
        expect(await entitlement({ chain: {}, coins, wrapper: 'mecha', pkh: pkg.pkh, offer })).toBe('unknown');
        const down = { detail: async () => Promise.reject(new Error('offline')) };
        expect(await entitlement({ chain: down, coins, wrapper: 'mecha', pkh: pkg.pkh, offer })).toBe('unknown');
    });
});

describe('owning a wrapper', () => {
    const LICENCE = 'ab'.repeat(32);
    const owned: WrapperOffer = { ...offer, licence: { tokenId: LICENCE } };
    const plain = (o: { from?: Uint8Array; sats?: bigint } = {}): TxDetail => ({
        inputs: [p2pkh(o.from ?? giver.pkh)],
        outputs: [
            { sats: o.sats ?? 8_888n, script: p2pkh(pkg.pkh) },
            { sats: 1_234_567n, script: p2pkh(o.from ?? giver.pkh) },
        ],
    });
    const ask = (chain: ReturnType<typeof createDemoChain>, coins: readonly Coin[], o: WrapperOffer = owned) => entitlement({ chain, coins, wrapper: 'mecha', pkh: pkg.pkh, offer: o });

    it('a-gift-funded-from-a-wallet-that-holds-the-licence-wears-the-wrapper', async () => {
        const chain = createDemoChain();
        chain.grant(LICENCE, p2pkh(giver.pkh));
        chain.fund(pkg.address, 8_888n, { tx: plain() });
        const coins = (await chain.read(pkg.address)).coins;
        expect(await ask(chain, coins)).toBe('owned');
        // An offer without a licence never asks who holds what.
        expect(await ask(chain, coins, offer)).toBe('unpaid');
        // A licence id that is not a token id is no licence.
        expect(licenceOf({ ...offer, licence: { tokenId: 'nope' } })).toBeNull();
        expect(await ask(chain, coins, { ...offer, licence: { tokenId: 'nope' } })).toBe('unpaid');
    });

    it('ownership-is-asked-when-the-gift-is-opened', async () => {
        const chain = createDemoChain();
        chain.grant(LICENCE, p2pkh(giver.pkh));
        chain.fund(pkg.address, 8_888n, { tx: plain() });
        const coins = (await chain.read(pkg.address)).coins;
        expect(await ask(chain, coins)).toBe('owned');
        // The licence is sold on: the gift not opened yet goes back to the default wrapper.
        chain.grant(LICENCE, p2pkh(giver.pkh), false);
        chain.grant(LICENCE, p2pkh(other.pkh));
        expect(await ask(chain, coins)).toBe('unpaid');
    });

    it('only-the-oldest-funding-of-at-least-the-floor-can-show-ownership', async () => {
        // A licence holder's dust does not dress someone else's gift.
        expect(isOwnedFunding(plain({ sats: 999n }), pkg.pkh, [p2pkh(giver.pkh)])).toBe(false);
        expect(isOwnedFunding(plain({ sats: 1_000n }), pkg.pkh, [p2pkh(giver.pkh)])).toBe(true);
        // Nor does a later payment from a holder, after someone else funded the gift.
        const chain = createDemoChain();
        chain.grant(LICENCE, p2pkh(giver.pkh));
        chain.fund(pkg.address, 8_888n, { tx: plain({ from: other.pkh }), height: 900_000 });
        chain.fund(pkg.address, 8_888n, { tx: plain(), height: 900_001 });
        expect(await ask(chain, (await chain.read(pkg.address)).coins)).toBe('unpaid');
        // The package holding the token itself proves nothing: it funded nothing.
        expect(isOwnedFunding(plain(), pkg.pkh, [p2pkh(pkg.pkh)])).toBe(false);
        // Nobody holds it; junk never throws.
        expect(isOwnedFunding(plain(), pkg.pkh, [])).toBe(false);
        expect(isOwnedFunding(null, pkg.pkh, [p2pkh(giver.pkh)])).toBe(false);
        expect(isOwnedFunding({ inputs: [''], outputs: [{ sats: 8_888n, script: p2pkh(pkg.pkh) }] }, pkg.pkh, [''])).toBe(false);
        expect(isOwnedFunding(plain(), pkg.pkh, [p2pkh(giver.pkh).toUpperCase()])).toBe(true);
    });

    it('a stamp still counts on a wrapper that can also be owned; an unanswered question is unknown, never owned', async () => {
        const chain = createDemoChain();
        chain.fund(pkg.address, 8_888n, { tx: funding() });
        const coins = (await chain.read(pkg.address)).coins;
        expect(await ask(chain, coins)).toBe('paid');
        const deaf = createDemoChain();
        deaf.fund(pkg.address, 8_888n, { tx: plain() });
        const c2 = (await deaf.read(pkg.address)).coins;
        const down = { detail: deaf.detail!.bind(deaf), holders: async () => Promise.reject(new Error('offline')) };
        expect(await entitlement({ chain: down, coins: c2, wrapper: 'mecha', pkh: pkg.pkh, offer: owned })).toBe('unknown');
        // A chain that cannot list holders at all: no ownership, and no error.
        expect(await entitlement({ chain: { detail: deaf.detail!.bind(deaf) }, coins: c2, wrapper: 'mecha', pkh: pkg.pkh, offer: owned })).toBe('unpaid');
    });

    it('the-gift-never-waits-long-on-a-wrapper', async () => {
        const slow = { detail: () => new Promise<TxDetail | null>(() => {}) };
        const coins: Coin[] = [{ txid: '1'.repeat(64), outIdx: 0, sats: 8_888n, token: false, final: true }];
        const t0 = Date.now();
        expect(await entitlement({ chain: slow, coins, wrapper: 'mecha', pkh: pkg.pkh, offer: owned, budgetMs: 30 })).toBe('unknown');
        expect(Date.now() - t0).toBeLessThan(1000);
    });

    it('ownership is read from the oldest XEC funding, not from a token coin sent before it', async () => {
        const chain = createDemoChain();
        chain.grant(LICENCE, p2pkh(giver.pkh));
        // The giver sent the token a block before the XEC: the token's own 5.46 XEC is not the gift's funding.
        chain.fund(pkg.address, 546n, { tokenInfo: { tokenId: 'cd'.repeat(32), kind: 'alp', atoms: 5n, baton: false }, tx: plain({ sats: 546n }), height: 900_000 });
        chain.fund(pkg.address, 8_888n, { tx: plain(), height: 900_001 });
        expect(await ask(chain, (await chain.read(pkg.address)).coins)).toBe('owned');
    });
});
