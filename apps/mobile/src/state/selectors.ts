import { getGym, getLine, QUALITIES } from '@fitheon/catalog';
import type { GymId, Quality } from '@fitheon/catalog';
import {
  DAILY_MINUTES_CAP,
  levelForXp,
  localDateOf,
  MIN_DURATION_S,
  totalXpForLevel,
  weekStartOf,
  xpToNext,
} from '@fitheon/engine';
import type { ProcessedWorkout, WorkoutStatus } from '@fitheon/engine';

import type { AppState } from './appState';

export type HeaderView = {
  coins: number;
  level: number;
  /** XP earned inside the current level. */
  xpInto: number;
  /** XP the current level needs in total. */
  xpNeeded: number;
  /** Active days (days with a counted workout) in the current week. */
  goalDone: number;
  goal: number;
};

/** What the status header shows, as of `now` in `timeZone`. */
export function headerView(app: AppState, now: string, timeZone: string): HeaderView {
  const { coins, xp } = app.game;
  const level = levelForXp(xp);
  const week = weekStartOf(localDateOf(now, timeZone));

  const activeDays = new Set<string>();
  for (const w of app.workouts) {
    if (w.status === 'counted' && w.weekStart === week && w.localDate !== null) activeDays.add(w.localDate);
  }

  return {
    coins,
    level,
    xpInto: xp - totalXpForLevel(level),
    xpNeeded: xpToNext(level),
    goalDone: activeDays.size,
    goal: app.weekGoals[week] ?? app.defaultWeeklyGoal,
  };
}

export type SlotRow = {
  slotId: string;
  /** 1-based, in catalog order: `garage.3` is slot 3. */
  slotNumber: number;
  /** The installed machine; null for an empty slot. Stored machines are not shown. */
  lineId: string | null;
  machineName: string | null;
  quality: Quality | null;
};

export type GymView = {
  gymId: GymId;
  name: string;
  qualityCapName: string;
  /** Slots with an installed machine. */
  filled: number;
  slots: SlotRow[];
};

/** The current gym, slots in catalog order. */
export function gymView(app: AppState): GymView {
  const gymId = app.game.currentGymId;
  const gym = getGym(gymId);
  if (!gym) throw new Error(`Unknown current gym ${gymId}`);

  const slots = gym.slots.map((slot, index): SlotRow => {
    const installed = app.game.machines.find(m => m.gymId === gymId && m.slotId === slot.id && m.installed);
    return {
      slotId: slot.id,
      slotNumber: index + 1,
      lineId: installed?.lineId ?? null,
      machineName: installed ? (getLine(installed.lineId)?.name ?? installed.lineId) : null,
      quality: installed?.quality ?? null,
    };
  });

  return {
    gymId,
    name: gym.name,
    qualityCapName: QUALITIES[gym.qualityCap].name,
    filled: slots.filter(s => s.lineId !== null).length,
    slots,
  };
}

export type ActivityRow = {
  id: string;
  activityLabel: string;
  title: string | null;
  /** Duration in minutes, rounded to one decimal. */
  minutes: number;
  multiplier: number | null;
  coins: number;
  xp: number;
  status: WorkoutStatus;
  /** Why the workout earned nothing; null when it was counted. */
  reason: string | null;
  source: string;
};

/** One day of the activity list. `localDate` is null for the group of unreadable workouts. */
export type ActivityDay = { localDate: string | null; workouts: ActivityRow[] };

export const STATUS_REASON: Record<WorkoutStatus, string | null> = {
  counted: null,
  below_min: `Under ${MIN_DURATION_S / 60} min`,
  daily_cap: `Over ${DAILY_MINUTES_CAP} min for the day`,
  overlap: 'Overlaps a counted workout',
  user_entered: 'Entered by hand',
  invalid: 'Could not be read',
};

const SOURCE_NAMES: Record<string, string> = {
  'com.apple.health': 'Apple Watch',
  'com.strong.app': 'Strong',
  'com.fitheon.mock': 'Simulated',
};

/** 'TraditionalStrengthTraining' -> 'Traditional Strength Training'. */
export function activityLabel(activityType: string): string {
  return activityType.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function sourceName(bundle: string | null): string {
  if (!bundle) return 'Unknown';
  return SOURCE_NAMES[bundle] ?? bundle;
}

function activityRow(w: ProcessedWorkout): ActivityRow {
  return {
    id: w.hkUuid,
    activityLabel: activityLabel(w.activityType),
    title: w.title,
    minutes: Math.round(w.durationS / 6) / 10,
    multiplier: w.multiplier,
    coins: w.coins,
    xp: w.xp,
    status: w.status,
    reason: STATUS_REASON[w.status],
    source: sourceName(w.sourceBundle),
  };
}

/** Start time in ms; unreadable start times sort first in their group. */
function startMs(w: ProcessedWorkout): number {
  const ms = Date.parse(w.startAt);
  return Number.isNaN(ms) ? -Infinity : ms;
}

/** Processed workouts by local day, newest day first; within a day by start time. Unreadable ones come last. */
export function activityDays(app: AppState): ActivityDay[] {
  const byDay = new Map<string | null, ProcessedWorkout[]>();
  for (const w of app.workouts) {
    const list = byDay.get(w.localDate);
    if (list) list.push(w);
    else byDay.set(w.localDate, [w]);
  }

  const dates = [...byDay.keys()].filter((d): d is string => d !== null).sort().reverse();
  const keys: (string | null)[] = byDay.has(null) ? [...dates, null] : dates;

  return keys.map(localDate => ({
    localDate,
    workouts: [...(byDay.get(localDate) ?? [])]
      .sort((a, b) => startMs(a) - startMs(b))
      .map(activityRow),
  }));
}
