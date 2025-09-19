# Backend quick guide for Copilot

This short README is geared to automated editors and contributors to understand how to run and modify the backend quickly.

Start (development)
1. From repository root:
   - cd backend
   - npm install
   - cp .env.example .env (edit values: DATABASE_URL, SECRET_KEY, REDIS_URL)
   - npx prisma generate
   - npx prisma db push (or run migrations if using migrate)
   - npm run dev

Key locations
- Server: `index.js` (entrypoint)
- Prisma schema: `prisma/schema.prisma`
- Generated client: `generated/prisma`

Environment variables (important)
- DATABASE_URL — Postgres connection string
- REDIS_URL — Redis URL (optional)
- SECRET_KEY — JWT secret (set in production)

Notes for code changes
- Do not edit files under `generated/prisma` — regenerate instead.
- Input sanitizers and auth middleware are in `index.js` — reuse them for new endpoints.
- Follow existing error handling and logging patterns.
