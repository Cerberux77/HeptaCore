# Handoff — S-HC-PUB-07-YOUTUBE-PUBLISHING

- Operator / harness / instance: manuel / kilo / manuel-kilo8
- Run: run-manuel-S-HC-PUB-07-YOUTUBE-PUBLISHING-20260706072216-381f66dc
- Branch: dispatch/manuel/manuel-kilo8/publishing/S-HC-PUB-07-YOUTUBE-PUBLISHING/0235fe3455
- PR: #6 (base master) — no merge, no production deploy
- Head at handoff: 82c7977617a21808d7088dcab8f964f6bd523eb1

## Scope delivered
Real YouTube publishing (Data API v3) integrated into the existing publishing pipeline:
- YouTube provider with resumable upload (`apps/web/lib/publishers/youtube.ts`), Video 16:9 and Shorts differentiated.
- `OAuthProvider` enum extended with `YOUTUBE` (additive migration `20260706040000_add_youtube_oauth_provider`); persistable via existing `PublishingJob`/`PublishingResult`/`OAuthConnection`.
- Unified format pipeline: `YOUTUBE_VIDEO` / `YOUTUBE_SHORT` in `publishing-formats.ts` (validation + dry-run/preview).
- Live/scheduled format gate (`evaluateYouTubePublishGate`) — invalid Short (orientation/duration/MIME) or missing/invalid thumbnail is blocked with 409 `LIVE_BLOCKED_FORMAT_VALIDATION` before any provider call or job.
- Thumbnail handled as a separate `role="thumbnail"` asset (not counted as a second video); required + validated (image MIME + public URL) for YOUTUBE_VIDEO.
- Network-generic ambiguous errors (no Meta/Facebook literals); transactional finalization reused — never PUBLISHED without a real provider video id.

## Preview infrastructure fixes (this Run)
- QA seed guard: env-driven DB host allowlist (`HEPTACORE_QA_DATABASE_HOST_ALLOWLIST`), no hardcoded host, secrets never logged.
- Preview build runs `prisma migrate deploy` before QA seed (preview-only; production skips).
- `prisma.config.ts`: datasource URL falls back `DIRECT_URL || DATABASE_URL`.
- Deterministic Preview super-admin bootstrap (`scripts/seed-admin.mjs`): no insecure defaults, required env, role=SUPER_ADMIN check, idempotent upsert, preview-only.

## Validation
- Gates (canonical `oreshnik gate`): typecheck / build / worker / tests = 4 passed, 0 failed.
- Unit/integration: web 718+, infra 160, plus focused YouTube (26), qa-seed guard (5), admin bootstrap (11).
- Vercel Preview: SUCCESS (build + migrate deploy + QA seed + admin bootstrap).
- Manual QA (performed by Manuel on Preview) reconciled: configured super admin `/app -> /admin`, `/admin/tenants` accessible; normal tenant user isolated to their tenant.

## Pending / risks (external)
- BLOCKED_EXTERNAL_LIVE: real YouTube live publish not validated — requires Google/YouTube OAuth app + refresh token (`youtube.upload` scope) + authorized channel + real assets + a YouTube OAuth connect route (out of the authorized zones). Provider/persistence/tests are complete; only the external credential + connect flow remain.
- No production migration or deploy performed.

## Global SUPER_ADMIN re-architecture
Out of scope for this Run. To be implemented under a separate child task `S-HC-TEN-02-GLOBAL-SUPER-ADMIN` (dependency S-HC-TEN-01), not started here.
