---
type: session-opening
project: "HeptaCore"
actualizado: "2026-06-01T00:00:00.000Z"
mother_branch: "master"
tags:
  - "#opening"
  - "#preflight"
---

# Instruccion de Apertura de Sesion

## Paso 0 - Obligatorio

Antes de trabajar:

```bash
npm run oreshnik:status
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
```

Jean usa:

```bash
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Jean --desc "descripcion"
```

## Leer

1. [[00_CENTRAL_HEPTACORE]]
2. [[SPRINTS/PLAN_MAESTRO_SPRINTS]]
3. [[METODOLOGIA/BUS_CONTROL]]
4. Estado del operador correspondiente:
   - [[COLABORADORES/ESTADO_MANUEL]]
   - [[COLABORADORES/ESTADO_JEAN]]

## Antes de editar

- Confirmar rama hija.
- Confirmar owner del sprint.
- Confirmar zonas asignadas.
- Confirmar que no hay secretos en diff.
- Confirmar que el vault esta actualizado.

## Antes de cerrar

```bash
npm run typecheck
npm run build
npm run worker:validate
npm run oreshnik:close -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
```

Usar `--push` solo cuando el cierre este listo para compartir.
