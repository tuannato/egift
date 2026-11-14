/**
 * The maths of a wrapper's timeline. No DOM, no clock, no Math.random: the same
 * (wrapper, time) always gives the same answer, so a still, a test and a live
 * playback agree.
 */
import type { Ease, IdleStep, Pose, Step, WrapperDef } from './format';

type MoveStep = Extract<Step, { kind: 'move' }>;
type ShakeStep = Extract<Step, { kind: 'shake' }>;
type ScatterStep = Extract<Step, { kind: 'scatter' }>;

const POSE_FIELDS = ['x', 'y', 'turn', 'sx', 'sy', 'opacity'] as const;
type Field = (typeof POSE_FIELDS)[number];

export const NEUTRAL_POSE: Readonly<Pose> = Object.freeze({ x: 0, y: 0, turn: 0, sx: 1, sy: 1, opacity: 1 });

const TAU = Math.PI * 2;

function bounceOut(t: number): number {
    const n = 7.5625;
    const d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) {
        const u = t - 1.5 / d;
        return n * u * u + 0.75;
    }
    if (t < 2.5 / d) {
        const u = t - 2.25 / d;
        return n * u * u + 0.9375;
    }
    const u = t - 2.625 / d;
    return n * u * u + 0.984375;
}

const CURVES: Record<Ease, (t: number) => number> = {
    linear: t => t,
    in: t => t * t * t,
    out: t => 1 - (1 - t) ** 3,
    inout: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
    // ~10% overshoot, then settles.
    back: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
    },
    bounce: bounceOut,
};

/** An easing curve; exactly 0 at 0 and exactly 1 at 1 for every kind (floating point must not drift). */
export function ease(kind: Ease | undefined, t: number): number {
    if (!(t > 0)) return 0;
    if (t >= 1) return 1;
    return (CURVES[kind ?? 'linear'] ?? CURVES.linear)(t);
}

/** Length of the opening in ms: the largest `at + dur`. */
export function openLength(def: WrapperDef): number {
    let end = 0;
    for (const s of def.open) end = Math.max(end, s.at + s.dur);
    return end;
}

function startPose(def: WrapperDef, layerId: string): Pose {
    const layer = def.layers.find(l => l.id === layerId);
    return { ...NEUTRAL_POSE, ...(layer?.start ?? {}) };
}

/** Value of one field at time `t`, from its start value and its `move` steps already sorted by `at`. */
function fieldAt(start: number, steps: readonly MoveStep[], field: Field, t: number): number {
    let v = start;
    for (let k = 0; k < steps.length; k += 1) {
        const s = steps[k]!;
        if (t < s.at) break; // sorted: later steps start later still
        const target = s.to[field];
        if (target === undefined) continue;
        if (t >= s.at + s.dur) {
            v = target;
        } else {
            // From the value the field had when this step STARTED.
            const from = fieldAt(start, steps.slice(0, k), field, s.at);
            v = from + (target - from) * ease(s.ease, (t - s.at) / s.dur);
        }
    }
    return v;
}

/** The pose of every layer at `ms` into the opening. Pure and deterministic. `ms <= 0` is the closed pose. */
export function poseAt(def: WrapperDef, ms: number): Record<string, Pose> {
    const t = Number.isNaN(ms) ? 0 : ms;
    const out: Record<string, Pose> = {};
    for (const layer of def.layers) {
        const start = startPose(def, layer.id);
        const moves = def.open
            .filter((s): s is MoveStep => s.kind === 'move' && s.layer === layer.id)
            .map((s, i) => ({ s, i }))
            .sort((a, b) => a.s.at - b.s.at || a.i - b.i)
            .map(e => e.s);
        const pose: Pose = { ...start };
        if (t > 0) {
            for (const f of POSE_FIELDS) pose[f] = fieldAt(start[f], moves, f, t);
        }
        for (const s of def.open) {
            if (s.kind !== 'shake' || s.layer !== layer.id) continue;
            pose.x += shakeOffset(s, t);
        }
        out[layer.id] = pose;
    }
    return out;
}

function shakeOffset(s: ShakeStep, t: number): number {
    if (s.dur <= 0 || t <= s.at || t >= s.at + s.dur) return 0;
    const p = (t - s.at) / s.dur;
    return s.amp * Math.sin(TAU * s.times * p) * (1 - p);
}

/** Small seeded PRNG (mulberry32) so particles never depend on Math.random. */
function seeded(key: string): () => number {
    let h = 2166136261;
    for (let i = 0; i < key.length; i += 1) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    let a = h >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let z = a;
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
}

export interface Particle {
    /** Index of the scatter step in `def.open`. */
    step: number;
    /** Index of the copy within the step. */
    i: number;
    pose: Pose;
}

/** Every particle alive at `ms`: those of scatter steps with `at <= ms < at + dur`. Deterministic. */
export function particlesAt(def: WrapperDef, ms: number): Particle[] {
    const out: Particle[] = [];
    if (!(ms >= 0)) return out;
    const layerPoses = poseAt(def, ms);
    def.open.forEach((s, step) => {
        if (s.kind !== 'scatter') return;
        const sc: ScatterStep = s;
        if (sc.dur <= 0 || ms < sc.at || ms >= sc.at + sc.dur) return;
        const p = (ms - sc.at) / sc.dur;
        const base = layerPoses[sc.layer];
        for (let i = 0; i < sc.count; i += 1) {
            const rnd = seeded(`${def.id}:${step}:${i}`);
            const angle = rnd() * TAU;
            const radius = sc.spread * Math.sqrt(rnd());
            const spin = (rnd() * 2 - 1) * 360;
            const size = 0.6 + rnd() * 0.5;
            const fly = ease('out', p);
            const drop = ease('in', p);
            out.push({
                step,
                i,
                pose: {
                    x: (base?.x ?? 0) + Math.cos(angle) * radius * fly,
                    y: (base?.y ?? 0) + Math.sin(angle) * radius * fly + sc.fall * drop,
                    turn: spin * p,
                    sx: size,
                    sy: size,
                    // Fully visible for two thirds, then fades out.
                    opacity: p < 2 / 3 ? 1 : Math.max(0, 1 - (p - 2 / 3) * 3),
                },
            });
        }
    });
    return out;
}

/** Additive offsets of the idle loops at wall time `tMs`, per layer (only touched fields are present). */
export function idleOffset(def: WrapperDef, tMs: number, which: 'idle' | 'afterglow' = 'idle'): Record<string, Partial<Pose>> {
    const out: Record<string, Partial<Pose>> = {};
    for (const st of def[which] ?? ([] as readonly IdleStep[])) {
        const v = st.amp * Math.sin(TAU * (tMs / st.period + (st.phase ?? 0)));
        const o = (out[st.layer] ??= {});
        o[st.field] = (o[st.field] ?? 0) + v;
    }
    return out;
}
