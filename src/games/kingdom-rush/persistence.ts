import { z } from 'zod';
import { createStore, type StorageAccess } from '../../shared/persistence/store';
import { LEVEL } from './content';
import { sessionSchema } from './save-state';

export function gameStores(storage?: StorageAccess) {
  return {
    session: createStore({ key: 'open-games.kingdom-rush.session.v1', schema: sessionSchema, storage }),
    // The existing value was a numeric string, which is already valid JSON.
    // Retain its key and representation so existing records survive unchanged.
    results: createStore({
      key: 'open-games.kingdom-rush.results.v1',
      schema: z.number().int().min(0).max(LEVEL.lives), storage,
    }),
  };
}
