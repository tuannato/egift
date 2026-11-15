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
    vinyl: {
        own: '#D9432B',
        ways: [
            {
                id: 'blue',
                chip: '#277EE2',
                files: ['arm.svg', 'deck.svg', 'disc.svg', 'note-a.svg', 'note-b.svg', 'ring-a.svg', 'ring-b.svg', 'ring-c.svg', 'sleeve.svg'],
                map: { '#A8301D': '#1A60AF', '#D9432B': '#277EE2', '#E8B33A': '#2CD6CF' },
            },
            {
                id: 'rose',
                chip: '#CA458A',
                files: ['arm.svg', 'deck.svg', 'disc.svg', 'note-a.svg', 'note-b.svg', 'ring-a.svg', 'ring-b.svg', 'ring-c.svg', 'sleeve.svg'],
                map: { '#A8301D': '#9C3269', '#D9432B': '#CA458A', '#E8B33A': '#C7ABFC' },
            },
        ],
    },
    bottle: {
        own: '#1E5C6E',
        ways: [
            {
                id: 'violet',
                chip: '#544B7A',
                files: ['chart.svg', 'night.svg', 'wave-a.svg', 'wave-b.svg', 'wave-c.svg'],
                map: { '#06121C': '#110E1D', '#0A1C2A': '#1B172B', '#0D2233': '#211C34', '#12324A': '#30294C', '#1E5C6E': '#544B7A', '#3F8F92': '#8277B0' },
            },
            {
                id: 'green',
                chip: '#2E5F46',
                files: ['chart.svg', 'night.svg', 'wave-a.svg', 'wave-b.svg', 'wave-c.svg'],
                map: { '#06121C': '#05140D', '#0A1C2A': '#091F14', '#0D2233': '#0B2619', '#12324A': '#0F3825', '#1E5C6E': '#2E5F46', '#3F8F92': '#558F71' },
            },
        ],
    },
    seeds: {
        own: '#D0607A',
        ways: [
            {
                id: 'sunflower',
                chip: '#D37F22',
                files: ['bloom.svg', 'field.svg', 'packet.svg'],
                map: { '#A8405C': '#A96000', '#D0607A': '#D37F22' },
            },
            {
                id: 'lavender',
                chip: '#9676CC',
                files: ['bloom.svg', 'field.svg', 'packet.svg'],
                map: { '#A8405C': '#7556A6', '#D0607A': '#9676CC' },
            },
        ],
    },
    crane: {
        own: '#D8432F',
        ways: [
            {
                id: 'blue',
                chip: '#2380DA',
                files: ['body.svg', 'neck.svg', 'sheet-low.svg', 'sheet-up.svg', 'strings-a.svg', 'strings-b.svg', 'tail.svg', 'wing-l.svg', 'wing-r.svg'],
                map: { '#A9301F': '#1462AB', '#B5321F': '#1369B7', '#D8432F': '#2380DA' },
            },
            {
                id: 'saffron',
                chip: '#C77900',
                files: ['body.svg', 'neck.svg', 'sheet-low.svg', 'sheet-up.svg', 'strings-a.svg', 'strings-b.svg', 'tail.svg', 'wing-l.svg', 'wing-r.svg'],
                map: { '#A9301F': '#9E5E00', '#B5321F': '#A76400', '#D8432F': '#C77900' },
            },
        ],
    },
    cradle: {
        own: '#6AA88A',
        ways: [
            {
                id: 'lilac',
                chip: '#A08EC2',
                files: ['hang-3.svg', 'hang-4.svg', 'hang-5.svg', 'room.svg'],
                map: { '#6AA88A': '#A08EC2', '#CFE5D6': '#E1DAF1' },
            },
            {
                id: 'peach',
                chip: '#C8847B',
                files: ['hang-3.svg', 'hang-4.svg', 'hang-5.svg', 'room.svg'],
                map: { '#6AA88A': '#C8847B', '#CFE5D6': '#F4D7D2' },
            },
        ],
    },
    orbit: {
        own: '#3D4F8F',
        ways: [
            {
                id: 'violet',
                chip: '#624283',
                files: ['giant.svg', 'line.svg', 'moon.svg', 'sky.svg', 'small.svg', 'stars.svg', 'sun.svg'],
                map: { '#0B1230': '#1C0C2B', '#101736': '#211130', '#141E4A': '#2C1542', '#25336B': '#452861', '#3D4F8F': '#624283', '#9FB2D9': '#BBA9D1', '#A9C6F5': '#CFB9EC' },
            },
            {
                id: 'teal',
                chip: '#006065',
                files: ['giant.svg', 'line.svg', 'moon.svg', 'sky.svg', 'small.svg', 'stars.svg', 'sun.svg'],
                map: { '#0B1230': '#001A1B', '#101736': '#001F21', '#141E4A': '#00292B', '#25336B': '#004144', '#3D4F8F': '#006065', '#9FB2D9': '#89BDBF', '#A9C6F5': '#91D2D5' },
            },
        ],
    },
};
