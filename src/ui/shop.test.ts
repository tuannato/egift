import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../stage', async orig => {
    const real = await orig<typeof import('../stage')>();
    const { fakeMountStage } = await import('./fakestage');
    return { ...real, mountStage: fakeMountStage };
});
vi.mock('../core', async orig => {
    const real = await orig<typeof import('../core')>();
    return { ...real, newSecret: vi.fn(real.newSecret), deriveKey: vi.fn(real.deriveKey) };
});

import { createDemoChain, decodeFragment, deriveKey, encodeLink, newSecret, unlockKey } from '../core';
import type { DemoChain } from '../core';
import { t } from '../i18n';
import { WRAPPERS, isHoliday, offerOf, setOfferForDev } from '../wrappers';
import { fundLinks, stampOpReturnRaw, stampedFundLinks } from '../core';
import { createGift, stubClipboard } from './testkit';
import { getMade } from './session';
import { boot, buttonByText, flush, resetPage, type, type Booted } from './testkit';

let app: Booted | null = null;
beforeEach(() => {
    resetPage('en');
    vi.clearAllMocks();
});
afterEach(() => {
    for (const w of WRAPPERS) setOfferForDev(w.id, null);
    app?.stop();
    app = null;
    vi.restoreAllMocks();
});

const root = () => document.documentElement;
const main = (a: Booted) => a.root.querySelector('main') as HTMLElement;
const door = (a: Booted, id: string) => a.root.querySelector(`.door[data-id="${id}"]`) as HTMLElement;
/** Wait until `fn` is true: the riddle's hash is real and takes a moment. */
async function until(fn: () => boolean, ms = 8000): Promise<void> {
    const end = Date.now() + ms;
    while (!fn()) {
        if (Date.now() > end) throw new Error('timed out');
        await new Promise(r => setTimeout(r, 10));
    }
}

describe('the road to the Cashtab app', () => {
    it('asks the app to come back to the browser only on Android; anywhere else the link carries no b', async () => {
        const { appRoad } = await import('./inapp');
        const l = fundLinks(deriveKey(newSecret()).address, 8_888n);
        const android = appRoad(l, 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36');
        expect(android).toBe(l.appBack);
        expect(android.endsWith('&b=1')).toBe(true);
        for (const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', '']) {
            expect(appRoad(l, ua), ua).toBe(l.app);
            expect(appRoad(l, ua), ua).not.toMatch(/[?&]b=/);
        }
    });
});

describe('the shop', () => {
    it('the-page-opens-on-the-shop-and-wears-nothing', () => {
        app = boot(undefined, { stay: true });
        expect(app.root.querySelector('.screen-home')).not.toBeNull();
        // One door per wrapper, each named, each free; and one for the wrappers that are not here yet.
        for (const w of WRAPPERS) {
            expect(door(app, w.id).textContent).toContain(w.name.en);
            // Each door says what its wrapper costs: free, or its price from the table that ships with the page.
            const o = offerOf(w);
            expect(door(app, w.id).textContent).toContain(o.kind === 'free' ? t('home.price.free') : 'XEC');
            expect(door(app, w.id).dataset.state).toBe('even');
        }
        expect(app.root.querySelector('.door--soon')!.textContent).toContain(t('home.soon'));
        // Nothing is worn: the frame is its neutral glass.
        expect(root().dataset.material).toBe('glass');
        expect(root().dataset.wears).toBe('');
        expect(main(app).textContent).toContain(t('home.title'));
        // Looking around the shop makes no key.
        expect(newSecret).not.toHaveBeenCalled();
        expect(deriveKey).not.toHaveBeenCalled();
        expect(getMade()).toBeNull();
    });

    it('a-door-dresses-the-whole-page-in-its-wrapper', () => {
        app = boot(undefined, { stay: true });
        for (const w of WRAPPERS) {
            (door(app, w.id).querySelector('.door-btn') as HTMLButtonElement).click();
            const th = w.theme!;
            expect(root().dataset.wears).toBe(w.id);
            expect(root().dataset.material).toBe(th.material);
            expect(root().dataset.corner).toBe(th.corner);
            expect(root().dataset.face).toBe(th.face);
            expect(root().style.getPropertyValue('--th-surface')).toBe(th.surface);
            expect(root().style.getPropertyValue('--th-accent')).toBe(th.accent);
            // The door stands open, the others step back, and the counter speaks of this wrapper.
            expect(door(app, w.id).dataset.state).toBe('open');
            expect(door(app, w.id).querySelector('.door-btn')!.getAttribute('aria-pressed')).toBe('true');
            for (const o of WRAPPERS) if (o.id !== w.id) expect(door(app, o.id).dataset.state).toBe('spine');
            expect(main(app).querySelector('.home-name')!.textContent).toBe(w.name.en);
            expect(main(app).textContent).toContain(w.blurb!.en);
            // A door keeps its own theme whatever the page wears.
            expect(door(app, w.id).dataset.material).toBe(th.material);
        }
        // Back to the whole shelf: neutral again.
        buttonByText(main(app), t('home.all')).click();
        expect(root().dataset.material).toBe('glass');
        expect(door(app, WRAPPERS[0]!.id).dataset.state).toBe('even');
    });

    it('wrapping a gift carries the wrapper to the create screen, and back returns to the shop', () => {
        app = boot(undefined, { stay: true });
        (door(app, 'signal').querySelector('.door-btn') as HTMLButtonElement).click();
        buttonByText(main(app), t('home.use')).click();
        expect(app.root.querySelector('.screen-create')).not.toBeNull();
        expect(app.root.querySelector('.pick[aria-checked="true"]')!.getAttribute('data-id')).toBe('signal');
        // The create screen wears the same wrapper.
        expect(root().dataset.material).toBe('wire');
        expect(newSecret).not.toHaveBeenCalled();
        (main(app).querySelector('.create-back') as HTMLButtonElement).click();
        expect(app.root.querySelector('.screen-home')).not.toBeNull();
        expect(door(app, 'signal').dataset.state).toBe('open');
    });

    it('the counter has a page for how it works, what it is, the workshop and buying wrappers', () => {
        app = boot(undefined, { stay: true });
        const pages: [string, string, string][] = [
            [t('home.nav.how'), t('home.how.title'), t('home.how.2.b')],
            [t('home.nav.about'), t('home.about.title'), t('home.about.1')],
            [t('home.nav.workshop'), t('home.workshop.title'), t('home.workshop.2')],
            [t('home.nav.market'), t('home.market.title'), t('home.market.status')],
        ];
        for (const [tab, title, text] of pages) {
            buttonByText(main(app), tab).click();
            expect(main(app).querySelector('.home-title')!.textContent).toBe(title);
            expect(main(app).textContent).toContain(text);
            (main(app).querySelector('.home-back') as HTMLButtonElement).click();
            expect(main(app).textContent).toContain(t('home.title'));
        }
        // What is not built says so.
        buttonByText(main(app), t('home.nav.market')).click();
        // Buying is switched on: its page carries a plain note, no "soon" mark.
        expect(main(app).querySelector('.home-soon')).toBeNull();
        expect(main(app).textContent).toContain(t('home.market.status'));
        // The two truths about a link are on the how-to page, in the page's own fixed words.
        (main(app).querySelector('.home-back') as HTMLButtonElement).click();
        buttonByText(main(app), t('home.nav.how')).click();
        expect(main(app).textContent).toContain(t('create.truth.1'));
        expect(main(app).textContent).toContain(t('create.truth.2'));
    });
});

describe('the pictures on the doors', () => {
    it('a full shelf shows the cut of each still, asked for with its version', () => {
        app = boot(undefined, { stay: true });
        const stills = () => [...app!.root.querySelectorAll('.door img.door-still')].map(i => i.getAttribute('src') ?? '');
        expect(stills().length).toBe(WRAPPERS.length);
        expect(stills().every(s => /^\/thumbs\/door\/[a-z0-9-]+\.webp\?v=[a-f0-9]{8}$/.test(s))).toBe(true);
        expect(app.root.querySelectorAll('.door img.door-still--cut').length).toBe(WRAPPERS.length);
    });
});

describe("the notice inside another app's browser", () => {
    it('can be closed by hand, stays closed across a repaint, and keeps nothing', () => {
        vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) Mobile Twitter for iPhone');
        app = boot(undefined, { stay: true });
        expect(app.root.querySelector('.banner')?.textContent).toContain(t('app.inapp.create'));
        const close = app.root.querySelector('.banner-close') as HTMLButtonElement;
        expect(close.getAttribute('aria-label')).toBe(t('app.inapp.close'));
        close.click();
        expect(app.root.querySelector('.banner, .banner-wrap')).toBeNull();
        // Another screen is a repaint: the notice does not come back.
        (app.root.querySelector('.screen-home .home-go') as HTMLButtonElement).click();
        expect(app.root.querySelector('.banner')).toBeNull();
        expect(localStorage.length).toBe(0);
        expect(sessionStorage.length).toBe(0);
    });
});

describe('the riddle lock', () => {
    async function makeLocked(a: Booted, question: string, answer: string): Promise<void> {
        type(a.root.querySelector('#f-amount') as HTMLInputElement, '88');
        const box = a.root.querySelector('#f-riddle') as HTMLInputElement;
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        type(a.root.querySelector('#f-riddle-q') as HTMLInputElement, question);
        type(a.root.querySelector('#f-riddle-a') as HTMLInputElement, answer);
        type(a.root.querySelector('#f-riddle-a2') as HTMLInputElement, answer);
        (a.root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await until(() => getMade() !== null);
        await flush();
    }

    it('the lock is optional, needs both halves, and says its limits before the gift exists', async () => {
        app = boot();
        const submit = app.root.querySelector('button[type=submit]') as HTMLButtonElement;
        type(app.root.querySelector('#f-amount') as HTMLInputElement, '88');
        expect(submit.disabled).toBe(false);
        expect((app.root.querySelector('.riddle-fields') as HTMLElement).hidden).toBe(true);
        const box = app.root.querySelector('#f-riddle') as HTMLInputElement;
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        expect((app.root.querySelector('.riddle-fields') as HTMLElement).hidden).toBe(false);
        expect(app.root.textContent).toContain(t('create.riddle.limit'));
        expect(app.root.textContent).toContain(t('create.riddle.forget'));
        // A question without an answer, or an answer that is nothing once normalised, is not a lock.
        expect(submit.disabled).toBe(true);
        type(app.root.querySelector('#f-riddle-q') as HTMLInputElement, 'Our café?');
        type(app.root.querySelector('#f-riddle-a') as HTMLInputElement, '   ');
        expect(submit.disabled).toBe(true);
        expect(app.root.textContent).toContain(t('create.need.riddle'));
        type(app.root.querySelector('#f-riddle-a') as HTMLInputElement, 'Giảng');
        // The answer is typed twice; a different second answer is not a lock either.
        expect(submit.disabled).toBe(true);
        type(app.root.querySelector('#f-riddle-a2') as HTMLInputElement, 'Giang nhé');
        expect(submit.disabled).toBe(true);
        expect(app.root.textContent).toContain(t('create.riddle.a2.diff'));
        type(app.root.querySelector('#f-riddle-a2') as HTMLInputElement, ' giang ');
        expect(submit.disabled).toBe(false);
        // An answer of a few digits, or a very short one, is warned about and never refused.
        const weak = app.root.querySelector('#f-riddle-weak') as HTMLElement;
        expect(weak.hidden).toBe(true);
        for (const a of ['1234', '12 34 56', 'ab', 'Mèo']) {
            type(app.root.querySelector('#f-riddle-a') as HTMLInputElement, a);
            type(app.root.querySelector('#f-riddle-a2') as HTMLInputElement, a);
            expect(weak.hidden, a).toBe(false);
            expect(weak.textContent).toBe(t('create.riddle.a.weak'));
            expect(submit.disabled, a).toBe(false);
        }
        for (const a of ['123456789', 'giang', 'quán 24']) {
            type(app.root.querySelector('#f-riddle-a') as HTMLInputElement, a);
            type(app.root.querySelector('#f-riddle-a2') as HTMLInputElement, a);
            expect(weak.hidden, a).toBe(true);
        }
        // An answer that can be read in the wish or in the question is warned about and never refused:
        // both ride in the link in plain sight.
        const shown = app.root.querySelector('#f-riddle-shown') as HTMLElement;
        const setAnswer = (a: string): void => {
            type(app!.root.querySelector('#f-riddle-a') as HTMLInputElement, a);
            type(app!.root.querySelector('#f-riddle-a2') as HTMLInputElement, a);
        };
        setAnswer('giang');
        expect(shown.hidden).toBe(true);
        type(app.root.querySelector('#f-wish') as HTMLTextAreaElement, 'Hẹn ở quán  GIẢNG nhé');
        expect(shown.hidden).toBe(false);
        expect(shown.textContent).toBe(t('create.riddle.a.shown'));
        expect(shown.classList.contains('warning')).toBe(true);
        expect(submit.disabled).toBe(false);
        type(app.root.querySelector('#f-wish') as HTMLTextAreaElement, 'Chúc mừng');
        expect(shown.hidden).toBe(true);
        type(app.root.querySelector('#f-riddle-q') as HTMLInputElement, 'Quán Giảng hay quán khác?');
        expect(shown.hidden).toBe(false);
        expect(submit.disabled).toBe(false);
        // A very short answer is in every text: that is the other notice's business.
        type(app.root.querySelector('#f-riddle-q') as HTMLInputElement, 'Our café?');
        setAnswer('a');
        expect(shown.hidden).toBe(true);
        expect(newSecret).not.toHaveBeenCalled();
    });

    it('a locked gift is made from the secret and the answer; the link carries the question, never the answer', async () => {
        app = boot();
        await makeLocked(app, 'Our café?', 'Giảng');
        const made = getMade()!;
        expect(made.riddle).toBe('Our café?');
        const link = decodeFragment(made.link.slice(made.link.indexOf('#')))!;
        expect(link.riddle).toBe('Our café?');
        // The address the giver funds is the one the right answer opens — not the one the secret alone would give.
        expect(made.key.address).toBe((await unlockKey(link, ' giang ')).address);
        expect(made.key.address).not.toBe(deriveKey(link.secret).address);
        expect(made.link).not.toContain(made.key.address.replace('ecash:', ''));
        // By default it names where the gift is (its spot), so that a page can tell whether it is still there.
        expect(link.spot).toEqual(made.key.pkh);
        expect(made.link.toLowerCase()).not.toContain('giang');
        // The created screen shows the question and where the answer must not travel.
        expect(app.root.querySelector('.screen-created .riddle-q')!.textContent).toBe('Our café?');
        expect(app.root.textContent).toContain(t('created.riddle.body'));
    });

    async function lockedGift(chain: DemoChain, state: 'funded' | 'taken' | 'unfunded') {
        const secret = newSecret();
        const link = { version: 1 as const, secret, wrapper: 'lixi', wish: 'chuc mung nam moi', riddle: 'What says meow?' };
        const key = await unlockKey(link, 'cat');
        if (state !== 'unfunded') chain.fund(key.address, 8888n);
        if (state === 'taken') chain.steal(key.address);
        const url = encodeLink(link, location.origin);
        vi.mocked(newSecret).mockClear();
        vi.mocked(deriveKey).mockClear();
        return { key, frag: url.slice(url.indexOf('#')) };
    }
    const answer = async (a: Booted, text: string): Promise<void> => {
        type(a.root.querySelector('#rd-answer') as HTMLInputElement, text);
        const submit = a.root.querySelector('.riddle-form button[type=submit]') as HTMLButtonElement;
        (a.root.querySelector('.riddle-form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await until(() => !a.root.contains(submit) || !submit.disabled);
        await flush();
    };

    it('a-riddle-link-carries-no-address', async () => {
        const chain = createDemoChain();
        const { frag } = await lockedGift(chain, 'funded');
        const read = vi.spyOn(chain, 'read');
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        await flush();
        // Before an answer: the question, and nothing from the network — no address exists to ask about.
        expect(app.root.querySelector('.screen-locked')).not.toBeNull();
        expect(app.root.querySelector('.riddle-q')!.textContent).toBe('What says meow?');
        expect(read).not.toHaveBeenCalled();
        expect(deriveKey).not.toHaveBeenCalled();
        expect(main(app).textContent).not.toContain('88.88');
        expect(main(app).textContent).not.toContain('chuc mung nam moi');
        expect(main(app).querySelector('.slide, .tap, .amount-block')).toBeNull();
        // The warnings that are always there, before any answer.
        expect(main(app).textContent).toContain(t('pkg.recovery'));
        expect(main(app).textContent).toContain(t('pkg.empty.scam'));
        // An empty answer is not tried.
        await answer(app, '   ');
        expect(read).not.toHaveBeenCalled();
        expect(main(app).textContent).toContain(t('pkg.riddle.need'));
    });

    it('a-wrong-answer-and-an-opened-envelope-read-differently', async () => {
        // A wrong answer: "not this one", no payment control, and the scam warning.
        const chain = createDemoChain();
        const { frag } = await lockedGift(chain, 'funded');
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        await answer(app, 'dog');
        expect(app.root.querySelector('.screen-locked')).not.toBeNull();
        const wrong = main(app).textContent ?? '';
        expect(wrong).toContain(t('pkg.riddle.wrong'));
        expect(wrong).toContain(t('pkg.riddle.wrong.next'));
        expect(wrong).toContain(t('pkg.empty.scam'));
        expect(main(app).querySelectorAll('.scam')).toHaveLength(1);
        expect(wrong).not.toContain(t('pkg.taken'));
        expect(wrong).not.toContain('88.88');
        expect(main(app).querySelectorAll('button')).toHaveLength(1); // only "Unlock"
        // The right answer, in any spelling: on to the gift, which opens as any gift does.
        await answer(app, '  CAT ');
        expect(app.root.querySelector('.screen-locked')).toBeNull();
        expect(main(app).querySelector('.slide')).not.toBeNull();
        (app.root.querySelector('.tap') as HTMLButtonElement).click();
        await flush();
        expect(main(app).textContent).toContain('88.88');
        expect(main(app).textContent).toContain('chuc mung nam moi');
        app.stop();

        // The right answer to a gift already taken home: a different sentence altogether.
        resetPage('en');
        const chain2 = createDemoChain();
        const taken = await lockedGift(chain2, 'taken');
        history.replaceState(null, '', '/' + taken.frag);
        app = boot(chain2);
        await answer(app, 'cat');
        const gone = main(app).textContent ?? '';
        expect(gone).toContain(t('pkg.taken'));
        expect(gone).not.toContain(t('pkg.riddle.wrong'));
        // It stays on the locked screen: a taken address is not proof this was the giver's answer, so another may be tried.
        expect(app.root.querySelector('.screen-locked')).not.toBeNull();
        expect(gone).toContain(t('pkg.riddle.taken.next'));
        expect(main(app).querySelectorAll('button')).toHaveLength(1);
    });

    it('an answered riddle is not asked again after a language switch', async () => {
        const chain = createDemoChain();
        const { frag } = await lockedGift(chain, 'funded');
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        await answer(app, 'cat');
        expect(app.root.querySelector('.screen-locked')).toBeNull();
        (app.root.querySelector('.lang-item[data-lang="vi"]') as HTMLButtonElement).click();
        await flush();
        expect(app.root.querySelector('.screen-locked')).toBeNull();
        expect(app.root.querySelector('.screen-package .slide')).not.toBeNull();
    });
});

describe('a riddle link that names where the gift is', () => {
    const answer = async (a: Booted, text: string): Promise<void> => {
        type(a.root.querySelector('#rd-answer') as HTMLInputElement, text);
        const submit = a.root.querySelector('.riddle-form button[type=submit]') as HTMLButtonElement;
        (a.root.querySelector('.riddle-form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await until(() => !a.root.contains(submit) || !submit.disabled);
        await flush();
    };
    async function spotGift(chain: DemoChain, state: 'funded' | 'taken' | 'unfunded', wrapper = 'lixi', extra?: Parameters<DemoChain['fund']>[2] | ((pkh: Uint8Array) => Parameters<DemoChain['fund']>[2])) {
        const secret = newSecret();
        const plain = { version: 1 as const, secret, wrapper, wish: 'chuc mung nam moi', riddle: 'What says meow?' };
        const key = await unlockKey(plain, 'cat');
        if (state !== 'unfunded') chain.fund(key.address, 8888n, typeof extra === 'function' ? extra(key.pkh) : extra);
        if (state === 'taken') chain.steal(key.address);
        const url = encodeLink({ ...plain, spot: key.pkh }, location.origin);
        return { key, frag: url.slice(url.indexOf('#')) };
    }

    it('the giver may hide the status: then the link names no address', async () => {
        app = boot();
        type(app.root.querySelector('#f-amount') as HTMLInputElement, '88');
        const box = app.root.querySelector('#f-riddle') as HTMLInputElement;
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        const hide = app.root.querySelector('#f-riddle-hide') as HTMLInputElement;
        expect(hide.checked).toBe(false);
        expect(hide.closest('label')!.textContent).toContain(t('create.riddle.hide'));
        hide.checked = true;
        hide.dispatchEvent(new Event('change', { bubbles: true }));
        type(app.root.querySelector('#f-riddle-q') as HTMLInputElement, 'Our café?');
        type(app.root.querySelector('#f-riddle-a') as HTMLInputElement, 'Giảng');
        type(app.root.querySelector('#f-riddle-a2') as HTMLInputElement, 'Giảng');
        (app.root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await until(() => getMade() !== null);
        const link = decodeFragment(getMade()!.link.slice(getMade()!.link.indexOf('#')))!;
        expect(link.riddle).toBe('Our café?');
        expect(link.spot).toBeUndefined();
    });

    it('a gift that is there: the question is asked, a wrong answer is told without the network, the right one opens it', async () => {
        const chain = createDemoChain();
        const { key, frag } = await spotGift(chain, 'funded');
        const read = vi.spyOn(chain, 'read');
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        await until(() => read.mock.calls.length > 0);
        await flush();
        // One look at the address the link names; the question stands, and nothing of the gift is shown.
        expect(read.mock.calls.map(c => c[0])).toEqual([key.address]);
        expect(app.root.querySelector('.screen-locked .riddle-form')).not.toBeNull();
        expect(main(app).textContent).not.toContain('88.88');
        expect(main(app).textContent).not.toContain('chuc mung nam moi');
        expect(main(app).querySelectorAll('.scam')).toHaveLength(1);
        await answer(app, 'dog');
        expect(read).toHaveBeenCalledTimes(1);
        expect(main(app).textContent).toContain(t('pkg.riddle.wrong'));
        expect(main(app).textContent).toContain(t('pkg.riddle.again'));
        expect(main(app).textContent).not.toContain(t('pkg.riddle.wrong.next'));
        expect(app.root.querySelector('.screen-locked')).not.toBeNull();
        await answer(app, ' CAT ');
        expect(app.root.querySelector('.screen-locked')).toBeNull();
        expect(main(app).querySelector('.slide')).not.toBeNull();
    });

    it('a gift already taken, or not funded yet, says so before any answer: no field, no button, the warning', async () => {
        for (const [state, title, next] of [['taken', 'pkg.taken', 'pkg.taken.next'], ['unfunded', 'pkg.empty', 'pkg.empty.next']] as const) {
            resetPage('en');
            const chain = createDemoChain();
            const { frag } = await spotGift(chain, state);
            history.replaceState(null, '', '/' + frag);
            app = boot(chain);
            await until(() => app!.root.querySelector('.riddle-gone') !== null);
            expect(app.root.querySelector('.screen-locked')).not.toBeNull();
            expect(main(app).textContent).toContain(t(title));
            expect(main(app).textContent).toContain(t(next));
            // The heading is the state itself, said once: a gift that is gone is not called locked.
            expect(main(app).querySelector('h1')?.textContent).toBe(t(title));
            expect(main(app).textContent).not.toContain(t('pkg.riddle.title'));
            expect(main(app).textContent?.split(t(title))).toHaveLength(2);
            expect(main(app).querySelector('.riddle-form, input, button, a')).toBeNull();
            expect(main(app).querySelectorAll('.scam')).toHaveLength(1);
            expect(main(app).textContent).toContain(t('pkg.recovery'));
            expect(main(app).textContent).not.toContain('What says meow?');
            app.stop();
            app = null;
        }
    });

    it('a gift not funded yet is looked for again when the page is come back to; once it is there the question returns', async () => {
        const chain = createDemoChain();
        const { key, frag } = await spotGift(chain, 'unfunded');
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        await until(() => app!.root.querySelector('.riddle-gone') !== null);
        expect(main(app).querySelector('.riddle-form')).toBeNull();
        chain.fund(key.address, 8888n);
        window.dispatchEvent(new Event('online'));
        await until(() => app!.root.querySelector('.riddle-form') !== null);
        expect(app.root.querySelector('.riddle-gone')).toBeNull();
        expect(main(app).querySelectorAll('.scam')).toHaveLength(1);
        expect(main(app).querySelector('h1')?.textContent).toBe(t('pkg.riddle.title'));
        await answer(app, 'cat');
        expect(main(app).querySelector('.slide')).not.toBeNull();
    });

    it('a gift taken between the look and the answer: the right answer goes on to its own screen, which says so', async () => {
        const chain = createDemoChain();
        const { key, frag } = await spotGift(chain, 'funded');
        const read = vi.spyOn(chain, 'read');
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        await until(() => read.mock.calls.length > 0);
        await flush();
        chain.steal(key.address);
        await answer(app, 'cat');
        expect(app.root.querySelector('.screen-locked')).toBeNull();
        expect(main(app).textContent).toContain(t('pkg.taken'));
        expect(main(app).querySelector('.slide, input')).toBeNull();
    });

    it('a spot that is not the answer\'s address opens nothing: the right answer reads as wrong', async () => {
        const chain = createDemoChain();
        const secret = newSecret();
        const plain = { version: 1 as const, secret, wrapper: 'lixi', riddle: 'What says meow?' };
        const real = await unlockKey(plain, 'cat');
        chain.fund(real.address, 8888n);
        // Someone rewrote the link to name another address, one that holds money.
        const other = deriveKey(new Uint8Array(16).fill(9));
        chain.fund(other.address, 500n);
        const url = encodeLink({ ...plain, spot: other.pkh }, location.origin);
        history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
        app = boot(chain);
        await flush();
        await answer(app, 'cat');
        expect(app.root.querySelector('.screen-locked')).not.toBeNull();
        expect(main(app).textContent).toContain(t('pkg.riddle.wrong'));
        expect(main(app).querySelector('.slide, .amount-block')).toBeNull();
    });

    it('a paid wrapper is learned before the answer: the right answer leads straight to it, never to the default', async () => {
        const maker = deriveKey(new Uint8Array(16).fill(0x33));
        const offer = { sats: 50_000n, payTo: maker.address };
        const hex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
        const p2pkh = (pkh: Uint8Array) => `76a914${hex(pkh)}88ac`;
        setOfferForDev('mecha', offer);
        const chain = createDemoChain();
        const { frag } = await spotGift(chain, 'funded', 'mecha', pkh => ({
            tx: { inputs: ['76a914' + '11'.repeat(20) + '88ac'], outputs: [{ sats: 0n, script: '6a' + stampOpReturnRaw('mecha', pkh) }, { sats: 8888n, script: p2pkh(pkh) }, { sats: offer.sats, script: p2pkh(maker.pkh) }] },
        }));
        const read = vi.spyOn(chain, 'read');
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        await until(() => read.mock.calls.length > 0);
        // Answered at once: the lock's own opening gives the look ahead the time it needs.
        await answer(app, 'cat');
        // No stand-in, no "loading": the gift is in its own wrapper at once.
        expect(app.root.querySelector('.screen-locked')).toBeNull();
        expect(document.documentElement.dataset.wears).toBe('mecha');
        expect(main(app).querySelector('.slide')).not.toBeNull();
        expect(main(app).querySelector('.loading')).toBeNull();
        setOfferForDev('mecha', null);
    });
});

describe('buying a wrapper', () => {
    const maker = deriveKey(new Uint8Array(16).fill(0x33));
    const offer = { sats: 50_000n, payTo: maker.address };
    const hex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    const p2pkh = (pkh: Uint8Array) => `76a914${hex(pkh)}88ac`;
    const stamped = (pkh: Uint8Array) => ({
        tx: {
            inputs: ['76a914' + '11'.repeat(20) + '88ac'],
            outputs: [
                { sats: 0n, script: '6a' + stampOpReturnRaw('mecha', pkh) },
                { sats: 8888n, script: p2pkh(pkh) },
                { sats: offer.sats, script: p2pkh(maker.pkh) },
            ],
        },
    });
    function mechaLink() {
        const secret = newSecret();
        const key = deriveKey(secret);
        const url = encodeLink({ version: 1, secret, wrapper: 'mecha', wish: 'chuc mung' }, location.origin);
        return { key, frag: url.slice(url.indexOf('#')) };
    }

    it('the-price-table-ships-with-the-page', () => {
        // The table was emptied after the test before this one (see afterEach): with no price, a wrapper is free.
        // What the shipped table holds is pinned in src/wrappers/prices.test.ts.
        for (const w of WRAPPERS) expect(offerOf(w)).toEqual({ kind: 'free' });
        // The default wrapper can never carry a price: it is what an unpaid gift falls back to.
        setOfferForDev('signal', offer);
        expect(offerOf(WRAPPERS.find(w => w.id === 'signal')!)).toEqual({ kind: 'free' });
        // A price that no wallet would send, or an address that is not one, is no offer.
        setOfferForDev('mecha', { sats: 100n, payTo: maker.address });
        expect(offerOf({ id: 'mecha' }).kind).toBe('free');
        setOfferForDev('mecha', offer);
        expect(offerOf({ id: 'mecha' })).toEqual({ kind: 'paid', ...offer });
        // The shop shows the price on the door and on the counter.
        app = boot(undefined, { stay: true });
        expect(app.root.querySelector('.door[data-id="mecha"]')!.textContent).toContain('500');
    });

    it('an-unpaid-wrapper-never-blocks-the-gift', async () => {
        setOfferForDev('mecha', offer);
        const chain = createDemoChain();
        const { key, frag } = mechaLink();
        chain.fund(key.address, 8888n); // funded without a stamp
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        await flush(12);
        // The default wrapper stands in, and the gift opens and can be taken as always.
        expect(document.documentElement.dataset.wears).toBe('signal');
        (app.root.querySelector('.tap') as HTMLButtonElement).click();
        await flush();
        expect(main(app).textContent).toContain('88.88');
        expect(main(app).textContent).toContain('chuc mung');
        expect(() => buttonByText(main(app!), t('pkg.take'))).not.toThrow();
        // a-reopened-link-never-offers-to-pay-for-a-wrapper: nothing on this screen mentions the wrapper's price.
        expect(main(app).textContent).not.toContain(t('created.stamp.later'));
        expect(main(app).textContent).not.toContain('500');
    });

    it('a-slow-chain-is-not-a-verdict: the page looks again, and the paid wrapper is put on while the gift is still closed', async () => {
        setOfferForDev('mecha', offer);
        const chain = createDemoChain();
        const { key, frag } = mechaLink();
        chain.fund(key.address, 8888n, stamped(key.pkh));
        // The node cannot say what is behind the coin, for now.
        const real = chain.detail!.bind(chain);
        let down = true;
        chain.detail = async id => {
            if (down) throw new Error('no answer');
            return real(id);
        };
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        await flush(12);
        // Not known yet: the default wrapper stands in, and the gift is there to open.
        expect(document.documentElement.dataset.wears).toBe('signal');
        expect(main(app).querySelector('.slide')).not.toBeNull();
        // The node answers again; the page's next quiet look (two seconds on) finds the payment.
        down = false;
        await new Promise(r => setTimeout(r, 2300));
        await flush(12);
        expect(document.documentElement.dataset.wears).toBe('mecha');
        expect(main(app).querySelector('.slide')).not.toBeNull();
        // Seen paid once, it stays dressed when the screen is drawn again (a language change).
        app.stop();
        app = boot(chain);
        expect(document.documentElement.dataset.wears).toBe('mecha');
    });

    it('a heart keeps a wrapper as a favourite in this browser, and the filter leaves only the hearts on the shelf', () => {
        app = boot(undefined, { stay: true });
        expect(app.root.querySelector('.home-fav-only')).toBeNull();
        (door(app, 'snowbox').querySelector('.door-btn') as HTMLButtonElement).click();
        const fav = (): HTMLButtonElement => app!.root.querySelector('.home-fav') as HTMLButtonElement;
        expect(fav().getAttribute('aria-pressed')).toBe('false');
        fav().click();
        expect(fav().getAttribute('aria-pressed')).toBe('true');
        // Wrapper ids, and nothing else.
        expect(localStorage.getItem('gift.fav')).toBe('["snowbox"]');
        expect(door(app, 'snowbox').dataset.fav).toBe('yes');
        const only = app.root.querySelector('.home-fav-only') as HTMLButtonElement;
        expect(only.textContent).toBe(t('home.fav.only', { n: '1' }));
        only.click();
        expect(door(app, 'snowbox').hidden).toBe(false);
        expect(door(app, 'lixi').hidden).toBe(true);
        // The last heart taken off ends the filter and empties the key.
        fav().click();
        expect(localStorage.getItem('gift.fav')).toBeNull();
        expect(door(app, 'lixi').hidden).toBe(false);
        expect(app.root.querySelector('.home-fav-only')).toBeNull();
    });

    it('the shelf filter: holiday wrappers, free or paid, each narrowing on its own; nothing is stored', () => {
        setOfferForDev('lixi', { sats: 50_000n, payTo: deriveKey(newSecret()).address });
        app = boot(undefined, { stay: true });
        const before = Object.keys(localStorage).sort();
        const panel = (): HTMLDetailsElement => app!.root.querySelector('details.home-filter') as HTMLDetailsElement;
        const chip = (label: string): HTMLButtonElement => buttonByText(panel(), label);
        const shown = (): string[] => [...app!.root.querySelectorAll<HTMLElement>('.door[data-id]')].filter(d => !d.hidden).map(d => d.dataset.id!);
        const soon = (): HTMLElement => app!.root.querySelector('.door--soon') as HTMLElement;
        // Closed until asked for; everything is on the shelf.
        expect(panel().open).toBe(false);
        // Opening it leaves the capsule as it is: the shelf behind it is what the filter is about.
        let grew = 0;
        app.root.addEventListener('cap:show', () => grew++);
        panel().open = true;
        panel().dispatchEvent(new Event('toggle'));
        expect(grew).toBe(0);
        expect(shown().length).toBe(WRAPPERS.length);
        expect(soon().hidden).toBe(false);
        expect(chip(t('home.filter.any')).getAttribute('aria-pressed')).toBe('true');

        chip(t('home.filter.holiday')).click();
        expect(shown()).toEqual(WRAPPERS.filter(isHoliday).map(w => w.id));
        expect(shown()).toContain('lixi');
        expect(shown()).toContain('snowbox');
        expect(shown()).not.toContain('mecha');
        // The door for wrappers to come is no wrapper of any kind.
        expect(soon().hidden).toBe(true);
        expect(panel().querySelector('.home-filter-shown')!.textContent).toBe(t('home.filter.shown', { n: String(shown().length), total: String(WRAPPERS.length) }));

        // Holiday and paid: the one holiday wrapper with a price.
        chip(t('home.filter.paid')).click();
        expect(shown()).toEqual(['lixi']);
        // Holiday and free: the others.
        chip(t('home.price.free')).click();
        expect(shown()).toEqual(WRAPPERS.filter(w => isHoliday(w) && w.id !== 'lixi').map(w => w.id));
        // Free alone.
        chip(t('home.filter.holiday')).click();
        expect(shown()).toEqual(WRAPPERS.filter(w => w.id !== 'lixi').map(w => w.id));

        // A wrapper that is worn stays on the shelf whatever the filter, and its number on the shelf is left out.
        chip(t('home.filter.paid')).click();
        expect(shown()).toEqual(['lixi']);
        (door(app, 'lixi').querySelector('.door-btn') as HTMLButtonElement).click();
        buttonByText(app.root, t('home.all')).click();
        chip(t('home.price.free')).click();
        (door(app, 'mecha').querySelector('.door-btn') as HTMLButtonElement).click();
        chip(t('home.filter.paid')).click();
        expect(shown().sort()).toEqual(['lixi', 'mecha']);
        expect(app.root.querySelector('.home-kicker')!.textContent).not.toContain('/');
        // The line counts what is on the shelf, the worn wrapper with it; the switch that was pressed keeps the focus.
        expect(panel().querySelector('.home-filter-shown')!.textContent).toBe(t('home.filter.shown', { n: '2', total: String(WRAPPERS.length) }));
        expect(document.activeElement).toBe(chip(t('home.filter.paid')));
        expect([...panel().querySelectorAll<HTMLButtonElement>('button')].some(b => b.disabled && b.getAttribute('aria-pressed') === 'true')).toBe(false);
        // "See the whole shelf" means all of it: the filter goes off.
        buttonByText(app.root, t('home.all')).click();
        expect(shown().length).toBe(WRAPPERS.length);
        chip(t('home.filter.paid')).click();
        expect(shown()).toEqual(['lixi']);

        buttonByText(panel(), t('home.filter.clear')).click();
        expect(shown().length).toBe(WRAPPERS.length);
        expect(soon().hidden).toBe(false);
        expect(Object.keys(localStorage).sort()).toEqual(before);
    });

    it('the shelf filter never offers an empty shelf, and takes hearts as one more switch', () => {
        app = boot(undefined, { stay: true });
        const panel = (): HTMLDetailsElement => app!.root.querySelector('details.home-filter') as HTMLDetailsElement;
        const shown = (): string[] => [...app!.root.querySelectorAll<HTMLElement>('.door[data-id]')].filter(d => !d.hidden).map(d => d.dataset.id!);
        // No wrapper has a price here (the test took them off): "paid" cannot be pressed.
        expect(buttonByText(panel(), t('home.filter.paid')).disabled).toBe(true);
        expect(buttonByText(panel(), t('home.price.free')).disabled).toBe(false);
        // A heart on a wrapper that is no holiday one: hearts and holidays together would be empty.
        (door(app, 'mecha').querySelector('.door-btn') as HTMLButtonElement).click();
        (app.root.querySelector('.home-fav') as HTMLButtonElement).click();
        (panel().querySelector('.home-fav-only') as HTMLButtonElement).click();
        expect(shown()).toEqual(['mecha']);
        expect(buttonByText(panel(), t('home.filter.holiday')).disabled).toBe(true);
        // The heart taken off under the hearts-only switch: the switch goes off, the shelf is whole again.
        (app.root.querySelector('.home-fav') as HTMLButtonElement).click();
        expect(shown().length).toBe(WRAPPERS.length);
        expect(panel().querySelector('.home-fav-only')).toBeNull();
    });

    it('the mark goes home: at once from the shop, after a question from a gift', async () => {
        const chain = createDemoChain();
        const secret = newSecret();
        const key = deriveKey(secret);
        const url = encodeLink({ version: 1, secret, wrapper: 'snowbox' }, location.origin);
        chain.fund(key.address, 8888n);
        history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
        app = boot(chain);
        await flush(12);
        const mark = app.root.querySelector('button.wordmark') as HTMLButtonElement;
        const ask = app.root.querySelector('.leave') as HTMLElement;
        expect(ask.hidden).toBe(true);
        mark.click();
        // A gift is on the page: nothing is left behind without a yes.
        expect(ask.hidden).toBe(false);
        expect(ask.textContent).toContain(t('app.leave.package'));
        expect(app.root.querySelector('.screen-package')).not.toBeNull();
        buttonByText(ask, t('app.leave.stay')).click();
        expect(ask.hidden).toBe(true);
        expect(app.root.querySelector('.screen-package')).not.toBeNull();
        mark.click();
        buttonByText(ask, t('app.home')).click();
        await flush();
        expect(app.root.querySelector('.screen-home')).not.toBeNull();
        expect(location.hash).toBe('');
        // From the shop the mark asks nothing.
        (app.root.querySelector('button.wordmark') as HTMLButtonElement).click();
        expect((app.root.querySelector('.leave') as HTMLElement).hidden).toBe(true);
        expect(app.root.querySelector('.screen-home')).not.toBeNull();
    });

    it('a gift that was paid for and then taken home still wears its wrapper; one that was never paid for does not', async () => {
        setOfferForDev('mecha', offer);
        const chain = createDemoChain();
        const paid = mechaLink();
        chain.fund(paid.key.address, 8888n, stamped(paid.key.pkh));
        chain.steal(paid.key.address);
        history.replaceState(null, '', '/' + paid.frag);
        app = boot(chain);
        await flush(12);
        // Gone, and said so, in the wrapper its giver paid for.
        expect(document.documentElement.dataset.wears).toBe('mecha');
        expect(main(app).textContent).toContain(t('pkg.taken'));
        app.stop();
        resetPage('en');
        setOfferForDev('mecha', offer);
        const unpaid = mechaLink();
        chain.fund(unpaid.key.address, 8888n);
        chain.steal(unpaid.key.address);
        history.replaceState(null, '', '/' + unpaid.frag);
        app = boot(chain);
        await flush(12);
        expect(document.documentElement.dataset.wears).toBe('signal');
        expect(main(app).textContent).toContain(t('pkg.taken'));
    });

    it('a-paid-wrapper-is-never-shown-before-its-stamp-is-read', async () => {
        setOfferForDev('mecha', offer);
        const chain = createDemoChain();
        const { key, frag } = mechaLink();
        chain.fund(key.address, 8888n, stamped(key.pkh));
        history.replaceState(null, '', '/' + frag);
        app = boot(chain);
        // At once, before the chain has answered: the free wrapper.
        expect(document.documentElement.dataset.wears).toBe('signal');
        await flush(12);
        // The stamp was read: now the paid wrapper, and the gift is there.
        expect(document.documentElement.dataset.wears).toBe('mecha');
        expect(main(app).querySelector('.slide')).not.toBeNull();
        app.stop();
        // An empty package named with a paid wrapper shows the free one, whatever the link says.
        resetPage('en');
        setOfferForDev('mecha', offer);
        const empty = mechaLink();
        history.replaceState(null, '', '/' + empty.frag);
        app = boot(createDemoChain());
        await flush(12);
        expect(document.documentElement.dataset.wears).toBe('signal');
        expect(main(app).textContent).toContain(t('pkg.empty.scam'));
    });

    it('the giver funds and stamps in one step, and is told whether the wrapper was paid', async () => {
        setOfferForDev('mecha', offer);
        const opened: string[] = [];
        vi.spyOn(window, 'open').mockImplementation(((u: string) => void opened.push(u)) as unknown as typeof window.open);
        stubClipboard();
        app = boot(undefined, { stay: true });
        (door(app, 'mecha').querySelector('.door-btn') as HTMLButtonElement).click();
        buttonByText(main(app), t('home.use')).click();
        // The price is said before the gift exists.
        expect(main(app).textContent).toContain(t('create.price', { price: '500' }));
        await createGift(app.root, '88.88');
        const made = getMade()!;
        expect(main(app).textContent).toContain(t('created.stamp.price', { name: 'Mecha capsule', price: '500', credit: 'eGift Studio' }));
        buttonByText(main(app), t('link.copy')).click();
        await flush();
        buttonByText(main(app), t('created.fund.web')).click();
        const want = stampedFundLinks({ address: made.key.address, sats: made.sats, wrapper: 'mecha', offer });
        expect(opened).toEqual([want.web]);
        // Funded by a wallet that left the wrapper payment out: said plainly, with a way to pay it now.
        app.chain.fund(made.key.address, made.sats);
        await flush(12);
        expect(main(app).textContent).toContain(t('created.stamp.unpaid'));
        const later = buttonByText(main(app), t('created.stamp.later'));
        expect(later.hidden).toBe(false);
        later.click();
        expect(opened[1]).toBe(stampedFundLinks({ address: made.key.address, sats: 546n, wrapper: 'mecha', offer }).web);
        // The same small payment through the Cashtab app.
        const laterApp = later.nextElementSibling as HTMLButtonElement;
        expect(laterApp.textContent).toBe(t('created.fund.app'));
        expect(laterApp.hidden).toBe(false);
        laterApp.click();
        expect(opened[2]).toBe(stampedFundLinks({ address: made.key.address, sats: 546n, wrapper: 'mecha', offer }).app);
        // The small stamp arrives: paid, and the extra coin is not reported as a wrong amount.
        app.chain.fund(made.key.address, 546n, stamped(made.key.pkh));
        await flush(12);
        expect(main(app).textContent).toContain(t('created.stamp.paid'));
        expect(buttonByText(main(app), t('created.stamp.later')).hidden).toBe(true);
        expect(laterApp.hidden).toBe(true);
        expect(main(app).textContent).toContain(t('created.status.funded'));
        expect(main(app).textContent).not.toContain('expected');
    });

    it('a-giver-who-owns-the-wrapper-funds-with-the-plain-link', async () => {
        const LICENCE = 'ab'.repeat(32);
        const owned = { ...offer, licence: { tokenId: LICENCE } };
        const wallet = '76a914' + '22'.repeat(20) + '88ac';
        setOfferForDev('mecha', owned);
        const opened: string[] = [];
        vi.spyOn(window, 'open').mockImplementation(((u: string) => void opened.push(u)) as unknown as typeof window.open);
        stubClipboard();
        app = boot(undefined, { stay: true });
        (door(app, 'mecha').querySelector('.door-btn') as HTMLButtonElement).click();
        buttonByText(main(app), t('home.use')).click();
        await createGift(app.root, '88.88');
        const made = getMade()!;
        buttonByText(main(app), t('link.copy')).click();
        await flush();
        // Paying per gift is the default; owning is chosen by hand.
        const mine = buttonByText(main(app), t('created.own.mine'));
        expect(mine.getAttribute('aria-pressed')).toBe('false');
        mine.click();
        expect(mine.getAttribute('aria-pressed')).toBe('true');
        expect(main(app).textContent).toContain(t('created.own.note'));
        buttonByText(main(app), t('created.fund.web')).click();
        expect(opened[0]).toBe(fundLinks(made.key.address, made.sats).web);
        expect(opened[0]).not.toContain('op_return_raw');
        // Funded from a wallet that does not hold the licence: said plainly, and paying per gift is still there.
        const p2pkh = '76a914' + [...made.key.pkh].map(b => b.toString(16).padStart(2, '0')).join('') + '88ac';
        app.chain.fund(made.key.address, made.sats, { tx: { inputs: [wallet], outputs: [{ sats: made.sats, script: p2pkh }] } });
        await flush(12);
        expect(main(app).textContent).toContain(t('created.stamp.notowned'));
        expect(buttonByText(main(app), t('created.stamp.later')).hidden).toBe(false);
        // The wallet holds it after all: owned, nothing more to pay.
        app.chain.grant(LICENCE, wallet);
        app.chain.fund(made.key.address, 546n); // anything new at the address makes the page look again
        await flush(12);
        expect(main(app).textContent).toContain(t('created.stamp.owned'));
        expect(buttonByText(main(app), t('created.stamp.later')).hidden).toBe(true);
        // Whoever opens the link sees the bought wrapper.
        app.stop();
        resetPage('en');
        setOfferForDev('mecha', owned);
        history.replaceState(null, '', '/' + new URL(made.link).hash);
        const chain = app.chain;
        app = boot(chain);
        await flush(12);
        expect(document.documentElement.dataset.wears).toBe('mecha');
    });
});
