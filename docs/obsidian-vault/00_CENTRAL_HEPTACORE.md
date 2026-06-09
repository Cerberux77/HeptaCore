---
type: master-dashboard
project: "HeptaCore"
status: active-foundation
phase: "Foundation: monorepo, agent core, landing, Prisma, worker and Turpial tenant seed"
last_updated: "09/06/26 19:31"
mother_branch: "MADRE/v16-s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09"
production_branch: "none"
tags:
  - "#central"
  - "#status/live-source"
  - "#manuel"
  - "#jean"
  - "#heptacore"
---

# HeptaCore - Dashboard Activo

> **Documento canonico.** Si hay conflicto entre documentos, este manda hasta que se cierre un sprint con Oreshnik.

## Estado Actual

HeptaCore ya tiene base monorepo:

| Area | Estado |
|---|---|
| Landing Next.js | Implementada |
| Worker RRSS | Migrado a `apps/worker` |
| Agent core | Inicial en `packages/agents` |
| Prisma schema | Inicial en `packages/db/prisma/schema.prisma` |
| Turpial tenant seed | Importado en `examples/tenants/turpial` |
| Vault Obsidian | Inicializado |
| Oreshnik HeptaCore | Scripts base instalados |

## Rama Madre y Ramas Hijas

| Tipo | Convencion | Uso |
|---|---|---|
| Madre docs | `MADRE/vN-sprint-desc-fecha` | Documentacion integrada Manuel + Jean |
| Madre inicial | `master` | Base actual antes de primera madre versionada |
| Hija Manuel | `Manuel/sprint-desc-fecha` | Trabajo de Manuel |
| Hija Jean | `Jean/sprint-desc-fecha` | Trabajo de Jean |

## Trabajo Actual Manuel

| Sprint | Estado | Scope |
|---|---|---|
| S-HC-00 | En curso | Foundation repo, monorepo, docs, vault, Oreshnik |

## Trabajo Actual Jean

| Sprint | Estado | Scope |
|---|---|---|
| Por asignar | Pendiente | Revisar arquitectura, DB/Auth/worker o frontend segun acuerdo |

## Pendientes Inmediatos

| Prioridad | Pendiente | Owner sugerido |
|---|---|---|
| P0 | Hacer primer commit base del monorepo | Manuel |
| P0 | Definir primera rama madre versionada | Manuel + Jean |
| P0 | Crear sprint S-HC-01: consola onboarding + draft queue | Manuel |
| P0 | Crear sprint S-HC-02: DB seed/import Turpial + Prisma seed | Jean o Manuel |
| P0 | Ejecutar plan paralelo Manuel/Jean | Ambos |
| P1 | Definir auth provider | Ambos |
| P1 | Definir deployment target | Ambos |
| P1 | Definir proveedor LLM y adapter inicial | Ambos |

## Reglas Activas

- No publicar en redes reales desde HeptaCore.
- No pedir ni commitear credenciales reales.
- No ejecutar scraping real.
- No gastar en campanas.
- No cerrar sprint sin actualizar este vault.
- No pisar trabajo del otro operador: usar preflight y zone check.

## Validaciones Base

| Check | Comando | Estado |
|---|---|---|
| TypeScript | `npm run typecheck` | PASS |
| Build | `npm run build` | PASS |
| Worker Turpial | `npm run worker:validate` | PASS con 2 assets opcionales faltantes |
| Prisma validate | `npx prisma validate` | PASS |

## Navegacion

- [[METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE]]
- [[METODOLOGIA/INSTRUCCION_APERTURA_SESION]]
- [[SPRINTS/PLAN_MAESTRO_SPRINTS]]
- [[SPRINTS/PLAN_PARALELO_MANUEL_JEAN]]
- [[METODOLOGIA/RESILIENCIA_REASIGNACION]]
- [[DEPLOY/RUTA_CRITICA_TENANT_TURPIAL]]
- [[COLABORADORES/ESTADO_MANUEL]]
- [[COLABORADORES/ESTADO_JEAN]]
- [[ARQUITECTURA/HEPTACORE_SYSTEM_MAP]]

---

> **Ultima actualizacion:** 09/06/26 19:31 VET | **Estado:** S-HC-PROD-01 CERRADO | **Operador:** Manuel

## Cierre S-HC-04 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v2-s-hc-04-auth-rbac-audit-2026-06-09`
- Descripcion: auth-rbac-audit

## Cierre S-HC-06 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v5-s-hc-06-worker-queue-bullmq-redis-2026-06-09`
- Descripcion: worker-queue-bullmq-redis

## Cierre S-HC-01 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v6-s-hc-01-console-dashboard-checklist-2026-06-09`
- Descripcion: console-dashboard-checklist

## Cierre S-HC-05 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v7-s-hc-05-approval-queue-human-gates-2026-06-09`
- Descripcion: approval-queue-human-gates

## Cierre S-HC-08 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v8-s-hc-08-meta-adapter-sandbox-mock-2026-06-09`
- Descripcion: meta-adapter-sandbox-mock

## Cierre S-HC-03 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v9-s-hc-03-strategy-runner-2026-06-09`
- Descripcion: strategy-runner

## Cierre S-HC-07 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v10-s-hc-07-reports-dashboard-2026-06-09`
- Descripcion: reports-dashboard

## Cierre S-HC-09 - 2026-06-09

- Operador: Jean
- Rama hija: `Jean/s-hc-00-onboarding-2026-06-09`
- Rama madre docs: `MADRE/v11-s-hc-09-publish-readiness-gate-2026-06-09`
- Descripcion: publish-readiness-gate
---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "Jean reporta S-HC-02 (hecho) y S-HC-04 (en curso) en local. CERO ramas/commits/cierres de Jean en el repo."
last_updated: "09/06/26 15:25 VET"
mother_branch: "MADRE/v8-s-hc-prod-00-product-audit-and-sprint-allocation-for-turpial--2026-06-09"
current_branch: "Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01"
tags:
  - "#central"
  - "#status/live-source"
  - "#manuel"
  - "#jean"
  - "#heptacore"
  - "#control-bus"
  - "#closure-pendiente-jean"
---

# HeptaCore - Central Dashboard

> Documento canonico. Si hay conflicto entre documentos, este manda hasta que se cierre un sprint con Oreshnik.

## Estado de Produccion

| Area | Estado |
|---|---|
| HeptaCore Production | Activo |
| Production URL | `https://heptacore.vercel.app` |
| Tenant piloto | `turpial-sound` |
| Publicacion RRSS real | Bloqueada hasta aprobacion explicita de Manuel |
| Sprint actual | `S-HC-04` — Jean reporta trabajando Auth/RBAC en LOCAL. **Sin rama, commits ni push en el repo.** |
| Rama actual | `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01` |
| Jean S-HC-02 | Reportado completado localmente — **sin closure, sin rama `Jean/*`, sin sprint-event** |
| Jean S-HC-04 | Reportado en curso localmente — **sin rama, sin código visible en repo** |

## Tenant Turpial Sound

| Campo | Valor |
|---|---|
| Slug | `turpial-sound` |
| Nombre | Turpial Sound |
| Estado | Tenant seed operativo y conectado a vault OAuth cifrado |
| Cola local | `examples/tenants/turpial/content/queue/publication-queue.json` |
| Assets locales | `examples/tenants/turpial/content/inbox` |
| Plan de primer test | [[TENANTS/TURPIAL_SOUND/FIRST_PUBLISHING_TEST_PLAN]] |

## Conexiones Sociales Verificadas

| Provider | ID | Estado | Vault |
|---|---|---|---|
| Instagram | `28189853417270950` | `connected` | `encryptedBlobPresent=true`, `tokenRefPresent=true` |
| Facebook | `1129437930248909` | `connected` | `encryptedBlobPresent=true`, `tokenRefPresent=true` |

Comandos verificados:

```bash
node .\scripts\verify-turpial-oauth-vault.mjs
node .\scripts\verify-turpial-facebook-vault.mjs
```

Ambos deben devolver `ok: true`, `found: true`, `status: connected`, `encryptedBlobPresent: true`, `tokenRefPresent: true`.

## Indice Oreshnik / Control Bus

- [[METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE]] - metodologia operativa completa.
- [[METODOLOGIA/ORESHNIK_CONTROL_BUS]] - autoridad de asignacion Oreshnik.
- [[METODOLOGIA/BUS_CONTROL]] - capas, locks, gates y stop criteria.
- [[METODOLOGIA/PREFLIGHT_PROTOCOL]] - checklist de preflight previo a asignacion.
- [[METODOLOGIA/TASK_ALLOCATION_PROTOCOL]] - paquete de asignacion Oreshnik.
- [[METODOLOGIA/MOTHER_CHILD_BRANCH_MODEL]] - madre/hija como fuente colaborativa.
- [[METODOLOGIA/COLLABORATIVE_DOCS_PROTOCOL]] - docs tipo Google Docs sobre Git.
- [[METODOLOGIA/SPRINT_PROTOCOL]] - apertura, ejecucion y cierre de sprint.
- [[METODOLOGIA/BRANCH_OWNERSHIP]] - convenciones de ramas y zonas de coordinacion.
- [[METODOLOGIA/AGENT_HANDOFF_PROTOCOL]] - protocolo de handoff entre humanos y agentes.
- [[METODOLOGIA/PUBLISHING_SAFETY_PROTOCOL]] - protocolo de seguridad para publicaciones.
- `docs/07_handoffs/zone-map.json` - mapa de zonas y locks.

## Product Roadmap

- [[PRODUCT/HEPTACORE_PRODUCT_ROADMAP]] - product gap matrix and executable sprint sequence.
- [[PRODUCT/TURPIAL_SOUND_PROOF_OF_CONCEPT]] - product-first proof plan for `turpial-sound`.
- [[PRODUCT/OPERATOR_CONSOLE_REQUIREMENTS]] - login, assignment, tenant console, dry-run and publish gate requirements.
- [[PRODUCT/SPRINT_ALLOCATION_BOARD]] - human-readable mirror of `var/oreshnik/task-board.json`.

## Jean

| Documento | Uso |
|---|---|
| [[COLABORADORES/ESTADO_JEAN]] | Estado vivo de Jean |
| [[COLABORADORES/JEAN_ONBOARDING]] | Onboarding y setup |
| [[COLABORADORES/JEAN_FIRST_TASK]] | Candidato de asignacion Oreshnik para S-HC-PUB-01 |

## Siguiente Sprint Controlado

| Sprint | Owner | Scope | Estado |
|---|---|---|---|
| `S-HC-04` | Jean | Auth + RBAC + AuditLog (Login, sesiones, roles, registro actividad) | **assigned** |
| `S-HC-PROD-03` | Jean | Turpial Sound tenant console | **assigned** |
| `S-HC-02` | Jean | Prisma seed/importer Turpial + DB service layer | **done** |
| `S-HC-PROD-02` | Manuel | Oreshnik operator dashboard | depends_on S-HC-04 (Jean) |
| `S-HC-PROD-04` | Jean | Discovery and dry-run from UI | depends_on S-HC-PROD-02 + S-HC-PROD-03 |
| `S-HC-PUB-01` | Jean | First real Turpial Sound publishing proof | Depends on product UI prerequisites |

## Control-State Actual

**ALERTA**: Modelo Oreshnik exige `oreshnik:close --push` post-sprint. Jean no ha ejecutado closures. Ver [[PRODUCT/STATUS_BOARD]].

Jean debe ejecutar en su máquina local:
```bash
npm run oreshnik:close -- --sprint S-HC-02 --operator Jean --desc "prisma-seed-importer-turpial" --push
npm run oreshnik:close -- --sprint S-HC-04 --operator Jean --desc "auth-rbac-auditlog" --push
```

SIN estos comandos: cero visibilidad para Manuel, cero MADRE generada, cero avance documentado.

## Product Reality Check - S-HC-PROD-00

| Capability | Estado |
|---|---|
| Login operativo | Partial: page and cookie guard exist, session issuer missing |
| Roles operador | Partial: Prisma roles exist, product wiring missing |
| Oreshnik dashboard | Missing |
| Assigned task screen | Missing |
| Tenant console `turpial-sound` | Partial: static/local queue console exists |
| Social connection status UI | Missing |
| Strategy/assets/content queue UI | Partial: local JSON queue view exists |
| Discovery/dry-run from UI | Missing |
| One-post publish from UI | Missing |
| Product publish hard gate | Missing |
| Logs/handoff/event ledger from UI | Missing |
| Obsidian/docs sync from UI | Missing |

## Modelo Oreshnik Heredado

HeptaCore hereda el modelo funcional de Turpial Sound inspeccionado en:

```txt
D:\PROYECTOS\PROYECTOS VISUAL STUDIO\Turpialsound\turpialsound
```

Piezas adaptadas:

- preflight con madre dinamica;
- sync/resume desde mother docs;
- ramas hijas por operador;
- union merge de docs;
- cierre con ledger de sprint;
- zone-map para evitar colisiones;
- handoff append-only;
- reasignacion por Oreshnik cuando un operador esta bloqueado/stale.

Comandos HeptaCore:

```bash
npm run oreshnik:preflight
npm run oreshnik:resume
npm run oreshnik:assign
npm run oreshnik:close
```

## Reglas Activas

- No publicar en redes reales desde HeptaCore en `S-HC-CTRL-03`.
- No ejecutar tareas por seleccion manual: Oreshnik debe emitir paquete de asignacion.
- No pedir ni commitear credenciales reales.
- No scraping real, gasto de campanas, DM masivo ni cambios de Meta Developer settings.
- No modificar Prisma, auth, security ni vault adapters sin doble lock Manuel + Jean.
- No cerrar sprint sin actualizar vault, handoff y validaciones.
- No trabajar directo en ramas madre salvo flujos Oreshnik de cierre/sync.

## Validaciones de Cierre

| Check | Comando | Resultado |
|---|---|---|
| TypeScript | `npm run typecheck` | PASS |
| Build | `npm run build` | PASS |
| Worker Turpial | `npm run worker:validate` | PASS, 29/29 queue entries and 46/46 assets |
| Instagram vault | `node .\scripts\verify-turpial-oauth-vault.mjs` | PARTIAL: blocked locally because `DATABASE_URL` is not set |
| Facebook vault | `node .\scripts\verify-turpial-facebook-vault.mjs` | PARTIAL: blocked locally because `DATABASE_URL` is not set |

---

Ultima actualizacion: 2026-06-09 VET | Operador: Manuel | Sprint: `S-HC-PROD-01` + `S-HC-PROD-03` — Fase 1 paralela activa

## Cierre S-HC-CTRL-01 - 2026-06-09

- Operador: Manuel
- Rama hija: `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01`
- Rama madre docs: `MADRE/v5-s-hc-ctrl-01-validate-oreshnik-control-bus-onboard-jean-and-p-2026-06-09`
- Descripcion: Validate Oreshnik Control Bus, onboard Jean, and prepare first controlled publishing sprint

## Cierre S-HC-CTRL-02 - 2026-06-09

- Operador: Manuel
- Rama hija: `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01`
- Rama madre docs: `MADRE/v6-s-hc-ctrl-02-make-oreshnik-responsible-for-task-allocation-2026-06-09`
- Descripcion: Make Oreshnik responsible for task allocation

## Cierre S-HC-CTRL-03 - 2026-06-09

- Operador: Manuel
- Rama hija: `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01`
- Rama madre docs: `MADRE/v7-s-hc-ctrl-03-replicate-turpial-sound-oreshnik-allocation-mode-2026-06-09`
- Descripcion: Replicate Turpial Sound Oreshnik allocation model

## Cierre S-HC-PROD-00 - 2026-06-09

- Operador: Manuel
- Rama hija: `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01`
- Rama madre docs: `MADRE/v8-s-hc-prod-00-product-audit-and-sprint-allocation-for-turpial--2026-06-09`
- Descripcion: Product audit and sprint allocation for Turpial proof

## Cierre S-HC-PROD-01 - 2026-06-09

- Operador: Manuel
- Rama hija: `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09`
- Rama madre docs: `MADRE/v15-s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09`
- Descripcion: producto operativo tenant admin produccion
