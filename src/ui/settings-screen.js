// The settings screen (docs/settings.md), drawn on the 320 × 180 screen in the pixel font: a tab per group (Audio,
// Controls, Display, Accessibility), a row per setting with its label on the left and its value on the right, a help
// line, and Reset to defaults and Back at the end of each tab.
//
// Up and down move between rows; left and right change the focused value, one step a press, repeating while held;
// confirm flips a toggle. A range also has a bar the mouse can drag and a finger slide. Q and E, or LB and RB, switch
// tabs, as does moving along the tab row. Changes apply at once; Back saves and goes back to what opened the screen.
// Call pixelMenu.update() each step and pixelMenu.draw(g) after the frame while it shows.
import { MOBILE } from '../platform/engine.js';
import { input } from '../platform/input.js';
import { formatSetting } from '../lib/settings.js';
import {
    SCHEMA, changeSetting, resetSettingsGroup, saveSettings, setting, settingTabs, stepSettingBy,
} from '../game/settings.js';
import { banner, button, dim, look, panel, pixelMenu } from './pixel-menu.js';
import { pixelCentre, pixelText, pixelWidth } from './pixel-text.js';

let lastTab = 0;     // the tab the screen reopens on

// where things sit on the screen
const ROW = { x: 20, w: 280, h: 13, top: 46, pitch: 14 };
const BAR = { x: 140, w: 100, h: 5 };
const TABS_Y = 28, HELP_W = 288;
const textY = (it)=> it.y + Math.round(it.h / 2) - 4;

// a line of words broken to fit a width, at size 10
function wrap(text, width)
{
    const lines = [];
    let line = '';
    for (const word of text.split(' '))
    {
        const next = line ? `${line} ${word}` : word;
        if (line && pixelWidth(next, 10) > width) { lines.push(line); line = word; }
        else line = next;
    }
    if (line) lines.push(line);
    return lines;
}

/**
 * @param {{ close: () => void, sound: (what: 'move' | 'pick' | 'effects') => void }} o
 * close goes back to whatever opened it; sound plays a menu sound, and 'effects' a sample at the new effects level
 */
export function showSettings({ close, sound })
{
    const tabs = settingTabs();
    let tab = Math.min(lastTab, tabs.length - 1);
    let armed = false;     // Reset to defaults was pressed once and waits for a second press
    let help = '';
    let first = true;

    function render(focus = [1, 0])
    {
        lastTab = tab;
        armed = false;
        const { group, rows } = tabs[tab];
        const keys = MOBILE ? ['', ''] : input.hasPad ? ['LB', 'RB'] : ['Q', 'E'];

        // the tab row, centred, with the keys that switch tabs either side
        const labels = tabs.map((t)=> t.label.toUpperCase());
        const widths = labels.map((l)=> pixelWidth(l, 10) + 8);
        const keyW = keys.map((k)=> k ? pixelWidth(k, 10) + 6 : 0);
        const total = widths.reduce((a, b)=> a + b, 0) + (labels.length - 1) * 2 + (keyW[0] ? keyW[0] + 4 : 0) + (keyW[1] ? keyW[1] + 4 : 0);
        let x = Math.round(160 - total / 2) + (keyW[0] ? keyW[0] + 4 : 0);
        const tabItems = labels.map((label, i)=>
        {
            const it = { x, y: TABS_Y, w: widths[i], h: 13, label, tab: i, pick: ()=> switchTab(i, true) };
            x += widths[i] + 2;
            return it;
        });

        const rowAt = (i)=> ({ x: ROW.x, y: ROW.top + i * ROW.pitch, w: ROW.w, h: ROW.h });
        const helpFor = (it)=>
        {
            if (it?.entry)
            {
                const e = it.entry, opt = e.type === 'choice' ? e.options.find((o)=> o.value === setting(e.id)) : null;
                return (opt?.help ?? e.help ?? '') + (e.reload ? ' Takes effect after a restart.' : '');
            }
            return it?.help ?? '';
        };
        const showHelp = (it)=> { help = helpFor(it); };

        // a change heard and seen at once; volumes play a sample through the new mix (music speaks for itself)
        const changed = (id, did)=>
        {
            if (!did) return;
            if (id === 'audio.sfx' || id === 'audio.master') sound('effects');
            else if (!id.startsWith('audio.music')) sound('move');
            showHelp(items.find((i)=> i.entry?.id === id));
        };

        const items = [
            ...rows.map((e, i)=> ({
                ...rowAt(i),
                entry: e,
                adjust: (d)=> changed(e.id, stepSettingBy(e.id, d)),
                pick: e.type === 'range' ? null : ()=> changed(e.id, stepSettingBy(e.id, 1)),
                // the bar: a press on it (or just beside it) sets the value under the pointer, a drag follows, letting go saves
                drag: e.type !== 'range' ? null : (px, phase)=>
                {
                    if (phase === 'down' && (px < BAR.x - 6 || px > BAR.x + BAR.w + 6)) return false;
                    if (phase === 'up') { saveSettings(); return true; }
                    const f = Math.max(0, Math.min(1, (px - BAR.x) / BAR.w));
                    changed(e.id, changeSetting(e.id, e.min + f * (e.max - e.min)));
                    return true;
                },
            })),
        ];
        if (group === 'display' && document.fullscreenEnabled) items.push({
            ...rowAt(items.length),
            label: 'Full screen',
            value: ()=> document.fullscreenElement ? 'On' : 'Off',
            help: 'Fill the screen. The browser leaves full screen with Esc.',
            pick()
            {
                sound('pick');
                if (document.fullscreenElement) document.exitFullscreen?.().catch(()=> {});
                else document.documentElement.requestFullscreen?.().catch(()=> {});
            },
        });
        const button2 = (i, label, more)=> ({ ...rowAt(i), x: 160 - 60, w: 120, label, ...more });
        const reset = button2(items.length, 'RESET TO DEFAULTS', {
            help: `Put every ${tabs[tab].label} setting back.`,
            pick()
            {
                if (!armed) { armed = true; reset.label = 'PRESS AGAIN'; sound('move'); return; }
                disarm();
                resetSettingsGroup(group);
                saveSettings();
                sound('pick');
            },
        });
        items.push(reset);
        items.push(button2(items.length, 'BACK', { pick: back }));
        const disarm = ()=> { armed = false; reset.label = 'RESET TO DEFAULTS'; };

        pixelMenu.show([tabItems, ...items.map((it)=> [it])], (g, t)=>
        {
            const f = pixelMenu.focus;
            dim(g);
            panel(g, 8, 2, 304, 176);
            banner(g, 'SETTINGS', 160, 6, 20, t);
            // tabs: the open one in ink and underlined, the others in the accent; the focused one filled
            if (keyW[0]) keyHint(g, keys[0], tabItems[0].x - keyW[0] - 4, keyW[0]);
            if (keyW[1]) { const last = tabItems[tabItems.length - 1]; keyHint(g, keys[1], last.x + last.w + 4, keyW[1]); }
            for (const it of tabItems)
            {
                const on = f === it, open = it.tab === tab;
                if (on) { g.fillStyle = look.ink; g.fillRect(it.x, it.y, it.w, it.h); }
                else if (open) { g.fillStyle = look.ink; g.fillRect(it.x + 2, it.y + it.h - 1, it.w - 4, 1); }
                pixelCentre(g, it.label, it.x + it.w / 2, textY(it), 10, on ? look.ground : open ? look.ink : look.accent);
            }
            for (const it of items)
            {
                if (it === reset || it.pick === back) { button(g, it, it.label, f === it); continue; }
                drawRow(g, it, f === it);
            }
            wrap(help, HELP_W).slice(0, 2).forEach((line, i)=> pixelCentre(g, line, 160, 154 + i * 11, 10, look.ink));
        }, {
            focus,
            again: !first,
            back,
            move(it, how)
            {
                disarm();
                // moving along the tab row switches tabs; a mouse passing over one doesn't, a click does
                if (it.tab !== undefined && it.tab !== tab && how === 'nav') { switchTab(it.tab, false); return; }
                sound('move');
                showHelp(it);
            },
            tick()
            {
                const d = input.tabPrev() ? -1 : input.tabNext() ? 1 : 0;
                if (!d) return false;
                const next = Math.max(0, Math.min(tabs.length - 1, tab + d));
                if (next !== tab) switchTab(next, true);
                return true;
            },
        });
        first = false;
        // the row that has focus explains itself; on the tab row, nothing
        showHelp(focus[0] > 0 ? items[focus[0] - 1] : null);
    }

    // a new tab keeps the focus where it was: on the tab row, or on the new tab's first row
    function switchTab(i, keepRow)
    {
        if (i === tab) return;
        tab = i;
        sound('move');
        render(keepRow ? [pixelMenu.focusRow > 0 ? 1 : 0, pixelMenu.focusRow > 0 ? 0 : tab] : [0, tab]);
    }

    function back()
    {
        pixelMenu.hide();
        saveSettings();
        sound('move');
        close();
    }

    render([1, 0]);
}

// a setting's row: its label, a bar for a range (with < and > when focused, as left and right move it), its value
function drawRow(g, it, focused)
{
    const ink = focused ? look.ground : look.ink, y = textY(it);
    if (focused) { g.fillStyle = look.ink; g.fillRect(it.x, it.y, it.w, it.h); }
    const e = it.entry;
    pixelText(g, e ? e.label : it.label, it.x + 5, y, 10, ink);
    const value = e ? formatSetting(e, setting(e.id)) : it.value();
    pixelText(g, value, it.x + it.w - 5 - pixelWidth(value, 10), y, 10, ink);
    if (e?.type !== 'range') return;
    const by = it.y + Math.round((it.h - BAR.h) / 2), v = setting(e.id);
    g.fillStyle = ink;
    g.fillRect(BAR.x, by, BAR.w, 1); g.fillRect(BAR.x, by + BAR.h - 1, BAR.w, 1);
    g.fillRect(BAR.x, by, 1, BAR.h); g.fillRect(BAR.x + BAR.w - 1, by, 1, BAR.h);
    g.fillStyle = look.accent;
    g.fillRect(BAR.x + 1, by + 1, Math.round((v - e.min) / (e.max - e.min) * (BAR.w - 2)), BAR.h - 2);
    if (focused)
    {
        pixelText(g, '<', BAR.x - 6, y, 10, ink);
        pixelText(g, '>', BAR.x + BAR.w + 3, y, 10, ink);
    }
}

// the key that switches tabs, in a thin box
function keyHint(g, key, x, w)
{
    g.fillStyle = look.accent;
    g.fillRect(x, TABS_Y + 1, w, 1); g.fillRect(x, TABS_Y + 11, w, 1);
    g.fillRect(x, TABS_Y + 1, 1, 11); g.fillRect(x + w - 1, TABS_Y + 1, 1, 11);
    pixelCentre(g, key, x + w / 2, TABS_Y + 2, 10, look.accent);
}
