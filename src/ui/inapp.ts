const MARKERS = ['Zalo', 'FBAN', 'FBAV', 'FB_IAB', 'Instagram', 'Line/', 'MicroMessenger', 'TikTok', 'KAKAOTALK', 'Viber', 'Snapchat', 'Twitter', 'Telegram', '; wv)'];

/** True when the page runs inside another app's embedded browser. */
export function isInAppBrowser(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
    return MARKERS.some(m => ua.includes(m));
}

/**
 * The road to the Cashtab app from this device. On Android, where the app can be installed and takes the link
 * itself, it is asked to come back to the browser afterwards. Anywhere else the link ends on a page that passes the
 * payment to Cashtab Web, which refuses that request: so it is left out.
 */
export function appRoad(links: { readonly app: string; readonly appBack: string }, ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
    return /Android/i.test(ua) ? links.appBack : links.app;
}
