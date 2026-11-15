// A do-nothing browser, enough for the game's modules to load in node: every DOM call returns another do-nothing.
// Import it first in a test that loads a feature, so the screen, input and audio modules can load; nothing draws.
const noop = new Proxy(function () {}, { get: (t, k)=> k === Symbol.toPrimitive ? ()=> 0 : noop, apply: ()=> noop, construct: ()=> noop, set: ()=> true });
globalThis.matchMedia = ()=> ({ matches: false });
globalThis.location = { search: '' };
globalThis.addEventListener = ()=> {};
globalThis.devicePixelRatio = 1; globalThis.innerWidth = 640; globalThis.innerHeight = 360;
globalThis.document = noop;
globalThis.localStorage = { getItem: ()=> null, setItem() {} };
globalThis.requestAnimationFrame = ()=> {};
globalThis.navigator ??= {};
