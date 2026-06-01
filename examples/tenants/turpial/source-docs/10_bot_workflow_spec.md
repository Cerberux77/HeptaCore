# Turpial Sound â€” RRSS Content Bot: EspecificaciÃ³n Futura

**VersiÃ³n:** v1.0 â€” Source Sprint
**Fecha:** 2026-05-30
**Estado:** DRAFT â€” EspecificaciÃ³n de diseÃ±o. No implementar sin autorizaciÃ³n.

---

## 1. PropÃ³sito

Definir cÃ³mo podrÃ­a funcionar un bot/generador de contenido para las redes sociales de Turpial Sound, partiendo de la base documental creada en este sprint. El bot no existe aÃºn. Este documento establece los requisitos para construirlo en el futuro.

---

## 2. Inputs del Bot

| Input | Fuente | Formato |
|-------|--------|---------|
| Estrategia de RRSS | `docs/marketing/rrss/00_rrss_strategy.md` | Markdown |
| Voz de marca | `docs/marketing/rrss/01_brand_voice.md` | Markdown |
| Pilares de contenido | `docs/marketing/rrss/02_content_pillars.md` | Markdown |
| Calendario editorial | `docs/marketing/rrss/05_calendar_30_days.md` | Markdown |
| Posts existentes | `docs/marketing/rrss/06_posts_batch_01.md` | Markdown |
| Guiones de reels | `docs/marketing/rrss/07_reels_stories_scripts.md` | Markdown |
| Inventario de assets | `docs/marketing/rrss/08_asset_inventory.md` | Markdown |
| Plantillas de DM | `docs/marketing/rrss/11_dropsocial_dm_automation.md` | Markdown |
| ConfiguraciÃ³n del bot | `docs/marketing/rrss/bot-config.json` (futuro) | JSON |

---

## 3. Outputs del Bot

| Output | DescripciÃ³n |
|--------|-------------|
| Post nuevo (draft) | Copy, hashtags, CTA, asset sugerido |
| Calendario actualizado | Calendario con nuevos posts insertados |
| Reel script nuevo | Guion de reel con escenas y texto |
| Story script nuevo | Secuencia de stories |
| Carrusel nuevo | Slides con copy y asset |
| Variante de post | Mismo contenido adaptado a otro canal |
| Reporte de engagement | MÃ©tricas agregadas desde bitÃ¡cora manual |

---

## 4. Carpetas del Bot

```
docs/marketing/rrss/
  â”œâ”€â”€ output/            # Posts generados por el bot
  â”‚   â”œâ”€â”€ draft/         # Sin revisar
  â”‚   â”œâ”€â”€ reviewed/      # Revisados por humano
  â”‚   â”œâ”€â”€ scheduled/     # Programados en Meta Business Suite
  â”‚   â””â”€â”€ published/     # Ya publicados (con fecha y mÃ©tricas)
  â”œâ”€â”€ assets/            # Referencias a assets del repo
  â”œâ”€â”€ templates/         # Plantillas de posts por formato
  â””â”€â”€ logs/              # Registro de actividad del bot
```

---

## 5. Estados del Contenido

| Estado | Significado | TransiciÃ³n |
|--------|-------------|------------|
| `draft` | Generado por el bot, no revisado | â†’ `reviewed` (humano aprueba) |
| `reviewed` | Aprobado por humano, listo para programar | â†’ `scheduled` (se programa en MBS) |
| `scheduled` | Programado en Meta Business Suite | â†’ `published` (se publica en fecha) |
| `published` | Publicado en redes sociales | â†’ `archived` (con mÃ©tricas) |
| `rejected` | Rechazado por el revisor humano | â†’ archivo (no se publica) |
| `archived` | HistÃ³rico con mÃ©tricas registradas | Estado final |

---

## 6. Validaciones Humanas Obligatorias

El bot NUNCA debe publicar sin revisiÃ³n humana. Validaciones obligatorias:

1. **Copy:** Verificar contra la guÃ­a de voz de marca. Sin superlativos ni promesas exageradas.
2. **Datos:** Precios, nombres de artistas, disponibilidad. Sin revisiÃ³n humana = no se publica.
3. **Assets:** Verificar que el asset referenciado existe, es propio y no infringe derechos.
4. **Permisos:** Si hay personas en la imagen, verificar autorizaciÃ³n.
5. **CTA:** Que sea apropiado, concreto y no engaÃ±oso.
6. **Timing:** Que no coincida con eventos negativos, noticias sensibles o contextos inapropiados.

---

## 7. Posible IntegraciÃ³n Futura con Meta API

**Solo para fase v3 (muy futuro). No implementar ahora.**

Si en el futuro se decide integrar con la API de Meta (Graph API) para publicar:

- **Endpoint:** `POST /{page-id}/feed` para Facebook, `POST /{ig-user-id}/media` para Instagram.
- **Permisos necesarios:** `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
- **Token:** Page Access Token (nunca User Token).
- **Variables de entorno necesarias:** `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`.
- **NO crear estas variables. NO solicitar estos tokens ahora.**

---

## 8. Variables de Entorno Futuras (No Crear Ahora)

| Variable | PropÃ³sito | CuÃ¡ndo pedirla |
|----------|-----------|----------------|
| `META_PAGE_ACCESS_TOKEN` | Publicar en FB/IG vÃ­a API | Solo en fase v3 |
| `META_APP_ID` | ID de app de Meta | Solo en fase v3 |
| `META_APP_SECRET` | Secreto de app de Meta | Solo en fase v3 |
| `META_PAGE_ID` | ID de la pÃ¡gina de FB | Solo en fase v3 |
| `IG_USER_ID` | ID del usuario de Instagram | Solo en fase v3 |
| `DROPSOCIAL_API_KEY` | API key de DropSocial | Solo si se contrata el servicio |
| `RRSS_CONTENT_BOT_ENABLED` | Flag para activar el bot | Solo en fase v2+ |

---

## 9. LÃ­mites de Seguridad (No Negociables)

1. **El bot NUNCA publica sin revisiÃ³n humana.** Esto es una regla de diseÃ±o, no una preferencia.
2. **El bot NUNCA responde DMs automÃ¡ticamente mÃ¡s allÃ¡ de mensajes de bienvenida predefinidos.**
3. **El bot NUNCA accede a datos de clientes ni transacciones del marketplace.**
4. **El bot NUNCA confirma pagos, disponibilidad ni resultados.**
5. **El bot NUNCA usa nombres de artistas sin una whitelist explÃ­cita aprobada por el cliente.**
6. **El bot NUNCA publica mÃ¡s de N posts por dÃ­a (lÃ­mite configurable).**
7. **El bot SIEMPRE genera en carpeta `draft/`. Solo un humano mueve a `reviewed/`.**
8. **El bot SIEMPRE registra cada acciÃ³n en logs inmutables.**

---

## 10. QuÃ© Puede Automatizarse (y CuÃ¡ndo)

### Fase v1 â€” Manual (Actual)
- Todo es manual. El bot no existe. Un humano publica siguiendo los documentos de este sprint.
- Documentos fuente: `00-12_*.md`.
- Workflow: `09_meta_business_suite_manual_workflow.md`.

### Fase v2 â€” Semi-automÃ¡tica (Futuro: 60-90 dÃ­as despuÃ©s de v1)
- El bot genera drafts de posts nuevos a partir del calendario y las plantillas.
- El bot sugiere hashtags y assets del inventario.
- El bot actualiza el calendario y el registro de aprendizaje.
- **El humano revisa, edita y publica manualmente.**
- Variables: `RRSS_CONTENT_BOT_ENABLED=true`.

### Fase v3 â€” API/Scheduler (Futuro lejano: solo si v2 funciona por 6+ meses)
- El bot programa posts en Meta Business Suite vÃ­a API.
- El bot captura mÃ©tricas de posts publicados.
- **El humano sigue siendo el decisor final. La API publica, no decide.**
- Variables: `META_*` + permisos de pÃ¡gina.

---

## 11. Riesgos Legales, Reputacionales y Operativos

| Riesgo | Impacto | MitigaciÃ³n |
|--------|---------|------------|
| Publicar contenido no revisado con error de copy | Reputacional | RevisiÃ³n humana obligatoria en todas las fases |
| Publicar nombre de artista sin autorizaciÃ³n | Legal | Whitelist explÃ­cita de artistas aprobados |
| Publicar precio incorrecto | Operacional / Confianza | No publicar precios exactos sin validaciÃ³n |
| DM automatizado inapropiado | Reputacional | Solo respuestas pre-aprobadas estÃ¡ticas |
| Publicar en contexto inapropiado (crisis, luto nacional) | Reputacional | Override manual siempre disponible |
| Token de Meta comprometido | Seguridad | Tokens con mÃ­nimo scope. RotaciÃ³n. No en cÃ³digo. |
| Violar ToS de Meta por automatizaciÃ³n | Operacional (bloqueo de cuenta) | Cumplir polÃ­ticas de Meta. Mantener humano en el loop. |
| Dependencia excesiva del bot | Operacional | El bot asiste, no reemplaza. Documentar flujo manual siempre. |

---

## 12. Flujo Recomendado

### v1 â€” Manual (ya documentado)
1. Humano revisa calendario.
2. Humano selecciona o escribe post.
3. Humano verifica contra guÃ­as.
4. Humano programa en Meta Business Suite.
5. Humano monitorea y responde.

### v2 â€” Semi-automÃ¡tico (futuro)
1. Bot lee calendario y sugiere posts para la semana.
2. Bot genera draft en `output/draft/`.
3. Humano revisa y mueve a `output/reviewed/`.
4. Humano programa en Meta Business Suite manualmente.
5. Bot registra en calendario y bitÃ¡cora.

### v3 â€” API (futuro lejano)
1. Bot genera drafts.
2. Humano revisa y aprueba.
3. Bot programa vÃ­a API de Meta.
4. Bot captura mÃ©tricas vÃ­a API.
5. Humano monitorea y ajusta estrategia.

---

## 13. Regla de Oro

> El bot propone. El humano dispone. El bot publica solo si el humano dijo "sÃ­" explÃ­citamente. Nunca al revÃ©s.

---

**Documento fuente para RRSS Content Bot de Turpial Sound.**
**EspecificaciÃ³n de diseÃ±o. No implementar sin autorizaciÃ³n. No crear tokens, env vars ni APIs.**
**No publicar sin revisiÃ³n humana. No conectar APIs sin autorizaciÃ³n.**
