---
type: master-dashboard
project: "HeptaCore"
status: active-production
phase: "Turpial Oreshnik model replicated, publishing held"
last_updated: "09/06/26 13:45"
mother_branch: "MADRE/v7-s-hc-ctrl-03-replicate-turpial-sound-oreshnik-allocation-mode-2026-06-09"
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
| Sprint actual | `S-HC-CTRL-03` |
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
- [[METODOLOGIA/ORESHNIK_CONTROL_BUS]] - autoridad de asignacion Oreshnik.
- [[METODOLOGIA/BUS_CONTROL]] - capas, locks, gates y stop criteria.
- [[METODOLOGIA/PREFLIGHT_PROTOCOL]] - checklist de preflight previo a asignacion.
- [[METODOLOGIA/TASK_ALLOCATION_PROTOCOL]] - paquete de asignacion Oreshnik.
- [[METODOLOGIA/MOTHER_CHILD_BRANCH_MODEL]] - madre/hija como fuente colaborativa.
- [[METODOLOGIA/COLLABORATIVE_DOCS_PROTOCOL]] - docs tipo Google Docs sobre Git.
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
| [[COLABORADORES/JEAN_FIRST_TASK]] | Candidato de asignacion Oreshnik para S-HC-PUB-01 |

## Siguiente Sprint Controlado

| Sprint | Owner | Scope | Estado |
|---|---|---|---|
| `S-HC-PUB-01` | Pendiente Oreshnik | Turpial Sound first controlled publishing test: discovery + dry-run + comando preparado | Candidato, no asignado manualmente |

## Control-State Actual

La proxima accion no es ejecucion manual.

La proxima accion es:

```txt
Oreshnik preflight + Oreshnik assignment packet
```

Jean no ejecuta `S-HC-PUB-01` hasta que Oreshnik lo asigne. Manuel no lo asigna manualmente salvo override de emergencia documentado. La publicacion real sigue bloqueada.

## Modelo Oreshnik Heredado

HeptaCore hereda el modelo funcional de Turpial Sound inspeccionado en:

```txt
D:\PROYECTOS\PROYECTOS VISUAL STUDIO\Turpialsound\turpialsound
```

Piezas adaptadas:

- preflight con madre dinamica;
- sync/resume desde mother docs;
- ramas hijas por operador;
- union merge de docs;
- cierre con ledger de sprint;
- zone-map para evitar colisiones;
- handoff append-only;
- reasignacion por Oreshnik cuando un operador esta bloqueado/stale.

Comandos HeptaCore:

```bash
npm run oreshnik:preflight
npm run oreshnik:resume
npm run oreshnik:assign
npm run oreshnik:close
```

## Reglas Activas

- No publicar en redes reales desde HeptaCore en `S-HC-CTRL-03`.
- No ejecutar tareas por seleccion manual: Oreshnik debe emitir paquete de asignacion.
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

## Cierre S-HC-CTRL-02 - 2026-06-09

- Operador: Manuel
- Rama hija: `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01`
- Rama madre docs: `MADRE/v6-s-hc-ctrl-02-make-oreshnik-responsible-for-task-allocation-2026-06-09`
- Descripcion: Make Oreshnik responsible for task allocation

## Cierre S-HC-CTRL-03 - 2026-06-09

- Operador: Manuel
- Rama hija: `Manuel/s-hc-xx-plan-holistico-heptacore-turpial-jean-2026-06-01`
- Rama madre docs: `MADRE/v7-s-hc-ctrl-03-replicate-turpial-sound-oreshnik-allocation-mode-2026-06-09`
- Descripcion: Replicate Turpial Sound Oreshnik allocation model
