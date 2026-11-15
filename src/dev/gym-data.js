// The gym's numbers, worked out from the hero's own (player/hero-data.js) and the well's physics, so a tuning change
// moves the bands with it. Distances in tiles. A case is easy up to EASY × the reach, hard up to the reach, then no.
import { HERO } from '../player/hero-data.js';
import { GRAVITY, TILE } from '../world/wells-data.js';

const EASY = .8;
const air = 2 * HERO.jumpV / GRAVITY;          // seconds from a full jump back down to the same height

export const REACH = {
    // how high the feet rise on a held jump
    jump: HERO.jumpV ** 2 / (2 * GRAVITY) / TILE,
    // a running jump across a gap between ledges at one height: the run speed over the air time, plus the coyote
    // time you can still jump in after running off, plus the hero's width (it lands on its leading edge)
    gap: (HERO.run * (air + HERO.coyote) + HERO.w) / TILE,
    // how far a dash carries before it runs out
    dash: HERO.dashSpeed * HERO.dashTime / TILE,
};

// 'easy' | 'hard' | 'no'
export const band = (value, max)=> value <= EASY * max ? 'easy' : value <= max ? 'hard' : 'no';

// each row's cases, in tiles
export const GYM = {
    jump: [2, 3, 4, 5, 6],
    gap: [4, 5, 6, 7, 8, 9],
    dash: [3, 4, 5, 6, 7],
};
