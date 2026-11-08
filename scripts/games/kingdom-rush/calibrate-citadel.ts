import {Simulation} from '../../../src/games/kingdom-rush/simulation';
import {inRange, TOWERS, type TowerKind} from '../../../src/games/kingdom-rush/content';
import {spentStars, type PowerLoadout} from '../../../src/games/kingdom-rush/upgrades';

// Authored automated defense, not a recording of a person or the original game.
// The policy reads enemy HP and checks every second, so its results do not
// establish human win rates. No practice income or balance overrides are used.
export function citadelCalibration(loadout: PowerLoadout, options: {
  seed?: number;
  checkpoint?: (battle: Simulation) => Simulation;
} = {}) {
  let battle = new Simulation(options.seed ?? 12648430, 6, loadout);
  for (const site of [3, 4, 9, 7, 6, 10, 14]) battle.build(site, 'mage');
  const purchases: [number, TowerKind | 'upgrade'][] = [
    [12, 'mage'], [9, 'upgrade'], [10, 'upgrade'], [5, 'barrack'],
    [5, 'upgrade'], [4, 'upgrade'], [6, 'upgrade'], [9, 'upgrade'],
    [10, 'upgrade'], [14, 'upgrade'], [12, 'upgrade'], [5, 'upgrade'],
    [9, 'upgrade'], [10, 'upgrade'], [8, 'archer'], [11, 'archer'],
    [8, 'upgrade'], [11, 'upgrade'], [8, 'upgrade'], [11, 'upgrade'],
    [8, 'upgrade'], [11, 'upgrade'],
  ];
  const waves: {wave: number; tick: number; lives: number; gold: number; kills: number}[] = [];
  let cursor = 0;
  battle.callWave();
  while (battle.phase === 'running' && battle.tick < 60000) {
    if (waves.at(-1)?.wave !== battle.wave) {
      waves.push({wave: battle.wave, tick: battle.tick, lives: battle.lives, gold: battle.gold, kills: battle.kills});
    }
    const purchase = purchases[cursor];
    if (purchase) {
      const [site, kind] = purchase;
      if (kind === 'upgrade' ? battle.upgrade(site) : battle.build(site, kind)) cursor++;
    }
    if (battle.tick % 30 === 0) {
      const enemies = battle.enemies.filter(e => e.hp > 0 && !e.escaped && e.node >= 10);
      const coverage = (enemy: {x: number; y: number}) => battle.towers.filter(t =>
        t.kind !== 'barrack' && inRange({x: t.x, y: t.y - 12.8}, enemy, TOWERS[t.kind].range[t.level - 1])
      ).length;
      const front = enemies.filter(e => coverage(e) >= 2).sort((a, b) => battle.remaining(a) - battle.remaining(b))[0];
      if (front) battle.cast('reinforcements', front);
      const cluster = enemies.map(enemy => ({
        enemy, hp: enemies.filter(other => inRange(enemy, other, 72)).reduce((sum, other) => sum + other.hp, 0),
      })).sort((a, b) => b.hp - a.hp)[0];
      if (cluster && cluster.hp >= 200) battle.cast('fire', cluster.enemy);
      if (battle.canCall && enemies.length <= 2) battle.callWave();
    }
    battle.step();
    if (options.checkpoint) battle = options.checkpoint(battle);
  }
  return {battle, waves, purchasesCompleted: cursor};
}

if (import.meta.main) {
  for (const loadout of [
    {fire: 0, reinforcements: 0}, {fire: 3, reinforcements: 1}, {fire: 5, reinforcements: 2},
  ]) {
    const {battle, waves, purchasesCompleted} = citadelCalibration(loadout);
    console.log(JSON.stringify({
      kind: 'authored-simulation', seed: battle.seed, stars: spentStars(loadout), loadout,
      phase: battle.phase, wave: battle.wave, tick: battle.tick, lives: battle.lives,
      gold: battle.gold, kills: battle.kills, purchasesCompleted, waves,
    }));
  }
}
