import type { Action } from '@fitheon/game';
import { NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ } from '@fitheon/engine/fixtures/november2026';
import { expect, test } from 'vitest';

import { act, initialAppState, sync } from '../src/state/appState';
import { load, parseAppState, save, serialise, STORAGE_KEY } from '../src/state/persist';
import type { KeyValueStorage } from '../src/state/persist';

const BUY_BIKE: Action = { type: 'install', gymId: 'garage', slotId: 'garage.cardio.1', lineId: 'exercise_bike' };

function memoryStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: async key => map.get(key) ?? null,
    setItem: async (key, value) => { map.set(key, value); },
  };
}

const afterNovember = () => sync(initialAppState(), NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ).app;

test('state survives a restart', async () => {
  const storage = memoryStorage();
  const app = act(afterNovember(), BUY_BIKE).app;

  await save(storage, app);
  const restored = await load(storage);

  expect(restored).toEqual(app);
});

test('nothing stored yet starts a new game', async () => {
  expect(await load(memoryStorage())).toEqual(initialAppState());
});

test('a storage read that fails starts a new game', async () => {
  const broken: KeyValueStorage = {
    getItem: () => Promise.reject(new Error('disk')),
    setItem: () => Promise.resolve(),
  };

  expect(await load(broken)).toEqual(initialAppState());
});

test('corrupt JSON starts a new game', () => {
  expect(parseAppState('{not json')).toEqual(initialAppState());
});

test('a different version starts a new game', () => {
  const stored = { ...JSON.parse(serialise(afterNovember())), version: 2 };

  expect(parseAppState(JSON.stringify(stored))).toEqual(initialAppState());
});

test('a stored state missing its game starts a new game', () => {
  const { game: _game, ...rest } = afterNovember();

  expect(parseAppState(JSON.stringify(rest))).toEqual(initialAppState());
});

test('a game without numeric coins starts a new game', () => {
  const app = afterNovember();
  const stored = { ...app, game: { ...app.game, coins: 'lots' } };

  expect(parseAppState(JSON.stringify(stored))).toEqual(initialAppState());
});

test('JSON that is not an object starts a new game', () => {
  expect(parseAppState('null')).toEqual(initialAppState());
  expect(parseAppState('[1,2]')).toEqual(initialAppState());
});

test('a version 1 state without clockOffsetMs loads with offset 0', () => {
  const { clockOffsetMs: _offset, weekGoals: _goals, ...rest } = { ...afterNovember(), clockOffsetMs: 5000 };

  const parsed = parseAppState(JSON.stringify(rest));

  expect(parsed.clockOffsetMs).toBe(0);
  expect(parsed.weekGoals).toEqual({});
  expect(parsed.game.coins).toBe(1438);
});

test('a purchase is stored by the save that follows it', async () => {
  const storage = memoryStorage();
  const before = afterNovember();
  await save(storage, before);

  const after = act(before, BUY_BIKE).app;
  await save(storage, after);
  const fresh = await load(storage);

  expect(storage.map.has(STORAGE_KEY)).toBe(true);
  expect(fresh.game.coins).toBeLessThan(before.game.coins);
  expect(fresh.game.machines).toContainEqual(expect.objectContaining({ lineId: 'exercise_bike', installed: true }));
});
