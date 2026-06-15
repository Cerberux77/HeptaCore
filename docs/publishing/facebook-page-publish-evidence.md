# Facebook Page Publish — Evidencia de publicación real

## Fecha

2026-06-15 ~06:00 UTC

## Tenant

- **slug**: `turpial-sound`
- **id**: `cmq5t2qji0000sgnee6g19vv6`

## Publicación

| Campo | Valor |
|---|---|
| **Draft** | `cmq6y1oebnpkpx3kz` — "Gracias por este mes" |
| **Network** | `FACEBOOK` |
| **Status** | `PUBLISHED` |
| **externalPostId** | `122108235753299526` (real, devuelto por Meta Graph API) |
| **Page ID** | `1129437930248909` |
| **Page Name** | `Turpial Sound` |
| **Formato** | Imagen (`facebook/bienvenidos-fb.jpg`) |

## Preflight

| Paso | Resultado |
|---|---|
| Dry run previo | ✅ PASS — `Technical preflight passed. No provider call executed.` |
| Provider FACEBOOK en registry | ✅ |
| SocialAccount connected | ✅ `cmq5t2rjs0002sgnehwpcpbwa` |
| OAuthConnection.tokenRef | ✅ `cmqf1a88n000004l7utr5rsas` |
| CredentialVaultItem | ✅ `cmqf1a88n000004l7utr5rsas` |
| Scopes (`pages_show_list`, `pages_read_engagement`, `pages_manage_posts`) | ✅ |
| Asset URL pública | ✅ `tenant-assets/turpial/facebook/bienvenidos-fb.jpg` |
| Token decrypt | ✅ |
| HTTPS mediaUrl | ✅ |

## Immediate publish

| Paso | Resultado |
|---|---|
| Llamada a Meta Graph API | ✅ `POST /1129437930248909/photos` |
| Respuesta Meta | ✅ HTTP 200, `id: 122108235753299526` |
| ContentDraft → PUBLISHED | ✅ |
| PublishingJob → PUBLISHED | ✅ |
| PublishingResult ok=true | ✅ |
| AuditLog `publish_immediate_live` | ✅ |

## Limitaciones

- **Token short-lived**: el `FACEBOOK_PAGE_ACCESS_TOKEN` actual expira en ~1 hora. Para operación estable se requiere un token long-lived.
- Ver `docs/technical-debt/facebook-long-lived-token.md` para el plan de renovación.

## Instagram

- **Untouched** ✅ — `git diff -- apps/web/app/api/oauth/instagram` vacío.
