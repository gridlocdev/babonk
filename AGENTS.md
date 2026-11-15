## Architecture

This game follows the layered, feature-folder layout in `docs/ARCHITECTURE.md`. Before adding or moving code, read its core sections (the intro, Layout, Rules and Checking), then only the section for the system you're changing. In short:

- `lib → platform → game → (world, player, render, ui, audio) → features → main.js`; imports only point down that chain.
- A new feature goes in `src/features/<name>/` and is registered in `src/features/index.js`. Don't add top-level `src/*.js` files, and don't edit `main.js` for features.
- Features don't import each other; use `game/events.js` or a registry.
- Each feature owns its save slice and its `*-data.js` content.
- `src/platform/engine.js` is the only file that sets up the drawing surface, reads the URL and runs the loop; other files import from there.
- `lib/` and `*-data.js` files import no engine or DOM code and have tests in `test/`.
- The current stage is Release (1.0 shipped as v1.0.0 to v1.0.2): `docs/plans/5-release.md` (change this line when the stage changes). Pending work (what's for the user, Claude's recommendations, follow-ups) goes there, and ideas for after 1.0 into `docs/plans/after-1.0.md`, not into other docs. What the game is, as decided, is in `docs/DESIGN.md`.
- To answer a question about how the game plays, look at the dev rooms first (`?debug&room=gym`, `museum`, `zoo`; `docs/ARCHITECTURE.md#dev-rooms`), and update a room in the same change as what it shows.
- After changes run `just check` (syntax, layer rules via `tools/coupling-report.mjs`, and types via `jsconfig.json`) and `just test`.
