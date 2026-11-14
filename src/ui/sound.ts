/**
 * Sound, synthesized (no audio files), and silent until asked for.
 *
 * The page arrives silent and stays silent on its own. Sound begins with the
 * person's own touch on the capsule — the first press there wakes it, inside
 * that gesture — and the speaker in the bar switches it off again for the
 * visit. Once switched off by hand, a touch on the capsule does not bring it
 * back. Nothing is written to storage.
 *
 * Every wrapper names a voice (`theme.voice`): the same few cues, played by a
 * different instrument — glass (neutral), chime (bells), servo (a machine),
 * pulse (a signal). All of them are quiet.
 */
import type { SoundDef, Voice } from '../stage';
import { hz, noteLength, schedule, type Instrument, type Note, type Sounding } from './synth';

type Ctor = new () => AudioContext;

let ctx: AudioContext | null = null;
/** The capsule has been touched (or the speaker pressed on). */
let woken = false;
/** The person switched sound off: it stays off until they switch it on. */
let off = false;
let voice: Voice = 'glass';
const listeners = new Set<() => void>();

/** True once sound may play: woken by a touch, and not switched off. */
export function isOn(): boolean {
    return woken && !off;
}

/** True when the person switched sound off by hand: a touch on the capsule no longer brings it back. */
export function isOffByHand(): boolean {
    return off;
}

/** Called whenever sound goes on or off, so the speaker button can follow. */
export function onSoundChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => void listeners.delete(fn);
}

function emit(): void {
    for (const fn of [...listeners]) {
        try {
            fn();
        } catch {
            /* a listener is a nicety */
        }
    }
}

function ctor(): Ctor | null {
    const w = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
    return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Make (or resume) the audio context. Only ever called from inside a press. */
function ensure(): void {
    if (ctx) {
        void ctx.resume().catch(() => {});
        return;
    }
    const C = ctor();
    if (!C) return;
    try {
        ctx = new C();
    } catch {
        ctx = null;
    }
}

/**
 * A touch on the capsule: the one thing that starts sound. Call from inside
 * the press. Returns whether sound was already on before this touch.
 */
export function wake(): boolean {
    if (off) return true;
    const was = isOn();
    woken = true;
    ensure();
    if (!was) emit();
    return was;
}

/** The speaker button. On: sound may play from now. Off: silent for the visit, whatever is touched. */
export function setOn(on: boolean): void {
    off = !on;
    if (on) {
        woken = true;
        ensure();
    } else {
        stopScrub(0);
        // A tune is ended, never paused: the clock stops with the context, and what was left would play late.
        score.stop();
        if (ctx) void ctx.suspend().catch(() => {});
    }
    emit();
}

/** The instrument the cues are played on: the wrapper's `theme.voice`. */
export function setVoice(v: Voice): void {
    voice = v in VOICES ? v : 'glass';
}
export function getVoice(): Voice {
    return voice;
}

/** The wrapper's own sound, when it has one: its instrument, its home note, its tune. */
let own: SoundDef | null = null;
/** The tune was started with the opening and has not been cut: it carries the reveal itself. */
let carried = false;
/** A tune asked for before the audio clock was running: it starts when the clock does. Stopping the tune forgets it. */
let awaited: SoundDef | null = null;

/** Wear a wrapper's own sound (or none: the theme's voice is used). A tune that was sounding ends. */
export function setSound(def: SoundDef | null | undefined): void {
    const next = def && def.v === 1 ? def : null;
    if (next === own) return;
    score.stop();
    own = next;
}
export function getSound(): SoundDef | null {
    return own;
}

/** The small sounds under the hand, made from a wrapper's instrument and home note. */
function derived(kind: 'touch' | 'open' | 'reveal' | 'final' | 'deny', s: SoundDef): Note[] {
    const t = s.tonic;
    switch (kind) {
        case 'touch':
            return [{ at: 0, pitch: t + 12, dur: 70, gain: 0.32 }];
        case 'open':
            return [{ at: 0, pitch: t, dur: 260, gain: 0.5 }, { at: 130, pitch: t + 7, dur: 260, gain: 0.5 }, { at: 260, pitch: t + 12, dur: 520, gain: 0.55 }];
        case 'reveal':
            return [{ at: 0, pitch: t + 12, dur: 520, gain: 0.7 }, { at: 90, pitch: t + 19, dur: 700, gain: 0.5 }, { at: 90, pitch: t, dur: 700, gain: 0.35 }];
        case 'final':
            return [{ at: 0, pitch: t - 12, dur: 700, gain: 0.75 }, { at: 30, pitch: t - 5, dur: 800, gain: 0.45 }, { at: 60, pitch: t, dur: 900, gain: 0.35 }];
        case 'deny':
            return [{ at: 0, pitch: t, dur: 220, gain: 0.5, bend: -2 }];
    }
}

/** Play a few notes straight out: a cue. Nothing if sound is off or the clock is not running. */
function notes(list: readonly Note[], inst: Instrument): void {
    if (!ctx || !running()) return;
    const t0 = ctx.currentTime + 0.005;
    for (const n of list) schedule(ctx, ctx.destination, n, t0, inst);
}

/** True when the viewer asked for less motion: the gift opens at once, so no tune accompanies it. */
function calm(): boolean {
    try {
        return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
}

/** For tests. */
export function resetSound(): void {
    ctx = null;
    woken = false;
    off = false;
    voice = 'glass';
    scrubbing = null;
    playing = null;
    own = null;
    carried = false;
    listeners.clear();
}

interface Tone {
    /** Hz. */
    f: number;
    /** Seconds after the cue starts. */
    at?: number;
    /** Seconds. */
    dur: number;
    /** Peak gain. Kept small: nothing here is loud. */
    peak: number;
    type?: OscillatorType;
    /** Glide to this frequency over the tone. */
    to?: number;
    /** Low-pass cutoff in Hz, for the buzzy waves. */
    lp?: number;
}

function tone(t: Tone): void {
    if (!ctx || !isOn()) return;
    try {
        const t0 = ctx.currentTime + (t.at ?? 0);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = t.type ?? 'sine';
        osc.frequency.setValueAtTime(t.f, t0);
        if (t.to !== undefined) osc.frequency.exponentialRampToValueAtTime(t.to, t0 + t.dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(t.peak, t0 + Math.min(0.03, t.dur / 4));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + t.dur);
        if (t.lp !== undefined && typeof ctx.createBiquadFilter === 'function') {
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(t.lp, t0);
            osc.connect(lp);
            lp.connect(gain);
        } else osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + t.dur + 0.05);
    } catch {
        /* sound is a nicety */
    }
}

function play(tones: readonly Tone[]): void {
    for (const t of tones) tone(t);
}

interface VoiceDef {
    /** A control under the finger. */
    touch: readonly Tone[];
    /** The gift starts to open. */
    open: readonly Tone[];
    /** The gift is revealed. */
    reveal: readonly Tone[];
    /** The network has settled it. */
    final: readonly Tone[];
    /** Not this time (a wrong answer). */
    deny: readonly Tone[];
    /** The slide: one held note that climbs with the thumb. */
    scrub: { type: OscillatorType; from: number; to: number; peak: number; lp?: number };
}

const VOICES: Record<Voice, VoiceDef> = {
    glass: {
        touch: [{ f: 880, dur: 0.05, peak: 0.01 }],
        open: [
            { f: 164.8, dur: 1.1, peak: 0.035, to: 493.9 },
            { f: 329.6, at: 0.05, dur: 1.0, peak: 0.012, type: 'triangle', to: 987.8 },
        ],
        reveal: [
            { f: 659.3, dur: 0.5, peak: 0.05 },
            { f: 987.8, at: 0.11, dur: 0.9, peak: 0.045 },
            { f: 1975.5, at: 0.11, dur: 0.5, peak: 0.008 },
        ],
        final: [
            { f: 196, dur: 0.7, peak: 0.06 },
            { f: 293.7, at: 0.02, dur: 0.9, peak: 0.03 },
        ],
        deny: [{ f: 220, dur: 0.2, peak: 0.03, to: 174.6 }],
        scrub: { type: 'sine', from: 220, to: 660, peak: 0.022 },
    },
    // Small bells on a pentatonic scale: D, F sharp, A, B.
    chime: {
        touch: [{ f: 1480, dur: 0.12, peak: 0.01 }],
        open: [
            { f: 587.3, dur: 0.7, peak: 0.03 },
            { f: 740, at: 0.16, dur: 0.7, peak: 0.028 },
            { f: 880, at: 0.32, dur: 0.9, peak: 0.028 },
            { f: 1174.7, at: 0.5, dur: 1.1, peak: 0.02 },
        ],
        reveal: [
            { f: 1174.7, dur: 1.4, peak: 0.045 },
            { f: 1760, at: 0.09, dur: 1.5, peak: 0.03 },
            { f: 3242, at: 0, dur: 0.5, peak: 0.006 },
            { f: 587.3, at: 0.09, dur: 1.2, peak: 0.02, type: 'triangle' },
        ],
        final: [
            { f: 293.7, dur: 1.1, peak: 0.05 },
            { f: 440, at: 0.04, dur: 1.2, peak: 0.03 },
            { f: 587.3, at: 0.08, dur: 1.3, peak: 0.018 },
        ],
        deny: [{ f: 246.9, dur: 0.24, peak: 0.03, to: 207.7 }],
        scrub: { type: 'triangle', from: 293.7, to: 880, peak: 0.02 },
    },
    // A machine: low, filtered saws and a short clack.
    servo: {
        touch: [{ f: 150, dur: 0.045, peak: 0.02, type: 'square', lp: 900 }],
        open: [
            { f: 82.4, dur: 1.0, peak: 0.03, type: 'sawtooth', to: 196, lp: 700 },
            { f: 41.2, dur: 1.0, peak: 0.03, to: 98 },
        ],
        reveal: [
            { f: 110, dur: 0.07, peak: 0.04, type: 'square', lp: 1400 },
            { f: 392, at: 0.06, dur: 0.5, peak: 0.035, type: 'triangle' },
            { f: 196, at: 0.06, dur: 0.7, peak: 0.035 },
        ],
        final: [
            { f: 98, dur: 0.7, peak: 0.06, type: 'triangle' },
            { f: 146.8, at: 0.03, dur: 0.8, peak: 0.03 },
        ],
        deny: [
            { f: 110, dur: 0.09, peak: 0.03, type: 'square', lp: 800 },
            { f: 98, at: 0.13, dur: 0.12, peak: 0.03, type: 'square', lp: 800 },
        ],
        scrub: { type: 'sawtooth', from: 70, to: 210, peak: 0.018, lp: 600 },
    },
    // A signal: short high blips.
    pulse: {
        touch: [{ f: 1760, dur: 0.035, peak: 0.01 }],
        open: [
            { f: 660, dur: 0.07, peak: 0.03 },
            { f: 880, at: 0.14, dur: 0.07, peak: 0.03 },
            { f: 1100, at: 0.28, dur: 0.07, peak: 0.03 },
            { f: 1320, at: 0.42, dur: 0.07, peak: 0.03 },
            { f: 1760, at: 0.56, dur: 0.3, peak: 0.025 },
        ],
        reveal: [
            { f: 1320, dur: 0.28, peak: 0.035, to: 2640 },
            { f: 1980, at: 0.24, dur: 0.8, peak: 0.03 },
            { f: 990, at: 0.24, dur: 0.8, peak: 0.02 },
        ],
        final: [
            { f: 440, dur: 0.5, peak: 0.05 },
            { f: 660, at: 0.03, dur: 0.8, peak: 0.03 },
        ],
        deny: [
            { f: 330, dur: 0.08, peak: 0.03 },
            { f: 261.6, at: 0.11, dur: 0.14, peak: 0.03 },
        ],
        scrub: { type: 'sine', from: 440, to: 1320, peak: 0.02 },
    },
};

/** The note held while the thumb is on the slide. */
let scrubbing: { osc: OscillatorNode; gain: GainNode } | null = null;

function stopScrub(fade: number): void {
    const s = scrubbing;
    scrubbing = null;
    if (!s || !ctx) return;
    try {
        const now = ctx.currentTime;
        s.gain.gain.cancelScheduledValues(now);
        s.gain.gain.setTargetAtTime(0.0001, now, Math.max(0.005, fade / 4));
        s.osc.stop(now + fade + 0.05);
    } catch {
        /* already stopped */
    }
}

export const cue = {
    /** A control in the capsule, pressed. */
    touch(): void {
        if (own) notes(derived('touch', own), own.inst);
        else play(VOICES[voice].touch);
    },
    /** The slide moves: `p` from 0 to 1. One note that climbs with the thumb. */
    scrub(p: number): void {
        if (!ctx || !isOn()) return;
        // A wrapper's own slide climbs from under its home note to the first note of its tune: the two never clash.
        const first = own?.score?.[0]?.pitch;
        const v = own ? { type: 'sine' as OscillatorType, from: hz(own.tonic - 5), to: hz(Math.min(84, first ?? own.tonic + 7)), peak: 0.02, lp: undefined } : VOICES[voice].scrub;
        const q = Math.min(1, Math.max(0, p));
        try {
            const now = ctx.currentTime;
            if (!scrubbing) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = v.type;
                osc.frequency.setValueAtTime(v.from, now);
                gain.gain.setValueAtTime(0.0001, now);
                if (v.lp !== undefined && typeof ctx.createBiquadFilter === 'function') {
                    const lp = ctx.createBiquadFilter();
                    lp.type = 'lowpass';
                    lp.frequency.setValueAtTime(v.lp, now);
                    osc.connect(lp);
                    lp.connect(gain);
                } else osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                scrubbing = { osc, gain };
            }
            scrubbing.osc.frequency.setTargetAtTime(v.from * (v.to / v.from) ** q, now, 0.03);
            scrubbing.gain.gain.setTargetAtTime(v.peak * (0.35 + 0.65 * q), now, 0.05);
        } catch {
            scrubbing = null;
        }
    },
    /** The thumb left the slide. */
    scrubEnd(): void {
        stopScrub(0.14);
    },
    /** The gift starts to open: the wrapper's tune if it has one (once, and not when motion is reduced), else the opening cue. */
    open(): void {
        if (own?.score?.length && !calm()) {
            if (score.start(own.score, own.inst)) {
                carried = true;
                return;
            }
            // The very first press: the audio clock was asked to run by this same press and is not
            // running yet. The tune starts as soon as it is, unless it was stopped in between.
            const c = ctx as (AudioContext & { state?: string }) | null;
            if (c && isOn() && c.state !== undefined && c.state !== 'running') {
                const tune = own;
                awaited = tune;
                carried = true;
                void c.resume().then(() => {
                    if (awaited !== tune) return;
                    awaited = null;
                    if (own !== tune || !score.start(tune.score!, tune.inst)) carried = false;
                }, () => {
                    if (awaited === tune) awaited = null, (carried = false);
                });
                return;
            }
        }
        if (own) notes(derived('open', own), own.inst);
        else play(VOICES[voice].open);
    },
    /** The gift is revealed. A tune that is still running carries the moment itself. */
    reveal(): void {
        if (carried) {
            carried = false;
            return;
        }
        if (own) notes(derived('reveal', own), own.inst);
        else play(VOICES[voice].reveal);
    },
    /** The network has settled it: whatever tune was left gives way. */
    final(): void {
        score.stop();
        if (own) notes(derived('final', own), own.inst);
        else play(VOICES[voice].final);
    },
    deny(): void {
        if (own) notes(derived('deny', own), own.inst);
        else play(VOICES[voice].deny);
    },
};

/** The tune that is sounding: its own bus, so that it can be faded and cut without touching anything else. */
let playing: { bus: GainNode; sources: Sounding[]; until: number } | null = null;

/** True when the context is really running: a note put on a stopped clock would burst out later. */
function running(): boolean {
    if (!ctx || !isOn()) return false;
    const state = (ctx as { state?: string }).state;
    return state === undefined || state === 'running';
}

/**
 * A tune: notes put on the audio clock all at once, played once.
 * It is never paused or resumed — stopped is stopped — and it is not started
 * unless sound is on and the context is running.
 */
export const score = {
    /** Start `notes` now, on `inst` where a note names none. Returns whether it started. */
    start(notes: readonly Note[], inst: Instrument): boolean {
        score.stop();
        if (!ctx || !running() || notes.length === 0) return false;
        try {
            const bus = ctx.createGain();
            bus.gain.setValueAtTime(1, ctx.currentTime);
            bus.connect(ctx.destination);
            const t0 = ctx.currentTime + 0.03;
            const sources: Sounding[] = [];
            let last = 0;
            for (const n of notes) {
                sources.push(...schedule(ctx, bus, n, t0, inst));
                last = Math.max(last, n.at + noteLength(n, inst));
            }
            if (sources.length === 0) return false;
            playing = { bus, sources, until: t0 + last / 1000 };
            return true;
        } catch {
            playing = null;
            return false;
        }
    },
    /** End the tune: a short fade, then every source stopped. */
    stop(): void {
        awaited = null;
        const p = playing;
        playing = null;
        carried = false;
        if (!p || !ctx) return;
        try {
            const now = ctx.currentTime;
            p.bus.gain.cancelScheduledValues(now);
            p.bus.gain.setTargetAtTime(0.0001, now, 0.012);
            for (const s of p.sources) {
                try {
                    s.stop(now + 0.07);
                } catch {
                    /* not started, or already stopped */
                }
            }
        } catch {
            /* already gone */
        }
    },
    /** True while a started tune has not run out (or been stopped). */
    playing(): boolean {
        return !!playing && !!ctx && ctx.currentTime < playing.until;
    },
};

// A hidden page keeps no tune going: the picture's clock and the sound's would part.
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) score.stop();
    });
}
