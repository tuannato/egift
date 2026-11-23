import { applyTheme } from '../theme';
import type { WrapperDef } from '../../stage';
import type { Recipe, RecipeFace } from '../../core';
import { coversFee, setCoversFee } from '../prefs';
import { CAP_SATS, CONFIRM_SATS, DEFAULT_WRAPPER, FLOOR_SATS, RIDDLE_MAX_BYTES, WISH_MAX_BYTES, deriveKey, encodeLink, formatRecipe, formatXec, newSecret, parseRecipe, takeFeeEstimate, normaliseAnswer, parseXec, riddleBytes, riddleRoot, whyNotXec, wishBytes } from '../../core';
import { WRAPPERS, offerOf, wrapperById, inLang } from '../../wrappers';
import { thumbUrl } from '../../wrappers/artUrl';
import { ACCENTS, COLOURWAYS, accentFor, colourwaysOf, dressed } from '../../wrappers/looks';
import { plate } from '../plate';
import { stageCard, prefersReducedMotion, type StageCard } from '../stageCard';
import { h } from '../dom';
import type { Dispose } from '../dom';
import type { Ctx } from '../ctx';
import { getLang, t } from '../../i18n';
import { setBatch, setMade } from '../session';
import type { BatchGift } from '../session';
import { peopleBlock } from '../people';
import { keepableName } from '../kept';
import { layout, label, fold } from '../layout';
import { loadLooks, removeLook, saveLook } from '../looks';
import { cue, score } from '../sound';
import { figureWidth } from '../amount';
import { holdButton } from '../hold';
import { track } from '../busy';

import { draft, chooseWrapper, chosenWrapper } from '../draft';
export { chooseWrapper, chosenWrapper };

/**
 * The giver's own choice to be asked before creating, for this visit. Kept in
 * memory only: nothing but the language is ever written to storage.
 */
let wantConfirm = false;

/** For tests. */
export function resetCreate(): void {
    wantConfirm = false;
    draft.amount = '';
    draft.tokenOnly = false;
    draft.coverFee = false;
    draft.withToken = false;
    draft.wish = '';
    draft.wrapper = '';
    draft.recipe = '';
    draft.riddleOn = false;
    draft.riddleHide = false;
    draft.question = '';
    draft.answer = '';
    draft.people = [];
    draft.peopleOpen = false;
    draft.oneLink = false;
}

/** Amounts people like to give, in sats: 88, 888, 8,888 and 88,888 XEC. */
const QUICK = [8_800n, 88_800n, 888_800n, 8_888_800n] as const;

/** The faces a giver may set the headings and figures in, in the order the chips stand. */
const FACES: readonly RecipeFace[] = ['grotesk', 'tech', 'mono', 'serif', 'poster', 'slab'];
/** Two colours a glance cannot tell apart (distance in sRGB, of 442): a shared accent this near the wrapper's own is not offered twice. */
const NEAR = 40;
function near(a: string, b: string): boolean {
    const ch = (c: string, i: number): number => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.hypot(ch(a, 0) - ch(b, 0), ch(a, 1) - ch(b, 1), ch(a, 2) - ch(b, 2)) < NEAR;
}

/**
 * Screen A, a showroom: the stage is the picker (swipe it, or use the names
 * under it), the amount is typed straight into the monumental figure, then
 * the wish. One form; no key exists until Create is pressed — and, from
 * 1,000,000 XEC or whenever the giver asks for it, until the hold is completed.
 */
/** A wrapper's name in the page's language, or nothing when there is no such wrapper. */
const nameOf = (def: { readonly name: Readonly<Record<'vi' | 'en', string>> } | undefined): string => (def ? inLang(def.name, getLang()) : '');

export function mountCreate(root: HTMLElement, ctx: Ctx): Dispose {
    const lang = getLang();
    if (!draft.wrapper || !WRAPPERS.some(w => w.id === draft.wrapper)) {
        draft.wrapper = WRAPPERS.some(w => w.id === DEFAULT_WRAPPER) ? DEFAULT_WRAPPER : (WRAPPERS[0]?.id ?? DEFAULT_WRAPPER);
        draft.recipe = '';
    }

    // ---- Amount: the giant figure is the input ----
    const amount = h('input', {
        id: 'f-amount',
        class: 'giant',
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        enterkeyhint: 'next',
        placeholder: t('create.amount.placeholder'),
        'aria-describedby': 'f-amount-msg',
    });
    amount.value = draft.amount;
    const amountMsg = h('p', { id: 'f-amount-msg', class: 'field-msg', role: 'status', 'aria-live': 'polite' });
    const amountField = h('div', { class: 'field field--giant' }, h('div', { class: 'giant-head' }, h('label', { class: 'label', for: 'f-amount' }, t('create.amount.label'))), amount);
    const chips = h(
        'div',
        { class: 'chips', role: 'group', 'aria-label': t('create.chips.label') },
        ...QUICK.map(sats =>
            h(
                'button',
                {
                    type: 'button',
                    class: 'chip',
                    onclick: () => {
                        // Plain digits: a typed `8.888` would be ambiguous, the figure itself is not.
                        amount.value = String(sats / 100n);
                        draft.amount = amount.value;
                        validate();
                        amount.focus();
                    },
                },
                formatXec(sats, lang),
            ),
        ),
    );
    // A gift that is a token: the package holds only the least XEC, which pays the recipient's way home.
    const tokenOnlyBtn = h(
        'button',
        {
            type: 'button',
            class: 'chip chip--token',
            onclick: () => {
                amount.value = String(FLOOR_SATS / 100n);
                draft.amount = amount.value;
                draft.tokenOnly = true;
                validate();
            },
        },
        t('create.tokenonly'),
    );
    // Several people: a table of who gets how much, in place of the one amount. Closed, nothing here changes.
    const people = peopleBlock({ firstAmount: () => amount.value.trim(), onChange: () => validate() });
    // The network fee, said before the gift exists: what the recipient will get, and a way for the giver to pay it.
    // A gift that will also carry a token costs more to take home: the giver says so here, so the figures are right.
    const fee = (): bigint => takeFeeEstimate(draft.withToken);
    const tokBox = h('input', { id: 'f-withtoken', class: 'check-box', type: 'checkbox' });
    tokBox.checked = draft.withToken;
    // The box holds the choice out of sight; the token panel being open is what shows it, with this sentence in it.
    tokBox.hidden = true;
    const tokRow = h('p', { class: 'note opt-token-say' }, tokBox, t('create.fee.token'));
    tokBox.addEventListener('change', () => {
        draft.withToken = tokBox.checked;
        validate();
    });
    const feeNote = h('p', { class: 'note fee-note', hidden: true, role: 'status', 'aria-live': 'polite' });
    const feeBox = h('input', { id: 'f-fee', class: 'check-box', type: 'checkbox' });
    feeBox.checked = draft.coverFee;
    const feeLabel = h('span', null, '');
    const feeRow = h('label', { class: 'check check--fee', for: 'f-fee', hidden: true }, feeBox, feeLabel);
    feeBox.addEventListener('change', () => {
        draft.coverFee = feeBox.checked;
        // The choice is the giver's standing one: the next gift starts with it.
        setCoversFee(feeBox.checked);
        validate();
    });
    /** What the giver funds: the gift, plus the recipient's fee when the giver pays it. */
    const funded = (sats: bigint): bigint => (draft.coverFee && !draft.tokenOnly ? sats + fee() : sats);
    const tokenOnlyNote = h('p', { class: 'note', hidden: true }, t('create.tokenonly.note', { min: formatXec(FLOOR_SATS, lang) }));

    // ---- Wish ----
    const wish = h('textarea', { id: 'f-wish', class: 'input textarea textarea--wish', rows: 3, spellcheck: 'false', 'aria-describedby': 'f-wish-count' });
    wish.value = draft.wish;
    const wishCount = h('p', { id: 'f-wish-count', class: 'field-msg', 'aria-live': 'polite' });
    const meterFill = h('span', { class: 'meter-fill' });
    // The length of the note as a line that fills; words only when it is nearly or too long.
    const meter = h('div', { class: 'meter', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(WISH_MAX_BYTES), 'aria-label': t('create.wish.label') }, meterFill);

    // ---- The riddle lock (optional): a question in the link, an answer nowhere ----
    const riddleBox = h('input', { id: 'f-riddle', class: 'check-box', type: 'checkbox' });
    riddleBox.checked = draft.riddleOn;
    const question = h('input', { id: 'f-riddle-q', class: 'input', type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: t('create.riddle.q.placeholder'), 'aria-describedby': 'f-riddle-msg' });
    question.value = draft.question;
    const answer = h('input', { id: 'f-riddle-a', class: 'input', type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-describedby': 'f-riddle-hint' });
    answer.value = draft.answer;
    // Typed twice: a slip here would lock the gift for everyone, the giver included.
    const answer2 = h('input', { id: 'f-riddle-a2', class: 'input', type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-describedby': 'f-riddle-a2-msg' });
    const answer2Msg = h('p', { id: 'f-riddle-a2-msg', class: 'field-msg', 'aria-live': 'polite' });
    const riddleMsg = h('p', { id: 'f-riddle-msg', class: 'field-msg', 'aria-live': 'polite' });
    /** Said, never enforced: an answer of a few digits, or a very short one, is the easiest kind to guess. */
    const answerWeak = h('p', { id: 'f-riddle-weak', class: 'field-msg field-msg--bad', 'aria-live': 'polite', hidden: true }, t('create.riddle.a.weak'));
    const isWeakAnswer = (raw: string): boolean => {
        const a = normaliseAnswer(raw).replace(/\s+/g, '');
        if (a === '') return false;
        return [...a].length <= 3 || (/^\d+$/.test(a) && a.length <= 8);
    };
    /**
     * Said, never enforced: the wish and the question ride in the link in plain sight, so an answer written into either
     * opens the gift for anyone who has the link. Very short answers are left to the notice above: they are in every text.
     */
    const answerShown = h('p', { id: 'f-riddle-shown', class: 'warning', 'aria-live': 'polite', hidden: true }, t('create.riddle.a.shown'));
    const isShownAnswer = (raw: string, ...texts: string[]): boolean => {
        const a = normaliseAnswer(raw);
        return [...a.replace(/\s+/g, '')].length >= 3 && texts.some(x => normaliseAnswer(x).includes(a));
    };
    // The link of a locked gift names the gift's address, so that the page can say "still here" or "already taken"
    // before anyone answers. The giver may leave that out: then nothing is known until the right answer.
    const hideBox = h('input', { id: 'f-riddle-hide', class: 'check-box', type: 'checkbox' });
    hideBox.checked = draft.riddleHide;
    hideBox.addEventListener('change', () => {
        draft.riddleHide = hideBox.checked;
        // The table says what a shared link will show: it follows this switch.
        validate();
    });
    const hideRow = h('label', { class: 'check check--riddle', for: 'f-riddle-hide' }, hideBox, h('span', null, h('span', null, t('create.riddle.hide')), h('span', { class: 'check-why' }, ' ' + t('create.riddle.hide.why'))));
    const riddleFields = h(
        'div',
        { class: 'riddle-fields' },
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-riddle-q' }, t('create.riddle.q.label')), question, riddleMsg),
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-riddle-a' }, t('create.riddle.a.label')), answer, h('p', { id: 'f-riddle-hint', class: 'field-msg' }, t('create.riddle.a.hint')), answerWeak, answerShown),
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-riddle-a2' }, t('create.riddle.a2.label')), answer2, answer2Msg),
        hideRow,
        // Two honest limits, said before the gift exists.
        h('p', { class: 'warning' }, t('create.riddle.limit')),
        h('p', { class: 'warning danger' }, t('create.riddle.forget')),
    );
    riddleFields.hidden = !draft.riddleOn;
    riddleBox.addEventListener('change', () => {
        draft.riddleOn = riddleBox.checked;
        riddleFields.hidden = !draft.riddleOn;
        validate();
    });
    question.addEventListener('input', () => {
        draft.question = question.value;
        validate();
    });
    answer.addEventListener('input', () => {
        draft.answer = answer.value;
        validate();
    });
    answer2.addEventListener('input', () => validate());

    // ---- Options: three quiet buttons under the note. Each opens a panel of its own, with a way to cancel it ----
    // A closed option is one button in a row with the others; an open one is its panel, above the buttons that are
    // left. Cancelling empties what was typed there and puts the button back. The boxes that hold each choice
    // (`f-riddle`, `f-withtoken`) stay in the page, out of sight: a panel being open is what says it.
    riddleBox.hidden = true;
    const optPanel = (id: string, title: string, onCancel: () => void, ...content: (Node | null)[]): HTMLElement =>
        h(
            'section',
            { class: 'opt-panel', 'data-opt': id, hidden: true, 'aria-label': title },
            h('div', { class: 'opt-head' }, h('p', { class: 'opt-title' }, title), h('button', { type: 'button', class: 'btn btn-quiet btn-small opt-cancel', onclick: onCancel }, t('create.opt.cancel'))),
            ...content,
        );
    const optButton = (id: string, label: string, onOpen: () => void): HTMLButtonElement =>
        h('button', { type: 'button', class: 'opt-btn', 'data-opt': id, onclick: onOpen }, h('span', { class: 'opt-plus', 'aria-hidden': 'true' }, '+'), h('span', null, label));
    const reveal = (panel: HTMLElement, focus?: HTMLElement | null): void => {
        validate();
        panel.dispatchEvent(new CustomEvent('cap:show', { bubbles: true }));
        focus?.focus();
    };
    const peoplePanel = optPanel('people', t('people.title'), () => {
        people.clear();
        validate();
        peopleBtn.focus();
    }, people.el);
    const tokenOnlyRow = h('div', { class: 'opt-row' }, tokenOnlyBtn);
    const tokenPanel = optPanel(
        'token',
        t('create.opt.token'),
        () => {
            draft.withToken = false;
            draft.tokenOnly = false;
            tokBox.checked = false;
            validate();
            tokenBtn.focus();
        },
        tokRow,
        tokenOnlyRow,
        tokenOnlyNote,
    );
    const riddlePanel = optPanel(
        'riddle',
        t('create.riddle.toggle'),
        () => {
            for (const f of [question, answer, answer2]) f.value = '';
            draft.question = '';
            draft.answer = '';
            for (const row of draft.people) row.answer = '';
            people.redraw();
            draft.riddleHide = false;
            hideBox.checked = false;
            if (riddleBox.checked) riddleBox.click();
            validate();
            riddleBtn.focus();
        },
        riddleBox,
        h('p', { class: 'note' }, t('create.riddle.why')),
        riddleFields,
    );
    const peopleBtn = optButton('people', t('people.title'), () => {
        people.open();
        reveal(peoplePanel);
    });
    const tokenBtn = optButton('token', t('create.opt.token'), () => {
        draft.withToken = true;
        tokBox.checked = true;
        reveal(tokenPanel, tokenPanel.querySelector<HTMLElement>('.opt-cancel'));
    });
    const riddleBtn = optButton('riddle', t('create.riddle.toggle'), () => {
        if (!riddleBox.checked) riddleBox.click();
        reveal(riddlePanel, question);
    });
    const amountBeat = h('div', { class: 'beat' }, amountField, chips, amountMsg, feeNote, feeRow);
    const optButtons = h('div', { class: 'opt-btns', role: 'group', 'aria-label': t('create.opt.label') }, peopleBtn, tokenBtn, riddleBtn);
    const options = h('div', { class: 'beat opts' }, peoplePanel, tokenPanel, riddlePanel, optButtons);
    /** Which options are open, from what the giver has chosen: called by every repaint. */
    const paintOptions = (working: boolean): void => {
        const open = { people: draft.peopleOpen, token: draft.withToken || draft.tokenOnly, riddle: draft.riddleOn };
        peoplePanel.hidden = !open.people;
        tokenPanel.hidden = !open.token;
        riddlePanel.hidden = !open.riddle;
        peopleBtn.hidden = open.people;
        tokenBtn.hidden = open.token;
        riddleBtn.hidden = open.riddle;
        optButtons.hidden = open.people && open.token && open.riddle;
        for (const b of [peopleBtn, tokenBtn, riddleBtn, tokenOnlyBtn, ...options.querySelectorAll<HTMLButtonElement>('.opt-cancel')]) b.disabled = working;
        // A gift that is only a token is one gift's choice: not offered while there are several.
        tokenOnlyRow.hidden = draft.peopleOpen;
        // What several gifts come to, and who pays their fees, is said with the rows; for one gift, under its amount.
        const home = open.people ? peoplePanel : amountBeat;
        if (feeNote.parentElement !== home) home.append(feeNote, feeRow);
    };

    // ---- Confirmation: the giver's choice below a million, always on from a million ----
    const confirmBox = h('input', { id: 'f-confirm', class: 'check-box', type: 'checkbox' });
    confirmBox.checked = wantConfirm;
    const confirmWhy = h('span', { class: 'check-why' });
    const confirmRow = h('label', { class: 'check check--confirm', for: 'f-confirm' }, confirmBox, h('span', null, h('span', null, t('create.confirm.toggle')), confirmWhy));
    confirmBox.addEventListener('change', () => {
        if (confirmBox.disabled) return;
        wantConfirm = confirmBox.checked;
    });

    const backBtn = h('button', { type: 'button', class: 'btn btn-quiet create-back', onclick: () => ctx.nav.toHome() }, h('span', { 'aria-hidden': 'true' }, '← '), t('create.back'));
    // What the chosen wrapper costs, said before the gift exists. Free wrappers say nothing.
    const priceNote = h('p', { class: 'note price-note', hidden: true });
    /** The chosen wrapper's price, beside the picker's label: seen before anything is typed. */
    const priceChip = h('span', { class: 'home-price pick-price' });
    const priceOf = (def: WrapperDef): string => {
        const offer = offerOf(def);
        return offer.kind === 'paid' ? `${formatXec(offer.sats, lang)} XEC` : t('home.price.free');
    };
    const submitWhy = h('p', { class: 'btn-reason' });
    const errBox = h('p', { class: 'field-msg field-msg--bad', role: 'alert' });
    const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, t('create.submit'));
    const finishHost = h('div', { class: 'finish-host' }, submit, submitWhy);

    function needsConfirm(sats: bigint): boolean {
        return sats >= CONFIRM_SATS || wantConfirm;
    }

    let working = false;
    /** The screen was left: a derivation still running must not make a gift behind the giver's back. */
    let disposed = false;
    /** The amount of the one gift this form makes: the big figure, or the only row of the table. Null for several, or none. */
    const oneAmount = (v: { sats: bigint | null; rowSats: readonly bigint[] | null; multi: boolean }): bigint | null => (v.multi ? (v.rowSats !== null && v.rowSats.length === 1 ? v.rowSats[0]! : null) : v.sats);
    /** What the table as it stands would make: every amount and answer, to compare with what was confirmed. */
    const tableSig = (): string =>
        JSON.stringify([
            draft.oneLink,
            draft.coverFee,
            draft.riddleOn,
            draft.riddleHide,
            draft.wrapper,
            draft.recipe,
            question.value.trim(),
            wish.value.trim(),
            normaliseAnswer(answer.value),
            people.rows().map(r => [r.name.trim(), r.amount.trim(), normaliseAnswer(r.answer)]),
        ]);
    function validate(): { sats: bigint | null; wishOk: boolean; riddleOk: boolean; rowSats: bigint[] | null; multi: boolean } {
        const raw = amount.value.trim();
        let sats: bigint | null = null;
        let msg = '';
        if (raw !== '') {
            const p = parseXec(raw);
            if (p === null) {
                // Say why, specifically: `100.000` could be a hundred thousand or a hundred.
                const why = whyNotXec(raw);
                if (why === 'ambiguous-separator') msg = t('create.err.ambiguous', { plain: raw.replace(/[.,]/, '') });
                else if (why === 'too-many-decimals') msg = t('create.err.decimals');
                else msg = t('create.err.nan');
            } else if (p < FLOOR_SATS) msg = t('create.err.floor', { min: formatXec(FLOOR_SATS, lang), fee: formatXec(takeFeeEstimate(), lang) });
            else sats = p;
        }
        // Several people: each row is a gift of its own; the big figure and what belongs to one gift step aside.
        const multi = people.active();
        let rowSats: bigint[] | null = null;
        const badAmounts = new Set<number>();
        if (multi) {
            // A gift that is only a token is one gift's choice; several gifts may still carry a token each (sent to
            // all of them at once after they are made), and the fee the giver covers then counts for it.
            draft.tokenOnly = false;
            const parsed = people.rows().map(r => parseXec(r.amount.trim()));
            parsed.forEach((x, i) => {
                if (x === null || x < FLOOR_SATS) badAmounts.add(i);
            });
            rowSats = badAmounts.size === 0 ? (parsed as bigint[]) : null;
            // All of them together are held to the cap of one gift (with the fee the giver may add to each).
            if (rowSats !== null && rowSats.reduce((a, b) => a + b + fee(), 0n) > CAP_SATS) {
                rowSats.forEach((_, i) => badAmounts.add(i));
                rowSats = null;
            }
            msg = '';
        }
        amountField.hidden = multi;
        chips.hidden = multi;
        amountMsg.hidden = multi;
        // "Token only" holds while the amount is the least one; any other figure is an ordinary gift again.
        if (sats !== FLOOR_SATS) draft.tokenOnly = false;
        tokenOnlyNote.hidden = !draft.tokenOnly;
        // An ordinary gift says what arrives. (A token-only gift's XEC is all fee; its own note says so.)
        const showFee = multi ? rowSats !== null : sats !== null && !draft.tokenOnly;
        feeNote.hidden = !showFee;
        feeRow.hidden = !showFee;
        const FEE = fee();
        feeLabel.textContent = t('create.fee.toggle', { fee: formatXec(FEE, lang) });
        if (multi && rowSats !== null) {
            const sum = rowSats.reduce((a, b) => a + b, 0n);
            const fees = FEE * BigInt(rowSats.length);
            feeNote.textContent = draft.coverFee
                ? t('people.fee.on', { total: formatXec(sum + fees, lang), n: rowSats.length, fee: formatXec(fees, lang) })
                : t('people.fee.off', { total: formatXec(sum, lang), n: rowSats.length, fee: formatXec(FEE, lang) });
        } else if (sats !== null && showFee)
            feeNote.textContent = draft.coverFee
                ? t('create.fee.on', { total: formatXec(sats + FEE, lang), amount: formatXec(sats, lang), fee: formatXec(FEE, lang) })
                : t('create.fee.off', { net: formatXec(sats - FEE, lang), fee: formatXec(FEE, lang) });
        amountMsg.textContent = msg;
        amountMsg.classList.toggle('field-msg--bad', msg !== '');
        amount.classList.toggle('giant--bad', msg !== '');
        amount.setAttribute('aria-invalid', String(msg !== ''));
        // The figure fills the width whatever its length.
        amount.style.setProperty('--chars', String(figureWidth(raw === '' ? '0' : raw)));

        // From a million up the question is always asked; the toggle shows it and cannot be switched off.
        // Several gifts are always read back before they are made: the amounts, the names, the answers.
        const several = multi && people.rows().length >= 2;
        const forced = several || (multi ? rowSats !== null && rowSats.length === 1 && funded(rowSats[0]!) >= CONFIRM_SATS : sats !== null && funded(sats) >= CONFIRM_SATS);
        confirmBox.disabled = forced;
        confirmBox.checked = forced || wantConfirm;
        confirmWhy.textContent = !forced ? '' : several ? ' ' + t('people.confirm.forced') : ' ' + t('create.confirm.forced', { min: formatXec(CONFIRM_SATS, lang) });

        const n = wishBytes(wish.value.trim());
        const wishOk = n <= WISH_MAX_BYTES;
        wishCount.textContent = !wishOk ? t('create.wish.over') : n > WISH_MAX_BYTES * 0.85 ? t('create.wish.near') : '';
        meter.setAttribute('aria-valuenow', String(n));
        meter.setAttribute('aria-valuetext', t('create.wish.count', { n, max: WISH_MAX_BYTES }));
        wishCount.classList.toggle('field-msg--bad', !wishOk);
        meterFill.style.setProperty('--fill', String(Math.min(1, n / WISH_MAX_BYTES)));
        meterFill.classList.toggle('meter-fill--over', !wishOk);
        // The lock needs both halves: a question to show, and an answer that is something once normalised.
        const qBytes = riddleBytes(question.value);
        const qOver = qBytes > RIDDLE_MAX_BYTES;
        const norm = normaliseAnswer(answer.value);
        const same = norm !== '' && normaliseAnswer(answer2.value) === norm;
        // A row may have an answer of its own; without one it takes the answer all share. One link for all: every
        // row needs its own, and no two the same (the answer is what tells the gifts apart).
        const own = multi ? people.rows().map(r => normaliseAnswer(r.answer)) : [];
        const one = multi && draft.riddleOn && draft.oneLink;
        const badAnswers = new Set<number>();
        // Rows that share an answer are several gifts behind that answer, opened one at a time.
        if (one) own.forEach((a, i) => (a === '' ? badAnswers.add(i) : undefined));
        const allOwn = several && own.every(a => a !== '');
        const sharedOk = one ? badAnswers.size === 0 : same || (allOwn && answer.value.trim() === '' && answer2.value.trim() === '');
        const riddleOk = !draft.riddleOn || (qBytes > 0 && !qOver && sharedOk);
        // The answer all share has no part in a gift whose every row answers for itself through one link.
        for (const f of [answer, answer2]) if (f.parentElement) f.parentElement.hidden = one;
        people.sync({ riddleOn: draft.riddleOn, working, badAmounts, badAnswers });
        paintOptions(working);
        const mismatch = draft.riddleOn && answer2.value.trim() !== '' && !same;
        answer2Msg.textContent = mismatch ? t('create.riddle.a2.diff') : '';
        answerWeak.hidden = !(draft.riddleOn && isWeakAnswer(answer.value));
        answerShown.hidden = !(draft.riddleOn && isShownAnswer(answer.value, wish.value, question.value));
        answer2Msg.classList.toggle('field-msg--bad', mismatch);
        for (const f of [question, answer, answer2, riddleBox, hideBox, tokBox, feeBox]) f.disabled = working;
        riddleMsg.textContent = draft.riddleOn && qOver ? t('create.riddle.over') : '';
        riddleMsg.classList.toggle('field-msg--bad', draft.riddleOn && qOver);
        submit.disabled = working || (multi ? rowSats === null : sats === null) || !wishOk || !riddleOk;
        submitWhy.textContent = working
            ? t('create.working')
            : multi && rowSats === null
              ? t('people.need.amounts', { min: formatXec(FLOOR_SATS, lang) })
              : !multi && sats === null
              ? raw === ''
                  ? t('create.need.amount')
                  : t('create.need.fix')
              : !wishOk
                ? t('create.need.wish')
                : !riddleOk
                  ? t('create.need.riddle')
                  : '';
        submitWhy.hidden = !submit.disabled;
        backBtn.disabled = working;
        const chosen = wrapperById(draft.wrapper);
        const offer = chosen ? offerOf(chosen) : ({ kind: 'free' } as const);
        priceNote.hidden = offer.kind !== 'paid';
        priceNote.textContent = offer.kind !== 'paid' ? '' : several ? t('people.price.once', { price: formatXec(offer.sats, lang) }) : t('create.price', { price: formatXec(offer.sats, lang) });
        priceChip.textContent = chosen ? priceOf(chosen) : '';
        priceChip.hidden = !chosen;
        return { sats, wishOk, riddleOk, rowSats, multi };
    }
    amount.addEventListener('input', () => {
        draft.amount = amount.value;
        validate();
    });
    wish.addEventListener('input', () => {
        draft.wish = wish.value;
        validate();
    });

    // ---- The stage is the picker ----
    const stageHost = h('div', { class: 'showroom-stage' });
    let show: StageCard | null = null;
    let previewing = false;
    const previewBtn = h('button', { type: 'button', class: 'btn btn-quiet btn-preview' }, t('create.preview.play'));
    const tabs: HTMLButtonElement[] = [];
    /** The little cases of the picker. A case's scene is put up (as a still) only when the case comes into view. */
    const cases: { def: WrapperDef; art: HTMLElement; card: StageCard | null }[] = [];
    const fillCase = (c: (typeof cases)[number]): void => {
        if (c.card || disposed) return;
        // A small picture of the wrapper, closed: 24 mounted scenes are more than a phone's browser will hold.
        c.card = { el: h('div', { class: 'stage-card' }, h('img', { class: 'door-still', src: thumbUrl(c.def.id), alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' })), handle: null, overlay: h('div', null), destroy() {} };
        c.art.append(c.card.el);
    };
    const seen =
        typeof IntersectionObserver === 'function'
            ? new IntersectionObserver(
                  entries => {
                      for (const e of entries) {
                          if (!e.isIntersecting) continue;
                          const c = cases.find(x => x.art === e.target);
                          if (c) fillCase(c);
                          seen?.unobserve(e.target);
                      }
                  },
                  { rootMargin: '0px 160px' },
              )
            : null;

    // ---- The look: an accent, a face, quiet. Three closed choices, written into the link as a recipe ----
    const base = (): WrapperDef | undefined => wrapperById(draft.wrapper);
    /** The chosen wrapper as the giver has dressed it. */
    const worn = (): WrapperDef | undefined => {
        const b = base();
        return b && dressed(b, draft.recipe);
    };
    /** A look as the chosen wrapper can wear it, in its one spelling: its own face, an accent the list lacks, a tune it does not have are not written. */
    const fit = (r: Recipe | null): string => {
        const b = base();
        const th = b?.theme;
        if (!r || !b) return '';
        return (
            formatRecipe({
                ...(th && r.accent !== undefined && accentFor(th, r.accent) ? { accent: r.accent } : {}),
                ...(th && r.face !== undefined && r.face !== th.face ? { face: r.face } : {}),
                ...(r.quiet && b.sound?.score ? { quiet: true as const } : {}),
                ...(r.art !== undefined && colourwaysOf(b.id)[r.art] ? { art: r.art } : {}),
            }) ?? ''
        );
    };
    draft.recipe = fit(parseRecipe(draft.recipe));
    const look = (): Recipe => parseRecipe(draft.recipe) ?? {};
    function setLook(next: Recipe): void {
        const before = look().art;
        draft.recipe = fit(next);
        // The frame is dressed again where it stands. The stage is left alone unless the art itself changes colourway:
        // then its pictures are other files, and the swatches start from another colour of the wrapper's own.
        // (Quiet changes the sound the frame wears, and with it a tune that was playing ends.)
        if (look().art !== before) {
            mountShow();
            buildDress();
            return;
        }
        const def = worn();
        if (def) applyTheme(def);
        syncDress();
    }
    /** A look without its colourway: what is saved, since a colourway belongs to one wrapper and a saved look to all. */
    const plainOf = (recipe: string): string => formatRecipe({ ...(parseRecipe(recipe) ?? {}), art: undefined }) ?? '';
    /** A round sample of a colour. */
    const dot = (colour: string): HTMLElement => {
        const d = h('span', { class: 'swatch-dot', 'aria-hidden': 'true' });
        d.style.setProperty('--sw', colour);
        return d;
    };
    /** The figure "20" set in a face: what the face looks like, without a word. */
    const figure = (face: string): HTMLElement => h('span', { class: 'face-fig', 'data-face': face, 'aria-hidden': 'true' }, '20');
    /** One of a row of radios: the arrow keys move the choice along the ones in view. */
    const radio = (row: HTMLElement, cls: string, name: string, pick: () => void, child: HTMLElement): HTMLButtonElement =>
        h(
            'button',
            {
                type: 'button',
                class: cls,
                role: 'radio',
                'aria-label': name,
                'aria-checked': 'false',
                onclick: pick,
                onkeydown: (e: KeyboardEvent) => {
                    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
                    if (!d) return;
                    e.preventDefault();
                    const all = [...row.querySelectorAll<HTMLButtonElement>('[role="radio"]')].filter(b => !b.hidden);
                    const to = all[(all.indexOf(e.currentTarget as HTMLButtonElement) + d + all.length) % all.length];
                    to?.focus();
                    to?.click();
                },
            },
            child,
        );
    const swatchRow = h('div', { class: 'dress-row swatches', role: 'radiogroup', 'aria-labelledby': 'f-dress-label' });
    const faceRow = h('div', { class: 'dress-row faces', role: 'radiogroup', 'aria-labelledby': 'f-dress-label' });
    // The colourways of the art: only a few wrappers have any (`wrappers/looks.ts`).
    const artRow = h('div', { class: 'dress-row arts', role: 'radiogroup', 'aria-labelledby': 'f-dress-label' });
    let arts: { el: HTMLButtonElement; art: number | undefined }[] = [];
    /** A square sample of a colourway: the art's own colour that stands for it. */
    const tile = (colour: string): HTMLElement => {
        const d = h('span', { class: 'art-tile', 'aria-hidden': 'true' });
        d.style.setProperty('--sw', colour);
        return d;
    };
    // What the look does to the gift's card, shown as it is chosen: an amount in the face, the main button in the accent.
    // A picture of them, not the things: it cannot be pressed and says nothing to a screen reader.
    const sample = h(
        'div',
        { class: 'dress-sample', 'aria-hidden': 'true' },
        h('span', { class: 'dress-sample-fig' }, formatXec(123456n, lang)),
        h('span', { class: 'dress-sample-unit' }, 'XEC'),
        h('span', { class: 'dress-sample-btn' }, t('pkg.take')),
    );
    /** The wrapper's own accent first (`accent` undefined), then the shared ones in the shade this wrapper's tone selects. */
    let swatches: { el: HTMLButtonElement; accent: number | undefined; near: boolean }[] = [];
    const faces = FACES.map((face, i) => ({ face, el: radio(faceRow, 'face-chip', t('create.dress.face', { n: i + 1 }), () => setLook({ ...look(), face }), figure(face)) }));
    faceRow.append(...faces.map(f => f.el));
    const quietBox = h('input', { id: 'f-quiet', class: 'check-box', type: 'checkbox' });
    const quietRow = h('label', { class: 'check check--quiet', for: 'f-quiet' }, quietBox, h('span', null, t('create.dress.quiet')));
    quietBox.addEventListener('change', () => setLook({ ...look(), quiet: quietBox.checked ? true : undefined }));
    // Looks the person saved, by their own press, to wear again on any wrapper (`ui/looks.ts`).
    const saveBtn = h('button', { type: 'button', class: 'btn btn-secondary btn-small dress-save' }, t('create.dress.save'));
    const savedRow = h('div', { class: 'dress-row looks' });
    let saved: { el: HTMLButtonElement; recipe: string }[] = [];
    saveBtn.addEventListener('click', () => {
        const plain = plainOf(draft.recipe);
        if (plain !== '' && saveLook(plain)) buildSaved();
    });
    /** The theme the looks start from: the wrapper's, in the colourway chosen (its own accent is that colourway's). */
    const ownTheme = (): WrapperDef['theme'] => {
        const b = base();
        return (b && look().art !== undefined ? dressed(b, formatRecipe({ art: look().art })) : b)?.theme;
    };
    function buildSaved(): void {
        const th = ownTheme();
        saved = loadLooks().map((recipe, i) => {
            const r = parseRecipe(recipe)!;
            // Shown as this wrapper would wear it: the shade of its tone, its own accent and face where the look names none.
            const shade = th && r.accent !== undefined ? accentFor(th, r.accent) : undefined;
            const el = h(
                'button',
                { type: 'button', class: 'look', 'aria-label': t('create.dress.saved', { n: i + 1 }), 'aria-pressed': 'false', onclick: () => setLook({ ...r, art: look().art }) },
                dot(shade?.accent ?? th?.accent ?? ''),
                figure(r.face ?? th?.face ?? 'grotesk'),
                r.quiet ? h('span', { class: 'look-mute', 'aria-hidden': 'true' }, '♪') : null,
            );
            return { el, recipe };
        });
        savedRow.replaceChildren(
            ...saved.map((s, i) =>
                h(
                    'span',
                    { class: 'look-item' },
                    s.el,
                    h(
                        'button',
                        {
                            type: 'button',
                            class: 'look-x',
                            'aria-label': t('create.dress.remove', { n: i + 1 }),
                            onclick: () => {
                                removeLook(s.recipe);
                                buildSaved();
                                (saved[Math.min(i, saved.length - 1)]?.el ?? saveBtn).focus();
                            },
                        },
                        h('span', { 'aria-hidden': 'true' }, '×'),
                    ),
                ),
            ),
        );
        savedRow.hidden = saved.length === 0;
        syncDress();
    }
    /** The swatches of the chosen wrapper. Built when the wrapper changes; a choice only moves the marks. */
    function buildDress(): void {
        const b = base();
        const th = ownTheme();
        const ways = b ? colourwaysOf(b.id) : [];
        arts = ways.length
            ? [
                  { art: undefined, el: radio(artRow, 'art-chip', t('create.dress.art.own'), () => setLook({ ...look(), art: undefined }), tile(COLOURWAYS[b!.id]!.own)) },
                  ...ways.map((w, i) => ({ art: i, el: radio(artRow, 'art-chip', t('create.dress.art', { n: i + 1 }), () => setLook({ ...look(), art: i }), tile(w.chip)) })),
              ]
            : [];
        artRow.replaceChildren(...arts.map(a => a.el));
        artRow.hidden = arts.length === 0;
        swatches = [];
        if (th) {
            swatches.push({ accent: undefined, near: false, el: radio(swatchRow, 'swatch', t('create.dress.own'), () => setLook({ ...look(), accent: undefined }), dot(th.accent)) });
            ACCENTS.forEach((_, i) => {
                const shade = accentFor(th, i)!;
                swatches.push({ accent: i, near: near(shade.accent, th.accent), el: radio(swatchRow, 'swatch', t('create.dress.colour', { n: i + 1 }), () => setLook({ ...look(), accent: i }), dot(shade.accent)) });
            });
        }
        swatchRow.replaceChildren(...swatches.map(s => s.el));
        buildSaved();
    }
    function syncDress(): void {
        const b = base();
        const r = look();
        const mark = (el: HTMLButtonElement, on: boolean): void => {
            el.setAttribute('aria-checked', String(on));
            el.tabIndex = on ? 0 : -1;
        };
        for (const s of swatches) {
            mark(s.el, s.accent === r.accent);
            // Nearly the wrapper's own colour: not offered beside it (a look that already names it still shows it).
            s.el.hidden = s.near && s.accent !== r.accent;
        }
        for (const a of arts) mark(a.el, a.art === r.art);
        const face = r.face ?? b?.theme?.face;
        for (const f of faces) mark(f.el, f.face === face);
        quietBox.checked = r.quiet === true;
        // A wrapper with no tune has none to leave out.
        quietRow.hidden = !b?.sound?.score;
        for (const s of saved) {
            const on = plainOf(draft.recipe) !== '' && plainOf(fit(parseRecipe(s.recipe))) === plainOf(draft.recipe);
            s.el.setAttribute('aria-pressed', String(on));
            s.el.parentElement?.classList.toggle('is-on', on);
        }
        saveBtn.disabled = plainOf(draft.recipe) === '' || saved.some(s => s.recipe === plainOf(draft.recipe));
    }
    // Closed until asked for. `&dress=1` (the dev demo) opens it for stills.
    const dress = fold(h('span', { id: 'f-dress-label' }, t('create.dress.title')), { id: 'create.dress', open: import.meta.env.DEV && ctx.demo?.params.get('dress') === '1' }, sample, artRow, swatchRow, faceRow, quietRow, h('div', { class: 'dress-saved' }, saveBtn, savedRow));
    dress.classList.add('dress');

    let strip: HTMLElement | null = null;
    function mountShow(dir: -1 | 0 | 1 = 0): void {
        // A preview's tune ends with its stage.
        if (previewing) score.stop();
        show?.destroy();
        const def = worn();
        show = stageCard(def);
        const fig = plate(show, def);
        if (dir !== 0 && !prefersReducedMotion()) fig.classList.add(dir > 0 ? 'car-in-next' : 'car-in-prev');
        stageHost.replaceChildren(fig);
        previewing = false;
        previewBtn.textContent = t('create.preview.play');
        previewBtn.hidden = !show.handle;
    }
    function select(id: string, dir: -1 | 0 | 1 = 0, focus = false): void {
        const changed = draft.wrapper !== id;
        draft.wrapper = id;
        // A look was chosen on one wrapper, seen on it: the next one starts as its maker left it.
        if (changed) draft.recipe = '';
        tabs.forEach(tab => {
            const on = tab.dataset.id === id;
            tab.setAttribute('aria-checked', String(on));
            tab.tabIndex = on ? 0 : -1;
            if (on && focus) tab.focus();
            // The chosen case is brought to the middle of the strip (sideways only: the page does not jump).
            if (on && strip && typeof strip.scrollTo === 'function') strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        });
        if (changed || !show) mountShow(changed ? dir : 0);
        if (changed) {
            buildDress();
            validate();
        }
    }
    function step(d: -1 | 1, focus = false): void {
        if (WRAPPERS.length < 2) return;
        const i = Math.max(0, WRAPPERS.findIndex(w => w.id === draft.wrapper));
        select(WRAPPERS[(i + d + WRAPPERS.length) % WRAPPERS.length]!.id, d, focus);
    }
    previewBtn.addEventListener('click', () => {
        if (!show?.handle) return;
        if (previewing) {
            // Back to the closed wrapper, idle loop and all: a fresh stage.
            mountShow();
            previewBtn.focus();
            return;
        }
        previewing = true;
        previewBtn.textContent = t('create.preview.reset');
        // As the gift will sound: the wrapper's tune, or only the small opening sound when the giver chose quiet.
        cue.open();
        void show.handle.open().catch(() => {});
    });

    for (const def of WRAPPERS) {
        // A small glass case: a window onto the wrapper's own scene, wearing the wrapper's own colours, its name under it.
        const art = h('div', { class: 'case-art', 'aria-hidden': 'true' });
        art.style.setProperty('--ar', String(def.size[0] / def.size[1]));
        art.style.setProperty('--fx', String(def.focus?.[0] ?? 0.5));
        art.style.setProperty('--fy', String(def.focus?.[1] ?? 0.5));
        art.style.setProperty('--door-bg', def.backdrop);
        cases.push({ def, art, card: null });
        const tab = h(
            'button',
            {
                type: 'button',
                class: 'pick case',
                role: 'radio',
                'data-id': def.id,
                'aria-checked': 'false',
                onclick: () => {
                    const from = WRAPPERS.findIndex(w => w.id === draft.wrapper);
                    const to = WRAPPERS.findIndex(w => w.id === def.id);
                    select(def.id, to >= from ? 1 : -1);
                },
                onkeydown: (e: KeyboardEvent) => {
                    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
                    if (!d) return;
                    e.preventDefault();
                    step(d, true);
                },
            },
            art,
            h('span', { class: 'case-name' }, inLang(def.name, lang)),
            // A wrapper that costs something says so under its name; a free one says nothing.
            offerOf(def).kind === 'paid' ? h('span', { class: 'case-price' }, priceOf(def)) : null,
        );
        applyTheme(def, tab);
        tabs.push(tab);
    }
    select(draft.wrapper);
    buildDress();

    // Swipe the stage to change wrapper. Vertical scrolling stays the page's.
    let downX = 0;
    let downY = 0;
    let tracking = false;
    const showroom = h(
        'div',
        {
            class: 'showroom',
            onpointerdown: (e: PointerEvent) => {
                tracking = true;
                downX = e.clientX;
                downY = e.clientY;
            },
            onpointerup: (e: PointerEvent) => {
                if (!tracking) return;
                tracking = false;
                const dx = e.clientX - downX;
                const dy = e.clientY - downY;
                if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
            },
            onpointercancel: () => {
                tracking = false;
            },
        },
        stageHost,
        WRAPPERS.length > 1 ? h('button', { type: 'button', class: 'car-nav car-prev', 'aria-label': t('create.pick.prev'), onclick: () => step(-1) }, h('span', { 'aria-hidden': 'true' }, '‹')) : null,
        WRAPPERS.length > 1 ? h('button', { type: 'button', class: 'car-nav car-next', 'aria-label': t('create.pick.next'), onclick: () => step(1) }, h('span', { 'aria-hidden': 'true' }, '›')) : null,
    );

    // The cases under the stage; the last one is the workshop's, not a control.
    for (const c of cases) {
        if (seen) seen.observe(c.art);
        else fillCase(c);
    }
    const picker =
        WRAPPERS.length > 0
            ? h(
                  'div',
                  { class: 'picks-wrap' },
                  h('p', { class: 'label pick-head' }, h('span', { id: 'f-wrapper-label' }, t('create.wrapper.label')), priceChip),
                  (strip = h(
                      'div',
                      { class: 'picks-row cases' },
                      h('div', { class: 'picks', role: 'radiogroup', 'aria-labelledby': 'f-wrapper-label' }, ...tabs),
                      // The last case is not a wrapper: it stands for the ones that are not made yet.
                      h(
                          'span',
                          { class: 'pick case pick--workshop', title: t('create.workshop.body') },
                          h('span', { class: 'case-art case-art--soon', 'aria-hidden': 'true' }, '+'),
                          h('span', { class: 'case-name' }, t('create.workshop.name'), h('span', { class: 'pick-soon' }, t('create.workshop.soon'))),
                      ),
                  )),
                  priceNote,
                  previewBtn,
                  dress,
              )
            : null;
    // The chosen case is brought into view once the strip is on the page (it was chosen before the strip existed).
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
            const on = tabs.find(tab => tab.getAttribute('aria-checked') === 'true');
            if (!disposed && on && strip && typeof strip.scrollTo === 'function') strip.scrollTo({ left: on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2, behavior: 'auto' });
        });
    }

    const truths = h(
        'div',
        { class: 'truths-wrap' },
        h('p', { class: 'label' }, t('create.truth.label')),
        h('ul', { class: 'truths' }, h('li', null, t('create.truth.1')), h('li', null, t('create.truth.2')), h('li', null, t('create.truth.3'))),
    );

    /** `sats` is what the package is funded with; `covered` the part of it added for the recipient's fee. */
    async function create(sats: bigint, covered: bigint): Promise<void> {
        const tokenOnly = draft.tokenOnly && sats === FLOOR_SATS;
        errBox.textContent = '';
        try {
            // The key is made here, on the deliberate press, and nowhere earlier.
            const secret = newSecret();
            const wrapper = draft.wrapper || DEFAULT_WRAPPER;
            const text = wish.value.trim();
            const riddle = draft.riddleOn ? question.value.trim() : undefined;
            // The table with one row: one gift, with the name the giver gave it.
            const only = people.active() && people.rows().length === 1 ? people.rows()[0]! : null;
            const name = only !== null ? keepableName(only.name) : undefined;
            let root = secret;
            if (riddle !== undefined) {
                // A locked gift: the key comes from the secret and the answer, through a deliberately slow hash.
                working = true;
                showSubmit();
                root = await track(riddleRoot(secret, answer.value));
                if (disposed) return;
            }
            const key = deriveKey(root);
            // The look goes into the link in its one spelling, or not at all.
            const recipe = formatRecipe(parseRecipe(draft.recipe));
            const link = encodeLink({ version: 1, secret, wrapper, recipe, wish: text === '' ? undefined : text, riddle, ...(riddle !== undefined && !draft.riddleHide ? { spot: key.pkh } : {}) }, location.origin);
            setMade({ secret, key, link, sats, wrapper, riddle, ...(recipe !== undefined ? { recipe } : {}), ...(text !== '' ? { wish: text } : {}), ...(tokenOnly ? { tokenOnly: true } : {}), ...(covered > 0n ? { feeCovered: covered } : {}), ...(draft.withToken && !tokenOnly ? { withToken: true } : {}), ...(name !== undefined ? { name } : {}), saved: false });
        } catch {
            working = false;
            if (disposed) return;
            errBox.textContent = t('create.error');
            showSubmit();
            return;
        }
        working = false;
        draft.amount = '';
        draft.tokenOnly = false;
        draft.coverFee = coversFee();
        draft.withToken = false;
        draft.wish = '';
        draft.riddleOn = false;
        draft.riddleHide = false;
        draft.question = '';
        draft.answer = '';
        draft.people = [];
        draft.peopleOpen = false;
        draft.oneLink = false;
        ctx.nav.toCreated();
    }

    /**
     * Several gifts by one press. `rowSats` are the gifts themselves; the fee the giver covers is added to each.
     * Each gift gets its own secret and link, or (one link for all) one secret and a key from each row's answer.
     */
    async function createBatch(rowSats: readonly bigint[]): Promise<void> {
        errBox.textContent = '';
        const rows = people.rows().map(r => ({ ...r }));
        const covered = draft.coverFee ? fee() : 0n;
        try {
            working = true;
            showSubmit();
            const wrapper = draft.wrapper || DEFAULT_WRAPPER;
            const text = wish.value.trim();
            const riddle = draft.riddleOn ? question.value.trim() : undefined;
            const recipe = formatRecipe(parseRecipe(draft.recipe));
            const one = riddle !== undefined && draft.oneLink;
            const shared = one ? newSecret() : null;
            const common = { version: 1 as const, wrapper, recipe, wish: text === '' ? undefined : text, riddle };
            const gifts: BatchGift[] = [];
            // One link for all: the slow hash once for each different answer, and a slot for each row that uses it.
            const roots = new Map<string, Uint8Array>();
            const slots = new Map<string, number>();
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]!;
                submitWhy.textContent = t('people.making', { i: i + 1, n: rows.length });
                // The keys are made here, on the deliberate press, and nowhere earlier.
                const secret = shared ?? newSecret();
                let root = secret;
                // A locked gift: the slow hash, once for each (the salt is each gift's own secret, or the answer differs).
                const own = riddle !== undefined && normaliseAnswer(row.answer) !== '';
                let slot = 0;
                if (one) {
                    const a = normaliseAnswer(row.answer);
                    const known = roots.get(a);
                    root = known ?? (await track(riddleRoot(secret, row.answer)));
                    roots.set(a, root);
                    slot = slots.get(a) ?? 0;
                    slots.set(a, slot + 1);
                } else if (riddle !== undefined) root = await track(riddleRoot(secret, own ? row.answer : answer.value));
                if (disposed) return;
                const key = deriveKey(root, slot);
                const link = one ? undefined : encodeLink({ ...common, secret, ...(riddle !== undefined && !draft.riddleHide ? { spot: key.pkh } : {}) }, location.origin);
                gifts.push({ name: keepableName(row.name) ?? '', key, sats: rowSats[i]! + covered, ...(link !== undefined ? { link } : {}), ...(own ? { own: true } : {}) });
            }
            // Two gifts at one address would be one gift: each row has its own secret, answer or slot, and it is refused if it ever happens.
            if (new Set(gifts.map(g => g.key.address)).size !== gifts.length) throw new Error('Two gifts share a key');
            setBatch({
                kind: one ? 'answers' : 'links',
                gifts,
                // One link for all carries no address: there are several.
                // Unless the giver hides it, the link names where every gift is, so that a page can say how many are left.
                ...(one ? { link: encodeLink({ ...common, secret: shared!, many: true, ...(draft.riddleHide ? {} : { spots: gifts.map(g => g.key.pkh) }) }, location.origin) } : {}),
                wrapper,
                ...(recipe !== undefined ? { recipe } : {}),
                ...(text !== '' ? { wish: text } : {}),
                ...(riddle !== undefined ? { riddle } : {}),
                ...(covered > 0n ? { feeCovered: covered } : {}),
                ...(draft.withToken ? { withToken: true } : {}),
                at: Date.now(),
                saved: false,
                opened: false,
            });
        } catch {
            working = false;
            if (disposed) return;
            errBox.textContent = t('create.error');
            showSubmit();
            return;
        }
        working = false;
        draft.amount = '';
        draft.coverFee = coversFee();
        draft.withToken = false;
        draft.wish = '';
        draft.riddleOn = false;
        draft.riddleHide = false;
        draft.question = '';
        draft.answer = '';
        draft.people = [];
        draft.peopleOpen = false;
        draft.oneLink = false;
        ctx.nav.toCreated();
    }

    /** Several gifts, read back before they are made: who, how much, and each answer that is a row's own. */
    function showConfirmBatch(rowSats: readonly bigint[]): void {
        const sig = tableSig();
        const covered = draft.coverFee ? fee() : 0n;
        const total = rowSats.reduce((a, b) => a + b + covered, 0n);
        const hold = holdButton({
            label: t('create.confirm.hold'),
            again: t('create.confirm.again'),
            twoPress: prefersReducedMotion(),
            onDone: () => {
                // Made from the form as it now stands: it must still be valid, and still what was read back.
                const v = validate();
                if (!v.multi || v.rowSats === null || v.rowSats.length < 2 || !v.wishOk || !v.riddleOk || tableSig() !== sig) return showSubmit();
                void createBatch(v.rowSats);
            },
        });
        const back = h('button', { type: 'button', class: 'btn btn-quiet', onclick: showSubmit }, t('create.confirm.cancel'));
        const anyOwn = draft.riddleOn && people.rows().some(r => normaliseAnswer(r.answer) !== '');
        /** How many rows have this row's answer. */
        const sameAs = (i: number): number => people.rows().filter(r => normaliseAnswer(r.answer) === normaliseAnswer(people.rows()[i]!.answer)).length;
        const lines = people.rows().map((r, i) => {
            const own = draft.riddleOn && normaliseAnswer(r.answer) !== '';
            return h(
                'li',
                { class: 'confirm-row' },
                h('span', { class: 'confirm-who' }, keepableName(r.name) ?? t('people.nth', { n: i + 1 })),
                // The gift itself, as typed; the fee the giver adds is said once, with the total.
                h('span', { class: 'confirm-amt mono' }, `${formatXec(rowSats[i]!, lang)} XEC`),
                own ? h('span', { class: 'confirm-ans' }, t('people.confirm.answer', { answer: normaliseAnswer(r.answer) })) : draft.riddleOn ? h('span', { class: 'confirm-ans' }, t('people.confirm.shared')) : null,
                // One link for all: a row whose answer another row has too is one of several gifts behind that answer.
                draft.oneLink && own && sameAs(i) > 1 ? h('span', { class: 'confirm-ans' }, t('people.confirm.slot', { n: sameAs(i) })) : null,
            );
        });
        const totalRow = h(
            'li',
            { class: 'confirm-row confirm-total' },
            h('span', { class: 'confirm-who' }, t('people.confirm.total')),
            h('span', { class: 'confirm-amt mono' }, `${formatXec(total, lang)} XEC`),
            covered > 0n ? h('span', { class: 'confirm-ans' }, t('people.confirm.fee', { fee: formatXec(covered * BigInt(rowSats.length), lang) })) : null,
        );
        // Answers that are a row's own are shown here for the last time: the press waits for the giver to say they are written down.
        const wrote = h('input', { id: 'f-wrote', class: 'check-box', type: 'checkbox' });
        const wroteRow = anyOwn ? h('label', { class: 'check', for: 'f-wrote' }, wrote, h('span', null, t('people.confirm.wrote'))) : null;
        if (anyOwn) {
            hold.disabled = true;
            wrote.addEventListener('change', () => (hold.disabled = !wrote.checked));
        }
        finishHost.replaceChildren(
            h(
                'div',
                { class: 'confirm-step', role: 'group', 'aria-label': t('create.confirm.title') },
                label(t('create.confirm.title')),
                h('p', { class: 'confirm-body' }, t('people.confirm.body', { n: rowSats.length, total: formatXec(total, lang), wrapper: nameOf(wrapperById(draft.wrapper)) })),
                h('ol', { class: 'confirm-list' }, ...lines, totalRow),
                anyOwn ? h('p', { class: 'warning danger' }, t('people.confirm.answers')) : null,
                wroteRow,
                hold,
                back,
            ),
        );
        form.classList.add('is-confirming');
        (anyOwn ? wrote : hold).focus();
    }

    function showSubmit(): void {
        finishHost.replaceChildren(submit, submitWhy);
        form.classList.remove('is-confirming');
        validate();
    }

    /** The question, in place of the Create button: the amount restated, the truths in view, and a held press. */
    function showConfirm(sats: bigint, covered: bigint): void {
        const name = nameOf(wrapperById(draft.wrapper));
        const hold = holdButton({
            label: t('create.confirm.hold'),
            again: t('create.confirm.again'),
            twoPress: prefersReducedMotion(),
            onDone: () => {
                // The form stays editable under the question. The gift is made from the form as it now stands, so it must
                // still be valid (a changed riddle answer still matches its repeat) and the amount must be the one confirmed.
                const v = validate();
                const amt = oneAmount(v);
                if (amt === null || !v.wishOk || !v.riddleOk || funded(amt) !== sats) return showSubmit();
                void create(sats, covered);
            },
        });
        const back = h('button', { type: 'button', class: 'btn btn-quiet', onclick: showSubmit }, t('create.confirm.cancel'));
        finishHost.replaceChildren(
            h(
                'div',
                { class: 'confirm-step', role: 'group', 'aria-label': t('create.confirm.title') },
                label(t('create.confirm.title')),
                h('p', { class: 'confirm-body' }, t('create.confirm.body', { amount: formatXec(sats, lang), wrapper: name })),
                hold,
                back,
            ),
        );
        form.classList.add('is-confirming');
        hold.focus();
    }

    const form = h(
        'form',
        {
            class: 'create-form',
            novalidate: true,
            onsubmit: (e: Event) => {
                e.preventDefault();
                const v = validate();
                if (working || !v.wishOk || !v.riddleOk) return;
                // Two rows or more: several gifts, always read back first.
                if (v.multi && v.rowSats !== null && v.rowSats.length >= 2) return showConfirmBatch(v.rowSats);
                const sats = oneAmount(v);
                if (sats === null) return;
                const total = funded(sats);
                if (needsConfirm(total)) showConfirm(total, total - sats);
                else void create(total, total - sats);
            },
        },
        layout({
            kind: 'create',
            plate: showroom,
            head: [
                backBtn,
                h('h1', null, t('create.title')),
            ],
            body: [
                picker,
                amountBeat,
                h('div', { class: 'beat field' }, h('label', { class: 'label', for: 'f-wish' }, t('create.wish.label')), wish, meter, wishCount),
                options,
                truths,
                confirmRow,
                errBox,
                finishHost,
            ],
        }),
    );
    root.append(h('section', { class: 'screen screen-create' }, form));
    validate();
    return () => {
        disposed = true;
        seen?.disconnect();
        for (const c of cases) c.card?.destroy();
        // The tune of a preview does not follow the giver to the next screen.
        if (previewing) score.stop();
        show?.destroy();
    };
}
