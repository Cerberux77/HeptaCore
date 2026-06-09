---
type: developer-onboarding
project: "HeptaCore"
operator: "Jean"
last_updated: "2026-06-09"
tags:
  - "#jean"
  - "#onboarding"
---

# Jean Onboarding

## Repo

Repo remoto: `<HEPTACORE_GITHUB_REMOTE_URL>`

Jean debe usar su propia rama y no trabajar sobre ramas `Manuel/*`. Jean no elige tareas desde backlog ni desde prompts libres: espera un paquete de asignacion emitido por Oreshnik.

## Checkout

```bash
git clone <HEPTACORE_GITHUB_REMOTE_URL>
cd HeptaCore
npm install
```

Si ya tiene el repo:

```bash
git fetch --all --prune
git status --short
```

Jean crea la rama solo cuando el paquete Oreshnik indique el nombre exacto.

## Requisitos

- Node.js 20+.
- npm workspaces.
- Acceso al repo remoto.
- Variables locales solo por canal seguro, nunca por chat.
- No commitear `.env`, `.env.rrss` ni secretos.

## Lectura Inicial

1. [[../00_CENTRAL_HEPTACORE]]
2. [[../METODOLOGIA/ORESHNIK_CONTROL_BUS]]
3. [[../METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE]]
4. [[../METODOLOGIA/BUS_CONTROL]]
5. [[../METODOLOGIA/PREFLIGHT_PROTOCOL]]
6. [[../METODOLOGIA/TASK_ALLOCATION_PROTOCOL]]
7. [[../METODOLOGIA/BRANCH_OWNERSHIP]]
8. [[../TENANTS/TURPIAL_SOUND/TENANT_STATUS]]
9. [[../TENANTS/TURPIAL_SOUND/FIRST_PUBLISHING_TEST_PLAN]]

## Assignment

Jean no inicia implementacion solo con preflight. Debe recibir un paquete Oreshnik con `ok: true`, rama, owner, allowed files, prohibited files, validaciones y stop criteria.

El modelo viene de Turpial Sound: rama hija propia, lectura de la madre dinamica antes de trabajar y cierre/handoff que aporta docs sin pisar a Manuel.

Desde `S-HC-PROD-00`, Jean no debe saltar directo a `S-HC-PUB-01` por consola. El candidato de publicacion real depende de sprints producto. El primer carril probable de Jean es `S-HC-PROD-03` para acercar Turpial Sound al proof desde la UI, y luego `S-HC-PROD-04`/`S-HC-PROD-05` cuando Oreshnik los libere.

Ejemplo de paquete candidato en dry-run:

```bash
npm run oreshnik:resume -- --operator Jean --dry-run
npm run oreshnik:assign -- --dry-run
```

Si hay blockers o el paquete queda `recommended_pending_formal_assignment`, parar y pedir asignacion formal.

## Validaciones

```bash
git status --short
git branch --show-current
git log --oneline -5
npm run typecheck
npm run build
npm run worker:validate
node .\scripts\verify-turpial-oauth-vault.mjs
node .\scripts\verify-turpial-facebook-vault.mjs
```

## Secretos

Jean no debe pedir:

- access tokens;
- app secrets;
- encryption keys;
- OAuth codes;
- database URLs productivas;
- blobs cifrados o descifrados.

Si falta un secreto, reportar el nombre de variable faltante sin pedir el valor.

## Reporte Final

Jean debe entregar:

- paquete Oreshnik recibido;
- rama;
- commit;
- comandos ejecutados;
- validaciones PASS/FAIL;
- lista de drafts/assets disponibles;
- candidato recomendado;
- comando one-post preparado pero no ejecutado;
- blockers;
- handoff actualizado.

## Stop Seguro

Parar si:

- no existe paquete Oreshnik;
- un comando intenta publicar real;
- aparece un token en salida;
- falla vault verify;
- falta aprobacion de Manuel;
- hay cambio no propio en archivo critico;
- se requiere tocar Prisma/auth/security.
