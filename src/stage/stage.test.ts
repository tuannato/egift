import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountStage } from './stage';
import { openLength } from './timeline';
import { WRAPPER_LIMITS } from './format';
import { fakeClock } from './testkit';
import { FIXTURE as lixi } from './fixture';

const BASE = '/wrappers/lixi/';
const hosts: HTMLElement[] = [];
function setup(over: Partial<Parameters<typeof mountStage>[2]> = {}) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    const clock = fakeClock();
    const onReveal = vi.fn();
    const stage = mountStage(host, lixi, { assetBase: BASE, reducedMotion: false, onReveal, clock, ...over });
    return { host, clock, onReveal, stage };
}
/** Play with a fake clock until the stage stops asking for frames (bounded). */
function run(clock: ReturnType<typeof fakeClock>, ms: number, frame = 16): void {
    for (let t = 0; t < ms && clock.pending(); t += frame) clock.step(frame);
}

afterEach(() => {
    for (const h of hosts.splice(0)) h.remove();
});

describe('stage', () => {
    it('refuses an invalid wrapper with the list of problems', () => {
        const host = document.createElement('div');
        expect(() => mountStage(host, { ...lixi, id: 'BAD ID' } as any, { assetBase: BASE, reducedMotion: false })).toThrow(/id/);
        expect(host.children).toHaveLength(0);
        expect(() => mountStage(host, lixi, { assetBase: 'https://evil.example/', reducedMotion: false })).toThrow(/this origin/);
        expect(() => mountStage(host, lixi, { assetBase: '//evil.example/', reducedMotion: false })).toThrow(/this origin/);
    });

    it('builds one root with an img per layer and keeps the aspect ratio', () => {
        const { host, stage } = setup();
        const root = host.querySelector('div.stage') as HTMLElement;
        expect(root).not.toBeNull();
        expect(root.querySelectorAll('img.stage-layer')).toHaveLength(lixi.layers.length);
        expect(root.style.getPropertyValue('aspect-ratio')).toContain('360');
        const img = root.querySelector('img') as HTMLImageElement;
        expect(img.getAttribute('alt')).toBe('');
        expect(img.draggable).toBe(false);
        stage.destroy();
    });

    it('pictures-load-only-from-this-origin', () => {
        const { host, clock, stage } = setup();
        const check = (): void => {
            const imgs = host.querySelectorAll('img');
            expect(imgs.length).toBeGreaterThan(0);
            for (const img of Array.from(imgs)) {
                const src = img.getAttribute('src')!;
                expect(src.startsWith(BASE)).toBe(true);
                expect(WRAPPER_LIMITS.artPattern.test(src.slice(BASE.length))).toBe(true);
            }
        };
        check();
        void stage.open();
        run(clock, 1200); // petals are created on demand mid-scatter
        expect(host.querySelectorAll('img.stage-particle').length).toBeGreaterThan(0);
        check();
        stage.seek(1500);
        check();
        stage.destroy();
        expect(host.querySelectorAll('img')).toHaveLength(0);
    });

    it('plays through opening to open and resolves', async () => {
        const { clock, stage, onReveal } = setup();
        expect(stage.state).toBe('closed');
        const p = stage.open();
        expect(stage.open()).toBe(p);
        expect(stage.state).toBe('opening');
        run(clock, 1000);
        expect(stage.state).toBe('opening');
        run(clock, 5000);
        await p;
        expect(stage.state).toBe('open');
        expect(onReveal).toHaveBeenCalledTimes(1);
        expect(stage.open()).toBe(p);
        stage.destroy();
    });

    it('an-opening-can-always-be-skipped', async () => {
        const { host, stage, onReveal } = setup();
        const p = stage.open();
        stage.skip();
        await p;
        expect(stage.state).toBe('open');
        expect(onReveal).toHaveBeenCalledTimes(1);
        const card = host.querySelectorAll('img.stage-layer')[1] as HTMLImageElement;
        expect(card.style.getPropertyValue('transform')).toContain('translate(0%, -88.2353%)');
        // skipping a stage that was never opened also works
        const b = setup();
        b.stage.skip();
        expect(b.stage.state).toBe('open');
        expect(b.onReveal).toHaveBeenCalledTimes(1);
        // and in reduced motion, mid-fade
        const c = setup({ reducedMotion: true });
        const q = c.stage.open();
        c.clock.step(50);
        c.stage.skip();
        await q;
        expect(c.stage.state).toBe('open');
        expect(c.onReveal).toHaveBeenCalledTimes(1);
    });

    it('seek freezes, sets the state, and never plays on', () => {
        const { host, clock, stage, onReveal } = setup();
        const len = openLength(lixi);
        stage.seek(1000);
        expect(stage.state).toBe('opening');
        expect(onReveal).not.toHaveBeenCalled();
        const before = host.innerHTML;
        run(clock, 500);
        expect(host.innerHTML).toBe(before);
        stage.seek(Infinity);
        expect(stage.state).toBe('open');
        expect(onReveal).toHaveBeenCalledTimes(1);
        stage.seek(len);
        stage.seek(0);
        expect(stage.state).toBe('closed');
        stage.seek(-5);
        expect(stage.state).toBe('closed');
        stage.seek(NaN);
        expect(stage.state).toBe('closed');
        stage.destroy();
    });

    it('reveal-fires-exactly-once', async () => {
        // by playback
        const a = setup();
        void a.stage.open();
        run(a.clock, 1500);
        expect(a.onReveal).not.toHaveBeenCalled();
        run(a.clock, 300);
        expect(a.onReveal).toHaveBeenCalledTimes(1);
        run(a.clock, 5000);
        a.stage.skip();
        a.stage.seek(2000);
        a.stage.seek(Infinity);
        expect(a.onReveal).toHaveBeenCalledTimes(1);
        // by seek
        const b = setup();
        b.stage.seek(1599);
        expect(b.onReveal).not.toHaveBeenCalled();
        b.stage.seek(1600);
        b.stage.seek(1700);
        b.stage.seek(0);
        void b.stage.open();
        run(b.clock, 5000);
        expect(b.onReveal).toHaveBeenCalledTimes(1);
        // by skip after partial play
        const c = setup();
        void c.stage.open();
        run(c.clock, 800);
        c.stage.skip();
        run(c.clock, 800);
        expect(c.onReveal).toHaveBeenCalledTimes(1);
        // reduced motion
        const d = setup({ reducedMotion: true });
        await Promise.all([d.stage.open(), Promise.resolve().then(() => run(d.clock, 1000))]);
        expect(d.onReveal).toHaveBeenCalledTimes(1);
    });

    it('reduced-motion-is-honoured-and-every-move-has-a-maximum-duration', async () => {
        const { host, clock, stage, onReveal } = setup({ reducedMotion: true });
        // no idle loop: nothing asks for a frame while closed
        expect(clock.pending()).toBe(false);
        const root = host.querySelector('div.stage') as HTMLElement;
        const p = stage.open();
        // the timeline is not played: it is over in about 200 ms of frames
        let elapsed = 0;
        let sawFade = false;
        while (clock.pending() && elapsed < 1000) {
            clock.step(16);
            elapsed += 16;
            if (root.style.getPropertyValue('opacity') !== '') sawFade = true;
        }
        await p;
        expect(sawFade).toBe(true);
        expect(elapsed).toBeLessThanOrEqual(240);
        expect(elapsed).toBeGreaterThanOrEqual(190);
        expect(stage.state).toBe('open');
        expect(onReveal).toHaveBeenCalledTimes(1);
        expect(root.style.getPropertyValue('opacity')).toBe('');
        // no particle ever appeared
        expect(host.querySelectorAll('img.stage-particle')).toHaveLength(0);
        // and every move of every built-in wrapper has a bounded duration
        for (const s of lixi.open) expect(s.at + s.dur).toBeLessThanOrEqual(WRAPPER_LIMITS.maxOpenMs);
        expect(openLength(lixi)).toBeLessThanOrEqual(WRAPPER_LIMITS.maxOpenMs);
        stage.destroy();
    });

    it('idle runs only while closed, pauses when hidden, and stops at open()', () => {
        const { host, clock, stage } = setup();
        expect(clock.pending()).toBe(true);
        const seal = host.querySelectorAll('img.stage-layer')[4] as HTMLImageElement;
        const t0 = seal.style.getPropertyValue('transform');
        clock.step(400);
        expect(seal.style.getPropertyValue('transform')).not.toBe(t0);
        // hidden: loop is cancelled
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(clock.pending()).toBe(false);
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(clock.pending()).toBe(true);
        void stage.open();
        run(clock, 6000);
        expect(clock.pending()).toBe(false);
        stage.seek(0); // a still of the closed pose does not restart idle after open()
        expect(clock.pending()).toBe(false);
        stage.destroy();
    });

    it('destroy removes the DOM and the listeners and stops the loop', () => {
        const { host, clock, stage } = setup();
        const spy = vi.spyOn(document, 'removeEventListener');
        stage.destroy();
        expect(host.children).toHaveLength(0);
        expect(clock.pending()).toBe(false);
        expect(spy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
        spy.mockRestore();
        expect(() => stage.destroy()).not.toThrow();
        expect(() => stage.seek(10)).not.toThrow();
    });

    it('the scatter source layer never shows itself', () => {
        const { host, stage } = setup();
        const petals = host.querySelectorAll('img.stage-layer')[5] as HTMLImageElement;
        expect(petals.style.getPropertyValue('opacity')).toBe('0');
        stage.seek(1000);
        expect(petals.style.getPropertyValue('opacity')).toBe('0');
        stage.destroy();
    });
});
