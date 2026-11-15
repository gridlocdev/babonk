// The game's 320 × 180 screen and its sprites: every sprite in sprites-data.js baked once to a small canvas, with a
// mirrored copy for facing left, and an all-mint copy of each way for the flash of a foe as it's hit.
import { pixelScreen } from '../platform/engine.js';
import { frameAt } from '../lib/anim.js';
import { ANIMS, PALETTE, SPRITES } from './sprites-data.js';

export const SCREEN = { w: 320, h: 180 };
export const g = pixelScreen(SCREEN.w, SCREEN.h);

function bake(rows, flip, ink)
{
    const c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    const s = c.getContext('2d');
    rows.forEach((row, y)=> [...row].forEach((ch, x)=>
    {
        if (ch === '.') return;
        s.fillStyle = ink ?? PALETTE[ch];
        s.fillRect(flip ? c.width - 1 - x : x, y, 1, 1);
    }));
    return c;
}
export const sprite = {}, mirror = {}, white = {}, whiteMirror = {};
for (const [k, rows] of Object.entries(SPRITES))
{
    sprite[k] = bake(rows, false); mirror[k] = bake(rows, true);
    white[k] = bake(rows, false, PALETTE.W); whiteMirror[k] = bake(rows, true, PALETTE.W);
}

export function draw(name, x, y, left = false) { g.drawImage((left ? mirror : sprite)[name], Math.round(x), Math.round(y)); }
// the frame of animation `name` that shows `time` seconds in
export function frameOf(name, time)
{
    const a = ANIMS[name];
    return a.frames.length > 1 ? a.frames[frameAt(a.times, time, a.loop !== false)] : a.frames[0];
}
