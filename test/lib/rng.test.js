import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../../src/lib/rng.js';

test('the same seed gives the same numbers', ()=>
{
    const a = rng(5), b = rng(5);
    for (let i = 0; i < 20; i++) assert.equal(a.next(), b.next());
});

test('int stays in range', ()=>
{
    const r = rng(9);
    for (let i = 0; i < 200; i++) { const n = r.int(4); assert.ok(n >= 0 && n < 4); }
});
