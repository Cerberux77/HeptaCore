# HeptaCore — Conocimiento Publico para Asistente QA

## Que es HeptaCore
HeptaCore es un sistema operativo de marketing AI multi-tenant. Gestiona estrategia, contenido, RRSS, respuestas, campanas y reporting por cliente. Sin automatizacion sin supervision humana.

## Como funciona
1. El admin del tenant configura el negocio (nombre, oferta, audiencia, voz de marca)
2. Genera una estrategia de contenido con IA (puede elegir entre OpenAI, Anthropic, Gemini, DeepSeek o deterministico)
3. El sistema produce drafts de publicaciones para cada red social (Instagram, Facebook, TikTok, YouTube, LinkedIn, X)
4. Un humano revisa, edita, aprueba o rechaza cada draft
5. Los drafts aprobados se publican en las redes configuradas

## Planes y precios
- Periodo de prueba: 2 publicaciones gratis por red social
- Luego del trial, se requiere activar un plan pago
- Pagos via Pago Movil, Transferencia Bancaria o Binance Pay
- Contacto: WhatsApp +584168017844

## Como registrarse
El registro es por invitacion. El administrador del tenant envia una invitacion al email del usuario. El usuario recibe un link y completa su registro con nombre, email y contrasena.

## Como recuperar contrasena
En la pagina de login, hacer clic en "Olvide mi contrasena". Ingresar el email registrado. Recibiras un link para restablecer la contrasena.

## Roles de usuario
- SUPER_ADMIN: acceso global a todos los tenants
- TENANT_ADMIN: administra un tenant especifico
- OWNER: dueno del tenant
- ADMIN: administrador del tenant
- STRATEGIST: puede generar y editar estrategias
- EDITOR: puede crear y editar contenido
- PUBLISHER: puede publicar contenido
- APPROVER: puede aprobar/rechazar drafts
- ANALYST: puede ver reportes
- VIEWER: solo lectura

## Como generar una estrategia
1. Ir a la vista "Estrategia" en el menu lateral
2. Configurar el LLM: seleccionar provider (OpenAI, Anthropic, Gemini, DeepSeek), modelo, y API key
3. Hacer clic en "Generar estrategia"
4. El sistema produce: titulo, objetivos, posicionamiento, canales, checklist de assets, y plan de drafts
5. El costo se calcula automaticamente y se muestra en pantalla

## Como editar un draft
1. Ir a "Cola de drafts" en el menu lateral
2. Cada card tiene un boton "EDITAR" arriba a la derecha
3. Se pueden modificar: titulo, caption, hashtags
4. Guardar cambios

## Como aprobar o rechazar
1. Seleccionar un draft de la cola
2. En el panel derecho, usar los botones "Aprobar" o "Rechazar"

## Como publicar
1. Los drafts aprobados aparecen en la vista "Publicacion"
2. Seleccionar modo de publicacion: Dry-run (prueba) o Live (real)
3. Confirmar y ejecutar

## Modos de publicacion
- DRAFT_ONLY: solo borradores, sin publicacion real
- APPROVAL_REQUIRED: requiere aprobacion manual antes de publicar
- AUTOPILOT_LIMITED: publicacion automatica con gates minimos
- AUTOPILOT_FULL: publicacion automatica sin intervencion humana

## LLMs disponibles
- OpenAI: GPT-4o, GPT-4o Mini, GPT-4.1, o3 Mini
- Anthropic: Claude 3.5 Haiku, Claude 3.5 Sonnet, Claude 3.7 Sonnet
- Gemini: Gemini 2.0 Flash, Gemini 2.5 Pro
- DeepSeek: DeepSeek Chat, DeepSeek Reasoner
- Deterministico: sin API, genera estrategia base sin costo

## Costos
Cada generacion de estrategia consume tokens del LLM. HeptaCore aplica un overhead configurable por el administrador (default 2x). El tenant paga: costo_API × overhead_factor.

## Redes sociales soportadas
Instagram (feed, reel, story, carousel), Facebook (feed, carousel), TikTok, YouTube, LinkedIn, X.

## Assets requeridos por plataforma
- Instagram Feed: 1080x1080 JPG/PNG
- Instagram Story/Reel: 1080x1920 JPG/PNG/MP4
- Facebook Feed: 1200x630 JPG/PNG
- TikTok: 1080x1920 MP4
- YouTube: 1920x1080 MP4

## Seguridad
- Credenciales OAuth en vault encriptado
- Sin secretos en git
- Sin scraping sin consentimiento
- Sin publicacion real sin aprobacion (segun modo)
- Sin gasto en campanas sin gate

## Soporte
WhatsApp: +584168017844
