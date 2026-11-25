// Proves that a function can run the shared rule packages and a Postgres
// transaction (see supabase/README.md). Removed once sync-workouts does both.
import { processWorkouts } from '@fitheon/engine';
import { NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ } from '@fitheon/engine/fixtures/november2026';
import { initialState } from '@fitheon/game';
import postgres from 'postgres';

// Created once per worker and reused by its requests.
const sql = postgres(Deno.env.get('SUPABASE_DB_URL') ?? '', { prepare: false, max: 1 });

const ROLL_BACK = new Error('roll back');

/** Locks a row of a scratch table inside a transaction, rolls back, and checks that nothing is left. */
async function checkTransaction(): Promise<'ok' | 'failed'> {
  let lockedCoins: number | undefined;
  try {
    await sql.begin(async tx => {
      await tx`create table public.rules_check_scratch (id int primary key, coins int not null)`;
      await tx`insert into public.rules_check_scratch values (1, 100)`;
      const [row] = await tx<{ coins: number }[]>`
        select coins from public.rules_check_scratch where id = 1 for update`;
      lockedCoins = row?.coins;
      throw ROLL_BACK;
    });
  } catch (error) {
    if (error !== ROLL_BACK) throw error;
  }
  const [left] = await sql<{ found: boolean }[]>`
    select to_regclass('public.rules_check_scratch') is not null as found`;
  return lockedCoins === 100 && left?.found === false ? 'ok' : 'failed';
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const result = processWorkouts({
    now: NOVEMBER_NOW, timeZone: NOVEMBER_TZ, history: [], incoming: NOVEMBER_2026,
    defaultWeeklyGoal: 3, weekGoals: {}, bonusAwardedWeeks: [],
  });
  return Response.json({
    coins: result.coins,
    xp: result.xp,
    counted: result.workouts.filter(w => w.status === 'counted').length,
    startGym: initialState().currentGymId,
    tx: await checkTransaction(),
  });
});
