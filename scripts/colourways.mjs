#!/usr/bin/env node
/**
 * Art colourways: a wrapper's own pictures in other colours, made at build
 * time so a phone never recolours anything.
 *
 *   node scripts/colourways.mjs
 *
 * Only a wrapper whose art keeps to a small palette and uses no filter can
 * have colourways. A colourway is a fixed map from the wrapper's colours to
 * new ones: families of colours (by hue) are turned to another hue, lightness
 * kept, so the drawing keeps its lights and darks. The map is applied to the
 * wrapper's pictures and, on the page, to the colours in its definition.
 *
 * Writes, for each colourway:
 *   public/wrappers/<id>/cw-<colourway>-<file>.svg   only the pictures that change
 *   src/wrappers/colourways.gen.ts                   the maps and the lists of changed files
 *
 * Forever: a colourway's place in its wrapper's list has gone out in links
 * (`a` + its letter). Add at the end; never reorder, remove or re-tune one.
 *
 * A wrapper's own generator (scripts/art/<id>.gen.mjs) clears its folder
 * before it draws: run this script again after it.
 */
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hexOf, oklch } from './looks-candidates.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A rule turns one family of colours: [hue from, hue to, least chroma, new hue, chroma x, lightness +].
 * `own` is the colour of the original that stands for it on the chip a giver presses; a colourway's chip is what `own` becomes.
 */
export const WRAPPERS = {
    snowbox: {
        own: '#1A3A5C',
        ways: [
            ['pine', [[240, 262, 0.03, 165, 1.0, 0]]],
            ['plum', [[240, 262, 0.03, 318, 1.15, 0]]],
        ],
    },
    cake: {
        own: '#1B4854',
        ways: [
            ['plum', [[210, 232, 0.015, 315, 1.5, 0]]],
            ['forest', [[210, 232, 0.015, 155, 1.3, 0]]],
        ],
    },
    fold: {
        own: '#C4572A',
        ways: [
            ['indigo', [[36, 46, 0.1, 262, 0.9, 0]]],
            ['moss', [[36, 46, 0.1, 140, 0.65, 0]]],
        ],
    },
    wreath: {
        own: '#9C4C2C',
        ways: [
            ['spring', [[38, 46, 0.1, 8, 1.0, 0.06], [105, 115, 0.05, 140, 1.1, 0.02]]],
            ['frost', [[38, 46, 0.1, 250, 0.8, 0], [105, 115, 0.05, 190, 0.8, 0]]],
        ],
    },
    vinyl: {
        own: '#D9432B',
        ways: [
            ['blue', [[28, 36, 0.1, 255, 0.9, 0], [78, 87, 0.1, 190, 0.9, 0]]],
            ['rose', [[28, 36, 0.1, 352, 0.95, 0], [78, 87, 0.1, 300, 0.8, 0]]],
        ],
    },
    bottle: {
        own: '#1E5C6E',
        ways: [
            ['violet', [[195, 247, 0.025, 292, 1.1, 0]]],
            ['green', [[195, 247, 0.025, 160, 1.0, 0]]],
        ],
    },
    seeds: {
        own: '#D0607A',
        ways: [
            ['sunflower', [[4, 11, 0.1, 62, 1.0, 0.04]]],
            ['lavender', [[4, 11, 0.1, 300, 0.9, 0]]],
        ],
    },
    crane: {
        own: '#D8432F',
        ways: [
            ['blue', [[29, 33, 0.1, 252, 0.85, 0]]],
            ['saffron', [[29, 33, 0.1, 66, 0.9, 0.05]]],
        ],
    },
    cradle: {
        own: '#6AA88A',
        ways: [
            ['lilac', [[150, 166, 0.02, 300, 1.0, 0]]],
            ['peach', [[150, 166, 0.02, 28, 1.1, 0]]],
        ],
    },
    orbit: {
        own: '#3D4F8F',
        ways: [
            ['violet', [[255, 272, 0.05, 305, 1.0, 0]]],
            ['teal', [[255, 272, 0.05, 200, 0.9, 0]]],
        ],
    },
};

const HEX = /#[0-9a-fA-F]{6}\b/g;
export const turn = (hex, rules) => {
    const o = oklch(hex);
    for (const [from, to, least, hue, cx, lplus] of rules) if (o.h >= from && o.h <= to && o.C >= least) return hexOf(Math.min(1, o.L + lplus), o.C * cx, hue);
    return hex;
};
/** `text` with every colour the map names replaced, in the letter case it was written in. */
const recolour = (text, map) =>
    text.replace(HEX, x => {
        const y = map[x.toUpperCase()];
        return y === undefined ? x : x === x.toLowerCase() ? y.toLowerCase() : y;
    });

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

function main() {
const out = {};
for (const [id, { own, ways }] of Object.entries(WRAPPERS)) {
    const dir = join(ROOT, 'public', 'wrappers', id);
    for (const f of readdirSync(dir)) if (f.startsWith('cw-')) rmSync(join(dir, f));
    const files = readdirSync(dir).filter(f => f.endsWith('.svg')).sort();
    const art = Object.fromEntries(files.map(f => [f, readFileSync(join(dir, f), 'utf8')]));
    const def = readFileSync(join(ROOT, 'src', 'wrappers', `${id}.ts`), 'utf8');
    const colours = [...new Set([...Object.values(art), def].flatMap(t => t.match(HEX) ?? []).map(x => x.toUpperCase()))].sort();
    out[id] = { own, ways: [] };
    for (const [name, rules] of ways) {
        const map = Object.fromEntries(colours.map(c => [c, turn(c, rules)]).filter(([a, b]) => a !== b));
        if (map[own] === undefined) throw new Error(`${id}/${name}: the chip colour ${own} does not change`);
        const changed = files.filter(f => recolour(art[f], map) !== art[f]);
        for (const f of changed) writeFileSync(join(dir, `cw-${name}-${f}`), recolour(art[f], map));
        out[id].ways.push({ id: name, chip: map[own], files: changed, map });
        console.log(`${id}/${name}: ${changed.length} of ${files.length} pictures, ${Object.keys(map).length} colours`);
    }
}

const q = s => `'${s}'`;
const body = Object.entries(out)
    .map(
        ([id, w]) =>
            `    ${id}: {\n        own: ${q(w.own)},\n        ways: [\n` +
            w.ways
                .map(
                    c =>
                        `            {\n                id: ${q(c.id)},\n                chip: ${q(c.chip)},\n                files: [${c.files.map(q).join(', ')}],\n                map: { ${Object.entries(c.map)
                            .map(([a, b]) => `${q(a)}: ${q(b)}`)
                            .join(', ')} },\n            },\n`,
                )
                .join('') +
            `        ],\n    },\n`,
    )
    .join('');
writeFileSync(
    join(ROOT, 'src', 'wrappers', 'colourways.gen.ts'),
    `// Written by scripts/colourways.mjs. Do not edit: change the rules there and run it again.\n/* eslint-disable */\n\n/** One colourway of a wrapper's art: which pictures have a recoloured twin, and the colour map. */\nexport interface Colourway {\n    readonly id: string;\n    /** The colour that stands for it on the chip a giver presses. */\n    readonly chip: string;\n    /** The wrapper's pictures that change; the twin of \`x.svg\` is \`cw-<id>-x.svg\`. */\n    readonly files: readonly string[];\n    /** Upper-case hex to upper-case hex. */\n    readonly map: Readonly<Record<string, string>>;\n}\n\nexport const COLOURWAYS: Readonly<Record<string, { readonly own: string; readonly ways: readonly Colourway[] }>> = {\n${body}};\n`,
);
}
