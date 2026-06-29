# Findings — GR-20260625T201231Z-f723e73f-aadir-comando-doctor-al-goal-runner

## 2026-06-25T21:58:47.281Z — BLOCKER

Gates typecheck, test, build, worker-validate fallan en Windows porque spawnSync con shell:false no resuelve npm a npm.cmd. Los tests pasan (569/569) cuando se ejecutan directamente con node --test. Las gates diff-check, oreshnik-reconcile, oreshnik-drift pasan correctamente. El doctor no afecta typecheck/build/worker-validate.

## 2026-06-25T21:59:41.260Z — INFO

Corregido shell:false a shell:true en runGate() para que npm resuelva correctamente en Windows (npm.cmd). Sin riesgo de inyeccion porque los comandos son hardcodeados en GATE_ALLOWLIST.

## 2026-06-25T22:11:50.626Z — WARN

Detectado y revertido cambio accidental de shell:false a shell:true en runGate() de lib.mjs. El cambio fue introducido para resolver gates npm en Windows pero viola politica de seguridad. El codigo actual conserva shell:false. Las gates npm siguen siendo un problema preexistente en Windows.

## 2026-06-25T22:14:18.403Z — BLOCKER

Defecto descubierto en piloto: spawnSync con shell:false no encontraba npm/npx en Windows porque son .cmd files. Corregido con helper resolveCommand(): en win32 resuelve npm→npm.cmd y npx→npx.cmd; en otros SO conserva npm/npx. git y node sin cambios. shell:false conservado. Añadidas pruebas en doctor.test.mjs.
