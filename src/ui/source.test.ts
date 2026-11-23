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
    // Every file under `src` that is shipped: the screens, the money core, the stage and the wrappers alike.
    const sources = files(root).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !/testkit|fakestage/.test(f));

    it('no-source-file-uses-innerHTML', () => {
        expect(sources.length).toBeGreaterThan(100);
        for (const part of ['/core/', '/stage/', '/wrappers/', '/ui/', '/i18n/']) expect(sources.some(f => f.includes(part)), part).toBe(true);
        const bad = /innerHTML|insertAdjacentHTML|outerHTML|document\.write|eval\(|new Function/;
        for (const f of sources) expect(bad.test(readFileSync(f, 'utf8')), f).toBe(false);
    });

    it('the one file that keeps gifts writes two named keys and one switch, and never looks at the link', () => {
        const f = sources.find(x => x.endsWith('ui/kept.ts'))!;
        const s = readFileSync(f, 'utf8');
        expect(s.match(/localStorage\.setItem\(/g)?.length).toBe(2);
        expect(s).toContain("const STORE_KEY = 'gift.kept';");
        expect(s).toContain("const SENT_KEY = 'gift.sent';");
        expect(s).toContain("const AUTO_KEY = 'gift.auto';");
        // The switch holds one fixed word and nothing else.
        expect(s).toContain("localStorage.setItem(AUTO_KEY, 'off');");
        // Storage is only ever touched through a key that is one of the two record constants, or the switch.
        expect(s.match(/localStorage\.\w+\(([^,)]+)/g)?.every(c => c.endsWith('(key') || c.endsWith('(AUTO_KEY'))).toBe(true);
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

    it('the file that keeps saved looks writes one named key, recipes only, and never looks at a gift or a wrapper', () => {
        const f = sources.find(x => x.endsWith('ui/looks.ts'))!;
        const s = readFileSync(f, 'utf8');
        expect(s).toContain("const LOOKS_KEY = 'gift.looks';");
        expect(s.match(/localStorage\.\w+\(([^,)]+)/g)?.every(c => c.endsWith('(LOOKS_KEY'))).toBe(true);
        expect(s.match(/localStorage\.setItem\(/g)?.length).toBe(1);
        // Whatever goes in or comes out has been through the recipe's own reader and writer.
        expect(s).toContain('canon(x) === x');
        expect(/location|\.hash\b|secret\b|\.sk\b|decodeFragment|encodeLink|\.link\b|address|sats|wrapper/i.test(s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))).toBe(false);
    });

    it('the file that keeps the take-home address writes one named key, and never looks at a gift or the link', () => {
        const f = sources.find(x => x.endsWith('ui/dest.ts'))!;
        const s = readFileSync(f, 'utf8');
        expect(s).toContain("const DEST_KEY = 'gift.dest';");
        expect(s.match(/localStorage\.\w+\(([^,)]+)/g)?.every(c => c.endsWith('(DEST_KEY'))).toBe(true);
        expect(s.match(/localStorage\.setItem\(/g)?.length).toBe(2);
        // What is written is the switch's one word, or a string that passed the shape.
        expect(s).toContain('localStorage.setItem(DEST_KEY, OFF);');
        expect(s).toContain('if (!SHAPE.test(v) || !keepsDest()) return false;');
        expect(/location|\.hash\b|secret\b|\.sk\b|decodeFragment|encodeLink|\.link\b|sats|wrapper|wish/i.test(s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))).toBe(false);
    });

    it('the file that keeps the giver\'s fee choice writes one named key and one fixed word', () => {
        const f = sources.find(x => x.endsWith('ui/prefs.ts'))!;
        const s = readFileSync(f, 'utf8');
        expect(s).toContain("const COVER_KEY = 'gift.cover';");
        expect(s.match(/localStorage\.\w+\(([^,)]+)/g)?.every(c => c.endsWith('(COVER_KEY'))).toBe(true);
        expect(s.match(/localStorage\.setItem\(/g)?.length).toBe(1);
        expect(s).toContain("localStorage.setItem(COVER_KEY, 'off');");
        expect(/location|\.hash\b|secret\b|\.sk\b|decodeFragment|encodeLink|\.link\b|address|sats|wrapper|wish/i.test(s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))).toBe(false);
    });

    it('no source file writes to storage except the language, the kept gifts, the favourites, the saved looks, the take-home address and the giver\'s fee choice, and none uses style attributes', () => {
        for (const f of sources) {
            const s = readFileSync(f, 'utf8');
            expect(/sessionStorage|indexedDB|document\.cookie/.test(s), f).toBe(false);
            if (!f.endsWith('i18n/index.ts') && !f.endsWith('ui/kept.ts') && !f.endsWith('ui/fav.ts') && !f.endsWith('ui/looks.ts') && !f.endsWith('ui/dest.ts') && !f.endsWith('ui/prefs.ts')) expect(/localStorage/.test(s), f).toBe(false);
            expect(/cssText|\bstyle:\s*['"`]|setAttribute\(\s*['"]style/.test(s), f).toBe(false);
            expect(/console\./.test(s), f).toBe(false);
        }
    });
});
