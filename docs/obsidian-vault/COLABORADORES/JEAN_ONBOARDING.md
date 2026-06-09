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

Jean debe usar su propia rama y no trabajar sobre ramas `Manuel/*`.

## Checkout

```bash
git clone <HEPTACORE_GITHUB_REMOTE_URL>
cd HeptaCore
npm install
git checkout -b Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09
```

Si ya tiene el repo:

```bash
git fetch --all --prune
git status --short
git checkout -b Jean/s-hc-pub-01-turpial-controlled-publishing-2026-06-09
```

## Requisitos

- Node.js 20+.
- npm workspaces.
- Acceso al repo remoto.
- Variables locales solo por canal seguro, nunca por chat.
- No commitear `.env`, `.env.rrss` ni secretos.

## Lectura Inicial

1. [[../00_CENTRAL_HEPTACORE]]
2. [[../METODOLOGIA/METODOLOGIA_ORESHNIK_HEPTACORE]]
3. [[../METODOLOGIA/BUS_CONTROL]]
4. [[../METODOLOGIA/BRANCH_OWNERSHIP]]
5. [[../TENANTS/TURPIAL_SOUND/TENANT_STATUS]]
6. [[../TENANTS/TURPIAL_SOUND/FIRST_PUBLISHING_TEST_PLAN]]

## Preflight

```bash
npm run oreshnik:preflight -- --sprint S-HC-PUB-01 --operator Jean --desc "turpial controlled publishing discovery dry-run"
```

Si hay blockers, parar y resolver antes de editar.

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

- un comando intenta publicar real;
- aparece un token en salida;
- falla vault verify;
- falta aprobacion de Manuel;
- hay cambio no propio en archivo critico;
- se requiere tocar Prisma/auth/security.
