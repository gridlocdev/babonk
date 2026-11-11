// Babonk's numbers, as plain data. Distances are pixels of its 320 × 180 screen, y down; times in seconds.
// The well is COLS tiles wide, walls included, and sits in the middle of the screen with the HUD either side.
export const SCREEN = { w: 320, h: 180 };
export const TILE = 8;
export const COLS = 20;
export const WELL_X = (SCREEN.w - COLS * TILE) / 2;

export const CONFIG = {
    seed: 7041,
    playerW: 6, playerH: 8,
    run: 80, accelGround: 900, accelAir: 520,
    gravity: 640, maxFall: 210,
    jumpV: 220, jumpCut: .45, coyote: .08, buffer: .1,
    // the bonk: homing onto a foe in reach, else a dash the held way
    lockRange: 76, lockConeDeg: 80,
    homeSpeed: 300, homeTime: .45,
    dashSpeed: 270, dashTime: .17, attackGrace: .1,
    // stars burst out of what you break: one from a crate, starsPerKill + the chain so far (up to starsChainMax) from a
    // foe. They fly free for starWait seconds, then drift to you once you're within starPull, and blink away after starLife
    starsPerKill: 1, starsChainMax: 4, starLife: 3.5, starPull: 22, starWait: .2,
    // what a hit gives back
    bounceV: 250, stompV: 230, wallKickX: 140, wallKickV: 210, ceilingV: 80,
    hp: 4, maxHp: 4, invuln: 1.1, hurtV: 160,
    foeSize: 8, walkerSpeed: 22, floaterSpeed: 28,
    // a floater that spots you within floaterSight stops and stares for floaterTell seconds before it gives chase, and
    // only gives up past floaterSight × floaterLose
    floaterSight: 84, floaterTell: .35, floaterLose: 1.4,
    // hit stop: the action freezes for hitStop seconds on a kill, hitStopChain longer for each bounce in the chain so
    // far, up to hitStopMax
    hitStop: .05, hitStopChain: .015, hitStopMax: .14,
    points: { walker: 50, floater: 50, spiker: 80, crate: 20, star: 10, chainEach: 25, clear: 200, hpLeft: 100 },
    chainMin: 3,
};

// the three wells: how many chunks deep, and how likely each tier of chunk is
export const WELLS = [
    { chunks: 10, tiers: { 0: 1 } },
    { chunks: 14, tiers: { 0: .4, 1: .6 } },
    { chunks: 18, tiers: { 1: .45, 2: .55 } },
];

// points for landing a chain of n bounces
export const chainBonus = (n, c = CONFIG)=> n >= c.chainMin ? n * c.points.chainEach : 0;
// points for reaching the bottom of a well with hp left
export const clearBonus = (hp, c = CONFIG)=> c.points.clear + hp * c.points.hpLeft;
