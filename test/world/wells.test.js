import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../../src/lib/rng.js';
import { CHUNKS, CHUNK_ROWS, COLS, FLOOR, START, WELLS } from '../../src/world/wells-data.js';
import { BLOCK, pickChunks } from '../../src/world/well.js';
import { createRun, nextWell } from '../../src/world/run.js';
import { hero } from '../../src/player/hero.js';

const all = [START, FLOOR, ...Object.values(CHUNKS).flat()];

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
    const w = createRun(5, [hero]);
    assert.equal(w.rows, (WELLS[0].chunks + 2) * CHUNK_ROWS);
    assert.equal(w.grid[0], BLOCK);
    assert.equal(w.grid[COLS - 1], BLOCK);
    nextWell(w);
    assert.equal(w.well, 1);
    assert.equal(w.rows, (WELLS[1].chunks + 2) * CHUNK_ROWS);
    assert.equal(w.state, 'play');
});
