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

test('the Garage lists its five slots with the starter machine in the first', () => {
  const view = gymView(initialAppState());

  expect(view).toMatchObject({ gymId: 'garage', name: 'Garage', qualityCapName: 'Basic', filled: 1 });
  expect(view.slots).toHaveLength(5);
  expect(view.slots[0]).toEqual({
    slotId: 'garage.free_weights.1',
    accepts: ['free_weights'],
    lineId: 'dumbbell_rack',
    machineName: 'Dumbbell rack',
    quality: 1,
  });
  expect(view.slots.find(s => s.slotId === 'garage.rack.1')?.accepts).toEqual(['rack', 'pull']);
  for (const row of view.slots.slice(1)) {
    expect(row).toMatchObject({ lineId: null, machineName: null, quality: null });
  }
});

test("a stored machine is not shown as the slot's machine", () => {
  const { app, result } = act(afterNovember(), {
    type: 'install',
    gymId: 'garage',
    slotId: 'garage.free_weights.1',
    lineId: 'kettlebell_rack',
  });
  expect(result.ok).toBe(true);

  const view = gymView(app);
  expect(view.slots[0]).toMatchObject({ lineId: 'kettlebell_rack', machineName: 'Kettlebell rack', quality: 1 });
  expect(view.filled).toBe(1);
});
