import type { ZodType } from 'zod';

export interface StorageAccess {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageKey = `open-games.${string}.${string}.v${number}`;
export type ReadResult<T> =
  | { status: 'valid'; value: T }
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'unavailable' };
export type WriteResult = { status: 'saved' } | { status: 'invalid' } | { status: 'unavailable' };

/** Schemas describe JSON data. Games own defaults, migrations and compatibility. */
export function createStore<T>(options: {
  key: StorageKey;
  schema: ZodType<T>;
  storage?: StorageAccess;
}) {
  if (!/^open-games\.[a-z0-9-]+\.[a-z0-9-]+\.v[1-9]\d*$/.test(options.key)) {
    throw new Error('Game storage keys must include a game, store and version');
  }
  const storage = () => options.storage ?? globalThis.localStorage;
  return {
    key: options.key,
    read(): ReadResult<T> {
      let raw: string | null;
      try { raw = storage().getItem(options.key); }
      catch { return { status: 'unavailable' }; }
      if (raw === null) return { status: 'missing' };
      try {
        const parsed = options.schema.safeParse(JSON.parse(raw));
        return parsed.success ? { status: 'valid', value: parsed.data } : { status: 'invalid' };
      } catch { return { status: 'invalid' }; }
    },
    write(value: T): WriteResult {
      // Validate before touching the previous save, including the JSON round trip.
      let raw: string;
      try {
        const parsed = options.schema.safeParse(value);
        if (!parsed.success) return { status: 'invalid' };
        raw = JSON.stringify(parsed.data);
        if (!options.schema.safeParse(JSON.parse(raw)).success) return { status: 'invalid' };
      } catch { return { status: 'invalid' }; }
      try { storage().setItem(options.key, raw); return { status: 'saved' }; }
      catch { return { status: 'unavailable' }; }
    },
    clear(): { status: 'cleared' } | { status: 'unavailable' } {
      try { storage().removeItem(options.key); return { status: 'cleared' }; }
      catch { return { status: 'unavailable' }; }
    },
  };
}
