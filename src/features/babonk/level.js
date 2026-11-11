// Building a well from chunks, and asking it what's where. Pure: no engine, so it's tested in node.
// Tiles: 0 empty, 1 block, 2 crate, 3 spikes. Columns 0 and COLS - 1 are the well's walls.
import { COLS, TILE, WELLS } from './babonk-data.js';
import { CHUNKS, CHUNK_ROWS, FLOOR, START } from './wells-data.js';

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

// { rows, grid, foes } for a stack of chunks
export function buildWell(chunks)
{
    const rows = chunks.length * CHUNK_ROWS;
    const grid = new Uint8Array(rows * COLS);
    const foes = [];
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
                else if (FOE_OF[ch]) foes.push({ kind: FOE_OF[ch], tx, ty });
            }
        });
    });
    return { rows, grid, foes };
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

// the first solid tile a box (x, y, w, h) overlaps, or null
export function hitTile(well, x, y, w, h)
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
