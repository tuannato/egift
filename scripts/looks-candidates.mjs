#!/usr/bin/env node
/**
 * Candidate colourways for the capsule ("workshop tier 1"): six per wrapper,
 * for the owner to pick two from by eye. Nothing here ships: the picks are
 * written into the wrappers as hex literals by hand.
 *
 *   node scripts/looks-candidates.mjs
 *
 * A candidate keeps the wrapper's ground, material, corner, face and voice and
 * changes only surface, ink, accent and onAccent. The colours come from the
 * wrapper's own world, never from a colour wheel:
 *   a  accent  — an `ambient` colour or a much-used saturated colour of the art,
 *                moved in lightness alone until the contrast floors hold;
 *   b  flip    — light card with dark ink <-> dark card with light ink, tinted
 *                with the ground's hue (glass and wire only);
 *   c  neutral — a grey matched to the ground, accent = ink;
 *   d  tint    — the card itself tinted with one of those colours.
 * Every candidate passes `wrapperProblems` when put into the wrapper's theme,
 * and differs visibly from the original and from the other candidates.
 *
 * The validator and the wrappers are TypeScript, so this script writes a
 * throwaway vitest file under `.shots/looks/` (not in the repo) and runs it;
 * the test calls `build()` below and writes `.shots/looks/candidates.json`.
 * `.shots/looks/picks.json`, if present, is merged in: the art director's
 * suggested two per wrapper (`pick`, `reason`) and warnings (`flag`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------- colour maths (sRGB hex <-> OKLCH, WCAG contrast) ----------
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function oklab(hex) {
    const [r, g, b] = rgb(hex).map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function oklch(hex) {
    const [L, a, b] = oklab(hex);
    return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}
function linearFromOklch(L, C, h) {
    const a = C * Math.cos((h * Math.PI) / 180);
    const b = C * Math.sin((h * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
/** The hex of an OKLCH colour; chroma is given up, never hue or lightness, when sRGB cannot show it. */
export function hexOf(L, C, h) {
    let lo = 0;
    let hi = C;
    const fits = c => linearFromOklch(L, c, h).every(v => v >= -0.0005 && v <= 1.0005);
    if (!fits(C)) {
        for (let i = 0; i < 24; i += 1) {
            const mid = (lo + hi) / 2;
            if (fits(mid)) lo = mid;
            else hi = mid;
        }
        C = lo;
    }
    return (
        '#' +
        linearFromOklch(L, C, h)
            .map(v => Math.round(Math.min(1, Math.max(0, gam(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()
    );
}
/** As `src/stage/colour.ts`. */
const chan = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const lum = hex => {
    const [r, g, b] = rgb(hex).map(chan);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
/** Colour distance: 100 x the OKLab distance. About 2 is just visible side by side; gold against rose is about 18. */
export const dE = (x, y) => {
    const [a, b] = [oklab(x), oklab(y)];
    return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
/** How far two colourways are apart as a card: the surface is most of it, the button next, the text least. */
export const lookGap = (x, y) => dE(x.surface, y.surface) + 0.7 * dE(x.accent, y.accent) + 0.2 * dE(x.ink, y.ink);

/** What counts as "visibly different": between any two cards of one wrapper, the original included. */
const MIN_GAP = 6.5;
/** Margins kept above the validator's floors (3, 4.5, 7), so a pick is not one rounding away from failing. */
const FLOOR = { accentOnSurface: 3.25, onAccent: 4.7, ink: 7.6 };

// ---------- the wrapper's own colours ----------
/** The most used saturated colours of a wrapper's art, by how often they are painted with. */
export function artColours(dir, keep = 6) {
    const count = new Map();
    if (!existsSync(dir)) return [];
    for (const f of readdirSync(dir).filter(n => n.endsWith('.svg'))) {
        const svg = readFileSync(join(dir, f), 'utf8');
        for (const m of svg.matchAll(/(?:fill|stroke|stop-color)\s*[=:]\s*"?(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})(?![0-9a-fA-F])/g)) {
            let h = m[1].toUpperCase();
            if (h.length === 4) h = '#' + [...h.slice(1)].map(c => c + c).join('');
            count.set(h, (count.get(h) ?? 0) + 1);
        }
    }
    const groups = [];
    for (const [hex, n] of [...count].sort((a, b) => b[1] - a[1])) {
        const { C, L } = oklch(hex);
        if (C < 0.055 || L < 0.2) continue;
        const near = groups.find(g => dE(g.hex, hex) < 7);
        if (near) near.n += n;
        else groups.push({ hex, n });
    }
    return groups.sort((a, b) => b.n - a.n).slice(0, keep);
}

/** A source colour moved in lightness alone until it works as the accent of `surface`. */
function fitAccent(source, surface, darkLabel, chromaCap) {
    const s = oklch(source);
    const C = Math.min(s.C, chromaCap);
    const light = lum(surface) > 0.35;
    const ok = (acc, label) => contrast(acc, surface) >= FLOOR.accentOnSurface && contrast(label, acc) >= FLOOR.onAccent;
    if (light && !darkLabel) {
        // A deep button with a light label.
        for (let L = Math.min(s.L, 0.62); L >= 0.26; L -= 0.01) {
            const acc = hexOf(L, C, s.h);
            if (ok(acc, '#FFFFFF')) return { accent: acc, onAccent: '#FFFFFF' };
        }
    } else if (light) {
        // A bright button with a dark label (the plate's hazard tab): a narrow band of lightness.
        for (let L = 0.78; L >= 0.5; L -= 0.005) {
            const acc = hexOf(L, C, s.h);
            if (ok(acc, darkLabel)) return { accent: acc, onAccent: darkLabel };
        }
    } else {
        for (let L = Math.max(s.L, 0.7); L <= 0.93; L += 0.01) {
            const acc = hexOf(L, C, s.h);
            const label = hexOf(0.19, 0.035, s.h);
            if (ok(acc, label)) return { accent: acc, onAccent: label };
        }
    }
    return null;
}

/** How much of the surface a see-through material keeps over the dark room (`MATERIAL_OPACITY` in `src/stage/colour.ts`). */
const OPACITY = { glass: 0.54, wire: 0.46, lacquer: 1, plate: 1 };
const thinned = (surface, material) => '#' + rgb(surface).map(v => Math.round(v * 255 * OPACITY[material]).toString(16).padStart(2, '0')).join('');

/** Ink for a surface: a tint of `hue`, pushed until it clears the floors — on the thinned surface too. */
function inkFor(surface, hue, material) {
    const light = lum(surface) > 0.35;
    for (let i = 0; i < 14; i += 1) {
        const ink = light ? hexOf(0.21 - i * 0.012, 0.03, hue) : hexOf(0.95 + i * 0.004, 0.02, hue);
        if (contrast(ink, surface) >= FLOOR.ink && contrast(ink, thinned(surface, material)) >= 4.6) return ink;
    }
    return null;
}

/** A light card of a hue: as much tint as the material bears (a see-through card must stay very light). */
function lightCard(C, hue, inkHue, material) {
    for (let L = 0.935; L <= 0.985; L += 0.005) {
        const surface = hexOf(L, C, hue);
        const ink = inkFor(surface, inkHue, material);
        if (ink) return { surface, ink };
    }
    return null;
}

/**
 * All the candidates of one wrapper, in the order they are offered.
 * `problems(theme)` returns the validator's sentences for the wrapper wearing that theme.
 * `others` are the other wrappers' own themes, to keep a look from borrowing a neighbour's face.
 */
export function candidatesFor(w, { problems, art, others }) {
    const t = w.theme;
    const light = lum(t.surface) > 0.35;
    const so = oklch(t.surface);
    const go = oklch(t.ground);
    const groundHue = go.C > 0.012 ? go.h : so.h;
    const darkLabel = light && lum(t.onAccent) < 0.2 ? t.onAccent : null;
    const cap = light ? 0.185 : 0.17;

    // Sources: the light the wrapper throws, what it is painted with, and the room it stands in.
    const sources = [];
    const add = (hex, from, floor) => {
        if (oklch(hex).C < floor) return;
        if (sources.some(s => dE(s.hex, hex) < 6)) return;
        sources.push({ hex: hex.toUpperCase(), from });
    };
    for (const c of w.ambient ?? []) add(c, 'ambient', 0.02);
    for (const c of art) add(c.hex, 'art', 0.055);
    add(t.ground, 'ground', 0.025);

    const pool = [];
    const push = (kind, look, note) => {
        if (!look || !look.accent || !look.ink) return;
        pool.push({ kind, surface: look.surface.toUpperCase(), ink: look.ink.toUpperCase(), accent: look.accent.toUpperCase(), onAccent: look.onAccent.toUpperCase(), note });
    };
    const m = t.material;

    // a — the accent alone.
    for (const s of sources) {
        const f = fitAccent(s.hex, t.surface, darkLabel, cap);
        // A dull colour lifted to a light button is a grey pastel: on a dark card the accent must have colour.
        if (f && (light || oklch(f.accent).C >= 0.06)) push('a', { surface: t.surface, ink: t.ink, ...f }, `accent from ${s.from} ${s.hex}; card and ink as original`);
    }

    // b — the tone flipped (a lacquer is always dark, a plate always light).
    if (m === 'glass' || m === 'wire') {
        const card = light
            ? (() => {
                  const surface = hexOf(0.25, clamp(go.C, 0.025, 0.05), groundHue);
                  return { surface, ink: contrast(t.surface, surface) >= FLOOR.ink ? t.surface : inkFor(surface, so.h, m) };
              })()
            : lightCard(0.022, oklch(t.ink).C > 0.01 ? oklch(t.ink).h : groundHue, groundHue, m);
        if (card) {
            const own = fitAccent(t.accent, card.surface, null, cap);
            push('b', own && { ...card, ...own }, light ? 'tone flip: dark card in the ground hue, ink = the original card colour, original accent lifted' : 'tone flip: light card, dark ink in the ground hue, original accent deepened');
            for (const s of sources) {
                if (hueGap(oklch(s.hex).h, oklch(t.accent).h) < 30) continue;
                const alt = fitAccent(s.hex, card.surface, null, cap);
                push('b', alt && { ...card, ...alt }, `tone flip, accent from ${s.from} ${s.hex}`);
            }
        }
    }

    // c — the quiet neutral.
    {
        const card = light ? lightCard(0.007, groundHue, groundHue, m) : (() => {
            const surface = hexOf(clamp(so.L, 0.2, 0.3), 0.012, groundHue);
            return { surface, ink: inkFor(surface, groundHue, m) };
        })();
        if (card) push('c', { ...card, accent: card.ink, onAccent: card.surface }, `quiet neutral: ${light ? 'pale' : 'dark'} grey matched to the ground, accent = ink`);
    }

    // d — the card itself tinted.
    for (const s of sources) {
        const o = oklch(s.hex);
        if (light) {
            const card = lightCard(m === 'plate' ? 0.04 : 0.032, o.h, o.h, m);
            if (!card) continue;
            const f = fitAccent(s.hex, card.surface, darkLabel, cap);
            push('d', f && { ...card, ...f }, `one colour: card tinted with ${s.from} ${s.hex}, button the same colour deepened`);
            const keep = fitAccent(t.accent, card.surface, darkLabel, cap);
            if (hueGap(o.h, oklch(t.accent).h) > 40) push('d', keep && { ...card, ...keep }, `card tinted with ${s.from} ${s.hex}, original accent`);
        } else {
            // Twice: at the original depth, and lifted a step so the colour of the card can be seen.
            for (const lifted of [false, true]) {
                if (!lifted && hueGap(o.h, so.h) < 25 && so.C > 0.03) continue;
                const L = lifted ? clamp(so.L + 0.1, 0.3, 0.4) : clamp(so.L, m === 'lacquer' ? 0.26 : 0.2, m === 'lacquer' ? 0.42 : 0.3);
                const C = m === 'lacquer' ? clamp(o.C, 0.07, Math.max(0.09, so.C)) : clamp(o.C, 0.035, lifted ? 0.09 : 0.075);
                const surface = hexOf(L, C, o.h);
                const ink = inkFor(surface, oklch(t.ink).h, m);
                const how = `card in ${s.from} ${s.hex} (${lifted ? 'deep, a step lighter than the original card' : 'deepened'})`;
                const f = fitAccent(t.accent, surface, null, cap);
                push('d', f && { surface, ink, ...f }, `${how}, original accent`);
                const other = sources.find(x => x !== s && oklch(x.hex).C >= 0.06 && hueGap(oklch(x.hex).h, o.h) > 50 && hueGap(oklch(x.hex).h, oklch(t.accent).h) > 30);
                const g = other && fitAccent(other.hex, surface, null, cap);
                push('d', g && { surface, ink, ...g }, `${how}, accent from ${other?.from} ${other?.hex}`);
            }
        }
    }

    // e — the wrapper's own accent, a shade away: deeper on a light card, paler on a dark one.
    {
        const ao = oklch(t.accent);
        if (ao.C >= 0.04) {
            const shade = light ? hexOf(clamp(ao.L - 0.16, 0.26, 0.4), ao.C * 0.85, ao.h) : hexOf(0.92, Math.min(ao.C, 0.06), ao.h);
            const f = fitAccent(shade, t.surface, darkLabel, cap);
            push('e', f && { surface: t.surface, ink: t.ink, ...f }, light ? 'the original accent, a shade deeper; card and ink as original' : 'the original accent, paled; card and ink as original');
        }
    }

    // Keep what the validator accepts, with a margin on the ink.
    const valid = pool.filter(c => contrast(c.ink, c.surface) >= 7 && problems({ ...t, surface: c.surface, ink: c.ink, accent: c.accent, onAccent: c.onAccent }).length === 0);
    // A look that is nearly another wrapper's own goes to the back of the queue.
    for (const c of valid) {
        const twin = others.find(o => dE(c.surface, o.theme.surface) < 4 && dE(c.accent, o.theme.accent) < 5);
        if (twin) c.twin = twin.id;
    }

    // Choose six, one family at a time, never two that look alike.
    const picked = [];
    // Dark colours sit closer to the eye than their numbers say: with the same button, two dark cards must be well apart
    // (and a lacquer shows its surface only at the head, so further apart still).
    const apart = (x, y) => lookGap(x, y) >= MIN_GAP && (dE(x.accent, y.accent) >= 5 || dE(x.surface, y.surface) >= (lum(x.surface) < 0.35 && lum(y.surface) < 0.35 ? (m === 'lacquer' ? 14 : 9) : 6));
    const far = c => apart(c, t) && picked.every(p => apart(c, p));
    const order = ['a', 'b', 'd', 'c', 'a', 'd', 'b', 'e'];
    for (const pass of [false, true]) {
        for (let grew = true; grew && picked.length < 6; ) {
            grew = false;
            for (const kind of order) {
                if (picked.length >= 6) break;
                const c = valid.find(v => v.kind === kind && !picked.includes(v) && (pass || !v.twin) && far(v));
                if (c) {
                    picked.push(c);
                    grew = true;
                }
            }
        }
    }
    const rank = { a: 0, e: 1, d: 2, b: 3, c: 4 };
    picked.sort((x, y) => rank[x.kind] - rank[y.kind]);
    return {
        offered: pool.length,
        valid: valid.length,
        looks: picked.map((c, i) => ({ key: 'ABCDEF'[i], surface: c.surface, ink: c.ink, accent: c.accent, onAccent: c.onAccent, note: c.note + (c.twin ? ` — close to "${c.twin}"` : '') })),
    };
}

/** Called by the throwaway test, which brings the wrappers and the validator. */
export function build({ wrappers, wrapperProblems, root }) {
    const out = {};
    const report = [];
    const picksFile = join(root, '.shots/looks/picks.json');
    const picks = existsSync(picksFile) ? JSON.parse(readFileSync(picksFile, 'utf8')) : {};
    for (const w of wrappers) {
        const r = candidatesFor(w, {
            art: artColours(join(root, 'public/wrappers', w.id)),
            others: wrappers.filter(o => o.id !== w.id),
            problems: theme => wrapperProblems({ ...w, theme }),
        });
        const mine = picks[w.id] ?? {};
        out[w.id] = r.looks.map(l => ({
            ...l,
            ...(mine.pick?.[l.key] ? { pick: true, reason: mine.pick[l.key] } : {}),
            ...(mine.flag?.[l.key] ? { flag: mine.flag[l.key] } : {}),
        }));
        report.push(`${w.id.padEnd(10)} offered ${String(r.offered).padStart(2)}  valid ${String(r.valid).padStart(2)}  kept ${r.looks.length}`);
    }
    return { candidates: out, report };
}

// ---------- run ----------
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const dir = join(root, '.shots/looks');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
        join(dir, 'gen.test.ts'),
        `// Throwaway: written by scripts/looks-candidates.mjs. Not part of the repo.
import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { WRAPPERS } from '../../src/wrappers';
import { wrapperProblems } from '../../src/stage';
// @ts-expect-error plain node module
import { build } from '../../scripts/looks-candidates.mjs';

it('writes the candidate colourways', () => {
    const root = ${JSON.stringify(root)};
    const { candidates, report } = build({ wrappers: WRAPPERS, wrapperProblems, root });
    // Every candidate passes the validator inside its wrapper's theme: checked once more, on what is written.
    for (const w of WRAPPERS) for (const c of candidates[w.id]) {
        const { surface, ink, accent, onAccent } = c;
        expect(wrapperProblems({ ...w, theme: { ...w.theme!, surface, ink, accent, onAccent } }), w.id + ' ' + c.key).toEqual([]);
    }
    writeFileSync(root + '/.shots/looks/candidates.json', JSON.stringify(candidates, null, 2) + '\\n');
    console.log(report.join('\\n'));
});
`,
    );
    writeFileSync(join(dir, 'vitest.config.mjs'), `import { defineConfig } from 'vitest/config';\nexport default defineConfig({ root: ${JSON.stringify(root)}, test: { environment: 'node', include: ['*.test.ts'], dir: ${JSON.stringify(dir)} } });\n`);
    const r = spawnSync(join(root, 'node_modules/.bin/vitest'), ['run', '--config', join(dir, 'vitest.config.mjs'), '--root', root], { cwd: root, stdio: 'inherit' });
    process.exit(r.status ?? 1);
}
