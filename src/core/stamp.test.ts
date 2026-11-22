import { describe, expect, it } from 'vitest';
import { toHex } from 'ecash-lib';
import { deriveKey } from './keys';
import { BATCH_MAX, MAX_STAMP_LOOKUPS, batchOpReturnRaw, batchStampScript, entitlement, isOwnedFunding, isStamp, licenceOf, isValidOffer, stampOpReturnRaw, stampScript } from './stamp';
import type { WrapperOffer } from './stamp';
import { batchFundLinks, stampedFundLinks } from './bip21';
import { parseEcashAddress } from './tx';
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
        expect(links.app).toBe(`https://pay.e.cash/?bip21=${links.bip21}`);
        expect(links.appBack).toBe(`https://pay.e.cash/?bip21=${links.bip21}&b=1`);
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

describe('a price that changed', () => {
    const oldMaker = deriveKey(new Uint8Array(16).fill(5));
    /** Now 80,000 sats to the maker; before, 50,000 sats to another address, for payments in a block up to 900,000. */
    const changed: WrapperOffer = { sats: 80_000n, payTo: maker.address, earlier: [{ sats: 50_000n, payTo: oldMaker.address, until: 900_000 }] };
    const old = (height?: number, price = 50_000n): TxDetail => ({ ...funding({ price, payTo: oldMaker.pkh }), ...(height === undefined ? {} : { height }) });

    it('a payment at the earlier price counts when it was in a block by the last height, and not after', () => {
        expect(isStamp(old(899_999), 'mecha', pkg.pkh, changed)).toBe(true);
        expect(isStamp(old(900_000), 'mecha', pkg.pkh, changed)).toBe(true);
        expect(isStamp(old(900_001), 'mecha', pkg.pkh, changed)).toBe(false);
    });

    it('a payment at the earlier price that is not in a block yet does not count', () => {
        expect(isStamp(old(), 'mecha', pkg.pkh, changed)).toBe(false);
        for (const h of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(isStamp(old(h), 'mecha', pkg.pkh, changed), String(h)).toBe(false);
        expect(isStamp({ ...old(), height: '5' as unknown as number }, 'mecha', pkg.pkh, changed)).toBe(false);
    });

    it('the price asked now counts at any height and with none', () => {
        const now = (height?: number): TxDetail => ({ ...funding({ price: 80_000n }), ...(height === undefined ? {} : { height }) });
        expect(isStamp(now(), 'mecha', pkg.pkh, changed)).toBe(true);
        expect(isStamp(now(1), 'mecha', pkg.pkh, changed)).toBe(true);
        expect(isStamp(now(2_000_000), 'mecha', pkg.pkh, changed)).toBe(true);
    });

    it('an earlier pair is held to its own price and its own address', () => {
        // Less than the earlier price, to the earlier address.
        expect(isStamp(old(100, 49_999n), 'mecha', pkg.pkh, changed)).toBe(false);
        // The earlier price, to the address asked now: that address asks the price of now.
        expect(isStamp({ ...funding({ price: 50_000n }), height: 100 }, 'mecha', pkg.pkh, changed)).toBe(false);
        // The earlier address spending to itself stamps nothing.
        expect(isStamp({ ...funding({ price: 50_000n, payTo: oldMaker.pkh, from: oldMaker.pkh }), height: 100 }, 'mecha', pkg.pkh, changed)).toBe(false);
        // Another wrapper's or another package's marker stays no stamp.
        expect(isStamp({ ...funding({ price: 50_000n, payTo: oldMaker.pkh, wrapper: 'signal' }), height: 100 }, 'mecha', pkg.pkh, changed)).toBe(false);
        expect(isStamp({ ...funding({ price: 50_000n, payTo: oldMaker.pkh, pkh: other.pkh }), height: 100 }, 'mecha', pkg.pkh, changed)).toBe(false);
    });

    it('the common change: the same address, a higher price now, a lower one before', () => {
        const raised: WrapperOffer = { sats: 80_000n, payTo: maker.address, earlier: [{ sats: 50_000n, payTo: maker.address, until: 900_000 }] };
        expect(isStamp({ ...funding({ price: 50_000n }), height: 900_000 }, 'mecha', pkg.pkh, raised)).toBe(true);
        expect(isStamp({ ...funding({ price: 50_000n }), height: 900_001 }, 'mecha', pkg.pkh, raised)).toBe(false);
        expect(isStamp(funding({ price: 50_000n }), 'mecha', pkg.pkh, raised)).toBe(false);
        expect(isStamp({ ...funding({ price: 50_000n }), height: 0 }, 'mecha', pkg.pkh, raised)).toBe(true);
    });

    it('several earlier pairs: each counts up to its own height', () => {
        const twice: WrapperOffer = { sats: 90_000n, payTo: maker.address, earlier: [{ sats: 50_000n, payTo: maker.address, until: 900_000 }, { sats: 70_000n, payTo: maker.address, until: 950_000 }] };
        expect(isStamp({ ...funding({ price: 50_000n }), height: 900_000 }, 'mecha', pkg.pkh, twice)).toBe(true);
        expect(isStamp({ ...funding({ price: 50_000n }), height: 940_000 }, 'mecha', pkg.pkh, twice)).toBe(false);
        expect(isStamp({ ...funding({ price: 70_000n }), height: 940_000 }, 'mecha', pkg.pkh, twice)).toBe(true);
        expect(isStamp({ ...funding({ price: 70_000n }), height: 950_001 }, 'mecha', pkg.pkh, twice)).toBe(false);
    });

    it('an earlier address that is the package itself pays nothing; spending from the address of now does not spoil an earlier payment', () => {
        const self: WrapperOffer = { sats: 80_000n, payTo: maker.address, earlier: [{ sats: 5_000n, payTo: pkg.address, until: 900_000 }] };
        expect(isStamp({ ...funding({ price: 1n }), height: 1 }, 'mecha', pkg.pkh, self)).toBe(false);
        expect(isStamp({ ...old(100), inputs: [p2pkh(maker.pkh)] }, 'mecha', pkg.pkh, changed)).toBe(true);
    });

    it('a payment at an earlier price that is in no block yet is neither paid nor unpaid', async () => {
        const chain = createDemoChain();
        chain.fund(pkg.address, 8_888n, { tx: old() });
        expect(await entitlement({ chain, coins: (await chain.read(pkg.address)).coins, wrapper: 'mecha', pkh: pkg.pkh, offer: changed })).toBe('unknown');
    });

    it('an offer with a malformed earlier pair is no offer at all', () => {
        const bad = (earlier: unknown): WrapperOffer => ({ sats: 80_000n, payTo: maker.address, earlier: earlier as WrapperOffer['earlier'] });
        expect(isValidOffer(changed)).toBe(true);
        expect(isValidOffer(bad([{ sats: 50_000n, payTo: 'ecash:nope', until: 1 }]))).toBe(false);
        expect(isValidOffer(bad([{ sats: 1n, payTo: oldMaker.address, until: 1 }]))).toBe(false);
        expect(isValidOffer(bad([{ sats: 50_000n, payTo: oldMaker.address, until: -1 }]))).toBe(false);
        expect(isValidOffer(bad([{ sats: 50_000n, payTo: oldMaker.address, until: 1.5 }]))).toBe(false);
        expect(isValidOffer(bad([{ sats: 50_000n, payTo: oldMaker.address }]))).toBe(false);
        expect(isValidOffer(bad('x'))).toBe(false);
        expect(isValidOffer(bad([null]))).toBe(false);
        expect(isStamp(funding({ price: 80_000n }), 'mecha', pkg.pkh, bad([{ sats: 1n, payTo: oldMaker.address, until: 1 }]))).toBe(false);
    });

    it('a package read from the chain keeps a wrapper paid for at the earlier price', async () => {
        const chain = createDemoChain();
        chain.fund(pkg.address, 8_888n, { tx: old(899_000), height: 899_000 });
        const coins = (await chain.read(pkg.address)).coins;
        expect(await entitlement({ chain, coins, wrapper: 'mecha', pkh: pkg.pkh, offer: changed })).toBe('paid');
        const late = createDemoChain();
        late.fund(pkg.address, 8_888n, { tx: old(900_500), height: 900_500 });
        expect(await entitlement({ chain: late, coins: (await late.read(pkg.address)).coins, wrapper: 'mecha', pkh: pkg.pkh, offer: changed })).toBe('unpaid');
    });
});

describe('a stamp for several gifts', () => {
    const third = deriveKey(new Uint8Array(16).fill(6));
    const bmarker = (pkhs: Uint8Array[], wrapper = 'mecha') => toHex(batchStampScript(wrapper, pkhs).bytecode);
    /** One transaction funds the listed gifts and pays the price once: marker, the gifts in order, the maker, the change. */
    const batch = (o: { pkhs?: Uint8Array[]; funds?: [Uint8Array, bigint][]; price?: bigint; payTo?: Uint8Array; from?: Uint8Array; wrapper?: string; height?: number } = {}): TxDetail => {
        const pkhs = o.pkhs ?? [pkg.pkh, other.pkh, third.pkh];
        return {
            inputs: [p2pkh(o.from ?? giver.pkh)],
            outputs: [
                { sats: 0n, script: bmarker(pkhs, o.wrapper) },
                ...(o.funds ?? pkhs.map((p, i): [Uint8Array, bigint] => [p, 2_000n + BigInt(i)])).map(([p, sats]) => ({ sats, script: p2pkh(p) })),
                { sats: o.price ?? 50_000n, script: p2pkh(o.payTo ?? maker.pkh) },
                { sats: 1_234_567n, script: p2pkh(giver.pkh) },
            ],
            ...(o.height === undefined ? {} : { height: o.height }),
        };
    };

    it('the batch marker is exactly egif 0011 wrapper and the packages; it is what a real wallet sent', () => {
        expect(bmarker([pkg.pkh, other.pkh])).toBe('6a' + '04' + '45474946' + '02' + '0011' + '05' + '6d65636861' + '14' + toHex(pkg.pkh) + '14' + toHex(other.pkh));
        // The two markers sent through Cashtab on 23 November 2026 (2 gifts, and 9 gifts with a 24-character id).
        const real = ['ecash:qrsuvctwx7jp8n2sm52p0trc7x9779phlsx82ut6uy', 'ecash:qq4g4taxf8ghm36450m05ejk04fyjm9z9q4dnau4px', 'ecash:qrpexsn0l8jlx9sx9arjl3cmp93hxevvzu450t79ue', 'ecash:qp3ruv38jx6segkguttr3zl3vztept2ct5w3mllp3f', 'ecash:qz9fgf80awa9shsfsddd8tzfh25yxrwknucaerm0wc', 'ecash:qzama4vz42jfqamdkjm8ceg0ecmfm3gp6ygzg4z4ha', 'ecash:qqjapewku88jdme80qkvw86xf7c6c2kzsynknrx4nd', 'ecash:qpl4knsdsrttqaedj0q2euq6w923z0d7x5va4dnp67', 'ecash:qzyfyeztvdw2a8w8crhu72c3zpffp705tqs4ry2577'].map(a => parseEcashAddress(a)!.hash);
        expect(batchOpReturnRaw('terminal', real.slice(0, 2))).toBe('0445474946020011087465726d696e616c14e1c6616e37a413cd50dd1417ac78f18bef1437fc142a8aafa649d17dc755a3f6fa66567d52496ca228');
        const nine = batchOpReturnRaw('x'.repeat(24), real);
        expect(nine).toBe('04454749460200111878787878787878787878787878787878787878787878787814e1c6616e37a413cd50dd1417ac78f18bef1437fc142a8aafa649d17dc755a3f6fa66567d52496ca22814c393426ff9e5f316062f472fc71b096373658c1714623e322791b50ca2c8e2d6388bf1609790ad585d148a9424efebba585e09835ad3ac49baa8430dd69f14bbbed582aaa490776db4b67c650fce369dc501d11425d0e5d6e1cf26ef27782cc71f464fb1ac2ac281147f5b4e0d80d6b0772d93c0acf01a7155113dbe35148892644b635cae9dc7c0efcf2b11105290f9f458');
        // Cashtab takes at most 222 bytes of op_return_raw: nine packages and the longest id fill it exactly.
        expect(nine.length / 2).toBe(222);
        expect(BATCH_MAX).toBe(9);
        expect(() => batchStampScript('mecha', [pkg.pkh])).toThrow();
        expect(() => batchStampScript('mecha', Array.from({ length: 10 }, (_, i) => deriveKey(new Uint8Array(16).fill(40 + i)).pkh))).toThrow();
        expect(() => batchStampScript('mecha', [pkg.pkh, pkg.pkh])).toThrow();
        expect(() => batchStampScript('Mecha', [pkg.pkh, other.pkh])).toThrow();
        expect(() => batchStampScript('mecha', [pkg.pkh, new Uint8Array(19)])).toThrow();
    });

    it('one price stamps every gift the transaction names and funds', () => {
        const tx = batch();
        for (const k of [pkg, other, third]) expect(isStamp(tx, 'mecha', k.pkh, offer)).toBe(true);
        // A gift it does not name; another wrapper; less than the price; the price to someone else.
        expect(isStamp(tx, 'mecha', giver.pkh, offer)).toBe(false);
        expect(isStamp(tx, 'signal', pkg.pkh, offer)).toBe(false);
        expect(isStamp(batch({ wrapper: 'signal' }), 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp(batch({ price: 49_999n }), 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp(batch({ payTo: giver.pkh }), 'mecha', pkg.pkh, offer)).toBe(false);
        // The maker spending to itself stamps nothing; an input of unknown origin neither.
        expect(isStamp(batch({ from: maker.pkh }), 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp({ ...tx, inputs: [''] }, 'mecha', pkg.pkh, offer)).toBe(false);
    });

    it('a batch stamps only what it funds: a gift that is named but not paid the floor by ONE output is not stamped', () => {
        // Named, not funded at all.
        expect(isStamp(batch({ funds: [[other.pkh, 2_000n], [third.pkh, 2_000n]] }), 'mecha', pkg.pkh, offer)).toBe(false);
        // Dust; and two small outputs that only together reach the floor.
        expect(isStamp(batch({ funds: [[pkg.pkh, 546n], [other.pkh, 2_000n], [third.pkh, 2_000n]] }), 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp(batch({ funds: [[pkg.pkh, 546n], [pkg.pkh, 546n], [other.pkh, 2_000n]] }), 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp(batch({ funds: [[pkg.pkh, 1_000n], [other.pkh, 2_000n]] }), 'mecha', pkg.pkh, offer)).toBe(true);
        // The others in the same transaction are still stamped.
        expect(isStamp(batch({ funds: [[pkg.pkh, 546n], [other.pkh, 2_000n], [third.pkh, 2_000n]] }), 'mecha', other.pkh, offer)).toBe(true);
    });

    it('the price cannot be paid to one of the gifts, and a second data output spoils the stamp', () => {
        // The "maker" is a gift of the batch: the money would come back to whoever opens it.
        const self: WrapperOffer = { sats: 1_500n, payTo: other.address };
        expect(isStamp(batch(), 'mecha', pkg.pkh, self)).toBe(false);
        expect(isStamp(batch(), 'mecha', other.pkh, self)).toBe(false);
        const two = batch();
        expect(isStamp({ ...two, outputs: [...two.outputs, { sats: 0n, script: marker('mecha', pkg.pkh) }] }, 'mecha', pkg.pkh, offer)).toBe(false);
    });

    it('only a marker written exactly as this page writes it is read', () => {
        const good = bmarker([pkg.pkh, other.pkh]);
        const withMarker = (script: string): TxDetail => ({ ...batch({ pkhs: [pkg.pkh, other.pkh] }), outputs: [{ sats: 0n, script }, ...batch({ pkhs: [pkg.pkh, other.pkh] }).outputs.slice(1)] });
        expect(isStamp(withMarker(good), 'mecha', pkg.pkh, offer)).toBe(true);
        expect(isStamp(withMarker(good.toUpperCase()), 'mecha', pkg.pkh, offer)).toBe(true);
        const head = good.slice(0, good.length - 84);
        const bad = [
            good + '00', // a byte too many
            good.slice(0, -2), // a byte short
            head + '14' + toHex(pkg.pkh), // one package only
            head + '14' + toHex(pkg.pkh) + '14' + toHex(pkg.pkh), // the same package twice
            head + '14' + toHex(pkg.pkh) + '13' + toHex(other.pkh).slice(2) + '00', // a push of the wrong size
            head + '4c14' + toHex(pkg.pkh) + '14' + toHex(other.pkh), // a longer way to write the same push
            good.replace('0011', '0012'), // another action
            good.replace('45474946', '45474947'), // another tag
            head + Array.from({ length: 10 }, (_, i) => '14' + toHex(deriveKey(new Uint8Array(16).fill(60 + i)).pkh)).join('') + '14' + toHex(pkg.pkh), // more than nine
        ];
        for (const script of bad) expect(isStamp(withMarker(script), 'mecha', pkg.pkh, offer), script.slice(-50)).toBe(false);
    });

    it('a batch at an earlier price counts by its block height, like a plain stamp', async () => {
        const oldMaker = deriveKey(new Uint8Array(16).fill(5));
        const changed: WrapperOffer = { sats: 80_000n, payTo: maker.address, earlier: [{ sats: 50_000n, payTo: oldMaker.address, until: 900_000 }] };
        expect(isStamp(batch({ payTo: oldMaker.pkh, height: 900_000 }), 'mecha', other.pkh, changed)).toBe(true);
        expect(isStamp(batch({ payTo: oldMaker.pkh, height: 900_001 }), 'mecha', other.pkh, changed)).toBe(false);
        expect(isStamp(batch({ payTo: oldMaker.pkh }), 'mecha', other.pkh, changed)).toBe(false);
        // An earlier address that is a gift of the batch pays nothing either.
        const selfBefore: WrapperOffer = { sats: 80_000n, payTo: maker.address, earlier: [{ sats: 1_500n, payTo: third.address, until: 900_000 }] };
        expect(isStamp(batch({ price: 1n, height: 5 }), 'mecha', pkg.pkh, selfBefore)).toBe(false);
        // In no block yet: neither paid nor unpaid.
        const chain = createDemoChain();
        chain.fund(other.address, 2_001n, { tx: batch({ payTo: oldMaker.pkh }) });
        expect(await entitlement({ chain, coins: (await chain.read(other.address)).coins, wrapper: 'mecha', pkh: other.pkh, offer: changed })).toBe('unknown');
    });

    it('each gift of a batch read from the chain is paid; a gift only named is not', async () => {
        const chain = createDemoChain();
        const tx = batch({ funds: [[pkg.pkh, 2_000n], [other.pkh, 2_001n]] });
        chain.fund(pkg.address, 2_000n, { tx });
        chain.fund(other.address, 2_001n, { tx });
        // The third is named by the marker but funded by a plain transaction later.
        chain.fund(third.address, 2_002n);
        for (const k of [pkg, other]) expect(await entitlement({ chain, coins: (await chain.read(k.address)).coins, wrapper: 'mecha', pkh: k.pkh, offer })).toBe('paid');
        expect(await entitlement({ chain, coins: (await chain.read(third.address)).coins, wrapper: 'mecha', pkh: third.pkh, offer })).toBe('unpaid');
    });

    it('what the fund-all link asks a wallet for is a stamp for every gift, at two gifts and at nine', () => {
        /** The transaction a wallet makes of a BIP21 URI: marker first, each output in order, its change last. */
        const sent = (bip21: string): TxDetail => {
            const [first, query] = bip21.split('?') as [string, string];
            const outputs: { sats: bigint; script: string }[] = [];
            let to = first;
            for (const part of query.split('&')) {
                const [key, value] = part.split('=') as [string, string];
                if (key === 'op_return_raw') outputs.unshift({ sats: 0n, script: '6a' + value });
                else if (key === 'addr') to = value;
                else if (key === 'amount') outputs.push({ sats: BigInt(value.replace('.', '')), script: (h => (parseEcashAddress(to)!.type === 'p2pkh' ? `76a914${h}88ac` : `a914${h}87`))(toHex(parseEcashAddress(to)!.hash)) });
                else throw new Error('unexpected ' + key);
            }
            return { inputs: [p2pkh(giver.pkh)], outputs: [...outputs, { sats: 9_999n, script: p2pkh(giver.pkh) }] };
        };
        for (const [n, wrapper] of [[2, 'mecha'], [9, 'x'.repeat(24)]] as const) {
            const keys = Array.from({ length: n }, (_, i) => deriveKey(new Uint8Array(16).fill(100 + i)));
            const tx = sent(batchFundLinks({ gifts: keys.map((k, i) => ({ address: k.address, sats: 1_000n + BigInt(i) })), paid: { wrapper, offer } }).bip21);
            expect(tx.outputs.length).toBe(n + 3);
            for (const k of keys) expect(isStamp(tx, wrapper, k.pkh, offer), `${n}`).toBe(true);
            expect(isStamp(tx, wrapper, giver.pkh, offer)).toBe(false);
        }
        // A maker paid at a script address (P2SH) works the same.
        const p2sh: WrapperOffer = { sats: 50_000n, payTo: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07' };
        expect(isValidOffer(p2sh)).toBe(true);
        const tx = sent(batchFundLinks({ gifts: [pkg, other].map(k => ({ address: k.address, sats: 2_000n })), paid: { wrapper: 'mecha', offer: p2sh } }).bip21);
        expect(isStamp(tx, 'mecha', pkg.pkh, p2sh)).toBe(true);
    });

    it('more ways a marker or a funding is refused', () => {
        const tenth = Array.from({ length: 10 }, (_, i) => deriveKey(new Uint8Array(16).fill(120 + i)).pkh);
        const head = bmarker([pkg.pkh, other.pkh]).slice(0, -84);
        const withMarker = (script: string): TxDetail => ({ ...batch({ pkhs: [pkg.pkh, other.pkh] }), outputs: [{ sats: 0n, script }, ...batch({ pkhs: [pkg.pkh, other.pkh] }).outputs.slice(1)] });
        const ten = head + tenth.map(p => '14' + toHex(p)).join('');
        expect(isStamp({ ...withMarker(ten), outputs: [...withMarker(ten).outputs, { sats: 2_000n, script: p2pkh(tenth[0]!) }] }, 'mecha', tenth[0]!, offer)).toBe(false);
        for (const script of [head, head + '1', bmarker([pkg.pkh, other.pkh]).slice(0, -1) + 'g', marker('mecha', pkg.pkh) + '14' + toHex(other.pkh)]) expect(isStamp(withMarker(script), 'mecha', pkg.pkh, offer), script.slice(-30)).toBe(false);
        // A wrapper whose name begins another's is another wrapper.
        expect(isStamp(batch({ wrapper: 'mecha' }), 'me', pkg.pkh, offer)).toBe(false);
        expect(isStamp(batch({ wrapper: 'me' }), 'mecha', pkg.pkh, offer)).toBe(false);
        // One sat under the floor; an amount that is not a number of sats.
        expect(isStamp(batch({ funds: [[pkg.pkh, 999n], [other.pkh, 2_000n]] }), 'mecha', pkg.pkh, offer)).toBe(false);
        const odd = batch();
        expect(isStamp({ ...odd, outputs: odd.outputs.map(o => (o.script === p2pkh(pkg.pkh) ? { ...o, sats: 2000 as unknown as bigint } : o)) }, 'mecha', pkg.pkh, offer)).toBe(false);
        // Several inputs, one of them the maker's, or one of unknown origin.
        expect(isStamp({ ...batch(), inputs: [p2pkh(giver.pkh), p2pkh(maker.pkh)] }, 'mecha', pkg.pkh, offer)).toBe(false);
        expect(isStamp({ ...batch(), inputs: [p2pkh(giver.pkh), ''] }, 'mecha', pkg.pkh, offer)).toBe(false);
    });

    it('the fund-all link: the first gift, the marker, the other gifts in order, the price last', () => {
        const gifts = [pkg, other, third].map((k, i) => ({ address: k.address, sats: 2_000n + BigInt(i) }));
        const l = batchFundLinks({ gifts, paid: { wrapper: 'mecha', offer } });
        expect(l.bip21).toBe(`${pkg.address}?amount=20.00&op_return_raw=${batchOpReturnRaw('mecha', [pkg.pkh, other.pkh, third.pkh])}&addr=${other.address}&amount=20.01&addr=${third.address}&amount=20.02&addr=${maker.address}&amount=500.00`);
        expect(l.web).toBe(`https://cashtab.com/#/send?bip21=${l.bip21}`);
        expect(l.app).toBe(`https://pay.e.cash/?bip21=${l.bip21}`);
        expect(l.appBack).toBe(`https://pay.e.cash/?bip21=${l.bip21}&b=1`);
        expect(l.bip21).toMatch(/^[a-z0-9:?=.&_]+$/);
        // A free wrapper (or one the wallet owns): no marker, no price.
        expect(batchFundLinks({ gifts }).bip21).toBe(`${pkg.address}?amount=20.00&addr=${other.address}&amount=20.01&addr=${third.address}&amount=20.02`);
        // What it refuses.
        expect(() => batchFundLinks({ gifts: gifts.slice(0, 1) })).toThrow();
        expect(() => batchFundLinks({ gifts: Array.from({ length: 10 }, (_, i) => ({ address: deriveKey(new Uint8Array(16).fill(80 + i)).address, sats: 2_000n })) })).toThrow();
        expect(() => batchFundLinks({ gifts: [gifts[0]!, gifts[0]!] })).toThrow();
        expect(() => batchFundLinks({ gifts: [gifts[0]!, { address: other.address, sats: 999n }] })).toThrow();
        expect(() => batchFundLinks({ gifts: [gifts[0]!, { address: 'ecash:nope', sats: 2_000n }] })).toThrow();
        expect(batchFundLinks({ gifts }).bip21).not.toContain('op_return_raw');
        // The same package spelled another way is still the same package; a script address is no package; the cap.
        expect(() => batchFundLinks({ gifts: [gifts[0]!, { address: pkg.address.slice(6), sats: 2_000n }] })).toThrow();
        expect(() => batchFundLinks({ gifts: [gifts[0]!, { address: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07', sats: 2_000n }] })).toThrow();
        expect(() => batchFundLinks({ gifts: [{ address: pkg.address, sats: 2_100_000_000_000_000n }, { address: other.address, sats: 1_000n }] })).toThrow();
        expect(() => batchFundLinks({ gifts: [{ address: pkg.address, sats: 2_100_000_000_000_001n }, { address: other.address, sats: 1_000n }] })).toThrow();
        expect(() => batchFundLinks({ gifts, paid: { wrapper: 'mecha', offer: { sats: 50_000n, payTo: other.address } } })).toThrow();
        expect(() => batchFundLinks({ gifts, paid: { wrapper: 'Mecha', offer } })).toThrow();
        expect(() => batchFundLinks({ gifts, paid: { wrapper: 'mecha', offer: { sats: 1n, payTo: maker.address } } })).toThrow();
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
