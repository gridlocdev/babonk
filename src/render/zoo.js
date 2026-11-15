// The sprite zoo, a debug screen (?debug&shot=zoo): every animation playing at 3×, every frame side by side at
// the game's own scale, and a little ledge with the cast at play size, so a new sprite shows up the moment it's added
// to sprites-data.js. &view=gray or &view=silhouette swaps in a check view, &t=<seconds> freezes the clock for stills.
import { pixelCentre, pixelText } from '../ui/pixel-text.js';
import { ANIMS, HERO_ANIMS, PALETTE, blockAt } from './sprites-data.js';

const BIG = 3;
const FOES = ['walker', 'floater', 'floaterMad', 'spiker', 'star'];
const TILES = ['block', 'block1', 'block2', 'crate', 'spikes'];

// one cell: the animation at 3×, centred in a box `cw` wide, with its name under it (every other name a line lower,
// so long ones don't run together)
function cell(g, ctx, name, frame, x, y, cw, i)
{
    const img = ctx.sprite[frame];
    g.drawImage(img, Math.round(x + (cw - img.width * BIG) / 2), y + 24 - img.height * BIG, img.width * BIG, img.height * BIG);
    pixelCentre(g, name, x + cw / 2, y + 28 + (i % 2) * 8, 10, PALETTE.W);
}

export function drawZoo(g, ctx)
{
    const t = ctx.t;
    g.imageSmoothingEnabled = false;
    pixelText(g, 'BABONK ZOO', 4, 3, 10, PALETTE.O);

    // the hero, every animation playing
    const cw = 35;
    HERO_ANIMS.forEach((name, i)=> cell(g, ctx, name, ctx.frameOf(name, t), 2 + i * cw, 14, cw, i));
    // foes and the star, then the tiles, in narrower cells to fit
    const cf = 31;
    FOES.forEach((name, i)=> cell(g, ctx, name, ctx.frameOf(name, t), 4 + i * cf, 60, cf, i));
    TILES.forEach((name, i)=> cell(g, ctx, name, name, 4 + (i + FOES.length) * cf, 60, cf, i + FOES.length));

    // every frame of every animation at play size, in order
    let x = 4;
    const y = 112;
    pixelText(g, 'frames', 4, y - 10, 10, PALETTE.W);
    const seen = new Set();
    for (const a of Object.values(ANIMS))
        for (const f of a.frames)
        {
            if (seen.has(f)) continue;
            seen.add(f);
            const img = ctx.sprite[f];
            g.drawImage(img, x, y + 8 - img.height);
            x += img.width + 3;
        }

    // the cast on a ledge at play size: what the player actually sees
    const floor = 168;
    // a ledge of mixed blocks
    for (let bx = 40; bx < 280; bx += 8) g.drawImage(ctx.sprite[blockAt(bx / 8, 3)], bx, floor);
    g.drawImage(ctx.sprite.crate, 232, floor - 8);
    g.drawImage(ctx.sprite.spikes, 256, floor - 8);
    const on = (frame, px)=> g.drawImage(ctx.sprite[frame], px, floor - ctx.sprite[frame].height);
    on(ctx.frameOf('idle', t), 60);
    on(ctx.frameOf('walker', t), 100);
    on(ctx.frameOf('spiker', t + .1), 140);
    g.drawImage(ctx.sprite[ctx.frameOf('floaterMad', t)], 180, floor - 26);
    g.drawImage(ctx.sprite.bang, 183, floor - 35);
    // a walker caught by a bonk, in its hit flash
    g.drawImage(ctx.white[ctx.frameOf('walker', t)], 84, floor - 8);
    g.drawImage(ctx.sprite[ctx.frameOf('ball', t)], 120, floor - 30);
    g.drawImage(ctx.sprite[ctx.frameOf('star', t)], 205, floor - 14);
    g.drawImage(ctx.sprite[ctx.frameOf('star', t + .15)], 214, floor - 20);
    pixelText(g, 'at play size', 4, floor - 26, 10, PALETTE.W);
}

// check views over whatever was drawn: GRAY shows whether the values separate; SILHOUETTE turns every drawn pixel
// into one dark ink on a light backdrop, so each sprite reads by its outline alone
export function checkView(g, view)
{
    const { width, height } = g.canvas, img = g.getImageData(0, 0, width, height), d = img.data;
    const ground = [0x0b, 0x0f, 0x1e];
    for (let i = 0; i < d.length; i += 4)
    {
        if (view === 'gray')
        {
            // perceived lightness of the sRGB colour, near enough for a check
            const v = Math.round(.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]);
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        else if (view === 'silhouette')
        {
            const bg = d[i] === ground[0] && d[i + 1] === ground[1] && d[i + 2] === ground[2];
            d[i] = d[i + 1] = d[i + 2] = bg ? 225 : 20;
        }
    }
    g.putImageData(img, 0, 0);
}
