import { en } from './en';
import type { vi } from './vi';

export type Key = keyof typeof vi;

/**
 * The languages the page can speak. English first, then by the two-letter tag
 * each is listed under (DE, ES, FR, ID, JA, KO, PT, RU, TH, VI, ZH, ZH): the
 * order of the picker.
 */
export const ALL_LANGS = ['en', 'de', 'es', 'fr', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'vi', 'zh-Hans', 'zh-Hant'] as const;
export type Lang = (typeof ALL_LANGS)[number];

/** What the picker shows for a language: its tag and its own name for itself. And the locale its dates are written in. */
export const LANG_INFO: Record<Lang, { readonly tag: string; readonly name: string; readonly locale: string }> = {
    en: { tag: 'EN', name: 'English', locale: 'en-GB' },
    de: { tag: 'DE', name: 'Deutsch', locale: 'de-DE' },
    es: { tag: 'ES', name: 'Español', locale: 'es-ES' },
    fr: { tag: 'FR', name: 'Français', locale: 'fr-FR' },
    id: { tag: 'ID', name: 'Bahasa Indonesia', locale: 'id-ID' },
    ja: { tag: 'JA', name: '日本語', locale: 'ja-JP' },
    ko: { tag: 'KO', name: '한국어', locale: 'ko-KR' },
    pt: { tag: 'PT', name: 'Português', locale: 'pt-BR' },
    ru: { tag: 'RU', name: 'Русский', locale: 'ru-RU' },
    th: { tag: 'TH', name: 'ไทย', locale: 'th-TH' },
    vi: { tag: 'VI', name: 'Tiếng Việt', locale: 'vi-VN' },
    'zh-Hans': { tag: 'ZH', name: '简体中文', locale: 'zh-CN' },
    'zh-Hant': { tag: 'ZH', name: '繁體中文', locale: 'zh-TW' },
};

/** The locale dates and times are written in, for a language. */
export function localeOf(lang: Lang): string {
    return LANG_INFO[lang].locale;
}

type Table = Record<Key, string>;
/**
 * The tables that have arrived. English is part of the page (it is what
 * stands in for a missing sentence); every other language is fetched when it
 * is first asked for, so that a visitor carries one language, not thirteen.
 */
const tables: Partial<Record<Lang, Table>> = { en };
const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<Table>> = {
    de: () => import('./de').then(m => m.de),
    es: () => import('./es').then(m => m.es),
    fr: () => import('./fr').then(m => m.fr),
    id: () => import('./id').then(m => m.id),
    ja: () => import('./ja').then(m => m.ja),
    ko: () => import('./ko').then(m => m.ko),
    pt: () => import('./pt').then(m => m.pt),
    ru: () => import('./ru').then(m => m.ru),
    th: () => import('./th').then(m => m.th),
    vi: () => import('./vi').then(m => m.vi),
    'zh-Hans': () => import('./zhHans').then(m => m.zhHans),
    'zh-Hant': () => import('./zhHant').then(m => m.zhHant),
};

/**
 * The warnings a language must carry before it may be offered. A language
 * whose table lacks one of these, or has it empty, is not enabled: a page that
 * cannot warn in a language must not speak it.
 */
export const SAFETY_KEYS: readonly Key[] = [
    'pkg.empty.scam',
    'pkg.token.stuck.scam',
    'pkg.tok.claim',
    'pkg.tok.xec',
    'create.riddle.forget',
    'created.keepopen',
    'take.xeconly.warn',
    'take.token.wallet',
    'pkg.recovery',
    'pkg.temp',
    'pkg.notpaid',
    'create.truth.1',
    'create.truth.2',
    'create.truth.3',
    'take.s2',
    'link.qr.warn',
    'link.manual',
    'created.startover.unsaved',
];

/** The languages whose tables carry every safety key, in switch order. */
export function enabledLangs(from: Partial<Record<Lang, Partial<Record<Key, string>>>> = tables): Lang[] {
    return ALL_LANGS.filter(l => {
        const tbl = from[l];
        return !!tbl && SAFETY_KEYS.every(k => typeof tbl[k] === 'string' && tbl[k]!.trim() !== '');
    });
}

/**
 * The languages offered. Every shipped table carries every safety key (the
 * tests hold each file to that), and a table is checked once more when it
 * arrives: one that fails is not used, and English stands in.
 */
export const LANGS: readonly Lang[] = ALL_LANGS;

/** Put a table in place (a language that has been fetched; the tests put all of them in). */
export function registerLang(lang: Lang, table: Table): void {
    if (SAFETY_KEYS.every(k => typeof table[k] === 'string' && table[k].trim() !== '')) tables[lang] = table;
}
export function hasLang(lang: Lang): boolean {
    return tables[lang] !== undefined;
}
/** Fetch a language's table if it is not here yet. Rejects when it cannot be fetched. */
export async function loadLang(lang: Lang): Promise<void> {
    if (lang === 'en' || tables[lang] !== undefined) return;
    registerLang(lang, await LOADERS[lang]());
}

let current: Lang = 'en';
const listeners = new Set<() => void>();

function isLang(x: unknown): x is Lang {
    return typeof x === 'string' && (LANGS as readonly string[]).includes(x);
}

/** The language of the page for a browser's language tag ("pt-BR", "zh-TW"), or null when the page does not speak it. */
export function langForBrowser(tag: string): Lang | null {
    const low = tag.toLowerCase();
    if (low.startsWith('zh')) {
        const trad = /hant|-tw|-hk|-mo/.test(low);
        return isLang(trad ? 'zh-Hant' : 'zh-Hans') ? (trad ? 'zh-Hant' : 'zh-Hans') : null;
    }
    const two = low.slice(0, 2);
    return isLang(two) ? two : null;
}

/** `?lang=`, then `localStorage['gift.lang']`, then the browser language, default `en`. */
export function initLang(): Lang {
    let picked: Lang | null = null;
    try {
        const q = new URLSearchParams(location.search).get('lang');
        if (isLang(q)) picked = q;
    } catch {
        /* no location */
    }
    if (!picked) {
        try {
            const s = localStorage.getItem('gift.lang');
            if (isLang(s)) picked = s;
        } catch {
            /* storage blocked */
        }
    }
    if (!picked) {
        const nav = typeof navigator !== 'undefined' ? (navigator.language ?? '') : '';
        picked = langForBrowser(nav) ?? (isLang('en') ? 'en' : (LANGS[0] ?? 'en'));
    }
    current = picked;
    syncHtml();
    return current;
}

function syncHtml(): void {
    if (typeof document !== 'undefined') document.documentElement.lang = current;
}

export function getLang(): Lang {
    return current;
}

/** Change the language, remember it (under the one key this file owns) and tell the listeners. */
export function setLang(lang: Lang): void {
    if (!isLang(lang) || lang === current) return;
    current = lang;
    try {
        localStorage.setItem('gift.lang', lang);
    } catch {
        /* storage blocked: the choice lasts for this visit only */
    }
    syncHtml();
    for (const fn of [...listeners]) fn();
}

export function onLangChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function t(key: Key, vars?: Record<string, string | number | bigint>): string {
    // Every enabled language has every key (its file is typed so); English stands in if a table is somehow not there.
    const s = (tables[current] ?? en)[key];
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function tables_forTest(): Record<Lang, Record<Key, string>> {
    return tables as Record<Lang, Record<Key, string>>;
}
