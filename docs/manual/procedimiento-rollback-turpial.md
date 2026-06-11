# Procedimiento de Rollback — Turpial Sound

## Proposito

Este documento define el procedimiento para revertir drafts ejecutados en dry-run y restaurar el sistema a un estado seguro. Todo dry-run es simulado: no hay publicacion real en RRSS.

## Gates de Seguridad Activos

1. `BOT_DRY_RUN=true` — bloquea cualquier publicacion real
2. `BOT_ALLOW_REAL_PUBLISH=false` — hard stop de producto
3. Ningun draft puede transicionar a PUBLISHED sin levantamiento explicito
4. Todo dry-run requiere aprobacion manual con checkbox
5. Solo drafts con `externalPostId` con prefijo `dryrun_` son elegibles para rollback

## Rollback Manual (UI)

1. Ir a `Publicacion` (Readiness Gate) en el sidebar
2. Verificar el plan de rollback visible en la seccion inferior
3. Si un draft fue ejecutado en dry-run y necesita revertirse:
   - Identificar el draft SCHEDULED con `externalPostId` de dry-run
   - Ir a `Cola de drafts`, seleccionar el draft
   - Usar el boton `Rechazar` para devolverlo a REJECTED
   - Alternativa: `POST /api/publishing/rollback` para volver a DRAFT

## Rollback via API

```bash
curl -X POST https://heptacore.vercel.app/api/publishing/rollback \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=<token>" \
  -d '{
    "tenantSlug": "turpial-sound",
    "draftId": "<draft-id>",
    "manualApproval": true
  }'
```

**Precondiciones:**
- Draft debe tener status `SCHEDULED`
- Draft debe tener `externalPostId` con prefijo `dryrun_`
- Usuario debe tener rol `APPROVER`, `PUBLISHER`, `ADMIN` o superior

**Resultado:**
- Draft vuelve a status `DRAFT`
- `externalPostId` se limpia
- `requiresReview` se activa
- Entrada en AuditLog: `publish_dry_run_rollback`

## Procedimiento de Rollback Completo (emergencia)

Si se requiere revertir multiples drafts:

1. **Verificar configuracion**: `BOT_DRY_RUN=true` en `.env`
2. **Identificar drafts afectados**: `SELECT id, title, status, externalPostId FROM content_draft WHERE status = 'SCHEDULED' AND externalPostId LIKE 'dryrun_%'`
3. **Ejecutar rollback por cada draft**: usar API o SQL directo:
   ```sql
   UPDATE content_draft
   SET status = 'DRAFT', "externalPostId" = NULL, "requiresReview" = true
   WHERE status = 'SCHEDULED' AND "externalPostId" LIKE 'dryrun_%';
   ```
4. **Crear entrada de auditoria**: registrar la accion con actor y metadata
5. **Verificar estado final**: confirmar que no quedan drafts en SCHEDULED con `externalPostId` de dry-run
6. **Notificar al equipo**: informar que el dry-run fue revertido

## Verificacion Post-Rollback

- `SELECT COUNT(*) FROM content_draft WHERE status = 'SCHEDULED' AND externalPostId LIKE 'dryrun_%'` debe retornar 0
- AuditLog debe contener entradas `publish_dry_run_rollback`
- Los drafts revertidos deben aparecer en `DRAFT` en la cola de publicaciones
