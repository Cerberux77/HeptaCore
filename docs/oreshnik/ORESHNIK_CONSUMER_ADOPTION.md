# Oreshnik Consumer Adoption

This guide records the canonical consumer-side adoption pattern for Oreshnik CLI releases when npm registry publication is unavailable or not yet trusted.

## Inputs required

- Reviewed Oreshnik release commit.
- Release tag.
- Release asset URL.
- SHA-256 for the release asset.
- Existing consumer rollback package.

## Adoption steps

1. Download the release asset from the canonical GitHub Release.
2. Verify the asset SHA-256 before adding it to the consumer repository.
3. Vendor the tarball under `vendor/oreshnik/` using this filename format:

   `oreshnik-cli-<version>-<releaseCommit>.tgz`

4. Update `package.json` to point `oreshnik-cli` at the vendored tarball with a `file:` dependency.
5. Regenerate `package-lock.json` with install scripts disabled.
6. Update the consumer readiness guard to expect the new exact Oreshnik version.
7. Run the consumer readiness command.
8. Smoke the specific CLI command or behavior required by the release.
9. Record evidence, rollback path, and scope guard in the consumer repository.

## HeptaCore alpha16 reference

- Version: `0.2.0-alpha.16`
- Release commit: `d983c051c79b99c3fcda6c4c200b7c96bda997ff`
- SHA-256: `8E38737A7CC3AD88414582C4F51630E481BBF0723480079DA93CA91B4F208473`
- Required smoke: `oreshnik handoff --help`

## Safety rules

- Do not edit task boards, runs, claims, assignments, handoffs, or evidence manually as part of dependency adoption.
- Do not mix product changes with dependency adoption.
- Do not depend on `npx oreshnik` for validation because it can resolve a registry package instead of the vendored package.
- Prefer `node node_modules\oreshnik-cli\dist\cli.js` when validating the exact installed package on Windows.
