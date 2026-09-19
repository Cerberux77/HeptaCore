# HeptaCore transactional email readiness

## Decision in force

During active development, HeptaCore may use its free Vercel `*.vercel.app` hostname as the **web application origin**. The official HeptaCore web domain will be introduced later.

A Vercel shared hostname is **not** treated as an owned email-sender domain. Development email must therefore use an explicit provider test identity, while production sending remains gated on an owned HeptaCore domain with verified DNS.

## Existing foundation

HeptaCore already contains:

- Resend provider integration in `apps/web/lib/email/providers/resend-provider.ts`.
- Idempotent delivery persistence in `apps/web/lib/email/email-delivery-service.ts`.
- Signed Resend webhook processing at `/api/webhooks/resend` for sent, delivered, delayed, failed, bounced and complained events.
- Delivery/event persistence and monotonic terminal status handling.

This Run adds a deterministic readiness contract in `@heptacore/core` and a SUPER_ADMIN-only diagnostic endpoint at `GET /api/email/readiness`.

The endpoint exposes configuration booleans and verification states only. It never returns API keys, webhook secrets or their values.

## Development configuration

Recommended development contract:

```text
EMAIL_PROVIDER=resend
RESEND_API_KEY=<secret in Vercel>
RESEND_WEBHOOK_SECRET=<secret in Vercel>
EMAIL_FROM=HeptaCore <onboarding@resend.dev>
HEPTACORE_APP_URL=https://<current-heptacore-project>.vercel.app
```

`onboarding@resend.dev` is a provider test identity. It is acceptable only for development/test flows and never makes the system production-ready.

For deterministic webhook tests without affecting domain reputation, Resend provides event addresses such as `delivered@resend.dev`, `bounced@resend.dev`, and `complained@resend.dev`.

Do **not** configure `noreply@heptacore.vercel.app` or any other `@*.vercel.app` address as `EMAIL_FROM`. HeptaCore does not control the DNS zone required to authenticate that shared platform domain as an email sender.

## Production configuration

When the official domain is selected, configure an owned sender domain or subdomain in Resend and set:

```text
EMAIL_PROVIDER=resend
RESEND_API_KEY=<production secret>
RESEND_WEBHOOK_SECRET=<production webhook secret>
EMAIL_FROM=HeptaCore <noreply@<owned-sender-domain>>
EMAIL_REPLY_TO=<support address on the owned brand domain>
HEPTACORE_BRAND_DOMAIN=<official brand domain>
HEPTACORE_APP_URL=https://<official application domain>
```

Production readiness requires all of the following:

1. Resend reports the exact sender domain as `verified` with sending enabled.
2. Every Resend SPF record is verified.
3. Every Resend DKIM record is verified.
4. A DMARC TXT record is resolvable at the sender or configured brand domain.
5. `RESEND_WEBHOOK_SECRET` is configured.
6. The web origin and sender identity align with `HEPTACORE_BRAND_DOMAIN`.
7. The web origin is no longer a temporary Vercel hostname.

HeptaCore treats DMARC as mandatory for its production gate even when provider-side domain verification has already succeeded.

## Readiness endpoint

`GET /api/email/readiness` requires a global SUPER_ADMIN session.

Important fields:

- `developmentReady`: true only when the provider, API key, signed webhook secret, usable sender and safe application origin are configured.
- `productionReady`: additionally requires an owned sender domain, verified Resend DNS state, DMARC and brand-domain alignment.
- `developmentBlockers` / `productionBlockers`: deterministic machine-readable gate codes.
- `providerProbe`: `ok`, `not_found`, `failed`, or `skipped`.
- `secretValuesExposed`: always `false`.

For an owned custom sender, the endpoint queries Resend domain state and record status. DMARC is resolved through DNS. Provider lookup failures fail readiness closed without echoing provider credentials or raw secret-bearing responses.

## Acceptance status after software completion

| Acceptance item | State |
| --- | --- |
| Final HeptaCore domain authorized as sender | Externally deferred until the owner selects/configures the final domain |
| SPF, DKIM, DMARC verified | Externally deferred until the owned sender domain exists |
| Transactional provider integrated | Implemented with Resend |
| Delivered/bounced/complained webhooks | Implemented with signed webhook verification and persisted lifecycle updates |
| Commercial/brand links on final domain | Temporary Vercel origin remains in development; official-domain cutover is externally deferred |

The software foundation is independently testable and can be kept complete while the final production activation remains fail-closed. The Task must not claim full production readiness until owned-domain and DNS evidence is available.
