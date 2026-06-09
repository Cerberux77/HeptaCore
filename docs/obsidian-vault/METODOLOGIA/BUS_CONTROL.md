---
type: bus-control
project: "HeptaCore"
last_updated: "2026-06-09"
tags:
  - "#bus-control"
  - "#locks"
  - "#publish-safety"
---

# Bus de Control HeptaCore

## Reglas Base

| Regla | Detalle |
|---|---|
| Rama hija por operador | `Manuel/*` o `Jean/*` |
| Rama madre versionada | `MADRE/vN-sprint-desc-fecha` |
| DB/Auth/Security lock | Prisma, migrations, auth, vault, token security requieren doble lock |
| No secretos | Nunca commitear `.env`, tokens, OAuth codes, claves ni blobs descifrados |
| Acciones reales bloqueadas | Publicar, gastar, scraping, DM masivo, cambiar Meta settings |
| Docs al cierre | Central, sprint plan, tenant docs y handoff actualizados |
| QA minimo | typecheck, build, worker validate, vault verify |

## Capas Operativas

| Capa | Pregunta que responde | Fuente |
|---|---|---|
| Mission | Que estamos intentando lograr y que esta activo en produccion | [[../00_CENTRAL_HEPTACORE]] |
| Tenant | Que cliente/tenant se toca y con que credenciales/conexiones | [[../TENANTS/TURPIAL_SOUND/TENANT_STATUS]] |
| Sprint | Que trabajo esta autorizado ahora | [[SPRINT_PROTOCOL]] |
| Branch | Quien puede editar que rama y zona | [[BRANCH_OWNERSHIP]] |
| Developer | Que hace Manuel y que hace Jean | [[../COLABORADORES/ESTADO_MANUEL]], [[../COLABORADORES/ESTADO_JEAN]] |
| Agent | Que puede hacer cada agente en esta sesion | [[AGENT_HANDOFF_PROTOCOL]] |
| Validation | Como se prueba antes de cerrar | [[../QA/QA_RUNBOOK]] |
| Publish | Como se evita publicar por accidente | [[PUBLISHING_SAFETY_PROTOCOL]] |

## Zonas y Locks

El mapa activo vive en:

```txt
docs/07_handoffs/zone-map.json
```

Comando:

```bash
npm run oreshnik:zone -- --sprint S-HC-CTRL-01
```

Zonas que requieren coordinacion antes de editar:

- `packages/db/**`
- `packages/integrations/**`
- `apps/worker/**` cuando toque publicacion real o tokens
- `apps/web/app/api/oauth/**`
- `package.json`
- `package-lock.json`
- cualquier archivo de auth, vault, secrets o Meta settings

## No-Overwrite / No-Collision

1. Leer `git status --short` antes de editar.
2. No revertir cambios no propios.
3. No usar comandos destructivos de git para "limpiar" el trabajo de otro.
4. Si una zona compartida esta sucia, leer el diff y trabajar con ese estado.
5. Si dos operadores necesitan el mismo archivo, acordar owner de la seccion y documentar en handoff.

## Emergencia / Rollback / Escalacion

Si se detecta riesgo real:

1. Detener ejecucion.
2. No borrar evidencia ni logs.
3. Registrar comando exacto, rama, commit y archivo afectado.
4. Avisar a Manuel.
5. Si hay token expuesto, marcar incidente de seguridad y rotar fuera de chat.
6. Si hubo intento de publicacion, capturar respuesta de proveedor sin imprimir token.
7. Crear handoff `PARTIAL/BLOCKED` con causa y proximo paso.

## Publicacion

La publicacion real no forma parte de `S-HC-CTRL-01`. El primer sprint relacionado sera `S-HC-PUB-01` y solo permite discovery + dry-run + preparar comando. La ejecucion real queda atras de gate humano.
