import { describe, expect, it } from 'vitest';
import { explorerRef, explorerUrl } from './explorer';

const ADDRESS = 'ecash:qpx5prg4egjlzyke989u3n8vj46996y59cavnw7vzp';
const ID = '353f366dd246ac2b3c80f75baa7d842a0967eb593ef45de25d76f5ecef955095';

describe('the way out to the explorer', () => {
    it('goes to one fixed site, by an address or an id of the right shape, and nowhere else', () => {
        expect(explorerUrl('address', ADDRESS)).toBe(`https://explorer.e.cash/address/${ADDRESS}`);
        expect(explorerUrl('tx', ID)).toBe(`https://explorer.e.cash/tx/${ID}`);
        expect(explorerUrl('token', ID)).toBe(`https://explorer.e.cash/tx/${ID}`);
        for (const bad of ['', 'qpx5prg4egjlzyke989u3n8vj46996y59cavnw7vzp', ADDRESS + '/../x', ADDRESS + '#1.0.abc', 'https://evil.example/', ADDRESS.toUpperCase()]) expect(explorerUrl('address', bad), bad).toBeNull();
        for (const bad of ['', ID.slice(1), ID + '0', ID.toUpperCase(), ID.slice(0, 60) + '/../', ADDRESS]) expect(explorerUrl('tx', bad), bad).toBeNull();
    });

    it('is a button, never a link; with nowhere to go it is plain text', () => {
        const ref = explorerRef('address', ADDRESS, 'qpx5…7vzp');
        expect(ref.tagName).toBe('BUTTON');
        expect(ref.textContent).toContain('qpx5…7vzp');
        expect(ref.getAttribute('aria-label')).toContain('qpx5…7vzp');
        const plain = explorerRef('address', 'nope', 'nope');
        expect(plain.tagName).toBe('SPAN');
        expect(plain.querySelector('button')).toBeNull();
    });
});
