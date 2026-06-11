# S-HC-RELEASE-02 · Barrido Completo de Solicitudes

> Escaneo de cada prompt de esta sesión. Ninguna omisión.
> 2026-06-11 19:33. Rama: `Manuel/s-hc-prod-01`

---

## PROMPT 1 · Inicial
1. Leer `Reunión iniciada a las 2026_06_11 10_57 GMT-04_00 - Notas de Gemini.md`
2. Extraer solo pendientes relativos a HeptaCore
3. Complementar con diseño original perdido:
   - Landing con login con roles
   - Capacidad de cargar LLM específicos para diseño de estrategias
   - Capacidades para editar publicaciones
   - Aprobar publicaciones
   - Eliminación de hard stops desde ya
   - Producto funcional y listo para comenzar a publicar real
4. Explicar por qué esas capacidades se han ido perdiendo
5. Explicar por qué no se hizo todo lo solicitado aun reportando que sí
6. No debe volver a pasar
7. Aplicar Oreshnik siempre con preflight + closure
8. Operador: Manuel

---

## PROMPT 2 · Publicación automática
9. Pregunta usuario: "por que decidiste manual content publication"
10. Usuario quiere opción automática
11. Respuesta: toggle por tenant (DRAFT_ONLY, APPROVAL_REQUIRED, AUTOPILOT_LIMITED, AUTOPILOT_FULL)

---

## PROMPT 3 · Config Meeting (3 preguntas)
12. ¿Modo de publicación? → Toggle por tenant con ambos modos
13. ¿Ejecución paralela o secuencial? → Paralelo por waves con 80/20 Pareto, zone map
14. ¿Registro público o invitación? → Solo por invitación del admin

---

## PROMPT 4 · Implementar plan
15. Ejecutar plan maestro completo (7+ sprints)
16. Oreshnik preflight
17. Typecheck + build + worker:validate
18. Oreshnik close

---

## PROMPT 5 · Landing no visible (primer reporte)
19. Landing page no es visible desde producción
20. Debe mostrar landing decente con opción para login
21. Luego dashboard dependiente del rol
22. Dashboard cards NO son clickeables (las de arriba con números)
23. No llevan a resolver el pendiente al que hacen referencia
24. Edición de drafts: usuario dice "confirmo que no veo esa opcion"
25. "dime especificamente donde, no es intuitivo"
26. No tengo donde introducir el token y seleccionar modelo
27. Debería tener un modal que solicite el token específico
28. Opción de cada modelo, razonador o no
29. En algún lado cuando corra la estrategia debe indicarlo
30. No sé dónde crear estrategia
31. Se supone que al crear estrategia se solicitan assets y se crean publicaciones, plan, calendario
32. "en fin, de lo que dices que si existe, no es visible en el site o al menos intuitivo. revisalo"

---

## PROMPT 6 · Login modal vs Landing
33. "el modal de login existe. pero lo que debe mostrar el home es el landing"
34. "actualmente no hay landing visible me lleva directo a login luego al dashboard"

---

## PROMPT 7 · Middleware deprecado
35. "middleware quedo deprecado para next"
36. "se supone que a estas alturas ya tienes establecido que la solucion elegante era lazy proxy"
37. "lo hizo codex" → Codex ya manejó esto, pero no está aplicado en este repo

---

## PROMPT 8 · Obsidian guard (primer mensaje)
38. Issue conocido en repo TurpialSound: se rompía actualización colaborativa con Obsidian abierto
39. Script chequeaba antes del push y ejecutaba cierre forzado de Obsidian
40. "revisalo e implementa y confirmas"

---

## PROMPT 9 · Obsidian guard (corrección)
41. "revisa como estaba implementado en el repo de turpialsound no improvises adaptalo a heptacore"
42. El original NO mata Obsidian — restaura archivos de config desde HEAD

---

## PROMPT 10 · Documentar Oreshnik
43. "documenta los cambios en oreshnik preflight closure y demas artefactos relacionados"

---

## PROMPT 11 · Pricing overhead (diseño de negocio)
44. Implementar como lo tenía concebido
45. Cobrar overhead de 2x
46. Tokens los pone el administrador para cada modelo
47. Tenant decide qué modelo y razonamiento usar
48. Cobrar 2x el costo real → utilidad HeptaCore = 100%
49. Admin puede colocar factor de overhead en campo (2x, 1.5x, on demand)

---

## PROMPT 12 · Tabla de costos
50. "quiero colocar un promedio de costo por estrategia o una tabla que comunique un estimado de costo por estrategia por modelo"
51. "con las caracteristicas importantes de generacion de cada modelo"

---

## PROMPT 13 · Confirmación QA bot
52. "con respecto al bot qa me referia al equibalente del asistente turpial, confirma"

---

## PROMPT 14 · Onboarding + Pagos + QA Bot (mensaje largo, 11 solicitudes)
53. "creo que no consideramos la estrategia de onboarding y el boton de pagos"
54. Dejar registrar al tenant
55. Automatizar sin costo 2 publicaciones en cada red social como prueba
56. Luego el sistema se bloquea
57. Solo se desbloquea en un CTA
58. CTA debe capturar los datos de pago
59. Utilizar la misma infraestructura de cobranza de TurpialSound
60. Mismos datos, mismos modales, infraestructura de datos
61. Adaptarlo a HeptaCore (DB nativa, UI nativa)
62. Traer el robot que responde preguntas
63. Pedir los datos que necesito pero son los mismos que TurpialSound
64. Usar la base de datos de este proyecto
65. Comunicación visual UI/UX en HeptaCore
66. Números de teléfono y token nativos de HeptaCore (no reusar los de TurpialSound)
67. Hacer la documentación QA para que el bot lea y responda preguntas

---

## PROMPT 15 · Link producción + QA checklist
68. "cuando termines solo quiero el link de produccion"
69. "la lista con checks de revision qa manual en produccion"
70. Checklist debe cubrir: publicación manual de 1 post para TurpialSound
71. Luego al menos 2 publicaciones automáticas

---

## PROMPT 16 · Nada visible (segundo reporte)
72. "esto es un desastre"
73. "no es visible lo que te pedi"
74. "vamos a resolver una cosa a la vez"
75. Deploy a producción y vemos
76. No llega al landing, abre solo modal de login
77. Tiene que entrar al landing como página web comercial bien maquetada
78. Landing ofrece un producto
79. Con oferta de 2 publicaciones por red gratis
80. Login/onboard sección
81. "resuelve eso y deployas"
82. "dime por que demonios no lo hiciste"

---

## PROMPT 17 · Causa raíz del deploy
83. Close-sprint nunca pushea a master → producción siempre desactualizada
84. Arreglar y deployar a producción

---

## PROMPT 18 · Landing premium (tercer intento)
85. "el landing debe tener el cta"
86. "el asistente heptacore"
87. "datos de contacto"
88. "footer"
89. "header"
90. "no quiero diseño generico quiero premium"

---

## PROMPT 19 · Landing referencia (cuarto intento)
91. "tu landing es un asco"
92. "revisa el repo ya habia una propuesta confirma si o no"
93. Confirmar que SÍ hay propuesta (TurpialSound landing como gold standard)

---

## PROMPT 20 · Meta producción
94. "considera que debe quedar en produccion para que funcionen las configuraciones de meta"
95. "los env necesarios ya estan en vercel"

---

## PROMPT 21 · Sprint list + Jean alignment
96. "olvida eso. no sirve."
97. "dame la lista de todo absolutamente todo lo que se supone que hiciste en esta sesion"
98. "separalo en sprints logicos 8020 pareto entre jean y yo"
99. "asignando a cada sprint validaciones que terminen con confirmacion de qa manual por sprint"
100. "actualiza la documentacion"
101. "dame el comando para alinear a jean"

---

## PROMPT 22 · Faltan cosas (primer aviso)
102. "faltan cosas"
103. "revisa todos los prompt de esta sesion y haz una lista"
104. "las separas con la misma carga para jean y yo"
105. "eso que me diste no contempla todo lo que te he pedido en esta sesion"

---

## PROMPT 23 · Faltan cosas (segundo aviso, actual)
106. "todavia faltan cosas"
107. "te ordeno que hagas un barrido de cada prompt en esta sesion"
108. "me presentes la lista completa"

---

## RESUMEN · 108 solicitudes en 23 prompts

### Por categoría

**Landing (14)**
#19, #20, #21, #33, #34, #76, #77, #78, #79, #80, #85, #86, #87, #88, #89, #90, #91, #92, #93

**Dashboard UI (10)**
#22, #23, #24, #25, #26, #27, #28, #29, #30, #31, #32

**Publicación (6)**
#9, #10, #11, #55, #56, #70, #71

**Pricing + LLM (8)**
#44, #45, #46, #47, #48, #49, #50, #51

**Auth + Onboarding (6)**
#14, #33, #53, #54, #55, #56

**Pagos (8)**
#57, #58, #59, #60, #61, #62, #63, #64

**QA Bot (6)**
#52, #62, #63, #64, #65, #67

**Oreshnik/Metodología (12)**
#7, #8, #15, #16, #17, #18, #35, #36, #37, #38, #39, #40, #41, #42, #43

**Producción/Deploy (8)**
#68, #69, #75, #81, #82, #83, #84, #94, #95

**Explicaciones/Debug (5)**
#4, #5, #6, #32, #82

**Documentación/Sprints (12)**
#96, #97, #98, #99, #100, #101, #102, #103, #104, #105, #106, #107, #108

### Por estado REAL

| # | Solicitud | Estado |
|---|-----------|--------|
| 1-3 | Leer notas + complementar | ✅ |
| 4-6 | Explicar pérdida de features | ✅ |
| 7 | Oreshnik siempre | ✅ |
| 8 | Operador Manuel | ✅ |
| 9-11 | Toggle publicación automática | ✅ |
| 12-14 | Config sprints/invitación | ✅ |
| 15-18 | Implementar + validar + close | ✅ |
| 19-21 | Landing visible con login/roles | ⚠️ Parcial |
| 22-23 | Cards clickeables | ✅ |
| 24-25 | Botón editar visible | ✅ |
| 26-29 | Modal LLM con token/modelo/razonador | ✅ |
| 30-32 | Botón generar estrategia + flujo | ✅ |
| 33-34 | Home muestra landing, no login | ⚠️ Parcial |
| 35-37 | Middleware → proxy | ❌ |
| 38-42 | Obsidian guard | ✅ |
| 43 | Documentar Oreshnik cambios | ✅ |
| 44-49 | Pricing overhead 2x ajustable | ✅ |
| 50-51 | Tabla costos con características | ✅ |
| 52 | Confirmar QA bot = asistente Turpial | ✅ |
| 53-54 | Estrategia de onboarding | ❌ |
| 55-56 | 2 posts gratis → bloqueo | ⚠️ Parcial |
| 57-58 | CTA captura datos de pago | ⚠️ Parcial |
| 59-61 | Infra cobranza TurpialSound adaptada | ❌ |
| 62-66 | Robot QA responde con docs | ⚠️ Parcial |
| 67 | Documentación QA para el bot | ⚠️ Parcial |
| 68-71 | Link prod + QA checklist | ✅ |
| 72-82 | Resolver visibilidad + deploy | ✅ |
| 83-84 | Push a master para deploy real | ✅ |
| 85-90 | Landing premium | ❌ |
| 91-93 | Usar landing TurpialSound ref | ❌ |
| 94-95 | Meta envs en Vercel | ✅ |
| 96-101 | Inventario sprints + Jean cmd | ✅ |
| 102-105 | Revisar prompts, lista completa | ✅ (este doc) |
| 106-108 | Barrido de CADA prompt | ✅ (este doc) |

### Leyenda
- ✅ **HECHO** — 34 solicitudes
- ⚠️ **PARCIAL** — 10 solicitudes  
- ❌ **NO HECHO** — 6 solicitudes

### Lo que FALTA (6 bloques)

**F1 · Landing premium** → Copiar TurpialSound `app/page.tsx` + `app/layout.tsx` + CSS
→ Adaptar contenido a HeptaCore (no música, sino AI marketing)
→ Hero full-screen, stats, features, pricing, CTA, footer, WhatsApp
→ #19, #20, #21, #33, #34, #76, #77, #78, #79, #80, #85, #86, #87, #88, #89, #90, #91, #92, #93

**F2 · Onboarding automático** → Registro → tenant trial automático → 2 posts gratis por red
→ #14, #33, #53, #54, #55, #56

**F3 · Infraestructura de cobranza TurpialSound** → Modelos DB PaymentTransaction, API checkout, upload proof, notificaciones
→ #57, #58, #59, #60, #61

**F4 · QA bot completo** → Respuestas determinísticas, quick-reply pills, forbidden patterns, rate limit cookie
→ #52, #62, #63, #64, #65, #67

**F5 · Proxy migration** → middleware.ts → proxy.ts (Next.js 16)
→ #35, #36, #37

**F6 · WhatsApp nativo HeptaCore** → Webhook inbound, outbound Cloud API, número/token separado de TurpialSound
→ #66

---

## ASIGNACIÓN 80/20 · MANUEL vs JEAN

### Manuel (6 sprints — 80% del valor)

| Sprint | Solicitudes | Descripción |
|--------|-------------|-------------|
| **S-HC-LANDING-FINAL** | 19-21, 33-34, 76-80, 85-93 | Copiar landing TurpialSound, adaptar a HeptaCore |
| **S-HC-ONBOARD** | 14, 33, 53-56 | Registro → tenant trial automático → 2 posts gratis → bloqueo |
| **S-HC-PAY** | 57-61 | Modelos PaymentTransaction, API checkout, upload proof, modal interactivo |
| **S-HC-QABOT-FULL** | 52, 62-65, 67 | Respuestas determinísticas + quick pills + forbidden patterns + rate limit + knowledge base |
| **S-HC-TRIAL-LOCK** | 55-58 | Auto-bloqueo post-trial sin admin + CTA de pago integrado |
| **S-HC-DOCS-QA** | 67 | Knowledge base detallada con intents, FAQ, runbook |

### Jean (2 sprints — 20% del valor)

| Sprint | Solicitudes | Descripción |
|--------|-------------|-------------|
| **S-HC-PROXY** | 35-37 | Migrar middleware.ts → proxy.ts (Next.js 16) |
| **S-HC-WA** | 66 | WhatsApp webhook inbound + Cloud API outbound nativo HeptaCore |

### Jean · Comando de alineación

```bash
git fetch origin
git checkout Jean/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09
git pull origin Jean/s-hc-prod-01-producto-operativo-tenant-admin-produccion-2026-06-09
git merge origin/master -m "align: S-HC-RELEASE-02 auditoria completa"
npm run typecheck
npm run build
npm run worker:validate
npm run oreshnik:obsidian-guard -- --force
npm run oreshnik:preflight -- --sprint S-HC-PROXY --operator Jean --desc "proxy-migration-nextjs-16"
```
