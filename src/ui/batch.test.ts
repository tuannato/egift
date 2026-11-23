import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../stage', async orig => {
    const real = await orig<typeof import('../stage')>();
    const { fakeMountStage } = await import('./fakestage');
    return { ...real, mountStage: fakeMountStage };
});
vi.mock('../core', async orig => {
    const real = await orig<typeof import('../core')>();
    return { ...real, newSecret: vi.fn(real.newSecret) };
});

import { FLOOR_SATS, batchFundLinks, batchTokenFundLinks, createDemoChain, decodeFragment, deriveKey, encodeLink, newSecret, riddleRoot, unlockKey } from '../core';
import { t } from '../i18n';
import { WRAPPERS, setOfferForDev } from '../wrappers';
import { getBatch, getMade } from './session';
import { chooseWrapper } from './draft';
import { loadSent, rememberSent } from './kept';
import { FUND_QR_MAX_CHARS } from './screens/createdBatch';
import { boot, buttonByText, flush, resetPage, stubClipboard, type, type Booted } from './testkit';

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

const $ = <T extends HTMLElement>(sel: string): T => app!.root.querySelector(sel) as T;
const all = <T extends HTMLElement>(sel: string): T[] => [...app!.root.querySelectorAll<T>(sel)];
async function until(fn: () => boolean, ms = 20_000): Promise<void> {
    const end = Date.now() + ms;
    while (!fn()) {
        if (Date.now() > end) throw new Error('timed out');
        await new Promise(r => setTimeout(r, 10));
    }
}
const submit = (): void => void $<HTMLFormElement>('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
/** Open the table (two rows), add rows up to `n`, and fill each. */
function people(rows: { name?: string; amount: string; answer?: string }[]): void {
    $<HTMLButtonElement>('.people-toggle').click();
    while (all('.people-row').length < rows.length) $<HTMLButtonElement>('.people-add').click();
    while (all('.people-row').length > rows.length) all<HTMLButtonElement>('.people-remove').pop()!.click();
    rows.forEach((r, i) => {
        type(all<HTMLInputElement>('.people-name')[i]!, r.name ?? '');
        type(all<HTMLInputElement>('.people-amount')[i]!, r.amount);
        if (r.answer !== undefined) type(all<HTMLInputElement>('.people-answer')[i]!, r.answer);
    });
}
function riddle(question: string, shared?: string): void {
    const box = $<HTMLInputElement>('#f-riddle');
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    type($<HTMLInputElement>('#f-riddle-q'), question);
    if (shared !== undefined) {
        type($<HTMLInputElement>('#f-riddle-a'), shared);
        type($<HTMLInputElement>('#f-riddle-a2'), shared);
    }
}
/** The read-back, then the two presses that stand for a held press where nothing moves. */
async function confirmBatch(): Promise<void> {
    submit();
    const hold = buttonByText(app!.root, t('create.confirm.hold'));
    // Answers that are a row's own: the press waits for "I have written them down".
    const wrote = app!.root.querySelector<HTMLInputElement>('#f-wrote');
    if (wrote) {
        expect(hold.disabled).toBe(true);
        wrote.checked = true;
        wrote.dispatchEvent(new Event('change', { bubbles: true }));
    }
    hold.click();
    hold.click();
    await until(() => getBatch() !== null);
    await flush();
}
const feeOff = (): void => {
    const box = $<HTMLInputElement>('#f-fee');
    if (box.checked) {
        box.checked = false;
        box.dispatchEvent(new Event('change', { bubbles: true }));
    }
};

describe('several people on the create step', () => {
    it('closed, the step is as it was; opened, the rows are the gifts and nothing is made before the press', async () => {
        app = boot();
        await flush();
        expect($('.people-body').hidden).toBe(true);
        expect($('#f-amount').closest<HTMLElement>('.field')!.hidden).toBe(false);
        type($<HTMLInputElement>('#f-amount'), '50');
        $<HTMLButtonElement>('.people-toggle').click();
        // Two rows, each starting from the amount already typed; the big figure steps aside.
        expect(all<HTMLInputElement>('.people-amount').map(i => i.value)).toEqual(['50', '50']);
        expect($('#f-amount').closest<HTMLElement>('.field')!.hidden).toBe(true);
        // Several gifts may each carry a token: the giver can say so, as for one.
        expect($('#f-withtoken').closest<HTMLElement>('label')!.hidden).toBe(false);
        // A row under the floor: said, and nothing can be made.
        type(all<HTMLInputElement>('.people-amount')[1]!, '1');
        expect($<HTMLButtonElement>('button[type=submit]').disabled).toBe(true);
        expect(app.root.textContent).toContain(t('people.need.amounts', { min: '10' }));
        type(all<HTMLInputElement>('.people-amount')[1]!, '60');
        expect($<HTMLButtonElement>('button[type=submit]').disabled).toBe(false);
        // Nine at most.
        for (let i = 0; i < 12; i++) $<HTMLButtonElement>('.people-add').click();
        expect(all('.people-row').length).toBe(9);
        expect($<HTMLButtonElement>('.people-add').disabled).toBe(true);
        expect(newSecret).not.toHaveBeenCalled();
        expect(getBatch()).toBeNull();
    });

    it('several gifts are read back, then made by one press: a key and a link each, the fee added to each', async () => {
        app = boot();
        await flush();
        people([{ name: 'Anh Hai', amount: '200' }, { name: '', amount: '300' }, { name: 'Na', amount: '88.5' }]);
        type($<HTMLTextAreaElement>('#f-wish'), 'Happy new year');
        // The giver pays the recipients' fee: it is added to every gift.
        const feeBox = $<HTMLInputElement>('#f-fee');
        feeBox.checked = true;
        feeBox.dispatchEvent(new Event('change', { bubbles: true }));
        submit();
        // Read back first: every name and amount, and no key yet.
        expect(newSecret).not.toHaveBeenCalled();
        const body = $('.confirm-step').textContent!;
        for (const s of ['Anh Hai', t('people.nth', { n: 2 }), 'Na']) expect(body).toContain(s);
        // A change after the read-back is not what was confirmed: back to the form.
        type(all<HTMLInputElement>('.people-amount')[1]!, '301');
        const hold = buttonByText(app.root, t('create.confirm.hold'));
        hold.click();
        hold.click();
        await flush();
        expect(getBatch()).toBeNull();
        expect(newSecret).not.toHaveBeenCalled();
        type(all<HTMLInputElement>('.people-amount')[1]!, '300');
        await confirmBatch();
        const b = getBatch()!;
        expect(getMade()).toBeNull();
        expect(b.kind).toBe('links');
        expect(newSecret).toHaveBeenCalledTimes(3);
        expect(b.gifts.map(g => g.name)).toEqual(['Anh Hai', '', 'Na']);
        const fee = b.feeCovered!;
        expect(fee > 0n).toBe(true);
        expect(b.gifts.map(g => g.sats)).toEqual([20_000n + fee, 30_000n + fee, 8_850n + fee]);
        expect(new Set(b.gifts.map(g => g.key.address)).size).toBe(3);
        for (const g of b.gifts) {
            const link = decodeFragment(g.link!.slice(g.link!.indexOf('#')))!;
            expect(deriveKey(link.secret).address).toBe(g.key.address);
            expect(link.wish).toBe('Happy new year');
        }
        // The names are the giver's own: none is in any link.
        expect(b.gifts.some(g => g.link!.includes('Hai'))).toBe(false);
        expect(app.root.textContent).toContain(t('batch.title', { n: 3 }));
        // The form is empty again for the next batch.
        expect(app.root.querySelector('.people-row')).toBeNull();
    });

    it('a table of one row is one gift with a name', async () => {
        app = boot();
        await flush();
        people([{ name: 'Mẹ', amount: '100' }]);
        // One gift has one answer, typed twice below: a row's own answer is for telling several apart.
        const lockBox = $<HTMLInputElement>('#f-riddle');
        lockBox.checked = true;
        lockBox.dispatchEvent(new Event('change', { bubbles: true }));
        expect(all<HTMLInputElement>('.people-answer')[0]!.hidden).toBe(true);
        lockBox.checked = false;
        lockBox.dispatchEvent(new Event('change', { bubbles: true }));
        submit();
        await until(() => getMade() !== null);
        expect(getBatch()).toBeNull();
        expect(getMade()!.name).toBe('Mẹ');
        expect(getMade()!.link).not.toContain('M%E1');
    });

    it('a riddle: a row without an answer of its own takes the shared one', async () => {
        app = boot();
        await flush();
        people([{ name: 'A', amount: '20' }, { name: 'B', amount: '20', answer: 'blue door' }]);
        riddle('Where did we meet?');
        // No shared answer and a row without its own: not enough.
        expect($<HTMLButtonElement>('button[type=submit]').disabled).toBe(true);
        riddle('Where did we meet?', 'Hanoi');
        expect($<HTMLButtonElement>('button[type=submit]').disabled).toBe(false);
        submit();
        // The answer that is a row's own is read back; the page will not keep it.
        expect($('.confirm-step').textContent).toContain(t('people.confirm.answer', { answer: 'blue door' }));
        expect($('.confirm-step').textContent).toContain(t('people.confirm.answers'));
        await confirmBatch();
        const b = getBatch()!;
        expect(b.kind).toBe('links');
        const links = b.gifts.map(g => decodeFragment(g.link!.slice(g.link!.indexOf('#')))!);
        expect((await unlockKey(links[0]!, 'hanoi')).address).toBe(b.gifts[0]!.key.address);
        expect((await unlockKey(links[1]!, 'Blue Door')).address).toBe(b.gifts[1]!.key.address);
        expect((await unlockKey(links[1]!, 'hanoi')).address).not.toBe(b.gifts[1]!.key.address);
        // No answer is anywhere in what the page holds.
        expect(JSON.stringify(b, (_k, v) => (typeof v === 'bigint' ? String(v) : v))).not.toMatch(/blue door|hanoi/i);
    });

    it('what was read back is what is made: the lock switched after the read-back goes back to the form', async () => {
        app = boot();
        await flush();
        people([{ name: 'A', amount: '20' }, { name: 'B', amount: '20' }]);
        submit();
        // The lock comes on under the read-back: that is not what was confirmed.
        riddle('Q?', 'shared one');
        const hold = buttonByText(app.root, t('create.confirm.hold'));
        hold.click();
        hold.click();
        await flush();
        expect(getBatch()).toBeNull();
        expect(newSecret).not.toHaveBeenCalled();
        // Read back again with the lock: the rows say which answer opens them.
        submit();
        expect($('.confirm-step').textContent).toContain(t('people.confirm.shared'));
        expect(app.root.querySelector('#f-wrote')).toBeNull();
    });

    it('all the gifts together are held to the cap of one', async () => {
        app = boot();
        await flush();
        people([{ amount: '20000000000000' }, { amount: '20000000000000' }]);
        expect($<HTMLButtonElement>('button[type=submit]').disabled).toBe(true);
        type(all<HTMLInputElement>('.people-amount')[1]!, '20');
        expect($<HTMLButtonElement>('button[type=submit]').disabled).toBe(false);
    });

    it('one link for all: each answer opens a gift; rows that share an answer are several gifts behind it', async () => {
        app = boot();
        await flush();
        people([{ name: 'A', amount: '20', answer: 'red kite' }, { name: 'B', amount: '30', answer: 'red kite' }, { name: 'C', amount: '40', answer: '' }]);
        // Without a riddle there is no such thing.
        expect($('#f-onelink').closest<HTMLElement>('label')!.hidden).toBe(true);
        riddle('Your word?');
        const one = $<HTMLInputElement>('#f-onelink');
        expect(one.closest<HTMLElement>('label')!.hidden).toBe(false);
        one.checked = true;
        one.dispatchEvent(new Event('change', { bubbles: true }));
        // What it costs is in view at once, not behind a press.
        expect($('.people-one-warn').hidden).toBe(false);
        expect($('.people-one-warn').closest('details')).toBeNull();
        // The shared answer has no part here; a row with no answer stops the gift.
        expect($('#f-riddle-a').parentElement!.hidden).toBe(true);
        expect($<HTMLButtonElement>('button[type=submit]').disabled).toBe(true);
        // Two rows with one answer: allowed, and what it means is said in view at once.
        expect($('.people-same-warn').hidden).toBe(false);
        expect($('.people-same-warn').closest('details')).toBeNull();
        type(all<HTMLInputElement>('.people-answer')[2]!, 'green hill');
        expect($<HTMLButtonElement>('button[type=submit]').disabled).toBe(false);
        // Accents and capitals do not tell answers apart.
        type(all<HTMLInputElement>('.people-answer')[1]!, ' RED  Kíte ');
        expect($('.people-same-warn').hidden).toBe(false);
        feeOff();
        await confirmBatch();
        const b = getBatch()!;
        expect(b.kind).toBe('answers');
        // One secret for all, one link, and no link of its own for any gift.
        expect(newSecret).toHaveBeenCalledTimes(1);
        expect(b.gifts.every(g => g.link === undefined)).toBe(true);
        const link = decodeFragment(b.link!.slice(b.link!.indexOf('#')))!;
        expect(link.riddle).toBe('Your word?');
        // The link names no address: there are several.
        expect(link.spot).toBeUndefined();
        // And says that it is shared, so the page can tell whoever opens it.
        expect(link.many).toBe(true);
        // Unless the giver hid it, the link names where each gift is: a page can then say how many are left.
        expect(link.spots!.map(x => [...x])).toEqual(b.gifts.map(g => [...g.key.pkh]));
        // The first row of an answer is what the answer alone gives; the next row with it is its second slot.
        expect((await unlockKey(link, 'red kite')).address).toBe(b.gifts[0]!.key.address);
        expect(deriveKey(await riddleRoot(link.secret, 'Red Kite'), 1).address).toBe(b.gifts[1]!.key.address);
        expect((await unlockKey(link, 'Green Hill')).address).toBe(b.gifts[2]!.key.address);
        expect(new Set(b.gifts.map(g => g.key.address)).size).toBe(3);
        expect(b.gifts.map(g => g.sats)).toEqual([2_000n, 3_000n, 4_000n]);
        // A wrong answer is a key to an address that holds nothing.
        expect(b.gifts.map(g => g.key.address)).not.toContain((await unlockKey(link, 'red kit')).address);
        expect(app.root.textContent).toContain(t('batch.title.one', { n: 3 }));
        expect(app.root.textContent).toContain(t('batch.riddle.one'));
    });
});

describe('opening one link shared by several', () => {
    it('says the link is shared before anything is typed, and what a wrong answer or a part already taken means', async () => {
        const chain = createDemoChain();
        const secret = newSecret();
        const link = { version: 1 as const, secret, wrapper: 'signal', riddle: 'Your word?', many: true as const };
        const mine = await unlockKey(link, 'red kite');
        const gone = await unlockKey(link, 'blue sea');
        // "red kite" has two gifts behind it: the first was taken, the second is still there.
        const second = deriveKey(await riddleRoot(secret, 'red kite'), 1);
        chain.fund(mine.address, 5_000n);
        chain.steal(mine.address);
        chain.fund(second.address, 7_000n);
        // Another part, funded and already taken home.
        chain.fund(gone.address, 5_000n);
        chain.steal(gone.address);
        const url = encodeLink(link, location.origin);
        history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
        app = boot(chain);
        await flush(12);
        expect(app.root.textContent).toContain(t('pkg.riddle.lead.many'));
        expect(app.root.textContent).not.toContain(t('pkg.riddle.lead'));
        const answer = $<HTMLInputElement>('#rd-answer');
        // A wrong answer costs two questions to the network, not nine.
        let asked = 0;
        const read0 = chain.read.bind(chain);
        chain.read = async (a: string) => (asked++, read0(a));
        type(answer, 'green hill');
        buttonByText(app.root, t('pkg.riddle.submit')).click();
        await until(() => app!.root.textContent!.includes(t('pkg.riddle.wrong')));
        expect(asked).toBe(2);
        expect(app.root.textContent).toContain(t('pkg.riddle.wrong.many'));
        // The answer of a part that someone already took home.
        type($<HTMLInputElement>('#rd-answer'), 'Blue Sea');
        buttonByText(app.root, t('pkg.riddle.submit')).click();
        await until(() => app!.root.textContent!.includes(t('pkg.riddle.taken.many')));
        // The right answer opens the gift of that answer that is still there: here the second.
        const reads: string[] = [];
        const read = chain.read.bind(chain);
        chain.read = async (a: string) => (reads.push(a), read(a));
        type($<HTMLInputElement>('#rd-answer'), 'red kite');
        buttonByText(app.root, t('pkg.riddle.submit')).click();
        await until(() => app!.root.querySelector('#rd-answer') === null);
        expect(reads.slice(0, 2)).toEqual([mine.address, second.address]);

        // The same link opened again in this tab asks again: the answer was one person's, not the link's.
        app.stop();
        app = boot(chain);
        await flush(12);
        expect(app.root.querySelector('#rd-answer')).not.toBeNull();
    });
});

describe('several gifts behind one answer', () => {
    const open = async (chain: ReturnType<typeof createDemoChain>, secret: Uint8Array, answer: string): Promise<string[]> => {
        const url = encodeLink({ version: 1, secret, wrapper: 'signal', riddle: 'Your word?', many: true }, location.origin);
        history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
        app = boot(chain);
        await flush(12);
        const reads: string[] = [];
        const read = chain.read.bind(chain);
        chain.read = async (a: string) => (reads.push(a), read(a));
        type($<HTMLInputElement>('#rd-answer'), answer);
        buttonByText(app.root, t('pkg.riddle.submit')).click();
        return reads;
    };
    const slotsOf = async (secret: Uint8Array, answer: string, n: number) => {
        const root = await riddleRoot(secret, answer);
        return Array.from({ length: n }, (_, i) => deriveKey(root, i));
    };

    it('a gift whose first slot was left out is still found', async () => {
        const chain = createDemoChain();
        const secret = newSecret();
        const s = await slotsOf(secret, 'kite', 3);
        chain.fund(s[1]!.address, 6_000n);
        const reads = await open(chain, secret, 'kite');
        await until(() => app!.root.querySelector('#rd-answer') === null);
        expect(reads.slice(0, 2)).toEqual([s[0]!.address, s[1]!.address]);
    });

    it('crumbs in a slot do not block the gifts after it; a gap is passed over; the last of nine is reached', async () => {
        const chain = createDemoChain();
        const secret = newSecret();
        const s = await slotsOf(secret, 'kite', 9);
        // Less than the least gift in the first slot, then taken, never funded, taken... and a gift in the ninth.
        chain.fund(s[0]!.address, 600n);
        for (const i of [1, 3, 4, 5, 6, 7]) {
            chain.fund(s[i]!.address, 5_000n);
            chain.steal(s[i]!.address);
        }
        chain.fund(s[8]!.address, 9_000n);
        const reads = await open(chain, secret, 'kite');
        await until(() => app!.root.querySelector('#rd-answer') === null);
        expect(reads.slice(0, 9)).toEqual(s.map(k => k.address));
    });

    it('all taken: said of the answer; the screen of a gift lost to someone quicker offers to answer again', async () => {
        const chain = createDemoChain();
        const secret = newSecret();
        const s = await slotsOf(secret, 'kite', 2);
        for (const k of s) {
            chain.fund(k.address, 5_000n);
            chain.steal(k.address);
        }
        await open(chain, secret, 'kite');
        await until(() => app!.root.textContent!.includes(t('pkg.riddle.taken.many')));
        expect(app!.root.querySelector('#rd-answer')).not.toBeNull();
    });
});

describe('copying', () => {
    it('is done at once inside the press where the browser can; otherwise its clipboard is asked, and never waited on for ever', async () => {
        const { copyText } = await import('./linkBox');
        // A clipboard that neither succeeds nor fails (a phone, after a download took the page out of focus).
        const hang = vi.fn(() => new Promise<void>(() => {}));
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: hang } });
        const exec = vi.fn(() => true);
        (document as unknown as { execCommand: unknown }).execCommand = exec;
        const button = document.createElement('button');
        document.body.append(button);
        button.focus();
        // The older way works: done before anything is awaited, the clipboard is not asked, the focus is back.
        expect(await copyText('the link')).toBe(true);
        expect(exec).toHaveBeenCalledWith('copy');
        expect(hang).not.toHaveBeenCalled();
        expect(document.querySelector('.copy-field')).toBeNull();
        expect(document.activeElement).toBe(button);
        // It refuses, and the clipboard hangs: said to have failed after a moment, not never.
        exec.mockReturnValue(false);
        vi.useFakeTimers();
        const q = copyText('the link');
        await vi.advanceTimersByTimeAsync(1600);
        expect(await q).toBe(false);
        vi.useRealTimers();
        // It throws: nothing is left on the page.
        exec.mockImplementation(() => {
            throw new Error('no');
        });
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } });
        expect(await copyText('the link')).toBe(true);
        expect(document.querySelector('.copy-field')).toBeNull();
        delete (document as unknown as { execCommand?: unknown }).execCommand;
        button.remove();
    });
});

describe('a shared link that names its gifts', () => {
    it('says how many are still there before any answer, and asks the network nothing for an answer that is none of them', async () => {
        const chain = createDemoChain();
        const secret = newSecret();
        const root = await riddleRoot(secret, 'kite');
        const s = [deriveKey(root, 0), deriveKey(root, 1), deriveKey(await riddleRoot(secret, 'hill'), 0)];
        for (const k of s) chain.fund(k.address, 5_000n);
        chain.steal(s[0]!.address);
        const url = encodeLink({ version: 1, secret, wrapper: 'signal', riddle: 'Your word?', many: true, spots: s.map(k => k.pkh) }, location.origin);
        history.replaceState(null, '', '/' + url.slice(url.indexOf('#')));
        app = boot(chain);
        await until(() => app!.root.textContent!.includes(t('pkg.many.left', { k: 2, n: 3 })));
        let asked = 0;
        const read = chain.read.bind(chain);
        chain.read = async (a: string) => (asked++, read(a));
        type($<HTMLInputElement>('#rd-answer'), 'wrong one');
        buttonByText(app.root, t('pkg.riddle.submit')).click();
        await until(() => app!.root.textContent!.includes(t('pkg.riddle.wrong')));
        // The answer cost nothing: a key that is none of the link's gifts is not asked about, and the count is not read again.
        await flush(12);
        expect(asked).toBe(0);
        // The right answer goes straight to the gift of it that is left.
        type($<HTMLInputElement>('#rd-answer'), 'kite');
        buttonByText(app.root, t('pkg.riddle.submit')).click();
        await until(() => app!.root.querySelector('#rd-answer') === null);
    });
});

describe('gifts made together on the sent page', () => {
    it('stand as one card that says how many are still there, with a line for each; the others stay one by one', async () => {
        const chain = createDemoChain();
        const at = Date.now() - 60_000;
        const keys = [1, 2, 3].map(i => deriveKey(new Uint8Array(16).fill(i)));
        keys.forEach((k, i) => expect(rememberSent({ address: k.address, at: at + i, wrapper: 'lixi', sats: '2000', part: `${i + 1}/3`, ...(i === 0 ? { name: 'Anh Hai' } : {}) })).toBe(true));
        const alone = deriveKey(new Uint8Array(16).fill(9));
        expect(rememberSent({ address: alone.address, at: at - 5_000, wrapper: 'lixi', sats: '3000' })).toBe(true);
        for (const k of keys) chain.fund(k.address, 2_000n);
        chain.steal(keys[1]!.address);
        app = boot(chain, { stay: true });
        await flush();
        buttonByText(app.root, t('sent.nav')).click();
        const groups = all('.sent-group');
        expect(groups.length).toBe(1);
        expect(all('.sent-row').length).toBe(3);
        expect(all('.kept-card').length).toBe(2);
        expect(groups[0]!.textContent).toContain(t('sent.group.title', { n: 3 }));
        expect(groups[0]!.textContent).toContain('Anh Hai');
        await until(() => groups[0]!.textContent!.includes(t('sent.group.left', { k: 2, n: 3 })));
        expect(all('.sent-row').map(r => r.dataset.state)).toEqual(['there', 'taken', 'there']);
        // Taken out of the list together, after one question.
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        buttonByText(groups[0]!, t('sent.group.forget')).click();
        expect(loadSent().map(x => x.address)).toEqual([alone.address]);
    });
});

describe('several gifts on the created step', () => {
    async function made(rows: { name?: string; amount: string }[]): Promise<void> {
        app = boot();
        await flush();
        people(rows);
        feeOff();
        await confirmBatch();
    }

    it('funding is locked until the whole list is saved in one piece; a copy of one row does not count', async () => {
        const clip = stubClipboard();
        await made([{ name: 'A', amount: '20' }, { name: 'B', amount: '30' }]);
        const b = getBatch()!;
        const web = buttonByText(app!.root, t('created.fund.web'));
        expect(web.disabled).toBe(true);
        // A row's link can be shown as a QR; none is drawn until asked for.
        expect(app!.root.querySelector('.batch-row .qr-svg')).toBeNull();
        buttonByText(all<HTMLDetailsElement>('.batch-row')[1]!, t('link.qr.show')).click();
        expect(all<HTMLDetailsElement>('.batch-row')[1]!.querySelector('.qr-svg')).not.toBeNull();
        expect(all<HTMLDetailsElement>('.batch-row')[0]!.querySelector('.qr-svg')).toBeNull();
        // One row's own copy: that link went to the clipboard, the batch is not saved.
        const row = all<HTMLDetailsElement>('.batch-row')[0]!;
        buttonByText(row, t('link.copy')).click();
        await flush();
        expect(clip.written).toEqual([b.gifts[0]!.link]);
        expect(web.disabled).toBe(true);
        expect(b.saved).toBe(false);
        // The whole list in one copy: every link, with its name and amount.
        buttonByText(app!.root, t('batch.save.copy')).click();
        await flush();
        expect(clip.written[1]).toContain(b.gifts[0]!.link!);
        expect(clip.written[1]).toContain(b.gifts[1]!.link!);
        expect(clip.written[1]).toContain('A');
        expect(web.disabled).toBe(false);
        expect(b.saved).toBe(true);
        // The warning about what a link is stands in view, not in a fold.
        const warn = [...app!.root.querySelectorAll('.warning')].find(w => w.textContent === t('batch.save.warn', { n: 2 }))!;
        expect(warn.closest('details')).toBeNull();
    });

    it('skipping the save is a choice said in full first, for this batch only', async () => {
        await made([{ amount: '20' }, { amount: '30' }]);
        const web = buttonByText(app!.root, t('created.fund.web'));
        buttonByText(app!.root, t('batch.skip')).click();
        expect(web.disabled).toBe(true);
        expect(app!.root.textContent).toContain(t('batch.skip.warn'));
        buttonByText(app!.root, t('batch.skip.yes')).click();
        expect(web.disabled).toBe(false);
        expect(Object.keys(localStorage)).toEqual([]);
    });

    it('one request funds all; a second press asks first; funded gifts are counted, recorded by name, and the request is put away', async () => {
        stubClipboard();
        const opened: string[] = [];
        vi.spyOn(window, 'open').mockImplementation(((u: string) => void opened.push(u)) as unknown as typeof window.open);
        await made([{ name: 'Anh Hai', amount: '20' }, { name: '', amount: '30' }, { name: 'Na', amount: '40' }]);
        const b = getBatch()!;
        buttonByText(app!.root, t('batch.save.copy')).click();
        await flush();
        const want = batchFundLinks({ gifts: b.gifts.map(g => ({ address: g.key.address, sats: g.sats })) });
        const web = buttonByText(app!.root, t('created.fund.web'));
        web.click();
        expect(opened).toEqual([want.web]);
        // No marker and no price for a free wrapper.
        expect(want.bip21).not.toContain('op_return_raw');
        // Again: asked first, opened only on the second press.
        web.click();
        expect(opened.length).toBe(1);
        expect(app!.root.textContent).toContain(t('batch.fund.again'));
        web.click();
        expect(opened.length).toBe(2);
        // Two of three arrive (a wallet that left one out).
        app!.chain.fund(b.gifts[0]!.key.address, b.gifts[0]!.sats);
        app!.chain.fund(b.gifts[2]!.key.address, b.gifts[2]!.sats);
        await until(() => app!.root.textContent!.includes(t('batch.status.some', { k: 2, n: 3 })));
        expect(web.disabled).toBe(true);
        expect(all('.batch-row').map(r => r.dataset.state)).toEqual(['funded', 'waiting', 'funded']);
        // Once anything is funded the whole request is not sent again, even by a press that slips through.
        web.disabled = false;
        web.click();
        expect(opened.length).toBe(2);
        // Only the one left out is asked for, by its own request: offered after one more full look, not at first sight.
        await until(() => !$('.batch-topup').hidden, 8000);
        expect(app!.root.textContent).toContain(t('batch.topup.body', { n: 1 }));
        const top = $('.batch-topup');
        const topWeb = buttonByText(top, t('created.fund.web'));
        topWeb.click();
        expect(opened[2]).toContain(b.gifts[1]!.key.address);
        expect(opened[2]).not.toContain(b.gifts[0]!.key.address);
        // The same care as the main request: a second press asks first.
        topWeb.click();
        expect(opened.length).toBe(3);
        expect(top.textContent).toContain(t('batch.fund.again'));
        app!.chain.fund(b.gifts[1]!.key.address, b.gifts[1]!.sats);
        await until(() => app!.root.textContent!.includes(t('batch.status.all', { n: 3 })));
        expect($('.batch-topup').hidden).toBe(true);
        // The giver's record: where each gift is, its name and its place. Never a link.
        const sent = loadSent();
        expect(sent.length).toBe(3);
        expect(sent.map(s => s.part).sort()).toEqual(['1/3', '2/3', '3/3']);
        expect(sent.find(s => s.part === '1/3')!.name).toBe('Anh Hai');
        expect(sent.find(s => s.part === '2/3')!.name).toBeUndefined();
        // Every row opens, and says what is left to do.
        expect(app!.root.textContent).toContain(t('batch.next.links'));
        const stored = JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
        for (const g of b.gifts) expect(stored).not.toContain(g.link!.slice(g.link!.indexOf('#') + 5, g.link!.indexOf('#') + 20));
        expect(Object.keys(localStorage).sort()).toEqual(['gift.sent']);
    });

    it('a paid wrapper is paid for once, inside the one request', async () => {
        stubClipboard();
        const opened: string[] = [];
        vi.spyOn(window, 'open').mockImplementation(((u: string) => void opened.push(u)) as unknown as typeof window.open);
        const maker = deriveKey(new Uint8Array(16).fill(9));
        const offer = { sats: 50_000n, payTo: maker.address };
        // Not the default wrapper: that one is free whatever the table says.
        setOfferForDev('mecha', offer);
        chooseWrapper('mecha');
        await made([{ amount: '20' }, { amount: '30' }]);
        const b = getBatch()!;
        expect(b.wrapper).toBe('mecha');
        // The total says the wrapper once.
        expect(app!.root.textContent).toContain(t('batch.total.price', { gifts: '50', price: '500' }));
        buttonByText(app!.root, t('batch.save.copy')).click();
        await flush();
        buttonByText(app!.root, t('created.fund.web')).click();
        const want = batchFundLinks({ gifts: b.gifts.map(g => ({ address: g.key.address, sats: g.sats })), paid: { wrapper: 'mecha', offer } });
        expect(opened).toEqual([want.web]);
        expect(want.bip21.match(/op_return_raw=/g)!.length).toBe(1);
        expect(want.bip21.match(new RegExp(maker.address, 'g'))!.length).toBe(1);
    });

    it('a payment that is still arriving is not taken for gifts left out', async () => {
        stubClipboard();
        await made([{ amount: '20' }, { amount: '30' }, { amount: '40' }]);
        const b = getBatch()!;
        // The three arrive one after another while the page is reading them.
        for (const g of b.gifts) {
            app!.chain.fund(g.key.address, g.sats);
            await flush(1);
        }
        await until(() => app!.root.textContent!.includes(t('batch.status.all', { n: 3 })));
        expect($('.batch-topup').hidden).toBe(true);
        expect(app!.root.textContent).toContain(t('batch.next.links'));
    });

    it('a QR that was shown counts as a wallet opened: the button then asks first', async () => {
        stubClipboard();
        const opened: string[] = [];
        vi.spyOn(window, 'open').mockImplementation(((u: string) => void opened.push(u)) as unknown as typeof window.open);
        await made([{ amount: '20' }, { amount: '30' }]);
        buttonByText(app!.root, t('batch.save.copy')).click();
        await flush();
        buttonByText(app!.root, t('created.fund.qr')).click();
        expect(app!.root.querySelector('.qr-svg')).not.toBeNull();
        const web = buttonByText(app!.root, t('created.fund.web'));
        web.click();
        expect(opened).toEqual([]);
        expect(app!.root.textContent).toContain(t('batch.fund.again'));
        web.click();
        expect(opened.length).toBe(1);
    });

    it('one token for all the gifts: its own request, after the links are saved, asked about before it is sent twice', async () => {
        stubClipboard();
        const opened: string[] = [];
        vi.spyOn(window, 'open').mockImplementation(((u: string) => void opened.push(u)) as unknown as typeof window.open);
        const ID = 'ab'.repeat(32);
        await made([{ amount: '20' }, { amount: '30' }, { amount: '40' }]);
        const b = getBatch()!;
        app!.chain.describe(ID, { name: 'Coupon', ticker: 'CPN', decimals: 2 });
        const step = app!.root.querySelector('#f-btok-id')!.closest('details')!;
        // Folded until asked for (the giver did not say the gifts would carry a token); no warning sits inside it.
        expect(step.open).toBe(false);
        expect(step.querySelector('.warning')).toBeNull();
        const web = buttonByText(step, t('batch.tok.open', { n: 3 }));
        type($<HTMLInputElement>('#f-btok-id'), ID);
        type($<HTMLInputElement>('#f-btok-qty'), '5.25');
        await until(() => step.textContent!.includes('CPN'));
        // Not before the links are saved, and not before the gifts have their XEC.
        expect(web.disabled).toBe(true);
        buttonByText(app!.root, t('batch.save.copy')).click();
        await flush();
        expect(web.disabled).toBe(true);
        for (const g of b.gifts) app!.chain.fund(g.key.address, g.sats);
        await until(() => !web.disabled);
        // More decimals than the token has: no request.
        type($<HTMLInputElement>('#f-btok-qty'), '5.255');
        expect(web.disabled).toBe(true);
        type($<HTMLInputElement>('#f-btok-qty'), '5.25');
        web.click();
        expect(opened).toEqual([batchTokenFundLinks({ gifts: b.gifts.map(g => ({ address: g.key.address, qty: '5.25' })), tokenId: ID }).web]);
        web.click();
        expect(opened.length).toBe(1);
        expect(step.textContent).toContain(t('batch.fund.again'));
        web.click();
        expect(opened.length).toBe(2);
        // Typing and deleting a character does not forget that this very request was opened; the app road asks too.
        type($<HTMLInputElement>('#f-btok-qty'), '5.2');
        type($<HTMLInputElement>('#f-btok-qty'), '5.25');
        buttonByText(step, t('created.fund.app')).click();
        expect(opened.length).toBe(2);
        // Another quantity is another request: opened without a question.
        type($<HTMLInputElement>('#f-btok-qty'), '6');
        web.click();
        expect(opened.length).toBe(3);
        // A gift that holds a token says so in its row.
        app!.chain.fund(b.gifts[0]!.key.address, 546n, { token: true });
        await until(() => all('.batch-row')[0]!.textContent!.includes(t('batch.row.token')));
        expect(all('.batch-row')[1]!.textContent).not.toContain(t('batch.row.token'));
    });

    it('several gifts that will carry a token: the giver may cover the higher fee, and the token step stands open', async () => {
        app = boot();
        await flush();
        people([{ amount: '20' }, { amount: '30' }]);
        const tok = $<HTMLInputElement>('#f-withtoken');
        expect(tok.closest<HTMLElement>('label')!.hidden).toBe(false);
        tok.checked = true;
        tok.dispatchEvent(new Event('change', { bubbles: true }));
        const fee = $<HTMLInputElement>('#f-fee');
        fee.checked = true;
        fee.dispatchEvent(new Event('change', { bubbles: true }));
        await confirmBatch();
        const b = getBatch()!;
        expect(b.withToken).toBe(true);
        // The fee of taking a token home, added to each gift.
        expect(b.feeCovered).toBe(428n);
        expect(b.gifts.map(g => g.sats)).toEqual([2_428n, 3_428n]);
        expect(app.root.querySelector('#f-btok-id')!.closest('details')!.open).toBe(true);
    });

    it('a request too long to scan is not offered as a QR', async () => {
        await made(Array.from({ length: 9 }, () => ({ amount: '20' })));
        const b = getBatch()!;
        expect(batchFundLinks({ gifts: b.gifts.map(g => ({ address: g.key.address, sats: g.sats })) }).bip21.length).toBeGreaterThan(FUND_QR_MAX_CHARS);
        expect([...app!.root.querySelectorAll('button')].some(x => x.textContent === t('created.fund.qr'))).toBe(false);
        expect(FLOOR_SATS).toBe(1000n);
    });
});
