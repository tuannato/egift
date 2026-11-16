import { ART_VERSION } from './artVersion.gen';

/**
 * Where a wrapper's pictures are asked for. The names are fixed; the query carries the version of the pictures
 * (scripts/art-version.mjs), so that a wrapper drawn again is fetched again while every other stays in the
 * browser's cache. Everything that asks for a picture asks through here: two spellings of one address would be
 * two entries in that cache.
 */
const has = (id: string): boolean => Object.prototype.hasOwnProperty.call(ART_VERSION, id);

/** `?v=<version>`, or nothing for a wrapper without one. */
export const artQuery = (id: string): string => (has(id) ? `?v=${ART_VERSION[id]}` : '');

/** The folder of a wrapper's pictures. */
export const artBase = (id: string): string => `/wrappers/${id}/`;

/** One picture of a wrapper. */
export const artUrl = (id: string, file: string): string => artBase(id) + file + artQuery(id);

/** The small still of a wrapper, whole: for the picker, and for a shelf of few doors. */
export const thumbUrl = (id: string): string => `/thumbs/${id}.webp${artQuery(id)}`;

/** The middle of that still, sharper: what a door on the shelf shows (scripts/og-cards.mjs cuts it). */
export const doorUrl = (id: string): string => `/thumbs/door/${id}.webp${artQuery(id)}`;
