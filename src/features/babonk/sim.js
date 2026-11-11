// Babonk's rules: a fixed-step platformer down a well. step(w, dt, ctrl) with ctrl { x, y, held, pressed }: the
// stick (y up), the BONK button down, and whether it went down this step. On the ground the button jumps; in the air
// it bonks: home in on the foe lockTarget() picks, or dash the held way. Hitting a foe, wall, floor or crate while
// bonking bounces you off it and gives the bonk back. Sounds and effects queue in w.sfx and w.fx for the game to use.
import { rng as makeRng } from '../../lib/rng.js';
import { CONFIG, COLS, TILE, WELLS, chainBonus, clearBonus } from './babonk-data.js';
import { CRATE, EMPTY, SPIKES, buildWell, hitTile, pickChunks, setTile, solid, tileAt } from './level.js';
import { CHUNK_ROWS } from './wells-data.js';

// a run: three wells, the score and hp carried from one to the next
export function createRun(seed = CONFIG.seed, cfg = CONFIG)
{
    const w = { cfg, rng: makeRng(seed), score: 0, hp: cfg.hp, well: -1, sfx: [], fx: [] };
    enterWell(w, 0);
    return w;
}

// start well `index`, standing on the start chunk's ledge
export function enterWell(w, index)
{
    const c = w.cfg;
    Object.assign(w, buildWell(pickChunks(index, w.rng)));
    w.well = index;
    w.t = 0;
    w.state = 'play';           // play | clear | dead
    w.chain = 0;
    w.bestChain = 0;
    w.stars = [];
    w.freeze = 0;               // hit stop left, in seconds
    w.heldPress = false;        // a press made during a hit stop, kept for when it ends
    w.foes = w.foes.map((f)=> ({
        kind: f.kind, alive: true, w: c.foeSize, h: c.foeSize,
        x: f.tx * TILE + (TILE - c.foeSize) / 2, y: f.ty * TILE + TILE - c.foeSize,
        vx: 0, vy: 0, dir: w.rng.next() < .5 ? -1 : 1, homeX: f.tx * TILE, homeY: f.ty * TILE, phase: w.rng.next() * 6,
        chasing: false, alertAt: -1,     // floaters: after you, and when they spotted you
    }));
    w.player = {
        x: COLS * TILE / 2 - c.playerW / 2, y: 2 * TILE + TILE - c.playerH, vx: 0, vy: 0, face: 1,
        ground: false, coyote: 0, buffer: 0, jumping: false, bonk: true, dash: null, attackUntil: 0, invulnUntil: 0,
        landAt: -1, bounceAt: -1, hurtAt: -1,          // when each last happened, for the hero's poses
    };
}

export const wellCount = ()=> WELLS.length;
export const depth = (w)=> Math.min(1, Math.max(0, w.player.y / ((w.rows - CHUNK_ROWS) * TILE)));
export const invulnerable = (w)=> w.t < w.player.invulnUntil;
const centre = (b)=> [b.x + b.w / 2, b.y + b.h / 2];
const pbox = (w)=> ({ x: w.player.x, y: w.player.y, w: w.cfg.playerW, h: w.cfg.playerH });
const overlap = (a, b)=> a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// the foe a bonk would home in on: the nearest live one in reach, inside a cone around straight down
export function lockTarget(w)
{
    const c = w.cfg, [px, py] = centre(pbox(w));
    const cos = Math.cos(c.lockConeDeg * Math.PI / 180);
    let best = null, bestD = c.lockRange;
    for (const f of w.foes)
    {
        if (!f.alive) continue;
        const [fx, fy] = centre(f), dx = fx - px, dy = fy - py, d = Math.hypot(dx, dy);
        if (d >= bestD || d < 1e-6 || dy / d < cos || !clearLine(w, px, py, fx, fy)) continue;
        best = f; bestD = d;
    }
    return best;
}

// nothing solid on the straight line between two points, so a homing bonk never dives through a ledge
function clearLine(w, ax, ay, bx, by)
{
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
    for (let i = 1; i < n; i++)
    {
        const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
        if (solid(tileAt(w, Math.floor(x / TILE), Math.floor(y / TILE)))) return false;
    }
    return true;
}

// move a box by (dx, dy), one axis at a time, stopping at solid tiles. Returns what it hit on each axis
function move(w, b, dx, dy)
{
    const hits = { x: null, y: null };
    b.x += dx;
    let h = dx ? hitTile(w, b.x, b.y, b.w, b.h) : null;
    if (h) { b.x = dx > 0 ? h.tx * TILE - b.w : (h.tx + 1) * TILE; hits.x = { ...h, dir: Math.sign(dx) }; }
    b.y += dy;
    h = dy ? hitTile(w, b.x, b.y, b.w, b.h) : null;
    if (h) { b.y = dy > 0 ? h.ty * TILE - b.h : (h.ty + 1) * TILE; hits.y = { ...h, dir: Math.sign(dy) }; }
    return hits;
}

const say = (w, id, pitch = 1)=> w.sfx.push({ id, pitch });

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
    w.fx.push({ kind: 'bonk', x: p.x + w.cfg.playerW / 2, y: p.y + w.cfg.playerH / 2 });
}

// a bounce off something: the bonk comes back. Only a kill (a foe or a crate) grows the chain, so bouncing on a bare
// floor can't farm it
function bounce(w, vx, vy, kill = false)
{
    const p = w.player;
    p.vx = vx; p.vy = vy;
    p.bounceAt = w.t;
    p.dash = null;
    p.bonk = true;
    p.jumping = false;
    if (kill) { w.chain++; w.bestChain = Math.max(w.bestChain, w.chain); }
    say(w, 'bounce', 1 + Math.min(w.chain, 12) * .06);
}

function hurt(w)
{
    const p = w.player, c = w.cfg;
    if (invulnerable(w)) return;
    w.hp--;
    p.invulnUntil = w.t + c.invuln;
    p.hurtAt = w.t;
    p.dash = null;
    p.attackUntil = 0;
    p.vy = -c.hurtV;
    p.jumping = false;
    w.chain = 0;
    say(w, 'hurt');
    w.fx.push({ kind: 'hurt', x: p.x + c.playerW / 2, y: p.y + c.playerH / 2 });
    if (w.hp <= 0) { w.state = 'dead'; say(w, 'over'); }
}

function breakCrate(w, h)
{
    setTile(w, h.tx, h.ty, EMPTY);
    w.score += w.cfg.points.crate;
    say(w, 'crate');
    w.fx.push({ kind: 'crate', x: h.tx * TILE + TILE / 2, y: h.ty * TILE + TILE / 2 });
    burstStars(w, h.tx * TILE + TILE / 2, h.ty * TILE + TILE / 2, 1);
}

// n stars fly out of (x, y), mostly upward
function burstStars(w, x, y, n)
{
    for (let i = 0; i < n; i++)
    {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * .5 + (w.rng.next() - .5) * .3, v = 110 + w.rng.next() * 40;
        w.stars.push({ x: x - 2, y: y - 2, w: 4, h: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0 });
    }
}

function kill(w, f)
{
    const c = w.cfg;
    f.alive = false;
    w.score += c.points[f.kind];
    say(w, 'pop');
    // everything stops for a moment while the foe flashes, a little longer the longer the chain
    w.freeze = Math.max(w.freeze, Math.min(c.hitStopMax, c.hitStop + w.chain * c.hitStopChain));
    w.fx.push({ kind: 'pop', x: f.x + f.w / 2, y: f.y + f.h / 2, foe: f.kind === 'floater' && f.chasing ? 'floaterMad' : f.kind, fx: f.x, fy: f.y, left: f.kind !== 'floater' && f.dir < 0, phase: f.phase, hold: w.freeze });
    // a longer chain knocks more out
    burstStars(w, f.x + f.w / 2, f.y + f.h / 2, w.cfg.starsPerKill + Math.min(w.chain, w.cfg.starsChainMax));
}

function land(w, wasGround)
{
    const p = w.player;
    if (!wasGround) { say(w, 'land'); p.landAt = w.t; }
    p.ground = true;
    p.coyote = w.cfg.coyote;
    p.bonk = true;
    p.jumping = false;
    const bonus = chainBonus(w.chain, w.cfg);
    if (bonus) { w.score += bonus; w.fx.push({ kind: 'chain', n: w.chain, x: p.x, y: p.y }); say(w, 'chain'); }
    w.chain = 0;
    // the floor of the well: this one's done
    if (p.y + w.cfg.playerH >= (w.rows - 1) * TILE)
    {
        w.state = 'clear';
        w.score += clearBonus(w.hp, w.cfg);
        say(w, 'clear');
    }
}

function stepPlayer(w, dt, ctrl)
{
    const c = w.cfg, p = w.player;
    if (ctrl.pressed) p.buffer = c.buffer;
    else p.buffer = Math.max(0, p.buffer - dt);
    p.coyote = p.ground ? c.coyote : Math.max(0, p.coyote - dt);

    if (!p.dash)
    {
        if (Math.abs(ctrl.x) > .2) p.face = Math.sign(ctrl.x);
        const want = Math.abs(ctrl.x) > .2 ? ctrl.x * c.run : 0;
        const acc = p.ground ? c.accelGround : c.accelAir;
        p.vx += Math.max(-acc * dt, Math.min(acc * dt, want - p.vx));
        p.vy = Math.min(c.maxFall, p.vy + c.gravity * dt);
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
            const [px, py] = centre(pbox(w)), [fx, fy] = centre(d.target), dist = Math.hypot(fx - px, fy - py) || 1;
            p.vx = (fx - px) / dist * c.homeSpeed; p.vy = (fy - py) / dist * c.homeSpeed;
            if (!d.target.alive || d.t > c.homeTime) p.dash = null;
        }
        else
        {
            p.vx = d.dx * c.dashSpeed; p.vy = d.dy * c.dashSpeed;
            if (d.t > c.dashTime) { p.dash = null; p.vx *= .5; p.vy = Math.min(p.vy, 60); }
        }
    }

    const b = pbox(w), wasDash = !!p.dash, wasGround = p.ground;
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

function stepFoes(w, dt)
{
    const c = w.cfg, [px, py] = centre(pbox(w));
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
        f.vy = Math.min(c.maxFall, f.vy + c.gravity * dt);
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
    const c = w.cfg, p = w.player, b = pbox(w);
    for (const f of w.foes)
    {
        if (!f.alive || !overlap(b, f)) continue;
        if (p.dash || w.t < p.attackUntil) { kill(w, f); bounce(w, p.vx * .3, -c.bounceV, true); continue; }
        // falling with your middle above its middle is a stomp, even if a drifting foe met you at the corner
        const fromAbove = p.vy > 0 && b.y + b.h / 2 <= f.y + f.h / 2;
        if (fromAbove && f.kind !== 'spiker') { kill(w, f); bounce(w, p.vx, -c.stompV, true); continue; }
        hurt(w);
        if (w.state !== 'play') return;
    }
}

// stars fall and bounce, drift to you once you're near, and are gone after a while
function stepStars(w, dt)
{
    const c = w.cfg, b = pbox(w), [px, py] = centre(b);
    w.stars = w.stars.filter((s)=>
    {
        s.t += dt;
        if (s.t > c.starLife) return false;
        const [sx, sy] = centre(s), dx = px - sx, dy = py - sy, d = Math.hypot(dx, dy);
        if (s.t > c.starWait && d < c.starPull)
        {
            const v = 200 * dt / (d || 1);
            s.x += dx * Math.min(1, v); s.y += dy * Math.min(1, v);
        }
        else
        {
            s.vy = Math.min(c.maxFall, s.vy + c.gravity * dt);
            const hits = move(w, s, s.vx * dt, s.vy * dt);
            if (hits.x) s.vx = -s.vx * .5;
            if (hits.y) { s.vy = Math.abs(s.vy) < 40 ? 0 : -s.vy * .45; s.vx *= .7; }
        }
        if (s.t < c.starWait || !overlap(b, s)) return true;
        w.score += c.points.star;
        say(w, 'star');
        return false;
    });
}

export function step(w, dt, ctrl)
{
    if (w.state !== 'play') return;
    // hit stop: nothing moves, but a press made now still counts once it's over
    if (w.freeze > 1e-9)
    {
        w.freeze -= dt;
        if (ctrl.pressed) w.heldPress = true;
        return;
    }
    if (w.heldPress) { ctrl = { ...ctrl, pressed: true }; w.heldPress = false; }
    w.t += dt;
    stepPlayer(w, dt, ctrl);
    if (w.state !== 'play') return;
    stepFoes(w, dt);
    touchFoes(w);
    stepStars(w, dt);
}

// on to the next well after a rest: one hp back
export function nextWell(w)
{
    w.hp = Math.min(w.cfg.maxHp, w.hp + 1);
    enterWell(w, w.well + 1);
}
