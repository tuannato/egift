import type { Chain, DemoChain } from '../core';

/** Dev-only extras, present only when the page was opened with `?demo` in a development build. */
export interface DemoCtx {
    readonly chain: DemoChain;
    readonly params: URLSearchParams;
    /** Where the demo's address asks to start (`src/ui/demo.ts`), worked out before the app starts. */
    readonly first?: 'created' | 'create' | null;
}

export interface Ctx {
    readonly chain: Chain;
    readonly demo?: DemoCtx;
    readonly nav: {
        /** Go to the shop: the shelf of wrappers (clears any fragment from the address bar). */
        toHome(): void;
        /** Go to the create screen (clears any fragment from the address bar). */
        toCreate(): void;
        /** Show the created screen for the package this session made. */
        toCreated(): void;
    };
}
