# HeptaCore Agent Operating Rules

## Paso 0 — Oreshnik Preflight (AUTOMATICO, obligatorio antes de tocar código)

Antes de cualquier implementación, SIEMPRE ejecutar:

```bash
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
```

Jean usa:

```bash
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Jean --desc "descripcion"
```

**Qué hace automáticamente el preflight (8 pasos):**

| Paso | Acción |
|---|---|
| 1/8 | **Auto-sync docs desde la MADRE más reciente** (Google Docs union merge — no pisa al otro operador) |
| 2/8 | Git fetch + verificar disponibilidad de la rama madre |
| 3/8 | Working tree: limpio para crear rama hija |
| 4/8 | Branch management: auto-crea `{Operador}/{sprint}-{desc}-{fecha}` si estás en rama madre |
| 5/8 | Zone check: detecta colisiones con zone-map.json |
| 6/8 | Secrets: bloquea si hay `.env` modificado |
| 7/8 | Build checks: package.json y Prisma schema presentes |
| 8/8 | Session ledger: registra inicio de sesión |

Si preflight reporta blockers, **PARAR y arreglar antes de editar código.**

## Trabajo en Rama Hija

- Código en zonas asignadas según `docs/07_handoffs/zone-map.json`
- Commits con prefijos convencionales: `feat(...):`, `fix(...):`, `docs(...):`
- Documentación se acumula en `docs/obsidian-vault/`

## Cierre de Sprint (AUTOMATICO — obligatorio al terminar)

```bash
npm run typecheck
npm run build
npm run worker:validate
npm run oreshnik:close -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
```

**Qué hace automáticamente el cierre:**

| Fase | Acción |
|---|---|
| A | Actualiza docs canónicos (Central, Plan Maestro) |
| B | Crea rama `MADRE/v{N+1}` con merge union de docs (no pisa al otro) |
| C | Escribe `var/sprint-events/{fecha}_{sprint}_CERRADO.json` |
| D | Commitea en rama hija y madre, empuja con `--push` |

Con `--push` solo cuando el cierre está revisado:

```bash
npm run oreshnik:close -- --sprint S-HC-XX --operator Manuel --desc "descripcion" --push
```

**El siguiente preflight del otro operador sincroniza automáticamente los docs desde la nueva MADRE (paso 1/8).**

## Branches

- Mother docs branches: `MADRE/v{N}-{sprint}-{desc}-{date}` (generadas por `close-sprint`)
- Manuel child branches: `Manuel/{sprint}-{desc}-{date}`
- Jean child branches: `Jean/{sprint}-{desc}-{date}`

No trabajar directo en rama madre salvo flujos Oreshnik de cierre/sync.

## Canonical Docs

- `docs/obsidian-vault/00_CENTRAL_HEPTACORE.md`
- `docs/obsidian-vault/SPRINTS/PLAN_MAESTRO_SPRINTS.md`
- `docs/obsidian-vault/PRODUCT/STATUS_BOARD.md`
- `docs/obsidian-vault/METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE.md`
- `docs/07_handoffs/zone-map.json`

## Hard Stops

- No real RRSS publishing.
- No campaign spend.
- No real scraping.
- No credentials in git.
- No Prisma/schema/auth/security changes without double lock.
- No sprint closure without vault updates.
