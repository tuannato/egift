import { describe, expect, it } from 'vitest';
import { Address, Tx, parseAlp, parseEmppScript, parseSlp, toHex, toHexRev } from 'ecash-lib';
import { buildGiftSweep, isMovableToken } from './tokenTx';
import { buildSweep, takeFeeEstimate } from './tx';
import { deriveKey } from './keys';
import { DUST_SATS, MAX_TOKEN_INPUTS } from './limits';
import { SweepError } from './types';
import type { Coin, CoinToken, TokenKind } from './types';

const key = deriveKey(Uint8Array.from({ length: 16 }, (_, i) => i));
const toKey = deriveKey(new Uint8Array(16).fill(7));
const to = toKey.address;
const p2sh = Address.p2sh('00'.repeat(19) + '01').toString();
const ID = 'ab'.repeat(32);
const OTHER = 'cd'.repeat(32);

const txidN = (n: number): string => n.toString(16).padStart(64, '0');
const xec = (sats: bigint, n: number): Coin => ({ txid: txidN(n), outIdx: 0, sats, token: false, final: true });
const tok = (n: number, atoms: bigint, kind: CoinToken['kind'] = 'alp', extra: Partial<CoinToken> = {}): Coin => ({
    txid: txidN(n),
    outIdx: 1,
    sats: DUST_SATS,
    token: true,
    final: true,
    tokenInfo: { tokenId: ID, kind, atoms, baton: false, ...extra },
});
const code = (f: () => unknown): string => {
    try {
        f();
    } catch (e) {
        return e instanceof SweepError ? e.code : 'other:' + (e as Error).message;
    }
    return 'no error';
};
const inputsOf = (raw: Uint8Array): string[] =>
    Tx.deser(raw).inputs.map(i => `${typeof i.prevOut.txid === 'string' ? i.prevOut.txid : toHexRev(i.prevOut.txid)}:${i.prevOut.outIdx}`);
const destHex = toHex(Address.fromCashAddress(to).toScript().bytecode);

describe('buildGiftSweep', () => {
    it('one-transaction-carries-the-token-and-all-the-xec', () => {
        const coins = [xec(8_888n, 1), tok(2, 500n)];
        const s = buildGiftSweep({ key, coins, to, marker: 'home', tokenId: ID });
        const tx = Tx.deser(s.raw);
        expect(tx.inputs.length).toBe(2);
        expect(tx.outputs.length).toBe(3);
        // [0] the SEND, [1] the token with its 5.46 XEC, [2] every other sat, all to the one destination.
        expect(tx.outputs[0]!.sats).toBe(0n);
        expect(toHex(tx.outputs[1]!.script.bytecode)).toBe(destHex);
        expect(tx.outputs[1]!.sats).toBe(DUST_SATS);
        expect(toHex(tx.outputs[2]!.script.bytecode)).toBe(destHex);
        expect(tx.outputs[2]!.sats).toBe(s.sentSats);
        expect(s.sentSats).toBe(8_888n + DUST_SATS - s.feeSats - DUST_SATS);
        expect(s.feeSats).toBe(BigInt(s.raw.length));
        expect(s.token).toEqual({ tokenId: ID, atoms: 500n, leftCoins: 0 });
        expect(s.spent.length).toBe(2);
    });

    it('a-token-sweep-sends-every-atom-to-the-destination', () => {
        for (const kind of ['alp', 'slp', 'nft'] as TokenKind[]) {
            const coins = [xec(100_000n, 1), tok(2, kind === 'nft' ? 1n : 300n, kind), ...(kind === 'nft' ? [] : [tok(3, 44n, kind)])];
            const want = kind === 'nft' ? 1n : 344n;
            const s = buildGiftSweep({ key, coins, to, marker: 'home', tokenId: ID });
            const script = Tx.deser(s.raw).outputs[0]!.script;
            if (kind === 'alp') {
                const pushes = parseEmppScript(script)!;
                const send = parseAlp(pushes[0]!) as { txType: string; tokenType: number; tokenId: string; sendAtomsArray: bigint[] };
                expect(send).toMatchObject({ txType: 'SEND', tokenType: 0, tokenId: ID, sendAtomsArray: [want] });
                // The "taken home" marker rides as a second push, which the token rules ignore.
                expect(toHex(pushes[1]!)).toBe('454749460001');
                expect(parseAlp(pushes[1]!)).toBeUndefined();
            } else {
                expect(parseSlp(script)).toMatchObject({ txType: 'SEND', tokenType: kind === 'slp' ? 1 : 65, tokenId: ID, sendAtomsArray: [want] });
            }
            expect(s.token!.atoms).toBe(want);
        }
        // A re-key says so (ALP); with no marker there is one push only.
        const re = buildGiftSweep({ key, coins: [xec(100_000n, 1), tok(2, 5n)], to, marker: 'rekey', tokenId: ID });
        expect(toHex(parseEmppScript(Tx.deser(re.raw).outputs[0]!.script)![1]!)).toBe('454749460002');
        const bare = buildGiftSweep({ key, coins: [xec(100_000n, 1), tok(2, 5n)], to, marker: null, tokenId: ID });
        expect(parseEmppScript(Tx.deser(bare.raw).outputs[0]!.script)!.length).toBe(1);
    });

    it('a-token-sweep-never-spends-another-tokens-coin', () => {
        const stranger: Coin = { ...tok(4, 9n), tokenInfo: { tokenId: OTHER, kind: 'alp', atoms: 9n, baton: false } };
        const baton = tok(5, 0n, 'alp', { baton: true });
        const batonWithAtoms = tok(6, 7n, 'alp', { baton: true });
        const unknown = tok(7, 3n, 'other');
        const bare: Coin = { txid: txidN(8), outIdx: 0, sats: DUST_SATS, token: true, final: true }; // a token the chain did not describe
        const coins = [xec(50_000n, 1), tok(2, 10n), stranger, baton, batonWithAtoms, unknown, bare];
        const s = buildGiftSweep({ key, coins, to, marker: 'home', tokenId: ID });
        expect(inputsOf(s.raw).sort()).toEqual([`${txidN(1)}:0`, `${txidN(2)}:1`]);
        expect(s.token!.atoms).toBe(10n);
        for (const c of [stranger, baton, batonWithAtoms, unknown, bare]) expect(isMovableToken(c, ID)).toBe(false);
        // A coin flagged as XEC but described as a token is still moved only as XEC by neither function's mistake:
        // `token` decides; `tokenInfo` alone never makes a coin a token input.
        const odd: Coin = { ...xec(700n, 9), tokenInfo: { tokenId: ID, kind: 'alp', atoms: 5n, baton: false } };
        expect(isMovableToken(odd, ID)).toBe(false);
    });

    it('the-xec-sweep-still-never-spends-a-token-coin', () => {
        // `buildSweep` goes by `token` alone; the new description beside it changes nothing.
        const coins = [xec(8_888n, 1), tok(2, 500n), tok(3, 1n, 'nft')];
        const s = buildSweep({ key, coins, to, marker: 'home' });
        expect(inputsOf(s.raw)).toEqual([`${txidN(1)}:0`]);
        expect(s.sentSats).toBe(8_888n - s.feeSats);
    });

    it('a-token-never-costs-the-gift-its-xec', () => {
        // A 10 XEC gift with a token: carrying it leaves 1000 - 388 = 612 sats, still over the dust limit.
        const small = buildGiftSweep({ key, coins: [xec(1_000n, 1), tok(2, 5n)], to, marker: 'home', tokenId: ID });
        expect(small.sentSats).toBeGreaterThanOrEqual(DUST_SATS);
        expect(small.token?.fused).toBeUndefined();
        // The estimate said to a giver who adds a token is this very fee.
        expect(small.feeSats).toBe(takeFeeEstimate(true));
        // Less than that: no XEC coin of its own. The little that is left rides on the token coin, so the token
        // still goes home and not one sat is lost or left behind.
        const tight = buildGiftSweep({ key, coins: [xec(900n, 1), tok(2, 5n)], to, marker: 'home', tokenId: ID });
        expect(tight.token).toMatchObject({ tokenId: ID, atoms: 5n, fused: true });
        expect(tight.feeSats).toBe(394n);
        expect(tight.sentSats).toBe(900n - 394n);
        expect(tight.raw.length).toBe(394);
        // A re-key never does this: a new package with a token and no XEC coin could not be taken home.
        expect(code(() => buildGiftSweep({ key, coins: [xec(900n, 1), tok(2, 5n)], to, marker: 'rekey', tokenId: ID }))).toBe('dust');
        // Only when the package cannot even pay the fee is the token refused with `dust`.
        const many = Array.from({ length: 12 }, (_, i) => tok(i + 2, 1n));
        expect(code(() => buildGiftSweep({ key, coins: [xec(546n, 1), ...many].map(c => (c.token ? { ...c, sats: 1n } : c)), to, marker: 'home', tokenId: ID }))).toBe('dust');
        // A token with no XEC at all cannot move.
        expect(code(() => buildGiftSweep({ key, coins: [tok(2, 5n)], to, marker: 'home', tokenId: ID }))).toBe('nothing');
    });

    it('asking for a token that is not there, or not one this page moves, signs nothing', () => {
        const coins = [xec(50_000n, 1), tok(2, 10n)];
        expect(code(() => buildGiftSweep({ key, coins, to, marker: 'home', tokenId: OTHER }))).toBe('token');
        expect(code(() => buildGiftSweep({ key, coins, to, marker: 'home', tokenId: 'nope' }))).toBe('token');
        expect(code(() => buildGiftSweep({ key, coins: [xec(50_000n, 1), tok(2, 10n, 'other')], to, marker: 'home', tokenId: ID }))).toBe('token');
        expect(code(() => buildGiftSweep({ key, coins: [xec(50_000n, 1), tok(2, 10n, 'alp', { baton: true })], to, marker: 'home', tokenId: ID }))).toBe('token');
        expect(code(() => buildGiftSweep({ key, coins: [xec(50_000n, 1), tok(2, 10n), tok(3, 10n, 'slp')], to, marker: 'home', tokenId: ID }))).toBe('token');
        expect(code(() => buildGiftSweep({ key, coins, to: 'etoken:qq', marker: 'home', tokenId: ID }))).toBe('bad-address');
        expect(code(() => buildGiftSweep({ key, coins: [...coins, coins[0]!], to, marker: 'home', tokenId: ID }))).toBe('other:Duplicate coin');
    });

    it('more than one output can carry is split, and too many coins wait for another round', () => {
        const max = (1n << 48n) - 1n;
        const s = buildGiftSweep({ key, coins: [xec(50_000n, 1), tok(2, max), tok(3, 10n)], to, marker: 'home', tokenId: ID });
        const tx = Tx.deser(s.raw);
        const send = parseAlp(parseEmppScript(tx.outputs[0]!.script)![0]!) as { sendAtomsArray: bigint[] };
        expect(send.sendAtomsArray).toEqual([max, 10n]);
        expect(tx.outputs.length).toBe(4);
        expect(tx.outputs.slice(1).every(o => toHex(o.script.bytecode) === destHex)).toBe(true);
        expect(s.token!.atoms).toBe(max + 10n);
        // More than 19 outputs' worth: refused, nothing signed.
        const huge = Array.from({ length: 20 }, (_, i) => tok(10 + i, max));
        expect(code(() => buildGiftSweep({ key, coins: [xec(500_000n, 1), ...huge], to, marker: 'home', tokenId: ID }))).toBe('token');
        // Five coins of the token more than one sweep carries: the largest go, 5 are reported left.
        const n = MAX_TOKEN_INPUTS + 5;
        const many = Array.from({ length: n }, (_, i) => tok(100 + i, BigInt(i + 1)));
        const m = buildGiftSweep({ key, coins: [xec(500_000n, 1), ...many], to, marker: 'home', tokenId: ID });
        expect(Tx.deser(m.raw).inputs.length).toBe(MAX_TOKEN_INPUTS + 1);
        expect(m.token).toEqual({ tokenId: ID, atoms: ((6n + BigInt(n)) * BigInt(MAX_TOKEN_INPUTS)) / 2n, leftCoins: 5 });
        // An SLP token or an NFT is never re-keyed: there is no room for the marker that tells the new package so.
        expect(code(() => buildGiftSweep({ key, coins: [xec(50_000n, 1), tok(2, 5n, 'slp')], to, marker: 'rekey', tokenId: ID }))).toBe('token');
    });

    it('a P2SH destination and many XEC coins work; the fee is one sat per byte', () => {
        const coins = [xec(3_000n, 1), xec(4_000n, 2), xec(5_000n, 3), tok(4, 1n, 'nft')];
        const s = buildGiftSweep({ key, coins, to: p2sh, marker: 'home', tokenId: ID });
        expect(Tx.deser(s.raw).inputs.length).toBe(4);
        expect(s.feeSats).toBe(BigInt(s.raw.length));
        expect(s.sentSats).toBe(12_000n - s.feeSats);
        expect(s.leftCoins).toBe(0);
    });
});
