# Checkpoint — HC-CP-META-LIVE-UI-UNVERIFIED

Date: 2026-06-19
Sprint: S-HC-REC-00A
Operator: Manuel
Type: checkpoint

## Baseline

| Campo | Valor |
|---|---|
| SHA | `0deeb4341db1712d50b0efd3f3339f1538074b61` |
| Rama snapshot | `recovery/s-hc-live-02-runtime-candidate` |
| Rama sprint | `manuel/s-hc-rec-00a-ui-publishing-baseline` |
| Worktree | `D:\PROYECTOS\WORKTREES\HeptaCore_S-HC-REC-00A` |
| Deployment referencia | `dpl_8iKrhoJMEsrTLWfgzCQyVPD1saEM` (heptacore.vercel.app, 2026-06-19T12:39Z) |

## Estado funcional al inicio

| Capa | Estado |
|---|---|
| Facebook backend/provider | Probado y visible en produccion. Page: Turpial Sound (1129437930248909). Token permanente. |
| Instagram backend/provider | Previamente estabilizado, pendiente de nueva validacion UI. |
| Facebook UI normal | No probada. La publicacion anterior fue disparada desde consola DevTools. |
| Instagram UI normal | No probada. |
| Dry-run UI | Pendiente. |
| Immediate UI | Pendiente. |

## Defectos confirmados

1. `handlePublish()` en `dashboard-console.tsx:271` publica el primer draft `APPROVED` (`firstApproved`), no el draft seleccionado (`selectedId`).
2. `assetUrl()` en `dashboard-console.tsx:67` hardcodea `/tenant-assets/turpial/` para preview de assets en UI.
3. La UI no muestra `externalPostId` tras publicacion exitosa.
4. `manualApproval` no es validado server-side en `publish/route.ts`.
5. Proteccion contra doble clic es solo client-side (`publishState === "loading"`).
6. `TRIAL_POSTS_PER_NETWORK = 999999` (sin limite efectivo).
7. Scheduling E2E no demostrado (API funciona, cron configurado, flujo completo no verificado).

## Nucleo protegido (no modificar)

- `apps/web/lib/token-vault.ts`
- `apps/web/lib/publishers/facebook-page.ts`
- `apps/web/lib/publishers/instagram.ts`
- `apps/web/lib/instagram-publisher.ts`
- `apps/web/lib/publishers/registry.ts`
- `apps/web/lib/credential-resolver.ts`
- `apps/web/app/api/cron/publisher/route.ts`
- `packages/db/prisma/schema.prisma`

## Oreshnik

El task board de Oreshnik se considera NO CONFIABLE para este sprint. Estados historicos `done` sin evidencia suficiente. No cerrar Oreshnik ni marcar tareas como `done` hasta que S-OR-REC-00B y S-HC-REC-00C corrijan la capa de mando.
