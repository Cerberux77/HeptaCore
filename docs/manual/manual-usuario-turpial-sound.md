# Manual de Usuario — Turpial Sound

## Acceso

1. Navegar a `https://heptacore.vercel.app/login`
2. Ingresar con credenciales de operador (rol `APPROVER` o superior)
3. El sistema redirige al dashboard del tenant asignado

## Navegacion del Console

El sidebar izquierdo contiene:

| Vista | Icono | Funcion |
|---|---|---|
| Operaciones | Gauge | Estado general: total drafts, pendientes, aprobados, assets, proximo hito |
| Estrategia | Bot | Estrategia activa: proyecto, oferta, voz de marca, pilares de contenido |
| Cola de drafts | ClipboardList | Lista cronologica de publicaciones con preview, approve/reject |
| Activos | PackageSearch | Galeria de assets importados con metadata |
| Cronograma | CalendarDays | Calendario de publicaciones propuesto |
| Checklist | Check | Gates de preparacion (marca, proyecto, cuentas, credenciales) |
| Reportes | FileText | Resumen por estado, red y actividad reciente |
| Publicacion | LockKeyhole | Readiness gate y dry-run controlado |

## Flujo de Trabajo Diario

### 1. Revisar Operaciones
- Verificar `Pendientes` (requieren criterio humano)
- Verificar `Aprobados` (listos para dry-run)
- Confirmar que el proximo hito tiene fecha

### 2. Revisar Estrategia
- Confirmar que la estrategia activa refleja el proyecto, oferta y voz de marca
- Si la estrategia necesita regeneracion: `POST /api/strategy/generate` con `{ "tenantSlug": "turpial-sound" }`
- La generacion usa LLM si `LLM_PROVIDER` esta configurado, o fallback deterministico

### 3. Revisar Cola de Drafts
- Hacer clic en cada draft para ver preview, caption, hashtags y estado
- Para aprobar: boton `Aprobar`
- Para rechazar: boton `Rechazar`
- Los drafts con `Risk: medium/high` requieren atencion adicional

### 4. Verificar Activos
- Confirmar que los assets vinculados a cada draft existen
- Assets sin preview indican archivo faltante

### 5. Ejecutar Dry-Run
- Ir a `Publicacion` (Readiness Gate)
- Verificar que todos los gates de seguridad pasen
- Marcar el checkbox de aprobacion manual
- Presionar `Ejecutar dry-run`
- El sistema marca el draft como `SCHEDULED` con un `externalPostId` de prueba
- **No se publica en RRSS reales** — hard stop activo

## Variables de Entorno

| Variable | Valor | Proposito |
|---|---|---|
| `LLM_PROVIDER` | `deterministic` (default), `openai`, `anthropic`, `gemini`, `deepseek` | Proveedor de generacion de estrategia |
| `LLM_PROVIDER_API_KEY` | (token) | API key del proveedor |
| `LLM_MODEL` | (modelo) | Modelo especifico (defaults: gpt-4o-mini / claude-3-5-haiku / gemini-2.0-flash / deepseek-chat) |

## Configuracion de Proveedores LLM

| Proveedor | API endpoint | Modelo default | `LLM_PROVIDER_API_KEY` |
|---|---|---|---|
| `openai` | `api.openai.com/v1/chat/completions` | `gpt-4o-mini` | API key de OpenAI |
| `anthropic` | `api.anthropic.com/v1/messages` | `claude-3-5-haiku-latest` | API key de Anthropic |
| `gemini` | `generativelanguage.googleapis.com/v1beta/models/...` | `gemini-2.0-flash` | API key de Google AI |
| `deepseek` | `api.deepseek.com/chat/completions` | `deepseek-chat` | API key de DeepSeek |
| `deterministic` | (local, sin API) | `deterministic/v1` | No requiere |
| `BOT_DRY_RUN` | `true` | Bloquea publicacion real |
| `BOT_ALLOW_REAL_PUBLISH` | `false` | Hard stop de publicacion |

## Hard Stops

- No publicar en RRSS reales sin levantamiento explicito del hard stop
- No gastar presupuesto de campanas sin aprobacion
- No committear credenciales reales en git
- No modificar schemas de auth/DB sin double lock
