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

## For you

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
- [ ] The pause button shows on the title on a touch screen, where it does nothing. Hide it there, or give it a use.
- [ ] Music.
- [ ] A home-screen icon and web manifest.
