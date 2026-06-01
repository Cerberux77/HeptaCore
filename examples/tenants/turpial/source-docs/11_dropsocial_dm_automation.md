# Turpial Sound â€” DropSocial / Instagram DM Automation

**VersiÃ³n:** v1.0 â€” Source Sprint
**Fecha:** 2026-05-30
**Estado:** DRAFT â€” Benchmark estratÃ©gico y diseÃ±o futuro. No se conectÃ³ ninguna herramienta.

---

# DropSocial / Instagram DM Automation

## 1. QuÃ© es DropSocial / Drop-style DM Automation

DropSocial es una sub-marca de referidos de Turpial Sound, documentada en el cÃ³digo base (`components/marketplace/DropSocialButton.tsx`). En su forma actual, permite a creadores de contenido generar links de listings del marketplace y ganar una comisiÃ³n por referidos (10% de la comisiÃ³n de la plataforma = 0.5% del monto vendido).

La automatizaciÃ³n de DMs (Direct Messages) es una capa adicional â€”actualmente inexistente en el proyectoâ€” que permitirÃ­a responder automÃ¡ticamente a mensajes y comentarios en Instagram y Facebook usando palabras clave predefinidas.

**QuÃ© puede hacer una DM automation:**
- Responder a comentarios que contienen una palabra clave especÃ­fica.
- Enviar mensajes directos automÃ¡ticos con informaciÃ³n, enlaces o preguntas.
- Capturar leads y segmentar interesados por tipo de consulta.
- Activar conversaciones automÃ¡ticas iniciales y derivar a humano cuando sea necesario.
- Enviar campaÃ±as o seguimientos a usuarios que interactuaron.
- Medir conversiÃ³n desde comentario/palabra clave hasta acciÃ³n.
- Clasificar leads automÃ¡ticamente (comprador, vendedor, curioso).

**En este sprint:** Solo se diseÃ±a el flujo y las plantillas. No se conecta ninguna herramienta real. No se usa API de Meta. No se instala DropSocial ni ningÃºn servicio de DM automation.

---

## 2. Casos de Uso para Turpial Sound

| # | Caso de Uso | Trigger | Objetivo |
|---|-------------|---------|----------|
| 1 | Comprador interesado en equipo | Usuario comenta "COMPRAR" o pregunta por precio | Enviar link al listing especÃ­fico |
| 2 | Vendedor que quiere publicar | Usuario comenta "VENDER" o pregunta cÃ³mo publicar | Enviar link para crear listing |
| 3 | Usuario que pregunta por compra protegida | Usuario menciona "PROTEGIDO", "SEGURO", "CONFIANZA" | Explicar operaciÃ³n protegida y derivar a humano |
| 4 | Usuario que pregunta por pago, precio o envÃ­o | Usuario menciona "PRECIO", "PAGO", "ENVÃO" | Dar informaciÃ³n general y derivar a humano |
| 5 | Lead desde reel/story | Usuario comenta en un reel | Enviar mensaje con mÃ¡s info sobre el tema del reel |
| 6 | Comunidad musical interesada | Usuario comenta "INFO" o "NOVEDADES" | Enviar enlace a servicios o calendario |
| 7 | Usuario que comenta con keyword especÃ­fica | Keyword definida en campaÃ±a | Activar flujo de mensaje automÃ¡tico + derivaciÃ³n |

---

## 3. Palabras Clave Sugeridas

| Keyword | Canal | IntenciÃ³n del Usuario | Respuesta AutomÃ¡tica Sugerida | CTA | Riesgo / ValidaciÃ³n Humana |
|---------|-------|-----------------------|-------------------------------|-----|---------------------------|
| COMPRAR | IG, FB | Busca equipo para comprar | "Â¡QuÃ© bueno que buscas equipo! Tenemos varios listings activos en el marketplace. Mira el link: [link]. Â¿Buscas algo especÃ­fico?" | Link al marketplace | Bajo |
| VENDER | IG, FB | Quiere publicar equipo | "Publicar tu equipo en el marketplace de Turpial Sound es gratis. Solo pagas 5% de comisiÃ³n si se vende. Crea tu listing aquÃ­: [link]." | Link para crear listing | Medio â€” Confirmar comisiÃ³n vigente |
| MARKETPLACE | IG, FB | Quiere conocer el marketplace | "El marketplace de Turpial Sound es el primer espacio de compra y venta de equipo musical con operaciÃ³n protegida en Venezuela. MÃ­ralo aquÃ­: [link]" | Link al marketplace | Bajo |
| PROTEGIDO | IG, FB | Pregunta por seguridad de compra/venta | "La operaciÃ³n protegida funciona asÃ­: el pago se retiene hasta que el comprador confirma que recibiÃ³ el equipo y estÃ¡ conforme. Simple y transparente." | Link a explicaciÃ³n detallada | Medio â€” No prometer seguridad absoluta |
| PRECIO | IG, FB | Pregunta por precio de algo | "Los precios dependen del equipo o servicio. Para el marketplace, cada listing tiene su precio. Para servicios de estudio, escrÃ­benos por WhatsApp y te cotizamos." | Derivar a WhatsApp | Alto â€” No dar precios exactos sin validaciÃ³n |
| ENVÃO | IG, FB | Pregunta por logÃ­stica de entrega | "La entrega del equipo se coordina entre comprador y vendedor. Podemos orientarte sobre opciones. EscrÃ­benos por WhatsApp para mÃ¡s detalles." | Derivar a WhatsApp | Medio â€” No prometer envÃ­os |
| CONFIANZA | IG, FB | DesconfÃ­a, necesita seguridad | "Entendemos. Llevamos 10+ aÃ±os operando en Caracas. La operaciÃ³n protegida existe para que compres y vendas con respaldo. Pregunta lo que necesites." | Derivar a humano | Alto â€” No prometer garantÃ­as absolutas |
| GUITARRA | IG | Busca guitarra especÃ­ficamente | "Tenemos guitarras en el marketplace. Mira las disponibles aquÃ­: [link]. Â¿Buscas elÃ©ctrica, acÃºstica o clÃ¡sica?" | Link a listings filtrados | Bajo |
| BAJO | IG | Busca bajo | "Bajos disponibles en el marketplace: [link]. Â¿Alguna marca en mente?" | Link a listings filtrados | Bajo |
| TECLADO | IG | Busca teclado/sintetizador | "Teclados y sintetizadores en el marketplace: [link]. Â¿Para estudio o para vivo?" | Link a listings filtrados | Bajo |
| DJ | IG | Busca equipo DJ | "Equipo para DJ en el marketplace: [link]. Controladores, mixers, audÃ­fonos." | Link a listings filtrados | Bajo |
| PEDAL | IG | Busca pedales de efecto | "Pedales en el marketplace: [link]. Overdrive, delay, reverb, lo que busques." | Link a listings filtrados | Bajo |
| AMPLI | IG | Busca amplificador | "Amplificadores en el marketplace: [link]. Â¿Para guitarra o bajo?" | Link a listings filtrados | Bajo |
| INFO | IG, FB | Quiere informaciÃ³n general | "Turpial Sound es un hub de ensayo, grabaciÃ³n y producciÃ³n en Caracas. Estudio, salas y marketplace de equipos. Â¿QuÃ© te interesa mÃ¡s?" | Opciones: Estudio / Salas / Marketplace / Otro | Bajo |
| PUBLICAR | IG, FB | Quiere saber cÃ³mo publicar | "Publicar tu listing toma 3 minutos. Solo necesitas fotos, descripciÃ³n y precio. Empieza aquÃ­: [link]" | Link para crear listing | Bajo |

---

## 4. Flujos de DM Sugeridos (6 flujos mÃ­nimos)

### Flujo 1 â€” Comprador nuevo

**Trigger:** Usuario comenta "COMPRAR" o "PRECIO" en post del marketplace.

1. **Mensaje 1 (automÃ¡tico):** "Hola. Gracias por tu interÃ©s. Â¿Buscas algÃºn equipo en especÃ­fico?"
2. **Mensaje 2 (segÃºn respuesta):**
   - Si responde con equipo especÃ­fico: "Revisa los listings disponibles de [equipo] aquÃ­: [link]."
   - Si dice "no sÃ©" o "estoy viendo": "Mira todo el marketplace aquÃ­: [link]. Si necesitas orientaciÃ³n, dime y te ayudo."
3. **Pregunta de segmentaciÃ³n:** "Â¿Es para ti o para alguien mÃ¡s? Â¿Tienes presupuesto en mente?"
4. **CTA:** "Cualquier duda, aquÃ­ estoy. Si quieres atenciÃ³n personalizada, escrÃ­benos por WhatsApp al +58 416-8017844."
5. **Derivar a humano si:** El usuario pregunta por precios especÃ­ficos, mÃ©todos de pago, envÃ­o, o muestra desconfianza.
6. **Dato a guardar (CRM futuro):** Equipo buscado, presupuesto, canal de entrada, fecha de contacto.

---

### Flujo 2 â€” Vendedor nuevo

**Trigger:** Usuario comenta "VENDER" o "PUBLICAR".

1. **Mensaje 1 (automÃ¡tico):** "Â¿Tienes equipo musical para vender? En Turpial Marketplace puedes publicarlo gratis."
2. **Mensaje 2 (automÃ¡tico):** "Solo pagas una comisiÃ³n del 5% del precio de venta, y solo si se vende. La operaciÃ³n protegida respalda la transacciÃ³n."
3. **Pregunta de segmentaciÃ³n:** "Â¿QuÃ© tipo de equipo quieres vender? (Instrumento / Audio / Estudio / Otro)"
4. **CTA:** "Crea tu listing aquÃ­: [link]. Toma 3 minutos."
5. **Derivar a humano si:** El vendedor tiene dudas sobre comisiones, proceso, pagos, o quiere vender equipo de alto valor.
6. **Dato a guardar:** Tipo de equipo, valor estimado, urgencia de venta, canal de entrada.

---

### Flujo 3 â€” Usuario desconfiado

**Trigger:** Usuario comenta "CONFIANZA", "SEGURO", o "PROTEGIDO".

1. **Mensaje 1 (automÃ¡tico):** "Sabemos que comprar equipo usado genera dudas. Por eso creamos la operaciÃ³n protegida."
2. **Mensaje 2 (automÃ¡tico):** "El dinero no se libera al vendedor hasta que tÃº confirmas que recibiste el equipo y estÃ¡s conforme. Adicionalmente, el equipo de Turpial Sound revisa cada transacciÃ³n."
3. **Pregunta de segmentaciÃ³n:** "Â¿QuÃ© es lo que mÃ¡s te preocupa del proceso?"
4. **CTA:** "Â¿Quieres hablar con una persona del equipo? EscrÃ­benos por WhatsApp al +58 416-8017844."
5. **Derivar a humano inmediatamente si:** El usuario expresa desconfianza significativa, menciona estafas previas, o pregunta por garantÃ­as legales.
6. **Dato a guardar:** Motivo de desconfianza, si se convirtiÃ³ en lead o no.

---

### Flujo 4 â€” Usuario que comenta en Reel

**Trigger:** Usuario comenta en un reel de Turpial Sound con cualquier keyword.

1. **Mensaje 1 (automÃ¡tico):** "Gracias por comentar. Me alegra que te haya llamado la atenciÃ³n el reel."
2. **Mensaje 2 (segÃºn keyword detectada):**
   - Si es "INFO": "Â¿Quieres saber mÃ¡s sobre [tema del reel]?"
   - Si es "DÃ“NDE": "Estamos en Caracas, Venezuela. EscrÃ­benos por WhatsApp para mÃ¡s detalles."
   - Si es un cumplido: "Gracias. Si necesitas grabar o ensayar, aquÃ­ estamos."
3. **CTA:** "Mira mÃ¡s contenido en nuestro perfil. Link en bio para servicios y marketplace."
4. **Derivar a humano si:** El usuario hace preguntas especÃ­ficas no cubiertas por respuestas automÃ¡ticas.
5. **Dato a guardar:** Reel de origen, keyword usada, tipo de interÃ©s.

---

### Flujo 5 â€” Usuario que quiere publicar equipo

**Trigger:** Usuario comenta "PUBLICAR" o pregunta cÃ³mo vender.

1. **Mensaje 1 (automÃ¡tico):** "Publicar en Turpial Marketplace es simple. Solo necesitas fotos del equipo, una descripciÃ³n honesta y el precio que quieres."
2. **Mensaje 2 (automÃ¡tico):** "Una vez publicado, tu listing serÃ¡ visible para toda la comunidad de mÃºsicos. Cuando alguien quiera comprar, la operaciÃ³n protegida respalda la transacciÃ³n."
3. **Pregunta de segmentaciÃ³n:** "Â¿Ya tienes las fotos listas? Podemos darte tips para que tu listing venda mÃ¡s rÃ¡pido."
4. **CTA:** "Crea tu listing aquÃ­: [link]."
5. **Derivar a humano si:** El vendedor necesita ayuda con fotos, precio o descripciÃ³n.
6. **Dato a guardar:** Equipo a vender, si necesita ayuda, si publicÃ³ efectivamente.

---

### Flujo 6 â€” Usuario que quiere saber cÃ³mo funciona la compra protegida

**Trigger:** Usuario pregunta especÃ­ficamente por "cÃ³mo funciona", "compra protegida", "operaciÃ³n protegida".

1. **Mensaje 1 (automÃ¡tico):** "La operaciÃ³n protegida tiene 3 pasos simples:"
2. **Mensaje 2 (automÃ¡tico):** "1. Encuentras el equipo y pagas. El dinero se retiene."
3. **Mensaje 3 (automÃ¡tico):** "2. El vendedor entrega. TÃº revisas el equipo."
4. **Mensaje 4 (automÃ¡tico):** "3. Si todo estÃ¡ conforme, confirmas y el pago se libera."
5. **Mensaje 5 (automÃ¡tico):** "El equipo de Turpial Sound supervisa cada paso. No es automÃ¡tico: hay personas reales revisando."
6. **Pregunta de segmentaciÃ³n:** "Â¿Ya viste algÃºn listing que te interese? Â¿QuÃ© equipo buscas?"
7. **CTA:** "Explora el marketplace aquÃ­: [link]."
8. **Derivar a humano si:** El usuario tiene preguntas sobre casos especÃ­ficos, montos altos, o condiciones especiales.
9. **Dato a guardar:** Nivel de comprensiÃ³n del proceso, interÃ©s en comprar o vender, equipo de interÃ©s.

---

## 5. Plantillas de Mensajes

### Respuestas cortas para DM (10)

1. "Gracias por escribir. Â¿En quÃ© podemos ayudarte?"
2. "Claro. DÃ©jame revisar y te respondo en un momento."
3. "Esa consulta requiere atenciÃ³n personalizada. Â¿Prefieres que te escribamos por WhatsApp?"
4. "El marketplace estÃ¡ en turpialsound.com/marketplace. AhÃ­ puedes ver todos los listings activos."
5. "Para reservar sala o estudio, lo mejor es escribir por WhatsApp al +58 416-8017844."
6. "Los precios dependen del proyecto. EscrÃ­benos por WhatsApp y te cotizamos sin compromiso."
7. "La comisiÃ³n del marketplace es del 5% sobre el precio de venta. Solo si se vende."
8. "Entendemos la duda. Vamos a conectarte con una persona del equipo para que te explique todo."
9. "Gracias por tu interÃ©s en publicar. Crea tu listing aquÃ­: [link]. Es gratis publicar."
10. "No hay preguntas malas. Dime quÃ© necesitas y te orientamos."

### Respuestas para comentarios pÃºblicos (10)

1. "Gracias por el apoyo."
2. "Link en bio para mÃ¡s informaciÃ³n."
3. "EscrÃ­benos por WhatsApp para detalles."
4. "Disponible en el marketplace. Link en bio."
5. "Buen dato. Gracias por compartir."
6. "Etiqueta a alguien que necesite leer esto."
7. "AsÃ­ es. La diferencia estÃ¡ en el detalle."
8. "CuÃ©ntanos tu experiencia si ya has grabado aquÃ­."
9. "Pronto mÃ¡s contenido sobre esto. Estate pendiente."
10. "Gracias por tu pregunta. Te respondimos por mensaje directo."

### Mensajes de seguimiento (5)

1. "Hola de nuevo. Quedamos en que revisarÃ­as el marketplace. Â¿Viste algo que te interese?"
2. "Pasaron unos dÃ­as desde tu consulta. Â¿Sigue en pie tu interÃ©s en grabar/producir?"
3. "Solo para recordarte que tu listing sigue activo. Si necesitas ayuda para que venda mÃ¡s rÃ¡pido, dime."
4. "Â¿Pudiste revisar la informaciÃ³n que te enviamos? Quedamos atentos."
5. "No queremos ser insistentes, solo asegurarnos de que no te quedaron dudas. Â¿Todo bien?"

### Mensajes de cierre (5)

1. "Gracias por tu interÃ©s. Quedamos a la orden por cualquier cosa."
2. "Cualquier duda futura, aquÃ­ estamos. Ã‰xito con tu proyecto."
3. "Gracias por considerar a Turpial Sound. La puerta estÃ¡ abierta cuando lo necesites."
4. "Un placer ayudarte. Nos vemos en el estudio o en el marketplace."
5. "Gracias por confiar. Si conoces a alguien que necesite grabar, ensayar o vender equipo, comparte."

### Mensajes para derivar a atenciÃ³n humana (5)

1. "Esta consulta es importante. Voy a pasarla al equipo para que te respondan con mÃ¡s detalle. Â¿Te parece bien?"
2. "Para darte una respuesta precisa, necesito conectarte con alguien del equipo. Ya te enlazo."
3. "Gracias por tu paciencia. Una persona del equipo te escribirÃ¡ pronto con la informaciÃ³n que necesitas."
4. "Prefiero que esto lo vea alguien con mÃ¡s detalle que yo. Te paso con el equipo."
5. "Para temas de pagos, envÃ­os o reclamos, siempre preferimos que hables con una persona. Te conectamos."

---

## 6. Riesgos y LÃ­mites

1. **No prometer disponibilidad de productos sin verificar.** Los listings pueden venderse en cualquier momento.
2. **No confirmar pagos automÃ¡ticamente.** La revisiÃ³n es manual.
3. **No pedir datos sensibles por DM.** CÃ©dula, direcciÃ³n exacta, datos bancarios = solo por canales seguros.
4. **No enviar links sospechosos.** Solo links oficiales: turpialsound.com y WhatsApp verificado.
5. **No usar claims legales/financieros exagerados.** "Seguro", "garantizado", "100% protegido" no aplican.
6. **No automatizar conversaciones sensibles.** Disputas, pagos, reclamos = siempre humano.
7. **Siempre dejar salida hacia atenciÃ³n humana.** Todo flujo automÃ¡tico debe tener un "hablar con persona".
8. **No sustituir soporte humano en casos crÃ­ticos.** La automatizaciÃ³n asiste, no reemplaza.
9. **No usar presiÃ³n comercial agresiva.** Sin "oferta limitada", "solo hoy", "Ãºltima oportunidad".
10. **Cumplir con las polÃ­ticas de Meta.** La automatizaciÃ³n de DMs debe respetar los tÃ©rminos de uso de Facebook/Instagram.

---

## 7. Requisitos Futuros para IntegraciÃ³n Real

### Herramienta candidata

- **DropSocial-style DM automation:** LÃ³gica de automatizaciÃ³n de DMs para Instagram/Facebook usando palabras clave.
- Alternativas: ManyChat, MobileMonkey, Chatrace, o desarrollo propio usando la API de Meta.

### Requisitos de cuenta Meta Business

- PÃ¡gina de Facebook verificada.
- Cuenta de Instagram conectada a la pÃ¡gina.
- Permisos de administrador en Meta Business Suite.
- RevisiÃ³n de permisos de app si se usa API (`pages_messaging`, `instagram_manage_messages`).

### Permisos necesarios

- `pages_messaging` â€” Para leer y responder mensajes de Facebook.
- `instagram_manage_messages` â€” Para leer y responder mensajes de Instagram.
- `instagram_manage_comments` â€” Para leer y responder comentarios de Instagram.

### Riesgos de privacidad

- Los mensajes automÃ¡ticos no deben almacenar datos personales sin consentimiento.
- Debe existir una polÃ­tica de privacidad que explique el uso de automatizaciÃ³n de mensajes.
- Cumplir con las leyes de protecciÃ³n de datos aplicables en Venezuela.

### Necesidad de polÃ­tica de mensajes

- Informar al usuario que estÃ¡ interactuando con respuestas automÃ¡ticas.
- Ofrecer siempre la opciÃ³n de hablar con una persona real.
- No suscribir a usuarios a listas sin consentimiento explÃ­cito.

### MÃ©tricas futuras a capturar

| MÃ©trica | DescripciÃ³n |
|---------|-------------|
| leads | Contactos nuevos captados vÃ­a DM automation |
| respuestas | Tasa de respuesta a mensajes automÃ¡ticos |
| clicks | Clics en links enviados por DM |
| conversiones | Usuarios que completaron la acciÃ³n deseada (registro, publicaciÃ³n, compra) |
| publicaciones creadas | Listings creados por vendedores captados vÃ­a DM |
| vendedores captados | Nuevos vendedores registrados desde DM automation |
| compradores interesados | Leads de compradores que mostraron intenciÃ³n de compra |

### Variables/env futuras (No crear ahora)

- `DROPSOCIAL_API_KEY` o equivalente â€” solo si se usa un servicio externo.
- `META_PAGE_ACCESS_TOKEN` â€” solo si se integra con API de Meta.
- `DM_AUTOMATION_ENABLED` â€” flag para activar/desactivar.

---

## 8. RecomendaciÃ³n Final

1. **Usarlo manualmente primero.** Antes de automatizar, operar los DMs manualmente por 60-90 dÃ­as para entender patrones reales de conversaciÃ³n.
2. **Probarlo con campaÃ±as pequeÃ±as.** Activar keywords de bajo riesgo (INFO, MARKETPLACE, GUITARRA) antes que las sensibles (CONFIANZA, PRECIO, PROTEGIDO).
3. **No automatizar pagos ni soporte crÃ­tico.** Los flujos de pago, disputas y reclamos siempre deben ser atendidos por humanos.
4. **Usarlo principalmente para captaciÃ³n, educaciÃ³n y redirecciÃ³n.** La DM automation es un primer filtro que califica y deriva, no un reemplazo de la conversaciÃ³n humana.
5. **Hacer revisiÃ³n humana antes de cualquier activaciÃ³n real.** Toda respuesta automÃ¡tica debe ser revisada por al menos 2 personas antes de activarse.
6. **No activar hasta que el marketplace tenga al menos 20 listings activos y 5 transacciones completadas.** Automatizar sin tracciÃ³n real crea expectativas que no se pueden cumplir.

---

**Documento fuente para RRSS Content Bot de Turpial Sound.**
**No se conectÃ³ ninguna herramienta de DM automation, ni DropSocial, ni Meta API.**
**No publicar sin revisiÃ³n humana. No conectar APIs sin autorizaciÃ³n.**
