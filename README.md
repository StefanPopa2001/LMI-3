# LMI 3

Monorepo containing backend (Node/Express + Prisma + PostgreSQL) and frontend (Next.js + MUI + Tailwind) for attendance & replacement request (RR) management.

## Development

Start both backend and frontend concurrently:

```
npm run dev
```

Environment variable `NEXT_PUBLIC_API_URL` should point to backend (default http://localhost:4000).

Docs for automated editors

- Copilot-focused server & DB reference: `docs/COPILOT_SERVER_DB.md`
- Backend quick guide: `backend/COPILOT_README.md`

## Replacement Requests (RR) Types

Two RR types exist:

1. Rattrapage même semaine (`same_week`)
	- Destination must be in the same ISO week as the origin.
	- Destination must be in the future (no past dates allowed at creation time).
	- Destination classe level must match origin level OR be empty.
	- No deduction of `rrRestantes` (penalizeRR = false automatically).

2. Récupération cours du soir (`evening_recuperation`)
	- Destination must be a class with `isRecuperation = true`.
	- Level rule: destination level must match origin level OR be empty.
	- If destination level is empty it becomes locked (set) to origin level upon RR creation.
	- Optional deduction of `rrRestantes` via checkbox (default = true).
	- Destination cannot be in the past.

### New Schema Fields

```
Classe.isRecuperation Boolean @default(false)
ReplacementRequest.rrType String @default("same_week") // same_week | evening_recuperation
ReplacementRequest.penalizeRR Boolean @default(true)
```

See `backend/MIGRATION_NOTES.md` for migration steps and backfill notes.

## License

Internal project.
