/**
 * Dressing a wrapper (workshop, tier 1): the giver's accent, face and quiet
 * are seen at once on the create step, ride in the link as a recipe, and dress
 * the gift for whoever opens it — but only the wrapper the link names.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../stage', async orig => {
    const real = await orig<typeof import('../stage')>();
    const { fakeMountStage } = await import('./fakestage');
    return { ...real, mountStage: fakeMountStage };
});

import { createDemoChain, decodeFragment, deriveKey, encodeLink, newSecret, stampOpReturnRaw, unlockKey } from '../core';
import type { DemoChain } from '../core';
import { SAFETY_KEYS, t } from '../i18n';
import { LOCK_WRAPPER, WRAPPERS, setOfferForDev, wrapperById } from '../wrappers';
import { ACCENTS, accentFor } from '../wrappers/looks';
import { loadLooks } from './looks';
import { getMade } from './session';
import { getSound } from './sound';
import { boot, createGift, flush, resetPage, type, type Booted } from './testkit';

let app: Booted | null = null;
beforeEach(() => {
    resetPage('en');
});
afterEach(() => {
    for (const w of WRAPPERS) setOfferForDev(w.id, null);
    app?.stop();
    app = null;
    vi.restoreAllMocks();
});

const page = () => document.documentElement;
const token = (name: string): string => page().style.getPropertyValue(name);
const main = (a: Booted) => a.root.querySelector('main') as HTMLElement;
const dress = (a: Booted) => a.root.querySelector('details.dress') as HTMLDetailsElement;
const swatches = (a: Booted) => [...dress(a).querySelectorAll('.swatch')] as HTMLButtonElement[];
const faceChips = (a: Booted) => [...dress(a).querySelectorAll('.face-chip')] as HTMLButtonElement[];
const quiet = (a: Booted) => dress(a).querySelector('#f-quiet') as HTMLInputElement;
const saveBtn = (a: Booted) => dress(a).querySelector('.dress-save') as HTMLButtonElement;
const savedLooks = (a: Booted) => [...dress(a).querySelectorAll('.look')] as HTMLButtonElement[];
const pick = (a: Booted, id: string): void => (a.root.querySelector(`.pick[data-id="${id}"]`) as HTMLButtonElement).click();
const checked = (els: HTMLElement[]): number[] => els.flatMap((el, i) => (el.getAttribute('aria-checked') === 'true' ? [i] : []));
async function until(fn: () => boolean, ms = 8000): Promise<void> {
    const end = Date.now() + ms;
    while (!fn()) {
        if (Date.now() > end) throw new Error('timed out');
        await new Promise(r => setTimeout(r, 10));
    }
}
/** Open a gift link on a chain where it is funded. */
function open(link: Parameters<typeof encodeLink>[0], chain: DemoChain = createDemoChain(), extra?: Parameters<DemoChain['fund']>[2]): Booted {
    const key = deriveKey(link.secret);
    chain.fund(key.address, 8888n, extra);
    const url = encodeLink(link, location.origin);
    history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
    return boot(chain);
}

const snowbox = wrapperById('snowbox')!;
const lixi = wrapperById('lixi')!;
const mecha = wrapperById('mecha')!;
const signal = wrapperById('signal')!;

describe('the giver dresses the wrapper', () => {
    it('the fold is closed until asked for, and holds no warning and no safety line', () => {
        app = boot();
        expect(dress(app)).not.toBeNull();
        expect(dress(app).open).toBe(false);
        expect(dress(app).querySelector('summary')!.textContent).toBe(t('create.dress.title'));
        expect(dress(app).querySelector('.warning')).toBeNull();
        const safety = new Set(SAFETY_KEYS.map(k => t(k).trim()));
        expect([...dress(app).querySelectorAll('*')].filter(el => safety.has((el.textContent ?? '').trim()))).toEqual([]);
        // It sits in the picker, right after the preview button; nothing in it is a link.
        expect(dress(app).previousElementSibling?.classList.contains('btn-preview')).toBe(true);
        expect(dress(app).querySelector('a')).toBeNull();
        // Opened, it stays open across a language change.
        dress(app).open = true;
        dress(app).dispatchEvent(new Event('toggle'));
        (app.root.querySelector('.lang-item[data-lang="vi"]') as HTMLButtonElement).click();
        expect(dress(app).open).toBe(true);
        expect(dress(app).querySelector('summary')!.textContent).toBe('Chỉnh vỏ');
    });

    it('a swatch changes the page accent at once, without a new stage; the link ends with the recipe and the gift is shown dressed', async () => {
        app = boot();
        pick(app, 'snowbox');
        expect(token('--th-accent')).toBe(snowbox.theme!.accent);
        // The wrapper's own colour first and chosen, then the shared ones; each named for a screen reader.
        const sw = swatches(app);
        expect(sw).toHaveLength(1 + ACCENTS.length);
        expect(checked(sw)).toEqual([0]);
        expect(sw[0]!.getAttribute('aria-label')).toBe(t('create.dress.own'));
        expect(sw[4]!.getAttribute('aria-label')).toBe(t('create.dress.colour', { n: 4 }));
        expect(sw.every(b => b.getAttribute('role') === 'radio' && b.closest('[role="radiogroup"]') !== null)).toBe(true);
        expect((sw[4]!.firstElementChild as HTMLElement).style.getPropertyValue('--sw')).toBe('#0074C2');
        const stage = app.root.querySelector('.showroom .plate');
        sw[4]!.click();
        expect(token('--th-accent')).toBe('#0074C2');
        expect(token('--th-on-accent')).toBe('#FFFFFF');
        expect(checked(swatches(app))).toEqual([4]);
        // Only the frame was dressed again: the stage is the one that was there.
        expect(app.root.querySelector('.showroom .plate')).toBe(stage);
        // The face: three chips showing a figure, the wrapper's own chosen; its own writes nothing.
        const fc = faceChips(app);
        expect(fc.map(b => b.textContent)).toEqual(['20', '20', '20', '20', '20', '20']);
        expect(checked(fc)).toEqual([0]);
        fc[1]!.click();
        expect(page().dataset.face).toBe('tech');
        expect(checked(faceChips(app))).toEqual([1]);
        expect(app.root.querySelector('.showroom .plate')).toBe(stage);
        // Quiet takes the tune from the sound the page wears, and nothing else.
        expect(getSound()).toBe(snowbox.sound);
        quiet(app).click();
        expect(getSound()).toEqual({ v: 1, inst: snowbox.sound!.inst, tonic: snowbox.sound!.tonic });
        expect(app.root.querySelector('.showroom .plate')).toBe(stage);
        expect(token('--th-accent')).toBe('#0074C2');

        await createGift(app.root, '20', 'hi');
        const made = getMade()!;
        expect(made.link.endsWith('.snowbox.1cdftsq.aGk')).toBe(true);
        expect(decodeFragment(made.link.slice(made.link.indexOf('#')))!.recipe).toBe('1cdftsq');
        // The created screen wears the same look.
        expect(app.root.querySelector('.screen-created')).not.toBeNull();
        expect(page().dataset.wears).toBe('snowbox');
        expect(token('--th-accent')).toBe('#0074C2');
        expect(page().dataset.face).toBe('tech');
        expect(getSound()!.score).toBeUndefined();
        // Nothing was stored by any of it.
        expect(localStorage.length).toBe(0);
    });

    it('a wrapper with colourways offers them; one puts up a new stage in other colours, rides in the link, and is not part of a saved look', async () => {
        app = boot();
        const arts = (a: Booted) => [...dress(a).querySelectorAll('.art-chip')] as HTMLButtonElement[];
        // Most wrappers have none, and show no such row.
        pick(app, 'lixi');
        expect(arts(app)).toHaveLength(0);
        expect((dress(app).querySelector('.arts') as HTMLElement).hidden).toBe(true);
        // The sample of the look is a picture: nothing in it can be pressed or is read out.
        const sample = dress(app).querySelector('.dress-sample') as HTMLElement;
        expect(sample.getAttribute('aria-hidden')).toBe('true');
        expect(sample.querySelector('button, a, input')).toBeNull();
        pick(app, 'snowbox');
        const chips = arts(app);
        expect(chips).toHaveLength(3);
        expect(chips.map(c => c.getAttribute('aria-label'))).toEqual([t('create.dress.art.own'), t('create.dress.art', { n: 1 }), t('create.dress.art', { n: 2 })]);
        expect(checked(chips)).toEqual([0]);
        const stage = app.root.querySelector('.showroom .plate');
        chips[2]!.click();
        expect(checked(arts(app))).toEqual([2]);
        // The art is other pictures: a new stage, and the page wears the colourway's ground.
        expect(app.root.querySelector('.showroom .plate')).not.toBe(stage);
        expect(token('--th-ground')).toBe('#1D0F22');
        expect(token('--th-accent')).toBe(snowbox.theme!.accent);
        // The first swatch is still "the wrapper's own", and the shared ones are as before.
        expect(swatches(app)).toHaveLength(1 + ACCENTS.length);
        swatches(app)[4]!.click();
        expect(token('--th-accent')).toBe('#0074C2');
        expect(checked(arts(app))).toEqual([2]);
        // Saved without the colourway: a saved look is for every wrapper, a colourway for one.
        saveBtn(app).click();
        expect(loadLooks()).toEqual(['1cd']);
        expect(savedLooks(app)[0]!.getAttribute('aria-pressed')).toBe('true');
        // Wearing a saved look keeps the colourway chosen.
        swatches(app)[0]!.click();
        savedLooks(app)[0]!.click();
        expect(checked(arts(app))).toEqual([2]);
        expect(checked(swatches(app))).toEqual([4]);
        await createGift(app.root, '20', 'hi');
        expect(getMade()!.link.endsWith('.snowbox.1cdab.aGk')).toBe(true);
    });

    it('a colourway that changes the wrapper\'s own accent changes the page accent and the first swatch with it', () => {
        app = boot();
        pick(app, 'fold');
        const fold = wrapperById('fold')!;
        expect(token('--th-accent')).toBe(fold.theme!.accent);
        ([...dress(app).querySelectorAll('.art-chip')] as HTMLButtonElement[])[1]!.click();
        expect(token('--th-accent')).toBe('#5E8CE2');
        expect((swatches(app)[0]!.firstElementChild as HTMLElement).style.getPropertyValue('--sw')).toBe('#5E8CE2');
        expect(checked(swatches(app))).toEqual([0]);
        // A look that names a colourway is not a saved look, whoever wrote it into storage.
        localStorage.setItem('gift.looks', JSON.stringify(['1aa', '1cd', '1cdab']));
        expect(loadLooks()).toEqual(['1cd']);
    });

    it('an undressed wrapper writes no recipe; going back to the own colour and face takes it out again', async () => {
        app = boot();
        pick(app, 'lixi');
        // A dark capsule gets the dark shade.
        swatches(app)[1]!.click();
        expect(token('--th-accent')).toBe(ACCENTS[0]![2]);
        expect(token('--th-on-accent')).toBe(ACCENTS[0]![3]);
        faceChips(app)[2]!.click();
        expect(page().dataset.face).toBe('mono');
        swatches(app)[0]!.click();
        faceChips(app)[0]!.click();
        expect(token('--th-accent')).toBe(lixi.theme!.accent);
        expect(token('--th-on-accent')).toBe(lixi.theme!.onAccent);
        expect(page().dataset.face).toBe(lixi.theme!.face);
        await createGift(app.root, '20', '');
        expect(getMade()!.link.endsWith('.lixi')).toBe(true);
        expect(getMade()!.recipe).toBeUndefined();
        expect(decodeFragment(getMade()!.link.slice(getMade()!.link.indexOf('#')))!.recipe).toBeUndefined();
    });

    it('another wrapper starts as its maker left it', () => {
        app = boot();
        pick(app, 'snowbox');
        swatches(app)[4]!.click();
        faceChips(app)[2]!.click();
        quiet(app).click();
        pick(app, 'lixi');
        expect(token('--th-accent')).toBe(lixi.theme!.accent);
        expect(page().dataset.face).toBe(lixi.theme!.face);
        expect(getSound()).toBe(lixi.sound);
        expect(checked(swatches(app))).toEqual([0]);
        expect(quiet(app).checked).toBe(false);
        // And the first one, come back to, is plain again too.
        pick(app, 'snowbox');
        expect(token('--th-accent')).toBe(snowbox.theme!.accent);
        expect(checked(faceChips(app))).toEqual([0]);
    });

    it('a shared colour that is nearly the wrapper\'s own is not offered beside it', () => {
        app = boot();
        for (const w of WRAPPERS) {
            pick(app, w.id);
            const sw = swatches(app);
            expect(sw[0]!.hidden, w.id).toBe(false);
            // Most of the list is always there.
            expect(sw.filter(b => !b.hidden).length, w.id).toBeGreaterThanOrEqual(12);
        }
        // Lixi's gold is like none of them: all fourteen are there.
        pick(app, 'lixi');
        expect(swatches(app).every(b => !b.hidden)).toBe(true);
    });

    it('the preview plays as the gift will sound, and its tune ends with it', async () => {
        const sound = await import('./sound');
        const open = vi.spyOn(sound.cue, 'open');
        const stop = vi.spyOn(sound.score, 'stop');
        app = boot();
        pick(app, 'snowbox');
        const btn = app.root.querySelector('.btn-preview') as HTMLButtonElement;
        btn.click();
        expect(open).toHaveBeenCalledTimes(1);
        stop.mockClear();
        btn.click();
        expect(stop).toHaveBeenCalled();
        btn.click();
        stop.mockClear();
        app.stop();
        app = null;
        expect(stop).toHaveBeenCalled();
    });

    it('a look is saved by a press, worn again on another wrapper, and removed; storage holds the one key', () => {
        app = boot();
        pick(app, 'snowbox');
        // The plain wrapper is not a look to save.
        expect(saveBtn(app).disabled).toBe(true);
        expect(savedLooks(app)).toHaveLength(0);
        swatches(app)[4]!.click();
        faceChips(app)[1]!.click();
        expect(localStorage.length).toBe(0);
        expect(saveBtn(app).disabled).toBe(false);
        saveBtn(app).click();
        expect(localStorage.length).toBe(1);
        expect(localStorage.getItem('gift.looks')).toBe('["1cdft"]');
        // Saved already: not twice.
        expect(saveBtn(app).disabled).toBe(true);
        expect(savedLooks(app)).toHaveLength(1);
        expect(savedLooks(app)[0]!.getAttribute('aria-label')).toBe(t('create.dress.saved', { n: 1 }));
        expect(savedLooks(app)[0]!.getAttribute('aria-pressed')).toBe('true');
        quiet(app).click();
        saveBtn(app).click();
        expect(localStorage.getItem('gift.looks')).toBe('["1cdft","1cdftsq"]');

        // On a dark wrapper the same look is its dark shade.
        pick(app, 'lixi');
        expect(token('--th-accent')).toBe(lixi.theme!.accent);
        expect(savedLooks(app)).toHaveLength(2);
        expect(savedLooks(app).map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'false']);
        savedLooks(app)[0]!.click();
        expect(token('--th-accent')).toBe(accentFor(lixi.theme!, 3)!.accent);
        expect(token('--th-accent')).toBe('#76B6F7');
        expect(page().dataset.face).toBe('tech');
        expect(checked(swatches(app))).toEqual([4]);
        expect(checked(faceChips(app))).toEqual([1]);
        expect(savedLooks(app).map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
        // On a wrapper whose own face it is, the face is not written.
        pick(app, 'mecha');
        expect(mecha.theme!.face).toBe('tech');
        savedLooks(app)[0]!.click();
        expect(token('--th-accent')).toBe('#0074C2');
        expect(saveBtn(app).disabled).toBe(false);

        // Removed by its own small button, named for a screen reader.
        const x = dress(app).querySelectorAll('.look-x');
        expect(x[1]!.getAttribute('aria-label')).toBe(t('create.dress.remove', { n: 2 }));
        (x[1] as HTMLButtonElement).click();
        expect(localStorage.getItem('gift.looks')).toBe('["1cdft"]');
        (dress(app).querySelector('.look-x') as HTMLButtonElement).click();
        expect(localStorage.length).toBe(0);
        expect(savedLooks(app)).toHaveLength(0);
    });

    it('what is stored is read without trusting it, and reading never writes', () => {
        const junk = JSON.stringify(['1cd', '1cd', 'zzz', 7, null, '1ftcd', '<b>', '1sq', '1cz']);
        localStorage.setItem('gift.looks', junk);
        // Only looks in their one spelling, once each. (`1cz` is a look: a place the list may one day fill.)
        expect(loadLooks()).toEqual(['1cd', '1sq', '1cz']);
        expect(localStorage.getItem('gift.looks')).toBe(junk);
        localStorage.setItem('gift.looks', JSON.stringify(Array.from({ length: 60 }, (_, i) => `1c${'abcdefghijklmnopqrstuvwxyz0123456789'[i % 36]}${i < 36 ? '' : 'sq'}`)));
        expect(loadLooks()).toHaveLength(24);
        for (const bad of ['{', '"1cd"', '{"a":1}', '']) {
            localStorage.setItem('gift.looks', bad);
            expect(loadLooks()).toEqual([]);
        }
        // A look the list does not have is shown as the wrapper's own and changes nothing when pressed.
        localStorage.setItem('gift.looks', '["1cz"]');
        app = boot();
        pick(app, 'snowbox');
        savedLooks(app)[0]!.click();
        expect(token('--th-accent')).toBe(snowbox.theme!.accent);
        expect(localStorage.getItem('gift.looks')).toBe('["1cz"]');
    });
});

describe('the gift opens dressed', () => {
    it('a link with a recipe wears the look, and has no tune when quiet', async () => {
        app = open({ version: 1, secret: newSecret(), wrapper: 'snowbox', recipe: '1cdftsq', wish: 'hi' });
        await flush(12);
        expect(page().dataset.wears).toBe('snowbox');
        expect(token('--th-accent')).toBe('#0074C2');
        expect(token('--th-on-accent')).toBe('#FFFFFF');
        expect(page().dataset.face).toBe('tech');
        // Everything else is the wrapper's own.
        expect(token('--th-surface')).toBe(snowbox.theme!.surface);
        expect(page().dataset.material).toBe(snowbox.theme!.material);
        expect(getSound()!.score).toBeUndefined();
        expect(getSound()!.inst).toBe(snowbox.sound!.inst);
        // The gift opens as any gift does; the screen still carries no link.
        (app.root.querySelector('.tap') as HTMLButtonElement).click();
        await flush();
        expect(main(app).textContent).toContain('88.88');
        expect(main(app).querySelector('a[href]')).toBeNull();
        app.stop();

        // Without quiet the tune is the wrapper's own, the very object.
        resetPage('en');
        app = open({ version: 1, secret: newSecret(), wrapper: 'lixi', recipe: '1ca' });
        await flush(12);
        expect(token('--th-accent')).toBe('#F3F1EC');
        expect(page().dataset.face).toBe(lixi.theme!.face);
        expect(getSound()).toBe(lixi.sound);
    });

    it('a recipe that means nothing here shows the wrapper as its maker left it, never an error', async () => {
        for (const recipe of ['1cz', '1c9', 'hello', '1', '2cd', 'A_-9', '1cdftsqx']) {
            resetPage('en');
            app = open({ version: 1, secret: newSecret(), wrapper: 'snowbox', recipe });
            await flush(12);
            expect(page().dataset.wears, recipe).toBe('snowbox');
            expect(token('--th-accent'), recipe).toBe(snowbox.theme!.accent);
            expect(page().dataset.face, recipe).toBe(snowbox.theme!.face);
            expect(getSound(), recipe).toBe(snowbox.sound);
            expect(main(app).querySelector('.slide'), recipe).not.toBeNull();
            app.stop();
            app = null;
        }
    });

    it('the default wrapper standing in for an unpaid one is never dressed; the paid one, once its stamp is read, is', async () => {
        const maker = deriveKey(new Uint8Array(16).fill(0x33));
        const offer = { sats: 50000n, payTo: maker.address };
        const p2pkh = (pkh: Uint8Array): string => '76a914' + [...pkh].map(b => b.toString(16).padStart(2, '0')).join('') + '88ac';
        setOfferForDev('mecha', offer);
        // Funded without paying for the wrapper.
        app = open({ version: 1, secret: newSecret(), wrapper: 'mecha', recipe: '1cdfmsq' });
        expect(page().dataset.wears).toBe('signal');
        expect(token('--th-accent')).toBe(signal.theme!.accent);
        await flush(12);
        expect(page().dataset.wears).toBe('signal');
        expect(token('--th-accent')).toBe(signal.theme!.accent);
        expect(token('--th-on-accent')).toBe(signal.theme!.onAccent);
        expect(page().dataset.face).toBe(signal.theme!.face);
        expect(getSound()).toBe(signal.sound);
        app.stop();

        // Paid for: the stand-in first, plain; then the wrapper the link names, in its look.
        resetPage('en');
        setOfferForDev('mecha', offer);
        const secret = newSecret();
        const pkh = deriveKey(secret).pkh;
        app = open({ version: 1, secret, wrapper: 'mecha', recipe: '1cdfmsq' }, createDemoChain(), {
            tx: { inputs: ['76a914' + '11'.repeat(20) + '88ac'], outputs: [{ sats: 0n, script: '6a' + stampOpReturnRaw('mecha', pkh) }, { sats: 8888n, script: p2pkh(pkh) }, { sats: offer.sats, script: p2pkh(maker.pkh) }] },
        });
        expect(page().dataset.wears).toBe('signal');
        expect(token('--th-accent')).toBe(signal.theme!.accent);
        await flush(12);
        expect(page().dataset.wears).toBe('mecha');
        expect(token('--th-accent')).toBe('#0074C2');
        expect(page().dataset.face).toBe('mono');
        expect(getSound()!.score).toBeUndefined();
        // Seen paid: a language change draws it dressed at once.
        (app.root.querySelector('.lang-item[data-lang="vi"]') as HTMLButtonElement).click();
        expect(page().dataset.wears).toBe('mecha');
        expect(token('--th-accent')).toBe('#0074C2');
    });

    it('the lock of a riddle gift is never dressed; the right answer leads to the dressed wrapper', async () => {
        const chain = createDemoChain();
        const link = { version: 1 as const, secret: newSecret(), wrapper: 'snowbox', recipe: '1cdftsq', riddle: 'What says meow?' };
        const key = await unlockKey(link, 'cat');
        chain.fund(key.address, 8888n);
        const url = encodeLink(link, location.origin);
        history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
        app = boot(chain);
        await flush();
        expect(app.root.querySelector('.screen-locked')).not.toBeNull();
        expect(page().dataset.wears).toBe(LOCK_WRAPPER.id);
        expect(token('--th-accent')).toBe(LOCK_WRAPPER.theme!.accent);
        expect(token('--th-on-accent')).toBe(LOCK_WRAPPER.theme!.onAccent);
        expect(page().dataset.face).toBe(LOCK_WRAPPER.theme!.face);
        expect(getSound()).toBe(LOCK_WRAPPER.sound ?? null);
        type(app.root.querySelector('#rd-answer') as HTMLInputElement, 'cat');
        (app.root.querySelector('.riddle-form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await until(() => app!.root.querySelector('.screen-locked') === null);
        await flush(12);
        expect(page().dataset.wears).toBe('snowbox');
        expect(token('--th-accent')).toBe('#0074C2');
        expect(page().dataset.face).toBe('tech');
        expect(getSound()!.score).toBeUndefined();
    }, 30000);
    it('a kept record carries the look only in its one spelling, and nothing else by that name', async () => {
        const { dressOf } = await import('./kept');
        expect(dressOf('1cdftsq')).toBe('1cdftsq');
        expect(dressOf('1sq')).toBe('1sq');
        for (const bad of ['', '1', 'cd', '1sqcd', '1cd ', '<b>', 42, null, undefined, { a: 1 }]) expect(dressOf(bad), String(bad)).toBeUndefined();
    });
});
