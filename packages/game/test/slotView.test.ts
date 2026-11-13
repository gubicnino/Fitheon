import { expect, test } from 'vitest';
import { applyAction, getSlotView, initialState } from '@fitheon/game';
import type { ActionResult, GameState } from '@fitheon/game';

const rich = (xp: number, coins: number, s = initialState()) => ({ ...s, xp, coins });
function ok(r: ActionResult): GameState { if (!r.ok) throw new Error(r.error); return r.state; }

test('an empty slot lists what can be bought and why not', () => {
  const v = getSlotView(rich(0, 100), 'garage', 'garage.cardio.1')!;
  expect(v.installed).toBeNull();
  expect(v.upgrade).toBeNull();
  expect(v.buyable).toContainEqual({ lineId: 'exercise_bike', price: 100, blocked: 'line_locked' });
  expect(v.buyable.find(b => b.lineId === 'treadmill')!.blocked).toBe('line_locked');
});

test('buyable options say when they are affordable and when not', () => {
  const press = (coins: number) => getSlotView(rich(0, coins), 'garage', 'garage.press.1')!.buyable;
  expect(press(100)).toEqual([
    { lineId: 'bench_press', price: 100, blocked: null },
    { lineId: 'smith_machine', price: 1200, blocked: 'line_locked' },
  ]);
  expect(press(99)[0]).toEqual({ lineId: 'bench_press', price: 100, blocked: 'insufficient_coins' });
});

test('an occupied Garage slot shows the upgrade as blocked by the gym cap', () => {
  const v = getSlotView(rich(3000, 9999), 'garage', 'garage.free_weights.1')!;
  expect(v.installed!.lineId).toBe('dumbbell_rack');
  expect(v.upgrade).toEqual({ to: 2, price: 300, blocked: 'quality_locked' });
  expect(v.buyable.map(b => b.lineId)).toEqual(['kettlebell_rack']);
});

test('a new gym offers machines to bring over', () => {
  const s = ok(applyAction(rich(200, 500), { type: 'move_gym' }));
  const v = getSlotView(s, 'neighbourhood', 'neighbourhood.free_weights.1')!;
  expect(v.bringable).toEqual([{ fromSlotId: 'garage.free_weights.1', lineId: 'dumbbell_rack', quality: 1 }]);
  expect(getSlotView(s, 'neighbourhood', 'neighbourhood.cardio.1')!.bringable).toEqual([]);
  expect(getSlotView(s, 'garage', 'garage.free_weights.1')!.bringable).toEqual([]);
});

test('a machine already brought over is no longer offered', () => {
  let s = ok(applyAction(rich(200, 500), { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'bring_over', gymId: 'neighbourhood',
    slotId: 'neighbourhood.free_weights.1', fromSlotId: 'garage.free_weights.1' }));
  expect(getSlotView(s, 'neighbourhood', 'neighbourhood.free_weights.1')!.bringable).toEqual([]);
});

test('stored machines and an available upgrade', () => {
  let s = ok(applyAction(rich(270, 1000), { type: 'move_gym' }));                     // level 7
  const slot = ['neighbourhood', 'neighbourhood.free_weights.1'] as const;
  s = ok(applyAction(s, { type: 'bring_over', gymId: slot[0], slotId: slot[1], fromSlotId: 'garage.free_weights.1' }));
  s = ok(applyAction(s, { type: 'install', gymId: slot[0], slotId: slot[1], lineId: 'kettlebell_rack' }));
  const v = getSlotView(s, ...slot)!;
  expect(v.installed).toMatchObject({ lineId: 'kettlebell_rack', installed: true });
  expect(v.stored.map(m => m.lineId)).toEqual(['dumbbell_rack']);
  expect(v.upgrade).toEqual({ to: 2, price: 150, blocked: null });
  expect(v.buyable).toEqual([]);
});

test('decor has no upgrade', () => {
  let s = ok(applyAction(rich(270, 1000), { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'install', gymId: 'neighbourhood', slotId: 'neighbourhood.decor.1', lineId: 'plant' }));
  expect(getSlotView(s, 'neighbourhood', 'neighbourhood.decor.1')!.upgrade).toBeNull();
});

test('unknown or locked returns null', () => {
  expect(getSlotView(initialState(), 'elite', 'elite.press.1')).toBeNull();
  expect(getSlotView(initialState(), 'garage', 'garage.nope.1')).toBeNull();
});
