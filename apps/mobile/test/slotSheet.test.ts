import { getGym, getLine, QUALITIES } from '@fitheon/catalog';
import { NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ } from '@fitheon/engine/fixtures/november2026';
import type { ActionError } from '@fitheon/game';
import { expect, test } from 'vitest';

import { act, initialAppState, sync } from '../src/state/appState';
import type { AppState } from '../src/state/appState';
import { blockedReason, failureReason, slotSheetView } from '../src/state/slotSheet';
import type { SlotSheetView } from '../src/state/slotSheet';

const afterNovember = (): AppState => sync(initialAppState(), NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ).app;

function viewOf(app: AppState, slotId: string): SlotSheetView {
  const view = slotSheetView(app, slotId);
  if (!view) throw new Error(`no sheet for ${slotId}`);
  return view;
}

function option(view: SlotSheetView, lineId: string) {
  const found = view.buy.find(o => o.lineId === lineId);
  if (!found) throw new Error(`${lineId} is not offered`);
  return found;
}

const garage = getGym('garage');
if (!garage) throw new Error('no garage');

test('an empty slot on a new game lists the machines, all blocked for lack of coins or level', () => {
  const view = viewOf(initialAppState(), 'garage.2');

  expect(view.slotId).toBe('garage.2');
  expect(view.title).toBe('Slot 2');
  expect(view.installed).toBeNull();
  expect(view.upgrade).toBeNull();
  expect(view.stored).toEqual([]);
  expect(option(view, 'adjustable_bench')).toEqual({
    lineId: 'adjustable_bench',
    name: 'Adjustable bench',
    startQuality: 1,
    startQualityName: 'Basic',
    price: 50,
    blocked: 'insufficient_coins',
    reason: 'Need 50 more coins',
  });
  for (const o of view.buy) {
    expect(o.blocked).not.toBeNull();
    expect(o.reason).not.toBe('');
  }
});

test("a machine above the player's level says which level unlocks it", () => {
  expect(option(viewOf(initialAppState(), 'garage.2'), 'squat_rack')).toMatchObject({
    blocked: 'line_locked',
    reason: 'Unlocks at level 3',
  });
});

test('the Garage lists only machines that start at Basic, and decor', () => {
  const ids = viewOf(initialAppState(), 'garage.2').buy.map(o => o.lineId).sort();

  expect(ids).toEqual([
    'adjustable_bench', 'bench_press', 'calisthenics_bar', 'dumbbell_rack', 'exercise_bike', 'squat_rack',
    'plant', 'wall_tv', 'sofa', 'lockers', 'reception_desk',
  ].sort());
});

test('a machine already in another slot is still offered', () => {
  expect(option(viewOf(initialAppState(), 'garage.2'), 'dumbbell_rack').lineId).toBe('dumbbell_rack');
});

test('after the November week the affordable options come first and are not blocked', () => {
  const view = viewOf(afterNovember(), 'garage.3');
  const bike = option(view, 'exercise_bike');

  expect(bike).toMatchObject({ blocked: null, reason: null, price: 100 });
  const bikeAt = view.buy.indexOf(bike);
  view.buy.forEach((o, i) => {
    if (o.blocked !== null) expect(i).toBeGreaterThan(bikeAt);
  });
});

test('options are grouped as open, then short of coins, then locked, each in catalog order', () => {
  // Level 5 with 60 coins: the bench (50) is affordable, the other level-1 to -4 machines (100) are not,
  // the decor (level 6) is locked.
  const base = afterNovember();
  const app: AppState = { ...base, game: { ...base.game, coins: 60 } };
  const view = viewOf(app, 'garage.2');

  expect(view.buy.map(o => [o.lineId, o.blocked])).toEqual([
    ['adjustable_bench', null],
    ['dumbbell_rack', 'insufficient_coins'],
    ['bench_press', 'insufficient_coins'],
    ['exercise_bike', 'insufficient_coins'],
    ['squat_rack', 'insufficient_coins'],
    ['calisthenics_bar', 'insufficient_coins'],
    ['plant', 'line_locked'],
    ['wall_tv', 'line_locked'],
    ['sofa', 'line_locked'],
    ['lockers', 'line_locked'],
    ['reception_desk', 'line_locked'],
  ]);
  expect(option(view, 'bench_press').reason).toBe('Need 40 more coins');
  expect(option(view, 'plant').reason).toBe('Unlocks at level 6');
});

test("the starter machine cannot be upgraded past the Garage's cap", () => {
  const view = viewOf(afterNovember(), 'garage.1');

  expect(view.installed).toEqual({ lineId: 'dumbbell_rack', name: 'Dumbbell rack', quality: 1, qualityName: 'Basic' });
  expect(view.upgrade).toEqual({
    toName: 'Standard',
    price: 300,
    blocked: 'quality_locked',
    reason: 'Garage allows up to Basic',
  });
});

test('a replaced machine appears as stored and can be swapped back', () => {
  const { app, result } = act(afterNovember(), {
    type: 'install',
    gymId: 'garage',
    slotId: 'garage.1',
    lineId: 'adjustable_bench',
  });
  expect(result.ok).toBe(true);

  const view = viewOf(app, 'garage.1');
  expect(view.installed).toMatchObject({ lineId: 'adjustable_bench', name: 'Adjustable bench' });
  expect(view.stored).toEqual([{ lineId: 'dumbbell_rack', name: 'Dumbbell rack', quality: 1, qualityName: 'Basic' }]);
  expect(view.buy.some(o => o.lineId === 'dumbbell_rack' || o.lineId === 'adjustable_bench')).toBe(false);

  const swapped = act(app, { type: 'swap', gymId: 'garage', slotId: 'garage.1', lineId: 'dumbbell_rack' });
  expect(swapped.result).toMatchObject({ ok: true, coinsDelta: 0 });
  expect(viewOf(swapped.app, 'garage.1').installed?.lineId).toBe('dumbbell_rack');
});

test('a quality tier the gym allows but the player has not reached names its level', () => {
  const neighbourhood = getGym('neighbourhood');
  if (!neighbourhood) throw new Error('no neighbourhood gym');

  expect(blockedReason('quality_locked', { coins: 0, price: 300, level: 5, tier: QUALITIES[2], gym: neighbourhood }))
    .toBe('Needs level 7');
});

test('the required sentences', () => {
  const ctx = { coins: 20, price: 100, level: 1, gym: garage };
  const bike = getLine('exercise_bike');

  expect(blockedReason('insufficient_coins', ctx)).toBe('Need 80 more coins');
  expect(blockedReason('line_locked', { ...ctx, line: bike })).toBe('Unlocks at level 2');
  expect(blockedReason('quality_locked', { ...ctx, tier: QUALITIES[2] })).toBe('Garage allows up to Basic');
  expect(blockedReason('max_quality', ctx)).toBe('Already at the highest quality');
  expect(blockedReason('not_upgradable', ctx)).toBe('Decor cannot be upgraded');
});

test('every ActionError has a non-empty sentence', () => {
  const all: Record<ActionError, true> = {
    gym_locked: true, unknown_slot: true, unknown_line: true, unknown_style: true,
    line_locked: true, quality_locked: true, not_upgradable: true, max_quality: true,
    insufficient_coins: true, slot_empty: true, already_owned: true, not_owned: true,
    already_brought: true, nothing_to_bring: true, level_too_low: true, no_next_gym: true,
  };
  for (const error of Object.keys(all) as ActionError[]) {
    // Without a line or tier in the context the sentence must still say something.
    expect(blockedReason(error, { coins: 0, price: 0, level: 1, gym: garage }).trim()).not.toBe('');
  }
});

test('a refused action is explained with the same sentences as the sheet', () => {
  const app = initialAppState();
  const buy = act(app, { type: 'install', gymId: 'garage', slotId: 'garage.2', lineId: 'bench_press' });
  expect(buy.result).toEqual({ ok: false, error: 'insufficient_coins' });
  expect(failureReason(app, 'garage.2', 'insufficient_coins', 'bench_press')).toBe('Need 100 more coins');

  const up = act(app, { type: 'upgrade', gymId: 'garage', slotId: 'garage.1' });
  expect(up.result).toEqual({ ok: false, error: 'quality_locked' });
  expect(failureReason(app, 'garage.1', 'quality_locked')).toBe('Garage allows up to Basic');

  expect(failureReason(app, 'garage.99', 'unknown_slot')).not.toBe('');
});

test('an unknown slot gives null', () => {
  expect(slotSheetView(initialAppState(), 'garage.99')).toBeNull();
  expect(slotSheetView(initialAppState(), 'neighbourhood.1')).toBeNull();
});
