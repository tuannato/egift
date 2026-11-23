/**
 * The last step of `pnpm build`: the build fails when the page has grown past
 * what it is allowed to weigh. The numbers are ceilings, not targets; raise
 * one only on purpose, in the same change that needs it.
 *
 *   - what the shop must fetch before it can draw (the entry script and what
 *     it preloads), gzipped
 *   - the heavy piece (everything beyond the shop): the file that holds the
 *     page's own code, and that file with the signing core beside it, gzipped
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
    // The heavy piece is what a gift's recipient waits for, in two files. The first holds the screens and the
    // libraries' own code: the part that grows with features. The second is the signing core, which only changes with
    // the library. They stood at 133 kB, and 1287 kB together, when the limits were set.
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
// The heavy piece is two files: the screens with the libraries' own code, and the signing core on its own.
const named = re => readdirSync('dist/assets').filter(f => re.test(f));
const heavyFiles = named(/^heavy-.*\.js$/);
const signingFiles = named(/^signing-.*\.js$/);
if (heavyFiles.length !== 1) fail.push(`heavy piece: expected one file, found ${heavyFiles.length}`);
if (signingFiles.length !== 1) fail.push(`signing core: expected one file, found ${signingFiles.length}`);
const gzFile = f => gzipSync(readFileSync(`dist/assets/${f}`)).length;
const heavyOwn = heavyFiles.reduce((s, f) => s + gzFile(f), 0);
const heavyAll = heavyOwn + signingFiles.reduce((s, f) => s + gzFile(f), 0);
// The signing core must stay out of what the shop fetches, and must not lean on a file that changes with the page.
if (eager.some(f => /\/(?:heavy|signing)-/.test(f))) fail.push('the shop fetches the heavy piece at once');
for (const f of signingFiles) if (/import\s*(?:[^"']*from\s*)?["']\.\//.test(readFileSync(`dist/assets/${f}`, 'utf8').slice(0, 2000))) fail.push('signing core: it imports another file, so it changes when that file does');
const rules = readFileSync('dist/_headers', 'utf8').split('\n').filter(l => /^\/\S*$/.test(l)).length;
const files = walk('dist');
const lines = [
    `shop code, gzipped: ${check('shop code (gzip)', entry, LIMITS.entryGzip)}`,
    `heavy piece, own code: ${check('heavy piece, own code (gzip)', heavyOwn, LIMITS.heavyOwnGzip)}`,
    `heavy piece, whole: ${check('heavy piece, whole (gzip)', heavyAll, LIMITS.heavyGzip)}`,
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
