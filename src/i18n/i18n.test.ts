import { describe, expect, it } from 'vitest';
import { vi } from './vi';
import { en } from './en';
import { LANGS, LANG_INFO, SAFETY_KEYS, enabledLangs, getLang, initLang, langForBrowser, setLang, t, tables_forTest } from './index';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe('i18n', () => {
    it('every-enabled-language-has-every-string', () => {
        const a = Object.keys(vi).sort();
        const b = Object.keys(en).sort();
        expect(b).toEqual(a);
        for (const k of a) {
            const v = (vi as Record<string, string>)[k];
            const e = (en as Record<string, string>)[k];
            expect(v.trim(), `vi ${k}`).not.toBe('');
            expect(e.trim(), `en ${k}`).not.toBe('');
            expect(placeholders(e), `placeholders ${k}`).toEqual(placeholders(v));
        }
    });

    it('substitutes placeholders and keeps unknown ones', () => {
        setLang('en');
        expect(t('create.wish.count', { n: 3, max: 180 })).toBe('3/180 bytes');
        expect(t('take.confirm', { amount: '1' })).toContain('{fee}');
    });

    it('keeps <html lang> in sync and stores only the language', () => {
        localStorage.clear();
        setLang('vi');
        expect(document.documentElement.lang).toBe('vi');
        expect(getLang()).toBe('vi');
        expect(localStorage.length).toBe(1);
        expect(localStorage.getItem('gift.lang')).toBe('vi');
        history.replaceState(null, '', '/?lang=en');
        expect(initLang()).toBe('en');
        history.replaceState(null, '', '/');
        expect(initLang()).toBe('vi');
        localStorage.clear();
    });

    it('a-language-missing-a-warning-is-not-enabled', () => {
        expect([...LANGS]).toEqual(['en', 'de', 'es', 'fr', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'vi', 'zh-Hans', 'zh-Hant']);
        expect(SAFETY_KEYS).toContain('pkg.empty.scam');
        expect(SAFETY_KEYS).toContain('pkg.recovery');
        // A synthetic table with one warning empty, another with one missing: neither is offered.
        const blank = { ...en, 'pkg.empty.scam': '  ' };
        const missing: Partial<typeof en> = { ...en };
        delete missing['take.s2'];
        expect(enabledLangs({ vi, en: blank })).toEqual(['vi']);
        expect(enabledLangs({ vi: missing as typeof vi, en })).toEqual(['en']);
        expect(enabledLangs({ vi, en })).toEqual(['en', 'vi']);
    });

    it('every language says every thing: the same keys, the same blanks to fill, nothing empty, the fixed names untouched', () => {
        const all = tables_forTest();
        const keys = Object.keys(en).sort();
        const blanks = (v: string): string[] => (v.match(/\{\w+\}/g) ?? []).sort();
        for (const [lang, table] of Object.entries(all)) {
            expect(Object.keys(table).sort(), lang).toEqual(keys);
            for (const k of keys as (keyof typeof en)[]) {
                const v = table[k];
                expect(typeof v === 'string' && v.trim() !== '', `${lang} ${k} is empty`).toBe(true);
                expect(blanks(v), `${lang} ${k} placeholders`).toEqual(blanks(en[k]));
                // The names of things are never translated.
                for (const name of ['eCash', 'XEC', 'Cashtab', 'eGift']) if (en[k].includes(name)) expect(v.includes(name), `${lang} ${k} keeps ${name}`).toBe(true);
            }
            expect(table['app.name'], lang).toBe('eGift');
        }
    });

    it('the picker lists English first, then by tag; a browser language maps to the page language', () => {
        expect(LANGS[0]).toBe('en');
        const tags = LANGS.slice(1).map(l => LANG_INFO[l].tag);
        expect(tags).toEqual([...tags].sort());
        expect(langForBrowser('vi-VN')).toBe('vi');
        expect(langForBrowser('en-US')).toBe('en');
        expect(langForBrowser('pt-BR')).toBe('pt');
        expect(langForBrowser('zh-TW')).toBe('zh-Hant');
        expect(langForBrowser('zh-HK')).toBe('zh-Hant');
        expect(langForBrowser('zh-CN')).toBe('zh-Hans');
        expect(langForBrowser('zh')).toBe('zh-Hans');
        expect(langForBrowser('ja-JP')).toBe('ja');
        expect(langForBrowser('xx')).toBeNull();
    });
});

