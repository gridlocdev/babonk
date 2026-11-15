// The hero's numbers, as plain data. Distances are pixels of the 320 × 180 screen, y down; times in seconds.
export const HERO = {
    w: 6, h: 8,
    run: 80, accelGround: 900, accelAir: 520,
    jumpV: 220, jumpCut: .45, coyote: .08, buffer: .1,
    // the bonk: homing onto a foe in reach, else a dash the held way
    lockRange: 76, lockConeDeg: 80,
    homeSpeed: 300, homeTime: .45,
    dashSpeed: 270, dashTime: .17, attackGrace: .1,
    // what a hit gives back
    bounceV: 250, stompV: 230, wallKickX: 140, wallKickV: 210, ceilingV: 80,
    hp: 4, maxHp: 4, invuln: 1.1, hurtV: 160,
    // points for breaking a crate
    crate: 20,
};
