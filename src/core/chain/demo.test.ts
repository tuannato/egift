import { describe, expect, it } from 'vitest';
import { createDemoChain } from './demo';
import { deriveKey } from '../keys';
import { buildSweep } from '../tx';
import { ChainError } from '../types';

const key = deriveKey(new Uint8Array(16).fill(1));
const dest = deriveKey(new Uint8Array(16).fill(2));

const tick = (ms = 0): Promise<void> => new Promise(r => setTimeout(r, ms));

describe('createDemoChain', () => {
    it('reads empty, then funded, then taken after a sweep', async () => {
        const chain = createDemoChain({ delayMs: 5 });
        expect((await chain.read(key.address)).kind).toBe('empty');
        chain.fund(key.address, 5000n);
        chain.fund(key.address, 3000n, { final: false });
        const funded = await chain.read(key.address);
        expect(funded.kind).toBe('funded');
        expect(funded.coins.length).toBe(2);
        expect(funded.xecSats).toBe(8000n);
        expect(funded.allFinal).toBe(false);
        expect(funded.hasToken).toBe(false);

        const sweep = buildSweep({ key, coins: funded.coins, to: dest.address, marker: 'home' });
        const txid = await chain.broadcast(sweep.raw);
        expect(txid).toBe(sweep.txid);
        const taken = await chain.read(key.address);
        expect(taken.kind).toBe('taken');
        expect(taken.takenAt).toBeTypeOf('number');
        expect(Math.abs(taken.takenAt! - Date.now() / 1000)).toBeLessThan(5);
        // The destination got the coin, unconfirmed until the verdict.
        expect((await chain.read(dest.address)).xecSats).toBe(sweep.sentSats);
        expect(await chain.settle(txid, key.address)).toBe('final');
        expect((await chain.read(dest.address)).allFinal).toBe(true);
    });

    it('a second broadcast of spent coins is a conflict', async () => {
        const chain = createDemoChain({ delayMs: 5 });
        chain.fund(key.address, 5000n);
        const s = buildSweep({ key, coins: (await chain.read(key.address)).coins, to: dest.address, marker: null });
        await chain.broadcast(s.raw);
        await expect(chain.broadcast(s.raw)).rejects.toMatchObject({ code: 'conflict' });
        await expect(chain.broadcast(new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(ChainError);
    });

    it('steal() empties the package', async () => {
        const chain = createDemoChain();
        chain.fund(key.address, 5000n);
        chain.steal(key.address);
        const st = await chain.read(key.address);
        expect(st.kind).toBe('taken');
        expect(st.takenAt).toBeTypeOf('number');
    });

    it('nextVerdict: conflict, invalid, unknown', async () => {
        const chain = createDemoChain({ delayMs: 5 });
        chain.fund(key.address, 5000n);
        let coins = (await chain.read(key.address)).coins;
        chain.nextVerdict('conflict');
        await expect(chain.broadcast(buildSweep({ key, coins, to: dest.address, marker: null }).raw)).rejects.toMatchObject({ code: 'conflict' });
        expect((await chain.read(key.address)).kind).toBe('taken');

        chain.fund(key.address, 6000n);
        coins = (await chain.read(key.address)).coins;
        chain.nextVerdict('invalid', 5);
        const bad = await chain.broadcast(buildSweep({ key, coins, to: dest.address, marker: null }).raw);
        expect(await chain.settle(bad, key.address)).toBe('invalid');
        expect((await chain.read(key.address)).kind).toBe('taken');
        // Our output never happened.
        expect((await chain.read(dest.address)).xecSats).toBe(0n);

        chain.fund(key.address, 7000n);
        coins = (await chain.read(key.address)).coins;
        chain.nextVerdict('unknown');
        const u = await chain.broadcast(buildSweep({ key, coins, to: dest.address, marker: null }).raw);
        expect(await chain.settle(u, key.address, { timeoutMs: 20 })).toBe('unknown');
    });

    it('watch fires asynchronously on fund, steal, broadcast and settlement, and unsubscribes', async () => {
        const chain = createDemoChain({ delayMs: 5 });
        let n = 0;
        const stop = chain.watch(key.address, () => n++);
        chain.fund(key.address, 5000n);
        expect(n).toBe(0); // not synchronous
        await tick();
        expect(n).toBeGreaterThan(0);

        let d = 0;
        chain.watch(dest.address, () => d++);
        const s = buildSweep({ key, coins: (await chain.read(key.address)).coins, to: dest.address, marker: null });
        const before = n;
        await chain.broadcast(s.raw);
        await tick();
        expect(n).toBeGreaterThan(before);
        const dBefore = d;
        await chain.settle(s.txid, key.address);
        await tick();
        expect(d).toBeGreaterThan(dBefore);

        stop();
        const after = n;
        chain.fund(key.address, 5000n);
        chain.steal(key.address);
        await tick();
        expect(n).toBe(after);
    });

    it('lookup, token coins, missing-parent and offline-after-send', async () => {
        const chain = createDemoChain({ delayMs: 5 });
        chain.fund(key.address, 5000n);
        chain.fund(key.address, 546n, { token: true });
        let st = await chain.read(key.address);
        expect(st).toMatchObject({ kind: 'funded', xecSats: 5000n, hasToken: true });
        const s = buildSweep({ key, coins: st.coins, to: dest.address, marker: null });
        expect(await chain.lookup!(s.txid)).toBe('absent');

        chain.nextVerdict('missing-parent');
        await expect(chain.broadcast(s.raw)).rejects.toMatchObject({ code: 'conflict' });
        expect((await chain.read(key.address)).kind).toBe('funded'); // coins still there
        expect(await chain.lookup!(s.txid)).toBe('absent');

        chain.nextVerdict('offline-after-send', 5);
        await expect(chain.broadcast(s.raw)).rejects.toMatchObject({ code: 'offline' });
        expect(await chain.lookup!(s.txid)).toBe('seen'); // it went through anyway
        st = await chain.read(key.address);
        expect(st.kind).toBe('taken'); // XEC gone; the token coin stays
        expect(st.hasToken).toBe(true);
        expect(st.coins.length).toBe(1);
        expect(await chain.settle(s.txid, key.address)).toBe('final');
        expect(await chain.lookup!(s.txid)).toBe('final');
    });

    it('settle with outpoints sees a steal as a lost race, even later', async () => {
        const chain = createDemoChain({ delayMs: 5 });
        chain.fund(key.address, 5000n);
        const s = buildSweep({ key, coins: (await chain.read(key.address)).coins, to: dest.address, marker: null });
        const p = chain.settle(s.txid, key.address, { timeoutMs: 2000, outpoints: s.spent });
        await tick(5);
        chain.steal(key.address);
        expect(await p).toBe('invalid');
        expect(await chain.settle(s.txid, key.address, { timeoutMs: 20, outpoints: s.spent })).toBe('invalid');
        expect(await chain.settle(s.txid, key.address, { timeoutMs: 20 })).toBe('unknown');
    });
});

