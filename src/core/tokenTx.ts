import {
    ALL_BIP143,
    OP_RETURN,
    P2PKHSignatory,
    Script,
    TxBuilder,
    alpSend,
    calcTxFee,
    emppScript,
    parseAlp,
    parseEmppScript,
    parseSlp,
    shaRmd160,
    slpSend,
    strToBytes,
} from 'ecash-lib';
import { DUST_SATS, FEE_PER_KB, MAX_SWEEP_INPUTS, MAX_TOKEN_INPUTS } from './limits';
import { getEcc } from './keys';
import { parseEcashAddress } from './tx';
import { SweepError } from './types';
import type { Coin, PackageKey, Sweep, SweepMarker, TokenKind, TokenVerdict } from './types';

/*
 * Taking a gift home when it carries a token: ONE transaction moves the token
 * and all the XEC, or nothing moves.
 *
 *   input:  the coins of ONE token id (at most MAX_TOKEN_INPUTS, the largest)
 *   input:  the XEC coins
 *   output 0: the token SEND (OP_RETURN)
 *   output 1..n: the tokens -> the destination, 5.46 XEC each (n = 1 unless
 *               the amount does not fit one output)
 *   output n+1: all the remaining XEC -> the same destination
 *
 * When the remaining XEC is too little for a coin of its own (under the dust
 * limit), there is no output n+1: those few sats ride on the last token coin
 * instead. The token still goes home, and nothing is left behind or lost.
 * Never for a re-key: a new package holding a token and no XEC coin would be
 * stuck.
 *
 * A token coin that a transaction spends without naming its token id is
 * BURNED. So no coin of any other token, no mint baton and no coin of a kind
 * this page does not know ever becomes an input here — the same rule
 * `buildSweep` keeps by never spending a token coin at all. `tx.ts` is not
 * changed by any of this.
 */

const TXID_RE = /^[0-9a-f]{64}$/;

/** Token type numbers on the wire. */
const TYPE_NUMBER: Record<TokenKind, number> = { alp: 0, slp: 1, nft: 65 };
/** The most atoms one output can carry: ALP amounts are 6 bytes, SLP amounts 8. */
const MAX_ATOMS: Record<TokenKind, bigint> = { alp: (1n << 48n) - 1n, slp: (1n << 64n) - 1n, nft: (1n << 64n) - 1n };
/** The most token outputs of one sweep. SLP allows 19 in all; ALP more, but a gift never needs them. */
const MAX_TOKEN_OUTPUTS = 19;

/** Is this a coin this page may move as part of `tokenId`? */
export function isMovableToken(c: Coin, tokenId: string): boolean {
    const tk = c.tokenInfo;
    return c.token === true && tk !== undefined && tk.tokenId === tokenId && tk.baton === false && (tk.kind === 'alp' || tk.kind === 'slp' || tk.kind === 'nft') && typeof tk.atoms === 'bigint' && tk.atoms > 0n;
}

function varSize(n: number): number {
    return n < 0xfd ? 1 : n <= 0xffff ? 3 : 5;
}
/** A P2PKH input signed with Schnorr (see `tx.ts`). A token coin at the package is an ordinary P2PKH coin. */
const P2PKH_INPUT_BYTES = 36 + 1 + 100 + 4;
function outputBytes(script: Script): number {
    return 8 + varSize(script.bytecode.length) + script.bytecode.length;
}
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

/** The SEND script: all `amounts` to outputs 1..n. For ALP the "taken home"/"re-keyed" marker rides along as a second push. */
function sendScript(kind: TokenKind, tokenId: string, amounts: bigint[], marker: SweepMarker): Script {
    if (kind === 'alp') {
        const pushes = [alpSend(tokenId, TYPE_NUMBER.alp, amounts)];
        if (marker !== null) pushes.push(new Uint8Array([...strToBytes('EGIF'), 0x00, marker === 'home' ? 0x01 : 0x02]));
        return emppScript(pushes);
    }
    // SLP has room for one OP_RETURN and it is the SEND: no marker.
    return slpSend(tokenId, TYPE_NUMBER[kind] as Parameters<typeof slpSend>[1], amounts);
}

/** Read a SEND script back, independently of how it was built. Null for anything that is not exactly one SEND. */
function readSend(script: Script): { kind: 'alp' | 'slp-any'; type: number; tokenId: string; amounts: bigint[] } | null {
    try {
        const pushes = parseEmppScript(script);
        if (pushes !== undefined) {
            const sends = pushes.map(p => parseAlp(p)).filter(d => d !== undefined);
            if (sends.length !== 1 || sends[0]!.txType !== 'SEND') return null;
            const s = sends[0] as { tokenType: number; tokenId: string; sendAtomsArray: bigint[] };
            return { kind: 'alp', type: s.tokenType, tokenId: s.tokenId, amounts: s.sendAtomsArray };
        }
        const slp = parseSlp(script);
        if (slp === undefined || slp.txType !== 'SEND') return null;
        return { kind: 'slp-any', type: slp.tokenType, tokenId: slp.tokenId, amounts: slp.sendAtomsArray };
    } catch {
        return null;
    }
}

/**
 * Sign one transaction moving the coins of `tokenId` AND the XEC to `to`.
 *
 * Throws `SweepError`:
 * - `token`: no movable coin of that token at the package, or more of it than
 *   one transaction's outputs can carry;
 * - `dust`: the package cannot even pay the fee and the tokens' own 5.46 XEC.
 *   The caller then sweeps the XEC alone (`buildSweep`) and leaves the token;
 * - `nothing`, `bad-address`: as `buildSweep`.
 * Never signs anything it would not send.
 */
export function buildGiftSweep(p: { key: PackageKey; coins: readonly Coin[]; to: string; marker: SweepMarker; tokenId: string }): Sweep {
    const { key, coins, to, marker, tokenId } = p;
    const dest = parseEcashAddress(to);
    if (dest === null) throw new SweepError('bad-address', 'The destination is not a valid ecash: address');
    // To the package itself is not "home": the money would still sit under the link's key.
    if (dest.type === 'p2pkh' && sameBytes(dest.hash, key.pkh)) throw new SweepError('bad-address', 'The destination is the package itself');
    if (typeof tokenId !== 'string' || !TXID_RE.test(tokenId)) throw new SweepError('token', 'Not a token id');

    const seen = new Set<string>();
    for (const c of coins) {
        if (typeof c.txid !== 'string' || !TXID_RE.test(c.txid)) throw new Error('Malformed coin');
        if (!Number.isInteger(c.outIdx) || c.outIdx < 0 || c.outIdx > 0xffffffff) throw new Error('Malformed coin');
        if (typeof c.sats !== 'bigint' || c.sats <= 0n) throw new Error('Malformed coin');
        const op = `${c.txid}:${c.outIdx}`;
        if (seen.has(op)) throw new Error('Duplicate coin');
        seen.add(op);
    }
    const ecc = getEcc();
    if (!sameBytes(ecc.derivePubkey(key.sk), key.pk) || !sameBytes(shaRmd160(key.pk), key.pkh)) throw new Error('Inconsistent package key');

    const byOutpoint = (a: Coin, b: Coin): number => (a.txid < b.txid ? -1 : a.txid > b.txid ? 1 : a.outIdx - b.outIdx);
    const bySize = (v: (c: Coin) => bigint) => (a: Coin, b: Coin): number => (v(a) > v(b) ? -1 : v(a) < v(b) ? 1 : byOutpoint(a, b));

    // The token: only coins of this id, of one kind this page moves, no baton.
    const movable = coins.filter(c => isMovableToken(c, tokenId));
    if (movable.length === 0) throw new SweepError('token', 'The package holds no such token to take');
    const kind = movable[0]!.tokenInfo!.kind as TokenKind;
    if (movable.some(c => c.tokenInfo!.kind !== kind)) throw new SweepError('token', 'The token coins disagree about what they are');
    // Only an ALP SEND has room for the "re-keyed" marker. Without it the new package could not tell the old
    // key's holder from the giver, so an SLP token or an NFT is never re-keyed.
    if (marker === 'rekey' && kind !== 'alp') throw new SweepError('token', 'This kind of token cannot be re-keyed');
    const tokenCoins = movable.length <= MAX_TOKEN_INPUTS ? movable : [...movable].sort(bySize(c => c.tokenInfo!.atoms)).slice(0, MAX_TOKEN_INPUTS);
    const atoms = tokenCoins.reduce((s, c) => s + c.tokenInfo!.atoms, 0n);
    const amounts: bigint[] = [];
    for (let left = atoms; left > 0n; ) {
        const part = left > MAX_ATOMS[kind] ? MAX_ATOMS[kind] : left;
        amounts.push(part);
        left -= part;
    }
    if (amounts.length > MAX_TOKEN_OUTPUTS) throw new SweepError('token', 'More of this token than one transaction can carry');

    // The XEC: every coin that is not a token coin, exactly as `buildSweep` chooses them.
    const xecAll = coins.filter(c => c.token !== true);
    if (xecAll.length === 0) throw new SweepError('nothing', 'The package holds no XEC to pay for moving the token');
    const room = MAX_SWEEP_INPUTS - tokenCoins.length;
    const xecCoins = xecAll.length <= room ? xecAll : [...xecAll].sort(bySize(c => c.sats)).slice(0, room);

    const inputs = [...tokenCoins, ...xecCoins].sort(byOutpoint);
    const inputSats = inputs.reduce((s, c) => s + c.sats, 0n);
    const destScript = dest.type === 'p2pkh' ? Script.p2pkh(dest.hash) : Script.p2sh(dest.hash);
    const send = sendScript(kind, tokenId, amounts, marker);
    const sizeFor = (destOuts: number): number =>
        4 + varSize(inputs.length) + inputs.length * P2PKH_INPUT_BYTES + varSize(1 + destOuts) + outputBytes(send) + destOuts * outputBytes(destScript) + 4;
    const tokenSats = DUST_SATS * BigInt(amounts.length);
    let xecOut = true;
    let size = sizeFor(amounts.length + 1);
    let fee = calcTxFee(size, FEE_PER_KB);
    let sentSats = inputSats - fee - tokenSats;
    if (sentSats < DUST_SATS) {
        // A re-key must leave XEC coins at the new package, or its token could never be taken home from there.
        if (marker === 'rekey') throw new SweepError('dust', 'Re-keying with the token would leave the new package no XEC');
        // Too little XEC for a coin of its own: it rides on the last token coin, so the token is never left behind.
        xecOut = false;
        size = sizeFor(amounts.length);
        fee = calcTxFee(size, FEE_PER_KB);
        sentSats = inputSats - fee - tokenSats;
        if (sentSats < 0n) throw new SweepError('dust', 'The package cannot pay for moving the token');
    }
    const nOut = 1 + amounts.length + (xecOut ? 1 : 0);
    const tokenOutSats = amounts.map((_, i) => DUST_SATS + (!xecOut && i === amounts.length - 1 ? sentSats : 0n));

    const inputScript = Script.p2pkh(key.pkh);
    const signatory = P2PKHSignatory(key.sk, key.pk, ALL_BIP143);
    const tx = new TxBuilder({
        inputs: inputs.map(c => ({ input: { prevOut: { txid: c.txid, outIdx: c.outIdx }, signData: { sats: c.sats, outputScript: inputScript } }, signatory })),
        outputs: [{ sats: 0n, script: send }, ...tokenOutSats.map(sats => ({ sats, script: destScript })), ...(xecOut ? [{ sats: sentSats, script: destScript }] : [])],
    }).sign({ ecc });

    // Check the signed tx against what was meant; on any mismatch it never leaves this function.
    const raw = tx.ser();
    const allowed = new Set(inputs.map(c => `${c.txid}:${c.outIdx}`));
    const strangers = coins.filter(c => c.token === true && !isMovableToken(c, tokenId)).map(c => `${c.txid}:${c.outIdx}`);
    const back = readSend(tx.outputs[0]!.script);
    const outSum = tx.outputs.reduce((s, o) => s + o.sats, 0n);
    const realFee = inputSats - outSum;
    const ok =
        strangers.every(op => !allowed.has(op)) &&
        inputs.every(c => c.token !== true || isMovableToken(c, tokenId)) &&
        raw.length === size &&
        tx.inputs.length === inputs.length &&
        tx.outputs.length === nOut &&
        tx.outputs[0]!.sats === 0n &&
        tx.outputs[0]!.script.bytecode[0] === OP_RETURN &&
        back !== null &&
        (kind === 'alp' ? back.kind === 'alp' : back.kind === 'slp-any') &&
        back.type === TYPE_NUMBER[kind] &&
        back.tokenId === tokenId &&
        back.amounts.length === amounts.length &&
        back.amounts.every((a, i) => a === amounts[i]) &&
        back.amounts.reduce((s, a) => s + a, 0n) === atoms &&
        tx.outputs.slice(1).every(o => sameBytes(o.script.bytecode, destScript.bytecode)) &&
        tx.outputs.slice(1, 1 + amounts.length).every((o, i) => o.sats === tokenOutSats[i] && o.sats >= DUST_SATS) &&
        (xecOut ? tx.outputs[nOut - 1]!.sats === sentSats && sentSats >= DUST_SATS : sentSats >= 0n) &&
        outSum === sentSats + tokenSats &&
        realFee === fee &&
        realFee >= calcTxFee(raw.length, FEE_PER_KB) &&
        realFee <= 2n * BigInt(raw.length);
    if (!ok) throw new SweepError('token', 'The signed transaction failed its own checks');

    return {
        raw,
        txid: tx.txid(),
        feeSats: realFee,
        sentSats,
        spent: inputs.map(c => ({ txid: c.txid, outIdx: c.outIdx })),
        leftCoins: xecAll.length - xecCoins.length,
        token: { tokenId, atoms, leftCoins: movable.length - tokenCoins.length, ...(xecOut ? {} : { fused: true as const }) },
    };
}

/**
 * Does the node agree that this sweep is one clean SEND of its token and
 * nothing else? All of: the token part is in order; every push was read; one
 * entry, a SEND of this token, burning nothing; the outputs that carry a
 * token carry this one, no baton, and together exactly the atoms meant; the
 * OP_RETURN and the XEC output carry none. (A `fused` sweep has no XEC
 * output: its last output is a token coin.)
 */
export function isCleanSend(v: TokenVerdict, sweep: Sweep): boolean {
    try {
        const tk = sweep.token;
        if (tk === undefined || v.normal !== true || v.failedParsings !== 0 || v.entries.length !== 1) return false;
        const e = v.entries[0]!;
        if (e.tokenId !== tk.tokenId || e.send !== true || e.clean !== true) return false;
        const fused = tk.fused === true;
        if (v.outputs.length < (fused ? 2 : 3) || v.outputs[0] !== null) return false;
        if (!fused && v.outputs[v.outputs.length - 1] !== null) return false;
        const carrying = fused ? v.outputs.slice(1) : v.outputs.slice(1, -1);
        if (carrying.some(o => o === null || o.tokenId !== tk.tokenId || o.baton !== false || o.atoms <= 0n)) return false;
        return carrying.reduce((s, o) => s + o!.atoms, 0n) === tk.atoms;
    } catch {
        return false;
    }
}
