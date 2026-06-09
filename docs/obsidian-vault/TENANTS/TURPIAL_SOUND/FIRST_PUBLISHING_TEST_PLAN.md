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

## Phase 1: Discovery

Jean debe:

- crear su rama `Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09`;
- ejecutar preflight;
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

Jean debe devolver el comando exacto para una sola publicacion, pero no ejecutarlo. El comando debe incluir:

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

Fuera de `S-HC-CTRL-01` y solo tras gate:

- una plataforma;
- un post;
- capturar id/respuesta sin tokens;
- detener despues del primer resultado;
- actualizar handoff.

## Candidato Inicial Sugerido Para Discovery

Jean debe evaluar primero posts de bajo riesgo, sin claims comerciales sensibles y con asset existente:

- `fb_post_02` - Facebook feed, estudio/produccion, bajo riesgo, asset `equipo-consola.jpg`;
- `fb_post_10` - Facebook feed, engagement comunidad, bajo riesgo, asset `persona-banda.jpg`;
- `ig_post_03` - Instagram feed, estudio/consola, bajo riesgo, asset `grid-consola.jpg`.

La recomendacion final debe salir del dry-run y validacion de assets, no de este documento.
