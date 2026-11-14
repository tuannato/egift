/**
 * Gifts a person chose to keep a record of, after they were taken home.
 *
 * A record is a keepsake, not a key: the sender's words, what arrived, when,
 * and which package it was. It is written only when the person presses the
 * button, and only after the gift is in their wallet. It never holds the
 * link, the secret, a private key or the wallet address the gift went to —
 * the record type has no field that could carry one. Not even the package's
 * full address is kept (one look in an explorer leads from it to the wallet
 * the gift went to): only sixteen of its characters, enough to tell one gift
 * from another. A wish that looks as if it carries a gift link is left out.
 *
 * The browser keeps it for as long as the browser pleases (Safari drops a
 * site's data after seven days without a visit; a private window drops it on
 * close). The file a person downloads is the copy that lasts.
 *
 * With `i18n/index.ts` (the language), this is the only file that touches
 * storage.
 */
import { formatAtoms, formatXec } from '../core/money';
import { localeOf, t } from '../i18n';
import type { Lang } from '../i18n';
import { cleanUserText } from './text';
import { looksLikeXec } from './tokens';
import type { KeepsakeLook } from './keepsakeArt';

const STORE_KEY = 'gift.kept';
/** Gifts a giver chose to remember: where the package is, never its link. */
const SENT_KEY = 'gift.sent';
/** The most records kept; the oldest go first. */
export const KEPT_MAX = 50;
const WISH_MAX = 600;
/** At or under this much XEC beside a token, the gift was the token (the floor a token-only gift is funded with). */
const TOKEN_GIFT_XEC_SATS = 1000n;
const TEXT_MAX = 40;

export interface KeptToken {
    /** Kept only for a token the gift screen showed by name: the giver's own. */
    readonly tokenId?: string;
    readonly nft: boolean;
    /** Atoms, as digits. */
    readonly atoms: string;
    /** Known only when the token described itself. */
    readonly decimals?: number;
    readonly ticker?: string;
    readonly name?: string;
}

export interface Kept {
    /** Sixteen characters of the package address (`keptId`): what tells one gift from another, and no more. */
    readonly ref: string;
    /** When it arrived, ms since 1970. */
    readonly at: number;
    readonly wrapper: string;
    readonly wish?: string;
    /** XEC that arrived, in sats, as digits. */
    readonly sats: string;
    /** The network fee, in sats, as digits. */
    readonly fee?: string;
    readonly token?: KeptToken;
}

const DIGITS = /^\d{1,30}$/;
const ADDRESS = /^ecash:[qp][a-z0-9]{41}$/;
const REF = /^[a-z0-9]{16}$/;

/** The reference a record is kept under: the first and the last eight characters of the package address. */
export function keptId(address: string): string | null {
    if (!ADDRESS.test(address)) return null;
    const body = address.slice('ecash:'.length);
    return body.slice(0, 8) + body.slice(-8);
}

/**
 * The sender's words, fit to keep — or undefined when they look as if they
 * carry a gift link (a wish is free text, and a link is a key).
 */
export function keepableWish(wish: string | undefined): string | undefined {
    if (wish === undefined) return undefined;
    const w = cut(cleanUserText(wish), WISH_MAX);
    if (w.trim() === '') return undefined;
    if (/#\s*1\./.test(w) || /[A-Za-z0-9_-]{22,}/.test(w)) return undefined;
    return w;
}
const TOKEN_ID = /^[0-9a-f]{64}$/;
const cut = (s: string, max: number): string => [...s].slice(0, max).join('');

/** One record read back from storage, or null for anything that is not one. Storage is not trusted. */
function clean(x: unknown): Kept | null {
    if (typeof x !== 'object' || x === null) return null;
    const r = x as Record<string, unknown>;
    if (typeof r.ref !== 'string' || !REF.test(r.ref)) return null;
    if (typeof r.at !== 'number' || !Number.isFinite(r.at) || r.at <= 0) return null;
    if (typeof r.sats !== 'string' || !DIGITS.test(r.sats)) return null;
    const out: { -readonly [K in keyof Kept]: Kept[K] } = {
        ref: r.ref,
        at: r.at,
        wrapper: typeof r.wrapper === 'string' ? cut(r.wrapper, TEXT_MAX) : '',
        sats: r.sats,
    };
    const wish = typeof r.wish === 'string' ? keepableWish(r.wish) : undefined;
    if (wish !== undefined) out.wish = wish;
    if (typeof r.fee === 'string' && DIGITS.test(r.fee)) out.fee = r.fee;
    const tk = r.token as Record<string, unknown> | undefined;
    if (typeof tk === 'object' && tk !== null && typeof tk.atoms === 'string' && DIGITS.test(tk.atoms)) {
        // Named or not at all: an id, decimals and the token's own words go together, for the giver's token only.
        const named = typeof tk.tokenId === 'string' && TOKEN_ID.test(tk.tokenId) && typeof tk.decimals === 'number' && Number.isInteger(tk.decimals) && tk.decimals >= 0 && tk.decimals <= 9;
        out.token = {
            nft: tk.nft === true,
            atoms: tk.atoms,
            ...(named
                ? {
                      tokenId: tk.tokenId as string,
                      decimals: tk.decimals as number,
                      ...(typeof tk.ticker === 'string' && tk.ticker.trim() !== '' ? { ticker: cut(cleanUserText(tk.ticker), TEXT_MAX) } : {}),
                      ...(typeof tk.name === 'string' && tk.name.trim() !== '' ? { name: cut(cleanUserText(tk.name), TEXT_MAX) } : {}),
                  }
                : {}),
        };
    }
    return out;
}

/** The kept gifts, newest first. Empty when there are none or storage cannot be read. */
export function loadKept(): Kept[] {
    return readList(STORE_KEY)
        .map(clean)
        .filter((k): k is Kept => k !== null)
        .sort((a, b) => b.at - a.at)
        .slice(0, KEPT_MAX);
}

function write(key: typeof STORE_KEY | typeof SENT_KEY, list: readonly unknown[]): boolean {
    try {
        if (list.length === 0) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(list));
        return true;
    } catch {
        return false;
    }
}

function readList(key: typeof STORE_KEY | typeof SENT_KEY): unknown[] {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return [];
        const list: unknown = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

/**
 * A gift its giver chose to remember, to see later whether it was funded and
 * taken. It holds the package ADDRESS (public: it is how the page asks the
 * network), what was meant to go in, the words and the time. Never the link:
 * a remembered gift cannot be opened, re-sent or taken back from here, and
 * losing the link still loses the gift.
 */
export interface Sent {
    readonly address: string;
    readonly at: number;
    readonly wrapper: string;
    readonly wish?: string;
    /** What the giver meant to fund, in sats, as digits. */
    readonly sats: string;
    readonly tokenOnly?: boolean;
}

function cleanSent(x: unknown): Sent | null {
    if (typeof x !== 'object' || x === null) return null;
    const r = x as Record<string, unknown>;
    if (typeof r.address !== 'string' || !ADDRESS.test(r.address)) return null;
    if (typeof r.at !== 'number' || !Number.isFinite(r.at) || r.at <= 0) return null;
    if (typeof r.sats !== 'string' || !DIGITS.test(r.sats)) return null;
    const wish = typeof r.wish === 'string' ? keepableWish(r.wish) : undefined;
    return {
        address: r.address,
        at: r.at,
        wrapper: typeof r.wrapper === 'string' ? cut(r.wrapper, TEXT_MAX) : '',
        sats: r.sats,
        ...(wish !== undefined ? { wish } : {}),
        ...(r.tokenOnly === true ? { tokenOnly: true } : {}),
    };
}

/** The remembered gifts, newest first. */
export function loadSent(): Sent[] {
    return readList(SENT_KEY)
        .map(cleanSent)
        .filter((k): k is Sent => k !== null)
        .sort((a, b) => b.at - a.at)
        .slice(0, KEPT_MAX);
}

/** Remember a gift. One per package. False when the browser would not store it. */
export function rememberSent(record: Sent): boolean {
    const k = cleanSent(record);
    if (k === null) return false;
    return write(SENT_KEY, [k, ...loadSent().filter(x => x.address !== k.address)].slice(0, KEPT_MAX));
}

export function isSentRemembered(address: string): boolean {
    return loadSent().some(k => k.address === address);
}

export function forgetSent(address: string): void {
    write(SENT_KEY, loadSent().filter(k => k.address !== address));
}

/** Keep a record. One per package: keeping again replaces it. False when the browser would not store it. */
export function keep(record: Kept): boolean {
    const k = clean(record);
    if (k === null) return false;
    const rest = loadKept().filter(x => x.ref !== k.ref);
    return write(STORE_KEY, [k, ...rest].slice(0, KEPT_MAX));
}

/** Is exactly this record in the browser? An older record of the same gift does not count. */
export function isKept(record: Kept): boolean {
    const k = clean(record);
    return k !== null && loadKept().some(x => JSON.stringify(x) === JSON.stringify(k));
}

export function removeKept(ref: string): void {
    write(STORE_KEY, loadKept().filter(k => k.ref !== ref));
}

/** `qznq…wzh8`: the package's short reference, as shown on the gift. */
export function keptRef(k: Kept): string {
    return `${k.ref.slice(0, 4)}…${k.ref.slice(-4)}`;
}

export function keptWhen(k: { readonly at: number }, lang: Lang): string {
    try {
        return new Intl.DateTimeFormat(localeOf(lang), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(k.at));
    } catch {
        return '';
    }
}

/** "Token CAFE: 125.5", "NFT VE: 1", or just "Token" when its decimals are not known. A token's own words are a stranger's text. */
export function keptTokenText(tk: KeptToken, lang: Lang): string {
    const kind = t(tk.nft ? 'pkg.tok.kind.nft' : 'pkg.tok.kind.token');
    // A ticker that reads like money ("XEC", "USDT") is not repeated here, where no warning stands beside it.
    const ticker = tk.ticker !== undefined && !looksLikeXec(tk.ticker, true) && !(tk.name !== undefined && looksLikeXec(tk.name)) ? tk.ticker : undefined;
    const what = ticker === undefined ? kind : `${kind} ${ticker}`;
    if (tk.decimals === undefined) return what;
    try {
        return `${what}: ${formatAtoms(BigInt(tk.atoms), tk.decimals, lang)}`;
    } catch {
        return what;
    }
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * The record as a small page of its own, to download and keep. Plain text and
 * a stylesheet: no script, nothing loaded from anywhere, every word escaped.
 */
export function keepsakePage(k: Kept, lang: Lang, wrapperName: string, look: KeepsakeLook | null = null): string {
    const rows: [string, string][] = [
        [t('kept.row.amount'), `${formatXec(BigInt(k.sats), lang)} XEC`],
        ...(k.token ? ([[t('kept.row.token'), keptTokenText(k.token, lang) + (k.token.name && !looksLikeXec(k.token.name) ? ` (${k.token.name})` : '')]] as [string, string][]) : []),
        ...(k.token?.tokenId ? ([[t('kept.row.tokenid'), k.token.tokenId]] as [string, string][]) : []),
        ...(k.fee !== undefined ? ([[t('kept.row.fee'), `${formatXec(BigInt(k.fee), lang)} XEC`]] as [string, string][]) : []),
        [t('kept.row.when'), keptWhen(k, lang)],
        ...(wrapperName !== '' ? ([[t('kept.row.wrapper'), wrapperName]] as [string, string][]) : []),
        [t('kept.row.package'), keptRef(k)],
    ];
    // The wrapper's own colours when its look is at hand; a plain dark page otherwise. Every colour is a checked `#rrggbb`.
    const c = look?.colours ?? { ground: '#0b0b0d', surface: '#17171a', ink: '#f5f5f2', accent: '#f5f5f2', dim: '#a8a8a2' };
    const css =
        `body{margin:0;background:${c.ground};color:${c.ink};font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}` +
        'main{max-width:520px;margin:0 auto;padding:28px 16px 48px}' +
        `.card{background:${c.surface};border-radius:28px;overflow:hidden;box-shadow:0 30px 70px -30px rgba(0,0,0,.8)}` +
        `.art{position:relative;width:100%;overflow:hidden;isolation:isolate;background:${look?.backdrop && /^#[0-9a-f]{6}$/i.test(look.backdrop) ? look.backdrop : c.ground}}` +
        '.art img{position:absolute;display:block;max-width:none;max-height:none}' +
        '.body{padding:24px 22px 26px}' +
        `h1{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${c.dim};font-weight:500;margin:0 0 18px}` +
        `blockquote{margin:0 0 24px;padding:2px 0 2px 14px;border-left:2px solid ${c.accent};font-size:23px;line-height:1.3;white-space:pre-wrap;overflow-wrap:anywhere}` +
        `.amount{font-size:44px;line-height:1;font-weight:700;letter-spacing:-.02em;margin:0 0 22px}.amount span{font-size:14px;font-weight:600;letter-spacing:.1em;margin-left:8px;color:${c.dim}}` +
        '.amount--token{font-size:30px;line-height:1.15;overflow-wrap:anywhere}' +
        `dl{margin:0}dt{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${c.dim};padding-top:12px;border-top:1px solid rgba(128,128,128,.28)}` +
        'dd{margin:2px 0 12px;overflow-wrap:anywhere}' +
        `p{color:${c.dim};font-size:13px;margin:22px 4px 0}` +
        // On paper: dark words on white, whatever the wrapper wears.
        '@media print{body,.card{background:#fff!important;color:#000!important;box-shadow:none}h1,dt,p,.amount span{color:#444!important}}';
    const art = look
        ? `<div class="art" style="aspect-ratio:${look.ratio.toFixed(4)}">${look.layers.map(l => `<img alt="" src="${esc(l.src)}" style="${esc(l.css)}">`).join('')}</div>`
        : '';
    // A gift that was a token (its XEC only paid the way home) leads with the token; the XEC is a line among the rest.
    const tokenLead = k.token !== undefined && BigInt(k.sats) <= TOKEN_GIFT_XEC_SATS;
    const detail: [string, string][] = tokenLead
        ? rows.filter(([label]) => label !== t('kept.row.token')).map(([label, v]) => [label === t('kept.row.amount') ? t('gift.amount.fee') : label, v])
        : rows.slice(1);
    const lead = tokenLead ? `<div class="amount amount--token">${esc(keptTokenText(k.token!, lang))}</div>` : `<div class="amount">${esc(formatXec(BigInt(k.sats), lang))}<span>XEC</span></div>`;
    return (
        `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
        // The file asks for nothing and runs nothing, and says so to the browser that opens it. Its pictures are inside it.
        `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">` +
        `<title>${esc(t('kept.file.title'))}</title><style>${css}</style></head><body><main>` +
        `<div class="card">${art}<div class="body">` +
        `<h1>${esc(t('kept.file.title'))}</h1>` +
        (k.wish ? `<blockquote>${esc(k.wish)}</blockquote>` : '') +
        lead +
        `<dl>${detail.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>` +
        `</div></div>` +
        `<p>${esc(t('kept.file.note'))}</p>` +
        `</main></body></html>\n`
    );
}

/** Hand the keepsake page to the browser as a file. False when the browser cannot. */
export function downloadKeepsake(k: Kept, lang: Lang, wrapperName: string, look: KeepsakeLook | null = null): boolean {
    try {
        const blob = new Blob([keepsakePage(k, lang, wrapperName, look)], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gift-${k.ref.slice(0, 8)}.html`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        return true;
    } catch {
        return false;
    }
}
