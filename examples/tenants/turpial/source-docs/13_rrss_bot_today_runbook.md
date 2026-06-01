# Turpial Sound — RRSS Bot Runbook

**Versión:** v1.0 — MVP Sprint  
**Fecha:** 2026-05-30  
**Para:** Manuel  

---

## 1. Cómo agregar assets

1. Coloca tus archivos (fotos, videos) en las carpetas correspondientes dentro de `data/rrss/inbox/`:
   - `facebook/` — Portada FB, fotos del estudio, personas, instrumentos
   - `instagram/` — Grid IG, carruseles educativos
   - `reels/` — Videos verticales 9:16
   - `stories/` — Fondos y fotos para historias
   - `marketplace/` — Fotos de equipos, gráfico operación protegida
   - `brand/` — Logo avatar, highlights icons

2. Ejecuta el indexador:
   ```
   node scripts/rrss/rrss-cli.mjs index-assets
   ```

3. Reconstruye la cola para ver los nuevos assets asignados:
   ```
   node scripts/rrss/rrss-cli.mjs build-queue
   ```

---

## 2. Cómo generar la cola

```
node scripts/rrss/rrss-cli.mjs build-queue
```

Esto genera `data/rrss/queue/publication-queue.json` con todas las publicaciones.

---

## 3. Cómo abrir el tablero

```
node scripts/rrss/rrss-cli.mjs desk
```

Abre en el navegador: **http://localhost:4877**

El tablero muestra:
- Stats de publicaciones por estado, canal, formato
- Panel de Live Readiness (qué credenciales faltan)
- Panel de Material Faltante
- Cards de cada publicación con caption, hashtags, CTA, asset
- Botones Save, Approve, Reject, Publish Live

---

## 4. Cómo aprobar una publicación

1. Abre el tablero en `http://localhost:4877`
2. Revisa la card de la publicación que quieras aprobar
3. Edita caption, hashtags y CTA si es necesario
4. Haz clic en **Save** para guardar cambios
5. Haz clic en **Approve** para aprobar
6. La publicación pasa a estado `approved`

**Importante:** Publicaciones de riesgo alto no se pueden auto-aprobar desde el dashboard. Requieren revisión manual directa en el JSON.

---

## 5. Cómo hacer dry-run

```
node scripts/rrss/rrss-cli.mjs dry-run
```

Esto simula la publicación de todos los items aprobados. No publica nada real. Muestra qué se publicaría y qué está bloqueado.

---

## 6. Cómo preparar live mode

1. Ejecuta el wizard de credenciales:
   ```
   node scripts/rrss/rrss-cli.mjs secure-setup
   ```

2. Ingresa tus credenciales de Meta (NO las compartas por chat):
   - META_APP_ID
   - META_APP_SECRET
   - META_ACCESS_TOKEN
   - META_PAGE_ID
   - META_IG_USER_ID

3. Verifica el estado:
   ```
   node scripts/rrss/rrss-cli.mjs credentials-doctor
   ```

4. Cambia el modo en `.env.rrss.local`:
   ```
   RRSS_MODE=live
   ```

5. Vuelve a verificar con `credentials-doctor`. Si todo OK, ya puedes publicar.

---

## 7. Qué falta para publicar en Facebook

1. META_PAGE_ID configurado
2. META_ACCESS_TOKEN válido
3. META_APP_ID y META_APP_SECRET configurados
4. RRSS_MODE=live
5. Al menos 1 item en estado `approved`
6. El item no debe tener safety flags de riesgo alto

---

## 8. Qué falta para publicar en Instagram

Todo lo de Facebook, más:
1. META_IG_USER_ID configurado
2. RRSS_PUBLIC_ASSET_BASE_URL configurado (Instagram requiere URL pública para imágenes)
3. Los assets deben estar accesibles públicamente (no archivos locales)

---

## 9. Cómo añadir publicUrl a assets

Si tienes un servidor donde hostear los assets (Vercel Blob, Cloudinary, S3, etc.):

1. Configura la URL base en `.env.rrss.local`:
   ```
   RRSS_PUBLIC_ASSET_BASE_URL=https://assets.turpialsound.com
   ```

2. Sube los assets a ese servidor.

3. Edita `data/rrss/reports/asset-index.json` manualmente o usa el dashboard para asignar `publicUrl` a cada asset.

---

## 10. Cómo detener el bot

En la terminal del dashboard: **Ctrl+C**

---

## 11. Qué NO automatizar

- DM automáticos (requiere webhooks y autorización futura)
- Respuestas a reclamos o disputas (SIEMPRE derivar a humano)
- Publicaciones sin revisión humana previa
- Posts que mencionen precios, pagos, comisiones sin revisión
- Cualquier cosa que requiera RRSS_MODE=live sin credenciales verificadas

---

## 12. Comandos rápidos

| Comando | Descripción |
|---------|-------------|
| `node scripts/rrss/rrss-cli.mjs material-request` | Ver assets requeridos |
| `node scripts/rrss/rrss-cli.mjs index-assets` | Indexar assets |
| `node scripts/rrss/rrss-cli.mjs build-queue` | Generar cola |
| `node scripts/rrss/rrss-cli.mjs validate` | Validar cola |
| `node scripts/rrss/rrss-cli.mjs generate-drafts` | Generar drafts MD |
| `node scripts/rrss/rrss-cli.mjs dry-run` | Simular publicación |
| `node scripts/rrss/rrss-cli.mjs desk` | Abrir tablero |
| `node scripts/rrss/rrss-cli.mjs secure-setup` | Configurar credenciales |
| `node scripts/rrss/rrss-cli.mjs credentials-doctor` | Revisar credenciales |
| `node scripts/rrss/rrss-cli.mjs help` | Ayuda |
