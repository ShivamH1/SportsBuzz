# SportsBuzz Backend

REST API and WebSocket backend for the SportsBuzz live feed application. Built with **Bun**, **Express**, **TypeScript**, **Drizzle ORM**, and **PostgreSQL** (Neon). Manages matches and match status (scheduled / live / finished), with real-time updates over WebSocket and protection via **Arcjet** (shield, bot detection, rate limiting).

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
| Real-time    | WebSocket (`ws`, path `/ws`)        |
| Security     | [Arcjet](https://arcjet.com) (shield, detectBot, slidingWindow) |
| Config       | dotenv (`PORT`, `HOST`, `DATABASE_URL`, `ARCJET_*`) |

---

## Architecture

High-level flow: **Client → HTTP/WS → Arcjet (optional) → Express / WebSocket → Routes or WS handler → Validation → Drizzle → Neon PostgreSQL**.

### Architecture Diagram

```mermaid
flowchart TB
    subgraph Client
        HTTP[HTTP Client]
        WS[WebSocket Client]
    end

    subgraph Backend["Backend (Bun + Express)"]
        Server[HTTP Server]
        Arcjet[Arcjet]
        Express[Express]
        Routes[Routes /matches]
        Validation[Validation Zod]
        WSS[WebSocket Server]
    end

    subgraph Data
        Drizzle[Drizzle ORM]
        DB[(Neon PostgreSQL)]
    end

    HTTP --> Server
    WS -->|Upgrade /ws| Server
    Server --> Arcjet
    Arcjet -->|Allow| Express
    Arcjet -->|Allow| WSS
    Arcjet -->|Deny| HTTP
    Express --> Routes
    Routes --> Validation
    Validation --> Drizzle
    Drizzle --> DB
    WSS -->|heartbeat, broadcast| WS
    Routes -->|broadcastMatchCreated| WSS
```

### Architecture Flow (Textual)

- **HTTP:** Client requests hit Express. Arcjet middleware runs first (rate limit, bot/shield); denied requests get 429/403/503. Valid requests go to routes; handlers validate input (Zod), use Drizzle, return JSON.
- **WebSocket:** Upgrade requests are handled by the HTTP server’s `upgrade` event. Arcjet protects the upgrade (same rules, different limits); denied clients get an HTTP error and the socket is destroyed. Accepted clients complete the handshake; the WS server handles heartbeat, welcome message, and broadcasts (e.g. `match_created`).
- Drizzle ORM talks to Neon PostgreSQL for persistence.

**Layer responsibilities:**

- **Express** — HTTP server, JSON body parsing, route mounting, `securityMiddleware()` (Arcjet).
- **Arcjet** — `src/arcjet.ts`: HTTP middleware (Express req → Fetch Request) and WS protection in server `upgrade` (IncomingMessage → Fetch Request). Rules: shield, detectBot, slidingWindow (HTTP: 50/10s; WS: 5/2s).
- **WebSocket** — `src/ws/server.ts`: `attachWebSocketServer(server)` uses `noServer: true`, handles `server.on("upgrade")`, then `handleUpgrade` and `connection` (heartbeat, welcome, `broadcastMatchCreated` via `app.locals`).
- **Routes** — Request handling; validate (Zod), DB (Drizzle), response; POST /matches can call `req.app.locals.broadcastMatchCreated(match)`.
- **Validation** — Query and body schemas (limit, sport, teams, times, scores).
- **Utils** — `getMatchStatus(startTime, endTime)` → `scheduled` | `live` | `finished`.
- **DB** — Drizzle + Neon serverless pool; schema: `matches`, `commentary` (relations defined).

---

## Sequence: List Matches (GET /matches)

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Arcjet
    participant Routes
    participant Validation
    participant Drizzle
    participant DB

    Client->>Express: GET /matches?limit=50
    Express->>Arcjet: protect(req)
    Arcjet-->>Arcjet: shield, detectBot, slidingWindow
    alt Denied
        Arcjet-->>Client: 429 / 403 / 503
    else Allowed
        Arcjet-->>Express: next()
        Express->>Routes: matches handler
        Routes->>Validation: listMatchesQuerySchema
        alt Validation fails
            Validation-->>Client: 400 + details
        else Validation OK
            Validation-->>Routes: query params
            Routes->>Drizzle: query matches
            Drizzle->>DB: SELECT
            DB-->>Drizzle: rows
            Drizzle-->>Routes: result
            Routes-->>Client: 200 { data: Match[] }
        end
    end
```

1. Client sends `GET /matches?limit=50`
2. Express routes request to the matches handler.
3. The query object is validated with `listMatchesQuerySchema`.
   - **If validation fails**: Return HTTP 400 with error details.
   - **If validation succeeds**: Continue.
4. Drizzle ORM queries the `matches` table, ordering by `createdAt` descending and applying a limit.
5. Results are returned as `{ data: result }` with HTTP 200.

---

## Sequence: Create Match (POST /matches)

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Arcjet
    participant Routes
    participant Validation
    participant Drizzle
    participant DB
    participant WSS as WebSocket Server
    participant WSClient as WS Clients

    Client->>Express: POST /matches (body)
    Express->>Arcjet: protect(req)
    Arcjet-->>Express: next() [allowed]
    Express->>Routes: matches handler
    Routes->>Validation: createMatchSchema
    alt Validation fails
        Validation-->>Client: 400 + details
    else Validation OK
        Validation-->>Routes: parsed body
        Routes->>Routes: getMatchStatus(startTime, endTime)
        Routes->>Drizzle: insert match
        Drizzle->>DB: INSERT
        DB-->>Drizzle: inserted row
        Drizzle-->>Routes: match
        Routes->>WSS: broadcastMatchCreated(match)
        WSS->>WSClient: { type: "match_created", data: match }
        Routes-->>Client: 201 { data: Match }
    end
```

1. Client sends `POST /matches` with `{ sport, homeTeam, awayTeam, startTime, endTime, ... }`
2. Express routes request to the matches handler.
3. The request body is validated with `createMatchSchema`.
   - **If validation fails**: Return HTTP 400 with error details.
   - **If validation succeeds**: Continue.
4. The `getMatchStatus` util determines match status (`scheduled`/`live`/`finished`) based on times.
5. Drizzle ORM inserts the new match record into the DB and returns the inserted row(s).
   - **If DB error**: Return HTTP 500 with error details.
   - **If success**: Return `{ data: insertedMatch }` with HTTP 201; optionally broadcast to WebSocket clients via `broadcastMatchCreated(match)`.

---

## Sequence: List Commentary (GET /matches/:id/commentary)

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Arcjet
    participant Routes
    participant Validation
    participant Drizzle
    participant DB

    Client->>Express: GET /matches/1/commentary?limit=10
    Express->>Arcjet: protect(req)
    Arcjet-->>Arcjet: shield, detectBot, slidingWindow
    alt Denied
        Arcjet-->>Client: 429 / 403 / 503
    else Allowed
        Arcjet-->>Express: next()
        Express->>Routes: commentary handler
        Routes->>Validation: matchIdParamSchema (params)
        alt Params invalid
            Validation-->>Client: 400 + details
        else Params OK
            Routes->>Validation: listCommentaryQuerySchema (query)
            alt Query invalid
                Validation-->>Client: 400 + details
            else Query OK
                Validation-->>Routes: matchId, limit
                Routes->>Drizzle: select from commentary where matchId
                Drizzle->>DB: SELECT
                DB-->>Drizzle: rows
                Drizzle-->>Routes: result
                Routes-->>Client: 200 { data: Commentary[] }
            end
        end
    end
```

1. Client sends `GET /matches/:id/commentary?limit=10` (path param `id` = match ID).
2. Express routes request to the commentary handler (mounted at `/matches/:id/commentary`).
3. Path params are validated with `matchIdParamSchema`; query with `listCommentaryQuerySchema`.
   - **If validation fails**: Return HTTP 400 with error details.
   - **If validation succeeds**: Continue.
4. Drizzle ORM queries the `commentary` table filtered by `matchId`, ordered by `createdAt` descending, with limit (default 10, max 100).
5. Results are returned as `{ data: Commentary[] }` with HTTP 200.

---

## Sequence: Create Commentary (POST /matches/:id/commentary)

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Arcjet
    participant Routes
    participant Validation
    participant Drizzle
    participant DB
    participant WSS as WebSocket Server
    participant WSClient as WS Subscribers

    Client->>Express: POST /matches/1/commentary (body)
    Express->>Arcjet: protect(req)
    Arcjet-->>Express: next() [allowed]
    Express->>Routes: commentary handler
    Routes->>Validation: matchIdParamSchema (params)
    alt Params invalid
        Validation-->>Client: 400 + details
    else Params OK
        Routes->>Validation: createCommentarySchema (body)
        alt Body invalid
            Validation-->>Client: 400 + details
        else Body OK
            Validation-->>Routes: matchId, minute, message, ...
            Routes->>Drizzle: insert commentary
            Drizzle->>DB: INSERT
            DB-->>Drizzle: inserted row
            Drizzle-->>Routes: commentary
            Routes->>WSS: broadcastCommentary(matchId, commentary)
            WSS->>WSClient: { type: "commentary", data } (subscribers only)
            Routes-->>Client: 201 { data: Commentary }
        end
    end
```

1. Client sends `POST /matches/:id/commentary` with body `{ minute, message, ... }` (path param `id` = match ID).
2. Express routes request to the commentary handler.
3. Path params are validated with `matchIdParamSchema`; body with `createCommentarySchema` (e.g. `minute`, `message` required).
   - **If validation fails**: Return HTTP 400 with error details.
   - **If validation succeeds**: Continue.
4. Drizzle ORM inserts the commentary row and returns the inserted record.
5. Route calls `req.app.locals.broadcastCommentary(matchId, commentary)` so only WebSocket clients subscribed to that match receive `{ type: "commentary", data }`.
6. Response is `{ data: Commentary }` with HTTP 201.

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Express app, HTTP server, health, /matches, Arcjet middleware, attachWebSocketServer
│   ├── arcjet.ts             # Arcjet (HTTP + WS), expressReqToFetchRequest, incomingMessageToFetchRequest
│   ├── routes/
│   │   └── matches.ts        # GET / and POST / for matches
│   ├── ws/
│   │   └── server.ts         # WebSocket server (upgrade handler, Arcjet, heartbeat, broadcastMatchCreated)
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

| Variable         | Required | Description                                                |
| ---------------- | -------- | ---------------------------------------------------------- |
| `DATABASE_URL`   | Yes      | Neon PostgreSQL connection string                          |
| `ARCJET_API_KEY` | Yes      | Arcjet API key (shield, bot detection, rate limiting)      |
| `PORT`           | No       | Server port (default: `8000`)                              |
| `HOST`           | No       | Bind address (default: `0.0.0.0`)                          |
| `ARCJET_ENV`     | No       | `DRY_RUN` to log only, or `LIVE` (default) to enforce       |

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

Server listens on `HOST:PORT` (default `0.0.0.0:8000`). Health check: `GET http://localhost:8000/health` → `200 OK`. WebSocket: `ws://localhost:8000/ws`.

---

## WebSocket

### WebSocket connection sequence

```mermaid
sequenceDiagram
    participant Client
    participant Server as HTTP Server
    participant Arcjet
    participant WSS as WebSocket Server

    Client->>Server: GET /ws (Upgrade)
    Server->>Server: upgrade event (req, socket, head)
    Server->>Arcjet: protect(incomingMessageToFetchRequest(req))
    alt Denied (rate limit)
        Arcjet-->>Server: decision.isDenied(), isRateLimit()
        Server->>Client: HTTP 429 + body, socket.destroy()
    else Denied (forbidden)
        Arcjet-->>Server: decision.isDenied()
        Server->>Client: HTTP 403 + body, socket.destroy()
    else Error
        Arcjet-->>Server: throw
        Server->>Client: HTTP 503 + body, socket.destroy()
    else Allowed
        Arcjet-->>Server: decision allowed
        Server->>WSS: handleUpgrade(req, socket, head, cb)
        WSS->>WSS: emit("connection", ws, req)
        WSS->>Client: welcome { type: "welcome", message: "..." }
        Note over WSS,Client: heartbeat ping/pong every 30s
    end
```

- **Endpoint:** `ws://<host>:<port>/ws`
- **Upgrade:** Protection runs in the HTTP server `upgrade` handler (before handshake). Denied requests receive an HTTP error (429 rate limit, 403 forbidden, 503 on error) and the socket is destroyed.
- **After connect:** Server sends a welcome message `{ type: "welcome", message: "..." }`. Heartbeat (ping/pong) every 30s; unresponsive clients are terminated.
- **Broadcast:** When a match is created via POST /matches, the server can call `req.app.locals.broadcastMatchCreated(match)` to send `{ type: "match_created", data: match }` to all connected clients.

---

## API Summary

| Method | Path                       | Description                    | Validation / Behavior                            |
| ------ | -------------------------- | ------------------------------ | ------------------------------------------------ |
| GET    | `/health`                  | Liveness check                 | —                                                |
| GET    | `/matches`                 | List matches (newest first)    | Query: `limit` (optional, max 100, default 50)   |
| POST   | `/matches`                 | Create a match                 | Body: `sport`, `homeTeam`, `awayTeam`, `startTime`, `endTime` (ISO); optional `homeScore`, `awayScore`. `endTime` must be after `startTime`. Status derived automatically. |
| GET    | `/matches/:id/commentary`  | List commentary for a match   | Params: `id` (match ID). Query: `limit` (optional, max 100, default 10). |
| POST   | `/matches/:id/commentary`  | Add commentary for a match    | Params: `id` (match ID). Body: `minute` (int), `message` (required); optional `sequence`, `period`, `eventType`, `actor`, `team`, `metadata`, `tags`. |

**List matches:** `200` → `{ data: Match[] }`  
**Create match:** `201` → `{ data: Match }`  
**List commentary:** `200` → `{ data: Commentary[] }`  
**Create commentary:** `201` → `{ data: Commentary }` (and broadcast to subscribed WebSocket clients).  
**Errors:** `400` (validation) with `error` and `details`; `429` (rate limit), `403` (Arcjet denied), `503` (Arcjet/upstream error); `500` (server) with `error` and `details`.

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
