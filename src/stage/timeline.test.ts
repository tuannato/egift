import { describe, expect, it } from 'vitest';
import type { Ease, WrapperDef } from './format';
import { ease, idleOffset, openLength, particlesAt, poseAt } from './timeline';
import { FIXTURE as lixi } from './fixture';

const tiny = (open: WrapperDef['open'], extra: Partial<WrapperDef> = {}): WrapperDef => ({
    id: 't',
    name: { vi: 'a', en: 'a' },
    size: [360, 450],
    backdrop: '#ffffff',
    layers: [
        { id: 'a', art: 'a.svg', box: [0, 0, 100, 100], start: { x: 5 } },
        { id: 'b', art: 'b.svg', box: [0, 0, 100, 100] },
    ],
    open,
    revealAt: 0,
    ...extra,
});

describe('timeline', () => {
    it('openLength is the largest at + dur', () => {
        expect(openLength(tiny([]))).toBe(0);
        expect(openLength(lixi)).toBe(2750);
    });

    it('every ease is exactly 0 at 0 and exactly 1 at 1, and is monotone enough to stay finite', () => {
        for (const k of ['linear', 'in', 'out', 'inout', 'back', 'bounce'] as Ease[]) {
            expect(ease(k, 0)).toBe(0);
            expect(ease(k, 1)).toBe(1);
            for (let i = 1; i < 100; i += 1) expect(Number.isFinite(ease(k, i / 100))).toBe(true);
        }
        const peak = Math.max(...Array.from({ length: 100 }, (_, i) => ease('back', i / 100)));
        expect(peak).toBeGreaterThan(1.05);
        expect(peak).toBeLessThan(1.15);
    });

    it('poses-are-deterministic', () => {
        for (const ms of [0, 1, 499, 500, 777, 1234, 2000, 2750, 9999]) {
            expect(poseAt(lixi, ms)).toEqual(poseAt(lixi, ms));
            expect(particlesAt(lixi, ms)).toEqual(particlesAt(lixi, ms));
        }
        // the same wrapper under a copy gives the same answer
        const copy = JSON.parse(JSON.stringify(lixi)) as WrapperDef;
        expect(poseAt(copy, 1500)).toEqual(poseAt(lixi, 1500));
        expect(particlesAt(copy, 1500)).toEqual(particlesAt(lixi, 1500));
    });

    it('starts from the start pose and ends exactly on the targets', () => {
        const d = tiny([{ kind: 'move', layer: 'a', at: 100, dur: 200, ease: 'back', to: { x: 50, opacity: 0.5 } }]);
        expect(poseAt(d, 0).a).toEqual({ x: 5, y: 0, turn: 0, sx: 1, sy: 1, opacity: 1 });
        expect(poseAt(d, 100).a!.x).toBe(5);
        expect(poseAt(d, 300).a!.x).toBe(50);
        expect(poseAt(d, 5000).a!.opacity).toBe(0.5);
        expect(poseAt(d, 200).a!.x).toBeGreaterThan(5);
    });

    it('later moves start from where the field was and win from their start', () => {
        const d = tiny([
            { kind: 'move', layer: 'b', at: 0, dur: 100, to: { x: 100 } },
            { kind: 'move', layer: 'b', at: 50, dur: 100, to: { x: 0 } },
        ]);
        expect(poseAt(d, 50).b!.x).toBeCloseTo(50);
        expect(poseAt(d, 100).b!.x).toBeCloseTo(25);
        expect(poseAt(d, 150).b!.x).toBe(0);
        // an instant set
        const e = tiny([{ kind: 'move', layer: 'b', at: 10, dur: 0, to: { y: 9 } }]);
        expect(poseAt(e, 9).b!.y).toBe(0);
        expect(poseAt(e, 10).b!.y).toBe(9);
    });

    it('shake is exactly zero before and after, and sideways only', () => {
        const d = tiny([{ kind: 'shake', layer: 'b', at: 100, dur: 400, amp: 10, times: 3 }]);
        expect(poseAt(d, 100).b!.x).toBe(0);
        expect(poseAt(d, 500).b!.x).toBe(0);
        expect(poseAt(d, 800).b!.x).toBe(0);
        const xs = Array.from({ length: 40 }, (_, i) => poseAt(d, 100 + i * 10).b!.x);
        expect(Math.max(...xs.map(Math.abs))).toBeGreaterThan(1);
        expect(poseAt(d, 300).b!.y).toBe(0);
    });

    it('particles live only between at and at + dur, inside the spread', () => {
        const d = tiny([{ kind: 'scatter', layer: 'b', at: 100, dur: 1000, count: 12, spread: 80, fall: 0 }], { id: 'p' });
        expect(particlesAt(d, 99)).toEqual([]);
        expect(particlesAt(d, 1100)).toEqual([]);
        const live = particlesAt(d, 600);
        expect(live).toHaveLength(12);
        for (const p of live) expect(Math.hypot(p.pose.x, p.pose.y)).toBeLessThanOrEqual(80 + 1e-9);
        const fade = particlesAt(d, 1050)[0]!;
        expect(fade.pose.opacity).toBeLessThan(0.5);
        // a different wrapper id scatters differently
        expect(particlesAt({ ...d, id: 'q' }, 600)).not.toEqual(live);
    });

    it('idle offsets follow amp * sin(2pi (t / period + phase))', () => {
        const d = tiny([], { idle: [{ layer: 'a', field: 'y', amp: 4, period: 2000, phase: 0.25 }] });
        expect(idleOffset(d, 0).a!.y).toBeCloseTo(4);
        expect(idleOffset(d, 500).a!.y).toBeCloseTo(0, 6);
        expect(idleOffset(d, 0).b).toBeUndefined();
    });
});
