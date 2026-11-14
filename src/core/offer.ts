import { parseEcashAddress } from './address';
import { DUST_SATS } from './limits';
import type { WrapperOffer } from './stamp';

/** True when the offer is one the page can honour: a real address and a price a wallet will send. */
export function isValidOffer(offer: WrapperOffer): boolean {
    return parseEcashAddress(offer.payTo) !== null && typeof offer.sats === 'bigint' && offer.sats >= DUST_SATS;
}
