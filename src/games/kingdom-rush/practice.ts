import {type LevelId} from './content';
import {Simulation} from './simulation';
import {type PowerLoadout} from './upgrades';

export type PracticePowers = {kind: 'campaign'} | {kind: 'custom'; loadout: PowerLoadout};

/** Builds an isolated practice battle; callers retain the campaign save/profile. */
export function preparePractice(seed: number, level: LevelId, wave: number, powers: PracticePowers, campaign: PowerLoadout): Simulation | null {
  const battle = new Simulation(seed, level, powers.kind === 'custom' ? powers.loadout : campaign);
  return battle.preparePractice(wave) ? battle : null;
}
