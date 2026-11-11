# Babonk

Fall down three wells in big three-colour pixels. Bonk in midair to home in on a foe, or dash, and bounce off foes, walls and floors to stay up. Break foes and crates in a chain for stars and points, rest between wells, and put your initials in the top ten.

## Run it

It's plain ES modules with nothing to build, but they don't load from `file://`, so serve the folder:

```bash
just serve
```

Then open http://localhost:8141. (`just play` serves it and opens the browser; `just lan` serves it to a phone on the same Wi-Fi.)

## Controls

| | Keyboard and mouse | Gamepad | Touch |
|---|---|---|---|
| Move, aim a dash | WASD or arrows | Left stick or d-pad | Stick |
| Jump (on the ground), bonk (in the air) | Space, J, Shift or the mouse button | A or right trigger | BONK |
| Start, go on | Space or Enter | A | BONK |
| Pause | Esc or P | Start | Pause button |
| Menus | Arrows, Space or Enter, Esc to go back | D-pad or stick, A, B | Tap |

## Credits

The music is chiptune composed and rendered with [music-generator](https://github.com/gridlocdev/music-generator), on its chip instruments, which are made in code.

## For developers

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
