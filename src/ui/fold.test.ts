/**
 * Folds: a block behind one line. What must be read is never behind a press:
 * no warning and no safety line sits inside one, on any screen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoChain, deriveKey, encodeLink, newSecret } from '../core';
import type { DemoChain } from '../core';
import { SAFETY_KEYS, t } from '../i18n';
import { getMade } from './session';
import { rememberSent } from './kept';
import { h } from './dom';
import { fold, openFold } from './layout';
import { boot, buttonByText, createGift, flush, resetPage, stubClipboard, type, type Booted } from './testkit';

let app: Booted | null = null;
beforeEach(() => {
    resetPage('en');
    vi.clearAllMocks();
});
afterEach(() => {
    app?.stop();
    app = null;
    vi.restoreAllMocks();
});

const main = (a: Booted) => a.root.querySelector('main') as HTMLElement;
const home = deriveKey(new Uint8Array(16).fill(7));
const GIVER = '76a914' + '11'.repeat(20) + '88ac';
const STRANGER = '76a914' + '99'.repeat(20) + '88ac';
const ID = 'a1'.repeat(32);

/** Every element that must be in plain view but sits inside a fold. Empty on a sound page. */
function foldedSafety(root: ParentNode = document): Element[] {
    const safety = new Set(SAFETY_KEYS.map(k => t(k).trim()));
    return [...root.querySelectorAll('details *')].filter(el => el.classList.contains('warning') || safety.has((el.textContent ?? '').trim()));
}
const folds = (root: ParentNode): HTMLDetailsElement[] => [...root.querySelectorAll('details.fold')] as HTMLDetailsElement[];
const foldBy = (root: ParentNode, summary: string): HTMLDetailsElement => {
    const f = folds(root).find(d => (d.querySelector('summary')!.textContent ?? '').startsWith(summary));
    if (!f) throw new Error('no fold: ' + summary);
    return f;
};
const press = (f: HTMLDetailsElement): void => (f.querySelector('summary') as HTMLElement).click();
const switchTo = async (a: Booted, lang: string): Promise<void> => {
    (a.root.querySelector(`.lang-item[data-lang="${lang}"]`) as HTMLButtonElement).click();
    await flush();
};

function open(sats: bigint): { chain: DemoChain } {
    const secret = newSecret();
    const key = deriveKey(secret);
    const url = encodeLink({ version: 1, secret, wrapper: 'lixi', wish: 'Happy birthday' }, location.origin);
    const chain = createDemoChain({ delayMs: 5 });
    if (sats > 0n) chain.fund(key.address, sats);
    history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
    app = boot(chain);
    return { chain };
}
async function reveal(a: Booted): Promise<void> {
    await flush(12);
    (a.root.querySelector('.tap') as HTMLButtonElement).click();
    await flush();
    [...a.root.querySelectorAll('button')].find(b => b.textContent === t('common.skip'))?.click();
    await flush(12);
}

describe('the fold itself', () => {
    it('the guard bites: a warning or a safety line put in a fold is found', () => {
        const bad = h('div', null, fold('more', null, h('p', { class: 'warning' }, 'x'), h('p', null, t('created.keepopen'))), h('p', { class: 'warning' }, 'in view'));
        expect(foldedSafety(bad).length).toBe(2);
    });

    it('is closed unless asked, remembers what the person did under its id, and grows the capsule only on a press that opens', () => {
        const a = fold('one', { id: 'x' }, h('p', null, 'body'));
        expect(a.open).toBe(false);
        expect(a.querySelector('summary')!.textContent).toBe('one');
        expect(a.querySelector('.fold-body')!.textContent).toBe('body');
        const shown: string[] = [];
        const host = h('div', { 'oncap:show': () => shown.push('show') }, a);
        document.body.append(host);
        press(a);
        expect(a.open).toBe(true);
        expect(shown).toEqual(['show']);
        // Built again (a repaint): open, and nothing is pulled into view for it.
        const again = fold('one', { id: 'x' }, h('p', null, 'body'));
        host.append(again);
        expect(again.open).toBe(true);
        expect(shown).toEqual(['show']);
        // Closing says nothing to the capsule, and is remembered too.
        press(again);
        expect(shown).toEqual(['show']);
        expect(fold('one', { id: 'x' }).open).toBe(false);
        // Opened by the page, not by a press: open, remembered, the view left where it is.
        const quiet = fold('two', { id: 'y' });
        host.append(quiet);
        openFold(quiet);
        expect(quiet.open).toBe(true);
        expect(shown).toEqual(['show']);
        expect(fold('two', { id: 'y' }).open).toBe(true);
        // Without an id nothing is remembered; `open` starts it open.
        expect(fold('three', { open: true }).open).toBe(true);
        expect(fold('three', null).open).toBe(false);
    });
});

describe('no screen folds what must be read', () => {
    it('the create screen folds one thing only, the dressing of the wrapper (a choice, closed, with nothing to be read in it), and has no lead paragraph', async () => {
        app = boot();
        expect(main(app).querySelector('.screen-create')).not.toBeNull();
        const all = folds(main(app));
        expect(all).toHaveLength(1);
        expect(main(app).querySelectorAll('details')).toHaveLength(1);
        expect(all[0]!.querySelector('summary')!.textContent).toBe(t('create.dress.title'));
        expect(all[0]!.open).toBe(false);
        expect(all[0]!.querySelector('.warning, .note, p')).toBeNull();
        expect(main(app).querySelector('.layout-head .lead')).toBeNull();
        expect(main(app).textContent).toContain(t('create.truth.1'));
        expect(foldedSafety()).toEqual([]);
    });

    it('the created screen: remembering and the token step are folded, the warnings are not, and an opened fold stays open in another language', async () => {
        stubClipboard();
        app = boot();
        await createGift(app.root, '20', 'For you');
        const made = getMade()!;
        expect(foldedSafety()).toEqual([]);
        const keepOpen = [...main(app).querySelectorAll('.warning')].find(w => w.textContent === t('created.keepopen'))!;
        expect(keepOpen.closest('details')).toBeNull();
        // Remembering: one line, closed; what it does is behind it.
        const rem = foldBy(main(app), t('sent.title'));
        expect(rem.open).toBe(false);
        expect(rem.querySelector('summary')!.textContent).toBe(t('sent.title'));
        expect(rem.querySelector('.fold-body')!.textContent).toContain(t('sent.body'));
        // The token step: hidden on its box until the gift holds XEC, then one closed line.
        const box = main(app).querySelector('.token-box') as HTMLElement;
        expect(box.hidden).toBe(true);
        buttonByText(main(app), t('link.copy')).click();
        await flush();
        app.chain.fund(made.key.address, made.sats, { tx: { inputs: [GIVER], outputs: [] }, height: 1 });
        await flush(12);
        expect(box.hidden).toBe(false);
        const tok = foldBy(box, t('created.tok.title'));
        expect(tok.open).toBe(false);
        expect(foldedSafety()).toEqual([]);

        // Opened by the person, pressed, then another language: still open. The one line is the title alone:
        // whether the gift is remembered is said inside, with the reminder that the link is not saved.
        press(rem);
        expect(rem.open).toBe(true);
        buttonByText(rem, t('sent.remember')).click();
        expect(rem.querySelector('summary')!.textContent).toBe(t('sent.title'));
        await switchTo(app, 'vi');
        await flush(12);
        const rem2 = foldBy(main(app), t('sent.title'));
        expect(rem2).not.toBe(rem);
        expect(rem2.open).toBe(true);
        expect(rem2.querySelector('summary')!.textContent).toBe(t('sent.title'));
        // The one nobody opened stays closed.
        expect(foldBy(main(app), t('created.tok.title')).open).toBe(false);
        expect(foldedSafety()).toEqual([]);
        // Closed again, and that is kept too.
        press(rem2);
        await switchTo(app, 'en');
        await flush(12);
        expect(foldBy(main(app), t('sent.title')).open).toBe(false);
    });

    it('a new gift does not inherit the folds opened on the one before', async () => {
        stubClipboard();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        app = boot();
        await createGift(app.root, '20');
        press(foldBy(main(app), t('sent.title')));
        buttonByText(main(app), t('created.startover')).click();
        await flush();
        await createGift(app.root, '21');
        expect(foldBy(main(app), t('sent.title')).open).toBe(false);
    });

    it('the token step opens itself for the fund QR and for anything it has to say about a token', async () => {
        stubClipboard();
        app = boot();
        await createGift(app.root, '88.88');
        const made = getMade()!;
        const tok = foldBy(main(app), t('created.tok.title'));
        buttonByText(main(app), t('link.copy')).click();
        await flush();
        expect(tok.open).toBe(false);
        buttonByText(main(app), t('created.fund.qr')).click();
        expect(tok.open).toBe(true);
        // Closed by the person, it does not spring back on its own…
        press(tok);
        app.chain.fund(made.key.address, made.sats, { tx: { inputs: [GIVER], outputs: [] }, height: 1 });
        await flush(12);
        expect(tok.open).toBe(false);
        // …until there is a word about a token to read.
        app.chain.fund(made.key.address, 546n, { tokenInfo: { tokenId: ID, kind: 'alp', atoms: 5n, baton: false }, tx: { inputs: [STRANGER], outputs: [] }, height: 2 });
        await flush(12);
        expect(tok.open).toBe(true);
        expect(tok.querySelector('.fold-body')!.textContent).toContain(t('created.tok.seen.other'));
        expect(foldedSafety()).toEqual([]);
    });

    it('a gift made to carry a token keeps its token step a plain open box', async () => {
        stubClipboard();
        app = boot();
        buttonByText(main(app), t('create.tokenonly')).click();
        (main(app).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flush();
        expect(getMade()!.tokenOnly).toBe(true);
        let box = main(app).querySelector('.token-box') as HTMLElement;
        expect(box.querySelector('details')).toBeNull();
        expect(box.closest('details')).toBeNull();
        expect(box.querySelector('.label')!.textContent).toBe(t('created.tok.title.main'));
        expect(foldedSafety()).toEqual([]);
        app.stop();
        resetPage('en');
        app = boot();
        type(main(app).querySelector('#f-amount') as HTMLInputElement, '30');
        const withTok = main(app).querySelector('#f-withtoken') as HTMLInputElement;
        withTok.checked = true;
        withTok.dispatchEvent(new Event('change', { bubbles: true }));
        (main(app).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flush();
        expect(getMade()!.withToken).toBe(true);
        box = main(app).querySelector('.token-box') as HTMLElement;
        expect(box.querySelector('details')).toBeNull();
        expect(box.closest('details')).toBeNull();
        expect(foldedSafety()).toEqual([]);
    });

    it('the package screen, sealed, opened, emptied and taken: only the note about the browser copy is folded', async () => {
        const { chain } = open(2_000n);
        await flush(12);
        expect(main(app!).querySelector('details')).toBeNull();
        expect(foldedSafety()).toEqual([]);
        await reveal(app!);
        expect(main(app!).querySelector('details')).toBeNull();
        expect(main(app!).querySelectorAll('.warning').length).toBeGreaterThan(0);
        expect(foldedSafety()).toEqual([]);
        buttonByText(main(app!), t('pkg.take')).click();
        await flush();
        expect(foldedSafety()).toEqual([]);
        type(main(app!).querySelector('#th-addr') as HTMLInputElement, home.address);
        await flush();
        expect(foldedSafety()).toEqual([]);
        buttonByText(main(app!), t('take.go')).click();
        await new Promise(r => setTimeout(r, 60));
        await flush(12);
        expect(main(app!).textContent).toContain(t('kept.title'));
        // The take-home form, with its own fold about the kept address, is put away once the gift is home.
        expect(folds(main(app!)).filter(f => f.closest('[hidden]') === null).length).toBe(1);
        const warn = foldBy(main(app!), t('kept.warn.sum'));
        expect(warn.open).toBe(false);
        expect(warn.querySelector('.fold-body')!.textContent).toBe(t('kept.warn'));
        // The recipient's screen carries no link, folded or not.
        expect(warn.querySelector('a')).toBeNull();
        expect(foldedSafety()).toEqual([]);
        press(warn);
        await switchTo(app!, 'vi');
        await flush(12);
        expect(foldBy(main(app!), t('kept.warn.sum')).open).toBe(true);
        expect(foldedSafety()).toEqual([]);
        void chain;
    });

    it('an empty package says its warnings in plain view', async () => {
        open(0n);
        await flush(12);
        expect(main(app!).querySelectorAll('.warning').length).toBeGreaterThan(0);
        expect(main(app!).querySelector('details')).toBeNull();
        expect(foldedSafety()).toEqual([]);
    });

    it('the shop and its two lists: the shelf filter on the shop, one folded note under each list, nothing else', async () => {
        const key = deriveKey(newSecret());
        expect(rememberSent({ address: key.address, at: Date.now(), wrapper: 'lixi', sats: '2000' })).toBe(true);
        // A kept gift, by the page's own way of keeping one.
        open(2_000n);
        await reveal(app!);
        buttonByText(main(app!), t('pkg.take')).click();
        await flush();
        type(main(app!).querySelector('#th-addr') as HTMLInputElement, home.address);
        await flush();
        buttonByText(main(app!), t('take.go')).click();
        await new Promise(r => setTimeout(r, 60));
        await flush(12);
        buttonByText(main(app!), t('kept.save')).click();
        app!.stop();
        history.replaceState(null, '', '/');
        app = boot(undefined, { stay: true });
        await flush();
        // The shop folds one thing: the switches that narrow the shelf.
        expect([...app.root.querySelectorAll('details')].map(d => d.className)).toEqual(['fold home-filter']);
        expect(foldedSafety()).toEqual([]);

        buttonByText(app.root, t('kept.nav')).click();
        expect(folds(app.root).length).toBe(1);
        const kept = foldBy(app.root, t('kept.warn.sum'));
        expect(kept.open).toBe(false);
        expect(kept.querySelector('.fold-body')!.textContent).toBe(t('kept.warn'));
        expect(foldedSafety()).toEqual([]);
        press(kept);
        await switchTo(app, 'vi');
        expect(foldBy(app.root, t('kept.warn.sum')).open).toBe(true);
        await switchTo(app, 'en');

        (app.root.querySelector('.home-back') as HTMLButtonElement).click();
        buttonByText(app.root, t('sent.nav')).click();
        await flush(12);
        expect(folds(app.root).length).toBe(1);
        const sent = foldBy(app.root, t('sent.warn.sum'));
        expect(sent.open).toBe(false);
        expect(sent.querySelector('.fold-body')!.textContent).toBe(t('sent.warn'));
        expect(foldedSafety()).toEqual([]);
    });
});
