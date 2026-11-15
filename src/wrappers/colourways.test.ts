import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { wrapperProblems } from '../stage';
import type { Face } from '../stage';
import { decodeFragment, encodeLink } from '../core';
import { formatRecipe } from '../core/recipe';
import { WRAPPERS, wrapperById } from './index';
import { ACCENTS, COLOURWAYS, accentFor, colourwaysOf, dressed } from './looks';
// @ts-expect-error plain JS module without types
import { WRAPPERS as RULES, turn } from '../../scripts/colourways.mjs';

const FACES: readonly Face[] = ['grotesk', 'tech', 'mono', 'serif', 'poster', 'slab'];
const HEX = /#[0-9a-fA-F]{6}\b/g;
const dirOf = (id: string): string => `public/wrappers/${id}`;
/** As `scripts/colourways.mjs` recolours a picture. */
const recolour = (text: string, map: Readonly<Record<string, string>>): string =>
    text.replace(HEX, x => {
        const y = map[x.toUpperCase()];
        return y === undefined ? x : x === x.toLowerCase() ? y.toLowerCase() : y;
    });

describe('colourways of the art', () => {
    // A colourway's place in its wrapper's list has gone out in links (`a` + its letter), and its colours with it:
    // add at the end of a list; never reorder, remove or re-tune one.
    it('the lists as they went out on 15 November 2026', () => {
        expect(Object.fromEntries(Object.entries(COLOURWAYS).map(([id, w]) => [id, w.ways.map(c => `${c.id} ${c.chip}`)]))).toEqual({
            snowbox: ['pine #02442F', 'plum #4A2954'],
            cake: ['plum #51335E', 'forest #1F4C31'],
            fold: ['indigo #4E7ACD', 'moss #5C8B52'],
            wreath: ['spring #B0586A', 'frost #396999'],
        });
        for (const [id, w] of Object.entries(COLOURWAYS)) {
            expect(wrapperById(id), id).toBeDefined();
            expect(w.ways.length, id).toBeLessThanOrEqual(26);
        }
    });

    it('the maps are what the rules make of the colours the wrapper and its art use today (else: run scripts/colourways.mjs)', () => {
        const rules = RULES as Record<string, { own: string; ways: [string, number[][]][] }>;
        expect(Object.keys(rules)).toEqual(Object.keys(COLOURWAYS));
        for (const [id, w] of Object.entries(COLOURWAYS)) {
            const texts = [readFileSync(`src/wrappers/${id}.ts`, 'utf8'), ...readdirSync(dirOf(id)).filter(f => f.endsWith('.svg') && !f.startsWith('cw-')).map(f => readFileSync(`${dirOf(id)}/${f}`, 'utf8'))];
            const colours = [...new Set(texts.flatMap(x => x.match(HEX) ?? []).map(x => x.toUpperCase()))].sort();
            expect(w.own).toBe(rules[id]!.own);
            expect(w.ways.map(c => c.id)).toEqual(rules[id]!.ways.map(r => r[0]));
            w.ways.forEach((c, i) => {
                const want = Object.fromEntries(colours.map(x => [x, (turn as (h: string, r: number[][]) => string)(x, rules[id]!.ways[i]![1])]).filter(([a, b]) => a !== b));
                expect(c.map, `${id}/${c.id}`).toEqual(want);
                expect(c.chip).toBe(c.map[w.own]);
            });
        }
    });

    it('every recoloured picture on disk is the original with the map applied, and no other picture would change', () => {
        for (const [id, w] of Object.entries(COLOURWAYS)) {
            const originals = readdirSync(dirOf(id)).filter(f => f.endsWith('.svg') && !f.startsWith('cw-'));
            const twins = readdirSync(dirOf(id)).filter(f => f.startsWith('cw-'));
            expect(twins.sort(), id).toEqual(w.ways.flatMap(c => c.files.map(f => `cw-${c.id}-${f}`)).sort());
            for (const c of w.ways) {
                for (const f of originals) {
                    const want = recolour(readFileSync(`${dirOf(id)}/${f}`, 'utf8'), c.map);
                    const changes = want !== readFileSync(`${dirOf(id)}/${f}`, 'utf8');
                    expect(changes, `${id}/${c.id}/${f}`).toBe(c.files.includes(f));
                    if (changes) expect(readFileSync(`${dirOf(id)}/cw-${c.id}-${f}`, 'utf8'), `${id}/${c.id}/${f}`).toBe(want);
                }
            }
        }
    });

    it('a wrapper in a colourway is a valid wrapper in every accent and face, drawn from pictures that exist', () => {
        for (const [id, w] of Object.entries(COLOURWAYS)) {
            const plain = wrapperById(id)!;
            w.ways.forEach((c, art) => {
                const d = dressed(plain, formatRecipe({ art }));
                expect(wrapperProblems(d), `${id}/${c.id}`).toEqual([]);
                expect(d.id).toBe(id);
                // The sound is the wrapper's own object: a colourway never cuts a tune.
                expect(d.sound).toBe(plain.sound);
                expect(d.open.length).toBe(plain.open.length);
                d.layers.forEach((layer, i) => {
                    const was = plain.layers[i]!.art;
                    expect(layer.art, `${id}/${c.id}/${was}`).toBe(c.files.includes(was) ? `cw-${c.id}-${was}` : was);
                    expect(existsSync(`${dirOf(id)}/${layer.art}`), `${id}/${layer.art}`).toBe(true);
                });
                // Every colour of the definition the map names is replaced, the theme's among them.
                expect(JSON.stringify(d).toUpperCase().match(HEX)?.filter(x => c.map[x] !== undefined && !Object.values(c.map).includes(x)) ?? [], `${id}/${c.id}`).toEqual([]);
                for (let accent = 0; accent < ACCENTS.length; accent++) {
                    for (const face of FACES) {
                        const both = dressed(plain, formatRecipe({ accent, face, art }));
                        expect(wrapperProblems(both), `${id}/${c.id} accent ${accent} ${face}`).toEqual([]);
                        expect(both.theme!.accent).toBe(accentFor(d.theme!, accent)!.accent);
                        expect(both.layers).toEqual(d.layers);
                    }
                }
            });
        }
    });

    it('the same wrapper in the same colourway is the same object; a colourway it does not have leaves it as it is', () => {
        const w = wrapperById('snowbox')!;
        expect(dressed(w, '1aa')).toBe(dressed(w, '1aa'));
        expect(dressed(w, '1aa')).not.toBe(dressed(w, '1ab'));
        expect(dressed(w, '1aa')).not.toBe(w);
        // A place the list has not filled: the whole look is set aside, not half of it.
        expect(dressed(w, '1cdftaz')).toBe(w);
        for (const plain of WRAPPERS.filter(x => colourwaysOf(x.id).length === 0)) expect(dressed(plain, '1cdaa'), plain.id).toBe(plain);
        // Names a wrapper might share with an object's own properties are not colourway lists.
        expect(colourwaysOf('constructor')).toEqual([]);
        expect(colourwaysOf('__proto__')).toEqual([]);
    });

    it('rides in the link after the other parts', () => {
        const url = encodeLink({ version: 1, secret: new Uint8Array(16), wrapper: 'snowbox', recipe: formatRecipe({ accent: 3, face: 'serif', quiet: true, art: 1 })! }, 'https://egift.cash');
        expect(url).toBe('https://egift.cash/snowbox/#1.2.AAAAAAAAAAAAAAAAAAAAAA.snowbox.1cdfssqab');
        const link = decodeFragment(new URL(url).hash)!;
        const d = dressed(wrapperById('snowbox')!, link.recipe);
        expect(d.backdrop).toBe('#2A1630');
        expect(d.theme!.face).toBe('serif');
        expect(d.layers.find(l => l.id === 'sky')!.art).toBe('cw-plum-sky.svg');
    });
});
