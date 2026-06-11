# Paid Ads Campaign Engine — Compliance & Hard Stops

> Sprint: S-HC-PROD-09 | Operator: Jean | Track: paid-growth

## Campaign Model

The `Campaign` model in Prisma schema supports the full paid ads lifecycle:

```
Campaign {
  platformBudget  Decimal    // Ad spend on platform (Meta, etc.)
  overheadRate    Decimal    // Default 0.35 (35% HeptaCore overhead)
  totalCharge     Decimal    // platformBudget * (1 + overheadRate)
  status          CampaignStatus  // PROPOSED → NEEDS_APPROVAL → APPROVED → ACTIVE
}
```

## Overhead Formula

```
HeptaCore Overhead = platformBudget * 0.35
Total Client Charge = platformBudget + overhead
```

Example: $500 platform budget → $175 overhead → $675 total client charge.

The 35% overhead covers:
- Strategy design and audience targeting
- Creative direction and asset preparation
- Scheduling, monitoring, and optimization
- Performance reporting and analytics
- Platform management and compliance

## Hard Stops

### 1. No Real Spend Without Explicit Approval
- Campaign status must pass through PROPOSED → NEEDS_APPROVAL → APPROVED before any spend
- Even with APPROVED status, `mode: "live"` is blocked: the processor returns error
- Real spend unlock requires:
  - Explicit code change (not just env vars)
  - Manuel's approval recorded in AuditLog
  - Production environment with real ad account credentials

### 2. Campaign Creation is Dry-Run by Default
- `--campaign-propose` creates campaigns with `mode: "dry-run"`
- All campaign proposals are stored with status PROPOSED
- No real API calls to Meta/Facebook Ads Manager
- AuditLog records every proposal with full breakdown

### 3. Budget Transparency
- Platform budget, overhead amount, overhead rate, and total charge are always visible
- Client sees: "Platform: $X | HeptaCore (35%): $Y | Total: $Z"
- No hidden fees or surcharges beyond the 35% overhead

### 4. Rollback Guarantee
- All campaign data is stored in PostgreSQL (not in Meta Ads Manager)
- Campaign proposals can be deleted without affecting any real ad account
- No real ad campaigns are created until explicit production unlock

## Audit Trail

Every campaign action generates an AuditLog entry:

| Action | Trigger | Metadata |
|---|---|---|
| `campaign_proposed` | Campaign created | name, network, budget, overhead, total, mode |
| `campaign_live_blocked` | Attempted live spend | reason, attemptedMode |
| `campaign_approved` | (future) Status → APPROVED | reviewer, timestamp |
| `campaign_activated` | (future) Status → ACTIVE | ad account details |

## Worker Integration

The campaign engine runs on the same BullMQ/Redis worker infrastructure:

```
Queue: heptacore-campaign
Processor: apps/worker/src/queue/campaign-processor.ts
CLI: npm run queue:dev -- --campaign-propose --tenant turpial-sound --budget 500
```

## No Real Spend Proof

1. `mode: "live"` is explicitly blocked in `processCampaign()`
2. No Meta Ads API client exists in the codebase
3. No ad account credentials exist in environment variables
4. `BOT_DRY_RUN=true` and `BOT_MODE=draft` are enforced at the worker config level
5. The `MockMetaAdapter` and `MockFacebookAdapter` only handle organic posts, not paid ads

**Conclusion: Real campaign spend is impossible from the current codebase.**
