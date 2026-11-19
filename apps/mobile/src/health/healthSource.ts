// Where workouts come from. Expo Go cannot read Apple Health, so until the HealthKit phase the
// app uses the mock below, behind the same interface the HealthKit source will implement.
import type { RawWorkout } from '@fitheon/engine';
import { NOVEMBER_2026 } from '@fitheon/engine/fixtures/november2026';

export interface HealthSource {
  /** The recent workouts the device knows of, as of `now`. */
  fetchWorkouts(now: string): Promise<RawWorkout[]>;
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const WEEK_MS = 7 * DAY_MS;
// The engine marks a workout that started more than 14 days before `now` invalid.
const MAX_AGE_MS = 14 * DAY_MS;

const MOCK_SOURCE = 'com.fitheon.mock';

/**
 * The November 2026 fixture moved by whole weeks so its first workout starts later than
 * `now - 14 days + 1 minute`, the smallest such shift (possibly none). Whole weeks keep
 * weekdays, so the Monday-to-Sunday weeks and the totals stay the same. The fixture's ids are
 * kept, so importing again is all duplicates. Workouts that end after `now` are left out.
 */
export function novemberWeekAt(now: string): RawWorkout[] {
  const nowMs = Date.parse(now);
  const first = NOVEMBER_2026[0];
  if (Number.isNaN(nowMs) || first === undefined) return [];

  const earliestStart = nowMs - MAX_AGE_MS + MINUTE_MS;
  const weeks = Math.floor((earliestStart - Date.parse(first.startAt)) / WEEK_MS) + 1;
  const shiftMs = weeks * WEEK_MS;

  const shift = (iso: string): string => new Date(Date.parse(iso) + shiftMs).toISOString();
  return NOVEMBER_2026.map(w => (shiftMs === 0 ? { ...w } : { ...w, startAt: shift(w.startAt), endAt: shift(w.endAt) }))
    .filter(w => Date.parse(w.endAt) <= nowMs);
}

/** Workouts "Simulate workout" picks from. */
export const WORKOUT_TEMPLATES: readonly {
  activityType: string;
  minutes: number;
  mets: number | null;
  title: string | null;
}[] = [
  // No METs: strength still earns its type base of 1.25.
  { activityType: 'TraditionalStrengthTraining', minutes: 60, mets: null, title: 'Full body' },
  { activityType: 'Running', minutes: 45, mets: 9, title: null },
  { activityType: 'Walking', minutes: 30, mets: 3.5, title: null },
  // Under the 10-minute minimum, so it shows 'below_min'.
  { activityType: 'Cycling', minutes: 7, mets: 8, title: null },
];

/** A workout from the template `pick` (in [0, 1)) chooses, ending at `now`. */
export function generateWorkout(now: string, pick: number): RawWorkout {
  const index = Math.min(WORKOUT_TEMPLATES.length - 1, Math.max(0, Math.floor(pick * WORKOUT_TEMPLATES.length)));
  const template = WORKOUT_TEMPLATES[index]!;
  const endMs = Date.parse(now);
  const startAt = new Date(endMs - template.minutes * MINUTE_MS).toISOString();
  return {
    hkUuid: `mock-${startAt}`,
    activityType: template.activityType,
    startAt,
    endAt: new Date(endMs).toISOString(),
    durationS: template.minutes * 60,
    mets: template.mets,
    sourceBundle: MOCK_SOURCE,
    title: template.title,
    userEntered: false,
  };
}

/** The mock: the device "has" the November week, at whatever date `now` is. */
export const mockHealthSource: HealthSource = {
  fetchWorkouts: async now => novemberWeekAt(now),
};
