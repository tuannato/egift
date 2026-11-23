/**
 * After `vite build`: one page per wrapper, so that a link in that wrapper
 * shows that wrapper's share card.
 *
 *   dist/<id>/index.html   the same app, with og:image = /og/<id>.jpg
 *
 * A gift link is `https://egift.cash/<id>/#…`. A chat app asks the host for
 * `/<id>/` (never for what follows `#`) and draws the card named there. The
 * page is otherwise the built index.html, with one addition: it asks for the
 * heavy piece ahead of time, since a gift needs it. Assets are addressed from
 * the root, and the app reads the fragment only.
 *
 * Fails the build when a wrapper has no card or no thumbnail: draw it with `node scripts/og-cards.mjs <id>`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { versions } from './art-version.mjs';

const SITE = 'https://egift.cash';
// The share card is asked for with the version of the wrapper's pictures, as the page asks for the pictures.
const VERSION = versions();
const registry = readFileSync('src/wrappers/index.ts', 'utf8');
const ids = /WRAPPERS: readonly WrapperDef\[\] = \[([^\]]+)\]/.exec(registry)[1].split(',').map(s => s.trim()).filter(Boolean);
const html = readFileSync('dist/index.html', 'utf8');
const swap = (page, prop, value) => {
    const re = new RegExp(`(<meta property="${prop}" content=")[^"]*(")`);
    if (!re.test(page)) throw new Error(`share-pages: index.html has no ${prop}`);
    return page.replace(re, `$1${value}$2`);
};
// A wrapper's page is where a gift link lands, and a gift needs the heavy piece: the page asks for its two files
// while it is still being read, before the entry script has run. The shop's own page does not.
const built = readdirSync('dist/assets');
const ahead = [/^heavy-.*\.js$/, /^signing-.*\.js$/].map(re => {
    const found = built.filter(f => re.test(f));
    if (found.length !== 1) throw new Error(`share-pages: expected one file for ${re}, found ${found.length}`);
    return `      <link rel="modulepreload" crossorigin href="/assets/${found[0]}">\n`;
});
if (!html.includes('    </head>')) throw new Error('share-pages: index.html has no closing head to add to');
const missing = [];
for (const id of ids) {
    if (!/^[a-z0-9-]{1,24}$/.test(id)) throw new Error(`share-pages: bad wrapper id "${id}"`);
    if (!existsSync(`public/og/${id}.jpg`) || !existsSync(`public/thumbs/${id}.webp`) || !VERSION[id]) {
        missing.push(id);
        continue;
    }
    let page = swap(html, 'og:image', `${SITE}/og/${id}.jpg?v=${VERSION[id]}`);
    page = swap(page, 'og:url', `${SITE}/${id}/`);
    page = swap(page, 'og:title', 'A gift is waiting inside — eGift');
    page = swap(page, 'og:description', 'Open the link to see it. eCash, wrapped into a link.');
    page = page.replace('    </head>', ahead.join('') + '    </head>');
    mkdirSync(`dist/${id}`, { recursive: true });
    writeFileSync(`dist/${id}/index.html`, page);
}
if (missing.length) {
    console.error(`share-pages: no share card or thumbnail for: ${missing.join(', ')}. Run: node scripts/og-cards.mjs ${missing.join(' ')}`);
    process.exit(1);
}
// The signing library starts from a copy of its compiled core carried inside its own JavaScript; the bundler also
// writes the same bytes out as a file. The only thing that names that file is the library's other way of starting
// (a fetch), which nothing calls: so the file is removed. The build stops if the library no longer carries its own
// copy, since the file would then be needed.
const assets = readdirSync('dist/assets');
const carried = assets.filter(f => /^signing-.*\.js$/.test(f));
for (const f of assets.filter(f => f.endsWith('.wasm'))) {
    if (carried.length !== 1) throw new Error('share-pages: the signing core is not in a file of its own; ' + f + ' may be needed');
    rmSync(`dist/assets/${f}`);
}
console.log(`share-pages: ${ids.length} wrapper pages`);
