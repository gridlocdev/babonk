import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, graphics, watchFrames } from '../../src/platform/graphics.js';

const run = (seconds, fps)=> { for (let t = 0; t < seconds; t += 1 / fps) watchFrames(1 / fps); };

test('high is the game as designed, and each lower preset thins the effects', ()=>
{
    assert.deepEqual(PRESETS.high, { bits: 8, ghosts: true });
    assert.ok(PRESETS.medium.bits < PRESETS.high.bits && PRESETS.low.bits < PRESETS.medium.bits);
    assert.equal(PRESETS.low.ghosts, false);
});

test('Automatic stays on high at full speed, and steps down one preset at a time while frames run slow', ()=>
{
    graphics.set('auto');
    run(30, 60);
    assert.equal(graphics.name, 'auto high');
    run(4, 25);
    assert.equal(graphics.name, 'auto medium');
    run(5, 25);
    assert.equal(graphics.name, 'auto medium', 'at most one step every ten seconds');
    run(6, 25);
    assert.equal(graphics.name, 'auto low');
    run(30, 25);
    assert.equal(graphics.preset, PRESETS.low);
    run(30, 60);
    assert.equal(graphics.name, 'auto low', 'it does not step back up on its own');
});

test('a short stall is not a step, and choosing a preset by hand holds it and starts Automatic over', ()=>
{
    graphics.set('auto');
    run(5, 60); run(1, 20); run(5, 60);
    assert.equal(graphics.name, 'auto high');
    graphics.set('medium');
    run(30, 20);
    assert.equal(graphics.name, 'medium');
    graphics.set('auto');
    assert.equal(graphics.name, 'auto high');
    graphics.set('nonsense');
    assert.equal(graphics.name, 'auto high');
});
