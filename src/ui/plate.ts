import { inLang } from '../wrappers/meta';
import type { WrapperDef } from '../stage';
import { getLang } from '../i18n';
import { setAmbient } from './ambient';
import { applyTheme } from './theme';
import { h } from './dom';
import { setUserText } from './text';
import type { StageCard } from './stageCard';

/** Who made a wrapper when its data does not say. */
export const DEFAULT_CREDIT = 'eGift Studio';

/**
 * The wrapper on stage, as the room's centre: no card, no border. The stage
 * runs edge to edge and its lower edge dissolves into the page (the frame's
 * mask, around the stage, never inside it). Under it one small line names the
 * wrapper and who made it — the workshop's foothold. Everything that names,
 * sizes or lights a wrapper comes from its data, so any wrapper fits.
 */
export function plate(card: StageCard, def: WrapperDef | undefined, opts: { caption?: boolean; tag?: string } = {}): HTMLElement {
    const [w, hh] = def ? def.size : [4, 5];
    const fig = h('figure', { class: 'plate' }, h('div', { class: 'plate-frame' }, card.el));
    fig.style.setProperty('--ar', String(w / hh));
    // The page lays the gift out in the room the capsule leaves: it needs the gift's proportions.
    document.documentElement.style.setProperty('--ar', String(w / hh));
    // And where the thing being opened is, so it stays in view when the capsule is tall.
    fig.style.setProperty('--focus-y', String(def?.focus?.[1] ?? 0.5));
    setAmbient(def);
    // Whatever wrapper is on stage, the whole frame wears it.
    applyTheme(def);
    if (opts.caption !== false) {
        const name = h('span', { class: 'plate-name' });
        const credit = h('span', { class: 'plate-credit' });
        setUserText(name, def ? inLang(def.name, getLang()) : '—');
        setUserText(credit, def ? (def.credit ?? DEFAULT_CREDIT) : '');
        fig.append(h('figcaption', { class: 'plate-caption' }, opts.tag ? h('span', { class: 'plate-tag' }, opts.tag) : null, name, h('span', { class: 'plate-dash', 'aria-hidden': 'true' }, '—'), credit));
    }
    return fig;
}
