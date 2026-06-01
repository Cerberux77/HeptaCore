---
type: resilience-policy
project: "HeptaCore"
last_updated: "2026-06-01T00:00:00.000Z"
tags:
  - "#resilience"
  - "#reassignment"
---

# Resiliencia y Reasignacion

## Objetivo

Evitar que la ausencia de Manuel o Jean congele la ruta critica hacia el primer tenant publicando.

## Estados

| Estado | Significado |
|---|---|
| ready | Puede comenzar |
| active | En ejecucion |
| blocked | Requiere decision o dependencia |
| pending | Espera dependencia |
| done | Cerrado |

## Regla de Reasignacion

Una tarea puede reasignarse si:

1. El owner no esta disponible.
2. El owner no puede avanzar por bloqueo externo.
3. La tarea esta en ruta critica.
4. El backup puede avanzar sin violar locks.

Registrar:

```bash
npm run oreshnik:reassign -- --task S-HC-02 --to Manuel --reason "bloqueo de disponibilidad"
```

## Locks que no se saltan

- Prisma/Auth/Security: lock doble.
- Tokens/OAuth: no se implementan con credenciales reales.
- Publicacion real: approval humano obligatorio.
- Gasto en campanas: approval humano obligatorio.

## Fallbacks

| Bloqueo | Fallback |
|---|---|
| DB no lista | JSON seed/mock desde `examples/tenants/turpial` |
| Auth no lista | Tenant fijo local `turpial` |
| Meta API no lista | Mock adapter dry-run |
| Assets faltantes | Checklist con bloqueo y fallback copy-only |
| Jean ausente | Manuel toma data/worker con mock |
| Manuel ausente | Jean toma DB/auth/worker y deja UI minima |
