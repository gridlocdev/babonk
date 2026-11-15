// A well: chunks stacked into one tile grid, asking it what's where, and moving boxes through it. Pure: no engine, so
// it's tested in node. Tiles: 0 empty, 1 block, 2 crate, 3 spikes. Columns 0 and COLS - 1 are the well's walls.
import { CHUNKS, CHUNK_ROWS, COLS, FLOOR, START, TILE, WELLS } from './wells-data.js';

export const EMPTY = 0, BLOCK = 1, CRATE = 2, SPIKES = 3;
const TILE_OF = { '#': BLOCK, x: CRATE, '^': SPIKES };
const FOE_OF = { w: 'walker', f: 'floater', s: 'spiker' };

// the chunks for well `index`: the start, n picked by tier (never the same one twice running), then the floor
export function pickChunks(index, rng)
{
    const def = WELLS[index];
    const out = [START];
    let last = null;
    for (let i = 0; i < def.chunks; i++)
    {
        const pool = CHUNKS[rng.weighted(def.tiers)];
        let c = rng.pick(pool);
        if (c === last && pool.length > 1) c = pool[(pool.indexOf(c) + 1) % pool.length];
        out.push(c);
        last = c;
    }
    out.push(FLOOR);
    return out;
}

// { rows, grid, spawns } for a stack of chunks; spawns are where the chunks place foes
export function buildWell(chunks)
{
    const rows = chunks.length * CHUNK_ROWS;
    const grid = new Uint8Array(rows * COLS);
    const spawns = [];
    chunks.forEach((chunk, ci)=>
    {
        chunk.forEach((line, r)=>
        {
            const ty = ci * CHUNK_ROWS + r;
            grid[ty * COLS] = grid[ty * COLS + COLS - 1] = BLOCK;
            for (let i = 0; i < line.length; i++)
            {
                const ch = line[i], tx = i + 1;
                if (TILE_OF[ch]) grid[ty * COLS + tx] = TILE_OF[ch];
                else if (FOE_OF[ch]) spawns.push({ kind: FOE_OF[ch], tx, ty });
            }
        });
    });
    return { rows, grid, spawns };
}

// the tile at (tx, ty): outside the walls is solid, above the top is open, below the bottom is solid
export function tileAt(well, tx, ty)
{
    if (tx < 0 || tx >= COLS || ty >= well.rows) return BLOCK;
    if (ty < 0) return EMPTY;
    return well.grid[ty * COLS + tx];
}
export const solid = (t)=> t !== EMPTY;
export function setTile(well, tx, ty, t) { well.grid[ty * COLS + tx] = t; }
/** sets tiles tx0..tx1 (inclusive) of row ty, as a ledge or a floor */
export function fill(well, tx0, tx1, ty, t) { for (let tx = tx0; tx <= tx1; tx++) setTile(well, tx, ty, t); }
/** empties everything inside the walls, for a scene built by hand (the dev rooms) */
export function clearWell(well) { for (let ty = 0; ty < well.rows; ty++) fill(well, 1, COLS - 2, ty, EMPTY); }

// the first solid tile a box (x, y, w, h) overlaps, or null
function hitTile(well, x, y, w, h)
{
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 1e-6) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 1e-6) / TILE);
    for (let ty = y0; ty <= y1; ty++)
        for (let tx = x0; tx <= x1; tx++)
        {
            const t = tileAt(well, tx, ty);
            if (solid(t)) return { t, tx, ty };
        }
    return null;
}

// move a box by (dx, dy), one axis at a time, stopping at solid tiles. Returns what it hit on each axis
export function move(well, b, dx, dy)
{
    const hits = { x: null, y: null };
    b.x += dx;
    let h = dx ? hitTile(well, b.x, b.y, b.w, b.h) : null;
    if (h) { b.x = dx > 0 ? h.tx * TILE - b.w : (h.tx + 1) * TILE; hits.x = { ...h, dir: Math.sign(dx) }; }
    b.y += dy;
    h = dy ? hitTile(well, b.x, b.y, b.w, b.h) : null;
    if (h) { b.y = dy > 0 ? h.ty * TILE - b.h : (h.ty + 1) * TILE; hits.y = { ...h, dir: Math.sign(dy) }; }
    return hits;
}

// nothing solid on the straight line between two points
export function clearLine(well, ax, ay, bx, by)
{
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
    for (let i = 1; i < n; i++)
    {
        const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
        if (solid(tileAt(well, Math.floor(x / TILE), Math.floor(y / TILE)))) return false;
    }
    return true;
}

export const centre = (b)=> [b.x + b.w / 2, b.y + b.h / 2];
export const overlap = (a, b)=> a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
