/**
 * The last step of `pnpm build`: the build fails when the page has grown past
 * what it is allowed to weigh. The numbers are ceilings, not targets; raise
 * one only on purpose, in the same change that needs it.
 *
 *   - what the shop must fetch before it can draw (the entry script and what
 *     it preloads), gzipped
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
const rules = readFileSync('dist/_headers', 'utf8').split('\n').filter(l => /^\/\S*$/.test(l)).length;
const files = walk('dist');
const lines = [`shop code, gzipped: ${check('shop code (gzip)', entry, LIMITS.entryGzip)}`, `_headers rules: ${check('_headers rules', rules, LIMITS.headerRules, 'n')}`, `files: ${check('files in dist', files.length, LIMITS.files, 'n')}`];
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
