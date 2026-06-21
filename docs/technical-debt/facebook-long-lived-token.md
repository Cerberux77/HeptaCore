# Deuda técnica — Token long-lived para Facebook Page

## Estado

**Pendiente.** El `FACEBOOK_PAGE_ACCESS_TOKEN` actual es short-lived (~1 hora de validez desde su emisión en Graph API Explorer).

## Impacto

- Sin un token long-lived, la publicación fallará con `OAuthException code=190 Session has expired` una vez que el token caduque.
- El bootstrap debe re-ejecutarse cada vez que se rota el token.
- El cron publisher también depende de este token para publicaciones programadas.

## Plan de acción

### 1. Generar long-lived User Access Token

1. Obtener un short-lived User Access Token desde Graph API Explorer con scopes:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
2. Intercambiar por long-lived:
   ```
   GET https://graph.facebook.com/v25.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id=1040005332335054
     &client_secret=<FACEBOOK_CLIENT_SECRET>
     &fb_exchange_token=<SHORT_USER_TOKEN>
   ```
3. El long-lived User Token dura ~60 días.

### 2. Obtener long-lived Page Access Token

1. Con el long-lived User Token, consultar:
   ```
   GET https://graph.facebook.com/v25.0/me/accounts
     ?fields=id,name,access_token
     &access_token=<LONG_USER_TOKEN>
   ```
2. El Page Access Token devuelto no expira (mientras el User Token sea válido).

### 3. Actualizar Vercel Production

```bash
npx vercel env rm FACEBOOK_PAGE_ACCESS_TOKEN production --yes
npx vercel env add FACEBOOK_PAGE_ACCESS_TOKEN production --value "<LONG_PAGE_TOKEN>" --yes
```

### 4. Re-bootstrap

1. Redeploy: `npx vercel deploy --prod --yes`
2. Ejecutar bootstrap desde navegador con sesión admin:
   ```
   POST /api/admin/facebook-page/bootstrap
   { "tenantSlug": "turpial-sound", "confirm": "CONNECT_FACEBOOK_PAGE" }
   ```

### 5. Verificar

1. Ejecutar `dry_run` para confirmar que el nuevo token funciona.
2. Probar `immediate` con un draft nuevo (no el ya publicado).

## Regla de cierre

Esta deuda se cierra cuando:
- Existe un token long-lived Page Access Token en Vercel
- El bootstrap con ese token pasa validación `debug_token` y page check
- Un `dry_run` pasa todos los gates
- Un `immediate` publica con `externalPostId` real
