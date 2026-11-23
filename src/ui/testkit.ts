/** Helpers for the UI tests. Not part of the app: nothing imports this but tests. */
import { createDemoChain, forgetSweeps } from '../core';
import { forgetTakes } from './screens/takeHome';
import { forgetPackages } from './screens/package';
import { resetCreate } from './screens/create';
import { resetHome } from './screens/home';
import { resetSound } from './sound';
import { resetBusy } from './busy';
import { resetFolds } from './layout';
import type { DemoChain } from '../core';
import { startApp } from './app';
import * as ALL from './screens/all';
import { clearBatch, clearMade } from './session';
import '../i18n/all';
import { initLang, setLang } from '../i18n';
import type { Lang } from '../i18n';

export const flush = async (n = 6): Promise<void> => {
    for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0));
};

export interface Booted {
    root: HTMLElement;
    chain: DemoChain;
    stop: () => void;
}

export function resetPage(lang: Lang = 'en'): void {
    try {
        localStorage.clear();
        sessionStorage.clear();
    } catch {
        /* ignore */
    }
    // No test reaches a network: the page's own picture files (the keepsake art) are simply not there.
    (globalThis as { fetch?: unknown }).fetch = async () => {
        throw new Error('no network in tests');
    };
    clearMade();
    clearBatch();
    forgetTakes();
    forgetPackages();
    resetCreate();
    resetHome();
    resetSound();
    forgetSweeps();
    resetBusy();
    resetFolds();
    history.replaceState(null, '', '/');
    document.body.replaceChildren();
    for (const k of Object.keys(document.documentElement.dataset)) delete document.documentElement.dataset[k];
    initLang();
    // Not stored: the language is forced for the test without touching storage rules.
    if (lang !== 'en') setLang(lang);
    else setLang('en');
    try {
        localStorage.clear();
    } catch {
        /* ignore */
    }
}

/**
 * Start the app. With no gift link in the address bar it opens on the shop;
 * most tests are about what comes after, so by default this steps through the
 * shop's one button to the create screen. `{ stay: true }` stays in the shop.
 */
export function boot(chain: DemoChain = createDemoChain(), opts: { stay?: boolean } = {}): Booted {
    const root = document.createElement('div');
    root.id = 'app';
    document.body.append(root);
    const stop = startApp(root, chain, undefined, ALL);
    if (!opts.stay) (root.querySelector('.screen-home .home-go') as HTMLButtonElement | null)?.click();
    return { root, chain, stop };
}

export function buttonByText(root: ParentNode, text: string): HTMLButtonElement {
    const b = [...root.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === text);
    if (!b) throw new Error('no button: ' + text);
    return b as HTMLButtonElement;
}

export function type(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Drive the create form: amount, optional wish, press Create. */
export async function createGift(root: HTMLElement, amount = '10', wish = ''): Promise<void> {
    type(root.querySelector('#f-amount') as HTMLInputElement, amount);
    type(root.querySelector('#f-wish') as HTMLTextAreaElement, wish);
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();
}

export function stubClipboard(): { written: string[] } {
    const written: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (s: string) => void written.push(s), readText: async () => '' },
    });
    return { written };
}
