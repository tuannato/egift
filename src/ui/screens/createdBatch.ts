import { DEFAULT_WRAPPER, batchFundLinks, entitlement, formatXec, fundLinks, stampedFundLinks } from '../../core';
import type { FundLinks, PackageState } from '../../core';
import { autoKeep, dressOf, rememberSent } from '../kept';
import { offerOf, wrapperById } from '../../wrappers';
import { appRoad, isInAppBrowser } from '../inapp';
import { dressed } from '../../wrappers/looks';
import { stageCard } from '../stageCard';
import { h, openOut } from '../dom';
import type { Dispose } from '../dom';
import type { Ctx } from '../ctx';
import { getLang, t } from '../../i18n';
import { clearBatch, getBatch } from '../session';
import type { BatchGift } from '../session';
import { linkBox, linkButtons } from '../linkBox';
import { qrPanel } from './qr';
import { plate } from '../plate';
import { layout, stepRow } from '../layout';
import { amountBlock } from '../amount';
import { setUserText } from '../text';

/** A QR of a longer request is too dense for a phone's camera at arm's length: then the QR is not offered. */
export const FUND_QR_MAX_CHARS = 420;
/** How often every gift is asked about again while the screen is up (the first gift is also watched live). */
const POLL_MS = 20_000;

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
        if (fundedCount() > 0) keptSinceFunded = true;
        fundBtns.forEach(b => (b.disabled = false));
        fundHint.hidden = true;
        skip.hidden = true;
        skipAsk.hidden = true;
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
            class: 'btn btn-secondary',
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
                try {
                    if (!navigator.clipboard?.writeText) return done(false);
                    void navigator.clipboard.writeText(lines()).then(
                        () => done(true),
                        () => done(false),
                    );
                } catch {
                    done(false);
                }
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
            ? [h('p', null, t('batch.one.body', { n })), linkBox({ link: batch.link!, onSaved: unlock }), h('p', { class: 'warning' }, t('batch.one.warn'))]
            : [h('p', null, t('batch.save.body', { n })), h('p', { class: 'warning' }, t('batch.save.warn', { n })), h('div', { class: 'btn-row btn-row--equal' }, download, copyAll), saveMsg, allBox, manual];

    // ---- Step 2: one request for all ----
    const links = fundAll(batch.gifts);
    const openAsk = h('p', { class: 'warning', hidden: true }, t('batch.fund.again'));
    const fundBtn = (text: string, url: () => string): HTMLButtonElement => {
        const b = h('button', { type: 'button', class: 'btn btn-primary', disabled: !batch.saved }, text);
        let armed = false;
        b.addEventListener('click', () => {
            if (!batch.saved) return;
            // A second press of the same request would fund everything twice: asked first, every time.
            if (batch.opened && fundedCount() === 0 && !armed) {
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
                          qrOpen = !qrOpen;
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

    // ---- The count, and the gift a wallet left out ----
    const statusText = h('span', null, t('batch.status.waiting'));
    const status = h('p', { class: 'status status--waiting', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'status-dot', 'aria-hidden': 'true' }), statusText);
    const stampNote = h('p', { class: 'note', hidden: true });
    const topUpHost = h('div', { class: 'stack batch-topup', hidden: true });
    function paintTopUp(): void {
        const missing = batch!.gifts.filter((_, i) => states[i] !== null && !seenFunded[i]);
        const known = states.every(s => s !== null);
        // Only once some gift is funded and every gift was read: a wallet that sends the request whole leaves nothing out.
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
        topUpHost.replaceChildren(
            h('p', { class: 'warning' }, t(offer.kind === 'paid' ? 'batch.topup.paid' : 'batch.topup.body', { n: missing.length })),
            h(
                'div',
                { class: 'btn-row btn-row--equal' },
                h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => openOut(more.web) }, t('created.fund.web')),
                h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => openOut(appRoad(more)) }, t('created.fund.app')),
            ),
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
            h('span', { class: 'batch-amt mono' }, `${formatXec(g.sats, lang)}`),
            state,
        );
        const body = h('div', { class: 'stack batch-body' });
        if (g.link !== undefined) {
            const box = h('p', { class: 'linkbox batch-link mono' });
            setUserText(box, g.link);
            const markSent = (): void => {
                sent.textContent = t('batch.row.copied');
            };
            body.append(box, linkButtons({ link: g.link, onSaved: markSent }), sent);
        } else {
            body.append(h('p', { class: 'note' }, t('batch.row.answer')));
        }
        body.append(h('p', { class: 'note' }, `${formatXec(g.sats, lang)} XEC · ${t('gift.ref.label')} ${g.key.address.slice(6, 10)}…${g.key.address.slice(-4)}`));
        const el = h('details', { class: 'batch-row' }, head, body);
        return { el, state };
    });

    function paint(): void {
        const k = fundedCount();
        rows.forEach((r, i) => {
            const s = states[i];
            const key = s === null || s === undefined ? 'batch.row.waiting' : s.kind === 'taken' ? 'batch.row.taken' : seenFunded[i] ? 'batch.row.funded' : 'batch.row.waiting';
            r.state.textContent = t(key);
            r.el.dataset.state = key.slice('batch.row.'.length);
        });
        const all = k === n;
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
    async function refresh(): Promise<void> {
        if (disposed || reading) return;
        reading = true;
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
                    /* asked again on the next round */
                }
            }
            if (disposed) return;
            paint();
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
        }
    }
    let unwatch: () => void = () => {};
    try {
        // One request funds all of them, so the first gift's address tells of the whole batch.
        unwatch = ctx.chain.watch(batch.gifts[0]!.key.address, () => void refresh());
    } catch {
        /* the list then updates on the timer only */
    }
    const timer = setInterval(() => void refresh(), POLL_MS);
    void refresh();

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
                head: [h('h1', null, t(batch.kind === 'answers' ? 'batch.title.one' : 'batch.title', { n }))],
                plate: plate(card, def, { tag: t('created.preview') }),
                body: [
                    amountBlock({ text: formatXec(total, lang), label: t('batch.total.label'), size: 'small' }),
                    offer.kind === 'paid' ? h('p', { class: 'note' }, t('batch.total.price', { gifts: formatXec(giftSum, lang), price: formatXec(offer.sats, lang) })) : null,
                    h('div', { class: 'state-block' }, h('div', { class: 'status-wrap' }, h('p', { class: 'label' }, t('created.status.label')), status), stampNote),
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
                    h('section', { class: 'batch-list', 'aria-label': t('batch.list.label') }, h('p', { class: 'label' }, t('batch.list.label')), ...rows.map(r => r.el)),
                    h('div', { class: 'startover' }, startOver),
                ],
            }),
        ),
    );
    paint();

    return () => {
        disposed = true;
        clearInterval(timer);
        unwatch();
        watchMissing([]);
        window.removeEventListener('beforeunload', onLeave);
        card.destroy();
    };
}
