import { expect, test } from 'vitest';
import { processWorkouts } from '@fitheon/engine';
import { NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ } from '@fitheon/engine/fixtures/november2026';
import { addRewards, applyAction, initialState } from '@fitheon/game';
import type { Action, GameState } from '@fitheon/game';
import {
  gameStateFromRows, processedFromRow, rowFromProcessed, rowsFromGameState, weekInputsFromRows,
} from '@fitheon/contract';
import type { GameRows, ProfileRow, Snapshot, UserMachineRow, WorkoutRow } from '@fitheon/contract';

const USER = '00000000-0000-0000-0000-000000000001';

/** What the database would return after storing these rows: ids added, brought_from resolved. */
function asSnapshot(rows: GameRows): Pick<Snapshot, 'profile' | 'gyms' | 'machines' | 'styles'> {
  const profile: ProfileRow = {
    id: USER, ...rows.profile, weekly_goal: 3, pending_weekly_goal: null,
    last_summary_seen_at: null, created_at: '2026-11-01T00:00:00+00:00',
  };
  const machines: UserMachineRow[] = rows.machines.map(({ broughtFromKey: _key, ...m }, i) => ({
    id: `machine-${i}`, user_id: USER, ...m, brought_from: null,
  }));
  rows.machines.forEach(({ broughtFromKey: key }, i) => {
    if (!key) return;
    const source = machines.find(m =>
      m.gym_id === key.gym_id && m.slot_id === key.slot_id && m.machine_id === key.machine_id);
    machines[i]!.brought_from = source?.id ?? null;
  });
  return {
    profile,
    gyms: rows.gyms.map(g => ({ user_id: USER, ...g, unlocked_at: '2026-11-01T00:00:00+00:00' })),
    machines,
    styles: rows.styles.map(s => ({ user_id: USER, ...s })),
  };
}

function play(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((s, action) => {
    const r = applyAction(s, action);
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    return r.state;
  }, state);
}

const november = () => processWorkouts({
  now: NOVEMBER_NOW, timeZone: NOVEMBER_TZ, history: [], incoming: NOVEMBER_2026,
  defaultWeeklyGoal: 3, weekGoals: {}, bonusAwardedWeeks: [],
});

test('a new game survives the round trip through rows', () => {
  expect(gameStateFromRows(asSnapshot(rowsFromGameState(initialState())))).toEqual(initialState());
});

test('a played game survives the round trip', () => {
  const result = november();
  const state = play(addRewards(initialState(), result.coins, result.xp),
    { type: 'install', gymId: 'garage', slotId: 'garage.2', lineId: 'exercise_bike' },
    // installing into an occupied slot stores the machine that was there
    { type: 'install', gymId: 'garage', slotId: 'garage.1', lineId: 'adjustable_bench' },
    { type: 'buy_style', gymId: 'garage', styleId: 'garage.floor.rubber_mat' });

  const rows = rowsFromGameState(state);
  expect(gameStateFromRows(asSnapshot(rows))).toEqual(state);
  expect(rows.machines.find(m => m.machine_id === 'dumbbell_rack')).toMatchObject({ installed: false });
  expect(rows.styles).toEqual([{ gym_id: 'garage', style_id: 'garage.floor.rubber_mat' }]);
});

test('the cached level follows the XP', () => {
  expect(rowsFromGameState({ ...initialState(), xp: 190 }).profile.level).toBe(5);
});

test('a brought-over machine keeps the machine it came from', () => {
  const base = initialState();
  const state: GameState = {
    ...base,
    currentGymId: 'neighbourhood',
    gyms: { ...base.gyms, neighbourhood: { floorStyleId: 'n.floor', wallStyleId: 'n.wall', ownedStyleIds: [] } },
    machines: [
      ...base.machines,
      { gymId: 'garage', slotId: 'garage.4', lineId: 'bench_press', quality: 1, installed: true, broughtFromSlotId: null },
      { gymId: 'neighbourhood', slotId: 'neighbourhood.2', lineId: 'bench_press', quality: 1, installed: true,
        broughtFromSlotId: 'garage.4' },
    ],
  };

  const rows = rowsFromGameState(state);
  expect(rows.machines[2]!.broughtFromKey)
    .toEqual({ gym_id: 'garage', slot_id: 'garage.4', machine_id: 'bench_press' });

  const snapshot = asSnapshot(rows);
  expect(snapshot.machines[2]!.brought_from).toBe(snapshot.machines[1]!.id);
  expect(gameStateFromRows(snapshot)).toEqual(state);
});

test('a brought_from that points at no row becomes null, not an error', () => {
  const snapshot = asSnapshot(rowsFromGameState(initialState()));
  snapshot.machines[0]!.brought_from = 'no-such-row';
  expect(gameStateFromRows(snapshot).machines[0]!.broughtFromSlotId).toBeNull();
});

test('a row with an unknown gym id is dropped, not thrown', () => {
  const snapshot = asSnapshot(rowsFromGameState(initialState()));
  snapshot.gyms.push({ user_id: USER, gym_id: 'moon_base', floor_style: 'x', wall_style: 'y', unlocked_at: '' });
  snapshot.styles.push({ user_id: USER, gym_id: 'moon_base', style_id: 'z' });
  snapshot.machines.push({ id: 'm', user_id: USER, gym_id: 'moon_base', slot_id: 'moon_base.1',
    machine_id: 'bench_press', quality: 1, installed: true, brought_from: null });
  snapshot.profile.current_gym = 'moon_base';

  const state = gameStateFromRows(snapshot);
  expect(Object.keys(state.gyms)).toEqual(['garage']);
  expect(state.machines).toHaveLength(1);
  expect(state.currentGymId).toBe('garage');
});

test('a machine whose line no longer exists is kept', () => {
  const snapshot = asSnapshot(rowsFromGameState(initialState()));
  snapshot.machines.push({ id: 'm', user_id: USER, gym_id: 'garage', slot_id: 'garage.2',
    machine_id: 'kettlebell_rack', quality: 1, installed: true, brought_from: null });
  expect(gameStateFromRows(snapshot).machines.map(m => m.lineId)).toContain('kettlebell_rack');
});

test('a processed workout survives the round trip', () => {
  const { workouts } = november();
  expect(workouts.length).toBeGreaterThan(0);
  for (const w of workouts) {
    const row: WorkoutRow = { id: 'w', user_id: USER, ...rowFromProcessed(w) };
    expect(processedFromRow(row)).toEqual(w);
  }
});

test('numeric columns read back as strings still become numbers', () => {
  // postgres.js returns Postgres `numeric` as a string
  const w = november().workouts.find(x => x.mets !== null && x.multiplier !== null);
  if (!w) throw new Error('fixture has no workout with METs and a multiplier');
  const row: Record<string, unknown> = { id: 'w', user_id: USER, ...rowFromProcessed(w) };
  for (const key of ['duration_s', 'mets', 'counted_minutes', 'multiplier']) row[key] = String(row[key]);
  expect(processedFromRow(row as WorkoutRow)).toEqual(w);
});

test('weekly rows become engine inputs', () => {
  expect(weekInputsFromRows([
    { user_id: USER, week_start: '2026-11-02', goal: 3, active_days: 4, bonus_awarded_at: '2026-11-05T18:00:00+00:00' },
    { user_id: USER, week_start: '2026-11-09', goal: 4, active_days: 1, bonus_awarded_at: null },
  ])).toEqual({ weekGoals: { '2026-11-02': 3, '2026-11-09': 4 }, bonusAwardedWeeks: ['2026-11-02'] });
});
