# Deuda técnica — Capacidades avanzadas de publishers por red social

## Estado

Diferido.

Esta deuda técnica queda registrada para ejecutarse después de cerrar los pendientes actuales de publicación base por red social:

1. Meta Facebook Page
2. YouTube
3. TikTok
4. LinkedIn

No debe bloquear el avance actual de integración base. Se retomará cuando HeptaCore tenga publishers estables, OAuth funcional y publicación real comprobada por red.

## Principio rector

En HeptaCore, una capability marcada como `true` significa:

* existe implementación real;
* existen gates de preflight;
* existe validación de formato;
* existe endpoint correcto;
* existe manejo de errores normalizado;
* existe respuesta real del proveedor;
* nunca se genera `externalPostId` falso;
* nunca se marca `PUBLISHED` sin confirmación real del provider.

Por tanto, no se deben activar capabilities solo porque una red social las soporte en documentación.

## Estado actual recomendado de capabilities

### Instagram

```txt
textOnly: false
image: true
video: true
reels: true
story: false
carousel: false
scheduling: false
```

### Facebook Page

```txt
textOnly: true
image: true
video: true
reels: false
story: false
carousel: false
scheduling: false
```

## Deuda técnica pendiente

### S-HC-PUB-IG-STORY

Implementar publicación de Instagram Stories.

Requisitos mínimos:

* usar endpoint/formato compatible con Stories;
* soportar media vertical;
* validar dimensiones, duración, peso y tipo de archivo;
* manejar errores de Meta;
* confirmar publicación real;
* solo entonces activar `story: true`.

### S-HC-PUB-IG-CAROUSEL

Implementar publicación de carruseles en Instagram.

Requisitos mínimos:

* soportar múltiples assets;
* crear contenedores hijos;
* crear contenedor padre con `children`;
* esperar procesamiento si aplica;
* publicar contenedor padre;
* devolver `externalPostId` real;
* solo entonces activar `carousel: true`.

### S-HC-PUB-FB-REELS

Implementar Facebook Page Reels.

Requisitos mínimos:

* usar flujo correcto de Facebook Reels / Video API;
* no reutilizar endpoint simple de `/feed`, `/photos` o `/videos` sin validar;
* validar duración, orientación y formato;
* confirmar publicación real;
* solo entonces activar `reels: true`.

### S-HC-PUB-FB-STORY

Implementar Facebook Page Stories.

Requisitos mínimos:

* identificar endpoint/flujo correcto;
* validar formato específico;
* confirmar publicación real;
* solo entonces activar `story: true`.

### S-HC-PUB-FB-CAROUSEL

Implementar carruseles o multi-image posts de Facebook Page.

Requisitos mínimos:

* definir modelo de assets múltiples;
* mapear respuesta real del provider;
* confirmar publicación real;
* solo entonces activar `carousel: true`.

## Redes posteriores

### YouTube

Debe implementarse como provider separado.

No debe reutilizar lógica de Facebook, Instagram ni TikTok.

Pendiente:

* OAuth Google/YouTube;
* tokenRef propio;
* scopes de subida;
* soporte video;
* subida real vía YouTube Data API;
* estado final solo con respuesta real.

### TikTok

Debe implementarse como provider separado.

Pendiente:

* OAuth TikTok;
* Content Posting API;
* creator_info/query;
* init publish;
* upload/export flow;
* verificación de dominio o URL pública si aplica;
* estado final solo con respuesta real.

### LinkedIn

Debe implementarse como provider separado.

Pendiente:

* OAuth LinkedIn;
* distinguir miembro vs organización;
* URN de autor;
* Posts API;
* scopes correctos;
* estado final solo con respuesta real.

## Regla de cierre

Esta deuda se podrá cerrar solo cuando cada capability avanzada tenga:

* implementación;
* tests o prueba manual documentada;
* dry_run técnico;
* publicación real;
* externalPostId real;
* rollback o error handling definido;
* build limpio;
* typecheck limpio.

Hasta entonces, las capabilities avanzadas deben permanecer en `false`.
