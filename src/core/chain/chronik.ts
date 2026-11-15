import { ChronikClient } from 'chronik-client';
import type { WsMsgClient } from 'chronik-client';
import { Tx } from 'ecash-lib';
import { ChainError } from '../types';
import type { Chain, Coin, CoinToken, PackageState, Settlement, SettleOptions, TokenMeta, TokenVerdict, TxDetail, TxLookup } from '../types';
import { parseEcashAddress } from '../tx';

/** The chronik hosts this app may talk to. The CSP's `connect-src` lists exactly these. */
export const CHRONIK_HOSTS: readonly string[] = [
    // Asked in this order. Gift never touches Agora, so a node without the Agora plugin serves it fully.
    'https://chronik1.ecashlive.net',
    'https://chronik.e.cash',
    'https://chronik-native1.fabien.cash',
    'https://chronik-native2.fabien.cash',
    'https://chronik-native3.fabien.cash',
    'https://chronik.pay2stay.com/xec',
];

/**
 * The same hosts, grouped by who runs them: what a second opinion is asked
 * of, when `NODES_THAT_MUST_AGREE` is more than one.
 */
export const CHRONIK_OPERATORS: readonly (readonly string[])[] = [
    ['https://chronik1.ecashlive.net'],
    ['https://chronik.e.cash'],
    ['https://chronik-native1.fabien.cash', 'https://chronik-native2.fabien.cash', 'https://chronik-native3.fabien.cash'],
    ['https://chronik.pay2stay.com/xec'],
];

/** How many independently run nodes must give the same answer before a sweep is signed or sent: 1 = the node the page is talking to, with the others as its fail-over. */
export const NODES_THAT_MUST_AGREE = 1;

/** Told when a call to a node ran out of time. */
const stalled = new Set<() => void>();
/** The same hosts with the first one moved to the end. Pure. */
export function nextHostFirst(hosts: readonly string[]): string[] {
    return hosts.length < 2 ? [...hosts] : [...hosts.slice(1), hosts[0]!];
}

/** No call to a node waits longer than this: a node that accepts and never answers must not hang the page. */
const CALL_TIMEOUT_MS = 10_000;
function timed<T>(p: Promise<T>, ms: number = CALL_TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        // The `code` makes it read as "no node could be reached" (`isOffline`).
        const t = setTimeout(() => {
            for (const fn of [...stalled]) fn();
            reject(Object.assign(new Error('The node did not answer in time'), { code: 'ETIMEDOUT' }));
        }, ms);
        p.then(
            v => {
                clearTimeout(t);
                resolve(v);
            },
            e => {
                clearTimeout(t);
                reject(e);
            },
        );
    });
}

/* The slice of chronik-client this module uses, so tests can inject a fake. */

export interface ChronikUtxoLike {
    readonly outpoint: { readonly txid: string; readonly outIdx: number };
    readonly sats: bigint;
    readonly isFinal: boolean;
    readonly token?: unknown;
    readonly blockHeight?: number;
}
export interface ChronikTxLike {
    readonly txid: string;
    readonly isFinal: boolean;
    readonly timeFirstSeen: number;
    readonly block?: { readonly timestamp: number };
    readonly inputs: readonly { readonly prevOut: { readonly txid: string; readonly outIdx: number }; readonly outputScript?: string }[];
    readonly outputs: readonly { readonly spentBy?: { readonly txid: string }; readonly sats?: bigint; readonly outputScript?: string }[];
}
export interface ChronikWsLike {
    waitForOpen(): Promise<void>;
    subscribeToAddress(address: string): void;
    close(): void;
}
export interface ChronikWsConfigLike {
    onMessage?: (msg: WsMsgClient) => void;
    onReconnect?: (e: never) => void;
    autoReconnect?: boolean;
}
export interface ChronikLike {
    address(address: string): {
        utxos(): Promise<{ readonly utxos: readonly ChronikUtxoLike[] }>;
        history(page?: number, pageSize?: number): Promise<{ readonly txs: readonly ChronikTxLike[]; readonly numTxs: number }>;
    };
    broadcastTx(rawTx: Uint8Array): Promise<{ readonly txid: string }>;
    tx(txid: string): Promise<ChronikTxLike>;
    token?(tokenId: string): Promise<{ readonly genesisInfo?: { readonly tokenName?: unknown; readonly tokenTicker?: unknown; readonly decimals?: unknown } }>;
    validateRawTx?(rawTx: Uint8Array): Promise<{
        readonly tokenStatus?: unknown;
        readonly tokenEntries?: readonly unknown[];
        readonly tokenFailedParsings?: readonly unknown[];
        readonly outputs?: readonly { readonly token?: unknown }[];
    }>;
    tokenId?(tokenId: string): {
        utxos(): Promise<{ readonly utxos: readonly { readonly script?: string; readonly token?: { readonly tokenId?: string; readonly atoms?: bigint; readonly isMintBaton?: boolean } }[] }>;
    };
    ws(config: ChronikWsConfigLike): ChronikWsLike;
}

const TXID_RE = /^[0-9a-f]{64}$/;

/** How many final txids one page remembers. */
const KNOWN_FINAL_MAX = 500;
/** A watched address is read at most this often, however many messages arrive. */
const WATCH_MIN_GAP_MS = 400;
/** A watched address is also read this often while the page is in view, socket or no socket. */
const WATCH_BEAT_MS = 25_000;
/** After a message at a watched address, read again this long after it. */
const FOLLOW_UPS_MS: readonly number[] = [800, 2000, 5000, 12000];
/** After a broadcast, ask about the tx this long after it, before settling into the slower recheck. */
const EARLY_CHECKS_MS: readonly number[] = [1000, 2000, 3000, 4500, 6500, 9000, 12000];

const CONFLICT_MARKERS = ['txn-mempool-conflict', 'finalized-tx-conflict', 'bad-txns-inputs-missingorspent', 'missing inputs', 'neither in the mempool nor db'];

function errText(e: unknown): string {
    if (e instanceof Error) return e.message;
    return typeof e === 'string' ? e : '';
}

/** chronik-client's own failover message once every host failed with a network error. */
function isOffline(e: unknown): boolean {
    const msg = errText(e).toLowerCase();
    return (
        msg.includes('error connecting to known chronik') ||
        msg.includes('network error') ||
        (e instanceof Error && 'code' in e && typeof (e as { code: unknown }).code === 'string')
    );
}

/** What a coin's `token` field says, read defensively. Exported for tests. */
export function readCoinToken(token: unknown): CoinToken | undefined {
    if (token === null || typeof token !== 'object') return undefined;
    const tk = token as { tokenId?: unknown; tokenType?: { protocol?: unknown; type?: unknown }; atoms?: unknown; isMintBaton?: unknown };
    if (typeof tk.tokenId !== 'string' || !TXID_RE.test(tk.tokenId) || typeof tk.atoms !== 'bigint') return undefined;
    const proto = tk.tokenType?.protocol;
    const type = tk.tokenType?.type;
    const kind: CoinToken['kind'] =
        proto === 'ALP' && type === 'ALP_TOKEN_TYPE_STANDARD' ? 'alp' : proto === 'SLP' && type === 'SLP_TOKEN_TYPE_FUNGIBLE' ? 'slp' : proto === 'SLP' && type === 'SLP_TOKEN_TYPE_NFT1_CHILD' ? 'nft' : 'other';
    // Anything but a plain `false` is treated as a baton: a baton is never moved.
    return { tokenId: tk.tokenId, kind, atoms: tk.atoms, baton: tk.isMintBaton !== false };
}

/** Map a broadcast failure to the contract's codes. Exported for tests. */
export function mapBroadcastError(e: unknown): ChainError {
    const msg = errText(e).toLowerCase();
    if (CONFLICT_MARKERS.some(m => msg.includes(m))) return new ChainError('conflict', 'Coins already spent');
    if (isOffline(e)) return new ChainError('offline', 'No node could be reached');
    return new ChainError('rejected', 'The node refused the transaction');
}

function isNotFound(e: unknown): boolean {
    const msg = errText(e);
    return /\b404\b/.test(msg) && /not found/i.test(msg);
}

/** Only a mainnet P2PKH package address goes to chronik. */
function packageAddress(address: string): string {
    const parsed = parseEcashAddress(address);
    if (parsed === null || parsed.type !== 'p2pkh') throw new ChainError('rejected', 'Not a package address');
    return parsed.address;
}

/**
 * The real chain. `createChronikChain()` builds one `ChronikClient` over
 * `CHRONIK_HOSTS` on first use, and one per operator for second opinions;
 * tests pass `{ client }` (and `{ peers }` to play several operators).
 */
export function createChronikChain(opts: { client?: ChronikLike; peers?: readonly ChronikLike[]; agree?: number } = {}): Chain {
    const need = opts.agree ?? NODES_THAT_MUST_AGREE;
    let client: ChronikLike | undefined = opts.client;
    // The library moves to the next host when one fails, not when one accepts a call and never answers. A call
    // that ran out of time therefore puts the next host first for the calls after it (at most once in a while,
    // so that several calls timing out together move on by one host, not by several).
    let hosts = [...CHRONIK_HOSTS];
    let movedAt = 0;
    const getClient = (): ChronikLike => {
        if (client === undefined) client = new ChronikClient([...hosts]);
        return client;
    };
    if (opts.client === undefined) {
        stalled.add(() => {
            const now = Date.now();
            if (now - movedAt < 5_000) return;
            movedAt = now;
            hosts = nextHostFirst(hosts);
            client = undefined;
        });
    }
    // One client per operator: inside a group it may fail over, never across groups.
    let peers: readonly ChronikLike[] | undefined = opts.peers ?? (opts.client === undefined ? undefined : [opts.client, opts.client]);
    const getPeers = (): readonly ChronikLike[] => {
        if (peers === undefined) peers = CHRONIK_OPERATORS.map(group => new ChronikClient([...group]) as unknown as ChronikLike);
        return peers;
    };

    /**
     * Ask every operator the same question and take the answer most of them
     * give. At least two must give it, and no other answer may be given as
     * often: otherwise there is no answer, and the caller does nothing.
     */
    function agreed<T>(ask: (c: ChronikLike) => Promise<T>, sigOf: (v: T) => string): Promise<T> {
        const all = getPeers();
        return new Promise<T>((resolve, reject) => {
            const tally = new Map<string, { n: number; value: T }>();
            let left = all.length;
            let settled = false;
            const judge = (): void => {
                if (settled) return;
                const ranked = [...tally.values()].sort((x, y) => y.n - x.n);
                const best = ranked[0];
                const next = ranked[1]?.n ?? 0;
                // Enough voices, and nobody still to answer could tie or overtake it: no need to wait for a slow node.
                if (best !== undefined && best.n >= 2 && best.n > next + left) {
                    settled = true;
                    return resolve(best.value);
                }
                if (left > 0) return;
                settled = true;
                if (best === undefined || best.n < 2) return reject(new ChainError(ranked.length > 1 ? 'disagree' : 'offline', 'Fewer than two independent nodes gave the same answer'));
                reject(new ChainError('disagree', 'The nodes disagree'));
            };
            for (const c of all) {
                timed(ask(c), 8_000).then(
                    v => {
                        left--;
                        const sig = sigOf(v);
                        const seen = tally.get(sig);
                        if (seen) seen.n++;
                        else tally.set(sig, { n: 1, value: v });
                        judge();
                    },
                    () => {
                        left--;
                        judge();
                    },
                );
            }
            if (all.length === 0) judge();
        });
    }

    /*
     * What the socket said is believed at once, as other eCash apps do: a
     * "finalized" message for a txid is the network's verdict, and finality
     * never goes back. Every socket of this chain feeds one small memory of
     * final txids. A read then calls those coins final even when the node's
     * answer is a moment behind the message, and a `settle` that has not got
     * its own socket open yet still hears it from a `watch` on the same package.
     */
    const knownFinal = new Set<string>();
    const finalListeners = new Set<(txid: string) => void>();
    const noteFinal = (msg: WsMsgClient): void => {
        if (msg.type !== 'Tx' || msg.msgType !== 'TX_FINALIZED' || typeof msg.txid !== 'string' || !TXID_RE.test(msg.txid)) return;
        knownFinal.add(msg.txid);
        if (knownFinal.size > KNOWN_FINAL_MAX) knownFinal.delete(knownFinal.values().next().value as string);
        for (const fn of [...finalListeners]) fn(msg.txid);
    };

    /** The coins a node says are at the address. */
    async function coinsOf(c: ChronikLike, addr: string): Promise<Coin[]> {
        const { utxos } = await timed(c.address(addr).utxos());
        return utxos.map(u => ({
                txid: u.outpoint.txid,
                outIdx: u.outpoint.outIdx,
                sats: u.sats,
                token: u.token !== undefined && u.token !== null,
                ...(readCoinToken(u.token) === undefined ? {} : { tokenInfo: readCoinToken(u.token)! }),
                final: u.isFinal === true || knownFinal.has(u.outpoint.txid),
                // chronik reports -1 for a coin still in the mempool.
                ...(typeof u.blockHeight === 'number' && u.blockHeight >= 0 ? { height: u.blockHeight } : {}),
            }));
    }

    /** The package those coins make. With no XEC coin, the address's history tells "never funded" from "already taken". */
    async function stateOf(c: ChronikLike, addr: string, coins: Coin[]): Promise<PackageState> {
            const xec = coins.filter(x => !x.token);
            const hasToken = xec.length < coins.length;
            if (xec.length > 0) {
                return {
                    kind: 'funded',
                    coins,
                    xecSats: xec.reduce((s, x) => s + x.sats, 0n),
                    hasToken,
                    allFinal: xec.every(x => x.final),
                };
            }
            // No XEC coin: history tells "never funded" from "already taken".
            // Token coins alone do not make a package funded (they may be dust
            // someone sent to the public address); they stay listed.
            const page = await timed(c.address(addr).history(0, 1));
            if (coins.length === 0 && (page.numTxs === 0 || page.txs.length === 0)) {
                return { kind: 'empty', coins: [], xecSats: 0n, hasToken: false, allFinal: true };
            }
            const newest = page.txs[0];
            const t = newest === undefined ? undefined : newest.timeFirstSeen > 0 ? newest.timeFirstSeen : newest.block?.timestamp;
            const state: PackageState = { kind: 'taken', coins, xecSats: 0n, hasToken, allFinal: true };
            return typeof t === 'number' && t > 0 ? { ...state, takenAt: t } : state;
    }

    const readError = (e: unknown): ChainError => {
        if (e instanceof ChainError) return e;
        if (isOffline(e)) return new ChainError('offline', 'No node could be reached');
        return new ChainError('rejected', 'The node could not read the package');
    };

    async function read(address: string): Promise<PackageState> {
        const addr = packageAddress(address);
        const c = getClient();
        try {
            return await stateOf(c, addr, await coinsOf(c, addr));
        } catch (e) {
            throw readError(e);
        }
    }

    /** Everything about a coin that decides what a sweep may spend and how: not its finality or height, which may lag. */
    const coinsSig = (coins: readonly Coin[]): string =>
        coins
            .map(c => `${c.txid}:${c.outIdx}:${c.sats}:${c.token ? 1 : 0}:${c.tokenInfo ? `${c.tokenInfo.tokenId}/${c.tokenInfo.kind}/${c.tokenInfo.atoms}/${c.tokenInfo.baton ? 1 : 0}` : ''}`)
            .sort()
            .join(',');

    /**
     * The package as several independently run nodes agree it is: what a
     * sweep is signed from. A new coin can reach one node a moment before
     * another, so a disagreement is asked about once more before it counts.
     */
    async function readChecked(address: string): Promise<PackageState> {
        const addr = packageAddress(address);
        try {
            let coins: Coin[];
            if (need < 2) coins = await coinsOf(getClient(), addr);
            else {
                try {
                    coins = await agreed(c => coinsOf(c, addr), coinsSig);
                } catch {
                    await new Promise(r => setTimeout(r, 1_200));
                    coins = await agreed(c => coinsOf(c, addr), coinsSig);
                }
            }
            return await stateOf(getClient(), addr, coins);
        } catch (e) {
            throw readError(e);
        }
    }

    async function broadcast(rawTx: Uint8Array): Promise<string> {
        // Our own txid, from the bytes we signed.
        let ours: string;
        try {
            ours = Tx.deser(rawTx).txid();
        } catch {
            throw new ChainError('rejected', 'Not a transaction');
        }
        try {
            // broadcastTx, not broadcastAndFinalizeTx: the latter only waits
            // for "finalized" and hangs for the loser of a race.
            await timed(getClient().broadcastTx(rawTx), 15_000);
        } catch (e) {
            throw mapBroadcastError(e);
        }
        return ours;
    }

    async function lookup(txid: string): Promise<TxLookup> {
        if (typeof txid !== 'string' || !TXID_RE.test(txid)) return 'unknown';
        try {
            const tx = await timed(getClient().tx(txid));
            return tx.isFinal ? 'final' : 'seen';
        } catch (e) {
            return isNotFound(e) ? 'absent' : 'unknown';
        }
    }

    const toDetail = (tx: ChronikTxLike): TxDetail => ({
        inputs: tx.inputs.map(i => (typeof i.outputScript === 'string' ? i.outputScript.toLowerCase() : '')),
        outputs: tx.outputs.map(o => ({ sats: typeof o.sats === 'bigint' ? o.sats : 0n, script: typeof o.outputScript === 'string' ? o.outputScript.toLowerCase() : '' })),
    });

    /** The newest transactions at an address (one page). A package has a handful: its funding, perhaps a late payment, its sweep. */
    const PAST_PAGE_SIZE = 100;
    async function past(address: string): Promise<readonly TxDetail[]> {
        const addr = packageAddress(address);
        try {
            const h = await timed(getClient().address(addr).history(0, PAST_PAGE_SIZE));
            return h.txs.map(toDetail);
        } catch (e) {
            throw readError(e);
        }
    }

    async function detail(txid: string): Promise<TxDetail | null> {
        if (typeof txid !== 'string' || !TXID_RE.test(txid)) return null;
        try {
            return toDetail(await timed(getClient().tx(txid)));
        } catch (e) {
            if (isNotFound(e)) return null;
            throw new ChainError('offline', 'No node could be reached');
        }
    }

    /** Pages of history read to answer `everSpent`; a longer history is answered "yes". */
    const SPENT_PAGES = 2;
    const SPENT_PAGE_SIZE = 200;
    async function everSpent(address: string): Promise<boolean> {
        const parsed = parseEcashAddress(address);
        if (parsed === null || parsed.type !== 'p2pkh') throw new ChainError('rejected', 'Not a package address');
        const own = `76a914${[...parsed.hash].map(b => b.toString(16).padStart(2, '0')).join('')}88ac`;
        const c = getClient();
        try {
            for (let page = 0; page < SPENT_PAGES; page++) {
                const h = await timed(c.address(parsed.address).history(page, SPENT_PAGE_SIZE));
                if (h.txs.some(tx => tx.inputs.some(i => typeof i.outputScript === 'string' && i.outputScript.toLowerCase() === own))) return true;
                if (h.numTxs <= (page + 1) * SPENT_PAGE_SIZE) return false;
            }
            // More history than is read through: nothing here may pass for the giver's.
            return true;
        } catch (e) {
            if (e instanceof ChainError) throw e;
            throw new ChainError('offline', 'No node could be reached');
        }
    }

    async function tokenMeta(tokenId: string): Promise<TokenMeta | null> {
        if (typeof tokenId !== 'string' || !TXID_RE.test(tokenId)) return null;
        const c = getClient();
        if (typeof c.token !== 'function') throw new ChainError('offline', 'This node cannot describe tokens');
        try {
            const g = (await timed(c.token(tokenId))).genesisInfo;
            const d = g?.decimals;
            return {
                name: typeof g?.tokenName === 'string' ? g.tokenName : '',
                ticker: typeof g?.tokenTicker === 'string' ? g.tokenTicker : '',
                decimals: typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 9 ? d : 0,
            };
        } catch (e) {
            if (isNotFound(e)) return null;
            throw new ChainError('offline', 'No node could be reached');
        }
    }

    /** What ONE node says a signed transaction would do to tokens. */
    async function verdictOf(c: ChronikLike, rawTx: Uint8Array): Promise<TokenVerdict> {
        if (typeof c.validateRawTx !== 'function') throw new ChainError('offline', 'This node cannot check a transaction');
        const tx = await c.validateRawTx(rawTx);
        const entries = (tx.tokenEntries ?? []).map(raw => {
            const e = (raw ?? {}) as { tokenId?: unknown; txType?: unknown; isInvalid?: unknown; burnSummary?: unknown; failedColorings?: unknown; actualBurnAtoms?: unknown; burnsMintBatons?: unknown };
            return {
                tokenId: typeof e.tokenId === 'string' ? e.tokenId : '',
                send: e.txType === 'SEND',
                // Every field must say "fine" in so many words; a missing field is not fine.
                clean: e.isInvalid === false && e.burnSummary === '' && Array.isArray(e.failedColorings) && e.failedColorings.length === 0 && e.actualBurnAtoms === 0n && e.burnsMintBatons === false,
            };
        });
        return {
            normal: tx.tokenStatus === 'TOKEN_STATUS_NORMAL',
            failedParsings: Array.isArray(tx.tokenFailedParsings) ? tx.tokenFailedParsings.length : 1,
            entries,
            outputs: (tx.outputs ?? []).map(o => {
                if (o.token === undefined || o.token === null) return null;
                const tk = readCoinToken(o.token);
                // A token output the page cannot read is reported as one it did not expect.
                return tk === undefined ? { tokenId: '', atoms: 0n, baton: true } : { tokenId: tk.tokenId, atoms: tk.atoms, baton: tk.baton };
            }),
        };
    }

    /** The verdict several independently run nodes agree on: the node that would relay a burn must not be the only one asked. */
    async function validate(rawTx: Uint8Array): Promise<TokenVerdict> {
        const ask = (): Promise<TokenVerdict> =>
            agreed(
                c => verdictOf(c, rawTx),
                v => JSON.stringify(v, (_k, x: unknown) => (typeof x === 'bigint' ? `${x}n` : x)),
            );
        try {
            if (need < 2) return await timed(verdictOf(getClient(), rawTx), 8_000);
            try {
                return await ask();
            } catch {
                // A node that has not yet seen the funding answers differently for a moment: ask once more.
                await new Promise(r => setTimeout(r, 1_200));
                return await ask();
            }
        } catch (e) {
            if (e instanceof ChainError) throw e;
            throw new ChainError(isOffline(e) ? 'offline' : 'rejected', 'The node could not check the transaction');
        }
    }

    async function holders(tokenId: string): Promise<readonly string[]> {
        if (typeof tokenId !== 'string' || !TXID_RE.test(tokenId)) return [];
        const c = getClient();
        if (typeof c.tokenId !== 'function') throw new ChainError('offline', 'This node cannot list token holders');
        try {
            const { utxos } = await timed(c.tokenId(tokenId).utxos(), 15_000);
            const out = new Set<string>();
            for (const u of utxos) {
                const tk = u.token;
                // Only what the node itself coloured as this token, with something in it, and no mint baton.
                if (!tk || tk.tokenId !== tokenId || tk.isMintBaton !== false || typeof tk.atoms !== 'bigint' || tk.atoms < 1n) continue;
                if (typeof u.script === 'string' && u.script !== '') out.add(u.script.toLowerCase());
            }
            return [...out];
        } catch (e) {
            if (e instanceof ChainError) throw e;
            throw new ChainError('offline', 'No node could be reached');
        }
    }

    /**
     * Verdict on our tx. `final` only from TX_FINALIZED or `isFinal`;
     * `invalid` only from TX_INVALIDATED or one of our inputs spent by a
     * different txid. A 404 alone is never a verdict: HTTP failover can land
     * on a node that has not seen the tx. Polling starts at once and never
     * waits for the socket (`waitForOpen()` can hang across reconnects).
     *
     * The network settles a tx in two or three seconds, often before the
     * socket opened after the broadcast is listening. So the first seconds are
     * asked about closely (`EARLY_CHECKS_MS`), and only then every `recheckMs`.
     */
    function settle(txid: string, address: string, o: SettleOptions = {}): Promise<Settlement> {
        // Gate before anything reaches a URL.
        if (typeof txid !== 'string' || !TXID_RE.test(txid)) return Promise.reject(new ChainError('rejected', 'Bad txid'));
        let addr: string;
        try {
            addr = packageAddress(address);
        } catch (e) {
            return Promise.reject(e);
        }
        const timeoutMs = o.timeoutMs ?? 60000;
        const recheckMs = o.recheckMs ?? 15000;
        const given = (o.outpoints ?? []).filter(op => typeof op.txid === 'string' && TXID_RE.test(op.txid) && Number.isInteger(op.outIdx) && op.outIdx >= 0);
        const c = getClient();

        return new Promise<Settlement>(resolve => {
            let done = false;
            let checking = false;
            let again = false;
            let inputs: { txid: string; outIdx: number }[] = given.map(op => ({ txid: op.txid, outIdx: op.outIdx }));
            let ws: ChronikWsLike | undefined;

            const closeWs = (): void => {
                try {
                    ws?.close();
                } catch {
                    // best effort
                }
            };
            const finish = (v: Settlement): void => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                clearInterval(interval);
                early.forEach(clearTimeout);
                finalListeners.delete(heard);
                closeWs();
                resolve(v);
            };

            /** Did a different tx spend one of our inputs? Asked of each parent's outputs. */
            const spentByOther = async (): Promise<boolean> => {
                const parents = new Map<string, number[]>();
                for (const i of inputs) parents.set(i.txid, [...(parents.get(i.txid) ?? []), i.outIdx]);
                for (const [parentId, idxs] of parents) {
                    if (done) return false;
                    let parent: ChronikTxLike;
                    try {
                        parent = await timed(c.tx(parentId), 8_000);
                    } catch {
                        continue; // no answer about this parent is not evidence
                    }
                    for (const idx of idxs) {
                        const by = parent.outputs[idx]?.spentBy?.txid;
                        if (by !== undefined && by !== txid) return true;
                    }
                }
                return false;
            };

            const check = async (): Promise<void> => {
                if (done) return;
                if (checking) {
                    again = true; // a message arrived mid-check: look once more after
                    return;
                }
                checking = true;
                try {
                    do {
                        again = false;
                        if (knownFinal.has(txid)) return finish('final');
                        try {
                            const tx = await timed(c.tx(txid), 8_000);
                            if (done) return;
                            if (tx.isFinal) return finish('final');
                            if (inputs.length === 0) inputs = tx.inputs.map(i => ({ txid: i.prevOut.txid, outIdx: i.prevOut.outIdx }));
                        } catch {
                            // 404 or node trouble: not a verdict either way
                        }
                        if (done) return;
                        if (inputs.length > 0 && (await spentByOther())) return finish('invalid');
                    } while (again && !done);
                } finally {
                    checking = false;
                }
            };

            /** Another socket of this page heard our tx finalized. */
            const heard = (id: string): void => {
                if (id === txid) finish('final');
            };
            const onMessage = (msg: WsMsgClient): void => {
                noteFinal(msg);
                if (done || msg.type !== 'Tx') return;
                if (msg.txid === txid) {
                    if (msg.msgType === 'TX_FINALIZED') return finish('final');
                    if (msg.msgType === 'TX_INVALIDATED') return finish('invalid');
                    return;
                }
                // Someone else's tx at the package: look now rather than at the next recheck.
                void check();
            };

            finalListeners.add(heard);
            const timer = setTimeout(() => finish('unknown'), timeoutMs);
            const interval = setInterval(() => void check(), recheckMs);
            const early = EARLY_CHECKS_MS.filter(ms => ms < recheckMs && ms < timeoutMs).map(ms => setTimeout(() => void check(), ms));
            void check(); // closes the race between broadcast and subscribe

            if (done) return; // already known final: no socket is opened at all
            try {
                // No onError: chronik-client closes the socket for good when
                // one is set. Subscribe once (before open); it replays on reconnect.
                ws = c.ws({ onMessage, onReconnect: () => void check(), autoReconnect: true });
                ws.subscribeToAddress(addr);
                // Not awaited: polling runs whatever the socket does.
                ws.waitForOpen().then(
                    () => {
                        if (done) closeWs();
                        else void check();
                    },
                    () => {
                        // no socket: polling alone still gives a verdict
                    },
                );
            } catch {
                // no socket: polling alone still gives a verdict
            }
        });
    }

    /**
     * Tell `onChange` whenever something happens at the address. The caller
     * reads the package again each time. A read that comes right after the
     * "finalized" message can still say "not final" (another node, or the same
     * one a moment early), and no further message would follow until the next
     * block: so each message is followed by a few more calls (`FOLLOW_UPS_MS`).
     */
    function watch(address: string, onChange: () => void): () => void {
        let closed = false;
        let ws: ChronikWsLike | undefined;
        let addr: string;
        try {
            addr = packageAddress(address);
        } catch {
            return () => {};
        }
        let followUps: ReturnType<typeof setTimeout>[] = [];
        let lastCall = 0;
        let trailing: ReturnType<typeof setTimeout> | undefined;
        /** One read at once, then at most one more per `WATCH_MIN_GAP_MS`: a flood of messages is not a flood of reads. */
        const call = (): void => {
            if (closed) return;
            const now = Date.now();
            if (now - lastCall >= WATCH_MIN_GAP_MS) {
                lastCall = now;
                onChange();
            } else if (trailing === undefined) {
                trailing = setTimeout(() => {
                    trailing = undefined;
                    lastCall = Date.now();
                    if (!closed) onChange();
                }, WATCH_MIN_GAP_MS - (now - lastCall));
            }
        };
        const changed = (): void => {
            if (closed) return;
            followUps.forEach(clearTimeout);
            followUps = FOLLOW_UPS_MS.map(ms => setTimeout(call, ms));
            call();
        };
        // The socket can die for good (a phone that slept, a network that changed) without a word. So the
        // address is also read on a slow beat while the page is in view, and when the page or the network comes back.
        const visible = (): boolean => typeof document === 'undefined' || document.visibilityState !== 'hidden';
        const beat = setInterval(() => {
            if (visible()) call();
        }, WATCH_BEAT_MS);
        const back = (): void => {
            if (visible()) call();
        };
        const target = typeof window === 'undefined' ? undefined : window;
        target?.addEventListener('online', back);
        target?.addEventListener('pageshow', back);
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', back);
        void (async () => {
            try {
                ws = getClient().ws({
                    onMessage: msg => {
                        if (closed) return void ws?.close();
                        noteFinal(msg);
                        if (msg.type === 'Tx') changed();
                    },
                    onReconnect: () => {
                        if (closed) return void ws?.close();
                        changed();
                    },
                    autoReconnect: true,
                });
                ws.subscribeToAddress(addr);
                await ws.waitForOpen();
            } catch {
                // offline: the caller still reads on its own
            }
            if (closed) {
                try {
                    ws?.close();
                } catch {
                    // best effort
                }
            }
        })();
        return () => {
            if (closed) return;
            closed = true;
            followUps.forEach(clearTimeout);
            clearTimeout(trailing);
            clearInterval(beat);
            target?.removeEventListener('online', back);
            target?.removeEventListener('pageshow', back);
            if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', back);
            try {
                ws?.close();
            } catch {
                // best effort
            }
        };
    }

    return { read, readChecked, broadcast, settle, lookup, detail, past, holders, everSpent, tokenMeta, validate, watch };
}
