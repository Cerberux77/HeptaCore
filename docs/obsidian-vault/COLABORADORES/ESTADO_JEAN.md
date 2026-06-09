---
type: collaborator-status
project: "HeptaCore"
operator: "Jean"
last_updated: "09/06/26 15:25 VET"
tags:
  - "#jean"
  - "#status"
  - "#closure-pendiente"
---

# Estado Jean

## ALERTA DE CIERRE

El modelo Oreshnik (heredado de TurpialSound) exige que después de cada sprint se ejecute `oreshnik:close`, lo cual:
1. Actualiza docs canónicos (Central, Plan Maestro)
2. Crea rama `MADRE/v{N}` con merge union de docs
3. Escribe `var/sprint-events/{date}_{sprint}_CERRADO.json`
4. **Pushea** la rama hija y la rama madre

**Ninguno de estos pasos se ha ejecutado para los sprints de Jean.** Su trabajo es invisible para el repo y para Manuel.

## S-HC-02 — Reportado como completado (SIN CLOSURE)

| Campo | Valor | Estado real |
|---|---|---|
| Descripción | Prisma seed/importer Turpial + DB service layer | Jean dice que está hecho |
| Rama esperada | `Jean/s-hc-02-prisma-seed-turpial-2026-06-09` | **NO EXISTE** en origin |
| Commits de Jean | — | **CERO** commits |
| Sprint event | — | **NO EXISTE** |
| Entregable | 29 posts + 46 assets en DB, modelos User/Membership/AuditLog | Código atribuible a Manuel, no a Jean |

### Acción requerida (en la máquina de Jean)
```bash
git checkout Jean/s-hc-02-prisma-seed-turpial-2026-06-09
git push origin Jean/s-hc-02-prisma-seed-turpial-2026-06-09
npm run oreshnik:close -- --sprint S-HC-02 --operator Jean --desc "prisma-seed-importer-turpial" --push
```

## S-HC-04 — En curso (Auth + RBAC + AuditLog)

| Campo | Valor | Estado real |
|---|---|---|
| Descripción | Login, sesiones, roles RBAC, AuditLog | Jean dice que empezó |
| Rama esperada | `Jean/s-hc-04-auth-rbac-auditlog-2026-06-09` | **NO EXISTE** en origin |
| Código en repo | `/login` es placeholder de 9 líneas. Sin hashing, sesiones, RBAC guards, ni AuditLog writer | Cero implementación visible |
| Modelos DB | User, Membership, AuditLog existen en schema | Creados por Manuel |

### Acción requerida
```bash
npm run oreshnik:preflight -- --sprint S-HC-04 --operator Jean --desc "auth-rbac-auditlog"
# ... trabajar ...
git add . && git commit -m "feat(auth): implement login, roles RBAC, auditlog"
git push origin Jean/s-hc-04-auth-rbac-auditlog-2026-06-09
# Al terminar:
npm run oreshnik:close -- --sprint S-HC-04 --operator Jean --desc "auth-rbac-auditlog" --push
```

## Próximos Sprints Jean

| Sprint | Depende de | Estado |
|---|---|---|
| S-HC-PROD-03 | S-HC-PROD-00 | assigned |
| S-HC-PROD-04 | S-HC-PROD-02 + S-HC-PROD-03 | depends_on |
| S-HC-PROD-05 | S-HC-PROD-04 + S-HC-PROD-06 | depends_on |
| S-HC-PUB-01 | S-HC-PROD-01 al 06 | depends_on |
