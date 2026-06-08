# S-HC-01 Closure + S-HC-02/S-HC-06 Foundation

Date: 2026-06-08
Operator: Manuel

## Production State

- Production URL: `https://heptacore.vercel.app`
- Temporary Instagram callback: `https://heptacore.vercel.app/api/oauth/instagram/callback`
- Final target domain: `https://app.heptacore.com`
- Final callback after domain cutover: `https://app.heptacore.com/api/oauth/instagram/callback`

The Vercel callback is temporary and must remain configured in Meta until the final domain is live and verified.

## Required Production Env Vars

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `INSTAGRAM_REDIRECT_URI`
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`

Do not print, commit, or share secret values. Future encrypted token storage also requires `ENCRYPTION_KEY`; token persistence is blocked until the encryption/vault adapter is implemented.

Legacy worker compatibility is preserved for:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_ACCESS_TOKEN`
- `META_PAGE_ID`
- `META_INSTAGRAM_BUSINESS_ID`
- `FACEBOOK_PAGE_ID`
- `FACEBOOK_PAGE_ACCESS_TOKEN`

## Callback Verification

Alive check without OAuth code:

```bash
curl "https://heptacore.vercel.app/api/oauth/instagram/callback"
```

Expected safe response includes:

```json
{
  "ok": true,
  "provider": "instagram",
  "codeReceived": false,
  "tokenReceived": false
}
```

Authorization URL generator:

```bash
curl "https://heptacore.vercel.app/api/oauth/instagram/login?tenant=turpial-sound"
```

The returned `state` is base64url JSON carrying tenant slug, nonce and a CSRF placeholder. Before token storage is enabled, the nonce must be bound to a server-side session.

## Redeploy After Env Changes

1. Update env vars in Vercel Production.
2. Redeploy Production from the current Git branch or Vercel dashboard.
3. Re-run the callback alive check.
4. Generate the Instagram authorization URL and confirm the redirect URI matches Meta exactly.
5. Do not publish RRSS content until the hard stop is explicitly lifted.

## S-HC-01 Closure

S-HC-01 closes with production deployed at Vercel, the temporary callback documented, and required env names aligned with the app.

## S-HC-02 Auth/Tenants/Roles Plan

Implemented foundation:

- `User.passwordHash` placeholder for email/password auth.
- `TenantMember` Prisma model mapped to existing `Membership` table.
- Tenant role enum includes `SUPER_ADMIN`, `TENANT_ADMIN`, `STRATEGIST`, `APPROVER`, `PUBLISHER`, `VIEWER`.
- `Invitation` model for tenant-scoped onboarding.
- `/dashboard` protected route scaffold.
- `apps/web/lib/tenant-auth.ts` route guard and tenant isolation helper.

Remaining:

- Add password hashing and session issuance.
- Add login form/server action.
- Bind sessions to tenant memberships from DB.
- Add tenant switcher for admins.
- Add tests for route guards and tenant isolation.

## S-HC-06 Instagram OAuth Plan

Implemented foundation:

- `/api/oauth/instagram/login` generates a Business Login authorization URL.
- `/api/oauth/instagram/callback` reads `code`, `state`, `error`, `error_reason`, and `error_description`.
- Callback exchanges code using `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, and `INSTAGRAM_REDIRECT_URI`.
- Callback never returns or logs the access token.
- Token storage remains disabled until encrypted persistence is reviewed.

Blocked by Meta / security:

- Meta App Review and Live mode for required Instagram permissions.
- Confirmed Business Login redirect URI in Meta.
- `ENCRYPTION_KEY` and vault adapter implementation.
- CSRF nonce persistence tied to a server-side session.

## Turpial Sound Seed

Seed data:

- Tenant slug: `turpial-sound`
- Tenant name: `Turpial Sound`
- Instagram handle: `turpialsound`
- Facebook page id: `1129437930248909`
- Instagram business account id: `17841472923130843`

Command:

```bash
node scripts/seed-turpial-foundation.mjs
```

The seed creates no secrets and no admin password. First admin creation remains pending until password hashing and session issuance are implemented.

## Onboarding Intake

Required fields for new tenants:

- company name
- brand name
- industry
- services/products
- target audience
- geography
- tone of voice
- social channels
- business goals
- competitors/references
- asset availability
- approval contact
- publishing permissions

Expected output:

- `Tenant`
- `BrandProfile`
- `StrategyBrief` draft
- asset requirements checklist

## Next Steps For Manuel

1. Keep Meta callback set to `https://heptacore.vercel.app/api/oauth/instagram/callback` until `https://app.heptacore.com` is live.
2. Verify `/api/oauth/instagram/callback` and `/api/oauth/instagram/login?tenant=turpial-sound` in Production.
3. Do not enter token values in docs or git.
4. Review the migration before applying it to Production.
5. After auth is implemented, create the first Turpial admin through the password-hashing flow.

