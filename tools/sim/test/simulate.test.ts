import { expect, test } from 'vitest';
import { simulate } from '@fitheon/sim';

test('a typical week earns 375 coins and 110 XP', () => {
  const r = simulate('typical', 1);
  expect(r.weekly[0]).toMatchObject({ coinsEarned: 375, xp: 110, level: 4 });
});

test('a heavy week earns more coins but under twice the XP', () => {
  const r = simulate('heavy', 1);
  expect(r.weekly[0]!.coinsEarned).toBe(1398);   // 6 × (188 + 45)
  expect(r.weekly[0]!.xp).toBe(170);             // 6 × 20 + 50
});

test('the typical user reaches the second gym by week 3', () => {
  expect(simulate('typical', 4).arrivalWeek.neighbourhood).toBeLessThanOrEqual(3);
});

test('both profiles reach the last gym within 60 weeks, heavy first', () => {
  const t = simulate('typical', 60), h = simulate('heavy', 60);
  for (const gym of ['neighbourhood', 'commercial', 'elite'] as const) {
    expect(t.arrivalWeek[gym]).toBeDefined();
    expect(h.arrivalWeek[gym]!).toBeLessThanOrEqual(t.arrivalWeek[gym]!);
  }
});

test('coins are never negative and XP never falls', () => {
  const r = simulate('heavy', 30);
  expect(r.weekly.every(w => w.coinsHeld >= 0)).toBe(true);
  expect(r.weekly.every((w, i) => i === 0 || w.xp >= r.weekly[i - 1]!.xp)).toBe(true);
});

test('the simulation is deterministic', () => {
  expect(simulate('typical', 20)).toEqual(simulate('typical', 20));
});
