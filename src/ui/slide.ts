import { h, svg } from './dom';

export interface SlideOpts {
    /** What the track says: "Slide to open". */
    readonly hint: string;
    /** The knob's name for a keyboard or a screen reader: "Open the gift". Pressing it opens. */
    readonly label: string;
    /** While the knob is dragged: how far, 0..1. The gift's opening is scrubbed to match. */
    readonly onScrub: (progress: number) => void;
    /** Let go before the end: back to closed. */
    readonly onCancel: () => void;
    /** Dragged to the end, or pressed: open. Called once. */
    readonly onCommit: () => void;
}

/** How far along the track the knob is, 0..1, for a drag of `dx` px on a track with `room` px of travel. Pure. */
export function slideProgress(dx: number, room: number): number {
    if (!(room > 0)) return 0;
    const p = dx / room;
    return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** Past this point, letting go opens the gift. */
export const SLIDE_COMMIT = 0.86;

/**
 * Slide to open. The knob is a real button (press it and the gift opens);
 * dragged, it pulls the gift's own opening along with the thumb, frame by
 * frame, and springs back if released early.
 */
export function slideToOpen(o: SlideOpts): HTMLElement {
    const bow = svg(
        'svg',
        { viewBox: '0 0 24 24', width: '22', height: '22', 'aria-hidden': 'true' },
        svg('path', { d: 'M12 12C9 6.5 3.5 6.5 3.5 12S9 17.5 12 12zM12 12c3-5.5 8.5-5.5 8.5 0S15 17.5 12 12z' }),
    );
    const knob = h('button', { type: 'button', class: 'slide-knob', 'aria-label': o.label }, bow);
    const fill = h('span', { class: 'slide-fill', 'aria-hidden': 'true' });
    const hint = h('span', { class: 'slide-hint', 'aria-hidden': 'true' }, o.hint);
    const track = h('div', { class: 'slide' }, fill, hint, knob);
    let startX = 0;
    let room = 0;
    let dragging = false;
    let moved = false;
    let done = false;

    const set = (p: number): void => {
        track.style.setProperty('--p', p.toFixed(4));
    };
    const commit = (): void => {
        if (done) return;
        done = true;
        track.classList.remove('is-dragging');
        track.classList.add('is-done');
        set(1);
        o.onCommit();
    };

    knob.addEventListener('pointerdown', e => {
        if (done || (e.button !== undefined && e.button !== 0)) return;
        dragging = true;
        moved = false;
        startX = e.clientX;
        room = Math.max(1, track.clientWidth - knob.offsetWidth - 8);
        track.classList.add('is-dragging');
        try {
            knob.setPointerCapture(e.pointerId);
        } catch {
            /* capture is a nicety */
        }
    });
    knob.addEventListener('pointermove', e => {
        if (!dragging || done) return;
        const p = slideProgress(e.clientX - startX, room);
        if (p > 0.02) moved = true;
        set(p);
        o.onScrub(p);
    });
    const release = (e: PointerEvent): void => {
        if (!dragging || done) return;
        dragging = false;
        track.classList.remove('is-dragging');
        const p = slideProgress(e.clientX - startX, room);
        // A release away from where the press began was a drag, whether or not a move was reported in between:
        // the click that follows it must not count as a press.
        if (p > 0.02) moved = true;
        if (p >= SLIDE_COMMIT) return commit();
        set(0);
        if (moved) o.onCancel();
    };
    knob.addEventListener('pointerup', release);
    knob.addEventListener('pointercancel', release);
    // A plain press (keyboard, or a tap without a drag) opens.
    knob.addEventListener('click', () => {
        if (!moved) commit();
        moved = false;
    });
    return track;
}
