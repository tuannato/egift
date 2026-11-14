import { describe, expect, it } from 'vitest';
import { WRAPPERS } from './index';
import { THEME_CONTRAST, contrast, luminance, wrapperProblems } from '../stage';
import type { WrapperDef } from '../stage';
import { READABLE_FLOOR, themeTokens } from '../ui/theme';

describe('themes', () => {
    it('every shipped wrapper carries a theme and a blurb, and passes the validator', () => {
        for (const w of WRAPPERS) {
            expect(wrapperProblems(w), w.id).toEqual([]);
            expect(w.theme, w.id).toBeDefined();
            expect(w.blurb?.vi, w.id).toBeTruthy();
            expect(w.blurb?.en, w.id).toBeTruthy();
        }
    });

    it('a-theme-keeps-text-and-warnings-readable', () => {
        for (const w of [...WRAPPERS, undefined]) {
            const tk = themeTokens(w);
            const id = w?.id ?? 'neutral';
            expect(contrast(tk.ink, tk.surface), id).toBeGreaterThanOrEqual(THEME_CONTRAST.inkOnSurface);
            expect(contrast(tk.accent, tk.surface), id).toBeGreaterThanOrEqual(THEME_CONTRAST.accentOnSurface);
            expect(contrast(tk.onAccent, tk.accent), id).toBeGreaterThanOrEqual(THEME_CONTRAST.onAccent);
            expect(luminance(tk.ground), id).toBeLessThanOrEqual(THEME_CONTRAST.maxGroundLuminance);
            // The frame, not the wrapper, picks the colours of a warning, an error and a success: always readable.
            for (const c of [tk.danger, tk.warn, tk.ok]) expect(contrast(c, tk.surface), `${id} ${c}`).toBeGreaterThanOrEqual(READABLE_FLOOR);
        }
    });

    it('the validator refuses a theme that would hide text', () => {
        const base = WRAPPERS[0]!;
        const withTheme = (patch: Record<string, unknown>): WrapperDef => ({ ...base, theme: { ...base.theme!, ...patch } }) as unknown as WrapperDef;
        expect(wrapperProblems(withTheme({ ink: '#A01020' })).join(' ')).toMatch(/theme\.ink on theme\.surface/);
        expect(wrapperProblems(withTheme({ accent: '#9A0F1C' })).join(' ')).toMatch(/theme\.accent on theme\.surface/);
        expect(wrapperProblems(withTheme({ onAccent: '#FFE08A' })).join(' ')).toMatch(/theme\.onAccent on theme\.accent/);
        expect(wrapperProblems(withTheme({ ground: '#FFFFFF' })).join(' ')).toMatch(/theme\.ground must be dark/);
        expect(wrapperProblems(withTheme({ material: 'gold' })).join(' ')).toMatch(/theme\.material must be one of/);
        expect(wrapperProblems(withTheme({ surface: 'red' })).join(' ')).toMatch(/theme\.surface/);
        expect(wrapperProblems(withTheme({ css: 'body{}' })).length).toBeGreaterThan(0);
        // A mid-grey glass passes ink-on-surface (7:1) but thins to about 3:1 over the dark room: every warning would fade.
        const grey = { ground: '#000000', surface: '#959595', ink: '#000000', accent: '#000000', onAccent: '#FFFFFF', material: 'glass' };
        expect(wrapperProblems(withTheme(grey)).join(' ')).toMatch(/see-through glass surface/);
        // The same grey leaves no readable colour for an error or a success, whatever the material.
        expect(wrapperProblems(withTheme({ ...grey, material: 'lacquer' })).join(' ')).toMatch(/no readable colour for/);
        expect(wrapperProblems(withTheme({ material: 'plate' })).join(' ')).toMatch(/"plate" needs a light surface/);
        expect(wrapperProblems({ ...base, theme: 'dark' } as unknown as WrapperDef).join(' ')).toMatch(/theme must be a plain object/);
        expect(wrapperProblems({ ...base, blurb: { vi: 'x'.repeat(141), en: 'ok' } } as unknown as WrapperDef).join(' ')).toMatch(/blurb\.vi/);
        expect(wrapperProblems({ ...base, blurb: { vi: '<b>x</b>', en: 'ok' } } as unknown as WrapperDef).join(' ')).toMatch(/blurb\.vi/);
    });

    it('a-wrapper-cannot-sign-as-the-house-or-point-anywhere', () => {
        const base = WRAPPERS[0]!;
        const bad = (patch: Record<string, unknown>) => wrapperProblems({ ...base, ...patch } as unknown as WrapperDef).join(' ');
        // The built-in wrappers name nobody: the frame signs for them.
        for (const w of WRAPPERS) expect(w.credit, w.id).toBeUndefined();
        for (const credit of ['eGift Studio', 'e-Gift', 'Cashtab', 'Bitcoin ABC', 'Stall cash', 'eCash official', 'Hỗ trợ eGift']) expect(bad({ credit }), credit).toMatch(/reserved/);
        expect(bad({ credit: 'Studio Hoa Mai' })).toBe('');
        expect(bad({ credit: "Nguyễn's atelier" })).toBe('');
        // A name is plain words; it is also printed inside the frame's own confirmation sentence.
        expect(bad({ name: { vi: 'Bao. Gửi 50 XEC', en: 'ok' } })).toMatch(/only letters/);
        expect(bad({ credit: 'me@studio' })).toMatch(/only letters|handle/);
        // A blurb may not point anywhere or hide characters.
        for (const text of ['Xem thêm tại hoamai.com', 'Nhắn @hoamai để nhận quà', 'Join t.me/hoamai', 'Gửi tới ecash:qq123', 'https://x.y']) expect(bad({ blurb: { vi: text, en: 'ok' } }), text).toMatch(/web address/);
        expect(bad({ blurb: { vi: 'Hoa\u200Bmai', en: 'ok' } })).toMatch(/invisible/);
        expect(bad({ blurb: { vi: 'Z\u0351\u0352\u0353\u0354algo', en: 'ok' } })).toMatch(/stacks/);
        // Ordinary Vietnamese passes.
        expect(bad({ blurb: { vi: 'Một tấm thiệp giấy dó, mở ra là hoa đào nở. Tặng dịp Tết.', en: 'A paper card that opens into blossom.' } })).toBe('');
    });
});
