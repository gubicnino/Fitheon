-- The write rule (specification 7.1): the app reads its own rows and never writes a table.
-- Every change goes through an Edge Function, which connects to Postgres directly and is not
-- affected by these grants or policies.
--
-- Two layers: grants decide which roles reach a table over the Data API at all (only
-- `authenticated`, and only `select`); row-level security decides which rows it sees (its own).
-- There are no insert, update or delete policies.

revoke all on table
  public.profiles, public.workouts, public.ledger, public.weekly_progress,
  public.user_gyms, public.user_machines, public.user_styles
  from anon, authenticated, service_role;

grant select on table
  public.profiles, public.workouts, public.ledger, public.weekly_progress,
  public.user_gyms, public.user_machines, public.user_styles
  to authenticated;

revoke all on sequence public.ledger_id_seq from anon, authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.ledger enable row level security;
alter table public.weekly_progress enable row level security;
alter table public.user_gyms enable row level security;
alter table public.user_machines enable row level security;
alter table public.user_styles enable row level security;

create policy "players read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "players read their own workouts" on public.workouts
  for select to authenticated using (user_id = (select auth.uid()));

create policy "players read their own ledger" on public.ledger
  for select to authenticated using (user_id = (select auth.uid()));

create policy "players read their own weeks" on public.weekly_progress
  for select to authenticated using (user_id = (select auth.uid()));

create policy "players read their own gyms" on public.user_gyms
  for select to authenticated using (user_id = (select auth.uid()));

create policy "players read their own machines" on public.user_machines
  for select to authenticated using (user_id = (select auth.uid()));

create policy "players read their own styles" on public.user_styles
  for select to authenticated using (user_id = (select auth.uid()));
