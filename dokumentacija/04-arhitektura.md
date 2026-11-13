# Arhitektura

Dokument opisuje zgradbo sistema Fitheon, podatkovni model in uporabljene
tehnologije.

Vir: [Fitheon-Specification-v2.md](Fitheon-Specification-v2.md), poglavji 7
in 8.

## 1. Arhitekturni diagram

```mermaid
flowchart LR
    AH["Apple Health<br/>(treningi)"]
    APP["Mobilna aplikacija<br/>Expo / React Native"]
    EF["Edge Functions<br/>(vsa pisanja)"]
    DB[("Postgres<br/>baza podatkov")]

    AH -->|branje treningov| APP
    APP -->|zahteve za spremembe| EF
    EF -->|transakcije| DB
    DB -->|branje lastnih podatkov| APP

    subgraph SB["Supabase"]
        EF
        DB
    end
```

Sistem ima tri dele:

- **Apple Health** je vir podatkov. Vanj treninge zapisujejo ura Apple Watch
  in aplikacije, kot so Strong, Hevy in Strava. Fitheon iz njega samo bere.
- **Mobilna aplikacija** na iPhonu prebere nove treninge, jih pošlje strežniku
  in prikazuje fitnes.
- **Supabase** je zaledje: avtentikacija, baza Postgres in funkcije Edge
  Functions, ki izvajajo pravila igre.

### Pravilo pisanja

Aplikacija svoje podatke iz baze **bere neposredno**, vendar jih **nikoli ne
piše**. Vsaka sprememba (sinhronizacija treningov, nakup, nadgradnja, selitev)
gre skozi funkcijo Edge Function, ki pravila preveri na strežniku in spremembo
izvede v eni transakciji. Tako uporabnik ne more sam spremeniti stanja
kovancev ali ravni. Varnost na ravni vrstic (RLS) zagotavlja, da vsak
uporabnik vidi le svoje podatke.

### Skupna pravila igre

Pravila za nagrade ter katalog fitnesov, naprav in cen so v skupnih paketih
TypeScript. Ista koda teče v funkcijah Edge Functions, v testih in v
simulatorju ekonomije, zato se izračun nagrad nikjer ne podvaja.

| Paket | Namen |
|---|---|
| `packages/engine` | Pretvori treninge v kovance in XP |
| `packages/catalog` | Fitnesi, mesta, naprave, slogi in cene |
| `packages/game` | Stanje igre in dejanja igralca |
| `tools/sim` | Simulator ekonomije in orodje za ukazno vrstico |
| `mobile-app` | Mobilna aplikacija (Expo) |

### Strežniške funkcije

| Funkcija | Namen |
|---|---|
| `sync-workouts` | Sprejme treninge, uporabi pravila, dodeli kovance, XP, tedenski bonus in ravni. Ponovni klic istega treninga ne nagradi dvakrat. |
| `install-machine` | Nakup ali prenos naprave na mesto |
| `upgrade-machine` | Dvig postavljene naprave za eno kakovostno stopnjo |
| `swap-machine` | Menjava naprave na mestu |
| `buy-style` / `set-style` | Nakup ali preklop sloga tal oziroma sten |
| `move-gym` | Preveri raven in kovance ter odklene naslednji fitnes |
| `set-weekly-goal` | Shrani tedenski cilj, ki začne veljati naslednji ponedeljek |
| `delete-account` | Izbriše uporabnika in vse njegove podatke |

## 2. Podatkovni model

Baza Postgres ima sedem tabel. Katalog (fitnesi, mesta, naprave, cene) ni v
bazi, ampak v kodi; tabele hranijo le stanje posameznega uporabnika.

```mermaid
erDiagram
    profiles ||--o{ workouts : "ima"
    profiles ||--o{ ledger : "ima"
    profiles ||--o{ weekly_progress : "ima"
    profiles ||--o{ user_gyms : "ima"
    user_gyms ||--o{ user_machines : "vsebuje"
    user_gyms ||--o{ user_styles : "ima"

    profiles {
        uuid id PK
        int coins
        int xp
        int level
        int weekly_goal
        int pending_weekly_goal
        text current_gym
    }
    workouts {
        uuid id PK
        uuid user_id FK
        text hk_uuid
        text activity_type
        timestamptz start_at
        timestamptz end_at
        numeric counted_minutes
        numeric multiplier
        text status
        int coins_awarded
        int xp_awarded
    }
    ledger {
        bigserial id PK
        uuid user_id FK
        text kind
        int coins_delta
        int xp_delta
    }
    weekly_progress {
        uuid user_id PK
        date week_start PK
        int goal
        int active_days
        timestamptz bonus_awarded_at
    }
    user_gyms {
        uuid user_id PK
        text gym_id PK
        text floor_style
        text wall_style
    }
    user_machines {
        uuid id PK
        uuid user_id FK
        text gym_id
        text slot_id
        text machine_id
        int quality
        bool installed
    }
    user_styles {
        uuid user_id PK
        text gym_id PK
        text style_id PK
    }
```

| Tabela | Vsebina |
|---|---|
| `profiles` | En zapis na uporabnika: kovanci, XP, raven, tedenski cilj in trenutni fitnes. Kovanci, XP in raven so predpomnjene vrednosti; vir resnice je `ledger`. |
| `workouts` | Vsak sinhroniziran trening z izračunano nagrado in statusom (`counted`, `below_min`, `daily_cap`, `overlap`, `user_entered`, `invalid`). Par (`user_id`, `hk_uuid`) je unikaten, zato se trening ne more zabeležiti dvakrat. |
| `ledger` | Knjiga vseh sprememb kovancev in XP, v katero se zapisi samo dodajajo: nagrade za treninge, tedenski bonusi, nakupi, nadgradnje, slogi, selitve. |
| `weekly_progress` | Napredek tedenskega cilja: cilj, število aktivnih dni in čas dodelitve bonusa za posamezen teden. |
| `user_gyms` | Fitnesi, ki jih je uporabnik odklenil, z izbranim slogom tal in sten. |
| `user_machines` | Vse naprave uporabnika po mestih, postavljene ali shranjene, z njihovo kakovostjo. Na enem mestu je lahko postavljena le ena. |
| `user_styles` | Slogi tal in sten, ki jih je uporabnik kupil. |

Zdravstveni podatki se hranijo v najmanjšem potrebnem obsegu: porabljena
energija, telesna masa in srčni utrip se na strežniku ne shranjujejo.

## 3. Tehnologije

| Področje | Tehnologija | Zakaj |
|---|---|---|
| Mobilna aplikacija | Expo (React Native), TypeScript, Expo Router | Razvoj za iPhone na sistemu Windows, brez računalnika Mac |
| Zaledje | Supabase: Auth, Postgres, Edge Functions | Avtentikacija, baza in strežniške funkcije v eni storitvi z brezplačnim paketom |
| Podatki o treningih | Apple Health (HealthKit) za vmesnikom `HealthSource` | Vmesnik omogoča razvoj z lažnimi (mock) podatki, preden je na voljo pravi HealthKit |
| Prijava | Anonimna prijava Supabase, pozneje Sign in with Apple | Uporabnik začne brez registracije |
| Pravila igre | Skupni paketi TypeScript (`engine`, `catalog`, `game`) | Ista koda v aplikaciji, na strežniku in v testih |
| Prikaz fitnesa | Vnaprej izrisane slike, zložene v plasti | Ni potrebe po igralnem pogonu |
| Stanje v aplikaciji | TanStack Query | Predpomnjenje in osveževanje podatkov s strežnika |
| Grafika | Blender, brezplačen paket 3D-modelov »VNB Low Poly Gym Set« | Izris naprav iz ene izometrične kamere |
| Testiranje | Vitest | Enotski testi pravil nagrajevanja in kataloga |
| Razvojno okolje | Node 22, npm workspaces, tsx | Monorepo s skupnimi paketi |

