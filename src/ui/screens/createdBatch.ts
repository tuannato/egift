import { DEFAULT_WRAPPER, batchFundLinks, batchTokenFundLinks, entitlement, formatXec, fundLinks, stampedFundLinks, takeFeeEstimate } from '../../core';
import type { FundLinks, PackageState, TokenMeta } from '../../core';
import { cutTokenText, tokenIcon, tokenIdRef } from '../tokens';
import { autoKeep, dressOf, rememberSent } from '../kept';
import { offerOf, wrapperById } from '../../wrappers';
import { appRoad, isInAppBrowser } from '../inapp';
import { dressed } from '../../wrappers/looks';
import { stageCard } from '../stageCard';
import { h, openOut } from '../dom';
import { copyRef } from '../copyRef';
import { shortId } from '../amount';
import type { Dispose } from '../dom';
import type { Ctx } from '../ctx';
import { getLang, t } from '../../i18n';
import { clearBatch, getBatch } from '../session';
import type { BatchGift } from '../session';
import { copyText, linkBox, linkButtons } from '../linkBox';
import { qrPanel } from './qr';
import { plate } from '../plate';
import { fold, layout, stepRow } from '../layout';
import { amountBlock } from '../amount';
import { setUserText } from '../text';

/** A QR of a longer request is too dense for a phone's camera at arm's length: then the QR is not offered. */
export const FUND_QR_MAX_CHARS = 420;
/** How often every gift is asked about again while the screen is up (the first gift is also watched live). */
const POLL_MS = 20_000;
/** Once every gift is funded, the waits between reads: each longer than the last, the last one kept. */
const QUIET_MS = [60_000, 120_000, 300_000] as const;

/**
 * Screen B for several gifts made by one press. Only reachable in the session that made the keys.
 *
 * One request funds them all (and pays a paid wrapper once): there is no funding of one gift by itself, except
 * for a gift the wallet left out. The gifts are a list of rows; a row holds its own link (or, when all share one
 * link, nothing to send: the link is one, above). Nothing here is written to storage but the giver's own record of
 * each gift once it is seen funded: where it is, what was meant to go in, and the name the giver gave it.
 */
export function mountCreatedBatch(root: HTMLElement, ctx: Ctx): Dispose {
    const batch = getBatch();
    if (!batch) {
        ctx.nav.toCreate();
        return () => {};
    }
    const lang = getLang();
    const n = batch.gifts.length;
    const chosen = wrapperById(batch.wrapper);
    const def = chosen ? dressed(chosen, batch.recipe) : wrapperById(DEFAULT_WRAPPER);
    const card = stageCard(def);
    const offer = def ? offerOf(def) : ({ kind: 'free' } as const);
    const giftSum = batch.gifts.reduce((s, g) => s + g.sats, 0n);
    const total = giftSum + (offer.kind === 'paid' ? offer.sats : 0n);
    const label = (g: BatchGift, i: number): string => (g.name !== '' ? g.name : t('people.nth', { n: i + 1 }));

    /** The one request that funds every gift, and pays the wrapper once when it has a price. */
    const fundAll = (gifts: readonly BatchGift[]): FundLinks => {
        const list = gifts.map(g => ({ address: g.key.address, sats: g.sats }));
        if (gifts.length === 1) return offer.kind === 'paid' && def ? stampedFundLinks({ address: list[0]!.address, sats: list[0]!.sats, wrapper: def.id, offer }) : fundLinks(list[0]!.address, list[0]!.sats);
        return batchFundLinks({ gifts: list, ...(offer.kind === 'paid' && def ? { paid: { wrapper: def.id, offer } } : {}) });
    };

    // ---- What the chain says of each gift ----
    const states: (PackageState | null)[] = batch.gifts.map(() => null);
    /** Seen funded at least once: a gift that was then taken stays "funded" for the count of what the giver paid in. */
    const seenFunded: boolean[] = batch.gifts.map(() => false);
    const recorded: boolean[] = batch.gifts.map(() => false);
    const fundedCount = (): number => seenFunded.filter(Boolean).length;

    // ---- Step 1: save ----
    const lines = (): string =>
        batch.kind === 'answers'
            ? [batch.link!, '', ...batch.gifts.map((g, i) => `${i + 1}. ${label(g, i)} — ${formatXec(g.sats, lang)} XEC`)].join('\n')
            : batch.gifts.map((g, i) => `${i + 1}. ${label(g, i)} — ${formatXec(g.sats, lang)} XEC\n${g.link!}`).join('\n\n');
    const saveMsg = h('p', { class: 'small', role: 'status', 'aria-live': 'polite' });
    const fundHint = h('p', { class: 'btn-reason' }, t('batch.step2.locked'));
    const fundBtns: HTMLButtonElement[] = [];
    let keptSinceFunded = false;
    const unlock = (): void => {
        batch.saved = true;
        download.classList.replace('btn-primary', 'btn-secondary');
        if (fundedCount() > 0) keptSinceFunded = true;
        fundBtns.forEach(b => (b.disabled = false));
        fundHint.hidden = true;
        skip.hidden = true;
        skipAsk.hidden = true;
        paintTok();
    };
    // The whole list in one piece: a file, or one copy. A copy of one row is not a saved batch (the clipboard holds
    // one thing; the next copy replaces it).
    const allBox = h('textarea', { class: 'linkbox batch-all', readonly: true, rows: 5, spellcheck: 'false', 'aria-label': t('batch.save.all') });
    allBox.value = lines();
    allBox.hidden = true;
    const tick = h('input', { type: 'checkbox', class: 'check-box' });
    const manual = h('label', { class: 'check', hidden: true }, tick, h('span', null, t('link.manual')));
    tick.addEventListener('change', () => {
        if (tick.checked) unlock();
    });
    const byHand = (): void => {
        allBox.hidden = false;
        allBox.select();
        manual.hidden = false;
        saveMsg.textContent = t('link.copyfail');
    };
    const download = h(
        'button',
        {
            type: 'button',
            // The thing to press first, until something is saved.
            class: 'btn btn-primary',
            onclick: () => {
                try {
                    const url = URL.createObjectURL(new Blob([lines() + '\n'], { type: 'text/plain;charset=utf-8' }));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'gift-links.txt';
                    document.body.append(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 10_000);
                    // Inside another app's browser a download often does nothing and says nothing.
                    if (isInAppBrowser()) return byHand();
                    unlock();
                    saveMsg.textContent = t('batch.save.downloaded');
                } catch {
                    byHand();
                }
            },
        },
        t('batch.save.download'),
    );
    const copyAll = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary',
            onclick: () => {
                const done = (ok: boolean): void => {
                    if (!ok) return byHand();
                    unlock();
                    saveMsg.textContent = t('batch.save.copied');
                };
                void copyText(lines()).then(done, () => done(false));
            },
        },
        t('batch.save.copy'),
    );
    // Not saving is the giver's own risk to take, said in full first; the choice is for this batch only.
    const skipAsk = h(
        'div',
        { class: 'batch-skip-ask', hidden: true },
        h('p', { class: 'warning danger' }, t('batch.skip.warn')),
        h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => unlock() }, t('batch.skip.yes')),
    );
    const skip = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-quiet btn-small batch-skip',
            onclick: () => {
                skipAsk.hidden = false;
                skip.hidden = true;
            },
        },
        t('batch.skip'),
    );
    const saveStep =
        batch.kind === 'answers'
            ? [h('p', null, t('batch.one.body', { n })), linkBox({ link: batch.link!, onSaved: unlock })]
            : [h('p', null, t('batch.save.body', { n })), h('p', { class: 'warning' }, t('batch.save.warn', { n })), h('div', { class: 'btn-row btn-row--equal' }, download, copyAll), saveMsg, allBox, manual];

    // ---- Step 2: one request for all ----
    let links: FundLinks;
    try {
        links = fundAll(batch.gifts);
    } catch {
        // Cannot be: the create step refuses what the request cannot hold. If it ever is, the keys are let go rather than the screen stuck.
        card.destroy();
        clearBatch();
        ctx.nav.toCreate();
        return () => {};
    }
    const openAsk = h('p', { class: 'warning', hidden: true }, t('batch.fund.again'));
    const fundBtn = (text: string, url: () => string): HTMLButtonElement => {
        const b = h('button', { type: 'button', class: 'btn btn-primary', disabled: !batch.saved }, text);
        let armed = false;
        b.addEventListener('click', () => {
            // Once any gift is funded the whole request is never sent again (the buttons are also put away).
            if (!batch.saved || fundedCount() > 0) return;
            // A second press of the same request would fund everything twice: asked first, every time.
            if (batch.opened && !armed) {
                armed = true;
                openAsk.hidden = false;
                b.textContent = t('batch.fund.sure');
                return;
            }
            armed = false;
            b.textContent = text;
            openAsk.hidden = true;
            batch.opened = true;
            // Synchronous: iOS blocks window.open after an await.
            openOut(url());
        });
        return b;
    };
    const webBtn = fundBtn(t('created.fund.web'), () => links.web);
    const appBtn = fundBtn(t('created.fund.app'), () => appRoad(links));
    fundBtns.push(webBtn, appBtn);
    const qrHost = h('div', { class: 'qr-host' });
    let qrOpen = false;
    // A request too long to scan is not offered as a QR at all.
    const qrBtn =
        links.bip21.length <= FUND_QR_MAX_CHARS
            ? h(
                  'button',
                  {
                      type: 'button',
                      class: 'btn btn-secondary',
                      disabled: !batch.saved,
                      onclick: () => {
                          if (!batch.saved || fundedCount() > 0) return;
                          qrOpen = !qrOpen;
                          // A wallet may pay from the QR: the buttons then ask before opening one again.
                          if (qrOpen) batch.opened = true;
                          qrHost.replaceChildren(...(qrOpen ? [qrPanel({ text: links.bip21, title: t('batch.fund.qr.title', { n }) })] : []));
                      },
                  },
                  t('created.fund.qr'),
              )
            : null;
    if (qrBtn) fundBtns.push(qrBtn);
    let demoBtn: HTMLButtonElement | null = null;
    if (import.meta.env.DEV && ctx.demo) {
        const demo = ctx.demo;
        demoBtn = h(
            'button',
            {
                type: 'button',
                class: 'btn btn-demo',
                disabled: !batch.saved,
                onclick: () => {
                    if (batch.saved) for (const g of batch.gifts) demo.chain.fund(g.key.address, g.sats);
                },
            },
            t('created.fund.demo'),
        );
        fundBtns.push(demoBtn);
    }

    // ---- One token for all the gifts (optional): its own request, since a wallet sends tokens and XEC apart ----
    const tokId = h('input', { id: 'f-btok-id', class: 'input mono', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-describedby': 'f-btok-msg' });
    const tokQty = h('input', { id: 'f-btok-qty', class: 'input', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-describedby': 'f-btok-msg' });
    const tokMsg = h('p', { id: 'f-btok-msg', class: 'field-msg', role: 'status', 'aria-live': 'polite' });
    // What the token id names, read from the chain as soon as the id is whole. A stranger's text: `setUserText`.
    const tokName = h('p', { class: 'token-found', role: 'status', 'aria-live': 'polite', hidden: true });
    let tokMeta: TokenMeta | null | undefined;
    let metaSeq = 0;
    const tokIdValue = (): string | null => {
        const id = tokId.value.trim().toLowerCase();
        return /^[0-9a-f]{64}$/.test(id) ? id : null;
    };
    /** The request that sends this token to every gift, or null while the id or the quantity is not one. */
    const tokLinks = (): FundLinks | null => {
        const id = tokIdValue();
        // Not for an id the chain does not know, nor for more decimals than the token has: Cashtab would refuse both.
        if (id === null || tokMeta === null) return null;
        const qty = tokQty.value.trim();
        if (tokMeta !== undefined && (qty.split('.')[1] ?? '').length > tokMeta.decimals) return null;
        try {
            return batchTokenFundLinks({ gifts: batch.gifts.map(g => ({ address: g.key.address, qty })), tokenId: id });
        } catch {
            return null;
        }
    };
    async function lookupToken(): Promise<void> {
        const mine = ++metaSeq;
        const id = tokIdValue();
        tokMeta = undefined;
        tokName.hidden = true;
        tokName.replaceChildren();
        if (id === null) return paintTok();
        let meta: TokenMeta | null | undefined;
        try {
            meta = await ctx.chain.tokenMeta?.(id);
        } catch {
            meta = undefined;
        }
        if (disposed || mine !== metaSeq) return;
        tokMeta = meta;
        tokName.hidden = false;
        if (meta === undefined) tokName.textContent = t('created.tok.unread');
        else if (meta === null) tokName.textContent = t('created.tok.notfound');
        else {
            const ticker = h('span', { class: 'token-ticker' });
            setUserText(ticker, cutTokenText(meta.ticker));
            const name = h('span', { class: 'token-name' });
            setUserText(name, cutTokenText(meta.name));
            tokName.append(tokenIcon(id) ?? '', ticker, ' ', name, h('span', { class: 'note' }, tokenIdRef(id, ' · ')));
        }
        paintTok();
    }
    /** The request as it would be sent now: what a second opening is held against. */
    const tokSig = (): string => `${tokIdValue() ?? ''}|${tokQty.value.trim()}`;
    const tokAsk = h('p', { class: 'strong', hidden: true }, t('batch.fund.again'));
    const tokBtn = (text: string, url: (l: FundLinks) => string): HTMLButtonElement => {
        const b = h('button', { type: 'button', class: 'btn btn-secondary', disabled: true }, text);
        let armed = false;
        b.addEventListener('click', () => {
            const l = tokLinks();
            if (!batch.saved || l === null) {
                tokMsg.textContent = t('created.tok.bad');
                return;
            }
            tokMsg.textContent = '';
            // The same request twice sends the token twice: asked first. (Kept with the batch, so a change of
            // language does not forget it.)
            if (batch.tokenSent === tokSig() && !armed) {
                armed = true;
                tokAsk.hidden = false;
                b.textContent = t('batch.fund.sure');
                return;
            }
            armed = false;
            b.textContent = text;
            tokAsk.hidden = true;
            batch.tokenSent = tokSig();
            openOut(url(l));
        });
        return b;
    };
    const tokWeb = tokBtn(t('batch.tok.open', { n }), l => l.web);
    const tokApp = tokBtn(t('created.fund.app'), l => appRoad(l));
    const tokHint = h('p', { class: 'btn-reason' }, t('batch.tok.locked'));
    function paintTok(): void {
        // After the XEC: a gift needs it for the token to be taken home, and the single request for the XEC must
        // not be mistaken for this one.
        const ready = batch!.saved && fundedCount() === n && tokLinks() !== null;
        tokWeb.disabled = !ready;
        tokApp.disabled = !ready;
        tokHint.hidden = ready;
    }
    tokId.addEventListener('input', () => void lookupToken());
    tokQty.addEventListener('input', () => {
        tokMsg.textContent = '';
        paintTok();
    });
    // Open from the start when the giver said, on the create step, that the gifts would carry a token.
    const tokStep = fold(
        t('batch.tok.title'),
        { id: 'batch.tok', open: batch.withToken === true },
        h('p', null, t('batch.tok.body')),
        h('p', { class: 'note' }, t('batch.tok.one')),
        // Taking a token home costs more: said when the fee the giver covered does not reach it.
        (batch.feeCovered ?? 0n) < takeFeeEstimate(true) ? h('p', { class: 'note' }, t('created.tok.feenote', { fee: formatXec(takeFeeEstimate(true), lang) })) : null,
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-btok-id' }, t('batch.tok.id')), tokId, tokName),
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-btok-qty' }, t('batch.tok.qty')), tokQty),
        tokWeb,
        tokApp,
        tokHint,
        tokAsk,
        tokMsg,
    );

    // ---- The count, and the gift a wallet left out ----
    const statusText = h('span', null, t('batch.status.waiting'));
    const title = h('h1', null, '');
    const status = h('p', { class: 'status status--waiting', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'status-dot', 'aria-hidden': 'true' }), statusText);
    const stampNote = h('p', { class: 'note', hidden: true });
    // A gift with two kinds of token in it: the recipient can take one kind home, the other stays stuck. Said in
    // view, above the list, naming the gifts.
    const twoKinds = h('p', { class: 'warning batch-two', role: 'status', hidden: true });
    /** How many kinds of token a gift holds (mint batons are not a gift's token). */
    const kindsIn = (s: PackageState | null | undefined): number =>
        s === null || s === undefined ? 0 : new Set(s.coins.filter(c => c.token && c.tokenInfo !== undefined && !c.tokenInfo.baton).map(c => c.tokenInfo!.tokenId)).size;
    // Funded: what is left to do is to send, said where the status is.
    const nextStep = h('p', { class: 'strong batch-next', hidden: true }, t(batch.kind === 'answers' ? 'batch.next.one' : 'batch.next.links'));
    const topUpHost = h('div', { class: 'stack batch-topup', hidden: true });
    /** A whole round of reads, none failed, that began after a gift was already seen funded: only then is "left out" known. */
    let settled = false;
    function paintTopUp(): void {
        const missing = batch!.gifts.filter((_, i) => states[i] !== null && !seenFunded[i]);
        const known = settled && states.every(s => s !== null);
        // Only once some gift is funded and every gift was read afterwards: a payment still arriving leaves nothing out.
        if (!known || fundedCount() === 0 || missing.length === 0) {
            topUpHost.hidden = true;
            if (missing.length === 0) watchMissing([]);
            return;
        }
        if (topUpHost.dataset.sig === missing.map(g => g.key.address).join(',')) return;
        topUpHost.dataset.sig = missing.map(g => g.key.address).join(',');
        // The gifts left out are funded by a request of their own: each is watched, so its arrival is seen at once.
        watchMissing(missing);
        const more = fundAll(missing);
        // The same care as the main request: once a wallet was opened with it, a second opening is asked about first.
        let topOpened = false;
        const ask = h('p', { class: 'warning', hidden: true }, t('batch.fund.again'));
        const topBtn = (text: string, url: () => string): HTMLButtonElement => {
            const b = h('button', { type: 'button', class: 'btn btn-secondary' }, text);
            let armed = false;
            b.addEventListener('click', () => {
                if (topOpened && !armed) {
                    armed = true;
                    ask.hidden = false;
                    b.textContent = t('batch.fund.sure');
                    return;
                }
                armed = false;
                b.textContent = text;
                ask.hidden = true;
                topOpened = true;
                openOut(url());
            });
            return b;
        };
        topUpHost.replaceChildren(
            h('p', { class: 'warning' }, t(offer.kind === 'paid' ? 'batch.topup.paid' : 'batch.topup.body', { n: missing.length })),
            h('div', { class: 'btn-row btn-row--equal' }, topBtn(t('created.fund.web'), () => more.web), topBtn(t('created.fund.app'), () => appRoad(more))),
            ask,
        );
        topUpHost.hidden = false;
    }

    let unwatchMissing: (() => void)[] = [];
    function watchMissing(missing: readonly BatchGift[]): void {
        for (const u of unwatchMissing) u();
        unwatchMissing = [];
        for (const g of missing) {
            try {
                unwatchMissing.push(ctx.chain.watch(g.key.address, () => void refresh()));
            } catch {
                /* the timer still asks */
            }
        }
    }

    // ---- The list ----
    const rows = batch.gifts.map((g, i) => {
        const state = h('span', { class: 'batch-state' }, t('batch.row.waiting'));
        const sent = h('span', { class: 'batch-sent' }, '');
        const who = h('span', { class: 'batch-who' });
        setUserText(who, label(g, i));
        const head = h(
            'summary',
            { class: 'batch-sum' },
            h('span', { class: 'label batch-n' }, `${i + 1}/${n}`),
            who,
            h('span', { class: 'batch-amt mono' }, `${formatXec(g.sats, lang)} XEC`),
            state,
        );
        const body = h('div', { class: 'stack batch-body' });
        if (g.link !== undefined) {
            const box = h('p', { class: 'linkbox batch-link mono' });
            setUserText(box, g.link);
            const markSent = (): void => {
                sent.textContent = t('batch.row.copied');
            };
            // The link as a QR, for handing a gift over face to face: drawn only when asked for.
            const qrHost = h('div', { class: 'qr-host' });
            let qrShown = false;
            const link = g.link;
            const qr = h('button', { type: 'button', class: 'btn btn-quiet', 'aria-expanded': 'false' }, t('link.qr.show'));
            qr.addEventListener('click', () => {
                qrShown = !qrShown;
                qr.setAttribute('aria-expanded', String(qrShown));
                qr.textContent = t(qrShown ? 'link.qr.hide' : 'link.qr.show');
                qrHost.replaceChildren(...(qrShown ? [qrPanel({ text: link, title: t('qr.title.link'), warning: t('link.qr.warn') })] : []));
            });
            body.append(box, linkButtons({ link: g.link, onSaved: markSent }), sent, qr, qrHost);
        } else {
            body.append(h('p', { class: 'note' }, t('batch.row.answer')));
        }
        // Where this gift is on the chain: public, and a press copies it.
        body.append(h('p', { class: 'note batch-ref' }, `${t('gift.ref.label')} `, copyRef(g.key.address, shortId(g.key.address))));
        // Which answer opens it, never the answer itself: the page does not keep answers.
        if (batch.riddle !== undefined && batch.kind === 'links') body.append(h('p', { class: 'note' }, t(g.own === true ? 'batch.row.own' : 'batch.row.shared')));
        const el = h('details', { class: 'batch-row' }, head, body);
        return { el, state };
    });

    function paint(): void {
        const k = fundedCount();
        rows.forEach((r, i) => {
            const s = states[i];
            const key = s === null || s === undefined ? 'batch.row.waiting' : s.kind === 'taken' ? 'batch.row.taken' : seenFunded[i] ? 'batch.row.funded' : 'batch.row.waiting';
            r.state.textContent = t(key) + (s !== null && s !== undefined && s.hasToken ? ' · ' + t(kindsIn(s) > 1 ? 'batch.row.tokens' : 'batch.row.token') : '');
            r.el.dataset.state = key.slice('batch.row.'.length);
        });
        const all = k === n;
        // Ready is said only once every gift has its money: until then these are links to empty packages.
        title.textContent = all ? t(batch!.kind === 'answers' ? 'batch.title.one' : 'batch.title', { n }) : k > 0 ? t('created.many.some', { k, n }) : t(batch!.kind === 'answers' ? 'created.many.one.empty' : 'created.many.empty', { n });
        const mixed = batch!.gifts.map((g, i) => (kindsIn(states[i]) > 1 ? label(g, i) : '')).filter(x => x !== '');
        twoKinds.hidden = mixed.length === 0;
        if (mixed.length > 0) setUserText(twoKinds, t('batch.tok.two', { who: mixed.join(', ') }));
        nextStep.hidden = !all;
        paintTok();
        status.className = 'status ' + (all ? 'status--ok' : 'status--waiting');
        statusText.textContent = k === 0 ? t('batch.status.waiting') : t(all ? 'batch.status.all' : 'batch.status.some', { k, n });
        // Funded: the request is not to be sent again.
        if (k > 0) {
            fundBtns.forEach(b => (b.disabled = true));
            fundHint.hidden = false;
            fundHint.textContent = t(all ? 'batch.fund.done' : 'batch.fund.partial');
            openAsk.hidden = true;
            qrHost.replaceChildren();
        }
        paintTopUp();
    }

    // The giver's own record of each gift, once it is seen funded: never a link, never an answer.
    function record(i: number): void {
        if (recorded[i] || !autoKeep()) return;
        recorded[i] = true;
        const g = batch!.gifts[i]!;
        rememberSent({
            address: g.key.address,
            at: batch!.at + i,
            wrapper: batch!.wrapper,
            ...(dressOf(batch!.recipe) !== undefined ? { dress: dressOf(batch!.recipe)! } : {}),
            sats: String(g.sats),
            ...(batch!.wish ? { wish: batch!.wish } : {}),
            ...(g.name !== '' ? { name: g.name } : {}),
            part: `${i + 1}/${n}`,
        });
    }

    let disposed = false;
    let reading = false;
    let stampAsked = false;
    let again = false;
    async function refresh(): Promise<void> {
        if (disposed) return;
        if (reading) {
            // Something changed while a round was under way: what it read first may already be old. Asked once more.
            again = true;
            return;
        }
        reading = true;
        const fundedAtStart = fundedCount() > 0;
        let clean = true;
        try {
            // One after another: nine questions at once is nine connections on a phone.
            for (let i = 0; i < n; i++) {
                if (disposed) return;
                try {
                    const s = await ctx.chain.read(batch!.gifts[i]!.key.address);
                    states[i] = s;
                    if (s.kind === 'funded' || s.kind === 'taken') {
                        seenFunded[i] = true;
                        record(i);
                    }
                } catch {
                    // Not known now: an old answer must not stand for "still empty".
                    states[i] = null;
                    clean = false;
                }
            }
            if (disposed) return;
            if (fundedCount() === 0) settled = false;
            else if (clean && fundedAtStart && !again) settled = true;
            paint();
            // Funding was first seen in this very round: one more round, soon, settles what (if anything) was left out.
            if (!settled && fundedCount() > 0 && fundedCount() < n && !again) setTimeout(() => void refresh(), 1500);
            // A paid wrapper: say once whether the one payment is seen (read from the first gift's coins).
            const first = states[0];
            if (!stampAsked && offer.kind === 'paid' && def && first && first.kind === 'funded') {
                stampAsked = true;
                const e = await entitlement({ chain: ctx.chain, coins: first.coins, wrapper: def.id, pkh: batch!.gifts[0]!.key.pkh, offer, budgetMs: 8000 }).catch(() => 'unknown' as const);
                if (disposed) return;
                if (e === 'unknown') stampAsked = false;
                stampNote.hidden = e === 'unknown';
                stampNote.textContent = e === 'paid' || e === 'owned' ? t('created.stamp.paid') : e === 'unpaid' ? t('batch.stamp.unpaid') : '';
            }
        } finally {
            reading = false;
            if (again && !disposed) {
                again = false;
                void refresh();
            }
        }
    }
    let unwatch: () => void = () => {};
    try {
        // One request funds all of them, so the first gift's address tells of the whole batch.
        unwatch = ctx.chain.watch(batch.gifts[0]!.key.address, () => void refresh());
    } catch {
        /* the list then updates on the timer only */
    }
    // The list is read again on a timer, since only the first gift's address is watched. Not while the tab is out of
    // sight (it is read at once when it comes back), and less and less often once every gift is funded: what is left
    // to learn then is who has taken theirs, which nothing here waits on.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let quiet = -1;
    function next(fired = false): void {
        clearTimeout(timer);
        if (disposed || document.hidden) return;
        // A token on its way to the gifts is waited for at the usual pace: only the first gift is watched live.
        const tokenDue = batch!.tokenSent !== undefined && !states.every(s => s !== null && s !== undefined && (s.hasToken || s.kind === 'taken'));
        const calm = fundedCount() === n && !tokenDue;
        // Each calm wait that ran its course makes the next one longer; anything else starts over.
        quiet = !calm ? -1 : fired ? Math.min(quiet + 1, QUIET_MS.length - 1) : Math.max(quiet, 0);
        timer = setTimeout(() => {
            void refresh();
            next(true);
        }, calm ? QUIET_MS[quiet]! : POLL_MS);
    }
    const onSight = (): void => {
        if (!document.hidden) void refresh();
        next();
    };
    document.addEventListener('visibilitychange', onSight);
    void refresh();
    next();

    // Closing the tab erases the only copy of these keys: asked first, until every gift is funded and saved after that.
    const onLeave = (e: BeforeUnloadEvent): void => {
        if (getBatch() !== batch || (fundedCount() === n && keptSinceFunded)) return;
        e.preventDefault();
        e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);

    const startOver = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-quiet',
            onclick: () => {
                const k = fundedCount();
                const ask = !batch.saved ? t('batch.startover.unsaved', { n }) : k > 0 && !keptSinceFunded ? t('batch.startover.funded', { k }) : t('batch.startover.confirm', { n });
                if (!window.confirm(ask)) return;
                clearBatch();
                ctx.nav.toCreate();
            },
        },
        t('batch.startover'),
    );

    let riddleNote: HTMLElement | null = null;
    if (batch.riddle !== undefined) {
        const q = h('blockquote', { class: 'riddle-q' });
        setUserText(q, batch.riddle);
        riddleNote = h('div', { class: 'riddle-note' }, h('p', { class: 'label' }, t('created.riddle.label')), q, h('p', { class: 'warning' }, t(batch.kind === 'answers' ? 'batch.riddle.one' : 'batch.riddle.body')));
    }

    if (batch.saved) unlock();
    root.append(
        h(
            'section',
            { class: 'screen screen-created screen-batch' },
            layout({
                kind: 'created',
                head: [title],
                plate: plate(card, def, { tag: t('created.preview') }),
                body: [
                    amountBlock({ text: formatXec(total, lang), label: t('batch.total.label'), size: 'small' }),
                    offer.kind === 'paid' ? h('p', { class: 'note' }, t('batch.total.price', { gifts: formatXec(giftSum, lang), price: formatXec(offer.sats, lang) })) : null,
                    h('div', { class: 'state-block' }, h('div', { class: 'status-wrap' }, h('p', { class: 'label' }, t('created.status.label')), status), stampNote, twoKinds, nextStep),
                    stepRow(1, t(batch.kind === 'answers' ? 'created.step1.title' : 'batch.step1.title'), ...saveStep, riddleNote),
                    stepRow(
                        2,
                        t('batch.step2.title'),
                        h('p', null, t('batch.step2.body', { n, total: formatXec(total, lang) })),
                        h('p', { class: 'warning' }, t('created.keepopen')),
                        webBtn,
                        fundHint,
                        h('div', { class: 'btn-row btn-row--equal' }, appBtn, qrBtn),
                        openAsk,
                        skip,
                        skipAsk,
                        qrHost,
                        demoBtn,
                        topUpHost,
                    ),
                    tokStep,
                    h('section', { class: 'batch-list', 'aria-label': t('batch.list.label') }, h('p', { class: 'label' }, t('batch.list.label')), ...rows.map(r => r.el)),
                    h('div', { class: 'startover' }, startOver),
                ],
            }),
        ),
    );
    paint();

    return () => {
        disposed = true;
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onSight);
        unwatch();
        watchMissing([]);
        window.removeEventListener('beforeunload', onLeave);
        card.destroy();
    };
}
