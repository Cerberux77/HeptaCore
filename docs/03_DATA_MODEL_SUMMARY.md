# Data Model Summary

Prisma schema lives at `packages/db/prisma/schema.prisma`.

Core entities:

- `Tenant`: client workspace and automation mode.
- `User` / `Membership`: roles per tenant.
- `Project`: business/product/service definition.
- `Asset`: media and documents, rights status included.
- `SocialAccount`: official network account connection.
- `CredentialVaultItem`: encrypted token material reference.
- `ContentDraft`: posts/reels/stories/captions with approval status.
- `Approval`: human gates and decisions.
- `Interaction`: comments, DMs, questions, sentiment, suggested reply.
- `Campaign`: recommendation, platform spend, 35% overhead, approval status.
- `Lead`: lead source, score, consent status.
- `MetricSnapshot`: performance snapshots.
- `Report`: daily/weekly summaries.
- `AuditLog`: traceability of actions.

MVP uses one shared DB with strict tenant scoping. Dedicated DB per client is reserved for enterprise isolation.
