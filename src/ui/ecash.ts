/**
 * The page's own word "eCash", wherever its own texts say it: set apart, and
 * a way to e.cash for someone who wants to know what it is.
 *
 * Only for the fixed strings shipped with the page (`t(...)`). A stranger's
 * text never comes through here: it stays plain text and makes no links.
 */
import { h } from './dom';
import { t } from '../i18n';
import type { Key } from '../i18n';

export const ECASH_URL = 'https://e.cash';

/** The text of `key`, with every "eCash" in it as a link. */
export function rich(key: Key): (Node | string)[] {
    const parts = t(key).split('eCash');
    const out: (Node | string)[] = [];
    parts.forEach((part, i) => {
        if (part !== '') out.push(part);
        // A new tab that is told nothing about this one: no opener, no referrer (the link in the address bar stays here).
        if (i < parts.length - 1) out.push(h('a', { class: 'ecash', href: ECASH_URL, target: '_blank', rel: 'noopener noreferrer' }, 'eCash'));
    });
    return out;
}
