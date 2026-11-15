// The run feature through its contract: the whole game is built the way main.js builds it, on an in-memory save,
// and played with keys and the touch button. What the test reads is the debug() hook and the saved slice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key } from '../fake-browser.js';

// starts on the game-over screen of a 3170 run (the debug scene ?debug&shot=over), with a save from before the
// high-score table moved into the run's slice
globalThis.location = { search: '?debug&shot=over' };
const saved = { 'babonk-save-v1': JSON.stringify({ babonk: { table: [{ name: 'OLD', score: 900 }], lastName: 'BOB' } }) };
const { storage } = await import('../../src/platform/storage.js');
storage.backend = { async load() { return { ...saved }; }, write(all) { Object.assign(saved, all); } };
const { state } = await import('../../src/game/state.js');
const { loadSettings } = await import('../../src/game/settings.js');
const { loop } = await import('../../src/game/loop.js');
const { clearPresses, pollInput, touchState } = await import('../../src/platform/input.js');
const { features } = await import('../../src/features/index.js');
const { runParts, createRun, step } = await import('../../src/world/run.js');
const { hero } = await import('../../src/player/hero.js');
const { HERO } = await import('../../src/player/hero-data.js');
const { TILE } = await import('../../src/world/wells-data.js');
const { RUN, clearBonus } = await import('../../src/features/run/run-data.js');

await storage.init();
state.load();
loadSettings();
loop.use(features);
loop.build();
const run = features.find((f)=> f.id === 'run');

// one frame as main.js runs it; `before` presses something first
function frame(before)
{
    pollInput();
    before?.();
    loop.update(1 / 60);
    clearPresses();
}
const wait = (s)=> { for (let i = 0; i < s * 60; i++) frame(); };
const savedRun = ()=> JSON.parse(saved['babonk-save-v1']).run;

test('a high score asks for initials, then the table is saved with the old save\'s scores kept', ()=>
{
    assert.equal(run.debug().mode, 'over');
    wait(1.3);
    frame(()=> key('Space'));
    assert.equal(run.debug().mode, 'initials');
    frame(()=> key('Enter'));
    assert.equal(run.debug().mode, 'menu');
    const s = savedRun();
    assert.deepEqual(s.table.map((e)=> [e.name, e.score]), [['BOB', 3170], ['OLD', 900]]);
    assert.equal(s.lastName, 'BOB');
    assert.equal(JSON.parse(saved['babonk-save-v1']).babonk, undefined);
});

test('on the title the touch button starts a run, which goes on until Escape pauses it', ()=>
{
    wait(.3);
    frame(()=> { touchState.holdPressed = true; });
    assert.equal(run.debug().mode, 'play');
    assert.deepEqual([run.debug().well, run.debug().score, run.debug().hp], [0, 0, HERO.hp]);
    wait(1);
    assert.ok(run.debug().t >= .9);
    frame(()=> key('Escape'));
    assert.equal(run.debug().mode, 'paused');
    const t = run.debug().t;
    wait(.5);
    assert.equal(run.debug().t, t);
});

test('the pause menu moves with keys: Restart asks first, No goes back, Yes starts a new run', ()=>
{
    assert.equal(run.debug().mode, 'paused');
    frame(()=> key('ArrowDown'));
    frame(()=> key('ArrowDown'));
    frame(()=> key('Enter'));
    // the question: No is focused, so confirming goes back to the pause menu, on Restart
    frame(()=> key('Enter'));
    assert.equal(run.debug().mode, 'paused');
    const t = run.debug().t;
    frame(()=> key('Enter'));
    frame(()=> key('ArrowRight'));
    frame(()=> key('Enter'));
    assert.equal(run.debug().mode, 'play');
    assert.ok(run.debug().t < t);
});

test('landing on a well\'s floor clears it and pays for the hp left', ()=>
{
    const w = createRun(RUN.seed, [hero, ...runParts]);
    Object.assign(w.player, { y: (w.rows - 3) * TILE, vy: 0, ground: false });
    w.hp = 2;
    for (let i = 0; i < 60 && w.state === 'play'; i++) step(w, 1 / 60, { x: 0, y: 0, held: false, pressed: false });
    assert.equal(w.state, 'clear');
    assert.equal(w.score, clearBonus(2));
});
