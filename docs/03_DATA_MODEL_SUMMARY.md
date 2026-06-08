# Data Model Summary

Prisma schema lives at `packages/db/prisma/schema.prisma`.

Core entities:

- `Tenant`: client workspace and automation mode.
- `User` / `TenantMember`: roles per tenant, mapped to the existing `Membership` table for non-destructive evolution.
- `Invitation`: tenant-scoped user invitation with hashed invite token.
- `Project`: business/product/service definition.
- `ContentAsset`: media and documents, rights status included, mapped to the existing `Asset` table.
- `SocialAccount`: official network account connection.
- `OAuthCredential`: encrypted token material reference, mapped to the existing `CredentialVaultItem` table.
- `OAuthConnection`: tenant-scoped provider connection state for Facebook, Instagram and WhatsApp.
- `BrandProfile`: onboarding intake and durable brand context.
- `StrategyBrief`: draft strategy output per tenant.
- `ContentPillar`: tenant content pillars.
- `ContentPost`: posts/reels/stories/captions with approval status, mapped to the existing `ContentDraft` table.
- `ContentApproval`: human gates and decisions, mapped to the existing `Approval` table.
- `PublishingJob` / `PublishingResult`: traceable publish attempts and provider responses.
- `Interaction`: comments, DMs, questions, sentiment, suggested reply.
- `Campaign`: recommendation, platform spend, 35% overhead, approval status.
- `Lead`: lead source, score, consent status.
- `MetricSnapshot`: performance snapshots.
- `Report`: daily/weekly summaries.
- `AuditLog`: traceability of actions.

MVP uses one shared DB with strict tenant scoping. Dedicated DB per client is reserved for enterprise isolation.

OAuth tokens must be tenant-scoped. The current schema stores only encrypted token material references. Plaintext token storage is not a final architecture. Token persistence remains blocked until `ENCRYPTION_KEY` and a vault adapter are implemented and reviewed.
