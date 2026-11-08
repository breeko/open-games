import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, plantsForLevel, rewardForLevel } from '../../../src/games/garden-guard/levels';
import { PLANT_DEFS } from '../../../src/games/garden-guard/constants';
import { DIFFICULTIES, isDifficulty } from '../../../src/games/garden-guard/difficulty';

test('each selectable level has its introductory plants without relying on earlier saves', () => {
  assert.deepEqual(plantsForLevel(1), ['peashooter']);
  assert.deepEqual(plantsForLevel(4), ['peashooter', 'sunflower', 'cherrybomb', 'wallnut']);
  assert.equal(rewardForLevel(4), undefined);
  for (const level of LEVELS) {
    assert.ok(level.activeRows.length > 0);
    assert.ok(level.availablePlants.every(plant => PLANT_DEFS[plant]));
    assert.ok(level.activeRows.every(row => row >= 0 && row < (level.environment==='pool'?6:5)));
    if(level.mode!=='whack')assert.ok(level.waves.every(wave => Object.values(wave.zombies).some(count => count! > 0)));
  }
});

test('source starting resources and non-tutorial countdowns remain intact', () => {
  assert.deepEqual(LEVELS.slice(0,10).map(l=>l.startingSun),[150,50,50,50,50,50,50,50,50,50]);
  assert.deepEqual(LEVELS.slice(0,10).map(l=>l.waves[0].delayMs),[18000,50000,18000,18000,2000,18000,18000,18000,18000,2000]);
});

test('difficulty scales are ordered and baseline preserves base definitions', () => {
  assert.equal(DIFFICULTIES.baseline.health, 1);
  assert.equal(DIFFICULTIES.baseline.speed, 1);
  assert.ok(DIFFICULTIES.relaxed.health < DIFFICULTIES.baseline.health);
  assert.ok(DIFFICULTIES.hard.health > DIFFICULTIES.baseline.health);
  assert.equal(isDifficulty('hard'), true);
  assert.equal(isDifficulty('__proto__'), false);
  assert.equal(isDifficulty(null), false);
});

test('expanded campaign preserves the original day special modes and plants', () => {
  assert.equal(LEVELS.length,22);
  assert.equal(LEVELS[4].mode,'bowling');
  assert.equal(LEVELS[9].mode,'conveyor');
  assert.ok(plantsForLevel(8).includes('chomper'));
  assert.ok(plantsForLevel(9).includes('repeater'));
  assert.deepEqual(LEVELS.slice(0,10).map(level=>level.waves.length),[4,6,8,10,8,10,20,10,20,20]);
});
