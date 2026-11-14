import { rich } from './ecash';
import type { Chain } from '../core';
import { clear, h } from './dom';
import type { Dispose } from './dom';
import type { Ctx, DemoCtx } from './ctx';
import { LANGS, LANG_INFO, getLang, onLangChange, setLang, t } from '../i18n';
import { isInAppBrowser } from './inapp';
import { ribbon } from './ribbon';
import { getMade } from './session';
import { prefersReducedMotion } from './stageCard';
import { isBusy, onBusyChange } from './busy';
import { mountCreate } from './screens/create';
import { mountHome } from './screens/home';
import { mountCreated } from './screens/created';
import { mountPackage, linkFromHash } from './screens/package';
import { prepareDemo } from './demo';
import { ambientLayer } from './ambient';
import { destroyCapsules } from './capsule';
import { startLight } from './light';
import { isOffByHand, isOn, onSoundChange, setOn } from './sound';
import { applyTheme } from './theme';
import { svg } from './dom';
import type { PackageLink } from '../core';

type Route = { kind: 'home' } | { kind: 'create' } | { kind: 'created' } | { kind: 'package'; link: PackageLink | null };

function hasFragment(): boolean {
    return location.hash.length > 1;
}

/** With no gift link in the address bar the page is the shop; the create screen is one step in, and Back returns from it. */
function chooseRoute(): Route {
    if (hasFragment()) return { kind: 'package', link: linkFromHash(location.hash) };
    return (history.state as { gift?: string } | null)?.gift === 'create' ? { kind: 'create' } : { kind: 'home' };
}

async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

export function startApp(root: HTMLElement, chain: Chain, demo?: DemoCtx): () => void {
    let route: Route = chooseRoute();
    if (import.meta.env.DEV && demo) {
        const first = prepareDemo(demo.chain, demo.params);
        route = first === 'created' ? { kind: 'created' } : first === 'create' ? { kind: 'create' } : chooseRoute();
    }
    let dispose: Dispose = () => {};

    const ctx: Ctx = {
        chain,
        demo,
        nav: {
            toHome() {
                const st = history.state as { gift?: string; from?: string } | null;
                // The create screen was one step into the shop: go back out of it, so no dead entry is left behind.
                if (!hasFragment() && st?.gift === 'create' && st.from === 'shop') history.back();
                // A gift's address carries its wrapper as the path; the shop's own address is the root.
                else if (hasFragment() || st?.gift) history.replaceState(null, '', '/' + location.search);
                route = { kind: 'home' };
                render();
            },
            toCreate() {
                // One step into the shop: Back comes out again. The address itself does not change.
                if (hasFragment()) history.replaceState({ gift: 'create' }, '', '/' + location.search);
                else if ((history.state as { gift?: string } | null)?.gift !== 'create') history.pushState({ gift: 'create', from: 'shop' }, '', location.pathname + location.search);
                route = { kind: 'create' };
                render();
            },
            toCreated() {
                route = getMade() ? { kind: 'created' } : { kind: 'create' };
                render();
            },
        },
    };

    /**
     * The language picker: a button showing the language in use, and a list of
     * every language the page speaks — English first, then by the two-letter
     * tag each is listed under. Each name is written in its own language.
     */
    function langSwitch(): HTMLElement {
        const cur = getLang();
        const menu = h('div', { class: 'lang-menu', role: 'listbox', 'aria-label': t('app.lang.label'), hidden: true });
        const pick = h(
            'button',
            {
                type: 'button',
                class: 'lang lang-pick',
                'aria-haspopup': 'listbox',
                'aria-expanded': 'false',
                'aria-label': `${t('app.lang.label')}: ${LANG_INFO[cur].name}`,
                // A switch remounts the page: not while a take or a move is in flight.
                disabled: isBusy(),
            },
            h('span', { class: 'lang-tag' }, LANG_INFO[cur].tag),
            h('span', { class: 'lang-caret', 'aria-hidden': 'true' }, '▾'),
        );
        const close = (): void => {
            if (menu.hidden) return;
            menu.hidden = true;
            pick.setAttribute('aria-expanded', 'false');
            document.removeEventListener('pointerdown', outside, true);
            document.removeEventListener('keydown', onKey, true);
        };
        const outside = (e: Event): void => {
            if (!(e.target instanceof Node) || (!menu.contains(e.target) && !pick.contains(e.target))) close();
        };
        const onKey = (e: KeyboardEvent): void => {
            if (e.key !== 'Escape') return;
            close();
            pick.focus();
        };
        pick.addEventListener('click', () => {
            if (isBusy()) return;
            if (!menu.hidden) return close();
            menu.hidden = false;
            pick.setAttribute('aria-expanded', 'true');
            document.addEventListener('pointerdown', outside, true);
            document.addEventListener('keydown', onKey, true);
            (menu.querySelector('[aria-selected="true"]') as HTMLElement | null)?.focus();
        });
        for (const l of LANGS) {
            menu.append(
                h(
                    'button',
                    {
                        type: 'button',
                        class: 'lang-item',
                        role: 'option',
                        lang: l,
                        'data-lang': l,
                        'aria-selected': String(l === cur),
                        onclick: () => {
                            close();
                            if (!isBusy()) setLang(l);
                        },
                    },
                    h('span', { class: 'lang-tag' }, LANG_INFO[l].tag),
                    h('span', { class: 'lang-name' }, LANG_INFO[l].name),
                ),
            );
        }
        return h('div', { class: 'langs' }, pick, menu);
    }

    /**
     * Inside another app's browser. On a package: copy the full link and leave
     * (intended). Before creating: leave first; the copy is the page address,
     * which carries no secret. After creating: the key exists only in this
     * tab, so never suggest leaving before the link is saved.
     */
    function inAppBanner(r: Route): HTMLElement | null {
        if (!isInAppBrowser()) return null;
        if (r.kind === 'created') return h('div', { class: 'banner warning', role: 'note' }, h('p', null, t('app.inapp.created')));
        const note = h('span', { class: 'small', role: 'status' });
        const onCreate = r.kind === 'create' || r.kind === 'home';
        return h(
            'div',
            { class: 'banner warning', role: 'note' },
            h('p', null, onCreate ? t('app.inapp.create') : t('app.inapp')),
            h(
                'button',
                {
                    type: 'button',
                    class: 'btn btn-secondary btn-small',
                    onclick: () => {
                        void copyText(onCreate ? location.origin + '/' : location.href).then(ok => {
                            note.textContent = ok ? t('link.copied') : t('link.copyfail');
                        });
                    },
                },
                onCreate ? t('app.inapp.create.copy') : t('app.inapp.copy'),
            ),
            note,
        );
    }

    /**
     * The speaker in the bar. It shows whether sound is on — off when the page
     * arrives, on once the capsule has been touched — and switches it by hand.
     */
    let offSound: () => void = () => {};
    function soundToggle(): HTMLElement {
        const wave = svg('path', { class: 'sound-wave', d: 'M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12' });
        const cross = svg('path', { class: 'sound-cross', d: 'M16.5 9.5l5 5M21.5 9.5l-5 5' });
        const icon = svg('svg', { viewBox: '0 0 24 24', width: '22', height: '22', 'aria-hidden': 'true' }, svg('path', { d: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z' }), wave, cross);
        const btn = h('button', { type: 'button', class: 'sound' }, icon);
        const show = (): void => {
            btn.setAttribute('aria-pressed', String(isOn()));
            btn.setAttribute('aria-label', isOn() ? t('sound.on') : isOffByHand() ? t('sound.muted') : t('sound.off'));
        };
        show();
        btn.addEventListener('click', () => setOn(!isOn()));
        offSound();
        offSound = onSoundChange(show);
        return btn;
    }

    let first = true;
    function render(): void {
        // A screen change cross-fades where the browser can, never with reduced motion and never on the first paint.
        const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
        // Not on a phone either: the fade takes a picture of the whole page, twice, and a phone has little room for it.
        const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
        if (!first && !touch && typeof doc.startViewTransition === 'function' && !prefersReducedMotion() && document.visibilityState === 'visible') {
            // The page must change even if the browser never runs the transition's callback: paint at most once, whichever comes first.
            let painted = false;
            const once = () => {
                if (painted) return;
                painted = true;
                paint();
            };
            try {
                // A transition the browser skips (another one started) rejects its promises: that is no error here.
                const vt = doc.startViewTransition(once) as { ready?: Promise<unknown>; finished?: Promise<unknown>; updateCallbackDone?: Promise<unknown> } | undefined;
                for (const p of [vt?.ready, vt?.finished, vt?.updateCallbackDone]) p?.catch(() => {});
                setTimeout(once, 300);
                return;
            } catch {
                /* fall through */
            }
        }
        first = false;
        paint();
    }

    function paint(): void {
        dispose();
        dispose = () => {};
        destroyCapsules();
        clear(root);
        root.append(ambientLayer());
        const banner = inAppBanner(route);
        const main = h('main', { class: 'main', id: 'main' });
        if (import.meta.env.DEV && demo) root.append(h('div', { class: 'demo-strip', role: 'note' }, h('span', null, t('app.demo'))));
        root.append(
            h(
                'div',
                { class: 'shell' },
                h(
                    'header',
                    { class: 'topbar' },
                    h('span', { class: 'wordmark' }, ribbon('bow'), h('span', { class: 'wordmark-name' }, t('app.name'))),
                    h('div', { class: 'topbar-tools' }, soundToggle(), langSwitch()),
                ),
                banner ? h('div', { class: 'banner-wrap' }, banner) : null,
                main,
                h(
                    'footer',
                    { class: 'footer' },
                    h('p', null, t('app.footer.1')),
                    h('p', null, t('app.footer.2')),
                    // A link only where the page speaks for itself (the shop, the form). The screens that show a gift — where a
                    // stranger's words stand, and where a scam would be staged — carry no link at all.
                    h('p', { class: 'footer-tag' }, ...(route.kind === 'home' || route.kind === 'create' ? rich('app.footer.3') : [t('app.footer.3')])),
                ),
            ),
        );
        window.scrollTo?.(0, 0);
        const r = route;
        root.dataset.screen = r.kind;
        // A screen with a wrapper on stage dresses the page itself (`plate`); the others start from the neutral glass.
        applyTheme(undefined);
        if (r.kind === 'created') dispose = mountCreated(main, ctx);
        else if (r.kind === 'package') dispose = mountPackage(main, ctx, r.link);
        else if (r.kind === 'create') dispose = mountCreate(main, ctx);
        else dispose = mountHome(main, ctx);
        // There is no page to end with a footer: its three lines close the capsule instead.
        const foot = root.querySelector('.footer');
        const inner = main.querySelector('.cap-inner');
        if (foot && inner) inner.append(foot);
    }

    const onHash = () => {
        // The created screen holds the only copy of a key: Back and a cleared fragment never take it away.
        route = hasFragment() ? { kind: 'package', link: linkFromHash(location.hash) } : getMade() ? { kind: 'created' } : chooseRoute();
        render();
    };
    /** Back or Forward between the shop and the create screen: the address is the same, only the history entry differs. */
    const onPop = () => {
        if (hasFragment()) return; // a gift link: `hashchange` handles it
        // A gift made in this tab and not yet left behind: its screen is the only way back to its key.
        const next: Route = getMade() && (route.kind === 'created' || route.kind === 'package') ? { kind: 'created' } : chooseRoute();
        if (next.kind === route.kind) return;
        route = next;
        render();
    };
    startLight();
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onPop);
    const offLang = onLangChange(render);
    const offBusy = onBusyChange(() => {
        for (const b of root.querySelectorAll<HTMLButtonElement>('.lang')) b.disabled = isBusy();
    });
    render();
    return () => {
        window.removeEventListener('hashchange', onHash);
        window.removeEventListener('popstate', onPop);
        offSound();
        offLang();
        offBusy();
        dispose();
        destroyCapsules();
    };
}
