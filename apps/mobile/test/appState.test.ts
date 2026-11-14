import { getLine, installPrice } from '@fitheon/catalog';
import type { RawWorkout } from '@fitheon/engine';
import { NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ } from '@fitheon/engine/fixtures/november2026';
import { initialState } from '@fitheon/game';
import type { Action } from '@fitheon/game';
import { expect, test } from 'vitest';

import { act, initialAppState, sync } from '../src/state/appState';
import type { AppState } from '../src/state/appState';

const afterNovember = (): AppState => sync(initialAppState(), NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ).app;

const BUY_BIKE: Action = { type: 'install', gymId: 'garage', slotId: 'garage.cardio.1', lineId: 'exercise_bike' };

function priceOf(lineId: string): number {
  const line = getLine(lineId);
  if (!line) throw new Error(`unknown line ${lineId}`);
  return installPrice(line);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

test('a new game starts in the Garage with the starter machine and no workouts', () => {
  const app = initialAppState();

  expect(app.version).toBe(1);
  expect(app.game).toEqual(initialState());
  expect(app.workouts).toEqual([]);
  expect(app.defaultWeeklyGoal).toBe(3);
  expect(app.weekGoals).toEqual({});
  expect(app.bonusAwardedWeeks).toEqual([]);
  expect(app.clockOffsetMs).toBe(0);
});

test('syncing the November week earns the spec totals', () => {
  const { app, summary } = sync(initialAppState(), NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ);

  expect(summary).toMatchObject({ coins: 1438, xp: 190, duplicates: 0, levelBefore: 1, levelAfter: 5 });
  expect(summary.workouts).toHaveLength(12);
  expect(app.game.coins).toBe(1438);
  expect(app.game.xp).toBe(190);
  expect(app.workouts).toHaveLength(12);
  expect(app.bonusAwardedWeeks).toEqual(['2026-11-02']);
});

test('syncing the same workouts again earns nothing', () => {
  const { app, summary } = sync(afterNovember(), NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ);

  expect(summary).toMatchObject({ coins: 0, xp: 0, duplicates: 12, levelBefore: 5, levelAfter: 5 });
  expect(summary.workouts).toEqual([]);
  expect(app.game.coins).toBe(1438);
  expect(app.workouts).toHaveLength(12);
  expect(app.bonusAwardedWeeks).toEqual(['2026-11-02']);
});

test('a second workout overlapping the first on the same day is recorded but not rewarded', () => {
  const workout = (hkUuid: string): RawWorkout => ({
    hkUuid,
    activityType: 'TraditionalStrengthTraining',
    startAt: '2026-11-08T16:00:00Z',
    endAt: '2026-11-08T17:00:00Z',
    durationS: 3600,
    mets: 4,
    sourceBundle: 'com.apple.health',
    title: null,
    userEntered: false,
  });

  const { app, summary } = sync(initialAppState(), [workout('a'), workout('b')], NOVEMBER_NOW, NOVEMBER_TZ);

  const statuses = app.workouts.map(w => w.status).sort();
  expect(statuses).toEqual(['counted', 'overlap']);
  expect(app.workouts.find(w => w.status === 'overlap')?.coins).toBe(0);
  expect(summary.workouts).toHaveLength(2);
  expect(app.game.coins).toBe(summary.coins);
});

test('buying a machine deducts its price and installs it', () => {
  const before = afterNovember();

  const { app, result } = act(before, BUY_BIKE);

  expect(result.ok).toBe(true);
  expect(app.game.coins).toBe(before.game.coins - priceOf('exercise_bike'));
  expect(app.game.machines).toContainEqual(expect.objectContaining({
    gymId: 'garage', slotId: 'garage.cardio.1', lineId: 'exercise_bike', installed: true,
  }));
});

test('a failed action leaves the app state untouched', () => {
  const before = initialAppState();

  const { app, result } = act(before, {
    type: 'install', gymId: 'garage', slotId: 'garage.bench.1', lineId: 'flat_bench',
  });

  expect(result).toEqual({ ok: false, error: 'insufficient_coins' });
  expect(app).toBe(before);
});

test('the same purchase applied twice succeeds once', () => {
  const start = afterNovember();

  const first = act(start, BUY_BIKE);
  const second = act(first.app, BUY_BIKE);

  expect(first.result.ok).toBe(true);
  expect(second.result).toEqual({ ok: false, error: 'already_owned' });
  expect(second.app).toBe(first.app);
  expect(second.app.game.coins).toBe(start.game.coins - priceOf('exercise_bike'));
  expect(second.app.game.coins).toBeGreaterThanOrEqual(0);
});

test('sync and act do not mutate their input', () => {
  const frozenNew = deepFreeze(initialAppState());
  const frozenRich = deepFreeze(afterNovember());

  expect(() => sync(frozenNew, NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ)).not.toThrow();
  expect(act(frozenRich, BUY_BIKE).result.ok).toBe(true);
});
