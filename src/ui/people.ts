import { BATCH_MAX, normaliseAnswer } from '../core';
import { t } from '../i18n';
import { h } from './dom';
import { draft } from './draft';
import { NAME_MAX } from './kept';

/**
 * "Several people": a table of who gets how much, in place of the one amount on the create step.
 *
 * Closed, the create step is as it always was. Opened, each row is one gift: a name (the giver's own word for it,
 * optional), an amount, and, when the gifts are locked with a riddle, an answer of its own (optional, unless all
 * share one link: then the answer is what tells the gifts apart). Nothing here makes a key: the rows are only what
 * the giver typed, kept in `draft` so that a language switch does not empty them.
 */
export interface Person {
    name: string;
    amount: string;
    answer: string;
}

export interface PeopleBlock {
    readonly el: HTMLElement;
    /** The table is open: the gifts are its rows, not the one amount. */
    active(): boolean;
    rows(): readonly Person[];
    /** Repaint for what changed outside: the riddle switched on or off, the form busy, a row's amount found wrong. */
    sync(o: { riddleOn: boolean; working: boolean; badAmounts: ReadonlySet<number>; badAnswers: ReadonlySet<number> }): void;
}

export function peopleBlock(opts: { firstAmount: () => string; onChange: () => void }): PeopleBlock {
    let riddleOn = false;
    let working = false;
    const list = h('div', { class: 'people-rows' });
    const add = h('button', { type: 'button', class: 'btn btn-secondary btn-small people-add' }, t('people.add'));
    const oneBox = h('input', { id: 'f-onelink', class: 'check-box', type: 'checkbox' });
    oneBox.checked = draft.oneLink;
    const oneRow = h('label', { class: 'check people-one', for: 'f-onelink', hidden: true }, oneBox, h('span', null, h('span', null, t('people.one')), h('span', { class: 'check-why' }, ' ' + t('people.one.why'))));
    // What one shared link costs is said in view, never behind a press: the answer is then the only lock.
    const oneWarn = h('p', { class: 'warning people-one-warn', hidden: true }, t('people.one.warn'));
    // Rows with the same answer are several gifts for that answer: what that means is said as soon as it is so.
    // What the link will let anyone who has it see, and where to switch that off.
    const oneStatus = h('p', { class: 'note people-one-status', hidden: true }, t('people.one.status'));
    const sameWarn = h('p', { class: 'warning people-same-warn', hidden: true }, t('people.one.same'));
    // One link for all needs a riddle: said where the rows are, since the riddle's switch is further down.
    const oneHint = h('p', { class: 'note people-one-hint', hidden: true }, t('people.one.hint'));
    const body = h('div', { class: 'people-body', hidden: !draft.peopleOpen }, h('p', { class: 'note people-lead' }, t('people.lead', { max: BATCH_MAX })), list, add, oneHint, oneRow, oneWarn, oneStatus, sameWarn);
    const mark = h('span', { class: 'people-mark', 'aria-hidden': 'true' }, draft.peopleOpen ? '−' : '+');
    const toggle = h(
        'button',
        { type: 'button', class: 'people-toggle', 'aria-expanded': String(draft.peopleOpen), 'aria-controls': 'f-people' },
        mark,
        h('span', { class: 'people-text' }, h('span', { class: 'people-title' }, t('people.title')), h('span', { class: 'people-sub' }, t('people.sub'))),
    );
    body.id = 'f-people';
    const el = h('div', { class: 'people', 'data-open': draft.peopleOpen ? 'yes' : 'no' }, toggle, body);

    const answerHint = (): string => t(draft.oneLink ? 'people.answer.own' : 'people.answer.opt');
    function row(p: Person, i: number): HTMLElement {
        const name = h('input', { class: 'input people-name', type: 'text', autocomplete: 'off', maxlength: String(NAME_MAX), placeholder: t('people.name', { n: i + 1 }), 'aria-label': t('people.name.label', { n: i + 1 }) });
        name.value = p.name;
        name.addEventListener('input', () => {
            p.name = name.value;
            opts.onChange();
        });
        const amount = h('input', { class: 'input mono people-amount', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'XEC', 'aria-label': t('people.amount.label', { n: i + 1 }) });
        amount.value = p.amount;
        amount.addEventListener('input', () => {
            p.amount = amount.value;
            opts.onChange();
        });
        const remove = h('button', { type: 'button', class: 'people-remove', 'aria-label': t('people.remove', { n: i + 1 }) }, h('span', { 'aria-hidden': 'true' }, '×'));
        remove.addEventListener('click', () => {
            draft.people.splice(i, 1);
            paintRows();
            opts.onChange();
        });
        const answer = h('input', { class: 'input people-answer', type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', placeholder: answerHint(), 'aria-label': t('people.answer.label', { n: i + 1 }) });
        answer.value = p.answer;
        answer.addEventListener('input', () => {
            p.answer = answer.value;
            opts.onChange();
        });
        return h('div', { class: 'people-row', 'data-i': String(i) }, name, amount, remove, answer);
    }
    function paintRows(): void {
        list.replaceChildren(...draft.people.map(row));
        paintState();
    }
    function paintState(bad: ReadonlySet<number> = new Set(), badAnswers: ReadonlySet<number> = new Set()): void {
        const n = draft.people.length;
        add.disabled = working || n >= BATCH_MAX;
        // One link for all needs answers to tell the gifts apart: only with a riddle, and only for two or more.
        const canOne = riddleOn && n >= 2;
        if (!canOne && draft.oneLink) {
            draft.oneLink = false;
            oneBox.checked = false;
        }
        oneRow.hidden = !canOne;
        oneHint.hidden = riddleOn || n < 2;
        oneWarn.hidden = !(canOne && draft.oneLink);
        oneStatus.hidden = !(canOne && draft.oneLink) || draft.riddleHide;
        const typed = draft.people.map(p => normaliseAnswer(p.answer)).filter(a => a !== '');
        sameWarn.hidden = !(canOne && draft.oneLink && new Set(typed).size < typed.length);
        oneBox.disabled = working;
        [...list.children].forEach((r, i) => {
            const [name, amount, remove, answer] = [...r.children] as [HTMLInputElement, HTMLInputElement, HTMLButtonElement, HTMLInputElement];
            for (const f of [name, amount, answer]) f.disabled = working;
            remove.disabled = working || n <= 1;
            amount.classList.toggle('input--bad', bad.has(i));
            // An answer of its own is for telling several gifts apart: one gift has the one answer, typed twice below.
            answer.hidden = !riddleOn || n < 2;
            answer.placeholder = answerHint();
            answer.classList.toggle('input--bad', badAnswers.has(i));
        });
    }

    toggle.addEventListener('click', () => {
        draft.peopleOpen = !draft.peopleOpen;
        // Opened for the first time: two rows, each starting from the amount already typed.
        if (draft.peopleOpen && draft.people.length === 0) {
            const first = opts.firstAmount();
            draft.people.push({ name: '', amount: first, answer: '' }, { name: '', amount: first, answer: '' });
        }
        body.hidden = !draft.peopleOpen;
        el.dataset.open = draft.peopleOpen ? 'yes' : 'no';
        toggle.setAttribute('aria-expanded', String(draft.peopleOpen));
        mark.textContent = draft.peopleOpen ? '−' : '+';
        paintRows();
        opts.onChange();
        if (draft.peopleOpen) (list.querySelector('.people-name') as HTMLInputElement | null)?.focus();
    });
    add.addEventListener('click', () => {
        if (draft.people.length >= BATCH_MAX) return;
        const last = draft.people[draft.people.length - 1];
        draft.people.push({ name: '', amount: last?.amount ?? opts.firstAmount(), answer: '' });
        paintRows();
        opts.onChange();
        (list.lastElementChild?.querySelector('.people-name') as HTMLInputElement | null)?.focus();
    });
    oneBox.addEventListener('change', () => {
        draft.oneLink = oneBox.checked;
        paintState();
        opts.onChange();
    });
    paintRows();

    return {
        el,
        active: () => draft.peopleOpen && draft.people.length > 0,
        rows: () => draft.people,
        sync(o) {
            riddleOn = o.riddleOn;
            working = o.working;
            toggle.disabled = working;
            paintState(o.badAmounts, o.badAnswers);
        },
    };
}
