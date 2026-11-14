import './styles/fonts.css';
import './styles/frame.css';
import './styles/theatre.css';
import './styles/capsule.css';
import './styles/home.css';
import { ChainError } from './core/types';
import type { Chain } from './core/types';
import { initLang } from './i18n';
import { startApp } from './ui/app';
import type { DemoCtx } from './ui/ctx';
import { setTokenIconSource } from './ui/tokens';

const DEMO_ICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#c9a24a"/><circle cx="32" cy="32" r="18" fill="none" stroke="#3a2a08" stroke-width="6"/></svg>');

initLang();

/** The heavy piece (`src/heavy.ts`), fetched once. A fetch that failed is forgotten, so the next ask tries again. */
let heavy: Promise<typeof import('./heavy')> | undefined;
function loadHeavy(): Promise<typeof import('./heavy')> {
    if (heavy === undefined) {
        heavy = import('./heavy');
        heavy.catch(() => {
            heavy = undefined;
        });
    }
    return heavy;
}

/**
 * The chain, before its client has arrived: every question waits for the
 * client and is then asked of it. A client that cannot be fetched reads as
 * "no node could be reached", which every screen already knows how to say.
 */
function lazyChain(): Chain {
    let real: Promise<Chain> | undefined;
    const get = (): Promise<Chain> => {
        if (real === undefined) {
            real = loadHeavy().then(
                m => m.createChronikChain(),
                () => {
                    real = undefined;
                    throw new ChainError('offline', 'The chain client could not be loaded');
                },
            );
        }
        return real;
    };
    return {
        read: a => get().then(c => c.read(a)),
        readChecked: a => get().then(c => (c.readChecked ? c.readChecked(a) : c.read(a))),
        broadcast: raw => get().then(c => c.broadcast(raw)),
        settle: (txid, address, opts) => get().then(c => c.settle(txid, address, opts)),
        lookup: txid => get().then(c => c.lookup!(txid)),
        detail: txid => get().then(c => c.detail!(txid)),
        holders: id => get().then(c => c.holders!(id)),
        everSpent: a => get().then(c => c.everSpent!(a)),
        tokenMeta: id => get().then(c => c.tokenMeta!(id)),
        validate: raw => get().then(c => c.validate!(raw)),
        watch(address, onChange) {
            let off: (() => void) | undefined;
            let closed = false;
            get().then(
                c => {
                    if (!closed) off = c.watch(address, onChange);
                },
                () => {
                    /* no client: nothing to watch; the screen's own reads say what is wrong */
                },
            );
            return () => {
                closed = true;
                off?.();
            };
        },
    };
}

const root = document.getElementById('app');
if (root) {
    const params = new URLSearchParams(location.search);
    if (import.meta.env.DEV && params.has('demo')) {
        // Development only: pretend money, no network. None of this is in a production build.
        const [{ createDemoChain }, { prepareDemo }, screens] = await Promise.all([import('./core/chain/demo'), import('./ui/demo'), loadHeavy()]);
        const d = createDemoChain();
        // No request leaves a demo page: token icons are a stand-in drawn here.
        setTokenIconSource(() => DEMO_ICON);
        const first = prepareDemo(d, params);
        const demo: DemoCtx = { chain: d, params, first: first === 'created' || first === 'create' ? first : null };
        // The listening room: the dev server only, and only when asked for.
        if (params.has('listen')) void import('./ui/listen').then(m => m.mountListen(root));
        else startApp(root, d, demo, screens);
    } else {
        // A gift link, or a visit that was on the create step, needs the heavy piece at once: it is fetched while the
        // page draws. A visit to the shop fetches it a moment later, quietly, so that the next step is ready.
        const needsIt = location.hash.length > 1 || (history.state as { gift?: string } | null)?.gift === 'create';
        if (needsIt) void loadHeavy().catch(() => {});
        else setTimeout(() => void loadHeavy().catch(() => {}), 1500);
        startApp(root, lazyChain(), undefined, loadHeavy);
    }
}
