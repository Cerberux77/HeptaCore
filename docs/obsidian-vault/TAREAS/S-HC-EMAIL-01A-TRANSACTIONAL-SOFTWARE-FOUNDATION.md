<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-EMAIL-01A-TRANSACTIONAL-SOFTWARE-FOUNDATION"
sprint: "email-infra"
status: "ready_for_integration"
owner: "Manuel"
last_updated: "2026-09-11T01:27:05.686Z"
source: "var/oreshnik/tasks/S-HC-EMAIL-01A-TRANSACTIONAL-SOFTWARE-FOUNDATION.json"
---

# Task S-HC-EMAIL-01A-TRANSACTIONAL-SOFTWARE-FOUNDATION

## Scope

Transactional email deterministic readiness software foundation

## Runtime

- estado: `ready_for_integration`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `1`
- handoff: docs/oreshnik/handoffs/S-HC-EMAIL-01A-TRANSACTIONAL-SOFTWARE-FOUNDATION/handoff-20260911T000224649Z-9f86b3db5db1.md

## Dependencias

- Ninguna

## Zonas

### Compat

- `packages/core/src/email-readiness.ts`
- `packages/core/src/__tests__/email-readiness.test.ts`
- `packages/core/src/index.ts`
- `apps/web/app/api/email/readiness/route.ts`
- `docs/operations/EMAIL_TRANSACTIONAL_READINESS.md`

### Read

- `apps/web/app/api/webhooks/resend`
- `apps/web/lib/email`
- `.env.example`

### Write

- `packages/core/src/email-readiness.ts`
- `packages/core/src/__tests__/email-readiness.test.ts`
- `packages/core/src/index.ts`
- `apps/web/app/api/email/readiness/route.ts`
- `docs/operations/EMAIL_TRANSACTIONAL_READINESS.md`

## Aceptacion

- Deterministic email readiness contract is present in @heptacore/core and exported.
- SUPER_ADMIN-only /api/email/readiness endpoint evaluates Resend domain and DMARC state without exposing secret material.
- Automated tests cover development test-sender mode, invalid Vercel sender identity, custom-domain verification and production fail-closed behavior.
- Operational documentation distinguishes deterministic software readiness from external production-domain activation.
- No domain, DNS record, Resend credential or production activation is invented or claimed by this child Task.
- typecheck, build, worker validation and full repository tests pass.

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| run-manuel-S-HC-EMAIL-01A-TRANSACTIONAL-SOFTWARE-FOUNDATION-20260911000149-407e2085 | manuel | shell | ready_for_integration | released | dispatch/manuel/manuel-chatgpt1/email-infra/S-HC-EMAIL-01A-TRANSACTIONAL-SOFTWARE-FOUNDATION/afe65dfa54 |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->