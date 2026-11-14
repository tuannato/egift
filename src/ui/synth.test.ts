import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cue, isOn, resetSound, score, setOn, setSound } from './sound';
import { INSTRUMENTS, INSTRUMENT_NAMES, hz, noteLength, notePeak, schedule, type Note } from './synth';

/** A context that records what was made and when it was told to start and stop. */
function fake() {
    const log = { osc: [] as { f: number[]; start: number; stop: number[] }[], buffers: 0, filters: 0, gains: [] as { ramps: [number, number][] }[], state: 'running' as string };
    const param = (sink?: number[]) => ({
        setValueAtTime(v: number) {
            sink?.push(v);
        },
        exponentialRampToValueAtTime(v: number) {
            sink?.push(v);
        },
        setTargetAtTime() {},
        cancelScheduledValues() {},
    });
    class Ctx {
        currentTime = 10;
        sampleRate = 8000;
        destination = { connect() {} };
        get state() {
            return log.state;
        }
        createOscillator() {
            const o = { f: [] as number[], start: -1, stop: [] as number[] };
            log.osc.push(o);
            return { type: 'sine', frequency: param(o.f), connect() {}, start: (t: number) => void (o.start = t), stop: (t: number) => void o.stop.push(t), onended: null };
        }
        createGain() {
            const g = { ramps: [] as [number, number][] };
            log.gains.push(g);
            return {
                gain: {
                    setValueAtTime: (v: number, t: number) => void g.ramps.push([v, t]),
                    exponentialRampToValueAtTime: (v: number, t: number) => void g.ramps.push([v, t]),
                    setTargetAtTime() {},
                    cancelScheduledValues() {},
                },
                connect() {},
                disconnect() {},
            };
        }
        createBiquadFilter() {
            log.filters++;
            return { type: 'lowpass', frequency: param(), Q: param(), connect() {} };
        }
        createBuffer(_c: number, n: number) {
            const data = new Float32Array(n);
            return { getChannelData: () => data };
        }
        createBufferSource() {
            log.buffers++;
            return { buffer: null, loop: false, connect() {}, start() {}, stop() {}, onended: null };
        }
        suspend() {
            log.state = 'suspended';
            return Promise.resolve();
        }
        resume() {
            log.state = 'running';
            return Promise.resolve();
        }
    }
    return { Ctx, log };
}

describe('the instruments', () => {
    it('every instrument is a quiet recipe with a soft start and a soft end', () => {
        for (const name of INSTRUMENT_NAMES) {
            const r = INSTRUMENTS[name];
            expect(r.peak, name).toBeLessThanOrEqual(0.05);
            expect(r.attack, name).toBeGreaterThanOrEqual(5);
            expect(r.tail, name).toBeGreaterThanOrEqual(20);
            // The loudest a single note can get, all partials in step.
            expect(notePeak({ at: 0, pitch: 72, dur: 300, gain: 1 }, name), name).toBeLessThanOrEqual(0.08);
        }
    });

    it('a note is held to the frequencies a phone can play and an ear can bear', () => {
        const { Ctx, log } = fake();
        const ctx = new Ctx() as unknown as AudioContext;
        schedule(ctx, ctx.destination, { at: 0, pitch: 2, dur: 100 }, 0, 'tine');
        schedule(ctx, ctx.destination, { at: 0, pitch: 126, dur: 100, bend: 24 }, 0, 'reed');
        const all = log.osc.flatMap(o => o.f);
        expect(Math.min(...all)).toBeGreaterThanOrEqual(60);
        expect(Math.max(...all)).toBeLessThanOrEqual(9000);
        expect(hz(69)).toBeCloseTo(440, 5);
    });

    it('no envelope starts or ends abruptly', () => {
        const { Ctx, log } = fake();
        const ctx = new Ctx() as unknown as AudioContext;
        for (const name of INSTRUMENT_NAMES) schedule(ctx, ctx.destination, { at: 0, pitch: 60, dur: 30 }, 0, name);
        for (const g of log.gains) {
            const [[v0, t0], [, t1]] = g.ramps as [[number, number], [number, number]];
            expect(v0).toBeLessThanOrEqual(0.0002);
            expect(t1 - t0).toBeGreaterThanOrEqual(0.005);
        }
    });

    it('noise is a breath through a band, never bare', () => {
        const { Ctx, log } = fake();
        const ctx = new Ctx() as unknown as AudioContext;
        const made = schedule(ctx, ctx.destination, { at: 0, pitch: 80, dur: 200 }, 0, 'noise');
        expect(made).toHaveLength(1);
        expect(log.buffers).toBe(1);
        expect(log.filters).toBe(1);
    });

    it('a struck note rings on past its length; a held one ends after its release', () => {
        expect(noteLength({ at: 0, pitch: 60, dur: 100 }, 'bell')).toBe(INSTRUMENTS.bell.tail);
        expect(noteLength({ at: 0, pitch: 60, dur: 800 }, 'reed')).toBe(800 + INSTRUMENTS.reed.tail);
    });
});

describe('a tune', () => {
    const tune: Note[] = [{ at: 0, pitch: 72, dur: 200 }, { at: 250, pitch: 76, dur: 200 }, { at: 500, pitch: 79, dur: 400 }];
    let f: ReturnType<typeof fake>;

    beforeEach(() => {
        resetSound();
        f = fake();
        (globalThis as unknown as { AudioContext: unknown }).AudioContext = f.Ctx;
    });
    afterEach(() => {
        resetSound();
        delete (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
    });

    it('is not started before sound is on', () => {
        expect(isOn()).toBe(false);
        expect(score.start(tune, 'tine')).toBe(false);
        expect(f.log.osc).toHaveLength(0);
    });

    it('puts every note on the clock, in order, once sound is on', () => {
        setOn(true);
        expect(score.start(tune, 'tine')).toBe(true);
        const perNote = INSTRUMENTS.tine.partials.length;
        expect(f.log.osc).toHaveLength(tune.length * perNote);
        const starts = [...new Set(f.log.osc.map(o => Math.round((o.start - 10) * 1000)))];
        expect(starts).toEqual([30, 280, 530]);
        expect(score.playing()).toBe(true);
    });

    it('is not put on a clock that is not running', () => {
        setOn(true);
        f.log.state = 'suspended';
        expect(score.start(tune, 'tine')).toBe(false);
        expect(f.log.osc).toHaveLength(0);
    });

    it('stopped is stopped: every source is told to stop, and a new tune starts clean', () => {
        setOn(true);
        score.start(tune, 'bell');
        const first = f.log.osc.length;
        score.stop();
        expect(score.playing()).toBe(false);
        for (const o of f.log.osc) expect(o.stop.some(t => t <= 10.08)).toBe(true);
        score.start(tune, 'bell');
        expect(f.log.osc.length).toBe(first * 2);
    });

    it('a wrapper with a tune: opening starts it, and the reveal is left to it unless it was cut', () => {
        setOn(true);
        setSound({ v: 1, inst: 'tine', tonic: 72, score: tune });
        cue.open();
        expect(score.playing()).toBe(true);
        const afterOpen = f.log.osc.length;
        cue.reveal();
        expect(f.log.osc.length).toBe(afterOpen); // the tune carries the moment
        cue.open();
        score.stop(); // skipped
        const afterSkip = f.log.osc.length;
        cue.reveal();
        expect(f.log.osc.length).toBeGreaterThan(afterSkip); // the reveal's own sound
    });

    it('a wrapper without a tune still has its own small sounds; changing wrapper ends a tune', () => {
        setOn(true);
        setSound({ v: 1, inst: 'wood', tonic: 60 });
        cue.open();
        expect(score.playing()).toBe(false);
        expect(f.log.osc.length).toBeGreaterThan(0);
        setSound({ v: 1, inst: 'tine', tonic: 72, score: tune });
        cue.open();
        expect(score.playing()).toBe(true);
        setSound(null);
        expect(score.playing()).toBe(false);
    });

    it('switching sound off ends the tune before the context is suspended', () => {
        setOn(true);
        score.start(tune, 'pluck');
        setOn(false);
        expect(score.playing()).toBe(false);
        for (const o of f.log.osc) expect(o.stop.some(t => t <= 10.08)).toBe(true);
        expect(score.start(tune, 'pluck')).toBe(false);
    });
});
