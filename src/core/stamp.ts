import { OP_RETURN, Script, pushBytesOp, strToBytes, toHex } from 'ecash-lib';
import { DUST_SATS, FLOOR_SATS } from './limits';
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

/** True when the offer is one the page can honour: a real address and a price a wallet will send. */
export function isValidOffer(offer: WrapperOffer): boolean {
    return scriptHexOf(offer.payTo) !== null && typeof offer.sats === 'bigint' && offer.sats >= DUST_SATS;
}

/**
 * Is this transaction a stamp of `wrapper` for the package `pkh` under
 * `offer`? All of:
 * - it carries exactly the marker for this wrapper and this package (compared
 *   as whole scripts, never parsed leniently);
 * - ONE output pays at least the price to the maker's address;
 * - none of its inputs spends from the maker's address: a maker's own payment
 *   with change back to the same address would otherwise stamp anyone's gift
 *   for free. Inputs of unknown origin are refused for the same reason.
 * Never throws: anything malformed is simply not a stamp.
 */
export function isStamp(tx: TxDetail | null | undefined, wrapper: string, pkh: Uint8Array, offer: WrapperOffer): boolean {
    try {
        if (!tx || !Array.isArray(tx.outputs) || !Array.isArray(tx.inputs) || tx.inputs.length === 0 || !isValidOffer(offer)) return false;
        const marker = toHex(stampScript(wrapper, pkh).bytecode);
        const pay = scriptHexOf(offer.payTo)!;
        // Paying the package itself is no payment: that money comes straight back to whoever opens the gift.
        if (pay === `76a914${toHex(pkh)}88ac`) return false;
        const lower = (v: unknown): string => (typeof v === 'string' ? v.toLowerCase() : '');
        if (tx.inputs.some(i => lower(i) === '' || lower(i) === pay)) return false;
        // One data output, and it is this package's stamp: a transaction carrying several markers (possible if a
        // miner includes it) must not stamp several gifts with one payment.
        const data = tx.outputs.filter(o => lower(o.script).startsWith('6a'));
        const marked = data.length === 1 && lower(data[0]!.script) === marker;
        const paid = tx.outputs.some(o => lower(o.script) === pay && typeof o.sats === 'bigint' && o.sats >= offer.sats);
        return marked && paid;
    } catch {
        return false;
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
            if (isStamp(tx, p.wrapper, p.pkh, p.offer)) return 'paid';
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
        const txs = await Promise.all(list.slice(i, i + STAMP_BATCH).map(read));
        if (txs.some(tx => tx !== undefined && isStamp(tx, p.wrapper, p.pkh, p.offer))) return 'paid';
    }
    return failed ? 'unknown' : 'unpaid';
}
