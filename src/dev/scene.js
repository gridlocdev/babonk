// A scene for the dev rooms: a real run with every part the features added, in an empty well, and a scripted try
// stepped in it. The browser rooms (rooms.js) and the smoke tests (test/dev/rooms.test.js) both use these.
import { clearWell } from '../world/well.js';
import { createRun, happen, runParts, step } from '../world/run.js';
import { hero } from '../player/hero.js';

export const STEP = 1 / 60;
const LIMIT = 4 * 60;         // steps before a try gives up
const IDLE = { x: 0, y: 0, held: false, pressed: false };

// a fresh scene for a trial (a gym case or an exhibit), with the trial started in it
export function begin(trial, setup)
{
    const w = createRun(1, [hero, ...runParts]);
    clearWell(w);
    w.spawns = (trial.spawns ?? []).map(([kind, tx, ty])=> ({ kind, tx, ty }));
    happen(w, 'enter');
    setup?.(w);
    return { w, s: trial.start(w) ?? {}, n: 0, over: false, ok: false };
}

// one step; ctrl overrides the trial's script (a player taking over)
export function tick(tr, trial, ctrl)
{
    if (tr.over) return;
    step(tr.w, STEP, ctrl ?? trial.ctrl?.(tr.w, tr.s, tr.n) ?? IDLE);
    tr.n++;
    if (tr.w.state !== 'play' || trial.done(tr.w, tr.s, tr.n) || tr.n >= LIMIT)
    {
        tr.over = true;
        tr.ok = !!trial.passed(tr.w, tr.s);
    }
}

// run a trial to the end: did it pass?
export function attempt(trial, setup)
{
    const tr = begin(trial, setup);
    while (!tr.over) tick(tr, trial);
    return tr;
}
