import { t } from '../i18n';
import { h } from './dom';
import { copyText } from './linkBox';

/**
 * A package's short reference (`qz8t…05zx`) that copies the whole address on a press: on the giver's own screens
 * only, where the address is theirs to hand to a wallet. An address is public: it is where a gift is, never its key.
 * The whole address is never printed: if the browser will not copy, the page says so and the press can be tried again.
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
                    said.textContent = t(ok ? 'link.copied' : 'ref.copyfail');
                    back = setTimeout(() => (said.textContent = ''), ok ? 2500 : 4000);
                });
            },
        },
        text,
        h('span', { class: 'ref-out-mark', 'aria-hidden': 'true' }, '⧉'),
    );
    return h('span', { class: 'ref-copy-wrap' }, btn, said);
}
