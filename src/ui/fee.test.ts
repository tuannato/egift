/**
 * The network fee, said in plain words on both sides, and what stays readable
 * once a gift has been taken.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoChain, deriveKey, encodeLink, newSecret, takeFeeEstimate } from '../core';
import type { DemoChain, PackageKey } from '../core';
import { t } from '../i18n';
import { getMade } from './session';
import { isKept, keep, keepableWish, keepsakePage, keptId, loadKept, loadSent, rememberSent } from './kept';
import type { Kept } from './kept';
import { holdButton } from './hold';
import { keepsakeLook } from './keepsakeArt';
import { wrapperById } from '../wrappers';
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
const WISH = 'Happy birthday, see you Sunday';

function open(sats: bigint, wish: string | undefined = WISH): { chain: DemoChain; key: PackageKey; url: string } {
    const secret = newSecret();
    const key = deriveKey(secret);
    const url = encodeLink({ version: 1, secret, wrapper: 'lixi', wish }, location.origin);
    const chain = createDemoChain({ delayMs: 5 });
    chain.fund(key.address, sats);
    history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
    app = boot(chain);
    return { chain, key, url };
}
async function reveal(a: Booted): Promise<void> {
    await flush(12);
    (a.root.querySelector('.tap') as HTMLButtonElement).click();
    await flush();
    [...a.root.querySelectorAll('button')].find(b => b.textContent === t('common.skip'))?.click();
    await flush(12);
}

describe('the network fee, for the giver', () => {
    it('the estimate is the fee of the sweep a one-coin gift really gets', () => {
        expect(takeFeeEstimate()).toBe(203n);
    });

    it('says what the recipient will receive, and the giver can pay the fee on top', async () => {
        stubClipboard();
        app = boot();
        type(main(app).querySelector('#f-amount') as HTMLInputElement, '20');
        const note = main(app).querySelector('.fee-note') as HTMLElement;
        expect(note.hidden).toBe(false);
        expect(note.textContent).toBe(t('create.fee.off', { net: '17.97', fee: '2.03' }));
        const box = main(app).querySelector('#f-fee') as HTMLInputElement;
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        expect(note.textContent).toBe(t('create.fee.on', { total: '22.03', amount: '20', fee: '2.03' }));
        (main(app).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flush();
        const made = getMade()!;
        expect(made.sats).toBe(2_203n);
        expect(made.feeCovered).toBe(203n);
        expect(main(app).textContent).toContain(t('created.step2.body.fee', { amount: '22.03', gift: '20', fee: '2.03' }));
    });

    it('a gift that will carry a token: the giver can pay that larger fee too', async () => {
        expect(takeFeeEstimate(true)).toBe(428n);
        stubClipboard();
        app = boot();
        type(main(app).querySelector('#f-amount') as HTMLInputElement, '30');
        const tok = main(app).querySelector('#f-withtoken') as HTMLInputElement;
        tok.checked = true;
        tok.dispatchEvent(new Event('change', { bubbles: true }));
        const note = main(app).querySelector('.fee-note') as HTMLElement;
        expect(note.textContent).toBe(t('create.fee.off', { net: '25.72', fee: '4.28' }));
        const box = main(app).querySelector('#f-fee') as HTMLInputElement;
        expect(box.parentElement!.textContent).toBe(t('create.fee.toggle', { fee: '4.28' }));
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        expect(note.textContent).toBe(t('create.fee.on', { total: '34.28', amount: '30', fee: '4.28' }));
        (main(app).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flush();
        const made = getMade()!;
        expect(made).toMatchObject({ sats: 3_428n, feeCovered: 428n, withToken: true });
        // The fee paid for already covers a token: no warning that the recipient will be short.
        expect(main(app).textContent).not.toContain(t('created.tok.feenote', { fee: '4.28' }));
        expect(main(app).textContent).toContain(t('created.tok.title.main'));
        // A gift made to carry a token: its token step is a plain box, never behind a press.
        const tokBoxEl = main(app).querySelector('.token-box') as HTMLElement;
        expect(tokBoxEl.querySelector('.label')!.textContent).toBe(t('created.tok.title.main'));
        expect(tokBoxEl.querySelector('details')).toBeNull();
        expect(tokBoxEl.closest('details')).toBeNull();
    });

    it('a giver who paid only the plain fee is told a token will leave the recipient short', async () => {
        stubClipboard();
        app = boot();
        type(main(app).querySelector('#f-amount') as HTMLInputElement, '30');
        const box = main(app).querySelector('#f-fee') as HTMLInputElement;
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        (main(app).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flush();
        expect(getMade()!.sats).toBe(3_203n);
        expect(main(app).textContent).toContain(t('created.tok.feenote', { fee: '4.28' }));
        // It is said where a token is added: in the token step, which for an ordinary gift is one line to press.
        const tokFold = main(app).querySelector('.token-box > details.fold') as HTMLDetailsElement;
        expect(tokFold.querySelector('summary')!.textContent).toBe(t('created.tok.title'));
        expect([...tokFold.querySelectorAll('.fold-body > .note')].map(n => n.textContent)).toContain(t('created.tok.feenote', { fee: '4.28' }));
        expect(tokFold.querySelector('.warning')).toBeNull();
    });

    it('without the switch the gift is funded with exactly what was typed', async () => {
        app = boot();
        await createGift(app.root, '20');
        expect(getMade()!.sats).toBe(2_000n);
        expect(getMade()!.feeCovered).toBeUndefined();
    });

    it('a token-only gift shows no fee switch: its XEC is the fee', () => {
        app = boot();
        buttonByText(main(app), t('create.tokenonly')).click();
        expect((main(app).querySelector('.fee-note') as HTMLElement).hidden).toBe(true);
        expect((main(app).querySelector('.check--fee') as HTMLElement).hidden).toBe(true);
    });
});

describe('the network fee, for whoever opens the gift', () => {
    it('a gift whose fee was paid for arrives whole, and the screen says so before any button', async () => {
        open(2_203n);
        await reveal(app!);
        expect(main(app!).textContent).toContain(t('pkg.net', { net: '20', fee: '2.03' }));
    });

    it('after taking it home, the fee is said again and the sender\'s words and the package are still there to read', async () => {
        const { chain, key, url } = open(2_000n);
        await reveal(app!);
        buttonByText(main(app!), t('pkg.take')).click();
        await flush();
        type(main(app!).querySelector('#th-addr') as HTMLInputElement, home.address);
        await flush();
        buttonByText(main(app!), t('take.go')).click();
        await new Promise(r => setTimeout(r, 60));
        await flush(12);
        const text = main(app!).textContent!;
        expect(text).toContain(t('take.done.fee', { amount: '17.97', fee: '2.03' }));
        expect(text).toContain(WISH);
        expect(text).toContain(t('pkg.note.title'));
        expect((await chain.read(home.address)).xecSats).toBe(1_797n);
        // Opening the same link again in this visit: still done, and the words are still readable.
        app!.stop();
        history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
        app = boot(chain);
        await flush(12);
        expect(main(app).textContent).toContain(WISH);
        void key;
    });

    it('a gift that is already gone still shows the words that came in its link', async () => {
        const { chain, key } = open(2_000n);
        chain.steal(key.address);
        await flush(12);
        const text = main(app!).textContent!;
        expect(text).toContain(t('pkg.taken'));
        expect(text).toContain(WISH);
        expect(text).toContain(t('gift.ref.label'));
    });
});

describe('keeping a record of a gift that was taken home', () => {
    async function takeIt(wish: string) {
        const secret = newSecret();
        const key = deriveKey(secret);
        const url = encodeLink({ version: 1, secret, wrapper: 'lixi', wish }, location.origin);
        const chain = createDemoChain({ delayMs: 5 });
        chain.fund(key.address, 2_000n);
        history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
        app = boot(chain);
        await reveal(app);
        buttonByText(main(app), t('pkg.take')).click();
        await flush();
        type(main(app).querySelector('#th-addr') as HTMLInputElement, home.address);
        await flush();
        buttonByText(main(app), t('take.go')).click();
        await new Promise(r => setTimeout(r, 60));
        await flush(12);
        return { secret, key, url, chain };
    }

    it('nothing-is-kept-until-the-person-presses, and-the-record-never-holds-the-link-or-the-wallet', async () => {
        const { secret, key, url } = await takeIt(WISH);
        expect(main(app!).textContent).toContain(t('kept.title'));
        expect(main(app!).textContent).toContain(t('kept.warn'));
        // The long note is behind one line that says the point of it; that line is in view.
        const warnFold = main(app!).querySelector('.keep-box details.fold') as HTMLDetailsElement;
        expect(warnFold.open).toBe(false);
        expect(warnFold.querySelector('summary')!.textContent).toBe(t('kept.warn.sum'));
        expect(warnFold.querySelector('.fold-body')!.textContent).toBe(t('kept.warn'));
        expect((main(app!).querySelector('.keep-box') as HTMLElement).closest('details')).toBeNull();
        expect(localStorage.getItem('gift.kept')).toBeNull();
        buttonByText(main(app!), t('kept.save')).click();
        expect(main(app!).textContent).toContain(t('kept.saved'));
        const raw = localStorage.getItem('gift.kept')!;
        const hex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
        const b64 = btoa(String.fromCharCode(...secret));
        const forms = [key.address, hex(secret), hex(key.sk), b64, b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), home.address, ...url.slice(url.indexOf('#') + 1).split('.').filter(p => p.length >= 16)];
        for (const f of forms) expect(raw.includes(f), f).toBe(false);
        expect(raw).not.toContain('#');
        const [k] = loadKept();
        expect(k).toMatchObject({ ref: keptId(key.address), wrapper: 'lixi', wish: WISH, sats: '1797', fee: '203' });
        expect(k!.ref.length).toBe(16);
        // Only the language and the kept gifts are ever in storage.
        expect(Object.keys(localStorage).sort()).toEqual(['gift.kept']);
        expect(sessionStorage.length).toBe(0);
    });

    it('a-wish-that-looks-like-it-carries-a-gift-link-is-left-out-of-the-record', async () => {
        const other = encodeLink({ version: 1, secret: newSecret(), wrapper: 'lixi' }, location.origin);
        expect(keepableWish('second gift: ' + other)).toBeUndefined();
        expect(keepableWish('see #1.abc')).toBeUndefined();
        expect(keepableWish(other.slice(other.indexOf('#') + 1))).toBeUndefined();
        expect(keepableWish('  ')).toBeUndefined();
        expect(keepableWish(WISH)).toBe(WISH);
        const { url } = await takeIt('second gift: ' + other.slice(other.indexOf('#')));
        expect(main(app!).textContent).toContain(t('kept.wish.left'));
        buttonByText(main(app!), t('kept.save')).click();
        const raw = localStorage.getItem('gift.kept')!;
        expect(raw).not.toContain('second gift');
        expect(loadKept()[0]!.wish).toBeUndefined();
        void url;
    });

    it('the-record-says-kept-only-for-the-very-record-in-storage', () => {
        const ref = keptId(home.address)!;
        const whole: Kept = { ref, at: 9, wrapper: 'lixi', sats: '1797', fee: '203' };
        // An older, smaller record of the same gift is in the browser: the whole one is not "kept" yet.
        keep({ ref, at: 5, wrapper: 'lixi', sats: '1' });
        expect(isKept(whole)).toBe(false);
        keep(whole);
        expect(isKept(whole)).toBe(true);
        expect(loadKept()).toHaveLength(1);
        expect(loadKept()[0]!.sats).toBe('1797');
    });

    it('a kept gift can be read again from the home page, and deleted', async () => {
        await takeIt(WISH);
        buttonByText(main(app!), t('kept.save')).click();
        app!.stop();
        history.replaceState(null, '', '/');
        app = boot(undefined, { stay: true });
        await flush();
        buttonByText(app.root, t('kept.nav')).click();
        const text = app.root.textContent!;
        expect(text).toContain(WISH);
        expect(text).toContain('17.97 XEC');
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        buttonByText(app.root, t('kept.remove')).click();
        expect(loadKept()).toEqual([]);
        expect(localStorage.getItem('gift.kept')).toBeNull();
        expect(app.root.textContent).not.toContain(WISH);
    });

    it('someone who kept nothing sees no such door', async () => {
        app = boot(undefined, { stay: true });
        await flush();
        expect(app.root.querySelector('.home-cards')).not.toBeNull();
        expect(app.root.textContent).not.toContain(t('home.card.mine'));
        expect([...app.root.querySelectorAll('button')].some(b => b.textContent === t('kept.nav'))).toBe(false);
    });

    it('the downloaded page escapes every word and carries no script', () => {
        const k: Kept = { ref: keptId(home.address)!, at: 1_794_490_000_000, wrapper: 'lixi', wish: '<script>alert(1)</script> & "hi"', sats: '1797', fee: '203', token: { tokenId: 'a1'.repeat(32), nft: false, atoms: '12550', decimals: 2, ticker: '<b>T</b>', name: "x'y" } };
        const page = keepsakePage(k, 'en', 'Red envelope');
        expect(page).not.toMatch(/<script/i);
        expect(page).not.toContain('<b>T</b>');
        expect(page).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;hi&quot;');
        expect(page).toContain('17.97<span>XEC</span>');
        // With a wrapper's look: its pictures ride inside the file, and nothing in it points anywhere else.
        const dressed = keepsakePage(k, 'en', 'Red envelope', {
            ratio: 0.8,
            layers: [{ src: 'data:image/svg+xml;base64,PHN2Zy8+', css: 'left:0%;top:0%;width:100%;height:100%;transform:rotate(3deg)' }],
            colours: { ground: '#0A0406', surface: '#9A0F1B', ink: '#FFF4E0', accent: '#FFCF5A', dim: '#E0C0A0' },
        });
        expect(dressed).toContain('img-src data:');
        expect(dressed).toContain('<img alt="" src="data:image/svg+xml;base64,PHN2Zy8+"');
        expect(dressed).toContain('background:#9A0F1B');
        expect(dressed).not.toMatch(/<script|https?:|javascript:|\son\w+=/i);
        // A gift that was a token leads with the token; its XEC is a line among the rest.
        const tokenGift = keepsakePage({ ...k, sats: '576', token: { tokenId: 'a1'.repeat(32), nft: false, atoms: '12550', decimals: 2, ticker: 'CAFE', name: 'Cafe Points' } }, 'en', 'Red envelope');
        expect(tokenGift).toContain('<div class="amount amount--token">Token CAFE: 125.5</div>');
        expect(tokenGift).toContain('<dd>5.76 XEC</dd>');
        expect(page).not.toMatch(/\son\w+=|javascript:|<img|<link|src=/i);
    });

    it('what storage holds is not trusted: anything that is not a record is dropped', () => {
        const ref = keptId(home.address)!;
        localStorage.setItem(
            'gift.kept',
            JSON.stringify([
                { ref: 'nope', at: 1, sats: '1' },
                { ref, at: 5, sats: '-3' },
                'x',
                null,
                { ref, at: 7, sats: '42', wish: 'ok', secret: 'zzz', address: home.address, token: { tokenId: 'b2'.repeat(32), atoms: '9', ticker: 'XEC', name: 'free money' } },
            ]),
        );
        const list = loadKept();
        expect(list.length).toBe(1);
        // Unknown fields are dropped; a token without known decimals keeps neither id nor name.
        expect(list[0]).toEqual({ ref, at: 7, wrapper: '', sats: '42', wish: 'ok', token: { nft: false, atoms: '9' } });
        expect(keep({ ref: 'bad', at: 1, wrapper: '', sats: '1' })).toBe(false);
    });
});

describe('the page\'s own word eCash, and its name', () => {
    it('on the home page eCash is a link to e.cash that tells the new tab nothing; the gift screens carry no link at all', async () => {
        app = boot(undefined, { stay: true });
        await flush();
        const links = [...app.root.querySelectorAll('a.ecash')] as HTMLAnchorElement[];
        expect(links.length).toBeGreaterThan(0);
        for (const a of links) {
            expect(a.getAttribute('href')).toBe('https://e.cash');
            expect(a.getAttribute('rel')).toBe('noopener noreferrer');
            expect(a.getAttribute('target')).toBe('_blank');
            expect(a.textContent).toBe('eCash');
        }
        expect(app.root.querySelector('.wordmark-name')!.textContent).toBe('eGift');
        app.stop();
        open(2_000n);
        await reveal(app!);
        expect(app!.root.querySelectorAll('a')).toHaveLength(0);
    });

    it('a hold button can be worked by an activation that has no press behind it (a screen reader): two of them', () => {
        let made = 0;
        const b = holdButton({ label: 'Hold', again: 'Again', onDone: () => made++ });
        document.body.append(b);
        b.click();
        expect(made).toBe(0);
        expect(b.textContent).toContain('Again');
        b.click();
        expect(made).toBe(1);
        b.remove();
    });
});

describe('"taken" on one node\'s word', () => {
    it('is not shown: the nodes are asked together first', async () => {
        const secret = newSecret();
        const key = deriveKey(secret);
        const url = encodeLink({ version: 1, secret, wrapper: 'lixi' }, location.origin);
        const chain = createDemoChain({ delayMs: 5 });
        chain.fund(key.address, 2_000n);
        const honest = chain.read.bind(chain);
        // One node says the package was emptied; together the nodes say it is funded.
        chain.read = async a => ({ ...(await honest(a)), kind: 'taken', coins: [], xecSats: 0n, hasToken: false, allFinal: true });
        (chain as { readChecked?: typeof honest }).readChecked = honest;
        history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
        app = boot(chain);
        await flush(12);
        expect(main(app).textContent).not.toContain(t('pkg.taken'));
        expect(app.root.querySelector('.tap')).not.toBeNull();
    });
});

describe('remembering a gift that was sent', () => {
    it('nothing is remembered until the giver presses; the record holds the package address and never the link', async () => {
        stubClipboard();
        app = boot();
        await createGift(app.root, '20', 'For you');
        const made = getMade()!;
        expect(localStorage.getItem('gift.sent')).toBeNull();
        buttonByText(app.root, t('sent.remember')).click();
        expect(app.root.textContent).toContain(t('sent.remembered'));
        const raw = localStorage.getItem('gift.sent')!;
        const hex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
        const b64 = btoa(String.fromCharCode(...made.secret));
        for (const f of [hex(made.secret), hex(made.key.sk), b64, b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), ...made.link.slice(made.link.indexOf('#') + 1).split('.').filter(p => p.length >= 16)]) expect(raw.includes(f), f).toBe(false);
        expect(raw).not.toContain('#');
        expect(loadSent()[0]).toMatchObject({ address: made.key.address, sats: '2000', wrapper: made.wrapper, wish: 'For you' });
    });

    it('the home page shows a remembered gift with what the network says of it now, and can drop it', async () => {
        const key = deriveKey(newSecret());
        const chain = createDemoChain({ delayMs: 1 });
        rememberSent({ address: key.address, at: Date.now(), wrapper: 'lixi', sats: '2000', wish: 'For you' });
        chain.fund(key.address, 2_000n);
        history.replaceState(null, '', '/');
        app = boot(chain, { stay: true });
        await flush();
        expect(app.root.textContent).toContain(t('home.card.mine'));
        buttonByText(app.root, t('sent.nav')).click();
        await flush(12);
        expect(app.root.textContent).toContain('For you');
        expect(app.root.textContent).toContain(t('sent.status.funded', { amount: '20' }));
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        buttonByText(app.root, t('sent.forget')).click();
        expect(loadSent()).toEqual([]);
        expect(localStorage.getItem('gift.sent')).toBeNull();
    });

    it('what storage holds is not trusted', () => {
        const key = deriveKey(newSecret());
        localStorage.setItem('gift.sent', JSON.stringify([{ address: 'x', at: 1, sats: '1' }, { address: key.address, at: 3, sats: '500', link: 'https://x/#1.0.aaaa', wish: 'see #1.zz' }]));
        expect(loadSent()).toEqual([{ address: key.address, at: 3, wrapper: '', sats: '500' }]);
    });
});

describe('the wrapper as a still picture for the keepsake file', () => {
    it('every layer of the open wrapper is carried with its place and its turn, and only the page\'s own pictures are fetched', async () => {
        const asked: string[] = [];
        (globalThis as { fetch?: unknown }).fetch = async (url: string) => {
            asked.push(String(url));
            return { ok: true, arrayBuffer: async () => new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>').buffer };
        };
        const def = wrapperById('lixi')!;
        const look = (await keepsakeLook(def))!;
        expect(look).not.toBeNull();
        expect(look.layers.length).toBeGreaterThan(5);
        expect(look.ratio).toBeCloseTo(def.size[0] / def.size[1]);
        for (const l of look.layers) {
            expect(l.src.startsWith('data:image/svg+xml;base64,')).toBe(true);
            expect(l.css).toMatch(/left:[-\d.]+%;top:[-\d.]+%;width:[\d.]+%;height:[\d.]+%/);
            expect(l.css).toContain('transform:translate(');
            expect(l.css).not.toMatch(/[<>"';]{2}|url\(|expression|@import/i);
        }
        expect(asked.length).toBeGreaterThan(0);
        // Each under its fixed name, with the version the stage asks for it with: one entry in the browser's cache.
        expect(asked.every(u => /^\/wrappers\/lixi\/[a-z0-9-]+\.svg\?v=[a-f0-9]{8}$/.test(u))).toBe(true);
        for (const c of Object.values(look.colours)) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('a look that could not be had is asked for again, not remembered as missing', async () => {
        const def = wrapperById('mecha')!;
        expect(await keepsakeLook(def)).toBeNull(); // the test page has no network
        (globalThis as { fetch?: unknown }).fetch = async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([60, 115, 118, 103, 47, 62]).buffer });
        expect(await keepsakeLook(def)).not.toBeNull();
    });
});

describe('what the sent list says of a gift', () => {
    const remember = (over: Partial<Parameters<typeof rememberSent>[0]> = {}) => {
        const key = deriveKey(newSecret());
        rememberSent({ address: key.address, at: Date.now(), wrapper: 'lixi', sats: '2000', ...over });
        return key;
    };
    async function listed(chain: DemoChain): Promise<string> {
        history.replaceState(null, '', '/');
        app = boot(chain, { stay: true });
        await flush();
        buttonByText(app.root, t('sent.nav')).click();
        await flush(12);
        return app.root.textContent!;
    }

    it('less than was meant is said so', async () => {
        const chain = createDemoChain({ delayMs: 1 });
        chain.fund(remember().address, 1_500n);
        expect(await listed(chain)).toContain(t('sent.status.short', { amount: '15', want: '20' }));
    });

    it('a token-only gift without its token is not called ready', async () => {
        const chain = createDemoChain({ delayMs: 1 });
        chain.fund(remember({ sats: '1000', tokenOnly: true }).address, 1_000n);
        expect(await listed(chain)).toContain(t('sent.status.notoken', { amount: '10' }));
    });

    it('an emptied package does not claim to know who emptied it', async () => {
        const chain = createDemoChain({ delayMs: 1 });
        const key = remember();
        chain.fund(key.address, 2_000n);
        chain.steal(key.address);
        expect(await listed(chain)).toContain(t('sent.status.taken'));
    });
});

