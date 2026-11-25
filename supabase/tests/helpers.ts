import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import type { Sql } from 'postgres';
import type { Envelope } from '@fitheon/contract';

// The backend tests run against the local stack (`npm run db:start`). They read its URL and keys
// from SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_DB_URL when all three are set (CI),
// otherwise from `supabase status`.

type Local = { url: string; publishableKey: string; dbUrl: string };

let local: Local | undefined;

function parseEnv(text: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/.exec(line.trim());
    if (match) vars[match[1]!] = match[2]!;
  }
  return vars;
}

export function stack(): Local {
  if (local) return local;
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_DB_URL } = process.env;
  if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SUPABASE_DB_URL) {
    local = { url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY, dbUrl: SUPABASE_DB_URL };
    return local;
  }
  let out: string;
  try {
    out = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    throw new Error('the local Supabase stack is not running: start it with `npm run db:start`');
  }
  const vars = parseEnv(out);
  const url = vars.API_URL, publishableKey = vars.PUBLISHABLE_KEY, dbUrl = vars.DB_URL;
  if (!url || !publishableKey || !dbUrl) throw new Error('`supabase status` did not print API_URL, PUBLISHABLE_KEY and DB_URL');
  local = { url, publishableKey, dbUrl };
  return local;
}

/** A client with the publishable key and no session, as the app has before signing in. */
export function anonymousClient(): SupabaseClient {
  const { url, publishableKey } = stack();
  return createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type Player = {
  userId: string;
  client: SupabaseClient;
  call<T>(fn: string, body: unknown): Promise<{ status: number; body: Envelope<T> }>;
};

/** Signs in a new anonymous player. No profile exists yet: the first function call creates it. */
export async function newPlayer(): Promise<Player> {
  const client = anonymousClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user || !data.session) throw new Error(`anonymous sign-in failed: ${error?.message}`);
  const { url, publishableKey } = stack();
  const token = data.session.access_token;
  return {
    userId: data.user.id,
    client,
    async call<T>(fn: string, body: unknown) {
      const res = await fetch(`${url}/functions/v1/${fn}`, {
        method: 'POST',
        headers: { apikey: publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: await res.json() as Envelope<T> };
    },
  };
}

let adminSql: Sql | undefined;

/** A direct connection as `postgres`, which bypasses row-level security. For setup and assertions only. */
export function admin(): Sql {
  adminSql ??= postgres(stack().dbUrl, { max: 2, onnotice: () => {} });
  return adminSql;
}

export async function closeAdmin(): Promise<void> {
  await adminSql?.end();
  adminSql = undefined;
}

export async function seedProfile(userId: string, coins: number, xp: number): Promise<void> {
  await admin()`insert into public.profiles (id, coins, xp) values (${userId}, ${coins}, ${xp})`;
}
