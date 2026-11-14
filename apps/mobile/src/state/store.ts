// The one file under state/ that knows about React and the device: it binds the pure
// app state to a Zustand store and to AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RawWorkout } from '@fitheon/engine';
import type { Action, ActionResult } from '@fitheon/game';
import { create } from 'zustand';

import { act, initialAppState, sync } from './appState';
import type { AppState, SyncSummary } from './appState';
import { load, save } from './persist';

export type AppStore = {
  app: AppState;
  hydrated: boolean;
  /** act(); on success replaces app and saves. A failure returns the typed error and changes nothing. */
  dispatch(action: Action): ActionResult;
  /** sync() with now() and the device time zone; saves. */
  syncWorkouts(incoming: RawWorkout[]): SyncSummary;
  /** Adds to the developer clock offset; saves. */
  advanceClock(ms: number): void;
  /** Back to a new game; saves. */
  reset(): void;
};

/** The current time as the game sees it, including the developer clock offset. */
export function now(app: AppState): string {
  return new Date(Date.now() + app.clockOffsetMs).toISOString();
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Saves run one after another so an older state can never overwrite a newer one.
let pendingSave: Promise<void> = Promise.resolve();

function persist(app: AppState): void {
  pendingSave = pendingSave
    .then(() => save(AsyncStorage, app))
    .catch((error: unknown) => {
      console.warn('Fitheon: saving the game failed', error);
    });
}

export const useApp = create<AppStore>()((set, get) => {
  // Every change goes through here, so every change is written at once (not on a timer or on exit).
  const commit = (app: AppState): void => {
    set({ app });
    persist(app);
  };

  return {
    app: initialAppState(),
    hydrated: false,
    dispatch(action) {
      const { app, result } = act(get().app, action);
      if (result.ok) commit(app);
      return result;
    },
    syncWorkouts(incoming) {
      const current = get().app;
      const { app, summary } = sync(current, incoming, now(current), deviceTimeZone());
      commit(app);
      return summary;
    },
    advanceClock(ms) {
      const current = get().app;
      commit({ ...current, clockOffsetMs: current.clockOffsetMs + ms });
    },
    reset() {
      commit(initialAppState());
    },
  };
});

let hydration: Promise<void> | null = null;

/** Loads the stored game once. Unusable stored data starts a new game (see parseAppState). */
export function hydrateApp(): Promise<void> {
  hydration ??= load(AsyncStorage).then(app => {
    useApp.setState({ app, hydrated: true });
  });
  return hydration;
}
