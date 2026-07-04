# Jean Distributed Certification

Estado: READY_TO_PUBLISH_FOR_JEAN, pendiente solo de publicacion externa autorizada.

## Identidades

- Manuel/Codex: `operator=manuel`, `harness=codex`, instancia asignada por `oreshnik align --instance new`.
- Jean/Kilo: `operator=jean`, `harness=kilo`, instancia asignada por `oreshnik align --instance new`.
- Kilo no debe hardcodear operador humano. La UX canónica de una sola orden para HeptaCore es `npm run oreshnik:goal`; internamente ejecuta `npm run oreshnik:ready` y luego `oreshnik goal --harness kilo --repo . --json`.

## Onboarding Universal

1. Clonar desde el repo certificado o desde el paquete de publicacion.
2. Ejecutar `npm ci`.
3. Ejecutar `npm run oreshnik:ready`.
4. Ejecutar `npx oreshnik align --operator <manuel|jean> --harness <codex|kilo> --instance new --repo . --apply --json`.
5. Repetir `npx oreshnik align --operator <id> --harness <id> --instance <alias> --repo . --check --json`; debe ser idempotente.
6. Para Kilo, verificar ambos adaptadores:
   - `.kilo/commands/goal.md`
   - `.kilo/command/goal.md`

## Goal Runner

- Un worktree puede tener solo un Goal ACTIVE.
- Un Goal no reemplaza el task-board: el sprint y zonas los decide Oreshnik.
- Estados terminales son inmutables.
- `COMPLETED` requiere evidencia y gates verdes.

## Control Plane Local

- El control plane compartido es `oreshnik/control`.
- Cada clone clean-room debe poder leer `refs/remotes/origin/oreshnik/control`.
- Si el origen local no anuncia ese ref, usar fetch explicito:

```bash
git fetch origin refs/remotes/origin/oreshnik/control:refs/remotes/origin/oreshnik/control
```

## Arbitraje y Resume

- Dos instancias simultaneas sobre una sola tarea deben producir una sola asignacion y un rechazo seguro para la segunda.
- `dispatch resume` solo puede reanudar el run de la misma instancia.
- Un resume cruzado por otro operador/harness/instance debe rechazarse o no devolver contrato de trabajo.
- Las zonas reservadas deben pasar de `reserved` a `released` al cerrar o liberar el run.

## Integracion Serializada

- No integrar directo a `master` durante certificacion si Oreshnik bloquea ramas estables.
- Usar rama `MADRE/...` o integracion local controlada.
- Sin permiso explicito, no ejecutar push, publish, deploy, Vercel, Neon, Meta ni produccion.
- La integracion local certificada para Run B quedo en `bc6acef43bc115b02bf843c0039d1ecaa11fc475`.

## Recovery Matrix

| Falla | Deteccion | Recuperacion segura |
| --- | --- | --- |
| Path length en clean-room | `Filename too long` durante checkout/build | Repetir en ruta corta y `git config core.longpaths true` |
| Falta `oreshnik/control` | `control-plane-missing` | Fetch explicito del ref local compartido |
| Instancia inexistente | `execution-context-unresolved` | `oreshnik align --instance new --apply` |
| Dirty por operador local | `operator.local.json` untracked | Debe estar en `.gitignore`; no commit de runtime local |
| Adaptador Kilo no idempotente | diff en `.kilo/commands` o `.kilo/command` | Actualizar ambos adaptadores gestionados |
| Claim activo huerfano | `dispatch status` muestra `active/reserved` | `oreshnik dispatch release --run <id>` |
| Resume cruzado | Contrato devuelto a identidad distinta | Rechazar y no tocar archivos |
| Build deep path | Turbopack path length | Ejecutar gate desde ruta corta o master integrado corto |

## Plan De Publicacion

1. Publicar artefactos de certificacion y SHA cuando el usuario autorice push.
2. Empujar ramas `master` y `MADRE/v52-s-hc-asset-02-format-derivatives-2026-07-01`.
3. Entregar a Jean este documento, el tarball Oreshnik alpha.11 certificado y la ruta de evidence.
4. Jean valida clean-room con `npm ci`, `oreshnik:ready`, `align --check`, `dispatch status`.

## UX Canonica

- Comando unico para continuar el siguiente sprint desde HeptaCore: `npm run oreshnik:goal`
- El wrapper no duplica logica del control plane: solo valida readiness y delega en `oreshnik goal --harness kilo --repo . --json`.
5. Solo despues de revision humana, habilitar publicacion externa.
