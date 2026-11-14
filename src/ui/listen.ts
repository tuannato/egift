/**
 * The listening room: a page for the owner's ears, served only by the dev
 * server (`?demo&listen`). Whoever writes the instruments and the tunes may
 * not be able to hear them; this page is how a person who can tells them what
 * is right and what is not.
 *
 * It plays nothing until "sound on" is pressed, keeps nothing in storage, and
 * its notes leave it only by the person's own copy.
 */
import '../styles/listen.css';
import { h } from './dom';
import { WRAPPERS } from '../wrappers';
import { cue, isOn, score, setOn, setSound, setVoice } from './sound';
import { INSTRUMENT_NAMES, type Instrument, type Note } from './synth';

const LABEL: Record<Instrument, string> = {
    bell: 'Small bell',
    tine: 'Music box',
    pluck: 'Plucked string',
    wood: 'Wood block',
    glassy: 'Ringing glass',
    reed: 'Soft reed',
    brass: 'Low brass',
    pad: 'Soft pad',
    noise: 'Rustle (paper, pen, pouring)',
};

/** C major pentatonic, up: C D E G A C. */
function scale(from: number, step = 260, dur = 240): Note[] {
    return [0, 2, 4, 7, 9, 12].map((s, i) => ({ at: i * step, pitch: from + s, dur }));
}

/** The first line of an old carol (1857): three, three, then five notes up and back. */
function carol(): Note[] {
    const E = 76, G = 79, C = 72, D = 74;
    const q = 230;
    const line: [number, number][] = [[E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2], [E, 1], [G, 1], [C, 1.5], [D, 0.5], [E, 4]];
    let at = 0;
    return line.map(([pitch, beats], i) => {
        const n = { at, pitch, dur: beats * q * 0.9, gain: i === 10 ? 0.75 : 0.6 };
        at += beats * q;
        return n;
    });
}

const MARKS = ['—', 'Good', 'Not sure', 'Redo'] as const;

export function mountListen(root: HTMLElement): void {
    root.textContent = '';
    const status = h('p', { class: 'listen-status', role: 'status' }, 'Sound is off. Press "Sound on" first.');
    const onBtn = h('button', {
        type: 'button',
        class: 'listen-btn listen-btn--main',
        onclick: () => {
            setOn(!isOn());
            onBtn.textContent = isOn() ? 'Sound off' : 'Sound on';
            status.textContent = isOn() ? 'Sound is on.' : 'Sound is off.';
        },
    }, 'Sound on');

    const play = (notes: Note[], inst: Instrument): void => {
        if (!isOn()) {
            status.textContent = 'Sound is off. Press "Sound on" first.';
            return;
        }
        const ok = score.start(notes, inst);
        status.textContent = ok ? `Playing: ${LABEL[inst]}.` : 'Could not play: the browser has not allowed sound yet. Touch the page and try again.';
    };
    const btn = (text: string, fn: () => void): HTMLElement => h('button', { type: 'button', class: 'listen-btn', onclick: fn }, text);

    const notes = new Map<string, { mark: HTMLSelectElement; text: HTMLInputElement }>();
    const feedback = (id: string): HTMLElement => {
        const mark = h('select', { class: 'listen-mark', 'aria-label': `Verdict: ${id}` }, ...MARKS.map(m => h('option', { value: m }, m)));
        const text = h('input', { type: 'text', class: 'listen-note', placeholder: 'Note (optional)', 'aria-label': `Note: ${id}` });
        notes.set(id, { mark, text });
        return h('div', { class: 'listen-fb' }, mark, text);
    };

    const rows = INSTRUMENT_NAMES.map(inst =>
        h('li', { class: 'listen-row' },
            h('h3', { class: 'listen-name' }, LABEL[inst]),
            h('div', { class: 'listen-btns' },
                btn('High scale', () => play(scale(72), inst)),
                btn('Low scale', () => play(scale(55), inst)),
                btn('A phrase', () => play(carol(), inst)),
                btn('Long note', () => play([{ at: 0, pitch: 67, dur: 1600 }], inst)),
            ),
            feedback(LABEL[inst]),
        ),
    );

    const off = (): boolean => {
        if (isOn()) return false;
        status.textContent = 'Sound is off. Press "Sound on" first.';
        return true;
    };
    const tunes = WRAPPERS.filter(w => w.sound).map(w => {
        const name = w.name.en ?? w.id;
        const wear = (what: string): boolean => {
            if (off()) return false;
            setSound(w.sound);
            status.textContent = `Playing: ${name} — ${what}.`;
            return true;
        };
        return h('li', { class: 'listen-row' },
            h('h3', { class: 'listen-name' }, name),
            h('div', { class: 'listen-btns' },
                w.sound!.score?.length ? btn('Opening tune', () => wear('opening tune') && void score.start(w.sound!.score!, w.sound!.inst)) : null,
                btn('Touch', () => wear('touch') && cue.touch()),
                btn('Reveal (when the tune is skipped)', () => wear('reveal') && (score.stop(), cue.reveal())),
                btn('Taken home', () => wear('taken home') && cue.final()),
                btn('Refused', () => wear('refused') && cue.deny()),
                h('a', { class: 'listen-btn listen-link', href: `/?demo&state=funded&wrapper=${w.id}&lang=en&amount=20` }, 'See it with the picture →'),
            ),
            feedback(name),
        );
    });

    const out = h('textarea', { class: 'listen-out', rows: '8', readonly: true, 'aria-label': 'Notes to paste into the chat' });
    const copy = btn('Copy the notes', () => {
        const lines = [...notes].map(([id, n]) => `${id}: ${n.mark.value}${n.text.value.trim() ? ' — ' + n.text.value.trim() : ''}`);
        out.value = lines.join('\n');
        out.select();
        try {
            void navigator.clipboard?.writeText(out.value).catch(() => {});
        } catch {
            /* the text stays selected for a copy by hand */
        }
        status.textContent = 'Copied. If it did not work, select the text in the box below and copy it by hand.';
    });

    root.append(
        h('main', { class: 'listen' },
            h('h1', { class: 'listen-title' }, 'Listening room'),
            h('p', { class: 'listen-lead' }, 'This page exists on the dev server only. Every sound is made by the browser; there are no audio files. On an iPhone the silent switch on the side also silences the page.'),
            h('div', { class: 'listen-bar' }, onBtn, btn('Stop', () => score.stop()), status),
            h('section', { class: 'listen-sec' },
                h('h2', null, '1. Reference sound'),
                h('p', null, 'This is the "reveal" sound in use now. This loud is right: set the device volume by it before listening to the rest.'),
                h('div', { class: 'listen-btns' }, btn('Play the reference', () => {
                    if (!isOn()) return void (status.textContent = 'Sound is off. Press "Sound on" first.');
                    setVoice('glass');
                    cue.reveal();
                    status.textContent = 'Playing: the reference.';
                })),
                feedback('Reference sound'),
            ),
            h('section', { class: 'listen-sec' },
                h('h2', null, '2. Nine instruments'),
                h('p', null, 'Each instrument has four buttons. Mark it Good, Not sure or Redo, and add a note if you like (for example: harsh, dull, too quiet, sounds like a toy).'),
                h('ul', { class: 'listen-list' }, ...rows),
            ),
            h('section', { class: 'listen-sec' },
                h('h2', null, '3. Each wrapper\'s tune'),
                h('p', null, '"Opening tune" plays once when the gift opens; the other buttons are the small sounds of a press. "See it with the picture" opens that wrapper\'s gift page: slide to open and hear the tune against the picture.'),
                h('ul', { class: 'listen-list' }, ...tunes),
            ),
            h('section', { class: 'listen-sec' },
                h('h2', null, '4. Send the notes'),
                h('p', null, 'Press the button below, then paste into the chat.'),
                h('div', { class: 'listen-btns' }, copy),
                out,
            ),
        ),
    );
}
