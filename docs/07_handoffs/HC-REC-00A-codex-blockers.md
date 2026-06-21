# Codex Promotion Final — S-HC-REC-00A (CLOSED)

Sprint: S-HC-REC-00A
Operator: Manuel
Branch: manuel/s-hc-rec-00a-ui-publishing-baseline

## Baseline

```text
Production baseline:
2fd9e24929ffe1022cf9521ed0f13888f30accbd

Branch:
manuel/s-hc-rec-00a-ui-publishing-baseline

Promotion:
PROMOTED (heptacore.vercel.app)

Public production:
https://heptacore.vercel.app (SHA 2fd9e249)

Oreshnik:
OPEN — cierre pendiente después de review canónico
```

## Status

```
S-HC-REC-00A
CODE_ZERO_P1_REVIEWED
DOCUMENTATION_NORMALIZED
AWAITING_STAGED_DEPLOYMENT_AND_DRY_RUN_QA
```

## State Machine (official)

```text
PublishingJob.SCHEDULED = pending future execution

PublishingJob.IN_REVIEW  = execution claimed / in-flight
                           or state requiring reconciliation

PublishingJob.PUBLISHED  = provider confirmed AND local transaction
                           Result → Draft → Job completed

PublishingJob.FAILED     = confirmed failure without external
                           publication evidence
```

### Mandatory rules

* Never use `PUBLISHED` as a claim.
* Cron claims `SCHEDULED → IN_REVIEW`.
* Immediate creates the job in `IN_REVIEW`.
* Never return to `SCHEDULED` after `providerConfirmed=true`.
* Never return to `APPROVED` after `providerConfirmed=true`.
* Never overwrite `PublishingResult.ok=true` with `false`.
* Never delete or clear `externalPostId`.

## Transactional Finalization

```text
Provider outside the transaction
→ provider returns externalPostId
→ commitConfirmedPublication()
→ Prisma $transaction:
   1. PublishingResult (monotonic: ok=true, externalPostId)
   2. ContentDraft PUBLISHED + externalPostId
   3. Verify returned records match expectations
   4. PublishingJob IN_REVIEW → PUBLISHED (LAST write)
→ AuditLog best-effort (outside transaction)
```

* `finalizeConfirmedPublicationTx` throws on any error — never catches.
* The catch is OUTSIDE `$transaction` in `commitConfirmedPublication`.
* If the transaction fails, full rollback — no partial Result/Draft commits.
* Job stays `IN_REVIEW`.
* Returns `LIVE_RECONCILIATION_REQUIRED`.
* Provider is never called again.

### Precondition

Job PUBLISHED uses `updateMany where {id, status: "IN_REVIEW"}`.
If `count !== 1` → throws → transaction rolls back.

## Reconciliation Contract

```json
{
  "ok": false,
  "providerConfirmed": true,
  "code": "LIVE_RECONCILIATION_REQUIRED",
  "status": "RECONCILIATION_REQUIRED",
  "draftId": "...",
  "externalPostId": "...",
  "error": "El proveedor confirmo la publicacion, pero HeptaCore no completo toda la persistencia.",
  "action": "No vuelva a publicar. El job permanece IN_REVIEW."
}
```

HTTP: `202 Accepted`

UI behavior: never marks PUBLISHED, shows warning, shows externalPostId, says "Do not republish", blocks retry during session.

## IN_REVIEW Runbook

### Case A — Result ok=true + externalPostId + incomplete Draft

Action:
1. Do NOT call provider.
2. Verify tenant, network, and IDs.
3. Complete local reconciliation from DB.
4. Finalize Draft and Job only when coherent.
5. Mark Job PUBLISHED at the end.

### Case B — Draft.externalPostId present + Result absent

Action:
1. Do NOT publish.
2. Verify provider manually and review logs.
3. Rebuild Result only with sufficient evidence.
4. Keep IN_REVIEW until resolved.

### Case C — No successful Result + no durable externalPostId

Action:
1. Do NOT requeue.
2. Do NOT auto-publish.
3. Review logs and provider.
4. Human decision.
5. Keep blocked until reconciled.

## Previous Functional Evidence

* Facebook dry-run and immediate verified from UI.
* Instagram dry-run and immediate verified from UI.
* externalPostId received and persisted.
* Posts visible on Turpial Sound Facebook and Instagram.
* Republicación blocked correctly.
* Instagram container readiness corrected (polling before publish).

Note: This evidence was obtained before the final hardening gates. Current HEAD requires new staged deployment and dry-run QA. No real publications will be repeated just to validate this recovery.

## Historical Deployments (obsolete for current HEAD)

| Deployment | Lineage |
|---|---|
| dpl_9ukgvjwgqu2U6Gqk8rH7fCyL6856 | B.2.4 Instagram fix (superseded) |
| dpl_5LwY9FoBZjS9D2u5mpi1rhq5NFJJ | B.3 durability (superseded) |

Were staged, were NOT promoted, do NOT represent `a574183`.
A new staged candidate will be created after documentation closure.

## P2 Risks (accepted, deferred)

| Risk | Target Sprint |
|---|---|
| Automatic reconciliation | S-HC-PROD-05 |
| Persistent worker / Redis | S-HC-PROD-05 |
| Instagram serverless deadline | S-HC-PROD-05 |
| Historical UI tests (simulated) | S-HC-PROD-06 |
| Complete transactional fake | S-HC-PROD-06 |
| Formal mutation testing | S-HC-PROD-06 |
| CRON_SECRET fallback | S-HC-PROD-06 |
| npm audit | S-HC-PROD-06 |
| Next.js lint | S-HC-PROD-06 |
| Helpers / asset lifecycle | Asset lifecycle sprint |
| Oreshnik task board | S-OR-REC-00B / S-HC-REC-00C |

## Multiformat Sprint (mandatory next)

**S-HC-PUB-02-MULTIFORMAT-PREVIEW**

Scope:
* Instagram Carousel
* Instagram Stories
* Required asset manifest
* Asset validation (count, format, aspect ratio)
* Visual dry-run per platform
* Instagram Feed preview
* Navigable Carousel preview
* Vertical Story preview
* Facebook preview
* Caption, order, crop, and safe area simulation
* Reuse idempotency and durable finalization

## Corrected Problems (historical — DO NOT USE)

* **Claim: SCHEDULED → PUBLISHED before provider** — FIXED. Claim now uses IN_REVIEW. PUBLISHED only after durable persistence.
* **Immediate marked PUBLISHED before persistence** — FIXED. Uses shared transactional service.
* **ok:true could be overwritten with false** — FIXED. Guards in all branches.
* **Catch inside $transaction callback** — FIXED. Catch in wrapper outside transaction.
* **HEAD 667437e** — OBSOLETE. Current HEAD is a574183.
* **State AWAITING_CODEX_FINAL_REVIEW_AFTER_B4B** — OBSOLETE.
