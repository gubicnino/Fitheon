import { expect, test } from 'vitest';
import { localDateOf, weekStartOf } from '@fitheon/engine';

test('local date follows the zone, not UTC', () => {
  expect(localDateOf('2026-11-01T18:33:43Z', 'Europe/Ljubljana')).toBe('2026-11-01');
  expect(localDateOf('2026-11-01T23:30:00Z', 'Europe/Ljubljana')).toBe('2026-11-02');
  expect(localDateOf('2026-11-02T04:30:00Z', 'America/Los_Angeles')).toBe('2026-11-01');
});

test('daylight-saving change night', () => {
  expect(localDateOf('2026-03-28T23:30:00Z', 'Europe/Ljubljana')).toBe('2026-03-29');
  expect(localDateOf('2026-03-29T21:59:00Z', 'Europe/Ljubljana')).toBe('2026-03-29');
  expect(localDateOf('2026-03-29T22:00:00Z', 'Europe/Ljubljana')).toBe('2026-03-30');
});

test('autumn daylight-saving change night', () => {
  expect(localDateOf('2026-10-24T22:30:00Z', 'Europe/Ljubljana')).toBe('2026-10-25');
  expect(localDateOf('2026-10-25T22:59:00Z', 'Europe/Ljubljana')).toBe('2026-10-25');
  expect(localDateOf('2026-10-25T23:00:00Z', 'Europe/Ljubljana')).toBe('2026-10-26');
});

test('an instant with an offset is the same instant', () => {
  expect(localDateOf('2026-11-02T00:30:00+01:00', 'Europe/Ljubljana')).toBe('2026-11-02');
  expect(localDateOf('2026-11-02T00:30:00+01:00', 'UTC')).toBe('2026-11-01');
});

test('weeks start on Monday', () => {
  expect(weekStartOf('2026-11-01')).toBe('2026-10-26'); // a Sunday
  expect(weekStartOf('2026-11-02')).toBe('2026-11-02'); // a Monday
  expect(weekStartOf('2026-11-08')).toBe('2026-11-02');
  expect(weekStartOf('2027-01-01')).toBe('2026-12-28');
});

test('bad input throws a named error', () => {
  expect(() => localDateOf('2026-11-01T10:00:00Z', 'Mars/Olympus')).toThrow('invalid_time_zone');
  expect(() => localDateOf('not a date', 'Europe/Ljubljana')).toThrow('invalid_date');
  expect(() => weekStartOf('2026-13-40')).toThrow('invalid_date');
  expect(() => weekStartOf('soon')).toThrow('invalid_date');
});
