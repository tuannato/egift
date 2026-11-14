import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
    return readdirSync(dir).flatMap(n => {
        const p = join(dir, n);
        return statSync(p).isDirectory() ? files(p) : [p];
    });
}

describe('source hygiene', () => {
    const root = join(process.cwd(), 'src');
    const sources = [...files(join(root, 'ui')), ...files(join(root, 'i18n')), join(root, 'main.ts')].filter(
        f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !/testkit|fakestage/.test(f),
    );

    it('no-source-file-uses-innerHTML', () => {
        expect(sources.length).toBeGreaterThan(10);
        const bad = /innerHTML|insertAdjacentHTML|outerHTML|document\.write|eval\(|new Function/;
        for (const f of sources) expect(bad.test(readFileSync(f, 'utf8')), f).toBe(false);
    });

    it('the one file that keeps gifts writes two named keys, and never looks at the link', () => {
        const f = sources.find(x => x.endsWith('ui/kept.ts'))!;
        const s = readFileSync(f, 'utf8');
        expect(s.match(/localStorage\.setItem\(/g)?.length).toBe(1);
        expect(s).toContain("const STORE_KEY = 'gift.kept';");
        expect(s).toContain("const SENT_KEY = 'gift.sent';");
        // Storage is only ever touched through a key that is one of those two constants.
        expect(s.match(/localStorage\.\w+\(([^,)]+)/g)?.every(c => c.endsWith('(key'))).toBe(true);
        expect(s).toContain('function write(key: typeof STORE_KEY | typeof SENT_KEY,');
        expect(s).toContain('function readList(key: typeof STORE_KEY | typeof SENT_KEY)');
        expect(/location|\.hash\b|secret\b|\.sk\b|decodeFragment|encodeLink|\.link\b/.test(s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))).toBe(false);
    });

    it('the file that keeps favourite wrappers writes one named key, wrapper ids only, and never looks at a gift', () => {
        const f = sources.find(x => x.endsWith('ui/fav.ts'))!;
        const s = readFileSync(f, 'utf8');
        expect(s).toContain("const FAV_KEY = 'gift.fav';");
        expect(s.match(/localStorage\.\w+\(([^,)]+)/g)?.every(c => c.endsWith('(FAV_KEY'))).toBe(true);
        expect(/location|\.hash\b|secret\b|\.sk\b|decodeFragment|encodeLink|\.link\b|address|sats/.test(s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))).toBe(false);
    });

    it('no source file writes to storage except the language and the kept gifts, and none uses style attributes', () => {
        for (const f of sources) {
            const s = readFileSync(f, 'utf8');
            expect(/sessionStorage|indexedDB|document\.cookie/.test(s), f).toBe(false);
            if (!f.endsWith('i18n/index.ts') && !f.endsWith('ui/kept.ts') && !f.endsWith('ui/fav.ts')) expect(/localStorage/.test(s), f).toBe(false);
            expect(/cssText|\bstyle:\s*['"`]|setAttribute\(\s*['"]style/.test(s), f).toBe(false);
            expect(/console\./.test(s), f).toBe(false);
        }
    });
});
