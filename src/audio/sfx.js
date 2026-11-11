// Web Audio: sounds baked once from code (sfx-defs.js, and each game's own through define()).
// Browsers keep audio off until the first key or tap, so everything starts then.
import { FLAGS } from '../platform/engine.js';
import { RATE } from '../lib/synth.js';
import { SFX_DEFS } from './sfx-defs.js';

let ctx = null, master = null, enabled = !FLAGS.mute;
const buffers = {}, last = {};
// baked sounds a game brings along: { name: def }, in the same form as SFX_DEFS
const defs = {};

function start()
{
    if (ctx || !enabled) return;
    const AC = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createDynamicsCompressor();
    master.threshold.value = -14; master.ratio.value = 5;
    const out = ctx.createGain();
    out.gain.value = .85;
    master.connect(out).connect(ctx.destination);
    for (const [name, def] of Object.entries(SFX_DEFS)) bake(name, def);
    for (const [name, def] of Object.entries(defs)) bake(name, def);
}

function bake(name, def)
{
    const data = def.make();
    const b = ctx.createBuffer(1, data.length, RATE);
    b.copyToChannel(/** @type {Float32Array<ArrayBuffer>} */ (data), 0);
    buffers[name] = b;
}
for (const type of ['keydown', 'pointerdown']) addEventListener(type, ()=> { start(); ctx?.resume(); }, { capture: true });

export const sfx = {
    setEnabled(on)
    {
        enabled = on && !FLAGS.mute;
        if (enabled) { start(); ctx?.resume(); }
        else if (ctx) ctx.suspend();
    },
    // a game's own baked sound, made when audio starts
    define(name, def)
    {
        defs[name] = def;
        if (ctx) bake(name, def);
    },
    play(name, volume = 1, pitch = 1)
    {
        const def = SFX_DEFS[name] ?? defs[name], buf = buffers[name];
        if (!def || !buf || !enabled) return;
        const now = ctx.currentTime;
        if (now - (last[name] ?? -9) < (def.gap ?? .03)) return;
        last[name] = now;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = pitch * (1 + (Math.random() - .5) * (def.vary ?? 0));
        const g = ctx.createGain();
        g.gain.value = volume * (def.level ?? 1);
        src.connect(g).connect(master);
        src.start();
    },
};
