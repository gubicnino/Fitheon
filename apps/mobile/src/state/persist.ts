import { initialAppState } from './appState';
import type { AppState } from './appState';

export const STORAGE_KEY = 'fitheon.app.v2';

/** The part of AsyncStorage this module needs, so tests can pass an in-memory map. */
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUsableGame(value: unknown): boolean {
  return isObject(value)
    && typeof value.coins === 'number'
    && typeof value.xp === 'number'
    && Array.isArray(value.machines);
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isObject(value) && Object.values(value).every(v => typeof v === 'number');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

export function serialise(app: AppState): string {
  return JSON.stringify(app);
}

/**
 * Never throws. Anything that is not a usable version 2 state becomes a new game, including a
 * version 1 game, whose slot ids no longer exist.
 */
export function parseAppState(raw: string | null): AppState {
  if (raw === null) return initialAppState();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initialAppState();
  }
  if (!isObject(parsed) || parsed.version !== 2 || !isUsableGame(parsed.game) || !Array.isArray(parsed.workouts)) {
    return initialAppState();
  }
  const fresh = initialAppState();
  return {
    version: 2,
    game: parsed.game as AppState['game'],
    workouts: parsed.workouts as AppState['workouts'],
    defaultWeeklyGoal: typeof parsed.defaultWeeklyGoal === 'number' ? parsed.defaultWeeklyGoal : fresh.defaultWeeklyGoal,
    weekGoals: isNumberRecord(parsed.weekGoals) ? parsed.weekGoals : fresh.weekGoals,
    bonusAwardedWeeks: isStringArray(parsed.bonusAwardedWeeks) ? parsed.bonusAwardedWeeks : fresh.bonusAwardedWeeks,
    clockOffsetMs: typeof parsed.clockOffsetMs === 'number' ? parsed.clockOffsetMs : fresh.clockOffsetMs,
  };
}

/** Reads the stored state. A storage read that fails also starts a new game. */
export async function load(storage: KeyValueStorage): Promise<AppState> {
  let raw: string | null;
  try {
    raw = await storage.getItem(STORAGE_KEY);
  } catch {
    return initialAppState();
  }
  return parseAppState(raw);
}

export async function save(storage: KeyValueStorage, app: AppState): Promise<void> {
  await storage.setItem(STORAGE_KEY, serialise(app));
}
