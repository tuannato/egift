import { describe, expect, it } from 'vitest';
import { sha256 } from '@noble/hashes/sha2.js';
import { ALL_BIP143, Address, P2PKHSignatory, Script, Tx, TxBuilder, fromHex, toHex } from 'ecash-lib';
import { buildSweep, isValidDestination } from './tx';
import { deriveKey } from './keys';
import { DUST_SATS, MAX_SWEEP_INPUTS } from './limits';
import { SweepError } from './types';
import type { Coin, SweepMarker } from './types';

const key = deriveKey(Uint8Array.from({ length: 16 }, (_, i) => i));
const toKey = deriveKey(new Uint8Array(16).fill(7));
const to = toKey.address; // ecash:qzyt8npm9ev3cepyc38ja6rl0xplh6d0z5erm05zx9
const p2sh = Address.p2sh('00'.repeat(19) + '01').toString();

const txidN = (n: number): string => n.toString(16).padStart(64, '0');
const coin = (sats: bigint, n = 1, outIdx = 0, extra: Partial<Coin> = {}): Coin => ({
    txid: txidN(n),
    outIdx,
    sats,
    token: false,
    final: true,
    ...extra,
});

function sweepError(f: () => unknown): string {
    try {
        f();
    } catch (e) {
        if (e instanceof SweepError) return e.code;
        return 'other:' + (e as Error).message;
    }
    return 'no error';
}

/** Sizes: 10 (version, counts, locktime) + 141 (P2PKH input) + 34 (P2PKH output) = 185 bytes; + 18-byte EGIF marker output = 203 bytes. */
const FEE_PLAIN_1 = 185n;
const FEE_MARKED_1 = 203n;

describe('isValidDestination', () => {
    it('accepts mainnet ecash P2PKH and P2SH, with or without prefix', () => {
        expect(isValidDestination(to)).toBe(true);
        expect(isValidDestination(to.slice('ecash:'.length))).toBe(true);
        expect(isValidDestination(to.toUpperCase())).toBe(true);
        expect(isValidDestination(`  ${to} \n`)).toBe(true);
        expect(isValidDestination(p2sh)).toBe(true);
        expect(isValidDestination('ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2')).toBe(true);
    });
    it('refuses everything else', () => {
        const pkh = toHex(toKey.pkh);
        const bad = [
            '',
            '   ',
            Address.p2pkh(pkh, 'etoken').toString(),
            Address.p2pkh(pkh, 'etoken').toString().slice('etoken:'.length),
            Address.p2pkh(pkh, 'ectest').toString(),
            Address.p2pkh(pkh, 'ecregtest').toString(),
            Address.p2pkh(pkh, 'bitcoincash').toString(),
            Address.p2pkh(pkh, 'bitcoincash').toString().slice('bitcoincash:'.length),
            Address.p2pkh(pkh).legacy().toString(), // base58
            to.slice(0, -1) + (to.endsWith('9') ? '8' : '9'), // checksum
            to + 'q',
            'ecash:' + to,
            to.slice(0, 10) + to.slice(10).toUpperCase(), // mixed case
            `${to} junk`,
            'ecash:',
            'not an address',
        ];
        for (const b of bad) expect(isValidDestination(b), b).toBe(false);
        expect(isValidDestination(undefined as unknown as string)).toBe(false);
    });
});

describe('buildSweep', () => {
    it('signs a fixed vector, and the txid is the byte-reversed double SHA-256', () => {
        const s = buildSweep({ key, coins: [coin(10000n, 0x11, 0, { txid: '11'.repeat(32) })], to, marker: 'home' });
        const rawHex = toHex(s.raw);
        expect(rawHex).toBe(
            '0200000001' +
                '11'.repeat(32) +
                '00000000' +
                '64' +
                '41b64ef3337f2bc381c1ca8b95bb5a56e0dba4863571375e094ecadcd6c15149fd2d783ebbd3ef5ed0bed0de010e2c2b4500e8fc1169021b4e480224de26ac018241' +
                '21' +
                toHex(key.pk) +
                'ffffffff' +
                '02' +
                '0000000000000000' +
                '09' +
                '6a0445474946020001' +
                '4526000000000000' +
                '1976a914' +
                toHex(toKey.pkh) +
                '88ac' +
                '00000000',
        );
        expect(s.feeSats).toBe(FEE_MARKED_1);
        expect(s.sentSats).toBe(10000n - FEE_MARKED_1);
        expect(s.txid).toBe('47344bd680096cd2f97ecde7a7a91e2251b709f9d22c9ffe0bf3094eccc55a8a');
        const independent = toHex(sha256(sha256(s.raw)).reverse());
        expect(s.txid).toBe(independent);
        expect(s.txid).toBe(Tx.deser(s.raw).txid());
        // Deterministic: building again gives the same bytes.
        expect(toHex(buildSweep({ key, coins: [coin(10000n, 0x11, 0, { txid: '11'.repeat(32) })], to, marker: 'home' }).raw)).toBe(rawHex);
    });

    it('writes the exact EGIF marker bytes, first, for each marker value', () => {
        const cases: [SweepMarker, string | null][] = [
            ['home', '6a0445474946020001'],
            ['rekey', '6a0445474946020002'],
            [null, null],
        ];
        for (const [marker, hex] of cases) {
            const s = buildSweep({ key, coins: [coin(5000n)], to, marker });
            const tx = Tx.deser(s.raw);
            if (hex === null) {
                expect(tx.outputs.length).toBe(1);
                expect(s.feeSats).toBe(FEE_PLAIN_1);
            } else {
                expect(tx.outputs.length).toBe(2);
                expect(toHex(tx.outputs[0]!.script.bytecode)).toBe(hex);
                expect(tx.outputs[0]!.sats).toBe(0n);
                expect(s.feeSats).toBe(FEE_MARKED_1);
            }
            const last = tx.outputs[tx.outputs.length - 1]!;
            expect(toHex(last.script.bytecode)).toBe(toHex(Script.p2pkh(toKey.pkh).bytecode));
            expect(last.sats).toBe(s.sentSats);
        }
    });

    it('taking-home-sweeps-every-utxo-in-one-tx', () => {
        // 60 coins in a scrambled order, some unconfirmed.
        const coins: Coin[] = [];
        for (let i = 0; i < 60; i++) {
            const n = (i * 37) % 60;
            coins.push(coin(1000n + BigInt(n), 1 + (n % 7), n, { final: n % 3 !== 0 }));
        }
        const total = coins.reduce((s, c) => s + c.sats, 0n);
        const s = buildSweep({ key, coins, to, marker: 'home' });
        const tx = Tx.deser(s.raw);
        expect(tx.inputs.length).toBe(60);
        expect(s.raw.length).toBe(10 + 60 * 141 + 18 + 34);
        expect(s.feeSats).toBe(BigInt(s.raw.length));
        expect(s.sentSats + s.feeSats).toBe(total);
        // Every coin is spent exactly once, sorted by (txid, outIdx).
        const spent = tx.inputs.map(i => `${toHex((i.prevOut.txid as Uint8Array).slice().reverse())}:${i.prevOut.outIdx}`);
        const expected = [...coins]
            .sort((a, b) => (a.txid < b.txid ? -1 : a.txid > b.txid ? 1 : a.outIdx - b.outIdx))
            .map(c => `${c.txid}:${c.outIdx}`);
        expect(spent).toEqual(expected);
        expect(new Set(spent).size).toBe(60);
        // Order does not depend on how the coins came in.
        expect(toHex(buildSweep({ key, coins: [...coins].reverse(), to, marker: 'home' }).raw)).toBe(toHex(s.raw));
    });

    it('sweeps an unconfirmed coin too', () => {
        const s = buildSweep({ key, coins: [coin(3000n, 1, 0, { final: false }), coin(4000n, 2)], to, marker: null });
        expect(Tx.deser(s.raw).inputs.length).toBe(2);
        expect(s.sentSats + s.feeSats).toBe(7000n);
    });

    it('a-token-utxo-is-never-spent-as-fuel', () => {
        const token1 = coin(546n, 2, 1, { token: true });
        const token2 = coin(1000n, 4, 0, { token: true, final: false });
        const coins = [coin(100000n, 1), token1, coin(50000n, 3), token2];
        for (const marker of ['home', 'rekey', null] as const) {
            const s = buildSweep({ key, coins, to, marker });
            const inputs = Tx.deser(s.raw).inputs.map(i => `${toHex((i.prevOut.txid as Uint8Array).slice().reverse())}:${i.prevOut.outIdx}`);
            expect(inputs).toEqual([`${txidN(1)}:0`, `${txidN(3)}:0`]);
            expect(inputs).not.toContain(`${token1.txid}:${token1.outIdx}`);
            expect(inputs).not.toContain(`${token2.txid}:${token2.outIdx}`);
            expect(s.spent).toEqual([
                { txid: txidN(1), outIdx: 0 },
                { txid: txidN(3), outIdx: 0 },
            ]);
            // The token coins' sats are not counted: only XEC pays.
            expect(s.sentSats + s.feeSats).toBe(150000n);
            expect(s.leftCoins).toBe(0);
        }
        // Only token coins: nothing to take, nothing signed.
        expect(sweepError(() => buildSweep({ key, coins: [token1, token2], to, marker: null }))).toBe('nothing');
        // Token dust next to too little XEC: dust, still without touching the token.
        expect(sweepError(() => buildSweep({ key, coins: [coin(600n), token2], to, marker: null }))).toBe('dust');
    });

    it('caps one sweep at MAX_SWEEP_INPUTS, largest coins first, and reports the rest', () => {
        expect(MAX_SWEEP_INPUTS).toBe(600);
        // 800 coins; coin i has 1000 + i sats, scattered txids.
        const coins = Array.from({ length: 800 }, (_, i) => coin(1000n + BigInt(i), ((i * 7919) % 800) + 1, i % 3));
        const s = buildSweep({ key, coins, to, marker: 'home' });
        const tx = Tx.deser(s.raw);
        expect(tx.inputs.length).toBe(600);
        expect(s.spent.length).toBe(600);
        expect(s.leftCoins).toBe(200);
        expect(s.raw.length).toBe(10 + 2 + 600 * 141 + 18 + 34); // 3-byte input count
        expect(s.raw.length).toBeLessThan(100_000);
        // The 600 largest (i = 200..799) are the ones spent.
        const spent = new Set(s.spent.map(o => `${o.txid}:${o.outIdx}`));
        for (let i = 0; i < 800; i++) expect(spent.has(`${coins[i]!.txid}:${coins[i]!.outIdx}`)).toBe(i >= 200);
        const expectedSum = coins.slice(200).reduce((a, c) => a + c.sats, 0n);
        expect(s.sentSats + s.feeSats).toBe(expectedSum);
        // Deterministic whatever the input order.
        expect(toHex(buildSweep({ key, coins: [...coins].reverse(), to, marker: 'home' }).raw)).toBe(toHex(s.raw));
        // The second round takes the rest.
        const rest = coins.slice(0, 200);
        const s2 = buildSweep({ key, coins: rest, to, marker: 'home' });
        expect(s2.leftCoins).toBe(0);
        expect(s2.spent.length).toBe(200);
    });

    it('no-tx-is-signed-when-the-remainder-would-fall-under-dust', () => {
        // The trap: TxBuilder drops a sub-dust leftover and burns it all as fee.
        for (const [marker, fee] of [
            ['home', FEE_MARKED_1],
            [null, FEE_PLAIN_1],
        ] as const) {
            expect(sweepError(() => buildSweep({ key, coins: [coin(fee + DUST_SATS - 1n)], to, marker }))).toBe('dust');
            const ok = buildSweep({ key, coins: [coin(fee + DUST_SATS)], to, marker });
            expect(ok.sentSats).toBe(DUST_SATS);
            expect(ok.feeSats).toBe(fee);
            const out = Tx.deser(ok.raw).outputs;
            expect(out[out.length - 1]!.sats).toBe(DUST_SATS);
        }
        // The 700-sat package from the spike: refused, not burnt.
        expect(sweepError(() => buildSweep({ key, coins: [coin(700n)], to, marker: 'home' }))).toBe('dust');
        expect(sweepError(() => buildSweep({ key, coins: [coin(1n)], to, marker: null }))).toBe('dust');
        // Many tiny coins whose fee eats them.
        const dustCoins = Array.from({ length: 10 }, (_, i) => coin(150n, i + 1));
        expect(sweepError(() => buildSweep({ key, coins: dustCoins, to, marker: null }))).toBe('dust');
    });

    it('refuses a bad destination and an empty package', () => {
        expect(sweepError(() => buildSweep({ key, coins: [coin(5000n)], to: 'etoken:' + to.slice(6), marker: null }))).toBe('bad-address');
        expect(sweepError(() => buildSweep({ key, coins: [coin(5000n)], to: '', marker: null }))).toBe('bad-address');
        expect(sweepError(() => buildSweep({ key, coins: [], to, marker: null }))).toBe('nothing');
    });

    it('pays a P2SH destination', () => {
        const s = buildSweep({ key, coins: [coin(5000n)], to: p2sh, marker: null });
        const out = Tx.deser(s.raw).outputs;
        expect(toHex(out[0]!.script.bytecode)).toBe('a914' + '00'.repeat(19) + '01' + '87');
        expect(s.feeSats).toBe(183n);
    });

    it('refuses malformed coins and a key that does not match itself', () => {
        expect(sweepError(() => buildSweep({ key, coins: [coin(5000n), coin(5000n)], to, marker: null }))).toMatch(/^other:/);
        expect(sweepError(() => buildSweep({ key, coins: [{ ...coin(5000n), txid: 'XYZ' }], to, marker: null }))).toMatch(/^other:/);
        expect(sweepError(() => buildSweep({ key, coins: [{ ...coin(5000n), sats: 0n }], to, marker: null }))).toMatch(/^other:/);
        expect(sweepError(() => buildSweep({ key, coins: [{ ...coin(5000n), outIdx: -1 }], to, marker: null }))).toMatch(/^other:/);
        const wrong = { ...key, pkh: fromHex('00'.repeat(20)) };
        expect(sweepError(() => buildSweep({ key: wrong, coins: [coin(5000n)], to, marker: null }))).toMatch(/^other:/);
    });

    it('the library trap this module avoids is real (TxBuilder drops a sub-dust leftover)', () => {
        // If ecash-lib ever stops doing this, the test tells us; buildSweep never relies on it either way.
        const tx = new TxBuilder({
            inputs: [
                {
                    input: { prevOut: { txid: txidN(1), outIdx: 0 }, signData: { sats: 700n, outputScript: Script.p2pkh(key.pkh) } },
                    signatory: P2PKHSignatory(key.sk, key.pk, ALL_BIP143),
                },
            ],
            outputs: [Script.p2pkh(toKey.pkh)],
        }).sign({ feePerKb: 1000n, dustSats: 546n });
        expect(tx.outputs.length).toBe(0);
    });

    it('holds its invariants over random coin sets', () => {
        let seed = 7;
        const r = (): number => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed / 2 ** 31);
        for (let n = 0; n < 200; n++) {
            const count = 1 + Math.floor(r() * 12);
            const coins = Array.from({ length: count }, (_, i) => coin(1n + BigInt(Math.floor(r() * 3000)), 1 + Math.floor(r() * 5), i));
            const total = coins.reduce((a, c) => a + c.sats, 0n);
            const marker = (['home', 'rekey', null] as const)[n % 3]!;
            const size = 10 + 141 * count + 34 + (marker === null ? 0 : 18);
            try {
                const s = buildSweep({ key, coins, to, marker });
                expect(s.raw.length).toBe(size);
                expect(s.feeSats).toBe(BigInt(size));
                expect(s.sentSats).toBe(total - BigInt(size));
                expect(s.sentSats >= DUST_SATS).toBe(true);
                const out = Tx.deser(s.raw).outputs;
                expect(out.reduce((a, o) => a + o.sats, 0n)).toBe(s.sentSats);
            } catch (e) {
                expect(e).toBeInstanceOf(SweepError);
                expect((e as SweepError).code).toBe('dust');
                expect(total - BigInt(size) < DUST_SATS).toBe(true);
            }
        }
    });
});
