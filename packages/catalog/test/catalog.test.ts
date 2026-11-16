import { expect, test } from 'vitest';
import {
  GYMS, MACHINE_LINES, QUALITIES, STARTER, defaultStyle, getGym, getLine, getSlot,
  installPrice, nextGym, previousGym, upgradePrice,
} from '@fitheon/catalog';
import type { Quality } from '@fitheon/catalog';

test('four gyms in order with the spec gates', () => {
  expect(GYMS.map(g => [g.id, g.levelGate, g.moveCost, g.qualityCap, g.slots.length])).toEqual([
    ['garage', 1, 0, 1, 5], ['neighbourhood', 6, 500, 2, 9],
    ['commercial', 16, 2000, 3, 15], ['elite', 30, 5000, 4, 22],
  ]);
  expect(GYMS.map(g => g.order)).toEqual([1, 2, 3, 4]);
});

test('ids are unique', () => {
  const slotIds = GYMS.flatMap(g => g.slots.map(s => s.id));
  const styleIds = GYMS.flatMap(g => g.styles.map(s => s.id));
  const lineIds = MACHINE_LINES.map(l => l.id);
  for (const ids of [slotIds, styleIds, lineIds]) expect(new Set(ids).size).toBe(ids.length);
});

test('22 lines: 17 machines and 5 decor', () => {
  expect(MACHINE_LINES.filter(l => l.flatPrice === null)).toHaveLength(17);
  expect(MACHINE_LINES.filter(l => l.flatPrice !== null)).toHaveLength(5);
});

test('slot ids are the gym id and a number from 1', () => {
  expect(getGym('garage')!.slots.map(s => s.id))
    .toEqual(['garage.1', 'garage.2', 'garage.3', 'garage.4', 'garage.5']);
  for (const gym of GYMS) {
    expect(gym.slots.map(s => s.id), gym.id).toEqual(gym.slots.map((_, i) => `${gym.id}.${i + 1}`));
  }
  expect(getGym('elite')!.slots).toHaveLength(22);
  expect(getSlot('elite', 'elite.22')).toEqual({ id: 'elite.22' });
  expect(getSlot('elite', 'elite.23')).toBeUndefined();
});

test('no machine unlocks before its starting tier is available', () => {
  for (const line of MACHINE_LINES) {
    expect(line.unlockLevel, line.id).toBeGreaterThanOrEqual(QUALITIES[line.startQuality].playerLevel);
  }
});

test('every gym has a machine to buy at its gate level', () => {
  for (const gym of GYMS) {
    const available = MACHINE_LINES.filter(l => l.flatPrice === null
      && l.startQuality <= gym.qualityCap && l.unlockLevel <= gym.levelGate);
    expect(available.length, gym.id).toBeGreaterThan(0);
  }
});

test('a new player can afford something for every Garage slot by level 4', () => {
  const garage = getGym('garage')!;
  const early = MACHINE_LINES.filter(l => l.flatPrice === null
    && l.startQuality <= garage.qualityCap && l.unlockLevel <= 4);
  expect(early.map(l => l.id)).toEqual(
    ['dumbbell_rack', 'adjustable_bench', 'bench_press', 'exercise_bike', 'squat_rack', 'calisthenics_bar']);
  // Any machine fits any slot, so the four empty Garage slots cost at most four of the cheapest.
  const cheapest = Math.min(...early.map(installPrice));
  expect(cheapest).toBe(50);
  expect(cheapest * (garage.slots.length - 1)).toBeLessThanOrEqual(375);   // one typical week
});

test('each gym has exactly one free floor and one free wall, and three of each', () => {
  for (const gym of GYMS) for (const kind of ['floor', 'wall'] as const) {
    const styles = gym.styles.filter(s => s.kind === kind);
    expect(styles).toHaveLength(3);
    expect(styles.filter(s => s.price === 0)).toHaveLength(1);
    expect(defaultStyle(gym, kind).price).toBe(0);
  }
});

test('style ids and prices', () => {
  const style = (gymId: string, id: string) => getGym(gymId)!.styles.find(s => s.id === id);
  expect(style('garage', 'garage.floor.rubber_mat')).toMatchObject({ kind: 'floor', price: 300 });
  expect(style('neighbourhood', 'neighbourhood.wall.mirror')).toMatchObject({ kind: 'wall', price: 700 });
  expect(style('commercial', 'commercial.floor.turf')).toMatchObject({ price: 1000 });
  expect(style('elite', 'elite.wall.neon')).toMatchObject({ price: 1500 });
  expect(defaultStyle(getGym('elite')!, 'floor').id).toBe('elite.floor.dark_rubber');
});

test('gates and tier levels only go up', () => {
  const gates = GYMS.map(g => g.levelGate);
  expect([...gates].sort((a, b) => a - b)).toEqual(gates);
  expect([1, 2, 3, 4].map(q => QUALITIES[q as Quality].playerLevel)).toEqual([1, 7, 18, 32]);
  expect([1, 2, 3, 4].map(q => QUALITIES[q as Quality].name)).toEqual(['Basic', 'Standard', 'Commercial', 'Elite']);
});

test('machine lines carry the spec data', () => {
  const machines = MACHINE_LINES.filter(l => l.flatPrice === null)
    .map(l => [l.id, l.name, l.startQuality, l.unlockLevel, l.sizeClass]);
  expect(machines).toEqual([
    ['dumbbell_rack', 'Dumbbell rack', 1, 1, 1],
    ['adjustable_bench', 'Adjustable bench', 1, 1, 0.5],
    ['bench_press', 'Bench press', 1, 1, 1],
    ['exercise_bike', 'Exercise bike', 1, 2, 1],
    ['squat_rack', 'Squat rack', 1, 3, 1],
    ['calisthenics_bar', 'Calisthenics bar', 1, 4, 1],
    ['treadmill', 'Treadmill', 2, 7, 1.5],
    ['leg_extension', 'Leg extension', 2, 8, 1],
    ['leg_curl', 'Leg curl', 2, 9, 1],
    ['pec_deck', 'Pec deck', 2, 10, 1.5],
    ['rowing_machine', 'Rowing machine', 2, 11, 1],
    ['cable_machine', 'Cable machine', 2, 12, 1.5],
    ['leg_press', 'Leg press', 2, 13, 1.5],
    ['smith_machine', 'Smith machine', 2, 14, 1.5],
    ['hack_squat', 'Hack squat', 2, 15, 1.5],
    ['stair_master', 'Stair master', 3, 18, 1.5],
    ['pendulum_squat', 'Pendulum squat', 3, 20, 1.5],
  ]);
  expect(MACHINE_LINES.filter(l => l.flatPrice !== null).map(l => [l.id, l.flatPrice, l.unlockLevel])).toEqual([
    ['plant', 150, 6], ['wall_tv', 400, 6], ['sofa', 500, 6], ['lockers', 600, 6], ['reception_desk', 800, 6],
  ]);
  expect(getLine('reception_desk')).toMatchObject({ name: 'Reception desk', startQuality: 1 });
  expect(MACHINE_LINES.every(l => !('categories' in l))).toBe(true);
  for (const removed of ['flat_bench', 'kettlebell_rack', 'pull_station', 'power_rack', 'multi_gym']) {
    expect(getLine(removed), removed).toBeUndefined();
  }
  expect(getLine('constructor')).toBeUndefined();
});

test('pricing', () => {
  expect(installPrice(getLine('dumbbell_rack')!)).toBe(100);
  expect(installPrice(getLine('adjustable_bench')!)).toBe(50);
  expect(installPrice(getLine('treadmill')!)).toBe(450);
  expect(installPrice(getLine('leg_extension')!)).toBe(300);
  expect(installPrice(getLine('smith_machine')!)).toBe(450);
  expect(installPrice(getLine('pendulum_squat')!)).toBe(1200);
  expect(installPrice(getLine('sofa')!)).toBe(500);
  expect(upgradePrice(getLine('bench_press')!, 2)).toBe(300);
  expect(upgradePrice(getLine('adjustable_bench')!, 4)).toBe(750);
});

test('navigation and lookups', () => {
  expect(nextGym('garage')!.id).toBe('neighbourhood');
  expect(nextGym('elite')).toBeUndefined();
  expect(previousGym('garage')).toBeUndefined();
  expect(previousGym('elite')!.id).toBe('commercial');
  expect(getSlot('garage', 'garage.4')).toEqual({ id: 'garage.4' });
  expect(getSlot('garage', 'elite.1')).toBeUndefined();
  expect(getGym('nowhere')).toBeUndefined();
  expect(STARTER).toEqual({ gymId: 'garage', slotId: 'garage.1', lineId: 'dumbbell_rack' });
});
