import { NOVEMBER_2026 } from '@fitheon/engine/fixtures/november2026';
import { expect, test } from 'vitest';

import { generateWorkout, mockHealthSource, novemberWeekAt, WORKOUT_TEMPLATES } from '../src/health/healthSource';
import { initialAppState, sync } from '../src/state/appState';

const TZ = 'Europe/Ljubljana';
const A_MONTH_LATER = '2026-12-14T08:00:00Z';
const DAY_MS = 24 * 60 * 60 * 1000;

const plus = (iso: string, ms: number): string => new Date(Date.parse(iso) + ms).toISOString();

function pickFor(activityType: string, minutes: number): number {
  const index = WORKOUT_TEMPLATES.findIndex(t => t.activityType === activityType && t.minutes === minutes);
  if (index < 0) throw new Error(`no template ${activityType} ${minutes}`);
  return index / WORKOUT_TEMPLATES.length;
}

test('the November week imported a month later still earns the spec totals', () => {
  const { summary } = sync(initialAppState(), novemberWeekAt(A_MONTH_LATER), A_MONTH_LATER, TZ);

  expect(summary.workouts).toHaveLength(12);
  expect(summary.workouts.filter(w => w.status === 'invalid')).toEqual([]);
  expect(summary.coins).toBe(1438);
  expect(summary.xp).toBe(190);
});

test('the November week is shifted by whole weeks, keeping weekdays and ids', () => {
  const shifted = novemberWeekAt(A_MONTH_LATER);

  shifted.forEach((w, i) => {
    const original = NOVEMBER_2026[i]!;
    const delta = Date.parse(w.startAt) - Date.parse(original.startAt);
    expect(delta % (7 * DAY_MS)).toBe(0);
    expect(Date.parse(w.endAt) - Date.parse(original.endAt)).toBe(delta);
    expect(w.hkUuid).toBe(original.hkUuid);
  });
});

test('the November week on its own dates is returned unshifted', () => {
  expect(novemberWeekAt('2026-11-09T08:00:00Z')).toEqual(NOVEMBER_2026);
});

test('a workout that has not ended yet is left out', () => {
  const lastEnd = novemberWeekAt(A_MONTH_LATER).at(-1)!.endAt;

  expect(novemberWeekAt(plus(lastEnd, -60_000))).toHaveLength(11);
});

test('importing the November week twice rewards it once', () => {
  const first = sync(initialAppState(), novemberWeekAt(A_MONTH_LATER), A_MONTH_LATER, TZ);
  const later = plus(A_MONTH_LATER, DAY_MS);
  const second = sync(first.app, novemberWeekAt(later), later, TZ);

  expect(second.summary.duplicates).toBe(12);
  expect(second.summary.workouts).toEqual([]);
  expect(second.summary.coins).toBe(0);
  expect(second.summary.xp).toBe(0);
});

test('the mock health source returns the November week', async () => {
  expect(await mockHealthSource.fetchWorkouts(A_MONTH_LATER)).toEqual(novemberWeekAt(A_MONTH_LATER));
});

test('the templates include strength without METs, a run, a walk and a too-short cycle', () => {
  expect(WORKOUT_TEMPLATES).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ activityType: 'TraditionalStrengthTraining', minutes: 60, mets: null }),
      expect.objectContaining({ activityType: 'Running', minutes: 45, mets: 9 }),
      expect.objectContaining({ activityType: 'Walking', minutes: 30, mets: 3.5 }),
      expect.objectContaining({ activityType: 'Cycling', minutes: 7 }),
    ]),
  );
});

test('a generated workout ends now and is rewarded', () => {
  const workout = generateWorkout(A_MONTH_LATER, 0);
  const { summary } = sync(initialAppState(), [workout], A_MONTH_LATER, TZ);

  expect(workout.endAt).toBe(new Date(A_MONTH_LATER).toISOString());
  expect(Date.parse(workout.endAt) - Date.parse(workout.startAt)).toBe(WORKOUT_TEMPLATES[0]!.minutes * 60_000);
  expect(workout.userEntered).toBe(false);
  expect(workout.sourceBundle).toBe('com.fitheon.mock');
  expect(workout.hkUuid).toBe(`mock-${workout.startAt}`);
  expect(summary.workouts[0]?.status).toBe('counted');
  expect(summary.coins).toBeGreaterThan(0);
  expect(summary.xp).toBe(20);
});

test('every pick in [0, 1) chooses a template', () => {
  for (const pick of [0, 0.25, 0.5, 0.999999]) {
    const workout = generateWorkout(A_MONTH_LATER, pick);
    expect(WORKOUT_TEMPLATES.map(t => t.activityType)).toContain(workout.activityType);
  }
});

test('a generated 7-minute cycle is below the minimum', () => {
  const { summary } = sync(initialAppState(), [generateWorkout(A_MONTH_LATER, pickFor('Cycling', 7))], A_MONTH_LATER, TZ);

  expect(summary.workouts[0]?.status).toBe('below_min');
  expect(summary.coins).toBe(0);
});

test('two generated workouts at the same moment: the second is an overlap', () => {
  const first = sync(initialAppState(), [generateWorkout(A_MONTH_LATER, 0)], A_MONTH_LATER, TZ);
  const run = generateWorkout(A_MONTH_LATER, pickFor('Running', 45));
  const second = sync(first.app, [run], A_MONTH_LATER, TZ);

  expect(second.summary.workouts[0]?.status).toBe('overlap');
  expect(second.summary.coins).toBe(0);
  expect(second.summary.xp).toBe(0);
});

test('a generated workout after advancing the clock one day earns XP again', () => {
  const first = sync(initialAppState(), [generateWorkout(A_MONTH_LATER, 0)], A_MONTH_LATER, TZ);
  const nextDay = plus(A_MONTH_LATER, DAY_MS);
  const second = sync(first.app, [generateWorkout(nextDay, 0)], nextDay, TZ);

  expect(first.summary.xp).toBe(20);
  expect(second.summary.xp).toBe(20);
});
