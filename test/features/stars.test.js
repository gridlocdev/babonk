// Stars through their contract: built with the foes, breaking things knocks them out for the player to collect.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../fake-browser.js';
import { state } from '../../src/game/state.js';
import { events } from '../../src/game/events.js';
import { step } from '../../src/world/run.js';
import foes from '../../src/features/foes/index.js';
import stars from '../../src/features/stars/index.js';
import { STARS } from '../../src/features/stars/stars-data.js';
import { DT, foe, idle, open, press, said } from '../run-helpers.js';

foes.build({ state, events });
stars.build({ state, events });

// bonks a floater below and waits for its stars
function bonkWithChain(chain)
{
    const w = open(76, 200);
    w.chain = chain;
    foe(w, 'floater', 76, 250);
    step(w, DT, press());
    let n = 0;
    while (!w.stars.length && n++ < 60) step(w, DT, idle);
    return w;
}

test('a kill knocks out stars, more with a longer chain, and they burst upward', ()=>
{
    const w = bonkWithChain(0);
    assert.equal(w.stars.length, STARS.perKill);
    assert.ok(w.stars.every((s)=> s.vy < 0));
    assert.equal(bonkWithChain(3).stars.length, STARS.perKill + 3);
});

test('a star beside you drifts in and is taken; one far away blinks out', ()=>
{
    const g = open(76, 100);
    g.player.vy = 0;
    g.stars.push({ x: 90, y: 104, w: 4, h: 4, vx: 0, vy: 0, t: 1 }, { x: 130, y: 300, w: 4, h: 4, vx: 0, vy: 0, t: 1 });
    const before = g.score;
    for (let i = 0; i < 20; i++) step(g, DT, idle);
    assert.equal(g.score, before + STARS.points);
    assert.equal(said(g, 'star'), 1);
    for (let i = 0; i < STARS.life * 60; i++) step(g, DT, idle);
    assert.equal(g.stars.length, 0);
});
