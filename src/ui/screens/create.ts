import { applyTheme } from '../theme';
import type { WrapperDef } from '../../stage';
import type { Recipe, RecipeFace } from '../../core';
import { CONFIRM_SATS, DEFAULT_WRAPPER, FLOOR_SATS, RIDDLE_MAX_BYTES, WISH_MAX_BYTES, deriveKey, encodeLink, formatRecipe, formatXec, newSecret, parseRecipe, takeFeeEstimate, normaliseAnswer, parseXec, riddleBytes, riddleRoot, whyNotXec, wishBytes } from '../../core';
import { WRAPPERS, offerOf, wrapperById, inLang } from '../../wrappers';
import { thumbUrl } from '../../wrappers/artUrl';
import { ACCENTS, COLOURWAYS, accentFor, colourwaysOf, dressed } from '../../wrappers/looks';
import { plate } from '../plate';
import { stageCard, prefersReducedMotion, type StageCard } from '../stageCard';
import { h } from '../dom';
import type { Dispose } from '../dom';
import type { Ctx } from '../ctx';
import { getLang, t } from '../../i18n';
import { setMade } from '../session';
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
        // A gift that is a token: the package holds only the least XEC, which pays the recipient's way home.
        h(
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
        ),
    );
    // The network fee, said before the gift exists: what the recipient will get, and a way for the giver to pay it.
    // A gift that will also carry a token costs more to take home: the giver says so here, so the figures are right.
    const fee = (): bigint => takeFeeEstimate(draft.withToken);
    const tokBox = h('input', { id: 'f-withtoken', class: 'check-box', type: 'checkbox' });
    tokBox.checked = draft.withToken;
    const tokRow = h('label', { class: 'check check--fee', for: 'f-withtoken', hidden: true }, tokBox, h('span', null, t('create.fee.token')));
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
    // The link of a locked gift names the gift's address, so that the page can say "still here" or "already taken"
    // before anyone answers. The giver may leave that out: then nothing is known until the right answer.
    const hideBox = h('input', { id: 'f-riddle-hide', class: 'check-box', type: 'checkbox' });
    hideBox.checked = draft.riddleHide;
    hideBox.addEventListener('change', () => (draft.riddleHide = hideBox.checked));
    const hideRow = h('label', { class: 'check check--riddle', for: 'f-riddle-hide' }, hideBox, h('span', null, h('span', null, t('create.riddle.hide')), h('span', { class: 'check-why' }, ' ' + t('create.riddle.hide.why'))));
    const riddleFields = h(
        'div',
        { class: 'riddle-fields' },
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-riddle-q' }, t('create.riddle.q.label')), question, riddleMsg),
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-riddle-a' }, t('create.riddle.a.label')), answer, h('p', { id: 'f-riddle-hint', class: 'field-msg' }, t('create.riddle.a.hint')), answerWeak),
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-riddle-a2' }, t('create.riddle.a2.label')), answer2, answer2Msg),
        hideRow,
        // Two honest limits, said before the gift exists.
        h('p', { class: 'warning' }, t('create.riddle.limit')),
        h('p', { class: 'warning danger' }, t('create.riddle.forget')),
    );
    riddleFields.hidden = !draft.riddleOn;
    const riddleRow = h('label', { class: 'check check--riddle', for: 'f-riddle' }, riddleBox, h('span', null, h('span', null, t('create.riddle.toggle')), h('span', { class: 'check-why' }, ' ' + t('create.riddle.why'))));
    riddleBox.addEventListener('change', () => {
        draft.riddleOn = riddleBox.checked;
        riddleFields.hidden = !draft.riddleOn;
        validate();
        if (draft.riddleOn) {
            riddleFields.dispatchEvent(new CustomEvent('cap:show', { bubbles: true }));
            question.focus();
        }
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
    function validate(): { sats: bigint | null; wishOk: boolean; riddleOk: boolean } {
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
        // "Token only" holds while the amount is the least one; any other figure is an ordinary gift again.
        if (sats !== FLOOR_SATS) draft.tokenOnly = false;
        tokenOnlyNote.hidden = !draft.tokenOnly;
        // An ordinary gift says what arrives. (A token-only gift's XEC is all fee; its own note says so.)
        const showFee = sats !== null && !draft.tokenOnly;
        feeNote.hidden = !showFee;
        feeRow.hidden = !showFee;
        tokRow.hidden = !showFee;
        const FEE = fee();
        feeLabel.textContent = t('create.fee.toggle', { fee: formatXec(FEE, lang) });
        if (sats !== null && showFee)
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
        const forced = sats !== null && funded(sats) >= CONFIRM_SATS;
        confirmBox.disabled = forced;
        confirmBox.checked = forced || wantConfirm;
        confirmWhy.textContent = forced ? ' ' + t('create.confirm.forced', { min: formatXec(CONFIRM_SATS, lang) }) : '';

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
        const riddleOk = !draft.riddleOn || (qBytes > 0 && !qOver && same);
        const mismatch = draft.riddleOn && answer2.value.trim() !== '' && !same;
        answer2Msg.textContent = mismatch ? t('create.riddle.a2.diff') : '';
        answerWeak.hidden = !(draft.riddleOn && isWeakAnswer(answer.value));
        answer2Msg.classList.toggle('field-msg--bad', mismatch);
        for (const f of [question, answer, answer2, riddleBox, hideBox]) f.disabled = working;
        riddleMsg.textContent = draft.riddleOn && qOver ? t('create.riddle.over') : '';
        riddleMsg.classList.toggle('field-msg--bad', draft.riddleOn && qOver);
        submit.disabled = working || sats === null || !wishOk || !riddleOk;
        submitWhy.textContent = working
            ? t('create.working')
            : sats === null
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
        priceNote.textContent = offer.kind === 'paid' ? t('create.price', { price: formatXec(offer.sats, lang) }) : '';
        priceChip.textContent = chosen ? priceOf(chosen) : '';
        priceChip.hidden = !chosen;
        return { sats, wishOk, riddleOk };
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
            setMade({ secret, key, link, sats, wrapper, riddle, ...(recipe !== undefined ? { recipe } : {}), ...(text !== '' ? { wish: text } : {}), ...(tokenOnly ? { tokenOnly: true } : {}), ...(covered > 0n ? { feeCovered: covered } : {}), ...(draft.withToken && !tokenOnly ? { withToken: true } : {}), saved: false });
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
    draft.coverFee = false;
    draft.withToken = false;
        draft.wish = '';
        draft.riddleOn = false;
        draft.riddleHide = false;
        draft.question = '';
        draft.answer = '';
        ctx.nav.toCreated();
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
                if (v.sats === null || !v.wishOk || !v.riddleOk || funded(v.sats) !== sats) return showSubmit();
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
                const { sats, wishOk, riddleOk } = validate();
                if (working || sats === null || !wishOk || !riddleOk) return;
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
                h('div', { class: 'beat' }, amountField, chips, amountMsg, tokenOnlyNote, feeNote, tokRow, feeRow),
                h('div', { class: 'beat field' }, h('label', { class: 'label', for: 'f-wish' }, t('create.wish.label')), wish, meter, wishCount),
                h('div', { class: 'beat riddle' }, riddleRow, riddleFields),
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
