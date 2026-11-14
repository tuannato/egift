/**
 * After `vite build`: one page per wrapper, so that a link in that wrapper
 * shows that wrapper's share card.
 *
 *   dist/<id>/index.html   the same app, with og:image = /og/<id>.jpg
 *
 * A gift link is `https://egift.cash/<id>/#…`. A chat app asks the host for
 * `/<id>/` (never for what follows `#`) and draws the card named there. The
 * page is otherwise byte for byte the built index.html: assets are addressed
 * from the root, and the app reads the fragment only.
 *
 * Fails the build when a wrapper has no card or no thumbnail: draw it with `node scripts/og-cards.mjs <id>`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const SITE = 'https://egift.cash';
const registry = readFileSync('src/wrappers/index.ts', 'utf8');
const ids = /WRAPPERS: readonly WrapperDef\[\] = \[([^\]]+)\]/.exec(registry)[1].split(',').map(s => s.trim()).filter(Boolean);
const html = readFileSync('dist/index.html', 'utf8');
const swap = (page, prop, value) => {
    const re = new RegExp(`(<meta property="${prop}" content=")[^"]*(")`);
    if (!re.test(page)) throw new Error(`share-pages: index.html has no ${prop}`);
    return page.replace(re, `$1${value}$2`);
};
const missing = [];
for (const id of ids) {
    if (!/^[a-z0-9-]{1,24}$/.test(id)) throw new Error(`share-pages: bad wrapper id "${id}"`);
    if (!existsSync(`public/og/${id}.jpg`) || !existsSync(`public/thumbs/${id}.jpg`)) {
        missing.push(id);
        continue;
    }
    let page = swap(html, 'og:image', `${SITE}/og/${id}.jpg`);
    page = swap(page, 'og:url', `${SITE}/${id}/`);
    page = swap(page, 'og:title', 'A gift is waiting inside — eGift');
    page = swap(page, 'og:description', 'Open the link to see it. eCash, wrapped into a link.');
    mkdirSync(`dist/${id}`, { recursive: true });
    writeFileSync(`dist/${id}/index.html`, page);
}
if (missing.length) {
    console.error(`share-pages: no share card or thumbnail for: ${missing.join(', ')}. Run: node scripts/og-cards.mjs ${missing.join(' ')}`);
    process.exit(1);
}
// The signing library carries its wasm inside its own JavaScript; the bundler also writes the same bytes out as a
// file that nothing asks for. It is removed unless something in the build names it.
const assets = readdirSync('dist/assets');
const text = assets.filter(f => /\.(js|css)$/.test(f)).map(f => readFileSync(`dist/assets/${f}`, 'utf8')).join('\n') + html;
for (const f of assets.filter(f => f.endsWith('.wasm'))) {
    if (!text.includes(f)) rmSync(`dist/assets/${f}`);
}
console.log(`share-pages: ${ids.length} wrapper pages`);
