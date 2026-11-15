// Runs registered systems and features in order. main.js wires this into the engine's fixed step and draw.
import { state } from './state.js';
import { events } from './events.js';

const systems = [];
const ctx = { state, events };

export const loop = {
    use(list) { systems.push(...list); },
    build() { for (const s of systems) s.build?.(ctx); },
    update(dt) { for (const s of systems) s.update?.(dt, ctx); },
    // once per display frame, with real time
    draw(dt) { for (const s of systems) s.draw?.(dt, ctx); },
};

// ---- the dev rooms' entries (src/dev/): a feature may add gym() and museum() hooks that return these.
// A scene is a run with every part but an empty well; ctrl is the run's { x, y, held, pressed } for step n.
/**
 * @typedef {object} Trial  a scripted try in a scene
 * @property {(w: any) => any} start  builds what it needs and places the hero; returns its own state s
 * @property {(w: any, s: any, n: number) => any} [ctrl]  the input for step n (none: hands off)
 * @property {(w: any, s: any, n: number) => boolean} done  checked after each step
 * @property {(w: any, s: any) => boolean} passed  checked once done
 * @property {[string, number, number][]} [spawns]  foes the run places first, as [kind, tx, ty]
 */
/**
 * @typedef {Trial & { name: string, value: number | string, max?: number, band?: string, at: number[] }} GymCase
 *   one case of a gym row: its band comes from value against max (the reach), or is given
 * @typedef {{ id: string, title: string, text: string, file: string, unit: string, setup?: (w: any) => void, cases: GymCase[] }} GymRow
 * @typedef {Trial & { id: string, title: string, text: string, file: string, wrong?: string }} Exhibit
 *   one museum exhibit; `wrong` marks one built wrong on purpose, with why, and it passes when it shows the failure
 */
