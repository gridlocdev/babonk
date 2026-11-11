# Stage 1: Prototype

## Done: Babonk on its own

Babonk began as the third cabinet in a walkable 3D arcade. Decided: it becomes its own game, a plain 2D canvas with no three.js, no cabinet, no hall and no bloom; the 320 × 180 screen scaled by the largest whole number that fits the window, centred on the ground colour.

- [x] Rules, wells, sprites, sounds and tests carried over unchanged.
- [x] `platform/engine.js` makes the one canvas and keeps it at a whole-number scale on whole device pixels.
- [x] The page opens on the title; no insert-coin attract and no stepping away. Pause: Resume, Sound, End the run.
- [x] Keyboard, mouse button, gamepad and touch (stick, BONK, pause).
- [x] Debug shots renamed: `?debug&shot=play|bot|rest|over|zoo`.
- [x] Its own save key (`babonk-save-v1`): the top ten, last initials and the sound setting. The sound setting now holds from one visit to the next.
- [x] Checked headless in Firefox: the title, a bot run, rest, game over, the zoo and the pause menu at 60 fps; touch controls in a phone-sized run.

## Done: music

- [x] Chiptune soundtrack in D dorian from one hook (`docs/AUDIO.md`): title, one loop per well, the rest, game-over and win stings, rendered with music-generator (`just music`).
- [x] It follows the screens and changes on the bar; Music on/off in the pause menu, kept in the save.
- [x] The wells darker (D minor, phrygian, harmonic minor) and in 5/4 and 3/4, with hand-written drums.

## Done: settings and the mix

- [x] Settings on the shared settings table (`docs/SETTINGS.md`): tabs for Audio, Controls, Display and Accessibility; rows for volumes, mono, background sound, stick dead zone, brightness, frame rate, full screen, screen shake, reduce flashing and game speed. Keys and pad (hold to repeat, Q/E or LB/RB for tabs), click or drag, touch. Reset per tab after a second press.
- [x] Only changed values saved, in `core.settings`; older saves carried over; reduced motion turns shake off and flashing down by default.
- [x] Pause: Continue, Settings, Restart, Quit to title, the last two confirmed; the music drops under it. Leaving the tab mid-run pauses it, and sound stops unless Play in the background is on.
- [x] Effects brought down and music up, from 12 dB apart to about 2; a limiter on the output.

## For you

- [ ] Listen to the new mix (http://localhost:8141, play a well). Are the effects level with the music now, or should they sit higher or lower? Change `EFFECTS_LEVEL` in `audio/sfx.js` or `LEVEL` in `audio/music.js`, or try the sliders (Esc on the title, http://localhost:8141/?debug&shot=settings).
- [ ] Try Settings with a real gamepad: LB/RB for tabs, the d-pad held on a slider, B to go back.

- [ ] Listen to the soundtrack (http://localhost:8141, click to start; the rest and game over: http://localhost:8141/?debug&shot=rest, http://localhost:8141/?debug&shot=over). Do the darker 5/4 and 3/4 wells fit the fall, and are the drums interesting enough now? Each well's tempo and mode, and the hook, are in `tools/music/songs.js`.
- [ ] Do the loops wrap without a hitch? The wells loop about every 58–68 s; long wells will hear them twice. The title still uses the 4/4 hook; should it go 5/4 too?

- [ ] Play it (http://localhost:8141, `just serve`). Does the bonk feel good: homing speed and time (`homeSpeed`, `homeTime`), dash (`dashSpeed`, `dashTime`), bounce heights (`bounceV`, `stompV`, `wallKickV`) in `features/babonk/babonk-data.js`? Only a bot has played it.
- [ ] Is three wells (10, 14 and 18 chunks deep) the right length for a run, and is the third hard enough? `WELLS` in `babonk-data.js`.
- [ ] Should a dash into a bare wall or floor add to the chain? Now only foes and crates do, because bouncing on a floor let a run farm it endlessly.
- [ ] Babonk uses blue-black, mint and green, with stars knocked out of foes instead of placed gems, so it reads less like Downwell (http://localhost:8141/?debug&shot=bot). Do the colours and the star shower work?
- [ ] The green is a mid value (#469e1a), so the three colours separate in gray (http://localhost:8141/?debug&shot=zoo&view=gray). Does the darker green still feel lively enough in play?
- [ ] Look over the hero's animations in the zoo (http://localhost:8141/?debug&shot=zoo): idle with a blink, a 4-frame run, squash on landing and bouncing, rise, fall, hurt, a spinning ball, and a smear as a dash leaves. Foes have 2-frame walks and flaps, and stars twinkle.
- [ ] Does the hit stop on a kill (`hitStop`, `hitStopChain`, `hitStopMax`) feel punchy rather than stuttery? Is the floater's stop-and-glare tell (`floaterTell`) long enough to react to? (http://localhost:8141, the zoo shows the sprites.)
- [ ] The sounds are made in code (`sounds-data.js`) and haven't been heard. Do they fit the look?
- [ ] Try it on a phone (`just lan`): the stick, BONK and pause buttons have only been checked in an emulated, headless run.
- [ ] The pause menu and initials are HTML cards in the game's colours with a monospace system font. Keep them, or draw them on the screen in the pixel font?

## Follow-ups

- [ ] Babonk has 13 chunks. More, and a few per well with a new idea (moving blocks, crumbling ledges), would keep runs from repeating.
- [ ] Settings the game can't apply yet, removed in `game/settings.js` (`docs/SETTINGS.md`): difficulty presets, rumble, text size, high contrast, plain font. Add each back when the game can honour it.
- [ ] On the title, the touch pause button now opens Settings but still shows the pause bars; a gear there would read better.
- [ ] A home-screen icon and web manifest.
