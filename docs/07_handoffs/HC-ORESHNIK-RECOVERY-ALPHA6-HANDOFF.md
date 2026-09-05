# HC-ORESHNIK-RECOVERY-ALPHA6 — terminal handoff

## Outcome

HeptaCore governance recovery is complete on exact Oreshnik `0.3.0-alpha.6`.

## Canonical lineage

- Task: `HC-ORESHNIK-RECOVERY-ALPHA6`
- Run: `run-manuel-HC-ORESHNIK-RECOVERY-ALPHA6-20260904140329-21ab3a41`
- Assignment: `asg-61c0aff3-c576-4071-b7d4-d974adfcc418`
- Operator: `manuel`
- Harness: `chatgpt`
- Stable promotion PR: `#26`
- Stable merge: `74cc4becdcd56369fce5d47cf0324b9ae22c1b1f`

## Release identity

- Oreshnik: `0.3.0-alpha.6`
- Release commit: `3e4345b76238e18da8e4d259f537f0e9c64ce099`
- TGZ SHA-256: `66e0e6683cdf9587a873b27f20dd8c8538199eb511068e9c40b682ceadb176e8`
- alpha16 vendored rollback retained.

## Validation

Consumer readiness, exact release digest, typecheck, build, worker validation, test suite, command-catalog smoke and reconcile checks passed before stable promotion. The governed integration train succeeded and the stable candidate was merged to `master` only after explicit owner authorization.

## Safety

The recovery Run contained no product feature implementation, production deployment, live social publication, campaign spend, secret mutation, or floating Oreshnik dependency.

## Next action

After terminal projection is verified, continue only through the native alpha6 `/goal` contract. Do not restore legacy ownership manually.
