/**
 * The ONE place text from a link or from the chain reaches the page.
 * `textContent` only: it can never make markup, and this never makes links.
 *
 * A stranger's text must not be able to pass itself off as the page's own
 * words. So besides control characters it loses everything that draws
 * nothing but changes the layout or the reading order: bidi controls,
 * zero-width and joiner characters, invisible "letters" and blank fillers,
 * soft hyphens, line and paragraph separators, tag characters and variation
 * selectors. Lines holding only spaces count as empty, and at most one empty
 * line stands between two lines of text.
 */

// eslint-disable-next-line no-control-regex
const STRIP = new RegExp(
    '[' +
        '\\u0000-\\u0009\\u000B-\\u001F\\u007F-\\u009F' + // C0 except \n, DEL, C1
        '\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180B-\\u180E' + // soft hyphen, joiners, fillers
        '\\u200B-\\u200F\\u2028-\\u202E\\u2060-\\u206F' + // zero-width, separators, bidi, invisible operators
        '\\u2800\\u3164\\uFE00-\\uFE0E\\uFEFF\\uFFA0\\uFFF9-\\uFFFB' + // blank braille, Hangul fillers, variation selectors (not the emoji one), BOM
        ']|\\uDB40[\\uDC00-\\uDDEF]', // tag characters and variation selectors supplement
    'g',
);
// Every kind of space but the plain one and the newline becomes a plain space.
const SPACES = /[\t\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

export function cleanUserText(s: string): string {
    return String(s)
        .replace(STRIP, '')
        .replace(SPACES, ' ')
        .replace(/[ ]+\n/g, '\n')
        .replace(/\n[ ]+(?=\n)/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function setUserText(el: Element, s: string): void {
    el.textContent = cleanUserText(s);
}
