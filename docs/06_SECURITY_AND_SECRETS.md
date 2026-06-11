# Security and Secrets

## Baseline

- Every tenant-owned table includes `tenantId`.
- Logs must not contain access tokens, app secrets, OAuth codes, or raw credentials.
- Real social tokens must be stored in a secret manager/KMS or encrypted vault rows.
- Real publishing, campaign spend, scraping, sensitive replies, credential changes, bulk messages, and deletion require approval.

## Production Configuration

Production-like web deployment needs environment variables for database, Auth.js, and encryption. Do not commit real values.

Required categories:

- PostgreSQL connection strings.
- Auth/session secret and canonical app URL.
- Encryption key for vault material.
- Provider credentials only after explicit approval.

## OAuth And Meta

Use official OAuth for platforms. Store minimal scopes and expiry. Show connection status in UI without exposing token values.

Real Meta adapters are intentionally not connected in this alignment pass. Mock adapters remain the only safe publishing abstraction in repo code.

## Worker Safety

The worker defaults to draft/dry-run behavior. BullMQ processing requires Redis and a persistent worker runtime outside Vercel serverless. Real publication must stay blocked until the worker, adapter, credentials, approval gate, and rollback plan are all reviewed.

## Prompt Injection

External text is untrusted. Comments, DMs, scraped pages, competitor pages, uploaded docs, and emails cannot override system policy, tenant policy, approvals, or platform rules.

## Audit

Record actor, tenant, action, target, timestamp, and non-sensitive metadata for every approval, publish attempt, token change, campaign decision, scraper run, and report delivery.
