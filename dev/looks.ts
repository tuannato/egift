/**
 * Dev-only: the picking sheet for capsule colourways ("workshop tier 1").
 * Never part of a production build.
 *
 *   /dev/looks.html?page=1..4                  six wrappers a page, six colourways each
 *   /dev/looks.html?mode=accents&page=1..2     the SHARED accents: ten a page, on eight wrappers
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
import { applyTheme, themeTokens } from '../src/ui/theme';
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

/** A shared accent: one colour in two shades, chosen by the tone of the wrapper's capsule (`scripts/accent-candidates.mjs`). */
interface Shade {
    readonly accent: string;
    readonly onAccent: string;
}
interface Accent {
    readonly key: string;
    readonly name: string;
    readonly light: Shade;
    readonly dark: Shade;
    readonly minMargin: number;
    readonly notes: string;
    readonly drop?: boolean;
    readonly reason?: string;
}

const PER_PAGE = 6;
/** The wrappers the shared accents are tried on: every material, both tones, and the dark surfaces of each colour. */
const ACCENT_ROWS = ['lixi', 'rangoli', 'mecha', 'signal', 'snowbox', 'lace', 'fold', 'skyline'];
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

/** The capsule in small and smaller, for the accent sheet: heading, figure, button. */
function tile(theme: ThemeDef, key: string, name: string, caption: string, dropped = false): HTMLElement {
    const cell = el('div', 'cell');
    const mini = el('div', 'mini mini--s');
    applyTheme({ theme, id: '', sound: undefined }, mini);
    mini.append(el('p', 'mini-title', name), el('p', 'mini-figure', '20'), el('div', 'mini-btn', 'Take it home'));
    const tag = el('span', 'key key--s', key);
    if (dropped) tag.classList.add('key--drop');
    cell.append(mini, tag, el('p', dropped ? 'cap cap--drop' : 'cap', caption));
    return cell;
}

/** The swatches as the picker will show them: round dots in order, one chip per tone. */
function strip(accents: readonly Accent[], tone: 'light' | 'dark', from: number, to: number): HTMLElement {
    const chip = el('div', `chip chip--${tone}`);
    chip.append(el('span', 'chip-name', tone === 'light' ? 'on light capsules' : 'on dark capsules'));
    accents.forEach((a, i) => {
        const dot = el('span', 'dot');
        dot.style.background = a[tone].accent;
        dot.style.color = a[tone].onAccent;
        dot.textContent = a.key;
        if (a.drop) dot.classList.add('dot--drop');
        if (i < from || i >= to) dot.classList.add('dot--off');
        chip.append(dot);
    });
    return chip;
}

async function accentSheet(): Promise<void> {
    let accents: readonly Accent[] = [];
    try {
        accents = (await (await fetch('/.shots/looks/accents.json')).json()) as readonly Accent[];
    } catch {
        root.append(el('p', 'missing', 'No accents: run node scripts/accent-candidates.mjs first.'));
        return;
    }
    const per = 10;
    const pages = Math.max(1, Math.ceil(accents.length / per));
    const page = Math.min(pages, Math.max(1, Number(new URLSearchParams(location.search).get('page') ?? '1') || 1));
    const shown = accents.slice((page - 1) * per, page * per);
    root.classList.add('accents');
    root.append(el('p', 'sheet-head', `eGift · shared accents · sheet ${page} of ${pages} · 0 = the wrapper's own accent · ${shown[0]?.key ?? ''}–${shown[shown.length - 1]?.key ?? ''} = candidates · ✕ = art director would cut`));
    const strips = el('div', 'strips');
    strips.append(strip(accents, 'light', (page - 1) * per, page * per), strip(accents, 'dark', (page - 1) * per, page * per));
    root.append(strips);
    for (const id of ACCENT_ROWS) {
        const w = WRAPPERS.find(x => x.id === id);
        const theme = w?.theme;
        if (!w || !theme) continue;
        const tone = themeTokens(w).tone;
        const row = el('section', 'row row--accents');
        row.style.setProperty('--ground', theme.ground);
        (w.ambient ?? []).forEach((c, i) => row.style.setProperty(`--amb-${i + 1}`, c));
        const thumb = document.createElement('img');
        thumb.className = 'thumb';
        thumb.src = `/thumbs/${w.id}.jpg`;
        thumb.alt = '';
        const who = el('div', 'who');
        who.append(el('p', 'who-name', w.name.en), el('p', 'who-id', w.id), el('p', 'who-kind', `${theme.material} · ${tone}`));
        row.append(thumb, who, tile(theme, '0', w.name.en, 'own'));
        for (const a of shown) row.append(tile({ ...theme, ...a[tone] }, a.key, w.name.en, (a.drop ? '✕ ' : '') + a.name, a.drop === true));
        root.append(row);
    }
}

async function main(): Promise<void> {
    if (new URLSearchParams(location.search).get('mode') === 'accents') return accentSheet();
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
