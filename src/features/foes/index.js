// Foes: walkers and spikers pace their ledges, floaters hover until they spot you and then chase. A bonk or a stomp
// breaks one (a spiker only to a bonk), with a moment of hit stop; touching one any other way hurts.
import { centre, move, overlap, solid, tileAt } from '../../world/well.js';
import { addRunPart, happen, say } from '../../world/run.js';
import { GRAVITY, MAX_FALL, TILE } from '../../world/wells-data.js';
import { bounce, heroBox, hurt } from '../../player/hero.js';
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

// the foes the well's chunks placed, standing on their tiles, each facing a random way
function enter(w)
{
    const s = FOES.size;
    w.foes = w.spawns.map((f)=> ({
        kind: f.kind, alive: true, w: s, h: s,
        x: f.tx * TILE + (TILE - s) / 2, y: f.ty * TILE + TILE - s,
        vx: 0, vy: 0, dir: w.rng.next() < .5 ? -1 : 1, homeX: f.tx * TILE, homeY: f.ty * TILE, phase: w.rng.next() * 6,
        chasing: false, alertAt: -1,     // floaters: after you, and when they spotted you
    }));
}

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
};
