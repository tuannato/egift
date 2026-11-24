import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../stage', async orig => {
    const real = await orig<typeof import('../stage')>();
    const { fakeMountStage } = await import('./fakestage');
    return { ...real, mountStage: fakeMountStage };
});
vi.mock('../core', async orig => {
    const real = await orig<typeof import('../core')>();
    return { ...real, newSecret: vi.fn(real.newSecret), deriveKey: vi.fn(real.deriveKey), takeHome: vi.fn(real.takeHome) };
});

import { deriveKey, encodeLink, formatXec, newSecret, takeHome, createDemoChain } from '../core';
import type { TakeResult } from '../core';
import { getLang, setLang, t, tables_forTest } from '../i18n';
import type { Key } from '../i18n';
import { getMade, clearMade } from './session';
import { boot, buttonByText, createGift, flush, resetPage, stubClipboard, type, type Booted } from './testkit';

let app: Booted | null = null;
const opened: unknown[][] = [];

beforeEach(() => {
    resetPage('en');
    opened.length = 0;
    vi.spyOn(window, 'open').mockImplementation(((...a: unknown[]) => {
        opened.push(a);
        return null;
    }) as typeof window.open);
    vi.clearAllMocks();
});
afterEach(() => {
    app?.stop();
    app = null;
    vi.restoreAllMocks();
});

const goBtn = (a: Booted) => buttonByText(main(a).querySelector('.panel-take') as HTMLElement, t('take.go'));
const main = (a: Booted) => a.root.querySelector('main') as HTMLElement;
const fundLabels = () => [t('created.fund.web'), t('created.fund.app'), t('created.fund.qr')];

function linkFor(wish?: string, wrapper = 'lixi') {
    const secret = newSecret();
    const key = deriveKey(secret);
    const link = encodeLink({ version: 1, secret, wrapper, wish }, location.origin);
    vi.mocked(newSecret).mockClear();
    vi.mocked(deriveKey).mockClear();
    return { secret, key, link, frag: link.slice(link.indexOf('#')) };
}

function openAt(frag: string): Booted {
    history.replaceState(null, '', '/' + frag);
    app = boot();
    return app;
}

async function reveal(a: Booted): Promise<void> {
    await flush();
    (a.root.querySelector('.tap') as HTMLButtonElement | null)?.click();
    await flush();
}

describe('create and created', () => {
    it('no-key-is-made-before-create-is-pressed', async () => {
        app = boot();
        await flush();
        expect(app.root.querySelector('#f-amount')).toBeTruthy();
        type(app.root.querySelector('#f-amount') as HTMLInputElement, '25');
        type(app.root.querySelector('#f-wish') as HTMLTextAreaElement, 'hi');
        expect(newSecret).not.toHaveBeenCalled();
        expect(deriveKey).not.toHaveBeenCalled();
        await createGift(app.root, '25');
        expect(newSecret).toHaveBeenCalledTimes(1);
        expect(deriveKey).toHaveBeenCalledTimes(1);
        expect(getMade()).not.toBeNull();
    });

    it('shows live validation for the floor and not-a-number; there is no cap', async () => {
        app = boot();
        const amount = app.root.querySelector('#f-amount') as HTMLInputElement;
        const submit = app.root.querySelector('button[type=submit]') as HTMLButtonElement;
        expect(submit.disabled).toBe(true);
        type(amount, 'abc');
        expect(app.root.textContent).toContain(t('create.err.nan'));
        type(amount, '1');
        expect(submit.disabled).toBe(true);
        expect(app.root.querySelector('#f-amount-msg')?.textContent).toContain('At least');
        // No cap: a very large gift is a valid amount (it will ask for confirmation).
        type(amount, '999999999');
        expect(app.root.querySelector('#f-amount-msg')?.textContent).toBe('');
        expect(submit.disabled).toBe(false);
        // Over the total supply is not an amount at all.
        type(amount, '99999999999999999');
        expect(submit.disabled).toBe(true);
        type(amount, '10');
        expect(submit.disabled).toBe(false);
        type(app.root.querySelector('#f-wish') as HTMLTextAreaElement, 'é'.repeat(100));
        expect(submit.disabled).toBe(true);
    });

    it('the-fund-button-exists-only-in-the-session-that-made-the-key', async () => {
        // A link opened later whose package is empty: no payment control.
        const l = linkFor();
        openAt(l.frag);
        await flush();
        for (const label of fundLabels()) expect([...main(app!).querySelectorAll('button')].some(b => b.textContent === label)).toBe(false);
        app!.stop();
        // A FUNDED package opened later: the gift shows, still no payment control, opened or not.
        const f = linkFor();
        const fa = openAt(f.frag);
        fa.chain.fund(f.key.address, 8888n);
        await flush();
        for (const label of fundLabels()) expect([...main(fa).querySelectorAll('button')].some(b => b.textContent === label)).toBe(false);
        await reveal(fa);
        expect(main(fa).querySelector('.amount')).toBeTruthy();
        for (const label of fundLabels()) expect([...main(fa).querySelectorAll('button')].some(b => b.textContent === label)).toBe(false);
        fa.stop();
        // The session that makes the key does show it.
        history.replaceState(null, '', '/');
        app = boot();
        await createGift(app.root);
        for (const label of fundLabels()) expect(buttonByText(app.root, label)).toBeTruthy();
        app.stop();
        // A reload loses the session: back to the create form, no fund button.
        clearMade();
        app = boot();
        await flush();
        for (const label of fundLabels()) expect([...app.root.querySelectorAll('button')].some(b => b.textContent === label)).toBe(false);
    });

    it('funding-is-refused-until-the-link-has-been-saved', async () => {
        // A clipboard that REJECTS (in-app browsers): a failed copy is not a save.
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => Promise.reject(new Error('denied')), readText: async () => '' } });
        app = boot();
        await createGift(app.root);
        let btns = fundLabels().map(l => buttonByText(app!.root, l));
        buttonByText(app.root, t('link.copy')).click();
        await flush();
        expect(app.root.textContent).toContain(t('link.copyfail'));
        expect(btns.every(b => b.disabled)).toBe(true);
        btns[0].click();
        expect(opened).toHaveLength(0);
        // Only the explicit "I copied it by hand" counts.
        const manual = [...app.root.querySelectorAll('label.check')].find(l => !(l as HTMLElement).hidden) as HTMLElement;
        expect(manual.textContent).toBe(t('link.manual'));
        const box = manual.querySelector('input') as HTMLInputElement;
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        expect(btns.every(b => !b.disabled)).toBe(true);
        app.stop();
        clearMade();
        resetPage('en');

        const clip = stubClipboard();
        app = boot();
        await createGift(app.root);
        btns = fundLabels().map(l => buttonByText(app!.root, l));
        expect(btns.every(b => b.disabled)).toBe(true);
        btns.forEach(b => b.click());
        expect(opened).toHaveLength(0);
        buttonByText(app.root, t('link.copy')).click();
        await flush();
        expect(clip.written).toEqual([getMade()!.link]);
        expect(btns.every(b => !b.disabled)).toBe(true);
        btns[0].click();
        expect(opened).toHaveLength(1);
        expect(opened[0][1]).toBe('_blank');
        expect(opened[0][2]).toBe('noopener,noreferrer');
        expect(String(opened[0][0])).toMatch(/^https:\/\/cashtab\.com\//);
        // no anchor to a wallet link anywhere
        expect([...app.root.querySelectorAll('a')].filter(a => a.hasAttribute('href'))).toHaveLength(0);
    });

    it('the-secret-never-leaves-the-fragment', async () => {
        const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => {}));
        const clip = stubClipboard();
        const shared: unknown[] = [];
        Object.defineProperty(navigator, 'share', { configurable: true, value: async (d: unknown) => void shared.push(d) });
        app = boot();
        await createGift(app.root, '10', 'happy');
        // Nothing has been copied or shared until the person asks for the link itself.
        expect(clip.written).toEqual([]);
        expect(shared).toEqual([]);
        buttonByText(app.root, t('link.copy')).click();
        await flush();
        buttonByText(app.root, t('link.share')).click();
        await flush();
        buttonByText(app.root, t('created.fund.web')).click();
        buttonByText(app.root, t('created.fund.app')).click();
        await flush();
        const made = getMade()!;
        // The link (with its secret) went exactly where the person sent it: the clipboard and the share sheet.
        expect(clip.written).toEqual([made.link]);
        expect(shared).toEqual([{ url: made.link }]);
        Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
        const hex = [...made.secret].map(b => b.toString(16).padStart(2, '0')).join('');
        const b64 = btoa(String.fromCharCode(...made.secret));
        const b64u = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const sk = [...made.key.sk].map(b => b.toString(16).padStart(2, '0')).join('');
        const forms = [hex, b64, b64u, sk];
        const frag = made.link.slice(made.link.indexOf('#') + 1);
        forms.push(...frag.split('.').filter(p => p.length >= 16 && p !== 'happy'));
        const stored: string[] = [];
        for (const store of [localStorage, sessionStorage]) for (let i = 0; i < store.length; i++) stored.push(String(store.key(i)) + '=' + store.getItem(store.key(i)!));
        // The wallet links carry the package ADDRESS and amount, never the secret.
        expect(opened).toHaveLength(2);
        const seen = [
            document.title,
            location.search,
            document.cookie,
            ...stored,
            JSON.stringify(spies.map(s => s.mock.calls.map(c => c.map(String)))),
            ...opened.map(o => String(o[0])),
        ];
        for (const f of forms) for (const place of seen) expect(place.includes(f)).toBe(false);
        // The address bar has no fragment yet either: the link is only in the page.
        expect(location.hash).toBe('');
    });
});

describe('package screen', () => {
    it('an-empty-package-offers-no-payment-and-shows-the-scam-warning', async () => {
        for (const lang of ['en', 'vi'] as const) {
            resetPage(lang);
            const l = linkFor();
            openAt(l.frag);
            await flush();
            expect(main(app!).textContent).toContain(t('pkg.empty.scam'));
            expect(main(app!).textContent).toContain(t('pkg.empty'));
            expect(main(app!).querySelectorAll('button')).toHaveLength(0);
            expect(main(app!).querySelectorAll('a')).toHaveLength(0);
            app!.stop();
        }
        expect(tables_forTest().vi['pkg.empty.scam']).toContain('Không ai cần bạn trả tiền');
    });

    it('shows an invalid-link page for a bad fragment', async () => {
        openAt('#nonsense');
        await flush();
        expect(main(app!).textContent).toContain(t('pkg.invalid.title'));
        buttonByText(main(app!), t('pkg.invalid.cta')).click();
        await flush();
        expect(app!.root.querySelector('#f-amount')).toBeTruthy();
        expect(location.hash).toBe('');
    });

    it('the-wish-renders-as-text-and-never-as-a-link', async () => {
        const evil = '<a href="https://evil.test">click</a> https://evil.test ‮abc\u0000​\n\n\n\nend';
        const l = linkFor(evil);
        const a = openAt(l.frag);
        a.chain.fund(l.key.address, 8888n);
        await reveal(a);
        const wish = main(a).querySelector('.wish-text') as HTMLElement;
        expect(wish).toBeTruthy();
        expect(wish.children).toHaveLength(0);
        expect(wish.textContent).toContain('<a href="https://evil.test">click</a>');
        expect(wish.textContent).not.toMatch(/[‪-‮⁦-⁩​-‏﻿\u0000]/);
        expect(wish.textContent).not.toMatch(/\n{3,}/);
        expect(main(a).querySelectorAll('a')).toHaveLength(0);
    });

    it('the-recovery-phrase-warning-is-always-shown-with-a-wish', async () => {
        for (const lang of ['en', 'vi'] as const) {
            resetPage(lang);
            const l = linkFor('Happy birthday');
            const a = openAt(l.frag);
            a.chain.fund(l.key.address, 8888n);
            await reveal(a);
            const wish = main(a).querySelector('.wish') as HTMLElement;
            expect(wish).toBeTruthy();
            const next = wish.nextElementSibling as HTMLElement;
            expect(next.textContent).toBe(t('pkg.recovery'));
            app!.stop();
        }
    });

    it('amount-and-warnings-are-painted-by-the-frame-outside-the-stage', async () => {
        const l = linkFor('wish text');
        const a = openAt(l.frag);
        a.chain.fund(l.key.address, 8888n, { final: false });
        await flush();
        const card = main(a).querySelector('.stage-card') as HTMLElement;
        // Before opening: the only thing over the stage is one transparent, text-less button.
        const over = card.querySelectorAll('.stage-overlay > *');
        expect(over).toHaveLength(1);
        expect((over[0] as HTMLElement).tagName).toBe('BUTTON');
        expect(over[0].textContent).toBe('');
        (over[0] as HTMLButtonElement).click();
        await flush();
        for (const sel of ['.amount', '.wish', '.warning', '.note']) {
            expect(main(a).querySelector(sel)).toBeTruthy();
            for (const el of main(a).querySelectorAll(sel)) expect(card.contains(el)).toBe(false);
        }
        expect(card.querySelector('.stage')?.textContent).toBe('');
        expect(main(a).querySelector('.amount')?.textContent).toBe('88.88');
        expect(main(a).textContent).toContain(t('pkg.unfinal'));
        expect(card.querySelectorAll('.stage-overlay > *')).toHaveLength(0);
    });

    it('shows a taken package with the stage open and no actions', async () => {
        const l = linkFor();
        const a = openAt(l.frag);
        a.chain.fund(l.key.address, 8888n);
        a.chain.steal(l.key.address);
        await flush();
        expect(main(a).textContent).toContain(t('pkg.taken'));
        // Nothing to press that acts on the gift. The one button left is the package's reference, which only shows
        // its public address on the explorer, in a new tab that is told nothing of this page.
        expect([...main(a).querySelectorAll('button')].filter(b => !b.classList.contains('ref-out'))).toHaveLength(0);
        expect(main(a).querySelectorAll('.ref-out')).toHaveLength(1);
        expect(main(a).querySelector('.ref-copy')).toBeNull();
        const opened: unknown[][] = [];
        vi.spyOn(window, 'open').mockImplementation(((...x: unknown[]) => void opened.push(x)) as unknown as typeof window.open);
        (main(a).querySelector('.ref-out') as HTMLButtonElement).click();
        expect(opened).toEqual([[`https://explorer.e.cash/address/${l.key.address}`, '_blank', 'noopener,noreferrer']]);
        // No link element, and the page's own link is nowhere in what was opened.
        expect(main(a).querySelectorAll('a')).toHaveLength(0);
        expect(String(opened[0]![0])).not.toContain('#');
    });

    it('the-screen-never-assumes-who-is-reading', async () => {
        const banned = [/bạn đã gửi/i, /you sent/i, /your gift from/i, /quà của bạn từ/i, /bạn gửi/i, /you gave/i, /từ bạn/i, /from you/i, /your gift/i, /you received/i];
        for (const lang of ['vi', 'en'] as const) {
            for (const [k, v] of Object.entries(tables_forTest()[lang])) {
                // The giver's own screens may say "you"; the shared package screen's keys may not assume a role.
                if (!/^(pkg|take)\./.test(k)) continue;
                for (const re of banned) expect(re.test(v), `${lang} ${k}`).toBe(false);
            }
        }
        // The package screen is identical whether or not this session made the link.
        const clip = stubClipboard();
        void clip;
        app = boot();
        await createGift(app.root, '88.88', 'same');
        const made = getMade()!;
        const frag = made.link.slice(made.link.indexOf('#'));
        const chain = app.chain;
        chain.fund(made.key.address, made.sats);
        app.stop();
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        await reveal(app);
        const withSession = main(app).textContent;
        app.stop();
        clearMade();
        app = boot(chain);
        await reveal(app);
        expect(main(app).textContent).toBe(withSession);
        expect(withSession).toContain('same');
    });

    it('a token in the package is information only: the XEC can still be taken', async () => {
        const l = linkFor();
        const chain = createDemoChain();
        chain.fund(l.key.address, 8888n);
        chain.fund(l.key.address, 546n, { token: true });
        history.replaceState(null, '', '/' + l.frag);
        app = boot(chain);
        await reveal(app);
        expect(main(app).textContent).toContain(t('pkg.token'));
        expect(buttonByText(main(app), t('pkg.take')).disabled).toBe(false);
        // One way to move a gift, and one only: home to a wallet. Nothing offers to move it to another link.
        expect([...main(app).querySelectorAll('.actions button')].map(b => b.textContent)).toEqual([t('pkg.take'), t('pkg.qr')]);
    });
});

describe('take home', () => {
    async function openTake(l: ReturnType<typeof linkFor>, sats = 8888n) {
        const a = openAt(l.frag);
        a.chain.fund(l.key.address, sats);
        await reveal(a);
        buttonByText(main(a), t('pkg.take')).click();
        await flush();
        return a;
    }
    const dest = () => deriveKey(newSecret()).address;

    it('the-newcomer-is-told-to-take-the-faucet-first', async () => {
        for (const lang of ['en', 'vi'] as const) {
            resetPage(lang);
            const a = await openTake(linkFor());
            const steps = [...main(a).querySelectorAll('ol.steps > li')];
            expect(steps).toHaveLength(3);
            expect(steps[1].textContent).toBe(t('take.s2'));
            const input = main(a).querySelector('#th-addr') as HTMLInputElement;
            expect(steps[1].compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            expect(input.getAttribute('autocapitalize')).toBe('off');
            expect(input.getAttribute('autocomplete')).toBe('off');
            expect(input.getAttribute('spellcheck')).toBe('false');
            a.stop();
        }
    });

    it('validates the address and shows the amount and fee before sending', async () => {
        const a = await openTake(linkFor());
        const input = main(a).querySelector('#th-addr') as HTMLInputElement;
        const go = goBtn(a);
        expect(go.disabled).toBe(true);
        type(input, 'ecash:notanaddress');
        expect(main(a).textContent).toContain(t('take.addr.bad'));
        expect(go.disabled).toBe(true);
        type(input, dest());
        expect(go.disabled).toBe(false);
        expect(main(a).querySelector('.confirm')?.textContent).toMatch(/Taken to this wallet, it comes to [\d.,]+ XEC \(after [\d.,]+ XEC of network fee\)\./);
        expect(takeHome).not.toHaveBeenCalled();
    });

    it('taken-home-is-shown-only-after-finalization', async () => {
        const l = linkFor();
        const a = await openTake(l);
        const pending = { kind: 'pending', txid: 'ab'.repeat(32), sentSats: 8000n, leftCoins: 0 } as TakeResult;
        vi.mocked(takeHome).mockResolvedValueOnce(pending);
        type(main(a).querySelector('#th-addr') as HTMLInputElement, dest());
        goBtn(a).click();
        await flush();
        expect(main(a).textContent).toContain(t('take.pending'));
        expect(main(a).textContent).not.toContain('✓');
        expect(main(a).querySelector('.done-mark')).toBeNull();
        expect(location.hash).not.toBe('');
        // "Check again" is takeHome again with the SAME arguments: core resolves the earlier sweep and never signs a second.
        vi.mocked(takeHome).mockResolvedValueOnce(pending);
        buttonByText(main(a), t('take.check')).click();
        await flush();
        expect(takeHome).toHaveBeenCalledTimes(2);
        expect(vi.mocked(takeHome).mock.calls[1][0]).toEqual(vi.mocked(takeHome).mock.calls[0][0]);
        expect(main(a).querySelector('.done-mark')).toBeNull();
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'done', txid: 'ab'.repeat(32), sentSats: 8000n, leftCoins: 0 });
        buttonByText(main(a), t('take.check')).click();
        await flush();
        expect(main(a).querySelector('.done-mark')?.textContent).toBe('✓');
        expect(main(a).textContent).toContain(t('take.done.body'));
    });

    it('the address a gift arrived at is kept, and offered for the next gift by a press, never typed in', async () => {
        const home = dest();
        const a = await openTake(linkFor());
        expect(main(a).querySelector('.saved-dest')?.hasAttribute('hidden')).toBe(true);
        // Not yet settled: nothing is kept.
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'pending', txid: 'ab'.repeat(32), sentSats: 8000n, leftCoins: 0 } as TakeResult);
        type(main(a).querySelector('#th-addr') as HTMLInputElement, home);
        goBtn(a).click();
        await flush();
        expect(localStorage.getItem('gift.dest')).toBeNull();
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'done', txid: 'ab'.repeat(32), sentSats: 8000n, leftCoins: 0, to: home });
        buttonByText(main(a), t('take.check')).click();
        await flush();
        expect(localStorage.getItem('gift.dest')).toBe(home);
        a.stop();

        // The next gift: the address is shown whole, the box is empty and the button cannot be pressed.
        vi.mocked(takeHome).mockClear();
        const b = await openTake(linkFor());
        const box = main(b).querySelector('.saved-dest') as HTMLElement;
        const input = main(b).querySelector('#th-addr') as HTMLInputElement;
        expect(box.hasAttribute('hidden')).toBe(false);
        expect(box.querySelector('.saved-dest-addr')?.textContent).toBe(home);
        // What to check before using it sits under one line with the switch, folded; no warning box in a fold.
        const notes = [...main(b).querySelectorAll('details.fold')].find(d => d.querySelector('summary')?.textContent === t('take.saved.sum')) as HTMLDetailsElement;
        expect(notes.open).toBe(false);
        expect(notes.querySelector('.fold-body p.strong')?.textContent).toBe(t('take.saved.warn'));
        expect(notes.querySelector('.warning')).toBeNull();
        expect(box.querySelector('.warning')).toBeNull();
        expect(notes.querySelector('label.check')?.textContent).toBe(t('take.save.auto'));
        expect(input.value).toBe('');
        expect(goBtn(b).disabled).toBe(true);
        // Typing another address puts the offer away; emptying the box brings it back.
        type(input, 'ecash:q');
        expect(box.hasAttribute('hidden')).toBe(true);
        type(input, '');
        expect(box.hasAttribute('hidden')).toBe(false);
        buttonByText(box, t('take.saved.use')).click();
        expect(input.value).toBe(home);
        expect(goBtn(b).disabled).toBe(false);
        expect(box.hasAttribute('hidden')).toBe(true);
        expect(takeHome).not.toHaveBeenCalled();
    });

    it('what is kept is the address the money went to, as core says it: not what the box holds when the answer comes', async () => {
        const first = dest();
        const second = dest();
        const a = await openTake(linkFor());
        const input = main(a).querySelector('#th-addr') as HTMLInputElement;
        // The first press fails on the way back; the form returns and another address is typed.
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'error', code: 'offline', message: '' });
        type(input, first);
        goBtn(a).click();
        await flush();
        type(input, second);
        // Core finds the earlier sweep done: it went to the first address.
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'done', txid: 'ab'.repeat(32), sentSats: 8000n, leftCoins: 0, to: first });
        goBtn(a).click();
        await flush();
        expect(main(a).querySelector('.done-mark')).not.toBeNull();
        expect(localStorage.getItem('gift.dest')).toBe(first);
        a.stop();

        // A result that does not say where it went keeps nothing, and leaves an older address as it was.
        const b = await openTake(linkFor());
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'done', txid: 'cd'.repeat(32), sentSats: 8000n, leftCoins: 0 });
        type(main(b).querySelector('#th-addr') as HTMLInputElement, second);
        goBtn(b).click();
        await flush();
        expect(localStorage.getItem('gift.dest')).toBe(first);
    });

    it('a kept address can be forgotten, and the switch turned off keeps none', async () => {
        const home = dest();
        localStorage.setItem('gift.dest', home);
        const a = await openTake(linkFor());
        const box = main(a).querySelector('.saved-dest') as HTMLElement;
        const forget = buttonByText(main(a), t('take.saved.forget'));
        expect(forget.closest('details.fold')).not.toBeNull();
        forget.click();
        expect(forget.hidden).toBe(true);
        expect(localStorage.getItem('gift.dest')).toBeNull();
        expect(box.hasAttribute('hidden')).toBe(true);
        // Gone for good on this screen: emptying the box does not bring it back.
        type(main(a).querySelector('#th-addr') as HTMLInputElement, '');
        expect(box.hasAttribute('hidden')).toBe(true);
        a.stop();

        localStorage.setItem('gift.dest', home);
        const b = await openTake(linkFor());
        const sw = [...main(b).querySelectorAll('label.check')].find(l => l.textContent === t('take.save.auto'))!.querySelector('input') as HTMLInputElement;
        expect(sw.checked).toBe(true);
        sw.click();
        expect(localStorage.getItem('gift.dest')).toBe('off');
        expect((main(b).querySelector('.saved-dest') as HTMLElement).hasAttribute('hidden')).toBe(true);
        const went = dest();
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'done', txid: 'ab'.repeat(32), sentSats: 8000n, leftCoins: 0, to: went });
        type(main(b).querySelector('#th-addr') as HTMLInputElement, went);
        goBtn(b).click();
        await flush();
        expect(localStorage.getItem('gift.dest')).toBe('off');
    });

    it('a kept address of the right shape that is not a real address cannot be sent to', async () => {
        const home = dest();
        // One character changed: the checksum no longer holds.
        const bad = home.slice(0, -1) + (home.endsWith('q') ? 'p' : 'q');
        localStorage.setItem('gift.dest', bad);
        const a = await openTake(linkFor());
        buttonByText(main(a).querySelector('.saved-dest') as HTMLElement, t('take.saved.use')).click();
        expect(goBtn(a).disabled).toBe(true);
        expect(main(a).querySelector('#th-msg')?.textContent).toBe(t('take.addr.bad'));
    });

    it('anything in storage that is not an address of the kept shape is not offered', async () => {
        for (const junk of ['ecash:qqqq', 'etoken:' + 'q'.repeat(42), 'javascript:alert(1)', ' ' + dest()]) {
            resetPage('en');
            localStorage.setItem('gift.dest', junk);
            const a = await openTake(linkFor());
            expect((main(a).querySelector('.saved-dest') as HTMLElement).hasAttribute('hidden'), junk).toBe(true);
            expect((main(a).querySelector('#th-addr') as HTMLInputElement).value).toBe('');
            a.stop();
        }
    });

    it('offers the rest when coins are left after a sweep', async () => {
        const l = linkFor();
        const a = await openTake(l);
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'done', txid: 'cd'.repeat(32), sentSats: 8000n, leftCoins: 3 });
        type(main(a).querySelector('#th-addr') as HTMLInputElement, dest());
        goBtn(a).click();
        await flush();
        expect(main(a).textContent).toContain(t('rest.left', { n: 3 }));
        // Coins remain: the link stays in the address bar until the last round.
        expect(location.hash).not.toBe('');
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'done', txid: 'ef'.repeat(32), sentSats: 900n, leftCoins: 0 });
        buttonByText(main(a), t('rest.take')).click();
        await flush();
        expect(takeHome).toHaveBeenCalledTimes(2);
        expect(main(a).textContent).not.toContain(t('rest.left', { n: 3 }));
        expect(location.hash).toBe('');
    });

    it('the-fragment-is-cleared-after-taking-home', async () => {
        const l = linkFor();
        const a = await openTake(l);
        const replace = vi.spyOn(history, 'replaceState');
        a.chain.nextVerdict('final', 5);
        type(main(a).querySelector('#th-addr') as HTMLInputElement, dest());
        goBtn(a).click();
        await flush(30);
        await new Promise(r => setTimeout(r, 60));
        await flush();
        expect(main(a).querySelector('.done-mark')).toBeTruthy();
        expect(replace).toHaveBeenCalledWith(null, '', location.pathname + location.search);
        expect(location.hash).toBe('');
        expect(location.href).not.toContain(l.frag);
    });

    it('says plainly when someone else took the gift first', async () => {
        const l = linkFor();
        const a = await openTake(l);
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'lost' });
        type(main(a).querySelector('#th-addr') as HTMLInputElement, dest());
        goBtn(a).click();
        await flush();
        expect(main(a).textContent).toContain(t('take.lost'));
        expect(main(a).querySelector('.done-mark')).toBeNull();
    });

    it('gives a plain sentence for an error code', async () => {
        const a = await openTake(linkFor());
        vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'error', code: 'dust', message: 'x' });
        type(main(a).querySelector('#th-addr') as HTMLInputElement, dest());
        goBtn(a).click();
        await flush();
        expect(main(a).textContent).toContain(t('take.err.dust'));
    });
});

describe('created safety', () => {
    it('start-over-asks-first-when-the-link-was-not-saved', async () => {
        app = boot();
        await createGift(app.root);
        // Funded, but the link was never saved: the only copy of the key is this page.
        app.chain.fund(getMade()!.key.address, getMade()!.sats);
        await flush();
        expect(app.root.querySelector('.status--ok')).toBeTruthy();
        // Funded: the title says the gift is ready, and the way out is named for what comes next, not for undoing.
        expect(app.root.querySelector('h1')!.textContent).toBe(t('created.title'));
        // Taken while the screen is up: the title no longer says ready, and never says "no money yet" either.
        app.chain.steal(getMade()!.key.address);
        await flush();
        expect(app.root.querySelector('h1')!.textContent).toBe(t('pkg.taken'));
        const ask = vi.spyOn(window, 'confirm').mockReturnValue(false);
        buttonByText(app.root, t('created.startover.next')).click();
        expect(ask).toHaveBeenCalledWith(t('created.startover.unsaved'));
        expect(getMade()).not.toBeNull();
        expect(app.root.querySelector('#f-amount')).toBeNull();
        ask.mockReturnValue(true);
        buttonByText(app.root, t('created.startover.next')).click();
        await flush();
        expect(getMade()).toBeNull();
    });
});

describe('closing the tab on the funding step', () => {
    /** Whether the page asks the browser to check with the person before the tab goes. */
    const asksBeforeLeaving = (): boolean => {
        const e = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(e);
        return e.defaultPrevented;
    };

    it('asks-from-the-moment-the-gift-is-made-until-it-is-funded-and-its-link-saved-again', async () => {
        stubClipboard();
        app = boot();
        expect(asksBeforeLeaving()).toBe(false);
        await createGift(app.root);
        // Made, link not saved.
        expect(asksBeforeLeaving()).toBe(true);
        // Saved, not funded yet: the person is on the way to the wallet.
        buttonByText(app.root, t('link.copy')).click();
        await flush();
        expect(asksBeforeLeaving()).toBe(true);
        // Funded: the copy made before may no longer be on the clipboard.
        app.chain.fund(getMade()!.key.address, getMade()!.sats);
        await flush();
        expect(asksBeforeLeaving()).toBe(true);
        // Saved once more, now that the gift is funded: nothing is lost by leaving.
        const after = app.root.querySelector('.after-funded') as HTMLElement;
        buttonByText(after, t('link.copy')).click();
        await flush();
        expect(asksBeforeLeaving()).toBe(false);
    });

    it('the gift\'s reference copies its address on a press, and opens nothing', async () => {
        const clip = stubClipboard();
        app = boot();
        await createGift(app.root);
        const opened: unknown[] = [];
        vi.spyOn(window, 'open').mockImplementation(((u: unknown) => void opened.push(u)) as unknown as typeof window.open);
        const ref = app.root.querySelector('.amount-ref .ref-copy') as HTMLButtonElement;
        ref.click();
        await flush();
        // The address: where the gift is. Never the link, which is its key.
        expect(clip.written).toEqual([getMade()!.key.address]);
        expect(clip.written[0]).not.toContain('#');
        expect(app.root.querySelector('.amount-ref .ref-said')!.textContent).toBe(t('link.copied'));
        expect(opened).toEqual([]);
        // A browser that will not copy: the page says so, and never prints the whole address.
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => Promise.reject(new Error('no')) } });
        ref.click();
        await flush();
        expect(app.root.querySelector('.amount-ref .ref-said')!.textContent).toBe(t('ref.copyfail'));
        expect(app.root.querySelector('.amount-ref')!.textContent).not.toContain(getMade()!.key.address.slice(6));
        // Copying an address is not saving the link: leaving still asks.
        expect(getMade()!.saved).toBe(false);
    });

    it('the last step, send the link, is not there until the gift is ready; then it has the link\'s buttons', async () => {
        const clip = stubClipboard();
        app = boot();
        await createGift(app.root);
        const step = app.root.querySelector('.step--send') as HTMLElement;
        expect(step.hidden).toBe(true);
        app.chain.fund(getMade()!.key.address, getMade()!.sats);
        await flush();
        expect(step.hidden).toBe(false);
        expect(step.textContent).toContain(t('home.how.3.t'));
        expect(step.textContent).toContain(t('created.funded.send'));
        // An ordinary gift is not asked for a token.
        expect([...step.querySelectorAll('p')].find(p => p.textContent === t('created.withtoken.next'))!.hidden).toBe(true);
        buttonByText(step, t('link.copy')).click();
        await flush();
        expect(clip.written).toEqual([getMade()!.link]);
    });

    it('a gift that was to carry a token is reminded of it at the last step until the token is in', async () => {
        app = boot();
        await flush();
        (app.root.querySelector('.opt-btn[data-opt="token"]') as HTMLButtonElement).click();
        await createGift(app.root);
        expect(getMade()!.withToken).toBe(true);
        app.chain.fund(getMade()!.key.address, getMade()!.sats);
        await flush();
        const step = app.root.querySelector('.step--send') as HTMLElement;
        expect(step.hidden).toBe(false);
        const due = [...step.querySelectorAll('p')].find(p => p.textContent === t('created.withtoken.next'))!;
        expect(due.hidden).toBe(false);
    });

    it('stops-asking-once-the-person-starts-over', async () => {
        app = boot();
        await createGift(app.root);
        expect(asksBeforeLeaving()).toBe(true);
        // Nothing is in it yet, and the title says so.
        expect(app.root.querySelector('h1')!.textContent).toBe(t('created.title.empty'));
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        buttonByText(app.root, t('created.startover')).click();
        await flush();
        expect(getMade()).toBeNull();
        expect(asksBeforeLeaving()).toBe(false);
    });
});

describe('start over always asks', () => {
    it('even-when-the-gift-is-funded-and-the-link-saved', async () => {
        stubClipboard();
        app = boot();
        await createGift(app.root);
        buttonByText(app.root, t('link.copy')).click();
        await flush();
        app.chain.fund(getMade()!.key.address, getMade()!.sats);
        await flush();
        const ask = vi.spyOn(window, 'confirm').mockReturnValue(false);
        buttonByText(app.root, t('created.startover.next')).click();
        expect(ask).toHaveBeenCalledWith(t('created.startover.funded'));
        expect(getMade()).not.toBeNull();
        ask.mockReturnValue(true);
        buttonByText(app.root, t('created.startover.next')).click();
        await flush();
        expect(getMade()).toBeNull();
    });
});

describe('the guide', () => {
    it('the-guide-speaks-only-fixed-strings-shipped-with-the-page', async () => {
        for (const lang of ['en', 'vi'] as const) {
            resetPage(lang);
            const shipped = new Set(Object.values(tables_forTest()[lang]));
            const said: string[] = [];
            const collect = (a: Booted) => main(a).querySelectorAll('.guide').forEach(g => said.push((g.textContent ?? '').trim()));
            const l = linkFor('pkg.guide.next ' + t('pkg.guide.done'));
            const a = openAt(l.frag);
            a.chain.fund(l.key.address, 8888n);
            await flush();
            collect(a);
            await reveal(a);
            collect(a);
            buttonByText(main(a), t('pkg.take')).click();
            await flush();
            vi.mocked(takeHome).mockResolvedValueOnce({ kind: 'done', txid: 'ab'.repeat(32), sentSats: 8000n, leftCoins: 0 });
            type(main(a).querySelector('#th-addr') as HTMLInputElement, deriveKey(newSecret()).address);
            goBtn(a).click();
            await flush();
            collect(a);
            // The invitation before opening, and the line once the gift is home (the revealed screen needs no caption).
            expect(said.length).toBeGreaterThanOrEqual(2);
            for (const text of said) expect(shipped.has(text), text).toBe(true);
            a.stop();
        }
    });
});

describe('shell', () => {
    it('switches language without storing anything but the language', async () => {
        app = boot();
        (app.root.querySelector('.lang-item[data-lang="vi"]') as HTMLButtonElement).click();
        await flush();
        expect(getLang()).toBe('vi');
        expect(document.documentElement.lang).toBe('vi');
        expect(app.root.textContent).toContain(tables_forTest().vi['create.title' as Key]);
        expect(localStorage.length).toBe(1);
        expect(localStorage.getItem('gift.lang')).toBe('vi');
        setLang('en');
    });
});

describe('a gift that is funded again before anyone takes it', () => {
    it('the giver sees everything the package holds, and that all of it goes to whoever opens it', async () => {
        stubClipboard();
        app = boot();
        await createGift(app.root);
        const made = getMade()!;
        buttonByText(app.root, t('link.copy')).click();
        await flush();
        app.chain.fund(made.key.address, made.sats);
        await flush();
        const meant = formatXec(made.sats, 'en');
        expect(app.root.textContent).toContain(`${t('created.status.funded')} ${t('created.status.holds', { got: meant, want: meant })}`);
        // Funded a second time: the total, not the first amount.
        app.chain.fund(made.key.address, 111_100n);
        await flush();
        const total = formatXec(made.sats + 111_100n, 'en');
        expect(app.root.textContent).toContain(t('created.status.more', { got: total, want: meant }));
        expect(app.root.textContent).not.toContain(t('created.status.holds', { got: meant, want: meant }));
    });

    it('the one who opens it is shown the whole amount, and takes all of it home', async () => {
        const l = linkFor();
        const a = openAt(l.frag);
        a.chain.fund(l.key.address, 8888n);
        a.chain.fund(l.key.address, 1112n);
        await reveal(a);
        // 88.88 and 11.12 XEC: one amount, 100.00.
        expect(main(a).querySelector('.amount')?.textContent).toContain('100');
        buttonByText(main(a), t('pkg.take')).click();
        await flush();
        const home = deriveKey(newSecret()).address;
        type(main(a).querySelector('#th-addr') as HTMLInputElement, home);
        goBtn(a).click();
        await flush(40);
        // Nothing is left behind: both coins went in the one sweep.
        const after = await a.chain.read(l.key.address);
        expect(after.kind).toBe('taken');
        expect(main(a).textContent).not.toContain(t('rest.left', { n: 1 }));
    });
});
