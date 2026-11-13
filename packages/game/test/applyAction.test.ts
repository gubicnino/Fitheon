import { expect, test } from 'vitest';
import { addRewards, applyAction, initialState } from '@fitheon/game';
import type { Action, ActionError, ActionResult, GameState } from '@fitheon/game';

const rich = (xp: number, coins: number, s = initialState()) => ({ ...s, xp, coins });
function ok(r: ActionResult): GameState { if (!r.ok) throw new Error(r.error); return r.state; }
function err(r: ActionResult): ActionError { if (r.ok) throw new Error('expected failure'); return r.error; }
const PRESS = { gymId: 'garage', slotId: 'garage.press.1' } as const;

test('initial state', () => {
  const s = initialState();
  expect(s).toMatchObject({ coins: 0, xp: 0, currentGymId: 'garage' });
  expect(s.machines).toEqual([{ gymId: 'garage', slotId: 'garage.free_weights.1',
    lineId: 'dumbbell_rack', quality: 1, installed: true, broughtFromSlotId: null }]);
  expect(Object.keys(s.gyms)).toEqual(['garage']);
  expect(s.gyms.garage).toEqual({ floorStyleId: 'garage.floor.concrete',
    wallStyleId: 'garage.wall.bare_block', ownedStyleIds: [] });
});

test('install at the exact price leaves zero coins', () => {
  const r = applyAction(rich(0, 100), { type: 'install', ...PRESS, lineId: 'bench_press' });
  expect(r).toMatchObject({ ok: true, coinsDelta: -100 });
  expect(ok(r).coins).toBe(0);
});

test('one coin short fails and changes nothing', () => {
  const before = rich(0, 99);
  const snapshot = structuredClone(before);
  expect(err(applyAction(before, { type: 'install', ...PRESS, lineId: 'bench_press' }))).toBe('insufficient_coins');
  expect(before).toEqual(snapshot);
});

test('install failures', () => {
  const s = rich(0, 5000);
  const a = (over: object) => err(applyAction(s, { type: 'install', ...PRESS, lineId: 'bench_press', ...over } as Action));
  expect(a({ gymId: 'elite', slotId: 'elite.press.1' })).toBe('gym_locked');
  expect(a({ slotId: 'garage.nope.1' })).toBe('unknown_slot');
  expect(a({ lineId: 'jetpack' })).toBe('unknown_line');
  expect(a({ lineId: 'squat_rack' })).toBe('category_mismatch');
  expect(a({ slotId: 'garage.cardio.1', lineId: 'exercise_bike' })).toBe('line_locked');   // needs level 2
  expect(err(applyAction(rich(3000, 5000), { type: 'install', gymId: 'garage',
    slotId: 'garage.bench.1', lineId: 'adjustable_bench' }))).toBe('quality_locked');       // garage cap
  expect(a({ slotId: 'garage.free_weights.1', lineId: 'dumbbell_rack' })).toBe('already_owned');
});

test('a gym id that is not a gym is locked, whatever it is', () => {
  const s = rich(3000, 5000);
  for (const gymId of ['__proto__', 'constructor', 'toString', 'nowhere']) {
    expect(err(applyAction(s, { type: 'install', gymId, slotId: 'garage.press.1', lineId: 'bench_press' } as Action)))
      .toBe('gym_locked');
    expect(err(applyAction(s, { type: 'set_current_gym', gymId } as Action))).toBe('gym_locked');
  }
});

test('a tier the gym allows still needs the player level', () => {
  const s = ok(applyAction(rich(200, 5000), { type: 'move_gym' }));          // level 6 in the neighbourhood gym
  const bench = { type: 'install', gymId: 'neighbourhood', slotId: 'neighbourhood.bench.1', lineId: 'adjustable_bench' } as const;
  expect(err(applyAction({ ...s, xp: 350 }, { ...bench, lineId: 'treadmill', slotId: 'neighbourhood.cardio.1' })))
    .toBe('line_locked');                                                      // level 8, treadmill needs 9
  expect(err(applyAction(s, bench))).toBe('line_locked');                     // level 6, line needs 8
  expect(ok(applyAction({ ...s, xp: 350 }, bench)).coins).toBe(4500 - 150);   // level 8: 300 × 0.5
});

test('the Garage rack slot takes a rack or a pull station', () => {
  const s = rich(90, 500);   // level 4
  expect(applyAction(s, { type: 'install', gymId: 'garage', slotId: 'garage.rack.1', lineId: 'squat_rack' }).ok).toBe(true);
  expect(applyAction(s, { type: 'install', gymId: 'garage', slotId: 'garage.rack.1', lineId: 'pull_station' }).ok).toBe(true);
});

test('nothing can be upgraded in the Garage', () => {
  expect(err(applyAction(rich(3000, 5000), { type: 'upgrade', gymId: 'garage',
    slotId: 'garage.free_weights.1' }))).toBe('quality_locked');
});

test('move_gym gates on level then coins', () => {
  expect(err(applyAction(rich(199, 5000), { type: 'move_gym' }))).toBe('level_too_low');
  expect(err(applyAction(rich(200, 499), { type: 'move_gym' }))).toBe('insufficient_coins');
  const s = ok(applyAction(rich(200, 500), { type: 'move_gym' }));
  expect(s).toMatchObject({ coins: 0, currentGymId: 'neighbourhood' });
  expect(s.gyms.neighbourhood).toEqual({ floorStyleId: 'neighbourhood.floor.rubber',
    wallStyleId: 'neighbourhood.wall.white', ownedStyleIds: [] });
  expect(s.machines).toEqual(initialState().machines);   // the Garage is untouched
});

test('move_gym unlocks the gym after the highest unlocked, wherever the player is standing', () => {
  let s = ok(applyAction(rich(1200, 500), { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'set_current_gym', gymId: 'garage' }));
  s = ok(applyAction({ ...s, coins: 2000 }, { type: 'move_gym' }));
  expect(s.currentGymId).toBe('commercial');
  expect(Object.keys(s.gyms)).toEqual(['garage', 'neighbourhood', 'commercial']);
});

test('bring over copies for free and leaves the old gym alone', () => {
  let s = ok(applyAction(rich(200, 500), { type: 'move_gym' }));
  const r = applyAction(s, { type: 'bring_over', gymId: 'neighbourhood',
    slotId: 'neighbourhood.free_weights.1', fromSlotId: 'garage.free_weights.1' });
  expect(r).toMatchObject({ ok: true, coinsDelta: 0 });
  s = ok(r);
  expect(s.machines).toHaveLength(2);
  expect(s.machines[1]).toEqual({ gymId: 'neighbourhood', slotId: 'neighbourhood.free_weights.1',
    lineId: 'dumbbell_rack', quality: 1, installed: true, broughtFromSlotId: 'garage.free_weights.1' });
});

test('bring over failures', () => {
  const s = ok(applyAction(rich(200, 500), { type: 'move_gym' }));
  const b = (over: object) => err(applyAction(s, { type: 'bring_over', gymId: 'neighbourhood',
    slotId: 'neighbourhood.free_weights.1', fromSlotId: 'garage.free_weights.1', ...over } as Action));
  expect(b({ fromSlotId: 'garage.press.1' })).toBe('nothing_to_bring');          // empty source slot
  expect(b({ slotId: 'neighbourhood.cardio.1' })).toBe('category_mismatch');
  expect(b({ gymId: 'garage', slotId: 'garage.bench.1' })).toBe('nothing_to_bring'); // no previous gym
  expect(b({ gymId: 'commercial', slotId: 'commercial.free_weights.1' })).toBe('gym_locked');
  expect(b({ slotId: 'neighbourhood.nope.1' })).toBe('unknown_slot');
  expect(b({ fromSlotId: 'neighbourhood.free_weights.1' })).toBe('nothing_to_bring'); // not in the previous gym
});

test('a machine can be brought over only once', () => {
  // reach the commercial gym, which has two free-weights slots
  let s = ok(applyAction(rich(1200, 500), { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'bring_over', gymId: 'neighbourhood',
    slotId: 'neighbourhood.free_weights.1', fromSlotId: 'garage.free_weights.1' }));
  s = ok(applyAction({ ...s, coins: 2000 }, { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'bring_over', gymId: 'commercial',
    slotId: 'commercial.free_weights.1', fromSlotId: 'neighbourhood.free_weights.1' }));
  expect(err(applyAction(s, { type: 'bring_over', gymId: 'commercial',
    slotId: 'commercial.free_weights.2', fromSlotId: 'neighbourhood.free_weights.1' }))).toBe('already_brought');
});

test('bringing a machine into an occupied slot stores what was there', () => {
  let s = ok(applyAction(rich(200, 1000), { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'install', gymId: 'neighbourhood',
    slotId: 'neighbourhood.free_weights.1', lineId: 'kettlebell_rack' }));
  s = ok(applyAction(s, { type: 'bring_over', gymId: 'neighbourhood',
    slotId: 'neighbourhood.free_weights.1', fromSlotId: 'garage.free_weights.1' }));
  expect(s.machines.filter(m => m.gymId === 'neighbourhood').map(m => [m.lineId, m.installed]))
    .toEqual([['kettlebell_rack', false], ['dumbbell_rack', true]]);
});

test('a line bought in a slot cannot also be brought into it', () => {
  let s = ok(applyAction(rich(200, 1000), { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'install', gymId: 'neighbourhood',
    slotId: 'neighbourhood.free_weights.1', lineId: 'dumbbell_rack' }));
  expect(err(applyAction(s, { type: 'bring_over', gymId: 'neighbourhood',
    slotId: 'neighbourhood.free_weights.1', fromSlotId: 'garage.free_weights.1' }))).toBe('already_owned');
});

test('upgrade needs the tier level, then the coins; the old gym keeps its copy', () => {
  let s = ok(applyAction(rich(200, 500), { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'bring_over', gymId: 'neighbourhood',
    slotId: 'neighbourhood.free_weights.1', fromSlotId: 'garage.free_weights.1' }));
  const up = { type: 'upgrade', gymId: 'neighbourhood', slotId: 'neighbourhood.free_weights.1' } as const;
  expect(err(applyAction({ ...s, coins: 300 }, up))).toBe('quality_locked');       // level 6, tier 2 needs 7
  expect(err(applyAction({ ...s, xp: 270, coins: 299 }, up))).toBe('insufficient_coins');
  s = ok(applyAction({ ...s, xp: 270, coins: 300 }, up));
  expect(s.coins).toBe(0);
  expect(s.machines.map(m => [m.gymId, m.quality])).toEqual([['garage', 1], ['neighbourhood', 2]]);
  expect(err(applyAction({ ...s, coins: 9999 }, up))).toBe('quality_locked');      // gym cap is 2
});

test('upgrade failures', () => {
  const s = rich(3000, 9999);
  expect(err(applyAction(s, { type: 'upgrade', ...PRESS }))).toBe('slot_empty');
  expect(err(applyAction(s, { type: 'upgrade', gymId: 'elite', slotId: 'elite.press.1' }))).toBe('gym_locked');
  expect(err(applyAction(s, { type: 'upgrade', gymId: 'garage', slotId: 'garage.nope.1' }))).toBe('unknown_slot');
});

test('a machine at the top tier cannot be upgraded', () => {
  let s = rich(9999, 99999);
  for (let i = 0; i < 3; i++) s = ok(applyAction(s, { type: 'move_gym' }));
  const slot = { gymId: 'elite', slotId: 'elite.press.1' } as const;
  s = ok(applyAction({ ...s, coins: 99999 }, { type: 'install', ...slot, lineId: 'smith_machine' }));
  const before = s.coins;
  s = ok(applyAction(s, { type: 'upgrade', ...slot }));
  expect(before - s.coins).toBe(2250);                                             // 1500 × 1.5
  expect(s.machines.at(-1)).toMatchObject({ lineId: 'smith_machine', quality: 4 });
  expect(err(applyAction(s, { type: 'upgrade', ...slot }))).toBe('max_quality');
});

test('decor cannot be upgraded', () => {
  let s = ok(applyAction(rich(270, 500), { type: 'move_gym' }));
  s = ok(applyAction({ ...s, coins: 1000 }, { type: 'install', gymId: 'neighbourhood',
    slotId: 'neighbourhood.decor.1', lineId: 'plant' }));
  expect(s.coins).toBe(850);
  expect(err(applyAction(s, { type: 'upgrade', gymId: 'neighbourhood',
    slotId: 'neighbourhood.decor.1' }))).toBe('not_upgradable');
});

test('installing over a machine stores it; swapping back is free', () => {
  let s = ok(applyAction(rich(50, 1000), { type: 'install', gymId: 'garage',
    slotId: 'garage.free_weights.1', lineId: 'kettlebell_rack' })); 
  expect(s.coins).toBe(950);
  expect(s.machines.map(m => [m.lineId, m.installed])).toEqual([['dumbbell_rack', false], ['kettlebell_rack', true]]);
  const r = applyAction(s, { type: 'swap', gymId: 'garage', slotId: 'garage.free_weights.1', lineId: 'dumbbell_rack' });
  expect(r).toMatchObject({ ok: true, coinsDelta: 0 });
  expect(ok(r).machines.map(m => [m.lineId, m.installed])).toEqual([['dumbbell_rack', true], ['kettlebell_rack', false]]);
  expect(err(applyAction(s, { type: 'swap', gymId: 'garage', slotId: 'garage.free_weights.1',
    lineId: 'bench_press' }))).toBe('not_owned');
  expect(err(applyAction(s, { type: 'swap', gymId: 'garage', slotId: 'garage.free_weights.1',
    lineId: 'kettlebell_rack' }))).toBe('not_owned');                               // already the installed one
  expect(err(applyAction(s, { type: 'swap', gymId: 'elite', slotId: 'elite.press.1',
    lineId: 'dumbbell_rack' }))).toBe('gym_locked');
  expect(err(applyAction(s, { type: 'swap', gymId: 'garage', slotId: 'garage.nope.1',
    lineId: 'dumbbell_rack' }))).toBe('unknown_slot');
});

test('a slot never has two installed machines', () => {
  let s = rich(90, 1000);
  const slot = { gymId: 'garage', slotId: 'garage.rack.1' } as const;
  s = ok(applyAction(s, { type: 'install', ...slot, lineId: 'squat_rack' }));
  s = ok(applyAction(s, { type: 'install', ...slot, lineId: 'pull_station' }));
  s = ok(applyAction(s, { type: 'swap', ...slot, lineId: 'squat_rack' }));
  expect(s.machines.filter(m => m.slotId === slot.slotId && m.installed).map(m => m.lineId)).toEqual(['squat_rack']);
  expect(s.machines.filter(m => m.slotId === slot.slotId)).toHaveLength(2);
});

test('styles: buy applies it, switching back is free, wrong gym is rejected', () => {
  let s = ok(applyAction(rich(0, 300), { type: 'buy_style', gymId: 'garage', styleId: 'garage.floor.rubber_mat' }));
  expect(s.coins).toBe(0);
  expect(s.gyms.garage).toMatchObject({ floorStyleId: 'garage.floor.rubber_mat', ownedStyleIds: ['garage.floor.rubber_mat'] });
  s = ok(applyAction(s, { type: 'set_style', gymId: 'garage', styleId: 'garage.floor.concrete' }));
  expect(s.gyms.garage!.floorStyleId).toBe('garage.floor.concrete');
  expect(err(applyAction(s, { type: 'buy_style', gymId: 'garage', styleId: 'garage.floor.rubber_mat' }))).toBe('already_owned');
  expect(err(applyAction(s, { type: 'set_style', gymId: 'garage', styleId: 'garage.wall.pegboard' }))).toBe('not_owned');
  expect(err(applyAction(s, { type: 'buy_style', gymId: 'garage', styleId: 'elite.wall.neon' }))).toBe('unknown_style');
});

test('style failures', () => {
  const s = rich(0, 299);
  expect(err(applyAction(s, { type: 'buy_style', gymId: 'garage', styleId: 'garage.wall.painted' }))).toBe('insufficient_coins');
  expect(err(applyAction(s, { type: 'buy_style', gymId: 'garage', styleId: 'garage.floor.concrete' }))).toBe('already_owned');
  expect(err(applyAction(s, { type: 'buy_style', gymId: 'elite', styleId: 'elite.wall.neon' }))).toBe('gym_locked');
  expect(err(applyAction(s, { type: 'set_style', gymId: 'elite', styleId: 'elite.wall.neon' }))).toBe('gym_locked');
  expect(err(applyAction(s, { type: 'set_style', gymId: 'garage', styleId: 'elite.wall.neon' }))).toBe('unknown_style');
});

test('a wall style changes the wall and leaves the floor', () => {
  const s = ok(applyAction(rich(0, 400), { type: 'buy_style', gymId: 'garage', styleId: 'garage.wall.pegboard' }));
  expect(s.gyms.garage).toEqual({ floorStyleId: 'garage.floor.concrete',
    wallStyleId: 'garage.wall.pegboard', ownedStyleIds: ['garage.wall.pegboard'] });
});

test('moving on and visiting', () => {
  expect(err(applyAction(rich(0, 0), { type: 'set_current_gym', gymId: 'elite' }))).toBe('gym_locked');
  let s = ok(applyAction(rich(200, 500), { type: 'move_gym' }));
  s = ok(applyAction(s, { type: 'set_current_gym', gymId: 'garage' }));
  expect(s.currentGymId).toBe('garage');
});

test('there is no gym after the last', () => {
  let s = rich(9999, 99999);
  for (let i = 0; i < 3; i++) s = ok(applyAction(s, { type: 'move_gym' }));
  expect(s.currentGymId).toBe('elite');
  expect(err(applyAction(s, { type: 'move_gym' }))).toBe('no_next_gym');
});

test('coins never go negative across any successful action', () => {
  let s = rich(9999, 400);
  for (const a of [
    { type: 'install', ...PRESS, lineId: 'bench_press' },
    { type: 'install', gymId: 'garage', slotId: 'garage.bench.1', lineId: 'flat_bench' },
    { type: 'buy_style', gymId: 'garage', styleId: 'garage.wall.painted' },
  ] as Action[]) { const r = applyAction(s, a); if (r.ok) s = r.state; expect(s.coins).toBeGreaterThanOrEqual(0); }
  expect(s.coins).toBe(250);   // 400 − 100 − 50; the 300 style was refused
});

test('no action, successful or not, changes the state it was given', () => {
  const moved = ok(applyAction(rich(3000, 99999), { type: 'move_gym' }));
  const actions: Action[] = [
    { type: 'install', gymId: 'garage', slotId: 'garage.free_weights.1', lineId: 'kettlebell_rack' },
    { type: 'install', gymId: 'garage', slotId: 'garage.nope.1', lineId: 'kettlebell_rack' },
    { type: 'bring_over', gymId: 'neighbourhood', slotId: 'neighbourhood.free_weights.1', fromSlotId: 'garage.free_weights.1' },
    { type: 'bring_over', gymId: 'neighbourhood', slotId: 'neighbourhood.cardio.1', fromSlotId: 'garage.free_weights.1' },
    { type: 'upgrade', gymId: 'garage', slotId: 'garage.free_weights.1' },
    { type: 'swap', gymId: 'garage', slotId: 'garage.free_weights.1', lineId: 'bench_press' },
    { type: 'buy_style', gymId: 'garage', styleId: 'garage.floor.plywood' },
    { type: 'set_style', gymId: 'garage', styleId: 'garage.floor.plywood' },
    { type: 'move_gym' },
    { type: 'set_current_gym', gymId: 'garage' },
  ];
  for (const action of actions) {
    const snapshot = structuredClone(moved);
    const r = applyAction(moved, action);
    expect(moved, action.type).toEqual(snapshot);
    if (r.ok) expect(r.state.coins - moved.coins, action.type).toBe(r.coinsDelta);
  }
});

test('addRewards', () => {
  expect(addRewards(initialState(), 187, 20)).toMatchObject({ coins: 187, xp: 20 });
  expect(addRewards(initialState(), -5, -5)).toMatchObject({ coins: 0, xp: 0 });
  expect(addRewards(initialState(), NaN, Infinity)).toMatchObject({ coins: 0, xp: 0 });
  const s = initialState();
  addRewards(s, 10, 10);
  expect(s).toMatchObject({ coins: 0, xp: 0 });
});
