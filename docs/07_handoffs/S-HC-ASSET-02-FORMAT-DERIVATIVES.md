# S-HC-ASSET-02-FORMAT-DERIVATIVES

## Entrega

- Badge de compatibilidad ahora es clickeable y abre el inspector en el formato seleccionado.
- El panel de derivadas persiste variantes como `Asset` separados, con `sourceAssetId`, versionado y lote idempotente.
- El asset original permanece inmutable; las derivadas reutilizan `sourcePath` y no toman `storageKey`.
- Se agrego el endpoint `POST /api/tenants/[slug]/assets/[assetId]/derivatives`.
- Se corrigio un bug preexistente del Goal Runner: colision rara de IDs bajo timestamp fijo.
- El build de `apps/web` usa `next build --webpack` para evitar el fallo reproducible de Turbopack por path length en worktrees profundos de dispatch sobre Windows.

## Gates Ejecutados

- `npx tsx --test lib/__tests__/asset-format-derivatives.test.ts lib/__tests__/asset-service.test.ts` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS con warnings preexistentes del repo, sin errores
- `npm run test:infra` PASS
- `npm test` PASS
- `npm run build` PASS
- `npm run worker:validate` PASS

## Archivos Clave

- `apps/web/components/dashboard-console.tsx`
- `apps/web/lib/asset-service.ts`
- `apps/web/app/api/tenants/[slug]/assets/[assetId]/derivatives/route.ts`
- `apps/web/lib/__tests__/asset-service.test.ts`
- `scripts/goal-runner/lib.mjs`
- `apps/web/package.json`

## Drift Registrado

- `S-HC-DRIFT-004`: correccion del generador de Goal IDs descubierta por el gate global.
