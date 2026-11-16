/**
 * The wrapper format: what a gift wrapper IS.
 *
 * A wrapper is data and pictures, never code. It is a set of flat picture
 * layers and a timeline of moves the stage knows how to perform. The stage
 * owns every move; a wrapper only names them and gives numbers.
 *
 * The frame — not the wrapper — paints the amount, the gift's name, the wish
 * and every warning, OUTSIDE the stage. A wrapper cannot paint text.
 *
 * Geometry: a wrapper is drawn in its own units on a canvas of `size`
 * ([width, height], recommended [360, 450]); the stage scales the canvas to
 * fit. Positions are in those units, angles in degrees (clockwise), times in
 * milliseconds from the moment the opening starts.
 */

export type Lang = 'vi' | 'en';

export interface WrapperDef {
    /** `[a-z0-9-]{1,24}`. Also the folder name under `public/wrappers/`. */
    readonly id: string;
    readonly name: Readonly<Record<Lang, string>>;
    /**
     * Who made the wrapper, as the frame's caption shows it (an artist's or a
     * studio's name). Plain text, at most 40 characters. Painted by the frame,
     * never by the wrapper.
     */
    readonly credit?: string;
    /**
     * The colours of the light the wrapper throws into the room: two to four
     * hex colours the frame uses for the ambient glow around the stage and
     * behind the page. The frame paints it; the wrapper only names colours.
     * Default: the backdrop alone.
     */
    readonly ambient?: readonly string[];
    /**
     * One or two plain sentences about the wrapper, shown by the shop beside
     * its name. Plain text, at most 140 characters each. Painted by the frame.
     */
    readonly blurb?: Readonly<Record<Lang, string>>;
    /**
     * The theme the whole frame wears while this wrapper is on stage: the
     * capsule, the islands, every control, the type and the sounds. A wrapper
     * chooses from what the frame knows how to build; it brings no styles of
     * its own. Default: neutral dark glass.
     */
    readonly theme?: ThemeDef;
    /**
     * Where the thing being opened is: its centre, as fractions of the canvas
     * ([x, y], each 0.15..0.85). When the frame leaves the stage little room
     * (a tall capsule on a phone), it keeps this point in view rather than
     * the middle of the canvas. Default [0.5, 0.5].
     */
    readonly focus?: readonly [number, number];
    /** Canvas size in wrapper units. */
    readonly size: readonly [number, number];
    /** CSS colour (hex only) painted behind the layers. */
    readonly backdrop: string;
    /** Bottom-most first. At most 24 layers. */
    readonly layers: readonly LayerDef[];
    /** Loops that run while the wrapper is closed (a gentle sway, a breath, a slow pulse of light). */
    readonly idle?: readonly IdleStep[];
    /** Loops that run once the wrapper is fully open (a hologram that keeps shimmering). */
    readonly afterglow?: readonly IdleStep[];
    /** The opening. Total length (max of `at + dur`) at most 6000 ms. */
    readonly open: readonly Step[];
    /**
     * When, during the opening, the frame may reveal the gift (amount, wish).
     * Must be <= the opening's total length.
     */
    readonly revealAt: number;
    /** The wrapper's own sound. Without it, the theme's voice is used. */
    readonly sound?: SoundDef;
}

/** What the capsule and the islands are made of. */
export type Material = 'glass' | 'lacquer' | 'plate' | 'wire';
/** The frame's geometry: full rounds, small soft corners, or corners cut at 45 degrees. */
export type Corner = 'round' | 'soft' | 'cut';
/** The face headings and figures are set in. Running text is always the same readable face. */
export type Face = 'grotesk' | 'tech' | 'mono' | 'serif' | 'poster' | 'slab';
/** The family of sounds the capsule makes under the hand. */
export type Voice = 'glass' | 'chime' | 'servo' | 'pulse';

/** The instruments a wrapper's own sounds are played on: fixed recipes, synthesized on the page. */
export type Instrument = 'bell' | 'tine' | 'pluck' | 'wood' | 'glassy' | 'reed' | 'brass' | 'pad' | 'noise';
export const INSTRUMENT_NAMES: readonly Instrument[] = ['bell', 'tine', 'pluck', 'wood', 'glassy', 'reed', 'brass', 'pad', 'noise'];

/** One note of a tune. */
export interface NoteDef {
    /** Milliseconds after the tune starts (the tune starts when the gift starts to open). */
    readonly at: number;
    /** MIDI pitch: 60 is middle C, 69 the A at 440 Hz. */
    readonly pitch: number;
    /** Milliseconds the note is held. A struck instrument rings on past it. */
    readonly dur: number;
    /** 0..1, how hard it is played. Default 0.6. */
    readonly gain?: number;
    /** The instrument, when it is not the wrapper's own. */
    readonly inst?: Instrument;
    /** Glide by this many semitones over the note. */
    readonly bend?: number;
}

/**
 * A wrapper's own sound: one instrument and one note to call home, from which
 * the page makes the small sounds under the hand (a touch, the slide, the
 * reveal, the end, a refusal) — and, if it has one, a short tune played once
 * while the gift opens. All of it is synthesized: a wrapper carries notes,
 * never audio.
 */
export interface SoundDef {
    /** The version of this description. */
    readonly v: 1;
    readonly inst: Instrument;
    /** The home note, as a MIDI pitch. */
    readonly tonic: number;
    /** The tune: played once, from the moment the gift starts to open. */
    readonly score?: readonly NoteDef[];
}

/** What a tune may be: short, quiet, playable on a phone. */
export const SOUND_LIMITS = {
    notes: 64,
    pitch: [36, 96],
    tonic: [48, 84],
    dur: [30, 4000],
    bend: 24,
    /** A tune ends (its last note is let go) no later than this long after the reveal. */
    afterReveal: 2500,
    /** Notes held at once. */
    polyphony: 6,
    /** The summed strength of notes held at once. */
    strength: 2.4,
} as const;

/**
 * A theme is five colours and four choices. The frame derives everything else
 * (quiet text, hairlines, fills) from them, and keeps the colours of warnings
 * for itself. The validator holds the colours to contrast rules, so a warning
 * stays readable whatever the wrapper:
 * ink on surface at least 7:1, accent on surface at least 3:1, onAccent on
 * accent at least 4.5:1, and a dark ground.
 */
export interface ThemeDef {
    /** The room behind everything. Dark. */
    readonly ground: string;
    /** The face of the capsule and the islands. */
    readonly surface: string;
    /** Text on the surface. */
    readonly ink: string;
    /** The one loud colour: the main control, the slide's knob, what is selected. */
    readonly accent: string;
    /** Text on the accent. */
    readonly onAccent: string;
    readonly material: Material;
    readonly corner: Corner;
    readonly face: Face;
    readonly voice: Voice;
}

export const THEME_CHOICES = {
    material: ['glass', 'lacquer', 'plate', 'wire'],
    corner: ['round', 'soft', 'cut'],
    face: ['grotesk', 'tech', 'mono', 'serif', 'poster', 'slab'],
    voice: ['glass', 'chime', 'servo', 'pulse'],
} as const;

/** The contrast floors a theme must clear (WCAG ratios). */
export const THEME_CONTRAST = { inkOnSurface: 7, accentOnSurface: 3, onAccent: 4.5, maxGroundLuminance: 0.08 } as const;

export interface LayerDef {
    /** `[a-z0-9-]{1,24}`, unique in the wrapper. */
    readonly id: string;
    /** File name of an SVG in the wrapper's folder: `[a-z0-9-]+\.svg`. */
    readonly art: string;
    /** [x, y, width, height] of the layer on the canvas, in wrapper units. */
    readonly box: readonly [number, number, number, number];
    /** Pivot for turn/scale/fold, as fractions of the box. Default [0.5, 0.5]. */
    readonly origin?: readonly [number, number];
    /** Starting pose, before any move. Missing fields are the neutral pose. */
    readonly start?: Partial<Pose>;
    /**
     * How the layer's colours combine with the layers under it. `screen` adds
     * light (neon, glows, beams on a dark scene); `multiply` darkens (shadows).
     * Default: painted normally.
     */
    readonly blend?: Blend;
    /**
     * Parallax: how much the layer shifts when the viewer moves the pointer
     * over the page or tilts the phone. 0 (default) = fixed; 1 = the most
     * (about 9 wrapper units). Give the far background a small depth and the
     * nearest things a large one, and the flat layers read as planes in space.
     * Off when the viewer asks for reduced motion.
     */
    readonly depth?: number;
}

export type Blend = 'screen' | 'multiply' | 'overlay' | 'lighten';

/** Where a layer is, relative to its box. The neutral pose is all zeros, scale 1, opacity 1. */
export interface Pose {
    /** Offset in wrapper units. */
    x: number;
    y: number;
    /** Rotation in degrees, clockwise. */
    turn: number;
    /** Scale factors. A fold is a scale through 0 on one axis. */
    sx: number;
    sy: number;
    opacity: number;
}

export type Ease = 'linear' | 'in' | 'out' | 'inout' | 'back' | 'bounce';

/**
 * One move of one layer. From `at` to `at + dur` the named pose fields go
 * from where they are to `to` (absolute values), shaped by `ease`.
 *
 * - `move`: any subset of the pose changes together (slide, turn, scale, fade).
 * - `shake`: the layer trembles `times` times by `amp` units sideways and
 *   returns to where it was.
 * - `scatter`: `count` copies of the layer fly out from its box (confetti,
 *   petals, sparks) within `spread` units, fall by `fall` units and fade.
 *   The layer itself stays hidden; only its copies show. Deterministic.
 */
export type Step =
    | { readonly kind: 'move'; readonly layer: string; readonly at: number; readonly dur: number; readonly ease?: Ease; readonly to: Partial<Pose> }
    | { readonly kind: 'shake'; readonly layer: string; readonly at: number; readonly dur: number; readonly amp: number; readonly times: number }
    | {
          readonly kind: 'scatter';
          readonly layer: string;
          readonly at: number;
          readonly dur: number;
          /** 1..40 */
          readonly count: number;
          readonly spread: number;
          readonly fall: number;
      };

/**
 * A loop: the field swings by ±`amp` around the value it has at that moment, every `period` ms.
 * For `opacity` the result is clamped to 0..1 (a layer at 0.6 with amp 0.3 breathes between 0.3 and 0.9).
 */
export interface IdleStep {
    readonly layer: string;
    readonly field: 'x' | 'y' | 'turn' | 'sx' | 'sy' | 'opacity';
    readonly amp: number;
    /** >= 1200 ms: nothing on the stage may flash. */
    readonly period: number;
    /** Phase offset, 0..1. */
    readonly phase?: number;
}

/** Hard limits the validator enforces. */
export const WRAPPER_LIMITS = {
    maxLayers: 24,
    maxSteps: 80,
    maxOpenMs: 6000,
    minIdlePeriodMs: 1200,
    maxScatterCount: 40,
    idPattern: /^[a-z0-9-]{1,24}$/,
    artPattern: /^[a-z0-9-]+\.svg$/,
    colorPattern: /^#[0-9a-fA-F]{6}$/,
} as const;

/** What the frame holds once a wrapper is on the stage. */
export interface StageHandle {
    readonly state: 'closed' | 'opening' | 'open';
    /** Play the opening. Resolves when it has finished (or was skipped). Calls `onReveal` once, at `revealAt`. */
    open(): Promise<void>;
    /** Jump to the end of the opening. */
    skip(): void;
    /** Freeze the stage at `ms` into the opening (for stills and tests). `Infinity` = fully open. */
    seek(ms: number): void;
    destroy(): void;
}

/** Test seam: a clock the stage can be driven by. Defaults to `performance.now` and the window's animation frame. */
export interface StageClock {
    now(): number;
    raf(cb: () => void): number;
    caf(id: number): void;
}

export interface StageOptions {
    /** URL prefix the wrapper's art is loaded from, e.g. `/wrappers/lixi/`. Same origin only. */
    readonly assetBase: string;
    /** Put after each picture's name, to tell one drawing of the art from the next: `?v=` and a short version, or nothing. */
    readonly assetQuery?: string;
    /** When true, the opening is a short cross-fade and idle loops do not run. */
    readonly reducedMotion: boolean;
    /** Called once when the opening passes `revealAt` (also on skip and on seek past it). */
    readonly onReveal?: () => void;
    /** Optional test seam (added by the stage builder): inject time and frames. Production code leaves it out. */
    readonly clock?: StageClock;
}
