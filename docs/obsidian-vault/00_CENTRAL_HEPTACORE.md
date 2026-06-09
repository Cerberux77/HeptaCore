---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "Control Bus validated, Turpial Sound social vault connected, publishing held"
last_updated: "09/06/26 13:15"
mother_branch: "MADRE/v5-s-hc-ctrl-01-validate-oreshnik-control-bus-onboard-jean-and-p-2026-06-09"
current_branch: "Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01"
tags:
  - "#central"
  - "#status/live-source"
  - "#manuel"
  - "#jean"
  - "#heptacore"
  - "#control-bus"
---

# HeptaCore - Central Dashboard

> Documento canonico. Si hay conflicto entre documentos, este manda hasta que se cierre un sprint con Oreshnik.

## Estado de Produccion

| Area | Estado |
|---|---|
| HeptaCore Production | Activo |
| Production URL | `https://heptacore.vercel.app` |
| Tenant piloto | `turpial-sound` |
| Publicacion RRSS real | Bloqueada hasta aprobacion explicita de Manuel |
| Sprint actual | `S-HC-CTRL-01` |
| Rama actual | `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01` |

## Tenant Turpial Sound

| Campo | Valor |
|---|---|
| Slug | `turpial-sound` |
| Nombre | Turpial Sound |
| Estado | Tenant seed operativo y conectado a vault OAuth cifrado |
| Cola local | `examples/tenants/turpial/content/queue/publication-queue.json` |
| Assets locales | `examples/tenants/turpial/content/inbox` |
| Plan de primer test | [[TENANTS/TURPIAL_SOUND/FIRST_PUBLISHING_TEST_PLAN]] |

## Conexiones Sociales Verificadas

| Provider | ID | Estado | Vault |
|---|---|---|---|
| Instagram | `28189853417270950` | `connected` | `encryptedBlobPresent=true`, `tokenRefPresent=true` |
| Facebook | `1129437930248909` | `connected` | `encryptedBlobPresent=true`, `tokenRefPresent=true` |

Comandos verificados:

```bash
node .\scripts\verify-turpial-oauth-vault.mjs
node .\scripts\verify-turpial-facebook-vault.mjs
```

Ambos deben devolver `ok: true`, `found: true`, `status: connected`, `encryptedBlobPresent: true`, `tokenRefPresent: true`.

## Indice Oreshnik / Control Bus

- [[METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE]] - metodologia operativa completa.
- [[METODOLOGIA/BUS_CONTROL]] - capas, locks, gates y stop criteria.
- [[METODOLOGIA/SPRINT_PROTOCOL]] - apertura, ejecucion y cierre de sprint.
- [[METODOLOGIA/BRANCH_OWNERSHIP]] - convenciones de ramas y zonas de coordinacion.
- [[METODOLOGIA/AGENT_HANDOFF_PROTOCOL]] - protocolo de handoff entre humanos y agentes.
- [[METODOLOGIA/PUBLISHING_SAFETY_PROTOCOL]] - protocolo de seguridad para publicaciones.
- `docs/07_handoffs/zone-map.json` - mapa de zonas y locks.

## Jean

| Documento | Uso |
|---|---|
| [[COLABORADORES/ESTADO_JEAN]] | Estado vivo de Jean |
| [[COLABORADORES/JEAN_ONBOARDING]] | Onboarding y setup |
| [[COLABORADORES/JEAN_FIRST_TASK]] | Prompt listo para S-HC-PUB-01 |

## Siguiente Sprint Controlado

| Sprint | Owner | Scope | Estado |
|---|---|---|---|
| `S-HC-PUB-01` | Jean | Turpial Sound first controlled publishing test: discovery + dry-run + comando preparado | Preparado, sin publicar |

## Reglas Activas

- No publicar en redes reales desde HeptaCore en `S-HC-CTRL-01`.
- No pedir ni commitear credenciales reales.
- No scraping real, gasto de campanas, DM masivo ni cambios de Meta Developer settings.
- No modificar Prisma, auth, security ni vault adapters sin doble lock Manuel + Jean.
- No cerrar sprint sin actualizar vault, handoff y validaciones.
- No trabajar directo en ramas madre salvo flujos Oreshnik de cierre/sync.

## Validaciones de Cierre

| Check | Comando | Resultado |
|---|---|---|
| TypeScript | `npm run typecheck` | PASS |
| Build | `npm run build` | PASS |
| Worker Turpial | `npm run worker:validate` | PASS, 29/29 queue entries and 46/46 assets |
| Instagram vault | `node .\scripts\verify-turpial-oauth-vault.mjs` | PARTIAL: blocked locally because `DATABASE_URL` is not set |
| Facebook vault | `node .\scripts\verify-turpial-facebook-vault.mjs` | PARTIAL: blocked locally because `DATABASE_URL` is not set |

---

Ultima actualizacion: 2026-06-09 VET | Operador: Manuel | Sprint: `S-HC-CTRL-01`

## Cierre S-HC-CTRL-01 - 2026-06-09

- Operador: Manuel
- Rama hija: `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01`
- Rama madre docs: `MADRE/v5-s-hc-ctrl-01-validate-oreshnik-control-bus-onboard-jean-and-p-2026-06-09`
- Descripcion: Validate Oreshnik Control Bus, onboard Jean, and prepare first controlled publishing sprint
