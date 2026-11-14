const MARKERS = ['Zalo', 'FBAN', 'FBAV', 'FB_IAB', 'Instagram', 'Line/', 'MicroMessenger', 'TikTok', 'KAKAOTALK', 'Viber', 'Snapchat', 'Twitter', 'Telegram', '; wv)'];

/** True when the page runs inside another app's embedded browser. */
export function isInAppBrowser(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
    return MARKERS.some(m => ua.includes(m));
}
