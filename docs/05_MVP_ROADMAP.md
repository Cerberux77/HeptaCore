# MVP Roadmap

## Current Position

HeptaCore is now an MVP tecnico pre-produccion, not a pure foundation repo. The canonical deployable base is `master` / `origin/master`.

## Closed / Implemented

| Sprint | Status | Notes |
|---|---|---|
| S-HC-00 | Closed | Monorepo, docs, Prisma baseline, worker seed, Oreshnik baseline. |
| S-HC-01 | Closed | Console/dashboard, checklist, draft queue UI. |
| S-HC-02 | Closed | Turpial seed/import path and DB service layer baseline. |
| S-HC-03 | Closed | Strategy runner. |
| S-HC-04 | Closed | Auth, RBAC, tenant guards, audit baseline. |
| S-HC-05 | Closed | Approval queue and human gates. |
| S-HC-06 | Closed | BullMQ/Redis worker queue code and dry-run jobs. |
| S-HC-07 | Closed | Reports dashboard and daily summary data. |
| S-HC-08 | Closed | Meta adapter sandbox/mock layer. |
| S-HC-09 | Closed | Publish readiness gate. |

## Pending / Blocked

| Item | Status | Reason |
|---|---|---|
| Production env setup | Pending | Vercel needs DB/auth/encryption variables. |
| Production migrations and seeds | Pending | Admin and `turpial-sound` must be seeded in production DB. |
| Worker hosting | Pending | BullMQ needs Redis and persistent hosting outside Vercel serverless. |
| S-HC-PUB-01 dry-run from UI | Pending | Needs a controlled endpoint/action and explicit human gate. |
| Real RRSS publishing | Blocked by design | Requires approval, official credentials, real adapters, rollback plan, and dry-run proof. |
| Real campaign spend | Blocked by design | Requires explicit approval and budget controls. |
| Paid scraping | Blocked by design | Requires compliance review and explicit approval. |

## Recommended Next Sprint

S-HC-PUB-01 should remain dry-run only: add a controlled web action for one approved Turpial draft, keep real publication disabled, record audit logs, and document rollback.
