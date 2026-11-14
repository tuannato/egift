import type { WrapperDef } from './format';

/**
 * Test-only wrapper: the original placeholder envelope, frozen here so the
 * stage tests do not move when the shipped art changes. It needs no art files
 * (happy-dom never loads images). It exercises every move kind and an idle loop.
 */
export const FIXTURE: WrapperDef = {
    id: 'lixi',
    name: { vi: 'Bao lì xì', en: 'Red envelope' },
    size: [360, 450],
    backdrop: '#fbe9d0',
    layers: [
        { id: 'back', art: 'back.svg', box: [30, 190, 300, 230] },
        { id: 'card', art: 'card.svg', box: [60, 235, 240, 170] },
        { id: 'body', art: 'body.svg', box: [30, 215, 300, 205] },
        { id: 'flap', art: 'flap.svg', box: [30, 190, 300, 120], origin: [0.5, 0] },
        { id: 'seal', art: 'seal.svg', box: [150, 270, 60, 60] },
        { id: 'petals', art: 'petal.svg', box: [165, 300, 30, 30] },
    ],
    idle: [
        { layer: 'back', field: 'y', amp: 3, period: 3000 },
        { layer: 'card', field: 'y', amp: 3, period: 3000 },
        { layer: 'body', field: 'y', amp: 3, period: 3000 },
        { layer: 'flap', field: 'y', amp: 3, period: 3000 },
        { layer: 'seal', field: 'y', amp: 3, period: 3000 },
        { layer: 'seal', field: 'turn', amp: 4, period: 2400, phase: 0.25 },
    ],
    open: [
        { kind: 'shake', layer: 'seal', at: 0, dur: 500, amp: 5, times: 6 },
        { kind: 'move', layer: 'seal', at: 500, dur: 350, ease: 'back', to: { sx: 1.6, sy: 1.6 } },
        { kind: 'move', layer: 'seal', at: 500, dur: 350, ease: 'out', to: { y: -30 } },
        { kind: 'move', layer: 'seal', at: 500, dur: 350, ease: 'in', to: { opacity: 0 } },
        { kind: 'scatter', layer: 'petals', at: 850, dur: 1800, count: 18, spread: 150, fall: 140 },
        { kind: 'move', layer: 'flap', at: 800, dur: 600, ease: 'inout', to: { sy: -1 } },
        { kind: 'move', layer: 'flap', at: 1400, dur: 250, ease: 'linear', to: { opacity: 0 } },
        { kind: 'move', layer: 'card', at: 1200, dur: 1100, ease: 'back', to: { y: -150 } },
        { kind: 'move', layer: 'card', at: 2300, dur: 450, ease: 'bounce', to: { sx: 1.06, sy: 1.06 } },
    ],
    revealAt: 1600,
};
