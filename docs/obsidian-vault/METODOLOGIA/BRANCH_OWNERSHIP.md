---
type: branch-ownership
project: "HeptaCore"
last_updated: "2026-06-09"
tags:
  - "#branches"
  - "#locks"
  - "#manuel"
  - "#jean"
---

# Branch Ownership

## Convenciones

| Owner | Patron |
|---|---|
| Manuel | `Manuel/s-hc-<sprint>-<scope>-YYYY-MM-DD` |
| Jean | `Jean/s-hc-<sprint>-<scope>-YYYY-MM-DD` |
| Madre docs | `MADRE/vN-sprint-desc-date` |

Ejemplo Jean:

```bash
git checkout -b Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09
```

## Cuando Crear Rama

- Antes de editar si no estas en tu rama hija.
- Al iniciar un sprint nuevo.
- Si el trabajo cambia de owner.
- Nunca para publicar real sin sprint y gate humano.

## Cuando Mergear

- Despues de typecheck/build/worker validate.
- Despues de handoff y central docs actualizadas.
- Despues de revisar que no se agregaron secretos.
- Para ramas madre, solo por flujo Oreshnik close/sync.

## Archivos Que Requieren Coordinacion

- `packages/db/**`
- `packages/integrations/**`
- `apps/web/app/api/oauth/**`
- `apps/worker/src/publisher.mjs`
- `apps/worker/src/meta-readiness.mjs`
- `package.json`
- `package-lock.json`
- `docs/obsidian-vault/00_CENTRAL_HEPTACORE.md`
- `docs/obsidian-vault/SPRINTS/PLAN_MAESTRO_SPRINTS.md`
- `docs/07_handoffs/zone-map.json`

## Zonas Prohibidas En S-HC-CTRL-01

- No cambiar Prisma schema, migrations ni auth.
- No cambiar vault encryption/token handling.
- No cambiar Meta Developer settings.
- No tocar tokens, env vars productivas ni blobs descifrados.
- No modificar contenido Turpial salvo documentar estado.
- No publicar en RRSS.

## Evitar Solapamiento

1. Cada operador declara sprint y branch en el handoff.
2. Cada agente reporta archivos tocados.
3. Si un archivo compartido se edita, el handoff debe explicar por que.
4. Jean no trabaja sobre una rama de Manuel.
5. Manuel no edita ramas `Jean/*` salvo merge/review explicito.
