# S-HC-PUB-07-YOUTUBE-PUBLISHING

## Status

PARTIAL DELIVERY. CODE COMPLETE FOR OFFLINE VALIDATION. REAL PROVIDER ACCEPTANCE STILL BLOCKED.

## Task Runtime

- Task: `S-HC-PUB-07-YOUTUBE-PUBLISHING`
- Run: `run-manuel-S-HC-PUB-07-YOUTUBE-PUBLISHING-20260704081318-00079d96`
- Assignment: `asg-061998a5-c29a-4290-8761-00f3ba559274`
- Branch: `dispatch/manuel/manuel-codex5/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/3f656fa8ff`
- Worktree: `var/oreshnik/wt/32305cad03d6321a/manuel/manuel-codex5/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/3f656fa8ff`

## Audit Summary

### Existing and reused

- Existing publisher contract and cron execution pipeline from `PUB-04` were reused.
- Existing credential resolver and tenant-scoped vault flow were reused.
- Existing publishing API route and cron route were reused.
- Existing multiformat asset model already recognized `YOUTUBE_SHORT` and `YOUTUBE_VIDEO` compatibility.
- Existing tests already covered the broader publishing and adapter surface.

### Real gaps found

- `OAuthProvider` did not include `YOUTUBE`.
- No YouTube publisher implementation existed.
- Publisher contracts did not carry YouTube metadata or refresh-token inputs.
- Cron and immediate publish adapters did not forward YouTube-specific fields.
- Credential resolver did not expose a refresh token for tenant-scoped YouTube credentials.
- No focused tests covered resumable YouTube upload, thumbnail upload, ambiguous provider outcomes, or access-token refresh.
- Env examples did not document Google app credentials or default YouTube privacy.

### Out of scope or intentionally not completed

- No real OAuth authorization against Google.
- No real provider publish evidence.
- No production deploy, no real scheduling proof, no external channel confirmation.
- No claim that YouTube support is production-validated.

## Implementation

### Added

- `apps/web/lib/publishers/youtube.ts`
- `apps/web/lib/__tests__/youtube-publisher.test.ts`
- `packages/db/prisma/migrations/20260704082500_add_youtube_oauth_provider/migration.sql`

### Updated

- `packages/db/prisma/schema.prisma`
- `contracts/S-HC-PUB-04/pub04-contract.ts`
- `apps/web/lib/publishers/types.ts`
- `apps/web/lib/publishers/index.ts`
- `apps/web/lib/credential-resolver.ts`
- `apps/web/app/api/publishing/publish/route.ts`
- `apps/web/app/api/cron/publisher/route.ts`
- `apps/web/lib/publishing-cron-executor.ts`
- `.env.example`
- `.env.rrss.example`

## Behavioral Result

- HeptaCore can now route YouTube publish jobs through a dedicated publisher.
- Publisher supports resumable upload, metadata, optional thumbnail upload, and ambiguous outcome handling.
- Tenant-scoped credentials can provide `refreshToken` so the YouTube publisher refreshes an expired access token before upload.
- Immediate and cron publishing now pass title, description, format, thumbnail, and refresh-token fields through the publisher contract.
- `OAuthProvider.YOUTUBE` is available in Prisma for tenant-scoped OAuth persistence readiness.

## Validation

- `npm run oreshnik:preflight -- --sprint S-HC-PUB-07 --operator Manuel --desc "audit pub07 and oauth foundation"`
- `npm run typecheck -w @heptacore/web`
- `npx tsx --test apps/web/lib/__tests__/youtube-publisher.test.ts apps/web/lib/__tests__/pub04-adapter.test.ts`
- `npx prisma validate --schema packages/db/prisma/schema.prisma`
- `npm run build -w @heptacore/web`
- `npm test -w @heptacore/web`
- `npm run typecheck`
- `npm run build`
- `npm run worker:validate`
- `npm run test`

All commands above passed locally in the governed worktree.

## Evidence Type Decision

Canonical task definition places `PUB-07` in CASE B.

Reasons:

- acceptance says `publishing real` for both YouTube Video and Shorts
- acceptance says `Programacion y publicacion real`
- acceptance says `Provider-specific tests con evidencia real para cada formato`
- acceptance says `Cero declaracion de soporte hasta validacion real`

## Acceptance Gap Still Open

The canonical acceptance for `PUB-07` requires real provider evidence:

- real YouTube Video 16:9 publishing
- real YouTube Shorts publishing
- real scheduling/publishing evidence
- provider-specific evidence for each real format

This session was explicitly forbidden from performing real external actions. Because of that, the task is not honestly closable as `ready_for_integration` and should not be advanced through Oreshnik validation/integration as if the real-provider acceptance already existed.

## External Validation Still Required

### Required environment

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_DEFAULT_PRIVACY_STATUS`
- existing tenant-scoped encrypted OAuth credential in vault for the exact tenant/account being validated

### Required external evidence

- real tenant-scoped Google/YouTube authorization
- one real `YOUTUBE_VIDEO` upload returning a confirmed `videoId`
- one real `YOUTUBE_SHORT` upload returning a confirmed `videoId`
- real scheduling path evidence if scheduled publishing is part of the acceptance session
- captured provider result proving no false `PUBLISHED`

### Exact validation procedure

1. Confirm the governed branch contains the preserved code path and migration.
2. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and desired `YOUTUBE_DEFAULT_PRIVACY_STATUS` in the target environment.
3. Connect a tenant-scoped YouTube account through the approved OAuth flow so the vault contains encrypted credentials for the exact tenant.
4. Execute one controlled `YOUTUBE_VIDEO` publish using a test asset and record the returned `videoId`.
5. Execute one controlled `YOUTUBE_SHORT` publish using a compatible vertical asset and record the returned `videoId`.
6. Verify provider confirmation, local persistence, and no false transition to `PUBLISHED` when provider confirmation is absent.
7. Only after that evidence exists, run Oreshnik evidence lifecycle, close, and integrate.

## Risks

- no real-provider proof exists yet for resumable upload behavior against the live API
- no real-provider proof exists yet for thumbnail upload against the live API
- no real-provider proof exists yet for token refresh against a live expired access token
- no real-provider proof exists yet for scheduled publishing against the live API
- alpha.13 does not expose a clean blocked-external lifecycle for this preservation case

## Alpha.13 Deferred Incident

`ORESHNIK_ALPHA13_DEFECT_DEFERRED_ORESHNIK_ON_HOLD`

Meaning in this task:

- code can be preserved and published
- contractual live evidence is still missing
- alpha.13 does not model that state cleanly without either leaving the run active or pretending the task is integration-ready

## Resumption Procedure

1. Resume or take over only the preserved governed branch/worktree lineage for this exact task if it remains available through supported alpha.13 surfaces.
2. Do not recreate `PUB-07` manually and do not edit control-plane JSON.
3. Reuse the preserved baseline commit `0de95a3ea24e98f474c4f56895379ec5b418ac9d` plus any later handoff-only preservation commit on the same branch.
4. Perform external validation only when explicitly authorized.
5. After real evidence exists, run `evidence --start-validation`, `evidence --ready-for-integration`, `close`, and `integrate`.

## Blocking Reason

`ORESHNIK_ALPHA13_DEFECT_DEFERRED_ORESHNIK_ON_HOLD` does not apply to the code path itself. The concrete blocker is acceptance policy vs authorized actions:

- the task requires real external proof
- the current session explicitly forbids real publish / real connection / real external mutation

Alpha.13 also does not expose a clear `blocked_external` task-runtime transition equivalent to preserve this state through the normal evidence lifecycle without pretending the task is integration-ready.

## Next Canonical Action

1. Preserve this branch and run as the active governed PUB-07 implementation.
2. When explicitly authorized for real external validation, use tenant-scoped Google credentials and execute staged real proof for both `YOUTUBE_VIDEO` and `YOUTUBE_SHORT`.
3. Only after real evidence exists, run the normal Oreshnik evidence lifecycle, sprint close, and integration.
