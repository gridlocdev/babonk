# Getting started

You can play Babonk online, or serve it from a copy of the code.

## What you need

- A current desktop or phone browser: Firefox, Chrome, Safari or Edge.
- A keyboard, a mouse, a gamepad or a touch screen.
- To run it from source: Python 3 and, optionally, [just](https://github.com/casey/just).

## Play online

Open [gridloc.dev/games/babonk](https://gridloc.dev/games/babonk/). On a phone the touch controls show on their own.

## Run it from source

The game is plain ES modules with nothing to build, but browsers don't load modules from `file://`, so serve the folder:

```bash
just play   # serve on http://localhost:8141 and open it in your browser
just serve  # serve only; then open http://localhost:8141
```

Without just: `python3 -m http.server 8141`.

## Play on a phone

```bash
just lan   # serve to your Wi-Fi and print the address to open on the phone
```

The phone must be on the same Wi-Fi network as the computer.

## First run

The game opens on the title. Press `Space`, `Enter`, gamepad A or **BONK** to start the first well. Sound starts with your first key or tap. Press `Esc` on the title to open the settings. Your top ten, your last initials and your settings are saved in the browser.
