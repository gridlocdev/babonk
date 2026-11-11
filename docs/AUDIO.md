# Audio

**Identity: arcade plunge.** Driving and bouncy but a bit dark: bare NES-style chip voices in D dorian, a hook that bounces up off the tonic and then falls back down. Falling with style.

- **Palette**: pulse leads (50%, 25%, 12.5%, PWM) that echo each other, a triangle or pulse bass running eighths, tracker arpeggios, the chip kits. Soft triangle, pluck and a PWM pad only where the player rests. No GM instruments, no reverb-heavy pads, nothing realistic.
- **Touchstones**: the NES's driving minor-key action loops (two pulses, triangle, noise); Downwell's short, punchy arcade energy; a tracker's shimmering one-voice arpeggios.

## What's on screen

A narrow well in three colours: blue-black void, mint brick walls and ledges, mid green for foes, spikes, stars and HP. Small, fast, jumpy: the hero bounces off foes and walls as it falls. Close quarters, so the music is dry and up front, not roomy.

- **Music**: fast and rhythmic, pulses and triangle, minor but never gloomy; it keeps up with the fall.
- **Effects** (`features/babonk/sounds-data.js`): bricks are hard and dry; foes pop; stars chime. They sit over the music (music bus at half level, after the effects' compressor).
- **Ambience**: none. The music is the bed; the screen is never silent while it plays.

## The tracks

One home key (D), one motif (the hook's first bar, `1:0.5 5:0.5 8 7:0.5 5:0.5 3`), varied per track. Specs in `tools/music/songs.js`.

| Track | Plays on | Keeps | Changes |
|---|---|---|---|
| `title` | the title | the hook, D dorian | 132 bpm, no drums, a 50% pulse over a pad; jumping in is the step up |
| `well1` | well 1 | the hook stated in full | 144 bpm, the bare NES: two pulses, triangle bass, NES kit |
| `well2` | well 2 | the motif, sequenced | D minor, 156 bpm, PWM lead, pulse bass, dance groove |
| `well3` | well 3 | the motif, fragmented and inverted | D phrygian (flat 2nd), 168 bpm, DPCM bass and kit, a tolling pedal |
| `rest` | between wells | the motif's steps | F major (the relative), a 3/4 music box at 84 bpm, no drums |
| `over` | game over (once) | the hook's fall | D harmonic minor, slow, slowing to a stop |
| `win` | the run won (once) | the bounce | D major, 150 bpm, ends an octave up |

## What the music follows

| State | Player feels | Music | Into the next |
|---|---|---|---|
| Title | ready | `title` | Start: `well1` on the next bar |
| Well 1–3 | flow, then pressure | `well1`, `well2`, `well3`; keeps on under the pause menu | the bottom: `rest` |
| Rest | relief | `rest` | go on: the next well |
| Game over / won | loss / triumph | `over` / `win` once, then quiet | back to the title |

The screen's mode picks the track (`musicFor` in `features/babonk/index.js`); `audio/music.js` changes on the next bar line. Pause has Music on/off apart from Sound, which mutes everything.
