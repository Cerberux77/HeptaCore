---
type: methodology
project: "HeptaCore"
fecha: "2026-06-01"
actualizado: "2026-06-01T00:00:00.000Z"
methodology: "Oreshnik HeptaCore v1.0"
tags:
  - "#methodology"
  - "#oreshnik"
  - "#manuel"
  - "#jean"
---

# Metodologia Oreshnik HeptaCore

## Objetivo

Mantener a Manuel y Jean trabajando en paralelo sin perder estado, documentacion ni trazabilidad. El resultado esperado es similar a Google Docs en terminos operativos: la rama madre conserva la documentacion integrada mas reciente de ambos, mientras cada operador trabaja en su rama hija.

## Principio

Git es la fuente de verdad. Obsidian es la interfaz. Oreshnik automatiza preflight, control de zonas, cierre, eventos y actualizacion del vault.

## Flujo

```txt
Abrir sesion
  -> preflight
  -> sync docs desde madre
  -> crear/validar rama hija
  -> ejecutar sprint
  -> actualizar docs
  -> validar
  -> close-sprint
  -> registrar evento
  -> crear nueva madre docs
```

## Comandos

```bash
npm run oreshnik:status
npm run oreshnik:preflight -- --sprint S-HC-01 --operator Manuel --desc "console-onboarding"
npm run oreshnik:zone -- --sprint S-HC-01
npm run oreshnik:close -- --sprint S-HC-01 --operator Manuel --desc "console-onboarding"
```

Usar `--push` en `close-sprint` solo cuando el cierre este revisado:

```bash
npm run oreshnik:close -- --sprint S-HC-01 --operator Manuel --desc "console-onboarding" --push
```

## Contrato Anti-Pisada

1. Nadie trabaja directo en madre salvo cierre documental controlado.
2. Cada sprint tiene owner unico.
3. Las zonas compartidas requieren coordinacion explicita.
4. `packages/db/prisma/schema.prisma` requiere lock doble Manuel + Jean.
5. `docs/obsidian-vault` se fusiona con merge documental, no con reemplazo destructivo.
6. Si ambos editan la misma seccion y no se puede fusionar, se bloquea el cierre.
7. El codigo de producto no se integra automaticamente a madre docs; se integra por merge/review normal.

## Stop Conditions

- Secretos en diff.
- Cambio de Prisma schema sin lock doble.
- Publicacion real o gasto real sin aprobacion.
- Scraping real sin aprobacion.
- Build roto.
- Typecheck roto.
- Worker publica fuera de dry-run.
- Conflicto de zona con el otro operador.
- Vault central desactualizado al cierre.
- Sprint sin owner o sin criterio de cierre.

## Reparto Inicial Sugerido

| Track | Manuel | Jean |
|---|---|---|
| Producto/agentes | Strategy, prompts, UX, landing | Arquitectura de runtime y validacion |
| DB/backend | Modelo funcional y seeds | Prisma/Auth/seguridad |
| Worker | RRSS pipeline y drafts | Queue/jobs/retries |
| Frontend | Landing, console UX | Componentizacion, dashboard |
| QA/docs | Vault, Oreshnik, runbooks | Validacion independiente |
