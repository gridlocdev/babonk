// The one file that sets up the drawing surface, reads the URL and runs the loop. The game draws on a small 2D canvas
// that is shown scaled up by the largest whole number that fits the window, in square device pixels, centred.

// a phone or tablet: a touch screen whose main pointer is a finger
export const MOBILE = matchMedia('(pointer: coarse)').matches;

// URL flags, read once here; other files import FLAGS and never read the URL
const params = new URLSearchParams(location.search);
export const FLAGS = { debug: params.has('debug'), mute: params.has('mute'), params };

const canvas = document.createElement('canvas');
canvas.id = 'game';
document.body.prepend(canvas);

// the scale is whole in device pixels and the corner sits on a device pixel, so every game pixel is the same size and
// edge-sharp; a window smaller than the screen shrinks it to fit, blurred, rather than cut it off
function fit()
{
    const dpr = devicePixelRatio || 1, W = innerWidth * dpr, H = innerHeight * dpr;
    let k = Math.floor(Math.min(W / canvas.width, H / canvas.height));
    if (k < 1) k = Math.min(W / canvas.width, H / canvas.height);
    const w = canvas.width * k, h = canvas.height * k;
    canvas.style.width = `${w / dpr}px`;
    canvas.style.height = `${h / dpr}px`;
    canvas.style.left = `${Math.floor((W - w) / 2) / dpr}px`;
    canvas.style.top = `${Math.floor((H - h) / 2) / dpr}px`;
}
addEventListener('resize', fit);

// the game's screen, w × h pixels: returns its 2D context
export function pixelScreen(w, h)
{
    canvas.width = w; canvas.height = h;
    fit();
    const g = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d', { willReadFrequently: FLAGS.debug }));
    g.imageSmoothingEnabled = false;
    return g;
}

// the whole game's clock: ?debug slow motion and fast forward change its speed
export const clock = { speed: 1, now: 0 };

const STEP = 1 / 60;
// update(dt) runs at a fixed 60 Hz; draw(dt) once per display frame, with real time
export function startLoop(update, draw)
{
    let last = performance.now(), bank = 0;
    const frame = (now)=>
    {
        requestAnimationFrame(frame);
        const dt = Math.min(.1, (now - last) / 1000);
        last = now;
        clock.now += dt;
        bank += dt * clock.speed;
        for (let n = 0; bank >= STEP && n < 12; n++) { bank -= STEP; update(STEP); }
        if (bank > STEP * 4) bank = 0;
        draw(dt);
    };
    requestAnimationFrame(frame);
}
