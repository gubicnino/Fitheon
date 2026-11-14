import { levelForXp, processWorkouts } from '@fitheon/engine';
import type { ProcessedWorkout, RawWorkout } from '@fitheon/engine';
import { addRewards, applyAction, initialState } from '@fitheon/game';
import type { Action, ActionResult, GameState } from '@fitheon/game';

/** The design's weekly goal; choosing a goal is issue #47. */
export const DEFAULT_WEEKLY_GOAL = 3;

export type AppState = {
  version: 1;
  game: GameState;
  /** Every processed workout, in the order processed. Also the engine's history. */
  workouts: ProcessedWorkout[];
  defaultWeeklyGoal: number;
  /** weekStart -> goal fixed for that week. Stays empty in this phase. */
  weekGoals: Record<string, number>;
  bonusAwardedWeeks: string[];
  /** Developer clock offset; 0 in normal use. */
  clockOffsetMs: number;
};

export type SyncSummary = {
  /** The workouts of this sync only. */
  workouts: ProcessedWorkout[];
  duplicates: number;
  coins: number;
  xp: number;
  weeklyBonuses: { weekStart: string; xp: number }[];
  levelBefore: number;
  levelAfter: number;
};

export function initialAppState(): AppState {
  return {
    version: 1,
    game: initialState(),
    workouts: [],
    defaultWeeklyGoal: DEFAULT_WEEKLY_GOAL,
    weekGoals: {},
    bonusAwardedWeeks: [],
    clockOffsetMs: 0,
  };
}

/** Applies one game action. On failure the same `app` object comes back with the typed error. */
export function act(app: AppState, action: Action): { app: AppState; result: ActionResult } {
  const result = applyAction(app.game, action);
  if (!result.ok) return { app, result };
  return { app: { ...app, game: result.state }, result };
}

/** Runs incoming workouts through the engine, adds the rewards and records the workouts. */
export function sync(
  app: AppState,
  incoming: RawWorkout[],
  now: string,
  timeZone: string,
): { app: AppState; summary: SyncSummary } {
  const result = processWorkouts({
    now,
    timeZone,
    history: app.workouts,
    incoming,
    defaultWeeklyGoal: app.defaultWeeklyGoal,
    weekGoals: app.weekGoals,
    bonusAwardedWeeks: app.bonusAwardedWeeks,
  });
  const game = addRewards(app.game, result.coins, result.xp);
  const next: AppState = {
    ...app,
    game,
    workouts: [...app.workouts, ...result.workouts],
    bonusAwardedWeeks: [...app.bonusAwardedWeeks, ...result.weeklyBonuses.map(b => b.weekStart)],
  };
  const summary: SyncSummary = {
    workouts: result.workouts,
    duplicates: result.duplicates.length,
    coins: result.coins,
    xp: result.xp,
    weeklyBonuses: result.weeklyBonuses,
    levelBefore: levelForXp(app.game.xp),
    levelAfter: levelForXp(game.xp),
  };
  return { app: next, summary };
}
