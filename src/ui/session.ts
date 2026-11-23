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
    /** What the giver calls this gift, for their own record. Never in the link. */
    readonly name?: string;
    saved: boolean;
    /** The one chance to remember this gift without a press was spent: a record taken back out stays out. */
    autoSent?: boolean;
}

let made: Made | null = null;

export function setMade(m: Made): void {
    batch = null;
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

/** One gift of a batch: its own key and amount, and what the giver calls it. */
export interface BatchGift {
    /** The giver's name for it, or '' (then its number stands for it). */
    readonly name: string;
    readonly key: PackageKey;
    /** What this gift is funded with (the fee the giver covers included). */
    readonly sats: bigint;
    /** Its own link. Absent when the whole batch shares one link (`MadeBatch.link`). */
    readonly link?: string;
    /** Locked with an answer of its own rather than the one all share. Only that it is so: never the answer. */
    readonly own?: boolean;
}

/**
 * Several gifts made by one press, held ONLY in memory, like `Made`. Two kinds:
 * - `links`: each gift has its own secret and its own link;
 * - `answers`: one secret and ONE link for all; each gift's key comes from that secret and its own answer.
 * The answers are not kept, here or anywhere.
 */
export interface MadeBatch {
    readonly kind: 'links' | 'answers';
    readonly gifts: readonly BatchGift[];
    /** The one link of an `answers` batch. */
    readonly link?: string;
    readonly wrapper: string;
    readonly recipe?: string;
    readonly wish?: string;
    /** The question of the riddle lock, when the gifts have one. */
    readonly riddle?: string;
    /** What the giver added to EACH gift for the recipient's fee. */
    readonly feeCovered?: bigint;
    /** When the batch was made: one time for all its records. */
    readonly at: number;
    saved: boolean;
    /** A wallet was opened with the request to fund the whole batch. */
    opened: boolean;
}

let batch: MadeBatch | null = null;

/** A batch takes the place of a single gift, and the other way round: one thing is "being made" at a time. */
export function setBatch(b: MadeBatch): void {
    made = null;
    batch = b;
}
export function getBatch(): MadeBatch | null {
    return batch;
}
export function clearBatch(): void {
    batch = null;
}
/** Something made in this tab is still held: its screen is the only way back to its keys. */
export function hasMade(): boolean {
    return made !== null || batch !== null;
}
