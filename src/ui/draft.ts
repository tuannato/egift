import { DEFAULT_WRAPPER } from '../core/limits';
import { WRAPPERS } from '../wrappers';

/** What the person has typed on the create step, kept so a language switch does not empty the form. Never the secret. */
export const draft = { amount: '', wish: '', wrapper: '', riddleOn: false, question: '', answer: '', tokenOnly: false, coverFee: false, withToken: false };

/** The wrapper the shop handed over (or the last one picked on the create step). */
export function chooseWrapper(id: string): void {
    if (WRAPPERS.some(w => w.id === id)) draft.wrapper = id;
}
export function chosenWrapper(): string {
    return draft.wrapper && WRAPPERS.some(w => w.id === draft.wrapper) ? draft.wrapper : (WRAPPERS.some(w => w.id === DEFAULT_WRAPPER) ? DEFAULT_WRAPPER : (WRAPPERS[0]?.id ?? DEFAULT_WRAPPER));
}
