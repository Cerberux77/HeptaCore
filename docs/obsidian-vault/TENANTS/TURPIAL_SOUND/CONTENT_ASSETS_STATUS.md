---
type: content-assets-status
project: "HeptaCore"
tenant: "turpial-sound"
last_updated: "2026-06-09"
tags:
  - "#assets"
  - "#queue"
  - "#turpial"
---

# Turpial Sound Content Assets Status

## Inventario Actual

| Area | Estado |
|---|---|
| Queue | `examples/tenants/turpial/content/queue/publication-queue.json` |
| Drafts | `examples/tenants/turpial/content/drafts` |
| Inbox assets | `examples/tenants/turpial/content/inbox` |
| Worker validate | debe confirmar 29/29 queue y 46/46 assets |

## Drafts Por Tipo

| Tipo | Cantidad |
|---|---:|
| Facebook | 10 |
| Instagram | 10 |
| Reels | 5 |
| Stories | 5 |
| Replies | 5 |

## Cola

Estado documentado desde auditoria Turpial:

- Total cola: 29.
- Drafts: 28.
- Ready: 1.
- Requieren criterio humano: 9.
- Instagram: 19.
- Facebook: 10.
- Formatos: 14 feed, 4 reel, 6 carousel, 5 story.

## Nota De Riesgo

La cola local contiene un `ig_post_01` marcado `ready` y con `publishedAt` de dry-run previo. Si Oreshnik asigna S-HC-PUB-01, Jean debe tratarlo como dato historico local y confirmar estado real antes de recomendar cualquier candidato.
