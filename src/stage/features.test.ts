import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WrapperDef } from './format';
import { mountStage } from './stage';
import { idleOffset } from './timeline';
import { wrapperProblems } from './validate';
import { fakeClock } from './testkit';

const BASE = '/w/';
/** A small second fixture: a blended glow, an opacity idle, an afterglow, a credit. */
const GLOW: WrapperDef = {
    id: 'glow',
    name: { vi: 'Ánh sáng', en: 'Glow' },
    credit: 'Studio X',
    size: [360, 450],
    backdrop: '#000000',
    layers: [
        { id: 'base', art: 'base.svg', box: [0, 0, 360, 450] },
        { id: 'halo', art: 'halo.svg', box: [0, 0, 360, 450], blend: 'screen', start: { opacity: 0.6 } },
    ],
    idle: [{ layer: 'halo', field: 'opacity', amp: 0.3, period: 2000 }],
    afterglow: [{ layer: 'halo', field: 'opacity', amp: 0.5, period: 1500 }],
    open: [{ kind: 'move', layer: 'base', at: 0, dur: 400, to: { y: -10 } }],
    revealAt: 200,
};
const bad = (mutate: (d: any) => void): string[] => {
    const d = JSON.parse(JSON.stringify(GLOW));
    mutate(d);
    return wrapperProblems(d);
};
const hosts: HTMLElement[] = [];
function setup(def: WrapperDef = GLOW, reducedMotion = false) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    const clock = fakeClock();
    const stage = mountStage(host, def, { assetBase: BASE, reducedMotion, clock });
    const halo = host.querySelectorAll('img.stage-layer')[1] as HTMLImageElement;
    return { host, clock, stage, halo };
}
const setHidden = (v: boolean): void => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
    document.dispatchEvent(new Event('visibilitychange'));
};
afterEach(() => {
    setHidden(false);
    for (const h of hosts.splice(0)) h.remove();
});

describe('layer blend', () => {
    it('the fixture is valid', () => expect(wrapperProblems(GLOW)).toEqual([]));
    it('sets mix-blend-mode on that layer only', () => {
        const { host } = setup();
        const imgs = host.querySelectorAll('img.stage-layer') as NodeListOf<HTMLImageElement>;
        expect(imgs[1]!.style.getPropertyValue('mix-blend-mode')).toBe('screen');
        expect(imgs[0]!.style.getPropertyValue('mix-blend-mode')).toBe('');
    });
    it('the validator rejects an unknown blend', () => {
        for (const b of ['difference', 'normal', 'SCREEN', '', 7, null, 'screen; x']) {
            expect(bad(d => (d.layers[1].blend = b)).length, String(b)).toBeGreaterThan(0);
        }
        for (const b of ['screen', 'multiply', 'overlay', 'lighten']) expect(bad(d => (d.layers[1].blend = b))).toEqual([]);
    });
});

describe('opacity idle', () => {
    it('is applied around the start value and clamped to 0..1', () => {
        const { halo, clock } = setup();
        const seen: number[] = [];
        for (let i = 0; i < 40; i += 1) {
            clock.step(50);
            seen.push(Number(halo.style.getPropertyValue('opacity')));
        }
        expect(Math.max(...seen)).toBeGreaterThan(0.7);
        expect(Math.min(...seen)).toBeLessThan(0.5);
        for (const v of seen) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
        }
        // clamp: start 0.9 with amp 0.5 never exceeds 1
        const hi = { ...GLOW, layers: [GLOW.layers[0]!, { ...GLOW.layers[1]!, start: { opacity: 0.9 } }], idle: [{ layer: 'halo', field: 'opacity' as const, amp: 0.5, period: 1200 }] };
        const b = setup(hi);
        for (let i = 0; i < 40; i += 1) {
            b.clock.step(30);
            expect(Number(b.halo.style.getPropertyValue('opacity'))).toBeLessThanOrEqual(1);
        }
    });
    it('idleOffset returns an additive opacity offset', () => {
        expect(idleOffset(GLOW, 500, 'idle').halo!.opacity).toBeCloseTo(0.3);
    });
    it('the validator limits opacity amp to +-0.5', () => {
        expect(bad(d => (d.idle[0].amp = 0.51))).not.toEqual([]);
        expect(bad(d => (d.idle[0].amp = -0.51))).not.toEqual([]);
        expect(bad(d => (d.idle[0].amp = 0.5))).toEqual([]);
        expect(bad(d => (d.afterglow[0].amp = 0.6))).not.toEqual([]);
        expect(bad(d => (d.idle[0].field = 'x'))).toEqual([]); // x may swing wider
        expect(bad(d => { d.idle[0].field = 'x'; d.idle[0].amp = 40; })).toEqual([]);
    });
});

describe('afterglow', () => {
    it('does not run while closed or opening, runs once open', async () => {
        const g: WrapperDef = { ...GLOW, idle: undefined };
        const { clock, stage, halo } = setup(g);
        expect(clock.pending()).toBe(false); // closed, no idle: no frame loop
        const p = stage.open();
        clock.step(100);
        expect(stage.state).toBe('opening');
        clock.step(100);
        const during = halo.style.getPropertyValue('opacity');
        expect(during).toBe('0.6'); // untouched by the afterglow while opening
        while (stage.state !== 'open') clock.step(50);
        await p;
        expect(clock.pending()).toBe(true);
        const a = halo.style.getPropertyValue('opacity');
        clock.step(250);
        expect(halo.style.getPropertyValue('opacity')).not.toBe(a);
        stage.destroy();
        expect(clock.pending()).toBe(false);
    });
    it('runs after skip() and after seek(Infinity)', () => {
        const a = setup();
        a.stage.skip();
        expect(a.clock.pending()).toBe(true);
        const b = setup();
        b.stage.seek(Infinity);
        expect(b.clock.pending()).toBe(true);
        const c = setup();
        c.stage.seek(100); // frozen mid-opening: nothing runs
        expect(c.clock.pending()).toBe(false);
    });
    it('never runs under reduced motion', async () => {
        const { clock, stage, halo } = setup(GLOW, true);
        expect(clock.pending()).toBe(false);
        const p = stage.open();
        while (clock.pending()) clock.step(16);
        await p;
        expect(stage.state).toBe('open');
        expect(clock.pending()).toBe(false);
        const v = halo.style.getPropertyValue('opacity');
        stage.seek(Infinity);
        expect(clock.pending()).toBe(false);
        expect(halo.style.getPropertyValue('opacity')).toBe(v);
    });
    it('pauses while the document is hidden and resumes', () => {
        const { clock, stage } = setup();
        stage.skip();
        expect(clock.pending()).toBe(true);
        setHidden(true);
        expect(clock.pending()).toBe(false);
        setHidden(false);
        expect(clock.pending()).toBe(true);
        stage.destroy();
    });
    it('the frame loop stops for a wrapper without afterglow', async () => {
        const g: WrapperDef = { ...GLOW, idle: undefined, afterglow: undefined };
        const { clock, stage } = setup(g);
        const p = stage.open();
        while (clock.pending()) clock.step(50);
        await p;
        expect(stage.state).toBe('open');
        expect(clock.pending()).toBe(false);
        // with only an idle loop, the loop also ends at open
        const h = setup({ ...GLOW, afterglow: undefined });
        expect(h.clock.pending()).toBe(true);
        h.stage.skip();
        expect(h.clock.pending()).toBe(false);
    });
    it('the validator reads afterglow like idle', () => {
        expect(bad(d => (d.afterglow[0].period = 1000))).not.toEqual([]);
        expect(bad(d => (d.afterglow[0].layer = 'ghost'))).not.toEqual([]);
        expect(bad(d => (d.afterglow[0].extra = 1))).not.toEqual([]);
        expect(bad(d => (d.afterglow = 'x'))).not.toEqual([]);
    });
});

describe('credit', () => {
    it('is optional and validated like a name', () => {
        expect(bad(d => delete d.credit)).toEqual([]);
        expect(bad(d => (d.credit = ''))).not.toEqual([]);
        expect(bad(d => (d.credit = 'x'.repeat(41)))).not.toEqual([]);
        expect(bad(d => (d.credit = 'javascript:alert(1)'))).not.toEqual([]);
        expect(bad(d => (d.credit = '<b>x</b>'))).not.toEqual([]);
        expect(bad(d => (d.credit = () => 'x'))).not.toEqual([]);
        expect(bad(d => (d.credit = 5))).not.toEqual([]);
    });
});

describe('parallax depth', () => {
    const PAR: WrapperDef = {
        id: 'par',
        name: { vi: 'a', en: 'a' },
        size: [360, 450],
        backdrop: '#000000',
        layers: [
            { id: 'far', art: 'far.svg', box: [0, 0, 360, 450], depth: 1 },
            { id: 'near', art: 'near.svg', box: [0, 0, 360, 450] },
            { id: 'zero', art: 'zero.svg', box: [0, 0, 360, 450], depth: 0 },
        ],
        open: [{ kind: 'move', layer: 'near', at: 0, dur: 400, to: { y: -10 } }],
        revealAt: 200,
    };
    const rect = { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) };
    const spy = (): ReturnType<typeof vi.spyOn> => vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);
    const point = (x: number, y: number): void => {
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }));
    };
    const tf = (host: HTMLElement, i: number): string => (host.querySelectorAll('img.stage-layer')[i] as HTMLImageElement).style.getPropertyValue('transform');
    afterEach(() => vi.restoreAllMocks());

    it('the wrapper is valid and depth is bounded 0..1', () => {
        expect(wrapperProblems(PAR)).toEqual([]);
        const b = (v: unknown): string[] => {
            const d = JSON.parse(JSON.stringify(PAR));
            d.layers[0].depth = v;
            return wrapperProblems(d);
        };
        for (const v of [-0.1, 1.1, NaN, Infinity, '1', null]) expect(b(v), String(v)).not.toEqual([]);
        for (const v of [0, 0.5, 1]) expect(b(v), String(v)).toEqual([]);
    });
    it('shifts only layers with depth > 0, eased toward the pointer, then the loop stops', () => {
        spy();
        const { host, clock, stage } = setup(PAR);
        expect(clock.pending()).toBe(false);
        point(100, 50); // right edge: target x = +0.5
        expect(clock.pending()).toBe(true);
        clock.step(16);
        const first = tf(host, 0);
        expect(first).not.toContain('translate(0%'); // moved a little
        expect(first).not.toContain('translate(-1.25%'); // but not all the way
        for (let i = 0; i < 100 && clock.pending(); i += 1) clock.step(16);
        expect(parseFloat(tf(host, 0).slice(10))).toBeCloseTo(-1.25, 1); // 0.5 * 9 / 360, settled within 0.002
        expect(tf(host, 1)).toContain('translate(0%, 0%)');
        expect(tf(host, 2)).toContain('translate(0%, 0%)');
        expect(clock.pending()).toBe(false); // settled
        stage.destroy();
    });
    it('is off under reduced motion', () => {
        spy();
        const add = vi.spyOn(window, 'addEventListener');
        const { host, clock, stage } = setup(PAR, true);
        expect(add).not.toHaveBeenCalledWith('pointermove', expect.anything(), expect.anything());
        point(100, 50);
        expect(clock.pending()).toBe(false);
        expect(tf(host, 0)).toContain('translate(0%, 0%)');
        stage.destroy();
    });
    it('removes its listeners on destroy', () => {
        spy();
        const rem = vi.spyOn(window, 'removeEventListener');
        const { clock, stage } = setup(PAR);
        stage.destroy();
        expect(rem).toHaveBeenCalledWith('pointermove', expect.any(Function));
        expect(rem).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
        point(100, 50);
        expect(clock.pending()).toBe(false);
    });
});

describe('off-screen pause', () => {
    type Cb = (e: { isIntersecting: boolean }[]) => void;
    let cb: Cb | null = null;
    let disconnected = false;
    class FakeObserver {
        constructor(c: Cb) {
            cb = c;
        }
        observe(): void {}
        disconnect(): void {
            disconnected = true;
        }
    }
    afterEach(() => {
        vi.unstubAllGlobals();
        cb = null;
        disconnected = false;
    });
    it('rests the afterglow loop while off-screen and resumes on re-entry', () => {
        vi.stubGlobal('IntersectionObserver', FakeObserver);
        const { clock, stage } = setup({ ...GLOW, idle: undefined });
        stage.skip();
        expect(clock.pending()).toBe(true);
        cb!([{ isIntersecting: false }]);
        expect(clock.pending()).toBe(false);
        cb!([{ isIntersecting: true }]);
        expect(clock.pending()).toBe(true);
        stage.destroy();
        expect(disconnected).toBe(true);
    });
    it('rests the idle loop of a closed stage too, and an opening in progress finishes anyway', async () => {
        vi.stubGlobal('IntersectionObserver', FakeObserver);
        const { clock, stage } = setup();
        expect(clock.pending()).toBe(true);
        cb!([{ isIntersecting: false }]);
        expect(clock.pending()).toBe(false);
        const p = stage.open();
        expect(clock.pending()).toBe(true);
        while (clock.pending() && stage.state !== 'open') clock.step(50);
        await p;
        expect(stage.state).toBe('open');
        expect(clock.pending()).toBe(false); // still off-screen: the afterglow rests
        cb!([{ isIntersecting: true }]);
        expect(clock.pending()).toBe(true);
    });
    it('works without IntersectionObserver', () => {
        vi.stubGlobal('IntersectionObserver', undefined);
        const { clock, stage } = setup();
        expect(clock.pending()).toBe(true);
        stage.destroy();
    });
});

describe('validator cost bounds', () => {
    it('bounds box values', () => {
        expect(bad(d => (d.layers[0].box = [4001, 0, 10, 10]))).not.toEqual([]);
        expect(bad(d => (d.layers[0].box = [0, -4001, 10, 10]))).not.toEqual([]);
        expect(bad(d => (d.layers[0].box = [0, 0, 4001, 10]))).not.toEqual([]);
        expect(bad(d => (d.layers[0].box = [-4000, 4000, 4000, 4000]))).toEqual([]);
    });
    it('caps the total scatter copies at 120', () => {
        const scatter = (n: number) => ({ kind: 'scatter', layer: 'halo', at: 0, dur: 300, count: n, spread: 10, fall: 10 });
        expect(bad(d => (d.open = [scatter(40), scatter(40), scatter(40)]))).toEqual([]);
        expect(bad(d => (d.open = [scatter(40), scatter(40), scatter(40), scatter(1)]))).not.toEqual([]);
        expect(bad(d => (d.open = Array.from({ length: 80 }, () => scatter(40))))).not.toEqual([]);
    });
});
