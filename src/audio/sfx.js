// Web Audio: sounds baked once from code (sfx-defs.js, and each game's own through define()).
// Browsers keep audio off until the first key or tap, so everything starts then.
//
// The mix: effects → their bus (EFFECTS_LEVEL × the Effects slider) → a compressor ┐
//          music (audio/music.js, its own level × the Music slider) → musicOut ───┴→ master (the Master slider) → a limiter → out
// The two levels set where effects sit against the music at the same slider steps (measured, see docs/AUDIO.md).
import { FLAGS } from '../platform/engine.js';
import { RATE } from '../lib/synth.js';
import { stepGain } from '../lib/volume.js';
import { settings } from '../game/settings.js';
import { SFX_DEFS } from './sfx-defs.js';

const EFFECTS_LEVEL = 1.25;     // the effects bus at slider step 10; the default step 8 is -6 dB from here
const SLIDE = .04;              // seconds (time constant) for a slider change to settle

let ctx = null, master = null, effectsBus = null, masterGain = null, musicBus = null;
const enabled = !FLAGS.mute;
const buffers = {}, last = {};
// baked sounds a game brings along: { name: def }, in the same form as SFX_DEFS
const defs = {};

function start()
{
    if (ctx || !enabled) return;
    const AC = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    effectsBus = ctx.createGain();
    master = ctx.createDynamicsCompressor();
    master.threshold.value = -14; master.ratio.value = 5;
    masterGain = ctx.createGain();
    // a safety limiter, so loud music and a burst of effects at the top of every slider don't clip
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = .002; limiter.release.value = .1;
    effectsBus.connect(master).connect(masterGain);
    masterGain.connect(limiter).connect(ctx.destination);
    // the soundtrack (audio/music.js) joins after the compressor, so the effects don't pump it
    musicBus = ctx.createGain();
    musicBus.connect(masterGain);
    applyVolume(settings.volume, true);
    for (const [name, def] of Object.entries(SFX_DEFS)) bake(name, def);
    for (const [name, def] of Object.entries(defs)) bake(name, def);
}

function applyVolume(v, now = false)
{
    if (!ctx) return;
    const t = ctx.currentTime;
    const set = (param, value)=> { if (now) param.value = value; else param.setTargetAtTime(value, t, SLIDE); };
    set(masterGain.gain, stepGain(v.master));
    set(effectsBus.gain, EFFECTS_LEVEL * stepGain(v.effects));
}
settings.onChange((v)=> applyVolume(v));

function bake(name, def)
{
    const data = def.make();
    const b = ctx.createBuffer(1, data.length, RATE);
    b.copyToChannel(/** @type {Float32Array<ArrayBuffer>} */ (data), 0);
    buffers[name] = b;
}
for (const type of ['keydown', 'pointerdown']) addEventListener(type, ()=> { start(); ctx?.resume(); }, { capture: true });
// a phone may suspend audio while the tab is away; pick it back up on return
document.addEventListener('visibilitychange', ()=> { if (!document.hidden) ctx?.resume().catch(()=> {}); });

export const sfx = {
    // the context and where music goes, once audio has started; null before the first key or tap
    get context() { return ctx; },
    get musicOut() { return musicBus; },
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
        src.connect(g).connect(effectsBus);
        src.start();
    },
};
