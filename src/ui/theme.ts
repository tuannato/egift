/**
 * The frame wears the gift.
 *
 * The page has no look of its own beyond a neutral dark glass. Whatever
 * wrapper is on stage hands the frame a theme — five colours and four choices
 * (`ThemeDef`) — and the capsule, the islands, every control, the type and
 * the sounds follow it.
 *
 * A wrapper brings data, never styles: the frame owns how each material,
 * corner and face is built (`capsule.css`), derives the quiet text colours
 * itself so they stay readable on any surface, and keeps the colours of a
 * warning, an error and a success for itself.
 */
import type { ThemeDef, WrapperDef } from '../stage';
import { READABLE_FLOOR, SIGNALS, contrast, luminance, mix, readableOn } from '../stage';
import { setSound, setVoice } from './sound';

/** The look when no wrapper is on stage. */
export const NEUTRAL: ThemeDef = {
    ground: '#060607',
    surface: '#141417',
    ink: '#F5F5F2',
    accent: '#F5F5F2',
    onAccent: '#060607',
    material: 'glass',
    corner: 'round',
    face: 'grotesk',
    voice: 'glass',
};

export { READABLE_FLOOR };

export interface ThemeTokens extends ThemeDef {
    /** Secondary text: readable, a step quieter than ink. */
    readonly dim: string;
    /** The quietest running text: still at least 4.5:1. */
    readonly mute: string;
    /** Marks, placeholders and dots only: never running text. */
    readonly faint: string;
    readonly danger: string;
    readonly warn: string;
    readonly ok: string;
    /** Whether the surface is a light or a dark one. */
    readonly tone: 'light' | 'dark';
}

/** The quietest mix of ink into the surface that still has `floor` contrast, starting from `from`. */
function quiet(ink: string, surface: string, from: number, floor: number): string {
    for (let p = from; p < 1; p += 0.02) {
        const c = mix(ink, surface, p);
        if (contrast(c, surface) >= floor) return c;
    }
    return ink;
}

/** A strongly coloured surface makes the most saturated signal colours vibrate against it: start from the plainer ones. */
function signal(kind: keyof typeof SIGNALS, surface: string): string {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(surface.slice(i, i + 2), 16)) as [number, number, number];
    const max = Math.max(r, g, b);
    const saturated = max > 60 && (max - Math.min(r, g, b)) / max > 0.6;
    return readableOn(saturated ? SIGNALS[kind].slice(1) : SIGNALS[kind], surface);
}

/** Everything the frame needs to wear a wrapper. Pure. A wrapper without a theme gets the neutral one. */
export function themeTokens(def: Pick<WrapperDef, 'theme'> | undefined): ThemeTokens {
    const th = def?.theme ?? NEUTRAL;
    return {
        ...th,
        dim: quiet(th.ink, th.surface, 0.66, 6),
        mute: quiet(th.ink, th.surface, 0.5, READABLE_FLOOR),
        faint: quiet(th.ink, th.surface, 0.3, 2.2),
        danger: signal('danger', th.surface),
        warn: signal('warn', th.surface),
        ok: signal('ok', th.surface),
        tone: luminance(th.surface) > 0.35 ? 'light' : 'dark',
    };
}

/**
 * Dress an element — the page by default — in a wrapper's theme: colours as
 * custom properties, the four choices as data attributes. On the page it also
 * sets the voice the capsule sounds in.
 */
export function applyTheme(def: Pick<WrapperDef, 'theme' | 'id' | 'sound'> | undefined, el: HTMLElement = document.documentElement): ThemeTokens {
    const tk = themeTokens(def);
    const set = (k: string, v: string) => el.style.setProperty(k, v);
    set('--th-ground', tk.ground);
    set('--th-surface', tk.surface);
    set('--th-ink', tk.ink);
    set('--th-accent', tk.accent);
    set('--th-on-accent', tk.onAccent);
    set('--th-dim', tk.dim);
    set('--th-mute', tk.mute);
    set('--th-faint', tk.faint);
    set('--danger', tk.danger);
    set('--warn', tk.warn);
    set('--ok', tk.ok);
    el.dataset.material = tk.material;
    el.dataset.corner = tk.corner;
    el.dataset.face = tk.face;
    el.dataset.tone = tk.tone;
    if (el === document.documentElement) {
        el.dataset.wears = def?.theme ? (def.id ?? '') : '';
        setVoice(tk.voice);
        setSound(def?.sound);
    }
    return tk;
}
