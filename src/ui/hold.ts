import { h } from './dom';

export interface HoldOpts {
    readonly label: string;
    /** What the button says after the first press, when holding is replaced by two presses (reduced motion). */
    readonly again: string;
    /** How long the press must last. */
    readonly ms?: number;
    /** Two separate presses instead of one held press. */
    readonly twoPress?: boolean;
    readonly onDone: () => void;
}

/**
 * A deliberate action: the button must be held until its ring fills
 * (pointer, or Space / Enter on a keyboard). Letting go early cancels and
 * nothing happens. With reduced motion it is two separate presses. `onDone`
 * runs once.
 */
export function holdButton(o: HoldOpts): HTMLButtonElement {
    const ms = o.ms ?? 1200;
    const text = h('span', { class: 'hold-label' }, o.label);
    const btn = h('button', { type: 'button', class: 'btn btn-primary btn-hold' }, h('span', { class: 'hold-fill', 'aria-hidden': 'true' }), text);
    btn.style.setProperty('--hold-ms', `${ms}ms`);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let done = false;
    let armed = false;
    let disarm: ReturnType<typeof setTimeout> | null = null;
    /** A key press started a hold: the click some browsers send after it is not a second way in. */
    let keyed = false;

    const finish = (): void => {
        if (done) return;
        done = true;
        if (disarm !== null) clearTimeout(disarm);
        btn.classList.remove('is-holding');
        btn.classList.add('is-done');
        btn.disabled = true;
        // A hold that outlives its screen (Back was pressed meanwhile) makes nothing.
        if (!btn.isConnected) return;
        o.onDone();
    };
    const start = (): void => {
        if (done || timer !== null || btn.disabled) return;
        btn.classList.add('is-holding');
        timer = setTimeout(() => {
            timer = null;
            finish();
        }, ms);
    };
    const cancel = (): void => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        btn.classList.remove('is-holding');
    };

    if (o.twoPress) {
        btn.addEventListener('click', () => {
            if (done) return;
            if (armed) return finish();
            armed = true;
            text.textContent = o.again;
            btn.classList.add('is-armed');
            disarm = setTimeout(() => {
                armed = false;
                text.textContent = o.label;
                btn.classList.remove('is-armed');
            }, 6000);
        });
        return btn;
    }
    btn.addEventListener('pointerdown', e => {
        if (e.button !== undefined && e.button !== 0) return;
        start();
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'blur'] as const) btn.addEventListener(ev, cancel);
    btn.addEventListener('keydown', e => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            keyed = true;
            start();
        }
    });
    btn.addEventListener('keyup', e => {
        if (e.key === ' ' || e.key === 'Enter') cancel();
    });
    // A screen reader (or a switch) "activates" the button: a click with no press behind it. There is nothing to
    // hold then, so it is two separate activations, as with reduced motion.
    btn.addEventListener('click', e => {
        // Some browsers send the click of a Space press when the key comes up: that press was a hold, not an activation.
        if (keyed) {
            keyed = false;
            return;
        }
        if (e.detail !== 0 || done || timer !== null || btn.disabled) return;
        if (armed) return finish();
        armed = true;
        text.textContent = o.again;
        btn.classList.add('is-armed');
        disarm = setTimeout(() => {
            armed = false;
            text.textContent = o.label;
            btn.classList.remove('is-armed');
        }, 6000);
    });
    btn.addEventListener('contextmenu', e => e.preventDefault());
    void disarm;
    return btn;
}
