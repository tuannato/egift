import { parseEcashAddress } from './address';
export { parseEcashAddress };
import {
    ALL_BIP143,
    OP_RETURN,
    P2PKHSignatory,
    Script,
    TxBuilder,
    calcTxFee,
    pushBytesOp,
    shaRmd160,
    strToBytes,
} from 'ecash-lib';
import { DUST_SATS, FEE_PER_KB, MAX_SWEEP_INPUTS } from './limits';
import { getEcc } from './keys';
import { SweepError } from './types';
import type { Coin, PackageKey, Sweep, SweepMarker } from './types';

const TXID_RE = /^[0-9a-f]{64}$/;


/** True for a valid `ecash:` P2PKH or P2SH address (prefix optional). False for `etoken:` and anything else. */
export function isValidDestination(address: string): boolean {
    return parseEcashAddress(address) !== null;
}

/**
 * `OP_RETURN <"EGIF"> <0x00 action>`; 0x01 = taken home, 0x02 = re-keyed.
 *
 * The page itself takes a gift home with no marker: the transaction into a recipient's wallet says nothing of where
 * the money came from, and the only "EGIF" the page writes on the chain is the payment for a wrapper (`stamp.ts`).
 */
export function markerScript(marker: 'home' | 'rekey'): Script {
    return Script.fromOps([OP_RETURN, pushBytesOp(strToBytes('EGIF')), pushBytesOp(new Uint8Array([0x00, marker === 'home' ? 0x01 : 0x02]))]);
}

function varSize(n: number): number {
    return n < 0xfd ? 1 : n <= 0xffff ? 3 : 5;
}

/** A P2PKH input signed with Schnorr: outpoint 36 + scriptSig (1 + 65 + 1 + 33 = 100, length byte 1) + sequence 4. */
const P2PKH_INPUT_BYTES = 36 + 1 + 100 + 4;

function outputBytes(script: Script): number {
    return 8 + varSize(script.bytecode.length) + script.bytecode.length;
}

/**
 * Exact size of the sweep. Schnorr signatures are always 64 bytes (+1 sighash
 * byte), so the signed size is known before signing; the result is checked
 * against the real serialization afterwards.
 */
function sweepSize(nInputs: number, outputs: readonly Script[]): number {
    let size = 4 + varSize(nInputs) + nInputs * P2PKH_INPUT_BYTES + varSize(outputs.length) + 4;
    for (const s of outputs) size += outputBytes(s);
    return size;
}

/**
 * What taking a gift home costs when the gift sits in ONE coin (one funding
 * transaction, the usual case): one input, one output, no marker. Said to the
 * giver before the gift exists; a gift funded in several coins, or carrying a
 * token, costs more, and the real fee is always read from the signed transaction.
 *
 * `withToken`: the gift will also carry one token coin. Then the sweep has
 * two inputs and a token SEND: at most 428 bytes for ALP (measured with the marker it used to carry; a little less
 * without), 424 for SLP and NFTs (both
 * measured: ALP by `tokenTx.test.ts`, SLP on the real network, 12 Nov 2026).
 * The larger is said, so the recipient is never short.
 */
export function takeFeeEstimate(withToken = false): bigint {
    if (withToken) return TOKEN_TAKE_FEE_SATS;
    return calcTxFee(sweepSize(1, [Script.p2pkh(new Uint8Array(20))]), FEE_PER_KB);
}
const TOKEN_TAKE_FEE_SATS = 428n;

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

/**
 * Sign one transaction moving the non-token coins to `to`. Throws
 * `SweepError`; never signs a tx whose destination output would be under dust.
 *
 * Token coins are left where they are and never spent: spending one as fuel
 * would burn the token. Anyone can send token dust to a public package
 * address, so their presence must not freeze the XEC.
 *
 * At most `MAX_SWEEP_INPUTS` coins go into one sweep (the largest, ties by
 * txid then outIdx, so the choice is deterministic); `leftCoins` says how many
 * spendable coins remain for another round.
 *
 * The destination gets a FIXED amount (balance - fee) computed here, never a
 * TxBuilder "leftover" output: the builder silently drops a leftover under
 * dust and burns the whole balance as fee.
 */
export function buildSweep(p: { key: PackageKey; coins: readonly Coin[]; to: string; marker: SweepMarker }): Sweep {
    const { key, coins, to, marker } = p;
    const dest = parseEcashAddress(to);
    if (dest === null) throw new SweepError('bad-address', 'The destination is not a valid ecash: address');
    // To the package itself is not "home": the money would still sit under the link's key.
    if (dest.type === 'p2pkh' && sameBytes(dest.hash, key.pkh)) throw new SweepError('bad-address', 'The destination is the package itself');
    const xecCoins = coins.filter(c => c.token !== true);
    if (xecCoins.length === 0) throw new SweepError('nothing', 'The package holds no XEC to take');

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
    if (!sameBytes(ecc.derivePubkey(key.sk), key.pk) || !sameBytes(shaRmd160(key.pk), key.pkh)) {
        throw new Error('Inconsistent package key');
    }

    const byOutpoint = (a: Coin, b: Coin): number => (a.txid < b.txid ? -1 : a.txid > b.txid ? 1 : a.outIdx - b.outIdx);
    const chosen =
        xecCoins.length <= MAX_SWEEP_INPUTS
            ? xecCoins
            : [...xecCoins].sort((a, b) => (a.sats > b.sats ? -1 : a.sats < b.sats ? 1 : byOutpoint(a, b))).slice(0, MAX_SWEEP_INPUTS);
    const leftCoins = xecCoins.length - chosen.length;
    const sorted = [...chosen].sort(byOutpoint);
    const inputSats = sorted.reduce((s, c) => s + c.sats, 0n);
    const destScript = dest.type === 'p2pkh' ? Script.p2pkh(dest.hash) : Script.p2sh(dest.hash);
    const outScripts = marker === null ? [destScript] : [markerScript(marker), destScript];

    const size = sweepSize(sorted.length, outScripts);
    const fee = calcTxFee(size, FEE_PER_KB);
    const sentSats = inputSats - fee;
    if (sentSats < DUST_SATS) {
        throw new SweepError('dust', 'After the fee, less than the dust limit would arrive');
    }

    const inputScript = Script.p2pkh(key.pkh);
    const signatory = P2PKHSignatory(key.sk, key.pk, ALL_BIP143);
    const builder = new TxBuilder({
        inputs: sorted.map(c => ({
            input: { prevOut: { txid: c.txid, outIdx: c.outIdx }, signData: { sats: c.sats, outputScript: inputScript } },
            signatory,
        })),
        outputs: [
            ...(marker === null ? [] : [{ sats: 0n, script: outScripts[0]! }]),
            { sats: sentSats, script: destScript },
        ],
    });
    const tx = builder.sign({ ecc });

    // Check the signed tx against what we meant to sign; on any mismatch the
    // tx is dropped here and never leaves this function.
    const raw = tx.ser();
    const destOutputs = tx.outputs.filter(o => sameBytes(o.script.bytecode, destScript.bytecode));
    const outSum = tx.outputs.reduce((s, o) => s + o.sats, 0n);
    const realFee = inputSats - outSum;
    const tokenOutpoints = new Set(coins.filter(c => c.token === true).map(c => `${c.txid}:${c.outIdx}`));
    const ok =
        sorted.every(c => !tokenOutpoints.has(`${c.txid}:${c.outIdx}`)) &&
        raw.length === size &&
        tx.inputs.length === sorted.length &&
        tx.outputs.length === outScripts.length &&
        destOutputs.length === 1 &&
        destOutputs[0]!.sats === sentSats &&
        sentSats >= DUST_SATS &&
        realFee === fee &&
        realFee >= calcTxFee(raw.length, FEE_PER_KB) &&
        realFee <= 2n * BigInt(raw.length) &&
        tx.outputs.every(o => sameBytes(o.script.bytecode, destScript.bytecode) || (o.sats === 0n && o.script.bytecode[0] === OP_RETURN));
    if (!ok) throw new SweepError('dust', 'The signed transaction failed its own checks');

    return {
        raw,
        txid: tx.txid(),
        feeSats: realFee,
        sentSats,
        spent: sorted.map(c => ({ txid: c.txid, outIdx: c.outIdx })),
        leftCoins,
    };
}
