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
| `npm run test:backend` | Runs the backend tests in `supabase/tests`. There are none yet |

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

`config.jsonc` configures the local stack. It is the CLI's default with two
changes:

- Anonymous sign-ins are on, because the app signs players in anonymously.
- `analytics` is off. On Windows its log collector needs Docker's TCP port
  without authentication, which should not be opened, and restarts forever
  without it. The log pages of the local dashboard are empty because of this;
  `npm run functions:serve` and `docker logs` show the logs instead.

After changing it, run `npm run db:stop` and `npm run db:start`.

The same settings of the hosted project are changed in its dashboard.

## CLI version 3

The commands work on the local stack unless they are told otherwise. A command
that should reach the hosted project needs `--remote` (for example
`npx supabase db push --remote`) and asks for confirmation first.
