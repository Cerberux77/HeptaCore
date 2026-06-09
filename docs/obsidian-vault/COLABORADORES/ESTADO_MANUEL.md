---
type: collaborator-status
project: "HeptaCore"
operator: "Manuel"
last_updated: "09/06/26 15:25 VET"
tags:
  - "#manuel"
  - "#status"
---

# Estado Manuel

## Sprint Activo: S-HC-03 — Agent Strategy Runner

| Campo | Valor |
|---|---|
| Rama | `Manuel/s-hc-03-agent-strategy-runner-2026-06-09` |
| Zona | `packages/agents/**`, `apps/web/components/**` |
| Estado | **assigned** — 0 blockers |
| Depende de | S-HC-01 (CERRADO), S-HC-02 (Jean reporta hecho) |

### Objetivo
Agent council consume strategy brief, calcula network priority, genera content checklist por pillar, persiste drafts. Runner ejecutable desde consola.

### Validaciones
```bash
npm run typecheck
npm run build
```

## Sprints Cerrados (con closure + push + MADRE)

| Sprint | Fecha | Rama | Madre | Evento |
|---|---|---|---|---|
| S-HC-XX | 01/06/26 | `Manuel/s-hc-xx-plan-holistico...` | MADRE/v2 | `2026-06-01_S-HC-XX_CERRADO.json` |
| S-HC-01 | 08/06/26 | `Manuel/s-hc-xx-plan-holistico...` | MADRE/v3, v4 | `2026-06-08_S-HC-01_CERRADO.json` |
| S-HC-CTRL-01 | 09/06/26 | `Manuel/s-hc-xx-plan-holistico...` | MADRE/v5 | `2026-06-09_S-HC-CTRL-01_CERRADO.json` |
| S-HC-CTRL-02 | 09/06/26 | `Manuel/s-hc-xx-plan-holistico...` | MADRE/v6 | `2026-06-09_S-HC-CTRL-02_CERRADO.json` |
| S-HC-CTRL-03 | 09/06/26 | `Manuel/s-hc-xx-plan-holistico...` | MADRE/v7 | `2026-06-09_S-HC-CTRL-03_CERRADO.json` |
| S-HC-PROD-00 | 09/06/26 | `Manuel/s-hc-xx-plan-holistico...` | MADRE/v8 | `2026-06-09_S-HC-PROD-00_CERRADO.json` |

## Código entregado por Manuel (verificado en repo)

| Feature | Archivos |
|---|---|
| Prisma schema (20+ modelos con AuditLog) | `packages/db/prisma/schema.prisma` |
| 2 migraciones | `packages/db/prisma/migrations/` |
| Instagram OAuth login + callback | `apps/web/app/api/oauth/instagram/` |
| Token vault AES-256-GCM | `apps/web/lib/token-vault.ts` |
| TurpialConsole UI (9 vistas, Approve/Reject) | `apps/web/components/turpial-console.tsx` |
| 29 posts + 46 assets | `apps/web/lib/data/`, `apps/web/public/assets/` |
| Seed scripts | `scripts/seed-turpial-*.mjs` |
| Oreshnik (preflight, close, assign, merge-docs-union) | `scripts/oreshnik/` |

## Próximo Sprint Manuel

| Sprint | Estado | Desbloquea cuando |
|---|---|---|
| S-HC-PROD-02 | depends_on S-HC-04 | Jean cierre S-HC-04 (Auth) con push |
| S-HC-PROD-06 | depends_on S-HC-PROD-02 | S-HC-PROD-02 cerrado |

## Acciones Inmediatas

1. Esperar que Jean ejecute `oreshnik:close --push` para S-HC-02 y S-HC-04
2. Si S-HC-04 (Auth) bloquea la ruta crítica >1 bloque de trabajo, usar `oreshnik:reassign`
3. Preparar S-HC-PROD-02 (Oreshnik dashboard) para arrancar apenas Auth esté en repo
