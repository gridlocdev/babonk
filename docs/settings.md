# Settings

Babonk uses the standard settings table in `src/lib/settings.js`: the same ids, groups, ranges, defaults, save format and screen as the other games. Its own changes are made in `src/game/settings.js` with `defineSettings`, never by editing the table.

## Babonk's changes

Removed, because Babonk can't apply them yet:

- `difficulty.preset`: no presets yet (the game has one set of numbers). With no rows, Difficulty has no tab.
- `controls.stickSensitivity`: the stick only moves; there is no look or cursor.
- `controls.holdActions`: the one button's hold (the jump cut) has no sensible toggle.
- `controls.vibration`: no rumble yet.
- `display.renderScale`: the screen is a fixed 320 × 180 canvas at a whole-number scale.
- `a11y.textScale`, `a11y.plainFont`, `a11y.highContrast`: canvas text is the pixel font at one size, in a three-colour palette.
- `a11y.subtitles`, `a11y.captions`: no dialogue, and every sound has something to see with it.

Tags: `gamepad`. Nothing changed or added. Full screen is a button row in Display (a browser only allows it from a press).

## The table

Ranges are `min–max, step`.

| Id | Type | Range or options | Default | Applied in |
| --- | --- | --- | --- | --- |
| `audio.master` | range | 0–1, 0.05 | 0.8 | master gain, `audio/sfx.js` (squared, so the slider sounds even) |
| `audio.music` | range | 0–1, 0.05 | 0.7 | music bus, `audio/music.js` |
| `audio.sfx` | range | 0–1, 0.05 | 0.8 | effects bus, `audio/sfx.js` |
| `audio.mono` | toggle | | off | master folded to one channel |
| `audio.background` | toggle | | off | a hidden tab keeps its sound |
| `controls.deadzone` | range | 0.05–0.4, 0.05 | 0.15 | the stick read in `platform/input.js` |
| `display.quality` | choice | auto, low, medium, high | auto | `platform/graphics.js`: fewer flying bits and no dash afterimages lower down; Automatic starts on high and steps down while frames run under 40 a second |
| `display.brightness` | range | 0.5–1.5, 0.05 | 1 | a `brightness()` filter on the canvas, `platform/engine.js` |
| `display.showFps` | toggle | | off | a corner readout, `ui/fps.js` |
| `a11y.shake` | range | 0–1, 0.25 | 1 (0 with reduced motion) | scales every shake in `render/view.js` |
| `a11y.reduceFlashing` | toggle | | off (on with reduced motion) | drops the whole-well flash when hurt |
| `a11y.gameSpeed` | range | 0.5–1, 0.1 | 1 | scales the run's time step; menus, music and sounds keep their pace |

## Save and loading

- Settings are a flat object of id to value. Only values that differ from the defaults are saved, in `core.settings`, so a setting added later gets its default and a better default reaches players who never touched it.
- Reduced motion and more contrast are read from the system on load; a choice the player made wins.
- Never rename an id in place: add the old id to `RENAMED` in `lib/settings.js`.
- `game/settings.js` owns the live values: `loadSettings()` at boot, `setting(id)` to read, and `settings:changed` { id, value } so audio, input and the screen apply their parts. Changes apply at once; the save is written when the screen closes, a bar is let go, or the page is hidden.
- Old saves: the Sound and Music switches, and the 0–10 volume steps before this table, are carried into `core.settings` by `game/state.js`.

## The settings screen

- Tabs in order: Audio, Controls, Display, Accessibility. Q and E, or LB and RB, switch tabs, as does moving along the tab row; a mouse click on a tab too.
- One row per setting: label left, value right (80%, 1.5×, On). Up and down move; left and right change the value one step, repeating while held; confirm flips a toggle. A range has a bar the mouse can drag and a finger slide.
- The help line under the list explains the focused row.
- Reset to defaults ends each tab and resets only that tab, after a second press.
- Back saves and returns to what opened it. No Apply button.
- It opens from the pause menu, and from the title with Esc, the pad's menu button or the touch pause button.

## The pause menu

Continue (focused), Settings, Restart, Quit to title. Restart and Quit lose the run, so each asks first with No focused. The music drops under the menu and comes back with play. Leaving the tab mid-run opens it.
