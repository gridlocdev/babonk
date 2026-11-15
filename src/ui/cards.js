// A full-screen layer of HTML cards and buttons you can move through with keys, a gamepad or a finger: the settings
// screen. menu() takes rows of elements with { el, pick?, adjust?(dir) }; update() each step handles navigation
// (ui/menu-nav.js). The pause menu and the initials are drawn on the game's screen instead (ui/pixel-menu.js).
import { menuNav } from './menu-nav.js';

const screen = /** @type {HTMLElement} */ (document.getElementById('screen'));

// the focus is drawn, not the browser's: a focused button would also click itself on Enter
const nav = menuNav(paint);
function paint()
{
    const rows = nav.rows;
    if (!rows) return;
    rows.forEach((row, y)=> row.forEach((it, x)=> it.el.classList.toggle('focus', y === nav.ry && x === nav.rx)));
    nav.focus?.el.scrollIntoView?.({ block: 'nearest' });
}

export const cards = {
    get open() { return !!nav.rows; },
    /** the focused row's index */
    get focusRow() { return nav.ry; },
    root: screen,
    // html is written into the layer first; rows name its elements
    show(html, { dim = true, cls = '' } = {})
    {
        screen.innerHTML = html;
        screen.className = `${dim ? 'dim' : ''} ${cls}`;
        screen.hidden = false;
        nav.clear();
    },
    // focus: [row, col]; back(), move(item, how) and tick() as in ui/menu-nav.js
    menu(list, opts = {})
    {
        if (!nav.set(list.map((r)=> r.filter((it)=> it?.el)), opts)) return;
        nav.rows.forEach((row, y)=> row.forEach((it, x)=>
        {
            it.el.addEventListener('pointerenter', (e)=> { if (e.pointerType === 'mouse') nav.take(y, x); });
            it.el.addEventListener('pointerdown', ()=> nav.take(y, x, ''));
            // a click made by a key (detail 0) is the keyboard's confirm, which update() already handles
            it.el.addEventListener('click', (e)=> { if (!nav.rows || e.detail === 0) return; nav.take(y, x, ''); it.pick?.(); });
        }));
    },
    repaint: paint,
    hide() { screen.hidden = true; screen.replaceChildren(); nav.clear(); },
    update() { nav.update(); },
};
