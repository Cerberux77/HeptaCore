# Bloqueo — Permiso `pages_manage_posts` en Facebook OAuth

## Fecha

2026-06-15

## Estado

**Bloqueado por Meta.** HeptaCore no puede completar el flujo OAuth de Facebook Page hasta que Meta apruebe el permiso `pages_manage_posts`.

## Evidencia

1. El redirect de login OAuth es técnicamente correcto:
   ```
   GET https://heptacore.vercel.app/api/oauth/facebook/login?tenant=turpial-sound
   → 307 → https://www.facebook.com/v25.0/dialog/oauth
     ?client_id=1702092247446204
     &redirect_uri=https://heptacore.vercel.app/api/oauth/facebook/callback
     &scope=pages_show_list,pages_read_engagement,pages_manage_posts
     &response_type=code
   ```

2. Variables de entorno confirmadas en Vercel Production:

   - `FACEBOOK_CLIENT_ID` — correcto, coincide con local
   - `FACEBOOK_CLIENT_SECRET` — configurado
   - `FACEBOOK_PAGE_ID=1129437930248909` — verificado sin whitespace ni escapes
   - `APP_PUBLIC_URL` — correcto

3. Meta responde en el diálogo OAuth:

   ```
   Invalid Scopes: pages_manage_posts
   ```

   Este permiso requiere **App Review** en el Facebook Developer Dashboard antes de que usuarios no-admin puedan concederlo.

## Impacto

- Sin `pages_manage_posts`, el Page access token devuelto por `/me/accounts` **no incluye el permiso de publicación**.
- HeptaCore correctamente bloquea en el callback vía `debug_token` y responde:
  ```json
  {
    "ok": false,
    "code": "FACEBOOK_REQUIRED_SCOPES_MISSING",
    "missingScopes": ["pages_manage_posts"],
    "grantedScopes": ["pages_show_list", "pages_read_engagement"]
  }
  ```
- **Nunca** se guarda una conexión falsa.
- **Nunca** se marca `PUBLISHED`.
- **Nunca** se genera `externalPostId` fake.

## Acción requerida

Completar **App Review** en el Facebook Developer Dashboard para el permiso `pages_manage_posts`. Mientras tanto, el publisher Facebook y el callback blindado se mantienen listos, con todos los gates de validación activos.

## Archivos involucrados

- `apps/web/app/api/oauth/facebook/login/route.ts`
- `apps/web/app/api/oauth/facebook/callback/route.ts`
- `apps/web/lib/publishers/facebook-page.ts`

## Regla de reanudación

Cuando Meta apruebe `pages_manage_posts`:

1. Ejecutar de nuevo el flujo OAuth desde `/api/oauth/facebook/login?tenant=turpial-sound`
2. Verificar que el callback recibe `debug_token.is_valid=true` con los 3 scopes
3. Confirmar que `CredentialVaultItem`, `SocialAccount` y `OAuthConnection` se guardan correctamente
4. Probar `dry_run` para Facebook
5. Probar `immediate` con un draft real
6. Solo entonces cerrar esta deuda
