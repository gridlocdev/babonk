// Foes through their contract: build() adds them to every run; then the player bonks, stomps and gets hurt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../fake-browser.js';
import { state } from '../../src/game/state.js';
import { events } from '../../src/game/events.js';
import { setTile, BLOCK } from '../../src/world/well.js';
import { step } from '../../src/world/run.js';
import { HERO } from '../../src/player/hero-data.js';
import foes from '../../src/features/foes/index.js';
import { FOES } from '../../src/features/foes/foes-data.js';
import { DT, foe, idle, newRun, open, press, said } from '../run-helpers.js';

foes.build({ state, events });

test('a well starts with its foes, the same ones for the same seed', ()=>
{
    const a = newRun(), b = newRun();
    assert.ok(a.foes.length > 0);
    assert.deepEqual(a.foes, b.foes);
});

test('a homing bonk kills the foe and bounces you up with the bonk back', ()=>
{
    const w = open(76, 200);
    const f = foe(w, 'floater', 96, 250);
    step(w, DT, press());
    assert.equal(w.player.dash.kind, 'home');
    assert.ok(!w.player.bonk);
    let n = 0;
    while (f.alive && n++ < 60) step(w, DT, idle);
    assert.ok(!f.alive);
    assert.ok(w.player.vy < 0);
    assert.ok(w.player.bonk);
    assert.equal(w.score, FOES.points.floater);
    assert.equal(said(w, 'pop'), 1);
});

test('falling onto a foe stomps it; onto a spiker hurts', ()=>
{
    const w = open(76, 200);
    const f = foe(w, 'floater', 75, 212);
    w.player.vy = 120;
    step(w, DT, idle);
    step(w, DT, idle);
    assert.ok(!f.alive);
    assert.ok(w.player.vy < 0);

    const s = open(76, 200);
    const sp = foe(s, 'spiker', 75, 211);
    s.player.vy = 120;
    for (let i = 0; i < 3; i++) step(s, DT, idle);
    assert.equal(s.hp, HERO.hp - 1);
    assert.ok(sp.alive);
});

test('hits take hp with a moment of safety after, and the last one ends the run', ()=>
{
    const w = open(76, 200);
    for (let i = 0; i < HERO.hp; i++)
    {
        foe(w, 'floater', w.player.x, w.player.y);
        step(w, DT, idle);
        assert.equal(w.hp, HERO.hp - 1 - i);
        step(w, DT, idle);
        assert.equal(w.hp, HERO.hp - 1 - i, 'safe right after');
        w.player.invulnUntil = 0;
        w.foes = [];
    }
    assert.equal(w.state, 'dead');
});

test('coming down on a floater from above never hurts, whatever the bonk or the angle', ()=>
{
    // a floater drifts toward you, so it often meets you at a corner, or just after a short dash ran out
    for (const bonkAt of [0, 1, 10, 20]) for (let dx = -8; dx <= 8; dx += 2) for (let dy = 10; dy <= 90; dy += 4)
    {
        const w = open(100 + dx, 200 - dy);
        const f = foe(w, 'floater', 100, 200);
        f.chasing = true; f.alertAt = -10;      // already past its tell and coming at you
        let n = 0;
        while (f.alive && w.hp === HERO.hp && n++ < 120) step(w, DT, bonkAt && n === bonkAt ? press() : idle);
        assert.equal(w.hp, HERO.hp, `hurt dropping from ${dx},${dy} with a bonk at frame ${bonkAt}`);
        assert.ok(!f.alive, `the floater survived a drop from ${dx},${dy}`);
    }
});

test('a kill freezes the action for a moment, longer with a chain, and keeps a press made meanwhile', ()=>
{
    const w = open(96, 200);
    const f = foe(w, 'floater', 96, 220);
    let n = 0;
    while (f.alive && n++ < 60) step(w, DT, idle);
    assert.ok(!f.alive);
    assert.ok(Math.abs(w.freeze - FOES.hitStop) < 1e-9);
    const t = w.t, p = { ...w.player };
    step(w, DT, press());
    assert.equal(w.t, t);
    assert.equal(w.player.y, p.y);
    while (w.freeze > 1e-9) step(w, DT, idle);
    step(w, DT, idle);
    assert.ok(!w.player.bonk && w.player.dash, 'the press made in the freeze bonked once it ended');

    const k = open(96, 200);
    k.chain = 20;
    foe(k, 'floater', 96, 220);
    for (let i = 0; i < 60 && !k.freeze; i++) step(k, DT, idle);
    assert.equal(k.freeze, FOES.hitStopMax);
});

test('a floater that spots you stops and stares before it gives chase', ()=>
{
    const w = open(76, 200);
    const f = foe(w, 'floater', 76, 200 + FOES.floaterSight - 10);
    w.player.vy = 0;
    step(w, DT, idle);
    assert.ok(f.chasing);
    assert.equal(said(w, 'alert'), 1);
    const y = f.y;
    for (let i = 0; i < Math.floor(FOES.floaterTell / DT) - 1; i++) step(w, DT, idle);
    assert.equal(f.y, y, 'it holds still for the tell');
    for (let i = 0; i < 10; i++) step(w, DT, idle);
    assert.ok(f.y < y, 'then it comes up after you');
});

test('a floater behind a ledge is out of the bonk\'s reach', ()=>
{
    const w = open(76, 200);
    const f = foe(w, 'floater', 76, 250);
    setTile(w, 9, 28, BLOCK); setTile(w, 10, 28, BLOCK);
    step(w, DT, press());
    assert.equal(w.player.dash.kind, 'aim', 'it dashes straight instead of homing through the ledge');
    assert.ok(f.alive);
});

test('a dash that runs out a pixel short still kills what it reaches, but only for a moment', ()=>
{
    const w = open(76, 200);
    const f = foe(w, 'spiker', 76, 250);      // can't be stomped, so only the dash can kill it
    w.player.dash = { kind: 'aim', dx: 0, dy: 1, t: HERO.dashTime };
    step(w, DT, idle);
    assert.equal(w.player.dash, null);
    Object.assign(w.player, { y: f.y - 4 });
    step(w, DT, idle);
    assert.ok(!f.alive);
    assert.equal(w.hp, HERO.hp);

    const k = open(76, 200);
    const g = foe(k, 'spiker', 76, 250);
    k.player.attackUntil = k.t - 1;
    Object.assign(k.player, { y: g.y - 4, vy: 50 });
    step(k, DT, idle);
    assert.ok(g.alive);
    assert.equal(k.hp, HERO.hp - 1);
});
