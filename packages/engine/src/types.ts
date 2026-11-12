export type RawWorkout = {
  hkUuid: string;
  activityType: string;
  startAt: string;            // ISO 8601 with a zone
  endAt: string;
  durationS: number;
  mets: number | null;        // HKAverageMETs
  sourceBundle: string | null;
  title: string | null;       // HKWorkoutBrandName
  userEntered: boolean;
};

export type WorkoutStatus =
  'counted' | 'below_min' | 'daily_cap' | 'overlap' | 'user_entered' | 'invalid';

export type ProcessedWorkout = RawWorkout & {
  localDate: string | null;   // null only when status is 'invalid'
  weekStart: string | null;
  countedMinutes: number;
  multiplier: number | null;  // null unless counted
  status: WorkoutStatus;
  coins: number;
  xp: number;                 // XP_PER_ACTIVE_DAY or 0; the weekly bonus is reported separately
};

export type HistoryEntry = Pick<ProcessedWorkout,
  'hkUuid' | 'startAt' | 'endAt' | 'localDate' | 'weekStart' | 'countedMinutes' | 'status'>;

export type ProcessInput = {
  now: string;
  timeZone: string;
  history: HistoryEntry[];
  incoming: RawWorkout[];
  defaultWeeklyGoal: number;
  weekGoals: Record<string, number>;   // weekStart -> goal fixed for that week
  bonusAwardedWeeks: string[];         // weekStart values
};

export type WeeklyBonus = { weekStart: string; xp: number };

export type ProcessResult = {
  workouts: ProcessedWorkout[];        // every non-duplicate incoming, by startAt
  duplicates: string[];                // hkUuids skipped
  weeklyBonuses: WeeklyBonus[];
  coins: number;                       // total across workouts
  xp: number;                          // total including weekly bonuses
};
