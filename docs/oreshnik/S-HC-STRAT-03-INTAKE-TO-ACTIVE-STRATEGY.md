# Oreshnik Goal — S-HC-STRAT-03-INTAKE-TO-ACTIVE-STRATEGY

## Execution profile

- **Priority:** critical
- **Track:** strategy
- **Human owner:** Manuel
- **Harness:** Codex, resolved by Oreshnik; never hardcode an agent instance
- **Preferred profile where selectable:** `gpt-5.6-sol`, reasoning `extra_high`
- **Codex Cloud fallback:** use the platform-selected model when the cloud task does not expose a model override; preserve the full acceptance contract and do not reduce scope silently
- **Evidence:** code + integration + UI
- **Terminal state:** `READY_FOR_MANUAL_QA`

## Problem statement

The Strategy screen does not currently implement the product workflow it communicates:

1. `Estrategia activa` is primarily an editable project profile, not a persisted generated strategy.
2. The generator does not receive the current unsaved form state; it reloads partial database context.
3. The backend hardcodes a generic market and may fall back to a general audience, producing incorrect positioning for specialized tenants.
4. The generated result is ephemeral and is rendered as raw JSON. Reloading loses it.
5. The current structured output is too shallow: it cannot represent exact local publication time, complete copy, speech, shot list, asset specification, KPI, hypothesis or funnel stage.
6. There is no explicit lifecycle for strategy draft, review, approval, activation and regeneration.
7. Activating a strategy does not transactionally create or update content pillars, platform-specific drafts, exact scheduled dates, calendar items and the missing-asset checklist.
8. A deterministic fallback can appear as if a real LLM strategy was produced unless the operator inspects the provider label.

The correction must make HeptaCore perform the intake, generate the strategy, preserve it, present it for human review, and apply the approved plan to the tenant without requiring the customer to paste a finished strategy into `Oferta / Descripción`.

## Required user workflow

Implement this end-to-end flow:

1. Open **Estrategia**.
2. Complete or edit a dedicated **Intake del negocio**.
3. Save the intake or generate directly from the current validated form state.
4. Generate a **strategy draft** using the selected networks and tenant timezone.
5. Show a human-readable preview by sections, not raw JSON as the principal UI.
6. Persist the generated strategy so it survives reload and can be audited.
7. Allow **Regenerar**, **Guardar borrador**, **Aprobar y activar**, and **Cancelar cambios**.
8. On activation, transactionally materialize the approved strategy into pillars, platform-specific drafts, scheduled dates/calendar and asset requirements.
9. Never publish live as part of this flow.

## Intake contract

The intake must contain explicit, validated fields for:

- Project/business name.
- Product or service description.
- Offer and value proposition.
- Market/category/industry.
- Primary audience.
- Secondary audience.
- Geography/markets served.
- Primary business objective.
- Primary conversion action.
- Brand voice.
- Content constraints and prohibited claims.
- Preferred networks.
- Tenant IANA timezone.
- Strategy horizon, default four weeks.
- Campaign/start date.
- Available assets or asset-library context.

The generator must consume the exact validated intake submitted by the UI. It must not replace explicit values with hardcoded `social media marketing`, `general audience`, or stale database values.

## Strategy output contract

Define a strict shared schema and validate every LLM response before persistence. The strategy must include at least:

### Strategy-level fields

- Stable strategy ID and version.
- Title and executive summary.
- Business goals.
- Positioning: offer, differentiator, promise, reasons to believe.
- Primary and secondary audience.
- Funnel design.
- Narrative and content pillars.
- Channel strategy with priority, role, cadence and formats.
- Four-week horizon and timezone.
- Consolidated asset checklist.
- Generation provider/model metadata and fallback status.
- Draft/review/active lifecycle status.

### Publication-level fields

Each planned publication must include:

- Stable item ID.
- Network.
- Platform-native format: Story, Reel, Feed, Carousel, Short, long video, text or other supported format.
- Funnel stage and objective.
- Content pillar.
- Target audience segment.
- Exact local date.
- Exact local time.
- IANA timezone.
- UTC instant derived safely from the local schedule.
- Title.
- Hook.
- Complete copy/caption.
- Complete speech or script when audiovisual.
- On-screen text.
- Shot list or slide-by-slide outline.
- CTA.
- Hashtags.
- Alt text/accessibility notes.
- Required asset list.
- Asset technical specifications: type, aspect ratio, resolution and duration where applicable.
- Primary KPI.
- Secondary KPI.
- Hypothesis being tested.
- Approval requirement.

Do not silently discard fields when validating model output. Invalid responses must fail safely or enter an explicitly labeled deterministic fallback path.

## Persistence and lifecycle

Use existing persistence capabilities before proposing any database migration. The repository already has JSON-capable Project and StrategyBrief fields. A Prisma schema change is outside the default scope and requires an explicit Oreshnik double lock plus a written demonstration that existing models cannot satisfy the contract.

Required lifecycle:

- `DRAFT`: generated and persisted, not applied.
- `IN_REVIEW`: presented for human review.
- `ACTIVE`: approved version applied to tenant planning.
- A new generation creates a new version; it does not silently overwrite the active version.
- Preserve provider, model, generation time, input digest and output digest for auditability.

The active strategy and its source intake must survive page reload, logout/login and normal deployment restarts.

## Transactional activation

`Aprobar y activar` must be idempotent and transactional:

1. Validate tenant access and lifecycle.
2. Validate strategy schema and version.
3. Persist the approved StrategyBrief/version.
4. Upsert the intended ContentPillars without deleting unrelated historical data.
5. Create or reconcile ContentDraft rows for each planned publication.
6. Store `scheduledFor` as the correct UTC instant derived from local date/time plus IANA timezone.
7. Mark generated drafts with a stable source/version relationship using existing fields or an existing JSON container.
8. Persist the asset checklist/requirements in an existing strategy JSON container and expose it to the UI.
9. Commit all mutations or none.
10. A repeated activation of the same version must create zero duplicate pillars and zero duplicate drafts.

If the current schema cannot represent an essential relation without unsafe string conventions, stop at a documented design decision and request the required double lock rather than changing Prisma implicitly.

## UI requirements

Replace the ambiguous composition with clearly separated panels:

### Intake del negocio

Editable structured fields with validation, unsaved-change indication and saved timestamp.

### Generar estrategia con IA

- Selected networks.
- Timezone and start date.
- Provider/model status without exposing credentials.
- Cost estimate where already supported.
- Generate button disabled until required intake is valid.
- Visible warning when deterministic mode is selected.

### Borrador de estrategia

Human-readable sections for positioning, audience, goals, pillars, channels, calendar and assets. Raw JSON may remain only as a secondary diagnostic view.

### Estrategia activa

Show the approved version, activation timestamp, provider, horizon and counts of pillars, publications and missing assets.

### Actions

- Guardar intake.
- Generar estrategia.
- Guardar borrador.
- Regenerar nueva versión.
- Aprobar y activar.
- Cancelar cambios.

Destructive replacement of an active strategy requires explicit confirmation.

## Provider and secret handling

- Do not persist API keys in browser state beyond the current configuration mechanism.
- Prefer the existing tenant/admin LLM configuration and server-side secret handling.
- Never return a credential in API responses, logs, audit metadata, fixtures or screenshots.
- Clearly display the effective provider/model and whether a deterministic fallback occurred.
- A fallback must not be presented as an LLM-generated result.

## Compatibility and non-goals

Preserve:

- Tenant isolation.
- Canonical TEN-02A role/access rules.
- Existing Meta and YouTube publishing behavior.
- Existing drafts and asset library.
- Dry-run and preview semantics.

Out of scope:

- Live publishing.
- OAuth/provider connection changes.
- Campaign spend.
- Analytics ingestion.
- Production deployment.
- Broad dashboard redesign unrelated to Strategy.

## Required tests

Add focused tests that prove:

1. The API receives and uses the exact current intake values.
2. No hardcoded market or generic audience replaces explicit intake.
3. The strict output schema accepts valid complete strategies and rejects malformed items.
4. Generated drafts persist and survive reload.
5. Effective provider/model and deterministic fallback are distinguishable.
6. Activation creates the expected StrategyBrief, pillars and drafts.
7. Repeating activation for the same version is idempotent.
8. A mid-activation failure rolls back all writes.
9. Local date/time plus IANA timezone produces the correct UTC schedule, including daylight-saving boundaries where applicable.
10. A user from another tenant cannot read, generate, approve or activate the strategy.
11. Unauthorized roles are rejected according to the canonical role model.
12. Strategy generation and activation make zero social-provider publishing calls.
13. Existing strategy-related behavior remains backward compatible or is migrated explicitly.
14. The UI exposes the complete workflow and does not rely on raw JSON as the primary representation.

Browser automation is allowed only if required for evidence, with bounded scope, explicit timeout and limited attempts. Prefer focused component/integration tests and one bounded end-to-end happy path rather than repeated browser loops.

## Acceptance criteria

The Goal is accepted only when all conditions hold:

- A tenant can enter a structured intake without pasting a finished marketing strategy.
- Generation uses the exact current intake, selected networks, timezone and start date.
- A four-week, platform-specific strategy with exact publication times and complete briefs is generated under a strict schema.
- The strategy is persisted and remains visible after reload.
- Human review and explicit activation exist.
- Activation materializes pillars, calendar-ready drafts and asset requirements transactionally.
- Activation is idempotent.
- Provider/model/fallback state is unambiguous.
- No live publication or campaign spend occurs.
- No schema/auth/security change occurs without the required double lock.
- Focused tests and all repository gates pass.
- A handoff documents architecture, changed files, migrations if any, tests, residual risks and exact manual QA steps.

## Execution sequence for Codex

1. Read `AGENTS.md`, this Goal and the cloud request manifest.
2. Run `npm run oreshnik:ready`.
3. Use the installed Oreshnik CLI to register/inject this request canonically; do not hand-edit task-board runtime state, Runs, claims or assignments.
4. Enter through `oreshnik goal --harness codex --repo . --json`; use the exact worktree, branch and zones returned by Oreshnik.
5. Inspect the current implementation and tests before proposing architecture.
6. Record a concise implementation plan in the assigned Goal/Run evidence.
7. Implement progressively; use focused tests during development.
8. Run the complete gates once at the terminal validation stage, correcting real blockers without repetitive audit loops.
9. Persist integration and UI evidence plus the handoff.
10. Advance the same Run to the correct ready-for-integration/manual-QA state. Do not manufacture evidence or declare Production success.

## Gates

- `npm run oreshnik:ready`
- Focused strategy/intake tests
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run worker:validate`
- `oreshnik reconcile --check --json`
- `git diff --check`

## Required final report

The final handoff must state:

- The effective intake contract.
- The persisted strategy/version model.
- The activation transaction and idempotency mechanism.
- Timezone conversion method.
- Provider/fallback behavior.
- Files changed.
- Tests and gates with results.
- Whether Prisma/auth/security remained unchanged.
- Exact manual QA steps for the Preview tenant.
- Remaining external blockers.

Do not close this Goal as Production-ready. The maximum terminal declaration is `READY_FOR_MANUAL_QA` until Manuel validates the complete flow in Preview.
