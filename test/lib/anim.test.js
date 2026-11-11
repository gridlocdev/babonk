import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameAt } from '../../src/lib/anim.js';

test('frameAt holds each frame for its own time, and loops or holds the last', ()=>
{
    const d = [.1, .05, .2];
    assert.deepEqual([0, .09, .11, .14, .16, .34].map((t)=> frameAt(d, t)), [0, 0, 1, 1, 2, 2]);
    assert.equal(frameAt(d, .36), 0, 'wraps');
    assert.equal(frameAt(d, 5, false), 2, 'holds');
    assert.equal(frameAt([], 1), 0);
});
