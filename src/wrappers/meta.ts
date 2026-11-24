import type { WrapperDef } from '../stage/format';
import { DEFAULT_WRAPPER } from '../core/limits';
import { isValidOffer } from '../core/offer';
import type { PastTerms, WrapperOffer } from '../core';

/**
 * The price table: what it costs to send a gift in a wrapper, and who is
 * paid. It ships with the page and nothing else is ever consulted — not the
 * link, not the chain. A wrapper that is not named here is free. How a price
 * is paid and checked: `src/core/stamp.ts`.
 *
 * Set on 14 November 2026:
 * four wrappers at 10,000 XEC, five at 5,000 XEC, paid to the project's own
 * address. 1 XEC is 100 sats. On 16 November 2026 a fifth at 10,000 XEC (orbit).
 * On 17 November 2026 a sixth at 5,000 XEC (cylinder), then
 * one more at 10,000 XEC (beacon) and two more at 5,000 XEC (airmail, keys).
 * On 22 November 2026 one more at 10,000 XEC (pop) and one at 5,000 XEC (terminal).
 */
const PROJECT_ADDRESS = 'ecash:qr38yephwnwfv5pp0r6w7hxcp25607keg5uratxner';
const XEC = 100n;
const PRICES: Readonly<Record<string, bigint>> = {
    archmoon: 10_000n * XEC,
    rangoli: 10_000n * XEC,
    lace: 10_000n * XEC,
    dopaper: 10_000n * XEC,
    orbit: 10_000n * XEC,
    beacon: 10_000n * XEC,
    pop: 10_000n * XEC,
    basket: 5_000n * XEC,
    paperbag: 5_000n * XEC,
    diploma: 5_000n * XEC,
    skyline: 5_000n * XEC,
    lantern: 5_000n * XEC,
    cylinder: 5_000n * XEC,
    airmail: 5_000n * XEC,
    keys: 5_000n * XEC,
    terminal: 5_000n * XEC,
};
/**
 * What a wrapper cost before its price (or the address that is paid) changed, so that gifts paid for then keep
 * their wrapper. To change a price: move the old line here with the last block height at which it counts (about a
 * week after the change, so that pages still open in someone's browser sell correctly meanwhile; the height of
 * the change itself when an address is given up because its key may be known to someone else), then set the
 * new price above. A line here is never edited or removed (`prices.test.ts`). A wrapper that went out free stays
 * free: gifts made while it was free carry no payment to look for.
 */
const EARLIER: Readonly<Record<string, readonly PastTerms[]>> = {};
const OFFERS = new Map<string, WrapperOffer>(
    Object.entries(PRICES).map(([id, sats]) => {
        const earlier = EARLIER[id];
        return [id, { sats, payTo: PROJECT_ADDRESS, ...(earlier !== undefined && earlier.length > 0 ? { earlier } : {}) }];
    }),
);

export type Offer = { readonly kind: 'free' } | ({ readonly kind: 'paid' } & WrapperOffer);

/**
 * The wrappers made for a holiday (new year and Tet, mid-autumn, Eid, Diwali, Halloween, Christmas). The shelf can
 * be narrowed to them; nothing else reads this.
 */
const HOLIDAY: ReadonlySet<string> = new Set([
    'lixi', 'dopaper', 'fireworks', 'lantern', 'archmoon', 'rangoli', 'pumpkin', 'snowbox',
    'hanukkiah', 'harvest', 'bauble', 'shutters', 'fir',
    'midnight', 'balldrop', 'confetti',
    'candybox', 'papercut', 'firecrackers',
]);
export function isHoliday(def: Pick<WrapperDef, 'id'>): boolean {
    return HOLIDAY.has(def.id);
}

/** The default wrapper is always free: it is what a gift falls back to when a paid wrapper was not paid for. */
export function offerOf(def: Pick<WrapperDef, 'id'>): Offer {
    const o = OFFERS.get(def.id);
    return o !== undefined && def.id !== DEFAULT_WRAPPER && isValidOffer(o) ? { kind: 'paid', ...o } : { kind: 'free' };
}

/** For tests and the dev demo only: put a price on a wrapper, or take it off (`null`). Nothing in the app calls this. */
export function setOfferForDev(id: string, offer: WrapperOffer | null): void {
    if (offer === null) OFFERS.delete(id);
    else OFFERS.set(id, offer);
}

/**
 * A wrapper's own words (its name, its blurb) exist in Vietnamese and in
 * English. The page speaks more languages than that: every other one reads
 * the English.
 */
export function inLang(text: Readonly<Record<'vi' | 'en', string>>, lang: string): string {
    return lang === 'vi' ? text.vi : text.en;
}

