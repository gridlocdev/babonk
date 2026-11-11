// The player's settings, in the save's `core` slice: for now the three volume sliders (lib/volume.js).
// Audio listens with onChange; menus call setVolume and resetVolumes. Every change is saved at once.
import { VOLUME_DEFAULTS, clampStep, cleanVolumes } from '../lib/volume.js';
import { state } from './state.js';

const listeners = new Set();
function core()
{
    const c = state.slice('core', { volume: VOLUME_DEFAULTS });
    c.volume = cleanVolumes(c.volume);
    return c;
}
function changed()
{
    state.write();
    const v = { ...core().volume };
    for (const fn of listeners) fn(v);
}

export const settings = {
    /** { master, music, effects }, each a step from 0 to STEPS */
    get volume() { return { ...core().volume }; },
    setVolume(key, step)
    {
        const c = core();
        if (!(key in c.volume)) return c.volume[key];
        const s = clampStep(step, c.volume[key]);
        if (s === c.volume[key]) return s;
        c.volume[key] = s;
        changed();
        return s;
    },
    resetVolumes() { core().volume = { ...VOLUME_DEFAULTS }; changed(); },
    /** @param {(volume: {master: number, music: number, effects: number}) => void} fn */
    onChange(fn) { listeners.add(fn); return ()=> listeners.delete(fn); },
};
