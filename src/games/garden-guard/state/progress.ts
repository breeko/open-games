import { readGameStorage,writeGameStorage } from './storage';
import Phaser from 'phaser';
import { SEED_ORDER } from '../constants';
import { TOTAL_LEVELS, plantsForLevel,rewardForLevel } from '../levels';
import type { PlantType } from '../types';

import { freshProgress, parseProgress, recordClear, type ProgressData } from '../progress-data';
export type Progress = ProgressData;
function readStored(): Progress {
  try { return parseProgress(JSON.parse(readGameStorage('progress') ?? 'null')); }
  catch { return freshProgress(); }
}

class ProgressStore extends Phaser.Events.EventEmitter {
  private values: Progress;

  constructor() {
    super();
    this.values = readStored();
  }

  get current(): Readonly<Progress> {
    return this.values;
  }

  /* ---------------------------------------------------------------- */
  /*  Level progression                                                */
  /* ---------------------------------------------------------------- */

  /** The highest level the player may enter. */
  get unlockedLevel(): number {
    return Math.min(this.values.highestCompleted + 1, TOTAL_LEVELS);
  }

  isUnlocked(levelId: number): boolean {
    return Number.isInteger(levelId) && levelId >= 1 && levelId <= TOTAL_LEVELS;
  }

  isCompleted(levelId: number): boolean {
    return this.values.completedLevels.includes(levelId);
  }

  get completedCount(): number {
    return this.values.completedLevels.length;
  }

  /** Plants owned right now. */
  get unlockedPlants(): PlantType[] {
    return [...new Set([...plantsForLevel(this.unlockedLevel),...this.values.completedLevels.flatMap(id=>{const reward=rewardForLevel(id);return reward?[reward]:[];})])];
  }

  /**
   * Records a finished level. Returns `true` when this clear unlocked the next
   * level, i.e. it was the player's furthest run so far.
   */
  completeLevel(levelId: number, wavesReached: number): boolean {
    const isNew = recordClear(this.values,levelId,wavesReached);

    this.persist();
    this.emit('changed');

    return isNew;
  }

  /** Records a failed attempt. */
  recordAttempt(wavesReached: number): void {
    this.values.games += 1;
    if (wavesReached > this.values.bestWave) this.values.bestWave = wavesReached;

    this.persist();
    this.emit('changed');
  }

  /** Remembers which seeds the player picked for a level. */
  setLoadout(levelId: number, seeds: PlantType[]): void {
    this.values.loadouts[String(levelId)] = [...seeds];
    this.persist();
  }

  getLoadout(levelId: number): PlantType[] | undefined {
    const stored = this.values.loadouts[String(levelId)];
    return stored ? [...stored] : undefined;
  }

  reset(): void {
    this.values = freshProgress();
    this.persist();
    this.emit('changed');
  }

  private persist(): void {
    try {
      writeGameStorage('progress', JSON.stringify(this.values));
    } catch {
      /* keep the values in memory only */
    }
  }
}

export const progress = new ProgressStore();

/** The full plant order, for screens that show locked entries too. */
export const ALL_PLANTS: readonly PlantType[] = SEED_ORDER;
