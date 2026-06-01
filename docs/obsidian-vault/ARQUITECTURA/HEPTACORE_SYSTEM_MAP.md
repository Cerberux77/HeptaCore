---
type: architecture-map
project: "HeptaCore"
last_updated: "2026-06-01T00:00:00.000Z"
tags:
  - "#architecture"
---

# HeptaCore System Map

## Monorepo

| Path | Rol |
|---|---|
| `apps/web` | Landing y futura consola SaaS |
| `apps/worker` | Worker RRSS tenant-aware |
| `packages/agents` | Nucleo de agentes |
| `packages/core` | Tipos, guardrails, approval rules |
| `packages/db` | Prisma schema |
| `packages/integrations` | Contratos APIs RRSS |
| `packages/ui` | Tokens UI |
| `examples/tenants/turpial` | Tenant demo importado |
| `docs/obsidian-vault` | Estado operacional compartido |

## Flujo del Bot

```txt
Client intake
  -> Strategy Agent
  -> Network priority
  -> Asset checklist
  -> Draft Factory
  -> Approval Queue
  -> Worker/API adapter
  -> Metrics
  -> Report Agent
```
