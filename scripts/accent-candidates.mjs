#!/usr/bin/env node
/**
 * Candidate SHARED accents for the capsule: one set of accent colours every
 * wrapper can wear, for the owner to cut down by eye. Nothing here ships: the
 * kept ones are written into the app as hex literals by hand.
 *
 *   node scripts/accent-candidates.mjs
 *
 * A shared accent changes only `accent` and `onAccent` of a wrapper's theme.
 * It has two shades: `light` for wrappers whose capsule is light and `dark`
 * for those whose capsule is dark — the app's own rule, `tone` in
 * `src/ui/theme.ts`: light when the surface's luminance is above 0.35.
 *
 * The rule each shade is fitted to: on EVERY wrapper of its tone the accent
 * passes `wrapperProblems` with a margin (accent on surface >= 3.3, label on
 * accent >= 4.8; the validator asks 3 and 4.5), and the label also holds 4.5
 * where a material repaints the button: the dark foot of the lacquer's gold
 * gradient and the wire's mix. A hue is moved in lightness alone to get there.
 *
 * As `looks-candidates.mjs`, it writes a throwaway vitest file under
 * `.shots/looks/` and runs it; the result is `.shots/looks/accents.json`.
 * `.shots/looks/accent-drops.json` (`{ key: reason }`), if present, is merged
 * in as `drop: true` + `reason`: the art director's suggested cuts.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, dE, hexOf, lum, oklch } from './looks-candidates.mjs';

const WANT = { accentOnSurface: 3.3, onAccent: 4.8, painted: 4.5 };
const mixHex = (a, b, p) => '#' + [1, 3, 5].map(i => Math.round(parseInt(b.slice(i, i + 2), 16) + (parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) * p).toString(16).padStart(2, '0')).join('').toUpperCase();
/** What the label really sits on, at its worst, when a material repaints the primary button (capsule.css). */
const paintedFoot = (accent, material) => (material === 'lacquer' ? mixHex(accent, '#7A4300', 0.76) : material === 'wire' ? mixHex(accent, '#00303A', 0.84) : accent);

/** The frame's own signal colours (src/stage/colour.ts): an accent must not pass for one of them. */
const SIGNALS = { danger: ['#FF7A6B', '#FFB4A8', '#B3261E', '#7A0C06'], warn: ['#F2C162', '#FFE3A6', '#8A5A00', '#5C3B00'], ok: ['#5AD6A0', '#B6F2D6', '#0F7A4D', '#064B2E'] };

/**
 * The candidates, in the order of the swatches: neutrals, then once round the wheel from blue.
 * [name, hue, chroma and starting lightness of the light-capsule shade, the same for the dark-capsule shade].
 * `fixed` pins a shade to a hex (it is still checked like the rest).
 */
const SET = [
    ['ink', 0, 0, 0, 0, 0, { light: '#17181C', dark: '#F3F1EC' }],
    ['stone', 85, 0.02, 0.46, 0.025, 0.84],
    ['slate', 245, 0.045, 0.46, 0.04, 0.82],
    ['navy', 268, 0.12, 0.37, 0.09, 0.78],
    ['ecash blue', 250, 0.13, 0.5, 0.115, 0.76, { light: '#0074C2' }],
    ['lagoon', 225, 0.09, 0.47, 0.09, 0.8],
    ['teal', 195, 0.08, 0.46, 0.09, 0.8],
    ['pine', 160, 0.09, 0.45, 0.1, 0.8],
    ['sage', 135, 0.06, 0.47, 0.06, 0.82],
    ['olive', 108, 0.09, 0.5, 0.09, 0.82],
    ['gold', 85, 0.11, 0.52, 0.11, 0.84],
    ['orange', 58, 0.14, 0.52, 0.12, 0.8],
    ['terracotta', 42, 0.12, 0.5, 0.1, 0.78],
    ['cocoa', 50, 0.05, 0.4, 0.05, 0.8],
    ['vermilion', 30, 0.17, 0.5, 0.14, 0.76],
    ['wine', 12, 0.13, 0.4, 0.1, 0.78],
    ['rose', 0, 0.12, 0.5, 0.1, 0.8],
    ['berry', 340, 0.14, 0.45, 0.11, 0.78],
    ['plum', 320, 0.07, 0.42, 0.06, 0.8],
    ['violet', 295, 0.15, 0.45, 0.11, 0.78],
];

/** Called by the throwaway test, which brings the wrappers and the validator. */
export function build({ wrappers, wrapperProblems, root }) {
    const toneOf = w => (lum(w.theme.surface) > 0.35 ? 'light' : 'dark');
    const by = { light: wrappers.filter(w => toneOf(w) === 'light'), dark: wrappers.filter(w => toneOf(w) === 'dark') };
    /** The worst case of a shade over every wrapper of its tone. */
    const measure = (tone, accent, onAccent) => {
        let worst = { margin: Infinity };
        const failing = [];
        for (const w of by[tone]) {
            const onSurface = contrast(accent, w.theme.surface);
            const label = contrast(onAccent, accent);
            const painted = contrast(onAccent, paintedFoot(accent, w.theme.material));
            const margin = Math.min(onSurface - 3, label - 4.5, painted - 4.5);
            if (margin < worst.margin) worst = { margin, id: w.id, onSurface, label, painted };
            if (wrapperProblems({ ...w, theme: { ...w.theme, accent, onAccent } }).length > 0 || painted < 4.5) failing.push(w.id);
        }
        const good = by[tone].every(w => contrast(accent, w.theme.surface) >= WANT.accentOnSurface && contrast(onAccent, paintedFoot(accent, w.theme.material)) >= WANT.painted) && contrast(onAccent, accent) >= WANT.onAccent;
        return { worst, failing, good };
    };
    const fit = (tone, h, C, L0, pinned) => {
        const label = L => (tone === 'light' ? '#FFFFFF' : C < 0.01 ? '#15161A' : hexOf(0.19, 0.03, h));
        if (pinned) return { accent: pinned, onAccent: label(), ...measure(tone, pinned, label()) };
        for (let i = 0; i < 40; i += 1) {
            const L = tone === 'light' ? L0 - i * 0.01 : L0 + i * 0.005;
            if (L < 0.2 || L > 0.95) break;
            const accent = hexOf(L, C, h);
            const m = measure(tone, accent, label(L));
            if (m.good && m.failing.length === 0) return { accent, onAccent: label(L), ...m };
        }
        const accent = hexOf(L0, C, h);
        return { accent, onAccent: label(L0), ...measure(tone, accent, label(L0)) };
    };
    const dropsFile = join(root, '.shots/looks/accent-drops.json');
    const drops = existsSync(dropsFile) ? JSON.parse(readFileSync(dropsFile, 'utf8')) : {};
    const out = [];
    const report = [`light capsules: ${by.light.map(w => w.id).join(' ')}`, `dark capsules:  ${by.dark.map(w => w.id).join(' ')}`];
    SET.forEach(([name, h, cl, ll, cd, ld, fixed], i) => {
        const key = 'abcdefghijklmnopqrst'[i];
        const light = fit('light', h, cl, ll, fixed?.light);
        const dark = fit('dark', h, cd, ld, fixed?.dark);
        const notes = [];
        for (const [tone, s] of [['light', light], ['dark', dark]]) {
            notes.push(`${tone}: tightest on ${s.worst.id} (accent/surface ${s.worst.onSurface.toFixed(2)}, label ${s.worst.label.toFixed(2)}, label on the painted button ${s.worst.painted.toFixed(2)})`);
            if (s.failing.length) notes.push(`${tone} FAILS on ${s.failing.join(', ')}`);
            for (const [kind, list] of Object.entries(SIGNALS)) {
                const near = Math.min(...list.map(c => dE(c, s.accent)));
                if (near < 9 && oklch(s.accent).C > 0.03) notes.push(`${tone} shade is ${near.toFixed(0)} from a "${kind}" colour`);
            }
        }
        const minMargin = Math.round(Math.min(light.worst.margin, dark.worst.margin) * 100) / 100;
        out.push({
            key,
            name,
            light: { accent: light.accent, onAccent: light.onAccent },
            dark: { accent: dark.accent, onAccent: dark.onAccent },
            minMargin,
            notes: notes.join('; '),
            ...(drops[key] ? { drop: true, reason: drops[key] } : {}),
        });
        report.push(`${key} ${name.padEnd(11)} ${light.accent}/${light.onAccent}  ${dark.accent}/${dark.onAccent}  margin ${minMargin.toFixed(2)}  ${light.failing.length + dark.failing.length ? 'FAILS ' + [...light.failing, ...dark.failing].join(',') : 'all 24'}`);
    });
    return { accents: out, report };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const dir = join(root, '.shots/looks');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
        join(dir, 'accents.test.ts'),
        `// Throwaway: written by scripts/accent-candidates.mjs. Not part of the repo.
import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { WRAPPERS } from '../../src/wrappers';
import { THEME_CONTRAST, contrast, wrapperProblems } from '../../src/stage';
import { READABLE_FLOOR, themeTokens } from '../../src/ui/theme';
// @ts-expect-error plain node module
import { build } from '../../scripts/accent-candidates.mjs';

it('writes the shared accents', () => {
    const root = ${JSON.stringify(root)};
    const { accents, report } = build({ wrappers: WRAPPERS, wrapperProblems, root });
    // Every accent, in the shade the wrapper would get, on every wrapper: the validator, and the floors the tokens imply.
    let checked = 0;
    for (const a of accents) for (const w of WRAPPERS) {
        const shade = a[themeTokens(w).tone];
        const worn = { ...w, theme: { ...w.theme!, accent: shade.accent, onAccent: shade.onAccent } };
        expect(wrapperProblems(worn), a.name + ' on ' + w.id).toEqual([]);
        const tk = themeTokens(worn);
        expect(contrast(tk.accent, tk.surface), a.name + ' on ' + w.id).toBeGreaterThanOrEqual(THEME_CONTRAST.accentOnSurface);
        expect(contrast(tk.onAccent, tk.accent), a.name + ' on ' + w.id).toBeGreaterThanOrEqual(THEME_CONTRAST.onAccent);
        expect(contrast(tk.ink, tk.surface)).toBeGreaterThanOrEqual(THEME_CONTRAST.inkOnSurface);
        for (const c of [tk.danger, tk.warn, tk.ok]) expect(contrast(c, tk.surface)).toBeGreaterThanOrEqual(READABLE_FLOOR);
        checked += 1;
    }
    writeFileSync(root + '/.shots/looks/accents.json', JSON.stringify(accents, null, 2) + '\\n');
    console.log(report.join('\\n') + '\\nchecked ' + checked + ' accent x wrapper pairs');
});
`,
    );
    const config = join(dir, 'vitest.config.mjs');
    writeFileSync(config, `import { defineConfig } from 'vitest/config';\nexport default defineConfig({ root: ${JSON.stringify(root)}, test: { environment: 'node', include: ['*.test.ts'], dir: ${JSON.stringify(dir)} } });\n`);
    const r = spawnSync(join(root, 'node_modules/.bin/vitest'), ['run', '--config', config, '--root', root, 'accents.test.ts'], { cwd: root, stdio: 'inherit' });
    process.exit(r.status ?? 1);
}
