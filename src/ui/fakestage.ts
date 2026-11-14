/** The fake the tests give `mountStage`: opening reveals at once. Imports nothing, so a vi.mock factory can load it. */
export function fakeMountStage(_host: HTMLElement, _def: unknown, opts: { onReveal?: () => void }) {
    let state: 'closed' | 'opening' | 'open' = 'closed';
    return {
        get state() {
            return state;
        },
        open: async () => {
            state = 'open';
            opts.onReveal?.();
        },
        skip: () => {
            state = 'open';
            opts.onReveal?.();
        },
        seek: (ms: number) => {
            if (ms > 0) {
                state = 'open';
                opts.onReveal?.();
            }
        },
        destroy: () => {},
    };
}

