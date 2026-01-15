# Biathlon Prediction App

A fun side project to predict biathlon race podiums and compete with friends.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14+ (App Router) | Modern React patterns, server components, API routes |
| Database | Supabase (PostgreSQL) | Managed DB, easy setup, generous free tier |
| Auth | Supabase Auth | Seamless integration, handles OAuth/email |
| Styling | Tailwind CSS | Fast prototyping, widely adopted |
| Deployment | Vercel | Zero-config for Next.js |

## Core Features (v1)

1. **Authentication** - Sign up / login via Supabase
2. **Races** - View upcoming races (synced from biathlonresults.com API)
3. **Predictions** - Select 3 athletes for podium positions
4. **Results** - See actual results and your score
5. **Leaderboard** - Compare scores with friends

## Scoring System

| Outcome | Points |
|---------|--------|
| Correct athlete in correct position | 3 |
| Correct athlete, wrong position | 1 |

## Data Source: biathlonresults.com API

**Base URL:** `http://biathlonresults.com/modules/sportapi/api/`

### Key Endpoints

| Endpoint | Parameters | Description |
|----------|------------|-------------|
| `Seasons` | - | Get available seasons |
| `Events` | `SeasonId`, `Level` | Get events (World Cup stages, etc.) |
| `Competitions` | `EventId` | Get races within a stage |
| `Results` | `RaceId` | Get race results |
| `Athletes` | `FamilyName`, `GivenName` | Search athletes |
| `CISBios` | `IBUId` | Get athlete details by ID |
| `Cups` | `SeasonId` | List of cup competitions |
| `CupResults` | `CupId` | Cup standings |

### Level Types

| Value | Description |
|-------|-------------|
| 1 | BMW IBU World Cup |
| 2 | IBU Cup |
| 3 | Junior Cup |
| 4 | Other |
| 5 | Regional |
| 6 | Para |

### Example: Fetch World Cup Events

```
GET http://biathlonresults.com/modules/sportapi/api/Events?SeasonId=2425&Level=1
```

### Reference

Python wrapper by prtkv: https://github.com/prtkv/biathlonresults

## Database Schema (Planned)

```
users (managed by Supabase Auth)
  - id
  - email
  - created_at

profiles
  - id (references auth.users)
  - display_name
  - avatar_url

races
  - id
  - external_id (from biathlonresults)
  - name
  - event_name
  - start_time
  - status (upcoming, in_progress, completed)

athletes
  - id
  - ibu_id
  - name
  - nationality
  - gender

predictions
  - id
  - user_id
  - race_id
  - first_place_athlete_id
  - second_place_athlete_id
  - third_place_athlete_id
  - created_at

results
  - id
  - race_id
  - first_place_athlete_id
  - second_place_athlete_id
  - third_place_athlete_id
```

## Roadmap

### v1 (MVP)
- [ ] Supabase setup (auth + database)
- [ ] User authentication flow
- [ ] Fetch and display upcoming races
- [ ] Prediction submission form
- [ ] Results display with scoring
- [ ] Basic leaderboard

### Future Ideas
- Prediction for entire top 10
- Season-long competitions
- Race type filtering (sprint, pursuit, mass start, individual, relay)
- Push notifications for race starts
- Historical stats and trends
