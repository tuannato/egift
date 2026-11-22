/**
 * The price table that ships with the page.
 * A price or the address that is paid is never changed by accident: this
 * file says what the owner decided, and a change here is a decision too.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_WRAPPER, isValidOffer } from '../core';
import { parseEcashAddress } from '../core/tx';
import { WRAPPERS, offerOf } from './index';

const PROJECT = 'ecash:qr38yephwnwfv5pp0r6w7hxcp25607keg5uratxner';
/** In sats: 1 XEC is 100 sats. */
const PRICED: Record<string, bigint> = {
    archmoon: 1_000_000n,
    rangoli: 1_000_000n,
    lace: 1_000_000n,
    dopaper: 1_000_000n,
    orbit: 1_000_000n,
    basket: 500_000n,
    paperbag: 500_000n,
    diploma: 500_000n,
    skyline: 500_000n,
    lantern: 500_000n,
    cylinder: 500_000n,
    beacon: 1_000_000n,
    airmail: 500_000n,
    keys: 500_000n,
};

/**
 * Earlier prices that are still honoured, by wrapper: what was paid (sats), to whom, and the last block height at
 * which paying it counted. A line is added when a price changes and is never edited or removed afterwards: gifts
 * paid for on those terms would lose their wrapper.
 */
const EARLIER: Record<string, readonly { sats: bigint; payTo: string; until: number }[]> = {};

describe('the price table', () => {
    it('fourteen wrappers have a price, paid to the project; every other wrapper is free', () => {
        for (const w of WRAPPERS) {
            const o = offerOf(w);
            const want = PRICED[w.id];
            if (want === undefined) expect(o, w.id).toEqual({ kind: 'free' });
            else expect(o, w.id).toEqual({ kind: 'paid', sats: want, payTo: PROJECT, ...(EARLIER[w.id] ? { earlier: EARLIER[w.id] } : {}) });
        }
        expect(Object.keys(PRICED).every(id => WRAPPERS.some(w => w.id === id))).toBe(true);
    });

    it('the address that is paid is a real eCash address, and every offer is one a wallet can send', () => {
        expect(parseEcashAddress(PROJECT)).not.toBeNull();
        for (const w of WRAPPERS) {
            const o = offerOf(w);
            if (o.kind === 'paid') expect(isValidOffer(o), w.id).toBe(true);
        }
    });

    it('an earlier price belongs to a wrapper that still has a price, and is one a wallet could send', () => {
        for (const [id, list] of Object.entries(EARLIER)) {
            expect(PRICED[id], id).toBeDefined();
            expect(list.length, id).toBeGreaterThan(0);
            for (const t of list) {
                expect(isValidOffer({ sats: t.sats, payTo: t.payTo, earlier: [t] }), id).toBe(true);
                // A real block height of these years: a digit too many would honour the old price for ever, one too few would strip paid gifts.
                expect(t.until, id).toBeGreaterThan(900_000);
                expect(t.until, id).toBeLessThan(2_000_000);
            }
        }
    });

    it('the wrapper an unpaid gift falls back to is free', () => {
        expect(PRICED[DEFAULT_WRAPPER]).toBeUndefined();
        expect(offerOf({ id: DEFAULT_WRAPPER })).toEqual({ kind: 'free' });
    });
});
