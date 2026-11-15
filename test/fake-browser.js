// A do-nothing browser, enough for the game's modules to load in node: every DOM call returns another do-nothing.
// Import it first in a test that loads a feature, so the screen, input and audio modules can load; nothing draws.
// Window listeners are kept, so key() can press a key the way the player would.
const noop = new Proxy(function () {}, { get: (t, k)=> k === Symbol.toPrimitive ? ()=> 0 : noop, apply: ()=> noop, construct: ()=> noop, set: ()=> true });
const listeners = {};
globalThis.matchMedia = ()=> ({ matches: false });
globalThis.location = { search: '' };
globalThis.addEventListener = (type, fn)=> { (listeners[type] ??= []).push(fn); };
globalThis.devicePixelRatio = 1; globalThis.innerWidth = 640; globalThis.innerHeight = 360;
globalThis.document = noop;
globalThis.localStorage = { getItem: ()=> null, setItem() {}, removeItem() {} };
globalThis.requestAnimationFrame = ()=> {};
globalThis.navigator ??= {};
globalThis.window = globalThis;

/** presses and lets go of a key (a KeyboardEvent code), as the player would between two frames */
export function key(code)
{
    const e = { code, repeat: false, preventDefault() {} };
    for (const fn of listeners.keydown ?? []) fn(e);
    for (const fn of listeners.keyup ?? []) fn(e);
}
