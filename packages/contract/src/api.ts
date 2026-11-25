import type { GymId } from '@fitheon/catalog';
import type { ProcessedWorkout, RawWorkout } from '@fitheon/engine';
import type { ActionError } from '@fitheon/game';

/** Failures that are not game outcomes. Rule refusals are an `ActionError` with HTTP 200. */
export type ApiError = 'unauthenticated' | 'bad_request' | 'method_not_allowed' | 'internal';

/** Every function answers with this. */
export type Envelope<T> = { ok: true; data: T } | { ok: false; error: ApiError | ActionError; message?: string };

/** `devNow` is honoured only where the server runs with `FITHEON_DEV_CLOCK=1`. */
export type SyncRequest = { workouts: RawWorkout[]; timeZone: string; devNow?: string };

export type SyncSummary = {
  workouts: ProcessedWorkout[]; duplicates: number; coins: number; xp: number;
  weeklyBonuses: { weekStart: string; xp: number }[]; levelBefore: number; levelAfter: number;
};

export type InstallRequest = { gymId: GymId; slotId: string; lineId: string };
export type UpgradeRequest = { gymId: GymId; slotId: string };
export type SwapRequest = { gymId: GymId; slotId: string; lineId: string };
export type ActionResponse = { coinsDelta: number };

export const MAX_WORKOUTS_PER_SYNC = 200;

export const FUNCTIONS = {
  sync: 'sync-workouts', install: 'install-machine', upgrade: 'upgrade-machine', swap: 'swap-machine',
} as const;
