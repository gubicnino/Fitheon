-- The game's tables (specification section 8).
-- Catalog ids (gyms, slots, machine lines, styles) are plain text: the catalog is a TypeScript
-- package, not tables, so the database does not check them. The rule packages do.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),   -- cached; the ledger is the source of truth
  xp integer not null default 0 check (xp >= 0),         -- cached
  level integer not null default 1 check (level >= 1),   -- cached, follows xp
  weekly_goal integer not null default 3 check (weekly_goal between 1 and 7),
  pending_weekly_goal integer check (pending_weekly_goal between 1 and 7),
  current_gym text not null default 'garage',
  last_summary_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  hk_uuid text not null,
  activity_type text not null,
  source_bundle text,
  title text,                                            -- HKWorkoutBrandName, if any
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_s numeric not null,
  mets numeric,                                          -- HKAverageMETs, null if absent
  user_entered boolean not null default false,
  local_date date,                                       -- null only when status is 'invalid'
  week_start date,
  counted_minutes numeric not null default 0,
  multiplier numeric,
  status text not null
    check (status in ('counted', 'below_min', 'daily_cap', 'overlap', 'user_entered', 'invalid')),
  coins_awarded integer not null default 0,
  xp_awarded integer not null default 0,
  unique (user_id, hk_uuid)
);

create index workouts_user_id_start_at_idx on public.workouts (user_id, start_at desc);

create table public.ledger (                             -- append-only
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null
    check (kind in ('workout', 'weekly_bonus', 'install', 'upgrade', 'style', 'move_gym', 'starter')),
  coins_delta integer not null default 0,
  xp_delta integer not null default 0,
  ref text,
  created_at timestamptz not null default now()
);

create index ledger_user_id_id_idx on public.ledger (user_id, id);

create table public.weekly_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  goal integer not null check (goal between 1 and 7),    -- fixed for that week
  active_days integer not null default 0 check (active_days between 0 and 7),
  bonus_awarded_at timestamptz,
  primary key (user_id, week_start)
);

create table public.user_gyms (
  user_id uuid not null references public.profiles (id) on delete cascade,
  gym_id text not null,
  floor_style text not null,
  wall_style text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, gym_id)
);

-- Every machine owned in a slot, installed or stored. Rows are never deleted while the player
-- exists, so brought_from stays valid.
create table public.user_machines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  gym_id text not null,
  slot_id text not null,
  machine_id text not null,
  quality integer not null check (quality between 1 and 4),
  installed boolean not null,
  brought_from uuid references public.user_machines (id) on delete set null,  -- source in the previous gym
  unique (user_id, gym_id, slot_id, machine_id)
);

-- At most one installed machine per slot.
create unique index user_machines_one_installed_per_slot
  on public.user_machines (user_id, gym_id, slot_id) where installed;

create index user_machines_brought_from_idx
  on public.user_machines (brought_from) where brought_from is not null;

create table public.user_styles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  gym_id text not null,
  style_id text not null,
  primary key (user_id, gym_id, style_id)
);
