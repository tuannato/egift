/** Total XEC supply in sats; nothing typed above it is an amount. */
const MAX_SATS = 2_100_000_000_000_000n;

function group(digits: string, sep: string): string {
    let out = '';
    for (let i = 0; i < digits.length; i++) {
        if (i > 0 && (digits.length - i) % 3 === 0) out += sep;
        out += digits[i];
    }
    return out;
}

/** Languages that write the decimals after a comma. The group mark is a dot, or a narrow no-break space where that is the custom. */
const COMMA_DECIMAL = new Set(['vi', 'de', 'es', 'pt', 'id', 'fr', 'ru']);
const SPACE_GROUP = new Set(['fr', 'ru']);

/**
 * How a language writes a number: [mark between groups of three, mark before
 * the decimals]. A language not listed writes it the English way. Showing
 * only: what a person TYPES is read by `parseXec`, which guesses nothing.
 */
export function numberMarks(lang: string): readonly [string, string] {
    if (!COMMA_DECIMAL.has(lang)) return [',', '.'];
    return [SPACE_GROUP.has(lang) ? '\u202F' : '.', ','];
}

/**
 * `123456n` -> `"1,234.56"` in `en`, `"1.234,56"` in `vi`. Trailing `.00` is
 * dropped; otherwise always two decimals (`5.40`). No unit. Pure bigint, so
 * no float rounding at any size.
 */
export function formatXec(sats: bigint, lang: string): string {
    const [groupSep, decimalMark] = numberMarks(lang);
    const neg = sats < 0n;
    const abs = neg ? -sats : sats;
    const whole = group((abs / 100n).toString(), groupSep);
    const cents = abs % 100n;
    const body = cents === 0n ? whole : `${whole}${decimalMark}${cents.toString().padStart(2, '0')}`;
    return neg ? `-${body}` : body;
}

const PLAIN_RE = /^(\d+)(?:([.,])(\d{1,2}))?$/;
const GROUPED_RE = /^(\d{1,3})((?:([ .,])\d{3})(?:\3\d{3})*)(?:([.,])(\d{1,2}))?$/;

/**
 * Parse what a person typed as an XEC amount. Returns sats, or `null` when it
 * is not an amount. When in doubt it returns `null`: a wrong guess moves money.
 *
 * Accepted shapes (after trimming; NBSP and narrow NBSP count as a space):
 * - `10`, `0`                  plain integer
 * - `10.5`, `10,5`, `10.25`    one `.` or `,` followed by 1 or 2 digits: decimals
 * - `1 234`, `1 234 567`       space-grouped integer (groups of exactly 3)
 * - `1,234,567`, `1.234.567`   two or more groups with the same `,` or `.`
 * - `1,234.56`, `1.234,56`, `1 234,56`, `1 234.56`
 *                              grouping followed by the OTHER mark and 1-2 decimals
 *
 * Rejected: `1,234` and `1.234` (one separator, exactly 3 digits after it and
 * nothing else: it is 1234 in English and 1.234 in some locales, so we do not
 * guess), more than 2 decimals, negatives, exponents, `.5`, `10.`, mixed or
 * irregular grouping, empty input, and anything over the total supply.
 */
export function parseXec(input: string): bigint | null {
    const sats = parseUncapped(input);
    return sats === null || sats > MAX_SATS ? null : sats;
}

/** Why `parseXec` refused an input. */
export type XecRefusal = 'empty' | 'ambiguous-separator' | 'too-many-decimals' | 'too-large' | 'not-a-number';

/**
 * Why `parseXec(input)` returns `null`, for a hint under the field; `null`
 * when `parseXec` accepts the input.
 * - `empty`: nothing but blanks.
 * - `ambiguous-separator`: `1,234` / `100.000`: one `,` or `.` with exactly 3
 *   digits after it. Suggest `100000`, `100 000`, or 1-2 decimals.
 * - `too-many-decimals`: a decimal part of 3+ digits that is not the case above (`10.1234`, `1,234.567`).
 * - `too-large`: over the total XEC supply.
 * - `not-a-number`: anything else (letters, signs, exponents, odd grouping).
 */
export function whyNotXec(input: string): XecRefusal | null {
    if (typeof input !== 'string') return 'not-a-number';
    const s = clean(input);
    if (s.length === 0) return 'empty';
    const raw = parseUncapped(input);
    if (raw !== null) return raw > MAX_SATS ? 'too-large' : null;
    // A leading 0 is never a thousands group: `0,001` is too many decimals.
    if (/^[1-9]\d{0,2}[.,]\d{3}$/.test(s)) return 'ambiguous-separator';
    if (/^\d[\d .,]*[.,]\d{3,}$/.test(s)) return 'too-many-decimals';
    return 'not-a-number';
}

/** Trim, and read NBSP / narrow NBSP as a plain space. */
function clean(input: string): string {
    return input.replace(/[\u00a0\u202f]/g, ' ').trim();
}

function parseUncapped(input: string): bigint | null {
    if (typeof input !== 'string') return null;
    const s = clean(input);
    if (s.length === 0 || s.length > 40) return null;

    let whole: string;
    let frac = '';
    const plain = PLAIN_RE.exec(s);
    if (plain) {
        whole = plain[1]!;
        frac = plain[3] ?? '';
    } else {
        const g = GROUPED_RE.exec(s);
        if (!g) return null;
        const groupSep = g[3]!;
        const mark = g[4];
        if (mark !== undefined && mark === groupSep) return null;
        const groups = g[2]!.split(groupSep).length - 1;
        // `1,234` / `1.234` alone is ambiguous; PLAIN_RE did not take it
        // (3 decimals), and here we refuse to call it grouping.
        if (mark === undefined && groupSep !== ' ' && groups === 1) return null;
        whole = g[1]! + g[2]!.split(groupSep).join('');
        frac = g[5] ?? '';
    }
    return BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0') || '0');
}

/**
 * A token amount as text: atoms with the token's decimals and the language's
 * own separators. The caller never shows it in the style of an XEC amount.
 */
export function formatAtoms(atoms: bigint, decimals: number, lang: string): string {
    const d = Number.isInteger(decimals) && decimals >= 0 && decimals <= 9 ? decimals : 0;
    const neg = atoms < 0n;
    const digits = (neg ? -atoms : atoms).toString().padStart(d + 1, '0');
    const whole = digits.slice(0, digits.length - d);
    const frac = d === 0 ? '' : digits.slice(-d).replace(/0+$/, '');
    const [group, point] = numberMarks(lang);
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, group);
    return (neg ? '-' : '') + grouped + (frac === '' ? '' : point + frac);
}
