/**
 * The tokens of a gift, on screen.
 *
 * A token names itself, and anyone can send one to a gift. So:
 * - only the GIVER's token is shown by name, and its name is a stranger's
 *   text: through `setUserText`, cut short, with the line that says what it is;
 * - a token of unknown origin shows its id and its amount only, behind a
 *   press, and is carried home only if the reader picks it;
 * - a token amount is never dressed as an XEC amount, and a ticker that
 *   looks like XEC is called out.
 */
import { formatAtoms } from '../core/money';
import type { GiftToken, TokenMeta } from '../core';
import { h } from './dom';
import { explorerRef } from './explorer';
import { getLang, t } from '../i18n';
import { setUserText } from './text';

/** The longest token name or ticker shown. */
export const TOKEN_TEXT_MAX = 32;

const cut = (s: string, max = TOKEN_TEXT_MAX): string => [...s].slice(0, max).join('');
/** A token's own text, cut to what one line can hold. Still a stranger's text: show it through `setUserText`. */
export const cutTokenText = cut;

/**
 * A token's icon. The chain keeps no pictures: they live on one outside host,
 * the one Cashtab reads them from, and asking it tells that host which token
 * this visitor is looking at (never the link: the page sends no referrer).
 * So an icon is asked for only where a token is already shown by name — the
 * giver's own token, or an id its sender has just typed. It is a picture
 * anyone can upload: decoration beside the id, never proof of what the token is.
 */
export const TOKEN_ICON_HOST = 'https://icons.etokens.cash';
let iconSrc: (tokenId: string) => string | null = id => `${TOKEN_ICON_HOST}/64/${id}.png`;
/** The demo and the tests draw a stand-in instead: nothing leaves the page. */
export function setTokenIconSource(fn: (tokenId: string) => string | null): void {
    iconSrc = fn;
}
export function tokenIcon(tokenId: string): HTMLElement | null {
    if (!/^[0-9a-f]{64}$/.test(tokenId)) return null;
    const src = iconSrc(tokenId);
    if (src === null) return null;
    const img = h('img', { class: 'token-icon', src, alt: '', width: '28', height: '28', decoding: 'async', referrerpolicy: 'no-referrer' });
    // Most tokens have no icon: then there is simply none.
    img.addEventListener('error', () => img.remove());
    return img;
}

/** "id abc123…def456", the id a press away from the explorer. The words come from the page's language, the id from the chain. */
export function tokenIdRef(id: string, before = ''): HTMLElement {
    const [head, tail] = t('pkg.tok.id', { id: '\u0000' }).split('\u0000');
    return h('span', { class: 'token-id' }, before + (head ?? ''), explorerRef('token', id, shortTokenId(id)), tail ?? '');
}

export function shortTokenId(id: string): string {
    return `${id.slice(0, 6)}…${id.slice(-6)}`;
}

/** Letters of other alphabets that are drawn like Latin ones, folded to the Latin letter they imitate. */
const LOOKALIKE: Record<string, string> = {
    а: 'a', в: 'b', с: 'c', ԁ: 'd', е: 'e', һ: 'h', і: 'i', ј: 'j', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', ѕ: 's', т: 't', у: 'y', х: 'x',
    α: 'a', β: 'b', ϲ: 'c', δ: 'd', ε: 'e', η: 'n', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', σ: 'c', ς: 'c', τ: 't', υ: 'u', χ: 'x', ξ: 'e',
};

/**
 * A ticker or name passing itself off as money. Anything that CONTAINS the
 * coin's name counts ("1000 XEC", "eCash Gift"), written in Latin letters or
 * in look-alike letters of another alphabet ("ХЕС" in Cyrillic), and so do
 * the names of other well-known currencies. A ticker written with any letter
 * that is not plain ASCII counts too (a ticker has no reason to carry one; a
 * name may be in any language).
 */
export function looksLikeXec(s: string, ticker = false): boolean {
    // Fold the look-alikes first: normalising would turn some of them (the lunate sigma) into other letters.
    const folded = [...[...s.toLowerCase()].map(ch => LOOKALIKE[ch] ?? ch).join('').normalize('NFKD')].map(ch => LOOKALIKE[ch] ?? ch).join('');
    const plain = folded.replace(/[^a-z0-9]/g, '');
    if (/xec|x3c|ecash|bitcoin|btc|usd|dollar|tether|ethereum|dogecoin|euro/.test(plain)) return true;
    if (['bch', 'btc', 'eth', 'vnd', 'eur', 'xrp', 'bnb', 'sol', 'doge'].includes(plain)) return true;
    // A currency code standing as a word of its own inside a name: "1.000.000 VND".
    if (/(^|[^a-z])(btc|bch|eth|vnd|eur)([^a-z]|$)/.test(folded)) return true;
    // eslint-disable-next-line no-control-regex
    return ticker && /[^\x00-\x7f]/.test(s);
}

function amountText(tk: GiftToken, meta: TokenMeta | null | undefined): string {
    return formatAtoms(tk.atoms, meta?.decimals ?? 0, getLang());
}

/** The card of the token that goes home with the gift. */
export function tokenCard(tk: GiftToken, meta: TokenMeta | null | undefined, lead = false): HTMLElement {
    const kind = t(tk.kind === 'nft' ? 'pkg.tok.kind.nft' : 'pkg.tok.kind.token');
    const card = h('div', { class: 'token-card' + (lead ? ' token-card--lead' : '') }, h('p', { class: 'label' }, t(lead ? 'pkg.tok.label.lead' : 'pkg.tok.label')));
    const line = h('p', { class: 'token-line' }, h('span', { class: 'token-qty' }, amountText(tk, meta)));
    if (tk.origin === 'giver' && meta) {
        const ticker = h('span', { class: 'token-ticker' });
        setUserText(ticker, cut(meta.ticker));
        const name = h('p', { class: 'token-name' });
        setUserText(name, cut(meta.name));
        line.append(' ', ticker);
        line.prepend(tokenIcon(tk.tokenId) ?? '');
        card.append(line, name);
        if (looksLikeXec(meta.ticker, true) || looksLikeXec(meta.name)) card.append(h('p', { class: 'warning danger' }, t('pkg.tok.xec')));
        card.append(h('p', { class: 'note' }, tokenIdRef(tk.tokenId, `${kind} · `)), h('p', { class: 'note' }, t('pkg.tok.claim')));
    } else {
        // Origin unknown (or the token would not describe itself): no name, ever.
        card.append(line, h('p', { class: 'token-name' }, t('pkg.tok.unknown')), h('p', { class: 'note' }, tokenIdRef(tk.tokenId, `${kind} · `)));
    }
    return card;
}

/**
 * The tokens that do not go home by default: a count, and behind a press
 * their ids and amounts with a way to pick one instead.
 */
export function otherTokens(o: { tokens: readonly GiftToken[]; metas: ReadonlyMap<string, TokenMeta | null>; picked: string | null; locked: boolean; onPick(tokenId: string | null): void }): HTMLElement | null {
    const rest = o.tokens.filter(tk => tk.tokenId !== o.picked);
    if (rest.length === 0 && o.picked === null) return null;
    const list = h('div', { class: 'stack token-others-list', hidden: true });
    // Filled on the first press, not before: until then not even an amount of a stranger's token is in the page.
    const fill = (): void => {
        if (list.firstChild) return;
        list.append(h('p', { class: 'note' }, t('pkg.tok.others.why')), h('p', { class: 'note' }, t('pkg.tok.one')));
        for (const tk of rest) {
            list.append(
                h(
                    'div',
                    { class: 'token-other' },
                    h('p', { class: 'mono' }, explorerRef('token', tk.tokenId, shortTokenId(tk.tokenId)), ` · ${amountText(tk, o.metas.get(tk.tokenId))}`),
                    h('button', { type: 'button', class: 'btn btn-secondary btn-small', disabled: o.locked, onclick: () => o.onPick(tk.tokenId) }, t('pkg.tok.pick')),
                ),
            );
        }
        if (o.picked !== null) list.append(h('button', { type: 'button', class: 'btn btn-quiet btn-small', disabled: o.locked, onclick: () => o.onPick(null) }, t('pkg.tok.unpick')));
    };
    const toggle = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-quiet btn-small token-others-toggle',
            'aria-expanded': 'false',
            onclick: () => {
                fill();
                list.hidden = !list.hidden;
                toggle.setAttribute('aria-expanded', String(!list.hidden));
            },
        },
        rest.length > 0 ? t('pkg.tok.others', { n: rest.length }) : t('pkg.tok.change'),
    );
    return h('div', { class: 'token-others' }, toggle, list);
}
