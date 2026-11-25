# Backend (Supabase)

The database schema, the Edge Functions and their tests. Development and tests
run against a local Supabase stack in Docker; nothing here needs the hosted
project.

## Prerequisites

- Docker Desktop, running
- Node 22 and `npm install` in the repository root. The Supabase CLI is a dev
  dependency, so everyone uses the version in `package-lock.json`.

## Scripts

Run them from the repository root.

| Script | What it does |
|---|---|
| `npm run db:start` | Starts the local stack and prints its URLs and keys. The first run downloads the Docker images and takes a few minutes |
| `npm run db:stop` | Stops the stack. The data is kept for the next start |
| `npm run db:reset` | Recreates the local database from the migrations. **Deletes all local data** |
| `npm run functions:serve` | Serves the Edge Functions locally and reloads them on change |
| `npm run test:backend` | Runs the backend tests in `supabase/tests` against the running local stack. `npm test` does not run them, so it never needs Docker |

`npx supabase status` shows whether the stack is running and prints the URLs and
keys again.

## Where things run

| What | Address |
|---|---|
| API | http://127.0.0.1:54321 |
| Edge Functions | http://127.0.0.1:54321/functions/v1 |
| Database | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Dashboard (Studio) | http://127.0.0.1:54323 |

The local keys are the CLI's defaults and the same on every machine. The keys of
the hosted project are not in this repository.

## Configuration

`config.jsonc` configures the local stack. It is the CLI's default with four
changes:

- Anonymous sign-ins are on, because the app signs players in anonymously.
- `analytics` is off. On Windows its log collector needs Docker's TCP port
  without authentication, which should not be opened, and restarts forever
  without it. The log pages of the local dashboard are empty because of this;
  `npm run functions:serve` and `docker logs` show the logs instead.
- `functions` names the import map of each function (see "Decisions").
- `auth.rate_limit.anonymous_users` is 2000 instead of 30 sign-ins per hour,
  because every backend test signs in new players. Only the local stack.

After changing it, run `npm run db:stop` and `npm run db:start`.

The same settings of the hosted project are changed in its dashboard.

## Schema and access

`migrations/` holds the tables of spec section 8: `profiles`, `workouts`,
`ledger`, `weekly_progress`, `user_gyms`, `user_machines` and `user_styles`.
Every row belongs to a player and is deleted with them. Catalog ids are plain
text; the database does not know the catalog. It does enforce what must never
happen whatever the code does: coins and XP below zero, a quality outside 1 to
4, a workout status the engine does not know, and two installed machines in one
slot.

The app reaches the tables through the Data API with the publishable key and the
player's session:

- Grants: only the `authenticated` role, and only `select`. `anon` and
  `service_role` get nothing. The grants are written out because whether new
  tables are exposed automatically is a project setting.
- Row-level security is on in every table, with one `select` policy that
  matches the player's own rows. There are no insert, update or delete
  policies, so the app cannot write (spec 7.1).

The Edge Functions connect to Postgres directly and are not limited by either;
they filter every query by the caller's id. `tests/rls.test.ts` checks all of
this against the local stack.

The row shapes and the mapping between rows and the game state are in
`packages/contract`.

## CLI version 3

The commands work on the local stack unless they are told otherwise. A command
that should reach the hosted project needs `--remote` (for example
`npx supabase db push --remote`) and asks for confirmation first.

## Decisions

Checked on 2026-11-25 with the function `rules-check`, which runs `processWorkouts`
over the November week and a transaction that is rolled back. It answered
`{"coins":1438,"xp":190,"counted":10,"startGym":"garage","tx":"ok"}` on the local
stack (CLI 3.4.0, edge runtime 1.79.5, Deno 2.1.4) and deployed to the hosted
project.

To repeat it, run `npm run functions:serve` and call the function with the
`ANON_KEY` that `npx supabase status -o json` prints:

```sh
curl -X POST http://127.0.0.1:54321/functions/v1/rules-check -H "Authorization: Bearer <ANON_KEY>"
```

### Functions import the rule packages through an import map

Functions import the TypeScript source by name
(`import { processWorkouts } from '@fitheon/engine'`). There is no build step.
One file, `functions/deno.json`, maps the names for all functions. It has two kinds
of entries:

```json
{
  "imports": {
    "postgres": "npm:postgres@3.4.9",
    "@fitheon/engine": "../../packages/engine/src/index.ts",
    "../../packages/engine/src/constants": "../../packages/engine/src/constants.ts"
  }
}
```

The second kind is needed because the packages import each other's files without an
extension (`from './constants'`), which Deno does not resolve. Every function also
needs an entry in `config.jsonc`:

```jsonc
"functions": {
  "rules-check": { "import_map": "./functions/deno.json" }
}
```

Both parts are required. The CLI reads the `import_map` setting to know which files
outside `functions/` to mount and upload; without it the worker fails to boot. The
runtime finds the map by its name: the same map in a file called `import_map.json`
was ignored. The deploy command prints "Specifying import_map through flags is no
longer supported" and works anyway.

**When a file is added to a rule package, add it to `functions/deno.json`.** A
missing entry makes every function that reaches the file fail to boot with
`Module not found`.

Rejected:

- `"unstable": ["sloppy-imports"]` with whole folders mapped. The module graph
  builds, but the runtime fails to load the files ("Module not found").
- A `deno.json` in each function's folder, as the Supabase guide recommends. It
  works locally, but repeats the file list in every function.
- Bundling the packages with esbuild. It needs a generated file in the repository
  and a check that it is current. Not tried, because the import map works.
- Writing the extensions in the packages' imports. That changes the rule packages
  for the sake of one consumer.

The runtime strips types without checking them, and the root `npm run typecheck`
does not cover `supabase/`. To type-check a function:

```sh
npx -y deno@2 check --no-lock --config supabase/functions/deno.json supabase/functions/rules-check/index.ts
```

### Transactions use postgres.js on a direct connection

```ts
import postgres from 'postgres';

// Created once per worker and reused by its requests.
const sql = postgres(Deno.env.get('SUPABASE_DB_URL') ?? '', { prepare: false, max: 1 });

const result = await sql.begin(async tx => {
  const [row] = await tx`select coins from profiles where id = ${userId} for update`;
  // ... run the rules, write the result
});
```

`SUPABASE_DB_URL` is set by the platform, locally and hosted. `sql.begin` commits
when the callback returns and rolls back when it throws. On the hosted project
`pg_stat_activity` showed the session as `postgres.js`, not as the pooler, so it is a
direct connection. This matters because postgres.js pipelines queries, which the
Supabase docs say does not work with the transaction-mode pooler. Do not point the
functions at port 6543. `prepare: false` follows the Supabase example and is not
required on a direct connection.

The connection uses a database role that bypasses row-level security, so every query
must filter by the user id.

### `verify_jwt` does not prove that a user is signed in

`verify_jwt` is on by default, but the platform also lets a request through when it
carries only the publishable key: on the hosted project `rules-check` answered 200
with the key in `apikey` and no user token. Without any credentials, or with a wrong
token, it answered 401. Each function that acts for a player therefore has to verify
the token itself and take the user id from it.

### Limits (spec section 13, question 5)

| What | Value | Source |
|---|---|---|
| Database connections | 60, of which 3 reserved for superusers; shared with Auth, the Data API and others | hosted project |
| Connections per worker | 1 (`max: 1`), closed when the worker ends | our setting |
| Worker lifetime | 150 s on the free plan; a worker serves many requests | docs |
| CPU time | 2 s per worker | docs |
| Memory | 256 MB | docs |
| Function size | 20 MB bundled by the CLI, 5 MB bundled on the server | docs |
| Size of `rules-check` | 66 kB | deploy output |
| First call, hosted | 1.4 s | one measurement over a home connection to `eu-west-1` |
| Warm call, hosted | 0.27 s, including the transaction | four measurements |
| First call and warm call, local | 0.2 to 0.35 s and 0.02 s | |

A direct connection is enough while the number of concurrent workers stays well under
the 60 connections. If that stops being true, the next step is a pooler in session
mode or a client without pipelining, not the transaction pooler with postgres.js.

### Free plan (spec section 13, question 6)

| What | Free plan |
|---|---|
| Projects | 2 |
| Database size | 500 MB per project |
| Monthly active users | 50,000 |
| Edge Function calls | 500,000 per month |
| Functions per project | 100 |
| Egress | 5 GB per month |
| Pausing | After 7 days with too little database activity |

The quotas other than projects and database size are shared by the whole
organization. Source: the Supabase docs, "Billing", "Edge Functions limits" and
"Free project pausing", read on 2026-11-25.
