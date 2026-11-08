import {test} from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {Simulation} from '../../../src/games/kingdom-rush/simulation';
import {spentStars} from '../../../src/games/kingdom-rush/upgrades';
import {citadelCalibration} from '../../../scripts/games/kingdom-rush/calibrate-citadel';
import trace from '../../../docs/games/kingdom-rush/playtests/2026-11-08-citadel-campaign-browser.json';

test('a full Citadel defense with an attainable campaign budget survives JSON restoration through the boss', () => {
  const loadout = {fire: 5, reinforcements: 2};
  assert.equal(spentStars(loadout), 14);
  assert.ok(spentStars(loadout) <= 5 * 3, 'at most fifteen stars are available before stage six');
  const uninterrupted = citadelCalibration(loadout);
  const restoredAt: number[] = [];
  const resumed = citadelCalibration(loadout, {checkpoint(battle) {
    if (![6000, 15000, 21000].includes(battle.tick)) return battle;
    restoredAt.push(battle.tick);
    const restored = Simulation.restore(JSON.parse(JSON.stringify(battle.snapshot())), {paused: false});
    assert.deepEqual(restored.snapshot(), battle.snapshot());
    return restored;
  }});
  assert.deepEqual(restoredAt, [6000, 15000, 21000]);
  assert.equal(uninterrupted.battle.practice, false);
  assert.equal(uninterrupted.waves.length, 17);
  assert.equal(uninterrupted.purchasesCompleted, 22);
  assert.deepEqual(
    [uninterrupted.battle.phase, uninterrupted.battle.tick, uninterrupted.battle.lives, uninterrupted.battle.gold, uninterrupted.battle.kills],
    ['won', 24954, 13, 3393, 562],
  );
  assert.deepEqual(resumed.waves, uninterrupted.waves);
  assert.deepEqual(resumed.battle.snapshot(), uninterrupted.battle.snapshot());
});

test('the active wave-one browser attempt reproduces its terminal result after a real reload', () => {
  assert.equal(trace.practice, false);
  assert.equal(trace.completeHistory, true);
  const battle = new Simulation(trace.seed, 6, trace.powerUpgrades);
  const commandSchema = z.discriminatedUnion('type', [
    z.object({type: z.literal('build'), holder: z.number(), kind: z.enum(['mage', 'barrack'])}),
    z.object({type: z.literal('upgrade'), holder: z.number()}),
    z.object({type: z.literal('cast'), kind: z.enum(['fire', 'reinforcements']), x: z.number(), y: z.number()}),
    z.object({type: z.literal('wave'), bonus: z.number()}),
  ]);
  for (const event of trace.events) {
    while (battle.tick < event.tick && battle.phase !== 'lost' && battle.phase !== 'won') battle.step();
    if (battle.phase === 'lost' || battle.phase === 'won') break;
    const parsed = commandSchema.safeParse(event);
    if (!parsed.success) {
      assert.ok(!['build', 'upgrade', 'cast', 'wave'].includes(event.type));
      continue;
    }
    const command = parsed.data;
    switch (command.type) {
      case 'build': assert.ok(battle.build(command.holder, command.kind)); break;
      case 'upgrade': assert.ok(battle.upgrade(command.holder)); break;
      case 'cast': assert.ok(battle.cast(command.kind, command)); break;
      case 'wave':
        if (battle.phase === 'ready' || command.bonus > 0) assert.ok(battle.callWave());
        break;
    }
  }
  assert.deepEqual(
    [battle.phase, battle.tick, battle.wave, battle.lives, battle.gold, battle.kills],
    [trace.phase, trace.tick, trace.wave, trace.lives, trace.gold, trace.kills],
  );
});
