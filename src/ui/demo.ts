/**
 * Development-only helpers for `?demo`. Every use in the app is guarded by
 * `import.meta.env.DEV`, so none of this reaches a production build.
 */
import { DEFAULT_WRAPPER, deriveKey, encodeLink, parseXec, riddleRoot, stampOpReturnRaw } from '../core';
import type { DemoChain } from '../core';
import { clearMade, setMade } from './session';
import { chooseWrapper } from './screens/create';
import { setOfferForDev } from '../wrappers';

/** Read the demo query. Returns what the router should show first. */
export function prepareDemo(chain: DemoChain, params: URLSearchParams): 'created' | 'package' | 'create' | 'home' {
    const DEMO_SECRET = new Uint8Array(16).fill(0x2a);
    const lang = params.get('lang') === 'vi' ? 'vi' : 'en';
    const wrapper = params.get('wrapper') ?? DEFAULT_WRAPPER;
    const sats = parseXec(params.get('amount') ?? '88.88') ?? 8888n;
    // `&price=5`: put a price (in XEC) on the wrapper, paid to a made-up maker. `&stamped=1`: the demo funding pays it.
    const maker = deriveKey(new Uint8Array(16).fill(0x33));
    const price = parseXec(params.get('price') ?? '');
    const LICENCE = 'ab'.repeat(32);
    const OWNER = '76a914' + '22'.repeat(20) + '88ac';
    const offer = price !== null && price >= 546n ? { sats: price, payTo: maker.address, ...(params.get('licence') === '1' ? { licence: { tokenId: LICENCE, buyAt: 'https://cashtab.com/' } } : {}) } : null;
    if (offer && params.get('owned') === '1') chain.grant(LICENCE, OWNER);
    if (offer) setOfferForDev(wrapper, offer);
    const p2pkh = (pkh: Uint8Array): string => '76a914' + [...pkh].map(b => b.toString(16).padStart(2, '0')).join('') + '88ac';
    const stampTx = (pkh: Uint8Array) =>
        offer && params.get('stamped') === '1'
            ? { tx: { inputs: ['76a914' + '11'.repeat(20) + '88ac'], outputs: [{ sats: 0n, script: '6a' + stampOpReturnRaw(wrapper, pkh) }, { sats, script: p2pkh(pkh) }, { sats: offer.sats, script: p2pkh(maker.pkh) }] } }
            : offer && params.get('owned') === '1'
              ? { tx: { inputs: [OWNER], outputs: [{ sats, script: p2pkh(pkh) }] } }
              : {};

    if (params.get('screen') === 'created') {
        const key = deriveKey(DEMO_SECRET);
        const link = encodeLink({ version: 1, secret: DEMO_SECRET, wrapper }, location.origin);
        clearMade();
        setMade({ secret: DEMO_SECRET, key, link, sats, wrapper, saved: params.get('saved') === '1' });
        if (params.get('funded') === '1') chain.fund(key.address, sats, stampTx(key.pkh));
        // `&token=alp|nft`: the giver's token is already in the package (the token step and the holding bar show it).
        const kind = params.get('token');
        const id = 'a1'.repeat(32);
        chain.describe(id, kind === 'nft' ? { name: lang === 'vi' ? 'Vé xem phim #12' : 'Cinema ticket #12', ticker: 'VE', decimals: 0 } : { name: 'Cafe Points', ticker: 'CAFE', decimals: 2 });
        if (params.get('funded') === '1' && (kind === 'alp' || kind === 'nft')) {
            const giver = (stampTx(key.pkh) as { tx?: { inputs: string[] } }).tx?.inputs ?? ['76a914' + '00'.repeat(20) + '88ac'];
            chain.fund(key.address, 546n, { tokenInfo: { tokenId: id, kind, atoms: kind === 'nft' ? 1n : 12_550n, baton: false }, tx: { inputs: giver, outputs: [] } });
        }
        return 'created';
    }

    // `&verdict=unknown|conflict|invalid|offline-after-send|missing-parent`: how the first broadcast ends (dev stills of every ending).
    const verdict = params.get('verdict');
    if (verdict === 'unknown' || verdict === 'conflict' || verdict === 'invalid' || verdict === 'offline-after-send' || verdict === 'missing-parent') {
        chain.nextVerdict(verdict, 1500);
    }

    const state = params.get('state');
    if (state === 'funded' || state === 'empty' || state === 'taken' || state === 'unfinal') {
        const key = deriveKey(DEMO_SECRET);
        const sample = lang === 'vi' ? 'Chúc mừng sinh nhật! Mua gì con thích nhé.' : 'Happy birthday! Buy yourself something nice.';
        const wish = params.has('wish') ? (params.get('wish') ?? '') : sample;
        // `&riddle=1`: a locked gift. The question is in the link; the answer is "mèo".
        const riddle = params.get('riddle') === '1' ? (lang === 'vi' ? 'Con gì kêu meo meo?' : 'What says meow?') : undefined;
        const link = encodeLink({ version: 1, secret: DEMO_SECRET, wrapper, wish: wish === '' ? undefined : wish, riddle }, location.origin);
        const fund = (address: string, pkh: Uint8Array = key.pkh): void => {
            if (state === 'funded' || state === 'taken') chain.fund(address, sats, stampTx(pkh));
            // `&token=alp|slp|nft`: the giver's token rides along. `&spam=1`: a stranger's token too.
            const kind = params.get('token');
            if (kind === 'alp' || kind === 'slp' || kind === 'nft') {
                const id = 'a1'.repeat(32);
                const giver = (stampTx(pkh) as { tx?: { inputs: string[] } }).tx?.inputs ?? ['76a914' + '00'.repeat(20) + '88ac'];
                chain.describe(id, kind === 'nft' ? { name: lang === 'vi' ? 'Vé xem phim #12' : 'Cinema ticket #12', ticker: 'VE', decimals: 0 } : { name: 'Cafe Points', ticker: 'CAFE', decimals: 2 });
                chain.fund(address, 546n, { tokenInfo: { tokenId: id, kind, atoms: kind === 'nft' ? 1n : 12_550n, baton: false }, tx: { inputs: giver, outputs: [] } });
            }
            if (params.get('spam') === '1') {
                const id = 'b2'.repeat(32);
                chain.describe(id, { name: 'FREE 1000000 XEC claim-now.example', ticker: 'XEC', decimals: 0 });
                chain.fund(address, 546n, { tokenInfo: { tokenId: id, kind: 'alp', atoms: 1_000_000n, baton: false }, tx: { inputs: ['76a914' + '99'.repeat(20) + '88ac'], outputs: [] } });
            }
            if (state === 'unfinal') chain.fund(address, sats, { final: false });
            if (state === 'taken') chain.steal(address);
        };
        if (riddle !== undefined) void riddleRoot(DEMO_SECRET, lang === 'vi' ? 'mèo' : 'cat').then(root => {
                const k = deriveKey(root);
                fund(k.address, k.pkh);
            });
        else fund(key.address);
        history.replaceState(null, '', location.pathname + location.search + link.slice(link.indexOf('#')));
        return 'package';
    }
    if (params.get('screen') === 'create') {
        chooseWrapper(wrapper);
        return 'create';
    }
    return 'home';
}
