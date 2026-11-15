// The museum (?debug&room=museum): one live exhibit per system, each a scripted try in a scene with a sign. The hero's
// exhibits and the don'ts are here; features add theirs with a museum() hook.
import { BLOCK, fill } from '../world/well.js';
import { COLS, TILE } from '../world/wells-data.js';
import { placeHero } from '../player/hero.js';
import { HERO } from '../player/hero-data.js';

/** @type {import('../game/loop.js').Exhibit[]} */
const OWN = [
    {
        id: 'wallkick', title: 'Wall kick', file: 'src/player/hero.js step',
        text: 'A dash into a wall, floor or crate bounces you off it and gives the bonk back, so you can bonk again.',
        start(w) { placeHero(w, 2 * TILE, 6 * TILE); fill(w, 1, COLS - 2, 12, BLOCK); },
        ctrl: (w, s, n)=> ({ x: -1, y: 0, held: n === 0, pressed: n === 0 }),
        done: (w)=> w.player.bounceAt >= 0,
        passed: (w)=> w.player.vx > 0 && w.player.vy < 0 && w.player.bonk,
    },
    {
        id: 'sealed', title: 'Don\'t: a ledge wall to wall', file: 'src/world/wells-data.js (the chunks)',
        wrong: 'Nothing breaks a block, so the hero can never get below it. Leave a gap or use crates.',
        text: 'Every chunk needs a way down: a gap, or crates a bonk can break.',
        start(w) { fill(w, 1, COLS - 2, 10, BLOCK); placeHero(w, 4 * TILE, 10 * TILE - HERO.h); },
        ctrl: (w, s, n)=> ({ x: n % 120 < 60 ? 1 : -1, y: 0, held: n % 40 === 0, pressed: n % 40 === 0 }),
        done: (w, s, n)=> n >= 180,
        passed: (w)=> w.player.y < 10 * TILE,
    },
];

/** @returns {import('../game/loop.js').Exhibit[]} */
export function exhibits(features)
{
    return [...OWN, ...features.flatMap((f)=> f.museum?.() ?? [])];
}
