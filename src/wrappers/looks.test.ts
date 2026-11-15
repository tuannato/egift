import { describe, expect, it } from 'vitest';
import { wrapperProblems } from '../stage';
import type { Face } from '../stage';
import { formatRecipe } from '../core/recipe';
import { themeTokens } from '../ui/theme';
import { WRAPPERS, wrapperById } from './index';
import { ACCENTS, accentFor, dressed, toneOf } from './looks';

const FACES: readonly Face[] = ['grotesk', 'tech', 'mono'];

describe('dressing a wrapper', () => {
    it('every wrapper stays valid in every shared accent (in the shade its tone selects) and every face', () => {
        expect(ACCENTS.length).toBe(14);
        for (const w of WRAPPERS) {
            // The tone a shade is chosen by is the tone the frame dresses by.
            expect(toneOf(w.theme!), w.id).toBe(themeTokens(w).tone);
            for (let accent = 0; accent < ACCENTS.length; accent++) {
                for (const face of FACES) {
                    const d = dressed(w, formatRecipe({ accent, face }));
                    expect(wrapperProblems(d), `${w.id} accent ${accent} ${face}`).toEqual([]);
                    expect(d.id).toBe(w.id);
                    expect(d.theme!.accent).toBe(accentFor(w.theme!, accent)!.accent);
                    expect(d.theme!.onAccent).toBe(accentFor(w.theme!, accent)!.onAccent);
                    expect(d.theme!.face).toBe(face);
                    // Only those three things: the rest of the theme and all of the art are the wrapper's own.
                    expect({ ...d.theme, accent: '', onAccent: '', face: '' }).toEqual({ ...w.theme, accent: '', onAccent: '', face: '' });
                    expect(d.layers).toBe(w.layers);
                    expect(d.open).toBe(w.open);
                    expect(d.sound).toBe(w.sound);
                }
            }
        }
    });

    it('a light capsule gets the light shade and a dark one the dark shade', () => {
        const light = WRAPPERS.find(w => toneOf(w.theme!) === 'light')!;
        const dark = WRAPPERS.find(w => toneOf(w.theme!) === 'dark')!;
        expect(dressed(light, '1cd').theme!.accent).toBe(ACCENTS[3]![0]);
        expect(dressed(light, '1cd').theme!.onAccent).toBe(ACCENTS[3]![1]);
        expect(dressed(dark, '1cd').theme!.accent).toBe(ACCENTS[3]![2]);
        expect(dressed(dark, '1cd').theme!.onAccent).toBe(ACCENTS[3]![3]);
    });

    it('the same wrapper and the same look are the same object, so a repaint does not cut the tune', () => {
        const w = wrapperById('snowbox')!;
        expect(dressed(w, '1cdft')).toBe(dressed(w, '1cdft'));
        expect(dressed(w, '1cdft')).not.toBe(dressed(w, '1ceft'));
        expect(dressed(w, '1cdft')).not.toBe(w);
        // A look that keeps the tune keeps the wrapper's own sound object.
        expect(dressed(w, '1cdft').sound).toBe(w.sound);
        // The wrapper's own face is not a change: the two spellings are one look.
        const own = w.theme!.face;
        expect(dressed(w, formatRecipe({ face: own }))).toBe(w);
        expect(dressed(w, formatRecipe({ accent: 2, face: own }))).toBe(dressed(w, '1cc'));
    });

    it('quiet takes the tune and keeps the instrument and the home note', () => {
        const tuned = WRAPPERS.filter(w => w.sound?.score);
        expect(tuned.length).toBeGreaterThan(0);
        for (const w of tuned) {
            const q = dressed(w, '1sq');
            expect(q).not.toBe(w);
            expect(q.sound).toEqual({ v: 1, inst: w.sound!.inst, tonic: w.sound!.tonic });
            expect('score' in q.sound!).toBe(false);
            expect(q.theme).toBe(w.theme);
            expect(wrapperProblems(q), w.id).toEqual([]);
            // One tuneless sound per wrapper, whatever else the look changes.
            expect(dressed(w, '1casq').sound).toBe(q.sound);
            expect(dressed(w, '1sq')).toBe(q);
        }
        // A wrapper with no tune has nothing to take.
        for (const w of WRAPPERS.filter(x => !x.sound?.score)) expect(dressed(w, '1sq')).toBe(w);
    });

    it('what is not a recipe, or names an accent the list does not have, leaves the wrapper as its maker left it', () => {
        const w = wrapperById('snowbox')!;
        for (const bad of [undefined, null, '', '1', '2cd', '1cD', '1fx', '1sqcd', 'cd', '1cd ', '<b>', '1c' + 'a'.repeat(40)]) expect(dressed(w, bad as string), String(bad)).toBe(w);
        // `o` is the 15th place: no accent yet. `9` is the last place a link can name.
        expect(dressed(w, '1co')).toBe(w);
        expect(dressed(w, '1c9')).toBe(w);
        expect(accentFor(w.theme!, -1)).toBeUndefined();
        expect(accentFor(w.theme!, 14)).toBeUndefined();
    });
    it('an accent the list does not hold sets the whole look aside, face and quiet included', () => {
        const def = wrapperById('snowbox')!;
        expect(dressed(def, '1c9')).toBe(def);
        expect(dressed(def, '1c9fm')).toBe(def);
        expect(dressed(def, '1c9fmsq')).toBe(def);
    });
});
