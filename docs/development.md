# Development

Babonk is plain JavaScript ES modules on one 2D canvas, with no bundler and no runtime dependencies. The rules in `AGENTS.md` at the repository root apply to everyone working on it, and the code layout and its layer rules are in [ARCHITECTURE.md](ARCHITECTURE.md).

## Getting set up

You need Python 3 and [just](https://github.com/casey/just). Node.js runs the checks and tests.

```bash
just            # list the recipes
just serve      # serve the game on http://localhost:8141
just play       # serve the game and open it in your browser
just lan        # serve the game to your Wi-Fi, to try it on a phone
just check      # syntax-check every module, check the layer rules and type-check against jsconfig.json
just test       # run the unit tests
just dead       # list modules, exports and assets nothing uses (it only reports)
just icons      # draw the home-screen icons in icons/ from the hero sprite
just install    # install the pinned devDependencies (Playwright, Electron)
just install-bench  # install Playwright and its Firefox build, about 100 MB, once per Playwright version
just bench <runs>   # time frames in Playwright's Firefox, headless and muted
just music [path] [ids]  # render the soundtrack with music-generator
```

The game must be served over HTTP; ES modules don't load from `file://`. Without just: `python3 -m http.server 8141`.

## Checking your work

Run both after every change:

```bash
just check   # syntax, layer rules (tools/coupling-report.mjs, architecture.json) and types (jsconfig.json)
just test    # tests for lib/, *-data.js, the world and hero, and each feature through its contract
```

## Debug flags

Add `?debug` to the URL for a readout, a fixed seed and slow motion (`1`) or fast forward (`2`). `?debug&shot=bot` plays a run with a simple pilot, `?debug&shot=zoo` shows every sprite and animation, `?debug&room=gym` the movement numbers and `?debug&room=museum` each system working; `just rooms` runs them as smoke tests and screenshots them. The full list is in [ARCHITECTURE.md](ARCHITECTURE.md#debug-flags).

## Performance

`just bench` times frames in Playwright's pinned Firefox. Each argument is one run, for example:

```bash
just bench "" "debug&shot=bot" "debug&shot=zoo" --repeat 2
```

60 fps with p95 under about 18 ms is healthy. The options are in [ARCHITECTURE.md](ARCHITECTURE.md#checking).

## The soundtrack

The songs are specs in `tools/music/songs.js`; the direction is in [audio.md](audio.md). `just music` composes and renders them with music-generator's own code in a hidden Electron window, writes `music/<id>.mp3` and the generated `src/audio/tracks-data.js`. It needs ffmpeg and a music-generator checkout at `../../apps/music-generator`, or a path you pass:

```bash
just music ~/src/apps/music-generator well1 rest   # render two tracks
```

## Deploying

The game is deployed to [gridloc.dev/games/babonk](https://gridloc.dev/games/babonk/) as static files: `index.html`, `manifest.json`, `icons/`, `src/` and `music/`. Without `manifest.json` and `icons/`, a phone's Add to Home Screen shows a letter instead of the icon; after a deploy, check that `/icons/apple-touch-icon.png` loads and `/manifest.json` comes as `application/json`. A release is a `vX.Y.Z` tag on GitHub, with the version in `package.json`.
