# Release

## Where things stand

Babonk 1.0 is out (v1.0.0, then fixes in v1.0.1 and v1.0.2) and live on gridloc.dev. This stage is the bug fixes, balance, performance and final touches after it. Since 1.0, the code has been split into world, player and render layers with one folder per feature, each feature is tested through its contract, the graphics have quality presets with a frame-rate watchdog, the game installs to a home screen, and there is a gym and a museum beside the zoo (`docs/ARCHITECTURE.md#dev-rooms`). None of that changed how the game plays, looks or sounds; `just rooms` and the tests check it.

Next: the pause menu in the pixel font (Slices), the play-tests below, then whatever they turn up.

## For you

- To play: 8 play-tests, under To play
- To hear: 4, under To hear

### Not yet checked

- [ ] Settings with a real gamepad: LB/RB for tabs, the d-pad held on a slider, B to go back ([http://localhost:8141/?debug&mute&shot=settings](http://localhost:8141/?debug&mute&shot=settings)).
- [ ] A real phone (`just lan`): the stick, BONK and pause buttons have only run in an emulated, headless phone.
- [ ] Installing from a phone's home screen: the icon, the name and full screen with no browser bar (`just lan`, then Add to Home Screen).
- [ ] The low graphics preset on a slow device: fewer bits in a burst and no afterimages. Set it in Settings, Display, Graphics quality, or let Automatic step down on its own; the debug readout shows `gfx:`.

### To play

- [ ] **The gym's bands**: [http://localhost:8141/?debug&mute&room=gym](http://localhost:8141/?debug&mute&room=gym): Esc for the next row, Q and E for the case, then play the case yourself with the stick and BONK. Each case is OK (easy), HARD or struck through (can't be done), from the hero's numbers. Say where a case feels easier or harder than its band, and it moves, with the reason written in `src/dev/gym-data.js`. The jump, gap and dash rows should match what you feel in a well.
- [ ] **The bonk's feel**: [http://localhost:8141/?debug&mute&room=gym&case=lock](http://localhost:8141/?debug&mute&room=gym&case=lock) and [http://localhost:8141](http://localhost:8141): homing speed and time (`homeSpeed`, `homeTime`), dash (`dashSpeed`, `dashTime`) and the bounce heights (`bounceV`, `stompV`, `wallKickV`) in `player/hero-data.js`. Only a bot has played it.
- [ ] **Hit stop and the floater's tell**: [http://localhost:8141/?debug&mute&room=museum&exhibit=hitstop](http://localhost:8141/?debug&mute&room=museum&exhibit=hitstop) and [http://localhost:8141/?debug&mute&room=museum&exhibit=tell](http://localhost:8141/?debug&mute&room=museum&exhibit=tell): the freeze on a kill should feel punchy, not stuttery (`hitStop`, `hitStopChain`, `hitStopMax`), and the stop-and-glare (`floaterTell`) long enough to react to; both in `features/foes/foes-data.js`.
- [ ] **The museum**: [http://localhost:8141/?debug&mute&room=museum](http://localhost:8141/?debug&mute&room=museum): Q and E through the exhibits. Each sign should say what you see, and the wall-to-wall ledge should read as a mistake.
- [ ] **The colours and the star shower**: [http://localhost:8141/?debug&mute&shot=bot](http://localhost:8141/?debug&mute&shot=bot): blue-black, mint and a mid green, with stars knocked out of foes. Does the darker green still feel lively? In gray they should separate: [http://localhost:8141/?debug&mute&shot=zoo&view=gray](http://localhost:8141/?debug&mute&shot=zoo&view=gray).
- [ ] **The hero's animations**: [http://localhost:8141/?debug&mute&room=zoo](http://localhost:8141/?debug&mute&room=zoo): idle with a blink, a 4-frame run, squash on landing and bouncing, rise, fall, hurt, a spinning ball and a smear as a dash leaves; 2-frame walks and flaps for the foes, and twinkling stars.
- [ ] **A full run after the code split**: [http://localhost:8141](http://localhost:8141): three wells to the end and a high score. It should play, look and sound exactly as v1.0.2.
- [ ] **The home-screen icon**: [http://localhost:8141/icons/icon-512.png](http://localhost:8141/icons/icon-512.png): the hero rising, on the ground colour. Does it read at phone-icon size?

### To hear

- [ ] **The title in 3/4**: [http://localhost:8141](http://localhost:8141), wait on the title, then press start. Does the 3/4 hook lilt rather than stumble, does the loop (after the four-bar intro, about every 22 s) wrap cleanly, and does `well1` come in on the bar? To change it, `HOOK3` in `tools/music/songs.js`, then `just music ../../apps/music-generator title`.

- [ ] **The mix**: [http://localhost:8141](http://localhost:8141), play a well. Are the effects level with the music? Change `EFFECTS_LEVEL` in `audio/sfx.js` or `LEVEL` in `audio/music.js`, or try the sliders ([http://localhost:8141/?debug&shot=settings](http://localhost:8141/?debug&shot=settings)).
- [ ] **The soundtrack**: [http://localhost:8141](http://localhost:8141), [the rest](http://localhost:8141/?debug&shot=rest), [game over](http://localhost:8141/?debug&shot=over). Do the darker 5/4 and 3/4 wells fit the fall, are the drums interesting enough, and do the loops (about every 58 to 68 s) wrap without a hitch?
- [ ] **The sound effects**: [http://localhost:8141](http://localhost:8141). They're made in code (`audio/sfx-defs.js`); do they fit the look?

## Slices

- [x] 1. Title music in 3/4: the hook squeezed to three beats a bar over the same chords, rendered to `music/title.mp3` (answered question 2).
- [ ] 2. Pause menu and initials in the pixel font on the 320 × 180 screen, to match the HUD (answered question 3). Replaces the HTML cards in `ui/cards.js` and `ui/initials.js`; keyboard, pad and touch must keep working, and the settings screen should match.

## Follow-ups

- [ ] On the title, the touch pause button opens Settings but still shows the pause bars; a gear there would read better.
- [ ] Settings the game can't apply yet, removed in `game/settings.js` (`docs/settings.md`): difficulty presets, rumble, text size, high contrast, plain font. Add each back when the game can honour it.
- [ ] More chunks: Babonk has 13. A few more per well, some with a new idea (moving blocks, crumbling ledges), would keep runs from repeating. A new idea goes in the museum and gym first.
- [x] A home-screen icon and web manifest.

## Answered

### Answered questions

1. **Should a dash into a bare wall or floor add to the chain?** No: only kills (foes and crates) add, so floors can't be farmed. 2026-11-15. As built in `features/chain/index.js`.
2. **Should the title music go 5/4 like the wells?** Neither: make it 3/4. 2026-11-15. Slice 1.
3. **Keep the pause menu and initials as HTML cards, or draw them in the pixel font?** Draw them on the screen in the pixel font. 2026-11-15. Slice 2.
4. **Is three wells (10, 14 and 18 chunks deep) the right length, and is the third hard enough?** Keep three as they are, and judge the third after a few full runs. 2026-11-15.
