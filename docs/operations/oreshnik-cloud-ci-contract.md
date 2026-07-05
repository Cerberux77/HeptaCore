# Contrato Operativo — Oreshnik Cloud CI para HEPTACORE

**Proyecto:** HEPTACORE  
**Repositorio:** `Cerberux77/HeptaCore`  
**Fecha:** 2026-07-05  
**Responsable operativo:** Jean  
**Modo de ejecución esperado:** Codex / Kilo mediante Oreshnik Goals  
**Duración objetivo:** 1 hora  
**Tipo de cambio:** Aditivo, no disruptivo  
**Rama sugerida:** `jean/oreshnik-cloud-ci-2026-07-05`

---

## 1. Propósito

Convertir Oreshnik en un guardia automático de nube para HEPTACORE usando GitHub Actions, sin romper el uso local actual.

El objetivo es que cada `pull_request` o `push` sobre ramas de trabajo pueda ejecutar validaciones mínimas de Oreshnik en un entorno cloud:

- instalación reproducible;
- `oreshnik:ready`;
- validación canónica;
- drift check no interactivo;
- gate operativo;
- artifacts de evidencia.

Este contrato NO reemplaza el uso actual de Oreshnik en local. Lo refuerza.

---

## 2. Principio rector

> Todo lo cloud debe ser aditivo.  
> Nada debe romper el flujo local existente.

Los scripts actuales deben seguir funcionando igual:

```bash
npm run oreshnik:preflight
npm run oreshnik:status
npm run oreshnik:lock
npm run oreshnik:zone
npm run oreshnik:tasks
npm run oreshnik:evidence
npm run oreshnik:close
npm run oreshnik:gate
npm run oreshnik:timeline
npm run oreshnik:checkpoint
npm run oreshnik:integrate
```

---

## 3. Hard Stops

Codex/Kilo debe detenerse y pedir revisión si ocurre cualquiera de estos casos:

1. El cambio modifica o reemplaza el comportamiento actual de `oreshnik:preflight`.
2. El cambio modifica o reemplaza el comportamiento actual de `oreshnik:drift`.
3. El cambio exige condiciones nuevas que hagan fallar el uso local normal.
4. El cambio toca autenticación, Prisma/schema, middleware o credenciales sin estar autorizado.
5. El workflow de GitHub Actions requiere secrets que no existen o credenciales reales.
6. El CI queda interactivo esperando input humano.
7. El cambio altera `master` directamente.
8. El cambio activa branch protection automáticamente.
9. El cambio elimina, renombra o reestructura `var/oreshnik/task-board.json`.
10. El cambio cierra tareas sin evidencia.

---

## 4. Alcance permitido

Se permite agregar o modificar únicamente estos tipos de archivos:

```txt
.github/workflows/oreshnik-cloud-ci.yml
scripts/oreshnik/drift-ci.mjs
scripts/oreshnik/cloud-ci-report.mjs
package.json
docs/operations/oreshnik-cloud-ci-contract.md
docs/operations/oreshnik-cloud-ci-runbook.md
```

Si Codex detecta que necesita tocar otros archivos, debe registrar drift o detenerse.

---

## 5. Cambios esperados

### 5.1 Agregar comando CI no disruptivo

Agregar en `package.json` comandos nuevos, sin reemplazar los existentes:

```json
{
  "scripts": {
    "oreshnik:drift:ci": "node scripts/oreshnik/drift-ci.mjs",
    "oreshnik:ci": "npm run oreshnik:ready && npm run oreshnik:canonical && npm run oreshnik:drift:ci && npm run oreshnik:gate"
  }
}
```

Si `oreshnik:canonical` no existe como script en `package.json`, agregarlo apuntando al script existente:

```json
{
  "scripts": {
    "oreshnik:canonical": "node scripts/oreshnik/canonical-check.mjs"
  }
}
```

No modificar los comandos existentes.

---

### 5.2 Crear drift CI no interactivo

Crear:

```txt
scripts/oreshnik/drift-ci.mjs
```

Comportamiento esperado:

- No abrir menú interactivo.
- Leer cambios del working tree con `git status --porcelain`.
- Ignorar cambios dentro de:
  - `var/oreshnik/`
  - `output/`
  - artifacts temporales del CI.
- Detectar rutas críticas similares a `scripts/oreshnik/drift.mjs`:
  - `packages/db/`
  - `.env`
  - `apps/web/middleware.*`
  - `apps/web/proxy.*`
  - `package.json`
  - `apps/web/app/api/auth/`
  - `apps/web/lib/auth`
  - `packages/db/prisma/`
- En modo CI:
  - si hay drift crítico no autorizado: exit `1`;
  - si no hay drift crítico: exit `0`;
  - imprimir resumen legible.

Este script no debe reemplazar `scripts/oreshnik/drift.mjs`.

---

### 5.3 Crear GitHub Actions workflow

Crear:

```txt
.github/workflows/oreshnik-cloud-ci.yml
```

Requisitos mínimos:

```yaml
name: Oreshnik Cloud CI

on:
  pull_request:
    branches:
      - master
  push:
    branches-ignore:
      - master

jobs:
  oreshnik-cloud-ci:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout full history
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Ensure oreshnik control ref
        run: |
          git fetch origin master
          git fetch origin oreshnik/control:refs/remotes/origin/oreshnik/control || true

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Oreshnik ready
        run: npm run oreshnik:ready

      - name: Oreshnik canonical
        run: npm run oreshnik:canonical

      - name: Oreshnik drift CI
        run: npm run oreshnik:drift:ci

      - name: Oreshnik gate
        run: npm run oreshnik:gate

      - name: Upload Oreshnik evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: oreshnik-cloud-ci-evidence
          path: |
            var/oreshnik/**
            var/goal-runner/**
            docs/operations/oreshnik-cloud-ci-contract.md
            docs/operations/oreshnik-cloud-ci-runbook.md
          if-no-files-found: ignore
```

Si `npm run oreshnik:gate` es demasiado pesado para la primera hora, Codex puede dividirlo en dos jobs:

- `oreshnik-ready-light`;
- `oreshnik-gate-full`.

Pero debe dejarlo documentado.

---

### 5.4 Crear runbook

Crear:

```txt
docs/operations/oreshnik-cloud-ci-runbook.md
```

Debe explicar:

- cuándo corre el workflow;
- qué valida;
- cómo interpretar fallos;
- qué hacer si falla `oreshnik:ready`;
- qué hacer si falla `oreshnik:canonical`;
- qué hacer si falla `oreshnik:drift:ci`;
- qué hacer si falla `oreshnik:gate`;
- por qué branch protection queda fuera de esta fase.

---

## 6. Branch protection

No activar branch protection en esta fase.

Solo dejar recomendación documentada:

Después de que el workflow pase en al menos 1 PR real, activar protección de `master` con checks obligatorios:

```txt
Oreshnik Cloud CI / oreshnik-cloud-ci
```

---

## 7. Fases y sprints de 1 hora

### Sprint S-HC-OCI-00 — Preparación y rama hija

**Duración:** 5 minutos  
**Objetivo:** trabajar aislado sin tocar `master`.

Comandos sugeridos:

```bash
git checkout master
git pull --ff-only origin master
git checkout -b jean/oreshnik-cloud-ci-2026-07-05
npm ci
npm run oreshnik:ready
```

**Aceptación:**

- Rama hija creada.
- `oreshnik:ready` ejecutado o fallo documentado.
- No hay cambios todavía.

---

### Sprint S-HC-OCI-01 — Contrato y runbook

**Duración:** 10 minutos  
**Objetivo:** guardar contrato y guía operativa.

Archivos:

```txt
docs/operations/oreshnik-cloud-ci-contract.md
docs/operations/oreshnik-cloud-ci-runbook.md
```

**Aceptación:**

- Contrato guardado en repo.
- Runbook creado.
- Se documenta que el cambio es aditivo.
- Se documenta que branch protection no se activa aún.

---

### Sprint S-HC-OCI-02 — Drift CI no interactivo

**Duración:** 15 minutos  
**Objetivo:** crear script no interactivo para CI.

Archivo:

```txt
scripts/oreshnik/drift-ci.mjs
```

**Aceptación:**

- El script no pide input.
- Si detecta cambios críticos no autorizados, falla.
- Si no detecta drift crítico, pasa.
- No modifica `scripts/oreshnik/drift.mjs`.

---

### Sprint S-HC-OCI-03 — Scripts npm aditivos

**Duración:** 10 minutos  
**Objetivo:** agregar comandos de nube sin romper comandos existentes.

Archivo:

```txt
package.json
```

Scripts esperados:

```json
"oreshnik:canonical": "node scripts/oreshnik/canonical-check.mjs",
"oreshnik:drift:ci": "node scripts/oreshnik/drift-ci.mjs",
"oreshnik:ci": "npm run oreshnik:ready && npm run oreshnik:canonical && npm run oreshnik:drift:ci && npm run oreshnik:gate"
```

**Aceptación:**

- No se elimina ningún script actual.
- No se cambia semántica de scripts actuales.
- `npm run oreshnik:drift:ci` existe.
- `npm run oreshnik:ci` existe.

---

### Sprint S-HC-OCI-04 — GitHub Actions

**Duración:** 15 minutos  
**Objetivo:** ejecutar Oreshnik en nube.

Archivo:

```txt
.github/workflows/oreshnik-cloud-ci.yml
```

**Aceptación:**

- Usa `actions/checkout@v4`.
- Usa `fetch-depth: 0`.
- Hace fetch de `origin/master`.
- Intenta fetch de `origin/oreshnik/control`.
- Usa Node 20.
- Ejecuta `npm ci`.
- Ejecuta:
  - `npm run oreshnik:ready`
  - `npm run oreshnik:canonical`
  - `npm run oreshnik:drift:ci`
  - `npm run oreshnik:gate`
- Sube artifacts si existen.

---

### Sprint S-HC-OCI-05 — Validación y evidencia

**Duración:** 5 minutos  
**Objetivo:** validar que nada rompió local/cloud.

Comandos mínimos:

```bash
npm run oreshnik:ready
npm run oreshnik:canonical
npm run oreshnik:drift:ci
```

Si da tiempo:

```bash
npm run oreshnik:gate
```

**Aceptación:**

- Estado final documentado.
- Si algo falla, se deja informe claro.
- No se hace merge automático.
- No se activa branch protection.

---

## 8. Prompt para Codex Goal

Usar este prompt dentro del goal runner de HEPTACORE:

```txt
Objetivo: implementar Oreshnik Cloud CI en HEPTACORE como capa aditiva no disruptiva.

Debes obedecer el contrato Oreshnik/Kilo del repo:
1. Ejecuta el contrato nativo con oreshnik goal --harness kilo --json.
2. Lee el JSON antes de tocar archivos.
3. Trabaja solo dentro del worktreePath y functionalBranch autorizados.
4. No hardcodees operador humano.
5. Si el contrato indica needsAlignment, ejecuta oreshnik align --apply --harness kilo.

Crea una rama hija desde master llamada:
jean/oreshnik-cloud-ci-2026-07-05

Implementa estos sprints en una hora:
S-HC-OCI-00 preparación y ready.
S-HC-OCI-01 contrato y runbook.
S-HC-OCI-02 drift CI no interactivo.
S-HC-OCI-03 scripts npm aditivos.
S-HC-OCI-04 GitHub Actions.
S-HC-OCI-05 validación y evidencia.

Hard stops:
- No modificar o reemplazar oreshnik:preflight.
- No modificar o reemplazar scripts/oreshnik/drift.mjs.
- No tocar master directo.
- No activar branch protection.
- No pedir credenciales reales.
- No tocar Prisma, auth, middleware ni .env salvo que el contrato lo autorice.
- No cerrar si no hay evidencia.

Archivos permitidos:
.github/workflows/oreshnik-cloud-ci.yml
scripts/oreshnik/drift-ci.mjs
scripts/oreshnik/cloud-ci-report.mjs
package.json
docs/operations/oreshnik-cloud-ci-contract.md
docs/operations/oreshnik-cloud-ci-runbook.md

Criterios de aceptación:
1. Los scripts actuales de Oreshnik siguen intactos.
2. Existen nuevos scripts:
   - oreshnik:canonical
   - oreshnik:drift:ci
   - oreshnik:ci
3. El drift CI no es interactivo.
4. El workflow usa checkout con fetch-depth 0.
5. El workflow ejecuta npm ci, oreshnik:ready, oreshnik:canonical, oreshnik:drift:ci y oreshnik:gate.
6. El workflow sube artifacts de var/oreshnik y var/goal-runner.
7. Branch protection queda documentado, no activado.
8. Se entrega resumen final con archivos modificados, comandos corridos, resultados y riesgos pendientes.
```

---

## 9. Comando sugerido para iniciar Goal

Según el repo, el wrapper local disponible es:

```bash
npm run oreshnik:goal -- --title "Oreshnik Cloud CI" --desc "Implementar GitHub Actions y drift CI no interactivo como capa aditiva para Oreshnik en nube"
```

Si el harness Kilo está activo, también puede usarse directamente el contrato Kilo/Oreshnik según el adaptador del repo.

---

## 10. Definition of Done

La tarea se considera terminada si:

- Existe rama hija.
- Existe contrato `.md`.
- Existe runbook `.md`.
- Existe script `drift-ci.mjs`.
- Existen scripts npm aditivos.
- Existe workflow GitHub Actions.
- Los comandos actuales siguen intactos.
- CI no requiere input humano.
- No se activó branch protection.
- Hay resumen final de Codex con:
  - archivos tocados;
  - comandos ejecutados;
  - resultados;
  - fallos;
  - próximos pasos.

---

## 11. Próximo paso posterior a esta hora

Después de que el PR pase:

1. Revisar logs de GitHub Actions.
2. Validar artifacts.
3. Confirmar que no rompió el uso local.
4. Hacer merge.
5. En una segunda fase, activar branch protection con el check obligatorio.

