import { DEFAULT_WRAPPER } from '../core/limits';
import { SHELF as WRAPPERS } from '../wrappers/shelf';
import { coversFee } from './prefs';

/**
 * What the person has typed on the create step, kept so a language switch does not empty the form. Never the secret.
 * `coverFee` starts as the giver last left it (`prefs.ts`): on, unless they switched it off.
 * `recipe` is how they dressed the chosen wrapper (`core/recipe.ts`), in its one spelling; empty for the wrapper as it is.
 * `people` are the rows of "several people" (a name, an amount, an answer of their own), `peopleOpen` whether that
 * table stands in for the one amount, `oneLink` whether all of them share one link.
 */
export const draft = {
    amount: '',
    wish: '',
    wrapper: '',
    riddleOn: false,
    riddleHide: false,
    question: '',
    answer: '',
    tokenOnly: false,
    coverFee: coversFee(),
    withToken: false,
    recipe: '',
    people: [] as { name: string; amount: string; answer: string }[],
    peopleOpen: false,
    oneLink: false,
};

/** The wrapper the shop handed over (or the last one picked on the create step). */
export function chooseWrapper(id: string): void {
    if (!WRAPPERS.some(w => w.id === id)) return;
    // A look was chosen on a wrapper, seen on it: another wrapper starts as its maker left it.
    if (draft.wrapper !== id) draft.recipe = '';
    draft.wrapper = id;
}
export function chosenWrapper(): string {
    return draft.wrapper && WRAPPERS.some(w => w.id === draft.wrapper) ? draft.wrapper : (WRAPPERS.some(w => w.id === DEFAULT_WRAPPER) ? DEFAULT_WRAPPER : (WRAPPERS[0]?.id ?? DEFAULT_WRAPPER));
}
