// Three letters for the high-score table, drawn on the screen in the pixel font: each letter with an up and a down
// arrow, and Done. Works with keys, a pad and touch through ui/pixel-menu.js; call pixelMenu.update() each step and
// pixelMenu.draw(g) after the frame while it shows.
//   showInitials({ start: 'AAA', banner, change(), move(), done(name) })
import { nextLetter } from '../lib/high-scores.js';
import { arrow, banner as drawBanner, button, dim, look, panel, pixelMenu } from './pixel-menu.js';
import { pixelCentre } from './pixel-text.js';

const CX = 160, GAP = 30;

export function showInitials({ start = 'AAA', banner = 'HIGH SCORE!', change = ()=> {}, move = ()=> {}, done })
{
    const letters = start.split('');
    const col = (i)=> CX + (i - 1) * GAP;
    const turn = (i, dir)=> ()=> { letters[i] = nextLetter(letters[i], dir); change(); };
    const finish = ()=> { pixelMenu.hide(); done(letters.join('')); };
    const ups = [0, 1, 2].map((i)=> ({ x: col(i) - 10, y: 62, w: 20, h: 11, pick: turn(i, 1) }));
    const downs = [0, 1, 2].map((i)=> ({ x: col(i) - 10, y: 101, w: 20, h: 11, pick: turn(i, -1) }));
    const ok = { x: CX - 32, y: 122, w: 64, h: 14, pick: finish };
    pixelMenu.show([ups, downs, [ok]], (g, t)=>
    {
        const f = pixelMenu.focus;
        dim(g);
        panel(g, 88, 26, 144, 120);
        drawBanner(g, banner, CX, 34, 20, t);
        letters.forEach((ch, i)=> pixelCentre(g, ch, col(i), 76, 20, look.ink));
        ups.forEach((it)=> arrow(g, it, 1, f === it));
        downs.forEach((it)=> arrow(g, it, -1, f === it));
        button(g, ok, 'DONE', f === ok);
    }, { focus: [2, 0], back: finish, move });
}
