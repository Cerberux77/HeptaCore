import { publishQueue } from "./publisher.mjs";
import { config } from "./config.mjs";

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return "sin fecha";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export async function runScheduled(dateStr) {
  const target = dateStr || todayStr();
  console.log(`\n=== RRSS Bot — Ejecucion programada: ${formatDate(target)} ===`);
  console.log(`Modo: ${config.mode} | Dry Run: ${config.dryRun}`);
  console.log(`Hora: ${new Date().toISOString()}\n`);

  const warnings = config.validate();
  if (warnings.length > 0) {
    console.log("⚠️  Advertencias de configuracion:");
    warnings.forEach((w) => console.log(`   - ${w}`));
    console.log("");
  }

  const result = await publishQueue(target);

  console.log(`\n=== Resultado ===`);
  console.log(`Fecha: ${formatDate(target)}`);
  console.log(`Procesados: ${result.total}`);
  console.log(`Publicados: ${result.published}`);
  console.log(`Fallidos: ${result.failed}`);

  if (result.published > 0) {
    console.log(`\n✅ ${result.published} publicaciones procesadas para ${formatDate(target)}.`);
    if (config.dryRun) {
      console.log("💡 Dry run activo. Nada fue enviado a Facebook/Instagram.");
      console.log("   Para publicar en vivo: configura BOT_DRY_RUN=false y completa las credenciales en .env.rrss");
    }
  } else {
    console.log(`\n📭 No hay publicaciones programadas para ${formatDate(target)}.`);
  }

  return result;
}

export async function runDateRange(from, to) {
  const results = [];
  let current = new Date(from);
  const end = new Date(to);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    results.push(await runScheduled(dateStr));
    current.setDate(current.getDate() + 1);
  }

  return results;
}

export async function runFullQueue() {
  const queue = (await import("./config.mjs")).loadQueue();
  const dates = [...new Set(queue.map((e) => e.scheduledFor).filter(Boolean))].sort();

  console.log(`\n=== RRSS Bot — Ejecucion completa de cola ===`);
  console.log(`Dias a procesar: ${dates.length}`);
  console.log(`Rango: ${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}`);
  console.log(`Modo: ${config.mode} | Dry Run: ${config.dryRun}\n`);

  const allResults = [];
  for (const date of dates) {
    allResults.push(await runScheduled(date));
  }

  const totalPub = allResults.reduce((s, r) => s + r.published, 0);
  const totalFail = allResults.reduce((s, r) => s + r.failed, 0);

  console.log(`\n=== Resumen Final ===`);
  console.log(`Total publicados: ${totalPub}`);
  console.log(`Total fallidos: ${totalFail}`);
  console.log(`Dias procesados: ${allResults.length}`);

  return allResults;
}
