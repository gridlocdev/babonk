// Foes: walkers and spikers pace their ledges, floaters hover until they spot you and then chase. A bonk or a stomp
// breaks one (a spiker only to a bonk), with a moment of hit stop; touching one any other way hurts.
import { BLOCK, centre, fill, move, overlap, solid, tileAt } from '../../world/well.js';
import { addRunPart, happen, say } from '../../world/run.js';
import { COLS, GRAVITY, MAX_FALL, TILE } from '../../world/wells-data.js';
import { bounce, heroBox, hurt, placeHero } from '../../player/hero.js';
import { HERO } from '../../player/hero-data.js';
import { draw, frameOf } from '../../render/screen.js';
import { addRunLayer } from '../../render/view.js';
import { FOES } from './foes-data.js';

function kill(w, f)
{
    const c = FOES;
    f.alive = false;
    w.score += c.points[f.kind];
    say(w, 'pop');
    // everything stops for a moment while the foe flashes, a little longer the longer the chain
    w.freeze = Math.max(w.freeze, Math.min(c.hitStopMax, c.hitStop + w.chain * c.hitStopChain));
    w.fx.push({ kind: 'pop', x: f.x + f.w / 2, y: f.y + f.h / 2, foe: f.kind === 'floater' && f.chasing ? 'floaterMad' : f.kind, fx: f.x, fy: f.y, left: f.kind !== 'floater' && f.dir < 0, phase: f.phase, hold: w.freeze });
    happen(w, 'broke', { what: 'foe', x: f.x + f.w / 2, y: f.y + f.h / 2 });
}

function stepFoes(w, dt)
{
    const c = FOES, [px, py] = centre(heroBox(w));
    for (const f of w.foes)
    {
        if (!f.alive) continue;
        if (f.kind === 'floater')
        {
            const [fx, fy] = centre(f), dx = px - fx, dy = py - fy, d = Math.hypot(dx, dy);
            f.phase += dt * 2.4;
            const sees = w.state === 'play' && d < c.floaterSight * (f.chasing ? c.floaterLose : 1);
            if (sees && !f.chasing) { f.chasing = true; f.alertAt = w.t; say(w, 'alert'); }
            else if (!sees) f.chasing = false;
            // spotted you: hang still for the tell, then come
            if (f.chasing && w.t - f.alertAt < c.floaterTell) { f.vx = f.vy = 0; continue; }
            if (f.chasing) { f.vx = dx / d * c.floaterSpeed; f.vy = dy / d * c.floaterSpeed; }
            else { f.vx = (f.homeX - f.x) * 1.5; f.vy = (f.homeY + Math.sin(f.phase) * 4 - f.y) * 1.5; }
            move(w, f, f.vx * dt, f.vy * dt);
            continue;
        }
        // walkers and spikers pace their ledge, turning at walls and edges
        f.vy = Math.min(MAX_FALL, f.vy + GRAVITY * dt);
        const hits = move(w, f, f.dir * c.walkerSpeed * dt, f.vy * dt);
        if (hits.y && hits.y.dir > 0) f.vy = 0;
        const aheadX = f.dir > 0 ? f.x + f.w + 1 : f.x - 1;
        const edge = f.vy === 0 && !solid(tileAt(w, Math.floor(aheadX / TILE), Math.floor((f.y + f.h + 1) / TILE)));
        if (hits.x || edge) f.dir = -f.dir;
        if (f.y > w.rows * TILE) f.alive = false;
    }
}

function touchFoes(w)
{
    const p = w.player, b = heroBox(w);
    for (const f of w.foes)
    {
        if (!f.alive || !overlap(b, f)) continue;
        if (p.dash || w.t < p.attackUntil) { kill(w, f); bounce(w, p.vx * .3, -HERO.bounceV, true); continue; }
        // falling with your middle above its middle is a stomp, even if a drifting foe met you at the corner
        const fromAbove = p.vy > 0 && b.y + b.h / 2 <= f.y + f.h / 2;
        if (fromAbove && f.kind !== 'spiker') { kill(w, f); bounce(w, p.vx, -HERO.stompV, true); continue; }
        hurt(w);
        if (w.state !== 'play') return;
    }
}

// a foe standing on tile (tx, ty)
function makeFoe(kind, tx, ty, dir = 1, phase = 0)
{
    const s = FOES.size;
    return {
        kind, alive: true, w: s, h: s,
        x: tx * TILE + (TILE - s) / 2, y: ty * TILE + TILE - s,
        vx: 0, vy: 0, dir, homeX: tx * TILE, homeY: ty * TILE, phase,
        chasing: false, alertAt: -1,     // floaters: after you, and when they spotted you
    };
}

// the foes the well's chunks placed, standing on their tiles, each facing a random way
function enter(w)
{
    w.foes = w.spawns.map((f)=>
    {
        const dir = w.rng.next() < .5 ? -1 : 1;
        return makeFoe(f.kind, f.tx, f.ty, dir, w.rng.next() * 6);
    });
}

// ---- the dev rooms (?debug&room=gym, ?debug&room=museum): cases and exhibits built from the real foes

const IDLE = { x: 0, y: 0, held: false, pressed: false }, BONK = { x: 0, y: 0, held: true, pressed: true };
const foeAt = (w, kind, tx, ty)=> { const f = makeFoe(kind, tx, ty); w.foes.push(f); return f; };
// a foe on a one-tile ledge, so it turns on the spot instead of walking off
const perched = (w, kind, tx, ty)=> { fill(w, tx, tx, ty + 1, BLOCK); return foeAt(w, kind, tx, ty); };

/** @returns {import('../../game/loop.js').GymRow[]} */
function gym()
{
    // lock: a floater straight below the hero, d tiles centre to centre; the bonk must home in on it
    const LOCK = [5, 6, 7, 8, 9, 10];
    const lock = {
        id: 'lock', title: 'Bonk lock range', file: 'src/player/hero.js lockTarget', unit: 't',
        text: 'A floater straight below, centre to centre. Bonk in the air: it must home in on that floater.',
        cases: LOCK.map((d, i)=> ({
            name: `${d} tiles`, value: d, max: HERO.lockRange / TILE, at: [2 + i * 3, 3],
            start(w)
            {
                const x = (2 + i * 3) * TILE, y = 4 * TILE;
                placeHero(w, x, y);
                const f = foeAt(w, 'floater', 0, 0);
                Object.assign(f, { x: x + HERO.w / 2 - f.w / 2, y: y + HERO.h / 2 + d * TILE - f.h / 2 });
                f.homeX = f.x; f.homeY = f.y;
                return { f };
            },
            ctrl: (w, s, n)=> n === 0 ? BONK : IDLE,
            done: (w, s, n)=> n >= 1,
            passed: (w, s)=> w.player.dash?.kind === 'home' && w.player.dash.target === s.f,
        })),
    };
    // kill: what breaks which foe; a stomp is falling onto it, a bonk is dashing into it
    const KILL = [{ kind: 'walker', bonk: false, band: 'easy' }, { kind: 'floater', bonk: false, band: 'easy' },
        { kind: 'spiker', bonk: false, band: 'no' }, { kind: 'spiker', bonk: true, band: 'easy' }];
    const kill = {
        id: 'kill', title: 'What breaks a foe', file: 'src/features/foes/index.js touchFoes', unit: '',
        text: 'Stomp walkers and floaters. A spiker hurts a stomp; only a bonk breaks it.',
        cases: KILL.map(({ kind, bonk, band }, i)=> ({
            name: `${bonk ? 'bonk' : 'stomp'} ${kind}`, value: bonk ? 'BONK' : 'STOMP', band, at: [2 + i * 4, 4],
            start(w)
            {
                const tx = 3 + i * 4, f = perched(w, kind, tx, 10);
                if (kind === 'floater') { f.homeY = f.y; }
                placeHero(w, tx * TILE + 1, 5 * TILE);
                return { f, hp: w.hp };
            },
            ctrl: (w, s, n)=> bonk && n === 0 ? BONK : IDLE,
            done: (w, s, n)=> !s.f.alive || w.hp < s.hp || n > 90,
            passed: (w, s)=> !s.f.alive && w.hp === s.hp,
        })),
    };
    return [lock, kill];
}

/** @returns {import('../../game/loop.js').Exhibit[]} */
function museum()
{
    return [
        {
            id: 'tell', title: 'A floater\'s tell', file: 'src/features/foes/index.js stepFoes',
            text: 'A floater that spots you stops and stares (the !) for its tell, then chases. The tell is your warning.',
            start(w)
            {
                fill(w, 1, COLS_IN, 12, BLOCK);
                placeHero(w, 3 * TILE, 11 * TILE);
                const f = foeAt(w, 'floater', 12, 9);
                return { f, x: f.x, still: true, moved: false };
            },
            // still while it stares, then a tile toward you
            done(w, s)
            {
                const f = s.f, inTell = f.chasing && w.t - f.alertAt < FOES.floaterTell;
                if (inTell && f.x !== s.x) s.still = false;
                if (inTell) s.x = f.x;
                if (f.chasing && !inTell && f.x < s.x - TILE) s.moved = true;
                return s.moved;
            },
            passed: (w, s)=> s.still && s.moved,
        },
        {
            id: 'hitstop', title: 'Hit stop', file: 'src/features/foes/index.js kill',
            text: 'A kill freezes everything for a moment, longer the longer the chain. A press made in it still counts.',
            start(w)
            {
                const f = perched(w, 'walker', 9, 10);
                placeHero(w, 9 * TILE + 1, 5 * TILE);
                return { f, frozen: 0, t: 0 };
            },
            done(w, s)
            {
                if (w.freeze > 1e-9 && w.t === s.t) s.frozen++;
                s.t = w.t;
                return !s.f.alive && w.freeze <= 1e-9;
            },
            passed: (w, s)=> !s.f.alive && s.frozen >= 2,
        },
    ];
}
const COLS_IN = COLS - 2;

// the foes on screen; a floater glares (mad, with a '!') while it has you in sight, the '!' only for its tell
function drawFoes(w, { ox, oy, camY, clock, h })
{
    for (const f of w.foes)
    {
        if (!f.alive || f.y + f.h < camY - 8 || f.y > camY + h + 8) continue;
        const mad = f.kind === 'floater' && f.chasing;
        draw(frameOf(mad ? 'floaterMad' : f.kind, clock + f.phase), ox + f.x, oy + f.y, f.kind !== 'floater' && f.dir < 0);
        if (mad && w.t - f.alertAt < FOES.floaterTell) draw('bang', ox + f.x + 3, oy + f.y - 9);
    }
}

export default {
    id: 'foes',
    build()
    {
        addRunPart({ enter, step(w, dt) { stepFoes(w, dt); touchFoes(w); } });
        addRunLayer(2, drawFoes);
    },
    gym,
    museum,
};
