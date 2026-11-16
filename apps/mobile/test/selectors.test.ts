import type { RawWorkout } from '@fitheon/engine';
import { NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ } from '@fitheon/engine/fixtures/november2026';
import { expect, test } from 'vitest';

import { act, initialAppState, sync } from '../src/state/appState';
import type { AppState } from '../src/state/appState';
import { gymView, headerView } from '../src/state/selectors';

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
