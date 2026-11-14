import { Address, Ecc, shaRmd160 } from 'ecash-lib';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import type { PackageKey } from './types';

/** secp256k1 group order. A secret key must be in [1, n-1]. */
const SECP256K1_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

/** More tries than this is impossible in practice (each fails with p ~ 2^-128); it only guards the loop. */
const MAX_TRIES = 256;

let ecc: Ecc | undefined;
/** One Ecc for the page, built on first use. */
export function getEcc(): Ecc {
    if (ecc === undefined) ecc = new Ecc();
    return ecc;
}

function bytesToBigInt(b: Uint8Array): bigint {
    let n = 0n;
    for (const byte of b) n = (n << 8n) | BigInt(byte);
    return n;
}

/**
 * `sk = HMAC-SHA256(key = secret, msg = "gift/v1/<index>/<try>")`, first `try`
 * giving `0 < sk < n`. Deterministic: the link is the only backup of the key.
 */
export function deriveKey(secret: Uint8Array, index = 0): PackageKey {
    if (!(secret instanceof Uint8Array) || secret.length !== 16) throw new Error('The secret must be 16 bytes');
    if (!Number.isInteger(index) || index < 0 || index > 65535) throw new Error('Invalid key index');
    const enc = new TextEncoder();
    for (let tryNo = 0; tryNo < MAX_TRIES; tryNo++) {
        const sk = hmac(sha256, secret, enc.encode(`gift/v1/${index}/${tryNo}`));
        const n = bytesToBigInt(sk);
        if (n === 0n || n >= SECP256K1_N) continue;
        const pk = getEcc().derivePubkey(sk);
        const pkh = shaRmd160(pk);
        return { sk, pk, pkh, address: Address.p2pkh(pkh).toString() };
    }
    throw new Error('Key derivation failed');
}
