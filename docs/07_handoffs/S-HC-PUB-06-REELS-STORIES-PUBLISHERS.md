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

- `npm run typecheck` ✅
- `npm run test -w @heptacore/web -- --runInBand` ✅
- `npm run build` ✅
- `npm run worker:validate` ✅

## Gap actual

- `npm run test` del repo raiz falla en `scripts/oreshnik/__tests__/smoke-end-to-end.test.mjs`.
- Causa observada: el smoke usa una ruta fija a `node_modules/oreshnik-cli/dist/cli.js` relativa al dispatcher worktree, y en este contexto el modulo no existe en esa ruta.
- El fallo no viene de `apps/web` ni de PUB-06; afecta la suite infra de Oreshnik dentro del worktree despachado.

## Siguiente paso recomendado

- Decidir si el fix del smoke de Oreshnik entra como drift/infra separada o si se valida el cierre de PUB-06 con las gates funcionales ya verdes y el gap infra explicitado.
