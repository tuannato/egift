/**
 * Dev-only: the share card of one wrapper, drawn at 1200x630 for a screenshot
 * (`node scripts/og-cards.mjs`). Never part of a production build.
 *
 *   /dev/card.html?id=snowbox          the share card
 *   /dev/card.html?id=snowbox&thumb    the closed wrapper alone
 */
import { artBase, artQuery } from '../src/wrappers/artUrl';
import '../src/styles/fonts.css';
import { mountStage } from '../src/stage';
import { wrapperById } from '../src/wrappers';

const id = new URLSearchParams(location.search).get('id') ?? '';
const def = wrapperById(id);
const root = document.getElementById('root')!;
if (!def) root.textContent = `No wrapper "${id}"`;
else if (new URLSearchParams(location.search).has('thumb')) {
    // The closed wrapper alone, edge to edge: the small still the shelf and the picker show (scripts/og-cards.mjs).
    const art = document.createElement('div');
    art.className = 'thumb';
    const stage = mountStage(art, def, { assetBase: artBase(def.id), assetQuery: artQuery(def.id), reducedMotion: true });
    stage.seek(0);
    root.replaceChildren(art);
} else {
    const el = (tag: string, cls: string, text?: string): HTMLElement => {
        const n = document.createElement(tag);
        n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    };
    const card = el('div', 'card');
    card.style.setProperty('--ground', def.theme?.ground ?? '#0a0c11');
    card.style.setProperty('--accent', def.theme?.accent ?? '#f2c162');
    const art = el('div', 'card-art');
    const stage = mountStage(art, def, { assetBase: artBase(def.id), assetQuery: artQuery(def.id), reducedMotion: true });
    stage.seek(0);
    const text = el('div', 'card-text');
    text.append(el('p', 'card-brand', 'eGift'), el('p', 'card-line', 'A gift is waiting inside.'), el('div', 'card-rule'), el('p', 'card-name', def.name.en));
    card.append(art, text);
    root.replaceChildren(card);
}
