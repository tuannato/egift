/**
 * Give every wrapper's pictures a version: a short hash of the files themselves.
 *
 * Wrapper art is served under fixed names and kept by a browser for a day, while new code arrives at once: a
 * wrapper drawn again would be shown, for that day, as the new scene laid over the old pictures. The page asks
 * for each picture with `?v=<version>`, so a wrapper whose pictures changed is fetched again and no other is.
 * The version is never part of a gift link and never part of a file's name.
 *
 * Writes src/wrappers/artVersion.gen.ts. Run by the build; src/wrappers/artVersion.test.ts holds the written
 * file to the pictures on disk.
 * Run: node scripts/art-version.mjs
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

/** The version of every wrapper that has a folder of art: its pictures, its small still and its share card. */
export function versions(root = ROOT) {
    const dir = join(root, 'public', 'wrappers');
    const out = {};
    for (const id of readdirSync(dir).sort()) {
        if (!statSync(join(dir, id)).isDirectory()) continue;
        const hash = createHash('sha256');
        // Pictures only: a file the system leaves in a folder is no part of the art.
        for (const f of readdirSync(join(dir, id)).filter(n => n.endsWith('.svg')).sort()) {
            hash.update(f).update('\0').update(readFileSync(join(dir, id, f))).update('\0');
        }
        for (const still of [`thumbs/${id}.webp`, `thumbs/door/${id}.webp`, `og/${id}.jpg`]) {
            const p = join(root, 'public', still);
            if (existsSync(p)) hash.update(still).update('\0').update(readFileSync(p)).update('\0');
        }
        out[id] = hash.digest('hex').slice(0, 8);
    }
    return out;
}

export function source(v = versions()) {
    const body = Object.entries(v).map(([id, ver]) => `    ${/^[a-z0-9]+$/.test(id) ? id : `'${id}'`}: '${ver}',\n`).join('');
    return `// Written by scripts/art-version.mjs. Do not edit: the build writes it from the pictures on disk.\n/* eslint-disable */\n\n/** A short hash of each wrapper's pictures: asked for as \`?v=\`, so that pictures drawn again are fetched again. */\nexport const ART_VERSION: Readonly<Record<string, string>> = {\n${body}};\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const out = join(ROOT, 'src', 'wrappers', 'artVersion.gen.ts');
    const v = versions();
    const next = source(v);
    if (!existsSync(out) || readFileSync(out, 'utf8') !== next) writeFileSync(out, next);
    console.log(`art-version: ${Object.keys(v).length} wrappers`);
}
