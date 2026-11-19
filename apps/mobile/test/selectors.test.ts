import type { RawWorkout } from '@fitheon/engine';
import { NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ } from '@fitheon/engine/fixtures/november2026';
import { expect, test } from 'vitest';

import { act, initialAppState, sync } from '../src/state/appState';
import type { AppState } from '../src/state/appState';
import { activityDays, activityLabel, gymView, headerView, STATUS_REASON } from '../src/state/selectors';

const afterNovember = (): AppState => sync(initialAppState(), NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ).app;

test('a new game shows level 1 with 0 of 20 XP and no active days', () => {
  expect(headerView(initialAppState(), NOVEMBER_NOW, NOVEMBER_TZ)).toEqual({
    coins: 0,
    level: 1,
    xpInto: 0,
    xpNeeded: 20,
    goalDone: 0,
    goal: 3,
  });
});

test('after the November week the header shows level 5 with 50 of 60 XP', () => {
  expect(headerView(afterNovember(), '2026-11-08T20:00:00Z', NOVEMBER_TZ)).toEqual({
    coins: 1438,
    level: 5,
    xpInto: 50,
    xpNeeded: 60,
    goalDone: 6,
    goal: 3,
  });
});

test('a new week starts the active-day count again', () => {
  expect(headerView(afterNovember(), '2026-11-09T08:00:00Z', NOVEMBER_TZ).goalDone).toBe(0);
});

test('uncounted workouts do not make a day active', () => {
  const short: RawWorkout = {
    hkUuid: 'short-walk',
    activityType: 'Walking',
    startAt: '2026-11-09T07:00:00Z',
    endAt: '2026-11-09T07:05:00Z',
    durationS: 300,
    mets: null,
    sourceBundle: 'com.apple.health',
    title: null,
    userEntered: false,
  };
  const { app, summary } = sync(initialAppState(), [short], NOVEMBER_NOW, NOVEMBER_TZ);

  expect(summary.workouts[0]?.status).toBe('below_min');
  expect(headerView(app, NOVEMBER_NOW, NOVEMBER_TZ).goalDone).toBe(0);
});

test('the Garage lists five numbered slots with the starter in the first', () => {
  const view = gymView(initialAppState());

  expect(view).toMatchObject({ gymId: 'garage', name: 'Garage', qualityCapName: 'Basic', filled: 1 });
  expect(view.slots).toHaveLength(5);
  expect(view.slots[0]).toEqual({
    slotId: 'garage.1',
    slotNumber: 1,
    lineId: 'dumbbell_rack',
    machineName: 'Dumbbell rack',
    quality: 1,
  });
  expect(view.slots.map(s => [s.slotId, s.slotNumber])).toEqual([
    ['garage.1', 1], ['garage.2', 2], ['garage.3', 3], ['garage.4', 4], ['garage.5', 5],
  ]);
  for (const row of view.slots.slice(1)) {
    expect(row).toMatchObject({ lineId: null, machineName: null, quality: null });
  }
});

test("a stored machine is not shown as the slot's machine", () => {
  const { app, result } = act(afterNovember(), {
    type: 'install',
    gymId: 'garage',
    slotId: 'garage.1',
    lineId: 'adjustable_bench',
  });
  expect(result.ok).toBe(true);

  const view = gymView(app);
  expect(view.slots[0]).toMatchObject({ lineId: 'adjustable_bench', machineName: 'Adjustable bench', quality: 1 });
  expect(view.filled).toBe(1);
});

test('no workouts gives no days', () => {
  expect(activityDays(initialAppState())).toEqual([]);
});

test('the November week is grouped into seven days, newest first', () => {
  const days = activityDays(afterNovember());

  expect(days).toHaveLength(7);
  expect(days[0]?.localDate).toBe('2026-11-08');
  expect(days[0]?.workouts).toHaveLength(2);
  expect(days[0]?.workouts.map(w => w.id)).toEqual(['nov-11', 'nov-12']);
  expect(days[6]?.localDate).toBe('2026-11-01');
  expect(days[6]?.workouts).toHaveLength(1);
});

test('an uncounted workout carries its reason', () => {
  const day = activityDays(afterNovember()).find(d => d.localDate === '2026-11-02');
  const cycle = day?.workouts.find(w => w.activityLabel === 'Cycling');

  expect(cycle).toMatchObject({ minutes: 7.6, status: 'below_min', reason: 'Under 10 min', coins: 0, multiplier: null });
});

test('a counted workout shows its multiplier and rewards', () => {
  const day = activityDays(afterNovember()).find(d => d.localDate === '2026-11-01');

  expect(day?.workouts[0]).toEqual({
    id: 'nov-01',
    activityLabel: 'Traditional Strength Training',
    title: 'Chest Triceps Rame',
    minutes: 74.6,
    multiplier: 1.25,
    coins: 187,
    xp: 20,
    status: 'counted',
    reason: null,
    source: 'Strong',
  });
});

test('every status has a reason or is counted', () => {
  expect(STATUS_REASON).toEqual({
    counted: null,
    below_min: 'Under 10 min',
    daily_cap: 'Over 120 min for the day',
    overlap: 'Overlaps a counted workout',
    user_entered: 'Entered by hand',
    invalid: 'Could not be read',
  });
});

test('an invalid workout is listed last, not dropped', () => {
  const broken: RawWorkout = {
    hkUuid: 'broken',
    activityType: 'Running',
    startAt: 'not a date',
    endAt: 'not a date',
    durationS: 1800,
    mets: null,
    sourceBundle: null,
    title: null,
    userEntered: false,
  };
  const { app } = sync(afterNovember(), [broken], NOVEMBER_NOW, NOVEMBER_TZ);
  const days = activityDays(app);

  expect(days).toHaveLength(8);
  expect(days[7]).toEqual({
    localDate: null,
    workouts: [expect.objectContaining({ id: 'broken', status: 'invalid', reason: 'Could not be read', source: 'Unknown' })],
  });
});

test('activity types are split into words', () => {
  expect(activityLabel('TraditionalStrengthTraining')).toBe('Traditional Strength Training');
  expect(activityLabel('Walking')).toBe('Walking');
});
