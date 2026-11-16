import type { PackageKey } from '../core';

/**
 * The package this page made, held ONLY in memory. A reload loses it, on
 * purpose: the Fund button exists only in the session that made the key.
 * Never written to any storage.
 */
export interface Made {
    readonly secret: Uint8Array;
    readonly key: PackageKey;
    readonly link: string;
    readonly sats: bigint;
    readonly wrapper: string;
    /** How the giver dressed the wrapper: the recipe that is in the link. Absent for the wrapper as it is. */
    readonly recipe?: string;
    /** The giver's words, as typed: for the giver's own record of the gift. */
    readonly wish?: string;
    /** The question of the riddle lock, when the gift has one. The answer is not kept. */
    readonly riddle?: string;
    /** The giver means to give a token: the XEC is only what the recipient needs to take it home. */
    readonly tokenOnly?: boolean;
    /** The giver added this much on top of the gift, so the recipient's network fee is paid for. */
    readonly feeCovered?: bigint;
    /** The giver said the gift will also carry a token. */
    readonly withToken?: boolean;
    saved: boolean;
    /** The one chance to remember this gift without a press was spent: a record taken back out stays out. */
    autoSent?: boolean;
}

let made: Made | null = null;

export function setMade(m: Made): void {
    made = m;
}
export function getMade(): Made | null {
    return made;
}
export function markSaved(): void {
    if (made) made.saved = true;
}
export function clearMade(): void {
    made = null;
}
