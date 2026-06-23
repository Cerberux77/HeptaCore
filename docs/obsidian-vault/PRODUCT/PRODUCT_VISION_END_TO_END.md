---
type: product-vision
project: "HeptaCore"
last_updated: "2026-06-22T19:42:00.000Z"
status: "canonical"
tags:
  - "#product"
  - "#vision"
  - "#roadmap"
  - "#heptacore"
---

# HeptaCore — Vision End-to-End

> Fuente operativa: `var/oreshnik/task-board.json`. Este documento define el producto objetivo completo. El backlog de sprints en el task board descompone esta vision en entregables.

## Resumen

HeptaCore es un sistema operativo de marketing multi-tenant con IA que cubre el ciclo completo: landing → registro y pago → onboarding guiado → documento maestro → resolucion de vacios → estrategia con IA → activos requeridos → carga o generacion IA → calendario → aprobacion → publicacion → metricas → mensajes → optimizacion.

## Alcance Final de Formatos y Plataformas

HeptaCore debe soportar, para todas las redes integradas y siempre que las APIs oficiales lo permitan: generacion del contenido, manifiesto de activos, validacion tecnica de activos, preview o simulacion especifica de plataforma, dry-run, aprobacion, programacion, publicacion real, reconciliacion y metricas posteriores.

Reels, Stories, videos y YouTube forman parte obligatoria del alcance final de HeptaCore. Algunas combinaciones todavia estan pendientes de implementacion o validacion real. La arquitectura debe ser extensible a nuevas redes y formatos sin hardcodear toda la logica en la interfaz.

### Matriz de Capacidad por Red y Formato

#### Instagram

| Formato | Preview | Dry-Run | Publicacion Inmediata | Publicacion Programada | Metricas |
|---|---|---|---|---|---|
| Feed imagen | Implementado (PUB-02) | Implementado (REC-00A) | Implementado (REC-00A) | Parcial (SCHEDULED configurable; ejecucion autonoma pendiente en PUB-04) | Pendiente (AN-01) |
| Feed video | Parcial (PUB-02 preview) | Pendiente | Pendiente | Pendiente | Pendiente (AN-01) |
| Carousel | Implementado (PUB-02) | Implementado (PUB-02) | Pendiente (PUB-06) | Pendiente (PUB-06 + PUB-04) | Pendiente (AN-01) |
| Story imagen | Implementado (PUB-02) | Implementado (PUB-02) | Pendiente (PUB-06) | Pendiente (PUB-06 + PUB-04) | Pendiente (AN-01) |
| Story video | Parcial (PUB-02 preview) | Pendiente | Pendiente (PUB-06) | Pendiente (PUB-06 + PUB-04) | Pendiente (AN-01) |
| Reel | Pendiente | Pendiente | Pendiente (PUB-06) | Pendiente (PUB-06 + PUB-04) | Pendiente (AN-01) |

#### Facebook

| Formato | Preview | Dry-Run | Publicacion Inmediata | Publicacion Programada | Metricas |
|---|---|---|---|---|---|
| Feed imagen | Implementado (PUB-02) | Implementado (REC-00A) | Implementado (REC-00A) | Parcial (SCHEDULED configurable; ejecucion autonoma pendiente en PUB-04) | Pendiente (AN-01) |
| Feed video | Parcial (PUB-02 preview) | Pendiente | Pendiente | Pendiente | Pendiente (AN-01) |
| Multiples medios | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente (AN-01) |
| Story imagen | Implementado (PUB-02) | Implementado (PUB-02) | Pendiente (PUB-06) | Pendiente (PUB-06 + PUB-04) | Pendiente (AN-01) |
| Story video | Parcial (PUB-02 preview) | Pendiente | Pendiente (PUB-06) | Pendiente (PUB-06 + PUB-04) | Pendiente (AN-01) |
| Reel | Pendiente | Pendiente | Pendiente (PUB-06) | Pendiente (PUB-06 + PUB-04) | Pendiente (AN-01) |

#### YouTube

| Formato | Preview | Dry-Run | Publicacion Inmediata | Publicacion Programada | Metricas |
|---|---|---|---|---|---|
| Video 16:9 | Pendiente | Pendiente | Pendiente (PUB-07) | Pendiente (PUB-07 + PUB-04) | Pendiente (AN-01) |
| YouTube Short | Pendiente | Pendiente | Pendiente (PUB-07) | Pendiente (PUB-07 + PUB-04) | Pendiente (AN-01) |

### Compatibilidad de Activos (PUB-03)

PUB-03 clasifica la compatibilidad tecnica del activo — no publica, no llama al proveedor, no elimina ni reduce el objetivo final. La clasificacion usa cuatro estados: IDEAL, USABLE, INCOMPATIBLE, UNKNOWN.

| Formato | Clasificacion PUB-03 |
|---|---|
| Instagram Feed | Implementado y validado |
| Instagram Carousel | Implementado y validado |
| Instagram Story | Implementado y validado |
| Instagram Reel | Implementado y validado (compatibilidad de activos; publicacion real pendiente en PUB-06) |
| Facebook Feed imagen | Implementado y validado |
| Facebook Feed video | Implementado y validado |
| Facebook Story/Reel | Implementado y validado (compatibilidad de activos; publicacion real pendiente en PUB-06) |
| YouTube Short | Implementado y validado (compatibilidad de activos; publicacion real pendiente en PUB-07) |
| YouTube Video 16:9 | Implementado y validado (compatibilidad de activos; publicacion real pendiente en PUB-07) |

UNKNOWN se usa cuando faltan datos tecnicos suficientes; no equivale a compatible; no autoriza publicacion; aplica especialmente a assets legacy todavia no analizados. La compatibilidad se calcula desde metadata extraida; el resultado no se persiste como verdad permanente.

Para formatos sin publisher implementado: la compatibilidad de activos esta en desarrollo en PUB-03; el preview/dry-run tiene el estado verificado en la matriz anterior; la publicacion real esta pendiente de implementacion en un sprint especifico; el objetivo final es obligatorio.

## Flujo Comercial

### 1. Landing y Conversion

| Paso | Estado |
|---|---|
| Usuario llega al landing | Implementado |
| Selecciona plan (Free, Pro, Agency) | Pendiente (COMM-02) |
| Crea cuenta y paga o recibe activacion autorizada | Pendiente (COMM-01 + COMM-02) |
| Se crea tenant aislado | Pendiente (COMM-01) |
| El sistema lo lleva al onboarding | Pendiente (ONB-01) |

### 2. Onboarding Inteligente

| Capacidad | Estado |
|---|---|
| Solicitar documento maestro de la empresa | Pendiente (ONB-01) |
| Aceptar documentos, brochures, brand books, catalogos | Pendiente (ONB-01) |
| Extraer informacion estructurada (brand, producto, audiencia, tono) | Pendiente (ONB-01) |
| Identificar datos ausentes, contradicciones y zonas grises | Pendiente (ONB-01) |
| Pedir unicamente la informacion faltante con preguntas dinamicas | Pendiente (ONB-02) |
| Guardar progreso y permitir continuar despues | Pendiente (ONB-02) |
| Reducir friccion, evitar formularios innecesariamente largos | Pendiente (ONB-02) |

### 3. Strategy Workbench con LLM

#### Generacion

| Capacidad | Estado |
|---|---|
| Publico objetivo y segmentos | Pendiente (STRAT-01) |
| Propuesta de valor | Pendiente (STRAT-01) |
| Tono y lenguaje | Pendiente (STRAT-01) |
| Redes recomendadas | Pendiente (STRAT-01) |
| Objetivo por red | Pendiente (STRAT-01) |
| Formatos por red (Feed, Story, Carousel, Reel, Video) | Parcial (PUB-02 define formatos) |
| Volumen y frecuencia | Pendiente (STRAT-01) |
| Fechas y mejores ventanas horarias | Pendiente (STRAT-01) |
| Copy, speech, guion, CTA, hashtags y variantes | Pendiente (STRAT-01) |
| Calendario maestro | Pendiente (STRAT-02) |
| Costo estimado del uso de IA | Pendiente (AI-01) |

#### Interaccion

| Capacidad | Estado |
|---|---|
| Conversar con la IA | Pendiente (STRAT-01) |
| Solicitar cambios | Pendiente (STRAT-01) |
| Comparar versiones | Pendiente (STRAT-01) |
| Aprobar estrategia | Pendiente (STRAT-01) |
| Seleccionar proveedor/modelo/nivel de razonamiento dentro de politica autorizada | Pendiente (AI-01) |
| Mostrar costo estimado antes de ejecutar tareas costosas | Pendiente (AI-01) |

### 4. Manifiesto de Activos

Por cada publicacion, el sistema debe definir:

| Campo | Estado |
|---|---|
| Asset requerido (imagen, video, carousel) | Pendiente (ASSET-01) |
| Tipo y formato por red | Parcial (PUB-02 define formatos) |
| Resolucion y aspect ratio | Parcial (PUB-03 extrae metadata) |
| Duracion (video) | Parcial (PUB-03 extrae metadata) |
| Guideline creativo y contexto de escena | Pendiente (ASSET-01) |
| Branding, logos y brand package | Pendiente (ASSET-01) |

#### Estado del asset

| Estado | Significado |
|---|---|
| Faltante | No cargado |
| Cargado | Subido al sistema |
| Compatible | Pasa validaciones de formato |
| Incompatible | No cumple especificaciones |
| Aprobado | Listo para publicar |
| Generado por IA | Creado via broker de generacion |

#### Decision del cliente

- Suministrarlo (upload manual)
- Pedir ayuda (asistencia guiada)
- Solicitar generacion por IA (broker provider-agnostic, consumo medido y cobrado)

La generacion IA se disena como broker provider-agnostic, sin hardcodear un unico proveedor.

### 5. Seguimiento y Operacion

| Capacidad | Estado |
|---|---|
| Barra de progreso de activos | Pendiente (ASSET-01) |
| CTA directo para cargar cada faltante | Pendiente (ASSET-01) |
| Revision individual y por lotes | Parcial (PUB-02 preview) |
| Calendario de publicaciones | Pendiente (STRAT-02) |
| Cola de drafts | Implementado |
| Pendientes de aprobacion | Implementado |
| Aprobadas | Implementado |
| Programadas | Parcial (configuracion SCHEDULED en UI; ejecucion autonoma por cron pendiente en PUB-04) |
| Publicadas (Facebook Feed, Instagram Feed) | Implementado |
| Bloqueadas / reconciliacion (IN_REVIEW) | Implementado |

### 6. Asistencia

| Canal | Estado |
|---|---|
| Asistente HeptaCore con LLM | Parcial (asistente basico) |
| WhatsApp | Pendiente (SUP-01) |
| Correo | Pendiente (SUP-01) |
| Escalamiento humano | Pendiente (SUP-01) |

### 7. Resultados y Mejora Continua

#### Metricas

| Metrica | Estado | Dependencia |
|---|---|---|
| Alcance y visualizaciones | Pendiente (AN-01) | APIs de plataforma |
| Interacciones | Pendiente (AN-01) | APIs de plataforma |
| Likes | Pendiente (AN-01) | APIs de plataforma |
| Comentarios | Pendiente (AN-01) | APIs de plataforma |
| Compartidos y guardados | Pendiente (AN-01) | APIs de plataforma |
| Metricas por publicacion y campana | Pendiente (AN-01) | OBS-01 |
| Dashboard visual con tendencias | Pendiente (AN-01) | |

#### Engagement

| Capacidad | Estado | Dependencia |
|---|---|---|
| Inbox unificado | Pendiente (INBOX-01) | APIs de plataforma |
| Lectura y respuesta de mensajes/comentarios | Pendiente (INBOX-01) | Permisos de plataforma |
| Clasificacion positiva, negativa y neutral | Pendiente (INBOX-01) | |
| Resumen de temas | Pendiente (INBOX-01) | |

#### Iteracion

| Capacidad | Estado |
|---|---|
| Recomendaciones para siguiente iteracion | Pendiente (OPT-01) |
| Estrategia versionada y mejorada con resultados reales | Pendiente (OPT-01) |
| Comparacion antes/despues por iteracion | Pendiente (OPT-01) |

## Mapa de Sprints por Fase

### Fundacion — COMPLETADO
- S-HC-00 a S-HC-09: foundation, console, auth, worker, adapters, gates

### Recuperacion — COMPLETADO
- S-HC-REC-00A: publishing baseline recovery
- S-HC-REC-00B: cancelled (manual Facebook cleanup)
- S-HC-REC-00C: canonical integration

### Publicacion — EN PROGRESO
- S-HC-PUB-02-MULTIFORMAT-PREVIEW: DONE
- S-HC-PUB-03-MULTITENANT-ASSETS: ACTIVE
- S-HC-PUB-04-HOURLY-BATCH-CRON: PENDING
- S-HC-PUB-05-RECONCILIATION-OPS: PENDING
- S-HC-PUB-06-REELS-STORIES-PUBLISHERS: PENDING
- S-HC-PUB-07-YOUTUBE-PUBLISHING: PENDING
- S-HC-PUB-08-PLATFORM-FORMAT-PARITY: PENDING

### Comercial — PENDIENTE
- S-HC-COMM-01-SELF-SERVICE-SIGNUP
- S-HC-COMM-02-BILLING-ACTIVATION

### Onboarding — PENDIENTE
- S-HC-ONB-01-MASTER-BRIEF-INGESTION
- S-HC-ONB-02-GAP-RESOLUTION-WIZARD

### IA — PENDIENTE
- S-HC-AI-01-LLM-SELECTION-COST-GOVERNANCE

### Estrategia — PENDIENTE
- S-HC-STRAT-01-MASTER-STRATEGY-WORKBENCH
- S-HC-STRAT-02-CONTENT-CALENDAR-BLUEPRINT

### Activos — PENDIENTE
- S-HC-ASSET-01-STRATEGY-ASSET-MANIFEST
- S-HC-AIGEN-01-ASSET-GENERATION-BROKER

### Operaciones — PENDIENTE
- S-HC-OPS-01-CAMPAIGN-REVIEW-DEPLOYMENT

### Observabilidad — PENDIENTE
- S-HC-OBS-01-PUBLISHING-OBSERVABILITY

### Soporte — PENDIENTE
- S-HC-SUP-01-ASSISTED-CUSTOMER-CHANNELS

### Analitica — PENDIENTE
- S-HC-AN-01-CAMPAIGN-PERFORMANCE

### Engagement — PENDIENTE
- S-HC-INBOX-01-UNIFIED-ENGAGEMENT

### Optimizacion — PENDIENTE
- S-HC-OPT-01-SENTIMENT-STRATEGY-ITERATION

### Tenant — PENDIENTE
- S-HC-TEN-02-CEPEG-ONBOARDING

## Principios de Diseno

1. **Estrategia primero, ejecucion despues.** Sin brief procesado no hay estrategia. Sin estrategia aprobada no se generan activos.
2. **Humano en el circuito.** Aprobacion explicita para publicar, gastar, o ejecutar acciones sensibles.
3. **IA como asistente, no como piloto automatico.** El cliente decide, refina y aprueba.
4. **Monetizacion por suscripcion, consumo de IA y servicios opcionales.**
5. **Provider-agnostic.** Sin hardcodear proveedores de IA, almacenamiento ni redes sociales.
6. **Un sprint por vez.** Ejecucion secuencial con dependencias respetadas.
7. **Cero llamadas a proveedores sociales en sprints de preview o clasificacion.**
8. **Ningun formato se declara fuera del alcance del producto.** Reels, Stories, videos y YouTube forman parte obligatoria del alcance final. Si aun no estan implementados, estan pendientes, no excluidos.
