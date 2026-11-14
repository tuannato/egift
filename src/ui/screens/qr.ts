import qrcode from 'qrcode-generator';
import { h, svg } from '../dom';
import { t } from '../../i18n';

/** Draw `text` as an inline SVG QR: error correction M, quiet zone of 4 modules. Built with createElementNS only. */
export function qrSvg(text: string): SVGElement {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 4;
    let d = '';
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
        }
    }
    const size = n + quiet * 2;
    return svg(
        'svg',
        { class: 'qr-svg', viewBox: `0 0 ${size} ${size}`, role: 'img', 'aria-label': t('qr.alt'), 'shape-rendering': 'crispEdges' },
        svg('rect', { width: size, height: size, fill: '#ffffff' }),
        svg('path', { d, fill: '#000000' }),
    );
}

/** A panel with a QR and an optional line above it. */
export function qrPanel(opts: { text: string; title?: string; warning?: string }): HTMLElement {
    const box = h('div', { class: 'panel qr-panel' });
    if (opts.title) box.append(h('h3', { class: 'panel-title' }, opts.title));
    if (opts.warning) box.append(h('p', { class: 'warning' }, opts.warning));
    try {
        box.append(h('div', { class: 'qr-wrap' }, qrSvg(opts.text)));
    } catch {
        box.append(h('p', { class: 'note' }, t('qr.fail')));
    }
    return box;
}
