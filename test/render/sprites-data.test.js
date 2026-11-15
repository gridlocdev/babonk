import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, SPRITES, blockAt } from '../../src/render/sprites-data.js';
import { COLS } from '../../src/world/wells-data.js';

test('every sprite is a clean grid in the three colours', ()=>
{
    for (const [k, rows] of Object.entries(SPRITES))
        for (const r of rows) assert.match(r, new RegExp(`^[.${Object.keys(PALETTE).join('')}]{${rows[0].length}}$`), k);
});

test('blocks vary by tile, the same way every time, mostly plain', ()=>
{
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
