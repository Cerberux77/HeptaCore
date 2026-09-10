# S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E

## Objective
Complete the deterministic end-to-end YouTube publishing software path under the exact required write zones. This Goal owns the already validated immediate Video/Shorts provider code plus the scheduled PUB-04 cron bridge.

## Governance
- Parent acceptance remains S-HC-PUB-07-YOUTUBE-PUBLISHING.
- Do not claim real external YouTube validation in this child Goal.
- Never hardcode OAuth secrets or provider credentials.
- Missing credential labels fail closed.
- Only the declared zones may receive product-code changes.

## Acceptance
- Validated YouTube Video 16:9 and Shorts publisher is present in the governed delivery.
- Scheduled cron transports YouTube format, title, description, primary video and thumbnail to the provider adapter.
- Scheduled credential resolution uses the publisher credentialLabel dynamically and never hardcodes facebook_page_oauth.
- Missing credentialLabel fails closed before credential decryption.
- Scheduled dry-run recognizes YouTube formats without resolving credentials or invoking the provider.
- Provider-specific immediate and scheduled tests pass together.
- typecheck, build, worker validation and full repository tests pass.
