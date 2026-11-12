import { expect, test } from 'vitest';
import { processWorkouts } from '@fitheon/engine';
import { NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ } from '@fitheon/engine/fixtures/november2026';

test('the real November week matches the spec', () => {
  const r = processWorkouts({ now: NOVEMBER_NOW, timeZone: NOVEMBER_TZ, history: [],
    incoming: NOVEMBER_2026, defaultWeeklyGoal: 3, weekGoals: {}, bonusAwardedWeeks: [] });
  expect(r.workouts.map(x => x.coins)).toEqual([187, 66, 177, 0, 156, 191, 0, 198, 186, 38, 181, 58]);
  expect(r.workouts.map(x => x.xp)).toEqual([20, 20, 0, 0, 20, 20, 0, 20, 20, 0, 20, 0]);
  expect(r.workouts.filter(x => x.status === 'below_min').map(x => x.hkUuid)).toEqual(['nov-04', 'nov-07']);
  expect(r.workouts.filter(x => x.status === 'counted')).toHaveLength(10);
  expect(r.coins).toBe(1438);
  expect(r.weeklyBonuses).toEqual([{ weekStart: '2026-11-02', xp: 50 }]);
  expect(r.xp).toBe(190);
});

test('the first workout is a Sunday and belongs to the week before', () => {
  const r = processWorkouts({ now: NOVEMBER_NOW, timeZone: NOVEMBER_TZ, history: [],
    incoming: NOVEMBER_2026, defaultWeeklyGoal: 3, weekGoals: {}, bonusAwardedWeeks: [] });
  expect(r.workouts[0]).toMatchObject({ localDate: '2026-11-01', weekStart: '2026-10-26', title: 'Chest Triceps Rame' });
  expect(new Set(r.workouts.slice(1).map(x => x.weekStart))).toEqual(new Set(['2026-11-02']));
});

test('syncing the week in two halves gives the same totals', () => {
  const base = { now: NOVEMBER_NOW, timeZone: NOVEMBER_TZ, defaultWeeklyGoal: 3, weekGoals: {} };
  const a = processWorkouts({ ...base, history: [], incoming: NOVEMBER_2026.slice(0, 6), bonusAwardedWeeks: [] });
  const b = processWorkouts({ ...base, history: a.workouts, incoming: NOVEMBER_2026.slice(6),
    bonusAwardedWeeks: a.weeklyBonuses.map(x => x.weekStart) });
  expect(a.coins + b.coins).toBe(1438);
  expect(a.xp + b.xp).toBe(190);
});

test('syncing the whole week again earns nothing', () => {
  const base = { now: NOVEMBER_NOW, timeZone: NOVEMBER_TZ, defaultWeeklyGoal: 3, weekGoals: {} };
  const a = processWorkouts({ ...base, history: [], incoming: NOVEMBER_2026, bonusAwardedWeeks: [] });
  const b = processWorkouts({ ...base, history: a.workouts, incoming: NOVEMBER_2026,
    bonusAwardedWeeks: a.weeklyBonuses.map(x => x.weekStart) });
  expect(b).toMatchObject({ workouts: [], coins: 0, xp: 0, weeklyBonuses: [] });
  expect(b.duplicates).toHaveLength(12);
});
