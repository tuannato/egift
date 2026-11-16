import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WRAPPERS, LOCK_WRAPPER } from './index';

/**
 * What a wrapper's art may cost a phone.
 *
 * A wrapper drawn from now on keeps to the rules below. The wrappers drawn before the rules existed are listed
 * with what they cost on 16 November 2026: each may get lighter and may never get heavier, and nothing may be
 * added to the list.
 */
const RULES = { filtered: 0, blended: 0, kB: 150, colours: 12, area: 5 } as const;

/** Wrappers older than the rules: files with a filter, uses of a blend mode, kB of art, summed layer area in canvases. */
const BEFORE: Readonly<Record<string, { filtered: number; blended: number; kB: number; area: number }>> = {
    lixi: { filtered: 6, blended: 11, kB: 106, area: 7.7 },
    mecha: { filtered: 1, blended: 5, kB: 105, area: 9.3 },
    signal: { filtered: 2, blended: 12, kB: 132, area: 10.7 },
    fold: { filtered: 0, blended: 0, kB: 146, area: 4.5 },
    cake: { filtered: 0, blended: 0, kB: 71, area: 3.8 },
    letter: { filtered: 8, blended: 5, kB: 183, area: 7.7 },
    inkwash: { filtered: 18, blended: 0, kB: 325, area: 5.5 },
    snowbox: { filtered: 0, blended: 0, kB: 51, area: 4.5 },
    fireworks: { filtered: 20, blended: 29, kB: 477, area: 8.8 },
    dopaper: { filtered: 0, blended: 0, kB: 482, area: 5.7 },
    lantern: { filtered: 13, blended: 6, kB: 158, area: 11.9 },
    bouquet: { filtered: 19, blended: 19, kB: 493, area: 6.5 },
    lace: { filtered: 3, blended: 0, kB: 250, area: 6.2 },
    cloudmoon: { filtered: 0, blended: 23, kB: 147, area: 3.6 },
    diploma: { filtered: 0, blended: 3, kB: 153, area: 4 },
    wreath: { filtered: 0, blended: 0, kB: 240, area: 5.3 },
    skyline: { filtered: 10, blended: 1, kB: 551, area: 10.5 },
    basket: { filtered: 0, blended: 0, kB: 228, area: 2.8 },
    latte: { filtered: 24, blended: 0, kB: 363, area: 7.4 },
    dawn: { filtered: 17, blended: 2, kB: 292, area: 8.5 },
    pumpkin: { filtered: 21, blended: 2, kB: 133, area: 7.3 },
    rangoli: { filtered: 20, blended: 10, kB: 437, area: 11.2 },
    paperbag: { filtered: 0, blended: 0, kB: 430, area: 5.8 },
    archmoon: { filtered: 2, blended: 4, kB: 358, area: 6.6 },
    lock: { filtered: 0, blended: 1, kB: 46, area: 3.4 },
};

function cost(id: string) {
    const def = [...WRAPPERS, LOCK_WRAPPER].find(w => w.id === id)!;
    const dir = `public/wrappers/${id}`;
    // A colourway's twin is its original with other colours: it is not counted twice.
    const texts = readdirSync(dir).filter(f => f.endsWith('.svg') && !f.startsWith('cw-')).map(f => readFileSync(`${dir}/${f}`, 'utf8'));
    return {
        filtered: texts.filter(t => /<filter\b/.test(t)).length,
        blended: texts.filter(t => /mix-blend-mode/.test(t)).length + def.layers.filter(l => l.blend !== undefined).length,
        kB: texts.reduce((s, t) => s + Buffer.byteLength(t), 0) / 1024,
        colours: new Set(texts.flatMap(t => (t.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? []).map(c => c.toUpperCase()))).size,
        // Every layer is its own picture in memory while a wrapper opens: their areas add up.
        area: def.layers.reduce((s, l) => s + l.box[2] * l.box[3], 0) / (def.size[0] * def.size[1]),
    };
}

describe('what a wrapper\'s art may cost', () => {
    it('the list of wrappers older than the rules is closed', () => {
        expect(Object.keys(BEFORE).sort()).toEqual(['archmoon', 'basket', 'bouquet', 'cake', 'cloudmoon', 'dawn', 'diploma', 'dopaper', 'fireworks', 'fold', 'inkwash', 'lace', 'lantern', 'latte', 'letter', 'lixi', 'lock', 'mecha', 'paperbag', 'pumpkin', 'rangoli', 'signal', 'skyline', 'snowbox', 'wreath']);
    });

    it('a wrapper older than the rules never gets heavier than it was', () => {
        for (const [id, was] of Object.entries(BEFORE)) {
            const now = cost(id);
            expect(now.filtered, `${id}: files with a filter`).toBeLessThanOrEqual(was.filtered);
            expect(now.blended, `${id}: blend modes`).toBeLessThanOrEqual(was.blended);
            expect(now.kB, `${id}: kB of art`).toBeLessThanOrEqual(was.kB);
            expect(now.area, `${id}: layer area`).toBeLessThanOrEqual(was.area);
        }
    });

    it('every other wrapper keeps to the rules: no filter, no blend mode, 150 kB, 12 colours, layers of 5 canvases in all', () => {
        const fresh = [...WRAPPERS, LOCK_WRAPPER].filter(w => !Object.prototype.hasOwnProperty.call(BEFORE, w.id));
        expect(fresh.map(w => w.id)).toEqual(expect.arrayContaining(['vinyl', 'bottle', 'seeds', 'crane', 'cradle', 'orbit']));
        for (const w of fresh) {
            const now = cost(w.id);
            expect(now.filtered, `${w.id}: files with a filter`).toBe(RULES.filtered);
            expect(now.blended, `${w.id}: blend modes`).toBe(RULES.blended);
            expect(now.kB, `${w.id}: kB of art`).toBeLessThanOrEqual(RULES.kB);
            expect(now.colours, `${w.id}: colours`).toBeLessThanOrEqual(RULES.colours);
            expect(now.area, `${w.id}: layer area`).toBeLessThanOrEqual(RULES.area);
        }
    });
});
