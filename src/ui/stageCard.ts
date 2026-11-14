import { mountStage } from '../stage';
import type { StageHandle, WrapperDef } from '../stage';
import { h } from './dom';
import { ribbon } from './ribbon';

export interface StageCard {
    /** The card: the stage host plus an optional overlay slot. */
    readonly el: HTMLElement;
    /** Null when there is no wrapper or the stage could not start: the frame carries on without it. */
    readonly handle: StageHandle | null;
    /** Where a transparent full-size button may go. Nothing else is ever painted over the stage. */
    readonly overlay: HTMLElement;
    destroy(): void;
}

export function prefersReducedMotion(): boolean {
    try {
        return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
}

export function stageCard(def: WrapperDef | undefined, opts: { onReveal?: () => void; still?: boolean } = {}): StageCard {
    const host = h('div', { class: 'stage', 'aria-hidden': 'true' });
    const overlay = h('div', { class: 'stage-overlay' });
    const el = h('div', { class: 'stage-card' }, host, overlay);
    let handle: StageHandle | null = null;
    const [w, hh] = def ? def.size : [4, 5];
    host.style.setProperty('aspect-ratio', `${w} / ${hh}`);
    if (def) {
        try {
            handle = mountStage(host, def, {
                assetBase: '/wrappers/' + def.id + '/',
                reducedMotion: opts.still === true || prefersReducedMotion(),
                onReveal: opts.onReveal,
            });
        } catch {
            handle = null;
        }
    }
    if (!handle) {
        host.classList.add('stage--bare');
        host.append(ribbon('bow'));
    }
    return {
        el,
        handle,
        overlay,
        destroy() {
            try {
                handle?.destroy();
            } catch {
                /* already gone */
            }
        },
    };
}
