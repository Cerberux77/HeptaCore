---
title: "Orquestacion de Agentes HeptaCore"
last_updated: "2026-06-11"
status: "canonical"
scope: "Codex, Kilo, Jean, Manuel"
---

# Orquestacion de Agentes HeptaCore

Este documento es la directiva operativa para mantener alineados a Codex, Kilo, Jean y Manuel. El objetivo es que cualquier agente pueda ejecutar sprints sin perder alcance, sin pisar zonas y sin cerrar trabajo que no haya sido probado.

## 1. Fuente de verdad

Antes de iniciar cualquier sesion:

```bash
npm run oreshnik:status
npm run oreshnik:tasks
```

La carga de trabajo activa vive en:

- `var/oreshnik/task-board.json`
- `docs/07_handoffs/zone-map.json`
- `docs/obsidian-vault/00_CENTRAL_HEPTACORE.md`
- `docs/obsidian-vault/SPRINTS/PLAN_MAESTRO_SPRINTS.md`

Si un alcance no esta en `task-board.json`, no se considera asignado. Si una decision estrategica importante aparece en chat, debe convertirse en tarea, criterio de aceptacion o nota canonica antes de ejecutar.

## 2. Roles de agentes

### Codex

Codex actua como orquestador estrategico y arquitecto tecnico:

- Define arquitectura, dependencias, zonas y criterios de cierre.
- Corrige metodologia Oreshnik y control bus.
- Evita que se pierdan alcances del producto original.
- Decide el encaje de nuevos sprints cuando afectan estrategia, arquitectura o riesgos.
- Debe dejar instrucciones versionadas para Kilo/Jean/Manuel.

### Kilo

Kilo puede ejecutar con autonomia dentro del sprint asignado:

- Puede elegir implementacion concreta si respeta arquitectura, zonas y hard stops.
- Debe leer `task-board.json`, `zone-map.json` y este documento antes de editar.
- No debe degradar funcionalidades existentes para simplificar una entrega.
- Si encuentra una brecha de alcance, debe registrarla en `task-board.json` o detenerse y pedir alineacion.

### Jean

Jean ejecuta sprints asignados a su owner:

- Produccion DB/Auth/env.
- Worker/Redis/integraciones.
- Paid ads engine.
- Paid scraper/discovery compliance.

### Manuel

Manuel ejecuta sprints asignados a su owner:

- LLM provider adapter y estrategia tenant-specific.
- Tenant UI/QA.
- Publishing gate web.
- Landing/onboarding.
- Draft editor.
- Paid ads UI.
- Oreshnik dashboard/control bus.

## 3. Regla anti-colision

No se trabaja simultaneamente sobre la misma zona.

Antes de editar:

```bash
npm run oreshnik:preflight -- --sprint S-HC-XX --operator Manuel --desc "descripcion"
npm run oreshnik:zone -- --sprint S-HC-XX --operator Manuel
```

Jean reemplaza `--operator Manuel` por `--operator Jean`.

Si `zone-check` reporta zona exclusiva de otro operador:

1. No editar ese archivo.
2. Registrar bloqueo en el handoff.
3. Pedir doble lock si es estrictamente necesario.

Zonas criticas con doble lock:

- Prisma schema/migrations.
- Auth/security/session/RBAC.
- Token vault/secret handling.
- Publicacion real.
- Paid spend real.
- Real scraping.

## 4. Hard stops permanentes

Por defecto esta prohibido:

- Publicar en RRSS reales.
- Gastar presupuesto de campanas.
- Ejecutar scraping real.
- Hacer bulk messaging.
- Guardar credenciales en git.
- Saltar approval gates.

Estas acciones solo se desbloquean con aprobacion explicita y sprint propio de produccion, nunca como efecto colateral.

## 5. Criterio obligatorio de pruebas

Ningun sprint se cierra si no cumple su matriz de pruebas. El cierre Oreshnik sin pruebas es invalido.

### Pruebas base para todo sprint

```bash
npm run typecheck
npm run build
npm run worker:validate
```

Tambien debe pasar:

```bash
npm run oreshnik:zone -- --sprint S-HC-XX --operator <Operador>
```

### Pruebas adicionales por tipo de sprint

#### Web/UI

- Verificar flujo manual en navegador local o produccion segun sprint.
- Confirmar que no hay texto cortado, acciones invisibles ni estados ambiguos.
- Para flujos criticos: login, tenant, aprobar/rechazar, editar draft, dry-run.

#### DB/Auth/Env

- `npx prisma validate` o equivalente del workspace.
- Migraciones aplicadas o simuladas segun ambiente.
- Seed verificado con conteos esperados.
- Smoke login con usuario de prueba.
- No secretos en git.

#### Worker/Integraciones

- `npm run worker:validate`.
- Dry-run ejecutado sin publicacion real.
- Logs verificables.
- No dependencia de proceso persistente en Vercel serverless.

#### LLM Provider Adapter

- Adapter seleccionable por env.
- Fallback deterministico local/offline.
- Salida estructurada validable.
- No API key en git.
- Estrategia tenant-specific auditable antes de crear/aprobar drafts.

#### Paid Ads

- Gasto real bloqueado por defecto.
- Calculo de plataforma + 35% overhead + total cliente.
- Approval gate obligatorio.
- AuditLog de decision.

#### Paid Scraper/Discovery

- Scraping real bloqueado por defecto.
- Mock/dry-run disponible.
- Matriz compliance documentada.
- Consentimiento/alcance del tenant registrado antes de cualquier proveedor pago.

## 6. Definition of Done

Un sprint solo puede cerrarse cuando:

1. Acceptance criteria del `task-board.json` estan cumplidos.
2. Pruebas base pasan.
3. Pruebas especificas por tipo pasan.
4. No hay working tree sucio no explicado.
5. No hay hard stop violado.
6. Documentacion/handoff se actualizo.
7. `oreshnik:close` se ejecuta solo despues de lo anterior.

Comando de cierre:

```bash
npm run oreshnik:close -- --sprint S-HC-XX --operator <Operador> --desc "descripcion"
```

Usar `--push` solo cuando el cierre esta listo para compartir:

```bash
npm run oreshnik:close -- --sprint S-HC-XX --operator <Operador> --desc "descripcion" --push
```

## 7. Regla de no degradacion

No se elimina ni reduce una funcionalidad del producto original salvo que:

1. Se documente el motivo.
2. Se cree una tarea de reemplazo o mejora.
3. Se mantenga la ruta de usuario equivalente.

Funcionalidades que no deben desaparecer:

- Modificar/editar posts antes de aprobar.
- Landing comercial y onboarding de clientes.
- Estrategia especifica por tenant con LLM provider adapter.
- Approval queue y hard gates.
- Paid ads con 35% overhead y aprobacion.
- Paid scraper/discovery con compliance y bloqueo por defecto.
- Reports/AuditLog/handoff.
- Prueba final Turpial Sound.

## 8. Como debe operar Kilo

Kilo puede decidir implementacion, pero debe respetar esta secuencia:

1. Leer `npm run oreshnik:tasks`.
2. Tomar solo el sprint asignado al operador correspondiente.
3. Ejecutar preflight.
4. Revisar `zone-map.json`.
5. Implementar sin invadir zonas.
6. Ejecutar matriz de pruebas.
7. Actualizar docs/handoff.
8. Cerrar solo si todo pasa.

Si Kilo detecta que una tarea necesaria no existe, debe agregarla al backlog antes de implementarla o pedir alineacion.

## 9. Estado objetivo final

La release final debe demostrar con `turpial-sound`:

- Landing/onboarding visible.
- Login funcional.
- Tenant con estrategia y assets.
- LLM strategy adapter operativo o fallback deterministico.
- Draft editable.
- Draft aprobable/rechazable.
- Dry-run publish sin publicacion real.
- AuditLog/report visible.
- Paid ads proposal con 35% overhead sin gasto real.
- Discovery/scraper bloqueado o en dry-run compliance.
- Worker validate, typecheck y build verdes.
