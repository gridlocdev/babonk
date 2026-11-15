// Stars: knocked out of broken foes and crates, more the longer the chain. They fall and bounce like tiny foes, come to
// you once you're near, and are worth points when taken.
import { centre, move, overlap } from '../../world/well.js';
import { addRunPart, say } from '../../world/run.js';
import { GRAVITY, MAX_FALL } from '../../world/wells-data.js';
import { heroBox } from '../../player/hero.js';
import { draw, frameOf } from '../../render/screen.js';
import { addRunLayer } from '../../render/view.js';
import { STARS } from './stars-data.js';

// n stars fly out of (x, y), mostly upward
function burst(w, x, y, n)
{
    for (let i = 0; i < n; i++)
    {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * .5 + (w.rng.next() - .5) * .3, v = 110 + w.rng.next() * 40;
        w.stars.push({ x: x - 2, y: y - 2, w: 4, h: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0 });
    }
}

// stars fall and bounce, drift to you once you're near, and are gone after a while
function step(w, dt)
{
    const c = STARS, b = heroBox(w), [px, py] = centre(b);
    w.stars = w.stars.filter((s)=>
    {
        s.t += dt;
        if (s.t > c.life) return false;
        const [sx, sy] = centre(s), dx = px - sx, dy = py - sy, d = Math.hypot(dx, dy);
        if (s.t > c.wait && d < c.pull)
        {
            const v = 200 * dt / (d || 1);
            s.x += dx * Math.min(1, v); s.y += dy * Math.min(1, v);
        }
        else
        {
            s.vy = Math.min(MAX_FALL, s.vy + GRAVITY * dt);
            const hits = move(w, s, s.vx * dt, s.vy * dt);
            if (hits.x) s.vx = -s.vx * .5;
            if (hits.y) { s.vy = Math.abs(s.vy) < 40 ? 0 : -s.vy * .45; s.vx *= .7; }
        }
        if (s.t < c.wait || !overlap(b, s)) return true;
        w.score += c.points;
        say(w, 'star');
        return false;
    });
}

const part = {
    enter(w) { w.stars = []; },
    // a longer chain knocks more out of a foe
    broke(w, { what, x, y }) { burst(w, x, y, what === 'crate' ? STARS.perCrate : STARS.perKill + Math.min(w.chain, STARS.chainMax)); },
    step,
};

// stars blink for their last second
function drawStars(w, { ox, oy, clock })
{
    for (const s of w.stars) if (s.t < STARS.life - 1 || Math.floor(clock * 12) % 2) draw(frameOf('star', clock + s.x * .01), ox + Math.round(s.x), oy + Math.round(s.y));
}

export default {
    id: 'stars',
    build() { addRunPart(part); addRunLayer(1, drawStars); },
};
