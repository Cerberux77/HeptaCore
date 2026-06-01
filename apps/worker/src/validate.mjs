import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config, loadQueue } from "./config.mjs";

function checkAsset(entry) {
  const assetPath = entry.selectedAssetPath || "";
  const fullPath = resolve(config.root, assetPath);
  const tenantRelativePath = assetPath.startsWith("content/")
    ? resolve(config.root, "examples", "tenants", config.tenantSlug, assetPath)
    : "";
  const fallbackPath = resolve(config.paths.inbox, entry.selectedAsset || "");

  if (existsSync(fullPath)) return { ok: true, path: fullPath };
  if (tenantRelativePath && existsSync(tenantRelativePath)) return { ok: true, path: tenantRelativePath };
  if (existsSync(fallbackPath)) return { ok: true, path: fallbackPath, fallback: true };
  return { ok: false, path: fullPath };
}

export function validateQueue() {
  const queue = loadQueue();
  const results = [];
  let valid = 0;
  let missingAssets = 0;
  let missingDates = 0;

  console.log(`\n=== Validacion de Cola de Publicaciones ===`);
  console.log(`Total entries: ${queue.length}\n`);

  for (const entry of queue) {
    const issues = [];

    if (!entry.scheduledFor) {
      issues.push("Sin fecha programada");
      missingDates++;
    }

    const asset = checkAsset(entry);
    if (!asset.ok) {
      issues.push(`Asset no encontrado: ${entry.selectedAsset} (buscado en ${asset.path})`);
      missingAssets++;
    }

    if (issues.length > 0) {
      results.push({ id: entry.id, title: entry.title, channel: entry.channel, format: entry.format, scheduledFor: entry.scheduledFor, issues });
      console.log(`❌ ${entry.id} — ${entry.title}`);
      issues.forEach((i) => console.log(`   ${i}`));
    } else {
      valid++;
    }
  }

  console.log(`\n=== Resumen de Validacion ===`);
  console.log(`Validos: ${valid}/${queue.length}`);
  console.log(`Assets faltantes: ${missingAssets}`);
  console.log(`Fechas faltantes: ${missingDates}`);

  if (results.length === 0) {
    console.log(`\n✅ Todos los drafts validos.`);
  }

  return { valid: results.length === 0, total: queue.length, validCount: valid, issues: results };
}

export function validateAssets() {
  const inboxPath = config.paths.inbox;
  const expected = {
    brand: ["avatar.png", "hl-estudio.png", "hl-salas.png", "hl-marketplace.png", "hl-comunidad.png", "hl-faq.png"],
    facebook: ["cover.jpg", "estudio-01.jpg", "estudio-02.jpg", "estudio-03.jpg", "estudio-noche.jpg", "estudio-wide.jpg", "persona-consola.jpg", "persona-sesion.jpg", "persona-banda.jpg", "equipo-consola.jpg", "equipo-microfono.jpg", "equipo-guitarra.jpg", "bienvenidos-fb.jpg"],
    instagram: ["grid-estudio.jpg", "grid-sala.jpg", "grid-consola.jpg", "grid-equipo.jpg", "grid-espacio.jpg", "grid-ambiente.jpg", "grid-comunidad.jpg", "grid-produccion.jpg", "grid-logo.jpg", "carrusel-guitarra.jpg", "carrusel-microfonos.jpg", "carrusel-monitores.jpg"],
    reels: ["tour-estudio.mp4", "closeup-consola.mp4", "reel-tour.mp4", "reel-antes-despues.mp4", "reel-timelapse.mp4"],
    stories: ["story-noche.jpg", "story-detalle.jpg", "story-sala.jpg", "story-logo.jpg", "story-fachada.jpg"],
    marketplace: ["mp-equipo-01.jpg", "como-vender.jpg", "operacion-protegida.png", "mp-equipo-02.jpg", "mp-equipo-03.jpg"]
  };

  console.log(`\n=== Validacion de Assets ===`);

  let total = 0;
  let present = 0;
  const missing = [];

  for (const [category, files] of Object.entries(expected)) {
    const catPath = resolve(inboxPath, category);
    for (const file of files) {
      total++;
      const full = resolve(catPath, file);
      if (existsSync(full)) {
        present++;
      } else {
        missing.push(`${category}/${file}`);
        console.log(`❌ Faltante: ${category}/${file}`);
      }
    }
  }

  console.log(`\nPresentes: ${present}/${total}`);
  if (missing.length > 0) {
    console.log(`Faltantes: ${missing.length}`);
    missing.forEach((m) => console.log(`   - ${m}`));
  } else {
    console.log(`✅ Todos los assets presentes.`);
  }

  return { present, total, missing };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAssets();
  console.log("");
  const result = validateQueue();
  process.exit(result.valid ? 0 : 1);
}
