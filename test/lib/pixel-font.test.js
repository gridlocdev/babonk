import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CELL, measure, pixels } from '../../src/lib/pixel-font.js';

const NEEDED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,·!?:^-/\'()+<>%';

test('every glyph a game screen needs is drawn, inside its width and the cell', ()=>
{
    const unknown = JSON.stringify(pixels('?'));
    for (const ch of NEEDED)
    {
        const px = pixels(ch), w = measure(ch);
        if (ch !== ' ' && ch !== '?') assert.notEqual(JSON.stringify(px), unknown, `missing ${ch}`);
        for (const [x, y] of px) assert.ok(x >= 0 && x < w && y >= 1 && y < CELL, `${ch} pixel (${x}, ${y})`);
    }
});

test('lines are measured with one pixel between letters', ()=>
{
    assert.equal(measure(''), 0);
    assert.equal(measure('A'), 5);
    assert.equal(measure('AI'), 5 + 1 + 3);
    assert.equal(measure('x1.0'), 5 + 1 + 3 + 1 + 1 + 1 + 5);
});

test('pixels sit below the empty top row and inside the line', ()=>
{
    const px = pixels('Hi!');
    const w = measure('Hi!');
    assert.ok(px.length > 0);
    for (const [x, y] of px) assert.ok(x >= 0 && x < w && y >= 1 && y < CELL);
    assert.deepEqual(pixels('l'), [0, 1, 2, 3, 4, 5, 6].map((y)=> [0, y + 1]));
});
