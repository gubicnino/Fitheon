import { getGym, getLine, QUALITIES } from '@fitheon/catalog';
import type { Category, GymId, Quality } from '@fitheon/catalog';
import { levelForXp, localDateOf, totalXpForLevel, weekStartOf, xpToNext } from '@fitheon/engine';

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
  accepts: Category[];
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

  const slots = gym.slots.map((slot): SlotRow => {
    const installed = app.game.machines.find(m => m.gymId === gymId && m.slotId === slot.id && m.installed);
    return {
      slotId: slot.id,
      accepts: slot.accepts,
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
