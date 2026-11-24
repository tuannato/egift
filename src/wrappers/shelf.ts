import { SHELF, type ShelfDef } from './shelf.gen';
import type { WrapperDef } from '../stage/format';

export { SHELF, type ShelfDef };

/** A wrapper on the shelf by its id: what the shop shows before the wrapper's scene is fetched. */
export function shelfById(id: string): ShelfDef | undefined {
    return SHELF.find(w => w.id === id);
}

/**
 * Every wrapper's full definition (layers, opening, tune), fetched once, when a scene is first needed. A fetch
 * that failed is forgotten, so the next ask tries again.
 */
let full: Promise<typeof import('./index')> | undefined;
export function loadWrappers(): Promise<typeof import('./index')> {
    if (full === undefined) {
        full = import('./index');
        full.catch(() => {
            full = undefined;
        });
    }
    return full;
}

/** One wrapper's full definition, or undefined when there is no such wrapper or it could not be fetched. */
export function fullWrapper(id: string): Promise<WrapperDef | undefined> {
    return loadWrappers().then(
        m => m.wrapperById(id),
        () => undefined,
    );
}
