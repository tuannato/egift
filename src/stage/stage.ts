/**
 * The renderer. It builds one `div.stage` of `img` layers with createElement
 * only, and moves them with 2D CSS transforms from `poseAt`. Translations are
 * percentages of each layer's own box, so nothing depends on the host's size
 * and resizing needs no observer.
 */
import './stage.css';
import type { Pose, StageClock, StageHandle, StageOptions, WrapperDef } from './format';
import { idleOffset, openLength, particlesAt, poseAt } from './timeline';
import { wrapperProblems } from './validate';

/** Length of the reduced-motion cross-fade: half fades out, the other half fades back in. */
const FADE_MS = 200;

const defaultClock = (): StageClock => ({
    now: () => performance.now(),
    raf: cb => requestAnimationFrame(() => cb()),
    caf: id => cancelAnimationFrame(id),
});

/** Round so transforms are stable strings (no 1e-7 noise). */
const r = (n: number): number => Math.round(n * 10000) / 10000;

function transformOf(p: Pose, boxW: number, boxH: number): string {
    return `translate(${r((p.x / boxW) * 100)}%, ${r((p.y / boxH) * 100)}%) rotate(${r(p.turn)}deg) scale(${r(p.sx)}, ${r(p.sy)})`;
}

/** Put a wrapper on the stage inside `host` (the stage fills `host`'s width, keeps the wrapper's aspect ratio). */
/** The most a layer of depth 1 shifts for parallax, in wrapper units. */
const PARALLAX_UNITS = 9;

export function mountStage(host: HTMLElement, def: WrapperDef, opts: StageOptions): StageHandle {
    const problems = wrapperProblems(def);
    if (problems.length > 0) {
        throw new Error(`This wrapper cannot be shown: ${problems.join(' ')}`);
    }
    // Art loads from this origin only: no scheme, no protocol-relative URL.
    if (typeof opts.assetBase !== 'string' || /^[a-z][a-z0-9+.-]*:/i.test(opts.assetBase) || opts.assetBase.startsWith('//') || opts.assetBase.includes('\\')) {
        throw new Error('assetBase must be a path on this origin, such as /wrappers/lixi/.');
    }
    const base = opts.assetBase === '' || opts.assetBase.endsWith('/') ? opts.assetBase : `${opts.assetBase}/`;

    const doc = host.ownerDocument;
    const clock = opts.clock ?? defaultClock();
    const [W, H] = def.size;
    const len = openLength(def);
    const reduced = opts.reducedMotion;
    const hasIdle = !reduced && (def.idle?.length ?? 0) > 0;
    const hasAfter = !reduced && (def.afterglow?.length ?? 0) > 0;
    const hasDepth = !reduced && def.layers.some(l => (l.depth ?? 0) > 0);

    const root = doc.createElement('div');
    root.className = 'stage';
    root.style.setProperty('aspect-ratio', `${W} / ${H}`);
    root.style.setProperty('background', def.backdrop);

    // A layer used by a scatter step is only a source of copies: it never shows itself.
    const scatterLayers = new Set<string>();
    for (const s of def.open) if (s.kind === 'scatter') scatterLayers.add(s.layer);

    const boxes = new Map<string, readonly [number, number, number, number]>();
    const origins = new Map<string, string>();
    const arts = new Map<string, string>();
    const blends = new Map<string, string>();
    const els = new Map<string, HTMLImageElement>();

    function makeImg(layerId: string, cls: string): HTMLImageElement {
        const box = boxes.get(layerId)!;
        const img = doc.createElement('img');
        img.className = cls;
        img.src = base + arts.get(layerId)!;
        img.alt = '';
        img.draggable = false;
        img.decoding = 'async';
        img.style.setProperty('left', `${r((box[0] / W) * 100)}%`);
        img.style.setProperty('top', `${r((box[1] / H) * 100)}%`);
        img.style.setProperty('width', `${r((box[2] / W) * 100)}%`);
        img.style.setProperty('height', `${r((box[3] / H) * 100)}%`);
        img.style.setProperty('transform-origin', origins.get(layerId)!);
        const blend = blends.get(layerId);
        if (blend !== undefined) img.style.setProperty('mix-blend-mode', blend);
        return img;
    }

    for (const layer of def.layers) {
        boxes.set(layer.id, layer.box);
        const o = layer.origin ?? [0.5, 0.5];
        origins.set(layer.id, `${r(o[0] * 100)}% ${r(o[1] * 100)}%`);
        arts.set(layer.id, layer.art);
        if (layer.blend !== undefined) blends.set(layer.id, layer.blend);
        const img = makeImg(layer.id, 'stage-layer');
        if (scatterLayers.has(layer.id)) img.style.setProperty('opacity', '0');
        els.set(layer.id, img);
        root.appendChild(img);
    }
    host.appendChild(root);

    const pool = new Map<string, HTMLImageElement[]>();
    let animating = false;

    function setWillChange(on: boolean): void {
        animating = on;
        const v = on ? 'transform, opacity' : '';
        for (const el of els.values()) el.style.setProperty('will-change', v);
        for (const list of pool.values()) for (const el of list) el.style.setProperty('will-change', v);
    }

    let state: 'closed' | 'opening' | 'open' = 'closed';
    let pos = 0; // ms into the opening
    let mode: 'play' | 'fade' | null = null;
    let fadeT = 0;
    let fadeSwapped = false;
    let last = 0;
    let rafId = 0;
    let revealed = false;
    let everOpened = false; // idle stops for good once open() has been called
    let destroyed = false;
    let promise: Promise<void> | null = null;
    let resolveOpen: (() => void) | null = null;

    const hidden = (): boolean => doc.hidden === true;
    let onScreen = true; // until the observer says otherwise

    // Parallax: where the viewer "is", -1..1 on each axis, eased toward its target.
    const look = { x: 0, y: 0, tx: 0, ty: 0 };
    const lookMoving = (): boolean => Math.abs(look.tx - look.x) > 0.002 || Math.abs(look.ty - look.y) > 0.002;

    function paint(ms: number): void {
        const poses = poseAt(def, ms);
        const idle =
            state === 'closed' && hasIdle && !everOpened
                ? idleOffset(def, clock.now(), 'idle')
                : state === 'open' && hasAfter
                  ? idleOffset(def, clock.now(), 'afterglow')
                  : {};
        for (const layer of def.layers) {
            if (scatterLayers.has(layer.id)) continue;
            const p = poses[layer.id]!;
            const o = idle[layer.id];
            const el = els.get(layer.id)!;
            const d = hasDepth ? (layer.depth ?? 0) : 0;
            const base: Pose = d > 0 ? { ...p, x: p.x - look.x * d * PARALLAX_UNITS, y: p.y - look.y * d * PARALLAX_UNITS } : p;
            const shown: Pose = o
                ? { ...base, x: base.x + (o.x ?? 0), y: base.y + (o.y ?? 0), turn: p.turn + (o.turn ?? 0), sx: p.sx + (o.sx ?? 0), sy: p.sy + (o.sy ?? 0), opacity: p.opacity + (o.opacity ?? 0) }
                : base;
            const [, , bw, bh] = layer.box;
            el.style.setProperty('transform', transformOf(shown, bw, bh));
            el.style.setProperty('opacity', String(r(Math.min(1, Math.max(0, shown.opacity)))));
        }
        // Particles: pooled copies, created on demand.
        const used = new Map<string, number>();
        for (const part of particlesAt(def, ms)) {
            const step = def.open[part.step];
            if (!step || step.kind !== 'scatter') continue;
            const id = step.layer;
            const idx = used.get(id) ?? 0;
            used.set(id, idx + 1);
            let list = pool.get(id);
            if (!list) pool.set(id, (list = []));
            let el = list[idx];
            if (!el) {
                el = makeImg(id, 'stage-particle');
                if (animating) el.style.setProperty('will-change', 'transform, opacity');
                const src = els.get(id)!;
                root.insertBefore(el, src.nextSibling);
                list[idx] = el;
            }
            const [, , bw, bh] = boxes.get(id)!;
            el.style.setProperty('display', 'block');
            el.style.setProperty('transform', transformOf(part.pose, bw, bh));
            el.style.setProperty('opacity', String(r(part.pose.opacity)));
        }
        for (const [id, list] of pool) {
            const n = used.get(id) ?? 0;
            for (let i = n; i < list.length; i += 1) list[i]!.style.setProperty('display', 'none');
        }
    }

    function reveal(): void {
        if (revealed) return;
        revealed = true;
        opts.onReveal?.();
    }

    /** Resolve a pending open(). The promise is kept (so a second open() returns the same one) unless `forget`. */
    function settle(forget = false): void {
        const done = resolveOpen;
        resolveOpen = null;
        if (forget) promise = null;
        done?.();
    }

    function cancelLoop(): void {
        if (rafId !== 0) clock.caf(rafId);
        rafId = 0;
    }

    function wantsLoop(): boolean {
        if (destroyed || hidden()) return false;
        // Off-screen, only the endless loops (idle, afterglow, parallax) rest; a playing opening finishes.
        if (!onScreen && mode === null) return false;
        return mode !== null || (state === 'closed' && hasIdle && !everOpened) || (state === 'open' && hasAfter) || (hasDepth && lookMoving());
    }

    function schedule(): void {
        if (rafId !== 0 || !wantsLoop()) return;
        if (!animating) setWillChange(true);
        rafId = clock.raf(tick);
    }

    function stopLoop(): void {
        cancelLoop();
        if (animating) setWillChange(false);
    }

    function finish(): void {
        mode = null;
        stopLoop();
        root.style.removeProperty('opacity');
        pos = len;
        state = 'open';
        paint(len);
        reveal();
        settle();
        schedule(); // the afterglow, if the wrapper has one
    }

    function tick(): void {
        rafId = 0;
        if (destroyed) return;
        const now = clock.now();
        const dt = Math.max(0, now - last);
        last = now;
        if (hasDepth) {
            const k = Math.min(1, dt / 120); // ease toward the target, frame-rate independent enough
            look.x += (look.tx - look.x) * k;
            look.y += (look.ty - look.y) * k;
        }
        if (mode === 'play') {
            pos = Math.min(len, pos + dt);
            if (pos >= len) {
                finish();
                return;
            }
            paint(pos);
            if (pos >= def.revealAt) reveal();
        } else if (mode === 'fade') {
            fadeT += dt;
            if (fadeT >= FADE_MS) {
                finish();
                return;
            }
            const half = FADE_MS / 2;
            if (fadeT >= half && !fadeSwapped) {
                fadeSwapped = true;
                pos = len;
                paint(len);
                reveal();
            }
            const o = fadeT < half ? 1 - fadeT / half : (fadeT - half) / half;
            root.style.setProperty('opacity', String(r(o)));
        } else {
            paint(pos); // idle sway, the afterglow once open, or parallax settling
        }
        schedule();
    }

    function onVisibility(): void {
        if (destroyed) return;
        if (hidden()) {
            cancelLoop(); // time spent hidden is not played
        } else {
            last = clock.now();
            schedule();
        }
    }
    doc.addEventListener('visibilitychange', onVisibility);

    // Rest the endless loops while the stage is scrolled out of view (several stages may be mounted at once).
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
        observer = new IntersectionObserver(entries => {
            const e = entries[entries.length - 1];
            if (destroyed || !e || e.isIntersecting === onScreen) return;
            onScreen = e.isIntersecting;
            if (onScreen) {
                last = clock.now();
                schedule();
            } else if (mode === null) {
                cancelLoop();
            }
        });
        observer.observe(root);
    }

    // The pointer anywhere on the page (the frame may cover the stage with a
    // transparent button) and, where the browser gives it without a prompt, the
    // phone's tilt. Both only set a target; the frame loop eases toward it.
    const win = doc.defaultView;
    function lookAt(x: number, y: number): void {
        look.tx = Math.max(-1, Math.min(1, x));
        look.ty = Math.max(-1, Math.min(1, y));
        if (!destroyed && lookMoving()) {
            if (rafId === 0) last = clock.now();
            schedule();
        }
    }
    function onPointer(e: PointerEvent): void {
        const b = root.getBoundingClientRect();
        if (b.width <= 0 || b.height <= 0) return;
        lookAt((e.clientX - (b.left + b.width / 2)) / b.width, (e.clientY - (b.top + b.height / 2)) / b.height);
    }
    function onTilt(e: DeviceOrientationEvent): void {
        if (e.gamma === null || e.beta === null) return;
        lookAt(e.gamma / 25, (e.beta - 45) / 25); // a phone held at ~45°, ±25° of tilt
    }
    if (hasDepth && win) {
        win.addEventListener('pointermove', onPointer, { passive: true });
        win.addEventListener('deviceorientation', onTilt, { passive: true });
    }

    paint(0);
    schedule();

    const handle: StageHandle = {
        get state() {
            return state;
        },
        open(): Promise<void> {
            if (promise) return promise;
            if (destroyed || state === 'open') return Promise.resolve();
            everOpened = true;
            state = 'opening';
            promise = new Promise<void>(res => {
                resolveOpen = res;
            });
            const p = promise;
            cancelLoop();
            last = clock.now();
            if (reduced) {
                mode = 'fade';
                fadeT = 0;
                fadeSwapped = false;
                paint(0);
            } else {
                mode = 'play';
                if (pos >= len) {
                    finish();
                    return p;
                }
                paint(pos);
                if (pos >= def.revealAt) reveal();
            }
            schedule();
            return p;
        },
        skip(): void {
            if (destroyed) return;
            everOpened = true;
            finish();
        },
        seek(ms: number): void {
            if (destroyed) return;
            mode = null;
            stopLoop();
            root.style.removeProperty('opacity');
            const t = Number.isNaN(ms) ? 0 : Math.min(len, Math.max(0, ms));
            pos = t;
            state = t >= len ? 'open' : t <= 0 ? 'closed' : 'opening';
            paint(t);
            if (t >= def.revealAt) reveal();
            settle(true);
            last = clock.now();
            schedule();
        },
        destroy(): void {
            if (destroyed) return;
            destroyed = true;
            mode = null;
            cancelLoop();
            doc.removeEventListener('visibilitychange', onVisibility);
            observer?.disconnect();
            if (hasDepth && win) {
                win.removeEventListener('pointermove', onPointer);
                win.removeEventListener('deviceorientation', onTilt);
            }
            root.remove();
            pool.clear();
            els.clear();
            settle(true);
        },
    };
    return handle;
}
