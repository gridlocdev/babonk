import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../fake-browser.js';
import { rng } from '../../src/lib/rng.js';
import { state } from '../../src/game/state.js';
import { CHUNKS, CHUNK_ROWS, COLS, FLOOR, START, TILE, WELLS } from '../../src/world/wells-data.js';
import { BLOCK, CRATE, EMPTY, SPIKES, pickChunks, setTile } from '../../src/world/well.js';
import { createRun as makeRun, nextWell, runParts, step } from '../../src/world/run.js';
import { hero, lockTarget } from '../../src/player/hero.js';
import { HERO } from '../../src/player/hero-data.js';
import { features } from '../../src/features/index.js';
import { FOES } from '../../src/features/foes/foes-data.js';
import { STARS } from '../../src/features/stars/stars-data.js';
import { CHAIN, chainBonus } from '../../src/features/chain/chain-data.js';
import { RUN } from '../../src/features/run/run-data.js';

for (const f of features) f.build({ state });
const createRun = ()=> makeRun(RUN.seed, [hero, ...runParts]);
const CONFIG = { ...HERO, ...FOES, hitStop: FOES.hitStop, starsPerKill: STARS.perKill, starLife: STARS.life,
    points: { ...FOES.points, crate: HERO.crate, star: STARS.points, chainEach: CHAIN.each, clear: RUN.clear, hpLeft: RUN.hpLeft } };

const DT = 1 / 60;
const idle = { x: 0, y: 0, held: false, pressed: false };
const press = (x = 0, y = 0)=> ({ x, y, held: true, pressed: true });
const all = [START, FLOOR, ...Object.values(CHUNKS).flat()];

// a run in an emptied well: no tiles inside the walls, no foes, no stars, the player in mid-air at (x, y)
function open(x = 76, y = 200)
{
    const w = createRun();
    for (let ty = 0; ty < w.rows; ty++) for (let tx = 1; tx < COLS - 1; tx++) setTile(w, tx, ty, EMPTY);
    w.foes = []; w.stars = [];
    Object.assign(w.player, { x, y, vx: 0, vy: 0, ground: false });
    return w;
}
const foe = (w, kind, x, y)=> { const f = { kind, alive: true, w: 8, h: 8, x, y, vx: 0, vy: 0, dir: 1, homeX: x, homeY: y, phase: 0, chasing: false, alertAt: -1 }; w.foes.push(f); return f; };
const said = (w, id)=> w.sfx.filter((e)=> e.id === id).length;

test('every chunk is 18 × 10, open top and bottom, with walkers on ground', ()=>
{
    for (const c of all)
    {
        assert.equal(c.length, CHUNK_ROWS);
        for (const r of c) assert.match(r, /^[.#x^wfsg]{18}$/);
        if (c !== FLOOR) assert.match(c.at(-1), /^[.wfsg]+$/);
        assert.match(c[0], /^[.wfsg]+$/);
        c.forEach((r, y)=> [...r].forEach((ch, x)=>
        {
            if (ch === 'w' || ch === 's') assert.ok('#x^'.includes(c[y + 1]?.[x]), `foe at ${x},${y} stands on something`);
        }));
    }
});

test('every chunk can be fallen through from top to bottom', ()=>
{
    for (const c of [START, ...Object.values(CHUNKS).flat()])
    {
        const free = (x, y)=> x >= 0 && x < 18 && y >= 0 && y < CHUNK_ROWS && !'#x^'.includes(c[y][x]);
        const seen = new Set(), todo = [];
        for (let x = 0; x < 18; x++) if (free(x, 0)) todo.push([x, 0]);
        let through = false;
        while (todo.length)
        {
            const [x, y] = todo.pop(), k = y * 18 + x;
            if (seen.has(k) || !free(x, y)) continue;
            seen.add(k);
            if (y === CHUNK_ROWS - 1) through = true;
            todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        assert.ok(through, c.join('\n'));
    }
});

test('a well is the start, its chunks with no repeat in a row, then the floor; the same seed builds the same well', ()=>
{
    WELLS.forEach((def, i)=>
    {
        const a = pickChunks(i, rng(5)), b = pickChunks(i, rng(5));
        assert.equal(a.length, def.chunks + 2);
        assert.equal(a[0], START);
        assert.equal(a.at(-1), FLOOR);
        assert.deepEqual(a, b);
        for (let k = 2; k < a.length - 1; k++) assert.notEqual(a[k], a[k - 1]);
    });
    const w = createRun();
    assert.equal(w.rows, (WELLS[0].chunks + 2) * CHUNK_ROWS);
    assert.equal(w.grid[0], BLOCK);
    assert.equal(w.grid[COLS - 1], BLOCK);
});

test('you start on the ledge and stand there quietly, and the button jumps', ()=>
{
    const w = createRun();
    for (let i = 0; i < 60; i++) step(w, DT, idle);
    assert.ok(w.player.ground);
    assert.ok(said(w, 'land') <= 1);
    const y = w.player.y;
    step(w, DT, press());
    for (let i = 0; i < 10; i++) step(w, DT, { ...idle, held: true });
    assert.ok(w.player.y < y - 10);
    assert.equal(w.chain, 0);
});

test('the bonk locks onto the nearest foe in reach below, not above or too far', ()=>
{
    const w = open(76, 200);
    assert.equal(lockTarget(w), null);
    const far = foe(w, 'walker', 76, 200 + CONFIG.lockRange + 20);
    const above = foe(w, 'walker', 76, 150);
    assert.equal(lockTarget(w), null);
    const near = foe(w, 'walker', 90, 240);
    assert.equal(lockTarget(w), near);
    assert.ok(far && above);
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
    assert.equal(w.chain, 1);
    assert.equal(w.score, CONFIG.points.floater);
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
    assert.equal(k.chain, 0, 'a bare wall gives the bonk back but adds nothing to the chain');
});

test('a foe behind a ledge is not locked, so the bonk can not dive through it', ()=>
{
    const w = open(76, 200);
    const f = foe(w, 'floater', 76, 250);
    assert.equal(lockTarget(w), f);
    setTile(w, 9, 28, BLOCK); setTile(w, 10, 28, BLOCK);
    assert.equal(lockTarget(w), null);
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
    assert.equal(w.score, CONFIG.points.crate);
});

test('falling onto a foe stomps it; onto a spiker hurts', ()=>
{
    const w = open(76, 200);
    const f = foe(w, 'floater', 75, 212);
    f.vx = 0;
    w.player.vy = 120;
    step(w, DT, idle);
    step(w, DT, idle);
    assert.ok(!f.alive);
    assert.ok(w.player.vy < 0);

    const s = open(76, 200);
    s.foes.push({ kind: 'spiker', alive: true, w: 8, h: 8, x: 75, y: 211, vx: 0, vy: 0, dir: 1, homeX: 75, homeY: 211, phase: 0 });
    s.player.vy = 120;
    for (let i = 0; i < 3; i++) step(s, DT, idle);
    assert.equal(s.hp, CONFIG.hp - 1);
    assert.ok(s.foes[0].alive);
});

test('hits take hp with a moment of safety after, and the last one ends the run', ()=>
{
    const w = open(76, 200);
    for (let i = 0; i < CONFIG.hp; i++)
    {
        foe(w, 'floater', w.player.x, w.player.y);
        step(w, DT, idle);
        assert.equal(w.hp, CONFIG.hp - 1 - i);
        step(w, DT, idle);
        assert.equal(w.hp, CONFIG.hp - 1 - i, 'safe right after');
        w.player.invulnUntil = 0;
        w.foes = [];
    }
    assert.equal(w.state, 'dead');
});

test('spikes underfoot hurt', ()=>
{
    const w = open(76, 200);
    for (let tx = 8; tx <= 11; tx++) setTile(w, tx, 27, SPIKES);
    for (let i = 0; i < 40 && w.hp === CONFIG.hp; i++) step(w, DT, idle);
    assert.equal(w.hp, CONFIG.hp - 1);
});

test('landing a chain of 3 or more pays a bonus; the well floor clears it and the next well heals one', ()=>
{
    assert.equal(chainBonus(2), 0);
    assert.equal(chainBonus(4), 4 * CONFIG.points.chainEach);
    const w = open(76, (createRun().rows - 3) * TILE);
    w.chain = 4;
    w.hp = 2;
    for (let i = 0; i < 60 && w.state === 'play'; i++) step(w, DT, idle);
    assert.equal(w.state, 'clear');
    assert.equal(w.score, chainBonus(4) + CONFIG.points.clear + 2 * CONFIG.points.hpLeft);
    nextWell(w);
    assert.equal(w.well, 1);
    assert.equal(w.hp, 3);
    assert.equal(w.state, 'play');
    assert.equal(w.rows, (WELLS[1].chunks + 2) * CHUNK_ROWS);
});

test('every sprite is a clean grid in the three colours', async ()=>
{
    const { SPRITES, PALETTE } = await import('../../src/render/sprites-data.js');
    for (const [k, rows] of Object.entries(SPRITES))
        for (const r of rows) assert.match(r, new RegExp(`^[.${Object.keys(PALETTE).join('')}]{${rows[0].length}}$`), k);
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
        while (f.alive && w.hp === CONFIG.hp && n++ < 120) step(w, DT, bonkAt && n === bonkAt ? press() : idle);
        assert.equal(w.hp, CONFIG.hp, `hurt dropping from ${dx},${dy} with a bonk at frame ${bonkAt}`);
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
    assert.ok(Math.abs(w.freeze - CONFIG.hitStop) < 1e-9);
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
    assert.equal(k.freeze, CONFIG.hitStopMax);
});

test('a floater that spots you stops and stares before it gives chase', ()=>
{
    const w = open(76, 200);
    const f = foe(w, 'floater', 76, 200 + CONFIG.floaterSight - 10);
    w.player.vy = 0;
    step(w, DT, idle);
    assert.ok(f.chasing);
    assert.ok(w.sfx.some((s)=> s.id === 'alert'));
    const y = f.y;
    for (let i = 0; i < Math.floor(CONFIG.floaterTell / DT) - 1; i++) step(w, DT, idle);
    assert.equal(f.y, y, 'it holds still for the tell');
    for (let i = 0; i < 10; i++) step(w, DT, idle);
    assert.ok(f.y < y, 'then it comes up after you');
});

test('a dash that runs out a pixel short still kills what it reaches, but only for a moment', ()=>
{
    const w = open(76, 200);
    const f = foe(w, 'walker', 76, 250);
    f.kind = 'spiker';             // can't be stomped, so only the dash can kill it
    w.player.dash = { kind: 'aim', dx: 0, dy: 1, t: CONFIG.dashTime };
    step(w, DT, idle);
    assert.equal(w.player.dash, null);
    Object.assign(w.player, { y: f.y - 4 });
    step(w, DT, idle);
    assert.ok(!f.alive);
    assert.equal(w.hp, CONFIG.hp);

    const k = open(76, 200);
    const g = foe(k, 'spiker', 76, 250);
    k.player.attackUntil = k.t - 1;
    Object.assign(k.player, { y: g.y - 4, vy: 50 });
    step(k, DT, idle);
    assert.ok(g.alive);
    assert.equal(k.hp, CONFIG.hp - 1);
});

test('breaking things knocks out stars, more with a longer chain; they bounce, come to you and run out', ()=>
{
    const w = open(76, 200);
    foe(w, 'floater', 76, 250);
    step(w, DT, press());
    let n = 0;
    while (!w.stars.length && n++ < 60) step(w, DT, idle);
    assert.equal(w.stars.length, CONFIG.starsPerKill);
    assert.ok(w.stars.every((s)=> s.vy < 0), 'they burst upward');

    const k = open(76, 200);
    k.chain = 3;
    foe(k, 'floater', 76, 250);
    step(k, DT, press());
    n = 0;
    while (!k.stars.length && n++ < 60) step(k, DT, idle);
    assert.equal(k.stars.length, CONFIG.starsPerKill + 3);

    // one left beside you drifts in and is taken; one far away blinks out
    const g = open(76, 100);
    g.player.vy = 0;
    g.stars.push({ x: 90, y: 104, w: 4, h: 4, vx: 0, vy: 0, t: 1 }, { x: 130, y: 300, w: 4, h: 4, vx: 0, vy: 0, t: 1 });
    const before = g.score;
    for (let i = 0; i < 20; i++) step(g, DT, idle);
    assert.equal(g.score, before + CONFIG.points.star);
    assert.equal(said(g, 'star'), 1);
    for (let i = 0; i < CONFIG.starLife * 60; i++) step(g, DT, idle);
    assert.equal(g.stars.length, 0);
});

test('the hero poses follow the run: idle, run, squash on landing, smear then a spinning ball, rise, fall, hurt', async ()=>
{
    const { heroPose, POSE } = await import('../../src/player/pose.js');
    const { ANIMS, HERO_ANIMS, SPRITES } = await import('../../src/render/sprites-data.js');
    for (const name of [...HERO_ANIMS, 'walker', 'floater', 'spiker', 'star'])
    {
        const a = ANIMS[name];
        assert.ok(a, name);
        for (const f of a.frames) assert.ok(SPRITES[f], `${name} frame ${f}`);
        if (a.frames.length > 1) assert.equal(a.times.length, a.frames.length, name);
    }
    const w = createRun();
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
    assert.equal(heroPose(k.player, k.t + POSE.hurt / 2)[0], 'hurt');
});

test('blocks vary by tile, the same way every time, mostly plain', async ()=>
{
    const { SPRITES, blockAt } = await import('../../src/render/sprites-data.js');
    const names = [];
    for (let ty = 0; ty < 60; ty++) for (let tx = 0; tx < COLS; tx++)
    {
        const n = blockAt(tx, ty);
        assert.ok(SPRITES[n], n);
        assert.equal(blockAt(tx, ty), n);
        names.push(n);
    }
    const plain = names.filter((n)=> n === 'block').length / names.length;
    assert.ok(plain > .6 && plain < .95, `plain ${plain}`);
    assert.ok(names.includes('block1') && names.includes('block2'));
});
