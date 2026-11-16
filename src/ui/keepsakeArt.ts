/**
 * A wrapper as a still picture, for the keepsake file a person downloads.
 *
 * The stage draws a wrapper from layered pictures moved by CSS transforms.
 * Here a stage is put up off the page, frozen fully open, and each layer is
 * read back: where it sits, how it is turned, and its picture — fetched from
 * this site and carried inside the file as a `data:` URI, so the file needs
 * nothing from anywhere once it is on disk. No script, no outside address.
 *
 * Only the wrappers shipped with the page are ever drawn: their pictures are
 * the page's own files, never a stranger's.
 */
import type { WrapperDef } from '../stage';
import { themeTokens } from './theme';
import { stageCard } from './stageCard';

export interface ArtLayer {
    /** The layer's picture, as a `data:image/svg+xml;base64,…` URI. */
    readonly src: string;
    /** left, top, width, height, transform, transform-origin, opacity, mix-blend-mode: as the stage set them. */
    readonly css: string;
}

export interface KeepsakeLook {
    /** width / height of the wrapper's canvas. */
    readonly ratio: number;
    readonly layers: readonly ArtLayer[];
    /** What stands behind the layers: the wrapper's own backdrop. */
    readonly backdrop?: string;
    /** The wrapper's own colours, as the page wears them. */
    readonly colours: { readonly ground: string; readonly surface: string; readonly ink: string; readonly accent: string; readonly dim: string };
}

const PROPS = ['left', 'top', 'width', 'height', 'transform', 'transform-origin', 'opacity', 'mix-blend-mode'] as const;
/** Only what a number, a unit, a function name and a blend word are made of: nothing that could end a declaration and start another thing. */
const SAFE_VALUE = /^[a-z0-9 .,%()-]{1,160}$/i;
const HEX = /^#[0-9a-f]{6}$/i;

function toBase64(bytes: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
}

/** The pictures and their places, per set of art: a wrapper in ten accents is read off one stage, once. */
const cache = new Map<string, Promise<Omit<KeepsakeLook, 'colours' | 'backdrop'> | null>>();
const artKey = (def: WrapperDef): string => `${def.id}|${def.layers.map(l => l.art).join(',')}`;

/** The still look of a built-in wrapper, or null when it cannot be had (offline, an old browser). The art is asked for once per wrapper and colourway; the colours are the dressed wrapper's own. */
export function keepsakeLook(def: WrapperDef | undefined): Promise<KeepsakeLook | null> {
    if (!def) return Promise.resolve(null);
    const tk = themeTokens(def);
    const colours = { ground: tk.ground, surface: tk.surface, ink: tk.ink, accent: tk.accent, dim: tk.dim };
    if (!Object.values(colours).every(c => HEX.test(c))) return Promise.resolve(null);
    const backdrop = typeof def.backdrop === 'string' && HEX.test(def.backdrop) ? def.backdrop : colours.ground;
    const key = artKey(def);
    const dress = (art: Omit<KeepsakeLook, 'colours' | 'backdrop'> | null): KeepsakeLook | null => (art ? { ...art, colours, backdrop } : null);
    const seen = cache.get(key);
    if (seen) return seen.then(dress);
    const made = draw(def)
        .catch(() => null)
        .then(look => {
            // A look that could not be had (offline just then) is asked for again next time.
            if (look === null) cache.delete(key);
            return look;
        });
    cache.set(key, made);
    return made.then(dress);
}

async function draw(def: WrapperDef): Promise<Omit<KeepsakeLook, 'colours' | 'backdrop'> | null> {
    // Read everything off the stage at once and take it down again: nothing of it lives through the fetching.
    const card = stageCard(def, { still: true });
    let seen: { src: string; css: string }[];
    try {
        if (!card.handle) return null;
        card.handle.seek(Infinity);
        seen = ([...card.el.querySelectorAll('img')] as HTMLImageElement[]).flatMap(img => {
            const opacity = img.style.getPropertyValue('opacity');
            const src = img.getAttribute('src');
            // A layer the open wrapper does not show is not carried.
            if (!src || (opacity !== '' && Number(opacity) === 0)) return [];
            const css = PROPS.map(p => [p, img.style.getPropertyValue(p)] as const)
                .filter(([, v]) => v !== '' && SAFE_VALUE.test(v))
                .map(([p, v]) => `${p}:${v}`)
                .join(';');
            return [{ src, css }];
        });
    } finally {
        card.destroy();
    }
    if (seen.length === 0) return null;
    const pictures = new Map<string, Promise<string>>();
    const picture = (url: string): Promise<string> => {
        let p = pictures.get(url);
        if (!p) {
            p = (async () => {
                // The page's own files only: the same origin, under the wrappers' folder.
                const u = new URL(url, location.origin);
                if (u.origin !== location.origin || !u.pathname.startsWith('/wrappers/') || !u.pathname.endsWith('.svg') || !/^(\?v=[a-z0-9]{1,16})?$/.test(u.search)) throw new Error('Not a wrapper picture');
                // With its version, as the stage asked for it: the same entry in the browser's cache.
                const res = await fetch(u.pathname + u.search);
                if (!res.ok) throw new Error('No picture');
                return 'data:image/svg+xml;base64,' + toBase64(new Uint8Array(await res.arrayBuffer()));
            })();
            pictures.set(url, p);
        }
        return p;
    };
    const layers: ArtLayer[] = [];
    for (const l of seen) layers.push({ src: await picture(l.src), css: l.css });
    return { ratio: def.size[0] / def.size[1], layers };
}
