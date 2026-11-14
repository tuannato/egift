import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../stage', async orig => {
    const real = await orig<typeof import('../stage')>();
    const { fakeMountStage } = await import('./fakestage');
    return { ...real, mountStage: fakeMountStage };
});
vi.mock('../core', async orig => {
    const real = await orig<typeof import('../core')>();
    return { ...real, newSecret: vi.fn(real.newSecret), deriveKey: vi.fn(real.deriveKey) };
});

import { deriveKey, newSecret } from '../core';
import { t } from '../i18n';
import { ambientColours } from './ambient';
import { figureWidth } from './amount';
import { holdButton } from './hold';
import { clamp01, tiltToLight } from './light';
import { odometerLength, odometerPlan } from './odometer';
import { getMade } from './session';
import { boot, buttonByText, flush, resetPage, type, type Booted } from './testkit';

let app: Booted | null = null;
beforeEach(() => {
    resetPage('en');
    vi.clearAllMocks();
});
afterEach(() => {
    app?.stop();
    app = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
});

const down = (el: Element) => el.dispatchEvent(new Event('pointerdown', { bubbles: true }));
const up = (el: Element) => el.dispatchEvent(new Event('pointerup', { bubbles: true }));

describe('the confirmation before creating', () => {
    it('a-gift-of-a-million-or-more-needs-confirmation', async () => {
        vi.useFakeTimers();
        app = boot();
        const amount = app.root.querySelector('#f-amount') as HTMLInputElement;
        const box = app.root.querySelector('#f-confirm') as HTMLInputElement;
        type(amount, '999999');
        expect(box.checked).toBe(false);
        expect(box.disabled).toBe(false);
        type(amount, '1000000');
        // From a million up the question is always on, and cannot be switched off.
        expect(box.checked).toBe(true);
        expect(box.disabled).toBe(true);
        expect(app.root.textContent).toContain(t('create.confirm.forced', { min: '1,000,000' }));
        (app.root.querySelector('button[type=submit]') as HTMLButtonElement).click();
        expect(newSecret).not.toHaveBeenCalled();
        expect(getMade()).toBeNull();
        // The amount is restated before anything is made.
        expect(app.root.textContent).toContain(t('create.confirm.body', { amount: '1,000,000', wrapper: 'Transmission' }));
        const hold = buttonByText(app.root, t('create.confirm.hold'));
        down(hold);
        vi.advanceTimersByTime(1300);
        expect(newSecret).toHaveBeenCalledTimes(1);
        expect(getMade()?.sats).toBe(100_000_000n);
    });

    it('the-giver-can-turn-confirmation-on-for-any-gift', async () => {
        vi.useFakeTimers();
        app = boot();
        type(app.root.querySelector('#f-amount') as HTMLInputElement, '25');
        const box = app.root.querySelector('#f-confirm') as HTMLInputElement;
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        (app.root.querySelector('button[type=submit]') as HTMLButtonElement).click();
        expect(getMade()).toBeNull();
        const hold = buttonByText(app.root, t('create.confirm.hold'));
        down(hold);
        vi.advanceTimersByTime(1300);
        expect(getMade()?.sats).toBe(2500n);
    });

    it('no-key-is-made-before-the-confirmation-is-completed', async () => {
        vi.useFakeTimers();
        app = boot();
        type(app.root.querySelector('#f-amount') as HTMLInputElement, '5000000');
        (app.root.querySelector('button[type=submit]') as HTMLButtonElement).click();
        const hold = buttonByText(app.root, t('create.confirm.hold'));
        // Letting go early cancels: nothing is made.
        down(hold);
        vi.advanceTimersByTime(700);
        up(hold);
        vi.advanceTimersByTime(2000);
        expect(newSecret).not.toHaveBeenCalled();
        expect(deriveKey).not.toHaveBeenCalled();
        expect(getMade()).toBeNull();
        // Going back shows the Create button again, still with no key.
        buttonByText(app.root, t('create.confirm.cancel')).click();
        expect(app.root.querySelector('button[type=submit]')).toBeTruthy();
        expect(newSecret).not.toHaveBeenCalled();
    });

    it('the confirmation choice is never written to storage', async () => {
        app = boot();
        const box = app.root.querySelector('#f-confirm') as HTMLInputElement;
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        await flush();
        expect(localStorage.length).toBe(0);
        expect(sessionStorage.length).toBe(0);
    });
});

describe('hold to confirm', () => {
    it('fires once after the full press and never after an early release', () => {
        vi.useFakeTimers();
        const done = vi.fn();
        const b = holdButton({ label: 'Hold', again: 'Again', ms: 1000, onDone: done });
        document.body.append(b);
        down(b);
        vi.advanceTimersByTime(999);
        up(b);
        vi.advanceTimersByTime(5000);
        expect(done).not.toHaveBeenCalled();
        down(b);
        vi.advanceTimersByTime(1000);
        expect(done).toHaveBeenCalledTimes(1);
        down(b);
        vi.advanceTimersByTime(3000);
        expect(done).toHaveBeenCalledTimes(1);
    });

    it('with reduced motion it is two separate presses', () => {
        const done = vi.fn();
        const b = holdButton({ label: 'Hold', again: 'Again', twoPress: true, onDone: done });
        document.body.append(b);
        b.click();
        expect(done).not.toHaveBeenCalled();
        expect(b.textContent).toBe('Again');
        b.click();
        expect(done).toHaveBeenCalledTimes(1);
    });
});

describe('the pure parts of the theatre', () => {
    it('the odometer rolls every digit from zero, the last digit first', () => {
        const plan = odometerPlan('1.234,56', 70);
        expect(plan.map(c => c.ch).join('')).toBe('1.234,56');
        expect(plan.filter(c => c.digit === null).map(c => c.ch)).toEqual(['.', ',']);
        const digits = plan.filter(c => c.digit !== null);
        expect(digits.map(c => c.digit)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(digits.map(c => c.delay)).toEqual([350, 280, 210, 140, 70, 0]);
        expect(odometerLength('1.234,56', 900, 70)).toBe(900 + 5 * 70);
        expect(odometerLength('7', 900, 70)).toBe(900);
    });

    it('a figure is measured in digit widths, separators as halves', () => {
        expect(figureWidth('888,88')).toBe(5.5);
        expect(figureWidth('1.234.567,89')).toBe(10.5);
        expect(figureWidth('')).toBe(2);
    });

    it('the light stays within 0..1 whatever the tilt', () => {
        expect(clamp01(-3)).toBe(0);
        expect(clamp01(7)).toBe(1);
        expect(tiltToLight(0, 45)).toEqual([0.5, 0.5]);
        expect(tiltToLight(-500, 500)).toEqual([0, 1]);
    });

    it('a wrapper lights the page with its own colours, and anything else falls back to the neutral light', () => {
        expect(ambientColours({ ambient: ['#FF0000', '#00FF00', '#0000FF'] })).toEqual(['#FF0000', '#00FF00', '#0000FF']);
        expect(ambientColours({ ambient: ['#FF0000', '#00FF00'] })).toEqual(['#FF0000', '#00FF00', '#FF0000']);
        const neutral = ambientColours(undefined);
        expect(ambientColours({ ambient: ['red', 'url(x)'] })).toEqual(neutral);
        expect(ambientColours({ ambient: ['#FF0000'] })).toEqual(neutral);
    });
});

import { cue, getVoice, isOn, setOn, setVoice, wake } from './sound';
import { makeCapsule } from './capsule';
import { h } from './dom';

describe('sound', () => {
    const made = vi.fn();
    const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
    class FakeCtx {
        currentTime = 0;
        destination = {};
        constructor() {
            made();
        }
        createOscillator() {
            return { type: 'sine', frequency: param(), connect() {}, start() {}, stop() {} };
        }
        createGain() {
            return { gain: param(), connect() {} };
        }
        suspend() {
            return Promise.resolve();
        }
        resume() {
            return Promise.resolve();
        }
    }
    const press = (el: Element) => el.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    beforeEach(() => {
        made.mockClear();
        (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    });
    afterEach(() => {
        delete (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
    });

    it('sound-is-off-until-the-capsule-is-touched', () => {
        // The page arrives silent: every cue is a no-op and nothing is constructed.
        expect(isOn()).toBe(false);
        cue.touch();
        cue.open();
        cue.scrub(0.5);
        cue.scrubEnd();
        cue.reveal();
        cue.final();
        cue.deny();
        expect(made).not.toHaveBeenCalled();
        // A press anywhere else on the page starts nothing.
        const cap = makeCapsule([h('button', { type: 'button' }, 'x')]);
        const elsewhere = h('button', { type: 'button' }, 'y');
        document.body.append(cap.el, elsewhere);
        press(elsewhere);
        expect(isOn()).toBe(false);
        expect(made).not.toHaveBeenCalled();
        // The first touch on the capsule wakes it, inside that press, once.
        press(cap.el.querySelector('button')!);
        expect(isOn()).toBe(true);
        expect(made).toHaveBeenCalledTimes(1);
        press(cap.el);
        cue.scrub(0.3);
        cue.scrubEnd();
        expect(made).toHaveBeenCalledTimes(1);
        cap.destroy();
    });

    it('switched off by hand, a touch on the capsule does not bring sound back', () => {
        const cap = makeCapsule([h('button', { type: 'button' }, 'x')]);
        document.body.append(cap.el);
        setOn(false);
        press(cap.el);
        expect(isOn()).toBe(false);
        expect(made).not.toHaveBeenCalled();
        expect(wake()).toBe(true);
        expect(isOn()).toBe(false);
        // Switched on by hand: on, with no touch on the capsule needed.
        setOn(true);
        expect(isOn()).toBe(true);
        expect(made).toHaveBeenCalledTimes(1);
        cap.destroy();
    });

    it('the speaker shows off on arrival and follows the capsule; the voice follows the wrapper', async () => {
        const app = boot(undefined, { stay: true });
        const speaker = app.root.querySelector('.sound') as HTMLButtonElement;
        expect(speaker.getAttribute('aria-pressed')).toBe('false');
        expect(getVoice()).toBe('glass');
        press(app.root.querySelector('.capsule')!);
        expect(speaker.getAttribute('aria-pressed')).toBe('true');
        speaker.click();
        expect(speaker.getAttribute('aria-pressed')).toBe('false');
        expect(isOn()).toBe(false);
        // Trying a wrapper on changes the instrument.
        (app.root.querySelector('.door[data-id="mecha"] .door-btn') as HTMLButtonElement).click();
        expect(getVoice()).toBe('servo');
        setVoice('glass');
        app.stop();
    });
});

import { capsuleHeight } from './capsule';
import { SLIDE_COMMIT, slideProgress, slideToOpen } from './slide';

describe('the capsule and the slide', () => {
    it('the capsule takes the height of what it holds, up to its limit', () => {
        expect(capsuleHeight(120, 0, 500)).toBe(120);
        expect(capsuleHeight(120.2, 24, 500)).toBe(145);
        expect(capsuleHeight(900, 24, 500)).toBe(500);
        expect(capsuleHeight(-5, -5, 500)).toBe(0);
    });

    it('the slide measures the drag within its track', () => {
        expect(slideProgress(0, 200)).toBe(0);
        expect(slideProgress(100, 200)).toBe(0.5);
        expect(slideProgress(900, 200)).toBe(1);
        expect(slideProgress(-40, 200)).toBe(0);
        expect(slideProgress(50, 0)).toBe(0);
        expect(SLIDE_COMMIT).toBeGreaterThan(0.5);
    });

    it('pressing the knob opens once; it is a real button with a name', () => {
        const commit = vi.fn();
        const el = slideToOpen({ hint: 'Slide to open', label: 'Open the gift', onScrub: () => {}, onCancel: () => {}, onCommit: commit });
        document.body.append(el);
        const knob = el.querySelector('button') as HTMLButtonElement;
        expect(knob.getAttribute('aria-label')).toBe('Open the gift');
        knob.click();
        knob.click();
        expect(commit).toHaveBeenCalledTimes(1);
    });

    it('a drag let go before the end closes again and is never taken for a press', () => {
        const commit = vi.fn();
        const cancel = vi.fn();
        const el = slideToOpen({ hint: 'Slide to open', label: 'Open the gift', onScrub: () => {}, onCancel: cancel, onCommit: commit });
        document.body.append(el);
        const knob = el.querySelector('button') as HTMLButtonElement;
        // The track has no layout here: one pixel of travel, so any distance is "all the way". Give it room.
        Object.defineProperty(el, 'clientWidth', { value: 300 });
        Object.defineProperty(knob, 'offsetWidth', { value: 54 });
        const ptr = (type: string, x: number) => {
            const e = new Event(type, { bubbles: true }) as Event & { clientX: number; button: number; pointerId: number };
            e.clientX = x;
            e.button = 0;
            e.pointerId = 1;
            knob.dispatchEvent(e);
        };
        // Down, then up halfway along with no move reported in between (some browsers and tools do this), then the click.
        ptr('pointerdown', 10);
        ptr('pointerup', 120);
        knob.click();
        expect(commit).not.toHaveBeenCalled();
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(el.style.getPropertyValue('--p')).toBe('0.0000');
        // The same drag taken to the end opens, once.
        ptr('pointerdown', 10);
        ptr('pointermove', 200);
        ptr('pointerup', 260);
        knob.click();
        expect(commit).toHaveBeenCalledTimes(1);
    });
});
