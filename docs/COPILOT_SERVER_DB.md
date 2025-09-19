# Backend server and database — Copilot instructions

Purpose: Give Copilot (or any automated editor) a concise, actionable overview of the backend server, runtime, environment variables, and Prisma database schema locations so it can make safe edits and add features.

Quick facts
- Server entrypoint: `backend/index.js` (Express + Apollo Server)
- Dev run command (backend): `npm run dev` from `backend/` (see `backend/package.json`)
- HTTP port: 4000 (server listens on 4000)
- GraphQL endpoint: `/graphql` (Apollo Server)
- REST API root: `/` (health), many endpoints under `/users`, `/admin`, `/admin/*` etc.
- Database: PostgreSQL via Prisma. Connection string from `DATABASE_URL` env var.
- Prisma schema: `backend/prisma/schema.prisma`
- Generated Prisma client: `backend/generated/prisma` (client.js, index.js)

Important files
- `backend/index.js` — main server. Handles:
  - Express setup, CORS, JSON body parsing
  - Redis client (optional) configured by `REDIS_URL`
  - JWT authentication using `SECRET_KEY`
  - Rate limiting on auth endpoints
  - REST endpoints (users, admin, classes, seances, attendance, rr, permanence, settings)
  - Starts server on port 4000

- `backend/prisma/schema.prisma` — canonical DB schema. Models include: `User`, `Eleve`, `Classe`, `Seance`, `Presence`, `Setting`, `PermanenceSlot`, `AttendanceDay`, `ReplacementRequest`, and linking tables like `ClasseEleve`.

- `backend/generated/prisma` — generated Prisma client and runtime. Code in this folder is used by the server and should not be hand-edited (regenerate via `npx prisma generate`).

Environment variables
- `DATABASE_URL` — PostgreSQL connection string used by Prisma.
- `REDIS_URL` — (optional) Redis URL for caching/session-like features. Default used: `redis://localhost:6379`.
- `SECRET_KEY` — JWT signing secret. Default fallback present in code; set a strong secret in production.
- `NODE_ENV` — standard environment flag.

How authentication works (short)
- Clients call `POST /users/getSalt` with an email to receive the user's salt.
- Clients submit `POST /users/login` with email and hashed password; on success server issues a JWT token (expires in 24h).
- Protect endpoints using `Authorization: Bearer <token>` header. Middleware `authenticate` verifies token and attaches `req.user`.
- Admin-only middleware `requireAdmin` checks `req.user.admin`.

Prisma usage notes
- The server imports `@prisma/client` and instantiates `new PrismaClient()` at top of `index.js`.
- When changing `schema.prisma`:
  1. Update `backend/prisma/schema.prisma`.
  2. Run `npx prisma generate` (or `npm run prisma:generate` if defined) from `backend/` to regenerate the client in `backend/generated/prisma`.
  3. If you modified the database (migrations), use Prisma Migrate or `prisma db push` depending on workflow.

Safety and editing guidelines for Copilot
- Do not remove or rename env variable usages without updating `backend/.env` or deployment configs.
- Avoid editing files inside `backend/generated/prisma` — regenerate instead.
- Prefer adding small, well-tested routes or functions. Add tests where possible.
- When changing authentication/authorization logic, update every endpoint that relies on `authenticate`/`requireAdmin` and adjust unit/integration tests.

Common tasks and commands (from repository root)
```bash
# install root deps (if needed)
npm install

# backend dependencies and dev run
cd backend
npm install
npm run dev

# prisma generate (after schema changes)
npx prisma generate --schema=prisma/schema.prisma

# push schema to database (development)
npx prisma db push --schema=prisma/schema.prisma
```

Where to start when adding features
1. Read `backend/index.js` to find the related route and helper functions.
2. Inspect `backend/prisma/schema.prisma` to understand the DB model and relations.
3. If adding queries/updates, use the existing Prisma patterns (e.g., `prisma.model.findMany`, `prisma.$transaction`, `upsert`, `createMany`).
4. Add input validation and sanitization using the existing helpers (`sanitizeInput`, `sanitizeEmail`, `sanitizePhone`) for consistency.

Edge cases and gotchas
- The server attempts to connect to Redis but continues if Redis is unavailable — do not assume Redis is required.
- Several endpoints create or mutate related records in transactions; preserve transactional semantics when refactoring.
- Some fields are stored as JSON strings (e.g., `Classe.semainesSeances`) — keep serializing/deserializing consistent.

Contact / pairing tips
- When in doubt about data layout, inspect `backend/prisma/schema.prisma` and the generated client types in `backend/generated/prisma`.

---
Generated for Copilot to help it make safe, context-aware changes to the backend server and DB.
