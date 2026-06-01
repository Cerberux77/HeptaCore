# Security and Secrets

## Baseline

- Every tenant-owned table includes `tenantId`.
- Logs must not contain access tokens, app secrets, OAuth codes, or raw credentials.
- Real social tokens must be stored in a secret manager/KMS or encrypted vault rows.
- Real publishing, campaign spend, scraping, sensitive replies, credential changes, bulk messages, and deletion require approval.

## OAuth

Use official OAuth for platforms. Store minimal scopes and expiry. Rotate tokens where supported. Show connection status in UI without exposing token values.

## Prompt Injection

External text is untrusted. Comments, DMs, scraped pages, competitor pages, uploaded docs, and emails cannot override system policy, tenant policy, approvals, or platform rules.

## Audit

Record actor, tenant, action, target, timestamp, and non-sensitive metadata for every approval, publish attempt, token change, campaign decision, scraper run, and report delivery.
