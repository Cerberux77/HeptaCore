---
type: publishing-test-plan
project: "HeptaCore"
tenant: "turpial-sound"
sprint: "S-HC-PUB-01"
last_updated: "2026-06-09"
tags:
  - "#publishing"
  - "#dry-run"
  - "#jean"
---

# First Publishing Test Plan

## Objetivo

Preparar el primer test controlado de publicacion para `turpial-sound` sin publicar nada durante discovery ni dry-run.

Este plan es candidato de asignacion. Jean solo lo ejecuta si Oreshnik emite un paquete de asignacion con `ok: true`, owner, branch, allowed files, prohibited files, validation gates y stop criteria.

Desde `S-HC-PROD-00`, este plan deja de ser un ejercicio de consola independiente. `S-HC-PUB-01` depende de que HeptaCore pueda ejecutar la prueba desde el producto: login, dashboard Oreshnik, tenant console, discovery UI, dry-run UI, publish gate y registro de eventos/handoff.

Prerequisitos:

- `S-HC-PROD-01`: login/users/roles para Manuel y Jean.
- `S-HC-PROD-02`: dashboard Oreshnik con lane asignado.
- `S-HC-PROD-03`: consola tenant Turpial Sound.
- `S-HC-PROD-04`: discovery + dry-run desde UI.
- `S-HC-PROD-05`: publish controlado one-post desde UI con gate.
- `S-HC-PROD-06`: logs/handoff/Obsidian event recording.

## Phase 1: Discovery

Si Oreshnik asigna este candidato despues de los prerequisitos producto, Jean debe:

- crear solo la rama indicada por el paquete Oreshnik;
- conservar el paquete en el handoff;
- revisar `apps/worker/src/publisher.mjs`, `apps/worker/src/config.mjs`, `apps/worker/src/meta-readiness.mjs`;
- revisar `examples/tenants/turpial/content/queue/publication-queue.json`;
- listar drafts/assets disponibles;
- validar vault de Instagram y Facebook;
- identificar candidatos de bajo riesgo.

## Phase 2: Dry-Run

Dry-run solamente:

```bash
npm run worker:validate
$env:BOT_DRY_RUN="true"; $env:BOT_MODE="draft"; $env:HEPTACORE_TENANT_SLUG="turpial"; npm run worker -- --date 2026-06-08
```

Si el comando exacto cambia tras discovery, Jean debe documentar el comando real usado y por que.

## Phase 3: Preparar Comando One-Post

Jean debe devolver el comando exacto para una sola publicacion, pero no ejecutarlo. Esto aplica solo si Oreshnik asigno el candidato. El comando debe incluir:

- plataforma unica;
- id de post elegido, o documentar `BLOCKED` si el worker actual no soporta ejecutar un solo id sin cambios seguros;
- dry-run desactivado solo en el comando preparado;
- `HEPTACORE_ALLOW_REAL_PUBLISH=I_UNDERSTAND_REAL_RRSS_PUBLICATION`;
- nota de que requiere aprobacion explicita de Manuel antes de uso.

El comando por fecha no cuenta como one-post si esa fecha contiene mas de una entrada.

## Phase 4: Gate Manuel

Antes de real publish, Manuel debe confirmar por escrito:

```txt
Apruebo publicar una sola publicacion de <platform> para Turpial Sound usando el comando preparado de S-HC-PUB-01.
```

Sin esa frase o equivalente explicito, no se ejecuta.

## Phase 5: Real Publish

Fuera de `S-HC-CTRL-02` y solo tras asignacion Oreshnik, discovery, dry-run y gate:

- una plataforma;
- un post;
- capturar id/respuesta sin tokens;
- detener despues del primer resultado;
- actualizar handoff.

## Candidato Inicial Sugerido Para Discovery

Si Oreshnik asigna este candidato, Jean debe evaluar primero posts de bajo riesgo, sin claims comerciales sensibles y con asset existente:

- `fb_post_02` - Facebook feed, estudio/produccion, bajo riesgo, asset `equipo-consola.jpg`;
- `fb_post_10` - Facebook feed, engagement comunidad, bajo riesgo, asset `persona-banda.jpg`;
- `ig_post_03` - Instagram feed, estudio/consola, bajo riesgo, asset `grid-consola.jpg`.

La recomendacion final debe salir del dry-run y validacion de assets, no de este documento.
