---
type: postmortem
project: "HeptaCore"
incident: "Vercel production build failure after Jean's 9-sprint integration"
date: "2026-06-09"
severity: "blocked-production"
---

# Postmortem: Vercel Build Failure

## Cronología

| Hora (VET) | Evento |
|---|---|
| ~17:20 | Merge de MADRE/v14 (Jean 9 sprints) → master → push |
| ~17:21 | Vercel deploy production: **Error** (32s) |
| ~17:30-18:20 | 4 deploys más: 2 Error, 2 Ready (otro código) |
| ~18:30 | Diagnóstico local: `npm run build` falla con `PrismaClientInitializationError` |
| ~18:40 | Fix: lazy PrismaClient via Proxy en `apps/web/lib/prisma.ts` |
| ~18:41 | Build exitoso local. Push a master. Vercel desplegando. |

## Causa raíz

**Archivo:** `apps/web/lib/prisma.ts` (Jean, commit `d93818e`)

```typescript
// CÓDIGO PROBLEMÁTICO — instanciación ANSIOSA
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function makePrisma() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  //                                             ^^^^^^^^^^^^^^^^^^^^^^
  //                                             undefined durante el build de Vercel
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = makePrisma();
//                    ^^^^^^^^^^^^
//                    Se ejecuta al IMPORTAR el módulo, no al usar Prisma
```

**Mecanismo de fallo:**
1. `next build` en Vercel importa todos los módulos del proyecto
2. `apps/web/app/page.tsx` → importa `auth.ts` → importa `prisma.ts`
3. `prisma.ts` ejecuta `new pg.Pool({ connectionString: undefined })` → error
4. `new PrismaClient({ adapter: brokenAdapter })` → `PrismaClientInitializationError`
5. Next.js no puede recolectar page data → build aborta

**Por qué no fallaba antes:** el código previo a Jean no usaba `@prisma/adapter-pg` ni instanciaba PrismaClient ansiosamente. La app original usaba Prisma solo en runtime vía API routes que se ejecutan bajo demanda.

## Solución

**Archivo:** `apps/web/lib/prisma.ts` (fix commit `aaedc0e`)

```typescript
// SOLUCIÓN — Proxy perezoso. PrismaClient NUNCA se instancia al importar.
let _client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (!_client) {
    _client = new PrismaClient();
  }
  return _client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();  // solo aquí se crea PrismaClient
    const value = (client as any)[prop];
    if (typeof value === "function") return value.bind(client);
    return value;
  },
}) as unknown as PrismaClient;
```

El Proxy difiere la construcción de PrismaClient hasta el primer acceso real a una propiedad (`prisma.user.findUnique(...)`), que ocurre en runtime con `DATABASE_URL` disponible.

## Prevención de recurrencia

Regla agregada a `AGENTS.md` Hard Stops:

> **No instanciar clientes de base de datos (Prisma, pg, redis) a nivel de módulo.**  
> Usar lazy initialization: Proxy, getter, o `globalThis` cache con construcción diferida.  
> El build de Next.js en Vercel NO tiene `DATABASE_URL`. Si el módulo lanza al importar, el build truena.

### Checklist para nuevos módulos que toquen base de datos

- [ ] ¿El `new PrismaClient()` está DENTRO de una función, no a nivel módulo?
- [ ] ¿El `new pg.Pool()` o cualquier conexión está DENTRO de una función?
- [ ] ¿`npm run build` pasa sin `DATABASE_URL` definida?
- [ ] ¿Hay `export const dynamic = "force-dynamic"` en pages/api routes que usen Prisma?
