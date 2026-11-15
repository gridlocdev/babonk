# Release

## Where things stand

Babonk 1.0 is out (v1.0.0, then fixes in v1.0.1 and v1.0.2) and live on gridloc.dev. This stage is the bug fixes, balance, performance and final touches after it. Since 1.0, the code has been split into world, player and render layers with one folder per feature, each feature is tested through its contract, the graphics have quality presets with a frame-rate watchdog, the game installs to a home screen, and there is a gym and a museum beside the zoo (`docs/ARCHITECTURE.md#dev-rooms`). None of that changed how the game plays, looks or sounds; `just rooms` and the tests check it.

Next: the play-tests below, then whatever they turn up.

## For you

- To play: 8 play-tests, under To play
- To hear: 3, under To hear
- To answer: 4 questions, under the two question headings

### Questions to answer by playing, listening or looking

1. **Should a dash into a bare wall or floor add to the chain?**
   - Built now: only foes and crates add to it, because bouncing on a floor let a run farm the chain without end.
   - Options, my pick first:
     - **(a) Keep it: only kills add**
     - (b) A bare bounce adds one, but only once per wall before a kill
   - Changing it costs: the chain part (`features/chain/index.js`) and its museum exhibit.
   - Play it: [http://localhost:8141/?debug&mute&room=museum&exhibit=chain](http://localhost:8141/?debug&mute&room=museum&exhibit=chain)
2. **Should the title music go 5/4 like the wells?**
   - Built now: the title uses the 4/4 hook; the wells are darker, in 5/4 and 3/4.
   - Options, my pick first:
     - **(a) Keep the title in 4/4, so the first well's change of metre is felt**
     - (b) 5/4 everywhere
   - Changing it costs: one song spec in `tools/music/songs.js` and a `just music` render.
   - Listen: [http://localhost:8141](http://localhost:8141)

### Questions only you can choose

3. **Keep the pause menu and initials as HTML cards, or draw them on the screen in the pixel font?**
   - Built now: HTML cards in the game's colours, with a monospace system font.
   - Options, my pick first:
     - **(a) Keep the cards: they're readable at any size and work with every input already**
     - (b) Draw them on the 320 × 180 screen in the pixel font, to match the HUD
   - Changing it costs: `ui/cards.js`, `ui/initials.js`, the settings screen's look and its keyboard, pad and touch handling.
4. **Is three wells (10, 14 and 18 chunks deep) the right length for a run, and is the third hard enough?**
   - Built now: `WELLS` in `world/wells-data.js`.
   - Options, my pick first:
     - **(a) Keep three, and judge the third after a few full runs**
     - (b) Make the third deeper, or weight it further toward the hardest chunks
   - Play it: [http://localhost:8141](http://localhost:8141)

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

- [ ] **The mix**: [http://localhost:8141](http://localhost:8141), play a well. Are the effects level with the music? Change `EFFECTS_LEVEL` in `audio/sfx.js` or `LEVEL` in `audio/music.js`, or try the sliders ([http://localhost:8141/?debug&shot=settings](http://localhost:8141/?debug&shot=settings)).
- [ ] **The soundtrack**: [http://localhost:8141](http://localhost:8141), [the rest](http://localhost:8141/?debug&shot=rest), [game over](http://localhost:8141/?debug&shot=over). Do the darker 5/4 and 3/4 wells fit the fall, are the drums interesting enough, and do the loops (about every 58 to 68 s) wrap without a hitch?
- [ ] **The sound effects**: [http://localhost:8141](http://localhost:8141). They're made in code (`audio/sfx-defs.js`); do they fit the look?

## Follow-ups

- [ ] On the title, the touch pause button opens Settings but still shows the pause bars; a gear there would read better.
- [ ] Settings the game can't apply yet, removed in `game/settings.js` (`docs/settings.md`): difficulty presets, rumble, text size, high contrast, plain font. Add each back when the game can honour it.
- [ ] More chunks: Babonk has 13. A few more per well, some with a new idea (moving blocks, crumbling ledges), would keep runs from repeating. A new idea goes in the museum and gym first.
- [x] A home-screen icon and web manifest.
