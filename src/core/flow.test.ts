import { beforeEach, describe, expect, it } from 'vitest';
import { toHex } from 'ecash-lib';
import { forgetSweeps, takeHome } from './flow';
import { createDemoChain } from './chain/demo';
import { deriveKey } from './keys';
import { decodeFragment, encodeLink, newSecret } from './link';
import { CAP_SATS } from './limits';
import { ChainError } from './types';
import type { Chain, PackageState, Settlement } from './types';

let seed = 0;
/** A fresh package key per scenario, so remembered sweeps never leak between them. */
const freshKey = () => deriveKey(new Uint8Array(16).fill(++seed));
const to = deriveKey(new Uint8Array(16).fill(250)).address;
const to2 = deriveKey(new Uint8Array(16).fill(251)).address;

/** Wrap a chain, count what the flow does to it, and keep every raw tx sent. */
function spy(chain: Chain, over: Partial<Chain> = {}) {
    const calls = { read: 0, broadcast: 0, settle: 0, lookup: 0 };
    const raws: string[] = [];
    const wrapped: Chain = {
        read: a => (calls.read++, (over.read ?? chain.read)(a)),
        broadcast: r => (calls.broadcast++, raws.push(toHex(r)), (over.broadcast ?? chain.broadcast)(r)),
        settle: (t, a, o) => (calls.settle++, (over.settle ?? chain.settle)(t, a, o)),
        watch: chain.watch,
    };
    const lookup = 'lookup' in over ? over.lookup : chain.lookup;
    if (lookup !== undefined) wrapped.lookup = t => (calls.lookup++, lookup(t));
    return { chain: wrapped, calls, raws };
}

/** settle with a short timeout, so "unknown" comes fast. */
const quick = (demo: Chain) => ({ settle: (t: string, a: string, o?: Parameters<Chain['settle']>[2]) => demo.settle(t, a, { ...o, timeoutMs: 30 }) });

beforeEach(() => forgetSweeps());

describe('takeHome', () => {
    it('taken-home-is-shown-only-after-finalization', async () => {
        const demo = createDemoChain({ delayMs: 10 });
        const key = freshKey();
        demo.fund(key.address, 10000n);
        const { chain, calls } = spy(demo);
        const r = await takeHome({ chain, key, to, marker: 'home' });
        expect(r).toMatchObject({ kind: 'done', sentSats: 10000n - 203n, leftCoins: 0 });
        expect(calls.broadcast).toBe(1);

        // Without a "final" verdict there is no "done": a timeout is pending.
        const k2 = freshKey();
        demo.fund(k2.address, 10000n);
        demo.nextVerdict('unknown');
        const p = spy(demo, quick(demo));
        const r2 = await takeHome({ chain: p.chain, key: k2, to, marker: 'home' });
        expect(r2).toMatchObject({ kind: 'pending', sentSats: 10000n - 203n, leftCoins: 0 });
        expect(p.calls.broadcast).toBe(1);

        // A settle that throws is also not "done".
        const k3 = freshKey();
        demo.fund(k3.address, 10000n);
        demo.nextVerdict('unknown');
        const q = spy(demo, { settle: () => Promise.reject(new Error('boom')) });
        expect((await takeHome({ chain: q.chain, key: k3, to, marker: null })).kind).toBe('pending');
    });

    it('a-lost-race-is-reported-from-invalidation-not-from-a-timeout', async () => {
        const demo = createDemoChain({ delayMs: 10 });
        const key = freshKey();
        demo.fund(key.address, 10000n);
        demo.nextVerdict('invalid', 10);
        const start = Date.now();
        const { chain, calls } = spy(demo);
        expect(await takeHome({ chain, key, to, marker: 'home' })).toEqual({ kind: 'lost' });
        expect(calls.broadcast).toBe(1);
        expect(Date.now() - start).toBeLessThan(2000); // from the invalidation, not the 60 s timeout

        // An "unknown" settlement is never turned into "lost".
        const k2 = freshKey();
        demo.fund(k2.address, 10000n);
        const p = spy(demo, { settle: async (): Promise<Settlement> => 'unknown' });
        expect((await takeHome({ chain: p.chain, key: k2, to, marker: 'home' })).kind).toBe('pending');
    });

    it('a conflict is lost only when someone else really emptied the package', async () => {
        const demo = createDemoChain({ delayMs: 10 });
        const key = freshKey();
        demo.fund(key.address, 10000n);
        demo.nextVerdict('conflict'); // the thief's tx spent our coin
        const a = spy(demo);
        expect(await takeHome({ chain: a.chain, key, to, marker: 'home' })).toEqual({ kind: 'lost' });
        expect(a.calls.broadcast).toBe(1);

        // "Missing inputs" because the node has not seen the funding tx yet:
        // the coins are still there, so it is a retryable error, not lost.
        const k2 = freshKey();
        demo.fund(k2.address, 10000n, { final: false });
        demo.nextVerdict('missing-parent');
        const b = spy(demo);
        expect(await takeHome({ chain: b.chain, key: k2, to, marker: 'rekey' })).toMatchObject({ kind: 'error', code: 'rejected' });
        expect((await demo.read(k2.address)).kind).toBe('funded');
        // The retry goes through.
        expect(await takeHome({ chain: b.chain, key: k2, to, marker: 'rekey' })).toMatchObject({ kind: 'done' });
        expect(b.calls.broadcast).toBe(2);
        expect(b.raws[0]).toBe(b.raws[1]);
    });

    it('a broadcast that went through but answered "offline" ends done, and a retry is not "lost"', async () => {
        const demo = createDemoChain({ delayMs: 10 });
        const key = freshKey();
        demo.fund(key.address, 10000n);
        demo.nextVerdict('offline-after-send', 10);
        const a = spy(demo);
        expect(await takeHome({ chain: a.chain, key, to, marker: 'home' })).toMatchObject({ kind: 'done', sentSats: 10000n - 203n });
        expect(a.calls.broadcast).toBe(1);

        // The bare case: a chain with no lookup at all. The first call may
        // not say "done" yet, but neither call says "error then lost".
        const coin = { txid: 'ab'.repeat(32), outIdx: 0, sats: 100_000n, token: false, final: true };
        let spent = false;
        let broadcasts = 0;
        const bare: Chain = {
            async read(): Promise<PackageState> {
                return spent
                    ? { kind: 'taken', coins: [], xecSats: 0n, hasToken: false, allFinal: true }
                    : { kind: 'funded', coins: [coin], xecSats: coin.sats, hasToken: false, allFinal: true };
            },
            async broadcast() {
                broadcasts++;
                spent = true;
                throw new ChainError('offline');
            },
            async settle(_t, _a, o) {
                // The settlement can tell: our outpoint is spent by our txid.
                expect(o?.outpoints).toEqual([{ txid: coin.txid, outIdx: 0 }]);
                return 'final';
            },
            watch: () => () => {},
        };
        const k2 = freshKey();
        const r1 = await takeHome({ chain: bare, key: k2, to, marker: 'home' });
        expect(r1.kind).toBe('done');
        const r2 = await takeHome({ chain: bare, key: k2, to, marker: 'home' });
        expect(r2.kind).not.toBe('lost');
        expect(r2.kind).not.toBe('error');
        expect(broadcasts).toBe(1);
    });

    it('nothing-is-re-signed-until-the-earlier-tx-is-known-absent', async () => {
        const demo = createDemoChain({ delayMs: 10 });

        // (1) Broadcast, no verdict yet: a new request (other destination)
        // signs nothing and reports the earlier tx as pending.
        const key = freshKey();
        demo.fund(key.address, 10000n);
        demo.nextVerdict('unknown');
        const a = spy(demo, quick(demo));
        const first = await takeHome({ chain: a.chain, key, to, marker: 'home' });
        expect(first.kind).toBe('pending');
        const again = await takeHome({ chain: a.chain, key, to: to2, marker: 'home' });
        expect(again).toMatchObject({ kind: 'pending', txid: (first as { txid: string }).txid });
        expect(a.calls.broadcast).toBe(1);

        // (2) No node knows the tx (the answer was lost and nothing went out),
        // the coins are unspent, but the chain cannot say "absent": only the
        // same bytes may go out again; another destination signs nothing.
        const k2 = freshKey();
        demo.fund(k2.address, 10000n);
        const noLookup = spy(demo, { lookup: undefined, broadcast: () => Promise.reject(new ChainError('offline')) });
        expect((await takeHome({ chain: noLookup.chain, key: k2, to, marker: 'home' })).kind).toBe('pending');
        expect((await takeHome({ chain: noLookup.chain, key: k2, to: to2, marker: 'home' })).kind).toBe('pending');
        expect(noLookup.calls.broadcast).toBe(1);
        expect((await takeHome({ chain: noLookup.chain, key: k2, to, marker: 'home' })).kind).toBe('pending');
        expect(noLookup.calls.broadcast).toBe(2);
        expect(new Set(noLookup.raws).size).toBe(1); // the very same tx, never a new one

        // (3) The node says "absent" AND the coins are unspent: a new sweep is allowed.
        const k3 = freshKey();
        demo.fund(k3.address, 10000n);
        let refuse = true;
        const c = spy(demo, { broadcast: r => (refuse ? Promise.reject(new ChainError('rejected')) : demo.broadcast(r)) });
        expect(await takeHome({ chain: c.chain, key: k3, to, marker: 'home' })).toMatchObject({ kind: 'error', code: 'rejected' });
        expect(c.calls.lookup).toBeGreaterThan(0);
        refuse = false;
        const r = await takeHome({ chain: c.chain, key: k3, to: to2, marker: 'home' });
        expect(r.kind).toBe('done');
        expect(c.raws.length).toBe(2);
        expect(c.raws[0]).not.toBe(c.raws[1]);

        // (4) The earlier tx is ours and final although a fresh read says
        // "taken": done, not lost.
        const k4 = freshKey();
        demo.fund(k4.address, 10000n);
        demo.nextVerdict('unknown');
        const d = spy(demo, quick(demo));
        const p4 = await takeHome({ chain: d.chain, key: k4, to, marker: 'home' });
        expect(p4.kind).toBe('pending');
        expect((await demo.read(k4.address)).kind).toBe('taken');
        const d2 = spy(demo, { lookup: async () => 'final' });
        expect(await takeHome({ chain: d2.chain, key: k4, to, marker: 'home' })).toMatchObject({ kind: 'done', txid: (p4 as { txid: string }).txid });
        expect(d2.calls.broadcast).toBe(0);
    });

    it('two calls at once share one run; a different request is refused, never answered with the first one\'s result', async () => {
        const demo = createDemoChain({ delayMs: 10 });
        const key = freshKey();
        demo.fund(key.address, 10000n);
        const { chain, calls } = spy(demo);
        const [a, same, other] = await Promise.all([takeHome({ chain, key, to, marker: 'home' }), takeHome({ chain, key, to, marker: 'home' }), takeHome({ chain, key, to: to2, marker: 'home' })]);
        expect(a.kind).toBe('done');
        expect(same).toEqual(a);
        expect(other).toMatchObject({ kind: 'error', code: 'rejected' });
        expect(calls.broadcast).toBe(1);
    });

    it('a sweep is signed from what the nodes agree on, not from one node\'s word', async () => {
        const demo = createDemoChain();
        const key = freshKey();
        demo.fund(key.address, 10000n);
        demo.fund(key.address, 546n, { token: true });
        const honest = await demo.read(key.address);
        let checked = 0;
        const chain: Chain = {
            ...spy(demo).chain,
            // One node's word: the token coin passed off as plain XEC.
            read: async () => ({ ...honest, coins: honest.coins.map(c => ({ ...c, token: false })) }),
            readChecked: async a => (checked++, demo.read(a)),
        };
        const r = await takeHome({ chain, key, to, marker: 'home' });
        // And the result says a token stays, though the screen (fed by the lying node) never saw one:
        // the caller must not treat the gift as gone and drop its link.
        expect(r).toMatchObject({ kind: 'done', sentSats: 10000n - 203n, tokenLeft: true });
        expect(checked).toBe(1);
        // The token coin was not spent.
        expect((await demo.read(key.address)).coins.map(c => c.token)).toEqual([true]);
    });

    it('a package is never swept to itself', async () => {
        const demo = createDemoChain();
        const key = freshKey();
        demo.fund(key.address, 10000n);
        const { chain, calls } = spy(demo);
        expect(await takeHome({ chain, key, to: key.address, marker: 'home' })).toMatchObject({ kind: 'error', code: 'bad-address' });
        expect(calls.broadcast).toBe(0);
    });

    it('a package already taken is lost without signing', async () => {
        const demo = createDemoChain();
        const key = freshKey();
        demo.fund(key.address, 10000n);
        demo.steal(key.address);
        const { chain, calls } = spy(demo);
        expect(await takeHome({ chain, key, to, marker: 'home' })).toEqual({ kind: 'lost' });
        expect(calls.broadcast).toBe(0);
    });

    it('an empty package is an error "nothing"', async () => {
        const { chain, calls } = spy(createDemoChain());
        expect(await takeHome({ chain, key: freshKey(), to, marker: 'home' })).toMatchObject({ kind: 'error', code: 'nothing' });
        expect(calls.broadcast).toBe(0);
    });

    it('sweep errors come back with their code and nothing is broadcast', async () => {
        const demo = createDemoChain();
        const key = freshKey();
        demo.fund(key.address, 700n);
        const a = spy(demo);
        expect(await takeHome({ chain: a.chain, key, to, marker: 'home' })).toMatchObject({ kind: 'error', code: 'dust' });
        expect(await takeHome({ chain: a.chain, key, to: 'etoken:qqq', marker: 'home' })).toMatchObject({ kind: 'error', code: 'bad-address' });
        expect(a.calls.broadcast).toBe(0);
    });

    it('onSent-is-called-once-a-node-has-accepted-the-tx, and-not-when-nothing-is-sent', async () => {
        const demo = createDemoChain({ delayMs: 5 });
        const key = freshKey();
        demo.fund(key.address, 10000n);
        const order: string[] = [];
        const s = spy(demo, {
            broadcast: async raw => {
                const id = await demo.broadcast(raw);
                order.push('accepted');
                return id;
            },
        });
        expect(await takeHome({ chain: s.chain, key, to, marker: 'home', onSent: () => order.push('onSent') })).toMatchObject({ kind: 'done' });
        expect(order).toEqual(['accepted', 'onSent']);
        // Asked again, nothing is sent.
        expect(await takeHome({ chain: s.chain, key, to, marker: 'home', onSent: () => order.push('again') })).toMatchObject({ kind: 'done' });
        expect(order).toEqual(['accepted', 'onSent']);
    });

    it('token dust does not freeze a package: the XEC goes, the token stays', async () => {
        const demo = createDemoChain({ delayMs: 5 });
        const key = freshKey();
        demo.fund(key.address, 10000n);
        demo.fund(key.address, 546n, { token: true });
        const { chain, raws } = spy(demo);
        expect(await takeHome({ chain, key, to, marker: 'home' })).toMatchObject({ kind: 'done', sentSats: 10000n - 203n });
        expect(raws.length).toBe(1);
        const after = await demo.read(key.address);
        expect(after).toMatchObject({ kind: 'taken', hasToken: true, xecSats: 0n });
        expect(after.coins.every(c => c.token)).toBe(true);
    });

    it('chain errors on read and broadcast come back as errors when nothing went out', async () => {
        const demo = createDemoChain();
        const key = freshKey();
        demo.fund(key.address, 10000n);
        const off = spy(demo, { read: () => Promise.reject(new ChainError('offline')) });
        expect(await takeHome({ chain: off.chain, key, to, marker: 'home' })).toMatchObject({ kind: 'error', code: 'offline' });

        const rej = spy(demo, { broadcast: () => Promise.reject(new ChainError('rejected')) });
        expect(await takeHome({ chain: rej.chain, key, to, marker: 'home' })).toMatchObject({ kind: 'error', code: 'rejected' });
        expect(rej.calls.settle).toBe(0);

        const k2 = freshKey();
        demo.fund(k2.address, 10000n);
        const weird = spy(demo, { broadcast: () => Promise.reject(new Error('socket hang up')) });
        expect(await takeHome({ chain: weird.chain, key: k2, to, marker: 'home' })).toMatchObject({ kind: 'error', code: 'offline' });
    });

    it('re-key carries the rekey marker', async () => {
        const demo = createDemoChain({ delayMs: 5 });
        const key = freshKey();
        demo.fund(key.address, 10000n);
        const fresh = freshKey();
        const { chain, raws } = spy(demo);
        expect((await takeHome({ chain, key, to: fresh.address, marker: 'rekey' })).kind).toBe('done');
        expect(raws[0]).toContain('6a0445474946020002');
        expect((await demo.read(fresh.address)).xecSats).toBe(10000n - 203n);
    });

    it('a-package-over-the-cap-can-still-be-taken-home', async () => {
        const demo = createDemoChain({ delayMs: 5 });
        const key = freshKey();
        demo.fund(key.address, CAP_SATS);
        demo.fund(key.address, CAP_SATS * 50n); // anyone can send more than the cap
        const r = await takeHome({ chain: demo, key, to, marker: 'home' });
        expect(r).toMatchObject({ kind: 'done', sentSats: CAP_SATS * 51n - (10n + 2n * 141n + 18n + 34n) });
    });

    it('any-holder-of-the-link-can-take-the-package-home-until-someone-does', async () => {
        const demo = createDemoChain({ delayMs: 5 });
        // The giver makes a link and funds it.
        const secret = newSecret();
        const link = encodeLink({ version: 1, secret, wrapper: 'lixi', wish: 'Chúc mừng' }, 'https://egift.cash');
        demo.fund(deriveKey(secret).address, 20000n);
        // Two people hold the same link; each derives the same key from it alone.
        const holder = () => deriveKey(decodeFragment(link.slice(link.indexOf('#')))!.secret);
        const alice = holder();
        const bob = holder();
        expect(alice.address).toBe(bob.address);
        expect((await demo.read(bob.address)).kind).toBe('funded'); // Bob could take it too, until...
        const aliceWallet = deriveKey(new Uint8Array(16).fill(240)).address;
        const bobWallet = deriveKey(new Uint8Array(16).fill(241)).address;
        expect(await takeHome({ chain: demo, key: alice, to: aliceWallet, marker: 'home' })).toMatchObject({ kind: 'done' });
        // ...someone does. From another browser (no shared memory), Bob is told he lost.
        forgetSweeps();
        expect(await takeHome({ chain: demo, key: bob, to: bobWallet, marker: 'home' })).toEqual({ kind: 'lost' });
        expect((await demo.read(aliceWallet)).xecSats).toBe(20000n - 203n);
        expect((await demo.read(bobWallet)).xecSats).toBe(0n);
    });

    it('a package with more coins than one sweep takes reports what is left, and a second round takes it', async () => {
        const demo = createDemoChain({ delayMs: 1 });
        const key = freshKey();
        for (let i = 0; i < 605; i++) demo.fund(key.address, 1000n + BigInt(i));
        const r1 = await takeHome({ chain: demo, key, to, marker: 'home' });
        expect(r1).toMatchObject({ kind: 'done', leftCoins: 5 });
        const st = await demo.read(key.address);
        expect(st.coins.length).toBe(5);
        expect(st.coins.every(c => c.sats < 1005n)).toBe(true); // the smallest wait
        const r2 = await takeHome({ chain: demo, key, to, marker: 'home' });
        expect(r2).toMatchObject({ kind: 'done', leftCoins: 0 });
        expect((await demo.read(key.address)).kind).toBe('taken');
    });
});
