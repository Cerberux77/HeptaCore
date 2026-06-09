---
type: methodology
project: "HeptaCore"
fecha: "2026-06-09"
actualizado: "2026-06-09"
methodology: "Oreshnik HeptaCore Control Bus v1.2"
tags:
  - "#methodology"
  - "#oreshnik"
  - "#control-bus"
  - "#manuel"
  - "#jean"
---

# Metodologia Oreshnik HeptaCore

## Que Es

Oreshnik en HeptaCore es la metodologia operativa de sprint, vector bus y control bus para coordinar trabajo entre Manuel, Jean y agentes como Codex o Kilo sin perder estado, sobrescribir cambios ni ejecutar acciones reales de riesgo.

No es una marca externa ni una metafora belica. En este repositorio significa:

- preflight antes de asignar o editar;
- ownership explicito por rama, developer, agente y zona;
- asignacion de trabajo por Oreshnik, no por seleccion manual;
- docs antes y despues del trabajo;
- validaciones reproducibles;
- handoff compacto al cierre;
- hard stops para produccion, RRSS, secretos, DB, auth y seguridad.

## Autoridad De Asignacion

Oreshnik asigna el trabajo.

- Los developers no se autoasignan tareas.
- Manuel no asigna tareas de codigo manualmente salvo override de emergencia documentado.
- Jean no elige scope desde backlog ni desde un prompt libre.
- Los agentes reciben paquetes de asignacion y no pueden ampliar scope.
- Manuel mantiene rol de revision/aprobacion para gates peligrosos como publicacion real, secretos, DB/auth/security y Meta settings.

Flujo correcto:

```txt
Manuel dispara preflight
Oreshnik revisa repo, docs, sprint metadata y zone-map
Oreshnik emite paquete de asignacion
Jean ejecuta solo el paquete asignado
Manuel revisa/aprueba gates peligrosos
Oreshnik genera handoff/cierre
```

## Capas Del Control Bus

| Capa | Responsabilidad | Documento canonico |
|---|---|---|
| Mission layer | Objetivo del producto, estado de produccion y prioridades | [[../00_CENTRAL_HEPTACORE]] |
| Tenant layer | Estado por cliente/tenant y conexiones | [[../TENANTS/TURPIAL_SOUND/TENANT_STATUS]] |
| Sprint layer | Sprint activo, gates y cierre | [[SPRINT_PROTOCOL]] |
| Branch ownership | Ramas y zonas de edicion | [[BRANCH_OWNERSHIP]] |
| Developer ownership | Responsabilidades Manuel/Jean como roles, no autoasignacion | [[../COLABORADORES/ESTADO_MANUEL]], [[../COLABORADORES/ESTADO_JEAN]] |
| Agent ownership | Tarea asignada, limites y reporte | [[AGENT_HANDOFF_PROTOCOL]] |
| Validation gates | Typecheck, build, worker, vault y zone check | [[../QA/QA_RUNBOOK]] |
| Publish safety | Discovery/dry-run/aprobacion/publicacion | [[PUBLISHING_SAFETY_PROTOCOL]] |
| Allocation | Owner, branch, allowed files, prohibited files | [[TASK_ALLOCATION_PROTOCOL]] |

## Roles Manuel / Jean

| Area | Manuel | Jean |
|---|---|---|
| Producto y oferta | Revision y aprobacion humana | Validacion tecnica si Oreshnik lo asigna |
| Docs y control | Puede disparar preflight/cierre | Handoffs de su paquete asignado |
| Backend/DB/Auth | Solo con doble lock | Owner tecnico si Oreshnik asigna y doble lock existe |
| Worker/publicacion | Gate de aprobacion real | Discovery/dry-run si Oreshnik asigna |
| Meta/RRSS | Aprueba acciones reales | Verifica readiness sin publicar si Oreshnik asigna |

## Como Reciben Tareas Los Agentes

Cada prompt de agente debe incluir o referenciar un paquete de asignacion Oreshnik:

1. Sprint ID.
2. Developer owner.
3. Agent owner.
4. Rama esperada o instruccion de crear rama.
5. Scope permitido.
6. Archivos permitidos.
7. Archivos prohibidos.
8. Hard stops.
9. Validaciones obligatorias.
10. Archivos canonicos a actualizar.
11. Formato de handoff final.

Oreshnik debe ejecutar preflight antes de asignar:

```bash
npm run oreshnik:preflight -- --sprint S-HC-CTRL-02 --operator Manuel --desc "Make Oreshnik responsible for task allocation"
```

Ejemplo de candidato en dry-run:

```bash
npm run oreshnik:assign -- --candidate S-HC-PUB-01 --owner Jean --dry-run
```

Jean solo ejecuta despues de recibir un paquete Oreshnik con `ok: true`.

## Docs Antes / Docs Despues

Antes de asignar codigo o ejecutar acciones con riesgo, Oreshnik debe leer:

- [[../00_CENTRAL_HEPTACORE]]
- [[ORESHNIK_CONTROL_BUS]]
- [[PREFLIGHT_PROTOCOL]]
- [[TASK_ALLOCATION_PROTOCOL]]
- [[BUS_CONTROL]]
- [[BRANCH_OWNERSHIP]]
- `docs/07_handoffs/zone-map.json`
- el handoff del sprint anterior si existe.

Antes de cerrar, el operador debe actualizar:

- central dashboard;
- plan maestro de sprints;
- docs del tenant afectado;
- handoff del sprint;
- estado del colaborador si aplica.

## Preflight De Asignacion

Antes de asignar una tarea, Oreshnik debe revisar:

- rama actual;
- dirty working tree;
- untracked files;
- sprint activo;
- zone-map ownership;
- archivos cambiados recientemente;
- estado productivo/tenant;
- estado de docs;
- estado de validaciones;
- seguridad de publicacion.

Con eso decide task id, developer owner, agent owner, branch, allowed files, prohibited files, validation gates y stop criteria.

## Gates De Validacion

Minimo para cerrar sprint documental/control:

```bash
git status --short
git branch --show-current
git log --oneline -5
npm run typecheck
npm run build
npm run worker:validate
```

Si falla algo, el cierre queda `PARTIAL` y el handoff debe decir exactamente que fallo.

## Evitar Conflictos

- Manuel y Jean trabajan en ramas hijas separadas.
- Las ramas madre `MADRE/*` son solo para documentacion integrada por Oreshnik.
- Nadie sobreescribe docs compartidos sin revisar el estado actual.
- Las zonas con lock doble no se editan sin acuerdo explicito.
- Si hay conflicto de zona, se detiene implementacion y se documenta el bloqueo.

## Proteccion De Publicacion

La publicacion real esta bloqueada por defecto. Para cualquier salida RRSS se exige:

1. asignacion Oreshnik;
2. discovery;
3. dry-run;
4. candidato de bajo riesgo;
5. comando exacto preparado;
6. aprobacion explicita de Manuel;
7. una sola plataforma;
8. un solo post;
9. postmortem/handoff inmediato.

`S-HC-CTRL-01` no autoriza publicar nada.
`S-HC-CTRL-02` no autoriza publicar nada.

## Stop Criteria

- Secretos en git, chat o logs.
- Cambio de Prisma/schema/auth/security sin doble lock.
- Publicacion real, gasto o scraping real.
- Meta Developer settings modificados sin aprobacion.
- Build/typecheck roto sin documentar.
- Vault central desactualizado.
- Conflicto de rama/zona no resuelto.
- Agente sin owner o sin paquete de asignacion.
