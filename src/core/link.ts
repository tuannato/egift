import type { PackageLink } from './types';
import { RIDDLE_MAX_BYTES, WISH_MAX_BYTES } from './limits';

/*
 * Fragment grammar (everything after `#`):
 *
 *   1.<flags>.<secret>.<wrapper>[.<item>][.<recipe>][.<wish>][.<riddle>][.<spot>]
 *
 * flags: a decimal number 0..63 with no leading zero; bit0 item, bit1 recipe,
 * bit2 wish, bit3 riddle, bit4 spot (only together with a riddle), bit5 "shared by several" (only with a riddle,
 * never with a spot, and with no field of its own). Optional
 * fields appear in that order, exactly when their bit is set. Every field has one canonical spelling, so a link decodes
 * to one value and back to the same string; anything else decodes to `null`.
 *
 * A riddle link carries the question. The answer is nowhere: the key comes
 * from the secret AND the answer (see `riddle.ts`). Unless its giver chose
 * otherwise it also carries the spot, the public key hash of the gift's
 * address, so that a page can tell whether the gift is still there before it
 * is answered. A link without a riddle never carries one: its secret already
 * names the address.
 */

const MAX_FRAGMENT_CHARS = 720;
const SECRET_BYTES = 16;
const MAX_ITEM_SATS = 2_100_000_000_000_000n;

const WRAPPER_RE = /^[a-z0-9-]{1,24}$/;
const RECIPE_RE = /^[A-Za-z0-9_-]{1,64}$/;
const TOKEN_ID_RE = /^[0-9a-f]{64}$/;
const SATS_RE = /^[1-9][0-9]{0,15}$/;
const FLAGS_RE = /^(?:[0-9]|[1-5][0-9]|6[0-3])$/;
const PKH_BYTES = 20;
const B64URL_RE = /^[A-Za-z0-9_-]*$/;

const FLAG_ITEM = 1;
const FLAG_RECIPE = 2;
const FLAG_WISH = 4;
const FLAG_RIDDLE = 8;
const FLAG_SPOT = 16;
/** No field of its own: the link is shared by several people, each with an answer of their own. */
const FLAG_MANY = 32;

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** base64url without padding. */
function b64urlEncode(bytes: Uint8Array): string {
    let out = '';
    let i = 0;
    for (; i + 3 <= bytes.length; i += 3) {
        const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
        out += B64URL[(n >> 18) & 63]! + B64URL[(n >> 12) & 63]! + B64URL[(n >> 6) & 63]! + B64URL[n & 63]!;
    }
    const rest = bytes.length - i;
    if (rest === 1) {
        const n = bytes[i]! << 16;
        out += B64URL[(n >> 18) & 63]! + B64URL[(n >> 12) & 63]!;
    } else if (rest === 2) {
        const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
        out += B64URL[(n >> 18) & 63]! + B64URL[(n >> 12) & 63]! + B64URL[(n >> 6) & 63]!;
    }
    return out;
}

/**
 * Strict base64url decode: no padding, and only the canonical spelling
 * (re-encoding must give back the input), so one value has one link.
 */
function b64urlDecode(s: string): Uint8Array | null {
    if (!B64URL_RE.test(s) || s.length % 4 === 1) return null;
    const bytes = new Uint8Array(Math.floor((s.length * 3) / 4));
    let acc = 0;
    let bits = 0;
    let j = 0;
    for (let i = 0; i < s.length; i++) {
        acc = (acc << 6) | B64URL.indexOf(s[i]!);
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            bytes[j++] = (acc >> bits) & 0xff;
            acc &= (1 << bits) - 1;
        }
    }
    if (j !== bytes.length) return null;
    return b64urlEncode(bytes) === s ? bytes : null;
}

/** The wish as it is stored: trimmed, NFC. */
function normaliseWish(wish: string): string {
    return wish.trim().normalize('NFC');
}

/** 16 fresh random bytes from `crypto.getRandomValues`. Only ever called from an explicit user gesture. */
export function newSecret(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
}

/** UTF-8 byte length of a riddle's question, as the limit counts it. */
export function riddleBytes(question: string): number {
    return new TextEncoder().encode(normaliseWish(question)).length;
}

/** UTF-8 byte length of a wish, as the limit counts it. */
export function wishBytes(wish: string): number {
    return new TextEncoder().encode(normaliseWish(wish)).length;
}

/**
 * The full link: `<origin>/<wrapper>/#1.<flags>.<secret>.<wrapper>[.<item>][.<recipe>][.<wish>][.<riddle>][.<spot>]`.
 *
 * The wrapper's id is also the page's path, so that the host can serve that
 * wrapper's own share card (a chat app never sees what follows `#`). The path
 * says nothing the fragment does not; the page reads the fragment only, and a
 * link without the path (`<origin>/#1.…`, how links were first written) opens
 * the same gift.
 * Throws on a wish over the limit or a malformed field. Error messages never
 * contain the secret.
 */
export function encodeLink(link: PackageLink, origin: string): string {
    if (link.version !== 1) throw new Error('Unsupported link version');
    if (!(link.secret instanceof Uint8Array) || link.secret.length !== SECRET_BYTES) {
        throw new Error('The secret must be 16 bytes');
    }
    if (typeof link.wrapper !== 'string' || !WRAPPER_RE.test(link.wrapper)) {
        throw new Error('Invalid wrapper id');
    }
    let flags = 0;
    const tail: string[] = [];
    if (link.item !== undefined) {
        const { tokenId, maxSats } = link.item;
        if (typeof tokenId !== 'string' || !TOKEN_ID_RE.test(tokenId)) throw new Error('Invalid item token id');
        if (typeof maxSats !== 'bigint' || maxSats < 1n || maxSats > MAX_ITEM_SATS) {
            throw new Error('Invalid item price limit');
        }
        flags |= FLAG_ITEM;
        tail.push(`${tokenId}-${maxSats.toString()}`);
    }
    if (link.recipe !== undefined) {
        if (typeof link.recipe !== 'string' || !RECIPE_RE.test(link.recipe)) throw new Error('Invalid recipe');
        flags |= FLAG_RECIPE;
        tail.push(link.recipe);
    }
    if (link.wish !== undefined) {
        if (typeof link.wish !== 'string') throw new Error('Invalid wish');
        const bytes = new TextEncoder().encode(normaliseWish(link.wish));
        if (bytes.length === 0) throw new Error('The wish is empty');
        if (bytes.length > WISH_MAX_BYTES) throw new Error(`The wish is over ${WISH_MAX_BYTES} bytes`);
        flags |= FLAG_WISH;
        tail.push(b64urlEncode(bytes));
    }
    if (link.riddle !== undefined) {
        if (typeof link.riddle !== 'string') throw new Error('Invalid riddle');
        const bytes = new TextEncoder().encode(normaliseWish(link.riddle));
        if (bytes.length === 0) throw new Error('The riddle is empty');
        if (bytes.length > RIDDLE_MAX_BYTES) throw new Error(`The riddle is over ${RIDDLE_MAX_BYTES} bytes`);
        flags |= FLAG_RIDDLE;
        tail.push(b64urlEncode(bytes));
    }
    if (link.spot !== undefined) {
        if (link.riddle === undefined) throw new Error('Only a riddle link carries a spot');
        if (!(link.spot instanceof Uint8Array) || link.spot.length !== PKH_BYTES) throw new Error('Invalid spot');
        flags |= FLAG_SPOT;
        tail.push(b64urlEncode(link.spot));
    }
    if (link.many !== undefined) {
        if (link.many !== true) throw new Error('Invalid mark');
        // Several gifts behind one link have several addresses: there is no one spot to name.
        if (link.riddle === undefined || link.spot !== undefined) throw new Error('Only a riddle link without a spot is shared by several');
        flags |= FLAG_MANY;
    }
    const fragment = ['1', String(flags), b64urlEncode(link.secret), link.wrapper, ...tail].join('.');
    return `${origin.replace(/\/+$/, '')}/${link.wrapper}/#${fragment}`;
}

/** Parse `location.hash` (with or without the leading `#`). `null` for anything that is not a well-formed Gift link. Never throws. */
export function decodeFragment(hash: string): PackageLink | null {
    try {
        return decodeStrict(hash);
    } catch {
        return null;
    }
}

function decodeStrict(hash: string): PackageLink | null {
    if (typeof hash !== 'string') return null;
    const frag = hash.startsWith('#') ? hash.slice(1) : hash;
    if (frag.length === 0 || frag.length > MAX_FRAGMENT_CHARS) return null;

    const parts = frag.split('.');
    if (parts.length < 4 || parts[0] !== '1' || !FLAGS_RE.test(parts[1]!)) return null;
    const flags = Number(parts[1]);
    // A spot belongs to a riddle: without one it would say nothing the secret does not.
    if (flags & FLAG_SPOT && !(flags & FLAG_RIDDLE)) return null;
    // Shared by several: a riddle link, and one that names no single address.
    if (flags & FLAG_MANY && (!(flags & FLAG_RIDDLE) || flags & FLAG_SPOT)) return null;
    const optionalCount = (flags & 1) + ((flags >> 1) & 1) + ((flags >> 2) & 1) + ((flags >> 3) & 1) + ((flags >> 4) & 1);
    if (parts.length !== 4 + optionalCount) return null;

    const secret = b64urlDecode(parts[2]!);
    if (secret === null || secret.length !== SECRET_BYTES) return null;
    const wrapper = parts[3]!;
    if (!WRAPPER_RE.test(wrapper)) return null;

    let next = 4;
    let item: PackageLink['item'];
    let recipe: string | undefined;
    let wish: string | undefined;
    let riddle: string | undefined;
    let spot: Uint8Array | undefined;

    if (flags & FLAG_ITEM) {
        const field = parts[next++]!;
        const dash = field.indexOf('-');
        if (dash !== 64) return null;
        const tokenId = field.slice(0, 64);
        const satsStr = field.slice(65);
        if (!TOKEN_ID_RE.test(tokenId) || !SATS_RE.test(satsStr)) return null;
        const maxSats = BigInt(satsStr);
        if (maxSats > MAX_ITEM_SATS) return null;
        item = { tokenId, maxSats };
    }
    if (flags & FLAG_RECIPE) {
        const field = parts[next++]!;
        if (!RECIPE_RE.test(field)) return null;
        recipe = field;
    }
    if (flags & FLAG_WISH) {
        const bytes = b64urlDecode(parts[next++]!);
        if (bytes === null || bytes.length === 0 || bytes.length > WISH_MAX_BYTES) return null;
        const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
        // Only the form encodeLink writes is accepted, so a hand-made link
        // cannot hide leading/trailing blanks or a non-NFC spelling.
        if (normaliseWish(text) !== text) return null;
        wish = text;
    }
    if (flags & FLAG_RIDDLE) {
        const bytes = b64urlDecode(parts[next++]!);
        if (bytes === null || bytes.length === 0 || bytes.length > RIDDLE_MAX_BYTES) return null;
        const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
        if (normaliseWish(text) !== text) return null;
        riddle = text;
    }
    if (flags & FLAG_SPOT) {
        const bytes = b64urlDecode(parts[next++]!);
        if (bytes === null || bytes.length !== PKH_BYTES) return null;
        spot = bytes;
    }

    const link: { -readonly [K in keyof PackageLink]: PackageLink[K] } = { version: 1, secret, wrapper };
    if (item !== undefined) link.item = item;
    if (recipe !== undefined) link.recipe = recipe;
    if (wish !== undefined) link.wish = wish;
    if (riddle !== undefined) link.riddle = riddle;
    if (spot !== undefined) link.spot = spot;
    if (flags & FLAG_MANY) link.many = true;
    return link;
}
