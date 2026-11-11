// The save. Each feature owns one slice; nothing else writes it.
import { storage } from '../platform/storage.js';

const SAVE_KEY = 'babonk-save-v1';
storage.keys.push(SAVE_KEY);

/** @type {Record<string, any>} */
let data = {};

export const state = {
    load()
    {
        try { data = JSON.parse(storage.get(SAVE_KEY) ?? '{}') ?? {}; } catch { data = {}; }
        migrate(data);
    },
    // returns the live slice object, filling in missing defaults in place,
    // so every caller gets the same object and writes are never lost
    slice(name, defaults = {})
    {
        const s = data[name] ??= {};
        for (const [k, v] of Object.entries(defaults)) if (!(k in s)) s[k] = structuredClone(v);
        return s;
    },
    write() { storage.set(SAVE_KEY, JSON.stringify(data)); },
    // slices held by features still point at the old data, so reload the page after forgetting
    forget() { data = {}; storage.set(SAVE_KEY, null); },
};

// move old save shapes into slices so existing players keep their progress
function migrate(d)
{
    // the Sound and Music switches, then 0-10 volume steps, became the standard settings (game/settings.js);
    // only values that differ from the defaults are kept there, and mergeSettings drops anything invalid
    const core = d.core && typeof d.core === 'object' ? d.core : null;
    const set = {};
    if (core?.volume && typeof core.volume === 'object')
    {
        const v = core.volume, at = (k)=> typeof v[k] === 'number' ? Math.max(0, Math.min(10, v[k])) / 10 : undefined;
        if (at('master') !== undefined) set['audio.master'] = at('master');
        if (at('music') !== undefined) set['audio.music'] = at('music');
        if (at('effects') !== undefined) set['audio.sfx'] = at('effects');
    }
    if (core && 'sound' in core && !core.sound) set['audio.master'] = 0;
    if (d.music && typeof d.music === 'object' && d.music.on === false) set['audio.music'] = 0;
    if (core || d.music)
    {
        const c = d.core ??= {};
        c.settings = { ...set, ...(c.settings && typeof c.settings === 'object' ? c.settings : {}) };
        delete c.volume; delete c.sound; delete d.music;
    }
}
