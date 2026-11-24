import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { takeFeeEstimate } from '../core';
import { t } from '../i18n';
import { draft } from './draft';
import { getMade } from './session';
import { boot, buttonByText, createGift, flush, resetPage, type, type Booted } from './testkit';

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

const $ = <T extends HTMLElement>(sel: string): T => app!.root.querySelector(sel) as T;
const all = <T extends HTMLElement>(sel: string): T[] => [...app!.root.querySelectorAll<T>(sel)];
const btn = (id: string): HTMLButtonElement => $<HTMLButtonElement>(`.opt-btn[data-opt="${id}"]`);
const panel = (id: string): HTMLElement => $(`.opt-panel[data-opt="${id}"]`);
const cancel = (id: string): void => (panel(id).querySelector('.opt-cancel') as HTMLButtonElement).click();
async function toCreate(): Promise<void> {
    app = boot();
    await flush();
    type($<HTMLInputElement>('#f-amount'), '50');
    type($<HTMLTextAreaElement>('#f-wish'), 'For you');
}

describe('the three options on the create step', () => {
    it('are three buttons, each closed; a press opens its panel in the button\'s place, and the others stay below', async () => {
        await toCreate();
        for (const id of ['people', 'token', 'riddle']) {
            expect(btn(id).hidden).toBe(false);
            expect(panel(id).hidden).toBe(true);
        }
        // The boxes that hold the choices are out of sight and out of reach of a keyboard.
        expect($<HTMLInputElement>('#f-riddle').hidden).toBe(true);
        expect($<HTMLInputElement>('#f-withtoken').hidden).toBe(true);
        btn('riddle').click();
        expect(panel('riddle').hidden).toBe(false);
        expect(btn('riddle').hidden).toBe(true);
        expect(draft.riddleOn).toBe(true);
        // The panels come before the buttons that are left.
        const order = [...$('.opts').children];
        expect(order.indexOf(panel('riddle'))).toBeLessThan(order.indexOf($('.opt-btns')));
        btn('people').click();
        btn('token').click();
        expect($('.opt-btns').hidden).toBe(true);
        // Nothing here has made a key.
        expect(getMade()).toBeNull();
    });

    it('cancelling the riddle empties the question, both answers and the rows\' own answers, and leaves the amount and the note', async () => {
        await toCreate();
        btn('people').click();
        btn('riddle').click();
        type($<HTMLInputElement>('#f-riddle-q'), 'Our cat?');
        type($<HTMLInputElement>('#f-riddle-a'), 'miu');
        type($<HTMLInputElement>('#f-riddle-a2'), 'miu');
        type(all<HTMLInputElement>('.people-answer')[1]!, 'own');
        ($<HTMLInputElement>('#f-onelink')).click();
        expect(draft.oneLink).toBe(true);
        cancel('riddle');
        expect(draft.riddleOn).toBe(false);
        expect(draft.question).toBe('');
        expect(draft.answer).toBe('');
        expect(draft.people.map(p => p.answer)).toEqual(['', '']);
        // One link for all cannot stand without a riddle.
        expect(draft.oneLink).toBe(false);
        expect(panel('riddle').hidden).toBe(true);
        expect(btn('riddle').hidden).toBe(false);
        expect([$<HTMLInputElement>('#f-riddle-q').value, $<HTMLInputElement>('#f-riddle-a').value, $<HTMLInputElement>('#f-riddle-a2').value]).toEqual(['', '', '']);
        // Opened again, it starts empty.
        btn('riddle').click();
        expect(all<HTMLInputElement>('.people-answer').map(i => i.value)).toEqual(['', '']);
        expect($<HTMLTextAreaElement>('#f-wish').value).toBe('For you');
        expect(draft.people.map(p => p.amount)).toEqual(['50', '50']);
    });

    it('cancelling several people empties the table and brings the one amount back as it was', async () => {
        await toCreate();
        btn('people').click();
        expect($('#f-amount').closest<HTMLElement>('.field')!.hidden).toBe(true);
        type(all<HTMLInputElement>('.people-name')[0]!, 'Hai');
        type(all<HTMLInputElement>('.people-amount')[1]!, '70');
        // The total and who pays the fees are said with the rows.
        expect(panel('people').contains($('.fee-note'))).toBe(true);
        cancel('people');
        expect(draft.peopleOpen).toBe(false);
        expect(draft.people).toEqual([]);
        expect($('#f-amount').closest<HTMLElement>('.field')!.hidden).toBe(false);
        expect($<HTMLInputElement>('#f-amount').value).toBe('50');
        expect(panel('people').contains($('.fee-note'))).toBe(false);
        // Opened again: two fresh rows from the amount.
        btn('people').click();
        expect(all<HTMLInputElement>('.people-name').map(i => i.value)).toEqual(['', '']);
        expect(all<HTMLInputElement>('.people-amount').map(i => i.value)).toEqual(['50', '50']);
    });

    it('the token panel is the switch: open is "with a token" and the higher fee, cancelled is neither; it never stands empty', async () => {
        await toCreate();
        btn('token').click();
        expect(draft.withToken).toBe(true);
        expect(panel('token').textContent).toContain(t('create.fee.token'));
        expect($('.fee-note').textContent).toContain((Number(takeFeeEstimate(true)) / 100).toFixed(2));
        // A gift that is only a token is one gift's choice: offered here, not while there are several.
        expect(buttonByText(panel('token'), t('create.tokenonly')).closest<HTMLElement>('.opt-row')!.hidden).toBe(false);
        btn('people').click();
        expect(buttonByText(panel('token'), t('create.tokenonly')).closest<HTMLElement>('.opt-row')!.hidden).toBe(true);
        expect(panel('token').textContent).toContain(t('create.fee.token'));
        cancel('people');
        cancel('token');
        expect(draft.withToken).toBe(false);
        expect(draft.tokenOnly).toBe(false);
        expect(panel('token').hidden).toBe(true);
        expect($('.fee-note').textContent).toContain((Number(takeFeeEstimate(false)) / 100).toFixed(2));
    });

    it('an option left open does not follow the giver to the next gift', async () => {
        app = boot();
        await flush();
        btn('token').click();
        await createGift(app.root);
        expect(getMade()!.withToken).toBe(true);
        expect(draft.withToken).toBe(false);
    });

    it('a panel opened later stands under those opened before it, and a cancelled one leaves its place', async () => {
        await toCreate();
        const order = (): string[] => [...$('.opts').children].filter(el => el.classList.contains('opt-panel') && !(el as HTMLElement).hidden).map(el => (el as HTMLElement).dataset.opt!);
        btn('riddle').click();
        btn('people').click();
        expect(order()).toEqual(['riddle', 'people']);
        btn('token').click();
        expect(order()).toEqual(['riddle', 'people', 'token']);
        cancel('people');
        expect(order()).toEqual(['riddle', 'token']);
        btn('people').click();
        expect(order()).toEqual(['riddle', 'token', 'people']);
        // The buttons left are always under the panels.
        expect($('.opts').lastElementChild).toBe($('.opt-btns'));
    });
});
