/**
 * Should this visit be spared what it has not asked for?
 *
 * The shop fetches the heavy piece (the signing code, well over a megabyte) at the first sign that a gift will be
 * made, so that the next step is ready. A browser that says its person asked to save data, or that the connection
 * is a slow one, is not sent it ahead of time: it is fetched when a gift is made or opened. A browser that says
 * nothing (Safari, Firefox) is treated as one that does not mind.
 */
export function sparesData(nav: unknown = typeof navigator === 'undefined' ? undefined : navigator): boolean {
    const c = (nav as { connection?: { saveData?: unknown; effectiveType?: unknown } } | undefined)?.connection;
    if (!c) return false;
    return c.saveData === true || c.effectiveType === 'slow-2g' || c.effectiveType === '2g' || c.effectiveType === '3g';
}
