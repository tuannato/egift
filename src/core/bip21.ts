import type { FundLinks } from './types';
import { CAP_SATS, DUST_SATS, FLOOR_SATS } from './limits';
import { BATCH_MAX, batchOpReturnRaw, isValidOffer, stampOpReturnRaw } from './stamp';
import type { WrapperOffer } from './stamp';
import { parseEcashAddress } from './tx';

/**
 * `sats` as a BIP21 amount: XEC, exactly two decimals, no grouping, no
 * exponent. `1000n` -> `"10.00"`. Cashtab reads BIP21 `amount` in XEC with a
 * `.` decimal mark; a wrong unit here is a factor of 10^6.
 */
export function bip21Amount(sats: bigint): string {
    if (typeof sats !== 'bigint' || sats <= 0n) throw new Error('The amount must be positive');
    const whole = sats / 100n;
    const cents = sats % 100n;
    return `${whole.toString()}.${cents.toString().padStart(2, '0')}`;
}

/** The roads into Cashtab for one BIP21 URI. `b=1` (go back to the browser afterwards) is a separate road: see `FundLinks`. */
function roads(bip21: string): FundLinks {
    const app = `https://pay.e.cash/?bip21=${bip21}`;
    return { bip21, web: `https://cashtab.com/#/send?bip21=${bip21}`, app, appBack: `${app}&b=1` };
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
    return roads(bip21);
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
    return roads(bip21);
}

/**
 * The roads for funding several packages with ONE transaction, and (with `paid`) stamping all of them with one
 * payment of the wrapper's price:
 * `ecash:<package 1>?amount=<gift 1>[&op_return_raw=<batch marker>]&addr=<package 2>&amount=<gift 2>…[&addr=<maker>&amount=<price>]`.
 * The order is the one a real Cashtab wallet was seen to keep: the marker, the gifts as listed, the price, its change.
 *
 * Two to nine gifts, no address twice, each at least the floor of a gift. Without `paid` there is no marker and
 * no price: a free wrapper, or one the giver's wallet owns.
 */
export function batchFundLinks(p: { gifts: readonly { readonly address: string; readonly sats: bigint }[]; paid?: { readonly wrapper: string; readonly offer: WrapperOffer } }): FundLinks {
    if (!Array.isArray(p.gifts) || p.gifts.length < 2 || p.gifts.length > BATCH_MAX) throw new Error('A batch is two to nine gifts');
    const gifts = p.gifts.map(g => {
        const parsed = parseEcashAddress(g.address);
        if (parsed === null || parsed.type !== 'p2pkh') throw new Error('Not a valid ecash: P2PKH address');
        if (typeof g.sats !== 'bigint' || g.sats < FLOOR_SATS) throw new Error('The amount is under the floor');
        if (g.sats > CAP_SATS) throw new Error('The amount is over the cap');
        return { address: parsed.address, hash: parsed.hash, sats: g.sats };
    });
    if (new Set(gifts.map(g => g.address)).size !== gifts.length) throw new Error('A package is listed twice');
    // Nine gifts at the cap would be more than there is: the whole batch is held to the cap of one gift.
    if (gifts.reduce((sum, g) => sum + g.sats, 0n) > CAP_SATS) throw new Error('The batch is over the cap');
    const pair = (address: string, sats: bigint): string => `&addr=${address}&amount=${bip21Amount(sats)}`;
    let tail = '';
    let marker = '';
    if (p.paid !== undefined) {
        const maker = parseEcashAddress(p.paid.offer.payTo);
        if (maker === null || !isValidOffer(p.paid.offer)) throw new Error('Not a valid offer');
        if (gifts.some(g => g.address === maker.address)) throw new Error('The price cannot be paid to a package');
        marker = `&op_return_raw=${batchOpReturnRaw(p.paid.wrapper, gifts.map(g => g.hash))}`;
        tail = pair(maker.address, p.paid.offer.sats);
    }
    const [first, ...rest] = gifts;
    return roads(`${first!.address}?amount=${bip21Amount(first!.sats)}${marker}${rest.map(g => pair(g.address, g.sats)).join('')}${tail}`);
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
    return roads(bip21);
}

/**
 * The roads for sending ONE token to several packages with one transaction:
 * `ecash:<package 1>?token_id=<id>&token_decimalized_qty=<qty 1>&addr=<package 2>&token_decimalized_qty=<qty 2>…`,
 * the shape Cashtab's own BIP21 parser reads and a real Cashtab wallet was seen to send as written (each package
 * its own amount, in order). Such a request carries no XEC amount and no data of ours: the XEC of the gifts, and
 * a wrapper's price, go by their own request (`batchFundLinks`).
 *
 * Two to nine packages, none twice. As with `tokenFundLinks`, nothing but a token id and plain decimal numbers
 * may reach the link. Throws on anything else.
 */
export function batchTokenFundLinks(p: { gifts: readonly { readonly address: string; readonly qty: string }[]; tokenId: string }): FundLinks {
    if (!Array.isArray(p.gifts) || p.gifts.length < 2 || p.gifts.length > BATCH_MAX) throw new Error('A batch is two to nine gifts');
    if (typeof p.tokenId !== 'string' || !/^[0-9a-f]{64}$/.test(p.tokenId)) throw new Error('Not a token id');
    const gifts = p.gifts.map(g => {
        const parsed = parseEcashAddress(g.address);
        if (parsed === null || parsed.type !== 'p2pkh') throw new Error('Not a valid ecash: P2PKH address');
        if (typeof g.qty !== 'string' || g.qty.length > 30 || !/^\d+(\.\d+)?$/.test(g.qty) || /^[0.]+$/.test(g.qty)) throw new Error('Not a quantity');
        return { address: parsed.address, qty: g.qty };
    });
    if (new Set(gifts.map(g => g.address)).size !== gifts.length) throw new Error('A package is listed twice');
    const [first, ...rest] = gifts;
    return roads(`${first!.address}?token_id=${p.tokenId}&token_decimalized_qty=${first!.qty}${rest.map(g => `&addr=${g.address}&token_decimalized_qty=${g.qty}`).join('')}`);
}
