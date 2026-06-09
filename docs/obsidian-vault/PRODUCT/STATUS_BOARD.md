---
type: status-board
project: "HeptaCore"
last_updated: "09/06/26 15:20 VET"
generated_by: "Kilo via Oreshnik"
source: "git log, commits reales, task-board.json, TurpialSound model"
---

# STATUS BOARD — Realidad del Repositorio

> Lo que está en git, archivos y commits. No lo que dicen los docs.

## Sprints Cerrados (con closure + push + MADRE + sprint-event)

| Sprint | Rama | Commits | Evento |
|---|---|---|---|
| S-HC-XX | `Manuel/s-hc-xx-plan-holistico...` | `a1ec5ec` | `2026-06-01_S-HC-XX_CERRADO.json` |
| S-HC-01 | `Manuel/s-hc-xx-plan-holistico...` | `45b9195` | `2026-06-08_S-HC-01_CERRADO.json` |
| S-HC-CTRL-01 | `Manuel/s-hc-xx-plan-holistico...` | `314f85b` | `2026-06-09_S-HC-CTRL-01_CERRADO.json` |
| S-HC-CTRL-02 | `Manuel/s-hc-xx-plan-holistico...` | `8116c10` | `2026-06-09_S-HC-CTRL-02_CERRADO.json` |
| S-HC-CTRL-03 | `Manuel/s-hc-xx-plan-holistico...` | `4cff455` | `2026-06-09_S-HC-CTRL-03_CERRADO.json` |
| S-HC-PROD-00 | `Manuel/s-hc-xx-plan-holistico...` | `3d0ab33` | `2026-06-09_S-HC-PROD-00_CERRADO.json` |

**MADRE branches generadas**: MADRE/v2 → MADRE/v8 (7 versiones de docs)

## Sprint Reportado por Jean (SIN closure, SIN push, SIN rama, SIN sprint-event)

| Sprint | Owner reportado | Estado real en repo | Evidencia |
|---|---|---|---|
| S-HC-02 | Jean | **NO EXISTE** rama `Jean/*`. Cero commits de Jean. | `git log --all --author="Jean"` = vacío. `git branch -a` = sin `jean/` |
| S-HC-04 | Jean | **NO EXISTE** rama `Jean/*`. Cero código de Auth/RBAC. | `/login` es placeholder de 9 líneas. Sin hashing, sin sesiones, sin RBAC guards. |

## Lo que EXISTE en código (hecho por Manuel)

| Feature | Archivos clave | Estado |
|---|---|---|
| Monorepo + landing + Vercel deploy | Raíz, `apps/web/`, `vercel.json` | DONE |
| Prisma schema (20+ modelos con AuditLog, UserRole) | `packages/db/prisma/schema.prisma` | DONE |
| 2 migraciones aplicadas | `packages/db/prisma/migrations/` | DONE |
| Instagram OAuth login + callback | `apps/web/app/api/oauth/instagram/` | DONE |
| Token vault AES-256-GCM | `apps/web/lib/token-vault.ts` | DONE |
| TurpialConsole UI (9 vistas) | `apps/web/components/turpial-console.tsx:495` | DONE |
| 29 posts + 46 assets Turpial | `apps/web/lib/data/`, `apps/web/public/assets/` | DONE |
| Seed scripts Turpial | `scripts/seed-turpial-*.mjs` | DONE |
| Oreshnik scripts (preflight, close, assign, merge-docs-union, etc.) | `scripts/oreshnik/` | DONE |
| tenant-auth.ts (lee cookie, sin emitir sesión) | `apps/web/lib/tenant-auth.ts:37` | PARTIAL |
| Login page placeholder | `apps/web/app/login/page.tsx` | PARTIAL |
| Dashboard básico | `apps/web/app/dashboard/page.tsx` | PARTIAL |
| Facebook page token vault | `scripts/seed-turpial-facebook-vault.mjs` | DONE |

## Lo que FALTA (cero código)

| Feature | Sprint asignado | Responsable |
|---|---|---|
| Password hashing (bcrypt/argon2) | S-HC-04 | Jean |
| Session issuance (JWT/cookies) | S-HC-04 | Jean |
| RBAC guards por rol (OWNER/EDITOR/VIEWER) | S-HC-04 | Jean |
| AuditLog writer (modelo existe, sin código) | S-HC-04 | Jean |
| User registration/signup | S-HC-04 | Jean |
| Oreshnik dashboard | S-HC-PROD-02 | Manuel |
| Tenant console turpial en DB real | S-HC-PROD-03 | Jean |
| Discovery + dry-run desde UI | S-HC-PROD-04 | Jean |
| Controlled one-post publishing | S-HC-PROD-05 | Jean |
| Logs/handoff/event recording | S-HC-PROD-06 | Manuel |
| First real publish (bloqueado) | S-HC-PUB-01 | Jean |

## Diagnóstico del Desfase

Jean reporta haber completado S-HC-02 (Prisma seed/importer) y estar ejecutando S-HC-04 (Auth/RBAC). Sin embargo:

1. **No existe rama `Jean/*` en origin ni local.**
2. **Cero commits atribuidos a Jean.**
3. **Cero sprint-events de Jean.**
4. **El código de Auth/RBAC no existe** — solo modelos en schema (creados por Manuel).

**Causa raíz**: Jean está trabajando en LOCAL sin seguir el protocolo Oreshnik de cierre que obliga push, documentación y creación de rama MADRE después de cada sprint. Esto es exactamente lo que el modelo TurpialSound resolvía con el script `close-sprint.mjs`.

## Acción Requerida de Jean

Jean debe ejecutar inmediatamente en su máquina local (donde tenga su trabajo real):

```bash
# 1. Crear/Pushear su rama si existe localmente
git checkout Jean/s-hc-02-prisma-seed-turpial-2026-06-09
git push origin Jean/s-hc-02-prisma-seed-turpial-2026-06-09

# 2. Cerrar S-HC-02 formalmente
npm run oreshnik:close -- --sprint S-HC-02 --operator Jean --desc "prisma-seed-importer-turpial" --push

# 3. Crear rama S-HC-04
npm run oreshnik:preflight -- --sprint S-HC-04 --operator Jean --desc "auth-rbac-auditlog"

# 4. Hacer commit del código de Auth local y pushear
git add .
git commit -m "feat(auth): implement login, roles RBAC, auditlog"
git push origin Jean/s-hc-04-auth-rbac-auditlog-2026-06-09

# 5. Cerrar S-HC-04 cuando termine
npm run oreshnik:close -- --sprint S-HC-04 --operator Jean --desc "auth-rbac-auditlog" --push
```

SIN estos pasos, el trabajo de Jean es invisible para Oreshnik y para Manuel.
