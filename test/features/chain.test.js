// The chain through its contract: built with the foes, kills grow it, a hit ends it, and landing pays for it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../fake-browser.js';
import { state } from '../../src/game/state.js';
import { events } from '../../src/game/events.js';
import { BLOCK, setTile } from '../../src/world/well.js';
import { step } from '../../src/world/run.js';
import foes from '../../src/features/foes/index.js';
import chain from '../../src/features/chain/index.js';
import { CHAIN, chainBonus } from '../../src/features/chain/chain-data.js';
import { DT, foe, idle, open, press, said } from '../run-helpers.js';

foes.build({ state, events });
chain.build({ state, events });

test('the bonus starts at three and grows with each kill', ()=>
{
    assert.equal(chainBonus(CHAIN.min - 1), 0);
    assert.equal(chainBonus(4), 4 * CHAIN.each);
});

test('each kill you bounce off adds one; a bare wall adds nothing; a hit ends it', ()=>
{
    const w = open(76, 200);
    const f = foe(w, 'floater', 96, 250);
    step(w, DT, press());
    let n = 0;
    while (f.alive && n++ < 60) step(w, DT, idle);
    assert.equal(w.chain, 1);

    const k = open(140, 200);
    step(k, DT, press(1, 0));
    n = 0;
    while (k.player.dash && n++ < 30) step(k, DT, idle);
    assert.ok(k.player.bonk, 'the wall gave the bonk back');
    assert.equal(k.chain, 0);

    const h = open(76, 200);
    h.chain = 5;
    foe(h, 'spiker', 75, 211);
    h.player.vy = 120;
    for (let i = 0; i < 3; i++) step(h, DT, idle);
    assert.equal(h.chain, 0);
});

test('landing on a chain of three or more pays the bonus and ends it', ()=>
{
    const w = open(76, 200);
    for (let tx = 1; tx < 19; tx++) setTile(w, tx, 30, BLOCK);
    w.chain = 4;
    for (let i = 0; i < 60 && !w.player.ground; i++) step(w, DT, idle);
    assert.ok(w.player.ground);
    assert.equal(w.score, chainBonus(4));
    assert.equal(w.chain, 0);
    assert.equal(said(w, 'chain'), 1);
});
