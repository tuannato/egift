/** Colour maths for themes: WCAG relative luminance and contrast of `#rrggbb` colours. Pure. */

function channel(v: number): number {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance, 0 (black) to 1 (white). Anything that is not `#rrggbb` counts as black. */
export function luminance(hex: string): number {
    if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return 0;
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Whether a surface is a light or a dark one: the one rule the frame and a shared accent's two shades both go by. */
export function surfaceTone(surface: string): 'light' | 'dark' {
    return luminance(surface) > 0.35 ? 'light' : 'dark';
}

/** WCAG contrast ratio of two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `a` mixed into `b`, `p` from 0 (all b) to 1 (all a), in sRGB. */
export function mix(a: string, b: string, p: number): string {
    const ch = (i: number): string => {
        const x = parseInt(a.slice(1 + i * 2, 3 + i * 2), 16);
        const y = parseInt(b.slice(1 + i * 2, 3 + i * 2), 16);
        return Math.round(y + (x - y) * p)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${ch(0)}${ch(1)}${ch(2)}`;
}

/**
 * The frame's own colours for an error, a caution and a success: candidates
 * from the most saturated to the plainest. The first one readable on the
 * surface is used; a wrapper never chooses them.
 */
export const SIGNALS = {
    danger: ['#FF7A6B', '#FFB4A8', '#FFE1DC', '#B3261E', '#7A0C06'],
    warn: ['#F2C162', '#FFE3A6', '#8A5A00', '#5C3B00'],
    ok: ['#5AD6A0', '#B6F2D6', '#0F7A4D', '#064B2E'],
} as const;

/** The least contrast running text, and a signal colour, may have on the surface. */
export const READABLE_FLOOR = 4.5;

/** The first candidate readable on `surface`; the best one when none is (the validator refuses such a surface). */
export function readableOn(candidates: readonly string[], surface: string): string {
    let best = candidates[0]!;
    for (const c of candidates) {
        if (contrast(c, surface) >= READABLE_FLOOR) return c;
        if (contrast(c, surface) > contrast(best, surface)) best = c;
    }
    return best;
}

/**
 * How much of the surface a see-through material keeps at its thinnest. The
 * rest is whatever is behind it; the room is dark, so the validator checks
 * the text against the surface thinned over black.
 */
export const MATERIAL_OPACITY: Readonly<Record<string, number>> = { glass: 0.54, wire: 0.46, lacquer: 1, plate: 1 };
