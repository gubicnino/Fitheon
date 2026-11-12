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

test('20 lines: 15 machines and 5 decor', () => {
  expect(MACHINE_LINES.filter(l => l.flatPrice === null)).toHaveLength(15);
  expect(MACHINE_LINES.filter(l => l.flatPrice !== null)).toHaveLength(5);
});

test('slot counts per category match the spec table', () => {
  const counts = (gymId: string) => {
    const out: Record<string, number> = {};
    for (const slot of getGym(gymId)!.slots) {
      const category = slot.id.split('.')[1]!;
      out[category] = (out[category] ?? 0) + 1;
    }
    return out;
  };
  expect(counts('garage')).toEqual({ free_weights: 1, bench: 1, press: 1, rack: 1, cardio: 1 });
  expect(counts('neighbourhood')).toEqual(
    { free_weights: 1, bench: 1, press: 1, rack: 1, pull: 1, cardio: 2, machine: 1, decor: 1 });
  expect(counts('commercial')).toEqual(
    { free_weights: 2, bench: 2, press: 1, rack: 2, pull: 1, cardio: 3, machine: 2, decor: 2 });
  expect(counts('elite')).toEqual(
    { free_weights: 2, bench: 2, press: 2, rack: 2, pull: 2, cardio: 4, machine: 4, decor: 4 });
});

test('slots accept their own category and sit in the right zone', () => {
  expect(getSlot('elite', 'elite.cardio.4')).toEqual({ id: 'elite.cardio.4', zone: 'cardio', accepts: ['cardio'] });
  expect(getSlot('commercial', 'commercial.bench.2')!.zone).toBe('free_weights');
  expect(getSlot('neighbourhood', 'neighbourhood.pull.1')!.zone).toBe('racks');
  expect(getSlot('neighbourhood', 'neighbourhood.rack.1')!.accepts).toEqual(['rack']);
  expect(getSlot('elite', 'elite.machine.1')!.zone).toBe('machines');
  expect(getSlot('elite', 'elite.decor.1')!.zone).toBe('lounge');
});

test('every slot can eventually be filled within its gym', () => {
  for (const gym of GYMS) for (const slot of gym.slots) {
    const fits = MACHINE_LINES.filter(l =>
      l.categories.some(c => slot.accepts.includes(c)) && l.startQuality <= gym.qualityCap);
    expect(fits.length, slot.id).toBeGreaterThan(0);
  }
});

test('every Garage slot is fillable by level 4', () => {
  const garage = getGym('garage')!;
  for (const slot of garage.slots) {
    const early = MACHINE_LINES.some(l => l.categories.some(c => slot.accepts.includes(c))
      && l.startQuality === 1 && l.unlockLevel <= 4);
    expect(early, slot.id).toBe(true);
  }
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
  expect(getLine('smith_machine')).toMatchObject(
    { categories: ['press', 'rack'], startQuality: 3, unlockLevel: 20, sizeClass: 1.5, flatPrice: null });
  expect(getLine('kettlebell_rack')).toMatchObject({ categories: ['free_weights'], unlockLevel: 2, sizeClass: 0.5 });
  expect(getLine('reception_desk')).toMatchObject({ categories: ['decor'], unlockLevel: 6, flatPrice: 800 });
  expect(getLine('constructor')).toBeUndefined();
});

test('pricing', () => {
  expect(installPrice(getLine('dumbbell_rack')!)).toBe(100);
  expect(installPrice(getLine('flat_bench')!)).toBe(50);
  expect(installPrice(getLine('treadmill')!)).toBe(450);
  expect(installPrice(getLine('smith_machine')!)).toBe(1200);
  expect(installPrice(getLine('sofa')!)).toBe(500);
  expect(upgradePrice(getLine('bench_press')!, 2)).toBe(300);
  expect(upgradePrice(getLine('flat_bench')!, 4)).toBe(750);
});

test('navigation and lookups', () => {
  expect(nextGym('garage')!.id).toBe('neighbourhood');
  expect(nextGym('elite')).toBeUndefined();
  expect(previousGym('garage')).toBeUndefined();
  expect(previousGym('elite')!.id).toBe('commercial');
  expect(getSlot('garage', 'garage.rack.1')!.accepts).toEqual(['rack', 'pull']);
  expect(getSlot('garage', 'elite.press.1')).toBeUndefined();
  expect(getGym('nowhere')).toBeUndefined();
  expect(STARTER.slotId).toBe('garage.free_weights.1');
});
