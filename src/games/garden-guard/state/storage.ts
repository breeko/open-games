import { createStore, type StorageAccess as SharedStorageAccess } from '../../../shared/persistence/store';
import { gardenSessionSchema } from './session-data';

export const GAME_SESSION_KEY = 'open-games.garden-guard.session.v1';
export function createSessionStore(storage?: SharedStorageAccess) {
  return createStore({ key: GAME_SESSION_KEY, schema: gardenSessionSchema, storage });
}

/** Garden Guard owns these keys and the legacy migration; other games must not use them. */
export const GAME_STORAGE_KEYS = {
  progress: 'open-games.garden-guard.progress.v2',
  settings: 'open-games.garden-guard.settings.v1',
  difficulty: 'open-games.garden-guard.difficulty.v1',
} as const;
const LEGACY_KEYS = {
  progress: 'pvz.progress.v2',
  settings: 'pvz.settings.v1',
  difficulty: 'open-games.difficulty',
} as const;
type Store = keyof typeof GAME_STORAGE_KEYS;
interface StorageAccess {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Read the current save first; copy legacy saves without deleting the original. */
export function readGameStorage(store: Store, storage?: StorageAccess): string | null {
  try {
    const target = storage ?? globalThis.localStorage;
    const current = target.getItem(GAME_STORAGE_KEYS[store]);
    if (current !== null) return current;
    const legacy = target.getItem(LEGACY_KEYS[store]);
    if (legacy !== null) {
      // A quota/permission failure must not prevent reading the existing save.
      try { target.setItem(GAME_STORAGE_KEYS[store], legacy); } catch { /* read-only storage */ }
    }
    return legacy;
  } catch { return null; }
}

export function writeGameStorage(store: Store, value: string, storage?: StorageAccess): void {
  try { (storage ?? globalThis.localStorage).setItem(GAME_STORAGE_KEYS[store], value); }
  catch { /* the owning store keeps session state when storage is unavailable */ }
}
