# SportsBuzz Backend

REST API backend for the SportsBuzz live feed application. Built with **Bun**, **Express**, **TypeScript**, **Drizzle ORM**, and **PostgreSQL** (Neon). Manages matches and match status (scheduled / live / finished).

---

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Runtime      | [Bun](https://bun.sh)               |
| Framework    | Express 5                           |
| Language     | TypeScript (ESM)                    |
| Database     | PostgreSQL (Neon serverless)        |
| ORM          | Drizzle ORM                         |
| Validation   | Zod                                 |
| Config       | dotenv (`PORT`, `DATABASE_URL`)     |

---

## Architecture

High-level flow: **Client → Express → Routes → Validation → Drizzle → Neon PostgreSQL**.

### Architecture Flow (Textual)

- Client sends HTTP requests to the Express backend.
- Express handles routing and JSON body parsing.
- Route handlers validate input (with Zod), perform DB queries/updates (with Drizzle), and return formatted responses.
- Drizzle ORM interacts with Neon PostgreSQL for data persistence.

**Layer responsibilities:**

- **Express** — HTTP server, JSON body parsing, route mounting.
- **Routes** — Request handling; validate input (Zod), call DB, format response.
- **Validation** — Query and body schemas (limit, sport, teams, times, scores).
- **Utils** — `getMatchStatus(startTime, endTime)` → `scheduled` | `live` | `finished`.
- **DB** — Drizzle + Neon serverless pool; schema: `matches`, `commentary` (relations defined).

---

## Sequence: List Matches (GET /matches)

1. Client sends `GET /matches?limit=50`
2. Express routes request to the matches handler.
3. The query object is validated with `listMatchesQuerySchema`.
   - **If validation fails**: Return HTTP 400 with error details.
   - **If validation succeeds**: Continue.
4. Drizzle ORM queries the `matches` table, ordering by `createdAt` descending and applying a limit.
5. Results are returned as `{ data: result }` with HTTP 200.

---

## Sequence: Create Match (POST /matches)

1. Client sends `POST /matches` with `{ sport, homeTeam, awayTeam, startTime, endTime, ... }`
2. Express routes request to the matches handler.
3. The request body is validated with `createMatchSchema`.
   - **If validation fails**: Return HTTP 400 with error details.
   - **If validation succeeds**: Continue.
4. The `getMatchStatus` util determines match status (`scheduled`/`live`/`finished`) based on times.
5. Drizzle ORM inserts the new match record into the DB and returns the inserted row(s).
   - **If DB error**: Return HTTP 500 with error details.
   - **If success**: Return `{ data: insertedMatch }` with HTTP 201.

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Express app, health check, mount /matches
│   ├── routes/
│   │   └── matches.ts        # GET / and POST / for matches
│   ├── db/
│   │   ├── db.ts             # Neon pool + Drizzle instance
│   │   └── schema.ts         # matches, commentary tables, relations, types
│   ├── validations/
│   │   └── matches.ts        # Zod schemas (list query, create body, etc.)
│   └── utils/
│       └── matchStatus.ts    # getMatchStatus, syncMatchStatus
├── drizzle.config.ts        # Drizzle Kit config (schema, migrations out dir)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Environment Variables

| Variable        | Required | Description                          |
| --------------- | -------- | ------------------------------------ |
| `DATABASE_URL`  | Yes      | Neon PostgreSQL connection string    |
| `PORT`          | No       | Server port (default: `8000`)        |

Create a `.env` in the project root (see `.env.example` if present). **Do not commit real credentials.**

---

## Setup & Run

**Install dependencies:**

```bash
bun install
```

**Run in development (watch mode):**

```bash
bun run dev
```

**Run production:**

```bash
bun run start
```

**Build (output in `dist/`):**

```bash
bun run build
```

**Database (Drizzle):**

```bash
bun run db:generate   # generate migrations from schema
bun run db:migrate    # run migrations
bun run db:studio     # open Drizzle Studio
```

Server listens on `PORT` (default `8000`). Health check: `GET http://localhost:8000/health` → `200 OK`.

---

## API Summary

| Method | Path       | Description                    | Validation / Behavior                            |
| ------ | ---------- | ------------------------------ | ------------------------------------------------ |
| GET    | `/health`  | Liveness check                 | —                                                |
| GET    | `/matches` | List matches (newest first)    | Query: `limit` (optional, max 100, default 50)   |
| POST   | `/matches` | Create a match                 | Body: `sport`, `homeTeam`, `awayTeam`, `startTime`, `endTime` (ISO); optional `homeScore`, `awayScore`. `endTime` must be after `startTime`. Status derived automatically. |

**List response:** `200` → `{ data: Match[] }`  
**Create response:** `201` → `{ data: Match }`  
**Errors:** `400` (validation) with `error` and `details`; `500` (server) with `error` and `details`.

---

## Database Schema (conceptual)

- **matches** — `id`, `sport`, `home_team`, `away_team`, `status` (enum: scheduled | live | finished), `start_time`, `end_time`, `home_score`, `away_score`, `created_at`.
- **commentary** — `id`, `match_id` (FK → matches, onDelete cascade), `minute`, `sequence`, `period`, `event_type`, `actor`, `team`, `message`, `metadata` (jsonb), `tags` (array), `created_at`.
- Relations: matches → many commentary; commentary → one match.

Schema and types are defined in `src/db/schema.ts`; run `db:generate` and `db:migrate` to apply.

---

## Match Status Logic

`getMatchStatus(startTime, endTime, now?)`:

- If `now < startTime`: **scheduled**
- If `now >= endTime`: **finished**
- Otherwise: **live**

Used during match creation to set `status`. `syncMatchStatus` can be used for background status updates if needed.
