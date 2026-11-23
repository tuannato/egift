import { isInAppBrowser } from './inapp';
import { h, clear } from './dom';
import { t } from '../i18n';
import { qrPanel } from './screens/qr';

/** How long the browser's clipboard is waited for before the copy counts as failed. */
const COPY_WAIT_MS = 1500;

/** The older way to copy, done at once inside the press: a hidden field, selected, and the browser's own "copy". */
function copyByHand(text: string): boolean {
    if (typeof document.execCommand !== 'function') return false;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const field = document.createElement('textarea');
    try {
        field.value = text;
        field.readOnly = true;
        field.className = 'copy-field';
        document.body.append(field);
        field.select();
        field.setSelectionRange(0, text.length);
        return document.execCommand('copy') === true;
    } catch {
        return false;
    } finally {
        field.remove();
        // The press came from a button: the focus goes back to it.
        before?.focus({ preventScroll: true });
    }
}

/**
 * Put `text` on the clipboard. True only when it is known to be there.
 *
 * The older way first, at once, while the press still counts as the person's own: on a phone, after a download,
 * the browser's clipboard may neither succeed nor fail, and by the time that is clear the older way is refused
 * too. Only when the older way cannot copy is the browser's clipboard asked, and never waited on for ever.
 */
export async function copyText(text: string): Promise<boolean> {
    if (copyByHand(text)) return true;
    try {
        if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') return false;
        return await Promise.race([
            navigator.clipboard.writeText(text).then(
                () => true,
                () => false,
            ),
            new Promise<boolean>(res => setTimeout(() => res(false), COPY_WAIT_MS)),
        ]);
    } catch {
        return false;
    }
}

function downloadText(text: string): void {
    const blob = new Blob([text + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gift-link.txt';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Copy / Share (when the browser can) / Download. `onSaved` means SAVED: it is
 * called only after a copy that resolved, a share that resolved, or a download
 * click — or when the person ticks "I copied it by hand", offered after a copy
 * fails (in-app browsers often refuse the clipboard).
 */
/**
 * `primary`: saving the link is the one thing to do next (the created step of one gift), so "copy" is the solid
 * button until the link is saved, by whichever of the ways here.
 */
export function linkButtons(o: { link: string; onSaved: () => void; select?: () => void; download?: boolean; primary?: boolean }): HTMLElement {
    const opts = {
        ...o,
        onSaved: (): void => {
            copy.classList.replace('btn-primary', 'btn-secondary');
            o.onSaved();
        },
    };
    const msg = h('p', { class: 'small', role: 'status', 'aria-live': 'polite' });
    const say = (s: string) => {
        msg.textContent = s;
    };
    const tick = h('input', { type: 'checkbox', class: 'check-box' });
    const manual = h('label', { class: 'check', hidden: true }, tick, h('span', null, t('link.manual')));
    tick.addEventListener('change', () => {
        if (tick.checked) opts.onSaved();
    });
    const copy = h(
        'button',
        {
            type: 'button',
            class: o.primary === true ? 'btn btn-primary' : 'btn btn-secondary',
            onclick: () => {
                void copyText(opts.link).then(ok => {
                    if (ok) {
                        opts.onSaved();
                        say(t('link.copied'));
                    } else {
                        opts.select?.();
                        say(t('link.copyfail'));
                        manual.hidden = false;
                    }
                });
            },
        },
        t('link.copy'),
    );
    const row = h('div', { class: 'btn-row btn-row--equal' }, copy);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        row.append(
            h(
                'button',
                {
                    type: 'button',
                    class: 'btn btn-secondary',
                    onclick: () => {
                        void navigator.share({ url: opts.link }).then(
                            () => {
                                opts.onSaved();
                                say(t('link.shared'));
                            },
                            () => {
                                /* the person closed the sheet: nothing was saved */
                            },
                        );
                    },
                },
                t('link.share'),
            ),
        );
    }
    if (opts.download) {
        row.append(
            h(
                'button',
                {
                    type: 'button',
                    class: 'btn btn-secondary',
                    onclick: () => {
                        try {
                            downloadText(opts.link);
                            // Inside another app's browser a download often does nothing and says nothing: there it
                            // does not count as "saved". Copy the link, or tick the box, instead.
                            if (isInAppBrowser()) {
                                say(t('link.download.inapp'));
                                return;
                            }
                            opts.onSaved();
                            say(t('link.downloaded'));
                        } catch {
                            opts.select?.();
                            say(t('link.copyfail'));
                        }
                    },
                },
                t('link.download'),
            ),
        );
    }
    return h('div', { class: 'link-buttons' }, row, msg, manual);
}

/** The link in a read-only box, with Copy / Share / Download and a QR toggle. */
export function linkBox(opts: { link: string; onSaved: () => void; label?: string; primary?: boolean }): HTMLElement {
    const id = 'lb-' + Math.random().toString(36).slice(2, 8);
    const box = h('textarea', {
        id,
        class: 'linkbox',
        readonly: true,
        rows: Math.min(9, Math.max(3, Math.ceil(opts.link.length / 34))),
        spellcheck: 'false',
        autocapitalize: 'off',
        autocomplete: 'off',
        'aria-label': opts.label ?? t('link.label'),
        onfocus: () => box.select(),
    });
    box.value = opts.link;
    const qrHost = h('div', { class: 'qr-host' });
    let qrOpen = false;
    const toggle = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-quiet',
            'aria-expanded': 'false',
            onclick: () => {
                qrOpen = !qrOpen;
                toggle.setAttribute('aria-expanded', String(qrOpen));
                toggle.textContent = qrOpen ? t('link.qr.hide') : t('link.qr.show');
                clear(qrHost);
                if (qrOpen) qrHost.append(qrPanel({ text: opts.link, title: t('qr.title.link'), warning: t('link.qr.warn') }));
            },
        },
        t('link.qr.show'),
    );
    return h(
        'div',
        { class: 'linkbox-wrap' },
        box,
        linkButtons({ link: opts.link, onSaved: opts.onSaved, select: () => box.select(), download: true, ...(opts.primary === true ? { primary: true } : {}) }),
        toggle,
        qrHost,
    );
}
