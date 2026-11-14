import { buildGiftSweep, buildSweep, formatXec, holdings, isValidDestination, takeHome } from '../../core';
import type { Chain, PackageKey, PackageState, SweepErrorCode, ChainErrorCode, TakeResult } from '../../core';
import { clear, h, openOut } from '../dom';
import { track } from '../busy';
import { getLang, t } from '../../i18n';
import { amountBlock } from '../amount';
import { stopwatch, tick } from '../stopwatch';
import { cue } from '../sound';

export const CASHTAB_URL = 'https://cashtab.com';

/** A plain sentence for each reason a take can fail. */
export function errorText(code: SweepErrorCode | ChainErrorCode): string {
    switch (code) {
        case 'dust':
            return t('take.err.dust');
        case 'token':
            return t('take.err.token');
        case 'offline':
            return t('take.err.offline');
        case 'rejected':
            return t('take.err.rejected');
        case 'nothing':
            return t('take.err.nothing');
        case 'bad-address':
            return t('take.err.bad-address');
        case 'conflict':
            return t('take.lost');
        case 'disagree':
            return t('take.err.disagree');
        default:
            return t('take.err.generic');
    }
}

/** What would arrive and what the fee is, read from a sweep that is never broadcast. */
export function previewSweep(key: PackageKey, state: PackageState, to: string, tokenId: string | null = null): { sentSats: bigint; feeSats: bigint; tokenLeft?: boolean; fused?: boolean } | { code: SweepErrorCode } {
    try {
        if (tokenId !== null) {
            try {
                const g = buildGiftSweep({ key, coins: state.coins, to, marker: 'home', tokenId });
                return { sentSats: g.sentSats, feeSats: g.feeSats, ...(g.token?.fused === true ? { fused: true } : {}) };
            } catch (e) {
                // The package cannot pay to move the token: the XEC goes alone, exactly as `takeHome` will do.
                if ((e as { code?: unknown }).code !== 'dust') throw e;
                const alone = buildSweep({ key, coins: state.coins, to, marker: 'home' });
                return { sentSats: alone.sentSats, feeSats: alone.feeSats, tokenLeft: true };
            }
        }
        const s = buildSweep({ key, coins: state.coins, to, marker: 'home' });
        return { sentSats: s.sentSats, feeSats: s.feeSats };
    } catch (e) {
        const code = (e as { code?: unknown }).code;
        const known: SweepErrorCode[] = ['nothing', 'dust', 'bad-address', 'token'];
        return { code: known.includes(code as SweepErrorCode) ? (code as SweepErrorCode) : 'nothing' };
    }
}

export interface TakeHomeOpts {
    chain: Chain;
    key: PackageKey;
    state: PackageState;
    /** The token that goes home with the XEC, in the same transaction; null or absent: XEC only. */
    tokenId?: string | null;
    /** True while a send is in flight or unsettled: the screen stops re-reading and hides the other actions. */
    onBusy(busy: boolean): void;
    /** The gift arrived and the network settled it. `left` > 0: coins remain for another round. `tokenLeft`: a token is still at the package. */
    /** `more`: the fee when it is the one that was shown, and the token that went home with the XEC. */
    onDone(sentSats: bigint, left: number, tokenLeft: boolean, more: { txid?: string; fee?: bigint; token?: { tokenId: string; atoms: bigint } }): void;
}

type TakePhase = 'form' | 'working' | 'pending' | 'done' | 'lost' | 'error';

/**
 * A take-home in progress, kept in memory per package address so that a
 * re-render (a language switch, a chain update) re-attaches to it instead of
 * orphaning it. Never written to storage. Holds no secret: the address typed
 * and what happened.
 */
interface TakeSession {
    draft: string;
    sweptTo: string;
    phase: TakePhase;
    t0: number;
    /** A node has accepted the transaction: the watch runs from then. */
    sent?: boolean;
    onSent?: () => void;
    /** A fresh press (true), or a "check again" of something already sent (false). */
    timed: boolean;
    sats?: bigint;
    /** The fee and the amount of the sweep last previewed, to say the fee again once it is done. */
    fee?: bigint;
    feeFor?: bigint;
    left: number;
    err?: string;
    /** The person chose to leave the token behind after it could not be moved. */
    xecOnly?: boolean;
    /** The token the press asked for (null: none), fixed at the press so a later "check again" asks for the very same thing. */
    asked?: string | null;
    /** Coins of the carried token that did not fit this round. */
    tokenRest?: number;
    /** The token went home too. */
    tokenHome?: boolean;
    /** The token stayed at the package. */
    tokenLeft?: boolean;
    /** The panel currently on screen, told when the answer arrives. */
    view?: { o: TakeHomeOpts; paint(): void };
}

const takes = new Map<string, TakeSession>();

/** The reader picked another token (or none): an earlier "XEC only" choice no longer stands. */
export function resetTakeChoice(address: string): void {
    const s = takes.get(address);
    if (s && s.phase !== 'working' && s.phase !== 'pending') s.xecOnly = false;
}

/** For tests. */
export function forgetTakes(): void {
    takes.clear();
}

/** True while this package's take-home holds the screen (in flight, unsettled or finished). */
export function takeHolds(address: string): boolean {
    const s = takes.get(address);
    return !!s && (s.phase === 'working' || s.phase === 'pending' || s.phase === 'done');
}

function session(address: string): TakeSession {
    let s = takes.get(address);
    if (!s) {
        s = { draft: '', sweptTo: '', phase: 'form', t0: 0, timed: false, left: 0 };
        takes.set(address, s);
    }
    return s;
}

/** One round: `takeHome` with the same arguments every time. Core resolves an earlier sweep first and never signs a second. */
function run(s: TakeSession, o: TakeHomeOpts, timed: boolean): void {
    s.phase = 'working';
    s.t0 = performance.now();
    s.sent = false;
    s.timed = timed;
    s.err = undefined;
    s.view?.o.onBusy(true);
    s.view?.paint();
    const wanted = s.asked ?? null;
    const settle = (r: TakeResult) => {
        const cur = s.view?.o ?? o;
        if (r.kind === 'done') {
            s.phase = 'done';
            s.sats = r.sentSats;
            s.left = r.leftCoins ?? 0;
            s.tokenHome = r.token !== undefined;
            s.tokenRest = r.token?.leftCoins ?? 0;
            // Left behind: by the dust rule, by the person's own choice, or because none was asked for.
            // Read from what was at the package when the panel was built, minus what this sweep carried.
            const had = holdings(o.state.coins);
            s.tokenLeft = r.tokenLeft === true || s.tokenRest > 0 || had.some(x => x.tokenId !== r.token?.tokenId);
            // The carried token is home: another round ("take the rest") is for XEC, or for its own leftovers.
            if (r.token !== undefined && s.tokenRest === 0) s.asked = null;
            tick();
            cue.final();
            cur.onDone(r.sentSats, s.left, s.tokenLeft, {
                txid: r.txid,
                ...(s.fee !== undefined && s.feeFor === r.sentSats ? { fee: s.fee } : {}),
                ...(r.token !== undefined ? { token: { tokenId: r.token.tokenId, atoms: r.token.atoms } } : {}),
            });
        } else if (r.kind === 'pending') {
            s.phase = 'pending';
        } else if (r.kind === 'lost') {
            s.phase = 'lost';
            cur.onBusy(false);
        } else {
            s.phase = 'error';
            s.err = errorText(r.code);
            cur.onBusy(false);
        }
        s.view?.paint();
    };
    // One function for the life of the session: "check again" is `takeHome` with the very same arguments.
    s.onSent ??= (): void => {
        s.t0 = performance.now();
        s.sent = true;
        s.view?.paint();
    };
    const onSent = s.onSent;
    track(takeHome({ chain: o.chain, key: o.key, to: s.sweptTo, marker: 'home', tokenId: wanted, onSent })).then(settle, () =>
        settle({ kind: 'error', code: 'offline', message: '' }),
    );
}

export function takeHomePanel(o: TakeHomeOpts): HTMLElement {
    const lang = getLang();
    const s = session(o.key.address);
    const input = h('input', {
        id: 'th-addr',
        class: 'input mono',
        type: 'text',
        autocapitalize: 'off',
        autocomplete: 'off',
        spellcheck: 'false',
        placeholder: 'ecash:…',
        'aria-describedby': 'th-msg',
    });
    input.value = s.draft;
    const msg = h('p', { id: 'th-msg', class: 'field-msg', role: 'status', 'aria-live': 'polite' });
    const confirm = h('p', { class: 'confirm', 'aria-live': 'polite' });
    const go = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, t('take.go'));
    // Why the button cannot be pressed yet, in one short line under it.
    const goWhy = h('p', { class: 'btn-reason' }, t('take.need.addr'));
    const result = h('div', { class: 'result', role: 'status', 'aria-live': 'polite' });
    const form = h('div', { class: 'stack' });

    /** The token this press would carry: the gift's, unless the person chose to leave it. */
    const wants = (): string | null => (s.xecOnly === true ? null : (o.tokenId ?? null));
    const tokenNote = h('p', { class: 'warning', hidden: wants() === null }, t('take.token.wallet'));
    // The way back from "XEC only": said and offered for as long as that choice stands.
    const withToken = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-quiet btn-small',
            hidden: !(s.xecOnly === true && (o.tokenId ?? null) !== null),
            onclick: () => {
                if (s.phase === 'working' || s.phase === 'pending') return;
                s.xecOnly = false;
                tokenNote.hidden = false;
                withToken.hidden = true;
                validate();
            },
        },
        t('take.withtoken'),
    );

    function validate(): void {
        const to = input.value.trim();
        s.draft = input.value;
        go.disabled = true;
        goWhy.hidden = false;
        goWhy.textContent = to === '' ? t('take.need.addr') : t('take.need.fix');
        confirm.textContent = '';
        msg.textContent = '';
        msg.classList.remove('field-msg--bad');
        if (to === '') return;
        let ok = false;
        try {
            ok = isValidDestination(to);
        } catch {
            ok = false;
        }
        if (!ok) {
            msg.textContent = t('take.addr.bad');
            msg.classList.add('field-msg--bad');
            return;
        }
        const p = previewSweep(o.key, o.state, to, wants());
        if ('code' in p) {
            msg.textContent = errorText(p.code);
            msg.classList.add('field-msg--bad');
            return;
        }
        s.sweptTo = to;
        s.fee = p.feeSats;
        s.feeFor = p.sentSats;
        confirm.textContent =
            t('take.confirm', { amount: formatXec(p.sentSats, lang), fee: formatXec(p.feeSats, lang) }) +
            ' ' +
            // What happens to a token is always said before the press: it goes along, or it stays.
            (wants() !== null ? t(p.tokenLeft === true ? 'take.confirm.tokenleft' : p.fused === true ? 'take.confirm.fused' : 'take.confirm.token') : holdings(o.state.coins).length > 0 ? t('take.confirm.tokenstay') : '');
        go.disabled = false;
        goWhy.hidden = true;
    }
    input.addEventListener('input', validate);

    const paste = h(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            onclick: () => {
                if (!navigator.clipboard?.readText) {
                    msg.textContent = t('take.paste.fail');
                    return;
                }
                navigator.clipboard.readText().then(
                    v => {
                        input.value = v.trim();
                        validate();
                    },
                    () => {
                        msg.textContent = t('take.paste.fail');
                    },
                );
            },
        },
        t('take.paste'),
    );

    go.addEventListener('click', () => {
        if (go.disabled || s.phase === 'working') return;
        s.asked = wants();
        run(s, o, true);
    });

    function paint(): void {
        clear(result);
        const busy = s.phase === 'working';
        form.hidden = !(s.phase === 'form' || s.phase === 'error');
        input.disabled = busy;
        paste.disabled = busy;
        if (s.phase === 'working') {
            stopWatch?.cancel();
            stopWatch = null;
            // The watch counts the network's time only: it starts once a node has accepted the transaction.
            if (s.sent !== true) {
                result.append(h('div', { class: 'working' }, h('p', null, t(s.timed ? 'take.working' : 'take.checking'))));
                return;
            }
            const sw = stopwatch(s.t0);
            result.append(h('div', { class: 'working' }, h('p', null, t('take.settling')), sw.el));
            // The watch stops itself when the panel is repainted.
            stopWatch = sw;
            return;
        }
        stopWatch?.cancel();
        stopWatch = null;
        if (s.phase === 'done') {
            const rest = s.left > 0;
            result.append(
                h(
                    'div',
                    { class: 'done' },
                    h('p', { class: 'done-head' }, h('span', { class: 'done-mark', 'aria-hidden': 'true' }, '✓'), h('span', { class: 'done-title' }, t('take.done.title'))),
                    amountBlock({ text: formatXec(s.sats ?? 0n, lang), size: 'small' }),
                    // The fee is said only when it is the one that was shown before the press.
                    s.fee !== undefined && s.sats !== undefined && s.feeFor === s.sats ? h('p', null, t('take.done.fee', { amount: formatXec(s.sats, lang), fee: formatXec(s.fee, lang) })) : null,
                    h('p', null, t('take.done.body')),
                    s.tokenHome === true ? h('p', { class: 'strong' }, t('take.done.token')) : null,
                    s.tokenLeft === true ? h('p', { class: 'warning' }, t((s.tokenRest ?? 0) > 0 ? 'take.done.tokenrest' : 'take.done.tokenleft')) : null,
                    rest ? h('p', { class: 'warning' }, t('rest.left', { n: s.left })) : null,
                    rest ? h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => run(s, o, true) }, t('rest.take')) : null,
                ),
            );
        } else if (s.phase === 'pending') {
            result.append(
                h('p', { class: 'warning' }, t('take.pending')),
                h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => run(s, o, false) }, t('take.check')),
            );
        } else if (s.phase === 'lost') {
            result.append(h('p', { class: 'warning' }, t('take.lost')));
        } else if (s.phase === 'error' && s.err) {
            result.append(h('p', { class: 'warning' }, s.err));
            // The token could not be moved: the XEC can still go on its own, said with what that costs.
            if (wants() !== null) {
                result.append(
                    h('p', { class: 'note' }, t('take.xeconly.warn')),
                    h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn btn-secondary btn-small',
                            onclick: () => {
                                s.xecOnly = true;
                                s.phase = 'form';
                                s.err = undefined;
                                tokenNote.hidden = true;
                                withToken.hidden = false;
                                paint();
                                validate();
                            },
                        },
                        t('take.xeconly'),
                    ),
                );
            }
            validate();
        }
    }
    let stopWatch: ReturnType<typeof stopwatch> | null = null;

    form.append(
        h(
            'ol',
            { class: 'steps' },
            h('li', null, h('p', null, t('take.s1')), h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => openOut(CASHTAB_URL) }, t('take.s1.btn'))),
            h('li', null, h('p', null, t('take.s2'))),
            h('li', null, h('p', null, t('take.s3'))),
        ),
        h('div', { class: 'field' }, h('label', { class: 'label', for: 'th-addr' }, t('take.addr.label')), h('div', { class: 'input-row' }, input, paste), msg),
        tokenNote,
        confirm,
        withToken,
        go,
        goWhy,
    );
    s.view = { o, paint };
    if (s.phase === 'form' && s.draft.trim() !== '') validate();
    paint();
    return h('div', { class: 'panel stack panel-take' }, h('h2', { class: 'panel-title' }, t('take.title')), form, result);
}
