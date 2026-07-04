# S-HC-PUB-07-YOUTUBE-PUBLISHING

## Status

PARTIAL DELIVERY. CODE COMPLETE FOR OFFLINE VALIDATION. REAL PROVIDER ACCEPTANCE STILL BLOCKED.

## Task Runtime

- Task: `S-HC-PUB-07-YOUTUBE-PUBLISHING`
- Run: `run-manuel-S-HC-PUB-07-YOUTUBE-PUBLISHING-20260704171215-752eb7a1`
- Assignment: `asg-528b38b5-bd4b-4044-a2c0-3d1d14708abd`
- Claim: `claim-asg-528b38b5-bd4b-4044-a2c0-3d1d14708abd`
- Branch: `dispatch/manuel/manuel-codex6/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/03d2a46dcd`
- Worktree: `var/oreshnik/wt/32305cad03d6321a/manuel/manuel-codex6/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/03d2a46dcd`
- Adopted preserved remote head: `b1186624b378bda6b57656073afc4fb7027ed00c`
- Current task runtime state: active claimed run; not advanced to validation, close, or integration

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

### Verified manifestation in this session

- After the branch was pushed and the task was moved to `blocked` via supported `claim --release --status blocked`, alpha.13 kept the task blocked correctly.
- After `dispatch release`, the assignment and reserved zones were released correctly.
- `dispatch reconcile` reported no fixes and no ambiguity.
- Even after that, `dispatch next --dry-run` still proposed a fresh new assignment for `S-HC-PUB-07-YOUTUBE-PUBLISHING` instead of a distinct next task.
- At the same moment, the only distinct `ready` task visible in the board was `S-HC-PUB-06-REELS-STORIES-PUBLISHERS`, whose acceptance also requires real external Meta evidence and therefore is not safe for this session.

### Recorded dry-run repro

- proposed assignment: `asg-1196efa1-ffa2-44d8-b2b7-d82d33642ea1`
- proposed run: `run-manuel-S-HC-PUB-07-YOUTUBE-PUBLISHING-20260704085654-f5120c74`
- proposed branch: `dispatch/manuel/manuel-codex5/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/277caa8532`

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

## OAuth Onboarding Continuation (2026-07-04)

### Added in this continuation

- `apps/web/lib/youtube-oauth.ts`
- `apps/web/lib/__tests__/youtube-oauth.test.ts`
- `apps/web/components/youtube-integration-panel.tsx`
- `apps/web/app/api/oauth/youtube/callback/route.ts`
- `apps/web/app/api/tenants/[slug]/oauth/youtube/connect/route.ts`
- `apps/web/app/api/tenants/[slug]/oauth/youtube/reconnect/route.ts`
- `apps/web/app/api/tenants/[slug]/oauth/youtube/status/route.ts`
- `apps/web/app/api/tenants/[slug]/oauth/youtube/disconnect/route.ts`

### Updated in this continuation

- `apps/web/components/dashboard-console.tsx`
- `scripts/oreshnik/ready-lib.mjs`
- `scripts/oreshnik/ready.mjs`
- `scripts/oreshnik/__tests__/ready.test.mjs`

### Capability matrix for this continuation

Exists and reused:
- `SocialAccount`, `OAuthConnection`, `CredentialVaultItem`, and AES-GCM vault encryption.
- Tenant session resolution, membership claims, and RBAC permission `INTEGRATIONS_MANAGE`.
- Existing tenant dashboard shell.
- The previously completed YouTube publisher, resolver, cron forwarding, and migration baseline.

Exists partially:
- Existing Meta OAuth routes already persisted encrypted credentials and tenant-scoped social accounts, but their `state` handling was not strong enough to reuse as-is for this YouTube onboarding.
- Existing tenant network configuration already exposed selected networks, but only as sandbox/profile toggles rather than a real YouTube OAuth onboarding.

Missing before this continuation:
- No tenant-facing YouTube OAuth onboarding route.
- No signed state plus replay-protected callback for YouTube.
- No tenant dashboard card to connect, reconnect, disconnect, and inspect YouTube state.
- No focused tests for YouTube OAuth onboarding and reconnection behavior.
- `npm run oreshnik:ready` did not tolerate authorized dispatch runtime artifacts in a governed worktree.

### Exact routes

- Connect: `/api/tenants/[slug]/oauth/youtube/connect`
- Reconnect: `/api/tenants/[slug]/oauth/youtube/reconnect`
- Status: `/api/tenants/[slug]/oauth/youtube/status`
- Disconnect: `/api/tenants/[slug]/oauth/youtube/disconnect`
- Callback: `/api/oauth/youtube/callback`

### Redirect URI

Exact runtime pattern:
- `{PUBLIC_ORIGIN}/api/oauth/youtube/callback`

Examples:
- local: `http://localhost:3000/api/oauth/youtube/callback`
- preview/prod: `https://<your-heptacore-origin>/api/oauth/youtube/callback`

The code derives this from request origin via `resolvePublicOrigin`; there is no dedicated redirect-URI env var.

### Exact tenant UI route

- Fallback integrations route after OAuth: `/tenant/{tenantSlug}?view=integrations`
- Connect UI location: tenant dashboard -> `Integraciones` -> YouTube card -> `Conectar YouTube`

### Variables required

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_DEFAULT_PRIVACY_STATUS`
- one of: `AUTH_SECRET`, `NEXTAUTH_SECRET`, or `TOKEN_VAULT_SECRET` for OAuth state signing
- existing tenant/session auth configuration already used by HeptaCore

No dedicated YouTube redirect env var exists. The callback URI is always derived as `{PUBLIC_ORIGIN}/api/oauth/youtube/callback`.

### Google Cloud setup still required before live proof

1. Enable YouTube Data API v3 in the Google Cloud project used by HeptaCore.
2. Configure the OAuth consent screen for the intended validation users.
3. Create a Web OAuth client.
4. Register the exact callback URI `{PUBLIC_ORIGIN}/api/oauth/youtube/callback`.
5. Load `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into the target environment.
6. Keep `YOUTUBE_DEFAULT_PRIVACY_STATUS` aligned with the validation plan, normally `private`.

### Preview setup still required before live proof

1. Set `GOOGLE_CLIENT_ID` in the Preview environment.
2. Set `GOOGLE_CLIENT_SECRET` in the Preview environment.
3. Set `YOUTUBE_DEFAULT_PRIVACY_STATUS=private` in the Preview environment unless the validation plan explicitly requires another value.
4. Ensure one of `AUTH_SECRET`, `NEXTAUTH_SECRET`, or `TOKEN_VAULT_SECRET` is present in Preview so OAuth state signing and vault encryption stay valid.
5. Discover the exact Preview origin and register that exact origin callback in Google Cloud as `{PREVIEW_ORIGIN}/api/oauth/youtube/callback`.
6. Deploy the governed branch before attempting the OAuth handshake.

### Tenant UI connect procedure

1. Sign in as a tenant member with a role that grants `INTEGRATIONS_MANAGE`.
2. Open the tenant dashboard and switch to `Integraciones`.
3. Use the YouTube card action `Conectar YouTube`.
4. Complete Google consent.
5. Return to HeptaCore callback and verify that the card now shows channel title, handle or channelId, thumbnail, scopes, and connection timestamp.
6. Use `Reconectar` when scopes or expiry need renewal.
7. Use `Desconectar` to revoke the local tenant binding without exposing tokens or editing vault rows manually.

### Security guarantees implemented in this continuation

- signed expiring OAuth state bound to `tenantId + tenantSlug + userId + provider`
- one-time `httpOnly` cookie check to reject replay when callback state does not match
- tenant membership and RBAC validation before connect, callback persistence, status, reconnect, and disconnect
- tenant-scoped encrypted token storage in existing vault
- no token values returned to the browser
- reconnect preserves the previous refresh token when Google omits a replacement
- disconnect marks the connection revoked and the social account disconnected

### Focused validation added in this continuation

- `npm run typecheck -w @heptacore/web`
- `npx tsx --test apps/web/lib/__tests__/youtube-oauth.test.ts apps/web/lib/__tests__/youtube-publisher.test.ts`
- `npx tsx --test apps/web/lib/__tests__/youtube-oauth.test.ts apps/web/lib/__tests__/youtube-publisher.test.ts apps/web/lib/__tests__/publish-flow.test.ts`
- `node --test scripts/oreshnik/__tests__/ready.test.mjs`
- `npm run oreshnik:ready`

Covered by the new OAuth-focused tests:
- tenant-local return URL sanitization
- signed auth state generation
- altered and expired state rejection
- callback persistence of encrypted credentials and tenant social account
- replay rejection when cookie and callback state diverge
- refresh-token preservation on reconnect
- `reconnect_required` status when token is expired and not refreshable
- disconnect state transition

### Post-onboarding live validation still pending

After external authorization is permitted, validate both formats through the tenant UI-backed credential:

1. Connect the tenant channel from `Integraciones`.
2. Run one controlled `YOUTUBE_VIDEO` publish and record the confirmed `videoId`.
3. Run one controlled `YOUTUBE_SHORT` publish and record the confirmed `videoId`.
4. Verify provider confirmation, durable persistence, and absence of false `PUBLISHED` without confirmation.
5. Only then advance Oreshnik evidence/close/integrate for PUB-07.

### Exact post-authorized validation procedure

1. Configure Google Cloud and Preview exactly as described above.
2. Open `/tenant/{tenantSlug}?view=integrations`.
3. Connect the YouTube channel with `Conectar YouTube`.
4. Validate one private `YOUTUBE_VIDEO` 16:9 publish from the tenant UI and capture the confirmed `videoId`.
5. Validate one private `YOUTUBE_SHORT` publish from the tenant UI and capture the confirmed `videoId`.
6. Confirm the callback returns to `/tenant/{tenantSlug}?view=integrations&oauth=youtube_connected` or `...youtube_reconnected`.
7. Confirm `OAuthConnection` and `SocialAccount` stay tenant-scoped, encrypted, and idempotent, and that reconnect preserves `refresh_token` when Google omits a replacement.
8. Only after live proof exists, move into Oreshnik evidence lifecycle; do not mark this task ready for integration from offline validation alone.
