# Audio

**Identity: arcade plunge.** Driving and dark: bare NES-style chip voices in D, a hook that bounces up off the tonic and then falls back down. The wells limp: 5/4 verses and hook, 3/4 builds and bridges, so the beat never settles. Falling with style, and never quite safe.

- **Palette**: pulse leads (50%, 25%, 12.5%, PWM) that echo each other, a triangle or pulse bass running eighths, tracker arpeggios, the chip kits. Soft triangle, pluck and a PWM pad only where the player rests. No GM instruments, no reverb-heavy pads, nothing realistic.
- **Touchstones**: the NES's driving minor-key action loops (two pulses, triangle, noise); Downwell's short, punchy arcade energy; a tracker's shimmering one-voice arpeggios.

## What's on screen

A narrow well in three colours: blue-black void, mint brick walls and ledges, mid green for foes, spikes, stars and HP. Small, fast, jumpy: the hero bounces off foes and walls as it falls. Close quarters, so the music is dry and up front, not roomy.

- **Music**: fast and rhythmic, pulses and triangle, dark and uneasy; it keeps up with the fall and never lets the beat settle.
- **Effects** (`features/babonk/sounds-data.js`): bricks are hard and dry; foes pop; stars chime. They sit a few dB over the music, not on top of it. Measured: the tracks average about -20.5 dB and the effects about -14 dB over their loudest 50 ms, so the bus levels (`EFFECTS_LEVEL` in `audio/sfx.js`, `LEVEL` in `audio/music.js`) put the effects about 2 dB above the music at the default volumes (Master 80%, Music 70%, Effects 80%, each squared into a gain). The player sets them in Settings, Audio (`docs/settings.md`).
- **Ambience**: none. The music is the bed; the screen is never silent while it plays.

## The tracks

One home key (D), one motif (the hook's first bar, `1:0.5 5:0.5 8 7:0.5 5:0.5 3`; in 5/4 for the wells, `1:0.5 5:0.5 8:1.5 7:0.5 5 3`), varied per track. Every well has the same form: verse and hook in 5/4 (3 + 2), the build and bridge in 3/4. Their drums are written by hand, per section, in `songs.js` (`drumsBy`), since the composer's own odd-meter beat is plain. Specs in `tools/music/songs.js`.

| Track | Plays on | Keeps | Changes |
|---|---|---|---|
| `title` | the title | the hook, D dorian | 132 bpm, no drums, a 50% pulse over a pad; jumping in is the step up |
| `well1` | well 1 | the hook, in 5/4 | D minor, 138 bpm, 25% pulses, triangle bass, a heavy NES-kit rock beat |
| `well2` | well 2 | the motif, sequenced | D phrygian (flat 2nd), 150 bpm, PWM lead, rimclicks and low toms, snare saved for the hook |
| `well3` | well 3 | the hook, in 5/4, angry | D harmonic minor, 162 bpm, DPCM bass and kit in double time, claps |
| `rest` | between wells | the motif's steps | F major (the relative), a 3/4 music box at 84 bpm, no drums |
| `over` | game over (once) | the bounce, then it deflates | D major, quick and playful, a shrug over the borrowed iv and a cheeky octave hop |
| `win` | the run won (once) | the bounce | D major, 150 bpm, ends an octave up |

## What the music follows

| State | Player feels | Music | Into the next |
|---|---|---|---|
| Title | ready | `title` | Start: `well1` on the next bar |
| Well 1–3 | flow, then pressure | `well1`, `well2`, `well3`; keeps on under the pause menu | the bottom: `rest` |
| Rest | relief | `rest` | go on: the next well |
| Game over / won | loss / triumph | `over` / `win` once, then quiet | back to the title |

The screen's mode picks the track (`musicFor` in `features/babonk/index.js`); `audio/music.js` changes on the next bar line. Pause has Music on/off apart from Sound, which mutes everything.
