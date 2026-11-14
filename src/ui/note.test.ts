import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveKey, newSecret } from '../core';
import { noteParams, noteSvg } from './note';

describe('the note', () => {
    it('the-note-is-deterministic-and-never-derived-from-the-secret', () => {
        const a = deriveKey(newSecret()).address;
        const b = deriveKey(newSecret()).address;
        // Same address, same note; another address, another note.
        expect(noteParams(a)).toEqual(noteParams(a));
        expect(noteParams(a)).not.toEqual(noteParams(b));
        const svgA = noteSvg(a).querySelectorAll('path');
        const svgA2 = noteSvg(a).querySelectorAll('path');
        expect([...svgA].map(p => p.getAttribute('d'))).toEqual([...svgA2].map(p => p.getAttribute('d')));
        // One input, the address string.
        expect(noteParams.length).toBe(1);
        expect(noteSvg.length).toBe(1);
        // The module cannot reach a secret: it imports nothing but the DOM builder.
        const src = readFileSync(join(process.cwd(), 'src/ui/note.ts'), 'utf8');
        const imports = [...src.matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)].map(m => m[1]);
        expect(imports).toEqual(['./dom']);
        expect(/core\/keys|core\/link|\bsecret\s*[:=(]|\bsk\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, ''))).toBe(false);
    });

    it('stays inside the drawing for any address', () => {
        for (const s of ['', 'x', 'ecash:qz8t0000000000000000000000000000005zx']) {
            const p = noteParams(s);
            expect(p.lobes).toBeGreaterThanOrEqual(5);
            expect(p.lines).toBeGreaterThanOrEqual(14);
            expect(noteSvg(s).querySelectorAll('path').length).toBe(p.lines + p.waves);
        }
    });
});
