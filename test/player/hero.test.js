// The hero alone in a well: no feature is built, so there are no foes, stars or chain unless a test places them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLS, TILE } from '../../src/world/wells-data.js';
import { BLOCK, CRATE, SPIKES, setTile } from '../../src/world/well.js';
import { nextWell, step } from '../../src/world/run.js';
import { lockTarget } from '../../src/player/hero.js';
import { HERO } from '../../src/player/hero-data.js';
import { heroPose } from '../../src/player/pose.js';
import { ANIMS, HERO_ANIMS, SPRITES } from '../../src/render/sprites-data.js';
import { DT, foe, idle, newRun, open, press, said } from '../run-helpers.js';

test('you start on the ledge and stand there quietly, and the button jumps', ()=>
{
    const w = newRun();
    for (let i = 0; i < 60; i++) step(w, DT, idle);
    assert.ok(w.player.ground);
    assert.ok(said(w, 'land') <= 1);
    const y = w.player.y;
    step(w, DT, press());
    for (let i = 0; i < 10; i++) step(w, DT, { ...idle, held: true });
    assert.ok(w.player.y < y - 10);
});

test('the bonk locks onto the nearest foe in reach below, not above, too far or behind a ledge', ()=>
{
    const w = open(76, 200);
    assert.equal(lockTarget(w), null);
    foe(w, 'walker', 76, 200 + HERO.lockRange + 20);
    foe(w, 'walker', 76, 150);
    assert.equal(lockTarget(w), null);
    const near = foe(w, 'walker', 90, 240);
    assert.equal(lockTarget(w), near);

    const k = open(76, 200);
    const f = foe(k, 'floater', 76, 250);
    assert.equal(lockTarget(k), f);
    setTile(k, 9, 28, BLOCK); setTile(k, 10, 28, BLOCK);
    assert.equal(lockTarget(k), null);
});

test('with nothing in reach the bonk dashes the held way, and a wall bounces you back off it', ()=>
{
    const w = open(76, 200);
    step(w, DT, press());
    assert.equal(w.player.dash.kind, 'aim');
    assert.deepEqual([Math.round(w.player.dash.dx), Math.round(w.player.dash.dy)], [0, 1]);

    const k = open(COLS * TILE - TILE - 30, 200);
    step(k, DT, press(1, 0));
    let n = 0;
    while (k.player.dash && n++ < 30) step(k, DT, idle);
    assert.ok(k.player.vx < 0, 'kicked away from the right wall');
    assert.ok(k.player.vy < 0);
    assert.ok(k.player.bonk);
});

test('a bonk down onto a crate breaks it and bounces you up', ()=>
{
    const w = open(76, 200);
    setTile(w, 9, 28, CRATE); setTile(w, 10, 28, CRATE);
    step(w, DT, press());
    let n = 0;
    while (w.player.dash && n++ < 30) step(w, DT, idle);
    assert.equal(w.grid[28 * COLS + 9] + w.grid[28 * COLS + 10] < 2 * CRATE, true);
    assert.ok(w.player.vy < 0);
    assert.equal(w.score, HERO.crate);
});

test('spikes underfoot hurt, and the next well heals one', ()=>
{
    const w = open(76, 200);
    for (let tx = 8; tx <= 11; tx++) setTile(w, tx, 27, SPIKES);
    for (let i = 0; i < 40 && w.hp === HERO.hp; i++) step(w, DT, idle);
    assert.equal(w.hp, HERO.hp - 1);
    nextWell(w);
    assert.equal(w.hp, HERO.hp);
});

test('the hero poses follow the run: idle, run, squash on landing, smear then a spinning ball, rise, fall, hurt', ()=>
{
    for (const name of [...HERO_ANIMS, 'walker', 'floater', 'spiker', 'star'])
    {
        const a = ANIMS[name];
        assert.ok(a, name);
        for (const f of a.frames) assert.ok(SPRITES[f], `${name} frame ${f}`);
        if (a.frames.length > 1) assert.equal(a.times.length, a.frames.length, name);
    }
    const w = newRun();
    const p = w.player;
    let n = 0;
    while (!p.ground && n++ < 120) step(w, DT, idle);
    assert.equal(heroPose(p, w.t)[0], 'squash', 'just landed');
    for (let i = 0; i < 10; i++) step(w, DT, idle);
    assert.equal(heroPose(p, w.t)[0], 'idle');
    for (let i = 0; i < 10; i++) step(w, DT, { x: 1, y: 0, held: false, pressed: false });
    assert.equal(heroPose(p, w.t)[0], 'run');
    step(w, DT, press());
    assert.equal(heroPose(p, w.t)[0], 'rise', 'a jump');

    const k = open(76, 100);
    for (let i = 0; i < 20; i++) step(k, DT, idle);
    assert.equal(heroPose(k.player, k.t)[0], 'fall');
    step(k, DT, press());
    assert.equal(heroPose(k.player, k.t)[0], 'smearV', 'the dash leaves');
    for (let i = 0; i < 4; i++) step(k, DT, idle);
    assert.equal(heroPose(k.player, k.t)[0], 'ball');
    k.player.hurtAt = k.t;
    assert.equal(heroPose(k.player, k.t + .1)[0], 'hurt', 'just after a hit');
});
