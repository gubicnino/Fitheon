import { expect, test } from 'vitest';
import { processWorkouts } from '@fitheon/engine';
import type { HistoryEntry, ProcessInput, ProcessResult, RawWorkout } from '@fitheon/engine';

const NOW = '2026-11-09T08:00:00Z';
const TZ = 'Europe/Ljubljana';
let n = 0;
function w(startAt: string, durationS: number, over: Partial<RawWorkout> = {}): RawWorkout {
  const endAt = new Date(Date.parse(startAt) + Math.ceil(durationS) * 1000).toISOString();
  return { hkUuid: `w${++n}`, activityType: 'TraditionalStrengthTraining', startAt, endAt,
    durationS, mets: null, sourceBundle: null, title: null, userEntered: false, ...over };
}
function run(incoming: RawWorkout[], over: Partial<ProcessInput> = {}) {
  return processWorkouts({ now: NOW, timeZone: TZ, history: [], incoming,
    defaultWeeklyGoal: 3, weekGoals: {}, bonusAwardedWeeks: [], ...over });
}
function asHistory(r: ProcessResult): HistoryEntry[] { return r.workouts; }

test('under 10 minutes earns nothing', () => {
  const r = run([w('2026-11-05T16:00:00Z', 599)]);
  expect(r.workouts[0]).toMatchObject({ status: 'below_min', coins: 0, xp: 0, countedMinutes: 0 });
});

test('exactly 10 minutes counts', () => {
  const r = run([w('2026-11-05T16:00:00Z', 600)]);
  expect(r.workouts[0]).toMatchObject({ status: 'counted', coins: 25, xp: 20, multiplier: 1.25 });
});

test('manually entered workouts are rejected', () => {
  const r = run([w('2026-11-05T16:00:00Z', 3600, { userEntered: true })]);
  expect(r.workouts[0]).toMatchObject({ status: 'user_entered', coins: 0, xp: 0 });
});

test('garbage data is invalid and never throws', () => {
  const good = w('2026-11-05T16:00:00Z', 3600);
  const r = run([
    { ...good, hkUuid: 'future', startAt: '2026-11-09T07:30:00Z', endAt: '2026-11-09T08:10:00Z', durationS: 2400 },
    { ...good, hkUuid: 'nan', durationS: NaN },
    { ...good, hkUuid: 'backwards', endAt: '2026-11-05T15:00:00Z' },
    { ...good, hkUuid: 'old', startAt: '2026-10-25T07:00:00Z', endAt: '2026-10-25T08:00:00Z' },
    { ...good, hkUuid: 'toolong', durationS: 9000 },
    { ...good, hkUuid: 'baddate', startAt: 'yesterday' },
  ]);
  expect(r.workouts).toHaveLength(6);
  expect(r.workouts.every(x => x.status === 'invalid' && x.coins === 0 && x.xp === 0)).toBe(true);
  expect(r.coins).toBe(0);
});

test('wrongly typed fields from an untrusted client are invalid, not exceptions', () => {
  const good = w('2026-11-05T16:00:00Z', 3600);
  const bad = (over: object) => ({ ...good, ...over }) as RawWorkout;
  const r = run([
    bad({ hkUuid: 'g1', startAt: undefined }),
    bad({ hkUuid: 'g2', endAt: 12345 }),
    bad({ hkUuid: 'g3', durationS: '3600' }),
    bad({ hkUuid: 'g4', durationS: Infinity }),
    bad({ hkUuid: 'g5', durationS: -10 }),
    bad({ hkUuid: 'g6', userEntered: true, startAt: 'yesterday' }),
  ]);
  expect(r.workouts.map(x => x.status)).toEqual(Array(6).fill('invalid'));
  expect(r.workouts.every(x => x.localDate === null && x.weekStart === null)).toBe(true);
  expect(r).toMatchObject({ coins: 0, xp: 0, weeklyBonuses: [] });
});

test('a bad time zone or clock is the caller\'s error, by name', () => {
  expect(() => run([], { timeZone: 'Mars/Olympus' })).toThrow('invalid_time_zone');
  expect(() => run([], { now: 'now' })).toThrow('invalid_date');
});

test('an end time slightly ahead of the clock is tolerated', () => {
  const r = run([w('2026-11-09T07:00:00Z', 3840)]);   // ends 08:04, now is 08:00
  expect(r.workouts[0]!.status).toBe('counted');
});

test('the same workout is rewarded once', () => {
  const a = w('2026-11-05T16:00:00Z', 3600);
  const first = run([a, { ...a }]);
  expect(first.workouts).toHaveLength(1);
  expect(first.duplicates).toEqual([a.hkUuid]);
  const second = run([a], { history: asHistory(first) });
  expect(second.workouts).toHaveLength(0);
  expect(second.coins).toBe(0);
  expect(second.xp).toBe(0);
});

test('a workout that was rejected before is still a duplicate', () => {
  const short = w('2026-11-05T16:00:00Z', 300);
  const first = run([short]);
  const second = run([{ ...short, durationS: 3600, endAt: '2026-11-05T17:00:00Z' }], { history: asHistory(first) });
  expect(second.workouts).toHaveLength(0);
  expect(second.duplicates).toEqual([short.hkUuid]);
});

test('overlapping workouts in one batch: the longer wins', () => {
  const long = w('2026-11-05T16:00:00Z', 3600);
  const short = w('2026-11-05T16:10:00Z', 2400);
  const r = run([short, long]);
  expect(r.workouts.find(x => x.hkUuid === long.hkUuid)!.status).toBe('counted');
  expect(r.workouts.find(x => x.hkUuid === short.hkUuid)!.status).toBe('overlap');
});

test('a workout already counted is never displaced by a later arrival', () => {
  const first = run([w('2026-11-05T16:00:00Z', 3600)]);
  const r = run([w('2026-11-05T16:00:00Z', 4200)], { history: asHistory(first) });
  expect(r.workouts[0]).toMatchObject({ status: 'overlap', coins: 0, xp: 0 });
});

test('a small overlap is fine', () => {
  const r = run([w('2026-11-05T16:00:00Z', 3600), w('2026-11-05T16:50:00Z', 3600)]);
  expect(r.workouts.map(x => x.status)).toEqual(['counted', 'counted']);
});

test('exactly half overlap is allowed, a second more is not', () => {
  const half = run([w('2026-11-05T16:00:00Z', 3600), w('2026-11-05T16:30:00Z', 3600)]);
  expect(half.workouts.map(x => x.status)).toEqual(['counted', 'counted']);
  const more = run([w('2026-11-05T16:00:00Z', 3600), w('2026-11-05T16:29:59Z', 3600, { hkUuid: 'zz' })]);
  expect(more.workouts.map(x => x.status).sort()).toEqual(['counted', 'overlap']);
});

test('a workout overlapping only a rejected history entry is not blocked', () => {
  const first = run([w('2026-11-05T16:00:00Z', 3600, { userEntered: true })]);
  const r = run([w('2026-11-05T16:00:00Z', 3600)], { history: asHistory(first) });
  expect(r.workouts[0]!.status).toBe('counted');
});

test('120 counted minutes per day, with partial counting', () => {
  const r = run([
    w('2026-11-05T08:00:00Z', 3000), w('2026-11-05T12:00:00Z', 3000),
    w('2026-11-05T16:00:00Z', 3000), w('2026-11-05T18:00:00Z', 3000),
  ]);
  expect(r.workouts.map(x => x.countedMinutes)).toEqual([50, 50, 20, 0]);
  expect(r.workouts.map(x => x.coins)).toEqual([125, 125, 50, 0]);
  expect(r.workouts.map(x => x.status)).toEqual(['counted', 'counted', 'counted', 'daily_cap']);
  expect(r.workouts.map(x => x.xp)).toEqual([20, 0, 0, 0]);
});

test('the daily cap includes minutes from history', () => {
  const first = run([w('2026-11-05T08:00:00Z', 6000)]);           // 100 min
  const r = run([w('2026-11-05T16:00:00Z', 3000)], { history: asHistory(first) });
  expect(r.workouts[0]).toMatchObject({ status: 'counted', countedMinutes: 20, xp: 0 });
});

test('the daily cap is per local day, not per UTC day', () => {
  const r = run([w('2026-11-04T21:00:00Z', 7200), w('2026-11-04T23:30:00Z', 7200)]);
  expect(r.workouts.map(x => [x.localDate, x.countedMinutes, x.xp])).toEqual([
    ['2026-11-04', 120, 20], ['2026-11-05', 120, 20],
  ]);
});

test('a late-arriving earlier workout earns coins but no second XP', () => {
  const first = run([w('2026-11-05T16:00:00Z', 3600)]);
  const r = run([w('2026-11-05T07:00:00Z', 1800)], { history: asHistory(first) });
  expect(r.workouts[0]).toMatchObject({ status: 'counted', xp: 0, coins: 75 });
});

test('history is never modified', () => {
  const history = asHistory(run([w('2026-11-05T16:00:00Z', 3600)]));
  const snapshot = structuredClone(history);
  run([w('2026-11-05T07:00:00Z', 1800), w('2026-11-05T16:00:00Z', 4200)], { history });
  expect(history).toEqual(snapshot);
});

test('a workout just before local midnight UTC belongs to the next local day', () => {
  const r = run([w('2026-11-03T23:30:00Z', 1800)]);
  expect(r.workouts[0]).toMatchObject({ localDate: '2026-11-04', weekStart: '2026-11-02' });
});

test('weekly bonus lands on the day the goal is reached', () => {
  const r = run([
    w('2026-11-02T16:00:00Z', 3600), w('2026-11-03T16:00:00Z', 3600), w('2026-11-04T16:00:00Z', 3600),
  ]);
  expect(r.weeklyBonuses).toEqual([{ weekStart: '2026-11-02', xp: 50 }]);
  expect(r.xp).toBe(110);
});

test('weekly bonus is not awarded twice or against a different fixed goal', () => {
  const three = () => [
    w('2026-11-02T16:00:00Z', 3600), w('2026-11-03T16:00:00Z', 3600), w('2026-11-04T16:00:00Z', 3600),
  ];
  expect(run(three(), { bonusAwardedWeeks: ['2026-11-02'] }).weeklyBonuses).toEqual([]);
  expect(run(three(), { weekGoals: { '2026-11-02': 4 } }).weeklyBonuses).toEqual([]);
});

test('weekly bonus is awarded once even when more days follow in the batch', () => {
  const r = run([2, 3, 4, 5, 6].map(d => w(`2026-11-0${d}T16:00:00Z`, 3600)));
  expect(r.weeklyBonuses).toEqual([{ weekStart: '2026-11-02', xp: 50 }]);
  expect(r.xp).toBe(150);
});

test('two workouts on one day are one active day', () => {
  const r = run([
    w('2026-11-02T07:00:00Z', 1800), w('2026-11-02T16:00:00Z', 3600), w('2026-11-03T16:00:00Z', 3600),
  ]);
  expect(r.weeklyBonuses).toEqual([]);
});

test('weekly bonus counts active days across history', () => {
  const first = run([w('2026-11-02T16:00:00Z', 3600), w('2026-11-03T16:00:00Z', 3600)]);
  expect(first.weeklyBonuses).toEqual([]);
  const r = run([w('2026-11-04T16:00:00Z', 3600)], { history: asHistory(first) });
  expect(r.weeklyBonuses).toEqual([{ weekStart: '2026-11-02', xp: 50 }]);
});

test('measured intensity raises the multiplier', () => {
  const r = run([w('2026-11-05T16:00:00Z', 1200, { activityType: 'Walking', mets: 8.77 })]);
  expect(r.workouts[0]).toMatchObject({ multiplier: 1.5, coins: 60 });
});
