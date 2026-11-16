/**
 * Encode a PNG as WebP with the Chrome already used for stills (macOS `sips` cannot write WebP).
 * The picture is drawn on a canvas at the size asked for and read back; nothing is fetched from anywhere.
 *
 *   node scripts/to-webp.mjs <in.png> <out.webp> <width> <height> [quality 0..1]
 *
 * From another script, `toWebp` also takes the part of the picture's width to keep: [start, width] as fractions.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function toWebp(src, out, width, height, quality = 0.82, crop = null) {
    const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const dir = mkdtempSync(join(tmpdir(), 'gift-webp-'));
    try {
        const page = join(dir, 'page.html');
        // The picture rides in the page as a data URL: a canvas that drew a file from disk may not be read back.
        const png = 'data:image/png;base64,' + readFileSync(src).toString('base64');
        writeFileSync(
            page,
            `<!doctype html><pre id="out"></pre><script>
const img = new Image();
img.onload = () => {
    const c = document.createElement('canvas');
    c.width = ${Number(width)}; c.height = ${Number(height)};
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    const crop = ${JSON.stringify(crop)};
    // The crop is the part of the picture's width that is kept: where it starts and how wide, as fractions.
    if (crop) g.drawImage(img, img.naturalWidth * crop[0], 0, img.naturalWidth * crop[1], img.naturalHeight, 0, 0, c.width, c.height);
    else g.drawImage(img, 0, 0, c.width, c.height);
    document.getElementById('out').textContent = c.toDataURL('image/webp', ${Number(quality)});
};
img.src = ${JSON.stringify(png)};
</script>`,
        );
        const r = spawnSync(
            chrome,
            ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--host-resolver-rules=MAP * ~NOTFOUND', `--user-data-dir=${join(dir, 'profile')}`, '--virtual-time-budget=3000', '--dump-dom', pathToFileURL(page).href],
            { encoding: 'utf8', timeout: 60000, maxBuffer: 64 * 1024 * 1024 },
        );
        const m = /<pre id="out">data:image\/webp;base64,([A-Za-z0-9+/=]+)<\/pre>/.exec(r.stdout ?? '');
        if (!m) throw new Error('to-webp: Chrome wrote no picture' + (r.stderr ? ': ' + r.stderr.slice(0, 300) : ''));
        writeFileSync(out, Buffer.from(m[1], 'base64'));
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [, , src, out, w, h, q] = process.argv;
    toWebp(src, out, Number(w), Number(h), q === undefined ? undefined : Number(q));
    console.log(out);
}
