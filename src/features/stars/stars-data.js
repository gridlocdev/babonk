// Stars burst out of what you break: perCrate from a crate, perKill + the chain so far (up to chainMax) from a foe.
// They fly free for `wait` seconds, then drift to you once you're within `pull` pixels, and blink away after `life`.
export const STARS = { perCrate: 1, perKill: 1, chainMax: 4, life: 3.5, pull: 22, wait: .2, points: 10 };
