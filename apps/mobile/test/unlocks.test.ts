import { expect, test } from 'vitest';

import { unlocksBetween } from '../src/state/unlocks';

const machineIds = (levelBefore: number, levelAfter: number): string[] =>
  unlocksBetween(levelBefore, levelAfter).flatMap(u => (u.kind === 'machine' ? [u.lineId] : []));

test('no level change unlocks nothing', () => {
  expect(unlocksBetween(3, 3)).toEqual([]);
});

test('going from level 1 to 5 unlocks every machine gated at levels 2 to 5', () => {
  const ids = machineIds(1, 5);

  expect(ids).toEqual(['exercise_bike', 'squat_rack', 'calisthenics_bar']);
  expect(ids).not.toContain('dumbbell_rack');
  expect(ids).not.toContain('treadmill');
});

test('an unlock carries its name and level', () => {
  expect(unlocksBetween(1, 2)).toEqual([{ kind: 'machine', lineId: 'exercise_bike', name: 'Exercise bike', level: 2 }]);
});

test('reaching level 6 unlocks the Neighbourhood gym', () => {
  expect(unlocksBetween(5, 6)).toContainEqual({ kind: 'gym', gymId: 'neighbourhood', name: 'Neighbourhood gym', level: 6 });
});

test('reaching level 7 unlocks Standard quality and the Treadmill', () => {
  const unlocks = unlocksBetween(6, 7);

  expect(unlocks).toContainEqual({ kind: 'quality', quality: 2, name: 'Standard', level: 7 });
  expect(unlocks).toContainEqual({ kind: 'machine', lineId: 'treadmill', name: 'Treadmill', level: 7 });
});

test('unlocks are ordered by level, then machines, qualities and gyms', () => {
  const unlocks = unlocksBetween(1, 40);
  const kindOrder = { machine: 0, quality: 1, gym: 2 };

  for (let i = 1; i < unlocks.length; i++) {
    const a = unlocks[i - 1]!;
    const b = unlocks[i]!;
    expect(a.level < b.level || (a.level === b.level && kindOrder[a.kind] <= kindOrder[b.kind])).toBe(true);
  }
  expect(unlocks.at(-1)).toEqual({ kind: 'quality', quality: 4, name: 'Elite', level: 32 });
});

test('a level drop unlocks nothing', () => {
  expect(unlocksBetween(7, 1)).toEqual([]);
});
