import { parseEcashAddress } from './address';
import { DUST_SATS } from './limits';
import type { WrapperOffer } from './stamp';

const termsOk = (t: { readonly sats: bigint; readonly payTo: string }): boolean =>
    typeof t === 'object' && t !== null && typeof t.payTo === 'string' && parseEcashAddress(t.payTo) !== null && typeof t.sats === 'bigint' && t.sats >= DUST_SATS;

/**
 * True when the offer is one the page can honour: a real address and a price a wallet will send, and the same
 * for every earlier price it still honours, each with the last block height it counts for.
 */
export function isValidOffer(offer: WrapperOffer): boolean {
    if (!termsOk(offer)) return false;
    const earlier = offer.earlier;
    if (earlier === undefined) return true;
    return Array.isArray(earlier) && earlier.every(t => termsOk(t) && Number.isSafeInteger(t.until) && t.until >= 0);
}
