# Operator authorization — S-HC-STRAT-03

Manuel Vera, human owner of HeptaCore, authorizes the STRAT-03 execution to perform every Oreshnik control-plane mutation required to inject, dispatch, resume, validate and deliver the Goal.

The execution is authorized to use the installed Oreshnik CLI and its administrative or recovery commands to modify task, Run, claim, assignment, reservation, lock and control metadata as required by the canonical workflow.

Canonical commands remain the first choice. A direct repair of Oreshnik-managed files is permitted only when the CLI cannot represent the required correction, the existing state is inconsistent, and the repair is the smallest change needed to restore canonical operation. Any such repair must preserve real identifiers, avoid fabricating evidence or completion, record the before/after state and rationale, be committed separately, and be followed by readiness, status, reconciliation and applicable tests.

This authorization does not allow live publication, campaign spend, production deployment, credential exposure, fabricated evidence, unrelated sprint work, or schema/auth/security changes without the required Oreshnik double lock.

For this Goal, any blanket prohibition against changing task-board, Run, claim, assignment or lock metadata must be interpreted as a prohibition against bypassing or simulating Oreshnik—not as a prohibition against necessary owner-authorized control-plane operations or auditable recovery.
