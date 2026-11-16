/**
 * Draw the share card of every wrapper (public/og/<id>.jpg, 1200x630) and its small still (public/thumbs/<id>.webp).
 *
 *   node scripts/og-cards.mjs            every wrapper
 *   node scripts/og-cards.mjs snowbox    one
 *
 * The dev server must be running (see scripts/shot.mjs): the card is the dev
 * page /dev/card.html?id=<id>, photographed. macOS only (uses `sips`).
 * Run it again after a wrapper's closed picture or English name changes.
 */
import { execFileSync } from 'node:child_process';
import { toWebp } from './to-webp.mjs';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';

const registry = readFileSync('src/wrappers/index.ts', 'utf8');
const all = /WRAPPERS: readonly WrapperDef\[\] = \[([^\]]+)\]/.exec(registry)[1].split(',').map(s => s.trim()).filter(Boolean);
const ids = process.argv.length > 2 ? process.argv.slice(2) : all;
mkdirSync('public/og', { recursive: true });
mkdirSync('public/thumbs', { recursive: true });
/** A wrapper's canvas size, read from its definition (360x450 unless it says otherwise). */
const sizeOf = id => {
    const m = /size:\s*\[(\d+),\s*(\d+)\]/.exec(readFileSync(`src/wrappers/${id}.ts`, 'utf8'));
    return m ? [Number(m[1]), Number(m[2])] : [360, 450];
};
mkdirSync('.shots', { recursive: true });
for (const id of ids) {
    const tmp = `.shots/og-${id}.png`;
    execFileSync('node', ['scripts/shot.mjs', `/dev/card.html?id=${id}`, tmp, '1200', '630', '2500', 'calm'], { stdio: 'ignore' });
    execFileSync('sips', ['-z', '630', '1200', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', tmp, '--out', `public/og/${id}.jpg`], { stdio: 'ignore' });
    rmSync(tmp);
    // The small still of the closed wrapper, for the shelf and the picker: public/thumbs/<id>.webp, 320 wide (a door or a case is never drawn wider than about 130 CSS pixels).
    const [w, hgt] = sizeOf(id);
    const t = `.shots/thumb-${id}.png`;
    execFileSync('node', ['scripts/shot.mjs', `/dev/card.html?id=${id}&thumb`, t, String(w * 2), String(hgt * 2), '2500', 'calm'], { stdio: 'ignore' });
    toWebp(t, `public/thumbs/${id}.webp`, 320, Math.round((320 * hgt) / w), 0.82);
    rmSync(t);
    console.log(id);
}
// The stills are part of what a wrapper's version is made of: it is written again.
execFileSync('node', ['scripts/art-version.mjs'], { stdio: 'inherit' });
