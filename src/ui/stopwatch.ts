import { h } from './dom';
import { getLang, localeOf } from '../i18n';

function fmt(sec: number): string {
    try {
        return new Intl.NumberFormat(localeOf(getLang()), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(sec);
    } catch {
        return sec.toFixed(1);
    }
}

/** A live stopwatch in the mono face, tenths of a second, from the press until the network settles. */
export function stopwatch(t0: number = performance.now()): { el: HTMLElement; stop(): number; cancel(): void } {
    const time = h('span', { class: 'watch-time' }, fmt(Math.max(0, performance.now() - t0) / 1000) + ' s');
    const el = h('p', { class: 'watch', 'aria-hidden': 'true' }, h('span', { class: 'watch-dot' }), time);
    const tick = () => {
        time.textContent = fmt((performance.now() - t0) / 1000) + ' s';
    };
    const id = setInterval(tick, 100);
    return {
        el,
        stop() {
            clearInterval(id);
            const s = (performance.now() - t0) / 1000;
            el.remove();
            return s;
        },
        cancel() {
            clearInterval(id);
            el.remove();
        },
    };
}

/** A short haptic tick on phones that have one. Never on load: only after a person's press. */
export function tick(): void {
    try {
        if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
        // Browsers refuse a vibration before the person has touched the page; do not ask.
        const act = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
        if (act && !act.hasBeenActive) return;
        navigator.vibrate(12);
    } catch {
        /* no haptics */
    }
}
