# ADR â€” Publicador aproximadamente horario en Vercel Hobby

**Estado:** Aprobado
**Ãmbito:** HeptaCore / publicaciÃ³n programada
**Ãšltima verificaciÃ³n documental:** 2026-06-26
**DecisiÃ³n canÃ³nica:** 24 cron jobs diarios, uno por cada hora UTC.

## Problema

El plan Hobby de Vercel permite hasta 100 cron jobs por proyecto, pero cada definiciÃ³n cron puede ejecutarse como mÃ¡ximo una vez al dÃ­a. Por ello, una sola expresiÃ³n horaria:

```cron
0 * * * *
```

no es vÃ¡lida en Hobby y puede hacer fallar el deployment.

HeptaCore necesita una activaciÃ³n aproximada en cada hora para procesar publicaciones programadas sin depender de precisiÃ³n al minuto.

## DecisiÃ³n

HeptaCore usa 24 definiciones cron distintas. Cada definiciÃ³n se ejecuta una sola vez al dÃ­a y cubre una hora UTC diferente:

```json
{
  "crons": [
    { "path": "/api/cron/publisher?slot=00", "schedule": "0 0 * * *" },
    { "path": "/api/cron/publisher?slot=01", "schedule": "0 1 * * *" },
    { "path": "/api/cron/publisher?slot=02", "schedule": "0 2 * * *" }
  ]
}
```

La matriz continÃºa hasta `slot=23` con `schedule: "0 23 * * *"`.

Esta configuraciÃ³n utiliza:

- 24 de los 100 cron jobs permitidos por proyecto;
- una ejecuciÃ³n diaria por cada definiciÃ³n;
- aproximadamente 24 invocaciones diarias;
- aproximadamente 720 invocaciones en un mes de 30 dÃ­as;
- aproximadamente 744 invocaciones en un mes de 31 dÃ­as.

## Invariantes obligatorios

1. `vercel.json` contiene exactamente 24 cron jobs del publicador.
2. Las horas UTC son Ãºnicas y completas: `00` a `23`.
3. Cada expresiÃ³n tiene forma `0 H * * *` y se ejecuta una sola vez al dÃ­a.
4. EstÃ¡ prohibido reemplazar la matriz por `0 * * * *` mientras el proyecto use Hobby.
5. slot es Ãºnicamente un identificador de observabilidad. No limita la elegibilidad del trabajo.
6. Cada invocaciÃ³n procesa todo job elegible con `scheduledFor <= now`, en orden oldest-first.
7. El sistema recupera backlog. Un job no se pierde porque una invocaciÃ³n anterior no haya llegado.
8. El sistema es idempotente y tolera invocaciones duplicadas.
9. El endpoint no depende de que Vercel invoque exactamente al minuto cero.
10. `CRON_SECRET` sigue siendo obligatorio y fail-closed.

## PrecisiÃ³n temporal

En Hobby, Vercel puede ejecutar un cron en cualquier momento dentro de la hora indicada. Por ejemplo, `0 8 * * *` puede llegar entre `08:00:00` y `08:59:59`.

Por esa razÃ³n, `slot=08` no significa Â«procesar solo publicaciones de las 08:00Â». El worker consulta el estado durable y procesa todo lo vencido hasta el instante real de ejecuciÃ³n.

## Entrega best-effort

Vercel documenta que una invocaciÃ³n puede omitirse por errores transitorios y que, ocasionalmente, una misma ejecuciÃ³n puede entregarse mÃ¡s de una vez. Por ello:

- el worker reclama jobs de forma atÃ³mica;
- no vuelve a publicar evidencia durable de Ã©xito;
- procesa backlog en la siguiente ejecuciÃ³n disponible;
- no asume entrega exactamente una vez.

## Cambio futuro a Pro

En Pro puede considerarse una sola expresiÃ³n `0 * * * *`. Ese cambio requiere:

1. decisiÃ³n explÃ­cita de infraestructura;
2. actualizaciÃ³n de este ADR;
3. actualizaciÃ³n del test de arquitectura cron;
4. actualizaciÃ³n del gate `pub04-contract`;
5. verificaciÃ³n de deployment.

No debe hacerse como Â«simplificaciÃ³nÂ» incidental.

## Nota comercial

La compatibilidad tÃ©cnica de esta matriz con los lÃ­mites cron de Hobby es independiente de los tÃ©rminos del plan. Vercel restringe Hobby a uso personal no comercial. Antes de operar HeptaCore comercialmente en Production debe evaluarse o adoptarse Pro/Enterprise.

## VerificaciÃ³n automÃ¡tica

La decisiÃ³n estÃ¡ protegida por:

- `apps/web/lib/__tests__/vercel-cron-hobby-plan.test.ts`
- `scripts/goal-runner/pub04-contract-gate.mjs`
- `scripts/goal-runner/pub04-contract-manifest.json`

Un cambio que elimine horas, duplique slots, use `0 * * * *` o reduzca la matriz a un solo cron debe fallar automÃ¡ticamente.

## Fuentes oficiales

- Vercel â€” Usage & Pricing for Cron Jobs
  https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel â€” Managing Cron Jobs
  https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Vercel â€” Cron Jobs overview
  https://vercel.com/docs/cron-jobs
- Vercel â€” Fair Use Guidelines
  https://vercel.com/docs/limits/fair-use-guidelines
