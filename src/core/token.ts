import { numberMarks } from './money';
import { toHex } from 'ecash-lib';
import { isMovableToken } from './tokenTx';
import type { Chain, Coin, TokenKind } from './types';

/*
 * The tokens a gift carries, and whose they are.
 *
 * Anyone can send a token to a package address once it is on the chain, and a
 * token names itself. So the page tells apart:
 * - the GIVER's token: the transaction that brought it is the gift's own
 *   funding, or spends from a script that funding also spent from — the
 *   same wallet;
 * - any OTHER token: origin unknown. It is never named on screen and never
 *   taken unless the reader picks it.
 *
 * "The gift's funding" is only knowable while the gift is as the giver left
 * it. Nothing is the giver's when:
 * - anything was ever spent from the package (it was opened once; whoever
 *   refills it afterwards would otherwise pass for the giver);
 * - more than one XEC funding ties for oldest (two unconfirmed ones, or two
 *   in one block): the giver's cannot be told from a stranger's bigger coin;
 * - the funding is a re-key and the token did not arrive in that very
 *   transaction: everyone with the old link still holds the old key.
 *
 * A wallet that uses many addresses can make the giver's own token look like
 * an "other" one. That fails soft: it can still be picked and taken.
 */

export interface GiftToken {
    readonly tokenId: string;
    readonly kind: TokenKind;
    /** Atoms across the coins of this token the page can move. */
    readonly atoms: bigint;
    readonly coins: number;
    /** Every coin of it is final. */
    readonly final: boolean;
    readonly origin: 'giver' | 'other';
}

/** The most token ids whose origin is looked up for one package. */
export const MAX_TOKEN_LOOKUPS = 8;

const age = (c: Coin): number => c.height ?? Infinity;

/** The movable tokens at a package, grouped by id, oldest first. Batons and kinds the page does not move are left out. */
export function holdings(coins: readonly Coin[]): (Omit<GiftToken, 'origin'> & { readonly oldest: Coin })[] {
    const by = new Map<string, Coin[]>();
    for (const c of coins) {
        const id = c.tokenInfo?.tokenId;
        if (id === undefined || !isMovableToken(c, id)) continue;
        by.set(id, [...(by.get(id) ?? []), c]);
    }
    const out = [...by.entries()].map(([tokenId, cs]) => {
        const oldest = [...cs].sort((a, b) => age(a) - age(b) || (a.txid < b.txid ? -1 : 1))[0]!;
        return { tokenId, kind: cs[0]!.tokenInfo!.kind as TokenKind, atoms: cs.reduce((s, c) => s + c.tokenInfo!.atoms, 0n), coins: cs.length, final: cs.every(c => c.final), oldest };
    });
    return out.sort((a, b) => age(a.oldest) - age(b.oldest) || (a.tokenId < b.tokenId ? -1 : 1));
}

/** The "re-keyed" marker, as a whole OP_RETURN output or as a push inside an ALP SEND. */
const REKEY_OP_RETURN = '6a04454749460200' + '02';
const REKEY_PUSH = '06454749460002';

/**
 * The tokens of a gift with their origin, the giver's first.
 *
 * Rejects when the chain could not be asked (or did not know the funding):
 * the caller must then say so, rather than quietly treat the giver's token
 * as a stranger's and leave it behind.
 */
export async function giftTokens(p: { chain: Pick<Chain, 'detail' | 'everSpent'>; coins: readonly Coin[]; pkh: Uint8Array; address: string }): Promise<GiftToken[]> {
    const held = holdings(p.coins);
    if (held.length === 0) return [];
    const strip = (h: (typeof held)[number], origin: GiftToken['origin']): GiftToken => ({ tokenId: h.tokenId, kind: h.kind, atoms: h.atoms, coins: h.coins, final: h.final, origin });
    const strangers = (): GiftToken[] => held.map(h => strip(h, 'other'));
    const detail = p.chain.detail;
    const xec = p.coins.filter(c => c.token !== true).sort((a, b) => age(a) - age(b));
    const funding = xec[0];
    if (detail === undefined || p.chain.everSpent === undefined || funding === undefined) return strangers();
    // Two fundings of the same age: which is the giver's cannot be known.
    if (xec.some(c => c.txid !== funding.txid && age(c) === age(funding))) return strangers();
    // Opened once already: whatever is here now may be anyone's.
    if (await p.chain.everSpent(p.address)) return strangers();

    const own = `76a914${toHex(p.pkh)}88ac`;
    const lower = (s: unknown): string => (typeof s === 'string' ? s.toLowerCase() : '');
    const tx = await detail.call(p.chain, funding.txid);
    if (tx === null) throw new Error('The funding is not known to this node yet');
    const first = lower(tx.outputs[0]?.script);
    const rekeyed = first === REKEY_OP_RETURN || (first.startsWith('6a50') && first.includes(REKEY_PUSH));
    const giver = new Set(tx.inputs.map(lower).filter(s => s !== '' && s !== own));
    // Every other XEC funding must come from the same hand. Otherwise "the oldest funding" may be a stranger's
    // that merely reached a block first, and it is the stranger's token that would be named.
    const others = [...new Set(xec.map(c => c.txid))].filter(id => id !== funding.txid);
    if (others.length > MAX_TOKEN_LOOKUPS) return strangers();
    const fundings = await Promise.all(others.map(id => detail.call(p.chain, id)));
    if (fundings.some(from => from === null)) throw new Error('A funding transaction is not known to this node yet');
    if (fundings.some(from => !from!.inputs.map(lower).some(s => giver.has(s)))) return strangers();
    const out: GiftToken[] = [];
    for (const [i, h] of held.entries()) {
        let origin: GiftToken['origin'] = 'other';
        if (h.oldest.txid === funding.txid) origin = 'giver';
        else if (!rekeyed && giver.size > 0 && i < MAX_TOKEN_LOOKUPS) {
            const from = await detail.call(p.chain, h.oldest.txid);
            if (from === null) throw new Error('A token transaction is not known to this node yet');
            if (from.inputs.map(lower).some(s => giver.has(s))) origin = 'giver';
        }
        out.push(strip(h, origin));
    }
    return [...out.filter(t => t.origin === 'giver'), ...out.filter(t => t.origin === 'other')];
}

/**
 * A token amount as text: atoms with the token's decimals and the language's
 * own separators. The caller never shows it in the style of an XEC amount.
 */
export function formatAtoms(atoms: bigint, decimals: number, lang: string): string {
    const d = Number.isInteger(decimals) && decimals >= 0 && decimals <= 9 ? decimals : 0;
    const neg = atoms < 0n;
    const digits = (neg ? -atoms : atoms).toString().padStart(d + 1, '0');
    const whole = digits.slice(0, digits.length - d);
    const frac = d === 0 ? '' : digits.slice(-d).replace(/0+$/, '');
    const [group, point] = numberMarks(lang);
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, group);
    return (neg ? '-' : '') + grouped + (frac === '' ? '' : point + frac);
}
