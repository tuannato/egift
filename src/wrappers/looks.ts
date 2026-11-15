/**
 * Dressing a wrapper (workshop, tier 1): the giver's closed choices — an
 * accent, a face, quiet, and for a few wrappers a colourway of the art —
 * applied to a wrapper's data. A colourway is a set of pictures drawn at
 * build time (`scripts/colourways.mjs`): nothing is recoloured on the phone.
 * The choices arrive as a recipe (`core/recipe.ts`), which nobody
 * signs: whatever cannot be applied leaves the wrapper as its maker made it.
 *
 * Pure: no DOM, no storage.
 */
import type { SoundDef, ThemeDef, WrapperDef } from '../stage/format';
import { surfaceTone } from '../stage/colour';
import { parseRecipe } from '../core/recipe';
import { COLOURWAYS, type Colourway } from './colourways.gen';

export { COLOURWAYS, type Colourway };

/** The colourways of a wrapper's art, in the order their places went out in links; none for most wrappers. */
export function colourwaysOf(id: string): readonly Colourway[] {
    // Not `Object.hasOwn`: older phones' browsers lack it, and reading a link must never throw.
    return Object.prototype.hasOwnProperty.call(COLOURWAYS, id) ? COLOURWAYS[id]!.ways : [];
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;
/** `x` with every colour the map names replaced. */
function recoloured<T>(x: T, way: Colourway): T {
    if (typeof x === 'string') return (HEX6.test(x) ? (way.map[x.toUpperCase()] ?? x) : x) as T;
    if (Array.isArray(x)) return x.map(v => recoloured(v, way)) as T;
    if (x !== null && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, recoloured(v, way)])) as T;
    return x;
}

const drawn = new WeakMap<WrapperDef, Map<string, WrapperDef>>();
/**
 * A wrapper in one colourway of its art: its colours through the map, and
 * each layer whose picture has a twin pointed at the twin. Words, the opening
 * and the sound are the wrapper's own objects (the page tells "the sound
 * changed" by identity). Made once per wrapper and colourway.
 */
function inColourway(def: WrapperDef, way: Colourway): WrapperDef {
    let ways = drawn.get(def);
    if (!ways) drawn.set(def, (ways = new Map()));
    let out = ways.get(way.id);
    if (!out) {
        const { id, name, blurb, sound, open, idle, afterglow, layers, ...rest } = def;
        const twins = new Set(way.files);
        out = {
            ...recoloured(rest, way),
            id,
            name,
            ...(blurb !== undefined ? { blurb } : {}),
            ...(sound !== undefined ? { sound } : {}),
            open,
            ...(idle !== undefined ? { idle } : {}),
            ...(afterglow !== undefined ? { afterglow } : {}),
            layers: layers.map(l => (twins.has(l.art) ? { ...recoloured(l, way), art: `cw-${way.id}-${l.art}` } : recoloured(l, way))),
        } as WrapperDef;
        ways.set(way.id, out);
    }
    return out;
}

/**
 * The accents every wrapper shares. Forever: a place in this list has gone
 * out in links (`c` + its letter, the first is `a`), so the list is only ever
 * added to at its end, and a shade is never changed (`forever.test.ts`).
 *
 * Each is two pairs — the accent and what is written on it — one for a light
 * capsule and one for a dark one: [light, on light, dark, on dark].
 */
export const ACCENTS: readonly (readonly [string, string, string, string])[] = [
    ['#17181C', '#FFFFFF', '#F3F1EC', '#15161A'], // 0 a ink
    ['#435B70', '#FFFFFF', '#AFC7DD', '#081520'], // 1 b slate
    ['#25397E', '#FFFFFF', '#9FB6F2', '#0E1321'], // 2 c navy
    ['#0074C2', '#FFFFFF', '#76B6F7', '#091521'], // 3 d ecash blue
    ['#006580', '#FFFFFF', '#7ACAE9', '#03171E'], // 4 e lagoon
    ['#006566', '#FFFFFF', '#72D0D0', '#021818'], // 5 f teal
    ['#4C6340', '#FFFFFF', '#B4CDA7', '#0E1709'], // 6 g sage
    ['#686722', '#FFFFFF', '#C9C984', '#151505'], // 7 h olive
    ['#9A4825', '#FFFFFF', '#EEA285', '#1F0F09'], // 8 i terracotta
    ['#7E1E35', '#FFFFFF', '#F09DA6', '#1F0E10'], // 9 j wine
    ['#984260', '#FFFFFF', '#F3A3BB', '#1F0E13'], // 10 k rose
    ['#852E6D', '#FFFFFF', '#E79BCE', '#1D0E18'], // 11 l berry
    ['#5E4065', '#FFFFFF', '#CFB2D6', '#1A0F1C'], // 12 m plum
    ['#5E3D9E', '#FFFFFF', '#BCA9F7', '#151120'], // 13 n violet
];

/** Whether a wrapper's capsule is a light or a dark one: the same rule the frame dresses by (`ui/theme.ts`). */
export function toneOf(theme: Pick<ThemeDef, 'surface'>): 'light' | 'dark' {
    return surfaceTone(theme.surface);
}

/** A shared accent in the shade this theme's tone selects, or nothing when the list has no such place. */
export function accentFor(theme: Pick<ThemeDef, 'surface'>, index: number): { accent: string; onAccent: string } | undefined {
    const a = ACCENTS[index];
    if (!a) return undefined;
    return toneOf(theme) === 'light' ? { accent: a[0], onAccent: a[1] } : { accent: a[2], onAccent: a[3] };
}

/** One dressed wrapper per wrapper and look, and one tuneless sound per sound: see `dressed`. */
const worn = new WeakMap<WrapperDef, Map<string, WrapperDef>>();
const hushed = new WeakMap<SoundDef, SoundDef>();

/**
 * The wrapper as the recipe dresses it: the same wrapper (same id) with its
 * accent and what is written on it, its face, its tune, or the colourway of
 * its art replaced.
 * With nothing to apply — no recipe, a string that is not one, an accent the
 * list does not have, the wrapper's own face — it is `def` itself.
 *
 * The same wrapper and the same look always give the same object, and a look
 * that keeps the tune keeps the wrapper's own sound object: the page tells
 * "the sound changed" by identity and would cut a playing tune otherwise.
 */
export function dressed(def: WrapperDef, recipe: string | undefined | null): WrapperDef {
    const r = parseRecipe(recipe);
    if (!r) return def;
    // A colourway this wrapper does not have: the whole look is set aside, as for an accent the list lacks.
    const way = r.art !== undefined ? colourwaysOf(def.id)[r.art] : undefined;
    if (r.art !== undefined && !way) return def;
    const base = way ? inColourway(def, way) : def;
    const th = base.theme;
    const shade = th && r.accent !== undefined ? accentFor(th, r.accent) : undefined;
    // An accent this page does not have (a place in the list not filled yet): the whole look is set aside, not half of it.
    if (r.accent !== undefined && !shade) return def;
    const face = th && r.face !== undefined && r.face !== th.face ? r.face : undefined;
    const quiet = r.quiet === true && def.sound?.score !== undefined;
    if (!way && !shade && !face && !quiet) return def;
    // What is really applied, not how it was spelled: two recipes that dress alike are one look.
    const key = `${shade ? r.accent : ''}.${face ?? ''}.${quiet ? 'q' : ''}.${way ? way.id : ''}`;
    let looks = worn.get(def);
    if (!looks) worn.set(def, (looks = new Map()));
    let out = looks.get(key);
    if (!out) {
        let sound = def.sound;
        if (quiet && sound) {
            sound = hushed.get(sound);
            if (!sound) {
                // Its instrument and home note stay: the small sounds under the hand are made from them.
                const { score: _tune, ...rest } = def.sound!;
                hushed.set(def.sound!, (sound = rest));
            }
        }
        out = !shade && !face && !quiet ? base : { ...base, ...(th && (shade || face) ? { theme: { ...th, ...shade, ...(face ? { face } : {}) } } : {}), ...(sound ? { sound } : {}) };
        looks.set(key, out);
    }
    return out;
}
