import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preparePractice} from '../../../src/games/kingdom-rush/practice';
import {Simulation} from '../../../src/games/kingdom-rush/simulation';

test('custom practice powers isolate a full-wave-one test from campaign money and power progress', () => {
  const profile = {fire: 2, reinforcements: 0};
  const campaign = new Simulation(1, 6, profile);
  campaign.build(9, 'mage'); campaign.callWave();
  const saved = campaign.snapshot();
  const custom = {fire: 5, reinforcements: 2};
  const practice = preparePractice(1, 6, 1, {kind: 'custom', loadout: custom}, profile);
  assert.ok(practice);
  assert.equal(practice.practice, true);
  assert.equal(practice.gold, 700);
  assert.equal(practice.wave, 0);
  assert.deepEqual(practice.powerUpgrades, custom);
  assert.deepEqual(profile, {fire: 2, reinforcements: 0});
  assert.deepEqual(campaign.snapshot(), saved);
  custom.fire = 0;
  assert.equal(practice.powerUpgrades.fire, 5, 'practice owns a detached loadout');
  practice.callWave();
  assert.equal(practice.configurePowers(profile), false, 'loadout freezes when battle begins');
  const trace = JSON.parse(practice.export());
  assert.equal(trace.practice, true);
  assert.deepEqual(trace.powerUpgrades, {fire: 5, reinforcements: 2});
});

test('default practice retains the campaign profile and existing later-wave income calculation', () => {
  const profile = {fire: 3, reinforcements: 1};
  const battle = preparePractice(1, 6, 17, {kind: 'campaign'}, profile);
  assert.ok(battle);
  assert.equal(battle.gold, 5958);
  assert.equal(battle.wave, 16);
  assert.deepEqual(battle.powerUpgrades, profile);
  assert.equal(preparePractice(1, 6, 18, {kind: 'campaign'}, profile), null);
});
