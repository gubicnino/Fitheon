# Fitheon — Product & Technical Specification (v2)

> Written 2026-11-12. Replaces `Fitheon-Specification-v1.md`.
>
> **[Decided]** = agreed explicitly in discussion.
> **[Proposed]** = a default chosen while writing this spec; change freely.
> All numbers (prices, thresholds, level gates) are starting values for
> balancing, not final.

---

## 1. Intent

Fitheon turns real-world training into a gym-building game. Workouts are read
automatically from Apple Health. Each workout earns **coins** and **XP**.
Coins buy and upgrade machines; XP raises the player's **level**, which
unlocks machines, quality tiers and, eventually, the next, bigger gym.

The workout is the gameplay. The app is a fast reward dispenser: open it after
training, see what you earned, spend it in under a minute, and see your gym
visibly improve.

### Goals

- Every workout affords something: there is always a next thing to buy.
- No extra work for the user: no manual logging.
- Usable without an Apple Watch (any app that writes workouts to Apple Health).
- Buildable and maintainable by one developer, on Windows, without a Mac.

### Non-goals (v1)

- Social features, leaderboards, friends.
- Android.
- Premium currency or monetisation.
- Free-form gym building (grid, drag and drop). This was the v1 design and was
  dropped deliberately; see section 12.
- Strong anti-cheat. Rewards are bounded, not verified.

### Anti-goals

- Punishing the user: no streaks to lose, no penalties, nothing is ever taken
  away.
- Asking the user to spend long sessions in the app.
- Rewarding workout-splitting or junk sessions over real training.

---

## 2. Core loop

```
Train (any app or device that writes workouts to Apple Health)
  -> Fitheon syncs new workouts (in background, or when opened)
  -> Server calculates coins + XP
  -> Notification / welcome-back summary
  -> Spend coins: fill a slot, upgrade a machine, restyle the gym
  -> Level up: new machines and quality tiers unlock
  -> Reach the level gate + pay coins: move into the next gym
```

---

## 3. Economy

### 3.1 Qualifying workout rules

| Rule | Value | Status |
|---|---|---|
| Minimum duration | 10 min | Decided |
| Counted minutes per local day | max 120, across all workouts | Decided |
| Manually entered workouts (HealthKit "user entered" flag) | rejected | Decided |
| Overlap | a workout overlapping an already-counted one by more than 50% of the shorter earns nothing; within one sync batch the longer wins | Proposed |
| Sanity checks | end time not in the future; duration ≤ end − start; start not older than 14 days at sync time | Proposed |
| Rewards are final | a late-arriving or deleted workout never claws back earlier rewards | Decided |
| Local day / week | from the device time zone reported at sync; week is Monday–Sunday | Proposed |

Workouts are processed in start-time order. If a workout would exceed the
daily 120 minutes, only the remaining minutes are counted.

### 3.2 Coins

```
coins = round(counted_minutes × multiplier × BASE_RATE)      BASE_RATE = 2
multiplier = max(type_base, intensity_band)                  [Decided]
```

Intensity can only add, never subtract. Users without heart-rate data simply
get the type base.

**Type base**

| Workout types | Base |
|---|---|
| Traditional / functional strength, core, HIIT, cross training | 1.25 |
| Running, rowing, swimming | 1.25 |
| Cycling, hiking, elliptical, sports, anything unlisted | 1.0 |
| Walking, yoga, pilates, flexibility, mind & body | 0.75 |

**Intensity band** (only when METs are available)

| METs | Band |
|---|---|
| < 3 | 0.75 |
| 3–6 | 1.0 |
| 6–8 | 1.25 |
| ≥ 8 | 1.5 |

METs come from `HKAverageMETs` only. If it is absent there is no band and the
type base applies. METs are **not** derived from energy burned: in the real
exports, energy divided by time and body mass does not reproduce the recorded
METs (the implied body mass ranges from 51 to 94 kg across four workouts), so
a derived value would be noise. This also means Fitheon never reads body
mass. [Proposed]

### 3.3 XP and the weekly goal [Decided]

| Source | XP |
|---|---|
| First counted workout of a local day | +20 [value Proposed] |
| Weekly goal reached | +50, once per week, awarded instantly |

- The weekly goal is a number of **active days** per week, 1–7, chosen in
  onboarding (default 3).
- Changing the goal applies from the next Monday.
- XP is never spent or lost. Missing a week has no penalty. No streaks.

XP rewards consistency (narrow range: about 110 per week for a typical user,
190 for someone training daily). Coins reward volume (wide range).

### 3.4 Levels [Proposed]

XP needed to go from level *n* to *n+1* is `10 + 10n`, capped at 110.

| Level | Total XP | | Level | Total XP |
|---|---|---|---|---|
| 2 | 20 | | 7 | 270 |
| 3 | 50 | | 8 | 350 |
| 4 | 90 | | 9 | 440 |
| 5 | 140 | | 10 | 540 |
| 6 | 200 | | 10 + k | 540 + 110k |

The first workout always gives a level-up. A typical user gains several levels
in the first two weeks and about one per week after level 10.

### 3.5 First install [Decided]

- Workouts from the last 7 days are imported and rewarded normally.
- Starter state: Garage gym, default floor and wall, a free Dumbbell rack
  already in its slot.

### 3.6 Worked example (real data, 1–8 Nov 2026)

This is the reward-engine test fixture.

| Date | Activity | Min | METs | Mult | Coins | XP | Status |
|---|---|---|---|---|---|---|---|
| 11-01 | Traditional Strength | 74.6 | 3.76 | 1.25 | 187 | 20 | counted |
| 11-02 | Walking | 32.8 | 4.28 | 1.0 | 66 | 20 | counted |
| 11-02 | Traditional Strength | 70.7 | 3.88 | 1.25 | 177 | 0 | counted |
| 11-02 | Cycling | 7.6 | 9.82 | — | 0 | 0 | below minimum |
| 11-03 | Traditional Strength | 62.5 | 5.62 | 1.25 | 156 | 20 | counted |
| 11-04 | Traditional Strength | 76.5 | 4.77 | 1.25 | 191 | 20 | counted |
| 11-04 | Cycling | 8.3 | 10.46 | — | 0 | 0 | below minimum |
| 11-05 | Functional Strength | 79.2 | 5.88 | 1.25 | 198 | 20 | counted |
| 11-06 | Traditional Strength | 74.2 | 4.04 | 1.25 | 186 | 20 | counted |
| 11-06 | Walking | 12.7 | 8.77 | 1.5 | 38 | 0 | counted |
| 11-08 | Traditional Strength | 72.5 | 2.88 | 1.25 | 181 | 20 | counted |
| 11-08 | Walking | 29.2 | 4.20 | 1.0 | 58 | 0 | counted |

Totals: **1,438 coins**, 140 XP from 7 active days, +50 weekly bonus =
**190 XP**. This is a heavy week. A typical user (three 50-minute strength
sessions) earns about 375 coins and 110 XP.

---

## 4. Gyms, slots and machines

### 4.1 Structure [Decided]

- The player progresses through a series of separate gyms, each bigger.
- Each gym has **fixed slots**, grouped into zones. The layout is preset.
- For each slot the player **chooses** which machine goes there, from the
  options that slot accepts.
- Machines are **upgraded** with coins through quality tiers.
- Each gym **caps** machine quality. Higher tiers exist only in later gyms.
- Machines and quality tiers are also **locked behind player levels**.
- Moving to the next gym needs a player level and a coin payment. A fully
  upgraded current gym is not required.
- On arrival in a new gym, machines from the previous gym can be **brought
  over as copies**, keeping their quality, for free. The previous gym stays
  exactly as it was.
- Each gym has its own purchasable floor and wall styles.

### 4.2 Gyms [Proposed]

| # | Gym | Level gate | Move-in cost | Quality cap | Slots |
|---|---|---|---|---|---|
| 1 | Garage | 1 | free | Basic | 5 |
| 2 | Neighbourhood gym | 6 | 500 | Standard | 9 |
| 3 | Commercial gym | 16 | 2,000 | Commercial | 15 |
| 4 | Elite club | 30 | 5,000 | Elite | 22 |

Expected arrival for a typical user: Neighbourhood about week 2, Commercial
about week 11, Elite about week 25. More gyms can be appended later without
changing the model.

**Slots per gym, by category**

| Gym | Free weights | Bench | Press | Rack | Pull | Cardio | Machine | Decor |
|---|---|---|---|---|---|---|---|---|
| Garage | 1 | 1 | 1 | 1 (Rack or Pull) | — | 1 | — | — |
| Neighbourhood | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| Commercial | 2 | 2 | 1 | 2 | 1 | 3 | 2 | 2 |
| Elite | 2 | 2 | 2 | 2 | 2 | 4 | 4 | 4 |

### 4.3 Quality tiers [Proposed]

| Tier | Name | Gym cap from | Player level | Upgrade step price |
|---|---|---|---|---|
| Q1 | Basic | Garage | 1 | 100 |
| Q2 | Standard | Neighbourhood | 7 | 300 |
| Q3 | Commercial | Commercial gym | 18 | 800 |
| Q4 | Elite | Elite club | 32 | 1,500 |

- A tier is available when both the gym cap and the player level allow it.
- Step price is multiplied by the machine's size class (×0.5, ×1, ×1.5).
- Installing a new machine costs the step price of its starting tier.
- A quality tier may change the model, not only the colour. Example
  [Decided]: the Pull-up station becomes a Lat pulldown at Commercial quality.
- Tiers must look clearly different at phone size: bold colour and material
  changes rather than fine detail.

### 4.4 Machine lines [Proposed]

The list is constrained by the art pack (section 9) and is finalised after the
render test.

| Line | Category | Starts at | Unlock level | Size class |
|---|---|---|---|---|
| Dumbbell rack (free starter) | Free weights | Q1 | 1 | ×1 |
| Flat bench | Bench | Q1 | 1 | ×0.5 |
| Bench press | Press | Q1 | 1 | ×1 |
| Exercise bike | Cardio | Q1 | 2 | ×1 |
| Kettlebell rack | Free weights | Q1 | 2 | ×0.5 |
| Squat rack | Rack | Q1 | 3 | ×1 |
| Pull-up station → Lat pulldown | Pull | Q1 | 4 | ×1 |
| Adjustable bench | Bench | Q2 | 8 | ×0.5 |
| Treadmill | Cardio | Q2 | 9 | ×1.5 |
| Pec deck | Machine | Q2 | 10 | ×1.5 |
| Rowing machine | Cardio | Q2 | 11 | ×1 |
| Power rack | Rack | Q2 | 12 | ×1.5 |
| Cable machine | Machine | Q2 | 13 | ×1.5 |
| Smith machine | Press, Rack | Q3 | 20 | ×1.5 |
| Multi-gym | Machine | Q3 | 22 | ×1.5 |

**Decor** (single quality, flat price): Plant 150, Wall TV 400, Sofa 500,
Lockers 600, Reception desk 800.

**Floor and wall styles:** three of each per gym. One is the default; the
other two cost coins (roughly 300–1,500, rising with the gym). Owned styles
switch freely.

### 4.5 Slot rules

- **Choose:** an empty slot lists the machines it accepts that the player has
  unlocked. Buying one installs it.
- **Bring over** [Decided]: in a new gym, an empty slot also lists machines
  from the previous gym that fit its category. Bringing one is free and keeps
  its quality. Each previous-gym machine can be brought over once. [Proposed]
- **Upgrade:** pay the step price to raise the installed machine one tier.
- **Swap** [Proposed]: replacing a machine never loses it. The old machine is
  stored for that slot at its quality, and swapping back is free. There is no
  selling and no inventory screen.
- **Old gyms** [Proposed]: remain visitable and remain editable, so players
  can go back and finish them. They are never altered by moving on.

### 4.6 Balance approach

Balancing is deferred until the game is playable. [Decided] Heavy trainers
earn about four times the coins of typical users but only
about 1.7 times the XP. Typical users will be coin-limited; heavy users will
be level-limited. A small **economy simulator** (a script that replays weeks
of typical and heavy training against the catalog) is part of the project and
is how prices and gates get tuned.

---

## 5. Screens

| Screen | Content |
|---|---|
| Onboarding | Welcome → Apple Health permission (phase 2) → weekly goal picker → 7-day import summary → gym |
| Setup guide | Shown when the first import finds no workouts: how to enable writing to Apple Health in Strong, Hevy, Strava and similar apps [Decided] |
| Gym (home) | The current gym as a fixed isometric picture. Header: coins, level and XP bar, weekly goal progress. Empty slots are visibly marked. A highlighted "Move to next gym" action when the gate is reached |
| Slot sheet | Opens on tapping a slot: choose, bring over, upgrade, swap. Locked options show the level they need |
| Style sheet | Floor and wall styles for the current gym |
| Gyms | The chain: every gym owned, plus the next one with its requirements |
| Welcome-back summary | Shown when new rewards exist: workouts, coins, XP, level-ups, new unlocks |
| Activity | Synced workouts with title (when the source app provides one), duration, multiplier, coins, XP. Uncounted ones are greyed with the reason |
| Settings | Weekly goal (applies next Monday), sync now, account, delete account |

There is no edit mode, no inventory and no separate shop.

---

## 6. Notifications [Decided]

- HealthKit background delivery wakes the app when a workout is saved. The
  app syncs and posts a local notification, worded as already earned:
  "Strength, 74 min: +187 coins".
- iOS controls the timing and delivers nothing while the phone is locked.
  Sync on app open remains the fallback.
- Notification permission is requested after the first reward, not during
  onboarding.
- Requires a custom build, so this is phase 2 (section 10).

---

## 7. Architecture

```
┌──────────── iPhone ─────────────┐        ┌────────── Supabase ───────────┐
│ Expo app (React Native, TS)     │        │ Auth (anonymous, later Apple) │
│  - HealthSource interface       │ HTTPS  │ Postgres (+ RLS, read-only    │
│      mock | HealthKit           │ ─────► │   for the client)             │
│  - Layered-image gym view       │        │ Edge Functions (all writes)   │
│  - Supabase JS client (reads)   │        │                               │
└─────────────────────────────────┘        └───────────────────────────────┘
        shared TypeScript packages: reward engine, catalog
```

| Layer | Choice | Status |
|---|---|---|
| Mobile | Expo (React Native, TypeScript), Expo Router | Decided |
| Backend | Supabase: Auth, Postgres, Edge Functions | Decided |
| Health | Behind a `HealthSource` interface. Mock implementation first; HealthKit via `@kingstinct/react-native-healthkit`, to be confirmed by research during planning | Decided |
| Gym rendering | Pre-rendered images layered in fixed order (floor, walls, slots back to front) with tappable slot areas. No game engine, no Skia | Proposed |
| State | TanStack Query for server state; minimal local state | Proposed |
| Reward engine | Pure TypeScript package, used by Edge Functions, tests and the simulator | Decided |
| Catalog | Gyms, slots, machines, prices and level gates as a shared TypeScript package, not database tables | Proposed |

### 7.1 Write rule [Decided]

The app reads its own rows directly (row-level security, select only). It
never writes tables. Every change goes through an Edge Function.

Edge Functions run each operation in a single database transaction over a
direct Postgres connection, locking the user's profile row first so that
concurrent calls for one user are serialised. [Proposed; confirm the
connection approach during planning]

| Function | Purpose |
|---|---|
| `sync-workouts` | Ingest workouts, apply rules, award coins and XP, weekly bonus, level-ups. Idempotent: safe to call twice |
| `install-machine` | Buy or bring over a machine into a slot |
| `upgrade-machine` | Raise the installed machine one tier |
| `swap-machine` | Switch a slot to another owned or new machine |
| `buy-style` / `set-style` | Buy or switch a floor or wall style |
| `move-gym` | Check level and coins, unlock the next gym |
| `set-weekly-goal` | Store the pending goal for next Monday |
| `delete-account` | Remove the user and all data |

### 7.2 Sync [Decided]

- The client uses HealthKit **anchored queries**, so workouts that reach the
  phone late are still picked up. The anchor is stored on the device.
- The same endpoint serves background and foreground sync.
- The client sends only what the engine needs: HealthKit UUID, activity type,
  start, end, duration, `HKAverageMETs` if present, source app identifier,
  the user-entered flag, the device time zone, and the workout title
  (`HKWorkoutBrandName`, e.g. Strong's "Chest Triceps Rame") for display.
- `HKTimeZone` is not reliable: Apple Watch workouts carry it, Strong
  workouts do not. The device time zone at sync is used for all workouts.
- Health data contains only a summary per workout. Exercises, sets, reps and
  weights are not available, so rewards can never depend on them.

### 7.3 Sign-in

- **Phase 1:** Supabase anonymous sign-in, created silently on first launch.
- **Phase 2:** Sign in with Apple, linked to the same account. No email or
  password sign-in. [Decided]
- Required Apple sign-in at first launch was the stated preference; anonymous
  sign-in is used first only because Sign in with Apple needs the paid
  developer account.

### 7.4 Operations

- Supabase free projects pause after about a week without activity. A
  scheduled ping (GitHub Actions cron) keeps the project awake. [Proposed]

---

## 8. Data model (Postgres)

```sql
profiles (
  id uuid pk references auth.users,
  coins int not null default 0,          -- cached; ledger is the source of truth
  xp int not null default 0,             -- cached
  level int not null default 1,          -- cached
  weekly_goal int not null check (weekly_goal between 1 and 7),
  pending_weekly_goal int,
  current_gym text not null default 'garage',
  last_summary_seen_at timestamptz,
  created_at timestamptz default now()
)

workouts (
  id uuid pk,
  user_id uuid references profiles,
  hk_uuid text not null,
  activity_type text, source_bundle text,
  title text,                            -- HKWorkoutBrandName, if any
  start_at timestamptz, end_at timestamptz,
  duration_s numeric,
  mets numeric,                          -- HKAverageMETs, null if absent
  local_date date, week_start date,
  counted_minutes numeric default 0,
  multiplier numeric,
  status text,          -- counted | below_min | daily_cap | overlap | user_entered | invalid
  coins_awarded int default 0,
  xp_awarded int default 0,
  unique (user_id, hk_uuid)
)

ledger (                -- append-only
  id bigserial pk,
  user_id uuid references profiles,
  kind text,            -- workout | weekly_bonus | install | upgrade | style | move_gym | starter
  coins_delta int default 0,
  xp_delta int default 0,
  ref text,
  created_at timestamptz default now()
)

weekly_progress (
  user_id uuid, week_start date,
  goal int, active_days int default 0,
  bonus_awarded_at timestamptz,
  primary key (user_id, week_start)
)

user_gyms (
  user_id uuid, gym_id text,
  floor_style text, wall_style text,
  unlocked_at timestamptz default now(),
  primary key (user_id, gym_id)
)

user_machines (         -- every machine owned in a slot, installed or stored
  id uuid pk,
  user_id uuid, gym_id text, slot_id text,
  machine_id text, quality int,
  installed bool not null,
  brought_from uuid,    -- source machine in the previous gym, if copied
  unique (user_id, gym_id, slot_id, machine_id)
)                       -- plus: at most one installed row per (user, gym, slot)

user_styles (
  user_id uuid, gym_id text, style_id text,
  primary key (user_id, gym_id, style_id)
)
```

Health data is stored at the minimum needed: no energy, body mass or heart
rate is kept on the server.

---

## 9. Art pipeline

- **Source** [Decided]: the free "VNB Low Poly Gym Set" (3D, FBX). The licence
  allows commercial use; credit is appreciated, not required; reselling the
  models is forbidden.
- **Sprites:** a Blender script renders each machine at each quality from one
  fixed isometric camera, with transparent background.
- **Quality tiers:** the pack colours every model from a small palette image,
  so tiers are made by palette swaps, plus the alternative models the pack
  includes (several benches, two treadmills, two barbell stands, two pull-up
  stands, five machine bodies with attachments).
- **Gyms:** each gym is a Blender scene defining slot positions. Floors and
  walls are simple textured surfaces made for the project and rendered as
  separate layers per style.
- **Known gaps:** no leg press or elliptical in the pack; many models ship in
  parts and need assembling.
- **First step:** a render test of three or four machines at phone size, to
  confirm the look before the catalog is finalised.

---

## 10. Development phases

Constraints: Windows only, no Mac, an iPhone for testing, no paid Apple
Developer account yet.

**Phase 1 — Expo Go, no cost**
- Repository, shared packages, reward engine with the fixture, simulator.
- Supabase schema, Edge Functions, anonymous sign-in.
- The full game: gyms, slots, upgrades, styles, levels, summary, activity.
- Workouts come from the mock `HealthSource` (the November fixture plus
  generated weeks).
- Art pipeline and assets.

**Phase 2 — after buying the Apple Developer account**
- Custom build through Expo's cloud build service.
- Real HealthKit reading with anchored queries.
- Background delivery and notifications.
- Sign in with Apple, linked to the anonymous account.
- Setup guide verified against what Strong and similar apps really write.

Accepted risk: the HealthKit integration is tested last. Buying the account
earlier removes that risk.

---

## 11. Testing

- **Reward engine unit tests:** minimum duration, daily minute cap and partial
  counting, overlap, type base and intensity bands, XP once per day, weekly
  bonus timing, level thresholds. The section 3.6 table is a fixture with
  expected totals.
- **Catalog validation tests:** every slot has at least one machine available
  at the gym's gate level; prices and gates are consistent.
- **Economy simulator:** weeks-to-reach figures for typical and heavy users.
- **Edge Function tests** against a local Supabase instance (Docker).
- **CI:** type check, lint and tests on every push.

---

## 12. Future ideas (not in v1)

- **Mirror gym:** zones grow from the matching kind of training.
- **Delivery crates:** each workout delivers a random item, with a
  collection book.
- **Built-in workout timer** for users with no logging app (runs in real
  time, writes to Apple Health).
- Friends, visiting gyms, leaderboards; with them, App Attest and
  source-based reward weighting.
- More gyms and machine lines.
- Free-placement sandbox mode.
- Android / Health Connect.

---

## 13. Open questions for planning

1. Confirm `@kingstinct/react-native-healthkit`: maintenance, anchored
   queries, background delivery, Expo support.
2. What do Strong, Hevy and Strava write to Apple Health **without a Watch**?
   The real Strong export was recorded through Strong's Apple Watch app, so
   it includes METs and energy. Per Strong's described behaviour, phone-only
   logging writes workout type, start, end, duration and an estimated active
   energy, which is everything the type-base formula needs; no METs are
   expected, so no intensity band. Confirm on a device in phase 2, and check
   Hevy and Strava the same way.
3. Can the iPhone Fitness app record workouts without a Watch?
4. Linking a Supabase anonymous account to Sign in with Apple.
5. Direct Postgres transactions from Edge Functions: connection approach and
   limits.
6. Current Supabase free-tier limits.
7. Outcome of the art render test; final machine list and tier looks.
