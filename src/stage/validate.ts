/**
 * The validator: a wrapper is data from strangers, so it is held to exactly
 * what `format.ts` states and nothing else. Whitelist at every level: an
 * unknown key, kind, ease or field is a problem. It reports every problem at
 * once, as plain sentences, and never throws whatever it is given.
 */
import { INSTRUMENT_NAMES, SOUND_LIMITS, THEME_CHOICES, THEME_CONTRAST, WRAPPER_LIMITS } from './format';
import { MATERIAL_OPACITY, READABLE_FLOOR, SIGNALS, contrast, luminance, mix, readableOn } from './colour';

const EASES = ['linear', 'in', 'out', 'inout', 'back', 'bounce'];
const POSE_RANGE: Record<string, readonly [number, number]> = {
    x: [-10000, 10000],
    y: [-10000, 10000],
    turn: [-7200, 7200],
    sx: [-4, 4],
    sy: [-4, 4],
    opacity: [0, 1],
};
const IDLE_FIELDS = ['x', 'y', 'turn', 'sx', 'sy', 'opacity'];
const BLENDS = ['screen', 'multiply', 'overlay', 'lighten'];
/** Cap on how many array entries are inspected, so a huge array cannot make validation slow. */
const SCAN = 200;
/** Bound on box position and size, in wrapper units. */
const MAX_BOX = 4000;
/** Most particle images one wrapper may scatter in all (shipped wrappers use at most 58). */
const MAX_SCATTER_TOTAL = 120;
/** Words that have no business in a name or any string: a scheme or markup. */
const UNSAFE_TEXT = /(?:^|[^a-z])(?:javascript|vbscript|data|file|blob)\s*:|[<>\u0000-\u001f\u007f]/i;

type Rec = Record<string, unknown>;

function isPlain(v: unknown): v is Rec {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
    const proto = Object.getPrototypeOf(v) as unknown;
    return proto === Object.prototype || proto === null;
}

function shown(v: unknown): string {
    if (typeof v === 'string') return JSON.stringify(v.length > 40 ? `${v.slice(0, 40)}…` : v);
    if (typeof v === 'number' || typeof v === 'boolean' || v === null || v === undefined) return String(v);
    if (typeof v === 'function') return 'a function';
    return Array.isArray(v) ? 'a list' : 'an object';
}

function num(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

/** Own data properties of `o`; accessors and symbols are reported, never read. */
function props(o: Rec, allowed: readonly string[], where: string, p: string[]): Rec {
    const out: Rec = Object.create(null) as Rec;
    for (const key of Reflect.ownKeys(o)) {
        if (typeof key !== 'string') {
            p.push(`${where} has a symbol key, which a wrapper may not carry.`);
            continue;
        }
        const d = Object.getOwnPropertyDescriptor(o, key);
        if (d === undefined || !('value' in d)) {
            p.push(`${where} has "${key.slice(0, 40)}" as a getter or setter, which is code, not data.`);
            continue;
        }
        if (!allowed.includes(key)) {
            p.push(`${where} has an unknown field "${key.slice(0, 40)}"; a wrapper carries only what the stage understands.`);
            continue;
        }
        out[key] = d.value as unknown;
    }
    return out;
}

function numberIn(v: unknown, min: number, max: number, what: string, p: string[], integer = false): v is number {
    if (!num(v)) {
        p.push(`${what} must be a finite number, not ${shown(v)}.`);
        return false;
    }
    if (v < min || v > max) {
        p.push(`${what} must be between ${min} and ${max}, not ${v}.`);
        return false;
    }
    if (integer && !Number.isInteger(v)) {
        p.push(`${what} must be a whole number, not ${v}.`);
        return false;
    }
    return true;
}

function poseFields(v: unknown, what: string, p: string[]): void {
    if (!isPlain(v)) {
        p.push(`${what} must be an object of pose fields.`);
        return;
    }
    const f = props(v, Object.keys(POSE_RANGE), what, p);
    for (const k of Object.keys(f)) {
        const [lo, hi] = POSE_RANGE[k]!;
        numberIn(f[k], lo, hi, `${what}.${k}`, p);
    }
}

function pattern(v: unknown, re: RegExp, what: string, hint: string, p: string[]): v is string {
    if (typeof v !== 'string' || v.length > 100 || !re.test(v)) {
        p.push(`${what} must be ${hint}, not ${shown(v)}.`);
        return false;
    }
    return true;
}

function tuple(v: unknown, n: number, what: string, p: string[]): v is readonly number[] {
    if (!Array.isArray(v) || v.length !== n) {
        p.push(`${what} must be a list of exactly ${n} numbers.`);
        return false;
    }
    let ok = true;
    for (let i = 0; i < n; i += 1) {
        if (!num(v[i])) {
            p.push(`${what}[${i}] must be a finite number, not ${shown(v[i])}.`);
            ok = false;
        }
    }
    return ok;
}

function nameText(v: unknown, what: string, p: string[]): void {
    if (typeof v !== 'string' || v.trim() === '') {
        p.push(`${what} must be a non-empty string.`);
    } else if (v.length > 40) {
        p.push(`${what} must be at most 40 characters, not ${v.length}.`);
    } else if (UNSAFE_TEXT.test(v)) {
        p.push(`${what} holds markup, a control character or a script-like scheme.`);
    } else {
        // The frame shows this as its own words: a name is letters, digits, spaces, hyphens and apostrophes, nothing else.
        if (!/^[\p{L}\p{N}\p{M} '\-]+$/u.test(v)) p.push(`${what} may hold only letters, digits, spaces, hyphens and apostrophes.`);
        impersonation(v, what, p);
    }
}

/** Names nobody but the house may sign with, compared without case, accents, spaces or punctuation. */
const RESERVED = ['egift', 'egiftcash', 'gift', 'ecash', 'cashtab', 'bitcoinabc', 'stall', 'stallcash', 'agora', 'paybutton', 'chronik', 'avalanche', 'official', 'chinhthuc', 'support', 'hotro', 'admin'];
/** Something that reads as a place to go or a person to write to. */
const ADDRESS_LIKE = /(?:https?:|www\.|[a-z0-9-]+\.(?:com|net|org|io|cash|xyz|me|app|dev|vn|co|info|link|gg|ly)\b|@[a-z0-9_]{2,}|\bt\.me\b|\becash:|\betoken:)/i;

/** Text a stranger wrote and the frame prints must not pass for the house, point anywhere, or hide characters. */
function impersonation(v: string, what: string, p: string[]): void {
    if (/\p{Cf}/u.test(v)) p.push(`${what} holds an invisible character.`);
    if (/\p{M}{3,}/u.test(v.normalize('NFD').replace(/[\u0300-\u0323]{1,2}/g, ''))) p.push(`${what} stacks too many marks on one letter.`);
    if (ADDRESS_LIKE.test(v)) p.push(`${what} holds a web address, a handle or a wallet address.`);
    const flat = v
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
    const hit = RESERVED.find(r => flat === r || flat.startsWith(r) || flat.endsWith(r));
    if (hit !== undefined) p.push(`${what} uses a name reserved for the page and the eCash projects ("${hit}").`);
}

const THEME_COLOURS = ['ground', 'surface', 'ink', 'accent', 'onAccent'] as const;

/** A theme is five hex colours and four choices from fixed lists; the colours must keep text readable. */
function themeProblems(theme: unknown, p: string[]): void {
    if (!isPlain(theme)) {
        p.push('theme must be a plain object.');
        return;
    }
    const t = props(theme, [...THEME_COLOURS, 'material', 'corner', 'face', 'voice'], 'The theme', p);
    let coloursOk = true;
    for (const key of THEME_COLOURS) {
        const before = p.length;
        pattern(t[key], WRAPPER_LIMITS.colorPattern, `theme.${key}`, 'a hex colour like #aabbcc', p);
        if (p.length !== before) coloursOk = false;
    }
    for (const key of ['material', 'corner', 'face', 'voice'] as const) {
        const list: readonly string[] = THEME_CHOICES[key];
        if (typeof t[key] !== 'string' || !list.includes(t[key] as string)) p.push(`theme.${key} must be one of ${list.join(', ')}, not ${shown(t[key])}.`);
    }
    if (!coloursOk) return;
    const c = t as Record<(typeof THEME_COLOURS)[number], string>;
    const fixed = (n: number) => n.toFixed(1);
    const inkOn = contrast(c.ink, c.surface);
    if (inkOn < THEME_CONTRAST.inkOnSurface) p.push(`theme.ink on theme.surface has a contrast of ${fixed(inkOn)}:1; text needs at least ${THEME_CONTRAST.inkOnSurface}:1.`);
    const accentOn = contrast(c.accent, c.surface);
    if (accentOn < THEME_CONTRAST.accentOnSurface) p.push(`theme.accent on theme.surface has a contrast of ${fixed(accentOn)}:1; a control needs at least ${THEME_CONTRAST.accentOnSurface}:1.`);
    const onAccent = contrast(c.onAccent, c.accent);
    if (onAccent < THEME_CONTRAST.onAccent) p.push(`theme.onAccent on theme.accent has a contrast of ${fixed(onAccent)}:1; a label needs at least ${THEME_CONTRAST.onAccent}:1.`);
    if (luminance(c.ground) > THEME_CONTRAST.maxGroundLuminance) p.push('theme.ground must be dark: the room is lit by the gift, not by the page.');
    // The frame's own colours for an error, a caution and a success must have a readable candidate on this surface.
    for (const kind of ['danger', 'warn', 'ok'] as const) {
        const best = contrast(readableOn(SIGNALS[kind], c.surface), c.surface);
        if (best < READABLE_FLOOR) p.push(`theme.surface leaves no readable colour for ${kind} messages (best ${fixed(best)}:1); choose a darker or a lighter surface.`);
    }
    // A see-through material is the surface thinned over the dark room: the text must hold there too.
    const opacity = MATERIAL_OPACITY[String(t.material)] ?? 1;
    if (opacity < 1) {
        const thin = mix(c.surface, '#000000', opacity);
        const inkThin = contrast(c.ink, thin);
        if (inkThin < READABLE_FLOOR) p.push(`theme.ink on a see-through ${String(t.material)} surface has a contrast of ${fixed(inkThin)}:1 over the dark room; it needs at least ${READABLE_FLOOR}:1. Use a darker surface or an opaque material.`);
    }
    // A light plate carries dark wells with their own light text; a dark plate has no such design.
    if (t.material === 'plate' && luminance(c.surface) < 0.35) p.push('theme.material "plate" needs a light surface.');
    if (t.material === 'lacquer' && luminance(c.surface) > 0.2) p.push('theme.material "lacquer" needs a dark surface.');
}

/** A wrapper's own sound: one instrument, a home note, and a tune held to what is short, quiet and playable. */
function soundProblems(sound: unknown, revealAt: unknown, p: string[]): void {
    if (!isPlain(sound)) {
        p.push('sound must be a plain object.');
        return;
    }
    const s = props(sound, ['v', 'inst', 'tonic', 'score'], 'The sound', p);
    if (s.v !== 1) p.push(`sound.v must be 1, not ${shown(s.v)}.`);
    const names: readonly string[] = INSTRUMENT_NAMES;
    if (typeof s.inst !== 'string' || !names.includes(s.inst)) p.push(`sound.inst must be one of ${names.join(', ')}, not ${shown(s.inst)}.`);
    numberIn(s.tonic, SOUND_LIMITS.tonic[0], SOUND_LIMITS.tonic[1], 'sound.tonic', p);
    if (s.score === undefined) return;
    if (!Array.isArray(s.score)) {
        p.push('sound.score must be a list of notes.');
        return;
    }
    if (s.score.length > SOUND_LIMITS.notes) {
        p.push(`sound.score has ${s.score.length} notes; a tune has at most ${SOUND_LIMITS.notes}.`);
        return;
    }
    const held: { at: number; end: number; gain: number }[] = [];
    let clean = true;
    s.score.forEach((raw, i) => {
        const what = `sound.score[${i}]`;
        const before = p.length;
        if (!isPlain(raw)) {
            p.push(`${what} must be a plain object.`);
            clean = false;
            return;
        }
        const n = props(raw, ['at', 'pitch', 'dur', 'gain', 'inst', 'bend'], what, p);
        numberIn(n.at, 0, WRAPPER_LIMITS.maxOpenMs + SOUND_LIMITS.afterReveal, `${what}.at`, p);
        numberIn(n.pitch, SOUND_LIMITS.pitch[0], SOUND_LIMITS.pitch[1], `${what}.pitch`, p);
        numberIn(n.dur, SOUND_LIMITS.dur[0], SOUND_LIMITS.dur[1], `${what}.dur`, p);
        if (n.gain !== undefined) numberIn(n.gain, 0, 1, `${what}.gain`, p);
        if (n.bend !== undefined) numberIn(n.bend, -SOUND_LIMITS.bend, SOUND_LIMITS.bend, `${what}.bend`, p);
        if (n.inst !== undefined && (typeof n.inst !== 'string' || !names.includes(n.inst))) p.push(`${what}.inst must be one of ${names.join(', ')}, not ${shown(n.inst)}.`);
        if (p.length !== before) {
            clean = false;
            return;
        }
        held.push({ at: n.at as number, end: (n.at as number) + (n.dur as number), gain: (n.gain as number | undefined) ?? 0.6 });
    });
    if (!clean) return;
    // The tune is let go soon after the reveal: it accompanies the opening, it does not outstay it.
    if (num(revealAt)) {
        const end = held.reduce((a, n) => Math.max(a, n.end), 0);
        if (end > revealAt + SOUND_LIMITS.afterReveal) p.push(`sound.score ends at ${Math.round(end)} ms; a tune must be over ${SOUND_LIMITS.afterReveal} ms after the reveal (${revealAt + SOUND_LIMITS.afterReveal}).`);
    }
    // Never many notes at once, and never a wall of them: checked at every note's start.
    for (const n of held) {
        const now = held.filter(o => o.at <= n.at && o.end > n.at);
        if (now.length > SOUND_LIMITS.polyphony) {
            p.push(`sound.score holds ${now.length} notes at once at ${Math.round(n.at)} ms; at most ${SOUND_LIMITS.polyphony}.`);
            break;
        }
        const sum = now.reduce((a, o) => a + o.gain, 0);
        if (sum > SOUND_LIMITS.strength + 1e-9) {
            p.push(`sound.score is too strong at ${Math.round(n.at)} ms: the notes held there add up to ${sum.toFixed(2)}; at most ${SOUND_LIMITS.strength}.`);
            break;
        }
    }
}

function problemsOf(def: unknown, p: string[]): void {
    if (!isPlain(def)) {
        p.push('A wrapper must be a plain object.');
        return;
    }
    const w = props(def, ['id', 'name', 'credit', 'ambient', 'blurb', 'theme', 'focus', 'size', 'backdrop', 'layers', 'idle', 'afterglow', 'open', 'revealAt', 'sound'], 'The wrapper', p);

    pattern(w.id, WRAPPER_LIMITS.idPattern, 'The wrapper id', 'lowercase letters, digits and dashes, 1 to 24 long', p);

    if (!isPlain(w.name)) {
        p.push('The wrapper name must be an object with "vi" and "en".');
    } else {
        const n = props(w.name, ['vi', 'en'], 'The wrapper name', p);
        nameText(n.vi, 'name.vi', p);
        nameText(n.en, 'name.en', p);
    }

    if (w.credit !== undefined) nameText(w.credit, 'credit', p);

    if (w.ambient !== undefined) {
        if (!Array.isArray(w.ambient) || w.ambient.length < 2 || w.ambient.length > 4) {
            p.push('ambient must be a list of two to four hex colours.');
        } else {
            for (const c of w.ambient) pattern(c, WRAPPER_LIMITS.colorPattern, 'An ambient colour', 'a hex colour like #aabbcc', p);
        }
    }

    if (w.blurb !== undefined) {
        if (!isPlain(w.blurb)) {
            p.push('blurb must be an object with "vi" and "en".');
        } else {
            const b = props(w.blurb, ['vi', 'en'], 'The blurb', p);
            for (const lang of ['vi', 'en'] as const) {
                const v = b[lang];
                if (typeof v !== 'string' || v.trim() === '') p.push(`blurb.${lang} must be a sentence.`);
                else if ([...v].length > 140) p.push(`blurb.${lang} must be at most 140 characters, not ${[...v].length}.`);
                else if (UNSAFE_TEXT.test(v)) p.push(`blurb.${lang} holds markup, a control character or a script-like scheme.`);
                else impersonation(v, `blurb.${lang}`, p);
            }
        }
    }

    if (w.theme !== undefined) themeProblems(w.theme, p);
    if (w.sound !== undefined) soundProblems(w.sound, w.revealAt, p);

    if (w.focus !== undefined && tuple(w.focus, 2, 'focus', p)) {
        const f = w.focus as readonly number[];
        numberIn(f[0], 0.15, 0.85, 'focus x', p);
        numberIn(f[1], 0.15, 0.85, 'focus y', p);
    }

    if (tuple(w.size, 2, 'size', p)) {
        const s = w.size as readonly number[];
        numberIn(s[0], 100, 2000, 'size width', p);
        numberIn(s[1], 100, 2000, 'size height', p);
    }

    pattern(w.backdrop, WRAPPER_LIMITS.colorPattern, 'The backdrop', 'a hex colour like #aabbcc', p);

    // Layers.
    const layerIds = new Set<string>();
    if (!Array.isArray(w.layers)) {
        p.push('layers must be a list.');
    } else {
        if (w.layers.length < 1 || w.layers.length > WRAPPER_LIMITS.maxLayers) {
            p.push(`A wrapper needs 1 to ${WRAPPER_LIMITS.maxLayers} layers, not ${w.layers.length}.`);
        }
        const n = Math.min(w.layers.length, SCAN);
        for (let i = 0; i < n; i += 1) {
            const where = `layer ${i}`;
            const l: unknown = w.layers[i];
            if (!isPlain(l)) {
                p.push(`${where} must be an object.`);
                continue;
            }
            const f = props(l, ['id', 'art', 'box', 'origin', 'start', 'blend', 'depth'], where, p);
            if (f.depth !== undefined) numberIn(f.depth, 0, 1, `${where} depth`, p);
            if (f.blend !== undefined && (typeof f.blend !== 'string' || !BLENDS.includes(f.blend))) {
                p.push(`${where} blend must be one of ${BLENDS.join(', ')}, not ${shown(f.blend)}.`);
            }
            if (pattern(f.id, WRAPPER_LIMITS.idPattern, `${where} id`, 'lowercase letters, digits and dashes, 1 to 24 long', p)) {
                if (layerIds.has(f.id)) p.push(`${where} id "${f.id}" is used twice.`);
                layerIds.add(f.id);
            }
            pattern(f.art, WRAPPER_LIMITS.artPattern, `${where} art`, 'a plain file name like "body.svg" (lowercase letters, digits, dashes; no path, no query)', p);
            if (tuple(f.box, 4, `${where} box`, p)) {
                const b = f.box as readonly number[];
                if (b[2]! <= 0 || b[3]! <= 0) p.push(`${where} box must have a positive width and height.`);
                if (Math.abs(b[0]!) > MAX_BOX || Math.abs(b[1]!) > MAX_BOX) p.push(`${where} box position must be within ${MAX_BOX} units of the canvas origin.`);
                if (b[2]! > MAX_BOX || b[3]! > MAX_BOX) p.push(`${where} box width and height must be at most ${MAX_BOX}.`);
            }
            if (f.origin !== undefined && tuple(f.origin, 2, `${where} origin`, p)) {
                const o = f.origin as readonly number[];
                numberIn(o[0], 0, 1, `${where} origin x`, p);
                numberIn(o[1], 0, 1, `${where} origin y`, p);
            }
            if (f.start !== undefined) poseFields(f.start, `${where} start`, p);
        }
    }

    // Open steps.
    let length = 0;
    let finite = true;
    let scatterTotal = 0;
    if (!Array.isArray(w.open)) {
        p.push('open must be a list of steps.');
        finite = false;
    } else {
        if (w.open.length > WRAPPER_LIMITS.maxSteps) {
            p.push(`A wrapper may have at most ${WRAPPER_LIMITS.maxSteps} steps, not ${w.open.length}.`);
        }
        const n = Math.min(w.open.length, SCAN);
        for (let i = 0; i < n; i += 1) {
            const where = `step ${i}`;
            const s: unknown = w.open[i];
            if (!isPlain(s)) {
                p.push(`${where} must be an object.`);
                finite = false;
                continue;
            }
            const kind = Object.getOwnPropertyDescriptor(s, 'kind')?.value as unknown;
            const common = ['kind', 'layer', 'at', 'dur'];
            const allowed =
                kind === 'move' ? [...common, 'ease', 'to']
                : kind === 'shake' ? [...common, 'amp', 'times']
                : kind === 'scatter' ? [...common, 'count', 'spread', 'fall']
                : common;
            if (kind !== 'move' && kind !== 'shake' && kind !== 'scatter') {
                p.push(`${where} has an unknown kind ${shown(kind)}; it must be move, shake or scatter.`);
            }
            const f = props(s, allowed, where, p);
            if (typeof f.layer !== 'string' || !layerIds.has(f.layer)) p.push(`${where} names a layer that does not exist: ${shown(f.layer)}.`);
            const atOk = num(f.at) && f.at >= 0;
            const durOk = num(f.dur) && f.dur >= 0;
            if (!atOk) p.push(`${where} at must be a finite number, 0 or more, not ${shown(f.at)}.`);
            if (!durOk) p.push(`${where} dur must be a finite number, 0 or more, not ${shown(f.dur)}.`);
            if (atOk && durOk) length = Math.max(length, (f.at as number) + (f.dur as number));
            else finite = false;
            if (kind === 'move') {
                if (f.ease !== undefined && (typeof f.ease !== 'string' || !EASES.includes(f.ease))) {
                    p.push(`${where} ease must be one of ${EASES.join(', ')}, not ${shown(f.ease)}.`);
                }
                poseFields(f.to, `${where} to`, p);
            } else if (kind === 'shake') {
                numberIn(f.amp, -2000, 2000, `${where} amp`, p);
                numberIn(f.times, 1, 20, `${where} times`, p, true);
            } else if (kind === 'scatter') {
                if (numberIn(f.count, 1, WRAPPER_LIMITS.maxScatterCount, `${where} count`, p, true)) scatterTotal += f.count;
                numberIn(f.spread, 0, 5000, `${where} spread`, p);
                numberIn(f.fall, -5000, 5000, `${where} fall`, p);
            }
        }
    }
    if (scatterTotal > MAX_SCATTER_TOTAL) {
        p.push(`The scatter steps make ${scatterTotal} particles in all; the most allowed is ${MAX_SCATTER_TOTAL}.`);
    }
    if (finite && length > WRAPPER_LIMITS.maxOpenMs) {
        p.push(`The opening lasts ${length} ms; the most allowed is ${WRAPPER_LIMITS.maxOpenMs} ms.`);
    }

    if (!num(w.revealAt) || w.revealAt < 0) {
        p.push(`revealAt must be a finite number, 0 or more, not ${shown(w.revealAt)}.`);
    } else if (finite && w.revealAt > length) {
        p.push(`revealAt (${w.revealAt}) must not be later than the end of the opening (${length}).`);
    }

    // Loops: while closed (idle) and once open (afterglow).
    for (const name of ['idle', 'afterglow'] as const) {
        const list: unknown = w[name];
        if (list !== undefined) {
            if (!Array.isArray(list)) {
                p.push(`${name} must be a list.`);
            } else {
                if (list.length > WRAPPER_LIMITS.maxSteps) p.push(`A wrapper may have at most ${WRAPPER_LIMITS.maxSteps} ${name} loops.`);
                const n = Math.min(list.length, SCAN);
                for (let i = 0; i < n; i += 1) {
                    const where = `${name} ${i}`;
                    const s: unknown = list[i];
                    if (!isPlain(s)) {
                        p.push(`${where} must be an object.`);
                        continue;
                    }
                    const f = props(s, ['layer', 'field', 'amp', 'period', 'phase'], where, p);
                    if (typeof f.layer !== 'string' || !layerIds.has(f.layer)) p.push(`${where} names a layer that does not exist: ${shown(f.layer)}.`);
                    if (typeof f.field !== 'string' || !IDLE_FIELDS.includes(f.field)) p.push(`${where} field must be one of ${IDLE_FIELDS.join(', ')}, not ${shown(f.field)}.`);
                    if (f.field === 'opacity') numberIn(f.amp, -0.5, 0.5, `${where} amp (for opacity)`, p);
                    else numberIn(f.amp, -2000, 2000, `${where} amp`, p);
                    numberIn(f.period, WRAPPER_LIMITS.minIdlePeriodMs, 600000, `${where} period`, p);
                    if (f.phase !== undefined) numberIn(f.phase, 0, 1, `${where} phase`, p);
                }
            }
        }

    }
}

/** Every problem with a wrapper's data, as plain sentences. Empty = valid. Never throws, whatever it is given. */
export function wrapperProblems(def: unknown): string[] {
    const p: string[] = [];
    try {
        problemsOf(def, p);
    } catch {
        p.push('The wrapper could not be read safely (a hostile or broken object).');
    }
    return p;
}
