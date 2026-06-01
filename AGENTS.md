# HeptaCore Agent Operating Rules

## Paso 0 - Oreshnik Preflight

Before starting implementation work, run:

```bash
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
```

Jean uses:

```bash
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Jean --desc "descripcion"
```

If preflight reports blockers, stop and fix them before editing.

## Closing

Before closing a sprint:

```bash
npm run typecheck
npm run build
npm run worker:validate
npm run oreshnik:close -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
```

Use `--push` only when the documentation closure is reviewed and ready to share:

```bash
npm run oreshnik:close -- --sprint S-HC-XX --operator Manuel --desc "descripcion" --push
```

## Branches

- Mother docs branches: `MADRE/vN-sprint-desc-date`
- Manuel child branches: `Manuel/sprint-desc-date`
- Jean child branches: `Jean/sprint-desc-date`

Do not work directly on the mother branch except through Oreshnik close/sync flows.

## Canonical Docs

- `docs/obsidian-vault/00_CENTRAL_HEPTACORE.md`
- `docs/obsidian-vault/SPRINTS/PLAN_MAESTRO_SPRINTS.md`
- `docs/obsidian-vault/METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE.md`
- `docs/07_handoffs/zone-map.json`

## Hard Stops

- No real RRSS publishing.
- No campaign spend.
- No real scraping.
- No credentials in git.
- No Prisma/schema/auth/security changes without double lock.
- No sprint closure without vault updates.
