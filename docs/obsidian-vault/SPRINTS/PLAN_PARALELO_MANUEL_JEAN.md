---
type: parallel-sprint-plan
project: "HeptaCore"
last_updated: "2026-06-01T15:45:00.000Z"
mother_branch: "master"
tags:
  - "#parallel"
  - "#sprints"
  - "#manuel"
  - "#jean"
---

# Plan Paralelo Manuel + Jean

## Politica de Resiliencia

Si un operador esta ausente durante un bloque de trabajo o bloquea la ruta critica, la tarea pasa al backup owner. La reasignacion debe registrarse:

```bash
npm run oreshnik:reassign -- --task S-HC-02 --to Manuel --reason "Jean ausente / ruta critica"
```

Luego:

```bash
npm run oreshnik:tasks
```

## Fase 0 - Base

| Sprint | Owner | Backup | Estado | Objetivo |
|---|---|---|---|---|
| S-HC-00 | Manuel | Jean | Activo | Commit base, vault, Oreshnik, monorepo |

## Fase 1 - Paralelo Real

Estas tareas pueden correr en paralelo despues del commit base:

| Sprint | Owner | Backup | Zona | Entrega |
|---|---|---|---|---|
| S-HC-01 | Manuel | Jean | `apps/web`, `packages/agents` | Console shell + cards clickeables + draft/asset/calendar views |
| S-HC-02 | Jean | Manuel | `packages/db`, `scripts`, `examples/tenants/turpial` | Seed/import Turpial + DB service layer |
| S-HC-02A | Jean | Manuel | `apps/worker`, secrets docs | Meta OAuth readiness con `.env.rrss` local, sin tokens en git |

## Fase 2 - Dependiente

| Sprint | Owner | Backup | Depende de | Entrega |
|---|---|---|---|---|
| S-HC-03 | Manuel | Jean | S-HC-01, S-HC-02 | Strategy runner |
| S-HC-04 | Jean | Manuel | S-HC-02 | Auth/RBAC/tenant guards |

## Fase 3 - Ruta Critica Publicacion

| Sprint | Owner | Backup | Depende de | Entrega |
|---|---|---|---|---|
| S-HC-05 | Manuel | Jean | S-HC-01, S-HC-04 | Approval queue |
| S-HC-06 | Jean | Manuel | S-HC-02, S-HC-05 | Worker queue |
| S-HC-08 | Jean | Manuel | S-HC-06 | Meta adapter sandbox |
| S-HC-09 | Manuel | Jean | S-HC-05, S-HC-06, S-HC-08 | Publish readiness gate |

## Ruta Rapida 2026-06-01 - Turpial Publicable

Objetivo: llegar hoy a cola aprobable y OAuth verificable sin saltar guardrails.

| Orden | Owner | Entrega | Comando/artefacto |
|---:|---|---|---|
| 1 | Manuel | Revisar primeros 7 posts y CTA | Consola Turpial |
| 2 | Manuel | Crear `.env.rrss` local con tokens existentes | Basado en `.env.rrss.example`; no commitear |
| 3 | Jean | Validar OAuth en modo lectura | `npm run worker:meta:readiness` |
| 4 | Codex | Mantener UI/worker dry-run estable | `npm run typecheck`, `npm run worker:validate` |
| 5 | Manuel + Jean | Decidir si se levanta hard stop de publicacion real | Documento de aprobacion + rollback |
| 6 | Jean | Si se aprueba, primera publicacion de bajo riesgo con gate | `BOT_DRY_RUN=false` + `HEPTACORE_ALLOW_REAL_PUBLISH=I_UNDERSTAND_REAL_RRSS_PUBLICATION` |

Nota: mientras el hard stop "No real RRSS publishing" siga activo, la salida de Turpial debe ser manual/semi-manual desde Meta Business Suite usando la cola aprobada.

## Regla de Maximizar Avance

- Si S-HC-02 se bloquea, Manuel avanza S-HC-01/S-HC-03 con data mock.
- Si S-HC-01 se bloquea, Jean avanza S-HC-02/S-HC-04.
- Si Auth se bloquea, usar modo local dev con tenant fijo `turpial` para no detener worker y approvals.
- Si Meta API se bloquea, usar mock adapter y dejar credenciales reales fuera del sprint.
