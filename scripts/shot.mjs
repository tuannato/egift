#!/usr/bin/env node
/**
 * Take a still of a page of the dev server with headless Chrome.
 *
 *   node scripts/shot.mjs "<path-and-query>" <out.png> [width] [height] [virtual-time-ms] [calm]
 *
 * `calm` asks the page for reduced motion, so entrance animations (which headless
 * Chrome's virtual time leaves half-played) are skipped and the still shows the settled page.
 *
 * The dev server must be running on http://localhost:5183 (`pnpm dev`).
 * Nothing but localhost is contacted: every other host is mapped to an
 * address that refuses the connection.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const [, , route = '/', out = '.shots/shot.png', width = '390', height = '844', budget = '4000', calm = ''] = process.argv;
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const file = resolve(out);
mkdirSync(dirname(file), { recursive: true });
const url = 'http://localhost:5183' + (route.startsWith('/') ? route : '/' + route);
// One profile per run: several stills may be taken at once, and Chrome refuses to share a profile.
const profile = mkdtempSync(join(tmpdir(), 'gift-shot-'));
const r = spawnSync(
    chrome,
    [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-sync',
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
        `--user-data-dir=${profile}`,
        `--window-size=${width},${height}`,
        '--force-device-scale-factor=2',
        `--virtual-time-budget=${budget}`,
        ...(calm ? ['--force-prefers-reduced-motion'] : []),
        `--screenshot=${file}`,
        url,
    ],
    { encoding: 'utf8', timeout: 60000 },
);
rmSync(profile, { recursive: true, force: true });
if (r.status !== 0 || !existsSync(file)) {
    console.error(r.stderr || r.error || 'no still was written');
    process.exit(1);
}
console.log(file);
