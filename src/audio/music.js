// The soundtrack: one track per place or moment, from music/ (rendered from music-generator songs by tools/music),
// changing on the beat.
//
// The area decides what plays (setMusicArea; 'main' until something sets it) unless something has asked for a cue:
// a cutscene, a minigame, the ending. The newest unreleased cue wins. A change waits for the playing track's next
// bar line (or beat, when bars are long), starts the new track there and lets the old one fade out across about a
// bar, so the music turns a corner instead of cutting. A one-shot cue that plays to its end hands back to the area.
//
// A track can have layers (a pond, a cabin, a shrine, each adding its own instruments). Each is a short loop that fits
// its track's loop a whole number of times; near its place (audio/places.js) it is started in step with the track and
// swells in, and a while after the player leaves it is stopped and its decoded audio let go.
import { MOBILE } from '../platform/engine.js';
import { events } from '../game/events.js';
import { setting } from '../game/settings.js';
import { sfx, volumeGain } from './sfx.js';
import { TRACKS } from './tracks-data.js';

// Babonk has no layers yet, so no places: a layer would be silent. audio/places.js from the template adds them.
const nearness = (name)=> 0;
// the sound effects' context; music starts with it, after the first key or tap (and never with ?mute)
let audioContext = null, audioMasterGain = null;

const LEVEL = 1.6;          // the music bus at full Music volume. Set against the effects' level in audio/sfx.js so
                            // the two sit close at the default volumes (docs/audio.md)
const SLIDE = .05;          // seconds (time constant) for a slider change to settle
const MAX_WAIT = 2.5;       // seconds; when a bar is longer than this, a change waits for the next beat instead
const FADE = [1.2, 3];      // seconds; an old track fades out over a bar, kept inside these
const ONE_SHOT_IN = .3;     // seconds; a one-shot comes in quickly, it was written to start
const LEAD = .06;           // seconds of scheduling headroom
const KEEP_DECODED = MOBILE ? 1 : 3;     // decoded tracks kept (a long one is about 60 MB; a phone may reload the tab); layers apart
const SWELL = 1.5;          // seconds (time constant) for a layer to follow the player's distance
const LAYER_IDLE = 20;      // seconds a silent layer keeps playing before it is stopped and let go

export const music = {
    started: false,
    /** the track playing, or about to on its downbeat */ get playing() { return current?.id ?? null; },
    /** its layers that are playing, and how loud each is asked to be */ get layers() { return Object.fromEntries([...current?.layers.values() ?? []].map((l)=> [l.id, +l.level.toFixed(2)])); },
};

let bus = null, busLevel = -1, settleUntil = 0, volume = 1, duck = 1;
let area = ()=> 'main';     // the track that plays when no cue is held
/** @param {() => string} fn the area's track id, asked every frame */
export const setMusicArea = (fn)=> { area = fn; };
/** lowers the music (0 to 1) without stopping it, as under a pause menu; 1 for full */
export const setMusicDuck = (v)=> { duck = v; };
let current = null;         // { id, track, src, gain, when, at, shift, cue, layers }: the source starts at `when`, its first beat is `at`
const fading = [];          // tracks on their way out
const cues = [];

/**
 * Asks for a cue's track (a track id in tracks-data.js) until released. The newest unreleased cue wins; a cue whose
 * track is already playing keeps it going. A one-shot (loop: null) plays once, then the area's track takes over even if
 * the cue is still held.
 * @param {string} name
 */
export function musicCue(name)
{
    const cue = { name, spent: false };
    cues.push(cue);
    return { release() { const i = cues.indexOf(cue); if (i >= 0) cues.splice(i, 1); } };
}

// ---------------------------------------------------------------- loading
const files = new Map();        // id → Promise<ArrayBuffer | null>: the small encoded files, kept once fetched
const ready = new Map();        // id → { buf, shift }: decoded, most recently used last
const layerBufs = new Map();    // the same for layers, which come and go with the player
const decoding = new Set(), failed = new Set();
const LAYERS = {};              // track id → its layers' ids
for (const [id, t] of Object.entries(TRACKS)) if (t.layerOf) (LAYERS[t.layerOf] ??= []).push(id);
function load(id)
{
    const into = TRACKS[id].layerOf ? layerBufs : ready;
    if (into.has(id) || decoding.has(id) || failed.has(id)) return;
    const t = TRACKS[id];
    decoding.add(id);
    if (!files.has(id)) files.set(id, fetch(t.file).then((r)=> r.ok ? r.arrayBuffer() : null).catch(()=> null));
    // decodeAudioData takes the buffer it is given, so it gets a copy and the file stays for next time
    files.get(id)
        .then((data)=> data && audioContext.decodeAudioData(data.slice(0)))
        .catch(()=> null)
        .then((buf)=>
        {
            decoding.delete(id);
            if (!buf) { failed.add(id); return; }     // a missing file is silence, not an error
            // a decoder that left the mp3's encoder delay in (about 1105 frames) would put every beat late; follow it
            const shift = buf.length / buf.sampleRate - t.frames / t.rate > .02 ? 1105 / t.rate : 0;
            into.set(id, { buf, shift });
            if (into === layerBufs) return;
            for (const old of [...ready.keys()])
                if (ready.size > KEEP_DECODED && old !== id && old !== current?.id && !fading.some((f)=> f.id === old)) ready.delete(old);
        });
}
function use(id)
{
    const r = ready.get(id);
    ready.delete(id); ready.set(id, r);
    return r;
}

// ---------------------------------------------------------------- timing
const spb = (t)=> 60 / t.tempo;
// where in its file a track is at audio time `now`, following its loop
function position(v, now)
{
    const p = now - v.when - v.shift;
    const loop = v.track.loop;
    if (!loop || p < loop.end) return p;
    return loop.start + (p - loop.start) % (loop.end - loop.start);
}
// the audio time of the playing track's next bar line (or beat), never sooner than `earliest`
function nextDownbeat(v, earliest)
{
    const t = v.track, p = position(v, earliest);
    // a track that changes meter lists its bar lines
    if (t.bars)
    {
        const bar = t.bars.find((x)=> x >= p - 1e-6);
        if (bar !== undefined && bar - p <= MAX_WAIT) return earliest + (bar - p);
    }
    const step = spb(t) * (spb(t) * t.beatsPerBar <= MAX_WAIT ? t.beatsPerBar : 1);
    const beat = p - t.offset;
    if (beat < 0) return earliest - beat;
    const next = Math.ceil(beat / step - 1e-6) * step;
    return earliest + (next - beat);
}

// ---------------------------------------------------------------- playing
function startTrack(id, at, cue)
{
    const t = TRACKS[id], { buf, shift } = use(id);
    const ctx = audioContext;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (t.loop) { src.loop = true; src.loopStart = t.loop.start + shift; src.loopEnd = t.loop.end + shift; }
    const gain = ctx.createGain();
    src.connect(gain).connect(bus);
    // the file's first beat lands on `at`, when there is time to start it a hair early
    const when = Math.max(ctx.currentTime + .01, at - t.offset - shift);
    src.start(when);
    const fadeIn = t.loop ? clampFade(spb(t) * t.beatsPerBar) : ONE_SHOT_IN;
    curve(gain.gain, 0, 1, when, fadeIn);
    return { id, track: t, src, gain, when, at, shift, cue, layers: new Map() };
}
const clampFade = (s)=> Math.min(FADE[1], Math.max(FADE[0], s));
// an eased ramp: a raised cosine from a to b
function curve(param, a, b, at, dur)
{
    const now = audioContext.currentTime;
    const n = 32, c = new Float32Array(n);
    for (let i = 0; i < n; i++) c[i] = a + (b - a) * (.5 - .5 * Math.cos(Math.PI * i / (n - 1)));
    param.cancelScheduledValues(now);
    param.setValueAtTime(a, now);
    try { param.setValueCurveAtTime(c, Math.max(at, now + .005), dur); }
    catch (e) { param.linearRampToValueAtTime(b, Math.max(at, now + .005) + dur); }
}
function fadeOut(v, at, dur)
{
    const now = audioContext.currentTime;
    const level = v.gain.gain.value;
    curve(v.gain.gain, level, 0, at, dur);
    v.fadeAt = at;
    try { v.src.stop(Math.max(at, now) + dur + .05); } catch (e) {}
    stopLayers(v, Math.max(at, now) + dur + .05);
    v.src.onended = ()=> { v.gain.disconnect(); const i = fading.indexOf(v); if (i >= 0) fading.splice(i, 1); };
    fading.push(v);
}

// ---------------------------------------------------------------- layers
// each layer of the playing track follows how near the player is to its place
function updateLayers(v, now)
{
    if (!LAYERS[v.id] || now < v.when) return;
    for (const id of LAYERS[v.id])
    {
        const t = TRACKS[id], want = nearness(t.place) * t.level;
        let l = v.layers.get(id);
        if (!l)
        {
            if (want <= 0) continue;
            if (!layerBufs.has(id)) { load(id); continue; }
            l = startLayer(v, id, now + LEAD);
            v.layers.set(id, l);
        }
        if (Math.abs(want - l.level) > .005) { l.gain.gain.setTargetAtTime(want, now, SWELL); l.level = want; }
        l.quiet = want > 0 ? now : l.quiet;
        if (now - l.quiet > LAYER_IDLE) { stopLayer(l); v.layers.delete(id); layerBufs.delete(id); }
    }
}
// starts a layer at `at`, at the point in its loop that lines up with where its track is then
function startLayer(v, id, at)
{
    const t = TRACKS[id], { buf, shift } = layerBufs.get(id), base = v.track;
    const span = t.loop.end - t.loop.start, p = position(v, at) - base.loop.start;
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    src.loop = true; src.loopStart = t.loop.start + shift; src.loopEnd = t.loop.end + shift;
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(v.gain);      // under the track's own fade, so a change takes its layers with it
    src.start(at, t.loop.start + shift + (p % span + span) % span);
    return { id, src, gain, level: 0, quiet: at };
}
function stopLayer(l, at)
{
    try { l.src.stop(at); } catch (e) {}
    l.src.onended = ()=> l.gain.disconnect();
}
function stopLayers(v, at)
{
    for (const l of v.layers?.values() ?? []) { stopLayer(l, at); layerBufs.delete(l.id); }
    v.layers?.clear();
}

// what should be playing, and for which cue
function wanted()
{
    for (let i = cues.length - 1; i >= 0; i--)
        if (!cues[i].spent && TRACKS[cues[i].name]) return { id: cues[i].name, cue: cues[i] };
    return { id: area(), cue: null };
}

function change(id, cue)
{
    const now = audioContext.currentTime;
    // a change still waiting for its downbeat is changed again: the same downbeat, or back to what was playing
    if (current && current.at > now + .005)
    {
        try { current.src.stop(); } catch (e) {}
        stopLayers(current);
        current.gain.disconnect();
        const at = current.at, back = fading[fading.length - 1];
        if (back && back.id === id && back.fadeAt > now) { fading.pop(); restart(back); }
        else current = startTrack(id, at, cue);
        return;
    }
    let at = now + LEAD;
    if (current)
    {
        const t = current.track, p = position(current, now);
        if (!t.loop && p >= t.seconds) current.gain.disconnect();     // long over
        else if (!t.loop && p >= t.end) fadeOut(current, at, FADE[1]);  // a one-shot's last bar has passed: let it ring out
        else
        {
            at = nextDownbeat(current, now + LEAD);
            fadeOut(current, at, clampFade(spb(t) * t.beatsPerBar));
        }
    }
    current = startTrack(id, at, cue);
}
// Web Audio can't take back a scheduled stop, so a track called back from its fade starts again where it is
function restart(v)
{
    const now = audioContext.currentTime, at = now + LEAD;
    const p = position(v, at);
    try { v.src.stop(); } catch (e) {}
    stopLayers(v);
    v.src.onended = null;
    v.gain.disconnect();
    const t = v.track, { buf, shift } = use(v.id);
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    if (t.loop) { src.loop = true; src.loopStart = t.loop.start + shift; src.loopEnd = t.loop.end + shift; }
    const gain = audioContext.createGain();
    src.connect(gain).connect(bus);
    src.start(at, Math.max(0, p + shift));
    current = { ...v, src, gain, when: at - p - shift, at, layers: new Map() };
}

function musicUpdate()
{
    if (!bus) { musicStart(); if (!bus) return; }
    const now = audioContext.currentTime;
    const level = LEVEL * volume * duck;
    if (level !== busLevel) { busLevel = level; bus.gain.setTargetAtTime(level, now, SLIDE); }
    if (now < settleUntil) return;      // a moment for a cue (an intro) to ask before the area starts
    // a one-shot played to its end: its cue is spent, and the area takes the music back
    if (current?.cue && !current.track.loop && position(current, now) >= current.track.end) current.cue.spent = true;
    const want = wanted();
    if (want.id === current?.id) { if (want.cue) current.cue = want.cue; updateLayers(current, now); return; }
    if (!TRACKS[want.id]) return;
    if (!ready.has(want.id)) { load(want.id); return; }    // keeps the old track going until the new one is decoded
    change(want.id, want.cue);
}

// starts the music; call it from the first click or key press (a title screen's Start), when the browser lets audio play
export function musicStart()
{
    if (music.started || !sfx.context) return;
    audioContext = sfx.context; audioMasterGain = sfx.musicOut;
    try
    {
        bus = audioContext.createGain();
        bus.gain.value = 0;
        bus.connect(audioMasterGain);
        music.started = true;
        settleUntil = audioContext.currentTime + .5;
        load(area());
    }
    catch (e) { bus = null; }
}
export const musicSystem = {
    build()
    {
        volume = volumeGain(setting('audio.music'));
        events.on('settings:changed', ({ id, value })=> { if (id === 'audio.music') volume = volumeGain(value); });
    },
    update: musicUpdate,
};
