# Turpial Import Plan

Turpial Sound / Turpial Marketplace has been imported as the first tenant seed:

```txt
examples/tenants/turpial/source-docs
examples/tenants/turpial/content
```

## Imported Material

- RRSS strategy docs.
- Brand voice and content pillars.
- Facebook and Instagram setup docs.
- 30-day calendar.
- Post, reel, story, and reply drafts.
- Asset inventory and validation reports.
- Publication queue and response rules.

## Mapping

- Source docs -> `Project.strategyBrief` and tenant memory.
- `content/inbox` -> `Asset`.
- `content/drafts` and `content/queue/publication-queue.json` -> `ContentDraft`.
- `response-rules.json` -> Response Agent tenant rules.
- Reports -> initial `Report` snapshots.

## Non-Coupling Rule

Turpial remains an example tenant. HeptaCore code must not import Turpial-specific paths except through configurable tenant seed/import scripts.
