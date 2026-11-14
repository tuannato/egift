/**
 * The gate for wrapper art. `node scripts/wrap-art.mjs` checks every
 * public/wrappers/**\/*.svg through the allow-list and requires each file to be
 * byte-identical to its re-serialisation; `--write` rewrites them that way.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeSvg } from './svg-allow.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'wrappers');

/** Every .svg under `dir`, sorted so the first refusal is stable. */
export function svgFiles(dir = ROOT) {
    const out = [];
    let names = [];
    try {
        names = readdirSync(dir).sort();
    } catch {
        return out;
    }
    for (const name of names) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
            out.push(...svgFiles(p));
        } else if (name.endsWith('.svg')) {
            out.push(p);
        }
    }
    return out;
}

/** `{ file, why }` for the first problem of one file, or undefined when it is clean. */
export function checkFile(file, write = false) {
    const text = readFileSync(file, 'utf8');
    const { svg, problems } = sanitizeSvg(text);
    if (svg === undefined) {
        return { file, why: problems.join('; ') };
    }
    if (svg !== text) {
        if (write) {
            writeFileSync(file, svg);
            return undefined;
        }
        return { file, why: 'not byte-identical to its re-serialisation (run: node scripts/wrap-art.mjs --write)' };
    }
    return undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const write = process.argv.includes('--write');
    const files = svgFiles();
    for (const f of files) {
        const bad = checkFile(f, write);
        if (bad) {
            process.stderr.write(`${bad.file}: ${bad.why}\n`);
            process.exit(1);
        }
    }
    process.stdout.write(`${files.length} wrapper SVG file(s) ${write ? 'written' : 'clean'}\n`);
}
