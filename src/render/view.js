// Babonk's picture: drawn each frame on the 320 × 180 screen in three colours; platform/engine.js shows it scaled up
// by a whole number. The well runs down the middle with the HUD either side. Features draw what they add to the well
// through addRunLayer(); effects (bits flying, a shake, the chain count) come from the run's w.fx queue.
import { MOBILE } from '../platform/engine.js';
import { setting } from '../game/settings.js';
import { pixelCentre, pixelText } from '../ui/pixel-text.js';
import { COLS, TILE } from '../world/wells-data.js';
import { BLOCK, CRATE, SPIKES, tileAt } from '../world/well.js';
import { depth, wellCount } from '../world/run.js';
import { invulnerable, lockTarget } from '../player/hero.js';
import { HERO } from '../player/hero-data.js';
import { heroPose } from '../player/pose.js';
import { PALETTE, blockAt } from './sprites-data.js';
import { SCREEN, draw, frameOf, g, sprite, white, whiteMirror } from './screen.js';
import { checkView, drawZoo } from './zoo.js';

const W = SCREEN.w, H = SCREEN.h;
// the well sits in the middle of the screen with the HUD either side
const WELL_X = (W - COLS * TILE) / 2;
const BONE = PALETTE.W, ORANGE = PALETTE.O, BLACK = PALETTE.K;   // the pale, accent and ground colours
const TILE_SPRITE = { [CRATE]: 'crate', [SPIKES]: 'spikes' };

// what features draw in the well, under the hero, lowest z first: draw(w, { ox, oy, camY, clock, h })
const layers = [];
export function addRunLayer(z, drawLayer) { layers.push({ z, draw: drawLayer }); layers.sort((a, b)=> a.z - b.z); }

let clock = 0, camY = 0, camWell = -1, shake = 0, flash = 0;
const bits = [], labels = [], ghosts = [], hits = [];

// a sideways smear is wider than the hero, so it sits a pixel out each side
const OFFSET = { smearH: [-1, 1] };
function drawHero(name, time, x, y, left)
{
    const [dx, dy] = OFFSET[name] ?? [0, 0];
    draw(frameOf(name, time), x + dx, y + dy, left);
}

function burst(e, colour, kick)
{
    for (let i = 0; i < 8; i++)
    {
        const a = i / 8 * Math.PI * 2 + Math.random() * .4, v = 50 + Math.random() * 60;
        bits.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: .5, c: colour });
    }
    shake = Math.max(shake, kick * setting('a11y.shake'));
}

// turn the run's effect queue into hits, bits, labels and shake
function takeFx(w)
{
    for (const e of w.fx)
    {
        // a foe hit shows as a mint silhouette for the hit stop, then bursts
        if (e.kind === 'pop') hits.push({ ...e, name: frameOf(e.foe, clock + e.phase), life: e.hold });
        else if (e.kind === 'crate') burst(e, BONE, 1);
        // Screen shake scales the kick; Reduce flashing drops the whole-well flash (the hurt sound and blink remain)
        else if (e.kind === 'hurt') { shake = 4 * setting('a11y.shake'); flash = setting('a11y.reduceFlashing') ? 0 : 2; }
        else if (e.kind === 'chain') labels.push({ text: `CHAIN x${e.n}`, x: e.x, y: e.y, life: 1 });
    }
    w.fx.length = 0;
}

function drawWell(w, ox, oy)
{
    const top = Math.floor(camY / TILE);
    for (let ty = top; ty <= top + H / TILE + 1; ty++)
        for (let tx = 0; tx < COLS; tx++)
        {
            const t = tileAt(w, tx, ty);
            const name = t === BLOCK ? blockAt(tx, ty) : TILE_SPRITE[t];
            if (name) draw(name, ox + tx * TILE, oy + ty * TILE);
        }
    for (const l of layers) l.draw(w, { ox, oy, camY, clock, h: H });
    for (const h of hits) g.drawImage((h.left ? whiteMirror : white)[h.name], Math.round(ox + h.fx), Math.round(oy + h.fy));

    const p = w.player;
    // the foe a bonk would go for, bracketed while the bonk is ready in the air
    const lock = !p.ground && p.bonk && !p.dash && w.state === 'play' ? lockTarget(w) : null;
    if (lock && Math.floor(clock * 8) % 2 === 0)
    {
        g.fillStyle = ORANGE;
        const x0 = Math.round(ox + lock.x - 3), y0 = Math.round(oy + lock.y - 3), x1 = x0 + lock.w + 5, y1 = y0 + lock.h + 5;
        for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]])
        { g.fillRect(x, y, 1, 1); g.fillRect(x + dx, y, 1, 1); g.fillRect(x, y + dy, 1, 1); }
    }

    // afterimages trail a bonk, every other pixel lit
    if (p.dash) ghosts.push({ x: p.x, y: p.y, life: .12 });
    for (const gh of ghosts)
    {
        g.fillStyle = BONE;
        const x = Math.round(ox + gh.x), y = Math.round(oy + gh.y);
        for (let yy = 0; yy < HERO.h; yy++) for (let xx = (yy + Math.round(gh.x)) % 2; xx < HERO.w; xx += 2) g.fillRect(x + xx, y + yy, 1, 1);
    }

    const blink = invulnerable(w) && Math.floor(clock * 15) % 2;
    if (w.state !== 'dead' && !blink) { const [name, time] = heroPose(p, w.t); drawHero(name, time, ox + p.x, oy + p.y, p.face < 0); }

    for (const b of bits) { g.fillStyle = b.c; g.fillRect(Math.round(ox + b.x), Math.round(oy + b.y), 2, 2); }
    for (const l of labels) pixelCentre(g, l.text, ox + l.x + 3, oy + l.y - 14 - (1 - l.life) * 10, 10, ORANGE);
}

function age(list, dt, move)
{
    for (let i = list.length - 1; i >= 0; i--)
    {
        const e = list[i];
        e.life -= dt;
        if (e.life <= 0) { list.splice(i, 1); continue; }
        move?.(e);
    }
}

function drawHud(w)
{
    const left = 8, right = WELL_X + COLS * TILE + 8;
    pixelText(g, 'HP', left, 8, 10, BONE);
    for (let i = 0; i < HERO.maxHp; i++)
    {
        g.fillStyle = ORANGE;
        if (i < w.hp) g.fillRect(left + i * 9, 22, 7, 7);
        else { g.fillRect(left + i * 9, 22, 7, 1); g.fillRect(left + i * 9, 28, 7, 1); g.fillRect(left + i * 9, 22, 1, 7); g.fillRect(left + i * 9 + 6, 22, 1, 7); }
    }
    pixelText(g, 'BONK', left, 40, 10, BONE);
    if (w.player.bonk) draw('ball0', left + 30, 41);
    if (w.chain >= 2) pixelText(g, `x${w.chain}`, left, 60, 20, ORANGE);

    pixelText(g, 'SCORE', right, 8, 10, BONE);
    pixelText(g, String(w.score), right, 20, 10, ORANGE);
    pixelText(g, `WELL ${w.well + 1}/${wellCount()}`, right, 40, 10, BONE);
    // how far down: a line with a marker
    const gx = right + 30, top = 60, bottom = 168;
    g.fillStyle = BONE;
    g.fillRect(gx, top, 1, bottom - top);
    g.fillRect(gx - 2, top, 5, 1); g.fillRect(gx - 2, bottom, 5, 1);
    g.fillStyle = ORANGE;
    g.fillRect(gx - 3, Math.round(top + depth(w) * (bottom - top)) - 1, 7, 3);
}

// a black box behind words over the well
function panel(y0, y1)
{
    g.fillStyle = BLACK;
    g.fillRect(WELL_X + 8, y0, COLS * TILE - 16, y1 - y0);
    g.fillStyle = BONE;
    g.fillRect(WELL_X + 8, y0, COLS * TILE - 16, 1);
    g.fillRect(WELL_X + 8, y1 - 1, COLS * TILE - 16, 1);
}

// the prompt for the device last used
export function pressWord(padUsed)
{
    if (MOBILE) return 'TAP BONK';
    return padUsed ? 'PRESS A' : 'PRESS SPACE';
}
// how to open settings from the title; a touch screen has its button in the corner
export function settingsWord(padUsed)
{
    if (MOBILE) return '';
    return padUsed ? 'MENU: SETTINGS' : 'ESC: SETTINGS';
}
const blinkOn = ()=> Math.floor(clock * 2) % 2 === 0;

function drawTitle(ui)
{
    pixelCentre(g, 'BABONK', W / 2, 26, 30, BONE);
    // the hero bouncing over the title, for show
    const hop = Math.abs(Math.sin(clock * 3.2));
    drawHero(hop > .85 ? 'ball' : hop > .5 ? 'fall' : 'rise', clock, W / 2 - 3, 14 - hop * 12);
    pixelCentre(g, 'bonk off foes, walls and floors', W / 2, 70, 10, BONE);
    if (blinkOn()) pixelCentre(g, ui.prompt, W / 2, 104, 10, ORANGE);
    pixelCentre(g, `HI ${ui.hi}`, W / 2, 126, 10, BONE);
    if (ui.settingsWord) pixelCentre(g, ui.settingsWord, W / 2, 162, 10, BONE);
}

// draw a frame. ui: { screen: 'title' | 'play' | 'rest' | 'over' | 'zoo', prompt, hi, info,
// view: '' | 'gray' | 'silhouette' (debug check views), t: a fixed zoo time for stills }
export function render(w, ui, dt)
{
    clock += dt;
    g.fillStyle = BLACK;
    g.fillRect(0, 0, W, H);
    if (ui.screen === 'zoo') drawZoo(g, { sprite, white, frameOf, t: ui.t ?? clock });
    else if (ui.screen === 'title') drawTitle(ui);
    else
    {
        if (camWell !== w.well) { camWell = w.well; camY = 0; bits.length = labels.length = ghosts.length = hits.length = 0; }
        takeFx(w);
        const want = Math.max(0, Math.min(w.rows * TILE - H, w.player.y - 64));
        camY += (want - camY) * Math.min(1, dt * 10);
        age(bits, dt, (b)=> { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 300 * dt; });
        age(labels, dt);
        age(ghosts, dt);
        for (let i = hits.length - 1; i >= 0; i--) if ((hits[i].life -= dt) <= 0) { burst(hits[i], ORANGE, 2); hits.splice(i, 1); }
        shake = Math.max(0, shake - dt * 20);
        const sx = shake ? Math.round((Math.random() - .5) * shake) : 0, sy = shake ? Math.round((Math.random() - .5) * shake) : 0;
        drawWell(w, WELL_X + sx, -Math.round(camY) + sy);
        drawHud(w);
        if (ui.screen === 'rest')
        {
            panel(50, 128);
            pixelCentre(g, `WELL ${w.well + 1} CLEAR`, W / 2, 58, 20, BONE);
            pixelCentre(g, `+${ui.info.bonus}`, W / 2, 84, 10, ORANGE);
            pixelCentre(g, ui.info.healed ? '+1 HP' : 'HP FULL', W / 2, 96, 10, ORANGE);
            if (ui.prompt && blinkOn()) pixelCentre(g, ui.prompt, W / 2, 112, 10, BONE);
        }
        else if (ui.screen === 'over')
        {
            panel(40, 140);
            pixelCentre(g, ui.info.won ? 'YOU MADE IT!' : 'GAME OVER', W / 2, 48, 20, ui.info.won ? BONE : ORANGE);
            pixelCentre(g, `SCORE ${ui.info.score}`, W / 2, 74, 10, BONE);
            if (ui.info.best) pixelCentre(g, 'NEW HIGH!', W / 2, 88, 10, ORANGE);
            pixelCentre(g, `HI ${ui.hi}`, W / 2, 102, 10, BONE);
            if (ui.prompt && blinkOn()) pixelCentre(g, ui.prompt, W / 2, 120, 10, ORANGE);
        }
        // a hit flashes the well with a checker of bone, keeping to three colours
        if (flash > 0)
        {
            flash--;
            g.fillStyle = BONE;
            for (let y = 0; y < H; y += 2) for (let x = WELL_X + (y / 2) % 2 * 2; x < WELL_X + COLS * TILE; x += 4) g.fillRect(x, y, 2, 2);
        }
    }
    if (ui.view) checkView(g, ui.view);
}
