import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHRONIK_HOSTS } from '../core';
import { TOKEN_ICON_HOST } from './tokens';

const HOSTS = ['chronik.e.cash', 'chronik-native1.fabien.cash', 'chronik-native2.fabien.cash', 'chronik-native3.fabien.cash', 'chronik.pay2stay.com', 'chronik1.ecashlive.net'];

describe('public/_headers', () => {
    const text = readFileSync(join(process.cwd(), 'public/_headers'), 'utf8');
    const csp = text.split('\n').find(l => l.trim().startsWith('Content-Security-Policy:'))!;
    const directives = Object.fromEntries(
        csp
            .replace(/^\s*Content-Security-Policy:\s*/, '')
            .split(';')
            .map(d => d.trim().split(/\s+/))
            .filter(d => d[0])
            .map(d => [d[0], d.slice(1)]),
    );

    it('csp-names-every-chronik-host-and-no-other', () => {
        const want = ["'self'", ...HOSTS.map(h => 'https://' + h), ...HOSTS.map(h => 'wss://' + h)].sort();
        expect([...directives['connect-src']].sort()).toEqual(want);
        if (CHRONIK_HOSTS.length > 0) expect(CHRONIK_HOSTS.map(u => new URL(u).host).sort()).toEqual([...HOSTS].sort());
    });

    it('pictures come from the page itself and from the one token icon host', () => {
        expect(directives['img-src']).toEqual(["'self'", TOKEN_ICON_HOST]);
    });

    it('forbids inline styles and scripts and framing', () => {
        expect(directives['style-src']).toEqual(["'self'"]);
        expect(directives['script-src']).toEqual(["'self'", "'wasm-unsafe-eval'"]);
        expect(directives['frame-ancestors']).toEqual(["'none'"]);
        expect(directives['form-action']).toEqual(["'none'"]);
    });

    it('caches the document never and assets forever, on separate paths', () => {
        expect(text).toMatch(/\n\/\n\s+Cache-Control: no-store/);
        expect(text).toMatch(/\n\/assets\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
        const star = text.split(/\n(?=\S)/).find(b => b.startsWith('/*'))!;
        expect(star).not.toContain('Cache-Control');
    });
});
