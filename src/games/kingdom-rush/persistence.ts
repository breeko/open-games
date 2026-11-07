import { z } from 'zod';
import { createStore, type StorageAccess } from '../../shared/persistence/store';
import { LEVEL, type LevelId } from './content';
import { sessionSchema } from './save-state';

export function gameStores(storage?: StorageAccess,level:LevelId=3) {
  return {
    session: createStore({ key: level===3?'open-games.kingdom-rush.session.v1':`open-games.kingdom-rush.level${level}-session.v1`, schema: sessionSchema.refine(save=>save.battle.level===level), storage }),
    // The existing value was a numeric string, which is already valid JSON.
    // Retain its key and representation so existing records survive unchanged.
    results: createStore({
      key: level===3?'open-games.kingdom-rush.results.v1':`open-games.kingdom-rush.level${level}-results.v1`,
      schema: z.number().int().min(0).max(LEVEL.lives), storage,
    }),
  };
}
