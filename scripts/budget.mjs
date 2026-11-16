/**
 * The last step of `pnpm build`: the build fails when the page has grown past
 * what it is allowed to weigh. The numbers are ceilings, not targets; raise
 * one only on purpose, in the same change that needs it.
 *
 *   - what the shop must fetch before it can draw (the entry script and what
 *     it preloads), gzipped
 *   - the heavy piece (everything beyond the shop): the page's own code in it,
 *     and the whole of it with the signing module it carries, gzipped
 *   - the rules in `_headers` (the host reads at most 100)
 *   - each wrapper's pictures: its small still, its share card, its art
 *   - the number of files the host is given
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const KB = 1024;
const LIMITS = {
    entryGzip: 140 * KB, // the shop's own code with English; one more language adds about 9 kB
    // The heavy piece is what a gift's recipient waits for. Its own code is the part that grows with features; the
    // signing module inside it only changes with the library. Both stood at 125 kB and 1280 kB when the limits were set.
    heavyOwnGzip: 150 * KB,
    heavyGzip: 1310 * KB,
    headerRules: 40,
    thumb: 90 * KB,
    card: 320 * KB,
    art: 900 * KB, // all the layers of one wrapper
    files: 15000,
};

const fail = [];
const check = (what, value, limit, unit = 'kB') => {
    const show = unit === 'kB' ? `${(value / KB).toFixed(0)} kB of ${(limit / KB).toFixed(0)} kB` : `${value} of ${limit}`;
    if (value > limit) fail.push(`${what}: ${show}`);
    return show;
};
const walk = dir => readdirSync(dir).flatMap(n => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));

const html = readFileSync('dist/index.html', 'utf8');
const eager = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
const entry = eager.reduce((sum, f) => sum + gzipSync(readFileSync('dist' + f)).length, 0);
// The signing module rides in the heavy piece as one long run of base64 lines; what is left is the page's own code.
const heavyFiles = readdirSync('dist/assets').filter(f => /^heavy-.*\.js$/.test(f));
if (heavyFiles.length !== 1) fail.push(`heavy piece: expected one file, found ${heavyFiles.length}`);
const heavyText = heavyFiles.map(f => readFileSync(`dist/assets/${f}`, 'utf8')).join('');
const gz = text => gzipSync(Buffer.from(text)).length;
const heavyOwn = gz(heavyText.replace(/(?:[A-Za-z0-9+/]{76}\n){1000,}[A-Za-z0-9+/=]*\n?/g, ''));
const rules = readFileSync('dist/_headers', 'utf8').split('\n').filter(l => /^\/\S*$/.test(l)).length;
const files = walk('dist');
const lines = [
    `shop code, gzipped: ${check('shop code (gzip)', entry, LIMITS.entryGzip)}`,
    `heavy piece, own code: ${check('heavy piece, own code (gzip)', heavyOwn, LIMITS.heavyOwnGzip)}`,
    `heavy piece, whole: ${check('heavy piece, whole (gzip)', gz(heavyText), LIMITS.heavyGzip)}`,
    `_headers rules: ${check('_headers rules', rules, LIMITS.headerRules, 'n')}`, `files: ${check('files in dist', files.length, LIMITS.files, 'n')}`,
];
for (const id of readdirSync('dist/wrappers')) {
    // A wrapper that is not on the shelf (the lock of a riddle gift) has art and nothing else.
    if (!existsSync(`dist/thumbs/${id}.webp`)) {
        check(`art of ${id}`, walk(`dist/wrappers/${id}`).reduce((s, f) => s + statSync(f).size, 0), LIMITS.art);
        continue;
    }
    const art = walk(`dist/wrappers/${id}`).reduce((s, f) => s + statSync(f).size, 0);
    check(`art of ${id}`, art, LIMITS.art);
    check(`thumbnail of ${id}`, statSync(`dist/thumbs/${id}.webp`).size, LIMITS.thumb);
    check(`share card of ${id}`, statSync(`dist/og/${id}.jpg`).size, LIMITS.card);
}
console.log('budget: ' + lines.join('; '));
if (fail.length) {
    console.error('budget: over the limit\n  ' + fail.join('\n  '));
    process.exit(1);
}
