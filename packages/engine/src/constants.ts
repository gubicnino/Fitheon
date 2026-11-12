/** Workouts shorter than this earn nothing. */
export const MIN_DURATION_S = 600;
/** Counted minutes per local day, across all workouts. */
export const DAILY_MINUTES_CAP = 120;
/** Coins per counted minute at multiplier 1. */
export const BASE_RATE = 2;
/** XP for the first counted workout of a local day. */
export const XP_PER_ACTIVE_DAY = 20;
/** XP for reaching the weekly goal, once per week. */
export const WEEKLY_BONUS_XP = 50;
/** A workout that started longer ago than this at sync time is invalid. */
export const MAX_AGE_DAYS = 14;
/** How far past `now` an end time may be before it counts as "in the future". */
export const FUTURE_TOLERANCE_S = 300;
/** How much longer than (end - start) a reported duration may be. */
export const DURATION_TOLERANCE_S = 60;
/** Overlap above this share of the shorter span rejects the later arrival. */
export const OVERLAP_THRESHOLD = 0.5;
/** The weekly goal is a number of active days in this range. */
export const MIN_WEEKLY_GOAL = 1;
export const MAX_WEEKLY_GOAL = 7;
/** Remaining daily minutes below this are float residue, not minutes. */
export const MINUTES_EPSILON = 1e-9;

export const SECONDS_PER_MINUTE = 60;
export const MS_PER_SECOND = 1000;
export const MS_PER_DAY = 86_400_000;
export const DAYS_PER_WEEK = 7;

/** Type base for any activity type that is not listed. */
export const DEFAULT_TYPE_BASE = 1.0;

/** HealthKit activity type names as they appear in exports. */
export const TYPE_BASES: ReadonlyMap<string, number> = new Map([
  ['TraditionalStrengthTraining', 1.25],
  ['FunctionalStrengthTraining', 1.25],
  ['CoreTraining', 1.25],
  ['HighIntensityIntervalTraining', 1.25],
  ['CrossTraining', 1.25],
  ['Running', 1.25],
  ['Rowing', 1.25],
  ['Swimming', 1.25],
  ['Walking', 0.75],
  ['Yoga', 0.75],
  ['Pilates', 0.75],
  ['Flexibility', 0.75],
  ['MindAndBody', 0.75],
]);

/** Ascending. A workout gets the band of the last entry whose minMets it reaches. */
export const INTENSITY_BANDS: readonly { minMets: number; band: number }[] = [
  { minMets: 0, band: 0.75 },
  { minMets: 3, band: 1.0 },
  { minMets: 6, band: 1.25 },
  { minMets: 8, band: 1.5 },
];

/** XP from level n to n+1 is LEVEL_XP_BASE + LEVEL_XP_STEP * n, capped. */
export const LEVEL_XP_BASE = 10;
export const LEVEL_XP_STEP = 10;
export const LEVEL_XP_CAP = 110;
