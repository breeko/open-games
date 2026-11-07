import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createStore } from '../../../src/shared/persistence/store';

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
}
const key = 'open-games.example.progress.v1';
const schema = z.object({ level: z.number().int().min(1), music: z.boolean() });

test('stores validate reads and writes and isolate game keys', () => {
  const storage = memory({ 'open-games.other.progress.v1': 'untouched' });
  const store = createStore({ key, schema, storage });
  assert.equal(store.read().status, 'missing');
  assert.equal(store.write({ level: 2, music: true }).status, 'saved');
  assert.deepEqual(store.read(), { status: 'valid', value: { level: 2, music: true } });
  assert.equal(store.clear().status, 'cleared');
  assert.equal(store.read().status, 'missing');
  assert.equal(storage.data.get('open-games.other.progress.v1'), 'untouched');
});

test('invalid JSON, incompatible versions and malformed fields remain untouched', () => {
  const storage = memory();
  const store = createStore({ key, schema, storage });
  for (const raw of ['{broken', 'null', '{"level":"2","music":true}', '{"level":2,"music":"false"}']) {
    storage.setItem(key, raw);
    assert.equal(store.read().status, 'invalid');
    assert.equal(storage.data.get(key), raw);
  }
  const versioned = createStore({ key, schema: z.object({ version: z.literal(1) }), storage });
  storage.setItem(key, '{"version":2}');
  assert.equal(versioned.read().status, 'invalid');
  assert.equal(storage.data.get(key), '{"version":2}');
});

test('failed validation or quota does not destroy a previous save', () => {
  const storage = memory({ [key]: '{"level":4,"music":true}' });
  const store = createStore({ key, schema, storage });
  assert.equal(store.write({ level: NaN, music: false }).status, 'invalid');
  assert.equal(store.write({ level: Infinity, music: false }).status, 'invalid');
  assert.deepEqual(store.read(), { status: 'valid', value: { level: 4, music: true } });
  const full = createStore({ key, schema, storage: { ...storage, setItem: () => { throw new Error('quota'); } } });
  assert.equal(full.write({ level: 5, music: false }).status, 'unavailable');
  assert.deepEqual(store.read(), { status: 'valid', value: { level: 4, music: true } });
});

test('blocked storage returns explicit failures and does not throw', () => {
  const blocked = () => { throw new Error('blocked'); };
  const store = createStore({ key, schema, storage: { getItem: blocked, setItem: blocked, removeItem: blocked } });
  assert.equal(store.read().status, 'unavailable');
  assert.equal(store.write({ level: 1, music: true }).status, 'unavailable');
  assert.equal(store.clear().status, 'unavailable');
});
