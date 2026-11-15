// Graphics quality: the presets, and a watchdog that steps down through them while frames run slow.
// Babonk draws a fixed 320 × 180 canvas, scaled up by the page, so there is no pixel ratio to lower. A preset thins
// the effects instead: the bits that fly from a break, and the afterimages that trail a bonk. High is the game as
// designed; Automatic starts there on every device and only steps down on one that can't keep up.
export const PRESETS = {
    high: { bits: 8, ghosts: true },
    medium: { bits: 5, ghosts: true },
    low: { bits: 3, ghosts: false },
};
const LADDER = ['high', 'medium', 'low'];

const TARGET = 40;          // frames per second; under this for SLOW seconds is a step down
const SLOW = 3;             // seconds under the target before a step
const GAP = 10;             // seconds at least between two steps
const SMOOTH = .5;          // seconds; the average frame rate's time constant

let choice = 'auto', step = 0, fps = 60, slowFor = 0, sinceStep = GAP;

export const graphics = {
    /** the preset in use */
    get preset() { return PRESETS[choice === 'auto' ? LADDER[step] : choice]; },
    /** its name, for the debug readout */
    get name() { return choice === 'auto' ? `auto ${LADDER[step]}` : choice; },
    /**
     * the Graphics quality setting; choosing again, even Automatic, starts Automatic back at high
     * @param {string} value auto, low, medium or high
     */
    set(value) { choice = PRESETS[value] ? value : 'auto'; step = 0; slowFor = 0; sinceStep = GAP; },
};

/**
 * Called by the engine once per drawn frame with its real length. In Automatic, a frame rate under the target for a
 * few seconds steps down one preset, at most one step every GAP seconds; it never steps back up on its own.
 * @param {number} dt seconds
 */
export function watchFrames(dt)
{
    if (dt <= 0) return;
    fps += (1 / dt - fps) * Math.min(1, dt / SMOOTH);
    sinceStep += dt;
    if (choice !== 'auto' || step >= LADDER.length - 1) return;
    slowFor = fps < TARGET ? slowFor + dt : 0;
    if (slowFor >= SLOW && sinceStep >= GAP) { step++; slowFor = 0; sinceStep = 0; }
}
