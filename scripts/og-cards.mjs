/**
 * Draw the share card of every wrapper: public/og/<id>.jpg, 1200x630.
 *
 *   node scripts/og-cards.mjs            every wrapper
 *   node scripts/og-cards.mjs snowbox    one
 *
 * The dev server must be running (see scripts/shot.mjs): the card is the dev
 * page /dev/card.html?id=<id>, photographed. macOS only (uses `sips`).
 * Run it again after a wrapper's closed picture or English name changes.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';

const registry = readFileSync('src/wrappers/index.ts', 'utf8');
const all = /WRAPPERS: readonly WrapperDef\[\] = \[([^\]]+)\]/.exec(registry)[1].split(',').map(s => s.trim()).filter(Boolean);
const ids = process.argv.length > 2 ? process.argv.slice(2) : all;
mkdirSync('public/og', { recursive: true });
mkdirSync('.shots', { recursive: true });
for (const id of ids) {
    const tmp = `.shots/og-${id}.png`;
    execFileSync('node', ['scripts/shot.mjs', `/dev/card.html?id=${id}`, tmp, '1200', '630', '2500', 'calm'], { stdio: 'ignore' });
    execFileSync('sips', ['-z', '630', '1200', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', tmp, '--out', `public/og/${id}.jpg`], { stdio: 'ignore' });
    rmSync(tmp);
    console.log(id);
}
