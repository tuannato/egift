import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WRAPPERS, LOCK_WRAPPER } from './index';
import { ART_VERSION } from './artVersion.gen';
import { artQuery, artUrl, doorUrl, thumbUrl } from './artUrl';
// @ts-expect-error a plain script, without types
import { source, versions } from '../../scripts/art-version.mjs';

describe('the version of each wrapper\'s pictures', () => {
    it('the written file is the one the pictures on disk give (run: node scripts/art-version.mjs)', () => {
        expect(readFileSync('src/wrappers/artVersion.gen.ts', 'utf8')).toBe(source());
        expect(ART_VERSION).toEqual(versions());
    });

    it('every wrapper on the shelf has its still, whole and cut for a door', () => {
        for (const w of WRAPPERS) {
            expect(existsSync(`public/thumbs/${w.id}.webp`), w.id).toBe(true);
            expect(existsSync(`public/thumbs/door/${w.id}.webp`), w.id).toBe(true);
        }
    });

    it('every wrapper has one, short and plain', () => {
        for (const w of [...WRAPPERS, LOCK_WRAPPER]) expect(ART_VERSION[w.id], w.id).toMatch(/^[a-f0-9]{8}$/);
    });

    it('a picture is asked for under its fixed name, the version after it; an unknown wrapper gets none', () => {
        expect(artUrl('crane', 'body.svg')).toBe(`/wrappers/crane/body.svg?v=${ART_VERSION.crane}`);
        expect(thumbUrl('crane')).toBe(`/thumbs/crane.webp?v=${ART_VERSION.crane}`);
        expect(doorUrl('crane')).toBe(`/thumbs/door/crane.webp?v=${ART_VERSION.crane}`);
        expect(artQuery('constructor')).toBe('');
        expect(artQuery('nothing')).toBe('');
    });
});
