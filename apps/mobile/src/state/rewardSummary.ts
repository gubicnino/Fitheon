import type { WorkoutStatus } from '@fitheon/engine';

import type { SyncSummary } from './appState';

/** What the reward summary says, worded from a sync's result. Decides nothing. */
export type RewardView = {
  /** No coins and no XP: the summary leads with `reason` instead of zeros. */
  nothingEarned: boolean;
  leveledUp: boolean;
  /** Why nothing was earned, in one line. Null when something was earned. */
  reason: string | null;
  /** Under the coin total, e.g. "coins from 3 workouts". */
  coinsDetail: string;
  /** Under the XP total, e.g. "2 active days + weekly bonus". */
  xpDetail: string;
  /** Under the level, e.g. "from level 1". */
  levelDetail: string;
  /** e.g. "2 not counted: Under 10 min", when something was earned but not everything counted. */
  notCounted: string | null;
};

const STATUS_REASON: Record<Exclude<WorkoutStatus, 'counted'>, string> = {
  overlap: 'Overlaps a workout already counted',
  daily_cap: 'Daily limit of 120 minutes reached',
  below_min: 'Under 10 min',
  user_entered: 'Entered by hand',
  invalid: 'Too old or not a valid workout',
};

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

function reasons(summary: SyncSummary): string[] {
  const found = new Set<string>();
  for (const w of summary.workouts) {
    if (w.status !== 'counted') found.add(STATUS_REASON[w.status]);
  }
  if (summary.duplicates > 0) found.add('Already imported');
  return [...found];
}

export function rewardView(summary: SyncSummary): RewardView {
  const counted = summary.workouts.filter(w => w.status === 'counted').length;
  const uncounted = summary.workouts.length - counted;
  const activeDays = summary.workouts.filter(w => w.xp > 0).length;
  const nothingEarned = summary.coins === 0 && summary.xp === 0;
  const leveledUp = summary.levelAfter > summary.levelBefore;
  const why = reasons(summary);

  const xpParts = [
    ...(activeDays > 0 ? [plural(activeDays, 'active day')] : []),
    ...(summary.weeklyBonuses.length > 0 ? ['weekly bonus'] : []),
  ];

  return {
    nothingEarned,
    leveledUp,
    reason: nothingEarned ? (why.length > 0 ? why.join(' · ') : 'No new workouts') : null,
    coinsDetail: `coins from ${plural(counted, 'workout')}`,
    xpDetail: xpParts.length > 0 ? xpParts.join(' + ') : 'XP already earned today',
    levelDetail: leveledUp ? `from level ${summary.levelBefore}` : 'no change',
    notCounted:
      !nothingEarned && uncounted > 0
        ? `${uncounted} not counted: ${why.filter(r => r !== 'Already imported').join(' · ')}`
        : null,
  };
}
