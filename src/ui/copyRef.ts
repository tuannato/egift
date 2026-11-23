import { t } from '../i18n';
import { h } from './dom';
import { copyText } from './linkBox';

/**
 * A package's short reference (`qz8t…05zx`) that copies the whole address on a press: on the giver's own screens
 * only, where the address is theirs to hand to a wallet. An address is public: it is where a gift is, never its key.
 * If the browser will not copy, the whole address is shown beside it, to be copied by hand.
 */
export function copyRef(address: string, text: string): HTMLElement {
    const said = h('span', { class: 'ref-said', role: 'status', 'aria-live': 'polite' });
    let back: ReturnType<typeof setTimeout> | undefined;
    const btn = h(
        'button',
        {
            type: 'button',
            class: 'ref-out ref-copy mono',
            'aria-label': t('ref.copy', { id: text }),
            onclick: () => {
                void copyText(address).then(ok => {
                    clearTimeout(back);
                    said.classList.toggle('ref-said--whole', !ok);
                    said.textContent = ok ? t('link.copied') : address;
                    if (ok) back = setTimeout(() => (said.textContent = ''), 2500);
                });
            },
        },
        text,
        h('span', { class: 'ref-out-mark', 'aria-hidden': 'true' }, '⧉'),
    );
    return h('span', { class: 'ref-copy-wrap' }, btn, said);
}
