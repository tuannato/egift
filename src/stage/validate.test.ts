import { describe, expect, it } from 'vitest';
import { wrapperProblems } from './validate';
import { FIXTURE as lixi } from './fixture';

const clone = (): any => JSON.parse(JSON.stringify(lixi));

describe('validator', () => {
    it('accepts the built-in wrapper', () => {
        expect(wrapperProblems(lixi)).toEqual([]);
    });

    it('a-wrapper-is-data-and-carries-no-script', () => {
        const bad = (mutate: (d: any) => void): string[] => {
            const d = clone();
            mutate(d);
            return wrapperProblems(d);
        };
        expect(bad(d => (d.extra = 1)).length).toBeGreaterThan(0);
        expect(bad(d => (d.layers[0].onload = 'x')).length).toBeGreaterThan(0);
        expect(bad(d => (d.open[0].extra = 1)).length).toBeGreaterThan(0);
        expect(bad(d => (d.name.fr = 'x')).length).toBeGreaterThan(0);
        expect(bad(d => (d.layers[0].start = { z: 1 })).length).toBeGreaterThan(0);
        expect(bad(d => (d.open[1].to.z = 1)).length).toBeGreaterThan(0);
        expect(bad(d => (d.open[0].kind = 'run')).length).toBeGreaterThan(0);
        expect(bad(d => (d.open[1].ease = 'wobble')).length).toBeGreaterThan(0);
        // function values, in every spot a value can sit
        expect(bad(d => (d.id = () => 'x')).length).toBeGreaterThan(0);
        expect(bad(d => (d.name.en = () => 'x')).length).toBeGreaterThan(0);
        expect(bad(d => (d.open[0].amp = () => 1)).length).toBeGreaterThan(0);
        expect(bad(d => (d.layers[0].box[0] = () => 1)).length).toBeGreaterThan(0);
        expect(bad(d => (d.onReveal = () => 1)).length).toBeGreaterThan(0);
        // getters are code, not data
        expect(bad(d => Object.defineProperty(d, 'revealAt', { get: () => 5, enumerable: true })).length).toBeGreaterThan(0);
        // script-ish strings in every string field
        const evil = ['javascript:alert(1)', 'JaVaScRiPt:x', 'data:text/html,x', '<script>x</script>', 'vbscript:x'];
        for (const e of evil) {
            expect(bad(d => (d.id = e)).length, `id ${e}`).toBeGreaterThan(0);
            expect(bad(d => (d.name.vi = e)).length, `name.vi ${e}`).toBeGreaterThan(0);
            expect(bad(d => (d.name.en = e)).length, `name.en ${e}`).toBeGreaterThan(0);
            expect(bad(d => (d.backdrop = e)).length, `backdrop ${e}`).toBeGreaterThan(0);
            expect(bad(d => (d.layers[0].id = e)).length, `layer id ${e}`).toBeGreaterThan(0);
            expect(bad(d => (d.layers[0].art = e)).length, `art ${e}`).toBeGreaterThan(0);
            expect(bad(d => (d.open[0].layer = e)).length, `step layer ${e}`).toBeGreaterThan(0);
            expect(bad(d => (d.open[0].kind = e)).length, `kind ${e}`).toBeGreaterThan(0);
            expect(bad(d => (d.open[1].ease = e)).length, `ease ${e}`).toBeGreaterThan(0);
            expect(bad(d => (d.idle[0].layer = e)).length, `idle layer ${e}`).toBeGreaterThan(0);
            expect(bad(d => (d.idle[0].field = e)).length, `idle field ${e}`).toBeGreaterThan(0);
        }
        // bad art names
        for (const art of ['../x.svg', 'x.svg?y', 'http://x.com/a.svg', '//evil/a.svg', '/a.svg', 'a/b.svg', 'a.svg#f', 'A.svg', 'a.png', '', 'a.svg\n', 'x%2e.svg']) {
            expect(bad(d => (d.layers[0].art = art)).length, `art ${JSON.stringify(art)}`).toBeGreaterThan(0);
        }
    });

    it('enforces the limits of the format', () => {
        const bad = (mutate: (d: any) => void): string[] => {
            const d = clone();
            mutate(d);
            return wrapperProblems(d);
        };
        expect(bad(d => (d.size = [50, 450]))).not.toEqual([]);
        expect(bad(d => (d.size = [360, 3000]))).not.toEqual([]);
        expect(bad(d => (d.name.vi = ''))).not.toEqual([]);
        expect(bad(d => (d.name.en = 'x'.repeat(41)))).not.toEqual([]);
        expect(bad(d => (d.layers = []))).not.toEqual([]);
        expect(bad(d => (d.layers = Array.from({ length: 25 }, (_, i) => ({ id: `l${i}`, art: 'a.svg', box: [0, 0, 1, 1] }))))).not.toEqual([]);
        expect(bad(d => (d.layers[1].id = 'back'))).not.toEqual([]);
        expect(bad(d => (d.layers[0].origin = [2, 0]))).not.toEqual([]);
        expect(bad(d => (d.layers[0].box[2] = Infinity))).not.toEqual([]);
        expect(bad(d => (d.layers[0].start = { opacity: 2 }))).not.toEqual([]);
        expect(bad(d => (d.layers[0].start = { sx: 5 }))).not.toEqual([]);
        expect(bad(d => (d.open[1].to.sx = NaN))).not.toEqual([]);
        expect(bad(d => (d.open[0].layer = 'ghost'))).not.toEqual([]);
        expect(bad(d => (d.open[0].at = -1))).not.toEqual([]);
        expect(bad(d => (d.open[0].dur = -1))).not.toEqual([]);
        expect(bad(d => (d.open[0].dur = 7000))).not.toEqual([]);
        expect(bad(d => (d.revealAt = 99999))).not.toEqual([]);
        expect(bad(d => (d.revealAt = -1))).not.toEqual([]);
        expect(bad(d => (d.open = Array.from({ length: 81 }, () => ({ kind: 'shake', layer: 'seal', at: 0, dur: 1, amp: 1, times: 1 }))))).not.toEqual([]);
        expect(bad(d => (d.open[4].count = 41))).not.toEqual([]);
        expect(bad(d => (d.open[4].count = 0))).not.toEqual([]);
        expect(bad(d => (d.open[0].times = 21))).not.toEqual([]);
        expect(bad(d => (d.idle[0].period = 1199))).not.toEqual([]);
        expect(bad(d => (d.backdrop = 'red'))).not.toEqual([]);
        expect(bad(d => (d.id = 'Has Space'))).not.toEqual([]);
    });

    it('reports several problems at once, as sentences', () => {
        const d = clone();
        d.id = 'BAD';
        d.size = [1, 1];
        d.revealAt = -5;
        const p = wrapperProblems(d);
        expect(p.length).toBeGreaterThanOrEqual(3);
        for (const line of p) expect(line.endsWith('.')).toBe(true);
    });

    it('the-validator-never-throws', () => {
        let seed = 12345;
        const rnd = (): number => {
            seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
            return seed / 4294967296;
        };
        const junk = (): unknown => {
            const pick = rnd();
            if (pick < 0.1) return null;
            if (pick < 0.2) return undefined;
            if (pick < 0.3) return NaN;
            if (pick < 0.4) return rnd() * 1e9 - 5e8;
            if (pick < 0.5) return 'x'.repeat(Math.floor(rnd() * 3) === 0 ? 100000 : 5);
            if (pick < 0.6) return () => 1;
            if (pick < 0.7) return [junk(), junk()];
            if (pick < 0.75) return Symbol('s');
            if (pick < 0.8) return 10n;
            if (pick < 0.9) return { a: junk() };
            return Infinity;
        };
        const mutate = (v: any, depth: number): void => {
            if (typeof v !== 'object' || v === null || depth > 6) return;
            const keys = Object.keys(v);
            if (keys.length === 0) return;
            const k = keys[Math.floor(rnd() * keys.length)]!;
            if (rnd() < 0.4) v[k] = junk();
            else if (rnd() < 0.3) delete v[k];
            else mutate(v[k], depth + 1);
        };
        for (let i = 0; i < 3000; i += 1) {
            const d = clone();
            const n = 1 + Math.floor(rnd() * 4);
            for (let j = 0; j < n; j += 1) mutate(d, 0);
            expect(() => wrapperProblems(d)).not.toThrow();
            expect(Array.isArray(wrapperProblems(d))).toBe(true);
            expect(() => wrapperProblems(junk())).not.toThrow();
        }
        // hostile shapes
        const cyc: any = { id: 'a' };
        cyc.self = cyc;
        cyc.layers = [cyc];
        cyc.open = cyc;
        const hostile: unknown[] = [
            cyc,
            [],
            [[]],
            'string',
            0,
            true,
            Object.create(null),
            new Proxy({}, { ownKeys() { throw new Error('boom'); } }),
            new Proxy({}, { getPrototypeOf() { throw new Error('boom'); } }),
            Object.defineProperty({}, 'id', { get() { throw new Error('boom'); }, enumerable: true }),
            new Array(1e6),
            { layers: new Array(1e6), open: new Array(1e6) },
        ];
        for (const h of hostile) {
            expect(() => wrapperProblems(h)).not.toThrow();
            expect(wrapperProblems(h).length).toBeGreaterThan(0);
        }
    });
});
