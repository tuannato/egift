import type { FundLinks } from './types';
import { CAP_SATS, DUST_SATS, FLOOR_SATS } from './limits';
import { isValidOffer, stampOpReturnRaw } from './stamp';
import type { WrapperOffer } from './stamp';
import { parseEcashAddress } from './tx';

/**
 * `sats` as a BIP21 amount: XEC, exactly two decimals, no grouping, no
 * exponent. `1000n` -> `"10.00"`. Cashtab reads BIP21 `amount` in XEC with a
 * `.` decimal mark; a wrong unit here once cost Stall a factor of 10^6.
 */
export function bip21Amount(sats: bigint): string {
    if (typeof sats !== 'bigint' || sats <= 0n) throw new Error('The amount must be positive');
    const whole = sats / 100n;
    const cents = sats % 100n;
    return `${whole.toString()}.${cents.toString().padStart(2, '0')}`;
}

/**
 * The Cashtab roads for paying `sats` to `address`.
 *
 * Both roads carry the BIP21 URI raw (not percent-encoded): Cashtab Web takes
 * everything after `bip21=` in its hash as-is, and the Cashtab app splits the
 * pay.e.cash URL on `bip21=` and parses the rest with `new URL()`, which fails
 * on an encoded `ecash%3A…`. The URI only holds `[a-z0-9:?=.]`, so it is
 * safe raw in both a hash and a query string.
 */
export function fundLinks(address: string, sats: bigint): FundLinks {
    const parsed = parseEcashAddress(address);
    if (parsed === null || parsed.type !== 'p2pkh') throw new Error('Not a valid ecash: P2PKH address');
    if (typeof sats !== 'bigint' || sats < FLOOR_SATS) throw new Error('The amount is under the floor');
    if (sats > CAP_SATS) throw new Error('The amount is over the cap');
    const bip21 = `${parsed.address}?amount=${bip21Amount(sats)}`;
    return {
        bip21,
        web: `https://cashtab.com/#/send?bip21=${bip21}`,
        app: `https://pay.e.cash/?bip21=${bip21}&b=1`,
    };
}

/**
 * The roads for funding a package AND stamping its wrapper in the same
 * transaction: `ecash:<package>?amount=<gift>&op_return_raw=<marker>&addr=<maker>&amount=<price>`,
 * the shape Cashtab's own BIP21 parser reads (the first `amount` is the
 * package's; each further output is `addr` followed at once by its `amount`).
 *
 * `sats` may be as little as the dust limit: that is "pay for the wrapper
 * later", a stamp on a gift that is already funded.
 */
export function stampedFundLinks(p: { address: string; sats: bigint; wrapper: string; offer: WrapperOffer }): FundLinks {
    const parsed = parseEcashAddress(p.address);
    if (parsed === null || parsed.type !== 'p2pkh') throw new Error('Not a valid ecash: P2PKH address');
    if (typeof p.sats !== 'bigint' || p.sats < DUST_SATS) throw new Error('The amount is under the dust limit');
    if (p.sats > CAP_SATS) throw new Error('The amount is over the cap');
    const maker = parseEcashAddress(p.offer.payTo);
    if (maker === null || !isValidOffer(p.offer)) throw new Error('Not a valid offer');
    const bip21 = `${parsed.address}?amount=${bip21Amount(p.sats)}&op_return_raw=${stampOpReturnRaw(p.wrapper, parsed.hash)}&addr=${maker.address}&amount=${bip21Amount(p.offer.sats)}`;
    return {
        bip21,
        web: `https://cashtab.com/#/send?bip21=${bip21}`,
        app: `https://pay.e.cash/?bip21=${bip21}&b=1`,
    };
}

/**
 * The Cashtab roads for sending a token to a package:
 * `ecash:<package>?token_id=<id>&token_decimalized_qty=<qty>`.
 *
 * Both values are typed or pasted by a person, so nothing but a token id and
 * a plain decimal number may reach the link: one stray `&addr=` would add an
 * output to someone else. Throws on anything else.
 */
export function tokenFundLinks(p: { address: string; tokenId: string; qty: string }): FundLinks {
    const parsed = parseEcashAddress(p.address);
    if (parsed === null || parsed.type !== 'p2pkh') throw new Error('Not a valid ecash: P2PKH address');
    if (typeof p.tokenId !== 'string' || !/^[0-9a-f]{64}$/.test(p.tokenId)) throw new Error('Not a token id');
    if (typeof p.qty !== 'string' || p.qty.length > 30 || !/^\d+(\.\d+)?$/.test(p.qty) || /^[0.]+$/.test(p.qty)) throw new Error('Not a quantity');
    const bip21 = `${parsed.address}?token_id=${p.tokenId}&token_decimalized_qty=${p.qty}`;
    return {
        bip21,
        web: `https://cashtab.com/#/send?bip21=${bip21}`,
        app: `https://pay.e.cash/?bip21=${bip21}&b=1`,
    };
}
