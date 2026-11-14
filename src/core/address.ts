import { decodeCashAddress } from 'ecashaddrjs';

/*
 * Reading an `ecash:` address. On its own, with nothing but the address
 * library, so that a page that only needs to know "is this an address" does
 * not pull in the signing library.
 */

function fromHex(hex: string): Uint8Array {
    if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) throw new Error('Not hex');
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
}

/** A decoded mainnet `ecash:` P2PKH or P2SH address, or null. */
export function parseEcashAddress(address: string): { type: 'p2pkh' | 'p2sh'; hash: Uint8Array; address: string } | null {
    if (typeof address !== 'string') return null;
    const s = address.trim();
    if (s.length === 0 || s.length > 120) return null;
    // A prefixless address is read as `ecash:` only, so the checksum pins the
    // network: an `etoken:` or testnet address never passes as a destination.
    // Cashaddr is single-case; a mixed-case string is not an address.
    if (s !== s.toLowerCase() && s !== s.toUpperCase()) return null;
    const lower = s.toLowerCase();
    const full = lower.includes(':') ? lower : `ecash:${lower}`;
    try {
        const decoded = decodeCashAddress(full);
        if (decoded.prefix !== 'ecash') return null;
        if (decoded.type !== 'p2pkh' && decoded.type !== 'p2sh') return null;
        const hash = fromHex(decoded.hash);
        if (hash.length !== 20) return null;
        return { type: decoded.type, hash, address: full };
    } catch {
        return null;
    }
}
