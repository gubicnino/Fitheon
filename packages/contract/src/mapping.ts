import { STARTER, getGym, previousGym } from '@fitheon/catalog';
import type { GymId, Quality } from '@fitheon/catalog';
import { levelForXp } from '@fitheon/engine';
import type { ProcessedWorkout } from '@fitheon/engine';
import type { GameState, GymProgress, OwnedMachine } from '@fitheon/game';
import type { ProfileRow, Snapshot, UserGymRow, UserMachineRow, UserStyleRow, WeeklyProgressRow, WorkoutRow } from './rows';

/** A machine row's natural key: unique per player, so a brought-over source can be found without its id. */
export type MachineKey = { gym_id: string; slot_id: string; machine_id: string };

export type GameMachineRow = Omit<UserMachineRow, 'id' | 'user_id' | 'brought_from'> & { broughtFromKey: MachineKey | null };

export type GameRows = {
  profile: Pick<ProfileRow, 'coins' | 'xp' | 'level' | 'current_gym'>;
  gyms: Omit<UserGymRow, 'user_id' | 'unlocked_at'>[];
  machines: GameMachineRow[];
  styles: Omit<UserStyleRow, 'user_id'>[];
};

function knownGymId(id: string): GymId | undefined {
  return getGym(id)?.id;
}

/**
 * Rebuilds the game from the player's rows. Never throws: rows of a gym the catalog no longer has are
 * dropped, machine lines and styles the catalog no longer has are kept as they are.
 */
export function gameStateFromRows(s: Pick<Snapshot, 'profile' | 'gyms' | 'machines' | 'styles'>): GameState {
  const gyms: Partial<Record<GymId, GymProgress>> = {};
  for (const row of s.gyms) {
    const gymId = knownGymId(row.gym_id);
    if (!gymId) continue;
    gyms[gymId] = { floorStyleId: row.floor_style, wallStyleId: row.wall_style, ownedStyleIds: [] };
  }
  for (const row of s.styles) {
    const gymId = knownGymId(row.gym_id);
    if (gymId) gyms[gymId]?.ownedStyleIds.push(row.style_id);
  }

  const slotById = new Map(s.machines.map(m => [m.id, m.slot_id]));
  const machines: OwnedMachine[] = [];
  for (const row of s.machines) {
    const gymId = knownGymId(row.gym_id);
    if (!gymId) continue;
    machines.push({
      gymId, slotId: row.slot_id, lineId: row.machine_id,
      quality: row.quality as Quality,   // the database checks 1 to 4
      installed: row.installed,
      broughtFromSlotId: row.brought_from === null ? null : slotById.get(row.brought_from) ?? null,
    });
  }

  const current = knownGymId(s.profile.current_gym);
  return {
    coins: s.profile.coins,
    xp: s.profile.xp,
    currentGymId: current && gyms[current] ? current : STARTER.gymId,
    gyms,
    machines,
  };
}

/** Every row the game state is stored as. Storing it is an upsert of all of them; nothing is ever deleted. */
export function rowsFromGameState(state: GameState): GameRows {
  const gyms: GameRows['gyms'] = [];
  const styles: GameRows['styles'] = [];
  for (const [gymId, progress] of Object.entries(state.gyms)) {
    if (!progress) continue;
    gyms.push({ gym_id: gymId, floor_style: progress.floorStyleId, wall_style: progress.wallStyleId });
    for (const styleId of progress.ownedStyleIds) styles.push({ gym_id: gymId, style_id: styleId });
  }
  return {
    profile: { coins: state.coins, xp: state.xp, level: levelForXp(state.xp), current_gym: state.currentGymId },
    gyms,
    machines: state.machines.map(m => {
      const from = previousGym(m.gymId);
      return {
        gym_id: m.gymId, slot_id: m.slotId, machine_id: m.lineId, quality: m.quality, installed: m.installed,
        broughtFromKey: m.broughtFromSlotId === null || !from
          ? null
          : { gym_id: from.id, slot_id: m.broughtFromSlotId, machine_id: m.lineId },
      };
    }),
    styles,
  };
}

function num(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

function numOrNull(value: number | string | null): number | null {
  return value === null ? null : num(value);
}

export function processedFromRow(row: WorkoutRow): ProcessedWorkout {
  return {
    hkUuid: row.hk_uuid, activityType: row.activity_type, startAt: row.start_at, endAt: row.end_at,
    durationS: num(row.duration_s), mets: numOrNull(row.mets), sourceBundle: row.source_bundle, title: row.title,
    userEntered: row.user_entered, localDate: row.local_date, weekStart: row.week_start,
    countedMinutes: num(row.counted_minutes), multiplier: numOrNull(row.multiplier), status: row.status,
    coins: row.coins_awarded, xp: row.xp_awarded,
  };
}

export function rowFromProcessed(w: ProcessedWorkout): Omit<WorkoutRow, 'id' | 'user_id'> {
  return {
    hk_uuid: w.hkUuid, activity_type: w.activityType, source_bundle: w.sourceBundle, title: w.title,
    start_at: w.startAt, end_at: w.endAt, duration_s: w.durationS, mets: w.mets, user_entered: w.userEntered,
    local_date: w.localDate, week_start: w.weekStart, counted_minutes: w.countedMinutes, multiplier: w.multiplier,
    status: w.status, coins_awarded: w.coins, xp_awarded: w.xp,
  };
}

export function weekInputsFromRows(weeks: WeeklyProgressRow[]): { weekGoals: Record<string, number>; bonusAwardedWeeks: string[] } {
  const weekGoals: Record<string, number> = {};
  const bonusAwardedWeeks: string[] = [];
  for (const week of weeks) {
    weekGoals[week.week_start] = week.goal;
    if (week.bonus_awarded_at !== null) bonusAwardedWeeks.push(week.week_start);
  }
  return { weekGoals, bonusAwardedWeeks };
}
