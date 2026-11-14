import { afterEach, describe, expect, it } from 'vitest';
import { toHex } from 'ecash-lib';
import { createDemoChain } from './chain/demo';
import { readCoinToken } from './chain/chronik';
import { forgetSweeps, takeHome } from './flow';
import { deriveKey } from './keys';
import { DUST_SATS, MAX_TOKEN_INPUTS } from './limits';
import { formatAtoms, giftTokens, holdings } from './token';
import { isCleanSend } from './tokenTx';
import type { Coin, CoinToken, Sweep, TokenVerdict, TxDetail } from './types';

const pkg = deriveKey(new Uint8Array(16).fill(1));
const home = deriveKey(new Uint8Array(16).fill(7));
const p2pkh = (pkh: Uint8Array) => `76a914${toHex(pkh)}88ac`;
const GIVER = '76a914' + '11'.repeat(20) + '88ac';
const STRANGER = '76a914' + '99'.repeat(20) + '88ac';
const ID = 'ab'.repeat(32);
const SPAM = 'cd'.repeat(32);
const info = (tokenId: string, atoms: bigint, kind: CoinToken['kind'] = 'alp', baton = false): CoinToken => ({ tokenId, kind, atoms, baton });
const from = (script: string, sats = 8_888n): { tx: TxDetail } => ({ tx: { inputs: [script], outputs: [{ sats, script: p2pkh(pkg.pkh) }] } });

afterEach(() => forgetSweeps());

/** A gift of 88.88 XEC with the giver's token, and a stranger's token beside it. */
function gift(opts: { delayMs?: number } = {}) {
    const chain = createDemoChain({ delayMs: opts.delayMs ?? 5 });
    chain.fund(pkg.address, 8_888n, { ...from(GIVER), height: 900_000 });
    chain.fund(pkg.address, DUST_SATS, { tokenInfo: info(ID, 500n), ...from(GIVER, DUST_SATS), height: 900_001 });
    chain.fund(pkg.address, DUST_SATS, { tokenInfo: info(SPAM, 1_000_000n), ...from(STRANGER, DUST_SATS), height: 900_002 });
    return chain;
}

describe('the tokens of a gift', () => {
    it('a-token-from-the-givers-wallet-is-the-gifts-token; any other is of unknown origin', async () => {
        const chain = gift();
        const coins = (await chain.read(pkg.address)).coins;
        const tokens = await giftTokens({ chain, coins, pkh: pkg.pkh, address: pkg.address });
        expect(tokens).toEqual([
            { tokenId: ID, kind: 'alp', atoms: 500n, coins: 1, final: true, origin: 'giver' },
            { tokenId: SPAM, kind: 'alp', atoms: 1_000_000n, coins: 1, final: true, origin: 'other' },
        ]);
    });

    it('a-stranger-cannot-pass-for-the-giver', async () => {
        // The stranger's token arrived FIRST and the giver's own later: the giver's still leads, the stranger's stays "other".
        const chain = createDemoChain();
        chain.fund(pkg.address, 8_888n, { ...from(GIVER), height: 900_000 });
        chain.fund(pkg.address, DUST_SATS, { tokenInfo: info(SPAM, 9n), ...from(STRANGER, DUST_SATS), height: 900_001 });
        chain.fund(pkg.address, DUST_SATS, { tokenInfo: info(ID, 5n), ...from(GIVER, DUST_SATS), height: 900_002 });
        const tokens = await giftTokens({ chain, coins: (await chain.read(pkg.address)).coins, pkh: pkg.pkh, address: pkg.address });
        expect(tokens.map(t => [t.tokenId, t.origin])).toEqual([
            [ID, 'giver'],
            [SPAM, 'other'],
        ]);
        // More XEC from the giver's own wallet changes nothing.
        chain.fund(pkg.address, 700n, { ...from(GIVER, 700n), height: 900_003 });
        expect((await giftTokens({ chain, coins: (await chain.read(pkg.address)).coins, pkh: pkg.pkh, address: pkg.address })).map(t => t.origin)).toEqual(['giver', 'other']);
        // XEC from anyone else does: which funding is "the giver's" can no longer be known, so no token is named.
        // (This is the price of the rule below: a stranger can un-name a token for 5.46 XEC. The token can still be picked.)
        chain.fund(pkg.address, 600n, { ...from(STRANGER, 600n), height: 900_004 });
        expect((await giftTokens({ chain, coins: (await chain.read(pkg.address)).coins, pkh: pkg.pkh, address: pkg.address })).map(t => t.origin)).toEqual(['other', 'other']);
    });

    it('a-strangers-funding-that-reached-a-block-first-does-not-name-its-token', async () => {
        // The giver's funding was still unconfirmed when a stranger sent XEC and a token; the stranger's
        // transactions were mined a block earlier, so on chain THEY are "the oldest funding".
        const chain = createDemoChain();
        chain.fund(pkg.address, 1_000n, { ...from(STRANGER, 1_000n), height: 900_000 });
        chain.fund(pkg.address, DUST_SATS, { tokenInfo: info(SPAM, 9n), ...from(STRANGER, DUST_SATS), height: 900_000 });
        chain.fund(pkg.address, 8_888n, { ...from(GIVER), height: 900_001 });
        const tokens = await giftTokens({ chain, coins: (await chain.read(pkg.address)).coins, pkh: pkg.pkh, address: pkg.address });
        expect(tokens.map(t => t.origin)).toEqual(['other']);
    });

    it('a-token-from-the-package-itself-proves-nothing', async () => {
        // A token "from" the package's own address proves nothing.
        const self = createDemoChain();
        self.fund(pkg.address, 8_888n, { tx: { inputs: [GIVER, p2pkh(pkg.pkh)], outputs: [] }, height: 1 });
        self.fund(pkg.address, DUST_SATS, { tokenInfo: info(SPAM, 9n), tx: { inputs: [p2pkh(pkg.pkh)], outputs: [] }, height: 2 });
        expect((await giftTokens({ chain: self, coins: (await self.read(pkg.address)).coins, pkh: pkg.pkh, address: pkg.address }))[0]!.origin).toBe('other');
    });

    it('a-gift-opened-once-has-no-giver', async () => {
        // The gift was taken home. A stranger refills the address with a little XEC and a token from one
        // wallet: that wallet would be "the oldest funding". Nothing here is the giver's any more.
        const chain = createDemoChain({ delayMs: 1 });
        chain.fund(pkg.address, 8_888n, from(GIVER));
        expect((await takeHome({ chain, key: pkg, to: home.address, marker: 'home' })).kind).toBe('done');
        chain.fund(pkg.address, 600n, from(STRANGER, 600n));
        chain.fund(pkg.address, DUST_SATS, { tokenInfo: info(SPAM, 9n), ...from(STRANGER, DUST_SATS) });
        const s = await chain.read(pkg.address);
        expect(s.kind).toBe('funded');
        expect((await giftTokens({ chain, coins: s.coins, pkh: pkg.pkh, address: pkg.address })).map(t => t.origin)).toEqual(['other']);
    });

    it('two-fundings-of-one-age-name-no-giver', async () => {
        // Both unconfirmed (or both in one block): a stranger's bigger coin must not pass for the gift's funding.
        for (const height of [undefined, 900_000]) {
            const chain = createDemoChain();
            const h = height === undefined ? {} : { height };
            chain.fund(pkg.address, 1_000n, { ...from(GIVER, 1_000n), ...h });
            chain.fund(pkg.address, 1_001n, { ...from(STRANGER, 1_001n), ...h });
            chain.fund(pkg.address, DUST_SATS, { tokenInfo: info(ID, 5n), ...from(GIVER, DUST_SATS), ...h });
            chain.fund(pkg.address, DUST_SATS, { tokenInfo: info(SPAM, 9n), ...from(STRANGER, DUST_SATS), ...h });
            const tokens = await giftTokens({ chain, coins: (await chain.read(pkg.address)).coins, pkh: pkg.pkh, address: pkg.address });
            expect(tokens.map(t => t.origin)).toEqual(['other', 'other']);
        }
    });

    it('after-a-re-key-only-the-token-that-came-with-it-is-the-givers', async () => {
        const chain = gift({ delayMs: 1 });
        const next = deriveKey(new Uint8Array(16).fill(9));
        expect((await takeHome({ chain, key: pkg, to: next.address, marker: 'rekey', tokenId: ID })).kind).toBe('done');
        // Everyone with the old link still holds the old key: a token sent later "from the old package" is a stranger's.
        chain.fund(next.address, DUST_SATS, { tokenInfo: info(SPAM, 9n), tx: { inputs: [p2pkh(pkg.pkh)], outputs: [] } });
        const tokens = await giftTokens({ chain, coins: (await chain.read(next.address)).coins, pkh: next.pkh, address: next.address });
        expect(tokens.map(t => [t.tokenId, t.origin])).toEqual([
            [ID, 'giver'],
            [SPAM, 'other'],
        ]);
    });

    it('when origins cannot be read every token is "other"; batons and unknown kinds are not listed at all', async () => {
        const chain = gift();
        chain.fund(pkg.address, DUST_SATS, { tokenInfo: info('ef'.repeat(32), 0n, 'alp', true) });
        chain.fund(pkg.address, DUST_SATS, { tokenInfo: info('12'.repeat(32), 4n, 'other') });
        chain.fund(pkg.address, DUST_SATS, { token: true });
        const coins = (await chain.read(pkg.address)).coins;
        expect(holdings(coins).map(h => h.tokenId)).toEqual([ID, SPAM]);
        // an-unread-origin-is-an-error-not-a-strangers-token: the caller must be able to say "could not read".
        const deaf = { detail: async () => Promise.reject(new Error('offline')), everSpent: async () => false };
        await expect(giftTokens({ chain: deaf, coins, pkh: pkg.pkh, address: pkg.address })).rejects.toThrow();
        const unseen = { detail: async () => null, everSpent: async () => false };
        await expect(giftTokens({ chain: unseen, coins, pkh: pkg.pkh, address: pkg.address })).rejects.toThrow();
        const mute = { detail: chain.detail!.bind(chain), everSpent: async () => Promise.reject(new Error('offline')) };
        await expect(giftTokens({ chain: mute, coins, pkh: pkg.pkh, address: pkg.address })).rejects.toThrow();
        expect((await giftTokens({ chain: {}, coins, pkh: pkg.pkh, address: pkg.address })).map(t => t.origin)).toEqual(['other', 'other']);
        expect(await giftTokens({ chain, coins: coins.filter(c => !c.token), pkh: pkg.pkh, address: pkg.address })).toEqual([]);
    });

    it('a coin\'s token is read defensively', () => {
        const t = (protocol: string, type: string, extra: object = {}) => readCoinToken({ tokenId: ID, tokenType: { protocol, type, number: 0 }, atoms: 5n, isMintBaton: false, ...extra });
        expect(t('ALP', 'ALP_TOKEN_TYPE_STANDARD')).toEqual({ tokenId: ID, kind: 'alp', atoms: 5n, baton: false });
        expect(t('SLP', 'SLP_TOKEN_TYPE_FUNGIBLE')!.kind).toBe('slp');
        expect(t('SLP', 'SLP_TOKEN_TYPE_NFT1_CHILD')!.kind).toBe('nft');
        for (const other of ['SLP_TOKEN_TYPE_NFT1_GROUP', 'SLP_TOKEN_TYPE_MINT_VAULT', 'SLP_TOKEN_TYPE_UNKNOWN']) expect(t('SLP', other)!.kind).toBe('other');
        expect(t('ALP', 'ALP_TOKEN_TYPE_UNKNOWN')!.kind).toBe('other');
        expect(t('UNKNOWN', 'UNKNOWN')!.kind).toBe('other');
        // A baton unless the node says, in so many words, that it is not one.
        expect(t('ALP', 'ALP_TOKEN_TYPE_STANDARD', { isMintBaton: true })!.baton).toBe(true);
        expect(t('ALP', 'ALP_TOKEN_TYPE_STANDARD', { isMintBaton: undefined })!.baton).toBe(true);
        expect(readCoinToken(undefined)).toBeUndefined();
        expect(readCoinToken({ tokenId: 'nope', atoms: 1n })).toBeUndefined();
        expect(readCoinToken({ tokenId: ID, atoms: 5 })).toBeUndefined();
    });

    it('token amounts are written with the token\'s decimals', () => {
        expect(formatAtoms(500n, 0, 'en')).toBe('500');
        expect(formatAtoms(1_234_567n, 2, 'en')).toBe('12,345.67');
        expect(formatAtoms(1_234_567n, 2, 'vi')).toBe('12.345,67');
        expect(formatAtoms(1_000n, 3, 'en')).toBe('1');
        expect(formatAtoms(5n, 4, 'vi')).toBe('0,0005');
        expect(formatAtoms(7n, 99, 'en')).toBe('7');
    });
});

describe('taking a gift with a token home', () => {
    it('the-token-and-the-xec-go-home-in-one-transaction', async () => {
        const chain = gift();
        const r = await takeHome({ chain, key: pkg, to: home.address, marker: 'home', tokenId: ID });
        expect(r.kind).toBe('done');
        if (r.kind !== 'done') return;
        expect(r.token).toEqual({ tokenId: ID, atoms: 500n, leftCoins: 0 });
        // A stranger's token was not carried: the result says a token is still at the package.
        expect(r.tokenLeft).toBe(true);
        const there = (await chain.read(home.address)).coins;
        expect(there.filter(c => c.token).map(c => c.tokenInfo)).toEqual([info(ID, 500n)]);
        expect(there.filter(c => !c.token).map(c => c.sats)).toEqual([r.sentSats]);
        // a-strangers-token-never-moves-unless-picked: it is still at the package, untouched.
        const left = (await chain.read(pkg.address)).coins;
        expect(left.map(c => c.tokenInfo?.tokenId)).toEqual([SPAM]);
        // Asking again says the same thing; nothing new is signed.
        expect(await takeHome({ chain, key: pkg, to: home.address, marker: 'home', tokenId: ID })).toEqual(r);
    });

    it('without a token asked for, the XEC goes alone exactly as before and every token stays', async () => {
        const chain = gift();
        const r = await takeHome({ chain, key: pkg, to: home.address, marker: 'home' });
        expect(r.kind).toBe('done');
        if (r.kind !== 'done') return;
        expect(r.token).toBeUndefined();
        expect(r.sentSats).toBe(8_888n - 203n);
        expect((await chain.read(pkg.address)).coins.map(c => c.tokenInfo?.tokenId).sort()).toEqual([ID, SPAM].sort());
    });

    it('a-small-gift-never-leaves-its-token-behind', async () => {
        // 9 XEC and a token: too little XEC for a coin of its own, so it rides on the token coin. One transaction, nothing left.
        const chain = createDemoChain({ delayMs: 5 });
        chain.fund(pkg.address, 900n, from(GIVER, 900n));
        chain.fund(pkg.address, DUST_SATS, { tokenInfo: info(ID, 5n), ...from(GIVER, DUST_SATS) });
        const r = await takeHome({ chain, key: pkg, to: home.address, marker: 'home', tokenId: ID });
        expect(r.kind).toBe('done');
        if (r.kind !== 'done') return;
        expect(r.tokenLeft).toBeUndefined();
        expect(r.token).toMatchObject({ tokenId: ID, atoms: 5n });
        expect(r.sentSats).toBe(900n - 394n);
        expect((await chain.read(pkg.address)).coins).toEqual([]);
        const got = (await chain.read(home.address)).coins;
        expect(got.length).toBe(1);
        expect(got[0]).toMatchObject({ sats: DUST_SATS + 900n - 394n, token: true });
        expect(got[0]!.tokenInfo).toMatchObject({ tokenId: ID, atoms: 5n });
    });

    it('the-node-is-asked-before-a-token-leaves', async () => {
        // No answer: nothing is sent, nothing is remembered, the package is untouched.
        const chain = gift();
        const real = chain.validate!.bind(chain);
        let sent = 0;
        const send = chain.broadcast.bind(chain);
        chain.broadcast = async raw => {
            sent++;
            return send(raw);
        };
        chain.validate = async () => Promise.reject(new Error('offline'));
        const off = await takeHome({ chain, key: pkg, to: home.address, marker: 'home', tokenId: ID });
        expect(off).toMatchObject({ kind: 'error', code: 'offline' });
        // The node says the token part is not in order: nothing is sent either.
        chain.validate = async raw => ({ ...(await real(raw)), normal: false });
        expect(await takeHome({ chain, key: pkg, to: home.address, marker: 'home', tokenId: ID })).toMatchObject({ kind: 'error', code: 'token' });
        expect(sent).toBe(0);
        expect((await chain.read(pkg.address)).coins.length).toBe(3);
        // The XEC can still be taken on its own.
        chain.validate = real;
        expect((await takeHome({ chain, key: pkg, to: home.address, marker: 'home', tokenId: null })).kind).toBe('done');
    });

    it('what counts as a clean answer', () => {
        const sweep = { token: { tokenId: ID, atoms: 500n, leftCoins: 0 } } as Sweep;
        const ok: TokenVerdict = { normal: true, failedParsings: 0, entries: [{ tokenId: ID, send: true, clean: true }], outputs: [null, { tokenId: ID, atoms: 500n, baton: false }, null] };
        expect(isCleanSend(ok, sweep)).toBe(true);
        expect(isCleanSend({ ...ok, outputs: [null, { tokenId: ID, atoms: 300n, baton: false }, { tokenId: ID, atoms: 200n, baton: false }, null] }, sweep)).toBe(true);
        const bad: TokenVerdict[] = [
            { ...ok, normal: false },
            { ...ok, failedParsings: 1 },
            { ...ok, entries: [] },
            { ...ok, entries: [...ok.entries, { tokenId: SPAM, send: true, clean: true }] },
            { ...ok, entries: [{ tokenId: SPAM, send: true, clean: true }] },
            { ...ok, entries: [{ tokenId: ID, send: false, clean: true }] },
            { ...ok, entries: [{ tokenId: ID, send: true, clean: false }] },
            { ...ok, outputs: [null, { tokenId: ID, atoms: 499n, baton: false }, null] },
            { ...ok, outputs: [null, { tokenId: SPAM, atoms: 500n, baton: false }, null] },
            { ...ok, outputs: [null, { tokenId: ID, atoms: 500n, baton: true }, null] },
            { ...ok, outputs: [null, { tokenId: ID, atoms: 500n, baton: false }, { tokenId: ID, atoms: 1n, baton: false }] },
            { ...ok, outputs: [{ tokenId: ID, atoms: 500n, baton: false }, null, null] },
            { ...ok, outputs: [null, null, null] },
            { ...ok, outputs: [null, null] },
        ];
        for (const v of bad) expect(isCleanSend(v, sweep)).toBe(false);
        expect(isCleanSend(ok, {} as Sweep)).toBe(false);
    });

    it('the chain itself refuses a transaction that would burn a token', async () => {
        // The demo node behaves like the real one here: a token coin spent without its SEND is not relayed.
        const chain = gift();
        const coins = (await chain.read(pkg.address)).coins;
        const { buildSweep } = await import('./tx');
        // Lie to the XEC sweep: present a token coin as plain XEC, as a node without a token index would.
        const lied: Coin[] = coins.map(c => ({ txid: c.txid, outIdx: c.outIdx, sats: c.sats, token: false, final: true }));
        const burn = buildSweep({ key: pkg, coins: lied, to: home.address, marker: 'home' });
        await expect(chain.broadcast(burn.raw)).rejects.toMatchObject({ code: 'rejected' });
        expect((await chain.read(pkg.address)).coins.length).toBe(3);
    });

    it('a second opener loses the whole gift at once, never half of it', async () => {
        const chain = gift({ delayMs: 20 });
        chain.nextVerdict('conflict');
        const r = await takeHome({ chain, key: pkg, to: home.address, marker: 'home', tokenId: ID });
        expect(r.kind).toBe('lost');
        expect((await chain.read(home.address)).coins).toEqual([]);
    });

    it('a re-key carries the token to the new key the same way', async () => {
        const chain = gift();
        const next = deriveKey(new Uint8Array(16).fill(9));
        const r = await takeHome({ chain, key: pkg, to: next.address, marker: 'rekey', tokenId: ID });
        expect(r.kind).toBe('done');
        const s = await chain.read(next.address);
        expect(s.kind).toBe('funded');
        expect(holdings(s.coins).map(h => [h.tokenId, h.atoms])).toEqual([[ID, 500n]]);
        // And from there it goes home.
        const r2 = await takeHome({ chain, key: next, to: home.address, marker: 'home', tokenId: ID });
        expect(r2).toMatchObject({ kind: 'done', token: { tokenId: ID, atoms: 500n } });
    });

    it('more coins of the token than one sweep carries: the result says some stayed', async () => {
        const chain = createDemoChain({ delayMs: 1 });
        chain.fund(pkg.address, 50_000n, from(GIVER, 50_000n));
        for (let i = 0; i < MAX_TOKEN_INPUTS + 1; i++) chain.fund(pkg.address, DUST_SATS, { tokenInfo: info(ID, 10n), ...from(GIVER, DUST_SATS) });
        const r = await takeHome({ chain, key: pkg, to: home.address, marker: 'home', tokenId: ID });
        expect(r).toMatchObject({ kind: 'done', token: { tokenId: ID, atoms: 10n * BigInt(MAX_TOKEN_INPUTS), leftCoins: 1 } });
    });
});
