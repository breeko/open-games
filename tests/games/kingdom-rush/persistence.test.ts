import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../../../src/games/kingdom-rush/simulation';
import { battleSnapshotSchema } from '../../../src/games/kingdom-rush/save-state';
import { gameStores } from '../../../src/games/kingdom-rush/persistence';

function memory() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
}
function battle(seed = 73) {
  const sim = new Simulation(seed);
  sim.build(12, 'barrack'); sim.build(10, 'engineer'); sim.build(11, 'archer'); sim.callWave();
  return sim;
}

test('saved battles round-trip through JSON and storage and restore paused without advancing time', () => {
  const sim = battle();
  for (let i = 0; i < 500; i++) sim.step();
  sim.cast('fire', { x: 329, y: 474 });
  sim.cast('reinforcements', { x: 329, y: 474 });
  const stores = gameStores(memory());
  assert.equal(stores.session.write({ version: 1, savedAt: 1000, speed: 2, battle: sim.snapshot() }).status, 'saved');
  const loaded = stores.session.read();
  assert.equal(loaded.status, 'valid');
  if (loaded.status !== 'valid') throw new Error('Expected save');
  const restored = Simulation.restore(loaded.value.battle);
  assert.equal(restored.paused, true);
  assert.equal(restored.tick, sim.tick);
  const snapshot = restored.snapshot();
  for (let i = 0; i < 100; i++) restored.step();
  assert.deepEqual(restored.snapshot(), snapshot, 'offline/paused time cannot advance the battle');
  assert.deepEqual(restored.snapshot(), { ...sim.snapshot(), paused: true });
  assert.equal(loaded.value.speed, 2);
});

test('restoring pending spawns, RNG, attacks and spell cooldowns produces the uninterrupted outcome', () => {
  const uninterrupted = battle(9241);
  const checkpoints = new Set([1, 39, 500, 501, 515, 531, 710, 900, 1201]);
  let restored: Simulation | undefined;
  for (let i = 0; i < 5000 && uninterrupted.phase === 'running'; i++) {
    if (checkpoints.has(i)) {
      // Save during construction, scheduled spawns, combat and overlapping waves.
      const json = JSON.stringify(uninterrupted.snapshot());
      restored = Simulation.restore(JSON.parse(json), { paused: false });
    }
    const command = (sim: Simulation) => {
      if (i === 500) { sim.cast('fire', { x: 329, y: 474 }); sim.cast('reinforcements', { x: 329, y: 474 }); }
      if (i === 710) sim.callWave();
      if (i === 1200) sim.sell(12);
    };
    command(uninterrupted); uninterrupted.step();
    if (restored) {
      command(restored); restored.step();
      if (i % 37 === 0 || checkpoints.has(i)) assert.deepEqual(restored.snapshot(), uninterrupted.snapshot(), `tick ${i}`);
    }
  }
  assert.ok(restored);
  assert.deepEqual(restored.snapshot(), uninterrupted.snapshot());
});

test('snapshots are detached, encode never-deadlines explicitly, and final-wave scheduling survives', () => {
  const sim = battle();
  const saved = sim.snapshot();
  assert.equal(saved.soldiers[0].expires, null);
  saved.soldiers[0].rally.x = -999;
  assert.notEqual(sim.soldiers[0].rally.x, -999);
  const fresh = new Simulation();
  assert.equal(fresh.snapshot().nextWaveTick, null);
  assert.equal(Simulation.restore(JSON.parse(JSON.stringify(fresh.snapshot()))).nextIn, 0);
  const final = { ...sim.snapshot(), wave: 11, nextWaveTick: null };
  assert.equal(Simulation.restore(final).snapshot().nextWaveTick, null);
  sim.sell(12);
  const restored = Simulation.restore(JSON.parse(JSON.stringify(sim.snapshot())));
  assert.equal(restored.soldiers[0].respawnAt, Infinity);
});

test('bad versions, paths, enum values and IDs are rejected without touching stored records', () => {
  const storage = memory(), stores = gameStores(storage), sim = battle();
  for (let i = 0; i < 25; i++) sim.step();
  const data = sim.snapshot();
  assert.equal(battleSnapshotSchema.safeParse({ ...data, compatibility: 'future-version' }).success, false);
  assert.equal(battleSnapshotSchema.safeParse({ ...data, enemies: [{ ...data.enemies[0], route: 99 }] }).success, false);
  assert.equal(battleSnapshotSchema.safeParse({ ...data, enemies: [{ ...data.enemies[0], node: 99999 }] }).success, false);
  assert.equal(battleSnapshotSchema.safeParse({ ...data, enemies: [{ ...data.enemies[0], kind: 'dragon' }] }).success, false);
  assert.equal(battleSnapshotSchema.safeParse({ ...data, nextId: 1 }).success, false);
  const invalid = JSON.stringify({ version: 2, battle: data });
  storage.setItem(stores.session.key, invalid);
  assert.equal(stores.session.read().status, 'invalid');
  assert.equal(storage.data.get(stores.session.key), invalid);
  storage.setItem(stores.results.key, '17');
  assert.deepEqual(stores.results.read(), { status: 'valid', value: 17 });
  stores.session.clear();
  assert.equal(storage.data.get(stores.results.key), '17');
});
