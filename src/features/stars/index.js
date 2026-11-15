// Stars: knocked out of broken foes and crates, more the longer the chain. They fall and bounce like tiny foes, come to
// you once you're near, and are worth points when taken.
import { BLOCK, CRATE, centre, fill, move, overlap, setTile } from '../../world/well.js';
import { addRunPart, say } from '../../world/run.js';
import { COLS, GRAVITY, MAX_FALL, TILE } from '../../world/wells-data.js';
import { heroBox, placeHero } from '../../player/hero.js';
import { HERO } from '../../player/hero-data.js';
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

// the museum (?debug&room=museum): a crate bonked open, its star bursting out and drifting to the hero
/** @returns {import('../../game/loop.js').Exhibit[]} */
function museum()
{
    return [{
        id: 'stars', title: 'Stars', file: 'src/features/stars/index.js',
        text: 'What you break bursts into stars, more the longer the chain. They drift to you once you are near, and blink out.',
        start(w)
        {
            setTile(w, 9, 8, CRATE);
            fill(w, 1, COLS - 2, 12, BLOCK);
            placeHero(w, 9 * TILE + 1, 5 * TILE);
            return { seen: 0, gone: -1, score: w.score };
        },
        ctrl: (w, s, n)=> ({ x: 0, y: 0, held: n === 0, pressed: n === 0 }),
        done(w, s, n)
        {
            s.seen = Math.max(s.seen, w.stars.length);
            if (s.seen && !w.stars.length && s.gone < 0) s.gone = n;
            return s.gone >= 0;
        },
        // taken, not blinked out: gone before their life is up, and worth their points
        passed: (w, s)=> s.seen > 0 && s.gone < STARS.life * 60 && w.score - s.score >= HERO.crate + STARS.points * s.seen,
    }];
}

export default {
    id: 'stars',
    build() { addRunPart(part); addRunLayer(1, drawStars); },
    museum,
};
