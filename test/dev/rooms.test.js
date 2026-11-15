// The gym and the museum as smoke tests: every feature built the way main.js builds it, then each gym case and each
// exhibit played through the real run. A gym case must pass exactly when its band says it can be done; an exhibit
// must show what its sign says. A failure names the row and case, so a tuning change shows where the levels may break.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../fake-browser.js';

globalThis.location = { search: '?debug' };
const { storage } = await import('../../src/platform/storage.js');
storage.backend = { async load() { return {}; }, write() {} };
const { state } = await import('../../src/game/state.js');
const { loadSettings } = await import('../../src/game/settings.js');
const { loop } = await import('../../src/game/loop.js');
const { features } = await import('../../src/features/index.js');
const { gymRows } = await import('../../src/dev/gym.js');
const { exhibits } = await import('../../src/dev/museum.js');
const { attempt } = await import('../../src/dev/scene.js');
const { REACH, band } = await import('../../src/dev/gym-data.js');
const { CHUNKS, START } = await import('../../src/world/wells-data.js');

await storage.init();
state.load();
loadSettings();
loop.use(features);
loop.build();

test('the bands come from the reach: easy up to 80%, hard up to it, then no', ()=>
{
    assert.equal(band(.8 * REACH.jump, REACH.jump), 'easy');
    assert.equal(band(REACH.jump, REACH.jump), 'hard');
    assert.equal(band(REACH.jump + .01, REACH.jump), 'no');
});

for (const row of gymRows(features))
{
    test(`gym row ${row.id}: every case passes exactly when its band says it can be done`, ()=>
    {
        assert.ok(row.cases.some((c)=> c.band !== 'no'), 'a row with nothing doable');
        for (const c of row.cases)
        {
            const tr = attempt(c, row.setup);
            assert.equal(tr.ok, c.band !== 'no', `${row.id} / ${c.name} (${c.band}) ${tr.ok ? 'passed' : 'failed'} at (${Math.round(tr.w.player.x)}, ${Math.round(tr.w.player.y)})`);
        }
    });
}

const all = exhibits(features);
test('every feature with a museum hook has its exhibits in the museum, each id once', ()=>
{
    const ids = all.map((e)=> e.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ['tell', 'hitstop', 'chain', 'stars', 'wallkick', 'sealed']) assert.ok(ids.includes(id), id);
});

for (const e of all)
{
    test(`exhibit ${e.id}${e.wrong ? ' (built wrong on purpose)' : ''} shows what its sign says`, ()=>
    {
        assert.ok(attempt(e).ok, `${e.id} didn't`);
    });
}

test('no chunk has the sealed exhibit\'s mistake: a row of blocks from wall to wall', ()=>
{
    for (const c of [START, ...Object.values(CHUNKS).flat()]) for (const r of c) assert.doesNotMatch(r, /^[#^]{18}$/);
});
