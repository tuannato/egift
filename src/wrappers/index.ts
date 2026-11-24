import type { WrapperDef } from '../stage/format';
import { lixi } from './lixi';
import { mecha } from './mecha';
import { signal } from './signal';
import { fold } from './fold';
import { cake } from './cake';
import { letter } from './letter';
import { inkwash } from './inkwash';
import { snowbox } from './snowbox';
import { fireworks } from './fireworks';
import { dopaper } from './dopaper';
import { lantern } from './lantern';
import { bouquet } from './bouquet';
import { lace } from './lace';
import { cloudmoon } from './cloudmoon';
import { diploma } from './diploma';
import { wreath } from './wreath';
import { skyline } from './skyline';
import { basket } from './basket';
import { latte } from './latte';
import { dawn } from './dawn';
import { pumpkin } from './pumpkin';
import { rangoli } from './rangoli';
import { paperbag } from './paperbag';
import { archmoon } from './archmoon';
import { vinyl } from './vinyl';
import { bottle } from './bottle';
import { seeds } from './seeds';
import { crane } from './crane';
import { cradle } from './cradle';
import { orbit } from './orbit';
import { curtain } from './curtain';
import { medal } from './medal';
import { neon } from './neon';
import { sakura } from './sakura';
import { compass } from './compass';
import { cylinder } from './cylinder';
import { airmail } from './airmail';
import { beacon } from './beacon';
import { lotus } from './lotus';
import { keys } from './keys';
import { domino } from './domino';
import { chest } from './chest';
import { aurora } from './aurora';
import { pop } from './pop';
import { flap } from './flap';
import { drone } from './drone';
import { stars } from './stars';
import { umbrella } from './umbrella';
import { starship } from './starship';
import { terminal } from './terminal';
import { hanukkiah } from './hanukkiah';
import { harvest } from './harvest';
import { bauble } from './bauble';
import { shutters } from './shutters';
import { fir } from './fir';

/** The built-in wrappers, in the order the picker shows them. */
import { lock } from './lock';
import { midnight } from './midnight';
import { balldrop } from './balldrop';
import { confetti } from './confetti';
import { candybox } from './candybox';
import { papercut } from './papercut';
import { firecrackers } from './firecrackers';

/**
 * The wrapper of a locked gift, before its riddle is answered: whatever the
 * giver chose is shown only after the right answer. It is not on the shelf,
 * cannot be picked or named by a link, and has no price.
 */
export const LOCK_WRAPPER: WrapperDef = lock;

export const WRAPPERS: readonly WrapperDef[] = [lixi, mecha, signal, fold, cake, letter, inkwash, snowbox, fireworks, dopaper, lantern, bouquet, lace, cloudmoon, diploma, wreath, skyline, basket, latte, dawn, pumpkin, rangoli, paperbag, archmoon, vinyl, bottle, seeds, crane, cradle, orbit, curtain, medal, neon, sakura, compass, cylinder, airmail, beacon, lotus, keys, domino, chest, aurora, pop, flap, drone, stars, umbrella, starship, terminal, hanukkiah, harvest, bauble, shutters, fir, midnight, balldrop, confetti, candybox, papercut, firecrackers];

export function wrapperById(id: string): WrapperDef | undefined {
    return WRAPPERS.find(w => w.id === id);
}

// What a wrapper costs, which are for a holiday, and the words of a wrapper in a language: kept apart from the
// definitions so that the shop can read them without fetching every wrapper's scene.
export * from './meta';
