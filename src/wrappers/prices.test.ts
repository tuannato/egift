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

describe('the price table', () => {
    it('fourteen wrappers have a price, paid to the project; every other wrapper is free', () => {
        for (const w of WRAPPERS) {
            const o = offerOf(w);
            const want = PRICED[w.id];
            if (want === undefined) expect(o, w.id).toEqual({ kind: 'free' });
            else expect(o, w.id).toEqual({ kind: 'paid', sats: want, payTo: PROJECT });
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

    it('the wrapper an unpaid gift falls back to is free', () => {
        expect(PRICED[DEFAULT_WRAPPER]).toBeUndefined();
        expect(offerOf({ id: DEFAULT_WRAPPER })).toEqual({ kind: 'free' });
    });
});
