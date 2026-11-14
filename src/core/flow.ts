import { buildSweep, parseEcashAddress } from './tx';
import { buildGiftSweep, isCleanSend } from './tokenTx';
import { ChainError, SweepError } from './types';
import type { Chain, ChainErrorCode, OutPointRef, PackageKey, PackageState, Settlement, Sweep, SweepMarker, TakeResult, TakenToken, TokenVerdict, TxLookup } from './types';

/**
 * The last sweep this page signed for a package, kept in memory (never in
 * storage) from just before its broadcast until its fate is known. While it
 * may be alive, nothing new is signed for that package: an answer lost on
 * the way back ("offline") must not turn into a second, conflicting tx.
 */
interface Remembered {
    readonly txid: string;
    readonly raw: Uint8Array;
    readonly to: string;
    readonly marker: SweepMarker;
    readonly sentSats: bigint;
    readonly spent: readonly OutPointRef[];
    readonly leftCoins: number;
    /** The token the request asked to carry along (null: XEC only). Part of what makes two requests "the same". */
    readonly wanted: string | null;
    /** The token this sweep does carry. */
    readonly token?: TakenToken;
    /** The token asked for stayed behind: carrying it would have cost the gift its XEC. */
    readonly tokenLeft?: boolean;
    /** Known final: kept so that a later call says "done", not "lost", for our own sweep. */
    readonly final?: boolean;
}

const memory = new Map<string, Remembered>();
const inFlight = new Map<string, { asked: string; run: Promise<TakeResult> }>();

/** Forget every remembered sweep. For tests; the app never needs it. */
export function forgetSweeps(): void {
    memory.clear();
}

const op = (o: OutPointRef): string => `${o.txid}:${o.outIdx}`;

const extras = (r: Remembered) => ({ ...(r.token === undefined ? {} : { token: r.token }), ...(r.tokenLeft === true ? { tokenLeft: true } : {}) });
const pending = (r: Remembered): TakeResult => ({ kind: 'pending', txid: r.txid, sentSats: r.sentSats, leftCoins: r.leftCoins, ...extras(r) });
const done = (r: Remembered): TakeResult => ({ kind: 'done', txid: r.txid, sentSats: r.sentSats, leftCoins: r.leftCoins, ...extras(r) });

/** What a sweep is built from: the package as independently run nodes agree it is, where the chain can say. */
const readForSigning = (chain: Chain, address: string): Promise<PackageState> => (chain.readChecked ? chain.readChecked(address) : chain.read(address));

async function safeLookup(chain: Chain, txid: string): Promise<TxLookup> {
    if (chain.lookup === undefined) return 'unknown';
    try {
        return await chain.lookup(txid);
    } catch {
        return 'unknown';
    }
}

/** Wait for the verdict on a remembered sweep; forget it once its fate is known. */
async function settleRemembered(chain: Chain, address: string, r: Remembered): Promise<TakeResult> {
    let v: Settlement;
    try {
        v = await chain.settle(r.txid, address, { outpoints: r.spent });
    } catch {
        v = 'unknown';
    }
    if (v === 'final') {
        memory.set(address, { ...r, final: true });
        return done(r);
    }
    if (v === 'invalid') {
        memory.delete(address);
        return { kind: 'lost' };
    }
    return pending(r);
}

type Resolution =
    | { readonly kind: 'result'; readonly result: TakeResult }
    /** A node does not know our tx AND a fresh read shows all its coins unspent: signing anew is safe. */
    | { readonly kind: 'absent' }
    /** Its coins are unspent, but no node said the tx is gone. Only the same bytes may go out again. */
    | { readonly kind: 'unspent' };

/** Find out what became of a remembered sweep, before anything new is signed. */
async function resolve(chain: Chain, address: string, r: Remembered): Promise<Resolution> {
    const lk = await safeLookup(chain, r.txid);
    if (lk === 'final') {
        memory.set(address, { ...r, final: true });
        return { kind: 'result', result: done(r) };
    }
    if (lk === 'seen') return { kind: 'result', result: await settleRemembered(chain, address, r) };
    let live: Set<string>;
    try {
        live = new Set((await chain.read(address)).coins.map(op));
    } catch {
        return { kind: 'result', result: pending(r) };
    }
    if (r.spent.every(o => live.has(op(o)))) return lk === 'absent' ? { kind: 'absent' } : { kind: 'unspent' };
    // Some of our coins are spent, by us or by someone else: the settlement,
    // told our outpoints, can tell which.
    return { kind: 'result', result: await settleRemembered(chain, address, r) };
}

/** Broadcast a remembered sweep (again: the same bytes are harmless) and wait for its verdict. */
/**
 * `onSent`: called once a node has accepted the transaction, so a screen can
 * tell "sending" from "waiting for the network".
 */
async function send(chain: Chain, address: string, r: Remembered, onSent?: () => void): Promise<TakeResult> {
    try {
        await chain.broadcast(r.raw);
    } catch (e) {
        const code: ChainErrorCode = e instanceof ChainError ? e.code : 'offline';
        // The error may be a lie: the tx can be out there ("offline" after a
        // node accepted it), or the node only lacked the parent ("conflict"
        // for missing inputs). Ask before saying anything.
        const res = await resolve(chain, address, r);
        if (res.kind === 'result') return res.result;
        if (res.kind === 'unspent') {
            // A node refused it outright ("conflict" with our coins still
            // unspent: it lacked the parent). Retrying is safe, but stay
            // remembered: a retry resends these same bytes.
            if (code === 'conflict') {
                return { kind: 'error', code: 'rejected', message: 'The network has not seen the funding yet; try again in a moment' };
            }
            return pending(r);
        }
        memory.delete(address);
        return {
            kind: 'error',
            code: code === 'conflict' ? 'rejected' : code,
            message: 'The transaction was not accepted; the package is unchanged and can be tried again',
        };
    }
    try {
        onSent?.();
    } catch {
        // a listener is a nicety
    }
    return settleRemembered(chain, address, r);
}

async function takeHomeOnce(p: { chain: Chain; key: PackageKey; to: string; marker: SweepMarker; tokenId?: string | null; onSent?: () => void }): Promise<TakeResult> {
    const { chain, key, to, marker } = p;
    const wanted = p.tokenId ?? null;
    const address = key.address;
    const dest = parseEcashAddress(to);
    if (dest === null) return { kind: 'error', code: 'bad-address', message: 'The destination is not a valid ecash: address' };

    let state: PackageState | undefined;
    const earlier = memory.get(address);
    if (earlier?.final === true) {
        // Our last sweep here is final. Only new money makes a new sweep;
        // otherwise the package is empty because WE took it.
        try {
            state = await readForSigning(chain, address);
        } catch {
            return done(earlier);
        }
        if (state.kind !== 'funded') return done(earlier);
        memory.delete(address);
    } else if (earlier !== undefined) {
        const res = await resolve(chain, address, earlier);
        if (res.kind === 'result') return res.result;
        if (res.kind === 'unspent') {
            // Same request: resend the very same signed bytes (same txid, no conflict).
            if (earlier.to === dest.address && earlier.marker === marker && earlier.wanted === wanted) return send(chain, address, earlier, p.onSent);
            // A different request while the earlier tx may be alive: sign nothing.
            return pending(earlier);
        }
        memory.delete(address); // known absent, coins unspent: safe to sign anew
    }

    if (state === undefined) {
        try {
            state = await readForSigning(chain, address);
        } catch (e) {
            if (e instanceof ChainError) return { kind: 'error', code: e.code, message: e.message };
            return { kind: 'error', code: 'offline', message: 'No node answered' };
        }
    }
    if (state.kind === 'taken') return { kind: 'lost' };
    if (state.kind === 'empty') return { kind: 'error', code: 'nothing', message: 'The package holds nothing' };

    let sweep: Sweep | undefined;
    let tokenLeft = false;
    if (wanted !== null) {
        // The token and the XEC in ONE transaction. Only when the package cannot pay to move the token does the XEC go alone.
        try {
            sweep = buildGiftSweep({ key, coins: state.coins, to: dest.address, marker, tokenId: wanted });
        } catch (e) {
            if (!(e instanceof SweepError)) return { kind: 'error', code: 'rejected', message: 'The package could not be read correctly' };
            if (e.code !== 'dust') return { kind: 'error', code: e.code, message: e.message };
            // A re-key that cannot carry the token moves nothing: the token must not be left under the old key alone.
            if (marker === 'rekey') return { kind: 'error', code: 'dust', message: e.message };
            tokenLeft = true;
        }
        if (sweep !== undefined && chain.validate !== undefined) {
            // A second opinion before a token leaves: the node must agree it is one clean SEND. Nothing is
            // remembered yet, because nothing has been sent.
            let verdict: TokenVerdict;
            try {
                verdict = await chain.validate(sweep.raw);
            } catch {
                return { kind: 'error', code: 'offline', message: 'No node could check the transaction; nothing was sent' };
            }
            if (!isCleanSend(verdict, sweep)) return { kind: 'error', code: 'token', message: 'A node would not carry the token safely; nothing was sent' };
        }
    }
    try {
        sweep ??= buildSweep({ key, coins: state.coins, to: dest.address, marker });
    } catch (e) {
        if (e instanceof SweepError) return { kind: 'error', code: e.code, message: e.message };
        // Malformed data from the chain: nothing was signed.
        return { kind: 'error', code: 'rejected', message: 'The package could not be read correctly' };
    }

    // Said from the coins the sweep was signed from, not from what a screen was shown: a token coin this sweep
    // does not spend stays at the package, and the caller must not treat the gift as gone.
    const spent = new Set(sweep.spent.map(op));
    if (state.coins.some(c => c.token === true && !spent.has(op(c)))) tokenLeft = true;

    // Remember BEFORE broadcasting: from here on the tx may exist.
    const r: Remembered = {
        txid: sweep.txid,
        raw: sweep.raw,
        to: dest.address,
        marker,
        sentSats: sweep.sentSats,
        spent: sweep.spent,
        leftCoins: sweep.leftCoins,
        wanted,
        ...(sweep.token === undefined ? {} : { token: { tokenId: sweep.token.tokenId, atoms: sweep.token.atoms, leftCoins: sweep.token.leftCoins } }),
        ...(tokenLeft ? { tokenLeft: true } : {}),
    };
    memory.set(address, r);
    return send(chain, address, r, p.onSent);
}

/**
 * Take the package home (or re-key it): read fresh, sign once, broadcast,
 * wait for the verdict.
 *
 * - `done` only after a `final` settlement; a timeout is `pending`.
 * - `lost` only when one of our coins is spent by another tx (invalidation,
 *   or a fresh read showing the coins gone and not to us).
 * - After a broadcast error the chain is asked about our own txid first: an
 *   "offline" answer for a tx that went through ends `done`/`pending`.
 * - Nothing is re-signed for a package while an earlier sweep from this page
 *   may still be alive; calling again resolves that sweep first (and resends
 *   the same bytes if the request is the same). So for a `pending` result the
 *   UI may simply call `takeHome` again later.
 * - A second call for the same package while one runs returns the same promise.
 * - `tokenId`: also carry that token, in the SAME transaction as the XEC (one
 *   remembered transaction per package, as ever). XEC too small for a coin of
 *   its own rides on the token coin. Only when the package cannot pay to move
 *   the token does the XEC go alone, and the result says `tokenLeft`. Before a token leaves, a node is asked what the
 *   transaction would do to it; without a clean answer nothing is sent.
 * - `onSent`: see `send`. Not called when nothing is broadcast in this call.
 */
export function takeHome(p: { chain: Chain; key: PackageKey; to: string; marker: SweepMarker; tokenId?: string | null; onSent?: () => void }): Promise<TakeResult> {
    const address = p.key.address;
    const asked = `${p.to}|${p.marker}|${p.tokenId ?? ''}`;
    const running = inFlight.get(address);
    if (running !== undefined) {
        // The same request gets the same answer. A different one must not be told "done" for a destination it never asked for.
        if (running.asked === asked) return running.run;
        return Promise.resolve({ kind: 'error', code: 'rejected', message: 'Another take of this package is under way' });
    }
    const run = takeHomeOnce(p).finally(() => inFlight.delete(address));
    inFlight.set(address, { asked, run });
    return run;
}
