---
type: vault-index
project: "HeptaCore"
last_updated: "2026-06-09"
mother_branch: "master"
tags:
  - "#heptacore"
  - "#obsidian"
  - "#oreshnik"
---

# Indice Maestro HeptaCore

Este vault es la capa operacional compartida entre Manuel y Jean. Git es la fuente de verdad; Obsidian es la interfaz de lectura y escritura.

## Documentos Canonicos

- [[00_CENTRAL_HEPTACORE]] - estado actual, pendientes y decisiones.
- [[METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE]] - protocolo Oreshnik adaptado.
- [[METODOLOGIA/ORESHNIK_CONTROL_BUS]] - autoridad de asignacion del bus.
- [[METODOLOGIA/INSTRUCCION_APERTURA_SESION]] - preflight de cada sesion.
- [[METODOLOGIA/PREFLIGHT_PROTOCOL]] - checklist de preflight previo a asignacion.
- [[METODOLOGIA/TASK_ALLOCATION_PROTOCOL]] - paquete de asignacion Oreshnik.
- [[METODOLOGIA/MOTHER_CHILD_BRANCH_MODEL]] - modelo madre/hija heredado de Turpial.
- [[METODOLOGIA/COLLABORATIVE_DOCS_PROTOCOL]] - protocolo de docs colaborativos.
- [[METODOLOGIA/BUS_CONTROL]] - locks, zonas, stop conditions.
- [[METODOLOGIA/SPRINT_PROTOCOL]] - apertura, ejecucion y cierre.
- [[METODOLOGIA/BRANCH_OWNERSHIP]] - ramas, locks y zonas compartidas.
- [[METODOLOGIA/AGENT_HANDOFF_PROTOCOL]] - entradas/salidas para agentes.
- [[METODOLOGIA/PUBLISHING_SAFETY_PROTOCOL]] - gates para discovery, dry-run y publicacion real.
- [[SPRINTS/PLAN_MAESTRO_SPRINTS]] - sprints, ownership y estado.
- [[COLABORADORES/ESTADO_MANUEL]] - avance y pendientes Manuel.
- [[COLABORADORES/ESTADO_JEAN]] - avance y pendientes Jean.
- [[COLABORADORES/JEAN_ONBOARDING]] - setup operativo de Jean.
- [[COLABORADORES/JEAN_FIRST_TASK]] - candidato Oreshnik pendiente de preflight para S-HC-PUB-01.
- [[TENANTS/TURPIAL_SOUND/TENANT_STATUS]] - estado del primer tenant.
- [[TENANTS/TURPIAL_SOUND/FIRST_PUBLISHING_TEST_PLAN]] - plan controlado de publicacion Turpial.
- [[ARQUITECTURA/HEPTACORE_SYSTEM_MAP]] - mapa tecnico del producto.
- [[QA/QA_RUNBOOK]] - validaciones de cierre.

## Regla Central

Cada sprint cierra con docs actualizados. La rama madre contiene la documentacion integrada de ambos operadores. Las ramas hijas contienen el trabajo de cada sprint.
