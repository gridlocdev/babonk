import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, VOLUME_DEFAULTS, clampStep, cleanVolumes, migrateVolumes, stepGain } from '../../src/lib/volume.js';

test('a slider step is 3 dB, the top is full and the bottom is silent', ()=>
{
    assert.equal(stepGain(STEPS), 1);
    assert.equal(stepGain(0), 0);
    assert.ok(Math.abs(20 * Math.log10(stepGain(STEPS - 2)) + 6) < 1e-9);
    for (let s = 1; s <= STEPS; s++) assert.ok(stepGain(s) > stepGain(s - 1));
    assert.equal(stepGain(99), 1);
    assert.equal(stepGain(-3), 0);
});

test('bad or missing values in the save fall back to the defaults', ()=>
{
    assert.deepEqual(cleanVolumes(undefined), { ...VOLUME_DEFAULTS });
    assert.deepEqual(cleanVolumes({ master: 3.4, music: 'loud', effects: 40 }), { master: 3, music: VOLUME_DEFAULTS.music, effects: STEPS });
    assert.equal(clampStep(NaN, 5), 5);
    assert.equal(clampStep(-1), 0);
});

test('the old on/off switches move into the sliders', ()=>
{
    const a = { core: { sound: 0 }, music: { on: false } };
    migrateVolumes(a);
    assert.deepEqual(a, { core: { volume: { ...VOLUME_DEFAULTS, master: 0, music: 0 } } });

    const b = { core: { sound: 1 }, music: { on: true }, babonk: { table: [] } };
    migrateVolumes(b);
    assert.deepEqual(b, { core: { volume: { ...VOLUME_DEFAULTS } }, babonk: { table: [] } });

    const c = { core: { volume: { master: 4, music: 2, effects: 6 } } };
    migrateVolumes(c);
    assert.deepEqual(c, { core: { volume: { master: 4, music: 2, effects: 6 } } }, 'a new save is left alone');
});
