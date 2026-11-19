import { NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ } from '@fitheon/engine/fixtures/november2026';
import { expect, test } from 'vitest';

import { generateWorkout, WORKOUT_TEMPLATES } from '../src/health/healthSource';
import { initialAppState, sync } from '../src/state/appState';
import { rewardView } from '../src/state/rewardSummary';

const NOW = '2026-12-14T08:00:00Z';
const TZ = 'Europe/Ljubljana';
const CYCLE = WORKOUT_TEMPLATES.findIndex(t => t.minutes === 7) / WORKOUT_TEMPLATES.length;
const RUN = WORKOUT_TEMPLATES.findIndex(t => t.activityType === 'Running') / WORKOUT_TEMPLATES.length;

test('a first workout from a new game earns coins, 20 XP and level 2', () => {
  const { summary } = sync(initialAppState(), [generateWorkout(NOW, 0)], NOW, TZ);
  const view = rewardView(summary);

  expect(view.nothingEarned).toBe(false);
  expect(view.leveledUp).toBe(true);
  expect(view.coinsDetail).toBe('coins from 1 workout');
  expect(view.xpDetail).toBe('1 active day');
  expect(view.levelDetail).toBe('from level 1');
  expect(view.notCounted).toBeNull();
});

test('the November import names the weekly bonus and the uncounted workouts', () => {
  const { summary } = sync(initialAppState(), NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ);
  const view = rewardView(summary);

  expect(view.levelDetail).toBe('from level 1');
  expect(view.xpDetail).toBe('7 active days + weekly bonus');
  expect(view.coinsDetail).toBe('coins from 10 workouts');
  expect(view.notCounted).toBe('2 not counted: Under 10 min');
});

test('a second workout at the same moment says why nothing was earned', () => {
  const first = sync(initialAppState(), [generateWorkout(NOW, 0)], NOW, TZ);
  const { summary } = sync(first.app, [generateWorkout(NOW, RUN)], NOW, TZ);
  const view = rewardView(summary);

  expect(view.nothingEarned).toBe(true);
  expect(view.leveledUp).toBe(false);
  expect(view.reason).toBe('Overlaps a workout already counted');
});

test('a too-short workout says it was under 10 minutes', () => {
  const { summary } = sync(initialAppState(), [generateWorkout(NOW, CYCLE)], NOW, TZ);

  expect(rewardView(summary).reason).toBe('Under 10 min');
});

test('importing again says everything was already imported', () => {
  const first = sync(initialAppState(), NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ);
  const { summary } = sync(first.app, NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ);
  const view = rewardView(summary);

  expect(view.nothingEarned).toBe(true);
  expect(view.reason).toBe('Already imported');
});

test('coins without XP explain that XP is earned once a day', () => {
  const morning = '2026-12-14T07:00:00Z';
  const first = sync(initialAppState(), [generateWorkout(morning, 0)], morning, TZ);
  const evening = '2026-12-14T17:00:00Z';
  const { summary } = sync(first.app, [generateWorkout(evening, 0)], evening, TZ);
  const view = rewardView(summary);

  expect(summary.coins).toBeGreaterThan(0);
  expect(view.nothingEarned).toBe(false);
  expect(view.xpDetail).toBe('XP already earned today');
});

test('a sync with no workouts at all says so', () => {
  const { summary } = sync(initialAppState(), [], NOW, TZ);

  expect(rewardView(summary).reason).toBe('No new workouts');
});
