# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Fitheon is an iPhone app that turns real workouts (read from Apple Health) into a gym-building game: workouts earn coins and XP, which buy and upgrade machines across four gyms. It is a solo project built in phases; each phase is accepted by the owner before the next is planned.

Read `docs/superpowers/HANDOFF.md` first if it exists. It is git-ignored and local, and holds the current status, the decisions with their reasons, and the next action. The product and technical spec is `dokumentacija/Fitheon-Specification-v2.md` (English). The README and the other files in `dokumentacija/` are in Slovenian; code, comments and commit messages are in English.

## Commands

Node 22, npm workspaces. Install from the repo root only (`npm install`), never inside a workspace.

From the repo root:

```sh
npm test                 # all Vitest suites in packages/* and tools/*
npm run typecheck        # tsc over packages/* and tools/* (does NOT cover apps/mobile)
npm run november         # scores the real November 2026 week fixture
npm run simulate -- 12   # economy simulation for N weeks (default 52)

npx vitest run packages/game/test/applyAction.test.ts   # one file
npx vitest run -t "name of the test"                    # one test by name
```

From `apps/mobile`:

```sh
npx expo start      # dev server; the app is tested in Expo Go on an iPhone
npm run lint        # expo lint
npm run typecheck   # tsc for the app
```

CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run typecheck` and `npm test` from the root, so it does not lint or typecheck the mobile app yet.

**Vitest quirk on this machine:** Vitest fails with "failed to find the current suite" when the shell's working directory has a lowercase drive letter (`c:\Code\Fitheon`). Re-enter the folder with an uppercase letter (`cd C:\Code\Fitheon`) and run again.

## Architecture

All game rules live in three shared TypeScript packages so that the app, the future server and the tests run the same code. Rules never belong in `apps/mobile`.

```
engine   <-  game  <-  tools/sim
catalog  <-  game
```

- **`packages/engine`**: turns workouts into coins and XP. The entry point is `processWorkouts(input)`, a pure function: it takes `now`, a time zone, the already-processed `history` and the `incoming` raw workouts, and returns every incoming workout with a status (`counted`, `below_min`, `daily_cap`, `overlap`, `user_entered`, `invalid`), coins, XP and any weekly bonuses. Bad workout data never throws, it comes back as `invalid`; only a bad `now` or time zone throws. Tunable numbers are in `constants.ts`; levels are derived from XP in `levels.ts`. The real-data fixture is exported as `@fitheon/engine/fixtures/november2026`.
- **`packages/catalog`**: static data and prices: the four gyms with their slots and styles, the machine lines, the four quality tiers, and the pricing functions. No state.
- **`packages/game`**: the player's `GameState` and `applyAction(state, action)`, a pure reducer that returns `{ ok: true, state, coinsDelta }` or `{ ok: false, error }` with a typed `ActionError`. `slotView` computes what a slot screen shows (what can be bought, upgraded or brought over, and why something is blocked) from the same helpers, so UI and rules cannot disagree.
- **`tools/sim`**: runs simulated player profiles through engine and game to check the economy (`npm run simulate`) and scores the November fixture (`npm run november`).

The packages are consumed as TypeScript source: each `package.json` `exports` points at `./src/index.ts`, there is no build step and no `dist`. Cross-package imports use the `@fitheon/*` names, never relative paths. Type checking is strict with `noUncheckedIndexedAccess`.

**`apps/mobile`** is an Expo SDK 58 app using Expo Router (routes in `src/app/`, `@/` maps to `src/`). It is still close to the `create-expo-app` scaffold and does not yet import the rule packages. `apps/mobile/AGENTS.md` has the Expo rules; the important ones: check the versioned Expo docs before using any Expo API, add packages with `npx expo install`, and never create `ios/` or `android/` by hand.

**`supabase/`** is an empty placeholder. The planned backend: the app reads its own rows directly, and every write goes through an Edge Function that uses the shared rule packages.

## Constraints that shape the work

- Development is on Windows with no Mac, and there is no paid Apple Developer account yet. That rules out local iOS builds and development builds, so the app must keep working in Expo Go.
- Expo Go cannot read Apple Health. Until the HealthKit phase, the app uses mock workouts.
- Changes to rules or to earlier design decisions are discussed with the owner before they are made, and the spec is updated with them.
