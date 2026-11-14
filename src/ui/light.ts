/**
 * Where the hand is: the pointer, or the tilt of the phone, as two numbers
 * 0..1 written to `--lx` and `--ly` on the root. The foil of the amount
 * catches its light from them. One listener for the page; nothing is read
 * from layout in the handler; off when the viewer asks for reduced motion.
 */
let started = false;

export function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Tilt in degrees to 0..1: a phone held at about 45°, ±30° either way. Pure. */
export function tiltToLight(gamma: number, beta: number): [number, number] {
    return [clamp01(0.5 + gamma / 60), clamp01(0.5 + (beta - 45) / 60)];
}

export function startLight(): void {
    if (started || typeof window === 'undefined') return;
    try {
        if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch {
        return;
    }
    started = true;
    const root = document.documentElement;
    let x = 0.32;
    let y = 0.4;
    let raf = 0;
    const flush = (): void => {
        raf = 0;
        root.style.setProperty('--lx', x.toFixed(3));
        root.style.setProperty('--ly', y.toFixed(3));
    };
    const set = (nx: number, ny: number): void => {
        x = clamp01(nx);
        y = clamp01(ny);
        if (raf === 0 && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(flush);
    };
    window.addEventListener(
        'pointermove',
        e => {
            const w = window.innerWidth || 1;
            const hgt = window.innerHeight || 1;
            set(e.clientX / w, e.clientY / hgt);
        },
        { passive: true },
    );
    window.addEventListener(
        'deviceorientation',
        e => {
            if (e.gamma === null || e.beta === null) return;
            const [lx, ly] = tiltToLight(e.gamma, e.beta);
            set(lx, ly);
        },
        { passive: true },
    );
}
