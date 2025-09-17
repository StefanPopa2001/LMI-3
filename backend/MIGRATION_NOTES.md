## Migration Notes for RR Types & Recuperation Classes

Added fields:

1. `Classe.isRecuperation Boolean @default(false)`
2. `ReplacementRequest.rrType String @default("same_week")` (values: `same_week`, `evening_recuperation`)
3. `ReplacementRequest.penalizeRR Boolean @default(true)`

### Prisma Migration Command

Run after pulling code:

```
npx prisma migrate dev --name add_recuperation_rr_type
```

If deploying to production database:

```
npx prisma migrate deploy
```

### Backfill / Data Consistency

- Existing classes: `isRecuperation` will default to `false`.
- Existing replacement requests: `rrType` will default to `same_week`, `penalizeRR` will default to `true`.

If some historical requests correspond to evening recuperations, manually update them:

```sql
UPDATE "ReplacementRequest" SET "rrType" = 'evening_recuperation', "penalizeRR" = true
WHERE id IN (... ids ...);
```

### Index / Constraints (Optional Enhancements)

If queries will frequently filter recuperation classes, consider adding an index:

```prisma
@@index([isRecuperation])
```

Add if needed, then re-run migration.

### Application Logic Summary

| RR Type | Destination Rule | Time Rule | Level Rule | Penalize Default |
|---------|------------------|-----------|------------|------------------|
| same_week | Any seance same level (or empty level) within same ISO week | Destination must be in future (now) | Same level or destination level empty | false (auto) |
| evening_recuperation | Only seances whose classe.isRecuperation = true | Any future time (cannot be in past) | Same level or destination level empty (empties get locked) | Checkbox controlled (default true) |

### Post-Deployment Checklist

- [ ] Run migration in all environments
- [ ] Update any reporting/export tools to include new fields
- [ ] Communicate new workflow to staff

---

Generated: add_recuperation_rr_type
