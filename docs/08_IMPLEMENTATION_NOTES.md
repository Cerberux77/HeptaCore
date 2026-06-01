# Implementation Notes

## Current Result

This repo is now structured as a HeptaCore monorepo with Turpial imported as tenant seed.

## Immediate Next Tasks

1. Install dependencies.
2. Run typecheck/build.
3. Add DB seed importer for Turpial.
4. Build console pages for onboarding, draft queue, approvals, and tenant dashboard.
5. Add BullMQ worker loop.
6. Add provider abstraction for LLM calls.

## Manual Inputs Needed

- Final HeptaCore logo decision.
- Deployment target.
- Auth provider preference.
- Whether local dev DB should use Docker Postgres or hosted Postgres.
- Turpial approvals for any real publishing.
