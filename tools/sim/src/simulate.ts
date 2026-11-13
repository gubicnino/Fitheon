import { GYMS, getGym, nextGym } from '@fitheon/catalog';
import type { Gym, GymId } from '@fitheon/catalog';
import { levelForXp, processWorkouts } from '@fitheon/engine';
import type { HistoryEntry, ProcessedWorkout } from '@fitheon/engine';
import { addRewards, applyAction, getSlotView, initialState } from '@fitheon/game';
import type { Action, GameState } from '@fitheon/game';
import {
  HISTORY_WEEKS, MONDAY, SIM_TIME_ZONE, SIM_WEEKLY_GOAL, SYNC_HOUR_UTC, instantOf, weekOfWorkouts,
} from './profiles';
import type { ProfileName } from './profiles';

export type { ProfileName } from './profiles';
export { weekOfWorkouts } from './profiles';

export type SimResult = {
  profile: ProfileName;
  arrivalWeek: Partial<Record<GymId, number>>;   // week number (1-based) the gym was unlocked; garage = 0
  weekly: { week: number; coinsEarned: number; coinsHeld: number; xp: number; level: number; gymId: GymId }[];
  finalState: GameState;
};

/** The gym after the highest one unlocked, if any. */
function upcomingGym(state: GameState): Gym | undefined {
  const unlocked = GYMS.filter(g => Object.hasOwn(state.gyms, g.id));
  const highest = unlocked[unlocked.length - 1];
  return highest ? nextGym(highest.id) : undefined;
}

/** Fill every empty slot of the current gym with the first machine it can bring over. */
function bringEverythingOver(state: GameState): GameState {
  const gym = getGym(state.currentGymId);
  for (const slot of gym?.slots ?? []) {
    const view = getSlotView(state, state.currentGymId, slot.id);
    const option = view && !view.installed ? view.bringable[0] : undefined;
    if (!option) continue;
    const result = applyAction(state, {
      type: 'bring_over', gymId: state.currentGymId, slotId: slot.id, fromSlotId: option.fromSlotId,
    });
    if (result.ok) state = result.state;
  }
  return state;
}

/** The cheapest unblocked purchase in the current gym: into an empty slot, or an upgrade. */
function cheapestOption(state: GameState): Action | undefined {
  const gym = getGym(state.currentGymId);
  let best: { price: number; action: Action } | undefined;
  const consider = (price: number, action: Action) => {
    if (!best || price < best.price) best = { price, action };
  };
  for (const slot of gym?.slots ?? []) {
    const view = getSlotView(state, state.currentGymId, slot.id);
    if (!view) continue;
    if (!view.installed) {
      for (const option of view.buyable) {
        if (option.blocked !== null) continue;
        consider(option.price,
          { type: 'install', gymId: state.currentGymId, slotId: slot.id, lineId: option.lineId });
      }
    }
    if (view.upgrade && view.upgrade.blocked === null) {
      consider(view.upgrade.price, { type: 'upgrade', gymId: state.currentGymId, slotId: slot.id });
    }
  }
  return best?.action;
}

/** The spending policy, applied until nothing more is possible. Records arrivals in `arrivals`. */
function spend(state: GameState, week: number, arrivals: Partial<Record<GymId, number>>): GameState {
  for (;;) {
    const moved = applyAction(state, { type: 'move_gym' });
    if (moved.ok) {
      state = bringEverythingOver(moved.state);
      arrivals[state.currentGymId] = week;
      continue;
    }
    const upcoming = upcomingGym(state);
    if (upcoming && levelForXp(state.xp) >= upcoming.levelGate) return state;   // save for the move
    const action = cheapestOption(state);
    if (!action) return state;
    const result = applyAction(state, action);
    if (!result.ok) return state;
    state = result.state;
  }
}

function toHistory(w: ProcessedWorkout): HistoryEntry {
  return {
    hkUuid: w.hkUuid, startAt: w.startAt, endAt: w.endAt, localDate: w.localDate,
    weekStart: w.weekStart, countedMinutes: w.countedMinutes, status: w.status,
  };
}

/** Plays `weeks` weeks of a profile through the real engine and game rules. Deterministic. */
export function simulate(profile: ProfileName, weeks: number): SimResult {
  let state = initialState();
  const arrivalWeek: SimResult['arrivalWeek'] = { [state.currentGymId]: 0 };
  const weekly: SimResult['weekly'] = [];
  const processedByWeek: HistoryEntry[][] = [];
  const bonusAwardedWeeks: string[] = [];

  for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
    const week = weekIndex + 1;
    const result = processWorkouts({
      now: instantOf(weekIndex + 1, MONDAY, SYNC_HOUR_UTC),
      timeZone: SIM_TIME_ZONE,
      history: processedByWeek.slice(-HISTORY_WEEKS).flat(),
      incoming: weekOfWorkouts(profile, weekIndex),
      defaultWeeklyGoal: SIM_WEEKLY_GOAL,
      weekGoals: {},
      bonusAwardedWeeks: [...bonusAwardedWeeks],
    });
    processedByWeek.push(result.workouts.map(toHistory));
    bonusAwardedWeeks.push(...result.weeklyBonuses.map(b => b.weekStart));

    state = spend(addRewards(state, result.coins, result.xp), week, arrivalWeek);
    weekly.push({
      week, coinsEarned: result.coins, coinsHeld: state.coins, xp: state.xp,
      level: levelForXp(state.xp), gymId: state.currentGymId,
    });
  }

  return { profile, arrivalWeek, weekly, finalState: state };
}
