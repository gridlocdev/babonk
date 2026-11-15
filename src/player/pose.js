// Which animation the hero shows, and how far into it, from the run's state: a pure function of the player and the
// run clock, so the zoo, the game and the tests agree. Times come from the sim (landAt, bounceAt, hurtAt, dash.t).
const POSE = { hurt: .3, smear: .05, squash: .07, runSpeed: 10 };

export function heroPose(p, now)
{
    if (now - p.hurtAt < POSE.hurt) return ['hurt', 0];
    if (p.dash)
    {
        if (p.dash.t < POSE.smear) return [Math.abs(p.vx) > Math.abs(p.vy) ? 'smearH' : 'smearV', 0];
        return ['ball', p.dash.t];
    }
    if (p.ground)
    {
        if (now - p.landAt < POSE.squash) return ['squash', 0];
        return Math.abs(p.vx) > POSE.runSpeed ? ['run', now] : ['idle', now];
    }
    if (now - p.bounceAt < POSE.squash) return ['squash', 0];
    return [p.vy < 0 ? 'rise' : 'fall', 0];
}
