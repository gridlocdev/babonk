# Architecture

Babonk is plain ES modules with no bundler and no runtime dependencies. The game draws every frame on one 320 × 180 2D canvas, which the page shows scaled up by the largest whole number that fits the window. Its rules live in a headless simulation that runs in node; what you see and hear reacts to what it announces.

## Layout

```
src/
  lib/        pure helpers: seeded rng, sound synthesis, pixel-font (the bitmap font), high-scores (the top-ten table),
              anim (sprite-frame timing), settings (the standard settings table, docs/settings.md)
  platform/   engine.js (the canvas and its whole-number scaling, URL FLAGS, MOBILE, the fixed-step loop), graphics (quality presets and the frame-rate watchdog), input, storage
  game/       events (pub/sub), state (the save), loop (the system list), settings (the live settings values, `core` slice)
  world/      wells-data.js (sizes, gravity, the wells and their chunks), well.js (the tile grid, moving boxes through it),
              run.js (a run: its wells, its parts, the fixed step and the hit stop)
  player/     hero.js (movement, jump, the bonk, hurt), hero-data.js (its numbers), pose.js (which animation it shows)
  render/     screen.js (the canvas, baked sprites), sprites-data.js, view.js (the well, effects, HUD, title and panels),
              zoo.js (the debug sprite zoo and check views)
  ui/         pixel-menu (menus drawn in the pixel font), menu-nav (focus moved by keys and pad), settings-screen, initials, touch
              controls, settings-screen (tabs of setting rows), fps (the frame-rate readout), pixel-text (lib/pixel-font.js on a 2D canvas), style.css
  audio/      sfx.js (Web Audio: sounds baked from code), sfx-defs.js (every sound), music.js (the soundtrack),
              tracks-data.js (generated: each track's file, tempo and loop points)
  features/
    foes/     walkers, floaters and spikers: spawning, moving, stomps and kills, drawing
    stars/    stars knocked out of what you break: bursting, falling, pickup, drawing
    chain/    the bounce chain and its bonus
    run/      the run and its screens: title, play, pause, settings, rest, game over, initials and the top ten
  dev/        ?debug tools, loaded only with that flag: the readout and keys (index.js), and the gym and museum rooms
  main.js     boot
tools/music/ the soundtrack's song specs (songs.js) and the renderer; music/ the rendered mp3s
```

## Rules

- Imports only point down `lib → platform → game → (world, player, render, ui, audio) → features → main.js`. `dev/` sits on top and may read any layer through the public entry points.
- `platform/engine.js` is the one place that makes the drawing surface (`pixelScreen(w, h)`), reads the URL (`FLAGS`) and runs the loop.
- Features don't import each other. They talk through `game/events.js` or a registry (`addRunPart` in `world/run.js`, `addRunLayer` in `render/view.js`).
- A feature owns its save slice and its `*-data.js`.
- `lib/` and `*-data.js` import no engine or DOM code and have tests. So do `world/` and `player/`, which run in node.
- Each feature has its own test file in `test/features/`, which builds it with the real `game/` modules (over `test/fake-browser.js`, a do-nothing DOM), plays like the player (a run's controls, or keys and the touch button for the run feature) and checks what the rest of the game sees: the run's score, hp and sounds, the `debug()` hook and the saved slice. A test imports a feature's `index.js` and data, never its other files. The `game/` modules keep their state at module level, so one file covers one feature.
- A new feature goes in `src/features/<name>/` and is registered in `src/features/index.js`.

## Checking

`just check` (syntax, layer rules through `tools/coupling-report.mjs` with `architecture.json`, and types: `tsc` checks the plain JavaScript and its JSDoc against `jsconfig.json`, emitting nothing) and `just test`. `just dead` lists modules, exports and assets nothing uses.

`just bench` times frames in Playwright's Firefox, pinned through `package.json` (`just install-bench` once): headless, muted, a fresh profile, at 1440x900 and pixel ratio 2 unless `--size` and `--dpr` say otherwise. Each argument is a run (`"debug&shot=bot"`); add `|js` to change the page before timing, `--repeat 2` to interleave runs through a busy machine, `--shots DIR` to save a screenshot of each, and `--touch` to pretend to be a phone so the touch controls show. It prints page and console errors. 60 fps with p95 under ~18 ms is healthy; every screen holds that.

## The screen

`pixelScreen(w, h)` in `platform/engine.js` sizes the one canvas and returns its 2D context. On every resize it picks the largest whole scale in device pixels that fits the window and puts the canvas's corner on a device pixel, with `image-rendering: pixelated`, so every game pixel is the same size and sharp on any pixel ratio. A window smaller than 320 × 180 device pixels gets a fitting fractional scale instead. The page around it is the ground colour, `#0b0f1e`.

That canvas is cheap, so there is no pixel ratio or resolution to lower. `platform/graphics.js` holds the Graphics quality presets, which thin the effects instead (bits per break, dash afterimages), and a watchdog the loop feeds each frame's length: in Automatic, under 40 frames a second for 3 seconds steps down one preset, at most once every 10 seconds, and choosing a preset by hand starts it over. `render/view.js` reads `graphics.preset`; the debug readout shows which (`gfx`).

## The run

Read this when changing the rules, a foe, the stars, the chain or the screens.

`world/well.js` stacks hand-made 18 × 10 chunks from `world/wells-data.js` into one tall `Uint8Array` grid per well (empty, block, crate, spikes) between two solid side walls, with spawn points for the foes the chunks place. Boxes move one axis at a time against the grid (`move`). Units are screen pixels with y down.

`world/run.js` holds a run (`w`): the seeded rng, score, hp, the well, `w.foes` (what a bonk can lock onto), `w.chain`, and its parts. `step(w, dt, { x, y, held, pressed })` runs at a fixed 1/60 s; a kill sets `w.freeze`, the hit stop, and `step` does nothing until it runs out, keeping a press made meanwhile. A part is an object with an optional `step` and a method for each happening it cares about: `begin` (a run starts), `enter` (a well starts), `rest` (between wells), `bounced { kill }`, `hurt`, `landed`, `broke { what, x, y }`; `happen(w, name, data)` calls them in order. The hero (`player/hero.js`) is always the first part and moves first; if a well ends under it, nothing else moves that step. Features add theirs in `build()` with `addRunPart`, in the order of `features/index.js`: foes, stars, the chain, and the run's own floor check. Sounds and effects queue in `w.sfx` and `w.fx`.

`player/hero.js` moves the hero, jumps, bonks and bounces. `lockTarget` picks the homing bonk's foe: nearest in range, inside a cone from straight down, with a clear line to it. `pose.js` picks the hero's animation from the player and the run clock, using the times the hero records (`landAt`, `bounceAt`, `hurtAt`, `dash.t`).

`features/foes` spawns foes from the chunks, moves them (a floater that spots you sets `chasing` and `alertAt`, and holds still for its tell before it moves), and settles touches: a bonk or stomp kills, anything else hurts. `features/stars` bursts stars out of whatever `broke`, more from a foe the longer the chain. `features/chain` counts kills bounced off since you last stood, and pays for a chain of three or more on landing.

`render/view.js` draws the 320 × 180 screen each frame: the well's tiles, then what features draw with `addRunLayer(z, draw)` (stars, then foes), then hit flashes, the lock bracket, afterimages and the hero, then effects and the HUD in the pixel font. Sprites are strings of palette letters in `render/sprites-data.js`, baked once in `render/screen.js`; `ANIMS` strings them into animations, each frame held for its own time (`frameAt` in `lib/anim.js`). The kill's `pop` effect carries the foe's frame and place, so the view draws it in mint for the hit stop before it bursts. `blockAt(tx, ty)` picks each block's variant from a hash of its tile. The zoo (`render/zoo.js`, `?debug&shot=zoo`) plays every animation at 3×, lays out every frame at play size and puts the cast on a ledge; add a sprite or animation to the data and it appears there. Check every new sprite in it, with the gray and silhouette views, before it goes into a well.

`features/run` runs the screens: the title (where the page opens) → play → rest between wells → game over → initials when the score makes the top ten → the title. The pause menu (Continue, Settings, Restart, Quit to title, the last two confirmed), Settings and the initials are drawn on the canvas in the pixel font by `ui/pixel-menu.js`, like everything else; the only HTML is the touch controls and the debug readouts. Items are boxes in screen pixels: a mouse or finger on one focuses and picks it, and one with `drag` takes the pointer (a settings bar). The focus moves with `ui/menu-nav.js`: an item with `adjust` is a slider, so left and right change it and repeat while held, and a menu's `tick` takes its own keys first (the settings tabs). Settings and the pause menu follow `docs/settings.md`. Leaving the tab mid-run pauses it.

Every sound is `lib/synth.js` code in `audio/sfx-defs.js`; the run plays what its parts queue in `w.sfx` by name. The top ten and the last initials are the `run` save slice (older saves' `babonk` slice is moved there); the settings are the `core` slice (`game/settings.js`, only what differs from the defaults); `game/state.js` carries older saves' Sound and Music switches and volume steps into it. The save is one JSON string under the storage key `babonk-save-v1`.

## Music

The soundtrack is chiptune written as song specs for music-generator (`tools/music/songs.js`; the direction is `docs/audio.md`). `just music` composes and renders them with music-generator's own code in a hidden Electron window (it needs a checkout at `../../apps/music-generator`, or `just music <path> [ids]`, and ffmpeg), writes `music/<id>.mp3` and the generated `audio/tracks-data.js`, and checks every mp3 decodes in step with its render. A looping track keeps one tempo to its loop's end (`push: 0`). A section may change the meter (the wells go between 5/4 and 3/4); such a track lists its bar lines in `tracks-data.js` (`bars`), and `music.js` changes tracks on those. A spec's `shape(score)` edits the composed notes before they play; the wells' drums are written that way.

`audio/music.js` plays on the effects' context (`sfx.context`, through `sfx.musicOut`, after their compressor), so it starts with the first key or tap and never with `?mute`. The area function decides the track; a change waits for the next bar line and crossfades, unless the track was marked with `musicCutIn`, which stops what is playing and starts at once, and is kept decoded from the start. Babonk sets it with `setMusicArea(musicFor)`: the title, a track per well, the rest, and one-shots for game over and the win. Its volume is the Music setting, and `setMusicDuck` lowers it under the pause menu. The mix: effects → their bus → a compressor, joined by the music after it → the Master gain → a limiter; the levels that balance the two are in `docs/audio.md`.

## Dev rooms

Three rooms show the game working, for answering a question with a screenshot instead of reading code: the zoo (every sprite, above), the gym and the museum. `dev/` sits above the features (`"top": ["dev"]` in `architecture.json`): it may import anything, reaches features only through `features/index.js`, and nothing imports it.

- **The gym** (`dev/gym.js`) has a row per movement metric: jump height, running-jump gap and dash reach from the hero, lock range and what breaks which foe from the foes' `gym()` hook. Each case is coloured by its band, worked out in `dev/gym-data.js` from the hero's numbers: easy up to 80% of the reach, hard up to it, then no. Change a tuning number and the bands move with it.
- **The museum** (`dev/museum.js`) has an exhibit per system, with a sign: the wall kick and a don't (a ledge wall to wall, built wrong on purpose) from `dev/`, and each feature's own through its `museum()` hook (a floater's tell, hit stop, the chain, stars).
- A case or exhibit is a scripted try (`Trial` in `game/loop.js`): `start(w)` builds it in an empty well, `ctrl` is its input each step, `done` and `passed` judge it. `dev/scene.js` runs one in a real run with every part, and `dev/rooms.js` plays it in the browser on a loop; touch the stick or BONK to play it yourself.
- `test/dev/rooms.test.js` is the smoke test: every gym case passes exactly when its band says it can be done, and every exhibit passes. `just rooms` runs it and screenshots every room into `shots/rooms/`.
- A slice that changes movement, a foe or a system updates its room in the same change.

## Debug flags

Add to the URL. `?debug` is needed for `shot`, `view`, `t` and `speed`.

| Flag | Does |
|---|---|
| `?debug` | readout, `window.game`, a fixed seed, keys: 1 slow motion, 2 fast forward |
| `?shot=play`, `bot`, `rest`, `over` | a run, a run played by a simple pilot, the rest between wells, the game over |
| `?shot=pause`, `settings`, `initials` | the pause menu over a run; settings over the title; the initials after a 3170 game over |
| `?shot=zoo` or `?room=zoo` | the sprite zoo: every animation, every frame, the cast at play size |
| `?room=gym`, `&case=<row>` | the gym, at a row: `jump`, `gap`, `dash`, `lock`, `kill` |
| `?room=museum`, `&exhibit=<id>` | the museum, at an exhibit: `wallkick`, `sealed`, `tell`, `hitstop`, `chain`, `stars` |
| `&view=gray`, `&view=silhouette` | on any screen: check whether values separate, and whether every sprite reads by its outline |
| `&t=<seconds>` | with `shot=zoo`: freeze its clock, for stills of one frame |
| `?speed=4` | game speed |
| `?mute` | no sound |
