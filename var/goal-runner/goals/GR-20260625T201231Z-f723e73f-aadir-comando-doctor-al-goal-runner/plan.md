# Plan — GR-20260625T201231Z-f723e73f-aadir-comando-doctor-al-goal-runner

> Goal: Añadir comando doctor al Goal Runner
> Owner: Manuel
> Sprint: S-HC-TOOL-01-GOAL-RUNNER-V1
> Generated: 2026-06-25T20:12:31.000Z

## Pasos

1. **Inspeccion de solo lectura del nucleo actual** — Revisar `scripts/goal-runner/run.mjs`, `lib.mjs`, schema y estructura de `var/goal-runner/` para entender el estado actual antes de añadir el subcomando `doctor`.
2. **Implementar subcomando `doctor` en `run.mjs`** — Añadir entrada en usage, switch, y funcion `cmdDoctor()`.
3. **Implementar logica diagnostica en `lib.mjs`** — Funciones: `doctorCheck()`, `validateWorktree()`, `checkIndexConsistency()`, `checkMandatoryFiles()`.
4. **Producir salida estructurada** — Formato con `healthy`, `warnings`, `errors`, codigos diagnosticos estables.
5. **Exit codes correctos** — 0 healthy, 1 errores, warnings no cambian exit code.
6. **Registrar subcomando en `AGENTS.md`** — Añadir `doctor` a la lista de comandos clave.
7. **Registrar en `.kilo/commands/goal.md`** — Añadir trigger y uso.
8. **Tests con `node:test`** — Cubrir: healthy worktree, lock valido, lock stale, state corrupto, index inconsistente.
9. **Validar y completar** — Ejecutar todos los gates.
