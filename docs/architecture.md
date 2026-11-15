# Architecture

Babonk is plain ES modules with no bundler and no runtime dependencies. The game draws every frame on one 320 × 180 2D canvas, which the page shows scaled up by the largest whole number that fits the window. Its rules live in a headless simulation that runs in node; what you see and hear reacts to what it announces.

## Layout

```
src/
  lib/        pure helpers: seeded rng, sound synthesis, pixel-font (the bitmap font), high-scores (the top-ten table),
              anim (sprite-frame timing), settings (the standard settings table, docs/settings.md)
  platform/   engine.js (the canvas and its whole-number scaling, URL FLAGS, MOBILE, the fixed-step loop), input, storage
  game/       events (pub/sub), state (the save), loop (the system list), settings (the live settings values, `core` slice)
  ui/         cards (the pause menu's buttons), initials (the three-letter entry), kinetic (banner letters), touch
              controls, settings-screen (tabs of setting rows), fps (the frame-rate readout), pixel-text (lib/pixel-font.js on a 2D canvas), style.css
  audio/      sfx.js (Web Audio: sounds baked from code), sfx-defs.js (the menu sounds), music.js (the soundtrack),
              tracks-data.js (generated: each track's file, tempo and loop points)
  features/
    babonk/   sim.js (rules), level.js (the tile grid), *-data.js (numbers, chunks, sprites and animations, sounds),
              pose.js (which animation the hero shows), view.js, zoo.js (debug sprite zoo), index.js (screens and glue)
  dev/        ?debug tools, loaded only with that flag
  main.js     boot
tools/music/ the soundtrack's song specs (songs.js) and the renderer; music/ the rendered mp3s
```

`world/` and `render/` have no files yet; they sit in the same tier as `ui/` and `audio/` in `architecture.json`, ready if needed.

## Rules

- Imports only point down `lib → platform → game → (world, render, ui, audio) → features → main.js`. `dev/` sits on top and may read any layer through the public entry points.
- `platform/engine.js` is the one place that makes the drawing surface (`pixelScreen(w, h)`), reads the URL (`FLAGS`) and runs the loop.
- Features don't import each other. They talk through `game/events.js` or a registry.
- A feature owns its save slice and its `*-data.js`.
- `lib/` and `*-data.js` import no engine or DOM code and have tests. So do `sim.js`, `level.js` and `pose.js`, which run in node.
- A new feature goes in `src/features/<name>/` and is registered in `src/features/index.js`.

## Checking

`just check` (syntax, layer rules through `tools/coupling-report.mjs` with `architecture.json`, and types: `tsc` checks the plain JavaScript and its JSDoc against `jsconfig.json`, emitting nothing) and `just test`. `just dead` lists modules, exports and assets nothing uses.

`just bench` times frames in Playwright's Firefox, pinned through `package.json` (`just install-bench` once): headless, muted, a fresh profile, at 1440x900 and pixel ratio 2 unless `--size` and `--dpr` say otherwise. Each argument is a run (`"debug&shot=bot"`); add `|js` to change the page before timing, `--repeat 2` to interleave runs through a busy machine, `--shots DIR` to save a screenshot of each, and `--touch` to pretend to be a phone so the touch controls show. It prints page and console errors. 60 fps with p95 under ~18 ms is healthy; every screen holds that.

## The screen

`pixelScreen(w, h)` in `platform/engine.js` sizes the one canvas and returns its 2D context. On every resize it picks the largest whole scale in device pixels that fits the window and puts the canvas's corner on a device pixel, with `image-rendering: pixelated`, so every game pixel is the same size and sharp on any pixel ratio. A window smaller than 320 × 180 device pixels gets a fitting fractional scale instead. The page around it is the ground colour, `#0b0f1e`.

## Babonk

`level.js` stacks hand-made 18 × 10 chunks from `wells-data.js` into one tall `Uint8Array` grid per well (empty, block, crate, spikes) between two solid side walls, with the foes the chunks place. `sim.js` steps a run at a fixed 1/60 s: `step(world, dt, { x, y, held, pressed })`, every number in `babonk-data.js`, a seeded rng so a run replays. Boxes move one axis at a time against the grid. `lockTarget` picks the homing bonk's foe: nearest in range, inside a cone from straight down, with a clear line to it. Stars (`world.stars`) burst out of broken foes and crates and move in the sim like tiny foes. A kill sets `world.freeze`, the hit stop: `step` does nothing until it runs out, keeping a press made meanwhile. A floater that spots you sets `chasing` and `alertAt`, and holds still for its tell before it moves. Sounds and effects queue in `world.sfx` and `world.fx`. Units are screen pixels with y down.

`view.js` draws the 320 × 180 screen each frame: sprites from `sprites-data.js` baked once, the well, effects, HUD in the pixel font. Sprites are strings of palette letters in `sprites-data.js`; `ANIMS` strings them into animations, each frame held for its own time (`frameAt` in `lib/anim.js`). The kill's `pop` effect carries the foe's frame and place, so the view draws it in mint for the hit stop before it bursts. `blockAt(tx, ty)` picks each block's variant from a hash of its tile. `pose.js` picks the hero's animation from the player and the run clock, using the times the sim records (`landAt`, `bounceAt`, `hurtAt`, `dash.t`). The zoo (`zoo.js`, `?debug&shot=zoo`) plays every animation at 3×, lays out every frame at play size and puts the cast on a ledge; add a sprite or animation to the data and it appears there. Check every new sprite in it, with the gray and silhouette views, before it goes into a well.

`index.js` runs the screens: the title (where the page opens) → play → rest between wells → game over → initials when the score makes the top ten → the title. The pause menu (Continue, Settings, Restart, Quit to title, the last two confirmed), Settings and the initials are HTML cards from `ui/cards.js` over the canvas, in the game's colours; everything else is drawn on the canvas. A card item with `adjust` is a slider: left and right change it and repeat while held; a menu's `tick` takes its own keys first (the settings tabs). Settings and the pause menu follow `docs/settings.md`. Leaving the tab mid-run pauses it.

Its sounds are `lib/synth.js` code in `sounds-data.js`, registered with `sfx.define` as `babonk` + name; the menu sounds `uiMove` and `uiPick` are in `audio/sfx-defs.js`. The top ten and the last initials are the `babonk` save slice; the settings are the `core` slice (`game/settings.js`, only what differs from the defaults); `game/state.js` carries older saves' Sound and Music switches and volume steps into it. The save is one JSON string under the storage key `babonk-save-v1`.

## Music

The soundtrack is chiptune written as song specs for music-generator (`tools/music/songs.js`; the direction is `docs/audio.md`). `just music` composes and renders them with music-generator's own code in a hidden Electron window (it needs a checkout at `../../apps/music-generator`, or `just music <path> [ids]`, and ffmpeg), writes `music/<id>.mp3` and the generated `audio/tracks-data.js`, and checks every mp3 decodes in step with its render. A looping track keeps one tempo to its loop's end (`push: 0`). A section may change the meter (the wells go between 5/4 and 3/4); such a track lists its bar lines in `tracks-data.js` (`bars`), and `music.js` changes tracks on those. A spec's `shape(score)` edits the composed notes before they play; the wells' drums are written that way.

`audio/music.js` plays on the effects' context (`sfx.context`, through `sfx.musicOut`, after their compressor), so it starts with the first key or tap and never with `?mute`. The area function decides the track; a change waits for the next bar line and crossfades, unless the track was marked with `musicCutIn`, which stops what is playing and starts at once, and is kept decoded from the start. Babonk sets it with `setMusicArea(musicFor)`: the title, a track per well, the rest, and one-shots for game over and the win. Its volume is the Music setting, and `setMusicDuck` lowers it under the pause menu. The mix: effects → their bus → a compressor, joined by the music after it → the Master gain → a limiter; the levels that balance the two are in `docs/audio.md`.

## Debug flags

Add to the URL. `?debug` is needed for `shot`, `view`, `t` and `speed`.

| Flag | Does |
|---|---|
| `?debug` | readout, `window.game`, a fixed seed, keys: 1 slow motion, 2 fast forward |
| `?shot=play`, `bot`, `rest`, `over` | a run, a run played by a simple pilot, the rest between wells, the game over |
| `?shot=pause`, `settings` | the pause menu over a run; settings over the title |
| `?shot=zoo` | the sprite zoo: every animation, every frame, the cast at play size |
| `&view=gray`, `&view=silhouette` | on any screen: check whether values separate, and whether every sprite reads by its outline |
| `&t=<seconds>` | with `shot=zoo`: freeze its clock, for stills of one frame |
| `?speed=4` | game speed |
| `?mute` | no sound |
