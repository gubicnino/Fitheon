import { DAYS_PER_WEEK, MS_PER_DAY, MS_PER_SECOND, SECONDS_PER_MINUTE } from '@fitheon/engine';
import type { RawWorkout } from '@fitheon/engine';

export type ProfileName = 'typical' | 'heavy';

/** Week 0 of every simulation starts on this Monday (UTC midnight). */
export const SIM_START_MS = Date.UTC(2027, 0, 4);
export const SIM_TIME_ZONE = 'Europe/Ljubljana';
export const SIM_WEEKLY_GOAL = 3;
/** Each week is synced on the following Monday at this hour (UTC). */
export const SYNC_HOUR_UTC = 8;
/** How many earlier weeks of processed workouts are passed as history. */
export const HISTORY_WEEKS = 2;

const MS_PER_HOUR = 3_600_000;
export const MONDAY = 0;
const TUESDAY = 1, WEDNESDAY = 2, THURSDAY = 3, FRIDAY = 4, SATURDAY = 5;
const SOURCE_BUNDLE = 'com.fitheon.sim';

type Session = { key: string; activityType: string; hourUtc: number; minutes: number };
type Profile = { days: number[]; sessions: Session[] };

export const PROFILES: Record<ProfileName, Profile> = {
  typical: {
    days: [MONDAY, WEDNESDAY, FRIDAY],
    sessions: [{ key: 'strength', activityType: 'TraditionalStrengthTraining', hourUtc: 17, minutes: 50 }],
  },
  heavy: {
    days: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY],
    sessions: [
      { key: 'walk', activityType: 'Walking', hourUtc: 7, minutes: 30 },
      { key: 'strength', activityType: 'TraditionalStrengthTraining', hourUtc: 17, minutes: 75 },
    ],
  },
};

/** UTC midnight of day `day` (0 = Monday) in week `weekIndex`. */
export function dayStartMs(weekIndex: number, day: number): number {
  return SIM_START_MS + (weekIndex * DAYS_PER_WEEK + day) * MS_PER_DAY;
}

/** The instant `hourUtc` hours after the start of that day, as ISO 8601. */
export function instantOf(weekIndex: number, day: number, hourUtc: number): string {
  return new Date(dayStartMs(weekIndex, day) + hourUtc * MS_PER_HOUR).toISOString();
}

/** The workouts a profile records in week `weekIndex` (0-based). No METs. */
export function weekOfWorkouts(profile: ProfileName, weekIndex: number): RawWorkout[] {
  const { days, sessions } = PROFILES[profile];
  const workouts: RawWorkout[] = [];
  for (const day of days) {
    for (const session of sessions) {
      const startMs = dayStartMs(weekIndex, day) + session.hourUtc * MS_PER_HOUR;
      const durationS = session.minutes * SECONDS_PER_MINUTE;
      workouts.push({
        hkUuid: `${profile}-w${weekIndex}-d${day}-${session.key}`,
        activityType: session.activityType,
        startAt: new Date(startMs).toISOString(),
        endAt: new Date(startMs + durationS * MS_PER_SECOND).toISOString(),
        durationS,
        mets: null,
        sourceBundle: SOURCE_BUNDLE,
        title: null,
        userEntered: false,
      });
    }
  }
  return workouts;
}
