---
title: "Manual de Usuario HeptaCore"
last_updated: "2026-06-10"
status: "pre-produccion operativa"
tenant_piloto: "turpial-sound"
---

# Manual de Usuario HeptaCore

HeptaCore es una consola operativa multi-tenant para planificar, revisar, aprobar y ejecutar publicaciones de RRSS con control humano. El estado actual es pre-produccion operativa: login, dashboard, cola, assets, reportes, readiness y dry-run web estan implementados; publicacion real sigue bloqueada por diseno.

## 1. Acceso

### URL local o produccion

- Produccion esperada: `https://heptacore.vercel.app`
- Tenant piloto: `/tenant/turpial-sound`
- Admin global: `/admin`
- Login: `/login`

### Inicio de sesion

1. Abrir `/login`.
2. Ingresar usuario o email.
3. Ingresar contrasena.
4. Presionar `Entrar`.

El sistema acepta credenciales por email y, para cuentas sembradas, puede aceptar username cuando el seed lo define. Si las credenciales fallan, la pantalla muestra `Credenciales invalidas`.

### Sesion requerida

El middleware protege todas las rutas privadas. Si no hay cookie de sesion valida, el usuario es redirigido a `/login?callbackUrl=...`.

## 2. Roles y permisos

Los permisos se calculan por membresia de tenant. Roles relevantes:

- `OWNER`: control completo del tenant.
- `ADMIN` / `TENANT_ADMIN`: administracion operativa.
- `APPROVER`: puede aprobar/rechazar drafts.
- `PUBLISHER`: puede ejecutar dry-run de publicacion.
- `VIEWER`: lectura, sin acciones sensibles.
- `SUPER_ADMIN`: administracion global cuando aplique.

Para ejecutar dry-run desde la UI, el usuario debe tener uno de estos roles: `OWNER`, `ADMIN`, `APPROVER`, `PUBLISHER`, `SUPER_ADMIN` o `TENANT_ADMIN`.

## 3. Admin Global

Ruta: `/admin`

Objetivo: ver el estado consolidado de todos los tenants.

Funciones:

- Ver totales de tenants, drafts, aprobados, assets y pendientes de revision.
- Abrir el tenant piloto con `Abrir tenant piloto`.
- Revisar tabla de tenants con modo, drafts, aprobados, agenda y assets.
- Revisar actividad reciente registrada en `AuditLog`.

Uso recomendado:

1. Entrar a `/admin`.
2. Confirmar que existen tenants y drafts.
3. Verificar si hay aprobados listos para dry-run.
4. Entrar al tenant desde la tabla.

## 4. Consola de Tenant

Ruta: `/tenant/turpial-sound`

La consola de tenant es el centro de operacion diaria. Sus vistas principales son:

- Operaciones
- Estrategia
- Cola de drafts
- Activos
- Cronograma
- Checklist
- Reportes
- Publicacion

### Operaciones

Muestra el estado rapido del tenant:

- Total de drafts en DB.
- Pendientes de criterio humano.
- Drafts aprobados.
- Assets importados.
- Proxima fecha de publicacion.

Acciones:

- `Revisar cola`: abre la cola de drafts.
- Seleccionar un item de aprobacion inmediata para revisar detalle.
- Ver preview del siguiente post con asset, caption, red, formato y riesgo.

### Estrategia

Muestra la estrategia activa del tenant:

- Proyecto.
- Oferta o descripcion.
- Voz de marca.
- Pilares de contenido.

Uso:

1. Revisar que la oferta y voz correspondan al tenant.
2. Confirmar que los pilares tengan sentido comercial.
3. Si la estrategia no esta alineada, corregir datos fuente antes de aprobar contenido masivo.

### Cola de drafts

Muestra todos los drafts no publicados ordenados por fecha.

Cada draft incluye:

- Titulo.
- Red y formato.
- Estado.
- Fecha programada.
- Nivel de riesgo.
- Asset vinculado.
- Caption.
- Hashtags.

Acciones:

- `Aprobar`: cambia el draft a `APPROVED`.
- `Rechazar`: cambia el draft a `REJECTED`.

Regla operativa:

- Solo aprobar contenido que tenga asset correcto, caption valido, CTA correcto y riesgo aceptable.
- Drafts con riesgo medio/alto o `requiresReview=true` deben revisarse manualmente.

### Activos

Muestra los assets importados del tenant.

Cada asset incluye:

- Preview cuando existe archivo.
- Nombre de archivo.
- Tipo: imagen/video/etc.
- Estado de derechos.
- Cantidad de drafts vinculados.

Uso:

1. Confirmar que los assets carguen visualmente.
2. Detectar assets sin relacion con drafts.
3. Verificar que no haya faltantes antes de ejecutar readiness.

### Cronograma

Muestra la agenda propuesta de publicaciones.

Cada fila incluye:

- Fecha.
- Titulo.
- Red.
- Formato.
- Estado.
- Riesgo.

Uso:

1. Revisar orden de publicaciones.
2. Abrir cualquier item para verlo en la cola.
3. Ajustar fuera del sistema si el calendario estrategico no corresponde.

### Checklist

Valida preparacion minima del tenant:

- Perfil de marca completado.
- Proyecto definido.
- Cuentas sociales conectadas.
- Al menos un draft aprobado.
- Credenciales OAuth configuradas.
- Voz de marca y CTA definidos.
- Assets validados.
- Ventanas horarias configuradas.

Interpretacion:

- Checks incompletos no siempre bloquean la navegacion, pero si bloquean una operacion responsable.
- OAuth y credenciales son condicion critica para publicacion real; no para dry-run local.

### Reportes

Muestra metricas operativas:

- Total de drafts.
- Drafts que requieren revision.
- Drafts sin assets.
- Conteo por estado.
- Conteo por red.
- Actividad reciente.

Uso:

1. Verificar si la cola esta avanzando.
2. Detectar cuellos de botella por estado.
3. Auditar actividad reciente antes de cerrar sprint o ejecutar pruebas.

### Publicacion / Readiness Gate

Esta vista controla la salida de contenido.

Gates principales:

- Al menos un draft aprobado.
- Draft aprobado con asset vinculado.
- Credenciales OAuth del tenant en vault.
- Sin publicaciones reales previas cuando se esta en dry-run.
- Modo dry-run activo.
- Sin credenciales reales en git.
- Approval queue funcional.
- Dry-run ejecutable desde la web.

#### Ejecutar dry-run

1. Ir a `Publicacion`.
2. Confirmar que existe un draft aprobado.
3. Activar el checkbox: `Manuel aprueba ejecutar este dry-run controlado`.
4. Presionar `Ejecutar dry-run`.

Resultado esperado:

- El endpoint `/api/publishing/publish` valida sesion, tenant, rol, draft aprobado y asset.
- No publica en redes reales.
- Cambia el draft a `SCHEDULED`.
- Registra `publish_dry_run_scheduled` en `AuditLog`.
- Devuelve un `externalPostId` con prefijo `dryrun_`.

Restricciones:

- Si `mode` no es `dry-run`, responde 403.
- Si no hay aprobacion manual, responde 400.
- Si el rol no permite publicar, responde 403.
- Si el draft no esta `APPROVED`, responde 409.
- Si el draft no tiene asset, responde 409.

## 5. Hard Stops

Estas acciones estan bloqueadas hasta aprobacion explicita y configuracion productiva:

- Publicacion real en RRSS.
- Gasto de campanas.
- Scraping real.
- Commit de credenciales.
- Cambios de Prisma/auth/security sin doble lock.
- Cierre de sprint sin actualizar vault.

## 6. Operacion Oreshnik para usuarios tecnicos

Antes de trabajar:

```bash
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
```

Jean usa:

```bash
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Jean --desc "descripcion"
```

Durante el trabajo:

- `npm run oreshnik:status`: ver rama, madre declarada, madre efectiva y sprint events.
- `npm run oreshnik:zone -- --sprint S-HC-XX --operator Manuel`: validar zonas tocadas.
- `npm run oreshnik:tasks`: ver task board.

Antes de cerrar:

```bash
npm run typecheck
npm run build
npm run worker:validate
npm run oreshnik:close -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
```

Usar `--push` solo cuando la documentacion de cierre fue revisada y la rama madre debe compartirse.

## 7. Recuperacion y rollback

Si un dry-run queda mal:

1. Verificar que no hubo publicacion real.
2. Revisar `AuditLog` para ubicar `publish_dry_run_scheduled`.
3. Volver el draft de `SCHEDULED` a `DRAFT` o `APPROVED` segun corresponda.
4. Limpiar jobs pendientes si existe worker/Redis.
5. Documentar el incidente en el vault.

Si Oreshnik apunta a una madre que no existe:

1. Ejecutar `npm run oreshnik:status`.
2. Revisar `Mother` y `Effective`.
3. Si `Effective` existe, se puede trabajar; el preflight usara esa referencia.
4. En el siguiente cierre, `close` debe crear una nueva MADRE real desde la rama hija.

## 8. Estado actual conocido

- Login con NextAuth Credentials implementado.
- RBAC por membresia implementado.
- Admin global implementado.
- Tenant dashboard implementado.
- Cola de aprobacion implementada.
- Assets y cronograma implementados.
- Reportes y AuditLog implementados.
- Readiness gate y dry-run desde UI implementados.
- Lazy Prisma proxy validado por build local.
- Publicacion real no habilitada.
- Worker persistente/Redis productivo pendiente.
- Variables productivas de DB/Auth/encryption deben verificarse en Vercel antes de considerar produccion definitiva.
