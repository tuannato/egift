import { OP_RETURN, Script, pushBytesOp, strToBytes, toHex } from 'ecash-lib';
import { FLOOR_SATS } from './limits';
import { parseEcashAddress } from './tx';
import type { Chain, Coin, TxDetail } from './types';

/*
 * The stamp: how a wrapper is paid for.
 *
 * A wrapper's pictures ship with the page for everyone, so they cannot be
 * locked away. What can be sold is the page's agreement to SHOW a wrapper
 * when a gift is opened. The giver pays for that inside the same transaction
 * that funds the gift (one confirmation in the wallet, as before):
 *
 *   output: the gift             -> the package address
 *   output: the price            -> the wrapper maker's address
 *   output: OP_RETURN "EGIF" <0x00 0x10> <wrapper id> <20-byte hash of the package address>
 *
 * The marker names the package, and a transaction carries one OP_RETURN, so
 * one payment stamps exactly one package. On opening, the page reads the
 * transactions behind the package's coins; the paid wrapper is shown only if
 * one of them is a stamp for this wrapper and this package that pays the
 * price to the address in the price table. Otherwise the default wrapper is shown
 * and the gift opens as always: the money is never held back.
 *
 * Nothing here signs or sends anything. Gift never connects a wallet.
 */

/** What a wrapper costs to send a gift in, and who is paid. Ships with the page; never read from a link or the chain. */
export interface WrapperOffer {
    /** The price, in sats. At least the dust limit: a wallet refuses to send less. */
    readonly sats: bigint;
    /** The maker's `ecash:` address (P2PKH or P2SH). */
    readonly payTo: string;
    /**
     * Buying the wrapper outright: the id of its licence token, and where it
     * is sold. A giver whose wallet holds the token funds gifts with a plain
     * funding link and pays nothing more (`isOwnedFunding`).
     */
    readonly licence?: { readonly tokenId: string; readonly buyAt?: string };
    /**
     * What the wrapper cost before, kept so that a gift paid for then keeps
     * its wrapper after a price or the paid address changes. An entry counts
     * only for a payment that was in a block no later than `until`.
     */
    readonly earlier?: readonly PastTerms[];
}

/** A price that is no longer asked: what was paid, to whom, and the last block height at which paying it counted. */
export interface PastTerms {
    readonly sats: bigint;
    readonly payTo: string;
    readonly until: number;
}

const TOKEN_ID_RE = /^[0-9a-f]{64}$/;

/** The licence token of an offer, when it names a well-formed one. */
export function licenceOf(offer: WrapperOffer): string | null {
    const id = offer.licence?.tokenId;
    return typeof id === 'string' && TOKEN_ID_RE.test(id) ? id : null;
}

const WRAPPER_RE = /^[a-z0-9-]{1,24}$/;
/** The action byte of a stamp, after the version byte 0x00 (0x01 = taken home, 0x02 = re-keyed). */
export const STAMP_ACTION = 0x10;

function checkArgs(wrapper: string, pkh: Uint8Array): void {
    if (typeof wrapper !== 'string' || !WRAPPER_RE.test(wrapper)) throw new Error('Invalid wrapper id');
    if (!(pkh instanceof Uint8Array) || pkh.length !== 20) throw new Error('The package hash must be 20 bytes');
}

/** `OP_RETURN <"EGIF"> <0x00 0x10> <wrapper id> <package pkh>`. */
export function stampScript(wrapper: string, pkh: Uint8Array): Script {
    checkArgs(wrapper, pkh);
    return Script.fromOps([OP_RETURN, pushBytesOp(strToBytes('EGIF')), pushBytesOp(new Uint8Array([0x00, STAMP_ACTION])), pushBytesOp(strToBytes(wrapper)), pushBytesOp(pkh)]);
}

/** The action byte of a stamp for several gifts funded and paid for by one transaction. */
export const BATCH_ACTION = 0x11;
/** A batch stamp names at least two packages (one is the plain stamp) and at most this many: nine fill the 223 bytes a data output may have. */
export const BATCH_MAX = 9;

/**
 * `OP_RETURN <"EGIF"> <0x00 0x11> <wrapper id> <package pkh 1> … <package pkh K>`, K from 2 to 9, no package twice.
 * One payment of the wrapper's price stamps every package named, when the same transaction also funds it (`isStamp`).
 */
export function batchStampScript(wrapper: string, pkhs: readonly Uint8Array[]): Script {
    if (!Array.isArray(pkhs) || pkhs.length < 2 || pkhs.length > BATCH_MAX) throw new Error('A batch names two to nine packages');
    for (const pkh of pkhs) checkArgs(wrapper, pkh);
    if (new Set(pkhs.map(p => toHex(p))).size !== pkhs.length) throw new Error('A package is named twice');
    return Script.fromOps([OP_RETURN, pushBytesOp(strToBytes('EGIF')), pushBytesOp(new Uint8Array([0x00, BATCH_ACTION])), pushBytesOp(strToBytes(wrapper)), ...pkhs.map(p => pushBytesOp(p))]);
}

/** The batch stamp as a BIP21 `op_return_raw` value (see `stampOpReturnRaw`). At most 222 bytes: nine packages and a 24-character wrapper id. */
export function batchOpReturnRaw(wrapper: string, pkhs: readonly Uint8Array[]): string {
    return toHex(batchStampScript(wrapper, pkhs).bytecode).slice(2);
}

/** Strict: an even number of hex digits, or it throws. */
function fromHex(hex: string): Uint8Array {
    if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/.test(hex)) throw new Error('Not hex');
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
}

/**
 * The packages a data output names, when it is a well-formed batch stamp for `wrapper`: lowercase hex, 40
 * characters each. Read at fixed places, then written out again and compared as a whole script: nothing that is not
 * byte for byte what this page would write counts. `null` for anything else.
 */
function batchMembers(scriptHex: string, wrapper: string): string[] | null {
    if (!WRAPPER_RE.test(wrapper) || !/^[0-9a-f]*$/.test(scriptHex)) return null;
    const head = toHex(Script.fromOps([OP_RETURN, pushBytesOp(strToBytes('EGIF')), pushBytesOp(new Uint8Array([0x00, BATCH_ACTION])), pushBytesOp(strToBytes(wrapper))]).bytecode);
    if (!scriptHex.startsWith(head)) return null;
    const rest = scriptHex.slice(head.length);
    // Each package is one push of twenty bytes: 0x14, then the hash.
    if (rest.length % 42 !== 0) return null;
    const k = rest.length / 42;
    if (k < 2 || k > BATCH_MAX) return null;
    const members: string[] = [];
    for (let i = 0; i < k; i++) {
        const piece = rest.slice(i * 42, i * 42 + 42);
        if (!piece.startsWith('14')) return null;
        members.push(piece.slice(2));
    }
    try {
        return toHex(batchStampScript(wrapper, members.map(fromHex)).bytecode) === scriptHex ? members : null;
    } catch {
        return null;
    }
}

/**
 * The stamp as a BIP21 `op_return_raw` value: the script in lowercase hex
 * WITHOUT its first byte. Cashtab prepends OP_RETURN (6a) itself and refuses
 * a value that already starts with it.
 */
export function stampOpReturnRaw(wrapper: string, pkh: Uint8Array): string {
    return toHex(stampScript(wrapper, pkh).bytecode).slice(2);
}

/** The output script of an `ecash:` address, lowercase hex; null for anything else. */
function scriptHexOf(address: string): string | null {
    const parsed = parseEcashAddress(address);
    if (parsed === null) return null;
    const h = toHex(parsed.hash);
    return parsed.type === 'p2pkh' ? `76a914${h}88ac` : `a914${h}87`;
}

import { isValidOffer } from './offer';
export { isValidOffer };

/**
 * Is this transaction a stamp of `wrapper` for the package `pkh` under
 * `offer`? All of:
 * - it carries exactly the marker for this wrapper and this package (compared
 *   as whole scripts, never parsed leniently);
 * - ONE output pays at least the price to the maker's address;
 * - none of its inputs spends from the maker's address: a maker's own payment
 *   with change back to the same address would otherwise stamp anyone's gift
 *   for free. Inputs of unknown origin are refused for the same reason.
 * A stamp for several gifts (`batchStampScript`) counts for this package when,
 * besides all of the above with its own marker in place of the plain one:
 * - the package is one of those the marker names;
 * - ONE output of the same transaction pays the package at least the floor of a
 *   gift: a batch stamps only what it funds, never a gift it merely names;
 * - the address that is paid is none of the packages named.
 * The price and the address are the ones asked now, or an earlier pair
 * (`offer.earlier`) when the transaction was in a block by that pair's last
 * height. A transaction not yet in a block is held to what is asked now: a
 * payment at an old price cannot be made after the fact.
 * Never throws: anything malformed is simply not a stamp.
 */
export function isStamp(tx: TxDetail | null | undefined, wrapper: string, pkh: Uint8Array, offer: WrapperOffer): boolean {
    return stampOf(tx, wrapper, pkh, offer) === 'yes';
}

/**
 * `yes`: a stamp. `waiting`: it would be one under an earlier price, but it
 * is in no block yet, so whether it counts is not known. `no`: neither.
 */
function stampOf(tx: TxDetail | null | undefined, wrapper: string, pkh: Uint8Array, offer: WrapperOffer): 'yes' | 'waiting' | 'no' {
    try {
        if (!tx || !Array.isArray(tx.outputs) || !Array.isArray(tx.inputs) || tx.inputs.length === 0 || !isValidOffer(offer)) return 'no';
        const marker = toHex(stampScript(wrapper, pkh).bytecode);
        const lower = (v: unknown): string => (typeof v === 'string' ? v.toLowerCase() : '');
        // One data output, and it is this package's stamp: a transaction carrying several markers (possible if a
        // miner includes it) must not stamp several gifts with one payment.
        const data = tx.outputs.filter(o => lower(o.script).startsWith('6a'));
        if (data.length !== 1) return 'no';
        const pkg = `76a914${toHex(pkh)}88ac`;
        // The plain stamp, or a batch stamp that names this package and whose transaction funds it.
        let named: readonly string[] = [toHex(pkh)];
        if (lower(data[0]!.script) !== marker) {
            const members = batchMembers(lower(data[0]!.script), wrapper);
            if (members === null || !members.includes(toHex(pkh))) return 'no';
            if (!tx.outputs.some(o => lower(o.script) === pkg && typeof o.sats === 'bigint' && o.sats >= FLOOR_SATS)) return 'no';
            named = members;
        }
        const gifts = new Set(named.map(m => `76a914${m}88ac`));
        const pays = (terms: { readonly sats: bigint; readonly payTo: string }): boolean => {
            const pay = scriptHexOf(terms.payTo);
            // Paying a package the stamp names is no payment: that money comes straight back to whoever opens the gift.
            if (pay === null || gifts.has(pay)) return false;
            if (tx.inputs.some(i => lower(i) === '' || lower(i) === pay)) return false;
            return tx.outputs.some(o => lower(o.script) === pay && typeof o.sats === 'bigint' && o.sats >= terms.sats);
        };
        if (pays(offer)) return 'yes';
        const earlier = offer.earlier ?? [];
        const at = tx.height;
        if (at === undefined) return earlier.some(pays) ? 'waiting' : 'no';
        if (typeof at !== 'number' || !Number.isSafeInteger(at) || at < 0) return 'no';
        return earlier.some(t => at <= t.until && pays(t)) ? 'yes' : 'no';
    } catch {
        return 'no';
    }
}

/**
 * Is this funding transaction one from a wallet that owns the wrapper? All of:
 * - it pays the package at least the floor of a gift (a licence holder's
 *   stray dust does not dress someone else's gift);
 * - one of the scripts it spends FROM is in `holders`, the scripts that hold
 *   the licence token right now.
 * Ownership is asked when the gift is opened, not when it was funded: a
 * licence sold on takes the wrapper off the gifts not opened yet.
 * Never throws.
 */
export function isOwnedFunding(tx: TxDetail | null | undefined, pkh: Uint8Array, holders: readonly string[]): boolean {
    try {
        if (!tx || !Array.isArray(tx.outputs) || !Array.isArray(tx.inputs) || !(pkh instanceof Uint8Array) || pkh.length !== 20) return false;
        const lower = (v: unknown): string => (typeof v === 'string' ? v.toLowerCase() : '');
        const pkg = `76a914${toHex(pkh)}88ac`;
        const got = tx.outputs.reduce((s, o) => (lower(o.script) === pkg && typeof o.sats === 'bigint' ? s + o.sats : s), 0n);
        if (got < FLOOR_SATS) return false;
        const held = new Set(holders.map(lower).filter(s => s !== '' && s !== pkg));
        return tx.inputs.some(i => held.has(lower(i)));
    } catch {
        return false;
    }
}

/**
 * Whether a package is entitled to its paid wrapper. `paid`: a stamp.
 * `owned`: funded from a wallet that holds the licence. `unknown`: the chain
 * could not be asked (or did not answer in time).
 */
export type Entitlement = 'paid' | 'owned' | 'unpaid' | 'unknown';

/** The most funding transactions looked at for one package. A gift normally has one or two. */
export const MAX_STAMP_LOOKUPS = 200;
/** How many of them are asked for at once. */
const STAMP_BATCH = 20;

/**
 * Read the transactions behind a package's coins and say whether the package
 * may show its paid wrapper.
 *
 * Oldest first (unconfirmed last, then larger coins first): a gift is funded
 * once, and nobody can make an older coin afterwards, so later dust cannot
 * bury its funding.
 * - A stamp may sit behind any of the coins looked at ("pay later" adds one).
 * - Ownership is read from the OLDEST funding only, with one question to the
 *   chain: who holds the licence token now.
 * `budgetMs`: give up after this long and answer `unknown`; the gift itself
 * never waits on a wrapper.
 */
export async function entitlement(p: {
    chain: Pick<Chain, 'detail' | 'holders'>;
    coins: readonly Coin[];
    wrapper: string;
    pkh: Uint8Array;
    offer: WrapperOffer;
    budgetMs?: number;
}): Promise<Entitlement> {
    if (p.budgetMs === undefined) return look(p, () => true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const late = new Promise<Entitlement>(res => {
        timer = setTimeout(() => {
            // Out of time: the answer is "unknown", and the lookup stops asking the node.
            alive = false;
            res('unknown');
        }, p.budgetMs);
    });
    try {
        return await Promise.race([look(p, () => alive), late]);
    } finally {
        alive = false;
        clearTimeout(timer);
    }
}

async function look(p: { chain: Pick<Chain, 'detail' | 'holders'>; coins: readonly Coin[]; wrapper: string; pkh: Uint8Array; offer: WrapperOffer }, alive: () => boolean): Promise<Entitlement> {
    const detail = p.chain.detail;
    if (detail === undefined) return 'unknown';
    const order = [...p.coins].sort((a, b) => (a.height ?? Infinity) - (b.height ?? Infinity) || (a.sats === b.sats ? 0 : a.sats > b.sats ? -1 : 1));
    // The gift's own funding is its oldest XEC coin: a token coin (5.46 XEC, sent before or after) is not it.
    const funding = order.find(c => c.token !== true)?.txid;
    const txids: string[] = funding === undefined ? [] : [funding];
    for (const c of order) if (!txids.includes(c.txid)) txids.push(c.txid);
    let failed = false;
    const licence = licenceOf(p.offer);
    const read = async (txid: string): Promise<TxDetail | null | undefined> => {
        try {
            const tx = await detail.call(p.chain, txid);
            // "No such transaction" about one that funds a coin just listed is a node a step behind, not a verdict.
            if (tx === null) failed = true;
            return tx;
        } catch {
            failed = true;
            return undefined;
        }
    };
    const list = txids.slice(0, MAX_STAMP_LOOKUPS);
    // The funding first, on its own: it is the one a licence is read from.
    const first = list[0];
    if (first !== undefined) {
        const tx = await read(first);
        if (tx !== undefined) {
            const stamp = stampOf(tx, p.wrapper, p.pkh, p.offer);
            if (stamp === 'yes') return 'paid';
            // Paid at an earlier price and in no block yet: not a verdict either way, so the page asks again.
            if (stamp === 'waiting') failed = true;
            if (first === funding && licence !== null && p.chain.holders !== undefined && tx !== null) {
                try {
                    if (isOwnedFunding(tx, p.pkh, await p.chain.holders(licence))) return 'owned';
                } catch {
                    failed = true;
                }
            }
        }
    }
    // The rest in batches: a stamp paid later sits among them, and someone flooding the package with small
    // coins in the same block must not be able to push it out of sight cheaply.
    for (let i = 1; i < list.length; i += STAMP_BATCH) {
        if (!alive()) return 'unknown';
        const stamps = (await Promise.all(list.slice(i, i + STAMP_BATCH).map(read))).map(tx => (tx === undefined ? 'no' : stampOf(tx, p.wrapper, p.pkh, p.offer)));
        if (stamps.includes('yes')) return 'paid';
        if (stamps.includes('waiting')) failed = true;
    }
    return failed ? 'unknown' : 'unpaid';
}
