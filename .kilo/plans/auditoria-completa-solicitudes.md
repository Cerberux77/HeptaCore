# S-HC-RELEASE-02 — Auditoria Completa de Solicitudes

> Generado 2026-06-11 19:31. Revisa todos los prompts de esta sesión.
> Rama: `Manuel/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09`
> Master: `7223cc9`

---

## SOLICITUDES DEL USUARIO (extracto por prompt)

### P1 — Inicial
- [ ] Leer notas de reunión → extraer pendientes HeptaCore
- [ ] Complementar con diseño original perdido:
  - [ ] Landing con login/roles
  - [ ] Cargar LLM específicos para estrategia
  - [ ] Editar publicaciones
  - [ ] Aprobar publicaciones
  - [ ] Eliminar hard stops
  - [ ] Producto funcional listo para publicar real
- [ ] Aplicar Oreshnik preflight + closure
- [ ] Operador Manuel

### P2 — Publicación automática
- [ ] Toggle por tenant: manual vs automático (draft_only, approval_required, autopilot_full)

### P3 — Configuración (Reunión)
- [ ] Eliminar hard stops en admin panel
- [ ] Habilitar edición en cola de drafts
- [ ] Eliminar bloqueos manuales
- [ ] Landing con registro/login/roles
- [ ] Cards del tablero clickeables que navegan
- [ ] Hora en cronograma (no solo fecha)
- [ ] Configuración LLM por tenant (admin-only)
- [ ] Edición interactiva de estrategia (pilares, canales)
- [ ] Reordenamiento de drafts
- [ ] Panel de assets con especificaciones
- [ ] Cronograma con hora y vistas día/semana/mes
- [ ] Preview de post con frame de red social

### P4 — Modelo de cobro (pricing)
- [ ] Overhead 2x (100% utilidad HeptaCore)
- [ ] Admin configura overheadFactor por tenant
- [ ] Tenant elige modelo y razonador
- [ ] Cobro = costo_API × overheadFactor
- [ ] Ajustable on demand (1.5x, 3x, etc.)

### P5 — Tabla de costos
- [ ] Promedio de costo por estrategia por modelo
- [ ] Características importantes de cada modelo (tier, velocidad, razonador)
- [ ] Visible en admin console y dashboard tenant

### P6 — Confirmación QA bot
- [ ] QA bot = equivalente al Asistente Turpial (MarketplaceAssistant)

### P7 — Onboarding + Pagos + QA Bot (mensaje largo)
- [ ] Onboarding: registro automático con 2 posts gratis por red
- [ ] Bloqueo post-trial automático
- [ ] CTA que captura datos de pago
- [ ] **Usar misma infraestructura de cobranza de TurpialSound:**
  - [ ] Mismos datos de pago (Pago Móvil, Transferencia, Binance)
  - [ ] Mismos modales de checkout
  - [ ] Misma infraestructura de datos (MpTransaction, MpOrder)
  - [ ] Adaptado a HeptaCore (DB nativa, UI nativa)
- [ ] **Traer el robot que responde preguntas:**
  - [ ] Lee documentación y responde
  - [ ] Mismos datos que TurpialSound (token, infraestructura)
  - [ ] Números de teléfono y tokens NATIVOS de HeptaCore
  - [ ] Comunicación visual UI/UX en HeptaCore
- [ ] **Crear documentación QA** para que el bot lea y responda

### P8 — Link producción + QA checklist
- [ ] Link de producción (heptacore.vercel.app)
- [ ] QA checklist manual desde landing hasta 1 post manual + 2 automáticos

### P9 — Landing no visible
- [ ] Landing muestra página comercial, no modal de login
- [ ] Middleware permite `/` sin auth
- [ ] Status cards clickeables
- [ ] Botón EDITAR visible
- [ ] LLM config accesible desde tenant dashboard
- [ ] Botón "Generar estrategia" visible

### P10 — Middleware deprecado
- [ ] Migrar middleware.ts → proxy.ts (Next.js 16)

### P11 — Obsidian guard
- [ ] Traer script de TurpialSound que evita conflictos con Obsidian
- [ ] Implementar sin matar el proceso (restaurar .obsidian/ desde HEAD)
- [ ] Integrar en preflight y close-sprint

### P12 — Documentar Oreshnik
- [ ] Documentar cambios en preflight, close-sprint, zone-map, package.json

### P13 — Landing premium
- [ ] Header, CTA, asistente, datos contacto, footer
- [ ] Diseño premium, no genérico

### P14 — Landing existente
- [ ] Usar TurpialSound landing como referencia (NO el mío)

### P15 — Inventario + sprints 80/20 + Jean
- [ ] Lista de TODO lo hecho en esta sesión
- [ ] Separar en sprints 80/20 Pareto
- [ ] Asignar entre Jean y Manuel
- [ ] QA manual por sprint
- [ ] Comando alineación para Jean
- [ ] Actualizar documentación (plan maestro, task board, zone map)

### P16 — Faltan cosas
- [ ] Revisar TODOS los prompts y hacer lista exhaustiva
- [ ] Separar Jean / Manuel
- [ ] No omitir nada

---

## ESTADO REAL DE CADA SOLICITUD

| # | Solicitud | Estado | Archivos/Notas |
|---|-----------|--------|----------------|
| 1 | Leer notas reunión | ✅ | Notas procesadas |
| 2 | Landing con login/roles | ✅ | `/` público, `/register`, `/login`, RBAC |
| 3 | Cargar LLM específicos | ✅ | Modal LLM en estrategia, admin console |
| 4 | Editar publicaciones | ✅ | Botón EDITAR en cada card |
| 5 | Aprobar publicaciones | ✅ | Botones Aprobar/Rechazar |
| 6 | Eliminar hard stops | ✅ | `PUBLISHING_HARD_STOP=false` en Vercel |
| 7 | Producto funcional publicar real | ✅ | Typecheck+build+worker validate PASS |
| 8 | Toggle autopilot por tenant | ✅ | `automationMode` respetado en publish API |
| 9 | Cards clickeables navegables | ✅ | StatusCard con onClick |
| 10 | Hora en cronograma | ✅ | `scheduledFor` con datetime completo |
| 11 | Config LLM por tenant | ✅ | `apps/web/app/api/admin/llm-config` |
| 12 | Estrategia editable | ✅ | `apps/web/app/api/strategy/update` |
| 13 | Reordenar drafts | ✅ | `apps/web/app/api/drafts/reorder` + ▲▼ |
| 14 | Asset specs panel | ✅ | Dimensiones por plataforma |
| 15 | Calendario día/semana/mes | ✅ | Toggle vista con grid |
| 16 | Preview red social | ✅ | `platform-preview` + frame IG/FB |
| 17 | Overhead 2x + pricing | ✅ | `packages/core/src/pricing.ts` |
| 18 | Tabla costos por modelo | ✅ | Dashboard + admin console |
| 19 | QA bot (asistente) | ⚠️ PARCIAL | FAB + API + knowledge base creados. Falta: |
| | | ❌ | Sistema de respuestas determinísticas por intent (como TurpialSound) |
| | | ❌ | Forbidden pattern filter |
| | | ❌ | Rate limit cookie-based (TurpialSound usa cookie, nosotros userId) |
| | | ❌ | Quick-reply pills/botones de preguntas frecuentes |
| 20 | Onboarding + trial + bloqueo | ⚠️ PARCIAL | |
| | | ✅ | Trial gate en publish API (cuenta posts por network) |
| | | ✅ | Banner trial activo/agotado en dashboard |
| | | ✅ | Modal de pago con datos TurpialSound |
| | | ❌ | **Registro automático de tenant trial** (flujo: llega al landing → se registra → recibe tenant trial automáticamente) |
| | | ❌ | **Auto-bloqueo post-trial** sin intervención admin |
| 21 | Infraestructura cobranza TurpialSound | ❌ NO HECHO | Solo hice un modal HTML estático. Falta: |
| | | ❌ | Modelos DB: MpTransaction, MpOrder |
| | | ❌ | API de checkout |
| | | ❌ | Upload de comprobante de pago |
| | | ❌ | Sistema de notificaciones |
| | | ❌ | Flujo completo: iniciar pago → subir proof → validar → activar tenant |
| 22 | WhatsApp nativo HeptaCore | ❌ NO HECHO | |
| | | ❌ | Número/token de WhatsApp NATIVO de HeptaCore (separado de TurpialSound) |
| | | ❌ | Webhook de WhatsApp inbound |
| | | ❌ | Notificaciones outbound (Cloud API) |
| | | ❌ | Integración con el QA bot |
| 23 | Documentación QA para bot | ⚠️ PARCIAL | `docs/qa/heptacore-knowledge.md` existe pero es básico |
| | | ❌ | Falta knowledge base detallada con intents/respuestas como TurpialSound |
| 24 | Link producción | ✅ | `https://heptacore.vercel.app` |
| 25 | QA checklist manual | ✅ | Checklist de 8 bloques (landing→auth→estrategia→cola→publish→auto→calendar→admin) |
| 26 | Middleware → proxy | ❌ NO HECHO | Sigue con deprecation warning en Next.js 16 |
| 27 | Obsidian guard | ✅ | `scripts/oreshnik/obsidian-guard.mjs` integrado |
| 28 | Documentar Oreshnik cambios | ✅ | zone-map.json, package.json, preflight, close-sprint |
| 29 | Landing premium | ❌ RECHAZADO | 3 iteraciones, ninguna aceptada. Usuario pidió usar TurpialSound como template |
| 30 | Landing TurpialSound-inspired | ⚠️ PARCIAL | Adaptación hecha pero usuario dijo "olvida eso, no sirve". Template existe en `Turpialsound/turpialsound/app/page.tsx` |
| 31 | Inventario sprints 80/20 | ⚠️ PARCIAL | 11 sprints documentados pero INCOMPLETOS — faltan los items arriba |
| 32 | Comando alineación Jean | ✅ | Documentado en plan maestro |

---

## LO QUE FALTA — Priorizado 80/20

### 🔴 Crítico (80% del valor faltante)

**F1. Landing page usando TurpialSound como template real**
- Copiar estructura de `Turpialsound/turpialsound/app/page.tsx` y adaptar a HeptaCore
- HeroSection, StatsBar, Pricing, CTASection, StackingSection
- Usar mismo diseño premium: dark bg, teal accent, tipografía limpia
- **Owner: Manuel**

**F2. Onboarding automático completo**
- Flujo: Usuario llega al landing → se registra → automáticamente tiene tenant trial con 2 posts gratis
- Al agotar trial, el sistema bloquea y muestra CTA de pago
- Sin intervención del admin para activar el trial
- **Owner: Manuel**

**F3. Sistema de pago con infraestructura TurpialSound**
- Modelos DB: PaymentTransaction, PaymentProof (adaptados de MpTransaction, PaymentProof)
- API de checkout: iniciar pago, subir comprobante
- Modal de pago interactivo (no estático)
- Flujo: seleccionar método → ver datos → subir proof → notificar admin
- **Owner: Manuel**

**F4. QA bot completo (equivalente Asistente Turpial)**
- Respuestas determinísticas por intent (comprar, vender, precio, pago, etc.)
- Quick-reply pills en el chat
- Rate limit cookie-based
- Forbidden pattern filter
- Fallback a LLM solo si no hay match determinístico
- **Owner: Manuel**

**F5. Proxy migration (middleware → proxy)**
- Renombrar `middleware.ts` → `proxy.ts`
- Adaptar a nueva API de Next.js 16
- **Owner: Jean** (infraestructura)

### 🟡 Medio (20% restante)

**F6. WhatsApp nativo HeptaCore**
- Webhook inbound
- Notificaciones outbound vía Cloud API
- Número/token separado de TurpialSound
- **Owner: Jean**

**F7. Documentación QA completa**
- Knowledge base detallada con intents
- Runbook de operador
- FAQ público
- **Owner: Jean** (vault/docs)

---

## SPRINTS FINALES — 80/20 Jean/Manuel

### Manuel (7 sprints)

| Sprint | Descripción | QA Manual |
|--------|-------------|-----------|
| **S-HC-LANDING-01** | Landing TurpialSound-template adaptado a HeptaCore | Abrir / sin sesión → hero + stats + features + pricing + CTA |
| **S-HC-ONBOARD-01** | Registro automático → tenant trial → 2 posts gratis por red | Registrar usuario nuevo → verificar tenant trial creado → ver banner "2 posts libres" |
| **S-HC-PAY-01** | Modelos DB Payment + API checkout + modal interactivo | Iniciar pago → seleccionar método → subir comprobante → ver notificación |
| **S-HC-QABOT-02** | Respuestas determinísticas + quick-reply pills + rate limit | Abrir asistente → click en pill → ver respuesta instantánea sin llamar LLM |
| **S-HC-QABOT-03** | Forbidden pattern filter + fallback LLM | Preguntar "dame el API key" → ver respuesta de seguridad |
| **S-HC-TRIAL-02** | Auto-bloqueo post-trial sin intervención admin | Publicar 2 posts en IG → verificar bloqueo automático → CTA visible |
| **S-HC-DOCS-01** | Documentación QA knowledge base detallada | Bot responde correctamente 10 preguntas del runbook |

### Jean (2 sprints)

| Sprint | Descripción | QA Manual |
|--------|-------------|-----------|
| **S-HC-PROXY-01** | Migrar middleware.ts → proxy.ts (Next.js 16) | Build sin deprecation warning → rutas públicas/privadas funcionales |
| **S-HC-WA-01** | WhatsApp webhook + outbound nativo HeptaCore | Enviar mensaje al número HeptaCore → ver respuesta del bot |

---

## Jean — Comando de alineación

```bash
git fetch origin
git checkout Jean/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09
git pull origin Jean/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09
git merge origin/master -m "align: master con S-HC-RELEASE-02 completo"
npm run typecheck
npm run build
npm run worker:validate
npm run oreshnik:obsidian-guard -- --force
npm run oreshnik:preflight -- --sprint S-HC-PROXY-01 --operator Jean --desc "proxy-migration-nextjs-16"
```
