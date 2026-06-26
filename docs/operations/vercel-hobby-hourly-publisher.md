# ADR — Publicador aproximadamente horario en Vercel Hobby

**Estado:** Aprobado
**Ámbito:** HeptaCore / publicación programada
**Última verificación documental:** 2026-06-26
**Decisión canónica:** 24 cron jobs diarios, uno por cada hora UTC.

## Problema

El plan Hobby de Vercel permite hasta 100 cron jobs por proyecto, pero cada definición cron puede ejecutarse como máximo una vez al día. Por ello, una sola expresión horaria:

```cron
0 * * * *
```

no es válida en Hobby y puede hacer fallar el deployment.

HeptaCore necesita una activación aproximada en cada hora para procesar publicaciones programadas sin depender de precisión al minuto.

## Decisión

HeptaCore usa 24 definiciones cron distintas. Cada definición se ejecuta una sola vez al día y cubre una hora UTC diferente:

```json
{
  "crons": [
    { "path": "/api/cron/publisher?slot=00", "schedule": "0 0 * * *" },
    { "path": "/api/cron/publisher?slot=01", "schedule": "0 1 * * *" },
    { "path": "/api/cron/publisher?slot=02", "schedule": "0 2 * * *" }
  ]
}
```

La matriz continúa hasta `slot=23` con `schedule: "0 23 * * *"`.

Esta configuración utiliza:

- 24 de los 100 cron jobs permitidos por proyecto;
- una ejecución diaria por cada definición;
- aproximadamente 24 invocaciones diarias;
- aproximadamente 720 invocaciones en un mes de 30 días;
- aproximadamente 744 invocaciones en un mes de 31 días.

## Invariantes obligatorios

1. `vercel.json` contiene exactamente 24 cron jobs del publicador.
2. Las horas UTC son únicas y completas: `00` a `23`.
3. Cada expresión tiene forma `0 H * * *` y se ejecuta una sola vez al día.
4. Está prohibido reemplazar la matriz por `0 * * * *` mientras el proyecto use Hobby.
5. slot es únicamente un identificador de observabilidad. No limita la elegibilidad del trabajo.
6. Cada invocación procesa todo job elegible con `scheduledFor <= now`, en orden oldest-first.
7. El sistema recupera backlog. Un job no se pierde porque una invocación anterior no haya llegado.
8. El sistema es idempotente y tolera invocaciones duplicadas.
9. El endpoint no depende de que Vercel invoque exactamente al minuto cero.
10. `CRON_SECRET` sigue siendo obligatorio y fail-closed.

## Precisión temporal

En Hobby, Vercel puede ejecutar un cron en cualquier momento dentro de la hora indicada. Por ejemplo, `0 8 * * *` puede llegar entre `08:00:00` y `08:59:59`.

Por esa razón, `slot=08` no significa «procesar solo publicaciones de las 08:00». El worker consulta el estado durable y procesa todo lo vencido hasta el instante real de ejecución.

## Entrega best-effort

Vercel documenta que una invocación puede omitirse por errores transitorios y que, ocasionalmente, una misma ejecución puede entregarse más de una vez. Por ello:

- el worker reclama jobs de forma atómica;
- no vuelve a publicar evidencia durable de éxito;
- procesa backlog en la siguiente ejecución disponible;
- no asume entrega exactamente una vez.

## Cambio futuro a Pro

En Pro puede considerarse una sola expresión `0 * * * *`. Ese cambio requiere:

1. decisión explícita de infraestructura;
2. actualización de este ADR;
3. actualización del test de arquitectura cron;
4. actualización del gate `pub04-contract`;
5. verificación de deployment.

No debe hacerse como «simplificación» incidental.

## Nota comercial

La compatibilidad técnica de esta matriz con los límites cron de Hobby es independiente de los términos del plan. Vercel restringe Hobby a uso personal no comercial. Antes de operar HeptaCore comercialmente en Production debe evaluarse o adoptarse Pro/Enterprise.

## Verificación automática

La decisión está protegida por:

- `apps/web/lib/__tests__/vercel-cron-hobby-plan.test.ts`
- `scripts/goal-runner/pub04-contract-gate.mjs`
- `scripts/goal-runner/pub04-contract-manifest.json`

Un cambio que elimine horas, duplique slots, use `0 * * * *` o reduzca la matriz a un solo cron debe fallar automáticamente.

## Fuentes oficiales

- Vercel — Usage & Pricing for Cron Jobs
  https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel — Managing Cron Jobs
  https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Vercel — Cron Jobs overview
  https://vercel.com/docs/cron-jobs
- Vercel — Fair Use Guidelines
  https://vercel.com/docs/limits/fair-use-guidelines
