import type { WorkoutStatus } from '@fitheon/engine';

// Exactly what `select *` returns for each table (spec section 8); snake_case on purpose.
// Postgres `numeric` columns may arrive as strings (postgres.js does that); `processedFromRow`
// turns them into numbers, so read workouts through it.

export type ProfileRow = {
  id: string; coins: number; xp: number; level: number; weekly_goal: number;
  pending_weekly_goal: number | null; current_gym: string; last_summary_seen_at: string | null; created_at: string;
};

export type UserGymRow = { user_id: string; gym_id: string; floor_style: string; wall_style: string; unlocked_at: string };

export type UserMachineRow = {
  id: string; user_id: string; gym_id: string; slot_id: string; machine_id: string;
  quality: number; installed: boolean;
  brought_from: string | null;   // id of the source row in the previous gym
};

export type UserStyleRow = { user_id: string; gym_id: string; style_id: string };

export type WeeklyProgressRow = {
  user_id: string; week_start: string; goal: number; active_days: number; bonus_awarded_at: string | null;
};

export type WorkoutRow = {
  id: string; user_id: string; hk_uuid: string; activity_type: string; source_bundle: string | null;
  title: string | null; start_at: string; end_at: string; duration_s: number; mets: number | null; user_entered: boolean;
  local_date: string | null; week_start: string | null; counted_minutes: number; multiplier: number | null;
  status: WorkoutStatus; coins_awarded: number; xp_awarded: number;
};

export type LedgerKind = 'workout' | 'weekly_bonus' | 'install' | 'upgrade' | 'style' | 'move_gym' | 'starter';

export type Snapshot = {
  profile: ProfileRow; gyms: UserGymRow[]; machines: UserMachineRow[]; styles: UserStyleRow[];
  weeks: WeeklyProgressRow[]; workouts: WorkoutRow[];
};
