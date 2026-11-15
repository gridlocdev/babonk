// Building blocks for tests that play a run: controls, an emptied well, and foes placed by hand.
import { COLS } from '../src/world/wells-data.js';
import { EMPTY, setTile } from '../src/world/well.js';
import { createRun, runParts } from '../src/world/run.js';
import { hero } from '../src/player/hero.js';
import { RUN } from '../src/features/run/run-data.js';

export const SEED = RUN.seed;
export const DT = 1 / 60;
export const idle = { x: 0, y: 0, held: false, pressed: false };
export const press = (x = 0, y = 0)=> ({ x, y, held: true, pressed: true });

// a run with the hero and every part the built features added, as the run feature starts one
export const newRun = ()=> createRun(SEED, [hero, ...runParts]);

// a run in an emptied well: no tiles inside the walls, no foes, no stars, the player in mid-air at (x, y)
export function open(x = 76, y = 200)
{
    const w = newRun();
    for (let ty = 0; ty < w.rows; ty++) for (let tx = 1; tx < COLS - 1; tx++) setTile(w, tx, ty, EMPTY);
    w.foes = [];
    if (w.stars) w.stars = [];
    Object.assign(w.player, { x, y, vx: 0, vy: 0, ground: false });
    return w;
}
export const foe = (w, kind, x, y)=> { const f = { kind, alive: true, w: 8, h: 8, x, y, vx: 0, vy: 0, dir: 1, homeX: x, homeY: y, phase: 0, chasing: false, alertAt: -1 }; w.foes.push(f); return f; };
export const said = (w, id)=> w.sfx.filter((e)=> e.id === id).length;
