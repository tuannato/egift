import { h } from './dom';
import { explorerRef } from './explorer';
import { noteSvg } from './note';
import { odometer, odometerLength } from './odometer';
import { prefersReducedMotion } from './stageCard';

/** `ecash:qz8t…05zx` → `qz8t…05zx`: the reference for a package. Public data. */
export function shortId(address: string): string {
    const bare = address.includes(':') ? address.slice(address.indexOf(':') + 1) : address;
    return bare.length <= 10 ? bare : bare.slice(0, 4) + '…' + bare.slice(-4);
}

/** How wide a figure is, in digit widths: a separator takes about half a digit. Pure. */
export function figureWidth(text: string): number {
    let w = 0;
    for (const ch of text) w += ch >= '0' && ch <= '9' ? 1 : 0.5;
    return Math.max(w, 2);
}

export interface AmountOpts {
    /** The formatted amount, e.g. `1.234.567,89`. */
    text: string;
    /** A mono label above the figure. */
    label?: string;
    /** The package address: its short id is printed as the reference, and its note is drawn behind. */
    address?: string;
    /** The label printed beside the reference. */
    refLabel?: string;
    /** The reference itself, when it is not the usual one (a press on which opens the explorer). */
    ref?: HTMLElement;
    size?: 'hero' | 'small';
    /** Play the reveal: the figure rolls up like an odometer, then the foil catches the light once. Never with reduced motion. */
    reveal?: boolean;
}

/**
 * The amount: monumental, in hologram foil that catches its light from the
 * hand (`--lx`, `--ly`, see `light.ts`). The figure fills the width it is
 * given, whatever its length (`--chars` and a container query), so a long
 * amount never clips on a 320px screen. The real text is always the `.amount`
 * element; the rolling digits are a show beside it.
 */
export function amountBlock(o: AmountOpts): HTMLElement {
    // Digits as text; each separator in its own span, so a monospaced comma can sit tight.
    const fig = h('span', { class: 'amount' });
    for (const ch of o.text) fig.append(ch >= '0' && ch <= '9' ? ch : h('span', { class: 'sep' }, ch));
    const block = h('div', { class: 'amount-block amount-block--' + (o.size ?? 'hero') });
    block.style.setProperty('--chars', String(figureWidth(o.text)));

    // Above the figure: what it is, and the unit. Under it: the package's reference.
    const head = h('div', { class: 'amount-head' });
    if (o.label) head.append(h('span', { class: 'label' }, o.label));
    if (head.childElementCount) block.append(head);
    const line = h('div', { class: 'amount-line' }, fig, h('span', { class: 'unit' }, 'XEC'));
    block.append(line);
    // The package's own seal — a small rosette drawn from its address, no two alike — beside its reference.
    if (o.address) block.append(h('p', { class: 'amount-ref' }, h('span', { class: 'amount-seal', 'aria-hidden': 'true' }, noteSvg(o.address)), o.refLabel ? h('span', { class: 'amount-ref-label' }, o.refLabel) : null, o.ref ?? explorerRef('address', o.address, shortId(o.address))));

    if (o.reveal === true && !prefersReducedMotion()) {
        const odo = odometer(o.text);
        line.insertBefore(odo, fig.nextSibling);
        block.classList.add('is-rolling');
        const go = (): void => odo.classList.add('odo--go');
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(go));
        else go();
        setTimeout(() => {
            odo.remove();
            block.classList.remove('is-rolling');
            block.classList.add('is-sheen');
            setTimeout(() => block.classList.remove('is-sheen'), 1200);
        }, odometerLength(o.text) + 60);
    }
    return block;
}

/** Before the opening: the reference is there, the figure is sealed. Shows nothing about the amount. */
export function sealedBlock(o: { label: string; address: string; refLabel: string; mark: string }): HTMLElement {
    return h(
        'div',
        { class: 'amount-block amount-block--sealed' },
        h('div', { class: 'amount-head' }, h('span', { class: 'label' }, o.label)),
        h('div', { class: 'amount-line' }, h('span', { class: 'sealed', 'aria-hidden': 'true' }, '•••' + o.mark + '••'), h('span', { class: 'unit' }, 'XEC')),
        h('p', { class: 'amount-ref' }, h('span', { class: 'amount-seal', 'aria-hidden': 'true' }, noteSvg(o.address)), h('span', { class: 'amount-ref-label' }, o.refLabel), explorerRef('address', o.address, shortId(o.address))),
    );
}
