# Goal Runner Command (HeptaCore)

Cuando el usuario invoque `/goal`, Kilo debe operar de forma autonoma bajo autoridad de Oreshnik. `scripts/goal-runner/run.mjs` solo gestiona estado, locks, gates y evidencia. Oreshnik decide tarea, claim, Run, rama, worktree, integracion y cierre.

## Autoridad y orden obligatorio

1. Ejecutar `npm run oreshnik:ready`. Si falla, corregir la infraestructura primero.
2. Intentar reanudar trabajo existente del mismo operador via Oreshnik:
   - `oreshnik dispatch resume --operator kilo --repo . --json`
3. Si no hay asignacion reanudable, pedir la siguiente tarea elegible solo a Oreshnik:
   - `oreshnik dispatch next --operator kilo --repo . --json`
4. Kilo nunca elige tareas por intuicion, nunca crea Runs manualmente y nunca modifica runtime JSON a mano.
5. Si existe un goal ACTIVE, PAUSED o BLOCKED asociado al Run actual, retomarlo. Si no existe, crearlo para ese mismo Run y esa misma tarea.

## Creacion y activacion del goal

- Owner: `Kilo Agent`
- Evidence requerida por defecto: `code`
- Gates obligatorios por defecto: `typecheck,build,worker,tests`
- Sprint ID: el sprint de la asignacion emitida por Oreshnik
- Goal title: descripcion concreta de la tarea reclamada, no una reinterpretacion libre

Secuencia:

```bash
node scripts/goal-runner/run.mjs status
node scripts/goal-runner/run.mjs create --title "..." --owner "Kilo Agent" --sprintId <sprintId> --evidenceRequired code --gates "typecheck,build,worker,tests"
node scripts/goal-runner/run.mjs plan-record --goalId <goalId>
node scripts/goal-runner/run.mjs activate --goalId <goalId>
```

## Ejecucion

- Kilo inspecciona codigo, implementa, prueba y corrige.
- Goal Runner registra pasos, findings, evidencia y validacion.
- Oreshnik sigue siendo la unica autoridad sobre `task-board`, claims, Runs, worktrees, `ready_for_integration`, `close` e `integrate`.

Para cada paso:

```bash
node scripts/goal-runner/run.mjs step-start --goalId <goalId> --step "descripcion"
node scripts/goal-runner/run.mjs step-complete --goalId <goalId> --step "descripcion" --result "resultado"
```

Registrar findings:

```bash
node scripts/goal-runner/run.mjs finding-add --goalId <goalId> --severity info|warn|blocker --content "descripcion"
```

Adjuntar evidencia:

```bash
node scripts/goal-runner/run.mjs evidence-add --goalId <goalId> --type code --path <ruta-relativa>
```

## Reintentos acotados

- Maximo 2 intentos con la misma hipotesis.
- Maximo 3 ciclos completos por blocker.
- Clasificar el bloqueo como uno de:
  - `transient_error`
  - `implementation_error`
  - `configuration_error`
  - `external_blocker`
  - `product_decision`
- Tras el segundo fallo identico, cambiar hipotesis o estrategia.
- Tras el tercer ciclo del mismo blocker, escalar al Goal Runner como `blocker`.

## Finalizacion

Cuando el codigo y la evidencia esten listos:

```bash
node scripts/goal-runner/run.mjs validate --goalId <goalId>
node scripts/goal-runner/run.mjs complete --goalId <goalId>
```

Luego Kilo debe volver a Oreshnik para:

1. proyectar evidencia real,
2. avanzar a `ready_for_integration`,
3. ejecutar `close`,
4. reanudar `close` o `integrate` si quedo parcial,
5. limpiar worktree solo cuando Oreshnik lo confirme.

## Limites

- Solo pedir intervencion humana por decision de producto, credencial externa, operacion destructiva de produccion, conflicto real de requisitos o bloqueo imposible de resolver desde repo, CLI o logs.
- Produccion requiere autorizacion explicita.
- No autoabrir un segundo goal si ya existe uno activo para el mismo worktree.
- `COMPLETED` y `ABORTED_CRITICAL_DEVIATION` son inmutables.
