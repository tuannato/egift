import { Address, Tx, parseAlp, parseEmppScript, parseSlp, sha256d, strToBytes, toHexRev } from 'ecash-lib';
import { ChainError } from '../types';
import type { Chain, Coin, CoinToken, PackageState, Settlement, TokenMeta, TokenVerdict, TxDetail, TxLookup } from '../types';

/**
 * - `final` / `invalid`: accepted, then settles so after the delay.
 * - `unknown`: accepted, never settles.
 * - `conflict`: someone else spent the coins first; broadcast throws `conflict`.
 * - `missing-parent`: the node has not seen the funding tx yet; broadcast
 *   throws `conflict` but the coins are still there.
 * - `offline-after-send`: the node accepted the tx, then the answer was lost;
 *   broadcast throws `offline`. Settles `final` after the delay.
 */
type Verdict = 'final' | 'invalid' | 'unknown' | 'conflict' | 'missing-parent' | 'offline-after-send';

/** An in-memory chain for development and tests. Never part of a production build path. */
export interface DemoChain extends Chain {
    /** Put `sats` at `address` as one coin. `final` defaults to true; `token: true` makes it a token coin. */
    fund(address: string, sats: bigint, opts?: { final?: boolean; token?: boolean; tokenInfo?: CoinToken; tx?: TxDetail; height?: number }): void;
    /** Say what a token calls itself. */
    describe(tokenId: string, meta: TokenMeta): void;
    /** Make `script` (lowercase hex) a holder of the token, or take it away again (`false`). */
    grant(tokenId: string, script: string, holds?: boolean): void;
    /** Empty the address as if someone else took the package. */
    steal(address: string): void;
    /** Make the next broadcast end as given. Default: `final` after `delayMs` (default 1200). */
    nextVerdict(v: Verdict, delayMs?: number): void;
}

interface Box {
    coins: Coin[];
    /** Ever received anything: tells `taken` from `empty`. */
    touched: boolean;
    takenAt?: number;
}

interface TxRecord {
    status: 'pending' | 'final' | 'invalid';
    /** Coins this tx created, so an invalidation can remove them again. */
    created: { address: string; outpoint: string }[];
    /** Outpoints this tx spent. */
    spent: string[];
    waiters: (() => void)[];
}

/** The pretend txid of "someone else". */
const THIEF = 'f'.repeat(64);

const now = (): number => Math.floor(Date.now() / 1000);

/**
 * `createDemoChain({ delayMs })`: `delayMs` is the default time from a
 * broadcast to its verdict (1200 ms), short in tests.
 */
export function createDemoChain(opts: { delayMs?: number } = {}): DemoChain {
    const defaultDelay = opts.delayMs ?? 1200;
    const boxes = new Map<string, Box>();
    /** outpoint `txid:outIdx` -> address holding it, for every unspent coin. */
    const utxoOwner = new Map<string, string>();
    const txs = new Map<string, TxRecord>();
    const watchers = new Map<string, Set<() => void>>();
    const queued: { v: Verdict; delayMs: number }[] = [];
    let fundCounter = 0;
    const details = new Map<string, TxDetail>();
    const held = new Map<string, Set<string>>();
    /** Addresses something was ever spent from. */
    const spentFrom = new Set<string>();
    const scriptOf = (address: string): string => {
        try {
            return [...Address.fromCashAddress(address).toScript().bytecode].map(b => b.toString(16).padStart(2, '0')).join('');
        } catch {
            return '';
        }
    };
    const metas = new Map<string, TokenMeta>();
    const TYPE: Record<string, number> = { alp: 0, slp: 1, nft: 65 };
    const coinAt = (outpoint: string): Coin | undefined => {
        const owner = utxoOwner.get(outpoint);
        return owner === undefined ? undefined : box(owner).coins.find(c => `${c.txid}:${c.outIdx}` === outpoint);
    };
    const outpointsOf = (tx: Tx): string[] => tx.inputs.map(i => `${typeof i.prevOut.txid === 'string' ? i.prevOut.txid : toHexRev(i.prevOut.txid)}:${i.prevOut.outIdx}`);
    /**
     * What the transaction does to tokens, by the rule that matters here: a
     * token coin spent without a SEND naming its token and carrying every
     * atom on is burned. Null when it spends no token coin at all.
     */
    const colour = (tx: Tx): (TokenVerdict & { kind?: CoinToken['kind'] }) | null => {
        const ins = outpointsOf(tx)
            .map(coinAt)
            .filter((c): c is Coin => c !== undefined && c.token);
        if (ins.length === 0) return null;
        let send: { type: number; tokenId: string; amounts: bigint[] } | null = null;
        try {
            const script = tx.outputs[0]!.script;
            const pushes = parseEmppScript(script);
            if (pushes !== undefined) {
                const d = pushes.map(x => parseAlp(x)).filter(x => x !== undefined);
                if (d.length === 1 && d[0]!.txType === 'SEND') send = { type: d[0]!.tokenType, tokenId: d[0]!.tokenId, amounts: d[0]!.sendAtomsArray };
            } else {
                const d = parseSlp(script);
                if (d !== undefined && d.txType === 'SEND') send = { type: d.tokenType, tokenId: d.tokenId, amounts: d.sendAtomsArray };
            }
        } catch {
            send = null;
        }
        const total = ins.reduce((s, c) => s + (c.tokenInfo?.atoms ?? 0n), 0n);
        const kind = ins[0]!.tokenInfo?.kind;
        const clean =
            send !== null &&
            ins.every(c => c.tokenInfo !== undefined && c.tokenInfo.tokenId === send!.tokenId && !c.tokenInfo.baton && c.tokenInfo.kind === kind && TYPE[c.tokenInfo.kind] === send!.type) &&
            send.amounts.reduce((s, a) => s + a, 0n) === total &&
            send.amounts.length < tx.outputs.length;
        return {
            normal: clean,
            failedParsings: send === null ? 1 : 0,
            entries: [{ tokenId: send?.tokenId ?? '', send: send !== null, clean }],
            outputs: tx.outputs.map((_, i) => (clean && i >= 1 && i <= send!.amounts.length ? { tokenId: send!.tokenId, atoms: send!.amounts[i - 1]!, baton: false } : null)),
            ...(kind === undefined ? {} : { kind }),
        };
    };

    const key = (a: string): string => {
        const s = a.trim().toLowerCase();
        return s.includes(':') ? s : `ecash:${s}`;
    };
    const box = (a: string): Box => {
        const k = key(a);
        let b = boxes.get(k);
        if (!b) {
            b = { coins: [], touched: false };
            boxes.set(k, b);
        }
        return b;
    };
    const notify = (a: string): void => {
        const set = watchers.get(key(a));
        if (!set) return;
        for (const fn of [...set]) {
            setTimeout(() => {
                if (set.has(fn)) fn();
            }, 0);
        }
    };
    const addCoin = (address: string, coin: Coin): void => {
        const b = box(address);
        b.coins.push(coin);
        b.touched = true;
        delete b.takenAt;
        utxoOwner.set(`${coin.txid}:${coin.outIdx}`, key(address));
    };
    /** outpoint -> txid that spent it (THIEF for someone else's spend). */
    const spentBy = new Map<string, string>();
    /** Pending settles that watch their outpoints. */
    const spendChecks = new Set<() => void>();
    const removeCoin = (outpoint: string, by: string): void => {
        const owner = utxoOwner.get(outpoint);
        if (owner === undefined) return;
        utxoOwner.delete(outpoint);
        spentBy.set(outpoint, by);
        for (const c of [...spendChecks]) c();
        const b = box(owner);
        b.coins = b.coins.filter(c => `${c.txid}:${c.outIdx}` !== outpoint);
        if (!b.coins.some(c => !c.token)) b.takenAt = now();
        notify(owner);
    };
    const emptyBox = (address: string): void => {
        const b = box(address);
        spentFrom.add(key(address));
        for (const c of [...b.coins]) if (!c.token) removeCoin(`${c.txid}:${c.outIdx}`, THIEF);
        b.takenAt = now();
        notify(address);
    };
    const settleTx = (txid: string, status: 'final' | 'invalid'): void => {
        const rec = txs.get(txid);
        if (!rec || rec.status !== 'pending') return;
        rec.status = status;
        // An invalidated sweep lost to someone else's spend of the same coins.
        if (status === 'invalid') for (const op of rec.spent) spentBy.set(op, THIEF);
        for (const { address, outpoint } of rec.created) {
            if (status === 'invalid') {
                removeCoin(outpoint, THIEF);
            } else {
                const b = box(address);
                b.coins = b.coins.map(c => (`${c.txid}:${c.outIdx}` === outpoint ? { ...c, final: true } : c));
                notify(address);
            }
        }
        for (const w of rec.waiters.splice(0)) w();
    };

    const chain: DemoChain = {
        fund(address, sats, o = {}) {
            if (sats <= 0n) throw new Error('Funding must be positive');
            const txid = toHexRev(sha256d(strToBytes(`demo-fund-${fundCounter++}`)));
            addCoin(address, { txid, outIdx: 0, sats, token: o.token ?? o.tokenInfo !== undefined, final: o.final ?? true, ...(o.tokenInfo === undefined ? {} : { tokenInfo: o.tokenInfo }), ...(o.height === undefined ? {} : { height: o.height }) });
            // What the funding transaction looked like, when the caller says (a stamped funding, for instance).
            details.set(txid, o.tx ?? { inputs: ['76a914' + '00'.repeat(20) + '88ac'], outputs: [{ sats, script: '' }] });
            notify(address);
        },

        grant(tokenId, script, holds = true) {
            const set = held.get(tokenId) ?? new Set<string>();
            if (holds) set.add(script.toLowerCase());
            else set.delete(script.toLowerCase());
            held.set(tokenId, set);
        },

        async holders(tokenId): Promise<readonly string[]> {
            return [...(held.get(tokenId) ?? [])];
        },

        describe(tokenId, meta) {
            metas.set(tokenId, meta);
        },

        async everSpent(address): Promise<boolean> {
            return spentFrom.has(key(address));
        },

        async tokenMeta(tokenId): Promise<TokenMeta | null> {
            return metas.get(tokenId) ?? null;
        },

        async validate(rawTx): Promise<TokenVerdict> {
            let tx: Tx;
            try {
                tx = Tx.deser(rawTx);
            } catch {
                throw new ChainError('rejected', 'Not a transaction');
            }
            return colour(tx) ?? { normal: false, failedParsings: 0, entries: [], outputs: tx.outputs.map(() => null) };
        },

        steal(address) {
            emptyBox(address);
        },

        nextVerdict(v, delayMs) {
            queued.push({ v, delayMs: delayMs ?? defaultDelay });
        },

        async read(address): Promise<PackageState> {
            const b = boxes.get(key(address));
            if (!b || !b.touched) {
                return { kind: 'empty', coins: [], xecSats: 0n, hasToken: false, allFinal: true };
            }
            const coins = b.coins.map(c => ({ ...c }));
            // Same rule as chronik: no XEC coin left means taken, token dust or not.
            if (!coins.some(c => !c.token)) {
                const state: PackageState = { kind: 'taken', coins, xecSats: 0n, hasToken: coins.length > 0, allFinal: true };
                return b.takenAt === undefined ? state : { ...state, takenAt: b.takenAt };
            }
            return {
                kind: 'funded',
                coins,
                xecSats: coins.filter(c => !c.token).reduce((s, c) => s + c.sats, 0n),
                hasToken: coins.some(c => c.token),
                allFinal: coins.filter(c => !c.token).every(c => c.final),
            };
        },

        async broadcast(rawTx): Promise<string> {
            let tx: Tx;
            try {
                tx = Tx.deser(rawTx);
            } catch {
                throw new ChainError('rejected', 'Not a transaction');
            }
            const txid = tx.txid();
            const spent = outpointsOf(tx);
            // Like the real node: a transaction that would burn a token is refused, not sent.
            const tokens = colour(tx);
            if (tokens !== null && !tokens.normal) throw new ChainError('rejected', 'The transaction would burn a token');
            const plan = queued.shift() ?? { v: 'final' as Verdict, delayMs: defaultDelay };
            if (plan.v === 'conflict') {
                // Someone else got there first: their spend empties the package.
                for (const op of spent) removeCoin(op, THIEF);
                throw new ChainError('conflict', 'Coins already spent');
            }
            if (plan.v === 'missing-parent') throw new ChainError('conflict', 'Missing inputs');
            if (spent.length === 0 || spent.some(op => !utxoOwner.has(op))) {
                throw new ChainError('conflict', 'Coins already spent');
            }
            const owners = spent.map(op => utxoOwner.get(op) ?? '');
            for (const a of owners) if (a !== '') spentFrom.add(a);
            details.set(txid, { inputs: owners.map(scriptOf), outputs: tx.outputs.map(o => ({ sats: o.sats, script: [...o.script.bytecode].map(b => b.toString(16).padStart(2, '0')).join('') })) });
            for (const op of spent) removeCoin(op, txid);
            const rec: TxRecord = { status: 'pending', created: [], spent, waiters: [] };
            txs.set(txid, rec);
            tx.outputs.forEach((o, outIdx) => {
                let address: string;
                try {
                    address = Address.fromScript(o.script).toString();
                } catch {
                    return; // OP_RETURN or a script with no address
                }
                const carried = tokens?.outputs[outIdx] ?? null;
                const tokenInfo: CoinToken | undefined = carried === null || tokens?.kind === undefined ? undefined : { tokenId: carried.tokenId, kind: tokens.kind, atoms: carried.atoms, baton: false };
                addCoin(address, { txid, outIdx, sats: o.sats, token: tokenInfo !== undefined, final: false, ...(tokenInfo === undefined ? {} : { tokenInfo }) });
                rec.created.push({ address: key(address), outpoint: `${txid}:${outIdx}` });
                notify(address);
            });
            if (plan.v === 'final' || plan.v === 'invalid' || plan.v === 'offline-after-send') {
                const status = plan.v === 'invalid' ? 'invalid' : 'final';
                setTimeout(() => settleTx(txid, status), plan.delayMs);
            }
            if (plan.v === 'offline-after-send') throw new ChainError('offline', 'No node could be reached');
            return txid;
        },

        settle(txid, _address, o = {}): Promise<Settlement> {
            const timeoutMs = o.timeoutMs ?? 60000;
            return new Promise(resolve => {
                const rec = txs.get(txid);
                if (rec && rec.status !== 'pending') return resolve(rec.status);
                // One of our coins spent by a different tx: the race is lost.
                const lostRace = (): boolean =>
                    (o.outpoints ?? []).some(op => {
                        const by = spentBy.get(`${op.txid}:${op.outIdx}`);
                        return by !== undefined && by !== txid;
                    });
                if (lostRace()) return resolve('invalid');
                let done = false;
                const check = (): void => {
                    if (done || !lostRace()) return;
                    done = true;
                    clearTimeout(timer);
                    spendChecks.delete(check);
                    resolve('invalid');
                };
                spendChecks.add(check);
                const timer = setTimeout(() => {
                    done = true;
                    spendChecks.delete(check);
                    resolve('unknown');
                }, timeoutMs);
                rec?.waiters.push(() => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    spendChecks.delete(check);
                    resolve(rec.status === 'pending' ? 'unknown' : rec.status);
                });
            });
        },

        async detail(txid): Promise<TxDetail | null> {
            return details.get(txid) ?? null;
        },

        async lookup(txid): Promise<TxLookup> {
            const rec = txs.get(txid);
            if (!rec || rec.status === 'invalid') return 'absent';
            return rec.status === 'final' ? 'final' : 'seen';
        },

        watch(address, onChange) {
            const k = key(address);
            let set = watchers.get(k);
            if (!set) {
                set = new Set();
                watchers.set(k, set);
            }
            // Wrap so the same callback watched twice gets two subscriptions.
            const fn = (): void => onChange();
            set.add(fn);
            return () => {
                set.delete(fn);
            };
        },
    };
    return chain;
}
