import { describe, expect, it } from 'vitest';
import { cleanUserText, setUserText } from './text';

describe('setUserText', () => {
    it('removes controls, bidi and zero-width characters, keeps newlines, collapses blank runs', () => {
        expect(cleanUserText('a\u0000b\u0007c\u007Fd\u0085e‮f⁦g​h﻿i')).toBe('abcdefghi');
        expect(cleanUserText('x\n\n\n\n\ny\nz')).toBe('x\n\ny\nz');
        expect(cleanUserText('Chúc mừng ạ')).toBe('Chúc mừng ạ');
    });
    it('uses textContent only and never makes links or elements', () => {
        const el = document.createElement('div');
        setUserText(el, '<a href="https://x.test">x</a><img src=x onerror=alert(1)> https://x.test');
        expect(el.children).toHaveLength(0);
        expect(el.textContent).toContain('<a href');
    });
});
