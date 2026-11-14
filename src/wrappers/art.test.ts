import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { WRAPPERS } from './index';
import { wrapperProblems } from '../stage/validate';
// @ts-expect-error plain JS module without types
import { sanitizeSvg } from '../../scripts/svg-allow.mjs';
// @ts-expect-error plain JS module without types
import { svgFiles } from '../../scripts/wrap-art.mjs';

const PUBLIC = join(process.cwd(), 'public', 'wrappers');

describe('wrapper art', () => {
    it('every-svg-is-re-serialised-through-the-allow-list', () => {
        const files: string[] = svgFiles(PUBLIC);
        expect(files.length).toBeGreaterThan(0);
        for (const f of files) {
            const text = readFileSync(f, 'utf8');
            const out = sanitizeSvg(text) as { svg: string | undefined; problems: string[] };
            expect(out.problems, f).toEqual([]);
            expect(out.svg, f).toBe(text);
        }
    });

    it('every wrapper is valid, names files that exist, and no SVG goes unnamed', () => {
        const named = new Set<string>();
        for (const w of WRAPPERS) {
            expect(wrapperProblems(w), w.id).toEqual([]);
            for (const l of w.layers) {
                const p = join(PUBLIC, w.id, l.art);
                expect(existsSync(p), p).toBe(true);
                named.add(p);
            }
        }
        for (const f of svgFiles(PUBLIC) as string[]) expect(named.has(f), `${f} is not named by any wrapper`).toBe(true);
    });

    it('each SVG is under 60 kB', () => {
        for (const f of svgFiles(PUBLIC) as string[]) expect(statSync(f).size, f).toBeLessThan(60 * 1024);
    });

    it('the gate refuses what it must', () => {
        const wrap = (inner: string): string => `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
        const refused = [
            '<script>1</script>',
            '<foreignObject/>',
            '<a href="x"/>',
            '<image href="x.png"/>',
            '<use href="#a"/>',
            '<text>hi</text>',
            '<animate attributeName="x"/>',
            '<set attributeName="x"/>',
            '<animateTransform/>',
            '<rect width="1" height="1" onclick="x()"/>',
            '<rect width="1" height="1" fill="url(https://x.example/a.svg#b)"/>',
            '<rect width="1" height="1" href="x"/>',
            '<style>*{}</style>',
        ];
        for (const r of refused) expect((sanitizeSvg(wrap(r)) as { svg: unknown }).svg, r).toBeUndefined();
        const ok = '<defs><linearGradient id="g"><stop offset="0"/></linearGradient><clipPath id="c"><rect width="1" height="1"/></clipPath><mask id="m"><circle r="1"/></mask></defs><g><path d="M0 0L1 1"/><ellipse rx="1" ry="1"/><line x1="0" y1="0" x2="1" y2="1"/><polygon points="0,0 1,1 2,0"/><polyline points="0,0 1,1"/><radialGradient id="r"/></g>';
        expect((sanitizeSvg(wrap(ok)) as { problems: string[] }).problems).toEqual([]);
    });

    it('the gate refuses cost attacks and never throws', () => {
        const wrap = (inner: string): string => `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
        const refuse = (inner: string): void => expect((sanitizeSvg(wrap(inner)) as { svg: unknown }).svg, inner).toBeUndefined();
        const accept = (inner: string): void => expect((sanitizeSvg(wrap(inner)) as { problems: string[] }).problems, inner).toEqual([]);
        refuse('<filter id="f"><feGaussianBlur stdDeviation="100000"/></filter>');
        refuse('<filter id="f"><feGaussianBlur stdDeviation="4 41"/></filter>');
        refuse('<filter id="f"><feGaussianBlur stdDeviation="abc"/></filter>');
        refuse('<filter id="f"><feMorphology radius="100000"/></filter>');
        refuse('<filter id="f"><feMorphology radius="9"/></filter>');
        refuse('<filter id="f" x="-200%" y="0" width="100%" height="100%"/>');
        refuse('<filter id="f" x="0" y="0" width="200000%" height="100%"/>');
        refuse('<filter id="f" x="0%" y="0%" width="100%" height="301%"/>');
        refuse('<filter id="f" filterUnits="userSpaceOnUse" x="0" y="0" width="5000" height="10"/>');
        refuse('<filter id="f" x="-2" y="0" width="1" height="1"/>');
        refuse('<filter id="f" x="0" y="0" width="4" height="1"/>');
        accept('<filter id="f" x="-50%" y="-50%" width="300%" height="300%"><feGaussianBlur stdDeviation="40"/><feMorphology radius="8"/></filter>');
        accept('<filter id="f" filterUnits="userSpaceOnUse" x="-30" y="-20" width="420" height="490"><feGaussianBlur stdDeviation="3.2 40"/></filter>');
        accept('<filter id="f" x="-0.5" y="-0.5" width="2" height="2"/>');
        // numeric references must be valid code points: refused, not thrown
        for (const ref of ['&#9999999;', '&#x110000;', '&#0;', '&#xD800;', '&#x0;']) {
            refuse(`<rect width="1" height="1" fill="a${ref}"/>`);
        }
        accept('<rect width="1" height="1" id="a&#65;"/>');
        for (const junk of [undefined, null, 5, {}, [], 'x'.repeat(10000), '<svg xmlns="http://www.w3.org/2000/svg">', '\u0000']) {
            expect(() => sanitizeSvg(junk as never)).not.toThrow();
            expect((sanitizeSvg(junk as never) as { svg: unknown }).svg).toBeUndefined();
        }
    });
});
