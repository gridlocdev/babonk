port := "8141"
music_generator := "../../apps/music-generator"

# list recipes
default:
    @just --list

# install the pinned Playwright, for `just bench` (the game itself needs nothing installed)
install:
    npm install

# install the pinned Playwright and its Firefox build, for `just bench` (a ~100 MB download, once per Playwright version)
install-bench:
    npm install
    npx playwright install firefox

# serve the game on localhost; ES modules don't load from file://
serve:
    python3 -m http.server {{port}}

# serve the game and open it in the default browser
play:
    #!/usr/bin/env bash
    set -euo pipefail
    python3 -m http.server {{port}} & server=$!
    trap 'kill $server' EXIT INT TERM
    until curl -sf -o /dev/null http://localhost:{{port}}/; do sleep 0.1; done
    python3 -m webbrowser http://localhost:{{port}}/
    wait $server

# no-store, so a reload on the phone always gets the latest files (Safari otherwise keeps old scripts a while)
# serve the game to the local network to try it on a phone on the same Wi-Fi; prints the address to open there
lan:
    #!/usr/bin/env bash
    set -euo pipefail
    ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | cut -d' ' -f1)
    echo "On your phone (same Wi-Fi): http://$ip:{{port}}/"
    python3 -c 'import http.server as h, sys
    class H(h.SimpleHTTPRequestHandler):
        def end_headers(self): self.send_header("Cache-Control", "no-store"); super().end_headers()
    h.ThreadingHTTPServer(("0.0.0.0", int(sys.argv[1])), H).serve_forever()' {{port}}

# syntax-check every module and check the layer rules
check:
    @for f in $(find src -name '*.js'); do node --check "$f" || exit 1; done
    node tools/coupling-report.mjs --strict
    @test -x node_modules/.bin/tsc || npm install
    node_modules/.bin/tsc -p jsconfig.json

# list modules, exports and assets nothing uses (it reports; it never deletes)
dead:
    node tools/dead-code.mjs

# e.g. just bench "" "debug&shot=bot" "debug&shot=zoo" --repeat 2  (each argument is a run; see tools/bench.mjs)
# frame rate in Playwright's pinned Firefox, headless and muted
[positional-arguments]
bench *args:
    @[ -d node_modules/playwright ] || just install-bench
    node tools/bench.mjs "$@"

# render the soundtrack (tools/music/songs.js) with music-generator into music/ and src/audio/tracks-data.js
# needs ffmpeg and a music-generator checkout; e.g. just music ~/src/apps/music-generator well1 rest
music path=music_generator *tracks:
    @[ -d node_modules/electron ] || npm install
    npx electron tools/music/render.mjs {{path}} {{tracks}}

# draw the home-screen icons in icons/ from the hero's sprite
icons:
    node tools/icons.mjs

# run the tests: lib/, *-data.js, the world and hero, and each feature through its contract
test:
    node --test
