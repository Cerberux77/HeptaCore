import { loadQueue } from "./config.mjs";
import { fileURLToPath } from "node:url";

function groupBy(list, key) {
  return list.reduce((acc, item) => {
    const k = item[key] || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

export function generateReport() {
  const queue = loadQueue();

  const byChannel = groupBy(queue, "channel");
  const byFormat = groupBy(queue, "format");
  const byPilar = groupBy(queue, "pilar");
  const byRisk = groupBy(queue, "riskLevel");
  const byStatus = groupBy(queue, "status");

  const needsHumanReview = queue.filter((e) => e.requiresHumanReview);
  const withDates = queue.filter((e) => e.scheduledFor);
  const withoutDates = queue.filter((e) => !e.scheduledFor);

  const dates = [...new Set(queue.map((e) => e.scheduledFor).filter(Boolean))].sort();
  const dateRange = dates.length > 0
    ? `${dates[0]} — ${dates[dates.length - 1]}`
    : "Sin fechas";

  const report = {
    generatedAt: new Date().toISOString(),
    totalDrafts: queue.length,
    dateRange,
    daysActive: dates.length,
    byChannel,
    byFormat,
    byPilar,
    byRisk,
    byStatus,
    needsHumanReview: needsHumanReview.length,
    withDates: withDates.length,
    withoutDates: withoutDates.length,
    humanReviewList: needsHumanReview.map((e) => ({ id: e.id, title: e.title, reason: `riskLevel: ${e.riskLevel}` })),
    dates,
    drafts: queue.map((e) => ({
      id: e.id,
      date: e.scheduledFor,
      channel: e.channel,
      format: e.format,
      asset: e.selectedAsset,
      pilar: e.pilar,
      status: e.status,
      risk: e.riskLevel,
      review: e.requiresHumanReview,
    })),
  };

  return report;
}

export function printReport() {
  const r = generateReport();

  console.log(`\n========================================`);
  console.log(`  TURPIAL SOUND — RRSS BOT REPORT`);
  console.log(`========================================`);
  console.log(`Generado: ${r.generatedAt}`);
  console.log(`Total drafts: ${r.totalDrafts}`);
  console.log(`Rango de fechas: ${r.dateRange}`);
  console.log(`Dias activos: ${r.daysActive}`);
  console.log(`\n--- Por Canal ---`);
  Object.entries(r.byChannel).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`\n--- Por Formato ---`);
  Object.entries(r.byFormat).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`\n--- Por Pilar ---`);
  Object.entries(r.byPilar).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`\n--- Por Estado ---`);
  Object.entries(r.byStatus).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`\n--- Requieren Revision Humana: ${r.needsHumanReview} ---`);
  r.humanReviewList.forEach((h) => console.log(`  ⚠️  ${h.id}: ${h.title}`));
  console.log(`\n--- Calendario ---`);
  console.log(`  ${r.dates.join("  |  ")}`);
  console.log(`========================================\n`);

  return r;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  printReport();
}
