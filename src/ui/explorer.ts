import { t } from '../i18n';
import { h, openOut } from './dom';

/**
 * The way out to the block explorer: a package's address, a transaction, a token, shown there in a new tab.
 *
 * Never a link in the page (the gift screens carry none): a button that opens one fixed site at a path built from
 * an address or an id of the one shape each has. Nothing secret can be put in it: a package's address and a
 * transaction's id are public, and the page's own link never comes near this file.
 */
const EXPLORER = 'https://explorer.e.cash';
const ADDRESS = /^ecash:[qp][a-z0-9]{41}$/;
const ID = /^[0-9a-f]{64}$/;

/** Where the explorer shows it, or null for anything that is not an address or an id. A token's page is its first transaction's. */
export function explorerUrl(kind: 'address' | 'tx' | 'token', id: string): string | null {
    if (kind === 'address') return ADDRESS.test(id) ? `${EXPLORER}/address/${id}` : null;
    return ID.test(id) ? `${EXPLORER}/tx/${id}` : null;
}

/** A short reference (`qz8t…05zx`) that opens the explorer on a press. Plain text when there is nowhere to go. */
export function explorerRef(kind: 'address' | 'tx' | 'token', id: string, text: string): HTMLElement {
    const url = explorerUrl(kind, id);
    if (url === null) return h('span', { class: 'mono' }, text);
    return h('button', { type: 'button', class: 'ref-out mono', 'aria-label': t('ref.explorer', { id: text }), onclick: () => openOut(url) }, text, h('span', { class: 'ref-out-mark', 'aria-hidden': 'true' }, '↗'));
}

/** A button with words on it that opens the explorer; null when there is nowhere to go. */
export function explorerButton(kind: 'address' | 'tx' | 'token', id: string, label: string): HTMLElement | null {
    const url = explorerUrl(kind, id);
    return url === null ? null : h('button', { type: 'button', class: 'btn btn-quiet btn-small btn-out', onclick: () => openOut(url) }, label);
}
