import { expect, test } from 'vitest';
import { MACHINE_LINES } from '@fitheon/catalog';
import { applyAction, getSlotView, initialState } from '@fitheon/game';
import type { Action, ActionResult, GameState } from '@fitheon/game';

const rich = (xp: number, coins: number, s = initialState()) => ({ ...s, xp, coins });
function ok(r: ActionResult): GameState { if (!r.ok) throw new Error(r.error); return r.state; }
const ALL_LINES = MACHINE_LINES.map(l => l.id);

test('an empty slot lists what can be bought and why not', () => {
  const v = getSlotView(rich(0, 100), 'garage', 'garage.5')!;
  expect(v.installed).toBeNull();
  expect(v.upgrade).toBeNull();
  expect(v.buyable).toContainEqual({ lineId: 'exercise_bike', price: 100, blocked: 'line_locked' });
  expect(v.buyable.find(b => b.lineId === 'treadmill')!.blocked).toBe('line_locked');
  expect(v.buyable.find(b => b.lineId === 'plant')!.blocked).toBe('line_locked');
});

test('an empty slot offers every line, in catalog order', () => {
  expect(getSlotView(rich(0, 100), 'garage', 'garage.3')!.buyable.map(b => b.lineId)).toEqual(ALL_LINES);
  expect(getSlotView(rich(0, 100), 'garage', 'garage.5')!.buyable.map(b => b.lineId)).toEqual(ALL_LINES);
});

test('buyable options say when they are affordable and when not', () => {
  const slot = (coins: number) => getSlotView(rich(0, coins), 'garage', 'garage.3')!.buyable;
  expect(slot(100).slice(0, 3)).toEqual([
    { lineId: 'dumbbell_rack', price: 100, blocked: null },
    { lineId: 'adjustable_bench', price: 50, blocked: null },
    { lineId: 'bench_press', price: 100, blocked: null },
  ]);
  expect(slot(99).slice(0, 2)).toEqual([
    { lineId: 'dumbbell_rack', price: 100, blocked: 'insufficient_coins' },
    { lineId: 'adjustable_bench', price: 50, blocked: null },
  ]);
});

test('an occupied Garage slot shows the upgrade as blocked by the gym cap', () => {
  const v = getSlotView(rich(3000, 9999), 'garage', 'garage.1')!;
  expect(v.installed!.lineId).toBe('dumbbell_rack');
  expect(v.upgrade).toEqual({ to: 2, price: 300, blocked: 'quality_locked' });
  expect(v.buyable.map(b => b.lineId)).toEqual(ALL_LINES.filter(id => id !== 'dumbbell_rack'));
});

test('a machine in one slot is still offered in another', () => {
  const v = getSlotView(rich(0, 100), 'garage', 'garage.2')!;
  expect(v.buyable[0]).toEqual({ lineId: 'dumbbell_rack', price: 100, blocked: null });
});

test('a new gym offers machines to bring over', () => {
  const s = ok(applyAction(rich(200, 500), { type: 'move_gym' }));
  const offer = [{ fromSlotId: 'garage.1', lineId: 'dumbbell_rack', quality: 1 }];
  expect(getSlotView(s, 'neighbourhood', 'neighbourhood.1')!.bringable).toEqual(offer);
  expect(getSlotView(s, 'neighbourhood', 'neighbourhood.9')!.bringable).toEqual(offer);
  expect(getSlotView(s, 'garage', 'garage.1')!.bringable).toEqual([]);
});

test('an empty slot in a new gym offers every machine of the previous gym not yet brought', () => {
  let s = rich(200, 1000);                                                    // level 6
  const buy = (slotId: string, lineId: string): Action => ({ type: 'install', gymId: 'garage', slotId, lineId });
  s = ok(applyAction(s, buy('garage.2', 'bench_press')));
  s = ok(applyAction(s, buy('garage.3', 'bench_press')));                   // a second copy
  s = ok(applyAction(s, buy('garage.4', 'squat_rack')));
  s = ok(applyAction(s, buy('garage.5', 'exercise_bike')));
  s = ok(applyAction(s, buy('garage.5', 'calisthenics_bar')));              // the bike is now stored
  s = ok(applyAction(s, { type: 'move_gym' }));

  expect(getSlotView(s, 'neighbourhood', 'neighbourhood.4')!.bringable).toEqual([
    { fromSlotId: 'garage.1', lineId: 'dumbbell_rack', quality: 1 },
    { fromSlotId: 'garage.2', lineId: 'bench_press', quality: 1 },
    { fromSlotId: 'garage.3', lineId: 'bench_press', quality: 1 },
    { fromSlotId: 'garage.4', lineId: 'squat_rack', quality: 1 },
    { fromSlotId: 'garage.5', lineId: 'calisthenics_bar', quality: 1 },
  ]);

  s = ok(applyAction(s, { type: 'bring_over', gymId: 'neighbourhood', slotId: 'neighbourhood.1', fromSlotId: 'garage.2' }));
  expect(getSlotView(s, 'neighbourhood', 'neighbourhood.4')!.bringable.map(b => b.fromSlotId))
    .toEqual(['garage.1', 'garage.3', 'garage.4', 'garage.5']);               // the other bench press still comes
});

test('a machine brought into one slot is not offered to another', () => {
  let s = ok(applyAction(rich(200, 500), { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'bring_over', gymId: 'neighbourhood',
    slotId: 'neighbourhood.1', fromSlotId: 'garage.1' }));
  expect(getSlotView(s, 'neighbourhood', 'neighbourhood.1')!.bringable).toEqual([]);
  expect(getSlotView(s, 'neighbourhood', 'neighbourhood.2')!.bringable).toEqual([]);
  const r = applyAction(s, { type: 'bring_over', gymId: 'neighbourhood', slotId: 'neighbourhood.2', fromSlotId: 'garage.1' });
  expect(r).toEqual({ ok: false, error: 'already_brought' });
});

test('stored machines and an available upgrade', () => {
  let s = ok(applyAction(rich(270, 1000), { type: 'move_gym' }));                     // level 7
  const slot = ['neighbourhood', 'neighbourhood.1'] as const;
  s = ok(applyAction(s, { type: 'bring_over', gymId: slot[0], slotId: slot[1], fromSlotId: 'garage.1' }));
  s = ok(applyAction(s, { type: 'install', gymId: slot[0], slotId: slot[1], lineId: 'adjustable_bench' }));
  const v = getSlotView(s, ...slot)!;
  expect(v.installed).toMatchObject({ lineId: 'adjustable_bench', installed: true });
  expect(v.stored.map(m => m.lineId)).toEqual(['dumbbell_rack']);
  expect(v.upgrade).toEqual({ to: 2, price: 150, blocked: null });
  expect(v.buyable.map(b => b.lineId))
    .toEqual(ALL_LINES.filter(id => id !== 'dumbbell_rack' && id !== 'adjustable_bench'));
});

test('decor has no upgrade', () => {
  let s = ok(applyAction(rich(270, 1000), { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'install', gymId: 'neighbourhood', slotId: 'neighbourhood.9', lineId: 'plant' }));
  expect(getSlotView(s, 'neighbourhood', 'neighbourhood.9')!.upgrade).toBeNull();
});

test('unknown or locked returns null', () => {
  expect(getSlotView(initialState(), 'elite', 'elite.3')).toBeNull();
  expect(getSlotView(initialState(), 'garage', 'garage.nope')).toBeNull();
  expect(getSlotView(initialState(), 'garage', 'garage.free_weights.1')).toBeNull();   // an old id
});
