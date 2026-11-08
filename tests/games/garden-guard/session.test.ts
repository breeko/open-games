import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../../../src/games/garden-guard/levels';
import { gardenSessionSchema } from '../../../src/games/garden-guard/state/session-data';
import { createSessionStore, GAME_SESSION_KEY, GAME_STORAGE_KEYS } from '../../../src/games/garden-guard/state/storage';
import { randomSource } from '../../../src/games/garden-guard/reference/rules';
import { GroundMotion } from '../../../src/games/garden-guard/reference/motion';
import { WaveDirector } from '../../../src/games/garden-guard/wave-director';
import { WhackDirector } from '../../../src/games/garden-guard/whack-director';
import { FinalGraveRise } from '../../../src/games/garden-guard/night';
import { SunPickup } from '../../../src/games/garden-guard/sun-pickup';
import { busyNightSession, freshSession } from './fixtures/session';

test('all twenty-two levels, including both supply modes and whack, have valid JSON session representations', () => {
  for (const level of LEVELS) assert.deepEqual(gardenSessionSchema.parse(JSON.parse(JSON.stringify(freshSession(level.id)))), freshSession(level.id));
  const busy = busyNightSession();
  assert.deepEqual(gardenSessionSchema.parse(JSON.parse(JSON.stringify(busy))), busy);
});

test('session validation rejects incompatible rules, wrong entity behavior, loadouts and cross-entity references', () => {
  const data = busyNightSession();
  const rejects = (input: unknown) => assert.equal(gardenSessionSchema.safeParse(input).success, false);
  rejects({ ...data, compatibility: 'future' });rejects({ ...data, version: 2 });
  rejects({ ...data, plants: [{ ...data.plants[0], behavior: { kind: 'chomper', digest: 5 } }] });
  rejects({ ...data, plants: [data.plants[0], data.plants[0]] });
  rejects({ ...data, seeds: ['peashooter', 'dragon'] });
  rejects({ ...data, zombies: [{ ...data.zombies[0], row: 8 }] });
  rejects({ ...data, zombies: [{ ...data.zombies[0], wave: 999 }] });
  rejects({ ...data, waves: { ...data.waves, director: freshSession(15).waves.director } });
  const bowling = freshSession(5);
  rejects({ ...bowling, rolling: [{ x: 400, y: 500, row: 0, angle: 0, hits: [99], bounce: null }] });
  rejects({ ...data, sun: '750' });
});

test('session storage preserves campaign, preferences, legacy saves and other games', () => {
  const originals = { [GAME_STORAGE_KEYS.progress]: '{"games":5}', [GAME_STORAGE_KEYS.settings]: '{"music":false}',
    'pvz.progress.v2': '{"games":3}', 'open-games.kingdom-rush.session.v1': 'other' };
  const values = new Map(Object.entries(originals));
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const store = createSessionStore(storage);
  assert.equal(store.write(busyNightSession()).status, 'saved');
  assert.equal(store.read().status, 'valid');store.clear();
  for (const [key, value] of Object.entries(originals)) assert.equal(values.get(key), value);
  values.set(GAME_SESSION_KEY, '{broken');assert.equal(store.read().status, 'invalid');
  assert.equal(values.get(GAME_SESSION_KEY), '{broken');
});

test('wave countdown, warnings, health thresholds and random state continue identically after restoration', () => {
  const level = LEVELS[3], random = randomSource(12345), restoredRandom = randomSource(1);
  const make = (rng: () => number, events: string[]) => new WaveDirector(level.waves, {
    spawn: (type, wave) => { events.push(`spawn:${wave}:${type}`);return 270; }, health: () => 10, liveCount: () => 1,
    start: wave => { events.push(`start:${wave}`); }, warning: () => { events.push('warning'); }, complete() {},
  }, rng);
  const originalEvents: string[] = [], restoredEvents: string[] = [];
  const original = make(random, originalEvents), restored = make(restoredRandom, restoredEvents);
  for (let i = 0; i < 6000; i++) {
    original.update(17);
    if (i === 1400) { restored.restore(JSON.parse(JSON.stringify(original.save())));restoredRandom.restore(random.snapshot());originalEvents.length = 0; }
    if (i > 1400) { restored.update(17);assert.deepEqual(restored.save(), original.save()); }
  }
  assert.deepEqual(restoredEvents, originalEvents);
  assert.equal(restoredRandom.snapshot(), random.snapshot());
});

test('whack spawning resumes its own timer and seeded schedule rather than normal wave budgets', () => {
  const random = randomSource(91), otherRandom = randomSource(1);
  const events: string[] = [], otherEvents: string[] = [];
  const make = (rng: () => number, trace: string[]) => new WhackDirector({
    spawn: (types, wave, speed) => { trace.push(JSON.stringify({ types, wave, speed })); }, liveCount: () => 1, graveCount: () => 9,
    addGraves: count => { trace.push(`graves:${count}`); }, start: wave => { trace.push(`wave:${wave}`); }, complete() {},
  }, rng);
  const original = make(random, events), restored = make(otherRandom, otherEvents);
  for (let i = 0; i < 10000; i++) {
    original.update(17);
    if (i === 1500) { restored.restore(original.save());otherRandom.restore(random.snapshot());events.length = 0; }
    if (i > 1500) { restored.update(17);assert.deepEqual(restored.save(), original.save()); }
  }
  assert.deepEqual(otherEvents, events);
});

test('ground gait phase, pending final grave rise and claimed suns retain their exact remaining state', () => {
  const motion = new GroundMotion('paperRun', .9);motion.advance(1253);
  const restored = new GroundMotion('walk', .3);restored.restore(motion.save());
  for (let i = 0; i < 100; i++) assert.equal(restored.advance(17, true), motion.advance(17, true));
  const rise = new FinalGraveRise();rise.schedule();for (let i = 0; i < 190; i++) rise.step();
  const otherRise = new FinalGraveRise();otherRise.restore(rise.save());
  for (let i = 0; i < 20; i++) assert.equal(otherRise.step(), rise.step());
  const sun = new SunPickup();sun.land();sun.advance(60, false);
  const otherSun = new SunPickup();otherSun.restore(sun.save());
  assert.equal(otherSun.advance(39, true), false);assert.equal(otherSun.advance(1, true), true);
  const flying = new SunPickup();flying.restore(otherSun.save());
  assert.equal(flying.collect(), false);assert.equal(flying.finish(), true);assert.equal(flying.finish(), false);
});
