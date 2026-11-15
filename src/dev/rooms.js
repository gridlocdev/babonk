// The gym and the museum in the browser: ?debug&room=gym[&case=<row>] and ?debug&room=museum[&exhibit=<id>].
// The current trial plays its script on a loop, drawn by the game's own renderer with labels in the well and a sign
// beside it. Touch the stick or BONK and you play the try yourself until it ends.
// Q / E (shoulder buttons) pick the case or exhibit; pause (Esc, P, Start, the pause button) the next gym row.
import { FLAGS } from '../platform/engine.js';
import { input } from '../platform/input.js';
import { sfx } from '../audio/sfx.js';
import { touch } from '../ui/touch.js';
import { pixelText, pixelWidth } from '../ui/pixel-text.js';
import { TILE } from '../world/wells-data.js';
import { PALETTE } from '../render/sprites-data.js';
import { render } from '../render/view.js';
import { gymRows } from './gym.js';
import { exhibits } from './museum.js';
import { STEP, begin, tick } from './scene.js';

const BAND = { easy: ['OK', PALETTE.W], hard: ['HARD', PALETTE.O], no: ['NO', PALETTE.O] };
const HOLD = 1.2;       // seconds a finished try stays on screen before it starts again

export function roomSystem(kind, features)
{
    const gym = kind === 'gym';
    // a gym row is a list of cases; the museum is one list of exhibits, each its own row of one
    /** @type {any[]} */
    const rows = gym ? gymRows(features) : exhibits(features).map((e)=> ({ ...e, cases: [e] }));
    const want = FLAGS.params.get(gym ? 'case' : 'exhibit');
    let row = Math.max(0, rows.findIndex((r)=> r.id === want)), pick = 0, tr, after = 0, mine = false, acc = 0;

    const sign = document.createElement('div');
    sign.id = 'room';
    document.body.append(sign);
    touch.show('hold');

    const current = ()=> rows[row].cases[pick];
    function restart()
    {
        tr = begin(current(), rows[row].setup);
        after = 0; mine = false; acc = 0;
        showSign();
    }
    function showSign()
    {
        const r = rows[row], e = /** @type {any} */ (r);
        const list = gym ? r.cases.map((c, i)=> `<li${i === pick ? ' class="on"' : ''}>${c.name} <b class="${c.band}">${BAND[c.band][0]}</b></li>`).join('') : '';
        sign.innerHTML = `<h2>${gym ? 'GYM' : 'MUSEUM'} · ${r.title}</h2>`
            + (e.wrong ? `<p class="wrong">WRONG ON PURPOSE: ${e.wrong}</p>` : '')
            + `<p>${r.text}</p>${list ? `<ul>${list}</ul>` : ''}`
            + `<p class="file">${r.file}</p>`
            + `<p class="keys">Q / E ${gym ? 'case' : 'exhibit'} · ${gym ? 'Esc next row · ' : ''}play it yourself any time</p>`;
    }
    restart();

    return {
        id: 'room',
        update(dt)
        {
            const n = rows[row].cases.length;
            if (gym && input.pause()) { row = (row + 1) % rows.length; pick = 0; restart(); return; }
            if (input.tabNext() || input.tabPrev())
            {
                const d = input.tabNext() ? 1 : -1;
                if (gym) pick = (pick + d + n) % n;
                else row = (row + d + rows.length) % rows.length;
                restart();
                return;
            }
            const m = input.move();
            if (Math.abs(m.x) > .2 || Math.abs(m.y) > .2 || input.holdPressed()) mine = true;
            if (tr.over) { if ((after += dt) > HOLD) restart(); return; }
            acc = Math.min(acc + dt, STEP * 4);
            let pressed = input.holdPressed();
            while (acc >= STEP && !tr.over)
            {
                tick(tr, current(), mine ? { x: m.x, y: m.y, held: input.hold(), pressed } : undefined);
                pressed = false;
                acc -= STEP;
            }
            for (const e of tr.w.sfx) sfx.play(e.id, 1, e.pitch);
            tr.w.sfx.length = 0;
        },
        draw(dt)
        {
            render(tr.w, { screen: 'play', hi: 0, overlay: labels }, dt);
        },
    };

    // in the well: each case's value where it is, bone if easy, orange if hard, struck through if it can't be done;
    // the one playing gets its band's word and a marker, and the result once it's over
    function labels(g, ox, oy)
    {
        if (gym) rows[row].cases.forEach((c, i)=>
        {
            const x = ox + c.at[0] * TILE, y = oy + c.at[1] * TILE, [word, colour] = BAND[c.band];
            const text = `${c.value}`;
            pixelText(g, text, x, y, 10, colour);
            if (i === pick) pixelText(g, word, x, y - 20, 10, colour);
            if (c.band === 'no') { g.fillStyle = colour; g.fillRect(x - 1, y + 4, pixelWidth(text, 10) + 2, 1); }
            if (i === pick) pixelText(g, 'v', x, y - 10, 10, PALETTE.O);
        });
        if (tr.over) pixelText(g, tr.ok ? 'PASS' : 'FAIL', 8, 70, 10, tr.ok ? PALETTE.W : PALETTE.O);     // in the HUD, under BONK
    }
}
