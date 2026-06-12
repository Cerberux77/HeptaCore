---
type: methodology
project: "HeptaCore"
fecha: "2026-06-01"
actualizado: "2026-06-12T00:00:00.000Z"
methodology: "Oreshnik HeptaCore v1.0"
tags:
  - "#methodology"
  - "#oreshnik"
  - "#manuel"
  - "#jean"
---

# Metodologia Oreshnik HeptaCore

## Objetivo

Mantener a Manuel y Jean trabajando en paralelo sin perder estado, documentacion ni trazabilidad. El resultado esperado es similar a Google Docs en terminos operativos: la rama madre conserva la documentacion integrada mas reciente de ambos, mientras cada operador trabaja en su rama hija.

## Principio

Git es la fuente de verdad. Obsidian es la interfaz. Oreshnik automatiza preflight, control de zonas, cierre, eventos y actualizacion del vault.

## Flujo

```txt
Abrir sesion
  -> preflight
  -> sync docs desde madre
  -> crear/validar rama hija
  -> ejecutar sprint
  -> actualizar docs
  -> validar
  -> close-sprint
  -> registrar evento
  -> crear nueva madre docs
```

## Comandos

```bash
npm run oreshnik:status
npm run oreshnik:preflight -- --sprint S-HC-01 --operator Manuel --desc "console-onboarding"
npm run oreshnik:zone -- --sprint S-HC-01
npm run oreshnik:drift -- --operator Manuel --mode silent --desc "ad-hoc changes"
npm run oreshnik:close -- --sprint S-HC-01 --operator Manuel --desc "console-onboarding"
npm run oreshnik:hook:install
```

Usar `--push` en `close-sprint` solo cuando el cierre este revisado:

```bash
npm run oreshnik:close -- --sprint S-HC-01 --operator Manuel --desc "console-onboarding" --push
```

## Contrato Anti-Pisada

1. Nadie trabaja directo en madre salvo cierre documental controlado.
2. Cada sprint tiene owner unico.
3. Las zonas compartidas requieren coordinacion explicita.
4. `packages/db/prisma/schema.prisma` requiere lock doble Manuel + Jean.
5. `docs/obsidian-vault` se fusiona con merge documental, no con reemplazo destructivo.
6. Si ambos editan la misma seccion y no se puede fusionar, se bloquea el cierre.
7. El codigo de producto no se integra automaticamente a madre docs; se integra por merge/review normal.

## Stop Conditions

- Secretos en diff.
- Cambio de Prisma schema sin lock doble.
- Publicacion real o gasto real sin aprobacion.
- Scraping real sin aprobacion.
- Build roto.
- Typecheck roto.
- Worker publica fuera de dry-run.
- Conflicto de zona con el otro operador.
- Vault central desactualizado al cierre.
- Sprint sin owner o sin criterio de cierre.

## Drift Detection

Cuando el trabajo excede el alcance del sprint planificado, Oreshnik detecta cambios ad-hoc
y permite registrarlos como entradas de drift para trazabilidad.

### Flujo de Drift

1. **Deteccion**: `oreshnik:preflight` step 10/10 escanea el working tree y calcula un
   score de relevancia (0-10) basado en cantidad de archivos, nuevos, eliminados y zonas
   criticas (DB, auth, middleware, proxy, env).
2. **Alerta**: Si el score >= 3, preflight emite un warning con el comando sugerido.
3. **Registro**: `npm run oreshnik:drift` ofrece modos interactivo, silencioso (`--mode
   silent`) o de ignorar sesion.
4. **Vinculacion**: Al cerrar el sprint, `oreshnik:close` detecta drifts huerfanos y los
   linkea a la nueva rama madre para trazabilidad completa.

```bash
# Ver drifts registrados
npm run oreshnik:drift:check

# Registrar drift silencioso (auto-asigna S-HC-DRIFT-NNN)
npm run oreshnik:drift -- --operator Manuel --mode silent --desc "descripcion"
```

### Data

- `var/oreshnik/drift-log.json`: Registro persistente de entradas de drift.
- `var/oreshnik/.drift-mode.json`: Preferencia de modo por sesion (silent/ignore/null).
- `var/oreshnik/task-board.json`: Entradas con `track: "ad-hoc"` y estado `done`.

## Pre-Push Drift Hook

Git hook no-bloqueante que advierte sobre cambios no registrados antes de cada push.

```bash
# Instalar una vez por clon
npm run oreshnik:hook:install
```

El hook:
- Escanea `git status --porcelain` (excluye `var/oreshnik/`)
- Calcula score (archivos, nuevos, eliminados, zonas criticas)
- Si score >= 3: imprime warning amarillo con el comando `npm run oreshnik:drift`
- NUNCA bloquea el push — solo advertencia

Prueba manual:
```bash
node scripts/oreshnik/hooks/pre-push-check.mjs
```

## Reparto Inicial Sugerido

| Track | Manuel | Jean |
|---|---|---|
| Producto/agentes | Strategy, prompts, UX, landing | Arquitectura de runtime y validacion |
| DB/backend | Modelo funcional y seeds | Prisma/Auth/seguridad |
| Worker | RRSS pipeline y drafts | Queue/jobs/retries |
| Frontend | Landing, console UX | Componentizacion, dashboard |
| QA/docs | Vault, Oreshnik, runbooks | Validacion independiente |
