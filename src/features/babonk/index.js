// Babonk: a pixel platformer down three wells. The rules are in sim.js, the picture in view.js; this file runs the
// title, pause menu, settings, rests between wells and the high-score table.
import { FLAGS } from '../../platform/engine.js';
import { input } from '../../platform/input.js';
import { insertScore, qualifies, topScore } from '../../lib/high-scores.js';
import { sfx } from '../../audio/sfx.js';
import { musicCutIn, setMusicArea, setMusicDuck } from '../../audio/music.js';
import { setting } from '../../game/settings.js';
import { cards } from '../../ui/cards.js';
import { showInitials } from '../../ui/initials.js';
import { letterIn, spellOut } from '../../ui/kinetic.js';
import { showSettings } from '../../ui/settings-screen.js';
import { touch } from '../../ui/touch.js';
import { CONFIG, clearBonus } from './babonk-data.js';
import { createRun, lockTarget, nextWell, step, wellCount } from './sim.js';
import { SOUNDS } from './sounds-data.js';
import { PALETTE } from './sprites-data.js';
import { pressWord, render, settingsWord } from './view.js';

const STEP = 1 / 60;

let mode = 'menu';      // menu (the title) | play | rest | paused | settings | over | initials | zoo (debug)
let settingsFrom = 'menu';  // where settings goes back to: the title or the pause menu
let modeTime = 0, acc = 0;
let run = null, save = null, ctxState = null;
let rest = { bonus: 0, healed: false }, result = { score: 0, best: false, won: false };
let bot = null;
// debug: a check view over the screen, and the zoo's frozen clock
const VIEW = FLAGS.debug ? FLAGS.params.get('view') ?? '' : '';
const ZOO_T = FLAGS.debug && FLAGS.params.has('t') ? Number(FLAGS.params.get('t')) : undefined;

// the music drops under the pause menu and its settings, and comes back with play
function setMode(m) { mode = m; modeTime = 0; setMusicDuck(m === 'paused' || m === 'settings' && settingsFrom === 'paused' ? .4 : 1); }
function controls() { touch.show('hold'); touch.holdLabel('BONK'); }

function startRun(seed = FLAGS.debug ? CONFIG.seed : (Math.random() * 2 ** 31) | 0)
{
    sfx.play('babonkJump');
    run = createRun(seed);
    acc = 0;
    setMode('play');
}

function showPause(focus = 0)
{
    setMode('paused');
    touch.show(false);
    cards.show(`
        <div class="banner" style="color:${PALETTE.O}"></div>
        <div class="col">
            <button class="btn" id="b-go">Continue</button>
            <button class="btn" id="b-settings">Settings</button>
            <button class="btn" id="b-restart">Restart</button>
            <button class="btn" id="b-menu">Quit to title</button>
        </div>
    `);
    const root = cards.root;
    letterIn(spellOut(root.querySelector('.banner'), 'PAUSED'), { stagger: 28, dur: 300 });
    const back = ()=> { sfx.play('uiMove'); cards.hide(); controls(); setMode('play'); };
    cards.menu([
        [{ el: root.querySelector('#b-go'), pick: back }],
        [{ el: root.querySelector('#b-settings'), pick: ()=> { sfx.play('uiPick'); openSettings('paused'); } }],
        [{ el: root.querySelector('#b-restart'), pick: ()=> confirm('Restart the run?', 2, ()=> { cards.hide(); controls(); startRun(); }) }],
        [{ el: root.querySelector('#b-menu'), pick: ()=> confirm('Quit to the title? This run will end.', 3, ()=> { cards.hide(); controls(); setMode('menu'); }) }],
    ], { focus: [focus, 0], back, move: ()=> sfx.play('uiMove') });
}

// Restart and Quit lose the run, so each asks first; No is focused, and No or Back returns to the pause menu
function confirm(question, from, yes)
{
    sfx.play('uiMove');
    cards.show(`
        <div class="ask">${question}</div>
        <div class="row-btns">
            <button class="btn" id="b-no">No</button>
            <button class="btn" id="b-yes">Yes</button>
        </div>
    `);
    const root = cards.root;
    const no = ()=> { sfx.play('uiMove'); showPause(from); };
    cards.menu([[
        { el: root.querySelector('#b-no'), pick: no },
        { el: root.querySelector('#b-yes'), pick: ()=> { sfx.play('uiPick'); yes(); } },
    ]], { back: no, move: ()=> sfx.play('uiMove') });
}

// settings, from the title or the pause menu; Back returns there
function openSettings(from)
{
    settingsFrom = from;
    setMode('settings');
    touch.show(false);
    showSettings({
        color: PALETTE.O,
        sound: (what)=> sfx.play(what === 'move' ? 'uiMove' : what === 'pick' ? 'uiPick' : 'babonkStar'),
        close()
        {
            if (settingsFrom === 'paused') { showPause(1); return; }
            cards.hide(); controls(); setMode('menu');
        },
    });
}

function askInitials()
{
    setMode('initials');
    touch.show(false);
    showInitials({
        start: save.lastName ?? 'AAA',
        change: ()=> sfx.play('babonkStar'),
        move: ()=> sfx.play('uiMove'),
        done(name)
        {
            save.table = insertScore(save.table, name, result.score);
            save.lastName = name;
            ctxState.write();
            sfx.play('uiPick');
            controls();
            setMode('menu');
        },
    });
}

function finish(won)
{
    result = { score: run.score, best: run.score > topScore(save.table), won };
    setMode('over');
}

function playSounds()
{
    for (const e of run.sfx) sfx.play('babonk' + e.id[0].toUpperCase() + e.id.slice(1), 1, e.pitch);
    run.sfx.length = 0;
}

// a simple pilot for screenshots: steer toward the nearest foe below, bonk when one is locked, walk off ledges
function autoPilot()
{
    const p = run.player;
    const below = run.foes.filter((f)=> f.alive && f.y > p.y - 4 && f.y < p.y + 120).sort((a, b)=> Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (p.ground)
    {
        if (!bot.dir || Math.abs(p.vx) < 1 && run.t - bot.turned > .3) { bot.dir = -(bot.dir || 1); bot.turned = run.t; }
        return { x: bot.dir, y: 0, held: false, pressed: false };
    }
    const press = p.bonk && !p.dash && (!!lockTarget(run) || (p.vy > 150 && Math.random() < .05));
    return { x: below ? Math.sign(below.x - p.x) : 0, y: 0, held: press, pressed: press };
}

function playStep(dt)
{
    if (input.pause()) { showPause(); return; }
    const m = input.move();
    const ctrl = bot ? autoPilot() : { x: m.x, y: m.y, held: input.hold(), pressed: input.holdPressed() };
    // Game speed slows the run itself; menus, music and sounds keep their pace
    acc = Math.min(acc + dt * setting('a11y.gameSpeed'), STEP * 4);
    while (acc >= STEP && run.state === 'play')
    {
        step(run, STEP, ctrl);
        ctrl.pressed = false;
        acc -= STEP;
    }
    playSounds();
    if (run.state === 'dead') finish(false);
    else if (run.state === 'clear')
    {
        if (run.well + 1 >= wellCount()) finish(true);
        else { rest = { bonus: clearBonus(run.hp), healed: run.hp < CONFIG.maxHp }; setMode('rest'); }
    }
}

const pressed = ()=> input.holdPressed() || input.confirm();

// the soundtrack follows the screen: the title, each well its own (keeping on under the pause menu), the rest between
// wells, and a one-shot for the run's end (music/, from tools/music/songs.js)
function musicFor()
{
    if (mode === 'play' || mode === 'paused' || mode === 'settings' && settingsFrom === 'paused') return `well${Math.min(run.well, 2) + 1}`;
    if (mode === 'rest') return 'rest';
    if (mode === 'over' || mode === 'initials') return result.won ? 'win' : 'over';
    return 'title';
}

export default {
    id: 'babonk',
    build({ state })
    {
        ctxState = state;
        save = state.slice('babonk', { table: [], lastName: 'AAA' });
        for (const [name, def] of Object.entries(SOUNDS)) sfx.define('babonk' + name[0].toUpperCase() + name.slice(1), def);
        run = createRun();
        // the pause button: the pause menu in play, settings on the title
        touch.onPause(()=> { if (mode === 'play') showPause(); else if (mode === 'menu') openSettings('menu'); });
        // leaving the tab mid-run pauses it, so the run doesn't go on unseen
        document.addEventListener('visibilitychange', ()=> { if (document.hidden && mode === 'play') showPause(); });
        controls();
        setMusicArea(musicFor);
        musicCutIn('over');     // the run's end interrupts the well's music at once, no wait for the bar
        musicCutIn('win');

        const start = FLAGS.debug ? FLAGS.params.get('shot') : null;
        if (start === 'zoo') { touch.show(false); setMode('zoo'); }
        else if (['play', 'bot', 'rest', 'over', 'pause'].includes(start)) startRun();
        if (start === 'pause') showPause();
        if (start === 'settings') openSettings('menu');
        if (start === 'bot') bot = { dir: 1, turned: 0 };
        if (start === 'rest') { run.state = 'clear'; rest = { bonus: clearBonus(run.hp), healed: false }; setMode('rest'); }
        if (start === 'over') { run.score = 3170; finish(false); }
    },
    update(dt)
    {
        modeTime += dt;
        if (mode === 'zoo') return;
        if (mode === 'paused' || mode === 'settings' || mode === 'initials') { cards.update(); return; }
        if (mode === 'menu')
        {
            if (modeTime < .2) return;
            if (input.pause()) openSettings('menu');
            else if (pressed()) startRun();
            return;
        }
        if (mode === 'play') { playStep(dt); return; }
        if (mode === 'rest')
        {
            if (modeTime > .8 && pressed()) { sfx.play('babonkJump'); nextWell(run); acc = 0; setMode('play'); }
            return;
        }
        if (mode === 'over' && modeTime > 1.2 && (pressed() || input.back()))
        {
            if (qualifies(save.table, result.score)) askInitials();
            else setMode('menu');
        }
    },
    draw(dt)
    {
        const word = pressWord(input.hasPad), hi = topScore(save.table);
        let ui;
        if (mode === 'menu' || mode === 'settings' && settingsFrom === 'menu') ui = { screen: 'title', prompt: word, hi, settingsWord: settingsWord(input.hasPad) };
        else if (mode === 'rest') ui = { screen: 'rest', prompt: modeTime > .8 ? word : '', info: rest, hi };
        else if (mode === 'over' || mode === 'initials') ui = { screen: 'over', prompt: mode === 'over' && modeTime > 1.2 ? word : '', info: result, hi: Math.max(hi, result.score) };
        else if (mode === 'zoo') ui = { screen: 'zoo', t: ZOO_T };
        else ui = { screen: 'play', hi };
        render(run, { ...ui, view: VIEW }, dt);
    },
    debug() { return { mode, well: run?.well, t: +(run?.t ?? 0).toFixed(1), score: run?.score, hp: run?.hp, chain: run?.chain, y: Math.round(run?.player.y ?? 0) }; },
};
