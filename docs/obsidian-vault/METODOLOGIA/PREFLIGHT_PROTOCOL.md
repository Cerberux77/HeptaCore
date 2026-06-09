---
type: preflight-protocol
project: "HeptaCore"
last_updated: "2026-06-09"
tags:
  - "#preflight"
  - "#oreshnik"
---

# Preflight Protocol

## Purpose

Preflight is the inspection gate before task allocation or implementation. It checks whether the repo is safe enough for Oreshnik to issue an assignment packet.

## Checklist

| Check | Required inspection |
|---|---|
| Git status | `git status --short`, including untracked files |
| Branch | `git branch --show-current` and branch owner prefix |
| Recent commits | `git log --oneline -5` |
| Zone map | `docs/07_handoffs/zone-map.json` |
| Active sprint | prompt sprint, task board and last sprint event |
| Docs index | `docs/obsidian-vault/00_INDICE_MAESTRO.md` |
| Central state | `docs/obsidian-vault/00_CENTRAL_HEPTACORE.md` |
| Tenant state | tenant docs under `docs/obsidian-vault/TENANTS/` |
| Validation commands | typecheck, build, worker validate and task-specific checks |
| Risk class | low, medium, high, critical |
| Publish safety | real publish blocked unless explicit gate exists |

## Commands

```bash
npm run oreshnik:preflight -- --sprint S-HC-CTRL-02 --operator Manuel --desc "Make Oreshnik responsible for task allocation"
npm run oreshnik:assign -- --candidate S-HC-PUB-01 --owner Jean --dry-run
```

## Output

Preflight does not mean the developer may choose the task. Preflight prepares the state that Oreshnik uses to produce an assignment packet.

If blockers exist, Oreshnik must not assign implementation work.
