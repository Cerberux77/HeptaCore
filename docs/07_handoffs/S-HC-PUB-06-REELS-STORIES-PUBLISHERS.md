# S-HC-PUB-06-REELS-STORIES-PUBLISHERS

## Estado

- Run activo: `run-manuel-S-HC-PUB-06-REELS-STORIES-PUBLISHERS-20260704050056-dbcefd7d`
- Branch: `dispatch/manuel/manuel-codex3/publishing/S-HC-PUB-06-REELS-STORIES-PUBLISHERS/57a46a194e`
- Worktree: `D:\PROYECTOS\WORKTREES\HeptaCore_ORESHNIK_READY\var\oreshnik\wt\32305cad03d6321a\manuel\manuel-codex3\publishing\S-HC-PUB-06-REELS-STORIES-PUBLISHERS\57a46a194e`

## Implementado en esta iteracion

- Se ampliaron los formatos live a `INSTAGRAM_REEL`, `FACEBOOK_STORY` y `FACEBOOK_REEL`.
- `publish/route` ahora propaga `format` hasta el publisher y deja bloqueado solo `INSTAGRAM_CAROUSEL` en live.
- Instagram enruta `feed/story/reel` con `media_type` especifico en la creacion del contenedor.
- Facebook separa `feed`, `photo_stories`, `video_stories` y `video_reels` con helpers dedicados.
- Cron PUB-04 ya consume `supportedFormats` reales del publisher y propaga `format` al publish live.
- Preview/compatibilidad ya reconocen Story/Reel verticales en Instagram/Facebook.

## Pruebas ejecutadas

- `npm run typecheck` OK
- `npm run test -w @heptacore/web -- --runInBand` OK
- `npm run build` OK
- `npm run worker:validate` OK
- `npm run test` OK

## Validacion complementaria

- Se corrigio el smoke infra de Oreshnik para resolver `oreshnik-cli` desde el paquete instalado en el worktree en lugar de depender de una ruta fija.
- La limpieza de fixtures Git en Windows ahora reintenta `rmSync` ante `EPERM`, `EBUSY` y `ENOTEMPTY`, reduciendo flakes del smoke en worktrees despachados.

## Siguiente paso recomendado

- Registrar evidencia, marcar `ready_for_integration` y continuar con el cierre e integracion de la Task desde este mismo Run.
