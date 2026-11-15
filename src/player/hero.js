// The hero: runs, jumps and bonks. On the ground the button jumps; in the air it bonks: home in on the foe lockTarget()
// picks, or dash the held way. Hitting a foe, wall, floor or crate while bonking bounces you off it and gives the bonk
// back. It's the run's first part (world/run.js), and tells the others when it bounced, was hurt, landed or broke a crate.
import { CRATE, EMPTY, SPIKES, centre, clearLine, move, setTile } from '../world/well.js';
import { happen, say } from '../world/run.js';
import { COLS, GRAVITY, MAX_FALL, TILE } from '../world/wells-data.js';
import { HERO } from './hero-data.js';

export const heroBox = (w)=> ({ x: w.player.x, y: w.player.y, w: HERO.w, h: HERO.h });
export const invulnerable = (w)=> w.t < w.player.invulnUntil;
// put the hero's box at (x, y), still and in the air, for a scene built by hand (the dev rooms)
export function placeHero(w, x, y) { Object.assign(w.player, { x, y, vx: 0, vy: 0, ground: false }); }

// the foe a bonk would home in on: the nearest live one in reach, inside a cone around straight down, with nothing
// solid in the way, so a homing bonk never dives through a ledge
export function lockTarget(w)
{
    const [px, py] = centre(heroBox(w));
    const cos = Math.cos(HERO.lockConeDeg * Math.PI / 180);
    let best = null, bestD = HERO.lockRange;
    for (const f of w.foes)
    {
        if (!f.alive) continue;
        const [fx, fy] = centre(f), dx = fx - px, dy = fy - py, d = Math.hypot(dx, dy);
        if (d >= bestD || d < 1e-6 || dy / d < cos || !clearLine(w, px, py, fx, fy)) continue;
        best = f; bestD = d;
    }
    return best;
}

function startBonk(w, ctrl)
{
    const p = w.player, target = lockTarget(w);
    p.bonk = false;
    p.jumping = false;
    if (target) p.dash = { kind: 'home', target, t: 0 };
    else
    {
        // 8 ways, from the stick; straight down with nothing held
        let ax = ctrl.x, ay = -ctrl.y;
        if (Math.hypot(ax, ay) < .3) { ax = 0; ay = 1; }
        const a = Math.round(Math.atan2(ay, ax) / (Math.PI / 4)) * (Math.PI / 4);
        p.dash = { kind: 'aim', dx: Math.cos(a), dy: Math.sin(a), t: 0 };
        if (Math.abs(p.dash.dx) > .1) p.face = Math.sign(p.dash.dx);
    }
    say(w, 'bonk');
    w.fx.push({ kind: 'bonk', x: p.x + HERO.w / 2, y: p.y + HERO.h / 2 });
}

// a bounce off something: the bonk comes back. `kill` says it broke a foe or a crate, which grows the chain
export function bounce(w, vx, vy, kill = false)
{
    const p = w.player;
    p.vx = vx; p.vy = vy;
    p.bounceAt = w.t;
    p.dash = null;
    p.bonk = true;
    p.jumping = false;
    happen(w, 'bounced', { kill });
    say(w, 'bounce', 1 + Math.min(w.chain, 12) * .06);
}

export function hurt(w)
{
    const p = w.player;
    if (invulnerable(w)) return;
    w.hp--;
    p.invulnUntil = w.t + HERO.invuln;
    p.hurtAt = w.t;
    p.dash = null;
    p.attackUntil = 0;
    p.vy = -HERO.hurtV;
    p.jumping = false;
    happen(w, 'hurt');
    say(w, 'hurt');
    w.fx.push({ kind: 'hurt', x: p.x + HERO.w / 2, y: p.y + HERO.h / 2 });
    if (w.hp <= 0) { w.state = 'dead'; say(w, 'over'); }
}

function breakCrate(w, h)
{
    setTile(w, h.tx, h.ty, EMPTY);
    w.score += HERO.crate;
    say(w, 'crate');
    const x = h.tx * TILE + TILE / 2, y = h.ty * TILE + TILE / 2;
    w.fx.push({ kind: 'crate', x, y });
    happen(w, 'broke', { what: 'crate', x, y });
}

function land(w, wasGround)
{
    const p = w.player;
    if (!wasGround) { say(w, 'land'); p.landAt = w.t; }
    p.ground = true;
    p.coyote = HERO.coyote;
    p.bonk = true;
    p.jumping = false;
    happen(w, 'landed');
}

function step(w, dt, ctrl)
{
    const c = HERO, p = w.player;
    if (ctrl.pressed) p.buffer = c.buffer;
    else p.buffer = Math.max(0, p.buffer - dt);
    p.coyote = p.ground ? c.coyote : Math.max(0, p.coyote - dt);

    if (!p.dash)
    {
        if (Math.abs(ctrl.x) > .2) p.face = Math.sign(ctrl.x);
        const want = Math.abs(ctrl.x) > .2 ? ctrl.x * c.run : 0;
        const acc = p.ground ? c.accelGround : c.accelAir;
        p.vx += Math.max(-acc * dt, Math.min(acc * dt, want - p.vx));
        p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
        if (p.buffer > 0 && p.coyote > 0)
        {
            p.vy = -c.jumpV; p.ground = false; p.coyote = 0; p.buffer = 0; p.jumping = true;
            say(w, 'jump');
        }
        else if (ctrl.pressed && !p.ground && p.bonk) { p.buffer = 0; startBonk(w, ctrl); }
        if (p.jumping && !ctrl.held && p.vy < 0) { p.vy *= c.jumpCut; p.jumping = false; }
    }
    const d = p.dash;
    if (d)
    {
        // a dash still kills for a moment after it ends, so one that runs out a pixel short isn't a hit on you
        p.attackUntil = w.t + c.attackGrace;
        d.t += dt;
        if (d.kind === 'home')
        {
            const [px, py] = centre(heroBox(w)), [fx, fy] = centre(d.target), dist = Math.hypot(fx - px, fy - py) || 1;
            p.vx = (fx - px) / dist * c.homeSpeed; p.vy = (fy - py) / dist * c.homeSpeed;
            if (!d.target.alive || d.t > c.homeTime) p.dash = null;
        }
        else
        {
            p.vx = d.dx * c.dashSpeed; p.vy = d.dy * c.dashSpeed;
            if (d.t > c.dashTime) { p.dash = null; p.vx *= .5; p.vy = Math.min(p.vy, 60); }
        }
    }

    const b = heroBox(w), wasDash = !!p.dash, wasGround = p.ground;
    const hits = move(w, b, p.vx * dt, p.vy * dt);
    p.x = b.x; p.y = b.y;
    p.ground = false;
    if (hits.x)
    {
        if (wasDash)
        {
            const crate = hits.x.t === CRATE;
            if (crate) breakCrate(w, hits.x);
            if (hits.x.t === SPIKES) hurt(w);
            else bounce(w, -hits.x.dir * c.wallKickX, -c.wallKickV, crate);
        }
        else p.vx = 0;
    }
    if (hits.y)
    {
        const { dir, t } = hits.y;
        if (dir > 0 && t === SPIKES) { hurt(w); return; }
        const crate = wasDash && t === CRATE;
        if (crate) breakCrate(w, hits.y);
        if (wasDash && dir > 0) bounce(w, p.vx * .4, -c.bounceV, crate);
        else if (wasDash) bounce(w, p.vx * .4, c.ceilingV, crate);
        else if (dir > 0) { p.vy = 0; land(w, wasGround); }
        else p.vy = 0;
    }
}

// the run part: hp for the run, a hero on the start chunk's ledge in each well, one hp back after each rest
export const hero = {
    begin(w) { w.hp = HERO.hp; },
    enter(w)
    {
        w.player = {
            x: COLS * TILE / 2 - HERO.w / 2, y: 2 * TILE + TILE - HERO.h, vx: 0, vy: 0, face: 1,
            ground: false, coyote: 0, buffer: 0, jumping: false, bonk: true, dash: null, attackUntil: 0, invulnUntil: 0,
            landAt: -1, bounceAt: -1, hurtAt: -1,          // when each last happened, for the hero's poses
        };
    },
    rest(w) { w.hp = Math.min(HERO.maxHp, w.hp + 1); },
    step,
};
