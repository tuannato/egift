/**
 * Dev-only: the picking sheet for capsule colourways ("workshop tier 1").
 * Never part of a production build.
 *
 *   /dev/looks.html?page=1..4      six wrappers a page
 *
 * One row per wrapper: its thumbnail, its name, then the capsule in small —
 * "0", the wrapper's own colours, and the candidates "A".."F" made by
 * `node scripts/looks-candidates.mjs` (`.shots/looks/candidates.json`, which
 * the dev server serves from the project root; nothing of it ships).
 * Each card is dressed by the app's own `applyTheme`, so the quiet text and
 * the tone are derived exactly as the capsule derives them; `looks.css`
 * rebuilds each material at this size.
 */
import '../src/styles/fonts.css';
import type { ThemeDef } from '../src/stage';
import { applyTheme } from '../src/ui/theme';
import { WRAPPERS } from '../src/wrappers';

interface Look {
    readonly key: string;
    readonly surface: string;
    readonly ink: string;
    readonly accent: string;
    readonly onAccent: string;
    readonly note: string;
    readonly pick?: boolean;
    readonly reason?: string;
    readonly flag?: string;
}

const PER_PAGE = 6;
const root = document.getElementById('root')!;

function el(tag: string, cls: string, text?: string): HTMLElement {
    const n = document.createElement(tag);
    n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
}

/** What kind of candidate a note describes, in a word. */
function kindOf(note: string): string {
    if (note.startsWith('accent from')) return 'accent';
    if (note.startsWith('tone flip')) return 'flip';
    if (note.startsWith('quiet neutral')) return 'neutral';
    if (note.startsWith('the original accent')) return 'shade';
    return 'card';
}

/** The capsule in small, wearing `theme`. */
function card(theme: ThemeDef, key: string, name: string, caption: string, look?: Look): HTMLElement {
    const cell = el('div', 'cell');
    const mini = el('div', 'mini');
    applyTheme({ theme, id: '', sound: undefined }, mini);
    const figure = el('p', 'mini-figure', '20');
    figure.append(el('span', 'mini-unit', 'XEC'));
    mini.append(el('p', 'mini-title', name), el('p', 'mini-lead', 'A gift is waiting inside.'), figure, el('div', 'mini-btn', 'Take it home'));
    const tag = el('span', 'key', key);
    if (look?.pick) tag.classList.add('key--pick');
    const line = el('p', 'cap', caption);
    if (look?.pick) line.prepend(el('b', 'cap-pick', '★ '));
    if (look?.flag) line.append(el('b', 'cap-flag', ` ⚠ ${look.flag}`));
    cell.append(mini, tag, line);
    return cell;
}

async function main(): Promise<void> {
    const page = Math.min(Math.ceil(WRAPPERS.length / PER_PAGE), Math.max(1, Number(new URLSearchParams(location.search).get('page') ?? '1') || 1));
    let looks: Record<string, readonly Look[]> = {};
    try {
        looks = (await (await fetch('/.shots/looks/candidates.json')).json()) as Record<string, readonly Look[]>;
    } catch {
        root.append(el('p', 'missing', 'No candidates: run node scripts/looks-candidates.mjs first.'));
    }
    root.append(el('p', 'sheet-head', `eGift · capsule colourways · sheet ${page} of ${Math.ceil(WRAPPERS.length / PER_PAGE)} · 0 = as shipped, A–F = candidates, ★ = art director's suggestion`));
    for (const w of WRAPPERS.slice((page - 1) * PER_PAGE, page * PER_PAGE)) {
        const theme = w.theme;
        if (!theme) continue;
        const row = el('section', 'row');
        row.style.setProperty('--ground', theme.ground);
        (w.ambient ?? []).forEach((c, i) => row.style.setProperty(`--amb-${i + 1}`, c));
        const thumb = document.createElement('img');
        thumb.className = 'thumb';
        thumb.src = `/thumbs/${w.id}.jpg`;
        thumb.alt = '';
        const who = el('div', 'who');
        who.append(el('p', 'who-name', w.name.en), el('p', 'who-id', w.id), el('p', 'who-kind', `${theme.material} · ${theme.corner} · ${theme.face}`));
        row.append(thumb, who, card(theme, '0', w.name.en, 'original'));
        const mine = looks[w.id] ?? [];
        for (const look of mine) {
            const { surface, ink, accent, onAccent } = look;
            row.append(card({ ...theme, surface, ink, accent, onAccent }, look.key, w.name.en, kindOf(look.note), look));
        }
        for (let i = mine.length; i < 6; i += 1) row.append(el('div', 'cell cell--none', '—'));
        root.append(row);
    }
}

void main();
