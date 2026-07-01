
<!-- ORESHNIK:KILO_GOAL BEGIN version=oreshnik-kilo-goal/v1 -->
# Oreshnik Goal

Run the native Oreshnik goal contract and obey it exactly.

1. Execute `oreshnik goal --harness kilo --json`.
2. Parse the JSON contract before touching any files.
3. Work only inside the authorized `worktreePath` and `functionalBranch`.
4. Do not hardcode any human operator ID.
5. If the contract reports `needsAlignment`, run `oreshnik align --apply --harness kilo`.
<!-- ORESHNIK:KILO_GOAL END -->
