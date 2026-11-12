import { expect, test } from 'vitest';
import { levelForXp, totalXpForLevel, xpToNext } from '@fitheon/engine';

test.each([[1, 20], [2, 30], [9, 100], [10, 110], [11, 110], [50, 110]])(
  'xpToNext(%d) = %d', (level, xp) => expect(xpToNext(level)).toBe(xp));

test.each([[1, 0], [2, 20], [3, 50], [5, 140], [6, 200], [10, 540], [11, 650], [16, 1200], [30, 2740]])(
  'totalXpForLevel(%d) = %d', (level, xp) => expect(totalXpForLevel(level)).toBe(xp));

test.each([[0, 1], [19, 1], [20, 2], [50, 3], [140, 5], [199, 5], [200, 6], [540, 10], [649, 10], [650, 11], [2740, 30]])(
  'levelForXp(%d) = %d', (xp, level) => expect(levelForXp(xp)).toBe(level));

test('negative or fractional XP does not break levels', () => {
  expect(levelForXp(-5)).toBe(1);
  expect(levelForXp(20.9)).toBe(2);
  expect(levelForXp(NaN)).toBe(1);
});

test('levelForXp and totalXpForLevel agree far past the cap', () => {
  for (const level of [1, 7, 10, 11, 12, 99, 500]) {
    expect(levelForXp(totalXpForLevel(level))).toBe(level);
    expect(levelForXp(totalXpForLevel(level + 1) - 1)).toBe(level);
  }
});
