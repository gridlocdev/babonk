// Draws the home-screen icons from the hero's sprite: icons/apple-touch-icon.png (180 px, iOS), icons/icon-192.png and
// icons/icon-512.png (manifest.json; the 512 is also the maskable one).
//
//   node tools/icons.mjs        (just icons)
//
// Each icon is full-bleed and opaque, the ground colour edge to edge with no rounded corners of its own: the phone
// rounds it, and a transparent margin showed on an iPhone as no icon at all. The hero sits inside the middle 80%, so
// Android's round masks don't cut it. The PNGs are written here, pixel by pixel, so the art stays sharp at every size
// (a resize would blur it).
import fs from 'node:fs';
import zlib from 'node:zlib';
import { PALETTE, SPRITES } from '../src/render/sprites-data.js';

const GRID = 12;                      // the icon is 12 × 12 sprite pixels
const ART = SPRITES.rise, AT = [3, 2];  // the hero rising, centred
const OUT = 'icons';

const rgb = (hex)=> [1, 3, 5].map((i)=> parseInt(hex.slice(i, i + 2), 16));

function draw(size)
{
    const px = Buffer.alloc(size * size * 3);
    const edge = (i)=> Math.round(i * size / GRID);     // cells differ by a pixel at most when size isn't a multiple
    for (let cy = 0; cy < GRID; cy++) for (let cx = 0; cx < GRID; cx++)
    {
        const ch = ART[cy - AT[1]]?.[cx - AT[0]];
        const [r, g, b] = rgb(PALETTE[ch && ch !== '.' ? ch : 'K']);
        for (let y = edge(cy); y < edge(cy + 1); y++) for (let x = edge(cx); x < edge(cx + 1); x++)
            px.set([r, g, b], (y * size + x) * 3);
    }
    return png(size, px);
}

// a truecolour PNG with no alpha
function png(size, px)
{
    const rows = Buffer.alloc((size * 3 + 1) * size);
    for (let y = 0; y < size; y++) px.copy(rows, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
    const head = Buffer.alloc(13);
    head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4);
    head[8] = 8; head[9] = 2;                       // 8 bits, RGB
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function chunk(type, data)
{
    const len = Buffer.alloc(4), crc = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type), data]);
    len.writeUInt32BE(data.length);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}
function crc32(buf)
{
    let c = ~0;
    for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; }
    return ~c >>> 0;
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]])
{
    fs.writeFileSync(`${OUT}/${name}`, draw(size));
    console.log(`wrote ${OUT}/${name} (${size} × ${size})`);
}
