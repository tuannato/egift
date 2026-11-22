/**
 * A gift that carries a token, on screen: what is shown, what is never shown,
 * and what goes home.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoChain, deriveKey, encodeLink, holdings, newSecret, tokenFundLinks } from '../core';
import type { CoinToken, DemoChain, PackageKey } from '../core';
import { t } from '../i18n';
import { getMade } from './session';
import { looksLikeXec } from './tokens';
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
const GIVER = '76a914' + '11'.repeat(20) + '88ac';
const STRANGER = '76a914' + '99'.repeat(20) + '88ac';
const ID = 'a1'.repeat(32);
const SPAM = 'b2'.repeat(32);
const home = deriveKey(new Uint8Array(16).fill(7));
const info = (tokenId: string, atoms: bigint, kind: CoinToken['kind'] = 'alp'): CoinToken => ({ tokenId, kind, atoms, baton: false });
const SCAM_NAME = 'FREE 1000000 XEC claim-now.example';

function open(fill: (chain: DemoChain, key: PackageKey) => void): { chain: DemoChain; key: PackageKey } {
    const secret = newSecret();
    const key = deriveKey(secret);
    const url = encodeLink({ version: 1, secret, wrapper: 'lixi' }, location.origin);
    const chain = createDemoChain({ delayMs: 5 });
    fill(chain, key);
    history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
    app = boot(chain);
    return { chain, key };
}
const xec = (chain: DemoChain, key: PackageKey, sats = 8_888n) => chain.fund(key.address, sats, { tx: { inputs: [GIVER], outputs: [] }, height: 1 });
const givers = (chain: DemoChain, key: PackageKey, kind: CoinToken['kind'] = 'alp') => {
    chain.describe(ID, { name: 'Cafe Points', ticker: 'CAFE', decimals: 2 });
    chain.fund(key.address, 546n, { tokenInfo: info(ID, kind === 'nft' ? 1n : 12_550n, kind), tx: { inputs: [GIVER], outputs: [] }, height: 2 });
};
const strangers = (chain: DemoChain, key: PackageKey) => {
    chain.describe(SPAM, { name: SCAM_NAME, ticker: 'XEC', decimals: 0 });
    chain.fund(key.address, 546n, { tokenInfo: info(SPAM, 1_000_000n), tx: { inputs: [STRANGER], outputs: [] }, height: 3 });
};
async function reveal(a: Booted): Promise<void> {
    await flush(12);
    (a.root.querySelector('.tap') as HTMLButtonElement).click();
    await flush();
    // The wrapper's opening plays in real time once its stage is up: skip it, as a person may.
    const skip = [...a.root.querySelectorAll('button')].find(b => b.textContent === t('common.skip'));
    skip?.click();
    await flush(12);
}
async function take(a: Booted): Promise<void> {
    buttonByText(main(a), t('pkg.take')).click();
    await flush();
    type(main(a).querySelector('#th-addr') as HTMLInputElement, home.address);
    await flush();
    buttonByText(main(a), t('take.go')).click();
    await new Promise(r => setTimeout(r, 60));
    await flush(12);
}

describe('a gift with a token', () => {
    it('the-givers-token-is-shown-by-name-and-goes-home-with-the-xec', async () => {
        const { chain, key } = open((c, k) => {
            xec(c, k);
            givers(c, k);
        });
        await reveal(app!);
        const text = main(app!).textContent!;
        expect(text).toContain('88.88');
        expect(text).toContain(t('pkg.tok.label'));
        expect(text).toContain('125.5');
        expect(text).toContain('CAFE');
        expect(text).toContain('Cafe Points');
        // What the name is worth is said right beside it.
        expect(text).toContain(t('pkg.tok.claim'));
        // The token amount is not dressed as the gift's amount.
        expect(main(app!).querySelector('.token-card .amount')).toBeNull();
        buttonByText(main(app!), t('pkg.take')).click();
        await flush();
        expect(main(app!).textContent).toContain(t('take.token.wallet'));
        type(main(app!).querySelector('#th-addr') as HTMLInputElement, home.address);
        await flush();
        expect(main(app!).textContent).toContain(t('take.confirm.token'));
        buttonByText(main(app!), t('take.go')).click();
        await new Promise(r => setTimeout(r, 60));
        await flush(12);
        expect(main(app!).textContent).toContain(t('take.done.token'));
        const there = (await chain.read(home.address)).coins;
        expect(holdings(there).map(h => [h.tokenId, h.atoms])).toEqual([[ID, 12_550n]]);
        expect((await chain.read(key.address)).coins).toEqual([]);
    });

    it('a-strangers-token-is-never-named-and-never-taken-unless-picked', async () => {
        const { chain, key } = open((c, k) => {
            xec(c, k);
            strangers(c, k);
        });
        await reveal(app!);
        // No name, no ticker, no amount of it on the screen: a count, behind a press.
        const text = main(app!).textContent!;
        expect(text).not.toContain('FREE');
        expect(text).not.toContain('claim-now');
        expect(text).not.toContain('1,000,000');
        expect(text).toContain(t('pkg.tok.others', { n: 1 }));
        expect(main(app!).querySelector('.token-card')).toBeNull();
        // Opened: its id and amount, still no name, and why.
        const toggle = buttonByText(main(app!), t('pkg.tok.others', { n: 1 }));
        toggle.click();
        const list = main(app!).querySelector('.token-others-list') as HTMLElement;
        expect(list.hidden).toBe(false);
        expect(list.textContent).toContain('b2b2b2…b2b2b2');
        expect(list.textContent).toContain(t('pkg.tok.others.why'));
        expect(main(app!).textContent).not.toContain('FREE');
        // Taken home as it stands: the XEC goes, the stranger's token stays put.
        await take(app!);
        expect(main(app!).textContent).toContain(t('take.done.title'));
        expect(main(app!).textContent).not.toContain(t('take.done.token'));
        expect((await chain.read(home.address)).coins.every(c => !c.token)).toBe(true);
        expect((await chain.read(key.address)).coins.map(c => c.tokenInfo?.tokenId)).toEqual([SPAM]);
    });

    it('a token of unknown origin can be picked, and is still not named', async () => {
        const { chain } = open((c, k) => {
            xec(c, k);
            givers(c, k);
            strangers(c, k);
        });
        await reveal(app!);
        expect(main(app!).querySelector('.token-card')!.textContent).toContain('CAFE');
        buttonByText(main(app!), t('pkg.tok.others', { n: 1 })).click();
        buttonByText(main(app!), t('pkg.tok.pick')).click();
        await flush();
        const card = main(app!).querySelector('.token-card')!;
        expect(card.textContent).toContain(t('pkg.tok.unknown'));
        expect(card.textContent).not.toContain('FREE');
        expect(card.textContent).not.toContain('XEC');
        // One token per take: the giver's is now among the ones left.
        expect(main(app!).textContent).toContain(t('pkg.tok.others', { n: 1 }));
        await take(app!);
        expect(holdings((await chain.read(home.address)).coins).map(h => h.tokenId)).toEqual([SPAM]);
    });

    it('a-ticker-posing-as-the-coin-is-called-out', async () => {
        open((c, k) => {
            xec(c, k);
            c.describe(ID, { name: 'eCash', ticker: 'XEC', decimals: 2 });
            c.fund(k.address, 546n, { tokenInfo: info(ID, 100_000n), tx: { inputs: [GIVER], outputs: [] }, height: 2 });
        });
        await reveal(app!);
        expect(main(app!).querySelector('.token-card')!.textContent).toContain(t('pkg.tok.xec'));
        for (const s of ['XEC', 'xec', 'X E C', 'X.E.C', 'eCash', 'ＸＥＣ', '1000 XEC', 'eCash Gift', 'XEC bonus', 'Bitcoin']) expect(looksLikeXec(s)).toBe(true);
        for (const s of ['CAFE', 'Cafe Points', 'Vé xem phim', '']) expect(looksLikeXec(s)).toBe(false);
        // A ticker in look-alike letters (Cyrillic "ХЕС") folds to nothing: any non-ASCII ticker is called out.
        expect(looksLikeXec('ХЕС', true)).toBe(true);
        expect(looksLikeXec('VÉ', true)).toBe(true);
        expect(looksLikeXec('CAFE', true)).toBe(false);
    });

    it('token-text-is-a-strangers-text', async () => {
        open((c, k) => {
            xec(c, k);
            c.describe(ID, { name: '<img src=x onerror=alert(1)>' + 'n'.repeat(80), ticker: '<b>T</b>', decimals: 0 });
            c.fund(k.address, 546n, { tokenInfo: info(ID, 5n), tx: { inputs: [GIVER], outputs: [] }, height: 2 });
        });
        await reveal(app!);
        const card = main(app!).querySelector('.token-card') as HTMLElement;
        expect(card.querySelector('img:not(.token-icon)')).toBeNull();
        expect(card.querySelector('b')).toBeNull();
        expect(card.querySelector('.token-name')!.textContent!.length).toBeLessThanOrEqual(32);
        expect(card.querySelector('a')).toBeNull();
    });

    it('a-token-with-no-xec-shows-no-payment-control', async () => {
        open((c, k) => {
            xec(c, k);
            givers(c, k);
            c.steal(k.address);
        });
        await flush(12);
        const text = main(app!).textContent!;
        expect(text).toContain(t('pkg.token.stuck'));
        expect(text).toContain(t('pkg.token.stuck.scam'));
        expect(text).not.toContain('CAFE');
        // Nothing to press that sends money anywhere, and no address to pay.
        expect(main(app!).querySelector('.fund')).toBeNull();
        expect([...main(app!).querySelectorAll('button')].map(b => b.textContent)).not.toContain(t('created.fund.web'));
        expect(main(app!).querySelector('.slide')).toBeNull();
    });

    it('a-small-gift-never-leaves-its-token-behind, and the screen says where the XEC goes', async () => {
        const { chain, key } = open((c, k) => {
            xec(c, k, 900n);
            givers(c, k);
        });
        await reveal(app!);
        buttonByText(main(app!), t('pkg.take')).click();
        await flush();
        type(main(app!).querySelector('#th-addr') as HTMLInputElement, home.address);
        await flush();
        expect(main(app!).textContent).toContain(t('take.confirm.fused'));
        expect(main(app!).textContent).not.toContain(t('take.confirm.tokenleft'));
        buttonByText(main(app!), t('take.go')).click();
        await new Promise(r => setTimeout(r, 60));
        await flush(12);
        expect(main(app!).textContent).not.toContain(t('take.done.tokenleft'));
        const got = (await chain.read(home.address)).coins;
        expect(got.map(c => c.tokenInfo?.tokenId)).toEqual([ID]);
        expect((await chain.read(key.address)).coins).toEqual([]);
    });

    it('a gift that is a token leads with the token; its XEC is the small print', async () => {
        open((c, k) => {
            xec(c, k, 1_000n);
            givers(c, k);
        });
        await reveal(app!);
        const gift = main(app!).querySelector('.gift') as HTMLElement;
        const card = gift.querySelector('.token-card') as HTMLElement;
        const amt = gift.querySelector('.amount-block') as HTMLElement;
        expect(card.classList.contains('token-card--lead')).toBe(true);
        expect(card.compareDocumentPosition(amt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(amt.classList.contains('amount-block--small')).toBe(true);
        expect(gift.textContent).toContain(t('gift.amount.fee'));
    });

    it('a stranger\'s token never turns a small XEC gift into a token gift', async () => {
        open((c, k) => {
            xec(c, k, 1_000n);
            strangers(c, k);
        });
        await reveal(app!);
        const gift = main(app!).querySelector('.gift') as HTMLElement;
        expect(gift.querySelector('.token-card--lead')).toBeNull();
        expect(gift.textContent).toContain(t('gift.amount.label'));
        expect(gift.textContent).not.toContain(t('gift.amount.fee'));
    });

    it('choosing-xec-only-can-be-undone, and-does-not-outlive-the-panel', async () => {
        const { chain, key } = open((c, k) => {
            xec(c, k);
            givers(c, k);
        });
        const real = chain.validate!.bind(chain);
        chain.validate = async () => Promise.reject(new Error('offline'));
        await reveal(app!);
        await take(app!);
        buttonByText(main(app!), t('take.xeconly')).click();
        await flush();
        expect(main(app!).textContent).toContain(t('take.confirm.tokenstay'));
        // Undone in place: the token goes along again.
        buttonByText(main(app!), t('take.withtoken')).click();
        await flush();
        expect(main(app!).textContent).toContain(t('take.confirm.token'));
        // Chosen again, then the panel is closed and opened: the choice is gone with it.
        buttonByText(main(app!), t('take.go')).click();
        await new Promise(r => setTimeout(r, 60));
        await flush(12);
        buttonByText(main(app!), t('take.xeconly')).click();
        await flush();
        buttonByText(main(app!), t('pkg.qr')).click();
        await flush();
        chain.validate = real;
        await take(app!);
        expect(main(app!).textContent).toContain(t('take.done.token'));
        expect((await chain.read(key.address)).coins).toEqual([]);
    });

    it('when the node will not vouch for the token nothing is sent, and the XEC can still go alone', async () => {
        const { chain, key } = open((c, k) => {
            xec(c, k);
            givers(c, k);
        });
        chain.validate = async () => Promise.reject(new Error('offline'));
        await reveal(app!);
        await take(app!);
        expect(main(app!).textContent).toContain(t('take.err.offline'));
        expect((await chain.read(key.address)).coins.length).toBe(2);
        // Leaving the token is the person's own choice, with what it costs said first.
        expect(main(app!).textContent).toContain(t('take.xeconly.warn'));
        buttonByText(main(app!), t('take.xeconly')).click();
        await flush();
        expect(main(app!).textContent).not.toContain(t('take.confirm.token'));
        buttonByText(main(app!), t('take.go')).click();
        await new Promise(r => setTimeout(r, 60));
        await flush(12);
        expect(main(app!).textContent).toContain(t('take.done.tokenleft'));
        expect((await chain.read(key.address)).coins.map(c => c.tokenInfo?.tokenId)).toEqual([ID]);
    });
});

describe('a gift with a token, when things go wrong', () => {
    it('nothing-that-moves-the-gift-is-on-screen-before-its-tokens-are-read', async () => {
        // A slow node: the package is read, the tokens are not yet.
        const { chain, key } = open((c, k) => {
            xec(c, k);
            givers(c, k);
        });
        const real = chain.detail!.bind(chain);
        let release: () => void = () => {};
        const gate = new Promise<void>(r => (release = r));
        chain.detail = async id => {
            await gate;
            return real(id);
        };
        await flush(12);
        (app!.root.querySelector('.tap') as HTMLButtonElement).click();
        await flush();
        [...app!.root.querySelectorAll('button')].find(b => b.textContent === t('common.skip'))?.click();
        await flush(12);
        expect(main(app!).textContent).toContain(t('pkg.tok.loading'));
        expect([...main(app!).querySelectorAll('button')].map(b => b.textContent)).not.toContain(t('pkg.take'));
        expect(main(app!).querySelector('.panel-take')).toBeNull();
        release();
        await flush(12);
        // Now it is: with the token on the card, and a take that carries it.
        expect(main(app!).querySelector('.token-card')!.textContent).toContain('CAFE');
        await take(app!);
        expect(main(app!).textContent).toContain(t('take.done.token'));
        expect((await chain.read(key.address)).coins).toEqual([]);
    });

    it('an-unread-token-is-said-so-and-never-silently-left', async () => {
        const { chain, key } = open((c, k) => {
            xec(c, k);
            givers(c, k);
        });
        chain.detail = async () => Promise.reject(new Error('offline'));
        await reveal(app!);
        const text = main(app!).textContent!;
        expect(text).toContain(t('pkg.tok.unread'));
        expect(text).not.toContain('CAFE');
        expect(main(app!).querySelector('.token-card')).toBeNull();
        // The XEC is not held hostage; what happens to the token is said before the press and after.
        buttonByText(main(app!), t('pkg.take')).click();
        await flush();
        type(main(app!).querySelector('#th-addr') as HTMLInputElement, home.address);
        await flush();
        expect(main(app!).textContent).toContain(t('take.confirm.tokenstay'));
        buttonByText(main(app!), t('take.go')).click();
        await new Promise(r => setTimeout(r, 60));
        await flush(12);
        expect(main(app!).textContent).toContain(t('take.done.tokenleft'));
        expect((await chain.read(key.address)).coins.map(c => c.tokenInfo?.tokenId)).toEqual([ID]);
        // The link is still the token's only key: it stays in the address bar.
        expect(location.hash).not.toBe('');
    });

    it('a-refilled-gift-names-no-token', async () => {
        const { chain, key } = open((c, k) => {
            xec(c, k);
            c.steal(k.address);
            // After the gift was taken: a stranger's XEC and token, from one wallet.
            c.describe(SPAM, { name: SCAM_NAME, ticker: 'XEC', decimals: 0 });
            c.fund(k.address, 600n, { tx: { inputs: [STRANGER], outputs: [] }, height: 5 });
            c.fund(k.address, 546n, { tokenInfo: info(SPAM, 1_000_000n), tx: { inputs: [STRANGER], outputs: [] }, height: 6 });
        });
        await reveal(app!);
        expect(main(app!).textContent).not.toContain('FREE');
        expect(main(app!).querySelector('.token-card')).toBeNull();
        expect(main(app!).textContent).toContain(t('pkg.tok.others', { n: 1 }));
        void chain;
        void key;
    });
});

describe('adding a token to a gift', () => {
    it('the-token-link-carries-a-token-id-and-a-number-and-nothing-else', () => {
        const key = deriveKey(new Uint8Array(16).fill(1));
        const ok = tokenFundLinks({ address: key.address, tokenId: ID, qty: '12.5' });
        expect(ok.bip21).toBe(`${key.address}?token_id=${ID}&token_decimalized_qty=12.5`);
        expect(ok.web).toBe(`https://cashtab.com/#/send?bip21=${ok.bip21}`);
        const evil = 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';
        const bad: [string, string][] = [
            [ID + `&addr=${evil}&token_decimalized_qty=9`, '1'],
            [ID, `1&addr=${evil}&token_decimalized_qty=9`],
            [ID.toUpperCase(), '1'],
            [ID.slice(1), '1'],
            [ID, ''],
            [ID, '0'],
            [ID, '0.00'],
            [ID, '1.'],
            [ID, '.5'],
            [ID, '1e9'],
            [ID, '-1'],
            [ID, '1 '],
            [ID, '1,5'],
            [ID, '9'.repeat(31)],
        ];
        for (const [id, qty] of bad) expect(() => tokenFundLinks({ address: key.address, tokenId: id, qty })).toThrow();
        expect(() => tokenFundLinks({ address: 'etoken:qq', tokenId: ID, qty: '1' })).toThrow();
    });

    it('the token box appears once the gift holds XEC, and says whether the token will be recognised', async () => {
        const opened: string[] = [];
        vi.spyOn(window, 'open').mockImplementation(((u: string) => void opened.push(u)) as unknown as typeof window.open);
        stubClipboard();
        app = boot();
        await createGift(app.root, '88.88');
        const made = getMade()!;
        const box = main(app).querySelector('.token-box') as HTMLElement;
        // Not before the gift is funded: a token cannot pay its own way home.
        expect(box.hidden).toBe(true);
        buttonByText(main(app), t('link.copy')).click();
        await flush();
        app.chain.fund(made.key.address, made.sats, { tx: { inputs: [GIVER], outputs: [] }, height: 1 });
        await flush(12);
        expect(box.hidden).toBe(false);
        // For an ordinary gift the step is one closed line; the giver opens it to add a token.
        const tokFold = box.querySelector('details.fold') as HTMLDetailsElement;
        const tokSum = tokFold.querySelector('summary') as HTMLElement;
        expect(tokSum.textContent).toBe(t('created.tok.title'));
        expect(tokFold.open).toBe(false);
        tokSum.click();
        expect(tokFold.open).toBe(true);
        // A pasted id that smuggles an output is refused; nothing opens.
        type(box.querySelector('#f-tok-id') as HTMLInputElement, ID + '&addr=ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035');
        type(box.querySelector('#f-tok-qty') as HTMLInputElement, '1');
        buttonByText(box, t('created.tok.open')).click();
        expect(opened).toEqual([]);
        expect(box.textContent).toContain(t('created.tok.bad'));
        type(box.querySelector('#f-tok-id') as HTMLInputElement, ID);
        // A comma is not guessed at: "1,000" must never become one.
        type(box.querySelector('#f-tok-qty') as HTMLInputElement, '1,000');
        buttonByText(box, t('created.tok.open')).click();
        expect(opened).toEqual([]);
        type(box.querySelector('#f-tok-qty') as HTMLInputElement, '12.5');
        buttonByText(box, t('created.tok.open')).click();
        expect(opened).toEqual([tokenFundLinks({ address: made.key.address, tokenId: ID, qty: '12.5' }).web]);
        // The same request for the Cashtab app: the same link, on the app's road; a bad id opens nothing there either.
        buttonByText(box, t('created.fund.app')).click();
        expect(opened[1]).toBe(tokenFundLinks({ address: made.key.address, tokenId: ID, qty: '12.5' }).app);
        opened.length = 1;
        // The token arrives from the wallet that funded the XEC: recognised. Said in view even if the step was closed.
        tokSum.click();
        expect(tokFold.open).toBe(false);
        app.chain.fund(made.key.address, 546n, { tokenInfo: info(ID, 1_250n), tx: { inputs: [GIVER], outputs: [] }, height: 2 });
        await flush(12);
        expect(box.textContent).toContain(t('created.tok.seen'));
        expect(tokFold.open).toBe(true);
        expect(box.hidden).toBe(false);
        // The gift is still "funded" with the amount meant: the token's own 5.46 XEC is not counted as XEC of the gift.
        expect(main(app).textContent).toContain(t('created.status.funded'));
        // A second kind of token: said plainly, and again in view though the giver had closed the step.
        tokSum.click();
        expect(tokFold.open).toBe(false);
        app.chain.fund(made.key.address, 546n, { tokenInfo: info(SPAM, 9n), tx: { inputs: [STRANGER], outputs: [] }, height: 3 });
        await flush(12);
        expect(box.textContent).toContain(t('created.tok.two'));
        expect(tokFold.open).toBe(true);
    });

    it('the token step has its own address QR, names the token once its id is whole, and the holding bar always says what is inside', async () => {
        stubClipboard();
        app = boot();
        await createGift(app.root, '88.88');
        const made = getMade()!;
        const box = main(app).querySelector('.token-box') as HTMLElement;
        const hold = main(app).querySelector('.hold') as HTMLElement;
        expect(hold.textContent).toContain(t('created.hold.empty'));
        buttonByText(main(app), t('link.copy')).click();
        await flush();
        // Paying by QR: the token step shows its QR from then on, without another press.
        buttonByText(main(app), t('created.fund.qr')).click();
        app.chain.fund(made.key.address, made.sats, { tx: { inputs: [GIVER], outputs: [] }, height: 1 });
        await flush(12);
        expect(hold.textContent).toContain('88.88 XEC');
        expect(box.querySelector('.qr-svg')).not.toBeNull();
        expect(box.textContent).toContain(t('created.tok.qr.addr'));
        // That QR is in view: paying by QR opened the token step.
        expect((box.querySelector('details.fold') as HTMLDetailsElement).open).toBe(true);
        // A whole id: the chain is asked what it names. The name is a stranger's text and never markup.
        app.chain.describe(ID, { name: '<img src=x onerror=alert(1)> Points', ticker: 'CAFE', decimals: 2 });
        type(box.querySelector('#f-tok-id') as HTMLInputElement, ID);
        await flush(12);
        const found = box.querySelector('.token-found') as HTMLElement;
        expect(found.hidden).toBe(false);
        expect(found.textContent).toContain('CAFE');
        expect(found.querySelector('img:not(.token-icon)')).toBeNull();
        // The QR stays the address alone, whatever is typed: a QR carrying the id too is too dense to scan well.
        const qrBefore = box.querySelector('.qr-svg path')!.getAttribute('d');
        type(box.querySelector('#f-tok-qty') as HTMLInputElement, '12.5');
        expect(box.textContent).toContain(t('created.tok.qr.addr'));
        expect(box.querySelector('.qr-svg path')!.getAttribute('d')).toBe(qrBefore);
        // An id nobody issued is said so.
        type(box.querySelector('#f-tok-id') as HTMLInputElement, 'c3'.repeat(32));
        await flush(12);
        expect(found.textContent).toContain(t('created.tok.notfound'));
        type(box.querySelector('#f-tok-id') as HTMLInputElement, 'nope');
        await flush(12);
        expect(found.hidden).toBe(true);
        expect(box.textContent).toContain(t('created.tok.qr.addr'));
        // The token arrives: the bar names it beside the XEC.
        app.chain.fund(made.key.address, 546n, { tokenInfo: info(ID, 1_250n), tx: { inputs: [GIVER], outputs: [] }, height: 2 });
        await flush(16);
        expect(hold.textContent).toContain('88.88 XEC');
        expect(hold.textContent).toContain('12.5 CAFE');
    });

    it('a token-only gift: the least XEC as the fee, and the link is offered only once the token is in', async () => {
        stubClipboard();
        app = boot();
        buttonByText(main(app), t('create.tokenonly')).click();
        expect((main(app).querySelector('#f-amount') as HTMLInputElement).value).toBe('10');
        expect(main(app).textContent).toContain(t('create.tokenonly.note', { min: '10' }));
        (main(app).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flush();
        const made = getMade()!;
        expect(made.tokenOnly).toBe(true);
        expect(made.sats).toBe(1_000n);
        expect(main(app).textContent).toContain(t('created.step2.tokenonly', { amount: '10' }));
        buttonByText(main(app), t('link.copy')).click();
        await flush();
        app.chain.fund(made.key.address, made.sats, { tx: { inputs: [GIVER], outputs: [] }, height: 1 });
        await flush(12);
        // Funded, but the gift is the token: not ready to send yet.
        const next = [...main(app).querySelectorAll('p')].find(p => p.textContent === t('created.tokenonly.next')) as HTMLElement;
        expect(next.hidden).toBe(false);
        expect((main(app).querySelector('.after-funded') as HTMLElement).hidden).toBe(true);
        app.chain.describe(ID, { name: 'Cafe Points', ticker: 'CAFE', decimals: 2 });
        app.chain.fund(made.key.address, 546n, { tokenInfo: info(ID, 1_250n), tx: { inputs: [GIVER], outputs: [] }, height: 2 });
        await flush(16);
        expect(next.hidden).toBe(true);
        expect((main(app).querySelector('.after-funded') as HTMLElement).hidden).toBe(false);
    });

    it('typing another amount makes it an ordinary gift again', async () => {
        app = boot();
        buttonByText(main(app), t('create.tokenonly')).click();
        await createGift(app.root, '88.88');
        expect(getMade()!.tokenOnly).toBeUndefined();
    });

    it('a token from another address is announced as one the recipient must pick', async () => {
        stubClipboard();
        app = boot();
        await createGift(app.root, '88.88');
        const made = getMade()!;
        buttonByText(main(app), t('link.copy')).click();
        await flush();
        app.chain.fund(made.key.address, made.sats, { tx: { inputs: [GIVER], outputs: [] }, height: 1 });
        app.chain.fund(made.key.address, 546n, { tokenInfo: info(ID, 5n), tx: { inputs: [STRANGER], outputs: [] }, height: 2 });
        await flush(12);
        expect(main(app).querySelector('.token-box')!.textContent).toContain(t('created.tok.seen.other'));
        // A warning-like word about a token is never left behind a closed line.
        const seenBox = main(app).querySelector('.token-box') as HTMLElement;
        expect(seenBox.hidden).toBe(false);
        expect((seenBox.querySelector('details.fold') as HTMLDetailsElement).open).toBe(true);
    });
});
