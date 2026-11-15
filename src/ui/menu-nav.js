// Moving a focus through rows of menu items with keys or a pad: one step per press, repeating while a direction is
// held. An item is { pick?(), adjust?(dir) }; one with adjust is a slider, so left and right change it instead of
// moving the focus. Confirm picks, Back calls back. ui/cards.js (HTML) and ui/pixel-menu.js (drawn on the screen)
// each keep one and draw the focus their own way; moved() runs whenever the focus changes.
import { input } from '../platform/input.js';

const REPEAT_DELAY = .38, REPEAT_EVERY = .07;   // seconds: holding a direction repeats it

export function menuNav(moved = ()=> {})
{
    let rows = null, ry = 0, rx = 0, onBack = null, onMove = null, onTick = null;
    let held = '', heldFor = 0, repeatAt = 0, lastTime = 0;

    function go(dir)
    {
        const row = rows[ry], it = row[rx];
        if ((dir === 'left' || dir === 'right') && it.adjust) { it.adjust(dir === 'left' ? -1 : 1); return; }
        if (dir === 'left' && rx > 0) rx--;
        else if (dir === 'right' && rx < row.length - 1) rx++;
        else if (dir === 'up' && ry > 0) { ry--; rx = Math.min(rx, rows[ry].length - 1); }
        else if (dir === 'down' && ry < rows.length - 1) { ry++; rx = Math.min(rx, rows[ry].length - 1); }
        else return;
        moved();
        onMove?.(rows[ry][rx], 'nav');
    }

    return {
        get rows() { return rows; },
        get ry() { return ry; },
        get rx() { return rx; },
        /** the focused item */
        get focus() { return rows?.[ry]?.[rx] ?? null; },
        // rows of items (empty rows dropped); focus: [row, col]. tick() runs first each step and returns true when it
        // used the step (a screen's own keys, like switching tabs). Returns false when there is nothing to move through.
        set(list, { focus = [0, 0], back = null, move = null, tick = null } = {})
        {
            rows = list.map((r)=> r.filter(Boolean)).filter((r)=> r.length);
            if (!rows.length) { rows = null; return false; }
            ry = Math.max(0, Math.min(focus[0], rows.length - 1));
            rx = Math.max(0, Math.min(focus[1], rows[ry].length - 1));
            onBack = back; onMove = move; onTick = tick;
            // a direction already held when the menu opens waits for a fresh press
            held = input.navHeld(); heldFor = 0; repeatAt = Infinity; lastTime = performance.now();
            moved();
            return true;
        },
        clear() { rows = null; },
        // a pointer on the item at row y, column x focuses it; true when the focus moved
        take(y, x, how = 'pointer')
        {
            if (!rows || (ry === y && rx === x)) return false;
            ry = y; rx = x;
            moved();
            if (how) onMove?.(rows[ry][rx], how);
            return true;
        },
        update()
        {
            if (!rows) return;
            const t = performance.now(), dt = Math.min(.1, (t - lastTime) / 1000);
            lastTime = t;
            if (onTick?.()) return;
            if (!rows) return;
            const now = input.navHeld();
            const dir = input.nav();
            if (dir) { held = dir; heldFor = 0; repeatAt = REPEAT_DELAY; go(dir); return; }
            if (now && now === held)
            {
                heldFor += dt;
                if (heldFor >= repeatAt) { repeatAt += REPEAT_EVERY; go(now); return; }
            }
            else { held = now; heldFor = 0; repeatAt = now ? Infinity : REPEAT_DELAY; }
            if (input.confirm()) rows[ry][rx].pick?.();
            else if (input.back() && onBack) onBack();
        },
    };
}
