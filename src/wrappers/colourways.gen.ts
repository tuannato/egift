// Written by scripts/colourways.mjs. Do not edit: change the rules there and run it again.
/* eslint-disable */

/** One colourway of a wrapper's art: which pictures have a recoloured twin, and the colour map. */
export interface Colourway {
    readonly id: string;
    /** The colour that stands for it on the chip a giver presses. */
    readonly chip: string;
    /** The wrapper's pictures that change; the twin of `x.svg` is `cw-<id>-x.svg`. */
    readonly files: readonly string[];
    /** Upper-case hex to upper-case hex. */
    readonly map: Readonly<Record<string, string>>;
}

export const COLOURWAYS: Readonly<Record<string, { readonly own: string; readonly ways: readonly Colourway[] }>> = {
    snowbox: {
        own: '#1A3A5C',
        ways: [
            {
                id: 'pine',
                chip: '#02442F',
                files: ['disc.svg', 'ground.svg', 'pines.svg', 'sky.svg', 'trace.svg'],
                map: { '#091626': '#021B11', '#0A1626': '#031B11', '#0E2036': '#02271A', '#1A3A5C': '#02442F', '#34618F': '#1D6E51' },
            },
            {
                id: 'plum',
                chip: '#4A2954',
                files: ['disc.svg', 'ground.svg', 'pines.svg', 'sky.svg', 'trace.svg'],
                map: { '#091626': '#1D0F22', '#0A1626': '#1D0F22', '#0E2036': '#2A1630', '#1A3A5C': '#4A2954', '#34618F': '#764A84' },
            },
        ],
    },
    cake: {
        own: '#1B4854',
        ways: [
            {
                id: 'plum',
                chip: '#51335E',
                files: ['cake.svg', 'field.svg', 'garland.svg', 'grain.svg'],
                map: { '#050D11': '#0F0813', '#0A222B': '#28172F', '#12343F': '#3B2446', '#1B4854': '#51335E' },
            },
            {
                id: 'forest',
                chip: '#1F4C31',
                files: ['cake.svg', 'field.svg', 'garland.svg', 'grain.svg'],
                map: { '#050D11': '#050E08', '#0A222B': '#0A2515', '#12343F': '#143722', '#1B4854': '#1F4C31' },
            },
        ],
    },
    fold: {
        own: '#C4572A',
        ways: [
            {
                id: 'indigo',
                chip: '#4E7ACD',
                files: ['end-a.svg', 'end-b.svg', 'knot.svg', 'sun.svg', 'thread.svg'],
                map: { '#9A4420': '#3D5FA1', '#C4572A': '#4E7ACD', '#D9693A': '#5E8CE2' },
            },
            {
                id: 'moss',
                chip: '#5C8B52',
                files: ['end-a.svg', 'end-b.svg', 'knot.svg', 'sun.svg', 'thread.svg'],
                map: { '#9A4420': '#486D40', '#C4572A': '#5C8B52', '#D9693A': '#6D9D62' },
            },
        ],
    },
    wreath: {
        own: '#9C4C2C',
        ways: [
            {
                id: 'spring',
                chip: '#B0586A',
                files: ['blade-3.svg', 'blade-5.svg', 'blade-6.svg', 'blade-9.svg', 'fall-1.svg', 'fall-2.svg', 'flame.svg', 'glow.svg', 'paper.svg', 'ring-a.svg', 'ring-b.svg', 'ring-c.svg', 'scene.svg'],
                map: { '#6A6B2B': '#4E7A44', '#8E4324': '#A24F60', '#9C4C2C': '#B0586A' },
            },
            {
                id: 'frost',
                chip: '#396999',
                files: ['blade-3.svg', 'blade-5.svg', 'blade-6.svg', 'blade-9.svg', 'fall-1.svg', 'fall-2.svg', 'flame.svg', 'glow.svg', 'paper.svg', 'ring-a.svg', 'ring-b.svg', 'ring-c.svg', 'scene.svg'],
                map: { '#6A6B2B': '#2F7470', '#8E4324': '#315F8C', '#9C4C2C': '#396999' },
            },
        ],
    },
};
