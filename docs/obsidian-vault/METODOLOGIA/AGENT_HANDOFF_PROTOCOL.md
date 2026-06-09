---
type: agent-handoff-protocol
project: "HeptaCore"
last_updated: "2026-06-09"
tags:
  - "#handoff"
  - "#agents"
---

# Agent Handoff Protocol

## Entrada Para Un Agente

Todo prompt operativo debe incluir:

- sprint;
- branch esperada;
- owner humano;
- scope permitido;
- hard stops;
- comandos de validacion;
- documentos canonicos;
- formato de reporte.

## Durante La Sesion

El agente debe:

- ejecutar preflight antes de editar;
- revisar docs y worktree;
- no revertir cambios ajenos;
- documentar bloqueos;
- no pedir secretos en chat;
- no ejecutar publicacion real salvo aprobacion explicita y sprint autorizado.

## Salida Obligatoria

El handoff final debe incluir:

1. rama;
2. commit si existe;
3. archivos creados/actualizados;
4. validaciones y resultado;
5. estado del tenant;
6. blockers;
7. proxima accion exacta.

## Formato Compacto Para `/compact`

Usar este bloque al final de sprints largos:

```txt
Sprint:
Branch:
Commit:
Scope:
Files:
Validations:
Tenant state:
Blockers:
Next Manuel:
Next Jean:
Hard stops:
```
