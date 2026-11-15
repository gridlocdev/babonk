// A run: three wells in a row, the score and hp carried from one to the next, stepped at a fixed 1/60 s with a seeded
// rng so it replays. The rules come from its parts: the hero (player/hero.js) and what features add with addRunPart().
// A part is { step?(w, dt, ctrl), and any happening it cares about: begin, enter, rest, bounced, hurt, landed, broke }.
// Parts react to happenings in their order, so a run plays the same every time. Sounds and effects queue in w.sfx and
// w.fx for the game to play and draw. ctrl is { x, y, held, pressed }: the stick (y up), the BONK button down, and
// whether it went down this step.
import { rng as makeRng } from '../lib/rng.js';
import { buildWell, pickChunks } from './well.js';
import { CHUNK_ROWS, TILE, WELLS } from './wells-data.js';

// what features add to every run, in the order they were built
export const runParts = [];
export const addRunPart = (part)=> { runParts.push(part); };

/** @returns {any} */
export function createRun(seed, parts)
{
    const w = { rng: makeRng(seed), parts, score: 0, well: -1, sfx: [], fx: [] };
    happen(w, 'begin');
    enterWell(w, 0);
    return w;
}

// start well `index`; w.foes holds what a bonk can lock onto, and w.chain the bounces since you last stood
function enterWell(w, index)
{
    Object.assign(w, buildWell(pickChunks(index, w.rng)));
    w.well = index;
    w.t = 0;
    w.state = 'play';           // play | clear | dead
    w.chain = 0;
    w.foes = [];
    w.freeze = 0;               // hit stop left, in seconds
    w.heldPress = false;        // a press made during a hit stop, kept for when it ends
    happen(w, 'enter');
}

// on to the next well after a rest
export function nextWell(w)
{
    happen(w, 'rest');
    enterWell(w, w.well + 1);
}

export function step(w, dt, ctrl)
{
    if (w.state !== 'play') return;
    // hit stop: nothing moves, but a press made now still counts once it's over
    if (w.freeze > 1e-9)
    {
        w.freeze -= dt;
        if (ctrl.pressed) w.heldPress = true;
        return;
    }
    if (w.heldPress) { ctrl = { ...ctrl, pressed: true }; w.heldPress = false; }
    w.t += dt;
    // the hero (the first part) moves first; a well cleared or lost under its feet ends the step there
    const [first, ...rest] = w.parts;
    first.step(w, dt, ctrl);
    if (w.state !== 'play') return;
    for (const p of rest) p.step?.(w, dt, ctrl);
}

// tell every part that something happened
export function happen(w, name, data)
{
    for (const p of w.parts) p[name]?.(w, data);
}
export const say = (w, id, pitch = 1)=> { w.sfx.push({ id, pitch }); };

export const wellCount = ()=> WELLS.length;
// how far down the well the hero is, 0 to 1
export const depth = (w)=> Math.min(1, Math.max(0, w.player.y / ((w.rows - CHUNK_ROWS) * TILE)));
