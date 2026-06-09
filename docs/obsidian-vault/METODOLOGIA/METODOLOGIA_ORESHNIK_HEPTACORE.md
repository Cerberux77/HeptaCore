---
type: methodology
project: "HeptaCore"
fecha: "2026-06-09"
actualizado: "2026-06-09"
methodology: "Oreshnik HeptaCore Control Bus v1.1"
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

- preflight antes de editar;
- ownership explicito por rama, developer, agente y zona;
- docs antes y despues del trabajo;
- validaciones reproducibles;
- handoff compacto al cierre;
- hard stops para produccion, RRSS, secretos, DB, auth y seguridad.

## Capas del Control Bus

| Capa | Responsabilidad | Documento canonico |
|---|---|---|
| Mission layer | Objetivo del producto, estado de produccion y prioridades | [[../00_CENTRAL_HEPTACORE]] |
| Tenant layer | Estado por cliente/tenant y conexiones | [[../TENANTS/TURPIAL_SOUND/TENANT_STATUS]] |
| Sprint layer | Sprint activo, gates y cierre | [[SPRINT_PROTOCOL]] |
| Branch ownership | Ramas y zonas de edicion | [[BRANCH_OWNERSHIP]] |
| Developer ownership | Responsabilidades Manuel/Jean | [[../COLABORADORES/ESTADO_MANUEL]], [[../COLABORADORES/ESTADO_JEAN]] |
| Agent ownership | Tarea asignada, limites y reporte | [[AGENT_HANDOFF_PROTOCOL]] |
| Validation gates | Typecheck, build, worker, vault y zone check | [[../QA/QA_RUNBOOK]] |
| Publish safety | Discovery/dry-run/aprobacion/publicacion | [[PUBLISHING_SAFETY_PROTOCOL]] |

## Reparto Manuel / Jean

| Area | Manuel | Jean |
|---|---|---|
| Producto y oferta | Voz, CTA, tenant strategy, aprobacion humana | Validacion tecnica independiente |
| Docs y control | Central docs, cierre Oreshnik, mother docs | Handoffs de su sprint y reporte final |
| Backend/DB/Auth | Solo con doble lock | Owner tecnico preferente |
| Worker/publicacion | Define riesgo y aprobacion | Discovery, dry-run, jobs, readiness |
| Meta/RRSS | Aprueba acciones reales | Verifica readiness sin publicar |

## Como Reciben Tareas los Agentes

Cada prompt de agente debe incluir:

1. Sprint ID.
2. Rama esperada o instruccion de crear rama.
3. Scope permitido.
4. Hard stops.
5. Validaciones obligatorias.
6. Archivos canonicos a actualizar.
7. Formato de handoff final.

El agente debe ejecutar preflight antes de editar:

```bash
npm run oreshnik:preflight -- --sprint S-HC-CTRL-01 --operator Manuel --desc "descripcion"
```

Jean usa:

```bash
npm run oreshnik:preflight -- --sprint S-HC-PUB-01 --operator Jean --desc "turpial controlled publishing discovery dry-run"
```

## Docs Antes / Docs Despues

Antes de editar codigo o ejecutar acciones con riesgo, el operador debe leer:

- [[../00_CENTRAL_HEPTACORE]]
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

## Gates de Validacion

Minimo para cerrar sprint documental/control:

```bash
git status --short
git branch --show-current
git log --oneline -5
npm run typecheck
npm run build
npm run worker:validate
node .\scripts\verify-turpial-oauth-vault.mjs
node .\scripts\verify-turpial-facebook-vault.mjs
```

Si falla algo, el cierre queda `PARTIAL` y el handoff debe decir exactamente que fallo.

## Evitar Conflictos

- Manuel y Jean trabajan en ramas hijas separadas.
- Las ramas madre `MADRE/*` son solo para documentacion integrada por Oreshnik.
- Nadie sobreescribe docs compartidos sin revisar el estado actual.
- Las zonas con lock doble no se editan sin acuerdo explicito.
- Si hay conflicto de zona, se detiene implementacion y se documenta el bloqueo.

## Proteccion de Publicacion

La publicacion real esta bloqueada por defecto. Para cualquier salida RRSS se exige:

1. discovery;
2. dry-run;
3. candidato de bajo riesgo;
4. comando exacto preparado;
5. aprobacion explicita de Manuel;
6. una sola plataforma;
7. un solo post;
8. reporte inmediato.

`S-HC-CTRL-01` no autoriza publicar nada.

## Stop Criteria

- Secretos en git, chat o logs.
- Cambio de Prisma/schema/auth/security sin doble lock.
- Publicacion real, gasto o scraping real.
- Meta Developer settings modificados sin aprobacion.
- Build/typecheck roto sin documentar.
- Vault central desactualizado.
- Conflicto de rama/zona no resuelto.
- Agente sin owner o sin handoff.

