import { readGameStorage,writeGameStorage } from './state/storage';
export type Difficulty = 'relaxed' | 'baseline' | 'hard';
export const DIFFICULTIES: Record<Difficulty, { health: number; speed: number; sunBonus: number }> = {
  relaxed: { health: 0.75, speed: 0.8, sunBonus: 50 },
  baseline: { health: 1, speed: 1, sunBonus: 0 },
  hard: { health: 1.35, speed: 1.15, sunBonus: 0 },
};
export function isDifficulty(value: unknown): value is Difficulty { return value === 'relaxed' || value === 'baseline' || value === 'hard'; }
function read(): Difficulty {
  try { const value = readGameStorage('difficulty'); return isDifficulty(value) ? value : 'baseline'; } catch { return 'baseline'; }
}
let selected = read();
export function getDifficulty(): Difficulty { return selected; }
export function setDifficulty(value: Difficulty): void { selected = value; try { writeGameStorage('difficulty',value); } catch { /* session only */ } }
