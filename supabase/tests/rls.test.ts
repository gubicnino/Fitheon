import { afterAll, beforeAll, expect, test } from 'vitest';
import { admin, anonymousClient, closeAdmin, newPlayer, seedProfile } from './helpers';
import type { Player } from './helpers';

// Spec 7.1: the app reads its own rows and never writes. These tests go through the Data API
// with a signed-in client and check the outcome with a direct connection.

const TABLES = ['profiles', 'workouts', 'ledger', 'weekly_progress', 'user_gyms', 'user_machines', 'user_styles'] as const;
type Table = typeof TABLES[number];

const ownerColumn = (table: Table) => (table === 'profiles' ? 'id' : 'user_id');

/** One row in every table for this player, written directly. */
async function seedEverything(userId: string, coins: number): Promise<void> {
  await seedProfile(userId, coins, 0);
  const sql = admin();
  await sql`insert into public.workouts (user_id, hk_uuid, activity_type, start_at, end_at, duration_s, status)
    values (${userId}, ${`hk-${userId}`}, 'traditionalStrengthTraining',
            '2026-11-02T17:00:00Z', '2026-11-02T18:00:00Z', 3600, 'counted')`;
  await sql`insert into public.ledger (user_id, kind, coins_delta, ref) values (${userId}, 'starter', 0, 'test')`;
  await sql`insert into public.weekly_progress (user_id, week_start, goal) values (${userId}, '2026-11-02', 3)`;
  await sql`insert into public.user_gyms (user_id, gym_id, floor_style, wall_style)
    values (${userId}, 'garage', 'garage.floor.concrete', 'garage.wall.bare_block')`;
  await sql`insert into public.user_machines (user_id, gym_id, slot_id, machine_id, quality, installed)
    values (${userId}, 'garage', 'garage.1', 'dumbbell_rack', 1, true)`;
  await sql`insert into public.user_styles (user_id, gym_id, style_id) values (${userId}, 'garage', 'garage.floor.rubber_mat')`;
}

/** A row the player could try to insert into that table. */
function newRow(table: Table, userId: string): Record<string, unknown> {
  switch (table) {
    case 'profiles': return { id: userId, coins: 1_000_000 };
    case 'workouts': return { user_id: userId, hk_uuid: 'forged', activity_type: 'running',
      start_at: '2026-11-03T07:00:00Z', end_at: '2026-11-03T08:00:00Z', duration_s: 3600, status: 'counted',
      coins_awarded: 1_000_000 };
    case 'ledger': return { user_id: userId, kind: 'workout', coins_delta: 1_000_000, ref: 'forged' };
    case 'weekly_progress': return { user_id: userId, week_start: '2026-11-09', goal: 1 };
    case 'user_gyms': return { user_id: userId, gym_id: 'elite', floor_style: 'x', wall_style: 'y' };
    case 'user_machines': return { user_id: userId, gym_id: 'garage', slot_id: 'garage.2',
      machine_id: 'stair_master', quality: 4, installed: true };
    case 'user_styles': return { user_id: userId, gym_id: 'garage', style_id: 'garage.floor.plywood' };
  }
}

/** A change the player would like to make to their own row. */
function change(table: Table): Record<string, unknown> {
  switch (table) {
    case 'profiles': return { coins: 1_000_000 };
    case 'workouts': return { coins_awarded: 1_000_000 };
    case 'ledger': return { coins_delta: 1_000_000 };
    case 'weekly_progress': return { goal: 1 };
    case 'user_gyms': return { floor_style: 'x' };
    case 'user_machines': return { quality: 4 };
    case 'user_styles': return { style_id: 'garage.floor.plywood' };
  }
}

/** Every row of that player in that table, as the database holds it. */
async function rowsOf(table: Table, userId: string): Promise<unknown[]> {
  const sql = admin();
  const rows = await sql`select * from ${sql('public.' + table)} where ${sql(ownerColumn(table))} = ${userId}`;
  return [...rows];
}

let a: Player;
let b: Player;

beforeAll(async () => {
  [a, b] = await Promise.all([newPlayer(), newPlayer()]);
  await seedEverything(a.userId, 100);
  await seedEverything(b.userId, 200);
});

afterAll(closeAdmin);

test('a signed-in player reads their own profile and nothing else', async () => {
  const { data, error } = await a.client.from('profiles').select('*');
  expect(error).toBeNull();
  expect(data).toEqual([expect.objectContaining({ id: a.userId, coins: 100 })]);
});

test('a signed-in player reads only their own rows in every table', async () => {
  for (const table of TABLES) {
    const { data, error } = await a.client.from(table).select('*');
    expect(error, table).toBeNull();
    expect(data, table).toHaveLength(1);
    expect(data?.[0]?.[ownerColumn(table)], table).toBe(a.userId);
  }
});

test('a player cannot insert, update or delete any table', async () => {
  for (const table of TABLES) {
    const before = await rowsOf(table, a.userId);
    const others = await rowsOf(table, b.userId);

    const inserted = await a.client.from(table).insert(newRow(table, a.userId));
    const updated = await a.client.from(table).update(change(table)).eq(ownerColumn(table), a.userId).select();
    const updatedOther = await b.client.from(table).update(change(table)).eq(ownerColumn(table), a.userId).select();
    const deleted = await a.client.from(table).delete().eq(ownerColumn(table), a.userId).select();

    for (const [what, result] of [['insert', inserted], ['update', updated], ['update by another player', updatedOther],
      ['delete', deleted]] as const) {
      // Refused with an error (no grant), or allowed through with nothing affected; never a changed row.
      const affected = (result.data as unknown[] | null)?.length ?? 0;
      expect(result.error !== null || affected === 0, `${table} ${what}`).toBe(true);
    }
    expect(await rowsOf(table, a.userId), table).toEqual(before);
    expect(await rowsOf(table, b.userId), table).toEqual(others);
  }
});

test('a request without a session reads nothing', async () => {
  const client = anonymousClient();
  for (const table of TABLES) {
    const { data } = await client.from(table).select('*');
    expect(data ?? [], table).toHaveLength(0);
  }
});

test('coins cannot be stored below zero', async () => {
  await expect(admin()`update public.profiles set coins = -1 where id = ${a.userId}`)
    .rejects.toMatchObject({ code: '23514' });
});

test('a slot cannot have two installed machines', async () => {
  await expect(admin()`insert into public.user_machines (user_id, gym_id, slot_id, machine_id, quality, installed)
    values (${a.userId}, 'garage', 'garage.1', 'bench_press', 1, true)`)
    .rejects.toMatchObject({ code: '23505' });
});
