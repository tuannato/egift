import { DEFAULT_WRAPPER, DUST_SATS, takeFeeEstimate, entitlement, formatAtoms, giftTokens, licenceOf, formatXec, fundLinks, stampedFundLinks, tokenFundLinks } from '../../core';
import type { FundLinks, GiftToken, PackageState, TokenMeta } from '../../core';
import { cutTokenText, shortTokenId, tokenIcon } from '../tokens';
import { autoKeep, dressOf, forgetSent, isSentRemembered, rememberSent, setAutoKeep } from '../kept';
import { offerOf, wrapperById, inLang } from '../../wrappers';
import { dressed } from '../../wrappers/looks';
import { DEFAULT_CREDIT } from '../plate';
import { stageCard } from '../stageCard';
import { clear, h, openOut } from '../dom';
import type { Dispose } from '../dom';
import type { Ctx } from '../ctx';
import { getLang, t } from '../../i18n';
import { getMade, markSaved, clearMade } from '../session';
import { linkBox, linkButtons } from '../linkBox';
import { qrPanel } from './qr';
import { plate } from '../plate';
import { fold, layout, openFold, stepRow } from '../layout';
import { amountBlock } from '../amount';
import { setUserText } from '../text';

/** Screen B. Only reachable in the session that made the key. */
export function mountCreated(root: HTMLElement, ctx: Ctx): Dispose {
    const made = getMade();
    if (!made) {
        ctx.nav.toCreate();
        return () => {};
    }
    const lang = getLang();
    // The giver sees the gift as it will open: in the look they chose for this wrapper.
    const chosen = wrapperById(made.wrapper);
    const def = chosen ? dressed(chosen, made.recipe) : wrapperById(DEFAULT_WRAPPER);
    const card = stageCard(def);
    const amountText = formatXec(made.sats, lang);
    // A wrapper with a price is paid for inside the transaction that funds the gift (a stamp, `core/stamp.ts`).
    const offer = def ? offerOf(def) : ({ kind: 'free' } as const);
    const stamped = (sats: bigint): FundLinks =>
        offer.kind === 'paid' && def ? stampedFundLinks({ address: made.key.address, sats, wrapper: def.id, offer }) : fundLinks(made.key.address, sats);
    // A giver who owns the wrapper (its licence token is in their wallet) funds with the plain link and pays nothing more.
    const canOwn = offer.kind === 'paid' && licenceOf(offer) !== null;
    let owns = false;
    const links = (sats: bigint): FundLinks => (owns ? fundLinks(made.key.address, sats) : stamped(sats));

    // Step 2 controls
    const fundHint = h('p', { class: 'btn-reason' }, t('created.step2.locked'));
    const fundBtns: HTMLButtonElement[] = [];
    const fundBtn = (label: string, pick: 'web' | 'app') =>
        h(
            'button',
            {
                type: 'button',
                class: 'btn btn-primary',
                disabled: !made.saved,
                onclick: () => {
                    if (!made.saved) return;
                    // Synchronous: iOS blocks window.open after an await.
                    openOut(links(made.sats)[pick]);
                },
            },
            label,
        );
    const webBtn = fundBtn(t('created.fund.web'), 'web');
    const appBtn = fundBtn(t('created.fund.app'), 'app');
    appBtn.setAttribute('class', 'btn btn-secondary btn-small');
    const qrHost = h('div', { class: 'qr-host' });
    let qrOpen = false;
    const qrBtn = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            disabled: !made.saved,
            'aria-expanded': 'false',
            onclick: () => {
                if (!made.saved) return;
                qrOpen = !qrOpen;
                qrBtn.setAttribute('aria-expanded', String(qrOpen));
                clear(qrHost);
                if (qrOpen) qrHost.append(qrPanel({ text: links(made.sats).bip21, title: t('created.fund.qr.title') }));
                // Someone who pays by QR sends the token by QR too: the token step shows its own from now on.
                if (qrOpen && !tokQrOpen) {
                    tokQrOpen = true;
                    paintTokQr();
                }
                // And the token step is not left behind a press for them.
                if (qrOpen) showTok();
            },
        },
        t('created.fund.qr'),
    );
    fundBtns.push(webBtn, appBtn, qrBtn);
    let demoBtn: HTMLButtonElement | null = null;
    if (import.meta.env.DEV && ctx.demo) {
        const demo = ctx.demo;
        demoBtn = h(
            'button',
            {
                type: 'button',
                class: 'btn btn-demo',
                disabled: !made.saved,
                onclick: () => {
                    if (made.saved) demo.chain.fund(made.key.address, made.sats);
                },
            },
            t('created.fund.demo'),
        );
        fundBtns.push(demoBtn);
    }
    // Closing or reloading the tab erases this page's copy of the link, and the link is the only key to the gift.
    // So the browser is asked to check with the person before the tab goes: from the moment the gift is made until
    // it is funded AND its link was saved once more after that (a copy made before funding may have been replaced
    // on the clipboard on the way to the wallet). Once the person starts over, the gift is no longer this page's.
    let fundedOk = false;
    let keptSinceFunded = false;
    const onLeave = (e: BeforeUnloadEvent): void => {
        if (getMade() !== made || (fundedOk && keptSinceFunded)) return;
        e.preventDefault();
        // Older browsers ask only when this is set.
        e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    const unlock = () => {
        markSaved();
        if (fundedOk) keptSinceFunded = true;
        fundBtns.forEach(b => (b.disabled = false));
        fundHint.hidden = true;
    };

    // Status
    const statusText = h('span', null, t('created.status.waiting'));
    const status = h('p', { class: 'status status--waiting', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'status-dot', 'aria-hidden': 'true' }), statusText);
    // Built only once funded: until then there is nothing here to press.
    const afterFunded = h('div', { class: 'stack after-funded', hidden: true });
    // A token gift is not ready when its XEC is in: the token has to arrive too.
    const tokenOnly = made.tokenOnly === true;
    const tokenNext = h('p', { class: 'strong', hidden: true }, t('created.tokenonly.next'));
    let tokenIn = false;
    const paintReady = (): void => {
        afterFunded.hidden = !(fundedOk && (!tokenOnly || tokenIn));
        tokenNext.hidden = !(fundedOk && tokenOnly && !tokenIn);
    };

    function paint(s: PackageState | null): void {
        let msg = t('created.status.waiting');
        let done = false;
        let tone: 'waiting' | 'unfinal' | 'ok' | 'bad' = 'waiting';
        if (s === null) {
            msg = t('created.status.error');
            tone = 'bad';
        } else if (s.kind === 'taken') {
            msg = t('created.status.taken');
            tone = 'bad';
        } else if (s.kind === 'funded') {
            if (!s.allFinal) {
                msg = t('created.status.unfinal');
                tone = 'unfinal';
            } else if (s.xecSats < made!.sats) {
                // Less than was meant: not "Funded ✓", and no "send the link now". (More is fine: a wrapper paid for later adds a little.)
                msg = t('created.status.partial', { got: formatXec(s.xecSats, lang), want: amountText });
                tone = 'unfinal';
            } else {
                msg = t('created.status.funded');
                // What is in the package now, all of it. More than was meant (funded again, or topped up while nobody
                // has taken it): the giver is also told that whoever opens the gift takes all of it.
                msg += ' ' + t(s.xecSats > made!.sats ? 'created.status.more' : 'created.status.holds', { got: formatXec(s.xecSats, lang), want: amountText });
                done = true;
                tone = 'ok';
            }
            if (!s.allFinal && s.xecSats < made!.sats) msg += ' ' + t('created.status.partial', { got: formatXec(s.xecSats, lang), want: amountText });
        }
        statusText.textContent = msg;
        status.classList.toggle('status--ok', done);
        for (const k of ['waiting', 'unfinal', 'bad']) status.classList.toggle('status--' + k, tone === k);
        fundedOk = done;
        // Funded as meant: the gift is remembered, unless the giver switched that off. The one chance is spent
        // either way and is kept with the gift, not with this screen (a change of language builds the screen
        // again): a record the giver took back out, or a switch turned on later, never writes it behind their back.
        if (done && made!.autoSent !== true) {
            made!.autoSent = true;
            if (autoKeep()) {
                writeSent();
                paintRemembered();
            }
        }
        if (!(s !== null && s.kind === 'funded' && s.hasToken)) tokenIn = false;
        paintReady();
        paintHold(s, null);
        void paintStamp(s);
        tokenBox.hidden = !(s !== null && s.kind === 'funded');
        void paintToken(s);
        if (done && !afterFunded.firstChild) afterFunded.append(h('p', { class: 'strong' }, t('created.funded.send')), linkButtons({ link: made!.link, onSaved: unlock }));
    }

    // A token or an NFT beside the XEC. Offered only once the gift holds XEC (a token cannot pay its own
    // way home) and, like every funding control, only after the link was saved.
    const tokId = h('input', { id: 'f-tok-id', class: 'input mono', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-describedby': 'f-tok-msg' });
    const tokQty = h('input', { id: 'f-tok-qty', class: 'input', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-describedby': 'f-tok-msg' });
    const tokMsg = h('p', { id: 'f-tok-msg', class: 'field-msg', role: 'status', 'aria-live': 'polite' });
    const tokSeen = h('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
    // What the token id names, read from the chain as soon as the id is whole. A stranger's text: `setUserText`.
    const tokName = h('p', { class: 'token-found', role: 'status', 'aria-live': 'polite', hidden: true });
    /** What the chain said about the typed id: undefined = not known (yet), null = no such token. */
    let tokMeta: TokenMeta | null | undefined;
    let metaSeq = 0;
    const tokIdValue = (): string | null => {
        const id = tokId.value.trim().toLowerCase();
        return /^[0-9a-f]{64}$/.test(id) ? id : null;
    };
    /** The link that sends this token, or null while the id or the quantity is not one. */
    const tokLinks = (): FundLinks | null => {
        const id = tokIdValue();
        // Not for an id the chain does not know, nor for more decimals than the token has: Cashtab would refuse both.
        if (id === null || tokMeta === null) return null;
        const qty = tokQty.value.trim();
        if (tokMeta !== undefined && (qty.split('.')[1] ?? '').length > tokMeta.decimals) return null;
        try {
            // Nothing but a token id and a plain number ever reaches the link (`tokenFundLinks`).
            return tokenFundLinks({ address: made.key.address, tokenId: id, qty: tokQty.value.trim() });
        } catch {
            return null;
        }
    };
    async function lookupToken(): Promise<void> {
        const mine = ++metaSeq;
        const id = tokIdValue();
        tokMeta = undefined;
        tokName.hidden = true;
        clear(tokName);
        if (id === null) return;
        let meta: TokenMeta | null | undefined;
        try {
            meta = await ctx.chain.tokenMeta?.(id);
        } catch {
            meta = undefined;
        }
        if (disposed || mine !== metaSeq) return;
        tokMeta = meta;
        tokName.hidden = false;
        if (meta === undefined) {
            tokName.textContent = t('created.tok.unread');
        } else if (meta === null) {
            tokName.textContent = t('created.tok.notfound');
        } else {
            const ticker = h('span', { class: 'token-ticker' });
            setUserText(ticker, cutTokenText(meta.ticker));
            const name = h('span', { class: 'token-name' });
            setUserText(name, cutTokenText(meta.name));
            tokName.append(tokenIcon(id) ?? '', ticker, ' ', name, h('span', { class: 'note' }, ' · ' + t('pkg.tok.id', { id: shortTokenId(id) })));
        }
    }
    // The QR of the token step: always the package address alone. A QR that also carries the token id and the
    // quantity is too dense to scan well; that send is what the button opens instead. Shown from the start for
    // someone who paid by QR; otherwise behind its own button.
    const tokQrHost = h('div', { class: 'qr-host' });
    let tokQrOpen = false;
    function paintTokQr(): void {
        tokQrBtn.setAttribute('aria-expanded', String(tokQrOpen));
        clear(tokQrHost);
        if (!tokQrOpen || !made!.saved) return;
        tokQrHost.append(qrPanel({ text: made!.key.address, title: t('created.tok.qr.addr') }));
    }
    const tokQrBtn = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            'aria-expanded': 'false',
            onclick: () => {
                if (!made.saved) return;
                tokQrOpen = !tokQrOpen;
                paintTokQr();
            },
        },
        t('created.tok.qr'),
    );
    tokId.addEventListener('input', () => {
        tokMsg.textContent = '';
        void lookupToken();
    });
    tokQty.addEventListener('input', () => {
        tokMsg.textContent = '';
    });
    const tokOpen = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary',
            onclick: () => {
                if (!made.saved) return;
                tokMsg.textContent = '';
                const send = tokLinks();
                if (send === null) {
                    tokMsg.textContent = t('created.tok.bad');
                    tokMsg.classList.add('field-msg--bad');
                    return;
                }
                openOut(send.web);
            },
        },
        t('created.tok.open'),
    );
    const tokCopy = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            onclick: () => {
                if (!made.saved) return;
                void navigator.clipboard?.writeText(made.key.address).then(
                    () => {
                        tokCopy.textContent = t('created.tok.copied');
                    },
                    () => {},
                );
            },
        },
        t('created.tok.copy'),
    );
    // A gift meant to carry a token shows this step whole. For an ordinary gift it is an extra, behind one line.
    const tokMain = made.tokenOnly === true || made.withToken === true;
    const tokParts = [
        h('p', null, t('created.tok.body')),
        h('ul', { class: 'token-ways' }, h('li', null, t('created.tok.how1')), h('li', null, t('created.tok.how2'))),
        // A giver who paid the recipient's fee is told that a token makes that fee bigger.
        made.feeCovered !== undefined && made.feeCovered < takeFeeEstimate(true) ? h('p', { class: 'note' }, t('created.tok.feenote', { fee: formatXec(takeFeeEstimate(true), lang) })) : null,
        // The fields first, the QR right under them: what is typed changes the QR in view.
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-tok-id' }, t('created.tok.id')), tokId, tokName),
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-tok-qty' }, t('created.tok.qty')), tokQty, tokMsg),
        tokQrHost,
        tokOpen,
        h('div', { class: 'btn-row btn-row--equal' }, tokCopy, tokQrBtn),
        tokSeen,
    ];
    const tokFold = tokMain ? null : fold(t('created.tok.title'), { id: 'created.tok:' + made.key.address }, ...tokParts);
    // `hidden` stays on the box itself, folded or not: nothing of the step shows before the gift holds XEC.
    const tokenBox = tokFold
        ? h('div', { class: 'token-box fold-box', hidden: true }, tokFold)
        : h('div', { class: 'stack token-box', hidden: true }, h('p', { class: 'label' }, t('created.tok.title.main')), ...tokParts);
    /** The folded token step opens itself when it has something to say. */
    function showTok(): void {
        if (tokFold) openFold(tokFold);
    }
    let seenSaid = '';
    /** What was seen of a token. Never said behind a closed fold: a new word opens it. */
    function saySeen(text: string): void {
        tokSeen.textContent = text;
        if (text !== '' && text !== seenSaid) showTok();
        seenSaid = text;
    }

    // What the package holds, always in view: the bar stays at the top of the capsule while the rest scrolls.
    const hold = h('div', { class: 'hold' });
    type Held = { tk: GiftToken; meta: TokenMeta | null };
    let lastState: PackageState | null = null;
    /** `held`: null while the tokens are being read, 'unread' when they could not be. */
    function paintHold(s: PackageState | null, held: readonly Held[] | null | 'unread'): void {
        lastState = s;
        clear(hold);
        hold.append(h('span', { class: 'label hold-label' }, t('created.hold.label')));
        const chip = (final: boolean, ...kids: (Node | string)[]): HTMLElement =>
            h('span', { class: 'hold-chip' + (final ? ' hold-chip--ok' : ' hold-chip--wait') }, ...kids, h('span', { class: 'hold-mark' }, final ? ' ✓' : ' · ' + t('created.hold.wait')));
        if (s === null || s.kind !== 'funded') {
            hold.append(h('span', { class: 'hold-chip hold-chip--none' }, t(s !== null && s.kind === 'taken' ? 'created.hold.taken' : 'created.hold.empty')));
            return;
        }
        hold.append(chip(s.allFinal, `${formatXec(s.xecSats, lang)} XEC`));
        if (held === null || held === 'unread') {
            if (s.hasToken) hold.append(h('span', { class: 'hold-chip hold-chip--wait' }, t('created.hold.token') + (held === null ? ' …' : '')));
            return;
        }
        for (const { tk, meta } of held.slice(0, 2)) {
            const what = t(tk.kind === 'nft' ? 'created.hold.nft' : 'created.hold.token');
            // An amount is said only when the token's decimals are known: atoms alone can be off by a million.
            if (meta === null) hold.append(chip(tk.final, what));
            else if (tk.origin === 'giver' && meta.ticker.trim() !== '') {
                const ticker = h('span', null);
                setUserText(ticker, cutTokenText(meta.ticker, 12));
                hold.append(chip(tk.final, formatAtoms(tk.atoms, meta.decimals, lang) + ' ', ticker));
            } else hold.append(chip(tk.final, `${formatAtoms(tk.atoms, meta.decimals, lang)} ${what}`));
        }
        if (held.length > 2) hold.append(h('span', { class: 'hold-chip' }, `+${held.length - 2}`));
    }
    let tokSeq = 0;
    async function paintToken(s: PackageState | null): Promise<void> {
        const mine = ++tokSeq;
        if (!s || s.kind !== 'funded' || !s.hasToken) {
            saySeen('');
            return;
        }
        // Only the giver's own tokens are asked about, and few of them: strangers' tokens cost no lookups.
        const names = async (found: readonly GiftToken[]): Promise<Held[]> => {
            let asked = 0;
            return Promise.all(
                found.map(async tk => {
                    if (tk.origin !== 'giver' || asked >= 3) return { tk, meta: null };
                    asked++;
                    try {
                        return { tk, meta: (await ctx.chain.tokenMeta?.(tk.tokenId)) ?? null };
                    } catch {
                        return { tk, meta: null };
                    }
                }),
            );
        };
        let found: Awaited<ReturnType<typeof giftTokens>>;
        try {
            found = await giftTokens({ chain: ctx.chain, coins: s.coins, pkh: made!.key.pkh, address: made!.key.address });
        } catch {
            if (!disposed && mine === tokSeq) {
                saySeen('');
                if (lastState === s) paintHold(s, 'unread');
            }
            return;
        }
        if (disposed || mine !== tokSeq) return;
        const held = await names(found);
        if (disposed || mine !== tokSeq) return;
        if (lastState === s) paintHold(s, held);
        tokenIn = found.length > 0;
        paintReady();
        saySeen(found.length === 0 ? '' : found.length > 1 ? t('created.tok.two') : t(found[0]!.origin === 'giver' ? 'created.tok.seen' : 'created.tok.seen.other'));
    }

    // The wrapper's stamp, read back from the chain once the gift is funded: paid, or not seen (then the default
    // wrapper will be shown, and the wrapper can still be paid for with one more small transaction).
    const stampText = h('span', null, '');
    const stampLater = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            hidden: true,
            onclick: () => {
                if (made.saved) openOut(stamped(DUST_SATS).web);
            },
        },
        t('created.stamp.later'),
    );
    const way = (mine: boolean, label: string): HTMLButtonElement => {
        const b = h(
            'button',
            {
                type: 'button',
                class: 'btn btn-secondary btn-small way',
                'aria-pressed': String(owns === mine),
                onclick: () => {
                    owns = mine;
                    for (const x of ways) x.setAttribute('aria-pressed', String(x === b));
                    ownNote.hidden = !owns;
                    if (totalLine) totalLine.hidden = owns;
                    // A QR already on screen would still carry the other link.
                    if (qrOpen) qrBtn.click();
                },
            },
            label,
        );
        return b;
    };
    const ways: HTMLButtonElement[] = [];
    const ownNote = h('p', { class: 'note', hidden: true }, t('created.own.note'));
    // What the wallet will really be asked for: the gift and the wrapper's price leave it together, so the
    // sum is said, with its two parts. Not shown for a free wrapper, or when the giver's wallet owns this one.
    const totalLine =
        offer.kind === 'paid' && made
            ? h('p', { class: 'fund-total' }, t('created.step2.total', { total: formatXec(made.sats + offer.sats, lang), amount: formatXec(made.sats, lang), price: formatXec(offer.sats, lang) }))
            : null;
    let waysRow: HTMLElement | null = null;
    if (canOwn && offer.kind === 'paid') {
        ways.push(way(false, t('created.own.pay', { price: formatXec(offer.sats, lang) })), way(true, t('created.own.mine')));
        const buyAt = offer.licence?.buyAt;
        const buy =
            typeof buyAt === 'string' && /^https:\/\//.test(buyAt)
                ? h('button', { type: 'button', class: 'btn btn-quiet btn-small', onclick: () => openOut(buyAt) }, t('created.own.buy'))
                : null;
        waysRow = h('div', { class: 'stack ways' }, h('div', { class: 'btn-row btn-row--equal' }, ...ways), ownNote, buy);
    }
    const stampBox =
        offer.kind === 'paid' && def
            ? h(
                  'div',
                  { class: 'stamp-box' },
                  h('p', { class: 'label' }, t('created.stamp.label')),
                  h('p', null, t('created.stamp.price', { name: inLang(def.name, lang), price: formatXec(offer.sats, lang), credit: def.credit ?? DEFAULT_CREDIT })),
                  h('p', { class: 'note' }, t('created.stamp.wallets')),
                  waysRow,
                  h('p', { class: 'status stamp-status', role: 'status', 'aria-live': 'polite' }, stampText),
                  stampLater,
              )
            : null;
    let stampSeq = 0;
    async function paintStamp(s: PackageState | null): Promise<void> {
        if (offer.kind !== 'paid' || !def) return;
        const mine = ++stampSeq;
        if (!s || s.kind !== 'funded') {
            stampText.textContent = '';
            stampLater.hidden = true;
            return;
        }
        const e = await entitlement({ chain: ctx.chain, coins: s.coins, wrapper: def.id, pkh: made!.key.pkh, offer });
        if (disposed || mine !== stampSeq) return;
        stampText.textContent = e === 'paid' ? t('created.stamp.paid') : e === 'owned' ? t('created.stamp.owned') : e === 'unpaid' ? t(owns ? 'created.stamp.notowned' : 'created.stamp.unpaid') : '';
        stampLater.hidden = e !== 'unpaid';
    }

    let disposed = false;
    let seq = 0;
    let paintedSig: string | null = null;
    const refresh = () => {
        const mine = ++seq;
        ctx.chain.read(made.key.address).then(
            s => {
                if (disposed || mine !== seq) return;
                // The same package as last time (a follow-up read, most often): nothing to repaint or look up again.
                const sig = `${s.kind}|${s.xecSats}|${s.allFinal}|${s.coins.map(c => `${c.txid}:${c.outIdx}:${c.final ? 1 : 0}`).join(',')}`;
                if (sig === paintedSig) return;
                paintedSig = sig;
                paint(s);
            },
            () => {
                // One read that failed says nothing new about a package already read: what is on screen stays.
                if (!disposed && mine === seq && paintedSig === null) paint(null);
            },
        );
    };
    let unwatch: () => void = () => {};
    try {
        unwatch = ctx.chain.watch(made.key.address, refresh);
    } catch {
        /* the status then updates only on the first read */
    }
    refresh();

    const startOver = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-quiet',
            onclick: () => {
                // The link is the only key to this gift. Unless it was saved, leaving erases it: ask, funded or not.
                // And always ask: the button sits under the funding controls and is easy to press by mistake.
                const funded = status.classList.contains('status--ok');
                if (!made.saved) {
                    if (!window.confirm(t('created.startover.unsaved'))) return;
                } else if (!window.confirm(t(funded ? 'created.startover.funded' : 'created.startover.confirm'))) return;
                clearMade();
                ctx.nav.toCreate();
            },
        },
        t('created.startover'),
    );

    // Remembering a gift: where its package is, never its link. Written once the gift is seen funded, unless the
    // giver switched that off. Whether it is there is said inside the fold only, with the way to take it back out
    // and the reminder that a remembered gift is not a saved link (the screen's own warnings about the link, in
    // steps 1 and 2, stay in view).
    const remembered = h('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
    const writeSent = (): boolean =>
        rememberSent({
            address: made.key.address,
            at: Date.now(),
            wrapper: made.wrapper,
            ...(dressOf(made.recipe) !== undefined ? { dress: dressOf(made.recipe)! } : {}),
            sats: String(made.sats),
            ...(made.wish ? { wish: made.wish } : {}),
            ...(made.tokenOnly === true ? { tokenOnly: true } : {}),
        });
    const remember = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            onclick: () => {
                const ok = writeSent();
                paintRemembered();
                if (!ok) remembered.textContent = t('kept.save.fail');
                if (!forget.hidden) forget.focus();
            },
        },
        t('sent.remember'),
    );
    const forget = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            onclick: () => {
                forgetSent(made.key.address);
                paintRemembered();
                if (!isSentRemembered(made.key.address)) remembered.textContent = t('keep.undone');
                if (!remember.hidden) remember.focus();
            },
        },
        t('keep.undo'),
    );
    function paintRemembered(): void {
        const has = isSentRemembered(made!.key.address);
        remembered.textContent = has ? t('sent.remembered') : '';
        remember.hidden = has;
        forget.hidden = !has;
    }
    paintRemembered();
    const autoBox = h('input', { type: 'checkbox', class: 'check-box', checked: autoKeep(), onchange: () => setAutoKeep(autoBox.checked) }) as HTMLInputElement;
    const rememberBox = h(
        'div',
        { class: 'keep-box fold-box' },
        fold(
            t('sent.title'),
            { id: 'created.remember:' + made.key.address },
            // First thing in the fold: a remembered gift is not a saved link.
            h('p', { class: 'strong' }, t('sent.nolink')),
            h('p', { class: 'note' }, t('sent.body')),
            remember,
            forget,
            remembered,
            h('label', { class: 'check' }, autoBox, h('span', null, t('keep.auto'))),
        ),
    );

    if (made.saved) unlock();
    paintHold(null, null);

    // A locked gift: the question, and where the answer must not travel.
    let riddleNote: HTMLElement | null = null;
    if (made.riddle !== undefined) {
        const q = h('blockquote', { class: 'riddle-q' });
        setUserText(q, made.riddle);
        riddleNote = h('div', { class: 'riddle-note' }, h('p', { class: 'label' }, t('created.riddle.label')), q, h('p', { class: 'warning' }, t('created.riddle.body')));
    }

    root.append(
        h(
            'section',
            { class: 'screen screen-created' },
            layout({
                kind: 'created',
                head: [h('h1', null, t('created.title'))],
                plate: plate(card, def, { tag: t('created.preview') }),
                body: [
                    hold,
                    amountBlock({ text: amountText, label: t('gift.amount.label'), address: made.key.address, refLabel: t('gift.ref.label'), size: 'small' }),
                    // The state of the package, near the top: once funded, what to do next is in view without scrolling.
                    h('div', { class: 'state-block' }, h('div', { class: 'status-wrap' }, h('p', { class: 'label' }, t('created.status.label')), status), tokenNext, afterFunded),
                    stepRow(1, t('created.step1.title'), h('p', null, t('created.step1.body')), linkBox({ link: made.link, onSaved: unlock }), riddleNote),
                    stepRow(
                        2,
                        t('created.step2.title'),
                        h(
                            'p',
                            null,
                            tokenOnly
                                ? t('created.step2.tokenonly', { amount: amountText })
                                : made.feeCovered !== undefined
                                  ? t('created.step2.body.fee', { amount: amountText, gift: formatXec(made.sats - made.feeCovered, lang), fee: formatXec(made.feeCovered, lang) })
                                  : t('created.step2.body', { amount: amountText }),
                        ),
                        totalLine,
                        // A money-loss condition: said before the buttons, as a warning.
                        h('p', { class: 'warning' }, t('created.keepopen')),
                        h(
                            'div',
                            { class: 'fund' },
                            webBtn,
                            fundHint,
                            h('div', { class: 'btn-row btn-row--equal' }, appBtn, qrBtn),
                            demoBtn,
                        ),
                        qrHost,
                        stampBox,
                        tokenBox,
                    ),
                    rememberBox,
                    h('div', { class: 'startover' }, startOver),
                ],
            }),
        ),
    );
    return () => {
        disposed = true;
        window.removeEventListener('beforeunload', onLeave);
        unwatch();
        card.destroy();
    };
}
