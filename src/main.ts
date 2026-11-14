import './styles/fonts.css';
import './styles/frame.css';
import './styles/theatre.css';
import './styles/capsule.css';
import './styles/home.css';
import { createChronikChain, createDemoChain } from './core';
import { setTokenIconSource } from './ui/tokens';

const DEMO_ICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#c9a24a"/><circle cx="32" cy="32" r="18" fill="none" stroke="#3a2a08" stroke-width="6"/></svg>');
import type { Chain } from './core';
import { initLang } from './i18n';
import { startApp } from './ui/app';
import type { DemoCtx } from './ui/ctx';

initLang();

let chain: Chain;
let demo: DemoCtx | undefined;
if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
    const d = createDemoChain();
    // No request leaves a demo page: token icons are a stand-in drawn here.
    setTokenIconSource(() => DEMO_ICON);
    chain = d;
    demo = { chain: d, params: new URLSearchParams(location.search) };
} else {
    chain = createChronikChain();
}

const root = document.getElementById('app');
if (root) {
    // The listening room: the dev server only, and only when asked for.
    if (import.meta.env.DEV && demo?.params.has('listen')) void import('./ui/listen').then(m => m.mountListen(root));
    else startApp(root, chain, demo);
}
