# HC-ORESHNIK-RECOVERY-ALPHA6

## Objective

Recover HeptaCore governance on the exact Oreshnik `0.3.0-alpha.6` release before resuming product development.

## Run identity

- Run: `run-manuel-HC-ORESHNIK-RECOVERY-ALPHA6-20260904140329-21ab3a41`
- Operator: `manuel`
- Harness: `chatgpt`
- Branch: `dispatch/manuel/manuel-chatgpt1/recovery/HC-ORESHNIK-RECOVERY-ALPHA6/2954c98970`

## Candidate state

The alpha6 release tarball has been obtained through the npm transport and accepted only after matching the canonical GitHub Release SHA-256 exactly, vendored under its release commit, pinned through `package.json`/`package-lock.json`, installed, and used to regenerate the real CLI command catalog. Alpha16 remains present as a digest-verified rollback artifact.

## Hard stops

No product feature, deployment, live publication, spend, secret, credential, or environment mutation is authorized in this Run.

## Continuation

Run the complete alpha6 consumer and HeptaCore gate matrix, persist canonical validation evidence, advance the same Run to `ready_for_integration`, then integrate through Oreshnik only if all checks remain green.

## Gate result

All required consumer and HeptaCore gates passed on the alpha6 candidate. The next governed action is Oreshnik validation lifecycle transition on this same Run; integration remains prohibited until `ready_for_integration` is persisted.
