# S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION

## Objective

Complete the transactional email foundation for HeptaCore with a production-safe sender identity and measurable delivery lifecycle.

## Canonical scope

- Provider integration and idempotent transactional delivery.
- Signed delivery/bounce/complaint webhook lifecycle.
- Development and production readiness diagnostics without secret disclosure.
- Final production sender authorization only on an owned HeptaCore domain.

## Acceptance

- Dominio final de HeptaCore configurado como remitente autorizado
- DNS (SPF, DKIM, DMARC) verificado
- Proveedor de correo transaccional integrado (Resend, SendGrid o equivalente)
- Webhooks de eventos (delivered, bounced, complained) configurados
- Enlaces comerciales y de marca consistentes con el dominio final

## External activation boundary

The software foundation is implemented and validated on preserved Run `run-manuel-S-HC-EMAIL-01-TRANSACTIONAL-FOUNDATION-20260910144612-ccbed006`. Production activation remains fail-closed until Manuel selects an owned HeptaCore domain and Resend/DNS evidence verifies SPF, DKIM and DMARC. The Vercel hostname may be used only as a temporary web origin, never as the production sender identity.

## Governance

This Goal recovers the missing legacy Goal artifact for the already-canonical Task. It does not authorize secret disclosure, fabricated DNS evidence, bypassing the external authorization gate, or a second concurrent Run.
