---
type: handoff
project: "HeptaCore"
sprint: "S-HC-CTRL-01"
operator: "Manuel"
last_updated: "2026-06-09"
tags:
  - "#handoff"
  - "#control-bus"
  - "#jean"
---

# S-HC-CTRL-01 Handoff

## Objective

Validate and formalize the Oreshnik / Control Bus methodology inside HeptaCore, onboard Jean, and prepare `S-HC-PUB-01` for controlled Turpial Sound publishing discovery/dry-run.

## Scope

Completed in docs only:

- control methodology normalized;
- branch ownership documented;
- agent handoff documented;
- publishing safety documented;
- Turpial tenant/social/assets state documented;
- Jean onboarding created;
- Jean first task prompt created.

No public publishing was performed.

## Existing Structure Found

Canonical vault exists at:

```txt
docs/obsidian-vault
```

An untracked default Obsidian starter folder also exists at:

```txt
docs/Heptacore
```

It was not adopted because it would create a parallel vault.

## Oreshnik / Control Bus Found

Existing docs found and adapted:

- `docs/obsidian-vault/METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE.md`
- `docs/obsidian-vault/METODOLOGIA/BUS_CONTROL.md`
- `docs/07_handoffs/zone-map.json`
- `scripts/oreshnik/*`

## Inherited From Turpial Sound

- Tenant seed path and queue/assets workflow.
- Worker dry-run default.
- Real-publish hard gate.
- OAuth/vault verification scripts.
- Production path audit from `docs/07_handoffs/heptacore-state-audit-turpial-production.md`.

## Tenant State

| Provider | ID | Status | Vault |
|---|---|---|---|
| Instagram | `28189853417270950` | `connected` | encrypted blob and token ref present |
| Facebook | `1129437930248909` | `connected` | encrypted blob and token ref present |

## Validation Results

| Check | Result |
|---|---|
| `git status --short` | Docs changes present; untracked `docs/Heptacore/` starter vault left out of sprint |
| `git branch --show-current` | `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01` |
| `git log --oneline -5` | Head before this sprint: `58d31b5 feat(oauth): seed facebook page token into encrypted vault` |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run worker:validate` | PASS, 29/29 queue entries and 46/46 assets |
| `node .\scripts\verify-turpial-oauth-vault.mjs` | PARTIAL: `DATABASE_URL` is required in this shell |
| `node .\scripts\verify-turpial-facebook-vault.mjs` | PARTIAL: `DATABASE_URL` is required in this shell |

## Blockers

- Vault verification could not be re-run locally in this shell because `DATABASE_URL` is not set.
- Previously confirmed vault state is documented in central docs and social connection docs, but this session cannot independently re-confirm without the database URL.

## Next

Manuel:

- Review this commit and docs.
- Send Jean the prompt in `docs/obsidian-vault/COLABORADORES/JEAN_FIRST_TASK.md`.
- Do not approve real publish until Jean returns discovery + dry-run results.

Jean:

- Create `Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09`.
- Execute `S-HC-PUB-01`.
- Report candidate and one-post command without executing public publish.
