// The settings card: Master, Music and Effects volume sliders, Reset to defaults and Back.
// Sliders move with left and right (held to repeat), a click or drag along the bar, or a finger.
// Every change is heard at once and saved at once (game/settings.js).
import { STEPS, VOLUME_DEFAULTS } from '../lib/volume.js';
import { settings } from '../game/settings.js';
import { cards } from './cards.js';

const SLIDERS = [['master', 'Master'], ['music', 'Music'], ['effects', 'Effects']];

/**
 * @param {{ close: () => void, sound: (what: 'move' | 'pick' | 'effects') => void, color?: string }} o
 * close goes back to whatever opened it; sound plays a menu sound, and 'effects' a sample at the new effects level
 */
export function showSettings({ close, sound, color = '' })
{
    cards.show(`
        <div class="banner" ${color ? `style="color:${color}"` : ''}>SETTINGS</div>
        <div class="col settings">
            ${SLIDERS.map(([key, label])=> `
            <div class="btn slider" id="v-${key}" role="slider" aria-label="${label} volume"
                 aria-valuemin="0" aria-valuemax="${STEPS}">
                <span class="s-label">${label}</span>
                <span class="s-track"><i></i></span>
                <span class="s-num"></span>
            </div>`).join('')}
            <button class="btn" id="b-reset">Reset to defaults</button>
            <button class="btn" id="b-back">Back</button>
        </div>
    `);
    const root = cards.root;
    const el = (id)=> /** @type {HTMLElement} */ (root.querySelector(id));

    function paintSlider(key)
    {
        const v = settings.volume[key], s = el(`#v-${key}`);
        s.setAttribute('aria-valuenow', String(v));
        s.setAttribute('aria-valuetext', v ? `${v * 10}%` : 'off');
        /** @type {HTMLElement} */ (s.querySelector('.s-track i')).style.width = `${v / STEPS * 100}%`;
        s.querySelector('.s-num').textContent = v ? String(v * 10) : 'OFF';
        s.classList.toggle('off', !v);
    }
    const paintAll = ()=> SLIDERS.forEach(([k])=> paintSlider(k));

    function set(key, step)
    {
        const before = settings.volume[key];
        const after = settings.setVolume(key, step);
        if (after === before) return;
        paintSlider(key);
        // hear it: the effects (and the whole mix, for master) with a sample, the music speaks for itself
        if (key !== 'music') sound('effects');
    }

    // a drag along the bar sets the step under the pointer
    for (const [key] of SLIDERS)
    {
        const s = el(`#v-${key}`), track = /** @type {HTMLElement} */ (s.querySelector('.s-track'));
        let dragging = null;
        const at = (e)=>
        {
            const r = track.getBoundingClientRect();
            set(key, Math.round((e.clientX - r.left) / r.width * STEPS));
        };
        s.addEventListener('pointerdown', (e)=>
        {
            const r = track.getBoundingClientRect();
            // the bar and a little around it; a tap on the label leaves the value alone
            if (e.clientX < r.left - 12) return;
            dragging = e.pointerId;
            s.setPointerCapture(e.pointerId);
            at(e);
        });
        s.addEventListener('pointermove', (e)=> { if (e.pointerId === dragging) at(e); });
        for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) s.addEventListener(t, ()=> { dragging = null; });
    }
    paintAll();

    const back = ()=> { sound('move'); close(); };
    cards.menu([
        ...SLIDERS.map(([key])=> [{ el: el(`#v-${key}`), adjust: (d)=> set(key, settings.volume[key] + d) }]),
        [{ el: el('#b-reset'), pick()
        {
            const same = SLIDERS.every(([k])=> settings.volume[k] === VOLUME_DEFAULTS[k]);
            settings.resetVolumes();
            paintAll();
            sound(same ? 'move' : 'pick');
        } }],
        [{ el: el('#b-back'), pick: back }],
    ], { back, move: ()=> sound('move') });
}
