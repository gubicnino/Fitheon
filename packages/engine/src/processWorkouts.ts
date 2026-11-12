import {
  BASE_RATE, DAILY_MINUTES_CAP, DURATION_TOLERANCE_S, FUTURE_TOLERANCE_S, MAX_AGE_DAYS,
  MAX_WEEKLY_GOAL, MINUTES_EPSILON, MIN_DURATION_S, MIN_WEEKLY_GOAL, MS_PER_DAY, MS_PER_SECOND,
  OVERLAP_THRESHOLD, SECONDS_PER_MINUTE, WEEKLY_BONUS_XP, XP_PER_ACTIVE_DAY,
} from './constants';
import { localDateOfInstant, parseInstant, weekStartOf } from './localTime';
import { multiplierFor } from './multiplier';
import type {
  ProcessInput, ProcessResult, ProcessedWorkout, RawWorkout, WeeklyBonus, WorkoutStatus,
} from './types';

type Span = { startMs: number; endMs: number };
type Candidate = Span & { raw: RawWorkout; localDate: string; weekStart: string };

function byUuid(a: RawWorkout, b: RawWorkout): number {
  const x = String(a.hkUuid), y = String(b.hkUuid);
  return x < y ? -1 : x > y ? 1 : 0;
}

function overlapsTooMuch(a: Span, b: Span): boolean {
  const overlap = Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs);
  const shorter = Math.min(a.endMs - a.startMs, b.endMs - b.startMs);
  return overlap > OVERLAP_THRESHOLD * shorter;
}

function unrewarded(
  raw: RawWorkout, status: WorkoutStatus, localDate: string | null, weekStart: string | null,
): ProcessedWorkout {
  return { ...raw, localDate, weekStart, countedMinutes: 0, multiplier: null, status, coins: 0, xp: 0 };
}

/** Invalid for any reason other than unparseable dates, which the caller has already ruled out. */
function isInvalid(raw: RawWorkout, span: Span, nowMs: number): boolean {
  const { durationS } = raw;
  if (span.endMs <= span.startMs) return true;
  if (typeof durationS !== 'number' || !Number.isFinite(durationS) || durationS <= 0) return true;
  if (durationS > (span.endMs - span.startMs) / MS_PER_SECOND + DURATION_TOLERANCE_S) return true;
  if (span.endMs > nowMs + FUTURE_TOLERANCE_S * MS_PER_SECOND) return true;
  if (span.startMs < nowMs - MAX_AGE_DAYS * MS_PER_DAY) return true;
  return false;
}

/**
 * Applies the sync rules to a batch of workouts.
 *
 * Throws `invalid_date` for an unparseable `now` and `invalid_time_zone` for an
 * unknown zone: those are the caller's mistakes. Bad workout data never throws;
 * it is returned with status `invalid`. `history` is read, never changed.
 */
export function processWorkouts(input: ProcessInput): ProcessResult {
  const { timeZone } = input;
  const nowMs = parseInstant(input.now);
  if (nowMs === null) throw new Error('invalid_date');
  localDateOfInstant(nowMs, timeZone);   // rejects an unknown zone before any work is done

  // 1. Duplicates: already in history, or seen earlier in this batch.
  const seen = new Set<string>(input.history.map(h => h.hkUuid));
  const duplicates: string[] = [];
  const fresh: RawWorkout[] = [];
  for (const raw of input.incoming) {
    if (seen.has(raw.hkUuid)) {
      duplicates.push(raw.hkUuid);
    } else {
      seen.add(raw.hkUuid);
      fresh.push(raw);
    }
  }

  // 2. Classify. First match wins.
  const startOf = new Map<ProcessedWorkout, number>();
  const done: ProcessedWorkout[] = [];
  const finish = (workout: ProcessedWorkout, startMs: number | null) => {
    if (startMs !== null) startOf.set(workout, startMs);
    done.push(workout);
  };
  const survivors: Candidate[] = [];
  for (const raw of fresh) {
    const startMs = parseInstant(raw.startAt);
    const endMs = parseInstant(raw.endAt);
    if (startMs === null || endMs === null) {
      finish(unrewarded(raw, 'invalid', null, null), startMs);
      continue;
    }
    const span = { startMs, endMs };
    const localDate = localDateOfInstant(startMs, timeZone);
    const weekStart = weekStartOf(localDate);
    if (raw.userEntered) {
      finish(unrewarded(raw, 'user_entered', localDate, weekStart), startMs);
    } else if (isInvalid(raw, span, nowMs)) {
      finish(unrewarded(raw, 'invalid', null, null), startMs);
    } else if (raw.durationS < MIN_DURATION_S) {
      finish(unrewarded(raw, 'below_min', localDate, weekStart), startMs);
    } else {
      survivors.push({ ...span, raw, localDate, weekStart });
    }
  }

  // What history already counted: spans, minutes per day, active days per week.
  const countedSpans: Span[] = [];
  const minutesByDay = new Map<string, number>();
  const activeDaysByWeek = new Map<string, Set<string>>();
  const markActive = (weekStart: string, localDate: string) => {
    let days = activeDaysByWeek.get(weekStart);
    if (!days) activeDaysByWeek.set(weekStart, days = new Set());
    days.add(localDate);
  };
  for (const entry of input.history) {
    if (entry.status !== 'counted') continue;
    const startMs = parseInstant(entry.startAt);
    const endMs = parseInstant(entry.endAt);
    if (startMs !== null && endMs !== null && endMs > startMs) countedSpans.push({ startMs, endMs });
    if (entry.localDate === null) continue;
    const minutes = Number.isFinite(entry.countedMinutes) ? Math.max(0, entry.countedMinutes) : 0;
    minutesByDay.set(entry.localDate, (minutesByDay.get(entry.localDate) ?? 0) + minutes);
    if (entry.weekStart !== null) markActive(entry.weekStart, entry.localDate);
  }
  const activeDays = new Set(minutesByDay.keys());

  // 3. Overlap, longest span first. History always wins; within the batch the longer wins.
  survivors.sort((a, b) =>
    (b.endMs - b.startMs) - (a.endMs - a.startMs) || byUuid(a.raw, b.raw));
  const accepted: Candidate[] = [];
  for (const candidate of survivors) {
    const blocked = countedSpans.some(s => overlapsTooMuch(candidate, s))
      || accepted.some(a => overlapsTooMuch(candidate, a));
    if (blocked) {
      finish(unrewarded(candidate.raw, 'overlap', candidate.localDate, candidate.weekStart), candidate.startMs);
    } else {
      accepted.push(candidate);
    }
  }

  // 4. Rewards, in start order.
  accepted.sort((a, b) => a.startMs - b.startMs || byUuid(a.raw, b.raw));
  const awardedWeeks = new Set(input.bonusAwardedWeeks);
  const weeklyBonuses: WeeklyBonus[] = [];
  const goalFor = (weekStart: string): number | null => {
    const goal = Object.hasOwn(input.weekGoals, weekStart)
      ? input.weekGoals[weekStart] : input.defaultWeeklyGoal;
    if (typeof goal !== 'number' || !Number.isFinite(goal)) return null;
    return Math.min(Math.max(goal, MIN_WEEKLY_GOAL), MAX_WEEKLY_GOAL);
  };
  for (const { raw, startMs, localDate, weekStart } of accepted) {
    const remaining = DAILY_MINUTES_CAP - (minutesByDay.get(localDate) ?? 0);
    if (remaining < MINUTES_EPSILON) {
      finish(unrewarded(raw, 'daily_cap', localDate, weekStart), startMs);
      continue;
    }
    const countedMinutes = Math.min(raw.durationS / SECONDS_PER_MINUTE, remaining);
    const multiplier = multiplierFor(raw.activityType, raw.mets);
    const firstOfDay = !activeDays.has(localDate);
    minutesByDay.set(localDate, (minutesByDay.get(localDate) ?? 0) + countedMinutes);
    activeDays.add(localDate);
    finish({
      ...raw, localDate, weekStart, countedMinutes, multiplier, status: 'counted',
      coins: Math.round(countedMinutes * multiplier * BASE_RATE),
      xp: firstOfDay ? XP_PER_ACTIVE_DAY : 0,
    }, startMs);

    if (!firstOfDay) continue;
    markActive(weekStart, localDate);
    const goal = goalFor(weekStart);
    const daysThisWeek = activeDaysByWeek.get(weekStart)?.size ?? 0;
    if (goal !== null && daysThisWeek >= goal && !awardedWeeks.has(weekStart)) {
      awardedWeeks.add(weekStart);
      weeklyBonuses.push({ weekStart, xp: WEEKLY_BONUS_XP });
    }
  }

  // Unparseable starts sort last.
  const startKey = (w: ProcessedWorkout) => startOf.get(w) ?? Infinity;
  done.sort((a, b) => {
    const x = startKey(a), y = startKey(b);
    return (x === y ? 0 : x < y ? -1 : 1) || byUuid(a, b);
  });

  return {
    workouts: done,
    duplicates,
    weeklyBonuses,
    coins: done.reduce((sum, w) => sum + w.coins, 0),
    xp: done.reduce((sum, w) => sum + w.xp, 0) + weeklyBonuses.reduce((sum, b) => sum + b.xp, 0),
  };
}
