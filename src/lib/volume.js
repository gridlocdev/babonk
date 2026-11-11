// Volume settings: three sliders (master, music, effects), each a whole step from 0 to STEPS.
// A step is 3 dB, so the slider sounds even across its length; 0 is silence.
export const STEPS = 10;
export const DB_PER_STEP = 3;
export const VOLUME_KEYS = ['master', 'music', 'effects'];
export const VOLUME_DEFAULTS = Object.freeze({ master: 10, music: 8, effects: 8 });

/** the gain for a slider step: 1 at the top, 0 at the bottom */
export function stepGain(step)
{
    const s = clampStep(step);
    return s <= 0 ? 0 : 10 ** ((s - STEPS) * DB_PER_STEP / 20);
}

/** a whole step in range; anything that isn't a number becomes `fallback` */
export function clampStep(v, fallback = STEPS)
{
    const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
    return Math.max(0, Math.min(STEPS, n));
}

/** a clean { master, music, effects } from whatever the save holds */
export function cleanVolumes(raw)
{
    const src = raw && typeof raw === 'object' ? raw : {};
    return Object.fromEntries(VOLUME_KEYS.map((k)=> [k, clampStep(src[k], VOLUME_DEFAULTS[k])]));
}

/**
 * Moves the old on/off switches into the sliders: `core.sound: 0` mutes master, `music.on: false` mutes music.
 * Changes the save object in place.
 */
export function migrateVolumes(save)
{
    if (!save || typeof save !== 'object') return;
    const core = save.core && typeof save.core === 'object' ? save.core : null;
    const oldSound = core && 'sound' in core ? core.sound : undefined;
    const oldMusic = save.music && typeof save.music === 'object' && 'on' in save.music ? save.music.on : undefined;
    if (oldSound === undefined && oldMusic === undefined) return;
    const c = save.core ??= {};
    const v = cleanVolumes(c.volume);
    if (oldSound !== undefined && !oldSound) v.master = 0;
    if (oldMusic === false) v.music = 0;
    c.volume = v;
    delete c.sound;
    delete save.music;
}
