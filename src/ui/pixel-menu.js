// Menus drawn on the 320 × 180 screen in the pixel font, over the frozen game: the pause menu, its questions and the
// high-score initials. show() takes rows of items, each { x, y, w, h, pick?, adjust? } in screen pixels, and a
// draw(g, t) for the whole menu, with t the seconds since it opened; ui/menu-nav.js moves the focus with keys and a
// pad, and a mouse or finger on the screen focuses and picks the item under it. Call update() each step and draw(g)
// after the frame. The helpers below draw the parts in the three colours set in look.
import { clearPresses } from '../platform/input.js';
import { menuNav } from './menu-nav.js';
import { pixelCentre, pixelText, pixelWidth } from './pixel-text.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav = menuNav();
let paint = null, t = 0, pressed = null, canvas = null;

// ink: words and buttons, accent: banners, ground: the dark behind them
export const look = { ink: '#fff', accent: '#fff', ground: '#000' };

export const pixelMenu = {
    get open() { return !!nav.rows; },
    /** the focused item */
    get focus() { return nav.focus; },
    // rows of items, the menu's draw(g, t), and focus, back(), move(item, how) as in ui/menu-nav.js
    show(rows, draw, opts = {})
    {
        paint = draw; t = 0; pressed = null;
        nav.set(rows, opts);
    },
    hide() { nav.clear(); paint = null; pressed = null; },
    update() { nav.update(); },
    draw(g, dt)
    {
        if (!nav.rows || !paint) return;
        canvas = g.canvas;
        t += dt;
        paint(g, t);
    },
};

// ---------------------------------------------------------------- pointer: hover focuses, press and release picks
function at(e)
{
    if (!canvas || e.target !== canvas) return null;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * canvas.width / r.width, y = (e.clientY - r.top) * canvas.height / r.height;
    const rows = nav.rows ?? [];
    for (let ry = 0; ry < rows.length; ry++)
        for (let rx = 0; rx < rows[ry].length; rx++)
        {
            const it = rows[ry][rx];
            if (x >= it.x && x < it.x + it.w && y >= it.y && y < it.y + it.h) return { ry, rx, it };
        }
    return null;
}
addEventListener('pointermove', (e)=> { if (nav.rows && e.pointerType === 'mouse') { const h = at(e); if (h) nav.take(h.ry, h.rx); } });
addEventListener('pointerdown', (e)=>
{
    if (!nav.rows) return;
    const h = at(e);
    pressed = h?.it ?? null;
    if (h) nav.take(h.ry, h.rx, '');
});
addEventListener('pointerup', (e)=>
{
    if (!nav.rows || !pressed) return;
    const h = at(e), it = pressed;
    pressed = null;
    if (h?.it !== it) return;
    // the press on the screen would also count as the game's button once the menu closes
    clearPresses();
    it.pick?.();
});

// ---------------------------------------------------------------- drawing
let dither = null;
// the frozen game behind a menu, darkened by a checker of the ground colour
export function dim(g)
{
    if (!dither)
    {
        const c = document.createElement('canvas');
        c.width = c.height = 2;
        const s = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
        s.fillStyle = look.ground;
        s.fillRect(0, 0, 1, 1); s.fillRect(1, 1, 1, 1);
        dither = g.createPattern(c, 'repeat');
    }
    g.fillStyle = dither;
    g.fillRect(0, 0, g.canvas.width, g.canvas.height);
}

// a box of the ground colour with a line of ink along its top and bottom
export function panel(g, x, y, w, h)
{
    g.fillStyle = look.ground;
    g.fillRect(x, y, w, h);
    g.fillStyle = look.ink;
    g.fillRect(x, y, w, 1);
    g.fillRect(x, y + h - 1, w, 1);
}

// a banner centred on cx, its letters dropping in one after another with a little bounce
export function banner(g, text, cx, y, size, time, fill = look.accent)
{
    let x = Math.round(cx - pixelWidth(text, size) / 2);
    [...text].forEach((ch, i)=>
    {
        const p = reduced ? 1 : Math.max(0, Math.min(1, (time - i * .028) / .3));
        if (p > 0)
        {
            const q = p - 1, back = 1 + 2.7 * q * q * q + 1.7 * q * q;
            pixelText(g, ch, x, Math.round(y - (1 - back) * size * .7), size, fill);
        }
        x += pixelWidth(ch + ch, size) - pixelWidth(ch, size);
    });
}

// a button: an outline in ink, filled with ink and the word in the ground colour when focused
export function button(g, it, label, focused)
{
    g.fillStyle = look.ink;
    if (focused) g.fillRect(it.x, it.y, it.w, it.h);
    else
    {
        g.fillRect(it.x, it.y, it.w, 1); g.fillRect(it.x, it.y + it.h - 1, it.w, 1);
        g.fillRect(it.x, it.y, 1, it.h); g.fillRect(it.x + it.w - 1, it.y, 1, it.h);
    }
    pixelCentre(g, label, it.x + it.w / 2, it.y + Math.round(it.h / 2) - 4, 10, focused ? look.ground : look.ink);
}

// a small triangle pointing up (dir 1) or down (dir -1), centred in the item
export function arrow(g, it, dir, focused)
{
    button(g, it, '', focused);
    g.fillStyle = focused ? look.ground : look.ink;
    const cx = Math.round(it.x + it.w / 2), top = Math.round(it.y + it.h / 2) - 2;
    for (let i = 0; i < 4; i++)
    {
        const row = dir > 0 ? i : 3 - i;
        g.fillRect(cx - row, top + i, row * 2 + 1, 1);
    }
}
