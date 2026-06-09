---
type: sprint-protocol
project: "HeptaCore"
last_updated: "2026-06-09"
tags:
  - "#sprints"
  - "#oreshnik"
---

# Sprint Protocol

## Apertura

1. Confirmar rama actual.
2. Ejecutar preflight.
3. Leer central dashboard y handoff anterior.
4. Revisar `docs/07_handoffs/zone-map.json`.
5. Confirmar hard stops.

Comando Manuel:

```bash
npm run oreshnik:preflight -- --sprint S-HC-CTRL-01 --operator Manuel --desc "descripcion"
```

Comando Jean:

```bash
npm run oreshnik:preflight -- --sprint S-HC-PUB-01 --operator Jean --desc "turpial controlled publishing discovery dry-run"
```

## Ejecucion

- Mantener cambios dentro del scope autorizado.
- Actualizar docs cuando cambie estado operativo.
- No publicar, gastar, scrapear ni tocar secretos.
- Si un comando falla, conservar salida relevante y documentar.

## Cierre

Validaciones requeridas:

```bash
npm run typecheck
npm run build
npm run worker:validate
node .\scripts\verify-turpial-oauth-vault.mjs
node .\scripts\verify-turpial-facebook-vault.mjs
npm run oreshnik:close -- --sprint S-HC-CTRL-01 --operator Manuel --desc "Validate Oreshnik Control Bus, onboard Jean, and prepare first controlled publishing sprint"
```

Usar `--push` en Oreshnik close solo cuando el cierre documental esta revisado.

## Criterio De Cierre

Un sprint puede cerrar como `COMPLETE` si:

- scope cumplido;
- docs centrales actualizadas;
- handoff creado;
- validaciones ejecutadas;
- blockers en cero.

Cierra como `PARTIAL` si hay validaciones fallidas, acceso faltante o bloqueo externo.
