---
type: developer-task
project: "HeptaCore"
operator: "Jean"
sprint: "S-HC-PUB-01"
last_updated: "2026-06-09"
tags:
  - "#jean"
  - "#publishing"
  - "#dry-run"
---

# Jean First Task

## Ready-To-Send Prompt

```txt
Codex/Kilo task for Jean - S-HC-PUB-01

Objective:
Run Turpial Sound first controlled publishing discovery and dry-run. Do not publish anything publicly.

Repository:
Use the HeptaCore GitHub remote repo. If the remote URL is not documented locally, ask Manuel for the repo URL only, not for secrets.

Branch:
Create and work only on:
Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09

Start:
1. git fetch --all --prune
2. git status --short
3. git checkout -b Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09
4. npm run oreshnik:preflight -- --sprint S-HC-PUB-01 --operator Jean --desc "turpial controlled publishing discovery dry-run"

Read first:
- docs/obsidian-vault/00_CENTRAL_HEPTACORE.md
- docs/obsidian-vault/METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE.md
- docs/obsidian-vault/METODOLOGIA/BUS_CONTROL.md
- docs/obsidian-vault/METODOLOGIA/PUBLISHING_SAFETY_PROTOCOL.md
- docs/obsidian-vault/TENANTS/TURPIAL_SOUND/FIRST_PUBLISHING_TEST_PLAN.md
- docs/07_handoffs/zone-map.json

Validations:
- git status --short
- git branch --show-current
- git log --oneline -5
- npm run typecheck
- npm run build
- npm run worker:validate
- node .\scripts\verify-turpial-oauth-vault.mjs
- node .\scripts\verify-turpial-facebook-vault.mjs

Discovery:
- Inspect publishing code and config in apps/worker.
- Inspect Turpial queue and drafts/assets under examples/tenants/turpial/content.
- Validate Facebook and Instagram connections through the existing encrypted vault verification scripts.
- List available drafts/assets and identify any missing or risky references.
- Recommend the safest first candidate for one-post publish.

Dry-run:
- Run dry-run only.
- Keep BOT_DRY_RUN=true and BOT_MODE=draft.
- Do not set HEPTACORE_ALLOW_REAL_PUBLISH for dry-run.
- Do not execute public publishing.

Output:
- Candidate post and rationale.
- Exact one-post publish command that Manuel could run later after explicit approval.
- Do not execute that command.
- Commit/push only docs or safe code changes if needed.
- Update docs/07_handoffs/S-HC-PUB-01_HANDOFF.md with results.

Hard stops:
- No real RRSS publishing.
- No campaign spend.
- No scraping.
- No credentials in git or chat.
- No Prisma/schema/auth/security changes without double lock.
- No Meta Developer setting changes.
```
