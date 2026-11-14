import { describe, expect, it, vi } from 'vitest';
import type { WsMsgClient } from 'chronik-client';
import { CHRONIK_HOSTS, CHRONIK_OPERATORS, createChronikChain, mapBroadcastError, nextHostFirst } from './chronik';
import type { ChronikLike, ChronikTxLike, ChronikUtxoLike, ChronikWsConfigLike } from './chronik';
import { toHex } from 'ecash-lib';
import { deriveKey } from '../keys';
import { encodeLink } from '../link';
import { buildSweep } from '../tx';
import { ChainError } from '../types';

const key = deriveKey(new Uint8Array(16).fill(5));
const dest = deriveKey(new Uint8Array(16).fill(6));
const parentTxid = 'aa'.repeat(32);
const sweep = buildSweep({
    key,
    coins: [{ txid: parentTxid, outIdx: 1, sats: 10000n, token: false, final: true }],
    to: dest.address,
    marker: 'home',
});
const txid = sweep.txid;
const otherTxid = 'bb'.repeat(32);

interface FakeSocket {
    config: ChronikWsConfigLike;
    subs: string[];
    opened: boolean;
    closed: boolean;
    emit(msg: WsMsgClient): void;
}

function fake(init: { failOpen?: boolean; hangOpen?: boolean } = {}) {
    const st = {
        utxos: [] as ChronikUtxoLike[],
        history: { txs: [] as ChronikTxLike[], numTxs: 0 },
        txs: new Map<string, ChronikTxLike>(),
        broadcastError: undefined as unknown,
        readError: undefined as unknown,
    };
    const calls = { address: [] as string[], tx: [] as string[], broadcast: 0 };
    const sockets: FakeSocket[] = [];
    const client: ChronikLike = {
        address(a) {
            calls.address.push(a);
            return {
                utxos: async () => {
                    if (st.readError) throw st.readError;
                    return { utxos: st.utxos };
                },
                history: async () => st.history,
            };
        },
        async broadcastTx() {
            calls.broadcast++;
            if (st.broadcastError) throw st.broadcastError;
            return { txid };
        },
        async tx(id) {
            calls.tx.push(id);
            const t = st.txs.get(id);
            if (!t) throw new Error(`Failed getting /tx/${id}: 404: Transaction ${id} not found in the index`);
            return t;
        },
        ws(config) {
            const sock: FakeSocket & { waitForOpen(): Promise<void>; subscribeToAddress(a: string): void; close(): void } = {
                config,
                subs: [],
                opened: false,
                closed: false,
                emit: msg => config.onMessage?.(msg),
                async waitForOpen() {
                    if (init.hangOpen) return new Promise<void>(() => {});
                    if (init.failOpen) throw new Error('Error connecting to known Chronik websockets');
                    sock.opened = true;
                },
                subscribeToAddress(a) {
                    sock.subs.push(a);
                },
                close() {
                    sock.closed = true;
                },
            };
            sockets.push(sock);
            return sock;
        },
    };
    return { client, st, calls, sockets, chain: createChronikChain({ client }) };
}

const chronikTx = (id: string, isFinal: boolean, over: Partial<ChronikTxLike> = {}): ChronikTxLike => ({
    txid: id,
    isFinal,
    timeFirstSeen: 1_700_000_000,
    inputs: [{ prevOut: { txid: parentTxid, outIdx: 1 } }],
    outputs: [],
    ...over,
});
const txMsg = (id: string, msgType: 'TX_FINALIZED' | 'TX_INVALIDATED' | 'TX_ADDED_TO_MEMPOOL'): WsMsgClient => ({ type: 'Tx', msgType, txid: id });
const tick = (ms = 0): Promise<void> => new Promise(r => setTimeout(r, ms));

describe('CHRONIK_HOSTS / createChronikChain()', () => {
    it('lists the six hosts and builds without touching the network', () => {
        expect(CHRONIK_HOSTS).toEqual([
            'https://chronik1.ecashlive.net',
            'https://chronik.e.cash',
            'https://chronik-native1.fabien.cash',
            'https://chronik-native2.fabien.cash',
            'https://chronik-native3.fabien.cash',
            'https://chronik.pay2stay.com/xec',
        ]);
        const chain = createChronikChain();
        expect(typeof chain.read).toBe('function');
    });
});

describe('read', () => {
    it('maps utxos to coins', async () => {
        const f = fake();
        f.st.utxos = [
            { outpoint: { txid: '01'.repeat(32), outIdx: 0 }, sats: 5000n, isFinal: true },
            { outpoint: { txid: '02'.repeat(32), outIdx: 3 }, sats: 546n, isFinal: false, token: { tokenId: 'x' } },
        ];
        const s = await f.chain.read(key.address);
        expect(s).toEqual({
            kind: 'funded',
            coins: [
                { txid: '01'.repeat(32), outIdx: 0, sats: 5000n, token: false, final: true },
                { txid: '02'.repeat(32), outIdx: 3, sats: 546n, token: true, final: false },
            ],
            xecSats: 5000n,
            hasToken: true,
            allFinal: true, // only XEC coins count: the unconfirmed token coin is not swept
        });
    });

    it('token coins alone are taken, not funded, and stay listed', async () => {
        const f = fake();
        f.st.utxos = [{ outpoint: { txid: '02'.repeat(32), outIdx: 3 }, sats: 546n, isFinal: true, token: { tokenId: 'x' } }];
        f.st.history = { txs: [chronikTx(otherTxid, true, { timeFirstSeen: 1_750_000_000 })], numTxs: 3 };
        const s = await f.chain.read(key.address);
        expect(s.kind).toBe('taken');
        expect(s.xecSats).toBe(0n);
        expect(s.hasToken).toBe(true);
        expect(s.coins.length).toBe(1);
        expect(s.takenAt).toBe(1_750_000_000);
    });

    it('tells empty from taken by history, with takenAt from the newest tx', async () => {
        const f = fake();
        expect((await f.chain.read(key.address)).kind).toBe('empty');
        f.st.history = { txs: [chronikTx(otherTxid, true, { timeFirstSeen: 1_750_000_000 })], numTxs: 2 };
        expect(await f.chain.read(key.address)).toMatchObject({ kind: 'taken', takenAt: 1_750_000_000 });
        f.st.history = { txs: [chronikTx(otherTxid, true, { timeFirstSeen: 0, block: { timestamp: 1_760_000_000 } })], numTxs: 2 };
        expect(await f.chain.read(key.address)).toMatchObject({ kind: 'taken', takenAt: 1_760_000_000 });
        f.st.history = { txs: [chronikTx(otherTxid, false, { timeFirstSeen: 0 })], numTxs: 2 };
        const s = await f.chain.read(key.address);
        expect(s.kind).toBe('taken');
        expect('takenAt' in s).toBe(false);
    });

    it('validates the address before chronik sees it', async () => {
        const f = fake();
        const pkh = '00'.repeat(20);
        for (const bad of ['', 'etoken:' + key.address.slice(6), `ecash:${pkh}`, '../../tx/x', key.address + '/utxos']) {
            await expect(f.chain.read(bad)).rejects.toBeInstanceOf(ChainError);
        }
        expect(f.calls.address).toEqual([]);
        await f.chain.read(key.address.slice(6).toUpperCase());
        expect(f.calls.address[0]).toBe(key.address);
    });

    it('rejects with offline when no node answers', async () => {
        const f = fake();
        f.st.readError = new Error('Error connecting to known Chronik instances');
        await expect(f.chain.read(key.address)).rejects.toMatchObject({ code: 'offline' });
    });
});

describe('broadcast', () => {
    it('returns our txid', async () => {
        const f = fake();
        expect(await f.chain.broadcast(sweep.raw)).toBe(txid);
        expect(f.calls.broadcast).toBe(1);
    });

    it('maps failures to conflict / offline / rejected', async () => {
        const cases: [unknown, string][] = [
            [new Error('Failed getting /broadcast-tx: 400: Broadcast failed: Transaction rejected by mempool: txn-mempool-conflict'), 'conflict'],
            [new Error('Failed getting /broadcast-tx: 400: Broadcast failed: finalized-tx-conflict'), 'conflict'],
            [new Error('Failed getting /broadcast-tx: 400: Broadcast failed: bad-txns-inputs-missingorspent'), 'conflict'],
            [new Error('Failed getting /broadcast-tx: 400: Broadcast failed: Missing inputs'), 'conflict'],
            [new Error('Error connecting to known Chronik instances'), 'offline'],
            [Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }), 'offline'],
            [new Error('Failed getting /broadcast-tx: 400: Broadcast failed: min relay fee not met'), 'rejected'],
            [new Error('Failed getting /broadcast-tx: 400: Tx ... failed token checks'), 'rejected'],
            ['weird', 'rejected'],
        ];
        for (const [err, code] of cases) {
            expect(mapBroadcastError(err).code).toBe(code);
            const f = fake();
            f.st.broadcastError = err;
            await expect(f.chain.broadcast(sweep.raw)).rejects.toMatchObject({ code });
        }
    });

    it('refuses bytes that are not a transaction without calling the node', async () => {
        const f = fake();
        await expect(f.chain.broadcast(new Uint8Array([1, 2]))).rejects.toMatchObject({ code: 'rejected' });
        expect(f.calls.broadcast).toBe(0);
    });
});

describe('settle', () => {
    it('resolves final on TX_FINALIZED for our txid, after opening and subscribing once', async () => {
        const f = fake();
        f.st.txs.set(txid, chronikTx(txid, false));
        const p = f.chain.settle(txid, key.address, { timeoutMs: 2000, recheckMs: 1000 });
        await tick(5);
        const s = f.sockets[0]!;
        expect(s.opened).toBe(true);
        expect(s.subs).toEqual([key.address]);
        expect(s.config.autoReconnect).toBe(true);
        expect('onError' in s.config).toBe(false);
        s.emit(txMsg(otherTxid, 'TX_FINALIZED')); // someone else's: not ours
        s.emit(txMsg(txid, 'TX_ADDED_TO_MEMPOOL'));
        await tick(5);
        s.emit(txMsg(txid, 'TX_FINALIZED'));
        expect(await p).toBe('final');
        expect(s.closed).toBe(true);
        expect(f.sockets.length).toBe(1);
    });

    it('a finality the socket missed is seen within about a second, not at the slow recheck', async () => {
        vi.useFakeTimers();
        try {
            const f = fake({ hangOpen: true });
            f.st.txs.set(txid, chronikTx(txid, false));
            let got: string | null = null;
            void f.chain.settle(txid, key.address, { timeoutMs: 60000, recheckMs: 15000 }).then(v => (got = v));
            await vi.advanceTimersByTimeAsync(500);
            f.st.txs.set(txid, chronikTx(txid, true)); // settled; no message ever arrives
            await vi.advanceTimersByTimeAsync(600);
            expect(got).toBe('final');
        } finally {
            vi.useRealTimers();
        }
    });

    it('what one socket hears is believed everywhere: a watch that hears "finalized" settles the tx and makes its coins final', async () => {
        const f = fake({ hangOpen: true });
        f.st.txs.set(txid, chronikTx(txid, false));
        f.st.utxos = [{ outpoint: { txid, outIdx: 0 }, sats: 5000n, isFinal: false }];
        const stop = f.chain.watch(key.address, () => {});
        await tick(5);
        expect((await f.chain.read(key.address)).allFinal).toBe(false);
        const p = f.chain.settle(txid, key.address, { timeoutMs: 60000, recheckMs: 15000 });
        // The node's own answers still say "not final"; only the message says otherwise.
        f.sockets[0]!.emit(txMsg(txid, 'TX_FINALIZED'));
        expect(await p).toBe('final');
        expect((await f.chain.read(key.address)).allFinal).toBe(true);
        // And a later settle of the same tx needs no node at all.
        expect(await f.chain.settle(txid, key.address, { timeoutMs: 60000, recheckMs: 15000 })).toBe('final');
        stop();
    });

    it('resolves invalid on TX_INVALIDATED for our txid', async () => {
        const f = fake();
        f.st.txs.set(txid, chronikTx(txid, false));
        const p = f.chain.settle(txid, key.address, { timeoutMs: 2000, recheckMs: 1000 });
        await tick(5);
        f.sockets[0]!.emit(txMsg(otherTxid, 'TX_INVALIDATED'));
        f.sockets[0]!.emit(txMsg(txid, 'TX_INVALIDATED'));
        expect(await p).toBe('invalid');
        expect(f.sockets[0]!.closed).toBe(true);
    });

    it('the check right after subscribing closes the race (already final)', async () => {
        const f = fake();
        f.st.txs.set(txid, chronikTx(txid, true));
        expect(await f.chain.settle(txid, key.address, { timeoutMs: 2000, recheckMs: 1000 })).toBe('final');
    });

    it('a 404 after the tx was seen is still not invalid (failover may hop to a node that never saw it)', async () => {
        const f = fake();
        f.st.txs.set(txid, chronikTx(txid, false));
        f.st.txs.set(parentTxid, chronikTx(parentTxid, true, { outputs: [{}, { spentBy: { txid } }] }));
        const p = f.chain.settle(txid, key.address, { timeoutMs: 150, recheckMs: 20 });
        await tick(40);
        f.st.txs.delete(txid);
        expect(await p).toBe('unknown');
    });

    it('a-lost-race-is-reported-from-invalidation-not-from-a-timeout', async () => {
        // (1) TX_INVALIDATED for our txid, well before the timeout.
        const a = fake();
        const start = Date.now();
        const pa = a.chain.settle(txid, key.address, { timeoutMs: 60000, recheckMs: 15000, outpoints: sweep.spent });
        await tick(5);
        a.sockets[0]!.emit(txMsg(txid, 'TX_INVALIDATED'));
        expect(await pa).toBe('invalid');
        // (2) Our tx dropped before anyone looked (404 from the start), and
        // our input is spent by another txid: the given outpoints catch it.
        const b = fake();
        b.st.txs.set(parentTxid, chronikTx(parentTxid, true, { outputs: [{}, { spentBy: { txid: otherTxid } }] }));
        expect(await b.chain.settle(txid, key.address, { timeoutMs: 60000, recheckMs: 15000, outpoints: sweep.spent })).toBe('invalid');
        expect(Date.now() - start).toBeLessThan(2000);
        // (3) The timeout alone is never "invalid" (nor "final").
        const c = fake();
        expect(await c.chain.settle(txid, key.address, { timeoutMs: 60, recheckMs: 10, outpoints: sweep.spent })).toBe('unknown');
        // (4) Without outpoints and without ever seeing our tx, a spent parent cannot be tied to us: unknown.
        const d = fake();
        d.st.txs.set(parentTxid, chronikTx(parentTxid, true, { outputs: [{}, { spentBy: { txid: otherTxid } }] }));
        expect(await d.chain.settle(txid, key.address, { timeoutMs: 60, recheckMs: 10 })).toBe('unknown');
    });

    it('polls at once and is never blocked by a socket that hangs on open', async () => {
        const f = fake({ hangOpen: true });
        f.st.txs.set(txid, chronikTx(txid, true));
        const start = Date.now();
        expect(await f.chain.settle(txid, key.address, { timeoutMs: 2000, recheckMs: 1000 })).toBe('final');
        expect(Date.now() - start).toBeLessThan(500);
        expect(f.sockets[0]!.closed).toBe(true);
        // And with the tx only final later: the interval keeps polling.
        const g = fake({ hangOpen: true });
        g.st.txs.set(txid, chronikTx(txid, false));
        const p = g.chain.settle(txid, key.address, { timeoutMs: 2000, recheckMs: 15 });
        await tick(40);
        g.st.txs.set(txid, chronikTx(txid, true));
        expect(await p).toBe('final');
    });

    it('a 404 for a tx never seen is not a verdict: unknown at the timeout', async () => {
        const f = fake();
        const start = Date.now();
        expect(await f.chain.settle(txid, key.address, { timeoutMs: 80, recheckMs: 10 })).toBe('unknown');
        expect(Date.now() - start).toBeGreaterThanOrEqual(70);
        expect(f.calls.tx.length).toBeGreaterThan(1);
        expect(f.sockets[0]!.closed).toBe(true);
    });

    it('our input spent by a different txid is invalid', async () => {
        const f = fake();
        f.st.txs.set(txid, chronikTx(txid, false));
        f.st.txs.set(parentTxid, chronikTx(parentTxid, true, { outputs: [{}, { spentBy: { txid: otherTxid } }] }));
        expect(await f.chain.settle(txid, key.address, { timeoutMs: 2000, recheckMs: 1000 })).toBe('invalid');
    });

    it('a different tx at the address triggers an immediate check', async () => {
        const f = fake();
        f.st.txs.set(txid, chronikTx(txid, false));
        f.st.txs.set(parentTxid, chronikTx(parentTxid, true, { outputs: [{}, { spentBy: { txid } }] }));
        const p = f.chain.settle(txid, key.address, { timeoutMs: 3000, recheckMs: 2500 });
        await tick(10);
        f.st.txs.set(parentTxid, chronikTx(parentTxid, true, { outputs: [{}, { spentBy: { txid: otherTxid } }] }));
        f.sockets[0]!.emit(txMsg(otherTxid, 'TX_FINALIZED'));
        expect(await p).toBe('invalid');
    });

    it('times out as unknown, never final', async () => {
        const f = fake();
        f.st.txs.set(txid, chronikTx(txid, false));
        f.st.txs.set(parentTxid, chronikTx(parentTxid, true, { outputs: [{}, { spentBy: { txid } }] }));
        expect(await f.chain.settle(txid, key.address, { timeoutMs: 50, recheckMs: 10 })).toBe('unknown');
        expect(f.sockets[0]!.closed).toBe(true);
    });

    it('still polls when the socket cannot open', async () => {
        const f = fake({ failOpen: true });
        f.st.txs.set(txid, chronikTx(txid, true));
        expect(await f.chain.settle(txid, key.address, { timeoutMs: 2000, recheckMs: 10 })).toBe('final');
    });

    it('gates the txid before it reaches chronik.tx()', async () => {
        const f = fake();
        for (const bad of [txid.toUpperCase(), txid.slice(1), `${txid.slice(0, 60)}/../`, '', `${txid}x`]) {
            await expect(f.chain.settle(bad, key.address)).rejects.toBeInstanceOf(ChainError);
        }
        await expect(f.chain.settle(txid, 'etoken:' + key.address.slice(6))).rejects.toBeInstanceOf(ChainError);
        expect(f.calls.tx).toEqual([]);
        expect(f.sockets).toEqual([]);
    });
});

describe('watch', () => {
    it('calls onChange on tx messages and reconnects; stops after unsubscribe', async () => {
        const f = fake();
        let n = 0;
        const stop = f.chain.watch(key.address, () => n++);
        await tick(5);
        const s = f.sockets[0]!;
        expect(s.subs).toEqual([key.address]);
        expect(s.opened).toBe(true);
        s.emit(txMsg(otherTxid, 'TX_ADDED_TO_MEMPOOL'));
        s.emit({ type: 'Block', msgType: 'BLK_CONNECTED', blockHash: '00', blockHeight: 1, blockTimestamp: 1 });
        expect(n).toBe(1);
        // A second event right behind the first is not a second read at once: one more, a moment later.
        s.config.onReconnect?.(undefined as never);
        expect(n).toBe(1);
        await new Promise(r => setTimeout(r, 450));
        expect(n).toBe(2);
        stop();
        expect(s.closed).toBe(true);
        s.emit(txMsg(otherTxid, 'TX_FINALIZED'));
        expect(n).toBe(2);
        stop(); // idempotent
    });

    it('a message is followed by a few more reads, in case the first one came a moment early', async () => {
        vi.useFakeTimers();
        try {
            const f = fake();
            let n = 0;
            const stop = f.chain.watch(key.address, () => n++);
            await vi.advanceTimersByTimeAsync(5);
            f.sockets[0]!.emit(txMsg(otherTxid, 'TX_FINALIZED'));
            expect(n).toBe(1);
            await vi.advanceTimersByTimeAsync(900);
            expect(n).toBe(2);
            await vi.advanceTimersByTimeAsync(12000);
            expect(n).toBe(5);
            // A new message starts the follow-ups over; stopping ends them.
            f.sockets[0]!.emit(txMsg(otherTxid, 'TX_ADDED_TO_MEMPOOL'));
            expect(n).toBe(6);
            stop();
            await vi.advanceTimersByTimeAsync(20000);
            expect(n).toBe(6);
        } finally {
            vi.useRealTimers();
        }
    });

    it('a flood of messages is not a flood of reads, and a dead socket still gets a slow beat', async () => {
        vi.useFakeTimers();
        try {
            const f = fake();
            let n = 0;
            const stop = f.chain.watch(key.address, () => n++);
            await vi.advanceTimersByTimeAsync(5);
            for (let i = 0; i < 200; i++) f.sockets[0]!.emit(txMsg(otherTxid, 'TX_ADDED_TO_MEMPOOL'));
            expect(n).toBe(1);
            await vi.advanceTimersByTimeAsync(450);
            expect(n).toBe(2);
            // No message ever again: the address is still read on a slow beat.
            await vi.advanceTimersByTimeAsync(60_000);
            const quiet = n;
            await vi.advanceTimersByTimeAsync(51_000);
            expect(n).toBe(quiet + 2);
            stop();
            await vi.advanceTimersByTimeAsync(120_000);
            expect(n).toBe(quiet + 2);
        } finally {
            vi.useRealTimers();
        }
    });

    it('a bad address watches nothing', () => {
        const f = fake();
        const stop = f.chain.watch('nope', () => {});
        expect(f.sockets).toEqual([]);
        stop();
    });
});

describe('lookup', () => {
    it('final / seen / absent (404) / unknown (other errors, bad txid)', async () => {
        const f = fake();
        expect(await f.chain.lookup!(txid)).toBe('absent');
        f.st.txs.set(txid, chronikTx(txid, false));
        expect(await f.chain.lookup!(txid)).toBe('seen');
        f.st.txs.set(txid, chronikTx(txid, true));
        expect(await f.chain.lookup!(txid)).toBe('final');
        const g = fake();
        g.client.tx = async () => {
            throw new Error('Error connecting to known Chronik instances');
        };
        expect(await g.chain.lookup!(txid)).toBe('unknown');
        const before = f.calls.tx.length;
        expect(await f.chain.lookup!(txid.toUpperCase())).toBe('unknown');
        expect(await f.chain.lookup!('../x')).toBe('unknown');
        expect(f.calls.tx.length).toBe(before);
    });
});

describe('privacy', () => {
    it('holders: only scripts the node coloured with this token, with atoms, and no mint baton', async () => {
        const id = 'ab'.repeat(32);
        const f = fake();
        const asked: string[] = [];
        const A = '76a914' + '11'.repeat(20) + '88ac';
        const B = 'a914' + '22'.repeat(20) + '87';
        (f.client as { tokenId?: unknown }).tokenId = (t: string) => {
            asked.push(t);
            return {
                utxos: async () => ({
                    utxos: [
                        { script: A.toUpperCase(), token: { tokenId: id, atoms: 1n, isMintBaton: false } },
                        { script: A, token: { tokenId: id, atoms: 5n, isMintBaton: false } },
                        { script: B, token: { tokenId: id, atoms: 0n, isMintBaton: true } },
                        { script: '76a914' + '33'.repeat(20) + '88ac', token: { tokenId: 'cd'.repeat(32), atoms: 9n, isMintBaton: false } },
                        { script: '76a914' + '44'.repeat(20) + '88ac', token: { tokenId: id, atoms: 0n, isMintBaton: false } },
                        { script: '76a914' + '55'.repeat(20) + '88ac' },
                    ],
                }),
            };
        };
        const chain = createChronikChain({ client: f.client });
        expect(await chain.holders!(id)).toEqual([A]);
        expect(asked).toEqual([id]);
        // Not a token id: nothing is asked.
        expect(await chain.holders!('nope')).toEqual([]);
        expect(asked.length).toBe(1);
        // A node that cannot answer is an error, never "nobody holds it".
        const none = createChronikChain({ client: fake().client });
        await expect(none.holders!(id)).rejects.toBeInstanceOf(ChainError);
    });

    it('everSpent: true when a transaction spends from the package, and when the history is too long to read', async () => {
        const f = fake();
        const chain = createChronikChain({ client: f.client });
        const own = '76a914' + toHex(key.pkh) + '88ac';
        const tx = (script: string): ChronikTxLike => ({ txid, isFinal: true, timeFirstSeen: 1, inputs: [{ prevOut: { txid, outIdx: 0 }, outputScript: script }], outputs: [] });
        f.st.history = { txs: [tx('76a914' + '11'.repeat(20) + '88ac')], numTxs: 1 };
        expect(await chain.everSpent!(key.address)).toBe(false);
        f.st.history = { txs: [tx('76a914' + '11'.repeat(20) + '88ac'), tx(own.toUpperCase())], numTxs: 2 };
        expect(await chain.everSpent!(key.address)).toBe(true);
        // More history than is read through: the safe answer.
        f.st.history = { txs: [tx('76a914' + '11'.repeat(20) + '88ac')], numTxs: 5000 };
        expect(await chain.everSpent!(key.address)).toBe(true);
        await expect(chain.everSpent!('nope')).rejects.toBeInstanceOf(ChainError);
    });

    it('validate: a verdict is clean only when every field says so in so many words', async () => {
        const f = fake();
        const id = 'ab'.repeat(32);
        const entry = { tokenId: id, txType: 'SEND', isInvalid: false, burnSummary: '', failedColorings: [], actualBurnAtoms: 0n, burnsMintBatons: false };
        const token = { tokenId: id, tokenType: { protocol: 'ALP', type: 'ALP_TOKEN_TYPE_STANDARD', number: 0 }, atoms: 5n, isMintBaton: false };
        let answer: unknown = { tokenStatus: 'TOKEN_STATUS_NORMAL', tokenEntries: [entry], tokenFailedParsings: [], outputs: [{}, { token }, {}] };
        (f.client as { validateRawTx?: unknown }).validateRawTx = async () => answer;
        const chain = createChronikChain({ client: f.client });
        expect(await chain.validate!(new Uint8Array(1))).toEqual({
            normal: true,
            failedParsings: 0,
            entries: [{ tokenId: id, send: true, clean: true }],
            outputs: [null, { tokenId: id, atoms: 5n, baton: false }, null],
        });
        for (const bad of [{ isInvalid: true }, { burnSummary: 'burn' }, { failedColorings: [{}] }, { actualBurnAtoms: 1n }, { burnsMintBatons: true }, { actualBurnAtoms: undefined }]) {
            answer = { tokenStatus: 'TOKEN_STATUS_NORMAL', tokenEntries: [{ ...entry, ...bad }], tokenFailedParsings: [], outputs: [] };
            expect((await chain.validate!(new Uint8Array(1))).entries[0]!.clean).toBe(false);
        }
        answer = { tokenStatus: 'TOKEN_STATUS_NON_TOKEN', tokenEntries: [], outputs: [{ token: { junk: 1 } }] };
        const v = await chain.validate!(new Uint8Array(1));
        expect(v.normal).toBe(false);
        expect(v.failedParsings).toBe(1); // a missing list is not "none"
        expect(v.outputs[0]).toMatchObject({ baton: true });
        // A node that cannot be asked is an error, never a pass.
        await expect(createChronikChain({ client: fake().client }).validate!(new Uint8Array(1))).rejects.toBeInstanceOf(ChainError);
    });

    it('no-request-carries-the-link-or-a-key', async () => {
        const secret = new Uint8Array(16).fill(5); // the secret behind `key`
        const link = encodeLink({ version: 1, secret, wrapper: 'lixi', wish: 'hi' }, 'https://egift.cash');
        const fragment = link.slice(link.indexOf('#') + 1);
        const secretB64 = fragment.split('.')[2]!;
        const forbidden = [toHex(secret), secretB64, toHex(key.sk), fragment, link];

        const f = fake();
        f.st.utxos = [{ outpoint: { txid: parentTxid, outIdx: 1 }, sats: 10000n, isFinal: true }];
        f.st.txs.set(parentTxid, chronikTx(parentTxid, true, { outputs: [{}, { spentBy: { txid } }] }));
        const seen: string[] = [];
        const record = (v: unknown): void => {
            if (typeof v === 'string') seen.push(v);
            else if (v instanceof Uint8Array) {
                seen.push(toHex(v));
                seen.push(String.fromCharCode(...v));
            } else if (typeof v === 'bigint' || typeof v === 'number') seen.push(String(v));
            else if (Array.isArray(v)) v.forEach(record);
            else if (v !== null && typeof v === 'object') Object.values(v).forEach(record);
        };
        const spyFn = <T extends object>(obj: T): T =>
            new Proxy(obj, {
                get(target, prop, recv) {
                    const val = Reflect.get(target, prop, recv);
                    if (typeof val !== 'function') return val;
                    return (...args: unknown[]) => {
                        args.forEach(record);
                        const out = val.apply(target, args);
                        return out !== null && typeof out === 'object' && !(out instanceof Promise) ? spyFn(out) : out;
                    };
                },
            });
        const chain = createChronikChain({ client: spyFn(f.client) });

        await chain.read(key.address);
        await chain.broadcast(sweep.raw);
        f.st.txs.set(txid, chronikTx(txid, false));
        const p = chain.settle(txid, key.address, { timeoutMs: 100, recheckMs: 20, outpoints: sweep.spent });
        await tick(5);
        f.sockets[0]!.emit(txMsg(txid, 'TX_FINALIZED'));
        await p;
        await chain.lookup!(txid);
        const stop = chain.watch(key.address, () => {});
        await tick(5);
        stop();

        expect(seen.length).toBeGreaterThan(5);
        expect(seen.some(s => s.includes(key.address))).toBe(true); // the recorder works
        for (const s of seen) for (const bad of forbidden) expect(s.includes(bad), `request carried ${bad}`).toBe(false);
    });
});

describe('a second opinion before anything is signed', () => {
    const coin = (over: Partial<ChronikUtxoLike> = {}): ChronikUtxoLike => ({ outpoint: { txid: '01'.repeat(32), outIdx: 0 }, sats: 5000n, isFinal: true, ...over });
    const tokenCoin = (): ChronikUtxoLike => ({
        outpoint: { txid: '02'.repeat(32), outIdx: 1 },
        sats: 546n,
        isFinal: true,
        token: { tokenId: 'a1'.repeat(32), tokenType: { protocol: 'ALP', type: 'ALP_TOKEN_TYPE_STANDARD' }, atoms: 500n, isMintBaton: false },
    });
    const operators = (n: number) => Array.from({ length: n }, () => fake());

    it('every host belongs to exactly one operator, and there are enough operators to outvote one', () => {
        expect(CHRONIK_OPERATORS.flat().sort()).toEqual([...CHRONIK_HOSTS].sort());
        expect(CHRONIK_OPERATORS.length).toBeGreaterThanOrEqual(3);
    });

    it('readChecked: the answer most operators give, and a liar is outvoted', async () => {
        const ops = operators(4);
        for (const o of ops) o.st.utxos = [coin(), tokenCoin()];
        // The first operator (the one asked first for everything else) hides that the second coin carries a token.
        ops[0]!.st.utxos = [coin(), { ...tokenCoin(), token: undefined }];
        const chain = createChronikChain({ client: ops[0]!.client, peers: ops.map(o => o.client), agree: 2 });
        // The plain read believes the first node...
        expect((await chain.read(key.address)).coins.every(c => !c.token)).toBe(true);
        // ...what a sweep is signed from does not.
        const s = await chain.readChecked!(key.address);
        expect(s.coins.map(c => c.token)).toEqual([false, true]);
        expect(s.coins[1]!.tokenInfo).toMatchObject({ tokenId: 'a1'.repeat(32), atoms: 500n });
    });

    it('readChecked: two answers that differ, or one answer alone, is no answer', async () => {
        const two = operators(2);
        two[0]!.st.utxos = [coin()];
        two[1]!.st.utxos = [coin({ sats: 6000n })];
        await expect(createChronikChain({ client: two[0]!.client, peers: two.map(o => o.client), agree: 2 }).readChecked!(key.address)).rejects.toMatchObject({ code: 'disagree' });
        const lonely = operators(3);
        lonely[0]!.st.utxos = [coin()];
        lonely[1]!.st.readError = Object.assign(new Error('down'), { code: 'ECONNREFUSED' });
        lonely[2]!.st.readError = Object.assign(new Error('down'), { code: 'ECONNREFUSED' });
        await expect(createChronikChain({ client: lonely[0]!.client, peers: lonely.map(o => o.client), agree: 2 }).readChecked!(key.address)).rejects.toMatchObject({ code: 'offline' });
    }, 10_000);

    it('a host that stalls is put last: the next call starts with the next host', () => {
        expect(nextHostFirst(['a', 'b', 'c'])).toEqual(['b', 'c', 'a']);
        expect(nextHostFirst(['a'])).toEqual(['a']);
        expect(nextHostFirst([])).toEqual([]);
    });

    it('by default one trusted node is enough: what is signed from is what the connected node says', async () => {
        const one = operators(1);
        one[0]!.st.utxos = [coin()];
        const s = await createChronikChain({ client: one[0]!.client, peers: one.map(o => o.client) }).readChecked!(key.address);
        expect(s.kind).toBe('funded');
        expect(s.coins).toHaveLength(1);
    });

    it('readChecked: finality and height may lag on one node without breaking the agreement', async () => {
        const ops = operators(3);
        ops[0]!.st.utxos = [coin({ isFinal: false, blockHeight: -1 })];
        ops[1]!.st.utxos = [coin({ isFinal: true, blockHeight: 900 })];
        ops[2]!.st.utxos = [coin({ isFinal: true, blockHeight: 900 })];
        const s = await createChronikChain({ client: ops[0]!.client, peers: ops.map(o => o.client), agree: 2 }).readChecked!(key.address);
        expect(s.kind).toBe('funded');
        expect(s.xecSats).toBe(5000n);
    });

    it('validate: the node that would relay a burn is not the only one asked', async () => {
        const clean = { tokenStatus: 'TOKEN_STATUS_NORMAL', tokenEntries: [{ tokenId: 'a1'.repeat(32), txType: 'SEND', isInvalid: false, burnSummary: '', failedColorings: [], actualBurnAtoms: 0n, burnsMintBatons: false }], tokenFailedParsings: [], outputs: [{}, {}] };
        const burning = { ...clean, tokenEntries: [{ ...clean.tokenEntries[0]!, burnSummary: 'Unexpected burn', actualBurnAtoms: 500n }] };
        const ops = operators(3);
        // The first says "clean"; the two others see the burn.
        (ops[0]!.client as { validateRawTx?: unknown }).validateRawTx = async () => clean;
        (ops[1]!.client as { validateRawTx?: unknown }).validateRawTx = async () => burning;
        (ops[2]!.client as { validateRawTx?: unknown }).validateRawTx = async () => burning;
        const v = await createChronikChain({ client: ops[0]!.client, peers: ops.map(o => o.client), agree: 2 }).validate!(new Uint8Array(1));
        expect(v.entries[0]!.clean).toBe(false);
        // One voice alone is no verdict.
        const solo = operators(2);
        (solo[0]!.client as { validateRawTx?: unknown }).validateRawTx = async () => clean;
        await expect(createChronikChain({ client: solo[0]!.client, peers: solo.map(o => o.client), agree: 2 }).validate!(new Uint8Array(1))).rejects.toBeInstanceOf(ChainError);
    });

    it('a node that accepts a call and never answers does not hang the page', async () => {
        vi.useFakeTimers();
        try {
            const f = fake();
            f.client.address = () => ({ utxos: () => new Promise(() => {}), history: async () => f.st.history });
            const chain = createChronikChain({ client: f.client });
            let err: unknown;
            void chain.read(key.address).catch(e => (err = e));
            await vi.advanceTimersByTimeAsync(10_500);
            expect(err).toBeInstanceOf(ChainError);
            expect((err as ChainError).code).toBe('offline');
        } finally {
            vi.useRealTimers();
        }
    });
});

