import { LEVELS, TOTAL_LEVELS, plantsForLevel } from './levels';
import type { PlantType } from './types';
export interface ProgressData {
  highestCompleted: number;
  completedLevels: number[];
  games: number;
  bestWave: number;
  loadouts: Record<string, PlantType[]>;
}
export function freshProgress(): ProgressData { return {highestCompleted:0,completedLevels:[],games:0,bestWave:0,loadouts:{}}; }
function count(value: unknown, max = Number.MAX_SAFE_INTEGER): number { return typeof value === 'number' && Number.isFinite(value) ? Math.max(0,Math.min(max,Math.trunc(value))) : 0; }
export function parseProgress(value: unknown): ProgressData {
  const result = freshProgress();
  if (!value || typeof value !== 'object') return result;
  // External storage is the one boundary where structural validation is required.
  const input = value as Record<string,unknown>;
  result.games = count(input.games); result.bestWave = count(input.bestWave,50);
  const oldHighest = count(input.highestCompleted,TOTAL_LEVELS);
  result.completedLevels = Array.isArray(input.completedLevels)
    ? [...new Set(input.completedLevels.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id >= 1 && id <= TOTAL_LEVELS))].sort((a,b)=>a-b)
    : LEVELS.filter(level=>level.id <= oldHighest).map(level=>level.id);
  while (result.completedLevels.includes(result.highestCompleted + 1)) result.highestCompleted++;
  if (input.loadouts && typeof input.loadouts === 'object' && !Array.isArray(input.loadouts)) {
    const stored = input.loadouts as Record<string,unknown>;
    for (const level of LEVELS) {
      const candidates = stored[String(level.id)]; if (!Array.isArray(candidates)) continue;
      const available = plantsForLevel(level.id);
      result.loadouts[String(level.id)] = [...new Set(candidates.filter((type): type is PlantType => available.some(plant => plant === type)))];
    }
  }
  return result;
}
export function recordClear(data: ProgressData, levelId: number, waves: number): boolean {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > TOTAL_LEVELS) return false;
  data.games++; data.bestWave = Math.max(data.bestWave,waves);
  const firstClear = !data.completedLevels.includes(levelId);
  if (firstClear) data.completedLevels.push(levelId);
  while (data.completedLevels.includes(data.highestCompleted + 1)) data.highestCompleted++;
  return firstClear;
}
