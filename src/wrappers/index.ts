import type { WrapperDef } from '../stage/format';
import { DEFAULT_WRAPPER } from '../core/limits';
import { isValidOffer } from '../core/offer';
import type { WrapperOffer } from '../core';
import { lixi } from './lixi';
import { mecha } from './mecha';
import { signal } from './signal';
import { fold } from './fold';
import { cake } from './cake';
import { letter } from './letter';
import { inkwash } from './inkwash';
import { snowbox } from './snowbox';
import { fireworks } from './fireworks';
import { dopaper } from './dopaper';
import { lantern } from './lantern';
import { bouquet } from './bouquet';
import { lace } from './lace';
import { cloudmoon } from './cloudmoon';
import { diploma } from './diploma';
import { wreath } from './wreath';
import { skyline } from './skyline';
import { basket } from './basket';
import { latte } from './latte';
import { dawn } from './dawn';
import { pumpkin } from './pumpkin';
import { rangoli } from './rangoli';
import { paperbag } from './paperbag';
import { archmoon } from './archmoon';

/** The built-in wrappers, in the order the picker shows them. */
import { lock } from './lock';

/**
 * The wrapper of a locked gift, before its riddle is answered: whatever the
 * giver chose is shown only after the right answer. It is not on the shelf,
 * cannot be picked or named by a link, and has no price.
 */
export const LOCK_WRAPPER: WrapperDef = lock;

export const WRAPPERS: readonly WrapperDef[] = [lixi, mecha, signal, fold, cake, letter, inkwash, snowbox, fireworks, dopaper, lantern, bouquet, lace, cloudmoon, diploma, wreath, skyline, basket, latte, dawn, pumpkin, rangoli, paperbag, archmoon];

export function wrapperById(id: string): WrapperDef | undefined {
    return WRAPPERS.find(w => w.id === id);
}

/**
 * The price table: what it costs to send a gift in a wrapper, and who is
 * paid. It ships with the page and nothing else is ever consulted — not the
 * link, not the chain. A wrapper that is not named here is free. How a price
 * is paid and checked: `src/core/stamp.ts`.
 *
 * Set on 14 November 2026:
 * four wrappers at 10,000 XEC, five at 5,000 XEC, paid to the project's own
 * address. 1 XEC is 100 sats.
 */
const PROJECT_ADDRESS = 'ecash:qr38yephwnwfv5pp0r6w7hxcp25607keg5uratxner';
const XEC = 100n;
const PRICES: Readonly<Record<string, bigint>> = {
    archmoon: 10_000n * XEC,
    rangoli: 10_000n * XEC,
    lace: 10_000n * XEC,
    dopaper: 10_000n * XEC,
    basket: 5_000n * XEC,
    paperbag: 5_000n * XEC,
    diploma: 5_000n * XEC,
    skyline: 5_000n * XEC,
    lantern: 5_000n * XEC,
};
const OFFERS = new Map<string, WrapperOffer>(Object.entries(PRICES).map(([id, sats]) => [id, { sats, payTo: PROJECT_ADDRESS }]));

export type Offer = { readonly kind: 'free' } | ({ readonly kind: 'paid' } & WrapperOffer);

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

