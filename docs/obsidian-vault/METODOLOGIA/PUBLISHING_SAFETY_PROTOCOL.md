---
type: publishing-safety-protocol
project: "HeptaCore"
last_updated: "2026-06-09"
tags:
  - "#publishing"
  - "#safety"
  - "#turpial"
---

# Publishing Safety Protocol

## Regla Principal

HeptaCore no publica en redes reales por defecto. `S-HC-CTRL-01` solo valida control bus y prepara el siguiente sprint. Cualquier publicacion real requiere aprobacion explicita de Manuel y debe limitarse a una plataforma y un post.

## Fases

| Fase | Accion | Permitido en S-HC-PUB-01 |
|---|---|---|
| 1 | Discovery de codigo, cola, assets, conexiones y riesgos | Si |
| 2 | Dry-run de worker | Si |
| 3 | Preparar comando exacto de un post | Si |
| 4 | Gate Manuel explicito | Solo documentar |
| 5 | Publicacion real | No ejecutar sin aprobacion posterior |

## Condiciones Antes De Real Publish

- `npm run typecheck` PASS.
- `npm run build` PASS.
- `npm run worker:validate` PASS.
- Instagram/Facebook vault verify PASS para el provider elegido.
- Candidato de bajo riesgo revisado.
- Plataforma unica elegida.
- Comando exacto preparado y revisado.
- Manuel escribe aprobacion explicita.
- `HEPTACORE_ALLOW_REAL_PUBLISH=I_UNDERSTAND_REAL_RRSS_PUBLICATION` solo se usa en la sesion autorizada.

## Prohibido

- Publicar multiples posts.
- Publicar en ambas plataformas en el primer intento.
- Usar tokens pegados en chat.
- Imprimir tokens.
- Cambiar estado de Meta App.
- Convertir dry-run en publish real sin nuevo gate.

## Rollback / Escalacion

Si hay error antes de publicar:

- detener;
- dejar dry-run/report;
- no reintentar en real;
- documentar blocker.

Si hubo publicacion real no autorizada:

- detener todo;
- avisar a Manuel;
- capturar id/respuesta sin tokens;
- no borrar logs;
- preparar plan manual de retirada desde Meta Business Suite si Manuel lo ordena.
