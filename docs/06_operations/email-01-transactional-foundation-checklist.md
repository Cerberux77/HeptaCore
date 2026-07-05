# EMAIL-01 Transactional Foundation Checklist

This checklist closes the external acceptance criteria for `S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION`.

Current repo status:

- Code path is implemented for provider abstraction, owner invitation templates, idempotent delivery records, and Resend webhook verification.
- Operational mode is still `EMAIL_PROVIDER=disabled`.
- Real email sending must stay disabled until domain, DNS, provider, and webhook verification are complete.

## Goal

Enable real transactional email for HeptaCore tenant invitations without regressing the current link-only fallback.

## Required Decisions

Before touching production, confirm these values:

- Final public app origin: `https://<final-heptacore-domain>`
- Final sender domain: `<mail-domain>`
- Sender mailbox: `noreply@<mail-domain>`
- Support mailbox: `support@<mail-domain>`
- Privacy mailbox: `privacy@<mail-domain>`
- Provider: `Resend`

## DNS and Sender Setup

1. Add the sender domain in Resend.
2. Publish the DNS records requested by Resend for domain verification.
3. Verify SPF passes for the sender domain.
4. Verify DKIM passes for the sender domain.
5. Publish a DMARC record for the sender domain.
6. Confirm the domain shows as verified in Resend before enabling sends.

Recommended DMARC starting point:

```txt
v=DMARC1; p=none; rua=mailto:privacy@<mail-domain>; fo=1
```

Move to stricter policy only after delivery is stable.

## Environment Configuration

Set these variables in the production environment:

```env
EMAIL_PROVIDER=resend
EMAIL_FROM=HeptaCore <noreply@<mail-domain>>
EMAIL_REPLY_TO=support@<mail-domain>
HEPTACORE_APP_URL=https://<final-heptacore-domain>
RESEND_API_KEY=<provider-secret>
RESEND_WEBHOOK_SECRET=<provider-webhook-secret>
```

Notes:

- `EMAIL_PROVIDER` must remain `disabled` until DNS verification is complete.
- `HEPTACORE_APP_URL` must match the real production origin used in invitation links.
- `EMAIL_FROM` now drives the branded support/privacy emails shown by templates and legal pages.

## Webhook Setup

1. Create a Resend webhook pointing to:

```txt
https://<final-heptacore-domain>/api/webhooks/resend
```

2. Subscribe to at least these events:
   - `email.sent`
   - `email.delivered`
   - `email.delivery_delayed`
   - `email.failed`
   - `email.bounced`
   - `email.complained`
3. Copy the webhook secret into `RESEND_WEBHOOK_SECRET`.
4. Send a provider test event and confirm the endpoint returns `200` with `{ ok: true }`.

## HeptaCore Verification

Run these checks after env vars are deployed:

```bash
npm run typecheck
npx tsx --test apps/web/lib/__tests__/email-provider.test.ts
```

Manual product checks:

1. Create a test tenant owner invitation from the admin console.
2. Confirm the response no longer depends on `inviteLink` as the primary delivery path.
3. Verify the recipient receives the email from the final sender domain.
4. Open the email and confirm links resolve to the final production domain.
5. Complete the invitation flow and confirm registration/login works.
6. Inspect `EmailDelivery` and verify status transitions from `PENDING`/`SENT` to `DELIVERED`.
7. Trigger at least one resend and confirm idempotent delivery records still behave correctly.

## Acceptance Criteria Mapping

- Authorized final sender domain: satisfied by Resend verified domain plus `EMAIL_FROM`.
- SPF/DKIM/DMARC verified: satisfied by DNS publication and provider/domain verification.
- Provider integrated: satisfied by `EMAIL_PROVIDER=resend` plus successful live send.
- Event webhooks configured: satisfied by live webhook events updating delivery status.
- Commercial and brand links aligned: satisfied by `HEPTACORE_APP_URL` and sender-domain-driven contact addresses.

## Rollback

If live delivery is unstable:

1. Set `EMAIL_PROVIDER=disabled`.
2. Redeploy.
3. Confirm invitations still expose the fallback `inviteLink`.
4. Keep webhook config in place, but do not re-enable real sending until DNS/provider issues are resolved.

## Exit Condition

`EMAIL-01` can move from `pending` only when:

- Sender domain is verified in Resend.
- DNS is live and validated.
- Production env vars are deployed.
- A real invitation email is delivered successfully.
- Webhook events are observed end-to-end.
- Fallback rollback path is confirmed.
