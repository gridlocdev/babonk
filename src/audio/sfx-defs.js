// Every sound in the game: what each tells the player, and how it's made, from square and triangle waves like an old
// sound chip. Imports only lib/, so tests build every sound in node. { says, make() → Float32Array, level?, gap?, vary? }
// The run's parts name these in w.sfx (world/run.js); the menus play uiMove and uiPick.
import { noise, normalize, osc, pluck, render, square, tri } from '../lib/synth.js';

const n = noise(29);
// a pitch glide from a to b over d seconds
const glide = (a, b, d)=> (t)=> a + (b - a) * Math.min(1, t / d);

export const SFX_DEFS = {
    uiMove: { says: 'Focus moved to another button.', level: .3, vary: 0, gap: .03, make() { const a = osc(1320, tri); return normalize(render(.04, (t)=> a(t) * pluck(t, .001, 90))); } },
    uiPick: {
        says: 'You picked this.', level: .55, vary: 0,
        make() { const a = osc((t)=> t < .05 ? 880 : 1320, square); return normalize(render(.14, (t)=> a(t) * .6 * pluck(t, .002, 22))); },
    },
    // the run
    jump: {
        says: 'You jumped off the ground.', level: .35, vary: .04,
        make() { const a = osc(glide(330, 660, .08), square); return normalize(render(.1, (t)=> a(t) * pluck(t, .002, 28))); },
    },
    bonk: {
        says: 'You bonked: a homing dive or a dash.', level: .45, vary: .03,
        make() { const a = osc(glide(880, 220, .1), square); return normalize(render(.12, (t)=> (a(t) * .7 + n() * .3) * pluck(t, .001, 24))); },
    },
    bounce: {
        says: 'You bounced off something and got the bonk back; higher with each bounce in a chain.', level: .45, vary: 0, gap: .02,
        make() { const a = osc(glide(196, 784, .07), tri), b = osc(glide(392, 1568, .07), square); return normalize(render(.14, (t)=> (a(t) + b(t) * .25) * pluck(t, .001, 20))); },
    },
    pop: {
        says: 'A foe was bonked or stomped out.', level: .5, vary: .06,
        make() { const a = osc(glide(520, 90, .12), square); return normalize(render(.16, (t)=> (a(t) * .6 + n() * .5) * pluck(t, .001, 18))); },
    },
    crate: {
        says: 'A crate broke.', level: .45, vary: .08,
        make() { return normalize(render(.14, (t)=> n() * pluck(t, .001, 30) + Math.sign(Math.sin(t * 900)) * .2 * pluck(t, .001, 40))); },
    },
    hurt: {
        says: 'You were hit and lost one HP.', level: .55, vary: 0,
        make() { const a = osc(glide(300, 70, .25), square), b = osc(glide(310, 75, .25), square); return normalize(render(.3, (t)=> (a(t) + b(t)) * .5 * pluck(t, .002, 9))); },
    },
    alert: {
        says: 'A floater spotted you and is about to give chase.', level: .3, vary: .03,
        make() { const a = osc((t)=> t < .05 ? 988 : 1319, square); return normalize(render(.11, (t)=> a(t) * .5 * pluck(t % .05, .001, 26))); },
    },
    star: {
        says: 'You picked up a star knocked out of a foe.', level: .3, vary: .02,
        make() { const a = osc((t)=> t < .04 ? 1320 : 1980, square); return normalize(render(.12, (t)=> a(t) * .5 * pluck(t, .001, 22))); },
    },
    land: {
        says: 'You landed, and the chain is over.', level: .25, vary: .1,
        make() { const a = osc(glide(140, 60, .05), tri); return normalize(render(.07, (t)=> (a(t) + n() * .3) * pluck(t, .001, 50))); },
    },
    chain: {
        says: 'A chain of three or more bounces paid out as you landed.', level: .4, vary: 0,
        make() { const notes = [523, 659, 784, 1047], a = osc((t)=> notes[Math.min(3, Math.floor(t / .045))], square); return normalize(render(.24, (t)=> a(t) * .5 * pluck(t % .045, .001, 30))); },
    },
    clear: {
        says: 'You reached the bottom of the well.', level: .45, vary: 0,
        make() { const notes = [392, 523, 659, 784, 1047, 784, 1047], a = osc((t)=> notes[Math.min(6, Math.floor(t / .09))], square); return normalize(render(.7, (t)=> a(t) * .5 * (t < .63 ? pluck(t % .09, .002, 12) : pluck(t - .63, .002, 6)))); },
    },
    over: {
        says: 'The run is over.', level: .45, vary: 0,
        make() { const notes = [392, 330, 262, 196], a = osc((t)=> notes[Math.min(3, Math.floor(t / .16))], tri); return normalize(render(.8, (t)=> a(t) * pluck(t % .16, .004, 6))); },
    },
};
