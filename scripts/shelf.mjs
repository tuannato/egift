/**
 * What the shop needs of each wrapper before anything is touched — its id, its words, its colours, the size of
 * its picture — written out on its own, so the page can draw the shelf without fetching every wrapper's scene.
 *
 *   node scripts/shelf.mjs        writes src/wrappers/shelf.gen.ts
 *
 * Run it after a wrapper is added or its name, blurb, theme or picture size changes (`pnpm build` runs it first;
 * `shelf.test.ts` fails while the file is out of date).
 */
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';

/** The fields the shelf reads. Everything else (layers, the opening, the tune) stays with the full definition. */
export const SHELF_FIELDS = ['id', 'name', 'blurb', 'credit', 'ambient', 'theme', 'size', 'backdrop'];

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
try {
    const { WRAPPERS } = await server.ssrLoadModule('/src/wrappers/index.ts');
    const shelf = WRAPPERS.map(def => Object.fromEntries(SHELF_FIELDS.filter(k => def[k] !== undefined).map(k => [k, def[k]])));
    const body = shelf.map(d => '    ' + JSON.stringify(d)).join(',\n');
    writeFileSync(
        'src/wrappers/shelf.gen.ts',
        `// Written by scripts/shelf.mjs from the wrappers' definitions. Do not edit by hand.\n` +
            `import type { WrapperDef } from '../stage/format';\n\n` +
            `/** What the shop needs of a wrapper before it is touched. The rest of it is fetched with the wrappers (\`./index\`). */\n` +
            `export type ShelfDef = Pick<WrapperDef, ${SHELF_FIELDS.map(f => `'${f}'`).join(' | ')}>;\n\n` +
            `/** Every wrapper on the shelf, in the order of \`WRAPPERS\`. */\n` +
            `export const SHELF: readonly ShelfDef[] = [\n${body},\n];\n`,
    );
    console.log(`shelf: ${shelf.length} wrappers`);
} finally {
    await server.close();
}
