---
type: qa-runbook
project: "HeptaCore"
last_updated: "2026-06-01T00:00:00.000Z"
tags:
  - "#qa"
---

# QA Runbook

## Baseline

```bash
npm run typecheck
npm run build
npm run worker:validate
npx prisma validate
```

## UI Visual

- Desktop screenshot.
- Mobile screenshot.
- No horizontal overflow.
- No text overlap.
- Hero visible and first viewport usable.

## Worker

- Dry-run por defecto.
- Sin `.env.rrss` real.
- No publicar si `BOT_DRY_RUN=true`.
- Cola Turpial valida.

## Seguridad

- No `.env` en diff.
- No tokens en logs.
- No OAuth real antes de approval.
