// The gym (?debug&room=gym): a row per movement metric, each case a little harder, coloured by the band gym-data.js
// works out from the hero's numbers. The hero's rows are here; features add theirs with a gym() hook.
import { BLOCK, CRATE, EMPTY, fill, setTile, tileAt } from '../world/well.js';
import { COLS, TILE } from '../world/wells-data.js';
import { placeHero } from '../player/hero.js';
import { HERO } from '../player/hero-data.js';
import { GYM, REACH, band } from './gym-data.js';

const R = COLS - 2;     // the last column inside the walls
const go = (x, held, pressed)=> ({ x, y: 0, held, pressed });
const ground = (w, s, n)=> n > 6 && w.player.ground;
const standOn = (w, x, ty)=> placeHero(w, x, ty * TILE - HERO.h);

// jump: two-tile-wide steps along one floor, h tiles up; stand beside each, jump holding toward it
const FLOOR = 12, ledgeX = (i)=> 3 + i * 3;
const jump = {
    id: 'jump', title: 'Jump height', file: 'src/player/hero-data.js jumpV', unit: 't',
    text: 'A held jump from the floor onto a step h tiles up. Holding toward it slides you up its side.',
    setup(w)
    {
        fill(w, 1, R, FLOOR, BLOCK);
        GYM.jump.forEach((h, i)=> { for (let ty = FLOOR - h; ty < FLOOR; ty++) fill(w, ledgeX(i), ledgeX(i) + 1, ty, BLOCK); });
    },
    cases: GYM.jump.map((h, i)=> ({
        name: `${h} tiles up`, value: h, max: REACH.jump, at: [ledgeX(i), FLOOR - h - 2],
        start(w) { standOn(w, ledgeX(i) * TILE - HERO.w, FLOOR); },
        // toward the step until over its middle, then let go of the stick
        ctrl: (w, s, n)=> go(w.player.x + HERO.w / 2 < (ledgeX(i) + 1) * TILE ? 1 : 0, n >= 3, n === 3),
        done: ground,
        passed: (w)=> w.player.y + HERO.h === (FLOOR - h) * TILE,
    })),
};

// gap: a running jump off a ledge's end across g empty tiles to a ledge at the same height, one per storey
const storey = (i)=> 6 + i * 8;
const gap = {
    id: 'gap', title: 'Running jump', file: 'src/player/hero-data.js run, jumpV, coyote', unit: 't',
    text: 'Run off the end and jump as late as you can (you still can, just after leaving). Land on the far ledge.',
    setup(w)
    {
        GYM.gap.forEach((g, i)=> { fill(w, 1, 4, storey(i), BLOCK); fill(w, 5 + g, R, storey(i), BLOCK); });
    },
    cases: GYM.gap.map((g, i)=> ({
        name: `${g} tile gap`, value: g, max: REACH.gap, at: [5, storey(i) - 2],
        start(w) { standOn(w, TILE, storey(i)); return { off: -1 }; },
        ctrl(w, s, n)
        {
            if (s.off < 0 && n > 2 && !w.player.ground) s.off = n;
            return go(1, s.off >= 0, s.off >= 0 && n === s.off + 3);
        },
        done: (w, s, n)=> s.off >= 0 && ground(w, s, n),
        passed: (w)=> w.player.x + HERO.w > (5 + g) * TILE && w.player.y + HERO.h <= storey(i) * TILE + .5,
    })),
};

// dash: hanging in the air over a crate d tiles below the feet; a dash straight down must reach and break it
const HANG = 3, crateX = (i)=> 3 + i * 3;
const dash = {
    id: 'dash', title: 'Dash reach', file: 'src/player/hero-data.js dashSpeed, dashTime', unit: 't',
    text: 'Bonk with nothing to lock onto and you dash. Straight down, how far below can a crate be and still break?',
    setup(w) { GYM.dash.forEach((d, i)=> setTile(w, crateX(i), HANG + d, CRATE)); },
    cases: GYM.dash.map((d, i)=> ({
        name: `${d} tiles down`, value: d, max: REACH.dash, at: [crateX(i), 1],
        start(w) { placeHero(w, crateX(i) * TILE + 1, HANG * TILE - HERO.h); },
        ctrl: (w, s, n)=> go(0, n === 0, n === 0),
        done: (w, s, n)=> tileAt(w, crateX(i), HANG + d) === EMPTY || ground(w, s, n),
        passed: (w)=> tileAt(w, crateX(i), HANG + d) === EMPTY,
    })),
};

// every row: the hero's, then the features', each case given its band
/** @returns {import('../game/loop.js').GymRow[]} */
export function gymRows(features)
{
    const rows = [jump, gap, dash, ...features.flatMap((f)=> f.gym?.() ?? [])];
    for (const row of rows) for (const c of row.cases) c.band ??= band(Number(c.value), c.max);
    return rows;
}
